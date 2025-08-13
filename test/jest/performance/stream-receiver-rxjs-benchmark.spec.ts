/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * StreamReceiver RxJS bufferTime 性能基准测试
 * 
 * 验证批量处理优化的性能提升效果
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverService } from '../../../src/core/stream/stream-receiver/services/stream-receiver.service';
import { CapabilityRegistryService } from '../../../src/providers/services/capability-registry.service';
import { SymbolMapperService } from '../../../src/core/public/symbol-mapper/services/symbol-mapper.service';
import { FlexibleMappingRuleService } from '../../../src/core/public/data-mapper/services/flexible-mapping-rule.service';
import { TransformerService } from '../../../src/core/public/transformer/services/transformer.service';
import { BatchOptimizationService } from '../../../src/core/public/shared/services/batch-optimization.service';
import { FeatureFlags } from '../../../src/common/config/feature-flags.config';
import { StreamPerformanceMetrics } from '../../../src/core/public/shared/services/stream-performance-metrics.service';

// Performance test configuration
const PERFORMANCE_TEST_CONFIG = {
  SMALL_BATCH_SIZE: 10,
  MEDIUM_BATCH_SIZE: 100,
  LARGE_BATCH_SIZE: 1000,
  PERFORMANCE_THRESHOLD_MS: {
    SMALL: 50,    // 10条数据应在50ms内完成
    MEDIUM: 200,  // 100条数据应在200ms内完成
    LARGE: 1000,  // 1000条数据应在1s内完成
  }
};

// Mock services with performance-focused implementations
const createMockServices = () => ({
  mockCapabilityRegistry: {
    getBestStreamProvider: jest.fn().mockReturnValue('longport'),
    getStreamCapability: jest.fn(),
    getProvider: jest.fn(),
  },

  mockSymbolMapperService: {
    transformSymbols: jest.fn().mockResolvedValue({
      transformedSymbols: { '700.HK': '00700.HK' }
    }),
    mapSymbol: jest.fn().mockImplementation((symbol) => 
      Promise.resolve(symbol.replace('.', '_'))
    ),
  },

  mockFlexibleMappingRuleService: {
    findBestMatchingRule: jest.fn().mockResolvedValue({
      id: 'test-rule',
      fieldMappings: [],
      provider: 'longport',
      apiType: 'stream',
      transDataRuleListType: 'quote_fields',
      sourceTemplateId: 'template1',
      name: 'Test Rule'
    }),
  },

  mockTransformerService: {
    transform: jest.fn().mockResolvedValue({
      transformedData: { symbol: 'test', lastPrice: 100 }
    }),
  },

  mockBatchOptimizationService: {
    preloadSymbolMappings: jest.fn().mockImplementation((symbols) => {
      // 模拟快速批量预加载
      const result = new Map();
      symbols.forEach(symbol => {
        result.set(symbol, symbol.replace('.', '_'));
      });
      return Promise.resolve(result);
    }),
  },

  mockPerformanceMetrics: {
    recordBatchProcessed: jest.fn(),
    recordBatchPreloadCacheHit: jest.fn(),
    recordSymbolProcessed: jest.fn(),
    recordConnectionChange: jest.fn(),
  }
});

