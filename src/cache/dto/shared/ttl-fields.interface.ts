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

// 向后兼容性导出
/**
 * @deprecated 使用 RequiredTTL 替代
 */
export interface BaseTTL extends RequiredTTL {}