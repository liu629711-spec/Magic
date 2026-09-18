import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../sidebar/Icon";
import { api, createSidebarStore, DiffFiles, FileTree, formatBytes, relativeTo, TerminalView, t } from "../vendor/better-sidebar/index.ts";
import { toggleExpanded, type SidebarSnapshot, type SidebarStore } from "../vendor/better-sidebar/state.ts";
import type { GitStatusEntry, GitStatusResult, SessionScope } from "../vendor/better-sidebar/api.ts";
import { loadPrefs } from "../vendor/better-sidebar/prefs.ts";
import { DockTabBar, type DockTabDef, type DockTabId } from "./DockTabBar";
import { summarizeResults, uploadHintText, uploadToDir, type UploadItem } from "../vendor/better-sidebar/upload.ts";
// CEO 委派图卡右坞（2026-09-18）：图卡点成员/CEO 节点打开的「团队」tab = 成员详情 / 团队总览。
import { CeoWorkspace } from "../vendor/ceo/client/CeoWorkspace.ts";
import { ceoT } from "../vendor/ceo/client/dict.ts";

import { DockBrowser, DockJobs, DockSideChat, type DockSessionBridge } from './DockPanels';
import { resolveFilePath } from './file-path';
const DOCK_TABS: DockTabDef[] = [
 {id:'files',label:'文件',icon:'folder_open'}, {id:'changes',label:'文件变动',icon:'difference'},
 {id:'jobs',label:'任务管理',icon:'checklist'}, {id:'terminal',label:'终端',icon:'terminal'},
 {id:'browser',label:'浏览器',icon:'language'}, {id:'sidechat',label:'侧边聊天',icon:'chat_bubble_outline'},
];
const START: DockTabDef = {id:'start',label:'开始',icon:'home'};
/** 图三「开始」页条目图标色（文件/任务管理=琥珀、文件变动=绿、浏览器=蓝；其余默认描边色）。 */
const DOCK_ICON_TONE: Partial<Record<string, string>> = {
  files: 'text-[#e8a262]',
  changes: 'text-[#4edea3]',
  jobs: 'text-[#e8a262]',
  browser: 'text-[#4d93f8]',
};
const NO_REVEALED: string[] = [];
const DOCK_TERMINAL_TAB = 'terminal:magic-rightdock';
export function RightDock({sessionId,cwd,onQuoteFile,teamOpenToken,sendIntervention,collapsed,onToggleCollapsed,fullscreen,onToggleFullscreen,dockTabRequest,fileRequest,bridge}: {
 sessionId:string; cwd:string|undefined; onQuoteFile?:(path:string)=>void; teamOpenToken?:number;
 sendIntervention?:(message:string)=>void; collapsed?:boolean; onToggleCollapsed?:()=>void;
 fullscreen?:boolean; onToggleFullscreen?:()=>void;
 dockTabRequest?:{tab:string;seq:number;sessionId:string}|null;
 fileRequest?:{path:string;seq:number;sessionId:string}|null;
 bridge:DockSessionBridge;
}) {
 const [store] = useState(createSidebarStore);
 useEffect(()=>{store.setSession(sessionId || undefined)},[store,sessionId]);
 useEffect(()=>{void loadPrefs(api).then(prefs=>store.setPrefs(prefs))},[store]);
 const snapshot = useSyncExternalStore(useCallback(fn=>store.subscribe(fn),[store]),useCallback(()=>store.getSnapshot(),[store]));
 const [resolvedCwd,setResolvedCwd] = useState(cwd);
 useEffect(()=>{let cancelled=false;setResolvedCwd(cwd);if(!cwd && sessionId) void api.sessionCwd({sessionId}).then(v=>{if(!cancelled)setResolvedCwd(v.cwd)}).catch(()=>{/* File requests report missing cwd. */});return()=>{cancelled=true}},[cwd,sessionId]);
 const scope = useMemo<SessionScope>(()=>({sessionId,cwd:resolvedCwd}),[sessionId,resolvedCwd]);
 const [opened,setOpened] = useState<DockTabId[]>([]);
 const [active,setActive] = useState<DockTabId>('start');
 const [previewPath,setPreviewPath] = useState<string|null>(null);
 const [changesCount,setChangesCount] = useState<number|null>(null);
 const reopenTab = useCallback((id:DockTabId)=>{if(id!=='start')setOpened(prev=>prev.includes(id)?prev:[...prev,id]);setActive(id)},[]);
 const openFileInDock = useCallback((path:string)=>{const resolved=resolveFilePath(path,resolvedCwd);if(resolved!==null){setPreviewPath(resolved);reopenTab('files')}},[resolvedCwd,reopenTab]);
 const lastFile = useRef(0);
 useEffect(()=>{if(fileRequest && fileRequest.sessionId===sessionId && fileRequest.seq!==lastFile.current){if(!resolvedCwd && !/^(?:[a-z]:[\\/]|[/\\])/i.test(fileRequest.path))return;lastFile.current=fileRequest.seq;openFileInDock(fileRequest.path)}},[fileRequest,sessionId,openFileInDock,resolvedCwd]);
 const lastTab = useRef(0);
 useEffect(()=>{if(dockTabRequest && dockTabRequest.sessionId===sessionId && dockTabRequest.seq!==lastTab.current){lastTab.current=dockTabRequest.seq;const tab=[...DOCK_TABS,{id:'team' as const},START].find(t=>t.id===dockTabRequest.tab);if(tab)reopenTab(tab.id)}},[dockTabRequest,sessionId,reopenTab]);
 const lastTeam=useRef(teamOpenToken ?? 0);
 useEffect(()=>{if(teamOpenToken!==undefined && lastTeam.current!==teamOpenToken){lastTeam.current=teamOpenToken;reopenTab('team')}},[teamOpenToken,reopenTab]);
 const closeTab=(id:DockTabId)=>{const next=opened.filter(t=>t!==id);setOpened(next);if(active===id)setActive(next.at(-1)??'start');if(id==='files')setPreviewPath(null)};
 const definitions=[...DOCK_TABS,{id:'team' as const,label:'团队',icon:'groups'}];
 const tabs=[...(active==='start'||opened.length===0?[START]:[]),...opened.map(id=>definitions.find(t=>t.id===id)!).filter(Boolean)];
 return <aside data-right-dock className={'vendor-bs min-h-0 bg-surface-container-lowest border-l border-surface-container-highest flex flex-col overflow-hidden shrink-0 ' + (collapsed?'w-[44px]':fullscreen?'flex-1 min-w-0':'w-[min(520px,42vw)]')}>
 <div className={collapsed?'hidden':'contents'}>
 <DockTabBar tabs={tabs} active={active} changesCount={changesCount} fullscreen={fullscreen===true} onToggleFullscreen={onToggleFullscreen} onSelect={setActive} onCloseTab={closeTab} onStart={()=>setActive('start')} onCollapse={onToggleCollapsed}/>
 {active==='start' && <div data-dock-guide className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5 overflow-y-auto py-6">
  {/* 罗盘英雄图（官方 GuideBody.tsx:70-83 CompassGlyph 56px 语义） */}
  <span className="material-symbols-outlined mb-3 text-[56px] leading-none text-outline opacity-40" aria-hidden>explore</span>
  {DOCK_TABS.map(tab => (
    <button type="button" key={tab.id} disabled={!sessionId} onClick={() => reopenTab(tab.id)}
      title={tab.label}
      className="flex h-14 w-[380px] max-w-full shrink-0 items-center gap-3 rounded-[24px] border border-line bg-surface px-5 text-[15px] text-on-surface transition-colors hover:border-line-strong hover:bg-surface-container-low focus-visible:outline focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">
      <Icon name={tab.icon} className={`text-[18px] ${DOCK_ICON_TONE[tab.id] ?? 'text-outline'}`} />
      {tab.label}
    </button>
  ))}
  {!sessionId && <p className="pt-2 text-xs text-outline">选择会话后打开面板</p>}
 </div>}
 {opened.map(id=><div key={id} hidden={active!==id} className={active===id?'flex-1 min-h-0 flex flex-col':'hidden'}>
 {id==='files'?<FilesTab scope={scope} store={store} snapshot={snapshot} onQuoteFile={onQuoteFile} previewPath={previewPath} onOpenPreview={openFileInDock} onClosePreview={()=>setPreviewPath(null)}/>:
 id==='changes'?<ChangesTab scope={scope} onCountChange={setChangesCount}/>:
 id==='terminal'?<TerminalView scope={scope} tabId={DOCK_TERMINAL_TAB} store={store}/>:
 id==='browser'?<DockBrowser store={store}/>:
 id==='jobs'?<DockJobs scope={scope} bridge={bridge}/>:
 id==='sidechat'?<DockSideChat scope={scope} bridge={bridge} onOpenFile={openFileInDock}/>:
 <CeoWorkspace sessionId={sessionId} sendIntervention={sendIntervention} onOpenFile={openFileInDock} onClose={()=>closeTab('team')} t={ceoT}/>}
 </div>)}
 </div>
 {collapsed && <button type="button" aria-label="展开右坞" className="h-10 text-outline hover:text-on-surface" onClick={onToggleCollapsed}><Icon name="right_panel_open" /></button>}
 </aside>
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

/** 审查 tab（原「文件变动」）：真实 git 状态列表 + 点行看真实 diff（最小闭环，不含暂存/提交）。
 *  gitStatus 拉到结果后经 onCountChange 上报变更文件数 → tab 行「审查」徽标。 */
function ChangesTab({
  scope,
  onCountChange,
}: {
  scope: SessionScope;
  /** 上报变更文件数；null = 拿不到（失败），tab 行不显示徽标。 */
  onCountChange?: (count: number | null) => void;
}) {
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
        onCountChange?.(result.entries.length);
      })
      .catch(reason => {
        if (cancelled) return;
        setError(errorMessage(reason));
        setLoading(false);
        onCountChange?.(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, tick, onCountChange]);

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