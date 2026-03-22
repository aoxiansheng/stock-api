# Crypto 共享调度域残余 429 二次修复方案

版本：v1  
更新时间：2026-03-22 13:56:54 CST

## 1. 文档定位

本文件是对以下既有文档的补充，不覆盖、不替代原文：

- `docs/todo/crypto-上游调度器429修复清单.md`

前一阶段已经完成的事项：

- `get-crypto-quote` / `get-crypto-history` / `get-crypto-basic-info` 接入共享调度域
- `provider:capability` 级排队升级为 `infoway:crypto-rest` 共享发车域
- `quote/history` 不再各自独立抢 Infoway crypto REST 额度池

本文件只处理一个剩余问题：

- `scheduler-only (bypass cache)` 路径下，首轮混合并发仍偶发单次 `429`

## 2. 当前现象

### 2.1 已确认有效的部分

当前代码已经证明共享调度域生效：

- `infoway:get-crypto-quote -> infoway:crypto-rest`
- `infoway:get-crypto-history -> infoway:crypto-rest`
- `infoway:get-crypto-basic-info -> infoway:crypto-rest`

因此，旧问题“跨 capability 各自排队、各自冷却”已经不是主矛盾。

### 2.2 残余问题表现

专项回归结果：

- 单元测试通过
- `smart-cache + scheduler` 连续 4 轮通过
- `scheduler-only` 大多数情况下通过
- 但仍然出现过首轮单次 `429`

新增诊断脚本：

- `scripts/tools/local-project/diagnose-crypto-scheduler-first-round.js`

一次有效失败样本：

- 试验时间：`2026-03-22T05:42:35.564Z`
- 失败请求：`history:BTCUSDT`
- 失败时间：`2026-03-22T05:42:36.884Z`
- 错误：`429 RESOURCE_EXHAUSTED`
- 同轮其它请求：
  - `history:ETHUSDT` 成功，完成于 `1205ms`
  - `history:BTCUSDT` 失败，完成于 `1321ms`
  - `history:DOGEUSDT` 成功，完成于 `6486ms`
  - `quote` 成功，完成于 `7477ms`

这说明：

- 共享调度域和 `429` 冷却是生效的
- 但共享域里的前两次发车之间，节奏仍然偶尔过紧

## 3. 根因判断

当前最可信的根因不是“共享域没生效”，而是：

- 共享域虽然成立了
- 但共享域仍复用全局 `defaultRps=1`
- 即 `minIntervalMs = 1000ms`
- 对真实 Infoway crypto REST 来说，这个节奏仍然过于贴边

换句话说，当前系统已经从：

- “多队列互相抢额度”

收敛到了：

- “单共享队列按精确 1RPS 发车，偶尔仍踩到上游临界阈值”

## 4. 修复目标

本轮二次修复目标：

1. 消除 `scheduler-only` 首轮偶发 `429`
2. 不改动共享调度域设计方向
3. 不引入新的缓存逻辑
4. 不扩大到 stock
5. 不做新的大规模架构抽象

## 5. 建议修复方案

## 5.1 核心策略

在现有共享调度域基础上，为 `infoway:crypto-rest` 单独引入更保守的发车间隔，不再完全复用全局 `defaultRps`。

建议使用：

- `dispatchScopeKey -> minIntervalMs` 映射

而不是：

- 重新拆队列
- 改 merge 逻辑
- 再加一层缓存

## 5.2 为什么选“每调度域最小发车间隔覆盖”

这是当前最小成本、最符合现象的修复方向。

原因：

- 当前失败发生在共享队列内部，不是跨队列
- `429` 后续冷却已经能挡住后面的请求，说明共享域逻辑正确
- 真正不足的是“前两次发车太紧”
- 因此应直接修“发车节奏”，而不是继续动队列模型

## 5.3 推荐实现口径

建议新增常量：

```ts
export const UPSTREAM_SCHEDULER_DISPATCH_SCOPE_MIN_INTERVAL_MS_MAP =
  Object.freeze({
    "infoway:crypto-rest": 1300,
  } as const);
```

调度器新增：

```ts
private resolveMinIntervalMs(dispatchScopeKey: string): number {
  return (
    UPSTREAM_SCHEDULER_DISPATCH_SCOPE_MIN_INTERVAL_MS_MAP[dispatchScopeKey] ??
    this.minIntervalMs
  );
}
```

并在 `waitForDispatchWindow()` 中通过 `queue.dispatchScopeKey`（已存在于 `UpstreamQueueState` 接口）解析有效间隔，替代全局 `this.minIntervalMs`：

