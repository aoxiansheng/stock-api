/**
 * Core Cache Components 统一配置
 * 🎯 遵循四层配置体系标准，消除配置重叠
 * ✅ 支持环境变量覆盖和配置验证
 *
 * 📋 统一管理核心缓存组件所有配置项：
 * - Stream Cache: 流数据缓存配置
 * - Data Mapper Cache: 数据映射缓存配置
 * - Symbol Mapper Cache: 符号映射缓存配置
 * - Smart Cache: 智能缓存配置（已存在，引用整合）
 */

import { registerAs } from "@nestjs/config";
import { IsNumber, IsBoolean, Min, Max, validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

// 引入各组件配置工厂
import { StreamCacheConfigFactory } from "../module/stream-cache/config/stream-cache-config.factory";
import { DataMapperCacheConfigFactory } from "../module/data-mapper-cache/config/data-mapper-cache-config.factory";
import { SymbolMapperCacheConfigFactory } from "../module/symbol-mapper-cache/config/symbol-mapper-cache-config.factory";
import { SmartCacheConfigFactory } from "../module/smart-cache/config/smart-cache-config.factory";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * 核心缓存组件统一配置验证类
 * 🎯 统一管理所有核心缓存组件配置，消除重复定义
 */
export class CoreCacheUnifiedConfigValidation {
  // ========================================
  // 共享配置（所有组件通用）
  // ========================================

  /**
   * 全局启用状态
   * 控制所有缓存组件的启用状态
   */
  @IsBoolean()
  globalEnabled: boolean = true;

  /**
   * 全局调试模式
   * 控制详细日志输出
   */
  @IsBoolean()
  globalDebugMode: boolean = false;

  /**
   * 全局性能监控启用
   * 控制性能监控的全局启用状态
   */
  @IsBoolean()
  globalPerformanceMonitoringEnabled: boolean = true;

  // ========================================
  // Stream Cache 配置
  // ========================================

  /**
   * Stream Cache 启用状态
   */
  @IsBoolean()
  streamCacheEnabled: boolean = true;

  /**
   * 热缓存 TTL (秒)
   */
  @IsNumber()
  @Min(1)
  @Max(300)
  streamCacheHotTtl: number = 30;

  /**
   * 温缓存 TTL (秒)
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  streamCacheWarmTtl: number = 300;

  /**
   * 最大热缓存大小
   */
  @IsNumber()
  @Min(100)
  @Max(10000)
  streamCacheMaxHotSize: number = 1000;

  /**
   * 流数据批处理大小
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  streamCacheBatchSize: number = 50;

  // ========================================
  // Data Mapper Cache 配置
  // ========================================

  /**
   * Data Mapper Cache 启用状态
   */
  @IsBoolean()
  dataMapperCacheEnabled: boolean = true;

  /**
   * 最佳规则缓存 TTL (秒)
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  dataMapperCacheBestRuleTtl: number = 300;

  /**
   * 提供商规则缓存 TTL (秒)
   */
  @IsNumber()
  @Min(30)
  @Max(1800)
  dataMapperCacheProviderRulesTtl: number = 60;

  /**
   * 数据映射最大批处理大小
   */
  @IsNumber()
  @Min(10)
  @Max(500)
  dataMapperCacheMaxBatchSize: number = 100;

  // ========================================
  // Symbol Mapper Cache 配置
  // ========================================

  /**
   * Symbol Mapper Cache 启用状态
   */
  @IsBoolean()
  symbolMapperCacheEnabled: boolean = true;

  /**
   * 符号映射 TTL (秒)
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  symbolMapperCacheSymbolTtl: number = 300;

  /**
   * 批量结果缓存 TTL (秒)
   */
  @IsNumber()
  @Min(30)
  @Max(1800)
  symbolMapperCacheBatchResultTtl: number = 60;

  /**
   * L1 缓存大小（提供商规则）
   */
  @IsNumber()
  @Min(50)
  @Max(500)
  symbolMapperCacheL1Size: number = 100;

  /**
   * L2 缓存大小（单个符号映射）
   */
  @IsNumber()
  @Min(500)
  @Max(5000)
  symbolMapperCacheL2Size: number = 1000;

  /**
   * L3 缓存大小（批量结果）
   */
  @IsNumber()
  @Min(100)
  @Max(2000)
  symbolMapperCacheL3Size: number = 500;

  // ========================================
  // Smart Cache 配置（现有配置的引用）
  // ========================================

  /**
   * Smart Cache 启用状态
   */
  @IsBoolean()
  smartCacheEnabled: boolean = true;

  /**
   * Smart Cache 强时效性 TTL (秒)
   */
  @IsNumber()
  @Min(1)
  @Max(30)
  smartCacheStrongTtl: number = 5;

  /**
   * Smart Cache 弱时效性 TTL (秒)
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  smartCacheWeakTtl: number = 300;

  /**
   * Smart Cache 最大并发更新数
   */
  @IsNumber()
  @Min(1)
  @Max(50)
  smartCacheMaxConcurrentUpdates: number = 10;

  // ========================================
  // 集成配置（组件间协调）
  // ========================================

  /**
   * 组件间缓存一致性检查间隔 (毫秒)
   */
  @IsNumber()
  @Min(1000)
  @Max(60000)
  interComponentConsistencyCheckInterval: number = 30000;

  /**
   * 跨组件缓存失效传播启用
   */
  @IsBoolean()
  crossComponentInvalidationEnabled: boolean = true;

  /**
   * 统一性能监控采样率
   */
  @IsNumber()
  @Min(0)
  @Max(1)
  unifiedMonitoringSampleRate: number = 0.1;
}

/**
 * 核心缓存组件统一配置注册函数
 * 使用命名空间 'coreCacheUnified' 注册配置
 */
export default registerAs("coreCacheUnified", (): CoreCacheUnifiedConfigValidation => {
  const rawConfig = {
    // 全局配置
    globalEnabled: process.env.CORE_CACHE_GLOBAL_ENABLED !== "false",
    globalDebugMode: process.env.CORE_CACHE_DEBUG_MODE === "true",
    globalPerformanceMonitoringEnabled: process.env.CORE_CACHE_PERFORMANCE_MONITORING !== "false",

    // Stream Cache 配置
    streamCacheEnabled: process.env.STREAM_CACHE_ENABLED !== "false",
    streamCacheHotTtl: parseInt(process.env.STREAM_CACHE_HOT_TTL_SECONDS, 10) || 30,
    streamCacheWarmTtl: parseInt(process.env.STREAM_CACHE_WARM_TTL_SECONDS, 10) || 300,
    streamCacheMaxHotSize: parseInt(process.env.STREAM_CACHE_MAX_HOT_SIZE, 10) || 1000,
    streamCacheBatchSize: parseInt(process.env.STREAM_CACHE_BATCH_SIZE, 10) || 50,

    // Data Mapper Cache 配置
    dataMapperCacheEnabled: process.env.DATA_MAPPER_CACHE_ENABLED !== "false",
    dataMapperCacheBestRuleTtl: parseInt(process.env.DATA_MAPPER_CACHE_BEST_RULE_TTL_SECONDS, 10) || 300,
    dataMapperCacheProviderRulesTtl: parseInt(process.env.DATA_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS, 10) || 60,
    dataMapperCacheMaxBatchSize: parseInt(process.env.DATA_MAPPER_CACHE_MAX_BATCH_SIZE, 10) || 100,

    // Symbol Mapper Cache 配置
    symbolMapperCacheEnabled: process.env.SYMBOL_MAPPER_CACHE_ENABLED !== "false",
    symbolMapperCacheSymbolTtl: parseInt(process.env.SYMBOL_MAPPER_CACHE_SYMBOL_MAPPING_TTL_SECONDS, 10) || 300,
    symbolMapperCacheBatchResultTtl: parseInt(process.env.SYMBOL_MAPPER_CACHE_BATCH_RESULT_TTL_SECONDS, 10) || 60,
    symbolMapperCacheL1Size: parseInt(process.env.SYMBOL_MAPPER_CACHE_L1_SIZE, 10) || 100,
    symbolMapperCacheL2Size: parseInt(process.env.SYMBOL_MAPPER_CACHE_L2_SIZE, 10) || 1000,
    symbolMapperCacheL3Size: parseInt(process.env.SYMBOL_MAPPER_CACHE_L3_SIZE, 10) || 500,

    // Smart Cache 配置
    smartCacheEnabled: process.env.SMART_CACHE_ENABLED !== "false",
    smartCacheStrongTtl: parseInt(process.env.CACHE_STRONG_TTL_SECONDS, 10) || 5,
    smartCacheWeakTtl: parseInt(process.env.CACHE_WEAK_TTL_SECONDS, 10) || 300,
    smartCacheMaxConcurrentUpdates: parseInt(process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES, 10) || 10,

    // 集成配置
    interComponentConsistencyCheckInterval: parseInt(process.env.CORE_CACHE_CONSISTENCY_CHECK_INTERVAL_MS, 10) || 30000,
    crossComponentInvalidationEnabled: process.env.CORE_CACHE_CROSS_INVALIDATION_ENABLED !== "false",
    unifiedMonitoringSampleRate: parseFloat(process.env.CORE_CACHE_MONITORING_SAMPLE_RATE) || 0.1,
  };

  // 转换为验证类实例
  const config = plainToInstance(CoreCacheUnifiedConfigValidation, rawConfig);

  // 执行验证
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
      operation: 'validateConfig',
      message: `Core Cache unified configuration validation failed: ${errorMessages}`,
      context: {
        validationErrors: errors.map(error => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value
        })),
        configType: 'CoreCacheUnifiedConfig'
      }
    });
  }

  return config;
});

