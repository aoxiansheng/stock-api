# Infoway 能力说明汇总

更新时间：2026-03-08

本文档汇总 `newstockapi` 中 `infoway` provider 的已落地能力、参数约束、环境变量和接入注意事项，供联调与运维排障使用。

## 1. 能力清单

| 能力名 | 传输类型 | 说明 | 支持市场 |
| --- | --- | --- | --- |
| `get-stock-quote` | REST | 获取最新行情快照（基于最近一根 K 线映射） | `HK/US/SH/SZ/CN` |
| `get-stock-history` | REST | 获取分时历史序列（MVP：单标的，默认 1m） | `HK/US/SH/SZ/CN` |
| `get-stock-basic-info` | REST | 获取证券基础资料 | `HK/US/SH/SZ/CN` |
| `get-market-status` | REST | 获取市场交易时段与状态信息 | `HK/US/SH/SZ/CN` |
| `get-trading-days` | REST | 获取交易日/半日市信息 | `HK/US/SH/SZ/CN` |
| `stream-stock-quote` | WebSocket | 订阅实时行情推送（K 线推送映射） | `HK/US/SH/SZ/CN` |

## 2. 关键输入输出

### 2.1 `get-stock-quote`

- 输入：`symbols[]`
- 输出：`quote_data[]`
- 关键字段：`symbol`、`lastPrice`、`previousClose`、`openPrice`、`highPrice`、`lowPrice`、`volume`、`turnover`、`change`、`changePercent`、`timestamp`、`tradeStatus`、`sourceProvider`

### 2.2 `get-stock-history`

- 输入：`symbols[]`、`market?`、`klineType?`、`klineNum?`、`timestamp?`
- 输出：`quote_data[]`（时间升序）
- 关键字段：同 `get-stock-quote`，附带 `market`

### 2.3 `get-stock-basic-info`

- 输入：`symbols[]`、`market?`
- 输出：数组
- 关键字段：`symbol`、`market`、`nameCn/nameEn/nameHk`、`exchange`、`currency`、`lotSize`、`totalShares`、`circulatingShares`、`board`、`sourceProvider`

### 2.4 `get-market-status`

- 输入：`symbols?`、`market?`
- 输出：数组
- 关键字段：`market`、`remark`、`tradeSchedules[]`、`sourceProvider`

### 2.5 `get-trading-days`

- 输入：`market?`、`symbols?`、`beginDay?`、`endDay?`
- 输出：数组（单市场）
- 关键字段：`market`、`beginDay`、`endDay`、`tradeDays[]`、`halfTradeDays[]`、`sourceProvider`

### 2.6 `stream-stock-quote`

- 输入：WebSocket `subscribe`：`symbols[]`、`wsCapabilityType=stream-stock-quote`、`preferredProvider=infoway`
- 输出事件：`data`
- 推送关键字段：`symbol`、`lastPrice`、`previousClose`、`openPrice`、`highPrice`、`lowPrice`、`volume`、`turnover`、`change`、`changePercent`、`timestamp`、`tradeStatus`

## 3. 参数约束与边界

### 3.1 符号规则

- 格式：`*.HK`、`*.US`、`*.SH`、`*.SZ`
- 自动标准化：转大写、去重
- 单个 symbol 最大长度：`32`

### 3.2 数量限制

- REST 常规能力：`symbols <= 600`
- WS 订阅总量：`symbols <= 600`
- `get-stock-history`：`symbols <= 1`（MVP 单标的）

### 3.3 历史分时约束

- `klineType` 允许值：`1/5/15/30/60`
- `klineNum` 最大值：`500`
- `timestamp` 仅支持 10/13 位正整数时间戳
- 当 `klineType` 非法时，服务端回退到配置默认值（并记录告警日志）

## 4. 环境变量

### 4.1 必填

| 变量 | 说明 |
| --- | --- |
| `INFOWAY_API_KEY` | Infoway 鉴权 key |

