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
import { ProviderEditorCard, CustomProviderCard } from "./models-editor";
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
  providerUsable,
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

/** 全局无任何可用 provider 时：无键且整段级路由直接展开为初始配置卡（ModelsSection.tsx:141-145）。 */
function needsSetup(row: ProviderRow, anyUsable: boolean): boolean {
  if (anyUsable) return false;
  if (row.entry.settingsPath.length > 0) return false;
  return row.credential?.configured !== true;
}

function providerTargetLabel(target: { provider: string; displayName: string }): string {
  return target.provider === target.displayName ? target.provider : `${target.displayName} (${target.provider})`;
}

// ── 视觉常量 ──
const clsRowCard =
  "flex flex-col gap-3 rounded-2xl border-[0.5px] border-surface-container-high px-3.5 py-3";
const clsRowButton =
  "box-border inline-flex h-7 items-center justify-center rounded-[14px] px-2.5 text-[12px] leading-[18px] transition-colors focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";
const clsEditButton = `${clsRowButton} border-[0.5px] border-surface-container-high text-on-surface hover:bg-surface-container-high`;
const clsDangerButton = `${clsRowButton} text-error hover:bg-error/10`;
const clsAddButton =
  "box-border inline-flex h-11 min-w-[180px] flex-1 flex-wrap items-center justify-center gap-1.5 rounded-2xl border-[0.5px] border-dashed border-surface-container-high text-[14px] leading-[22px] text-on-surface transition-colors hover:bg-surface-container-high focus-visible:shadow-[0_0_0_2px_var(--color-outline)] disabled:opacity-40 disabled:cursor-default";

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
  // 每类卡各自的开关状态，互不挤占（官方 ModelsSection.tsx:207-214）。
  const [editing, setEditing] = useState<EditorTarget | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [dismissedSetup, setDismissedSetup] = useState<ReadonlySet<string>>(() => new Set());
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

  const closeEditor = (changed: boolean, target: EditorTarget): void => {
    setEditing(undefined);
    setAdding(false);
    setDeclaring(false);
    if (changed) announceSaved(target);
  };

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
  const configured = rows.filter(row => row.configured);
  const configurable = rows.filter(row => namespaces.has(row.entry.settingsNs));
  const addable = configurable.filter(row => !row.configured);
  const anyUsable = rows.some(row => providerUsable(row));
  const addTarget = adding ? editing : undefined;
  const addNamespace = addTarget === undefined ? undefined : namespaces.get(addTarget.settingsNs);
  const protocols = protocolChoices(namespaces.get("llm-pi-ai"));
  const piAiRevision = namespaces.get("llm-pi-ai")?.revision ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 text-[16px] leading-6 font-medium text-on-surface">模型</h2>
      <p className="m-0 text-[14px] leading-[22px] text-on-surface-variant">
        填入各提供方的 API 密钥即可使用其模型。会话中切换模型在输入栏的模型选择器进行；
        各代理的默认模型是其自身配置，不在此页设置。
      </p>
      {!writable ? <p className="m-0 text-[12px] leading-[18px] text-orange">当前部署的设置文档为只读。</p> : null}
      {state.credentialError !== null ? (
        <p className="m-0 text-[12px] leading-[18px] text-orange">凭证状态读取失败：{state.credentialError}</p>
      ) : null}
      {savedProvider === undefined ? null : (
        <p role="status" aria-live="polite" className="m-0 text-[12px] leading-[18px] text-tertiary">
          {`已保存 ${savedProvider}。`}
        </p>
      )}
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {configured.map(row => {
          const target = targetOf(row);
          const namespace = namespaces.get(target.settingsNs);
          if (namespace === undefined) return null;
          const open = !adding && !declaring && editing?.provider === row.entry.provider;
          const credentialConfigured = row.credential?.configured === true;
          const credentialMissing = !credentialConfigured
            && row.apiKeyEnv !== undefined
            && row.credential?.configured === false;
          if (needsSetup(row, anyUsable) && !dismissedSetup.has(row.entry.provider)) {
            // 首跑姿态：该 provider 还没有键——初始配置卡就是它在页上的存在形式。
            return (
              <li key={row.entry.provider} className="flex flex-col gap-3 rounded-xl bg-surface-container-low px-4 py-3.5">
                <div className="text-[14px] leading-[22px] font-medium text-on-surface">{row.entry.displayName}</div>
                <ProviderEditorCard
                  provider={target.provider}
                  displayName={target.displayName}
                  namespace={namespace}
                  settingsPath={target.settingsPath}
                  {...(target.declared === true ? { declared: true } : {})}
                  readOnly={!writable}
                  hideTitle
                  onClose={changed => {
                    setDismissedSetup(previous => new Set([...previous, target.provider]));
                    if (changed) announceSaved(target);
                  }}
                />
              </li>
            );
          }
          return (
            <li key={row.entry.provider} className={clsRowCard}>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="text-[14px] leading-[22px] font-medium text-on-surface">{row.entry.displayName}</span>
                  {row.entry.declared === true ? (
                    <span className="shrink-0 rounded border-[0.5px] border-surface-container-high px-1.5 py-px text-[11px] leading-4 text-on-surface-variant">
                      自定义
                    </span>
                  ) : null}
                  {credentialConfigured ? (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full bg-tertiary"
                      role="img"
                      aria-label="API 密钥已配置"
                      title="API 密钥已配置"
                    />
                  ) : credentialMissing ? (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full bg-error"
                      role="img"
                      aria-label="API 密钥缺失"
                      title="API 密钥缺失"
                    />
                  ) : null}
                </span>
                {row.entry.error === undefined ? null : (
                  <span className="min-w-0 truncate text-[12px] leading-[18px] text-error">{row.entry.error}</span>
                )}
                <span className="ml-auto inline-flex items-center gap-1">
                  <button
                    type="button"
                    className={clsEditButton}
                    aria-label={`编辑 ${providerTargetLabel(target)}`}
                    onClick={() => {
                      setSavedProvider(undefined);
                      setDeclaring(false);
                      setAdding(false);
                      setEditing(open ? undefined : target);
                    }}
                  >
                    编辑
                  </button>
                  {row.removable ? (
                    <button
                      type="button"
                      className={clsDangerButton}
                      aria-label={`删除 ${providerTargetLabel(target)}`}
                      disabled={!writable}
                      onClick={() => {
                        setSavedProvider(undefined);
                        setDeleteFailure(undefined);
                        setDeleteTarget(target);
                      }}
                    >
                      删除
                    </button>
                  ) : null}
                </span>
              </div>
              {open ? (
                <ProviderEditorCard
                  provider={target.provider}
                  displayName={target.displayName}
                  namespace={namespace}
                  settingsPath={target.settingsPath}
                  {...(target.declared === true ? { declared: true } : {})}
                  readOnly={!writable}
                  onClose={changed => closeEditor(changed, target)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3">
        {addTarget !== undefined && addNamespace !== undefined ? (
          <div className="flex flex-col gap-3.5 rounded-xl bg-surface-container-low px-4 py-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-2.5 text-[12px] leading-[18px] font-medium text-on-surface-variant">
                提供方
              </span>
              <select
                className="h-8 max-w-[240px] cursor-pointer rounded-lg border-[0.5px] border-surface-container-highest bg-surface-container px-2.5 text-[14px] leading-[22px] text-on-surface outline-none transition-colors focus:border-primary"
                value={addTarget.provider}
                aria-label="提供方"
                onChange={event => {
                  const row = addable.find(candidate => candidate.entry.provider === event.target.value);
                  if (row === undefined) return;
                  setEditing(targetOf(row));
                }}
              >
                {addable.map(row => (
                  <option key={row.entry.provider} value={row.entry.provider}>{row.entry.displayName}</option>
                ))}
              </select>
            </div>
            <ProviderEditorCard
              key={addTarget.provider}
              provider={addTarget.provider}
              displayName={addTarget.displayName}
              namespace={addNamespace}
              settingsPath={addTarget.settingsPath}
              {...(addTarget.declared === true ? { declared: true } : {})}
              hideTitle
              readOnly={!writable}
              onClose={changed => closeEditor(changed, addTarget)}
            />
          </div>
        ) : declaring ? (
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
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {configurable.length > 0 ? (
              <button
                type="button"
                className={clsAddButton}
                disabled={addable.length === 0 || !writable}
                title={addable.length === 0 ? "目录内提供方均已配置" : undefined}
                onClick={() => {
                  const first = addable[0];
                  if (first === undefined) return;
                  setSavedProvider(undefined);
                  setDeclaring(false);
                  setAdding(true);
                  setEditing(targetOf(first));
                }}
              >
                <span aria-hidden className="text-[16px] leading-none">+</span>
                添加提供方
              </button>
            ) : null}
            {namespaces.has("llm-pi-ai") ? (
              <button
                type="button"
                className={clsAddButton}
                disabled={protocols.length === 0 || !writable}
                onClick={() => {
                  setSavedProvider(undefined);
                  setAdding(false);
                  setEditing(undefined);
                  setDeclaring(true);
                }}
              >
                <span aria-hidden className="text-[16px] leading-none">+</span>
                添加自定义提供方
              </button>
            ) : null}
          </div>
        )}
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
