# Compose DSL 规则与证据等级

> 本文件是 PC 与 Android Pro 两个 Skill 的共同维护源。仓库内只编辑 `shared/references/COMPOSE_DSL_RULES.md`，再运行 `node scripts/sync-shared-references.mjs` 生成两个 Skill 的分发副本。

## 平台不变量

### 保持渲染纯净

Screen/UI 树构造期间不要写文件、调用工具、写 env 或无条件 setState。渲染输入相同时应生成相同的 UI 树。把副作用放入 onLoad、用户事件或明确的宿主生命周期入口。

### 以当前类型为准

使用 `SandboxPackage_DEV/types/compose-dsl*.d.ts`、`toolpkg.d.ts` 和当前官方示例核对组件、属性、hook 与注册字段。历史项目能运行不代表其写法仍是推荐接口。

### 返回异步工作

事件处理器启动异步工作时返回对应 Promise，让宿主能够观察完成和异常。捕获异常时记录实际错误，不能静默吞掉。

## 当前版本约束：先验证再固化

### 异步重绘

异步 `setState` 是否立即触发平台重绘、onLoad/action 的有效窗口以及平台侧 rerender 行为可能随 Operit 改动。先用最小页面验证：

1. 初始 render 记录一次日志。
2. onLoad 中同步更新一次状态。
3. Promise 或定时回调中再更新一次不同状态。
4. 比较 UI、状态日志和宿主回调。

只有复现当前行为后，才为该项目选择轮询、完成信号或交互刷新方案。

### `ctx.callTool` 并发

CMS/CME 的旧版本实验出现过响应错配。不要据此永久禁止所有并发：

- 依赖顺序、修改共享状态或尚未验证时串行调用。
- 独立只读请求需要并发时，用不同参数和可识别返回值构建探针。
- 只有当前 Operit 版本能稳定关联响应后，才保留并发。

### 模块生命周期与 env

不要假定模块永久常驻，也不要假定每次 render 都重新加载。对 boot 锁、缓存和单例行为进行 mount/unmount、切页和应用重启测试。env 的持久范围也要分别验证插件重装、应用重启和清数据场景。

## 项目策略

下列策略按需求采用，不是 Operit 强制规则：

- 高频输入使用 debounce/throttle/batch。
- 大列表使用分页、LazyColumn 或搜索过滤。
- 适合失败恢复的交互使用乐观更新。
- 缓存按数据成本和新鲜度设置 TTL，不照搬案例中的秒数。
- 只有重计算、独立依赖或长驻服务确实需要时才引入 Python/proot worker。

## UI 一致性

优先使用 `ctx.MaterialTheme.colorScheme` 和官方 Material 组件，不硬编码主题色。不确定组件或属性时检索最新 types，而不是套用 React/Web 属性。


### `ctx.callTool` 的返回值形态（2026-09-14 实测，Operit 1.12.1+6）

- **实测结论**：`ctx.callTool(...)` 返回的是 **JSON 字符串**，不是对象。探针记录：`typeof=string`、`isConstructor=String`、内容形如 `{"success":true,"data":{...}}` 的文本。
- 类型定义本身也未承诺对象：`compose-dsl.d.ts` 写的是 `callTool<T = any>(toolName: string, params?: Record<string, unknown>): Promise<T>`；`core.d.ts` 里 sandbox 层 `callTool(...)` 的返回类型同样是 `string`。
- **因此数据提取必须两种形态都兼容**（字符串先 `JSON.parse` 再递归处理）；只判断 `typeof r !== "object"` 就丢弃，会让所有取数分支拿到 `null`。
- **症状特征**：多个按钮同时报通用失败文案（例如「状态检测失败」「可点击=0」），但用 `package_proxy` 直调同名工具完全正常。这类「界面不报错/只报笼统文案，但结果全错」优先怀疑返回值形态。
- 建议：不确定时先用一个只读工具做形态探针，把 `typeof` 结果写盘，不要假定一定是对象。
