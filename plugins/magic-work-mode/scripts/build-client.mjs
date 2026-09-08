import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = join(root, 'lib', 'client.js')
const dshRequire = createRequire(join(root, '../../reference-project/deepseek-harness/package.json'))

async function loadEsbuild() {
  try {
    return dshRequire('esbuild')
  } catch {
    const candidates = [
      join(root, '../../reference-project/deepseek-harness/node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/lib/main.js'),
      join(root, '../../reference-project/deepseek-harness/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js'),
    ]
    for (const candidate of candidates) {
      try {
        return await import(pathToFileURL(candidate).href)
      } catch {
        // try the next installed esbuild
      }
    }
    throw new Error('esbuild is not available from the DSH checkout')
  }
}

const esbuild = await loadEsbuild()
const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/client/index.ts'],
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
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
})

const code = result.outputFiles[0]?.text
if (code === undefined) throw new Error('esbuild produced no output')

mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(outFile, [
  'window.__ModuleLoader__.load({',
  '\tid: "@magic/dsh-work-mode",',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  code.replace(/^"use strict";\r?\n/, ''),
  '\t\treturn module.exports;',
  '\t}',
  '});',
  '',
].join('\n'))
console.log('wrote', outFile)
