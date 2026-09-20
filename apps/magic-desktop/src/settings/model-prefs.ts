// 模型启用/停用偏好（2026-09-19 用户裁定）：客户端偏好存 localStorage，
// runtime 暂无停用通道。模型设置页写入，对话区模型选择器（App modelPicker）
// 按此过滤——停用的提供方/模型不再出现在可选列表。
const DISABLED_PROVIDERS_KEY = "magic.models.disabledProviders";
const DISABLED_MODELS_KEY = "magic.models.disabledModels";

function readStringSet(key: string): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? new Set() : new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeStringSet(key: string, ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // 隐私模式等存不进仅影响下次会话初始态
  }
}

export function readDisabledProviders(): ReadonlySet<string> {
  return readStringSet(DISABLED_PROVIDERS_KEY);
}

export function writeDisabledProviders(ids: ReadonlySet<string>): void {
  writeStringSet(DISABLED_PROVIDERS_KEY, ids);
}

export function readDisabledModels(): ReadonlySet<string> {
  return readStringSet(DISABLED_MODELS_KEY);
}

export function writeDisabledModels(ids: ReadonlySet<string>): void {
  writeStringSet(DISABLED_MODELS_KEY, ids);
}

/** 单个模型选项是否被停用（provider = 提供方路由 id，model = 模型 id）。 */
export function isModelDisabled(
  disabledProviders: ReadonlySet<string>,
  disabledModels: ReadonlySet<string>,
  provider: string,
  model: string,
): boolean {
  return disabledProviders.has(provider) || disabledModels.has(`${provider}:${model}`);
}
