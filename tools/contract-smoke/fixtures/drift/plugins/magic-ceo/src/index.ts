// 负向样例（漂移）：故意在端口声明里保留官方已删除的投递模式字段，
// 证明「Magic 声明必须与官方形状一致」这条断言有效。
export interface AgentTeamsPort {
  sendMessage(
    caller: unknown,
    request: { target: string; content: unknown[]; delivery: 'quiet' | 'wakeup'; signal: AbortSignal },
  ): Promise<unknown>
}
