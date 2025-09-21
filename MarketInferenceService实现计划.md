# MarketInferenceService 实现计划

## 项目背景

基于smart-cache代码审核发现的架构问题：smart-cache作为编排器承担了不属于它的symbol到market推断业务逻辑职责，违反了职责分离原则。

## 全库检索发现的重复实现统计

### 核心发现：当前仅剩 6 条核心代码路径各自实现 Market 推断

#### 运行时代码分布

| 位置 | 方法/函数 | 描述 |
|------|-----------|------|
| `src/common/utils/symbol-validation.util.ts` | `getMarketFromSymbol` | 通用工具实现，目前覆盖 `.HK/.US/.SZ/.SH` 以及前缀规则 |
| `src/core/05-caching/smart-cache/utils/smart-cache-request.utils.ts` | `inferMarketFromSymbol` | Smart Cache 辅助函数，缺少 `.US` 后缀判断，默认返回 `US` |
| `src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts` | `private inferMarketFromSymbol` | 与上述函数重复，实现内聚但未复用 |
| `src/core/01-entry/receiver/services/receiver.service.ts` | `private extractMarketFromSymbols` | 首选动态导入 Smart Cache 辅助，内部仍保留旧正则 |
| `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts` | `private inferMarketFromSymbol` | 覆盖 `.HKG/.NASDAQ/.NYSE/.SGX`，输出 `HK/US/CN/SG/UNKNOWN` |
| `src/core/02-processing/symbol-transformer/services/symbol-transformer.service.ts` | `private inferMarketFromSymbols` | 基于预编译正则的简化判断，用于批量聚合 |
| `src/core/shared/services/data-change-detector.service.ts` | `private getSnapshotCacheTTL` | 通过符号后缀/正则决定缓存 TTL，逻辑需保持一致

#### 使用范围评估

- Smart Cache 相关（`smart-cache-request.utils.ts`、`smart-cache-orchestrator.service.ts`、`receiver.service.ts`）互相依赖，需同步演进。
- QueryExecutionEngine 不再维护独立推断逻辑，仅通过导入 Smart Cache 辅助函数。
- StreamReceiverService 需保留对 `.HKG/.NASDAQ/.NYSE/.SGX` 的识别，并在业务层输出 `CN/SG/UNKNOWN`。
- SymbolTransformerService 专注批量统计；DataChangeDetectorService 的 TTL 策略依赖与市场归类的一致性。

> 结论：重复逻辑集中于少量核心组件，重点在于统一规则与兼容差异，而非全库大规模迁移。

### 实现差异分析

```typescript
// ✅ 公共工具: SymbolValidationUtils.getMarketFromSymbol
// 支持 .HK/.US/.SZ/.SH + 六位数字前缀规则；返回 Market 枚举值 (HK/US/SZ/SH)
// 局限: 未识别 .HKG/.NASDAQ/.NYSE/.SGX，缺少 CN/SG/UNKNOWN 聚合能力

// ⚠️ Smart Cache 辅助: smart-cache-request.utils.inferMarketFromSymbol
// 复用部分规则，但未识别 `.US` 后缀且大量使用 includes 判断；默认返回 Market.US

// ⚠️ Smart Cache Orchestrator 内部实现
// 几乎与 smart-cache-request.utils 相同，可直接委托公共工具

// ⚠️ StreamReceiverService.inferMarketFromSymbol
// 额外覆盖 .HKG/.NASDAQ/.NYSE/.SGX，并将 SZ/SH 归类为 "CN"，返回字符串 HK/US/CN/SG/UNKNOWN

// ⚠️ SymbolTransformerService.inferMarketFromSymbols
// 仅取首个 symbol，用预编译正则输出 HK/US/CN/MIXED，用于批量统计
```


## 最终统一迁移方案

基于全库检索结果，采用**基于现有权威实现的渐进式重构策略**：

### 策略选择: 扩展现有SymbolValidationUtils而非重写

**优势**:
- ✅ `SymbolValidationUtils.getMarketFromSymbol` 已具备主要规则，可作为单一事实来源
- ✅ 避免重新实现正则与判定，降低引入新 Bug 的风险
- ✅ 通过服务封装即可覆盖 Smart Cache / Receiver / Stream 等核心路径
- ✅ 缓存策略可按需启用，不强制引入额外复杂度

