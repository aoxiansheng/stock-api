import { Injectable, Inject } from '@nestjs/common';
import type { CacheLimitsConfig } from '../config/cache-limits.config';

/**
 * 缓存限制Provider
 * 🎯 提供统一的缓存限制访问接口，替换分散在各模块中的常量定义
 * 
 * NestJS最佳实践：
 * - 使用依赖注入获取配置
 * - 提供类型安全的访问方法
 * - 集中化配置管理
 */
@Injectable()
export class CacheLimitsProvider {
  constructor(
    @Inject('cacheLimits') private readonly limitsConfig: CacheLimitsConfig,
  ) {}

  /**
   * 获取批量操作大小限制
   * @param category 操作类别
   * @returns 批量大小限制
   */
  getBatchSizeLimit(category: 'cache' | 'smartCache' | 'lruSort' = 'cache'): number {
    switch (category) {
      case 'cache':
        return this.limitsConfig.maxBatchSize;
      case 'smartCache':
        return this.limitsConfig.smartCacheMaxBatch;
      case 'lruSort':
        return this.limitsConfig.lruSortBatchSize;
      default:
        return this.limitsConfig.maxBatchSize;
    }
  }

  /**
   * 获取缓存大小限制
   * @param unit 单位：'items' 为条目数，'mb' 为内存大小
   * @returns 缓存大小限制
   */
  getCacheSizeLimit(unit: 'items' | 'mb' = 'items'): number {
    return unit === 'items' 
      ? this.limitsConfig.maxCacheSize 
      : this.limitsConfig.maxCacheSizeMB;
  }

  /**
   * 验证批量操作大小是否在限制内
   * @param size 批量大小
   * @param category 操作类别
   * @returns 是否有效
   */
  validateBatchSize(size: number, category: 'cache' | 'smartCache' | 'lruSort' = 'cache'): boolean {
    const limit = this.getBatchSizeLimit(category);
    return size > 0 && size <= limit;
  }

  /**
   * 验证缓存大小是否在限制内
   * @param size 缓存大小
   * @param unit 单位
   * @returns 是否有效
   */
  validateCacheSize(size: number, unit: 'items' | 'mb' = 'items'): boolean {
    const limit = this.getCacheSizeLimit(unit);
    return size > 0 && size <= limit;
  }

  /**
   * 获取所有限制配置
   * @returns 完整的限制配置对象
   */
  getAllLimits(): CacheLimitsConfig {
    return { ...this.limitsConfig };
  }

  /**
   * 获取配置摘要（用于日志和调试）
   * @returns 配置摘要字符串
   */
  getConfigSummary(): string {
    return [
      `批量操作限制: ${this.limitsConfig.maxBatchSize}`,
      `缓存大小限制: ${this.limitsConfig.maxCacheSize} 条目`,
      `内存限制: ${this.limitsConfig.maxCacheSizeMB} MB`,
      `Smart Cache批量: ${this.limitsConfig.smartCacheMaxBatch}`,
      `LRU排序批量: ${this.limitsConfig.lruSortBatchSize}`,
    ].join(', ');
  }
}