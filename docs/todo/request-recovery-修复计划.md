# request-recovery 修复计划

## 1. 目标与结论

当前 `request-recovery` 属于“核心链路已实现，但闭环未完成”。
本计划目标是在不改架构的前提下，补齐最小缺口，使其达到可观测、可验证、可稳定上线的状态。

修复完成标准：
- 手动补发请求只在服务端确认成功后返回 `recovery-started`。
- `get-recovery-status` 返回真实状态而非占位值。
- recovery 的能力类型与主订阅链路一致（`stream-stock-quote`）。

## 2. 当前问题清单

### 2.1 状态接口未实现（P1）
- 现状：`get-recovery-status` 返回硬编码占位（`recoveryActive=false`、`pendingJobs=0`）。
- 影响：客户端无法判断补发是否进行中，无法做重试/超时控制。
- 位置：`src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`

### 2.2 能力名不一致（P1）
- 现状：`request-recovery` 内固定传 `wsCapabilityType: "quote"`。
- 影响：与当前实际 WS 能力 `stream-stock-quote` 不一致，可能导致 provider 选择和订阅行为偏差。
- 位置：`src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`

### 2.3 成功回执时机错误（P0）
- 现状：gateway 调用 `handleClientReconnect` 后未检查返回 `success`，直接发送 `recovery-started`。
- 影响：可能出现“补发启动成功”的假阳性回执，误导客户端状态机。
- 位置：`src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`

## 3. 修复范围（MVP）

仅修复以下三点，不扩展新功能：
- 修正回执逻辑（按 `success` 分支返回）。
- 统一 recovery 能力名为 `stream-stock-quote`。
- 实现最小可用的 recovery status 查询。

明确不做：
- 不新增历史持久化存储。
- 不引入新消息协议版本。
- 不重构现有 stream pipeline。

## 4. 设计与改动方案

### 4.1 网关回执逻辑修正

改动点：`handleRecoveryRequest`
- 接收 `handleClientReconnect(...)` 返回值为 `reconnectResult`。
- 仅当 `reconnectResult.success === true` 时发送 `recovery-started`。
- 当 `success === false` 时发送 `recovery-error`，错误内容包含：
  - `code`: `recovery_start_failed`
  - `message`: 透传服务端失败原因
  - `context`: `clientId`、`symbolsCount`

收益：避免“假成功”。

### 4.2 能力名统一

改动点：`handleRecoveryRequest`
- 将硬编码 `quote` 改为 `stream-stock-quote`。
- 若项目已有 capability 常量，改为引用常量，避免字符串重复。

收益：与主订阅链路一致，减少 provider 解析歧义。

### 4.3 recovery status 最小实现

目标：返回“当前客户端”真实的补发状态，不追求全局复杂监控。

实现建议：
- 在 `StreamRecoveryWorkerService` 增加只读状态查询能力（例如：`getClientRecoveryStatus(clientId)`）。
- 该状态至少包含：
  - `recoveryActive: boolean`
  - `pendingJobs: number`
  - `lastRecoveryTime: number | null`
  - `lastJobId: string | null`
- `gateway.get-recovery-status` 调用 worker/status service 返回真实值。

约束：
- 保持内存态实现即可；重启丢失可接受（MVP）。
- 字段命名保持向后兼容，不破坏现有客户端解析。

## 5. 文件级实施清单

1. `src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway.ts`
- 修复 `request-recovery` 的 success 判定与回执。
- 统一 `wsCapabilityType`。
- 将 `get-recovery-status` 从占位实现切到真实状态读取。

2. `src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service.ts`
- 增加客户端维度的恢复状态记录与查询接口。
- 在 job submit / start / completed / failed 生命周期更新状态。

3. `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
- 视需要补充错误透传字段，便于 gateway 构造 `recovery-error`。

4. （可选）常量文件
- 若已有 capability 常量，统一引入；若没有则新增最小常量声明并复用。

## 6. 测试计划

### 6.1 单元测试

- `gateway.request-recovery`
  - reconnect 成功 -> 发送 `recovery-started`
  - reconnect 失败 -> 发送 `recovery-error`
- `gateway.get-recovery-status`
  - worker 返回 active/pending -> 网关正确透传
- `recovery-worker status`
  - submit 后状态进入 pending/active
  - complete 后状态变为 inactive，更新时间
  - fail 后状态标记失败并可查询

### 6.2 集成测试（本地）

场景 A：正常补发
1. 建立 WS 订阅并接收数据。
2. 模拟断线并记录 `lastReceiveTimestamp`。
3. 发送 `request-recovery`。
4. 断言先收到 `recovery-started`，再收到 `recovery-data`。

场景 B：异常补发
1. 构造非法时间戳或触发 reconnect 失败。
2. 发送 `request-recovery`。
3. 断言收到 `recovery-error`，且不出现 `recovery-started`。

场景 C：状态查询
1. 提交 recovery 后立即请求 `get-recovery-status`。
2. 断言 `recoveryActive=true` 或 `pendingJobs>0`。
3. 完成后再次查询，断言状态回落。

## 7. 发布与回滚

发布策略：
- 灰度开启（先开发环境/测试环境）。
- 观察指标：`recovery-started` 与 `recovery-error` 比例、平均恢复耗时、客户端超时率。

回滚策略：
- 若出现兼容性问题，回滚到旧网关逻辑（占位状态 + 原回执策略）。
- 回滚后保留日志增强，继续定位失败原因。

## 8. 验收标准（DoD）

- 不再出现“reconnect 失败但返回 recovery-started”的日志样例。
- `get-recovery-status` 返回非占位值，且可反映任务变化。
- recovery 能力名与订阅能力一致，并通过现有 provider 正常补发。
- 单元测试与集成测试全部通过。
