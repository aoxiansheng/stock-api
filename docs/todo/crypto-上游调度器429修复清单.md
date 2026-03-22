# Crypto 强时效链路 429 修复方案

版本：v2  
更新时间：2026-03-22 11:25:38 CST

## 1. 当前结论

本轮基于真实 API、本地已启动后端、固定 `BTCUSDT/ETHUSDT/DOGEUSDT` 编排进行了两类验证：

- `scheduler-only (bypass cache)`：稳定复现 `429`
- `smart-cache + scheduler`：当前稳定通过

专项复现脚本：

- `scripts/tools/local-project/repro-crypto-mixed-scheduler-429.js`

专项复现结果：

- `scheduler-only` 连续 4 轮全部复现
- 共 16 个请求，失败 4 个
- 失败分布：
  - `quote:BTCUSDT,ETHUSDT,DOGEUSDT` 失败 3 次
  - `history:DOGEUSDT` 失败 1 次
- `smart-cache + scheduler` 连续 4 轮全部通过

因此，当前问题已经不是“crypto 没有接入调度器”，而是：

- `get-crypto-quote` 与 `get-crypto-history` 已经接入现有调度器
- 但调度器的排队、发车间隔、`429` 冷却仍然只在 `provider:capability` 维度生效
- 如果 Infoway crypto REST 实际使用的是 provider 级共享额度池，那么跨 capability 的混合并发仍会互相抢额度，最终随机一个请求触发 `429`

## 2. 证据链

### 2.1 接入状态已修复，不再是主根因

当前代码里，以下能力已经进入 allowlist：

- `infoway:get-crypto-quote`
- `infoway:get-crypto-basic-info`
- `infoway:get-crypto-history`

涉及位置：

- `.env`
- `src/core/03-fetching/data-fetcher/constants/upstream-scheduler.constants.ts`

因此，“crypto 没进调度器”这一旧结论已经失效。

### 2.2 `scheduler-only` 与 `smart-cache + scheduler` 的差异

`useSmartCache=false` 时：

- `receiver/data` 会跳过 `Smart Cache`
- 直接进入 `resolveSymbolsForProvider() -> executeDataFetching() -> DataFetcher.fetchRawData()`
- 仅剩 `DataFetcher` 层调度器保护

`useSmartCache=true` 时：

- 先经过 `Smart Cache`
- 同一个 `cacheKey` 的并发 miss 会被 `single-flight` 合并
- 真正进入回源层的请求量显著下降

这解释了为什么默认链路稳定，而纯回源链路仍然暴露问题。

### 2.3 调度器当前的真实粒度

调度器的核心事实：

- `queueKey = provider:capability`
- `queues`、`lastDispatchAt`、`cooldownUntil` 都挂在 `queueKey` 上
- `429` 冷却只作用于当前 `queueKey`

也就是说，当前系统只有：

- `infoway:get-crypto-quote` 队列
- `infoway:get-crypto-history` 队列

但没有：

- `infoway:crypto-rest` 这种共享闸门

所以两个 capability 仍可能并发打上游。

### 2.4 为什么失败对象会漂移

失败对象在 `quote` 与某个 `history` 之间漂移，说明：

- 不是固定 symbol 缺陷
- 不是某个单独 capability 完全失效
- 而是同一批混合请求里，谁先撞到共享额度上限，谁就返回 `429`

这正符合“共享额度池 + 队列粒度过细”的行为特征。

## 3. 修复目标

本轮修复目标必须非常明确：

1. 保证 `scheduler-only` 路径下，`quote + 3 个 history` 的固定混合并发不再随机出现 `429`
2. 不改变 `Smart Cache` 的职责边界
3. 不把 `support-list` 的版本化镜像模式挪到 crypto 强时效链路
4. 不引入分布式队列、全局令牌桶、额外长缓存等重型方案
5. 保持最小成本、第一原理、KISS/YAGNI

## 4. 非目标

本轮明确不做：

