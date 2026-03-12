# 分时图并发压测异常 RCA 与修复方案（2026-03-12）

## 1. 背景

在分时图多用户并发测试中，`POST /api/v1/chart/intraday-line/snapshot` 出现大量失败。

本次排查严格遵循：
- 仅通过运行环境变量调整与日志证据分析；
- 不修改业务代码。

---

## 2. 结论摘要

本次问题的根因不是分时图计算逻辑本身，而是**调度器能力契约与能力白名单不匹配**导致的副作用。

当把 `infoway:get-stock-history` 加入 `UPSTREAM_SCHEDULER_ALLOWLIST` 后：

1. `get-stock-history` 请求进入上游调度器；
2. 调度器会把相同 `mergeKey` 的任务合并；
3. 对 `get-stock-history`，合并后实际发车时 `symbols` 可能变为 `2+`；
4. 但 Infoway 历史能力明确要求单标的，最终抛出 `400`：
   - `get-stock-history 仅支持单标的请求：symbols 必须且只能包含 1 个标的`

因此：
- 加白名单前：主要是 `500`（上游429被包装）+ 部分 `429`（本地限流）；
- 加白名单后：`500` 大幅消失，但转换为大量 `400`（单标契约被破坏）+ `429`（高压时本地限流）。

---

## 3. 关键证据

## 3.1 代码契约证据

1. 分时 snapshot 会拉历史基线，能力为 `get-stock-history`  
文件：`src/core/03-fetching/chart-intraday/services/chart-intraday-read.service.ts`
- `fetchHistoryBaseline` 调用 `dataFetcherService.fetchRawData`（`capability: CAPABILITY_NAMES.GET_STOCK_HISTORY`）

2. Infoway 历史能力明确单标约束  
文件：`src/providersv2/providers/infoway/capabilities/get-stock-history.ts`
- 当 `symbols.length > 1` 时抛错 `GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR`

3. 调度器发车直接执行 `leader.execute(entry.symbols)`  
文件：`src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`

4. 调度器仅对 `quote/basic-info` 做按 symbol 回填拆分，**不包含 history**  
文件：`src/core/03-fetching/data-fetcher/services/upstream-request-scheduler.service.ts`
- `shouldResolveTasksBySymbol` 仅返回 `get-stock-quote` / `get-stock-basic-info`

5. 默认白名单本身不包含 history  
文件：`src/core/03-fetching/data-fetcher/constants/upstream-scheduler.constants.ts`
- 默认仅有 `get-market-status` / `get-stock-quote` / `get-stock-basic-info`

## 3.2 运行时日志证据（本次实测）

已捕获调度器日志：
- `queueKey: infoway:get-stock-history`
- `tasks: 2, symbols: 2`
- 紧接着出现：
  - `Data fetch failed for infoway.get-stock-history`
  - `get-stock-history 仅支持单标的请求：symbols 必须且只能包含 1 个标的`
  - `POST /api/v1/chart/intraday-line/snapshot - 400`

这条链路直接证明：**调度合并导致 history 单标契约被破坏**。

---

## 4. 现象变化对比

## 4.1 加白名单前（history 不进调度器）

- 并发下大量 `500`，错误消息为：
  - `Data fetch failed: Request failed with status code 429`
- 含义：
  - 上游429被 `EXTERNAL_API_ERROR` 包装后默认映射为500（该映射逻辑独立于本次文档，不展开改代码）。

## 4.2 加白名单后（history 进调度器）

- `500` 基本消失；
- 出现大量 `400`（单标约束错误）；
- 高压下仍会有本地 `429`（`ThrottlerGuard`）。

---

## 5. 根因分析（Root Cause）

## 5.1 主根因

`get-stock-history` 能力是“单标能力”，但当前调度器在该能力上的行为是“可合并多标发车”。

该不一致触发了能力输入契约违规。

## 5.2 触发条件

同时满足以下条件时触发：

1. `UPSTREAM_SCHEDULER_ALLOWLIST` 包含 `infoway:get-stock-history`；
2. 多个 snapshot 请求在同一 mergeKey 窗口入队；
3. 调度器把多个 task 合并后统一发车；
4. 发车 symbols > 1。

## 5.3 放大因素

1. 并发请求高；
2. `mergeKey` 对 history 路径未包含 symbol 维度（默认分支仅用 options 签名）；
3. 调度器对 history 不做按 symbol 拆分回填。

---

## 6. 立即可执行的“无代码”缓解措施

1. 从运行环境移除 `infoway:get-stock-history` 白名单项  
仅保留默认白名单能力，避免触发该副作用。

2. 分时图并发压测时降低本地触发节奏  
使用 `global-interval-ms` 控制发包节奏，减少 `429` 噪声。

3. 压测分层执行  
先做低并发正确性，再做高并发容量；避免把容量问题误判为功能错误。

---

## 7. 代码修复方案（后续实施建议）

以下为后续代码层修复建议，本次不执行：

1. 为能力增加“调度策略元数据”  
示例：`mergeMode: single_symbol_only | merge_by_symbol | merge_by_request_signature`  
`get-stock-history` 应标记为 `single_symbol_only`。

2. 调度器在 `single_symbol_only` 模式下禁止跨 symbol 合并  
即使白名单启用，也必须按 symbol 独立发车。

3. `buildMergeKey` 对 history 显式包含 symbol 维度  
避免被 options-only 签名合并。

4. 异常映射优化（可选）  
上游429应尽量映射为429（`RESOURCE_EXHAUSTED`），避免被误读为500内部错误。

---

## 8. 验收标准（建议）

修复后应满足：

1. 开启 `infoway:get-stock-history` 调度时，不再出现 “single symbol” 400；
2. `snapshot` 功能正确率在目标并发下满足基线；
3. 高压下若被限流，返回码以 429 为主，不再出现误导性 500；
4. 调度器日志中 history 发车的 `symbols` 恒为 1。

---

## 9. 回滚方案

若后续代码修复上线后出现异常，第一回滚开关为：

1. `UPSTREAM_SCHEDULER_ALLOWLIST` 去除 `infoway:get-stock-history`；
2. 必要时 `UPSTREAM_SCHEDULER_ENABLED=false` 回退到原始直连策略。

---

## 10. 附录：本次复测文件

1. `/tmp/chart-intraday-multi-user-after-allowlist-history.json`
2. `/tmp/chart-intraday-multi-user-after-allowlist-history-slow.json`

