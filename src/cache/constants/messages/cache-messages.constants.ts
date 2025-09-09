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
    
    // 新增的错误消息
    WARMUP_FAILED: "缓存预热失败",
    COMPRESSION_FAILED: "数据压缩失败",
    DECOMPRESSION_FAILED: "数据解压缩失败",
    LOCK_RELEASE_FAILED: "锁释放失败",
    INVALID_KEY_LENGTH: "键长度无效",
  },
  
  /**
   * 成功消息
   */
  SUCCESS: {
    WARMUP_STARTED: "缓存预热开始",
    WARMUP_COMPLETED: "缓存预热完成",
  },
  
  /**
   * 警告消息
   */
  WARNINGS: {
    SLOW_OPERATION: "缓存操作耗时过长",
    LOCK_TIMEOUT: "获取分布式锁超时",
    LARGE_VALUE_WARNING: "缓存值过大警告",
  },
  
} as const);