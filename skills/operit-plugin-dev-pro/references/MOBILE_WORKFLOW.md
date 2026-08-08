# 手机端开发工作流

## 1. 更新官方技能

每个正式开发任务开始前，按官方 `SandboxPackage_DEV/SKILL.md` 重新下载并运行 `install_or_update.js`。更新完成后确认至少存在：

```text
/sdcard/Download/Operit/skills/SandboxPackage_DEV/
├── SKILL.md
├── examples/packages/
├── references/
└── types/
```

## 2. 准备工作区

通过 `operit_editor:debug_run_sandbox_script` 运行：

```json
{
  "source_path": "/sdcard/Download/Operit/skills/operit-plugin-dev-pro/scripts/prepare_dev_workspace.js",
  "params_json": "{\"package_id\":\"com.example.plugin\"}"
}
```

结果应为：

```text
/sdcard/Download/Operit/dev_package/
├── types/
└── com.example.plugin/
```

脚本只覆盖官方共享类型文件，不删除项目文件。基于已有插件继续开发时，先把当前包内容放入项目目录。

## 3. 编写与编译

- 普通包优先写 `.ts`，从官方示例选择相近结构并编译为 `.js`。
- ToolPkg 的 `typeRoots` 与 `include` 指向 `../types`。
- 模块使用 `import`/`export`，不要以 `/// <reference>` 或 `require()` 组织 TypeScript 项目。
- 接口、返回值和 Compose DSL 属性必须从刚同步的 types 核对。

## 4. 静态检查

运行 `inspect_package.js`：

```json
{
  "source_path": "/sdcard/Download/Operit/skills/operit-plugin-dev-pro/scripts/inspect_package.js",
  "params_json": "{\"target_path\":\"/sdcard/Download/Operit/dev_package/com.example.plugin\"}"
}
```

普通 `.js` 文件检查 METADATA 与导出；ToolPkg 目录检查 manifest、main、subpackage、resource 和 wasm 引用。HJSON manifest 只做存在性提示，复杂字段仍需按官方指南人工核对。

## 5. 安装和真实验证

- 普通包使用 `operit_editor` 当前提供的 JS 包安装/调试工具。
- ToolPkg 使用 `debug_install_toolpkg`，`source_path` 可指向目录、manifest 或 `.toolpkg`。
- 安装成功不等于功能成功。必须调用实际工具或打开实际 UI，并检查返回值、界面和日志。
- `debug_run_sandbox_script` 的运行环境与真实包执行路径不同，尤其不能用它证明 `Tools.Files`、bridge 或 Compose DSL 正常。

## 6. 部署核验

运行 `verify_deployment.js` 检查开发源与外部安装目录：

```json
{
  "source_path": "/sdcard/Download/Operit/skills/operit-plugin-dev-pro/scripts/verify_deployment.js",
  "params_json": "{\"package_id\":\"com.example.plugin\",\"source_path\":\"/sdcard/Download/Operit/dev_package/com.example.plugin\"}"
}
```

若修改了 UI、main 注册或 manifest：

1. 核对开发目录内的新版本和目标代码标记。
2. 核对 `/sdcard/Android/data/com.ai.assistance.operit/files/packages/` 中安装产物存在。
3. 重启 Operit，避免仍在运行的实例继续使用内存旧代码。
4. 再打开真实 UI 或调用工具。

应用私有 `toolpkg_cache` 受权限和实现版本影响，不把它作为通用脚本的强制检查项；需要深入排障时结合当前源码、root/Shizuku 权限和日志检查。
