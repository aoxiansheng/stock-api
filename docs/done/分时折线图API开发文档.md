# 分时折线图 API 开发文档（租约语义版）

更新时间：2026-03-20

## 1. 背景与结论

当前系统已具备：

- 历史能力：`get-stock-history`
- 实时能力：`stream-stock-quote`

分时图的目标始终是：

- 输出 `1s` 粒度点序列
- 首屏一次 `snapshot`
- 后续通过 `delta` 和可选 `WS` 持续增量推进
- 严禁每秒回拉全量历史

本次方案的核心调整不是点位协议，而是资源模型：

- 上游实时流是共享资源，按 `provider + wsCapabilityType + symbol` 聚合
- 下游消费是“当前调用方在该标的上的租约”
- 不再把 `sessionId` 暴露为公开协议的必需字段
- 不同用户同时订阅同一 `symbol` 时，其中一个用户 `release` 不会影响其他用户

结论：

- 对外协议统一改为“用户租约”语义
- 内部仍可保留 `sessionId` 作为实现细节、TTL 与兼容层
- 新接入方只需要理解 `snapshot -> delta -> release`

## 2. 核心资源模型

### 2.1 共享上游资源

- `upstreamKey = provider + wsCapabilityType + symbol`
- 同一个 `upstreamKey` 在服务端只维护一份共享上游订阅

### 2.2 当前调用方租约

- `ownerLease = ownerIdentity + upstreamKey`
- `ownerIdentity` 来自认证主体：
  - 优先 `userId`
  - 次选 `appKey`
  - 都没有时退化为匿名租约

### 2.3 关键行为

- 同一用户对同一 `symbol` 重复调用 `snapshot`，复用现有活跃租约
- 不同用户订阅同一 `symbol` 时，共享上游但各自持有独立租约
- `delta` 只续租“当前调用方自己的租约”
- `release` 只释放“当前调用方自己的租约”
- 只有最后一个活跃租约结束后，系统才会在宽限期后尝试真正退上游

## 3. 对外接口设计

认证：

- 复用 `ReadAccess()`（API Key 或 JWT）

### 3.1 Snapshot

- `POST /api/v1/chart/intraday-line/snapshot`

请求体：

```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "pointLimit": 30000
}
```

