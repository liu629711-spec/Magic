/**
 * Vendor shim of `@deepseek-ai/dsh-brand`（type-only；定义照抄上游
 * tool-cordis api-catalog 记录的官方声明，Branded opaque id 语义不变）。
 * magic-desktop 只消费类型面（ui-dockkit contract/types.ts），无运行时代码。
 */

/** Opaque brand key（模块内 unique symbol，与上游一致：仅类型层可见）。 */
declare const BRAND: unique symbol

/** A string carrying an invisible brand tag（PanId/SplitId/TabId/SessionId 的底座）。 */
export type Branded<B extends string> = string & { readonly [BRAND]: B }
