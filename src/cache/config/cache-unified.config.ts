/**
 * Cache模块统一配置
 * 🎯 遵循四层配置体系标准，消除配置重叠
 * ✅ 支持环境变量覆盖和配置验证
 *
 * 📋 本文件合并了以下配置，消除重叠：
 * - cache.config.ts（保留：压缩、大小限制、操作配置）
 * - cache-ttl.config.ts（整合：所有TTL配置）
 * - cache-limits.config.ts（整合：所有限制配置）
 * - simplified-ttl-config.constants.ts（替换：硬编码TTL常量）
 */

import { registerAs } from "@nestjs/config";
import { IsNumber, IsBoolean, Min, Max, validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

/**
 * Cache统一配置验证类
 * 🎯 统一管理所有Cache相关配置，消除4处TTL重复定义
 */
export class CacheUnifiedConfigValidation {
  // ========================================
  // TTL配置（替换cache-ttl.config.ts）
  // ========================================

  /**
   * 默认缓存TTL（秒）
   * 替换所有模块中的300秒默认TTL定义
   * 原位置:
   * - cache.config.ts:36 defaultTtl (deprecated)
   * - cache-ttl.config.ts:40 defaultTtl
   * - simplified-ttl-config.constants.ts:45 GENERAL
   */
  @IsNumber()
  @Min(1)
  @Max(86400)
  defaultTtl: number = 300;

  /**
   * 强时效性TTL（秒）
   * 用于实时数据如股票报价
   * 替换: simplified-ttl-config.constants.ts:17,18 STOCK_QUOTE, INDEX_QUOTE
   */
  @IsNumber()
  @Min(1)
  @Max(60)
  strongTimelinessTtl: number = 5;

  /**
   * 实时数据TTL（秒）
   * 用于中等时效性需求
   */
  @IsNumber()
  @Min(1)
  @Max(300)
  realtimeTtl: number = 30;

  /**
   * 监控数据TTL（秒）
   * 替换: cache-ttl.config.ts:69 monitoringTtl
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  monitoringTtl: number = 300;

  /**
   * 认证和权限TTL（秒）
   * 替换: cache-ttl.config.ts:78 authTtl
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  authTtl: number = 300;

  /**
   * 数据转换器结果TTL（秒）
   * 替换: cache-ttl.config.ts:87 transformerTtl
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  transformerTtl: number = 300;

  /**
   * 数据映射器建议TTL（秒）
   * 替换: cache-ttl.config.ts:96 suggestionTtl
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  suggestionTtl: number = 300;

  /**
   * 长期缓存TTL（秒）
   * 用于配置、规则等较少变化的数据
   * 替换: simplified-ttl-config.constants.ts:26,27 STOCK_INFO, MARKET_CONFIG
   */
  @IsNumber()
  @Min(300)
  @Max(86400)
  longTermTtl: number = 3600;

  // ========================================
  // 性能配置（保留自cache.config.ts）
  // ========================================

  /**
   * 压缩阈值（字节）
   * 超过此大小的数据将被压缩
   */
  @IsNumber()
  @Min(0)
  compressionThreshold: number = 1024;

  /**
   * 是否启用压缩
   */
  @IsBoolean()
  compressionEnabled: boolean = true;

  /**
   * 最大缓存项数
   */
  @IsNumber()
  @Min(1)
  maxItems: number = 10000;

  /**
   * 最大键长度
   */
  @IsNumber()
  @Min(1)
  maxKeyLength: number = 255;

  /**
   * 最大值大小（MB）
   */
  @IsNumber()
  @Min(1)
  maxValueSizeMB: number = 10;

  // ========================================
  // 操作配置（保留自cache.config.ts）
  // ========================================

  /**
   * 慢操作阈值（毫秒）
   */
  @IsNumber()
  @Min(1)
  slowOperationMs: number = 100;

  /**
   * 重试延迟（毫秒）
   */
  @IsNumber()
  @Min(1)
  retryDelayMs: number = 100;

  /**
   * 分布式锁TTL（秒）
   * 替换: simplified-ttl-config.constants.ts:35,72,73 DISTRIBUTED_LOCK, LOCK, LOCK_TTL
   */
  @IsNumber()
  @Min(1)
  lockTtl: number = 30;

  // ========================================
  // 限制配置（替换cache-limits.config.ts）
  // ========================================

  /**
   * 最大批量操作大小
   * 替换: cache-limits.config.ts:39 maxBatchSize
   */
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxBatchSize: number = 100;

  /**
   * 最大缓存大小（条目数）
   * 替换: cache-limits.config.ts:48 maxCacheSize
   */
  @IsNumber()
  @Min(1000)
  @Max(100000)
  maxCacheSize: number = 10000;

  /**
   * LRU排序批量大小
   * 替换: cache-limits.config.ts:57 lruSortBatchSize
   */
  @IsNumber()
  @Min(100)
  @Max(10000)
  lruSortBatchSize: number = 1000;

  /**
   * Smart Cache最大批量大小
   * 替换: cache-limits.config.ts:66 smartCacheMaxBatch
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  smartCacheMaxBatch: number = 50;

  /**
   * 缓存内存限制（MB）
   * 替换: cache-limits.config.ts:75 maxCacheSizeMB
   */
  @IsNumber()
  @Min(64)
  @Max(8192)
  maxCacheSizeMB: number = 1024;

  // ========================================
  // Alert组件配置（从cache-limits.config.ts迁移）
  // 注意：这些配置将在后续迁移到Alert模块自己的配置文件中
  // ========================================

  // ========================================
  // Alert模块配置已完全移除 - 已迁移到Alert模块独立配置
  // 使用: src/alert/config/alert-cache.config.ts
  // ========================================
}

/**
 * Cache统一配置注册函数
 * 使用命名空间 'cacheUnified' 注册配置
 */
export default registerAs("cacheUnified", (): CacheUnifiedConfigValidation => {
  const rawConfig = {
    // TTL配置 - 统一所有TTL环境变量
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    strongTimelinessTtl: parseInt(process.env.CACHE_STRONG_TTL, 10) || 5,
    realtimeTtl: parseInt(process.env.CACHE_REALTIME_TTL, 10) || 30,
    monitoringTtl: parseInt(process.env.CACHE_MONITORING_TTL, 10) || 300,
    authTtl: parseInt(process.env.CACHE_AUTH_TTL, 10) || 300,
    transformerTtl: parseInt(process.env.CACHE_TRANSFORMER_TTL, 10) || 300,
    suggestionTtl: parseInt(process.env.CACHE_SUGGESTION_TTL, 10) || 300,
    longTermTtl: parseInt(process.env.CACHE_LONG_TERM_TTL, 10) || 3600,

    // 性能配置
    compressionThreshold:
      parseInt(process.env.CACHE_COMPRESSION_THRESHOLD, 10) || 1024,
    compressionEnabled: process.env.CACHE_COMPRESSION_ENABLED !== "false",
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS, 10) || 10000,
    maxKeyLength: parseInt(process.env.CACHE_MAX_KEY_LENGTH, 10) || 255,
    maxValueSizeMB: parseInt(process.env.CACHE_MAX_VALUE_SIZE_MB, 10) || 10,

    // 操作配置
    slowOperationMs: parseInt(process.env.CACHE_SLOW_OPERATION_MS, 10) || 100,
    retryDelayMs: parseInt(process.env.CACHE_RETRY_DELAY_MS, 10) || 100,
    lockTtl: parseInt(process.env.CACHE_LOCK_TTL, 10) || 30,

    // 限制配置
    maxBatchSize: parseInt(process.env.CACHE_MAX_BATCH_SIZE, 10) || 100,
    maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 10000,
    lruSortBatchSize:
      parseInt(process.env.CACHE_LRU_SORT_BATCH_SIZE, 10) || 1000,
    smartCacheMaxBatch: parseInt(process.env.SMART_CACHE_MAX_BATCH, 10) || 50,
    maxCacheSizeMB: parseInt(process.env.CACHE_MAX_SIZE_MB, 10) || 1024,

    // Alert配置已完全迁移到Alert模块独立配置
    // 使用: src/alert/config/alert-cache.config.ts
  };

  // 转换为验证类实例
  const config = plainToInstance(CacheUnifiedConfigValidation, rawConfig);

  // 执行验证
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");
    throw new Error(
      `Cache unified configuration validation failed: ${errorMessages}`,
    );
  }

  return config;
});
