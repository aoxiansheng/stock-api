# 智能股票数据系统 API 说明

> 版本：1.0.0
> 基础路径：`/api/v1`

- 认证模型：JWT（用户会话）与 API Key（第三方/自动化）双栈
- 响应标准：统一顶层包装（ResponseInterceptor）
- 数据通道：强时效 `/receiver/*`；弱时效 `/query/*`；实时流 Socket.IO `/stream-receiver/connect`

## 统一认证

### JWT
- `POST /api/v1/auth/register` 注册
- `POST /api/v1/auth/login` 登录，返回 `{ accessToken, refreshToken }`
- `POST /api/v1/auth/refresh` 刷新 Token

### API Key（需 JWT 调用）
- `POST /api/v1/auth/api-keys` 创建 API Key（可指定 `profile: READ|ADMIN`、`permissions`、`expiresIn` 如 `30d`）
- `GET /api/v1/auth/api-keys` 列表
- `DELETE /api/v1/auth/api-keys/:appKey` 撤销

HTTP 请求头（API Key）：
- `X-App-Key: <appKey>`
- `X-Access-Token: <accessToken>`

最小只读权限（READ_PROFILE）：
- `data:read`, `query:execute`, `providers:read`, `stream:read`, `stream:subscribe`

## 响应格式（统一）

顶层（所有端点）：
```
{
  "success": true,
  "statusCode": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```
错误（全局异常过滤统一翻译）：
```
{
  "success": false,
  "statusCode": 401,
  "message": "未授权访问",
  "data": null,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "error": {
    "code": "UNAUTHORIZED",
    "details": {
      "type": "AuthenticationError",
      "path": "/api/v1/query/execute"
    }
  }
}
```

## 强时效接口（Receiver）

`POST /api/v1/receiver/data`
- 认证：API Key 或 JWT（只读权限）
- Request
```
{
  "symbols": ["AAPL.US", "00700.HK"],
  "receiverType": "get-stock-quote",
  "options": {
    "preferredProvider": "longport",
    "realtime": true,
    "fields": ["symbol", "lastPrice", "volume"],
    "market": "US",
    "storageMode": "short_ttl"
  }
}
```
- Response（关键路径）
```
{
  "success": true,
  "statusCode": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "symbol": "AAPL",
        "lastPrice": 195.89,
        "change": 2.31,
        "changePercent": 1.19,
        "volume": 45678900,
        "market": "US",
        "timestamp": "2025-01-01T12:00:01.789Z"
      }
    ],
    "metadata": {
      "provider": "longport",
      "requestId": "...",
      "processingTimeMs": 23,
      "successfullyProcessed": 1,
      "totalRequested": 1,
      "hasPartialFailures": false,
      "timestamp": "2025-01-01T12:00:01.789Z"
    }
  },
  "timestamp": "2025-01-01T12:00:01.789Z"
}
```
- 缓存策略（当前实现）：`STRONG_TIMELINESS` 使用统一强时效 TTL（`realTimeTtlSeconds`，默认 5s，可通过环境变量调整）。
- `receiverType` 当前支持能力：
  - `get-stock-quote`
  - `get-crypto-basic-info`
  - `get-stock-basic-info`
  - `get-stock-history`
  - `get-index-quote`
  - `get-market-status`
  - `get-trading-days`

### 新增能力说明（Infoway）

`get-market-status`
- 用途：查询市场交易时段与状态信息
- 常用参数：`symbols[]`、`options.market`

`get-trading-days`
- 用途：查询交易日/半日市信息
- 常用参数：`options.market`、`options.beginDay`、`options.endDay`
- 约束：
  - 交易日查询是市场级能力，结果由 `options.market + beginDay + endDay` 决定
  - `AAPL.US` 这类 `symbols` 不参与交易日结果计算，不应被理解为业务查询条件
  - `beginDay/endDay` 仅允许用于 `get-trading-days`
  - 日期格式为 `YYYYMMDD`
  - 区间需满足 `beginDay <= endDay`（服务端范围约束：`19000101` 到 `20991231`，最大 366 天）

`get-stock-history`（补充约束）
- `symbols` 必须且只能包含 1 个标的
- `options.timestamp` 仅支持 10/13 位正整数时间戳
- `options.klineNum` 最大 500

`get-stock-basic-info`（字段契约）
- 上游（Infoway）原始字段为 `snake_case`（如 `name_cn`、`eps_ttm`、`stock_derivatives`）。
- 本地接口业务层统一输出 `camelCase`（由 data-mapper 规则转换），例如：
  - `name_cn -> nameCn`
  - `name_en -> nameEn`
  - `name_hk -> nameHk`
  - `lot_size -> lotSize`
  - `total_shares -> totalShares`
  - `circulating_shares -> circulatingShares`
  - `hk_shares -> hkShares`
  - `eps_ttm -> epsTtm`
  - `dividend_yield -> dividendYield`
  - `stock_derivatives -> stockDerivatives`
- 推荐最小校验字段：`symbol`、`market`、`exchange`、`currency`、`board`。

