import { createContext, createElement as h, Fragment, memo, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodeId,
  ViewportPortal,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import xyflowCss from '@xyflow/react/dist/style.css'
import { ceoFlowMemberId, ceoTeamSinkStatus, layoutCeoTeamFlow, type CeoFlowEdgeKind, type CeoFlowLane } from '../flow.ts'
import { parseCeoMemberReport } from '../team.ts'
import { toolDisplayName } from '../processView.ts'
import {
  debriefSummaryOf,
  displayCeoSeat,
  formatTokenCount,
  presentCeoMember,
  type CeoMemberViewStatus,
  type CeoTeamMember,
  type CeoTeamView,
} from '../team.ts'
import { getCeoRoster, getSelectedCeoMember, publishCeoTeam, selectCeoMember, subscribeCeoSelection } from './selection.ts'
import { ink, line, surface } from './theme.ts'

export interface CeoTeamGraphProps {
  node: { data: CeoTeamView }
  sessionId?: string
  openDetails: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}

type Translate = CeoTeamGraphProps['t']

interface GoalNodeData {
  preview: string
  enterIndex: number
  t: Translate
}

interface MemberNodeData {
  member: CeoTeamMember
  roster: readonly CeoTeamMember[]
  selected: boolean
  enterIndex: number
  t: Translate
}

interface CeoNodeData {
  status: CeoMemberViewStatus
  enterIndex: number
  t: Translate
}

interface FlowEdgeData extends Record<string, unknown> {
  animated?: boolean
  kind?: CeoFlowEdgeKind
  /** AgentCore handoff fidelity: only lossy edges show a label. */
  handoff?: 'summary' | 'truncated'
}

interface GraphHoverState {
  hoveredNodeId: string | null
  keepBrightIds: Set<string> | null
}

const GraphHoverContext = createContext<GraphHoverState>({
  hoveredNodeId: null,
  keepBrightIds: null,
})

/** AgentCore identity palette: oklch(0.58 0.13 H) — lifted chroma so hues stay
 *  readable on the light DSH theme while still steering clear of status hues. */
const ROLE_COLORS = [
  'oklch(0.55 0.13 95)',
  'oklch(0.55 0.13 145)',
  'oklch(0.55 0.13 200)',
  'oklch(0.55 0.13 240)',
  'oklch(0.55 0.13 285)',
  'oklch(0.55 0.13 320)',
  'oklch(0.55 0.13 20)',
  'oklch(0.55 0.13 60)',
] as const

function hashRole(role: string): number {
  let hash = 0x811c9dc5
  for (const char of role) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function roleColor(role: string): string {
  const key = role.trim()
  if (key === '') return ROLE_COLORS[0]
  return ROLE_COLORS[hashRole(key) % ROLE_COLORS.length]!
}

function roleGlyph(role: string): string {
  const key = role.trim()
  if (key === '') return '?'
  return Array.from(key)[0] ?? '?'
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`
}

function memberPreview(member: CeoTeamMember): string {
  const output = debriefSummaryOf(member.report, member.lastMessage)
  if (output.trim() !== '') return clipOneLine(output)
  return clipOneLine(member.task)
}

function initiatorPreview(text: string): string {
  const raw = text.trim()
  const withRoles = raw.match(/^\d+\s*个\s*workers?\s*[：:]\s*(.*)$/i)
  const base = withRoles ? (withRoles[1] ?? '').trim() : /^\d+\s*个\s*workers?$/i.test(raw) ? '' : raw
  return clipOneLine(base)
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
  unverified: 'var(--dsw-alias-state-warning, #d97706)',
  unknown_after_restart: 'var(--dsw-alias-label-tertiary, #9a9a9a)',
  error: 'var(--dsw-alias-state-danger, #dc2626)',
}

const EDGE_COLOR = {
  goal: 'var(--dsw-alias-border-l3, #4a4a58)',
  depends: 'var(--dsw-alias-label-tertiary, #9a9a9a)',
  report: 'var(--dsw-alias-border-l3, #4a4a58)',
} as const

const CANVAS_CSS = `
${xyflowCss}
.magic-ceo-canvas .react-flow__node {
  background: transparent;
  border: 0;
  padding: 0;
  box-shadow: none;
  width: 210px;
  height: 110px;
}
.magic-ceo-canvas .react-flow__handle {
  width: 8px;
  height: 8px;
  border: 0;
  background: var(--dsw-alias-border-l4, #5a5a5a);
}
.magic-ceo-canvas .react-flow__attribution { display: none; }
.magic-ceo-node-face {
  animation: magic-ceo-node-enter 0.28s ease-out both;
}
@keyframes magic-ceo-node-enter {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
/* Running presence rides the status dot only: transform/opacity keep it on the
   compositor. An infinite card-level filter/drop-shadow repaints the whole
   card every frame and reads as jank with several running members. */
@keyframes magic-ceo-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.6; }
}
/* AgentCore terminal flash: one-shot scale + glow on settle. */
.magic-ceo-node-flash {
  animation: magic-ceo-node-flash 0.6s ease-out;
}
@keyframes magic-ceo-node-flash {
  0% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
  40% { transform: scale(1.035); box-shadow: 0 0 12px 3px var(--graph-flash-color, var(--dsw-alias-state-success, #16a34a)); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}
@keyframes magic-ceo-spin {
  to { transform: rotate(360deg); }
}
@keyframes magic-ceo-pulse {
  0%, 100% { opacity: .45 }
  50% { opacity: 1 }
}
.magic-ceo-canvas .react-flow__node { transition: none; }
.magic-ceo-node-dim {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}
.magic-ceo-node-bright {
  opacity: 1;
  transition: opacity 0.15s ease;
}
@media (prefers-reduced-motion: reduce) {
  .magic-ceo-node-face,
  .magic-ceo-node-flash {
    animation: none;
  }
  [data-magic-ceo-status-strip] span {
    animation: none !important;
  }
}
`

const PARTICLE_BEGINS = ['0s', '0.5s', '1s'] as const
const PARTICLE_DUR = '1.5s'

function motionEnabled(): boolean {
  return typeof window === 'undefined'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches === false
}

function enterDelay(index: number): string {
  return `${String(Math.min(Math.max(0, index) * 35, 280))}ms`
}

let canvasCssInjected = false

function ensureCanvasCss(): void {
  if (canvasCssInjected || typeof document === 'undefined') return
  canvasCssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-magic-ceo-canvas', 'true')
  style.textContent = CANVAS_CSS
  document.head.appendChild(style)
}

function cardStyle(selected: boolean, needsDecision: boolean, ring?: string, muted = false): CSSProperties {
  return {
    boxSizing: 'border-box',
    width: 210,
    height: 110,
    padding: '10px 12px',
    borderRadius: 12,
    background: muted
      ? 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 40%, var(--dsw-alias-bg-base, #ffffff))'
      : 'var(--dsw-alias-bg-base, #ffffff)',
    border: `1px solid ${ring ?? (selected ? ink.accent : needsDecision ? ink.warn : line.subtle)}`,
    // AgentCore weight: colored border carries status; a whisper of lift keeps
    // cards off the canvas without heavy halos.
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    color: ink.primary,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    cursor: 'pointer',
    textAlign: 'left',
    overflow: 'hidden',
  }
}

function faceStyle(enterIndex: number): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    animationDelay: enterDelay(enterIndex),
  }
}

function FlowEdge({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<Edge<FlowEdgeData>>) {
  // AgentCore leftright layout keeps orthogonal smoothstep edges with 10px
  // rounded corners (StepEdge.tsx:124-132, edgePathType defaults to
  // "smoothstep") — the straight-angle look, not bezier.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  })
  const animated = data?.animated === true && motionEnabled()
  const kind = data?.kind
  const handoff = data?.handoff
  const { hoveredNodeId, keepBrightIds } = useContext(GraphHoverContext)
  const hoverActive = hoveredNodeId !== null
  const hoverRelated = keepBrightIds?.has(source) === true && keepBrightIds.has(target) === true
  let strokeOpacity: number
  let strokeWidth: number
  let strokeColor: string
  if (animated) {
    strokeOpacity = 1
    strokeWidth = 2
    strokeColor = ink.accent
  } else if (!hoverActive) {
    strokeOpacity = kind === 'depends' ? 0.35 : 0.4
    strokeWidth = 1.5
    strokeColor = typeof style?.stroke === 'string' ? style.stroke : EDGE_COLOR.goal
  } else if (hoverRelated) {
    strokeOpacity = 1
    strokeWidth = 2
    strokeColor = ink.accent
  } else {
    strokeOpacity = 0.1
    strokeWidth = 1.5
    strokeColor = typeof style?.stroke === 'string' ? style.stroke : EDGE_COLOR.goal
  }
  const dash = kind === 'depends' ? '5 4' : undefined
  // AgentCore StepEdge information-handoff label: only lossy handoffs get a
  // label (summary / truncated). A full handoff stays a clean line.
  const handoffShort = handoff === 'summary' || handoff === 'truncated'
    ? handoff === 'summary' ? '摘要' : '已截断'
    : null
  return h(Fragment, null,
    h(BaseEdge, {
      path: edgePath,
      markerEnd,
      style: {
        ...style,
        stroke: strokeColor,
        strokeWidth,
        opacity: strokeOpacity,
        strokeDasharray: animated ? undefined : dash,
      },
    }),
    handoffShort !== null
      ? h(EdgeLabelRenderer, null,
        h('div', {
          className: 'nodrag nopan',
          style: {
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(labelY)}px)`,
            pointerEvents: 'none',
            fontSize: 10,
            lineHeight: '14px',
            padding: '1px 6px',
            borderRadius: 999,
            border: `1px solid ${line.subtle}`,
            background: 'var(--dsw-alias-bg-base, #ffffff)',
            color: ink.tertiary,
            whiteSpace: 'nowrap',
          },
        }, handoffShort),
      )
      : null,
    animated
      ? PARTICLE_BEGINS.map(begin => h('circle', {
        key: begin,
        r: 3,
        fill: ink.accent,
      }, h('animateMotion', {
        dur: PARTICLE_DUR,
        begin,
        repeatCount: 'indefinite',
        path: edgePath,
      })))
      : null,
  )
}

function clampPreview(text: string): CSSProperties {
  return {
    fontSize: 12,
    lineHeight: '16px',
    color: ink.tertiary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  }
}

/** An upstream that declared only partial work or open risks is a lossy handoff
 *  (summary); its full text stayed under the truncation limit. */
function parseCeoMemberReportHasSummary(member: CeoTeamMember | undefined): boolean {
  if (member === undefined) return false
  const report = parseCeoMemberReport(member.lastMessage ?? '')
  return report?.status === 'partial'
    || (report?.risksOrBlockers ?? '').trim() !== ''
}

/** One-line soft preview so a long task never dominates the card. */
function clipOneLine(text: string): string {
  const chars = Array.from(text.trim())
  if (chars.length <= 24) return text.trim()
  return `${chars.slice(0, 24).join('')}…`
}

function useGraphNodeDimmed(): boolean {
  const nodeId = useNodeId()
  const { keepBrightIds } = useContext(GraphHoverContext)
  if (keepBrightIds === null || nodeId == null) return false
  return keepBrightIds.has(nodeId) === false
}

function graphNodeDimClass(dimmed: boolean): string {
  return dimmed ? 'magic-ceo-node-dim' : 'magic-ceo-node-bright'
}

function isTerminalStatus(status: CeoMemberViewStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'error'
}

function useTerminalFlash(status: CeoMemberViewStatus): boolean {
  const [flashing, setFlashing] = useState(false)
  const prev = useRef(status)
  useEffect(() => {
    const was = prev.current
    prev.current = status
    if (was === status) return undefined
    if (isTerminalStatus(status) && isTerminalStatus(was) === false) {
      setFlashing(true)
      const timer = setTimeout(() => { setFlashing(false) }, 600)
      return () => { clearTimeout(timer) }
    }
    setFlashing(false)
    return undefined
  }, [status])
  return flashing
}

function endpointAvatar(kind: 'goal' | 'ceo', status: CeoMemberViewStatus): ReactNode {
  const color = kind === 'goal' ? ink.tertiary : STATUS_COLOR[status]
  return h('span', {
    'aria-hidden': true,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 99,
      background: surface.layer3,
      color,
      fontSize: 13,
      fontWeight: 600,
      flex: '0 0 auto',
    },
  }, kind === 'goal' ? '你' : '汇')
}

