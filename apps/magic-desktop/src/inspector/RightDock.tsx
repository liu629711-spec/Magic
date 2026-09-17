/**
 * 右坞（Right Dock）：右侧停靠面板，把已 vendored 的 better-sidebar 三个真实能力
 * （文件树 / 文件变动 / 终端）接进 Magic 客户端。宽 520px、tab 栏在顶部。
 * 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L343-344
 * （<!-- RIGHT: Code Diff, Staged Files & Review Dock -->，右栏 520px）。
 *
 * 数据全部来自本机 dsh web 实例的 /sidebar/* 真实路由（经 Vite 代理同源），无 mock：
 * - 文件     → FileTree + /sidebar/api/fs.tree（根 = 当前会话 cwd，懒加载逐层列目录）
 * - 文件变动 → /sidebar/api/git.status 列真实改动 + /sidebar/api/git.diff 取真实 diff，
 *              diff 体渲染复用 vendored DiffFiles
 * - 终端     → TerminalView + /sidebar/ws/terminal（真实 PTY，支持 echo hi 等输入）
 * 没有打开会话时三个 tab 都显示「选择一个会话」。
 *
 * 诚实边界（本坞目前没接通的部分，代码里都是显式空实现，不造假数据）：
 * - FileTree 的行点击（坞内文件预览面板未接）与 @引用按钮（需要写入对话区输入框草稿，
 *   跨模块桥未接），见 FilesTab 里的 onOpenFile / onReferenceFile。
 * - 设计稿原有的「审查 / 浏览器 / 侧边聊天」无可靠真实数据源，未放入 tab 栏。
 * - 历史提交（git.log）与暂存/提交操作未接：本坞只做「看」的真实闭环。
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
import { api, createSidebarStore, DiffFiles, FileTree, TerminalView, t } from "../vendor/better-sidebar/index.ts";
import { toggleExpanded, type SidebarSnapshot, type SidebarStore } from "../vendor/better-sidebar/state.ts";
import type { GitStatusEntry, GitStatusResult, SessionScope } from "../vendor/better-sidebar/api.ts";
import { loadPrefs } from "../vendor/better-sidebar/prefs.ts";
import { summarizeResults, uploadHintText, uploadToDir, type UploadItem } from "../vendor/better-sidebar/upload.ts";

/** 可用 tab：原设计稿的「审查/浏览器/侧边聊天」无真实数据源，不放入（诚实处理）。 */
type DockTabId = "files" | "changes" | "terminal";

const DOCK_TABS: { id: DockTabId; label: string; icon: string }[] = [
  { id: "files", label: "文件", icon: "folder" },
  { id: "changes", label: "文件变动", icon: "difference" },
  { id: "terminal", label: "终端", icon: "terminal" },
];

/**
 * 终端 tab id：非 `agent:` 前缀即宿主眼里的「UI 终端」，宿主按 (sessionId, tab)
 * 维护 PTY。固定值即可——每个会话的 PTY 表是独立的，同一会话复用同一 shell。
 */
const DOCK_TERMINAL_TAB = "terminal:magic-rightdock";

/** 空数组常量：FileTree 的 revealed 入参（避免每次渲染新建引用触发其内部 memo 失效）。 */
const NO_REVEALED: string[] = [];

