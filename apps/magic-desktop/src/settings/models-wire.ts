// 模型设置 section 的官方 DSH wire 封装（2026-09-18 接线）。
// 传输契约与方法形状全部源自官方源码 reference-project/deepseek-harness，已在 3099 实例实测：
// - POST /api/<ns>/<method>，信封 {type:'client-request',rpcId,method,payload:{args}}（connection/src/client/rpc.ts:34-59）；
//   args 为按参数名键控的对象（typert 生成的 InvocationParameterDescriptor.wire，
//   settings-controller/lib/typert.remote-client.js:110-403；gateway/src/index.ts:820 按 args[parameter.wire] 解码）。
// - llm/listProviders          args {}                       → LlmProviderInfo[]          （llm/lib/typert.remote-client.js:86-99）
// - llm/listConfigurableProviders args {}                    → LlmConfigurableProvider[]  （同上 :71-84）
// - settings/describe          args {}                       → SettingsDescribeValue      （settings-controller/lib/typert.remote-client.js:210-223）
// - settings/mutate            args {ns,ops,expectedRevision?} → SettingsNamespaceView    （同上 :225-269；冲突→settings/conflict）
// - credentials/describe       args {refs}                   → Record<ref, CredentialInfo>（同上 :110-133；≤64 个，值单向不出网）
// - credentials/set|unset      args {ref(,value)}            → void                       （同上 :135-193）
// - llm/discoverModels         args {settingsNs,request}     → LlmDiscoveredModel[]       （llm/lib/typert.remote-client.js:34-69）
// 读取端 UI 语义对齐官方 ui-settings-models/src/client/store.ts:42-68（目录 join）与 ProviderEditor.tsx:113-130（path ops）。
import { dshRpc } from "../adapters/dsh-web/rpc";

// ── wire 视图类型（与官方 dsh-settings/types、dsh-llm/types、dsh-credentials/types 对齐）──

export interface JsonMap { [key: string]: JsonValue }
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonMap;

/** 已注册的 provider 路由（llm/types.ts:196-201）。 */
export interface LlmProviderInfo { id: string; name: string }

/** 可配置 provider 目录条目（llm/types.ts:218-241）。 */
export interface LlmConfigurableProvider {
  provider: string;
  displayName: string;
  settingsNs: string;
  settingsPath: string[];
  /** 仅因配置声明而被适配器认识（用户自建网关等）；缺省 = 适配器不区分。 */
  declared?: boolean;
  error?: string;
}

/** 单个命名空间的脱敏视图（settings/types.ts；secrets 只报 set 布尔，不回传值）。 */
export interface SettingsNamespaceView {
  ns: string;
  schema: JsonValue;
  value: JsonValue;
  base?: JsonValue;
  user?: JsonValue;
  applies: "live" | "restart";
  secrets: { path: string[]; set: boolean }[];
  revision: number;
}

export interface SettingsDescribeValue {
  writable: boolean;
  hasDocument: boolean;
  namespaces: SettingsNamespaceView[];
}

/** settings.mutate 的路径操作（settings-controller/lib/typert.remote-client.js:41-48）。 */
export type SettingsPathOp =
  | { op: "set"; path: string[]; value: JsonValue }
  | { op: "unset"; path: string[] };

/** 凭证状态（credentials/types.ts：configured/source/writable，绝无值）。 */
export interface CredentialInfo {
  configured: boolean;
  source?: string;
  writable: boolean;
}

/** 端点自述的一个模型（llm/types.ts:289-298）。 */
export interface LlmDiscoveredModel {
  id: string;
  name?: string;
  contextWindow?: number;
  maxTokens?: number;
}

/** 模型探测请求（llm/types.ts:249-266）：表单当前值，密钥仅随本次询问。 */
export interface LlmModelDiscoveryRequest {
  provider?: string;
  baseURL?: string;
  api?: string;
  apiKey?: string;
}

// ── RPC 调用 ──

export function llmListProviders(): Promise<LlmProviderInfo[]> {
  return dshRpc<LlmProviderInfo[]>("llm/listProviders", {});
}

export function llmListConfigurableProviders(): Promise<LlmConfigurableProvider[]> {
  return dshRpc<LlmConfigurableProvider[]>("llm/listConfigurableProviders", {});
}

