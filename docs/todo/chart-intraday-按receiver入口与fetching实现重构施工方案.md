# Chart Intraday 按 Receiver 入口与 Fetching 实现重构施工方案

更新时间：2026-03-10

## 1. 背景与结论

针对 `src/core/01-entry/chart-intraday` 的落位问题，当前结论如下：

- `chart-intraday` 不应继续作为 `01-entry` 下与 `receiver` 平级的独立入口模块存在。
- `chart-intraday` 的对外语义属于强时效接口，其入口应归属 `01-entry/receiver`。
- `chart-intraday` 的核心实现应下沉到 `03-fetching`，模式对齐 `support-list`：入口层只消费，能力实现层独立提供读取能力。
- `02-processing` 在本项目中应保持“通用独立处理能力、只被消费”的边界，不承载该类面向具体接口的聚合读取逻辑。

因此，本次重构目标不是“简单搬目录”，而是调整为以下结构：

- `01-entry/receiver`：对外 HTTP 入口、鉴权、参数接收、薄编排
- `03-fetching/chart-intraday`：分时快照/增量的核心实现
- `03-fetching` 继续依赖 `data-fetcher/stream-data-fetcher/storage/cache` 等下层能力

## 2. 参考依据

本方案主要参考以下现有实现模式：

### 2.1 support-list 既有模式

`support-list` 当前已经形成“入口消费 + fetching 实现”的稳定结构：

- `src/core/03-fetching/support-list/module/support-list.module.ts`
- `src/core/03-fetching/support-list/services/support-list-read.service.ts`
- `src/core/01-entry/query/services/support-list-query.service.ts`

该模式的要点是：

- `03-fetching/support-list` 内部承载完整读取能力，包括读、拉取、存储、同步、差异计算。
- `01-entry/query` 仅保留薄入口，直接调用 `SupportListReadService`。
- 入口层不拥有该能力的核心实现，只负责暴露对外协议。

### 2.2 receiver 的职责边界

`receiver` 是当前项目中强时效接口的统一入口族，适合承接：

- 强时效路由暴露
- 鉴权与 Swagger 暴露
- 参数协议控制
- 迁移提示和兼容入口

因此 `chart-intraday` 的 HTTP 入口应归入 `receiver`，而不是继续单独挂在 `01-entry` 顶层。

## 3. 当前实现存在的问题

当前 `src/core/01-entry/chart-intraday` 的主要问题不是代码是否可运行，而是架构落位和职责边界不清晰。

### 3.1 入口层拥有完整实现

当前 `ChartIntradayService` 同时承担：

- 快照与增量编排
- 历史基线拉取
- 实时点读取
- 点位标准化
- 秒桶合并与去重
- tradingDay 判断
- cursor 编解码与签名校验

这使 `01-entry` 不再是单纯入口，而变成了“具体能力实现层”。

### 3.2 与 receiver 平级不合理

当前目录结构：

```text
src/core/01-entry/
├── receiver/
├── query/
├── stream-receiver/
└── chart-intraday/
```

这里的 `chart-intraday` 实际上不是新的入口族，而是强时效场景下的一种具体读取能力，因此不应与 `receiver` 平级。

### 3.3 直接反向依赖 fetching 内部细节

当前 `ChartIntradayService` 通过 `StreamDataFetcherService.getStreamDataCache()` 获取缓存。

这存在两个问题：

- 入口层直接依赖 fetching 内部暴露的方法，耦合过深。
- `StreamDataFetcherService` 变成“既是流连接实现，又是缓存访问门面”，边界不清晰。

### 3.4 cursor 协议实现重复

当前 `chart-intraday` 与 `stream-client-state-manager` 中都存在一套分时 cursor 组装与签名逻辑。

这会带来：

- 行为漂移风险
- 维护成本增加
- 未来 K 线接口继续复制的概率很高

## 4. 重构目标

本次重构目标如下：

