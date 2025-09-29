/**
 * SmartCacheStandardizedService 单元测试
 * 测试智能缓存标准化服务的核心功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SmartCacheStandardizedService,
  CacheStrategy,
  CacheOrchestratorRequest
} from '@core/05-caching/module/smart-cache/services/smart-cache-standardized.service';
import { CacheUnifiedConfigInterface } from '@core/05-caching/foundation/types/cache-config.types';

describe('SmartCacheStandardizedService', () => {
  let service: SmartCacheStandardizedService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockConfig: CacheUnifiedConfigInterface = {
    name: 'test-cache',
    defaultTtlSeconds: 300,
    maxTtlSeconds: 3600,
    minTtlSeconds: 5,
    compressionEnabled: false,
    compressionThresholdBytes: 1024,
    metricsEnabled: true,
    performanceMonitoringEnabled: true,
    ttl: {
      realTimeTtlSeconds: 5,
      nearRealTimeTtlSeconds: 30,
      batchQueryTtlSeconds: 300,
      offHoursTtlSeconds: 3600,
      weekendTtlSeconds: 7200,
    },
    performance: {
      maxMemoryMb: 128,
      defaultBatchSize: 10,
      maxConcurrentOperations: 100,
      slowOperationThresholdMs: 1000,
      connectionTimeoutMs: 5000,
      operationTimeoutMs: 5000,
    },
    intervals: {
      cleanupIntervalMs: 60000,
      healthCheckIntervalMs: 30000,
      metricsCollectionIntervalMs: 10000,
      statsLogIntervalMs: 300000,
      heartbeatIntervalMs: 5000,
    },
    limits: {
      maxKeyLength: 250,
      maxValueSizeBytes: 1048576,
      maxCacheEntries: 10000,
      memoryThresholdRatio: 0.8,
      errorRateAlertThreshold: 0.05,
    },
    retry: {
      maxRetryAttempts: 3,
      baseRetryDelayMs: 1000,
      retryDelayMultiplier: 2,
      maxRetryDelayMs: 10000,
      exponentialBackoffEnabled: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartCacheStandardizedService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockConfig),
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

    service = module.get<SmartCacheStandardizedService>(SmartCacheStandardizedService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have correct module metadata', () => {
      expect(service.moduleType).toBe('smart-cache');
      expect(service.moduleCategory).toBe('orchestrator');
      expect(service.name).toBe('smart-cache');
      expect(service.version).toBe('2.0.0');
      expect(service.priority).toBe(1);
    });

    it('should have required supported features', () => {
      expect(service.supportedFeatures).toContain('intelligent-orchestration');
      expect(service.supportedFeatures).toContain('multi-strategy-caching');
      expect(service.supportedFeatures).toContain('market-aware-ttl');
      expect(service.supportedFeatures).toContain('background-updates');
      expect(service.supportedFeatures).toContain('adaptive-ttl');
    });

    it('should start in uninitialized state', () => {
      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await service.initialize(mockConfig);

      expect(service.isInitialized).toBe(true);
      expect(service.isHealthy).toBe(true);
      expect(service.config).toEqual(mockConfig);
      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.initialized', {
        module: 'smart-cache-standardized',
        timestamp: expect.any(Date),
      });
    });

    it('should handle initialization errors', async () => {
      const invalidConfig = null as any;

      try {
        await service.initialize(invalidConfig);
      } catch (error) {
        expect(service.isHealthy).toBe(false);
        expect(error).toBeDefined();
      }
    });

    it('should destroy cleanly', async () => {
      await service.initialize(mockConfig);
      await service.destroy();

      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.destroyed', {
        module: 'smart-cache-standardized',
        timestamp: expect.any(Date),
      });
    });

    it('should get module status', async () => {
      await service.initialize(mockConfig);
      const status = service.getStatus();

      expect(status.status).toBe('ready');
      expect(status.message).toBe('Service is healthy');
      expect(status.metrics).toBeDefined();
      expect(status.metrics.totalOperations).toBe(0);
      expect(status.metrics.errorRate).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should validate config successfully', () => {
      const result = service.validateConfig(mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject invalid config', () => {
      const result = service.validateConfig(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration is required for smart cache');
    });

    it('should get module specific config', () => {
      const config = service.getModuleSpecificConfig();

      expect(config.strategies).toEqual(['STRONG_TIMELINESS', 'WEAK_TIMELINESS', 'MARKET_AWARE', 'NO_CACHE', 'ADAPTIVE']);
      expect(config.backgroundUpdates).toBe(true);
      expect(config.marketAware).toBe(true);
      expect(config.adaptiveTtl).toBe(true);
      expect(config.orchestrationMode).toBe(true);
    });

    it('should apply config updates', async () => {
      const newConfig = { ...mockConfig, ttl: { ...mockConfig.ttl, realTimeTtlSeconds: 10 } };

      await service.applyConfigUpdate(newConfig);

      expect(service.config.ttl.realTimeTtlSeconds).toBe(10);
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should handle get operation', async () => {
      const result = await service.get('test-key');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('get');
      expect(result.key).toBe('test-key');
      expect(result.hit).toBe(false);
      expect(result.data).toBeUndefined();
    });

    it('should handle set operation', async () => {
      const result = await service.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.key).toBe('test-key');
      expect(result.ttl).toBe(300);
    });

    it('should handle delete operation', async () => {
      const result = await service.delete('test-key');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.key).toBe('test-key');
      expect(result.deletedCount).toBe(1);
    });

    it('should handle exists operation', async () => {
      const result = await service.exists('test-key');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('get');
      expect(result.data).toBe(false);
    });

    it('should handle ttl operation', async () => {
      const result = await service.ttl('test-key');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('get');
      expect(result.data).toBe(300);
    });

    it('should handle expire operation', async () => {
      const result = await service.expire('test-key', 60);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.data).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should handle batch get operation', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = await service.batchGet(keys);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('get');
      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle batch set operation', async () => {
      const items = [
        { key: 'key1', value: 'value1', ttl: 300 },
        { key: 'key2', value: 'value2', ttl: 600 },
      ];
      const result = await service.batchSet(items);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should handle batch delete operation', async () => {
      const keys = ['key1', 'key2'];
      const result = await service.batchDelete(keys);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should handle clear operation', async () => {
      const result = await service.clear('test:*');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.key).toBe('test:*');
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should handle increment operation', async () => {
      const result = await service.increment('counter', 5);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.data).toBe(5);
    });

    it('should handle decrement operation', async () => {
      const result = await service.decrement('counter', 3);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.data).toBe(-3);
    });

    it('should handle getOrSet operation', async () => {
      const factory = jest.fn().mockResolvedValue('factory-value');
      const result = await service.getOrSet('test-key', factory);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('get');
      expect(result.key).toBe('test-key');
      expect(result.data).toBe('factory-value');
      expect(result.hit).toBe(false);
      expect(factory).toHaveBeenCalled();
    });

    it('should handle getOrSet factory errors', async () => {
      const factory = jest.fn().mockRejectedValue(new Error('Factory error'));
      const result = await service.getOrSet('test-key', factory);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Factory error');
      expect(factory).toHaveBeenCalled();
    });

    it('should handle setIfNotExists operation', async () => {
      const result = await service.setIfNotExists('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('set');
      expect(result.key).toBe('test-key');
    });
  });

  describe('Smart Cache Orchestration', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should orchestrate cache with STRONG_TIMELINESS strategy', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ symbol: 'AAPL', price: 150.50 });
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'stock:AAPL',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['AAPL'],
        fetchFn,
      };

      const result = await service.orchestrate(request);

      expect(result.data).toEqual({ symbol: 'AAPL', price: 150.50 });
      expect(result.hit).toBe(false);
      expect(result.strategy).toBe(CacheStrategy.STRONG_TIMELINESS);
      expect(result.storageKey).toBe('stock:AAPL');
      expect(result.ttlRemaining).toBe(5); // 5 seconds for strong timeliness
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should orchestrate cache with WEAK_TIMELINESS strategy', async () => {
      const fetchFn = jest.fn().mockResolvedValue(['AAPL', 'GOOGL']);
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'stocks:batch',
        strategy: CacheStrategy.WEAK_TIMELINESS,
        symbols: ['AAPL', 'GOOGL'],
        fetchFn,
      };

      const result = await service.orchestrate(request);

      expect(result.data).toEqual(['AAPL', 'GOOGL']);
      expect(result.hit).toBe(false);
      expect(result.strategy).toBe(CacheStrategy.WEAK_TIMELINESS);
      expect(result.ttlRemaining).toBe(300); // 5 minutes for weak timeliness
    });

    it('should orchestrate cache with MARKET_AWARE strategy', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ market: 'HKEX', status: 'open' });
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'market:HKEX',
        strategy: CacheStrategy.MARKET_AWARE,
        symbols: [],
        fetchFn,
        metadata: { market: 'HKEX' },
      };

      const result = await service.orchestrate(request);

      expect(result.data).toEqual({ market: 'HKEX', status: 'open' });
      expect(result.strategy).toBe(CacheStrategy.MARKET_AWARE);
      expect(result.ttlRemaining).toBe(60); // 1 minute for market aware
    });

    it('should orchestrate cache with NO_CACHE strategy', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ realtime: true });
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'realtime:data',
        strategy: CacheStrategy.NO_CACHE,
        symbols: [],
        fetchFn,
      };

      const result = await service.orchestrate(request);

      expect(result.data).toEqual({ realtime: true });
      expect(result.strategy).toBe(CacheStrategy.NO_CACHE);
      expect(result.ttlRemaining).toBe(0); // No caching
    });

    it('should orchestrate cache with ADAPTIVE strategy', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ adaptive: true });
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'adaptive:data',
        strategy: CacheStrategy.ADAPTIVE,
        symbols: [],
        fetchFn,
      };

      const result = await service.orchestrate(request);

      expect(result.data).toEqual({ adaptive: true });
      expect(result.strategy).toBe(CacheStrategy.ADAPTIVE);
      expect(result.ttlRemaining).toBe(120); // 2 minutes for adaptive
    });

    it('should handle orchestration errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'error:test',
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: [],
        fetchFn,
      };

      const result = await service.orchestrate(request);

      expect(result.data).toBeNull();
      expect(result.hit).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should track strategy usage stats', async () => {
      const requests = [
        { strategy: CacheStrategy.STRONG_TIMELINESS },
        { strategy: CacheStrategy.WEAK_TIMELINESS },
        { strategy: CacheStrategy.STRONG_TIMELINESS },
      ];

      for (const req of requests) {
        await service.orchestrate({
          cacheKey: `test:${req.strategy}`,
          strategy: req.strategy,
          symbols: [],
          fetchFn: jest.fn().mockResolvedValue({}),
        });
      }

      const stats = await service.getStats();
      expect(stats.data.totalOperations).toBe(3);
    });
  });

  describe('Smart Cache API Methods', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should get data with smart cache', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ test: 'data' });
      const request: CacheOrchestratorRequest<any> = {
        cacheKey: 'api:test',
        strategy: CacheStrategy.WEAK_TIMELINESS,
        symbols: [],
        fetchFn,
      };

      const result = await service.getDataWithSmartCache(request);

      expect(result.data).toEqual({ test: 'data' });
      expect(result.strategy).toBe(CacheStrategy.WEAK_TIMELINESS);
    });

    it('should batch get data with smart cache', async () => {
      const requests = [
        {
          cacheKey: 'batch:1',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['SYM1'],
          fetchFn: jest.fn().mockResolvedValue({ id: 1 }),
        },
        {
          cacheKey: 'batch:2',
          strategy: CacheStrategy.WEAK_TIMELINESS,
          symbols: ['SYM2'],
          fetchFn: jest.fn().mockResolvedValue({ id: 2 }),
        },
      ];

      const results = await service.batchGetDataWithSmartCache(requests);

      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual({ id: 1 });
      expect(results[1].data).toEqual({ id: 2 });
      expect(results[0].strategy).toBe(CacheStrategy.STRONG_TIMELINESS);
      expect(results[1].strategy).toBe(CacheStrategy.WEAK_TIMELINESS);
    });
  });

  describe('Monitoring and Statistics', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should get cache statistics', async () => {
      // Perform some operations to generate stats
      await service.get('test1');
      await service.set('test2', 'value');

      const stats = await service.getStats();

      expect(stats.success).toBe(true);
      expect(stats.data.totalOperations).toBe(2);
      expect(stats.data.hitRate).toBe(0);
      expect(stats.data.errorRate).toBe(0);
      expect(stats.data.avgResponseTimeMs).toBe(50);
    });

    it('should reset statistics', async () => {
      // Generate some stats first
      await service.get('test');

      const resetResult = await service.resetStats();
      const stats = await service.getStats();

      expect(resetResult.success).toBe(true);
      expect(stats.data.totalOperations).toBe(0);
      expect(stats.data.errorCount).toBe(0);
    });

    it('should get health status', async () => {
      const health = await service.getHealth();

      expect(health.success).toBe(true);
      expect(health.healthScore).toBe(100);
      expect(health.checks).toHaveLength(1);
      expect(health.checks[0].name).toBe('Smart Cache Orchestrator Health');
      expect(health.checks[0].status).toBe('pass');
      expect(health.data.connectionStatus).toBe('success');
    });

    it('should get performance metrics', async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics.avgResponseTime).toBe(50);
      expect(metrics.p95ResponseTime).toBe(75);
      expect(metrics.p99ResponseTime).toBe(100);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.memoryEfficiency).toBe(0.85);
    });

    it('should get capacity info', async () => {
      const capacity = await service.getCapacityInfo();

      expect(capacity.currentKeys).toBe(0);
      expect(capacity.maxKeys).toBe(10000);
      expect(capacity.keyUtilization).toBe(0);
      expect(capacity.currentMemory).toBe(0);
      expect(capacity.estimatedRemainingCapacity.keys).toBe(10000);
    });

    it('should get error statistics', async () => {
      const errorStats = await service.getErrorStatistics();

      expect(errorStats.totalErrors).toBe(0);
      expect(errorStats.errorsByType).toEqual({});
      expect(errorStats.errorsBySeverity).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
      expect(errorStats.recentErrors).toEqual([]);
      expect(errorStats.errorTrend).toEqual([]);
    });

    it('should run diagnostics', async () => {
      const diagnostics = await service.runDiagnostics();

      expect(diagnostics.overallHealthScore).toBe(100);
      expect(diagnostics.checks).toHaveLength(1);
      expect(diagnostics.checks[0].status).toBe('pass');
      expect(diagnostics.issues).toEqual([]);
    });

    it('should ping successfully', async () => {
      const pingResult = await service.ping();

      expect(pingResult.success).toBe(true);
      expect(pingResult.operation).toBe('get');
      expect(typeof pingResult.data).toBe('number');
      expect(pingResult.data).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Utility Operations', () => {
    beforeEach(async () => {
      await service.initialize(mockConfig);
    });

    it('should get memory usage', async () => {
      const memoryUsage = await service.getMemoryUsage();

      expect(memoryUsage.success).toBe(true);
      expect(memoryUsage.data.usedMemoryBytes).toBe(0);
      expect(memoryUsage.data.totalMemoryBytes).toBe(0);
      expect(memoryUsage.data.memoryUsageRatio).toBe(0);
      expect(memoryUsage.data.keyCount).toBe(0);
    });

    it('should get connection info', async () => {
      const connectionInfo = await service.getConnectionInfo();

      expect(connectionInfo.success).toBe(true);
      expect(connectionInfo.data.status).toBe('connected');
      expect(connectionInfo.data.address).toBe('smart-cache-orchestrator');
      expect(connectionInfo.data.port).toBe(0);
    });

    it('should get keys with pattern', async () => {
      const keys = await service.getKeys('test:*', 100);

      expect(keys.success).toBe(true);
      expect(keys.data).toEqual([]);
    });

    it('should export data', async () => {
      const exportResult = await service.exportData('test:*', 'json');

      expect(exportResult.success).toBe(true);
      expect(exportResult.data).toEqual({});
    });

    it('should import data', async () => {
      const importData = { 'test:key1': 'value1', 'test:key2': 'value2' };
      const importResult = await service.importData(importData);

      expect(importResult.success).toBe(true);
      expect(importResult.data.total).toBe(0);
      expect(importResult.data.successful).toBe(0);
      expect(importResult.data.failed).toBe(0);
      expect(importResult.data.skipped).toBe(0);
    });
  });
});
