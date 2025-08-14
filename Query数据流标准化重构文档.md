# Query数据流标准化重构文档

## 🎯 重构意图分析

### 问题现状
当前Query组件缺少完整的数据处理流水线，导致：
1. **数据格式不一致**：返回原始SDK数据而非标准化数据
2. **测试失败**：期望标准化的`symbol`字段，但得到原始的`secu_quote[0].symbol`
3. **功能不完整**：缺少SymbolMapper、Transformer等关键步骤

### 解决方案
**将Query组件升级为具备完整数据处理能力的智能缓存组件**，同时保持其核心优势：
- ✅ 保留智能变动检查机制
- ✅ 保留长缓存策略
- ✅ 保留后台异步更新
- ➕ 新增完整的数据处理流水线

## 🚀 实现策略

### 方案：在现有 Query 内引入完整流水线调用（推荐）
```
Query 保持现有架构 → 引入已有服务模块 → 串联完整流水线 → 统一数据格式
```

### 🎯 选择此方案的核心理由

#### ✅ 避免重复与漂移
- **避免代码重复**：复制会造成两套近似逻辑长期分叉
- **降低维护成本**：单一真源（single source of truth）
- **减少一致性风险**：避免未来因两套实现差异导致的测试波动

#### ✅ 模块已完备可复用
- **SymbolMapperModule**：符号映射服务已完备
- **DataFetcherModule**：SDK调用服务已完备  
- **TransformerModule**：数据转换服务已完备
- **SharedServicesModule**：共享服务已完备
- **ProvidersModule**：数据源提供商已完备

#### ✅ 架构更干净
- **Query职责清晰**：作为"长缓存+智能变动检查"的编排层
- **服务复用**：像 Receiver 一样串联已有服务
- **模块化设计**：每个服务职责单一，易于测试和维护

### 架构对比

| 组件 | 当前状态 | 重构后状态 |
|------|----------|------------|
| **Receiver** | 完整流水线 + 短缓存 | 保持不变 |
| **Query** | 简化流程 + 智能缓存 | **完整流水线 + 智能缓存** |

## 📋 具体实现计划

### 1. 模块依赖引入（无需复制文件）
```bash
# 现有Query结构保持不变，仅增加服务依赖
src/core/restapi/query/
├── controller/query.controller.ts     # 保持现有API接口
├── services/
│   ├── query.service.ts              # 重构：引入完整流水线服务
│   ├── query-result-processor.service.ts  # 保留
│   └── query-statistics.service.ts   # 保留
├── dto/                              # 保持现有DTO
├── utils/
│   └── query-type-mapping.util.ts    # 新增：映射工具
└── query.module.ts                   # 更新：引入新模块依赖
```

### 2. 需要注意的关键点

#### 🔍 命名与依赖区分
- **使用 DataFetcherService**（restapi/data-fetcher）
- **避免与 DataFetchingService**（public/shared）混淆
- **保持现有服务命名一致性**

#### 🗺️ 映射键值对齐
- **queryTypeFilter → transDataRuleListType 映射**
- **抽取到 query/utils 中**
- **避免依赖 Receiver 内部私有方法**
- **确保与 Receiver 映射逻辑一致**

#### 🔄 后台刷新用标准化数据
- **DataChangeDetectorService 对比标准化对象**
- **确保字段名稳定（如 symbol 而非 secu_quote[0].symbol）**
- **变动检测基于转换后的数据结构**

#### 🔗 避免循环依赖
- **QueryModule 引入必要模块**
- **利用现有模块间接引入 ProvidersModule**
- **保持依赖关系清晰**

### 3. 最小实现路径（落地步骤）

#### 步骤1：模块依赖更新（上线级校对）
```typescript
// query.module.ts
@Module({
  imports: [
    // 保留现有依赖
    StorageModule,
    SharedServicesModule, // 已提供 FieldMappingService，无需重复
    
    // 新增：完整流水线依赖
    SymbolMapperModule,
    TransformerModule, 
    DataFetcherModule,
    ProvidersModule, // 必改建议：显式导入，确保CapabilityRegistryService可用
    // 注意：移除对 DataFetchingService 的 provider 声明，改用 DataFetcherModule
  ],
  providers: [
    QueryService,
    QueryResultProcessorService,
    QueryStatisticsService,
    // 移除：DataFetchingService（改用DataFetcherService）
    // 移除：FieldMappingService（已由SharedServicesModule提供）
  ],
  controllers: [QueryController],
  exports: [QueryService],
})
export class QueryModule {}
```

