# Query组件技术分析

Query组件是7-component架构中的智能查询组件，与Receiver、Stream Receiver同为第一级入口组件，作为用户应用的数据检索入口，负责高性能批量查询、智能缓存管理、后台数据更新和实时监控。

**Query数据流向**: 发起请求 → **Query** → [智能缓存检查] → [如需更新] → 内部调用Receiver → 用户应用

**7-Component架构组成**:
- **第一级入口组件**: Receiver | Stream Receiver | Query（三个同级入口）
- **Receiver处理链**: Receiver → Symbol Mapper → Data Mapper → Transformer → Storage
- **Stream Receiver流向**: Stream Receiver → Symbol Mapper → Data Mapper → Transformer (不经过Storage)
- **Query智能查询**: Query ⇄ Storage (直接访问) + Query → Receiver (按需调用)

## 📁 核心文件结构

```
src/core/restapi/query/
├── controllers/
│   └── query.controller.ts          # REST API控制器
├── services/
│   ├── query.service.ts             # 核心查询服务 (1633行)
│   ├── query-statistics.service.ts  # 查询统计服务
│   └── query-result-processor.service.ts # 结果处理服务
├── dto/
│   ├── query-request.dto.ts         # 查询请求DTO
│   ├── query-response.dto.ts        # 查询响应DTO
│   ├── query-types.dto.ts           # 查询类型枚举
│   └── query-execution-result.dto.ts # 执行结果DTO
└── enums/
    └── data-source-type.enum.ts     # 数据源类型枚举
```

## 🔧 核心服务实现

### QueryService 类结构分析 (query.service.ts:52-1633)

```typescript
@Injectable()
export class QueryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(QueryService.name);
  
  // 🎯 后台更新任务管理
  private backgroundUpdateTasks = new Map<string, Promise<boolean>>();
  private lastUpdateTimestamps = new Map<string, number>();
  
  // 🎯 性能控制配置
  private readonly MAX_CONCURRENT_UPDATES = 10;
  private readonly MIN_UPDATE_INTERVAL_MS = 60000; // 1分钟
  private readonly MAX_BATCH_SIZE = 50;           // 全局批次大小限制
  private readonly MAX_MARKET_BATCH_SIZE = 25;   // 市场级批次大小限制
  private readonly MARKET_PARALLEL_TIMEOUT = 10000; // 10秒
  private readonly RECEIVER_BATCH_TIMEOUT = 8000;   // 8秒
  private readonly CACHE_BATCH_TIMEOUT = 5000;      // 5秒
  
  // 🎯 任务队列和监控
  private updateQueue: BackgroundUpdateTask[] = [];
  
  constructor(
    private readonly storageService: StorageService,
    private readonly receiverService: ReceiverService,
    private readonly dataChangeDetector: DataChangeDetectorService,
    private readonly marketStatusService: MarketStatusService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly statisticsService: QueryStatisticsService,
    private readonly resultProcessorService: QueryResultProcessorService,
    private readonly backgroundTaskService: BackgroundTaskService,
    private readonly paginationService: PaginationService,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {}
}
```

## 🚀 主要方法实现

### 1. 主查询入口 (executeQuery:161-250)

```typescript
async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
  const startTime = Date.now();
  const queryId = this.generateQueryId(request);

  // 🎯 监控：增加活跃并发请求计数
  this.metricsRegistry.queryConcurrentRequestsActive.inc();

  // 确定市场和符号计数范围以用于标签
  const market = this.inferMarketFromSymbols(request.symbols || []);
  const symbolsCount = request.symbols?.length || 0;
  const symbolsCountRange = this.getSymbolsCountRange(symbolsCount);

  try {
    const executionResult = await this.performQueryExecution(request);
    const processedResult = this.resultProcessorService.process(
      executionResult, request, queryId, Date.now() - startTime
    );

    // 🎯 监控：记录成功的pipeline duration
    const executionTimeSeconds = (Date.now() - startTime) / 1000;
    this.metricsRegistry.queryPipelineDuration.observe({
      query_type: request.queryType,
      market,
      has_cache_hit: executionResult.cacheUsed ? 'true' : 'false',
      symbols_count_range: symbolsCountRange,
    }, executionTimeSeconds);

    // 🎯 监控：记录处理的符号总数
    this.metricsRegistry.querySymbolsProcessedTotal.inc({
      query_type: request.queryType,
      market,
      processing_mode: 'batch',
    }, symbolsCount);

    return new QueryResponseDto(processedResult.data, processedResult.metadata);
  } catch (error) {
    // 错误处理和监控记录
    const executionTime = Date.now() - startTime;
    this.statisticsService.recordQueryPerformance(
      request.queryType, executionTime, false, false
    );
    throw error;
  } finally {
    // 🎯 监控：减少活跃并发请求计数
    this.metricsRegistry.queryConcurrentRequestsActive.dec();
  }
}
```

