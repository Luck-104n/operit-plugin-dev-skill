# 复杂 UI 架构设计与证据等级
> 本文件是 PC 与 Android Pro 两个 Skill 的共同维护源。仓库内只编辑 `shared/references/COMPLEX_UI_ARCHITECTURE.md`，再运行 `node scripts/sync-shared-references.mjs` 生成两个 Skill 的分发副本。
> 范本：官方 `sidebar_account_book`（薄 Compose 壳 + UI.WebView + web_runtime + 本地 Web 服务 + 前端）；2026-08-16 依官方 examples 源码整理，叠加 CME/Hermes 实机教训。

## 平台不变量：复杂 UI 的边界

### 什么时候需要复杂 UI 架构（决策表）
| 场景 | 建议 | 原因 |
|---|---|---|
| 1-2 屏、简单表单、列表 <100 条 | 纯 Compose DSL | 平台渲染上限内，成本最低 |
| 多 Tab、长列表、频繁筛选/编辑、图表、富文本 | 薄壳 + WebView 架构 | 绕开 120s action 窗口与 Compose 重建限制，交互交给浏览器 |
| 需要 AI 直接读写数据 | 额外提供 packages/ 工具面 | Web 给人用，工具面给 AI 用，同一数据源两条路 |

判断标准：Compose 侧维护状态超过 3~5 个且相互联动、或单屏元素超过展示规模边界（约 100 条）时，就该上 WebView 架构。不要默认复杂。

### 官方分层（sidebar_account_book 范本）
```
main.ts（薄注册壳）
├── ToolPkg.registerUiRoute(...)          # 注册 UI 路由（compose_dsl）
├── ToolPkg.registerNavigationEntry(...)  # 注册侧边栏入口
├── packages/account_book_core.ts          # 工具面：数据 CRUD，AI 可调用
└── shared/account_book_web_runtime.ts     # Web 服务生命周期：ensure/health/进度
    └── ui/bookkeeping_dashboard/index.ui.ts  # Compose 薄壳：状态机 + UI.WebView
        └── 本地 Web 服务（node server.cjs）    # 托管页面 + /api/health
            └── 前端（web assets）              # 复杂交互全部在浏览器里
```
职责边界：
- Compose 薄壳只做三件事：注册入口、管理 Web 服务启动状态机、渲染 WebView；不做业务 UI。
- web_runtime 只做一件事：幂等确保 Web 服务可用（health 检查 → 复用/启动 → 等待健康 → 返回 URL），全程上报进度。
- 本地 Web 服务：`nohup` 后台进程 + 固定端口 + `/api/health`；PID 写入文件便于管理。
- 工具面与 Web 前端共享同一数据权威，不做两套存储。

## 当前版本约束：先验证再固化

### Compose 薄壳状态机
至少包含 `idle → checking → deploying → starting → ready → error`，外加 `forceRestart`（重装/恢复）与 `reloadToken`（WebView 强制刷新）两个控制量。官方实测 `serverUrl` + `reloadToken` + 进度 + 错误 + 覆盖层可见性，5 个 state 就够。启动流程必须进 action 窗口（onLoad / 按钮 action 里 `await` 保持订阅窗口到健康确认），期间用进度覆盖层挡住空白。

### WebView 参数按官方范本
`key` 带 `reloadToken`（换 key = 强制重建）、`fillMaxSize`、`javaScriptEnabled`、`domStorageEnabled`；`onPageStarted/onProgressChanged/onPageFinished/onReceivedError` 全部接到状态机（加载百分比 + 失败提示），不要把 WebView 当黑盒。首帧 getEnv 不可用：用 setEnv 缓存上次 serverUrl，onLoad 先显示"恢复上次会话"再走 ensure。启动失败给错误文案 + 「重试 / 强制重启」（forceRestart），不白屏。

### web_runtime 幂等 + 进度 + 诊断
- ensure 先 `readHealth(port)`，健康直接返回 `{status:"running", url, ...}` 复用；只有 `force_restart` 才停旧起新，防止每次打开页面都重启服务。
- 进度事件阶段化上报（官方：检查 8 → 停止旧服务 12 → 部署资源 54 → 校验依赖 58 → 装依赖 74 → 启动 82 → 等健康 90 → 100），UI 进度条与文案一一对应。
- 失败返回结构化诊断：`logTail`、`missingDependencies`、`installExitCode`、`sessionId` 全部带回，UI 直接展示而不是猜。
- 启动投递轻提交：terminal 会话里一次性提交 `nohup ... & echo $! > pid`（毫秒级返回），重活（装依赖、等健康）在 JS 侧轮询，不在终端里同步等。

## 项目策略：硬边界（违反即返工）
1. **部署/恢复入口必须留在 Compose 壳**，不能只依赖 Web 页面（服务挂了就永远无法恢复——自举死锁）。
2. **Web 服务运行期必须脱离 terminal 生命周期**：`nohup setsid` 启动、健康以 HTTP 为准、PID 文件管理；不要学「把服务进程挂在 terminal session 下长期托管」的写法——Operit/proot 会话回收会整树 kill（CME 2026-08-08 实锤）。terminal 只做投递 + 健康确认。详见 `TERMINAL_CALL_RULES.md`。
3. **不回退 hiddenExec**：启动探测一律 visible terminal / exec，hiddenExec 已被证实可制造跨重启坏会话。
4. **Web 服务与工具面共享同一数据权威**：不做两套存储；旧 API 至少保留一个发布周期再迁移。

## 与 COMPOSE_DSL_RULES 的关系
纯 Compose 场景遵守 `COMPOSE_DSL_RULES.md`（渲染纯净、action 窗口、串行 callTool 等）。薄壳 + WebView 场景下，Compose 侧业务交互被浏览器接管，剩余 Compose 代码只剩状态机与 WebView——此时两条规则集同时适用：壳内状态机仍受 COMPOSE_DSL_RULES 约束，进程与资源受本文件与 TERMINAL_CALL_RULES 约束。
