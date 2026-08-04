---
name: operit-plugin-dev-skill
description: 在任意桌面环境（Windows/macOS/Linux）指导开发 Operit 插件：以官方 ToolPkg 为范例，使用与官方 app 协调的 Compose DSL UI（MaterialTheme），正确注册侧边栏入口并使用官方 Operit API。
---

# operit-plugin-dev-skill

## 第 1 节：技能定位与原则

本技能用于指导在**任意桌面工作目录**下为 Operit app 开发插件（Sandbox Package / ToolPkg）。与 Operit app 内嵌 AI 协作开发不同，本技能不依赖 `operit_editor` 等 Operit app 专属工具，直接在桌面完成源码编写、编译与静态检查。

核心原则：

1. **参考官方插件实现**，而非第三方/社区插件。官方插件源码在 Operit 仓库的 `examples/` 下（目录型 ToolPkg，含 `src/main.ts`、`src/ui/**/index.ui.ts`、`dist/` 编译产物）。仓库获取方式见第 2 节（先问用户本地路径，无则 clone）。
2. **UI 与官方 app 协调**：使用 Compose DSL + `ctx.MaterialTheme.colorScheme`（官方 Material 主题 token），**不要硬编码十六进制颜色**。
3. **正确使用官方 API**：注册入口用 `ToolPkg.registerToolboxUiModule` / `registerNavigationEntry` / `registerUiRoute` / `registerDesktopWidget` 等官方注册函数，不凭记忆猜 API。
4. **任意工作目录**：技能不绑定特定工作区。开发时可在当前工作目录直接创建 `src/`、`manifest.json`、`ui/` 等结构。
5. 编译与静态检查在桌面完成；真机验证（若可用 adb 连接装有 Operit app 的安卓设备）是可选步骤，不强制。

## 第 2 节：权威资料引用（如何获取 Operit 权威资料）

Operit 源码与 API 的**最终权威**是官方 GitHub 仓库：`https://github.com/AAswordman/Operit`。本地不假定存在该仓库镜像。

**获取方式**：

- **开发前先询问用户**：本机是否已有 Operit 本地仓库？若有，**由用户提供路径**，不要自行查找或猜测路径。得到路径后可直接使用，并按需 `git pull` 更新（网络受限时按全局代理规则设置代理环境变量）。
- **仅当用户确认本地没有** Operit 仓库时，才从官方仓库 clone（按全局代理规则设置代理）：
  ```bash
  git clone https://github.com/AAswordman/Operit.git
  ```
- 冲突时一律以上游仓库最新源码与类型定义为准。

**查阅优先级**（从权威到回退）：