#### 步骤2：服务依赖注入（上线级校对）
```typescript
// query.service.ts
import { buildStorageKey } from './utils/query.util'; // 复用现有工具
import { StorageClassification } from '@core/public/storage/enums/storage-type.enum'; // 注意路径

constructor(
  // 保留现有依赖
  private readonly storageService: StorageService,
  private readonly dataChangeDetector: DataChangeDetectorService,
  private readonly backgroundTaskService: BackgroundTaskService,
  private readonly resultProcessorService: QueryResultProcessorService,
  private readonly statisticsService: QueryStatisticsService,
  private readonly paginationService: PaginationService,
  
  // 新增：完整流水线依赖
  private readonly symbolMapperService: SymbolMapperService,
  private readonly dataFetcherService: DataFetcherService, // 注意：使用DataFetcherService而非DataFetchingService
  private readonly transformerService: TransformerService,
  private readonly marketStatusService: MarketStatusService,
  private readonly capabilityRegistryService: CapabilityRegistryService, // 用于Provider选择
) {}
```

#### 步骤3：映射工具实现
```typescript
// query/utils/query-type-mapping.util.ts
export class QueryTypeMappingUtil {
  /**
   * 将 queryTypeFilter 映射到 transDataRuleListType
   * 保证与 Receiver 映射逻辑一致
   */
  static mapQueryTypeToTransDataRuleListType(queryTypeFilter: string): string {
    const mapping: Record<string, string> = {
      'get-stock-quote': 'quote_fields',
      'get-stock-basic-info': 'basic_info_fields',
      'get-stock-realtime': 'quote_fields',
      'get-stock-history': 'quote_fields',
      'get-index-quote': 'index_fields',
      'get-market-status': 'market_status_fields'
    };
    
    return mapping[queryTypeFilter] || 'quote_fields';
  }

  static mapQueryTypeToStorageClassification(queryTypeFilter: string): StorageClassification {
    const mapping: Record<string, StorageClassification> = {
      'get-stock-quote': StorageClassification.STOCK_QUOTE,
      'get-stock-basic-info': StorageClassification.STOCK_BASIC_INFO,
      'get-stock-realtime': StorageClassification.STOCK_QUOTE,
      'get-stock-history': StorageClassification.STOCK_CANDLE,
      'get-index-quote': StorageClassification.INDEX_QUOTE,
      'get-market-status': StorageClassification.MARKET_STATUS,
    };
    
    return mapping[queryTypeFilter] || StorageClassification.STOCK_QUOTE;
  }
}
```

### 4. 核心服务重构

