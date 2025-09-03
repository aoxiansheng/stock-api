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

  // ⏰ TTL 配置 (秒) - 基于业务需求优化
  TTL: {
    BEST_RULE: 1800, // 30分钟 - 最佳规则相对稳定
    RULE_BY_ID: 3600, // 1小时 - 规则内容较少变更
    PROVIDER_RULES: 900, // 15分钟 - 规则列表可能变更
    RULE_STATS: 300, // 5分钟 - 统计信息更新频繁
  },

  // 📊 性能阈值配置
  PERFORMANCE: {
    SLOW_OPERATION_MS: 100, // 慢操作阈值 (毫秒)
    MAX_BATCH_SIZE: 100, // 批量操作最大数量
    STATS_CLEANUP_INTERVAL_MS: 300000, // 统计清理间隔 (5分钟)
  },

  // 📏 大小限制
  SIZE_LIMITS: {
    MAX_KEY_LENGTH: 250, // 最大键长度
    MAX_RULE_SIZE_KB: 10, // 单个规则最大大小 (KB)
  },

  // 🏷️ 错误消息
  ERROR_MESSAGES: {
    CACHE_SET_FAILED: "缓存设置失败",
    CACHE_GET_FAILED: "缓存获取失败",
    CACHE_DELETE_FAILED: "缓存删除失败",
    INVALID_RULE_ID: "无效的规则ID",
    RULE_TOO_LARGE: "规则数据过大",
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
