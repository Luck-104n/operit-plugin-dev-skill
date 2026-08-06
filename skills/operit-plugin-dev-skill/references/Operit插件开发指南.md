# Operit 插件开发指南(针对官方插件制作skill一点补充)

> 适用于 Operit ToolPkg / Compose DSL 插件开发者。

## 一、Operit 插件框架是什么情况

### 1.1 整体结构

一个 Operit 插件（ToolPkg）本质上是一个 ZIP 包：

```
xxx.toolpkg (ZIP)
├── manifest.json          # 元信息：唯一 ID、版本号、工具声明
├── packages/              # 后端工具脚本（JS，可选独立 Python worker）
│   └── xxx.js             # 工具实现，exports.xxx = async function(...) { complete({...}) }
└── ui/                    # 前端 Compose DSL
    └── xxx/screen.js      # Screen(ctx) 渲染入口
```

**前后端通信**：

```
前端 ctx.callTool('pkg:tool', params)
  → bridge（平台转发）
  → 工具脚本执行
  → complete({...}) 回传
  → 前端收到响应对象
```

### 1.2 前端本质：Compose DSL（不是 React）

Operit 前端用 **Compose DSL** 描述 UI：`UI.Column(...)`、`UI.Text(...)`，最终生成 XML 由 Android Compose 渲染。它看起来像 React（声明式、组件、state），但底层机制完全不同。

### 1.3 后端本质：JS 工具脚本（无独立进程）

后端工具就是注册在 manifest 里的 JS 函数，运行在 Operit 的 JS 运行时（QuickJS）里，通过 `Tools.*` API 访问文件、Memory 等能力。也可以扩展独立后端（如 Python worker 进程），但默认模型是**工具脚本**。

## 二、和标准 React 有什么不同？这会导致什么？

| 维度 | React | Operit Compose DSL | 后果 |
|---|---|---|---|
| **渲染机制** | 虚拟 DOM + Fiber 调度，setState 可中断、可批处理、有协调器保护 | XML 生成 + LaunchedEffect 重建；render 期 setState → XML 变化 → LaunchedEffect 重启 → Screen 重新执行 → 再 setState | **render 期 setState = 无限重建循环（mount 风暴），UI 卡死甚至闪退**（v1.6.9 实锤） |
| **状态管理** | useState 有协调器，多次 setState 自动批处理 | state 仅会话内 remember，无批处理保护 | 状态更新要谨慎设计，不能依赖框架帮你兜底 |
| **模块生命周期** | ES 模块在会话内常驻，模块级变量稳定 | **每次挂载重新 require 模块，模块级变量全部重置** | boot 锁、计数器、缓存、防重入标记**全部不可依赖**（v1.7.1 探针实锤：mount 序号每轮从 #1 重来） |
| **首帧数据** | 可同步读 localStorage / SSR 注入 | getEnv 依赖 runtime.callRuntime，首次 render 的 runtimeOptions 不含 `__operit_call_runtime`；setEnv 走 native 直调 | **读写不对称：首帧无法同步读持久状态**，只能靠 setEnv 缓存 + onLoad 补帧 |
| **工具调用** | fetch 等异步有明确的 Promise 语义 | 多个 ctx.callTool 并发时 **bridge 响应可能错配**（拿到别的调用的响应，甚至 null） | 并发越多越容易数据错乱，必须统一串行（v1.8.1 双端探针实锤） |
| **生命周期** | 明确：mount / update / unmount | onLoad / action 窗口不明确，文档缺失 | 开发者只能靠实验摸索，踩坑成本高 |

**一句话总结**：React 帮开发者屏蔽了底层细节，Operit 需要开发者自己处理底层时序、竞态和响应关联——**插件必须自带防御层**。

## 三、Operit Compose DSL 开发原则

### 3.1 核心原则（必须遵守）

1. **所有影响 UI 的异步操作必须发生在 action 窗口**（onLoad / 事件回调），不要在渲染路径上发起。
2. **禁止裸 setTimeout 修改展示状态**——定时器回调不在生命周期保护内，状态更新可能发生在错误的时机；如需轮询用受控状态机。
3. **stateStore 不是 UI 刷新机制**——不要依赖它驱动界面，UI 数据源必须是显式的 state 变量。
4. **数据成功 ≠ UI 成功**——工具返回 success=true 不代表界面拿到了数据，UI 层要校验关键字段存在。
5. **写入前必须防空覆盖**——新数据为空/失败时，保留旧数据，绝不覆盖（空壳守卫）。
6. **render() 必须无副作用**——禁止在 render、UI 构造函数、节点生成阶段调用任何 state setter；所有数据同步必须发生在 action/onLoad 生命周期。

### 3.2 补充原则（实战血泪）

7. **模块级变量不可靠**——不能做 boot 锁 / 缓存 / 防重入；持久状态必须用 setEnv / storage / state store。
8. **工具调用必须统一串行**——所有 ctx.callTool 进入同一个队列（挂 ctx 跨模块共享），禁止 Promise.all 并发依赖返回顺序。
9. **探针/调试代码不能影响业务**——函数参数表达式先于函数体求值，`dbgUi("x", params.id)` 中 params 不存在会直接抛错；探针必须内置 try 且引用真实变量。
10. **setEnv 是首帧兜底的唯一可靠手段**——getEnv 首帧不可用，用 setEnv 在数据成功时写缓存，onLoad 时读缓存补帧。
11. **空壳响应守卫**——success=true 但缺关键字段（如 memories/extracted）→ 一律视为失败重试，不得当成功。
12. **失败不缓存空**——读取失败时绝不能把空结果写进缓存，否则同一运行时内永远返回空（无法自愈）。
13. **加载态必须存在**——数据未就绪时显示明确的加载态（如 "--"），不要闪误导性的 0 / 空列表。

### 3.3 推荐的防御架构

```
UI
↓
state（唯一数据源，失败不覆盖旧值）
↓
缓存层（setEnv 首帧兜底 + onLoad 补帧）
↓
串行工具队列（bridge 错配免疫）
↓
Operit tools / Memory
```

*本文档由 CMS/CME 开发战役总结，详见《Operit 插件开发踩坑记录》。*
