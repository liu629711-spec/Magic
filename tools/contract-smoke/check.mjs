// 升级体检（contract-smoke）—— Magic 插件对 DSH 契约的静态冒烟检查。
//
// 为什么存在：Magic 插件不 import 任何 @deepseek-ai/dsh-* 包，而是用手写结构化类型
// 声明自己需要的 ctx 能力，靠 Cordis 依赖注入拿宿主服务。后果是：DSH 上游改了字段名 /
// 服务名，Magic 编译不报错、测试不失败，只在运行时炸。本程序把这种"静默失效"变成
// 升级时立刻报错。
//
// 设计要点（静态、零依赖、不安装 DSH）：
//   * 从 DSH 源码抽取"契约真相"：既是 `declare module '@deepseek-ai/cordis' { interface
//     Context { ... } }` 里声明的字段名，也是 `xxx.provide('yyy', ...)` 的注册名。
//   * 从 Magic 插件源码抽取插件间互相 provide 的服务名（例如 magicWorkMode 由
//     magic-work-mode 提供、被 magic-ceo 注入），避免把"插件间契约"误判为缺失。
//   * 核心 Cordis API（effect / on / provide / 等）永远可用，不计入"可被上游改名"的服务。
//
// 不 import 任何 @deepseek-ai/* 包；不修改 reference-project 下任何文件。

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 核心 Cordis 上下文方法：永远存在，不属于"可被 DSH 改名的服务"。改名它们属于 Cordis
// 破坏性大版本，不在本体检的守护范围（且会让整个生态一起炸，不是 Magic 单独的问题）。
const CORE_CORDIS_API = new Set([
  'effect', 'on', 'off', 'emit', 'provide', 'inject', 'extend',
  'get', 'root', 'scope', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'bail', 'parallel', 'serial', 'all', 'collect',
])

// 递归列举目录下的所有文件。
function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      // node_modules 与隐藏目录（.git 等）不参与契约体检；lib 下的 .d.ts 含 declare
      // module 声明，必须纳入。
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      yield* walk(p)
    } else if (e.isFile()) {
      yield p
    }
  }
}

