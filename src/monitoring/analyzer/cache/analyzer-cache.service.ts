import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';

/**
 * 分析器缓存服务
 * 职责：为分析器提供缓存功能，提升分析性能
 */
@Injectable()
export class AnalyzerCacheService {
  private readonly logger = createLogger(AnalyzerCacheService.name);
  private readonly cache = new Map<string, any>();
  private readonly DEFAULT_TTL = 300000; // 5分钟

  constructor() {
    this.logger.log('AnalyzerCacheService initialized - 分析器缓存服务已启动');
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      if (!item) return null;

      // 检查是否过期
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${key}`);
      return item.value;
    } catch (error) {
      this.logger.error('Cache get error', error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const expiry = Date.now() + ttl;
      this.cache.set(key, { value, expiry });
      this.logger.debug(`Cache set for key: ${key}, ttl: ${ttl}ms`);
    } catch (error) {
      this.logger.error('Cache set error', error);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error('Cache delete error', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(key: string): Promise<number | null> {
    try {
      const item = this.cache.get(key);
      if (!item) return null;
      
      const remaining = item.expiry - Date.now();
      return remaining > 0 ? remaining : null;
    } catch (error) {
      this.logger.error('Cache getTTL error', error);
      return null;
    }
  }

  /**
   * 根据模式删除缓存
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = Array.from(this.cache.keys());
      const regex = new RegExp(pattern);
      
      for (const key of keys) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
      
      this.logger.debug(`Cache invalidated pattern: ${pattern}`);
    } catch (error) {
      this.logger.error('Cache invalidatePattern error', error);
    }
  }

  /**
   * 获取缓存统计信息（扩展版）
   */
  async getCacheStats(): Promise<{
    size: number;
    keys: string[];
    hitRate?: number;
    memory?: number;
  }> {
    try {
      return {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
        hitRate: 0.85, // 模拟数据
        memory: this.cache.size * 1024 // 估算内存使用
      };
    } catch (error) {
      this.logger.error('Cache getCacheStats error', error);
      return { size: 0, keys: [] };
    }
  }
}