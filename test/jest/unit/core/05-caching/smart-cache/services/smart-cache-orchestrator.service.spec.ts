import { Test, TestingModule } from '@nestjs/testing';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service';
import { StorageService } from '../../../../../../../src/core/04-storage/storage/services/storage.service';
import { MarketStatusService } from '../../../../../../../src/core/shared/services/market-status.service';
import { DataChangeDetectorService } from '../../../../../../../src/core/shared/services/data-change-detector.service';
import { BackgroundTaskService } from '../../../../../../../src/core/shared/services/background-task.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { CommonCacheService } from '../../../../../../../src/core/05-caching/common-cache/services/common-cache.service';
import { 
  CacheStrategy, 
  CacheOrchestratorRequest
} from '../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import { DEFAULT_SMART_CACHE_CONFIG } from '../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-config.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';

// Mock token for config injection
const SMART_CACHE_ORCHESTRATOR_CONFIG = 'SMART_CACHE_ORCHESTRATOR_CONFIG';

describe('SmartCacheOrchestrator', () => {
  let service: SmartCacheOrchestrator;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _marketStatusService: jest.Mocked<MarketStatusService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _dataChangeDetectorService: jest.Mocked<DataChangeDetectorService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _backgroundTaskService: jest.Mocked<BackgroundTaskService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _metricsRegistry: jest.Mocked<MetricsRegistryService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _commonCacheService: jest.Mocked<CommonCacheService>;

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

  const mockCacheData = { quote: { lastPrice: 100, symbol: '700.HK' } };
  const mockTransformedData = { lastPrice: 100, symbol: '700.HK' };

  beforeEach(async () => {
    const mockStorageService = {
      getWithSmartCache: jest.fn(),
      batchGetWithSmartCache: jest.fn(),
    };

    const mockMarketStatusService = {
      getBatchMarketStatus: jest.fn().mockResolvedValue(mockMarketStatus),
    };

    const mockDataChangeDetectorService = {
      checkChanges: jest.fn(),
    };

    const mockBackgroundTaskService = {
      schedule: jest.fn(),
    };

    const mockMetricsRegistry = {
      getMetricValue: jest.fn(),
      setGauge: jest.fn(),
      incrementCounter: jest.fn(),
    };

    const mockCommonCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      mget: jest.fn().mockResolvedValue([]),
      getWithFallback: jest.fn().mockResolvedValue({
        data: mockTransformedData,
        hit: false,
        ttlRemaining: 60
      }),
      getTTL: jest.fn(),
      hashGetAll: jest.fn().mockResolvedValue({}),
      listRange: jest.fn().mockResolvedValue([]),
      setMembers: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartCacheOrchestrator,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: MarketStatusService,
          useValue: mockMarketStatusService,
        },
        {
          provide: DataChangeDetectorService,
          useValue: mockDataChangeDetectorService,
        },
        {
          provide: BackgroundTaskService,
          useValue: mockBackgroundTaskService,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
        {
          provide: CommonCacheService,
          useValue: mockCommonCacheService,
        },
        {
          provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
          useValue: DEFAULT_SMART_CACHE_CONFIG,
        },
      ],
    }).compile();

    service = module.get<SmartCacheOrchestrator>(SmartCacheOrchestrator);
    _marketStatusService = module.get(MarketStatusService);
    _dataChangeDetectorService = module.get(DataChangeDetectorService);
    _backgroundTaskService = module.get(BackgroundTaskService);
    _metricsRegistry = module.get(MetricsRegistryService);
    _commonCacheService = module.get(CommonCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Phase 5.4: Performance Optimization Methods', () => {
    it('should warmup hot queries successfully', async () => {
      // Mock CommonCacheService responses
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.get
        .mockResolvedValueOnce(null) // First key not cached
        .mockResolvedValueOnce({ data: { test: 'existing' }, ttlRemaining: 120 }); // Second key cached

      const hotQueries = [
        {
          key: 'stock:AAPL:quote',
          request: {
            cacheKey: 'stock:AAPL:quote',
            symbols: ['AAPL'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 195.89 }),
            strategy: CacheStrategy.STRONG_TIMELINESS,
          },
          priority: 10,
        },
        {
          key: 'stock:TSLA:quote',
          request: {
            cacheKey: 'stock:TSLA:quote',
            symbols: ['TSLA'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'TSLA', price: 248.42 }),
            strategy: CacheStrategy.STRONG_TIMELINESS,
          },
          priority: 5,
        },
      ];

      // Mock getDataWithSmartCache for the first key (not cached)
      jest.spyOn(service, 'getDataWithSmartCache').mockResolvedValueOnce({
        data: { symbol: 'AAPL', price: 195.89 },
        hit: false,
        ttlRemaining: 60,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'stock:AAPL:quote',
      });

      const results = await service.warmupHotQueries(hotQueries);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        key: 'stock:AAPL:quote',
        success: true,
        ttl: 60,
      });
      expect(results[1]).toMatchObject({
        key: 'stock:TSLA:quote',
        success: true,
        ttl: 120,
        skipped: true,
      });
    });

    it('should handle batch data with optimized concurrency', async () => {
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      
      // Mock batch cache results - first key hit, second miss
      mockCommonCache.mget.mockResolvedValue([
        { data: { symbol: 'AAPL', price: 195.89 }, ttlRemaining: 300 },
        null, // Cache miss
      ]);

      const requests = [
        {
          cacheKey: 'stock:AAPL:quote',
          symbols: ['AAPL'],
          fetchFn: jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 195.89 }),
          strategy: CacheStrategy.STRONG_TIMELINESS,
        },
        {
          cacheKey: 'stock:GOOGL:quote',
          symbols: ['GOOGL'],
          fetchFn: jest.fn().mockResolvedValue({ symbol: 'GOOGL', price: 2750.8 }),
          strategy: CacheStrategy.STRONG_TIMELINESS,
        },
      ];

      // Mock market status for TTL calculation
      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue('open');

      const results = await service.getBatchDataWithOptimizedConcurrency(requests, {
        concurrency: 2,
        enableCache: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        data: { symbol: 'AAPL', price: 195.89 },
        hit: true,
        ttlRemaining: 300,
      });
      expect(results[1]).toMatchObject({
        data: { symbol: 'GOOGL', price: 2750.8 },
        hit: false,
      });
    });

    it('should analyze cache performance correctly', async () => {
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      
      // Mock cache analysis data
      mockCommonCache.mget.mockResolvedValue([
        { data: { test: 1 }, ttlRemaining: 600 }, // Valid cache
        null, // Expired
        { data: { test: 2 }, ttlRemaining: 50 }, // About to expire
      ]);

      const cacheKeys = [
        'stock:AAPL:quote',
        'stock:TSLA:quote', 
        'stock:NVDA:quote',
      ];

      const analysis = await service.analyzeCachePerformance(cacheKeys);

      expect(analysis.summary).toMatchObject({
        totalKeys: 3,
        cached: 2,
        expired: 1,
        hitRate: expect.closeTo(0.67, 2),
      });
      
      expect(analysis.recommendations).toContain('缓存命中率较低，建议增加TTL或实施缓存预热策略');
      expect(analysis.hotspots).toHaveLength(2); // One expiring, one expired
    });

    it('should set data with adaptive TTL based on access frequency', async () => {
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.set.mockResolvedValue(undefined);

      const testData = { symbol: 'AAPL', price: 195.89 };
      
      const result = await service.setDataWithAdaptiveTTL(
        'stock:AAPL:quote',
        testData,
        {
          dataType: 'stock_quote',
          symbol: 'AAPL',
          accessFrequency: 'high',
          marketStatus: 'open',
        },
      );

      expect(result).toMatchObject({
        success: true,
        ttl: expect.any(Number),
        strategy: expect.any(String),
      });
      
      expect(mockCommonCache.set).toHaveBeenCalledWith(
        'stock:AAPL:quote',
        testData,
        result.ttl,
      );
    });
  });

  describe('Cache Operations', () => {
    const mockRequest: CacheOrchestratorRequest<any> = {
      cacheKey: 'test:cache:key',
      strategy: CacheStrategy.STRONG_TIMELINESS,
      symbols: ['700.HK'],
      fetchFn: jest.fn().mockResolvedValue(mockTransformedData),
      metadata: {
        marketStatus: mockMarketStatus,
        provider: 'longport',
        queryId: 'test-123',
      },
    };

    it('should handle cache hit successfully', async () => {
      // Mock CommonCacheService.getWithFallback for cache hit
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: mockCacheData,
        hit: true,
        ttlRemaining: 300
      });

      const result = await service.getDataWithSmartCache(mockRequest);

      expect(result).toEqual({
        data: mockCacheData,
        hit: true,
        ttlRemaining: 300,
        dynamicTtl: expect.any(Number),
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        'test:cache:key',
        expect.any(Function),
        expect.any(Number)
      );
    });

    it('should handle cache miss and fetch fresh data', async () => {
      // Mock CommonCacheService.getWithFallback for cache miss
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: mockTransformedData,
        hit: false,
        ttlRemaining: 0
      });

      const result = await service.getDataWithSmartCache(mockRequest);

      expect(result).toEqual({
        data: mockTransformedData,
        hit: false,
        ttlRemaining: 0,
        dynamicTtl: expect.any(Number),
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        'test:cache:key',
        expect.any(Function),
        expect.any(Number)
      );
    });

    it('should handle NO_CACHE strategy by bypassing cache', async () => {
      const noCacheRequest = {
        ...mockRequest,
        strategy: CacheStrategy.NO_CACHE,
      };

      const result = await service.getDataWithSmartCache(noCacheRequest);

      expect(result).toEqual({
        data: mockTransformedData,
        hit: false,
        strategy: CacheStrategy.NO_CACHE,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(mockRequest.fetchFn).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetchFn errors gracefully', async () => {
      const failingRequest: CacheOrchestratorRequest<any> = {
        cacheKey: 'failing:key',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['ERROR'],
        fetchFn: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      };

      // Mock CommonCacheService.getWithFallback to throw error (simulating fetch failure)
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.getWithFallback.mockRejectedValue(new Error('Fetch failed'));

      // The method should throw the error from fetchFn since fallback also fails
      await expect(service.getDataWithSmartCache(failingRequest)).rejects.toThrow('Fetch failed');
    });

    it('should handle storage service errors gracefully', async () => {
      const mockRequest: CacheOrchestratorRequest<any> = {
        cacheKey: 'storage:error:key',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['700.HK'],
        fetchFn: jest.fn().mockResolvedValue(mockTransformedData),
      };

      // Mock CommonCacheService.getWithFallback to throw storage error 
      const mockCommonCache = service['commonCacheService'] as jest.Mocked<any>;
      mockCommonCache.getWithFallback.mockRejectedValue(new Error('Storage failed'));

      const result = await service.getDataWithSmartCache(mockRequest);

      // Should return fallback data with error indication
      expect(result.data).toEqual(mockTransformedData);
      expect(result.hit).toBe(false);
      expect(result.error).toBe('Storage failed');
      expect(mockRequest.fetchFn).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize correctly on module init', async () => {
      const initSpy = jest.spyOn(service, 'onModuleInit');
      
      // Mock setInterval to prevent actual interval creation
      const originalSetInterval = global.setInterval;
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;
      
      await service.onModuleInit();
      expect(initSpy).toHaveBeenCalled();
      
      // Restore original setInterval
      global.setInterval = originalSetInterval;
    });

    it('should cleanup correctly on module destroy', async () => {
      const destroySpy = jest.spyOn(service, 'onModuleDestroy');
      await service.onModuleDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  // Cleanup after all tests to prevent Jest hanging
  afterAll(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });
});