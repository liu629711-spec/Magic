// 模型设置：编辑卡 + 自定义提供方创建卡（2026-09-18，官方 DSH 形态复刻）。
// 交互与写通道语义逐条对齐官方源码 reference-project/deepseek-harness/packages/client/ui-settings-models/src/client：
// - ProviderEditor.tsx（API 密钥 write-only、自定义设置折叠、模型目录、path ops 保存、revision 乐观并发）
// - CustomProviderCard.tsx:142-182（单条 set op 建 providers.<route>，密钥走 credentials/set）
// - ModelListEditor.tsx:229-257（探测请求携带表单当前值，密钥只随本次询问、绝不入库）
// 视觉值：task 指定的官方实测规格（0.5px 边/16px 圆角/32px 输入框/h-36 圆角全径按钮等），
// 色彩映射 Magic 暗色 stitch token（主色=primary、危险=error、次级=on-surface-variant/outline、模块底=surface-container-low）。
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { readDisabledModels, writeDisabledModels } from "./model-prefs";
import {
  apiKeyFailure,
  credentialsDescribe,
  credentialsSet,
  formatCapacity,
  inheritedModels,
  jsonDeletePath,
  jsonGetPath,
  jsonHasPath,
  jsonSetPath,
  llmDiscoverModels,
  MODEL_FAILURE_TEXT,
  modelFailureOf,
  parseCapacity,
  pathOps,
  protocolChoices,
  deriveKeyRef,
  settingsMutate,
  type CredentialInfo,
  type JsonMap,
  type JsonValue,
  type LlmDiscoveredModel,
  type ModelDraft,
  type SettingsNamespaceView,
} from "./models-wire";

const DEEPSEEK_PUBLIC_BASE_URL = "https://api.deepseek.com";

/** 每适配器族的策划字段集（ProviderEditor.tsx:133-137）。 */
export type EditorLayout = "deepseek" | "pi-ai" | "unknown";

export function layoutOf(ns: string): EditorLayout {
  if (ns === "llm-deepseek") return "deepseek";
  if (ns === "llm-pi-ai") return "pi-ai";
  return "unknown";
}

/** 该 profile 解析密钥所经的凭证引用（ProviderEditor.tsx:140-151）。 */
function refFor(view: SettingsNamespaceView, path: readonly string[], provider: string): string {
  const profile = jsonGetPath(view.value, path);
  const named = typeof profile === "object" && profile !== null && !Array.isArray(profile)
    ? (profile as JsonMap)["apiKeyEnv"]
    : undefined;
  return typeof named === "string" && named.length > 0 ? named : deriveKeyRef(provider);
}

/** 用户层子树的草稿对象（缺失 → 空）。 */
function draftAt(view: SettingsNamespaceView, path: readonly string[]): JsonMap {
  const subtree = jsonGetPath(view.user, path);
  if (typeof subtree !== "object" || subtree === null || Array.isArray(subtree)) return {};
  return structuredClone(subtree) as JsonMap;
}

// ── 通用样式（与官方 CSS module 同一档位）──
const clsInput =
  "h-8 w-full rounded-lg border-[0.5px] border-surface-container-highest bg-surface-container px-2.5 text-[14px] leading-[22px] text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary disabled:opacity-60 disabled:cursor-default";
const clsSelectInput = `${clsInput} cursor-pointer max-w-[240px] appearance-none bg-no-repeat pr-8 bg-[length:12px_12px] bg-[right_12px_center] bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='12'%20viewBox='0%200%2012%2012'%20fill='none'%3E%3Cpath%20d='M3%204.5L6%207.5L9%204.5'%20stroke='%2381858C'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E")]`;
const clsFieldLabel = "inline-flex items-center gap-2.5 text-[12px] leading-[18px] font-medium text-on-surface-variant";
const clsSecondaryButton =
  "box-border inline-flex h-9 items-center justify-center rounded-full border-[0.5px] border-surface-container-highest px-3.5 text-[14px] leading-[22px] text-on-surface transition-colors hover:bg-surface-container-high focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent";
const clsPrimaryButton =
  "box-border inline-flex h-9 items-center justify-center rounded-full bg-primary px-3.5 text-[14px] leading-[22px] text-on-primary transition-opacity hover:opacity-90 focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";
const clsLinkButton =
  "box-border inline-flex h-7 items-center rounded-full px-2.5 text-[12px] leading-[18px] text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface-variant focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";
const clsIconButton =
  "box-border inline-flex h-7 w-7 items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";
const clsError = "m-0 text-[12px] leading-[18px] text-error";
const clsHint = "m-0 text-[12px] leading-[18px] text-outline";

