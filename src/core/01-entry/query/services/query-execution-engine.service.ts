import { Injectable, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger, sanitizeLogData } from "@app/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { Market } from "@common/constants/market.constants";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { CAPABILITY_NAMES } from "../../../../providers/constants/capability-names.constants";

import { QueryConfigService } from "../config/query.config";
import { QueryMemoryMonitorService } from "./query-memory-monitor.service";

import {
  MarketStatusService,
  MarketStatusResult,
} from "../../../shared/services/market-status.service";
import { FieldMappingService } from "../../../shared/services/field-mapping.service";
import { StringUtils } from "../../../shared/utils/string.util";
import { SmartCacheOrchestrator } from "../../../05-caching/smart-cache/services/smart-cache-orchestrator.service";
import { CacheStrategy } from "../../../05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface";
import {
  buildCacheOrchestratorRequest,
  inferMarketFromSymbol,
} from "../../../05-caching/smart-cache/utils/smart-cache-request.utils";
import { ReceiverService } from "../../../01-entry/receiver/services/receiver.service";
import { DataRequestDto } from "../../../01-entry/receiver/dto/data-request.dto";
import { DataResponseDto } from "../../../01-entry/receiver/dto/data-response.dto";
import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { StorageType } from "../../../04-storage/storage/enums/storage-type.enum";
import { StorageService } from "../../../04-storage/storage/services/storage.service";

import {
  DataSourceStatsDto,
  QueryExecutionResultDto,
  SymbolDataResultDto,
  QueryErrorInfoDto,
} from "../dto/query-internal.dto";
import { QueryRequestDto } from "../dto/query-request.dto";
import { DataSourceType } from "../enums/data-source-type.enum";
import { buildStorageKey } from "../utils/query.util";

/**
 * Query执行引擎服务
 *
 * 核心职责：
 * - 执行具体的查询逻辑（不负责编排）
 * - 管理批量处理管道
 * - 处理智能缓存交互
 * - 与Receiver服务通信
 * - 数据存储和标准化
 *
 * 设计原则：
 * - 无循环依赖：不依赖QueryService或QueryExecutorFactory
 * - 单一职责：只负责执行，不负责路由或工厂创建
 * - 可复用：可被多个执行器（SymbolQueryExecutor等）使用
 */
@Injectable()
export class QueryExecutionEngine implements OnModuleInit {
  private readonly logger = createLogger(QueryExecutionEngine.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly receiverService: ReceiverService,
    private readonly marketStatusService: MarketStatusService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly paginationService: PaginationService,
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
    private readonly smartCacheOrchestrator: SmartCacheOrchestrator,
    private readonly queryConfig: QueryConfigService,
    private readonly memoryMonitor: QueryMemoryMonitorService,
  ) {}

  // 配置参数访问器
  private get MAX_BATCH_SIZE() {
    return this.queryConfig.maxBatchSize;
  }
  private get MAX_MARKET_BATCH_SIZE() {
    return this.queryConfig.maxMarketBatchSize;
  }
  private get MARKET_PARALLEL_TIMEOUT() {
    return this.queryConfig.marketParallelTimeout;
  }
  private get RECEIVER_BATCH_TIMEOUT() {
    return this.queryConfig.receiverBatchTimeout;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("QueryExecutionEngine initialized", {
      config: this.queryConfig.getConfigSummary(),
    });
  }

  /**
   * 执行基于符号的查询
   *
   * 这是从QueryService移动过来的核心执行逻辑
   * 用于处理BY_SYMBOLS类型的查询
   */
  public async executeSymbolBasedQuery(
    request: QueryRequestDto,
  ): Promise<QueryExecutionResultDto> {
    // 防御性检查：确保symbols存在
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

    // 使用优化的批量处理管道
    return await this.executeBatchedPipeline(
      request,
      validSymbols,
      dataSources,
      errors,
    );
  }

