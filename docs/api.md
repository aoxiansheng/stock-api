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
  "statusCode": 401,
  "message": "未授权访问",
  "error": "Unauthorized",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/query/execute"
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
- 缓存策略（市场感知，默认启用）：交易 1s、盘前盘后 5s、休市 60s。

## 弱时效接口（Query）

### `POST /api/v1/query/execute`
- 已实现的查询类型：`by_symbols`
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
      "dataSources": { "cache": 1, "realtime": 0, "persistent": 0 },
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
- 认证（其一）：
  - `handshake.auth`: `{ appKey, accessToken }`
  - 或 `?appKey=...&accessToken=...`
  - 或 头：`X-App-Key`, `X-Access-Token`
- 事件：
  - `subscribe` → 订阅 `{ symbols: string[], wsCapabilityType?: "stream-stock-quote", preferredProvider?: string }`
    - 成功：`subscribe-ack`；失败：`subscribe-error`
  - `unsubscribe` → 取消订阅 `{ symbols: string[], wsCapabilityType?: "stream-stock-quote" }`
    - 成功：`unsubscribe-ack`；失败：`unsubscribe-error`
  - `data` → 服务器按 `symbol:<SYMBOL>` 房间广播推送数据
  - `ping`/`pong`，`request-recovery` 补发流，`get-info` 连接信息
- 权限：`stream:read`, `stream:subscribe`

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

