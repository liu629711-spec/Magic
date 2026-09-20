// vendored from stitch 设计稿画廊 PromptBar（对话区 v2 皮肤，2026-09-17 用户四点裁定：
// ①工具展示怎么好看怎么来 ②彩虹扫光保留 ③DSH 没有的功能先记录 ④听写占位）。
// 嵌入改造：SOURCES/COMMANDS/MODELS 本地化为 Magic 语境默认值（M1 静态，SDK 接线后
// 由真实数据驱动）；听写按钮保留动效但不再写入假转录（裁定 4 占位）；demo 自演保留
// 供画廊模式，嵌入一律 demo={false}；扫光照旧由旗舰模型选择触发（裁定 2）。
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/* 最高档火花色（reactbits prompt-bar 的 --pb-spark） */
const SPARK = "#b39dff";

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
  /* 思考级别（2026-09-19）：脑形（Lucide brain 同构描边） */
  brain: <g><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" /><path d="M17.599 6.5a3 3 0 0 0 .399-1.375" /><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" /><path d="M3.477 10.896a4 4 0 0 1 .585-.396" /><path d="M19.938 10.5a4 4 0 0 1 .585.396" /><path d="M6 18a4 4 0 0 1-1.967-.516" /><path d="M19.967 17.484A4 4 0 0 1 18 18" /></g>,
};

/* 激活模式 chip（2026-09-20，ZCode「× 计划」同款）：图标+文字+×，点 × 关闭；
 * 窄窗只显示模式图标。workMode（CEO）与 planMode（计划）共用。 */
function ActiveModeChip(props: { glyph: React.ReactNode; label: string; title: string; onDismiss: () => void; narrow: boolean }) {
  return (
    <span className="flex h-7 shrink-0 items-center gap-1.5 border-l border-line pl-2" data-menu-trigger>
      <button
        type="button"
        title={props.title}
        aria-label={props.title}
        onClick={props.onDismiss}
        className="flex h-7 min-w-0 items-center gap-1.5 overflow-hidden rounded-full px-1 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <span className="flex-none" aria-hidden>
          <Icon size={13} strokeWidth={2.2}><path d="M18 6L6 18M6 6l12 12" /></Icon>
        </span>
        {props.narrow ? (
          <span className="flex-none" aria-hidden>
            <Icon size={15} strokeWidth={1.8}>{props.glyph}</Icon>
          </span>
        ) : (
          <>
            <span className="flex-none" aria-hidden>
              <Icon size={15} strokeWidth={1.8}>{props.glyph}</Icon>
            </span>
            <span className="truncate">{props.label}</span>
          </>
        )}
      </button>
    </span>
  );
}

/* 权限模式图标（2026-09-19 图二裁定）：语义键→描边路径，走本文件 Icon 渲染。
 * 修复：此前把语义键（ask/auto/full）直接塞进 material-symbols-outlined 字体
 * span，字体无对应 ligature，页面上原样显示为 ASK/AUTO/FULL 文字。
 * 图形对齐 ZCode 权限菜单：灯泡=计划、手掌=确认、盾√=自动编辑、盾!=完全访问。 */
