# 分时图 API 协议统一方案

更新时间：2026-03-20 23:42:10 +0800  
版本：v1  
状态：待开发

## 1. 文档定位

本文解决的是**整个分时图 API 的公开消费模型收敛问题**，不是单独讨论 `release`。

目标是把当前分裂的半成品协议，收敛成一条清晰、可消费、可测试的标准路径：

- `snapshot` 只负责首屏全量初始化
- WebSocket 才是主实时通道
- `delta` 只在 WS 断线、重连补洞时使用
- `release` 负责收尾释放

同时必须满足：

- 不要求前端显式管理 `sessionId`
- 不让一个消费者的 `release` 误伤其他消费者
- 不再让“公开协议”和“内部实现”处于分裂状态

## 2. 当前目标态

标准消费链路应当只有一条：

1. 前端先调用 `POST /api/v1/chart/intraday-line/snapshot`
2. 服务端返回首屏全量数据，并建立当前 owner 的分时图租约
3. 前端基于 `snapshot` 响应提供的信息建立 WebSocket 订阅
4. 服务端通过 WS 持续推送 `chart.intraday.point`
5. 前端每次收到 WS 事件，都更新图表并刷新本地最新 `cursor`
6. 若 WS 断线或重连后存在缺口，前端调用 `POST /api/v1/chart/intraday-line/delta` 补洞
7. 页面销毁或不再消费时，前端先取消 WS 订阅，再调用 `POST /api/v1/chart/intraday-line/release`

一句话概括：

> `snapshot` 负责建基线，WS 负责主增量，`delta` 负责补洞，`release` 负责收尾。

## 3. 当前代码为什么是“半收敛状态”

当前代码不是没有能力，而是公开协议和内部机制停在中间状态。

### 3.1 已有的内部能力

- `snapshot` 内部确实会创建分时图 session  
  见 `src/core/03-fetching/chart-intraday/services/chart-intraday-read.service`
- runtime orchestrator 已按 owner lease 打开 snapshot session  
  见 `src/core/03-fetching/chart-intraday/services/chart-intraday-runtime-orchestrator.service`
- WS 网关已经支持“显式传入 `sessionId` 时做 chart-intraday 绑定”  
  见 `src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`
- stream 侧发出的 `chart.intraday.point` 事件里，已经带有 `cursor`  
  见 `src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service`

这些事实说明，当前实现方向本来就已经明显偏向：

- WS 主推送
- `delta` 补洞
- `sessionId` 只应当留在内部

### 3.2 当前公开协议的断裂点

当前卡点有 5 个：

1. `snapshot` 会创建 session，但公开响应已经不再返回 `sessionId`
2. WS 网关的 chart-intraday 绑定逻辑仍主要依赖“显式传入 `sessionId`”
3. 没有 `sessionId` 的标准 WS 订阅路径，不会自动按 owner lease 查找并绑定分时图租约
4. WS 事件明明已经带 `cursor`，却没有被正式收敛成“主增量协议”
5. `release` 仍主要按 chart lease/session 语义工作，尚未完全收敛成“收尾释放且不误伤其他消费者”

所以现在的实际状态是：

- 内部有 session 机制
- 公开响应不再交付 session
- WS 主通道没有收敛成无 `sessionId` 标准路径
- `delta` 和 WS 的职责边界不够明确

结果就是：

- 实现方向已经偏向“WS 主推送 + `delta` 补洞”
- 但公开协议还没真正到这个状态

## 4. 根因分析

### 4.1 内部 session 还在，但公开协议不想暴露它

这是正确方向。

`sessionId` 本质上是内部对象，用来处理：

- owner lease 绑定
- TTL 续租
- client 绑定
- 并发释放
- 幂等释放

这些都不应该继续扩散到前端。

问题不在于“不返回 `sessionId`”，而在于：

- 不返回 `sessionId` 之后，缺少一条新的**公开标准绑定路径**

### 4.2 WS 标准路径没有自动接上 owner lease

当前 gateway 在 `sessionId` 存在时，会走 chart-intraday 校验与绑定流程。  
但当 `sessionId` 不存在时，当前逻辑只会建立普通 stream 订阅，不会自动按：

- `ownerIdentity + symbol + provider`

去查找刚刚由 `snapshot` 建立的分时图租约。

这就是当前公开协议最核心的断点。

### 4.3 WS 事件已经具备补洞契约，但没有被正式提升为主通道

现在 `chart.intraday.point` 事件已经带：

- `symbol`
- `market`
- `tradingDay`
- `point`
- `cursor`

这意味着：

- 前端已经可以直接把 WS 最新 `cursor` 用作断线补洞起点

也就是说，代码已经具备“WS 主增量 + `delta` 补洞”的核心数据契约，只是协议说明和接入方式还没有收敛完成。

