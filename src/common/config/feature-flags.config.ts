/**
 * Feature Flags Configuration
 * 
 * 🎯 统一管理系统功能开关，支持缓存优化、批量处理等特性的动态控制
 * 
 * Environment Variables:
 * - SYMBOL_MAPPING_CACHE_ENABLED: 符号映射缓存开关 (default: true)
 * - DATA_TRANSFORM_CACHE_ENABLED: 数据转换缓存开关 (default: true)
 * - BATCH_PROCESSING_ENABLED: 批量处理开关 (default: true)
 * - OBJECT_POOL_ENABLED: 对象池优化开关 (default: true)
 * - RULE_COMPILATION_ENABLED: 规则编译优化开关 (default: true)
 * - DYNAMIC_LOG_LEVEL_ENABLED: 动态日志级别开关 (default: true)
 * - METRICS_LEGACY_MODE_ENABLED: 指标双写兼容模式开关 (default: true)
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlags {
  // 🎯 Symbol-Mapper 缓存优化开关
  readonly symbolMappingCacheEnabled: boolean = process.env.SYMBOL_MAPPING_CACHE_ENABLED !== 'false';
  
  // 🎯 Data-Mapper 缓存优化开关
  readonly dataTransformCacheEnabled: boolean = process.env.DATA_TRANSFORM_CACHE_ENABLED !== 'false';
  
  // 🎯 批量处理优化开关
  readonly batchProcessingEnabled: boolean = process.env.BATCH_PROCESSING_ENABLED !== 'false';
  
  // 🎯 对象池优化开关
  readonly objectPoolEnabled: boolean = process.env.OBJECT_POOL_ENABLED !== 'false';
  
  // 🎯 规则编译优化开关
  readonly ruleCompilationEnabled: boolean = process.env.RULE_COMPILATION_ENABLED !== 'false';
  
  // 🎯 动态日志级别开关
  readonly dynamicLogLevelEnabled: boolean = process.env.DYNAMIC_LOG_LEVEL_ENABLED !== 'false';
  
  // 🎯 指标双写兼容模式开关
  readonly metricsLegacyModeEnabled: boolean = process.env.METRICS_LEGACY_MODE_ENABLED !== 'false';

  // 🎯 Symbol-Mapper 缓存配置参数
  readonly symbolCacheMaxSize: number = Number(process.env.SYMBOL_CACHE_MAX_SIZE) || 2000;
  readonly symbolCacheTtl: number = Number(process.env.SYMBOL_CACHE_TTL) || 5 * 60 * 1000; // 5分钟
  
  // 🎯 Data-Mapper 缓存配置参数  
  readonly ruleCacheMaxSize: number = Number(process.env.RULE_CACHE_MAX_SIZE) || 100;
  readonly ruleCacheTtl: number = Number(process.env.RULE_CACHE_TTL) || 10 * 60 * 1000; // 10分钟
  
  // 🎯 对象池配置参数
  readonly objectPoolSize: number = Number(process.env.OBJECT_POOL_SIZE) || 100;
  
  // 🎯 批量处理配置参数
  readonly batchSizeThreshold: number = Number(process.env.BATCH_SIZE_THRESHOLD) || 10;
  readonly batchTimeWindowMs: number = Number(process.env.BATCH_TIME_WINDOW_MS) || 1;

  /**
   * 获取所有当前生效的 Feature Flags
   */
  getAllFlags(): Record<string, boolean | number> {
    return {
      symbolMappingCacheEnabled: this.symbolMappingCacheEnabled,
      dataTransformCacheEnabled: this.dataTransformCacheEnabled,
      batchProcessingEnabled: this.batchProcessingEnabled,
      objectPoolEnabled: this.objectPoolEnabled,
      ruleCompilationEnabled: this.ruleCompilationEnabled,
      dynamicLogLevelEnabled: this.dynamicLogLevelEnabled,
      metricsLegacyModeEnabled: this.metricsLegacyModeEnabled,
      symbolCacheMaxSize: this.symbolCacheMaxSize,
      symbolCacheTtl: this.symbolCacheTtl,
      ruleCacheMaxSize: this.ruleCacheMaxSize,
      ruleCacheTtl: this.ruleCacheTtl,
      objectPoolSize: this.objectPoolSize,
      batchSizeThreshold: this.batchSizeThreshold,
      batchTimeWindowMs: this.batchTimeWindowMs,
    };
  }

  /**
   * 检查是否启用了任何缓存优化
   */
  isCacheOptimizationEnabled(): boolean {
    return this.symbolMappingCacheEnabled || this.dataTransformCacheEnabled;
  }

  /**
   * 检查是否启用了任何性能优化
   */
  isPerformanceOptimizationEnabled(): boolean {
    return this.isCacheOptimizationEnabled() || 
           this.batchProcessingEnabled || 
           this.objectPoolEnabled ||
           this.ruleCompilationEnabled;
  }

  /**
   * 紧急回滚：禁用所有优化功能
   */
  static getEmergencyRollbackEnvVars(): Record<string, string> {
    return {
      SYMBOL_MAPPING_CACHE_ENABLED: 'false',
      DATA_TRANSFORM_CACHE_ENABLED: 'false',
      BATCH_PROCESSING_ENABLED: 'false',
      OBJECT_POOL_ENABLED: 'false',
      RULE_COMPILATION_ENABLED: 'false',
      DYNAMIC_LOG_LEVEL_ENABLED: 'false',
      METRICS_LEGACY_MODE_ENABLED: 'false',
    };
  }
}