1. 本地 Operit 仓库（clone 后）`examples\types\` —— 权威类型定义（25 个 `.d.ts`）。推荐顺序：
   - `index.d.ts`：全局入口，定义 `Tools`、`complete`、`toolCall`、`getEnv`、`getLang`、`getState`、`Java`/`Kotlin` 桥、`Icons` 等。
   - `core.d.ts`、`java-bridge.d.ts`：运行时与桥接接口。
   - `results.d.ts`：常见返回结构。
   - `compose-dsl.d.ts`：Compose DSL UI 组件与类型（1216 行，UI 开发必查）。
   - `compose-dsl.material3.generated.d.ts`：Material 3 生成组件（`Divider`、`Scaffold`、`NavigationBar`、`TabRow` 等）。
   - `material-icons.d.ts`：`Icons` 图标常量定义。
   - `toolpkg.d.ts`：ToolPkg 注册 API（`registerToolPkg`、`registerUiRoute`、`registerNavigationEntry`、`registerToolboxUiModule`、`registerDesktopWidget`、各类 hook）。
   - `software_settings.d.ts`：设置类能力。
2. 本地 Operit 仓库 `examples\{官方包源码}` —— 官方插件实现范例，第一手材料：
   - `sidebar_account_book\src\`：完整 Compose DSL UI + 侧边栏注册范例。
   - `desktop_widget_demo\src\`：`UI.Card` 卡片 + 桌面小组件注册范例。
   - `message_insert\src\`：消息处理/Prompt hook 官方范例。
3. 官方仓库 `docs\SCRIPT_DEV_GUIDE.md`、`docs\TOOLPKG_FORMAT_GUIDE.md` —— 官方格式指南（权威版）。
4. 本技能 `references\TOOLPKG_FORMAT_GUIDE.md` —— 打包规范参考，与官方仓库 `Operit\docs\TOOLPKG_FORMAT_GUIDE.md` 一致。脚本规范参考 `references\SCRIPT_DEV_GUIDE.md`。**两者均为离线回退副本，与上游冲突时以上游为准。**

**查阅方式**：用通用工具检索，不依赖 Operit app 专属命令。用 `grep`（或项目内 grep 工具）在 `examples\types\` 搜关键字，再用文件读取工具读取命中片段。不要默认整读大文件（如 `compose-dsl.d.ts`、`toolpkg.d.ts`），避免撑爆上下文。官方包源码若不确定结构，先列目录再按需读取。

## 第 3 节：官方 UI 模式（与官方 app 协调的核心）

官方 UI 使用 **Compose DSL**（声明式，运行时 `runtime: "compose_dsl"`）。UI 模块是默认导出一个 `Screen(ctx)` 函数的文件，入口在 `src/ui/<模块>/index.ui.ts`。

### 3.1 常用组件（来自官方 compose-dsl.d.ts + compose-dsl.material3.generated.d.ts）

组件分两层注册：基础层 `ComposeUiFactoryRegistry`（`compose-dsl.d.ts`）+ Material 3 生成层 `ComposeMaterial3GeneratedUiFactoryRegistry`（`compose-dsl.material3.generated.d.ts`）。

**基础层组件**（`compose-dsl.d.ts`）：

```
UI.Column  UI.Row  UI.Box  UI.Spacer  UI.Surface
UI.Text  UI.Markdown  UI.TextField  UI.Button  UI.IconButton  UI.Icon
UI.Switch  UI.Checkbox  UI.Card  UI.SnackbarHost  UI.Canvas  UI.WebView
UI.LazyColumn  UI.LinearProgressIndicator  UI.CircularProgressIndicator
```

**Material 3 生成层组件**（`compose-dsl.material3.generated.d.ts`，按需选）：

- 布局：`UI.LazyRow`、`UI.Scaffold`、`UI.BoxWithConstraints`
- 按钮：`UI.ElevatedButton`、`UI.FilledTonalButton`、`UI.OutlinedButton`、`UI.TextButton`、`UI.FloatingActionButton`、`UI.FilledIconButton` 等
- 卡片：`UI.ElevatedCard`、`UI.OutlinedCard`
- 分割线：`UI.Divider`、`UI.HorizontalDivider`、`UI.VerticalDivider`
- 列表项：`UI.ListItem`
- 图标/开关：`UI.IconToggleButton`、`UI.RadioButton`
- 图片：`UI.Image`
- 菜单/弹窗：`UI.DropdownMenu`、`UI.Snackbar`、`UI.TimePickerDialog`
- 进度：`UI.PullToRefreshBox`
- 文本：`UI.BasicText`、`UI.ProvideTextStyle`
- Chip：`UI.AssistChip`、`UI.FilterChip`、`UI.InputChip`、`UI.SuggestionChip` 等
- 导航：`UI.NavigationBar`、`UI.NavigationRail`、`UI.Tab`、`UI.TabRow` 系列

> 注意：`Slider` 不在官方组件清单中，不要使用。不确定某个组件是否存在时，先 grep 本地 Operit 仓库的 `examples/types/compose-dsl*.d.ts` 再写。

### 3.2 主题协调（必须用 MaterialTheme）

取色用 `ctx.MaterialTheme.colorScheme`，**不要硬编码十六进制**。官方示例实际使用的 token（可靠）：

```
colors.primary            // 主色（按钮、选中、进度条）
colors.surface            // 表面色（卡片、内容背景）
colors.onSurface          // 主文本色
colors.onSurfaceVariant   // 次级文本色
colors.error              // 错误/警示色
```

文本样式用 Material 文本风格：`titleLarge` / `titleMedium` / `titleSmall` / `bodyLarge` / `bodyMedium` / `bodySmall` / `labelMedium` / `labelSmall`。

### 3.3 最小 UI 模块模板

```ts
// src/ui/demo/index.ui.ts
import type { ComposeDslContext, ComposeNode } from "../../types/compose-dsl";

