# 分时折线图 API 开发文档（推送优先 + 轮询兜底）

更新时间：2026-03-17

## 1. 背景与结论

当前系统已具备：
- 历史能力：`get-stock-history`（分钟级历史序列，可作为分时基线）
- 实时能力：`stream-stock-quote`（实时推送最新成交价，不再是 K 线映射）

业务目标是“分时折线图”（类似心电图折线）：
- 不是逐笔成交明细。
- 不是蜡烛 K 线图。

结论：
- 分时图采用 **1 秒粒度（`1s`）点序列**。
- 接入模式采用 **推送优先（WS）+ 轮询兜底（HTTP delta）**。
- 规则固定为：**首次全量一次，后续仅增量**，严禁每秒全量拉历史。
- 与“1 分钟 K 线 API”保持同构，除粒度、返回字段与历史覆盖能力外其余契约一致。
- 能力边界：若仅依赖上游 `get-stock-history(1m)`，则 Snapshot 为“分钟历史基线 + 秒级实时增量窗口”，不承诺全交易日完整 `1s` 历史。

当前实测结论（2026-03-14）：
- `get-stock-history` 当前可返回历史 K 线序列（不是仅最近一条）。
- 当前 `snapshot` 实现会根据 `pointLimit` 主动推导并传入 `klineNum`，公式为 `ceil(pointLimit / 60)`，并受上限 `500` 约束；因此当前实现不再依赖“未传 `klineNum` 时上游默认返回 240 条”的行为。
- 因此分时折线在“无秒级历史库”前提下，首屏历史基线能力主要受 `pointLimit -> klineNum` 推导结果与上游 `500` 根上限约束。

## 2. 目标与非目标

目标：
- 提供统一分时折线接口，直接输出 `timestamp + price` 点位。
- 首屏一次拉全量快照，后续持续增量更新。
- 服务端统一秒桶、去重、排序与交易日过滤（按市场时区）。

非目标：
- 不提供 tick 逐笔明细。
- 不提供 1 分钟 K 线 OHLC 接口（该能力单独规划）。
- 不在本期做多 provider 对比聚合。

## 3. 对外接口设计

认证：
- 复用 `ReadAccess()`（API Key 或 JWT）

### 3.1 首屏全量：Snapshot

- `POST /api/v1/chart/intraday-line/snapshot`

请求体（MVP）：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "pointLimit": 30000
}
```

参数说明：
- `pointLimit=30000` 为目标上限设计值，不代表当前环境必然可返回 30000 个 `1s` 历史点。
- 当前现状下（无秒级历史库），`snapshot` 返回的是“历史基线 + 当前实时窗口”的合并快照，不是纯历史回放。
- 当前快照中的历史基线主要受 `pointLimit -> klineNum` 推导结果与 `get-stock-history` 单次最多 `500` 根约束影响。

响应体（业务数据层）：
```json
{
  "line": {
    "symbol": "AAPL.US",
    "market": "US",
    "tradingDay": "20260308",
    "granularity": "1s",
    "points": [
      {
        "timestamp": "2026-03-08T14:30:00.000Z",
        "price": 195.89,
        "volume": 12345
      }
    ]
  },
  "capability": {
    "snapshotBaseGranularity": "1m",
    "supportsFullDay1sHistory": false
  },
  "reference": {
    "previousClosePrice": 194.83,
    "sessionOpenPrice": 195.12,
    "priceBase": "previous_close",
    "marketSession": "regular",
    "timezone": "America/New_York",
    "status": "complete"
  },
  "sync": {
    "cursor": "base64-signed-cursor",
    "sessionId": "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
    "lastPointTimestamp": "2026-03-08T15:42:00.000Z",
    "serverTime": "2026-03-08T15:42:01.120Z"
  },
  "metadata": {
    "provider": "infoway",
    "historyPoints": 240,
    "realtimeMergedPoints": 12,
    "deduplicatedPoints": 8
  }
}
```

说明：
- `supportsFullDay1sHistory=false` 时，表示当前快照中的 `1s` 点位由“`1m` 历史基线 + 实时流窗口”拼接而成，不是完整当日秒级历史回放。
- `supportsFullDay1sHistory=true` 仅在后端具备秒级历史存储/回放能力后成立。
- `sync.sessionId` 为分时图消费会话标识；后续 `delta`、`release` 与可选 `WS subscribe(sessionId)` 均依赖它。
- `reference` 为分时图基准参考值，由后端按市场语义统一计算，供前端直接消费：
  - `previousClosePrice`：昨收参考价
  - `sessionOpenPrice`：本交易日/本 UTC 日开盘参考价
  - `priceBase`：当前固定为 `previous_close`
  - `marketSession`：`US/HK/CN` 为 `regular`，`CRYPTO` 为 `utc_day`
  - `timezone`：参考值对应的市场时区
  - `status`：`complete | partial | unavailable`
- 参考值计算规则：
  - `US/HK/CN`：通过日 K 取“当前交易日 open + 上一交易日 close”
  - `CRYPTO`：通过 UTC 日 K 取“当日 open + 前一日 close”

### 3.2 增量兜底：Delta（仅增量）

- `POST /api/v1/chart/intraday-line/delta`

请求体：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "cursor": "base64-signed-cursor",
  "sessionId": "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
  "limit": 2000,
  "strictProviderConsistency": false
}
```

