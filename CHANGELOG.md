# Changelog

## 2026-08-09

### 改动范围

- 重构 `operit-plugin-dev-skill`，建立不依赖 Operit Android 专属工具的 PC 开发、校验、打包和 ADB 真机验证流程。
- 同步当前 Operit 官方指南、25 个类型声明以及普通脚本和 ToolPkg 示例索引。
- 新增官方资料同步、Sandbox Package/ToolPkg 校验和跨平台 `.toolpkg` 打包脚本。
- 重构 `operit-plugin-dev-pro`，明确它是官方 `SandboxPackage_DEV` 的手机端增强层，并新增工作区准备、包结构检查和部署核验脚本。
- 将 Compose DSL 规则、排障手册和 CMS/CME 案例拆分为分级资料，并建立 `shared/references/` 单一维护源及双 Skill 同步检查。

### 改动原因

- 原 PC Skill 缺少完整官方类型、示例索引和确定性的桌面校验/打包工具，不能完整替代 Android 内的开发工具链。
- 原 Pro Skill 混合了官方格式规范与 CMS/CME 特定版本经验，部分案例结论被表述为永久平台规则，存在随 Operit 更新而误导开发的风险。
- PC 与 Pro 各自维护相同经验文档，容易产生内容漂移。

### 用户影响

- PC 用户可以仅依赖本地 Operit 官方仓库、Node.js、TypeScript 和可选 ADB 开发官方兼容插件。
- Android 用户继续使用官方 `SandboxPackage_DEV` 获取最新格式和 API，由 Pro Skill 提供手机端执行、安装和排障增强。
- 通用规则、当前版本约束和项目案例被明确分层；Python worker、固定 TTL、全局串行等策略不再无条件应用于所有插件。
- 三份公共文档只需修改仓库级维护源，再运行同步脚本即可同时更新两个 Skill。

### 验证结果

- 所有新增 JavaScript/Node.js 脚本通过 `node --check`。
- `sync-shared-references.mjs --check` 通过，三份公共文档在维护源、PC 和 Pro 中哈希一致。
- PC 与 Pro 两个 Skill 均通过 `quick_validate.py`。
- Operit 官方 `time.js` 与 `sidebar_account_book` 示例通过包校验。
- 三个 Pro Android 脚本通过模拟 Operit 文件 API 的成功路径测试。
- PC Skill 的 25 个类型快照与当前本地 Operit 源码哈希一致。
