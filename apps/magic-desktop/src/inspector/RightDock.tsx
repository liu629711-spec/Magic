/**
 * 右坞（Right Dock）：右侧停靠面板，把已 vendored 的 better-sidebar 三个真实能力
 * （文件树 / 文件变动 / 终端）接进 Magic 客户端。宽 520px、tab 栏在顶部。
 * 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L343-344
 * （<!-- RIGHT: Code Diff, Staged Files & Review Dock -->，右栏 520px）。
 *
 * 数据全部来自本机 dsh web 实例的 /sidebar/* 真实路由（经 Vite 代理同源），无 mock：
 * - 文件     → FileTree + /sidebar/api/fs.tree（根 = 当前会话 cwd，懒加载逐层列目录）
 *              + 行点击 → 坞内文件预览（fs.read 真实内容）；行上「@文件」→ 对话输入框草稿
 * - 文件变动 → /sidebar/api/git.status 列真实改动 + /sidebar/api/git.diff 取真实 diff，
 *              diff 体渲染复用 vendored DiffFiles
 * - 终端     → TerminalView + /sidebar/ws/terminal（真实 PTY，支持 echo hi 等输入）
 * 没有打开会话时三个 tab 都显示「选择一个会话」。
 *
 * 诚实边界（本坞目前没接通的部分，代码里都是显式空实现，不造假数据）：
 * - 设计稿原有的「审查 / 浏览器 / 侧边聊天」无可靠真实数据源，未放入 tab 栏。
 * - 历史提交（git.log）与暂存/提交操作未接：本坞只做「看」的真实闭环。
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
import { api, createSidebarStore, DiffFiles, FileTree, formatBytes, relativeTo, TerminalView, t } from "../vendor/better-sidebar/index.ts";
import { toggleExpanded, type SidebarSnapshot, type SidebarStore } from "../vendor/better-sidebar/state.ts";
import type { GitStatusEntry, GitStatusResult, SessionScope } from "../vendor/better-sidebar/api.ts";
import { loadPrefs } from "../vendor/better-sidebar/prefs.ts";
import { summarizeResults, uploadHintText, uploadToDir, type UploadItem } from "../vendor/better-sidebar/upload.ts";
// CEO 委派图卡右坞（2026-09-18）：图卡点成员/CEO 节点打开的「团队」tab = 成员详情 / 团队总览。
import { CeoWorkspace } from "../vendor/ceo/client/CeoWorkspace.ts";
import { ceoT } from "../vendor/ceo/client/dict.ts";
import { getCeoRoster, getCeoRosterSessionId, getSelectedCeoMember, subscribeCeoSelection } from "../vendor/ceo/client/selection.ts";
import { displayCeoSeat } from "../vendor/ceo/team.ts";

/** 可用 tab：原设计稿的「审查/浏览器/侧边聊天」无真实数据源，不放入（诚实处理）。
 *  「团队」tab 仅在 CEO 名册非空、或被图卡 openWorkspace 显式打开时出现（避免死 tab）。 */
type DockTabId = "files" | "changes" | "terminal" | "team";

const DOCK_TABS: { id: DockTabId; label: string; icon: string }[] = [
  { id: "files", label: "文件", icon: "folder" },
  { id: "changes", label: "文件变动", icon: "difference" },
  { id: "terminal", label: "终端", icon: "terminal" },
];
const TEAM_TAB_ICON = "groups";

/**
 * 终端 tab id：非 `agent:` 前缀即宿主眼里的「UI 终端」，宿主按 (sessionId, tab)
 * 维护 PTY。固定值即可——每个会话的 PTY 表是独立的，同一会话复用同一 shell。
 */
const DOCK_TERMINAL_TAB = "terminal:magic-rightdock";

/** 空数组常量：FileTree 的 revealed 入参（避免每次渲染新建引用触发其内部 memo 失效）。 */
const NO_REVEALED: string[] = [];

