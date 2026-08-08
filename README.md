# operit-plugin-dev-skill

用于指导开发 Operit app 插件的统一技能仓库（**唯一权威，统一维护**）。

## 包含的技能

本仓库同时维护两个 skill，**内容同一套文档（`Operit插件开发指南.md` + `Operit插件开发踩坑记录.md`），按使用环境区分**：

- [skills/operit-plugin-dev-skill/](skills/operit-plugin-dev-skill/) — **PC / 桌面端版**：在任意桌面环境（Windows / macOS / Linux）指导开发 Operit 插件，以官方 ToolPkg 为范例，使用与官方 app 协调的 Compose DSL UI（MaterialTheme），正确注册侧边栏入口并使用官方 Operit API。不依赖 Operit app 内嵌工具。
- [skills/operit-plugin-dev-pro/](skills/operit-plugin-dev-pro/) — **Android 手机端版（operit-plugin-dev-pro）**：官方 `SandboxPackage_DEV` 的实战增强，内置 CMS/CME 血泪踩坑记录与前端工程实践指南，手机端开发插件时优先使用。前置依赖官方 `SandboxPackage_DEV`（格式层）。

## 使用方式

- **PC 端**：将 `skills/operit-plugin-dev-skill/` 目录作为任意 Agent skill 使用，详见其 [README](skills/operit-plugin-dev-skill/README.md)。
- **Android 端**：将 `skills/operit-plugin-dev-pro/` 目录放入 `/sdcard/Download/Operit/skills/`（本地已安装），开发插件时加载本 skill 即可。

## 维护策略（2026-08-08 确立）

- **本仓库是唯一维护源**。两份实战文档（开发指南 + 踩坑记录）只在 `skills/operit-plugin-dev-skill/references/` 维护，改完同步复制到 `skills/operit-plugin-dev-pro/references/`。
- **独立仓库 `operit-plugin-dev-pro` 已停止维护**（原 github.com/liqiming-whu/operit-plugin-dev-pro）：文档与本地安装均改从本仓库同步，不再单独发版。
- 内容更新走本仓库 PR/commit，然后同步本地 `/sdcard/Download/Operit/skills/` 安装目录。

## 权威来源

Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`。
