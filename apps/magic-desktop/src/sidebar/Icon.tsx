/** 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html aside */

export function Icon({
  name,
  className,
  title,
}: {
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`} title={title}>
      {name}
    </span>
  );
}
