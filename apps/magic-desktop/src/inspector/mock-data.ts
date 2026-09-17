/**
 * 右栏静态假数据。出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L344
 * （审查 tab 的文件 diff 列表）。M1 静态落地，M2 接 Remote workspaceFiles 变更流后替换。
 */

export type InspectorTabId =
  | "review"
  | "terminal"
  | "files"
  | "browser"
  | "chat";

export type InspectorTab = {
  id: InspectorTabId;
  label: string;
  icon: string;
  /** 浏览器=缺口③、侧边聊天=Magic 尚无此功能：入场但置灰不可点（2026-09-17 用户裁定） */
  disabled?: boolean;
};

export const inspectorTabs: InspectorTab[] = [
  { id: "review", label: "审查", icon: "rule" },
  { id: "terminal", label: "终端", icon: "terminal" },
  { id: "files", label: "文件", icon: "folder" },
  { id: "browser", label: "浏览器", icon: "public", disabled: true },
  { id: "chat", label: "侧边聊天", icon: "forum", disabled: true },
];

export type DiffLine = { kind: "hunk" | "add" | "del"; text: string };

export type ChangedFile = {
  path: string;
  add: number;
  del: number;
  /** 折叠行左侧的文件类型图标（设计稿：redis.ts=terminal / 测试=check_circle / yml=tune） */
  icon: string;
  iconClass: string;
  /** 展开卡文件头图标（设计稿 session.ts=data_object，primary 色） */
  headerIcon?: string;
  lines?: DiffLine[];
};

export const changedFiles: ChangedFile[] = [
  {
    path: "src/auth/session.ts",
    add: 58,
    del: 14,
    icon: "data_object",
    iconClass: "text-primary",
    headerIcon: "data_object",
    lines: [
      { kind: "hunk", text: '@@ -12,6 +12,12 @@ import { Redis } from "ioredis";' },
      { kind: "add", text: 'import { Cluster } from "ioredis";' },
      { kind: "add", text: "export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;" },
      { kind: "hunk", text: "@@ -88,5 +94,14 @@ export async function purgeSession" },
      { kind: "del", text: "  await redis.del(`session:${id}`);" },
      { kind: "add", text: "  await redisCluster.del(`{sess:usr}:${id}`);" },
      { kind: "add", text: '  metrics.increment("session.purged.cluster");' },
    ],
  },
  {
    path: "src/config/redis.ts",
    add: 34,
    del: 2,
    icon: "terminal",
    iconClass: "text-secondary",
  },
  {
    path: "tests/auth/session.test.ts",
    add: 82,
    del: 11,
    icon: "check_circle",
    iconClass: "text-tertiary",
  },
  {
    path: "docker-compose.yml",
    add: 10,
    del: 2,
    icon: "tune",
    iconClass: "text-outline",
  },
];
