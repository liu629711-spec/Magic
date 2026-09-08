import { presentCeoMember, type CeoMemberViewStatus, type CeoTeamMember } from './team.ts'

export const CEO_FLOW = {
  goal: { width: 120, height: 72 },
  member: { width: 188, height: 92 },
  ceo: { width: 120, height: 72 },
  columnGap: 56,
  rowGap: 14,
  padX: 12,
  padY: 12,
} as const

export type CeoFlowNodeKind = 'goal' | 'member' | 'ceo'
export type CeoFlowEdgeKind = 'goal' | 'depends' | 'report'

export interface CeoFlowBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CeoFlowNode extends CeoFlowBox {
  readonly id: string
  readonly kind: CeoFlowNodeKind
  readonly member?: CeoTeamMember
}

export interface CeoFlowEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: CeoFlowEdgeKind
}

export interface CeoFlowLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly CeoFlowNode[]
  readonly edges: readonly CeoFlowEdge[]
}

export function ceoFlowMemberId(callId: string): string {
  return `member:${callId}`
}

export function ceoTeamSinkStatus(members: readonly CeoTeamMember[]): CeoMemberViewStatus {
  const presentations = members.map(presentCeoMember)
  if (presentations.some(item => item.viewStatus === 'running')) return 'running'
  if (presentations.some(item => item.viewStatus === 'queued')) return 'queued'
  if (presentations.some(item => item.needsDecision || item.viewStatus === 'blocked')) return 'blocked'
  if (presentations.some(item => item.viewStatus === 'error' || item.viewStatus === 'failed')) return 'failed'
  if (presentations.some(item => item.viewStatus === 'partial')) return 'partial'
  if (presentations.length > 0 && presentations.every(item => item.viewStatus === 'completed')) {
    return 'completed'
  }
  return 'delegated'
}

function memberBySessionId(members: readonly CeoTeamMember[], id: string): CeoTeamMember | undefined {
  return members.find(member =>
    member.runId === id || member.rawId === id || member.memberId === id || member.role === id
  )
}

function columnOf(
  member: CeoTeamMember,
  members: readonly CeoTeamMember[],
  visiting: Set<string>,
  memo: Map<string, number>,
): number {
  const cached = memo.get(member.callId)
  if (cached !== undefined) return cached
  if (visiting.has(member.callId)) return 0
  visiting.add(member.callId)
  const resolved = member.dependsOn
    .map(id => memberBySessionId(members, id))
    .filter((item): item is CeoTeamMember => item !== undefined)
  const column = resolved.length === 0
    ? 0
    : Math.max(...resolved.map(item => columnOf(item, members, visiting, memo))) + 1
  visiting.delete(member.callId)
  memo.set(member.callId, column)
  return column
}

function sizeOf(kind: CeoFlowNodeKind): { width: number; height: number } {
  if (kind === 'member') return CEO_FLOW.member
  if (kind === 'ceo') return CEO_FLOW.ceo
  return CEO_FLOW.goal
}

function stacked(
  count: number,
  nodeHeight: number,
  canvasHeight: number,
): number[] {
  if (count <= 0) return []
  const columnHeight = count * nodeHeight + (count - 1) * CEO_FLOW.rowGap
  const top = CEO_FLOW.padY + Math.max(0, (canvasHeight - 2 * CEO_FLOW.padY - columnHeight) / 2)
  return Array.from({ length: count }, (_, index) => top + index * (nodeHeight + CEO_FLOW.rowGap))
}

export function ceoFlowEdgePath(from: CeoFlowBox, to: CeoFlowBox): string {
  const x1 = from.x + from.width
  const y1 = from.y + from.height / 2
  const x2 = to.x
  const y2 = to.y + to.height / 2
  const dx = Math.max(24, (x2 - x1) / 2)
  return `M ${String(x1)} ${String(y1)} C ${String(x1 + dx)} ${String(y1)}, ${String(x2 - dx)} ${String(y2)}, ${String(x2)} ${String(y2)}`
}

export function layoutCeoTeamFlow(members: readonly CeoTeamMember[]): CeoFlowLayout {
  if (members.length === 0) {
    return { width: 0, height: 0, nodes: [], edges: [] }
  }

  const memo = new Map<string, number>()
  const columns = members.map(member => columnOf(member, members, new Set(), memo))
  const memberColumnCount = Math.max(0, ...columns) + 1
  const byColumn: CeoTeamMember[][] = Array.from({ length: memberColumnCount }, () => [])
  for (const [index, member] of members.entries()) {
    byColumn[columns[index]!]!.push(member)
  }

  const colWidths = [
    CEO_FLOW.goal.width,
    ...Array.from({ length: memberColumnCount }, () => CEO_FLOW.member.width),
    CEO_FLOW.ceo.width,
  ]
  const colX: number[] = []
  let cursor = CEO_FLOW.padX
  for (const width of colWidths) {
    colX.push(cursor)
    cursor += width + CEO_FLOW.columnGap
  }
  const width = cursor - CEO_FLOW.columnGap + CEO_FLOW.padX

  const memberHeights = byColumn.map(column =>
    column.length === 0
      ? 0
      : column.length * CEO_FLOW.member.height + (column.length - 1) * CEO_FLOW.rowGap,
  )
  const contentHeight = Math.max(CEO_FLOW.goal.height, CEO_FLOW.ceo.height, ...memberHeights)
  const height = contentHeight + 2 * CEO_FLOW.padY

  const nodes: CeoFlowNode[] = [
    {
      id: 'goal',
      kind: 'goal',
      x: colX[0]!,
      y: stacked(1, CEO_FLOW.goal.height, height)[0]!,
      ...sizeOf('goal'),
    },
  ]

  for (const [column, columnMembers] of byColumn.entries()) {
    const ys = stacked(columnMembers.length, CEO_FLOW.member.height, height)
    for (const [index, member] of columnMembers.entries()) {
      nodes.push({
        id: ceoFlowMemberId(member.callId),
        kind: 'member',
        member,
        x: colX[column + 1]!,
        y: ys[index]!,
        ...sizeOf('member'),
      })
    }
  }

  nodes.push({
    id: 'ceo',
    kind: 'ceo',
    x: colX[colX.length - 1]!,
    y: stacked(1, CEO_FLOW.ceo.height, height)[0]!,
    ...sizeOf('ceo'),
  })

  const dependedOn = new Set<string>()
  const edges: CeoFlowEdge[] = []
  for (const member of members) {
    const to = ceoFlowMemberId(member.callId)
    const resolved = member.dependsOn
      .map(id => memberBySessionId(members, id))
      .filter((item): item is CeoTeamMember => item !== undefined)
    if (resolved.length === 0) {
      edges.push({ id: `goal->${to}`, from: 'goal', to, kind: 'goal' })
    }
    for (const dependency of resolved) {
      const from = ceoFlowMemberId(dependency.callId)
      dependedOn.add(from)
      edges.push({
        id: `${from}->${to}`,
        from,
        to,
        kind: 'depends',
      })
    }
  }
  for (const member of members) {
    const from = ceoFlowMemberId(member.callId)
    if (dependedOn.has(from)) continue
    edges.push({ id: `${from}->ceo`, from, to: 'ceo', kind: 'report' })
  }

  return { width, height, nodes, edges }
}
