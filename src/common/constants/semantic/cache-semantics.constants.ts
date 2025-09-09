/**
 * 缓存语义常量
 * 🎯 Semantic层 - 缓存相关的业务无关语义分类
 * 💾 基于Foundation层构建，专注于缓存系统语义
 * 🔄 整合unified-cache-config.constants.ts配置
 */

import { NUMERIC_CONSTANTS } from '../core';
import { CORE_VALUES, CORE_TTL, CORE_TIMEOUTS } from '../foundation';

/**
 * 缓存键语义规范
 * 🎯 统一缓存键命名规范，解决键名不一致问题
 */
export const CACHE_KEY_SEMANTICS = Object.freeze({
  // 键前缀分类
  PREFIXES: {
    USER: 'user',
    API: 'api',
    DATA: 'data',
    QUERY: 'query',
    TEMP: 'temp',
    LOCK: 'lock',
    CONFIG: 'config',
    CACHE: 'cache',
  },

  // 分隔符规范
  SEPARATORS: {
    NAMESPACE: ':',           // 命名空间分隔符
    FIELD: '.',              // 字段分隔符  
    LIST: '_',               // 列表分隔符
  },

  // 键模式模板
  PATTERNS: {
    USER_DATA: '{prefix}:user:{userId}:{dataType}',
    SESSION_DATA: '{prefix}:session:{sessionId}:{field}',
    API_RESPONSE: '{prefix}:api:{endpoint}:{params}',
    QUERY_RESULT: '{prefix}:query:{hash}:{timestamp}',
    TEMP_DATA: '{prefix}:temp:{type}:{ttl}:{id}',
  },
});

/**
 * 缓存策略语义
 * 🎯 统一缓存策略配置
 */
export const CACHE_STRATEGY_SEMANTICS = Object.freeze({
  // 缓存策略类型
  STRATEGIES: {
    // 缓存优先策略
    CACHE_FIRST: 'cache-first',           // 优先读缓存，缓存未命中时读源
    
    // 源优先策略
    
    // 写策略
    WRITE_THROUGH: 'write-through',       // 写透策略，同时写缓存和源
    WRITE_AROUND: 'write-around',         // 绕写策略，直接写源不写缓存
  },

  // 失效策略
  EVICTION: {
    LRU: 'lru',                          // 最近最少使用
    TTL: 'ttl',                          // 基于TTL
  },

  // 一致性级别
  CONSISTENCY: {
  },
});

/**
 * 缓存大小语义限制
 * 🎯 解决缓存大小配置重复定义
 */
export const CACHE_SIZE_SEMANTICS = Object.freeze({
  // 内存缓存大小限制
  MEMORY: {
    LARGE_ENTRIES: NUMERIC_CONSTANTS.N_1000,                      // 1000 - 大型缓存
  },

  // 单个缓存项大小限制（字节）
  ENTRY_SIZE: {
    SMALL_BYTES: NUMERIC_CONSTANTS.N_50 * 1024,                // 50KB - 小项
    MEDIUM_BYTES: NUMERIC_CONSTANTS.N_100 * 1024,              // 100KB - 中项
    MAX_BYTES: NUMERIC_CONSTANTS.N_1000 * 1024,                // 1MB - 最大项
  },

  // 批量操作大小
  BATCH_OPERATIONS: {
    MAX_SIZE: NUMERIC_CONSTANTS.N_1000,                         // 1000 - 最大批量
  },
});

/**
 * 缓存性能语义指标
 */
export const CACHE_PERFORMANCE_SEMANTICS = Object.freeze({
  // 命中率阈值
  HIT_RATE_THRESHOLDS: {
    GOOD: NUMERIC_CONSTANTS.N_100 * 0.8,                    // 80% - 良好
    POOR: NUMERIC_CONSTANTS.N_100 * 0.5,                    // 50% - 较差
  },

  // 响应时间阈值（毫秒）
  RESPONSE_TIME_THRESHOLDS: {
    FAST_MS: NUMERIC_CONSTANTS.N_100,                   // 100ms - 快速
  },

  // 内存使用率阈值
  MEMORY_USAGE_THRESHOLDS: {
    LOW: NUMERIC_CONSTANTS.N_HALF * 0.5,                    // 25% - 低使用率
    MEDIUM: NUMERIC_CONSTANTS.N_HALF,                       // 50% - 中等使用率
    HIGH: NUMERIC_CONSTANTS.N_THREE_QUARTERS,               // 75% - 高使用率
  },
});

