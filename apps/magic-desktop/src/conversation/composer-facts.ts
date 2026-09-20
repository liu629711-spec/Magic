// composer 三件套构建器（2026-09-19 从 App 抽出共享）：访问模式 / 工作模式 /
// 上下文圆环（含明细三段）。主会话（App）与右坞侧边分身（SideNoteView）共用——
// 两者能力交互一致（用户裁定：侧边是会话内的分身，composer 形态同主会话）。
import type { PromptBarChips, PromptBarPermissionItem } from "../vendor/stitch-chat/PromptBar.tsx";
import {
  CONTEXT_METER_TONES,
  formatTokens,
  type ContextMeterBreakdownItem,
} from "./ContextMeter.tsx";
import { hasFullAccessConsent, saveFullAccessConsent } from "./permission-consent.ts";

export interface ComposerFactsInput {
  /** 会话投影 values（ChatSessionStore 快照的 projections.values）。 */
  values: Record<string, unknown>;
  /** 按类型读最近一条事件（ChatSessionStore.recentEventData）——工作模式用。 */
  recentEventData: (type: string) => unknown;
  /** 命令执行（/permission、/mode）。入参 = 完整命令行。 */
  onCommand: (line: string) => void;
  /** 带回执的命令执行（2026-09-20）：返回 commands/execute 的 result（kind/text），
   *  供工作模式切换处理插件的 handoff 确认门槛；缺省时退回 onCommand。 */
  onCommandWithResult?: (line: string) => Promise<{ kind: string; text: string }>;
  /** 会话工作目录（2026-09-19）：完全访问风险确认按项目持久化的 key。 */
  cwd?: string;
}

/**
 * 工作模式切换（2026-09-20 无法关闭 CEO 模式修复）：magic-work-mode 插件有
 * handoff 确认门槛（mode.ts:52-54 + index.ts:258-265）——会话存在未收尾的
 * CEO handoff（成员或 plan summary）时，裸 `/mode agent` 被拒并提示改用
 * `/mode agent confirm`。UI 的关闭点击本身即明确意图，收到该提示后自动
 * 补发 confirm；带回执执行器缺省时退回裸命令。
 */
async function switchWorkMode(
  onCommand: (line: string) => void,
  onCommandWithResult: ((line: string) => Promise<{ kind: string; text: string }>) | undefined,
  isCeo: boolean,
): Promise<void> {
  const line = isCeo ? "/mode agent" : "/mode ceo";
  if (onCommandWithResult === undefined) {
    onCommand(line);
    return;
  }
  const result = await onCommandWithResult(line);
  if (result.kind === "error" && /confirm/i.test(result.text)) {
    await onCommandWithResult(`${line} confirm`);
  }
}

