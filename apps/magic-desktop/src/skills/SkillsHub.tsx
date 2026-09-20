// 插件市场（2026-09-19 第二次重设计，用户裁定：参考 ZCode 插件市场截图形态）：
// 标题区（右侧 刷新/新建）+ 通栏搜索 + 已安装图标行（点击跳分类页）+
// 分类 pill 页（技能 / MCP / 智能体 / 插件，取代旧 公开/个人 与 插件/技能 双 tab）+
// 每页两组：已安装在上，agent 提供的「可立即安装」推荐编目在下（TRAE/ZCode 市场行式，
// 安装 pill 为诚实占位——安装通道未接入，点击出提示）。
// 数据源（真实 runtime）：
// - 技能：Remote `skills/list` {request:{sessionId}} → SkillEntry[]
//   （session-controller/src/skill-catalog.ts:35-90，过滤 isUserInvocable）
// - 智能体：Remote `agentPresets/list` → AgentPresetRoster（内置 standard/ptc/minimal/cordis）
// - 插件：Magic 随实例挂载的自研插件清单（patches/web.patch.yml 挂载集合，静态编目；
//   DSH 无 Remote 插件枚举端点——行条目状态诚实标注「已内置」）
// - MCP：DSH 的 mcp-client 插件无 Remote 枚举端点（已核查），诚实空态
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { dshRpc } from "../adapters/dsh-web/rpc";

interface SkillEntry {
  name: string;
  path?: string;
  description: string;
  whenToUse?: string;
  modelInvocable?: boolean;
}

interface AgentPresetRow {
  id: string;
  trust?: string;
  isDefault?: boolean;
  name?: string;
  description?: string;
  broken?: boolean;
}

interface AgentPresetRoster {
  presets: AgentPresetRow[];
  authorable?: boolean;
  modeSelectionEnabled?: boolean;
}

