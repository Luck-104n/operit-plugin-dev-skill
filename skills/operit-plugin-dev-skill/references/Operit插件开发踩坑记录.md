# Operit 插件开发踩坑记录

> 记录 CMS（Character Memory System）v1.6.x → v1.8.4 与 CME（Character Memory Engine）开发战役的全部真实踩坑与解决过程。
> 这是用血泪换来的第一手资料，配合《Operit 插件开发指南》阅读。

## 一、运行环境

- **宿主**：Android 上的 Operit app（Compose DSL + QuickJS 运行时）
- **开发终端**：Ubuntu 容器（proot），已挂载 /sdcard；配合 Shizuku/Root 的 shell 可访问 Android 底层
- **项目工作区**：`/tmp/character-memory-system`（git 仓库，origin = GitHub）
- **数据目录**：`/sdcard/Download/Operit/character_memory_system_data/`（插件运行时数据 + 日志）
- **开发方式**：开发者 + DeepSeek（执行/排查）+ ChatGPT（外部技术顾问）三方协作

## 二、实测后端：Python worker 与 Operit 工具调用均无性能瓶颈

### 实验一：Python worker 后端实测（CME 独立后端）

#### 实验目的

确认 CME 独立后端（Python worker：词嵌入推理模型 + 本地数据库语义检索）是否存在性能瓶颈，是否会拖慢前端响应。

#### 实验方法

在 CME 实际使用场景中反复触发后端重负载路径，观察前端响应：

- 批量分析会话历史（自动/手动触发，含词嵌入推理）
- 连续语义检索召回（多条查询往返）
- 语义去重 / 语义召回叠加场景

#### 实验结果

- 后端承担计算密集任务（嵌入推理、语义检索）在独立 worker 进程中完成，**前端 UI 始终流畅，无卡顿、无超时**；
- JS 工具层只做请求转发与结果回传，不参与重计算；
- 多次往返批量操作后，未出现累积延迟或内存膨胀导致的退化。

#### 结论

**Python worker 独立进程架构有效隔离了重计算**：计算密集任务不进 Operit 工具线程，前端无性能瓶颈。

### 实验二：Operit 工具调用实测（CMS 数据通道）

#### 实验目的

确认 Operit bridge / 工具调用是否存在响应大小限制或性能瓶颈（v1.8.1 曾怀疑 31KB 响应被截断）。

### 实验方法（双端探针）

- **工具出口**：工具 complete 前，把 `JSON.stringify(result).length` 直写文件 `dbg_tool.log`（绕过 bridge）
- **前端入口**：前端收到响应后，把 `JSON.stringify(resp).length` 打进 `dbg_ui.log`

### 实验结果

| 数据 | 工具出口 | 前端入口 | 结论 |
|---|---|---|---|
| loadMem（87 条记忆） | 31039 B | **31065 B**（31039+26=scope/query 字段差，完全吻合） | ✅ **31KB 完整到达，无截断** |
| loadData（生活数据） | 8918 B | 9250 B（8918+332=uiState/injection） | ✅ 完整到达 |
| persona | 207 B | 207 B | ✅ 完整到达 |

#### 实验二结论

- **Operit 工具调用无性能瓶颈、无大小限制**（至少 31KB 级别完全没问题）。
- 工具后端本身 100% 正确——之前所有"数据没出来"的锅都不在后端。
- 真正的问题在 **bridge 并发响应关联**（见下文"两层竞态"）。

## 三、开发记录：跨日战役完整版本链

### 第一战役：UI 卡死（v1.6.0 → v1.6.9）

| 版本 | 实验/修复 | 结果 |
|---|---|---|
| v1.6.0 | 修复 loadPersona 重复执行（加载锁） | 风暴停止，卡死仍在 → 排除加载链 |
| v1.6.1 | useState/useRef key 加 cms_ 前缀 | 仍卡死 → 排除 key 污染 |
| v1.6.2 | 87 条记忆减到 10 条 | 仍高频 mount → 排除节点数量 |
| 共存实验 | CME 单独正常 / CMS 单独卡死 / 共存 CMS 卡死 | 排除插件冲突 |
| v1.6.4 | 固定 persona/memory 文本 | 仍卡死 → 排除数据内容 |
| v1.6.6 | 静态页 Text("hello") | 正常 → 平台入口无恙 |
| v1.6.7 | 完整 UI 结构无 setState | 正常 → UI 结构无恙 |
| **v1.6.8** | **唯一改动：render 中加一行 setState** | **立即 mount 风暴 → 根因实锤！** |
| **v1.6.9** | **render 纯函数化，数据同步移到 onLoad/action** | **✅ 卡死根治** |

**根因模型**：

```
render() → setState() → XML 重建 → LaunchedEffect 重启 → Screen 重新执行 → render 再 setState → …无限循环
```

### 第二战役：空加载（v1.7.0 → v1.7.9）

> 现象定义（用户多次澄清，这是诊断关键）：
> - "空加载" = **有 UI 没条目**（界面在，列表空），不是白屏
> - "不回复" = **不恢复**（加载失败后空界面一直没数据）

