# PulseMeter Backend 接入计划书（消费 newstockapi WebSocket 并转发给 macOS）

## 1. 目标与边界

目标：让 `PulseMeter/backend` 作为中间转发层，消费 `newstockapi` 的实时行情 WebSocket，再稳定推送给 macOS 客户端。

边界：

1. 本期只覆盖个股实时行情（HK/US/SH/SZ）
2. 不改动 `newstockapi` 对外协议
3. `PulseMeter` 继续保留现有鉴权、配额、symbol binding 语义

## 2. 现状评估（基于当前代码）

`PulseMeter/backend` 当前是 HTTP quote gateway 形态，不是流式网关：

1. Fastify 服务入口：`src/server.ts`
2. 行情路由为拉取接口：`/v1/quotes/snapshot|info|intraday`（`src/routes/quote-routes.ts`）
3. 鉴权门控依赖 `AccessGuard`（`src/auth/access-guard.ts`）
4. 订阅体系可刷新 `quoteAccessToken`（`src/routes/subscription-routes.ts`）
5. 符号规范差异：US 在 PulseMeter 是 `AAPL`，而上游常用 `AAPL.US`（`src/lib/symbol.ts`）
6. 已有统一 envelope 与 metrics 体系（`src/lib/envelope.ts`、`src/lib/metrics.ts`）

结论：要实现“后端转发给 macOS”，需要新增流式能力层，而不是复用现有 HTTP quote handler。

## 3. 目标架构

新增四个核心组件：

1. `UpstreamWsClient`（上游连接器）
2. `StreamSubscriptionOrchestrator`（订阅聚合器）
3. `SymbolMappingService`（符号双向映射）
4. `DownstreamStreamGateway`（对 macOS 的推送出口）

数据流：

1. macOS -> PulseMeter（订阅请求，携带现有 token）
2. PulseMeter -> Orchestrator（鉴权/配额/去重）
3. Orchestrator -> UpstreamWsClient（必要时增量订阅上游）
4. UpstreamWsClient 收到 `data` -> SymbolMapping -> DownstreamGateway 广播给 macOS

## 4. 协议与鉴权设计

### 4.1 上游（PulseMeter -> newstockapi）

1. 使用 Socket.IO 客户端
2. 连接路径：`/api/v1/stream-receiver/connect`
3. 握手 `auth`：`{ appKey, accessToken }`
4. 订阅事件：`subscribe`，payload 包含 `symbols`、`wsCapabilityType=stream-stock-quote`、可选 `preferredProvider=jvquant`

### 4.2 下游（macOS -> PulseMeter）

建议新增独立流端点（例如 `/v1/stream/connect`），鉴权复用现有 `quoteAccessToken` 模型：

1. 连接建立时校验 sessionVersion
2. 订阅动作校验 symbol binding
3. 按套餐/策略执行 symbol 数量上限与速率限制

## 5. 符号映射策略

必须引入双向映射，避免协议泄漏到客户端：

1. 入站（macOS -> PulseMeter）
   - `AAPL` -> `AAPL.US`
   - `00700.HK` -> `00700.HK`
   - `600519.SH` -> `600519.SH`
2. 出站（newstockapi -> macOS）
   - `AAPL.US` -> `AAPL`
   - 其他保持 PulseMeter canonical

要求：映射表单点维护，不允许在业务代码散落字符串拼接。

## 6. 实施阶段计划

### Phase 1：最小闭环（单实例）

交付：

1. `UpstreamWsClient` 可稳定连接上游并订阅/退订
2. 新增下游流出口（WS 或 SSE 二选一）
3. 打通 US/HK 实时数据透传

验收：

1. 两个客户端订阅同一 symbol，仅产生一次上游订阅
2. 客户端能收到持续 `data` 包

### Phase 2：接入现有授权语义

交付：

1. 连接和订阅动作复用 `AccessGuard` 语义
2. 落地 symbol binding、sessionVersion、配额限制
3. 错误结构与现有 envelope 一致

验收：

1. 未授权 symbol 被拒绝
2. 过期或失效 session 被拒绝

### Phase 3：可靠性与可观测性

交付：

1. 上游断线重连 + 自动重订阅
2. 慢消费者保护（队列上限/丢包策略）
3. metrics 指标：连接数、重连次数、广播延迟、丢弃计数

验收：

1. 上游断连后可自动恢复
2. 不因单个慢客户端拖垮全局

### Phase 4：多实例一致性

交付：

1. Redis 协调订阅状态（或 LB sticky 会话）
2. 跨实例广播一致性策略

验收：

1. 多实例部署下无重复订阅风暴
2. 客户端重连到不同实例仍能恢复订阅

## 7. 风险与应对

1. 风险：多实例导致订阅状态分裂。应对：Redis 作为订阅注册中心，或短期先上 sticky session。
2. 风险：上游断流造成静默无数据。应对：心跳 + 重连告警 + 客户端状态事件。
3. 风险：符号不一致导致“有订阅无数据”。应对：强制通过 `SymbolMappingService`，并记录 mapping miss 指标。
4. 风险：市场时段差异被误判为故障。应对：在状态事件中区分“连接健康”与“业务无增量”。

## 8. 里程碑验收标准

1. US/HK/CN 各至少 1 个 symbol 连续收到数据
2. 鉴权、symbol binding、配额在流场景生效
3. 关键指标可观测（连接/重连/广播/错误）
4. 灰度发布可开关，回滚路径明确

## 9. 建议的下一步执行顺序

1. 先确定下游协议：Socket.IO 还是 SSE（建议 Socket.IO，便于订阅控制）
2. 先做 Phase 1 单实例闭环，验证真实链路与 symbol 映射
3. 再做权限门控与多实例改造，避免一次性大改
