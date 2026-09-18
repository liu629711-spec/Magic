/**
 * Vendor shim of `@deepseek-ai/dsh-client-ui-conversation/client`（type-only）。
 * ExpandButton（ui-sidebar-right 平移包）声明进会话头部的 corner 席——本环境
 * 只需 SlotMap 占位（scope 'session' 带来 SessionStandardProps.sessionId）。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 会话头部的角落席（上游由 ui-conversation 声明；ExpandButton 的宿主）。 */
    'conversation.session.header.corner': { kind: 'single'; scope: 'session' }
  }
}
