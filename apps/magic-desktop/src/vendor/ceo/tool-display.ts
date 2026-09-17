// 摘自 plugins/magic-ceo-ui/src/processView.ts 的 toolDisplayName（2026-09-18）。
// 图卡只消费这一个函数，故不整表搬入 processView.ts（其余解析器本轮未用）。

/** DSH 工具名 → 运行态展示名（图卡成员节点「正在生成 X」）。 */
export function toolDisplayName(name: string): string {
  if (name === 'web_search') return 'Search web'
  if (name === 'web_fetch') return 'Read page'
  if (name === 'bash' || name === 'shell' || name === 'terminal') return 'Run terminal'
  if (name === 'read' || name === 'file_read') return 'Read file'
  if (name === 'write' || name === 'file_write') return 'Write file'
  if (name === 'edit' || name === 'str_replace') return 'Edit file'
  if (name === 'glob' || name === 'file_list') return 'List dir'
  if (name === 'grep') return 'Grep code'
  return name
}