export function settingsDescribe(): Promise<SettingsDescribeValue> {
  return dshRpc<SettingsDescribeValue>("settings/describe", {});
}

/** settings/mutate：expectedRevision 为 undefined 时必须省略字段（present-but-undefined 解码必败）。 */
export function settingsMutate(
  ns: string,
  ops: SettingsPathOp[],
  expectedRevision?: number,
): Promise<SettingsNamespaceView> {
  return dshRpc<SettingsNamespaceView>("settings/mutate", {
    ns,
    ops,
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  });
}

export function credentialsDescribe(refs: string[]): Promise<Record<string, CredentialInfo>> {
  return dshRpc<Record<string, CredentialInfo>>("credentials/describe", { refs });
}

export function credentialsSet(ref: string, value: string): Promise<void> {
  return dshRpc<void>("credentials/set", { ref, value });
}

export function credentialsUnset(ref: string): Promise<void> {
  return dshRpc<void>("credentials/unset", { ref });
}

export function llmDiscoverModels(
  settingsNs: string,
  request: LlmModelDiscoveryRequest,
): Promise<LlmDiscoveredModel[]> {
  return dshRpc<LlmDiscoveredModel[]>("llm/discoverModels", { settingsNs, request });
}

// ── 纯 JSON 的路径读写（对齐官方 SettingsSchemaOperations 的不可变语义）──

/** 读取 value 在 path 处的子树；任一层缺失返回 undefined。 */
export function jsonGetPath(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    current = (current as JsonMap)[key];
  }
  return current;
}

export function jsonHasPath(value: unknown, path: readonly string[]): boolean {
  if (path.length === 0) return value !== undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return jsonHasPath((value as JsonMap)[path[0]], path.slice(1));
}

/** 不可变地设置 path 处的值，逐层补齐中间对象。 */
export function jsonSetPath(value: unknown, path: readonly string[], next: JsonValue): JsonMap {
  const root: JsonMap = typeof value === "object" && value !== null && !Array.isArray(value)
    ? { ...(value as JsonMap) }
    : {};
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  root[head] = rest.length === 0 ? next : jsonSetPath(root[head], rest, next);
  return root;
}

/** 不可变地删除 path 处的键。 */
export function jsonDeletePath(value: unknown, path: readonly string[]): JsonMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const root = { ...(value as JsonMap) };
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    delete root[head];
    return root;
  }
  root[head] = jsonDeletePath(root[head], rest);
  return root;
}

/**
 * 最小 path ops：只命名卡片观察到的字段（ProviderEditor.tsx:113-130）。
 * set 覆盖变更项，unset 携带被移除项；两侧都缺席的字段不产生操作。
 */
export function pathOps(
  base: readonly string[],
  before: unknown,
  after: JsonMap,
): SettingsPathOp[] {
  const previous = typeof before === "object" && before !== null && !Array.isArray(before)
    ? (before as JsonMap)
    : {};
  const ops: SettingsPathOp[] = [];
  for (const [key, value] of Object.entries(after)) {
    if (JSON.stringify(previous[key]) === JSON.stringify(value)) continue;
    ops.push({ op: "set", path: [...base, key], value });
  }
  for (const key of Object.keys(previous)) {
    if (!(key in after)) ops.push({ op: "unset", path: [...base, key] });
  }
  return ops;
}

// ── 凭证引用与校验（store.ts:113-115、apiKey.ts 镜像）──

