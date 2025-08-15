import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { Market } from "@common/constants/market.constants";
import { PaginationService } from '@common/modules/pagination/services/pagination.service';

import { DataChangeDetectorService } from "../../../public/shared/services/data-change-detector.service";
import { MarketStatusService } from "../../../public/shared/services/market-status.service";
import { FieldMappingService } from "../../../public/shared/services/field-mapping.service";
import { StringUtils } from "../../../public/shared/utils/string.util";
import { ReceiverService } from "../../../restapi/receiver/services/receiver.service";
import { DataRequestDto } from "../../../restapi/receiver/dto/data-request.dto";
import { DataResponseDto } from "../../../restapi/receiver/dto/data-response.dto";
import {
  StorageType,
  StorageClassification,
} from "../../../public/storage/enums/storage-type.enum";
import { StorageService } from "../../../public/storage/services/storage.service";

import {
  QUERY_ERROR_MESSAGES,
  QUERY_WARNING_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import {
  DataSourceStatsDto,
  QueryExecutionResultDto,
  SymbolDataResultDto,
  CacheQueryResultDto,
  RealtimeQueryResultDto,
  QueryErrorInfoDto,
} from "../dto/query-internal.dto";
import { QueryRequestDto, BulkQueryRequestDto } from "../dto/query-request.dto";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
} from "../dto/query-response.dto";
import { QueryType } from "../dto/query-types.dto";
import { DataSourceType } from "../enums/data-source-type.enum";
import { QueryResultProcessorService } from "./query-result-processor.service";
import { QueryStatisticsService } from "./query-statistics.service";
import { buildStorageKey, validateDataFreshness } from "../utils/query.util";
import { BackgroundTaskService } from "../../../public/shared/services/background-task.service";
import { MetricsRegistryService } from "../../../../monitoring/metrics/services/metrics-registry.service";

