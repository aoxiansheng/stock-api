/**
 * 监控组件配置接口和默认值
 *
 * 职责边界：
 * - 专门负责监控数据的缓存管理（区别于缓存统计替换功能）
 * - 监控事件处理和性能指标阈值配置
 * - 不涉及系统级缓存配置和跨组件共享配置
 */

import { registerAs } from "@nestjs/config";
import {
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
  validateSync,
} from "class-validator";
import { plainToClass, Transform, Type } from "class-transformer";
import {
  MonitoringUnifiedTtl,
  MonitoringUnifiedLimitsConfig,
} from "./unified";


/**
 * 监控配置缓存部分的验证类
 */
export class MonitoringCacheConfig {
  /** Redis命名空间
   * 用途：为所有监控相关的Redis键添加命名空间前缀，避免键冲突
   * 影响：命名空间变更会导致现有缓存失效，需要重新预热
   * 推荐值：生产环境使用'monitoring_prod'，开发环境使用'monitoring_dev' */
  @IsString()
  @Transform(({ value }) => value || "monitoring")
  namespace: string = "monitoring";

  /** 监控数据索引键前缀
   * 用途：用于创建监控数据索引的Redis键前缀，支持快速查询和聚合
   * 影响：索引前缀变更会影响监控数据的查询性能和索引重建
   * 推荐值：保持与namespace一致的命名规范 */
  @IsString()
  @Transform(({ value }) => value || "monitoring:index")
  keyIndexPrefix: string = "monitoring:index";

  /** 数据压缩阈值（字节）
   * 用途：当监控数据大小超过此阈值时，自动启用压缩存储节省内存
   * 影响：较小阈值增加CPU开销但节省内存，较大阈值减少CPU开销但占用更多内存
   * 推荐值：开发环境1024字节，生产环境2048-4096字节 */
  @IsNumber()
  @Min(0)
  @Max(10240)
  @Transform(({ value }) => parseInt(value, 10) || 1024)
  compressionThreshold: number = 1024;

  /** 缓存回退次数告警阈值
   * 用途：当缓存连续失败回退到数据库查询的次数达到阈值时触发告警
   * 影响：较低阈值提供更早的告警但可能产生误报，较高阈值延迟告警时机
   * 推荐值：开发环境5-10次，生产环境10-20次 */
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10) || 10)
  fallbackThreshold: number = 10;


  /** 监控数据批处理大小
   * 用途：批量处理监控数据时的批次大小，影响处理效率和内存使用
   * 影响：较大批次提高吞吐量但增加内存占用，较小批次降低内存压力但影响效率
   * 推荐值：开发环境5-10，生产环境10-50 */
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10) || 10)
  batchSize: number = 10;
}

/**
 * 监控配置事件部分的验证类
 */
export class MonitoringEventsConfig {
  /** 是否启用自动分析功能
   * 用途：控制是否自动分析监控数据并生成性能洞察报告和异常检测结果
   * 影响：启用时提供更智能的监控能力但增加计算开销，禁用时节省资源但失去自动洞察
   * 推荐值：生产环境启用，测试环境可禁用以减少干扰 */
  @IsBoolean()
  @Transform(({ value }) => value !== "false")
  enableAutoAnalysis: boolean = true;

  /** 监控事件处理失败重试次数
   * 用途：当监控事件处理失败时的自动重试次数，提高系统容错性
   * 影响：较多重试次数提高成功率但延长处理时间，较少重试快速失败但可能丢失重要事件
   * 推荐值：开发环境2-3次，生产环境3-5次 */
  @IsNumber()
  @Min(0)
  @Max(10)
  @Transform(({ value }) => parseInt(value, 10) || 3)
  retryAttempts: number = 3;
}

/**
 * 监控配置性能阈值部分的验证类
 */
export class MonitoringLatencyThresholdsConfig {
  /** P95延迟告警阈值（毫秒）
   * 用途：当95%的请求响应时间超过此阈值时触发告警，用于检测性能下降
   * 影响：较低阈值提供更早的性能告警，较高阈值减少告警噪音
   * 推荐值：API服务150-300ms，数据库查询100-200ms */
  @IsNumber()
  @Min(50)
  @Max(2000)
  @Transform(({ value }) => parseInt(value, 10) || 200)
  p95Warning: number = 200;

