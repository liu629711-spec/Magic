---
name: Autonomous Engineering OS
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.02em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes an ultra-premium, high-craft dark developer environment engineered for high-agency human-in-the-loop autonomous engineering. Combining the surgical precision of modern development environments with the fluidity of next-generation orchestration interfaces, the design language communicates unyielding reliability, computational speed, and absolute state clarity.

The aesthetic philosophy centers on **Technical Minimalism with Layered Tonal Depth**. Information density is optimized for parallel telemetry: terminal outputs, AST transforms, dynamic execution graphs, and file diffs. Interactions feature micro-feedback loops—translucent status badges, sub-pixel borders, and status-driven luminescence—evoking the tactile feedback of hardware instrumentation while maintaining frictionless developer ergonomics.

## Colors

The palette leverages an obsidian-to-carbon step architecture, maximizing foreground legibility and minimizing eye fatigue during prolonged operations.

### Canvas & Surface Hierarchy
- **Base Canvas (`#0b0b0d`)**: Deep pitch obsidian. Anchors the primary window substrate.
- **Panel / Sidebar (`#121316`)**: Sleek carbon for primary navigators, execution logs, and activity trees.
- **Elevated Surfaces / Modals (`#18191e`)**: Targeted elevation for command palettes, popovers, and inspector cards.
- **Code & Diff Canvas (`#0f1013`)**: Dedicated high-contrast workspace for editor windows and syntax rendering.

### Border & Delimiter Tokens
- **Surface Border Default**: `rgba(255, 255, 255, 0.08)` for structural separation without heavy visual weight.
- **Surface Border Focus / Active**: `rgba(255, 255, 255, 0.16)` paired with primary focus rings.
- **Subtle Partition**: `rgba(255, 255, 255, 0.04)` for internal list dividers.

### Semantic & Operational Accents
- **Primary Execution Accent (`#3b82f6`)**: Electric Blue for execution triggers, selections, and primary telemetry indicators.
- **Agent Indigo (`#6366f1`)**: Secondary accent denoting autonomous reasoning steps, model generation phases, and tool-call loops.
- **Agent Active / Passing (`#10b981`)**: Emerald glow indicating passing suites, verified builds, and healthy daemon processes.
- **Diff Additions**: `#22c55e` foreground with `rgba(34, 197, 94, 0.12)` fill.
- **Diff Deletions**: `#ef4444` foreground with `rgba(239, 68, 68, 0.12)` fill.
- **Human Approval / Intervention (`#f59e0b`)**: Amber beacon demanding developer consensus, authorization locks, and non-blocking warnings.

### Text Contrast Tiers
- **Text Primary (`#f3f4f6`)**: High-contrast pure white for headings, active code, and interactive controls.
- **Text Secondary (`#9ca3af`)**: Muted slate for secondary metadata, descriptions, and passive parameters.
- **Text Tertiary / Meta (`#6b7280`)**: Low-emphasis gray for line numbers, timestamps, and path prefixes.

## Typography

The typographical engine pairs the structural clarity of **Inter** with the terminal density of **JetBrains Mono**.

### Structural Rationale
- **Headlines & Interface Labels (Inter)**: Applied strictly to structural UI, column headers, window navigation, and control surface triggers. Inter keeps navigation anchors human and approachable while conserving horizontal real estate.
- **Execution Output, Code & Metadata (JetBrains Mono)**: Applied to event streams, diff lines, parameters, commit hashes, and code blocks. Featuring ligatures, strict tabular figures, and balanced glyph metrics, it ensures optical alignment across multi-line diff blocks and execution timelines.
- **Tabular Figures**: Numeric outputs, status counters, and memory metrics must render with `font-variant-numeric: tabular-nums` to prevent visual jitter during real-time compilation and streaming.

## Layout & Spacing

The workspace uses a dense, compact 8px base grid with 4px micro-steps (`space-xs`), maximizing contextual visibility without horizontal crowding.

### Screen Partition Architecture
The primary interface uses a 3-column dock layout:
1. **Navigation & Agent Tree (Left)**: Fixed width of `260px`, collapsible to `48px` icon rail. Hosts active repository context, workflow runs, and background thread indices.
2. **Execution & Reasoning Timeline (Center)**: Fluid width (`min 480px`). Streams the active agent plan, tool calls, bash executions, and human intervention checkpoints.
3. **Diff, Terminal & Inspection Dock (Right)**: Fluid width (`min 520px`). Renders side-by-side or unified patch diffs, integrated runtime logs, and performance telemetries.

### Density Rules
- Internal toolbars and command headers maintain a rigid height of `36px` (`2.25rem`).
- Log lines and execution row heights are locked to multiples of `20px` or `24px`.
- Dividers between dock panels are `1px` structural gutters with hit targets expanded via invisible `4px` padding overlays.

## Elevation & Depth

