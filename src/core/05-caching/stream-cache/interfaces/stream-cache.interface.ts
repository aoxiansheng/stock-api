/**
 * 流数据缓存接口
 * 专用于实时流数据的缓存操作
 */

/**
 * 压缩数据点格式 - 流数据专用格式
 */
export interface StreamDataPoint {
  s: string; // symbol
  p: number; // price
  v: number; // volume
  t: number; // timestamp
  c?: number; // change
  cp?: number; // change percent
}

/**
 * 流缓存统计信息
 */
export interface StreamCacheStats {
  hotCacheHits: number;
  hotCacheMisses: number;
  warmCacheHits: number;
  warmCacheMisses: number;
  totalSize: number;
  compressionRatio: number;
}

/**
 * 流缓存配置
 */
export interface StreamCacheConfig {
  hotCacheTTL: number; // Hot Cache TTL (毫秒)
  warmCacheTTL: number; // Warm Cache TTL (秒)
  maxHotCacheSize: number; // Hot Cache 最大条目数
  cleanupInterval: number; // 清理间隔 (毫秒)
  compressionThreshold: number; // 压缩阈值 (字节)
}

/**
 * 流缓存核心接口
 */
export interface IStreamCache {
  /**
   * 获取数据 - 智能多层缓存查找
   */
  getData(key: string): Promise<StreamDataPoint[] | null>;

  /**
   * 设置数据到缓存 - 智能存储策略
   */
  setData(
    key: string,
    data: any[],
    priority?: "hot" | "warm" | "auto",
  ): Promise<void>;

  /**
   * 获取自指定时间戳以来的数据 - 增量查询
   */
  getDataSince(key: string, since: number): Promise<StreamDataPoint[] | null>;

  /**
   * 批量获取数据
   */
  getBatchData(
    keys: string[],
  ): Promise<Record<string, StreamDataPoint[] | null>>;

  /**
   * 删除缓存数据
   */
  deleteData(key: string): Promise<void>;

  /**
   * 清空所有缓存
   */
  clearAll(): Promise<void>;

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): StreamCacheStats;
}
