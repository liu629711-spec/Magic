/**
 * 从 stitch code.html 的 Tailwind theme.extend 抽出 JSON。
 * 视觉权威：code.html + screen.png；DESIGN.md 正文不作为约束。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../..");
const htmlPath = path.join(
  repoRoot,
  "stitch_codex_ui_clone",
  "codex_01_stream_autonomous_flow",
  "code.html",
);

const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
if (!match) {
  throw new Error(`tailwind.config 未在 ${htmlPath} 中找到`);
}

const config = new Function(`return (${match[1]})`)();
const extend = config?.theme?.extend;
if (!extend?.colors) {
  throw new Error("theme.extend.colors 缺失");
}

const outDir = path.join(appRoot, "src", "theme");
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, "tailwind-extend.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(extend, null, 2)}\n`);

const lines = [":root {"];
for (const [name, value] of Object.entries(extend.colors)) {
  lines.push(`  --color-${name}: ${value};`);
}
for (const [name, value] of Object.entries(extend.borderRadius ?? {})) {
  const key = name === "DEFAULT" ? "default" : name;
  lines.push(`  --radius-${key}: ${value};`);
}
for (const [name, value] of Object.entries(extend.spacing ?? {})) {
  lines.push(`  --space-${name}: ${value};`);
}
lines.push("}");
fs.writeFileSync(path.join(outDir, "tokens.css"), `${lines.join("\n")}\n`);

process.stdout.write(`wrote ${path.relative(repoRoot, jsonPath)}\n`);
