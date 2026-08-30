# OpenCode 架构拆解工具助手

本工具助手配合 `opencode_architecture_prompt.md` 使用，服务于 `D:\Harmess\opencode` 的现状取证、静态分析、安全实验和报告生成。工具输出是证据，不是结论；每次运行都要记录 commit、命令、package、时间和结果。

## 1. 安全边界

- 只读 OpenCode 源码、项目文档、测试和脱敏配置元数据；不读取 `.env` 的值、私钥、token、生产数据、真实用户会话和敏感日志。
- 不修改源码、lockfile、migration、测试、构建配置或数据库；报告写入 `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`。
- 外部模型、网络、Git、shell、文件写入和删除实验必须 mock 或使用临时目录；先确认绝对路径在实验目录内。
- 不为了“证明支持”而绕过权限、审批、沙箱或取消逻辑；发现安全问题只记录复现条件和影响。

## 2. 静态扫描工具

| 目标 | 建议工具与动作 | 输出 |
|---|---|---|
| 仓库树 | `rg --files`、按 package 分组的目录扫描，排除 `.git`、构建产物和依赖目录 | 实际文件边界、统计口径 |
| 版本基线 | `git status`、`git rev-parse HEAD`、`git branch --show-current`、读取根 package/lock 和 package manifest | commit、分支、版本、运行时 |
| TypeScript 符号 | TypeScript Compiler API、ts-morph 或现有 CodeGraph；提取 export/import、class/function/type、调用者/被调用者 | 符号表、调用图、动态边界 |
| API/schema | 扫描 server route/handler、protocol schema、client 生成物和测试 | method/path、请求响应、错误和版本 |
| 数据库 | 读取 Drizzle schema、migration、journal、repository/projector | 表、字段、索引、迁移顺序、事务边界 |
| 事件 | 扫描 event type、publish/emit、subscribe/listen、replay/fold 和序列号 | 事件 schema、发布订阅链路、重放规则 |
| 依赖 DAG | package manifest + import graph；检测反向依赖、循环、动态导入和生成代码 | package DAG 和循环依赖 |
| 风险 | 定向扫描 TODO/FIXME、命令执行、路径拼接、网络请求、密钥日志、裸 catch、未处理 Promise、重试和并发共享状态 | 文件/符号级风险清单 |

扫描开始前先生成全部 workspace package 台账，并为每个 package 记录 P0/P1/P2/排除、负责人、读取的 `AGENTS.md`、证据状态和未决项。台账不完整时不得宣称全仓拆解完成。

优先使用 AST/CodeGraph 回答“谁定义、谁调用、改动影响谁”；只有查询字面量、注释、日志和文档内容时使用文本搜索。不要把正则命中当成调用关系。

## 3. 测试与实验

### 基线检查

- 先读取对应 package 及上级目录适用的 `AGENTS.md`，再执行该 package 自己声明的 `typecheck`、unit/integration、protocol/API 或 smoke 脚本。
- 根目录不直接假设有统一测试入口；报告中记录实际命令和退出结果。
- 修改公共 Protocol 或 Server HttpApi 后只记录需要在 `packages/client` 执行的生成流程，不在本次现状拆解中改生成物。

### V2 Session 最小实验

优先复用仓库已有 fake provider、测试 fixture 和 runner。若现有测试无法覆盖，可在仓库外临时目录建立不修改工作树的隔离 harness；无法建立时标记“无法执行”，不得伪造结果。覆盖：正常 prompt、重复 prompt、并发 prompt、admission 拒绝、工具等待、审批通过/拒绝、question、stop、cancel、timeout、retry、resume、进程重启后 replay、断点重连和 EventV2 去重。逐项记录输入 ID、输出事件、持久化快照、最终状态及副作用。

### HTTP/SSE/WebSocket 实验

使用本地隔离 server 和假数据，验证认证边界、HTTP 错误 schema、事件顺序、序列号、重连参数、断点续传、重复事件、乱序事件、连接关闭、背压和取消。实验不得连接生产 endpoint 或使用真实凭据。

### 工具副作用实验

让 fake tool 在临时目录执行“无副作用返回、写文件后失败、写文件后取消、重复调用、超时、审批拒绝”，观察是否有 tool call 记录、事件、恢复语义、幂等键和文件变更审计。shell/Git/网络能力默认 mock；若必须真实执行，使用一次性目录和固定无害命令。

## 4. Mermaid 校验

报告中至少校验 package DAG、进程拓扑、prompt-to-tool 时序、session 状态机、事件 replay 和持久化关系图。用 Mermaid CLI 或 Markdown 预览检查语法；节点名称使用稳定的 package/symbol 名，实线表示代码/测试证据，虚线表示推断，并在图下列证据路径。

## 5. 记录模板

```text
实验 ID：
commit：
环境与 package：
命令/入口：
隔离目录或 mock：
输入与前置条件：
观察到的调用、事件、持久化和副作用：
结果：通过 / 失败 / 不适用 / 无法执行
证据级别：静态代码 / 仓库已有测试 / 仓库外隔离 harness / 真实本地进程
证据路径或测试名：
限制与后续核查：
```

## 6. 完成检查

- [ ] 版本、commit、运行时和 package 范围已锁定。
- [ ] 全仓 package 均已标记 P0/P1/P2/排除，且排除理由可复核。
- [ ] 根目录和所有适用的子目录 `AGENTS.md` 已读取并记录。
- [ ] 模块清单、符号调用图和依赖 DAG 有证据。
- [ ] `packages/schema` 已作为 P0 主链核查，V1/V2/Legacy/Experimental/生成客户端兼容矩阵已完成。
- [ ] API/schema、事件、数据库和 migration 已分别提取。
- [ ] Legacy/EventV2/SSE/WebSocket/PTY/live-only 与各数据域已分层建账。
- [ ] V1/V2 Session、admission、execution、runner 和 replay 已核查。
- [ ] 工具审批、取消、重试、恢复和文件副作用至少有静态或隔离实验依据。
- [ ] 测试命令和结果可复现，失败没有被写成成功。
- [ ] 报告区分代码事实、文档声明、测试、实机、推断和建议。
- [ ] 负能力矩阵和未读取/未执行/剩余未知台账已完成。
- [ ] Magic 映射没有把 OpenCode 内部对象直接当成 Magic 产品对象。
- [ ] 没有泄露敏感配置或真实用户数据。