/** 路由 id → 约定凭证名（如 `minimax-cn` → `MINIMAX_CN_API_KEY`）。 */
export function deriveKeyRef(provider: string): string {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

const LEGAL_API_KEY = /^[\x21-\x7E]+$/;
const ENV_LINE = /^[A-Z][A-Z0-9_]*=[^=]/;

function isQuoted(value: string): boolean {
  const first = value[0];
  if (first !== '"' && first !== "'" && first !== "`") return false;
  return value.length > 1 && value.endsWith(first);
}

/** API 密钥格式判定（apiKey.ts:51-58）：空串=合法（留空保持已存值）。返回失败文案或 undefined。 */
export function apiKeyFailure(draft: string): string | undefined {
  if (draft.length === 0) return undefined;
  const value = draft.trim();
  if (value.length === 0) return "请输入 API 密钥；留空则保持已存储的密钥。";
  if (ENV_LINE.test(value) || isQuoted(value)) return "该 API 密钥格式错误，请检查。";
  if (!LEGAL_API_KEY.test(value)) return "该 API 密钥格式错误，请检查。";
  return undefined;
}

// ── 模型目录校验与容量拼法（DeepSeekModelsEditor.tsx:31-68、94-120）──

export type ModelDraft = Record<string, unknown>;

const CAPACITY_PATTERN = /^(\d+(?:\.\d+)?)([km])?$/i;
const CAPACITY_SCALE = { k: 1_000, m: 1_000_000 } as const;

/** `256K`/`1M` → token 数；空串 → undefined（继承）；不可读 → NaN（提交前拒绝）。 */
export function parseCapacity(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const match = CAPACITY_PATTERN.exec(trimmed);
  if (match === null) return Number.NaN;
  const suffix = match[2]?.toLowerCase();
  const scale = suffix === "k" || suffix === "m" ? CAPACITY_SCALE[suffix] : 1;
  const scaled = Number(match[1]) * scale;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < 1e-6 ? rounded : scaled;
}

/** token 数 → 最短 K/M 拼法。 */
export function formatCapacity(value: number): string {
  if (!Number.isInteger(value) || value <= 0) return String(value);
  if (value % CAPACITY_SCALE.m === 0) return `${String(value / CAPACITY_SCALE.m)}M`;
  if (value % CAPACITY_SCALE.k === 0) return `${String(value / CAPACITY_SCALE.k)}K`;
  return String(value);
}

export interface ModelValidationFailure {
  index: number;
  key: "modelIdRequired" | "modelIdDuplicate" | "modelNameInvalid" | "modelContextInvalid" | "modelMaxTokensInvalid";
}

export function modelFailureOf(value: unknown): ModelValidationFailure | undefined {
  if (value === undefined) return undefined;
  const models = (Array.isArray(value) ? value : []).map(entry =>
    (typeof entry === "object" && entry !== null && !Array.isArray(entry) ? entry : {}) as ModelDraft);
  const seen = new Set<string>();
  for (const [index, model] of models.entries()) {
    const id = model["id"];
    const trimmed = typeof id === "string" ? id.trim() : undefined;
    if (trimmed === undefined || trimmed.length === 0) return { index, key: "modelIdRequired" };
    if (seen.has(trimmed)) return { index, key: "modelIdDuplicate" };
    seen.add(trimmed);
    const name = model["name"];
    if (name !== undefined && (typeof name !== "string" || name.length === 0)) {
      return { index, key: "modelNameInvalid" };
    }
    const contextWindow = model["contextWindow"];
    if (contextWindow !== undefined
      && (typeof contextWindow !== "number" || !Number.isInteger(contextWindow) || contextWindow <= 0)) {
      return { index, key: "modelContextInvalid" };
    }
    const maxTokens = model["maxTokens"];
    if (maxTokens !== undefined
      && (typeof maxTokens !== "number" || !Number.isInteger(maxTokens) || maxTokens <= 0)) {
      return { index, key: "modelMaxTokensInvalid" };
    }
  }
  return undefined;
}

export const MODEL_FAILURE_TEXT: Record<NonNullable<ModelValidationFailure["key"]> | "modelCapacityInvalid", string> = {
  modelIdRequired: "模型 ID 不能为空。",
  modelIdDuplicate: "模型 ID 不能重复。",
  modelNameInvalid: "显示名称不能为空。",
  modelContextInvalid: "上下文窗口必须是正数，例如 131072、256K 或 1M。",
  modelMaxTokensInvalid: "最大输出 token 数必须是正数，例如 8192、64K 或 1M。",
  modelCapacityInvalid: "容量需为数字，可加 K 或 M 后缀。",
};

// ── 序列化 schema 行走（协议枚举 + 继承模型默认值的读取）──

interface SchemaNode {
  type?: string;
  meta?: { default?: unknown };
  dict?: Record<string, JsonValue>;
  inner?: JsonValue;
  list?: JsonValue[];
  value?: unknown;
}

/** 在序列化 schema（{uid, refs} 形状）上按路径取节点；dict 类型对任意键落到 inner。 */
export function schemaNodeAt(view: SettingsNamespaceView, path: readonly string[]): SchemaNode | undefined {
  const schema = view.schema;
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return undefined;
  const refs = (schema as JsonMap)["refs"];
  const uid = (schema as JsonMap)["uid"];
  if (typeof refs !== "object" || refs === null || typeof uid !== "number") return undefined;
  const refMap = refs as JsonMap;
  const resolve = (ref: JsonValue | undefined): SchemaNode | undefined => {
    if (typeof ref === "number") return refMap[String(ref)] as SchemaNode | undefined;
    if (typeof ref === "object" && ref !== null && !Array.isArray(ref)) return ref as SchemaNode;
    return undefined;
  };
  let node = resolve(refMap[String(uid)]);
  for (const key of path) {
    if (node === undefined) return undefined;
    if (node.type === "object" && node.dict !== undefined) {
      const next = resolve(node.dict[key]);
      if (next !== undefined) { node = next; continue; }
      return undefined;
    }
    // dict：值类型对所有键一致（providers.<任意路由> 即此形态）。
    if (node.type === "dict" && node.inner !== undefined) {
      const next = resolve(node.inner);
      if (next !== undefined) { node = next; continue; }
      return undefined;
    }
    return undefined;
  }
  return node;
}

/** 路由可用的 wire 协议（store.ts:126-135；3099 实测：openai-completions / openai-responses / anthropic-messages）。 */
export function protocolChoices(view: SettingsNamespaceView | undefined): string[] {
  if (view === undefined) return [];
  const node = schemaNodeAt(view, ["providers", "\u0000probe", "api"]);
  if (node?.type !== "union" || node.list === undefined) return [];
  // list 成员是 uid，需经 refs 表解析出 const 节点的 value。
  const schema = view.schema as JsonMap;
  const refs = schema["refs"] as JsonMap;
  const values: string[] = [];
  for (const member of node.list) {
    const resolved = typeof member === "number" ? (refs[String(member)] as SchemaNode | undefined) : (member as SchemaNode);
    if (resolved !== undefined && typeof resolved.value === "string") values.push(resolved.value);
  }
  return values;
}

/** 合成 profile 的 models：composition 钉住的 base 值优先，否则 schema 默认（ProviderEditor.tsx:325-328）。 */
export function inheritedModels(
  view: SettingsNamespaceView,
  settingsPath: readonly string[],
): ModelDraft[] {
  const pinned = jsonGetPath(view.base, [...settingsPath, "models"]);
  const source = pinned !== undefined
    ? pinned
    : schemaNodeAt(view, [...settingsPath, "models"])?.meta?.default;
  if (!Array.isArray(source)) return [];
  return source.map(entry =>
    (typeof entry === "object" && entry !== null && !Array.isArray(entry) ? entry : {}) as ModelDraft);
}

// ── provider 目录 join（store.ts:42-68）──

export interface ProviderDirectoryEntry {
  provider: string;
  displayName: string;
  settingsNs: string;
  settingsPath: string[];
  active: boolean;
  declared?: boolean;
  error?: string;
}

export function joinProviderDirectory(
  registered: readonly LlmProviderInfo[],
  directory: readonly LlmConfigurableProvider[],
): ProviderDirectoryEntry[] {
  const active = new Set(registered.map(provider => provider.id));
  const declared = new Set(directory.map(entry => entry.provider));
  const rows: ProviderDirectoryEntry[] = directory.map(entry => ({
    provider: entry.provider,
    displayName: entry.displayName,
    settingsNs: entry.settingsNs,
    settingsPath: [...entry.settingsPath],
    active: active.has(entry.provider),
    ...(entry.declared === undefined ? {} : { declared: entry.declared }),
    ...(entry.error === undefined ? {} : { error: entry.error }),
  }));
  for (const provider of registered) {
    if (declared.has(provider.id)) continue;
    rows.push({ provider: provider.id, displayName: provider.name, settingsNs: "", settingsPath: [], active: true });
  }
  return rows;
}

/** 行卡能否服役：路由已注册，且其 profile 所指凭证已存（store.ts:265-269）。 */
export function providerUsable(
  row: { entry: ProviderDirectoryEntry; apiKeyEnv: string | undefined; credential?: CredentialInfo },
): boolean {
  if (!row.entry.active) return false;
  if (row.apiKeyEnv === undefined) return true;
  return row.credential?.configured === true;
}
