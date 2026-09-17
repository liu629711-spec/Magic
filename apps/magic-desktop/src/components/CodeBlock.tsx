import { useCallback, useState, type ReactNode } from "react";

/**
 * CodeBlock 代码面板。
 * 出处：stitch_codex_ui_clone/UI/diff.txt（用户提供的组件设计）。结构/交互与 diff.txt 一致：
 *  · Code 视图——行号列表 + Copy 按钮
 *  · Diff 视图——old/new 双行号 gutter、+/− 竖条、删除行斜纹、词级 add/del 高亮
 * 配色 2026-09-17 用户裁定：跟随界面暗色自适应——全部颜色走 CSS 变量
 * （index.css `.magic-codeblock` 暗色基准表；`.cb-theme-light` 浅色表供将来亮色界面切换，组件零改动）。
 */

export type CodePiece = { text: string; change?: "add" | "del" };
export type DiffRow = {
  old: number | null;
  cur: number | null;
  type: "ctx" | "add" | "del";
  pieces: CodePiece[];
};
export type CodeBlockLabels = { copy: string; copied: string };

const HATCH =
  "repeating-linear-gradient(45deg, var(--cb-red) 0, var(--cb-red) 1.5px, transparent 1.5px, transparent 3px)";

/* light syntax coloring — keywords/imports/conditionals, functions, strings & numbers */
const KEYWORDS = new Set([
  "import", "from", "export", "default", "async", "function", "const", "let",
  "var", "await", "return", "if", "else", "for", "while", "new", "throw",
  "try", "catch", "null", "true", "false", "undefined",
]);
const TOKEN =
  /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b(?:import|from|export|default|async|function|const|let|var|await|return|if|else|for|while|new|throw|try|catch|null|true|false|undefined)\b|[A-Za-z_$][\w$]*(?=\s*\())/g;

function highlight(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    const t = m[0];
    if (idx > last) nodes.push(<span key={k++}>{text.slice(last, idx)}</span>);
    let color: string;
    let weight: number | undefined;
    if (/^["'`]/.test(t) || /^\d/.test(t)) color = "var(--cb-orange)";
    else if (KEYWORDS.has(t)) color = "var(--cb-accent-ink)";
    else {
      color = "var(--cb-ink)";
      weight = 500;
    }
    nodes.push(
      <span key={k++} style={{ color, fontWeight: weight }}>
        {t}
      </span>,
    );
    last = idx + t.length;
  }
  if (last < text.length) nodes.push(<span key={k++}>{text.slice(last)}</span>);
  return nodes;
}

function Pieces({ pieces }: { pieces: CodePiece[] }) {
  return (
    <>
      {pieces.map((p, i) => {
        if (p.change) {
          const add = p.change === "add";
          return (
            <span
              key={i}
              className="rounded-[3px]"
              style={{
                background: `color-mix(in srgb, var(--cb-${add ? "green" : "red"}) 18%, transparent)`,
                padding: "0 2px",
                margin: "0 -1px",
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }}
            >
              {highlight(p.text)}
            </span>
          );
        }
        return <span key={i}>{highlight(p.text)}</span>;
      })}
    </>
  );
}

function FileIcon() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 cb-ink3"
    >
      <path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

const DEFAULT_LABELS: CodeBlockLabels = { copy: "Copy", copied: "Copied" };

export type CodeBlockProps = {
  /** Which view to render — "Code" (line-numbered listing) or "Diff". */
  variant?: "Code" | "Diff";
  /** The lines shown in the Code view. */
  lines?: string[];
  /** Raw text placed on the clipboard by Copy. Defaults to `lines` joined. */
  code?: string;
  /** The unified-diff rows shown in the Diff view. */
  diff?: DiffRow[];
  /** Filename shown in the header. */
  filename?: string;
  /** Prominent copy strings. */
  labels?: Partial<CodeBlockLabels>;
  /** Called with the copied text after a successful copy. */
  onCopy?: (text: string) => void;
  /** Extra classes for the root card（默认 w-full max-w-[420px]，可覆盖宽度） */
  className?: string;
};

export function CodeBlock({
  variant = "Code",
  lines = [],
  code,
  diff = [],
  filename,
  labels,
  onCopy,
  className = "w-full max-w-[420px]",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isDiff = variant === "Diff";
  const text = { ...DEFAULT_LABELS, ...labels };
  const raw = code ?? lines.join("\n");

  const copy = useCallback(() => {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      onCopy?.(raw);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [raw, onCopy]);

  const added = diff.filter((r) => r.type === "add").length;
  const removed = diff.filter((r) => r.type === "del").length;

  return (
    <div className={`magic-codeblock overflow-hidden cb-surface cb-card ${className}`}>
      {/* header — file · (diff stat | copy)；不传 filename 时不渲染（嵌入列表卡时由外部头行承载文件名） */}
      {filename ? (
        <div className="flex h-11 items-center gap-2 border-b cb-border px-4 text-[12.5px]">
        <span className="inline-flex min-w-0 items-center gap-[7px]">
          <FileIcon />
          <span className="truncate cb-mono leading-none cb-ink">{filename}</span>
        </span>

        {isDiff ? (
          <span className="ml-auto inline-flex items-center gap-2 cb-mono text-[12px] leading-none tabular-nums">
            <span className="cb-green">+{added}</span>
            <span className="cb-red">-{removed}</span>
          </span>
        ) : (
          <button
            type="button"
            aria-label="Copy code"
            onClick={copy}
            className={`-mr-1 ml-auto flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[12px] font-medium cb-hover cursor-pointer ${
              copied ? "cb-green" : "cb-ink3 cb-copy"
            }`}
          >
            {copied ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            )}
            {copied ? text.copied : text.copy}
          </button>
        )}
        </div>
      ) : null}

      {/* body — equal 12px inset on top / left / right; lines wrap */}
      <div className="py-3 cb-mono text-[12.5px] leading-[1.65] cb-ink2">
        {isDiff ? (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-5 w-px cb-gutter-line" />
            {diff.map((r, i) => {
              const add = r.type === "add";
              const del = r.type === "del";
              // one gutter column: removals keep the old number, additions/context show the new one
              const num = del ? r.old : r.cur;
              return (
                <div
                  key={i}
                  className={`relative grid grid-cols-[20px_minmax(0,1fr)] items-start ${
                    add ? "cb-tint-add" : del ? "cb-tint-del" : ""
                  }`}
                >
                  {(add || del) && (
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: add ? "var(--cb-green)" : HATCH }}
                    />
                  )}
                  <span
                    className={`select-none text-center text-[11px] ${
                      add ? "cb-green" : del ? "cb-red" : "cb-ink3"
                    }`}
                  >
                    {num ?? ""}
                  </span>
                  <code className="pr-3 pl-1 break-words whitespace-pre-wrap">
                    <Pieces pieces={r.pieces} />
                  </code>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-5 w-px cb-gutter-line" />
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[20px_minmax(0,1fr)] items-start">
                <span className="select-none text-center text-[11px] cb-ink3">{i + 1}</span>
                <code className="pr-3 pl-1 break-words whitespace-pre-wrap">{highlight(line)}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
