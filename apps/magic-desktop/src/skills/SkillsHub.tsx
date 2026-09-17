// 技能扩展页（2026-09-17 用户裁定：这里存放 **技能 / MCP / 智能体**，不展示 DSH 插件）。
// 数据源（真实 runtime）：
// - 技能：Remote `skills/list` {request:{sessionId}} → SkillEntry[]
//   （session-controller/src/skill-catalog.ts:35-90，过滤 isUserInvocable）
// - 智能体：Remote `agentPresets/list` → AgentPresetRoster{presets[], authorable, modeSelectionEnabled}
//   （preset/agent-presets/src/types.ts:11-34；内置 standard/ptc/minimal/cordis）
// - MCP：DSH 的 mcp-client 插件无 Remote 枚举端点（已核查），暂为诚实空态
// unconnected 模式显示空态提示，不造假数据。
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

export function SkillsHub({ backendReady, sessionId }: {
  backendReady: boolean;
  /** 技能目录按会话解析（skills/list 需要 sessionId） */
  sessionId: string;
}) {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [agents, setAgents] = useState<AgentPresetRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    if (!backendReady || sessionId.length === 0) {
      setState("idle");
      return;
    }
    setState("loading");
    Promise.all([
      dshRpc<{ skills: SkillEntry[] }>("skills/list", { request: { sessionId } }),
      // 智能体 roster：无参方法，args 形状做兜底尝试；失败不影响技能列表
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
  const shownSkills = useMemo(
    () =>
      q.length === 0
        ? skills
        : skills.filter(
            s => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q),
          ),
    [skills, q],
  );
  const shownAgents = useMemo(
    () =>
      q.length === 0
        ? agents
        : agents.filter(
            a =>
              (a.name ?? a.id).toLowerCase().includes(q) ||
              (a.description ?? "").toLowerCase().includes(q),
          ),
    [agents, q],
  );

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-[1080px] mx-auto px-7 py-5">
        {/* 头部：标题 + 计数 + 刷新 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold tracking-tight text-on-surface">技能扩展</h1>
              {state === "ready" ? (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11.5px] font-medium tabular-nums">
                  {skills.length} 个技能 · {agents.length} 个智能体
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12.5px] text-outline">
              管理智能体、技能与 MCP 连接，扩展 Magic 的能力边界。
            </p>
          </div>
          <button
            type="button"
            title="刷新"
            onClick={load}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer shrink-0"
          >
            <Icon name="refresh" className="text-[17px]" />
          </button>
        </div>

        {/* 搜索（图三式全宽） */}
        <div className="mt-4 flex items-center gap-2 h-9 px-3 rounded-lg bg-surface-container-low focus-within:bg-surface-container-high transition-colors">
          <Icon name="search" className="text-[16px] text-outline shrink-0" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索智能体与技能…"
            className="flex-1 bg-transparent outline-none text-[13px] text-on-surface placeholder:text-outline"
          />
        </div>

        {!backendReady ? (
          <EmptyState
            icon="cloud_off"
            title="未连接运行时"
            detail="智能体与技能清单来自 DSH runtime。请用 /?backend=web 打开并完成授权后查看。"
          />
        ) : state === "loading" ? (
          <EmptyState icon="progress_activity" title="正在加载…" detail="" spin />
        ) : state === "error" ? (
          <EmptyState icon="error" title="加载失败" detail={error} />
        ) : (
          <>
            {/* 智能体（agent presets） */}
            <Group
              title="智能体"
              count={shownAgents.length}
              hint="会话创建期固定的能力组合（内置 standard / ptc / minimal / cordis）"
            >
              {shownAgents.length === 0 ? (
                <GroupEmpty>没有匹配的智能体</GroupEmpty>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {shownAgents.map(agent => (
                    <Card
                      key={agent.id}
                      icon="smart_toy"
                      tone="primary"
                      title={agent.name ?? agent.id}
                      subtitle={agent.id}
                      detail={agent.description ?? agent.trust ?? ""}
                      badges={
                        <>
                          {agent.isDefault === true ? <Badge tone="tertiary">默认</Badge> : null}
                          {agent.broken === true ? <Badge tone="error">异常</Badge> : null}
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </Group>

            {/* 技能（skills） */}
            <Group title="技能" count={shownSkills.length} hint="SKILL.md 规范定义、可被模型或用户调起的能力">
              {shownSkills.length === 0 ? (
                <GroupEmpty>没有匹配的技能</GroupEmpty>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {shownSkills.map(skill => (
                    <Card
                      key={skill.path ?? skill.name}
                      icon="extension"
                      tone="tertiary"
                      title={skill.name}
                      subtitle={skill.path}
                      detail={skill.description}
                      badges={null}
                    />
                  ))}
                </div>
              )}
            </Group>

            {/* MCP（诚实空态：DSH 暂无枚举接口） */}
            <Group title="MCP" count={0} hint="Model Context Protocol 服务器与工具">
              <div className="rounded-xl border border-dashed border-surface-container-highest px-4 py-3 text-[12px] text-outline leading-relaxed">
                DSH runtime 当前未暴露 MCP 服务清单接口（已核查 mcp-client 插件无远程枚举端点）——
                接入后这里会列出已连接的 MCP 服务器与工具。
              </div>
            </Group>
          </>
        )}
      </div>
    </div>
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
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-medium text-outline">
          {title} · {count}
        </span>
        <span className="text-[11px] text-outline/60 truncate">{hint}</span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function GroupEmpty({ children }: { children: ReactNode }) {
  return <div className="text-[12.5px] text-outline/80 py-1">{children}</div>;
}

function Badge({ tone, children }: { tone: "tertiary" | "error"; children: ReactNode }) {
  return (
    <span
      className={`px-1.5 py-[1px] rounded text-[10.5px] font-medium shrink-0 ${
        tone === "tertiary"
          ? "bg-tertiary-container/25 text-tertiary"
          : "bg-error-container/40 text-error"
      }`}
    >
      {children}
    </span>
  );
}

/** 密集卡片（两列；图标块 + 名称 + 描述，细边框层次）。 */
function Card({ icon, tone, title, subtitle, detail, badges }: {
  icon: string;
  tone: "primary" | "tertiary";
  title: string;
  subtitle?: string;
  detail: string;
  badges: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-surface-container-lowest border border-surface-container-high/60 hover:bg-surface-container-low hover:border-surface-container-highest transition-colors min-w-0">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          tone === "primary" ? "bg-primary-container/15 text-primary" : "bg-tertiary-container/15 text-tertiary"
        }`}
      >
        <Icon name={icon} className="text-[17px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-medium text-on-surface truncate">{title}</span>
          {badges}
        </div>
        <div className="mt-0.5 text-[11.5px] text-outline leading-relaxed line-clamp-2 min-h-[16px]">
          {detail.length > 0 ? detail : subtitle ?? ""}
        </div>
      </div>
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
      {detail.length > 0 ? <div className="text-[12.5px] text-outline max-w-[420px]">{detail}</div> : null}
    </div>
  );
}