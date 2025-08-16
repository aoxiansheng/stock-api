import { Test, TestingModule } from '@nestjs/testing';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/public/smart-cache/services/smart-cache-orchestrator.service';
import { StorageService } from '../../../../../../../src/core/public/storage/services/storage.service';
import { MarketStatusService } from '../../../../../../../src/core/public/shared/services/market-status.service';
import { DataChangeDetectorService } from '../../../../../../../src/core/public/shared/services/data-change-detector.service';
import { BackgroundTaskService } from '../../../../../../../src/core/public/shared/services/background-task.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { CacheService } from '../../../../../../../src/cache/services/cache.service';
import { 
  CacheStrategy, 
  CacheOrchestratorRequest
} from '../../../../../../../src/core/public/smart-cache/interfaces/cache-orchestrator.interface';
import { DEFAULT_SMART_CACHE_CONFIG } from '../../../../../../../src/core/public/smart-cache/interfaces/cache-config.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';

// Mock token for config injection
const SMART_CACHE_ORCHESTRATOR_CONFIG = 'SMART_CACHE_ORCHESTRATOR_CONFIG';

describe('SmartCacheOrchestrator', () => {
  let service: SmartCacheOrchestrator;
  let storageService: jest.Mocked<StorageService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _marketStatusService: jest.Mocked<MarketStatusService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _dataChangeDetectorService: jest.Mocked<DataChangeDetectorService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _backgroundTaskService: jest.Mocked<BackgroundTaskService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _metricsRegistry: jest.Mocked<MetricsRegistryService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _cacheService: jest.Mocked<CacheService>;

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

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
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
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
          useValue: DEFAULT_SMART_CACHE_CONFIG,
        },
      ],
    }).compile();

    service = module.get<SmartCacheOrchestrator>(SmartCacheOrchestrator);
    storageService = module.get(StorageService);
    _marketStatusService = module.get(MarketStatusService);
    _dataChangeDetectorService = module.get(DataChangeDetectorService);
    _backgroundTaskService = module.get(BackgroundTaskService);
    _metricsRegistry = module.get(MetricsRegistryService);
    _cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Strategy Mapping', () => {
    it('should map STRONG_TIMELINESS strategy correctly', () => {
      const options = service.mapStrategyToOptions(CacheStrategy.STRONG_TIMELINESS, ['700.HK']);
      
      expect(options).toEqual({
        symbols: ['700.HK'],
        forceRefresh: false,
        smartCacheStrategy: CacheStrategy.STRONG_TIMELINESS,
        ttl: 60, // From DEFAULT_SMART_CACHE_CONFIG
        enableBackgroundUpdate: true,
        backgroundUpdateThreshold: 0.3,
      });
    });

    it('should map WEAK_TIMELINESS strategy correctly', () => {
      const options = service.mapStrategyToOptions(CacheStrategy.WEAK_TIMELINESS, ['AAPL']);
      
      expect(options).toEqual({
        symbols: ['AAPL'],
        forceRefresh: false,
        smartCacheStrategy: CacheStrategy.WEAK_TIMELINESS,
        ttl: 300, // From DEFAULT_SMART_CACHE_CONFIG
        enableBackgroundUpdate: true,
        backgroundUpdateThreshold: 0.2,
      });
    });

    it('should map MARKET_AWARE strategy correctly', () => {
      const options = service.mapStrategyToOptions(CacheStrategy.MARKET_AWARE, ['600000.SH']);
      
      expect(options).toEqual({
        symbols: ['600000.SH'],
        forceRefresh: false,
        smartCacheStrategy: CacheStrategy.MARKET_AWARE,
        ttl: 30, // openMarketTtl from DEFAULT_SMART_CACHE_CONFIG  
        enableBackgroundUpdate: true,
        backgroundUpdateThreshold: 0.3,
        marketStatusCheckInterval: 300000, // 5 minutes in ms
      });
    });

    it('should map NO_CACHE strategy correctly', () => {
      const options = service.mapStrategyToOptions(CacheStrategy.NO_CACHE, ['000001.SZ']);
      
      expect(options).toEqual({
        symbols: ['000001.SZ'],
        forceRefresh: true,
        smartCacheStrategy: CacheStrategy.NO_CACHE,
        ttl: 0,
        enableBackgroundUpdate: false,
      });
    });

    it('should map ADAPTIVE strategy correctly', () => {
      const options = service.mapStrategyToOptions(CacheStrategy.ADAPTIVE, ['INDEX']);
      
      expect(options).toEqual({
        symbols: ['INDEX'],
        forceRefresh: false,
        smartCacheStrategy: CacheStrategy.ADAPTIVE,
        ttl: 180, // baseTtl from DEFAULT_SMART_CACHE_CONFIG
        enableBackgroundUpdate: true,
        backgroundUpdateThreshold: 0.75,
        adaptationFactor: 1.5,
      });
    });

    it('should throw error for unknown strategy', () => {
      expect(() => {
        service.mapStrategyToOptions('UNKNOWN_STRATEGY' as CacheStrategy, []);
      }).toThrow('Unknown cache strategy: UNKNOWN_STRATEGY');
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
      // Mock cache hit with correct metadata structure
      storageService.getWithSmartCache.mockResolvedValue({
        hit: true,
        data: mockCacheData,
        metadata: {
          key: 'test:cache:key',
          source: 'cache',
          ttlRemaining: 300,
          generatedAt: new Date().toISOString(),
          dynamicTtl: 60,
        },
      });

      const result = await service.getDataWithSmartCache(mockRequest);

      expect(result).toEqual({
        data: mockCacheData,
        hit: true,
        ttlRemaining: 300,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(storageService.getWithSmartCache).toHaveBeenCalledWith(
        'test:cache:key',
        expect.any(Function),
        expect.objectContaining({
          smartCacheStrategy: CacheStrategy.STRONG_TIMELINESS,
          ttl: 60,
          enableBackgroundUpdate: true,
          backgroundUpdateThreshold: 0.3,
        })
      );
    });

    it('should handle cache miss and fetch fresh data', async () => {
      // Mock cache miss
      storageService.getWithSmartCache.mockResolvedValue({
        hit: false,
        data: mockTransformedData,
        metadata: {
          key: 'test:cache:key',
          source: 'fresh',
          ttlRemaining: 0,
          generatedAt: new Date().toISOString(),
          dynamicTtl: 60,
        },
      });

      const result = await service.getDataWithSmartCache(mockRequest);

      expect(result).toEqual({
        data: mockTransformedData,
        hit: false,
        ttlRemaining: 0,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(mockRequest.fetchFn).toHaveBeenCalled();
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
        ttlRemaining: 0,
        strategy: CacheStrategy.NO_CACHE,
        storageKey: 'test:cache:key',
        timestamp: expect.any(String),
      });

      expect(mockRequest.fetchFn).toHaveBeenCalled();
      expect(storageService.getWithSmartCache).not.toHaveBeenCalled();
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

      // Mock cache miss that triggers fetchFn
      storageService.getWithSmartCache.mockRejectedValue(new Error('Cache error'));

      const result = await service.getDataWithSmartCache(failingRequest);

      expect(result).toEqual({
        data: null,
        hit: false,
        ttlRemaining: 0,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'failing:key',
        timestamp: expect.any(String),
        error: 'Fetch failed',
      });
    });

    it('should handle storage service errors gracefully', async () => {
      const mockRequest: CacheOrchestratorRequest<any> = {
        cacheKey: 'storage:error:key',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['700.HK'],
        fetchFn: jest.fn().mockResolvedValue(mockTransformedData),
      };

      // Mock storage error
      storageService.getWithSmartCache.mockRejectedValue(new Error('Storage failed'));

      const result = await service.getDataWithSmartCache(mockRequest);

      // Should fallback to direct fetch
      expect(result.data).toEqual(mockTransformedData);
      expect(result.hit).toBe(false);
      expect(mockRequest.fetchFn).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize correctly on module init', async () => {
      const initSpy = jest.spyOn(service, 'onModuleInit');
      await service.onModuleInit();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should cleanup correctly on module destroy', async () => {
      const destroySpy = jest.spyOn(service, 'onModuleDestroy');
      await service.onModuleDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});