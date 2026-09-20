import { useEffect, useRef, useState } from "react";
import type { CSSProperties as ReactCSSProperties, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
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
/** 会话名行内展示（图一/图八体验，2026-09-19 用户裁定）：静态右缘渐隐裁切，
 *  悬浮且溢出时横向循环滚动展示全名（title-marquee）。 */
const sessionRowLabel = "text-[14px] font-medium";
const titleMask =
  "[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]";

function RowTitle({ title }: { title: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title]);
  const shift =
    ref.current === null ? 0 : -(ref.current.scrollWidth - ref.current.clientWidth);
  const style =
    overflow && hover
      ? ({
          "--marquee-shift": `${String(shift)}px`,
          animation: "title-marquee 7s ease-in-out infinite",
        } as ReactCSSProperties)
      : undefined;
  return (
    <span
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`${sessionRowLabel} block max-w-full overflow-hidden whitespace-nowrap ${overflow ? titleMask : ""}`}
      style={style}
    >
      {title}
    </span>
  );
}

const actionBtn =
  "w-6 h-6 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-[opacity,background-color,color] cursor-pointer";

/** 会话列表可视行数上限（2026-09-17 用户裁定：超过即在区域内滚动查找，不做展开按钮）。 */
const LIST_LIMIT = 5;

