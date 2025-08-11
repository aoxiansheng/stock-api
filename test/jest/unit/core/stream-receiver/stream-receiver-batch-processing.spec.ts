/**
 * StreamReceiverService - RxJS bufferTime 批量处理单元测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverService } from '../../../../../src/core/stream-receiver/stream-receiver.service';
import { CapabilityRegistryService } from '../../../../../src/providers/services/capability-registry.service';
import { SymbolMapperService } from '../../../../../src/core/symbol-mapper/services/symbol-mapper.service';
import { FlexibleMappingRuleService } from '../../../../../src/core/data-mapper/services/flexible-mapping-rule.service';
import { TransformerService } from '../../../../../src/core/transformer/services/transformer.service';
import { BatchOptimizationService } from '../../../../../src/core/shared/services/batch-optimization.service';
import { FeatureFlags } from '../../../../../src/common/config/feature-flags.config';
import { StreamPerformanceMetrics } from '../../../../../src/core/shared/services/stream-performance-metrics.service';

// Mock services
const mockCapabilityRegistry = {
  getBestStreamProvider: jest.fn(),
  getStreamCapability: jest.fn(),
  getProvider: jest.fn(),
};

const mockSymbolMapperService = {
  transformSymbols: jest.fn(),
  mapSymbol: jest.fn(),
};

const mockFlexibleMappingRuleService = {
  findBestMatchingRule: jest.fn(),
};

const mockTransformerService = {
  transform: jest.fn(),
};

const mockBatchOptimizationService = {
  preloadSymbolMappings: jest.fn(),
};

const mockPerformanceMetrics = {
  recordBatchProcessed: jest.fn(),
  recordBatchPreloadCacheHit: jest.fn(),
  recordSymbolProcessed: jest.fn(),
  recordConnectionChange: jest.fn(),
};

describe('StreamReceiverService - RxJS Batch Processing', () => {
  let service: StreamReceiverService;
  let featureFlags: FeatureFlags;
  let performanceMetrics: StreamPerformanceMetrics;
  
  const mockQuoteData = {
    rawData: {
      symbol: '700.HK',
      last_done: 450.5,
      prev_close: 448.0,
      timestamp: Date.now(),
    },
    providerName: 'longport',
    wsCapabilityType: 'stream-stock-quote',
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistry,
        },
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: FlexibleMappingRuleService,
          useValue: mockFlexibleMappingRuleService,
        },
        {
          provide: TransformerService,
          useValue: mockTransformerService,
        },
        {
          provide: BatchOptimizationService,
          useValue: mockBatchOptimizationService,
        },
        {
          provide: FeatureFlags,
          useValue: {
            batchProcessingEnabled: true,
            batchSizeThreshold: 10,
            batchTimeWindowMs: 1,
            isPerformanceOptimizationEnabled: () => true,
          },
        },
        {
          provide: StreamPerformanceMetrics,
          useValue: mockPerformanceMetrics,
        },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
    featureFlags = module.get<FeatureFlags>(FeatureFlags);
    performanceMetrics = module.get<StreamPerformanceMetrics>(StreamPerformanceMetrics);
    
    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('RxJS 批量处理管道', () => {
    it('应该在构造函数中正确初始化批量处理管道', () => {
      // 验证服务实例化成功
      expect(service).toBeDefined();
      
      // 验证 Feature Flags 配置正确
      expect(featureFlags.batchProcessingEnabled).toBe(true);
      expect(featureFlags.batchSizeThreshold).toBe(10);
      expect(featureFlags.batchTimeWindowMs).toBe(1);
    });

    it('应该在禁用批量处理时跳过管道初始化', async () => {
      const moduleWithDisabledBatch: TestingModule = await Test.createTestingModule({
        providers: [
          StreamReceiverService,
          {
            provide: CapabilityRegistryService,
            useValue: mockCapabilityRegistry,
          },
          {
            provide: SymbolMapperService,
            useValue: mockSymbolMapperService,
          },
          {
            provide: FlexibleMappingRuleService,
            useValue: mockFlexibleMappingRuleService,
          },
          {
            provide: TransformerService,
            useValue: mockTransformerService,
          },
          {
            provide: BatchOptimizationService,
            useValue: mockBatchOptimizationService,
          },
          {
            provide: FeatureFlags,
            useValue: {
              batchProcessingEnabled: false,
              batchSizeThreshold: 10,
              batchTimeWindowMs: 1,
              isPerformanceOptimizationEnabled: () => true,
            },
          },
          {
            provide: StreamPerformanceMetrics,
            useValue: mockPerformanceMetrics,
          },
        ],
      }).compile();

      const disabledService = moduleWithDisabledBatch.get<StreamReceiverService>(StreamReceiverService);
      expect(disabledService).toBeDefined();
    });
  });

  describe('批量处理统计', () => {
    it('应该正确获取批量处理统计信息', () => {
      const stats = service.getBatchProcessingStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalQuotes).toBe(0);
      expect(stats.batchProcessingTime).toBe(0);
      expect(stats.avgBatchSize).toBe(0);
      expect(stats.avgBatchProcessingTime).toBe(0);
    });

    it('应该在处理批量数据后更新统计信息', async () => {
      // 使用 ≥10 个符号以触发批量预加载 (batchSizeThreshold = 10)
      const quotes = Array.from({ length: 12 }, (_, i) => ({
        ...mockQuoteData,
        rawData: { ...mockQuoteData.rawData, symbol: `${700 + i}.HK` },
      }));

      // Mock 相关服务方法 - 为12个符号设置映射
      const mappingResults = new Map();
      quotes.forEach((quote, i) => {
        const symbol = `${700 + i}.HK`;
        mappingResults.set(symbol, `00${700 + i}.HK`);
      });
      
      mockBatchOptimizationService.preloadSymbolMappings.mockResolvedValue(mappingResults);

      // 模拟处理数据的返回值
      const mockProcessedData = {
        symbols: ['700.HK'],
        data: { symbol: '700.HK', lastPrice: 450.5 },
        timestamp: Date.now(),
        provider: 'longport',
        capability: 'stream-stock-quote',
        processingChain: {
          symbolMapped: true,
          mappingRulesUsed: true,
          dataTransformed: true,
        },
      };

      // 模拟 processAndCacheProviderData 方法
      const processAndCacheDataSpy = jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockResolvedValue(mockProcessedData);

      // 调用批量处理方法
      await (service as any).processBatchQuotes(quotes);

      // 验证性能指标被正确记录
      expect(mockPerformanceMetrics.recordBatchProcessed).toHaveBeenCalledWith(
        12, // quotesCount
        expect.any(Number), // processingTime
        true // success
      );

      // 验证批量预加载缓存指标
      expect(mockPerformanceMetrics.recordBatchPreloadCacheHit).toHaveBeenCalledWith(
        12, // symbolsCount
        100 // hitRate (12/12 * 100)
      );

      processAndCacheDataSpy.mockRestore();
    });

    it('应该在批量处理失败时记录失败指标', async () => {
      const quotes = [mockQuoteData];

      // Mock 处理失败
      jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockRejectedValue(new Error('Processing failed'));

      // 调用批量处理方法
      await (service as any).processBatchQuotes(quotes);

      // 验证失败指标被记录
      expect(mockPerformanceMetrics.recordBatchProcessed).toHaveBeenCalledWith(
        1, // quotesCount
        expect.any(Number), // processingTime
        false // success = false
      );
    });
  });

  describe('按提供商批量处理', () => {
    it('应该正确按提供商分组并处理报价数据', async () => {
      // 使用 ≥10 个符号以触发批量预加载 (batchSizeThreshold = 10)
      const quotes = Array.from({ length: 12 }, (_, i) => ({
        ...mockQuoteData, 
        providerName: 'longport',
        rawData: { ...mockQuoteData.rawData, symbol: `${700 + i}.HK` }
      }));

      // Mock 批量预加载 - 返回足够的映射结果
      const mappingResults = new Map();
      quotes.forEach((quote, i) => {
        const symbol = `${700 + i}.HK`;
        mappingResults.set(symbol, `00${700 + i}.HK`);
      });
      mockBatchOptimizationService.preloadSymbolMappings.mockResolvedValue(mappingResults);

      // Mock 数据处理
      jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockResolvedValue({
          symbols: ['700.HK'],
          data: { symbol: '700.HK', lastPrice: 450.5 },
        });

      // 调用按提供商批量处理
      await (service as any).processBatchByProvider('longport', 'stream-stock-quote', quotes);

      // 验证预加载被调用 - 修正参数顺序
      const expectedSymbols = quotes.map(q => q.rawData.symbol);
      expect(mockBatchOptimizationService.preloadSymbolMappings).toHaveBeenCalledWith(
        expectedSymbols,
        'standard',
        'longport'
      );
    });

    it('应该在符号数量少于阈值时跳过批量预加载', async () => {
      const quotes = [mockQuoteData]; // 只有1个，小于阈值10

      // Mock 数据处理
      jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockResolvedValue({
          symbols: ['700.HK'],
          data: { symbol: '700.HK', lastPrice: 450.5 },
        });

      // 调用按提供商批量处理
      await (service as any).processBatchByProvider('longport', 'stream-stock-quote', quotes);

      // 验证预加载未被调用
      expect(mockBatchOptimizationService.preloadSymbolMappings).not.toHaveBeenCalled();
    });
  });

  describe('单条数据处理优化', () => {
    it('应该直接处理单条数据而不进行批量优化', async () => {
      const quotes = [mockQuoteData]; // 只有一条数据

      // Mock 数据处理
      const processAndCacheDataSpy = jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockResolvedValue({
          symbols: ['700.HK'],
          data: { symbol: '700.HK', lastPrice: 450.5 },
        });

      // 调用批量处理方法
      await (service as any).processBatchQuotes(quotes);

      // 验证直接调用了单条处理，而不是批量处理
      expect(processAndCacheDataSpy).toHaveBeenCalledWith(
        mockQuoteData.rawData,
        mockQuoteData.providerName,
        mockQuoteData.wsCapabilityType
      );

      // 验证性能指标记录了单条处理
      expect(mockPerformanceMetrics.recordBatchProcessed).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        true
      );

      processAndCacheDataSpy.mockRestore();
    });
  });

  describe('性能指标集成', () => {
    it('应该在所有批量操作中正确记录性能指标', async () => {
      // 使用 ≥10 个符号以触发批量预加载 (batchSizeThreshold = 10)
      const quotes = Array.from({ length: 15 }, (_, i) => ({
        ...mockQuoteData,
        rawData: { ...mockQuoteData.rawData, symbol: `${700 + i}.HK` },
      }));

      // Mock 服务响应 - 为15个符号设置映射
      const mappingResults = new Map();
      quotes.forEach((quote, i) => {
        const symbol = `${700 + i}.HK`;
        mappingResults.set(symbol, `00${700 + i}.HK`);
      });
      mockBatchOptimizationService.preloadSymbolMappings.mockResolvedValue(mappingResults);
      
      jest.spyOn(service as any, 'processAndCacheProviderData')
        .mockResolvedValue({
          symbols: ['700.HK'],
          data: { symbol: '700.HK', lastPrice: 450.5 },
        });

      // 执行批量处理
      await (service as any).processBatchQuotes(quotes);

      // 验证所有相关的性能指标都被记录
      expect(mockPerformanceMetrics.recordBatchProcessed).toHaveBeenCalled();
      expect(mockPerformanceMetrics.recordBatchPreloadCacheHit).toHaveBeenCalled();
    });
  });
});