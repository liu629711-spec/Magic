// 负向样例：故意改坏的插件，用于证明"上游改名 → 体检必须失败"。
//   * inject 里混入一个 DSH 根本不存在的服务名 `notARealService`；
//   * 把真实的 `ctx.storageDomain` 拼写成 `ctx.storageDoman`（典型的上游改名笔误）。
// 体检应当针对这两处各报一条 FAIL，否则护栏形同虚设。
export const name = 'magic-broken'

export const inject = ['tools', 'notARealService']

export function apply(ctx: any): void {
  ctx.tools.register({
    name: 'g',
    description: 'd',
    parameters: {},
    execute: async () => undefined,
  })
  // 故意写错：真实字段是 storageDomain，这里写成 storageDoman。
  ctx.storageDoman.open({ name: 'x', version: 1, tables: {} })
}
