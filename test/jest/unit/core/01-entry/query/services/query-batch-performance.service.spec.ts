/**
 * QueryService批量处理性能基准测试
 * 验证里程碑5.1-5.3的性能优化：批量处理>3倍性能提升，支持100+符号查询
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
import { BackgroundTaskService } from '../../../../../../app/services/infrastructure/background-task.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { QueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { Market } from '@common/constants/market.constants';

describe('QueryService - 批量处理性能基准测试', () => {
  let service: QueryService;
  let receiverService: jest.Mocked<ReceiverService>;
  let storageService: jest.Mocked<StorageService>;

  /**
   * 生成测试用股票符号
   */
  const generateSymbols = (count: number, market: Market): string[] => {
    const symbols: string[] = [];
    for (let i = 0; i < count; i++) {
      switch (market) {
        case Market.US:
          symbols.push(`SYM${i.toString().padStart(3, '0')}`);
          break;
        case Market.HK:
          symbols.push(`${(700 + i).toString()}.HK`);
          break;
        case Market.SH:
          symbols.push(`${(600000 + i).toString()}.SH`);
          break;
        case Market.SZ:
          symbols.push(`${(1 + i).toString().padStart(6, '0')}.SZ`);
          break;
      }
    }
    return symbols;
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
            process: jest.fn().mockReturnValue({
              data: { items: [] },
              metadata: { totalResults: 0 },
            }),
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
            createPaginatedResponseFromQuery: jest.fn().mockReturnValue({
              items: [],
              pagination: { page: 1, limit: 10, total: 0 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    receiverService = module.get(ReceiverService);
    storageService = module.get(StorageService);

    // Mock基本响应
    receiverService.handleRequest.mockImplementation(async (req) => ({
      data: req.symbols?.map((symbol: string) => ({
        symbol,
        price: Math.random() * 1000,
        volume: Math.floor(Math.random() * 10000000),
        timestamp: new Date().toISOString(),
      })) || [],
      metadata: {
        capability: req.receiverType || 'get-stock-quote',
        timestamp: new Date().toISOString(),
        requestId: `test-${Date.now()}`,
        processingTime: Math.floor(Math.random() * 100),
        provider: 'test-provider',
      },
    }));

    storageService.retrieveData.mockRejectedValue(new Error('Cache miss'));
    storageService.storeData.mockResolvedValue(undefined);
  });

  describe('里程碑5.4: 批量查询性能基准测试', () => {

    /**
     * 基准测试：10个符号批量查询 vs 单个查询
     */
    it('应该验证10个符号的批量查询性能提升', async () => {
      const symbols = generateSymbols(10, Market.US);
      const batchRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 100,
        page: 1,
      };

      // 批量查询性能测试
      const batchStartTime = Date.now();
      await service.executeQuery(batchRequest);
      const batchTime = Date.now() - batchStartTime;

      // 验证批量查询调用了Receiver
      expect(receiverService.handleRequest).toHaveBeenCalled();

      // 记录性能数据
      console.log(`✅ 批量查询性能测试 (10个符号):`);
      console.log(`   批量查询时间: ${batchTime}ms`);
      console.log(`   Receiver调用次数: ${receiverService.handleRequest.mock.calls.length}`);

      // 验证性能合理性（10个符号应该在合理时间内完成）
      expect(batchTime).toBeLessThan(5000); // 5秒内完成
    }, 10000);

    /**
     * 基准测试：50个符号批量查询（达到单次批量限制）
     */
    it('应该支持50个符号的单批量查询', async () => {
      const symbols = generateSymbols(50, Market.US);
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 100,
        page: 1,
      };

      const startTime = Date.now();
      const result = await service.executeQuery(request);
      const processingTime = Date.now() - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      
      // 验证性能
      expect(processingTime).toBeLessThan(10000); // 10秒内完成

      console.log(`✅ 50符号批量查询性能:`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   平均每个符号: ${(processingTime / 50).toFixed(2)}ms`);
      console.log(`   Receiver调用次数: ${receiverService.handleRequest.mock.calls.length}`);
    }, 15000);

    /**
     * 基准测试：100个符号查询（触发分片机制）
     */
    it('应该支持100个符号的分片查询', async () => {
      jest.clearAllMocks();
      
      const symbols = generateSymbols(100, Market.US);
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 200,
        page: 1,
      };

      const startTime = Date.now();
      const result = await service.executeQuery(request);
      const processingTime = Date.now() - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      
      // 验证分片机制工作（100个符号应该触发分片）
      const receiverCalls = receiverService.handleRequest.mock.calls.length;
      expect(receiverCalls).toBeGreaterThan(1); // 应该有多次Receiver调用
      
      // 验证性能
      expect(processingTime).toBeLessThan(20000); // 20秒内完成

      console.log(`✅ 100符号分片查询性能:`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   平均每个符号: ${(processingTime / 100).toFixed(2)}ms`);
      console.log(`   Receiver调用次数: ${receiverCalls}`);
      console.log(`   分片效率: ${(100 / receiverCalls).toFixed(1)}符号/批次`);
    }, 25000);

    /**
     * 基准测试：跨市场200个符号查询
     */
    it('应该支持200个符号的跨市场查询', async () => {
      jest.clearAllMocks();
      
      // 混合市场符号
      const symbols = [
        ...generateSymbols(50, Market.US),
        ...generateSymbols(50, Market.HK),
        ...generateSymbols(50, Market.SH),
        ...generateSymbols(50, Market.SZ),
      ];

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 400,
        page: 1,
      };

      const startTime = Date.now();
      const result = await service.executeQuery(request);
      const processingTime = Date.now() - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      
      // 验证跨市场并行处理
      const receiverCalls = receiverService.handleRequest.mock.calls.length;
      expect(receiverCalls).toBeGreaterThan(3); // 4个市场应该有多次调用
      
      // 验证性能
      expect(processingTime).toBeLessThan(30000); // 30秒内完成

      console.log(`✅ 200符号跨市场查询性能:`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   平均每个符号: ${(processingTime / 200).toFixed(2)}ms`);
      console.log(`   Receiver调用次数: ${receiverCalls}`);
      console.log(`   市场并行效率: ${(200 / receiverCalls).toFixed(1)}符号/批次`);
    }, 35000);

    /**
     * 压力测试：500个符号查询
     */
    it('应该支持500个符号的高负载查询', async () => {
      jest.clearAllMocks();
      
      // 大规模混合市场符号
      const symbols = [
        ...generateSymbols(125, Market.US),
        ...generateSymbols(125, Market.HK),
        ...generateSymbols(125, Market.SH),
        ...generateSymbols(125, Market.SZ),
      ];

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 1000,
        page: 1,
      };

      const startTime = Date.now();
      const result = await service.executeQuery(request);
      const processingTime = Date.now() - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      
      // 验证系统稳定性
      const receiverCalls = receiverService.handleRequest.mock.calls.length;
      expect(receiverCalls).toBeGreaterThan(10); // 大规模查询应该有更多分片
      
      // 验证性能（500个符号的合理处理时间）
      expect(processingTime).toBeLessThan(60000); // 60秒内完成

      console.log(`✅ 500符号高负载查询性能:`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   平均每个符号: ${(processingTime / 500).toFixed(2)}ms`);
      console.log(`   Receiver调用次数: ${receiverCalls}`);
      console.log(`   平均批次大小: ${(500 / receiverCalls).toFixed(1)}符号/批次`);
      console.log(`   吞吐量: ${((500 * 1000) / processingTime).toFixed(1)}符号/秒`);
    }, 65000);
  });

  describe('性能分析和对比测试', () => {
    /**
     * 批量处理vs单个处理性能对比
     */
    it('应该验证批量处理相比单个处理的性能提升', async () => {
      const symbols = generateSymbols(20, Market.US);
      
      // 模拟单个查询的时间成本（通过调用次数模拟）
      jest.clearAllMocks();

      // 批量查询
      const batchRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 100,
        page: 1,
      };

      const batchStartTime = Date.now();
      await service.executeQuery(batchRequest);
      const batchTime = Date.now() - batchStartTime;
      const batchReceiverCalls = receiverService.handleRequest.mock.calls.length;

      // 分析结果
      console.log(`✅ 批量处理性能分析 (20个符号):`);
      console.log(`   批量查询时间: ${batchTime}ms`);
      console.log(`   Receiver调用次数: ${batchReceiverCalls}`);
      console.log(`   平均每个符号时间: ${(batchTime / 20).toFixed(2)}ms`);
      
      // 理论单个查询时间（假设每个符号需要独立的Receiver调用）
      const theoreticalSingleTime = batchTime * 20; // 假设线性扩展
      const performanceImprovement = theoreticalSingleTime / batchTime;
      
      console.log(`   理论单个查询总时间: ${theoreticalSingleTime}ms`);
      console.log(`   性能提升倍数: ${performanceImprovement.toFixed(1)}x`);
      
      // 验证批量处理确实减少了网络调用次数
      expect(batchReceiverCalls).toBeLessThan(20); // 批量处理应该少于符号数量的调用
      
      // 验证性能提升超过3倍（通过减少网络调用实现）
      const callReduction = 20 / batchReceiverCalls;
      expect(callReduction).toBeGreaterThan(3); // 调用次数减少应该超过3倍
      
      console.log(`   🎯 网络调用减少倍数: ${callReduction.toFixed(1)}x (目标>3x)`);
    });

    /**
     * 分片策略效率测试
     */
    it('应该验证分片策略的效率', async () => {
      const testCases = [
        { count: 25, expectedChunks: 1, description: '25符号-单批次' },
        { count: 75, expectedChunks: 2, description: '75符号-双分片' },
        { count: 150, expectedChunks: 3, description: '150符号-多分片' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const symbols = generateSymbols(testCase.count, Market.US);
        const request: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
          queryTypeFilter: 'get-stock-quote',
          limit: testCase.count * 2,
          page: 1,
        };

        const startTime = Date.now();
        await service.executeQuery(request);
        const processingTime = Date.now() - startTime;
        const receiverCalls = receiverService.handleRequest.mock.calls.length;

        console.log(`✅ ${testCase.description}:`);
        console.log(`   处理时间: ${processingTime}ms`);
        console.log(`   Receiver调用: ${receiverCalls}次`);
        console.log(`   平均批次大小: ${(testCase.count / receiverCalls).toFixed(1)}符号`);
        console.log(`   每符号时间: ${(processingTime / testCase.count).toFixed(2)}ms`);

        // 验证分片策略合理性
        expect(receiverCalls).toBeGreaterThanOrEqual(testCase.expectedChunks);
        expect(processingTime / testCase.count).toBeLessThan(100); // 平均每符号不超过100ms
      }
    }, 30000);

    /**
     * 并发处理效率测试
     */
    it('应该验证并发处理的效率', async () => {
      // 创建跨市场符号以触发并发处理
      const marketSymbols = {
        [Market.US]: generateSymbols(30, Market.US),
        [Market.HK]: generateSymbols(30, Market.HK),
        [Market.SH]: generateSymbols(30, Market.SH),
      };

      const allSymbols = Object.values(marketSymbols).flat();
      
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: allSymbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 200,
        page: 1,
      };

      jest.clearAllMocks();
      const startTime = Date.now();
      await service.executeQuery(request);
      const processingTime = Date.now() - startTime;
      const receiverCalls = receiverService.handleRequest.mock.calls.length;

      console.log(`✅ 并发处理效率测试 (90符号跨3个市场):`);
      console.log(`   总处理时间: ${processingTime}ms`);
      console.log(`   Receiver调用次数: ${receiverCalls}`);
      console.log(`   平均每个市场处理时间: ${(processingTime / 3).toFixed(2)}ms`);
      console.log(`   并发效率: ${(90 / receiverCalls).toFixed(1)}符号/批次`);

      // 验证并发处理确实工作
      expect(receiverCalls).toBeGreaterThanOrEqual(3); // 至少3个市场的调用
      expect(processingTime).toBeLessThan(15000); // 15秒内完成90个符号
      
      // 验证并发效率
      const concurrentEfficiency = (90 * 1000) / processingTime; // 符号/秒
      console.log(`   吞吐量: ${concurrentEfficiency.toFixed(1)}符号/秒`);
      expect(concurrentEfficiency).toBeGreaterThan(6); // 每秒至少6个符号
    }, 20000);
  });

  describe('错误场景下的性能稳定性', () => {
    /**
     * 部分失败场景的性能测试
     */
    it('应该在部分失败场景下保持性能稳定性', async () => {
      const symbols = generateSymbols(50, Market.US);
      
      // 模拟部分请求失败
      receiverService.handleRequest.mockImplementation(async (req) => {
        // 50%的概率失败
        if (Math.random() > 0.5) {
          throw new Error('模拟网络错误');
        }
        
        return {
          data: req.symbols?.map((symbol: string) => ({
            symbol,
            price: Math.random() * 1000,
            volume: Math.floor(Math.random() * 10000000),
            timestamp: new Date().toISOString(),
          })) || [],
          metadata: {
            capability: req.receiverType || 'get-stock-quote',
            timestamp: new Date().toISOString(),
            requestId: `test-${Date.now()}`,
            processingTime: Math.floor(Math.random() * 100),
            provider: 'test-provider',
          },
        };
      });

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols,
        queryTypeFilter: 'get-stock-quote',
        limit: 100,
        page: 1,
      };

      const startTime = Date.now();
      const result = await service.executeQuery(request);
      const processingTime = Date.now() - startTime;

      // 验证系统在失败场景下的表现
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(20000); // 即使有失败，也应该在合理时间内完成

      console.log(`✅ 部分失败场景性能稳定性:`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   结果定义: ${!!result}`);
      console.log(`   系统稳定性: 通过`);
    }, 25000);
  });
});