/**
 * 缓存操作语义
 */
export const CACHE_OPERATIONS = Object.freeze({
  // 基础操作
  BASIC: {
    GET: 'get',
    SET: 'set',
    DELETE: 'delete',
    TTL: 'ttl',
  },

  // 批量操作  
  BATCH: {
  },

  // 高级操作
  ADVANCED: {
  },

  // 管理操作
  ADMIN: {
    PING: 'ping',
  },
});

/**
 * 缓存语义工具函数
 */
export class CacheSemanticsUtil {

  /**
   * 构建标准化缓存键
   */
  static buildCacheKey(prefix: string, namespace: string, ...parts: string[]): string {
    const separator = CACHE_KEY_SEMANTICS.SEPARATORS.NAMESPACE;
    return [prefix, namespace, ...parts].join(separator);
  }

  /**
   * 判断命中率是否良好
   */
  static isGoodHitRate(hitRate: number): boolean {
    return hitRate >= CACHE_PERFORMANCE_SEMANTICS.HIT_RATE_THRESHOLDS.GOOD;
  }

  /**
   * 判断响应时间是否快速
   */
  static isFastResponse(responseTimeMs: number): boolean {
    return responseTimeMs <= CACHE_PERFORMANCE_SEMANTICS.RESPONSE_TIME_THRESHOLDS.FAST_MS;
  }

  /**
   * 根据数据大小推荐缓存策略
   */
  static getRecommendedStrategy(dataSizeBytes: number): string {
    if (dataSizeBytes <= CACHE_SIZE_SEMANTICS.ENTRY_SIZE.SMALL_BYTES) {
      return CACHE_STRATEGY_SEMANTICS.STRATEGIES.CACHE_FIRST;
    } else if (dataSizeBytes <= CACHE_SIZE_SEMANTICS.ENTRY_SIZE.MEDIUM_BYTES) {
      return CACHE_STRATEGY_SEMANTICS.STRATEGIES.WRITE_THROUGH;
    } else {
      return CACHE_STRATEGY_SEMANTICS.STRATEGIES.WRITE_AROUND;
    }
  }
}

/**
 * 缓存连接语义配置
 * 🎯 整合Redis连接和重试配置
 */
export const CACHE_CONNECTION_SEMANTICS = Object.freeze({
  // Redis连接配置
  REDIS: {
    MAX_RETRIES: NUMERIC_CONSTANTS.N_3,               // 3 - 最大重试次数
    RETRY_DELAY_MS: CORE_TIMEOUTS.RETRY.INITIAL_DELAY_MS,          // 1000ms - 重试延迟
    CONNECTION_TIMEOUT_MS: CORE_TIMEOUTS.CONNECTION.ESTABLISH_MS,     // 5000ms - 连接超时
  },

  // 连接池配置
  POOL: {
  },
});

/**
 * 缓存监控语义配置
 * 🎯 整合缓存监控和告警配置
 */
export const CACHE_MONITORING_SEMANTICS = Object.freeze({
  // 监控配置
  MONITORING: {
    ENABLE_METRICS: true,                                           // 启用指标收集
    ALERT_THRESHOLD_PERCENT: NUMERIC_CONSTANTS.N_THREE_QUARTERS * 1.2, // 90% - 告警阈值
    SLOW_OPERATION_MS: NUMERIC_CONSTANTS.N_100,           // 100ms - 慢操作阈值
  },

  // 性能指标阈值
  PERFORMANCE_THRESHOLDS: {
    CACHE_HIT_RATE_TARGET: NUMERIC_CONSTANTS.N_THREE_QUARTERS,  // 75% - 缓存命中率目标
    RESPONSE_TIME_TARGET_MS: NUMERIC_CONSTANTS.N_100,       // 100ms - 响应时间目标
    MEMORY_USAGE_WARNING: NUMERIC_CONSTANTS.N_HALF,             // 50% - 内存使用率警告阈值
  },
});

/**
 * 缓存键前缀语义映射
 * 🎯 整合所有模块的缓存键前缀
 */