export function RightDock({ sessionId, cwd }: { sessionId: string; cwd: string | undefined }) {
  // 一个会话一份侧栏状态（展开集合 / 布局），store 实例随坞存活，会话切换只换内部状态。
  const storeRef = useRef<SidebarStore | undefined>(undefined);
  if (storeRef.current === undefined) storeRef.current = createSidebarStore();
  const store = storeRef.current;

  useEffect(() => {
    store.setSession(sessionId.length > 0 ? sessionId : undefined);
  }, [store, sessionId]);

  // 侧卡偏好（终端字体、工作区路径检测开关等）走插件自己的 settings 路由；取不到就用默认值。
  useEffect(() => {
    void loadPrefs(api).then(prefs => store.setPrefs(prefs));
  }, [store]);

  const snapshot = useSyncExternalStore(
    useCallback((onChange: () => void) => store.subscribe(onChange), [store]),
    useCallback(() => store.getSnapshot(), [store]),
  );

  // cwd 兜底：会话摘要偶尔不带 cwd，而 fs/git 路由都以它作为根，这里向宿主问一次。
  const [resolvedCwd, setResolvedCwd] = useState<string | undefined>(cwd);
  useEffect(() => {
    setResolvedCwd(cwd);
    if (cwd !== undefined || sessionId.length === 0) return;
    let cancelled = false;
    api.sessionCwd({ sessionId })
      .then(view => {
        if (!cancelled && view.cwd.length > 0) setResolvedCwd(view.cwd);
      })
      .catch(() => {
        // 取不到 cwd 就保持空态：fs/git 路由随后会用宿主侧会话信息自行解析或报错。
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, cwd]);

  const scope = useMemo<SessionScope>(
    () => ({ sessionId, ...(resolvedCwd !== undefined ? { cwd: resolvedCwd } : {}) }),
    [sessionId, resolvedCwd],
  );

  const [active, setActive] = useState<DockTabId>("files");
  const open = sessionId.length > 0;

  return (
    <aside className="vendor-bs w-[520px] shrink-0 bg-surface-container-lowest border-l border-surface-container-highest flex flex-col overflow-hidden">
      <DockTabBar active={active} onSelect={setActive} disabled={!open} />
      {!open ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-[13px] text-outline">
          选择一个会话
        </div>
      ) : (
        /* flex 列容器：vendored 组件根（.explorerBody / .terminalWrap）是 flex:1，需要确定高度的父层 */
        <div className="flex-1 min-h-0 flex flex-col">
          {active === "files" ? (
            <FilesTab scope={scope} store={store} snapshot={snapshot} />
          ) : active === "changes" ? (
            <ChangesTab scope={scope} />
          ) : (
            <TerminalView scope={scope} tabId={DOCK_TERMINAL_TAB} store={store} />
          )}
        </div>
      )}
    </aside>
  );
}

function DockTabBar({
  active,
  onSelect,
  disabled,
}: {
  active: DockTabId;
  onSelect: (id: DockTabId) => void;
  disabled: boolean;
}) {
  return (
    <div className="h-10 shrink-0 bg-surface-container-lowest border-b border-surface-container-highest flex items-center px-2 select-none gap-0.5">
      {DOCK_TABS.map(tab => {
        const isActive = tab.id === active;
        const tone = isActive
          ? "border-b-2 border-primary bg-surface-container text-on-surface font-medium"
          : "text-outline hover:text-on-surface hover:bg-surface-container-low";
        return (
          <button
            key={tab.id}
            type="button"
            disabled={disabled}
            title={tab.label}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 h-full px-2.5 text-[13px] shrink-0 transition-colors ${tone} ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <Icon name={tab.icon} className={`text-[15px] ${isActive ? "text-primary" : ""}`} />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 文件 tab：真实文件树 + 真实上传（拖拽 / 右键「上传到此处」）。 */
function FilesTab({
  scope,
  store,
  snapshot,
}: {
  scope: SessionScope;
  store: SidebarStore;
  snapshot: SidebarSnapshot;
}) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const expanded = snapshot.state?.expanded ?? [];

  const onUploadRequest = (dir: string, items: UploadItem[]): void => {
    if (items.length === 0) return;
    setBusy(true);
    void uploadToDir(scope, dir, items, (done, total, current) => {
      setHint(uploadHintText(done, total, current, dir, t));
    })
      .then(results => {
        setHint(summarizeResults(results, t));
        setRefreshTick(value => value + 1); // 上传落盘后刷新树，让新文件立刻出现
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      {hint !== null && (
        <div className="shrink-0 px-3 py-1.5 text-[12px] text-on-surface-variant border-b border-surface-container-highest">
          {hint}
        </div>
      )}
      <FileTree
        sessionId={scope.sessionId}
        cwd={scope.cwd}
        store={store}
        expanded={expanded}
        revealed={NO_REVEALED}
        onToggle={path => {
          store.reduce(state => toggleExpanded(state, path));
        }}
        // 坞内文件预览面板未接：点击行暂为显式空实现（不是假的预览数据）。
        onOpenFile={() => {}}
        // @引用需要写入对话区输入框草稿，跨模块桥未接：显式空实现。
        onReferenceFile={() => {}}
        refreshTick={refreshTick}
        onUploadRequest={onUploadRequest}
        busy={busy}
      />
    </>
  );
}

/** 把 git 状态里的相对路径（相对仓库根）拼成绝对路径：宿主的 fs 路由只收绝对路径。 */
function resolveUnder(root: string | undefined, rel: string): string {
  if (/^[a-zA-Z]:[\\/]/.test(rel) || rel.startsWith("/") || rel.startsWith("\\")) return rel;
  if (root === undefined || root.length === 0) return rel;
  const separator = root.includes("\\") ? "\\" : "/";
  return `${root.replace(/[\\/]+$/, "")}${separator}${rel.split(/[\\/]+/).join(separator)}`;
}

/** 行徽标：X=index，Y=worktree（镜像 GitLens.tsx:28-34）。 */
function badgeOf(entry: GitStatusEntry): string {
  const index = entry.xy[0];
  if (index !== undefined && index !== " " && index !== "?") return index;
  const worktree = entry.xy[1];
  if (worktree !== undefined && worktree !== " " && worktree !== "?") return worktree;
  return "?";
}

/** 是否有已暂存（index）改动——X 位被置上（镜像 GitLens.tsx:37-40）。 */
function isStagedEntry(entry: GitStatusEntry): boolean {
  const index = entry.xy[0];
  return index !== undefined && index !== " " && index !== "?";
}

/** 是否未跟踪（`??`）：git diff 永远不覆盖它，只能按整文件新增渲染。 */
function isUntracked(entry: GitStatusEntry): boolean {
  return badgeOf(entry) === "?";
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/** 已加载的 diff 表面：git diff 文本，或未跟踪文件的整文件内容。 */
interface DiffData {
  diff: string;
  untrackedPath?: string;
  untrackedContent?: string;
}

/** 文件变动 tab：真实 git 状态列表 + 点行看真实 diff（最小闭环，不含暂存/提交）。 */
function ChangesTab({ scope }: { scope: SessionScope }) {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<GitStatusEntry | null>(null);
  const [data, setData] = useState<DiffData | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  /** 请求序号：快速连点不同文件时丢弃过期响应，避免把旧文件的 diff 落到新行上。 */
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .gitStatus(scope)
      .then(result => {
        if (cancelled) return;
        setStatus(result);
        setLoading(false);
      })
      .catch(reason => {
        if (cancelled) return;
        setError(errorMessage(reason));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, tick]);

  // 会话/工作目录切换：清掉上一作用域的选中行与 diff。
  useEffect(() => {
    setSelected(null);
    setData(null);
    setDiffError(null);
  }, [scope]);

  const openDiff = (entry: GitStatusEntry): void => {
    const requestId = (requestRef.current += 1);
    const untracked = isUntracked(entry);
    const staged = !untracked && isStagedEntry(entry);
    setSelected(entry);
    setData(null);
    setDiffError(null);
    setDiffLoading(true);

    const load = async (): Promise<DiffData> => {
      let result = await api.gitDiff(scope, entry.path, staged);
      // 请求的那一侧为空时回退另一侧一次（文件可能在页打开后被暂存/取消暂存）。
      if (result.diff === "" && !untracked) {
        const other = await api.gitDiff(scope, entry.path, !staged);
        if (other.diff !== "") result = other;
      }
      if (result.diff !== "") return { diff: result.diff };
      if (untracked) {
        const view = await api.fsRead(scope, resolveUnder(scope.cwd, entry.path));
        return { diff: "", untrackedPath: entry.path, untrackedContent: view.kind === "text" ? view.content : "" };
      }
      return { diff: "" };
    };

    load()
      .then(next => {
        if (requestId !== requestRef.current) return;
        setData(next);
        setDiffLoading(false);
      })
      .catch(reason => {
        if (requestId !== requestRef.current) return;
        setDiffError(errorMessage(reason));
        setDiffLoading(false);
      });
  };

  const entries = status?.entries ?? [];

  return (
    <>
      <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-surface-container-highest">
        <span className="text-[12px] text-on-surface-variant truncate">
          {status?.isRepo === true ? (status.branch ?? "") : ""}
        </span>
        <span className="ml-auto text-[12px] text-outline shrink-0">{entries.length} 项改动</span>
        <button
          type="button"
          title={t("refresh")}
          aria-label={t("refresh")}
          onClick={() => {
            setTick(value => value + 1);
          }}
          className="w-7 h-7 shrink-0 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <Icon name="refresh" className="text-[15px]" />
        </button>
      </div>

      {loading ? (
        <Placeholder>{t("loading")}</Placeholder>
      ) : error !== null ? (
        <Placeholder tone="error">{error}</Placeholder>
      ) : status !== null && !status.isRepo ? (
        <Placeholder>{t("notRepo")}</Placeholder>
      ) : (
        <>
          {status?.truncated === true && <Placeholder>{t("statusTruncated")}</Placeholder>}
          {entries.length === 0 ? (
            <Placeholder>{t("noChanges")}</Placeholder>
          ) : (
            <div
              className={`overflow-y-auto ${
                selected === null ? "flex-1 min-h-0" : "max-h-[45%] shrink-0"
              }`}
            >
              {entries.map(entry => {
                const isSelected = selected?.path === entry.path;
                return (
                  <button
                    key={entry.path}
                    type="button"
                    title={entry.path}
                    onClick={() => openDiff(entry)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                      isSelected ? "bg-surface-container" : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center text-[11px] font-semibold text-primary">
                      {badgeOf(entry)}
                    </span>
                    <span className="text-[12px] text-on-surface-variant truncate">{entry.path}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selected !== null && (
            <div className="flex-1 min-h-0 flex flex-col border-t border-surface-container-highest">
              <div className="h-8 shrink-0 flex items-center gap-2 px-3 border-b border-surface-container-highest">
                <span className="text-[12px] text-on-surface truncate" title={selected.path}>
                  {selected.path}
                </span>
                <button
                  type="button"
                  title={t("changesClosePreview")}
                  aria-label={t("changesClosePreview")}
                  onClick={() => {
                    requestRef.current += 1; // 关闭即作废在途请求
                    setSelected(null);
                    setData(null);
                    setDiffError(null);
                  }}
                  className="ml-auto w-6 h-6 shrink-0 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {diffLoading ? (
                  <Placeholder>{t("loading")}</Placeholder>
                ) : diffError !== null ? (
                  <Placeholder tone="error">
                    {t("diffLoadError")}: {diffError}
                  </Placeholder>
                ) : data === null ? null : data.untrackedPath !== undefined ? (
                  <DiffFiles diff="" untrackedPath={data.untrackedPath} untrackedContent={data.untrackedContent ?? ""} />
                ) : data.diff !== "" ? (
                  <DiffFiles diff={data.diff} />
                ) : (
                  <Placeholder>{t("diffEmpty")}</Placeholder>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Placeholder({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <div
      className={`px-4 py-3 text-[12px] ${
        tone === "error" ? "text-error" : "text-outline"
      }`}
    >
      {children}
    </div>
  );
}