function handles(kind: 'goal' | 'member' | 'ceo'): ReactNode {
  return [
    kind === 'goal' ? null : h(Handle, { key: 'in', type: 'target', position: Position.Left }),
    kind === 'ceo' ? null : h(Handle, { key: 'out', type: 'source', position: Position.Right }),
  ]
}

function GoalNode({ data }: NodeProps<Node<GoalNodeData>>) {
  const dimmed = useGraphNodeDimmed()
  return h('div', {
    'data-magic-ceo-node': 'goal',
    className: `magic-ceo-node-face ${graphNodeDimClass(dimmed)}`,
    style: { ...cardStyle(false, false, undefined, true), cursor: 'default', ...faceStyle(data.enterIndex) },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      endpointAvatar('goal', 'queued'),
      h('strong', {
        style: {
          fontSize: 13,
          fontWeight: 510,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, data.t('graph.goal')),
    ),
    h('div', {
      style: { marginTop: 4, fontSize: 11, lineHeight: '16px', color: ink.tertiary },
    }, data.t('graph.goalHint')),
    data.preview.trim() === ''
      ? null
      : h('div', { style: { ...clampPreview(data.preview), marginTop: 6 } }, data.preview),
    ...handles('goal'),
  )
}

function MemberNode({ data }: NodeProps<Node<MemberNodeData>>) {
  const member = data.member
  const presentation = presentCeoMember(member)
  const activity = member.activity
  const title = displayCeoSeat(member, data.roster)
  const identity = roleColor(title)
  const running = presentation.viewStatus === 'running'
  const completed = presentation.viewStatus === 'completed'
  const preview = memberPreview(data.member)
  const hoverDimmed = useGraphNodeDimmed()
  const flashing = useTerminalFlash(presentation.viewStatus)
  const face = running
    ? activity?.phase === 'tool'
      ? `正在生成 ${toolDisplayName(activity.toolName ?? '运行中')}`
      : activity?.phase === 'thinking'
        ? '正在分析'
        : activity?.phase === 'winding_down'
          ? '正在收尾'
          : data.t('status.running')
    : presentation.viewStatus === 'queued' && data.member.dependsOn.length > 0
      ? '等待依赖'
      : data.t(`status.${presentation.viewStatus}`)
  const flashColor = presentation.viewStatus === 'failed' || presentation.viewStatus === 'error'
    ? 'var(--dsw-alias-state-danger, #dc2626)'
    : 'var(--dsw-alias-state-success, #16a34a)'
  return h('div', {
    'data-magic-ceo-member': data.member.memberId ?? data.member.callId,
    'data-magic-ceo-node': 'member',
    'data-status': presentation.viewStatus,
    'data-selected': data.selected ? 'true' : undefined,
    className: `${graphNodeDimClass(hoverDimmed)}${running ? ' magic-ceo-node-running' : ''}`,
  },
    h('div', {
      className: `magic-ceo-node-face${flashing ? ' magic-ceo-node-flash' : ''}`,
      style: {
        ['--graph-flash-color' as string]: flashColor,
        ...cardStyle(
          data.selected,
          presentation.needsDecision,
          completed
            ? 'var(--dsw-alias-state-success, #16a34a)'
            : presentation.hasBlocker || presentation.viewStatus === 'failed' || presentation.viewStatus === 'error'
              ? 'var(--dsw-alias-state-danger, #dc2626)'
              : presentation.viewStatus === 'partial' || presentation.viewStatus === 'unverified'
                ? 'var(--dsw-alias-state-warning, #d97706)'
                : undefined,
        ),
        ...faceStyle(data.enterIndex),
      },
    },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      h('span', {
        style: { position: 'relative', flex: '0 0 auto', width: 28, height: 28 },
      },
        h('span', {
          'aria-hidden': true,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 99,
            background: `color-mix(in oklab, ${identity} 18%, transparent)`,
            color: identity,
            fontSize: 14,
            fontWeight: 600,
          },
        }, roleGlyph(title)),
        h('span', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 14,
            height: 14,
            borderRadius: 99,
            background: STATUS_COLOR[presentation.viewStatus],
            border: '2px solid var(--dsw-alias-bg-base, #ffffff)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: running ? 'magic-ceo-dot-pulse 2s ease-in-out infinite' : undefined,
          },
        }, running
          ? h('span', {
            'aria-hidden': true,
            style: {
              width: 6,
              height: 6,
              border: '1.5px solid rgba(255,255,255,0.95)',
              borderTopColor: 'transparent',
              borderRadius: 99,
            },
          })
          : presentation.viewStatus === 'completed'
            ? h('span', { style: { fontSize: 8, lineHeight: '8px', color: '#fff', fontWeight: 700 } }, '✓')
            : null),
      ),
      h('strong', {
        style: {
          minWidth: 0,
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, title),
    ),
    // AgentCore AgentNodeMeta: badges left, status right on its own row.
    h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        fontSize: 12,
        lineHeight: '16px',
        color: ink.tertiary,
      },
    },
      presentation.needsDecision
        ? h('span', {
          'data-badge': 'decision',
          style: {
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 8,
            background: 'var(--dsw-alias-bg-layer-2, #f4f4f6)',
            color: ink.tertiary,
          },
        }, data.t('badge.decision'))
        : presentation.hasBlocker
          ? h('span', {
            'data-badge': 'blocker',
            style: {
              fontSize: 12,
              padding: '2px 6px',
              borderRadius: 8,
              background: 'var(--dsw-alias-bg-layer-2, #f4f4f6)',
              color: ink.tertiary,
            },
          }, data.t('badge.blocker'))
          : null,
      member.halted === true
        ? h('span', {
          'data-badge': 'halted',
          title: data.t('halted.hint'),
          style: {
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 10%, transparent)',
            color: 'var(--dsw-alias-state-danger, #dc2626)',
          },
        }, data.t('halted.badge'))
        : null,
      member.usage !== undefined
        ? h('span', {
          'data-badge': 'tokens',
          title: data.t('tokens.tooltip', {
            input: formatTokenCount(member.usage.inputTokens),
            output: formatTokenCount(member.usage.outputTokens),
          }),
          style: {
            fontVariantNumeric: 'tabular-nums',
            fontSize: 11,
            color: ink.tertiary,
          },
        }, data.t('tokens.badge', {
          tokens: formatTokenCount(
            member.usage.totalTokens
              ?? member.usage.inputTokens + member.usage.outputTokens,
          ),
        }))
        : null,
      h('span', {
        style: {
          marginLeft: 'auto',
          fontVariantNumeric: 'tabular-nums',
          color: running ? ink.accent : ink.tertiary,
        },
      }, face),
    ),
    preview === ''
      ? null
      : h('div', { style: { ...clampPreview(preview), marginTop: 8 } }, preview),
    ...handles('member'),
    ),
  )
}

