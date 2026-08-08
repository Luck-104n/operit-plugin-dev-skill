# operit-plugin-dev-pro

> ⚠️ **本仓库已停止独立维护（2026-08-08 起）**。
> 内容与 [operit-plugin-dev-skill](https://github.com/liqiming-whu/operit-plugin-dev-skill) 重复，统一以 operit-plugin-dev-skill 仓库为唯一权威（`skills/operit-plugin-dev-pro/` 目录即本技能，文档在其 `references/` 同步维护）。
> 本地安装：从 operit-plugin-dev-skill 仓库同步到 `/sdcard/Download/Operit/skills/operit-plugin-dev-pro/`。本仓库仅保留归档。

---

Operit 插件开发（手机端加强版）——官方 `SandboxPackage_DEV` 的实战增强。

## 这是什么

官方 `SandboxPackage_DEV` skill 负责"**怎么写**"（类型定义、官方示例、工具脚本 / ToolPkg 格式），但缺少实战经验层。本仓库补上"**怎么不踩坑**"：

| 层 | 内容 | 来源 |
|---|---|---|
| **格式层** | 类型定义、官方示例、工具脚本/ToolPkg 格式指南 | 官方 SandboxPackage_DEV（引用，不重复维护） |
| **实战层** | 开发铁律、前端工程实践、血泪踩坑记录、架构建议 | **本仓库（references/）** |

内容来自 CMS（Character Memory System）v1.6.x → v1.8.4 与 CME（Character Memory Engine）v2.x 开发战役的真实踩坑与解决过程——mount 风暴、bridge 响应错配、冷启动 ANR、UI 转圈竞态、时区体系、配置持久化，全部有实验实锤。

## 包含的技能

- [skills/operit-plugin-dev-pro/](skills/operit-plugin-dev-pro/) — **Operit 插件开发技能（手机端加强版）**：内置十条开发硬规则、排障方法论、CME 架构建议与两份实战参考文档。

## 使用方式

### 手机端（Operit app）

将 `skills/operit-plugin-dev-pro/` 放入 `/sdcard/Download/Operit/skills/`，开发插件时加载本 skill 即可。

前置要求：官方 `SandboxPackage_DEV` skill 已安装（types / examples / 官方 guide 从那里取）。

### 桌面端

参考本仓库的 `references/` 文档，与 [operit-plugin-dev-skill](https://github.com/liqiming-whu/operit-plugin-dev-skill) 配合使用。

## 目录结构

```text
operit-plugin-dev-pro/
├── README.md
├── .gitignore
└── skills/
    └── operit-plugin-dev-pro/
        ├── SKILL.md                          # 技能主文件（铁律摘要 + 资料地图 + 方法论）
        └── references/
            ├── Operit插件开发指南.md          # 开发原则、前端工程实践、架构建议
            └── Operit插件开发踩坑记录.md      # 全部真实踩坑与解决过程
```

## 权威来源

- Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`
- 实战经验来源：CMS/CME 开发战役（见踩坑记录）
