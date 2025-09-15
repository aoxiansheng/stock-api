/**
 * 统一TTL配置管理
 * 🎯 解决11+处300秒TTL重复定义问题
 * 📊 基于四层配置体系标准规则的统一TTL管理
 * 
 * @description 集中管理所有TTL配置，消除Alert组件内部及跨模块的TTL重复定义
 * @author Alert配置合规优化任务
 * @created 2025-09-15
 * @refactored 按照四层配置体系标准
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, validateSync, IsOptional } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

/**
 * 统一TTL配置验证类
 * 🎯 统一管理Alert组件和跨模块的TTL配置，解决重复定义问题
 */
export class UnifiedTtlConfigValidation {
  /**
   * Alert组件冷却期TTL - 解决11+处300秒重复定义
   * 替换位置:
   * - alert/constants/timeouts.constants.ts:20 COOLDOWN_PERIOD: 300
   * - alert/constants/timeouts.constants.ts:25 ACTIVE_DATA_TTL: 300
   * - alert/config/alert.config.ts:20 cooldown.min: 300
   * - alert/constants/defaults.constants.ts:23 cooldown: 300
   */
  @IsNumber()
  @Min(60)
  @Max(7200)
  @Transform(({ value }) => Math.max(60, Math.min(7200, value)))
  alertCooldownTtl: number = 300; // 300秒 - 告警冷却期TTL

  /**
   * Alert组件活跃数据TTL
   * 替换: alert/constants/timeouts.constants.ts:25 ACTIVE_DATA_TTL: 300
   */
  @IsNumber()
  @Min(30)
  @Max(1800)
  @Transform(({ value }) => Math.max(30, Math.min(1800, value)))
  alertActiveDataTtl: number = 300; // 300秒 - Alert活跃数据缓存TTL

  /**
   * Alert组件配置缓存TTL
   * 替换: alert/constants/timeouts.constants.ts:23 CONFIG_CACHE_TTL: 1800
   */
  @IsNumber()
  @Min(300)
  @Max(7200)
  alertConfigCacheTtl: number = 1800; // 1800秒 - Alert配置缓存TTL

  /**
   * Alert组件统计缓存TTL
   * 替换: alert/constants/timeouts.constants.ts:24 STATS_CACHE_TTL: 3600
   */
  @IsNumber()
  @Min(600)
  @Max(14400)
  alertStatsCacheTtl: number = 3600; // 3600秒 - Alert统计缓存TTL

  /**
   * Alert组件历史数据TTL
   * 替换: alert/constants/timeouts.constants.ts:26 HISTORICAL_DATA_TTL: 43200
   */
  @IsNumber()
  @Min(7200)
  @Max(86400)
  alertHistoricalDataTtl: number = 43200; // 43200秒 - Alert历史数据TTL

  /**
   * Alert组件归档数据TTL
   * 替换: alert/constants/timeouts.constants.ts:27 ARCHIVED_DATA_TTL: 86400
   */
  @IsNumber()
  @Min(43200)
  @Max(259200)
  alertArchivedDataTtl: number = 86400; // 86400秒 - Alert归档数据TTL

  /**
   * 监控组件趋势数据TTL
   * 协调: monitoring/constants/cache-ttl.constants.ts:11 TREND: 300
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  @IsOptional()
  monitoringTrendTtl?: number = 300; // 300秒 - 监控趋势数据TTL

  /**
   * 配置一致性验证
   * 🛡️ 确保TTL配置符合业务逻辑约束
   */
  validateBusinessLogicConstraints(): void {
    // Alert冷却期不能小于活跃数据TTL的一半
    if (this.alertCooldownTtl < this.alertActiveDataTtl / 2) {
      throw new Error('Alert冷却TTL不能小于活跃数据TTL的一半');
    }

    // 配置缓存TTL应该大于冷却期TTL
    if (this.alertConfigCacheTtl <= this.alertCooldownTtl) {
      throw new Error('Alert配置缓存TTL应该大于冷却期TTL');
    }

    // 统计缓存TTL应该大于配置缓存TTL
    if (this.alertStatsCacheTtl <= this.alertConfigCacheTtl) {
      throw new Error('Alert统计缓存TTL应该大于配置缓存TTL');
    }

    // 历史数据TTL应该远大于统计缓存TTL
    if (this.alertHistoricalDataTtl <= this.alertStatsCacheTtl * 2) {
      throw new Error('Alert历史数据TTL应该至少是统计缓存TTL的2倍');
    }
  }
}

