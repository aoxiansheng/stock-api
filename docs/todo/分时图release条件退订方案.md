# 分时图 release 条件退订方案

更新时间：2026-03-14

## 1. 背景

当前分时图接口在 `snapshot` / `delta` 内部会自动确保对应 `symbol` 的上游实时订阅存在，并通过 `POST /api/v1/chart/intraday-line/release` 显式释放。

现状问题在于：

- 上游实时订阅当前按 `symbol + provider + wsCapabilityType` 聚合。
- `release` 当前也是按这组维度直接释放。
- 服务面向多个下游消费者时，只要其中一个消费者调用 `release`，就可能把其他仍在消费同一标的的下游一起影响掉。

因此，`release` 不能继续理解为“退订这个 symbol”，而应理解为“结束当前消费者自己的分时图消费会话”。

## 2. 问题定义

当前的核心冲突不是权限，而是资源建模：

- 上游实时流本质上是共享资源。
- 下游页面/客户端本质上是多个独立消费者。
- 如果不区分“共享资源”和“消费者会话”，就无法做到条件退订。

需要解决的问题：

1. 一个消费者退出时，不能影响其他仍在消费相同 `symbol` 的消费者。
2. 最后一个消费者退出后，应能自动释放上游订阅，避免资源泄漏。
3. 页面切换、前后台切换、短暂断线等场景下，不应频繁拉起/释放上游流。
4. 多实例部署下，条件退订逻辑必须在全局一致，而不是仅在单进程内成立。

## 3. 目标与非目标

目标：

- 将上游实时订阅改造为共享资源。
- 将 `release` 改造为“释放我的消费会话”。
- 只有在没有任何活跃消费者时，才真正执行上游 `unsubscribe`。
- 为上游释放增加宽限期，减少抖动。
- 与现有 `snapshot` / `delta` / 可选前端 WS 接入方式兼容演进。

非目标：

- 不在本方案内修改行情点位协议本身。
- 不在本方案内讨论新的图表点位字段。
- 不把前端 WebSocket `unsubscribe` 和内部 `release` 强行合并为单一动作。

## 4. 核心设计

### 4.1 两层资源模型

建议引入两层对象：

1. 共享上游资源 `upstreamKey`

- 建议组成：`provider + wsCapabilityType + symbol`
- 含义：系统对上游只维护一条共享实时订阅

2. 下游消费会话 `sessionId`

- 含义：某个下游页面/客户端的一次分时图消费生命周期
- 一个 `upstreamKey` 可以关联多个 `sessionId`

设计原则：

- `sessionId` 退出时，只释放自己的占用
- `upstreamKey` 只有在活跃 `sessionId` 数量变成 `0` 时，才允许真正退上游

### 4.2 release 的新语义

`release` 不再表示：

- “把这个 symbol 的上游流退掉”

而应表示：

- “结束当前调用方持有的分时图消费会话”

也就是说，`release` 释放的是“消费者占用”，不是直接释放共享资源本身。

### 4.3 条件退订规则

建议规则如下：

1. 若 `upstreamKey` 下仍有其他活跃 `sessionId`
- 当前 `release` 只释放自己的 `sessionId`
- 不执行上游 `unsubscribe`

2. 若 `upstreamKey` 下已无活跃 `sessionId`
- 不立即退上游
- 进入一个短暂宽限期

3. 宽限期结束后再次检查
- 如果仍无活跃 `sessionId`，再执行上游 `unsubscribe`
- 如果期间有新的 `sessionId` 加入，则取消退订

## 5. 协议设计建议

### 5.1 Snapshot 返回 sessionId

建议在 `snapshot` 响应中新增：

```json
{
  "sync": {
    "cursor": "base64-signed-cursor",
    "sessionId": "chart_session_xxx",
    "lastPointTimestamp": "2026-03-14T09:30:01.000Z",
    "serverTime": "2026-03-14T09:30:01.120Z"
  }
}
```

语义：

- 首次 `snapshot` 创建一次新的分时图消费会话
- 后续 `delta` / `release` 均使用该 `sessionId`

### 5.2 Delta 续租 session

建议 `delta` 请求新增：

```json
{
  "symbol": "AAPL.US",
  "provider": "infoway",
  "cursor": "base64-signed-cursor",
  "sessionId": "chart_session_xxx"
}
```

