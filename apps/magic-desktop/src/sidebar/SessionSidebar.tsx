import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { Folder3DIcon } from "./Folder3DIcon";
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
  "group flex items-center justify-between h-8 px-2 rounded-xl text-on-surface-variant transition-[background-color,color,transform] duration-150 active:scale-[0.98] truncate cursor-pointer w-full";

const rowLabel = "text-[14px] font-medium truncate";
const rowCount =
  "flex items-center gap-1 shrink-0 text-[12px] font-medium tabular-nums text-outline";

const actionBtn =
  "w-6 h-6 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-[opacity,background-color,color] cursor-pointer";

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
 * locales.ts:38-47）：会话行 hover 出「⋯」操作菜单，三项 = 重命名（弹窗，
 * rename.session.title）/ 分叉会话（menu.fork）/ 归档会话（menu.archiveSession）。
 * M1 行为：重命名=侧栏显示名覆盖（store 键不变）；分叉=App 复制 mock 种子并切换；
 * 归档=列表隐藏、当前会话则切空白。SDK 接线后换真实命令。
 * 回退时删掉 RowActions/rowMenu/RenameDialog 相关代码即可。
 */
export function SessionSidebar({ activeSessionId, onOpenSession, onForkSession }: {
  activeSessionId: string
  onOpenSession: (id: string) => void
  onForkSession: (sourceId: string, forkId: string) => void
}) {
  const [sectionOpen, setSectionOpen] = useState({
    pinned: false,
    projects: false,
    tasks: false,
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [wsOpen, setWsOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialWorkspaces.map((ws) => [ws.id, ws.expanded])),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  // 点击完成/中断的会话行后，前置提示整个去掉变成纯文本行（2026-09-17 用户裁定，图二）
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  // v2 联动：新建会话序号（仅命名展示用）
  const newSessionSeq = useRef(0);
  // 会话管理（裁定 18）：显示名覆盖 / 归档隐藏 / 分叉追加 / 行菜单 / 重命名弹窗
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [extraPinned, setExtraPinned] = useState<string[]>([]);
  const [extraTasks, setExtraTasks] = useState<string[]>([]);
  const [rowMenu, setRowMenu] = useState<{
    key: string
    base: string
    section: "pinned" | "ws" | "task"
    wsId?: string
    x: number
    y: number
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ key: string; title: string } | null>(null);

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

  /** 显示名：重命名覆盖 > 基准名。store/种子键始终用基准名（base），不受重命名影响。 */
  const titleOf = (key: string, base: string) => renamed[key] ?? base;

  const statusOf = (task: (typeof pinnedTasks)[number] | undefined): SessionStatus | "ack" =>
    acknowledged[task?.id ?? ""] ? "ack" : task?.status ?? "idle";
  const acknowledge = (id: string) =>
    setAcknowledged((s) => ({ ...s, [id]: true }));

  const toggleSection = (key: "pinned" | "projects" | "tasks") =>
    setSectionOpen((s) => ({ ...s, [key]: !s[key] }));
  const toggleWs = (id: string) => setWsOpen((s) => ({ ...s, [id]: !s[id] }));

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

  // 分叉会话：forkId 用当前显示名 + 后缀；种子键用 base（App 里与 store 键一致）。
  const forkRow = (menu: NonNullable<typeof rowMenu>) => {
    const forkId = `${titleOf(menu.key, menu.base)}（分支）`;
    onForkSession(menu.base, forkId);
    if (menu.section === "pinned") {
      setExtraPinned((list) => (list.includes(forkId) ? list : [...list, forkId]));
    } else if (menu.section === "task") {
      setExtraTasks((list) => (list.includes(forkId) ? list : [...list, forkId]));
    } else if (menu.wsId !== undefined) {
      setWorkspaces((ws) =>
        ws.map((w) =>
          w.id === menu.wsId && !w.sessions.includes(forkId)
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
    if (next.length > 0) setRenamed((s) => ({ ...s, [renameTarget.key]: next }));
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

  const newSession = () => {
    newSessionSeq.current += 1;
    onOpenSession(`新会话 ${newSessionSeq.current}`);
  };

  const createProject = (name: string) => {
    const id = `ws-${Date.now()}`;
    setWorkspaces((ws) => [...ws, { id, name, expanded: true, sessions: [] }]);
    setWsOpen((s) => ({ ...s, [id]: true }));
    setSectionOpen((s) => ({ ...s, projects: true }));
    setDialogOpen(false);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest z-50 flex flex-col select-none">
      <div className="flex flex-col h-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto px-space-sm pb-space-sm space-y-space-md">
          <NavList onNewSession={newSession} />
          <Section
            label="置顶任务"
            open={sectionOpen.pinned}
            onToggle={() => toggleSection("pinned")}
          >
            {[
              ...pinnedTasks
                .filter((task) => !archived[task.id])
                .map((task) => ({ key: task.id, base: task.title, task })),
              ...extraPinned
                .filter((id) => !archived[id])
                .map((id) => ({ key: id, base: id, task: undefined })),
            ].map(({ key, base, task }) => {
              const status = statusOf(task);
              const title = titleOf(key, base);
              return (
                <a
                  key={key}
                  href="#"
                  aria-current={task?.current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task !== undefined && (status === "completed" || status === "interrupted")) {
                      acknowledge(task.id);
                    }
                    // v2 联动：置顶任务行也切换对话区（id 即标题，无 mock 时为空白会话）
                    onOpenSession(base);
                  }}
                  className={`${row} ${
                    base === activeSessionId || status === "running" || task?.current
                      ? "bg-surface-container-low text-on-surface"
                      : "hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-space-sm min-w-0">
                    {status === "running" ? (
                      <RunningPen />
                    ) : status === "interrupted" ? (
                      <StoppedPen />
                    ) : status === "completed" ? (
                      <CompletedCheck />
                    ) : status === "idle" ? (
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task?.dot ?? "bg-outline"}`} />
                    ) : null}
                    <span className={rowLabel}>{title}</span>
                  </span>
                  <RowActions
                    label={title}
                    onOpen={(rect) => openRowMenu(key, base, "pinned", undefined, rect)}
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
              const open = wsOpen[ws.id] ?? false;
              return (
                <div key={ws.id}>
                  <div
                    onClick={() => toggleWs(ws.id)}
                    className="group flex items-center justify-between h-8 pl-2 pr-1 rounded-xl text-on-surface-variant transition-[background-color,color,transform] duration-150 active:scale-[0.98] cursor-pointer hover:bg-surface-container-low hover:text-on-surface w-full"
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
                    <div className="space-y-px">
                      {ws.sessions
                        .filter((s) => !archived[s])
                        .map((s) => (
                          <a
                            key={s}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              onOpenSession(s);
                            }}
                            className={`${row} pl-8 ${
                              s === activeSessionId
                                ? "bg-surface-container-low text-on-surface"
                                : "hover:bg-surface-container-low hover:text-on-surface"
                            }`}
                          >
                            <span className={`${rowLabel} min-w-0`}>{titleOf(s, s)}</span>
                            <RowActions
                              label={titleOf(s, s)}
                              onOpen={(rect) => openRowMenu(s, s, "ws", ws.id, rect)}
                            />
                          </a>
                        ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </Section>
          <Section
            label="任务"
            open={sectionOpen.tasks}
            onToggle={() => toggleSection("tasks")}
            actions={
              <button type="button" className={actionBtn} title="新建独立会话">
                <Icon name="add" className="text-[16px]" />
              </button>
            }
          >
            {[
              ...tasks
                .filter((task) => !archived[task.title])
                .map((task) => ({ key: task.title, base: task.title, time: task.time })),
              ...extraTasks
                .filter((id) => !archived[id])
                .map((id) => ({ key: id, base: id, time: "刚刚" })),
            ].map(({ key, base, time }) => (
              <a
                key={key}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenSession(base);
                }}
                className={`${row} ${
                  base === activeSessionId
                    ? "bg-surface-container-low text-on-surface"
                    : "hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span className="flex items-center min-w-0">
                  <span className={rowLabel}>{titleOf(key, base)}</span>
                </span>
                <span className="flex items-center gap-0.5 shrink-0">
                  <RowActions
                    label={titleOf(key, base)}
                    onOpen={(rect) => openRowMenu(key, base, "task", undefined, rect)}
                  />
                  <span className={rowCount}>{time}</span>
                </span>
              </a>
            ))}
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

function NavList({ onNewSession }: { onNewSession: () => void }) {
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
 */
function Section({
  label,
  open,
  onToggle,
  actions,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        className="group flex h-8 items-center justify-between px-2 cursor-pointer select-none rounded-lg hover:text-on-surface transition-colors"
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
      {open ? <div className="space-y-px">{children}</div> : null}
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

/** 会话行 hover 操作按钮（裁定 18）：触发行操作菜单；文案对齐 web 端 aria。 */
function RowActions({ label, onOpen }: { label: string; onOpen: (rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      title={`会话「${label}」的操作`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(e.currentTarget.getBoundingClientRect());
      }}
      className={`${actionBtn} opacity-0 group-hover:opacity-100 shrink-0`}
    >
      <Icon name="more_vert" className="text-[16px]" />
    </button>
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