示例：`get-stock-basic-info` 业务数据层（已过映射）
```json
{
  "data": [
    {
      "symbol": "AMD.US",
      "market": "US",
      "nameCn": "AMD",
      "nameEn": "Advanced Micro Devices, Inc.",
      "nameHk": "AMD",
      "exchange": "NASD",
      "currency": "USD",
      "lotSize": 1,
      "totalShares": 1630410843,
      "circulatingShares": 1621366616,
      "hkShares": 0,
      "eps": "2.6588390396272653",
      "epsTtm": "2.6588390396272653",
      "bps": "38.6399540155658791",
      "dividendYield": "0",
      "stockDerivatives": "1",
      "board": "Unknown"
    }
  ]
}
```

示例：`get-trading-days`（核心业务参数）
```json
{
  "receiverType": "get-trading-days",
  "options": {
    "market": "US",
    "beginDay": "20260101",
    "endDay": "20260131"
  }
}
```

补充说明：
- 若走当前 `/api/v1/receiver/data` 通用请求结构，外层仍可能携带 `symbols` 字段；该字段在 `get-trading-days` 中仅作协议兼容占位，不作为交易日查询条件。

示例：`get-market-status`
```json
{
  "symbols": ["00700.HK"],
  "receiverType": "get-market-status",
  "options": {
    "market": "HK"
  }
}
```

## 分时折线接口（Chart Intraday）

### `POST /api/v1/chart/intraday-line/snapshot`
- 认证：API Key 或 JWT（只读权限）
- 语义：首屏全量快照（当前实现为 `1m` 历史基线 + 实时 `1s` 增量窗口）
- 参数约束：
  - `symbol` 必填（单标的）
  - `market` 可选；缺省时由 `symbol` 推断
  - `tradingDay` 可选；缺省时按市场时区推断当日
  - `provider` 可选；缺省为 `infoway`
  - 若显式传入 `market` 且与 `symbol` 推断市场冲突，返回 `400 INVALID_ARGUMENT`
