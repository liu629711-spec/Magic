import { createElement as h, useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import xyflowCss from '@xyflow/react/dist/style.css'
import { ceoTeamSinkStatus, layoutCeoTeamFlow } from '../flow.ts'
import { presentCeoMember, type CeoMemberViewStatus, type CeoTeamMember, type CeoTeamView } from '../team.ts'
import { getCeoRoster, getSelectedCeoMember, publishCeoTeam, selectCeoMember, subscribeCeoSelection } from './selection.ts'

export interface CeoTeamGraphProps {
  node: { data: CeoTeamView }
  openDetails: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}

type Translate = CeoTeamGraphProps['t']

interface GoalNodeData {
  t: Translate
}

interface MemberNodeData {
  member: CeoTeamMember
  selected: boolean
  t: Translate
}

interface CeoNodeData {
  status: CeoMemberViewStatus
  t: Translate
}

type CanvasNode = Node<GoalNodeData | MemberNodeData | CeoNodeData>

const STATUS_COLOR: Record<CeoMemberViewStatus, string> = {
  queued: 'var(--dsw-alias-label-tertiary, #9a9a9a)',
  running: 'var(--dsw-alias-state-business-primary, #3b82f6)',
  delegated: 'var(--dsw-alias-state-success, #16a34a)',
  completed: 'var(--dsw-alias-state-success, #16a34a)',
  blocked: 'var(--dsw-alias-state-danger, #dc2626)',
  failed: 'var(--dsw-alias-state-danger, #dc2626)',
  partial: 'var(--dsw-alias-state-warning, #d97706)',
  error: 'var(--dsw-alias-state-danger, #dc2626)',
}

const EDGE_COLOR = {
  goal: 'var(--dsw-alias-border-l4, #5a5a5a)',
  depends: 'var(--dsw-alias-label-tertiary, #9a9a9a)',
  report: 'var(--dsw-alias-border-l4, #5a5a5a)',
} as const

const CANVAS_CSS = `
${xyflowCss}
.magic-ceo-canvas .react-flow__node {
  background: transparent;
  border: 0;
  padding: 0;
  box-shadow: none;
}
.magic-ceo-canvas .react-flow__handle {
  width: 8px;
  height: 8px;
  border: 0;
  background: var(--dsw-alias-border-l4, #5a5a5a);
}
.magic-ceo-canvas .react-flow__attribution { display: none; }
`

let canvasCssInjected = false

function ensureCanvasCss(): void {
  if (canvasCssInjected || typeof document === 'undefined') return
  canvasCssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-magic-ceo-canvas', 'true')
  style.textContent = CANVAS_CSS
  document.head.appendChild(style)
}

function cardStyle(selected: boolean, needsDecision: boolean): CSSProperties {
  return {
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    background: 'var(--dsw-alias-bg-module-platform, #161616)',
    border: selected
      ? '1px solid var(--dsw-alias-state-business-primary, #3b82f6)'
      : needsDecision
        ? '1px solid var(--dsw-alias-state-warning, #d97706)'
        : '1px solid var(--dsw-alias-border-l1, #2a2a2a)',
    color: 'var(--dsw-alias-label-primary, #f5f5f5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    cursor: 'pointer',
    textAlign: 'left',
  }
}

function statusDot(status: CeoMemberViewStatus): ReactNode {
  return h('span', {
    'aria-hidden': true,
    style: {
      width: 8,
      height: 8,
      flex: '0 0 auto',
      borderRadius: 99,
      background: STATUS_COLOR[status],
      boxShadow: status === 'running'
        ? `0 0 0 4px color-mix(in srgb, ${STATUS_COLOR.running} 25%, transparent)`
        : undefined,
    },
  })
}

function handles(kind: 'goal' | 'member' | 'ceo'): ReactNode {
  return [
    kind === 'goal' ? null : h(Handle, { key: 'in', type: 'target', position: Position.Left }),
    kind === 'ceo' ? null : h(Handle, { key: 'out', type: 'source', position: Position.Right }),
  ]
}

function GoalNode({ data }: NodeProps<Node<GoalNodeData>>) {
  return h('div', {
    'data-magic-ceo-node': 'goal',
    style: { ...cardStyle(false, false), cursor: 'default', justifyContent: 'center', gap: 4 },
  },
    h('strong', { style: { fontSize: 13, fontWeight: 510 } }, data.t('graph.goal')),
    h('div', {
      style: { fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary, #9a9a9a)' },
    }, data.t('graph.goalHint')),
    ...handles('goal'),
  )
}

function MemberNode({ data }: NodeProps<Node<MemberNodeData>>) {
  const presentation = presentCeoMember(data.member)
  return h('div', {
    'data-magic-ceo-member': data.member.memberId ?? data.member.callId,
    'data-magic-ceo-node': 'member',
    'data-status': presentation.viewStatus,
    'data-selected': data.selected ? 'true' : undefined,
    style: cardStyle(data.selected, presentation.needsDecision),
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      statusDot(presentation.viewStatus),
      h('strong', {
        style: {
          fontSize: 13,
          fontWeight: 510,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, data.member.role),
      h('span', {
        style: { marginLeft: 'auto', fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #9a9a9a)' },
      }, data.t(`status.${presentation.viewStatus}`)),
    ),
    h('div', {
      style: {
        fontSize: 12,
        lineHeight: '18px',
        color: 'var(--dsw-alias-label-secondary, #c8c8c8)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      },
    }, data.member.task),
    presentation.needsDecision || presentation.hasBlocker
      ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        presentation.needsDecision
          ? h('span', {
            'data-badge': 'decision',
            style: {
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 99,
              background: 'color-mix(in srgb, var(--dsw-alias-state-warning, #d97706) 18%, transparent)',
              color: 'var(--dsw-alias-state-warning, #d97706)',
            },
          }, data.t('badge.decision'))
          : null,
        presentation.hasBlocker
          ? h('span', {
            'data-badge': 'blocker',
            style: {
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 99,
              background: 'color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 18%, transparent)',
              color: 'var(--dsw-alias-state-danger, #dc2626)',
            },
          }, data.t('badge.blocker'))
          : null,
      )
      : null,
    ...handles('member'),
  )
}

function CeoNode({ data }: NodeProps<Node<CeoNodeData>>) {
  return h('div', {
    'data-magic-ceo-node': 'ceo',
    style: { ...cardStyle(false, false), justifyContent: 'center', gap: 4 },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      statusDot(data.status),
      h('strong', { style: { fontSize: 13, fontWeight: 510 } }, data.t('graph.ceo')),
    ),
    h('div', {
      style: { fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary, #9a9a9a)' },
    }, data.t(`status.${data.status}`)),
    ...handles('ceo'),
  )
}

const nodeTypes = {
  goal: GoalNode,
  member: MemberNode,
  ceo: CeoNode,
}

function zoomButton(label: string, onClick: () => void): ReactNode {
  return h('button', {
    type: 'button',
    'aria-label': label,
    title: label,
    onClick,
    style: {
      width: 28,
      height: 28,
      border: 0,
      borderRadius: 8,
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary, #f5f5f5)',
      cursor: 'pointer',
      fontSize: 16,
      lineHeight: '28px',
    },
  }, label === '适应画布' || label === 'Fit' ? '⤢' : label === '放大' || label === 'Zoom in' ? '+' : '−')
}

function Canvas(props: {
  members: readonly CeoTeamMember[]
  selectedCallId: string | undefined
  openDetails: () => void
  t: Translate
}) {
  const layout = layoutCeoTeamFlow(props.members)
  const sinkStatus = ceoTeamSinkStatus(props.members)
  const flow = useMemo(() => {
    const nodes: CanvasNode[] = layout.nodes.map((node) => {
      if (node.kind === 'goal') {
        return {
          id: node.id,
          type: 'goal',
          position: { x: node.x, y: node.y },
          data: { t: props.t },
          width: node.width,
          height: node.height,
          draggable: false,
          selectable: false,
        }
      }
      if (node.kind === 'ceo') {
        return {
          id: node.id,
          type: 'ceo',
          position: { x: node.x, y: node.y },
          data: { status: sinkStatus, t: props.t },
          width: node.width,
          height: node.height,
          draggable: false,
          selectable: false,
        }
      }
      const member = node.member!
      return {
        id: node.id,
        type: 'member',
        position: { x: node.x, y: node.y },
        data: {
          member,
          selected: member.callId === props.selectedCallId,
          t: props.t,
        },
        width: node.width,
        height: node.height,
        draggable: false,
        selectable: false,
      }
    })
    const edges: Edge[] = layout.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'default',
      selectable: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: {
        stroke: EDGE_COLOR[edge.kind],
        strokeWidth: 1.5,
      },
    }))
    return { nodes, edges }
  }, [layout, props.selectedCallId, props.t, sinkStatus])

  const height = Math.min(420, Math.max(240, layout.height + 48))
  const instanceRef = useRef<ReactFlowInstance | null>(null)

  return h('div', {
    className: 'magic-ceo-canvas',
    'data-magic-ceo-flow': true,
    style: {
      position: 'relative',
      width: '100%',
      height,
      minWidth: 0,
      overflow: 'hidden',
      borderRadius: 12,
      border: '1px solid var(--dsw-alias-border-l2, #2a2a2a)',
      background: 'var(--dsw-alias-bg-base, #111)',
    },
  },
    h(ReactFlow, {
      nodes: flow.nodes,
      edges: flow.edges,
      nodeTypes,
      fitView: true,
      minZoom: 0.35,
      maxZoom: 1.6,
      panOnDrag: true,
      zoomOnScroll: true,
      zoomOnPinch: true,
      zoomOnDoubleClick: true,
      preventScrolling: true,
      nodesDraggable: false,
      nodesConnectable: false,
      nodesFocusable: false,
      elementsSelectable: false,
      proOptions: { hideAttribution: true },
      onInit: (next: ReactFlowInstance) => { instanceRef.current = next },
      onNodeClick: (_event: unknown, node: CanvasNode) => {
        if (node.type === 'member') {
          const member = (node.data as MemberNodeData).member
          selectCeoMember(member)
          props.openDetails()
          return
        }
        if (node.type === 'ceo') {
          selectCeoMember(null)
          props.openDetails()
        }
      },
    },
      h(Background, { gap: 20, size: 1, color: 'var(--dsw-alias-border-l3, #3a3a3a)' }),
    ),
    h('div', {
      style: {
        position: 'absolute',
        left: 10,
        bottom: 10,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 4,
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2, #2a2a2a)',
        background: 'color-mix(in srgb, var(--dsw-alias-bg-module-platform, #161616) 92%, transparent)',
      },
    },
      zoomButton(props.t('graph.zoomIn'), () => { instanceRef.current?.zoomIn({ duration: 160 }) }),
      zoomButton(props.t('graph.zoomOut'), () => { instanceRef.current?.zoomOut({ duration: 160 }) }),
      zoomButton(props.t('graph.fit'), () => { instanceRef.current?.fitView({ duration: 160, padding: 0.16 }) }),
    ),
  )
}

export function CeoTeamGraph(props: CeoTeamGraphProps) {
  const selected = useSyncExternalStore(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember)
  const roster = useSyncExternalStore(subscribeCeoSelection, getCeoRoster, getCeoRoster)
  const turnMembers = props.node.data.members
  const members = turnMembers.map(member =>
    roster.find(item => item.callId === member.callId) ?? member,
  )

  useEffect(() => { ensureCanvasCss() }, [])
  useEffect(() => {
    publishCeoTeam(turnMembers)
  }, [turnMembers])

  return h('section', {
    'data-magic-ceo-team': true,
    style: {
      width: '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '8px 0 12px',
    },
  },
    h('header', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--dsw-alias-label-secondary, #c8c8c8)',
        fontSize: 13,
        fontWeight: 510,
      },
    },
      props.t('graph.title'),
      h('span', {
        style: { marginLeft: 'auto', fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #9a9a9a)' },
      }, props.t('graph.members', { count: members.length })),
    ),
    h(ReactFlowProvider, null,
      h(Canvas, {
        members,
        selectedCallId: selected?.callId,
        openDetails: props.openDetails,
        t: props.t,
      }),
    ),
  )
}