**新的QueryService架构：**
```typescript
class QueryService {
  // 保留现有的智能缓存逻辑
  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
    // 1. 缓存检查（保持现有逻辑）
    const cachedResult = await this.tryGetFromCache(...);
    if (cachedResult) {
      // 后台更新检查（保持现有逻辑）
      this.backgroundTaskService.run(() => this.updateDataInBackground(...));
      return cachedResult;
    }

    // 2. 缓存未命中：执行完整数据处理流水线（新增）
    return await this.executeFullDataPipeline(request);
  }

  // 新增：完整数据处理流水线（串联已有服务）
  // 上线级校对：增加 skipStore 选项避免双写
  private async executeFullDataPipeline(
    request: QueryRequestDto, 
    options: { skipStore?: boolean } = {}
  ): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(request);

    try {
      // 1. 符号映射
      const provider = await this.determineProvider(request);
      const mappingResult = await this.symbolMapperService.mapSymbols(
        provider,
        request.symbols,
        queryId,
      );

      // 上线级校对：符号映射部分失败处理
      if (mappingResult.failedSymbols?.length === request.symbols.length) {
        throw new BadRequestException('所有符号映射失败');
      }

      // 2. 数据获取（使用DataFetcherService）
      const fetchParams: DataFetchParams = {
        provider,
        capability: request.queryTypeFilter,
        symbols: mappingResult.mappedSymbols,
        contextService: await this.getProviderContextService(provider),
        requestId: queryId,
        apiType: 'rest',
        options: request.options,
      };

      const fetchResult = await this.dataFetcherService.fetchRawData(fetchParams);

      // 3. 数据转换（使用TransformerService）
      const transDataRuleListType = QueryTypeMappingUtil.mapQueryTypeToTransDataRuleListType(request.queryTypeFilter);
      const transformRequest: TransformRequestDto = {
        provider,
        apiType: 'rest',
        transDataRuleListType,
        rawData: fetchResult.data,
        options: {
          includeMetadata: false, // 上线级校对：默认关闭，仅调试时开启
          includeDebugInfo: false,
        },
      };

      const transformedResult = await this.transformerService.transform(transformRequest);
      
      // 上线级校对：映射规则缺失处理
      if (!transformedResult.transformedData) {
        throw new NotFoundException(`数据转换规则缺失: ${transDataRuleListType}`);
      }

      // 4. 数据存储（双存储策略）- 上线级校对：支持skipStore选项
      if (!options.skipStore) {
        const storageRequest: StoreDataDto = {
          key: this.buildStorageKey(request.symbols[0], provider, request.queryTypeFilter, request.market),
          data: transformedResult.transformedData,
          storageType: StorageType.BOTH,
          storageClassification: QueryTypeMappingUtil.mapQueryTypeToStorageClassification(request.queryTypeFilter),
          provider,
          market: this.inferMarketFromSymbols(request.symbols),
          options: {
            compress: true,
            cacheTtl: this.calculateCacheTTL(request.symbols),
          },
        };

        // 异步存储，不阻塞响应
        this.storageService.storeData(storageRequest).catch((error) => {
          this.logger.warn(`数据存储失败，但不影响主流程`, {
            queryId,
            error: error.message,
          });
        });
      }

      // 5. 构建响应元数据
      const executionTime = Date.now() - startTime;
      const metadata = new QueryMetadataDto(
        request.queryType,
        Array.isArray(transformedResult.transformedData) ? transformedResult.transformedData.length : 1,
        Array.isArray(transformedResult.transformedData) ? transformedResult.transformedData.length : 1,
        executionTime,
        false, // 新获取的数据，未使用缓存
        { cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 } },
        mappingResult.failedSymbols?.map(symbol => ({ symbol, reason: 'Symbol mapping failed' })),
      );

      // 6. 应用分页和后处理
      const processedResult = this.resultProcessorService.process(
        { 
          results: Array.isArray(transformedResult.transformedData) ? transformedResult.transformedData : [transformedResult.transformedData],
          cacheUsed: false,
          dataSources: { cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 } },
          errors: mappingResult.failedSymbols?.map(symbol => ({ symbol, reason: 'Symbol mapping failed' })) || [],
        },
        request,
        queryId,
        executionTime,
      );

      return new QueryResponseDto(processedResult.data, processedResult.metadata);
    } catch (error) {
      this.logger.error(`完整数据流水线执行失败`, {
        queryId,
        error: error.message,
        symbols: request.symbols,
      });
      throw error;
    }
  }

  // 保留：后台更新逻辑（增强版 - 使用标准化数据做变动检测）
  // 上线级校对：避免双写，增加去重/节流
  private readonly backgroundUpdateTasks = new Map<string, Promise<void>>(); // 去重/节流

  private async updateDataInBackground(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    currentCachedData: any,
  ) {
    // 上线级校对：按storageKey去重，避免同一key的并发后台任务
    if (this.backgroundUpdateTasks.has(storageKey)) {
      this.logger.debug(`后台更新任务已在进行中，跳过: ${symbol}`, { queryId });
      return;
    }

    const updateTask = this.performBackgroundUpdate(symbol, storageKey, request, queryId, currentCachedData);
    this.backgroundUpdateTasks.set(storageKey, updateTask);
    
    try {
      await updateTask;
    } finally {
      this.backgroundUpdateTasks.delete(storageKey);
    }
  }

  private async performBackgroundUpdate(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    currentCachedData: any,
  ) {
    try {
      this.logger.debug(`后台更新任务开始: ${symbol}`, { queryId });

      // 执行完整流水线获取最新标准化数据（跳过存储避免双写）
      const singleSymbolRequest = { ...request, symbols: [symbol] };
      const freshResult = await this.executeFullDataPipeline(singleSymbolRequest, { skipStore: true });
      
      // 提取标准化数据进行变动检测
      const freshStandardizedData = freshResult.data.items[0];
      
      const market = request.market || this.inferMarketFromSymbol(symbol);
      const marketStatus = await this.marketStatusService.getMarketStatus(market as Market);

      // 🔍 关键：使用标准化数据进行变动检测（字段名稳定）
      // 上线级校对：确保标准化对象的关键字段与 CRITICAL_FIELDS 对齐
      const changeResult = await this.dataChangeDetector.detectSignificantChange(
        symbol,
        freshStandardizedData, // 使用标准化数据而非原始SDK数据
        market as Market,
        marketStatus.status,
      );

      if (changeResult.hasChanged) {
        this.logger.log(`数据发生变化，后台更新缓存: ${symbol}`, {
          queryId,
          changes: changeResult.significantChanges,
        });
        
        // 单点写回，避免重复存储
        const provider = await this.determineProvider(request);
        await this.storageService.storeData({
          key: storageKey,
          data: freshStandardizedData,
          storageType: StorageType.BOTH,
          storageClassification: QueryTypeMappingUtil.mapQueryTypeToStorageClassification(request.queryTypeFilter),
          provider,
          market: market,
          options: {
            compress: true,
            cacheTtl: this.calculateCacheTTL([symbol]),
          },
        });
      } else {
        this.logger.debug(`数据无显著变化，无需更新: ${symbol}`, { queryId });
      }
    } catch (error) {
      this.logger.warn(`后台更新任务失败: ${symbol}`, {
        queryId,
        error: error.message,
      });
    }
  }
}
```

