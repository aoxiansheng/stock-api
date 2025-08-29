/**
 * Query组件压力测试套件
 * 
 * 测试目标：
 * 1. 大批量符号处理性能测试
 * 2. 内存监控和降级机制验证
 * 3. 高并发场景下的稳定性测试
 * 4. 内存泄漏检测和资源管理测试
 * 5. 故障恢复能力测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

import { QueryService } from '../../../src/core/01-entry/query/services/query.service';
import { QueryConfigService } from '../../../src/core/01-entry/query/config/query.config';
import { QueryMemoryMonitorService } from '../../../src/core/01-entry/query/services/query-memory-monitor.service';
import { QueryRequestDto, QueryType } from '../../../src/core/01-entry/query/dto/query-request.dto';

// Mock dependencies
const mockStorageService = {
  storeData: jest.fn().mockResolvedValue(undefined),
  retrieveData: jest.fn().mockResolvedValue(null),
};

const mockReceiverService = {
  handleRequest: jest.fn().mockImplementation(async (request) => ({
    data: request.symbols.map(symbol => ({
      symbol,
      lastPrice: Math.random() * 100,
      timestamp: new Date().toISOString(),
    })),
    metadata: {
      provider: 'mock',
      capability: 'get-stock-quote',
      timestamp: new Date().toISOString(),
      requestId: 'test',
      processingTime: 50,
    },
  })),
};

const mockMarketStatusService = {
  getMarketStatus: jest.fn().mockResolvedValue({
    status: 'TRADING',
    isHoliday: false,
  }),
  getBatchMarketStatus: jest.fn().mockResolvedValue({
    HK: { status: 'TRADING', isHoliday: false },
    US: { status: 'TRADING', isHoliday: false },
    SZ: { status: 'TRADING', isHoliday: false },
    SH: { status: 'TRADING', isHoliday: false },
  }),
};

const mockFieldMappingService = {
  filterToClassification: jest.fn().mockReturnValue('stock_quote'),
};

const mockQueryStatisticsService = {
  recordQueryPerformance: jest.fn(),
  getQueryStats: jest.fn().mockReturnValue({
    totalQueries: 0,
    averageResponseTime: 0,
  }),
};

const mockQueryResultProcessorService = {
  process: jest.fn().mockImplementation((result, request, queryId, duration) => ({
    data: {
      items: result.results,
      pagination: {
        page: 1,
        limit: 50,
        total: result.results.length,
        totalPages: 1,
      },
    },
    metadata: {
      queryId,
      duration,
      cacheUsed: result.cacheUsed,
      errors: result.errors,
    },
  })),
};

const mockPaginationService = {
  createPaginatedResponseFromQuery: jest.fn().mockImplementation((data, request, total) => ({
    items: data,
    pagination: {
      page: 1,
      limit: 50,
      total,
      totalPages: Math.ceil(total / 50),
    },
  })),
};

const mockCollectorService = {
  recordRequest: jest.fn(),
  recordCacheOperation: jest.fn(),
  getSystemMetrics: jest.fn().mockResolvedValue({
    memory: {
      used: 500 * 1024 * 1024, // 500MB
      total: 2 * 1024 * 1024 * 1024, // 2GB
      percentage: 0.25, // 25% usage
    },
    cpu: {
      usage: 0.15,
    },
    uptime: 3600,
    timestamp: new Date(),
  }),
};

const mockSmartCacheOrchestrator = {
  batchGetDataWithSmartCache: jest.fn().mockImplementation(async (requests) => {
    return requests.map(request => ({
      hit: Math.random() > 0.7, // 30% cache hit rate
      data: {
        symbol: request.symbols[0],
        lastPrice: Math.random() * 100,
        timestamp: new Date().toISOString(),
      },
      error: null,
    }));
  }),
};

const mockMetricsRegistryService = {
  queryMemoryUsageBytes: { labels: jest.fn().mockReturnValue({ set: jest.fn() }) },
  queryMemoryPressureLevel: { labels: jest.fn().mockReturnValue({ set: jest.fn() }) },
  queryMemoryTriggeredDegradations: { labels: jest.fn().mockReturnValue({ inc: jest.fn() }) },
};

describe('Query Component Stress Tests', () => {
  let queryService: QueryService;
  let queryConfig: QueryConfigService;
  let memoryMonitor: QueryMemoryMonitorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        QueryConfigService,
        QueryMemoryMonitorService,
        QueryService,
        { provide: 'StorageService', useValue: mockStorageService },
        { provide: 'ReceiverService', useValue: mockReceiverService },
        { provide: 'MarketStatusService', useValue: mockMarketStatusService },
        { provide: 'FieldMappingService', useValue: mockFieldMappingService },
        { provide: 'QueryStatisticsService', useValue: mockQueryStatisticsService },
        { provide: 'QueryResultProcessorService', useValue: mockQueryResultProcessorService },
        { provide: 'PaginationService', useValue: mockPaginationService },
        { provide: 'CollectorService', useValue: mockCollectorService },
        { provide: 'SmartCacheOrchestrator', useValue: mockSmartCacheOrchestrator },
        { provide: 'MetricsRegistryService', useValue: mockMetricsRegistryService },
      ],
    }).compile();

    queryService = module.get<QueryService>(QueryService);
    queryConfig = module.get<QueryConfigService>(QueryConfigService);
    memoryMonitor = module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService);
  });

  describe('大批量符号处理性能测试', () => {
    it('应能在10秒内处理500个符号', async () => {
      const largeSymbolList = Array.from({ length: 500 }, (_, i) => `TEST${i}.HK`);
      
      const startTime = Date.now();
      const result = await queryService.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: largeSymbolList,
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // 10秒内完成
      expect(result.data.items).toBeDefined();
      expect(result.metadata.errors.length).toBeLessThan(largeSymbolList.length * 0.1); // 错误率<10%

      console.log(`处理${largeSymbolList.length}个符号耗时: ${duration}ms`);
      console.log(`平均每符号处理时间: ${(duration / largeSymbolList.length).toFixed(2)}ms`);
    });

    it('应能处理1000个符号而不出现内存泄漏', async () => {
      const veryLargeSymbolList = Array.from({ length: 1000 }, (_, i) => `STRESS${i}.US`);
      
      const memoryBefore = process.memoryUsage();
      
      const result = await queryService.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: veryLargeSymbolList,
      });
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage();
      const memoryGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;

      expect(result).toBeDefined();
      expect(memoryGrowth).toBeLessThan(500 * 1024 * 1024); // 内存增长<500MB

      console.log(`内存增长: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('应能正确处理分片批量请求', async () => {
      // 测试超过MAX_MARKET_BATCH_SIZE的符号列表
      const symbolsOverLimit = Array.from({ length: 150 }, (_, i) => `BATCH${i}.SH`);
      
      const result = await queryService.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: symbolsOverLimit,
      });

      expect(result.data.items).toBeDefined();
      expect(result.data.items.length).toBeGreaterThan(0);
      
      console.log(`分片处理结果数量: ${result.data.items.length}/${symbolsOverLimit.length}`);
    });
  });

  describe('内存监控和降级机制验证', () => {
    it('应能正确检测内存使用情况', async () => {
      const memoryCheck = await memoryMonitor.checkMemoryBeforeBatch(100);

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck.canProcess).toBeDefined();
      expect(memoryCheck.currentUsage).toBeDefined();
      expect(memoryCheck.recommendation).toBeOneOf(['proceed', 'reduce_batch', 'defer']);
      expect(memoryCheck.pressureLevel).toBeOneOf(['normal', 'warning', 'critical']);

      console.log('内存检查结果:', {
        canProcess: memoryCheck.canProcess,
        memoryPercentage: (memoryCheck.currentUsage.memory.percentage * 100).toFixed(1) + '%',
        recommendation: memoryCheck.recommendation,
        pressureLevel: memoryCheck.pressureLevel,
      });
    });

    it('应在内存压力下自动降级', async () => {
      // 模拟高内存使用率
      mockCollectorService.getSystemMetrics.mockResolvedValueOnce({
        memory: {
          used: 1.8 * 1024 * 1024 * 1024, // 1.8GB
          total: 2 * 1024 * 1024 * 1024, // 2GB
          percentage: 0.9, // 90% usage - 超过临界阈值
        },
        cpu: { usage: 0.8 },
        uptime: 3600,
        timestamp: new Date(),
      });

      const memoryCheck = await memoryMonitor.checkMemoryBeforeBatch(200);

      expect(memoryCheck.canProcess).toBe(false);
      expect(memoryCheck.recommendation).toBe('defer');
      expect(memoryCheck.pressureLevel).toBe('critical');

      console.log('高内存压力下的检查结果:', {
        canProcess: memoryCheck.canProcess,
        recommendation: memoryCheck.recommendation,
        pressureLevel: memoryCheck.pressureLevel,
      });
    });

    it('应在警告阈值下建议降级处理', async () => {
      // 模拟中等内存使用率
      mockCollectorService.getSystemMetrics.mockResolvedValueOnce({
        memory: {
          used: 1.5 * 1024 * 1024 * 1024, // 1.5GB
          total: 2 * 1024 * 1024 * 1024, // 2GB
          percentage: 0.75, // 75% usage - 超过警告阈值
        },
        cpu: { usage: 0.5 },
        uptime: 3600,
        timestamp: new Date(),
      });

      const memoryCheck = await memoryMonitor.checkMemoryBeforeBatch(200);

      expect(memoryCheck.canProcess).toBe(true);
      expect(memoryCheck.recommendation).toBe('reduce_batch');
      expect(memoryCheck.pressureLevel).toBe('warning');
      expect(memoryCheck.suggestedBatchSize).toBeDefined();
      expect(memoryCheck.suggestedBatchSize).toBeLessThan(200);

      console.log('中等内存压力下的检查结果:', {
        canProcess: memoryCheck.canProcess,
        recommendation: memoryCheck.recommendation,
        suggestedBatchSize: memoryCheck.suggestedBatchSize,
        pressureLevel: memoryCheck.pressureLevel,
      });
    });
  });

  describe('高并发场景下的稳定性测试', () => {
    it('应能处理10个并发批量查询', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        queryService.executeQuery({
          queryType: QueryType.BY_SYMBOLS,
          symbols: [`CONCURRENT${i}A.HK`, `CONCURRENT${i}B.US`, `CONCURRENT${i}C.SH`],
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.data.items).toBeDefined();
      });

      console.log(`10个并发查询完成时间: ${duration}ms`);
      console.log(`平均单个查询时间: ${(duration / 10).toFixed(2)}ms`);
    });

    it('应能处理混合大小的并发请求', async () => {
      const mixedRequests = [
        // 小批量请求
        queryService.executeQuery({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['SMALL1.HK'],
        }),
        // 中等批量请求
        queryService.executeQuery({
          queryType: QueryType.BY_SYMBOLS,
          symbols: Array.from({ length: 25 }, (_, i) => `MEDIUM${i}.US`),
        }),
        // 大批量请求
        queryService.executeQuery({
          queryType: QueryType.BY_SYMBOLS,
          symbols: Array.from({ length: 100 }, (_, i) => `LARGE${i}.SH`),
        }),
      ];

      const results = await Promise.allSettled(mixedRequests);
      const successfulResults = results.filter(r => r.status === 'fulfilled');

      expect(successfulResults.length).toBeGreaterThanOrEqual(2); // 至少2个成功

      console.log(`混合请求结果: ${successfulResults.length}/3 成功`);
    });
  });

  describe('故障恢复能力测试', () => {
    it('应能优雅处理ReceiverService错误', async () => {
      // 模拟ReceiverService抛出错误
      mockReceiverService.handleRequest.mockRejectedValueOnce(new Error('模拟网络错误'));

      const result = await queryService.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['ERROR_TEST.HK'],
      });

      expect(result).toBeDefined();
      expect(result.metadata.errors.length).toBeGreaterThan(0);
      expect(result.metadata.errors[0].reason).toContain('模拟网络错误');

      // 恢复mock的正常行为
      mockReceiverService.handleRequest.mockImplementation(async (request) => ({
        data: request.symbols.map(symbol => ({
          symbol,
          lastPrice: Math.random() * 100,
          timestamp: new Date().toISOString(),
        })),
        metadata: {
          provider: 'mock',
          capability: 'get-stock-quote',
          timestamp: new Date().toISOString(),
          requestId: 'test',
          processingTime: 50,
        },
      }));

      console.log('故障恢复测试完成，错误已正确处理');
    });

    it('应能处理内存监控服务故障', async () => {
      // 模拟内存监控服务故障
      const originalCheckMemory = memoryMonitor.checkMemoryBeforeBatch;
      jest.spyOn(memoryMonitor, 'checkMemoryBeforeBatch')
        .mockRejectedValueOnce(new Error('内存监控服务故障'));

      const result = await queryService.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['MEMORY_ERROR_TEST.US'],
      });

      expect(result).toBeDefined();
      expect(result.data.items).toBeDefined();

      // 恢复原始行为
      jest.restoreAllMocks();

      console.log('内存监控故障恢复测试完成');
    });
  });

  describe('配置参数验证测试', () => {
    it('应能正确应用动态配置', async () => {
      // 获取当前配置
      const configSummary = queryConfig.getConfigSummary();

      expect(configSummary).toBeDefined();
      expect(configSummary.batch.maxBatchSize).toBeGreaterThan(0);
      expect(configSummary.batch.maxMarketBatchSize).toBeGreaterThan(0);
      expect(configSummary.timeout.marketParallelTimeout).toBeGreaterThan(0);
      expect(configSummary.timeout.receiverBatchTimeout).toBeGreaterThan(0);
      expect(configSummary.memory.warningThreshold).toBeGreaterThan(0);
      expect(configSummary.memory.criticalThreshold).toBeGreaterThan(0);

      console.log('当前配置摘要:', configSummary);
    });

    it('应能获取内存监控服务状态', async () => {
      const monitorStatus = await memoryMonitor.getMonitorStatus();

      expect(monitorStatus).toBeDefined();
      expect(monitorStatus.enabled).toBe(true);
      expect(monitorStatus.thresholds.warning).toBeGreaterThan(0);
      expect(monitorStatus.thresholds.critical).toBeGreaterThan(0);
      expect(monitorStatus.lastCheckTime).toBeDefined();

      console.log('内存监控服务状态:', monitorStatus);
    });
  });

  afterEach(() => {
    // 清理mock调用记录
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // 清理资源
    jest.restoreAllMocks();
  });
});

// 扩展Jest匹配器
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(validOptions: any[]): R;
    }
  }
}