export default function Screen(ctx: ComposeDslContext): ComposeNode {
  const { UI } = ctx;
  const colors = ctx.MaterialTheme.colorScheme;
  const [count, setCount] = ctx.useState("count", 0);

  return UI.Column(
    { fillMaxSize: true, padding: 16, spacing: 12 },
    [
      UI.Text({
        text: "示例页面",
        style: "titleLarge",
        color: colors.onSurface,
      }),
      UI.Text({
        text: `计数：${count}`,
        style: "bodyMedium",
        color: colors.onSurfaceVariant,
      }),
      UI.Button({ text: "点击 +1", onClick: () => setCount(count + 1) }),
    ]
  );
}
```

要点：

- `ctx.useState(key, initial)` 做状态管理；`ctx.useMemo`、`ctx.useRef` 可用。
- 布局参数：`fillMaxSize` / `fillMaxWidth`、`padding` / `paddingHorizontal` / `paddingVertical`、`spacing`、`contentAlignment`。
- 初始化逻辑放 `UI.Box({ onLoad: async () => { ... } })`。
- 列表用 `UI.LazyColumn({ fillMaxSize: true, padding, spacing }, [...])`。
- 参考官方 `sidebar_account_book\src\ui\bookkeeping_dashboard\index.ui.ts`（含加载态 overlay、WebView、进度条）与 `desktop_widget_demo\src\ui\widget_demo\index.ui.ts`（卡片列表）。

### 3.4 正反对比（UI 是否协调）

- ✅ 正确：`color: colors.primary`、`containerColor: colors.surface`、`color: colors.onSurfaceVariant`
- ❌ 错误：`color: "#4CAF50"`、`color: "#2196F3"` 这类硬编码十六进制 —— 与官方 app 主题脱节，深浅色模式下会不协调

## 第 4 节：官方注册 API（含 app 侧边栏注册入口）

ToolPkg 通过 `main` 入口脚本（`src/main.ts` → 编译 `main.js`）里的 `registerToolPkg()` 函数注册各项能力。**注册 API 名以本地 Operit 仓库的 `examples/types/toolpkg.d.ts` 为准**。

### 4.1 侧边栏注册（官方推荐 + 本项目现行方式）

在 app 侧边栏注册入口，用 `registerToolboxUiModule` + `registerNavigationEntry`（surface `main_sidebar_plugins`）+ `registerUiRoute` 三件套：

```ts
// src/main.ts
import demoDashboard from "./ui/demo/index.ui.js";

const DEMO_ROUTE = "toolpkg:com.operit.my_plugin:ui:demo_dashboard";