/** 依次尝试多组 args 形状（Remote 无参方法生成不同）。 */
async function rpcTry<T>(endpoint: string, variants: Record<string, unknown>[]): Promise<T> {
  let lastError: unknown;
  for (const args of variants) {
    try {
      return await dshRpc<T>(endpoint, args);
    } catch (cause) {
      lastError = cause;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/* ── 插件编目（Magic 随实例挂载的自研插件；描述取自各插件 README/职责） ── */
interface PluginEntry {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

const PLUGINS: PluginEntry[] = [
  { id: "magic-ceo", name: "CEO 编排", desc: "CEO 模式任务拆分、成员派发与执行图管理，单交付收口", icon: "hub" },
  { id: "magic-devtools", name: "开发工具箱", desc: "归档、代码搜索、诊断与 Git 等开发辅助命令集", icon: "build" },
  { id: "magic-ledger", name: "执行台账", desc: "任务交付、证据与核验的持久台账，可回溯每一步", icon: "fact_check" },
  { id: "magic-memory", name: "记忆库", desc: "跨会话记忆的存取与复用，越用越懂你的项目", icon: "psychology" },
  { id: "magic-work-mode", name: "工作模式", desc: "CEO / Agent 会话工作模式切换与确认流", icon: "swap_horiz" },
  { id: "magic-consult", name: "顾问咨询", desc: "会话内引入顾问视角的二次意见与评审", icon: "support_agent" },
  { id: "magic-export", name: "导出中心", desc: "会话与交付物导出为 Markdown 等格式", icon: "ios_share" },
  { id: "better-sidebar", name: "侧边坞", desc: "文件 / 终端 / 浏览器 / 侧聊多合一右坞工作台", icon: "dock_to_left" },
  { id: "dsh-sidenote", name: "侧边聊天", desc: "会话内 fork 分身，独立演进不回流主线", icon: "forum" },
  { id: "prompt-optimizer", name: "提示词优化", desc: "一键把口语化输入优化成结构化提示词", icon: "auto_fix_high" },
  { id: "harness-zh", name: "界面中文化", desc: "DSH 界面简体中文本地化语言包", icon: "translate" },
];

/* ── 分类页（用户裁定 2026-09-19：技能 / MCP / 智能体；插件页收纳 Magic 自研挂载插件） ── */
type TabId = "skills" | "mcp" | "agents" | "plugins";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "skills", label: "技能", icon: "extension" },
  { id: "mcp", label: "MCP", icon: "dns" },
  { id: "agents", label: "智能体", icon: "smart_toy" },
  { id: "plugins", label: "插件", icon: "hub" },
];

/* ── 可立即安装：agent 提供的推荐编目（内置静态编目；安装通道未接入，点击出诚实提示） ── */
interface RecEntry {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 图标着色（参考图的品牌彩图标语言；暗色底粉彩系） */
  tint: string;
}

const SKILL_RECS: RecEntry[] = [
  { id: "rec-docs", name: "文档技能", desc: "DOCX / PDF 文档生产：报告、合同与说明书的排版与导出", icon: "description", tint: "#fdd663" },
  { id: "rec-slides", name: "演示文稿", desc: "PPTX 幻灯片制作：大纲转页面、母版与图表布局", icon: "slideshow", tint: "#f28b82" },
  { id: "rec-sheets", name: "电子表格", desc: "XLSX 表格技能：公式、透视与图表化数据分析输出", icon: "table_chart", tint: "#81c995" },
  { id: "rec-browser", name: "浏览器操作", desc: "内置浏览器自动化：打开页面、填表、截图与回归验证", icon: "open_in_browser", tint: "#8ab4f8" },
  { id: "rec-computer", name: "电脑控制", desc: "桌面自动化：驱动鼠标、键盘与界面元素完成本机操作", icon: "mouse", tint: "#78d9ec" },
  { id: "rec-skill-creator", name: "技能创建器", desc: "创建、编辑与迭代本地技能（SKILL.md 规范）", icon: "construction", tint: "#c58af9" },
];

const MCP_RECS: RecEntry[] = [
  { id: "rec-fs", name: "文件系统", desc: "本地文件读写、目录检索与变更监听（MCP server）", icon: "folder_open", tint: "#8ab4f8" },
  { id: "rec-git", name: "Git 版本控制", desc: "diff、提交与分支操作的本地仓库集成", icon: "account_tree", tint: "#f28b82" },
  { id: "rec-fetch", name: "网页抓取", desc: "抓取网页并转 Markdown 供模型阅读", icon: "cloud_download", tint: "#81c995" },
  { id: "rec-sqlite", name: "SQLite", desc: "轻量 SQL 查询与数据分析", icon: "storage", tint: "#fdd663" },
];

const RECS: Record<TabId, RecEntry[]> = {
  skills: SKILL_RECS,
  mcp: MCP_RECS,
  agents: [],
  plugins: [],
};

const TINT_CYCLE = ["#8ab4f8", "#81c995", "#c58af9", "#fdd663", "#f28b82", "#78d9ec"];

export function SkillsHub({ backendReady, sessionId }: {
  backendReady: boolean;
  /** 技能目录按会话解析（skills/list 需要 sessionId） */
  sessionId: string;
}) {
  const [tab, setTab] = useState<TabId>("skills");
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [agents, setAgents] = useState<AgentPresetRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState("");
  const [allTiles, setAllTiles] = useState(false);
  const [disabledKeys, setDisabledKeys] = useState<ReadonlySet<string>>(readDisabled);
  const toggleEnabled = (key: string, name: string, next: boolean): void => {
    setDisabledKeys(previous => {
      const nextSet = new Set(previous);
      if (next) nextSet.delete(key);
      else nextSet.add(key);
      writeDisabled(nextSet);
      return nextSet;
    });
    if (!next) setHint(`「${name}」已在界面停用（客户端偏好；runtime 暂无停用通道，重启后恢复）。`);
  };

  const load = useCallback(() => {
    if (!backendReady || sessionId.length === 0) {
      setState("idle");
      return;
    }
    setState("loading");
    Promise.all([
      dshRpc<{ skills: SkillEntry[] }>("skills/list", { request: { sessionId } }),
      rpcTry<AgentPresetRoster>("agentPresets/list", [{}, { _request: {} }]).catch(() => ({
        presets: [],
      })),
    ])
      .then(([skillResult, roster]) => {
        setSkills(skillResult.skills ?? []);
        setAgents(roster.presets ?? []);
        setState("ready");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setState("error");
      });
  }, [backendReady, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // 提示条自动消隐
  useEffect(() => {
    if (hint.length === 0) return;
    const timer = window.setTimeout(() => setHint(""), 6000);
    return () => window.clearTimeout(timer);
  }, [hint]);

  const q = query.trim().toLowerCase();
  const match = (...parts: string[]) =>
    q.length === 0 || parts.some(p => p.toLowerCase().includes(q));

  const shownSkills = useMemo(
    () => skills.filter(s => match(s.name, s.description ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skills, q],
  );
  const shownAgents = useMemo(
    () => agents.filter(a => match(a.name ?? a.id, a.description ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agents, q],
  );
  const shownPlugins = useMemo(
    () => PLUGINS.filter(p => match(p.name, p.desc)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );
  const shownRecs = useMemo(
    () => (RECS[tab] ?? []).filter(r => match(r.name, r.desc)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, q],
  );

  /* 已安装图标行（参考图一）：全部已安装能力平铺，点击跳对应分类页 */
  const tiles = useMemo(
    () => [
      ...PLUGINS.map(p => ({ key: p.id, icon: p.icon, name: p.name, tab: "plugins" as TabId, tint: undefined as string | undefined })),
      ...skills.map(s => ({ key: s.path ?? s.name, icon: "extension", name: s.name, tab: "skills" as TabId, tint: undefined as string | undefined })),
      ...agents.map(a => ({ key: a.id, icon: "smart_toy", name: a.name ?? a.id, tab: "agents" as TabId, tint: undefined as string | undefined })),
    ],
    [skills, agents],
  );
  const visibleTiles = allTiles ? tiles : tiles.slice(0, 16);

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[1200px] px-8 pt-[52px] pb-6">
        {/* pt-[52px]：右上角窗口控制行（WindowControls）占住第一行，头部内容避让 */}
        {/* 头部（图一）：标题 + 副标题 + 右侧 刷新/新建（左栏保留、无右坞，ZCode 形态） */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">插件市场</h1>
            <p className="mt-1 text-[12.5px] text-outline">用技能、MCP 与智能体扩展 Magic 的能力</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              title="重新加载已安装清单"
              onClick={load}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <Icon name="sync" className="text-[16px]" />
            </button>
            <button
              type="button"
              onClick={() =>
                setHint("自建扩展入口尚未接入：技能走 SKILL.md 目录，插件以实例 patch 挂载（后续版本开放）。")
              }
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-colors hover:bg-primary/90"
            >
              <Icon name="add" className="text-[16px]" />
              新建
            </button>
          </div>
        </div>

        {/* 通栏搜索（图一） */}
        <div className="mt-4 flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-container-lowest px-3 focus-within:border-line-strong transition-colors">
          <Icon name="search" className="text-[16px] text-outline shrink-0" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索技能、MCP 与智能体"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-on-surface outline-none placeholder:text-outline"
          />
        </div>

        {/* 已安装（图一）：图标行 + 右侧管理钮 */}
        <section className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-on-surface">已安装</span>
            <button
              type="button"
              title="管理已安装的扩展（随实例挂载，暂无卸载通道）"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <Icon name="tune" className="text-[15px]" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {visibleTiles.map(tile => (
              <button
                key={tile.key}
                type="button"
                title={tile.name}
                data-market-tile={tile.name}
                onClick={() => setTab(tile.tab)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant shadow-hairline transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <Icon name={tile.icon} className="text-[19px]" />
              </button>
            ))}
            {tiles.length > 16 && !allTiles ? (
              <button
                type="button"
                onClick={() => setAllTiles(true)}
                title="显示全部已安装"
                className="flex h-10 cursor-pointer items-center rounded-xl bg-surface-container-low px-3 text-[12px] font-medium text-outline shadow-hairline transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                +{tiles.length - 16}
              </button>
            ) : null}
            {tiles.length === 0 ? (
              <span className="text-[12px] text-outline">尚未发现已安装的扩展</span>
            ) : null}
          </div>
        </section>

        {/* 分类 pill 页（图四形态，用户裁定：技能/MCP/智能体，另保留插件页） */}
        <div className="mt-5 flex items-center gap-2" data-market-tabs="">
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              data-market-tab={item.id}
              onClick={() => setTab(item.id)}
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
                tab === item.id
                  ? "bg-surface-container-high text-on-surface"
                  : "text-outline hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              <Icon name={item.icon} className="text-[15px]" />
              {item.label}
            </button>
          ))}
        </div>

        {/* 提示条（安装通道未接入等诚实提示） */}
        {hint.length > 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface-container-lowest px-3 py-2 text-[12px] text-on-surface-variant">
            <Icon name="info" className="text-[15px] text-primary shrink-0" />
            <span className="min-w-0 flex-1">{hint}</span>
            <button
              type="button"
              onClick={() => setHint("")}
              className="cursor-pointer text-outline hover:text-on-surface"
              title="关闭提示"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </div>
        ) : null}

        {/* 分类页内容：已安装在上，可立即安装在下 */}
        {tab === "skills" ? (
          <>
            <Group title="已安装" count={shownSkills.length} hint="DSH runtime 技能目录（SKILL.md 规范）">
              {!backendReady ? (
                <GroupEmpty>未连接运行时——技能清单来自 DSH runtime，请用 /?backend=web 打开并完成授权。</GroupEmpty>
              ) : state === "loading" ? (
                <GroupEmpty>正在加载…</GroupEmpty>
              ) : state === "error" ? (
                <GroupEmpty>加载失败：{error}</GroupEmpty>
              ) : shownSkills.length === 0 ? (
                <GroupEmpty>{q.length > 0 ? "没有匹配的技能" : "当前会话目录没有可用技能"}</GroupEmpty>
              ) : (
                <RowList
                  items={shownSkills}
                  rowKey={s => s.path ?? s.name}
                  previewName={s => s.name}
                  render={s => (
                    <MarketRow
                      icon="extension"
                      tint={TINT_CYCLE[hashTint(s.name)]}
                      title={s.name}
                      detail={s.description}
                      action={
                        <InstalledActions
                          rowKey={s.path ?? s.name}
                          name={s.name}
                          kind="skill"
                          disabled={disabledKeys.has(s.path ?? s.name)}
                          onToggle={toggleEnabled}
                          onAct={setHint}
                        />
                      }
                    />
                  )}
                />
              )}
            </Group>
            <Group title="可立即安装" count={shownRecs.length} hint={REC_HINT}>
              <RecList items={shownRecs} onInstall={setHint} />
            </Group>
          </>
        ) : tab === "mcp" ? (
          <>
            <Group title="已连接" count={0} hint="Model Context Protocol 服务器与工具">
              <div className="rounded-xl border border-dashed border-surface-container-highest px-4 py-3 text-[12px] leading-relaxed text-outline">
                DSH runtime 当前未暴露 MCP 服务清单接口（已核查 mcp-client 插件无远程枚举端点）——
                接入后这里会列出已连接的 MCP 服务器与工具。
              </div>
            </Group>
            <Group title="可立即安装" count={shownRecs.length} hint={REC_HINT}>
              <RecList items={shownRecs} onInstall={setHint} />
            </Group>
          </>
        ) : tab === "agents" ? (
          <>
            <Group title="已内置" count={shownAgents.length} hint="会话创建期固定的能力组合（内置 standard / ptc / minimal / cordis）">
              {!backendReady ? (
                <GroupEmpty>未连接运行时——智能体预设清单来自 DSH runtime。</GroupEmpty>
              ) : state === "loading" ? (
                <GroupEmpty>正在加载…</GroupEmpty>
              ) : state === "error" ? (
                <GroupEmpty>加载失败：{error}</GroupEmpty>
              ) : shownAgents.length === 0 ? (
                <GroupEmpty>{q.length > 0 ? "没有匹配的智能体" : "没有可用预设"}</GroupEmpty>
              ) : (
                <RowList
                  items={shownAgents}
                  rowKey={a => a.id}
                  render={a => (
                    <MarketRow
                      icon="smart_toy"
                      tint={TINT_CYCLE[hashTint(a.id)]}
                      title={a.name ?? a.id}
                      detail={a.description ?? a.trust ?? ""}
                      action={
                        <InstalledActions
                          rowKey={a.id}
                          name={a.name ?? a.id}
                          kind="agent"
                          disabled={disabledKeys.has(a.id)}
                          onToggle={toggleEnabled}
                          onAct={setHint}
                        />
                      }
                      badges={
                        <>
                          {a.isDefault === true ? <Badge>默认</Badge> : null}
                          {a.broken === true ? <Badge tone="error">异常</Badge> : null}
                        </>
                      }
                    />
                  )}
                />
              )}
            </Group>
            <Group title="可立即安装" count={0} hint="">
              <GroupEmpty>智能体预设随 runtime 内置，暂无可安装目录。</GroupEmpty>
            </Group>
          </>
        ) : (
          <>
            <Group title="已内置" count={shownPlugins.length} hint="随实例 patch 挂载的 Magic 自研插件">
              {shownPlugins.length === 0 ? (
                <GroupEmpty>没有匹配的插件</GroupEmpty>
              ) : (
                <RowList
                  items={shownPlugins}
                  rowKey={p => p.id}
                  render={p => (
                    <MarketRow
                      icon={p.icon}
                      tint={TINT_CYCLE[hashTint(p.id)]}
                      title={p.name}
                      detail={p.desc}
                      action={
                        <InstalledActions
                          rowKey={p.id}
                          name={p.name}
                          kind="plugin"
                          disabled={disabledKeys.has(p.id)}
                          onToggle={toggleEnabled}
                          onAct={setHint}
                        />
                      }
                    />
                  )}
                />
              )}
            </Group>
            <Group title="可立即安装" count={0} hint="">
              <GroupEmpty>插件以实例 patch 形式挂载，暂无可安装目录。</GroupEmpty>
            </Group>
          </>
        )}
      </div>
    </div>
  );
}

const REC_HINT = "内置推荐编目 · 一键安装通道将在后续版本接入";

/* 已安装条目的启用/停用（用户裁定 2026-09-19：开关即启用禁用）。
 * runtime 暂无停用通道，键存 localStorage 作客户端偏好（诚实占位）。 */
const DISABLED_KEY = "magic.market.disabledKeys";

function readDisabled(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(DISABLED_KEY);
    return raw === null ? new Set() : new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDisabled(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(DISABLED_KEY, JSON.stringify([...ids]));
  } catch {
    // 隐私模式等存不进就算了，仅影响下次会话的初始态
  }
}

/** 字符串 → 稳定配色下标（同名字恒同色）。 */
function hashTint(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % TINT_CYCLE.length;
}

/** 行列表（参考图一/二：双列行条目，超过 6 行折叠为「查看…以及另外 N 个」展开行）。 */
function RowList<T>({ items, rowKey, render, previewIcon, previewName }: {
  items: T[];
  rowKey: (item: T) => string;
  render: (item: T) => ReactNode;
  /** 折叠态展开行的迷你图标/名称取值（参考图一/二）；缺省用通用图标 */
  previewIcon?: (item: T) => string;
  previewName?: (item: T) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 6);
  const rest = items.slice(6);
  const showNames = previewName !== undefined;
  const restNames = rest.slice(0, 2).map(previewName ?? (() => ""));
  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        {visible.map(item => (
          <div key={rowKey(item)}>{render(item)}</div>
        ))}
      </div>
      {!expanded && rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg py-1.5 text-[12.5px] text-outline transition-colors hover:text-on-surface"
        >
          <span className="flex -space-x-1">
            {rest.slice(0, 3).map(item => (
              <span
                key={rowKey(item)}
                className="flex size-5 items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant"
              >
                <Icon name={previewIcon !== undefined ? previewIcon(item) : "extension"} className="text-[12px]" />
              </span>
            ))}
          </span>
          <span className="truncate">
            {showNames && restNames.length > 0
              ? `查看 ${restNames.join("、")}${rest.length > 2 ? ` 以及另外 ${rest.length - 2} 个` : ""}`
              : `查看另外 ${rest.length} 个`}
          </span>
        </button>
      ) : null}
      {expanded && rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 flex cursor-pointer items-center gap-1 rounded-lg py-1.5 text-[12.5px] text-outline transition-colors hover:text-on-surface"
        >
          <Icon name="expand_less" className="text-[15px]" />
          收起
        </button>
      ) : null}
    </>
  );
}

/** 推荐编目列表（安装 pill 为诚实占位，点击出提示）。 */
function RecList({ items, onInstall }: {
  items: RecEntry[];
  onInstall: (message: string) => void;
}) {
  if (items.length === 0) {
    return <GroupEmpty>没有匹配的条目</GroupEmpty>;
  }
  return (
    <RowList
      items={items}
      rowKey={r => r.id}
      previewIcon={r => r.icon}
      previewName={r => r.name}
      render={r => (
        <MarketRow
          icon={r.icon}
          tint={r.tint}
          title={r.name}
          detail={r.desc}
          action={
            <button
              type="button"
              data-market-install={r.name}
              onClick={() => onInstall(`「${r.name}」来自内置推荐编目，一键安装通道尚未接入（后续版本开放）。`)}
              className="flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-line px-3 text-[12px] font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              安装
            </button>
          }
        />
      )}
    />
  );
}

function Group({ title, count, hint, children }: {
  title: string;
  count: number;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline gap-2 border-b border-surface-container-high/40 pb-2">
        <span className="text-[14px] font-semibold text-on-surface">{title}</span>
        {count > 0 ? <span className="text-[11px] text-outline/70">{count}</span> : null}
        {hint.length > 0 ? <span className="truncate text-[11px] text-outline/60">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function GroupEmpty({ children }: { children: ReactNode }) {
  return <div className="py-2 text-[12.5px] leading-relaxed text-outline/80">{children}</div>;
}

function Badge({ tone, children }: { tone?: "tertiary" | "error"; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-[1px] text-[10.5px] font-medium ${
        tone === "error" ? "bg-error-container/40 text-error" : "bg-tertiary-container/25 text-tertiary"
      }`}
    >
      {children}
    </span>
  );
}

/** 已安装条目的管理菜单（VS Code/ZCode 市场规律：启用/停用走开关，卸载走溢出菜单）。
 *  当前 runtime 无卸载通道，菜单项为诚实占位，点击出说明提示。 */
function InstalledMenu({ name, kind, onAct }: {
  name: string;
  kind: "skill" | "agent" | "plugin";
  onAct: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const kindNote =
    kind === "plugin"
      ? "插件随实例 patch 挂载"
      : kind === "skill"
        ? "技能位于 runtime 技能目录"
        : "智能体预设内置于 runtime";
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={`管理「${name}」`}
        data-market-manage={name}
        onClick={() => setOpen(value => !value)}
        className={`flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
          open ? "bg-surface-container-high text-on-surface" : "text-outline hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <Icon name="more_vert" className="text-[16px]" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-lg border border-line bg-surface-container py-1 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAct(`「${name}」卸载通道尚未接入（${kindNote}，后续版本开放）。`);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="delete" className="text-[15px] text-on-surface-variant" />
              卸载
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** 已安装行动作区：启用/停用开关（用户裁定）+ 卸载菜单。 */
function InstalledActions({ rowKey, name, kind, disabled, onToggle, onAct }: {
  rowKey: string;
  name: string;
  kind: "skill" | "agent" | "plugin";
  disabled: boolean;
  onToggle: (key: string, name: string, next: boolean) => void;
  onAct: (message: string) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <ToggleSwitch
        checked={!disabled}
        title={disabled ? `已停用「${name}」（客户端偏好）` : `启用中「${name}」`}
        onChange={next => onToggle(rowKey, name, next)}
      />
      <InstalledMenu name={name} kind={kind} onAct={onAct} />
    </span>
  );
}

/** 市场行（参考图一：圆角图标块 + 名称/单行描述 + 右侧动作区）。 */
function MarketRow({ icon, tint, title, detail, action, badges }: {
  icon: string;
  tint?: string;
  title: string;
  detail: string;
  action: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-surface-container-high/40 py-3 pr-1 transition-colors hover:bg-surface-container-low/40">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low shadow-hairline">
        <span style={tint !== undefined ? { color: tint } : undefined} className="flex">
          <Icon name={icon} className="text-[19px]" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-on-surface">{title}</span>
          {badges}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-outline">
          {detail.length > 0 ? detail : title}
        </div>
      </div>
      {action}
    </div>
  );
}
