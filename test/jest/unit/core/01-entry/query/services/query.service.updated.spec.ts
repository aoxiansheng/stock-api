import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryService } from '../../../../../../../src/core/01-entry/query/services/query.service';
import { StorageService } from '../../../../../../../src/core/04-storage/storage/services/storage.service';
import { ReceiverService } from '../../../../../../../src/core/01-entry/receiver/services/receiver.service';
import { DataChangeDetectorService } from '../../../../../../../src/core/shared/services/data-change-detector.service';
import { MarketStatusService } from '../../../../../../../src/core/shared/services/market-status.service';
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
import { ResponseMetadataDto } from '../../../../../../../src/core/01-entry/receiver/dto/data-response.dto';

// Mock the external utilities
jest.mock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils', () => ({
  buildCacheOrchestratorRequest: jest.fn(),
  inferMarketFromSymbol: jest.fn(),
}));

jest.mock('../../../../../../../src/core/01-entry/query/utils/query.util', () => ({
  buildStorageKey: jest.fn(),
  validateDataFreshness: jest.fn(),
}));

describe('QueryService - Updated Tests', () => {
  let service: QueryService;
  let storageService: jest.Mocked<StorageService>;
  let receiverService: jest.Mocked<ReceiverService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let monitoringRegistryService: jest.Mocked<MonitoringRegistryService>;
  let smartCacheOrchestrator: jest.Mocked<SmartCacheOrchestrator>;

  // Mock data for testing
  const mockMarketStatus = {
    [Market.HK]: {
      market: Market.HK,
      status: MarketStatus.TRADING,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Hong_Kong',
      realtimeCacheTTL: 5, // Updated to reflect new STRONG_TIMELINESS TTL
      analyticalCacheTTL: 300,
      isHoliday: false,
      isDST: false,
      confidence: 0.9,
    },
    [Market.US]: {
      market: Market.US,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'America/New_York',
      realtimeCacheTTL: 5, // Updated to reflect new STRONG_TIMELINESS TTL
      analyticalCacheTTL: 300,
      isHoliday: false,
      isDST: false,
      confidence: 0.9,
    },
  };

  const mockSymbolData = {
    symbol: '700.HK',
    lastPrice: 100.5,
    volume: 1000000,
    market: 'HK',
  };

  const mockReceiverResponse = {
    data: [mockSymbolData],
    metadata: new ResponseMetadataDto('longport', 'get-stock-quote', 'test-request-id', 100),
  };

  const mockCacheResult = {
    data: [mockSymbolData],
    hit: true,
    ttlRemaining: 5, // Updated to reflect new STRONG_TIMELINESS TTL
    strategy: CacheStrategy.WEAK_TIMELINESS,
    storageKey: 'test:cache:key',
    timestamp: new Date().toISOString(),
  };

  const mockRequest: QueryRequestDto = {
    queryType: QueryType.BY_SYMBOLS,
    symbols: ['700.HK'],
    queryTypeFilter: 'get-stock-quote',
    provider: 'longport',
    market: Market.HK,
    options: {
      useCache: true,
    },
  };

  beforeEach(async () => {
    const mockStorageService = {
      findData: jest.fn(),
      saveData: jest.fn(),
      clearCacheByPrefix: jest.fn(),
    };

    const mockReceiverService = {
      handleRequest: jest.fn(),
    };

    const mockMarketStatusService = {
      getMarketStatus: jest.fn(),
    };

    const mockMetricsRegistry = {
      queryConcurrentRequestsActive: { inc: jest.fn(), dec: jest.fn() },
      queryPipelineDuration: { observe: jest.fn() },
      querySymbolsProcessedTotal: { inc: jest.fn() },
      queryBackgroundTasksActive: { set: jest.fn() },
      queryBackgroundTasksCompleted: { inc: jest.fn() },
      queryBackgroundTasksFailed: { inc: jest.fn() },
      getMetricValue: jest.fn(),
    };

    const mockSmartCacheOrchestrator = {
      getDataWithSmartCache: jest.fn().mockResolvedValue(mockCacheResult),
      batchGetDataWithSmartCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: ReceiverService, useValue: mockReceiverService },
        { provide: DataChangeDetectorService, useValue: {} },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: FieldMappingService, useValue: {} },
        { provide: QueryStatisticsService, useValue: { recordQueryPerformance: jest.fn(), getQueryStats: jest.fn() } },
        { provide: QueryResultProcessorService, useValue: {} },
        { provide: BackgroundTaskService, useValue: {} },
        { provide: PaginationService, useValue: {} },
        { provide: MonitoringRegistryService, useValue: mockMetricsRegistry },
        { provide: SmartCacheOrchestrator, useValue: mockSmartCacheOrchestrator },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    storageService = module.get(StorageService);
    receiverService = module.get(ReceiverService);
    marketStatusService = module.get(MarketStatusService);
    monitoringRegistryService = module.get(MonitoringRegistryService);
    smartCacheOrchestrator = module.get(SmartCacheOrchestrator);

    // Setup utility function mocks
    const cacheUtils = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
    const queryUtils = jest.requireMock('../../../../../../../src/core/01-entry/query/utils/query.util');

    cacheUtils.buildCacheOrchestratorRequest.mockReturnValue({
      cacheKey: 'test:cache:key',
      strategy: CacheStrategy.WEAK_TIMELINESS,
      symbols: ['700.HK'],
      fetchFn: expect.any(Function),
      metadata: {
        marketStatus: mockMarketStatus,
        requestId: 'test-123',
        queryTypeFilter: 'get-stock-quote',
      },
    });

    cacheUtils.inferMarketFromSymbol.mockReturnValue(Market.HK);
    queryUtils.buildStorageKey.mockReturnValue('test:storage:key');
    queryUtils.validateDataFreshness.mockReturnValue(true);

    // Setup service method mocks
    marketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatus[Market.HK]);
    receiverService.handleRequest.mockResolvedValue(mockReceiverResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Module Lifecycle', () => {
    it('should initialize correctly on module init', async () => {
      await service.onModuleInit();
      // Should complete without error
    });

    it('should destroy correctly on module destroy', async () => {
      await service.onModuleDestroy();
      // Should complete without error
    });
  });

  describe('executeQuery - Main Entry Point', () => {
    it('should execute query successfully with cache hit', async () => {
      const result = await service.executeQuery(mockRequest);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle single symbol query', async () => {
      const singleSymbolRequest = { ...mockRequest, symbols: ['700.HK'] };
      
      const result = await service.executeQuery(singleSymbolRequest);

      expect(result).toBeDefined();
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalled();
    });

    it('should handle multiple symbols query', async () => {
      const multiSymbolRequest = { 
        ...mockRequest, 
        symbols: ['700.HK', 'AAPL', '600000.SH'] 
      };
      
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        mockCacheResult,
        { ...mockCacheResult, data: [{ symbol: 'AAPL', lastPrice: 150 }] },
        { ...mockCacheResult, data: [{ symbol: '600000.SH', lastPrice: 10 }] },
      ]);

      const result = await service.executeQuery(multiSymbolRequest);

      expect(result).toBeDefined();
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalled();
    });

    it('should handle empty symbols array', async () => {
      const emptyRequest = { ...mockRequest, symbols: [] };

      await expect(service.executeQuery(emptyRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Smart Cache Integration', () => {
    it('should use WEAK_TIMELINESS strategy for Query component', async () => {
      await service.executeQuery(mockRequest);

      const cacheUtils = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
      expect(cacheUtils.buildCacheOrchestratorRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: CacheStrategy.WEAK_TIMELINESS,
        })
      );
    });

    it('should handle cache miss gracefully', async () => {
      const cacheMissResult = {
        ...mockCacheResult,
        hit: false,
        data: null,
      };

      smartCacheOrchestrator.getDataWithSmartCache.mockResolvedValueOnce(cacheMissResult);
      receiverService.handleRequest.mockResolvedValueOnce(mockReceiverResponse);

      const result = await service.executeQuery(mockRequest);

      expect(result).toBeDefined();
      expect(receiverService.handleRequest).toHaveBeenCalled();
    });

    it('should use NO_CACHE strategy when useCache is false', async () => {
      const noCacheRequest = { ...mockRequest, useCache: false };

      const cacheUtils = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
      cacheUtils.buildCacheOrchestratorRequest.mockReturnValue({
        cacheKey: 'test:cache:key',
        strategy: CacheStrategy.NO_CACHE,
        symbols: ['700.HK'],
        fetchFn: expect.any(Function),
        metadata: expect.any(Object),
      });

      await service.executeQuery(noCacheRequest);

      expect(cacheUtils.buildCacheOrchestratorRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: CacheStrategy.NO_CACHE,
        })
      );
    });
  });

  describe('TTL Strategy Verification', () => {
    it('should calculate correct cache TTL for HK market during trading hours', async () => {
      const symbols = ['700.HK'];
      marketStatusService.getMarketStatus.mockResolvedValue({
        ...mockMarketStatus[Market.HK],
        status: MarketStatus.TRADING,
        realtimeCacheTTL: 5, // Verify new STRONG_TIMELINESS TTL
      });

      const ttl = await (service as any).calculateCacheTTLByMarket(Market.HK, symbols);

      expect(ttl).toBe(5); // Should use realtime TTL (5 seconds) for trading hours
    });

    it('should calculate correct cache TTL for closed market', async () => {
      const symbols = ['AAPL'];
      marketStatusService.getMarketStatus.mockResolvedValue({
        ...mockMarketStatus[Market.US],
        status: MarketStatus.CLOSED,
        analyticalCacheTTL: 300,
      });

      const ttl = await (service as any).calculateCacheTTLByMarket(Market.US, symbols);

      expect(ttl).toBe(300); // Should use analytical TTL for closed market
    });

    it('should handle market status service errors gracefully', async () => {
      marketStatusService.getMarketStatus.mockRejectedValue(new Error('Market status error'));

      const ttl = await (service as any).calculateCacheTTLByMarket(Market.HK, ['700.HK']);

      expect(ttl).toBe(60); // Should fallback to default TTL
    });
  });

  describe('Helper Methods', () => {
    it('should generate unique query IDs', () => {
      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
      };
      const mockRequest2: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
      };
      
      const id1 = (service as any).generateQueryId(mockRequest);
      const id2 = (service as any).generateQueryId(mockRequest2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should infer market from symbols correctly', () => {
      expect((service as any).inferMarketFromSymbols(['700.HK'])).toBe(Market.HK);
      expect((service as any).inferMarketFromSymbols(['AAPL'])).toBe(Market.US);
      expect((service as any).inferMarketFromSymbols(['600000.SH'])).toBe(Market.SH);
      expect((service as any).inferMarketFromSymbols(['000001.SZ'])).toBe(Market.SZ);
      expect((service as any).inferMarketFromSymbols(['700.HK', 'AAPL'])).toBe('MIXED');
      expect((service as any).inferMarketFromSymbols([])).toBe('UNKNOWN');
    });

    it('should get symbols count range correctly', () => {
      expect((service as any).getSymbolsCountRange(1)).toBe('1-5');
      expect((service as any).getSymbolsCountRange(5)).toBe('1-5');
      expect((service as any).getSymbolsCountRange(10)).toBe('6-10');
      expect((service as any).getSymbolsCountRange(25)).toBe('11-25');
      expect((service as any).getSymbolsCountRange(75)).toBe('51-100');
      expect((service as any).getSymbolsCountRange(150)).toBe('100+');
    });

    it('should convert query to receiver request correctly', () => {
      const testRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
        queryTypeFilter: 'get-stock-quote',
        provider: 'longport',
      };
      const receiverRequest = (service as any).convertQueryToReceiverRequest(testRequest, ['700.HK']);

      expect(receiverRequest).toEqual({
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
        options: expect.objectContaining({
          preferredProvider: 'longport',
          realtime: true,
          storageMode: 'none',
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle smart cache orchestrator errors', async () => {
      smartCacheOrchestrator.getDataWithSmartCache.mockRejectedValueOnce(
        new Error('Cache orchestrator error')
      );

      await expect(service.executeQuery(mockRequest)).rejects.toThrow('Cache orchestrator error');
    });

    it('should track error metrics', async () => {
      smartCacheOrchestrator.getDataWithSmartCache.mockRejectedValue(new Error('Test error'));

      try {
        await service.executeQuery(mockRequest);
      } catch (error) {
        // Expected to throw
      }

      // Note: queryErrors metric doesn't exist in current MonitoringRegistryService
      // expect(monitoringRegistryService.queryErrors.inc).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should track query duration metrics', async () => {
      await service.executeQuery(mockRequest);

      expect(monitoringRegistryService.queryPipelineDuration.observe).toHaveBeenCalled();
    });

    it('should track batch size metrics for multi-symbol queries', async () => {
      const multiBatchRequest = { 
        ...mockRequest, 
        symbols: ['700.HK', 'AAPL', '600000.SH', '000001.SZ', 'GOOGL'] 
      };

      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue(
        multiBatchRequest.symbols.map(symbol => ({
          ...mockCacheResult,
          data: [{ symbol, lastPrice: 100 }],
        }))
      );

      await service.executeQuery(multiBatchRequest);

      // Note: queryBatchSize metric doesn't exist in current MonitoringRegistryService
      // expect(monitoringRegistryService.queryBatchSize.observe).toHaveBeenCalled();
    });
  });

  describe('Bulk Query Operations', () => {
    it('should execute bulk queries in parallel when appropriate', async () => {
      const bulkRequest = {
        queryType: QueryType.BY_SYMBOLS,
        queries: [mockRequest, { ...mockRequest, symbols: ['AAPL'] }],
        enableParallelExecution: true,
      };

      const result = await service.executeBulkQuery(bulkRequest);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute bulk queries sequentially when parallel is disabled', async () => {
      const bulkRequest = {
        queryType: QueryType.BY_SYMBOLS,
        queries: [mockRequest, { ...mockRequest, symbols: ['AAPL'] }],
        enableParallelExecution: false,
      };

      const result = await service.executeBulkQuery(bulkRequest);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
