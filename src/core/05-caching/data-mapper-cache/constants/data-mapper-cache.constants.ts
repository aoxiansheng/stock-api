import { DATA_MAPPER_CACHE_CONFIG } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";

/**
 * DataMapper 缓存常量配置
 * 专用于映射规则缓存的配置项
 */
export const DATA_MAPPER_CACHE_CONSTANTS = {
  // 🔑 缓存键前缀 - 使用简短前缀减少内存占用
  CACHE_KEYS: {
    BEST_RULE: "dm:best_rule", // 最佳匹配规则缓存
    RULE_BY_ID: "dm:rule_by_id", // 根据ID缓存规则
    PROVIDER_RULES: "dm:provider_rules", // 按提供商缓存规则列表
    RULE_STATS: "dm:rule_stats", // 规则统计信息
  },

  // ⏰ TTL 配置 (秒) - 使用统一配置
  TTL: {
    BEST_RULE: DATA_MAPPER_CACHE_CONFIG.RULE_CACHE_TTL, // 使用统一规则缓存TTL
    RULE_BY_ID: DATA_MAPPER_CACHE_CONFIG.RULE_CACHE_TTL, // 使用统一规则缓存TTL
    PROVIDER_RULES: DATA_MAPPER_CACHE_CONFIG.SUGGESTION_CACHE_TTL, // 使用建议缓存TTL（更新更频繁）
    RULE_STATS: DATA_MAPPER_CACHE_CONFIG.SUGGESTION_CACHE_TTL, // 统计信息更新频繁
  },

  // 📊 性能阈值配置
  PERFORMANCE: {
    SLOW_OPERATION_MS: 100, // 慢操作阈值 (毫秒)
    MAX_BATCH_SIZE: 100, // 批量操作最大数量
    STATS_CLEANUP_INTERVAL_MS: 300000, // 统计清理间隔 (5分钟)
  },

  // ⏱️ 操作超时配置
  OPERATION_TIMEOUTS: {
    DEFAULT_SCAN_MS: 5000, // scanKeysWithTimeout 默认超时
    PROVIDER_INVALIDATE_MS: 3000, // 提供商缓存失效扫描超时
    STATS_SCAN_MS: 2000, // 统计信息扫描超时
    CLEAR_ALL_MS: 5000, // 清理所有缓存超时
  },

  // 🔄 批处理操作配置
  BATCH_OPERATIONS: {
    REDIS_SCAN_COUNT: 100, // Redis SCAN命令的COUNT参数
    DELETE_BATCH_SIZE: 100, // 批量删除的批次大小
    MAX_KEYS_PREVENTION: 10000, // 防止内存过度使用的键数限制
    INTER_BATCH_DELAY_MS: 10, // 批次间延迟毫秒数，降低Redis负载
  },

  // 📏 大小限制
  SIZE_LIMITS: {
    MAX_KEY_LENGTH: 250, // 最大键长度
    MAX_RULE_SIZE_KB: 10, // 单个规则最大大小 (KB)
  },

  // 🏷️ 错误消息 - 仅保留实际使用的错误消息
  ERROR_MESSAGES: {
    INVALID_RULE_ID: "无效的规则ID", // 对应 DATA_MAPPER_CACHE_ERROR_CODES.INVALID_RULE_ID
  },

  // ✅ 成功消息
  SUCCESS_MESSAGES: {
    CACHE_WARMUP_STARTED: "DataMapper缓存预热开始",
    CACHE_WARMUP_COMPLETED: "DataMapper缓存预热完成",
    CACHE_CLEARED: "DataMapper缓存已清空",
  },
} as const;

/**
 * 缓存操作类型枚举
 */
export enum DataMapperCacheOperation {
  SET = "set",
  GET = "get",
  DELETE = "delete",
  PATTERN_DELETE = "pattern_delete",
  WARMUP = "warmup",
  CLEAR = "clear",
}

/**
 * 缓存统计类型
 */
export interface DataMapperCacheMetrics {
  hits: number;
  misses: number;
  operations: number;
  avgResponseTime: number;
  lastResetTime: Date;
}
