// 本地界面偏好（localStorage，设置页写入 + 自定义事件同步）。
// 2026-09-17 用户裁定：最近任务区的默认展示数量放到设置里，可输入。

export const RECENT_LIMIT_KEY = "magic.recentLimit";
export const RECENT_LIMIT_DEFAULT = 20;

/** 读取「最近任务最多展示」条数（缺省 / 非法值回退默认）。 */
export function readRecentLimit(): number {
  const raw = Number.parseInt(localStorage.getItem(RECENT_LIMIT_KEY) ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : RECENT_LIMIT_DEFAULT;
}

/** 写入并广播（左栏即时生效，无需刷新）。 */
export function writeRecentLimit(value: number): void {
  localStorage.setItem(RECENT_LIMIT_KEY, String(value));
  window.dispatchEvent(new Event("magic:recent-limit"));
}