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

## 四、前端工程实践：高频交互与数据量控制（通用原则）

> 适用于所有 Operit 插件前端（Compose DSL），与第三章原则互补。这些原则来自 CMS/CME 高频交互与大数据量场景的实战验证。

### 4.1 异步事件处理器必须返回 Promise

所有在异步操作完成后更新 UI 的事件处理器，都必须返回 Promise。**不要在事件回调中直接调用异步函数而丢弃其返回值**：

```js
// 禁止：丢弃 Promise，异常被吞、状态永远不更新
onClick: function() {
  doAsyncWork(); // ← 返回值被丢弃
}

// 正确：返回 Promise 链
onClick: function() {
  return doAsyncWork().then(function(r) {
    setState(r);
  }).catch(function(e) {
    setError(String(e));
  });
}
```

丢弃 Promise 的后果：异步错误无法捕获（静默失败）、状态更新时序失控、UI 与数据不一致且无法自愈。

### 4.2 render 必须无副作用

见 3.1 第 6 条与 3.2 补充原则——**禁止**在 render 中 `Tools.Files.write()` / `setEnv()` / `callAPI()`。数据流必须单向：

```
用户行为 → 业务逻辑 → 状态变化 → 渲染
```

绝不允许反过来（渲染触发业务）。

### 4.3 所有高频事件必须 debounce / throttle / batch

Operit 的每次 setState 都可能触发整屏 XML 重建，高频事件不做限流会引发渲染风暴（实测卡顿根源：1 分钟 45+ 次全量重绘）。典型做法：

| 场景 | 手段 | 示例 |
|---|---|---|
| 搜索输入 | **debounce**（输入停止后 300ms 才查询） | 连续输入"abc"只发一次查询 |
| Tab 切换 | **throttle**（100ms 内多次切换只处理最后一次） | 快速点多个 tab 不重复加载 |
| 状态同步 | **batch**（多次 setState 合并为一次） | state A/B/C 变更后只触发一次渲染 |
| 全量数据拉取 | **debounce 合并**（300ms 内连续操作合并为一次拉取） | CME v2.2.3：连续删除/勾选/切换合并为一次 loadData |

### 4.4 乐观更新（Optimistic Update）

删除/修改类操作先更新 UI、后执行后台操作，失败再恢复：

```
点击删除 → 立即移除 UI → 后台删除 → 失败恢复/重载后继续
```

- 删除成功/失败都本地先 drop——**目的是不报错、不卡顿**
- 即使删除失败，重新加载后可以再次删除（幂等）
- 失败时给出可恢复的提示（如"删除失败，数据将在刷新后恢复"），不要弹错误阻塞交互

### 4.5 缓存 + TTL

用户不是每次都需要重新获取最新数据。本地缓存 + 过期时间：

| 数据 | 建议 TTL |
|---|---|
| 角色数据 | 5s |
| 列表数据 | 30s |

- 首帧读缓存秒开，后台刷新兜底（Operit 场景：setEnv 缓存 + onLoad 补帧，见 3.2 第 10 条）
- 缓存带时间戳，过期才重新拉取
- **失败不缓存空**（见 3.2 第 12 条）——缓存只存成功结果

### 4.6 大列表不要一次渲染

数据量大时一次渲染全部节点会拖垮 Compose 渲染（XML 全量重建）。解决：

- **分页**：按 offset/limit 分批拉取，滚动加载下一页（CME 消息页 offset 分页 + 偏移恢复实例）
- **虚拟列表**：只渲染可视区域
- **lazy load**：tab/子页面按需加载
- **搜索优先**：大数据量先给搜索入口，而不是全量展示

### 4.7 前端职责限制

Operit 插件前端：

**负责**：
- 展示
- 轻量交互
- 状态触发
- 用户确认

**不负责**：
- 大规模数据管理
- 复杂搜索
- 批量编辑
- 数据迁移
- 全库分析

**复杂数据操作统一交给后端 Python 服务（如果有）**——CME 的架构验证：重计算（嵌入推理、语义检索、批量分析）全部下沉 Python worker，前端只做展示与交互，UI 始终流畅、无卡顿无超时（详见踩坑记录第二章实验一）。

### 4.8 异步刷新正解：onLoad 长窗口（源码级机制，v2.3.2 实锤）

**背景**：compose_dsl UI 树只在 ①初始渲染 ②action 分发 ③文本输入 ④平台侧 rerender 时重建；**异步 setState（setTimeout/Promise 回调）只写 stateStore，不触发平台重绘**——所以"自动分析完成后更新数据"这类纯异步路径默认不显示，必须用户交互（切 tab/点击）才刷新。

**正解（已验证）**：根节点 `onLoad` 本身是平台 action 分发，分发期间订阅 stateChange——在 onLoad 末尾保持窗口：

```js
return UI.Column({ fillMaxSize: true, padding: 8, onLoad: async function() {
  // ... 正常初始化（loadData 等）
  // 保持 action 窗口：期间任何异步 setState（含 setTimeout 链）都会推送中间渲染
  await new Promise(function(res) { setTimeout(res, 120000); });
} }, [ ... ]);
```

- 窗口时长覆盖异步任务周期（自动分析约 90s，取 120s 有余量）；窗口结束后异步 setState 仍不渲染，由用户交互兜底
- **配套**：异步任务延迟触发（如 8s）确保首个 setState 落在窗口内
- **无效方案**（别浪费时间）：renderTick hack（异步路径无订阅者）、`__operit_rerender_compose_dsl()` 直调（平台 Kotlin→JS 入口，脚本调用不消费）、`__operit_dispatch_compose_dsl_action` 自调（sendIntermediateResult 只在平台调用时注入）
- **跨上下文信号**：工具调用结束后的异步回调里 `setEnv` 会因活动 callRuntime 失效而写入失败——完成信号一律走**文件 + 工具轮询**（分析完成写 trigger_result.json，UI 调 get_trigger_result 读），不要走 env


