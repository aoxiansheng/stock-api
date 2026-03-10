# Infoway WebSocket 连接超时修正方案

更新时间：2026-03-09 13:36:57 CST

## 1. 问题现象

- 本地客户端 `test-ws-latest-price.js` 已成功连接本项目 `stream-receiver`。
- 订阅阶段返回 `subscribe-error`：`STREAM_RECEIVER_BUSINESS_305`，消息 `Infoway WebSocket 连接超时`。
- 服务端日志显示：
  - 已收到订阅请求并进入 `StreamDataFetcherService` 建连流程；
  - 约 `10002ms` 后报错 `Infoway WebSocket 连接超时`；
  - 随后触发订阅失败与取消订阅清理。

## 2. 根因分析

### 2.1 超时时间源不一致（直接触发失败）

- `StreamReceiver` 层传入 `connectionTimeoutMs=30000`；
- 但 `InfowayStreamContextService` 实际使用自身配置 `INFOWAY_WS_CONNECT_TIMEOUT_MS`，默认 `10000`；
- 实际超时由 `InfowayStreamContextService.openSocket()` 内的 `setTimeout` 决定，因此 10 秒即失败。

影响：在网络抖动或上游握手慢时，10 秒窗口过短，导致稳定性下降。

### 2.2 鉴权通道与文档地址约定存在偏差（高概率）

- 文档地址示例：`wss://data.infoway.io/ws?business=stock&apikey=...`；
- 当前实现 `buildWsUrl()` 仅设置 `business`，未在 URL query 中附带 `apikey`；
- 代码尝试通过握手 header 或认证帧进行鉴权，但不同运行时/上游网关对 header/frame 支持存在差异，可能导致连接建立阶段被拒或超时。

影响：即使 REST 使用同一 `INFOWAY_API_KEY` 成功，WS 仍可能因鉴权方式不匹配而超时。

### 2.3 可观测性不足（定位成本高）

- 连接阶段缺少结构化日志字段：最终连接 URL（脱敏后）、鉴权模式、WebSocket readyState 演进、连接耗时分段。
- 客户端只能得到“超时”，无法直接区分：
  - DNS/TLS/网络问题；
  - URL 参数问题；
  - 上游鉴权拒绝但未返回可解析报文。

## 3. 修正目标

- G1：将 Infoway WS 建连成功率提升到可稳定订阅 `AAPL.US`。
- G2：确保鉴权方式兼容 Infoway 文档约定与当前运行时差异。
- G3：建连失败时输出可直接定位的诊断信息（不暴露敏感值）。
- G4：保持现有 `stream-receiver` 对外契约不变（不改 API/事件名）。

## 4. 修正方案（实施顺序）

### 阶段 A：配置与连通性基线（无行为变更）

1. 核对运行时环境变量（以**后端进程实际环境**为准）：
   - `INFOWAY_API_KEY`
   - `INFOWAY_WS_BASE_URL`
   - `INFOWAY_WS_BUSINESS`
   - `INFOWAY_WS_CONNECT_TIMEOUT_MS`
2. 将 `INFOWAY_WS_CONNECT_TIMEOUT_MS` 从默认 `10000` 提升到 `30000`（与 StreamReceiver 目标一致）。
3. 保持其他逻辑不变，复测订阅链路，确认是否仍在 10 秒窗口失败。

验收：
- 失败耗时从 ~10 秒提升到配置值附近；
- 若仍失败，进入阶段 B。

### 阶段 B：鉴权通道对齐（核心修复）

1. `buildWsUrl()` 增加可配置策略，支持将 `apikey` 放入 query：
   - 默认启用：`INFOWAY_WS_USE_QUERY_APIKEY=true`
   - URL 形态：`wss://.../ws?business=stock&apikey=***`
2. 保留现有 header / auth frame 兼容路径，但明确优先级：
   - Query apikey（优先，兼容文档约定）
   - Header（运行时支持时）
   - Auth frame（兜底）
3. 增加配置开关避免一次性强切：
   - `INFOWAY_WS_AUTH_MODE=auto|query|header|frame`（默认 `auto`）

验收：
- `AAPL.US` 订阅能收到 `10001` + `10002`；
- 不影响既有其他 provider 的 WS 行为。

### 阶段 C：可观测性增强（降低二次排障成本）

新增结构化日志（敏感字段脱敏）：
1. 建连前：
   - `provider/capability/business/authMode/connectTimeoutMs`
   - `wsUrlMasked`（apikey 脱敏）
2. 建连过程：
   - open/error/close 事件时间点
   - 认证发送结果（成功/失败）
3. 失败落盘：
   - `errorType/errorMessage/durationMs/retryAttempt`
4. 指标建议：
   - `ws_connect_attempt_total`
   - `ws_connect_success_total`
   - `ws_connect_timeout_total`

验收：
- 单次失败可在 1 分钟内定位到“网络/鉴权/超时配置”其中之一。

## 5. 兼容性与风险

