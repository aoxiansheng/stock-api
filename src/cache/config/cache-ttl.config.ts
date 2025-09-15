import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * 导出配置接口供其他模块使用
 */
export interface CacheTtlConfig {
  defaultTtl: number;
  strongTimelinessTtl: number;
  realtimeTtl: number;
  monitoringTtl: number;
  authTtl: number;
  transformerTtl: number;
  suggestionTtl: number;
  longTermTtl: number;
}

/**
 * 统一TTL配置验证类
 * 🎯 解决系统中TTL值重复定义问题，提供统一的TTL管理
 * 
 * 统一的TTL配置项：
 * - defaultTtl: 替换各模块中的300秒默认TTL
 * - strongTimelinessTtl: 替换强时效性的5秒TTL
 * - realtimeTtl: 替换实时数据的短TTL
 * - monitoringTtl: 替换监控组件的300秒TTL
 * - authTtl: 替换认证组件的300秒TTL
 */
export class CacheTtlValidation {
  /**
   * 默认缓存TTL（秒）
   * 替换: src/cache/config/cache.config.ts:59 中的 defaultTtl
   * 替换: src/monitoring/config/monitoring.config.ts:48 中的 health TTL
   * 替换: src/auth/constants/api-security.constants.ts:26,29 中的 CACHE_TTL_SECONDS
   */
  @IsNumber()
  @Min(1)
  @Max(86400) // 最大24小时
  defaultTtl: number = 300; // 5分钟

  /**
   * 强时效性TTL（秒）
   * 替换: smart-cache中的STRONG_TIMELINESS_DEFAULT_S
   * 替换: receiver组件中的5秒TTL
   */
  @IsNumber()
  @Min(1)
  @Max(60)
  strongTimelinessTtl: number = 5; // 5秒

  /**
   * 实时数据TTL（秒）
   * 用于实时价格、交易数据等
   */
  @IsNumber()
  @Min(1)
  @Max(300)
  realtimeTtl: number = 30; // 30秒

  /**
   * 监控数据TTL（秒）
   * 替换: src/monitoring/constants/cache-performance.constants.ts:221 中的 CACHE_TTL_HOT_DATA_SEC
   * 替换: src/alert/constants/timeouts.constants.ts:25 中的 ACTIVE_DATA_TTL
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  monitoringTtl: number = 300; // 5分钟

  /**
   * 认证和权限TTL（秒）
   * 替换: src/auth/constants/permission-control.constants.ts:8 中的 CACHE_TTL_SECONDS
   */
  @IsNumber()
  @Min(60)
  @Max(3600)
  authTtl: number = 300; // 5分钟

  /**
   * 数据转换器结果TTL（秒）
   * 替换: src/core/02-processing/transformer/constants/data-transformer.constants.ts:158 中的 RESULT_CACHE_TTL
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  transformerTtl: number = 300; // 5分钟

  /**
   * 数据映射器建议TTL（秒）
   * 替换: src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts:551 中的 SUGGESTION_CACHE_TTL
   */
  @IsNumber()
  @Min(60)
  @Max(1800)
  suggestionTtl: number = 300; // 5分钟

  /**
   * 长期缓存TTL（秒）
   * 用于配置、规则等较少变化的数据
   */
  @IsNumber()
  @Min(300)
  @Max(86400)
  longTermTtl: number = 3600; // 1小时
}

/**
 * TTL配置注册函数
 * 使用命名空间 'cacheTtl' 注册配置
 */
export default registerAs('cacheTtl', (): CacheTtlValidation => {
  // 从环境变量读取配置
  const config = {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    strongTimelinessTtl: parseInt(process.env.CACHE_STRONG_TTL, 10) || 5,
    realtimeTtl: parseInt(process.env.CACHE_REALTIME_TTL, 10) || 30,
    monitoringTtl: parseInt(process.env.CACHE_MONITORING_TTL, 10) || 300,
    authTtl: parseInt(process.env.CACHE_AUTH_TTL, 10) || 300,
    transformerTtl: parseInt(process.env.CACHE_TRANSFORMER_TTL, 10) || 300,
    suggestionTtl: parseInt(process.env.CACHE_SUGGESTION_TTL, 10) || 300,
    longTermTtl: parseInt(process.env.CACHE_LONG_TERM_TTL, 10) || 3600,
  };

  // 转换为验证类实例
  const validatedConfig = plainToClass(CacheTtlValidation, config);

  // 执行验证
  const errors = validateSync(validatedConfig, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Cache TTL configuration validation failed: ${errorMessages}`);
  }

  return validatedConfig;
});

/**
 * 导出配置验证类类型
 */
export type CacheTtlConfigType = CacheTtlValidation;