import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { Market } from "@common/constants/market.constants";
import { PaginationService } from '@common/modules/pagination/services/pagination.service';

import { DataChangeDetectorService } from "../../../shared/services/data-change-detector.service";
import { MarketStatusService, MarketStatusResult } from "../../../shared/services/market-status.service";
import { FieldMappingService } from "../../../shared/services/field-mapping.service";
import { StringUtils } from "../../../shared/utils/string.util";
import { SmartCacheOrchestrator } from "../../../05-caching/smart-cache/services/symbol-smart-cache-orchestrator.service";
import { CacheStrategy } from "../../../05-caching/smart-cache/interfaces/symbol-smart-cache-orchestrator.interface";
import { buildCacheOrchestratorRequest, inferMarketFromSymbol } from "../../../05-caching/smart-cache/utils/symbol-smart-cache-request.utils";
import { ReceiverService } from "../../../01-entry/receiver/services/receiver.service";
import { DataRequestDto } from "../../../01-entry/receiver/dto/data-request.dto";
import { DataResponseDto } from "../../../01-entry/receiver/dto/data-response.dto";
import {
  StorageType,
  StorageClassification,
} from "../../../04-storage/storage/enums/storage-type.enum";
import { StorageService } from "../../../04-storage/storage/services/storage.service";

