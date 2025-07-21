import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from '@common/config/logger.config';
import { MarketStatus } from '@common/constants/market-trading-hours.constants';
import { Market } from '@common/constants/market.constants';

import { DataChangeDetectorService } from '../shared/services/data-change-detector.service';
import { DataFetchingService, DataFetchRequest } from '../shared/services/data-fetching.service';
import { MarketStatusService } from '../shared/services/market-status.service';
import { StringUtils } from "../shared/utils/string.util";
import { StorageType } from "../storage/dto/storage-request.dto";
import { StorageService } from "../storage/storage.service";

import {
  QUERY_ERROR_MESSAGES,
  QUERY_WARNING_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_OPERATIONS,
} from './constants/query.constants';
import {
  DataSourceStatsDto,
  QueryExecutionResultDto,
  SymbolDataResultDto,
  CacheQueryResultDto,
  RealtimeQueryResultDto,
  QueryErrorInfoDto,
} from './dto/query-internal.dto';
import {
  QueryRequestDto,
  BulkQueryRequestDto,
} from "./dto/query-request.dto";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
  QueryMetadataDto,
} from "./dto/query-response.dto";
import { QueryType } from "./dto/query-types.dto";
import { DataSourceType } from "./enums/data-source-type.enum";
import { QueryResultProcessorService } from "./services/query-result-processor.service";
import { QueryStatisticsService } from "./services/query-statistics.service";
import { buildStorageKey, validateDataFreshness } from "./utils/query.util";

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
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED, sanitizeLogData({
      operation: QUERY_OPERATIONS.ON_MODULE_INIT,
    }));
  }

  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(request);

    this.logger.log(QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED, sanitizeLogData({
      queryId,
      queryType: request.queryType,
      symbolsCount: request.symbols?.length || 0,
    }));

    try {
      const executionResult = await this.performQueryExecution(request, queryId);

      const finalResult = this.resultProcessorService.process(
        executionResult,
        request,
        queryId,
        Date.now() - startTime,
      );

      const executionTime = Date.now() - startTime;
      this.statisticsService.recordQueryPerformance(request.queryType, executionTime, true, executionResult.cacheUsed);

      this.logger.log(QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_SUCCESS, sanitizeLogData({ queryId, executionTime }));

      return finalResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.statisticsService.recordQueryPerformance(request.queryType, executionTime, false, false);

      this.logger.error(QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED, sanitizeLogData({
        queryId,
        error: error.message,
        executionTime,
      }));

      throw error;
    }
  }

  async executeBulkQuery(request: BulkQueryRequestDto): Promise<BulkQueryResponseDto> {
    const startTime = Date.now();
    
    this.logger.log(QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_STARTED, sanitizeLogData({
      queriesCount: request.queries.length,
      parallel: request.parallel,
    }));

    try {
      const results = request.parallel
        ? await this.executeBulkQueriesInParallel(request)
        : await this.executeBulkQueriesSequentially(request);
      
      const bulkResponse = new BulkQueryResponseDto(results);
      this.logger.log(QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_COMPLETED, sanitizeLogData({
        totalQueries: bulkResponse.summary.totalQueries,
        successful: results.length,
        failed: bulkResponse.summary.totalQueries - results.length,
        totalTime: Date.now() - startTime,
      }));
      return bulkResponse;
    } catch (error) {
      this.logger.error(QUERY_ERROR_MESSAGES.BULK_QUERY_EXECUTION_FAILED, sanitizeLogData({
        error: error.message,
        totalTime: Date.now() - startTime,
      }));
      throw error;
    }
  }

  private async performQueryExecution(
    request: QueryRequestDto,
    _queryId: string,
  ): Promise<QueryExecutionResultDto> {
    if (request.queryType === QueryType.BY_SYMBOLS) {
      return this.executeSymbolBasedQuery(request);
    }
    throw new BadRequestException(`Unsupported query type: ${request.queryType}`);
  }

  private async executeSymbolBasedQuery(
    request: QueryRequestDto,
  ): Promise<QueryExecutionResultDto> {
    // 防御性检查：确保symbols存在（DTO验证应该已经处理，但为了类型安全）
    if (!request.symbols || request.symbols.length === 0) {
      this.logger.warn(`BY_SYMBOLS查询缺少symbols参数`, sanitizeLogData({ 
        queryType: request.queryType,
        symbols: request.symbols 
      }));
      return {
        results: [],
        cacheUsed: false,
        dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } },
        errors: [{ symbol: '', reason: 'symbols字段是必需的' }]
      };
    }

    const dataSources: DataSourceStatsDto = { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } };
    const errors: QueryErrorInfoDto[] = [];

    const processSymbol = async (symbol: string): Promise<SymbolDataResultDto | null> => {
      try {
        const result = await this.fetchSymbolData(symbol, request, this.generateQueryId(request));
        if (result.source === DataSourceType.CACHE) dataSources.cache.hits++;
        else dataSources.realtime.hits++;
        return result;
      } catch (error) {
        this.logger.warn(QUERY_WARNING_MESSAGES.SYMBOL_DATA_FETCH_FAILED, sanitizeLogData({ symbol, error: error.message }));
        dataSources.realtime.misses++;
        errors.push({ symbol, reason: error.message });
        return null;
      }
    };

    const results = (await Promise.all(request.symbols.map(processSymbol))).filter((r): r is SymbolDataResultDto => r !== null);
    
    const combinedData = results.map(r => r.data).flat();
    const cacheUsed = results.some(r => r.source === DataSourceType.CACHE);
    
    return { results: combinedData, cacheUsed, dataSources, errors };
  }

  private async fetchSymbolData(symbol: string, request: QueryRequestDto, queryId: string): Promise<SymbolDataResultDto> {
    if (request.useCache) {
      const cacheResult = await this.tryGetFromCache(symbol, request, queryId);
      if (cacheResult) return { data: cacheResult.data, source: DataSourceType.CACHE };
    }
    const realtimeResult = await this.fetchFromRealtimeAndCache(symbol, request, queryId);
    return { data: realtimeResult.data, source: DataSourceType.REALTIME };
  }

  private async tryGetFromCache(symbol: string, request: QueryRequestDto, queryId: string): Promise<CacheQueryResultDto | null> {
    const storageKey = buildStorageKey(symbol, request.provider, request.dataTypeFilter, request.market);
    
    try {
      const storageResponse = await this.storageService.retrieveData({ key: storageKey, preferredType: StorageType.CACHE });
      
      if (!storageResponse.data || !validateDataFreshness(storageResponse.data, request.maxAge)) {
        if (storageResponse.data) this.logger.warn(QUERY_WARNING_MESSAGES.CACHE_DATA_EXPIRED, sanitizeLogData({ queryId, key: storageKey }));
        return null;
      }
      
      this.logger.log(QUERY_SUCCESS_MESSAGES.CACHE_DATA_RETRIEVED, sanitizeLogData({ queryId, key: storageKey }));
      return { data: storageResponse.data, metadata: { source: DataSourceType.CACHE, timestamp: new Date(storageResponse.metadata.storedAt), storageKey } };
    } catch (error) {
      // 缓存未命中是正常情况，不应该阻止后续的实时数据获取
      this.logger.debug('缓存未命中，将获取实时数据', sanitizeLogData({ queryId, key: storageKey, error: error.message }));
      return null;
    }
  }

  private async fetchFromRealtimeAndCache(symbol: string, request: QueryRequestDto, queryId: string): Promise<RealtimeQueryResultDto> {
    const storageKey = buildStorageKey(symbol, request.provider, request.dataTypeFilter, request.market);
    
    try {
      // 1. 获取市场状态
      const market = request.market || this.inferMarketFromSymbol(symbol);
      const marketStatus = await this.marketStatusService.getMarketStatus(market as Market);
      
      // 2. 检查是否需要更新数据（基于智能变化检测）
      const cachedData = await this.tryGetFromCache(symbol, request, queryId);
      
      if (cachedData && request.useCache) {
        const needsUpdate = await this.checkIfDataNeedsUpdate(
          symbol, cachedData.data, market as Market, marketStatus.status
        );
        
        if (!needsUpdate) {
          this.logger.debug('数据无变化，使用缓存', { symbol, queryId });
          return { 
            data: cachedData.data, 
            metadata: { 
              source: DataSourceType.CACHE, 
              timestamp: new Date(cachedData.metadata.timestamp), 
              storageKey 
            } 
          };
        }
      }
      
      // 3. 使用统一数据获取服务
      const fetchRequest: DataFetchRequest = {
        symbol,
        dataType: request.dataTypeFilter,
        market: market as Market,
        provider: request.provider,
        useCache: request.useCache,
        maxAge: request.maxAge,
        mode: 'ANALYTICAL', // Query组件使用分析模式
        options: request.options
      };
      
      const fetchResponse = await this.dataFetchingService.fetchSingleData(fetchRequest);
      
      if (!fetchResponse.data) {
        throw new NotFoundException(`Real-time data not found for symbol: ${symbol}`);
      }
      
      // 4. 存储到双存储（MongoDB + Redis）
      if (request.useCache) {
        await Promise.all([
          // 存储到Redis缓存
          this.storageService.storeData({
            key: storageKey,
            data: fetchResponse.data,
            storageType: StorageType.CACHE,
            dataClassification: request.dataTypeFilter as any,
            provider: request.provider,
            market,
            options: { cacheTtl: fetchResponse.metadata.cacheTTL },
          }),
          // 存储到MongoDB持久化
          this.storageService.storeData({
            key: storageKey + ':persistent',
            data: fetchResponse.data,
            storageType: StorageType.PERSISTENT,
            dataClassification: request.dataTypeFilter as any,
            provider: request.provider,
            market,
            options: { cacheTtl: 0 }, // MongoDB不过期
          })
        ]);
      }
      
      return { 
        data: fetchResponse.data, 
        metadata: { 
          source: DataSourceType.REALTIME, 
          timestamp: fetchResponse.metadata.timestamp, 
          storageKey 
        } 
      };
      
    } catch (error) {
      this.logger.error('弱时效数据获取失败', { symbol, queryId, error: error.message });
      throw error;
    }
  }
  
  /**
   * 检查数据是否需要更新
   */
  private async checkIfDataNeedsUpdate(
    symbol: string, 
    cachedData: any, 
    market: Market, 
    marketStatus: MarketStatus
  ): Promise<boolean> {
    try {
      // 暂时获取新数据进行比较（后续可优化为仅检查关键指标）
      const fetchRequest: DataFetchRequest = {
        symbol,
        dataType: 'stock-quote', // 固定使用股票行情进行变化检测
        market,
        mode: 'ANALYTICAL',
        useCache: false // 强制获取新数据用于比较
      };
      
      const freshData = await this.dataFetchingService.fetchSingleData(fetchRequest);
      
      if (!freshData.data) {
        return false; // 无法获取新数据，保持缓存
      }
      
      // 使用智能变化检测
      const changeResult = await this.dataChangeDetector.detectSignificantChange(
        symbol,
        freshData.data,
        market,
        marketStatus
      );
      
      this.logger.debug('数据变化检测结果', {
        symbol,
        hasChanged: changeResult.hasChanged,
        changedFields: changeResult.changedFields,
        reason: changeResult.changeReason,
        confidence: changeResult.confidence
      });
      
      return changeResult.hasChanged;
      
    } catch (error) {
      this.logger.warn('数据变化检测失败，采用保守策略', {
        symbol,
        error: error.message
      });
      // 检测失败时保守地认为需要更新
      return true;
    }
  }
  
  /**
   * 从股票代码推断市场
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();
    
    if (upperSymbol.includes('.HK') || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }
    if (upperSymbol.includes('.SZ') || ['00', '30'].some(prefix => upperSymbol.startsWith(prefix))) {
      return Market.SZ;
    }
    if (upperSymbol.includes('.SH') || ['60', '68'].some(prefix => upperSymbol.startsWith(prefix))) {
      return Market.SH;
    }
    
    return Market.US;
  }

  private async executeBulkQueriesInParallel(request: BulkQueryRequestDto): Promise<QueryResponseDto[]> {
    const results: QueryResponseDto[] = [];
    await Promise.all(request.queries.map(async query => {
      try {
        const result = await this.executeQuery(query);
        results.push(result);
      } catch (error) {
        if (request.continueOnError) {
          // 跳过错误的查询，不添加到结果中
          this.logger.warn(`Bulk query item failed, continuing`, { queryType: query.queryType, error: error.message });
        } else {
          throw error;
        }
      }
    }));
    return results;
  }

  private async executeBulkQueriesSequentially(request: BulkQueryRequestDto): Promise<QueryResponseDto[]> {
    const results: QueryResponseDto[] = [];
    for (const query of request.queries) {
      try {
        results.push(await this.executeQuery(query));
      } catch (error) {
        if (request.continueOnError) {
          // 跳过错误的查询，不添加到结果中
          this.logger.warn(`Bulk query item failed, continuing`, { queryType: query.queryType, error: error.message });
        } else {
          throw error;
        }
      }
    }
    return results;
  }

  private generateQueryId(request: QueryRequestDto): string {
    const requestString = JSON.stringify({ ...request, symbols: request.symbols?.slice().sort() });
    return StringUtils.generateSimpleHash(requestString);
  }

  public getQueryStats() {
    return this.statisticsService.getQueryStats();
  }
}
