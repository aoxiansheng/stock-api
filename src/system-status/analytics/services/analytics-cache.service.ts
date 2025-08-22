import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../cache/services/cache.service';
import { ANALYTICS_CACHE_CONFIG } from '../constants';

/**
 * LRU缓存项结构
 */
interface LRUItem<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

/**
 * Analytics专用缓存服务
 * 实现两级缓存策略：L1内存缓存 + L2 Redis缓存
 */
@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  
  // L1: 内存LRU缓存（最快，小容量）
  private readonly memoryCache = new Map<string, LRUItem<any>>();
  private readonly accessOrder: string[] = [];

  constructor(
    private readonly redisCache: CacheService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 获取缓存值
   * @param key 缓存键
   * @param options 选项
   */
  async get<T>(key: string, options?: { skipMemory?: boolean }): Promise<T | null> {
    const fullKey = `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.ANALYTICS}:${key}`;

    try {
      // L1: 内存缓存检查
      if (!options?.skipMemory && this.memoryCache.has(fullKey)) {
        const item = this.memoryCache.get(fullKey)!;
        
        // 检查是否过期
        const now = Date.now();
        if (now - item.timestamp < ANALYTICS_CACHE_CONFIG.MEMORY_CACHE.TTL) {
          // 更新访问计数和访问顺序
          item.accessCount++;
          this.updateAccessOrder(fullKey);
          
          this.logger.debug(`L1缓存命中: ${fullKey}`);
          return item.value;
        } else {
          // 已过期，清除
          this.memoryCache.delete(fullKey);
          this.removeFromAccessOrder(fullKey);
        }
      }

      // L2: Redis缓存检查  
      const redisValue = await this.redisCache.get<T>(fullKey);
      if (redisValue) {
        this.logger.debug(`L2缓存命中: ${fullKey}`);
        
        // 回填L1缓存
        this.setMemoryCache(fullKey, redisValue);
        return redisValue;
      }

      this.logger.debug(`缓存未命中: ${fullKey}`);
      return null;

    } catch (error) {
      this.logger.warn('缓存获取失败，降级到计算模式', { 
        key: fullKey, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl TTL（秒），如果不提供则使用默认值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.ANALYTICS}:${key}`;
    const cacheTTL = ttl || this.getDefaultTTL(key);

    try {
      // 同时写入L1和L2缓存
      this.setMemoryCache(fullKey, value);
      await this.redisCache.set(fullKey, value, { ttl: cacheTTL });
      
      this.logger.debug('缓存写入成功', { 
        key: fullKey, 
        ttl: cacheTTL,
        size: JSON.stringify(value).length 
      });

    } catch (error) {
      this.logger.error('缓存写入失败', { 
        key: fullKey, 
        error: error.message 
      });
      // 缓存失败不影响主流程
    }
  }

  /**
   * 根据模式使缓存失效
   * @param pattern 缓存键模式
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // 清除匹配模式的内存缓存
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => 
        key.includes(pattern)
      );
      
      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
      });
      
      // 清除Redis缓存
      await this.redisCache.del(`${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.ANALYTICS}:*${pattern}*`);
      
      this.logger.log('缓存模式失效', { 
        pattern, 
        affectedKeys: keysToDelete.length 
      });
    } catch (error) {
      this.logger.error('缓存失效失败', { 
        pattern, 
        error: error.message 
      });
    }
  }

  /**
   * 清除所有Analytics缓存
   */
  async clear(): Promise<void> {
    try {
      // 清除内存缓存
      this.memoryCache.clear();
      this.accessOrder.length = 0;
      
      // 清除Redis缓存
      await this.redisCache.del(`${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.ANALYTICS}:*`);
      
      this.logger.log('Analytics缓存已清空');
    } catch (error) {
      this.logger.error('清空缓存失败', { error: error.message });
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    memory: {
      size: number;
      maxSize: number;
      hitRate: number;
    };
    redis?: any;
    timestamp: string;
  }> {
    const totalAccess = Array.from(this.memoryCache.values())
      .reduce((sum, item) => sum + item.accessCount, 0);
    
    return {
      memory: {
        size: this.memoryCache.size,
        maxSize: ANALYTICS_CACHE_CONFIG.MEMORY_CACHE.MAX_SIZE,
        hitRate: totalAccess > 0 ? this.memoryCache.size / totalAccess : 0
      },
      redis: await this.redisCache.getStats?.(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 设置内存缓存
   * @param key 键
   * @param value 值
   */
  private setMemoryCache<T>(key: string, value: T): void {
    // 检查缓存容量，如果超出则清理最少使用的项
    if (this.memoryCache.size >= ANALYTICS_CACHE_CONFIG.MEMORY_CACHE.MAX_SIZE) {
      this.evictLeastUsed();
    }

    const item: LRUItem<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1
    };

    this.memoryCache.set(key, item);
    this.updateAccessOrder(key);
  }

  /**
   * 清理最少使用的缓存项
   */
  private evictLeastUsed(): void {
    if (this.accessOrder.length === 0) return;

    // 找到访问次数最少的项
    let leastUsedKey = this.accessOrder[0];
    let leastAccessCount = this.memoryCache.get(leastUsedKey)?.accessCount || 0;

    for (const key of this.accessOrder) {
      const item = this.memoryCache.get(key);
      if (item && item.accessCount < leastAccessCount) {
        leastUsedKey = key;
        leastAccessCount = item.accessCount;
      }
    }

    this.memoryCache.delete(leastUsedKey);
    this.removeFromAccessOrder(leastUsedKey);
    
    this.logger.debug('清理最少使用的缓存项', { key: leastUsedKey });
  }

  /**
   * 更新访问顺序
   * @param key 键
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序中移除
   * @param key 键
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 获取默认TTL
   * @param key 缓存键
   */
  private getDefaultTTL(key: string): number {
    // 根据键前缀确定TTL
    if (key.includes('performance_summary')) {
      return ANALYTICS_CACHE_CONFIG.TTL.PERFORMANCE_SUMMARY;
    }
    if (key.includes('health_score')) {
      return ANALYTICS_CACHE_CONFIG.TTL.HEALTH_SCORE;
    }
    if (key.includes('health_report')) {
      return ANALYTICS_CACHE_CONFIG.TTL.HEALTH_REPORT;
    }
    if (key.includes('endpoint_metrics')) {
      return ANALYTICS_CACHE_CONFIG.TTL.ENDPOINT_METRICS;
    }
    if (key.includes('optimization')) {
      return ANALYTICS_CACHE_CONFIG.TTL.OPTIMIZATION_ADVICE;
    }
    if (key.includes('trends')) {
      return ANALYTICS_CACHE_CONFIG.TTL.TREND_ANALYSIS;
    }

    // 根据市场状态动态调整TTL
    const marketStatus = this.getMarketStatus();
    const multiplier = marketStatus === 'open' ? 0.5 : 2.0; // 开市期间缓存时间减半

    const baseTTL = ANALYTICS_CACHE_CONFIG.TTL.PERFORMANCE_SUMMARY; // 默认30秒
    return Math.round(baseTTL * multiplier);
  }

  /**
   * 获取市场状态（简化版本）
   */
  private getMarketStatus(): 'open' | 'closed' {
    const now = new Date();
    const hour = now.getHours();
    
    // 简化的市场时间判断（实际应考虑多个市场和节假日）
    return (hour >= 9 && hour <= 16) ? 'open' : 'closed';
  }
}