/**
 * 缓存扩展操作常量
 * 🎯 符合开发规范指南 - 分离低频或管理类操作
 * 包含模式删除、统计、健康检查等扩展功能
 */

export const CACHE_EXTENDED_OPERATIONS = Object.freeze({
  RELEASE_LOCK: "releaseLock",       // 释放分布式锁
} as const);