### 实施阶段重新规划

#### 阶段 1：扩展基础推断规则（~1 天）
- 在 `SymbolValidationUtils` 中补充 `.HKG/.NASDAQ/.NYSE/.SGX` 等后缀规则，并抽象为可配置的优先级数组。
- 新增可选项 `collapseChina` 将 `SZ/SH` 聚合为 `CN`，供 Stream 模块等业务使用。
- 暴露额外的工具方法：`inferMarketLabel`（返回字符串标签）和 `isExtendedMarketSymbol`（判断是否属于扩展市场），用于兼容旧逻辑。

```typescript
export interface MarketDetectOptions {
  collapseChina?: boolean; // true => 返回 Market.CN
  fallback?: Market;       // 默认 Market.US
}

public static getMarketFromSymbol(symbol: string, options: MarketDetectOptions = {}): Market | undefined {
  const normalized = this.normalizeSymbol(symbol);
  if (this.endsWithAny(normalized, ['.HK', '.HKG'])) return Market.HK;
  if (this.endsWithAny(normalized, ['.US', '.NASDAQ', '.NYSE'])) return Market.US;
  if (this.endsWithAny(normalized, ['.SG', '.SGX'])) return (Market as any).SG ?? undefined;
  // ... 扩展中国市场、数字前缀等逻辑
  return options.fallback ?? Market.US;
}

public static inferMarketLabel(symbol: string, options?: MarketDetectOptions): string {
  const market = this.getMarketFromSymbol(symbol, options);
  if (options?.collapseChina && (market === Market.SZ || market === Market.SH)) return 'CN';
  return market ?? 'UNKNOWN';
}
```

#### 阶段 2：封装 MarketInferenceService（~1 天）
- 新建 `src/common/modules/market-inference`，提供 Nest 可注入服务，避免静态字段注入。
- Service 以 `SymbolValidationUtils` 为核心，暴露 `inferMarket`, `inferMarkets`, `inferLabel`, `clearCache` 等接口。
- LRU 缓存改为可选配置（默认关闭），先通过基准测试确认收益。

```typescript
@Injectable()
export class MarketInferenceService {
  constructor(private readonly metrics?: MarketInferenceMetrics) {}

  private cache?: LRUCache<string, Market>;

  configureCache(options?: LruOptions): void {
    this.cache = options ? new LRUCache(options) : undefined;
  }

  inferMarket(symbol: string, options?: MarketDetectOptions): Market {
    if (this.cache?.has(symbol)) return this.cache.get(symbol)!;
    const market = SymbolValidationUtils.getMarketFromSymbol(symbol, options) ?? (options?.fallback ?? Market.US);
    this.cache?.set(symbol, market);
    return market;
  }

  inferMarketLabel(symbol: string, options?: MarketDetectOptions): string {
    return SymbolValidationUtils.inferMarketLabel(symbol, options);
  }
}
```

#### 阶段 3：优先迁移 Smart Cache / Receiver（~1.5 天）
- Smart Cache Util 与 Orchestrator 直接注入 `MarketInferenceService`，删除重复的私有实现。
- ReceiverService 改用依赖注入，移除运行时 `import`，并在批量场景使用 `inferMarketLabel` 兼容字符串返回。
- 针对 Smart Cache 相关测试（unit/integration）新增 service mock，保证缓存策略仍可校验。

#### 阶段 4：适配 Stream Receiver 扩展市场（~1 天）
- 使用 `collapseChina` / `inferMarketLabel` 支持 `CN` 聚合，并保留对 `SG` 等扩展市场的映射。
- 将 `.SG/.SGX` 等符号支持映射到新的 `Market` 枚举（若缺失则扩展枚举或在服务层做标签转换）。
- 核对 WebSocket 推送和提供商选择逻辑，确保新的标签不会破坏下游协议。

#### 阶段 5：收尾与验证（~1 天）
- 更新 SymbolTransformer、DataChangeDetector 等剩余消费者，统一调用 Service 接口。
- 清理遗留工具函数（含 `market.util.ts` 的静态方法），提供迁移期降级策略。
- 覆盖单元/集成测试，并在预发环境做一次性能基线对比，决定是否开启 LRU 缓存。

### 最终架构收益预估