### 4.4 `release` 只是整个链路的最后一环

`release` 的确要修，但它只是整条消费链路的尾部。

如果前面三段没有统一：

- `snapshot`
- WS
- `delta`

那单独把 `release` 修好，也无法让分时图 API 真正“顺起来”。

## 5. 最终公开协议定义

### 5.1 Snapshot

职责：

- 首屏全量初始化
- 建立或续用当前 owner 的分时图租约
- 返回前端初始化图表所需的全量基线
- 返回后续实时消费所需的最小同步信息

标准要求：

- `snapshot` 不返回公开 `sessionId`
- `provider` 继续保持可选
- 若未显式传 provider，服务端自动解析，并在响应中返回实际 provider

前端在 `snapshot` 完成后，必须至少拿到：

- `line`
- `reference`
- `sync.cursor`
- `metadata.provider`

建议本轮补齐一个最小实时提示块，例如：

- `sync.realtime.wsCapabilityType`
- `sync.realtime.event`

目的不是增加复杂度，而是让前端不必自己硬编码 market 与 WS capability 的映射关系。

### 5.2 WebSocket

职责：

- 作为分时图的主实时增量通道

标准路径：

- 前端在 `snapshot` 成功后，使用：
  - `symbol`
  - `preferredProvider = snapshot.metadata.provider`
  - 对应 `wsCapabilityType`
  建立 WS 订阅

服务端标准行为应改成：

- 如果订阅请求显式带 `sessionId`，继续保留遗留兼容路径
- 如果订阅请求**不带 `sessionId`**，但满足分时图标准场景：
  - 单 symbol
  - owner 已认证
  - provider 可确定
  则服务端自动按 owner lease 查找对应分时图租约，并绑定当前 WS client

也就是说，标准分时图接入不应再要求：

- `subscribe(symbol + sessionId)`

而应收敛成：

- `snapshot`
- `subscribe(symbol + preferredProvider)`

### 5.3 Delta

职责：

- 只做 WS 断线、重连后的补洞

标准要求：

- `delta` 不再被当作主轮询通道
- `delta` 的起点 cursor 优先使用“最近一次收到的 WS 事件里的 cursor”
- 若当前 owner lease 不存在，继续返回 `409 LEASE_CONFLICT`
- 若 cursor 失效，继续返回 `409 CURSOR_EXPIRED`

前端标准行为：

1. 保留最近一次成功处理的 cursor
2. WS 断线后重连
3. 先用最近 cursor 调 `delta`
4. 把缺口补齐后继续消费 WS

### 5.4 Release

职责：

- 结束当前 owner 的分时图租约
- 尝试回收不再需要的共享上游资源

标准要求：

- `release` 不要求公开 `sessionId`
- `release` 只释放当前 owner 的 lease
- 是否真正退掉共享上游，必须由共享 consumer 事实决定

收尾顺序建议为：

1. 前端先 `unsubscribe`
2. 再调用 `release`

`release` 的最终语义应为：

- `leaseReleased = true`：当前 owner 的 lease 已释放
- `upstreamReleased = true`：共享上游已真实退订

多人共享同一标的时：

- A 的 `release` 不应影响 B
- 只有最后一个有效消费者退出后，才允许真实退订上游

## 6. 不公开 `sessionId` 的前提下，协议如何真正串起来

这是本轮最关键的问题。

答案是：

- 保留 `sessionId` 作为内部对象
- 对外改为**owner lease 自动绑定**

当前代码里已经有两块现成能力：

- `findRealtimeOwnerLease(...)`
- `bindClientToOwnerLease(...)`

这说明最小改造方向不是重新公开 `sessionId`，而是：

1. `snapshot` 建立 owner lease
2. WS 标准订阅到来时，服务端自动查找对应 owner lease
3. 找到后，把当前 WS client 绑定到该 lease 对应的内部 session

这样前端只需要记住：

- `symbol`
- `provider`
- `cursor`

不需要感知：

- `sessionId`
- 内部租约结构
- 内部 session 生命周期

## 7. 开发目标

### 7.1 协议目标

- 对外形成唯一标准消费模型：
  - `snapshot -> WS -> delta -> release`
- 不回退到公开 `sessionId`
- 不把 `delta` 继续当成主实时通道

### 7.2 实现目标

- `snapshot` 建立 owner lease
- WS 无 `sessionId` 时可以自动绑定 owner lease
- WS 事件成为主增量事实源
- `delta` 使用 snapshot 或 WS 事件中的 cursor 补洞
- `release` 不误伤其他消费者

### 7.3 文档与测试目标

- 文档只保留一种标准接入路径
- API 合约测试覆盖标准消费链路
- WS 主通道与 `delta` 补洞都要有可回归脚本

