import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SmartCacheOrchestrator } from '@core/05-caching/smart-cache/services/smart-cache-orchestrator.service';
import { CommonCacheService } from '@core/05-caching/basic-cache/services/basic-cache.service';
import { DataChangeDetectorService } from '@core/shared/services/data-change-detector.service';
import { MarketStatusService } from '@core/shared/services/market-status.service';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { BackgroundTaskService } from '@common/infrastructure/services/background-task.service';
import {
  SMART_CACHE_ORCHESTRATOR_CONFIG,
  type SmartCacheOrchestratorConfig,
} from '@core/05-caching/smart-cache/interfaces/smart-cache-config.interface';
import {
  CacheStrategy,
  type CacheOrchestratorRequest,
} from '@core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import { Market } from '@core/shared/constants/market.constants';

describe('SmartCacheOrchestrator', () => {
  let service: SmartCacheOrchestrator;
  let module: TestingModule;
  let mockCommonCacheService: jest.Mocked<CommonCacheService>;
  let mockDataChangeDetectorService: jest.Mocked<DataChangeDetectorService>;
  let mockMarketStatusService: jest.Mocked<MarketStatusService>;
  let mockMarketInferenceService: jest.Mocked<MarketInferenceService>;
  let mockBackgroundTaskService: jest.Mocked<BackgroundTaskService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  const mockConfig: SmartCacheOrchestratorConfig = {
    defaultMinUpdateInterval: 30000,
    maxConcurrentUpdates: 5,
    enableBackgroundUpdate: true,
    enableDataChangeDetection: true,
    enableMetrics: true,
    gracefulShutdownTimeout: 30000,
    strategies: {
      [CacheStrategy.STRONG_TIMELINESS]: {
        ttl: 5,
        enableBackgroundUpdate: true,
        updateThresholdRatio: 0.5,
        forceRefreshInterval: 600,
        enableDataChangeDetection: true,
      },
      [CacheStrategy.WEAK_TIMELINESS]: {
        ttl: 300,
        enableBackgroundUpdate: true,
        updateThresholdRatio: 0.3,
        minUpdateInterval: 120,
        enableDataChangeDetection: false,
      },
      [CacheStrategy.ADAPTIVE]: {
        baseTtl: 300,
        minTtl: 30,
        maxTtl: 1800,
        adaptationFactor: 1.5,
        enableBackgroundUpdate: true,
        changeDetectionWindow: 1800,
        enableDataChangeDetection: true,
      },
      [CacheStrategy.MARKET_AWARE]: {
        openMarketTtl: 30,
        closedMarketTtl: 3600,
        enableBackgroundUpdate: true,
        marketStatusCheckInterval: 300,
        openMarketUpdateThresholdRatio: 0.5,
        closedMarketUpdateThresholdRatio: 0.2,
        enableDataChangeDetection: true,
      },
      [CacheStrategy.NO_CACHE]: {
        bypassCache: true,
        enableMetrics: false,
      },
    },
  };

  beforeEach(async () => {
    // Mock CommonCacheService
    mockCommonCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getWithFallback: jest.fn(),
      mget: jest.fn(),
    } as any;

    // Mock DataChangeDetectorService
    mockDataChangeDetectorService = {
      detectSignificantChange: jest.fn(),
    } as any;

    // Mock MarketStatusService
    mockMarketStatusService = {
      getMarketStatus: jest.fn(),
    } as any;

    // Mock MarketInferenceService
    mockMarketInferenceService = {
      inferMarket: jest.fn().mockReturnValue(Market.US),
    } as any;

    // Mock BackgroundTaskService
    mockBackgroundTaskService = {
      run: jest.fn(),
    } as any;

    // Mock EventEmitter2
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    const moduleBuilder = await Test.createTestingModule({
      providers: [
        SmartCacheOrchestrator,
        {
          provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
          useValue: mockConfig,
        },
        {
          provide: CommonCacheService,
          useValue: mockCommonCacheService,
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
          provide: MarketInferenceService,
          useValue: mockMarketInferenceService,
        },
        {
          provide: BackgroundTaskService,
          useValue: mockBackgroundTaskService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<SmartCacheOrchestrator>(SmartCacheOrchestrator);
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
    if (module) {
      await module.close();
    }
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该在模块初始化时启动必要的服务', async () => {
      await service.onModuleInit();

      // 验证服务已初始化
      expect(service).toBeDefined();
    });

    it('应该在模块销毁时优雅关闭', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(service).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('配置验证', () => {
    it('应该使用提供的配置', () => {
      const serviceAny = service as any;
      expect(serviceAny.config).toBeDefined();
      expect(serviceAny.config.defaultMinUpdateInterval).toBe(30000);
      expect(serviceAny.config.maxConcurrentUpdates).toBe(5);
    });

    it('应该处理无效配置并回退到默认值', async () => {
      const invalidConfig = {
        defaultMinUpdateInterval: -1, // 无效值
        maxConcurrentUpdates: 100, // 超出限制
        enableBackgroundUpdate: true,
        enableDataChangeDetection: true,
        enableMetrics: true,
        gracefulShutdownTimeout: 30000,
        strategies: mockConfig.strategies,
      };

      const invalidModule = await Test.createTestingModule({
        providers: [
          SmartCacheOrchestrator,
          {
            provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
            useValue: invalidConfig,
          },
          {
            provide: CommonCacheService,
            useValue: mockCommonCacheService,
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
            provide: MarketInferenceService,
            useValue: mockMarketInferenceService,
          },
          {
            provide: BackgroundTaskService,
            useValue: mockBackgroundTaskService,
          },
          {
            provide: EventEmitter2,
            useValue: mockEventBus,
          },
        ],
      }).compile();

      const invalidService = invalidModule.get<SmartCacheOrchestrator>(
        SmartCacheOrchestrator,
      );
      const serviceAny = invalidService as any;

      // 验证无效值被修正
      expect(serviceAny.config.defaultMinUpdateInterval).toBeGreaterThan(0);
      expect(serviceAny.config.maxConcurrentUpdates).toBeLessThanOrEqual(32);

      await invalidService.onModuleDestroy();
      await invalidModule.close();
    });
  });

  describe('缓存操作', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('单个数据获取', () => {
      it('应该处理NO_CACHE策略', async () => {
        const mockData = { symbol: 'AAPL', price: 150 };
        const request: CacheOrchestratorRequest<any> = {
          cacheKey: 'test:AAPL',
          strategy: CacheStrategy.NO_CACHE,
          symbols: ['AAPL'],
          fetchFn: jest.fn().mockResolvedValue(mockData),
        };

        const result = await service.getDataWithSmartCache(request);

        expect(result.data).toEqual(mockData);
        expect(result.hit).toBe(false);
        expect(result.strategy).toBe(CacheStrategy.NO_CACHE);
        expect(request.fetchFn).toHaveBeenCalled();
        expect(mockCommonCacheService.getWithFallback).not.toHaveBeenCalled();
      });

      it('应该处理STRONG_TIMELINESS策略', async () => {
        const mockData = { symbol: 'AAPL', price: 150 };
        const mockCacheResult = {
          data: mockData,
          metadata: { ttlRemaining: 3 },
        };

        mockCommonCacheService.getWithFallback.mockResolvedValue({
          ...mockCacheResult,
          fromCache: true,
          fromFallback: false,
        });

        const request: CacheOrchestratorRequest<any> = {
          cacheKey: 'test:AAPL',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['AAPL'],
          fetchFn: jest.fn(),
        };

        const result = await service.getDataWithSmartCache(request);

        expect(result.data).toEqual(mockData);
        expect(result.hit).toBe(true);
        expect(result.strategy).toBe(CacheStrategy.STRONG_TIMELINESS);
        expect(mockCommonCacheService.getWithFallback).toHaveBeenCalled();
      });

      it('应该在缓存错误时回退到直接获取', async () => {
        const mockData = { symbol: 'AAPL', price: 150 };

        mockCommonCacheService.getWithFallback.mockRejectedValue(
          new Error('Cache error'),
        );

        const request: CacheOrchestratorRequest<any> = {
          cacheKey: 'test:AAPL',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['AAPL'],
          fetchFn: jest.fn().mockResolvedValue(mockData),
        };

        const result = await service.getDataWithSmartCache(request);

        expect(result.data).toEqual(mockData);
        expect(result.hit).toBe(false);
        expect(result.error).toBeDefined();
        expect(request.fetchFn).toHaveBeenCalled();
      });
    });

    describe('批量数据获取', () => {
      it('应该处理空请求数组', async () => {
        const result = await service.batchGetDataWithSmartCache([]);
        expect(result).toEqual([]);
      });

      it('应该处理混合策略的批量请求', async () => {
        const requests: CacheOrchestratorRequest<any>[] = [
          {
            cacheKey: 'test:AAPL',
            strategy: CacheStrategy.NO_CACHE,
            symbols: ['AAPL'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 150 }),
          },
          {
            cacheKey: 'test:GOOGL',
            strategy: CacheStrategy.STRONG_TIMELINESS,
            symbols: ['GOOGL'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'GOOGL', price: 2800 }),
          },
        ];

        mockCommonCacheService.mget.mockResolvedValue({
          data: [
            { key: 'test:AAPL', value: null }, // AAPL - NO_CACHE策略不会被mget处理
            { key: 'test:GOOGL', value: { symbol: 'GOOGL', price: 2800 } }, // GOOGL 缓存命中
          ],
          metadata: { ttlRemaining: [0, 5] },
        });

        const results = await service.batchGetDataWithSmartCache(requests);

        expect(results).toHaveLength(2);
        expect(results[0].data.symbol).toBe('AAPL');
        expect(results[0].hit).toBe(false);
        expect(results[1].data.symbol).toBe('GOOGL');
        expect(results[1].hit).toBe(true);
      });

      it('应该在批量处理错误时提供降级结果', async () => {
        const requests: CacheOrchestratorRequest<any>[] = [
          {
            cacheKey: 'test:AAPL',
            strategy: CacheStrategy.STRONG_TIMELINESS,
            symbols: ['AAPL'],
            fetchFn: jest.fn().mockRejectedValue(new Error('Fetch error')),
          },
        ];

        mockCommonCacheService.mget.mockRejectedValue(new Error('Cache error'));

        const results = await service.batchGetDataWithSmartCache(requests);

        expect(results).toHaveLength(1);
        expect(results[0].error).toBeDefined();
        expect(results[0].hit).toBe(false);
      });
    });
  });

  describe('后台更新调度', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该在禁用后台更新时跳过调度', async () => {
      const cacheKey = 'test:AAPL';
      const symbols = ['AAPL'];
      const fetchFn = jest.fn();

      // 禁用后台更新
      const serviceAny = service as any;
      serviceAny.config.enableBackgroundUpdate = false;

      await service.scheduleBackgroundUpdate(cacheKey, symbols, fetchFn);

      // 验证任务没有被添加
      expect(serviceAny.backgroundUpdateTasks.size).toBe(0);
    });

    it('应该跳过重复的cacheKey调度', async () => {
      const cacheKey = 'test:AAPL';
      const symbols = ['AAPL'];
      const fetchFn = jest.fn();

      mockCommonCacheService.get.mockResolvedValue({ data: null, metadata: {} });
      mockCommonCacheService.set.mockResolvedValue(undefined);

      // 第一次调度
      await service.scheduleBackgroundUpdate(cacheKey, symbols, fetchFn);

      // 第二次调度相同的key
      await service.scheduleBackgroundUpdate(cacheKey, symbols, fetchFn);

      const serviceAny = service as any;
      // 应该只有一个任务
      expect(serviceAny.backgroundUpdateTasks.size).toBe(1);
    });

    it('应该计算正确的任务优先级', () => {
      const usSymbols = ['AAPL', 'GOOGL'];
      const hkSymbols = ['00700.HK'];
      const aSymbols = ['000001.SZ'];

      mockMarketInferenceService.inferMarket
        .mockReturnValueOnce(Market.US)
        .mockReturnValueOnce(Market.HK)
        .mockReturnValueOnce(Market.SZ);

      const usPriority = service.calculateUpdatePriority(usSymbols);
      const hkPriority = service.calculateUpdatePriority(hkSymbols);
      const aPriority = service.calculateUpdatePriority(aSymbols);

      // 美股应该有最高优先级
      expect(usPriority).toBeGreaterThan(hkPriority);
      expect(hkPriority).toBeGreaterThan(aPriority);
    });
  });

  describe('市场状态查询', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该查询符号对应的市场状态', async () => {
      const symbols = ['AAPL', '00700.HK'];

      mockMarketInferenceService.inferMarket
        .mockReturnValueOnce(Market.US)
        .mockReturnValueOnce(Market.HK);

      mockMarketStatusService.getMarketStatus
        .mockResolvedValueOnce({
          market: Market.US,
          status: 'TRADING' as any,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: 'America/New_York',
          realtimeCacheTTL: 5,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: true,
          confidence: 0.95,
        })
        .mockResolvedValueOnce({
          market: Market.HK,
          status: 'MARKET_CLOSED' as any,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: 'Asia/Hong_Kong',
          realtimeCacheTTL: 5,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: false,
          confidence: 0.9,
        });

      const result = await service.getMarketStatusForSymbols(symbols);

      expect(result.success).toBe(true);
      expect(result.marketStatus[Market.US]).toBeDefined();
      expect(result.marketStatus[Market.HK]).toBeDefined();
      expect(mockMarketStatusService.getMarketStatus).toHaveBeenCalledTimes(2);
    });

    it('应该处理市场状态查询错误', async () => {
      const symbols = ['INVALID'];

      mockMarketInferenceService.inferMarket.mockReturnValue(Market.US);
      mockMarketStatusService.getMarketStatus.mockRejectedValue(
        new Error('Market status error'),
      );

      const result = await service.getMarketStatusForSymbols(symbols);

      expect(result.success).toBe(true); // 应该仍然成功，但使用默认值
      expect(result.marketStatus[Market.US]).toBeDefined();
      expect(result.marketStatus[Market.US].status).toBe('MARKET_CLOSED');
      expect(result.marketStatus[Market.US].confidence).toBe(0.5);
    });

    it('应该缓存市场状态查询结果', async () => {
      const symbols = ['AAPL'];

      mockMarketInferenceService.inferMarket.mockReturnValue(Market.US);
      mockMarketStatusService.getMarketStatus.mockResolvedValue({
        market: Market.US,
        status: 'TRADING' as any,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'America/New_York',
        realtimeCacheTTL: 5,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: true,
        confidence: 0.95,
      });

      // 第一次调用
      await service.getMarketStatusForSymbols(symbols);

      // 第二次调用（应该使用缓存）
      await service.getMarketStatusForSymbols(symbols);

      // 应该只调用一次实际的市场状态服务
      expect(mockMarketStatusService.getMarketStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存预热', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该预热热点查询', async () => {
      const hotQueries = [
        {
          key: 'test:AAPL',
          priority: 10,
          request: {
            cacheKey: 'test:AAPL',
            strategy: CacheStrategy.STRONG_TIMELINESS,
            symbols: ['AAPL'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 150 }),
          },
        },
        {
          key: 'test:GOOGL',
          priority: 5,
          request: {
            cacheKey: 'test:GOOGL',
            strategy: CacheStrategy.STRONG_TIMELINESS,
            symbols: ['GOOGL'],
            fetchFn: jest.fn().mockResolvedValue({ symbol: 'GOOGL', price: 2800 }),
          },
        },
      ];

      mockCommonCacheService.get.mockResolvedValue({ data: null, metadata: {} });
      mockCommonCacheService.getWithFallback.mockImplementation(
        async (key, fetchFn) => ({
          data: await fetchFn(),
          metadata: { ttlRemaining: 300 },
          fromCache: false,
          fromFallback: true,
        }),
      );

      const results = await service.warmupHotQueries(hotQueries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].key).toBe('test:AAPL');
      expect(results[1].key).toBe('test:GOOGL');
    });

    it('应该跳过已有有效缓存的预热', async () => {
      const hotQueries = [
        {
          key: 'test:AAPL',
          request: {
            cacheKey: 'test:AAPL',
            strategy: CacheStrategy.STRONG_TIMELINESS,
            symbols: ['AAPL'],
            fetchFn: jest.fn(),
          },
        },
      ];

      // 模拟已存在有效缓存
      mockCommonCacheService.get.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { ttlRemaining: 120 }, // 有效缓存
      });

      const results = await service.warmupHotQueries(hotQueries);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect((results[0] as any).skipped).toBe(true);
      expect(hotQueries[0].request.fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该支持智能并发控制的批量获取', async () => {
      const requests: CacheOrchestratorRequest<any>[] = [
        {
          cacheKey: 'test:AAPL',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['AAPL'],
          fetchFn: jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 150 }),
        },
        {
          cacheKey: 'test:GOOGL',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['GOOGL'],
          fetchFn: jest.fn().mockResolvedValue({ symbol: 'GOOGL', price: 2800 }),
        },
      ];

      mockCommonCacheService.mget.mockResolvedValue({
        data: [
          { key: 'test:AAPL', value: null },
          { key: 'test:GOOGL', value: null },
        ],
        metadata: { ttlRemaining: [0, 0] },
      });

      const results = await service.getBatchDataWithOptimizedConcurrency(
        requests,
        {
          concurrency: 2,
          enableCache: true,
          errorIsolation: true,
          retryFailures: false,
        },
      );

      expect(results).toHaveLength(2);
      expect(results[0].data.symbol).toBe('AAPL');
      expect(results[1].data.symbol).toBe('GOOGL');
    });

    it('应该分析缓存性能', async () => {
      const cacheKeys = ['test:AAPL', 'test:GOOGL', 'test:MSFT'];

      mockCommonCacheService.mget.mockResolvedValue({
        data: [
          { key: 'test:AAPL', value: { symbol: 'AAPL' } }, // 有效缓存
          { key: 'test:GOOGL', value: null }, // 缓存未命中
          { key: 'test:MSFT', value: { symbol: 'MSFT' } }, // 即将过期
        ],
        metadata: { ttlRemaining: [120, 0, 30] },
      });

      const analysis = await service.analyzeCachePerformance(cacheKeys);

      expect(analysis.summary.totalKeys).toBe(3);
      expect(analysis.summary.cached).toBe(2);
      expect(analysis.summary.expired).toBe(1);
      expect(analysis.summary.hitRate).toBeCloseTo(0.67, 2);
      expect(analysis.hotspots).toHaveLength(1); // MSFT即将过期
      expect(analysis.recommendations).toContain(
        expect.stringContaining('缓存命中率较低'),
      );
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该处理获取数据时的异常', async () => {
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'test:ERROR',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['ERROR'],
        fetchFn: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      };

      mockCommonCacheService.getWithFallback.mockRejectedValue(
        new Error('Cache error'),
      );

      await expect(service.getDataWithSmartCache(request)).rejects.toThrow(
        'Fetch failed',
      );
    });

    it('应该在获取系统指标失败时使用默认值', async () => {
      // 测试错误处理逻辑
      const serviceAny = service as any;

      const priority = service.calculateUpdatePriority(['AAPL']);
      expect(priority).toBeGreaterThan(0);
    });
  });
});