Visual depth avoids heavy, muddy drop shadows in favor of **Tonal Layering** and **Luminescent Edges**.

### Surface Depths
- **Level 0 (Recessed - `#0b0b0d`)**: Root backdrop and passive viewport regions.
- **Level 1 (Substrate - `#121316`)**: Sidebars and non-focused workspace panels with a single `1px solid rgba(255, 255, 255, 0.08)` border.
- **Level 2 (Active Canvas - `#18191e`)**: Floating tool palettes, context menus, and active card panels. Enhanced with:
  - `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)`
- **Level 3 (Overlays & Command Palette)**: Centered interaction surfaces with backdrop-filter:
  - `background: rgba(24, 25, 30, 0.85)`
  - `backdrop-filter: blur(12px)`
  - `box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14)`

### Luminescent State Indicators
Active states use localized light blooms rather than broad elevation shadows:
- **Agent Running**: `0 0 12px rgba(99, 102, 241, 0.35)`
- **Tests Passing**: `0 0 10px rgba(16, 185, 129, 0.3)`
- **Intervention Required**: `0 0 14px rgba(245, 158, 11, 0.35)`

## Shapes

The interface embraces a strict technical radius (`roundedness: 1`). Controls and containers use tight corners to preserve the structured character of developer tooling.

### Geometry Token Specs
- **Base Element Corner (`rounded`, 0.25rem / 4px)**: Standard buttons, input bars, code diff rows, terminal tabs, and action icons.
- **Container / Card Corner (`rounded-lg`, 0.5rem / 8px)**: Modals, elevated cards, command centers, and segmented panel groups.
- **High-Order Dialogs (`rounded-xl`, 0.75rem / 12px)**: Primary application popovers and system-level configuration overlays.
- **Status Pills**: Fully circular pills (`9999px`) reserved exclusively for micro-status indicators, line additions/deletions, and model tag chips.

## Components

### Buttons & Trigger Controls
- **Primary Action**: Solid `#3b82f6` fill, `#ffffff` typography, `rounded` (4px), `px-3 py-1.5`, label-md Inter. Hover: brightness transition to `#2563eb` with micro-glow.
- **Secondary / Ghost Action**: Transparent fill, `1px solid rgba(255, 255, 255, 0.08)`, `#f3f4f6` text. Hover: `background: rgba(255, 255, 255, 0.05)`, border shifts to `rgba(255, 255, 255, 0.16)`.
- **Human Approval / Danger Button**: Amber/Red tinted state: `background: rgba(245, 158, 11, 0.1)`, `1px solid rgba(245, 158, 11, 0.3)`, text `#f59e0b`. Active state shifts to solid fill on critical locks.

### Status Chips & Pills
- **Diff Metric Chips**: Monospace capsule badges (`body-sm`). Green addition (`+1506`) styled with `rgba(34, 197, 94, 0.15)` fill and `#22c55e` text; Red deletion (`-16`) with `rgba(239, 68, 68, 0.15)` fill and `#ef4444` text.
- **Terminal Execution Badges**: Pill container (`px-2 py-0.5`), JetBrains Mono `0.6875rem`, subtle `1px solid rgba(255, 255, 255, 0.08)`. Features an animated pulsing indicator dot (`6px`) for executing tasks.

### Code Diff & Review Rows
- **Line Structure**: Multi-column tabular layout (Line number, gutter marker `+`/`-`, code content).
- **Addition Row**: `background: rgba(34, 197, 94, 0.08)`; hover: `rgba(34, 197, 94, 0.14)`. Gutter delimiter colored `#22c55e`.
- **Deletion Row**: `background: rgba(239, 68, 68, 0.08)`; hover: `rgba(239, 68, 68, 0.14)`. Gutter delimiter colored `#ef4444`.
- **Syntax Highlighting**: Tuned for high contrast over dark obsidian canvas with desaturated keywords and luminous variables.

### Input Fields & Command Palettes
- **Inline Query / Prompt Bar**: `#121316` surface, inset shadow, `1px solid rgba(255, 255, 255, 0.1)`. Focus: border color `#3b82f6` with `0 0 0 1px #3b82f6`. Placeholder text `#6b7280`.
- **Command Palette (`CMD+K`)**: Floating overlay, Level 3 elevation, Inter headline search field with monospaced keyboard navigation tags (`KBD` badges with `border: 1px solid rgba(255, 255, 255, 0.15)`).

### Checkboxes & Approval Toggles
- **Toggles**: Compact `14px x 14px` squares with `rounded` (2px). Default border `rgba(255, 255, 255, 0.2)`. Selected state fills `#3b82f6` with white vector check mark.
- **Intervention Checkpoint Cards**: `#18191e` surface framed with `border-left: 3px solid #f59e0b`. Includes reasoning preview, proposed file modifications, and explicit "Reject" / "Accept & Execute" split actions.