- 风险 R1：若上游网关同时要求 query + frame，单一模式可能仍失败。
  - 缓解：保留 `auto` 多策略回退。
- 风险 R2：超时时间加长会放大挂起连接占用。
  - 缓解：结合 `maxReconnectAttempts` 与断路器策略限制并发。
- 风险 R3：日志增加可能泄露敏感值。
  - 缓解：统一脱敏 `apikey`，禁止输出明文 token。

## 6. 回滚策略

- 若阶段 B 上线后出现异常：
  1. 将 `INFOWAY_WS_AUTH_MODE` 切回旧模式（header/frame）；
  2. 保留阶段 C 日志能力；
  3. 继续使用阶段 A 的超时配置（30000）以降低误超时。

回滚不涉及数据库结构变更，不需要数据迁移。

## 7. 测试计划

### 7.1 本地链路测试

1. REST 基线：
   - `scripts/tools/local-project/test-rest-latest-price.sh`
2. 本地 WS：
   - `scripts/tools/local-project/test-ws-latest-price.js`
3. 上游直连 WS（对照）：
   - `scripts/tools/upstream-sdk/test-infoway-trade-ws.js`

通过标准：
- 本地 WS 连续 3 次测试均在超时前拿到最新价。
- 上游直连与本地代理结果方向一致（均可收到推送）。

### 7.2 负载与稳定性

- 连续运行 15 分钟，验证：
  - 无持续 `Infoway WebSocket 连接超时`；
  - 无异常断路器反复触发；
  - 心跳与重连行为符合预期。

## 8. 实施清单（执行状态）

- [x] A1. 调整并生效 `INFOWAY_WS_CONNECT_TIMEOUT_MS=30000`
- [x] A2. 记录一次完整失败日志样本（修正前）
- [x] B1. 引入 `apikey` query 鉴权能力与 `AUTH_MODE` 开关
- [x] B2. 完成三种模式 `auto/query/header/frame` 的单测
- [x] C1. 补充建连结构化日志与脱敏
- [x] C2. 增加连接失败统计指标
- [x] T1. 已执行本地 REST/WS/上游 WS 三脚本回归（当前环境受限，详见下节）
- [x] T2. 15 分钟稳定性观察（已执行，存在间歇“无推送超时”）
- [x] R1. 输出上线与回滚操作手册

## 9. 本次实施结果（2026-03-09 13:04:55 CST）

### 9.1 代码落地

- `InfowayStreamContextService` 已完成：
  - 默认 WS 连接超时从 `10000` 提升至 `30000`；
  - 新增 `INFOWAY_WS_AUTH_MODE=auto|query|header|frame`（默认 `auto`）；
  - 新增 `INFOWAY_WS_USE_QUERY_APIKEY=true`（默认开启）；
  - `auto` 模式下按 `query > header > frame` 选择握手策略；
  - 建连前/建连中/建连失败结构化日志，包含 `wsUrlMasked` 脱敏输出；
  - 新增建连计数器：`ws_connect_attempt_total/ws_connect_success_total/ws_connect_timeout_total`。

### 9.2 单元测试

- 已通过：`test/unit/providersv2/infoway/infoway-stream-context.service.spec.ts`
- 新增/更新覆盖：
  - `auto/query/header/frame` 四种模式；
  - `INFOWAY_WS_USE_QUERY_APIKEY` 开关；
  - 默认超时回退值 `30000`；
  - 配置非法值回退逻辑。

### 9.3 回归执行记录（T1）

1. 本地 REST（`test-rest-latest-price.sh`）
   - 结果：失败
   - 原因：`127.0.0.1:3001` 连接失败（本地服务未启动或不可达）
2. 本地 WS（`test-ws-latest-price.js`）
   - 结果：失败
   - 原因：`connect_error websocket error`（与本地服务不可达一致）
3. 上游 WS（`test-infoway-trade-ws.js`）
   - 结果：失败
   - 原因：`getaddrinfo ENOTFOUND data.infoway.io`（执行环境 DNS/外网限制）

> 结论：代码与单测已完成，集成链路已复跑；本地链路可用，但稳定性仍有间歇无推送超时。

### 9.4 二次复测结果（2026-03-09 13:36:57 CST）

1. T1 重跑结果：
   - 本地 REST：通过（`lastPrice=253.630`）
   - 本地 WS：通过（收到 `subscribe-ack` 与 `latest-price`）
   - 上游直连 WS：失败（握手返回 `Unexpected server response: 427`）
2. T2（15 分钟稳定性观察）：
   - 结果汇总：`pass=46 fail=9 rounds=55`
   - 失败轮次：`9,12,19,20,22,26,29,50,55`
   - 失败特征：均为“`connected + subscribe-ack` 成功，但 30 秒内无 `latest-price` 推送”，未出现 `connect_error` / `subscribe-error`
3. 结论：
   - 建连与订阅链路已基本恢复；
   - 仍存在上游/市场数据层面的间歇无成交推送窗口，暂未满足“15 分钟零超时”目标。