/** 从会话投影构建输入条三件套。数据缺失的字段为 undefined（PromptBar 跳过渲染）。 */
export function buildComposerChips({ values, recentEventData, onCommand, onCommandWithResult, cwd }: ComposerFactsInput): PromptBarChips {
  // 访问模式（permission-presets 投影 values.permissions = {currentValue, options:[{value,name}]}）
  const permissionRaw = values.permissions as
    | { currentValue?: string; options?: { value?: string; name?: string }[] }
    | undefined;
  const permissionId =
    typeof permissionRaw?.currentValue === "string" ? permissionRaw.currentValue : undefined;
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
  // 工作模式（magic-work-mode 事件流）。2026-09-19 用户裁定：不再单独展示
  // 「CEO · 当前会话」chip，工作模式并入访问模式菜单第二段（图二风格）。
  const workModeRaw = recentEventData("magic/work-mode") as { sessionMode?: string } | undefined;
  const isCeo = workModeRaw?.sessionMode === "ceo";
  // 计划模式（PRD-02 §15.4）：官方 plan-mode 投影 wire {active, pending}
  // （plan-mode/src/index.ts:126-163）——active=生效中，pending=已选待下个 pre-step 生效。
  const planRaw = values.plan as { active?: boolean; pending?: boolean } | undefined;
  const planActive = planRaw?.active === true;
  const planPending = planRaw?.pending === true;
  // 访问模式菜单（图二，2026-09-19）：数据源 = runtime 投影 permissions.options
  // （真实可选值），标题/说明/图形按 id 装饰（ZCode 同款文案）；选中 → /permission <id>。
  // 完全访问（图三，2026-09-19 裁定）：首次启用先弹风险确认弹窗（勾选「我已了解
  // 风险」后才能启用），确认按项目（cwd）持久化——同项目后续切换直接生效。
  // 注意：runtime 实际只有 read-only/workspace-write/danger-full-access 三个预设；
  // plan 的装饰保留，runtime 未来挂 plan 预设时菜单自动出现（不虚构死项）。
  const fullAccessConfirm = {
    title: "确认启用完全权限？",
    body: "启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。",
    ackLabel: "我已了解风险，并愿意继续",
    acceptLabel: "启用完全权限",
    acknowledged: hasFullAccessConsent(cwd),
  };
  type PermIcon = "plan" | "ask" | "auto" | "full" | "agent" | "ceo" | "misc";
  const PERMISSION_DECOR: Record<string, { icon: PermIcon; title: string; desc: string; confirm?: PromptBarPermissionItem["confirm"] }> = {
    plan: { icon: "plan" as PermIcon, title: "计划模式", desc: "编辑前先出计划。" },
    "read-only": { icon: "ask" as PermIcon, title: "变更前确认", desc: "改文件前先问我。" },
    "workspace-write": { icon: "auto" as PermIcon, title: "自动编辑", desc: "自动编辑文件。" },
    "danger-full-access": { icon: "full" as PermIcon, title: "完全访问", desc: "减少确认次数。", confirm: fullAccessConfirm },
  };
  const permissionMenu =
    permissionRaw?.options === undefined
      ? undefined
      : {
          items: permissionRaw.options
            .filter(option => typeof option.value === "string")
            .map(option => {
              const value = option.value as string;
              const decor = PERMISSION_DECOR[value];
              return {
                value,
                title: decor !== undefined ? decor.title : (option.name ?? value),
                desc: decor !== undefined ? decor.desc : "",
                icon: decor !== undefined ? decor.icon : ("misc" as PermIcon),
                current: value === permissionId,
                ...(decor?.confirm !== undefined ? { confirm: decor.confirm } : {}),
              };
            }),
          onSelect: (value: string) => onCommand(`/permission ${value}`),
          onConfirm: (value: string) => {
            if (value === "danger-full-access") saveFullAccessConsent(cwd);
          },
          // 工作模式节（2026-09-20 用户裁定）：默认即 Agent 模式，不再单列——
          // 只留「CEO 模式」切换项：未启用 → /mode ceo；已启用 → 点它切回 /mode agent。
          modeItems: [
            {
              value: "ceo",
              title: "CEO 模式",
              desc: "派成员组队，分派协作推进。",
              icon: "ceo" as PermIcon,
              current: isCeo,
            },
          ],
          onSelectMode: () => { void switchWorkMode(onCommand, onCommandWithResult, isCeo); },
          // 计划模式节（PRD-02 §15.4）：独立于访问模式单选组，/plan ↔ /plan off。
          planItem: {
            title: "计划模式",
            desc: planPending && !planActive ? "待生效——编辑前先出计划。" : "编辑前先出计划，批准后执行。",
            icon: "plan" as PermIcon,
            active: planActive,
            pending: planPending,
            onToggle: () => onCommand(planActive ? "/plan off" : "/plan"),
          },
        };
  const currentDecor =
    permissionId === undefined ? undefined : PERMISSION_DECOR[permissionId];
  const permissionChipLabel =
    permissionId === undefined
      ? undefined
      : currentDecor !== undefined
        ? currentDecor.title
        : permissionRaw?.options?.find(option => option.value === permissionId)?.name ??
          (permissionId === "workspace-write" ? "工作区内修改" : undefined);

  return {
    permission:
      permissionChipLabel !== undefined
        ? {
            label: permissionChipLabel,
            ...(permissionMenu !== undefined ? { menu: permissionMenu } : {}),
            onClick: () =>
              onCommand(
                permissionId === "read-only" ? "/permission workspace-write" : "/permission read-only",
              ),
          }
        : undefined,
    // 激活工作模式 chip（2026-09-20，ZCode 同款）：CEO 启用才展示，点 × 切回 Agent。
    ...(isCeo
      ? {
          workMode: {
            active: true,
            label: "CEO",
            onDismiss: () => { void switchWorkMode(onCommand, onCommandWithResult, true); },
          },
        }
      : {}),
    // 计划模式激活 chip（PRD-02 §15.4）：生效或待生效都展示，点 × → /plan off。
    ...(planActive || planPending
      ? { planMode: { active: planActive, onDismiss: () => onCommand("/plan off") } }
      : {}),
    context: context === undefined ? undefined : { ...context, breakdown },
  };
}
