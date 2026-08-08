# PC 桌面开发工作流

## 1. 确定权威源码

优先使用用户指定的 Operit 仓库。未指定时只检查当前工作区和常见相邻目录，仍找不到再询问或 clone 官方仓库。记录当前 commit，避免把不同源码版本的 types、示例和工具链混用。

## 2. 同步开发资料

运行：

```powershell
node <skill目录>\scripts\sync-official.mjs --operit-root <Operit仓库>
```

脚本同步两份官方指南、完整 `examples/types` 和示例索引。检查输出中的 types 数量；不要零散复制或手改类型快照。

## 3. 准备项目

普通 Sandbox Package 可直接维护 `.ts`/`.js` 文件。ToolPkg 使用共享 types 作为项目兄弟目录：

```text
workspace/
├── types/
└── com.example.plugin/
    ├── manifest.json
    ├── src/
    ├── dist/
    └── tsconfig.json
```

续写已有插件时保留 packageId、名称、manifest 和目录结构。从当前 Operit 官方示例选择同型项目，不凭空设计 tsconfig。

## 4. 编写与编译

- 普通包先从官方 `SCRIPT_DEV_GUIDE.md` 检索 METADATA、目标工具和返回类型。
- ToolPkg 从 `TOOLPKG_FORMAT_GUIDE.md`、`types/toolpkg.d.ts` 和同型示例核对 manifest 与注册 API。
- Compose DSL 任务按需读取 `COMPOSE_DSL_RULES.md`。
- 使用 `import`/`export` 组织 TypeScript；所有 `Tools.*` 异步调用都要正确等待和记录异常。
- 使用项目自己的 TypeScript 依赖或 `npx tsc -p <tsconfig>` 编译。

## 5. 静态校验和打包

```powershell
node <skill目录>\scripts\validate-package.mjs <package.js|ToolPkg目录>
node <skill目录>\scripts\pack-toolpkg.mjs <ToolPkg目录> --output <文件>.toolpkg
node <skill目录>\scripts\validate-package.mjs <文件>.toolpkg
```

静态检查只能确认语法、METADATA、manifest 引用和归档结构，不能证明宿主运行时行为。

## 6. 真机验证

连接已授权设备后使用 Operit 官方工具：

```powershell
D:\Operit\tools\adb\execute_js.bat <script.js> <exportName> <args-json>
D:\Operit\tools\toolpkg\debug_toolpkg.bat <ToolPkg目录或.toolpkg>
```

macOS/Linux 使用对应 `.sh`。验证真实工具返回、Compose DSL UI、bridge、权限、生命周期、安装刷新和重启行为。发生故障时读取 `DEBUG_PLAYBOOK.md`；只有需要历史实验依据时才读取 `CASE_STUDIES_CMS_CME.md`。
