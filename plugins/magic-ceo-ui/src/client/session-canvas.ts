/** 对话里的编排图：按内容长高，下限 300，上限约 70% 视口。 */
export function sessionCanvasHeight(layoutHeight: number): number {
  const content = Math.max(300, layoutHeight + 72)
  const viewportCap = typeof window === 'undefined'
    ? 520
    : Math.round(window.innerHeight * 0.7)
  return Math.min(content, Math.max(300, viewportCap))
}
