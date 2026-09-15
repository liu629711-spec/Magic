/**
 * The + button's single-option fast path: with exactly one ENABLED new-tab
 * option (the terminal-only bottom workbench) clicking + opens it directly
 * instead of popping a one-item menu — the menu is an extra click with no
 * choice to make. Zero options, a disabled sole option, or several options
 * keep the menu behavior (disabled sole option must NOT fire a dead open).
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

// The act() environment flag (React 18.2 reads it before flushing effects).
import { setupReactAct } from './test-utils.ts'
setupReactAct()

import { TabBar, type NewTabOption } from '../src/client/TabBar.tsx'
import type { SidebarTab } from '../src/client/state.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountBar(newTabOptions: NewTabOption[]): { onNewTab: ReturnType<typeof vi.fn>; plus: HTMLElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.append(container)
  const onNewTab = vi.fn()
  const tabs: SidebarTab[] = []
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(TabBar, {
      paneId: 'pane:1',
      tabs,
      active: null,
      onActivate: () => {},
      onClose: () => {},
      onNewTab,
      newTabOptions,
      onDropTab: () => {},
    }))
  })
  const plus = container.querySelector('[aria-label="New Tab"]') as HTMLElement
    ?? container.querySelector('button[class*="tabBarPlus"]') as HTMLElement
  expect(plus, 'the + button must render').not.toBeNull()
  return {
    onNewTab,
    plus,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

/** The openable + menu items currently in the DOM (portal-rendered). */
function openMenuItems(): string[] {
  return [...document.querySelectorAll('[role="menuitem"]')].map(m => (m.textContent || '').trim())
}

describe('TabBar + single-option fast path', () => {
  it('one enabled option: + opens it directly, no menu', () => {
    const bar = mountBar([{ id: 'terminal', label: 'Terminal', disabled: false }])
    act(() => { bar.plus.click() })
    expect(bar.onNewTab).toHaveBeenCalledWith('terminal')
    expect(openMenuItems()).toEqual([])
    bar.unmount()
  })

  it('a disabled sole option: + opens the menu (disabled row), fires nothing', () => {
    const bar = mountBar([{ id: 'terminal', label: 'Terminal', disabled: true }])
    act(() => { bar.plus.click() })
    expect(bar.onNewTab).not.toHaveBeenCalled()
    expect(openMenuItems()).toEqual(['Terminal'])
    bar.unmount()
  })

  it('multiple options: + opens the menu as before', () => {
    const bar = mountBar([
      { id: 'terminal', label: 'Terminal', disabled: false },
      { id: 'browser', label: 'Browser', disabled: false },
    ])
    act(() => { bar.plus.click() })
    expect(bar.onNewTab).not.toHaveBeenCalled()
    expect(openMenuItems()).toEqual(['Terminal', 'Browser'])
    bar.unmount()
  })

  it('zero options: + opens nothing (empty menu, no fire)', () => {
    const bar = mountBar([])
    act(() => { bar.plus.click() })
    expect(bar.onNewTab).not.toHaveBeenCalled()
    expect(openMenuItems()).toEqual([])
    bar.unmount()
  })
})
