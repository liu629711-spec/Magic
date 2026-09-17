/** 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html aside */

export function Icon({
  name,
  className,
  title,
  filled,
}: {
  name: string;
  className?: string;
  title?: string;
  /** Material Symbols FILL 变轴置 1（实心形态，如图钉置顶态，裁定 19） */
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      title={title}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
