/**
 * 缓存模块消息常量
 * 🎯 符合开发规范指南 - 统一错误信息和日志消息
 * 提供标准化的消息模板，支持国际化扩展
 */

export const CACHE_MESSAGES = Object.freeze({
  /**
   * 错误消息
   */
  ERRORS: {
    SET_FAILED: "缓存设置失败",
    GET_FAILED: "缓存获取失败",
    GET_OR_SET_FAILED: "带回调的缓存获取或设置失败",
    DELETE_FAILED: "缓存删除失败",
    PATTERN_DELETE_FAILED: "模式删除缓存失败",
    BATCH_GET_FAILED: "批量缓存获取失败",
    BATCH_SET_FAILED: "批量缓存设置失败",
    WARMUP_FAILED: "缓存预热失败",
    LOCK_RELEASE_FAILED: "释放锁失败",
    COMPRESSION_FAILED: "数据压缩失败",
    DECOMPRESSION_FAILED: "数据解压失败",
    SERIALIZATION_FAILED: "数据序列化失败",
    DESERIALIZATION_FAILED: "数据反序列化失败",
    HEALTH_CHECK_FAILED: "缓存健康检查失败",
    REDIS_CONNECTION_FAILED: "Redis连接失败",
    REDIS_PING_FAILED: "Redis PING 命令失败",
    MEMORY_USAGE_HIGH: "Redis 内存使用率超过90%",
    STATS_RETRIEVAL_FAILED: "获取缓存统计信息失败",
    INVALID_KEY_LENGTH: "缓存键长度无效",
    CONNECTION_FAILED: "缓存连接失败",
    OPERATION_TIMEOUT: "缓存操作超时",
    INVALID_KEY: "缓存键值无效",
    KEY_NOT_FOUND: "缓存键值不存在",
    TTL_EXPIRED: "缓存已过期",
    LOCK_ACQUISITION_FAILED: "获取分布式锁失败",
  },
  
  /**
   * 成功消息
   */
  SUCCESS: {
    SET_SUCCESS: "缓存设置成功",
    GET_SUCCESS: "缓存获取成功",
    DELETE_SUCCESS: "缓存删除成功",
    BATCH_OPERATION_SUCCESS: "批量缓存操作成功",
    WARMUP_STARTED: "开始缓存预热",
    WARMUP_COMPLETED: "缓存预热完成",
    LOCK_ACQUIRED: "获取锁成功",
    LOCK_RELEASED: "释放锁成功",
    HEALTH_CHECK_PASSED: "缓存健康检查通过",
    STATS_CLEANUP_COMPLETED: "缓存统计清理完成",
    OPTIMIZATION_TASKS_STARTED: "缓存优化任务启动",
    CONNECTION_ESTABLISHED: "缓存连接已建立",
    OPERATION_COMPLETED: "缓存操作完成",
    DATA_CACHED: "数据已缓存",
    DATA_RETRIEVED: "数据已检索",
    CACHE_CLEARED: "缓存已清理",
  },
  
  /**
   * 警告消息
   */
  WARNINGS: {
    CACHE_MISS: "缓存未命中",
    LOCK_ACQUISITION_FAILED: "获取锁失败",
    COMPRESSION_SKIPPED: "跳过数据压缩",
    MEMORY_USAGE_WARNING: "内存使用率较高",
    SLOW_OPERATION: "缓存操作响应较慢",
    HEALTH_CHECK_WARNING: "缓存健康检查异常",
    STATS_CLEANUP_WARNING: "缓存统计清理异常",
    LARGE_VALUE_WARNING: "缓存值较大",
    HIGH_MISS_RATE: "缓存未命中率较高",
    LOCK_TIMEOUT: "锁等待超时",
    LOW_MEMORY: "缓存内存不足",
    CONNECTION_UNSTABLE: "缓存连接不稳定",
    TTL_APPROACHING: "缓存即将过期",
    PERFORMANCE_DEGRADED: "缓存性能下降",
  },
  
} as const);