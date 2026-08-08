# Operit 安卓工具的 PC 等价操作

| 官方手机端动作 | PC 操作 | 说明 |
|---|---|---|
| `download_file` 下载/更新技能资料 | `node scripts/sync-official.mjs --operit-root <path>` | 直接从本地官方仓库同步，无网络和 Operit 宿主依赖。 |
| `grep_code` | `rg -n "pattern" <paths>` | 先检索再读取命中片段。 |
| `read_file_part` | shell 的分段读取能力 | PowerShell 可用 `Get-Content` 配合 `Select-Object -Skip/-First`。 |
| Operit 文件写入工具 | Agent 的工作区文件编辑能力 | 只修改当前任务范围内文件。 |
| `debug_run_sandbox_script` | `tsc` + `validate-package.mjs`；需要运行时行为则用 ADB | PC 不能可靠模拟 QuickJS、`Tools.*` 和 Java bridge。 |
| `debug_install_js_package` | `tools/adb/execute_js*` 或在 Operit UI 导入 | 选择命令取决于单文件、目录入口和顶层脚本模式。 |
| `debug_install_toolpkg` | `tools/toolpkg/debug_toolpkg.bat|sh|py` | 官方桌面工具会打包、推送并广播安装。 |
| `use_package` | 无桌面等价调用 | 这是 Operit 宿主内的包加载能力；只能在 App 中验证。 |

## 能力边界

桌面端可以确认语法、类型、manifest 引用、归档结构和确定性的纯函数逻辑。下列行为必须在 Operit 宿主中验证：

- `Tools.*` 的真实返回结构、权限和 Android 路径；
- Java/Kotlin bridge、QuickJS 兼容性和宿主注入全局；
- Compose DSL 渲染、主题、生命周期与事件回调；
- ToolPkg 注册、hook 顺序、超时和消息 bridge；
- 安装、启用、重载以及不同 Operit 版本的行为。

不要用 Node mock 的成功结果宣称插件已通过 Operit 运行时验证。Mock 只适合纯业务逻辑单元测试，并应与宿主适配层分离。
