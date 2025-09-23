/**
 * 流数据缓存接口
 * 专用于实时流数据的缓存操作
 */

import { BaseCacheConfig } from "../../basic-cache/interfaces/base-cache-config.interface";

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
 * 流缓存配置接口
 * 继承基础配置，专门用于实时数据流缓存
 */
export interface StreamCacheConfig extends BaseCacheConfig {
  /** 热缓存TTL (毫秒) - 高频访问数据的短期缓存 */
  hotCacheTTL: number;

  /** 温缓存TTL (秒) - 中频访问数据的长期缓存 */
  warmCacheTTL: number;

  /** 热缓存最大容量 */
  maxHotCacheSize: number;

  /** 流数据批量处理大小 */
  streamBatchSize: number;

  /** 连接超时时间 (毫秒) */
  connectionTimeout: number;

  /** 心跳间隔 (毫秒) */
  heartbeatInterval: number;
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
   * 清空所有缓存 - 支持智能清理策略
   */
  clearAll(options?: { force?: boolean; preserveActive?: boolean; maxAge?: number }): Promise<void>;

}