export const CACHE_KEY_PREFIX_SEMANTICS = Object.freeze({
  // 核心业务模块前缀
  CORE_MODULES: {
    QUERY: 'query',
    STORAGE: 'storage', 
    TRANSFORM: 'transform',
    DATA_MAPPER: 'data_mapper',
    SYMBOL_MAPPER: 'symbol_mapper',
    RECEIVER: 'receiver',
  },

  // 认证和权限前缀
  AUTH_MODULES: {
    AUTH: 'auth',
    API_KEY: 'api_key',
    PERMISSION: 'permission',
    RATE_LIMIT: 'rate_limit',
  },

  // 监控和指标前缀
  MONITORING_MODULES: {
    METRICS: 'metrics',
    HEALTH: 'health',
    PERFORMANCE: 'performance',
    ALERT: 'alert',
  },

  // 配置和规则前缀
  CONFIG_MODULES: {
    CONFIG: 'config',
    RULE: 'rule',
    MAPPING: 'mapping',
  },

  // 临时和锁前缀
  UTILITY_MODULES: {
    TEMP: 'temp',
    LOCK: 'lock',
  },
});

/**
 * 缓存高级策略语义配置
 * 🎯 整合高级缓存策略和优化配置
 */
export const CACHE_ADVANCED_STRATEGY_SEMANTICS = Object.freeze({
  // 预热配置
  WARMUP: {
    BATCH_SIZE: NUMERIC_CONSTANTS.N_50,                         // 50 - 预热批量大小
  },

  // 压缩配置
  COMPRESSION: {
    ENABLE_COMPRESSION: true,                                       // 启用压缩
    ALGORITHM: 'gzip',                                              // 压缩算法
    THRESHOLD_BYTES: NUMERIC_CONSTANTS.N_6 * 1024,               // 6KB转字节
  },

  // 更新策略
  UPDATE_STRATEGY: {
  },

  // 驱逐策略
  EVICTION_POLICIES: {
  },
});

/**
 * 增强的缓存工具函数
 */
export class EnhancedCacheSemanticsUtil {
  /**
   * 构建完整的缓存键（包含所有前缀类型）
   */
  static buildFullCacheKey(
    moduleType: keyof typeof CACHE_KEY_PREFIX_SEMANTICS,
    module: string,
    identifier: string,
    ...parts: string[]
  ): string {
    const prefixGroup = CACHE_KEY_PREFIX_SEMANTICS[moduleType];
    const prefix = prefixGroup[module as keyof typeof prefixGroup] || module;
    const separator = CACHE_KEY_SEMANTICS.SEPARATORS.NAMESPACE;
    return [prefix, identifier, ...parts].join(separator);
  }

  /**
   * 判断是否需要压缩
   */
  static shouldCompress(valueSize: number): boolean {
    return CACHE_ADVANCED_STRATEGY_SEMANTICS.COMPRESSION.ENABLE_COMPRESSION &&
           valueSize > CACHE_ADVANCED_STRATEGY_SEMANTICS.COMPRESSION.THRESHOLD_BYTES;
  }

  /**
   * 根据缓存键解析模块类型
   */
  static parseModuleFromKey(cacheKey: string): { moduleType: string; module: string } | null {
    const parts = cacheKey.split(CACHE_KEY_SEMANTICS.SEPARATORS.NAMESPACE);
    if (parts.length < 2) return null;

    const prefix = parts[0];
    
    // 查找匹配的模块类型
    for (const [moduleType, modules] of Object.entries(CACHE_KEY_PREFIX_SEMANTICS)) {
      for (const [module, modulePrefix] of Object.entries(modules)) {
        if (modulePrefix === prefix) {
          return { moduleType, module };
        }
      }
    }
    
    return null;
  }

  /**
   * 获取监控阈值
   */
  static getMonitoringThreshold(metric: 'hit_rate' | 'response_time' | 'memory_usage'): number {
    const thresholds = CACHE_MONITORING_SEMANTICS.PERFORMANCE_THRESHOLDS;
    switch (metric) {
      case 'hit_rate':
        return thresholds.CACHE_HIT_RATE_TARGET;
      case 'response_time':
        return thresholds.RESPONSE_TIME_TARGET_MS;
      case 'memory_usage':
        return thresholds.MEMORY_USAGE_WARNING;
      default:
        return 0;
    }
  }
}

/**
 * 类型定义
 */
export type CacheKeySemantics = typeof CACHE_KEY_SEMANTICS;
export type CacheStrategySemantics = typeof CACHE_STRATEGY_SEMANTICS;
export type CacheConnectionSemantics = typeof CACHE_CONNECTION_SEMANTICS;
export type CacheMonitoringSemantics = typeof CACHE_MONITORING_SEMANTICS;
export type CacheKeyPrefixSemantics = typeof CACHE_KEY_PREFIX_SEMANTICS;
export type CacheAdvancedStrategySemantics = typeof CACHE_ADVANCED_STRATEGY_SEMANTICS;