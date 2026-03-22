# 调度器与fetcher解耦评估及开发方案

版本：v2  
更新时间：2026-03-22 23:42:09 +0800  
文档状态：待实施

## 1. 文档定位

本文档用于回答一个具体架构问题：

> 当前项目中的 REST 调度器与 WebSocket 上游订阅协调器，是否有必要进一步与 `data-fetcher` / `stream-data-fetcher` 解耦；如果有，应该解耦到什么程度。

本文档覆盖：

- 当前代码现状与真实调用链
- 为什么不能把 REST 与 WS 粗暴合并成一个统一“调度器组件”
- 最小可行的解耦目标
- 涉及代码清单
- 开发步骤、验收清单与回归测试清单

本文档不覆盖：

- 分布式队列、跨实例限流、跨实例 refCount
- provider 字段映射细节
- 现有缓存体系的整体重构
- `stream-receiver` 全量拆分方案

## 2. 当前代码现状

## 2.1 结论先行

当前架构下，两个“调度器”不应被视为同一种东西：

- REST 侧是“上游请求调度器”，核心问题是回源前的排队、合并、发车间隔与 `429` 冷却
- WS 侧是“上游订阅聚合协调器”，核心问题是 `0 -> 1` 订阅、`1 -> 0` 退订、grace period 与 refCount

因此：

- 不建议把二者抽象成统一的跨协议大组件
- 也不建议为了目录同级化，直接对两侧做同力度、同形式的拆分

更准确的判断是：

- REST：有必要做“策略层解耦”
- WS：不需要重复做“行为层解耦”，更值得做“归属整理 + 状态层解耦”

## 2.2 REST 调度器当前调用链

当前真实链路如下：

```text
Query
  -> Receiver
  -> DataFetcherService.fetchRawData()
  -> executeWithOptionalScheduling()
  -> UpstreamRequestSchedulerService.schedule()
  -> Provider Capability
```

关键事实：

- `receiver` 直接依赖 `DataFetcherService`
- `query` 不直接依赖调度器，而是通过复用 `receiver` 主链间接进入调度器
- REST 调度器的生产态调用者目前仍然只有 `DataFetcherService`

这说明：

- REST 调度器本身已经是一个相对独立的“执行引擎”
- 但它还不是一个有多个上游调用者共享的基础平台组件

## 2.3 REST 当前耦合点

REST 侧真正的问题，不是“调度器类没有拆出来”，而是**调度策略分散在 `DataFetcherService` 与 `UpstreamRequestSchedulerService` 两边**。

当前 `DataFetcherService` 仍持有以下调度前决策：

- 是否进入 scheduler
- `mergeMode` 决策
- `symbolExtractor` 决策
- stale fallback 的启用、缓存键与 TTL
- 上游错误翻译

当前 `UpstreamRequestSchedulerService` 又持有以下能力语义：

- merge window 规则
- 哪些能力按 symbol 回填
- merge key 构造规则
- crypto 共享调度域映射
- 调度域最小发车间隔覆盖

这会带来两个直接问题：

- 调度能力相关知识分散，阅读和修改成本偏高
- 如果未来新增 provider/capability，容易不知道规则应落到 `DataFetcherService` 还是 `UpstreamRequestSchedulerService`

同时需要补一个边界修正：

- stale fallback 的“是否启用 / TTL / cache key 维度”确实也是 capability 规则
- 但它不属于 scheduler 执行引擎内部策略
- 更准确的归属应是“上游能力策略（Upstream Capability Policy）”，由 `DataFetcherService` 在失败兜底路径中消费

## 2.4 WS 协调器当前调用链

当前真实链路如下：

```text
StreamReceiverService.subscribeStream()/unsubscribeStream()
  -> UpstreamSymbolSubscriptionCoordinatorService.acquire()/scheduleRelease()
  -> StreamDataFetcherService.subscribeToSymbols()/unsubscribeFromSymbols()
  -> Provider WebSocket
```

关键事实：

- WS 协调器文件落位于 `src/core/03-fetching/stream-data-fetcher`
- 但运行时实际由 `StreamReceiverService` 编排并调用
- `UpstreamSymbolSubscriptionCoordinatorService` 本体只依赖 `StreamClientStateManager`

