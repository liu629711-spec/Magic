// Agent Teams 远程通道（2026-09-18 遗留项 2/3）：官方 agent-team 服务的 wire 封装。
// 契约源自 reference-project/deepseek-harness：
// - 服务端注册 packages/experimental/agent-team/src/index.ts:242 `@Remote('view') remoteView(agent)`;
//   wire 命名空间 agentTeams，lookup 字段 agentId（lib/typert.remote-client.d.ts:10-27）。
// - 返回类型 packages/experimental/agent-team/src/types.ts:57-103：
//   members[] = {id,name,role:'lead'|'teammate',status,description?,provider?,context?,model?,diagnostics[]}
//   tasks[]   = {id,revision,subject,description,status,blockedBy[],writeScopes[],ownerName?,ready,writeScopeWarnings[]}
// 实测（2026-09-18，3099 实例已挂 agent-team + ui-agent-team）：
//   POST /api/agentTeams/view {agentId} → {ok:true,value:{members,tasks}}。
// magic-ceo 半改道后成员经官方名册派出（官方成员 id 就是 childId，见 plugins/magic-ceo/src/index.ts:1005-1011），
// 因此本通道就是 CEO 团队名册/任务板的真实数据源。
import { dshRpc } from "./rpc";

/** 官方名册成员行（TeamMemberView 子集，字段形状对齐 types.ts:58-68）。 */
export interface AgentTeamMemberView {
  id: string;
  name: string;
  role: "lead" | "teammate";
  status: "running" | "idle" | "inactive" | "provisioning" | "failed";
  description?: string;
  provider?: string;
  context?: "fresh" | "fork";
  model?: string;
  diagnostics: string[];
}

/** 官方任务板任务行（TeamTaskView 子集，字段形状对齐 types.ts:86-97）。 */
export interface AgentTeamTaskView {
  id: string;
  revision: number;
  subject: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "deleted";
  blockedBy?: string[];
  writeScopes?: string[];
  ownerName?: string;
  ready?: boolean;
}

export interface AgentTeamView {
  members: AgentTeamMemberView[];
  tasks: AgentTeamTaskView[];
}

/**
 * 任务板/名册按 lead 会话路由：成员子会话映射到父会话（对齐官方 client-ui-agent-team
 * mount.ts 与 magic-ceo-ui register.ts:480-483 的 leadSessionIdOf）。
 */
export function leadSessionIdOf(sessionId: string, parentSessionId?: string): string {
  return parentSessionId ?? sessionId;
}

/** 读团队视图（名册 + 任务板）。会话不存在或服务缺席时抛错，由调用方降级。 */
export async function viewAgentTeam(leadSessionId: string): Promise<AgentTeamView> {
  const value = await dshRpc<Partial<AgentTeamView>>("agentTeams/view", { agentId: leadSessionId });
  return {
    members: Array.isArray(value.members) ? value.members : [],
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
  };
}