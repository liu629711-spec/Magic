// 自检（selftest）—— 证明这道护栏"有用"：上游把契约字段改名 / 注入不存在的服务时，
// 体检必须失败；而正确契约必须不被误判。这是升级体检存在的唯一证据。
//
// 零依赖、纯 Node。运行：
//   node selftest.mjs
// 退出码非 0 表示自检本身失败（护栏没起到作用）。

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contractSmoke } from './check.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const here = __dirname
const realPlugins = resolve(here, '..', '..', 'plugins')
const realDsh = resolve(here, '..', '..', 'reference-project', 'deepseek-harness')

const cases = []
function record(name, pass, detail) {
  cases.push({ name, pass, detail })
  const tag = pass ? '✓ PASS ' : '✗ FAIL '
  console.log(`${tag}${name}${detail ? ' — ' + detail : ''}`)
}

// 用例 1（负向）：对一份故意改坏的输入跑体检，必须 FAIL。
{
  const r = contractSmoke({
    pluginsRoot: resolve(here, 'fixtures', 'broken', 'plugins'),
    dshRoot: realDsh,
  })
  const hasBadInject = r.findings.some(
    (f) => f.severity === 'FAIL' && f.message.includes('notARealService'),
  )
  const hasBadMember = r.findings.some(
    (f) => f.severity === 'FAIL' && f.message.includes('ctx.storageDoman'),
  )
  record(
    '负向：坏输入必须 FAIL',
    r.failed && hasBadInject && hasBadMember,
    `failCount=${r.failCount}，注入缺失服务=${hasBadInject}，ctx 笔误=${hasBadMember}`,
  )
}

// 用例 2（正向）：对一份合法输入跑体检，必须不 FAIL（验证无假阳性）。
{
  const r = contractSmoke({
    pluginsRoot: resolve(here, 'fixtures', 'good', 'plugins'),
    dshRoot: realDsh,
  })
  record('正向：合法输入必须 PASS', !r.failed, `failCount=${r.failCount}`)
}

// 用例 3（真实守护）：对当前真实插件集跑体检，必须不 FAIL。
// 若这里 FAIL，说明体检把正确契约误判了，护栏可信度归零。
{
  const r = contractSmoke({ pluginsRoot: realPlugins, dshRoot: realDsh })
  record(
    '真实仓库：当前插件集必须 PASS（无假阳性）',
    !r.failed,
    `pass=${r.passCount} warn=${r.warnCount} fail=${r.failCount}`,
  )
}

const allPass = cases.every((c) => c.pass)
console.log('')
console.log(allPass ? '自检通过：护栏有效（改坏必失败，正确不误报）。' : '自检失败：护栏无效，需修复 check.mjs。')
process.exit(allPass ? 0 : 1)