function CeoNode({ data }: NodeProps<Node<CeoNodeData>>) {
  const dimmed = useGraphNodeDimmed()
  const flashing = useTerminalFlash(data.status)
  const caption = data.status === 'running'
    ? data.t('graph.ceoRunning')
    : data.status === 'completed'
      ? data.t('graph.ceoDone')
      : data.t('graph.ceoPending')
  const flashColor = data.status === 'failed' || data.status === 'error'
    ? 'var(--dsw-alias-state-danger, #dc2626)'
    : 'var(--dsw-alias-state-success, #16a34a)'
  return h('div', {
    'data-magic-ceo-node': 'ceo',
    className: `${graphNodeDimClass(dimmed)}${data.status === 'running' ? ' magic-ceo-node-running' : ''}`,
  },
    h('div', {
      className: `magic-ceo-node-face${flashing ? ' magic-ceo-node-flash' : ''}`,
      style: {
        ['--graph-flash-color' as string]: flashColor,
        ...cardStyle(
          false,
          false,
          data.status === 'completed'
            ? 'var(--dsw-alias-state-success, #16a34a)'
            : data.status === 'running'
              ? 'var(--dsw-alias-state-business-primary, #3b82f6)'
              : undefined,
        ),
        ...faceStyle(data.enterIndex),
      },
    },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      endpointAvatar('ceo', data.status),
      h('strong', { style: { fontSize: 13, fontWeight: 510 } }, data.t('graph.ceo')),
    ),
    h('div', {
      style: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: '16px',
        color: data.status === 'running' ? ink.accent : ink.tertiary,
      },
    }, caption),
    ...handles('ceo'),
    ),
  )
}