响应体：
```json
{
  "delta": {
    "points": [
      {
        "timestamp": "2026-03-08T15:42:01.000Z",
        "price": 195.92,
        "volume": 540
      }
    ],
    "hasMore": false,
    "nextCursor": "base64-next-cursor",
    "lastPointTimestamp": "2026-03-08T15:42:01.000Z",
    "serverTime": "2026-03-08T15:42:01.220Z"
  }
}
```

契约规则：
- `cursor` 必传。
- `sessionId` 必传，且必须来自最近一次有效 `snapshot`。
- `since` 当前不在请求 DTO 白名单中，传入会触发 `400 INVALID_ARGUMENT`。
- 若 `cursor` 失效（过期/跨交易日），返回 `409 CURSOR_EXPIRED`，客户端需重新拉 Snapshot。
- 若 `sessionId` 已释放、已过期或与上下文不匹配，返回 `409 SESSION_CONFLICT`，客户端也需重新拉 Snapshot。
- 若 `cursor` 格式非法、缺字段或签名不匹配，返回 `400 INVALID_ARGUMENT`。
- `strictProviderConsistency=true` 时，若 `cursor.provider` 与请求 `provider` 不一致，返回 `409 CURSOR_EXPIRED`。
- Delta 只返回新增或修正点，不返回历史全量。

### 3.3 实时主通道：WebSocket

- 建议事件：`chart.intraday.point`
- 事件映射关系：上游原始事件为 `data + wsCapabilityType=stream-stock-quote`，`chart.intraday.point` 是本系统统一后的领域事件。
- 前端订阅方式：连接 `/api/v1/stream-receiver/connect`，发送 `subscribe + wsCapabilityType=stream-stock-quote`。
- 若需要把当前 Socket 绑定到分时图 session，应在 `subscribe` 中额外携带 `sessionId`，且 `symbols` 必须且只能包含该 session 对应的一个 symbol。
- `chart.intraday.point` 是下游接收的事件名，不是单独的 `wsCapabilityType`。
- 当前实现按秒桶聚合后广播：同一秒最多发送一个点；跨秒但价格未变化时，不强制发送新点。
- 若前端要停止接收推送，应对当前 Socket 发送 `unsubscribe`；这一步只作用于“下游到我们”的 WebSocket 订阅。
- 若 WS 稳定后暂停高频 `delta`，前端还需要持续发送应用层 `ping` 续租当前 session；建议 `30s` 一次。
- 载荷建议：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "granularity": "1s",
  "point": {
    "timestamp": "2026-03-08T15:42:02.000Z",
    "price": 195.95,
    "volume": 320
  },
  "cursor": "base64-signed-cursor"
}
```

### 3.4 生命周期释放：Release

- `POST /api/v1/chart/intraday-line/release`
- 作用：释放分时图 API 在 `snapshot` / `delta` 内部自动拉起的上游实时订阅。
- 不负责：替前端当前 WebSocket 连接执行 `unsubscribe`。

请求体：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "provider": "infoway",
  "sessionId": "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a"
}
```

语义边界：
- `unsubscribe`：负责“下游前端 -> 我们的 WebSocket 服务”
- `release`：负责“我们的分时图服务 -> 上游实时流能力”

幂等语义：

- 重复释放同一个 `sessionId` 不报错
- 重复释放返回 `200`
- 典型业务层载荷会体现：
  - `sessionReleased=false`
  - `reason=ALREADY_RELEASED`