1. 将 `chart-intraday` 对外入口并入 `receiver` 体系。
2. 将分时读取核心实现迁入 `03-fetching/chart-intraday`。
3. 使 `receiver` 只消费 `03-fetching/chart-intraday` 提供的服务。
4. 避免 `01-entry` 直接依赖 `stream-data-fetcher` 的内部细节。
5. 为后续 `chart-kline` 提供一致的落位模板。

## 5. 目标目录结构

建议调整后的目录结构如下：

```text
src/core/
├── 01-entry/
│   └── receiver/
│       ├── controller/
│       │   ├── receiver.controller.ts
│       │   └── receiver-chart-intraday.controller.ts
│       ├── dto/
│       │   ├── data-request.dto.ts
│       │   ├── intraday-snapshot-request.dto
│       │   ├── intraday-delta-request.dto
│       │   └── intraday-line-response.dto
│       ├── services/
│       │   ├── receiver.service.ts
│       │   └── receiver-chart-intraday.service.ts
│       └── module/
│           └── receiver.module.ts
│
├── 03-fetching/
│   ├── chart-intraday/
│   │   ├── module/
│   │   │   └── chart-intraday.module.ts
│   │   └── services/
│   │       ├── chart-intraday-read.service.ts
│   │       ├── chart-intraday-history-gateway.service.ts
│   │       ├── chart-intraday-realtime-read.service.ts
│   │       └── chart-intraday-cursor.service.ts
│   │
│   ├── data-fetcher/
│   ├── stream-data-fetcher/
│   └── support-list/
```

说明：

- `receiver-chart-intraday.controller.ts` 是否拆单文件，可按现有 controller 规模决定。
- DTO 可以保留在 `receiver/dto`，因为 DTO 属于对外协议。
- 如果希望减少文件数，`history-gateway/realtime-read/cursor` 可先合并为 2 个服务，不必一步拆到最细。

## 6. 文件迁移建议

### 6.1 迁移到 receiver 的内容

以下内容应保留或迁入 `01-entry/receiver`：

- `chart-intraday.controller.ts`
- `intraday-snapshot-request.dto.ts`
- `intraday-delta-request.dto.ts`
- `intraday-line-response.dto.ts`
- 面向 HTTP 的薄编排服务

入口层职责限定为：

- 处理 `/receiver/chart/intraday-line/...` 或等价强时效路由
- 调用 fetching 层的读取服务
- 不自己做点位聚合和 cursor 细节实现

### 6.2 迁移到 fetching 的内容

以下内容应迁入 `03-fetching/chart-intraday`：

- `getSnapshot` 的核心读取逻辑
- `getDelta` 的核心读取逻辑
- `fetchHistoryBaseline`
- `fetchRealtimePoints`
- `mergeAndNormalizePoints`
- `resolveContext`
- `resolveTradingDayEndTimestampSeconds`
- `encodeCursor/decodeCursor/assertCursorValid`

说明：

- 这些逻辑共同构成“分时读取能力”。
- 从项目内部约定看，它更接近 `support-list-read.service.ts` 的定位，而不是 `receiver.service.ts` 的定位。

### 6.3 暂不迁移到 02-processing 的内容

以下能力虽然有“处理”特征，但本次不下沉至 `02-processing`：

- 秒桶归并
- snapshot/delta 的读取编排
- cursor 协议
- tradingDay 上下文解析

原因：

- 它们是 `chart-intraday` 这个具体读取能力的内聚实现，不是独立的、通用可复用处理能力。
- 若过早抽到 `02-processing`，容易造成“为抽象而抽象”，违背当前项目的真实边界。

## 7. 推荐服务拆分

### 7.1 `ChartIntradayReadService`

职责：

- 对外提供 `getSnapshot` / `getDelta`
- 编排历史基线读取、实时点读取、合并输出
- 输出最终业务响应对象

该服务相当于 `support-list-read.service.ts` 对应的读取门面。

### 7.2 `ChartIntradayHistoryGatewayService`

职责：

- 调用 `ReceiverService.handleRequest` 获取 `get-stock-history`
- 屏蔽历史基线拉取参数组装细节
- 对返回数据做最基础的有效性收敛

