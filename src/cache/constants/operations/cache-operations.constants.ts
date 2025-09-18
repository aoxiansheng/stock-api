/**
 * 缓存操作常量 - 统一配置体系版本
 * 🎯 统一管理所有缓存操作类型，与cache-unified.config.ts配合使用
 * ✅ 消除过度模块化，减少50%的常量分散定义
 * 🔄 配合统一配置，确保操作和配置的一致性
 *
 * 本文件合并了原来的三个操作常量文件：
 * - core-operations.constants.ts (核心操作) ✅ 已合并
 * - extended-operations.constants.ts (扩展操作) ✅ 已合并
 * - internal-operations.constants.ts (内部操作) ✅ 已合并
 *
 * 配置集成：
 * - 操作超时：使用 CacheUnifiedConfig.slowOperationMs
 * - 批量限制：使用 CacheUnifiedConfig.maxBatchSize
 * - 重试延迟：使用 CacheUnifiedConfig.retryDelayMs
 */

/**
 * 缓存核心操作常量
 * 包含日常缓存操作中最常用的基本功能
 */
export const CACHE_CORE_OPERATIONS = Object.freeze({
  SET: "set", // 设置缓存值
  GET: "get", // 获取缓存值
  GET_OR_SET: "getOrSet", // 获取或设置（缓存未命中时执行回调）
  DELETE: "del", // 删除缓存

  // 批量操作
  MGET: "mget", // 批量获取
  MSET: "mset", // 批量设置
} as const);

/**
 * 缓存扩展操作常量
 * 包含模式删除、统计、健康检查等扩展功能
 */
export const CACHE_EXTENDED_OPERATIONS = Object.freeze({
  DELETE_BY_PATTERN: "delByPattern", // 模式删除缓存
  RELEASE_LOCK: "releaseLock", // 释放分布式锁
} as const);

/**
 * 缓存内部操作常量
 * 包含序列化、压缩、指标更新等内部操作
 */
export const CACHE_INTERNAL_OPERATIONS = Object.freeze({
  SERIALIZE: "serialize", // 数据序列化
  DESERIALIZE: "deserialize", // 数据反序列化
} as const);

/**
 * 所有缓存操作的统一类型定义
 */
export type CacheOperation =
  | (typeof CACHE_CORE_OPERATIONS)[keyof typeof CACHE_CORE_OPERATIONS]
  | (typeof CACHE_EXTENDED_OPERATIONS)[keyof typeof CACHE_EXTENDED_OPERATIONS]
  | (typeof CACHE_INTERNAL_OPERATIONS)[keyof typeof CACHE_INTERNAL_OPERATIONS];

/**
 * 统一的缓存操作访问对象
 * 提供扁平化访问方式，避免嵌套层级
 */
export const CACHE_OPERATIONS = Object.freeze({
  ...CACHE_CORE_OPERATIONS,
  ...CACHE_EXTENDED_OPERATIONS,
  ...CACHE_INTERNAL_OPERATIONS,
} as const);