describe('StreamReceiver RxJS Batch Processing - Performance Benchmarks', () => {
  let batchEnabledService: StreamReceiverService;
  let batchDisabledService: StreamReceiverService;
  let performanceMetrics: StreamPerformanceMetrics;

  beforeAll(async () => {
    const mocks = createMockServices();

    // 创建启用批量处理的服务实例
    const batchEnabledModule: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        { provide: CapabilityRegistryService, useValue: mocks.mockCapabilityRegistry },
        { provide: SymbolMapperService, useValue: mocks.mockSymbolMapperService },
        { provide: FlexibleMappingRuleService, useValue: mocks.mockFlexibleMappingRuleService },
        { provide: TransformerService, useValue: mocks.mockTransformerService },
        { provide: BatchOptimizationService, useValue: mocks.mockBatchOptimizationService },
        {
          provide: FeatureFlags,
          useValue: {
            batchProcessingEnabled: true,
            batchSizeThreshold: 10,
            batchTimeWindowMs: 1,
            isPerformanceOptimizationEnabled: () => true,
          },
        },
        { provide: StreamPerformanceMetrics, useValue: mocks.mockPerformanceMetrics },
      ],
    }).compile();

    // 创建禁用批量处理的服务实例（对比基准）
    const batchDisabledModule: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        { provide: CapabilityRegistryService, useValue: mocks.mockCapabilityRegistry },
        { provide: SymbolMapperService, useValue: mocks.mockSymbolMapperService },
        { provide: FlexibleMappingRuleService, useValue: mocks.mockFlexibleMappingRuleService },
        { provide: TransformerService, useValue: mocks.mockTransformerService },
        { provide: BatchOptimizationService, useValue: mocks.mockBatchOptimizationService },
        {
          provide: FeatureFlags,
          useValue: {
            batchProcessingEnabled: false,
            batchSizeThreshold: 10,
            batchTimeWindowMs: 1,
            isPerformanceOptimizationEnabled: () => true,
          },
        },
        { provide: StreamPerformanceMetrics, useValue: mocks.mockPerformanceMetrics },
      ],
    }).compile();

    batchEnabledService = batchEnabledModule.get<StreamReceiverService>(StreamReceiverService);
    batchDisabledService = batchDisabledModule.get<StreamReceiverService>(StreamReceiverService);
    performanceMetrics = batchEnabledModule.get<StreamPerformanceMetrics>(StreamPerformanceMetrics);

    // 预热服务实例
    await warmupServices(batchEnabledService, batchDisabledService);
  });

  describe('小批量处理性能测试 (10条数据)', () => {
    it('应该在50ms内完成10条报价数据的批量处理', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.SMALL_BATCH_SIZE);
      
      const startTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TEST_CONFIG.PERFORMANCE_THRESHOLD_MS.SMALL);
      
      console.log(`小批量处理 (${PERFORMANCE_TEST_CONFIG.SMALL_BATCH_SIZE}条): ${processingTime.toFixed(2)}ms`);
    }, 10000);

    it('批量模式应该比传统模式快至少20%', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.SMALL_BATCH_SIZE);

      // 测试批量模式
      const batchStartTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const batchProcessingTime = performance.now() - batchStartTime;

      // 测试传统模式（模拟逐个处理）
      const traditionalStartTime = performance.now();
      for (const quote of quotes) {
        await (batchDisabledService as any).processAndCacheProviderData(
          quote.rawData, quote.providerName, quote.wsCapabilityType
        );
      }
      const traditionalProcessingTime = performance.now() - traditionalStartTime;

      const improvementRatio = (traditionalProcessingTime - batchProcessingTime) / traditionalProcessingTime;
      
      expect(improvementRatio).toBeGreaterThan(0.2); // 至少20%提升
      
      console.log(`性能提升: ${(improvementRatio * 100).toFixed(1)}% (批量: ${batchProcessingTime.toFixed(2)}ms vs 传统: ${traditionalProcessingTime.toFixed(2)}ms)`);
    }, 15000);
  });

  describe('中批量处理性能测试 (100条数据)', () => {
    it('应该在200ms内完成100条报价数据的批量处理', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.MEDIUM_BATCH_SIZE);
      
      const startTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TEST_CONFIG.PERFORMANCE_THRESHOLD_MS.MEDIUM);
      
      console.log(`中批量处理 (${PERFORMANCE_TEST_CONFIG.MEDIUM_BATCH_SIZE}条): ${processingTime.toFixed(2)}ms`);
    }, 15000);

    it('平均每条数据处理时间应少于2ms', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.MEDIUM_BATCH_SIZE);
      
      const startTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const processingTime = performance.now() - startTime;

      const avgTimePerQuote = processingTime / PERFORMANCE_TEST_CONFIG.MEDIUM_BATCH_SIZE;
      expect(avgTimePerQuote).toBeLessThan(2);
      
      console.log(`平均每条处理时间: ${avgTimePerQuote.toFixed(3)}ms`);
    }, 15000);
  });

  describe('大批量处理性能测试 (1000条数据)', () => {
    it('应该在1s内完成1000条报价数据的批量处理', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.LARGE_BATCH_SIZE);
      
      const startTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TEST_CONFIG.PERFORMANCE_THRESHOLD_MS.LARGE);
      
      console.log(`大批量处理 (${PERFORMANCE_TEST_CONFIG.LARGE_BATCH_SIZE}条): ${processingTime.toFixed(2)}ms`);
    }, 20000);

    it('吞吐量应达到每秒1000+条数据', async () => {
      const quotes = generateQuoteData(PERFORMANCE_TEST_CONFIG.LARGE_BATCH_SIZE);
      
      const startTime = performance.now();
      await (batchEnabledService as any).processBatchQuotes(quotes);
      const processingTime = performance.now() - startTime;

      const throughputPerSecond = (PERFORMANCE_TEST_CONFIG.LARGE_BATCH_SIZE / processingTime) * 1000;
      expect(throughputPerSecond).toBeGreaterThan(1000);
      
      console.log(`批量处理吞吐量: ${throughputPerSecond.toFixed(0)} 条/秒`);
    }, 20000);
  });

  describe('内存使用效率测试', () => {
    it('批量处理不应导致显著的内存泄漏', async () => {
      const initialMemoryUsage = process.memoryUsage().heapUsed;
      
      // 执行多次批量处理
      for (let i = 0; i < 10; i++) {
        const quotes = generateQuoteData(100);
        await (batchEnabledService as any).processBatchQuotes(quotes);
      }
      
      // 强制垃圾回收（如果可用）
      if ((global as any).gc) {
        (global as any).gc();
      }
      
      const finalMemoryUsage = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemoryUsage - initialMemoryUsage;
      const memoryIncreaseRatio = memoryIncrease / initialMemoryUsage;
      
      // 内存增长不应超过50%
      expect(memoryIncreaseRatio).toBeLessThan(0.5);
      
      console.log(`内存使用变化: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${(memoryIncreaseRatio * 100).toFixed(1)}%)`);
    }, 30000);
  });

  describe('并发性能测试', () => {
    it('应该能够处理并发的批量请求', async () => {
      const concurrentBatches = 5;
      const quotesPerBatch = 50;
      
      const startTime = performance.now();
      
      const batchPromises = Array.from({ length: concurrentBatches }, () => {
        const quotes = generateQuoteData(quotesPerBatch);
        return (batchEnabledService as any).processBatchQuotes(quotes);
      });
      
      await Promise.all(batchPromises);
      const processingTime = performance.now() - startTime;
      
      const totalQuotes = concurrentBatches * quotesPerBatch;
      const avgTimePerQuote = processingTime / totalQuotes;
      
      expect(avgTimePerQuote).toBeLessThan(2);
      expect(processingTime).toBeLessThan(1000); // 1秒内完成
      
      console.log(`并发处理 ${concurrentBatches}个批次, 共${totalQuotes}条: ${processingTime.toFixed(2)}ms`);
      console.log(`并发处理平均每条时间: ${avgTimePerQuote.toFixed(3)}ms`);
    }, 20000);
  });

  describe('性能指标验证', () => {
    it('应该正确记录批量处理性能指标', async () => {
      const quotes = generateQuoteData(50);
      
      await (batchEnabledService as any).processBatchQuotes(quotes);
      
      // 验证性能指标被正确调用
      expect(performanceMetrics.recordBatchProcessed).toHaveBeenCalledWith(
        50,
        expect.any(Number),
        true
      );
      
      expect(performanceMetrics.recordBatchPreloadCacheHit).toHaveBeenCalled();
    });
  });
});

/**
 * 生成测试用的报价数据
 */
function generateQuoteData(count: number) {
  const symbols = ['700.HK', '09988.HK', 'AAPL.US', 'TSLA.US', 'MSFT.US', 'GOOGL.US'];
  
  return Array.from({ length: count }, (_, index) => ({
    rawData: {
      symbol: symbols[index % symbols.length],
      last_done: 100 + Math.random() * 400,
      prev_close: 100 + Math.random() * 400,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now() + index,
    },
    providerName: 'longport',
    wsCapabilityType: 'stream-stock-quote',
    timestamp: Date.now() + index,
  }));
}

/**
 * 预热服务实例以获得更准确的性能测试结果
 */
async function warmupServices(...services: StreamReceiverService[]) {
  const warmupQuotes = generateQuoteData(5);
  
  for (const service of services) {
    try {
      await (service as any).processBatchQuotes(warmupQuotes);
    } catch (error) {
      // 预热过程中的错误可以忽略
    }
  }
}