说明：

- 仍可复用 `ReceiverService`，因为历史基线本身属于强时效能力调用。
- 这里不是绕开 `receiver`，而是在 fetching 内部以网关方式消费它。

### 7.3 `ChartIntradayRealtimeReadService`

职责：

- 从流缓存层读取 `quote:{symbol}` 的实时点
- 屏蔽 `stream-data-fetcher` 内部结构
- 将实时点读取逻辑独立出去

推荐依赖方向：

- 优先直接依赖缓存层服务或一个更窄的读取抽象
- 避免继续通过 `StreamDataFetcherService.getStreamDataCache()` 访问

### 7.4 `ChartIntradayCursorService`

职责：

- 统一 `encode/decode/validate/sign`
- 供 HTTP Snapshot/Delta 与 WS 推送复用

说明：

- 若后续 `chart-kline` 使用同一协议模型，该服务可继续复用。
- 本次可先放在 `03-fetching/chart-intraday/services`，待第二阶段再抽至 shared。

## 8. Receiver 侧改造建议

### 8.1 路由归属

建议将分时接口路由归到 `receiver` 体系，例如：

- `POST /api/v1/receiver/chart/intraday-line/snapshot`
- `POST /api/v1/receiver/chart/intraday-line/delta`

是否保留原路径：

- 若当前已有客户端接入 `POST /api/v1/chart/intraday-line/...`，建议增加兼容期。
- 兼容期内可保留旧路径，并返回相同数据。
- 稳定后再评估是否下线旧入口。

### 8.2 入口层服务形态

可增加一个薄服务，例如：

- `ReceiverChartIntradayService`

职责仅为：

- 接收 DTO
- 调用 `ChartIntradayReadService`
- 保持 `receiver` 内部风格一致

如果不想增加一层服务，也可以 controller 直接注入 `ChartIntradayReadService`，但从风格一致性看，建议保留一层薄 service。

## 9. 模块依赖建议

推荐依赖关系如下：

```text
ReceiverModule
  -> ChartIntradayFetchingModule
  -> ReceiverService

ChartIntradayFetchingModule
  -> ReceiverModule 或 ReceiverService 提供模块
  -> StreamCacheModule / StreamDataFetcherModule（按最终抽象决定）
  -> SharedServicesModule（如需）
```

注意点：

- 若 `ChartIntradayFetchingModule` 直接依赖 `ReceiverModule`，需检查是否形成循环依赖。
- 更稳妥的做法是：
  - 保持 `ReceiverService` 所在模块可被导出
  - `ChartIntradayFetchingModule` 只依赖导出的 `ReceiverService`
- 如存在循环依赖，应优先通过拆分 Provider 所在模块解决，不建议直接堆 `forwardRef`。

## 10. 分阶段施工步骤

### 阶段 1：能力下沉，不改对外行为

目标：

- 先把 `chart-intraday` 的核心实现迁到 `03-fetching/chart-intraday`
- 旧 controller/旧路径暂时不变

步骤：

1. 新建 `03-fetching/chart-intraday/module/chart-intraday.module.ts`
2. 新建 `ChartIntradayReadService`
3. 将现有 `ChartIntradayService` 的核心逻辑拆入 fetching 层
4. 原 `01-entry/chart-intraday` 改为薄入口，仅调用 fetching 服务
5. 保持对外 API 契约和测试行为不变

收益：

- 风险低
- 便于验证行为等价
- 为后续入口迁移铺路

### 阶段 2：入口并入 receiver

目标：

- 将 `01-entry/chart-intraday` 中的入口迁入 `01-entry/receiver`
- `chart-intraday` 不再作为独立入口模块存在

步骤：

1. 在 `receiver/controller` 中新增分时路由 controller
2. 将 DTO 移入 `receiver/dto` 或建立 `receiver/dto/chart-intraday` 子目录
3. 在 `receiver.module.ts` 中引入 `ChartIntradayFetchingModule`
4. 移除 `AppModule` 中对旧 `ChartIntradayModule` 的直接注册
5. 删除旧 `01-entry/chart-intraday` 目录

