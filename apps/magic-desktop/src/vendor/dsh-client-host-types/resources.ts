/**
 * Vendor shim of `@deepseek-ai/dsh-client-resources/client`（type-only）。
 * 上游在这里把资源模型服务 merge 进 cordis Context；ui-sidebar-right 的 apply
 * 依赖 `ctx.resources.pin`（Tab domain 的资源保留）。
 */
declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The resource model（pin 保活一个地址的内容直到 signal 终止）。 */
    resources: {
      pin(address: string, signal: AbortSignal): void
    }
  }
}