- 不重做 `Smart Cache`
- 不把调度器改造成响应缓存
- 不把 `quote/history` 改造成 `support-list` 型同步镜像
- 不做多实例共享调度
- 不做 provider 抽象重构
- 不做面向未来资产类型的过早泛化

## 5. 建议修复方案

## 5.1 核心设计

最小改动方案不是“换掉现有调度器”，而是：

- 在现有调度器内部新增“共享调度域”概念
- 让 `infoway:get-crypto-quote` 和 `infoway:get-crypto-history` 进入同一个共享发车域
- 但保留它们各自不同的 merge 语义和结果分流语义

建议新增概念：

- `dispatchScopeKey`

建议映射：

- `infoway:get-crypto-quote` -> `infoway:crypto-rest`
- `infoway:get-crypto-history` -> `infoway:crypto-rest`

保持不变的部分：

- `mergeKey` 仍保留 capability 语义
- `crypto quote` 仍按 quote 规则合并
- `crypto history` 仍保持 `single_symbol_only`
- `symbolExtractor` 仍保持现状

也就是说，本轮只共享：

- 发车窗口
- 发车顺序
- `429` 冷却

不共享：

- 响应数据
- merge bucket
- 分流逻辑

## 5.2 为什么选这个方案

这是当前证据下最小、最稳、最容易验收的方案。

相比其它备选方案：

- 比“provider 全局串行所有能力”更保守
- 比“重做成分布式共享额度控制”更便宜
- 比“继续加缓存掩盖问题”更符合第一原理
- 比“把 quote/history 硬拼成同一个 merge 规则”更安全

## 5.3 与缓存器是否冲突

不会冲突。

原因：

- `Smart Cache` 仍负责 TTL 响应复用与 single-flight
- 调度器只负责 cache miss 后的回源闸门
- 本方案没有改变缓存键、缓存 TTL、缓存存储模型
- 只是把两个 crypto REST capability 的“发车节奏”改为共享

所以它和现有缓存器是协作关系，不是覆盖关系。

## 6. 原子级修复清单

### P0-1 共享调度域建模

背景：

- 当前 `queueKey` 直接等于 `provider:capability`
- 导致 `quote/history` 分队列、分冷却

修复目标：

- 为部分 capability 引入共享发车域

涉及文件：

- `src/core/03-fetching/data-fetcher/constants/upstream-scheduler.constants.ts`
- `src/core/03-fetching/data-fetcher/interfaces/upstream-request-task.interface.ts`
- `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

函数级原子步骤：

1. 在常量层定义 crypto REST 共享调度域映射
2. 在调度器中新增 `buildDispatchScopeKey(provider, capability)` 或同等职责函数
3. 让内部 `queues` 从按 `queueKey` 存储，改为按 `dispatchScopeKey` 存储
4. 保留 `queueKey` 作为 capability 语义标识，用于日志和诊断

验收条件：

- 单元测试可证明 `get-crypto-quote` 与 `get-crypto-history` 命中同一 `dispatchScopeKey`
- stock 相关 capability 不受影响
- 其它 provider 不受影响

### P0-2 将发车节流与 429 冷却提升到共享调度域

背景：

- 当前 `lastDispatchAt` 与 `cooldownUntil` 只绑定 `provider:capability`

修复目标：

- 让 `quote/history` 共享发车间隔和 `429` 冷却

涉及文件：

- `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

函数级原子步骤：

1. `processQueue()` 改为围绕 `dispatchScopeKey` 取队列
2. `waitForDispatchWindow()` 对共享域生效
3. `429` 后设置共享域 `cooldownUntil`
4. 日志里同时输出 `dispatchScopeKey` 与 capability 级 `queueKey`

验收条件：

- 当 `get-crypto-quote` 触发 `429` 时，同共享域内的 `get-crypto-history` 后续发车会等待冷却
- 反向场景也成立
- 非 crypto capability 的冷却不被误伤

### P0-3 保持 merge 语义不变

背景：

- 本轮问题在发车域，不在 merge 语义

