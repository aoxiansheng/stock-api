/**
 * 监控组件统一配置系统导出
 *
 * 📋 统一配置系统简介：
 * ==========================================
 * 本模块提供监控组件的统一配置管理，消除配置重复，提供：
 *
 * ✅ 统一TTL配置：
 * - 健康检查、趋势分析、性能指标、告警、缓存统计的TTL设置
 * - 环境变量支持和环境特定默认值
 * - 类型安全验证
 *
 * ✅ 统一限制配置：
 * - 告警批量处理、数据处理批量、数据清理批量配置
 * - 系统限制（队列大小、缓冲区大小、重试次数等）
 * - 动态环境调整
 *
 * 🔄 替换的原配置文件：
 * - cache-ttl.constants.ts → MonitoringUnifiedTtlConfig
 * - alert-control.constants.ts（批量部分） → MonitoringUnifiedLimitsConfig.alertBatch
 * - data-lifecycle.constants.ts（批量部分） → MonitoringUnifiedLimitsConfig.dataCleanupBatch
 * - business.ts（批量部分） → MonitoringUnifiedLimitsConfig.dataProcessingBatch
 * - monitoring-system.constants.ts（系统限制部分） → MonitoringUnifiedLimitsConfig.systemLimits
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

// 统一TTL配置
import {
  MonitoringUnifiedTtlConfig,
  MONITORING_UNIFIED_TTL_CONSTANTS,
  type TtlDataType,
  type EnvironmentType,
} from "./monitoring-unified-ttl.config";

export {
  MonitoringUnifiedTtlConfig,
  monitoringUnifiedTtlConfig,
  MonitoringTtlUtils,
  MONITORING_UNIFIED_TTL_CONSTANTS,
  type MonitoringUnifiedTtlType,
  type TtlDataType,
  type EnvironmentType,
} from "./monitoring-unified-ttl.config";

// 统一限制配置
import {
  MonitoringUnifiedLimitsConfig,
  MONITORING_UNIFIED_LIMITS_CONSTANTS,
} from "./monitoring-unified-limits.config";

export {
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  DataCleanupBatchConfig,
  SystemLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MonitoringLimitsUtils,
  MONITORING_UNIFIED_LIMITS_CONSTANTS,
  type MonitoringUnifiedLimitsType,
  type BatchSizeType,
  type ProcessingType,
} from "./monitoring-unified-limits.config";

// Phase 4: 核心环境变量配置
export {
  MonitoringCoreEnvConfig,
  monitoringCoreEnvConfig,
  MonitoringCoreEnvUtils,
  MONITORING_CORE_ENV_CONSTANTS,
  type MonitoringCoreEnvType,
} from "./monitoring-core-env.config";

/**
 * 统一配置使用指南
 *
 * 📋 基本使用方式：
 * ```typescript
 * import { ConfigModule } from '@nestjs/config';
 * import {
 *   monitoringUnifiedTtlConfig,
 *   monitoringUnifiedLimitsConfig
 * } from './config/unified';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forFeature(monitoringUnifiedTtlConfig),
 *     ConfigModule.forFeature(monitoringUnifiedLimitsConfig),
 *   ]
 * })
 * export class MonitoringModule {}
 * ```
 *
 * 📋 服务中注入使用：
 * ```typescript
 * import {
 *   MonitoringUnifiedTtlConfig,
 *   MonitoringUnifiedLimitsConfig
 * } from './config/unified';
 *
 * @Injectable()
 * export class MonitoringService {
 *   constructor(
 *     @Inject('monitoringUnifiedTtl')
 *     private readonly ttlConfig: MonitoringUnifiedTtlConfig,
 *     @Inject('monitoringUnifiedLimits')
 *     private readonly limitsConfig: MonitoringUnifiedLimitsConfig
 *   ) {}
 *
 *   getHealthTtl(): number {
 *     return this.ttlConfig.health;
 *   }
 *
 *   getAlertBatchSize(): number {
 *     return this.limitsConfig.alertBatch.medium;
 *   }
 * }
 * ```
 *
 * 📋 环境变量配置：
 * ```bash
 * # TTL配置
 * MONITORING_TTL_HEALTH=300
 * MONITORING_TTL_TREND=600
 * MONITORING_TTL_PERFORMANCE=180
 * MONITORING_TTL_ALERT=60
 * MONITORING_TTL_CACHE_STATS=120
 *
 * # 批量限制配置
 * MONITORING_ALERT_BATCH_SMALL=5
 * MONITORING_ALERT_BATCH_MEDIUM=10
 * MONITORING_DATA_BATCH_STANDARD=10
 * MONITORING_CLEANUP_BATCH_STANDARD=1000
 * MONITORING_MAX_QUEUE_SIZE=10000
 * ```
 */

