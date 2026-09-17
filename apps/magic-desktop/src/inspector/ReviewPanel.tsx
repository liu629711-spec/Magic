import { useState } from "react";
import { Icon } from "../sidebar/Icon";
import { CodeBlock } from "../components/CodeBlock";
import { changedFiles, type ChangedFile } from "./mock-data";

/**
 * 审查 tab（Code Diff / Review Dock）。
 * 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L344
 * （工具条 + 文件 diff 列表 + 底部提交区），M1 静态落地。
 * 2026-09-17 用户裁定：底部提交区不显示「由 Codex 生成的提交说明」小字；
 * 展开卡的 diff 主体换用 stitch UI/diff.txt 的浅色 CodeBlock 设计（中栏+右栏统一）。
 */
export function ReviewPanel() {
  // 默认与设计稿一致：仅 session.ts 展开
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "src/auth/session.ts": true,
  });
  const toggle = (path: string) =>
    setExpanded((s) => ({ ...s, [path]: !s[path] }));

  return (
    <>
      <ReviewToolbar />
      <div className="flex-1 overflow-y-auto p-space-sm space-y-space-sm min-h-0">
        {changedFiles.map((file) => (
          <FileDiffCard
            key={file.path}
            file={file}
            open={!!expanded[file.path]}
            onToggle={() => toggle(file.path)}
          />
        ))}
      </div>
      <CommitBar />
    </>
  );
}

function ReviewToolbar() {
  return (
    <div className="px-space-sm py-2 bg-surface-container-low border-b border-surface-container-highest space-y-space-xs select-none shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container border border-surface-container-highest text-on-surface font-body-sm text-body-sm cursor-pointer hover:bg-surface-bright transition-colors"
          >
            <span className="text-tertiary font-medium">未暂存 ▾</span>
            <span className="text-outline text-[11px]">+184 -29</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-outline hover:text-on-surface hover:bg-surface-container font-body-sm text-[11px] transition-colors cursor-pointer"
          >
            <span>上一轮 ▾</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <ToolbarIcon icon="view_column" title="统一/双列视图切换" />
          <ToolbarIcon icon="unfold_more" title="展开/折叠全部文件" />
          <ToolbarIcon icon="refresh" title="刷新变更" />
        </div>
      </div>
      <div className="relative flex items-center">
        <Icon
          name="search"
          className="absolute left-2 text-[14px] text-outline pointer-events-none"
        />
        <input
          type="text"
          placeholder="筛选变更文件路径..."
          className="w-full h-7 pl-7 pr-2 rounded bg-surface-container text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none"
        />
      </div>
    </div>
  );
}

function ToolbarIcon({ icon, title }: { icon: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
    >
      <Icon name={icon} className="text-[14px]" />
    </button>
  );
}

function FileDiffCard({
  file,
  open,
  onToggle,
}: {
  file: ChangedFile;
  open: boolean;
  onToggle: () => void;
}) {
  if (open) {
    return (
      <div className="rounded-lg bg-surface-container-low overflow-hidden border border-surface-container-highest">
        <div
          onClick={onToggle}
          className="flex items-center justify-between px-space-sm py-1.5 bg-surface-container cursor-pointer select-none"
        >
          <div className="flex items-center gap-space-xs font-body-sm text-body-sm truncate">
            <Icon name="expand_more" className="text-[14px] text-outline" />
            <Icon
              name={file.headerIcon ?? file.icon}
              className={`text-[14px] ${file.iconClass}`}
            />
            <span className="text-on-surface font-medium truncate">
              {file.path}
            </span>
          </div>
          <div className="flex items-center gap-2 font-body-sm text-body-sm">
            <span className="text-tertiary font-medium">+{file.add}</span>
            <span className="text-error font-medium">-{file.del}</span>
            <Icon
              name="check"
              className="text-[14px] text-outline hover:text-on-surface"
            />
          </div>
        </div>
        {file.rows?.length ? (
          /* 浅色 CodeBlock 卡（stitch UI/diff.txt 设计）；不传 filename，文件名由上方头行承载 */
          <div className="p-space-xs">
            <CodeBlock variant="Diff" diff={file.rows} className="w-full" />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div
      onClick={onToggle}
      className="rounded bg-surface-container-low px-space-sm py-2 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-space-xs font-body-sm text-body-sm truncate">
        <Icon name="chevron_right" className="text-[14px] text-outline" />
        <Icon name={file.icon} className={`text-[14px] ${file.iconClass}`} />
        <span className="text-on-surface-variant hover:text-on-surface truncate">
          {file.path}
        </span>
      </div>
      <div className="flex items-center gap-2 font-body-sm text-body-sm">
        <span className="text-tertiary">+{file.add}</span>
        <span className="text-error">-{file.del}</span>
      </div>
    </div>
  );
}

function CommitBar() {
  return (
    <div className="p-space-md bg-surface-container-low border-t border-surface-container-highest space-y-space-sm select-none shrink-0">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wider">
          <span>提交说明</span>
        </div>
        <div className="p-space-sm rounded bg-surface-container text-on-surface font-body-sm text-body-sm leading-relaxed border border-surface-container-highest">
          feat(auth): migrate session store to redis cluster with hash slots
        </div>
      </div>
      <div className="flex items-center gap-space-xs pt-1">
        <button
          type="button"
          className="flex-1 h-8 rounded bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-label-md font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Icon name="upload" className="text-[15px]" />
          <span>提交并推送 (Commit &amp; Push)</span>
        </button>
        <button
          type="button"
          title="创建拉取请求 (Pull Request)"
          className="h-8 px-3 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
        >
          <Icon name="call_merge" className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}
