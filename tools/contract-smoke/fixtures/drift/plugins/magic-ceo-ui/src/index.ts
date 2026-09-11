// 负向样例（漂移）：故意引用官方 0.1.5 已删除的检查器契约
// （layout.openDetails / closeDetails / details 槽），证明体检必须 FAIL。
export function apply(ctx: any): void {
  ctx.slots.inject('details', () => ctx.slots.register({ name: 'details' }, {}))
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    inject: () => ({ openDetails: () => { ctx.layout.openDetails() } }),
  }, {}))
}