语义：

- 表示“我仍在继续使用这个分时图会话”
- 服务端刷新该 `sessionId` 的活跃时间

### 5.3 Release 按 session 释放

建议 `release` 请求新增：

```json
{
  "symbol": "AAPL.US",
  "provider": "infoway",
  "market": "US",
  "sessionId": "chart_session_xxx"
}
```

建议响应升级为：

```json
{
  "release": {
    "sessionReleased": true,
    "upstreamReleased": false,
    "symbol": "AAPL.US",
    "provider": "infoway",
    "wsCapabilityType": "stream-stock-quote",
    "activeSessionCount": 2,
    "graceExpiresAt": null
  }
}
```

字段语义：

- `sessionReleased`
  当前调用方的会话是否已释放

- `upstreamReleased`
  上游共享订阅是否已真正被退掉

- `activeSessionCount`
  该 `upstreamKey` 下当前还剩多少活跃会话

- `graceExpiresAt`
  如果已进入宽限期，真正退上游的计划时间

### 5.4 前端 WS 与 release 的边界保持不变

当前边界建议继续保持：

- WebSocket `unsubscribe`
  负责“下游前端 -> 我们”的推送退订

- HTTP `release`
  负责“我们 -> 上游”的内部订阅释放判定

本方案不建议直接用 `release` 替代前端 `unsubscribe`，因为 `release` 面向的是共享资源占用，不是具体 Socket 连接。

## 6. 状态机建议

### 6.1 创建

- 首次 `snapshot`
- 创建 `sessionId`
- 将 `sessionId` 绑定到某个 `upstreamKey`
- 如该 `upstreamKey` 尚未建立共享上游订阅，则自动拉起

### 6.2 活跃

- `delta` 请求刷新 `sessionId.lastSeenAt`
- 若启用了前端 WS 且暂停 `delta`，则需要额外心跳或 WS 级会话续租

### 6.3 释放

- 调用 `release(sessionId)`
- 从 `upstreamKey` 的活跃会话集合中移除当前 `sessionId`

### 6.4 延迟退订

- 若移除后仍有其他活跃会话，则直接结束，不退上游
- 若移除后活跃会话为 `0`，则进入宽限期

### 6.5 真正退上游

- 宽限期到期时再次检查
- 若仍无活跃会话，则执行上游 `unsubscribe`

## 7. 宽限期设计

### 7.1 为什么必须有宽限期

若没有宽限期，以下场景会导致抖动：

- 页面快速切换 symbol
- 页面短暂卸载后立即重建
- 浏览器前后台切换
- 短暂网络抖动
- 前端重连

这些场景容易产生：

- 先 `release`
- 数百毫秒到数秒后又 `snapshot`

没有宽限期会导致上游频繁：

- `unsubscribe`
- `subscribe`
- 再 `unsubscribe`
- 再 `subscribe`

### 7.2 建议值

建议宽限期：

- 开发环境：`15s ~ 30s`
- 生产环境：`30s ~ 120s`

推荐默认值：

- `60s`

## 8. 会话所有权与安全

### 8.1 sessionId 必须绑定调用方

`sessionId` 不能只是一个可猜字符串，必须绑定创建者身份。

建议绑定信息：

- `appKeyId` 或 `userId`
- `symbol`
- `provider`
- `market`
- `createdAt`
- `lastSeenAt`

### 8.2 release 必须校验归属

服务端在处理 `release(sessionId)` 时，应校验：

- 当前调用方是否为该 `sessionId` 的所有者
- `sessionId` 的上下文是否与请求中的 `symbol/provider/market` 一致

否则会出现：

- A 消费者误释放 B 消费者会话

### 8.3 幂等性

`release` 应设计为幂等：

- 同一个 `sessionId` 连续释放多次，不应报错
- 可返回：
  - `sessionReleased=false`
  - `reason=ALREADY_RELEASED`

## 9. 多实例部署要求

这是本方案最重要的现实约束。

如果服务是多实例部署，仅靠单进程内存态无法正确实现条件退订。

原因：

- 实例 A 看不到实例 B 的活跃会话
- A 可能误以为“没人用了”，提前退上游
- 实际上 B 仍有消费者在用