  /** P99延迟严重告警阈值（毫秒）
   * 用途：当99%的请求响应时间超过此阈值时触发严重告警，表示系统出现严重性能问题
   * 影响：用于识别系统性能的严重恶化，通常需要立即处理
   * 推荐值：API服务300-800ms，数据库查询200-500ms */
  @IsNumber()
  @Min(100)
  @Max(5000)
  @Transform(({ value }) => parseInt(value, 10) || 500)
  p99Critical: number = 500;
}

/**
 * 监控配置性能部分的验证类
 */
export class MonitoringPerformanceConfig {
  /** 延迟阈值配置对象
   * 用途：包含P95和P99延迟告警阈值，用于监控系统响应时间性能 */
  @Type(() => MonitoringLatencyThresholdsConfig)
  latencyThresholds: MonitoringLatencyThresholdsConfig =
    new MonitoringLatencyThresholdsConfig();

  /** 缓存命中率阈值（0.1-1.0）
   * 用途：当缓存命中率低于此阈值时触发告警，用于监控缓存效率
   * 影响：较高阈值确保缓存充分利用，较低阈值允许更多缓存失效
   * 推荐值：Redis缓存0.8-0.95，内存缓存0.7-0.9 */
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  @Transform(({ value }) => parseFloat(value) || 0.8)
  hitRateThreshold: number = 0.8;

  /** 错误率阈值（0.01-0.5）
   * 用途：当系统错误率超过此阈值时触发告警，用于监控系统稳定性
   * 影响：较低阈值提供更严格的稳定性要求，较高阈值允许更多错误容忍
   * 推荐值：生产环境0.01-0.05，测试环境0.05-0.1 */
  @IsNumber()
  @Min(0.01)
  @Max(0.5)
  @Transform(({ value }) => parseFloat(value) || 0.1)
  errorRateThreshold: number = 0.1;
}

/**
 * 监控配置主类，带有完整的类型安全验证
 */
export class MonitoringConfigValidated {
  /** 缓存相关配置
   * 用途：包含Redis命名空间、TTL设置、批处理大小等缓存管理配置 */
  @Type(() => MonitoringCacheConfig)
  cache: MonitoringCacheConfig = new MonitoringCacheConfig();

  /** 事件处理相关配置
   * 用途：包含自动分析开关、重试次数等监控事件处理配置 */
  @Type(() => MonitoringEventsConfig)
  events: MonitoringEventsConfig = new MonitoringEventsConfig();

  /** 性能监控相关配置
   * 用途：包含延迟阈值、缓存命中率、错误率等性能指标的告警阈值配置 */
  @Type(() => MonitoringPerformanceConfig)
  performance: MonitoringPerformanceConfig = new MonitoringPerformanceConfig();
}

export interface MonitoringConfig {
  /** 监控数据缓存相关配置 - 用于监控数据的存储和检索 */
  cache: {
    /** Redis命名空间 - 用于隔离监控数据缓存键 */
    namespace: string;

    /** 索引键前缀 - 用于监控数据索引的Redis键前缀 */
    keyIndexPrefix: string;

    /** 压缩阈值（字节） - 超过此大小的监控数据将被压缩存储 */
    compressionThreshold: number;

    /** 回退次数告警阈值 - 连续回退多少次后触发告警 */
    fallbackThreshold: number;


    /** 监控数据批处理大小 - 批量处理监控数据时的批次大小 */
    batchSize: number;
  };

  /** 监控事件处理配置 */
  events: {
    /** 是否启用自动分析 - 自动分析监控数据并生成洞察报告 */
    enableAutoAnalysis: boolean;

    /** 事件处理重试次数 - 监控事件处理失败时的最大重试次数 */
    retryAttempts: number;
  };

