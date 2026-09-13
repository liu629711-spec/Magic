// Magic DSH web launcher (PRD-02 §18): starts the DSH web app with the Magic
// overlay and the agent browser in headless mode (no OS window; the watch
// panel in the sidebar is the only view). Pass --headed to get the visible
// Chromium window back (full frame rate).
//
//   node scripts/start-web.mjs            → headless agent browser
//   node scripts/start-web.mjs --headed   → visible window (full fps)
//   extra args are forwarded to `dsh web` (e.g. --no-open, --port 3081).
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const headed = process.argv.includes('--headed')
const extra = process.argv.slice(2).filter((arg) => arg !== '--headed')

const env = { ...process.env, MAGIC_BROWSER_HEADLESS: headed ? '0' : '1' }
const patch = join(root, 'patches', 'web.patch.yml')
const child = spawn(
  'pnpm',
  ['--dir', join(root, 'reference-project', 'deepseek-harness'), 'dsh', 'web', '--patch', patch, ...extra],
  { stdio: 'inherit', shell: process.platform === 'win32', env },
)
child.on('exit', (code) => process.exitCode = code ?? 0)
