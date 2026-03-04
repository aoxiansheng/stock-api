# WebSocket 接入指南（Node.js 转发给 macOS）

本文面向两类开发者：

1. 需要接入 `newstockapi` WebSocket 的 Node.js 后端开发者（转发层）
2. 通过该转发层消费实时行情的 macOS 客户端开发者

范围：`stream-stock-quote` 行情流。

## 1. 协议总览

- 协议：`Socket.IO`（仅 `websocket` 传输）
- 连接路径：`/api/v1/stream-receiver/connect`
- 典型地址：`ws://<host>:<port>/api/v1/stream-receiver/connect`
- 默认事件通道：
  - 客户端发：`subscribe` / `unsubscribe` / `ping` / `get-info`
  - 服务端回：`connected` / `subscribe-ack` / `subscribe-error` / `unsubscribe-ack` / `data` / `pong`

## 2. 鉴权方式

连接阶段必须提供 `appKey + accessToken`，支持以下三种位置（优先级按网关实现顺序）：

1. `handshake.auth`（推荐）
2. `handshake.query`
3. `headers`：`x-app-key` + `x-access-token`

权限要求：API Key 至少具备以下其一即可通过流权限检查（建议都给）：

1. `stream:read`
2. `stream:subscribe`

若权限不足，连接会报错：`Insufficient stream permissions`。

## 3. 申请凭证（appKey / accessToken）

### 3.1 一键脚本（推荐）

项目内已提供脚本：

- `scripts/tools/bootstrap-apikey.js`

示例：

```bash
BASE_URL="http://127.0.0.1:3001" node scripts/tools/bootstrap-apikey.js
```

输出中会给出：

- `APP_KEY`
- `ACCESS_TOKEN`

### 3.2 手动 API 流程

1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login`（得到 JWT）
3. `POST /api/v1/auth/api-keys`（Bearer JWT）

创建 API Key 时建议带权限：`stream:read,stream:subscribe`。

## 4. 订阅请求格式

客户端连接成功后发送：

```json
{
  "symbols": ["00700.HK", "AAPL.US", "600519.SH"],
  "wsCapabilityType": "stream-stock-quote",
  "preferredProvider": "jvquant"
}
```

字段说明：

1. `symbols`：单次最多 50 个
2. `wsCapabilityType`：默认 `stream-stock-quote`
3. `preferredProvider`：可选；接入 jvquant 时建议显式传 `jvquant`

## 5. 服务端返回事件

### 5.1 connected

```json
{
  "success": true,
  "message": "Connection established successfully",
  "data": { "clientId": "xxxx" },
  "timestamp": 1772642646097
}
```

### 5.2 subscribe-ack

```json
{
  "success": true,
  "message": "Subscription successful",
  "data": {
    "symbols": ["00700.HK", "AAPL.US", "600519.SH"],
    "wsCapabilityType": "stream-stock-quote"
  },
  "timestamp": 1772642647323
}
```

### 5.3 data（核心行情包）

`data` 事件 payload 结构：

```json
{
  "symbol": "AAPL.US",
  "timestamp": "2026-03-05T00:44:31.913Z",
  "data": [
    {
      "symbol": "AAPL.US",
      "lastPrice": 213.6,
      "volume": 123456,
      "turnover": 1234567.89,
      "timestamp": 1772642671913,
      "tradeStatus": "NORMAL"
    }
  ]
}
```

说明：

1. `data` 通常为数组（单符号批次也可能是 1 条）
2. 价格字段优先读 `lastPrice`
3. 实时场景下可能出现“某些符号一段时间无增量”

### 5.4 subscribe-error

统一错误结构：

```json
{
  "success": false,
  "error": {
    "code": "STREAM_SUBSCRIPTION_FAILED",
    "message": "..."
  },
  "timestamp": 1772642648000
}
```

## 6. 符号规范（非常关键）

`newstockapi` 流侧建议统一使用标准符号：

1. 港股：`00700.HK`
2. 美股：`AAPL.US`
3. 沪深：`600519.SH` / `000001.SZ`

如果你的下游系统（如 PulseMeter）内部使用 `AAPL`（无 `.US`），必须在转发层做双向映射：

1. 下游入站 `AAPL` -> 上游订阅 `AAPL.US`
2. 上游回包 `AAPL.US` -> 下游出站 `AAPL`

## 7. Node.js 转发层接入建议

### 7.1 上游连接（到 newstockapi）

1. 使用 `socket.io-client`
2. 固定 `transports: ["websocket"]`
3. 只维护少量共享上游连接（不要每个 macOS 客户端各建一条）

### 7.2 下游分发（给 macOS）

建议二选一：

1. 继续用 Socket.IO（双向更方便）
2. SSE（实现更轻但仅服务端推送）

### 7.3 订阅聚合

必须做两张索引：

1. `client -> symbols`
2. `symbol -> clients`

同一 symbol 被多个客户端订阅时，只发一次上游订阅。

### 7.4 可靠性

1. 上游断线自动重连
2. 重连后自动重订阅当前 symbol 集
3. 对慢消费者设置队列上限，超限后丢弃旧包并记录指标

## 8. 连通性验证

项目内验证脚本：

- `scripts/tools/test-jvquant-ws.js`

示例：

```bash
BASE_URL="http://127.0.0.1:3001" \
APP_KEY="<appKey>" \
ACCESS_TOKEN="<accessToken>" \
SYMBOLS="AAPL.US,MSFT.US,TSLA.US" \
EXPECT_MARKETS="US" \
MIN_DATA_COUNT=3 \
TIMEOUT_MS=60000 \
node scripts/tools/test-jvquant-ws.js
```

通过标志：日志出现 `[PASS] jvquant WS 流测试通过`。

## 9. 常见问题

1. `connect_error websocket error`
   - 优先检查端口、路径、服务是否监听在对应地址
2. `Insufficient stream permissions`
   - API Key 权限不足，重建含 `stream:read,stream:subscribe` 的 key
3. 只有部分市场有数据
   - 通常是市场时段或该 symbol 无增量，不一定是接入故障