/**
 * 统一TTL配置注册
 * 🎯 使用NestJS ConfigModule registerAs模式，支持环境变量覆盖
 */
export default registerAs('unifiedTtl', (): UnifiedTtlConfigValidation => {
  const rawConfig = {
    // Alert组件TTL配置 - 从环境变量读取，提供默认值
    alertCooldownTtl: parseInt(process.env.ALERT_COOLDOWN_TTL, 10) || 300,
    alertActiveDataTtl: parseInt(process.env.ALERT_ACTIVE_DATA_TTL, 10) || 300,
    alertConfigCacheTtl: parseInt(process.env.ALERT_CONFIG_CACHE_TTL, 10) || 1800,
    alertStatsCacheTtl: parseInt(process.env.ALERT_STATS_CACHE_TTL, 10) || 3600,
    alertHistoricalDataTtl: parseInt(process.env.ALERT_HISTORICAL_DATA_TTL, 10) || 43200,
    alertArchivedDataTtl: parseInt(process.env.ALERT_ARCHIVED_DATA_TTL, 10) || 86400,
    
    // 跨模块协调TTL配置
    monitoringTrendTtl: parseInt(process.env.MONITORING_TREND_TTL, 10) || 300,
  };

  // 转换为验证类实例
  const config = plainToClass(UnifiedTtlConfigValidation, rawConfig);
  
  // 运行class-validator验证
  const errors = validateSync(config, { whitelist: true });
  
  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      Object.values(error.constraints || {}).join(', ')
    ).join('; ');
    throw new Error(`统一TTL配置验证失败: ${errorMessages}`);
  }

  // 运行业务逻辑验证
  try {
    config.validateBusinessLogicConstraints();
  } catch (error) {
    throw new Error(`统一TTL配置业务逻辑验证失败: ${error.message}`);
  }

  return config;
});

/**
 * 统一TTL配置类型导出
 */
export type UnifiedTtlConfig = UnifiedTtlConfigValidation;

/**
 * Alert配置过渡兼容层
 * 🔄 支持渐进式重构，在迁移期间提供向后兼容
 */
export const createAlertConfigTransition = () => {
  const unifiedTtlConfig = new UnifiedTtlConfigValidation();
  
  return {
    // 新的统一配置
    unified: unifiedTtlConfig,
    
    // 兼容性映射 - 保持原有接口可用
    legacy: {
      cooldownPeriod: unifiedTtlConfig.alertCooldownTtl,
      activeDataTtl: unifiedTtlConfig.alertActiveDataTtl,
      configCacheTtl: unifiedTtlConfig.alertConfigCacheTtl,
      statsCacheTtl: unifiedTtlConfig.alertStatsCacheTtl,
    },
    
    // 过渡期标识
    isTransition: true,
    
    // 迁移提示
    _migrationNote: '⚠️ 使用legacy字段的代码需要迁移到unified配置',
  };
};

/**
 * TTL配置常量映射 - 便于静态引用
 * 🎯 提供类型安全的常量访问方式
 */
export const UNIFIED_TTL_CONSTANTS = {
  ALERT_COOLDOWN_DEFAULT: 300,
  ALERT_ACTIVE_DATA_DEFAULT: 300, 
  ALERT_CONFIG_CACHE_DEFAULT: 1800,
  ALERT_STATS_CACHE_DEFAULT: 3600,
  ALERT_HISTORICAL_DATA_DEFAULT: 43200,
  ALERT_ARCHIVED_DATA_DEFAULT: 86400,
  MONITORING_TREND_DEFAULT: 300,
} as const;