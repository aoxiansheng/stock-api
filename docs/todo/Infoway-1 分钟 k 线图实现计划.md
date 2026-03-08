# Infoway 分钟 K 线 API 开发文档（参数化周期）

更新时间：2026-03-08

## 1. 统一设计原则

本方案与“分时折线 API（1s）”保持同构，主要差异：
- 数据粒度：分钟 K（本方案） vs 秒级折线（分时）。
- 数据结构：分钟 K 返回 `OHLC`；分时折线返回 `timestamp + price` 点。
- 历史覆盖能力：分钟 K 可按上游分钟历史补齐；分时在仅依赖 1m 历史时不承诺全日完整 1s 历史。

其余一致：
- `Snapshot` 首次全量一次
- `WS` 推送优先
- `Delta` 仅兜底增量
- `cursor/since/nextCursor` 同步契约
- `409 CURSOR_EXPIRED` 恢复策略

上游已知边界（Infoway `batch_kline`）：
- `klineType` 支持 `1/5/15/30/60`（当前系统对分钟/小时内支持范围）。
- 单标的单次最多 `500` 根。
- 多标的同查仅支持“每个标的最近 2 根”。

当前实测结论（2026-03-08）：
- `get-stock-history` 已可返回历史 K 线序列，不是仅最近一条。
- 未传 `klineNum` 时，返回条数由后端默认配置决定（当前环境实测 `240`）。
- `POST /api/v1/receiver/data` 对外返回为扁平 `data.data[]`，不是上游 `respList`。

## 2. 目标与非目标

目标：
- 提供统一分钟 K 线接口，支持 `1m/5m/15m/30m/60m`。
- 支持首屏快照 + 后续增量更新。
- 服务端统一分桶、去重、排序、会话过滤与时区处理。

非目标：
- 不提供逐笔 tick。
- 不在本期提供日/周/月等更高周期。
- 不在本期做多 provider 对比聚合。

## 3. 对外接口设计

认证：
- 复用 `ReadAccess()`（API Key 或 JWT）

### 3.1 路径设计（参数化周期）

- `POST /api/v1/chart/kline/{granularity}/snapshot`
- `POST /api/v1/chart/kline/{granularity}/delta`

`{granularity}` 允许值：
- `1m`
- `5m`
- `15m`
- `30m`
- `60m`

映射规则：
- `granularity=1m/5m/15m/30m/60m` 分别映射 `klineType=1/5/15/30/60`。

### 3.2 首屏全量：Snapshot

示例：
- `POST /api/v1/chart/kline/1m/snapshot`

请求体：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "includePrePost": false,
  "pointLimit": 2000
}
```

约束：
- `symbol` 仅支持单标的。
- 目标能力（待实现）：命中上游单次 500 根上限时，自动分页拉取并聚合后返回。
- 当前现状：`get-stock-history` 仍是单次上游调用，返回条数受 `klineNum`（或默认值）与上游上限约束。

响应体（业务层）：
```json
{
  "kline": {
    "symbol": "AAPL.US",
    "market": "US",
    "tradingDay": "20260308",
    "granularity": "1m",
    "candles": [
      {
        "timestamp": "2026-03-08T15:42:00.000Z",
        "open": 195.70,
        "high": 195.96,
        "low": 195.66,
        "close": 195.92,
        "volume": 12345,
        "turnover": 2418567.22
      }
    ]
  },
  "sync": {
    "cursor": "base64-cursor",
    "lastPointTimestamp": "2026-03-08T15:42:00.000Z",
    "serverTime": "2026-03-08T15:42:01.120Z"
  }
}
```

### 3.3 增量兜底：Delta（仅增量）

示例：
- `POST /api/v1/chart/kline/1m/delta`

请求体：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "cursor": "base64-cursor",
  "since": "2026-03-08T15:42:00.000Z",
  "limit": 500
}
```

