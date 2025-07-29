/**
 * 统一缓存配置常量
 * 包含TTL配置、缓存键前缀、大小限制等供全局共享使用的配置
 *
 * 设计原则：
 * - 分层TTL：根据数据特性设置不同的过期时间
 * - 命名规范：统一的键名前缀和命名模式
 * - 可配置性：支持环境变量覆盖默认设置
 * - 监控友好：便于缓存性能监控和调试
 */

import { deepFreeze } from "@common/utils/object-immutability.util";

export const CACHE_CONSTANTS = deepFreeze({
  // TTL配置 (秒)
  TTL_SETTINGS: {
    // 通用TTL设置
    DEFAULT_TTL: 3600, // 默认TTL：1小时
    SHORT_TTL: 300, // 短期TTL：5分钟
    MEDIUM_TTL: 1800, // 中期TTL：30分钟
    LONG_TTL: 7200, // 长期TTL：2小时
    VERY_LONG_TTL: 86400, // 超长TTL：24小时

    // 业务特定TTL
    REALTIME_DATA_TTL: 5, // 实时数据：5秒
    BASIC_INFO_TTL: 3600, // 基础信息：1小时
    RULE_CACHE_TTL: 1800, // 规则缓存：30分钟
    MAPPING_CONFIG_TTL: 1800, // 映射配置：30分钟
    STATS_TTL: 300, // 统计数据：5分钟
    SESSION_TTL: 7200, // 会话数据：2小时
    RATE_LIMIT_TTL: 60, // 频率限制：1分钟

    // 认证相关TTL
    AUTH_TOKEN_TTL: 1800, // 认证令牌：30分钟
    API_KEY_CACHE_TTL: 3600, // API Key缓存：1小时
    PERMISSION_CACHE_TTL: 1800, // 权限缓存：30分钟

    // 监控和日志TTL
    METRICS_TTL: 600, // 性能指标：10分钟
    LOG_CACHE_TTL: 300, // 日志缓存：5分钟
    HEALTH_CHECK_TTL: 60, // 健康检查：1分钟
  },

  // 缓存键前缀
  KEY_PREFIXES: {
    // 核心业务模块
    QUERY: "query:",
    STORAGE: "storage:",
    TRANSFORM: "transform:",
    DATA_MAPPER: "data_mapper:",
    SYMBOL_MAPPER: "symbol_mapper:",
    RECEIVER: "receiver:",

    // 认证和权限
    AUTH: "auth:",
    API_KEY: "api_key:",
    PERMISSION: "permission:",
    RATE_LIMIT: "rate_limit:",
    SESSION: "session:",

    // 监控和指标
    METRICS: "metrics:",
    HEALTH: "health:",
    PERFORMANCE: "performance:",
    ALERT: "alert:",

    // 配置和规则
    CONFIG: "config:",
    RULE: "rule:",
    MAPPING: "mapping:",

    // 临时和锁
    TEMP: "temp:",
    LOCK: "lock:",
    QUEUE: "queue:",
  },

  // 缓存大小限制
  SIZE_LIMITS: {
    MAX_CACHE_SIZE: 1000, // 最大缓存条目数
    MAX_KEY_LENGTH: 255, // 最大键长度
    MAX_VALUE_SIZE_MB: 1, // 最大值大小：1MB
    DEFAULT_BATCH_SIZE: 100, // 默认批量操作大小
    MAX_BATCH_SIZE: 500, // 最大批量操作大小
    COMPRESSION_THRESHOLD_KB: 10, // 压缩阈值：10KB
  },

  // Redis连接配置
  REDIS_CONFIG: {
    MAX_RETRIES: 3, // 最大重连次数
    RETRY_DELAY_MS: 1000, // 重连延迟：1秒
    CONNECTION_TIMEOUT_MS: 5000, // 连接超时：5秒
    COMMAND_TIMEOUT_MS: 3000, // 命令超时：3秒
    KEEPALIVE_MS: 30000, // 保活时间：30秒
    MAX_CONNECTIONS: 20, // 最大连接数
    MIN_CONNECTIONS: 5, // 最小连接数
  },

  // 缓存策略配置
  STRATEGY_CONFIG: {
    // 驱逐策略
    EVICTION_POLICY: "allkeys-lru", // LRU驱逐策略

    // 预热配置
    WARMUP_BATCH_SIZE: 50, // 预热批量大小
    WARMUP_DELAY_MS: 100, // 预热延迟：100毫秒

    // 更新策略
    UPDATE_ON_ACCESS: true, // 访问时更新TTL
    LAZY_EXPIRATION: true, // 延迟过期

    // 序列化配置
    ENABLE_COMPRESSION: true, // 启用压缩
    COMPRESSION_ALGORITHM: "gzip", // 压缩算法
  },

  // 监控配置
  MONITORING_CONFIG: {
    ENABLE_METRICS: true, // 启用指标收集
    METRICS_INTERVAL_MS: 10000, // 指标收集间隔：10秒
    ALERT_THRESHOLD_PERCENT: 90, // 告警阈值：90%
    LOG_SLOW_OPERATIONS: true, // 记录慢操作
    SLOW_OPERATION_MS: 100, // 慢操作阈值：100毫秒
  },
});