/**
 * 配置工厂集成器
 * 为各组件提供统一的配置创建接口
 */
export class CoreCacheConfigIntegrator {
  /**
   * 创建所有核心缓存组件的配置
   * 基于统一配置和环境变量
   */
  static createAllConfigs() {
    return {
      streamCache: StreamCacheConfigFactory.createConfig(),
      dataMapperCache: DataMapperCacheConfigFactory.createConfig(),
      symbolMapperCache: SymbolMapperCacheConfigFactory.createConfig(),
      smartCache: SmartCacheConfigFactory.createConfig(),
    };
  }

  /**
   * 验证所有配置的一致性
   * 确保配置之间没有冲突
   */
  static validateConfigConsistency(configs: any): string[] {
    const errors: string[] = [];

    // 检查 TTL 配置的逻辑一致性
    if (configs.smartCache.strategies.STRONG_TIMELINESS.ttl > configs.streamCache.hotCacheTTL) {
      errors.push("Smart Cache strong TTL should not exceed Stream Cache hot TTL");
    }

    if (configs.dataMapperCache.providerRulesTtl > configs.symbolMapperCache.batchResultTtl * 5) {
      errors.push("Data Mapper provider rules TTL seems too high compared to Symbol Mapper batch result TTL");
    }

    // 检查缓存大小的合理性
    if (configs.symbolMapperCache.l1CacheSize > configs.symbolMapperCache.l2CacheSize) {
      errors.push("Symbol Mapper L1 cache size should not exceed L2 cache size");
    }

    return errors;
  }
}