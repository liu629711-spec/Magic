// ZCode 式会话导航 minimap（2026-09-19 用户需求）：对话区左缘竖排短线，
// 每条短线 = 会话流里的一个可见内容块（用户消息 / 每轮最终回答）。
// 交互（对齐 ZCode 实测形态 + 用户提供的 ProximitySidebar 参考实现）：
// ① 指针邻近的短线弹簧伸长（motion/react）；② 悬停某条线浮出该条内容预览；
// ③ 点击滚动到对应消息（data-chat-flow-key）并挂 1.2s jumpHighlight 高亮；
// ④ 当前视口所在条目常亮（滚动跟随，rAF 节流）。
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import css from "./ChatFlow.module.css";

export interface ChatMinimapEntry {
  /** 消息节点 key（seat 的 data-chat-flow-key）。 */
  key: string;
  turn: number | undefined;
  role: "user" | "assistant";
  /** 预览文本（已裁剪；空 = 该块无可预览文本）。 */
  preview: string;
  /** assistant 内部用：同轮取最大 step（最终回答）。 */
  step?: number;
}

const RADIUS = 48;
const MAX_DASH_WIDTH = 64;
/** 当前条目判定锚点：容器高度的 40% 处（ProximitySidebar activeOffset 同值）。 */
const ACTIVE_ANCHOR = 0.4;
const SCROLL_IDLE_RESET_MS = 80;

const PRESETS = {
  user: { base: 26, bump: 36, rest: "rgba(255,255,255,0.55)", active: "rgba(255,255,255,0.95)" },
  assistant: { base: 14, bump: 44, rest: "rgba(255,255,255,0.22)", active: "rgba(255,255,255,0.8)" },
} as const;

function entryLabel(entry: ChatMinimapEntry): string {
  const role = entry.role === "user" ? "用户" : "Magic";
  return entry.turn === undefined ? role : `第 ${entry.turn} 轮 · ${role}`;
}

function jumpToEntry(container: HTMLElement, key: string): void {
  const target = container.querySelector<HTMLElement>(`[data-chat-flow-key="${CSS.escape(key)}"]`);
  if (target === null) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.add(css.jumpHighlight);
  window.setTimeout(() => {
    target.classList.remove(css.jumpHighlight);
  }, 1200);
}

function Dash(props: {
  entry: ChatMinimapEntry;
  active: boolean;
  mouseY: MotionValue<number>;
  reduceMotion: boolean;
  onHover: (entry: ChatMinimapEntry, clientY: number) => void;
  onHoverEnd: (key: string) => void;
  onSelect: (entry: ChatMinimapEntry) => void;
  registerDash: (key: string, node: HTMLButtonElement | null) => void;
}) {
  const { entry, active, mouseY, reduceMotion } = props;
  const ref = useRef<HTMLButtonElement>(null);
  const preset = PRESETS[entry.role];

  useEffect(() => {
    props.registerDash(entry.key, ref.current);
    return () => props.registerDash(entry.key, null);
  }, [entry.key, props.registerDash]);

  const distance = useTransform(mouseY, (y: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect === undefined) return RADIUS;
    return y - (rect.top + rect.height / 2);
  });
  const targetScale = useTransform(
    distance,
    [-RADIUS, 0, RADIUS],
    [
      preset.base / MAX_DASH_WIDTH,
      (preset.base + preset.bump) / MAX_DASH_WIDTH,
      preset.base / MAX_DASH_WIDTH,
    ],
    { clamp: true },
  );
  // 邻近弹簧（ProximitySidebar 同参数）；减弱动效时直接跟随不弹簧。
  const springScale = useSpring(targetScale, { stiffness: 320, damping: 34, mass: 0.7 });
  const scaleX = reduceMotion === true ? targetScale : springScale;

  return (
    <button
      ref={ref}
      type="button"
      aria-current={active ? "location" : undefined}
      aria-label={`${entryLabel(entry)}：${entry.preview.slice(0, 40) || "（无文本）"}`}
      title={entryLabel(entry)}
      className="flex h-2 w-full shrink-0 items-center border-0 bg-transparent p-0 outline-none"
      onClick={() => props.onSelect(entry)}
      onPointerEnter={event => props.onHover(entry, event.clientY)}
      onPointerLeave={() => props.onHoverEnd(entry.key)}
    >
      <motion.span
        className="block h-px transition-colors duration-150 ease-out"
        style={{
          width: MAX_DASH_WIDTH,
          scaleX,
          transformOrigin: "left center",
          background: active ? preset.active : preset.rest,
        }}
      />
    </button>
  );
}

