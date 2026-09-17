// 搬自 plugins/magic-ceo-ui/src/client/elapsed.ts（2026-09-18 CEO 委派图卡接入）。
// 原样保留：秒表 hook + 人性化时长格式（画布头与右坞共用；本轮右坞未搬，仍按原样保留）。

import { useEffect, useRef, useState } from 'react'

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`
}

/** live 期间每秒走动的秒表；live 结束后冻结在最后一次读数（不倒扣回零）。 */
export function useElapsedSeconds(live: boolean): number {
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