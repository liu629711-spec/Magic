/**
 * 直接用 CLI 起一次 sdk profile runtime（不经过 SDK client），
 * stdin 立即 EOF，观察 stderr 的完整失败输出。
 */
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const DSH_ROOT = resolve(process.cwd(), 'reference-project/deepseek-harness')
const MAGIC_PATCH = resolve(process.cwd(), 'patches/web.patch.yml')

const child = spawn(process.execPath, [
  resolve(DSH_ROOT, 'apps/cli/lib/bin.js'),
  '--profile', 'sdk',
  '--patch', MAGIC_PATCH,
], {
  stdio: ['pipe', 'pipe', 'pipe'],
})
let stderr = ''
child.stdout.on('data', (d) => process.stdout.write('[stdout] ' + d))
child.stderr.on('data', (d) => { stderr += d })
child.on('exit', (code) => {
  console.log('EXIT', code)
  console.log('--- stderr ---')
  console.log(stderr.slice(-3000))
  process.exit(0)
})
// 给 runtime 3 秒起，然后关 stdin（EOF → 干净退出）或 15 秒后强杀
setTimeout(() => { try { child.stdin.end() } catch {} }, 3000)
setTimeout(() => { try { child.kill() } catch {} ; setTimeout(() => process.exit(0), 500) }, 15000)
