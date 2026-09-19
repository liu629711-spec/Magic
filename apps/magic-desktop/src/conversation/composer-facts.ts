// composer 三件套构建器（2026-09-19 从 App 抽出共享）：访问模式 / 工作模式 /
// 上下文圆环（含明细三段）。主会话（App）与右坞侧边分身（SideNoteView）共用——
// 两者能力交互一致（用户裁定：侧边是会话内的分身，composer 形态同主会话）。
import type { PromptBarChips } from "../vendor/stitch-chat/PromptBar.tsx";
import {
  CONTEXT_METER_TONES,
  formatTokens,
  type ContextMeterBreakdownItem,
} from "./ContextMeter.tsx";

export interface ComposerFactsInput {
  /** 会话投影 values（ChatSessionStore 快照的 projections.values）。 */
  values: Record<string, unknown>;
  /** 按类型读最近一条事件（ChatSessionStore.recentEventData）——工作模式用。 */
  recentEventData: (type: string) => unknown;
  /** 命令执行（/permission、/mode）。入参 = 完整命令行。 */
  onCommand: (line: string) => void;
}

/** 从会话投影构建输入条三件套。数据缺失的字段为 undefined（PromptBar 跳过渲染）。 */
export function buildComposerChips({ values, recentEventData, onCommand }: ComposerFactsInput): PromptBarChips {
  // 访问模式（permission-presets 投影 values.permissions = {currentValue, options:[{value,name}]}）
  const permissionRaw = values.permissions as
    | { currentValue?: string; options?: { value?: string; name?: string }[] }
    | undefined;
  const permissionId =
    typeof permissionRaw?.currentValue === "string" ? permissionRaw.currentValue : undefined;
  const permissionLabel =
    permissionId === undefined
      ? undefined
      : permissionRaw?.options?.find(option => option.value === permissionId)?.name ??
        (permissionId === "read-only"
          ? "只读"
          : permissionId === "danger-full-access"
            ? "完全访问"
            : permissionId === "workspace-write"
              ? "工作区内修改"
              : undefined);
  // 上下文用量（token-meter 投影 values.contextPressure = {contextWindow, pressureTokens, projectedTokens}）。
  // detail 为官方「~36.1K / 262K」紧凑格式（used 优先 projectedTokens，同官方
  // context-occupancy.ts:18）；明细从 values.contextBreakdown 读（官方
  // ContextBreakdownProjection = {systemTokens, toolsTokens, messageTokens}）。
  const pressureRaw = values.contextPressure as Record<string, unknown> | undefined;
  const contextWindow = Number(pressureRaw?.contextWindow ?? 0);
  const usedTokens = Number(pressureRaw?.projectedTokens ?? pressureRaw?.pressureTokens ?? 0);
  const context =
    contextWindow > 0
      ? {
          percent: Math.min(100, Math.round((usedTokens / contextWindow) * 100)),
          detail: `~${formatTokens(usedTokens)} / ${formatTokens(contextWindow)}`,
        }
      : undefined;
  const breakdownRaw = values.contextBreakdown as
    | { systemTokens?: unknown; toolsTokens?: unknown; messageTokens?: unknown }
    | undefined;
  const breakdown: ContextMeterBreakdownItem[] | undefined =
    breakdownRaw === undefined || context === undefined
      ? undefined
      : [
          {
            label: "系统提示词",
            value: `~${formatTokens(Number(breakdownRaw.systemTokens ?? 0))}`,
            tokens: Number(breakdownRaw.systemTokens ?? 0),
            tone: CONTEXT_METER_TONES.system,
          },
          {
            label: "工具定义",
            value: `~${formatTokens(Number(breakdownRaw.toolsTokens ?? 0))}`,
            tokens: Number(breakdownRaw.toolsTokens ?? 0),
            tone: CONTEXT_METER_TONES.tools,
          },
          {
            label: "对话消息",
            value: `~${formatTokens(Number(breakdownRaw.messageTokens ?? 0))}`,
            tokens: Number(breakdownRaw.messageTokens ?? 0),
            tone: CONTEXT_METER_TONES.messages,
          },
        ];
  // 工作模式（magic-work-mode 事件流）
  const workModeRaw = recentEventData("magic/work-mode") as { sessionMode?: string } | undefined;
  const isCeo = workModeRaw?.sessionMode === "ceo";
  return {
    permission:
      permissionLabel !== undefined
        ? {
            label: permissionLabel,
            onClick: () =>
              onCommand(
                permissionId === "read-only" ? "/permission workspace-write" : "/permission read-only",
              ),
          }
        : undefined,
    workMode: {
      label: isCeo ? "CEO · 当前会话" : "Agent · 当前会话",
      onClick: () => onCommand(isCeo ? "/mode agent" : "/mode ceo"),
    },
    context: context === undefined ? undefined : { ...context, breakdown },
  };
}
