// 技能扩展页（2026-09-17 用户裁定，参考 codex_04_skills_hub 设计稿 + 图三插件市场，
// 图三优先、更密集；左栏不变，主区整体替换）。
// 数据源（真实 runtime）：
// - 技能：Remote `skills/list` {request:{sessionId}} → {skills:[{name,path?,description,whenToUse?}]}
//   （session-controller/src/skill-catalog.ts:35-90，过滤 isUserInvocable）
// - 插件：Remote `pluginInventory/list` → {entries:[{entryId,moduleName,enabled,fiberPhase}]}
//   （host/plugin-inventory/src/types.ts:16-23；无参方法）
// mock 模式（未连接 runtime）显示空态提示，不造假数据。
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../sidebar/Icon";
import { dshRpc } from "../adapters/dsh-web/rpc";

export interface SkillEntry {
  name: string;
  path?: string;
  description: string;
  whenToUse?: string;
  modelInvocable?: boolean;
}

export interface PluginEntry {
  entryId: string;
  moduleName: string;
  enabled: boolean;
  fiberPhase: string;
}

export function SkillsHub({ backendReady, sessionId }: {
  backendReady: boolean;
  /** 技能目录按会话解析（skills/list 需要 sessionId） */
  sessionId: string;
}) {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
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
      // 插件清单纯附加：失败不影响技能列表
      dshRpc<{ entries: PluginEntry[] }>("pluginInventory/list", {}).catch(() => ({ entries: [] })),
    ])
      .then(([skillResult, pluginResult]) => {
        setSkills(skillResult.skills ?? []);
        setPlugins(pluginResult.entries ?? []);
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
  const shownPlugins = useMemo(
    () =>
      q.length === 0
        ? plugins
        : plugins.filter(
            p => p.entryId.toLowerCase().includes(q) || p.moduleName.toLowerCase().includes(q),
          ),
    [plugins, q],
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
                  {skills.length} 个技能 · {plugins.length} 个插件
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12.5px] text-outline">
              管理运行时可用的技能与插件，扩展 Magic 的能力边界。
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

        {/* 搜索（图三式全宽，密集） */}
        <div className="mt-4 flex items-center gap-2 h-9 px-3 rounded-lg bg-surface-container-low focus-within:bg-surface-container-high transition-colors">
          <Icon name="search" className="text-[16px] text-outline shrink-0" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索技能与插件…"
            className="flex-1 bg-transparent outline-none text-[13px] text-on-surface placeholder:text-outline"
          />
        </div>

        {!backendReady ? (
          <EmptyState
            icon="cloud_off"
            title="未连接运行时"
            detail="技能与插件清单来自 DSH runtime。请用 /?backend=web 打开并完成授权后查看。"
          />
        ) : state === "loading" ? (
          <EmptyState icon="progress_activity" title="正在加载技能与插件…" detail="" spin />
        ) : state === "error" ? (
          <EmptyState icon="error" title="加载失败" detail={error} />
        ) : (
          <>
            {/* 已安装横排（图三式图标行）：插件模块名首字 */}
            {shownPlugins.length > 0 ? (
              <section className="mt-5">
                <div className="text-[12px] font-medium text-outline">已安装</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shownPlugins.slice(0, 14).map(plugin => (
                    <div
                      key={plugin.entryId}
                      title={plugin.moduleName}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold select-none ${
                        plugin.enabled
                          ? "bg-surface-container-high text-on-surface"
                          : "bg-surface-container text-outline/50"
                      }`}
                    >
                      {plugin.entryId.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                  {shownPlugins.length > 14 ? (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11.5px] text-outline bg-surface-container">
                      +{shownPlugins.length - 14}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* 技能列表（两列密集行） */}
            <section className="mt-5">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-medium text-outline">技能 · {shownSkills.length}</div>
              </div>
              {shownSkills.length === 0 ? (
                <div className="mt-2 text-[12.5px] text-outline/80">没有匹配的技能</div>
              ) : (
                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
                  {shownSkills.map(skill => (
                    <div
                      key={skill.path ?? skill.name}
                      title={skill.whenToUse ?? skill.description}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-container-low transition-colors min-w-0"
                    >
                      <div className="w-7 h-7 rounded-md bg-surface-container-high text-tertiary flex items-center justify-center shrink-0">
                        <Icon name="extension" className="text-[15px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-on-surface truncate">{skill.name}</div>
                        <div className="text-[11.5px] text-outline truncate">{skill.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 插件列表（两列密集行） */}
            <section className="mt-6 mb-2">
              <div className="text-[12px] font-medium text-outline">插件 · {shownPlugins.length}</div>
              {shownPlugins.length === 0 ? (
                <div className="mt-2 text-[12.5px] text-outline/80">没有匹配的插件</div>
              ) : (
                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
                  {shownPlugins.map(plugin => (
                    <div
                      key={plugin.entryId}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-container-low transition-colors min-w-0"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          plugin.enabled ? "bg-tertiary" : "bg-outline/50"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-on-surface truncate">{plugin.entryId}</div>
                        <div className="text-[11.5px] text-outline truncate">{plugin.moduleName}</div>
                      </div>
                      <span className="text-[11px] text-outline shrink-0 tabular-nums">{plugin.fiberPhase}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
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