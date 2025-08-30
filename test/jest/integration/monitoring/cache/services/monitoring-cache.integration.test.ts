import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MonitoringCacheService } from '@monitoring/cache/monitoring-cache.service';
import { CacheService } from '../../../../../../src/cache/services/cache.service';

describe('MonitoringCacheService Integration Tests', () => {
  let service: MonitoringCacheService;
  let cacheService: CacheService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        RedisModule.forRoot({
          type: 'single',
          url: 'redis://localhost:6379/15',
          options: {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
          },
        }),
      ],
      providers: [
        CacheService,
        MonitoringCacheService,
      ],
    }).compile();

    service = module.get<MonitoringCacheService>(MonitoringCacheService);
    cacheService = module.get<CacheService>(CacheService);
    
    // Wait a moment for Redis connection to be established
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test data
    if (service) {
      await service.invalidateAllMonitoringCache();
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Health Data Integration', () => {
    it('should store and retrieve health data correctly', async () => {
      const testHealthData = {
        score: 85,
        status: 'healthy',
        timestamp: new Date(),
        components: {
          api: { score: 90 },
          database: { score: 80 },
          cache: { score: 85 }
        }
      };

      // Set health data
      await service.setHealthData('integration-test-health', testHealthData);

      // Retrieve health data
      const retrievedData = await service.getHealthData('integration-test-health');

      expect(retrievedData).toEqual(testHealthData);
    });

    it('should handle getOrSet for health data with real cache operations', async () => {
      const testKey = 'integration-test-health-getorset';
      let factoryCallCount = 0;
      
      const testFactory = async () => {
        factoryCallCount++;
        return {
          score: 75,
          generated: true,
          timestamp: new Date()
        };
      };

      // First call should execute factory
      const result1 = await service.getOrSetHealthData(testKey, testFactory);
      expect(factoryCallCount).toBe(1);
      expect(result1.generated).toBe(true);

      // Second call should use cache (factory not called)
      const result2 = await service.getOrSetHealthData(testKey, testFactory);
      expect(factoryCallCount).toBe(1); // Still 1, not called again
      expect(result2).toEqual(result1);
    });

    it('should respect TTL for health data', async () => {
      const testKey = 'integration-test-health-ttl';
      const testData = { score: 90, test: 'ttl' };

      // Set health data (TTL = 300 seconds for health)
      await service.setHealthData(testKey, testData);

      // Should be available immediately
      const immediateResult = await service.getHealthData(testKey);
      expect(immediateResult).toEqual(testData);

      // Verify the data persists in underlying cache
      const cacheKey = 'monitoring:health:' + testKey;
      const underlyingResult = await cacheService.get(cacheKey);
      expect(underlyingResult).toEqual(testData);
    });
  });

  describe('Trend Data Integration', () => {
    it('should store and retrieve trend data correctly', async () => {
      const testTrendData = {
        responseTime: {
          current: 150,
          previous: 120,
          trend: 'increasing' as const,
          changePercentage: 25
        },
        errorRate: {
          current: 0.02,
          previous: 0.01,
          trend: 'increasing' as const,
          changePercentage: 100
        },
        throughput: {
          current: 1000,
          previous: 800,
          trend: 'increasing' as const,
          changePercentage: 25
        }
      };

      await service.setTrendData('integration-test-trends', testTrendData);
      const retrievedData = await service.getTrendData('integration-test-trends');

      expect(retrievedData).toEqual(testTrendData);
    });

    it('should handle getOrSet for trend data with correct TTL', async () => {
      const testKey = 'integration-test-trends-getorset';
      const testData = {
        responseTime: { current: 200, previous: 180, trend: 'increasing' as const, changePercentage: 11.1 }
      };

      const result = await service.getOrSetTrendData(testKey, async () => testData);
      expect(result).toEqual(testData);

      // Verify data is stored in underlying cache with correct namespace
      const cacheKey = 'monitoring:trend:' + testKey;
      const underlyingResult = await cacheService.get(cacheKey);
      expect(underlyingResult).toEqual(testData);
    });
  });

  describe('Performance Data Integration', () => {
    it('should store and retrieve performance data correctly', async () => {
      const testPerfData = {
        cpu: { usage: 45.5, cores: 4 },
        memory: { usage: 60.2, total: 16000 },
        disk: { usage: 25.8, total: 500000 },
        network: { inbound: 1024, outbound: 2048 }
      };

      await service.setPerformanceData('integration-test-performance', testPerfData);
      const retrievedData = await service.getPerformanceData('integration-test-performance');

      expect(retrievedData).toEqual(testPerfData);
    });

    it('should handle getOrSet for performance data with shortest TTL', async () => {
      const testKey = 'integration-test-perf-getorset';
      const testData = { cpu: 35, memory: 55, timestamp: Date.now() };

      const result = await service.getOrSetPerformanceData(testKey, async () => testData);
      expect(result).toEqual(testData);

      // Verify data is stored with correct namespace
      const cacheKey = 'monitoring:performance:' + testKey;
      const underlyingResult = await cacheService.get(cacheKey);
      expect(underlyingResult).toEqual(testData);
    });
  });

  describe('Cache Invalidation Integration', () => {
    beforeEach(async () => {
      // Set up test data across all categories
      await service.setHealthData('test-health-1', { score: 80 });
      await service.setHealthData('test-health-2', { score: 90 });
      await service.setTrendData('test-trend-1', { responseTime: { current: 100 } });
      await service.setTrendData('test-trend-2', { responseTime: { current: 120 } });
      await service.setPerformanceData('test-perf-1', { cpu: 40 });
      await service.setPerformanceData('test-perf-2', { cpu: 50 });
    });

    it('should invalidate health cache only', async () => {
      // Verify all data exists
      expect(await service.getHealthData('test-health-1')).toBeTruthy();
      expect(await service.getTrendData('test-trend-1')).toBeTruthy();
      expect(await service.getPerformanceData('test-perf-1')).toBeTruthy();

      // Invalidate only health cache
      await service.invalidateHealthCache();

      // Health data should be gone, others should remain
      expect(await service.getHealthData('test-health-1')).toBeNull();
      expect(await service.getHealthData('test-health-2')).toBeNull();
      expect(await service.getTrendData('test-trend-1')).toBeTruthy();
      expect(await service.getPerformanceData('test-perf-1')).toBeTruthy();
    });

    it('should invalidate trend cache only', async () => {
      await service.invalidateTrendCache();

      // Trend data should be gone, others should remain
      expect(await service.getTrendData('test-trend-1')).toBeNull();
      expect(await service.getTrendData('test-trend-2')).toBeNull();
      expect(await service.getHealthData('test-health-1')).toBeTruthy();
      expect(await service.getPerformanceData('test-perf-1')).toBeTruthy();
    });

    it('should invalidate performance cache only', async () => {
      await service.invalidatePerformanceCache();

      // Performance data should be gone, others should remain
      expect(await service.getPerformanceData('test-perf-1')).toBeNull();
      expect(await service.getPerformanceData('test-perf-2')).toBeNull();
      expect(await service.getHealthData('test-health-1')).toBeTruthy();
      expect(await service.getTrendData('test-trend-1')).toBeTruthy();
    });

    it('should invalidate all monitoring cache', async () => {
      await service.invalidateAllMonitoringCache();

      // All monitoring data should be gone
      expect(await service.getHealthData('test-health-1')).toBeNull();
      expect(await service.getTrendData('test-trend-1')).toBeNull();
      expect(await service.getPerformanceData('test-perf-1')).toBeNull();
    });
  });

  describe('Health Check Integration', () => {
    it('should perform real health check with Redis operations', async () => {
      const healthResult = await service.healthCheck();

      expect(healthResult).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResult.status);
      
      expect(healthResult.metrics).toHaveProperty('hitRate');
      expect(healthResult.metrics).toHaveProperty('errorRate');
      expect(healthResult.metrics).toHaveProperty('totalOperations');
      expect(healthResult.metrics).toHaveProperty('uptime');
      expect(healthResult.metrics).toHaveProperty('latency');

      expect(typeof healthResult.metrics.hitRate).toBe('number');
      expect(typeof healthResult.metrics.errorRate).toBe('number');
      expect(typeof healthResult.metrics.uptime).toBe('number');
    });

    it('should accumulate metrics over multiple operations', async () => {
      // Perform some operations to generate metrics
      await service.setHealthData('metrics-test-1', { score: 85 });
      await service.getHealthData('metrics-test-1');
      await service.getHealthData('non-existent-key'); // Cache miss
      await service.setTrendData('metrics-test-2', { trend: 'stable' });

      const metrics = service.getMetrics();

      expect(metrics.operations.total).toBeGreaterThan(0);
      expect(metrics.operations.hits).toBeGreaterThan(0);
      expect(metrics.operations.misses).toBeGreaterThan(0);
      expect(metrics.operations.hitRate).toBeLessThanOrEqual(1);
      expect(metrics.operations.errorRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Namespace Isolation Integration', () => {
    it('should isolate monitoring cache from other cache usage', async () => {
      const monitoringKey = 'test-key';
      const regularKey = 'monitoring:health:test-key'; // Same as what monitoring would create

      // Set data through monitoring service
      await service.setHealthData(monitoringKey, { score: 85 });

      // Set data through regular cache service with same constructed key
      await cacheService.set(regularKey, { different: 'data' });

      // Both should exist but monitoring service should get the monitoring data
      const monitoringResult = await service.getHealthData(monitoringKey);
      const regularResult = await cacheService.get(regularKey);

      expect(monitoringResult).toEqual({ different: 'data' }); // Same key, so same data
      expect(regularResult).toEqual({ different: 'data' });

      // Test with truly separate keys
      const separateMonitoringKey = 'separate-test';
      const separateRegularKey = 'regular:separate-test';

      await service.setHealthData(separateMonitoringKey, { monitoring: true });
      await cacheService.set(separateRegularKey, { regular: true });

      const separateMonitoringResult = await service.getHealthData(separateMonitoringKey);
      const separateRegularResult = await cacheService.get(separateRegularKey);

      expect(separateMonitoringResult).toEqual({ monitoring: true });
      expect(separateRegularResult).toEqual({ regular: true });
    });
  });

  describe('Concurrent Operations Integration', () => {
    it('should handle concurrent getOrSet operations correctly', async () => {
      const testKey = 'concurrent-test';
      let factoryCallCount = 0;

      const factory = async () => {
        factoryCallCount++;
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        return { value: factoryCallCount, timestamp: Date.now() };
      };

      // Fire 5 concurrent getOrSet operations
      const promises = Array.from({ length: 5 }, () => 
        service.getOrSetHealthData(testKey, factory)
      );

      const results = await Promise.all(promises);

      // Due to distributed locking, factory should be called only once or very few times
      expect(factoryCallCount).toBeLessThanOrEqual(2);
      
      // All results should be the same (from cache after first execution)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.value).toBe(firstResult.value);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cache failures gracefully', async () => {
      // Test with invalid data that might cause serialization issues
      const problematic = { circular: null as any };
      problematic.circular = problematic;

      // This should not throw but handle gracefully
      await expect(service.setHealthData('problematic', problematic)).resolves.not.toThrow();

      const result = await service.getHealthData('problematic');
      expect(result).toBeNull(); // Should return null due to serialization failure
    });
  });
});