import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vendor 平移包的对外包名解析（与 tsconfig.json paths 一一对应）：上游源码的
// 包名 import 原样保留，构建期重写到 vendor 内的实现/类型 shim。
const vendorAliases: Record<string, string> = {
  "@deepseek-ai/dsh-brand": "src/vendor/dsh-brand/index.ts",
  "@deepseek-ai/dsh-session/types": "src/vendor/dsh-session/types.ts",
  "@deepseek-ai/dsh-client-store": "src/vendor/dsh-client-store/src/index.ts",
  "@deepseek-ai/dsh-client-ui-slots": "src/vendor/dsh-client-ui-slots/src/index.ts",
  "@deepseek-ai/dsh-client-ui-dockkit": "src/vendor/ui-dockkit/src/index.ts",
  "@deepseek-ai/dsh-client-ui-layout/client": "src/vendor/dsh-client-host-types/ui-layout.ts",
  "@deepseek-ai/dsh-client-ui-session/client": "src/vendor/dsh-client-host-types/ui-session.ts",
  "@deepseek-ai/dsh-client-locale/client": "src/vendor/dsh-client-host-types/locale.ts",
  "@deepseek-ai/dsh-client-ui-renderer/client": "src/vendor/dsh-client-host-types/ui-renderer.ts",
  "@deepseek-ai/dsh-client-ui-conversation/client": "src/vendor/dsh-client-host-types/conversation.ts",
  "@deepseek-ai/dsh-client-resources/client": "src/vendor/dsh-client-host-types/resources.ts",
};
const here = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

// SDK 接线（M1，浏览器 dev 形态）：把 DSH web 通道同源代理到本机 `dsh web` 实例。
// 目标可用 VITE_DSH_WEB_ORIGIN 覆盖（默认 3099 = Magic 插件全挂的调试实例）。
// - /api      ：会话 RPC（session/list|create|prompt|rename|fork）+ remote.mux WS
// - /sidebar  ：better-sidebar 插件宿主路由（右坞数据源，下一步接线）
// - /open-in-app：host open-in-app 路由（GET /apps 探测、POST /open 启动、GET /icon/<id>
//   图标——open-in-app/src/shared.ts:8-14；顶栏 workspace chip 打开文件资源管理器/
//   Cursor/VS Code 用）
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
  resolve: {
    alias: Object.fromEntries(
      Object.entries(vendorAliases).map(([find, relative]) => [find, here("./" + relative)]),
    ),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target, changeOrigin: true, ws: true, configure: rewriteFenceHeaders },
      "/sidebar": { target, changeOrigin: true, ws: true, configure: rewriteFenceHeaders },
      "/open-in-app": { target, changeOrigin: true, configure: rewriteFenceHeaders },
      "/dsh-auth-connect": {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dsh-auth-connect/, ""),
      },
    },
  },
});
