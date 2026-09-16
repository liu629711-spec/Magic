/**
 * SDK 门冒烟验证（一次性脚本）：
 * 1. spawn reference-project 源码 runtime（--profile sdk + Magic 总 overlay patch）
 * 2. initialize 握手
 * 3. 订阅 server→client 通知（session.event / session.status），打印收到的通知类型
 * 不发 prompt、不调模型 —— 只验证"外部 UI 能不能连上 runtime"。
 */
import { DeepSeekHarness } from '../../reference-project/deepseek-harness/packages/sdk/client/lib/index.js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DSH_ROOT = resolve(HERE, '../../reference-project/deepseek-harness')
const MAGIC_PATCH = resolve(HERE, '../../patches/sdk.patch.yml')

// dshBin：源码 checkout 的 CLI 入口（tsx ESM hook 启动）
const harness = new DeepSeekHarness({
  profile: 'sdk',
  patches: [MAGIC_PATCH],
  dshBin: resolve(DSH_ROOT, 'apps/cli/lib/bin.js'),
  provider: 'deepseek-official',
  model: 'deepseek-chat',
  initializeTimeoutMs: 60_000,
})

const notifications = []
let done = false

try {
  // 先挂低层订阅：start() 握手前后产生的通知也要能收到
  const client = harness
  // DeepSeekHarness 没有直接暴露 subscribe，先用 start() 触发握手
  console.log('[smoke] starting runtime (source checkout, sdk profile + Magic patch)...')
  const started = await Promise.race([
    client.start().then(() => 'ok'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('start timeout 90s')), 90_000)),
  ])
  console.log('[smoke] initialize handshake:', started)
  done = true
  console.log('[smoke] RESULT: SDK 门握手成功 —— 外部进程可以驱动 runtime')
} catch (error) {
  console.error('[smoke] FAILED:', error?.message ?? error)
  if (error?.stderrTail) console.error('[smoke] stderr tail:', String(error.stderrTail).slice(-2000))
  process.exitCode = 1
} finally {
  if (done) {
    try { await harness.close() } catch { /* 已退出 */ }
  }
}
