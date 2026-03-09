# support-list 新端点使用说明

- 写入时间：2026-03-10 01:03:33
- 时间戳（ISO）：2026-03-10T01:03:33+0800
- 适用范围：Query 弱时效入口（版本对齐 + 全量/增量读取）

## 1. 背景

本说明用于下游接入新的 support-list 对齐接口，目标是提供稳定的“首次全量、后续增量”数据获取方式，支持新增/更新/删除同步。

## 2. 端点总览

1. `GET /query/support-list/meta`
作用：获取指定 `type` 的最新版本信息。

2. `GET /query/support-list`
作用：
- 不带 `since`：返回全量
- 带 `since`：返回增量（不可用时自动回退全量）

## 2.1 内部职责边界

1. provider：只负责 `get-support-list` 上游拉取。
2. `core/03-fetching/support-list`：负责缓存/版本/增量编排。
3. query：仅负责协议层和输出。

## 2.2 旧接口状态（已下线）

1. 原 `GET /receiver/support-list` 已下线，不再对外提供。
2. 对外统一使用：
- `GET /query/support-list/meta`
- `GET /query/support-list`
3. `get-support-list` capability 仍保留在 provider 内部，供同步与读取编排链路调用。

## 3. 鉴权与请求要求

1. 需要通过现有 API Key/JWT 鉴权（与 Query 体系一致）。
2. `type` 必填，允许值由环境变量 `SUPPORT_LIST_TYPES` 决定（逗号分隔，服务启动时加载）。
3. 若未配置 `SUPPORT_LIST_TYPES`，回退到 provider 内置默认集合（当前为 Infoway 默认类型集合）。
4. `since` 可选，必须是 14 位及以上数字版本号。
5. `symbols` 可选，多个以逗号分隔，仅允许：字母、数字、点号、下划线、中划线、冒号。

## 4. 接口说明

### 4.1 获取最新版本

请求：
```http
GET /query/support-list/meta?type=STOCK_US
```

响应示例：
```json
{
  "type": "STOCK_US",
  "currentVersion": "20260309020000",
  "lastUpdated": "2026-03-09T02:00:00.000Z",
  "retentionDays": 7
}
```

### 4.2 拉取全量

请求：
```http
GET /query/support-list?type=STOCK_US
```

响应示例：
```json
{
  "full": true,
  "version": "20260309020000",
  "items": [
    {
      "symbol": "AAPL.US",
      "name": "Apple Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ]
}
```

### 4.3 拉取增量

请求：
```http
GET /query/support-list?type=STOCK_US&since=20260301020000
```

响应示例：
```json
{
  "full": false,
  "from": "20260301020000",
  "to": "20260309020000",
  "added": [
    {
      "symbol": "TSLA.US",
      "name": "Tesla Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ],
  "updated": [
    {
      "symbol": "META.US",
      "name": "Meta Platforms, Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ],
  "removed": ["BABA.US"]
}
```

### 4.4 带 symbols 过滤

请求：
```http
GET /query/support-list?type=STOCK_US&since=20260301020000&symbols=AAPL.US,TSLA.US
```

行为：
1. `added/updated/removed` 仅返回命中 `symbols` 的条目。
2. 不命中过滤条件的数据不会返回。

## 5. 版本对齐规则

1. `since == currentVersion`：返回空增量。
2. `since` 太老或增量链路不完整：自动回退全量（`full: true`）。
3. `removed` 必须被下游消费，否则本地数据无法收敛到最新状态。

## 6. 下游推荐对齐流程

1. 调用 `/query/support-list/meta` 读取 `currentVersion`。
2. 首次接入：调用 `/query/support-list?type=...` 拉全量并保存版本。
3. 后续轮询：调用 `/query/support-list?type=...&since=<本地版本>`。
4. 收到 `full: true`：覆盖本地数据。
5. 收到 `full: false`：按 `added/updated/removed` 应用变更。
6. 更新本地版本到响应中的 `version` 或 `to`。

## 7. 错误与边界

1. `type` 非法：返回 400。
2. `since` 格式非法：返回 400。
3. `since` 为未来时间：返回 400。
4. 存储中暂无数据：服务会先尝试初始化，仍无数据时返回业务错误。

## 8. 注意事项

1. 增量保留窗口当前为 7 天。
2. 每日同步周期当前为 1 天（默认每日 02:00，可由环境变量覆盖 cron）。
3. 该能力属于弱时效接口，适用于清单同步，不用于毫秒级行情场景。

## 9. 配置项（多 provider 场景）

1. `SUPPORT_LIST_TYPES`
- 作用：定义支持的 `type` 白名单。
- 示例：`SUPPORT_LIST_TYPES=STOCK_US,STOCK_HK,CRYPTO`

2. `PROVIDER_PRIORITY_GET_SUPPORT_LIST`
- 作用：设置 `get-support-list` 能力的 provider 优先级（复用现有 provider 切换机制）。
- 示例：`PROVIDER_PRIORITY_GET_SUPPORT_LIST=infoway,jvquant,longport`

3. `PROVIDER_PRIORITY_DEFAULT`
- 作用：能力级优先级未设置时的全局默认 provider 顺序。

4. 行为说明
- 不启用 provider pin 固定策略。
- 不引入 source-switch 标记字段。
- 当首选 provider 拉取失败时，会按优先级自动尝试下一个候选 provider。