### 4.2 常用可选（已在 `.env` 显式给出）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `INFOWAY_BASE_URL` | `https://data.infoway.io` | REST 基础地址 |
| `INFOWAY_WS_BASE_URL` | `wss://data.infoway.io/ws` | WS 基础地址 |
| `INFOWAY_WS_BUSINESS` | `stock` | WS 业务域 |
| `INFOWAY_HTTP_TIMEOUT_MS` | `10000` | REST 超时 |
| `INFOWAY_QUOTE_KLINE_TYPE` | `1` | 报价能力 K 线类型 |
| `INFOWAY_QUOTE_KLINE_NUM` | `1` | 报价能力 K 线根数 |
| `INFOWAY_INTRADAY_KLINE_TYPE` | `1` | 历史分时默认 K 线类型 |
| `INFOWAY_INTRADAY_KLINE_NUM` | `240` | 历史分时默认点位 |
| `INFOWAY_INTRADAY_LOOKBACK_DAYS` | `1` | 历史回看天数上限 |
| `INFOWAY_WS_CONNECT_TIMEOUT_MS` | `10000` | WS 连接超时 |
| `INFOWAY_WS_HEARTBEAT_MS` | `30000` | WS 心跳间隔 |
| `INFOWAY_WS_RECONNECT_DELAY_MS` | `3000` | WS 初始重连延迟 |
| `INFOWAY_WS_RECONNECT_MAX_DELAY_MS` | `30000` | WS 最大重连延迟 |
| `INFOWAY_WS_RECONNECT_JITTER_MS` | `500` | WS 重连抖动 |
| `INFOWAY_WS_MAX_RECONNECT_ATTEMPTS` | `8` | WS 最大重连次数 |
| `INFOWAY_WS_KLINE_TYPE` | `1` | WS 订阅 K 线类型 |
| `INFOWAY_WS_AUTH_FRAME_CODE` | `90001` | WS 认证帧 code |

### 4.3 `.env` 注释示例（补齐变量）

```env
# Infoway 数据源（REST + WebSocket）
# Infoway 鉴权 key（必填）
INFOWAY_API_KEY=<your-infoway-api-key>
# Infoway REST 基础地址
INFOWAY_BASE_URL=https://data.infoway.io
# Infoway WebSocket 基础地址
INFOWAY_WS_BASE_URL=wss://data.infoway.io/ws
# Infoway WebSocket 业务域（默认 stock）
INFOWAY_WS_BUSINESS=stock
# Infoway REST 请求超时（毫秒）
INFOWAY_HTTP_TIMEOUT_MS=10000
# get-stock-quote 使用的 K 线类型
INFOWAY_QUOTE_KLINE_TYPE=1
# get-stock-quote 使用的 K 线根数
INFOWAY_QUOTE_KLINE_NUM=1
# get-stock-history 默认 K 线类型（允许 1/5/15/30/60）
INFOWAY_INTRADAY_KLINE_TYPE=1
# get-stock-history 默认回填点数
INFOWAY_INTRADAY_KLINE_NUM=240
# get-stock-history 默认回看天数
INFOWAY_INTRADAY_LOOKBACK_DAYS=1
# Infoway WS 连接超时（毫秒）
INFOWAY_WS_CONNECT_TIMEOUT_MS=10000
# Infoway WS 心跳间隔（毫秒）
INFOWAY_WS_HEARTBEAT_MS=30000
# Infoway WS 初始重连延迟（毫秒）
INFOWAY_WS_RECONNECT_DELAY_MS=3000
# Infoway WS 最大重连延迟（毫秒）
INFOWAY_WS_RECONNECT_MAX_DELAY_MS=30000
# Infoway WS 重连抖动（毫秒）
INFOWAY_WS_RECONNECT_JITTER_MS=500
# Infoway WS 最大重连次数
INFOWAY_WS_MAX_RECONNECT_ATTEMPTS=8
# Infoway WS 订阅 K 线类型
INFOWAY_WS_KLINE_TYPE=1
# Infoway WS 认证帧 code
INFOWAY_WS_AUTH_FRAME_CODE=90001

# request-recovery 历史兜底（Infoway）
# 是否开启历史兜底（缓存不足时回拉历史）
RECOVERY_HISTORY_FALLBACK_ENABLED=true
# 判定缓存缺口阈值（毫秒）
RECOVERY_GAP_THRESHOLD_MS=90000
# 缓存覆盖率阈值（0~1）
RECOVERY_MIN_COVERAGE_RATIO=0.6
# 单次历史兜底最大点数
RECOVERY_MAX_HISTORY_POINTS=240
```

## 5. 与恢复链路协同

`request-recovery` 历史兜底依赖 `get-stock-history`。建议保持以下开关与阈值：

- `RECOVERY_HISTORY_FALLBACK_ENABLED=true`
- `RECOVERY_GAP_THRESHOLD_MS=90000`
- `RECOVERY_MIN_COVERAGE_RATIO=0.6`
- `RECOVERY_MAX_HISTORY_POINTS=240`

## 6. 对接建议

- 历史 + 实时场景：先 `get-stock-history`，后 `stream-stock-quote`，按 `symbol + minute(timestamp)` upsert。
- 若请求跨市场 symbol，显式传 `market` 或按市场拆分请求，避免参数冲突。
- 服务端返回的 `timestamp` 已规范为 ISO 时间，客户端统一按 UTC 分钟桶处理。

## 7. 相关文档

- `docs/done/Infoway-分时图实现计划.md`
- `docs/done/request-recovery-历史兜底修复计划.md`
- `docs/done/infoway/`（上游接口原始资料）