**关键特性**:
- 完整的监控指标集成
- 自动的性能统计记录
- 统一的错误处理机制
- 并发请求追踪

### 2. 查询执行路由 (performQueryExecution:296-305)

```typescript
private async performQueryExecution(
  request: QueryRequestDto,
): Promise<QueryExecutionResultDto> {
  if (request.queryType === QueryType.BY_SYMBOLS) {
    return this.executeSymbolBasedQuery(request);
  }
  throw new BadRequestException(
    `Unsupported query type: ${request.queryType}`,
  );
}
```

**设计模式**: 策略模式，为不同查询类型提供不同的执行策略

### 3. 符号查询处理 (executeSymbolBasedQuery:307-362)

```typescript
private async executeSymbolBasedQuery(
  request: QueryRequestDto,
): Promise<QueryExecutionResultDto> {
  // 🛡️ 防御性检查：确保symbols存在
  if (!request.symbols || request.symbols.length === 0) {
    this.logger.warn('BY_SYMBOLS查询缺少symbols参数');
    return {
      results: [],
      cacheUsed: false,
      dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } },
      errors: [{ symbol: "", reason: "symbols字段是必需的" }],
    };
  }

  const dataSources: DataSourceStatsDto = {
    cache: { hits: 0, misses: 0 },
    realtime: { hits: 0, misses: 0 },
  };
  const errors: QueryErrorInfoDto[] = [];

  // 过滤掉undefined或null的符号
  const validSymbols = request.symbols.filter(s => s !== undefined && s !== null);

  if (validSymbols.length < request.symbols.length) {
    // 记录无效符号的错误
    request.symbols.forEach((s, idx) => {
      if (s === undefined || s === null) {
        errors.push({
          symbol: `at index ${idx}`,
          reason: "Invalid symbol (undefined or null)",
        });
      }
    });
  }

  // 🚀 使用优化的批量处理管道
  return await this.executeBatchedPipeline(request, validSymbols, dataSources, errors);
}
```

**关键特性**:
- 健壮的输入验证
- 详细的错误记录
- 数据源统计追踪

### 4. 批量处理管道 (executeBatchedPipeline:371-563)

```typescript
private async executeBatchedPipeline(
  request: QueryRequestDto,
  validSymbols: string[],
  dataSources: DataSourceStatsDto,
  errors: QueryErrorInfoDto[],
): Promise<QueryExecutionResultDto> {
  const queryId = this.generateQueryId(request);
  const startTime = Date.now();
  
  try {
    // 🎯 批量处理效率指标
    const totalSymbolsCount = validSymbols.length;
    const batchSizeRange = this.getBatchSizeRange(totalSymbolsCount);
    
    // 🎯 按市场分组实现并行处理
    const symbolsByMarket = this.groupSymbolsByMarket(validSymbols);
    const marketsCount = Object.keys(symbolsByMarket).length;
    
    // 🎯 批量分片效率监控
    Object.entries(symbolsByMarket).forEach(([market, symbols]) => {
      const shardsForMarket = Math.ceil(symbols.length / this.MAX_MARKET_BATCH_SIZE);
      
      // 记录每个市场的分片效率
      this.metricsRegistry.queryBatchShardingEfficiency.set({
        market,
        total_symbols_range: this.getSymbolsCountRange(symbols.length),
      }, symbols.length / Math.max(shardsForMarket, 1));
    });

    // 🎯 市场级并行处理（带超时控制）
    const marketPromises = Object.entries(symbolsByMarket).map(([market, symbols]) =>
      this.processBatchForMarket(market as Market, symbols, request, queryId)
    );
    
    const marketResults = await this.safeAllSettled(
      marketPromises,
      '批量处理管道市场级并行处理',
      this.MARKET_PARALLEL_TIMEOUT
    );

    // 🎯 结果合并和性能计算
    const results: SymbolDataResultDto[] = [];
    let totalCacheHits = 0;
    let totalRealtimeHits = 0;
    
    // ... 结果处理逻辑
    
    // 🎯 批量处理效率计算
    const processingTimeSeconds = (Date.now() - startTime) / 1000;
    const symbolsPerSecond = totalSymbolsCount / Math.max(processingTimeSeconds, 0.001);
    
    // 记录批量效率指标
    this.metricsRegistry.queryBatchEfficiency.set({
      market: this.inferMarketFromSymbols(validSymbols),
      batch_size_range: batchSizeRange,
    }, symbolsPerSecond);

    // 🎯 记录缓存命中率
    const totalRequests = totalCacheHits + totalRealtimeHits;
    if (totalRequests > 0) {
      const cacheHitRatio = (totalCacheHits / totalRequests) * 100;
      this.metricsRegistry.queryCacheHitRatio.set({
        query_type: request.queryType,
        market: this.inferMarketFromSymbols(validSymbols),
      }, cacheHitRatio);
    }

    return { results: paginatedData.items, cacheUsed, dataSources, errors, pagination };

  } catch (error) {
    // 全部符号标记为失败
    validSymbols.forEach(symbol => {
      errors.push({ symbol, reason: `批量处理管道失败: ${error.message}` });
      dataSources.realtime.misses++;
    });
    return { results: [], cacheUsed: false, dataSources, errors };
  }
}
```

