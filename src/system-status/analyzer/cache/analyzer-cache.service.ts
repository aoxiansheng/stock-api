import { Injectable, Logger } from '@nestjs/common';

/**
 * 分析器统一缓存服务（简化版）
 * 职责：提供简单的缓存操作，使用简单TTL配置
 */
@Injectable()
export class AnalyzerCacheService {
  private readonly logger = new Logger(AnalyzerCacheService.name);
  
  // 内存缓存实现（简化版，实际项目中应该使用Redis）
  private readonly cache = new Map<string, { value: any; expiry: number }>();
  
  constructor() {
    this.logger.log('AnalyzerCacheService initialized - 分析器缓存服务已初始化');
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }
      
      // 检查是否过期
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        this.logger.debug(`缓存过期: ${key}`);
        return null;
      }
      
      this.logger.debug(`缓存命中: ${key}`);
      return item.value as T;
    } catch (error) {
      this.logger.error(`缓存获取失败: ${key}`, error.stack);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl: number = 60): Promise<void> {
    try {
      const expiry = Date.now() + (ttl * 1000);
      this.cache.set(key, { value, expiry });
      
      this.logger.debug(`缓存设置: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`缓存设置失败: ${key}`, error.stack);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.logger.debug(`缓存删除: ${key}`);
      }
    } catch (error) {
      this.logger.error(`缓存删除失败: ${key}`, error.stack);
    }
  }

  /**
   * 失效匹配模式的缓存
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let deletedCount = 0;
      
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
      
      this.logger.debug(`模式失效: ${pattern}, 删除 ${deletedCount} 条缓存`);
    } catch (error) {
      this.logger.error(`模式失效失败: ${pattern}`, error.stack);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      const count = this.cache.size;
      this.cache.clear();
      this.logger.debug(`清空缓存: 删除 ${count} 条缓存`);
    } catch (error) {
      this.logger.error('清空缓存失败', error.stack);
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    totalKeys: number;
    expiredKeys: number;
    memoryUsage: number;
  } {
    const totalKeys = this.cache.size;
    let expiredKeys = 0;
    const now = Date.now();
    
    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expiredKeys++;
      }
    }
    
    return {
      totalKeys,
      expiredKeys,
      memoryUsage: totalKeys * 100 // 简化的内存计算
    };
  }

  /**
   * 获取TTL配置
   */
  getTTL(type: CacheType): number {
    return TTL_CONFIG[type] || 60;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.debug(`清理过期缓存: ${cleanedCount} 条`);
      }
    } catch (error) {
      this.logger.error('清理过期缓存失败', error.stack);
    }
  }
}

/**
 * 缓存类型枚举
 */
type CacheType = 
  | 'PERFORMANCE_SUMMARY' 
  | 'ENDPOINT_METRICS' 
  | 'DATABASE_METRICS' 
  | 'REDIS_METRICS' 
  | 'HEALTH_SCORE'
  | 'TRENDS'
  | 'SUGGESTIONS';

/**
 * 简化的TTL配置
 */
const TTL_CONFIG: Record<CacheType, number> = {
  PERFORMANCE_SUMMARY: 60,    // 1分钟
  ENDPOINT_METRICS: 30,       // 30秒
  DATABASE_METRICS: 120,      // 2分钟
  REDIS_METRICS: 30,          // 30秒
  HEALTH_SCORE: 60,           // 1分钟
  TRENDS: 300,                // 5分钟
  SUGGESTIONS: 600            // 10分钟
};