| 版本 | 修复 | 针对问题 |
|---|---|---|
| v1.7.0 | ready gate + props 唯一数据源 + 操作回流 | 数据生命周期 |
| v1.7.1 | 探针版（mount 序号/cache hit/boot 触发） | 定位首帧空窗 |
| v1.7.2 | onLoad 补缓存（persona/memories） | 首帧空加载 |
| v1.7.3 | 修探针 params bug + dbgUi 内置 try | 偶发空加载 |
| v1.7.4 | 知识页复用 screenPersona（绕开空壳高发路径） | 知识页空条目 |
| v1.7.5 | 知识页缓存兜底 + tab 重入触发重载 | "不恢复" |
| v1.7.6 | 角色页 scope='all' 对齐知识页 + 重试 5→10 | 角色页只显示 9 条缓存 |
| v1.7.7 | 指数退避重试（300ms→10s）+ 信息区加载态 | 空壳重试风暴 |
| v1.7.8 | 工具侧 readTextFile 重试 3 次 + 失败不缓存空 | 全局生活数据空 |
| v1.7.9 | onLoad 补缓存 CACHED_ALL_DATA + 计数"--" | 信息闪 0 |

### 第三战役：数据通道（v1.8.0 → v1.8.4）

| 版本 | 修复 | 针对问题 |
|---|---|---|
| v1.8.0 | ensureStorageReady（loadAll 前探测数据目录可读） | "-- 后变 0" |
| v1.8.1 | 双端探针：工具出口 OUT bytes / 前端入口 IN bytes | **定位 bridge 错配** |
| v1.8.2 | 全局串行队列 __serialCtx（7 处启动链调用入队） | 错配率 90%→2% |
| v1.8.3 | 漏网调用全入队（trigger_analysis 等 10 处） | 134B 错配源根治，三轮全绿 |
| v1.8.4 | 探针关闭 + 四篇战役报告 + README + Release | 收官 |

## 四、两层竞态（本项目最深的两个坑）

### 第一层：模块级 boot 锁竞态

- **现象**：同一挂载内切走再切回数据页，不重新加载（"不恢复"）
- **根因**：`__bootMemLoad` / `__bootCharLoad` 是模块级变量，一旦置 true 就不会重置（且每次挂载重新 require，变量还会被清零）
- **解决**：tab onClick 重置 boot 锁；用 state 而非模块变量做加载调度权威

### 第二层：bridge 并发响应错配（平台级）

- **现象**：多个 ctx.callTool 并发时，前端收到**别的调用**的响应：
  - loadData 收到 persona 的响应（207B）→ 没有 extracted → 信息 0
  - loadMem 收到 loadData 的响应（9250B）→ 没有 memories → count=-1
  - 部分调用收到 null（bytes=4）
- **实锤方法**：工具出口（直写文件）100% 正确 vs 前端入口（经 bridge）错乱，字节互相"借用"
- **漏网源**：挂载瞬间自动触发的 IIFE（trigger_analysis）等未入队调用仍会污染
- **根治**：所有 ctx.callTool 统一进全局串行队列（挂 ctx 跨模块共享），物理上消灭并发

## 五、探针设计（ChatGPT 的工程化贡献）

### 四点定位法

```
工具出口 → bridge → JS 入口 → UI props
OUT bytes     (未知)    IN bytes     render
```

一次实验就能判断问题在哪一层：

- 工具 OUT 大、前端 IN 小 → bridge 截断
- 工具 OUT 对、前端 IN 错乱（拿到别的响应）→ bridge 错配
- 工具 OUT 就错 → 业务逻辑问题

### 探针安全三原则

1. **参数表达式先于函数体求值**——`dbgUi("x", params.id)` 中 params 不存在会先抛 ReferenceError，dbgUi 内部 try 救不了（v1.7.3 血的教训）
2. **探针必须内置 try + 引用真实变量**
3. **探针不能影响业务**——调试失败业务要继续

## 六、前端各种 bug 清单

| Bug | 表现 | 根因 | 解决 |
|---|---|---|---|
| getEnv 首帧不可用 | 首帧拿不到缓存 | getEnv 依赖 runtime.callRuntime，首次 render 未注入 | setEnv 缓存 + onLoad 补帧 |
| 模块级变量重置 | boot 锁失效 | 每次挂载重新 require | 状态挂 state / setEnv |
| onLoad 补缓存遗漏 | 信息区闪 0 | 只补了 persona/memories，漏 CACHED_ALL_DATA | v1.7.9 补齐 |
| 计数卡片闪 0 | "信息 0" 一闪变 16 | 首帧 dataState 无兜底 | 加载态"--" + 缓存兜底 |
| loadData 守卫漏洞 | 错配响应当成功 | `__ext && !__hasAny` 对 null 放行 | success 但无 extracted → 一律重试 |
| 空壳响应 | success=true 但数据空 | 工具早期调用不稳定 | 守卫 + 重试 + 失败不缓存空 |
| 探针引错变量 | 偶发 ReferenceError | params 不存在 | v1.7.3 修复 |