// 在 DSH 源码里抽取 `declare module '@deepseek-ai/cordis' { interface Context { ... } }`
// 的顶层字段名。用括号配对定位 interface 主体，再按首行缩进只取顶层字段，避免把嵌套
// 对象里的 key（如 tools: { register } 里的 register）误当作服务名。
function extractDeclaredContextFields(content) {
  const result = new Set()
  const moduleRe = /declare\s+module\s+['"]@deepseek-ai\/cordis['"]\s*\{/g
  let m
  while ((m = moduleRe.exec(content))) {
    const block = sliceToMatchingBrace(content, m.index + m[0].length)
    const im = /interface\s+Context\s*\{/.exec(block)
    if (!im) continue
    const body = sliceToMatchingBrace(block, im.index + im[0].length)
    const lines = body.split('\n')
    let baseIndent = null
    for (const line of lines) {
      const mm = /^( +)\S/.exec(line)
      if (mm) { baseIndent = mm[1].length; break }
    }
    if (baseIndent === null) continue
    for (const line of lines) {
      const fm = new RegExp('^ {' + baseIndent + '}(\\w+)(\\??):').exec(line)
      if (fm) result.add(fm[1])
    }
  }
  return result
}

// 从 pos 开始（已经跳过了开括号），找到配对的闭括号，返回括号之间的内容。
function sliceToMatchingBrace(content, openPos) {
  let depth = 1
  let i = openPos
  while (i < content.length && depth > 0) {
    const ch = content[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    i++
  }
  return content.slice(openPos, i - 1)
}

// 抽取 `xxx.provide('name', ...)` / `xxx.provide?.('name', ...)` 的注册名。
// 注意可选链 `?.` 在 `?` 和 `(` 之间还有个点号，所以正则要允许这个 `.`。
function extractProvided(content) {
  const set = new Set()
  const re = /\.provide\??\.?\s*\(\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(content))) set.add(m[1])
  return set
}

// 抽取 `export const inject = [...]` 里的服务名数组（支持横跨多行）。
function extractInject(content) {
  const re = /export\s+const\s+inject\s*=\s*\[([\s\S]*?)\]/
  const m = re.exec(content)
  if (!m) return []
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s.length > 0 && !/^\/\//.test(s))
}

// 抽取 `export const name = '...'` 的插件名。
function extractName(content) {
  const m = /export\s+const\s+name\s*=\s*['"]([^'"]+)['"]/.exec(content)
  return m ? m[1] : null
}

// 抽取源码里所有 `ctx.<member>` 的用法（排除 tests 目录与 .spec.ts）。
function extractCtxMembers(srcDir) {
  const usage = []
  for (const f of walk(srcDir)) {
    if (!f.endsWith('.ts')) continue
    if (/\/tests?\//.test(f) || f.endsWith('.spec.ts')) continue
    const lines = readFileSync(f, 'utf8').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const re = /[^\w.]ctx\.([A-Za-z_$][\w$]*)/g
      let mm
      while ((mm = re.exec(lines[i]))) {
        usage.push({ member: mm[1], file: f, line: i + 1 })
      }
    }
  }
  return usage
}

// 极简解析 cordis.patch.yml 里的 insert name 列表。只处理本仓实际结构：
//   - insert:
//     - id: ...
//       name: '@magic/dsh-xxx'
// 不依赖任何 YAML 库，按缩进判断 insert 块的边界。
function parsePatchInsertNames(text) {
  const names = []
  const lines = text.split('\n')
  let inInsert = false
  let insertIndent = -1
  for (const raw of lines) {
    const indent = (raw.match(/^(\s*)/) || ['', ''])[1].length
    const trimmed = raw.trim()
    if (/^-\s*insert:\s*$/.test(trimmed)) {
      inInsert = true
      insertIndent = indent
      continue
    }
    if (inInsert) {
      const leftBlock = indent <= insertIndent && trimmed.length > 0 && !/^name:/.test(trimmed)
      if (leftBlock) {
        inInsert = false
      } else {
        const nm = /^name:\s*['"]?([^'"#\n]+?)['"]?\s*$/.exec(trimmed)
        if (nm) names.push(nm[1].trim())
      }
    }
  }
  return names
}

// 从 DSH 源码目录构建"服务真相"集合。scanSrc 决定是否扫描 src（已编译的 lib 不含
// provide 调用，只需在 lib 里找 declare module 即可；src 两者都有）。
function buildDshSurface(dshRoot) {
  const declared = new Set()
  const provided = new Set()
  let found = false
  if (!existsSync(dshRoot)) {
    return { declared, provided, found }
  }
  found = true
  const pkgRoot = join(dshRoot, 'packages')
  const roots = existsSync(pkgRoot) ? [pkgRoot] : [dshRoot]
  for (const root of roots) {
    for (const f of walk(root)) {
      if (!f.endsWith('.ts') && !f.endsWith('.d.ts')) continue
      // 测试里的 provide 是测试替身，不代表真实契约，跳过以免误放。
      if (/\/tests?\//.test(f) || f.endsWith('.spec.ts')) continue
      const content = readFileSync(f, 'utf8')
      for (const name of extractDeclaredContextFields(content)) declared.add(name)
      for (const name of extractProvided(content)) provided.add(name)
    }
  }
  return { declared, provided, found }
}

// 从 Magic 插件目录抽取插件间互相 provide 的服务名（如 magicWorkMode）。
function buildMagicProvided(pluginsRoot) {
  const provided = new Set()
  if (!existsSync(pluginsRoot)) return provided
  for (const pd of listPluginDirs(pluginsRoot)) {
    const srcDir = join(pd, 'src')
    if (!existsSync(srcDir)) continue
    for (const f of walk(srcDir)) {
      if (!f.endsWith('.ts')) continue
      if (/\/tests?\//.test(f) || f.endsWith('.spec.ts')) continue
      for (const name of extractProvided(readFileSync(f, 'utf8'))) provided.add(name)
    }
  }
  return provided
}

// 列出 plugins 下的所有子目录作为插件候选（优雅处理"插件目录正在出现"的情况）。
function listPluginDirs(pluginsRoot) {
  const dirs = []
  if (!existsSync(pluginsRoot)) return dirs
  let entries
  try {
    entries = readdirSync(pluginsRoot, { withFileTypes: true })
  } catch {
    return dirs
  }
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('.')) dirs.push(join(pluginsRoot, e.name))
  }
  return dirs
}

// 给每个服务名标注来源，便于报告里说明它"由谁提供"。
function buildSources(dsh, magicProvided) {
  const sources = new Map()
  for (const n of dsh.declared) sources.set(n, 'dsh-declared')
  for (const n of dsh.provided) if (!sources.has(n)) sources.set(n, 'dsh-provided')
  for (const n of magicProvided) if (!sources.has(n)) sources.set(n, 'magic-plugin')
  return sources
}

// 单个插件体检：检查 1（元数据）、检查 2（inject）、检查 3（ctx 成员使用面）。
function analyzePlugin(pluginDir, ctx) {
  const { available, sources, findings } = ctx
  const pluginName = pluginDir.split(/[\\/]/).pop()
  const pkgPath = join(pluginDir, 'package.json')
  const patchPath = join(pluginDir, 'cordis.patch.yml')

  // ---- 检查 1：元数据完整性 ----
  if (!existsSync(pkgPath)) {
    findings.push({
      severity: 'WARN', category: 'meta', plugin: pluginName,
      message: '插件目录存在但缺少 package.json，跳过内容检查（可能正在被其他子代理创建）',
    })
    return
  }

  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch (e) {
    findings.push({
      severity: 'FAIL', category: 'meta', plugin: pluginName,
      message: `package.json 解析失败: ${e.message}`,
    })
    return
  }

  const metaIssues = []
  if (!pkg.name) metaIssues.push('缺少 name')
  if (!pkg.main) metaIssues.push('缺少 main')
  if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) metaIssues.push('缺少 dsh.bundle.patch')
  if (metaIssues.length) {
    findings.push({
      severity: 'FAIL', category: 'meta', plugin: pluginName,
      message: `package.json 元数据不完整: ${metaIssues.join('; ')}`,
    })
  }

  if (!existsSync(patchPath)) {
    findings.push({
      severity: 'FAIL', category: 'meta', plugin: pluginName,
      message: '缺少 cordis.patch.yml（DSH 加载入口）',
    })
  } else {
    const insertNames = parsePatchInsertNames(readFileSync(patchPath, 'utf8'))
    const expected = pkg.name
    if (expected && insertNames.length && !insertNames.includes(expected)) {
      findings.push({
        severity: 'FAIL', category: 'meta', plugin: pluginName,
        message: `cordis.patch.yml 的 insert name [${insertNames.join(', ')}] 与包名 "${expected}" 不一致`,
      })
    }
  }

  if (pkg.dsh?.bundle?.patch) {
    const rel = pkg.dsh.bundle.patch
    if (!existsSync(join(pluginDir, rel))) {
      findings.push({
        severity: 'FAIL', category: 'meta', plugin: pluginName,
        message: `dsh.bundle.patch 指向的文件不存在: ${rel}`,
      })
    }
  }

  // ---- 检查 2 & 3 需要 main 文件 ----
  const mainRel = pkg.main || 'src/index.ts'
  const mainPath = join(pluginDir, mainRel)
  if (!existsSync(mainPath)) {
    findings.push({
      severity: 'WARN', category: 'meta', plugin: pluginName,
      message: `main 文件不存在: ${mainRel}（跳过 inject / ctx 检查）`,
    })
    return
  }

  const mainSrc = readFileSync(mainPath, 'utf8')

  // ---- 检查 2：inject 服务名可用性 ----
  const inject = extractInject(mainSrc)
  if (inject.length === 0 && extractName(mainSrc) !== null) {
    findings.push({
      severity: 'PASS', category: 'inject', plugin: pluginName,
      message: '未声明 inject（不依赖任何宿主服务，或仅用核心 Cordis API）',
    })
  }
  for (const svc of inject) {
    if (available.has(svc)) {
      findings.push({
        severity: 'PASS', category: 'inject', plugin: pluginName,
        message: `inject "${svc}" 在宿主可用 (来源: ${sources.get(svc) || '?'})`,
        file: mainRel,
      })
    } else {
      findings.push({
        severity: 'FAIL', category: 'inject', plugin: pluginName,
        message: `inject "${svc}" 在 DSH 与其他 Magic 插件中均未找到 —— 上游改名或遗漏注册会让插件静默不激活`,
        file: mainRel,
      })
    }
  }

  // ---- 检查 3：ctx 成员使用面 ----
  const srcDir = join(pluginDir, 'src')
  const usage = existsSync(srcDir) ? extractCtxMembers(srcDir) : []
  // 去重到 member 维度，保留首个出现位置作为样例。
  const seen = new Map()
  for (const u of usage) {
    if (!seen.has(u.member)) seen.set(u.member, u)
  }
  if (seen.size === 0) {
    findings.push({
      severity: 'PASS', category: 'ctx', plugin: pluginName,
      message: 'src 下未发现 ctx.<member> 用法',
    })
  }
  for (const [member, sample] of seen) {
    const source = sources.get(member)
    if (available.has(member) || CORE_CORDIS_API.has(member)) {
      findings.push({
        severity: 'PASS', category: 'ctx', plugin: pluginName,
        message: `ctx.${member} 在宿主可用 (来源: ${source || 'core-cordis'})`,
        file: relativeOf(sample.file),
        line: sample.line,
      })
    } else {
      findings.push({
        severity: 'FAIL', category: 'ctx', plugin: pluginName,
        message: `ctx.${member} 在 DSH 与其他 Magic 插件中均未声明 —— 上游改名会让运行时炸`,
        file: relativeOf(sample.file),
        line: sample.line,
      })
    }
  }
}

function relativeOf(absPath) {
  try {
    return absPath
  } catch {
    return absPath
  }
}

// 主入口：组装所有信息并产出结果对象。fn 之外不碰任何文件。
export function contractSmoke(opts) {
  const pluginsRoot = resolve(opts.pluginsRoot)
  const dshRoot = resolve(opts.dshRoot)
  const findings = []

  const dsh = buildDshSurface(dshRoot)
  if (!dsh.found) {
    findings.push({
      severity: 'FAIL', category: 'dsh', plugin: null,
      message: `未找到 DSH 源码目录: ${dshRoot}（无法校验 inject / ctx 契约，体检不可信）`,
    })
  }

  const magicProvided = buildMagicProvided(pluginsRoot)
  const available = new Set([...dsh.declared, ...dsh.provided, ...magicProvided])
  const sources = buildSources(dsh, magicProvided)

  const pluginDirs = listPluginDirs(pluginsRoot)
  if (pluginDirs.length === 0) {
    findings.push({
      severity: 'WARN', category: 'meta', plugin: null,
      message: `在 ${pluginsRoot} 下未发现任何插件目录`,
    })
  }

  for (const pd of pluginDirs) {
    analyzePlugin(pd, { available, sources, findings })
  }

  const failCount = findings.filter((f) => f.severity === 'FAIL').length
  const warnCount = findings.filter((f) => f.severity === 'WARN').length
  const passCount = findings.filter((f) => f.severity === 'PASS').length

  return {
    dshFound: dsh.found,
    dshDeclaredCount: dsh.declared.size,
    dshProvidedCount: dsh.provided.size,
    magicProvidedCount: magicProvided.size,
    pluginCount: pluginDirs.length,
    findings,
    failCount,
    warnCount,
    passCount,
    failed: failCount > 0,
  }
}

// 把结果渲染成可读文本报告。
export function formatReport(result, { pluginsRoot, dshRoot } = {}) {
  const lines = []
  lines.push('=== Magic 升级体检（contract-smoke）===')
  lines.push(`DSH 源码目录 : ${dshRoot}`)
  lines.push(`插件目录     : ${pluginsRoot}`)
  lines.push(`DSH 声明字段  : ${result.dshDeclaredCount}   DSH provide 注册: ${result.dshProvidedCount}   插件间 provide: ${result.magicProvidedCount}`)
  lines.push(`插件数量     : ${result.pluginCount}`)
  lines.push('')
  const order = { FAIL: 0, WARN: 1, PASS: 2 }
  const sorted = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity])
  for (const f of sorted) {
    const tag = f.severity === 'FAIL' ? '✗ FAIL ' : f.severity === 'WARN' ? '! WARN ' : '✓ PASS '
    const where = f.plugin ? `[${f.plugin}] ` : ''
    let loc = ''
    if (f.file) loc = ` (${f.file}${f.line ? ':' + f.line : ''})`
    lines.push(`${tag}${where}${f.message}${loc}`)
  }
  lines.push('')
  lines.push(`汇总: PASS=${result.passCount}  WARN=${result.warnCount}  FAIL=${result.failCount}`)
  lines.push(result.failed ? '结论: 体检未通过 —— 升级前必须修复上面的 FAIL。' : '结论: 体检通过。')
  return lines.join('\n')
}

// CLI 入口。
function main() {
  let pluginsRoot = resolve(__dirname, '..', '..', 'plugins')
  let dshRoot = resolve(__dirname, '..', '..', 'reference-project', 'deepseek-harness')
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plugins') pluginsRoot = resolve(args[++i])
    else if (args[i] === '--dsh') dshRoot = resolve(args[++i])
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('用法: node check.mjs [--plugins <dir>] [--dsh <dir>]')
      process.exit(0)
    }
  }
  const result = contractSmoke({ pluginsRoot, dshRoot })
  console.log(formatReport(result, { pluginsRoot, dshRoot }))
  process.exit(result.failed ? 1 : 0)
}

// 仅当作为脚本直接运行时执行 main。被 selftest 以模块方式 import 时不自动跑。
// Windows 下 process.argv[1] 是反斜杠路径，需用 pathToFileURL 归一化后再比。
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main()
}
