# 分时图 API 测试报告

写入时间：2026-03-21 02:09:55 CST

## 测试环境

- 后端地址：`http://127.0.0.1:3001`
- 认证方式：主调用方 + 第二调用方两套 API Key（真实值未写入报告）
- 执行策略：目录内测试脚本按组串行执行，组间固定间隔 `10s`
- 统一测试参数：`pointLimit=3000`、`deltaLimit=200`、`wsTimeoutMs=30000`
- 主验证标的：`BTCUSDT`
- 压测额外标的：`ETHUSDT`

## 结果总览

| 脚本 | 测试目的 | 结果 | 关键结论 | 产物 |
| --- | --- | --- | --- | --- |
| `test-chart-intraday-api-contract.js` | HTTP 契约、负例、双调用方租约隔离 | PASS | `snapshot/delta/release` 契约正确；`provider` 可选；双调用方 `release` 不互相影响 | `/tmp/intraday-suite-20260321/json/01-api-contract.json` |
| `test-chart-intraday-unified-protocol.js` | 标准主链路 `snapshot -> WS -> unsubscribe -> delta -> release` | PASS | `sync.realtime` 可直接驱动 WS；无需 `sessionId`；WS cursor 可用于 `delta` 补洞 | `/tmp/intraday-suite-20260321/json/02-unified-protocol.json` |
| `test-chart-intraday-snapshot-window.js` | 首屏窗口与上游 1m 历史基线对齐 | PASS | `historyPoints`、合并点数、首点锚点均与上游分钟历史一致 | `/tmp/intraday-suite-20260321/json/03-snapshot-window.json` |
| `test-crypto-intraday-snapshot-anchor-repro.js` | Crypto `tradingDay` 锚点与历史分钟线对齐 | PASS | 先 `snapshot` 自动解析 provider，再用解析后的 provider 对比 `get-crypto-history`，结果一致 | `/tmp/intraday-suite-20260321/logs/04-crypto-anchor-repro.log` |
| `test-chart-intraday-line-endpoint.sh` | HTTP-only 包装入口 | PASS | 已切换为按指南调用契约脚本，不再走旧轮询/旧字段 | `/tmp/intraday-suite-20260321/json/05-http-wrapper.json` |
| `test-chart-intraday-line-endpoint-ws.sh` | WS 包装入口 | PASS | 已切换为按指南调用统一协议脚本，不再依赖旧 `release.released` 字段 | `/tmp/intraday-suite-20260321/json/06-ws-wrapper.json` |
| `test-crypto-intraday-line-endpoint.sh` | Crypto HTTP-only 包装入口 | PASS | 默认不再强绑 `provider=infoway`，改为真实自动解析 | `/tmp/intraday-suite-20260321/json/07-crypto-http-wrapper.json` |
| `test-crypto-intraday-line-endpoint-ws.sh` | Crypto WS 包装入口 | PASS | 默认不再强绑 `provider=infoway`，走统一 WS 主链路 | `/tmp/intraday-suite-20260321/json/08-crypto-ws-wrapper.json` |
| `stress-chart-intraday-line-multi-user-endpoint.js` | 双 owner 压测 + cleanup release | PASS | 在真实主/副调用方凭证下通过；所有请求与 cleanup release 成功 | `/tmp/intraday-suite-20260321/json/09-stress-multi-owner.json` |

## 关键观察

1. 本轮所有正向测试都验证了指南要求的消费方式：
   `snapshot` 首屏初始化，WS 作为主增量通道，`delta` 仅作补洞，`release` 负责收尾释放。

2. 本轮所有 live 测试里，后端自动解析出的 `metadata.provider` 均为 `infoway`。

3. `test-chart-intraday-unified-protocol.js` 与两个 WS 包装脚本都已验证：
   不传 `sessionId` 也能仅依赖 `snapshot.sync.realtime` 建立正确订阅。

4. 所有 cleanup 都已执行：
   正向脚本在测试结束时都会调用 `release`；
   压测脚本会在结束后按 `ownerSlot + symbol + market + provider` 汇总清理。

5. 本轮观测到的 `release.upstreamReleased` 大多为 `false`：
   这与当前实现一致，表示本地 owner lease 已释放，但共享上游引用或 grace 状态未立即归零，不是协议错误。

## 压测说明

### 最终通过配置

- `symbols=BTCUSDT,ETHUSDT`
- `user-count=4`
- `concurrency=2`
- `requests=8`
- `global-interval-ms=1200`
- `verify-delta=true`

### 压测结果

- 总请求数：`8`
- 成功数：`8`
- 失败数：`0`
- 成功率：`100%`
- 总耗时：`8709ms`
- 实际吞吐：`0.92 rps`
- 平均延迟：`302.38ms`
- P95：`342ms`
- cleanup release：`4/4` 成功

### 限流现象

在无节流的更激进配置下，压测会命中上游 `429`，并导致成功率明显下降。  
因此，当前分时图本地压测结论应理解为：

- 协议链路本身已经跑通
- 对上游有限流约束时，压测必须显式做节流
- 当前可接受的安全压测节奏至少应包含：
  低并发 + 全局发包间隔

## 本次脚本改造结论

- 已修正目录迁移后的错误引用路径
- 已修正旧版 `release` 字段假设
- 已把包装脚本统一为消费指南推荐链路
- 已把默认 `provider` 行为改为“`snapshot` 自动解析，后续复用解析值”
- 已把多用户压测改为真实双调用方 owner 维度，而不是无效的伪 header

## 相关产物

- 原始日志目录：`/tmp/intraday-suite-20260321/logs`
- JSON 结果目录：`/tmp/intraday-suite-20260321/json`
