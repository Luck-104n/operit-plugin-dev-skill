# Operit 插件开发技能（SandboxPackage_DEV）

在任意桌面环境（Windows / macOS / Linux + Claude Code）指导开发 Operit app 插件的 Claude Code skill。

- 以**官方 ToolPkg** 为范例（参考 Operit 仓库 `examples/` 下官方插件源码）。
- 使用与官方 app **协调的 Compose DSL UI**（`ctx.MaterialTheme.colorScheme`，而非硬编码十六进制色）。
- **正确使用官方 Operit API**（`ToolPkg.registerToolboxUiModule` / `registerNavigationEntry` / `registerUiRoute` / `registerDesktopWidget` 等）。
- 支持在 app **侧边栏注册入口**（surface `main_sidebar_plugins`）。
- 可在任意工作目录使用，不依赖 Operit app 内嵌工具。

## 目录结构

```
SandboxPackage_DEV/
├── SKILL.md                          # 技能主文档（使用说明与开发指导）
├── references/
│   ├── SCRIPT_DEV_GUIDE.md           # 脚本开发指南（离线回退副本）
│   └── TOOLPKG_FORMAT_GUIDE.md       # ToolPkg 格式/打包指南（离线回退副本）
└── .gitignore
```

## 使用方式

将本目录作为 Claude Code skill 使用：

1. 在 Claude Code 中引用本技能（`SandboxPackage_DEV`）。
2. 按 SKILL.md 第 1 节确认定位与原则。
3. 按 SKILL.md 第 2 节获取 Operit 权威资料：**开发前先询问用户本地是否已有 Operit 仓库**（由用户提供路径）；没有则从官方仓库 clone：
   ```bash
   git clone https://github.com/AAswordman/Operit.git
   ```
4. 按 SKILL.md 第 3-4 节开发 UI 与注册入口。
5. 按 SKILL.md 第 6 节打包（规范见 `references/TOOLPKG_FORMAT_GUIDE.md` 第 4 节），只打包必要文件。

## 权威来源

- Operit 源码 / API 最终权威：官方 GitHub 仓库 `https://github.com/AAswordman/Operit`
- 本地 `references/` 两份 guide 为**离线回退副本**，与上游冲突时以上游为准。
- 打包规范权威版：Operit 仓库 `docs/TOOLPKG_FORMAT_GUIDE.md`。

## 维护

- 更新类型 / 工具链参考：`git pull` 官方仓库（网络受限时按全局代理规则设置代理），再重新参考 `examples/types/`。
- 禁止手动零散修补 `references/`；需要时整体替换。
