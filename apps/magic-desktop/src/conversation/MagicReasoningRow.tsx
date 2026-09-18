// Magic reasoning 换肤 v3（2026-09-18，对照 stitch 设计稿 codex_01_stream_autonomous_flow
// code.html:131-149 思考块 + 用户图二（单行胶囊摘要）/图三（内嵌滚动内容卡））：
// - 收起（图二）：单行胶囊「✦ 思考 · <用时> · <首行摘要>」，bg-surface-container-high
//   圆角 full，点击展开；运行中为 shimmer「思考中」。
// - 展开（图三）：rounded-xl 边框内容卡（border-surface-container-highest /
//   bg-surface-container-low），max-h 280px 内部滚动（消息流不被撑高），右下 ⌄ 收起钮，
//   未滚到底时底部渐隐提示；流式期间自动贴底。
// - 计时：running 起点到结束的实际秒数（「思考用时 N 秒」，对齐设计稿 summary 文案）。
// 契约不变：{text, running, t}（AssistantMarkdown.tsx:85 调用），替代 vendor ReasoningRow。
import { useEffect, useMemo, useRef, useState } from 'react'

const SUMMARY_MAX = 72

export function MagicReasoningRow({ text, running }: {
  text: string
  running: boolean
  t?: unknown
}) {
  const [expanded, setExpanded] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const startRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  useEffect(() => {
    if (running) {
      if (startRef.current === null) startRef.current = Date.now()
      return
    }
    if (startRef.current !== null) {
      setElapsed(Math.max(1, Math.round((Date.now() - startRef.current) / 1000)))
      startRef.current = null
    }
  }, [running])

  // 摘要 = 首个非空行（截断）；正文按行分段（Reasoning 原文逐行渲染，对齐设计稿缩进小字）。
  const summary = useMemo(() => {
    const line = text.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? ''
    return line.length > SUMMARY_MAX ? `${line.slice(0, SUMMARY_MAX)}…` : line
  }, [text])
  const paragraphs = useMemo(
    () => text.split('\n').map(l => l.trim()).filter(l => l.length > 0),
    [text],
  )

  // 流式期间自动贴底（用户上滚即停贴，回到底部恢复——与对话流 stick 语义一致）。
  useEffect(() => {
    if (!expanded || !running || !stickRef.current) return
    const el = scrollRef.current
    if (el !== null) el.scrollTop = el.scrollHeight
  }, [expanded, running, text])

  const onScroll = () => {
    const el = scrollRef.current
    if (el === null) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    stickRef.current = bottom
    setAtBottom(bottom)
  }

  return (
    <div className="min-w-0">
      {/* 头部胶囊（图二）：收起即整行摘要；展开后作为卡的标题行 */}
      <button
        type="button"
        data-reasoning-toggle
        aria-expanded={expanded}
        onClick={() => setExpanded(open => !open)}
        className="flex h-[26px] max-w-full items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 text-[12px] transition-colors hover:bg-surface-container-highest cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-outline" aria-hidden>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span className="shrink-0 font-medium text-on-surface">思考</span>
        {running ? (
          <span
            className="bg-clip-text whitespace-nowrap text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, var(--color-outline) 35%, var(--color-on-surface) 50%, var(--color-outline) 65%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-text 1.4s linear infinite',
            }}
          >
            思考中…
          </span>
        ) : (
          <>
            <span className="shrink-0 text-outline" aria-hidden>·</span>
            <span className="min-w-0 truncate text-outline">
              {elapsed !== null ? `用时 ${String(elapsed)} 秒` : '已深度思考'}
              {summary.length > 0 ? ` · ${summary}` : ''}
            </span>
          </>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-outline transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* 内容卡（图三）：内嵌滚动，不撑高消息流 */}
      {expanded && (
        <div className="relative mt-1.5">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            data-reasoning-body
            className="max-h-[280px] overflow-y-auto rounded-xl border border-surface-container-highest bg-surface-container-low px-4 py-3"
          >
            <div className="space-y-1.5 text-[12.5px] leading-[20px] whitespace-pre-wrap text-on-surface-variant">
              {paragraphs.map((line, i) => (
                <p key={`${String(i)}-r`}>{line}</p>
              ))}
            </div>
          </div>
          {/* 未滚到底：底部渐隐提示（不遮交互，pointer-events-none） */}
          {!atBottom && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-surface-container-low to-transparent"
            />
          )}
          {/* 右下收起钮（图三）：浮在卡内右下角 */}
          <button
            type="button"
            aria-label="收起思考"
            onClick={() => setExpanded(false)}
            className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full border border-surface-container-highest bg-surface-container text-outline transition-colors hover:text-on-surface cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}