# StreamReceiverService 边界化拆分蓝图

- 版本: `v1.0`
- 写入时间: `2026-03-22 18:02:10 CST`
- 目标文件: `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
- 目标组件: `src/core/01-entry/stream-receiver`
- 当前文件规模: `3045` 行
- 文档定位: 设计与实施蓝图，供后续评审与拆分施工使用

## 1. 结论

`StreamReceiverService` 已经不只是“代码偏长”，而是明显承担了过多独立变化轴。当前文件同时承载：

1. WebSocket 订阅编排
2. 取消订阅与上游 release 编排
3. 客户端重连恢复编排
4. provider 选择与能力校验
5. symbol 标准化与房间路由
6. 连接回调绑定与原始流数据入口接驳
7. 监控与健康检查残余逻辑
8. 已被子服务接管但仍未清理的重复实现

因此，本文件应按“职责域 + 变化轴 + 依赖分群 + 测试边界”拆分，而不是按行数机械切块。

本次建议的总原则是：

1. 保留 `StreamReceiverService` 作为 `01-entry` 层 façade / orchestrator。
2. 只在 `stream-receiver` 组件内部拆，不越界迁移到 `providersv2`、`03-fetching` 或 `common`。
3. 先删除死代码和重复实现，再抽活跃职责。
4. 优先抽“高内聚、可单测、变化独立”的协作者。
5. 禁止为了“看起来更优雅”而做跨层抽象或通用化设计。

## 2. 组件职责边界

结合模块装配、gateway 入口和现有专职服务，`stream-receiver` 组件的边界应定义为：

### 2.1 组件内应承担

1. WebSocket 协议入口与消息契约承接
2. 客户端订阅、退订、重连的用例级编排
3. provider / capability / symbol 上下文的入口层决策
4. 上游流连接复用、订阅引用计数、房间广播的协调
5. 将原始流数据接入批处理与标准化处理管道

### 2.2 组件内不应承担

1. provider 具体协议实现与底层连接细节
2. 数据标准化规则本身
3. 持久化存储
4. 跨组件通用基础库沉淀

### 2.3 拆分后的边界要求

1. `StreamReceiverGateway` 继续只做协议和连接入口，不承接业务细节。
2. `StreamReceiverService` 继续作为外部稳定调用面，不直接承载大段细节实现。
3. 新协作者仅放在 `src/core/01-entry/stream-receiver/services/` 内。
4. 只有当某段能力已被多个入口组件稳定复用，才考虑上移。

## 3. 评估标准

以下标准用于判断某段逻辑是“应该保留”“应该抽离”还是“应该删除”。

### 3.1 主标准

1. 职责是否仍属于“入口编排”
2. 该逻辑是否拥有独立变化频率
3. 是否形成独立依赖集合
4. 是否可以脱离主服务单独编写单元测试
5. 是否已经被现有专职服务接管

### 3.2 规模阈值

1. 编排型 service 的合理区间建议控制在 `400-800` 行
2. 超过 `1000` 行必须进行职责审视
3. 超过 `1500` 行且存在 `3` 条以上主链路时，应进入结构性拆分
4. 当前文件 `3045` 行，已满足结构性拆分条件

### 3.3 拆分判定规则

1. 能删的先删，不先抽
2. 能委托给现有服务的，不重复保留
3. 只为“独立业务名词”建立新服务，不建立 `Helper` / `Manager` 式模糊容器
4. 对外方法签名优先保持不变，先稳行为，再收缩实现

## 4. 当前问题画像

### 4.1 主服务承载过宽

当前活跃主链路集中在：

1. `subscribeStream()`，见源文件约 `514` 行
2. `unsubscribeStream()`，见源文件约 `719` 行
3. `handleClientReconnect()`，见源文件约 `928` 行
4. `detectReconnection()`，见源文件约 `1133` 行

这些方法本应只保留“组装输入、调用协作者、落日志、返回结果”的编排职责，但目前仍直接卷入 provider 决策、symbol 解析、房间键构建、恢复计划、连接绑定等细节。

### 4.2 已存在重复实现

当前文件中存在一批已被专职服务接管、但主服务内仍未清理的重复或残余实现：

1. 连接/内存/清理残余
   - `initializeMemoryMonitoring()`，约 `418` 行
   - `checkMemoryUsage()`，约 `440` 行
   - `recordMemoryAlert()`，约 `500` 行
   - `initializeConnectionCleanup()`，约 `2462` 行
   - 对应专职服务: `stream-connection-manager.service.ts`
2. 批处理降级残余
   - `analyzeBatchForFallback()`，约 `2813` 行
   - `attemptPartialRecovery()`，约 `2847` 行
   - `updateBatchStatsWithFallbackInfo()`，约 `2892` 行
   - `recordFallbackFailureMetrics()`，约 `2921` 行
   - `emitFallbackEvent()`，约 `2937` 行
   - `isHighPrioritySymbol()`，约 `2954` 行
   - `processSingleQuoteSimple()`，约 `2963` 行
   - 对应专职服务: `stream-batch-processor.service.ts`
3. 连接创建残余
   - `getOrCreateConnection()`，约 `1719` 行
   - `buildEnhancedContextService()`，约 `2203` 行
   - 主链路实际已调用 `connectionManager.getOrCreateConnection()`
4. provider 启发式残余
   - `findOptimalProviderForMarket()`，约 `2265` 行
   - `getProviderSelectionStrategy()`，约 `2291` 行
   - `selectProviderByStrategy()`，约 `2318` 行
   - `selectByPerformance()`，约 `2345` 行
   - `selectByAvailability()`，约 `2376` 行
   - `selectByCost()`，约 `2389` 行
   - `selectBalanced()`，约 `2404` 行
   - `getProviderByHeuristics()`，约 `2438` 行
   - `getLatencyScore()`，约 `2978` 行
   - `getReliabilityScore()`，约 `2991` 行
   - `getDataQualityScore()`，约 `3004` 行
   - `isProviderAvailable()`，约 `3024` 行
   - `getCostScore()`，约 `3036` 行
   - 当前主链路未使用，属于优先清理对象

### 4.3 同组件内已有能力边界，但主服务未完全收缩

组件内已经存在明确的专职服务：

1. `StreamConnectionManagerService`
2. `StreamBatchProcessorService`
3. `StreamDataProcessorService`
4. `StreamDataValidator`

这说明系统已经接受“厚入口组件内部再分工”的结构模式。当前问题不在于“能不能拆”，而在于主服务还保留了大量历史残余，导致 façade 失守。

## 5. 拆分目标态

### 5.1 目标结构

目标不是把大文件拆成更多大文件，而是把 `StreamReceiverService` 收缩为稳定编排器：

1. 对外保留 `subscribeStream()`、`unsubscribeStream()`、`handleClientReconnect()`、`detectReconnection()`、`getClientStats()`、`healthCheck()`
2. 对内仅做参数整合、调用协作者、统一日志、统一异常边界
3. 细节逻辑由组件内专职协作者承接

### 5.2 目标规模

建议把 `StreamReceiverService` 收缩到 `600-900` 行区间；若后续仍高于 `1000` 行，需要继续审视是否还有残余实现未收口。

## 6. 推荐拆分蓝图

本节给出“最小成本、不过度工程化”的拆分方案。核心思路是：`保留 façade + 新增少量专职协作者 + 删除重复残余`。

### 6.1 保留在 StreamReceiverService 的职责

以下内容应继续保留在主服务中，但只保留到编排层：

1. `subscribeStream()` 作为订阅用例入口
2. `unsubscribeStream()` 作为退订用例入口
3. `handleClientReconnect()` 作为重连用例入口
4. `detectReconnection()` 作为巡检入口
5. `getClientStats()` / `healthCheck()` 作为聚合查询入口
6. `recordWebSocketConnection()` / `recordWebSocketConnectionQuality()` 作为 gateway 面向主服务的轻量入口

保留原因：

1. 这些方法构成对外稳定接口
2. 它们代表组件用例，而不是纯实现细节
3. gateway 与其他组件已经依赖这些入口

### 6.2 第一优先级：删除而不是抽离

以下簇应优先删除，不建议新建服务承接：

#### A. 连接管理残余

删除候选：

1. `initializeMemoryMonitoring()`
2. `checkMemoryUsage()`
3. `recordMemoryAlert()`
4. `initializeConnectionCleanup()`
5. `getOrCreateConnection()`
6. `buildEnhancedContextService()`

处理方式：

1. 确认主链路无调用
2. 确认已有 `StreamConnectionManagerService` 提供等价职责
3. 删除残余实现和对应注释

#### B. 批处理降级残余

删除候选：

1. `analyzeBatchForFallback()`
2. `attemptPartialRecovery()`
3. `updateBatchStatsWithFallbackInfo()`
4. `recordFallbackFailureMetrics()`
5. `emitFallbackEvent()`
6. `isHighPrioritySymbol()`
7. `processSingleQuoteSimple()`

处理方式：

1. 确认主链路不再引用
2. 对齐 `StreamBatchProcessorService` 的现有实现
3. 删除主服务残余，避免双份逻辑漂移

#### C. provider 启发式死代码

删除候选：

1. `findOptimalProviderForMarket()`
2. `getProviderSelectionStrategy()`
3. `selectProviderByStrategy()`
4. `selectByPerformance()`
5. `selectByAvailability()`
6. `selectByCost()`
7. `selectBalanced()`
8. `getProviderByHeuristics()`
9. `getLatencyScore()`
10. `getReliabilityScore()`
11. `getDataQualityScore()`
12. `isProviderAvailable()`
13. `getCostScore()`

处理方式：

1. 这批逻辑当前未参与订阅主链路
2. 其评分模型属于“预想式策略”，不符合当前最小成本原则
3. 应直接清理，不推荐包装成新服务

### 6.3 第二优先级：抽 active 逻辑为专职协作者

以下簇属于仍在主链路上、且边界清晰的活跃逻辑，适合抽离。

#### A. StreamProviderResolutionService

建议新建文件：

`src/core/01-entry/stream-receiver/services/stream-provider-resolution.service.ts`

建议迁移的方法簇：

1. `resolveProviderForStreamRequest()`
2. `validatePreferredProviderForStream()`
3. `getDefaultProvider()`
4. `getMarketPriorityProviders()`
5. `getPrimaryProviderByMarket()`
6. `buildMarketPrioritiesSnapshot()`
7. `inferMarketLabel()`
8. 必要时保留 `buildMarketDistributionMap()` 给连接上下文或诊断使用

边界定义：

1. 只负责“入口层 provider 决策”
2. 不直接建立连接
3. 不处理客户端订阅状态
4. 不承担 provider 协议细节

抽离理由：

1. 这是独立变化轴
2. 直接依赖 `ProviderRegistryService` 和 `MarketInferenceService`
3. 可通过纯函数式输入输出高效单测

#### B. StreamSubscriptionContextService

建议新建文件：

`src/core/01-entry/stream-receiver/services/stream-subscription-context.service.ts`

建议迁移的方法簇：

1. `resolveSymbolMappings()`
2. `mapSymbols()`
3. `mapSymbolsForProvider()`
4. `assertSubscriptionContextCompatibility()`
5. `notifyUpstreamReleased()`
6. `toCanonicalSymbol()`
7. `buildCanonicalSymbolKey()`
8. `buildSymbolBroadcastKey()`
9. `buildSymbolRoomKey()`
10. `buildSymbolRooms()`
11. `getStandardSymbolIdentityProvidersConfig()`
12. `isProviderUsingStandardSymbolIdentity()`
13. `throwIdentityProviderSymbolValidationError()`
14. `findSymbolsWithBoundaryWhitespace()`
15. `validateIdentityProviderRawSymbolsNoBoundaryWhitespace()`
16. `validateIdentityProviderStandardSymbols()`

边界定义：

1. 只负责 subscription request 的上下文整形
2. 只处理 symbol / provider / room / context 一致性
3. 不操作连接
4. 不操作 recovery worker

抽离理由：

1. 这些方法围绕同一个核心对象：`订阅上下文`
2. 主链路中被 `subscribe` / `unsubscribe` / `reconnect` 共同复用
3. 独立测试价值高

#### C. StreamReconnectCoordinatorService

建议新建文件：

`src/core/01-entry/stream-receiver/services/stream-reconnect-coordinator.service.ts`

建议迁移的方法簇：

1. `handleClientReconnect()` 的内部实现主体
2. `checkProviderConnections()`
3. `checkClientHeartbeat()`
4. `triggerProviderReconnection()`
5. `handleReconnection()`
6. `scheduleRecoveryForClient()`
7. `notifyClientResubscribe()`

主服务中的处理方式：

1. `handleClientReconnect()` 继续保留
2. 方法体改为委托给 `reconnectCoordinator`
3. `detectReconnection()` 保留为 façade，内部仅调 coordinator

边界定义：

1. 只负责恢复、巡检、补发调度
2. 不负责 provider 选择策略定义
3. 不负责连接创建
4. 不负责数据处理管道

抽离理由：

1. 重连恢复有完整独立状态与异常路径
2. 与订阅/退订的变化节奏不同
3. 该簇最适合形成独立测试集

### 6.4 第三优先级：可选抽离，不作为第一轮必做

#### StreamIngressBindingService

若第二轮仍觉得主服务偏厚，可再评估新增：

`src/core/01-entry/stream-receiver/services/stream-ingress-binding.service.ts`

候选迁移方法：

1. `setupDataReceiving()`
2. `handleIncomingData()`
3. `extractSymbolsFromData()`
4. `recordStreamPushLatency()`
5. 相关轻量日志和接驳逻辑

说明：

1. 这一簇更偏“连接回调绑定 + 数据入口接驳”
2. 目前规模尚可，第一轮可以保留在主服务
3. 若完成前两轮后主服务仍显著超标，再做这一步

## 7. 不建议做的拆分

以下方向看起来“通用”，但当前不建议：

1. 不要把 provider 决策搬到 `providersv2`
   - 这里的决策是“入口订阅语义下的 provider 选择”
   - 不是 provider 基础设施本身
2. 不要把 reconnect 协调搬到 `03-fetching`
   - `03-fetching` 负责拿数据，不负责入口层恢复用例
3. 不要把 symbol / room / identity 校验提到 `common`
   - 当前语义强绑定 `stream-receiver`
4. 不要一次拆成过多 service
   - 第一轮新增 `2-3` 个协作者足够

## 8. 实施顺序

建议按以下顺序实施，风险最低。

### 阶段 1. 清理残余和死代码

目标：

1. 删除已被专职服务接管的重复实现
2. 删除未被主链路使用的 provider 启发式策略代码

验收：

1. 现有单元测试全部通过
2. `StreamReceiverService` 对外行为不变
3. 无 public API 变化

### 阶段 2. 抽 ProviderResolution 协作者

目标：

1. 把 provider 解析和校验从主服务移出
2. 保留主服务外部签名不变

验收：

1. `subscribe` / `reconnect` 场景行为一致
2. provider 不支持 capability / market 的错误语义一致
3. 新服务可独立单测

### 阶段 3. 抽 SubscriptionContext 协作者

目标：

1. 把 symbol mapping、identity 校验、room key 构建和上下文兼容校验从主服务移出

验收：

1. `subscribe` / `unsubscribe` / `reconnect` 的 symbol 行为保持一致
2. 房间加入和退出行为不变
3. 非标准 symbol / identity provider 校验仍按原规则工作

### 阶段 4. 抽 ReconnectCoordinator 协作者

目标：

1. 把恢复、巡检、补发调度从主服务移出
2. `detectReconnection()` 和 `handleClientReconnect()` 仅作 façade

验收：

1. 重连成功/失败场景语义不变
2. 恢复 worker 提交逻辑不变
3. 失败时 resubscribe 提示逻辑不变

### 阶段 5. 评估是否需要抽 IngressBinding

目标：

1. 仅在主服务仍显著超标时继续拆

验收：

1. `connection.onData` 到 `batchProcessor.addQuoteData()` 的链路保持不变
2. 不引入额外状态对象

## 9. 对应文件规划

建议的目标文件规划如下：

1. 保留
   - `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