export function registerToolPkg(): boolean {
  // 1) 注册工具箱 UI 模块
  ToolPkg.registerToolboxUiModule({
    id: "demo_dashboard",
    runtime: "compose_dsl",
    screen: demoDashboard,
    params: {},
    title: { zh: "示例", en: "Demo" },
  });

  // 2) 注册 UI 路由（route 形如 toolpkg:<toolpkg_id>:ui:<id>）
  ToolPkg.registerUiRoute({
    id: "demo_dashboard",
    route: DEMO_ROUTE,
    runtime: "compose_dsl",
    screen: demoDashboard,
    params: {},
    title: { zh: "示例", en: "Demo" },
  });

  // 3) 在 app 主侧边栏挂入口
  ToolPkg.registerNavigationEntry({
    id: "demo_dashboard_nav",
    route: DEMO_ROUTE,
    surface: "main_sidebar_plugins",   // 或 "toolbox"
    title: { zh: "示例", en: "Demo" },
    icon: "memory",                    // Material 图标名（官方用 Icons.Book 等常量）
    order: 50,
  });

  return true;
}
```

字段要点（来自 toolpkg.d.ts）：

- `ToolboxUiModuleRegistration`：`id`、`runtime`（默认 `compose_dsl`）、`screen`（必填）、`params`、`title`、`keepAlive`。
- `UiRouteRegistration`：`id`、`route`/`routeId`、`runtime`、`screen`（必填）、`params`、`title`、`keepAlive`。
- `NavigationEntryRegistration`：`id`、`route`、`surface`（`"toolbox"` | `"main_sidebar_plugins"`）、`title`、`icon`、`order`。

### 4.2 桌面小组件

`ToolPkg.registerDesktopWidget({ id, route, render, title, subtitle, description, icon, order })`。官方范例 `desktop_widget_demo\src\main.ts`：注册一个完整 route + 一个渲染 route，widget 的 `render` 指向渲染 route。

### 4.3 生命周期 / 消息 / Prompt hooks（官方 API 名）

- `registerAppLifecycleHook({ id, event, function })` —— `event`：`application_on_create`、`application_on_foreground`、`activity_on_resume` 等。
- `registerMessageProcessingPlugin({ id, function })`
- `registerXmlRenderPlugin({ id, tag, function })`
- `registerInputMenuTogglePlugin({ id, function })`
- Prompt 相关：`registerPromptInputHook`、`registerPromptHistoryHook`、`registerPromptFinalizeHook`、`registerSummaryGenerateHook`、`registerSystemPromptComposeHook`、`registerToolPromptComposeHook` 等。
- 官方消息处理范例：`message_insert\src\`。

每个 hook 的参数字段以 `toolpkg.d.ts` 中对应 `*HookRegistration` 接口为准，不确定时先 grep 再写。

## 第 5 节：脚本 / 包开发流程

### 5.1 普通 Sandbox Package（JS/TS 脚本）

脚本结构：

- 顶部 `/* METADATA {...} */` 声明 `name`、`display_name`、`description`、`category`、`env`、`tools`（每个 tool 含 `name`/`description`/`parameters`）。
- IIFE 封装逻辑，`exports.xxx = ...` 导出工具。
- 全局可用：`Tools`（Files/Net/System/SoftwareSettings/UI/FFmpeg/Tasker/Workflow/Chat/Memory/calc）、`complete(result)`、`toolCall()`、`getEnv(key)`、`getLang()`、`getState()`、`Java`/`Kotlin` 桥。
- 所有 `Tools.*` 调用是异步的，需 `await`。

**方案选择优先级**（沿用官方指南规则）：

1. 默认优先写普通 JS 包脚本，不要一上来就选 ToolPkg。
2. 只有需求明确涉及：配置界面、工具箱页面、宿主级 hook（lifecycle/prompt/message/xml）、桌面小组件、侧边栏入口时，才升级为 ToolPkg。
3. 少量配置项优先用参数或 `env`，不要默认为了配置加 UI。

### 5.2 ToolPkg（含 UI）开发

目录结构（参考官方包 `sidebar_account_book\` / `desktop_widget_demo\`）：

```
<包目录>/
├── manifest.json          # toolpkg_id / main / version / display_name / description / subpackages / resources
├── src/
│   ├── main.ts            # registerToolPkg() + 各注册函数
│   └── ui/
│       └── <模块>/
│           └── index.ui.ts  # Screen(ctx) 默认导出
├── dist/                  # tsc 编译产物（main.js、ui/**/index.ui.js）
├── packages/              # 子包脚本（可选）
├── resources/             # 资源（可选）
├── i18n/                  # 国际化（可选）
└── tsconfig.json
```

**TS 编译**：

- 官方 tsconfig 关键项：`module: commonjs`、`target: es2020`、`moduleResolution: node`、`esModuleInterop: true`、`skipLibCheck: true`、包级 `outDir: "./dist"`。
- `typeRoots` 指向工作区兄弟层级的 `types/`（例如包内 `"typeRoots": ["../types"]`，`include` 含 `"./**/*.ts"`、`"../types/**/*.d.ts"`）。
- TS 模块引用必须用 `import` / `export`，禁止 `/// <reference path="...">` 或 `require(...)` 组织模块。
- 编译：`npx tsc -p <包>/tsconfig.json` → 产出 `dist/main.js`、`dist/ui/**/index.ui.js`。
- 需要权威 types 时，从本地 Operit 仓库的 `examples/types/` 复制到工作区 `types/`（包目录兄弟层级），不要放进包内。

### 5.3 真机验证（可选）

