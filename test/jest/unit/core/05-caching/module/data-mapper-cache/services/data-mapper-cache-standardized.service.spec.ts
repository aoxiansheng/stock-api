import { TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataMapperCacheStandardizedService } from '@core/05-caching/module/data-mapper-cache/services/data-mapper-cache-standardized.service';
import { UnitTestSetup } from '../../../../../../../testbasic/setup/unit-test-setup';
import { redisMockFactory, createFailingRedisMock } from '../../../../../../../testbasic/mocks/redis.mock';
import type { CacheUnifiedConfigInterface } from '@core/05-caching/foundation/types/cache-config.types';

describe('DataMapperCacheStandardizedService', () => {
  let service: DataMapperCacheStandardizedService;
  let module: TestingModule;
  let redisMock: any;
  let eventBusMock: EventEmitter2;
  let mockConfig: CacheUnifiedConfigInterface;

  const createTestModule = async (customRedisMock?: any) => {
    redisMock = customRedisMock || redisMockFactory();
    eventBusMock = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    mockConfig = {
      defaultTtlSeconds: 300,
    } as any;

    return await UnitTestSetup.createCacheTestModule({
      providers: [
        DataMapperCacheStandardizedService,
        {
          provide: 'Redis',
          useValue: redisMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventBusMock,
        },
        {
          provide: 'dataMapperCacheConfig',
          useValue: mockConfig,
        },
      ],
    });
  };

  beforeEach(async () => {
    module = await createTestModule();
    service = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
      module,
      DataMapperCacheStandardizedService,
      DataMapperCacheStandardizedService
    );
  });

  afterEach(async () => {
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataMapperCacheStandardizedService);
    });

    it('should implement required interfaces', () => {
      expect(service.moduleType).toBe('data-mapper-cache');
      expect(service.moduleCategory).toBe('specialized');
      expect(service.name).toBe('DataMapperCacheStandardized');
      expect(service.version).toBe('3.0.0');
      expect(service.description).toContain('data mapper cache');
    });

    it('should have correct supported features', () => {
      expect(service.supportedFeatures).toContain('data-mapping-cache');
      expect(service.supportedFeatures).toContain('flexible-rules');
      expect(service.supportedFeatures).toContain('batch-operations');
      expect(service.supportedFeatures).toContain('monitoring');
    });

    it('should initialize properly on module init', async () => {
      await service.onModuleInit();
      expect(service.isInitialized).toBe(true);
      expect(service.isHealthy).toBe(true);
      expect(eventBusMock.emit).toHaveBeenCalledWith('cache.module.initialized', {
        module: 'data-mapper-cache-standardized',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('get()', () => {
      it('should return cache hit when data exists', async () => {
        const testKey = 'test:key';
        const testData = { id: 1, name: 'test' };
        redisMock.get.mockResolvedValue(JSON.stringify(testData));

        const result = await service.get(testKey);

        expect(result.success).toBe(true);
        expect(result.hit).toBe(true);
        expect(result.data).toEqual(testData);
        expect(result.key).toBe(testKey);
        expect(redisMock.get).toHaveBeenCalledWith(testKey);
      });

      it('should return cache miss when data does not exist', async () => {
        const testKey = 'test:missing';
        redisMock.get.mockResolvedValue(null);

        const result = await service.get(testKey);

        expect(result.success).toBe(true);
        expect(result.hit).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.key).toBe(testKey);
      });

      it('should handle Redis errors gracefully', async () => {
        const testKey = 'test:error';
        const redisError = new Error('Redis connection failed');
        redisMock.get.mockRejectedValue(redisError);

        const result = await service.get(testKey);

        expect(result.success).toBe(false);
        expect(result.hit).toBe(false);
        expect(result.error).toBe('Redis connection failed');
      });
    });

    describe('set()', () => {
      it('should set cache value with default TTL', async () => {
        const testKey = 'test:set';
        const testValue = { data: 'test' };
        redisMock.setex.mockResolvedValue('OK');

        const result = await service.set(testKey, testValue);

        expect(result.success).toBe(true);
        expect(result.key).toBe(testKey);
        expect(result.ttl).toBe(300); // default TTL
        expect(redisMock.setex).toHaveBeenCalledWith(testKey, 300, JSON.stringify(testValue));
      });

      it('should set cache value with custom TTL', async () => {
        const testKey = 'test:set';
        const testValue = { data: 'test' };
        const customTtl = 600;
        redisMock.setex.mockResolvedValue('OK');

        const result = await service.set(testKey, testValue, { ttl: customTtl });

        expect(result.success).toBe(true);
        expect(result.ttl).toBe(customTtl);
        expect(redisMock.setex).toHaveBeenCalledWith(testKey, customTtl, JSON.stringify(testValue));
      });

      it('should handle set errors', async () => {
        const testKey = 'test:error';
        const testValue = { data: 'test' };
        redisMock.setex.mockRejectedValue(new Error('Set failed'));

        const result = await service.set(testKey, testValue);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Set failed');
      });
    });

    describe('delete()', () => {
      it('should delete key successfully', async () => {
        const testKey = 'test:delete';
        redisMock.del.mockResolvedValue(1);

        const result = await service.delete(testKey);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(1);
        expect(redisMock.del).toHaveBeenCalledWith(testKey);
      });

      it('should handle delete when key does not exist', async () => {
        const testKey = 'test:missing';
        redisMock.del.mockResolvedValue(0);

        const result = await service.delete(testKey);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(0);
      });
    });

    describe('exists()', () => {
      it('should return true when key exists', async () => {
        const testKey = 'test:exists';
        redisMock.exists.mockResolvedValue(1);

        const result = await service.exists(testKey);

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        const testKey = 'test:missing';
        redisMock.exists.mockResolvedValue(0);

        const result = await service.exists(testKey);

        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
      });
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('getOrSet()', () => {
      it('should return cached value if exists', async () => {
        const testKey = 'test:getOrSet';
        const cachedData = { cached: true };
        redisMock.get.mockResolvedValue(JSON.stringify(cachedData));
        const factory = jest.fn().mockResolvedValue({ new: true });

        const result = await service.getOrSet(testKey, factory);

        expect(result.success).toBe(true);
        expect(result.hit).toBe(true);
        expect(result.data).toEqual(cachedData);
        expect(factory).not.toHaveBeenCalled();
      });

      it('should call factory and cache result if not exists', async () => {
        const testKey = 'test:getOrSet';
        const factoryData = { new: true };
        redisMock.get.mockResolvedValue(null);
        redisMock.setex.mockResolvedValue('OK');
        const factory = jest.fn().mockResolvedValue(factoryData);

        const result = await service.getOrSet(testKey, factory);

        expect(result.success).toBe(true);
        expect(result.hit).toBe(false);
        expect(result.data).toEqual(factoryData);
        expect(factory).toHaveBeenCalled();
        expect(redisMock.setex).toHaveBeenCalledWith(testKey, 300, JSON.stringify(factoryData));
      });
    });

    describe('batchGet()', () => {
      it('should get multiple keys using pipeline', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const pipelineMock = {
          get: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([
            [null, JSON.stringify({ data: 1 })],
            [null, null],
            [null, JSON.stringify({ data: 3 })],
          ]),
        };
        redisMock.pipeline.mockReturnValue(pipelineMock);

        const result = await service.batchGet(keys);

        expect(result.success).toBe(true);
        expect(pipelineMock.get).toHaveBeenCalledTimes(3);
        expect(pipelineMock.exec).toHaveBeenCalled();
      });
    });

    describe('batchSet()', () => {
      it('should set multiple items using pipeline', async () => {
        const items = [
          { key: 'key1', value: { data: 1 }, ttl: 300 },
          { key: 'key2', value: { data: 2 } },
        ];
        const pipelineMock = {
          setex: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]),
        };
        redisMock.pipeline.mockReturnValue(pipelineMock);

        const result = await service.batchSet(items);

        expect(result.success).toBe(true);
        expect(pipelineMock.setex).toHaveBeenCalledTimes(2);
        expect(pipelineMock.exec).toHaveBeenCalled();
      });
    });

    describe('clear()', () => {
      it('should clear all keys matching pattern', async () => {
        const pattern = 'test:*';
        redisMock.scan.mockResolvedValueOnce(['10', ['test:key1', 'test:key2']]);
        redisMock.scan.mockResolvedValueOnce(['0', ['test:key3']]);
        redisMock.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

        const result = await service.clear(pattern);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(3);
        expect(redisMock.scan).toHaveBeenCalledWith('0', 'MATCH', pattern, 'COUNT', 100);
        expect(redisMock.del).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Data Mapper Cache Interface', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('Provider Rules Cache', () => {
      it('should cache and retrieve provider rules', async () => {
        const providerName = 'longport';
        const rules = [{ id: '1', name: 'rule1' }] as any;
        redisMock.get.mockResolvedValue(null);
        redisMock.setex.mockResolvedValue('OK');

        await service.setRulesForProvider(providerName, rules);

        redisMock.get.mockResolvedValue(JSON.stringify(rules));
        const retrievedRules = await service.getRulesForProvider(providerName);

        expect(retrievedRules).toEqual(rules);
        expect(redisMock.setex).toHaveBeenCalledWith(
          `rules:provider:${providerName}`,
          3600,
          JSON.stringify(rules)
        );
      });

      it('should cache provider rules by API type', async () => {
        const provider = 'longport';
        const apiType = 'rest';
        const rules = [{ id: '1', name: 'rule1' }] as any;
        redisMock.setex.mockResolvedValue('OK');

        await service.cacheProviderRules(provider, apiType, rules);

        expect(redisMock.setex).toHaveBeenCalledWith(
          `rules:provider:${provider}:${apiType}`,
          3600,
          JSON.stringify(rules)
        );
      });
    });

    describe('Best Matching Rule Cache', () => {
      it('should cache and retrieve best matching rule', async () => {
        const provider = 'longport';
        const apiType = 'rest';
        const transDataRuleListType = 'quote_fields';
        const rule = { id: '1', name: 'best_rule' } as any;
        redisMock.setex.mockResolvedValue('OK');
        redisMock.get.mockResolvedValue(JSON.stringify(rule));

        await service.cacheBestMatchingRule(provider, apiType, transDataRuleListType, rule);
        const retrievedRule = await service.getCachedBestMatchingRule(provider, apiType, transDataRuleListType);

        expect(retrievedRule).toEqual(rule);
        expect(redisMock.setex).toHaveBeenCalledWith(
          `best_rule:${provider}:${apiType}:${transDataRuleListType}`,
          1800,
          JSON.stringify(rule)
        );
      });
    });

    describe('Rule by ID Cache', () => {
      it('should cache and retrieve rule by ID', async () => {
        const rule = { id: 'rule123', name: 'test_rule' } as any;
        redisMock.setex.mockResolvedValue('OK');
        redisMock.get.mockResolvedValue(JSON.stringify(rule));

        await service.cacheRuleById(rule);
        const retrievedRule = await service.getCachedRuleById('rule123');

        expect(retrievedRule).toEqual(rule);
        expect(redisMock.setex).toHaveBeenCalledWith(
          'rule:id:rule123',
          3600,
          JSON.stringify(rule)
        );
      });
    });

    describe('Cache Invalidation', () => {
      it('should invalidate rule cache by ID', async () => {
        const ruleId = 'rule123';
        redisMock.del.mockResolvedValue(1);

        await service.invalidateRuleCache(ruleId);

        expect(redisMock.del).toHaveBeenCalledWith(`rule:id:${ruleId}`);
      });

      it('should invalidate provider cache', async () => {
        const provider = 'longport';
        const pattern = `*:provider:${provider}*`;
        redisMock.scan.mockResolvedValueOnce(['0', ['rules:provider:longport']]);
        redisMock.del.mockResolvedValue(1);

        await service.invalidateProviderCache(provider);

        expect(redisMock.scan).toHaveBeenCalledWith('0', 'MATCH', pattern, 'COUNT', 100);
      });

      it('should clear all rule cache', async () => {
        const pattern = 'rule:*';
        redisMock.scan.mockResolvedValueOnce(['0', ['rule:id:1', 'rule:id:2']]);
        redisMock.del.mockResolvedValue(2);

        await service.clearAllRuleCache();

        expect(redisMock.scan).toHaveBeenCalledWith('0', 'MATCH', pattern, 'COUNT', 100);
      });
    });

    describe('Cache Warmup', () => {
      it('should warmup cache with common rules', async () => {
        const commonRules = [
          { id: 'rule1', name: 'rule1' },
          { id: 'rule2', name: 'rule2' },
        ] as any;
        const pipelineMock = {
          setex: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]),
        };
        redisMock.pipeline.mockReturnValue(pipelineMock);

        await service.warmupCache(commonRules);

        expect(pipelineMock.setex).toHaveBeenCalledTimes(2);
        expect(pipelineMock.setex).toHaveBeenCalledWith(
          'rule:id:rule1',
          3600,
          JSON.stringify(commonRules[0])
        );
      });
    });
  });

  describe('Monitoring and Health', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('getStats()', () => {
      it('should return performance statistics', async () => {
        // Perform some operations to generate stats
        redisMock.get.mockResolvedValue(JSON.stringify({ test: true }));
        await service.get('test:key');

        redisMock.get.mockResolvedValue(null);
        await service.get('test:missing');

        const stats = await service.getStats();

        expect(stats.success).toBe(true);
        expect(stats.data.totalOperations).toBe(2);
        expect(stats.data.hits).toBe(1);
        expect(stats.data.misses).toBe(1);
        expect(stats.data.hitRate).toBe(50);
      });
    });

    describe('getHealth()', () => {
      it('should return health status', async () => {
        const health = await service.getHealth();

        expect(health.success).toBe(true);
        expect(health.healthScore).toBe(100);
        expect(health.checks).toHaveLength(1);
        expect(health.checks[0].status).toBe('pass');
        expect(health.data.connectionStatus).toBe('success');
      });
    });

    describe('ping()', () => {
      it('should ping Redis successfully', async () => {
        redisMock.ping.mockResolvedValue('PONG');

        const result = await service.ping();

        expect(result.success).toBe(true);
        expect(result.data).toBeGreaterThan(0); // response time
        expect(redisMock.ping).toHaveBeenCalled();
      });

      it('should handle ping failure', async () => {
        redisMock.ping.mockRejectedValue(new Error('Connection failed'));

        const result = await service.ping();

        expect(result.success).toBe(false);
        expect(result.data).toBe(-1);
      });
    });

    describe('resetStats()', () => {
      it('should reset statistics', async () => {
        // Generate some stats first
        redisMock.get.mockResolvedValue(JSON.stringify({ test: true }));
        await service.get('test:key');

        const result = await service.resetStats();
        const stats = await service.getStats();

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(stats.data.totalOperations).toBe(1); // only the getStats call
      });
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('validateConfig()', () => {
      it('should validate valid configuration', () => {
        const validConfig = {
          defaultTtlSeconds: 300,
          maxKeys: 10000,
        };

        const result = service.validateConfig(validConfig);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should invalidate null configuration', () => {
        const result = service.validateConfig(null as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Configuration is required for data mapper cache');
      });
    });

    describe('applyConfigUpdate()', () => {
      it('should update configuration', async () => {
        const newConfig = { defaultTtlSeconds: 600 };
        const originalTtl = service.config.defaultTtlSeconds;

        await service.applyConfigUpdate(newConfig);

        expect(service.config.defaultTtlSeconds).toBe(600);
        expect(service.config.defaultTtlSeconds).not.toBe(originalTtl);
      });
    });

    describe('getModuleSpecificConfig()', () => {
      it('should return module-specific configuration', () => {
        const config = service.getModuleSpecificConfig();

        expect(config.ruleMapping).toBe(true);
        expect(config.providerSpecific).toBe(true);
        expect(config.bestMatching).toBe(true);
        expect(config.ruleValidation).toBe(true);
        expect(config.circuitBreaker).toBe(true);
      });
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle module destruction properly', async () => {
      await service.onModuleInit();
      expect(service.isInitialized).toBe(true);
      expect(service.isHealthy).toBe(true);

      await service.onModuleDestroy();

      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
      expect(eventBusMock.emit).toHaveBeenCalledWith('cache.module.destroyed', {
        module: 'data-mapper-cache-standardized',
        timestamp: expect.any(Date),
      });
    });

    it('should get correct module status', async () => {
      await service.onModuleInit();

      const status = service.getStatus();

      expect(status.status).toBe('ready');
      expect(status.message).toContain('healthy');
      expect(status.metrics.totalOperations).toBeDefined();
      expect(status.metrics.avgResponseTime).toBeDefined();
      expect(status.metrics.errorRate).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const failingModule = await createTestModule(createFailingRedisMock());
      const failingService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        failingModule,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );
      await failingService.onModuleInit();

      const result = await failingService.get('test:key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis connection failed');

      await UnitTestSetup.cleanupModule(failingModule);
    });

    it('should handle initialization errors', async () => {
      const invalidConfig = null as any;

      try {
        await service.initialize(invalidConfig);
      } catch (error) {
        expect(service.isHealthy).toBe(false);
      }
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should provide performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics.avgResponseTime).toBeDefined();
      expect(metrics.p95ResponseTime).toBeDefined();
      expect(metrics.p99ResponseTime).toBeDefined();
      expect(metrics.throughput).toBeDefined();
      expect(metrics.hitRate).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.memoryEfficiency).toBeDefined();
    });

    it('should provide capacity information', async () => {
      const capacity = await service.getCapacityInfo();

      expect(capacity.currentKeys).toBeDefined();
      expect(capacity.maxKeys).toBe(10000);
      expect(capacity.keyUtilization).toBeDefined();
      expect(capacity.currentMemory).toBeDefined();
      expect(capacity.maxMemory).toBeDefined();
      expect(capacity.estimatedRemainingCapacity).toBeDefined();
    });

    it('should provide error statistics', async () => {
      const errorStats = await service.getErrorStatistics();

      expect(errorStats.totalErrors).toBeDefined();
      expect(errorStats.errorsByType).toBeDefined();
      expect(errorStats.errorsBySeverity).toBeDefined();
      expect(errorStats.recentErrors).toBeDefined();
      expect(errorStats.errorTrend).toBeDefined();
    });

    it('should run diagnostics', async () => {
      const diagnostics = await service.runDiagnostics();

      expect(diagnostics.overallHealthScore).toBe(100);
      expect(diagnostics.checks).toHaveLength(1);
      expect(diagnostics.checks[0].status).toBe('pass');
      expect(diagnostics.issues).toHaveLength(0);
    });
  });
});
