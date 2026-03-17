# 分时图 release 条件退订方案

更新时间：2026-03-17

## 1. 问题重述

原问题不是“`release` 要不要多加一个 if”，而是资源模型有偏差。

旧风险点：

- 上游实时订阅按 `symbol + provider + wsCapabilityType` 聚合
- 若把 `release` 理解成“直接退这个 symbol 的上游流”
- 则 A、B 两个不同用户同时看同一 `symbol` 时，A 的 `release` 会误伤 B

本次需要解决的目标很明确：

- 不同用户订阅同一 `symbol` 时，其中一个用户退订，不影响其他用户
- 同一用户对同一 `symbol` 的消费保持单份语义
- 不回退当前代码演进
- 不把内部实现细节继续扩散给下游 API

## 2. 为什么不继续公开 `sessionId`

如果把 `sessionId` 作为公开协议核心，会有几个问题：

1. 会直接改 API 契约，强制下游同步接入
2. 同一用户对同一 `symbol` 本来只消费一份分时图，公开 `sessionId` 属于过度建模
3. 会把内部 TTL、并发锁、WS 绑定等实现细节暴露给下游
4. 解决的是“内部隔离”问题，却让下游背了“会话管理”复杂度

因此，本次结论是：

- 内部可以继续保留 `sessionId`
- 公开协议不再要求下游显式感知 `sessionId`

## 3. 最终采用的资源模型

### 3.1 共享上游资源

- `upstreamKey = provider + wsCapabilityType + symbol`
- 系统对同一个 `upstreamKey` 只维护一份共享上游订阅

### 3.2 当前调用方租约

- `ownerLease = ownerIdentity + upstreamKey`
- `ownerIdentity` 来自当前认证主体：
  - 优先 `userId`
  - 次选 `appKey`
  - 最后退化为匿名身份

### 3.3 内部 session

内部仍保留 `sessionId`，但只作为实现细节使用，主要负责：

- TTL 续租与过期清理
- release 并发锁与幂等态
- WS client 绑定
- 遗留兼容路径

## 4. 对外协议的最终语义

### 4.1 Snapshot

- `snapshot` 不再返回公开 `sessionId`
- `snapshot` 会自动为“当前调用方 + 当前标的”创建或续用活跃租约

响应中的同步字段只保留：

```json
{
  "sync": {
    "cursor": "base64-signed-cursor",
    "lastPointTimestamp": "2026-03-17T09:30:01.000Z",
    "serverTime": "2026-03-17T09:30:01.120Z"
  }
}
```

### 4.2 Delta

- `delta` 只需要 `cursor`
- 服务端会自动续租当前调用方在该标的上的活跃租约
- 若当前调用方不存在对应活跃租约，返回 `409 LEASE_CONFLICT`

请求示例：

```json
{
  "symbol": "AAPL.US",
  "provider": "infoway",
  "cursor": "base64-signed-cursor"
}
```

### 4.3 Release

- `release` 不再要求公开 `sessionId`
- `release` 的语义是“结束我在这个标的上的租约”

请求示例：

```json
{
  "symbol": "AAPL.US",
  "provider": "infoway",
  "market": "US"
}
```

响应示例：

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

字段语义：

- `leaseReleased`
  - 当前调用方租约是否已释放

- `upstreamReleased`
  - 共享上游订阅是否已真正退掉

- `activeLeaseCount`
  - 当前 `upstreamKey` 下剩余的活跃租约数

- `graceExpiresAt`
  - 若已进入宽限期，真正执行上游退订的计划时间

### 4.4 WebSocket

当前标准接入方式：

- `subscribe` 只订阅一个 `symbol`
- 若显式传入 `preferredProvider`，服务端会按“当前调用方 + symbol + provider”精确匹配活跃租约
- 若未传 `preferredProvider`，当前实现会按“当前调用方 + symbol”查找；若命中多个 provider 的活跃租约，则按最近活跃租约回退
- 因此标准接入仍建议显式传入 `preferredProvider`
- `sessionId` 仅保留为遗留兼容字段，不再是标准接入方式