@Injectable()
export class QueryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(QueryService.name);

  // 🆕 里程碑4.1: 后台更新去重机制
  private readonly backgroundUpdateTasks = new Map<string, Promise<void>>();

  // 🆕 里程碑4.3: 性能调优 - TTL节流策略
  private readonly lastUpdateTimestamps = new Map<string, number>();
  private readonly MIN_UPDATE_INTERVAL_MS = 30000; // 30秒最小更新间隔

  // 🆕 里程碑4.3: 任务队列优化
  private readonly MAX_CONCURRENT_UPDATES = 10; // 最大并发更新任务数
  private readonly updateQueue: Array<{
    symbol: string;
    storageKey: string;
    request: QueryRequestDto;
    queryId: string;
    currentCachedData: any;
    priority: number;
  }> = [];

  // 🆕 里程碑5.2: 批量处理分片策略
  private readonly MAX_BATCH_SIZE = 50; // 单次Receiver请求的最大符号数
  private readonly MAX_MARKET_BATCH_SIZE = 100; // 单个市场处理的最大符号数

  // 🆕 里程碑5.3: 并行处理优化
  private readonly MARKET_PARALLEL_TIMEOUT = 30000; // 市场级并行处理超时 30秒
  private readonly RECEIVER_BATCH_TIMEOUT = 15000; // Receiver批次超时 15秒
  private readonly CACHE_BATCH_TIMEOUT = 10000; // 缓存批次超时 10秒

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


  async onModuleInit(): Promise<void> {
    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED,
      sanitizeLogData({
        operation: QUERY_OPERATIONS.ON_MODULE_INIT,
      }),
    );
  }

  /**
   * 🆕 里程碑4.3: 优雅关闭后台更新任务
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('开始关闭QueryService后台更新任务');
    
    // 清空等待队列
    const queueCount = this.updateQueue.length;
    this.updateQueue.splice(0, this.updateQueue.length);
    
    // 等待所有正在运行的任务完成（最多等待30秒）
    const activeTasksCount = this.backgroundUpdateTasks.size;
    if (activeTasksCount > 0) {
      this.logger.log(`等待${activeTasksCount}个后台更新任务完成`);
      
      const timeout = new Promise(resolve => setTimeout(resolve, 30000));
      const allTasksComplete = Promise.all(Array.from(this.backgroundUpdateTasks.values()));
      
      await Promise.race([allTasksComplete, timeout]);
    }
    
    // 清理Map
    this.backgroundUpdateTasks.clear();
    this.lastUpdateTimestamps.clear();
    
    this.logger.log('QueryService后台更新任务已关闭', {
      cancelledQueueTasks: queueCount,
      completedActiveTasks: activeTasksCount,
    });
  }

  /**
   * 转换Query请求为Receiver请求格式
   * @param queryRequest 查询请求
   * @param symbols 符号列表
   * @returns Receiver请求格式
   */
  private convertQueryToReceiverRequest(
    queryRequest: QueryRequestDto, 
    symbols: string[]
  ): DataRequestDto {
    return {
      symbols,
      receiverType: queryRequest.queryTypeFilter || 'get-stock-quote',
      options: {
        preferredProvider: queryRequest.provider,
        realtime: true,
        fields: queryRequest.options?.includeFields,
        market: queryRequest.market,
        timeout: queryRequest.maxAge ? queryRequest.maxAge * 1000 : undefined,
        storageMode: 'none',  // 关键：禁止Receiver存储，由Query管理缓存
      },
    };
  }

  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(request);

    // 🎯 里程碑6.3: 监控指标跟踪 - 增加活跃并发请求计数
    this.metricsRegistry.queryConcurrentRequestsActive.inc();

    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED,
      sanitizeLogData({
        queryId,
        queryType: request.queryType,
        symbolsCount: request.symbols?.length || 0,
      }),
    );

    // 确定市场和符号计数范围以用于标签
    const market = this.inferMarketFromSymbols(request.symbols || []);
    const symbolsCount = request.symbols?.length || 0;
    const symbolsCountRange = this.getSymbolsCountRange(symbolsCount);

    try {
      const executionResult = await this.performQueryExecution(request);

      const processedResult = this.resultProcessorService.process(
        executionResult,
        request,
        queryId,
        Date.now() - startTime,
      );

      // 🎯 里程碑6.3: 监控指标跟踪 - 记录成功的pipeline duration
      const executionTimeSeconds = (Date.now() - startTime) / 1000;
      this.metricsRegistry.queryPipelineDuration.observe(
        {
          query_type: request.queryType,
          market,
          has_cache_hit: executionResult.cacheUsed ? 'true' : 'false',
          symbols_count_range: symbolsCountRange,
        },
        executionTimeSeconds
      );

      // 🎯 记录处理的符号总数
      this.metricsRegistry.querySymbolsProcessedTotal.inc(
        {
          query_type: request.queryType,
          market,
          processing_mode: 'batch',
        },
        symbolsCount
      );

      return new QueryResponseDto(processedResult.data, processedResult.metadata);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.statisticsService.recordQueryPerformance(
        request.queryType,
        executionTime,
        false,
        false,
      );

      // 🎯 里程碑6.3: 监控指标跟踪 - 记录失败的pipeline duration
      const executionTimeSeconds = executionTime / 1000;
      this.metricsRegistry.queryPipelineDuration.observe(
        {
          query_type: request.queryType,
          market,
          has_cache_hit: 'false',
          symbols_count_range: symbolsCountRange,
        },
        executionTimeSeconds
      );

      this.logger.error(
        QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED,
        sanitizeLogData({
          queryId,
          error: error.message,
          executionTime,
        }),
      );

      throw error;
    } finally {
      // 🎯 里程碑6.3: 监控指标跟踪 - 减少活跃并发请求计数
      this.metricsRegistry.queryConcurrentRequestsActive.dec();
    }
  }

  async executeBulkQuery(
    request: BulkQueryRequestDto,
  ): Promise<BulkQueryResponseDto> {
    const startTime = Date.now();

    this.logger.log(
      QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_STARTED,
      sanitizeLogData({
        queriesCount: request.queries.length,
        parallel: request.parallel,
      }),
    );

    try {
      const results = request.parallel
        ? await this.executeBulkQueriesInParallel(request)
        : await this.executeBulkQueriesSequentially(request);

      const bulkResponse = new BulkQueryResponseDto(
        results,
        request.queries.length,
      );
      this.logger.log(
        QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_COMPLETED,
        sanitizeLogData({
          totalQueries: bulkResponse.summary.totalQueries,
          successful: results.length,
          failed: bulkResponse.summary.totalQueries - results.length,
          totalTime: Date.now() - startTime,
        }),
      );
      return bulkResponse;
    } catch (error) {
      this.logger.error(
        QUERY_ERROR_MESSAGES.BULK_QUERY_EXECUTION_FAILED,
        sanitizeLogData({
          error: error.message,
          totalTime: Date.now() - startTime,
        }),
      );
      throw error;
    }
  }

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

  private async executeSymbolBasedQuery(
    request: QueryRequestDto,
  ): Promise<QueryExecutionResultDto> {
    // 防御性检查：确保symbols存在（DTO验证应该已经处理，但为了类型安全）
    if (!request.symbols || request.symbols.length === 0) {
      this.logger.warn(
        `BY_SYMBOLS查询缺少symbols参数`,
        sanitizeLogData({
          queryType: request.queryType,
          symbols: request.symbols,
        }),
      );
      return {
        results: [],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
        errors: [{ symbol: "", reason: "symbols字段是必需的" }],
      };
    }

    const dataSources: DataSourceStatsDto = {
      cache: { hits: 0, misses: 0 },
      realtime: { hits: 0, misses: 0 },
    };
    const errors: QueryErrorInfoDto[] = [];

    // 过滤掉undefined或null的符号
    const validSymbols = request.symbols.filter(
      (s) => s !== undefined && s !== null,
    );

    if (validSymbols.length < request.symbols.length) {
      this.logger.warn(
        `查询包含无效的symbols`,
        sanitizeLogData({
          validCount: validSymbols.length,
          totalCount: request.symbols.length,
        }),
      );
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

    // 🚀 里程碑5.1: 使用优化的批量处理管道
    return await this.executeBatchedPipeline(request, validSymbols, dataSources, errors);
  }

  /**
   * 🆕 里程碑5.1: 批量处理管道 - 核心执行器
   * @param request 查询请求
   * @param validSymbols 有效符号列表
   * @param dataSources 数据源统计
   * @param errors 错误信息收集
   */
  private async executeBatchedPipeline(
    request: QueryRequestDto,
    validSymbols: string[],
    dataSources: DataSourceStatsDto,
    errors: QueryErrorInfoDto[],
  ): Promise<QueryExecutionResultDto> {
    const queryId = this.generateQueryId(request);
    const startTime = Date.now();
    
    try {
      // 🎯 里程碑6.3: 监控指标跟踪 - 批量处理效率指标
      const totalSymbolsCount = validSymbols.length;
      const batchSizeRange = this.getBatchSizeRange(totalSymbolsCount);
      
      // 🖥 里程碑5.1: 按市场分组符号以实现市场级批量处理
      const symbolsByMarket = this.groupSymbolsByMarket(validSymbols);
      const marketsCount = Object.keys(symbolsByMarket).length;
      
      this.logger.debug('批量处理管道启动', {
        queryId,
        totalSymbols: validSymbols.length,
        marketsCount,
        symbolsByMarket: Object.fromEntries(
          Object.entries(symbolsByMarket).map(([market, symbols]) => [market, symbols.length])
        ),
      });

      // 🎯 里程碑6.3: 监控指标跟踪 - 批量分片效率
      Object.entries(symbolsByMarket).forEach(([market, symbols]) => {
        const shardsForMarket = Math.ceil(symbols.length / this.MAX_MARKET_BATCH_SIZE);
        
        // 记录每个市场的分片效率
        this.metricsRegistry.queryBatchShardingEfficiency.set(
          {
            market,
            total_symbols_range: this.getSymbolsCountRange(symbols.length),
          },
          symbols.length / Math.max(shardsForMarket, 1)
        );
      });

      // 🖥 里程碑5.3: 市场级并行处理（带超时控制）
      const marketPromises = Object.entries(symbolsByMarket).map(([market, symbols]) =>
        this.processBatchForMarket(market as Market, symbols, request, queryId)
      );
      
      const marketResults = await this.safeAllSettled(
        marketPromises,
        `批量处理管道市场级并行处理`,
        this.MARKET_PARALLEL_TIMEOUT
      );

      // 合并所有市场的结果
      const results: SymbolDataResultDto[] = [];
      let totalCacheHits = 0;
      let totalRealtimeHits = 0;
      
      marketResults.forEach((marketResult, index) => {
        const market = Object.keys(symbolsByMarket)[index] as Market;
        
        if (marketResult.status === 'fulfilled') {
          const { data, cacheHits, realtimeHits, marketErrors } = marketResult.value;
          
          // 合并数据
          results.push(...data);
          
          // 更新数据源统计
          dataSources.cache.hits += cacheHits;
          dataSources.realtime.hits += realtimeHits;
          totalCacheHits += cacheHits;
          totalRealtimeHits += realtimeHits;
          
          // 合并错误
          errors.push(...marketErrors);
          
          // 🎯 里程碑6.3: 监控指标跟踪 - 市场处理时间
          const marketProcessingTime = (Date.now() - startTime) / 1000;
          this.metricsRegistry.queryMarketProcessingTime.observe(
            {
              market,
              processing_mode: 'parallel',
            },
            marketProcessingTime
          );
          
          this.logger.debug(`市场${market}批量处理完成`, {
            queryId,
            market,
            dataCount: data.length,
            cacheHits,
            realtimeHits,
            errorsCount: marketErrors.length,
          });
        } else {
          // 处理市场级别的失败
          const marketSymbols = symbolsByMarket[market];
          marketSymbols.forEach(symbol => {
            errors.push({
              symbol,
              reason: `市场${market}批量处理失败: ${marketResult.reason}`,
            });
            dataSources.realtime.misses++;
          });
          
          this.logger.warn(`市场${market}批量处理失败`, {
            queryId,
            market,
            error: marketResult.reason,
            affectedSymbols: marketSymbols.length,
          });
        }
      });

      // 🎯 里程碑6.3: 监控指标跟踪 - 批量处理效率计算
      const processingTimeSeconds = (Date.now() - startTime) / 1000;
      const symbolsPerSecond = totalSymbolsCount / Math.max(processingTimeSeconds, 0.001);
      
      // 记录批量效率指标
      this.metricsRegistry.queryBatchEfficiency.set(
        {
          market: this.inferMarketFromSymbols(validSymbols),
          batch_size_range: batchSizeRange,
        },
        symbolsPerSecond
      );

      // 🎯 记录缓存命中率
      const totalRequests = totalCacheHits + totalRealtimeHits;
      if (totalRequests > 0) {
        const cacheHitRatio = (totalCacheHits / totalRequests) * 100;
        this.metricsRegistry.queryCacheHitRatio.set(
          {
            query_type: request.queryType,
            market: this.inferMarketFromSymbols(validSymbols),
          },
          cacheHitRatio
        );
      }

      // 处理结果数据
      const combinedData = results.map((r) => r.data).flat();
      const cacheUsed = results.some((r) => r.source === DataSourceType.CACHE);

      const paginatedData = this.paginationService.createPaginatedResponseFromQuery(
        combinedData,
        request,
        combinedData.length,
      );

      this.logger.log('批量处理管道完成', {
        queryId,
        totalResults: results.length,
        cacheUsed,
        totalErrors: errors.length,
        dataSources,
        processingTimeMs: Date.now() - startTime,
        symbolsPerSecond: symbolsPerSecond.toFixed(2),
      });

      return {
        results: paginatedData.items,
        cacheUsed,
        dataSources,
        errors,
        pagination: paginatedData.pagination,
      };

    } catch (error) {
      this.logger.error('批量处理管道执行失败', {
        queryId,
        error: error.message,
        symbolsCount: validSymbols.length,
      });

      // 全部符号标记为失败
      validSymbols.forEach(symbol => {
        errors.push({
          symbol,
          reason: `批量处理管道失败: ${error.message}`,
        });
        dataSources.realtime.misses++;
      });

      return {
        results: [],
        cacheUsed: false,
        dataSources,
        errors,
      };
    }
  }

  /**
   * 🆕 里程碑5.3: 超时控制工具
   * @param promise 需要超时控制的Promise
   * @param timeout 超时时间（毫秒）
   * @param errorMessage 超时错误消息
   */
  private withTimeout<T>(promise: Promise<T>, timeout: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeout);
      })
    ]);
  }

  /**
   * 🆕 里程碑5.3: 安全的Promise.allSettled包装，提供更好的错误上下文
   * @param promises Promise数组
   * @param context 上下文信息
   * @param timeout 超时时间
   */
  private async safeAllSettled<T>(
    promises: Promise<T>[],
    context: string,
    timeout?: number
  ): Promise<PromiseSettledResult<T>[]> {
    const wrappedPromises = timeout 
      ? promises.map((p, index) => this.withTimeout(p, timeout, `${context} 第${index + 1}项超时`))
      : promises;

    try {
      return await Promise.allSettled(wrappedPromises);
    } catch (error) {
      this.logger.error(`${context} 批量处理异常`, {
        error: error.message,
        promisesCount: promises.length,
      });
      
      // 创建所有失败的结果
      return promises.map(() => ({
        status: 'rejected' as const,
        reason: error.message,
      }));
    }
  }

  /**
   * 🆕 里程碑5.1: 按市场分组符号
   * @param symbols 符号列表
   * @returns 按市场分组的符号映射
   */
  private groupSymbolsByMarket(symbols: string[]): Record<Market, string[]> {
    const symbolsByMarket: Record<Market, string[]> = {} as Record<Market, string[]>;

    symbols.forEach(symbol => {
      const market = this.inferMarketFromSymbol(symbol);
      
      if (!symbolsByMarket[market]) {
        symbolsByMarket[market] = [];
      }
      
      symbolsByMarket[market].push(symbol);
    });

    return symbolsByMarket;
  }

  /**
   * 🆕 里程碑5.2: 数组分片工具
   * @param array 待分片的数组
   * @param chunkSize 分片大小
   * @returns 分片后的数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      throw new Error('分片大小必须大于0');
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 🆕 里程碑5.1-5.2: 处理单个市场的批量数据（支持分片策略）
   * @param market 市场
   * @param symbols 该市场的符号列表
   * @param request 查询请求
   * @param queryId 查询ID
   */
  private async processBatchForMarket(
    market: Market,
    symbols: string[],
    request: QueryRequestDto,
    queryId: string,
  ): Promise<{
    data: SymbolDataResultDto[];
    cacheHits: number;
    realtimeHits: number;
    marketErrors: QueryErrorInfoDto[];
  }> {
    const startTime = Date.now();
    let cacheHits = 0;
    let realtimeHits = 0;
    const marketErrors: QueryErrorInfoDto[] = [];
    const results: SymbolDataResultDto[] = [];

    this.logger.debug(`开始处理市场${market}的批量数据`, {
      queryId,
      market,
      symbolsCount: symbols.length,
      willUseSharding: symbols.length > this.MAX_MARKET_BATCH_SIZE,
    });

    try {
      // 🆕 里程碑5.2: 两级分片策略
      // 第一级：如果市场符号超过限制，按市场级分片
      if (symbols.length > this.MAX_MARKET_BATCH_SIZE) {
        const marketChunks = this.chunkArray(symbols, this.MAX_MARKET_BATCH_SIZE);
        
        this.logger.debug(`市场${market}采用市场级分片`, {
          queryId,
          market,
          totalSymbols: symbols.length,
          chunksCount: marketChunks.length,
          chunkSize: this.MAX_MARKET_BATCH_SIZE,
        });

        // 🆕 里程碑5.3: 并行处理市场分片（带超时控制）
        const chunkPromises = marketChunks.map(async (chunkSymbols, chunkIndex) => {
          return await this.processMarketChunk(market, chunkSymbols, request, queryId, chunkIndex);
        });
        
        const chunkResults = await this.safeAllSettled(
          chunkPromises,
          `市场${market}分片并行处理`,
          this.MARKET_PARALLEL_TIMEOUT / 2 // 分片级别用一半时间
        );

        // 合并分片结果
        chunkResults.forEach((chunkResult, chunkIndex) => {
          if (chunkResult.status === 'fulfilled') {
            const chunkData = chunkResult.value;
            results.push(...chunkData.data);
            cacheHits += chunkData.cacheHits;
            realtimeHits += chunkData.realtimeHits;
            marketErrors.push(...chunkData.marketErrors);
          } else {
            // 处理分片失败
            const chunkSymbols = marketChunks[chunkIndex];
            chunkSymbols.forEach(symbol => {
              marketErrors.push({
                symbol,
                reason: `市场${market}分片${chunkIndex}处理失败: ${chunkResult.reason}`,
              });
            });
          }
        });

      } else {
        // 单一市场批处理（不需要市场级分片）
        const marketResult = await this.processMarketChunk(market, symbols, request, queryId, 0);
        results.push(...marketResult.data);
        cacheHits += marketResult.cacheHits;
        realtimeHits += marketResult.realtimeHits;
        marketErrors.push(...marketResult.marketErrors);
      }

      const processingTime = Date.now() - startTime;
      
      this.logger.debug(`市场${market}批量处理完成`, {
        queryId,
        market,
        processingTime,
        resultsCount: results.length,
        cacheHits,
        realtimeHits,
        errorsCount: marketErrors.length,
      });

      return {
        data: results,
        cacheHits,
        realtimeHits,
        marketErrors,
      };

    } catch (error) {
      this.logger.error(`市场${market}批量处理失败`, {
        queryId,
        market,
        error: error.message,
        symbolsCount: symbols.length,
      });

      // 将所有该市场的符号标记为失败
      symbols.forEach(symbol => {
        marketErrors.push({
          symbol,
          reason: `市场${market}批量处理异常: ${error.message}`,
        });
      });

      return {
        data: [],
        cacheHits,
        realtimeHits,
        marketErrors,
      };
    }
  }

  /**
   * 🆕 里程碑5.2: 处理市场分片
   * @param market 市场
   * @param symbols 分片中的符号列表
   * @param request 查询请求
   * @param queryId 查询ID
   * @param chunkIndex 分片索引
   */
  private async processMarketChunk(
    market: Market,
    symbols: string[],
    request: QueryRequestDto,
    queryId: string,
    chunkIndex: number,
  ): Promise<{
    data: SymbolDataResultDto[];
    cacheHits: number;
    realtimeHits: number;
    marketErrors: QueryErrorInfoDto[];
  }> {
    let cacheHits = 0;
    let realtimeHits = 0;
    const marketErrors: QueryErrorInfoDto[] = [];
    const results: SymbolDataResultDto[] = [];

    this.logger.debug(`处理市场${market}分片${chunkIndex}`, {
      queryId,
      market,
      chunkIndex,
      symbolsCount: symbols.length,
    });

    try {
      // 🆕 里程碑5.2: 第二级分片 - 按Receiver批量大小分片
      const receiverChunks = this.chunkArray(symbols, this.MAX_BATCH_SIZE);
      
      if (receiverChunks.length > 1) {
        this.logger.debug(`市场${market}分片${chunkIndex}采用Receiver级分片`, {
          queryId,
          market,
          chunkIndex,
          receiverChunksCount: receiverChunks.length,
          batchSize: this.MAX_BATCH_SIZE,
        });
      }

      // 🆕 里程碑5.3: 并行处理Receiver级分片（带超时和错误恢复）
      const receiverPromises = receiverChunks.map(async (receiverSymbols, receiverIndex) => {
        return await this.processReceiverBatch(market, receiverSymbols, request, queryId, chunkIndex, receiverIndex);
      });
      
      const receiverResults = await this.safeAllSettled(
        receiverPromises,
        `市场${market}分片${chunkIndex}Receiver级并行处理`,
        this.RECEIVER_BATCH_TIMEOUT
      );

      // 合并Receiver分片结果
      receiverResults.forEach((receiverResult, receiverIndex) => {
        if (receiverResult.status === 'fulfilled') {
          const receiverData = receiverResult.value;
          results.push(...receiverData.data);
          cacheHits += receiverData.cacheHits;
          realtimeHits += receiverData.realtimeHits;
          marketErrors.push(...receiverData.marketErrors);
        } else {
          // 处理Receiver分片失败
          const receiverSymbols = receiverChunks[receiverIndex];
          receiverSymbols.forEach(symbol => {
            marketErrors.push({
              symbol,
              reason: `市场${market}分片${chunkIndex}Receiver批${receiverIndex}失败: ${receiverResult.reason}`,
            });
          });
        }
      });

      return {
        data: results,
        cacheHits,
        realtimeHits,
        marketErrors,
      };

    } catch (error) {
      this.logger.error(`市场${market}分片${chunkIndex}处理失败`, {
        queryId,
        market,
        chunkIndex,
        error: error.message,
        symbolsCount: symbols.length,
      });

      symbols.forEach(symbol => {
        marketErrors.push({
          symbol,
          reason: `市场${market}分片${chunkIndex}异常: ${error.message}`,
        });
      });

      return {
        data: [],
        cacheHits,
        realtimeHits,
        marketErrors,
      };
    }
  }

  /**
   * 🆕 里程碑5.2: 处理Receiver批量请求
   * @param market 市场
   * @param symbols Receiver批次中的符号列表
   * @param request 查询请求
   * @param queryId 查询ID
   * @param chunkIndex 市场分片索引
   * @param receiverIndex Receiver分片索引
   */
  private async processReceiverBatch(
    market: Market,
    symbols: string[],
    request: QueryRequestDto,
    queryId: string,
    chunkIndex: number,
    receiverIndex: number,
  ): Promise<{
    data: SymbolDataResultDto[];
    cacheHits: number;
    realtimeHits: number;
    marketErrors: QueryErrorInfoDto[];
  }> {
    let cacheHits = 0;
    let realtimeHits = 0;
    const marketErrors: QueryErrorInfoDto[] = [];
    const results: SymbolDataResultDto[] = [];

    try {
      // 🎯 里程碑6.3: 监控指标跟踪 - Receiver调用指标
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
        options: {
          ...this.convertQueryToReceiverRequest(request, symbols).options,
          market, // 指定市场
        },
      };
      
      // 🎯 里程碑6.3: 监控指标跟踪 - Receiver调用耗时
      const receiverCallStartTime = Date.now();
      const receiverResponse = await this.receiverService.handleRequest(batchRequest);
      const receiverCallDuration = (Date.now() - receiverCallStartTime) / 1000;
      
      // 记录Receiver调用耗时
      this.metricsRegistry.queryReceiverCallDuration.observe(
        {
          market,
          symbols_count_range: symbolsCountRange,
        },
        receiverCallDuration
      );

      // 处理成功的数据
      if (receiverResponse.data && Array.isArray(receiverResponse.data)) {
        receiverResponse.data.forEach((item, index) => {
          results.push({
            data: item,
            source: DataSourceType.REALTIME,
          });
          realtimeHits++;

          // 异步存储标准化数据（不阻塞主流程）
          const symbol = symbols[index];
          if (symbol) {
            this.storeStandardizedData(symbol, item, request, queryId, receiverResponse)
              .catch(error => {
                this.logger.warn(`市场${market}分片${chunkIndex}数据存储失败: ${symbol}`, {
                  queryId,
                  chunkIndex,
                  receiverIndex,
                  error: error.message,
                });
              });
          }
        });
      }

      // 处理失败的符号
      if (receiverResponse.failures && receiverResponse.failures.length > 0) {
        receiverResponse.failures.forEach(failure => {
          marketErrors.push({
            symbol: failure.symbol,
            reason: failure.reason ?? `市场${market}分片${chunkIndex}数据获取失败`,
          });
        });
      }

      // 如果没有实时数据，尝试从缓存回退
      const missingSymbols = symbols.filter((_, index) => 
        !receiverResponse.data || !receiverResponse.data[index]
      );

      if (missingSymbols.length > 0) {
        // 🖥 里程碑5.3: 并行缓存查询（带超时控制）
        const cachePromises = missingSymbols.map(async (symbol) => {
          const storageKey = buildStorageKey(
            symbol,
            request.provider || 'auto',
            request.queryTypeFilter,
            market
          );
          
          const cached = await this.tryGetFromCache(symbol, storageKey, request, queryId);
          if (cached) {
            cacheHits++;
            return {
              data: cached.data,
              source: DataSourceType.CACHE,
            };
          }
          return null;
        });
        
        const cacheResults = await this.safeAllSettled(
          cachePromises,
          `市场${market}分片${chunkIndex}Receiver批缓存查询`,
          this.CACHE_BATCH_TIMEOUT
        );

        cacheResults.forEach((result, index) => {
          const symbol = missingSymbols[index];
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else {
            marketErrors.push({
              symbol,
              reason: result.status === 'rejected' 
                ? `缓存查询失败: ${result.reason}` 
                : `市场${market}分片${chunkIndex}数据不可用`,
            });
          }
        });
      }

      return {
        data: results,
        cacheHits,
        realtimeHits,
        marketErrors,
      };

    } catch (error) {
      this.logger.error(`市场${market}分片${chunkIndex}Receiver批${receiverIndex}失败`, {
        queryId,
        market,
        chunkIndex,
        receiverIndex,
        error: error.message,
        symbolsCount: symbols.length,
      });

      symbols.forEach(symbol => {
        marketErrors.push({
          symbol,
          reason: `市场${market}分片${chunkIndex}Receiver批${receiverIndex}异常: ${error.message}`,
        });
      });

      return {
        data: [],
        cacheHits,
        realtimeHits,
        marketErrors,
      };
    }
  }

  private async fetchSymbolData(
    symbol: string,
    request: QueryRequestDto,
    queryId: string,
  ): Promise<SymbolDataResultDto> {
    const storageKey = buildStorageKey(
      symbol,
      request.provider,
      request.queryTypeFilter,
      request.market,
    );

    // 1. 优先尝试从缓存获取
    if (request.options?.useCache) {
      const cachedResult = await this.tryGetFromCache(
        symbol,
        storageKey,
        request,
        queryId,
      );
      if (cachedResult) {
        // 缓存命中，立即返回并异步触发去重的后台更新
        this.scheduleBackgroundUpdate(symbol, storageKey, request, queryId, cachedResult.data);
        return { data: cachedResult.data, source: DataSourceType.CACHE };
      }
    }

    // 2. 缓存未命中或不使用缓存，则从实时源获取
    const realtimeResult = await this.fetchFromRealtime(
      symbol,
      storageKey,
      request,
      queryId,
    );

    // 3. 将新获取的数据异步存入缓存
    if (request.options?.useCache) {
      this.backgroundTaskService.run(
        () =>
          this.storeRealtimeData(
            storageKey,
            realtimeResult,
            request.queryTypeFilter,
          ),
        `Store data for symbol ${symbol}`,
      );
    }

    return { data: realtimeResult.data, source: DataSourceType.REALTIME };
  }

  private async tryGetFromCache(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
  ): Promise<CacheQueryResultDto | null> {
    try {
      const storageResponse = await this.storageService.retrieveData({
        key: storageKey,
        preferredType: StorageType.CACHE,
      });

      if (
        !storageResponse.data ||
        !validateDataFreshness(storageResponse.data, request.maxAge)
      ) {
        if (storageResponse.data) {
          this.logger.warn(
            QUERY_WARNING_MESSAGES.CACHE_DATA_EXPIRED,
            sanitizeLogData({ queryId, key: storageKey }),
          );
        }
        return null;
      }

      this.logger.log(
        QUERY_SUCCESS_MESSAGES.CACHE_DATA_RETRIEVED,
        sanitizeLogData({ queryId, key: storageKey }),
      );
      return {
        data: storageResponse.data,
        metadata: {
          source: DataSourceType.CACHE,
          timestamp: new Date(storageResponse.metadata.storedAt),
          storageKey,
        },
      };
    } catch (error) {
      this.logger.debug(
        "缓存未命中，将获取实时数据",
        sanitizeLogData({ queryId, key: storageKey, error: error.message }),
      );
      return null;
    }
  }

  private async fetchFromRealtime(
    symbol: string,
    storageKey: string, // 传入 storageKey 以便复用
    request: QueryRequestDto,
    queryId: string,
  ): Promise<RealtimeQueryResultDto> {
    try {
      // 使用 Receiver 架构获取标准化数据
      const receiverRequest = this.convertQueryToReceiverRequest(request, [symbol]);
      const receiverResponse = await this.receiverService.handleRequest(receiverRequest);

      // 从Receiver响应中提取单符号数据（receiverResponse.data是数组）
      if (!receiverResponse.data || (Array.isArray(receiverResponse.data) && receiverResponse.data.length === 0)) {
        // 尝试从持久化存储中获取作为回退
        const fallbackData = await this.tryGetFromCache(
          symbol,
          storageKey + ":persistent",
          { ...request, maxAge: undefined }, // 从持久化存储获取时不关心maxAge
          queryId,
        );

        if (fallbackData) {
          this.logger.warn(
            `实时数据获取失败，使用持久化存储作为回退: ${symbol}`,
            { queryId },
          );
          return {
            data: fallbackData.data,
            metadata: {
              source: DataSourceType.REALTIME, // 源头仍然是期望实时
              timestamp: new Date(fallbackData.metadata.timestamp),
              storageKey,
              provider: request.provider,
              market: this.inferMarketFromSymbol(symbol) as Market,
            },
          };
        }
        throw new NotFoundException(
          `Real-time data not found for symbol: ${symbol}`,
        );
      }

      // 正确的数据路径：单符号取data[0]
      const symbolData = Array.isArray(receiverResponse.data) 
        ? receiverResponse.data[0] 
        : receiverResponse.data;
      const market = request.market || this.inferMarketFromSymbol(symbol);

      return {
        data: symbolData,
        metadata: {
          source: DataSourceType.REALTIME,
          timestamp: new Date(),
          storageKey,
          provider: receiverResponse.metadata?.provider || request.provider,
          market: market as Market,
          cacheTTL: await this.calculateCacheTTLByMarket(market, [symbol]),
        },
      };
    } catch (error) {
      this.logger.error(
        "实时数据获取失败",
        sanitizeLogData({
          symbol,
          queryId,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 🆕 里程碑4.1-4.3: 调度带去重、节流和队列优化的后台更新任务
   * @param symbol 股票符号
   * @param storageKey 存储键
   * @param request 查询请求
   * @param queryId 查询ID
   * @param currentCachedData 当前缓存数据
   */
  private scheduleBackgroundUpdate(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    currentCachedData: any,
  ): void {
    // 🆕 里程碑4.3: TTL节流策略检查
    const now = Date.now();
    const lastUpdate = this.lastUpdateTimestamps.get(storageKey);
    if (lastUpdate && (now - lastUpdate) < this.MIN_UPDATE_INTERVAL_MS) {
      this.logger.debug(`后台更新被TTL节流限制，跳过: ${storageKey}`, { 
        queryId,
        lastUpdate: new Date(lastUpdate).toISOString(),
        timeSinceLastUpdate: now - lastUpdate,
        minInterval: this.MIN_UPDATE_INTERVAL_MS
      });
      return;
    }

    // 检查是否已经有相同storageKey的更新任务在运行
    if (this.backgroundUpdateTasks.has(storageKey)) {
      this.logger.debug(`后台更新任务已存在，跳过重复调度: ${storageKey}`, { queryId });
      return;
    }

    // 🆕 里程碑4.3: 任务队列优化 - 检查并发限制
    if (this.backgroundUpdateTasks.size >= this.MAX_CONCURRENT_UPDATES) {
      // 计算优先级（市场交易状态影响优先级）
      const priority = this.calculateUpdatePriority(symbol, request);
      
      this.updateQueue.push({
        symbol,
        storageKey,
        request,
        queryId,
        currentCachedData,
        priority,
      });

      // 按优先级排序队列
      this.updateQueue.sort((a, b) => b.priority - a.priority);
      
      this.logger.debug(`后台更新任务已加入队列: ${storageKey}`, { 
        queryId,
        queueLength: this.updateQueue.length,
        priority,
        activeTasksCount: this.backgroundUpdateTasks.size
      });
      return;
    }

    // 执行更新任务
    this.executeBackgroundUpdate(symbol, storageKey, request, queryId, currentCachedData);
  }

  /**
   * 🆕 里程碑4.3: 计算更新优先级
   */
  private calculateUpdatePriority(symbol: string, request: QueryRequestDto): number {
    const market = request.market || this.inferMarketFromSymbol(symbol);
    
    // 基础优先级
    let priority = 1;
    
    // 市场权重：美股 > 港股 > A股
    if (market === Market.US) priority += 3;
    else if (market === Market.HK) priority += 2;
    else priority += 1;
    
    // 添加时间戳随机化避免饥饿
    priority += Math.random() * 0.1;
    
    return priority;
  }

  /**
   * 🆕 里程碑4.3: 执行后台更新任务
   */
  private executeBackgroundUpdate(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    currentCachedData: any,
  ): void {
    // 记录更新时间戳
    this.lastUpdateTimestamps.set(storageKey, Date.now());

    // 🎯 里程碑6.3: 监控指标跟踪 - 增加活跃后台任务计数
    this.metricsRegistry.queryBackgroundTasksActive.inc({
      task_type: 'data_update',
    });

    // 创建可取消的更新任务
    const updateTask = this.updateDataInBackground(symbol, storageKey, request, queryId, currentCachedData)
      .then((hasSignificantChange) => {
        // 🎯 里程碑6.3: 监控指标跟踪 - 记录成功的后台任务
        this.metricsRegistry.queryBackgroundTasksCompleted.inc({
          task_type: 'data_update',
          has_significant_change: hasSignificantChange ? 'true' : 'false',
        });
      })
      .catch((error) => {
        // 🎯 里程碑6.3: 监控指标跟踪 - 记录失败的后台任务
        this.metricsRegistry.queryBackgroundTasksFailed.inc({
          task_type: 'data_update',
          error_type: error.name || 'unknown_error',
        });
      })
      .finally(() => {
        // 🎯 里程碑6.3: 监控指标跟踪 - 减少活跃后台任务计数
        this.metricsRegistry.queryBackgroundTasksActive.dec({
          task_type: 'data_update',
        });
        
        // 任务完成后清理并处理队列
        this.backgroundUpdateTasks.delete(storageKey);
        this.logger.debug(`后台更新任务完成并清理: ${storageKey}`, { queryId });
        
        // 🖥 里程碑4.3: 处理等待队列
        this.processUpdateQueue();
      });

    this.backgroundUpdateTasks.set(storageKey, updateTask);

    // 使用BackgroundTaskService执行任务（不等待结果）
    this.backgroundTaskService.run(
      () => updateTask,
      `Update data for symbol ${symbol}`,
    );

    this.logger.debug(`后台更新任务已执行: ${storageKey}`, { 
      queryId, 
      activeTasksCount: this.backgroundUpdateTasks.size,
      queueLength: this.updateQueue.length
    });
  }

  /**
   * 🆕 里程碑4.3: 处理更新队列
   */
  private processUpdateQueue(): void {
    while (this.updateQueue.length > 0 && this.backgroundUpdateTasks.size < this.MAX_CONCURRENT_UPDATES) {
      const queuedUpdate = this.updateQueue.shift()!;
      
      this.logger.debug(`从队列中处理更新任务: ${queuedUpdate.storageKey}`, {
        priority: queuedUpdate.priority,
        remainingInQueue: this.updateQueue.length
      });
      
      this.executeBackgroundUpdate(
        queuedUpdate.symbol,
        queuedUpdate.storageKey,
        queuedUpdate.request,
        queuedUpdate.queryId,
        queuedUpdate.currentCachedData,
      );
    }
  }

  private async updateDataInBackground(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentCachedData: any,
  ): Promise<boolean> {
    try {
      this.logger.debug(`后台更新任务开始: ${symbol}`, { queryId });

      const market = request.market || this.inferMarketFromSymbol(symbol);
      const marketStatus = await this.marketStatusService.getMarketStatus(
        market as Market,
      );

      // 🖥 里程碑4.2: 使用ReceiverService获取实时数据以保持架构一致性
      // 🎯 里程碑6.3: 监控指标跟踪 - 添加storageMode:'none'以避免重复存储
      const baseRequest = this.convertQueryToReceiverRequest(request, [symbol]);
      const receiverRequest = {
        ...baseRequest,
        options: {
          ...baseRequest.options,
          storageMode: 'none' as const, // 后台更新不重复存储
        },
      };
      
      const receiverResponse = await this.receiverService.handleRequest(receiverRequest);

      // 从Receiver响应中提取数据
      if (!receiverResponse.data || (Array.isArray(receiverResponse.data) && receiverResponse.data.length === 0)) {
        this.logger.debug(`后台更新: Receiver未返回数据，跳过变动检测: ${symbol}`, { queryId });
        return false;
      }

      const freshData = Array.isArray(receiverResponse.data) 
        ? receiverResponse.data[0] 
        : receiverResponse.data;

      // 🖥 里程碑4.2: 优化的变动检测，使用标准化数据
      const changeResult =
        await this.dataChangeDetector.detectSignificantChange(
          symbol,
          freshData,
          market as Market,
          marketStatus.status,
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
        queryId,
        error: error.message,
        storageKey,
      });
      
      // 抛出错误以便上层监控指标能够正确记录失败
      throw error;
    }
  }

  /**
   * 存储标准化数据到缓存
   * @param symbol 符号
   * @param standardizedData 标准化数据
   * @param request 查询请求
   * @param queryId 查询ID
   * @param receiverResponse Receiver响应
   */
  private async storeStandardizedData(
    symbol: string,
    standardizedData: any,
    request: QueryRequestDto,
    queryId: string,
    receiverResponse: DataResponseDto,
  ): Promise<void> {
    try {
      const storageKey = buildStorageKey(
        symbol, 
        request.provider || 'auto', 
        request.queryTypeFilter, 
        request.market
      );
      
      // Query自行计算TTL，不依赖Receiver元信息
      const market = request.market || this.inferMarketFromSymbol(symbol);
      const cacheTTL = await this.calculateCacheTTLByMarket(market, [symbol]);
      
      await this.storageService.storeData({
        key: storageKey,
        data: standardizedData,
        storageType: StorageType.BOTH,
        storageClassification: (this.fieldMappingService.filterToClassification(request.queryTypeFilter) ?? StorageClassification.GENERAL) as StorageClassification,
        // 优先使用Receiver实际选择的provider，回退到请求中的provider
        provider: receiverResponse.metadata?.provider || request.provider || 'auto',
        market,
        options: {
          compress: true,
          cacheTtl: cacheTTL,
        },
      });

      this.logger.debug(`标准化数据已存储: ${symbol}`, { queryId, storageKey });
    } catch (error) {
      this.logger.warn(`标准化数据存储失败: ${symbol}`, {
        queryId,
        error: error.message,
      });
    }
  }

  /**
   * 根据市场状态计算缓存TTL
   * @param market 市场
   * @param symbols 符号列表
   * @returns TTL秒数
   */
  private async calculateCacheTTLByMarket(market: string, symbols: string[]): Promise<number> {
    try {
      // Query自行计算TTL，不依赖Receiver的ResponseMetadata
      const { status, isHoliday } = await this.marketStatusService.getMarketStatus(market as Market);
      
      // 使用MarketStatus枚举进行判断
      if (status === 'TRADING') {
        return 60;  // 交易时间1分钟缓存
      } else if (isHoliday) {
        return 3600; // 假日1小时缓存
      } else {
        return 1800; // 闭市30分钟缓存
      }
    } catch (error) {
      this.logger.warn(`TTL计算失败，使用默认值`, {
        market,
        symbols,
        error: error.message,
      });
      return 300; // 默认5分钟缓存
    }
  }

  private async storeRealtimeData(
    storageKey: string,
    realtimeResult: RealtimeQueryResultDto,
    queryTypeFilter: string,
  ): Promise<void> {
    const { data, metadata } = realtimeResult;
    if (!data) return;

    try {
      await Promise.all([
        // 存储到Redis缓存
        this.storageService.storeData({
          key: storageKey,
          data: data,
          storageType: StorageType.CACHE,
          storageClassification: (this.fieldMappingService.filterToClassification(queryTypeFilter) ?? StorageClassification.GENERAL) as StorageClassification,
          provider: metadata.provider,
          market: metadata.market,
          options: { cacheTtl: metadata.cacheTTL || 300 },
        }),
        // 存储到MongoDB持久化
        this.storageService.storeData({
          key: storageKey + ":persistent",
          data: data,
          storageType: StorageType.PERSISTENT,
          storageClassification: (this.fieldMappingService.filterToClassification(queryTypeFilter) ?? StorageClassification.GENERAL) as StorageClassification,
          provider: metadata.provider,
          market: metadata.market,
          options: { cacheTtl: 0 }, // MongoDB不过期
        }),
      ]);
      this.logger.debug(`成功存储数据到双存储: ${storageKey}`);
    } catch (storageError) {
      // 存储失败不应影响主流程，但需要记录
      this.logger.warn("数据存储失败", {
        key: storageKey,
        error: storageError.message,
      });
    }
  }

  /**
   * 从股票代码推断市场
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();

    if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }
    if (
      upperSymbol.includes(".SZ") ||
      ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }
    if (
      upperSymbol.includes(".SH") ||
      ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }

    return Market.US;
  }

  /**
   * 🎯 里程碑6.3: 监控指标辅助方法 - 从多个符号推断主要市场
   */
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

  /**
   * 🎯 里程碑6.3: 监控指标辅助方法 - 获取符号数量范围标签
   */
  private getSymbolsCountRange(count: number): string {
    if (count <= 0) return '0';
    if (count <= 5) return '1-5';
    if (count <= 10) return '6-10';
    if (count <= 25) return '11-25';
    if (count <= 50) return '26-50';
    if (count <= 100) return '51-100';
    return '100+';
  }

  /**
   * 🎯 里程碑6.3: 监控指标辅助方法 - 获取批次大小范围标签
   */
  private getBatchSizeRange(size: number): string {
    if (size <= 0) return '0';
    if (size <= 10) return '1-10';
    if (size <= 25) return '11-25';
    if (size <= 50) return '26-50';
    if (size <= 100) return '51-100';
    return '100+';
  }

  private async executeBulkQueriesInParallel(
    request: BulkQueryRequestDto,
  ): Promise<QueryResponseDto[]> {
    const promises = request.queries.map(async (query) => {
      try {
        return await this.executeQuery(query);
      } catch (error) {
        if (!request.continueOnError) {
          throw error;
        }
        const queryId = this.generateQueryId(query);
        const executionResult = {
          results: [],
          cacheUsed: false,
          dataSources: {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors: [
            {
              symbol: query.symbols?.join(",") || "unknown",
              reason: error.message,
            },
          ],
        };
        const errorResult = this.resultProcessorService.process(
          executionResult,
          query,
          queryId,
          0,
        );
        
        // Use PaginationService instead of direct instantiation
        const paginatedData = this.paginationService.createPaginatedResponse(
          executionResult.results,
          query.page || 1,
          query.limit || executionResult.results.length,
          errorResult.metadata.totalResults
        );
        
        return new QueryResponseDto(paginatedData, errorResult.metadata);
      }
    });

    const allResults = await Promise.all(promises);
    return allResults.filter(
      (result): result is QueryResponseDto => result !== null,
    );
  }

  private async executeBulkQueriesSequentially(
    request: BulkQueryRequestDto,
  ): Promise<QueryResponseDto[]> {
    const results: QueryResponseDto[] = [];

    for (const query of request.queries) {
      try {
        const result = await this.executeQuery(query);
        const hasErrors =
          result.metadata.errors && result.metadata.errors.length > 0;

        if (hasErrors) {
          if (!request.continueOnError) {
            const firstError = result.metadata.errors[0];
            throw new Error(
              `Query for symbol ${firstError.symbol} failed: ${firstError.reason}`,
            );
          }
          this.logger.warn(`Bulk query item failed, continuing`, {
            queryType: query.queryType,
            errors: result.metadata.errors,
          });
          // 即使允许继续，也应该将包含错误信息的响应添加到结果中
          results.push(result);
        } else {
          results.push(result);
        }
      } catch (error) {
        if (!request.continueOnError) {
          throw error;
        }
        // 当允许继续时，为失败的查询构建一个包含错误信息的响应
        const queryId = this.generateQueryId(query);
        const executionResult = {
          results: [],
          cacheUsed: false,
          dataSources: {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors: [
            {
              symbol: query.symbols?.join(",") || "unknown",
              reason: error.message,
            },
          ],
        };
        const errorResult = this.resultProcessorService.process(
          executionResult,
          query,
          queryId,
          0,
        );
        
        // Use PaginationService instead of direct instantiation
        const paginatedData = this.paginationService.createPaginatedResponse(
          executionResult.results,
          query.page || 1,
          query.limit || executionResult.results.length,
          errorResult.metadata.totalResults
        );
        
        results.push(new QueryResponseDto(paginatedData, errorResult.metadata));
      }
    }

    return results;
  }

  private generateQueryId(request: QueryRequestDto): string {
    const requestString = JSON.stringify({
      ...request,
      symbols: request.symbols?.slice().sort(),
    });
    return StringUtils.generateSimpleHash(requestString);
  }

  public getQueryStats() {
    return this.statisticsService.getQueryStats();
  }
}