import {
  QUERY_ERROR_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import {
  DataSourceStatsDto,
  QueryExecutionResultDto,
  SymbolDataResultDto,
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
import { buildStorageKey } from "../utils/query.util";
import { BackgroundTaskService } from "../../../shared/services/background-task.service";
import { MetricsRegistryService } from "../../../../monitoring/metrics/services/metrics-registry.service";

@Injectable()
export class QueryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(QueryService.name);

  // 🔄 智能缓存编排器集成后，以下字段已废弃（由编排器统一管理）:
  // - backgroundUpdateTasks：后台更新去重机制
  // - lastUpdateTimestamps：TTL节流策略  
  // - updateQueue：任务队列优化

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
    private readonly smartCacheOrchestrator: SmartCacheOrchestrator,  // 🔑 关键: 注入智能缓存编排器
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
   * 🔄 模块销毁处理 - 智能缓存编排器集成后简化
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('QueryService模块正在关闭');
    // 后台更新任务现在由SmartCacheOrchestrator统一管理
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

      // 正确使用processedResult的PaginatedDataDto类型
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
      const market = inferMarketFromSymbol(symbol);
      
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
   * 🎯 重构：Query批量流水线智能缓存集成
   * 
   * 使用Query层SmartCacheOrchestrator处理指定市场内的符号批次
   * 实现两层缓存协同：Query层（300秒）+ Receiver层（5秒）
   * 
   * @param market 市场
   * @param symbols 符号列表
   * @param request 查询请求
   * @param queryId 查询ID
   * @param chunkIndex 分片索引
   * @param receiverIndex Receiver批次索引
   * @returns 处理结果（数据、缓存命中数、实时命中数、错误信息）
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
    let queryCacheHits = 0;  // Query层缓存命中
    let receiverCalls = 0;   // 需要调用Receiver的次数
    const marketErrors: QueryErrorInfoDto[] = [];
    const results: SymbolDataResultDto[] = [];

    try {
      // 🎯 监控指标跟踪 - Query批量编排器调用指标
      const batchSizeRange = this.getBatchSizeRange(symbols.length);
      const symbolsCountRange = this.getSymbolsCountRange(symbols.length);
      
      // 🎯 监控指标：记录Query层SmartCacheOrchestrator编排调用计数
      // 注意：复用queryReceiverCallsTotal指标，但语义已变为"Query层智能缓存编排器调用"
      // receiver_type标签现在表示编排器处理的接收器类型，而非直接的Receiver调用
      this.metricsRegistry.queryReceiverCallsTotal.inc({
        market,
        batch_size_range: batchSizeRange,
        receiver_type: request.queryTypeFilter || 'unknown',
      });

      // 🎯 核心重构：构建Query层批量编排器请求
      // 注意：symbols[0] 语义安全，因为上游已按市场分组，同批次符号属于同一市场
      const marketStatus = await this.getMarketStatusForSymbol(symbols[0]);
      
      const batchRequests = symbols.map(symbol => 
        buildCacheOrchestratorRequest({
          symbols: [symbol],
          receiverType: request.queryTypeFilter || 'get-stock-quote',
          provider: request.provider,
          queryId: `${queryId}_${symbol}`,
          marketStatus,
          strategy: CacheStrategy.WEAK_TIMELINESS, // Query层弱时效策略（300秒）
          executeOriginalDataFlow: () => this.executeQueryToReceiverFlow(symbol, request, market),
        })
      );

      // 🎯 使用Query层批量编排器（先检查Query层缓存）
      const orchestratorStartTime = Date.now();
      const orchestratorResults = await this.smartCacheOrchestrator.batchGetDataWithSmartCache(batchRequests);
      const orchestratorDuration = (Date.now() - orchestratorStartTime) / 1000;
      
      // 🎯 监控指标：记录Query层SmartCacheOrchestrator编排调用耗时
      // 注意：复用queryReceiverCallDuration指标，但语义已变为"Query层智能缓存编排器耗时"
      // 测量的是SmartCacheOrchestrator.batchGetDataWithSmartCache的执行时间
      this.metricsRegistry.queryReceiverCallDuration.observe(
        {
          market,
          symbols_count_range: symbolsCountRange,
        },
        orchestratorDuration
      );

      // 🎯 处理编排器返回结果
      orchestratorResults.forEach((result, index) => {
        const symbol = symbols[index];
        
        if (result.hit) {
          // Query层缓存命中
          queryCacheHits++;
          results.push({
            data: result.data,
            source: DataSourceType.CACHE,
          });
        } else if (result.data) {
          // Query缓存缺失，已调用Receiver流向获取数据
          receiverCalls++;
          results.push({
            data: result.data,
            source: DataSourceType.REALTIME,
          });
          
          // 异步存储标准化数据（不阻塞主流程）
          this.storeStandardizedData(symbol, result.data, request, queryId, { 
            data: [result.data],
            metadata: {
              provider: request.provider || 'auto',
              capability: request.queryTypeFilter || 'get-stock-quote',
              timestamp: new Date().toISOString(),
              requestId: queryId,
              processingTime: 0,
            }
          })
            .catch(error => {
              this.logger.warn(`市场${market}分片${chunkIndex}数据存储失败: ${symbol}`, {
                queryId,
                chunkIndex,
                receiverIndex,
                error: error.message,
              });
            });
        } else {
          // 编排器无法获取数据
          marketErrors.push({
            symbol,
            reason: result.error || `市场${market}分片${chunkIndex}数据获取失败`,
          });
        }
      });

      return {
        data: results,
        cacheHits: queryCacheHits,
        realtimeHits: receiverCalls,
        marketErrors,
      };

    } catch (error) {
      this.logger.error(`市场${market}分片${chunkIndex}Query编排器批${receiverIndex}失败`, {
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
          reason: `市场${market}分片${chunkIndex}Query编排器批${receiverIndex}异常: ${error.message}`,
        });
      });

      return {
        data: [],
        cacheHits: 0,
        realtimeHits: 0,
        marketErrors,
      };
    }
  }

  /**
   * 🎯 新增支持方法：Query到Receiver的数据流执行
   * 
   * 供Query层编排器回调使用，调用完整的Receiver流向获取数据
   * 重要：允许Receiver使用自己的智能缓存（强时效5秒缓存）
   * 两层缓存协同工作：Query层300秒，Receiver层5秒
   */
  private async executeQueryToReceiverFlow(
    symbol: string, 
    request: QueryRequestDto, 
    market: Market
  ): Promise<any> {
    // 🎯 性能优化：缓存convertQueryToReceiverRequest结果，避免重复计算
    const baseReceiverRequest = this.convertQueryToReceiverRequest(request, [symbol]);
    
    const receiverRequest = {
      ...baseReceiverRequest,
      options: {
        ...baseReceiverRequest.options,
        market,
        // ✅ 允许Receiver使用自己的智能缓存（强时效5秒缓存）
        // 不设置 useCache: false，让Receiver层维护自己的短效缓存
        // 两层缓存协同工作：Query层300秒，Receiver层5秒
      },
    };
    
    // 调用完整的Receiver流向（包括Receiver的智能缓存检查）
    const receiverResponse = await this.receiverService.handleRequest(receiverRequest);
    
    // 提取单符号数据
    return receiverResponse.data && Array.isArray(receiverResponse.data) 
      ? receiverResponse.data[0] 
      : receiverResponse.data;
  }

  /**
   * 🎯 新增支持方法：获取单符号的市场状态
   * 
   * 为编排器提供市场信息，用于推断符号的市场状态
   */
  /**
   * 获取符号对应的市场状态（类型安全版本）
   * 
   * @param symbol 股票符号
   * @returns 市场状态映射，键为Market枚举，值为MarketStatusResult
   */
  private async getMarketStatusForSymbol(symbol: string): Promise<Record<Market, MarketStatusResult>> {
    const market = inferMarketFromSymbol(symbol);
    return await this.marketStatusService.getBatchMarketStatus([market as Market]);
  }

  // 🗑️ 老单符号缓存逻辑已移除 - fetchSymbolData
  // 已被Query层SmartCacheOrchestrator在processReceiverBatch中统一处理

  // 🗑️ 老数据流执行方法已移除 - executeOriginalDataFlow
  // 已被executeQueryToReceiverFlow替代

  // 🗑️ 老缓存查询方法已移除 - tryGetFromCache
  // 已被SmartCacheOrchestrator统一处理

  // 🗑️ 老实时数据获取方法已移除 - fetchFromRealtime
  // 已被executeQueryToReceiverFlow替代



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

      const market = request.market || inferMarketFromSymbol(symbol);
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
      const market = request.market || inferMarketFromSymbol(symbol);
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
      const market = inferMarketFromSymbol(symbol);
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
        
        // 直接使用已正确处理的PaginatedDataDto
        return new QueryResponseDto(errorResult.data, errorResult.metadata);
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
        
        // 直接使用已正确处理的PaginatedDataDto
        results.push(new QueryResponseDto(errorResult.data, errorResult.metadata));
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
