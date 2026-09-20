// 正向样例：完全合法的插件，注入真实存在的 DSH 服务、使用真实存在的 ctx 成员。
// 用于证明体检不会把"正确的契约"误判为失败（无假阳性）。
export const name = 'magic-good'

export const inject = ['tools', 'systemPrompt']

export function apply(ctx: any): void {
  ctx.tools.register({
    name: 'g',
    description: 'd',
    parameters: {},
    execute: async () => undefined,
  })
  ctx.systemPrompt.section({ name: 'n', build: () => 's' })
  ctx.effect(() => () => undefined)
}