- Request
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "pointLimit": 30000
}
```
- Response（业务数据层）
```json
{
  "line": {
    "symbol": "AAPL.US",
    "market": "US",
    "tradingDay": "20260308",
    "granularity": "1s",
    "points": [
      {
        "timestamp": "2026-03-08T15:42:00.000Z",
        "price": 195.92,
        "volume": 540
      }
    ]
  },
  "capability": {
    "snapshotBaseGranularity": "1m",
    "supportsFullDay1sHistory": false
  },
  "sync": {
    "cursor": "base64-signed-cursor",
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
- 说明：
  - `supportsFullDay1sHistory=false` 表示当前并非完整全日秒级历史回放。
  - 顶层仍由统一响应包装器包裹（`success/statusCode/message/data/timestamp`）。

### `POST /api/v1/chart/intraday-line/delta`
- 认证：API Key 或 JWT（只读权限）
- 语义：仅返回增量，不回放全量历史
- 参数约束：
  - `cursor` 必传
  - `market`/`tradingDay`/`provider` 可选；缺省时优先使用 `cursor` 上下文
  - 若显式传入 `market` 且与 `symbol` 推断市场冲突，返回 `400 INVALID_ARGUMENT`
- Request
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "cursor": "base64-signed-cursor",
  "limit": 2000,
  "strictProviderConsistency": false
}
```
- Response（业务数据层）
```json
{
  "delta": {
    "points": [
      {
        "timestamp": "2026-03-08T15:42:01.000Z",
        "price": 195.95,
        "volume": 320
      }
    ],
    "hasMore": false,
    "nextCursor": "base64-next-cursor",
    "lastPointTimestamp": "2026-03-08T15:42:01.000Z",
    "serverTime": "2026-03-08T15:42:01.220Z"
  }
}
```
- 规则：
  - `cursor` 为必传参数。
  - `strictProviderConsistency=true` 时，要求 `cursor.provider` 与请求 `provider` 一致（不一致返回 `409 CURSOR_EXPIRED`）。
  - `cursor` 跨上下文、过期、签发时间异常时返回 `409 CURSOR_EXPIRED`。
  - `cursor` 缺字段、格式非法或签名不匹配时返回 `400 INVALID_ARGUMENT`。
  - 未提供 `cursor` 或传入已废弃的 `since` 参数时返回 `400 INVALID_ARGUMENT`。
  - 无新增点位时返回 `200` 且 `delta.points=[]`、`delta.hasMore=false`，并返回新的 `nextCursor`（`lastPointTimestamp` 回退为 `cursor.lastPointTimestamp`）。
  - 典型错误：`400 INVALID_ARGUMENT`、`503 PROVIDER_UNAVAILABLE`。

#### Cursor 协议（snapshot / delta / WS 统一）

`cursor` 为 base64 编码的 JSON，明文字段如下：
```json
{
  "v": 1,
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "lastPointTimestamp": "2026-03-08T15:42:01.000Z",
  "issuedAt": "2026-03-08T15:42:01.220Z",
  "sig": "hmac_sha256_hex"
}
```
- `sig` 为签名字段；服务端会校验 payload 完整性，篡改后会被拒绝。
- `provider` 可选；当 `strictProviderConsistency=true` 时会参与一致性校验。
- 调试提示：验证“签名篡改”时，应先 base64 解码 cursor、修改字段、保留原 `sig` 后再 base64 编码；不要仅做字符串拼接（例如 `cursor + "tampered"`），否则可能被解码端忽略尾部噪声导致误判。

## 弱时效接口（Query）

### `POST /api/v1/query/execute`
- 已实现的查询类型：`by_symbols`
- `queryTypeFilter` 当前支持能力：
  - `get-stock-quote`
  - `get-crypto-basic-info`
  - `get-stock-basic-info`
  - `get-stock-history`
  - `get-index-quote`
  - `get-market-status`
  - `get-trading-days`
- Request
```
{
  "queryType": "by_symbols",
  "symbols": ["AAPL", "MSFT"],
  "provider": "longport",
  "queryTypeFilter": "get-stock-quote",
  "limit": 50,
  "options": { "useCache": true, "includeMetadata": true }
}
```

- 示例：`get-trading-days`（`startTime/endTime` 会映射为 `beginDay/endDay`）
```
{
  "queryType": "by_symbols",
  "symbols": ["AAPL.US"],
  "provider": "infoway",
  "queryTypeFilter": "get-trading-days",
  "market": "US",
  "startTime": "20260101",
  "endTime": "20260131",
  "options": { "useCache": true }
}
```
- Response（关键路径）
```
{
  "data": {
    "data": {
      "items": [ { "symbol": "AAPL", "lastPrice": 195.89 } ],
      "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false }
    },
    "metadata": {
      "queryType": "by_symbols",
      "totalResults": 1,
      "returnedResults": 1,
      "executionTime": 89,
      "cacheUsed": true,
      "dataSources": {
        "cache": { "hits": 1, "misses": 0 },
        "realtime": { "hits": 0, "misses": 0 }
      },
      "timestamp": "2025-01-01T12:00:01.789Z"
    }
  }
}
```

### `POST /api/v1/query/bulk`
- 并行/串行执行多查询；返回统计摘要与每项结果。

### `GET /api/v1/query/symbols`
- 便捷 GET（内部转发至 `execute`）。
- `?symbols=AAPL,MSFT&provider=longport&queryTypeFilter=get-stock-quote&limit=10&useCache=true`

> 说明：`by_market|by_provider|by_tag|by_time_range|advanced` 框架就绪但默认未实现，将返回业务错误。

## WebSocket 实时流（Socket.IO）

- 连接：`GET /api/v1/stream-receiver/connect`（仅 `websocket`）
- 连接认证（API Key）：
  - `handshake.auth`: `{ appKey, accessToken }`
  - 或 头：`X-App-Key`, `X-Access-Token`
- 事件：
  - 已落地流能力：`stream-stock-quote`（可在 `subscribe` 中通过 `wsCapabilityType` 指定）
  - `subscribe` → 订阅 `{ symbols: string[], wsCapabilityType?: "stream-stock-quote", preferredProvider?: string }`
    - 成功：`subscribe-ack`；失败：`subscribe-error`
  - `unsubscribe` → 取消订阅 `{ symbols: string[], wsCapabilityType?: "stream-stock-quote" }`
    - 成功：`unsubscribe-ack`；失败：`unsubscribe-error`
  - `data` → 服务器按 `symbol:<SYMBOL>` 房间广播推送数据（兼容事件）
  - `chart.intraday.point` → 分时领域事件（新增），载荷示例：
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
  - `ping`/`pong`，`request-recovery` 补发流，`get-info` 连接信息
- 权限检查：需具备流权限画像（实现为 `stream:read` 或 `stream:subscribe` 命中其一即可通过）。

### 客户端示例（Node）
```
import { io } from 'socket.io-client'
const socket = io('http://localhost:3001', { path: '/api/v1/stream-receiver/connect', transports: ['websocket'], auth: { appKey, accessToken } })
socket.emit('subscribe', { symbols: ['AAPL.US'], wsCapabilityType: 'stream-stock-quote' })
socket.on('data', (payload) => { /* handle */ })
```

## 性能与缓存

- 强时效 P95 目标 < 2000ms（测试对环境/TTL敏感）
- Redis：基础缓存（DB=0），流缓存（DB=1），键空间由模块前缀隔离
- 诊断脚本：
  - `scripts/verify-response-format.sh`
  - `scripts/trigger-and-diagnose-cache.sh`
  - `scripts/stream-broadcast-smoke.sh`

## 常见错误

- 401 未授权：缺少 JWT 或 API Key
- 403 权限不足：角色/权限不满足
- 4xx 参数校验：按字段返回详细信息
- 5xx 上游/网关：统一翻译与日志追踪

---

建议：结合 Swagger 文档（`/api-docs`），并以本文为基线校对字段与路径，确保与实际响应完全一致。
