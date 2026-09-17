// 会话统计详情弹窗（对照 DSH web 端 ui-chat 的 stat-dialog：StatsPills 点击 pill 弹出）。
// 数据全部来自真实 snapshot，绝不造假：
//   · 轮数 / 步数 / 解码吞吐：snapshot.legacy.nodes 的 assistant 原始节点（deriveStats 同源）；
//   · 每轮 token：snapshot.nodes 的 turn-tail 节点 data.tokenUsage；
//   · 每轮工具调用数：snapshot.nodes 的 turn-process 节点 data.toolCallCount；
//   · 每轮用时：snapshot.legacy.turnTimings（turn/start → turn/end 时间戳）。
// 上游 web 端以 sessionStats / tokenUsage projection 为数据源；M1 暂无 projection 座位，
// 故全部走窗口内快照聚合（与上游无 projection 时的 deriveStats 回退同语义）。
// token 两套口径（数据源限制所致，见 TurnStatsModel）：
//   · usage（统计条 pill）：已明细计费桶求和，与点击的统计条读数逐字一致；
//   · detail（本弹窗）：turn-tail 的精确 totalTokens 求和（与轮尾「用量」pill 同源）。
//   两者在「provider 未上报 cacheRead/cacheWrite」的会话会不等——totalTokens 含未明细缓存，
//   此时弹窗的缓存读/写/命中率展示为 —，不把「未上报」伪装成 0。
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCloseFill14, IconDatabaseOutline16, IconGaugeOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { assistantStepReading } from '../vendor/dsh-chat/index.ts'
import type { ChatNode, ChatSnapshot } from '../vendor/dsh-chat/index.ts'
import css from './TurnPills.module.css'

/**
 * 统计条（pill）口径的 token 总量：已明细计费桶求和。
 * 与点击的统计条读数完全一致（缓存字段缺省按 0 计入分母）。
 */
export interface TurnStatsPillUsage {
  total: number
  cacheHitPercent: number | null
}

/**
 * 弹窗明细口径的 token 记账：turn-tail 的精确 totalTokens 求和。
 * 与轮尾「用量 N tok」pill 同源；缓存读/写若部分轮未上报则整体记 null（展示为 —），
 * 不把「未上报」伪装成 0。
 */
export interface TurnStatsDetailUsage {
  totalTokens: number
  uncachedInput: number
  output: number
  cacheRead: number | null
  cacheWrite: number | null
  cacheHitPercent: number | null
}

/** 分轮明细的一行。 */
export interface TurnStatsRow {
  turn: number
  /** 轮用时（turn/end − turn/start）；未收尾或缺时间戳时为 null。 */
  elapsedMs: number | null
  /** 本轮精确 token；无 turn-tail 记账时为 null。 */
  tokens: number | null
  toolCalls: number
}

/** 统计弹窗与统计条共用的聚合模型。 */
export interface TurnStatsModel {
  turns: number
  steps: number
  /** 最新一轮的解码吞吐（统计条「N tok/s」用）。 */
  speedTps: number | null
  /** 统计条口径 token 总量（pill 文本用）。 */
  usage: TurnStatsPillUsage | null
  /** 弹窗明细口径 token 记账。 */
  detail: TurnStatsDetailUsage | null
  /** 已收尾轮用时求和；无任何时间戳时为 null。 */
  elapsedMs: number | null
  /** 解码平均吞吐（总输出 token / 总解码耗时）；无样本时为 null。 */
  avgTps: number | null
  rows: readonly TurnStatsRow[]
}

/** 人性化 token 计数：190K tok / 1.9M tok / 840 tok。 */
export function formatTokens(total: number): string {
  if (total >= 1_000_000) return `${(Math.round(total / 10_000) / 100).toFixed(2).replace(/\.?0+$/, '')}M tok`
  if (total >= 1_000) return `${Math.round(total / 1_000)}K tok`
  return `${String(total)} tok`
}

/** 精确 token 计数（千分位分组，与 vendor formatExactTokens 同形态）。 */
export function formatExactTokens(value: number): string {
  const digits = String(value)
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end))
  }
  return groups.join(',')
}

