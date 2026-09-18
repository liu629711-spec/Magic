// vendored from stitch 设计稿画廊 PromptBar（对话区 v2 皮肤，2026-09-17 用户四点裁定：
// ①工具展示怎么好看怎么来 ②彩虹扫光保留 ③DSH 没有的功能先记录 ④听写占位）。
// 嵌入改造：SOURCES/COMMANDS/MODELS 本地化为 Magic 语境默认值（M1 静态，SDK 接线后
// 由真实数据驱动）；听写按钮保留动效但不再写入假转录（裁定 4 占位）；demo 自演保留
// 供画廊模式，嵌入一律 demo={false}；扫光照旧由旗舰模型选择触发（裁定 2）。
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createShader, playSweep, accentChain, ACCENTS } from "glimm";
// 官方式上下文圆环（2026-09-18 对齐官方 ui-conversation ContextMeter，见该文件头注释）
import ContextMeter, { type ContextMeterBreakdownItem } from "../../conversation/ContextMeter.tsx";

/* The built-in "prism" palette is only cyan→indigo→magenta, so a sweep
 * reads as blue/purple. Build a true full-spectrum rainbow instead. */
const RAINBOW = accentChain([
  ACCENTS.red,
  ACCENTS.orange,
  ACCENTS.yellow,
  ACCENTS.green,
  ACCENTS.cyan,
  ACCENTS.blue,
  ACCENTS.purple,
]);

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR
 * A composer with real controls: attach, @ data sources,
 * / commands, a model picker, dictation, and send.
 * Type @ or / to open the menus; ↑↓ + Enter to pick.
 * Variants: Rounded (card radius) · Pill (full radius).
 * ───────────────────────────────────────────────────────── */