const PERMISSION_GLYPHS: Record<PromptBarPermissionItem["icon"], React.ReactNode> = {
  plan: <g><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 2V16h5.4v-.2c0-.8.3-1.5.9-2A6 6 0 0 0 12 3z" /></g>,
  ask: <g><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.35-3.35a2 2 0 0 1 2.71-2.95l2.63 2.3" /></g>,
  auto: <g><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></g>,
  full: <g><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4" /><path d="M12 16h.01" /></g>,
  /* 工作模式（2026-09-19 合并进权限菜单）：agent=单人执行，ceo=多人协作 */
  agent: <g><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></g>,
  ceo: <g><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></g>,
  misc: <g><circle cx="12" cy="12" r="9" /></g>,
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
export type PromptBarPermissionItem = {
  /** 权限模式 id（/permission <value>）。 */
  value: string;
  /** 菜单标题（图二：计划模式/变更前确认/自动编辑/完全访问）。 */
  title: string;
  /** 一行说明。 */
  desc: string;
  /** 图形键（PERMISSION_GLYPHS 内置简笔 svg，语义键→路径映射）。 */
  icon: "plan" | "ask" | "auto" | "full" | "agent" | "ceo" | "misc";
  /** 是否当前值（菜单打勾）。 */
  current: boolean;
  /** 风险确认弹窗元数据（2026-09-19）：存在时选择该项先弹「确认启用？」，
   *  勾选「我已了解风险」后才能启用；确认记录由调用方经 onConfirm 持久化。 */
  confirm?: {
    /** 弹窗标题（如「确认启用完全权限？」）。 */
    title: string;
    /** 红色警示正文。 */
    body: string;
    /** 复选框文案。 */
    ackLabel: string;
    /** 启用按钮文案。 */
    acceptLabel: string;
    /** 该项目当前是否已确认过（true = 直接启用不弹窗）。 */
    acknowledged: boolean;
  };
};

export type PromptBarChips = {
  permission?: {
    label: string;
    onClick?: () => void;
    /** 两节菜单（2026-09-19 合并裁定）：访问模式节 + 工作模式节，图二风格。 */
    menu?: {
      /** 访问模式节（runtime permissions.options 装饰）。 */
      items: PromptBarPermissionItem[];
      onSelect: (value: string) => void;
      /** 确认弹窗「启用」后回调（记录按项目的已确认状态）；先于 onSelect。 */
      onConfirm?: (value: string) => void;
      /** 工作模式节（Agent/CEO，/mode <value>）。 */
      modeItems?: PromptBarPermissionItem[];
      onSelectMode: (value: string) => void;
      /** 计划模式节（PRD-02 §15.4，官方 plan-mode 投影驱动）：独立于访问模式。 */
      planItem?: {
        title: string;
        desc: string;
        icon: PromptBarPermissionItem["icon"];
        active: boolean;
        pending: boolean;
        onToggle: () => void;
      };
    };
  };
  /** 激活工作模式 chip（2026-09-20，ZCode 同款「× 计划」交互）：仅 CEO 启用时
   *  输出；点 chip 切回 Agent（onDismiss 走 handoff 确认链）；Agent 模式不展示。 */
  workMode?: { active: boolean; label: string; onDismiss: () => void };
  /** 计划模式激活 chip（PRD-02 §15.4）：生效/待生效时输出，点 × → /plan off。 */
  planMode?: { active: boolean; onDismiss: () => void };
  context?: { percent: number; detail?: string; breakdown?: ContextMeterBreakdownItem[] };
};

export default function PromptBar({
  variant = "Rounded",
  demo = true,
  tall = false,
  placeholder,
  onSend,
  running = false,
  onStop,
  modelOptions,
  modelKey,
  onModelChange,
  composerChips,
  mentionOptions,
  commandOptions,
  draftInjection,
  effortOptions,
  effortKey,
  onEffortChange,
}: {
  variant?: string;
  /** the self-running walkthrough; turn off when embedding in a real surface */
  demo?: boolean;
  /** hero sizing: a multi-line input with controls on their own row */
  tall?: boolean;
  placeholder?: string;
  onSend?: (text: string) => void;
  /** 当前会话正在执行：发送按钮切换为停止按钮。 */
  running?: boolean;
  /** 请求取消当前会话执行。 */
  onStop?: () => void;
  /** 真实模型列表（2026-09-17：来自 session/modelCatalog；缺省=画廊 mock MODELS） */
  modelOptions?: { key: string; name: string; tag?: string }[];
  /** 当前选中模型 key（受控） */
  modelKey?: string;
  /** 选择模型回调（真实模式写入 session/selectModel） */
  onModelChange?: (key: string) => void;
  /** 思考级别（2026-09-19，参考 moxingsikao 滑杆裁定）：当前模型支持的档位
   *  （catalog reasoning.efforts，自适应）；缺省=模型不支持思考，不渲染控件。 */
  effortOptions?: { id: string; name: string }[];
  /** 当前档位 id（投影记录 → 模型默认档回退，App 已解析）。 */
  effortKey?: string;
  /** 换档回调（真实模式写入 session/selectModel + reasoningEffort）。 */
  onEffortChange?: (effortId: string) => void;
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
  // 当前键不在列表（如提供方被设置页停用）时显示真实模型名而不是回退第一项——
  // 会话实际在用的模型要诚实展示（2026-09-19 思考级别接线时修正）。
  const activeModel = modelOptions !== undefined
    ? modelOptions.find((m) => m.key === modelKey) ??
      (modelKey !== undefined && modelKey.length > 0
        ? { key: modelKey, name: modelKey.includes(":") ? modelKey.slice(modelKey.indexOf(":") + 1) : modelKey }
        : modelOptions[0])
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
  /** 2026-09-19 用户裁定（图二）：composer 恒两行——第一行纯输入，第二行
   *  workspace/工作模式 chips + 模型 + 上下文 + 语音 + 发送同排。旧的
   *  「文本变宽才换行展开」动态逻辑随之移除，wide 恒真。 */
  const wide = true;
  /** 上下文圆环数据（2026-09-18 官方化）：控制行是否含 ContextMeter 列由此决定 */
  const contextChip = composerChips?.context;
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);
  /* 访问模式菜单（图二，2026-09-19）：chip 点击弹出四项模式，定位同模型菜单 */
  const [permOpen, setPermOpen] = useState(false);
  const [permMenuLeft, setPermMenuLeft] = useState(0);
  const [permMenuBottom, setPermMenuBottom] = useState(0);
  /* 思考级别滑杆菜单（2026-09-19，moxingsikao 滑杆裁定）：chip 点击弹出滑杆 */
  const [effortOpen, setEffortOpen] = useState(false);
  const [effortMenuLeft, setEffortMenuLeft] = useState(0);
  const [effortMenuBottom, setEffortMenuBottom] = useState(0);
  /** 拖动中的本地档位（滑杆即时跟手；props effortKey 落定后由同步 effect 覆盖）。 */
  const [effortDragIndex, setEffortDragIndex] = useState<number | null>(null);
  /** 窄窗（图五，2026-09-19）：composer 宽度 <560px 时文字 chip 收敛为图标。 */
  const [narrow, setNarrow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /* 完全访问风险确认弹窗（图三，2026-09-19）：待确认项（含 confirm 元数据），
   * null = 关闭；ack = 复选框勾选态（每次打开重置）。 */
  const [permConfirmItem, setPermConfirmItem] = useState<PromptBarPermissionItem | null>(null);
  const [permAcked, setPermAcked] = useState(false);
  const permissionRef = useRef<HTMLButtonElement>(null);
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

  useLayoutEffect(() => {
    if (!permOpen || !composerAnchorRef.current || !permissionRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = permissionRef.current.getBoundingClientRect();
    setPermMenuLeft(Math.max(0, triggerRect.left - anchorRect.left));
    setPermMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [permOpen]);

  /* 思考级别滑杆菜单定位（同权限菜单：锚 chip 上弹，右缘不越 composer）。 */
  const effortRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!effortOpen || !composerAnchorRef.current || !effortRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = effortRef.current.getBoundingClientRect();
    setEffortMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 260)));
    setEffortMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [effortOpen]);

  /* 滑杆档位解析：effortKey（投影记录 → 默认档回退，App 已解析）→ 索引；
   * 拖动中用本地索引跟手，props 落定（RPC 回写投影）后同步 effect 归位。 */
  const effortItems = effortOptions ?? [];
  const resolvedEffortIndex = (() => {
    const index = effortItems.findIndex(item => item.id === effortKey);
    return index >= 0 ? index : 0;
  })();
  const effortIndex = effortDragIndex ?? resolvedEffortIndex;
  const currentEffortName = effortItems[effortIndex]?.name ?? "";
  /** 最高档（reactbits prompt-bar 同款）：滑块/chip 转火花紫 + composer 火花粒子与辉光。 */
  const maxed = effortItems.length > 1 && effortIndex === effortItems.length - 1;
  useEffect(() => {
    setEffortDragIndex(null);
  }, [effortKey, effortOptions]);
  const setEffortIndex = (next: number) => {
    if (effortItems.length === 0) return;
    const clamped = Math.max(0, Math.min(effortItems.length - 1, next));
    if (clamped === effortIndex) return;
    setEffortDragIndex(clamped);
    const target = effortItems[clamped];
    if (target !== undefined) onEffortChange?.(target.id);
  };

  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);

  /* 窄窗检测（图五，2026-09-19）：ResizeObserver 跟随 composer 实际宽度，
   * 内容列被窗口压缩时文字 chip 逐个收敛为图标。 */
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const measure = () => setNarrow(root.clientWidth < 560);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  /* 最高档火花粒子（2026-09-19，reactbits prompt-bar 同款移植）：思考深度拉满时
   * composer 内升起紫色火花；打字能量越足火花越亮越快。reduced-motion 不跑。 */
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const typingRef = useRef({ energy: 0, strokes: 0 });
  useEffect(() => {
    const canvas = sparkRef.current;
    if (canvas === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    typingRef.current.strokes = 0;
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    let due = 0;
    let speed = 1;
    let pulse = 0;
    const parts: { x: number; y: number; r: number; vy: number; sway: number; phase: number; life: number; span: number }[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (burst: boolean) => {
      parts.push({
        x: Math.random() * w,
        y: burst ? h * (0.2 + Math.random() * 0.8) : h + 3,
        r: 0.9 + Math.random() * 1.1,
        vy: -(7 + Math.random() * 9),
        sway: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2,
        life: burst ? Math.random() * 1.2 : 0,
        span: 2.4 + Math.random() * 2.4,
      });
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const typed = typingRef.current;
      typed.energy *= Math.exp(-dt / 0.8);
      pulse *= Math.exp(-dt / 0.16);
      if (typed.strokes > 0) {
        typed.strokes = 0;
        pulse = 1;
      }
      const energy = typed.energy;
      speed += (1 + energy * 6 - speed) * (1 - Math.exp(-dt / 0.15));
      due += dt;
      while (due > 0.14) {
        due -= 0.14;
        if (parts.length < 30) spawn(false);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = SPARK;
      ctx.shadowColor = SPARK;
      ctx.shadowBlur = 6 + energy * 10 + pulse * 6;
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        if (p === undefined) continue;
        p.life += dt;
        if (p.life > p.span) {
          parts.splice(i, 1);
          continue;
        }
        const k = p.life / p.span;
        const twinkle = 0.7 + 0.3 * Math.sin((now / 160) * (1 + energy) + p.phase);
        p.y += p.vy * dt * speed;
        if (p.y < -4) {
          p.y = h + 3;
          p.x = Math.random() * w;
        }
        const edge = Math.min(1, Math.max(0, p.y / 14), Math.max(0, (h - p.y) / 14));
        ctx.globalAlpha = Math.min(1, Math.sin(k * Math.PI) * (0.9 + energy * 0.25) * twinkle) * edge;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.sin((now / 900) * (1 + energy * 0.8) + p.phase) * p.sway,
          p.y,
          p.r * twinkle * (1 + energy * 0.35),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize();
    for (let i = 0; i < 26; i += 1) spawn(true);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      ctx.clearRect(0, 0, w, h);
    };
  }, [maxed]);

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

  /* Auto-grow the input to a compact maximum (wrap is guaranteed by the
   * two-row layout — the input always owns the full first row). */
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const minHeight = 28;
    const maxHeight = 100;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  /* clicking anywhere outside the open menus closes them — including "blank"
   * areas inside the composer (input field, control row): only clicks inside
   * an open menu or on a menu trigger keep it open (2026-09-20 用户裁定：
   * 思考深度等浮层选完点空白应直接关闭，不必再点一次按钮）。 */
  useEffect(() => {
    if (!modelOpen && !plusOpen && !permOpen && !effortOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest("[data-promptbar-menu]") !== null) return;
        if (target.closest("[data-menu-trigger]") !== null) return;
      }
      setModelOpen(false);
      setModelPane("root");
      setPlusOpen(false);
      setPermOpen(false);
      setEffortOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen, permOpen, effortOpen]);

  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
    setModelPane("root");
    setPermOpen(false);
    setEffortOpen(false);
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
      ref={rootRef}
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
          data-promptbar-menu
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
          data-promptbar-menu
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

      {/* ── 访问模式 + 工作模式合并菜单（图二风格，2026-09-19 合并裁定）：
          chip 向上弹出两节（访问模式 = runtime 预设；工作模式 = Agent/CEO），
          同模型菜单语法；完全访问项带确认弹窗门槛 ── */}
      {permOpen && composerChips?.permission?.menu !== undefined && (
        <div
          data-promptbar-menu
          role="menu"
          className="absolute z-10 flex w-[300px] flex-col overflow-hidden rounded-[20px] bg-surface p-1 shadow-overlay"
          style={{ left: permMenuLeft, bottom: permMenuBottom, animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom left" }}
        >
          {composerChips.permission.menu.items.map((item, index) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={item.current}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                // 完全访问（图三，2026-09-19）：未确认过的项目先弹风险确认，
                // 勾选「我已了解风险」后才能启用；已确认/其它模式直接下发。
                if (item.confirm !== undefined && !item.confirm.acknowledged && !item.current) {
                  setPermAcked(false);
                  setPermConfirmItem(item);
                  return;
                }
                composerChips.permission?.menu?.onSelect(item.value);
                setPermOpen(false);
                inputRef.current?.focus();
              }}
              className={`flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-hover ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <span
                className={`flex-none ${item.icon === "full" ? "text-[#f97316]" : "text-ink-2"}`}
                aria-hidden
              >
                <Icon size={19} strokeWidth={1.8}>{PERMISSION_GLYPHS[item.icon]}</Icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] leading-5 font-medium text-ink">{item.title}</span>
                {item.desc.length > 0 ? (
                  <span className="block text-[12px] leading-[18px] text-ink-3">{item.desc}</span>
                ) : null}
              </span>
              <span className="grid flex-none place-items-center size-[18px] text-ink">
                {item.current ? (
                  <Icon size={16} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></Icon>
                ) : null}
              </span>
            </button>
          ))}
          {/* 工作模式节（图二风格小节标题 + 同款行） */}
          {composerChips.permission.menu.modeItems !== undefined && composerChips.permission.menu.modeItems.length > 0 ? (
            <>
              <div className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[11px] font-medium text-ink-3">
                工作模式
              </div>
              {composerChips.permission.menu.modeItems.map(item => (
                <button
                  key={item.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={item.current}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    composerChips.permission?.menu?.onSelectMode(item.value);
                    setPermOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-hover"
                >
                  <span className="flex-none text-ink-2" aria-hidden>
                    <Icon size={19} strokeWidth={1.8}>{PERMISSION_GLYPHS[item.icon]}</Icon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-5 font-medium text-ink">{item.title}</span>
                    {item.desc.length > 0 ? (
                      <span className="block text-[12px] leading-[18px] text-ink-3">{item.desc}</span>
                    ) : null}
                  </span>
                  <span className="grid flex-none place-items-center size-[18px] text-ink">
                    {item.current ? (
                      <Icon size={16} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></Icon>
                    ) : null}
                  </span>
                </button>
              ))}
            </>
          ) : null}
          {/* 计划模式节（PRD-02 §15.4）：独立开关（checkbox 语义，不打断访问模式 radio），
              active 打勾；pending（已选待下个 pre-step 生效）显示「待生效」标记 */}
          {composerChips.permission.menu.planItem !== undefined ? (
            (() => {
              const plan = composerChips.permission.menu.planItem;
              return (
                <>
                  <div className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[11px] font-medium text-ink-3">
                    计划模式
                  </div>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={plan.active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      plan.onToggle();
                      setPermOpen(false);
                      inputRef.current?.focus();
                    }}
                    className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-hover"
                  >
                    <span className="flex-none text-ink-2" aria-hidden>
                      <Icon size={19} strokeWidth={1.8}>{PERMISSION_GLYPHS[plan.icon]}</Icon>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-5 font-medium text-ink">{plan.title}</span>
                      <span className="block text-[12px] leading-[18px] text-ink-3">{plan.desc}</span>
                    </span>
                    <span className="grid flex-none place-items-center size-[18px] text-ink">
                      {plan.active ? (
                        <Icon size={16} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></Icon>
                      ) : plan.pending ? (
                        <span className="whitespace-nowrap text-[10px] leading-[14px] text-ink-3">待生效</span>
                      ) : null}
                    </span>
                  </button>
                </>
              );
            })()
          ) : null}
        </div>
      )}

      {/* ── 思考级别滑杆菜单（2026-09-19，moxingsikao 滑杆裁定）：拖动/键盘换档，
          档位 = 当前模型 catalog 声明的 efforts（自适应吸附）；两端 更快↔更聪明 ── */}
      {effortOpen && effortItems.length > 0 && (
        <div
          data-promptbar-menu
          role="dialog"
          aria-label="思考级别"
          className="absolute z-10 w-[260px] rounded-[20px] bg-surface p-3 shadow-overlay"
          style={{ left: effortMenuLeft, bottom: effortMenuBottom, animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom left" }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-medium text-ink">思考级别</span>
            <span className="text-[13px] font-medium text-ink">{currentEffortName}</span>
          </div>
          <div className="mt-0.5 flex justify-between px-1 text-[11px] leading-4 text-ink-3">
            <span>更快</span>
            <span>更聪明</span>
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="思考级别"
            aria-valuemin={0}
            aria-valuemax={effortItems.length - 1}
            aria-valuenow={effortIndex}
            aria-valuetext={currentEffortName}
            className="relative mt-1.5 h-6 cursor-pointer touch-none"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                /* pointer capture 不可用时退化为仅点击换档 */
              }
              event.currentTarget.focus({ preventScroll: true });
              const rect = event.currentTarget.getBoundingClientRect();
              const k = (event.clientX - rect.left - 11) / Math.max(1, rect.width - 22);
              setEffortIndex(Math.round(k * (effortItems.length - 1)));
            }}
            onPointerMove={(event) => {
              if ((event.buttons & 1) !== 1) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const k = (event.clientX - rect.left - 11) / Math.max(1, rect.width - 22);
              setEffortIndex(Math.round(k * (effortItems.length - 1)));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                setEffortIndex(effortIndex + 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                setEffortIndex(effortIndex - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                setEffortIndex(0);
              } else if (event.key === "End") {
                event.preventDefault();
                setEffortIndex(effortItems.length - 1);
              } else if (event.key === "Escape") {
                setEffortOpen(false);
              }
            }}
          >
            {/* 轨道 */}
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
            {/* 已选填充（到当前档位点；最高档转火花紫） */}
            <span
              aria-hidden
              className={`absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-colors duration-300 ${
                maxed ? "bg-[#b39dff]/60" : "bg-ink/70"
              }`}
              style={{
                left: 11,
                width: effortIndex === effortItems.length - 1
                  ? "calc(100% - 11px)"
                  : `calc(11px + (100% - 22px) * ${effortIndex / Math.max(1, effortItems.length - 1)} + 4px)`,
              }}
            />
            {/* 档位点 */}
            {effortItems.map((item, i) => (
              <span
                key={item.id}
                aria-hidden
                className={`absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-100 ${
                  i <= effortIndex ? (maxed && i === effortItems.length - 1 ? "bg-[#b39dff]" : "bg-ink") : "bg-line-strong"
                }`}
                style={{ left: `calc(11px + (100% - 22px) * ${i / Math.max(1, effortItems.length - 1)})` }}
              />
            ))}
            {/* 滑块（最高档转火花紫实心，reactbits prompt-bar thumb 同款） */}
            <span
              aria-hidden
              className={`absolute top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-raised transition-[left,background-color,border-color] duration-100 ${
                maxed ? "border-[#b39dff] bg-[#b39dff]" : "border-ink bg-surface"
              }`}
              style={{ left: `calc(11px + (100% - 22px) * ${effortIndex / Math.max(1, effortItems.length - 1)})` }}
            />
          </div>
          {/* 档位名称行（当前档高亮；点击直达该档；flex 等分自适应任意档数） */}
          <div className="mt-1.5 flex justify-between px-0.5">
            {effortItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setEffortIndex(i)}
                className={`min-w-0 flex-1 truncate rounded-[6px] px-0.5 py-0.5 text-center text-[10.5px] leading-4 transition-colors duration-100 ${
                  i === effortIndex
                    ? maxed
                      ? "font-medium text-[#b39dff]"
                      : "font-medium text-ink"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 完全访问风险确认弹窗（图三，2026-09-19）：portal + 遮罩，模式对齐
          TurnStatsDialog（Esc/点遮罩取消；勾选后「启用完全权限」才可点，
          启用 = onConfirm 记录该项目已确认 + onSelect 下发 /permission）。 ── */}
      {permConfirmItem?.confirm !== undefined && createPortal(
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50"
          onKeyDown={(event) => {
            if (event.key === "Escape") setPermConfirmItem(null);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPermConfirmItem(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={permConfirmItem.confirm.title}
            className="w-[420px] rounded-[16px] bg-surface p-5 shadow-overlay"
            style={{ animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both" }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">{permConfirmItem.confirm.title}</h2>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setPermConfirmItem(null)}
                className="-m-1 flex size-7 items-center justify-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                <Icon size={14} strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></Icon>
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2.5">
              <span className="mt-0.5 flex-none text-[#ef4444]" aria-hidden>
                <Icon size={18} strokeWidth={2}><g><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></g></Icon>
              </span>
              <p className="text-[13px] leading-[21px] text-ink-2">{permConfirmItem.confirm.body}</p>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={permAcked}
                onChange={(event) => setPermAcked(event.target.checked)}
                className="size-4 accent-[#3b82f6]"
              />
              {permConfirmItem.confirm.ackLabel}
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPermConfirmItem(null)}
                className="flex h-9 items-center rounded-[10px] border border-line px-4 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-hover"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!permAcked}
                onClick={() => {
                  const menu = composerChips?.permission?.menu;
                  setPermConfirmItem(null);
                  menu?.onConfirm?.(permConfirmItem.value);
                  menu?.onSelect(permConfirmItem.value);
                  inputRef.current?.focus();
                }}
                className={`flex h-9 items-center rounded-[10px] px-4 text-[13px] font-medium text-white transition-colors duration-150 ${
                  permAcked ? "bg-ink hover:opacity-90" : "cursor-not-allowed bg-ink/40"
                }`}
              >
                {permConfirmItem.confirm.acceptLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
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
        {/* 最高档辉光（reactbits prompt-bar field::before）：左下角紫色径向光晕，
            拉满时淡入 */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500 ${
            maxed ? "opacity-100" : "opacity-0"
          }`}
          style={{
            borderRadius: "inherit",
            background: `radial-gradient(140% 120% at 0% 100%, rgba(179, 157, 255, 0.26), transparent 62%)`,
          }}
        />
        {/* 最高档火花粒子层（仅拉满时挂载，见上方 spark effect） */}
        {maxed ? (
          <canvas
            ref={sparkRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
            style={{ borderRadius: "inherit" }}
          />
        ) : null}
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

        {/* 两行 composer（2026-09-19 用户裁定，对齐 3099）：
            第一行=纯输入；第二行=附件+ / workspace / 工作模式 …（右）模型 / 上下文 / 语音 / 发送 */}
        <div ref={controlsRef} className="flex flex-col gap-1">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDismissed(false);
              setPlusOpen(false);
              // 打字能量（reactbits prompt-bar）：最高档时打字越快火花越亮越快
              typingRef.current.energy = Math.min(1.6, typingRef.current.energy + 0.22);
              typingRef.current.strokes = Math.min(4, typingRef.current.strokes + 1);
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
                if (effortOpen) {
                  setEffortOpen(false);
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
            className="min-h-7 w-full resize-none bg-transparent px-1 py-[5px] text-[13px] leading-[18px] text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3"
          />

          {/* 第二行控制排 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="添加附件与来源"
              data-menu-trigger
              aria-expanded={plusOpen}
              onClick={() => {
                setModelOpen(false);
                setPermOpen(false);
                setPlusOpen((current) => !current);
                inputRef.current?.focus();
              }}
              className={`flex size-7 shrink-0 items-center justify-center text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${plusOpen ? "bg-hover text-ink" : ""}`}
            >
              <Icon size={16} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
            </button>

            {/* 访问模式 chip（2026-09-19 合并菜单）：窄窗收敛为当前模式图标（图五） */}
            {composerChips?.permission !== undefined ? (
              <button
                ref={permissionRef}
                data-menu-trigger
                type="button"
                aria-expanded={permOpen}
                aria-haspopup="menu"
                title={composerChips.permission.label}
                onClick={() => {
                  // 互斥（2026-09-19 修复）：打开其它菜单（closeMenus 会关本菜单），
                  // 再基于 ref 读到的实时开关状态取反——functional update 在
                  // closeMenus 之后总是把值置回 true，导致 chip 二次点击关不掉。
                  if (composerChips.permission?.menu !== undefined) {
                    setModelOpen(false);
                    setModelPane("root");
                    setPlusOpen(false);
                    setPermOpen(!permOpen);
                  } else {
                    closeMenus();
                    composerChips.permission?.onClick?.();
                  }
                }}
                className="flex h-7 min-w-0 shrink items-center gap-1.5 overflow-hidden rounded-full px-2 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                {(() => {
                  const currentItem = composerChips.permission?.menu?.items.find(item => item.current);
                  // 常态即带当前模式图标（2026-09-20 用户裁定）；窄窗仅图标。
                  if (currentItem !== undefined) {
                    if (narrow) {
                      return (
                        <span className={`flex-none ${currentItem.icon === "full" ? "text-[#f97316]" : ""}`} aria-hidden>
                          <Icon size={16} strokeWidth={1.8}>{PERMISSION_GLYPHS[currentItem.icon]}</Icon>
                        </span>
                      );
                    }
                    return (
                      <>
                        <span className={`flex-none ${currentItem.icon === "full" ? "text-[#f97316]" : ""}`} aria-hidden>
                          <Icon size={16} strokeWidth={1.8}>{PERMISSION_GLYPHS[currentItem.icon]}</Icon>
                        </span>
                        <span className="truncate">{composerChips.permission.label}</span>
                      </>
                    );
                  }
                  return <span className="truncate">{composerChips.permission.label}</span>;
                })()}
              </button>
            ) : null}
            {/* 激活模式 chips（2026-09-20，ZCode「× 计划」同款）：CEO / 计划，点 × 关闭 */}
            {composerChips?.workMode?.active === true ? (
              <ActiveModeChip
                glyph={PERMISSION_GLYPHS.ceo}
                label={composerChips.workMode.label}
                title={`关闭${composerChips.workMode.label}模式`}
                onDismiss={composerChips.workMode.onDismiss}
                narrow={narrow}
              />
            ) : null}
            {composerChips?.planMode !== undefined ? (
              <ActiveModeChip
                glyph={PERMISSION_GLYPHS.plan}
                label="计划"
                title={composerChips.planMode.active ? "关闭计划模式" : "取消计划模式（待生效）"}
                onDismiss={composerChips.planMode.onDismiss}
                narrow={narrow}
              />
            ) : null}
            {/* 思考级别 chip 已移至模型选择器之后（2026-09-19 用户裁定：入口跟在模型后） */}

            <span className="min-w-2 flex-1" aria-hidden />

            {/* model picker（2026-09-18 官方化，照官方 ModelSelect.tsx:263-285 trigger）：
                16px 数据图标 + 模型名(13/500) + 14px chevron；28px 胶囊透明底，
                hover 交互悬停色；max-width 360px，超长截断。 */}
            <button
              ref={modelRef}
              data-menu-trigger
              type="button"
              aria-expanded={modelOpen}
              aria-haspopup="menu"
              aria-label="选择模型"
              onClick={() => {
                setPlusOpen(false);
                setPermOpen(false);
                if (modelOpen) {
                  setModelOpen(false);
                  setModelPane("root");
                } else {
                  setModelPane("root");
                  setModelOpen(true);
                }
              }}
              className="flex h-7 min-w-0 max-w-[360px] shrink-0 items-center gap-1 rounded-[999px] py-0 pl-2 pr-1 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <span className="flex-none">
                <Icon size={16} strokeWidth={1.8}>{GLYPHS.data}</Icon>
              </span>
              {!narrow ? <span className="min-w-0 truncate">{activeModel.name}</span> : null}
              {!narrow ? (
                <span className={`flex-none text-ink-3 transition-transform duration-150 ${modelOpen ? "rotate-180" : ""}`}>
                  <Icon size={14} strokeWidth={2}><path d="M6 9l6 6 6-6" /></Icon>
                </span>
              ) : null}
            </button>

            {/* 思考级别 chip（2026-09-19 用户裁定：入口跟在模型选择器后面）：
                脑形 + 当前档名；最高档转火花紫（reactbits prompt-bar 同款）；
                窄窗仅图标；模型无档位不渲染（自适应） */}
            {effortItems.length > 0 ? (
              <button
                ref={effortRef}
                data-menu-trigger
                type="button"
                aria-expanded={effortOpen}
                aria-haspopup="dialog"
                aria-label={`思考级别：${currentEffortName}`}
                title={`思考级别：${currentEffortName}`}
                onClick={() => {
                  setPlusOpen(false);
                  setModelOpen(false);
                  setModelPane("root");
                  setPermOpen(false);
                  setEffortOpen(!effortOpen);
                }}
                className={`flex h-7 min-w-0 shrink items-center gap-1.5 overflow-hidden rounded-full px-2 text-[12px] font-medium transition-colors duration-150 hover:bg-hover ${
                  maxed ? "text-[#b39dff]" : "text-ink-2 hover:text-ink"
                }`}
              >
                <Icon size={15} strokeWidth={1.8}>{GLYPHS.brain}</Icon>
                {!narrow ? <span className="truncate">{currentEffortName}</span> : null}
              </button>
            ) : null}

            {/* 上下文圆环（2026-09-18 官方化）：官方顺序 model→ContextMeter→Stop→Send，
                Magic 无 Stop，故位于模型钮与发送键之间；窄窗隐明细文本（图五） */}
            {contextChip !== undefined ? (
              <ContextMeter
                percent={contextChip.percent}
                detail={narrow ? undefined : contextChip.detail}
                breakdown={contextChip.breakdown}
              />
            ) : null}

            {/* dictation（裁定 4：占位） */}
            <button
              type="button"
              aria-label={listening ? "停止听写" : "开始听写"}
              aria-pressed={listening}
              onClick={() => setListening((current) => !current)}
              className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${listening ? "bg-accent-tint text-accent-ink" : "text-ink-3 hover:bg-hover hover:text-ink"}`}
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
              aria-label={running ? "停止任务" : "发送"}
              title={running ? "停止当前任务" : "发送"}
              disabled={running ? false : !canSend}
              onClick={running ? onStop : send}
              className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94]`}
              style={{
                background: running ? "#ef4444" : canSend ? "var(--ink)" : "var(--line-strong)",
                color: running || canSend ? "white" : "var(--ink-2)",
              }}
            >
              {running ? (
                <span aria-hidden className="size-2.5 rounded-[2px] bg-white" />
              ) : (
                <Icon size={16} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
