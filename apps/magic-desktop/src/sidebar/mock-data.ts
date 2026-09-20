/** 假数据一字不改，出处：codex_01_stream_autonomous_flow/code.html 左栏 */

export const product = {
  name: "Magic 智能体",
  version: "v1.4.2",
};

// 导航入口（2026-09-16 用户裁定：去掉「项目」入口行，项目通过会话树分组呈现；插件市场不显示计数）
export const navItems = [
  // 定时任务：图标暂用 Material Symbols timer 占位；用户提供秒表图后换 assets/timer.png
  { icon: "timer", label: "定时任务" },
  // 插件市场（2026-09-19 用户裁定改名，原「技能扩展」；ZCode 同名）
  { icon: "extension", label: "插件市场" },
] as const;

export type Workspace = {
  id: string;
  name: string;
  expanded: boolean;
  sessions: string[];
};

// 项目（工作区）初始假数据；运行中可通过「创建项目」弹窗/行内添加会话增删
export const initialWorkspaces: Workspace[] = [
  {
    id: "burger-restaurant",
    name: "burger-restaurant",
    expanded: true,
    sessions: ["了解当前项目进度", "帮我把项目的最新进度推送到github上"],
  },
  { id: "core-auth-service", name: "core-auth-service", expanded: false, sessions: [] },
  { id: "ai-orchestrator", name: "ai-orchestrator", expanded: false, sessions: [] },
];

export type SessionStatus = "idle" | "running" | "interrupted" | "completed";

export const pinnedTasks: {
  id: string;
  title: string;
  current?: boolean;
  status?: SessionStatus;
  dot: string;
}[] = [
  {
    id: "task-redesign-modern-ui",
    title: "重构应用现代化 UI 界面",
    status: "completed",
    dot: "bg-outline",
  },
  {
    id: "task-redis-migration",
    title: "Redis 会话缓存迁移",
    current: true,
    status: "running",
    dot: "bg-tertiary",
  },
  {
    id: "task-fix-playwright-flakiness",
    title: "修复 Playwright 偶发失败用例",
    status: "interrupted",
    dot: "bg-secondary",
  },
] as const;

// 任务行不放图标（2026-09-16 用户裁定）；运行中的任务前置书写笔动画
// 时间展示已去掉（2026-09-17 裁定 19：会话时间不需要展示）
export const tasks = [
  { title: "Node.js 22 LTS 升级预演" },
  { title: "整理 API 网关路由规范文档" },
  { title: "生产环境 Redis 集群健康巡检" },
] as const;

export const user = {
  initials: "tb",
  name: "tbnam415",
  status: "在线 · Pro",
};
