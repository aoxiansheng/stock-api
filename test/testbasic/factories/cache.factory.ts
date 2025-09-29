/**
 * 缓存数据工厂 - 创建测试缓存数据
 */
export class CacheFactory {
  /**
   * 创建模拟缓存配置
   */
  static createMockCacheConfig(overrides: Partial<any> = {}) {
    return {
      defaultTtl: 300,
      compressionThreshold: 1024,
      maxBatchSize: 100,
      lockTtl: 30,
      retryDelayMs: 100,
      slowOperationMs: 1000,
      strongTimelinessTtl: 5,
      realtimeTtl: 60,
      longTermTtl: 3600,
      monitoringTtl: 300,
      authTtl: 600,
      transformerTtl: 900,
      suggestionTtl: 1800,
      maxValueSizeMB: 10,
      compressionEnabled: true,
      maxItems: 10000,
      maxKeyLength: 255,
      maxCacheSize: 10000,
      lruSortBatchSize: 1000,
      smartCacheMaxBatch: 50,
      maxCacheSizeMB: 1024,
      ...overrides,
    };
  }

  /**
   * 创建模拟缓存数据
   */
  static createMockCacheData(overrides: Record<string, any> = {}) {
    return {
      'cache:test:key1': JSON.stringify({ data: 'value1', timestamp: Date.now() }),
      'cache:test:key2': JSON.stringify({ data: 'value2', timestamp: Date.now() }),
      'auth:session:user123': JSON.stringify({
        userId: '507f1f77bcf86cd799439011',
        sessionId: 'sess_123456789',
        expiresAt: Date.now() + 3600000,
      }),
      'auth:apikey:ak_live_123': JSON.stringify({
        keyId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        permissions: ['data:read'],
        rateLimit: { requestsPerMinute: 1000 },
      }),
      'monitoring:health:report': JSON.stringify({
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          redis: 'up',
          mongodb: 'up',
          api: 'up',
        },
      }),
      ...overrides,
    };
  }

  /**
   * 创建缓存键模式
   */
  static createCacheKeyPatterns() {
    return {
      auth: {
        session: 'auth:session:{sessionId}',
        apiKey: 'auth:apikey:{keyId}',
        permission: 'auth:permission:{userId}',
        rateLimit: 'auth:ratelimit:{identifier}',
      },
      data: {
        quote: 'data:quote:{symbol}:{provider}',
        symbol: 'data:symbol:{symbol}',
        mapping: 'data:mapping:{fromSymbol}:{provider}',
      },
      monitoring: {
        health: 'monitoring:health:{reportId}',
        metrics: 'monitoring:metrics:{type}:{timeframe}',
        alert: 'monitoring:alert:{alertId}',
      },
      cache: {
        statistics: 'cache:stats:{date}',
        performance: 'cache:perf:{operation}:{timeframe}',
      },
    };
  }

  /**
   * 创建缓存操作结果
   */
  static createMockCacheOperationResult(operation: string, success: boolean = true, overrides: Partial<any> = {}) {
    return {
      operation,
      success,
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 100) + 10, // 10-110ms
      key: `cache:test:${operation}:${Date.now()}`,
      size: Math.floor(Math.random() * 1000) + 100, // 100-1100 bytes
      compressed: Math.random() > 0.5,
      ttl: success ? 300 : null,
      error: success ? null : `${operation} operation failed`,
      metadata: {
        hitRate: Math.random(),
        memoryUsage: Math.floor(Math.random() * 1000000) + 100000, // 100KB-1MB
        connectionCount: Math.floor(Math.random() * 10) + 1,
      },
      ...overrides,
    };
  }

  /**
   * 创建缓存性能统计
   */
  static createMockCacheStats(overrides: Partial<any> = {}) {
    return {
      operations: {
        get: {
          count: 1000,
          hitRate: 0.85,
          averageTime: 15,
          maxTime: 120,
          minTime: 2,
        },
        set: {
          count: 200,
          successRate: 0.98,
          averageTime: 25,
          maxTime: 180,
          minTime: 5,
        },
        del: {
          count: 50,
          successRate: 0.99,
          averageTime: 10,
          maxTime: 80,
          minTime: 1,
        },
      },
      memory: {
        used: 1024 * 1024 * 50, // 50MB
        available: 1024 * 1024 * 200, // 200MB
        usage: 0.25,
        fragmentation: 0.15,
      },
      connections: {
        active: 5,
        idle: 2,
        total: 7,
        maxConnections: 10,
      },
      keyspace: {
        totalKeys: 5000,
        expiredKeys: 100,
        avgTtl: 1800,
        keysByPattern: {
          'auth:*': 1000,
          'data:*': 3000,
          'monitoring:*': 500,
          'cache:*': 500,
        },
      },
      errors: {
        connectionErrors: 2,
        timeoutErrors: 1,
        memoryErrors: 0,
        otherErrors: 1,
      },
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建缓存健康检查结果
   */
  static createMockCacheHealthCheck(healthy: boolean = true, overrides: Partial<any> = {}) {
    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        connection: healthy ? 'pass' : 'fail',
        memory: healthy ? 'pass' : 'warn',
        latency: healthy ? 'pass' : 'fail',
        keyspace: healthy ? 'pass' : 'pass',
      },
      metrics: {
        responseTime: healthy ? 15 : 500,
        memoryUsage: healthy ? 0.25 : 0.85,
        hitRate: healthy ? 0.85 : 0.45,
        errorRate: healthy ? 0.001 : 0.1,
      },
      details: healthy ? 'All cache operations functioning normally' : 'Cache performance degraded',
      recommendations: healthy ? [] : [
        'Check Redis connection stability',
        'Monitor memory usage',
        'Review cache key expiration policies',
      ],
      ...overrides,
    };
  }

  /**
   * 创建批量缓存数据
   */
  static createBatchCacheData(count: number, keyPrefix: string = 'test') {
    const data = new Map<string, any>();

    for (let i = 0; i < count; i++) {
      const key = `${keyPrefix}:batch:${i}`;
      const value = {
        id: i,
        data: `batch data ${i}`,
        timestamp: Date.now() + i * 1000,
        metadata: {
          index: i,
          type: 'batch',
          processed: true,
        },
      };
      data.set(key, JSON.stringify(value));
    }

    return data;
  }
}