## 七、mount 风暴（卡死战役核心）

- **触发**：render 阶段调用任意 state setter
- **机制**：setState → XML 变化 → LaunchedEffect 重启 → Screen 重新执行 → 再 setState
- **实锤**：v1.6.8 对照实验——仅在 render 加一行 setState 立即复现，删除立即恢复
- **修复**：render 必须纯函数；所有 setState 移到 onLoad / action 回调
- **教训**："看起来像 React"的框架不一定有 React 的协调器保护，**先验证再假设**

## 八、如何步步解决 bug（方法论）

1. **先澄清现象定义**（"空加载"=有 UI 没条目、"不回复"=不恢复）——定义错了整个方向都错
2. **打探针，不猜**——把"看不见的层"变成"可对账的数据"
3. **分层定位**：render 层 → 生命周期 → 数据链 → bridge，逐层排除
4. **守卫防御 + 治本**：守卫（失败不覆盖旧数据）保证不恶化，治本（串行队列/纯函数）消灭根因
5. **一轮一个变量**：每个版本只改一件事，用 log 验证效果，失败就换假设
6. **外部审计**：把 log + 分析报告给独立视角（ChatGPT）审阅，往往能提出关键实验设计

## 九、CME 项目介绍与踩坑要点

### 9.1 CME 项目介绍

**CME（Character Memory Engine）** 是 CMS 基础上的架构演进版（https://github.com/liqiming-whu/character-memory-engine）。

**与 CMS 的关系**：完整保留 CMS 的角色记忆、会话分析、Prompt 注入等能力，核心改进是**前后端职责分离**：

```
CMS：逻辑集中在前端（Compose DSL + JS 工具脚本）
CME：独立后端（Python worker）+ 前端专注 UI
```

**后端能力（Python worker）**：

- 本地数据库（结构化存储角色背景、事件、关系）
- 词嵌入推理模型（本地运行）
- 语义检索、语义去重、语义召回

**前端能力（Compose DSL）**：

- 自动或手动分析聊天记录
- 从历史对话中提取长期记忆
- 管理角色背景、事件和关系
- 将检索结果注入提示词，提高 AI 角色长期交互一致性

**架构收益**：

- 前端状态复杂度显著降低（重计算全部下沉后端）
- 验证了更清晰架构对复杂插件稳定性的重要性（对比 CMS 前端集中式）

### 9.2 CME 踩坑要点

CME 与 CMS 前端同源（共用 memory_system_ui），因此 **CMS 的全部踩坑对 CME 同样适用**（render 纯函数、模块变量不可靠、串行队列、setEnv 缓存等），额外增加独立后端特有的坑：

| 坑 | 说明 | 对策 |
|---|---|---|
| **跨语言桥接** | JS 工具层 ↔ Python worker 通信链路多了一层，任一端异常都会表现为"工具无响应" | 桥接层要有超时与重试；两端日志分开记录，便于定位是哪一端挂了 |
| **worker 生命周期** | Python worker 冷启动（模型加载）需要时间，前端首次调用可能撞上启动窗口 | 首次调用前做 readiness 探测（参考 ensureStorageReady 思路）；worker 常驻保活 |
| **模型初始化** | 词嵌入模型加载耗时，若每次挂载都初始化会显著拖慢首帧 | 模型只初始化一次并缓存；启动期异步预热 |
| **数据一致性** | 本地数据库与 Operit Memory 双写，可能不一致 | 明确主从（数据库为主、Memory 为索引/召回源）；对账任务幂等可重入 |
| **语义召回质量** | 纯向量检索可能召回无关记忆 | 关键词 + 向量混合检索（本项目采用"keyword+native"双通道合并去重） |

### 9.3 CME 对开发范式的验证

- CMS 踩出的四条铁律（render 无副作用 / 模块变量不可靠 / debug 不影响业务 / 工具调用统一串行）在 CME 上同样成立；
- 独立后端（Python worker）是**推荐的复杂插件架构**：重计算不进 UI 线程，前端只做展示与交互，稳定性和可维护性都更好。

## 十、开发模式总结：三方协作优势互补

这次战役最成功的不是代码，是**协作模式**：

| 角色 | 优势 | 贡献 |
|---|---|---|
| **开发者** | 实验设计、精准反馈、现象定义 | 每次测试都给出决定性信息（"空加载只在首进/重进出现"、"信息空记忆不空"），多次纠正诊断方向 |
| **ChatGPT** | 探针设计、大方向把控、工程化思维 | 四点定位法、三态数据模型、storageReady、指数退避等建议，方向完全正确 |
| **DeepSeek** | 细节发现、执行落地 | 实锤探针 params bug、发现 loadData 守卫漏洞、readCategory 缓存空根因，逐版本落地部署 |

**协作流程**（每轮循环）：

```
开发者测试 → DeepSeek 提取 log 分析 → 生成报告 → ChatGPT 外部审计
→ 采纳建议 → DeepSeek 落地新版本 → 部署 → 开发者再测试 → …
```

*本记录与《Operit 插件开发指南》配套，欢迎后来者少走弯路。*
