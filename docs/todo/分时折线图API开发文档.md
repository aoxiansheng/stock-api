# 分时折线图 API 开发文档（推送优先 + 轮询兜底）

更新时间：2026-03-08

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

当前实测结论（2026-03-08）：
- `get-stock-history` 当前可返回历史 K 线序列（不是仅最近一条）。
- 在未传 `klineNum` 时，返回条数由后端默认配置决定（当前环境实测为 `240` 条）。
- 因此分时折线在“无秒级历史库”前提下，首屏历史基线能力受该默认值影响。

## 2. 目标与非目标

目标：
- 提供统一分时折线接口，直接输出 `timestamp + price` 点位。
- 首屏一次拉全量快照，后续持续增量更新。
- 服务端统一秒桶、去重、排序、会话过滤与时区处理。

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
  "includePrePost": false,
  "pointLimit": 30000
}
```

参数说明：
- `pointLimit=30000` 为目标上限设计值，不代表当前环境必然可返回 30000 个 `1s` 历史点。
- 当前现状下（无秒级历史库），快照中的历史基线主要受 `get-stock-history` 可回填范围影响。

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
  "sync": {
    "cursor": "eyJ2IjoxLCJsYXN0VGltZSI6IjIwMjYtMDMtMDhUMTU6NDI6MDAuMDAwWiIsInNlcSI6MTI4fQ==",
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
- `supportsFullDay1sHistory=false` 时，表示当前快照中的 `1s` 点位来自实时流窗口，不是完整当日秒级历史回放。
- `supportsFullDay1sHistory=true` 仅在后端具备秒级历史存储/回放能力后成立。

### 3.2 增量兜底：Delta（仅增量）

- `POST /api/v1/chart/intraday-line/delta`

请求体：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "includePrePost": false,
  "cursor": "eyJ2IjoxLCJsYXN0VGltZSI6IjIwMjYtMDMtMDhUMTU6NDI6MDAuMDAwWiIsInNlcSI6MTI4fQ==",
  "since": "2026-03-08T15:42:00.000Z",
  "limit": 2000
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
    "nextCursor": "eyJ2IjoxLCJsYXN0VGltZSI6IjIwMjYtMDMtMDhUMTU6NDI6MDEuMDAwWiIsInNlcSI6MTMwfQ==",
    "lastPointTimestamp": "2026-03-08T15:42:01.000Z",
    "serverTime": "2026-03-08T15:42:01.220Z"
  }
}
```

契约规则：
- `cursor` 与 `since` 可同时传；服务端优先 `cursor`。
- 若 `cursor` 失效（过期/跨交易日），返回 `409 CURSOR_EXPIRED`，客户端需重新拉 Snapshot。
- Delta 只返回新增或修正点，不返回历史全量。

### 3.3 实时主通道：WebSocket

- 建议事件：`chart.intraday.point`
- 事件映射关系：上游原始事件为 `data + wsCapabilityType=stream-stock-quote`，`chart.intraday.point` 是本系统统一后的领域事件。
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
  "cursor": "eyJ2IjoxLCJsYXN0VGltZSI6IjIwMjYtMDMtMDhUMTU6NDI6MDIuMDAwWiIsInNlcSI6MTMxfQ=="
}
```

## 4. 客户端接入时序（强约束）

1. 首次进入页面，调用 Snapshot 一次，渲染当前可得的全量快照（分钟基线 + 秒级增量窗口）。
2. 立即建立 WS 订阅，持续接收 `chart.intraday.point`。
3. WS 正常时，不执行每秒 HTTP 轮询。
4. 仅当 WS 断开或重连恢复阶段，开启 `1s` Delta 轮询兜底。
5. WS 恢复稳定后，停止轮询，仅保留 WS。

说明：
- “每秒 1 次”是兜底策略，不是常态主路径。
- 任意时刻都不允许每秒重新拉全量历史。
- 在未建设秒级历史库前，首屏快照的历史基线来自 `1m` 数据，随后由 WS/Delta 补齐秒级实时点。

## 5. 服务端组装规则（核心）

### 5.1 数据流
1. 历史回填：`ReceiverService.handleRequest`，`receiverType=get-stock-history`（`1m` 基线）。
2. 实时合并：读取 `stream-stock-quote` 最新成交价事件。
3. 标准化：映射为 `IntradayPoint`（`timestamp/price/volume`）。
4. 去重：按 `symbol + second(timestamp_utc)` upsert。
5. 排序：时间升序输出。
6. 同步锚点：输出 `cursor + lastPointTimestamp + serverTime`。

### 5.2 秒桶与修正规则
- 分桶键：`bucket = floor(timestamp_utc / 1000) * 1000`
- 同秒冲突：后到事件覆盖先到值（以事件时间+序号判定）。
- 允许“同秒修正”通过 Delta/WS 重发该秒点，客户端按秒键覆盖。

### 5.3 会话过滤
- 默认仅常规交易时段。
- `includePrePost=true` 时，包含盘前盘后秒级点（若 provider 支持）。

## 6. 代码落地方案（文件级）

建议新建入口模块：
- `src/core/01-entry/chart-intraday/controller/chart-intraday.controller.ts`
- `src/core/01-entry/chart-intraday/services/chart-intraday.service.ts`
- `src/core/01-entry/chart-intraday/dto/intraday-snapshot-request.dto.ts`
- `src/core/01-entry/chart-intraday/dto/intraday-delta-request.dto.ts`
- `src/core/01-entry/chart-intraday/dto/intraday-line-response.dto.ts`
- `src/core/01-entry/chart-intraday/module/chart-intraday.module.ts`

应用装配：
- `src/appcore/core/application.module.ts` 注册 `ChartIntradayModule`

复用依赖：
- `ReceiverService`：历史数据
- `MarketStatusService`：交易日/会话判断
- `SmartCacheStandardizedService`：Snapshot 短 TTL 缓存

## 7. 缓存与性能建议

缓存键：
- Snapshot：`intraday_snapshot:{provider}:{symbol}:{tradingDay}:{market}:{includePrePost}`
- Delta 游标态：`intraday_cursor:{provider}:{symbol}:{tradingDay}`

TTL（建议）：
- Snapshot（交易时段）：`3s ~ 5s`
- Snapshot（非交易时段）：`60s`
- Cursor：覆盖当交易日并在收盘后延长 `2h`

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

典型错误：
- `400 INVALID_ARGUMENT`：参数非法
- `404 NO_DATA`：无可用点位
- `409 CURSOR_EXPIRED`：游标过期或跨交易日
- `503 PROVIDER_UNAVAILABLE`：上游不可用

## 9. 测试计划

单元测试：
- 秒桶归并、同秒覆盖、跨秒排序
- `cursor/since` 优先级与增量切片正确性
- 会话过滤（常规/盘前盘后）

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

除上述差异外，接口模式（Snapshot/Delta/WS）、恢复策略（cursor/since）、错误码、接入时序保持一致。
