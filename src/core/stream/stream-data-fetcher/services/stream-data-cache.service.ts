import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { CacheService } from '../../../../cache/services/cache.service';

/**
 * 压缩数据点格式
 */
export interface CompressedDataPoint {
  s: string;  // symbol
  p: number;  // price
  v: number;  // volume
  t: number;  // timestamp
  c?: number; // change
  cp?: number; // change percent
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hotCacheHits: number;
  hotCacheMisses: number;
  warmCacheHits: number;
  warmCacheMisses: number;
  totalSize: number;
  compressionRatio: number;
}

/**
 * StreamDataCacheService - 智能双路径缓存系统
 * 
 * 🎯 核心功能：
 * - Hot Cache (LRU): 内存中的快速访问缓存，存储最近访问的数据
 * - Warm Cache (Redis): 分布式缓存，存储较大数据集
 * - 数据压缩：减少内存和网络传输开销
 * - 智能缓存策略：根据访问频率和数据大小自动选择存储层
 * 
 * 📊 缓存层级：
 * 1. Hot Cache (内存LRU) - 最热数据，毫秒级访问
 * 2. Warm Cache (Redis) - 温数据，10ms级访问
 * 3. 源数据 (Provider API) - 冷数据，100ms+访问
 */
@Injectable()
export class StreamDataCacheService {
  private readonly logger = createLogger('StreamDataCache');
  
  // Hot Cache - LRU in-memory cache
  private readonly hotCache = new Map<string, {
    data: CompressedDataPoint[];
    timestamp: number;
    accessCount: number;
  }>();
  
  private readonly maxHotCacheSize = 1000;
  private readonly hotCacheTTL = 30000; // 30秒
  
  // 缓存统计
  private stats: CacheStats = {
    hotCacheHits: 0,
    hotCacheMisses: 0,
    warmCacheHits: 0,
    warmCacheMisses: 0,
    totalSize: 0,
    compressionRatio: 0,
  };
  
  constructor(
    private readonly cacheService: CacheService,
  ) {
    this.setupPeriodicCleanup();
  }

