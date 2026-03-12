# Infoway `get-stock-quote` 并发空数组修复方案

- 记录时间：`2026-03-11`
- 适用范围：
  - `POST /api/v1/receiver/data`
  - `receiverType=get-stock-quote`
  - `options.preferredProvider=infoway`
  - 调度器启用且请求在短窗口内被合并时（并发场景）

## 问题现象

- 单请求通常返回正常行情数据。
- 并发请求更容易出现 `data.data=[]`（HTTP 200，业务数组为空）。
- 同时存在偶发 500（上游抖动/重试路径），但“空数组”问题可独立复现。

## 根因分析

执行链路：

1. 调度器对 `infoway:get-stock-quote` 默认启用（allowlist）。
2. 当 `entry.tasks.length > 1` 时，调度器会先执行“按 symbol 分流”再回传给各请求。
3. 分流逻辑读取的是原始行字段 `row.symbol`。
4. Infoway quote 原始字段是 `s`（如 `{ s: "00700.HK", p: "...", t: ... }`），没有 `symbol`。
5. `s -> symbol` 映射发生在后续 Transformer（`quote_fields`）阶段；分流发生在 Transformer 之前。
6. 结果：分流阶段命不中 symbol，任务被分配到空数组，后续 Transformer 只能转换空数组。

## 修复目标

- 保持分层职责清晰：
  - 调度器仅负责并发合并/分流；
  - Transformer 继续负责字段映射。
- 避免把 provider 私有字段规则硬编码进调度器。
- 最小侵入，不影响已有非 Infoway 路径。

## 推荐方案（最小侵入）

1. 在调度请求模型中新增可选原始 symbol 提取器。
   - 示例：`symbolExtractor?: (row: unknown) => string`
2. 在 DataFetcher 调用 `schedule(...)` 时按 `provider + capability` 注入提取策略。
   - 默认策略：读取 `row.symbol`
   - `infoway:get-stock-quote`：读取 `row.s`（`trim + toUpperCase` 归一化）
3. 调度器分流阶段优先使用注入提取器；未注入时回退默认策略。
4. 其余链路保持不变：分流结果继续进入既有 Transformer（`quote_fields`）。

## 实施清单

1. 扩展调度请求/任务接口（增加 `symbolExtractor`）。
2. DataFetcher 在 `executeWithOptionalScheduling` 构建 `schedule(...)` 参数时注入 extractor。
3. 调度器 `resolveTasksBySymbol(...)` 改为使用 extractor。
4. 补充单测：
   - Infoway quote 原始行使用 `{ s: "00700.HK" }`
   - 两个并发任务分别请求不同 symbol，断言拆分结果正确且非空

## 验收标准

- 并发双请求 `00700.HK` 不再稳定返回空数组。
- 单请求行为与现状一致（无回归）。
- `query/execute` 与 `receiver/data` 在同 provider/capability 下语义一致。
- `get-stock-basic-info`、`get-market-status` 调度行为无回归。

## 临时止血方案（修复前）

- 从 `UPSTREAM_SCHEDULER_ALLOWLIST` 移除 `infoway:get-stock-quote`，重启服务后生效。
- 或设置 `UPSTREAM_SCHEDULER_QUOTE_MERGE_WINDOW_MS=0`，暂停 quote 合并窗口。