function Icon({ children, size = 15, strokeWidth = 1.8 }: { children: React.ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, React.ReactNode> = {
  clip: <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: <g><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></g>,
  globe: <g><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></g>,
  /* 模型触发钮数据图标（2026-09-18 官方化：官方 IconDataOutline16 是 16px 填充图标，
   * 这里自绘同语义的数据库圆柱，线条风格与 GLYPHS 其余描边图标一致） */
  data: <g><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></g>,
};

type Source = {
  key: string;
  name: string;
  desc: string;
  glyph?: string;
  attach?: boolean;
  connect?: boolean;
};

/** @ 候选（2026-09-18：真实技能数据经此传入）。 */
export type PromptBarMention = Source;

/* Magic 语境来源（M1 静态假数据；SDK 接线后由会话能力清单驱动） */
const SOURCES: Source[] = [
  { key: "attach", name: "添加照片和文件", desc: "从电脑上传", glyph: "clip", attach: true },
  { key: "web", name: "Web 搜索", desc: "实时资讯与资料", glyph: "globe" },
  { key: "skills", name: "技能", desc: "调用已安装的技能扩展", glyph: "layers" },
  { key: "context", name: "项目上下文", desc: "工作区文件与进度", glyph: "chart" },
];

/* Magic 命令（对齐 DSH 命令语义的中文描述） */
const COMMANDS = [
  { key: "init", name: "/init", desc: "分析项目并生成任务简报" },
  { key: "compact", name: "/compact", desc: "压缩当前会话上下文" },
  { key: "review", name: "/review", desc: "审查最近的改动" },
  { key: "new", name: "/new", desc: "开始一个新任务" },
];

/* Magic 模型（M1 假数据；选旗舰触发彩虹扫光，裁定 2 保留） */
const MODELS = [
  { key: "magic-5", name: "Magic-5", tag: "旗舰" },
  { key: "magic-1", name: "Magic-1", tag: "基础" },
];

/* self-running demo: walk the @ menu, then the / menu, and repeat.
 * Any pointer or key interaction hands control to the user. */
const AUTO_STEPS: {
  draft: string;
  active?: number;
  connect?: boolean;
  modelOpen?: boolean;
  model?: string;
  hold: number;
}[] = [
  { draft: "", connect: false, model: "magic-1", hold: 1100 },
  { draft: "@", active: 0, hold: 900 },
  { draft: "@", active: 1, hold: 620 },
  { draft: "@", active: 2, hold: 620 },
  { draft: "@", active: 3, hold: 700 },
  { draft: "@", active: 3, connect: true, hold: 1000 },
  { draft: "", hold: 700 },
  { draft: "/", active: 0, hold: 900 },
  { draft: "/", active: 1, hold: 620 },
  { draft: "/", active: 2, hold: 1000 },
  { draft: "", hold: 800 },
  // open the model picker and upgrade to the flagship → rainbow sweep
  { draft: "", modelOpen: true, hold: 1200 },
  { draft: "", model: "magic-5", hold: 2400 },
  { draft: "", hold: 900 },
];

/* the last @word or /word being typed, if any */
function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

/** 输入条三件套数据（2026-09-18 照 Magic 网页版 composer）。
 *  context 2026-09-18 官方化：圆环触发钮 + 明细弹窗（旧文本 chip 移除）。 */
export type PromptBarChips = {
  permission?: { label: string; onClick?: () => void };
  workMode?: { label: string; onClick?: () => void };
  context?: { percent: number; detail?: string; breakdown?: ContextMeterBreakdownItem[] };
};

export default function PromptBar({
  variant = "Rounded",
  demo = true,
  tall = false,
  placeholder,
  onSend,
  modelOptions,
  modelKey,
  onModelChange,
  composerChips,
  mentionOptions,
  commandOptions,
  draftInjection,
}: {
  variant?: string;
  /** the self-running walkthrough; turn off when embedding in a real surface */
  demo?: boolean;
  /** hero sizing: a multi-line input with controls on their own row */
  tall?: boolean;
  placeholder?: string;
  onSend?: (text: string) => void;
  /** 真实模型列表（2026-09-17：来自 session/modelCatalog；缺省=画廊 mock MODELS） */
  modelOptions?: { key: string; name: string; tag?: string }[];
  /** 当前选中模型 key（受控） */
  modelKey?: string;
  /** 选择模型回调（真实模式写入 session/selectModel） */
  onModelChange?: (key: string) => void;
  /** 输入条三件套（2026-09-18 照 Magic 网页版 composer）：
   *  访问模式（工作区内修改）/ 工作模式 chip（CEO · 当前会话）/ 上下文用量 */
  composerChips?: PromptBarChips;
  /** 真实 @ 候选（2026-09-18：来自真实命令/文件数据；缺省=画廊 mock SOURCES） */
  mentionOptions?: Source[];
  /** 真实 / 命令（commands/list 数据；缺省=画廊 mock COMMANDS） */
  commandOptions?: { key: string; name: string; desc: string }[];
  /** 受控「草稿注入」桥（2026-09-18）：右坞 @引用把 `@<路径> ` 追加到草稿；
   *  seq 变化即注入一次（多次点击 seq 不同，故每次都追加，语义与 DSH 一致）。 */
  draftInjection?: { seq: number; text: string } | null;
}) {
  const pill = variant === "Pill";
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  /** 两级菜单当前层（2026-09-18 官方化）：root=「模型」行，model=模型列表；同容器替换渲染 */
  const [modelPane, setModelPane] = useState<"root" | "model">("root");
  const [model, setModel] = useState<(typeof MODELS)[number]>(MODELS[1]);
  /** 真实模式渲染用：外部模型列表 + 受控选中项（缺省回退画廊 mock） */
  const menuModels = modelOptions ?? MODELS;
  /** @ 候选与 / 命令数据源（2026-09-18：真实数据优先，缺省回退画廊 mock） */
  const mentionItems = mentionOptions ?? SOURCES;
  const commandItems = commandOptions ?? COMMANDS;
  const activeModel = modelOptions !== undefined
    ? modelOptions.find((m) => m.key === modelKey) ?? modelOptions[0]
    : model;
  /** 模型分组（2026-09-18 照 Magic 网页版设计：按 provider 分组 + sticky 组标题） */
  const modelGroups = useMemo(() => {
    const groups: { tag: string; models: { key: string; name: string; tag?: string }[] }[] = [];
    for (const m of menuModels) {
      const tag = m.tag ?? "";
      const last = groups[groups.length - 1];
      if (last !== undefined && last.tag === tag) last.models.push(m);
      else groups.push({ tag, models: [m] });
    }
    return groups;
  }, [menuModels]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(demo);
  const [autoStep, setAutoStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const wide = expanded || tall;
  /** 上下文圆环数据（2026-09-18 官方化）：控制行是否含 ContextMeter 列由此决定 */
  const contextChip = composerChips?.context;
  const hasContext = contextChip !== undefined;
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const glimmRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createShader> | null>(null);
  const sweepingRef = useRef(false);

  /* hand control to the user: stop the demo loop, and when they aim at
   * the input itself, clear the demo's leftover draft for a clean start */
  const takeOver = (event: { target: EventTarget | null }) => {
    setAuto(false);
    if (auto && event.target === inputRef.current) setDraft("");
  };

  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";

  const rows: { key: string; name: string; desc: string }[] =
    menu === "at"
      ? mentionItems.filter((s) => s.name.toLowerCase().includes(query))
      : menu === "slash"
        ? commandItems.filter((c) => c.name.slice(1).startsWith(query))
        : [];

  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);

  /* a single highlight glides to the active row instead of each row
   * toggling its own background — matches the gliding pill in the nav */
  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, connected, rows.length]);

  /* same gliding highlight in the model menu — floats to the hovered
   * row, falling back to the currently-selected model. Only the model
   * pane renders rows (2026-09-18 两级化：root 层无行可测). */
  const modelIndex = menuModels.findIndex((m) => m.key === activeModel.key);
  useLayoutEffect(() => {
    if (!modelOpen || modelPane !== "model") return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelPane, modelHovered, modelIndex]);

  /* The menu is outside the clipped composer, so align it to the model
   * trigger by measurement instead of pinning it to the far-right edge.
   * modelPane 也参与重测（2026-09-18 两级化：两层内容宽度不同）。 */
  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = modelRef.current.getBoundingClientRect();
    setModelMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 240)));
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [modelOpen, modelPane, wide, activeModel.name]);

  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);

  /* Build the shader with a pinned hue phase. createShader seeds its
   * internal hueShift from Math.random(), which made the sweep a different
   * colour on every reload — pin it so the rainbow is identical each time. */
  const makeShader = () => {
    const canvas = glimmRef.current;
    if (!canvas) return null;
    const random = Math.random;
    Math.random = () => 0;
    try {
      return createShader({
        canvas,
        palette: RAINBOW,
        direction: "ltr",
        bandTight: 10,
        swellAmount: 0.85,
      });
    } finally {
      Math.random = random;
    }
  };

  /* Glimm shader lives inside the composer, invisible at rest. Selecting
   * the flagship model fires a one-shot rainbow sweep across the interior. */
  useEffect(() => {
    shaderRef.current = makeShader();
    return () => {
      shaderRef.current?.destroy();
      shaderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const celebrate = () => {
    if (sweepingRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Recreate the shader per sweep so uTime restarts at 0 — the hue phase
    // (which drifts with time) is then identical on every trigger.
    shaderRef.current?.destroy();
    const shader = makeShader();
    shaderRef.current = shader;
    if (!shader) return;
    sweepingRef.current = true;
    const sweep = playSweep(shader, {
      palette: RAINBOW,
      direction: "ltr",
      sweepMs: 570,
      outroMs: 80,
      peakAlpha: 1.3,
      bandTight: 10,
      brightness: 1.4,
      swellAmount: 1,
      waveSpeed: 1.8,
      easing: "easeOutExpo",
    });
    sweep.done.finally(() => {
      sweepingRef.current = false;
    });
  };

  const selectModel = (next: { key: string; name: string; tag?: string }) => {
    if (modelOptions === undefined) setModel(next as (typeof MODELS)[number]);
    setModelOpen(false);
    setModelPane("root");
    onModelChange?.(next.key);
    // 旗舰扫光：画廊 mock 行为（真实模式不触发，2026-09-17）
    if (modelOptions === undefined && next.key === "magic-5") celebrate();
  };

  /* autoplay: apply the current step, then advance after its hold */
  useEffect(() => {
    if (!auto) return;
    const step = AUTO_STEPS[autoStep % AUTO_STEPS.length];
    setDraft(step.draft);
    if (step.active !== undefined) setActive(step.active);
    if (step.connect !== undefined) setConnected(step.connect);
    if (step.modelOpen !== undefined) {
      setModelOpen(step.modelOpen);
      // 画廊自演两级菜单（2026-09-18 官方化）：直接下钻到模型列表层展示
      setModelPane(step.modelOpen ? "model" : "root");
    }
    if (step.model) {
      const next = MODELS.find((m) => m.key === step.model);
      if (next) selectModel(next);
    }
    const t = setTimeout(() => setAutoStep((s) => s + 1), step.hold);
    return () => clearTimeout(t);
  }, [auto, autoStep]);

  /* 听写（裁定 4：占位）——保留按压动效与呼吸条，2.2s 后自动复位；
   * 不写入任何假转录。SDK 接线后在这里接真实语音识别。 */
  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => setListening(false), 2200);
    return () => clearTimeout(t);
  }, [listening]);

  /* @引用桥（2026-09-18）：右坞 FileTree 的「@文件」按钮经 App → ChatFlow 注入
   * `@<相对路径> `。追加语义（不清空已有草稿）；seq 变化即一次新注入。ref 去重
   * 是为了 StrictMode 开发态 effect 双跑 / 重挂载时不重复追加。 */
  const injectedSeqRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (draftInjection === null || draftInjection === undefined) return;
    if (injectedSeqRef.current === draftInjection.seq) return;
    injectedSeqRef.current = draftInjection.seq;
    setDraft((prev) => prev + draftInjection.text);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftInjection?.seq]);

  /* Move wrapped text above the controls, then grow to a compact maximum. */
  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;

    // 28px 方钮：附件 +（上下文圆环）+ 听写 + 发送；模型钮宽度实测
    const fixedControlsWidth = 28 * (hasContext ? 4 : 3) + modelButton.offsetWidth;
    const inlineGaps = 4 * (wide ? (hasContext ? 4 : 3) : (hasContext ? 5 : 4));
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }

    const minHeight = 28;
    const maxHeight = 100;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded, hasContext]);

  /* clicking anywhere outside the composer closes the open menus */
  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setModelOpen(false);
        setModelPane("root");
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);

  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
    setModelPane("root");
  };

  const pick = (row: { key: string; name: string }) => {
    const source = mentionItems.find((s) => s.key === row.key);
    if (source?.attach) {
      // M1 静态：附件仅收进 chips（无真实上传）；SDK 接线后换真实文件选择
      setAttachments((current) => [...current, `附件 ${current.length + 1}`]);
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = draft.trim().length > 0 || attachments.length > 0;
  const send = () => {
    if (!canSend) return;
    onSend?.(draft.trim());
    setDraft("");
    setAttachments([]);
    closeMenus();
  };

  return (
    <div
      data-promptbar
      className={demo ? "flex min-h-[384px] w-full max-w-105 flex-col justify-end pb-8" : "w-full"}
      onPointerDownCapture={takeOver}
      onKeyDownCapture={takeOver}
    >
      {/* composer is the anchor — menus grow up from its top edge */}
      <div ref={composerAnchorRef} className="relative">
      {/* ── @ / slash menu ─────────────────────────────── */}
      {menu && (
        <div
          onMouseLeave={() => setEngaged(false)}
          className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-[10px] bg-surface p-1 shadow-raised"
          style={{ animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom center" }}
        >
          {/* single gliding highlight — appears once a row is hovered */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
            style={{
              top: rowBox?.top ?? 0,
              height: rowBox?.height ?? 0,
              opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
              transition:
                "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
            }}
          />
          {rows.map((row, i) => {
            const source = menu === "at" ? mentionItems.find((s) => s.key === row.key) : undefined;
            return (
              <button
                key={row.key}
                type="button"
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => {
                  setActive(i);
                  setEngaged(true);
                }}
                onClick={() => pick(row)}
                className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left"
              >
                {source && (
                  <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                    <Icon size={15}>{GLYPHS[source.glyph ?? "clip"]}</Icon>
                  </span>
                )}
                <span className="shrink-0 text-[12.5px] font-medium text-ink">
                  {row.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                {source?.connect && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(event) => {
                      event.stopPropagation();
                      setConnected((current) => !current);
                    }}
                    className={`shrink-0 text-[12px] font-medium transition-colors duration-100 ${
                      connected ? "text-green" : "text-accent-ink hover:underline"
                    }`}
                  >
                    {connected ? "已连接" : "连接"}
                  </span>
                )}
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="flex h-9 items-center px-2 text-[12px] text-ink-3">
              无匹配“{query}”
            </div>
          )}
          <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-ink-3">
            {menu === "at" ? "输入以搜索来源与文件" : "输入以搜索命令"}
          </div>
        </div>
      )}

      {/* ── model menu（2026-09-18 官方化两级菜单，照官方 ModelSelect.tsx:300-371）──
          同容器替换渲染：root=「模型」单行 cell（label+当前值+右 chevron），点击下钻
          model pane（provider 分组 sticky 组标题 + 模型行）；无返回钮，Esc 先退层再关闭；
          effort 维度 Magic 无数据源，诚实跳过（root 只有「模型」一行）。 */}
      {modelOpen && (
        <div
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            // 官方 ModelSelect.tsx:183-189：Esc 先从下钻层退回 root，再关闭
            if (modelPane !== "root") setModelPane("root");
            else closeMenus();
          }}
          className="absolute z-10 flex max-h-[360px] w-max min-w-[240px] max-w-[420px] flex-col overflow-hidden rounded-[20px] bg-surface p-1 shadow-overlay"
          style={{ left: modelMenuLeft, bottom: modelMenuBottom, animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom left" }}
        >
          {modelPane === "root" ? (
            <button
              type="button"
              role="menuitem"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setModelPane("model")}
              className="flex h-10 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-[14px] leading-[22px] text-ink transition-colors duration-150 hover:bg-hover"
            >
              <span className="flex-none whitespace-nowrap">模型</span>
              <span className="min-w-0 flex-1 truncate text-right text-ink-3">{activeModel.name}</span>
              <span className="flex-none text-ink-3">
                <Icon size={14} strokeWidth={2}><path d="M9 6l6 6-6 6" /></Icon>
              </span>
            </button>
          ) : (
            <div className="relative min-h-0 flex-1 overflow-y-auto" onMouseLeave={() => setModelHovered(null)}>
              {/* single gliding highlight — floats to the hovered / selected row */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
                style={{
                  top: modelBox?.top ?? 0,
                  height: modelBox?.height ?? 0,
                  opacity: modelBox && modelHovered !== null ? 1 : 0,
                  transition:
                    "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
                }}
              />
              {modelGroups.map((group) => (
                <div key={group.tag.length > 0 ? group.tag : "default"}>
                  {group.tag.length > 0 ? (
                    <div className="sticky top-0 z-20 bg-surface p-[5px_8px_3px] text-[12px] leading-[18px] font-medium text-ink-3">
                      {group.tag}
                    </div>
                  ) : null}
                  {group.models.map((m) => {
                    const i = menuModels.indexOf(m);
                    const selected = m.key === activeModel.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        ref={(el) => {
                          modelRowRefs.current[i] = el;
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setModelHovered(i)}
                        onClick={() => {
                          selectModel(m);
                          inputRef.current?.focus();
                        }}
                        className="relative z-10 flex min-h-[38px] w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-ink" title={m.name}>
                          {m.name}
                        </span>
                        {/* 官方式固定 18px 勾选格：仅当前行渲染勾选，其余行留空占位；
                            选中不加底色（官方 ModelSelect.module.css:216-218） */}
                        <span className="grid flex-none place-items-center size-[18px] text-ink">
                          {selected ? (
                            <Icon size={16} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></Icon>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── composer ───────────────────────────────────── */}
      <div
        className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-gl-card transition-[border-color,border-radius] duration-150 focus-within:border-line-strong ${
          tall ? "gap-2.5 p-3.5" : "gap-1.5 p-1.5"
        } ${
          pill ? (attachments.length > 0 || wide ? "rounded-[24px]" : "rounded-full") : tall ? "rounded-[22px]" : "rounded-[14px]"
        }`}
      >
        {/* rainbow glimm sweep — plays across the interior on model change.
            explicit w/h: a <canvas> is a replaced element and won't stretch
            to inset-0 alone, which feeds back into the shader's ResizeObserver. */}
        <canvas
          ref={glimmRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
          style={{ borderRadius: "inherit" }}
        />
        <span
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
        >
          {draft}
        </span>

        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
            {attachments.map((file, i) => (
              <span
                key={`${file}-${i}`}
                className={`flex h-6.5 items-center gap-1.5 bg-field py-1 pr-1 pl-1.5 text-[11.5px] text-ink-2 shadow-hairline ${
                  pill ? "rounded-full" : "rounded-chip"
                }`}
                style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
              >
                <Icon size={12}><g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g></Icon>
                <span className="max-w-36 truncate">{file}</span>
                <button
                  type="button"
                  aria-label={`移除 ${file}`}
                  onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}
                  className={`-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors duration-100 hover:bg-line/70 hover:text-ink ${
                    pill ? "rounded-full" : "rounded-[5px]"
                  }`}
                >
                  <Icon size={10} strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></Icon>
                </button>
              </span>
            ))}
          </div>
        )}

        <div
          ref={controlsRef}
          className={`grid items-end gap-x-1 gap-y-1.5 ${
            wide
              ? hasContext
                ? "grid-cols-[28px_auto_28px_28px_28px]"
                : "grid-cols-[28px_auto_28px_28px]"
              : hasContext
                ? "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
          }`}
        >
          <button
            type="button"
            aria-label="添加附件与来源"
            aria-expanded={plusOpen}
            onClick={() => {
              setModelOpen(false);
              setPlusOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className={`flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${
              pill ? "rounded-full" : "rounded-[8px]"
            } ${plusOpen ? "bg-hover text-ink" : ""} ${wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}`}
          >
            <Icon size={16} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDismissed(false);
              setPlusOpen(false);
            }}
            onKeyDown={(event) => {
              if (menu && rows.length > 0) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setEngaged(true);
                  setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                  return;
                }
                if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                  event.preventDefault();
                  pick(rows[active]);
                  return;
                }
              }
              if (event.key === "Escape") {
                // 官方 ModelSelect.tsx:183-189：Esc 先从下钻的模型层退回 root，再关闭
                if (modelOpen && modelPane !== "root") {
                  setModelPane("root");
                  return;
                }
                setDismissed(true);
                closeMenus();
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={listening ? "正在听写…" : placeholder ?? "输入消息，@ 唤起来源，/ 唤起命令"}
            aria-label="输入"
            className={`${tall ? "min-h-[68px] px-2 py-2 text-[14px] leading-5" : "min-h-7 px-1 py-[5px] text-[13px] leading-[18px]"} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${
              wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"
            }`}
          />

          {/* model picker（2026-09-18 官方化，照官方 ModelSelect.tsx:263-285 trigger）：
              16px 数据图标 + 模型名(13/500) + 14px chevron；28px 胶囊透明底，
              hover 交互悬停色；max-width 360px，超长截断。 */}
          <button
            ref={modelRef}
            type="button"
            aria-expanded={modelOpen}
            aria-haspopup="menu"
            aria-label="选择模型"
            onClick={() => {
              setPlusOpen(false);
              if (modelOpen) {
                setModelOpen(false);
                setModelPane("root");
              } else {
                setModelPane("root");
                setModelOpen(true);
              }
            }}
            className={`flex h-7 min-w-0 max-w-[360px] shrink-0 items-center gap-1 rounded-[999px] py-0 pl-2 pr-1 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${
              wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"
            }`}
          >
            <span className="flex-none">
              <Icon size={16} strokeWidth={1.8}>{GLYPHS.data}</Icon>
            </span>
            <span className="min-w-0 truncate">{activeModel.name}</span>
            <span className={`flex-none text-ink-3 transition-transform duration-150 ${modelOpen ? "rotate-180" : ""}`}>
              <Icon size={14} strokeWidth={2}><path d="M6 9l6 6 6-6" /></Icon>
            </span>
          </button>

          {/* 上下文圆环（2026-09-18 官方化）：官方顺序 model→ContextMeter→Stop→Send，
              Magic 无 Stop，故位于模型钮与发送键之间；旧底部 context 文本 chip 移除 */}
          {contextChip !== undefined ? (
            <span className={wide ? "col-start-3 row-start-2" : "col-start-4 row-start-1"}>
              <ContextMeter
                percent={contextChip.percent}
                detail={contextChip.detail}
                breakdown={contextChip.breakdown}
              />
            </span>
          ) : null}

          {/* dictation（裁定 4：占位） */}
          <button
            type="button"
            aria-label={listening ? "停止听写" : "开始听写"}
            aria-pressed={listening}
            onClick={() => setListening((current) => !current)}
            className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${
              pill ? "rounded-full" : "rounded-[8px]"
            } ${listening ? "bg-accent-tint text-accent-ink" : "text-ink-3 hover:bg-hover hover:text-ink"} ${wide ? (hasContext ? "col-start-4" : "col-start-3") + " row-start-2" : (hasContext ? "col-start-5" : "col-start-4") + " row-start-1"}`}
          >
            {listening ? (
              <span className="flex h-3.5 items-center gap-[2.5px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-[2.5px] rounded-full bg-current"
                    style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                  />
                ))}
              </span>
            ) : (
              <Icon size={15} strokeWidth={2}><g><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></g></Icon>
            )}
          </button>

          {/* send — tactile square (round in the pill variant) */}
          <button
            type="button"
            aria-label="发送"
            disabled={!canSend}
            onClick={send}
            className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94] ${
              pill ? "rounded-full" : "rounded-[8px]"
            } ${wide ? (hasContext ? "col-start-5" : "col-start-4") + " row-start-2" : (hasContext ? "col-start-6" : "col-start-5") + " row-start-1"}`}
            style={{
              background: canSend ? "var(--ink)" : "var(--line-strong)",
              color: canSend ? "var(--surface)" : "var(--ink-2)",
            }}
          >
            <Icon size={16} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
          </button>
        </div>

        {/* 输入条 chip 行（2026-09-18）：访问模式 / 工作模式。旧右端 context 文本 chip
            已官方化为控制行内的 ContextMeter 圆环（见上方控制行） */}
        {composerChips !== undefined ? (
          <div className={`flex items-center gap-2 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
            {composerChips.permission !== undefined ? (
              <button
                type="button"
                onClick={composerChips.permission.onClick}
                className="flex h-7 shrink-0 items-center rounded-full px-2 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                {composerChips.permission.label}
              </button>
            ) : null}
            {composerChips.workMode !== undefined ? (
              <button
                type="button"
                onClick={composerChips.workMode.onClick}
                className="flex h-7 shrink-0 items-center rounded-full bg-field px-2 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                {composerChips.workMode.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