export function ChatMinimap(props: {
  entries: readonly ChatMinimapEntry[];
  /** 对话滚动容器（css.flow）；active 追踪与点击跳转都在它的坐标系里。 */
  containerRef: RefObject<HTMLDivElement>;
}) {
  const { entries, containerRef } = props;
  const mouseY = useMotionValue(Infinity);
  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const dashRefs = useRef(new Map<string, HTMLButtonElement>());
  const pointerInside = useRef(false);
  const resetTimer = useRef<number | null>(null);
  const [activeKey, setActiveKey] = useState<string | undefined>(entries[0]?.key);
  const [hover, setHover] = useState<{ key: string; y: number } | null>(null);
  /** 条目过多时压缩间距，保证整列始终在可视高度内（溢出侧整体裁剪）。 */
  const [gap, setGap] = useState(6);
  const [tooNarrow, setTooNarrow] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const registerDash = useCallback((key: string, node: HTMLButtonElement | null) => {
    if (node !== null) dashRefs.current.set(key, node);
    else dashRefs.current.delete(key);
  }, []);

  const clearPendingReset = useCallback(() => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  const pulseDash = useCallback((key: string) => {
    const node = dashRefs.current.get(key);
    if (node === undefined) return;
    const rect = node.getBoundingClientRect();
    mouseY.set(rect.top + rect.height / 2);
    clearPendingReset();
    if (pointerInside.current) return;
    resetTimer.current = window.setTimeout(() => {
      mouseY.set(Infinity);
      resetTimer.current = null;
    }, SCROLL_IDLE_RESET_MS);
  }, [clearPendingReset, mouseY]);

  useEffect(() => () => clearPendingReset(), [clearPendingReset]);

  // 可用高度 / 条目数 → 间距（2-8px）；对话区过窄（右坞分身等）整列隐藏。
  useEffect(() => {
    const wrap = wrapRef.current;
    if (wrap === null) return;
    const measure = () => {
      // 对话区根节点 = wrapper 的父级（wrapper 固定 72px 宽，不能用它判断宽窄）。
      const root = wrap.parentElement;
      // 2026-09-19 显示阈值下调（用户裁定：窄窗下尽量保持可用）：仅在分身面板
      // 级别的极窄宽度隐藏，普通窄窗保留（短线列 72px 不遮正文）。
      setTooNarrow(root !== null && root.clientWidth < 520);
      const height = wrap.clientHeight;
      const count = entries.length;
      if (count <= 1 || height <= 0) {
        setGap(6);
        return;
      }
      const raw = (height - count) / (count - 1);
      setGap(Math.min(8, Math.max(2, Math.floor(raw))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    if (wrap.parentElement !== null) observer.observe(wrap.parentElement);
    return () => observer.disconnect();
  }, [entries.length]);

  // 当前条目追踪：滚动容器 40% 锚线落在哪个消息块内（否则取最近）。
  const entryKeys = useMemo(() => entries.map(entry => entry.key).join("|"), [entries]);
  useEffect(() => {
    const container = containerRef.current;
    if (container === null || entries.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setHover(null);
      const rect = container.getBoundingClientRect();
      const anchorY = rect.top + rect.height * ACTIVE_ANCHOR;
      let best: string | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const entry of entries) {
        const el = container.querySelector<HTMLElement>(
          `[data-chat-flow-key="${CSS.escape(entry.key)}"]`,
        );
        if (el === null) continue;
        const r = el.getBoundingClientRect();
        const contains = r.top <= anchorY && r.bottom >= anchorY;
        const distance = contains
          ? 0
          : Math.min(Math.abs(r.top - anchorY), Math.abs(r.bottom - anchorY));
        if (distance < bestDistance) {
          bestDistance = distance;
          best = entry.key;
        }
      }
      if (best === undefined) return;
      setActiveKey(best);
      if (pointerInside.current === false) pulseDash(best);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    container.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, entryKeys]);

  if (tooNarrow || entries.length < 2) return null;

  const hoverEntry = hover === null ? undefined : entries.find(entry => entry.key === hover.key);
  const navHeight = navRef.current?.clientHeight ?? 0;
  const hoverTop = hover === null ? 0 : Math.min(Math.max(hover.y, 48), Math.max(48, navHeight - 48));

  return (
    <div ref={wrapRef} className="absolute bottom-6 left-0 top-[64px] z-40 w-[72px]">
      {/* nav 负责指针事件与条目裁剪；预览浮窗挂在外层（无裁剪），才能伸出 nav 右缘 */}
      <nav
        ref={navRef}
        aria-label="会话导航"
        className="relative h-full overflow-hidden"
        onPointerMove={event => {
          clearPendingReset();
          pointerInside.current = true;
          mouseY.set(event.clientY);
        }}
        onPointerLeave={() => {
          pointerInside.current = false;
          mouseY.set(Infinity);
          setHover(null);
        }}
      >
        <div
          className="relative flex h-full flex-col justify-center"
          style={{ gap, overflow: "hidden" }}
        >
          {entries.map(entry => (
            <Dash
              key={entry.key}
              entry={entry}
              active={entry.key === activeKey}
              mouseY={mouseY}
              reduceMotion={reduceMotion === true}
              onHover={(item, clientY) => {
                const rect = navRef.current?.getBoundingClientRect();
                setHover({ key: item.key, y: clientY - (rect?.top ?? 0) });
              }}
              onHoverEnd={key => {
                setHover(current => (current?.key === key ? null : current));
              }}
              onSelect={item => {
                const container = containerRef.current;
                if (container !== null) jumpToEntry(container, item.key);
              }}
              registerDash={registerDash}
            />
          ))}
        </div>
      </nav>
      {hoverEntry !== undefined && (
        <div
          className="pointer-events-none absolute left-full z-50 ml-2 w-[320px] -translate-y-1/2 rounded-xl border border-line bg-surface p-3 shadow-overlay"
          style={{ top: hoverTop }}
        >
          <div className="text-[11px] leading-4 text-ink-3">{entryLabel(hoverEntry)}</div>
          {hoverEntry.preview.length > 0 ? (
            <div className="mt-1 line-clamp-6 whitespace-pre-wrap text-[12.5px] leading-[19px] text-ink-2">
              {hoverEntry.preview}
            </div>
          ) : (
            <div className="mt-1 text-[12.5px] leading-[19px] text-ink-3">（无可预览文本）</div>
          )}
        </div>
      )}
    </div>
  );
}
