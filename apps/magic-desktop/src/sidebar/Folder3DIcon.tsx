import { useState } from "react";
import { motion } from "motion/react";

const FLAP_PATH =
  "M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z";

const W = 18;
const H = 13.5; // 241 / 321 * 18

/**
 * 迷你 3D 文件夹图标（2026-09-17 用户裁定，来自用户提供的 FolderComponent txt）。
 * 只取盖子 3D 翻开（rotateX -15°/-40°/-55°）与同源弹簧物理（stiffness 120 / damping 14）；
 * 卡片飞出在 16px 行内不可读，按约定省略。黑白配色贴合 quiet 风格。
 */
export function Folder3DIcon({ open }: { open: boolean }) {
  const [hovered, setHovered] = useState(false);
  const rotateX = open ? -55 : hovered ? -40 : -15;
  return (
    <span
      className="relative shrink-0"
      style={{ width: W, height: H, perspective: 46, transform: "rotate(-8deg)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 文件夹内腔背板（黑色 + 内发光） */}
      <span
        className="absolute inset-0 rounded-[1.5px]"
        style={{
          backgroundColor: "black",
          boxShadow: "inset 0 0 3px 1px rgba(255,255,255,0.37)",
        }}
      />
      {/* 盖子：rotateX 翻开，弹簧物理与原组件同源 */}
      <motion.span
        className="absolute inset-0"
        style={{ transformOrigin: "bottom center", transformStyle: "preserve-3d" }}
        animate={{ rotateX }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        <svg width={W} height={H} viewBox="0 0 321 241" fill="none">
          <path
            d={FLAP_PATH}
            fill="#292929"
            fillOpacity={0.9}
            stroke="#979797"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </motion.span>
    </span>
  );
}
