# operit-plugin-dev-pro

Operit 插件开发（手机端加强版）——官方 `SandboxPackage_DEV` 的实战增强层。

> 本目录是 [operit-plugin-dev-skill](https://github.com/liqiming-whu/operit-plugin-dev-skill) 仓库的一部分（`skills/operit-plugin-dev-pro/`），与 PC 版 `skills/operit-plugin-dev-skill/` 共享同一份维护源。本 README 只描述本 Skill 自身。

## 这是什么

官方 `SandboxPackage_DEV` skill 负责"**怎么写**"（类型定义、官方示例、工具脚本 / ToolPkg 格式），但缺少 Android 手机端的实战执行层。本 Skill 补上"**在手机端怎么开发、调试、烧录、排障**"：

| 层 | 内容 | 来源 |
|---|---|---|
| **格式层** | 类型定义、官方示例、工具脚本/ToolPkg 格式指南 | 官方 SandboxPackage_DEV（引用，不重复维护） |
| **执行层** | `/sdcard` 工作区准备、`operit_editor` 调试安装、真机验证、部署核验 | **本 Skill（scripts/ + references/）** |
| **经验层** | Compose DSL 规则、排障方法、CMS/CME 案例证据 | **仓库级维护源（shared/references/）** |

经验内容来自 CMS（Character Memory System）v1.6.x → v2.3.x 与 CME（Character Memory Engine）v2.x 开发战役的真实踩坑与解决过程——mount 风暴、bridge 响应错配、冷启动 ANR、UI 转圈竞态、异步渲染、时区体系、配置持久化，全部有实验实锤（见 `references/CASE_STUDIES_CMS_CME.md`，有版本范围，采用前必须验证）。

## 前置要求

- Operit app 已安装并启用官方 `SandboxPackage_DEV` skill（types / examples / 官方 guide 从那里获取）。
- 手机端开发依赖 `operit_editor` 包（调试安装、环境变量、包开关）。

## 使用方式

### 手机端（Operit app）

将 `skills/operit-plugin-dev-pro/` 放入 `/sdcard/Download/Operit/skills/`，开发插件时加载本 skill。开发时同时使用官方 `SandboxPackage_DEV` 与 Pro 增强层：

- 官方技能：最新格式、types、内置示例、API、发布流程。
- 本 Skill：工作区准备、调试安装、真机验证、复杂故障定位。

### 桌面端

PC 开发请使用同仓库的 `skills/operit-plugin-dev-skill/`（桌面版），或阅读仓库主 `README.md`。

## 目录结构

```text
skills/operit-plugin-dev-pro/
├── README.md
├── SKILL.md                          # 技能主文件（定位 + 流程 + 规则分级 + 资源导航）
├── agents/
│   └── openai.yaml                   # Agent 配置
├── references/
│   ├── MOBILE_WORKFLOW.md            # 手机端完整工作流（更新→准备→编写→检查→安装→核验）
│   ├── COMPOSE_DSL_RULES.md          # 共享：Compose DSL 规则（仓库级维护源同步）
│   ├── DEBUG_PLAYBOOK.md             # 共享：按症状组织的排障流程（仓库级维护源同步）
│   └── CASE_STUDIES_CMS_CME.md       # 共享：CMS/CME 历史案例（仓库级维护源同步）
└── scripts/
    ├── prepare_dev_workspace.js      # 创建工作区并同步官方 types
    ├── inspect_package.js            # 静态检查普通包或 ToolPkg 目录
    └── verify_deployment.js          # 检查开发源与外部安装产物
```

> `references/` 中带「共享」标记的三份文档由仓库级 `shared/references/` 统一维护，修改后运行 `node scripts/sync-shared-references.mjs` 同步，不要直接改本目录的分发副本。

## 权威来源

- Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`。
- 手机端执行路径与故障定位依据：本 Skill 的 `references/MOBILE_WORKFLOW.md` 与 `DEBUG_PLAYBOOK.md`。
- 实战经验来源：CMS/CME 开发战役（见 `references/CASE_STUDIES_CMS_CME.md`，有版本范围，采用前必须验证）。