  /** 性能监控阈值配置 */
  performance: {
    /** 延迟阈值配置（毫秒） */
    latencyThresholds: {
      /** P95延迟告警阈值（ms） - 95%请求延迟超过此值时触发告警 */
      p95Warning: number;

      /** P99延迟严重告警阈值（ms） - 99%请求延迟超过此值时触发严重告警 */
      p99Critical: number;
    };

    /** 缓存命中率告警阈值（0-1） - 缓存命中率低于此值时触发告警 */
    hitRateThreshold: number;

    /** 错误率告警阈值（0-1） - 错误率超过此值时触发告警 */
    errorRateThreshold: number;
  };
}

/**
 * 默认监控配置
 *
 * 环境变量覆盖说明：
 * - 支持通过环境变量覆盖默认值，便于不同环境的定制化配置
 * - 所有环境变量均有合理的默认值，确保在无环境变量时也能正常工作
 * - 环境变量命名遵循 MONITORING_功能_属性 的规范
 */
// 核心环境变量获取 - 简化版，完整配置请使用 MonitoringUnifiedTtl
const getCoreEnvValues = () => {
  const defaultTtl = parseInt(process.env.MONITORING_DEFAULT_TTL) || 300;
  const defaultBatchSize = parseInt(process.env.MONITORING_DEFAULT_BATCH_SIZE) || 10;
  const apiResponseGood = parseInt(process.env.MONITORING_API_RESPONSE_GOOD) || 300;
  const cacheHitThreshold = parseFloat(process.env.MONITORING_CACHE_HIT_THRESHOLD) || 0.8;
  const errorRateThreshold = parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD) || 0.1;
  const autoAnalysis = process.env.MONITORING_AUTO_ANALYSIS !== "false";
  const eventRetry = parseInt(process.env.MONITORING_EVENT_RETRY) || 3;
  const namespace = process.env.MONITORING_NAMESPACE || "monitoring";

  return {
    defaultTtl,
    defaultBatchSize,
    apiResponseGood, 
    cacheHitThreshold,
    errorRateThreshold,
    autoAnalysis,
    eventRetry,
    namespace,
  };
};

const coreEnv = getCoreEnvValues();

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  cache: {
    // 使用核心环境变量 MONITORING_NAMESPACE 替代 MONITORING_CACHE_NAMESPACE
    namespace: coreEnv.namespace,

    // 基于核心命名空间生成索引前缀
    keyIndexPrefix: `${coreEnv.namespace}:index`,

    // 数据压缩阈值 - 保持固定值，不需要环境变量控制
    compressionThreshold: 1024,

    // 回退告警阈值 - 保持固定值，不需要环境变量控制
    fallbackThreshold: 10,


    // 使用核心环境变量 MONITORING_DEFAULT_BATCH_SIZE
    batchSize: coreEnv.defaultBatchSize,
  },

  events: {
    // 使用核心环境变量 MONITORING_AUTO_ANALYSIS
    enableAutoAnalysis: coreEnv.autoAnalysis,

    // 使用核心环境变量 MONITORING_EVENT_RETRY
    retryAttempts: coreEnv.eventRetry,
  },

  performance: {
    latencyThresholds: {
      // 基于核心环境变量 MONITORING_API_RESPONSE_GOOD 的倍数计算
      p95Warning: coreEnv.apiResponseGood, // 1.0x
      p99Critical: Math.floor(coreEnv.apiResponseGood * 2.5), // 2.5x
    },

    // 使用核心环境变量 MONITORING_CACHE_HIT_THRESHOLD
    hitRateThreshold: coreEnv.cacheHitThreshold,

    // 使用核心环境变量 MONITORING_ERROR_RATE_THRESHOLD
    errorRateThreshold: coreEnv.errorRateThreshold,
  },
};

/**
 * 监控配置验证函数
 *
 * 职责：
 * - 确保所有配置参数在合理范围内
 * - 提供清晰的错误信息帮助定位配置问题
 * - 合并默认配置和自定义配置
 *
 * @param config 部分配置覆盖，将与默认配置合并
 * @returns 验证通过的完整监控配置
 * @throws Error 配置验证失败时抛出具体错误信息
 */