**技术特点**:
- 市场级分组并行处理
- 分片策略优化
- 完整的监控指标记录
- 健壮的错误处理

### 5. 市场批处理 (processBatchForMarket:593-713)

```typescript
private async processBatchForMarket(
  market: Market,
  symbols: string[],
  request: QueryRequestDto,
  queryId: string,
): Promise<MarketBatchResult> {
  
  // 🎯 两级分片策略
  const chunks = this.chunkArray(symbols, this.MAX_MARKET_BATCH_SIZE);
  
  // 🎯 分片级并行处理
  const chunkPromises = chunks.map((chunk, chunkIndex) => 
    this.processMarketChunk(market, chunk, request, queryId, chunkIndex)
  );
  
  const chunkResults = await this.safeAllSettled(
    chunkPromises,
    `市场${market}批量处理`,
    this.MARKET_PARALLEL_TIMEOUT
  );
  
  // 结果聚合和错误处理
  let cacheHits = 0, realtimeHits = 0;
  const marketErrors: QueryErrorInfoDto[] = [];
  const results: SymbolDataResultDto[] = [];
  
  chunkResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { data, cacheHits: chunkCacheHits, realtimeHits: chunkRealtimeHits, 
              marketErrors: chunkErrors } = result.value;
      results.push(...data);
      cacheHits += chunkCacheHits;
      realtimeHits += chunkRealtimeHits;
      marketErrors.push(...chunkErrors);
    } else {
      // 处理分片失败
      const failedChunk = chunks[index];
      failedChunk.forEach(symbol => {
        marketErrors.push({ symbol, reason: `市场${market}分片${index}失败: ${result.reason}` });
      });
    }
  });

  return { data: results, cacheHits, realtimeHits, marketErrors };
}
```

### 6. Receiver批处理 (processReceiverBatch:897-1040)

```typescript
private async processReceiverBatch(
  market: Market,
  symbols: string[],
  request: QueryRequestDto,
  queryId: string,
  chunkIndex: number,
  receiverIndex: number,
): Promise<ReceiverBatchResult> {
  
  // 🎯 监控：Receiver调用指标
  const batchSizeRange = this.getBatchSizeRange(symbols.length);
  const symbolsCountRange = this.getSymbolsCountRange(symbols.length);
  
  // 记录Receiver调用计数
  this.metricsRegistry.queryReceiverCallsTotal.inc({
    market,
    batch_size_range: batchSizeRange,
    receiver_type: request.queryTypeFilter || 'unknown',
  });

  // 使用Receiver进行批量数据获取
  const batchRequest = {
    ...this.convertQueryToReceiverRequest(request, symbols),
    options: { ...this.convertQueryToReceiverRequest(request, symbols).options, market },
  };
  
  // 🎯 监控：Receiver调用耗时
  const receiverCallStartTime = Date.now();
  const receiverResponse = await this.receiverService.handleRequest(batchRequest);
  const receiverCallDuration = (Date.now() - receiverCallStartTime) / 1000;
  
  // 记录Receiver调用耗时
  this.metricsRegistry.queryReceiverCallDuration.observe({
    market,
    symbols_count_range: symbolsCountRange,
  }, receiverCallDuration);

  // 处理成功和失败的数据
  const results: SymbolDataResultDto[] = [];
  let cacheHits = 0, realtimeHits = 0;
  const marketErrors: QueryErrorInfoDto[] = [];
  
  // ... 数据处理逻辑
  
  return { data: results, cacheHits, realtimeHits, marketErrors };
}
```