- `reason=ALREADY_RELEASED` 只表示该 session 已结束，不表示“本次请求刚刚完成了上游退订”
- `upstreamReleased` 与 `graceExpiresAt` 需要按服务端当前观测状态解读；若部署为多实例，其共享一致性必须以专门回归结果为准，不能在未验证前写成“已完全收口”

补充说明：

- `release` 之后，原 `sessionId` 不可继续用于 `delta` 或 `WS subscribe(sessionId)`
- 若要继续消费，必须重新拉取 `snapshot` 获取新的 `sessionId`

因此：
- HTTP-only 模式通常只需要 `release`
- HTTP + WS 模式通常需要先 `unsubscribe`，再 `release`

## 4. 客户端接入时序（强约束）

1. 首次进入页面，调用 Snapshot 一次，拿到 `cursor + sessionId`，渲染当前可得的全量快照（`1m` 历史基线 + 当前秒级实时窗口）。
2. 若启用前端 WS，立即建立订阅，并在 `subscribe` 中携带 `sessionId`。
3. WS 正常时，可暂停高频 HTTP 轮询，但需要继续发送应用层 `ping` 续租当前 session。
4. 仅当 WS 断开或重连恢复阶段，开启 `1s` Delta 轮询兜底；Delta 请求始终携带当前 `sessionId`。
5. 遇到 `CURSOR_EXPIRED` 或 `SESSION_CONFLICT` 时，重新拉取 Snapshot，刷新 `cursor + sessionId`。
6. WS 恢复稳定后，停止高频 Delta，仅保留 WS + `ping`。
7. 页面退出或切换 symbol 时，若启用了前端 WS，先发送 `unsubscribe`。
8. 随后调用 `POST /api/v1/chart/intraday-line/release`，释放分时图接口内部自动拉起的上游订阅。

说明：
- “每秒 1 次”是兜底策略，不是常态主路径。
- 任意时刻都不允许每秒重新拉全量历史。
- 在未建设秒级历史库前，首屏快照由 `1m` 历史基线与当前 `stream-cache` 实时秒级窗口合并而成，随后主要由 WS 推进，Delta 仅作兜底。
- 不建议试图用 `release` 代替 `unsubscribe`，因为 `release` 不携带具体 Socket/客户端上下文，无法安全表达“要退掉哪个前端连接”。

## 5. 服务端组装规则（核心）

### 5.1 数据流
1. 请求上下文解析：标准化 `symbol/market/tradingDay/provider`，并做参数一致性校验。
2. 历史回填：通过 `DataFetcherService.fetchRawData` 拉取 `get-stock-history`（`1m` 基线）。
3. 实时合并：从 `stream-cache` 读取 `quote:<SYMBOL>` 实时点位。
4. 标准化：统一映射为 `IntradayPoint`（`timestamp/price/volume`）。
5. 去重：按秒桶（`floor(timestamp/1000)*1000`）写入，历史先写、实时后写（实时覆盖同秒历史）。
6. 排序与截断：按时间升序输出，并按 `pointLimit` 仅保留尾部窗口。
7. 同步锚点：输出 `cursor + lastPointTimestamp + serverTime`。

### 5.2 秒桶与修正规则
- 分桶键：`bucket = floor(timestamp_utc / 1000) * 1000`
- 同秒冲突：后写覆盖先写（当前实现为历史先写、实时后写）。
- 允许“同秒修正”通过 Delta/WS 重发该秒点，客户端按秒键覆盖。

### 5.3 会话过滤
- 当前实现按 `tradingDay` 进行交易日过滤（市场时区维度）。
- 当前未提供 `includePrePost` 参数；若请求体传入该字段，会触发 `400`（非白名单字段）。

## 6. 代码落地方案（文件级）

当前代码落位（已实现）：
- `src/core/01-entry/receiver/controller/receiver-chart-intraday.controller.ts`
- `src/core/01-entry/receiver/services/receiver-chart-intraday.service.ts`
- `src/core/01-entry/receiver/dto/intraday-snapshot-request.dto.ts`
- `src/core/01-entry/receiver/dto/intraday-delta-request.dto.ts`
- `src/core/01-entry/receiver/dto/intraday-line-response.dto.ts`
- `src/core/01-entry/receiver/module/receiver-chart-intraday.module.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-read.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-cursor.service.ts`
- `src/core/03-fetching/chart-intraday/module/chart-intraday.module.ts`
- `src/core/03-fetching/chart-intraday/module/chart-intraday-cursor.module.ts`