export function validateMonitoringConfig(
  config: Partial<MonitoringConfig>,
): MonitoringConfig {
  const validated = { ...DEFAULT_MONITORING_CONFIG, ...config };

  // 验证缓存配置 - 确保缓存相关参数的合理性
  if (validated.cache.compressionThreshold < 0) {
    throw new Error("监控缓存压缩阈值不能为负数");
  }

  if (validated.cache.batchSize < 1) {
    throw new Error("监控缓存批处理大小必须大于0");
  }


  // 验证性能阈值 - 确保百分比值在有效范围内
  if (
    validated.performance.hitRateThreshold < 0 ||
    validated.performance.hitRateThreshold > 1
  ) {
    throw new Error("监控命中率阈值必须在0-1之间");
  }

  if (
    validated.performance.errorRateThreshold < 0 ||
    validated.performance.errorRateThreshold > 1
  ) {
    throw new Error("监控错误率阈值必须在0-1之间");
  }

  return validated;
}

/**
 * 获取环境特定的监控配置
 *
 * 根据不同运行环境自动调整监控配置参数：
 * - production: 优化性能和稳定性，延长缓存时间，提高质量要求
 * - test: 快速响应和轻量化，缩短缓存时间，减少资源占用
 * - development: 使用默认配置，平衡开发体验和功能完整性
 *
 * @returns 针对当前环境优化的监控配置
 */
export function getMonitoringConfigForEnvironment(): MonitoringConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      // 生产环境配置 - 注重性能优化和高可用性
      return validateMonitoringConfig({
        ...DEFAULT_MONITORING_CONFIG,
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          batchSize: 20, // 生产环境增大批处理，提高吞吐量
        },
        performance: {
          ...DEFAULT_MONITORING_CONFIG.performance,
          hitRateThreshold: 0.9, // 90% - 生产环境要求更高的缓存命中率
          errorRateThreshold: 0.05, // 5% - 生产环境降低错误率容忍度
        },
      });

    case "test":
      // 测试环境配置 - 注重快速反馈和资源节约
      return validateMonitoringConfig({
        ...DEFAULT_MONITORING_CONFIG,
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          batchSize: 3, // 测试环境小批次处理，减少资源占用
        },
        events: {
          ...DEFAULT_MONITORING_CONFIG.events,
          enableAutoAnalysis: false, // 测试时禁用自动分析，避免干扰测试结果
        },
      });

    default: // development
      // 开发环境配置 - 使用默认配置，平衡开发体验
      return validateMonitoringConfig({});
  }
}

/**
 * 类型安全的监控配置注册（推荐使用）
 *
 * 使用 class-validator 进行严格的类型验证和转换
 * 提供更好的开发体验和运行时安全保障
 *
 * 使用方式：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringConfigValidated)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringValidated')
 *   private readonly config: MonitoringConfigValidated
 * ) {}
 * ```
 */
export const monitoringConfigValidated = registerAs(
  "monitoringValidated",
  (): MonitoringConfigValidated => {
    const rawConfig = {
      cache: {
        namespace: process.env.MONITORING_CACHE_NAMESPACE,
        keyIndexPrefix: process.env.MONITORING_KEY_INDEX_PREFIX,
        compressionThreshold: process.env.MONITORING_COMPRESSION_THRESHOLD,
        fallbackThreshold: process.env.MONITORING_FALLBACK_THRESHOLD,
        batchSize: process.env.MONITORING_BATCH_SIZE,
      },
      events: {
        enableAutoAnalysis: process.env.MONITORING_AUTO_ANALYSIS,
        retryAttempts: process.env.MONITORING_EVENT_RETRY,
      },
      performance: {
        latencyThresholds: {
          p95Warning: process.env.MONITORING_P95_WARNING,
          p99Critical: process.env.MONITORING_P99_CRITICAL,
        },
        hitRateThreshold: process.env.MONITORING_HIT_RATE_THRESHOLD,
        errorRateThreshold: process.env.MONITORING_ERROR_RATE_THRESHOLD,
      },
    };

    // 使用 class-transformer 和 class-validator 进行转换和验证
    const config = plainToClass(MonitoringConfigValidated, rawConfig, {
      enableImplicitConversion: true,
    });

    // 执行验证
    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(", "))
        .join("; ");

      throw new Error(`监控配置验证失败: ${errorMessages}`);
    }

    return config;
  },
);

/**
 * 监控配置类型导出
 */
export type MonitoringConfigType = MonitoringConfigValidated;
