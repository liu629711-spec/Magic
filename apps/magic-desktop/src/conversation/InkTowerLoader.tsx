// 搬自用户提供的「水墨重楼 · 东方美学加载动画」code.html（2026-09-17 用户裁定：
// 运行中特效用毛笔画鼓楼动画，替换 DSH 原生 TurnStatus shimmer 行；旁边加「绘画中」，
// 位置同 DSH——消息流末尾左对齐）。
// 适配点：①浅色宣纸底改透明、墨线/毛笔反色适配暗色界面（浅墨白描）；
// ②交互控制面板不搬（速度/主题切换），保留 5.2s 典雅笔速单主题；
// ③rAF 循环阶段比例（0.68 绘制 / 0.18 定格赏鉴 / 0.14 淡出复始）与 7 笔画序列零改动。
import { useEffect, useRef } from 'react'
import css from './InkTowerLoader.module.css'

// 建筑构造绘制笔序（严格自下而上、从左向右、主次有序）：
// 1 基座台基与拱券 / 2 基座顶面界线 / 3 一层四立柱 / 4 一层大飞檐 /
// 5 二层平坐栏杆 / 6 二层大屋顶飞檐 / 7 宝顶塔刹收笔。
const STROKE_DEFINITIONS = [
  'M 22 216 L 125 216 L 125 186 L 135 186 L 135 203 C 135 214 165 214 165 203 L 165 186 L 175 186 L 175 216 L 278 216',
  'M 22 206 C 80 205 120 198 150 198 C 180 198 220 205 278 206',
  'M 108 186 L 108 158',
  'M 116 186 L 116 158',
  'M 184 186 L 184 158',
  'M 192 186 L 192 158',
  'M 45 152 C 85 156 122 158 150 158 C 178 158 215 156 255 152 C 228 144 188 138 177 138 L 123 138 C 112 138 72 144 45 152',
  'M 124 138 L 124 112',
  'M 128 138 L 128 112',
  'M 172 138 L 172 112',
  'M 176 138 L 176 112',
  'M 124 134 L 176 134',
  'M 80 110 C 108 114 134 115 150 115 C 166 115 192 114 220 110 C 196 105 168 96 152 78 L 148 78 C 132 96 104 105 80 110',
  'M 150 78 L 150 50',
]

const SVG_NS = 'http://www.w3.org/2000/svg'
const ANIM_DURATION = 5200

interface StrokeSchedule {
  readonly d: string
  readonly start: number
  readonly end: number
  readonly len: number
  readonly pathEl: SVGPathElement
}