export function RightDock({ sessionId, cwd, onQuoteFile, teamOpenToken, sendIntervention }: {
  sessionId: string;
  cwd: string | undefined;
  /** @ 引用桥：把 `@<相对路径> ` 注入对话输入框草稿（App 持注入 token）。 */
  onQuoteFile?: (path: string) => void;
  /** 图卡点成员/CEO 节点：token 自增 → 切到「团队」tab（App 持 token）。 */
  teamOpenToken?: number;
  /** 成员干预（halt/redirect/resume/retry/replan）写回当前会话（App 的 promptToSession）。 */
  sendIntervention?: (message: string) => void;
}) {
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

  // 团队 tab（2026-09-18）：订阅 selection store 的名册/选中态（图卡 publishCeoTeam 写入）。
  const roster = useSyncExternalStore(subscribeCeoSelection, getCeoRoster, getCeoRoster);
  const selectedMember = useSyncExternalStore(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember);
  const rosterSessionId = useSyncExternalStore(subscribeCeoSelection, getCeoRosterSessionId, getCeoRosterSessionId);
  // 被图卡显式打开过（openWorkspace token 自增）后，即使名册暂空也保留 tab（避免死 tab 消失）。
  const [teamForced, setTeamForced] = useState(false);
  const lastTeamToken = useRef(teamOpenToken ?? 0);
  useEffect(() => {
    const token = teamOpenToken ?? 0;
    if (token === lastTeamToken.current) return;
    lastTeamToken.current = token;
    setTeamForced(true);
    setActive("team");
  }, [teamOpenToken]);
  // 名册是模块级单例：切换会话时收起显式打开态，且只认当前会话的名册
  // （否则非 CEO 会话会残留上一个会话的「团队」死 tab）。
  useEffect(() => { setTeamForced(false); }, [sessionId]);
  const rosterHere = rosterSessionId === undefined || rosterSessionId === sessionId;
  const showTeam = open && ((roster.length > 0 && rosterHere) || teamForced);
  const teamTitle = selectedMember === null ? "团队总览" : displayCeoSeat(selectedMember, roster);
  const dockTabs = showTeam
    ? [...DOCK_TABS, { id: "team" as DockTabId, label: teamTitle, icon: TEAM_TAB_ICON }]
    : DOCK_TABS;

  // 文件预览状态上提：团队 tab 的产出文件点击复用坞内预览（切回文件 tab + 打开路径）。
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  useEffect(() => { setPreviewPath(null); }, [sessionId]);
  const openFileInDock = useCallback((path: string) => {
    setPreviewPath(path);
    setActive("files");
  }, []);

  return (
    <aside className="vendor-bs w-[520px] shrink-0 bg-surface-container-lowest border-l border-surface-container-highest flex flex-col overflow-hidden">
      <DockTabBar tabs={dockTabs} active={active} onSelect={setActive} disabled={!open} />
      {!open ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-[13px] text-outline">
          选择一个会话
        </div>
      ) : (
        /* flex 列容器：vendored 组件根（.explorerBody / .terminalWrap）是 flex:1，需要确定高度的父层 */
        <div className="flex-1 min-h-0 flex flex-col">
          {active === "files" ? (
            <FilesTab
              scope={scope}
              store={store}
              snapshot={snapshot}
              onQuoteFile={onQuoteFile}
              previewPath={previewPath}
              onOpenPreview={setPreviewPath}
              onClosePreview={() => { setPreviewPath(null); }}
            />
          ) : active === "changes" ? (
            <ChangesTab scope={scope} />
          ) : active === "team" ? (
            <CeoWorkspace
              sessionId={sessionId}
              sendIntervention={sendIntervention}
              onOpenFile={openFileInDock}
              onClose={() => { setActive("files"); }}
              t={ceoT}
            />
          ) : (
            <TerminalView scope={scope} tabId={DOCK_TERMINAL_TAB} store={store} />
          )}
        </div>
      )}
    </aside>
  );
}

