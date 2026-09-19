// 插件市场（2026-09-19，图一 TRAE 风格重设计）：标题区 + 插件/技能分页 + 搜索 +
// 分类 hero 卡 + 分类筛选 chips + 卡片网格。
// 数据源（真实 runtime）：
// - 技能：Remote `skills/list` {request:{sessionId}} → SkillEntry[]
//   （session-controller/src/skill-catalog.ts:35-90，过滤 isUserInvocable）
// - 智能体：Remote `agentPresets/list` → AgentPresetRoster（内置 standard/ptc/minimal/cordis）
// - 插件：Magic 随实例挂载的自研插件清单（patches/web.patch.yml 挂载集合，静态编目；
//   DSH 无 Remote 插件枚举端点——卡片状态诚实标注「已内置」）
// - MCP：DSH 的 mcp-client 插件无 Remote 枚举端点（已核查），诚实空态
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
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
  cat: string;
  icon: string;
}

const PLUGINS: PluginEntry[] = [
  { id: "magic-ceo", name: "CEO 编排", desc: "CEO 模式任务拆分、成员派发与执行图管理，单交付收口", cat: "研发工具", icon: "hub" },
  { id: "magic-devtools", name: "开发工具箱", desc: "归档、代码搜索、诊断与 Git 等开发辅助命令集", cat: "研发工具", icon: "build" },
  { id: "magic-ledger", name: "执行台账", desc: "任务交付、证据与核验的持久台账，可回溯每一步", cat: "数据分析", icon: "fact_check" },
  { id: "magic-memory", name: "记忆库", desc: "跨会话记忆的存取与复用，越用越懂你的项目", cat: "效率提升", icon: "psychology" },
  { id: "magic-work-mode", name: "工作模式", desc: "CEO / Agent 会话工作模式切换与确认流", cat: "效率提升", icon: "swap_horiz" },
  { id: "magic-consult", name: "顾问咨询", desc: "会话内引入顾问视角的二次意见与评审", cat: "研发工具", icon: "support_agent" },
  { id: "magic-export", name: "导出中心", desc: "会话与交付物导出为 Markdown 等格式", cat: "内容创作", icon: "ios_share" },
  { id: "better-sidebar", name: "侧边坞", desc: "文件 / 终端 / 浏览器 / 侧聊多合一右坞工作台", cat: "效率提升", icon: "dock_to_left" },
  { id: "dsh-sidenote", name: "侧边聊天", desc: "会话内 fork 分身，独立演进不回流主线", cat: "效率提升", icon: "forum" },
  { id: "prompt-optimizer", name: "提示词优化", desc: "一键把口语化输入优化成结构化提示词", cat: "内容创作", icon: "auto_fix_high" },
  { id: "harness-zh", name: "界面中文化", desc: "DSH 界面简体中文本地化语言包", cat: "界面设计", icon: "translate" },
];

const CATEGORIES = ["研发工具", "效率提升", "内容创作", "数据分析", "界面设计"] as const;

/** 技能按名称/描述启发式归类（本地目录无分类字段时的诚实近似）。 */
function skillCategory(skill: SkillEntry): string {
  const text = `${skill.name} ${skill.description}`.toLowerCase();
  if (/docs?|writing|blog|markdown|report|文档|写作|报告|创作/.test(text)) return "内容创作";
  if (/data|analysis|chart|sql|数据|分析|统计/.test(text)) return "数据分析";
  if (/ui|design|css|design|界面|设计|样式/.test(text)) return "界面设计";
  if (/code|git|test|build|deploy|代码|测试|部署|研发/.test(text)) return "研发工具";
  return "效率提升";
}

