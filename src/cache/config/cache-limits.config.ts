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
  // Alert批处理配置
  alertBatchSize: number;
  alertMaxBatchProcessing: number;
  alertLargeBatchSize: number;
  alertMaxActiveAlerts: number;
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

  // ========================================
  // Alert组件批处理配置
  // 🎯 解决Alert模块中8+处批处理重复定义问题
  // ========================================

  /**
   * Alert标准批处理大小
   * 替换位置:
   * - alert/constants/defaults.constants.ts:28 BATCH_SIZE: 100
   * - alert/constants/limits.constants.ts:27 STANDARD_BATCH_SIZE: 100
   * - alert/config/alert.config.ts 中相关批处理配置
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  alertBatchSize: number = 100;

  /**
   * Alert最大批量处理数量
   * 替换: alert/constants/limits.constants.ts:29 LARGE_BATCH_SIZE: 1000
   */
  @IsNumber()
  @Min(100)
  @Max(10000)
  alertMaxBatchProcessing: number = 1000;

  /**
   * Alert大批量操作大小
   * 替换: alert/constants/limits.constants.ts:28 LARGE_BATCH_SIZE: 1000
   */
  @IsNumber()
  @Min(500)
  @Max(5000)
  alertLargeBatchSize: number = 1000;

  /**
   * Alert最大活跃告警数量
   * 替换: alert/constants/limits.constants.ts:23 MAX_ACTIVE_ALERTS: 10000
   */
  @IsNumber()
  @Min(1000)
  @Max(100000)
  alertMaxActiveAlerts: number = 10000;
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
    
    // Alert批处理配置 - 从环境变量读取，提供默认值
    alertBatchSize: parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100,
    alertMaxBatchProcessing: parseInt(process.env.ALERT_MAX_BATCH_PROCESSING, 10) || 1000,
    alertLargeBatchSize: parseInt(process.env.ALERT_LARGE_BATCH_SIZE, 10) || 1000,
    alertMaxActiveAlerts: parseInt(process.env.ALERT_MAX_ACTIVE_ALERTS, 10) || 10000,
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