这说明：

- WS 协调器在行为上已经是独立协作者
- 它并不是 `StreamDataFetcherService` 的内部私有实现
- 当前真正偏重、偏杂的是 `StreamClientStateManager`

## 2.5 WS 当前耦合点

`UpstreamSymbolSubscriptionCoordinatorService` 当前职责比较纯：

- 看 refCount 是否从 `0 -> 1`
- 看 refCount 是否从 `1 -> 0`
- 管理待退订 timer 与 grace period

真正更需要处理的是 `StreamClientStateManager` 过度承载：

- 客户端订阅真相表
- symbol 反向索引
- provider 反向索引
- upstream refCount 索引
- intraday bucket 发射状态
- 广播统计
- 定时清理逻辑

这意味着：

- WS 当前的核心问题是“状态管理器太胖”
- 不是“协调器还没有从 fetcher 体系里拆出来”
- 且这件事必须分阶段做，因为 `StreamClientStateManager` 当前还被多个服务共享依赖，不能与 REST 策略收口绑定成一次大拆分

## 3. 架构判断

## 3.1 为什么不建议硬拆成统一同级组件

如果现在把 REST 调度器和 WS 协调器都强行提升成和 `data-fetcher` / `stream-data-fetcher` 完全同级的大组件，会产生三个问题：

- 会制造一个过于宽泛的“调度器”概念，掩盖 REST 与 WS 的状态机差异
- 会引入新的跨组件协议层，但当前没有第二个真实生产消费者来证明这层协议值得存在
- 会让重构目标从“消除混杂职责”变成“调整目录形状”，收益偏低

## 3.2 推荐判断

推荐采用“不对称解耦”：

- REST：做内部解耦，不做架构升格
- WS：做归属整理与状态解耦，不做行为重复拆分

进一步收窄为：

- REST：优先抽“轻量级能力策略模块”，不优先做重 DI 服务
- WS：优先抽“窄接口 token”，不优先直接拆碎 `StreamClientStateManager`

一句话概括：

> 现在最值得拆的不是“调度器文件位置”，而是“REST 的策略归属”和“WS 的状态边界”。

## 4. 开发目标

## 4.1 总目标

在不破坏现有主链、不引入过度工程化的前提下，完成调度能力的边界收口，使调用关系、策略归属、状态归属更清晰。

## 4.2 REST 目标

- 保持 `DataFetcherService -> UpstreamRequestSchedulerService -> Provider Capability` 的主链不变
- 把 `mergeMode / symbolExtractor / mergeWindow / resolveBySymbol / dispatchScope / mergeKey strategy` 等调度能力特征收口到轻量级能力策略模块
- 将 stale fallback 的 `enabled / ttl / cache key 维度` 收口到同一能力策略模块，但 fallback 执行仍保留在 `DataFetcherService`
- 让 `UpstreamRequestSchedulerService` 尽量只负责：
  - 队列
  - 桶合并
  - 发车
  - 冷却
  - 结果分发
- 让 `DataFetcherService` 尽量只负责：
  - capability 执行
  - 是否接入调度
  - stale fallback
  - 错误翻译

实现约束：

- 优先使用纯函数模块、静态只读字典或轻量 resolver
- 不优先把它做成新的复杂 Nest 注入服务
- 运行时 env 配置仍由 scheduler/service 自身读取，不强行塞进纯静态 profile

## 4.3 WS 目标

- 保持 `StreamReceiverService -> Coordinator -> StreamDataFetcherService` 的主链不变
- 不重复抽第二层“WS 调度器”
- 第一阶段先为协调器引入窄接口 token，而不是直接依赖完整状态管理器
- 第二阶段再评估是否继续收缩 `StreamClientStateManager`
- 视实施成本决定是否调整协调器所在子目录，但不把“挪目录”当作核心收益

实现约束：

- Nest 注入优先使用 `abstract class` 或显式 token
- 推荐通过 `useExisting: StreamClientStateManager` 完成依赖收窄
- 不为了接口隔离额外制造一个空心壳状态类

## 4.4 明确不做

