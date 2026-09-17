// vendored from dsh-better-sidebar@0.19.1 src/context-types.ts （Magic 客户端复用；M3 Tauri sidecar 阶段接线，不参与前端构建）
// 只保留 server/better-sidebar 半（wire.ts）需要的两个 HTTP 面；其余结构化服务面留在插件源码。

/** The request face route handlers see (structural subset of node's
 *  IncomingMessage: the URL/method/header reads and the async body
 *  iteration `readJsonBody` uses). */
export interface SidebarHttpRequest {
  url?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array>
}

/** The response face route handlers write to (structural subset of node's
 *  ServerResponse: the status/header/body writes the routes use). */
export interface SidebarHttpResponse {
  statusCode: number
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string | Uint8Array): void
}
