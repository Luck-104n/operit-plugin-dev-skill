# operit-plugin-dev-skill

用于指导开发 Operit app 插件的统一技能仓库（**唯一权威，统一维护**）。

## 包含的技能

本仓库同时维护两个 skill，**内容同一套文档（`Operit插件开发指南.md` + `Operit插件开发踩坑记录.md`），按使用环境区分**：

- [skills/operit-plugin-dev-skill/](skills/operit-plugin-dev-skill/) — **PC / 桌面端版**：在任意桌面环境（Windows / macOS / Linux）指导开发 Operit 插件，以官方 ToolPkg 为范例，使用与官方 app 协调的 Compose DSL UI（MaterialTheme），正确注册侧边栏入口并使用官方 Operit API。不依赖 Operit app 内嵌工具。
- [skills/operit-plugin-dev-pro/](skills/operit-plugin-dev-pro/) — **Android 手机端版（operit-plugin-dev-pro）**：官方 `SandboxPackage_DEV` 的实战增强，内置 CMS/CME 血泪踩坑记录与前端工程实践指南，手机端开发插件时优先使用。**前置要求：官方 `SandboxPackage_DEV` 技能已安装（类型 / 示例 / 官方指南从那里获取）**。

## 使用方式

- **PC 端**：将 `skills/operit-plugin-dev-skill/` 目录作为任意 Agent skill 使用，参见其 [README](skills/operit-plugin-dev-skill/README.md)。
- **Android 端**：将 `skills/operit-plugin-dev-pro/` 目录放入 `/sdcard/Download/Operit/skills/`（本地已安装），开发插件时加载本 skill 即可，参见其 [README](skills/operit-plugin-dev-pro/README.md)。

## 权威来源

Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`。
