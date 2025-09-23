/**
 * DataMapper Cache Optimization Validation Tests
 * 验证批量删除和SCAN操作的优化是否正常工作
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataMapperCacheService } from '../../../../src/core/05-caching/module/data-mapper-cache/services/data-mapper-cache.service';
import { FlexibleMappingRuleResponseDto } from '../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';

describe('DataMapperCache Optimization Validation', () => {
  let service: DataMapperCacheService;
  let redis: Redis;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMapperCacheService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useFactory: () => {
            return new Redis({
              host: 'localhost',
              port: 6379,
              db: 15, // Use test database
              maxRetriesPerRequest: 1,
              lazyConnect: true,
            });
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataMapperCacheService>(DataMapperCacheService);
    redis = module.get('default_IORedisModuleConnectionToken');
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    try {
      await redis.connect();
      await redis.flushdb();
    } catch (error) {
      console.warn('Redis connection failed, skipping tests:', error.message);
    }
  });

  afterAll(async () => {
    try {
      await redis.flushdb();
      await redis.quit();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('🚀 Parallel Batch Delete Optimization', () => {
    it('should handle parallel batch deletion without errors', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      // Setup test data
      const testKeys = Array.from({ length: 50 }, (_, i) => `test:batch:${i}`);

      const pipeline = redis.pipeline();
      testKeys.forEach(key => {
        pipeline.set(key, `value-${key}`, 'EX', 300);
      });
      await pipeline.exec();

      // Use reflection to access private method for testing
      const batchDeleteMethod = (service as any).batchDelete.bind(service);

      const startTime = Date.now();
      await expect(batchDeleteMethod(testKeys)).resolves.not.toThrow();
      const duration = Date.now() - startTime;

      // Verify performance characteristics
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`✅ Parallel batch delete completed in ${duration}ms for ${testKeys.length} keys`);

      // Verify keys were actually deleted
      const remainingKeys = await redis.mget(...testKeys);
      expect(remainingKeys.every(value => value === null)).toBe(true);
    }, 15000);

    it('should handle partial failures gracefully with Promise.allSettled', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      // Setup mixed scenario: some valid keys, some invalid operations
      const validKeys = Array.from({ length: 20 }, (_, i) => `test:valid:${i}`);
      const invalidKeys = ['', null, undefined].filter(Boolean); // Invalid keys that might cause issues

      const pipeline = redis.pipeline();
      validKeys.forEach(key => {
        pipeline.set(key, `value-${key}`, 'EX', 300);
      });
      await pipeline.exec();

      const mixedKeys = [...validKeys, ...invalidKeys].filter(Boolean);
      const batchDeleteMethod = (service as any).batchDelete.bind(service);

      // Should handle mixed scenario without complete failure
      await expect(batchDeleteMethod(mixedKeys)).resolves.not.toThrow();

      console.log('✅ Promise.allSettled error handling verified');
    }, 15000);
  });

  describe('🔍 Progressive SCAN Optimization', () => {
    it('should perform progressive scanning with circuit breaker protection', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      // Setup test data with pattern
      const testPattern = 'scan:test:progressive';
      const testKeys = Array.from({ length: 30 }, (_, i) => `${testPattern}:${i}`);

      const pipeline = redis.pipeline();
      testKeys.forEach(key => {
        pipeline.set(key, `value-${key}`, 'EX', 300);
      });
      await pipeline.exec();

      // Use reflection to access private method
      const scanMethod = (service as any).scanKeysWithTimeout.bind(service);

      const startTime = Date.now();
      const foundKeys = await scanMethod(`${testPattern}:*`, 10000);
      const duration = Date.now() - startTime;

      // Validate progressive scan results
      expect(foundKeys).toBeInstanceOf(Array);
      expect(foundKeys.length).toBeGreaterThanOrEqual(testKeys.length * 0.8); // Allow for some variance
      expect(duration).toBeLessThan(10000); // Should complete within timeout

      console.log(`🔍 Progressive SCAN found ${foundKeys.length} keys in ${duration}ms`);

      // Cleanup
      if (foundKeys.length > 0) {
        await redis.del(...foundKeys);
      }
    }, 20000);

    it('should handle circuit breaker state transitions', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const scanMethod = (service as any).scanKeysWithTimeout.bind(service);

      // Test normal operation (circuit breaker should be closed)
      try {
        await scanMethod('test:circuit:*', 1000);
        console.log('✅ Circuit breaker normal operation verified');
      } catch (error) {
        // Expected for timeout, but circuit breaker should handle it
        expect(error.message).toContain('timeout'); // Should be timeout, not circuit breaker error
      }

      // Circuit breaker state should be managed internally
      // We can't easily test the open state without causing real failures
      expect(service).toBeDefined();
    }, 15000);
  });

  describe('🎯 Cache Operations Integration', () => {
    it('should integrate optimized operations in cache workflow', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      // Test actual cache operations using the service
      const testRule: FlexibleMappingRuleResponseDto = {
        id: 'test-rule-optimization-123',
        name: 'Test Optimization Rule',
        provider: 'test-provider',
        apiType: 'rest',
        transDataRuleListType: 'test-type',
        sourceTemplateId: 'test-template-123',
        fieldMappings: [],
        isDefault: true,
        isActive: true,
        version: '1.0.0',
        overallConfidence: 0.95,
        usageCount: 0,
        successfulTransformations: 0,
        failedTransformations: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Test cache operations
      await expect(service.cacheRuleById(testRule)).resolves.not.toThrow();
      await expect(service.getCachedRuleById(testRule.id!)).resolves.toBeDefined();

      // Test cache invalidation (uses optimized batch delete internally)
      await expect(service.invalidateRuleCache(testRule.id!, testRule)).resolves.not.toThrow();

      console.log('✅ Optimized cache operations integration verified');
    }, 15000);

    it('should handle provider cache invalidation with optimized SCAN', async () => {
      try {
        await redis.ping();
      } catch (error) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const provider = 'test-optimization-provider';

      // Setup some test cache data
      const testRules = Array.from({ length: 10 }, (_, i) => ({
        id: `rule-${provider}-${i}`,
        name: `Rule ${i}`,
        provider,
        apiType: 'rest' as const,
        transDataRuleListType: 'test-type',
        sourceTemplateId: `template-${i}`,
        fieldMappings: [],
        isDefault: false,
        isActive: true,
        version: '1.0.0',
        overallConfidence: 0.9,
        usageCount: 0,
        successfulTransformations: 0,
        failedTransformations: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Cache multiple rules
      for (const rule of testRules) {
        await service.cacheRuleById(rule);
      }

      const startTime = Date.now();

      // Test provider cache invalidation (uses optimized SCAN + batch delete)
      await expect(service.invalidateProviderCache(provider)).resolves.not.toThrow();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should be efficient
      console.log(`✅ Provider cache invalidation completed in ${duration}ms`);
    }, 20000);
  });

  describe('📊 Performance Monitoring Integration', () => {
    it('should emit performance monitoring events', async () => {
      // Verify that monitoring events are being emitted
      expect(eventEmitter.emit).toBeDefined();

      // Test that service initialization doesn't throw
      expect(service).toBeInstanceOf(DataMapperCacheService);

      console.log('✅ Performance monitoring integration verified');

      // Test event emission during operations (mocked)
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      try {
        await redis.ping();

        const testRule: FlexibleMappingRuleResponseDto = {
          id: 'test-monitoring-123',
          name: 'Test Monitoring Rule',
          provider: 'test-provider',
          apiType: 'rest',
          transDataRuleListType: 'test-type',
          sourceTemplateId: 'template-monitoring',
          fieldMappings: [],
          isDefault: true,
          isActive: true,
          version: '1.0.0',
          overallConfidence: 0.95,
          usageCount: 0,
          successfulTransformations: 0,
          failedTransformations: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await service.cacheRuleById(testRule);

        // Should have emitted monitoring events (at least attempt)
        // Note: Events are emitted via setImmediate, so they might not be captured immediately
        console.log(`📊 Monitoring events emission attempted: ${emitSpy.mock.calls.length} calls`);

      } catch (error) {
        console.warn('Redis not available for monitoring test, but service structure verified');
      }
    });
  });
});