const nodeTypes = {
  goal: GoalNode,
  member: MemberNode,
  ceo: CeoNode,
}

const edgeTypes = {
  flow: FlowEdge,
}

/** Re-renders once per second so elapsed labels tick without re-rendering the graph above. */
function useElapsedSeconds(live: boolean): number {
  const [, setTick] = useState(0)
  const startedRef = useRef<number | null>(null)
  const frozenRef = useRef(0)
  if (live && startedRef.current === null) startedRef.current = Date.now()
  if (!live && startedRef.current !== null) {
    frozenRef.current = Math.max(0, Math.floor((Date.now() - startedRef.current) / 1000))
    startedRef.current = null
  }
  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(() => { setTick(value => value + 1) }, 1000)
    return () => { clearInterval(id) }
  }, [live])
  return live && startedRef.current !== null
    ? Math.max(0, Math.floor((Date.now() - startedRef.current) / 1000))
    : frozenRef.current
}

/** AgentCore WaveLanes: one soft backdrop band per wave column, rendered under
 *  the nodes in the viewport portal so pan/zoom carries it for free. */
function WaveLanes({ lanes }: { lanes: CeoFlowLane[] }): ReactNode {
  if (lanes.length === 0) return null
  return h(ViewportPortal, null,
    lanes.map(lane => h(Fragment, { key: lane.id },
      h('div', {
        'data-magic-ceo-lane': lane.id,
        style: {
          position: 'absolute',
          transform: `translate(${String(lane.x)}px, ${String(lane.y)}px)`,
          width: lane.w,
          height: lane.h,
          borderRadius: 12,
          border: '1px solid color-mix(in srgb, var(--dsw-alias-border-l3, #4a4a58) 30%, transparent)',
          background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 55%, transparent)',
          zIndex: -1,
          pointerEvents: 'none',
        },
      }),
      h('div', {
        style: {
          position: 'absolute',
          transform: `translate(${String(lane.labelX)}px, ${String(lane.labelY)}px)`,
          zIndex: 1,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontSize: 10,
          lineHeight: '14px',
          color: ink.tertiary,
          letterSpacing: '0.04em',
          padding: '1px 8px',
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 80%, transparent)',
        },
      }, lane.label),
    )),
  )
}

