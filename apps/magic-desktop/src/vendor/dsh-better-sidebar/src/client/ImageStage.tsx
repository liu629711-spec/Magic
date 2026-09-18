/**
 * Magic local patch (2026-09-13): zoomable/pannable stage for the image
 * viewer — the plain `<img>` gave no way to inspect a screenshot closely.
 * Interactions: wheel = zoom at the cursor (0.2x..8x), drag = pan,
 * plain click = toggle 1x/2x (suppressed after a drag), double-click =
 * reset, plus a small +/−/reset cluster. All inline styles — no css-module
 * churn for a local patch.
 * @module better-sidebar/ImageStage
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

const MIN_SCALE = 0.2
const MAX_SCALE = 8
const WHEEL_STEP = 1.2

const clusterStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  display: 'flex',
  gap: 6,
  zIndex: 3,
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(127,127,127,.45)',
  borderRadius: 6,
  background: 'rgba(255,255,255,.82)',
  color: '#1f2328',
  width: 26,
  height: 26,
  fontSize: 14,
  lineHeight: '24px',
  cursor: 'pointer',
  padding: 0,
}

export function ImageStage({ src, alt }: { src: string; alt: string }): ReactNode {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)
  const [, forceRender] = useState(0)

  // New file (tab switched to another image) starts from the fit view.
  useEffect(() => {
    setScale(1)
    setTx(0)
    setTy(0)
  }, [src])

  const zoomAt = (factor: number, cx: number, cy: number): void => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (rect === undefined) return
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
    const k = next / scale
    // Keep the point under the cursor stationary (transform origin = center).
    const ox = cx - (rect.left + rect.width / 2)
    const oy = cy - (rect.top + rect.height / 2)
    setScale(next)
    setTx(tx - ox * (k - 1))
    setTy(ty - oy * (k - 1))
  }

  // React registers wheel listeners passively; zooming must preventDefault,
  // so the non-passive listener goes on the stage node directly.
  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, event.clientX, event.clientY)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => { stage.removeEventListener('wheel', onWheel) }
  })

  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        minHeight: 200,
        cursor: drag.current !== null ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in',
        touchAction: 'none',
      }}
      onMouseDown={event => {
        if (event.button !== 0) return
        drag.current = { x: event.clientX, y: event.clientY, tx, ty, moved: false }
        forceRender(n => n + 1)
      }}
      // Pointer capture keeps the drag alive outside the stage bounds.
      onPointerDown={event => { (event.target as Element).setPointerCapture?.(event.pointerId) }}
      onMouseMove={event => {
        const state = drag.current
        if (state === null) return
        const dx = event.clientX - state.x
        const dy = event.clientY - state.y
        if (Math.abs(dx) + Math.abs(dy) > 3) state.moved = true
        setTx(state.tx + dx)
        setTy(state.ty + dy)
      }}
      onMouseUp={() => { drag.current = null; forceRender(n => n + 1) }}
      onClick={event => {
        // Plain click = quick 1x <-> 2x toggle; a drag never counts as a click.
        if (drag.current?.moved === true) return
        if (scale === 1) zoomAt(2, event.clientX, event.clientY)
        else { setScale(1); setTx(0); setTy(0) }
      }}
      onDoubleClick={() => { setScale(1); setTx(0); setTy(0) }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: 'block',
          maxWidth: '100%',
          margin: '0 auto',
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'center center',
          userSelect: 'none',
        }}
      />
      <div className="__magic-image-cluster" style={clusterStyle}>
        <button
          type="button"
          style={buttonStyle}
          title="放大"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); zoomAt(WHEEL_STEP, e.clientX, e.clientY) }}
        >＋</button>
        <button
          type="button"
          style={buttonStyle}
          title="缩小"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); zoomAt(1 / WHEEL_STEP, e.clientX, e.clientY) }}
        >－</button>
        <button
          type="button"
          style={buttonStyle}
          title="重置"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setScale(1); setTx(0); setTy(0) }}
        >⟲</button>
      </div>
    </div>
  )
}
