/**
 * 缓存操作接口
 */
export interface ICacheOperation {
  /**
   * 获取缓存数据
   */
  get<T>(key: string): Promise<{ data: T; ttlRemaining: number } | null>;

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl: number): Promise<void>;

  /**
   * 删除缓存数据
   */
  delete(key: string): Promise<boolean>;

  /**
   * 批量获取缓存数据
   */
  mget<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number } | null>>;

  /**
   * 批量设置缓存数据
   */
  mset<T>(entries: Array<{ key: string; data: T; ttl: number }>): Promise<void>;
}

/**
 * 缓存回源操作接口
 */
export interface ICacheFallback {
  /**
   * 带回源的缓存获取
   */
  getWithFallback<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<{ data: T; hit: boolean; ttlRemaining?: number }>;
}

/**
 * 缓存元数据操作接口
 */
export interface ICacheMetadata {
  /**
   * 带元数据的批量获取
   */
  mgetWithMetadata<T>(
    keys: string[]
  ): Promise<Array<{ data: T; ttlRemaining: number; storedAt: number } | null>>;
}