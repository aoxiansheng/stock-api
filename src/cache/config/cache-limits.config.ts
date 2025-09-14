import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * 导出配置接口以供其他模块使用
 */
export interface CacheLimitsConfig {
  maxBatchSize: number;
  maxCacheSize: number;
  lruSortBatchSize: number;
  smartCacheMaxBatch: number;
  maxCacheSizeMB: number;
}

/**
 * 缓存限制配置验证类
 * 🎯 统一管理所有缓存相关的大小限制，解决多处重复定义问题
 * 
 * 统一的配置项：
 * - maxBatchSize: 替换各模块中的批量操作限制
 * - maxCacheSize: 替换分散的缓存大小限制
 * - lruSortBatchSize: 替换symbol-mapper中的排序批量
 * - smartCacheMaxBatch: 替换smart-cache的批量限制
 */
export class CacheLimitsValidation {
  /**
   * 缓存服务最大批量操作大小
   * 替换: src/cache/config/cache.config.ts:40 中的 maxBatchSize
   */
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxBatchSize: number = 100;

  /**
   * 通用最大缓存大小（条目数）
   * 替换: src/core/shared/constants/cache.constants.ts:9 中的 MAX_CACHE_SIZE
   */
  @IsNumber() 
  @Min(1000)
  @Max(100000)
  maxCacheSize: number = 10000;

  /**
   * LRU排序批量大小（用于symbol-mapper缓存清理）
   * 替换: src/core/05-caching/symbol-mapper-cache/constants/cache.constants.ts:58 中的 LRU_SORT_BATCH_SIZE
   */
  @IsNumber()
  @Min(100)
  @Max(10000) 
  lruSortBatchSize: number = 1000;

  /**
   * Smart Cache最大批量大小
   * 替换: src/core/05-caching/smart-cache/constants/smart-cache.constants.ts:32 中的 MAX_BATCH_SIZE_COUNT
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  smartCacheMaxBatch: number = 50;

  /**
   * 通用缓存内存限制（MB）
   * 提供统一的内存大小限制
   */
  @IsNumber()
  @Min(64)
  @Max(8192)
  maxCacheSizeMB: number = 1024;
}

/**
 * 缓存限制配置注册
 * 使用 NestJS ConfigModule registerAs 模式
 */
export default registerAs('cacheLimits', (): CacheLimitsConfig => {
  const config = {
    maxBatchSize: parseInt(process.env.CACHE_MAX_BATCH_SIZE, 10) || 100,
    maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 10000,
    lruSortBatchSize: parseInt(process.env.CACHE_LRU_SORT_BATCH_SIZE, 10) || 1000,
    smartCacheMaxBatch: parseInt(process.env.SMART_CACHE_MAX_BATCH, 10) || 50,
    maxCacheSizeMB: parseInt(process.env.CACHE_MAX_SIZE_MB, 10) || 1024,
  };
  
  // 转换为验证类实例
  const validatedConfig = plainToClass(CacheLimitsValidation, config);
  
  // 使用 class-validator 验证配置
  const errors = validateSync(validatedConfig);
  if (errors.length > 0) {
    throw new Error(`Cache limits configuration validation failed: ${errors.map(e => e.toString()).join(', ')}`);
  }
  
  return validatedConfig;
});