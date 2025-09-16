/**
 * TTL配置兼容性包装器
 * 🎯 提供向后兼容性，将unified-ttl.config.ts的接口映射到统一配置
 * ✅ 100%向后兼容，现有代码无需修改
 * 
 * 使用方式：
 * ```typescript
 * // 新服务（推荐）
 * constructor(
 *   @Inject('cacheUnified') private readonly cacheConfig: CacheUnifiedConfig,
 * ) {}
 * 
 * // 现有服务（继续工作）
 * constructor(
 *   @Inject('unifiedTtl') private readonly ttlConfig: UnifiedTtlConfig,
 * ) {}
 * ```
 */

import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import type { CacheUnifiedConfig } from './cache-unified.config';

/**
 * 兼容性TTL配置接口
 * 保持与原unified-ttl.config.ts的完全兼容
 */
export interface UnifiedTtlConfig {
  // 基础TTL配置
  defaultTtl: number;
  strongTimelinessTtl: number;
  
  // 组件特定TTL
  authTtl: number;
  monitoringTtl: number;
  
  // Alert模块特定TTL配置
  alertActiveDataTtl: number;
  alertHistoricalDataTtl: number;
  alertArchivedDataTtl: number;
  alertCooldownTtl: number;
  alertConfigCacheTtl: number;
  alertStatsCacheTtl: number;
}

/**
 * TTL配置兼容性包装器服务
 * 🎯 将统一配置适配为原有的TTL配置接口
 */
@Injectable()
export class TtlCompatibilityWrapper implements UnifiedTtlConfig {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  private get unifiedConfig(): CacheUnifiedConfig {
    return this.configService.get<CacheUnifiedConfig>('cacheUnified')!;
  }

  // 基础TTL配置映射
  get defaultTtl(): number {
    return this.unifiedConfig.defaultTtl;
  }

  get strongTimelinessTtl(): number {
    return this.unifiedConfig.strongTimelinessTtl;
  }

  // 组件特定TTL映射
  get authTtl(): number {
    return this.unifiedConfig.authTtl;
  }

  get monitoringTtl(): number {
    return this.unifiedConfig.monitoringTtl;
  }

  // Alert模块TTL映射
  get alertActiveDataTtl(): number {
    return this.unifiedConfig.alertActiveDataTtl;
  }

  get alertHistoricalDataTtl(): number {
    return this.unifiedConfig.alertHistoricalDataTtl;
  }

  get alertArchivedDataTtl(): number {
    return this.unifiedConfig.alertArchivedDataTtl || 86400; // 默认24小时
  }

  get alertCooldownTtl(): number {
    return this.unifiedConfig.alertCooldownTtl;
  }

  get alertConfigCacheTtl(): number {
    return this.unifiedConfig.alertConfigCacheTtl;
  }

  get alertStatsCacheTtl(): number {
    return this.unifiedConfig.alertStatsCacheTtl;
  }
}

/**
 * 注册兼容性配置提供者
 * 保持'unifiedTtl'命名空间以确保向后兼容
 */
export default registerAs('unifiedTtl', (): UnifiedTtlConfig => {
  // 创建简化的配置对象，映射环境变量
  return {
    // 基础TTL配置
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    strongTimelinessTtl: parseInt(process.env.CACHE_STRONG_TTL, 10) || 5,
    
    // 组件特定TTL
    authTtl: parseInt(process.env.CACHE_AUTH_TTL, 10) || 300,
    monitoringTtl: parseInt(process.env.CACHE_MONITORING_TTL, 10) || 300,
    
    // Alert模块特定TTL配置
    alertActiveDataTtl: parseInt(process.env.CACHE_ALERT_ACTIVE_TTL, 10) || 300,
    alertHistoricalDataTtl: parseInt(process.env.CACHE_ALERT_HISTORICAL_TTL, 10) || 3600,
    alertArchivedDataTtl: parseInt(process.env.CACHE_ALERT_ARCHIVED_TTL, 10) || 86400,
    alertCooldownTtl: parseInt(process.env.CACHE_ALERT_COOLDOWN_TTL, 10) || 300,
    alertConfigCacheTtl: parseInt(process.env.CACHE_ALERT_CONFIG_TTL, 10) || 600,
    alertStatsCacheTtl: parseInt(process.env.CACHE_ALERT_STATS_TTL, 10) || 300,
  };
});

/**
 * 导出类型别名以保持兼容性
 * 注意：类型已在上面定义，这里不重复导出以避免冲突
 */