- 不统一 REST 与 WS 为一个共享调度抽象
- 不做跨实例共享队列
- 不做跨实例共享 refCount
- 不引入动态自适应 RPS 重构
- 不因为这次解耦顺手重写 `stream-receiver` 或 `stream-data-fetcher` 全量结构

## 5. 建议后的职责边界

## 5.1 REST

建议演进为：

```text
DataFetcherService
  -> UpstreamCapabilityPolicy
  -> UpstreamRequestSchedulerService
  -> Provider Capability
```

职责建议：

- `DataFetcherService`
  - 规范化参数
  - capability 校验
  - 是否接入 scheduler
  - stale fallback
  - 错误翻译
- `UpstreamCapabilityPolicy`
  - scheduling profile
  - fallback policy
  - 推荐实现为纯函数模块或静态只读配置
- `scheduling profile`
  - merge mode
  - merge window
  - symbol extractor
  - dispatch scope
  - resolve by symbol 规则
  - merge key strategy
- `fallback policy`
  - stale fallback enabled
  - stale ttl
  - stale cache key dimensions
- `UpstreamRequestSchedulerService`
  - 队列
  - merge bucket
  - active entry 复用
  - dispatch window
  - cooldown
  - 执行与结果分发

补充说明：

- 原 v1 文档中的 `SchedulingPolicyResolver` 命名过窄
- 修正后建议使用 `UpstreamCapabilityPolicy` 这一更准确的边界名
- 如果实现上觉得名字过长，也应至少明确区分“调度 profile”和“fallback policy”

## 5.2 WS

建议演进为：

```text
StreamReceiverService
  -> UpstreamSymbolSubscriptionCoordinatorService
  -> UpstreamSubscriptionRefStore(abstract class / token)
  -> StreamDataFetcherService
```

职责建议：

- `StreamReceiverService`
  - 入参校验
  - 符号映射
  - 连接获取
  - 订阅/退订编排
- `UpstreamSymbolSubscriptionCoordinatorService`
  - `0 -> 1` / `1 -> 0` 判定
  - grace period 管理
- `UpstreamSubscriptionRefStore`
  - 暴露协调器需要的最小读取能力
  - 第一阶段仅保留 `getClientCountForUpstream()` 即可
  - 通过 `useExisting: StreamClientStateManager` 接入
- `StreamDataFetcherService`
  - 建连
  - 真实 subscribe/unsubscribe
  - 连接生命周期管理

## 6. 涉及代码清单

## 6.1 REST 必涉及

| 角色 | 文件 | 当前职责 | 预期动作 |
| --- | --- | --- | --- |
| 主编排 | `src/core/03-fetching/data-fetcher/services/data-fetcher.service.ts` | 回源编排、调度接入、stale fallback、错误翻译 | 抽离调度策略决策，保留主链控制 |
| 调度引擎 | `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts` | 队列、merge、发车、冷却、结果分发 | 收缩为纯执行引擎 |
| 调度常量 | `src/core/03-fetching/data-fetcher/constants/upstream-scheduler.constants.ts` | allowlist、共享调度域、默认窗口配置 | 视策略收口方式决定保留或迁移 |
| 调度接口 | `src/core/03-fetching/data-fetcher/interfaces/upstream-request-task.interface.ts` | 调度请求与内部状态契约 | 可能扩展策略对象结构 |
| key 工具 | `src/core/03-fetching/data-fetcher/utils/upstream-request-key.util.ts` | mergeKey / queueKey 构造 | 原则上保留 |
| 建议新增 | `src/core/03-fetching/data-fetcher/policies/upstream-capability-policy.ts` | 暂无 | 集中定义 scheduling profile 与 fallback policy |
| 模块注册 | `src/core/03-fetching/data-fetcher/module/data-fetcher.module.ts` | 提供 DataFetcher 与 Scheduler | 视新增策略服务更新 provider 注册 |

## 6.2 WS 必涉及

