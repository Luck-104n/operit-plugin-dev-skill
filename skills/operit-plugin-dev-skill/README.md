# Operit 插件桌面开发技能

在 Windows、macOS 或 Linux 上开发与官方格式一致的 Operit Sandbox Package / ToolPkg，不依赖 Operit App 内的专属工具。

## 能力

- 从本地 Operit 官方仓库同步最新 guides、完整类型和示例索引。
- 指导普通脚本、Compose DSL UI、导航、桌面小组件和宿主 hooks 开发。
- 校验普通包 METADATA、ToolPkg manifest 引用和 `.toolpkg` 归档结构。
- 使用纯 Node.js 跨平台打包，不要求把 `.toolpkg` 当作 `.zip` 交给特定压缩命令。
- 通过 Operit 官方 ADB 工具完成可选真机验证。

## 目录

```text
operit-plugin-dev-skill/
├── SKILL.md
├── agents/openai.yaml
├── examples/index.json
├── references/
│   ├── DESKTOP_WORKFLOW.md
│   ├── PC_TOOL_EQUIVALENTS.md
│   ├── COMPOSE_DSL_RULES.md
│   ├── DEBUG_PLAYBOOK.md
│   └── CASE_STUDIES_CMS_CME.md
├── scripts/
│   ├── sync-official.mjs
│   ├── validate-package.mjs
│   └── pack-toolpkg.mjs
└── types/*.d.ts
```

## 更新官方资料

```powershell
node scripts\sync-official.mjs --operit-root D:\Operit
```

最终权威始终是所指定 Operit 仓库的当前源码。桌面静态检查不能替代 Android QuickJS、Compose DSL、Java bridge 或 `Tools.*` 的真机验证。

## 公共参考资料

`COMPOSE_DSL_RULES.md`、`DEBUG_PLAYBOOK.md` 和 `CASE_STUDIES_CMS_CME.md` 与 Android Pro Skill 使用仓库级同一维护源 `shared/references/`。不要直接修改本目录中的三个分发副本；在仓库根目录修改源文件后运行：

```powershell
node scripts\sync-shared-references.mjs
```