/**
 * 便捷工具函数
 * 🛠️ 提供常用的配置操作工具
 */
export class MonitoringUnifiedConfigUtils {
  /**
   * 创建默认的TTL配置实例
   */
  static createDefaultTtlConfig(): MonitoringUnifiedTtlConfig {
    return new MonitoringUnifiedTtlConfig();
  }

  /**
   * 创建默认的限制配置实例
   */
  static createDefaultLimitsConfig(): MonitoringUnifiedLimitsConfig {
    return new MonitoringUnifiedLimitsConfig();
  }

  /**
   * 验证TTL配置值
   */
  static validateTtlValue(value: number, type: TtlDataType): boolean {
    const limits = MONITORING_UNIFIED_TTL_CONSTANTS.LIMITS;

    switch (type) {
      case "health":
        return value >= limits.MIN_TTL && value <= limits.MAX_HEALTH_TTL;
      case "trend":
        return value >= limits.MIN_TTL && value <= limits.MAX_TREND_TTL;
      case "performance":
        return value >= limits.MIN_TTL && value <= limits.MAX_PERFORMANCE_TTL;
      case "alert":
        return value >= limits.MIN_TTL && value <= limits.MAX_ALERT_TTL;
      case "cacheStats":
        return value >= limits.MIN_TTL && value <= limits.MAX_CACHE_STATS_TTL;
      default:
        return false;
    }
  }

  /**
   * 根据环境获取推荐的配置
   */
  static getEnvironmentRecommendedConfig(
    environment: EnvironmentType = "development",
  ): {
    ttl: Partial<MonitoringUnifiedTtlConfig>;
    limits: Partial<MonitoringUnifiedLimitsConfig>;
  } {
    const ttlConfig = new MonitoringUnifiedTtlConfig();
    const limitsConfig = new MonitoringUnifiedLimitsConfig();

    // 临时设置环境
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = environment;

    // 获取环境特定配置
    ttlConfig.health = ttlConfig.getDefaultHealthTtl();
    ttlConfig.trend = ttlConfig.getDefaultTrendTtl();
    ttlConfig.performance = ttlConfig.getDefaultPerformanceTtl();
    ttlConfig.alert = ttlConfig.getDefaultAlertTtl();
    ttlConfig.cacheStats = ttlConfig.getDefaultCacheStatsTtl();

    limitsConfig.adjustForEnvironment();

    // 恢复原环境
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    return {
      ttl: {
        health: ttlConfig.health,
        trend: ttlConfig.trend,
        performance: ttlConfig.performance,
        alert: ttlConfig.alert,
        cacheStats: ttlConfig.cacheStats,
      },
      limits: {
        alertBatch: limitsConfig.alertBatch,
        dataProcessingBatch: limitsConfig.dataProcessingBatch,
        dataCleanupBatch: limitsConfig.dataCleanupBatch,
        systemLimits: limitsConfig.systemLimits,
      },
    };
  }
}

/**
 * 配置常量快速访问
 * 📦 为常用配置提供快速访问路径
 */
export const MONITORING_CONFIG_CONSTANTS = {
  TTL: MONITORING_UNIFIED_TTL_CONSTANTS,
  LIMITS: MONITORING_UNIFIED_LIMITS_CONSTANTS,
} as const;