/** 折叠箭头（ModelListEditor.tsx:91-100 的旋转语义）。 */
function Chevron({ open }: { open: boolean }): ReactNode {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden
      style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 120ms ease" }}
    >
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4M6.5 6.8v4.4M9.5 6.8v4.4"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ── 模型目录行列表（deepseek / pi-ai 共用；容量藏在行内展开里，pi-ai 附探测取模型）──

interface ModelCatalogProps {
  models: readonly ModelDraft[];
  /** 用户层是否已整体接管数组；undefined = 新建卡（无继承语义）。 */
  overridden?: boolean;
  onChange: (models: ModelDraft[]) => void;
  onReset?: () => void;
  disabled: boolean;
  /** deepseek 族的路由级容量默认值（占位提示）。 */
  defaults?: { contextWindow?: number; maxTokens?: number };
  /** pi-ai 族的「获取可用模型」；onFetch 返回候选或抛出拒绝信息。缺省不渲染按钮。 */
  fetch?: { askable: boolean; blocked?: string; onFetch: () => Promise<LlmDiscoveredModel[]> };
}

/** 两容量字段共用的提示拼法（ModelListEditor.tsx:128-131）。 */
const CAPACITY_HINT: Record<string, string> = { contextWindow: "256K", maxTokens: "32K" };

function ModelCatalog(props: ModelCatalogProps): ReactNode {
  const { models, onChange, disabled, defaults } = props;
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [editing, setEditing] = useState<ReadonlyMap<string, string>>(new Map());
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchFailure, setFetchFailure] = useState<string | undefined>(undefined);
  const [candidates, setCandidates] = useState<readonly LlmDiscoveredModel[] | undefined>(undefined);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");

  const bufferKey = (index: number, field: string): string => `${String(index)}:${field}`;

  const patch = (index: number, next: Record<string, string | number | undefined>): void => {
    onChange(models.map((model, at) => {
      if (at !== index) return model;
      // 被清空的可选字段要离开 profile，而不是作为空串存进去。
      const cleared = new Set(
        Object.entries(next).filter(([, value]) => value === undefined || value === "").map(([key]) => key),
      );
      return Object.fromEntries(
        Object.entries({ ...model, ...next }).filter(([key]) => !cleared.has(key)),
      );
    }));
  };

  const editCapacity = (index: number, field: string, text: string): void => {
    setEditing(current => new Map(current).set(bufferKey(index, field), text));
    const parsed = parseCapacity(text);
    patch(index, { [field]: parsed === undefined ? undefined : parsed });
  };

  const capacityText = (model: ModelDraft, index: number, field: string): string => {
    const buffered = editing.get(bufferKey(index, field));
    if (buffered !== undefined) return buffered;
    const value = model[field];
    return typeof value === "number" ? formatCapacity(value) : "";
  };

  const removeRow = (index: number): void => {
    onChange(models.filter((_model, at) => at !== index));
    // 展开态与文本缓冲都按行号键控：删除后整体前移，避免兄弟行继承状态。
    setExpanded(current => {
      const next = new Set<number>();
      for (const at of current) {
        if (at < index) next.add(at);
        else if (at > index) next.add(at - 1);
      }
      return next;
    });
    setEditing(current => {
      const next = new Map<string, string>();
      for (const [key, value] of current) {
        const at = Number(key.slice(0, key.indexOf(":")));
        if (at === index) continue;
        next.set(at > index ? key.replace(/^\d+/, String(at - 1)) : key, value);
      }
      return next;
    });
  };

  const closePicker = (): void => {
    setCandidates(undefined);
    setPicked(new Set());
    setQuery("");
  };

  const adoptPicked = (): void => {
    if (candidates === undefined) return;
    const byId = new Map<string, ModelDraft>();
    for (const model of models) {
      const id = model["id"];
      if (typeof id === "string" && id.length > 0) byId.set(id, model);
    }
    for (const candidate of candidates) {
      if (!picked.has(candidate.id)) continue;
      // 按 id 匹配：用户已调过的行胜出探测返回的容量值。
      byId.set(candidate.id, byId.get(candidate.id) ?? {
        id: candidate.id,
        ...(candidate.name === undefined ? {} : { name: candidate.name }),
        ...(candidate.contextWindow === undefined ? {} : { contextWindow: candidate.contextWindow }),
        ...(candidate.maxTokens === undefined ? {} : { maxTokens: candidate.maxTokens }),
      });
    }
    onChange([...byId.values()]);
    closePicker();
  };

  const runFetch = (): void => {
    if (props.fetch === undefined) return;
    setFetchBusy(true);
    setFetchFailure(undefined);
    props.fetch.onFetch()
      .then(found => {
        if (found.length === 0) {
          setFetchFailure("该提供方没有列出任何模型，请手动添加。");
          return;
        }
        const known = new Set(models.map(model => (typeof model["id"] === "string" ? model["id"] : "")));
        setQuery("");
        setCandidates(found);
        setPicked(new Set(found.filter(model => !known.has(model.id)).map(model => model.id)));
      })
      .catch((cause: unknown) => {
        setFetchFailure(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setFetchBusy(false));
  };

  const normalized = query.trim().toLowerCase();
  const visibleCandidates = candidates === undefined ? [] : normalized.length === 0
    ? candidates
    : candidates.filter(candidate =>
      candidate.id.toLowerCase().includes(normalized)
      || candidate.name?.toLowerCase().includes(normalized) === true);
  const allPicked = visibleCandidates.length > 0 && visibleCandidates.every(candidate => picked.has(candidate.id));

  return (
    <section aria-label="模型目录" className="flex flex-col gap-2.5 border-t-[0.5px] border-surface-container-highest/60 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] leading-[18px] font-medium text-on-surface-variant">模型目录</span>
          {props.overridden === undefined ? null : (
            <span className="text-[12px] leading-[18px] text-outline">
              {props.overridden ? "已自定义模型目录" : "正在使用适配器默认模型"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {props.overridden === true && props.onReset !== undefined ? (
            <button type="button" className={clsLinkButton} disabled={disabled} onClick={props.onReset}>
              恢复默认模型
            </button>
          ) : null}
          {props.fetch !== undefined ? (
            <button
              type="button"
              className={clsLinkButton}
              disabled={disabled || fetchBusy || !props.fetch.askable || props.fetch.blocked !== undefined}
              title={props.fetch.blocked ?? (props.fetch.askable ? undefined : "请先填写 API 地址，再获取。")}
              onClick={runFetch}
            >
              {fetchBusy ? "正在询问提供方…" : "获取可用模型"}
            </button>
          ) : null}
        </div>
      </div>
      {models.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-surface-container-highest p-3 text-center text-[12px] leading-[18px] text-outline">
          模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。
        </p>
      ) : null}
      {models.map((model, index) => {
        const open = expanded.has(index);
        return (
          <div key={index} className="rounded-[10px] border-[0.5px] border-surface-container-high p-1.5">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] items-center gap-1.5">
              <input
                className={clsInput}
                type="text"
                value={typeof model["id"] === "string" ? model["id"] : ""}
                placeholder="模型 ID"
                aria-label={`模型 ID ${index + 1}`}
                disabled={disabled}
                onChange={event => patch(index, { id: event.target.value })}
              />
              <input
                className={clsInput}
                type="text"
                value={typeof model["name"] === "string" ? model["name"] : ""}
                placeholder="显示名称"
                aria-label={`显示名称 ${index + 1}`}
                disabled={disabled}
                onChange={event => patch(index, { name: event.target.value === "" ? undefined : event.target.value })}
              />
              <button
                type="button"
                className={clsIconButton}
                aria-label={`容量 ${index + 1}`}
                aria-expanded={open}
                title="容量"
                onClick={() => {
                  setExpanded(current => {
                    const next = new Set(current);
                    if (!next.delete(index)) next.add(index);
                    return next;
                  });
                }}
              >
                <Chevron open={open} />
              </button>
              <button
                type="button"
                className={`${clsIconButton} hover:!text-error`}
                aria-label={`删除模型 ${index + 1}`}
                title="删除模型"
                disabled={disabled}
                onClick={() => removeRow(index)}
              >
                <TrashIcon />
              </button>
            </div>
            {open ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 px-1 pb-0.5 pt-2">
                {(["contextWindow", "maxTokens"] as const).map(field => (
                  <label key={field} className="flex flex-col gap-1">
                    <span className="text-[12px] leading-[18px] text-outline">
                      {field === "contextWindow" ? "上下文窗口" : "最大输出 token"}
                    </span>
                    <input
                      className={clsInput}
                      type="text"
                      inputMode="numeric"
                      value={capacityText(model, index, field)}
                      placeholder={
                        field === "contextWindow"
                          ? (defaults?.contextWindow !== undefined ? formatCapacity(defaults.contextWindow) : CAPACITY_HINT[field])
                          : (defaults?.maxTokens !== undefined ? formatCapacity(defaults.maxTokens) : CAPACITY_HINT[field])
                      }
                      aria-label={`${field === "contextWindow" ? "上下文窗口" : "最大输出 token"} ${index + 1}`}
                      disabled={disabled}
                      onChange={event => editCapacity(index, field, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="box-border inline-flex h-7 items-center gap-1 self-start rounded-full border-[0.5px] border-surface-container-highest px-2.5 text-[12px] leading-[18px] text-on-surface transition-colors hover:bg-surface-container-high focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default"
        disabled={disabled}
        onClick={() => onChange([...models, { id: "" }])}
      >
        添加模型
      </button>
      {fetchFailure === undefined ? null : <p className={clsError}>{fetchFailure}</p>}
      {candidates !== undefined ? (
        <div className="flex flex-col gap-2 rounded-xl border-[0.5px] border-surface-container-highest p-3">
          <div className="flex items-center gap-2">
            <input
              className={clsInput}
              type="search"
              value={query}
              placeholder="搜索模型"
              aria-label="搜索模型"
              onChange={event => setQuery(event.target.value)}
            />
            <button
              type="button"
              className={clsLinkButton}
              disabled={visibleCandidates.length === 0}
              onClick={() => {
                if (allPicked) { setPicked(new Set()); return; }
                setPicked(new Set(visibleCandidates.map(candidate => candidate.id)));
              }}
            >
              {allPicked ? "取消全选" : "全选"}
            </button>
          </div>
          {visibleCandidates.length === 0 ? (
            <p role="status" className="m-0 py-6 text-center text-[13px] leading-5 text-on-surface-variant">没有匹配的模型。</p>
          ) : (
            <ul className="m-0 flex max-h-64 list-none flex-col gap-0.5 overflow-y-auto p-0">
              {visibleCandidates.map(candidate => (
                <li key={candidate.id} className="rounded-md">
                  <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={picked.has(candidate.id)}
                      onChange={() => {
                        setPicked(current => {
                          const next = new Set(current);
                          if (!next.delete(candidate.id)) next.add(candidate.id);
                          return next;
                        });
                      }}
                    />
                    <span className="min-w-0 break-all font-mono text-[13px]">{candidate.id}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={clsSecondaryButton} onClick={closePicker}>取消</button>
            <button type="button" className={clsPrimaryButton} onClick={adoptPicked}>添加所选</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ── 编辑卡 ──

export interface ProviderEditorProps {
  provider: string;
  displayName: string;
  /** 拥有该 profile 的命名空间视图（schema/layers/revision）。 */
  namespace: SettingsNamespaceView;
  /** 命名空间 section 根到该 provider profile 的路径。 */
  settingsPath: readonly string[];
  /** 适配器仅因配置声明认识该路由（携带 wire 协议与显示名两个自有字段）。 */
  declared?: boolean;
  hideTitle?: boolean;
  readOnly: boolean;
  onClose: (changed: boolean) => void;
}

export function ProviderEditorCard(props: ProviderEditorProps): ReactNode {
  const { namespace: view, settingsPath, provider, readOnly } = props;
  const [draft, setDraft] = useState<JsonMap>(() => draftAt(view, settingsPath));
  const [keyDraft, setKeyDraft] = useState("");
  const [keyState, setKeyState] = useState<CredentialInfo | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [committedOriginal, setCommittedOriginal] = useState<unknown>(() => jsonGetPath(view.user, settingsPath));
  const [expectedRevision, setExpectedRevision] = useState(() => view.revision);

  const layout = layoutOf(view.ns);
  const fallback = jsonGetPath(view.value, settingsPath);
  const disabled = readOnly || busy;
  const keyRef = refFor(view, settingsPath, provider);
  const protocols = useMemo(() => (layout === "pi-ai" ? protocolChoices(view) : []), [layout, view]);

  useEffect(() => {
    let stale = false;
    setKeyState(undefined);
    credentialsDescribe([keyRef])
      .then(value => { if (!stale) setKeyState(value[keyRef]); })
      .catch(() => { if (!stale) setKeyState(undefined); });
    return () => { stale = true; };
  }, [keyRef]);

  const stringAt = (source: unknown, key: string): string | undefined => {
    const value = jsonGetPath(source, [key]);
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };
  const setField = (key: string, next: string | undefined): void => {
    // 纯空白的值按清除处理，而不是把空格存进 settings.yaml。
    const value = next === undefined || next.trim().length === 0 ? undefined : next;
    setDraft(current => (value === undefined ? jsonDeletePath(current, [key]) : jsonSetPath(current, [key], value)));
  };

  const modelFailure = modelFailureOf(jsonGetPath(draft, ["models"]));
  const keyFailure = apiKeyFailure(keyDraft);
  const keyValue = keyDraft.trim();

  // 探测目标 = 表单当前值（含未保存的地址与已键入未保存的密钥）。
  const probeApi = stringAt(draft, "api") ?? stringAt(fallback, "api");
  const probeBaseURL = stringAt(draft, "baseURL") ?? stringAt(fallback, "baseURL");
  const fetchModels = async (): Promise<LlmDiscoveredModel[]> =>
    llmDiscoverModels(view.ns, {
      provider,
      ...(probeBaseURL === undefined ? {} : { baseURL: probeBaseURL }),
      ...(probeApi === undefined ? {} : { api: probeApi }),
      ...(keyValue.length === 0 ? {} : { apiKey: keyValue }),
    });

  const modelsOverridden = jsonHasPath(draft, ["models"]);
  const catalogModels: readonly ModelDraft[] = modelsOverridden
    ? (Array.isArray(jsonGetPath(draft, ["models"])) ? (jsonGetPath(draft, ["models"]) as ModelDraft[]) : [])
    : inheritedModels(view, settingsPath);
  const defaultContextWindow = jsonGetPath(fallback, ["defaultContextWindow"]);
  const defaultMaxTokens = jsonGetPath(fallback, ["maxTokens"]);
  const keyLocked = keyState?.writable === false;
  const keyPlaceholder = keyLocked
    ? "由启动环境提供（只读）"
    : keyState?.configured === true
      ? "已配置——输入新值可替换"
      : layout === "pi-ai" ? "输入 API 密钥，或留空使用环境认证" : "输入 API 密钥";

  /** 保存（ProviderEditor.tsx:247-293）：path ops + 凭证写，两步都过网。 */
  const applyOnce = async (): Promise<{ failure?: string; changed: boolean }> => {
    // pi-ai 的 profile 只在即将存密钥时才记录约定引用；否则保持提供方原生认证路径。
    const next = layout === "pi-ai" && stringAt(draft, "apiKeyEnv") === undefined
      && stringAt(fallback, "apiKeyEnv") === undefined && keyValue.length > 0
      ? jsonSetPath(draft, ["apiKeyEnv"], keyRef)
      : draft;
    const failureCheck = modelFailureOf(jsonGetPath(next, ["models"]));
    if (failureCheck !== undefined) {
      return { failure: `模型 ${failureCheck.index + 1}：${MODEL_FAILURE_TEXT[`${failureCheck.key}`]}`, changed: false };
    }
    const ops = pathOps(settingsPath, committedOriginal, next);
    let changed = false;
    if (ops.length > 0) {
      try {
        const written = await settingsMutate(view.ns, ops, expectedRevision);
        setCommittedOriginal(jsonGetPath(written.user, settingsPath));
        setExpectedRevision(written.revision);
        setDraft(next);
        changed = true;
        // 提供方设置落库即广播（2026-09-19 模型目录不刷新修复）：App 监听后
        // 重拉 session/modelCatalog，对话区选择器即时反映新增/删除的模型。
        window.dispatchEvent(new Event("magic:model-catalog-changed"));
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return {
          failure: message.includes("conflict")
            ? "这张卡片打开期间，这些设置已被其他地方改动。请关闭后重新打开，在当前值上编辑。"
            : message,
          changed: false,
        };
      }
    }
    if (keyValue.length > 0) {
      try {
        await credentialsSet(keyRef, keyValue);
        changed = true;
      } catch (cause: unknown) {
        return { failure: cause instanceof Error ? cause.message : String(cause), changed };
      }
    }
    setKeyDraft("");
    return { changed };
  };

  const apply = async (): Promise<void> => {
    setBusy(true);
    setFailure(undefined);
    try {
      const outcome = await applyOnce();
      if (outcome.failure !== undefined) {
        setFailure(outcome.failure);
        return;
      }
      props.onClose(outcome.changed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-xl bg-surface-container-low px-4 py-3.5">
      {props.hideTitle === true ? null : (
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] leading-[22px] font-medium text-on-surface">{props.displayName}</span>
          {props.provider !== props.displayName ? (
            <span className="text-[12px] leading-[18px] text-outline">{props.provider}</span>
          ) : null}
        </div>
      )}
      {layout === "unknown" ? (
        <p className={clsHint}>其余字段在 settings.yaml 中（{view.ns}），请直接编辑对应段。</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className={clsFieldLabel}>API 密钥</span>
            <input
              className={clsInput}
              type="password"
              autoComplete="off"
              value={keyDraft}
              placeholder={keyPlaceholder}
              aria-label="API 密钥"
              aria-invalid={keyFailure !== undefined}
              disabled={disabled || keyLocked}
              onChange={event => setKeyDraft(event.target.value)}
            />
            {keyFailure === undefined ? null : <p className={clsError}>{keyFailure}</p>}
          </div>
          <details className="group border-t-[0.5px] border-surface-container-highest/60 pt-2.5">
            <summary className="-ml-1 flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md p-0.5 text-[12px] leading-[18px] font-medium text-on-surface-variant [&::-webkit-details-marker]:hidden hover:text-on-surface">
              <span
                aria-hidden
                className="inline-block h-[5px] w-[5px] rotate-[-45deg] -translate-x-px -translate-y-px border-b-[1.5px] border-r-[1.5px] border-current transition-transform duration-100 group-open:rotate-45"
              />
              自定义设置
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              {layout === "pi-ai" && props.declared === true ? (
                <div className="flex flex-col gap-1.5">
                  <span className={clsFieldLabel}>显示名称</span>
                  <input
                    className={clsInput}
                    type="text"
                    value={stringAt(draft, "displayName") ?? ""}
                    placeholder={stringAt(jsonGetPath(view.base, settingsPath), "displayName") ?? provider}
                    aria-label="显示名称"
                    disabled={disabled}
                    onChange={event => setField("displayName", event.target.value)}
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <span className={clsFieldLabel}>API 地址</span>
                <input
                  className={clsInput}
                  type="text"
                  value={stringAt(draft, "baseURL") ?? ""}
                  placeholder={layout === "deepseek"
                    ? DEEPSEEK_PUBLIC_BASE_URL
                    : stringAt(fallback, "baseURL") ?? "提供方默认"}
                  aria-label="API 地址"
                  disabled={disabled}
                  onChange={event => setField("baseURL", event.target.value === "" ? undefined : event.target.value)}
                />
              </div>
              {layout === "pi-ai" && props.declared === true ? (
                <div className="flex flex-col gap-1.5">
                  <span className={clsFieldLabel}>API 协议</span>
                  <select
                    className={clsSelectInput}
                    value={probeApi ?? ""}
                    aria-label="API 协议"
                    disabled={disabled}
                    onChange={event => setField("api", event.target.value)}
                  >
                    {probeApi === undefined ? <option value="">未选择</option> : null}
                    {protocols.map(choice => <option key={choice} value={choice}>{choice}</option>)}
                  </select>
                </div>
              ) : null}
              <ModelCatalog
                models={catalogModels}
                overridden={modelsOverridden}
                disabled={disabled}
                defaults={{
                  ...(typeof defaultContextWindow === "number" ? { contextWindow: defaultContextWindow } : {}),
                  ...(typeof defaultMaxTokens === "number" ? { maxTokens: defaultMaxTokens } : {}),
                }}
                {...layout === "pi-ai"
                  ? {
                      fetch: {
                        askable: provider !== undefined || (probeBaseURL !== undefined && probeBaseURL.length > 0),
                        ...(keyFailure !== undefined ? { blocked: keyFailure } : {}),
                        onFetch: fetchModels,
                      },
                    }
                  : {}}
                onChange={next => setDraft(current => jsonSetPath(current, ["models"], next as JsonValue))}
                {...(modelsOverridden
                  ? { onReset: () => setDraft(current => jsonDeletePath(current, ["models"])) }
                  : {})}
              />
            </div>
          </details>
        </>
      )}
      {failure !== undefined ? <p className={clsError}>{failure}</p> : null}
      {layout !== "unknown" && modelFailure !== undefined ? (
        <p className={clsHint}>{`模型 ${modelFailure.index + 1}：${MODEL_FAILURE_TEXT[`${modelFailure.key}`]}`}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" className={clsSecondaryButton} disabled={busy} onClick={() => props.onClose(false)}>
          取消
        </button>
        <button
          type="button"
          className={clsPrimaryButton}
          disabled={disabled || layout === "unknown" || modelFailure !== undefined || keyFailure !== undefined}
          onClick={() => { void apply(); }}
        >
          {busy ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}

// ── 自定义提供方创建卡（CustomProviderCard.tsx 的完整语义）──

/** 手工声明 provider 写入的命名空间（CustomProviderCard.tsx:38）。 */
const PI_AI_NS = "llm-pi-ai";

/** 路由 id 必须可用作 settings 键和凭证名词干（CustomProviderCard.tsx:48）。 */
const ROUTE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export interface CustomProviderCardProps {
  /** 已被占用的路由 id，创建卡拒绝遮蔽其一。 */
  taken: readonly string[];
  /** llm-pi-ai 用户 section 的 revision（打开时刻），create 携带以防他处并发声明。 */
  revision: number;
  /** 适配器可服务的 wire 协议。 */
  protocols: readonly string[];
  readOnly: boolean;
  onClose: (changed: boolean) => void;
}

export function CustomProviderCard(props: CustomProviderCardProps): ReactNode {
  const { taken, protocols, readOnly } = props;
  const [openedAt] = useState(() => props.revision);
  const [route, setRoute] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [protocol, setProtocol] = useState(protocols[0] ?? "");
  const [keyDraft, setKeyDraft] = useState("");
  const [models, setModels] = useState<readonly ModelDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  /** profile 已落库：只剩密钥写可能未完成，字段随之只读、重试只重写凭证。 */
  const [committed, setCommitted] = useState(false);
  const disabled = readOnly || busy;
  const profileDisabled = disabled || committed;

  const routeInvalid = route.length > 0 && !ROUTE_PATTERN.test(route);
  const routeTaken = taken.includes(route);
  const normalizedBaseURL = baseURL.trim();
  const baseUrlInvalid = baseURL.length > 0 && !isHttpUrl(normalizedBaseURL);
  const modelFailure = modelFailureOf(models);
  const keyFailure = apiKeyFailure(keyDraft);
  const keyValue = keyDraft.trim();
  const storesKey = keyValue.length > 0;
  const probeBaseURL = normalizedBaseURL.length > 0 ? normalizedBaseURL : undefined;

  const fetchModels = async (): Promise<LlmDiscoveredModel[]> =>
    llmDiscoverModels(PI_AI_NS, {
      ...(probeBaseURL === undefined ? {} : { baseURL: probeBaseURL }),
      ...(protocol.length === 0 ? {} : { api: protocol }),
      ...(storesKey ? { apiKey: keyValue } : {}),
    });

  const createOnce = async (): Promise<string | undefined> => {
    const keyRef = deriveKeyRef(route);
    if (!committed) {
      const profile = {
        ...(displayName.length === 0 ? {} : { displayName }),
        // 与编辑卡一致：仅当本卡要存密钥时才记录 apiKeyEnv。
        ...(storesKey ? { apiKeyEnv: keyRef } : {}),
        api: protocol,
        baseURL: normalizedBaseURL,
        models: models.map(model => ({ ...model })) as JsonValue,
      };
      try {
        await settingsMutate(PI_AI_NS, [{ op: "set", path: ["providers", route], value: profile }], openedAt);
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return message.includes("conflict")
          ? "这张卡片打开期间，这些设置已被其他地方改动。请关闭后重新打开，在当前值上编辑。"
          : message;
      }
      // provider 已存在；密钥写失败重试时绝不能再跑这次 mutate（旧 revision 必冲突）。
      setCommitted(true);
    }
    if (storesKey) {
      try {
        await credentialsSet(deriveKeyRef(route), keyValue);
      } catch (cause: unknown) {
        return cause instanceof Error ? cause.message : String(cause);
      }
    }
    return undefined;
  };

  const create = async (): Promise<void> => {
    setBusy(true);
    setFailure(undefined);
    try {
      const outcome = await createOnce();
      if (outcome !== undefined) {
        setFailure(outcome);
        return;
      }
      props.onClose(true);
    } finally {
      setBusy(false);
    }
  };

  const ready = route.length > 0 && !routeInvalid && !routeTaken
    && normalizedBaseURL.length > 0 && !baseUrlInvalid && models.length > 0 && modelFailure === undefined
    && keyFailure === undefined;
  const hint = failure !== undefined || ready || keyFailure !== undefined
    || route.length === 0 || routeInvalid || routeTaken || baseUrlInvalid
    ? undefined
    : normalizedBaseURL.length === 0
      ? "自定义提供方需要填写 API 地址。"
      : modelFailure !== undefined
        ? `模型 ${modelFailure.index + 1}：${MODEL_FAILURE_TEXT[`${modelFailure.key}`]}`
        : "自定义提供方至少需要一个模型。";

  return (
    <div className="flex flex-col gap-3.5 rounded-xl bg-surface-container-low px-4 py-3.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[14px] leading-[22px] font-medium text-on-surface">自定义提供方</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>Provider ID</span>
        <input
          className={clsInput}
          type="text"
          value={route}
          placeholder="acme-gateway"
          aria-label="Provider ID"
          disabled={profileDisabled}
          onChange={event => setRoute(event.target.value)}
        />
      </div>
      {routeInvalid || routeTaken
        ? <p className={clsError}>{routeInvalid ? "需以小写字母开头，之后可用小写字母、数字和短横线。" : "已有提供方使用了这个 ID。"}</p>
        : <p className={clsHint}>以小写字母开头的标识，在请求中唯一标识该提供方，并用于派生凭据名。</p>}
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>显示名称</span>
        <input
          className={clsInput}
          type="text"
          value={displayName}
          placeholder={route.length === 0 ? "显示名称" : route}
          aria-label="显示名称"
          disabled={profileDisabled}
          onChange={event => setDisplayName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>API 地址</span>
        <input
          className={clsInput}
          type="text"
          value={baseURL}
          placeholder="https://gateway.example/v1"
          aria-label="API 地址"
          aria-invalid={baseUrlInvalid}
          disabled={profileDisabled}
          onChange={event => setBaseURL(event.target.value)}
        />
      </div>
      {baseUrlInvalid ? <p className={clsError}>请输入有效的 HTTP 或 HTTPS 地址。</p> : null}
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>API 协议</span>
        <select
          className={clsSelectInput}
          value={protocol}
          aria-label="API 协议"
          disabled={profileDisabled}
          onChange={event => setProtocol(event.target.value)}
        >
          {protocols.map(choice => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>API 密钥</span>
        <input
          className={clsInput}
          type="password"
          autoComplete="off"
          value={keyDraft}
          placeholder="输入 API 密钥，或留空使用环境认证"
          aria-label="API 密钥"
          aria-invalid={keyFailure !== undefined}
          disabled={disabled || committed}
          onChange={event => setKeyDraft(event.target.value)}
        />
        {keyFailure === undefined ? null : <p className={clsError}>{keyFailure}</p>}
      </div>
      <ModelCatalog
        models={models}
        disabled={profileDisabled}
        onChange={setModels}
        {...(probeBaseURL === undefined
          ? {}
          : { fetch: { askable: true, onFetch: fetchModels } })}
      />
      {failure !== undefined ? <p className={clsError}>{failure}</p> : null}
      {hint !== undefined ? <p className={clsHint}>{hint}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className={clsSecondaryButton} disabled={busy} onClick={() => props.onClose(false)}>
          取消
        </button>
        <button type="button" className={clsPrimaryButton} disabled={disabled || !ready} onClick={() => { void create(); }}>
          {busy ? "创建中…" : "创建提供方"}
        </button>
      </div>
    </div>
  );
}

// ── 2026-09-19 设计稿重排（ZCode 图一/图五/图六）：详情面板 + 添加模型弹窗 ──

/** 协议 id → 设计稿展示名（图四）。 */
export function protocolLabel(id: string): string {
  const map: Record<string, string> = {
    "anthropic-messages": "Anthropic Messages (/v1/messages)",
    "openai-completions": "Chat Completions (/chat/completions)",
    "openai-responses": "Responses (/responses)",
  };
  return map[id] ?? id;
}

/* 模型高级标注（图六：输入类型/模型能力/推理等级/推理参数映射）。
 * 官方 settings schema 只认 id/name/contextWindow/maxTokens，其余字段走客户端
 * localStorage（按 provider:model 键），诚实标注不混入 runtime profile。 */
interface ModelAdvanced {
  inputTypes: string[];
  capabilities: string[];
  reasoningLevels: string;
  reasoningMapping: string;
}

const ADV_KEY = "magic.models.modelAnnotations";

function readAdvanced(provider: string, id: string): ModelAdvanced {
  try {
    const raw = window.localStorage.getItem(ADV_KEY);
    const all = raw === null ? {} : (JSON.parse(raw) as Record<string, Partial<ModelAdvanced>>);
    const entry = all[`${provider}:${id}`] ?? {};
    return {
      inputTypes: entry.inputTypes ?? ["文本"],
      capabilities: entry.capabilities ?? [],
      reasoningLevels: entry.reasoningLevels ?? "",
      reasoningMapping: entry.reasoningMapping ?? "",
    };
  } catch {
    return { inputTypes: ["文本"], capabilities: [], reasoningLevels: "", reasoningMapping: "" };
  }
}

function writeAdvanced(provider: string, id: string, adv: ModelAdvanced): void {
  try {
    const raw = window.localStorage.getItem(ADV_KEY);
    const all = raw === null ? {} : (JSON.parse(raw) as Record<string, unknown>);
    all[`${provider}:${id}`] = adv;
    window.localStorage.setItem(ADV_KEY, JSON.stringify(all));
  } catch {
    // 存不进仅影响下次会话初始态
  }
}


/** 添加/编辑模型弹窗（图五/图六）：智能配置开 = 只填模型 ID；关 = 手动容量 + 高级标注。 */
export function ModelEditModal(props: {
  provider: string;
  initial: ModelDraft | undefined;
  onCancel: () => void;
  onSave: (model: ModelDraft) => void;
}): ReactNode {
  const hasCapacity = props.initial?.["contextWindow"] !== undefined
    || props.initial?.["maxTokens"] !== undefined;
  const [smart, setSmart] = useState(props.initial === undefined && !hasCapacity);
  const initialId = typeof props.initial?.["id"] === "string" ? (props.initial["id"] as string) : "";
  const [idText, setIdText] = useState(initialId);
  const [ctxText, setCtxText] = useState(
    typeof props.initial?.["contextWindow"] === "number" ? formatCapacity(props.initial["contextWindow"] as number) : "",
  );
  const [maxText, setMaxText] = useState(
    typeof props.initial?.["maxTokens"] === "number" ? formatCapacity(props.initial["maxTokens"] as number) : "",
  );
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState<ModelAdvanced>(() => readAdvanced(props.provider, initialId));
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const submit = (): void => {
    const id = idText.trim();
    if (id.length === 0) {
      setFailure("模型 ID 不能为空。");
      return;
    }
    const contextWindow = parseCapacity(ctxText);
    if (Number.isNaN(contextWindow)) {
      setFailure(MODEL_FAILURE_TEXT.modelContextInvalid);
      return;
    }
    const maxTokens = parseCapacity(maxText);
    if (Number.isNaN(maxTokens)) {
      setFailure(MODEL_FAILURE_TEXT.modelMaxTokensInvalid);
      return;
    }
    writeAdvanced(props.provider, id, adv);
    props.onSave({
      ...(props.initial !== undefined && typeof props.initial["name"] === "string"
        ? { name: props.initial["name"] as string }
        : {}),
      id,
      ...(smart || contextWindow === undefined ? {} : { contextWindow }),
      ...(smart || maxTokens === undefined ? {} : { maxTokens }),
    });
  };

  const reset = (): void => {
    setIdText(initialId);
    setCtxText(
      typeof props.initial?.["contextWindow"] === "number" ? formatCapacity(props.initial["contextWindow"] as number) : "",
    );
    setMaxText(
      typeof props.initial?.["maxTokens"] === "number" ? formatCapacity(props.initial["maxTokens"] as number) : "",
    );
    setAdv(readAdvanced(props.provider, initialId));
    setFailure(undefined);
  };

  const capacityField = (field: "contextWindow" | "maxTokens"): ReactNode => {
    const isCtx = field === "contextWindow";
    const value = isCtx ? ctxText : maxText;
    const setter = isCtx ? setCtxText : setMaxText;
    return (
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>
          {isCtx ? "上下文窗口" : "最大输出 Token"}
          <span title={isCtx ? "如 256K、1M" : "如 32K"} className="cursor-help text-[12px] text-outline">?</span>
        </span>
        <input
          className={clsInput}
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={isCtx ? "256K" : "32K"}
          aria-label={isCtx ? "上下文窗口" : "最大输出 Token"}
          onChange={event => setter(event.target.value)}
        />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => props.onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.initial === undefined ? "添加模型" : "编辑模型"}
        className="flex max-h-[86vh] w-[min(600px,100%)] flex-col overflow-hidden rounded-2xl bg-surface-container-low shadow-overlay"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-[15px] font-medium text-on-surface">
            {props.initial === undefined ? "添加模型" : "编辑模型"}
          </span>
          <button type="button" className={clsIconButton} aria-label="关闭" onClick={props.onCancel}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          <div className="flex items-center gap-2 py-3">
            <span className={clsFieldLabel}>智能配置</span>
            <span
              title="当前版本：开启后只需填写模型 ID，容量由提供方默认值接管；关闭后可手动填写容量与高级标注。"
              className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-outline text-[10px] leading-none text-outline"
            >?</span>
            <ToggleSwitch checked={smart} onChange={setSmart} />
          </div>
          {smart ? (
            <p className={clsHint}>开启智能配置时只需填写模型 ID；容量与高级标注按提供方默认处理。</p>
          ) : null}
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <span className={clsFieldLabel}>模型 ID</span>
              <input
                className={clsInput}
                type="text"
                value={idText}
                placeholder="模型 ID"
                aria-label="模型 ID"
                onChange={event => setIdText(event.target.value)}
              />
            </div>
            {!smart ? (
              <>
                {capacityField("contextWindow")}
                {capacityField("maxTokens")}
                <div>
                  <button
                    type="button"
                    className="-ml-1 flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md p-0.5 text-[12px] leading-[18px] font-medium text-on-surface-variant hover:text-on-surface"
                    aria-expanded={advOpen}
                    onClick={() => setAdvOpen(value => !value)}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-[5px] w-[5px] border-b-[1.5px] border-r-[1.5px] border-current transition-transform duration-100 ${advOpen ? "rotate-45 translate-y-px" : "rotate-[-45deg] -translate-y-px"}`}
                    />
                    高级配置
                  </button>
                  {advOpen ? (
                    <div className="flex flex-col gap-3 pt-3">
                      <p className={clsHint}>高级标注保存在本客户端（官方 settings 暂不存储这些字段）。</p>
                      <div className="flex flex-col gap-1.5">
                        <span className={clsFieldLabel}>输入类型</span>
                        <div className="flex flex-wrap gap-2">
                          {(["文本", "图片", "视频", "PDF"] as const).map(kind => {
                            const locked = kind === "文本";
                            const checked = locked || adv.inputTypes.includes(kind);
                            return (
                              <button
                                key={kind}
                                type="button"
                                disabled={locked}
                                aria-pressed={checked}
                                onClick={() => setAdv(current => ({
                                  ...current,
                                  inputTypes: checked && !locked
                                    ? current.inputTypes.filter(item => item !== kind)
                                    : [...new Set([...current.inputTypes, kind])],
                                }))}
                                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors ${
                                  checked
                                    ? "border-primary bg-primary-container/30 text-on-surface"
                                    : "border-surface-container-highest text-on-surface-variant hover:bg-surface-container-low"
                                } ${locked ? "cursor-default opacity-70" : "cursor-pointer"}`}
                              >
                                {checked ? "✓" : ""} {kind}
                                {locked ? <span className="text-[11px] text-outline">锁</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className={clsFieldLabel}>模型能力</span>
                        <div className="flex flex-wrap gap-2">
                          {(["结构化输出", "原生联网搜索", "对话中系统消息"] as const).map(kind => {
                            const checked = adv.capabilities.includes(kind);
                            return (
                              <button
                                key={kind}
                                type="button"
                                aria-pressed={checked}
                                onClick={() => setAdv(current => ({
                                  ...current,
                                  capabilities: checked
                                    ? current.capabilities.filter(item => item !== kind)
                                    : [...current.capabilities, kind],
                                }))}
                                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors ${
                                  checked
                                    ? "border-primary bg-primary-container/30 text-on-surface"
                                    : "border-surface-container-highest text-on-surface-variant hover:bg-surface-container-low"
                                }`}
                              >
                                {checked ? "✓" : ""} {kind}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className={clsFieldLabel}>推理等级（从低到高）</span>
                        <input
                          className={clsInput}
                          type="text"
                          value={adv.reasoningLevels}
                          placeholder="如 minimal, medium, high"
                          aria-label="推理等级"
                          onChange={event => setAdv(current => ({ ...current, reasoningLevels: event.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className={clsFieldLabel}>推理参数映射</span>
                        <textarea
                          className={`${clsInput} h-20 resize-none py-2`}
                          value={adv.reasoningMapping}
                          placeholder={'JSON 映射，如 {"medium": {"reasoning_effort": "medium"}}'}
                          aria-label="推理参数映射"
                          onChange={event => setAdv(current => ({ ...current, reasoningMapping: event.target.value }))}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          {failure === undefined ? null : <p className={clsError}>{failure}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <button
            type="button"
            className="cursor-pointer border-b border-outline text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
            onClick={reset}
          >
            重置表单
          </button>
          <div className="flex gap-2">
            <button type="button" className={clsSecondaryButton} onClick={props.onCancel}>取消</button>
            <button type="button" className={clsPrimaryButton} onClick={submit}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 提供方详情面板（图一右栏）：Base URL / API 格式 / API Key / 模型列表，保存语义与 ProviderEditorCard 相同。 */
export function ProviderDetailPanel(props: {
  provider: string;
  displayName: string;
  namespace: SettingsNamespaceView;
  settingsPath: readonly string[];
  declared?: boolean;
  readOnly: boolean;
  onSaved: () => void;
}): ReactNode {
  const { namespace: view, settingsPath, provider, readOnly } = props;
  const [draft, setDraft] = useState<JsonMap>(() => draftAt(view, settingsPath));
  const [keyDraft, setKeyDraft] = useState("");
  const [keyState, setKeyState] = useState<CredentialInfo | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [committedOriginal, setCommittedOriginal] = useState<unknown>(() => jsonGetPath(view.user, settingsPath));
  const [expectedRevision, setExpectedRevision] = useState(() => view.revision);
  const [keyVisible, setKeyVisible] = useState(false);
  // 模型弹窗：undefined=关；index=编辑第 index 行；-1=新增
  const [modalIndex, setModalIndex] = useState<number | undefined>(undefined);
  const [disabledModels, setDisabledModels] = useState<ReadonlySet<string>>(readDisabledModels);

  const layout = layoutOf(view.ns);
  const fallback = jsonGetPath(view.value, settingsPath);
  const disabled = readOnly || busy;
  const keyRef = refFor(view, settingsPath, provider);
  const protocols = useMemo(() => (layout === "pi-ai" ? protocolChoices(view) : []), [layout, view]);

  useEffect(() => {
    let stale = false;
    setKeyState(undefined);
    credentialsDescribe([keyRef])
      .then(value => { if (!stale) setKeyState(value[keyRef]); })
      .catch(() => { if (!stale) setKeyState(undefined); });
    return () => { stale = true; };
  }, [keyRef]);

  const stringAt = (source: unknown, key: string): string | undefined => {
    const value = jsonGetPath(source, [key]);
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };
  const setField = (key: string, next: string | undefined): void => {
    const value = next === undefined || next.trim().length === 0 ? undefined : next;
    setDraft(current => (value === undefined ? jsonDeletePath(current, [key]) : jsonSetPath(current, [key], value)));
  };

  const modelFailure = modelFailureOf(jsonGetPath(draft, ["models"]));
  const keyFailure = apiKeyFailure(keyDraft);
  const keyValue = keyDraft.trim();

  const probeApi = stringAt(draft, "api") ?? stringAt(fallback, "api");
  const probeBaseURL = stringAt(draft, "baseURL") ?? stringAt(fallback, "baseURL");
  const fetchModels = async (): Promise<LlmDiscoveredModel[]> =>
    llmDiscoverModels(view.ns, {
      provider,
      ...(probeBaseURL === undefined ? {} : { baseURL: probeBaseURL }),
      ...(probeApi === undefined ? {} : { api: probeApi }),
      ...(keyValue.length === 0 ? {} : { apiKey: keyValue }),
    });

  const modelsOverridden = jsonHasPath(draft, ["models"]);
  const catalogModels: readonly ModelDraft[] = modelsOverridden
    ? (Array.isArray(jsonGetPath(draft, ["models"])) ? (jsonGetPath(draft, ["models"]) as ModelDraft[]) : [])
    : inheritedModels(view, settingsPath);
  const keyLocked = keyState?.writable === false;
  const keyPlaceholder = keyLocked
    ? "由启动环境提供（只读）"
    : keyState?.configured === true
      ? "已配置——输入新值可替换"
      : layout === "pi-ai" ? "输入 API 密钥，或留空使用环境认证" : "输入 API 密钥";

  const apply = async (): Promise<void> => {
    setBusy(true);
    setFailure(undefined);
    try {
      const next = layout === "pi-ai" && stringAt(draft, "apiKeyEnv") === undefined
        && stringAt(fallback, "apiKeyEnv") === undefined && keyValue.length > 0
        ? jsonSetPath(draft, ["apiKeyEnv"], keyRef)
        : draft;
      const failureCheck = modelFailureOf(jsonGetPath(next, ["models"]));
      if (failureCheck !== undefined) {
        setFailure(`模型 ${failureCheck.index + 1}：${MODEL_FAILURE_TEXT[`${failureCheck.key}`]}`);
        return;
      }
      const ops = pathOps(settingsPath, committedOriginal, next);
      let changed = false;
      if (ops.length > 0) {
        try {
          const written = await settingsMutate(view.ns, ops, expectedRevision);
          setCommittedOriginal(jsonGetPath(written.user, settingsPath));
          setExpectedRevision(written.revision);
          setDraft(next);
          changed = true;
          // 同上（2026-09-19 模型目录不刷新修复）：详情面板保存路径同样广播。
          window.dispatchEvent(new Event("magic:model-catalog-changed"));
        } catch (cause: unknown) {
          const message = cause instanceof Error ? cause.message : String(cause);
          setFailure(message.includes("conflict")
            ? "这些设置已被其他地方改动，请重试保存。"
            : message);
          return;
        }
      }
      if (keyValue.length > 0) {
        try {
          await credentialsSet(keyRef, keyValue);
          changed = true;
        } catch (cause: unknown) {
          setFailure(cause instanceof Error ? cause.message : String(cause));
          return;
        }
      }
      setKeyDraft("");
      if (changed) props.onSaved();
    } finally {
      setBusy(false);
    }
  };

  const commitModels = (models: readonly ModelDraft[]): void => {
    setDraft(current => jsonSetPath(current, ["models"], models as JsonValue));
  };
  const saveModel = (model: ModelDraft): void => {
    if (modalIndex === undefined || modalIndex < 0) {
      commitModels([...catalogModels, model]);
    } else {
      commitModels(catalogModels.map((item, at) => (at === modalIndex ? model : item)));
    }
    setModalIndex(undefined);
  };

  const toggleDisabledModel = (key: string, next: boolean): void => {
    setDisabledModels(previous => {
      const nextSet = new Set(previous);
      if (next) nextSet.delete(key);
      else nextSet.add(key);
      writeDisabledModels(nextSet);
      return nextSet;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {layout === "pi-ai" && props.declared === true ? (
        <div className="flex flex-col gap-1.5">
          <span className={clsFieldLabel}>Base URL</span>
          <input
            className={clsInput}
            type="text"
            value={stringAt(draft, "baseURL") ?? ""}
            placeholder={stringAt(fallback, "baseURL") ?? "https://api.example.com/v1"}
            aria-label="Base URL"
            disabled={disabled}
            onChange={event => setField("baseURL", event.target.value === "" ? undefined : event.target.value)}
          />
        </div>
      ) : null}
      {layout === "pi-ai" && props.declared === true ? (
        <div className="flex flex-col gap-1.5">
          <span className={clsFieldLabel}>API 格式</span>
          <select
            className={`${clsInput} cursor-pointer appearance-none bg-no-repeat pr-8 bg-[length:12px_12px] bg-[right_12px_center] bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='12'%20viewBox='0%200%2012%2012'%20fill='none'%3E%3Cpath%20d='M3%204.5L6%207.5L9%204.5'%20stroke='%2381858C'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E")]`}
            value={probeApi ?? ""}
            aria-label="API 格式"
            disabled={disabled}
            onChange={event => setField("api", event.target.value)}
          >
            {probeApi === undefined ? <option value="">未选择</option> : null}
            {protocols.map(choice => <option key={choice} value={choice}>{protocolLabel(choice)}</option>)}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className={clsFieldLabel}>API Key</span>
        <div className="relative">
          <input
            className={`${clsInput} pr-9`}
            type={keyVisible ? "text" : "password"}
            autoComplete="off"
            value={keyDraft}
            placeholder={keyPlaceholder}
            aria-label="API Key"
            aria-invalid={keyFailure !== undefined}
            disabled={disabled || keyLocked}
            onChange={event => setKeyDraft(event.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
            title={keyVisible ? "隐藏" : "显示新输入的值（已存密钥不可读）"}
            aria-label={keyVisible ? "隐藏 API Key" : "显示 API Key"}
            onClick={() => setKeyVisible(value => !value)}
          >
            <span className="material-symbols-outlined text-[16px]">{keyVisible ? "visibility_off" : "visibility"}</span>
          </button>
        </div>
        {keyFailure === undefined ? null : <p className={clsError}>{keyFailure}</p>}
      </div>

      {/* 模型列表（图一） */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className={clsFieldLabel}>模型列表</span>
          <div className="flex items-center gap-1">
            {modelsOverridden === true ? (
              <button
                type="button"
                className={clsLinkButton}
                disabled={disabled}
                onClick={() => setDraft(current => jsonDeletePath(current, ["models"]))}
              >
                恢复默认模型
              </button>
            ) : null}
            {layout === "pi-ai" ? (
              <button
                type="button"
                className={clsLinkButton}
                disabled={disabled || !fetchModels}
                title="向提供方询问可用模型列表"
                onClick={() => {
                  void fetchModels().then(found => {
                    if (found.length === 0) {
                      setFailure("该提供方没有列出任何模型，请手动添加。");
                      return;
                    }
                    const byId = new Map<string, ModelDraft>();
                    for (const model of catalogModels) {
                      const id = model["id"];
                      if (typeof id === "string" && id.length > 0) byId.set(id, model);
                    }
                    for (const candidate of found) {
                      if (!byId.has(candidate.id)) {
                        byId.set(candidate.id, {
                          id: candidate.id,
                          ...(candidate.name === undefined ? {} : { name: candidate.name }),
                          ...(candidate.contextWindow === undefined ? {} : { contextWindow: candidate.contextWindow }),
                          ...(candidate.maxTokens === undefined ? {} : { maxTokens: candidate.maxTokens }),
                        });
                      }
                    }
                    commitModels([...byId.values()]);
                  }).catch((cause: unknown) => {
                    setFailure(cause instanceof Error ? cause.message : String(cause));
                  });
                }}
              >
                获取可用模型
              </button>
            ) : null}
            <button
              type="button"
              data-model-add=""
              className="flex h-7 cursor-pointer items-center gap-1 rounded-full border-[0.5px] border-surface-container-highest px-2.5 text-[12px] leading-[18px] text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
              disabled={disabled}
              onClick={() => setModalIndex(-1)}
            >
              <span aria-hidden className="text-[14px] leading-none">+</span>
              添加模型
            </button>
          </div>
        </div>
        {catalogModels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-container-highest px-4 py-4 text-center text-[12.5px] leading-relaxed text-outline">
            当前没有配置模型，添加模型后可在聊天中使用。
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border-[0.5px] border-surface-container-high">
            {catalogModels.map((model, index) => {
              const id = typeof model["id"] === "string" ? model["id"] : "";
              const disableKey = `${provider}:${id}`;
              const ctx = typeof model["contextWindow"] === "number" ? formatCapacity(model["contextWindow"] as number) : undefined;
              return (
                <div
                  key={`${id}-${index}`}
                  className={`flex items-center gap-2.5 border-surface-container-high/50 px-3 py-2 ${
                    index < catalogModels.length - 1 ? "border-b" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-on-surface">
                    {id.length > 0 ? id : "（未命名模型）"}
                  </span>
                  {ctx === undefined ? null : (
                    <span className="shrink-0 rounded border-[0.5px] border-surface-container-highest px-1.5 py-px text-[10.5px] leading-4 text-on-surface-variant">
                      {ctx}
                    </span>
                  )}
                  <button
                    type="button"
                    className={clsIconButton}
                    aria-label={`编辑模型 ${id}`}
                    title="编辑"
                    disabled={disabled}
                    onClick={() => setModalIndex(index)}
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button
                    type="button"
                    className={`${clsIconButton} hover:!text-error`}
                    aria-label={`删除模型 ${id}`}
                    title="删除"
                    disabled={disabled}
                    onClick={() => commitModels(catalogModels.filter((_item, at) => at !== index))}
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                  <ToggleSwitch
                    checked={!disabledModels.has(disableKey)}
                    title={disabledModels.has(disableKey) ? `已停用 ${id}（客户端偏好）` : `启用中 ${id}`}
                    onChange={next => toggleDisabledModel(disableKey, next)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {modelsOverridden === false && catalogModels.length > 0 ? (
          <p className={clsHint}>正在使用适配器默认模型——改动并保存后将整体接管模型列表。</p>
        ) : null}
      </div>

      {failure !== undefined ? <p className={clsError}>{failure}</p> : null}
      {layout !== "unknown" && modelFailure !== undefined ? (
        <p className={clsHint}>{`模型 ${modelFailure.index + 1}：${MODEL_FAILURE_TEXT[`${modelFailure.key}`]}`}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={clsSecondaryButton}
          disabled={busy}
          onClick={() => {
            setDraft(draftAt(view, settingsPath));
            setKeyDraft("");
          }}
        >
          取消
        </button>
        <button
          type="button"
          className={clsPrimaryButton}
          disabled={disabled || layout === "unknown" || modelFailure !== undefined || keyFailure !== undefined}
          onClick={() => { void apply(); }}
        >
          {busy ? "保存中…" : "保存"}
        </button>
      </div>
      {modalIndex === undefined ? null : (
        <ModelEditModal
          provider={provider}
          initial={modalIndex >= 0 ? catalogModels[modalIndex] : undefined}
          onCancel={() => setModalIndex(undefined)}
          onSave={saveModel}
        />
      )}
    </div>
  );
}
