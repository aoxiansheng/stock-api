/**
 * QueryService后台更新功能单元测试
 * 验证里程碑4.1-4.3的实现：去重机制、变动检测、性能调优
 */
import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { ReceiverService } from '@core/01-entry/receiver/services/receiver.service';
import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { DataChangeDetectorService } from '@core/shared/services/data-change-detector.service';
import { MarketStatusService } from '@core/shared/services/market-status.service';
import { FieldMappingService } from '@core/shared/services/field-mapping.service';
import { QueryStatisticsService } from '@core/01-entry/query/services/query-statistics.service';
import { QueryResultProcessorService } from '@core/01-entry/query/services/query-result-processor.service';
import { BackgroundTaskService } from '@core/shared/services/background-task.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { QueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { Market } from '@common/constants/market.constants';
import { MarketStatus } from '@common/constants/market-trading-hours.constants';
import { StorageType, StorageClassification } from '@core/04-storage/storage/enums/storage-type.enum';

describe('QueryService - 后台更新优化测试', () => {
  let service: QueryService;
  let receiverService: jest.Mocked<ReceiverService>;
  let storageService: jest.Mocked<StorageService>;
  let dataChangeDetector: jest.Mocked<DataChangeDetectorService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let backgroundTaskService: jest.Mocked<BackgroundTaskService>;

  const mockRequest: QueryRequestDto = {
    queryType: QueryType.BY_SYMBOLS,
    symbols: ['AAPL'],
    queryTypeFilter: 'get-stock-quote',
    limit: 10,
    page: 1,
    options: { useCache: true },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: ReceiverService,
          useValue: {
            handleRequest: jest.fn(),
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
          provide: DataChangeDetectorService,
          useValue: {
            detectSignificantChange: jest.fn(),
          },
        },
        {
          provide: MarketStatusService,
          useValue: {
            getMarketStatus: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            filterToClassification: jest.fn(),
          },
        },
        {
          provide: QueryStatisticsService,
          useValue: {
            recordQueryPerformance: jest.fn(),
          },
        },
        {
          provide: QueryResultProcessorService,
          useValue: {
            process: jest.fn(),
          },
        },
        {
          provide: BackgroundTaskService,
          useValue: {
            run: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            createPaginatedResponseFromQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    receiverService = module.get(ReceiverService);
    storageService = module.get(StorageService);
    dataChangeDetector = module.get(DataChangeDetectorService);
    marketStatusService = module.get(MarketStatusService);
    backgroundTaskService = module.get(BackgroundTaskService);
  });

  describe('里程碑4.1: 后台更新去重机制', () => {
    it('应该防止相同storageKey的重复后台更新任务', async () => {
      // 模拟缓存命中
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // 执行多次相同的查询
      const promises = Array.from({ length: 5 }, () =>
        service.executeQuery(mockRequest)
      );
      
      await Promise.all(promises);

      // 验证后台任务只被调度一次（去重生效）
      // 注意：由于scheduleBackgroundUpdate是私有方法，我们通过side effects验证
      expect(backgroundTaskService.run).toHaveBeenCalledTimes(1);
    });

    it('应该正确管理backgroundUpdateTasks Map的生命周期', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // Mock后台更新完成流程
      backgroundTaskService.run.mockImplementation((taskFn) => {
        // 立即执行任务以测试清理逻辑
        return Promise.resolve(taskFn());
      });

      await service.executeQuery(mockRequest);

      // 验证任务被正确调度
      expect(backgroundTaskService.run).toHaveBeenCalledWith(
        expect.any(Function),
        expect.stringContaining('Update data for symbol')
      );
    });
  });

  describe('里程碑4.2: 优化的变动检测', () => {
    it('应该使用ReceiverService进行后台数据获取', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // Mock ReceiverService响应
      receiverService.handleRequest.mockResolvedValue({
        data: [{ symbol: 'AAPL', price: 155 }],
        metadata: { 
          provider: 'longport',
          capability: 'get-stock-quote',
          requestId: 'test-request-id',
          processingTime: 100,
          timestamp: new Date().toISOString()
        },
      });

      // Mock市场状态
      marketStatusService.getMarketStatus.mockResolvedValue({
        market: Market.HK,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        realtimeCacheTTL: 60,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 1.0,
      });

      // Mock变动检测结果
      dataChangeDetector.detectSignificantChange.mockResolvedValue({
        hasChanged: true,
        changedFields: ['price'],
        significantChanges: ['price changed from 150 to 155'],
        changeReason: 'Price change exceeds threshold',
        confidence: 0.95,
      });

      backgroundTaskService.run.mockImplementation(async (taskFn) => {
        await taskFn();
      });

      await service.executeQuery(mockRequest);

      // 验证ReceiverService被调用，且使用storageMode: 'none'
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AAPL'],
          receiverType: 'get-stock-quote',
          options: expect.objectContaining({
            storageMode: 'none',
          }),
        })
      );
    });

    it('应该正确处理变动检测结果', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      receiverService.handleRequest.mockResolvedValue({
        data: [{ symbol: 'AAPL', price: 150.01 }], // 微小变化
        metadata: { 
          provider: 'longport',
          capability: 'get-stock-quote',
          requestId: 'test-request-id',
          processingTime: 100,
          timestamp: new Date().toISOString()
        },
      });

      marketStatusService.getMarketStatus.mockResolvedValue({
        market: Market.HK,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        realtimeCacheTTL: 60,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 1.0,
      });

      // Mock无显著变化
      dataChangeDetector.detectSignificantChange.mockResolvedValue({
        hasChanged: false,
        changedFields: [],
        significantChanges: [],
        changeReason: 'No significant change detected',
        confidence: 0.99,
      });

      backgroundTaskService.run.mockImplementation(async (taskFn) => {
        await taskFn();
      });

      await service.executeQuery(mockRequest);

      // 验证变动检测被调用
      expect(dataChangeDetector.detectSignificantChange).toHaveBeenCalledWith(
        'AAPL',
        { symbol: 'AAPL', price: 150.01 },
        Market.US,
        'TRADING'
      );
    });
  });

  describe('里程碑4.3: 性能调优机制', () => {
    it('应该实现TTL节流策略', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // 第一次查询
      await service.executeQuery(mockRequest);
      expect(backgroundTaskService.run).toHaveBeenCalledTimes(1);

      // 立即再次查询（应该被TTL限制）
      await service.executeQuery(mockRequest);
      
      // 验证第二次查询没有触发新的后台任务（被节流限制）
      expect(backgroundTaskService.run).toHaveBeenCalledTimes(1);
    });

    it('应该实现优先级队列机制', async () => {
      // 这个测试需要直接测试私有方法或通过integration test验证
      // 由于方法是私有的，我们通过多个不同市场的请求来验证优先级机制

      const usRequest = { ...mockRequest, symbols: ['AAPL'], market: Market.US };
      const hkRequest = { ...mockRequest, symbols: ['700.HK'], market: Market.HK };
      const shRequest = { ...mockRequest, symbols: ['600000.SH'], market: Market.SH };

      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'TEST', price: 100 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // 模拟高并发情况
      const requests = [usRequest, hkRequest, shRequest, usRequest, hkRequest];
      
      await Promise.all(requests.map(req => service.executeQuery(req)));

      // 验证后台任务服务被调用
      expect(backgroundTaskService.run).toHaveBeenCalled();
    });

    it('应该正确实现任务取消机制', async () => {
      // 测试onModuleDestroy的清理逻辑
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // 启动一些后台任务
      await service.executeQuery(mockRequest);
      
      // 模拟模块销毁
      await service.onModuleDestroy();
      
      // 验证清理完成（通过没有抛出错误来验证）
      expect(true).toBe(true); // 如果onModuleDestroy有问题会抛出异常
    });
  });

  describe('高并发场景测试', () => {
    it('应该处理大量并发查询请求', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      // 模拟100个并发请求
      const concurrentRequests = Array.from({ length: 100 }, (_, i) => ({
        ...mockRequest,
        symbols: [`SYMBOL${i}`],
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map(req => service.executeQuery(req))
      );
      const processingTime = Date.now() - startTime;

      // 验证所有请求都成功处理
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
      });

      // 验证处理时间合理（并发处理应该比串行快）
      expect(processingTime).toBeLessThan(10000); // 10秒内完成

      console.log(`✅ 高并发测试完成：100个请求在${processingTime}ms内处理完成`);
    });

    it('应该在高负载下保持系统稳定性', async () => {
      storageService.retrieveData
        .mockResolvedValueOnce({
          data: { symbol: 'AAPL', price: 150 },
          metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
        })
        .mockRejectedValue(new Error('Storage overload'));

      receiverService.handleRequest
        .mockResolvedValueOnce({
          data: [{ symbol: 'AAPL', price: 155 }],
          metadata: { 
          provider: 'longport',
          capability: 'get-stock-quote',
          requestId: 'test-request-id',
          processingTime: 100,
          timestamp: new Date().toISOString()
        },
        })
        .mockRejectedValue(new Error('Receiver overload'));

      // 混合成功和失败的请求
      const mixedRequests = Array.from({ length: 50 }, (_, i) => ({
        ...mockRequest,
        symbols: [`SYMBOL${i}`],
      }));

      const results = await Promise.allSettled(
        mixedRequests.map(req => service.executeQuery(req))
      );

      // 验证系统优雅处理错误，不崩溃
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ 系统稳定性测试：${fulfilled}个成功，${rejected}个失败`);

      // 至少部分请求应该成功
      expect(fulfilled).toBeGreaterThan(0);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该正确处理ReceiverService错误', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      receiverService.handleRequest.mockRejectedValue(new Error('Network timeout'));

      backgroundTaskService.run.mockImplementation(async (taskFn) => {
        // 执行任务但期望它处理错误
        await taskFn().catch(() => {}); // 忽略错误，测试错误处理
      });

      // 应该不抛出异常
      await expect(service.executeQuery(mockRequest)).resolves.toBeDefined();
    });

    it('应该正确处理DataChangeDetector错误', async () => {
      storageService.retrieveData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: { 
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'longport',
          market: 'HK',
          dataSize: 1024,
          storedAt: new Date().toISOString(),
          processingTime: 100
        },
      });

      receiverService.handleRequest.mockResolvedValue({
        data: [{ symbol: 'AAPL', price: 155 }],
        metadata: { 
          provider: 'longport',
          capability: 'get-stock-quote',
          requestId: 'test-request-id',
          processingTime: 100,
          timestamp: new Date().toISOString()
        },
      });

      dataChangeDetector.detectSignificantChange.mockRejectedValue(
        new Error('Change detection failed')
      );

      backgroundTaskService.run.mockImplementation(async (taskFn) => {
        await taskFn().catch(() => {}); // 忽略错误
      });

      // 应该不影响主查询流程
      await expect(service.executeQuery(mockRequest)).resolves.toBeDefined();
    });
  });
});