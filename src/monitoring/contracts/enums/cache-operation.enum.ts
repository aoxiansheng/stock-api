/**
 * 缓存操作类型枚举
 * 用于标识不同的缓存操作
 */

export enum CacheOperationType {
  /**
   * 缓存命中
   */
  HIT = "hit",

  /**
   * 缓存未命中
   */
  MISS = "miss",

  /**
   * 设置缓存
   */
  SET = "set",

  /**
   * 获取缓存
   */
  GET = "get",

  /**
   * 删除缓存
   */
  DELETE = "delete",

  /**
   * 失效缓存
   */
  INVALIDATE = "invalidate",

  /**
   * 缓存过期
   */
  EXPIRE = "expire",

  /**
   * 清空缓存
   */
  FLUSH = "flush",

  /**
   * 缓存刷新
   */
  REFRESH = "refresh",
}

/**
 * 缓存策略类型枚举
 */
export enum CacheStrategyType {
  /**
   * 最近最少使用
   */
  LRU = "lru",

  /**
   * 先进先出
   */
  FIFO = "fifo",

  /**
   * 时间过期
   */
  TTL = "ttl",

  /**
   * 写入时失效
   */
  WRITE_THROUGH = "write_through",

  /**
   * 延迟写入
   */
  WRITE_BEHIND = "write_behind",

  /**
   * 只读缓存
   */
  READ_ONLY = "read_only",
}

/**
 * 缓存级别枚举
 */
export enum CacheLevel {
  /**
   * L1缓存（内存）
   */
  L1 = "l1",

  /**
   * L2缓存（Redis）
   */
  L2 = "l2",

  /**
   * L3缓存（数据库）
   */
  L3 = "l3",
}

/**
 * 缓存状态枚举
 */
export enum CacheStatus {
  /**
   * 正常工作
   */
  HEALTHY = "healthy",

  /**
   * 性能下降
   */
  DEGRADED = "degraded",

  /**
   * 不可用
   */
  UNAVAILABLE = "unavailable",

  /**
   * 正在初始化
   */
  INITIALIZING = "initializing",

  /**
   * 正在维护
   */
  MAINTENANCE = "maintenance",
}
