import { Icon } from '../sidebar/Icon'

export type DockTabId = 'start' | 'changes' | 'terminal' | 'files' | 'team' | 'jobs' | 'browser' | 'sidechat'
export interface DockTabDef { id: DockTabId; label: string; icon: string }
const button = 'h-7 w-7 shrink-0 rounded flex items-center justify-center text-outline hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest focus-visible:outline focus-visible:outline-primary disabled:opacity-40 disabled:cursor-not-allowed'

export function DockTabBar({ tabs, active, changesCount, fullscreen, onToggleFullscreen, onSelect, onCloseTab, onStart, onCollapse }: {
  tabs: DockTabDef[]
  active: DockTabId
  changesCount: number | null
  fullscreen: boolean
  onToggleFullscreen?: () => void
  onSelect: (id: DockTabId) => void
  onCloseTab: (id: DockTabId) => void
  onStart: () => void
  onCollapse?: () => void
}) {
  return <div className="h-10 shrink-0 border-b border-surface-container-highest flex items-center gap-1 px-2" data-dock-tabs>
    <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1" role="tablist" aria-label="右坞面板">
      {tabs.map(tab => <div key={tab.id} className={`shrink-0 flex items-center rounded ${active === tab.id ? 'bg-surface-container-high' : ''}`}>
        <button type="button" role="tab" aria-selected={active === tab.id} onClick={() => onSelect(tab.id)} className="h-7 flex items-center gap-1.5 px-2 text-xs text-on-surface-variant hover:text-on-surface active:bg-surface-container-highest focus-visible:outline focus-visible:outline-primary">
          <Icon name={tab.icon} className="text-[15px]" /><span>{tab.label}</span>
          {tab.id === 'changes' && changesCount !== null && <span>{changesCount}</span>}
        </button>
        {tab.id !== 'start' && <button type="button" className={button} aria-label={`关闭 ${tab.label}`} onClick={() => onCloseTab(tab.id)}><Icon name="close" className="text-[14px]" /></button>}
      </div>)}
    </div>
    <button type="button" className={button} aria-label="添加面板" title="开始" onClick={onStart}><Icon name="add" className="text-[18px]" /></button>
    <button type="button" className={button} aria-label={fullscreen ? '退出全屏' : '全屏'} disabled={!onToggleFullscreen} onClick={onToggleFullscreen}><Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} className="text-[18px]" /></button>
    <button type="button" className={button} aria-label="收起右坞" disabled={!onCollapse} onClick={onCollapse}><Icon name="right_panel_close" className="text-[18px]" /></button>
  </div>
}