/** 分区顺序持久化（2026-09-17 用户裁定：置顶任务/项目/最近任务 可拖拽自由组合）。 */
const SECTION_ORDER_KEY = "magic.sectionOrder";
type SectionId = "pinned" | "projects" | "tasks";
function readSectionOrder(): SectionId[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SECTION_ORDER_KEY) ?? "null");
    if (
      Array.isArray(raw) &&
      raw.length === 3 &&
      (["pinned", "projects", "tasks"] as SectionId[]).every((id) => raw.includes(id))
    ) {
      return raw as SectionId[];
    }
  } catch {
    /* 数据损坏回退默认顺序 */
  }
  return ["pinned", "projects", "tasks"];
}

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
export function SessionSidebar({ activeSessionId, onOpenSession, onForkSession, onExportSession, labels, onRenameSession, onCreateSession, remoteWorkspaces, remoteTaskSessions, sessionStatuses, showMockSections = true, onOpenSkills, onOpenAutomation, onOpenSettings, assigned, onAssign, recentLimit = 20, sessionCwds, width = 260, collapsed = false, onToggleCollapsed }: {
  activeSessionId: string
  onOpenSession: (id: string) => void
  onForkSession: (sourceId: string, forkId: string) => void
  onExportSession: (id: string) => void
  /** 首页导航「技能扩展」入口（裁定 22：进入技能扩展视图） */
  onOpenSkills?: () => void
  /** 首页导航「定时任务」入口（2026-09-19：进入定时任务视图） */
  onOpenAutomation?: () => void
  /** 底部用户卡「设置」入口（裁定 22：进入整页设置视图） */
  onOpenSettings?: () => void
  /** web 后端模式：会话归属映射（sessionId → workspaceId；无归属=只在最近任务区） */
  assigned?: Record<string, string>
  /** web 后端模式：拖拽改变归属（null = 退回最近任务区） */
  onAssign?: (sessionId: string, workspaceId: string | null) => void
  /** web 后端模式：会话工作目录（右键「复制路径」用） */
  sessionCwds?: Record<string, string>
  /** web 后端模式：会话 id → 显示名（session/list 的 title 投影） */
  labels?: Record<string, string>
  /** web 后端模式：重命名走 session/rename；缺省=本地覆盖（mock 模式） */
  onRenameSession?: (id: string, title: string) => void
  /** web 后端模式：新建任务走 session/create；带 workspaceId 时建到该工作区（工作区行 + 号），
   *  缺省建到最近任务区；mock 模式缺省=本地开空白会话 */
  onCreateSession?: (workspaceId?: string) => void
  /** web 后端模式：项目分组由真实会话按 cwd 归组（App 下发，随 refresh 更新） */
  remoteWorkspaces?: Workspace[]
  /** web 后端模式：任务区数据源 = 全部会话按最近时间倒序（App 下发；新建任务即排第一） */
  remoteTaskSessions?: string[]
  /** web/mock 统一会话状态：所有分区共用 running/interrupted/completed 图标。 */
  sessionStatuses?: Record<string, SessionStatus>
  /** mock 数据分区显隐；web 后端模式传 false（置顶区转真实置顶、任务区转最近会话） */
  showMockSections?: boolean
  /** 最近任务区最多渲染条数（设置页可调；缺省 20） */
  recentLimit?: number
  /** 栏宽（App 布局拖拽下发，2026-09-18；缺省 260） */
  width?: number
  /** 收起态（56px 图标窄条，3099 同款；打开入口=条顶部按钮） */
  collapsed?: boolean
  /** 收起/展开切换（Header 收起钮 + 窄条打开钮） */
  onToggleCollapsed?: () => void
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

  // 拖拽（裁定 19）：HTML5 DnD；dropHint 驱动插入指示线/目标区高亮
  const dragRef = useRef<DragItem | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);

  // 分区拖拽重排（2026-09-17 用户裁定：三个模块可自由组合，顺序持久化）
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(() => readSectionOrder());
  useEffect(() => {
    localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(sectionOrder));
  }, [sectionOrder]);
  const sectionDragRef = useRef<SectionId | null>(null);
  const [sectionHint, setSectionHint] = useState<{ id: SectionId; before: boolean } | null>(null);
  // 拖拽中的分区（其余分区显示虚线落点框，2026-09-17 用户裁定改善拖动体验）
  const [draggingSection, setDraggingSection] = useState<SectionId | null>(null);
  const sectionDnd = (id: SectionId) => ({
    onDragStart: (e: ReactDragEvent) => {
      sectionDragRef.current = id;
      setDraggingSection(id);
      if (e.dataTransfer !== null) e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => {
      sectionDragRef.current = null;
      setDraggingSection(null);
      setSectionHint(null);
    },
    onDragOver: (e: ReactDragEvent) => {
      if (sectionDragRef.current === null || sectionDragRef.current === id) return;
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      setSectionHint((h) => (h?.id === id && h.before === before ? h : { id, before }));
    },
    onDrop: (e: ReactDragEvent) => {
      const from = sectionDragRef.current;
      sectionDragRef.current = null;
      const before = sectionHint?.id === id ? sectionHint.before : true;
      setSectionHint(null);
      if (from === null || from === id) return;
      e.preventDefault();
      setSectionOrder((order) => {
        const next = order.filter((x) => x !== from);
        const idx = next.indexOf(id);
        next.splice(before ? idx : idx + 1, 0, from);
        return next;
      });
    },
  });
  const sectionHeaderClass = (id: SectionId): string =>
    sectionHint?.id === id
      ? sectionHint.before
        ? "shadow-[inset_0_2px_0_0_var(--color-primary)]"
        : "shadow-[inset_0_-2px_0_0_var(--color-primary)]"
      : "";
  /** 分区外框（2026-09-17 用户裁定）：拖拽时其余分区显示虚线落点框，拖入即交换/插入。 */
  const sectionFrameClass = (id: SectionId): string => {
    if (draggingSection === id) return "opacity-40";
    if (draggingSection === null) return "";
    if (sectionHint?.id === id) return "outline outline-2 outline-dashed outline-primary/70";
    return "outline outline-1 outline-dashed outline-outline/25";
  };

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

  const statusOf = (key: string, task: PinTask | undefined): SessionStatus | "ack" => {
    const status = sessionStatuses?.[key] ?? task?.status ?? "idle";
    // 重新运行必须打断旧的“已读完成/中断”状态，运行中的书写动画优先显示。
    return status === "running" ? "running" : acknowledged[key] ? "ack" : status;
  };
  useEffect(() => {
    const runningKeys = new Set(
      Object.entries(sessionStatuses ?? {})
        .filter(([, status]) => status === "running")
        .map(([key]) => key),
    );
    if (runningKeys.size === 0) return;
    setAcknowledged(previous => {
      const next = { ...previous };
      let changed = false;
      for (const key of runningKeys) {
        if (next[key] === true) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [sessionStatuses]);
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

  const isRemote = !showMockSections;
  const remoteAll = remoteTaskSessions ?? [];

  /** 统一移动：从源列表移除 → 插入目标（beforeKey=null 追加）。置顶区内排序不覆盖 origin。 */
  const moveItem = (
    drag: DragItem,
    target: { section: "pinned" | "ws" | "task"; wsId?: string; beforeKey?: string | null },
  ) => {
    const origin: Loc =
      drag.from.section === "pinned" && target.section === "pinned"
        ? pinned.find((p) => p.key === drag.key)?.origin ?? { section: "task", index: Number.MAX_SAFE_INTEGER }
        : drag.from;
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
    // web 后端模式（2026-09-17 用户裁定）：会话归属由 App 下发（assigned: sessionId→workspaceId）；
    // 置顶仍为本地列表（渲染时过滤掉已置顶项即从原区域消失；取消置顶自动回原区域）。
    if (isRemote) {
      if (drag.from.section === "pinned") {
        setPinned((list) => list.filter((p) => p.key !== drag.key));
      }
      if (target.section === "pinned") {
        const item: PinnedItem = { key: drag.key, base: drag.base, task: drag.task, origin };
        setPinned((list) => insert(list, item, (p) => p.key, drag.key));
      } else if (target.section === "ws" && target.wsId !== undefined) {
        onAssign?.(drag.key, target.wsId);
        setWsOpen((s) => ({ ...s, [target.wsId as string]: true }));
      } else if (target.section === "task") {
        onAssign?.(drag.key, null);
      }
      return;
    }
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
    if (e.dataTransfer !== null) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", base);
    }
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

  // 右键菜单 + 标记未读（2026-09-17 用户裁定：会话右键弹出完整操作菜单，参考 Codex）
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  const onRowContextMenu = (
    e: ReactMouseEvent,
    key: string,
    base: string,
    section: "pinned" | "ws" | "task",
    wsId?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setRowMenu({
      key,
      base,
      section,
      wsId,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 184)),
      y: Math.min(e.clientY, window.innerHeight - 400),
    });
  };
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => setRowMenu(null),
      () => window.alert("复制失败：剪贴板不可用"),
    );
  };
  const openRow = (key: string, base: string) => {
    setUnread((s) => {
      if (s[key] !== true) return s;
      const next = { ...s };
      delete next[key];
      return next;
    });
    onOpenSession(base);
  };
  const menuPinnedItem = rowMenu !== null ? pinned.find((p) => p.key === rowMenu.key) : undefined;
  const menuCwd = rowMenu !== null ? sessionCwds?.[rowMenu.key] : undefined;

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
    // web 模式：工作区行 + 号 = 新建到该工作区（session/create + 本地归属）
    if (onCreateSession !== undefined) {
      onCreateSession(id);
      setWsOpen((s) => ({ ...s, [id]: true }));
      return;
    }
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
  // 最近任务区（2026-09-17 用户裁定）：改名「最近任务」；只收未归属工作区的会话
  // （新建任务默认落这里）；渲染条数上限由设置页控制，超出部分不渲染 + 列表尾提示
  const taskKeys = (showMockSections ? displayedTasks : remoteAll).filter(
    (k) =>
      !archived[k] &&
      !pinned.some((p) => p.key === k) &&
      (showMockSections || assigned?.[k] === undefined),
  );
  const shownTasks = taskKeys.slice(0, Math.max(1, recentLimit));
  const tasksCapped = taskKeys.length > shownTasks.length;

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

  // 收起窄条（2026-09-18 用户裁定 + 3099 实测同款）：56px 图标条，顶部「打开侧边栏」
  // 即唯一恢复入口；新建/搜索/设置保持可达。
  if (collapsed) {
    return (
      <aside
        className="fixed left-0 top-0 h-full w-[56px] bg-surface-container-lowest z-50 flex flex-col items-center gap-1 py-space-sm select-none"
        data-sidebar-collapsed
      >
        {[
          { title: "打开侧边栏", icon: "dock_to_left", onClick: onToggleCollapsed },
          {
            title: "新建任务",
            icon: "edit_square",
            onClick: () => {
              if (onCreateSession !== undefined) onCreateSession();
              else newSession();
            },
          },
          { title: "搜索任务", icon: "search", onClick: () => setPaletteOpen(true) },
        ].map(item => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            onClick={item.onClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
          >
            <Icon name={item.icon} className="text-[18px]" />
          </button>
        ))}
        <div className="flex-1" />
        {onOpenSettings !== undefined && (
          <button
            type="button"
            title="设置"
            aria-label="设置"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
          >
            <Icon name="settings" className="text-[18px]" />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-surface-container-lowest z-50 flex flex-col select-none"
      style={{ width }}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <Header onCollapsed={onToggleCollapsed} />
        {/* 顶部导航固定（2026-09-17 用户裁定）：新建任务/搜索任务/定时任务/技能扩展
            不随会话列表滚动 */}
        <div className="shrink-0 px-space-sm pb-space-md">
          <NavList
            onNewSession={() => {
              if (onCreateSession !== undefined) onCreateSession();
              else newSession();
            }}
            onOpenSearch={() => setPaletteOpen(true)}
            onOpenSkills={onOpenSkills}
            onOpenAutomation={onOpenAutomation}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-space-sm pb-space-sm flex flex-col gap-y-space-md">
          {[
            /* 置顶区（2026-09-17 用户裁定）：两种模式都保留；无「拖动会话到此处」占位、
               默认收起；分区头可拖拽重排 */
            { id: "pinned" as const, node: (
              <div key="pinned" className={`rounded-lg transition-opacity ${sectionFrameClass("pinned")}`}>
              <Section
                label="置顶任务"
                open={sectionOpen.pinned}
                onToggle={() => toggleSection("pinned")}
                headerDrop={pinnedZone}
                headerProps={sectionDnd("pinned")}
                headerClass={sectionHeaderClass("pinned")}
              >
            {displayedPinned.map((item, i) => {
              const status = statusOf(item.key, item.task);
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
                    if (status === "completed" || status === "interrupted") {
                      acknowledge(item.key);
                    }
                    // v2 联动：置顶任务行也切换对话区（id 即标题，无 mock 时为空白会话）
                    openRow(item.key, item.base);
                  }}
                  onContextMenu={(e) => onRowContextMenu(e, item.key, item.base, "pinned")}
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
                  <span className="flex flex-1 items-center gap-space-sm min-w-0">
                    <SessionStatusIcon status={status} />
                    <RowTitle title={title} />
                  </span>
                  <RowActions
                    label={title}
                    pinned
                    onTogglePin={() => unpinRow(item)}
                    onOpen={(rect) => openRowMenu(item.key, item.base, "pinned", undefined, rect)}
                  />
                </a>
              ); })}
              </Section>
              </div>
            ) },
            { id: "projects" as const, node: (
              <div key="projects" className={`rounded-lg transition-opacity ${sectionFrameClass("projects")}`}>
              <Section
                label="项目"
                open={sectionOpen.projects}
                onToggle={() => toggleSection("projects")}
                headerProps={sectionDnd("projects")}
                headerClass={sectionHeaderClass("projects")}
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
              // web 模式：工作区只显示已归属的会话（拖入 / 在工作区行 + 号新建）；
              // mock 模式：本地数组
              const displayed = isRemote
                ? remoteAll.filter(
                    (s) => assigned?.[s] === ws.id && !archived[s] && !pinned.some((p) => p.key === s),
                  )
                : ws.sessions.filter((s) => !archived[s]);
              // 可视上限（2026-09-17 用户裁定：超过即在区域内滚动，不做展开按钮）
              const scrollable = displayed.length > LIST_LIMIT;
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
                    <ScrollArea className={scrollable ? "max-h-40" : ""}>
                      {displayed.map((s, i) => {
                          const title = titleOf(s, s);
                          const status = statusOf(s, undefined);
                          const nextKey = displayed[i + 1] ?? null;
                          return (
                            <a
                              key={s}
                              href="#"
                              draggable
                              onClick={(e) => {
                                e.preventDefault();
                                if (status === "completed" || status === "interrupted") acknowledge(s);
                                openRow(s, s);
                              }}
                              onContextMenu={(e) => onRowContextMenu(e, s, s, "ws", ws.id)}
                              onDragStart={(e) => onRowDragStart(e, s, s, "ws", ws.id)}
                              onDragEnd={onDragEnd}
                              onDragOver={(e) => onRowDragOver(e, s)}
                              onDrop={(e) => onRowDrop(e, { section: "ws", wsId: ws.id, key: s, nextKey })}
                              className={`${row} pl-8 ${
                                s === activeSessionId || status === "running"
                                  ? "bg-surface-container-low text-on-surface"
                                  : "hover:bg-surface-container-low hover:text-on-surface"
                              }`}
                            >
                              {dropIndicator(s)}
                              <span className="flex flex-1 items-center gap-1.5 min-w-0">
                                <SessionStatusIcon status={status} />
                                {unread[s] === true ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                ) : null}
                                <RowTitle title={title} />
                              </span>
                              <RowActions
                                label={title}
                                pinned={false}
                                onTogglePin={() => pinRow(s, s, "ws", ws.id)}
                                onOpen={(rect) => openRowMenu(s, s, "ws", ws.id, rect)}
                              />
                            </a>
                          );
                      })}
                    </ScrollArea>
                  ) : null}
                </div>
              );
            })}
              </Section>
              </div>
            ) },
            /* 最近任务区（2026-09-17 用户裁定）：mock 模式=本地任务；web 模式=未归属工作区
               的真实会话（新建任务默认落这里）；列表自适应填充到左栏底部，超出滚动 +
               底部悬浮滚动提示；渲染条数上限由设置页控制 */
            { id: "tasks" as const, node: (
              <div key="tasks" className={`rounded-lg transition-opacity ${sectionFrameClass("tasks")}`}>
              <Section
                label="最近任务"
                open={sectionOpen.tasks}
                onToggle={() => toggleSection("tasks")}
                grow
                headerDrop={taskZone}
                headerProps={sectionDnd("tasks")}
                headerClass={sectionHeaderClass("tasks")}
                actions={
                  <button type="button" className={actionBtn} title="新建独立会话">
                    <Icon name="add" className="text-[16px]" />
                  </button>
                }
              >
            {shownTasks.map((key, i) => {
              const title = titleOf(key, key);
              const status = statusOf(key, undefined);
              const nextKey = shownTasks[i + 1] ?? null;
              return (
                <a
                  key={key}
                  href="#"
                  draggable
                  onClick={(e) => {
                    e.preventDefault();
                    if (status === "completed" || status === "interrupted") acknowledge(key);
                    openRow(key, key);
                  }}
                  onContextMenu={(e) => onRowContextMenu(e, key, key, "task")}
                  onDragStart={(e) => onRowDragStart(e, key, key, "task")}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onRowDragOver(e, key)}
                  onDrop={(e) => onRowDrop(e, { section: "task", key, nextKey })}
                  className={`${row} ${
                    key === activeSessionId || status === "running"
                      ? "bg-surface-container-low text-on-surface"
                      : "hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {showMockSections ? dropIndicator(key) : null}
                  <span className="flex flex-1 items-center gap-1.5 min-w-0">
                    <SessionStatusIcon status={status} />
                    {unread[key] === true ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    ) : null}
                    <RowTitle title={title} />
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
            {tasksCapped ? (
              <div className="px-2 py-1.5 text-[11.5px] text-outline/70">
                仅显示最近 {recentLimit} 条 · 可在设置中调整展示数量
              </div>
            ) : null}
              </Section>
              </div>
            ) },
          ]
            .slice()
            .sort((a, b) => sectionOrder.indexOf(a.id) - sectionOrder.indexOf(b.id))
            .map((entry) => entry.node)}
        </div>
        <UserCard onOpenSettings={onOpenSettings} />
      </div>
      {dialogOpen ? (
        <CreateProjectDialog
          onCancel={() => setDialogOpen(false)}
          onCreate={createProject}
        />
      ) : null}
      {/* 会话行操作菜单（裁定 18/23）：⋯ 按钮与行右键共用。参考 Codex 右键菜单（用户图二）：
          纯前端可用的已接真实行为；壳/轨迹相关能力（分屏、资源管理器、任务/日志路径、
          前往配置、调用轨迹、反馈）置灰标注待接。 */}
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
            className="fixed z-[71] min-w-[176px] rounded-lg border border-surface-container-highest bg-surface-container py-1 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)]"
            style={{ left: rowMenu.x, top: rowMenu.y }}
          >
            {menuPinnedItem !== undefined ? (
              <MenuItem
                icon="push_pin"
                filled
                label="取消置顶"
                onClick={() => {
                  unpinRow(menuPinnedItem);
                  setRowMenu(null);
                }}
              />
            ) : (
              <MenuItem
                icon="push_pin"
                label="置顶任务"
                onClick={() => {
                  pinRow(rowMenu.key, rowMenu.base, rowMenu.section, rowMenu.wsId);
                  setRowMenu(null);
                }}
              />
            )}
            <MenuItem
              icon="edit"
              label="重命名任务"
              onClick={() => {
                setRenameTarget({ key: rowMenu.key, title: titleOf(rowMenu.key, rowMenu.base) });
                setRowMenu(null);
              }}
            />
            <MenuItem icon="archive" label="归档任务" onClick={() => archiveRow(rowMenu)} />
            <MenuItem
              icon="mark_email_unread"
              label="标记为未读"
              onClick={() => {
                setUnread((s) => ({ ...s, [rowMenu.key]: true }));
                setRowMenu(null);
              }}
            />
            <MenuItem icon="splitscreen" label="在分屏打开" disabled />
            <MenuDivider />
            <MenuItem icon="folder_open" label="在资源管理器中打开" disabled />
            <MenuItem
              icon="content_copy"
              label="复制路径"
              disabled={menuCwd === undefined || menuCwd.length === 0}
              onClick={() => copyText(menuCwd ?? "")}
            />
            <MenuItem icon="content_copy" label="复制任务路径" disabled />
            <MenuItem icon="content_copy" label="复制日志路径" disabled />
            <MenuItem icon="content_copy" label="复制会话 ID" onClick={() => copyText(rowMenu.key)} />
            <MenuItem icon="settings" label="前往配置" disabled />
            <MenuDivider />
            <MenuItem icon="route" label="查看调用轨迹" disabled />
            <MenuItem icon="flag" label="反馈问题" disabled />
            <MenuDivider />
            <MenuItem icon="call_split" label="分叉会话" onClick={() => forkRow(rowMenu)} />
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

function Header({ onCollapsed }: { onCollapsed?: () => void }) {
  return (
    <div className="h-12 px-space-md flex items-center justify-between shrink-0">
      <div className="flex items-center gap-space-sm min-w-0">
        <Icon name="auto_awesome" className="text-[18px] text-on-surface shrink-0" />
        <span className="text-[14px] font-medium text-on-surface truncate">{product.name}</span>
        <span className="text-[12px] font-medium tabular-nums text-outline shrink-0">
          {product.version}
        </span>
      </div>
      {/* 收起侧边栏（2026-09-18 接线：拖拽调宽越过阻力上限也可收起；恢复=窄条顶部钮） */}
      <button
        type="button"
        title="收起侧边栏"
        aria-label="收起侧边栏"
        onClick={onCollapsed}
        className="text-outline hover:text-on-surface cursor-pointer transition-colors flex items-center justify-center h-7 w-7 rounded hover:bg-surface-container-low"
      >
        <Icon
          name="dock_to_right"
          className="text-[18px] shrink-0"
        />
      </button>
    </div>
  );
}

function NavList({ onNewSession, onOpenSearch, onOpenSkills, onOpenAutomation }: {
  onNewSession: () => void;
  onOpenSearch: () => void;
  onOpenSkills?: () => void;
  onOpenAutomation?: () => void;
}) {
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
          onClick={(e) => {
            e.preventDefault();
            // 插件市场（2026-09-19 改名，裁定 22）：进入插件市场视图（左栏不变）
            if (item.label === "插件市场") onOpenSkills?.();
            // 定时任务（2026-09-19）：进入定时任务视图
            if (item.label === "定时任务") onOpenAutomation?.();
          }}
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

function UserCard({ onOpenSettings }: { onOpenSettings?: () => void }) {
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
            onClick={onOpenSettings}
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

function SessionStatusIcon({ status }: { status: SessionStatus | "ack" | undefined }) {
  if (status === "running") return <RunningPen />;
  if (status === "interrupted") return <StoppedPen />;
  if (status === "completed") return <CompletedCheck />;
  return null;
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
  grow,
  headerProps,
  headerClass,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
  headerDrop?: DropHandlers;
  listDrop?: DropHandlers;
  listEmpty?: boolean;
  /** 超过可视行数：列表区限高滚动（工作区列表） */
  scroll?: boolean;
  /** 列表自适应填充剩余空间（2026-09-17 用户裁定：最近任务「展示到最下面」） */
  grow?: boolean;
  /** 分区整体拖拽重排（2026-09-17 用户裁定：三个模块可自由组合） */
  headerProps?: {
    onDragStart?: (e: ReactDragEvent) => void;
    onDragEnd?: () => void;
    onDragOver?: (e: ReactDragEvent) => void;
    onDrop?: (e: ReactDragEvent) => void;
  };
  headerClass?: string;
}) {
  return (
    <div className={grow === true && open ? "flex flex-col flex-1 min-h-0" : undefined}>
      <div
        onClick={onToggle}
        draggable={headerProps !== undefined}
        onDragStart={headerProps?.onDragStart}
        onDragEnd={headerProps?.onDragEnd}
        onDragOver={(e) => {
          headerProps?.onDragOver?.(e);
          headerDrop?.onDragOver(e);
        }}
        onDragLeave={headerDrop?.onDragLeave}
        onDrop={(e) => {
          headerProps?.onDrop?.(e);
          headerDrop?.onDrop(e);
        }}
        className={`group flex h-8 items-center justify-between px-2 cursor-pointer select-none rounded-lg hover:text-on-surface transition-colors shrink-0 ${
          headerDrop?.active ? "ring-1 ring-primary" : ""
        } ${headerClass ?? ""}`}
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
          <ScrollArea grow={grow} className={scroll === true ? "max-h-40" : ""}>
            {children}
          </ScrollArea>
        )
      ) : null}
    </div>
  );
}

/**
 * 滚动区域 + 底部悬浮滚动提示（2026-09-17 用户裁定，参考用户提供的 ScrollProgress 设计）：
 * 滚动时在区域底部中央浮现小胶囊（环形进度 + 提示文案），停止滚动后淡出；
 * 替代旧「展开全部」按钮与底部渐隐 mask。
 */
function ScrollArea({ className, grow, children }: {
  className?: string;
  grow?: boolean;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState({ visible: false, progress: 0, atEnd: false });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el === null) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 4) return;
      const progress = Math.min(1, el.scrollTop / max);
      setHint({ visible: true, progress, atEnd: progress >= 0.995 });
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setHint(h => ({ ...h, visible: false })), 700);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const R = 7;
  const C = 2 * Math.PI * R;
  return (
    <div className={`relative min-h-0 flex flex-col ${grow === true ? "flex-1" : ""}`}>
      <div
        ref={scrollerRef}
        className={`flex-1 min-h-0 overflow-y-auto space-y-px ${
          grow === true
            ? // 底部渐隐（图二反馈，2026-09-19）：被视口裁切的半行柔和收尾，不生硬露出
              "[mask-image:linear-gradient(to_bottom,black_calc(100%-16px),transparent)]"
            : ""
        } ${className ?? ""}`}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-surface-container-highest bg-surface-container-lowest/85 backdrop-blur-md shadow-lg transition-opacity duration-200 ${
          hint.visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg viewBox="0 0 20 20" className="w-[18px] h-[18px] -rotate-90">
          <circle cx="10" cy="10" r={R} fill="none" strokeWidth="2.5" className="stroke-outline/25" />
          <circle
            cx="10"
            cy="10"
            r={R}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-on-surface-variant"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - hint.progress)}
          />
        </svg>
        <span className="text-[11px] font-medium text-on-surface-variant whitespace-nowrap">
          {hint.atEnd ? "已到底" : "下滑查看更多"}
        </span>
      </div>
    </div>
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
    <span className="absolute right-1.5 flex items-center gap-0.5">
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

/** 操作菜单项（裁定 18/23：置顶/重命名/归档/未读/复制…；disabled=待接能力置灰）。 */
function MenuItem({ icon, label, onClick, disabled, filled }: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled === true}
      onClick={disabled === true ? undefined : onClick}
      className={`flex w-full items-center gap-2 px-3 h-8 text-[13px] transition-colors text-left ${
        disabled === true
          ? "text-outline/45 cursor-not-allowed"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
      }`}
    >
      <Icon name={icon} filled={filled} className="text-[16px] shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** 菜单分隔线（裁定 23）。 */
function MenuDivider() {
  return <div className="my-1 h-px bg-surface-container-highest/60" />;
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
