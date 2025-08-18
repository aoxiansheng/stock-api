/**
 * 缓存元数据接口
 */
export interface CacheMetadata {
  /**
   * 存储时间戳（毫秒）
   */
  storedAt: number;

  /**
   * 是否压缩
   */
  compressed: boolean;

  /**
   * 原始数据大小（字节）
   */
  originalSize?: number;

  /**
   * 压缩后大小（字节）
   */
  compressedSize?: number;
}

/**
 * Redis存储的envelope格式
 */
export interface RedisEnvelope<T = any> {
  /**
   * 实际业务数据
   */
  data: T;

  /**
   * 存储时间戳（毫秒）
   */
  storedAt: number;

  /**
   * 是否压缩
   */
  compressed: boolean;

  /**
   * 可选的元数据
   */
  metadata?: Partial<CacheMetadata>;
}

/**
 * 缓存结果接口
 */
export interface CacheResult<T> {
  /**
   * 业务数据
   */
  data: T;

  /**
   * 剩余TTL（秒）
   */
  ttlRemaining: number;

  /**
   * 是否缓存命中
   */
  hit?: boolean;

  /**
   * 存储时间戳（毫秒）
   */
  storedAt?: number;
}