/** AgentCore graphHover.hoverRelatedIds: hovered node plus its full directed
 *  upstream + downstream path along the current edge list. */
function hoverRelatedIds(
  hoveredNodeId: string,
  edges: readonly { from: string; to: string }[],
): Set<string> {
  const upstream = new Map<string, string[]>()
  const downstream = new Map<string, string[]>()
  for (const edge of edges) {
    const ups = upstream.get(edge.to)
    if (ups) ups.push(edge.from)
    else upstream.set(edge.to, [edge.from])
    const downs = downstream.get(edge.from)
    if (downs) downs.push(edge.to)
    else downstream.set(edge.from, [edge.to])
  }
  const related = new Set<string>([hoveredNodeId])
  const walk = (adj: Map<string, string[]>) => {
    const stack = [hoveredNodeId]
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) break
      for (const next of adj.get(current) ?? []) {
        if (related.has(next)) continue
        related.add(next)
        stack.push(next)
      }
    }
  }
  walk(upstream)
  walk(downstream)
  return related
}

const Canvas = memo(function Canvas(props: {
  members: readonly CeoTeamMember[]
  selectedCallId: string | undefined
  goalPreview: string
  openDetails: () => void
  t: Translate
}) {
  const layout = layoutCeoTeamFlow(props.members)
  const sinkStatus = ceoTeamSinkStatus(props.members)
  // AgentCore graphHover: hovering a node brightens its full upstream+downstream
  // path and dims everything else — paint-level only, never RF node.className.
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoverState = useMemo<GraphHoverState>(() => ({
    hoveredNodeId: hoveredId,
    keepBrightIds: hoveredId === null ? null : hoverRelatedIds(hoveredId, layout.edges),
  }), [hoveredId, layout.edges])
  const flow = useMemo(() => {
    const nodes: CanvasNode[] = layout.nodes.map((node) => {
      if (node.kind === 'goal') {
        return {
          id: node.id,
          type: 'goal',
          position: { x: node.x, y: node.y },
          data: { preview: props.goalPreview, enterIndex: node.enterIndex, t: props.t },
          width: node.width,
          height: node.height,
          style: { width: node.width, height: node.height },
          draggable: false,
          selectable: false,
        }
      }
      if (node.kind === 'ceo') {
        return {
          id: node.id,
          type: 'ceo',
          position: { x: node.x, y: node.y },
          data: { status: sinkStatus, enterIndex: node.enterIndex, t: props.t },
          width: node.width,
          height: node.height,
          style: { width: node.width, height: node.height },
          draggable: false,
          selectable: false,
        }
      }
      const member = node.member!
      return {
        id: ceoFlowMemberId(member.callId),
        type: 'member',
        position: { x: node.x, y: node.y },
        data: {
          member,
          roster: props.members,
          selected: member.callId === props.selectedCallId,
          enterIndex: node.enterIndex,
          t: props.t,
        },
        width: node.width,
        height: node.height,
        style: { width: node.width, height: node.height },
        draggable: false,
        selectable: false,
      }
    })
    const runningIds = new Set(
      props.members
        .filter(item => presentCeoMember(item).viewStatus === 'running')
        .map(item => ceoFlowMemberId(item.callId)),
    )
    if (sinkStatus === 'running') runningIds.add('ceo')
    const edges: Edge<FlowEdgeData>[] = layout.edges.map((edge) => {
      const live = runningIds.has(edge.to)
      // AgentCore handoff fidelity: a dependency whose upstream text was clipped
      // marks the edge so the user sees where information was compressed.
      const upstreamMember = edge.kind === 'depends'
        ? props.members.find(item => ceoFlowMemberId(item.callId) === edge.from)
        : undefined
      const upstreamOutput = upstreamMember?.lastMessage ?? ''
      const handoff: FlowEdgeData['handoff'] | undefined = edge.kind === 'depends'
        ? (upstreamOutput.length > 2000
          ? 'truncated'
          : parseCeoMemberReportHasSummary(upstreamMember) === true
            ? 'summary'
            : undefined)
        : undefined
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: 'flow',
        data: { animated: live, kind: edge.kind, ...handoff === undefined ? {} : { handoff } },
        selectable: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke: EDGE_COLOR[edge.kind],
          strokeWidth: 1.5,
        },
      }
    })
    return { nodes, edges }
  }, [layout, props.goalPreview, props.selectedCallId, props.t, sinkStatus, props.members])

  const height = Math.min(520, Math.max(300, layout.height + 72))

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
      border: `1px solid ${line.subtle}`,
      background: 'var(--dsw-alias-bg-layer-1, #f7f7f9)',
    },
  },
    h(GraphHoverContext.Provider, { value: hoverState },
      h(ReactFlow, {
        nodes: flow.nodes,
        edges: flow.edges,
        nodeTypes,
        edgeTypes,
        fitView: true,
        fitViewOptions: { padding: 0.2, minZoom: 0.35, maxZoom: 1.6 },
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
        onNodeMouseEnter: (_event: unknown, node: CanvasNode) => { setHoveredId(node.id) },
        onNodeMouseLeave: () => { setHoveredId(null) },
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
        h(Background, { gap: 20, size: 1, color: 'color-mix(in srgb, var(--dsw-alias-border-l2, #3a3a48) 45%, transparent)' }),
        h(WaveLanes, { lanes: layout.lanes }),
      ),
    ),
  )
})

