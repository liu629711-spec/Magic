/**
 * Vendor shim of `@deepseek-ai/dsh-session/types`（type-only；SessionId 照抄
 * 上游 packages/core/session/src/types.ts:19 的定义）。ui-sidebar-right 仅
 * type-import 本成员；magic-desktop 的 sessionId 是纯字符串，结构兼容。
 */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** A branded session id（opaque；字符串运行时形态）。 */
export type SessionId = Branded<'SessionId'>
