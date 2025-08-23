import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
import { MetricsRegistryService } from '../../../../../../../src/common/infrastructure/monitoring/metrics-registry.service';
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

describe('QueryService', () => {
  let service: QueryService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _storageService: jest.Mocked<StorageService>;
  let receiverService: jest.Mocked<ReceiverService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _dataChangeDetectorService: jest.Mocked<DataChangeDetectorService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _fieldMappingService: jest.Mocked<FieldMappingService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _queryStatisticsService: jest.Mocked<QueryStatisticsService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _queryResultProcessorService: jest.Mocked<QueryResultProcessorService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _backgroundTaskService: jest.Mocked<BackgroundTaskService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _paginationService: jest.Mocked<PaginationService>;
  let presenterRegistryService: jest.Mocked<MetricsRegistryService>;
  let smartCacheOrchestrator: jest.Mocked<SmartCacheOrchestrator>;

  // Mock data
  const mockMarketStatus = {
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
      confidence: 0.9,
    },
    [Market.US]: {
      market: Market.US,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'America/New_York',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
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
    data: mockSymbolData,
    hit: true,
    ttlRemaining: 300,
    strategy: CacheStrategy.WEAK_TIMELINESS,
    storageKey: 'test:cache:key',
    timestamp: new Date().toISOString(),
    metadata: {
      source: 'cache',
    },
  };

  const mockProcessedResult = {
    data: [mockSymbolData],
    metadata: {
      requestId: 'test-123',
      totalSymbols: 1,
      processedSymbols: 1,
      failedSymbols: 0,
      cacheHitRate: 1.0,
      processingTime: 100,
    },
  };

  beforeEach(async () => {
    // Create all mocks
    const mockStorageService = {
      retrieveData: jest.fn(),
      storeData: jest.fn(),
    };

    const mockReceiverService = {
      handleRequest: jest.fn().mockResolvedValue(mockReceiverResponse),
    };

    const mockDataChangeDetectorService = {
      detectSignificantChange: jest.fn(),
    };

    const mockMarketStatusService = {
      getMarketStatus: jest.fn().mockResolvedValue(mockMarketStatus),
      getBatchMarketStatus: jest.fn().mockResolvedValue(mockMarketStatus),
    };

    const mockFieldMappingService = {
      filterToClassification: jest.fn(),
    };

    const mockQueryStatisticsService = {
      recordQueryPerformance: jest.fn(),
      getQueryStats: jest.fn(),
    };

    const mockQueryResultProcessorService = {
      process: jest.fn().mockReturnValue(mockProcessedResult),
    };

    const mockBackgroundTaskService = {
      scheduleTask: jest.fn(),
    };

    const mockPaginationService = {
      paginate: jest.fn(),
    };

    const mockMetricsRegistryService = {
      queryConcurrentRequestsActive: { inc: jest.fn(), dec: jest.fn() },
      queryPipelineDuration: { observe: jest.fn() },
      querySymbolsProcessedTotal: { inc: jest.fn() },
      getMetricValue: jest.fn(),
    };

    const mockSmartCacheOrchestrator = {
      getDataWithSmartCache: jest.fn().mockResolvedValue(mockCacheResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ReceiverService,
          useValue: mockReceiverService,
        },
        {
          provide: DataChangeDetectorService,
          useValue: mockDataChangeDetectorService,
        },
        {
          provide: MarketStatusService,
          useValue: mockMarketStatusService,
        },
        {
          provide: FieldMappingService,
          useValue: mockFieldMappingService,
        },
        {
          provide: QueryStatisticsService,
          useValue: mockQueryStatisticsService,
        },
        {
          provide: QueryResultProcessorService,
          useValue: mockQueryResultProcessorService,
        },
        {
          provide: BackgroundTaskService,
          useValue: mockBackgroundTaskService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistryService,
        },
        {
          provide: SmartCacheOrchestrator,
          useValue: mockSmartCacheOrchestrator,
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    _storageService = module.get(StorageService);
    receiverService = module.get(ReceiverService);
    _dataChangeDetectorService = module.get(DataChangeDetectorService);
    marketStatusService = module.get(MarketStatusService);
    _fieldMappingService = module.get(FieldMappingService);
    _queryStatisticsService = module.get(QueryStatisticsService);
    _queryResultProcessorService = module.get(QueryResultProcessorService);
    _backgroundTaskService = module.get(BackgroundTaskService);
    _paginationService = module.get(PaginationService);
    presenterRegistryService = module.get(MetricsRegistryService);
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
        provider: 'longport',
        requestId: 'test-123',
      },
    });

    cacheUtils.inferMarketFromSymbol.mockImplementation((symbol: string) => {
      if (symbol.includes('.HK')) return Market.HK;
      if (symbol.includes('.SH')) return Market.SH;
      if (symbol.includes('.SZ')) return Market.SZ;
      return Market.US;
    });

    queryUtils.buildStorageKey.mockReturnValue('storage:key:700.HK');
    queryUtils.validateDataFreshness.mockReturnValue(true);
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

  describe('fetchSymbolData', () => {
    const mockRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['700.HK'],
      queryTypeFilter: 'get-stock-quote',
      provider: 'longport',
      options: {
        useCache: true,
      },
    };

    it('should fetch symbol data using smart cache orchestrator', async () => {
      // Call the private method via reflection for testing
      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);
      const result = await fetchSymbolData('700.HK', mockRequest, 'test-123');

      expect(result).toEqual({
        data: mockSymbolData,
        source: DataSourceType.CACHE,
      });

      // Verify smart cache orchestrator was called
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith({
        cacheKey: 'test:cache:key',
        strategy: CacheStrategy.WEAK_TIMELINESS,
        symbols: ['700.HK'],
        fetchFn: expect.any(Function),
        metadata: {
          marketStatus: mockMarketStatus,
          provider: 'longport',
          requestId: 'test-123',
        },
      });

      // Verify market status service was called
      expect(marketStatusService.getMarketStatus).toHaveBeenCalledWith(['700.HK']);
    });

    it('should use NO_CACHE strategy when useCache is false', async () => {
      const noCacheRequest = {
        ...mockRequest,
        options: { useCache: false },
      };

      const { buildCacheOrchestratorRequest } = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
      buildCacheOrchestratorRequest.mockReturnValue({
        cacheKey: 'test:cache:key',
        strategy: CacheStrategy.NO_CACHE,
        symbols: ['700.HK'],
        fetchFn: expect.any(Function),
        metadata: expect.any(Object),
      });

      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);
      await fetchSymbolData('700.HK', noCacheRequest, 'test-123');

      expect(buildCacheOrchestratorRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: CacheStrategy.NO_CACHE,
        })
      );
    });

    it('should handle cache miss and return realtime data', async () => {
      const cacheMissResult = {
        ...mockCacheResult,
        hit: false,
        ttlRemaining: 0,
        metadata: {
          source: 'realtime',
        },
      };
      smartCacheOrchestrator.getDataWithSmartCache.mockResolvedValueOnce(cacheMissResult);

      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);
      const result = await fetchSymbolData('700.HK', mockRequest, 'test-123');

      expect(result).toEqual({
        data: mockSymbolData,
        source: DataSourceType.REALTIME,
      });
    });

    it('should handle smart cache orchestrator errors', async () => {
      smartCacheOrchestrator.getDataWithSmartCache.mockRejectedValueOnce(
        new Error('Cache orchestrator error')
      );

      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);

      await expect(fetchSymbolData('700.HK', mockRequest, 'test-123')).rejects.toThrow(
        'Cache orchestrator error'
      );
    });
  });

  describe('executeOriginalDataFlow', () => {
    const mockRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['700.HK'],
      queryTypeFilter: 'get-stock-quote',
      provider: 'longport',
    };

    it('should execute original data flow successfully', async () => {
      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);
      const result = await executeOriginalDataFlow({}, '700.HK', mockRequest, 'test-123');

      expect(result).toEqual(mockSymbolData);

      // Verify fetchFromRealtime was called internally
      expect(receiverService.handleRequest).toHaveBeenCalled();
    });

    it('should build correct storage key', async () => {
      const { buildStorageKey } = jest.requireMock('../../../../../../../src/core/restapi/query/utils/query.util');
      
      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);
      await executeOriginalDataFlow({}, '700.HK', mockRequest, 'test-123');

      expect(buildStorageKey).toHaveBeenCalledWith(
        '700.HK',
        'longport',
        'get-stock-quote',
        undefined
      );
    });
  });

  describe('convertQueryToReceiverRequest', () => {
    it('should convert query request to receiver request format correctly', () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK', 'AAPL'],
        queryTypeFilter: 'get-stock-quote',
        provider: 'longport',
        market: Market.HK,
        maxAge: 60,
        options: {
          includeFields: ['lastPrice', 'volume'],
        },
      };

      const convertFunction = (service as any).convertQueryToReceiverRequest.bind(service);
      const result = convertFunction(queryRequest, ['700.HK', 'AAPL']);

      expect(result).toEqual({
        symbols: ['700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
        options: {
          preferredProvider: 'longport',
          realtime: true,
          fields: ['lastPrice', 'volume'],
          market: Market.HK,
          timeout: 60000,
          storageMode: 'none',
        },
      });
    });

    it('should use default receiverType when queryTypeFilter is not provided', () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
      };

      const convertFunction = (service as any).convertQueryToReceiverRequest.bind(service);
      const result = convertFunction(queryRequest, ['700.HK']);

      expect(result.receiverType).toBe('get-stock-quote');
    });

    it('should handle missing optional fields', () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
      };

      const convertFunction = (service as any).convertQueryToReceiverRequest.bind(service);
      const result = convertFunction(queryRequest, ['700.HK']);

      expect(result.options.preferredProvider).toBeUndefined();
      expect(result.options.timeout).toBeUndefined();
      expect(result.options.fields).toBeUndefined();
      expect(result.options.market).toBeUndefined();
    });
  });

  describe('fetchFromRealtime', () => {
    const mockRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['700.HK'],
      queryTypeFilter: 'get-stock-quote',
      provider: 'longport',
    };

    it('should fetch realtime data successfully', async () => {
      const fetchFromRealtime = (service as any).fetchFromRealtime.bind(service);
      const result = await fetchFromRealtime('700.HK', 'storage:key', mockRequest, 'test-123');

      expect(result).toEqual({
        data: mockSymbolData,
        metadata: {
          source: DataSourceType.REALTIME,
          timestamp: expect.any(Date),
          storageKey: 'storage:key',
          provider: expect.any(String),
          market: Market.HK,
          cacheTTL: expect.any(Number),
        },
      });

      expect(receiverService.handleRequest).toHaveBeenCalledWith({
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
        options: expect.objectContaining({
          preferredProvider: 'longport',
          realtime: true,
          storageMode: 'none',
        }),
      });
    });

    it('should handle empty receiver response and try fallback', async () => {
      receiverService.handleRequest.mockResolvedValueOnce({
        data: [],
        metadata: new ResponseMetadataDto('longport', 'get-stock-quote', 'test-request-id', 100),
      });

      // Mock the tryGetFromCache method to return fallback data
      const mockFallbackData = {
        data: mockSymbolData,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
      const tryGetFromCacheSpy = jest.spyOn(service as any, 'tryGetFromCache');
      tryGetFromCacheSpy.mockResolvedValue(mockFallbackData);

      const fetchFromRealtime = (service as any).fetchFromRealtime.bind(service);
      const result = await fetchFromRealtime('700.HK', 'storage:key', mockRequest, 'test-123');

      expect(result.data).toEqual(mockSymbolData);
      expect(result.metadata.source).toBe(DataSourceType.REALTIME);
      expect(tryGetFromCacheSpy).toHaveBeenCalledWith(
        '700.HK',
        'storage:key:persistent',
        expect.objectContaining({ maxAge: undefined }),
        'test-123'
      );
    });

    it('should throw NotFoundException when no data available', async () => {
      receiverService.handleRequest.mockResolvedValueOnce({
        data: [],
        metadata: new ResponseMetadataDto('longport', 'get-stock-quote', 'test-request-id', 100),
      });

      const tryGetFromCacheSpy = jest.spyOn(service as any, 'tryGetFromCache');
      tryGetFromCacheSpy.mockResolvedValue(null);

      const fetchFromRealtime = (service as any).fetchFromRealtime.bind(service);

      await expect(
        fetchFromRealtime('700.HK', 'storage:key', mockRequest, 'test-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle receiver service errors', async () => {
      receiverService.handleRequest.mockRejectedValueOnce(new Error('Receiver error'));

      const fetchFromRealtime = (service as any).fetchFromRealtime.bind(service);

      await expect(
        fetchFromRealtime('700.HK', 'storage:key', mockRequest, 'test-123')
      ).rejects.toThrow('Receiver error');
    });
  });

  describe('Helper Methods', () => {
    it('should generate query ID correctly', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
      };

      const generateQueryId = (service as any).generateQueryId.bind(service);
      const queryId = generateQueryId(request);

      expect(queryId).toMatch(/^query_\d{13}_[a-z0-9]{8}$/);
    });

    it('should infer market from symbols correctly', () => {
      const inferMarketFromSymbols = (service as any).inferMarketFromSymbols.bind(service);

      expect(inferMarketFromSymbols(['700.HK', '9988.HK'])).toBe('HK');
      expect(inferMarketFromSymbols(['AAPL', 'TSLA'])).toBe('US');
      expect(inferMarketFromSymbols(['600000.SH'])).toBe('SH');
      expect(inferMarketFromSymbols(['000001.SZ'])).toBe('SZ');
      expect(inferMarketFromSymbols(['700.HK', 'AAPL'])).toBe('MIXED');
      expect(inferMarketFromSymbols([])).toBe('UNKNOWN');
    });

    it('should get symbols count range correctly', () => {
      const getSymbolsCountRange = (service as any).getSymbolsCountRange.bind(service);

      expect(getSymbolsCountRange(1)).toBe('1');
      expect(getSymbolsCountRange(5)).toBe('2-10');
      expect(getSymbolsCountRange(15)).toBe('11-50');
      expect(getSymbolsCountRange(75)).toBe('51-100');
      expect(getSymbolsCountRange(150)).toBe('100+');
    });

    it('should calculate cache TTL by market correctly', async () => {
      const calculateCacheTTLByMarket = (service as any).calculateCacheTTLByMarket.bind(service);
      
      marketStatusService.getMarketStatus.mockResolvedValue({
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
      });

      const ttl = await calculateCacheTTLByMarket(Market.HK, ['700.HK']);
      expect(ttl).toBe(5); // realtime TTL for trading hours
    });
  });

  describe('Error Handling', () => {
    it('should handle market status service errors gracefully', async () => {
      marketStatusService.getMarketStatus.mockRejectedValueOnce(new Error('Market status error'));

      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
        queryTypeFilter: 'get-stock-quote',
        provider: 'longport',
      };

      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);

      await expect(fetchSymbolData('700.HK', mockRequest, 'test-123')).rejects.toThrow(
        'Market status error'
      );
    });

    it('should handle build cache orchestrator request errors', async () => {
      const { buildCacheOrchestratorRequest } = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
      buildCacheOrchestratorRequest.mockImplementation(() => {
        throw new Error('Build cache request error');
      });

      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
        queryTypeFilter: 'get-stock-quote',
        provider: 'longport',
      };

      const fetchSymbolData = (service as any).fetchSymbolData.bind(service);

      await expect(fetchSymbolData('700.HK', mockRequest, 'test-123')).rejects.toThrow(
        'Build cache request error'
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track metrics during query execution', async () => {
      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
        queryTypeFilter: 'get-stock-quote',
        provider: 'longport',
      };

      const executeQuery = (service as any).executeQuery?.bind(service);
      if (executeQuery) {
        await executeQuery(mockRequest);

        expect(presenterRegistryService.queryConcurrentRequestsActive.inc).toHaveBeenCalled();
        expect(presenterRegistryService.queryPipelineDuration.observe).toHaveBeenCalled();
        expect(presenterRegistryService.querySymbolsProcessedTotal.inc).toHaveBeenCalled();
      }
    });
  });
});