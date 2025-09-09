/**
 * Cache TTL 常量
 * 🎯 从 common/constants/semantic/cache-semantics.constants.ts 剥离的缓存 TTL 配置
 * 专用于 Cache 模块的 TTL 语义常量
 */

import { NUMERIC_CONSTANTS } from '../../common/constants/core';

/**
 * 缓存TTL语义分类
 * 🎯 解决TTL配置重复和命名不一致问题
 */
export const CACHE_TTL_SEMANTICS = Object.freeze({
  // 基础TTL分类（秒）
  BASIC: {
    SHORT_SEC: NUMERIC_CONSTANTS.N_300,               // 5分钟 - 短期
    MEDIUM_SEC: NUMERIC_CONSTANTS.N_600,               // 10分钟 - 中期
    LONG_SEC: NUMERIC_CONSTANTS.N_3600,                    // 1小时 - 长期
    VERY_LONG_SEC: NUMERIC_CONSTANTS.N_86400,                // 1天 - 极长期
  },

  // 数据类型特定TTL（秒）
  DATA_TYPE: {
    REALTIME_SEC: NUMERIC_CONSTANTS.N_5,            // 5秒 - 实时数据
    FREQUENT_UPDATE_SEC: NUMERIC_CONSTANTS.N_60,       // 1分钟 - 频繁更新
    NORMAL_UPDATE_SEC: NUMERIC_CONSTANTS.N_600,        // 10分钟 - 普通更新
    SLOW_UPDATE_SEC: NUMERIC_CONSTANTS.N_3600,             // 1小时 - 缓慢更新
    STATIC_SEC: NUMERIC_CONSTANTS.N_86400,                   // 1天 - 静态数据
  },

  // 业务场景特定TTL（秒）
  BUSINESS: {
    USER_SESSION_SEC: NUMERIC_CONSTANTS.N_1800,      // 30分钟 - 用户会话
    API_RESPONSE_SEC: NUMERIC_CONSTANTS.N_300,        // 5分钟 - API响应
    DATABASE_QUERY_SEC: NUMERIC_CONSTANTS.N_600,       // 10分钟 - 数据库查询
    COMPUTATION_RESULT_SEC: NUMERIC_CONSTANTS.N_3600,      // 1小时 - 计算结果
    FILE_CONTENT_SEC: NUMERIC_CONSTANTS.N_86400,             // 1天 - 文件内容
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
    SOURCE_FIRST: 'source-first',         // 优先读源，源失败时读缓存
    
    // 写策略
    WRITE_THROUGH: 'write-through',       // 写透策略，同时写缓存和源
    WRITE_AROUND: 'write-around',         // 绕写策略，直接写源不写缓存
    WRITE_BACK: 'write-back',             // 写回策略，先写缓存后写源
  },

  // 失效策略
  EVICTION: {
    LRU: 'lru',                          // 最近最少使用
    LFU: 'lfu',                          // 最不经常使用
    FIFO: 'fifo',                        // 先进先出
    TTL: 'ttl',                          // 基于TTL
    RANDOM: 'random',                    // 随机驱逐
  },

  // 一致性级别
  CONSISTENCY: {
    STRONG: 'strong',                    // 强一致性
    EVENTUAL: 'eventual',                // 最终一致性
    WEAK: 'weak',                        // 弱一致性
  },
});

/**
 * 缓存大小语义限制
 * 🎯 解决缓存大小配置重复定义
 */
export const CACHE_SIZE_SEMANTICS = Object.freeze({
  // 内存缓存大小限制
  MEMORY: {
    SMALL_ENTRIES: NUMERIC_CONSTANTS.N_100,                       // 100 - 小型缓存
    MEDIUM_ENTRIES: NUMERIC_CONSTANTS.N_500,                      // 500 - 中型缓存
    LARGE_ENTRIES: NUMERIC_CONSTANTS.N_1000,                      // 1000 - 大型缓存
    EXTRA_LARGE_ENTRIES: NUMERIC_CONSTANTS.N_5000,                // 5000 - 超大型缓存
  },

  // 单个缓存项大小限制（字节）
  ENTRY_SIZE: {
    TINY_BYTES: NUMERIC_CONSTANTS.N_6 * 1024,                   // 6KB - 极小项
    SMALL_BYTES: NUMERIC_CONSTANTS.N_50 * 1024,                // 50KB - 小项
    MEDIUM_BYTES: NUMERIC_CONSTANTS.N_100 * 1024,              // 100KB - 中项
    LARGE_BYTES: NUMERIC_CONSTANTS.N_500 * 1024,               // 500KB - 大项
    MAX_BYTES: NUMERIC_CONSTANTS.N_1000 * 1024,                // 1MB - 最大项
  },

  // 批量操作大小
  BATCH_OPERATIONS: {
    SMALL_BATCH: NUMERIC_CONSTANTS.N_6,                        // 6 - 小批量
    MEDIUM_BATCH: NUMERIC_CONSTANTS.N_50,                      // 50 - 中等批量
    LARGE_BATCH: NUMERIC_CONSTANTS.N_100,                      // 100 - 大批量
    MAX_BATCH_SIZE: NUMERIC_CONSTANTS.N_1000,                  // 1000 - 最大批量
  },
});

