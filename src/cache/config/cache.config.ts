/**
 * 缓存模块统一配置
 * 🎯 使用 NestJS ConfigModule 的 registerAs 模式
 * ✅ 支持环境变量覆盖和配置验证
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, Min, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * @deprecated 装饰器用于标记废弃字段
 */
function Deprecated(message: string) {
  return function (target: any, propertyKey: string) {
    // 在开发环境下输出废弃警告
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  DEPRECATED: ${target.constructor.name}.${propertyKey} - ${message}`);
    }
  };
}

/**
 * 缓存配置验证类
 */
export class CacheConfigValidation {
  /**
   * @deprecated 使用 CacheTtlConfig.defaultTtl 替代，将在v2.0版本移除
   * @see CacheTtlConfig.defaultTtl
   * @since v1.0.0
   * @removal v2.0.0
   */
  @Deprecated('使用 CacheTtlConfig.defaultTtl 替代，将在v2.0版本移除')
  @IsNumber()
  @Min(1)
  defaultTtl: number = 300; // 默认TTL: 5分钟

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
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300, // ⚠️ 已迁移至统一TTL配置: src/cache/config/cache-ttl.config.ts
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
 */
export type CacheConfig = CacheConfigValidation;