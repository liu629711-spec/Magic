// 模型设置 section：官方 DSH 形态的 provider 卡列表 + 内嵌编辑卡（2026-09-18 重做）。
// 数据与写通道全部走官方 Remote wire（models-wire.ts，3099 实测通过）：
// - 行目录 = llm/listProviders join llm/listConfigurableProviders（官方 store.ts:42-68,183-243）
// - 凭证徽标 = credentials/describe 批量（≤64 refs，只回 configured/writable，不回值）
// - 保存 = settings/mutate（path ops + expectedRevision 乐观并发）+ credentials/set
// - 删除 = credentials/unset + settings/mutate unset op（官方 ModelsSection.tsx:113-130）
// 官方通道不可用时回退：session/modelCatalog 只读分组展示并注明。
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { dshRpc } from "../adapters/dsh-web/rpc";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { ProviderIcon } from "../components/ProviderIcon";
import { ProviderDetailPanel, CustomProviderCard } from "./models-editor";
import { readDisabledProviders, writeDisabledProviders } from "./model-prefs";
import {
  credentialsDescribe,
  credentialsUnset,
  deriveKeyRef,
  joinProviderDirectory,
  jsonGetPath,
  jsonHasPath,
  llmListConfigurableProviders,
  llmListProviders,
  protocolChoices,
  settingsDescribe,
  settingsMutate,
  type CredentialInfo,
  type ProviderDirectoryEntry,
  type SettingsNamespaceView,
} from "./models-wire";

/** 一行渲染数据（官方 store.ts:71-89）。 */
interface ProviderRow {
  entry: ProviderDirectoryEntry;
  configured: boolean;
  removable: boolean;
  apiKeyEnv: string | undefined;
  credential?: CredentialInfo;
  derivedCredential?: CredentialInfo;
}

/** 编辑动作寻址的 provider（官方 ModelsSection.tsx:72-79）。 */
interface EditorTarget {
  provider: string;
  displayName: string;
  settingsNs: string;
  settingsPath: readonly string[];
  /** 本页管理的凭证引用（删除时一并 unset）。 */
  credentialRef?: string;
  declared?: boolean;
}

function targetOf(row: ProviderRow): EditorTarget {
  const managedRef = deriveKeyRef(row.entry.provider);
  const credentialRef = row.apiKeyEnv === managedRef
    && row.credential?.configured === true
    && row.credential.writable
    ? managedRef
    : undefined;
  return {
    provider: row.entry.provider,
    displayName: row.entry.displayName,
    settingsNs: row.entry.settingsNs,
    settingsPath: row.entry.settingsPath,
    ...(credentialRef === undefined ? {} : { credentialRef }),
    ...(row.entry.declared === true ? { declared: true } : {}),
  };
}

function providerTargetLabel(target: { provider: string; displayName: string }): string {
  return target.provider === target.displayName ? target.provider : `${target.displayName} (${target.provider})`;
}

// 「添加供应商」精选目录（2026-09-19 用户裁定，按 ZCode 图二组织）。
// entry.provider = DSH 目录真实适配器 id；点击时若该 id 已配置则直达其配置，
// 否则进入未配置编辑卡；custom = 创建自定义供应商卡。
const GALLERY_ENTRIES: { label: string; provider: string }[] = [
  { label: "创建自定义供应商", provider: "custom" },
  { label: "Z.ai Coding Plan", provider: "zai-coding-cn" },
  { label: "Z.ai API", provider: "zai" },
  { label: "Kimi", provider: "kimi-coding" },
  { label: "MiniMax", provider: "minimax" },
  { label: "DeepSeek", provider: "deepseek" },
  { label: "阿里云百炼（中国）", provider: "qwen-token-plan-cn" },
  { label: "阿里云百炼（国际）", provider: "qwen-token-plan" },
  { label: "Xiaomi MiMo", provider: "xiaomi" },
  { label: "OpenAI", provider: "openai" },
  { label: "Anthropic", provider: "anthropic" },
  { label: "xAI", provider: "xai" },
  { label: "OpenRouter", provider: "openrouter" },
  { label: "OpenCode Go (Chat)", provider: "opencode-go" },
];

// ── 视觉常量 ──
const clsRowCard =
  "flex flex-col gap-3 rounded-2xl border-[0.5px] border-surface-container-high px-3.5 py-3";
const clsRowButton =
  "box-border inline-flex h-7 items-center justify-center rounded-[14px] px-2.5 text-[12px] leading-[18px] transition-colors focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";
const clsDangerButton = `${clsRowButton} text-error hover:bg-error/10`;



