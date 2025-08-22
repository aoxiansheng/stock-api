import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '../../../../../../../src/core/01-entry/query/services/query.service';
import { StorageService } from '../../../../../../../src/core/04-storage/storage/services/storage.service';
import { ReceiverService } from '../../../../../../../src/core/01-entry/receiver/services/receiver.service';
import { DataChangeDetectorService } from '../../../../../../../src/core/shared/services/data-change-detector.service';
import { MarketStatusService, MarketStatusResult } from '../../../../../../../src/core/shared/services/market-status.service';
import { FieldMappingService } from '../../../../../../../src/core/shared/services/field-mapping.service';
import { QueryStatisticsService } from '../../../../../../../src/core/01-entry/query/services/query-statistics.service';
import { QueryResultProcessorService } from '../../../../../../../src/core/01-entry/query/services/query-result-processor.service';
import { BackgroundTaskService } from '../../../../../../../src/core/shared/services/background-task.service';
import { PaginationService } from '../../../../../../../src/common/modules/pagination/services/pagination.service';
import { MonitoringRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service';
import { CacheStrategy } from '../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';
import { DataSourceType } from '../../../../../../../src/core/01-entry/query/enums/data-source-type.enum';
import { QueryRequestDto } from '../../../../../../../src/core/01-entry/query/dto/query-request.dto';
import { QueryType } from '../../../../../../../src/core/01-entry/query/dto/query-types.dto';

// Mock外部工具函数
jest.mock('../../../../../../../src/core/public/smart-cache/utils/cache-request.utils', () => ({
  buildCacheOrchestratorRequest: jest.fn(),
  inferMarketFromSymbol: jest.fn(),
}));

jest.mock('../../../../../../../src/core/restapi/query/utils/query.util', () => ({
  buildStorageKey: jest.fn(),
  validateDataFreshness: jest.fn(),
}));

describe('QueryService - Smart Cache Integration', () => {
  let service: QueryService;
  let smartCacheOrchestrator: jest.Mocked<SmartCacheOrchestrator>;
  let receiverService: jest.Mocked<ReceiverService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let metricsRegistry: jest.Mocked<MonitoringRegistryService>;

  const mockQueryRequest: QueryRequestDto = {
    queryType: QueryType.BY_SYMBOLS,
    symbols: ['AAPL', 'MSFT', '700.HK'],
    queryTypeFilter: 'get-stock-quote',
    provider: 'longport',
    options: {
      includeFields: ['lastPrice', 'volume'],
      useCache: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: StorageService,
          useValue: {
            retrieveData: jest.fn(),
            storeData: jest.fn(),
          },
        },
        {
          provide: ReceiverService,
          useValue: {
            handleRequest: jest.fn(),
          },
        },
        {
          provide: DataChangeDetectorService,
          useValue: {
            detectChanges: jest.fn(),
          },
        },
        {
          provide: MarketStatusService,
          useValue: {
            getBatchMarketStatus: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            getFieldMappings: jest.fn(),
          },
        },
        {
          provide: QueryStatisticsService,
          useValue: {
            recordQuery: jest.fn(),
          },
        },
        {
          provide: QueryResultProcessorService,
          useValue: {
            processResults: jest.fn(),
          },
        },
        {
          provide: BackgroundTaskService,
          useValue: {
            scheduleTask: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn(),
          },
        },
        {
          provide: MonitoringRegistryService,
          useValue: {
            queryReceiverCallsTotal: {
              inc: jest.fn(),
            },
            queryReceiverCallDuration: {
              observe: jest.fn(),
            },
          },
        },
        {
          provide: SmartCacheOrchestrator,
          useValue: {
            batchGetDataWithSmartCache: jest.fn(),
            getDataWithSmartCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    smartCacheOrchestrator = module.get(SmartCacheOrchestrator);
    receiverService = module.get(ReceiverService);
    marketStatusService = module.get(MarketStatusService);
    metricsRegistry = module.get(MonitoringRegistryService);
  });

  describe('Query批量流水线智能缓存集成', () => {
    beforeEach(() => {
      // Mock市场状态服务
      (marketStatusService.getBatchMarketStatus as any).mockResolvedValue({
        [Market.US]: {
          market: Market.US,
          status: MarketStatus.TRADING,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: 'America/New_York',
          realtimeCacheTTL: 5,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: false,
          confidence: 1.0,
        },
        [Market.HK]: {
          market: Market.HK,
          status: MarketStatus.TRADING,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: 'Asia/Hong_Kong',
          realtimeCacheTTL: 5,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: false,
          confidence: 1.0,
        },
      });

      // Mock智能缓存编排器
      const utils = jest.createMockFromModule('../../../../../../../src/core/public/smart-cache/utils/cache-request.utils') as any;
      utils.buildCacheOrchestratorRequest.mockImplementation((config) => ({
        cacheKey: `cache:${config.symbols.join(',')}:${config.receiverType}:${config.provider}`,
        symbols: config.symbols,
        strategy: config.strategy,
        fetchFn: config.executeOriginalDataFlow, // Map executeOriginalDataFlow to fetchFn as the real function does
        metadata: {
          marketStatus: config.marketStatus,
          provider: config.provider,
          receiverType: config.receiverType,
          queryId: config.queryId,
        },
      }));

      // Mock符号市场推断
      utils.inferMarketFromSymbol.mockImplementation((symbol) => {
        if (symbol.includes('.HK')) return Market.HK;
        return Market.US;
      });
    });

    it('应该使用SmartCacheOrchestrator进行批量查询', async () => {
      // Arrange
      const mockOrchestratorResults = [
        {
          hit: true,
          data: { symbol: 'AAPL', lastPrice: 150.00 },
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:AAPL:get-stock-quote:US',
          error: null,
        },
        {
          hit: false,
          data: { symbol: 'MSFT', lastPrice: 300.00 },
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:MSFT:get-stock-quote:US',
          error: null,
        },
      ];

      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue(mockOrchestratorResults);

      // Mock私有方法调用
      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({
        [Market.US]: { status: MarketStatus.TRADING },
      });

      jest.spyOn(service as any, 'executeQueryToReceiverFlow').mockResolvedValue({
        symbol: 'MSFT',
        lastPrice: 300.00,
      });

      // Act
      const result = await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL', 'MSFT'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalledTimes(1);
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbols: ['AAPL'],
            strategy: CacheStrategy.WEAK_TIMELINESS,
            fetchFn: expect.any(Function),
            metadata: expect.objectContaining({
              receiverType: 'get-stock-quote',
              provider: 'longport',
            }),
          }),
          expect.objectContaining({
            symbols: ['MSFT'],
            strategy: CacheStrategy.WEAK_TIMELINESS,
            fetchFn: expect.any(Function),
            metadata: expect.objectContaining({
              receiverType: 'get-stock-quote',
              provider: 'longport',
            }),
          }),
        ])
      );

      expect(result.cacheHits).toBe(1); // AAPL从缓存命中
      expect(result.realtimeHits).toBe(1); // MSFT需要实时获取
      expect(result.data).toHaveLength(2);
      expect(result.data[0].source).toBe(DataSourceType.CACHE);
      expect(result.data[1].source).toBe(DataSourceType.REALTIME);
    });

    it('应该使用Query层弱时效策略(WEAK_TIMELINESS)', async () => {
      // Arrange
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        { 
          hit: true, 
          data: { symbol: 'AAPL' }, 
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:AAPL:get-stock-quote:US',
        },
      ]);

      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});

      // Act
      await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            strategy: CacheStrategy.WEAK_TIMELINESS,
            fetchFn: expect.any(Function),
          }),
        ])
      );
    });

    it('应该正确处理缓存缺失情况并调用executeQueryToReceiverFlow', async () => {
      // Arrange
      const mockExecuteQueryToReceiverFlow = jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        lastPrice: 150.00,
      });

      jest.spyOn(service as any, 'executeQueryToReceiverFlow').mockImplementation(mockExecuteQueryToReceiverFlow);
      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});

      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        {
          hit: false,
          data: { symbol: 'AAPL', lastPrice: 150.00 },
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:AAPL:get-stock-quote:US',
        },
      ]);

      // Act
      const result = await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(result.cacheHits).toBe(0);
      expect(result.realtimeHits).toBe(1);
      expect(result.data[0].source).toBe(DataSourceType.REALTIME);
    });

    it('应该正确处理编排器返回的错误', async () => {
      // Arrange
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        {
          hit: false,
          data: null,
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:INVALID_SYMBOL:get-stock-quote:US',
          error: 'Provider unavailable',
        },
      ]);

      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});

      // Act
      const result = await (service as any).processReceiverBatch(
        Market.US,
        ['INVALID_SYMBOL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(result.cacheHits).toBe(0);
      expect(result.realtimeHits).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(result.marketErrors).toHaveLength(1);
      expect(result.marketErrors[0].symbol).toBe('INVALID_SYMBOL');
      expect(result.marketErrors[0].reason).toContain('Provider unavailable');
    });

    it('应该记录正确的监控指标', async () => {
      // Arrange
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        { 
          hit: true, 
          data: { symbol: 'AAPL' }, 
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:AAPL:get-stock-quote:US',
        },
      ]);

      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});
      jest.spyOn(service as any, 'getBatchSizeRange').mockReturnValue('1-10');
      jest.spyOn(service as any, 'getSymbolsCountRange').mockReturnValue('1-5');

      // Act
      await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(metricsRegistry.queryReceiverCallsTotal.inc).toHaveBeenCalledWith({
        market: Market.US,
        batch_size_range: '1-10',
        receiver_type: 'get-stock-quote',
      });

      expect(metricsRegistry.queryReceiverCallDuration.observe).toHaveBeenCalledWith(
        {
          market: Market.US,
          symbols_count_range: '1-5',
        },
        expect.any(Number)
      );
    });

    it('应该处理编排器异常并返回错误信息', async () => {
      // Arrange
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockRejectedValue(
        new Error('Orchestrator service unavailable')
      );

      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});

      // Act
      const result = await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL', 'MSFT'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(result.cacheHits).toBe(0);
      expect(result.realtimeHits).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(result.marketErrors).toHaveLength(2);
      expect(result.marketErrors[0].reason).toContain('Query编排器批0异常');
      expect(result.marketErrors[1].reason).toContain('Query编排器批0异常');
    });
  });

  describe('executeQueryToReceiverFlow 方法', () => {
    it('应该调用完整的Receiver流向并允许Receiver层缓存', async () => {
      // Arrange
      receiverService.handleRequest.mockResolvedValue({
        data: [{ symbol: 'AAPL', lastPrice: 150.00 }],
        metadata: {
          provider: 'longport',
          capability: 'get-stock-quote',
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
          processingTime: 100,
        },
      });

      // Act
      const result = await (service as any).executeQueryToReceiverFlow(
        'AAPL',
        mockQueryRequest,
        Market.US
      );

      // Assert
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AAPL'],
          receiverType: 'get-stock-quote',
          options: expect.objectContaining({
            market: Market.US,
            // 重要：不应该设置 useCache: false
            // 允许Receiver使用自己的智能缓存（强时效5秒缓存）
          }),
        })
      );

      expect(result).toEqual({ symbol: 'AAPL', lastPrice: 150.00 });
    });

    it('应该正确提取单符号数据', async () => {
      // Arrange
      receiverService.handleRequest.mockResolvedValue({
        data: [{ symbol: 'AAPL', lastPrice: 150.00 }, { symbol: 'MSFT', lastPrice: 300.00 }],
        metadata: {
          provider: 'longport',
          capability: 'get-stock-quote',
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
          processingTime: 100,
        },
      });

      // Act
      const result = await (service as any).executeQueryToReceiverFlow(
        'AAPL',
        mockQueryRequest,
        Market.US
      );

      // Assert - 应该只返回第一个符号的数据
      expect(result).toEqual({ symbol: 'AAPL', lastPrice: 150.00 });
    });

    it('应该处理非数组格式的响应数据', async () => {
      // Arrange
      receiverService.handleRequest.mockResolvedValue({
        data: { symbol: 'AAPL', lastPrice: 150.00 },
        metadata: {
          provider: 'longport',
          capability: 'get-stock-quote',
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
          processingTime: 100,
        },
      });

      // Act
      const result = await (service as any).executeQueryToReceiverFlow(
        'AAPL',
        mockQueryRequest,
        Market.US
      );

      // Assert
      expect(result).toEqual({ symbol: 'AAPL', lastPrice: 150.00 });
    });
  });

  describe('getMarketStatusForSymbol 方法', () => {
    it('应该根据符号推断市场并获取市场状态', async () => {
      // Arrange
      const utils2 = jest.createMockFromModule('../../../../../../../src/core/public/smart-cache/utils/cache-request.utils') as any;
      utils2.inferMarketFromSymbol.mockReturnValue(Market.HK);

      const createMarketStatusResult = (market: Market, timezone: string): MarketStatusResult => ({
        market,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone,
        realtimeCacheTTL: 5,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 1.0,
      });

      (marketStatusService.getBatchMarketStatus as any).mockResolvedValue({
        [Market.US]: createMarketStatusResult(Market.US, 'America/New_York'),
        [Market.HK]: createMarketStatusResult(Market.HK, 'Asia/Hong_Kong'),
        [Market.SZ]: createMarketStatusResult(Market.SZ, 'Asia/Shanghai'),
        [Market.SH]: createMarketStatusResult(Market.SH, 'Asia/Shanghai'),
        [Market.CN]: createMarketStatusResult(Market.CN, 'Asia/Shanghai'),
        [Market.CRYPTO]: createMarketStatusResult(Market.CRYPTO, 'UTC'),
      });

      // Act
      const result = await (service as any).getMarketStatusForSymbol('700.HK');

      // Assert
      expect(utils2.inferMarketFromSymbol).toHaveBeenCalledWith('700.HK');
      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith([Market.HK]);
      // getMarketStatusForSymbol returns the full market status result from getBatchMarketStatus
      // which includes all markets as per our mock
      expect(result).toEqual({
        [Market.US]: createMarketStatusResult(Market.US, 'America/New_York'),
        [Market.HK]: createMarketStatusResult(Market.HK, 'Asia/Hong_Kong'),
        [Market.SZ]: createMarketStatusResult(Market.SZ, 'Asia/Shanghai'),
        [Market.SH]: createMarketStatusResult(Market.SH, 'Asia/Shanghai'),
        [Market.CN]: createMarketStatusResult(Market.CN, 'Asia/Shanghai'),
        [Market.CRYPTO]: createMarketStatusResult(Market.CRYPTO, 'UTC'),
      });
    });
  });

  describe('两层缓存协同工作验证', () => {
    it('应该实现Query层（300秒）+ Receiver层（5秒）协同缓存', async () => {
      // Arrange
      const mockExecuteQueryToReceiverFlow = jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        lastPrice: 150.00,
      });

      jest.spyOn(service as any, 'executeQueryToReceiverFlow').mockImplementation(mockExecuteQueryToReceiverFlow);
      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});
      jest.spyOn(service as any, 'getBatchSizeRange').mockReturnValue('1-10');
      jest.spyOn(service as any, 'getSymbolsCountRange').mockReturnValue('1-5');
      jest.spyOn(service as any, 'storeStandardizedData').mockResolvedValue(undefined);

      // 模拟Query层缓存缺失，需要调用Receiver
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockImplementation(async (requests) => {
        // 当缓存缺失时，SmartCacheOrchestrator会调用fetchFn (原executeOriginalDataFlow)
        for (const request of requests) {
          if (request.fetchFn) {
            await request.fetchFn();
          }
        }
        
        return [
          {
            hit: false, // Query层缓存缺失
            data: { symbol: 'AAPL', lastPrice: 150.00 },
            strategy: CacheStrategy.WEAK_TIMELINESS,
            storageKey: 'cache:AAPL:get-stock-quote:US',
            error: null,
          },
        ];
      });

      // Act
      await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      // 验证Query层使用弱时效策略
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            strategy: CacheStrategy.WEAK_TIMELINESS, // Query层：弱时效策略（300秒）
            fetchFn: expect.any(Function), // buildCacheOrchestratorRequest maps executeOriginalDataFlow to fetchFn
          }),
        ])
      );

      // 验证executeQueryToReceiverFlow被调用（意味着Query缓存缺失时调用Receiver）
      // 在这个流程中，Receiver会使用自己的强时效缓存（5秒）
      expect(mockExecuteQueryToReceiverFlow).toHaveBeenCalledWith(
        'AAPL',
        mockQueryRequest,
        Market.US
      );
    });
  });
});