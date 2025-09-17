/**
 * 统一TTL配置
 * 🎯 解决300秒TTL在24个位置重复定义的问题
 * 🏛️ 遵循四层配置体系标准规则
 *
 * @description
 * 统一管理所有模块的TTL配置，消除配置重叠
 * 替换分散在各模块中的TTL定义
 *
 * @author Claude Code Assistant
 * @date 2025-01-16
 */

import { registerAs } from "@nestjs/config";
import { IsNumber, Min, Max, validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

/**
 * 统一TTL配置验证类
 * 🔒 运行时类型安全和数值验证
 */
export class UnifiedTtlConfigValidation {
  /**
   * 默认TTL - 替换所有模块中的300秒定义
   * 替换位置:
   * - src/common/constants/foundation/core-values.constants.ts:60 (TIME_SECONDS.FIVE_MINUTES)
   * - src/common/constants/validation.constants.ts:18 (COOLDOWN_PERIOD)
   * - src/cache/config/cache.config.ts:36 (defaultTtl)
   * - src/auth/constants/api-security.constants.ts:29 (CACHE_TTL_SECONDS)
   * - src/core/05-caching/smart-cache/constants/smart-cache.constants.ts:9 (WEAK_TIMELINESS_DEFAULT_S)
   * - 其他19个位置的300秒定义
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "默认TTL必须是有效数字" },
  )
  @Min(1, { message: "默认TTL不能少于1秒" })
  @Max(86400, { message: "默认TTL不能超过86400秒(24小时)" })
  defaultTtl: number = parseInt(process.env.APP_DEFAULT_TTL, 10) || 300;

  /**
   * 强时效性TTL - Receiver组件使用
   * 替换位置:
   * - src/core/01-entry/receiver/ 相关组件的5秒TTL
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "强时效TTL必须是有效数字" },
  )
  @Min(1, { message: "强时效TTL不能少于1秒" })
  @Max(3600, { message: "强时效TTL不能超过3600秒(1小时)" })
  strongTimelinessTtl: number = parseInt(process.env.APP_STRONG_TTL, 10) || 5;

  /**
   * 认证相关TTL - Auth模块使用
   * 替换位置:
   * - src/auth/constants/api-security.constants.ts (多处300秒定义)
   * - src/auth/config/security.config.ts:40 (cacheTtlSeconds)
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "认证TTL必须是有效数字" },
  )
  @Min(60, { message: "认证TTL不能少于60秒" })
  @Max(7200, { message: "认证TTL不能超过7200秒(2小时)" })
  authTtl: number = parseInt(process.env.APP_AUTH_TTL, 10) || 300;

  /**
   * 监控相关TTL - Monitoring模块使用
   * 替换位置:
   * - src/monitoring/config/monitoring.config.ts:435 (performance: 300)
   * - src/monitoring/constants/cache-ttl.constants.ts:28 (趋势统计TTL)
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "监控TTL必须是有效数字" },
  )
  @Min(30, { message: "监控TTL不能少于30秒" })
  @Max(1800, { message: "监控TTL不能超过1800秒(30分钟)" })
  monitoringTtl: number = parseInt(process.env.APP_MONITORING_TTL, 10) || 300;

  /**
   * 数据转换结果TTL - Transformer模块使用
   * 替换位置:
   * - src/core/02-processing/transformer/constants/data-transformer.constants.ts:158
   * - src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts:551
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "转换结果TTL必须是有效数字" },
  )
  @Min(60, { message: "转换结果TTL不能少于60秒" })
  @Max(3600, { message: "转换结果TTL不能超过3600秒(1小时)" })
  transformerResultTtl: number =
    parseInt(process.env.APP_TRANSFORMER_TTL, 10) || 300;

  /**
   * 提供商选择TTL - Provider模块使用
   * 替换位置:
   * - src/core/01-entry/receiver/constants/config.constants.ts:60
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "提供商选择TTL必须是有效数字" },
  )
  @Min(60, { message: "提供商选择TTL不能少于60秒" })
  @Max(1800, { message: "提供商选择TTL不能超过1800秒(30分钟)" })
  providerSelectionTtl: number =
    parseInt(process.env.APP_PROVIDER_SELECTION_TTL, 10) || 300;

  /**
   * 流缓存Warm Cache TTL - Stream Cache模块使用
   * 替换位置:
   * - src/core/05-caching/stream-cache/constants/stream-cache.constants.ts:9
   * - 流缓存相关的300秒TTL定义
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "流缓存TTL必须是有效数字" },
  )
  @Min(30, { message: "流缓存TTL不能少于30秒" })
  @Max(3600, { message: "流缓存TTL不能超过3600秒(1小时)" })
  streamWarmCacheTtl: number =
    parseInt(process.env.APP_STREAM_WARM_TTL, 10) || 300;

  /**
   * 市场开市时TTL - Common Cache模块使用
   * 替换位置:
   * - src/core/05-caching/common-cache/constants/cache-config.constants.ts:36
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "市场开市TTL必须是有效数字" },
  )
  @Min(60, { message: "市场开市TTL不能少于60秒" })
  @Max(1800, { message: "市场开市TTL不能超过1800秒(30分钟)" })
  marketOpenTtl: number = parseInt(process.env.APP_MARKET_OPEN_TTL, 10) || 300;
}

/**
 * 统一TTL配置注册
 * 🎯 NestJS标准配置模式，支持依赖注入
 */
export default registerAs("unifiedTtl", (): UnifiedTtlConfigValidation => {
  const rawConfig = {
    defaultTtl: parseInt(process.env.APP_DEFAULT_TTL, 10) || 300,
    strongTimelinessTtl: parseInt(process.env.APP_STRONG_TTL, 10) || 5,
    authTtl: parseInt(process.env.APP_AUTH_TTL, 10) || 300,
    monitoringTtl: parseInt(process.env.APP_MONITORING_TTL, 10) || 300,
    transformerResultTtl: parseInt(process.env.APP_TRANSFORMER_TTL, 10) || 300,
    providerSelectionTtl:
      parseInt(process.env.APP_PROVIDER_SELECTION_TTL, 10) || 300,
    streamWarmCacheTtl: parseInt(process.env.APP_STREAM_WARM_TTL, 10) || 300,
    marketOpenTtl: parseInt(process.env.APP_MARKET_OPEN_TTL, 10) || 300,
  };

  const config = plainToClass(UnifiedTtlConfigValidation, rawConfig);
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");
    throw new Error(`统一TTL配置验证失败: ${errorMessages}`);
  }

  return config;
});

/**
 * 类型导出
 */
export type UnifiedTtlConfig = UnifiedTtlConfigValidation;

/**
 * TTL配置助手类
 * 🛠️ 提供便捷的配置访问方法
 */
export class UnifiedTtlHelper {
  /**
   * 根据缓存策略获取推荐TTL
   */
  static getRecommendedTtl(
    strategy:
      | "strong"
      | "weak"
      | "auth"
      | "monitoring"
      | "transformer"
      | "provider"
      | "stream"
      | "market",
  ): number {
    const config = new UnifiedTtlConfigValidation();

    switch (strategy) {
      case "strong":
        return config.strongTimelinessTtl;
      case "weak":
        return config.defaultTtl;
      case "auth":
        return config.authTtl;
      case "monitoring":
        return config.monitoringTtl;
      case "transformer":
        return config.transformerResultTtl;
      case "provider":
        return config.providerSelectionTtl;
      case "stream":
        return config.streamWarmCacheTtl;
      case "market":
        return config.marketOpenTtl;
      default:
        return config.defaultTtl;
    }
  }

  /**
   * 验证TTL值是否在合理范围内
   */
  static validateTtl(
    ttl: number,
    strategy: string,
  ): { valid: boolean; message?: string } {
    if (ttl < 1) {
      return { valid: false, message: `${strategy}策略的TTL不能少于1秒` };
    }

    if (ttl > 86400) {
      return {
        valid: false,
        message: `${strategy}策略的TTL不能超过86400秒(24小时)`,
      };
    }

    return { valid: true };
  }

  /**
   * 获取环境特定的TTL调整建议
   */
  static getEnvironmentAdjustment(
    environment: "development" | "test" | "staging" | "production",
  ): number {
    switch (environment) {
      case "development":
        return 0.5; // 开发环境使用更短的TTL便于调试
      case "test":
        return 0.1; // 测试环境使用极短TTL确保测试可靠性
      case "staging":
        return 0.8; // 预发布环境稍短的TTL
      case "production":
        return 1.0; // 生产环境使用标准TTL
      default:
        return 1.0;
    }
  }
}

/**
 * 配置文档和使用说明
 *
 * @example
 * ```typescript
 * // 在服务中注入使用
 * import { ConfigType } from '@nestjs/config';
 * import unifiedTtlConfig from '@appcore/config/unified-ttl.config';
 *
 * @Injectable()
 * export class CacheService {
 *   constructor(
 *     @Inject(unifiedTtlConfig.KEY)
 *     private readonly ttlConfig: ConfigType<typeof unifiedTtlConfig>,
 *   ) {}
 *
 *   async setCache(key: string, value: any, strategy: 'strong' | 'weak' = 'weak') {
 *     const ttl = strategy === 'strong'
 *       ? this.ttlConfig.strongTimelinessTtl
 *       : this.ttlConfig.defaultTtl;
 *
 *     await this.redis.setex(key, ttl, JSON.stringify(value));
 *   }
 * }
 * ```
 *
 * @environment
 * ```bash
 * # .env文件配置 - AppCore模块统一使用APP_前缀
 * APP_DEFAULT_TTL=300              # 默认TTL（秒）
 * APP_STRONG_TTL=5                 # 强时效TTL（秒）
 * APP_AUTH_TTL=300                 # 认证TTL（秒）
 * APP_MONITORING_TTL=300           # 监控TTL（秒）
 * APP_TRANSFORMER_TTL=300          # 转换结果TTL（秒）
 * APP_PROVIDER_SELECTION_TTL=300   # 提供商选择TTL（秒）
 * APP_STREAM_WARM_TTL=300          # 流缓存TTL（秒）
 * APP_MARKET_OPEN_TTL=300          # 市场开市TTL（秒）
 * ```
 */