## 8. 开发步骤

### 步骤 1：定义并补齐 snapshot 的实时提示信息

目标：

- 让 `snapshot` 响应能直接告诉前端“后续应该怎么接 WS”

涉及文件：

- `src/core/01-entry/receiver/dto/intraday-line-response.dto.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-read.service.ts`

建议最小改动：

- 在 `sync` 下新增最小实时提示字段
- 至少返回：
  - `wsCapabilityType`
  - `event = "chart.intraday.point"`
  - `preferredProvider = metadata.provider`

验收条件：

- 前端不需要再靠外部文档猜测 capability
- `snapshot` 本身就能引导下一步 WS 订阅

### 步骤 2：把 WS 无 `sessionId` 的标准路径接到 owner lease

目标：

- 让“`snapshot` 后直接走 WS”真正成立

涉及文件：

- `src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service.ts`

具体做法：

1. 保留现有“显式 `sessionId` 绑定”兼容路径
2. 在未传 `sessionId` 时，若满足分时图标准场景：
   - 单 symbol
   - owner 已认证
   - provider 可确定
   则自动调用 owner lease 查找逻辑
3. 查找到 owner lease 后，复用现有 session 绑定流程，把当前 client 绑定进该 lease

验收条件：

- 前端不传 `sessionId` 也能完成 chart-intraday WS 标准绑定
- `snapshot -> subscribe(symbol + preferredProvider)` 可以跑通

### 步骤 3：正式把 WS 事件收敛成主增量协议

目标：

- 明确 `chart.intraday.point` 是标准主增量事件

涉及文件：

- `src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service.ts`
- 文档与测试脚本

具体做法：

1. 固化事件字段契约：
   - `symbol`
   - `market`
   - `tradingDay`
   - `granularity`
   - `point`
   - `cursor`
2. 把“最近一次 WS cursor”定义为 `delta` 补洞的标准起点

验收条件：

- WS 事件字段稳定
- 前端可以只依赖 WS 事件不断刷新本地 cursor

### 步骤 4：把 delta 收敛成补洞接口

目标：

- 从协议层明确 `delta` 的角色，不再和 WS 争夺主增量职责

涉及文件：

- `src/core/03-fetching/chart-intraday/services/chart-intraday-read.service.ts`
- 文档与测试脚本

具体做法：

1. 保持 `delta` 当前 cursor 协议不变
2. 文档和测试统一改成：
   - `delta` 只在 WS 中断、重连后调用
3. 保留当前 owner lease 续租语义

验收条件：

- 文档中不再出现“前端主循环依赖 `delta`”
- 标准测试按“WS 主通道、`delta` 补洞”执行

### 步骤 5：修正 release，使其成为整条链路的正确收尾

目标：

- release 既收尾，又不误伤其他消费者

涉及文件：

- `src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service.ts`
- `src/core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service.ts`
- `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
- `src/core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service.ts`

具体做法：

1. consumer 统计改为按共享上游域而不是裸 `symbol`
2. 区分 internal consumer 与 external consumer
3. `unsubscribeStream()` 返回结构化退订结果
4. `release` 只在共享上游真实退订时才返回 `upstreamReleased=true`

验收条件：

- 多消费者场景下，一个消费者 `release` 不影响其他消费者
- 最后一个消费者退出后，才真实退订上游

### 步骤 6：补齐端到端回归

目标：

- 用自动化证明整条协议已经统一

测试范围：

1. `snapshot -> WS subscribe(no sessionId) -> receive chart.intraday.point`
2. 记录 WS cursor 后，断线再调用 `delta` 补洞
3. `unsubscribe + release` 收尾
4. 双身份同时消费同一 symbol，其中一方 release 不影响另一方
5. `provider` 省略时，依旧能通过 `snapshot.metadata.provider` 走完整链路

## 9. 明确不做的事

本轮不做以下方向：

- 不把公开协议退回到 `sessionId`
- 不引入新的分时图专用 WS 端点
- 不保留“两套并列标准接入方式”
- 不继续把 `delta` 当成主实时通道

## 10. 最终判断

当前真正的问题，不是 `release` 单点，而是整个分时图公开协议还停在中间态。

必须一次性收敛这四段职责：

- `snapshot`
- WebSocket
- `delta`
- `release`

本轮的正确方向是：

1. `snapshot` 建立 owner lease，并返回足够的实时提示
2. WS 无 `sessionId` 自动按 owner lease 绑定
3. WS 事件成为主增量通道，并持续产出可用于补洞的 cursor
4. `delta` 退回到补洞角色
5. `release` 成为不误伤其他消费者的收尾动作

只有这样，分时图 API 才算真正“可以用起来”，而不是继续停留在内部实现和公开协议分裂的状态。
