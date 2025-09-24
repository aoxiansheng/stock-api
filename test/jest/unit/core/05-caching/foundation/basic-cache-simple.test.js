/**
 * BasicCacheService 简单测试
 * 使用JavaScript来避免TypeScript配置问题
 */

const { BasicCacheService } = require('../../../../../../src/core/05-caching/foundation/services/basic-cache.service');

describe('BasicCacheService Simple Tests', () => {
  let service;
  let testConfig;

  beforeEach(async () => {
    testConfig = {
      name: 'test-cache',
      type: 'memory',
      defaultTtlSeconds: 300,
      limits: {
        maxKeyLength: 250,
        maxValueSizeBytes: 1024 * 1024,
        maxConcurrentOps: 100,
        maxMemoryMb: 512,
      },
      performance: {
        maxMemoryMb: 512,
        enableCompression: false,
        compressionThreshold: 1024,
      },
      intervals: {
        cleanupIntervalMs: 30000,
        statsCollectionIntervalMs: 60000,
      },
      redis: {
        enabled: false,
        host: 'localhost',
        port: 6379,
        database: 0,
      },
    };

    service = new BasicCacheService();
    await service.initialize(testConfig);
  });

  afterEach(async () => {
    if (service) {
      await service.destroy();
    }
  });

  test('should initialize successfully', async () => {
    expect(service.isInitialized).toBe(true);
    expect(service.isHealthy).toBe(true);
    expect(service.name).toBe('basic-cache-foundation');
    expect(service.version).toBe('1.0.0');
  });

  test('should set and get values', async () => {
    const key = 'test-key';
    const value = 'test-value';

    const setResult = await service.set(key, value);
    expect(setResult.success).toBe(true);
    expect(setResult.data).toBe(true);

    const getResult = await service.get(key);
    expect(getResult.success).toBe(true);
    expect(getResult.hit).toBe(true);
    expect(getResult.data).toBe(value);
  });

  test('should handle cache misses', async () => {
    const result = await service.get('non-existent-key');
    expect(result.success).toBe(true);
    expect(result.hit).toBe(false);
    expect(result.data).toBeUndefined();
  });

  test('should delete keys', async () => {
    const key = 'delete-test';
    await service.set(key, 'value');

    const deleteResult = await service.delete(key);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data).toBe(true);
    expect(deleteResult.deletedCount).toBe(1);

    const getResult = await service.get(key);
    expect(getResult.hit).toBe(false);
  });

  test('should check key existence', async () => {
    const key = 'exists-test';

    let existsResult = await service.exists(key);
    expect(existsResult.data).toBe(false);

    await service.set(key, 'value');

    existsResult = await service.exists(key);
    expect(existsResult.data).toBe(true);
  });

  test('should get stats', async () => {
    await service.set('stats-test', 'value');
    await service.get('stats-test');

    const statsResult = await service.getStats();
    expect(statsResult.success).toBe(true);
    expect(statsResult.data.totalOperations).toBeGreaterThan(0);
    expect(statsResult.data.keyCount).toBeGreaterThan(0);
  });

  test('should provide health info', async () => {
    const healthResult = await service.getHealth();
    expect(healthResult.success).toBe(true);
    expect(healthResult.data.connectionStatus).toBeDefined();
    expect(healthResult.healthScore).toBeGreaterThan(0);
  });

  test('should ping successfully', async () => {
    const pingResult = await service.ping();
    expect(pingResult.success).toBe(true);
    expect(typeof pingResult.data).toBe('number');
  });
});