| 角色 | 文件 | 当前职责 | 预期动作 |
| --- | --- | --- | --- |
| 入口编排 | `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts` | 订阅/退订主链编排 | 调整到依赖更窄接口后的接入方式 |
| 订阅协调器 | `src/core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service.ts` | acquire / release / grace period | 保持行为稳定，必要时改依赖接口 |
| 状态管理器 | `src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service.ts` | 客户端状态、索引、intraday 发射、统计 | 第一阶段通过抽象类 token 收窄可见面，后续再分阶段收缩 |
| 执行器 | `src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts` | 真实 WS 连接与订阅执行 | 原则上不新增协调职责 |
| 建议新增 | `src/core/03-fetching/stream-data-fetcher/interfaces/upstream-subscription-ref-store.abstract.ts` | 暂无 | 为协调器暴露最小 refCount 读取接口 |
| 模块注册 | `src/core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module.ts` | 注册 fetcher / state manager / coordinator | 根据接口拆分调整 provider 注册 |

## 6.3 测试文件清单

| 范围 | 文件 | 说明 |
| --- | --- | --- |
| REST 调度器单测 | `test/unit/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.spec.ts` | 覆盖 merge、cooldown、共享调度域 |
| REST 编排单测 | `test/unit/core/03-fetching/data-fetcher/services/data-fetcher.service.spec.ts` | 覆盖接入判定、fallback、错误传播 |
| WS 协调器单测 | `test/unit/core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service.spec.ts` | 覆盖 acquire/release/grace |
| WS 入口单测 | `test/unit/core/01-entry/stream-receiver/services/stream-receiver.service.spec.ts` | 覆盖订阅/退订主链编排 |

## 7. 原子开发步骤

## 7.1 Phase 1：REST 策略收口

目标：

- 把调度策略定义集中到单点
- 不改变 `DataFetcherService` 的生产态主调用链

建议步骤：

1. 新增轻量级 `UpstreamCapabilityPolicy` 模块，优先采用纯函数或静态只读字典
2. 把 `mergeMode`、`symbolExtractor`、dispatch scope、按 symbol 回填规则、merge key strategy 集中迁移到该模块
3. 将 stale fallback 的 `enabled / ttl / cache key 维度` 也迁入该模块定义
4. 收缩 `UpstreamRequestSchedulerService` 中的 capability 语义分支
5. 让 `DataFetcherService` 统一通过能力策略模块获取调度与 fallback 配置
6. 保持 fallback 的实际执行与错误翻译仍在 `DataFetcherService`
7. 保持 scheduler 自身的 env 读取与运行时节奏配置不变

完成标准：

- `DataFetcherService` 中不再散落多处 capability 特判
- `UpstreamRequestSchedulerService` 不再直接承载过多 provider/capability 业务规则
- stale fallback 规则不再与 scheduler 执行规则混名混层
- 现有调度行为与测试结果不回归

## 7.2 Phase 2：WS 状态边界收口

目标：

- 减少协调器对完整状态管理器的依赖面
- 先完成依赖收窄，再决定是否推进状态仓库瘦身

建议步骤：

1. 识别协调器最小依赖面，当前以 `getClientCountForUpstream()` 为起点
2. 新增 `abstract class UpstreamSubscriptionRefStore`
3. 在模块中通过 `provide: UpstreamSubscriptionRefStore, useExisting: StreamClientStateManager` 完成依赖收窄
4. 让协调器改为依赖该抽象类 token
5. 单独评估 `StreamClientStateManager` 的瘦身路径，不与接口收窄绑定为一次大改
6. 评估是否需要调整协调器子目录归属

完成标准：

- 协调器不直接依赖“大而全”的状态管理器能力集合
- 协调器只暴露其真实所需的最小 refCount 读取面
- `StreamClientStateManager` 的后续瘦身有独立任务边界
- 订阅/退订主链行为不变

## 7.3 Phase 3：模块与文档收口

目标：

- 保持代码目录与运行时职责一致
- 更新架构文档，避免后续继续混淆

建议步骤：

1. 更新调度器说明文档
2. 更新完整数据流文档
3. 更新模块导出与依赖说明
4. 补充“为什么不统一 REST/WS 调度器”的设计说明

完成标准：

- 文档口径与代码一致
- 团队可从文档直接识别“谁负责调度引擎，谁负责策略，谁负责状态”

