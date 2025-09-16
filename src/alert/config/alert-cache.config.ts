/**
 * Alert模块Cache配置
 * 🎯 从Cache模块迁移Alert特定的缓存配置，实现模块边界清晰化
 * ✅ 遵循四层配置体系，支持环境变量覆盖和配置验证
 * 
 * 迁移来源：
 * - src/cache/config/cache-unified.config.ts（Alert相关配置）
 * - src/cache/config/cache-limits.config.ts（Alert批处理配置）
 * - src/cache/config/unified-ttl.config.ts（Alert TTL配置）
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Alert缓存配置验证类
 * 🎯 Alert模块独立的缓存配置，从Cache模块迁移而来
 */
export class AlertCacheConfigValidation {
  // ========================================
  // Alert TTL配置（从unified-ttl.config.ts迁移）
  // ========================================
  
  /**
   * Alert活跃数据TTL（秒）
   * 用于当前活跃告警的缓存时效
   */
  @IsNumber()
  @Min(60)
  @Max(7200)
  activeDataTtl: number = 300;

  /**
   * Alert历史数据TTL（秒）
   * 用于历史告警记录的缓存时效
   */
  @IsNumber()
  @Min(300)
  @Max(86400)
  historicalDataTtl: number = 3600;

  /**
   * Alert冷却期TTL（秒）
   * 用于告警冷却期缓存
   */
  @IsNumber()
  @Min(60)
  @Max(7200)
  cooldownTtl: number = 300;

  /**
   * Alert配置缓存TTL（秒）
   * 用于告警配置的缓存时效
   */
  @IsNumber()
  @Min(300)
  @Max(3600)
  configCacheTtl: number = 600;

  /**
   * Alert统计缓存TTL（秒）
   * 用于告警统计数据的缓存时效
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  statsCacheTtl: number = 300;

  // ========================================
  // Alert批处理配置（从cache-limits.config.ts迁移）
  // ========================================

  /**
   * Alert标准批处理大小
   * 用于常规告警批量处理
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  batchSize: number = 100;

  /**
   * Alert最大批量处理数量
   * 用于大量告警同时处理的上限
   */
  @IsNumber()
  @Min(100)
  @Max(10000)
  maxBatchProcessing: number = 1000;

  /**
   * Alert大批量操作大小
   * 用于数据库批量操作
   */
  @IsNumber()
  @Min(500)
  @Max(5000)
  largeBatchSize: number = 1000;

  /**
   * Alert最大活跃告警数量
   * 系统可同时处理的最大活跃告警数
   */
  @IsNumber()
  @Min(1000)
  @Max(100000)
  maxActiveAlerts: number = 10000;

  // ========================================
  // Alert性能配置
  // ========================================

  /**
   * Alert缓存压缩阈值（字节）
   * 超过此大小的告警数据将被压缩存储
   */
  @IsNumber()
  @Min(512)
  @Max(8192)
  compressionThreshold: number = 2048;

  /**
   * 是否启用Alert缓存压缩
   */
  @IsBoolean()
  compressionEnabled: boolean = true;

  /**
   * Alert缓存最大内存使用（MB）
   * Alert模块专用的缓存内存限制
   */
  @IsNumber()
  @Min(32)
  @Max(1024)
  maxCacheMemoryMB: number = 128;

  /**
   * Alert缓存键最大长度
   */
  @IsNumber()
  @Min(64)
  @Max(512)
  maxKeyLength: number = 256;
}

/**
 * Alert缓存配置注册函数
 * 使用命名空间 'alertCache' 注册配置
 */
