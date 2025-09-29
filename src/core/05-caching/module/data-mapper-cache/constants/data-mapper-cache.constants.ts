
import {
  CACHE_CORE_TTL,
  CACHE_CORE_INTERVALS,
  CACHE_CORE_BATCH_SIZES
} from '../../../foundation/constants/core-values.constants';

/**
 * DataMapper 缓存常量配置
 * 使用Common-cache的共享常量作为基础
 */
export const DATA_MAPPER_CACHE_CONSTANTS = {
  // 🔑 缓存键前缀 - 使用简短前缀减少内存占用
  CACHE_KEYS: {
    BEST_RULE: "dm:best_rule", // 最佳匹配规则缓存
    RULE_BY_ID: "dm:rule_by_id", // 根据ID缓存规则
    PROVIDER_RULES: "dm:provider_rules", // 按提供商缓存规则列表
    RULE_STATS: "dm:rule_stats", // 规则统计信息
  },

  // ⏰ TTL 配置 (秒) - 使用共享TTL常量
  TTL: {
    BEST_RULE: CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS, // 数据映射批次查询TTL
    RULE_BY_ID: CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS, // 数据映射批次查询TTL
    PROVIDER_RULES: CACHE_CORE_TTL.NEAR_REAL_TIME_TTL_SECONDS, // 准实时更新
    RULE_STATS: CACHE_CORE_TTL.NEAR_REAL_TIME_TTL_SECONDS, // 统计信息准实时
  },

  // 📊 性能阈值配置 - 使用共享批次常量
  PERFORMANCE: {
    SLOW_OPERATION_MS: 100, // 慢操作阈值 (毫秒)
    MAX_BATCH_SIZE: CACHE_CORE_BATCH_SIZES.DATA_MAPPING_BATCH_SIZE, // 数据映射批次
    STATS_CLEANUP_INTERVAL_MS: CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS, // 使用共享清理间隔
  },

  // ⏱️ 操作超时配置 - 使用共享超时常量
  OPERATION_TIMEOUTS: {
    DEFAULT_SCAN_MS: CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS, // 使用共享操作超时
    PROVIDER_INVALIDATE_MS: CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS, // 使用共享操作超时
    STATS_SCAN_MS: 2000, // 统计信息扫描超时（特有配置）
    CLEAR_ALL_MS: CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS, // 使用共享操作超时
  },

  // 🔄 批处理操作配置 - 使用共享批次常量
  BATCH_OPERATIONS: {
    REDIS_SCAN_COUNT: CACHE_CORE_BATCH_SIZES.REDIS_SCAN_COUNT, // 使用共享Redis扫描批次
    DELETE_BATCH_SIZE: CACHE_CORE_BATCH_SIZES.REDIS_DELETE_BATCH_SIZE, // 使用共享删除批次
    MAX_KEYS_PREVENTION: 10000, // 防止内存过度使用的键数限制（特有配置）
    INTER_BATCH_DELAY_MS: 10, // 批次间延迟毫秒数（特有配置）
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