也就是说，新接入方不需要再做：

- `subscribe(symbol + sessionId)`

而是直接做：

- `subscribe(symbol + preferredProvider)`

## 5. 条件退订规则

### 5.1 当前调用方释放自己的租约

当用户 A 调用 `release(AAPL.US)` 时：

- 只释放 A 自己的租约
- 不会直接释放 B 的租约
- 不会直接把共享上游流硬退掉

### 5.2 仍有其他活跃租约

若 `upstreamKey` 下还有其他活跃租约：

- 当前 `release` 只结束自己的租约
- `upstreamReleased=false`
- 上游订阅保持不动

### 5.3 最后一个租约结束

若当前 `release` 后 `activeLeaseCount=0`：

- 不立即退上游
- 进入宽限期
- 宽限期结束后再次确认无人续租，再真正执行上游 `unsubscribe`

## 6. 为什么需要宽限期

没有宽限期会导致以下抖动场景频繁触发：

- 页面快速切换 `symbol`
- 页面短暂卸载后立即重建
- 浏览器前后台切换
- 短暂网络抖动
- WS 断开后快速重连

宽限期的目的不是拖延清理，而是避免：

- `unsubscribe`
- `subscribe`
- 再 `unsubscribe`
- 再 `subscribe`

这种高频抖动。

## 7. 与同一用户单份消费的关系

业务前提是：

- 同一用户对同一 `symbol` 只消费一份分时图

因此当前模型的好处是：

- 同一用户重复 `snapshot` 时复用同一活跃租约
- 下游不需要持有多个公开 `sessionId`
- 语义更接近真实业务，而不是把内部对象强行公开

## 8. 多实例一致性要求

该问题不能只靠单机内存态解决。

原因：

- 实例 A 看不到实例 B 的活跃租约
- A 可能误以为“没人用了”，提前退掉上游

因此需要共享状态存储统一维护：

- 租约索引
- 上游活跃计数
- release 宽限期状态
- 已释放幂等态

当前方案基于共享缓存实现这一点，而不是退回到纯本地对象模型。

## 9. 落地后的接口边界

### 9.1 前端 WebSocket `unsubscribe`

负责：

- “前端 Socket -> 我们的 WS 服务”的退订

### 9.2 HTTP `release`

负责：

- “当前调用方租约 -> 共享上游订阅”的释放判定

因此：

- 不建议用 `release` 代替 `unsubscribe`
- 若启用了前端 WS，推荐顺序仍然是先 `unsubscribe`，再 `release`

## 10. 验收用例

### 用例 1：双用户共享同一 symbol

1. A `snapshot(AAPL.US)`
2. B `snapshot(AAPL.US)`
3. A `release(AAPL.US)`
4. B 仍可继续收到未来点位

### 用例 2：同一用户重复进入同一 symbol

1. 同一用户两次 `snapshot(AAPL.US)`
2. 服务端复用现有活跃租约
3. 不应人为放大活跃租约数

### 用例 3：最后一个租约退出

1. A、B 都在消费
2. A 先 `release`
3. B 后 `release`
4. 系统进入宽限期
5. 宽限期后若仍无活跃租约，再执行上游 `unsubscribe`

### 用例 4：宽限期内重新进入

1. 最后一个租约 `release`
2. 系统进入宽限期
3. 宽限期内再次 `snapshot`
4. 应取消待退订任务
5. 上游保持订阅

## 11. 结论

本问题的正确解法不是：

- 回退到引入 `sessionId` 之前
- 或继续把 `sessionId` 扩散到公开 API

而是：

- 在当前代码基础上保留内部 session 能力
- 对外统一成“当前调用方租约”语义
- 让不同用户共享上游而互不误伤
- 让下游继续以更简单的协议接入