/** 删除确认浮层（官方 Modal 语义的轻量实现）。 */
function ConfirmDialog({ target, busy, failure, onCancel, onConfirm }: {
  target: EditorTarget;
  busy: boolean;
  failure: string | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactNode {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`删除 ${providerTargetLabel(target)}？`}
        className="w-[min(480px,100%)] rounded-2xl bg-surface-container-lowest p-5 shadow-overlay"
        onClick={event => event.stopPropagation()}
      >
        <div className="text-[16px] leading-6 font-medium text-on-surface">{`删除 ${providerTargetLabel(target)}？`}</div>
        <p className="mt-2 text-[13px] leading-5 text-on-surface-variant">
          {target.credentialRef === undefined
            ? `删除 ${providerTargetLabel(target)} 会移除其配置；其使用的凭证（如有）由其他位置管理，将会保留。`
            : `删除 ${providerTargetLabel(target)} 会移除其配置和存储的 API 密钥。`}
        </p>
        {failure === undefined ? null : <p className="mt-2 text-[12px] leading-[18px] text-error">{failure}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="box-border inline-flex h-9 items-center rounded-full border-[0.5px] border-surface-container-high px-3.5 text-[14px] leading-[22px] text-on-surface hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-default"
            disabled={busy}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="box-border inline-flex h-9 items-center rounded-full border-[0.5px] border-error px-3.5 text-[14px] leading-[22px] text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-default"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "正在删除…" : `删除 ${providerTargetLabel(target)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 官方通道不可用时的回退只读视图 ──

interface ModelCatalogModel { id: string; name: string; description?: string }
interface ModelProviderGroup { id: string; name: string; models: ModelCatalogModel[] }
interface ModelCatalog {
  default: { provider: string; model: string };
  groups: ModelProviderGroup[];
}

function CatalogFallback({ cause }: { cause: string }): ReactNode {
  const [catalog, setCatalog] = useState<ModelCatalog | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    dshRpc<ModelCatalog>("session/modelCatalog", {})
      .then(setCatalog)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[12px] leading-[18px] text-orange">
        官方模型读写通道不可用（{cause}）；以下为当前会话模型目录的只读展示。
        会话内切换模型仍在输入栏的模型选择器进行。
      </p>
      {error.length > 0 ? (
        <p className="m-0 text-[12px] leading-[18px] text-error">模型目录加载失败：{error}</p>
      ) : catalog === undefined ? (
        <div className="flex h-14 items-center justify-center rounded-2xl border-[0.5px] border-dashed border-surface-container-high text-[12.5px] text-outline">
          正在加载模型目录…
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {catalog.groups.map(group => (
            <li key={group.id} className={clsRowCard}>
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] leading-[22px] font-medium text-on-surface">{group.name}</span>
                <span className="text-[11px] text-outline">{group.models.length} 个模型</span>
              </div>
              <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 md:grid-cols-2">
                {group.models.map(model => (
                  <div key={model.id} className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-[12.5px] text-on-surface">{model.name}</span>
                    <span className="truncate text-[11px] text-outline">{model.id}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── section 主体 ──

interface LoadedState {
  rows: ProviderRow[];
  namespaces: Map<string, SettingsNamespaceView>;
  writable: boolean;
  credentialError: string | null;
}

export function ModelsSection(): ReactNode {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [state, setState] = useState<LoadedState | undefined>(undefined);
  // 主从布局（2026-09-19，ZCode 图一形态）：左列提供方清单，右栏详情编辑卡。
  // 启用/停用开关为客户端偏好（localStorage），runtime 暂无提供方停用通道。
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [declaring, setDeclaring] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [notice, setNotice] = useState("");
  const [disabledProviders, setDisabledProviders] = useState<ReadonlySet<string>>(readDisabledProviders);
  const [savedProvider, setSavedProvider] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EditorTarget | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<string | undefined>(undefined);

  const reload = useCallback(async (): Promise<void> => {
    const [registered, directory, describe] = await Promise.all([
      llmListProviders(),
      llmListConfigurableProviders(),
      settingsDescribe(),
    ]);
    const namespaces = new Map(describe.namespaces.map(view => [view.ns, view]));
    const joined = joinProviderDirectory(registered, directory);
    const rows: ProviderRow[] = joined.map(entry => {
      const namespace = namespaces.get(entry.settingsNs);
      const configured = namespace !== undefined
        && (entry.settingsPath.length === 0 || jsonGetPath(namespace.value, entry.settingsPath) !== undefined);
      const removable = namespace !== undefined
        && entry.settingsPath.length > 0
        && jsonHasPath(namespace.user, entry.settingsPath)
        && !jsonHasPath(namespace.base, entry.settingsPath);
      const profile = jsonGetPath(namespace?.value, entry.settingsPath);
      const namedRef = typeof profile === "object" && profile !== null && !Array.isArray(profile)
        ? (profile as Record<string, unknown>)["apiKeyEnv"]
        : undefined;
      return {
        entry,
        configured,
        removable,
        apiKeyEnv: typeof namedRef === "string" && namedRef.length > 0 ? namedRef : undefined,
      };
    });
    const refs = [...new Set(rows.map(row => row.apiKeyEnv ?? deriveKeyRef(row.entry.provider)))];
    let credentials: Record<string, CredentialInfo> = {};
    let credentialError: string | null = null;
    if (refs.length > 0) {
      try {
        credentials = await credentialsDescribe(refs);
      } catch (cause: unknown) {
        // 凭证状态只是行卡的徽标增强：失败降级为徽标缺席，不阻塞页面。
        credentialError = cause instanceof Error ? cause.message : String(cause);
      }
    }
    setState({
      rows: rows.map(row => {
        const named = row.apiKeyEnv === undefined ? undefined : credentials[row.apiKeyEnv];
        const derived = row.apiKeyEnv !== undefined ? undefined : credentials[deriveKeyRef(row.entry.provider)];
        return {
          ...row,
          ...(named === undefined ? {} : { credential: named }),
          ...(derived === undefined ? {} : { derivedCredential: derived }),
        };
      }),
      namespaces,
      writable: describe.writable,
      credentialError,
    });
    setStatus("ready");
  }, []);

  useEffect(() => {
    reload()
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [reload]);

  const announceSaved = (target: EditorTarget): void => {
    setSavedProvider(target.displayName);
    void reload().catch(() => undefined);
  };

  // 选中回退：选中行被删除（不在 rows）时选第一个已接入行（自定义或已配置内置）；
  // 未配置的目录项被选中时（添加流程）必须保留，不能被重置。
  useEffect(() => {
    if (state === undefined) return;
    if (state.rows.some(row => row.entry.provider === selected)) return;
    const visible = state.rows.filter(row => row.entry.declared === true || row.configured);
    setSelected(visible[0]?.entry.provider);
  }, [state, selected]);

  const confirmDelete = (): void => {
    if (deleteTarget === undefined || deleting) return;
    setDeleting(true);
    setDeleteFailure(undefined);
    const target = deleteTarget;
    // 先删凭证（可重试的行卡仍在），再删 profile（官方 ModelsSection.tsx:113-130）。
    const run = async (): Promise<string | undefined> => {
      if (target.credentialRef !== undefined) {
        try {
          await credentialsUnset(target.credentialRef);
        } catch (cause: unknown) {
          return cause instanceof Error ? cause.message : String(cause);
        }
      }
      try {
        await settingsMutate(target.settingsNs, [{ op: "unset", path: [...target.settingsPath] }]);
      } catch (cause: unknown) {
        return cause instanceof Error ? cause.message : String(cause);
      }
      await reload();
      return undefined;
    };
    run()
      .then(failure => {
        if (failure !== undefined) {
          setDeleteFailure(failure);
          return;
        }
        setDeleteTarget(undefined);
      })
      .finally(() => setDeleting(false));
  };

  if (status === "error") {
    return <CatalogFallback cause={error} />;
  }
  if (state === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-5 w-24 animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-container" />
        {[0, 1].map(index => (
          <div key={index} className="h-[54px] animate-pulse rounded-2xl border-[0.5px] border-surface-container-high bg-surface-container" />
        ))}
      </div>
    );
  }

  const { rows, namespaces, writable } = state;
  const configurable = rows.filter(row => namespaces.has(row.entry.settingsNs));
  const addable = configurable.filter(row => !row.configured);
  const protocols = protocolChoices(namespaces.get("llm-pi-ai"));
  const piAiRevision = namespaces.get("llm-pi-ai")?.revision ?? 0;
  const selectedRow = rows.find(row => row.entry.provider === selected);
  const selectedTarget = selectedRow === undefined ? undefined : targetOf(selectedRow);
  const selectedNamespace = selectedRow === undefined || selectedTarget === undefined
    ? undefined
    : namespaces.get(selectedTarget.settingsNs);
  // 左列只显示已接入的：自定义提供方 + 已完成配置的内置（DeepSeek 配置后落此组）。
  const builtInRows = rows.filter(row => row.entry.declared !== true && row.configured);
  const declaredRows = rows.filter(row => row.entry.declared === true);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 text-[22px] leading-7 font-semibold tracking-tight text-on-surface">模型设置</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-outline">
            管理自定义模型供应商，配置后可在聊天时选择使用。会话中切换模型在输入栏的模型选择器进行；
            各代理的默认模型是其自身配置，不在此页设置。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            title="重新加载提供方清单"
            aria-label="刷新提供方清单"
            onClick={() => { void reload().catch(() => undefined); }}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
          </button>
          <button
            type="button"
            data-model-add-provider=""
            disabled={!writable}
            onClick={() => {
              setSavedProvider(undefined);
              setNotice("");
              setDeclaring(false);
              setGallery(true);
            }}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <span aria-hidden className="text-[16px] leading-none">+</span>
            添加供应商
          </button>
        </div>
      </div>
      {!writable ? <p className="m-0 text-[12px] leading-[18px] text-orange">当前部署的设置文档为只读。</p> : null}
      {state.credentialError !== null ? (
        <p className="m-0 text-[12px] leading-[18px] text-orange">凭证状态读取失败：{state.credentialError}</p>
      ) : null}
      {savedProvider === undefined ? null : (
        <p role="status" aria-live="polite" className="m-0 text-[12px] leading-[18px] text-tertiary">
          {`已保存 ${savedProvider}。`}
        </p>
      )}
      {notice.length === 0 ? null : (
        <p role="status" aria-live="polite" className="m-0 text-[12px] leading-[18px] text-outline">{notice}</p>
      )}

      {/* 主从布局（ZCode 图一）：左列提供方清单（状态点），右栏详情编辑卡 */}
      <div className="mt-1 grid min-h-[440px] grid-cols-1 overflow-hidden rounded-2xl border-[0.5px] border-surface-container-high md:grid-cols-[250px_1fr]">
        <aside className="flex flex-col border-surface-container-high py-2 md:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {([
              { label: "内置提供方", items: builtInRows },
              { label: "自定义提供方", items: declaredRows },
            ]).map(group => group.items.length === 0 ? null : (
              <div key={group.label}>
                <div className="px-3 pb-1 pt-2 text-[11px] leading-4 text-outline">{group.label}</div>
                {group.items.map(row => {
                  const credentialConfigured = row.credential?.configured === true;
                  const credentialMissing = !credentialConfigured
                    && row.apiKeyEnv !== undefined
                    && row.credential?.configured === false;
                  return (
                    <button
                      key={row.entry.provider}
                      type="button"
                      data-model-provider={row.entry.provider}
                      onClick={() => {
                        setDeclaring(false);
                        setGallery(false);
                        setSavedProvider(undefined);
                        setNotice("");
                        setSelected(row.entry.provider);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors ${
                        selected === row.entry.provider && !declaring
                          ? "bg-surface-container-high"
                          : "hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        <ProviderIcon provider={row.entry.provider} size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-on-surface">{row.entry.displayName}</span>
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          credentialConfigured ? "bg-tertiary" : credentialMissing ? "bg-error" : "bg-orange"
                        }`}
                        role="img"
                        aria-label={credentialConfigured ? "已配置" : credentialMissing ? "API 密钥缺失" : "未配置"}
                        title={credentialConfigured ? "API 密钥已配置" : credentialMissing ? "API 密钥缺失" : "未配置"}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-5">
          {declaring ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="返回提供方清单"
                  title="返回"
                  onClick={() => setDeclaring(false)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                </button>
                <span className="text-[16px] leading-6 font-semibold text-on-surface">添加自定义提供方</span>
              </div>
              <CustomProviderCard
                taken={rows.map(row => row.entry.provider)}
                revision={piAiRevision}
                protocols={protocols}
                readOnly={!writable}
                onClose={changed => {
                  setDeclaring(false);
                  if (changed) void reload().catch(() => undefined);
                }}
              />
            </div>
          ) : gallery ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="返回提供方清单"
                  title="返回"
                  onClick={() => setGallery(false)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                </button>
                <span className="text-[16px] leading-6 font-semibold text-on-surface">添加供应商</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {GALLERY_ENTRIES.flatMap(entry => {
                  const cards: { entry: { label: string; provider: string }; kind: "custom" | "configured" | "addable" }[] = [];
                  if (entry.provider === "custom") {
                    cards.push({ entry, kind: "custom" });
                  } else {
                    const existing = rows.find(row => row.entry.provider === entry.provider);
                    if (existing !== undefined && existing.configured) {
                      cards.push({ entry, kind: "configured" });
                    }
                    if (addable.some(row => row.entry.provider === entry.provider)) {
                      cards.push({ entry, kind: "addable" });
                    }
                    // 既未配置也不在目录里（DSH 无该适配器）时诚实跳过
                  }
                  return cards.map(card => (
                    <button
                      key={card.entry.provider + card.kind}
                      type="button"
                      data-model-gallery={card.entry.provider}
                      disabled={card.kind === "custom" && (protocols.length === 0 || !writable)}
                      onClick={() => {
                        setGallery(false);
                        setSavedProvider(undefined);
                        setNotice("");
                        if (card.kind === "custom") {
                          setDeclaring(true);
                          return;
                        }
                        setSelected(card.entry.provider);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border-[0.5px] border-surface-container-highest bg-surface-container-low px-4 py-3.5 text-left transition-colors hover:bg-surface-container-low/60 disabled:cursor-default disabled:opacity-40"
                    >
                      {card.kind === "custom" ? (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-[18px] text-on-surface-variant">
                          +
                        </span>
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
                          <ProviderIcon provider={card.entry.provider} size={20} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-on-surface">
                        {card.entry.label}
                      </span>
                      {card.kind !== "configured" ? null : (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-tertiary"
                          role="img"
                          aria-label="已接入"
                          title="已接入，点击查看配置"
                        />
                      )}
                      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                    </button>
                  ));
                })}
              </div>
            </div>
          ) : selectedRow === undefined || selectedTarget === undefined ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-[12.5px] leading-relaxed text-outline">
              <span>还没有接入任何提供方。</span>
              <span>点击右上角「添加供应商」配置 DeepSeek，或创建自定义供应商。</span>
            </div>
          ) : selectedNamespace === undefined ? (
            <div className="text-[12.5px] leading-relaxed text-outline">
              提供方「{selectedRow.entry.displayName}」在当前部署不可配置。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
                  <ProviderIcon provider={selectedRow.entry.provider} size={20} />
                </span>
                <span className="text-[16px] leading-6 font-semibold text-on-surface">{selectedRow.entry.displayName}</span>
                {selectedRow.entry.declared === true ? (
                  <span className="shrink-0 rounded border-[0.5px] border-surface-container-high px-1.5 py-px text-[11px] leading-4 text-on-surface-variant">
                    自定义
                  </span>
                ) : null}
                {selectedRow.entry.error === undefined ? null : (
                  <span className="min-w-0 truncate text-[12px] leading-[18px] text-error">{selectedRow.entry.error}</span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  <ToggleSwitch
                    checked={!disabledProviders.has(selectedRow.entry.provider)}
                    title={
                      disabledProviders.has(selectedRow.entry.provider)
                        ? `已停用「${selectedRow.entry.displayName}」（客户端偏好；runtime 暂无停用通道）`
                        : `启用中「${selectedRow.entry.displayName}」（客户端偏好；runtime 暂无停用通道）`
                    }
                    onChange={next => {
                      const key = selectedRow.entry.provider;
                      setDisabledProviders(previous => {
                        const nextSet = new Set(previous);
                        if (next) nextSet.delete(key);
                        else nextSet.add(key);
                        writeDisabledProviders(nextSet);
                        return nextSet;
                      });
                      setNotice(next
                        ? ""
                        : `「${selectedRow.entry.displayName}」已在界面停用（客户端偏好；runtime 暂无提供方停用通道）。`);
                    }}
                  />
                  {selectedRow.removable ? (
                    <button
                      type="button"
                      className={clsDangerButton}
                      aria-label={`删除 ${providerTargetLabel(selectedTarget)}`}
                      disabled={!writable}
                      onClick={() => {
                        setSavedProvider(undefined);
                        setDeleteFailure(undefined);
                        setDeleteTarget(selectedTarget);
                      }}
                    >
                      删除
                    </button>
                  ) : null}
                </span>
              </div>
              <ProviderDetailPanel
                key={selectedTarget.provider}
                provider={selectedTarget.provider}
                displayName={selectedTarget.displayName}
                namespace={selectedNamespace}
                settingsPath={selectedTarget.settingsPath}
                {...(selectedTarget.declared === true ? { declared: true } : {})}
                readOnly={!writable}
                onSaved={() => announceSaved(selectedTarget)}
              />
            </div>
          )}
        </section>
      </div>
      {deleteTarget === undefined ? null : (
        <ConfirmDialog
          target={deleteTarget}
          busy={deleting}
          failure={deleteFailure}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(undefined);
            setDeleteFailure(undefined);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
