/**
 * The bottom workbench's openable-tab list (buildNewTabOptions): the + menu
 * and the empty-pane surface both draw from it. Magic local patch
 * (2026-09-14): the bottom workbench is TERMINAL-ONLY — files/changes/
 * tasks/browser/sidechat open from the right sidebar, so this builder
 * offers the terminal alone even though the registry holds 7 built-ins.
 */
import { describe, expect, it } from 'vitest'
import './browser-globals.ts'

import type { Context } from '../src/context-types.ts'
import { createBetterSidebarService } from '../src/client/service.ts'
import { createSidebarStore } from '../src/client/state.ts'
import { registerBuiltins } from '../src/client/builtins/index.ts'
import { buildNewTabOptions } from '../src/client/sidebar/TabContent.tsx'

/** A store + registered built-ins + the ctx face buildNewTabOptions reads. */
function setup(options: { terminalEnabled?: boolean } = {}) {
  const store = createSidebarStore()
  store.setSession('s1')
  const service = createBetterSidebarService(store)
  registerBuiltins({} as Context, service, {})
  if (options.terminalEnabled === false) {
    store.setPrefs({ ...store.getPrefs(), tabsEnabled: { ...store.getPrefs().tabsEnabled, terminal: false } })
  }
  const ctx = {
    get: (name: string) => name === 'betterSidebar' ? service : undefined,
  } as unknown as Context
  return { store, service, ctx }
}

describe('buildNewTabOptions (bottom workbench is terminal-only)', () => {
  it('offers only the terminal even though the registry holds all built-ins', () => {
    const { store, ctx } = setup()
    const options = buildNewTabOptions(store.getSnapshot().state!, ctx, { sessionId: 's1', cwd: '/work' })
    expect(options.map(o => o.id)).toEqual(['terminal'])
  })

  it('a user-disabled terminal disappears from the list entirely', () => {
    const { store, ctx } = setup({ terminalEnabled: false })
    const options = buildNewTabOptions(store.getSnapshot().state!, ctx, { sessionId: 's1', cwd: '/work' })
    expect(options).toEqual([])
  })
})