/**
 * 缓存性能语义指标
 */
export const CACHE_PERFORMANCE_SEMANTICS = Object.freeze({
  // 命中率阈值
  HIT_RATE_THRESHOLDS: {
    EXCELLENT: NUMERIC_CONSTANTS.N_100 * 0.9,               // 90% - 优秀
    GOOD: NUMERIC_CONSTANTS.N_100 * 0.8,                    // 80% - 良好
    FAIR: NUMERIC_CONSTANTS.N_100 * 0.6,                    // 60% - 一般
    POOR: NUMERIC_CONSTANTS.N_100 * 0.4,                    // 40% - 较差
  },

  // 响应时间阈值（毫秒）
  RESPONSE_TIME_THRESHOLDS: {
    EXCELLENT_MS: NUMERIC_CONSTANTS.N_6,                    // 6ms - 优秀
    GOOD_MS: NUMERIC_CONSTANTS.N_50,                        // 50ms - 良好
    FAIR_MS: NUMERIC_CONSTANTS.N_100,                       // 100ms - 一般
    POOR_MS: NUMERIC_CONSTANTS.N_500,                       // 500ms - 较差
  },

  // 内存使用率阈值
  MEMORY_USAGE_THRESHOLDS: {
    LOW: NUMERIC_CONSTANTS.N_100 * 0.25,                    // 25% - 低使用率
    MEDIUM: NUMERIC_CONSTANTS.N_100 * 0.5,                  // 50% - 中等使用率
    HIGH: NUMERIC_CONSTANTS.N_100 * 0.75,                   // 75% - 高使用率
    CRITICAL: NUMERIC_CONSTANTS.N_100 * 0.9,                // 90% - 临界使用率
  },

  // 网络延迟阈值
  NETWORK_LATENCY_THRESHOLDS: {
    LOCAL_MS: NUMERIC_CONSTANTS.N_1,                        // 1ms - 本地
    LAN_MS: NUMERIC_CONSTANTS.N_6,                          // 6ms - 局域网
    WAN_MS: NUMERIC_CONSTANTS.N_50,                         // 50ms - 广域网
    INTERNET_MS: NUMERIC_CONSTANTS.N_100,                   // 100ms - 互联网
  },
});

/**
 * 缓存操作语义
 */
export const CACHE_OPERATIONS_SEMANTICS = Object.freeze({
  // 基础操作
  BASIC: {
    GET: 'get',
    SET: 'set',
    DELETE: 'delete',
    EXISTS: 'exists',
    TTL: 'ttl',
    EXPIRE: 'expire',
  },

  // 批量操作  
  BATCH: {
    MGET: 'mget',
    MSET: 'mset',
    MDEL: 'mdel',
  },

  // 高级操作
  ADVANCED: {
    INCR: 'incr',
    DECR: 'decr',
    APPEND: 'append',
    PREPEND: 'prepend',
  },

  // 管理操作
  ADMIN: {
    FLUSH: 'flush',
    PING: 'ping',
    INFO: 'info',
    STATS: 'stats',
    CLEAR: 'clear',
  },

  // 事务操作
  TRANSACTION: {
    MULTI: 'multi',
    EXEC: 'exec',
    DISCARD: 'discard',
    WATCH: 'watch',
    UNWATCH: 'unwatch',
  },
});

/**
 * 缓存键模式语义
 * 🎯 统一缓存键命名规范
 */