function DockTabBar({
  tabs,
  active,
  onSelect,
  disabled,
}: {
  tabs: { id: DockTabId; label: string; icon: string }[];
  active: DockTabId;
  onSelect: (id: DockTabId) => void;
  disabled: boolean;
}) {
  return (
    <div className="h-10 shrink-0 bg-surface-container-lowest border-b border-surface-container-highest flex items-center px-2 select-none gap-0.5">
      {tabs.map(tab => {
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

/** 文件 tab：真实文件树 + 真实上传（拖拽 / 右键「上传到此处」）+ 坞内文件预览 + @引用。
 *  预览状态由 RightDock 持有（团队 tab 的产出文件点击也要复用坞内预览）。 */
function FilesTab({
  scope,
  store,
  snapshot,
  onQuoteFile,
  previewPath,
  onOpenPreview,
  onClosePreview,
}: {
  scope: SessionScope;
  store: SidebarStore;
  snapshot: SidebarSnapshot;
  onQuoteFile?: (path: string) => void;
  /** 坞内预览的文件（绝对路径）；null = 显示文件树。 */
  previewPath: string | null;
  onOpenPreview: (path: string) => void;
  onClosePreview: () => void;
}) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const expanded = snapshot.state?.expanded ?? [];

  /** @ 引用：FileTree 给的是绝对路径，桥只传相对路径（宿主的 @ 语义）。 */
  const quote = (path: string): void => {
    onQuoteFile?.(relativeTo(scope.cwd ?? "", path));
  };

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
      {/* 预览时把树隐藏而非卸载（保留其已加载的目录缓存与滚动位置）；
          display:contents 让 FileTree 根仍是坞 flex 列的直属项。 */}
      <div className={previewPath !== null ? "hidden" : "contents"}>
        <FileTree
          sessionId={scope.sessionId}
          cwd={scope.cwd}
          store={store}
          expanded={expanded}
          revealed={NO_REVEALED}
          onToggle={path => {
            store.reduce(state => toggleExpanded(state, path));
          }}
          // 行点击 → 坞内预览（FileTree 只对文件行调 onOpenFile）。
          onOpenFile={path => {
            onOpenPreview(path);
          }}
          // 行上「@文件」→ 对话输入框草稿（跨模块桥，经 App 注入 PromptBar）。
          onReferenceFile={path => {
            quote(path);
          }}
          refreshTick={refreshTick}
          onUploadRequest={onUploadRequest}
          busy={busy}
        />
      </div>
      {previewPath !== null && (
        <FilePreview
          scope={scope}
          path={previewPath}
          onClose={onClosePreview}
          onQuote={() => {
            quote(previewPath);
          }}
        />
      )}
    </>
  );
}

/** 预览截断阈值（客户端兜底；宿主 fs.read 自身也可能截断，两者取其一即提示）。 */
const PREVIEW_MAX_LINES = 4000;
const PREVIEW_MAX_BYTES = 256 * 1024;

/** 预览面板的数据态：加载中 / 文本（含是否截断）/ 二进制 / 读失败。 */
type PreviewState =
  | { kind: "loading" }
  | { kind: "text"; content: string; truncated: boolean; lines: number }
  | { kind: "binary"; size: number }
  | { kind: "error"; message: string };

/** 应用客户端截断：先按字节截（避免超长单行），再按行数截。 */
function capPreviewText(content: string, hostTruncated: boolean): PreviewState {
  let text = content;
  let truncated = hostTruncated;
  if (text.length > PREVIEW_MAX_BYTES) {
    text = text.slice(0, PREVIEW_MAX_BYTES);
    truncated = true;
  }
  const allLines = text.split("\n");
  if (allLines.length > PREVIEW_MAX_LINES) {
    text = allLines.slice(0, PREVIEW_MAX_LINES).join("\n");
    truncated = true;
  }
  return { kind: "text", content: text, truncated, lines: Math.min(allLines.length, PREVIEW_MAX_LINES) };
}

/**
 * 坞内文件预览：真实 /sidebar/api/fs.read。头部 = 返回 + 路径 +「@ 引用」；
 * 正文等宽字体 + 行号栏（两列 pre，行号仅一个文本节点，无逐行 DOM）；
 * 二进制 / 读失败给友好提示，绝不显示假内容。
 */
function FilePreview({
  scope,
  path,
  onClose,
  onQuote,
}: {
  scope: SessionScope;
  path: string;
  onClose: () => void;
  onQuote: () => void;
}) {
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .fsRead(scope, path)
      .then(view => {
        if (cancelled) return;
        setState(
          view.kind === "text"
            ? capPreviewText(view.content, view.truncated)
            : { kind: "binary", size: view.size },
        );
      })
      .catch(reason => {
        if (cancelled) return;
        setState({ kind: "error", message: errorMessage(reason) });
      });
    return () => {
      cancelled = true;
    };
  }, [scope, path]);

  /** 相对 cwd 的展示路径（会话 cwd 未知时退回绝对路径）。 */
  const shownPath = scope.cwd !== undefined ? relativeTo(scope.cwd, path) : path;
  const lineNumberText =
    state.kind === "text"
      ? Array.from({ length: state.lines }, (_, i) => String(i + 1)).join("\n")
      : "";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-9 shrink-0 flex items-center gap-1.5 px-2 border-b border-surface-container-highest">
        <button
          type="button"
          title="返回文件树"
          aria-label="返回文件树"
          onClick={onClose}
          className="w-6 h-6 shrink-0 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" className="text-[15px]" />
        </button>
        <span className="min-w-0 flex-1 truncate text-[12px] text-on-surface" title={path}>
          {shownPath}
        </span>
        <button
          type="button"
          title="引用到对话输入框"
          onClick={onQuote}
          className="shrink-0 h-6 px-2 rounded text-[12px] text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          @ 引用
        </button>
      </div>

      {state.kind === "text" && state.truncated && (
        <div className="shrink-0 px-3 py-1.5 text-[12px] text-on-surface-variant border-b border-surface-container-highest">
          文件过大，仅显示前 {state.lines} 行
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto bg-surface-container-lowest">
        {state.kind === "loading" ? (
          <Placeholder>{t("loading")}</Placeholder>
        ) : state.kind === "error" ? (
          <Placeholder tone="error">读取失败：{state.message}</Placeholder>
        ) : state.kind === "binary" ? (
          <Placeholder>二进制文件（{formatBytes(state.size)}），暂不支持预览</Placeholder>
        ) : state.content.length === 0 ? (
          <Placeholder>空文件</Placeholder>
        ) : (
          <div className="flex min-h-full w-max min-w-full">
            <pre
              aria-hidden="true"
              className="shrink-0 select-none border-r border-surface-container-highest px-2 py-2 text-right font-mono text-[12px] leading-[18px] text-outline"
            >
              {lineNumberText}
            </pre>
            <pre className="flex-1 px-3 py-2 font-mono text-[12px] leading-[18px] text-on-surface">
              {state.content}
            </pre>
          </div>
        )}
      </div>
    </div>
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