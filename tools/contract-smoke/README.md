# 升级体检（contract-smoke）

Magic 插件不 `import` 任何 `@deepseek-ai/dsh-*` 包，而是用手写结构化类型声明自己需要的
`ctx` 能力，靠 Cordis 依赖注入拿宿主服务。后果是：**DSH 上游改了字段名 / 服务名，
Magic 编译不报错、测试不失败，只在运行时炸。**

本工具把这种"静默失效"变成**升级时立刻报错**。零第三方依赖，纯 Node 直跑，
不安装 DSH、不 import 任何 `@deepseek-ai/*` 包。

## 怎么跑

```bash
# 默认：自动定位仓库根（../../）下的 plugins/ 与 reference-project/deepseek-harness/
node check.mjs

# 自定义路径（CI / 不同 checkout 布局时）
node check.mjs --plugins /path/to/plugins --dsh /path/to/deepseek-harness

# 自检：证明"改坏就失败、正确不误报"
node selftest.mjs
```

退出码：`0` = 体检通过；`1` = 存在 FAIL（升级前必须修复）。WARN 不会让退出码非 0。

## 检什么

体检对 `plugins/*/` 下每个插件做三类静态检查（静态 = 不加载 DSH 运行时）：

1. **插件元数据完整性**：每个插件必须有 `package.json`（含 `name` / `main` /
   `dsh.bundle.patch`）和 `cordis.patch.yml`；且 `cordis.patch.yml` 里 `insert` 的
   `name` 必须等于包名。
2. **`inject` 服务名可用性**：抽 `export const inject = [...]` 的服务名，与"宿主实际
   提供的服务集合"比对。来源 = DSH 的 `declare module '@deepseek-ai/cordis' { interface
   Context { ... } }` 字段名 ∪ DSH 的 `xxx.provide('yyy', ...)` 注册名 ∪ 其他 Magic
   插件的 `provide` 名（例如 `magicWorkMode` 由 `magic-work-mode` 提供、被 `magic-ceo`
   注入，属插件间契约，不应误判为缺失）。
3. **`ctx` 成员使用面核查**：扫 `plugins/*/src` 里的 `ctx.<member>`，逐个检查其是否
   在宿主契约面里存在。核心 Cordis API（`effect` / `on` / `provide` 等）永远可用，不
   视为可被上游改名的服务。

> 说明：任务的"与 DSH 提供的服务名集合比对"在落地时**额外纳入了 Magic 插件间互相
> `provide` 的服务名**，否则 `magicWorkMode` 这类插件间契约会被误报为缺失。这正是护栏
> 应抓的边界，故这样设计更准。

## 怎么读结果

报告按 `FAIL → WARN → PASS` 排序，每条带 `[插件名]`、消息与文件:行号。例如：

```
✗ FAIL [magic-ceo] inject "magicWorkMode" 在 DSH 与其他 Magic 插件中均未找到 …
✓ PASS [magic-ceo] inject "tools" 在宿主可用 (来源: dsh-declared) (src/index.ts)
```

- **FAIL**：契约在宿主契约面里找不到 —— 上游改名或遗漏注册会让插件静默不激活 /
  运行时炸。升级前必须修。
- **WARN**：插件目录存在但元数据不完整（如另一个子代理正在并行创建该插件）。体检
  不崩溃、继续检查其余插件，仅作提示。
- **PASS**：契约已验证可用，并标注来源（`dsh-declared` / `dsh-provided` / `magic-plugin`
  / `core-cordis`）。

## 负向测试（selftest）

`selftest.mjs` 用 `fixtures/` 下的样例证明护栏有效：

- `fixtures/broken/`：一份故意改坏的插件（inject 混入不存在的 `notARealService`，
  并把 `ctx.storageDomain` 拼成 `ctx.storageDoman`）。体检**必须**对它 FAIL。
- `fixtures/good/`：一份合法插件。体检**必须** PASS（验证无假阳性）。
- 对真实插件集跑体检也**必须** PASS（再次确认无假阳性）。

若 `selftest.mjs` 退出码非 0，说明护栏失效，需修 `check.mjs`。

## 红线与约定

- 本目录（`tools/contract-smoke/**`）是 W5 独占产出；不修改 `plugins/**`、
  `docs/**`、`reference-project/**`、根 `package.json`、`pnpm-lock.yaml`。
- 不执行 `pnpm install`；不 import `@deepseek-ai/dsh-*`。
- 若发现内核约定本身有问题，只在报告里写明，不自行改接口或文档。
