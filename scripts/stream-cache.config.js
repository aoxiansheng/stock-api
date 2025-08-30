/**
 * StreamCache 配置文件
 * 用于不同环境的缓存配置管理
 */

const streamCacheConfig = {
  // 开发环境配置
  development: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_STREAM_CACHE_DB) || 1,
      
      // 开发环境优化配置
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableAutoPipelining: true,
      enableOfflineQueue: false,
      keyPrefix: 'dev:stream:',
    },
    
    streamCache: {
      // 开发环境使用较短的TTL便于测试
      hotCacheTTL: parseInt(process.env.STREAM_CACHE_HOT_TTL_MS) || 3000,      // 3秒
      warmCacheTTL: parseInt(process.env.STREAM_CACHE_WARM_TTL_SECONDS) || 180, // 3分钟
      maxHotCacheSize: parseInt(process.env.STREAM_CACHE_MAX_HOT_SIZE) || 500,  // 较小容量
      cleanupInterval: parseInt(process.env.STREAM_CACHE_CLEANUP_INTERVAL_MS) || 15000, // 15秒清理
      compressionThreshold: parseInt(process.env.STREAM_CACHE_COMPRESSION_THRESHOLD) || 512, // 512字节
      
      // 开发环境专用配置
      enableDebugLogs: true,
      enablePerformanceMetrics: true,
    },
  },

  // 测试环境配置
  test: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_TEST_DB) || 15, // 测试专用DB
      
      // 测试环境配置
      connectTimeout: 3000,
      commandTimeout: 2000,
      retryDelayOnFailover: 50,
      maxRetriesPerRequest: 2,
      keyPrefix: 'test:stream:',
    },
    
    streamCache: {
      // 测试环境使用很短的TTL加速测试
      hotCacheTTL: 1000,    // 1秒
      warmCacheTTL: 10,     // 10秒
      maxHotCacheSize: 10,  // 小容量便于测试LRU
      cleanupInterval: 5000, // 5秒清理
      compressionThreshold: 100, // 100字节 - 测试压缩
      
      // 测试环境专用配置
      enableDebugLogs: false,
      enablePerformanceMetrics: false,
      fastFailover: true,
    },
  },

  // 生产环境配置
  production: {
    redis: {
      host: process.env.REDIS_HOST || 'redis-cluster.internal',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD, // 生产环境必须有密码
      db: parseInt(process.env.REDIS_STREAM_CACHE_DB) || 1,
      
      // 生产环境高性能配置
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 200,
      maxRetriesPerRequest: 5,
      enableAutoPipelining: true,
      enableOfflineQueue: false,
      keyPrefix: 'prod:stream:',
      
      // 生产环境连接池配置
      family: 4,
      keepAlive: 30000,
      enableReadyCheck: true,
      
      // 生产环境安全配置
      tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
        servername: process.env.REDIS_TLS_SERVERNAME,
      } : undefined,
    },
    
    streamCache: {
      // 生产环境性能优化配置
      hotCacheTTL: parseInt(process.env.STREAM_CACHE_HOT_TTL_MS) || 5000,       // 5秒
      warmCacheTTL: parseInt(process.env.STREAM_CACHE_WARM_TTL_SECONDS) || 300, // 5分钟
      maxHotCacheSize: parseInt(process.env.STREAM_CACHE_MAX_HOT_SIZE) || 2000, // 大容量
      cleanupInterval: parseInt(process.env.STREAM_CACHE_CLEANUP_INTERVAL_MS) || 60000, // 1分钟清理
      compressionThreshold: parseInt(process.env.STREAM_CACHE_COMPRESSION_THRESHOLD) || 1024, // 1KB
      
      // 生产环境专用配置
      enableDebugLogs: false,
      enablePerformanceMetrics: true,
      enablePrometheusMetrics: true,
      
      // 生产环境容错配置
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 50, // 50%失败率
      circuitBreakerTimeout: 30000, // 30秒重置
      
      // 生产环境性能配置
      batchOperationTimeout: 5000,
      maxConcurrentOperations: 100,
    },
  },

  // 预发布环境配置
  staging: {
    redis: {
      host: process.env.REDIS_HOST || 'redis-staging.internal',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_STREAM_CACHE_DB) || 1,
      
      // 预发布环境配置 (接近生产环境)
      connectTimeout: 8000,
      commandTimeout: 4000,
      retryDelayOnFailover: 150,
      maxRetriesPerRequest: 4,
      enableAutoPipelining: true,
      keyPrefix: 'staging:stream:',
    },
    
    streamCache: {
      // 预发布环境配置 (生产环境的80%性能)
      hotCacheTTL: parseInt(process.env.STREAM_CACHE_HOT_TTL_MS) || 4000,       // 4秒
      warmCacheTTL: parseInt(process.env.STREAM_CACHE_WARM_TTL_SECONDS) || 240, // 4分钟
      maxHotCacheSize: parseInt(process.env.STREAM_CACHE_MAX_HOT_SIZE) || 1500, // 中等容量
      cleanupInterval: parseInt(process.env.STREAM_CACHE_CLEANUP_INTERVAL_MS) || 45000, // 45秒清理
      compressionThreshold: parseInt(process.env.STREAM_CACHE_COMPRESSION_THRESHOLD) || 1024,
      
      // 预发布环境专用配置
      enableDebugLogs: true,
      enablePerformanceMetrics: true,
      enableLoadTesting: true,
    },
  },
};