  /**
   * 批量处理管道 - 核心执行器
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
      // 批量处理效率指标计算
      const totalSymbolsCount = validSymbols.length;

      // 按市场分组符号以实现市场级批量处理
      let symbolsByMarket = this.groupSymbolsByMarket(validSymbols);
      const marketsCount = Object.keys(symbolsByMarket).length;

      this.logger.debug("批量处理管道启动", {
        queryId,
        totalSymbols: validSymbols.length,
        marketsCount,
        symbolsByMarket: Object.fromEntries(
          Object.entries(symbolsByMarket).map(([market, symbols]) => [
            market,
            symbols.length,
          ]),
        ),
      });

      // 批量处理前内存监控检查
      const memoryCheckResult =
        await this.memoryMonitor.checkMemoryBeforeBatch(totalSymbolsCount);

      if (!memoryCheckResult.canProcess) {
        // 内存压力过高，无法处理
        this.logger.warn("内存压力过高，拒绝处理批量请求", {
          queryId,
          memoryUsage:
            (memoryCheckResult.currentUsage.memory.percentage * 100).toFixed(
              1,
            ) + "%",
          pressureLevel: memoryCheckResult.pressureLevel,
          symbolsCount: totalSymbolsCount,
        });

        // 将所有符号标记为失败
        validSymbols.forEach((symbol) => {
          errors.push({
            symbol,
            reason: `内存压力过高（${(memoryCheckResult.currentUsage.memory.percentage * 100).toFixed(1)}%），系统自动拒绝处理`,
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

      // 如果内存处于警告状态，调整批量大小
      let adjustedSymbolsByMarket = symbolsByMarket;
      if (
        memoryCheckResult.recommendation === "reduce_batch" &&
        memoryCheckResult.suggestedBatchSize
      ) {
        this.logger.warn("内存处于警告状态，调整批量处理大小", {
          queryId,
          originalSize: totalSymbolsCount,
          suggestedSize: memoryCheckResult.suggestedBatchSize,
          memoryUsage:
            (memoryCheckResult.currentUsage.memory.percentage * 100).toFixed(
              1,
            ) + "%",
          pressureLevel: memoryCheckResult.pressureLevel,
        });

        // 重新按建议的批量大小分组
        const firstMarket = Object.keys(symbolsByMarket)[0] as Market;
        if (firstMarket) {
          const limitedSymbols = validSymbols.slice(
            0,
            memoryCheckResult.suggestedBatchSize,
          );
          adjustedSymbolsByMarket = { [firstMarket]: limitedSymbols } as Record<
            Market,
            string[]
          >;

          // 将被跳过的符号标记为延迟处理
          const skippedSymbols = validSymbols.slice(
            memoryCheckResult.suggestedBatchSize,
          );
          skippedSymbols.forEach((symbol) => {
            errors.push({
              symbol,
              reason: `内存压力下降级处理，符号被延迟`,
            });
            dataSources.realtime.misses++;
          });
        }
      }

      // 记录批处理分片监控指标
      Object.entries(adjustedSymbolsByMarket).forEach(([market, symbols]) => {
        const shardsForMarket = Math.ceil(
          symbols.length / this.MAX_MARKET_BATCH_SIZE,
        );
        const efficiency = symbols.length / Math.max(shardsForMarket, 1);
        this.recordBatchProcessingMetrics(
          symbols.length,
          0,
          market,
          efficiency,
        );
      });

      // 市场级并行处理（带超时控制）
      const results: SymbolDataResultDto[] = [];
      let totalCacheHits = 0;
      let totalRealtimeHits = 0;
      let processedSymbolsCount = 0;

      // 逐个处理市场以实现内存优化
      for (const [market, symbols] of Object.entries(adjustedSymbolsByMarket)) {
        try {
          this.logger.debug(`开始处理市场 ${market}`, {
            queryId,
            market,
            symbolsCount: symbols.length,
            processedSymbols: processedSymbolsCount,
            totalSymbols: totalSymbolsCount,
          });

          const marketResult = await this.processBatchForMarket(
            market as Market,
            symbols,
            request,
            queryId,
          );

          // 合并当前市场的结果
          results.push(...marketResult.data);
          totalCacheHits += marketResult.cacheHits;
          totalRealtimeHits += marketResult.realtimeHits;
          errors.push(...marketResult.marketErrors);
          processedSymbolsCount += symbols.length;

          // 记录市场处理时间监控指标
          const marketProcessingTime = Date.now() - startTime;
          this.recordBatchProcessingMetrics(
            marketResult.data.length,
            marketProcessingTime,
            market,
            1.0,
          );

          this.logger.debug(`市场${market}批量处理完成`, {
            queryId,
            market,
            dataCount: marketResult.data.length,
            cacheHits: marketResult.cacheHits,
            realtimeHits: marketResult.realtimeHits,
            errorsCount: marketResult.marketErrors.length,
          });

          // 立即清理处理完的市场数据
          delete adjustedSymbolsByMarket[market];

          // 定期触发垃圾回收（可选，仅在启用时）
          if (
            this.queryConfig.enableMemoryOptimization &&
            global.gc &&
            processedSymbolsCount % this.queryConfig.gcTriggerInterval === 0
          ) {
            this.logger.debug("触发垃圾回收优化", {
              queryId,
              processedSymbols: processedSymbolsCount,
              gcTriggerInterval: this.queryConfig.gcTriggerInterval,
            });
            global.gc();
          }
        } catch (error) {
          // 处理市场级别的失败
          const marketSymbols = adjustedSymbolsByMarket[market];
          marketSymbols.forEach((symbol: string) => {
            errors.push({
              symbol,
              reason: `市场${market}批量处理失败: ${error.message}`,
            });
            dataSources.realtime.misses++;
          });

          this.logger.warn(`市场${market}批量处理失败`, {
            queryId,
            market,
            error: error.message,
            affectedSymbols: marketSymbols.length,
          });

          // 即使失败也要清理市场数据
          delete adjustedSymbolsByMarket[market];
        }
      }

      // 记录批量处理效率监控指标
      const processingTime = Date.now() - startTime;
      const symbolsPerSecond =
        totalSymbolsCount / Math.max(processingTime / 1000, 0.001);
      this.recordBatchProcessingMetrics(
        totalSymbolsCount,
        processingTime,
        this.inferMarketFromSymbols(validSymbols),
        symbolsPerSecond,
      );

      // 记录缓存命中率监控指标
      const totalRequests = totalCacheHits + totalRealtimeHits;
      if (totalRequests > 0) {
        const cacheHitRatio = totalCacheHits / totalRequests;
        this.recordCacheMetrics("batch_cache_hit", cacheHitRatio > 0.5, 0, {
          hitRatio: cacheHitRatio,
          totalRequests,
          queryType: request.queryType,
          market: this.inferMarketFromSymbols(validSymbols),
        });
      }

      // 处理结果数据
      const combinedData = results.map((r) => r.data).flat();
      const cacheUsed = results.some(
        (r) => r.source === DataSourceType.DATASOURCETYPECACHE,
      );

      const paginatedData =
        this.paginationService.createPaginatedResponseFromQuery(
          combinedData,
          request,
          combinedData.length,
        );

      this.logger.log("批量处理管道完成", {
        queryId,
        totalResults: results.length,
        cacheUsed,
        totalErrors: errors.length,
        dataSources,
        processingTimeMs: Date.now() - startTime,
        symbolsPerSecond: symbolsPerSecond.toFixed(2),
        memoryOptimizationEnabled: this.queryConfig.enableMemoryOptimization,
      });

      // 最终内存清理
      adjustedSymbolsByMarket = null;
      symbolsByMarket = null;

      return {
        results: paginatedData.items,
        cacheUsed,
        dataSources,
        errors,
        pagination: paginatedData.pagination,
      };
    } catch (error) {
      this.logger.error("批量处理管道执行失败", {
        queryId,
        error: error.message,
        symbolsCount: validSymbols.length,
      });

      // 全部符号标记为失败
      validSymbols.forEach((symbol) => {
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
   * 处理单个市场的批量数据
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
      // 两级分片策略
      if (symbols.length > this.MAX_MARKET_BATCH_SIZE) {
        const marketChunks = this.chunkArray(
          symbols,
          this.MAX_MARKET_BATCH_SIZE,
        );

        this.logger.debug(`市场${market}采用市场级分片`, {
          queryId,
          market,
          totalSymbols: symbols.length,
          chunksCount: marketChunks.length,
          chunkSize: this.MAX_MARKET_BATCH_SIZE,
        });

        // 并行处理市场分片
        const chunkPromises = marketChunks.map(
          async (chunkSymbols, chunkIndex) => {
            return await this.processMarketChunk(
              market,
              chunkSymbols,
              request,
              queryId,
              chunkIndex,
            );
          },
        );

        const chunkResults = await this.safeAllSettled(
          chunkPromises,
          `市场${market}分片并行处理`,
          this.MARKET_PARALLEL_TIMEOUT / 2,
        );

        // 合并分片结果
        chunkResults.forEach((chunkResult, chunkIndex) => {
          if (chunkResult.status === "fulfilled") {
            const chunkData = chunkResult.value;
            results.push(...chunkData.data);
            cacheHits += chunkData.cacheHits;
            realtimeHits += chunkData.realtimeHits;
            marketErrors.push(...chunkData.marketErrors);
          } else {
            // 处理分片失败
            const chunkSymbols = marketChunks[chunkIndex];
            chunkSymbols.forEach((symbol) => {
              marketErrors.push({
                symbol,
                reason: `市场${market}分片${chunkIndex}处理失败: ${chunkResult.reason}`,
              });
            });
          }
        });
      } else {
        // 单一市场批处理
        const marketResult = await this.processMarketChunk(
          market,
          symbols,
          request,
          queryId,
          0,
        );
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
      symbols.forEach((symbol) => {
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
   * 处理市场分片
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
      // 第二级分片 - 按Receiver批量大小分片
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

      // 并行处理Receiver级分片
      const receiverPromises = receiverChunks.map(
        async (receiverSymbols, receiverIndex) => {
          return await this.processReceiverBatch(
            market,
            receiverSymbols,
            request,
            queryId,
            chunkIndex,
            receiverIndex,
          );
        },
      );

      const receiverResults = await this.safeAllSettled(
        receiverPromises,
        `市场${market}分片${chunkIndex}Receiver级并行处理`,
        this.RECEIVER_BATCH_TIMEOUT,
      );

      // 合并Receiver分片结果
      receiverResults.forEach((receiverResult, receiverIndex) => {
        if (receiverResult.status === "fulfilled") {
          const receiverData = receiverResult.value;
          results.push(...receiverData.data);
          cacheHits += receiverData.cacheHits;
          realtimeHits += receiverData.realtimeHits;
          marketErrors.push(...receiverData.marketErrors);
        } else {
          // 处理Receiver分片失败
          const receiverSymbols = receiverChunks[receiverIndex];
          receiverSymbols.forEach((symbol) => {
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

      symbols.forEach((symbol) => {
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
   * Query批量流水线智能缓存集成
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
    let queryCacheHits = 0;
    let receiverCalls = 0;
    const marketErrors: QueryErrorInfoDto[] = [];
    const results: SymbolDataResultDto[] = [];

    try {
      // 记录智能缓存编排器调用开始监控
      this.recordCacheMetrics("orchestrator_call_start", false, 0, {
        market,
        receiverType: request.queryTypeFilter || "unknown",
        symbolsCount: symbols.length,
      });

      // 构建Query层批量编排器请求
      const marketStatus = await this.getMarketStatusForSymbol(symbols[0]);

      const batchRequests = symbols.map((symbol) =>
        buildCacheOrchestratorRequest({
          symbols: [symbol],
          receiverType: request.queryTypeFilter || CAPABILITY_NAMES.GET_STOCK_QUOTE,
          provider: request.provider,
          queryId: `${queryId}_${symbol}`,
          marketStatus,
          strategy: CacheStrategy.WEAK_TIMELINESS, // Query层弱时效策略（300秒）
          executeOriginalDataFlow: () =>
            this.executeQueryToReceiverFlow(symbol, request, market),
        }),
      );

      // 使用Query层批量编排器
      const orchestratorStartTime = Date.now();
      const orchestratorResults =
        await this.smartCacheOrchestrator.batchGetDataWithSmartCache(
          batchRequests,
        );
      const orchestratorDuration = (Date.now() - orchestratorStartTime) / 1000;

      // 记录智能缓存编排器调用完成监控
      this.recordCacheMetrics(
        "orchestrator_call_complete",
        true,
        orchestratorDuration * 1000,
        {
          market,
          symbolsCount: symbols.length,
          orchestratorDuration,
        },
      );

      // 处理编排器返回结果
      orchestratorResults.forEach((result, index) => {
        const symbol = symbols[index];

        if (result.hit) {
          // Query层缓存命中
          queryCacheHits++;
          results.push({
            data: result.data,
            source: DataSourceType.DATASOURCETYPECACHE,
          });
        } else if (result.data) {
          // Query缓存缺失，已调用Receiver流向获取数据
          receiverCalls++;
          results.push({
            data: result.data,
            source: DataSourceType.REALTIME,
          });

          // 异步存储标准化数据
          this.storeStandardizedData(symbol, result.data, request, queryId, {
            data: [result.data],
            metadata: {
              provider: request.provider || "auto",
              capability: request.queryTypeFilter || CAPABILITY_NAMES.GET_STOCK_QUOTE,
              timestamp: new Date().toISOString(),
              requestId: queryId,
              processingTime: 0,
            },
          }).catch((error) => {
            this.logger.warn(
              `市场${market}分片${chunkIndex}数据存储失败: ${symbol}`,
              {
                queryId,
                chunkIndex,
                receiverIndex,
                error: error.message,
              },
            );
          });
        } else {
          // 编排器无法获取数据
          marketErrors.push({
            symbol,
            reason:
              result.error || `市场${market}分片${chunkIndex}数据获取失败`,
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
      this.logger.error(
        `市场${market}分片${chunkIndex}Query编排器批${receiverIndex}失败`,
        {
          queryId,
          market,
          chunkIndex,
          receiverIndex,
          error: error.message,
          symbolsCount: symbols.length,
        },
      );

      symbols.forEach((symbol) => {
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
   * 转换Query请求为Receiver请求格式
   */
  private convertQueryToReceiverRequest(
    queryRequest: QueryRequestDto,
    symbols: string[],
  ): DataRequestDto {
    return {
      symbols,
      receiverType: queryRequest.queryTypeFilter || CAPABILITY_NAMES.GET_STOCK_QUOTE,
      options: {
        preferredProvider: queryRequest.provider,
        realtime: true,
        fields: queryRequest.options?.includeFields,
        market: queryRequest.market,
        timeout: queryRequest.maxAge ? queryRequest.maxAge * 1000 : undefined,
        storageMode: "none", // 关键：禁止Receiver存储，由Query管理缓存
      },
    };
  }