## 8. 验收清单

## 8.1 REST 验收

- `query -> receiver -> data-fetcher -> scheduler -> provider` 主链保持不变
- `receiver` 仍是 `DataFetcherService` 的直接调用方
- `query` 仍通过 `receiver` 间接进入调度器
- allowlist 判定行为不变
- crypto 共享调度域行为不变
- quote/basic-info/history 的 merge 语义不变
- stale fallback 行为不变
- 上游 `429` 透传与 cooldown 行为不变
- fallback policy 与 scheduling profile 命名边界清晰，不互相混淆

## 8.2 WS 验收

- `StreamReceiverService` 仍负责订阅/退订主链编排
- 协调器仍只负责 `acquire / scheduleRelease`
- `0 -> 1` 时只触发一次真实上游订阅
- `1 -> 0` 时只在最后订阅者离开后触发 release
- grace period 行为不变
- 跨 provider 隔离行为不变
- 不因重构引入提前写本地状态导致的脏状态

## 8.3 架构验收

- 没有新增一个试图统一 REST 与 WS 的宽泛“总调度器”
- 没有把缓存判定职责塞进 scheduler
- 没有把真实上游执行职责塞进 coordinator
- 没有引入无真实消费者的抽象层
- 没有把 env 运行时配置粗暴塞进纯静态 profile

## 9. 回归测试清单

## 9.1 必跑单元测试

```bash
bun run test:unit -- --runInBand test/unit/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.spec.ts
bun run test:unit -- --runInBand test/unit/core/03-fetching/data-fetcher/services/data-fetcher.service.spec.ts
bun run test:unit -- --runInBand test/unit/core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service.spec.ts
bun run test:unit -- --runInBand test/unit/core/01-entry/stream-receiver/services/stream-receiver.service.spec.ts
```

## 9.2 必做类型检查

```bash
npm run typecheck:file -- src/core/03-fetching/data-fetcher/services/data-fetcher.service.ts
npm run typecheck:file -- src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts
npm run typecheck:file -- src/core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service.ts
npm run typecheck:file -- src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service.ts
npm run typecheck:file -- src/core/01-entry/stream-receiver/services/stream-receiver.service.ts
```

## 9.3 建议补充的测试点

- REST：
  - `UpstreamCapabilityPolicy` 的独立单测
  - `mergeMode`、dispatch scope、symbol extractor、merge key strategy 的策略快照测试
  - stale fallback policy 的独立测试
  - 调度器不直接依赖 capability 特判后的行为保持测试
- WS：
  - `UpstreamSubscriptionRefStore` 的 contract 测试
  - `useExisting: StreamClientStateManager` 的注入回归测试
  - `StreamClientStateManager` 拆分后 upstream refCount 行为测试
  - 退订 grace period 在重新订阅时正确取消 timer 的回归测试

## 10. 风险与控制

主要风险：

- REST 策略迁移时遗漏某个 capability 特判，导致 merge 或 cooldown 行为回归
- WS 状态边界调整时破坏 `0 -> 1 / 1 -> 0` 语义
- 把 fallback policy 和 scheduler policy 混为一谈，导致职责重新缠绕
- 只改目录不改职责，造成“看起来更清晰，实际上更分散”

控制策略：

- 先抽策略/接口，再考虑目录归属
- 每一阶段只改一类问题，不把 REST 与 WS 重构绑成一次大提交
- 能力 profile 与 env 运行时配置分层保留，不强行合并
- 以现有单测为回归主干，先补 contract 测试再移动职责

## 11. 最终建议

最终建议如下：

- REST：进行“策略层解耦”，不进行“组件级硬拆”
- WS：先进行“接口收窄”，再分阶段推进“状态层解耦”和“归属整理”
- 两侧都坚持最小成本、第一原理实现，不为了架构图美观引入无收益抽象

统一口径：

> 当前阶段最值得做的，不是把两个调度器都从 fetcher 目录里抬成更大的独立组件；而是把它们各自真正混杂的那部分拆干净。REST 优先拆能力策略边界，WS 优先拆依赖接口边界，再视情况推进状态瘦身。