// 导出类型定义
export type CacheTTL = keyof typeof CACHE_CONSTANTS.TTL_SETTINGS;
export type CacheKeyPrefix = keyof typeof CACHE_CONSTANTS.KEY_PREFIXES;
export type CacheSizeLimit = keyof typeof CACHE_CONSTANTS.SIZE_LIMITS;

/**
 * 生成标准化的缓存键
 * @param prefix 键前缀
 * @param identifier 标识符
 * @param suffix 可选后缀
 */
export function buildCacheKey(
  prefix: CacheKeyPrefix,
  identifier: string,
  suffix?: string,
): string {
  const keyPrefix = CACHE_CONSTANTS.KEY_PREFIXES[prefix];
  const baseKey = `${keyPrefix}${identifier}`;
  return suffix ? `${baseKey}:${suffix}` : baseKey;
}

/**
 * 解析缓存键，提取前缀和标识符
 * @param cacheKey 缓存键
 */
export function parseCacheKey(
  cacheKey: string,
): { prefix: string; identifier: string; suffix?: string } | null {
  if (!cacheKey || typeof cacheKey !== "string") {
    return null;
  }

  const prefixes = [...Object.values(CACHE_CONSTANTS.KEY_PREFIXES), "cache:"];
  const matchedPrefix = prefixes.find((prefix) => cacheKey.startsWith(prefix));

  if (!matchedPrefix) {
    return null;
  }

  const remaining = cacheKey.substring(matchedPrefix.length);
  const parts = remaining.split(":");

  return {
    prefix: matchedPrefix,
    identifier: parts[0],
    suffix: parts.length > 1 ? parts.slice(1).join(":") : undefined,
  };
}

/**
 * 根据环境变量获取TTL设置
 * @param key TTL配置键
 * @param defaultValue 默认值
 */
export function getTTLFromEnv(key: CacheTTL, defaultValue?: number): number {
  // 支持两种环境变量格式：CACHE_TTL_KEY 或 直接使用KEY
  const envKey = `CACHE_TTL_${key}`;
  const directEnvKey = key;
  const envValue = process.env[envKey] || process.env[directEnvKey];

  if (envValue && !isNaN(Number(envValue))) {
    return Number(envValue);
  }

  return defaultValue ?? CACHE_CONSTANTS.TTL_SETTINGS[key];
}

/**
 * 根据缓存数据性质获取推荐的TTL
 * @param cacheDataNature 缓存数据性质（实时、静态、配置、会话、指标等）
 */
export function getRecommendedTTL(
  cacheDataNature: "realtime" | "static" | "config" | "session" | "metrics",
): number {
  const ttlMap = {
    realtime: CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL,
    static: CACHE_CONSTANTS.TTL_SETTINGS.BASIC_INFO_TTL,
    config: CACHE_CONSTANTS.TTL_SETTINGS.MAPPING_CONFIG_TTL,
    session: CACHE_CONSTANTS.TTL_SETTINGS.SESSION_TTL,
    metrics: CACHE_CONSTANTS.TTL_SETTINGS.METRICS_TTL,
  };

  return ttlMap[cacheDataNature] || CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL;
}

/**
 * 检查缓存键是否需要压缩
 * @param valueSize 值的大小（字节）
 */
export function shouldCompress(valueSize: number): boolean {
  const thresholdBytes =
    CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB * 1024;
  return (
    CACHE_CONSTANTS.STRATEGY_CONFIG.ENABLE_COMPRESSION &&
    valueSize > thresholdBytes
  );
}
