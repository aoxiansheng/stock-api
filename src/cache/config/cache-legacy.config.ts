/**
 * 缓存模块遗留配置
 * 🚨 已废弃：此文件已被cache-unified.config.ts完全替代
 * 
 * @deprecated 将在v3.0.0版本中移除
 * @migration 使用cache-unified.config.ts替代
 * @compatibility 通过CacheModule自动提供向后兼容
 * 
 * 迁移指南：
 * - 新服务：直接使用@Inject('cacheUnified') CacheUnifiedConfig
 * - 现有服务：继续使用当前接口，自动映射到统一配置
 * - 所有配置项已迁移到cache-unified.config.ts，包括TTL、限制、性能配置
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, Min, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

// Deprecated装饰器已移除，不再有废弃字段

/**
 * 缓存配置验证类
 */
export class CacheConfigValidation {
  // defaultTtl已迁移到cache-unified.config.ts
  // 通过CacheUnifiedConfig.defaultTtl访问

  @IsNumber()
  @Min(0)
  compressionThreshold: number = 1024; // 压缩阈值: 1KB

  @IsBoolean()
  compressionEnabled: boolean = true; // 是否启用压缩

  @IsNumber()
  @Min(1)
  maxItems: number = 10000; // 最大缓存项数

  @IsNumber()
  @Min(1)
  maxKeyLength: number = 255; // 最大键长度

  @IsNumber()
  @Min(1)
  maxValueSizeMB: number = 10; // 最大值大小(MB)


  @IsNumber()
  @Min(1)
  slowOperationMs: number = 100; // 慢操作阈值(毫秒)

  @IsNumber()
  @Min(1)
  retryDelayMs: number = 100; // 重试延迟(毫秒)

  @IsNumber()
  @Min(1)
  lockTtl: number = 30; // 分布式锁TTL(秒)
}

/**
 * 缓存配置注册函数
 * 使用命名空间 'cache' 注册配置
 */
export default registerAs('cache', (): CacheConfigValidation => {
  // 从环境变量读取配置
  const config = {
    // defaultTtl已迁移到cache-unified.config.ts，通过统一配置访问
    compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD, 10) || 1024,
    compressionEnabled: process.env.CACHE_COMPRESSION_ENABLED !== 'false',
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS, 10) || 10000,
    maxKeyLength: parseInt(process.env.CACHE_MAX_KEY_LENGTH, 10) || 255,
    maxValueSizeMB: parseInt(process.env.CACHE_MAX_VALUE_SIZE_MB, 10) || 10,
    // maxBatchSize 已迁移至统一配置: src/cache/config/cache-unified.config.ts
    slowOperationMs: parseInt(process.env.CACHE_SLOW_OPERATION_MS, 10) || 100,
    retryDelayMs: parseInt(process.env.CACHE_RETRY_DELAY_MS, 10) || 100,
    lockTtl: parseInt(process.env.CACHE_LOCK_TTL, 10) || 30,
  };

  // 转换为验证类实例
  const validatedConfig = plainToClass(CacheConfigValidation, config);

  // 执行验证
  const errors = validateSync(validatedConfig, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Cache configuration validation failed: ${errorMessages}`);
  }

  return validatedConfig;
});

/**
 * 导出配置类型供其他模块使用
 * @deprecated 推荐使用 CacheUnifiedConfig，此类型保留用于向后兼容
 */
export type CacheConfig = CacheConfigValidation;

// 重新导出兼容性接口，确保现有代码继续工作
export type { 
  LegacyCacheConfig,
  CacheConfigCompatibilityWrapper 
} from './cache-config-compatibility';