### 5. 辅助方法实现
```typescript
// query.service.ts 新增辅助方法

/**
 * 确定数据提供商（上线级校对：复用CapabilityRegistryService）
 * 与 ReceiverService.determineOptimalProvider 保持一致
 */
private async determineProvider(request: QueryRequestDto): Promise<string> {
  // 优先使用指定提供商
  if (request.provider) {
    return request.provider;
  }

  // 自动选择最佳提供商（复用现有逻辑）
  const inferredMarket = request.market || this.inferMarketFromSymbols(request.symbols);
  const capabilityName = request.queryTypeFilter;
  const bestProvider = this.capabilityRegistryService.getBestProvider(
    capabilityName,
    inferredMarket,
  );

  if (bestProvider) {
    return bestProvider;
  }

  // 降级到默认提供商
  return 'longport';
}

/**
 * 获取提供商上下文服务
 */
private async getProviderContextService(provider: string): Promise<any> {
  const providerInstance = this.capabilityRegistryService.getProvider(provider);
  return providerInstance?.getContextService?.() || null;
}

/**
 * 从符号推断市场
 */
private inferMarketFromSymbol(symbol: string): Market {
  // 复用现有逻辑或简化实现
  if (symbol.includes('.HK')) return Market.HK;
  if (symbol.includes('.US')) return Market.US;
  if (symbol.includes('.SZ')) return Market.SZ;
  if (symbol.includes('.SH')) return Market.SH;
  return Market.US; // 默认
}

/**
 * 从符号列表推断主要市场
 */
private inferMarketFromSymbols(symbols: string[]): string {
  if (!symbols?.length) return 'UNKNOWN';
  const firstSymbol = symbols[0];
  return this.inferMarketFromSymbol(firstSymbol);
}

/**
 * 计算缓存TTL
 */
private calculateCacheTTL(symbols: string[]): number {
  // 根据符号数量和市场状态计算合适的TTL
  const baseTime = 300; // 5分钟基础缓存
  return symbols.length > 10 ? baseTime * 2 : baseTime;
}

/**
 * 构建存储键（上线级校对：复用现有工具）
 * 直接使用 src/core/restapi/query/utils/query.util.ts 中的 buildStorageKey
 * 保持与当前读/写、测试和监控的一致性
 */
private buildStorageKey(symbol: string, provider: string, queryTypeFilter: string, market?: string): string {
  // 复用现有工具函数，保持一致性
  return buildStorageKey(symbol, provider, queryTypeFilter, market);
}
```