因此：

- 单机开发环境可用本地内存实现原型
- 生产环境必须使用共享状态存储

推荐共享存储：

- Redis

建议维护的共享结构：

1. `session:{sessionId}`
- 保存会话元数据、所有权、活跃时间、状态

2. `upstream:{provider}:{capability}:{symbol}`
- 保存活跃 `sessionId` 集合或引用计数

3. `pending-unsubscribe:{upstreamKey}`
- 保存宽限期截止时间

## 10. 与 HTTP-only / HTTP+WS 的关系

### 10.1 HTTP-only

特点：

- 前端主要靠 `snapshot + delta`
- `delta` 本身天然可作为会话续租

建议：

- `snapshot` 创建 `sessionId`
- `delta` 持续刷新
- 页面退出时调用 `release(sessionId)`

### 10.2 HTTP + WS

特点：

- 前端可能在 WS 稳定后暂停高频 `delta`

这会带来一个关键问题：

- 如果没有新的 `delta`，服务端如何知道该 `sessionId` 仍在活跃？

因此二选一必须成立：

1. WebSocket `subscribe` 时带上 `sessionId`
- 由 WS 连接状态或心跳刷新该 `sessionId`

2. 增加独立心跳能力
- 例如 `heartbeat(sessionId)`

若两者都没有，则：

- 会出现页面还在看图
- 但服务端误把该 `sessionId` 当作过期会话
- 进而提前退掉上游

所以，若未来正式引入 `sessionId` 模型，HTTP + WS 模式必须补“会话续租来源”。

## 11. 兼容演进策略

### 阶段一：新增但不强制

- `snapshot` 返回 `sessionId`
- `delta` / `release` 开始支持 `sessionId`
- 老客户端可暂时不传

### 阶段二：默认走安全路径

对不带 `sessionId` 的 `release`，不再默认执行硬退上游。

建议策略：

- 返回兼容成功但 `upstreamReleased=false`
- 或返回显式提示需要升级协议

目标是优先避免“一个旧客户端误伤所有共享消费者”。

### 阶段三：收紧协议

- `release` 必须带 `sessionId`
- 彻底移除“按 symbol 直接退订”的危险语义

## 12. 可观测性建议

建议新增以下观测指标：

- `chart_intraday_active_sessions`
- `chart_intraday_upstream_shared_subscriptions`
- `chart_intraday_release_requests_total`
- `chart_intraday_release_upstream_released_total`
- `chart_intraday_release_deferred_total`
- `chart_intraday_pending_unsubscribe_total`
- `chart_intraday_session_expired_total`

建议关键日志字段：

- `sessionId`
- `upstreamKey`
- `activeSessionCount`
- `ownerIdentity`
- `releaseReason`
- `graceExpiresAt`

## 13. 验收用例

### 用例 1：单消费者正常释放

- A 调 `snapshot`
- A 调 `release`
- 无其他活跃会话
- 宽限期结束后，上游被释放

### 用例 2：双消费者共享

- A 调 `snapshot`
- B 调 `snapshot`
- A 调 `release`
- B 仍正常收到未来数据
- 上游不应被释放

### 用例 3：最后一个消费者退出

- A、B 都在消费
- A 先 `release`
- B 后 `release`
- 进入宽限期
- 宽限期后执行上游 `unsubscribe`

### 用例 4：宽限期内重新进入

- A `release`
- 系统进入宽限期
- 宽限期内 C 重新 `snapshot`
- 应取消待退订任务
- 上游保持订阅

### 用例 5：跨实例共享

- A 在实例 1 创建会话
- B 在实例 2 创建会话
- A 在实例 1 调 `release`
- 由于实例 2 仍有活跃会话，上游不得被释放

## 14. 推荐结论

本问题的根本解法不是“给 `release` 加一个条件 if”，而是把资源模型改正确：

- 上游订阅是共享资源
- 下游消费是会话占用
- `release` 释放的是会话，不是 symbol
- 只有最后一个会话结束后，才条件退订上游
- 多实例环境必须使用共享状态存储

建议最终统一语义：

- `release` = “结束我的分时图消费会话”

不再使用：

- `release` = “把这个 symbol 的上游实时流直接退掉”
