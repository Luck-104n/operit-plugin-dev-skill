# Operit 插件排障手册

> 本文件是 PC 与 Android Pro 两个 Skill 的共同维护源。仓库内只编辑 `shared/references/DEBUG_PLAYBOOK.md`，再运行 `node scripts/sync-shared-references.mjs` 生成两个 Skill 的分发副本。

## 通用顺序

1. 精确定义现象、复现步骤、期望结果和实际结果。
2. 记录 Operit 版本、插件版本、packageId、开发环境、设备和权限模式。
3. 从当前 types、官方示例和必要的 Operit 源码确认机制。
4. 建立最小复现；一轮只改变一个变量。
5. 在源代码出口、bridge 前后、UI 入口和最终展示点放置带时间与调用 ID 的探针。
6. 修复原因后删除或关闭会影响时序的探针，再完整复测。

## UI 卡死或重复挂载

- 检查 render/UI 构造过程中是否 setState、写文件、写 env 或调用工具。
- 检查 onLoad 是否因状态变化反复生成不同树。
- 统计单位时间 render/onLoad 次数，不凭体感判断。
- 把数据获取与 UI 生成分开，先验证最小静态页面。

## 异步完成但 UI 不刷新

- 证明后台操作确实完成，不把“结果已落盘”和“UI 已收到结果”混为一谈。
- 比较同步事件回调、onLoad 内 await、脱离事件后的 Promise 三种路径。
- 检查完成信号是否写在已结束的 callRuntime 上。
- 根据当前版本探针决定刷新机制，不直接套用旧版 onLoad 长窗口方案。

## 工具无响应或返回错位

- 给每次调用使用不同的可识别参数和结果标记。
- 先串行建立正确基线，再逐步增加并发。
- 同时记录调用开始、结束、参数摘要、结果摘要和异常。
- 若并发触发错配，保留最小复现和版本信息；业务代码对相关调用串行化。

## 安装后仍是旧代码

- 确认编辑的是实际开发目录，而非技能示例或解压临时目录。
- 检查 manifest version、main 路径和目标代码标记。
- 检查外部 packages 目录中对应 `.toolpkg` 的存在与时间。
- UI、注册和 hook 变化后重启 Operit，再复测真实入口。
- 有权限时才进一步检查应用私有缓存；不要把无法读取缓存误报为缓存不存在。

PC 端优先使用官方 `tools/toolpkg/debug_toolpkg.*` 的日志和外部安装包；Android 端优先使用 `operit_editor:debug_install_toolpkg` 的结构化结果。两条路径最后都必须回到真实 UI 或真实工具调用验证。

## worker 启动失败或拖慢 UI

- 区分可执行文件不存在、环境探测超时、进程启动失败和 readiness 未完成。
- readiness 使用有上限的轮询，并记录每次失败原因；不要只固定 sleep 一个经验值。
- UI 路径不应无限同步等待 worker。明确加载、取消和重试状态。
- 宿主退出可能终止其子进程，但具体行为需在当前设备、权限与启动方式验证。
- 简单插件优先移除 worker，而不是为其增加复杂保活机制。

## `debug_run_sandbox_script` 与真实环境不一致

该工具适合验证纯 JS、参数解析和部分 API 探针，不代表已安装包、真实工具调用或 Compose DSL 生命周期。出现差异时，以真实包入口的日志和结果为准。

PC 端同样不要用 Node mock 宣称已验证 Android QuickJS、`Tools.*`、Java/Kotlin bridge 或 Compose DSL。桌面 mock 只验证纯业务逻辑和适配层输入输出。
