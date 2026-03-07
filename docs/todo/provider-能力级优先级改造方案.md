# Provider 能力级优先级改造方案

## 1. 目标

将当前“写死的 provider 全局优先级”改造为“按能力（capability）可配置优先级”，并通过 Env 完成配置。

关键要求：
- 删除写死分级（`longport(1) -> jvquant(2) -> infoway(3)`）。
- 不同能力可独立排序。
- 仍保留 `preferredProvider` 的最高优先级语义。

---

## 2. 当前问题（基于现状代码）

当前 `ProviderRegistryService` 在 `onModuleInit` 时显式注册并传入硬编码优先级：
- `longport=1`
- `jvquant=2`
- `infoway=3`

`getBestProvider(capability, market)` 直接按这个固定 priority 排序，导致：
- 同一套排序被用于所有 capability。
- 无法对 `get-stock-quote`、`get-market-status` 分别配置。
- 新 provider 接入后只能继续改代码，不符合配置化目标。

---

## 3. 配置模型（Env）

采用“默认顺序 + 能力覆盖顺序”模型。

### 3.1 Env 设计

- `PROVIDER_PRIORITY_DEFAULT`
  - 逗号分隔，定义默认 provider 顺序。
  - 示例：`longport,jvquant,infoway`

- `PROVIDER_PRIORITY_<CAPABILITY_KEY>`
  - 能力级覆盖顺序。
  - `<CAPABILITY_KEY>` 使用 receiverType 转大写并将 `-` 替换为 `_`。
  - 例如：
    - `get-stock-quote` -> `PROVIDER_PRIORITY_GET_STOCK_QUOTE`
    - `get-market-status` -> `PROVIDER_PRIORITY_GET_MARKET_STATUS`

### 3.2 你给出的目标配置示例

```env
PROVIDER_PRIORITY_DEFAULT=longport,jvquant,infoway
PROVIDER_PRIORITY_GET_MARKET_STATUS=longport,jvquant,infoway
PROVIDER_PRIORITY_GET_STOCK_QUOTE=infoway,jvquant,longport
```

---

## 4. 选择算法（仅设计）

输入：`capabilityName`、`market`、候选 provider 集合（必须支持该 capability 且支持该 market）。

步骤：
1. 若请求携带 `preferredProvider`：
   - 先做能力/市场校验。
   - 校验通过直接使用（保持现有语义）。
2. 若未指定 `preferredProvider`：
   - 从候选 provider 中筛选可用项。
   - 读取 `PROVIDER_PRIORITY_<CAPABILITY_KEY>`；若不存在，回退 `PROVIDER_PRIORITY_DEFAULT`。
   - 按配置列表顺序对候选排序。
   - 配置中未出现的候选 provider 追加到末尾（按注册顺序），避免误配导致不可用。
3. 候选为空则返回 `null`，由上层抛业务异常（保持现有行为）。

---

## 5. 代码改造点位（计划）

### 5.1 `src/providersv2/provider-registry.service.ts`

改造目标：移除写死 priority。

计划变更：
- 删除 `registerProvider(provider, priority)` 中 `priority` 参数与 `CapabilityMeta.priority` 存储。
- `onModuleInit()` 改为无优先级注册：仅注册 provider 与 capability 元数据。
- 新增“能力候选列表获取”方法（例如 `getCandidateProviders(capabilityName, market?)`），返回可用 provider 列表。
- `getBestProvider(capabilityName, market?)` 改为委托“优先级策略服务”进行排序决策。

### 5.2 新增策略服务（建议）

新增：`src/providersv2/provider-priority-policy.service.ts`

职责（单一职责）：
- 解析 Env 配置。
- 校验 provider 名称合法性、去重、空项清洗。
- 根据 capability 返回排序后的 provider 列表。

建议接口：
- `getOrderForCapability(capabilityName: string): string[]`
- `rankCandidates(capabilityName: string, candidates: string[]): string[]`

### 5.3 `src/core/01-entry/receiver/services/receiver.service.ts`

- 保持 `preferredProvider` 优先逻辑不变。
- 自动选择时继续调用 `getBestProvider`，但其行为将由能力级策略驱动。

### 5.4 防漏改标注（市场优先级 -> 功能优先级）

> ⚠️ 后续实施时必须处理，避免“只改 registry、漏改 stream 入口策略”。

任务描述（本条为后续改造任务卡）：
- 将流式入口中基于市场的 provider 选择逻辑，统一迁移为“基于 capability 的 provider 优先级”。
- 废弃 `STREAM_MARKET_PROVIDER_PRIORITIES` 作为决策来源，改为复用能力级优先级策略（与 `ProviderRegistryService.getBestProvider(capability, market)` 保持一致语义）。
- 禁止新增兼容回退分支；保持 `preferredProvider` 的最高优先级语义不变。

本次标注涉及必查点（按函数）：
- `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `STREAM_MARKET_PROVIDER_PRIORITIES`
  - `getMarketPriorityProviders`
  - `getPrimaryProviderByMarket`
  - `buildMarketPrioritiesSnapshot`
  - `getProviderByMarketPriority`
  - `selectProviderBasic`
  - `getProviderByHeuristics`
  - `getProviderSelectionStrategy`

验收核对项：
- 不再以“market -> provider”作为主决策依据，而是“capability -> provider 排序”。
- stream 与 receiver 在同一 capability + market 输入下选择结果一致。
- 现有单测补齐“能力优先级生效”断言，且保留 `preferredProvider` 路径测试。

---

## 6. 配置校验与容错策略

启动时校验（日志告警，不阻塞启动）：
- Env 中出现未知 provider：告警并忽略该项。
- 列表重复 provider：自动去重保留首次出现。
- capability 级配置为空：回退默认配置。
- 默认配置为空：回退“注册顺序”。

运行时日志建议输出：
- `capability`
- `market`
- `candidates(before)`
- `configuredOrder`
- `selectedProvider`
- `selectionReason`（preferred/configured/fallback）

---

## 7. 行为示例（预期）

在上述 Env 下：

- 请求 `receiverType=get-stock-quote`（未指定 preferredProvider）
  - 候选若都可用，则选择 `infoway`。

- 请求 `receiverType=get-market-status`（未指定 preferredProvider）
  - 候选若都可用，则选择 `longport`（若 longport 不支持该能力，则自动选下一位）。

- 请求指定 `preferredProvider=infoway`
  - 校验通过后始终使用 `infoway`，不参与自动排序。

---

## 8. 迁移步骤

1. 引入 `ProviderPriorityPolicyService`（仅读配置和排序，不影响既有逻辑）。
2. 改 `ProviderRegistryService`：去掉硬编码 priority，接入策略服务。
3. 增加启动日志，打印每个关键 capability 的最终优先顺序。
4. 回归测试：
   - `preferredProvider` 路径。
   - 自动选择路径（quote/market-status）。
   - 不同市场约束下的 provider 过滤。
5. 更新 `.env.example` 与接入文档。

---

## 9. 验收标准

- 不再存在硬编码 provider 分级。
- 同一服务内不同 capability 可配置不同优先级。
- `preferredProvider` 语义保持不变。
- 无配置时系统可运行，并具备可解释的回退顺序。
- 日志可追踪 provider 选择过程与原因。

---

## 10. 风险与控制

风险：
- Env 误配置导致排序异常。
- 新 provider 未加入排序导致意外靠后。

控制：
- 启动期校验 + 明确告警。
- 未配置 provider 自动追加到末尾，避免功能中断。
- 提供标准 `.env.example` 模板，减少人工错误。