function StatusIcon({ status }: { status: CeoMemberViewStatus }): ReactNode {
  const running = status === 'running'
  return h('span', {
    'aria-hidden': true,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 16,
      height: 16,
      color: STATUS_COLOR[status],
    },
  }, running
    ? h('span', {
      style: {
        width: 12,
        height: 12,
        border: `2px solid ${STATUS_COLOR.running}`,
        borderTopColor: 'transparent',
        borderRadius: 99,
        animation: 'magic-ceo-spin 0.8s linear infinite',
      },
    })
    : status === 'completed'
      ? '✓'
      : status === 'blocked' || status === 'failed' || status === 'error'
        ? '!'
        : '○')
}

export function CeoTeamGraph(props: CeoTeamGraphProps) {
  const selected = useSyncExternalStore(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember)
  const roster = useSyncExternalStore(subscribeCeoSelection, getCeoRoster, getCeoRoster)
  const turnMembers = props.node.data.members
  const members = turnMembers.map(member =>
    roster.find(item => item.callId === member.callId) ?? member,
  )
  const sinkStatus = ceoTeamSinkStatus(members)
  const live = sinkStatus === 'running' || sinkStatus === 'queued'
  const [expanded, setExpanded] = useState(true)
  const elapsed = useElapsedSeconds(live)

  useEffect(() => { ensureCanvasCss() }, [])
  useEffect(() => {
    publishCeoTeam(turnMembers, props.sessionId)
  }, [turnMembers, props.sessionId])

  const progress = props.node.data.progress
  const progressLabel = `${String(progress.completed)}/${String(progress.total)}`
  const duration = elapsed >= 1
    ? props.t('graph.elapsed', { duration: formatElapsed(elapsed) })
    : ''
  const goalPreview = initiatorPreview(props.node.data.plan?.summary ?? members[0]?.task ?? '')

  return h('section', {
    'data-magic-ceo-team': true,
    style: {
      width: '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      margin: '8px 0 12px',
      border: `1px solid ${line.subtle}`,
      borderRadius: 12,
      background: surface.layer2,
    },
  },
    h('header', {
      'data-magic-ceo-status-strip': true,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderBottom: expanded ? `1px solid ${line.subtle}` : 0,
        color: ink.secondary,
        fontSize: 13,
      },
    },
      h(StatusIcon, { status: sinkStatus }),
      h('span', {
        style: { minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      }, [progressLabel, duration].filter(item => item !== '').join(' · ')),
      h('button', {
        type: 'button',
        title: expanded ? props.t('graph.fold') : props.t('graph.expand'),
        'aria-label': expanded ? props.t('graph.fold') : props.t('graph.expand'),
        onClick: () => { setExpanded(current => !current) },
        style: {
          border: 0,
          background: 'transparent',
          color: ink.secondary,
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: '18px',
          padding: '2px 6px',
        },
      }, expanded ? '▴' : '▾'),
      h('button', {
        type: 'button',
        onClick: props.openDetails,
        title: props.t('graph.openCanvas'),
        'aria-label': props.t('graph.openCanvas'),
        style: {
          flex: '0 0 auto',
          border: 0,
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)',
          color: ink.accent,
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: '18px',
          padding: '4px 8px',
          fontWeight: 510,
        },
      }, props.t('graph.openCanvas')),
    ),
    expanded
      ? h('div', { style: { display: 'flex', flexDirection: 'column' } },
        props.node.data.plan
          ? h('div', {
            'data-magic-ceo-plan': true,
            style: {
              padding: '8px 12px',
              borderBottom: `1px solid ${line.subtle}`,
              background: surface.layer2,
            },
          },
            h('strong', { style: { display: 'block', fontSize: 12, marginBottom: 2, color: ink.secondary } }, `${props.t('plan.title')} · v${props.node.data.plan.version}`),
            h('div', { style: { fontSize: 12, lineHeight: '18px', color: ink.tertiary } }, props.node.data.plan.summary),
          )
          : null,
        members.length > 0
          ? h(ReactFlowProvider, null,
            h(Canvas, {
              members,
              selectedCallId: selected?.callId,
              goalPreview,
              openDetails: props.openDetails,
              t: props.t,
            }),
          )
          : h('div', {
            'data-magic-ceo-plan-status': true,
            style: {
              padding: '18px 12px',
              color: ink.secondary,
              fontSize: 12,
            },
            }, props.t('plan.ready')),
      )
      : null,
  )
}
