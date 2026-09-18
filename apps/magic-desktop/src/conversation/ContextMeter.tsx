// 官方式上下文圆环 + 明细弹窗（2026-09-18 对齐官方 ui-conversation ContextMeter：
// reference-project/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/
// ContextMeter.tsx:55-170 与 ContextMeter.module.css。结构值照官方实测 3099；
// 颜色映射 Magic stitch 暗色 token，三段色为暗色直接实测值（见 CONTEXT_METER_TONES）。
// 与官方的差异：composer 卡有 overflow-hidden（glimm 扫光画布需要），absolute 面板会被
// 裁剪，故弹窗用 fixed 定位（官方 ModelSelect 菜单同因走 portal+fixed，ModelSelect.tsx:126-158）。
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** 明细行（条形段 + 图例共用；tokens 用于段宽占比，value 为已格式化展示值）。 */
export interface ContextMeterBreakdownItem {
  label: string;
  value: string;
  tokens: number;
  tone: string;
}

/** 三段色（暗色直接实测值，官方 ContextMeter.module.css:117-128 的暗色渲染结果）：
 *  系统 = --dsw-static-neutral-bluish-400；工具 = 官方紫罗兰字面量 rgb(167,139,250)；
 *  消息 = --dsw-static-blue-450。浅色主题将来换表即可。 */
export const CONTEXT_METER_TONES = {
  system: "#adb2b8",
  tools: "#a78bfa",
  messages: "#4d93f8",
} as const;

/** token 数紧凑格式化（照官方 ContextMeter.tsx:40-47 formatTokens）：
 *  <1K 原样；<1M 用 K（≥100 取整，否则一位小数）；否则 M。 */
export function formatTokens(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const scaled = (candidate: number): string =>
    candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10);
  if (safe < 1_000) return String(safe);
  if (safe < 1_000_000) return `${scaled(safe / 1_000)}K`;
  return `${scaled(safe / 1_000_000)}M`;
}

/** 圆环几何（官方常量）：14px viewBox、r=5.5、2px 描边。 */
const RADIUS = 5.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ContextMeter({
  percent,
  detail,
  breakdown,
}: {
  percent: number;
  /** 「~36.1K / 262K」式用量（App 组装；缺省不渲染右侧数值） */
  detail?: string;
  /** 系统提示词/工具定义/对话消息三段；缺省时条与图例都不渲染，只显示头部 */
  breakdown?: ContextMeterBreakdownItem[];
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ right: number; bottom: number } | null>(null);

  /* 弹窗定位（官方 panel：ring 上方 8px、右缘对齐 trigger）。首次 place 在
   * useLayoutEffect 里同步完成（paint 前落位，官方 Menu 的 measure pass 同法）。 */
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  /* 点外 / Esc 关闭（官方 ContextMeter.tsx:70-85 的 Menu 同款单监听模式）。
   * 用 click 而非 pointerdown：面板是 fixed 定位但仍在 rootRef DOM 子树内，contains
   * 判定不受影响；pointerdown 收不到程序化 .click()（2026-09-18 回归：点外不关闭），
   * click 冒泡到 document 对真实鼠标与合成点击都成立。trigger 自身点击冒泡时
   * contains=true 不关，随后 React onClick 正常 toggle。 */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /* 条形段：明细在且总量 >0 按占比分三段（零宽段丢弃，官方 ContextMeter.tsx:98-104）；
   * 明细在但总量 0 → 官方回落为单段（官方 color 未定 → 次级文字色调）；明细缺失 → 不渲染条。 */
  const breakdownTotal = breakdown?.reduce((sum, item) => sum + Math.max(0, item.tokens), 0) ?? 0;
  const segments =
    breakdown === undefined
      ? undefined
      : breakdownTotal > 0
        ? breakdown
            .map(item => ({ ...item, width: (clamped * Math.max(0, item.tokens)) / breakdownTotal }))
            .filter(item => item.width > 0)
        : [{ label: "", value: "", tokens: 0, tone: "rgb(var(--gl-ink-3))", width: clamped }];

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={`上下文已用 ${clamped}%`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        /* 圆形命中区：项目主题把 rounded-full 改写为 12px，故用任意值保证正圆 */
        className="grid size-7 cursor-pointer place-items-center rounded-[999px] text-ink-2 transition-colors duration-150 hover:bg-hover"
      >
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r={RADIUS} fill="none" strokeWidth={2} style={{ stroke: "rgb(var(--gl-line))" }} />
          <circle
            cx="7"
            cy="7"
            r={RADIUS}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${(CIRCUMFERENCE * clamped) / 100} ${CIRCUMFERENCE}`}
            transform="rotate(-90 7 7)"
            style={{ stroke: "rgb(var(--gl-ink-2))" }}
          />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="上下文用量"
          /* 官方 panel：宽 264px、圆角 12px（项目的 rounded-xl 被主题改写为 8px，故用任意值） */
          className="fixed z-30 w-[264px] cursor-default rounded-[12px] bg-surface p-3 text-[12px] leading-5 text-ink-2 shadow-overlay"
          style={{
            right: pos?.right ?? 8,
            bottom: pos?.bottom ?? 8,
            visibility: pos === null ? "hidden" : "visible",
            animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
            transformOrigin: "bottom right",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-ink-3">上下文已用</span>
            <span className="font-medium text-ink">{clamped}%</span>
            {detail !== undefined && (
              <span className="ml-auto font-medium tabular-nums text-ink">{detail}</span>
            )}
          </div>
          {segments !== undefined && (
            <div className="mt-2.5 mb-3 flex h-1 gap-px overflow-hidden rounded-full bg-hover">
              {segments.map(segment => (
                <div
                  key={segment.label.length > 0 ? segment.label : "total"}
                  className="h-full min-w-0.5 rounded-[1px]"
                  style={{ width: `${segment.width}%`, background: segment.tone }}
                />
              ))}
            </div>
          )}
          {breakdown !== undefined && (
            <dl className="mt-1.5 mb-0">
              {breakdown.map(row => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-0.5">
                  <dt className="flex items-center">
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block size-2 shrink-0 rounded-[2px]"
                      style={{ background: row.tone }}
                    />
                    {row.label}
                  </dt>
                  <dd className="m-0 tabular-nums text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </span>
  );
}
