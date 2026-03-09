# Infoway WebSocket 连接超时上线与回滚手册

更新时间：2026-03-09 13:04:55 CST

## 1. 目标

- 修复 Infoway WS 在本项目中的建连超时问题。
- 通过可配置鉴权模式提升兼容性。
- 增强日志可观测性，降低二次排障成本。

## 2. 变更范围

- 代码：`src/providersv2/providers/infoway/services/infoway-stream-context.service.ts`
- 单测：`test/unit/providersv2/infoway/infoway-stream-context.service.spec.ts`
- 配置默认值与文档：
  - `INFOWAY_WS_CONNECT_TIMEOUT_MS=30000`
  - `INFOWAY_WS_USE_QUERY_APIKEY=true`
  - `INFOWAY_WS_AUTH_MODE=auto`

## 3. 上线前检查

1. 核对后端运行时环境变量（以服务进程实际环境为准）：
- `INFOWAY_API_KEY`
- `INFOWAY_WS_BASE_URL`
- `INFOWAY_WS_BUSINESS`
- `INFOWAY_WS_CONNECT_TIMEOUT_MS`
- `INFOWAY_WS_USE_QUERY_APIKEY`
- `INFOWAY_WS_AUTH_MODE`

2. 建议基线配置：

```env
INFOWAY_WS_CONNECT_TIMEOUT_MS=30000
INFOWAY_WS_USE_QUERY_APIKEY=true
INFOWAY_WS_AUTH_MODE=auto
```

3. 单测校验：

```bash
cd stock-api
npm run test:unit -- test/unit/providersv2/infoway/infoway-stream-context.service.spec.ts
```

## 4. 上线步骤

1. 发布包含本次修复的版本。
2. 按基线配置更新运行环境。
3. 重启服务并观察首轮日志，重点关注：
- `Infoway WebSocket 开始建连`
- `Infoway WebSocket 已打开`
- `Infoway WebSocket 认证帧发送成功`
- `Infoway WebSocket 连接成功`

## 5. 上线后验证

### 5.1 本地项目链路

```bash
cd stock-api
APP_KEY="<app_key>" ACCESS_TOKEN="<access_token>" BASE_URL="http://127.0.0.1:3001" SYMBOL="AAPL.US" bash scripts/tools/local-project/test-rest-latest-price.sh

APP_KEY="<app_key>" ACCESS_TOKEN="<access_token>" BASE_URL="http://127.0.0.1:3001" SYMBOL="AAPL.US" node scripts/tools/local-project/test-ws-latest-price.js
```

### 5.2 上游对照链路

```bash
cd stock-api
API_KEY="<infoway_api_key>" CODES="AAPL.US" node scripts/tools/upstream-sdk/test-infoway-trade-ws.js
```

### 5.3 稳定性观察

- 持续运行 15 分钟，确认：
- 无持续 `Infoway WebSocket 连接超时`
- 无断路器反复触发
- 心跳与重连行为正常

## 6. 回滚策略

若上线后出现 WS 大面积失败，按以下顺序回滚：

1. 先切换鉴权模式（不回滚代码）：

```env
INFOWAY_WS_AUTH_MODE=header
# 或
INFOWAY_WS_AUTH_MODE=frame
```

2. 保留 `INFOWAY_WS_CONNECT_TIMEOUT_MS=30000`，避免误判短超时。
3. 重启服务并复测。
4. 若仍异常，再回滚到上一版本代码。

## 7. 快速排障指引

1. 先看 `wsUrlMasked` 是否包含预期 query 参数（不应出现明文完整 apikey）。
2. 看 `authModeConfigured` 与 `authModeResolved` 是否符合预期。
3. 看 `errorType`：
- `timeout`：优先检查网络/DNS/上游可达性
- `connect_error`：优先检查协议、鉴权模式、上游网关策略
4. 对比 `ws_connect_attempt_total/success_total/timeout_total` 趋势，判断是否是普遍失败。
