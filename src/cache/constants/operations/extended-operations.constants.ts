/**
 * 缓存扩展操作常量
 * 🎯 符合开发规范指南 - 分离低频或管理类操作
 * 包含模式删除、统计、健康检查等扩展功能
 */

export const CACHE_EXTENDED_OPERATIONS = Object.freeze({
  PATTERN_DELETE: "delByPattern",     // 模式删除
  WARMUP: "warmup",                   // 缓存预热
  HEALTH_CHECK: "healthCheck",        // 健康检查
  GET_STATS: "getStats",             // 获取统计信息
  ACQUIRE_LOCK: "acquireLock",       // 获取分布式锁
  RELEASE_LOCK: "releaseLock",       // 释放分布式锁
  CLEANUP_STATS: "cleanupStats",     // 清理统计数据
  CHECK_AND_LOG_HEALTH: "checkAndLogHealth", // 检查并记录健康状态
} as const);