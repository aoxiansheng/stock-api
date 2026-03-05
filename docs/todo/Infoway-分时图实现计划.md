# Infoway 分时图实现计划（MVP）

更新时间：2026-03-05

## 1. 目标与范围

目标：支持客户端渲染“完整分时图（当日开盘到当前）”，而不是只能从 WebSocket 订阅后开始拼接。

MVP 范围：
- 支持港股/美股/沪深个股。
- 支持 1 分钟分时数据。
- 仅实现“历史回填 + 实时增量”闭环。
- 不做逐笔（tick）数据。

非目标（本阶段不做）：
- 多周期 K 线（5m/15m/日线等）对外接口。
- 复杂区间历史查询（任意 begin/end 时间范围）。
- 多 provider 聚合与对比。

## 2. 现状确认

当前 infoway provider 已支持：
- REST 报价：`get-stock-quote`（仅最新一根快照）。
- WS 报价：`stream-stock-quote`（订阅后未来增量推送）。

当前不足：
- 无“历史分时序列”能力，客户端无法在首次进入页面时拿到当日完整分时。

## 3. 方案总览（先拉后推）

采用双阶段数据流：
1. 历史回填：先调 REST 拉取当日最近 N 根 1m K（用于首屏完整分时）。
2. 实时增量：再建立 WS 订阅，将后续 1m 推送增量合并进分时序列。

客户端合并策略：
- 以“分钟时间戳”作为主键 upsert（同一分钟更新覆盖，避免重复点）。
- 时间序列保持升序。

## 4. 后端实施计划（文件级）

### 4.1 新增能力：`get-stock-history`

涉及文件：
- `src/providersv2/providers/infoway/capabilities/get-stock-history.ts`（新增）
- `src/providersv2/providers/infoway/services/infoway-context.service.ts`（新增 `getStockHistory`）
- `src/providersv2/providers/infoway/infoway.provider.ts`（注册新能力）

实现要点：
- 调用 Infoway `POST /stock/v2/batch_kline`。
- 默认参数：`klineType=1`、`klineNum=240`（可配置）。
- 单标的优先（避免多标的返回根数受限）。
- 将 `respList` 按时间升序映射为统一字段：
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

建议环境变量：
- `INFOWAY_INTRADAY_KLINE_TYPE=1`
- `INFOWAY_INTRADAY_KLINE_NUM=240`
- `INFOWAY_INTRADAY_LOOKBACK_DAYS=1`（可选）

### 4.2 Receiver/Query 接线

涉及文件：
- `src/providersv2/providers/constants/capability-names.constants.ts`（已存在 `GET_STOCK_HISTORY`）
- `src/core/01-entry/receiver/constants/operations.constants.ts`（加入支持能力）
- `src/core/shared/types/field-naming.types.ts`

改动点：
- 将 `get-stock-history` 纳入 `SUPPORTED_CAPABILITY_TYPES`。
- 将 `get-stock-history` 分类映射到 `StorageClassification.STOCK_CANDLE`。
- `TRANS_RULE_TYPE_BY_CAPABILITY` 对 `get-stock-history` 使用 `quote_fields` 或独立 `candle_fields`。

### 4.3 转换策略（MVP）

建议：对 `provider=infoway + receiverType=get-stock-history` 走透传（与现有 infoway 特殊能力一致），避免映射规则引擎对新类型阻塞。

涉及文件：
- `src/core/01-entry/receiver/services/receiver.service.ts`

改动点：
- 扩展 `shouldBypassTransformation()` 条件，加入 `GET_STOCK_HISTORY`。

### 4.4 请求参数设计（MVP）

最小参数：
- `symbols`（单标的）
- `receiverType=get-stock-history`
- `options.preferredProvider=infoway`
- `options.market`（可选）

扩展参数（可选，若需要可控回填长度）：
- `options.klineNum`
- `options.timestamp`

如果启用扩展参数，需要同步：
- `src/core/01-entry/receiver/dto/data-request.dto.ts`

### 4.5 WebSocket 保持不变

涉及文件：
- `src/providersv2/providers/infoway/services/infoway-stream-context.service.ts`

说明：
- 继续使用现有 `stream-stock-quote`。
- 不改协议（`10006/10008/11002/10010`）。
- 主要依赖客户端/转发层完成“历史+增量”合并。

## 5. API 使用约定（给前端/转发服务）

### 5.1 首屏历史回填

POST `/api/v1/receiver/data`

```json
{
  "symbols": ["AAPL.US"],
  "receiverType": "get-stock-history",
  "options": {
    "preferredProvider": "infoway",
    "market": "US"
  }
}
```

### 5.2 实时增量订阅

WS 路径：`/api/v1/stream-receiver/connect`

订阅：
- `wsCapabilityType=stream-stock-quote`
- `preferredProvider=infoway`
- `symbols=["AAPL.US"]`

### 5.3 合并规则

按 `symbol + minute(timestamp)` upsert：
- 历史数据先入图。
- 实时推送进入同一序列。
- 同分钟重复推送覆盖，避免点位重复。

## 6. 测试计划

### 6.1 单元/集成测试

新增建议：
- `scripts/tools/test-infoway-intraday.js`（新增）
  - 步骤 1：调用 `get-stock-history`，断言返回点位数量 > 0。
  - 步骤 2：连接 WS 订阅，断言有新点推送。
  - 步骤 3：本地执行合并，断言序列升序且无重复分钟点。

### 6.2 回归测试

必须覆盖：
- 现有 `get-stock-quote` 不回归。
- 现有 `stream-stock-quote` 不回归。
- `get-stock-basic-info/get-market-status/get-trading-days` 不回归。

## 7. 风险与对策

风险 1：多标的历史回填返回根数受限。
- 对策：MVP 约束单标的回填。

风险 2：市场非交易时段无新增推送。
- 对策：图表层展示“最新时间”与“休市状态”，不判为故障。

风险 3：不同市场时区导致分钟错位。
- 对策：服务端统一输出 ISO 时间；客户端统一按 UTC 分钟桶处理。

风险 4：映射规则体系引入新类型成本高。
- 对策：MVP 先透传，后续再抽象 `candle_fields`。

## 8. 里程碑与验收

里程碑 M1（后端能力可用）：
- `get-stock-history` 可返回当日分时序列。

里程碑 M2（端到端可用）：
- 客户端可“首屏完整分时 + 实时更新”。

验收标准：
- 美股、港股、沪深各 1 个样本可通过。
- 首次打开图表时点位连续、时间升序。
- 1 分钟内接收推送后图表可实时更新。
- 无重复分钟点，无明显倒序。

## 9. 回滚策略

若上线后出现异常：
1. 通过 `preferredProvider` 切回已有稳定 provider。
2. 禁用 `get-stock-history` 新能力路由（不影响 WS 报价）。
3. 保留既有 `get-stock-quote/stream-stock-quote` 路径继续服务。