响应体：
```json
{
  "delta": {
    "candles": [
      {
        "timestamp": "2026-03-08T15:43:00.000Z",
        "open": 195.93,
        "high": 196.02,
        "low": 195.90,
        "close": 195.98,
        "volume": 8821,
        "turnover": 1729761.44
      }
    ],
    "hasMore": false,
    "nextCursor": "base64-next-cursor",
    "lastPointTimestamp": "2026-03-08T15:43:00.000Z",
    "serverTime": "2026-03-08T15:43:01.220Z"
  }
}
```

契约规则：
- `cursor` 与 `since` 可同时传；服务端优先 `cursor`。
- `cursor` 失效（过期/跨交易日）返回 `409 CURSOR_EXPIRED`。
- Delta 只返回新增或修正 K 线，不返回历史全量。

### 3.4 实时主通道：WebSocket

- 建议事件：`chart.kline.{granularity}.candle`（例如 `chart.kline.1m.candle`）
- 事件映射关系：上游原始事件为 `data + wsCapabilityType=stream-stock-quote`，上述事件是本系统统一后的领域事件。

## 4. 客户端接入时序（与分时折线一致）

1. 首次进入页面调用 Snapshot 一次。
2. 立即建立 WS 订阅，实时接收 K 线更新。
3. WS 正常时，不执行周期性 HTTP 轮询。
4. 仅 WS 断开或恢复阶段，开启 Delta 轮询兜底。
5. WS 恢复稳定后停止轮询。

## 5. 服务端组装规则（核心）

### 5.1 数据流
1. 历史基线：`get-stock-history` 按 `granularity -> klineType` 拉取历史。
2. 实时更新：`stream-stock-quote` 驱动当前桶 K 线更新。
3. 去重合并：按 `symbol + bucket(timestamp_utc, granularity)` upsert。
4. 输出同步锚点：`cursor + lastPointTimestamp + serverTime`。

### 5.2 分桶规则
- `1m`: `floor(ts/60000)*60000`
- `5m`: `floor(ts/300000)*300000`
- `15m`: `floor(ts/900000)*900000`
- `30m`: `floor(ts/1800000)*1800000`
- `60m`: `floor(ts/3600000)*3600000`

### 5.3 历史补齐请求次数与分页
- 缺口桶数 `N`，单次上游上限 `500`。
- 所需请求数：`C = ceil(N / 500)`。
- 分页规则：`timestamp = oldest_t - 1` 继续向前翻页。
- 状态说明：本节为目标方案；当前 `get-stock-history` 仍是单次上游调用。

## 6. 后端落地方案（文件级）

建议模块命名从 `kline1m` 调整为通用 `kline`：
- `src/core/01-entry/chart-kline/controller/chart-kline.controller.ts`
- `src/core/01-entry/chart-kline/services/chart-kline.service.ts`
- `src/core/01-entry/chart-kline/dto/kline-snapshot-request.dto.ts`
- `src/core/01-entry/chart-kline/dto/kline-delta-request.dto.ts`
- `src/core/01-entry/chart-kline/dto/kline-response.dto.ts`
- `src/core/01-entry/chart-kline/module/chart-kline.module.ts`

## 7. 缓存、错误码、测试

缓存键建议：
- Snapshot：`kline_snapshot:{provider}:{symbol}:{tradingDay}:{market}:{granularity}:{includePrePost}`
- Cursor：`kline_cursor:{provider}:{symbol}:{tradingDay}:{granularity}`

错误码：
- `400 INVALID_ARGUMENT`
- `404 NO_DATA`
- `409 CURSOR_EXPIRED`
- `503 PROVIDER_UNAVAILABLE`

测试重点：
- 多粒度映射正确性（`granularity -> klineType`）
- 首屏全量 + 后续增量闭环
- WS 断连兜底 + 恢复后停止轮询
- 分页补齐正确性（`oldest_t - 1` 翻页无重复、无断档）

## 8. 兼容策略

- 现有/历史路径 `chart/kline-1m/*` 作为兼容别名保留一段时间（若已对外发布）。
- 新接入统一使用 `chart/kline/{granularity}/*`。
- 文档与 SDK 默认示例统一迁移到参数化路径。
