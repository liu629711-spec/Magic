// Bundle the client tab (React) into lib/client.js served through the
// package exports "./client" face (same wiring as plugins/dsh-better-sidebar:
// dsh.client declaration + exports, composed by dsh-client-modules).
// Externals (react, react-dom) are provided by the host client runtime.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const esbuild = require('esbuild')

const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  write: false,
  logLevel: 'silent',
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
  ],
})

const code = result.outputFiles[0]?.text
if (code === undefined) throw new Error('esbuild produced no output')

// The DSH client runtime serves every plugin bundle through the global
// module loader: the factory receives `require` and resolves the externals
// (react, react-dom) from the client runtime — same wrapper as
// plugins/magic-ceo-ui and plugins/dsh-better-sidebar.
mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(join(root, 'lib', 'client.js'), [
  'window.__ModuleLoader__.load({',
  '\tid: "@magic/dsh-browser",',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  code.replace(/^"use strict";\r?\n/, ''),
  '\t\treturn module.exports;',
  '\t}',
  '});',
  '',
].join('\n'))
console.log('wrote', join(root, 'lib', 'client.js'))