  /**
   * 获取数据 - 智能多层缓存查找
   * @param key 缓存键
   * @returns 数据或null
   */
  async getData(key: string): Promise<CompressedDataPoint[] | null> {
    const startTime = Date.now();
    
    try {
      // 1. 检查 Hot Cache
      const hotCacheData = this.getFromHotCache(key);
      if (hotCacheData) {
        this.stats.hotCacheHits++;
        this.logger.debug('Hot cache命中', { key, duration: Date.now() - startTime });
        return hotCacheData;
      }
      this.stats.hotCacheMisses++;
      
      // 2. 检查 Warm Cache (Redis)
      const warmCacheData = await this.getFromWarmCache(key);
      if (warmCacheData) {
        this.stats.warmCacheHits++;
        // 提升到 Hot Cache
        this.setToHotCache(key, warmCacheData);
        this.logger.debug('Warm cache命中，提升到Hot cache', { key, duration: Date.now() - startTime });
        return warmCacheData;
      }
      this.stats.warmCacheMisses++;
      
      this.logger.debug('缓存未命中', { key, duration: Date.now() - startTime });
      return null;
      
    } catch (error) {
      this.logger.error('缓存查询失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置数据到缓存 - 智能存储策略
   * @param key 缓存键
   * @param data 原始数据
   * @param priority 优先级 ('hot' | 'warm' | 'auto')
   */
  async setData(key: string, data: any[], priority: 'hot' | 'warm' | 'auto' = 'auto'): Promise<void> {
    if (!data || data.length === 0) return;
    
    try {
      // 数据压缩
      const compressedData = this.compressData(data);
      const dataSize = JSON.stringify(compressedData).length;
      
      // 智能存储策略
      const shouldUseHotCache = priority === 'hot' || 
        (priority === 'auto' && dataSize < 10000 && data.length < 100);
      
      if (shouldUseHotCache) {
        this.setToHotCache(key, compressedData);
      }
      
      // 总是同时存储到 Warm Cache 作为备份
      await this.setToWarmCache(key, compressedData);
      
      this.updateCacheStats(dataSize, data.length, compressedData.length);
      
      this.logger.debug('数据已缓存', {
        key,
        dataSize,
        compressedSize: JSON.stringify(compressedData).length,
        hotCache: shouldUseHotCache,
        warmCache: true,
      });
      
    } catch (error) {
      this.logger.error('缓存设置失败', { key, error: error.message });
    }
  }

  /**
   * 获取自指定时间戳以来的数据 - 增量查询优化
   * @param key 缓存键
   * @param since 时间戳
   * @returns 增量数据
   */
  async getDataSince(key: string, since: number): Promise<CompressedDataPoint[] | null> {
    const allData = await this.getData(key);
    if (!allData) return null;
    
    // 过滤出指定时间戳之后的数据
    const incrementalData = allData.filter(point => point.t > since);
    
    this.logger.debug('增量数据查询', {
      key,
      since,
      totalPoints: allData.length,
      incrementalPoints: incrementalData.length,
    });
    
    return incrementalData.length > 0 ? incrementalData : null;
  }

  /**
   * 批量获取数据
   * @param keys 缓存键数组
   * @returns 键值对映射
   */
  async getBatchData(keys: string[]): Promise<Record<string, CompressedDataPoint[] | null>> {
    const result: Record<string, CompressedDataPoint[] | null> = {};
    
    const promises = keys.map(async (key) => {
      const data = await this.getData(key);
      result[key] = data;
    });
    
    await Promise.all(promises);
    return result;
  }

  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  async deleteData(key: string): Promise<void> {
    try {
      // 删除 Hot Cache
      this.hotCache.delete(key);
      
      // 删除 Warm Cache
      await this.cacheService.del(this.buildWarmCacheKey(key));
      
      this.logger.debug('缓存数据已删除', { key });
    } catch (error) {
      this.logger.error('缓存删除失败', { key, error: error.message });
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      this.hotCache.clear();
      
      // 清空 Warm Cache 中的流数据
      const pattern = 'stream_cache:*';
      await this.cacheService.delByPattern(pattern);
      
      this.resetStats();
      this.logger.log('所有缓存已清空');
    } catch (error) {
      this.logger.error('缓存清空失败', { error: error.message });
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    return {
      ...this.stats,
      totalSize: this.hotCache.size,
    };
  }

  // === 私有方法 ===

  /**
   * 从 Hot Cache 获取数据
   */
  private getFromHotCache(key: string): CompressedDataPoint[] | null {
    const entry = this.hotCache.get(key);
    if (!entry) return null;
    
    // 检查TTL
    if (Date.now() - entry.timestamp > this.hotCacheTTL) {
      this.hotCache.delete(key);
      return null;
    }
    
    // 更新访问计数
    entry.accessCount++;
    return entry.data;
  }

  /**
   * 设置数据到 Hot Cache
   */
  private setToHotCache(key: string, data: CompressedDataPoint[]): void {
    // LRU 清理
    if (this.hotCache.size >= this.maxHotCacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.hotCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * 从 Warm Cache (Redis) 获取数据
   */
  private async getFromWarmCache(key: string): Promise<CompressedDataPoint[] | null> {
    try {
      const cacheKey = this.buildWarmCacheKey(key);
      const cachedData = await this.cacheService.get(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData as string);
      }
      return null;
    } catch (error) {
      this.logger.warn('Warm cache访问失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置数据到 Warm Cache (Redis)
   */
  private async setToWarmCache(key: string, data: CompressedDataPoint[]): Promise<void> {
    try {
      const cacheKey = this.buildWarmCacheKey(key);
      const serializedData = JSON.stringify(data);
      
      // 设置TTL为5分钟
      await this.cacheService.set(cacheKey, serializedData, { ttl: 300 });
    } catch (error) {
      this.logger.warn('Warm cache设置失败', { key, error: error.message });
    }
  }

  /**
   * 构建 Warm Cache 键
   */
  private buildWarmCacheKey(key: string): string {
    return `stream_cache:${key}`;
  }

  /**
   * 数据压缩 - 将原始数据转换为压缩格式
   */
  private compressData(data: any[]): CompressedDataPoint[] {
    return data.map(item => {
      // 根据数据结构进行压缩映射
      if (typeof item === 'object' && item !== null) {
        return {
          s: item.symbol || item.s || '',
          p: item.price || item.lastPrice || item.p || 0,
          v: item.volume || item.v || 0,
          t: item.timestamp || item.t || Date.now(),
          c: item.change || item.c,
          cp: item.changePercent || item.cp,
        };
      }
      return item;
    });
  }

  /**
   * LRU 清理最少使用的条目
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let lruAccessCount = Infinity;
    let lruTimestamp = Date.now();
    
    for (const [key, entry] of this.hotCache.entries()) {
      if (entry.accessCount < lruAccessCount || 
          (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)) {
        lruKey = key;
        lruAccessCount = entry.accessCount;
        lruTimestamp = entry.timestamp;
      }
    }
    
    if (lruKey) {
      this.hotCache.delete(lruKey);
      this.logger.debug('LRU清理缓存条目', { key: lruKey, accessCount: lruAccessCount });
    }
  }

  /**
   * 更新缓存统计
   */
  private updateCacheStats(dataSize: number, originalLength: number, compressedLength: number): void {
    this.stats.compressionRatio = originalLength > 0 ? compressedLength / originalLength : 1;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      hotCacheHits: 0,
      hotCacheMisses: 0,
      warmCacheHits: 0,
      warmCacheMisses: 0,
      totalSize: 0,
      compressionRatio: 0,
    };
  }

  /**
   * 设置周期性清理
   */
  private setupPeriodicCleanup(): void {
    // 每2分钟清理过期的 Hot Cache 条目
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.hotCache.entries()) {
        if (now - entry.timestamp > this.hotCacheTTL) {
          this.hotCache.delete(key);
        }
      }
    }, 120000);
  }
}