import { presentCeoMember, type CeoMemberViewStatus, type CeoTeamMember } from './team.ts'

export const CEO_FLOW = {
  goal: { width: 210, height: 110 },
  member: { width: 210, height: 110 },
  ceo: { width: 210, height: 110 },
  columnGap: 40,
  rowGap: 16,
  padX: 24,
  padY: 36,
} as const

export type CeoFlowNodeKind = 'goal' | 'member' | 'ceo' | 'task'
export type CeoFlowEdgeKind = 'goal' | 'depends' | 'report'

/** 任务板节点在画布上的最小投影（来自官方 remote.agentTeams.view 的任务）。 */
export interface CeoFlowTask {
  readonly id: string
  readonly subject: string
  readonly status: 'pending' | 'in_progress' | 'completed' | 'deleted'
}

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
  readonly task?: CeoFlowTask
  readonly enterIndex: number
}

export interface CeoFlowEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: CeoFlowEdgeKind
}

/** Backdrop band behind one wave column, AgentCore WaveLanes style. */
export interface CeoFlowLane {
  readonly id: string
  readonly label: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly labelX: number
  readonly labelY: number
}

export interface CeoFlowLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly CeoFlowNode[]
  readonly edges: readonly CeoFlowEdge[]
  readonly lanes: readonly CeoFlowLane[]
  /** 任务板泳道（有任务时才出现），画布底部横排。 */
  readonly taskLane?: CeoFlowLane
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
  if (presentations.some(item => item.viewStatus === 'unverified')) return 'unverified'
  if (presentations.some(item => item.viewStatus === 'unknown_after_restart')) return 'unknown_after_restart'
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

