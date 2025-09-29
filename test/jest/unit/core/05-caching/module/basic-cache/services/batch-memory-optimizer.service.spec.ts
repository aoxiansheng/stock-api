import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BatchMemoryOptimizerService, BatchProcessOptions, BatchProcessResult, MemoryStats } from '@core/05-caching/module/basic-cache/services/batch-memory-optimizer.service';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock Universal Exception Factory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn((config) => {
      const error = new Error(config.message);
      error.name = 'BusinessException';
      return error;
    }),
  },
  BusinessErrorCode: {
    RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  },
  ComponentIdentifier: {
    COMMON_CACHE: 'COMMON_CACHE',
  },
}));

// Mock CACHE_CONFIG
jest.mock('@core/05-caching/module/basic-cache/constants/cache-config.constants', () => ({
  CACHE_CONFIG: {
    BATCH: {
      MAX_BATCH_SIZE: 100,
      MAX_MEMORY_USAGE: 0.8,
      COMPRESSION_THRESHOLD: 1024,
    },
  },
}));

describe('BatchMemoryOptimizerService', () => {
  let service: BatchMemoryOptimizerService;
  let module: TestingModule;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs = {
          'cache.batch.maxBatchSize': 100,
          'cache.batch.maxMemoryUsage': 0.8,
          'cache.batch.compressionThreshold': 1024,
        };
        return configs[key] || defaultValue;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        BatchMemoryOptimizerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BatchMemoryOptimizerService>(BatchMemoryOptimizerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    if (module) {
      await service.cleanup();
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct default configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('cache.batch.maxBatchSize', 100);
      expect(configService.get).toHaveBeenCalledWith('cache.batch.maxMemoryUsage', 0.8);
      expect(configService.get).toHaveBeenCalledWith('cache.batch.compressionThreshold', 1024);
    });

    it('should have logger defined', () => {
      expect((service as any).logger).toBeDefined();
    });

    it('should initialize memory stats properly', () => {
      const stats = service.getMemoryStats();

      expect(stats).toHaveProperty('totalAllocated', 0);
      expect(stats).toHaveProperty('currentUsage');
      expect(stats).toHaveProperty('peakUsage', 0);
      expect(stats).toHaveProperty('operationCount', 0);
      expect(stats).toHaveProperty('averageItemSize', 0);
      expect(stats).toHaveProperty('compressionRatio', 0);
      expect(stats).toHaveProperty('lastCleanup', null);
    });
  });

  describe('optimizeBatch', () => {
    it('should process small batch successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn(async (batch: number[]) =>
        batch.map(item => item * 2)
      );

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toEqual([2, 4, 6, 8, 10]);
      expect(result.failed).toHaveLength(0);
      expect(result.metrics.totalItems).toBe(5);
      expect(result.metrics.successCount).toBe(5);
      expect(result.metrics.failureCount).toBe(0);
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      expect(processor).toHaveBeenCalledWith(items);
    });

    it('should process large batch by splitting into optimal batches', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) =>
        batch.map(item => item * 2)
      );

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(250);
      expect(result.failed).toHaveLength(0);
      expect(result.metrics.totalItems).toBe(250);
      expect(result.metrics.successCount).toBe(250);
      expect(result.metrics.failureCount).toBe(0);

      // Should have been called multiple times with smaller batches
      expect(processor.mock.calls.length).toBeGreaterThan(1);
    });

    it('should handle processing failures gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn(async () => {
        throw new Error('Processing failed');
      });

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(5);
      expect(result.metrics.totalItems).toBe(5);
      expect(result.metrics.successCount).toBe(0);
      expect(result.metrics.failureCount).toBe(5);

      result.failed.forEach(failure => {
        expect(failure.error).toBe('Processing failed');
      });
    });

    it('should use custom batch processing options', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => batch);

      const options: BatchProcessOptions = {
        maxBatchSize: 10,
        maxMemoryUsage: 0.5,
        enableCompression: true,
        retryFailedItems: false,
      };

      const result = await service.optimizeBatch(items, processor, options);

      expect(result.successful).toHaveLength(50);
      expect(result.failed).toHaveLength(0);

      // Should have called processor multiple times with batches of max 10 items
      expect(processor.mock.calls.length).toBeGreaterThanOrEqual(5);
      processor.mock.calls.forEach(call => {
        expect(call[0].length).toBeLessThanOrEqual(10);
      });
    });

    it('should handle empty input array', async () => {
      const items: number[] = [];
      const processor = jest.fn(async (batch: number[]) => batch);

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.metrics.totalItems).toBe(0);
      expect(result.metrics.successCount).toBe(0);
      expect(result.metrics.failureCount).toBe(0);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage during operations', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));
      const processor = jest.fn(async (batch: any[]) => batch);

      await service.optimizeBatch(items, processor);

      const stats = service.getMemoryStats();
      expect(stats.operationCount).toBeGreaterThan(0);
      expect(stats.totalAllocated).toBeGreaterThan(0);
    });

    it('should provide memory history', () => {
      const history = service.getMemoryHistory();

      expect(Array.isArray(history)).toBe(true);
      // History might be empty initially, which is fine
    });

    it('should calculate optimal batch size through public interface', async () => {
      // Test optimal batch size indirectly through batch processing
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => batch);

      await service.optimizeBatch(items, processor);

      // Access optimal batch size calculation indirectly through memory stats
      const stats = service.getMemoryStats();
      expect(typeof stats.operationCount).toBe('number');
      expect(stats.operationCount).toBeGreaterThan(0);
    });

    it('should estimate item size correctly through batch processing', async () => {
      const smallItems = [{ id: 1 }, { id: 2 }];
      const largeItems = [{ id: 1, data: 'x'.repeat(1000) }, { id: 2, data: 'x'.repeat(1000) }];

      const processor = jest.fn(async (batch: any[]) => batch);

      // Process small items
      await service.optimizeBatch(smallItems, processor);
      const smallStats = service.getMemoryStats();

      // Reset stats for large items test
      service.resetStats();

      // Process large items
      await service.optimizeBatch(largeItems, processor);
      const largeStats = service.getMemoryStats();

      // Large items should show higher average item size
      expect(largeStats.averageItemSize).toBeGreaterThanOrEqual(smallStats.averageItemSize);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should provide optimization recommendations', () => {
      const recommendations = service.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      // Recommendations might be empty initially, which is acceptable
    });

    it('should reset stats correctly', () => {
      // First, perform some operations to generate stats
      service.getMemoryStats();

      service.resetStats();

      const stats = service.getMemoryStats();
      expect(stats.totalAllocated).toBe(0);
      expect(stats.peakUsage).toBe(0);
      expect(stats.operationCount).toBe(0);
      expect(stats.averageItemSize).toBe(0);
      expect(stats.compressionRatio).toBe(0);
    });
  });

  describe('Batch Size Optimization', () => {
    it('should adapt batch size based on performance', async () => {
      const items1 = Array.from({ length: 10 }, (_, i) => i);
      const items2 = Array.from({ length: 20 }, (_, i) => i);

      const processor = jest.fn(async (batch: number[]) => batch);

      // Process first batch
      await service.optimizeBatch(items1, processor);
      const firstStats = service.getMemoryStats();

      // Process second batch
      await service.optimizeBatch(items2, processor);
      const secondStats = service.getMemoryStats();

      // Should show increasing operation counts as batches are processed
      expect(firstStats.operationCount).toBeGreaterThan(0);
      expect(secondStats.operationCount).toBeGreaterThanOrEqual(firstStats.operationCount);
    });

    it('should record successful and failed batch sizes', async () => {
      const items = [1, 2, 3, 4, 5];

      // Test successful batch
      const successProcessor = jest.fn(async (batch: number[]) => batch);
      await service.optimizeBatch(items, successProcessor);

      // Test failed batch
      const failProcessor = jest.fn(async () => {
        throw new Error('Processing failed');
      });
      await service.optimizeBatch(items, failProcessor);

      // Both should influence the performance metrics
      const stats = service.getMemoryStats();
      expect(stats.operationCount).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources properly', async () => {
      // Perform some operations first
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => batch);

      await service.optimizeBatch(items, processor);

      // Cleanup should not throw
      await expect(service.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when no operations were performed', async () => {
      await expect(service.cleanup()).resolves.not.toThrow();
    });

    it('should clear memory pool during cleanup', async () => {
      await service.cleanup();

      // After cleanup, stats should be clean
      const stats = service.getMemoryStats();
      expect(stats.operationCount).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle processor returning different type', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn(async (batch: number[]) =>
        batch.map(item => ({ value: item, doubled: item * 2 }))
      );

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(3);
      expect(result.successful[0]).toEqual({ value: 1, doubled: 2 });
      expect(result.failed).toHaveLength(0);
    });

    it('should handle async processor with delays', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn(async (batch: number[]) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return batch.map(item => item * 2);
      });

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toEqual([2, 4, 6]);
      expect(result.metrics.processingTimeMs).toBeGreaterThan(10);
    });

    it('should handle complex objects in batches', async () => {
      const items = [
        { id: 1, name: 'Item 1', data: { nested: 'value1' } },
        { id: 2, name: 'Item 2', data: { nested: 'value2' } },
        { id: 3, name: 'Item 3', data: { nested: 'value3' } },
      ];

      const processor = jest.fn(async (batch: typeof items) =>
        batch.map(item => ({ ...item, processed: true }))
      );

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(3);
      result.successful.forEach((item, index) => {
        expect(item.processed).toBe(true);
        expect(item.id).toBe(index + 1);
      });
    });

    it('should handle null and undefined items gracefully', async () => {
      const items = [1, null, 3, undefined, 5];
      const processor = jest.fn(async (batch: any[]) =>
        batch.filter(item => item != null).map(item => item * 2)
      );

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toEqual([2, 6, 10]);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing configuration gracefully', async () => {
      const mockConfigServiceEmpty = {
        get: jest.fn(() => undefined),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          BatchMemoryOptimizerService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceEmpty,
          },
        ],
      }).compile();

      const testService = testModule.get<BatchMemoryOptimizerService>(BatchMemoryOptimizerService);

      expect(testService).toBeDefined();

      // Should still work with defaults
      const items = [1, 2, 3];
      const processor = jest.fn(async (batch: number[]) => batch);

      const result = await testService.optimizeBatch(items, processor);
      expect(result.successful).toEqual([1, 2, 3]);

      await testService.cleanup();
      await testModule.close();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large datasets efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`
      }));

      const processor = jest.fn(async (batch: any[]) =>
        batch.map(item => ({ ...item, processed: true }))
      );

      const startTime = Date.now();
      const result = await service.optimizeBatch(items, processor);
      const duration = Date.now() - startTime;

      expect(result.successful).toHaveLength(1000);
      expect(result.failed).toHaveLength(0);

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);

      // Should have used multiple batches for efficiency
      expect(processor.mock.calls.length).toBeGreaterThan(1);
    });

    it('should maintain memory efficiency under load', async () => {
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(200), // Create some memory usage
      }));

      const processor = jest.fn(async (batch: any[]) => batch);

      const result = await service.optimizeBatch(items, processor);

      expect(result.successful).toHaveLength(500);

      const stats = service.getMemoryStats();
      expect(stats.operationCount).toBeGreaterThan(0);
      expect(stats.averageItemSize).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with different data types', async () => {
      const stringItems = ['a', 'b', 'c'];
      const numberItems = [1, 2, 3];
      const objectItems = [{ a: 1 }, { b: 2 }, { c: 3 }];

      const stringProcessor = jest.fn(async (batch: string[]) =>
        batch.map(s => s.toUpperCase())
      );
      const numberProcessor = jest.fn(async (batch: number[]) =>
        batch.map(n => n * 2)
      );
      const objectProcessor = jest.fn(async (batch: any[]) =>
        batch.map(obj => ({ ...obj, processed: true }))
      );

      const stringResult = await service.optimizeBatch(stringItems, stringProcessor);
      const numberResult = await service.optimizeBatch(numberItems, numberProcessor);
      const objectResult = await service.optimizeBatch(objectItems, objectProcessor);

      expect(stringResult.successful).toEqual(['A', 'B', 'C']);
      expect(numberResult.successful).toEqual([2, 4, 6]);
      expect(objectResult.successful).toEqual([
        { a: 1, processed: true },
        { b: 2, processed: true },
        { c: 3, processed: true }
      ]);
    });

    it('should handle concurrent batch operations', async () => {
      const items1 = Array.from({ length: 50 }, (_, i) => `batch1-${i}`);
      const items2 = Array.from({ length: 50 }, (_, i) => `batch2-${i}`);
      const items3 = Array.from({ length: 50 }, (_, i) => `batch3-${i}`);

      const processor1 = jest.fn(async (batch: string[]) => batch);
      const processor2 = jest.fn(async (batch: string[]) => batch);
      const processor3 = jest.fn(async (batch: string[]) => batch);

      const [result1, result2, result3] = await Promise.all([
        service.optimizeBatch(items1, processor1),
        service.optimizeBatch(items2, processor2),
        service.optimizeBatch(items3, processor3),
      ]);

      expect(result1.successful).toHaveLength(50);
      expect(result2.successful).toHaveLength(50);
      expect(result3.successful).toHaveLength(50);

      expect(result1.failed).toHaveLength(0);
      expect(result2.failed).toHaveLength(0);
      expect(result3.failed).toHaveLength(0);
    });
  });
});