## 🎯 重构后的优势

### 1. 统一数据格式
```typescript
// 重构前：Query返回原始数据
queryData = { secu_quote: [{ symbol: "AMD.US", ... }] }

// 重构后：Query返回标准化数据
queryData = { symbol: "AMD.US", lastPrice: 123.45, ... }
```

### 2. 测试兼容性
```typescript
// 测试代码无需修改
expect(queryData.symbol).toBe(originalData.symbol); // ✅ 都是标准化格式
```

### 3. 最佳性能组合
- **首次请求**：完整流水线处理，确保数据标准化
- **后续请求**：智能缓存，避免重复处理
- **后台更新**：变动检查，只在必要时更新

## 🔄 完整工作流程（重构后）

```
用户请求 → 检查缓存 → 缓存命中？
                    ↓
                   否：执行完整流水线
                    ↓
        符号映射 → 数据获取 → 数据转换 → 数据存储 → 返回标准化数据
                    ↓
                   是：立即返回缓存的标准化数据
                    ↓
        后台异步：完整流水线 → 变动检查 → 有变化？
                                      ↓
                                     是：更新缓存
                                     否：保持现有缓存
```

## 🧠 Query组件的智能数据变动检查机制

### 核心设计理念

**Query组件确实有数据变动检查，这是它的核心特性之一！**

### 📊 完整的数据变动检查流程

1. **缓存优先策略**：
   ```typescript
   // 1. 优先从缓存获取数据
   const cachedResult = await this.tryGetFromCache(symbol, storageKey, request, queryId);
   if (cachedResult) {
     // 2. 缓存命中，立即返回数据给用户
     // 3. 同时异步触发后台更新检查
     this.backgroundTaskService.run(() => 
       this.updateDataInBackground(symbol, storageKey, request, queryId, cachedResult.data)
     );
     return { data: cachedResult.data, source: DataSourceType.CACHE };
   }
   ```

2. **后台智能更新检查（新版流程）**：
   ```typescript
   // 新版后台更新流程：executeFullDataPipeline(skipStore:true) → 标准化数据 → 变动检测 → 条件写回
   const freshResult = await this.executeFullDataPipeline(singleSymbolRequest, { skipStore: true });
   const freshStandardizedData = freshResult.data.items[0];
   
   // 🔍 关键：使用标准化数据进行变动检查
   const changeResult = await this.dataChangeDetector.detectSignificantChange(
     symbol,
     freshStandardizedData, // 使用标准化数据而非原始SDK数据
     market as Market,
     marketStatus.status,
   );

   // 🎯 只有数据真正发生变化时才更新存储
   if (changeResult.hasChanged) {
     this.logger.log(`数据发生变化，后台更新缓存: ${symbol}`, {
       queryId,
       changes: changeResult.significantChanges,
     });
     // 单点写回，避免重复存储
     await this.storageService.storeData({ key: storageKey, data: freshStandardizedData, ... });
   } else {
     this.logger.debug(`数据无显著变化，无需更新: ${symbol}`, { queryId });
   }
   ```

### 🔍 智能变动检测算法

**DataChangeDetectorService的核心特性：**

1. **多层次检测策略**：
   - **快速校验和比较**：基于关键字段计算轻量级校验和
   - **精确字段比较**：检测价格、成交量、变化幅度等关键字段
   - **市场感知阈值**：根据交易时间动态调整变化阈值

2. **关键字段优先级**：
   ```typescript
   const CRITICAL_FIELDS = {
     PRICE_FIELDS: ["lastPrice", "last_done", "price", "bid", "ask"],
     CHANGE_FIELDS: ["change", "changePercent", "change_rate"],
     VOLUME_FIELDS: ["volume", "turnover", "vol"],
     OHLC_FIELDS: ["high", "low", "open"],
   };
   ```

