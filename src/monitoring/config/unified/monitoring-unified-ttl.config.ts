/**
 * 监控组件统一TTL配置类
 *
 * 📋 职责边界：
 * ==========================================
 * 本文件统一管理所有监控组件的TTL配置，消除重复定义：
 *
 * ✅ 统一TTL配置源：
 * - 健康检查数据TTL
 * - 趋势分析数据TTL
 * - 性能指标数据TTL
 * - 告警数据TTL
 * - 缓存统计数据TTL
 *
 * ✅ 环境变量支持：
 * - 支持通过环境变量覆盖默认值
 * - 提供生产/开发/测试环境的不同默认值
 *
 * ✅ 类型安全：
 * - 使用class-validator进行验证
 * - 提供完整的TypeScript类型支持
 *
 * ✅ 重构前后对比：
 * - 重构前：13个独立TTL环境变量
 * - 重构后：1个基础TTL变量，自动倍数计算
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import { IsNumber, Min, Max } from "class-validator";
import { Transform, Type } from "class-transformer";
import { registerAs } from "@nestjs/config";

/**
 * 监控组件统一TTL配置类
 * 🎯 消除TTL配置重复，提供统一的配置源
 */
export class MonitoringUnifiedTtlConfig {
  /**
   * 健康检查数据缓存TTL（秒）
   *
   * 用途：控制系统健康状态数据在Redis中的缓存时间
   * 业务影响：
   * - 较短TTL：提供更及时的健康状态反馈，但增加数据库查询频率
   * - 较长TTL：减少数据库负载，但健康状态更新可能有延迟
   *
   * 环境推荐值：
   * - 开发环境：150-300秒
   * - 测试环境：10-30秒（快速验证）
   * - 生产环境：300-600秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL (health = base × 1.0)
   */
  @IsNumber({}, { message: "健康检查TTL必须是数字" })
  @Min(1, { message: "健康检查TTL最小值为1秒" })
  @Max(3600, { message: "健康检查TTL最大值为1小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  health: number = 300;

  /**
   * 趋势分析数据缓存TTL（秒）
   *
   * 用途：控制性能趋势分析报告数据的缓存时间
   * 业务影响：
   * - 趋势数据变化相对较慢，可以使用较长的TTL
   * - 过长的TTL可能导致趋势分析滞后
   *
   * 环境推荐值：
   * - 开发环境：300-600秒
   * - 测试环境：20-60秒
   * - 生产环境：600-1200秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL (trend = base × 2.0)
   */
  @IsNumber({}, { message: "趋势分析TTL必须是数字" })
  @Min(1, { message: "趋势分析TTL最小值为1秒" })
  @Max(3600, { message: "趋势分析TTL最大值为1小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 600 : parsed;
  })
  trend: number = 600;

  /**
   * 性能指标数据缓存TTL（秒）
   *
   * 用途：控制实时性能指标（响应时间、吞吐量等）的缓存时间
   * 业务影响：
   * - 性能指标需要较高的时效性，TTL不宜过长
   * - 过短的TTL会增加计算开销和数据库查询
   *
   * 环境推荐值：
   * - 开发环境：60-180秒
   * - 测试环境：10-30秒
   * - 生产环境：180-300秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL (performance = base × 0.6)
   */
  @IsNumber({}, { message: "性能指标TTL必须是数字" })
  @Min(1, { message: "性能指标TTL最小值为1秒" })
  @Max(1800, { message: "性能指标TTL最大值为30分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 180 : parsed;
  })
  performance: number = 180;

  /**
   * 告警数据缓存TTL（秒）
   *
   * 用途：控制告警状态和历史告警数据的缓存时间
   * 业务影响：
   * - 告警数据需要快速更新，确保及时响应
   * - 过短的TTL可能导致告警状态不一致
   *
   * 环境推荐值：
   * - 开发环境：60-120秒
   * - 测试环境：5-10秒
   * - 生产环境：60-120秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL (alert = base × 0.2)
   */
  @IsNumber({}, { message: "告警数据TTL必须是数字" })
  @Min(1, { message: "告警数据TTL最小值为1秒" })
  @Max(600, { message: "告警数据TTL最大值为10分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60 : parsed;
  })
  alert: number = 60;

  /**
   * 缓存统计数据TTL（秒）
   *
   * 用途：控制缓存命中率、缓存性能等元统计信息的缓存时间
   * 业务影响：
   * - 统计数据可以容忍一定的延迟
   * - 用于生成缓存性能报告和趋势分析
   *
   * 环境推荐值：
   * - 开发环境：120-240秒
   * - 测试环境：10-30秒
   * - 生产环境：120-240秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL (cacheStats = base × 0.4)
   */
  @IsNumber({}, { message: "缓存统计TTL必须是数字" })
  @Min(1, { message: "缓存统计TTL最小值为1秒" })
  @Max(600, { message: "缓存统计TTL最大值为10分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 120 : parsed;
  })
  cacheStats: number = 120;

  /**
   * 根据环境获取健康检查默认TTL
   */
  getDefaultHealthTtl(): number {
    const env = process.env.NODE_ENV || "development";
    switch (env) {
      case "production":
        return 600; // 10分钟 - 生产环境延长缓存
      case "test":
        return 10; // 10秒 - 测试环境快速更新
      default:
        return 300; // 5分钟 - 开发环境默认值
    }
  }

  /**
   * 根据环境获取趋势分析默认TTL
   */
  getDefaultTrendTtl(): number {
    const env = process.env.NODE_ENV || "development";
    switch (env) {
      case "production":
        return 1200; // 20分钟 - 生产环境趋势更稳定
      case "test":
        return 20; // 20秒 - 测试环境快速验证
      default:
        return 600; // 10分钟 - 开发环境默认值
    }
  }

  /**
   * 根据环境获取性能指标默认TTL
   */
  getDefaultPerformanceTtl(): number {
    const env = process.env.NODE_ENV || "development";
    switch (env) {
      case "production":
        return 300; // 5分钟 - 生产环境适当延长
      case "test":
        return 10; // 10秒 - 测试环境快速反映
      default:
        return 180; // 3分钟 - 开发环境默认值
    }
  }

  /**
   * 根据环境获取告警数据默认TTL
   */
  getDefaultAlertTtl(): number {
    const env = process.env.NODE_ENV || "development";
    switch (env) {
      case "production":
        return 120; // 2分钟 - 生产环境允许稍长缓存
      case "test":
        return 5; // 5秒 - 测试环境即时响应
      default:
        return 60; // 1分钟 - 开发环境默认值
    }
  }

  /**
   * 根据环境获取缓存统计默认TTL
   */
  getDefaultCacheStatsTtl(): number {
    const env = process.env.NODE_ENV || "development";
    switch (env) {
      case "production":
        return 240; // 4分钟 - 生产环境延长统计缓存
      case "test":
        return 10; // 10秒 - 测试环境快速验证
      default:
        return 120; // 2分钟 - 开发环境默认值
    }
  }

  /**
   * 根据环境调整TTL配置
   * Phase 2: 统一配置层环境适配方法
   */
  adjustForEnvironment(): void {
    const env = process.env.NODE_ENV || "development";

    switch (env) {
      case "production":
        // 生产环境：延长TTL以提高缓存效率
        this.health = Math.max(this.health, 300); // 最小5分钟
        this.trend = Math.max(this.trend, 600); // 最小10分钟
        this.performance = Math.max(this.performance, 180); // 最小3分钟
        this.alert = Math.max(this.alert, 60); // 最小1分钟
        this.cacheStats = Math.max(this.cacheStats, 240); // 最小4分钟
        break;

      case "test":
        // 测试环境：缩短TTL以快速验证
        this.health = Math.min(this.health, 60); // 最大1分钟
        this.trend = Math.min(this.trend, 120); // 最大2分钟
        this.performance = Math.min(this.performance, 30); // 最大30秒
        this.alert = Math.min(this.alert, 10); // 最大10秒
        this.cacheStats = Math.min(this.cacheStats, 30); // 最大30秒
        break;

      case "development":
      default:
        // 开发环境：使用默认值（已在属性初始化中设置）
        break;
    }
  }
}

/**
 * 监控统一TTL配置注册
 *
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(MonitoringUnifiedTtl)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringUnifiedTtl')
 *   private readonly ttlConfig: MonitoringUnifiedTtlConfig
 * ) {}
 * ```
 */
export const MonitoringUnifiedTtl = registerAs(
  "monitoringUnifiedTtl",
  (): MonitoringUnifiedTtlConfig => {
    // Phase 4: Environment Variable Optimization
    // 使用新的核心环境变量系统：MONITORING_DEFAULT_TTL 替代 5个TTL变量

    // 1. 优先检查新的核心环境变量
    const defaultTtl = process.env.MONITORING_DEFAULT_TTL
      ? parseInt(process.env.MONITORING_DEFAULT_TTL, 10)
      : 300;

    // 创建配置实例
    const config = new MonitoringUnifiedTtlConfig();

    // 应用核心环境变量的倍数逻辑
    if (!isNaN(defaultTtl)) {
      config.health = defaultTtl; // 1.0x
      config.trend = Math.floor(defaultTtl * 2.0); // 2.0x
      config.performance = Math.floor(defaultTtl * 0.6); // 0.6x
      config.alert = Math.floor(defaultTtl * 0.2); // 0.2x
      config.cacheStats = Math.floor(defaultTtl * 0.4); // 0.4x
    }

    return config;
  },
);

/**
 * TTL配置工具类
 * 🛠️ 提供TTL配置的常用工具方法
 */
export class MonitoringTtlUtils {
  /**
   * 将秒转换为毫秒
   */
  static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }

  /**
   * 将毫秒转换为秒
   */
  static msToSeconds(ms: number): number {
    return Math.floor(ms / 1000);
  }

  /**
   * 获取TTL配置的Redis键过期时间
   */
  static getRedisExpiry(ttlSeconds: number): number {
    return Math.floor(Date.now() / 1000) + ttlSeconds;
  }

  /**
   * 验证TTL值是否在合理范围内
   */
  static isValidTtl(ttlSeconds: number, maxTtl: number = 3600): boolean {
    return ttlSeconds > 0 && ttlSeconds <= maxTtl;
  }

  /**
   * 根据数据类型获取推荐的TTL值
   */
  static getRecommendedTtl(
    dataType: "health" | "trend" | "performance" | "alert" | "cacheStats",
    environment: "development" | "test" | "production" = "development",
  ): number {
    const ttlConfig = new MonitoringUnifiedTtlConfig();

    // 临时设置环境以获取正确的默认值
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = environment;

    let result: number;
    switch (dataType) {
      case "health":
        result = ttlConfig.getDefaultHealthTtl();
        break;
      case "trend":
        result = ttlConfig.getDefaultTrendTtl();
        break;
      case "performance":
        result = ttlConfig.getDefaultPerformanceTtl();
        break;
      case "alert":
        result = ttlConfig.getDefaultAlertTtl();
        break;
      case "cacheStats":
        result = ttlConfig.getDefaultCacheStatsTtl();
        break;
      default:
        result = 300; // 默认5分钟
    }

    // 恢复原环境设置
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    return result;
  }
}

/**
 * 监控TTL配置类型导出
 */

export type TtlDataType =
  | "health"
  | "trend"
  | "performance"
  | "alert"
  | "cacheStats";
export type EnvironmentType = "development" | "test" | "production";
