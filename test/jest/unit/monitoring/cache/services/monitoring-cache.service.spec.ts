import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringCacheService } from '../../../../../../src/monitoring/cache/monitoring-cache.service';
import { CacheService } from '../../../../../../src/cache/services/cache.service';

describe('MonitoringCacheService', () => {
  let service: MonitoringCacheService;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheServiceImpl = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
      getOrSet: jest.fn(),
      setAdd: jest.fn(),
      setMembers: jest.fn(),
      expire: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringCacheService,
        {
          provide: CacheService,
          useValue: mockCacheServiceImpl,
        },
      ],
    }).compile();

    service = module.get<MonitoringCacheService>(MonitoringCacheService);
    mockCacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct namespace from config', () => {
      expect(service['config'].cache.namespace).toBe('monitoring');
    });

    it('should have correct compression threshold from config', () => {
      expect(service['config'].cache.compressionThreshold).toBe(1024);
    });
    
    it('should use test environment configuration', () => {
      // 在测试环境中，TTL值应该被缩短
      expect(service['config'].cache.ttl.health).toBe(10);
      expect(service['config'].cache.ttl.trend).toBe(20);
      expect(service['config'].cache.ttl.performance).toBe(10);
      expect(service['config'].cache.batchSize).toBe(3);
      expect(service['config'].events.enableAutoAnalysis).toBe(false);
    });
  });

  describe('Health Data Operations', () => {
    describe('getHealthData', () => {
      it('should get health data successfully', async () => {
        const testData = { score: 85, status: 'healthy' };
        mockCacheService.get.mockResolvedValue(testData);

        const result = await service.getHealthData<typeof testData>('test-key');

        expect(result).toEqual(testData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:health:test-key');
      });

      it('should return null when cache miss', async () => {
        mockCacheService.get.mockResolvedValue(null);

        const result = await service.getHealthData('test-key');

        expect(result).toBeNull();
      });

      it('should handle cache errors gracefully', async () => {
        mockCacheService.get.mockRejectedValue(new Error('Cache error'));

        const result = await service.getHealthData('test-key');

        expect(result).toBeNull();
      });
    });

    describe('setHealthData', () => {
      it('should set health data with correct TTL', async () => {
        const testData = { score: 85, status: 'healthy' };
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);

        await service.setHealthData('test-key', testData);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          'monitoring:health:test-key',
          testData,
          {
            ttl: 10, // 测试环境中的health TTL
            compressionThreshold: 1024,
            serializer: 'json'
          }
        );
        expect(mockCacheService.setAdd).toHaveBeenCalledWith(
          'monitoring:index:health',
          'monitoring:health:test-key'
        );
      });

      it('should handle set errors gracefully', async () => {
        mockCacheService.set.mockRejectedValue(new Error('Set error'));

        await expect(service.setHealthData('test-key', { data: 'test' })).resolves.not.toThrow();
      });
    });

    describe('getOrSetHealthData', () => {
      it('should return cached data when cache hit', async () => {
        const testData = { score: 85 };
        const factory = jest.fn().mockResolvedValue(testData);
        mockCacheService.get.mockResolvedValue(testData); // 模拟缓存命中

        const result = await service.getOrSetHealthData('test-key', factory);

        expect(result).toEqual(testData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:health:test-key');
        expect(factory).not.toHaveBeenCalled(); // 缓存命中时不调用factory
      });
      
      it('should call factory and cache result when cache miss', async () => {
        const testData = { score: 85 };
        const factory = jest.fn().mockResolvedValue(testData);
        mockCacheService.get.mockResolvedValue(null); // 模拟缓存未命中
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);

        const result = await service.getOrSetHealthData('test-key', factory);

        expect(result).toEqual(testData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:health:test-key');
        expect(factory).toHaveBeenCalled(); // 未命中时调用factory
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'monitoring:health:test-key',
          testData,
          { ttl: 10, compressionThreshold: 1024 }
        );
      });

      it('should handle cache failure gracefully and fallback to factory', async () => {
        const testData = { score: 85 };
        const factory = jest.fn().mockResolvedValue(testData);
        mockCacheService.get.mockRejectedValue(new Error('Cache error'));

        const result = await service.getOrSetHealthData('test-key', factory);

        expect(result).toEqual(testData);
        expect(factory).toHaveBeenCalled();
      });
    });
  });

  describe('Trend Data Operations', () => {
    describe('getTrendData', () => {
      it('should get trend data with correct cache key', async () => {
        const trendData = { responseTime: { current: 100, trend: 'stable' } };
        mockCacheService.get.mockResolvedValue(trendData);

        const result = await service.getTrendData('performance-trends');

        expect(result).toEqual(trendData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:trend:performance-trends');
      });
    });

    describe('setTrendData', () => {
      it('should set trend data with correct TTL (test env: 20s)', async () => {
        const trendData = { responseTime: { current: 100 } };
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);

        await service.setTrendData('performance-trends', trendData);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          'monitoring:trend:performance-trends',
          trendData,
          {
            ttl: 20, // 测试环境中的trend TTL
            compressionThreshold: 1024,
            serializer: 'json'
          }
        );
      });
    });

    describe('getOrSetTrendData', () => {
      it('should use correct TTL for trend data', async () => {
        const trendData = { trends: [] };
        const factory = jest.fn().mockResolvedValue(trendData);
        mockCacheService.getOrSet.mockResolvedValue(trendData);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);

        await service.getOrSetTrendData('test-trends', factory);

        expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
          'monitoring:trend:test-trends',
          factory,
          { ttl: 20, compressionThreshold: 1024 } // 测试环境TTL
        );
      });
    });
  });

  describe('Performance Data Operations', () => {
    describe('getPerformanceData', () => {
      it('should get performance data with correct cache key', async () => {
        const perfData = { metrics: { cpu: 50, memory: 60 } };
        mockCacheService.get.mockResolvedValue(perfData);

        const result = await service.getPerformanceData('system-metrics');

        expect(result).toEqual(perfData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:performance:system-metrics');
      });
    });

    describe('setPerformanceData', () => {
      it('should set performance data with correct TTL (3 minutes)', async () => {
        const perfData = { metrics: { cpu: 50 } };
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);

        await service.setPerformanceData('system-metrics', perfData);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          'monitoring:performance:system-metrics',
          perfData,
          {
            ttl: 10, // 测试环境中的performance TTL
            compressionThreshold: 1024,
            serializer: 'json'
          }
        );
      });
    });

    describe('getOrSetPerformanceData', () => {
      it('should use shorter lock TTL for performance data', async () => {
        const perfData = { cpu: 45 };
        const factory = jest.fn().mockResolvedValue(perfData);
        mockCacheService.getOrSet.mockResolvedValue(perfData);

        await service.getOrSetPerformanceData('cpu-metrics', factory);

        expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
          'monitoring:performance:cpu-metrics',
          factory,
          { ttl: 10, compressionThreshold: 1024 } // 测试环境TTL
        );
      });
    });
  });

  describe('Cache Invalidation', () => {
    describe('invalidateHealthCache', () => {
      it('should invalidate health cache using key index', async () => {
        const mockKeys = ['monitoring:health:key1', 'monitoring:health:key2'];
        mockCacheService.setMembers.mockResolvedValue(mockKeys);
        mockCacheService.del.mockResolvedValue(1);

        await service.invalidateHealthCache();

        expect(mockCacheService.setMembers).toHaveBeenCalledWith('monitoring:index:health');
        expect(mockCacheService.del).toHaveBeenCalledTimes(3); // 2 data keys + 1 index key
      });

      it('should fallback to pattern deletion on index failure', async () => {
        mockCacheService.setMembers.mockRejectedValue(new Error('Index error'));
        mockCacheService.delByPattern.mockResolvedValue(undefined);

        await service.invalidateHealthCache();

        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('monitoring:health:*');
      });
    });

    describe('invalidateTrendCache', () => {
      it('should invalidate trend cache', async () => {
        const mockKeys = ['monitoring:trend:key1'];
        mockCacheService.setMembers.mockResolvedValue(mockKeys);
        mockCacheService.del.mockResolvedValue(1);

        await service.invalidateTrendCache();

        expect(mockCacheService.setMembers).toHaveBeenCalledWith('monitoring:index:trend');
      });
    });

    describe('invalidatePerformanceCache', () => {
      it('should invalidate performance cache', async () => {
        const mockKeys = ['monitoring:performance:key1'];
        mockCacheService.setMembers.mockResolvedValue(mockKeys);
        mockCacheService.del.mockResolvedValue(1);

        await service.invalidatePerformanceCache();

        expect(mockCacheService.setMembers).toHaveBeenCalledWith('monitoring:index:performance');
      });
    });

    describe('invalidateAllMonitoringCache', () => {
      it('should invalidate all monitoring cache', async () => {
        mockCacheService.delByPattern.mockResolvedValue(undefined);

        await service.invalidateAllMonitoringCache();

        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('monitoring:*');
      });
    });
  });

  describe('Health Check', () => {
    describe('healthCheck', () => {
      it('should return healthy status when cache operations succeed', async () => {
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.get.mockResolvedValue({ timestamp: Date.now() });

        const result = await service.healthCheck();

        expect(result.status).toBe('healthy');
        expect(result.metrics).toHaveProperty('hitRate');
        expect(result.metrics).toHaveProperty('errorRate');
        expect(result.metrics).toHaveProperty('uptime');
        expect(result.metrics).toHaveProperty('latency');
      });

      it('should return unhealthy status when cache operations fail', async () => {
        mockCacheService.set.mockRejectedValue(new Error('Cache down'));

        const result = await service.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.metrics.errorRate).toBe(1);
      });

      it('should return degraded status with high error rate', async () => {
        // Simulate scenario with high error rate
        service['metrics'].operations.hits = 80;
        service['metrics'].operations.misses = 20;
        service['metrics'].operations.errors = 15; // 15% error rate

        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.get.mockResolvedValue(null);

        const result = await service.healthCheck();

        expect(result.status).toBe('degraded');
        expect(result.metrics.errorRate).toBeGreaterThan(0.1);
      });
    });
  });

  describe('Performance Metrics', () => {
    describe('getMetrics', () => {
      it('should return correct metrics structure', () => {
        // Setup some mock metrics
        service['metrics'].operations.hits = 100;
        service['metrics'].operations.misses = 20;
        service['metrics'].operations.errors = 5;
        service['metrics'].operationTimes = [10, 20, 30, 40, 50];

        const metrics = service.getMetrics();

        expect(metrics).toHaveProperty('operations');
        expect(metrics).toHaveProperty('latency');
        expect(metrics).toHaveProperty('uptime');
        expect(metrics).toHaveProperty('status');

        expect(metrics.operations.total).toBe(120);
        expect(metrics.operations.hitRate).toBe(100 / 120);
        expect(metrics.operations.errorRate).toBe(5 / 120);
      });

      it('should calculate correct latency percentiles', () => {
        service['metrics'].operationTimes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

        const metrics = service.getMetrics();

        expect(metrics.latency.p50).toBe(50);
        expect(metrics.latency.p95).toBe(90);
        expect(metrics.latency.p99).toBe(90);
        expect(metrics.latency.avg).toBe(55);
      });

      it('should handle empty operation times', () => {
        service['metrics'].operationTimes = [];

        const metrics = service.getMetrics();

        expect(metrics.latency.p50).toBe(0);
        expect(metrics.latency.p95).toBe(0);
        expect(metrics.latency.p99).toBe(0);
        expect(metrics.latency.avg).toBe(0);
      });
    });
  });

  describe('Private Methods', () => {
    describe('buildKey', () => {
      it('should build correct cache key format', () => {
        const key = service['buildKey']('health', 'test-key');
        expect(key).toBe('monitoring:health:test-key');
      });
      
      it('should validate input parameters', () => {
        // 测试空值验证
        expect(() => service['buildKey']('', 'test')).toThrow('监控缓存键类别无效');
        expect(() => service['buildKey']('health', '')).toThrow('监控缓存键名称无效');
        expect(() => service['buildKey'](null as any, 'test')).toThrow('监控缓存键类别无效');
        expect(() => service['buildKey']('health', null as any)).toThrow('监控缓存键名称无效');
      });
      
      it('should reject forbidden characters', () => {
        expect(() => service['buildKey']('health:invalid', 'test')).toThrow('禁止字符');
        expect(() => service['buildKey']('health', 'test*key')).toThrow('禁止字符');
        expect(() => service['buildKey']('health', 'test key')).toThrow('禁止字符');
        expect(() => service['buildKey']('health[0]', 'test')).toThrow('禁止字符');
      });
      
      it('should reject overly long keys', () => {
        const longCategory = 'a'.repeat(51);
        const longKey = 'b'.repeat(101);
        
        expect(() => service['buildKey'](longCategory, 'test')).toThrow('过长');
        expect(() => service['buildKey']('health', longKey)).toThrow('过长');
      });
    });

    describe('getTTL', () => {
      it('should return correct TTL for each category (test environment)', () => {
        // 测试环境中的TTL值
        expect(service['getTTL']('health')).toBe(10);
        expect(service['getTTL']('trend')).toBe(20);
        expect(service['getTTL']('performance')).toBe(10);
        expect(service['getTTL']('alert')).toBe(5);
        expect(service['getTTL']('cache_stats')).toBe(10);
        expect(service['getTTL']('unknown')).toBe(10); // 默认使用health TTL
      });
    });

    describe('recordOperationTime', () => {
      it('should record operation time', () => {
        service['recordOperationTime'](100);
        
        expect(service['metrics'].operationTimes).toContain(100);
      });

      it('should maintain maximum 1000 operation times', () => {
        // Fill with 1005 times
        for (let i = 0; i < 1005; i++) {
          service['recordOperationTime'](i);
        }
        
        expect(service['metrics'].operationTimes.length).toBe(1000);
        // Should contain the latest 1000 (5-1004)
        expect(service['metrics'].operationTimes[0]).toBe(5);
        expect(service['metrics'].operationTimes[999]).toBe(1004);
      });
    });
    
    describe('Configuration Integration', () => {
      it('should use environment-specific configuration', () => {
        const config = service['config'];
        
        // 验证测试环境特定配置
        expect(config.cache.namespace).toBe('monitoring');
        expect(config.cache.batchSize).toBe(3); // 测试环境缩小
        expect(config.events.enableAutoAnalysis).toBe(false); // 测试时禁用
        expect(config.performance.hitRateThreshold).toBe(0.8);
      });
    });

    describe('Performance Protection', () => {
      it('should track fallback count', () => {
        const initialCount = service['metrics'].fallbackCount;
        expect(typeof initialCount).toBe('number');
        expect(initialCount).toBe(0);
      });
      
      it('should reset fallback counter', () => {
        service['metrics'].fallbackCount = 5;
        service.resetFallbackCounter();
        expect(service['metrics'].fallbackCount).toBe(0);
      });
    });

    describe('Event Semantics Enhancement', () => {
      it('should distinguish between cache hit and miss in getOrSetHealthData', async () => {
        const testData = { score: 90 };
        const factory = jest.fn().mockResolvedValue(testData);
        
        // 测试缓存命中
        mockCacheService.get.mockResolvedValue(testData);
        const result1 = await service.getOrSetHealthData('test-key', factory);
        
        expect(result1).toEqual(testData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:health:test-key');
        expect(mockCacheService.set).not.toHaveBeenCalled();
        expect(factory).not.toHaveBeenCalled();
        
        // 重置mocks
        jest.clearAllMocks();
        
        // 测试缓存未命中
        mockCacheService.get.mockResolvedValue(null);
        mockCacheService.set.mockResolvedValue(undefined);
        mockCacheService.setAdd.mockResolvedValue(1);
        mockCacheService.expire.mockResolvedValue(true);
        
        const result2 = await service.getOrSetHealthData('test-key2', factory);
        
        expect(result2).toEqual(testData);
        expect(mockCacheService.get).toHaveBeenCalledWith('monitoring:health:test-key2');
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'monitoring:health:test-key2',
          testData,
          { ttl: 10, compressionThreshold: 1024 }
        );
        expect(factory).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle all cache service method failures', async () => {
      // Make all cache service methods fail
      mockCacheService.get.mockRejectedValue(new Error('Get failed'));
      mockCacheService.set.mockRejectedValue(new Error('Set failed'));
      mockCacheService.getOrSet.mockRejectedValue(new Error('GetOrSet failed'));
      
      // These should all complete without throwing
      await expect(service.getHealthData('key')).resolves.toBeNull();
      await expect(service.setHealthData('key', { data: 'test' })).resolves.not.toThrow();
      
      const factory = jest.fn().mockResolvedValue({ data: 'test' });
      await expect(service.getOrSetHealthData('key', factory)).resolves.toEqual({ data: 'test' });
    });

    it('should maintain operation metrics during failures', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      
      const initialErrors = service['metrics'].operations.errors;
      await service.getHealthData('test-key');
      
      expect(service['metrics'].operations.errors).toBe(initialErrors + 1);
    });
  });
});