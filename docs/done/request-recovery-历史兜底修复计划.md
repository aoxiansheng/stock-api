# request-recovery 历史兜底修复计划（缓存缺失场景）

更新时间：2026-03-05

## 1. 目标

在 `request-recovery` 流程中，当 `streamCache` 无法覆盖 `lastReceiveTimestamp -> now` 区间时，自动走 Provider REST 历史接口补齐数据，避免客户端分时图断档。

目标效果：
- 优先使用缓存补发（低延迟）。
- 缓存不足时自动触发历史兜底（可配置）。
- 客户端最终拿到尽可能连续的时间序列。

## 2. 现状与问题

当前补发逻辑仅依赖缓存：
- `streamCache.getDataSince(symbol, lastReceiveTimestamp)`
- 无历史 REST 回拉分支。

结果：
- 当缓存 TTL/容量导致数据丢失时，只能返回部分数据或空数据。
- 客户端只能从恢复后继续拼接，历史缺口无法自动补齐。

## 3. 修复范围（MVP）

本期仅做最小闭环：
- 新增能力：`get-stock-history`（Infoway 先落地）。
- 在 recovery worker 内加入“缓存不足判定 + REST 兜底”路径。
- `recovery-data` 增加 `source` 元信息（`cache|history|mixed`）。

不做：
- 不做多 provider 聚合补齐。
- 不做任意长区间历史（仅满足分时/短窗口恢复）。
- 不改现有 WS 协议主结构（仅补充 metadata 字段）。

## 4. 设计方案

### 4.1 恢复流程（新）

1. 读取缓存补发数据（现有逻辑）。
2. 计算缺口：
- 起点：`lastReceiveTimestamp`
- 终点：`now`
- 若缓存首条时间 > 起点，或覆盖点数低于阈值，判定为“缓存不足”。
3. 触发 REST 历史查询（`get-stock-history`）。
4. 对缓存数据 + 历史数据做去重合并（按 `symbol + minute(timestamp)` upsert）。
5. 按时间升序发送 `recovery-data`。

### 4.2 缓存不足判定规则（MVP）

满足任一条件即触发兜底：
- `cacheData.length === 0`
- `firstCacheTimestamp - lastReceiveTimestamp > GAP_THRESHOLD_MS`（建议 90s）
- `coverageRatio < MIN_COVERAGE_RATIO`（建议 0.6）

配置项建议：
- `RECOVERY_HISTORY_FALLBACK_ENABLED=true`
- `RECOVERY_GAP_THRESHOLD_MS=90000`
- `RECOVERY_MIN_COVERAGE_RATIO=0.6`
- `RECOVERY_MAX_HISTORY_POINTS=240`

### 4.3 历史接口契约（MVP）

能力名：`get-stock-history`

入参（内部）：
- `symbols: string[]`（MVP 单标的优先）
- `options.preferredProvider=infoway`
- `options.klineType=1`
- `options.klineNum`（由缺口分钟数推导并受上限限制）

返回（统一字段）：
- `symbol`
- `timestamp`
- `lastPrice`
- `openPrice`
- `highPrice`
- `lowPrice`
- `volume`
- `turnover`
- `change`
- `changePercent`
- `previousClose`

### 4.4 向后兼容

- 兜底功能默认开启，但可通过配置关闭。
- 关闭后行为与当前版本一致。
- `recovery-data` 仅新增 metadata 字段，不破坏现有消费端。

## 5. 文件级改动清单

1. `src/providersv2/providers/infoway/capabilities/get-stock-history.ts`（新增）
- 实现 `ICapability.execute`，调用 context 的历史查询。

2. `src/providersv2/providers/infoway/services/infoway-context.service.ts`
- 新增 `getStockHistory(...)`，基于 `POST /stock/v2/batch_kline`。

3. `src/providersv2/providers/infoway/infoway.provider.ts`
- 注册 `get-stock-history` capability。

4. `src/core/01-entry/receiver/constants/operations.constants.ts`
- 将 `CAPABILITY_NAMES.GET_STOCK_HISTORY` 纳入 `SUPPORTED_CAPABILITY_TYPES`。

5. `src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service.ts`
- 新增缓存覆盖评估。
- 新增历史兜底调用。
- 新增数据合并与去重逻辑。
- `recovery-data.metadata` 增加 `source`、`cachePoints`、`historyPoints`。

6. `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`（按需）
- 若当前恢复 job 结构缺少兜底参数，补充默认配置透传。

## 6. 测试计划

### 6.1 单元测试

- recovery worker：
  - 缓存充分 -> 不触发历史接口。
  - 缓存为空 -> 触发历史接口。
  - 缓存部分覆盖 -> 触发历史接口并去重。
- 历史能力：
  - Infoway 正常响应映射正确。
  - API 异常时抛出可观测错误。

### 6.2 集成测试

场景 A：缓存命中
- 期望 `source=cache`，不调用历史能力。

场景 B：缓存缺失
- 期望 `source=history|mixed`，客户端收到补齐数据。

场景 C：历史接口失败
- 期望降级为缓存可得数据 + `recovery-error`/告警日志，不阻断主链路。

### 6.3 验收标准（DoD）

- 断网恢复后，分时图缺口显著减少或消失（以样本标的验证）。
- recovery 消息包含来源元信息，可用于观测。
- 开关关闭时行为可回退到现状。
- 相关单元/集成测试通过。

## 7. 风险与对策

风险 1：历史接口限流导致恢复抖动。
- 对策：限制 `klineNum`、加并发阈值、重试退避。

风险 2：时区/分钟桶不一致导致重复点。
- 对策：服务端统一按 UTC 分钟桶 upsert。

风险 3：恢复延迟上升。
- 对策：先发缓存数据，再异步补发历史缺口（可选优化）。

## 8. 发布计划

1. 开发环境开启并压测（US/HK/CN 各 1~2 标的）。
2. 测试环境灰度，观测 24 小时。
3. 生产小流量开启（按 appKey 白名单）。
4. 全量发布。

## 9. 回滚策略

- 立即关闭 `RECOVERY_HISTORY_FALLBACK_ENABLED`。
- 保留缓存补发路径继续服务。
- 若仍异常，回滚本次 recovery worker 改动。