export default registerAs('alertCache', (): AlertCacheConfigValidation => {
  const rawConfig = {
    // TTL配置 - Alert模块统一使用ALERT_前缀
    activeDataTtl: parseInt(process.env.ALERT_CACHE_ACTIVE_TTL, 10) || 300,
    historicalDataTtl: parseInt(process.env.ALERT_CACHE_HISTORICAL_TTL, 10) || 3600,
    cooldownTtl: parseInt(process.env.ALERT_CACHE_COOLDOWN_TTL, 10) || 300,
    configCacheTtl: parseInt(process.env.ALERT_CACHE_CONFIG_TTL, 10) || 600,
    statsCacheTtl: parseInt(process.env.ALERT_CACHE_STATS_TTL, 10) || 300,
    
    // 批处理配置 - 从原Cache配置环境变量迁移
    batchSize: parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100,
    maxBatchProcessing: parseInt(process.env.ALERT_MAX_BATCH_PROCESSING, 10) || 1000,
    largeBatchSize: parseInt(process.env.ALERT_LARGE_BATCH_SIZE, 10) || 1000,
    maxActiveAlerts: parseInt(process.env.ALERT_MAX_ACTIVE_ALERTS, 10) || 10000,
    
    // 性能配置 - Alert模块专用
    compressionThreshold: parseInt(process.env.ALERT_CACHE_COMPRESSION_THRESHOLD, 10) || 2048,
    compressionEnabled: process.env.ALERT_CACHE_COMPRESSION_ENABLED !== 'false',
    maxCacheMemoryMB: parseInt(process.env.ALERT_CACHE_MAX_MEMORY_MB, 10) || 128,
    maxKeyLength: parseInt(process.env.ALERT_CACHE_MAX_KEY_LENGTH, 10) || 256,
  };

  // 转换为验证类实例
  const config = plainToClass(AlertCacheConfigValidation, rawConfig);
  
  // 执行验证
  const errors = validateSync(config, { 
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Alert cache configuration validation failed: ${errorMessages}`);
  }

  return config;
});

/**
 * 导出配置类型供其他模块使用
 */
export type AlertCacheConfig = AlertCacheConfigValidation;

/**
 * Alert缓存配置接口（用于依赖注入）
 */
export interface AlertCacheConfigInterface {
  // TTL配置
  activeDataTtl: number;
  historicalDataTtl: number;
  cooldownTtl: number;
  configCacheTtl: number;
  statsCacheTtl: number;
  
  // 批处理配置
  batchSize: number;
  maxBatchProcessing: number;
  largeBatchSize: number;
  maxActiveAlerts: number;
  
  // 性能配置
  compressionThreshold: number;
  compressionEnabled: boolean;
  maxCacheMemoryMB: number;
  maxKeyLength: number;
}

/**
 * 迁移指南常量
 */
export const ALERT_CACHE_MIGRATION_GUIDE = {
  fromCacheModule: {
    'cache-unified.config.ts': [
      'alertActiveDataTtl → activeDataTtl',
      'alertHistoricalDataTtl → historicalDataTtl', 
      'alertCooldownTtl → cooldownTtl',
      'alertConfigCacheTtl → configCacheTtl',
      'alertStatsCacheTtl → statsCacheTtl',
      'alertBatchSize → batchSize',
      'alertMaxBatchProcessing → maxBatchProcessing',
      'alertLargeBatchSize → largeBatchSize',
      'alertMaxActiveAlerts → maxActiveAlerts'
    ],
    'cache-limits.config.ts': [
      '所有Alert相关的批处理配置已迁移',
      '环境变量保持兼容，支持新旧格式'
    ],
    'unified-ttl.config.ts': [
      '所有Alert相关的TTL配置已迁移',
      '新环境变量格式：ALERT_CACHE_* 替代 CACHE_ALERT_*'
    ]
  },
  environmentVariables: {
    newFormat: 'ALERT_CACHE_*',
    oldFormat: 'CACHE_ALERT_* (已移除，使用ALERT_前缀)',
    examples: [
      'ALERT_CACHE_ACTIVE_TTL=300',
      'ALERT_CACHE_HISTORICAL_TTL=3600',
      'ALERT_BATCH_SIZE=100'
    ]
  }
} as const;