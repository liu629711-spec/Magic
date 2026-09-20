// 启用/停用开关（2026-09-19 用户裁定，样式取自用户提供的 Uiverse switch txt）：
// 槽 #313033 → 选中 #3a4b39；旋钮 #aeaaae → 选中 #84da89；选中位移 20px。
// role=switch 供测试与无障碍定位。
export function ToggleSwitch({ checked, onChange, title, disabled }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled === true}
      onClick={() => onChange(!checked)}
      className="relative inline-block h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-default disabled:opacity-40"
      style={{ backgroundColor: checked ? "#3a4b39" : "#313033" }}
    >
      <span
        aria-hidden
        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform duration-300"
        style={{
          backgroundColor: checked ? "#84da89" : "#aeaaae",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}