export const CACHE_KEY_PATTERNS = Object.freeze({
  // 键前缀分类
  PREFIXES: {
    USER: 'user',
    SESSION: 'session',
    API: 'api',
    DATA: 'data',
    QUERY: 'query',
    TEMP: 'temp',
    LOCK: 'lock',
    CONFIG: 'config',
    CACHE: 'cache',
    METRICS: 'metrics',
  },

  // 分隔符规范
  SEPARATORS: {
    NAMESPACE: ':',           // 命名空间分隔符
    FIELD: '.',              // 字段分隔符  
    LIST: '_',               // 列表分隔符
    HASH: '#',               // 哈希分隔符
  },

  // 键模式模板
  TEMPLATES: {
    USER_DATA: '{prefix}:user:{userId}:{dataType}',
    SESSION_DATA: '{prefix}:session:{sessionId}:{field}',
    API_RESPONSE: '{prefix}:api:{endpoint}:{params}',
    QUERY_RESULT: '{prefix}:query:{hash}:{timestamp}',
    TEMP_DATA: '{prefix}:temp:{type}:{ttl}:{id}',
    LOCK_KEY: '{prefix}:lock:{resource}:{operation}',
    CONFIG_KEY: '{prefix}:config:{module}:{setting}',
  },
});

/**
 * 缓存TTL工具类
 * 🎯 提供TTL相关的工具函数
 */
export class CacheTTLUtil {
  /**
   * 根据数据更新频率推荐TTL
   */
  static getRecommendedTTL(updateFrequency: 'realtime' | 'frequent' | 'normal' | 'slow' | 'static'): number {
    const mapping = {
      realtime: CACHE_TTL_SEMANTICS.DATA_TYPE.REALTIME_SEC,
      frequent: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC,
      normal: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,
      slow: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC,
      static: CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC,
    };
    
    return mapping[updateFrequency] || CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC;
  }

  /**
   * 根据业务场景推荐TTL
   */
  static getBusinessScenarioTTL(scenario: keyof typeof CACHE_TTL_SEMANTICS.BUSINESS): number {
    return CACHE_TTL_SEMANTICS.BUSINESS[scenario];
  }

  /**
   * 构建标准化缓存键
   */
  static buildCacheKey(prefix: string, namespace: string, ...parts: string[]): string {
    const separator = CACHE_KEY_PATTERNS.SEPARATORS.NAMESPACE;
    return [prefix, namespace, ...parts].filter(Boolean).join(separator);
  }

  /**
   * 解析缓存键的各个部分
   */
  static parseCacheKey(key: string): { prefix?: string; namespace?: string; parts: string[] } {
    const separator = CACHE_KEY_PATTERNS.SEPARATORS.NAMESPACE;
    const parts = key.split(separator);
    
    if (parts.length >= 2) {
      return {
        prefix: parts[0],
        namespace: parts[1],
        parts: parts.slice(2),
      };
    }
    
    return { parts };
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

  /**
   * 根据访问频率调整TTL
   */
  static adjustTTLByAccessFrequency(baseTTL: number, accessCount: number, timeWindow: number): number {
    const accessRate = accessCount / timeWindow; // 每秒访问次数
    
    // 高频访问减少TTL，低频访问增加TTL
    if (accessRate > 10) {
      return Math.max(baseTTL * 0.5, CACHE_TTL_SEMANTICS.DATA_TYPE.REALTIME_SEC);
    } else if (accessRate > 1) {
      return baseTTL;
    } else {
      return Math.min(baseTTL * 2, CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC);
    }
  }

  /**
   * 验证TTL配置
   */
  static validateTTLConfig(ttl: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (ttl <= 0) {
      errors.push('TTL必须大于0');
    }
    
    if (ttl > CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC * 7) {
      errors.push('TTL不应超过7天');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 格式化TTL显示
   */
  static formatTTLDisplay(ttl: number): string {
    if (ttl < 60) {
      return `${ttl}秒`;
    } else if (ttl < 3600) {
      return `${Math.floor(ttl / 60)}分钟`;
    } else if (ttl < 86400) {
      return `${Math.floor(ttl / 3600)}小时`;
    } else {
      return `${Math.floor(ttl / 86400)}天`;
    }
  }
}

/**
 * 类型定义
 */
export type CacheTTLSemantics = typeof CACHE_TTL_SEMANTICS;
export type CacheStrategySemantics = typeof CACHE_STRATEGY_SEMANTICS;
export type CacheSizeSemantics = typeof CACHE_SIZE_SEMANTICS;
export type CachePerformanceSemantics = typeof CACHE_PERFORMANCE_SEMANTICS;
export type CacheOperationsSemantics = typeof CACHE_OPERATIONS_SEMANTICS;
export type CacheKeyPatterns = typeof CACHE_KEY_PATTERNS;