若可用 adb 连接装有 Operit app 的安卓设备，可选用本地 Operit 仓库 `tools\` 下的桌面工具链做真机验证：

- `tools\adb\execute_js.bat <js> <函数名> <参数json>`：单文件执行导出函数，等结构化结果 JSON。
- `tools\adb\execute_js_dir.bat`：目录入口 + `require(...)` 多文件场景。
- `tools\adb\run_sandbox_script.bat`：顶层脚本模式。
- `tools\toolpkg\debug_toolpkg.py <包目录|.toolpkg>`：打包 ToolPkg 并广播安装到设备（需 Python 3）。

无真机时，以「tsc 编译通过 + 对照官方同型源码人工核对」作为验证手段，并明确告知未真机验证。

## 第 6 节：打包与发布

### 6.1 打包

打包规范以本技能 `references\TOOLPKG_FORMAT_GUIDE.md` 第 4 节「创建 ToolPkg」为准（本项目 `docs\reference\TOOLPKG_FORMAT_GUIDE.md` 同源；权威版在官方仓库 `Operit\docs\TOOLPKG_FORMAT_GUIDE.md`）。

- 普通 JS 包：直接交付 `.js` 文件。
- ToolPkg：包目录（`manifest.json` + `main.js` + `packages/`/`ui/`/`resources/`/`i18n/` 按需）→ 打包为 zip → 重命名为 `.toolpkg`。Windows PowerShell：`Compress-Archive -Path <包>\* -DestinationPath <包>.toolpkg`。
- **只打包包运行所需的必要文件**：`manifest.json`、编译后的 `main.js`、`packages/`、`ui/`、`resources/`、`i18n/`。
- **不打包不相关文件**：`.git/`、`node_modules/`、`*.ts` 源码（`main.ts`/`index.ui.ts`，除非有意保留）、`tsconfig.json`、`dist/` 之外的多余编译中间物、README、`.gitignore`、临时文件、本技能目录本身。打包前先检查目录内容，只纳入运行必需项。

### 6.2 发布（两条市场路线）

**路线 A：本地打包并直接上传** —— 只完成当前插件的构建与 Operit 发布页面上传，不要求创建/维护 Git 仓库。

**路线 B：仓库维护并引用 GitHub Release** —— AI 持续维护插件仓库（源码、manifest、构建脚本、依赖清单、`.gitignore`、版本与 Release）。先与用户确认仓库公开程度与许可证；公开仓库独立分享、可被 clone、协作与获得 star，市场条目是其中一个分发入口。每次发布构建资产、更新版本、整理提交与 tag、在 GitHub 手动创建 Release（Release 创建者必须是 Operit 登录的 GitHub 账号，资产与本地文件一致），再在 Operit 发布页引用该 Release 资产。

### 6.3 开源仓库与倒卖

若用户担心插件被复制/转售，正面应对：选择合适许可证并在 README/源码/Release 保留署名与仓库链接；把官方仓库、Release、市场条目互相链接，持续发布版本说明；长期维护让原始项目成为最可信来源。不承诺"绝不会被倒卖"。

## 第 7 节：故障排查与路径兼容（Windows 注意）

1. **路径分隔符**：`cmd`/bat 用反斜杠（`tools\adb\execute_js.bat`），git bash / Claude Code Bash 用正斜杠（`tools/adb/execute_js.sh`）。
2. **types 缺失/过时**：本地工作区 types 从本地 Operit 仓库的 `examples/types/` 复制；上游更新后 `git pull` 再重新参考。禁止手动零散修补。
3. **tsc 未安装**：`npx tsc` 需 Node.js；`npm i -g typescript` 或项目内 `devDependencies`。
4. **METADATA 格式错误**：工具没出现通常是 METADATA 块语法或 `tools[].parameters[].type` 写错。
5. **注册 API 名错误**：注册不生效先 grep 本地 Operit 仓库的 `examples/types/toolpkg.d.ts` 核对函数名与字段。
6. **UI 不协调**：检查是否用了硬编码十六进制色，改为 `ctx.MaterialTheme.colorScheme` token。
7. **编译产物没加载**：确认 `manifest.json` 的 `main` 指向 `dist/main.js`，且 `main` 导出 `registerToolPkg`。
