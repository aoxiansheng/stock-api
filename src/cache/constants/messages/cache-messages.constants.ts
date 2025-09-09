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
  },
  
  /**
   * 成功消息
   */
  SUCCESS: {
  },
  
  /**
   * 警告消息
   */
  WARNINGS: {
  },
  
} as const);