应用装配：
- `src/app.module.ts` 注册 `ReceiverChartIntradayModule`

复用依赖：
- `DataFetcherService`：历史数据拉取（`get-stock-history`）
- `SymbolTransformerService`：标的映射
- `ProviderRegistryService`：provider 解析
- `StreamDataFetcherService`（`getStreamDataCache`）：实时流缓存读取
- `ChartIntradayCursorService`：游标签名与校验

## 7. 当前缓存与性能行为（实现）

缓存键：
- 实时点读取：`quote:<SYMBOL>`（来自 `stream-cache`）。
- 当前未实现 `intraday_snapshot:*` 独立快照缓存键。
- `cursor` 为签名载荷，不依赖服务端持久游标态。

时效与上限（当前实现）：
- Cursor 最大有效期：`2h`（含少量未来漂移容忍）。
- 历史回填最大请求根数：`500`（由 `pointLimit` 推导并截断）。

性能目标（MVP）：
- Snapshot P95 `< 800ms`（缓存命中 `< 100ms`）
- Delta P95 `< 150ms`
- WS 端到端推送延迟 P95 `< 300ms`

## 8. 错误码与校验

请求校验：
- `symbol` 必填且格式合法（如 `AAPL.US`）
- `tradingDay` 可选；缺省按市场当日交易日推断
- `pointLimit` 建议 `1 ~ 30000`
- `delta.limit` 建议 `1 ~ 5000`
- `cursor` 与 `sessionId` 为 Delta 必填
- `sessionId` 为 Release 必填
- `includePrePost`、`since` 当前不在白名单，传入将触发 `400`

典型错误：
- `400 INVALID_ARGUMENT`：参数非法
- `404 NO_DATA`：无可用点位
- `409 CURSOR_EXPIRED`：游标过期或跨交易日
- `409 SESSION_CONFLICT`：session 无效、已释放、已过期或与当前上下文不匹配
- `503 PROVIDER_UNAVAILABLE`：上游不可用

## 9. 测试计划

单元测试：
- 秒桶归并、同秒覆盖、跨秒排序
- `cursor` 签名校验、过期校验、上下文一致性与增量切片正确性
- `tradingDay` 过滤与跨日数据剔除

集成测试：
- Snapshot + WS + Delta 兜底闭环
- WS 断连后 1s 轮询补齐、恢复后停止轮询
- 不同市场样例（US/HK/CN）

E2E：
- 首屏仅一次 Snapshot，全程无“每秒全量”请求
- WS 正常时仅收推送；WS 故障时 Delta 补齐且最终一致

## 10. 迁移与兼容策略

- 不改动现有 `get-stock-history` 与 `stream-stock-quote` 对外语义。
- 新分时 API 上线后，客户端切到“Snapshot + WS + Delta”模式。
- 旧客户端若仍发送 `includePrePost`/`since`，需先下线该参数再切换。
- 保留灰度开关，必要时可回退到旧客户端拼接方案。

## 11. 文档同步要求

上线前同步更新：
- `docs/api.md`：新增 `intraday-line/snapshot`、`intraday-line/delta`、WS 事件说明
- `docs/其他应用开发者对接指南.md`：新增接入时序与错误处理示例
- `docs/done/Infoway-能力说明汇总.md`：补充“分时折线（1s）”能力与接入约束

## 12. 与 1 分钟 K 线 API 差异对照（主要差异）

- 粒度：
  - 分时折线：`granularity="1s"`
  - 1 分钟 K 线：`granularity="1m"`
- 数据字段：
  - 分时折线：`timestamp/price/volume`
  - 1 分钟 K 线：`open/high/low/close/volume/turnover`
- 历史覆盖能力（仅依赖上游 1m 历史时）：
  - 分时折线：Snapshot 为 `1m` 历史基线 + `1s` 实时增量窗口，不承诺全日完整 `1s` 历史。
  - 1 分钟 K 线：可通过上游分页补齐完整分钟历史（单标的每次最多 500 根）。

除上述差异外，接口模式（Snapshot/Delta/WS）、恢复策略（cursor）、错误码、接入时序保持一致。