#### 性能收益:
- 🚀 **可观测性提升**: 统一在服务层统计命中率/调用量，可量化不同组件的使用模式
- 🚀 **缓存策略可控**: LRU 缓存改为按需启用，先通过基准测试验证收益再上线
- 🚀 **冗余判断减少**: 共用标准化逻辑，降低多次正则判断带来的重复开销

#### 架构收益:
- ✅ **职责分离**: SmartCache专注编排，推断逻辑专业化
- ✅ **统一标准**: 基于权威SymbolValidationUtils，避免判断不一致
- ✅ **可维护性**: 单一服务覆盖 Smart Cache / Receiver / Stream 等关键路径
- ✅ **可测试性**: 独立Injectable服务，便于单元测试

#### 代码质量收益:
- 📏 **代码复用**: 统一 Smart Cache / Receiver / Stream 等核心路径的推断逻辑
- 🔍 **易监控**: 集中的缓存统计和性能监控
- 🛡️ **一致性**: 统一的推断逻辑，避免边缘case处理差异

### 风险评估与缓解

#### 迁移风险:
1. **模块耦合风险**: 避免将 MarketInferenceService 与基础设施模块双向引用。
2. **依赖关系**: 扩展 Market 枚举或标签时需防止循环依赖与枚举缺失。
3. **测试覆盖**: Smart Cache、Receiver、Stream 三大路径的单元/集成测试需同步更新。
4. **性能回归**: 统一逻辑后可能增加一次判定与 DI 调用，缓存策略若开启需先验证。
5. **协议兼容**: 新增 `CN/SG/UNKNOWN` 标签必须与现有监控、下游协议保持一致。

#### 缓解措施:
1. **独立模块设计**: 创建 `src/common/modules/market-inference` 独立共享组件。
2. **渐进迁移**: 分阶段迁移，确保每个阶段稳定后再继续。
3. **A/B 测试**: 在测试/预发环境对比迁移前后的性能指标。
4. **回滚准备**: 保留现有实现直到新服务完全验证通过。
5. **降级方案**: MarketUtils 提供降级到 SymbolValidationUtils 的机制。

### 成功标准 (量化指标)

#### 功能标准:
- [ ] Smart Cache / Receiver / Stream / Transformer 关键路径全部迁移并通过回归
- [ ] 所有原有测试用例通过
- [ ] 新服务通过完整的单元测试和集成测试

#### 性能标准:
- [ ] 若启用缓存，提供命中率与内存占用监控并达到设定阈值
- [ ] 单次推断延迟与现有实现持平或提升（在基准测试上验证）
- [ ] 批量推断在核心场景（Smart Cache / Stream）无明显回归

#### 架构标准:
- [ ] SmartCache组件职责纯净，无业务逻辑
- [ ] 重复推断逻辑仅保留于共享服务，业务层无自定义 regex
- [ ] 依赖关系清晰，无循环依赖

**该方案聚焦统一核心路径的推断规则，在保障 Smart Cache 架构纯净的同时，兼顾 Stream 等扩展市场的兼容性。**

## 实施进度跟踪

### 阶段 1：扩展基础规则
- [ ] 补全后缀/前缀识别与 `collapseChina` 选项
- [ ] 新增 `inferMarketLabel` 等辅助方法，并补充单元测试

### 阶段 2：封装 MarketInferenceService
- [ ] 定义模块与服务，提供可选缓存配置
- [ ] 输出 metrics 钩子，确保可观测性

### 阶段 3：迁移 Smart Cache / Receiver
- [ ] Smart Cache util 与 orchestrator 完成依赖注入改造
- [ ] ReceiverService 移除动态 `import`，批量场景使用新接口
- [ ] 更新相关单元与集成测试

### 阶段 4：适配 Stream Receiver 与 Transformer
- [ ] 使用 `collapseChina` 支持 `CN`，新增 `SG` 映射策略
- [ ] 校准提供商选择 / 指标事件逻辑
- [ ] SymbolTransformer 批量统计改为调用共享服务

### 阶段 5：收尾与验证
- [ ] 修订 DataChangeDetector 等剩余使用点
- [ ] 清理旧工具 (`market.util.ts` 等) 并保留必要降级
- [ ] 在预发环境完成一次性能/回归确认

**该计划聚焦于统一规则与兼容差异，保障 Smart Cache、Receiver、Stream 等关键链路的稳定迁移。**