```ts
private async waitForDispatchWindow(queue: UpstreamQueueState): Promise<void> {
  const effectiveMinIntervalMs = this.resolveMinIntervalMs(queue.dispatchScopeKey);
  // ...用 effectiveMinIntervalMs 替代 this.minIntervalMs
}
```

## 5.4 为什么建议先用 `minIntervalMs` 覆盖，而不是 `RPS` 覆盖

原因很简单：

- 当前问题是“1 秒太紧”
- 直接用毫秒覆盖更直观
- 不需要再做 `RPS -> interval` 的换算和边界讨论
- 当前只有一个共享域需要处理，直接用毫秒表最省成本

## 5.5 初始推荐值

建议初始值：

- `infoway:crypto-rest = 1300ms`

理由：

- 比 `1000ms` 多出 30% 安全余量
- 延迟代价有限
- 比直接拉到 `1500ms` 更克制

如果本地专项回归仍有偶发 `429`，再上调到：

- `1500ms`

但只有在 `1300ms` 仍不稳定时才允许上调。

## 6. 原子级开发步骤

### P0-1 新增共享调度域最小发车间隔映射

涉及文件：

- `src/core/03-fetching/data-fetcher/constants/upstream-scheduler.constants.ts`

原子步骤：

1. 新增 `UPSTREAM_SCHEDULER_DISPATCH_SCOPE_MIN_INTERVAL_MS_MAP`
2. 初始只配置 `infoway:crypto-rest`
3. 不为 stock、不为其它 provider 配置

验收条件：

- 常量层可明确看到 `infoway:crypto-rest` 的覆盖值
- 未命中的调度域继续使用默认间隔

### P0-2 调度器按共享调度域解析有效发车间隔

涉及文件：

- `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

原子步骤：

1. 新增 `resolveMinIntervalMs(dispatchScopeKey)` 或同等职责函数
2. `waitForDispatchWindow()` 通过 `queue.dispatchScopeKey` 解析有效间隔，替代全局 `this.minIntervalMs`
3. 日志中打印：
   - `dispatchScopeKey`
   - `effectiveMinIntervalMs`

验收条件：

- `infoway:crypto-rest` 使用覆盖值
- 非覆盖调度域仍使用全局默认值
- FIFO 不变
- `dispatchScopeKey` 不变
- `mergeKey` 规则不变
- `crypto history` 单标契约不变
- `quote/basic-info` 按 symbol 回填不变
- 不出现新的 capability 合并错误
- 不出现新的顺序优先级逻辑

### P0-3 补单元测试

涉及文件：

- `test/unit/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.spec.ts`

原子步骤：

1. 新增共享调度域 `effectiveMinIntervalMs` 覆盖测试
2. 新增默认域仍走全局 `minIntervalMs` 的测试
3. 新增 `crypto-rest` 覆盖不影响 stock 的测试

验收条件：

- 单测可证明覆盖值被读取
- 单测可证明作用范围仅限 `infoway:crypto-rest`

## 7. 本地专项回归方案

## 7.1 必跑脚本

- `scripts/tools/local-project/repro-crypto-mixed-scheduler-429.js`
- `scripts/tools/local-project/diagnose-crypto-scheduler-first-round.js`

## 7.2 验收矩阵

1. `scheduler-only`
   - 连续运行 2 轮完整专项回归
   - 每轮 `4 rounds`
   - 目标：`0 个 429`
2. `smart-cache + scheduler`
   - 连续运行 1 轮专项回归
   - 目标：`0 个 429`
3. 首轮诊断脚本
   - `trials = 6`
   - `interval-ms = 8000`
   - 目标：`0 failures`

## 7.3 通过标准

只有以下三项同时满足，才视为二次修复完成：

1. 单元测试通过
2. `scheduler-only` 连续两轮专项回归均 `0 个 429`
3. 首轮诊断脚本 `6/6` 无失败

## 8. 风险控制

主要风险：

- 发车间隔增加后，`scheduler-only` 路径总体耗时会略升

为什么可以接受：

- 当前目标是避免上游 `429`
- `scheduler-only` 本就是诊断/兜底路径
- 默认生产路径仍然有 `Smart Cache`

## 9. 明确不做的事

本轮二次修复明确不做：

- 不回退共享调度域设计
- 不新增缓存器
- 不扩展到 stock
- 不引入 env 级复杂配置解析
- 不引入动态自适应节流
- 不做多实例共享协调

## 10. 最终建议

当前建议一句话概括：

- 第一阶段已经修掉“多队列互抢额度”，第二阶段只需要把 `infoway:crypto-rest` 的共享域发车间隔从“精确贴边”调成“保守安全”
