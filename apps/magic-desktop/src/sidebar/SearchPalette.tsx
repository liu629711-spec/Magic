// 搜索任务命令面板（裁定 19 图四）：全部会话 + 输入过滤 + ↑↓/Enter/Ctrl+数字 跳转；
// 快捷操作（新聊天/导出当前会话可用；打开文件夹/搜索文件 M1 无后端，置灰占位——裁定 5 纪律）；
// 设置组置灰占位。Ctrl+N/Ctrl+数字在浏览器预览里可能被浏览器快捷键抢占（reserved），
// 桌面壳（Electron）阶段可注册为全局加速器；↑↓/Enter 始终可用。
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

export type PaletteSession = { key: string; title: string; group: string };

type PaletteAction = {
  icon: string;
  label: string;
  shortcut?: string;
  hint?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function SearchPalette({
  sessions,
  activeKey,
  onClose,
  onOpenSession,
  onNewSession,
  onExportSession,
}: {
  sessions: PaletteSession[];
  activeKey: string;
  onClose: () => void;
  onOpenSession: (key: string) => void;
  onNewSession: () => void;
  onExportSession: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return sessions;
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.key.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.ctrlKey && e.key >= "1" && e.key <= "9") {
        const hit = filtered[Number(e.key) - 1];
        if (hit !== undefined) {
          e.preventDefault();
          onOpenSession(hit.key);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, onClose, onOpenSession]);

  const openSession = (key: string) => {
    onOpenSession(key);
    onClose();
  };

  const quickActions: PaletteAction[] = [
    {
      icon: "edit_square",
      label: "新聊天",
      shortcut: "Ctrl+N",
      onClick: () => {
        onNewSession();
        onClose();
      },
    },
    { icon: "folder", label: "打开文件夹", shortcut: "Ctrl+O", disabled: true, hint: "桌面壳接入后可用" },
    { icon: "search", label: "搜索文件", shortcut: "Ctrl+P", disabled: true, hint: "桌面壳接入后可用" },
    {
      icon: "download",
      label: "导出当前会话",
      hint: "导出为 Markdown",
      onClick: () => openSessionExport(),
    },
  ];

  function openSessionExport() {
    onExportSession(activeKey);
    onClose();
  }

  const settingsActions: PaletteAction[] = [
    { icon: "settings", label: "常规", disabled: true, hint: "即将推出" },
    { icon: "upload_file", label: "导入", disabled: true, hint: "即将推出" },
    { icon: "light_mode", label: "外观", disabled: true, hint: "即将推出" },
    { icon: "mic", label: "语音", disabled: true, hint: "即将推出" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-[600px] max-h-[72vh] rounded-xl bg-surface-container border border-surface-container-highest shadow-[0_16px_40px_-4px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 px-4 flex items-center border-b border-surface-container-highest shrink-0">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, Math.max(0, filtered.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                const hit = filtered[cursor];
                if (hit !== undefined) openSession(hit.key);
              }
            }}
            placeholder="搜索聊天"
            className="flex-1 bg-transparent outline-none text-[14px] text-on-surface placeholder:text-outline"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-3 pt-1 pb-1 text-[12px] font-medium text-outline">聊天</div>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-outline">没有匹配的会话</div>
          ) : (
            filtered.map((s, i) => (
              <button
                key={s.key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                onClick={() => openSession(s.key)}
                onMouseEnter={() => setCursor(i)}
                className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-[13.5px] transition-colors cursor-pointer ${
                  i === cursor || s.key === activeKey
                    ? "bg-surface-container-low text-on-surface"
                    : "text-on-surface-variant"
                }`}
              >
                <span className="truncate">{s.title}</span>
                <span className="flex items-center gap-2 shrink-0 text-outline text-[12px] min-w-0">
                  <span className="truncate max-w-[140px]">{s.group}</span>
                  {i < 9 ? (
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-[11px] leading-none tabular-nums">
                      Ctrl+{i + 1}
                    </kbd>
                  ) : null}
                </span>
              </button>
            ))
          )}
          <ActionGroup label="快捷操作" actions={quickActions} />
          <ActionGroup label="设置" actions={settingsActions} />
        </div>
      </div>
    </div>
  );
}

function ActionGroup({ label, actions }: { label: string; actions: PaletteAction[] }) {
  return (
    <>
      <div className="px-3 pt-3 pb-1 text-[12px] font-medium text-outline">{label}</div>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          disabled={a.disabled}
          title={a.hint}
          onClick={a.disabled ? undefined : a.onClick}
          className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-[13.5px] transition-colors ${
            a.disabled
              ? "text-outline/50 cursor-not-allowed"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface cursor-pointer"
          }`}
        >
          <Icon name={a.icon} className="text-[17px] shrink-0" />
          <span className="truncate">{a.label}</span>
          <span className="ml-auto flex items-center gap-2 shrink-0 text-outline text-[12px]">
            {a.shortcut ? (
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-[11px] leading-none tabular-nums">
                {a.shortcut}
              </kbd>
            ) : null}
          </span>
        </button>
      ))}
    </>
  );
}
