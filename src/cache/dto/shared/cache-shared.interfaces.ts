/**
 * 缓存共享接口统一定义
 * 🎯 合并原来分散的小接口文件，减少文件碎片化
 *
 * 原始文件合并：
 * - cache-statistics.interface.ts
 * - key-pattern.interface.ts
 * - size-fields.interface.ts
 * - ttl-fields.interface.ts
 */

// ============================================================================
// 缓存统计相关接口 (原 cache-statistics.interface.ts)
// ============================================================================

/**
 * 缓存统计信息接口
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

// ============================================================================
// 键模式相关接口 (原 key-pattern.interface.ts)
// ============================================================================

/**
 * 键模式接口
 */
export interface KeyPattern {
  pattern: string;
  lastAccessTime: number;
}

// ============================================================================
// 大小字段相关接口 (原 size-fields.interface.ts)
// ============================================================================

/**
 * 大小字段接口
 */
export interface SizeFields {
  originalSize?: number;
  compressedSize?: number;
  serializedSize?: number;
}

/**
 * 缓存配置大小信息接口
 */
export interface CacheConfigSizeInfo {
  maxSize?: number;
}

/**
 * 压缩大小信息接口
 */
export interface CompressionSizeInfo {
  originalSize: number;
  processedSize?: number;
}

/**
 * 批量大小信息接口
 */
export interface BatchSizeInfo {
  batchSize: number;
}

// ============================================================================
// TTL字段相关接口 (原 ttl-fields.interface.ts)
// ============================================================================

/**
 * 基础TTL接口 - 必需的TTL字段
 * 用于需要明确TTL设置的场景
 */
export interface RequiredTTL {
  ttl: number;
}

/**
 * 可选TTL接口 - 可选的TTL字段
 * 用于TTL为可选配置的场景
 */
export interface OptionalTTL {
  ttl?: number;
}

/**
 * 完整TTL字段接口 - 包含TTL相关的所有时间信息
 * 继承OptionalTTL，扩展过期时间和剩余时间字段
 */
export interface TTLFields extends OptionalTTL {
  expiresAt?: Date;
  remainingTime?: number;
}

// ============================================================================
// 复合接口 - 组合多个基础接口的常用组合
// ============================================================================

/**
 * 缓存项基础信息 - 组合键模式和TTL字段
 */
export interface CacheItemInfo extends KeyPattern, TTLFields {
  // 继承了 pattern, lastAccessTime, ttl?, expiresAt?, remainingTime?
}

/**
 * 缓存项完整信息 - 包含统计、大小和TTL信息
 */
export interface CacheItemDetails
  extends CacheStatistics,
    SizeFields,
    TTLFields {
  // 继承了统计、大小和TTL的所有字段
}

/**
 * 缓存操作元数据 - 包含大小和TTL信息
 */
export interface CacheOperationMeta extends SizeFields, RequiredTTL {
  // 继承了 originalSize?, compressedSize?, serializedSize?, ttl
}