2. 新增
   - `src/core/01-entry/stream-receiver/services/stream-provider-resolution.service.ts`
   - `src/core/01-entry/stream-receiver/services/stream-subscription-context.service.ts`
   - `src/core/01-entry/stream-receiver/services/stream-reconnect-coordinator.service.ts`
3. 可选新增
   - `src/core/01-entry/stream-receiver/services/stream-ingress-binding.service.ts`

说明：

1. 以上新增文件是当前建议的上限，不建议继续细分
2. 若其中任一服务最终只有很少方法，应回收合并，避免空心服务

## 10. 验收标准

拆分完成后，建议以以下标准验收：

### 10.1 结构验收

1. `StreamReceiverService` 行数显著下降
2. 主服务公开方法聚焦于 façade
3. 私有方法数量明显下降
4. 无新增跨层循环依赖

### 10.2 行为验收

1. `subscribeStream()` 行为不变
2. `unsubscribeStream()` 行为不变
3. `handleClientReconnect()` 行为不变
4. `detectReconnection()` 行为不变
5. `getClientStats()` / `healthCheck()` 行为不变

### 10.3 测试验收

1. 现有 `stream-receiver.service.spec.ts` 保持通过
2. 为新增协作者分别增加单元测试
3. 覆盖以下核心用例：
   - preferred provider 合法 / 非法
   - identity provider 标准 symbol 校验
   - mixed provider/capability 订阅阻断
   - reconnect 成功 / 失败 / 超出恢复窗口
   - unsubscribe 的 immediate release / scheduled release

## 11. 最终建议

本文件的拆分不应该从“把 3000 行切成 4 个 700 行文件”出发，而应该从“把 façade 以外的实现细节收回各自边界”出发。

最优先动作不是抽新服务，而是：

1. 删除已被 `StreamConnectionManagerService` 和 `StreamBatchProcessorService` 接管的重复实现
2. 删除未参与主链路的 provider 启发式死代码
3. 再抽 `ProviderResolution`、`SubscriptionContext`、`ReconnectCoordinator` 三个真正活跃的协作者

如果按此路径执行，能够同时满足：

1. 符合职能边界
2. 不跨层越界
3. 最小成本
4. 避免重复造轮子
5. 不做过度工程化拆分