修复目标：

- 共享发车域时，不破坏现有 quote/history 各自合并规则

涉及文件：

- `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

函数级原子步骤：

1. 保持 `buildMergeKey()` 仍按 capability 生成
2. 保持 `get-crypto-history` 继续走 `single_symbol_only`
3. 保持 `get-crypto-quote` 的 symbol 回填逻辑不变

验收条件：

- 不出现 quote/history 跨 capability 合并
- 不出现错 symbol、漏 symbol、history 多标发车

### P0-4 补齐混合并发单元测试

背景：

- 现有测试覆盖了 capability 内部语义，但没有把“混合并发共享额度”打透

修复目标：

- 让本次问题有稳定的自动化回归

涉及文件：

- `test/unit/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.spec.ts`
- `test/unit/core/03-fetching/data-fetcher/services/data-fetcher.service.spec.ts`

函数级原子步骤：

1. 新增 `quote + history` 同轮调度测试
2. 新增“一个 capability 触发 429，另一个 capability 被共享冷却挡住”的测试
3. 新增“共享调度域下仍保持 history 单标发车”的测试

验收条件：

- 单测可稳定证明共享调度域生效
- 单测可稳定证明 merge 语义未退化

### P0-5 固化本地专项回归

背景：

- 人工逐条命令复现成本高，且容易因为操作顺序不同导致误判

修复目标：

- 提供固定编排、固定输出的本地验收脚本

涉及文件：

- `scripts/tools/local-project/repro-crypto-mixed-scheduler-429.js`

函数级原子步骤：

1. 保持当前脚本作为专项回归入口
2. 修复后用同一脚本分别验证：
   - `--use-smart-cache false`
   - `--use-smart-cache true`

验收条件：

- `scheduler-only` 连续 4 轮 0 个 `429`
- `smart-cache + scheduler` 连续 4 轮 0 个 `429`
- 输出中失败分布为空

## 7. P1 优化项

### P1-1 诊断日志增强

目标：

- 让后续排障能直接看到“capability 键”和“共享调度域键”

涉及文件：

- `src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

建议：

- 启动时打印共享调度域映射
- 入队、发车、`429` 冷却日志里同时打印：
  - `dispatchScopeKey`
  - `queueKey`
  - `mergeKey`

### P1-2 文档同步

目标：

- 避免旧文档继续把根因写成“allowlist 未接入”

涉及文件：

- `docs/todo/crypto-上游调度器429修复清单.md`
- `docs/系统限速说明.md`
- `docs/端点缓存分层与回源行为说明.md`

## 8. 实施顺序

建议顺序：

1. 先做共享调度域建模
2. 再把发车间隔与 `429` 冷却迁到共享域
3. 保证 merge 语义不变
4. 补混合并发单元测试
5. 用专项脚本做本地回归
6. 最后补日志与文档

## 9. 风险与控制

主要风险：

- 如果共享域划得太大，会把不相关能力也串行化，带来不必要延迟

控制策略：

- 本轮只收敛到 `infoway` 的 crypto REST
- 不扩展到 stock
- 不扩展到其它 provider
- 不扩展到 stream

可接受代价：

- `scheduler-only` 下 crypto quote/history 的平均延迟可能略升

换来的收益：

- 混合并发不再随机打爆上游共享额度

## 10. 最终验收标准

必须同时满足以下条件，才算本轮修复完成：

1. 单元测试通过
2. `scheduler-only` 专项脚本连续 4 轮无 `429`
3. `smart-cache + scheduler` 专项脚本连续 4 轮无 `429`
4. 失败对象不再在 `quote/history` 之间漂移
5. `crypto history` 仍保持单标契约
6. 不引入新的缓存层，不引入新的兼容回退逻辑

## 11. 当前建议结论

建议采纳本方案，并把本轮修复范围收敛为一句话：

- 不是继续补 cache，而是把 `infoway` crypto REST 的回源调度从 `provider:capability` 升级为“共享发车域 + capability 内独立 merge 语义”
