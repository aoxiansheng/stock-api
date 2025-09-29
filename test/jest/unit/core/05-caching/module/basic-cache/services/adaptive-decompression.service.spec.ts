import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdaptiveDecompressionService, ConcurrencyStrategy, DecompressionMetrics } from '@core/05-caching/module/basic-cache/services/adaptive-decompression.service';

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
    DECOMPRESSION: {
      MAX_CONCURRENT: 10,
    },
  },
}));

describe('AdaptiveDecompressionService', () => {
  let service: AdaptiveDecompressionService;
  let module: TestingModule;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs = {
          'cache.decompression.maxConcurrent': 10,
          'cache.decompression.strategy': ConcurrencyStrategy.ADAPTIVE,
        };
        return configs[key] || defaultValue;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        AdaptiveDecompressionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdaptiveDecompressionService>(AdaptiveDecompressionService);
    configService = module.get<ConfigService>(ConfigService);

    // Stop the performance monitoring interval to prevent interference
    await service.cleanup();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct default configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('cache.decompression.maxConcurrent', 10);
      expect(configService.get).toHaveBeenCalledWith('cache.decompression.strategy', ConcurrencyStrategy.ADAPTIVE);
    });

    it('should have logger defined', () => {
      expect((service as any).logger).toBeDefined();
    });

    it('should initialize metrics properly', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('totalOperations', 0);
      expect(metrics).toHaveProperty('successfulOperations', 0);
      expect(metrics).toHaveProperty('failedOperations', 0);
      expect(metrics).toHaveProperty('averageDuration', 0);
      expect(metrics).toHaveProperty('currentConcurrency', 0);
      expect(metrics).toHaveProperty('maxConcurrency');
      expect(metrics).toHaveProperty('queueSize', 0);
      expect(metrics).toHaveProperty('memoryUsage', 0);
      expect(metrics).toHaveProperty('cpuUsage', 0);
      expect(metrics).toHaveProperty('lastAdjustment', null);
    });
  });

  describe('decompress', () => {
    it('should decompress data successfully with normal priority', async () => {
      const testData = 'compressed-test-data';

      const result = await service.decompress(testData, 'normal');

      expect(result).toBe(testData); // Mock implementation returns input data

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
      expect(metrics.failedOperations).toBe(0);
    });

    it('should decompress data with high priority', async () => {
      const testData = 'high-priority-data';

      const result = await service.decompress(testData, 'high');

      expect(result).toBe(testData);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should decompress data with low priority', async () => {
      const testData = 'low-priority-data';

      const result = await service.decompress(testData, 'low');

      expect(result).toBe(testData);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should use normal priority as default', async () => {
      const testData = 'default-priority-data';

      const result = await service.decompress(testData);

      expect(result).toBe(testData);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should handle multiple concurrent decompression tasks', async () => {
      const tasks = Array(5).fill(null).map((_, i) =>
        service.decompress(`concurrent-data-${i}`, 'normal')
      );

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBe(`concurrent-data-${index}`);
      });

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(5);
      expect(metrics.successfulOperations).toBe(5);
      expect(metrics.failedOperations).toBe(0);
    });

    it('should handle empty data', async () => {
      const result = await service.decompress('');

      expect(result).toBe('');

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });
  });

  describe('Concurrency Strategy Management', () => {
    it('should set concurrency strategy correctly', () => {
      service.setConcurrencyStrategy(ConcurrencyStrategy.CONSERVATIVE);

      // Verify strategy was set (this would need to be exposed or tested indirectly)
      expect(() => service.setConcurrencyStrategy(ConcurrencyStrategy.CONSERVATIVE)).not.toThrow();
    });

    it('should handle all concurrency strategies', () => {
      const strategies = [
        ConcurrencyStrategy.CONSERVATIVE,
        ConcurrencyStrategy.BALANCED,
        ConcurrencyStrategy.AGGRESSIVE,
        ConcurrencyStrategy.ADAPTIVE,
      ];

      strategies.forEach(strategy => {
        expect(() => service.setConcurrencyStrategy(strategy)).not.toThrow();
      });
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should provide comprehensive metrics', () => {
      const metrics = service.getMetrics();

      const expectedProperties = [
        'totalOperations',
        'successfulOperations',
        'failedOperations',
        'averageDuration',
        'currentConcurrency',
        'maxConcurrency',
        'queueSize',
        'memoryUsage',
        'cpuUsage',
        'lastAdjustment'
      ];

      expectedProperties.forEach(prop => {
        expect(metrics).toHaveProperty(prop);
      });
    });

    it('should update metrics after operations', async () => {
      const initialMetrics = service.getMetrics();
      expect(initialMetrics.totalOperations).toBe(0);

      await service.decompress('test-data');

      const updatedMetrics = service.getMetrics();
      expect(updatedMetrics.totalOperations).toBe(1);
      expect(updatedMetrics.successfulOperations).toBe(1);
      expect(updatedMetrics.averageDuration).toBeGreaterThan(0);
    });

    it('should provide health status', () => {
      const healthStatus = service.getHealthStatus();

      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('metrics');
      expect(healthStatus).toHaveProperty('issues');

      expect(typeof healthStatus.healthy).toBe('boolean');
      expect(Array.isArray(healthStatus.issues)).toBe(true);
      expect(healthStatus.metrics).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle extremely large data', async () => {
      const largeData = 'x'.repeat(100000);

      const result = await service.decompress(largeData);

      expect(result).toBe(largeData);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should handle Unicode data correctly', async () => {
      const unicodeData = '你好世界 🌍 مرحبا بالعالم';

      const result = await service.decompress(unicodeData);

      expect(result).toBe(unicodeData);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should cleanup resources properly', async () => {
      // Add some tasks first
      await service.decompress('test-data');

      const initialMetrics = service.getMetrics();
      expect(initialMetrics.totalOperations).toBe(1);

      // Cleanup should not throw
      await expect(service.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when no tasks are active', async () => {
      await expect(service.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing configuration gracefully', async () => {
      const mockConfigServiceEmpty = {
        get: jest.fn(() => undefined),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          AdaptiveDecompressionService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceEmpty,
          },
        ],
      }).compile();

      const testService = testModule.get<AdaptiveDecompressionService>(AdaptiveDecompressionService);

      expect(testService).toBeDefined();

      // Should still work with defaults
      const result = await testService.decompress('test-data');
      expect(result).toBe('test-data');

      await testService.cleanup();
      await testModule.close();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive operations', async () => {
      const rapidTasks = Array(20).fill(null).map(async (_, i) => {
        return service.decompress(`rapid-${i}`, i % 3 === 0 ? 'high' : 'normal');
      });

      const results = await Promise.all(rapidTasks);

      expect(results).toHaveLength(20);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(20);
      expect(metrics.successfulOperations).toBe(20);
      expect(metrics.failedOperations).toBe(0);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      const loadTasks = Array(30).fill(null).map((_, i) =>
        service.decompress(`load-test-${i}`)
      );

      await Promise.all(loadTasks);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (5 seconds for 30 tasks)
      expect(duration).toBeLessThan(5000);

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(30);
      expect(metrics.successfulOperations).toBe(30);
    });
  });
});