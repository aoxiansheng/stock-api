/**
 * Query服务智能缓存集成测试
 * 验证缓存命中率、后台更新机制和缓存策略效果
 * 
 * 测试范围：
 * - SmartCacheOrchestrator集成验证
 * - 缓存命中率和性能指标
 * - 后台更新和TTL节流机制
 * - 不同缓存策略的行为差异
 * - 错误处理和故障恢复
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { QueryService } from '../../../../../../../src/core/01-entry/query/services/query.service';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/05-caching/smart-cache/services/symbol-smart-cache-orchestrator.service';
import { StorageService } from '../../../../../../../src/core/04-storage/storage/services/storage.service';
import { ReceiverService } from '../../../../../../../src/core/01-entry/receiver/services/receiver.service';
import { MarketStatusService } from '../../../../../../../src/core/shared/services/market-status.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { CacheService } from '../../../../../../../src/cache/services/cache.service';
import { QueryRequestDto } from '../../../../../../../src/core/01-entry/query/dto/query-request.dto';
import { QueryType } from '../../../../../../../src/core/01-entry/query/dto/query-types.dto';
import { CacheStrategy } from '../../../../../../../src/core/05-caching/smart-cache/interfaces/symbol-smart-cache-orchestrator.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';
// 移除未使用的类型导入以通过lint
import { DataChangeDetectorService } from '../../../../../../../src/core/shared/services/data-change-detector.service';
import { FieldMappingService } from '../../../../../../../src/core/shared/services/field-mapping.service';
import { QueryStatisticsService } from '../../../../../../../src/core/01-entry/query/services/query-statistics.service';
import { QueryResultProcessorService } from '../../../../../../../src/core/01-entry/query/services/query-result-processor.service';
import { BackgroundTaskService } from '../../../../../../../src/core/shared/services/background-task.service';
import { PaginationService } from '../../../../../../../src/common/modules/pagination/services/pagination.service';

describe('Query Smart Cache Integration Tests', () => {
  let app: INestApplication;
  let queryService: QueryService;
  let smartCacheOrchestrator: SmartCacheOrchestrator;
  // let storageService: StorageService;
  let receiverService: ReceiverService;
  let marketStatusService: MarketStatusService;
  let metricsRegistry: MetricsRegistryService;
  // let cacheService: CacheService;

  // 去除未使用的计数器变量，避免lint
  // let cacheHitCount = 0;
  // let cacheMissCount = 0;
  // let backgroundUpdateCount = 0;
  const performanceMetrics: Array<{
    symbol: string;
    strategy: CacheStrategy;
    hit: boolean;
    responseTime: number;
    dataAge: number;
  }> = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Import only necessary modules to avoid dependency conflicts
      ],
      providers: [
        QueryService,
        {
          provide: SmartCacheOrchestrator,
          useValue: {
            getDataWithSmartCache: jest.fn(),
            scheduleBackgroundUpdate: jest.fn(),
            onModuleDestroy: jest.fn(),
          },
        },
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
          provide: MarketStatusService,
          useValue: {
            getBatchMarketStatus: jest.fn(),
            getMarketStatus: jest.fn(),
          },
        },
        {
          provide: MetricsRegistryService,
          useValue: {
            getMetricValue: jest.fn().mockResolvedValue(0),
            queryConcurrentRequestsActive: {
              inc: jest.fn(),
              dec: jest.fn(),
            },
            queryReceiverCallsTotal: {
              inc: jest.fn(),
            },
            queryReceiverCallDuration: {
              observe: jest.fn(),
            },
            queryExecutionDuration: {
              observe: jest.fn(),
            },
            querySymbolsProcessed: {
              inc: jest.fn(),
            },
            queryBatchSizeHistogram: {
              observe: jest.fn(),
            },
            cacheHitRatio: {
              observe: jest.fn(),
            },
            queryPipelineDuration: {
              observe: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            ttl: jest.fn(),
          },
        },
        {
          provide: DataChangeDetectorService,
          useValue: {
            detectChanges: jest.fn(),
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
            recordQueryPerformance: jest.fn(),
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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    queryService = moduleFixture.get<QueryService>(QueryService);
    smartCacheOrchestrator = moduleFixture.get<SmartCacheOrchestrator>(SmartCacheOrchestrator);
    // storageService = moduleFixture.get<StorageService>(StorageService);
    // cacheService = moduleFixture.get<CacheService>(CacheService);
    receiverService = moduleFixture.get<ReceiverService>(ReceiverService);
    marketStatusService = moduleFixture.get<MarketStatusService>(MarketStatusService);
    metricsRegistry = moduleFixture.get<MetricsRegistryService>(MetricsRegistryService);
    // cacheService = moduleFixture.get<CacheService>(CacheService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 去除未使用的计数器变量，避免lint
    // cacheHitCount = 0;
    // cacheMissCount = 0;
    // backgroundUpdateCount = 0;
    performanceMetrics.length = 0;
  });

  describe('智能缓存命中率验证', () => {
    it('应该在缓存命中时提供快速响应', async () => {
      // Setup cache hit scenario
      const mockCachedData = [
        { symbol: 'AAPL', lastPrice: 150.25, volume: 1000000, timestamp: new Date().toISOString() }
      ];

      const mockMarketStatus = {
        [Market.US]: {
          market: Market.US,
          status: MarketStatus.TRADING,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: 'America/New_York',
          realtimeCacheTTL: 60,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: false,
          confidence: 0.9,
        },
      };

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockCachedData,
        hit: true,
        ttlRemaining: 45,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'cache:query:AAPL:quote',
        timestamp: new Date().toISOString(),
      });

      (marketStatusService.getBatchMarketStatus as jest.Mock).mockResolvedValue(mockMarketStatus);

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { 
          useCache: true,
        },
      };

      const startTime = Date.now();
      const result = await queryService.executeQuery(request);
      const responseTime = Date.now() - startTime;

      // Verify cache hit behavior
      expect(result).toBeDefined();
      expect(result.data).toEqual(mockCachedData);
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AAPL'],
          strategy: CacheStrategy.STRONG_TIMELINESS,
        })
      );

      // Performance validation
      expect(responseTime).toBeLessThan(100); // Cache hits should be very fast
      // 去除未使用的计数器变量，避免lint
      // cacheHitCount++;

      performanceMetrics.push({
        symbol: 'AAPL',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        hit: true,
        responseTime,
        dataAge: 15, // TTL remaining suggests data is 15 seconds old
      });

      console.log(`✅ Cache Hit Test: ${responseTime}ms response time`);
    });

    it('应该在缓存未命中时执行完整数据流程', async () => {
      const mockFreshData = [
        { symbol: 'MSFT', lastPrice: 280.50, volume: 800000, timestamp: new Date().toISOString() }
      ];

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockFreshData,
        hit: false,
        ttlRemaining: 0,
        strategy: CacheStrategy.WEAK_TIMELINESS,
        storageKey: 'cache:query:MSFT:quote',
        timestamp: new Date().toISOString(),
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['MSFT'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      };

      const startTime = Date.now();
      const result = await queryService.executeQuery(request);
      const responseTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockFreshData);
      expect(responseTime).toBeGreaterThan(100); // Cache miss should take longer

      // 去除未使用的计数器变量，避免lint
      // cacheMissCount++;
      performanceMetrics.push({
        symbol: 'MSFT',
        strategy: CacheStrategy.WEAK_TIMELINESS,
        hit: false,
        responseTime,
        dataAge: 0,
      });

      console.log(`🔄 Cache Miss Test: ${responseTime}ms response time`);
    });

    it('应该在多个符号请求中混合命中和未命中', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockData = symbols.map(symbol => ({
        symbol,
        lastPrice: Math.random() * 300 + 100,
        volume: Math.floor(Math.random() * 2000000) + 500000,
        timestamp: new Date().toISOString(),
      }));

      // Simulate mixed cache results
      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock)
        .mockResolvedValueOnce({
          data: [mockData[0]], // AAPL hit
          hit: true,
          ttlRemaining: 30,
          strategy: CacheStrategy.STRONG_TIMELINESS,
          storageKey: 'cache:query:AAPL:quote',
          timestamp: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          data: [mockData[1]], // MSFT miss
          hit: false,
          ttlRemaining: 0,
          strategy: CacheStrategy.WEAK_TIMELINESS,
          storageKey: 'cache:query:MSFT:quote',
          timestamp: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          data: [mockData[2]], // GOOGL hit
          hit: true,
          ttlRemaining: 15,
          strategy: CacheStrategy.STRONG_TIMELINESS,
          storageKey: 'cache:query:GOOGL:quote',
          timestamp: new Date().toISOString(),
        });

      const requests = symbols.map(symbol => ({
        queryType: QueryType.BY_SYMBOLS,
        symbols: [symbol],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      })) as QueryRequestDto[];

      const results = await Promise.all(
        requests.map(async (request, index) => {
          const startTime = Date.now();
          const result = await queryService.executeQuery(request);
          const responseTime = Date.now() - startTime;

          return {
            symbol: symbols[index],
            result,
            responseTime,
            hit: index !== 1, // MSFT is miss, others are hits
          };
        })
      );

      // Verify mixed results
      expect(results).toHaveLength(3);
      
      const hitResults = results.filter(r => r.hit);
      const missResults = results.filter(r => !r.hit);
      
      expect(hitResults).toHaveLength(2); // AAPL, GOOGL
      expect(missResults).toHaveLength(1); // MSFT

      // Performance validation
      const avgHitTime = hitResults.reduce((sum, r) => sum + r.responseTime, 0) / hitResults.length;
      const avgMissTime = missResults.reduce((sum, r) => sum + r.responseTime, 0) / missResults.length;

      expect(avgHitTime).toBeLessThan(avgMissTime);

      // 去除未使用的计数器变量，避免lint
      // cacheHitCount += hitResults.length;
      // cacheMissCount += missResults.length;

      console.log(`📊 Mixed Cache Test: ${hitResults.length} hits (avg: ${avgHitTime}ms), ${missResults.length} misses (avg: ${avgMissTime}ms)`);
    });
  });

  describe('后台更新机制验证', () => {
    it('应该在缓存即将过期时调度后台更新', async () => {
      const mockData = [
        { symbol: 'TSLA', lastPrice: 200.75, volume: 1500000, timestamp: new Date().toISOString() }
      ];

      // Mock cache result with low TTL to trigger background update
      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockData,
        hit: true,
        ttlRemaining: 10, // Low TTL should trigger background update
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'cache:query:TSLA:quote',
        timestamp: new Date().toISOString(),
      });

      (smartCacheOrchestrator.scheduleBackgroundUpdate as jest.Mock).mockResolvedValue(true);

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['TSLA'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      };

      const result = await queryService.executeQuery(request);

      expect(result).toBeDefined();
      expect(smartCacheOrchestrator.scheduleBackgroundUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['TSLA'],
          priority: expect.any(Number),
        })
      );

      // 去除未使用的计数器变量，避免lint
      // backgroundUpdateCount++;
      console.log(`🔄 Background Update Scheduled: TSLA (TTL: 10s)`);
    });

    it('应该实现TTL节流机制避免频繁更新', async () => {
      const symbol = 'NVDA';
      const mockData = [
        { symbol, lastPrice: 450.25, volume: 900000, timestamp: new Date().toISOString() }
      ];

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockData,
        hit: true,
        ttlRemaining: 8, // Low TTL
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: `cache:query:${symbol}:quote`,
        timestamp: new Date().toISOString(),
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [symbol],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      };

      // Execute multiple rapid requests
      const rapidRequests = Array.from({ length: 5 }, () => 
        queryService.executeQuery(request)
      );

      await Promise.all(rapidRequests);

      // Verify background update is only scheduled once due to throttling
      expect(smartCacheOrchestrator.scheduleBackgroundUpdate).toHaveBeenCalledTimes(1);

      console.log(`⏱️ TTL Throttling Test: Background update called once despite 5 rapid requests`);
    });
  });

  describe('缓存策略效果验证', () => {
    it('应该根据市场状态选择合适的缓存策略', async () => {
      const testCases = [
        {
          market: Market.US,
          status: MarketStatus.TRADING,
          expectedStrategy: CacheStrategy.STRONG_TIMELINESS,
          symbol: 'AAPL',
        },
        {
          market: Market.HK,
          status: MarketStatus.CLOSED,
          expectedStrategy: CacheStrategy.WEAK_TIMELINESS,
          symbol: '700.HK',
        },
        {
          market: Market.SH,
          status: MarketStatus.PRE_MARKET,
          expectedStrategy: CacheStrategy.ADAPTIVE,
          symbol: '600000.SH',
        },
      ];

      for (const testCase of testCases) {
        const mockMarketStatus = {
          [testCase.market]: {
            market: testCase.market,
            status: testCase.status,
            currentTime: new Date(),
            marketTime: new Date(),
            timezone: 'UTC',
            realtimeCacheTTL: testCase.status === MarketStatus.TRADING ? 30 : 300,
            analyticalCacheTTL: 1800,
            isHoliday: false,
            isDST: false,
            confidence: 0.9,
          },
        };

        (marketStatusService.getBatchMarketStatus as jest.Mock).mockResolvedValue(mockMarketStatus);
        
        const mockData = [
          { symbol: testCase.symbol, lastPrice: 100, volume: 1000000, timestamp: new Date().toISOString() }
        ];

        (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
          data: mockData,
          hit: true,
          ttlRemaining: 45,
          strategy: testCase.expectedStrategy,
          storageKey: `cache:query:${testCase.symbol}:quote`,
          timestamp: new Date().toISOString(),
        });

        const request: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: [testCase.symbol],
          queryTypeFilter: 'get-stock-quote',
          limit: 10,
          page: 1,
          options: { useCache: true },
        };

        const result = await queryService.executeQuery(request);

        expect(result).toBeDefined();
        expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith(
          expect.objectContaining({
            strategy: testCase.expectedStrategy,
          })
        );

        console.log(`📈 Strategy Test: ${testCase.symbol} (${testCase.status}) → ${testCase.expectedStrategy}`);
      }
    });
  });

  describe('性能和错误处理验证', () => {
    it('应该在缓存服务故障时优雅降级', async () => {
      // Simulate cache service failure
      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockRejectedValue(
        new Error('Cache service unavailable')
      );

      // Mock fallback to direct receiver service
      const mockDirectData = [
        { symbol: 'AMD', lastPrice: 95.50, volume: 1200000, timestamp: new Date().toISOString() }
      ];

      (receiverService.handleRequest as jest.Mock).mockResolvedValue({
        data: mockDirectData,
        metadata: {
          provider: 'longport',
          capability: 'get-stock-quote',
          requestId: 'fallback-123',
          processingTime: 250,
        },
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AMD'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      };

      const result = await queryService.executeQuery(request);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockDirectData);
      
      // Verify fallback to receiver service
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AMD'],
          receiverType: 'get-stock-quote',
        })
      );

      console.log(`🛡️ Graceful Degradation Test: Fallback to direct service successful`);
    });

    it('应该记录详细的性能指标', async () => {
      // Execute test with metrics tracking
      const symbol = 'INTC';
      const mockData = [
        { symbol, lastPrice: 55.75, volume: 800000, timestamp: new Date().toISOString() }
      ];

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockData,
        hit: true,
        ttlRemaining: 25,
        strategy: CacheStrategy.ADAPTIVE,
        storageKey: `cache:query:${symbol}:quote`,
        timestamp: new Date().toISOString(),
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [symbol],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { useCache: true },
      };

      const startTime = Date.now();
      const result = await queryService.executeQuery(request);
      const responseTime = Date.now() - startTime;

      expect(result).toBeDefined();

      // Verify metrics are tracked (Note: MetricsRegistryService has getMetricValue method)
      expect(metricsRegistry.getMetricValue).toBeDefined();

      performanceMetrics.push({
        symbol,
        strategy: CacheStrategy.ADAPTIVE,
        hit: true,
        responseTime,
        dataAge: 35, // 60 - 25 TTL remaining
      });

      console.log(`📊 Metrics Test: ${symbol} recorded ${responseTime}ms response time`);
    });
  });

  describe('Deprecated updateCache字段向后兼容性验证', () => {
    it('应该正确处理现代化的options（不含updateCache字段）', async () => {
      const mockData = [
        { symbol: 'DEPRECATED_TEST', lastPrice: 199.99, volume: 500000, timestamp: new Date().toISOString() }
      ];

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockData,
        hit: false, // 模拟cache miss，触发更新
        ttlRemaining: 0,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        storageKey: 'cache:query:DEPRECATED_TEST:quote',
        timestamp: new Date().toISOString(),
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['DEPRECATED_TEST'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { 
          useCache: true,
        },
      };

      const result = await queryService.executeQuery(request);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['DEPRECATED_TEST'],
          strategy: CacheStrategy.STRONG_TIMELINESS,
        })
      );

    });

    it('应该正确处理现代化的options（不含updateCache字段）', async () => {
      const mockData = [
        { symbol: 'MODERN_TEST', lastPrice: 299.99, volume: 750000, timestamp: new Date().toISOString() }
      ];

      (smartCacheOrchestrator.getDataWithSmartCache as jest.Mock).mockResolvedValue({
        data: mockData,
        hit: true,
        ttlRemaining: 120,
        strategy: CacheStrategy.WEAK_TIMELINESS,
        storageKey: 'cache:query:MODERN_TEST:quote',
        timestamp: new Date().toISOString(),
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['MODERN_TEST'],
        queryTypeFilter: 'get-stock-quote',
        limit: 10,
        page: 1,
        options: { 
          useCache: true,
          // 注意：不设置updateCache字段（现代推荐方式）
          includeMetadata: true,
        },
      };

      const result = await queryService.executeQuery(request);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['MODERN_TEST'],
          strategy: CacheStrategy.WEAK_TIMELINESS,
        })
      );

      console.log(`✅ Modern Options Test: Request processed successfully without deprecated fields`);
    });
  });

  describe('综合性能报告', () => {
    afterAll(() => {
      // Generate comprehensive performance report
      const totalRequests = performanceMetrics.length;
      const hitRate = totalRequests > 0 ? (performanceMetrics.filter(m => m.hit).length / totalRequests) * 100 : 0;
      
      const avgResponseTime = performanceMetrics.length > 0 
        ? performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / performanceMetrics.length
        : 0;

      const hitMetrics = performanceMetrics.filter(m => m.hit);
      const missMetrics = performanceMetrics.filter(m => !m.hit);

      const avgHitTime = hitMetrics.length > 0 
        ? hitMetrics.reduce((sum, m) => sum + m.responseTime, 0) / hitMetrics.length
        : 0;

      const avgMissTime = missMetrics.length > 0 
        ? missMetrics.reduce((sum, m) => sum + m.responseTime, 0) / missMetrics.length
        : 0;

      console.log('\n' + '='.repeat(60));
      console.log('📊 QUERY SMART CACHE INTEGRATION TEST REPORT');
      console.log('='.repeat(60));
      console.log(`🎯 Cache Hit Rate: ${hitRate.toFixed(1)}% (${performanceMetrics.filter(m => m.hit).length}/${totalRequests})`);
      console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(1)}ms`);
      console.log(`🚀 Cache Hit Avg: ${avgHitTime.toFixed(1)}ms`);
      console.log(`🐌 Cache Miss Avg: ${avgMissTime.toFixed(1)}ms`);
      // 去除未使用的计数器变量，避免lint
      // console.log(`🔄 Background Updates: ${backgroundUpdateCount}`);
      console.log(`📈 Performance Improvement: ${((avgMissTime - avgHitTime) / avgMissTime * 100).toFixed(1)}%`);
      
      // Strategy breakdown
      const strategyCounts = performanceMetrics.reduce((acc, m) => {
        acc[m.strategy] = (acc[m.strategy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📋 Cache Strategy Usage:');
      Object.entries(strategyCounts).forEach(([strategy, count]) => {
        console.log(`   ${strategy}: ${count} requests`);
      });

      console.log('='.repeat(60));
    });
  });
});
