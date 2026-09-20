// 完全访问风险确认（2026-09-19 用户裁定）：按项目（cwd）持久化到 localStorage。
// 同一项目确认一次后，后续切换到 danger-full-access 直接生效不弹窗；
// 换新项目首次启用时再次弹窗。读写均 try/catch（存储不可用时视为未确认，只多弹一次窗）。

const STORAGE_KEY = "magic:full-access-consent:v1";

/** 规范化 cwd 用于比较：反斜杠→斜杠、去尾斜杠、小写（Windows 盘符大小写差异）。 */
export function normalizeCwdKey(cwd: string): string {
  const unified = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  return unified.toLowerCase();
}

function readAll(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeAll(keys: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // 存储不可用（隐私模式等）：确认仅本次会话生效，每次启用都重新确认。
  }
}

/** 该项目是否已确认过完全访问风险。 */
export function hasFullAccessConsent(cwd: string | undefined): boolean {
  if (cwd === undefined || cwd.length === 0) return false;
  return readAll().includes(normalizeCwdKey(cwd));
}

/** 记录该项目已确认（幂等；新键追加到列表尾部）。 */
export function saveFullAccessConsent(cwd: string | undefined): void {
  if (cwd === undefined || cwd.length === 0) return;
  const key = normalizeCwdKey(cwd);
  const all = readAll();
  if (all.includes(key)) return;
  writeAll([...all, key]);
}
