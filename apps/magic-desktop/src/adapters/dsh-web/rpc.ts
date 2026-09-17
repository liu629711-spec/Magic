// DSH web 通道 RPC（SDK 接线 M1，浏览器 dev 形态）。
// 传输契约源自上游源码 reference-project/deepseek-harness：
// - POST /api/<ns>/<method>，信封 {type:'client-request',rpcId,method,payload:{args}}
//   → {type:'server-response',rpcId,result:{ok,value}|{ok:false,error}}（connection/src/client/rpc.ts:34-59）
// - 认证：根路径 GET /?token= 一次性换 HttpOnly Cookie（browser-auth.ts:239-265）；
//   Vite 代理 /dsh-auth-connect → / 把 Set-Cookie 落到本开发源，之后所有请求带 Cookie。
// Electron 壳阶段同一 adapter 换成 SDK 进程内桥，前端其余代码不动。

export async function dshRpc<T>(
  endpoint: string,
  args: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const rpcId = crypto.randomUUID();
  const response = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "client-request", rpcId, method: endpoint, payload: { args } }),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new Error(`dsh rpc ${endpoint}: HTTP ${response.status}`);
  const full = (await response.json()) as {
    type?: string;
    rpcId?: string;
    result?: { ok?: boolean; value?: T; error?: { code?: string; message?: string } };
  };
  if (full.type !== "server-response" || full.rpcId !== rpcId || full.result === undefined) {
    throw new Error(`dsh rpc ${endpoint}: 响应信封不合法`);
  }
  if (full.result.ok === true) return full.result.value as T;
  throw new Error(full.result.error?.message ?? `dsh rpc ${endpoint} 失败`);
}

/** 从粘贴的授权 URL 或裸 token 里取 token。 */
export function tokenFromInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new Error("请粘贴 dsh web 打印的授权 URL 或 token");
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token !== null && token.length > 0) return token;
  } catch {
    /* 非 URL，按裸 token 处理 */
  }
  return trimmed;
}

/** 经代理完成 token → Cookie 交换（303 + Set-Cookie 由浏览器落盘）。 */
export async function dshAuthExchange(token: string): Promise<void> {
  const response = await fetch(`/dsh-auth-connect?token=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error(`授权交换失败：HTTP ${response.status}（token 是否已被使用过？）`);
}

/** 探测是否已认证：session/list 通了即 ready，401 即 need-auth。 */
export async function dshProbeAuth(): Promise<"ready" | "need-auth"> {
  try {
    await dshRpc("session/list", { _request: {} });
    return "ready";
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) return "need-auth";
    throw error;
  }
}