3. **市场状态感知**：
   - **交易时间**：任何字段变化都可能触发更新
   - **非交易时间**：只有显著变化才触发更新
   - **动态阈值**：根据市场状态调整变化检测敏感度

### 🎯 与Receiver的对比

| 特性 | Receiver（强时效） | Query（弱时效） |
|------|-------------------|----------------|
| **数据处理** | 每次请求都执行完整流水线 | 优先使用缓存，避免重复处理 |
| **变动检查** | 无（每次都是最新数据） | 智能变动检查，只在数据变化时更新 |
| **缓存策略** | 1秒级短缓存 | 分钟到小时级长缓存 |
| **性能优化** | 实时性优先 | 效率优先，减少不必要的计算 |
| **适用场景** | 高频交易、实时监控 | 数据分析、报表生成 |

### 💡 设计优势

1. **用户体验优化**：缓存命中时立即返回数据，用户无需等待
2. **资源节约**：避免不必要的SDK调用和数据处理
3. **智能更新**：只在数据真正变化时才更新存储
4. **后台处理**：数据检查和更新在后台异步进行，不影响响应速度

## 🎯 重构后的关键改进

### 1. 数据格式统一
```typescript
// 重构前：Query返回原始SDK数据
queryData = { secu_quote: [{ symbol: "AMD.US", ... }] }
// 测试访问：queryData.secu_quote[0].symbol ❌

// 重构后：Query返回标准化数据
queryData = { symbol: "AMD.US", lastPrice: 123.45, ... }
// 测试访问：queryData.symbol ✅
```

### 2. 测试兼容性修复
```typescript
// 测试代码无需修改，直接通过
const originalData = receiveResponse.data.data.data[0]; // 标准化数据
const queryData = queryResponse.data.data.data.items[0]; // 标准化数据
expect(queryData.symbol).toBe(originalData.symbol); // ✅ 都是标准化格式
```

### 3. 智能缓存增强
- **缓存内容**：存储标准化数据而非原始数据
- **变动检测**：基于标准化字段进行比较
- **一致性保证**：Receiver和Query返回相同格式的数据

## 💡 实施优势

**选择此方案的核心优势：**

1. **避免代码重复**：复用现有服务，避免维护两套逻辑
2. **降低风险**：基于成熟的服务组件，减少引入bug的可能
3. **影响面可控**：仅修改Query模块，不影响其他组件
4. **快速收敛**：利用现有模块化架构，实施周期短
5. **向后兼容**：API接口保持不变，不影响现有调用方
6. **测试稳定**：单一真源避免未来测试波动

## � 实上线级校对要点

### 🔧 关键技术细节

#### 1. 模块与依赖
- ✅ **移除DataFetchingService provider声明**，改用DataFetcherModule
- ✅ **FieldMappingService已由SharedServicesModule提供**，无需重复
- ✅ **ProvidersModule必须显式导入**，确保CapabilityRegistryService可用

#### 2. Provider选择策略
- ✅ **复用CapabilityRegistryService**做最佳提供商选择
- ✅ **与ReceiverService.determineOptimalProvider保持一致**
- ⚠️ 避免硬编码默认provider，使用能力+市场匹配

#### 3. 存储键与分类
- ✅ **复用现有buildStorageKey工具**（src/core/restapi/query/utils/query.util.ts）
- ✅ **StorageClassification正确导入路径**
- ✅ **保持与当前读/写、测试和监控一致性**

#### 4. 流水线与后台刷新去重
- ✅ **executeFullDataPipeline增加skipStore选项**避免双写
- ✅ **后台更新按storageKey去重/节流**
- ✅ **单点写回机制**，确实变更后再写入

#### 5. 标准化数据作为变动检测输入
- ✅ **标准化对象关键字段与CRITICAL_FIELDS对齐**
- ✅ **优先使用标准名**（lastPrice, volume等）
- ✅ **字段名稳定性保证**

