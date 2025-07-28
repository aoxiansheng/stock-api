import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { Market } from "@common/constants/market.constants";
import { PaginationService } from '@common/pagination/services/pagination.service';

import { DataChangeDetectorService } from "../../shared/service/data-change-detector.service";
import {
  DataFetchingService,
  DataFetchRequest,
} from "../../shared/service/data-fetching.service";
import { MarketStatusService } from "../../shared/service/market-status.service";
import { StringUtils } from "../../shared/utils/string.util";
import {
  StorageType,
  DataClassification,
} from "../../storage/enums/storage-type.enum";
import { StorageService } from "../../storage/service/storage.service";

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
import { BackgroundTaskService } from "@core/shared/service/background-task.service";

@Injectable()
export class QueryService implements OnModuleInit {
  private readonly logger = createLogger(QueryService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly dataFetchingService: DataFetchingService,
    private readonly dataChangeDetector: DataChangeDetectorService,
    private readonly marketStatusService: MarketStatusService,
    private readonly statisticsService: QueryStatisticsService,
    private readonly resultProcessorService: QueryResultProcessorService,
    private readonly backgroundTaskService: BackgroundTaskService,
    private readonly paginationService: PaginationService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED,
      sanitizeLogData({
        operation: QUERY_OPERATIONS.ON_MODULE_INIT,
      }),
    );
  }

  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(request);

    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED,
      sanitizeLogData({
        queryId,
        queryType: request.queryType,
        symbolsCount: request.symbols?.length || 0,
      }),
    );

    try {
      const executionResult = await this.performQueryExecution(request);

      const processedResult = this.resultProcessorService.process(
        executionResult,
        request,
        queryId,
        Date.now() - startTime,
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

      this.logger.error(
        QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED,
        sanitizeLogData({
          queryId,
          error: error.message,
          executionTime,
        }),
      );

      throw error;
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

    const processSymbol = async (
      symbol: string,
    ): Promise<SymbolDataResultDto | null> => {
      try {
        const result = await this.fetchSymbolData(
          symbol,
          request,
          this.generateQueryId(request),
        );
        if (result.source === DataSourceType.CACHE) {
          dataSources.cache.hits++;
        } else {
          dataSources.realtime.hits++;
        }
        return result;
      } catch (error) {
        this.logger.warn(
          QUERY_WARNING_MESSAGES.SYMBOL_DATA_FETCH_FAILED,
          sanitizeLogData({ symbol, error: error.message }),
        );
        dataSources.realtime.misses++;
        errors.push({ symbol, reason: error.message });
        return null;
      }
    };

    const results = (await Promise.all(validSymbols.map(processSymbol))).filter(
      (r): r is SymbolDataResultDto => r !== null,
    );

    const combinedData = results.map((r) => r.data).flat();
    const cacheUsed = results.some((r) => r.source === DataSourceType.CACHE);

    const paginatedData = this.paginationService.createPaginatedResponseFromQuery(
      combinedData,
      request,
      combinedData.length,
    );

    return {
      results: paginatedData.items,
      cacheUsed,
      dataSources,
      errors,
      pagination: paginatedData.pagination,
    };
  }

  private async fetchSymbolData(
    symbol: string,
    request: QueryRequestDto,
    queryId: string,
  ): Promise<SymbolDataResultDto> {
    const storageKey = buildStorageKey(
      symbol,
      request.provider,
      request.queryDataTypeFilter,
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
        // 缓存命中，立即返回并异步触发后台更新
        this.backgroundTaskService.run(
          () =>
            this.updateDataInBackground(
              symbol,
              storageKey,
              request,
              queryId,
              cachedResult.data, // 传递当前缓存数据用于比较
            ),
          `Update data for symbol ${symbol}`,
        );
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
            request.queryDataTypeFilter,
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
      const market = request.market || this.inferMarketFromSymbol(symbol);

      const fetchRequest: DataFetchRequest = {
        symbol,
        dataType: request.queryDataTypeFilter,
        market: market as Market,
        provider: request.provider,
        useCache: false, // 强制不使用缓存来获取最新数据
        maxAge: request.maxAge,
        mode: "ANALYTICAL",
        options: request.options,
      };

      const freshData =
        await this.dataFetchingService.fetchSingleData(fetchRequest);

      if (!freshData || !freshData.data) {
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
              market: market as Market,
            },
          };
        }
        throw new NotFoundException(
          `Real-time data not found for symbol: ${symbol}`,
        );
      }

      return {
        data: freshData.data,
        metadata: {
          source: DataSourceType.REALTIME,
          timestamp: freshData.metadata?.timestamp || new Date(),
          storageKey,
          provider: request.provider,
          market: market as Market,
          cacheTTL: freshData.metadata?.cacheTTL,
        },
      };
    } catch (error) {
      this.logger.error(
        "弱时效数据获取失败",
        sanitizeLogData({
          symbol,
          queryId,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  private async updateDataInBackground(
    symbol: string,
    storageKey: string,
    request: QueryRequestDto,
    queryId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentCachedData: any,
  ) {
    try {
      this.logger.debug(`后台更新任务开始: ${symbol}`, { queryId });

      const market = request.market || this.inferMarketFromSymbol(symbol);
      const marketStatus = await this.marketStatusService.getMarketStatus(
        market as Market,
      );

      const freshData = await this.fetchFromRealtime(
        symbol,
        storageKey,
        request,
        queryId,
      );

      const changeResult =
        await this.dataChangeDetector.detectSignificantChange(
          symbol,
          freshData.data,
          market as Market,
          marketStatus.status,
        );

      if (changeResult.hasChanged) {
        this.logger.log(`数据发生变化，后台更新缓存: ${symbol}`, {
          queryId,
          changes: changeResult.significantChanges,
        });
        await this.storeRealtimeData(
          storageKey,
          freshData,
          request.queryDataTypeFilter,
        );
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

  private async storeRealtimeData(
    storageKey: string,
    realtimeResult: RealtimeQueryResultDto,
    dataType: string,
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
          dataClassification: dataType as DataClassification,
          provider: metadata.provider,
          market: metadata.market,
          options: { cacheTtl: metadata.cacheTTL || 300 },
        }),
        // 存储到MongoDB持久化
        this.storageService.storeData({
          key: storageKey + ":persistent",
          data: data,
          storageType: StorageType.PERSISTENT,
          dataClassification: dataType as DataClassification,
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
