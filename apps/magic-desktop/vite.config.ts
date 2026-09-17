import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SDK 接线（M1，浏览器 dev 形态）：把 DSH web 通道同源代理到本机 `dsh web` 实例。
// 目标可用 VITE_DSH_WEB_ORIGIN 覆盖（默认 3099 = Magic 插件全挂的调试实例）。
// - /api      ：会话 RPC（session/list|create|prompt|rename|fork）+ remote.mux WS
// - /sidebar  ：better-sidebar 插件宿主路由（右坞数据源，下一步接线）
// - /dsh-auth-connect：根路径 GET /?token= 一次性换 HttpOnly Cookie（browser-auth.ts:239-265），
//   经代理转发 Set-Cookie 到本开发源，后续请求（含 WS upgrade）带 Cookie 即已认证。
const target = process.env.VITE_DSH_WEB_ORIGIN ?? "http://127.0.0.1:3099";

// dsh web 的 API 信任围栏（connection/src/api-request-trust.ts:111-117）要求
// 请求 Origin == 上游 Host（围栏检查先于认证，失配返回 403）。
// changeOrigin 已把 Host 改写为 target，这里再把 Origin/WS 握手 Origin 一并改写。
function rewriteFenceHeaders(proxy: { on: (event: string, listener: (req: { setHeader: (k: string, v: string) => void }) => void) => void }): void {
  for (const event of ["proxyReq", "proxyReqWs"]) {
    proxy.on(event, proxyReq => proxyReq.setHeader("origin", target));
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target, changeOrigin: true, ws: true, configure: rewriteFenceHeaders },
      "/sidebar": { target, changeOrigin: true, ws: true, configure: rewriteFenceHeaders },
      "/dsh-auth-connect": {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dsh-auth-connect/, ""),
      },
    },
  },
});
