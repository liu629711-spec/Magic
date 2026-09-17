/**
 * 右栏静态假数据。出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L344
 * （审查 tab 的文件 diff 列表）。M1 静态落地，M2 接 Remote workspaceFiles 变更流后替换。
 * diff 内容格式：components/CodeBlock.tsx 的 DiffRow（stitch UI/diff.txt 设计，2026-09-17 裁定）。
 */

import type { DiffRow } from "../components/CodeBlock";

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

export type ChangedFile = {
  path: string;
  add: number;
  del: number;
  /** 折叠行左侧的文件类型图标（设计稿：redis.ts=terminal / 测试=check_circle / yml=tune） */
  icon: string;
  iconClass: string;
  /** 展开卡文件头图标（设计稿 session.ts=data_object，primary 色） */
  headerIcon?: string;
  /** 展开后的统一 diff（CodeBlock Diff 视图）；未给 = 无内容可展开 */
  rows?: DiffRow[];
};

export const changedFiles: ChangedFile[] = [
  {
    path: "src/auth/session.ts",
    add: 58,
    del: 14,
    icon: "data_object",
    iconClass: "text-primary",
    headerIcon: "data_object",
    rows: [
      {
        old: 12,
        cur: 12,
        type: "ctx",
        pieces: [{ text: 'import { Redis } from "ioredis";' }],
      },
      {
        old: null,
        cur: 13,
        type: "add",
        pieces: [{ text: 'import { Cluster } from "ioredis";' }],
      },
      {
        old: null,
        cur: 14,
        type: "add",
        pieces: [{ text: "export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;" }],
      },
      {
        old: 88,
        cur: 94,
        type: "ctx",
        pieces: [{ text: "export async function purgeSession(id: string) {" }],
      },
      {
        old: 89,
        cur: null,
        type: "del",
        pieces: [
          { text: "  await redis.del(" },
          { text: "`session:${id}`", change: "del" },
          { text: ");" },
        ],
      },
      {
        old: null,
        cur: 95,
        type: "add",
        pieces: [
          { text: "  await " },
          { text: "redisCluster", change: "add" },
          { text: ".del(" },
          { text: "`{sess:usr}:${id}`", change: "add" },
          { text: ");" },
        ],
      },
      {
        old: null,
        cur: 96,
        type: "add",
        pieces: [{ text: '  metrics.increment("session.purged.cluster");' }],
      },
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