/**
 * 根据当前环境获取配置
 */
function getStreamCacheConfig() {
  const env = process.env.NODE_ENV || 'development';
  const config = streamCacheConfig[env] || streamCacheConfig.development;
  
  // 验证必要的配置项
  validateConfig(config, env);
  
  return config;
}

/**
 * 验证配置的完整性和有效性
 */
function validateConfig(config, env) {
  const { redis, streamCache } = config;
  
  // Redis配置验证
  if (!redis.host) {
    throw new Error(`StreamCache配置错误: Redis host未配置 (环境: ${env})`);
  }
  
  if (env === 'production' && !redis.password) {
    throw new Error('StreamCache配置错误: 生产环境必须配置Redis密码');
  }
  
  // StreamCache配置验证
  if (streamCache.hotCacheTTL <= 0) {
    throw new Error('StreamCache配置错误: hotCacheTTL必须大于0');
  }
  
  if (streamCache.warmCacheTTL <= 0) {
    throw new Error('StreamCache配置错误: warmCacheTTL必须大于0');
  }
  
  if (streamCache.maxHotCacheSize <= 0) {
    throw new Error('StreamCache配置错误: maxHotCacheSize必须大于0');
  }
  
  // 逻辑验证
  if (streamCache.hotCacheTTL >= streamCache.warmCacheTTL * 1000) {
    console.warn('StreamCache配置警告: hotCacheTTL不应大于等于warmCacheTTL');
  }
}

/**
 * 获取Redis连接URL (用于监控和调试)
 */
function getRedisConnectionUrl() {
  const config = getStreamCacheConfig();
  const { redis } = config;
  
  const auth = redis.password ? `:${redis.password}@` : '';
  return `redis://${auth}${redis.host}:${redis.port}/${redis.db}`;
}

/**
 * 获取性能基准配置
 */
function getPerformanceBenchmarks() {
  const env = process.env.NODE_ENV || 'development';
  
  const benchmarks = {
    development: {
      hotCacheTargetLatency: 5,     // 5ms
      warmCacheTargetLatency: 50,   // 50ms
      targetHitRate: 0.80,          // 80%
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    },
    test: {
      hotCacheTargetLatency: 10,    // 10ms (测试环境较宽松)
      warmCacheTargetLatency: 100,  // 100ms
      targetHitRate: 0.70,          // 70%
      maxMemoryUsage: 10 * 1024 * 1024, // 10MB
    },
    production: {
      hotCacheTargetLatency: 1,     // 1ms
      warmCacheTargetLatency: 10,   // 10ms
      targetHitRate: 0.95,          // 95%
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB
    },
    staging: {
      hotCacheTargetLatency: 2,     // 2ms
      warmCacheTargetLatency: 20,   // 20ms
      targetHitRate: 0.90,          // 90%
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    },
  };
  
  return benchmarks[env] || benchmarks.development;
}

module.exports = {
  getStreamCacheConfig,
  getRedisConnectionUrl,
  getPerformanceBenchmarks,
  streamCacheConfig,
};