响应体：

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
    "lastPointTimestamp": "2026-03-08T15:42:00.000Z",
    "serverTime": "2026-03-08T15:42:01.120Z"
  },
 "metadata": {
    "provider": "infoway",
    "historyPoints": 240,
    "realtimeMergedPoints": 12,
    "deduplicatedPoints": 8,
    "runtimeMode": "live",
    "effectiveTradingDay": "20260308",
    "frozenSnapshotHit": false,
    "frozenSnapshotFallback": false
  }
}
```

非 `live` 且请求日冻结快照未命中时，当前实现会返回合法空快照：

```json
{
  "line": {
    "symbol": "AAPL.US",
    "market": "US",
    "tradingDay": "20260317",
    "granularity": "1s",
    "points": []
  },
  "reference": {
    "previousClosePrice": null,
    "sessionOpenPrice": null,
    "priceBase": "previous_close",
    "marketSession": "regular",
    "timezone": "America/New_York",
    "status": "unavailable"
  },
  "sync": {
    "cursor": "base64-signed-cursor",
    "lastPointTimestamp": "2026-03-17T04:00:00.000Z",
    "serverTime": "2026-03-17T04:00:01.120Z"
  },
  "metadata": {
    "provider": "infoway",
    "historyPoints": 0,
    "realtimeMergedPoints": 0,
    "deduplicatedPoints": 0,
    "runtimeMode": "frozen",
    "effectiveTradingDay": "20260317",
    "frozenSnapshotHit": false,
    "frozenSnapshotFallback": false
  }
}
```

说明：

- 当前快照仍是 `1m` 历史基线 + 实时 `1s` 窗口
- `supportsFullDay1sHistory=false` 时，不承诺完整全日秒级历史回放
- `paused / frozen` 模式不会发起新的上游历史基线拉取或参考价拉取；优先读取请求日冻结快照，未命中时允许返回空快照
- 空快照是合法 `200` 响应：`line.points=[]`、`reference.status=unavailable`，用于表达“请求上下文有效，但当前无可用请求日冻结快照”
- 空快照中的 `sync.lastPointTimestamp` 固定为“请求日市场时区 `00:00:00` 对应的 UTC 时间”
- `sync` 不再返回公开 `sessionId`
- `snapshot` 会自动为当前调用方创建或续用该标的的活跃租约

### 3.2 Delta

- `POST /api/v1/chart/intraday-line/delta`

请求体：

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

- `cursor` 必传
- `delta` 会自动续租“当前调用方 + 当前标的”的活跃租约
- 若当前调用方不存在对应活跃租约，返回 `409 LEASE_CONFLICT`
- 若 `cursor` 失效，返回 `409 CURSOR_EXPIRED`
- 若 `cursor` 格式非法、缺字段或签名不匹配，返回 `400 INVALID_ARGUMENT`
- `strictProviderConsistency=true` 时，若 `cursor.provider` 与请求 `provider` 不一致，返回 `409 CURSOR_EXPIRED`
- 无新增点位时返回 `200` 且 `delta.points=[]`、`delta.hasMore=false`，并返回新的 `nextCursor`
- `paused / frozen` 模式下，`delta` 直接返回空增量，不会触发新的上游历史、参考价或实时订阅请求
- HTTP 协议不再接受 `sessionId` 作为兼容输入；旧客户端若仍传该字段会被参数校验直接拒绝

### 3.3 WebSocket

- 连接路径：`/api/v1/stream-receiver/connect`
- 使用能力：`wsCapabilityType=stream-stock-quote`
- 分时领域事件：`chart.intraday.point`

标准订阅方式：

```json
{
  "symbols": ["AAPL.US"],
  "wsCapabilityType": "stream-stock-quote",
  "preferredProvider": "infoway"
}
```

当前行为：

- 未显式携带 `sessionId` 时，仅执行常规实时流订阅，不会自动匹配或绑定 chart-intraday 租约
- `sessionId` 仅保留为遗留兼容字段；只有显式携带 `sessionId` 时才会尝试 chart-intraday WS 绑定
- 显式携带 `sessionId` 时，`symbols` 必须且只能包含该租约对应的一个 `symbol`
- `preferredProvider` 仍可作为常规流订阅的 provider 偏好；但它本身不会触发 chart-intraday 租约自动匹配
- 只有已经绑定到分时图租约的 WS，应用层 `ping` 才会续租当前绑定租约
- 因此当前公开标准协议仍以 `snapshot + delta + release` 为主，WS 绑定属于显式 `sessionId` 的兼容/内部路径

事件载荷：

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

边界：

- `unsubscribe` 只负责“前端 Socket -> 我们的 WS 服务”
- 不会替代 `release`
- 即使启用 WS，`delta` 仍建议作为补洞与恢复通道保留

### 3.4 Release

- `POST /api/v1/chart/intraday-line/release`

请求体：

```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "provider": "infoway"
}
```

响应体：

```json
{
  "release": {
    "leaseReleased": true,
    "upstreamReleased": false,
    "reason": "RELEASED",
    "symbol": "AAPL.US",
    "market": "US",
    "provider": "infoway",
    "wsCapabilityType": "stream-stock-quote",
    "activeLeaseCount": 1,
    "graceExpiresAt": "2026-03-17T09:31:00.000Z"
  }
}
```

语义边界：

- `release` 释放的是“当前调用方自己的租约”
- 不负责替当前前端 WebSocket 连接执行 `unsubscribe`
- 若还有其他活跃租约，`upstreamReleased=false`
- 若当前调用方本来就没有活跃租约，幂等返回 `leaseReleased=false`、`reason=ALREADY_RELEASED`

## 4. 客户端接入时序

### 4.1 HTTP-only

1. 首次进入页面调用一次 `snapshot`
2. 保存 `cursor`，渲染首屏
3. 按 `1s` 轮询 `delta`
4. 遇到 `CURSOR_EXPIRED` 或 `LEASE_CONFLICT` 时重新拉取 `snapshot`
5. 页面退出或切换 `symbol` 时调用 `release`

### 4.2 HTTP + WS

1. 首次进入页面调用一次 `snapshot`
2. 若仅订阅常规实时流，可建立前端 WS，单 symbol 订阅并按需携带 `preferredProvider`
3. 未显式携带 `sessionId` 的 WS 不会自动绑定 chart-intraday 租约，因此 `delta` 仍是当前公开协议下的标准补洞与续租通道
4. 只有遗留兼容/内部场景下显式传入 `sessionId` 成功绑定后，应用层 `ping` 才会续租该 WS 绑定的分时图租约
5. 页面退出或切换 `symbol` 时，若启用了前端 WS，先 `unsubscribe`，再 `release`

## 5. 服务端实现要点

### 5.1 为什么不公开 `sessionId`

原因不是“不能做”，而是“没有必要让下游感知”：

- 同一用户对同一 `symbol` 的真实业务前提就是只消费一份分时图
- 公开 `sessionId` 会强制下游同步 API 变更
- 公开 `sessionId` 会把内部锁、TTL、实现细节暴露给外部
- 对外真正需要的只是“我现在是否持有这个标的的租约”

### 5.2 为什么仍保留内部 `sessionId`

内部保留 `sessionId` 的价值在于：

- TTL 过期清理
- release 并发锁与幂等态记录
- WS client 绑定
- 遗留兼容路径

这属于实现细节，不再要求新接入方理解它。

### 5.3 宽限期

当前 release 使用宽限期控制上游退订，目的是减少抖动：

- 页面快速切换 `symbol`
- 前后台切换
- 短暂网络抖动
- WS 断开后快速重连

只有最后一个活跃租约结束后，才会在宽限期后尝试真正 `unsubscribe` 上游。

## 6. 代码落位

入口层：

- `src/core/01-entry/receiver/controller/receiver-chart-intraday.controller.ts`
- `src/core/01-entry/receiver/services/receiver-chart-intraday.service.ts`
- `src/core/01-entry/receiver/dto/intraday-snapshot-request.dto.ts`
- `src/core/01-entry/receiver/dto/intraday-delta-request.dto.ts`
- `src/core/01-entry/receiver/dto/intraday-release-request.dto.ts`
- `src/core/01-entry/receiver/dto/intraday-line-response.dto.ts`

核心读取与租约：

- `src/core/03-fetching/chart-intraday/services/chart-intraday-read.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-runtime-orchestrator.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-session.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-cursor.service.ts`

WS 绑定入口：

- `src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`

## 7. 错误码与兼容说明

典型错误：

- `400 INVALID_ARGUMENT`
- `409 CURSOR_EXPIRED`
- `409 LEASE_CONFLICT`
- `503 PROVIDER_UNAVAILABLE`
- `503 RELEASE_IN_PROGRESS`

兼容说明：

- HTTP `delta` / `release` 已不再接受 `sessionId` 作为兼容输入
- `subscribe` 中的 `sessionId` 仅保留为遗留兼容字段；未显式携带时不会自动绑定 chart-intraday 租约
- 新接入统一不应再依赖公开 `sessionId` 语义

## 8. 验收要点

### 8.1 不同用户共享同一 symbol

1. 用户 A `snapshot(AAPL.US)`
2. 用户 B `snapshot(AAPL.US)`
3. 用户 A `release(AAPL.US)`
4. 用户 B 仍可持续收到未来点位

### 8.2 同一用户重复进入同一 symbol

1. 同一用户两次 `snapshot(AAPL.US)`
2. 服务端应复用同一活跃租约
3. 不应因为重复进入而人为放大活跃租约数

### 8.3 最后一个租约退出

1. 最后一个用户 `release(AAPL.US)`
2. 服务端进入宽限期
3. 宽限期结束且仍无活跃租约时，才真正释放上游订阅

## 9. 结论

本次落地不是回退到“没有 session 的旧实现”，也不是继续把 `sessionId` 扩散到公开 API，而是：

- 在当前代码基础上保留内部 session 机制
- 对外统一成“当前调用方租约”语义
- 让不同用户共享上游而互不误伤
- 让下游继续以 `snapshot + delta + release + 可选常规 WS` 的简单模型接入
- 将显式 `sessionId` 的 WS 绑定收敛为遗留兼容/内部路径，而不是公开标准接入方式
