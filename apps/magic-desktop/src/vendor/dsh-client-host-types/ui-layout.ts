/**
 * Vendor shim of `@deepseek-ai/dsh-client-ui-layout/client`（type-only；照抄
 * 上游 packages/client/ui-layout/src/client/index.ts 对 ui-sidebar-right 编译
 * 生效的成员：SlotMap 四个 frame key + RightbarOwnerProps + ILayout 消费面）。
 * 裁剪：SidebarOwnerProps/AppFrame/LayoutController 等本环境不消费的成员不收录；
 * ILayout 只保留 ui-sidebar-right apply 调用的 openRightbar/closeRightbar。
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store'

/** The main panel's frame facts（上游 PanelInfo 的消费面裁剪）。 */
export interface PanelInfo {
  /** The selected main panel key, or null while a global panel owns the centre. */
  activePanelId: string | null
}

/** Subscribe to the selected main panel independently of parent renders. */
export type UsePanelInfo = SnapshotSelectorHook<PanelInfo>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface GlobalStandardProps {
    /** Subscribe to the selected main panel independently of parent renders. */
    usePanelInfo: UsePanelInfo
  }

  interface SlotMap {
    /** Central panel selected by sidebar entry id（本环境只作类型占位）。 */
    'main': { kind: 'keyed'; scope: 'root' }
    /**
     * The right column：OCCUPIED by the right Sidebar（ui-sidebar-right）。
     * owner share 照抄上游 RightbarOwnerProps。
     */
    'rightbar': { kind: 'single'; scope: 'root'; owner: RightbarOwnerProps }
    /** Frame-wide floating layer（本环境只作类型占位）。 */
    'shell.overlay': { kind: 'list'; scope: 'root' }
  }
}

/** Right column owner share: resolved normal geometry and opening eligibility（照抄上游）。 */
export interface RightbarOwnerProps {
  /** Resolved normal panel width in px, not the saved preference; zero if it cannot fit. */
  width: number
  /** Current frame width in px. */
  viewportWidth: number
  /**
   * Whether a normal right panel can retain 300px beside a 400px center.
   * Before a narrow opening, includes the space from collapsing the left sidebar.
   */
  canShow: boolean
}

/**
 * The frame's panel actions（上游 ILayout 的窄化裁剪：ui-sidebar-right 的
 * syncPresentation 只调这两个成员）。
 */
export interface ILayout {
  /**
   * Reserve the right column's track and draw the panel over it（fullscreen 时
   * track 保留在 fullscreen 面板底下）。
   * @param track - whether the conversation should make room for the panel.
   * @param fullscreen - whether the panel covers the viewport.
   */
  openRightbar(track: boolean, fullscreen: boolean): void
  /** Hand the right column's track back（panel hidden）。 */
  closeRightbar(): void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The frame's panel actions（上游由 ui-layout 服务提供）。 */
    layout: ILayout
  }
}
