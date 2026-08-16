# operit-plugin-dev-skill

用于指导开发 Operit app 插件的统一技能仓库（**唯一权威，统一维护**）。

## 包含的技能

本仓库维护两个按运行环境区分的 Skill，并共享一套 Compose DSL 规则、排障方法和案例证据：

- [skills/operit-plugin-dev-skill/](skills/operit-plugin-dev-skill/) — **PC / 桌面端版**：从本地 Operit 官方仓库同步 guides、完整类型和示例索引，指导开发普通 Sandbox Package 与 ToolPkg，并提供静态校验、跨平台打包和可选 ADB 真机验证。不依赖 Operit app 内嵌工具。
- [skills/operit-plugin-dev-pro/](skills/operit-plugin-dev-pro/) — **Android 手机端增强版**：与官方 `SandboxPackage_DEV` 配合，负责 `/sdcard` 工作区、`operit_editor` 调试安装、Compose DSL 生命周期、真机探针与部署排障；CMS/CME 内容作为有版本范围的案例证据保留。

## 使用方式

- **PC 端**：将 `skills/operit-plugin-dev-skill/` 目录作为 Agent skill 使用；正式开发前运行其中的 `scripts/sync-official.mjs --operit-root <Operit仓库>`。
- **Android 端**：安装并启用官方 `SandboxPackage_DEV`，再将 `skills/operit-plugin-dev-pro/` 放入 `/sdcard/Download/Operit/skills/`；开发时同时使用官方技能与 Pro 增强层。

## 权威来源

Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`。

## 共享参考资料维护

`COMPOSE_DSL_RULES.md`、`DEBUG_PLAYBOOK.md`、`CASE_STUDIES_CMS_CME.md`、`COMPLEX_UI_ARCHITECTURE.md`、`TERMINAL_CALL_RULES.md` 在 PC 与 Android Pro 两个 Skill 中使用同一份维护源：
```text
shared/references/
├── COMPOSE_DSL_RULES.md          # UI/异步规则（证据等级）
├── COMPLEX_UI_ARCHITECTURE.md    # 复杂 UI 架构设计规范（核心：决策表、薄壳+WebView 分层、硬边界）
├── TERMINAL_CALL_RULES.md        # 终端调用约束（核心：两个入口、运行期零依赖、禁 hiddenExec）
├── DEBUG_PLAYBOOK.md             # 按症状排障流程
└── CASE_STUDIES_CMS_CME.md       # 有版本范围的历史案例
```
只编辑 `shared/references/` 中的源文件，不直接修改两个 Skill 内的同名分发副本。修改后运行：
```powershell
node scripts\sync-shared-references.mjs
```
该脚本将五份文档同步到 `skills/operit-plugin-dev-skill/references/` 和 `skills/operit-plugin-dev-pro/references/`，保证 PC 与 Android Pro 的公共规则、核心架构/终端规范、排障方法和案例证据一致。PC 专属流程维护在 `DESKTOP_WORKFLOW.md`，Android 专属流程维护在 `MOBILE_WORKFLOW.md`。

提交前可只检查副本是否漂移，不改写文件：

```powershell
node scripts\sync-shared-references.mjs --check
```