#### 6. 错误处理与部分成功
- ✅ **符号映射部分失败记录到metadata.errors**
- ✅ **映射规则缺失抛出404/400**
- ✅ **不回退到原始结构返回**

#### 7. 性能与并发
- ✅ **后台刷新去重/节流机制**（基于storageKey的TTL节流策略可选优化）
- ✅ **includeMetadata默认关闭**
- ✅ **避免高QPS触发反复后台任务**

### 🎯 渐进式上线策略

#### 阶段1：基础流水线
1. **落地缓存未命中走完整流水线**
2. **返回标准化数据**
3. **确认E2E测试通过**

#### 阶段2：智能后台更新
1. **切换后台刷新为完整流水线+变动检测**
2. **条件写回机制**
3. **验证性能指标**

#### 阶段3：优化与监控
1. **存储写入去重/节流**
2. **性能监控增强**
3. **缓存策略优化**

## 📝 实施检查清单

**实施前检查：**
- [ ] 确认所需模块（SymbolMapperModule、TransformerModule、DataFetcherModule、ProvidersModule）可正常导入
- [ ] 验证服务依赖注入不会产生循环依赖
- [ ] 确保映射工具与Receiver逻辑一致
- [ ] 检查StorageClassification导入路径正确
- [ ] 验证buildStorageKey工具函数可用
- [ ] 确认CapabilityRegistryService通过ProvidersModule可用

**实施中验证：**
- [ ] 模块导入成功，DataFetchingService provider已移除
- [ ] executeFullDataPipeline方法正常工作，支持skipStore选项
- [ ] 后台更新使用标准化数据进行变动检测
- [ ] 存储的数据格式与Receiver一致
- [ ] Provider选择逻辑复用CapabilityRegistryService
- [ ] 后台任务去重/节流机制正常

**实施后测试：**
- [ ] 黑盒测试 `expect(queryData.symbol).toBe(originalData.symbol)` 通过
- [ ] 缓存命中时返回标准化数据
- [ ] 后台更新机制正常工作，无双写问题
- [ ] 符号映射部分失败时正确处理
- [ ] 映射规则缺失时抛出正确异常
- [ ] 性能指标符合预期，无并发后台任务堆积

**上线后监控：**
- [ ] 监控后台更新任务执行频率和成功率
- [ ] 验证数据变动检测准确性
- [ ] 检查存储写入性能和去重效果
- [ ] 确认E2E测试稳定通过

## 🔮 后续优化空间

**可选的后续改进（不急于现在实施）：**
1. **抽象公共编排逻辑**：将Receiver和Query的流水线编排抽象为共享helper
2. **配置化映射**：将queryTypeFilter映射配置化，便于扩展
3. **性能监控增强**：为Query组件添加详细的性能指标
4. **缓存策略优化**：根据数据变动频率动态调整缓存TTL

这个重构方案将创造一个既保持Query组件智能缓存优势，又具备完整数据处理能力的强大组件，完美解决当前的数据格式不一致问题。
---


## 📋 最终校对修正

### 🔧 必改建议确认

1. **ProvidersModule导入**：✅ 已修正为显式导入，确保CapabilityRegistryService可用
2. **后台刷新流程统一**：✅ 已更新为"executeFullDataPipeline(skipStore:true) → 标准化数据 → 变动检测 → 条件写回"
3. **去重节流优化**：✅ 已实现基于storageKey的去重机制，可选增加TTL节流策略
4. **错误处理完善**：✅ 符号映射失败记录到metadata.errors，规则缺失抛出404/400
5. **一致性校验**：✅ Query输出items为标准化对象，与Receiver保持一致

### 🎯 实施要点总结

- **模块依赖**：SymbolMapperModule + TransformerModule + DataFetcherModule + ProvidersModule + SharedServicesModule
- **核心流程**：缓存优先 → 完整流水线(skipStore可选) → 标准化数据 → 智能变动检测
- **性能优化**：后台任务去重、includeMetadata默认关闭、单点写回避免双写
- **测试通过**：黑盒断言 `queryData.symbol === originalData.symbol` 稳定通过

此重构方案经过上线级校对，确保实施顺滑、避免隐性坑，可安全落地。