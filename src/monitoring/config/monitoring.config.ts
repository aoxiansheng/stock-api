/**
 * 监控组件配置接口和默认值
 * 将硬编码配置抽离为可配置选项
 */

export interface MonitoringConfig {
  cache: {
    namespace: string;
    keyIndexPrefix: string;
    compressionThreshold: number;
    fallbackThreshold: number; // 回退次数告警阈值
    ttl: {
      health: number;
      trend: number;
      performance: number;
      alert: number;
      cacheStats: number;
    };
    batchSize: number; // 并发批处理大小
  };
  events: {
    enableAutoAnalysis: boolean; // 是否启用自动分析
    retryAttempts: number; // 事件处理重试次数
  };
  performance: {
    latencyThresholds: {
      p95Warning: number; // P95 延迟告警阈值（ms）
      p99Critical: number; // P99 延迟严重阈值（ms）
    };
    hitRateThreshold: number; // 缓存命中率告警阈值
    errorRateThreshold: number; // 错误率告警阈值
  };
}

/**
 * 默认监控配置
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  cache: {
    namespace: process.env.MONITORING_CACHE_NAMESPACE || 'monitoring',
    keyIndexPrefix: process.env.MONITORING_KEY_INDEX_PREFIX || 'monitoring:index',
    compressionThreshold: parseInt(process.env.MONITORING_COMPRESSION_THRESHOLD) || 1024,
    fallbackThreshold: parseInt(process.env.MONITORING_FALLBACK_THRESHOLD) || 10,
    ttl: {
      health: parseInt(process.env.MONITORING_TTL_HEALTH) || 300,      // 5分钟
      trend: parseInt(process.env.MONITORING_TTL_TREND) || 600,        // 10分钟
      performance: parseInt(process.env.MONITORING_TTL_PERFORMANCE) || 180, // 3分钟
      alert: parseInt(process.env.MONITORING_TTL_ALERT) || 60,         // 1分钟
      cacheStats: parseInt(process.env.MONITORING_TTL_CACHE_STATS) || 120, // 2分钟
    },
    batchSize: parseInt(process.env.MONITORING_BATCH_SIZE) || 10, // 并发批处理大小
  },
  events: {
    enableAutoAnalysis: process.env.MONITORING_AUTO_ANALYSIS !== 'false',
    retryAttempts: parseInt(process.env.MONITORING_EVENT_RETRY) || 3,
  },
  performance: {
    latencyThresholds: {
      p95Warning: parseInt(process.env.MONITORING_P95_WARNING) || 200,
      p99Critical: parseInt(process.env.MONITORING_P99_CRITICAL) || 500,
    },
    hitRateThreshold: parseFloat(process.env.MONITORING_HIT_RATE_THRESHOLD) || 0.8, // 80%
    errorRateThreshold: parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD) || 0.1, // 10%
  },
};

/**
 * 监控配置验证函数
 */
export function validateMonitoringConfig(config: Partial<MonitoringConfig>): MonitoringConfig {
  const validated = { ...DEFAULT_MONITORING_CONFIG, ...config };
  
  // 验证缓存配置
  if (validated.cache.compressionThreshold < 0) {
    throw new Error('监控缓存压缩阈值不能为负数');
  }
  
  if (validated.cache.batchSize < 1) {
    throw new Error('监控缓存批处理大小必须大于0');
  }
  
  // 验证TTL配置
  Object.entries(validated.cache.ttl).forEach(([key, value]) => {
    if (value <= 0) {
      throw new Error(`监控缓存TTL配置 ${key} 必须大于0秒`);
    }
  });
  
  // 验证性能阈值
  if (validated.performance.hitRateThreshold < 0 || validated.performance.hitRateThreshold > 1) {
    throw new Error('监控命中率阈值必须在0-1之间');
  }
  
  if (validated.performance.errorRateThreshold < 0 || validated.performance.errorRateThreshold > 1) {
    throw new Error('监控错误率阈值必须在0-1之间');
  }
  
  return validated;
}

/**
 * 获取环境特定的监控配置
 */
export function getMonitoringConfigForEnvironment(): MonitoringConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return validateMonitoringConfig({
        ...DEFAULT_MONITORING_CONFIG,
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          ttl: {
            health: 600,      // 生产环境延长TTL
            trend: 1200,      
            performance: 300,
            alert: 120,
            cacheStats: 240,
          },
          batchSize: 20, // 生产环境增加批处理大小
        },
        performance: {
          ...DEFAULT_MONITORING_CONFIG.performance,
          hitRateThreshold: 0.9, // 生产环境提高命中率要求
          errorRateThreshold: 0.05, // 生产环境降低错误率容忍
        },
      });
      
    case 'test':
      return validateMonitoringConfig({
        ...DEFAULT_MONITORING_CONFIG,
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          ttl: {
            health: 10,      // 测试环境缩短TTL
            trend: 20,       
            performance: 10,
            alert: 5,
            cacheStats: 10,
          },
          batchSize: 3, // 测试环境减少批处理大小
        },
        events: {
          ...DEFAULT_MONITORING_CONFIG.events,
          enableAutoAnalysis: false, // 测试时禁用自动分析
        },
      });
      
    default: // development
      return validateMonitoringConfig({});
  }
}