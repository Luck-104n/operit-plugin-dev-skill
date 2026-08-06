# Operit 插件开发指南（修订版）

> 基于 CMS（Character Memory System）v1.6.9 → v1.8.4 实战经验总结。
> 适用于 Operit ToolPkg / Compose DSL 插件开发者。

## 一、开发前认识

Operit 插件由 ToolPkg 构成，通常包含：

-   manifest.json
-   packages（工具脚本）
-   ui（Compose DSL 前端）

前端通过 ctx.callTool 与工具层通信。

## 二、Compose DSL 与状态模型注意事项

Operit Compose DSL 提供声明式 UI 能力，但其运行机制与 React
等成熟前端框架不同。

React 等框架经过长期演进，提供了较完善的状态协调和生命周期抽象；而在
Operit 插件开发中，开发者需要更加关注：

-   状态更新时机；
-   生命周期；
-   异步调用顺序；
-   数据恢复。

## 三、最小化开发原则

复杂插件不要一次加入全部功能。

推荐：

    Text("hello")
     ↓
    静态UI
     ↓
    state更新
     ↓
    单个tool调用
     ↓
    缓存
     ↓
    复杂业务

每一步验证后再增加复杂度。

## 四、核心开发原则

1.  render 必须无副作用。

禁止：

    render()
      ↓
    setState()

应将数据同步放入 onLoad 或 action。

2.  所有影响 UI 的异步操作应发生在生命周期/action窗口。

3.  不依赖模块级变量保存生命周期状态。

模块可能重新加载，boot锁、缓存、防重入标记不能依赖 module scope。

4.  工具调用统一串行化。

在 CMS v1.8.x 实验环境中观察到，并发 ctx.callTool
可能出现响应关联异常，因此复杂插件建议统一进入串行队列。

5.  不相信 success=true。

必须验证关键字段：

例如：

    success=true
    但 memories 缺失

仍应视为失败。

6.  失败不能覆盖已有数据。

7.  数据未准备好时显示明确加载态，不显示误导性的 0 或空列表。

## 五、推荐架构

    UI
     ↓
    State（唯一数据源）
     ↓
    缓存层
     ↓
    串行工具队列
     ↓
    Operit Tools

## 六、调试方法

推荐四层定位：

    工具出口
     ↓
    bridge
     ↓
    JS入口
     ↓
    UI props

判断：

-   工具出口错误：业务问题
-   工具出口正确，入口错误：通信问题
-   props错误：状态管理问题

## 七、打包与部署

版本递增； 排除 .git； 部署前清理旧日志； 每次修改保持 git commit。

## 八、总结

复杂插件开发的关键不是堆功能，而是建立稳定的数据流：

数据 → 状态 → UI

并明确控制：

-   生命周期；
-   异步顺序；
-   错误恢复。