export function layoutCeoTeamFlow(
  members: readonly CeoTeamMember[],
  tasks: readonly CeoFlowTask[] = [],
): CeoFlowLayout {
  if (members.length === 0) {
    // 没有成员但有任务时：只渲染任务泳道。
    if (tasks.length === 0) {
      return { width: 0, height: 0, nodes: [], edges: [], lanes: [] }
    }
    return layoutTaskLaneOnly(tasks)
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
      enterIndex: 0,
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
        enterIndex: column + 1,
        ...sizeOf('member'),
      })
    }
  }

  nodes.push({
    id: 'ceo',
    kind: 'ceo',
    x: colX[colX.length - 1]!,
    y: stacked(1, CEO_FLOW.ceo.height, height)[0]!,
    enterIndex: memberColumnCount + 1,
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

  const WAVE_PAD = 8
  const lanes: CeoFlowLane[] = []
  for (const [column, columnMembers] of byColumn.entries()) {
    if (columnMembers.length === 0) continue
    const columnNodes = nodes.filter(node =>
      node.kind === 'member'
      && columnMembers.some(item => item.callId === node.member?.callId),
    )
    if (columnNodes.length === 0) continue
    const x0 = colX[column + 1]!
    const y0 = Math.min(...columnNodes.map(node => node.y))
    const y1 = Math.max(...columnNodes.map(node => node.y + node.height))
    lanes.push({
      id: `lane:${String(column)}`,
      label: `第 ${String(column + 1)} 波`,
      x: x0 - WAVE_PAD,
      y: y0 - WAVE_PAD,
      w: CEO_FLOW.member.width + WAVE_PAD * 2,
      h: y1 - y0 + WAVE_PAD * 2,
      labelX: x0 + 8,
      labelY: y0 - WAVE_PAD - 16,
    })
  }

  // 任务板泳道：画布底部横排（有任务时才出现）。
  let taskLane: CeoFlowLane | undefined
  if (tasks.length > 0) {
    const laneGap = 36
    const laneLabelH = 20
    const laneY = height + laneGap
    const perRow = Math.max(1, Math.floor((width - CEO_FLOW.padX * 2) / (CEO_FLOW.member.width + CEO_FLOW.columnGap)))
    const taskRows = Math.ceil(tasks.length / perRow)
    const taskNodeH = 64
    for (const [index, task] of tasks.entries()) {
      const row = Math.floor(index / perRow)
      const col = index % perRow
      nodes.push({
        id: `task:${task.id}`,
        kind: 'task',
        task,
        x: CEO_FLOW.padX + col * (CEO_FLOW.member.width + CEO_FLOW.columnGap),
        y: laneY + laneLabelH + row * (taskNodeH + CEO_FLOW.rowGap),
        enterIndex: memberColumnCount + 2 + index,
        width: CEO_FLOW.member.width,
        height: taskNodeH,
      })
    }
    const taskLaneHeight = laneLabelH + taskRows * (taskNodeH + CEO_FLOW.rowGap)
    taskLane = {
      id: 'lane:tasks',
      label: `任务板 · ${String(tasks.length)} 个任务`,
      x: CEO_FLOW.padX - WAVE_PAD,
      y: laneY - WAVE_PAD,
      w: width - CEO_FLOW.padX * 2 + WAVE_PAD * 2,
      h: taskLaneHeight + WAVE_PAD * 2,
      labelX: CEO_FLOW.padX + 8,
      labelY: laneY - WAVE_PAD,
    }
    return {
      width,
      height: laneY - WAVE_PAD + taskLaneHeight + WAVE_PAD * 2,
      nodes,
      edges,
      lanes,
      taskLane,
    }
  }

  return { width, height, nodes, edges, lanes }
}

/** 只渲染任务泳道的布局（无成员图时）。 */
function layoutTaskLaneOnly(tasks: readonly CeoFlowTask[]): CeoFlowLayout {
  const perRow = 4
  const width = CEO_FLOW.padX * 2 + perRow * (CEO_FLOW.member.width + CEO_FLOW.columnGap)
  const taskNodeH = 64
  const nodes: CeoFlowNode[] = tasks.map((task, index) => ({
    id: `task:${task.id}`,
    kind: 'task',
    task,
    x: CEO_FLOW.padX + (index % perRow) * (CEO_FLOW.member.width + CEO_FLOW.columnGap),
    y: CEO_FLOW.padY + 24 + Math.floor(index / perRow) * (taskNodeH + CEO_FLOW.rowGap),
    enterIndex: index,
    width: CEO_FLOW.member.width,
    height: taskNodeH,
  }))
  const rows = Math.max(1, Math.ceil(tasks.length / perRow))
  return {
    width,
    height: CEO_FLOW.padY * 2 + 24 + rows * (taskNodeH + CEO_FLOW.rowGap),
    nodes,
    edges: [],
    lanes: [],
    taskLane: {
      id: 'lane:tasks',
      label: `任务板 · ${String(tasks.length)} 个任务`,
      x: CEO_FLOW.padX,
      y: CEO_FLOW.padY,
      w: width - CEO_FLOW.padX * 2,
      h: rows * (taskNodeH + CEO_FLOW.rowGap) + 24,
      labelX: CEO_FLOW.padX + 8,
      labelY: CEO_FLOW.padY,
    },
  }
}

// ── 成员合并的引用收敛（CeoTeamGraph 每秒 tick 重排的根因）─────────────────

export type RosterMerger = (
  turnMembers: readonly CeoTeamMember[],
  roster: readonly CeoTeamMember[],
) => readonly CeoTeamMember[]

/**
 * 创建一个「roster 状态并回本 turn 成员序列」的合并器，并做引用收敛：
 * 输入数组引用变了、但逐位成员对象引用都没变（内容等价）时，返回**上一次的数组引用**。
 *
 * 为什么必须收敛：CeoTeamGraph 在 live 期间因 useElapsedSeconds 每秒重渲染，
 * 若每次都 map 出新数组，Canvas 的 memo 与内部 useMemo 每秒失效 → ReactFlow
 * 每秒重排整图。逐位引用相等即可视为内容等价——selection/team 的合并函数
 * 对未发生变化的成员都保留旧对象引用。
 *
 * 每个组件实例用 `createRosterMerger()` 持有自己的缓存：多个 ceo-team 节点
 * （多轮 CEO 输出）并存时互不踢缓存。
 */
export function createRosterMerger(): RosterMerger {
  let cache: {
    turn: readonly CeoTeamMember[]
    roster: readonly CeoTeamMember[]
    merged: readonly CeoTeamMember[]
  } | undefined
  return (turnMembers, roster) => {
    const cached = cache
    if (cached !== undefined && cached.turn === turnMembers && cached.roster === roster) {
      return cached.merged
    }
    const merged = turnMembers.map(member =>
      roster.find(item => item.callId === member.callId) ?? member,
    )
    const equivalent = cached !== undefined
      && cached.merged.length === merged.length
      && cached.merged.every((member, index) => merged[index] === member)
    cache = { turn: turnMembers, roster, merged: equivalent ? cached.merged : merged }
    return cache.merged
  }
}