收益：

- 入口结构回归清晰
- 强时效接口统一归口 `receiver`

### 阶段 3：消除内部重复和反向耦合

目标：

- 统一 cursor 协议实现
- 弱化 fetching 对 stream-data-fetcher 内部细节的依赖

步骤：

1. 抽出 `ChartIntradayCursorService`
2. 让 WS 推送与 HTTP 共享同一 cursor 逻辑
3. 抽象实时点读取门面，替代 `getStreamDataCache()` 访问方式
4. 若 `chart-kline` 启动开发，直接复用该模式

## 11. 测试调整建议

### 11.1 第一阶段测试目标

必须保持以下行为不变：

- Snapshot 合并分钟基线与实时点
- 同秒实时点覆盖历史点
- tradingDay 过滤行为
- delta 基于 cursor 返回增量
- `strictProviderConsistency` 行为
- cursor 篡改、过期、超前签发等异常分支

### 11.2 测试文件迁移建议

当前测试：

- `test/unit/core/01-entry/chart-intraday/services/chart-intraday.service.spec.ts`
- `test/unit/core/01-entry/chart-intraday/controller/chart-intraday.controller.spec.ts`

建议迁移后调整为：

- `test/unit/core/03-fetching/chart-intraday/services/chart-intraday-read.service.spec.ts`
- `test/unit/core/01-entry/receiver/controller/receiver-chart-intraday.controller.spec.ts`
- `test/unit/core/01-entry/receiver/services/receiver-chart-intraday.service.spec.ts`（如新增）

原则：

- 读取行为测试跟随 fetching 实现
- controller 透传测试跟随 receiver 入口

## 12. 风险点

### 12.1 模块循环依赖

最大风险是：

- `chart-intraday` fetching 实现内部仍需使用 `ReceiverService`
- 而入口最终又在 `ReceiverModule` 中消费 `ChartIntradayFetchingModule`

需要优先设计 Provider 导出边界，避免互相 import 整个模块。

### 12.2 路由兼容性

如果已有客户端依赖旧路径：

- 不能直接删除旧路由
- 需要给出兼容期或迁移提示

### 12.3 WS cursor 行为漂移

如果 HTTP 与 WS cursor 实现未及时统一，可能出现：

- HTTP 可接受但 WS 不可消费
- WS 可生成但 Delta 校验失败

因此第三阶段应尽快完成 cursor 统一。

## 13. 验收标准

完成本次重构后，应满足以下标准：

1. `01-entry` 顶层不再存在独立的 `chart-intraday` 入口模块。
2. 分时接口入口归属于 `receiver`。
3. 分时核心实现位于 `03-fetching/chart-intraday`。
4. `02-processing` 未引入该具体能力实现。
5. 现有 Snapshot/Delta 对外契约不变或有明确兼容方案。
6. 单元测试仍能覆盖现有关键分支。
7. 新结构可直接作为 `chart-kline` 的参考模板。

## 14. 推荐实施顺序

建议按以下顺序执行，风险最低：

1. 先做“能力下沉”到 `03-fetching`，不动对外入口。
2. 验证行为稳定后，再并入 `receiver` 入口。
3. 最后消除 cursor 重复与实时缓存读取耦合。

不建议的顺序：

- 先改路由、再改实现
- 一次性同时改目录、路由、模块依赖、cursor 协议

这样会导致问题定位困难，回滚成本高。

## 15. 本文档对应的后续实施任务

后续真正施工时，建议拆成 3 个独立任务：

1. `feat(fetching): 下沉 chart-intraday 核心实现到 03-fetching`
2. `refactor(receiver): 将 chart-intraday 入口并入 receiver`
3. `refactor(chart-intraday): 统一 cursor 协议并消除 stream cache 反向依赖`

以上三步完成后，`chart-intraday` 的架构位置将与当前项目的 `support-list` 模式保持一致，并满足“强时效入口归 receiver、能力实现归 fetching”的设计要求。