/** 秒表：2m 27s / 45s（DSH formatElapsed 语义）。 */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`
}

/** 毫秒 → 秒表文本；null 直接给占位符。 */
export function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—'
  return formatElapsed(Math.max(0, Math.floor(ms / 1000)))
}

/**
 * 把快照折叠为统计弹窗模型：轮/步/吞吐走 legacy 原始节点，token/工具走 chat 节点，
 * 用时走 legacy.turnTimings。
 * @param snapshot - 会话 Chat 快照。
 */
export function deriveTurnStats(snapshot: ChatSnapshot): TurnStatsModel {
  const turns = new Set<number>()
  const tokensByTurn = new Map<number, number>()
  const toolCallsByTurn = new Map<number, number>()
  const elapsedByTurn = new Map<number, number>()
  let steps = 0
  let speedTps: number | null = null
  let decodeMs = 0
  let decodeTokens = 0
  let seenUsage = false
  // 统计条口径（缺省桶按 0）。
  let pillUncached = 0
  let pillCacheRead = 0
  let pillCacheWrite = 0
  let pillOutput = 0
  // 弹窗明细口径（精确 totalTokens + 缓存字段缺省记 null）。
  let detailTotal = 0
  let detailUncached = 0
  let detailOutput = 0
  let detailCacheRead = 0
  let detailCacheWrite = 0
  let cacheReadKnown = true
  let cacheWriteKnown = true

  // 1) 轮数 / 步数 / 解码吞吐：legacy 原始 assistant 节点（与上游 deriveStats 同源）。
  for (const node of snapshot.legacy.nodes) {
    if (node.kind !== 'assistant') continue
    turns.add(node.turn)
    steps += 1
    const reading = assistantStepReading(node)
    if (reading.decodeMs !== null && reading.outputTokens !== null) {
      decodeMs += reading.decodeMs
      decodeTokens += reading.outputTokens
    }
  }

  // 2) token / 工具 / 吞吐读数：chat 渲染节点。
  for (const node of snapshot.nodes.values()) {
    if (node.kind === 'turn-tail') {
      const data = (node as ChatNode<'turn-tail'>).data
      const usage = data.tokenUsage
      if (usage !== undefined) {
        seenUsage = true
        turns.add(data.turn)
        // 分轮 token 用精确整轮记账（与轮尾「用量」pill 一致）。
        tokensByTurn.set(data.turn, (tokensByTurn.get(data.turn) ?? 0) + usage.totalTokens)
        detailTotal += usage.totalTokens
        detailUncached += usage.uncachedInputTokens
        detailOutput += usage.outputTokens
        pillUncached += usage.uncachedInputTokens
        pillOutput += usage.outputTokens
        if (usage.cacheReadTokens === undefined) cacheReadKnown = false
        else {
          detailCacheRead += usage.cacheReadTokens
          pillCacheRead += usage.cacheReadTokens
        }
        if (usage.cacheWriteTokens === undefined) cacheWriteKnown = false
        else {
          detailCacheWrite += usage.cacheWriteTokens
          pillCacheWrite += usage.cacheWriteTokens
        }
      }
      if (data.tokensPerSecond !== undefined && data.tokensPerSecond > 0) {
        speedTps = data.tokensPerSecond
      }
    } else if (node.kind === 'turn-process') {
      const data = (node as ChatNode<'turn-process'>).data
      turns.add(data.turn)
      toolCallsByTurn.set(data.turn, data.toolCallCount)
    }
  }

  // 3) 每轮用时：legacy.turnTimings（turn/start → turn/end 时间戳）。
  let elapsedMs: number | null = null
  for (const [turn, timing] of snapshot.legacy.turnTimings) {
    if (timing.endTime === undefined) continue
    const delta = Math.max(0, timing.endTime - timing.startTime)
    elapsedByTurn.set(turn, delta)
    elapsedMs = (elapsedMs ?? 0) + delta
  }

  // 统计条口径：分母只在有计费输入时给出。
  const pillDenominator = pillUncached + pillCacheRead + pillCacheWrite
  const usage: TurnStatsPillUsage | null = seenUsage
    ? {
      total: pillDenominator + pillOutput,
      cacheHitPercent: pillDenominator > 0 ? Math.round((pillCacheRead / pillDenominator) * 100) : null,
    }
    : null

  // 弹窗明细口径：缓存字段全部上报才展示精确值/命中率，否则记 null。
  const detailDenominator = detailUncached + detailCacheRead + detailCacheWrite
  const detail: TurnStatsDetailUsage | null = seenUsage
    ? {
      totalTokens: detailTotal,
      uncachedInput: detailUncached,
      output: detailOutput,
      cacheRead: cacheReadKnown ? detailCacheRead : null,
      cacheWrite: cacheWriteKnown ? detailCacheWrite : null,
      cacheHitPercent: cacheReadKnown && cacheWriteKnown && detailDenominator > 0
        ? Math.round((detailCacheRead / detailDenominator) * 100)
        : null,
    }
    : null

  const rows: TurnStatsRow[] = [...turns]
    .sort((left, right) => left - right)
    .map((turn) => ({
      turn,
      elapsedMs: elapsedByTurn.get(turn) ?? null,
      tokens: tokensByTurn.get(turn) ?? null,
      toolCalls: toolCallsByTurn.get(turn) ?? 0,
    }))

  return {
    turns: turns.size,
    steps,
    speedTps,
    usage,
    detail,
    elapsedMs,
    avgTps: decodeMs > 0 ? decodeTokens / (decodeMs / 1000) : null,
    rows,
  }
}

/** 统计详情的属性：聚合模型 + 关闭回调。 */
export interface TurnStatsDialogProps {
  model: TurnStatsModel
  onClose: () => void
}

/**
 * 会话统计详情弹层：居中卡片（surface 底色 + 细边框 + 圆角），
 * 支持点空白、Esc、关闭按钮三种关闭方式。
 */
export function TurnStatsDialog({ model, onClose }: TurnStatsDialogProps) {
  // Esc 关闭：仅弹层挂载期间监听。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const detail = model.detail
  const cacheHitText = detail?.cacheHitPercent !== null && detail?.cacheHitPercent !== undefined
    ? `${String(detail.cacheHitPercent)}%`
    : '—'

  return createPortal(
    // 空白遮罩：点击即关闭；卡片自身阻止冒泡，避免点内容误关。
    <div className={css.overlay} onClick={onClose}>
      <div
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="会话统计"
        onClick={(event) => { event.stopPropagation() }}
      >
        <div className={css.dialogHeader}>
          <span className={css.dialogTitle}>
            <IconGaugeOutline16 />
            会话统计
          </span>
          <button
            type="button"
            className={css.dialogClose}
            aria-label="关闭"
            onClick={onClose}
          >
            <IconCloseFill14 />
          </button>
        </div>

        {model.rows.length === 0 ? (
          <div className={css.empty}>暂无统计数据</div>
        ) : (
          <div className={css.dialogBody}>
            <div className={css.sectionTitle}>会话总览</div>
            <dl className={css.overview}>
              <dt>总轮数</dt>
              <dd>{`${String(model.turns)} 轮`}</dd>
              <dt>总步数</dt>
              <dd>{`${String(model.steps)} 步`}</dd>
              <dt>总用时</dt>
              <dd>{formatDurationMs(model.elapsedMs)}</dd>
              <dt>平均速度</dt>
              <dd>{model.avgTps !== null ? `${String(Math.round(model.avgTps))} tok/s` : '—'}</dd>
            </dl>

            <div className={css.sectionTitle}>Token 明细</div>
            <dl className={css.overview}>
              <dt>
                <IconDatabaseOutline16 />
                总 token
              </dt>
              <dd>{detail !== null ? formatExactTokens(detail.totalTokens) : '—'}</dd>
              <dt>输入</dt>
              <dd>{detail !== null ? formatExactTokens(detail.uncachedInput) : '—'}</dd>
              <dt>输出</dt>
              <dd>{detail !== null ? formatExactTokens(detail.output) : '—'}</dd>
              <dt>缓存读</dt>
              <dd>{detail !== null && detail.cacheRead !== null ? formatExactTokens(detail.cacheRead) : '—'}</dd>
              <dt>缓存写</dt>
              <dd>{detail !== null && detail.cacheWrite !== null ? formatExactTokens(detail.cacheWrite) : '—'}</dd>
              <dt>缓存命中率</dt>
              <dd>{cacheHitText}</dd>
            </dl>

            <table className={css.table}>
              <thead>
                <tr>
                  <th>轮次</th>
                  <th className={css.num}>用时</th>
                  <th className={css.num}>工具</th>
                  <th className={css.num}>token</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <tr key={row.turn}>
                    <td>{`第 ${String(row.turn)} 轮`}</td>
                    <td className={css.num}>{formatDurationMs(row.elapsedMs)}</td>
                    <td className={css.num}>{String(row.toolCalls)}</td>
                    <td className={css.num}>{row.tokens !== null ? formatExactTokens(row.tokens) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}