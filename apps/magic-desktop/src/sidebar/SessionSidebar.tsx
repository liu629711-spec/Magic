import { useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import { Icon } from "./Icon";
import { Folder3DIcon } from "./Folder3DIcon";
import { SearchPalette, type PaletteSession } from "./SearchPalette";
import {
  initialWorkspaces,
  navItems,
  pinnedTasks,
  product,
  tasks,
  user,
  type SessionStatus,
  type Workspace,
} from "./mock-data";

const row =
  "group relative flex items-center justify-between h-8 px-2 rounded-xl text-on-surface-variant transition-[background-color,color,transform] duration-150 active:scale-[0.98] truncate cursor-pointer w-full";

const rowLabel = "text-[14px] font-medium truncate";

const actionBtn =
  "w-6 h-6 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-[opacity,background-color,color] cursor-pointer";

/** 会话列表展示上限（2026-09-17 用户裁定：超过 5 条收起，展开后滚动查找）。 */
const LIST_LIMIT = 5;

/** 会话位置（origin 记忆 + 拖拽来源）。index 为所在列表的基数组下标。 */
type Loc = {
  section: "pinned" | "ws" | "task";
  wsId?: string;
  index?: number;
};

/** 置顶 mock 任务自带的状态图标数据（跟随会话移动；移出置顶区降级为纯文本行）。 */
type PinTask = {
  id: string;
  status?: SessionStatus;
  dot: string;
  current?: boolean;
};

type PinnedItem = {
  key: string;
  base: string;
  task?: PinTask;
  /** 取消置顶/拖出后的回归位置（裁定 19：点击置顶后可回到原来的位置） */
  origin: Loc;
};

type DragItem = {
  key: string;
  base: string;
  task?: PinTask;
  from: Loc;
};

type DropHint = { key: string; before: boolean } | { zone: string } | null;

type DropHandlers = {
  active: boolean;
  onDragOver: (e: ReactDragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: ReactDragEvent) => void;
};

/**
 * 左栏会话区。
 * 2026-09-16 用户三轮交互裁定：
 * 1) 所有行整行可点（含文字右侧空白与缩进区）；
 * 2) 置顶任务/项目/任务分组默认收起；收起时标题带「›」箭头，展开后无箭头、
 *    悬浮显示操作按钮（项目为 ··· 与 +，任务为 +），操作仅悬浮可见；
 * 3) 工作区行无展开箭头，点击行切换会话显隐，悬浮显示「添加新会话」按钮；
 * 4) 项目分组的 + 打开「创建项目」弹窗，创建后加入项目列表；
 * 5) 会话行为整行文本行（无图标、无缩进线）。
 * 2026-09-17 对话区 v2 联动：点击会话行切换对话区（onOpenSession），
 * 新建任务/添加会话开空白对话；active 会话行高亮。M1 静态：会话 id 即标题字符串。
 * 2026-09-17 左栏会话管理（裁定 18，对齐 Magic 组合 web 端 ui-workspace 包
 * locales.ts:38-47）：会话行 hover 出「⋯」操作菜单（重命名/分叉会话/归档会话）。
 * 2026-09-17 左栏会话整理（裁定 19，用户四图）：
 * 1) 任务行不再展示时间；
 * 2) 行 hover 操作 = 置顶 pin（在 ⋯ 前面，tooltip 置顶聊天）+ ⋯ 菜单；置顶行 pin
 *    实心常显（图三），点击取消置顶回到 origin 记忆的原位（工作区/任务区+下标）；
 * 3) 会话行可拖拽（HTML5 DnD）：拖到「置顶任务」头/空区 = 置顶；拖到工作区行/空区 =
 *    移入该工作区；行间拖动 = 排序（上下插入指示线）；无工作区的任务可拖进任意工作区；
 * 4) 新建任务下新增「搜索任务」入口 → SearchPalette（图四）：全部会话过滤 +
 *    ↑↓/Enter/Ctrl+数字 跳转 + 快捷操作（新聊天/导出当前会话 Markdown 可用；
 *    打开文件夹/搜索文件与设置组 M1 无后端，置灰占位）。
 * 回退时删掉 RowActions 中 pin、拖拽 handlers、SearchPalette 引用即可。
 */
export function SessionSidebar({ activeSessionId, onOpenSession, onForkSession, onExportSession, labels, onRenameSession, onCreateSession, remoteWorkspaces, remoteTaskSessions, showMockSections = true }: {
  activeSessionId: string
  onOpenSession: (id: string) => void
  onForkSession: (sourceId: string, forkId: string) => void
  onExportSession: (id: string) => void
  /** web 后端模式：会话 id → 显示名（session/list 的 title 投影） */
  labels?: Record<string, string>
  /** web 后端模式：重命名走 session/rename；缺省=本地覆盖（mock 模式） */
  onRenameSession?: (id: string, title: string) => void
  /** web 后端模式：新建任务走 session/create；缺省=本地开空白会话（mock 模式） */
  onCreateSession?: () => void
  /** web 后端模式：项目分组由真实会话按 cwd 归组（App 下发，随 refresh 更新） */
  remoteWorkspaces?: Workspace[]
  /** web 后端模式：任务区数据源 = 全部会话按最近时间倒序（App 下发；新建任务即排第一） */
  remoteTaskSessions?: string[]
  /** mock 数据分区显隐；web 后端模式传 false（置顶区转真实置顶、任务区转最近会话） */
  showMockSections?: boolean
}) {
  const [sectionOpen, setSectionOpen] = useState(() => ({
    pinned: false,
    // 2026-09-17 用户裁定：项目与任务区默认展开（对齐设计稿默认态）；置顶默认收起可接受
    projects: true,
    tasks: true,
  }));
  const [workspaces, setWorkspaces] = useState<Workspace[]>(remoteWorkspaces ?? initialWorkspaces);
  useEffect(() => {
    if (remoteWorkspaces === undefined) return;
    setWorkspaces(remoteWorkspaces);
    // 新出现的远程分组默认展开；用户手动折叠过的保持折叠
    setWsOpen(prev => {
      const next = { ...prev };
      for (const ws of remoteWorkspaces) {
        if (next[ws.id] === undefined) next[ws.id] = ws.expanded;
      }
      return next;
    });
  }, [remoteWorkspaces]);
  const [wsOpen, setWsOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((remoteWorkspaces ?? initialWorkspaces).map((ws) => [ws.id, ws.expanded])),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  // 点击完成/中断的会话行后，前置提示整个去掉变成纯文本行（2026-09-17 用户裁定，图二）
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  // v2 联动：新建会话序号（仅命名展示用）
  const newSessionSeq = useRef(0);
  // 会话管理（裁定 18）：显示名覆盖 / 归档隐藏 / 行菜单 / 重命名弹窗
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [rowMenu, setRowMenu] = useState<{
    key: string
    base: string
    section: "pinned" | "ws" | "task"
    wsId?: string
    x: number
    y: number
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ key: string; title: string } | null>(null);

  // 置顶（裁定 19）：mock 置顶任务 + 用户置顶会话统一进本列表；origin 记忆回归位置。
  // web 后端模式初始为空（mock 假数据不出现），用户 pin 真实会话后进入。
  const [pinned, setPinned] = useState<PinnedItem[]>(() =>
    showMockSections
      ? pinnedTasks.map((task) => ({
          key: task.id,
          base: task.title,
          task: { id: task.id, status: task.status, dot: task.dot, current: task.current },
          origin: { section: "task" as const, index: Number.MAX_SAFE_INTEGER },
        }))
      : [],
  );
  // 任务区（裁定 19）：时间展示去掉；拖拽排序/移入需要可变列表
  const [taskList, setTaskList] = useState<string[]>(() => tasks.map((t) => t.title));

  // 列表展开（2026-09-17 用户裁定）：超过 LIST_LIMIT 条收起，展开后容器滚动查找
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const toggleList = (key: string) =>
    setExpandedLists((s) => ({ ...s, [key]: !(s[key] ?? false) }));

  // 拖拽（裁定 19）：HTML5 DnD；dropHint 驱动插入指示线/目标区高亮
  const dragRef = useRef<DragItem | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);

  // 搜索任务（裁定 19 图四）
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 菜单/弹窗打开时 Esc 收起
  useEffect(() => {
    if (rowMenu === null && renameTarget === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRowMenu(null);
        setRenameTarget(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rowMenu, renameTarget]);

  /** 显示名：web 端标题投影 > 重命名覆盖 > 基准名。store/种子键始终用基准名（base）。 */
  const titleOf = (key: string, base: string) => labels?.[key] ?? renamed[key] ?? base;

  const statusOf = (task: PinTask | undefined): SessionStatus | "ack" =>
    acknowledged[task?.id ?? ""] ? "ack" : task?.status ?? "idle";
  const acknowledge = (id: string) =>
    setAcknowledged((s) => ({ ...s, [id]: true }));

  const toggleSection = (key: "pinned" | "projects" | "tasks") =>
    setSectionOpen((s) => ({ ...s, [key]: !s[key] }));
  const toggleWs = (id: string) => setWsOpen((s) => ({ ...s, [id]: !s[id] }));

  /** 会话当前所在位置（pin 时写进 origin；拖拽时作 from）。 */
  const locate = (key: string, section: "pinned" | "ws" | "task", wsId?: string): Loc => {
    if (section === "pinned") {
      return { section: "pinned", index: pinned.findIndex((p) => p.key === key) };
    }
    if (section === "task") {
      return { section: "task", index: taskList.indexOf(key) };
    }
    const sessions = wsId !== undefined ? workspaces.find((w) => w.id === wsId)?.sessions : undefined;
    return { section: "ws", wsId, index: sessions?.indexOf(key) ?? -1 };
  };

  /** 统一移动：从源列表移除 → 插入目标（beforeKey=null 追加）。置顶区内排序不覆盖 origin。 */
  const moveItem = (
    drag: DragItem,
    target: { section: "pinned" | "ws" | "task"; wsId?: string; beforeKey?: string | null },
  ) => {
    const origin: Loc =
      drag.from.section === "pinned" && target.section === "pinned"
        ? pinned.find((p) => p.key === drag.key)?.origin ?? { section: "task", index: Number.MAX_SAFE_INTEGER }
        : drag.from;
    if (drag.from.section === "pinned") {
      setPinned((list) => list.filter((p) => p.key !== drag.key));
    } else if (drag.from.section === "task") {
      setTaskList((list) => list.filter((k) => k !== drag.key));
    } else if (drag.from.wsId !== undefined) {
      const fromWs = drag.from.wsId;
      setWorkspaces((ws) =>
        ws.map((w) => (w.id === fromWs ? { ...w, sessions: w.sessions.filter((s) => s !== drag.key) } : w)),
      );
    }
    const insert = <T,>(list: readonly T[], item: T, keyOf: (x: T) => string, selfKey: string): T[] => {
      const next = list.filter((x) => keyOf(x) !== selfKey);
      const beforeKey = target.beforeKey;
      if (!beforeKey) {
        next.push(item);
      } else {
        const idx = next.findIndex((x) => keyOf(x) === beforeKey);
        if (idx < 0) next.push(item);
        else next.splice(idx, 0, item);
      }
      return next;
    };
    if (target.section === "pinned") {
      const item: PinnedItem = { key: drag.key, base: drag.base, task: drag.task, origin };
      setPinned((list) => insert(list, item, (p) => p.key, drag.key));
    } else if (target.section === "task") {
      // 任务/工作区条目的键=标题；mock 置顶任务 key 是侧栏 id、base 才是会话标题，
      // 拖出时必须落 base（否则标题丢失显示成 id）。
      setTaskList((list) => insert(list, drag.base, (k) => k, drag.base));
    } else if (target.wsId !== undefined) {
      const targetWs = target.wsId;
      setWorkspaces((ws) =>
        ws.map((w) => (w.id === targetWs ? { ...w, sessions: insert(w.sessions, drag.base, (s) => s, drag.base) } : w)),
      );
      setWsOpen((s) => ({ ...s, [targetWs]: true }));
    }
  };

  /** 置顶：记下当前位置作 origin，移入置顶列表尾（图二：点击置顶 → 指定到置顶任务模块）。 */
  const pinRow = (key: string, base: string, section: "pinned" | "ws" | "task", wsId?: string, task?: PinTask) => {
    moveItem({ key, base, task, from: locate(key, section, wsId) }, { section: "pinned" });
  };

  /** 取消置顶：回 origin（下标越界则追加），pin 恢复空心（图三：取消置顶聊天）。 */
  const unpinRow = (item: PinnedItem) => {
    const list =
      item.origin.section === "task"
        ? taskList
        : item.origin.wsId !== undefined
          ? workspaces.find((w) => w.id === item.origin.wsId)?.sessions ?? []
          : [];
    const idx = item.origin.index ?? Number.MAX_SAFE_INTEGER;
    const beforeKey = idx < list.length ? list[idx] ?? null : null;
    moveItem(
      { key: item.key, base: item.base, task: item.task, from: { section: "pinned" } },
      { section: item.origin.section === "ws" ? "ws" : item.origin.section, wsId: item.origin.wsId, beforeKey },
    );
  };

  const onRowDragStart = (e: ReactDragEvent, key: string, base: string, section: "pinned" | "ws" | "task", wsId?: string, task?: PinTask) => {
    dragRef.current = { key, base, task, from: locate(key, section, wsId) };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", base);
  };

  const onRowDragOver = (e: ReactDragEvent, key: string) => {
    if (dragRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropHint((h) => (h !== null && "key" in h && h.key === key && h.before === before ? h : { key, before }));
  };

  const onRowDrop = (
    e: ReactDragEvent,
    target: { section: "pinned" | "ws" | "task"; wsId?: string; key: string; nextKey: string | null },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const drag = dragRef.current;
    dragRef.current = null;
    setDropHint(null);
    if (drag === null || drag.key === target.key) return;
    moveItem(drag, {
      section: target.section,
      wsId: target.wsId,
      beforeKey: before ? target.key : target.nextKey,
    });
  };

  const onDragEnd = () => {
    dragRef.current = null;
    setDropHint(null);
  };

  /** 分区级落点（分区头/空列表）：拖入即追加。 */
  const zoneHandlers = (zone: string, target: { section: "pinned" | "ws" | "task"; wsId?: string }): DropHandlers => ({
    active: dropHint !== null && !("key" in dropHint) && dropHint.zone === zone,
    onDragOver: (e) => {
      if (dragRef.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropHint((h) => (h !== null && !("key" in h) && h.zone === zone ? h : { zone }));
    },
    onDragLeave: () => {
      setDropHint((h) => (h !== null && !("key" in h) && h.zone === zone ? null : h));
    },
    onDrop: (e) => {
      e.preventDefault();
      const drag = dragRef.current;
      dragRef.current = null;
      setDropHint(null);
      if (drag !== null) moveItem(drag, { ...target, beforeKey: null });
    },
  });

  /** 拖拽插入指示线（上下缘 2px 主色线，无布局位移）。 */
  const dropIndicator = (key: string): ReactNode => {
    if (dropHint === null || !("key" in dropHint) || dropHint.key !== key) return null;
    return (
      <span
        aria-hidden
        className={`absolute left-2 right-2 h-[2px] rounded bg-primary pointer-events-none ${
          dropHint.before ? "-top-[1px]" : "-bottom-[1px]"
        }`}
      />
    );
  };

  const openRowMenu = (
    key: string,
    base: string,
    section: "pinned" | "ws" | "task",
    wsId: string | undefined,
    rect: DOMRect,
  ) => {
    setRowMenu({
      key,
      base,
      section,
      wsId,
      x: Math.max(8, rect.right - 156),
      y: Math.min(rect.bottom + 4, window.innerHeight - 128),
    });
  };

  /** 全局唯一会话名（App 会话存储按标题为键，跨分区不可重名）。 */
  const uniqueTitle = (base: string) => {
    const taken = new Set<string>([
      ...pinned.map((p) => p.base),
      ...taskList,
      ...workspaces.flatMap((w) => w.sessions),
    ]);
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base} ${n}`)) n += 1;
    return `${base} ${n}`;
  };

  /** 分叉会话：forkId 唯一化；落入源分区（置顶分叉仍进置顶，origin = 任务区尾）。 */
  const forkRow = (menu: NonNullable<typeof rowMenu>) => {
    const forkId = uniqueTitle(`${titleOf(menu.key, menu.base)}（分支）`);
    onForkSession(menu.base, forkId);
    if (menu.section === "pinned") {
      setPinned((list) => [
        ...list,
        { key: forkId, base: forkId, origin: { section: "task", index: Number.MAX_SAFE_INTEGER } },
      ]);
    } else if (menu.section === "task") {
      setTaskList((list) => [...list, forkId]);
    } else if (menu.wsId !== undefined) {
      const wsId = menu.wsId;
      setWorkspaces((ws) =>
        ws.map((w) =>
          w.id === wsId && !w.sessions.includes(forkId)
            ? { ...w, sessions: [...w.sessions, forkId], expanded: true }
            : w,
        ),
      );
    }
    setRowMenu(null);
  };

  // 归档会话：M1 从列表隐藏；归档当前会话则切空白对话（激活键=base 标题）。
  const archiveRow = (menu: NonNullable<typeof rowMenu>) => {
    setArchived((s) => ({ ...s, [menu.key]: true }));
    setRowMenu(null);
    if (menu.base === activeSessionId) onOpenSession("");
  };

  const confirmRename = () => {
    if (renameTarget === null) return;
    const next = renameTarget.title.trim();
    if (next.length === 0) {
      setRenameTarget(null);
      return;
    }
    if (onRenameSession !== undefined) onRenameSession(renameTarget.key, next);
    else setRenamed((s) => ({ ...s, [renameTarget.key]: next }));
    setRenameTarget(null);
  };

  const addSession = (id: string) => {
    newSessionSeq.current += 1;
    const title = `新会话 ${newSessionSeq.current}`;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === id ? { ...w, sessions: [...w.sessions, title] } : w,
      ),
    );
    setWsOpen((s) => ({ ...s, [id]: true }));
    onOpenSession(title);
  };

  // 新建任务（2026-09-17 用户裁定：自动进入「任务」区并打开；同名加序号）
  const newSession = () => {
    newSessionSeq.current += 1;
    const title = uniqueTitle(`新会话 ${newSessionSeq.current}`);
    setTaskList((list) => [...list, title]);
    setSectionOpen((s) => ({ ...s, tasks: true }));
    onOpenSession(title);
  };

  const createProject = (name: string) => {
    const id = `ws-${Date.now()}`;
    // 新工作区默认自带一个「新任务」会话（2026-09-17 用户裁定：空工作区不出现，
    // 创建即建任务并打开）；无「拖动会话到此工作区」占位，拖拽目标仍是工作区行本体。
    const title = uniqueTitle("新任务");
    setWorkspaces((ws) => [...ws, { id, name, expanded: true, sessions: [title] }]);
    setWsOpen((s) => ({ ...s, [id]: true }));
    setSectionOpen((s) => ({ ...s, projects: true }));
    setDialogOpen(false);
    onOpenSession(title);
  };

  const displayedPinned = pinned.filter((p) => !archived[p.key]);
  const displayedTasks = taskList.filter((k) => !archived[k]);
  // 任务区数据源（2026-09-17 裁定）：mock 模式=本地任务列表；web 模式=全部真实会话
  // 按最近时间倒序（新建任务即排第一）；已置顶的从任务区过滤（避免两处重复）
  const taskKeys = (
    showMockSections ? displayedTasks : remoteTaskSessions ?? []
  ).filter((k) => !archived[k] && !pinned.some((p) => p.key === k));
  // 任务区限 5 展开（2026-09-17 用户裁定）
  const taskExpanded = expandedLists.task === true;
  const shownTasks = taskExpanded ? taskKeys : taskKeys.slice(0, LIST_LIMIT);

  // 搜索任务面板数据（裁定 19/20）：mock 模式用全部本地分区；web 模式用真实会话
  const paletteSessions: PaletteSession[] = showMockSections
    ? [
        ...displayedPinned.map((p) => ({ key: p.base, title: titleOf(p.key, p.base), group: "置顶任务" })),
        ...workspaces.flatMap((ws) =>
          ws.sessions
            .filter((s) => !archived[s])
            .map((s) => ({ key: s, title: titleOf(s, s), group: ws.name })),
        ),
        ...displayedTasks.map((s) => ({ key: s, title: titleOf(s, s), group: "任务" })),
      ]
    : [
        ...displayedPinned.map((p) => ({ key: p.base, title: titleOf(p.key, p.base), group: "置顶任务" })),
        ...workspaces.flatMap((ws) =>
          ws.sessions
            .filter((s) => !archived[s])
            .map((s) => ({ key: s, title: titleOf(s, s), group: ws.name })),
        ),
        ...taskKeys.map((s) => ({ key: s, title: titleOf(s, s), group: "最近" })),
      ];

  const pinnedZone = zoneHandlers("zone:pinned", { section: "pinned" });
  const taskZone = zoneHandlers("zone:task", { section: "task" });

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest z-50 flex flex-col select-none">
      <div className="flex flex-col h-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto px-space-sm pb-space-sm space-y-space-md">
          <NavList
            onNewSession={() => {
              if (onCreateSession !== undefined) onCreateSession();
              else newSession();
            }}
            onOpenSearch={() => setPaletteOpen(true)}
          />
          {/* 置顶区（2026-09-17 用户裁定）：两种模式都保留（web 模式初始为空，
              pin 真实会话后进入；默认收起） */}
          <Section
            label="置顶任务"
            open={sectionOpen.pinned}
            onToggle={() => toggleSection("pinned")}
            headerDrop={pinnedZone}
            listDrop={displayedPinned.length === 0 ? pinnedZone : undefined}
            listEmpty={displayedPinned.length === 0}
          >
            {displayedPinned.map((item, i) => {
              const status = statusOf(item.task);
              const title = titleOf(item.key, item.base);
              // beforeKey 语义按 pinned 键（key）匹配；mock 任务 key≠base，不能取 base
              const nextKey = displayedPinned[i + 1]?.key ?? null;
              return (
                <a
                  key={item.key}
                  href="#"
                  draggable
                  aria-current={item.task?.current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.task !== undefined && (status === "completed" || status === "interrupted")) {
                      acknowledge(item.task.id);
                    }
                    // v2 联动：置顶任务行也切换对话区（id 即标题，无 mock 时为空白会话）
                    onOpenSession(item.base);
                  }}
                  onDragStart={(e) => onRowDragStart(e, item.key, item.base, "pinned", undefined, item.task)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onRowDragOver(e, item.key)}
                  onDrop={(e) => onRowDrop(e, { section: "pinned", key: item.key, nextKey })}
                  className={`${row} ${
                    item.base === activeSessionId || status === "running" || item.task?.current
                      ? "bg-surface-container-low text-on-surface"
                      : "hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {dropIndicator(item.key)}
                  <span className="flex items-center gap-space-sm min-w-0">
                    {status === "running" ? (
                      <RunningPen />
                    ) : status === "interrupted" ? (
                      <StoppedPen />
                    ) : status === "completed" ? (
                      <CompletedCheck />
                    ) : null}
                    <span className={rowLabel}>{title}</span>
                  </span>
                  <RowActions
                    label={title}
                    pinned
                    onTogglePin={() => unpinRow(item)}
                    onOpen={(rect) => openRowMenu(item.key, item.base, "pinned", undefined, rect)}
                  />
                </a>
              );
            })}
          </Section>
          <Section
            label="项目"
            open={sectionOpen.projects}
            onToggle={() => toggleSection("projects")}
            actions={
              <>
                <button type="button" className={actionBtn} title="项目选项">
                  <Icon name="more_horiz" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  className={actionBtn}
                  title="创建项目"
                  onClick={() => setDialogOpen(true)}
                >
                  <Icon name="add" className="text-[16px]" />
                </button>
              </>
            }
          >
            {workspaces.map((ws) => {
              // web 后端模式：真实分组默认展开（用户仍可手动折叠，折叠态保留）
              const open = remoteWorkspaces !== undefined ? (wsOpen[ws.id] ?? true) : (wsOpen[ws.id] ?? false);
              const displayed = ws.sessions.filter((s) => !archived[s]);
              // 限 5 展开（2026-09-17 用户裁定）
              const listKey = `ws:${ws.id}`;
              const expanded = expandedLists[listKey] === true;
              const shown = expanded ? displayed : displayed.slice(0, LIST_LIMIT);
              const wsZone = zoneHandlers(`zone:ws:${ws.id}`, { section: "ws", wsId: ws.id });
              return (
                <div key={ws.id}>
                  <div
                    onClick={() => toggleWs(ws.id)}
                    onDragOver={wsZone.onDragOver}
                    onDragLeave={wsZone.onDragLeave}
                    onDrop={wsZone.onDrop}
                    className={`group flex items-center justify-between h-8 pl-2 pr-1 rounded-xl text-on-surface-variant transition-[background-color,color,transform] duration-150 active:scale-[0.98] cursor-pointer hover:bg-surface-container-low hover:text-on-surface w-full ${
                      wsZone.active ? "ring-1 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                        <Folder3DIcon open={open} />
                        <span className={rowLabel}>{ws.name}</span>
                      </div>
                    <button
                      type="button"
                      title="添加新会话"
                      onClick={(e) => {
                        e.stopPropagation();
                        addSession(ws.id);
                      }}
                      className={`${actionBtn} opacity-0 group-hover:opacity-100`}
                    >
                      <Icon name="add" className="text-[16px]" />
                    </button>
                  </div>
                  {open ? (
                    <div className={`space-y-px ${expanded ? "max-h-64 overflow-y-auto" : ""}`}>
                      {shown.map((s, i) => {
                          const title = titleOf(s, s);
                          const nextKey = shown[i + 1] ?? null;
                          return (
                            <a
                              key={s}
                              href="#"
                              draggable
                              onClick={(e) => {
                                e.preventDefault();
                                onOpenSession(s);
                              }}
                              onDragStart={(e) => onRowDragStart(e, s, s, "ws", ws.id)}
                              onDragEnd={onDragEnd}
                              onDragOver={(e) => onRowDragOver(e, s)}
                              onDrop={(e) => onRowDrop(e, { section: "ws", wsId: ws.id, key: s, nextKey })}
                              className={`${row} pl-8 ${
                                s === activeSessionId
                                  ? "bg-surface-container-low text-on-surface"
                                  : "hover:bg-surface-container-low hover:text-on-surface"
                              }`}
                            >
                              {dropIndicator(s)}
                              <span className={`${rowLabel} min-w-0`}>{title}</span>
                              <RowActions
                                label={title}
                                pinned={false}
                                onTogglePin={() => pinRow(s, s, "ws", ws.id)}
                                onOpen={(rect) => openRowMenu(s, s, "ws", ws.id, rect)}
                              />
                            </a>
                          );
                      })}
                      {displayed.length > LIST_LIMIT ? (
                        <ListMore
                          expanded={expanded}
                          total={displayed.length}
                          onToggle={() => toggleList(listKey)}
                        />
                      ) : null}
                  </div>
                  ) : null}
                </div>
              );
            })}
          </Section>
          {/* 任务区（2026-09-17 用户裁定）：mock 模式=本地任务；web 模式=真实会话按最近
              时间倒序（新建任务自动排第一）；超过 5 条收起，展开后滚动查找 */}
          <Section
            label="任务"
            open={sectionOpen.tasks}
            onToggle={() => toggleSection("tasks")}
            actions={
              <button type="button" className={actionBtn} title="新建独立会话">
                <Icon name="add" className="text-[16px]" />
              </button>
            }
            headerDrop={taskZone}
            listDrop={showMockSections && taskKeys.length === 0 ? taskZone : undefined}
            listEmpty={showMockSections && taskKeys.length === 0}
            scroll={taskExpanded}
          >
            {shownTasks.map((key, i) => {
              const title = titleOf(key, key);
              const nextKey = shownTasks[i + 1] ?? null;
              return (
                <a
                  key={key}
                  href="#"
                  draggable={showMockSections}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenSession(key);
                  }}
                  onDragStart={showMockSections ? (e) => onRowDragStart(e, key, key, "task") : undefined}
                  onDragEnd={onDragEnd}
                  onDragOver={showMockSections ? (e) => onRowDragOver(e, key) : undefined}
                  onDrop={showMockSections ? (e) => onRowDrop(e, { section: "task", key, nextKey }) : undefined}
                  className={`${row} ${
                    key === activeSessionId
                      ? "bg-surface-container-low text-on-surface"
                      : "hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {showMockSections ? dropIndicator(key) : null}
                  <span className="flex items-center min-w-0">
                    <span className={rowLabel}>{title}</span>
                  </span>
                  <RowActions
                    label={title}
                    pinned={false}
                    onTogglePin={() => pinRow(key, key, "task")}
                    onOpen={(rect) => openRowMenu(key, key, "task", undefined, rect)}
                  />
                </a>
              );
            })}
            {taskKeys.length > LIST_LIMIT ? (
              <ListMore
                expanded={taskExpanded}
                total={taskKeys.length}
                onToggle={() => toggleList("task")}
              />
            ) : null}
          </Section>
        </div>
        <UserCard />
      </div>
      {dialogOpen ? (
        <CreateProjectDialog
          onCancel={() => setDialogOpen(false)}
          onCreate={createProject}
        />
      ) : null}
      {/* 会话行操作菜单（裁定 18）：三项对齐 web 端 ui-workspace（重命名/分叉/归档） */}
      {rowMenu ? (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setRowMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setRowMenu(null);
            }}
          />
          <div
            role="menu"
            className="fixed z-[71] min-w-[148px] rounded-lg border border-surface-container-highest bg-surface-container py-1 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)]"
            style={{ left: rowMenu.x, top: rowMenu.y }}
          >
            <MenuItem
              icon="edit"
              label="重命名"
              onClick={() => {
                setRenameTarget({ key: rowMenu.key, title: titleOf(rowMenu.key, rowMenu.base) });
                setRowMenu(null);
              }}
            />
            <MenuItem icon="call_split" label="分叉会话" onClick={() => forkRow(rowMenu)} />
            <MenuItem icon="archive" label="归档会话" onClick={() => archiveRow(rowMenu)} />
          </div>
        </>
      ) : null}
      {renameTarget ? (
        <RenameDialog
          initial={renameTarget.title}
          onCancel={() => setRenameTarget(null)}
          onConfirm={confirmRename}
        />
      ) : null}
      {paletteOpen ? (
        <SearchPalette
          sessions={paletteSessions}
          activeKey={activeSessionId}
          onClose={() => setPaletteOpen(false)}
          onOpenSession={onOpenSession}
          onNewSession={newSession}
          onExportSession={onExportSession}
        />
      ) : null}
    </aside>
  );
}

function Header() {
  return (
    <div className="h-12 px-space-md flex items-center justify-between shrink-0">
      <div className="flex items-center gap-space-sm min-w-0">
        <Icon name="auto_awesome" className="text-[18px] text-on-surface shrink-0" />
        <span className="text-[14px] font-medium text-on-surface truncate">{product.name}</span>
        <span className="text-[12px] font-medium tabular-nums text-outline shrink-0">
          {product.version}
        </span>
      </div>
      <Icon
        name="dock_to_right"
        className="text-outline hover:text-on-surface cursor-pointer transition-colors text-[18px] shrink-0"
      />
    </div>
  );
}

function NavList({ onNewSession, onOpenSearch }: { onNewSession: () => void; onOpenSearch: () => void }) {
  return (
    <div className="space-y-px">
      <a
        className={`${row} hover:bg-surface-container-low hover:text-on-surface`}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNewSession();
        }}
      >
        <span className="flex items-center gap-space-sm min-w-0">
          <Icon name="edit_square" className="text-[18px] text-on-surface-variant shrink-0" />
          <span className={rowLabel}>新建任务</span>
        </span>
      </a>
      {/* 搜索任务（裁定 19）：点击打开命令面板（图四） */}
      <a
        className={`${row} hover:bg-surface-container-low hover:text-on-surface`}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onOpenSearch();
        }}
      >
        <span className="flex items-center gap-space-sm min-w-0">
          <Icon name="search" className="text-[18px] text-on-surface-variant shrink-0" />
          <span className={rowLabel}>搜索任务</span>
        </span>
      </a>
      {navItems.map((item) => (
        <a
          key={item.label}
          className={`${row} hover:bg-surface-container-low hover:text-on-surface`}
          href="#"
        >
          <span className="flex items-center gap-space-sm min-w-0">
            <Icon name={item.icon} className="text-[18px] text-on-surface-variant shrink-0" />
            <span className={rowLabel}>{item.label}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function UserCard() {
  return (
    <div className="p-space-sm shrink-0 border-t border-surface-container-highest">
      <div className="flex items-center justify-between px-space-xs py-1">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold text-[11px]">
              {user.initials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-tertiary ring-2 ring-surface-container-lowest" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-on-surface truncate">{user.name}</div>
            <div className="text-[12px] text-outline truncate">{user.status}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-outline">
          <button
            type="button"
            className="w-7 h-7 rounded-lg hover:bg-surface-container-low flex items-center justify-center hover:text-on-surface transition-colors"
            title="移动设备连接"
          >
            <Icon name="smartphone" className="text-[16px]" />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded-lg hover:bg-surface-container-low flex items-center justify-center hover:text-on-surface transition-colors"
            title="设置"
          >
            <Icon name="settings" className="text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 会话状态前置图标：
 * - running：黑白「书写笔」动效（运笔微摆 + 白色笔尖呼吸光 + 墨迹线）
 * - interrupted：笔停下变红（静态，无运笔动画）——2026-09-16 用户裁定
 * - completed：绿色勾，「墨凝收笔与翡翠微绽」420ms 绽放一次后静止（用户提供的会话状态规范 code.html 方案一）
 * 点击完成/中断的会话行后状态恢复 idle（回圆点）。
 */
function RunningPen() {
  return (
    <span className="relative w-4 h-4 shrink-0 flex items-center justify-center">
      <svg
        className="w-4 h-4 animate-pen-write drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7.5 19.5 2 21l1.5-5.5L18.5 2.5z"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-slate-200 fill-slate-800/60"
        />
        <path d="M15 5l4 4" strokeWidth="1.6" className="stroke-slate-400" />
        <circle cx="3" cy="21" r="1.5" className="fill-white animate-tip-glow" />
      </svg>
      <span className="absolute -bottom-0.5 left-0.5 w-3 h-[1.5px] bg-slate-300/70 rounded-full animate-pulse" />
    </span>
  );
}

function StoppedPen() {
  return (
    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
      <svg
        className="w-4 h-4 drop-shadow-[0_0_3px_rgba(239,68,68,0.55)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7.5 19.5 2 21l1.5-5.5L18.5 2.5z"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-[#ef4444] fill-[#ef4444]/10"
        />
        <path d="M15 5l4 4" strokeWidth="1.6" className="stroke-[#ef4444]/70" />
        <circle cx="3" cy="21" r="1.5" className="fill-[#ef4444]" />
      </svg>
    </span>
  );
}

function CompletedCheck() {
  return (
    <span className="w-4 h-4 rounded-full bg-tertiary/20 flex items-center justify-center shrink-0 animate-emerald-bloom">
      <Icon name="check" className="text-tertiary text-[12px] font-bold" />
    </span>
  );
}

/** 可折叠分组标题：展开时纯文字（悬浮显示操作按钮），收起时带「›」箭头。
 *  headerDrop/listDrop（裁定 19）：分区头与空列表作为拖拽落点（拖入即追加/置顶）。
 */
function Section({
  label,
  open,
  onToggle,
  actions,
  children,
  headerDrop,
  listDrop,
  listEmpty,
  scroll,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
  headerDrop?: DropHandlers;
  listDrop?: DropHandlers;
  listEmpty?: boolean;
  /** 展开态：列表区限高滚动（2026-09-17 用户裁定「展开后滑动可找会话」） */
  scroll?: boolean;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        onDragOver={headerDrop?.onDragOver}
        onDragLeave={headerDrop?.onDragLeave}
        onDrop={headerDrop?.onDrop}
        className={`group flex h-8 items-center justify-between px-2 cursor-pointer select-none rounded-lg hover:text-on-surface transition-colors ${
          headerDrop?.active ? "ring-1 ring-primary" : ""
        }`}
      >
        {open ? (
          <span className="text-[12.5px] font-medium text-outline">{label}</span>
        ) : (
          <span className="flex items-center gap-0.5 text-[12.5px] font-medium text-outline">
            {label}
            <Icon name="chevron_right" className="text-[14px]" />
          </span>
        )}
        {actions ? (
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {open ? (
        listEmpty && listDrop !== undefined ? (
          <div
            onDragOver={listDrop.onDragOver}
            onDragLeave={listDrop.onDragLeave}
            onDrop={listDrop.onDrop}
            className={`mt-0.5 mx-2 rounded-lg border border-dashed border-surface-container-highest px-2 py-1.5 text-[12px] text-outline/70 ${
              listDrop.active ? "ring-1 ring-primary border-solid" : ""
            }`}
          >
            拖动会话到此处
          </div>
        ) : (
          <div className={`space-y-px ${scroll === true ? "max-h-64 overflow-y-auto" : ""}`}>{children}</div>
        )
      ) : null}
    </div>
  );
}

/** 列表「展开全部 / 收起」（2026-09-17 用户裁定：超过 5 条收起，展开后滚动查找）。 */
function ListMore({ expanded, total, onToggle }: {
  expanded: boolean;
  total: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-1 h-7 px-2 mt-0.5 rounded-lg text-[12px] font-medium text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
    >
      <Icon name={expanded ? "expand_less" : "expand_more"} className="text-[14px]" />
      <span>{expanded ? "收起" : `展开全部 ${total} 条`}</span>
    </button>
  );
}

/** 创建项目弹窗（图五）。名称为唯一必填项；源文件夹选择待桌面壳接入后生效。 */
function CreateProjectDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const canCreate = name.trim().length > 0;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="w-[520px] rounded-xl bg-surface-container border border-surface-container-highest shadow-[0_16px_40px_-4px_rgba(0,0,0,0.7)] p-space-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-space-lg">
          <span className="text-[15px] font-semibold text-on-surface">创建项目</span>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="关闭"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-surface-container-highest focus-within:border-primary bg-surface-container-lowest transition-colors">
          <Icon name="folder" className="text-[18px] text-outline shrink-0" />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) onCreate(name.trim());
            }}
            placeholder="项目名称"
            className="flex-1 bg-transparent outline-none text-[14px] text-on-surface placeholder:text-outline"
          />
        </div>
        <div className="mt-space-lg text-[12.5px] font-medium text-outline">源文件夹</div>
        <div className="mt-2 h-28 rounded-lg border border-surface-container-highest flex flex-col items-center justify-center gap-2">
          <span className="flex items-center gap-1 text-[13px] text-on-surface-variant">
            在此电脑上添加文件夹
            <Icon name="keyboard_arrow_down" className="text-[14px] text-outline" />
          </span>
          <button
            type="button"
            className="flex items-center gap-1 h-7 px-2.5 rounded bg-surface-container-low hover:bg-surface-container text-[12.5px] text-on-surface-variant transition-colors cursor-pointer"
            title="选择文件夹（桌面壳接入后可用）"
          >
            <Icon name="create_new_folder" className="text-[16px]" />
            添加
          </button>
        </div>
        <div className="mt-space-lg flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => canCreate && onCreate(name.trim())}
            className="h-8 px-3 rounded-lg bg-inverse-surface text-inverse-on-surface text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            创建项目
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 会话行 hover 操作（裁定 19 图二/图三）：置顶 pin 在前 + 操作菜单 ⋯ 在后。
 * 置顶行 pin 实心常显（tooltip 取消置顶聊天），非置顶行空心 hover 显示（tooltip 置顶聊天）。
 */
function RowActions({ label, pinned, onTogglePin, onOpen }: {
  label: string;
  pinned: boolean;
  onTogglePin: () => void;
  onOpen: (rect: DOMRect) => void;
}) {
  return (
    <span className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        title={pinned ? "取消置顶聊天" : "置顶聊天"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTogglePin();
        }}
        className={`${actionBtn} ${pinned ? "opacity-70 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <Icon name="push_pin" filled={pinned} className={`text-[15px] ${pinned ? "text-on-surface" : ""}`} />
      </button>
      <button
        type="button"
        title={`会话「${label}」的操作`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen(e.currentTarget.getBoundingClientRect());
        }}
        className={`${actionBtn} opacity-0 group-hover:opacity-100`}
      >
        <Icon name="more_vert" className="text-[16px]" />
      </button>
    </span>
  );
}

/** 操作菜单项（重命名/分叉会话/归档会话）。 */
function MenuItem({ icon, label, onClick }: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 h-8 text-[13px] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors text-left cursor-pointer"
    >
      <Icon name={icon} className="text-[16px] shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** 重命名会话弹窗（对齐 web 端 ui-workspace rename.session.title 弹窗形态：输入框 + 取消/重命名）。 */
function RenameDialog({ initial, onCancel, onConfirm }: {
  initial: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const canRename = name.trim().length > 0 && name.trim() !== initial;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="w-[420px] rounded-xl bg-surface-container border border-surface-container-highest shadow-[0_16px_40px_-4px_rgba(0,0,0,0.7)] p-space-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-space-lg">
          <span className="text-[15px] font-semibold text-on-surface">重命名会话</span>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="关闭"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-surface-container-highest focus-within:border-primary bg-surface-container-lowest transition-colors">
          <Icon name="edit_square" className="text-[18px] text-outline shrink-0" />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canRename) onConfirm(name.trim());
            }}
            className="flex-1 bg-transparent outline-none text-[14px] text-on-surface"
          />
        </div>
        <div className="mt-space-lg flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canRename}
            onClick={() => canRename && onConfirm(name.trim())}
            className="h-8 px-3 rounded-lg bg-inverse-surface text-inverse-on-surface text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            重命名
          </button>
        </div>
      </div>
    </div>
  );
}
