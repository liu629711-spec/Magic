/**
 * Vendor shim of `@deepseek-ai/dsh-client-ui-session/client`（type-only）。
 * 上游把 sessionId/useSession/useProjection merge 进 SessionStandardProps；
 * 本环境只有 RightbarSeat 消费 session 标准席位且只用 sessionId，故按
 * better-sidebar vendor-types 先例裁剪为 sessionId 一员——host 层渲染时只传
 * 该成员，props 形状保持自洽。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SessionStandardProps {
    /** Current Session identity（上游还 merge useSession/useProjection；本环境无消费者，裁剪）。 */
    sessionId: SessionId
  }
}