export function SkillsHub({ backendReady, sessionId }: {
  backendReady: boolean;
  /** 技能目录按会话解析（skills/list 需要 sessionId） */
  sessionId: string;
}) {
  const [tab, setTab] = useState<"plugins" | "skills">("plugins");
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [agents, setAgents] = useState<AgentPresetRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("全部");

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

  const q = query.trim().toLowerCase();
  const shownPlugins = useMemo(
    () =>
      PLUGINS.filter(
        p =>
          (cat === "全部" || p.cat === cat) &&
          (q.length === 0 || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)),
      ),
    [cat, q],
  );
  const shownSkills = useMemo(
    () =>
      skills.filter(
        s =>
          (cat === "全部" || skillCategory(s) === cat) &&
          (q.length === 0 || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)),
      ),
    [skills, cat, q],
  );
  const shownAgents = useMemo(
    () =>
      agents.filter(
        a =>
          (cat === "全部" || cat === "效率提升") &&
          (q.length === 0 ||
            (a.name ?? a.id).toLowerCase().includes(q) ||
            (a.description ?? "").toLowerCase().includes(q)),
      ),
    [agents, cat, q],
  );

  /* 分类 hero 卡（图一）：取插件最多的前三类，各列前 3 项。 */
  const heroCats = useMemo(() => {
    const byCat = new Map<string, PluginEntry[]>();
    for (const p of PLUGINS) {
      const list = byCat.get(p.cat) ?? [];
      list.push(p);
      byCat.set(p.cat, list);
    }
    return [...byCat.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name, items]) => ({ name, items: items.slice(0, 3) }));
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[1080px] px-7 py-6">
        {/* 头部（图一）：标题 + 副标题 + 右侧管理钮 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">插件市场</h1>
            <p className="mt-1 text-[12.5px] text-outline">
              发现并安装插件、技能等扩展，拓展 Magic 的能力。
            </p>
          </div>
          <button
            type="button"
            title="管理已安装的扩展（随实例挂载，暂无卸载通道）"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
          >
            <Icon name="tune" className="text-[15px]" />
            管理
          </button>
        </div>

        {/* 分页 + 搜索（图一：左 tab 底边高亮，右搜索框） */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex items-stretch gap-6 border-b border-surface-container-highest">
            {([
              { id: "plugins" as const, label: "插件" },
              { id: "skills" as const, label: "技能" },
            ]).map(item => (
              <button
                key={item.id}
                type="button"
                data-market-tab={item.id}
                onClick={() => setTab(item.id)}
                className={`-mb-px cursor-pointer border-b-2 pb-2 text-[13.5px] font-medium transition-colors ${
                  tab === item.id
                    ? "border-b-primary text-on-surface"
                    : "border-b-transparent text-outline hover:text-on-surface"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex h-8 w-64 items-center gap-2 rounded-lg border border-line bg-surface-container-lowest px-3 focus-within:border-line-strong transition-colors">
            <Icon name="search" className="text-[15px] text-outline shrink-0" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={tab === "plugins" ? "搜索插件" : "搜索技能与智能体"}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </div>

        {!backendReady && tab === "skills" ? (
          <EmptyState
            icon="cloud_off"
            title="未连接运行时"
            detail="技能与智能体清单来自 DSH runtime。请用 /?backend=web 打开并完成授权后查看。"
          />
        ) : tab === "skills" && state === "loading" ? (
          <EmptyState icon="progress_activity" title="正在加载…" detail="" spin />
        ) : tab === "skills" && state === "error" ? (
          <EmptyState icon="error" title="加载失败" detail={error} />
        ) : (
          <>
            {/* 分类 hero 卡（图一；仅插件页） */}
            {tab === "plugins" && cat === "全部" && q.length === 0 && (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {heroCats.map(({ name, items }) => (
                  <button
                    key={name}
                    type="button"
                    data-market-hero={name}
                    onClick={() => setCat(name)}
                    className="flex cursor-pointer items-stretch justify-between gap-3 overflow-hidden rounded-xl border border-surface-container-high/60 bg-surface-container-lowest p-4 text-left transition-colors hover:border-line hover:bg-surface-container-low"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-semibold text-on-surface">{name}</span>
                      <span className="mt-2 flex flex-col gap-1.5">
                        {items.map(item => (
                          <span key={item.id} className="flex items-center gap-2 text-[12.5px] text-on-surface-variant">
                            <Icon name={item.icon} className="text-[15px] text-outline shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                    {/* 装饰面（无外部图片资源：渐变 + 大图标拼贴） */}
                    <span className="flex w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-container/40 via-tertiary-container/30 to-surface-container-high">
                      <Icon name={items[0]?.icon ?? "extension"} className="text-[30px] text-on-surface-variant/70" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 分类筛选 chips（图一） */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {["全部", ...CATEGORIES].map(name => (
                <button
                  key={name}
                  type="button"
                  data-market-chip={name}
                  onClick={() => setCat(name)}
                  className={`h-7 cursor-pointer rounded-full px-3 text-[12px] font-medium transition-colors ${
                    cat === name
                      ? "bg-surface-container-high text-on-surface"
                      : "text-outline hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            {tab === "plugins" ? (
              <PluginGrid items={shownPlugins} cat={cat} />
            ) : (
              <>
                <Group title="技能" count={shownSkills.length} hint="SKILL.md 规范定义、可被模型或用户调起的能力">
                  {shownSkills.length === 0 ? (
                    <GroupEmpty>没有匹配的技能</GroupEmpty>
                  ) : (
                    <Grid>
                      {shownSkills.map(skill => (
                        <MarketCard
                          key={skill.path ?? skill.name}
                          icon="extension"
                          title={skill.name}
                          detail={skill.description}
                          cat={skillCategory(skill)}
                          actionLabel="已安装"
                        />
                      ))}
                    </Grid>
                  )}
                </Group>
                <Group title="智能体" count={shownAgents.length} hint="会话创建期固定的能力组合（内置 standard / ptc / minimal / cordis）">
                  {shownAgents.length === 0 ? (
                    <GroupEmpty>没有匹配的智能体</GroupEmpty>
                  ) : (
                    <Grid>
                      {shownAgents.map(agent => (
                        <MarketCard
                          key={agent.id}
                          icon="smart_toy"
                          title={agent.name ?? agent.id}
                          detail={agent.description ?? agent.trust ?? ""}
                          cat="效率提升"
                          actionLabel="已内置"
                          badges={
                            <>
                              {agent.isDefault === true ? <Badge>默认</Badge> : null}
                              {agent.broken === true ? <Badge tone="error">异常</Badge> : null}
                            </>
                          }
                        />
                      ))}
                    </Grid>
                  )}
                </Group>
                <Group title="MCP" count={0} hint="Model Context Protocol 服务器与工具">
                  <div className="rounded-xl border border-dashed border-surface-container-highest px-4 py-3 text-[12px] text-outline leading-relaxed">
                    DSH runtime 当前未暴露 MCP 服务清单接口（已核查 mcp-client 插件无远程枚举端点）——
                    接入后这里会列出已连接的 MCP 服务器与工具。
                  </div>
                </Group>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PluginGrid({ items, cat }: { items: PluginEntry[]; cat: string }) {
  const groups = cat === "全部"
    ? CATEGORIES.map(name => ({ name, items: items.filter(p => p.cat === name) })).filter(g => g.items.length > 0)
    : [{ name: cat, items }];
  if (items.length === 0) {
    return <GroupEmpty>没有匹配的插件</GroupEmpty>;
  }
  return (
    <>
      {groups.map(group => (
        <Group key={group.name} title={group.name} count={group.items.length} hint="">
          <Grid>
            {group.items.map(item => (
              <MarketCard
                key={item.id}
                icon={item.icon}
                title={item.name}
                detail={item.desc}
                cat={item.cat}
                actionLabel="已内置"
              />
            ))}
          </Grid>
        </Group>
      ))}
    </>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Group({ title, count, hint, children }: {
  title: string;
  count: number;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-medium text-on-surface-variant">{title}</span>
        {count > 0 ? <span className="text-[11px] text-outline/70">{count}</span> : null}
        {hint.length > 0 ? <span className="text-[11px] text-outline/60 truncate">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function GroupEmpty({ children }: { children: ReactNode }) {
  return <div className="py-1 text-[12.5px] text-outline/80">{children}</div>;
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

/** 市场卡片（图一：圆角图标块 + 名称/两行描述 + 右侧动作 pill）。 */
function MarketCard({ icon, title, detail, cat, actionLabel, badges }: {
  icon: string;
  title: string;
  detail: string;
  cat: string;
  actionLabel: string;
  badges?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-surface-container-high/40 py-3 pr-1 transition-colors hover:bg-surface-container-low/40">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant shadow-hairline">
        <Icon name={icon} className="text-[19px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-on-surface">{title}</span>
          {badges}
        </div>
        <div className="mt-0.5 line-clamp-2 min-h-[16px] text-[11.5px] leading-relaxed text-outline">
          {detail.length > 0 ? detail : cat}
        </div>
      </div>
      <button
        type="button"
        title={actionLabel}
        className="flex h-7 shrink-0 cursor-default items-center gap-1 rounded-full border border-line px-2.5 text-[12px] font-medium text-on-surface-variant"
      >
        <Icon name="check" className="text-[13px]" />
        {actionLabel}
      </button>
    </div>
  );
}

function EmptyState({ icon, title, detail, spin }: {
  icon: string;
  title: string;
  detail: string;
  spin?: boolean;
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-2 text-center">
      <Icon name={icon} className={`text-[28px] text-outline ${spin === true ? "animate-spin" : ""}`} />
      <div className="text-[14px] font-medium text-on-surface-variant">{title}</div>
      {detail.length > 0 ? <div className="max-w-[420px] text-[12.5px] text-outline">{detail}</div> : null}
    </div>
  );
}