  /**
   * Query到Receiver的数据流执行
   */
  private async executeQueryToReceiverFlow(
    symbol: string,
    request: QueryRequestDto,
    market: Market,
  ): Promise<any> {
    const baseReceiverRequest = this.convertQueryToReceiverRequest(request, [
      symbol,
    ]);

    const receiverRequest = {
      ...baseReceiverRequest,
      options: {
        ...baseReceiverRequest.options,
        market,
      },
    };

    // 调用完整的Receiver流向
    const receiverResponse =
      await this.receiverService.handleRequest(receiverRequest);

    // 提取单符号数据
    return receiverResponse.data && Array.isArray(receiverResponse.data)
      ? receiverResponse.data[0]
      : receiverResponse.data;
  }

  /**
   * 获取符号对应的市场状态
   */
  private async getMarketStatusForSymbol(
    symbol: string,
  ): Promise<Record<Market, MarketStatusResult>> {
    const market = inferMarketFromSymbol(symbol);
    return await this.marketStatusService.getBatchMarketStatus([
      market as Market,
    ]);
  }

  /**
   * 存储标准化数据到缓存
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
        request.provider || "auto",
        request.queryTypeFilter,
        request.market,
      );

      // Query自行计算TTL
      const market = request.market || inferMarketFromSymbol(symbol);
      const cacheTTL = await this.calculateCacheTTLByMarket(market, [symbol]);

      await this.storageService.storeData({
        key: storageKey,
        data: standardizedData,
        storageType: StorageType.BOTH,
        storageClassification: (this.fieldMappingService.filterToClassification(
          request.queryTypeFilter,
        ) ?? StorageClassification.GENERAL) as StorageClassification,
        provider:
          receiverResponse.metadata?.provider || request.provider || "auto",
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
   */
  private async calculateCacheTTLByMarket(
    market: string,
    symbols: string[],
  ): Promise<number> {
    try {
      const { status, isHoliday } =
        await this.marketStatusService.getMarketStatus(market as Market);

      if (status === "TRADING") {
        return 60; // 交易时间1分钟缓存
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

  // =============== 辅助方法 ===============

  /**
   * 超时控制工具
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeout);
      }),
    ]);
  }

  /**
   * 安全的Promise.allSettled包装
   */
  private async safeAllSettled<T>(
    promises: Promise<T>[],
    context: string,
    timeout?: number,
  ): Promise<PromiseSettledResult<T>[]> {
    const wrappedPromises = timeout
      ? promises.map((p, index) =>
          this.withTimeout(p, timeout, `${context} 第${index + 1}项超时`),
        )
      : promises;

    try {
      return await Promise.allSettled(wrappedPromises);
    } catch (error) {
      this.logger.error(`${context} 批量处理异常`, {
        error: error.message,
        promisesCount: promises.length,
      });

      return promises.map(() => ({
        status: "rejected" as const,
        reason: error.message,
      }));
    }
  }

  /**
   * 按市场分组符号
   */
  private groupSymbolsByMarket(symbols: string[]): Record<Market, string[]> {
    const symbolsByMarket: Record<Market, string[]> = {} as Record<
      Market,
      string[]
    >;

    symbols.forEach((symbol) => {
      const market = inferMarketFromSymbol(symbol);

      if (!symbolsByMarket[market]) {
        symbolsByMarket[market] = [];
      }

      symbolsByMarket[market].push(symbol);
    });

    return symbolsByMarket;
  }

  /**
   * 数组分片工具
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      throw new Error("分片大小必须大于0");
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 从多个符号推断主要市场
   */
  private inferMarketFromSymbols(symbols: string[]): string {
    if (!symbols || symbols.length === 0) return "unknown";

    const marketCounts = new Map<string, number>();

    symbols.forEach((symbol) => {
      const market = inferMarketFromSymbol(symbol);
      marketCounts.set(market, (marketCounts.get(market) || 0) + 1);
    });

    let maxMarket = "unknown";
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
   * 生成查询ID
   */
  private generateQueryId(request: QueryRequestDto): string {
    const requestString = JSON.stringify({
      ...request,
      symbols: request.symbols?.slice().sort(),
    });
    return StringUtils.generateSimpleHash(requestString);
  }

  // =============== 监控辅助方法 ===============

  /**
   * 记录批处理性能指标
   */
  private recordBatchProcessingMetrics(
    batchSize: number,
    processingTime: number,
    market: string,
    efficiency: number,
  ): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_execution_engine",
          metricType: "performance",
          metricName: "batch_processing",
          metricValue: processingTime,
          tags: {
            batchSize,
            market,
            efficiency,
            avgTimePerBatch: batchSize > 0 ? processingTime / batchSize : 0,
            operation: "batch_processing",
            componentType: "query",
          },
        });
      } catch (error) {
        this.logger.warn(`批处理监控事件发送失败: ${error.message}`, {
          batchSize,
        });
      }
    });
  }

  /**
   * ✅ 记录缓存操作指标 - 事件驱动
   */
  private recordCacheMetrics(
    operation: string,
    hit: boolean,
    duration: number,
    metadata: any,
  ): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_execution_engine",
          metricType: "cache",
          metricName: operation,
          metricValue: duration,
          tags: {
            hit,
            operation,
            componentType: "query",
            ...metadata,
          },
        });
      } catch (error) {
        this.logger.warn(`缓存监控事件发送失败: ${error.message}`, {
          operation,
          hit,
        });
      }
    });
  }
}
