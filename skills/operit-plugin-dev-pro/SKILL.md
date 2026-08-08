---
name: operit-plugin-dev-pro
description: Operit 插件开发（手机端加强版）——官方 SandboxPackage_DEV 的实战增强：内置 CMS/CME 血泪踩坑记录与前端工程实践指南，开发插件时优先使用本 skill。
---

# operit-plugin-dev-pro

## 定位

官方 `SandboxPackage_DEV` 的加强版。分工互补：

| 层 | 内容 | 来源 |
|---|---|---|
| **格式层** | 类型定义、官方示例、工具脚本/ToolPkg 格式指南（怎么写） | 官方 SandboxPackage_DEV |
| **实战层** | 铁律清单、前端工程实践、血泪踩坑、架构建议（怎么不踩坑） | **本 skill（references/）** |

手机端开发插件：**用这一个 skill 就够了**——官方管格式，本 skill 管实战。

## 依赖与前置

- 官方 `SandboxPackage_DEV` 必须已安装（types / examples / 两份 guide 从那里取，**不在此重复维护**）。
- 每次正式开始新的开发任务前，按官方 SKILL.md 第一部分重跑安装脚本，更新 types 与官方 guide。

## 资料地图（按需查阅，不整读）

| 场景 | 查什么 | 位置 |
|---|---|---|
| 工具脚本写法 / METADATA / 参数 / 返回结构 | SCRIPT_DEV_GUIDE.md | 官方 `references/` |
| ToolPkg manifest / UI / 注册 / hook | TOOLPKP_FORMAT_GUIDE.md（即 TOOLPKG_FORMAT_GUIDE.md） | 官方 `references/` |
| 类型定义 | types/*.d.ts | 官方 `types/`（开发时复制到 `dev_package/types/`） |
| **实战铁律（动手前必读）** | Operit插件开发指南.md | **本 skill `references/`** |
| **排障对照（出问题时必查）** | Operit插件开发踩坑记录.md | **本 skill `references/`** |

## 开发硬规则（铁律前置摘要，完整版见《开发指南》）

1. **render() 必须无副作用**——禁止在 render 中写文件、setEnv、callAPI、setState；数据流单向：用户行为 → 业务逻辑 → 状态变化 → 渲染。
2. **异步事件处理器必须返回 Promise**——不要在事件回调中直接调用异步函数而丢弃其返回值（异常被吞、状态永不更新）。
3. **所有 ctx.callTool 统一串行队列**——禁止 Promise.all 并发依赖返回顺序（bridge 会错配响应，实测错配率 90%→2% 靠串行根治）。
4. **模块级变量不可靠**——每次挂载重新 require，boot 锁/缓存/防重入必须挂 state 或 setEnv。
5. **高频事件必须 debounce / throttle / batch**——每次 setState 都可能触发整屏 XML 重建，不做限流会渲染风暴（实测 1 分钟 45+ 次重绘）。
6. **删除/修改用乐观更新**——立即更新 UI，后台执行，失败恢复；不报错、不卡顿。
7. **缓存 + TTL**——角色数据 5s、列表数据 30s；首帧读缓存秒开；**失败不缓存空**。
8. **大列表不要一次渲染**——分页 / 虚拟列表 / lazy load / 搜索优先。
9. **前端职责限制**——前端只做展示、轻量交互、状态触发、用户确认；复杂数据操作统一交给后端 Python worker（CME 架构验证：重计算下沉后 UI 永不卡）。
10. **工具调用在依赖离线时必须快速失败**——不能同步阻塞等待（阻塞会拖死主线程、堵平台回调队列，冷启动 ANR 与 UI 转圈的共同根因）。

## 排障方法论（《踩坑记录》第八节）

1. **先澄清现象定义**——"空加载"=有 UI 没条目，"不恢复"=加载失败后一直空；定义错了方向全错。
2. **打探针，不猜**——工具出口 OUT bytes 直写文件、前端入口 IN bytes 打日志，四点定位（工具出口→bridge→JS 入口→UI props）。
3. **分层定位**——render 层 → 生命周期 → 数据链 → bridge，逐层排除。
4. **守卫防御 + 治本**——守卫（失败不覆盖旧数据）保证不恶化，治本（串行队列/纯函数/快速失败）消灭根因。
5. **一轮一个变量**——每个版本只改一件事，用 log 验证，失败就换假设。
6. **外部审计**——把 log + 分析报告给独立视角审阅，往往能提出关键实验设计。

## 架构建议

复杂插件（记忆系统、检索、批量分析）推荐 CME 架构：**前端专注 UI，重计算下沉独立 Python worker**（本地数据库 + 词嵌入 + 语义检索），独立进程隔离重负载，前端只做转发与展示。对比 CMS 前端集中式架构，稳定性和可维护性都显著更好。

注意 worker 场景的平台事实（踩坑记录 11.x 已实锤）：
- 退出 app → Operit 被杀 → proot 连带被杀 → **worker 必死**，启动流程必须幂等、自动。
- worker 冷启动慢（模型加载 4-5s），拉起后要**轮询 ping**（每 2s 最长 10-15s），不要固定 sleep 3s。
- 环境探测失败先分清"没有"还是"超时"。
- 插件 API 配置用 `ctx.setEnv/getEnv` 是平台级持久化（shared_prefs），卸载重装不清除；大 JSON 缓存不要塞 env（会膨胀到 90KB+，每次读写序列化整个 XML）。

## 开发目录与流程

- 开发目录：`/sdcard/Download/Operit/dev_package/{packageId}/`（types 复制到兄弟目录 `dev_package/types/`，不放进包内）。
- 优先普通 JS 包脚本；需求涉及配置界面/工具箱/hook/lifecycle 时才升级 ToolPkg。
- 基于已有包继续开发必须沿用原 packageId，在原有文件结构上修改。
- 拿不准的接口先用 `operit_editor:debug_run_sandbox_script` 做最小片段验证。

## 发布

按官方 `SandboxPackage_DEV` 第三部分执行：路线 A（本地打包直接上传）或路线 B（仓库维护 + 引用 GitHub Release）。