/** 运行中状态行：毛笔序列勾画鼓楼（零偷跑线条），旁注「绘画中」。 */
export function InkTowerLoader(): React.JSX.Element {
  const committedRef = useRef<SVGPathElement>(null)
  const activeRef = useRef<SVGPathElement>(null)
  const penRef = useRef<SVGGElement>(null)
  const penAngleRef = useRef<SVGGElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const bloomRef = useRef<SVGGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const pulseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const committed = committedRef.current
    const active = activeRef.current
    const pen = penRef.current
    const penAngle = penAngleRef.current
    const halo = haloRef.current
    const bloom = bloomRef.current
    const group = groupRef.current
    const pulse = pulseRef.current
    if (committed === null || active === null || pen === null || penAngle === null
      || halo === null || bloom === null || group === null || pulse === null) return undefined

    // 预计算每条笔画长度与离线 path，保证极速采样。
    const strokeData = STROKE_DEFINITIONS.map(d => {
      const p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('d', d)
      return { d, pathEl: p, len: p.getTotalLength() }
    })
    const totalLength = strokeData.reduce((acc, cur) => acc + cur.len, 0)
    let accumulated = 0
    const schedules: StrokeSchedule[] = strokeData.map(item => {
      const start = accumulated / totalLength
      accumulated += item.len
      const end = accumulated / totalLength
      return { ...item, start, end }
    })

    const haloTotalLen = halo.getTotalLength()
    halo.style.strokeDasharray = `${String(haloTotalLen)} ${String(haloTotalLen)}`
    halo.style.strokeDashoffset = `${String(haloTotalLen)}`

    const resetCanvas = (): void => {
      committed.setAttribute('d', '')
      active.setAttribute('d', '')
      active.style.strokeDasharray = 'none'
      active.style.strokeDashoffset = '0'
      group.style.opacity = '1'
      pen.style.opacity = '0'
      halo.style.opacity = '0'
      halo.style.strokeDashoffset = `${String(haloTotalLen)}`
      bloom.style.opacity = '0'
      pulse.style.opacity = '0'
    }

    let start: number | null = null
    let frame = 0

    const step = (timestamp: number): void => {
      if (start === null) start = timestamp
      const elapsed = timestamp - start
      const cycle = (elapsed % ANIM_DURATION) / ANIM_DURATION

      if (cycle <= 0.68) {
        // 阶段 1：严格序列化顺序勾画（笔随墨出，绝无偷跑）。
        group.style.opacity = '1'
        const progress = cycle / 0.68
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - (-2 * progress + 2) ** 2 / 2
        let index = schedules.findIndex(s => eased >= s.start && eased <= s.end)
        if (index === -1) index = schedules.length - 1
        const cur = schedules[index]
        if (cur !== undefined) {
          const committedD = schedules
            .slice(0, index)
            .map(s => s.d)
            .join(' ')
          committed.setAttribute('d', committedD)
          const strokeProgress = (eased - cur.start) / (cur.end - cur.start || 1)
          const currentLen = Math.max(0.01, Math.min(cur.len, strokeProgress * cur.len))
          active.setAttribute('d', cur.d)
          active.style.strokeDasharray = `${String(cur.len)} ${String(cur.len)}`
          active.style.strokeDashoffset = `${String(cur.len - currentLen)}`
          const tip = cur.pathEl.getPointAtLength(currentLen)
          const delta = 1.0
          const next = cur.pathEl.getPointAtLength(Math.min(cur.len, currentLen + delta))
          const prev = cur.pathEl.getPointAtLength(Math.max(0, currentLen - delta))
          const rawAngle = Math.atan2(next.y - prev.y, next.x - prev.x) * (180 / Math.PI)
          const tilt = 18 + Math.max(-18, Math.min(18, (rawAngle - 90) * 0.16))
          pen.setAttribute('transform', `translate(${String(tip.x)}, ${String(tip.y)})`)
          penAngle.setAttribute('transform', `rotate(${String(tilt)})`)
          pen.style.opacity = progress < 0.03 ? String(Number((progress / 0.03).toFixed(2))) : '1'
        }
        halo.style.opacity = String(Number((progress * 0.85).toFixed(2)))
        halo.style.strokeDashoffset = `${String(haloTotalLen * (1 - progress))}`
        bloom.style.opacity = '0'
        pulse.style.opacity = '0'
      } else if (cycle <= 0.86) {
        // 阶段 2：宝顶收锋提笔，水墨润晕绽现定格赏鉴。
        const hold = (cycle - 0.68) / 0.18
        const allD = schedules.map(s => s.d).join(' ')
        committed.setAttribute('d', allD)
        active.setAttribute('d', '')
        pen.setAttribute('transform', `translate(150, ${String(50 - hold * 18)})`)
        penAngle.setAttribute('transform', 'rotate(12)')
        pen.style.opacity = String(Number(Math.max(0, 1 - hold * 2.2).toFixed(2)))
        group.style.opacity = '1'
        bloom.style.opacity = String(Number(Math.min(0.85, hold * 1.5).toFixed(2)))
        halo.style.opacity = '0.9'
        halo.style.strokeDashoffset = '0'
        pulse.style.opacity = '0.5'
      } else {
        // 阶段 3：留白渐退，归于空灵，重蓄新墨。
        const fade = (cycle - 0.86) / 0.14
        const opacity = Math.max(0, 1 - fade)
        group.style.opacity = String(Number(opacity.toFixed(2)))
        bloom.style.opacity = String(Number((0.85 * opacity).toFixed(2)))
        halo.style.opacity = String(Number((0.9 * opacity).toFixed(2)))
        pulse.style.opacity = '0'
        pen.style.opacity = '0'
        if (cycle > 0.985) resetCanvas()
      }
      frame = requestAnimationFrame(step)
    }

    resetCanvas()
    frame = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(frame) }
  }, [])

  return (
    <div className={css.turnStatus} role="status" aria-live="polite" data-ink-tower>
      <div className={css.canvasBox}>
        <div className={css.haloPulse} ref={pulseRef} />
        <svg className={css.svg} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="magicInkTowerGold" x1="150" x2="150" y1="30" y2="230">
              <stop offset="0%" stopColor="#c29d5b" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#c29d5b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c29d5b" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient gradientUnits="userSpaceOnUse" id="magicInkTowerWash" x1="150" x2="150" y1="60" y2="240">
              <stop offset="0%" stopColor="#e3e2e6" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#c9cdd9" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#9aa0b0" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle ref={haloRef} cx="150" cy="136" fill="none" opacity="0" r="82"
            stroke="url(#magicInkTowerGold)" strokeLinecap="round" strokeWidth="1.2" />
          <g ref={bloomRef} opacity="0" style={{ transition: 'opacity 0.4s ease-out' }}>
            <path d="M 150 78 C 144 94 128 106 100 110 C 130 112 170 112 200 110 C 172 106 156 94 150 78 Z" fill="url(#magicInkTowerWash)" />
            <path d="M 115 138 C 96 142 62 148 42 153 C 78 155 120 157 150 157 C 180 157 222 155 258 153 C 238 148 204 142 185 138 C 160 141 140 141 115 138 Z" fill="url(#magicInkTowerWash)" />
            <path d="M 125 186 L 125 218 L 138 218 L 138 204 C 138 196 143 191 150 191 C 157 191 162 196 162 204 L 162 218 L 175 218 L 175 186 Z" fill="#b9bec9" opacity="0.35" />
          </g>
          <g ref={groupRef} fill="none" stroke="#e3e2e6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3">
            <path d="" ref={committedRef} />
            <path d="" ref={activeRef} />
          </g>
          <g ref={penRef} opacity="0" style={{ pointerEvents: 'none', willChange: 'transform, opacity' }}>
            <ellipse cx="0" cy="0" fill="#f2f1ee" opacity="0.9" rx="2.4" ry="1.8" />
            <g ref={penAngleRef}>
              <path d="M 0 0 C -1.8 -4.5 -3.2 -10 -3.2 -17 L 3.2 -17 C 3.2 -10 1.8 -4.5 0 0 Z" fill="#e8e6e1" />
              <path d="M -1.2 -1.5 C -2.2 -6 -2.4 -11 -2.4 -17 L 2.4 -17 C 2.4 -11 2.2 -6 1.2 -1.5 Z" fill="#cfccc4" opacity="0.6" />
              <rect fill="#bfa15f" height="4.5" rx="0.6" stroke="#8d6e32" strokeWidth="0.4" width="6.8" x="-3.4" y="-21.5" />
              <path d="M -3.1 -21.5 L -2.1 -68 L 2.1 -68 L 3.1 -21.5 Z" fill="#7a5c38" />
              <line stroke="#9a7a4e" strokeWidth="0.8" x1="0" x2="0" y1="-66" y2="-22" />
              <ellipse cx="0" cy="-68.5" fill="#d9ceb9" rx="2.3" ry="1.2" />
              <path d="M 0 -69.5 Q -1.5 -75 0 -77" fill="none" stroke="#a13b35" strokeWidth="0.8" />
            </g>
          </g>
        </svg>
      </div>
      <span className={css.statusLabel}>绘画中</span>
    </div>
  )
}
