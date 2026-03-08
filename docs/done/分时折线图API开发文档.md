# 分时折线图 API 开发文档（服务端组装）

更新时间：2026-03-08

## 1. 背景与结论

当前系统已具备：
- 历史能力：`get-stock-history`（1 分钟粒度的历史序列）
- 实时能力：`stream-stock-quote`（实时增量推送）

业务目标是“分时折线图”（类似心电图），不是逐笔明细，也不是蜡烛 K 线展示。

结论：
- 数据来源可继续复用 1 分钟 K 线与实时报价。
- 对外应新增“分时折线专用 API”，由服务端统一做历史+增量组装、分钟桶去重与时区处理。
- 客户端不再各自拼接，避免多端实现不一致。

## 2. 目标与非目标

目标：
- 提供统一分时折线数据接口，直接返回“点序列”（`timestamp + price` 为核心）。
- 首屏可一次拿到当日完整分时，后续可平滑增量更新。
- 统一分钟桶规则、去重规则、排序规则。

非目标：
- 不提供逐笔（tick）成交明细。
- 不提供蜡烛图展示字段集（OHLC 面向图形渲染层可选输出，但非默认）。
- 不在本阶段实现多 provider 聚合对比。

## 3. 对外接口设计

建议新增端点：
- `POST /api/v1/chart/intraday-line`

认证：
- 复用 `ReadAccess()`（API Key 或 JWT，最小只读权限）

请求体（MVP）：
```json
{
  "symbol": "AAPL.US",
  "market": "US",
  "tradingDay": "20260308",
  "provider": "infoway",
  "includePrePost": false,
  "pointLimit": 600
}
```

响应体（业务数据层）：
```json
{
  "line": {
    "symbol": "AAPL.US",
    "market": "US",
    "tradingDay": "20260308",
    "granularity": "1m",
    "points": [
      {
        "timestamp": "2026-03-08T14:30:00.000Z",
        "price": 195.89,
        "volume": 12345
      }
    ]
  },
  "metadata": {
    "provider": "infoway",
    "historyPoints": 240,
    "realtimeMergedPoints": 12,
    "deduplicatedPoints": 8,
    "lastPointTimestamp": "2026-03-08T15:42:00.000Z"
  }
}
```

说明：
- 仍由全局 `ResponseInterceptor` 进行统一外层包装。
- `points` 默认只返回折线必要字段，减少带宽与前端转换成本。

## 4. 服务端组装规则（核心）

### 4.1 数据流
1. 历史回填：调用 `ReceiverService.handleRequest`，`receiverType=get-stock-history`。
2. 实时补齐：从流缓存/最近实时数据中补最后若干分钟（可选开关，默认开启）。
3. 统一标准化：映射为 `IntradayPoint`。
4. 去重合并：按 `symbol + minute(timestamp_utc)` upsert。
5. 排序裁剪：按时间升序，按 `pointLimit` 裁剪。

### 4.2 分钟桶规则
- 分桶键：`bucket = floor(timestamp_utc / 60000) * 60000`
- 同桶冲突：后到数据覆盖先到数据。
- 输出时间：统一 ISO-8601 UTC 字符串。

### 4.3 会话过滤
- 默认仅保留该市场常规交易时段点位。
- `includePrePost=true` 时，保留盘前盘后分钟点（若数据源可得）。

## 5. 代码落地方案（文件级）

建议新建入口模块（避免污染现有 Query/Receiver 语义）：

- `src/core/01-entry/chart-intraday/controller/chart-intraday.controller.ts`
- `src/core/01-entry/chart-intraday/services/chart-intraday.service.ts`
- `src/core/01-entry/chart-intraday/dto/intraday-line-request.dto.ts`
- `src/core/01-entry/chart-intraday/dto/intraday-line-response.dto.ts`
- `src/core/01-entry/chart-intraday/module/chart-intraday.module.ts`

应用装配：
- `src/appcore/core/application.module.ts` 注册 `ChartIntradayModule`

依赖复用：
- `ReceiverService`：历史数据
- `MarketStatusService`：交易日/会话判定
- `SmartCacheStandardizedService`：接口级结果缓存

## 6. 缓存与性能建议

缓存键：
- `intraday_line:{provider}:{symbol}:{tradingDay}:{market}:{includePrePost}`

TTL（建议）：
- 交易时段：`5s`
- 非交易时段：`60s`

性能目标（MVP）：
- 单标的分时线接口 P95 `< 800ms`（命中缓存 `< 100ms`）

## 7. 错误码与校验

请求校验：
- `symbol` 必填，且必须是标准格式（如 `AAPL.US`）。
- `tradingDay` 可选；缺省按市场当天交易日推断。
- `pointLimit` 范围建议 `1 ~ 2000`。

典型错误：
- `400` 参数非法（symbol、日期格式、limit）
- `404` 无可用数据（历史与实时均为空）
- `503` 上游 provider 暂不可用

## 8. 测试计划

单元测试：
- 分钟桶归并：同分钟覆盖、跨分钟排序正确
- 会话过滤：仅交易时段 / 含盘前盘后
- 空数据与异常分支

集成测试：
- 历史 + 实时合并闭环
- 不同市场样例（US/HK/CN）
- 缓存命中与过期行为

E2E：
- `POST /api/v1/chart/intraday-line` 首屏可返回连续分钟点
- 连续两次调用结果稳定（去重后无重复分钟）

## 9. 迁移与兼容策略

- 不改动现有 `get-stock-history` 与 `stream-stock-quote`。
- 新接口上线后，前端默认切换到新接口。
- 旧逻辑保留灰度开关，问题时可快速回退到客户端拼接方案。

## 10. 文档同步要求

上线前需同步更新：
- `docs/api.md`：新增 `chart/intraday-line` 章节
- `docs/其他应用开发者对接指南.md`：新增调用示例
- `docs/done/Infoway-能力说明汇总.md`：增加“分时折线 API（服务端组装）”说明
