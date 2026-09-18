// 设置页（2026-09-17 用户裁定，参考图二 ChatGPT 式整页设置：左侧分类导航 + 右侧内容，
// 非弹窗）。数据源（真实 runtime，无则空态）：
// - 常规/终端/浏览器：better-sidebar 插件偏好（/sidebar/api/settings.get|update，
//   字段见 plugins/dsh-better-sidebar/src/client/prefs.ts:40-123）
// - 模型：官方 DSH 形态重做（2026-09-18），provider 卡列表 + 内嵌编辑卡，见 ./models-section.tsx
// - 外观：DSH ui-theme 走 host user-settings 通道，暂未标定 → 置灰占位（诚实标注）
// - 技能与插件：跳转技能扩展页（用户裁定「插件功能做进技能扩展」）
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
import { getSidebarPrefs, updateSidebarPrefs, type SidebarPrefs } from "../adapters/dsh-web/sidebar-api";
import { readRecentLimit, writeRecentLimit } from "./local-prefs";
import { ModelsSection } from "./models-section";

type SectionId = "general" | "appearance" | "models" | "terminal" | "browser";

export function SettingsPage({ onBack, onOpenSkills, backendReady }: {
  onBack: () => void;
  onOpenSkills: () => void;
  backendReady: boolean;
}) {
  const [section, setSection] = useState<SectionId>("general");
  const [prefs, setPrefs] = useState<SidebarPrefs>({});
  const [revision, setRevision] = useState<number | undefined>(undefined);
  const [prefsError, setPrefsError] = useState("");
  // 最近任务展示数量（本地偏好，2026-09-17 用户裁定）
  const [recentLimit, setRecentLimit] = useState<number>(() => readRecentLimit());

  useEffect(() => {
    if (!backendReady) return;
    getSidebarPrefs()
      .then(result => {
        setPrefs(result.prefs);
        setRevision(result.revision);
        setPrefsError("");
      })
      .catch((cause: unknown) => setPrefsError(cause instanceof Error ? cause.message : String(cause)));
  }, [backendReady]);

  /** 写一项偏好（乐观更新 + revision 保护）。 */
  const patchPref = useCallback(
    (patch: Record<string, unknown>) => {
      setPrefs(prev => ({ ...prev, ...patch }));
      updateSidebarPrefs(patch, revision)
        .then(result => {
          setPrefs(result.prefs);
          setRevision(result.revision);
        })
        .catch((cause: unknown) =>
          setPrefsError(cause instanceof Error ? cause.message : String(cause)),
        );
    },
    [revision],
  );

  const navItems: { id: SectionId; icon: string; label: string }[] = [
    { id: "general", icon: "settings", label: "常规" },
    { id: "appearance", icon: "palette", label: "外观" },
    { id: "models", icon: "smart_toy", label: "模型" },
    { id: "terminal", icon: "terminal", label: "终端" },
    { id: "browser", icon: "public", label: "浏览器" },
  ];

  return (
    <div className="h-screen flex bg-surface text-on-surface select-none">
      {/* 左：设置导航（图二式） */}
      <aside className="w-[272px] shrink-0 bg-surface-container-lowest border-r border-surface-container-high flex flex-col">
        <div className="p-space-sm space-y-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 h-8 px-2 rounded-lg text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Icon name="arrow_back" className="text-[17px]" />
            <span>返回应用</span>
          </button>
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-surface-container-low focus-within:bg-surface-container-high transition-colors">
            <Icon name="search" className="text-[16px] text-outline shrink-0" />
            <input
              placeholder="搜索设置…"
              className="flex-1 bg-transparent outline-none text-[13px] text-on-surface placeholder:text-outline"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <div className="px-2 pt-2 pb-1 text-[11.5px] font-medium text-outline">个人</div>
          {navItems.slice(0, 3).map(item => (
            <SettingsNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={section === item.id}
              onClick={() => setSection(item.id)}
            />
          ))}
          <div className="px-2 pt-4 pb-1 text-[11.5px] font-medium text-outline">集成</div>
          <SettingsNavItem icon="extension" label="技能与插件" active={false} onClick={onOpenSkills} />
          {navItems.slice(3).map(item => (
            <SettingsNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={section === item.id}
              onClick={() => setSection(item.id)}
            />
          ))}
        </nav>
      </aside>

      {/* 右：内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-8 py-8">
          {!backendReady ? (
            <div className="text-[13px] text-outline">
              未连接运行时：设置项来自 DSH runtime，请用 /?backend=web 打开并完成授权。
            </div>
          ) : (
            <>
              {prefsError.length > 0 ? (
                <div className="mb-4 text-[12.5px] text-error">设置同步异常：{prefsError}</div>
              ) : null}
              {section === "general" ? (
                <SectionBlock title="常规" desc="Magic 工作方式的基础偏好。">
                  <SettingRow
                    title="最近任务最多展示"
                    desc="左栏「最近任务」区最多渲染的条数（列表仍自适应高度，超出滚动查看）。"
                    control={
                      <TextField
                        value={String(recentLimit)}
                        narrow
                        onCommit={v => {
                          const n = Number.parseInt(v, 10);
                          if (Number.isFinite(n) && n > 0) {
                            writeRecentLimit(n);
                            setRecentLimit(n);
                          } else {
                            setRecentLimit(readRecentLimit());
                          }
                        }}
                      />
                    }
                  />
                  <SettingRow
                    title="自动打开子代理"
                    desc="子代理会话启动时自动切换到其对话视图。"
                    control={<Toggle checked={prefs.autoOpenSubagent !== false} onChange={v => patchPref({ autoOpenSubagent: v })} />}
                  />
                  <SettingRow
                    title="自动打开任务"
                    desc="后台任务产生输出时自动展开任务视图。"
                    control={<Toggle checked={prefs.autoOpenJobs !== false} onChange={v => patchPref({ autoOpenJobs: v })} />}
                  />
                  <SettingRow
                    title="代理打开工具面板"
                    desc="允许代理在需要时自动打开侧边工具面板。"
                    control={<Toggle checked={prefs.agentOpenTools !== false} onChange={v => patchPref({ agentOpenTools: v })} />}
                  />
                </SectionBlock>
              ) : null}
              {section === "appearance" ? (
                <SectionBlock title="外观" desc="主题与字号。">
                  <div className="text-[12.5px] text-outline">
                    主题与内容字号由 DSH UI 主题服务管理（host settings），接入通道标定后开放；
                    当前界面固定暗色。
                  </div>
                </SectionBlock>
              ) : null}
              {section === "models" ? <ModelsSection /> : null}
              {section === "terminal" ? (
                <SectionBlock title="终端" desc="内置终端的启动方式与显示。">
                  <SettingRow
                    title="Shell"
                    desc="终端使用的 shell 可执行文件（留空用系统默认）。"
                    control={
                      <TextField
                        value={typeof prefs.terminalShell === "string" ? prefs.terminalShell : ""}
                        placeholder="默认"
                        onCommit={v => patchPref({ terminalShell: v })}
                      />
                    }
                  />
                  <SettingRow
                    title="终端字号"
                    desc="终端内容字号（像素）。"
                    control={
                      <TextField
                        value={String(typeof prefs.terminalFontSize === "number" ? prefs.terminalFontSize : 13)}
                        onCommit={v => {
                          const n = Number.parseInt(v, 10);
                          if (Number.isFinite(n)) patchPref({ terminalFontSize: n });
                        }}
                        narrow
                      />
                    }
                  />
                  <SettingRow
                    title="代理可使用终端工具"
                    desc="允许代理在会话中调用终端工具。"
                    control={<Toggle checked={prefs.agentTerminalTools !== false} onChange={v => patchPref({ agentTerminalTools: v })} />}
                  />
                  <SettingRow
                    title="底部面板自动切终端"
                    desc="底部面板打开时默认展示终端标签。"
                    control={<Toggle checked={prefs.bottomPanelAutoTerminal === true} onChange={v => patchPref({ bottomPanelAutoTerminal: v })} />}
                  />
                </SectionBlock>
              ) : null}
              {section === "browser" ? (
                <SectionBlock title="浏览器" desc="内置浏览器的安全与拦截策略。">
                  <SettingRow
                    title="无沙箱模式"
                    desc="关闭浏览器沙箱（仅在你信任所访问页面时开启）。"
                    control={<Toggle checked={prefs.browserNoSandbox === true} onChange={v => patchPref({ browserNoSandbox: v })} />}
                  />
                  <SettingRow
                    title="拦截页面链接"
                    desc="点击页面内链接时在侧边浏览器中打开而不跳转外部。"
                    control={<Toggle checked={prefs.browserInterceptLinks !== false} onChange={v => patchPref({ browserInterceptLinks: v })} />}
                  />
                  <SettingRow
                    title="拦截 http 导航"
                    desc="将 http 导航收拢到侧边浏览器。"
                    control={<Toggle checked={prefs.browserInterceptHttp === true} onChange={v => patchPref({ browserInterceptHttp: v })} />}
                  />
                  <SettingRow
                    title="拦截 https 导航"
                    desc="将 https 导航收拢到侧边浏览器。"
                    control={<Toggle checked={prefs.browserInterceptHttps === true} onChange={v => patchPref({ browserInterceptHttps: v })} />}
                  />
                  <SettingRow
                    title="允许的本地回环"
                    desc="允许浏览器访问的 loopback 地址（默认 localhost）。"
                    control={
                      <TextField
                        value={typeof prefs.browserAllowedLoopback === "string" ? prefs.browserAllowedLoopback : ""}
                        placeholder="localhost"
                        onCommit={v => patchPref({ browserAllowedLoopback: v })}
                      />
                    }
                  />
                </SectionBlock>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsNavItem({ icon, label, active, onClick }: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 h-8 px-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
        active
          ? "bg-surface-container text-on-surface font-medium"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <Icon name={icon} className="text-[16px] shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** 设置分区（图二式：标题 + 说明 + 卡片组）。 */
function SectionBlock({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section>
      <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">{title}</h1>
      <p className="mt-1 text-[12.5px] text-outline">{desc}</p>
      <div className="mt-4 rounded-xl border border-surface-container-high bg-surface-container-lowest overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function SettingRow({ title, desc, control }: { title: string; desc: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t first:border-t-0 border-surface-container-high/60">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-on-surface">{title}</div>
        <div className="mt-0.5 text-[11.5px] text-outline leading-relaxed">{desc}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-8 h-[18px] rounded-full p-[2px] flex items-center transition-colors cursor-pointer ${
        checked ? "bg-primary-container justify-end" : "bg-surface-container-high justify-start"
      }`}
    >
      <span className={`w-[14px] h-[14px] rounded-full ${checked ? "bg-on-primary-container" : "bg-outline"}`} />
    </button>
  );
}

function TextField({ value, placeholder, narrow, onCommit }: {
  value: string;
  placeholder?: string;
  narrow?: boolean;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={event => {
        if (event.key === "Enter") onCommit(draft);
      }}
      className={`h-7 px-2.5 rounded-md bg-surface-container-low focus:bg-surface-container-high outline-none text-[12.5px] text-on-surface placeholder:text-outline transition-colors ${
        narrow === true ? "w-[72px]" : "w-[200px]"
      }`}
    />
  );
}