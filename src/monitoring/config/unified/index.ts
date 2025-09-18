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
 * 🎯 统一配置系统优势：
 * - 消除配置重复和冲突
 * - 类型安全的配置验证
 * - 环境变量统一管理
 * - 基于倍数的自动计算
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

// 统一TTL配置
import {
  MonitoringUnifiedTtl,
  MonitoringUnifiedTtlConfig,
  type TtlDataType,
  type EnvironmentType,
} from "./monitoring-unified-ttl.config";

export {
  MonitoringUnifiedTtl,
  MonitoringUnifiedTtlConfig,
  MonitoringTtlUtils,
  type TtlDataType,
  type EnvironmentType,
} from "./monitoring-unified-ttl.config";

// 统一限制配置
import { MonitoringUnifiedLimitsConfig } from "./monitoring-unified-limits.config";

export {
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  DataCleanupBatchConfig,
  SystemLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MonitoringLimitsUtils,
  type MonitoringUnifiedLimitsType,
  type BatchSizeType,
  type ProcessingType,
} from "./monitoring-unified-limits.config";

// Phase 4: 核心环境变量配置
export {
  MonitoringCoreEnvConfig,
  monitoringCoreEnvConfig,
  MonitoringCoreEnvUtils,
  type MonitoringCoreEnvType,
} from "./monitoring-core-env.config";

/**
 * 统一配置使用指南
 *
 * 📋 基本使用方式：
 * ```typescript
 * import { ConfigModule } from '@nestjs/config';
 * import {
 *   MonitoringUnifiedTtl,
 *   monitoringUnifiedLimitsConfig
 * } from './config/unified';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forFeature(MonitoringUnifiedTtl),
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
 * # 统一TTL配置
 * MONITORING_DEFAULT_TTL=300              # 基础TTL，其他值自动计算倍数
 *
 * # 统一批处理配置
 * MONITORING_DEFAULT_BATCH_SIZE=50        # 统一批处理大小
 *
 * # 其他配置
 * MONITORING_AUTO_ANALYSIS=true           # 自动分析开关
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
    // 使用基本的合理范围验证，不再依赖常量
    const MIN_TTL = 1;
    const MAX_TTL = 3600;

    switch (type) {
      case "health":
        return value >= MIN_TTL && value <= MAX_TTL;
      case "trend":
        return value >= MIN_TTL && value <= MAX_TTL * 2; // 趋势数据可以更长
      case "performance":
        return value >= MIN_TTL && value <= MAX_TTL;
      case "alert":
        return value >= MIN_TTL && value <= 600; // 告警数据较短
      case "cacheStats":
        return value >= MIN_TTL && value <= MAX_TTL;
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