## 🧠 智能后台更新系统

### 后台更新调度 (scheduleBackgroundUpdate:1242-1296)

```typescript
private scheduleBackgroundUpdate(
  symbol: string,
  storageKey: string,
  request: QueryRequestDto,
  queryId: string,
  currentCachedData: any,
): void {
  // 🎯 TTL节流策略检查
  const now = Date.now();
  const lastUpdate = this.lastUpdateTimestamps.get(storageKey);
  if (lastUpdate && (now - lastUpdate) < this.MIN_UPDATE_INTERVAL_MS) {
    this.logger.debug(`后台更新被TTL节流限制，跳过: ${storageKey}`);
    return;
  }

  // 🎯 去重检查 - 防止相同storageKey的重复任务
  if (this.backgroundUpdateTasks.has(storageKey)) {
    this.logger.debug(`后台更新任务已存在，跳过重复调度: ${storageKey}`);
    return;
  }

  // 🎯 并发限制和优先级队列
  if (this.backgroundUpdateTasks.size >= this.MAX_CONCURRENT_UPDATES) {
    const priority = this.calculateUpdatePriority(symbol, request);
    this.updateQueue.push({ symbol, storageKey, request, queryId, currentCachedData, priority });
    // 按优先级排序队列
    this.updateQueue.sort((a, b) => b.priority - a.priority);
    return;
  }

  // 执行更新任务
  this.executeBackgroundUpdate(symbol, storageKey, request, queryId, currentCachedData);
}
```

### 后台更新执行 (executeBackgroundUpdate:1321-1355)

```typescript
private executeBackgroundUpdate(
  symbol: string,
  storageKey: string,
  request: QueryRequestDto,
  queryId: string,
  currentCachedData: any,
): void {
  // 记录更新时间戳
  this.lastUpdateTimestamps.set(storageKey, Date.now());

  // 🎯 监控：增加活跃后台任务计数
  this.metricsRegistry.queryBackgroundTasksActive.inc({
    task_type: 'data_update',
  });

  // 创建可取消的更新任务
  const updateTask = this.updateDataInBackground(symbol, storageKey, request, queryId, currentCachedData)
    .then((hasSignificantChange) => {
      // 🎯 监控：记录成功的后台任务
      this.metricsRegistry.queryBackgroundTasksCompleted.inc({
        task_type: 'data_update',
        has_significant_change: hasSignificantChange ? 'true' : 'false',
      });
    })
    .catch((error) => {
      // 🎯 监控：记录失败的后台任务
      this.metricsRegistry.queryBackgroundTasksFailed.inc({
        task_type: 'data_update',
        error_type: error.name || 'unknown_error',
      });
    })
    .finally(() => {
      // 🎯 监控：减少活跃后台任务计数
      this.metricsRegistry.queryBackgroundTasksActive.dec({ task_type: 'data_update' });
      
      // 任务完成后清理并处理队列
      this.backgroundUpdateTasks.delete(storageKey);
      this.processUpdateQueue();
    });

  this.backgroundUpdateTasks.set(storageKey, updateTask);

  // 使用BackgroundTaskService执行任务（不等待结果）
  this.backgroundTaskService.run(
    () => updateTask,
    `Update data for symbol ${symbol}`,
  );
}
```

### 智能变动检测 (updateDataInBackground:1403-1505)

