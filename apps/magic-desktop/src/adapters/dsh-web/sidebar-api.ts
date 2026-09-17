// better-sidebar 插件宿主路由客户端（/sidebar/api/*，Vite 已代理到 dsh web 实例）。
// 形状源自 plugins/dsh-better-sidebar/src/client/api.ts:151-164：POST + JSON body，
// 响应信封 {ok:true, value} / {ok:false, error}。用于设置页读写插件偏好（SidebarPrefs）。

export type SidebarPrefs = Record<string, unknown>;

async function sidebarApi<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`/sidebar/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const parsed = (await response.json().catch(() => null)) as
    | { ok?: boolean; value?: T; error?: { code?: string; message?: string } }
    | null;
  if (!response.ok || parsed === null || parsed.ok !== true) {
    throw new Error(parsed?.error?.message ?? `sidebar api ${method}: HTTP ${response.status}`);
  }
  return parsed.value as T;
}

/** 读取插件偏好（settings.get，含 revision 用于并发保护）。 */
export async function getSidebarPrefs(): Promise<{ prefs: SidebarPrefs; revision?: number }> {
  const result = await sidebarApi<{ value?: SidebarPrefs; revision?: number }>("settings.get");
  return { prefs: result.value ?? {}, revision: result.revision };
}

/** 合并写入插件偏好（settings.update，revision-guarded）。 */
export async function updateSidebarPrefs(
  patch: Record<string, unknown>,
  expectedRevision?: number,
): Promise<{ prefs: SidebarPrefs; revision?: number }> {
  const result = await sidebarApi<{ value?: SidebarPrefs; revision?: number }>("settings.update", {
    patch,
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  });
  return { prefs: result.value ?? {}, revision: result.revision };
}