```typescript
private async updateDataInBackground(
  symbol: string,
  storageKey: string,
  request: QueryRequestDto,
  queryId: string,
  currentCachedData: any,
): Promise<boolean> {
  try {
    const market = request.market || this.inferMarketFromSymbol(symbol);
    const marketStatus = await this.marketStatusService.getMarketStatus(market as Market);

    // 🎯 使用ReceiverService获取实时数据以保持架构一致性
    const baseRequest = this.convertQueryToReceiverRequest(request, [symbol]);
    const receiverRequest = {
      ...baseRequest,
      options: { ...baseRequest.options, storageMode: 'none' as const }, // 避免重复存储
    };
    
    const receiverResponse = await this.receiverService.handleRequest(receiverRequest);

    // 从Receiver响应中提取数据
    if (!receiverResponse.data || (Array.isArray(receiverResponse.data) && receiverResponse.data.length === 0)) {
      this.logger.debug(`后台更新: Receiver未返回数据，跳过变动检测: ${symbol}`);
      return false;
    }

    const freshData = Array.isArray(receiverResponse.data) 
      ? receiverResponse.data[0] 
      : receiverResponse.data;

    // 🎯 优化的变动检测，使用标准化数据
    const changeResult = await this.dataChangeDetector.detectSignificantChange(
      symbol, freshData, market as Market, marketStatus.status
    );

    if (changeResult.hasChanged) {
      this.logger.log(`数据发生显著变化，后台更新缓存: ${symbol}`, {
        queryId,
        changes: changeResult.significantChanges,
        confidence: changeResult.confidence,
      });
      
      // 异步存储标准化数据，使用Query的存储机制
      await this.storeStandardizedData(symbol, freshData, request, queryId, receiverResponse);
      return true;
    } else {
      this.logger.debug(`数据无显著变化，无需更新: ${symbol}`, { 
        queryId,
        confidence: changeResult.confidence 
      });
      return false;
    }
  } catch (error) {
    this.logger.warn(`后台更新任务失败: ${symbol}`, {
      queryId, error: error.message, storageKey,
    });
    
    // 抛出错误以便上层监控指标能够正确记录失败
    throw error;
  }
}
```

## 🎯 工具方法和辅助函数

### 市场推断 (inferMarketFromSymbols:1547-1569)

```typescript
private inferMarketFromSymbols(symbols: string[]): string {
  if (!symbols || symbols.length === 0) return 'unknown';
  
  // 统计各市场的符号数量
  const marketCounts = new Map<string, number>();
  
  symbols.forEach(symbol => {
    const market = this.inferMarketFromSymbol(symbol);
    marketCounts.set(market, (marketCounts.get(market) || 0) + 1);
  });
  
  // 返回符号数量最多的市场
  let maxMarket = 'unknown';
  let maxCount = 0;
  for (const [market, count] of marketCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxMarket = market;
    }
  }
  
  return maxMarket;
}
```

### 符号数量范围标签 (getSymbolsCountRange:1571-1580)

```typescript
private getSymbolsCountRange(count: number): string {
  if (count <= 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 10) return '6-10';
  if (count <= 25) return '11-25';
  if (count <= 50) return '26-50';
  if (count <= 100) return '51-100';
  return '100+';
}
```

### 安全并发处理 (safeAllSettled:522-545)

```typescript
private async safeAllSettled<T>(
  promises: Promise<T>[],
  errorMessage: string,
  timeout: number
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: string }>> {
  
  const wrappedPromises = promises.map(promise =>
    this.withTimeout(promise, timeout, `${errorMessage} - 操作超时`)
      .then(value => ({ status: 'fulfilled' as const, value }))
      .catch(error => ({ status: 'rejected' as const, reason: error.message }))
  );

  return Promise.all(wrappedPromises);
}
```

## 📊 监控指标集成

Query组件集成了完整的Prometheus监控指标系统，包括12个核心指标：

### 性能监控指标
- `queryPipelineDuration`: 查询管道执行耗时
- `queryBatchEfficiency`: 批量处理效率
- `queryMarketProcessingTime`: 市场级处理时间

### 缓存监控指标
- `queryCacheHitRatio`: 缓存命中率
- `queryBatchShardingEfficiency`: 分片效率

### 后台任务监控
- `queryBackgroundTasksActive/Completed/Failed`: 后台任务状态

### 系统监控指标
- `queryConcurrentRequestsActive`: 并发请求数
- `querySymbolsProcessedTotal`: 处理符号总数
- `queryReceiverCallsTotal/Duration`: Receiver调用监控

## 🎯 Query在7-Component架构中的定位

Query组件作为**三个同级入口组件之一**，与Receiver、Stream Receiver并列：

### 三个入口组件的差异化定位：

- **Receiver**: 强时效数据获取入口，每次请求都会经过完整处理链到Storage
- **Stream Receiver**: 实时流数据入口，经过处理但不存储到Storage（直接推送）
- **Query**: 智能查询入口，优先使用缓存，按需调用Receiver更新数据

### Query的技术特点：

- **智能缓存管理**: 优先从Storage读取，按需更新
- **批量处理优化**: 市场级分组+分片策略+并行处理
- **后台智能更新**: 去重+变动检测+性能调优
- **完整监控集成**: 12个Prometheus指标全覆盖
- **健壮错误处理**: 多层次的异常处理和降级策略

Query组件通过这些技术实现，为用户应用提供了高性能、高可靠的智能查询服务，使得用户可以根据不同需求选择合适的数据获取方式：强时效用Receiver，实时流用Stream Receiver，智能查询用Query。