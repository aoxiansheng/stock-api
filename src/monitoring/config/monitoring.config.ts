/**
 * 监控组件配置接口和默认值
 * 
 * 职责边界：
 * - 专门负责监控数据的缓存管理（区别于缓存统计替换功能）
 * - 监控事件处理和性能指标阈值配置
 * - 不涉及系统级缓存配置和跨组件共享配置
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, IsString, Min, Max, validateSync } from 'class-validator';
import { plainToClass, Transform, Type } from 'class-transformer';

/**
 * 监控配置TTL部分的验证类
 */
export class MonitoringTtlConfig {
  /** 健康检查数据缓存生存时间（秒）
   * 用途：控制系统健康状态数据在Redis中的缓存时间
   * 影响：较短的TTL提供更及时的健康状态，较长的TTL减少数据库查询频率
   * 推荐值：开发环境150-300秒，生产环境300-600秒 */
  @IsNumber()
  @Min(1)
  @Max(3600)
  @Transform(({ value }) => parseInt(value, 10) || 300)
  health: number = 300;

  /** 趋势分析数据缓存生存时间（秒）
   * 用途：控制性能趋势分析报告数据的缓存时间
   * 影响：趋势数据变化较慢，可以使用较长的TTL来优化性能
   * 推荐值：开发环境600秒，生产环境600-1200秒 */
  @IsNumber()
  @Min(1)
  @Max(3600)
  @Transform(({ value }) => parseInt(value, 10) || 600)
  trend: number = 600;

  /** 性能指标数据缓存生存时间（秒）
   * 用途：控制实时性能指标（响应时间、吞吐量等）的缓存时间
   * 影响：性能指标需要较高的时效性，TTL不宜过长
   * 推荐值：开发环境180秒，生产环境180-300秒 */
  @IsNumber()
  @Min(1)
  @Max(1800)
  @Transform(({ value }) => parseInt(value, 10) || 180)
  performance: number = 180;

  /** 告警数据缓存生存时间（秒）
   * 用途：控制告警状态和历史告警数据的缓存时间
   * 影响：告警数据需要快速更新，使用较短的TTL确保及时性
   * 推荐值：开发环境60秒，生产环境60-120秒 */
  @IsNumber()
  @Min(1)
  @Max(600)
  @Transform(({ value }) => parseInt(value, 10) || 60)
  alert: number = 60;

  /** 缓存统计数据缓存生存时间（秒）
   * 用途：控制缓存命中率、缓存性能等元统计信息的缓存时间
   * 影响：统计数据可以容忍一定的延迟，用于生成缓存性能报告
   * 推荐值：开发环境120秒，生产环境120-240秒 */
  @IsNumber()
  @Min(1)
  @Max(600)
  @Transform(({ value }) => parseInt(value, 10) || 120)
  cacheStats: number = 120;
}

/**
 * 监控配置缓存部分的验证类
 */
export class MonitoringCacheConfig {
  /** Redis命名空间
   * 用途：为所有监控相关的Redis键添加命名空间前缀，避免键冲突
   * 影响：命名空间变更会导致现有缓存失效，需要重新预热
   * 推荐值：生产环境使用'monitoring_prod'，开发环境使用'monitoring_dev' */
  @IsString()
  @Transform(({ value }) => value || 'monitoring')
  namespace: string = 'monitoring';

  /** 监控数据索引键前缀
   * 用途：用于创建监控数据索引的Redis键前缀，支持快速查询和聚合
   * 影响：索引前缀变更会影响监控数据的查询性能和索引重建
   * 推荐值：保持与namespace一致的命名规范 */
  @IsString() 
  @Transform(({ value }) => value || 'monitoring:index')
  keyIndexPrefix: string = 'monitoring:index';

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

  /** 监控数据TTL配置对象
   * 用途：定义不同类型监控数据的缓存生存时间，控制数据时效性和缓存性能 */
  @Type(() => MonitoringTtlConfig)
  ttl: MonitoringTtlConfig = new MonitoringTtlConfig();

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
  @Transform(({ value }) => value !== 'false')
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
  latencyThresholds: MonitoringLatencyThresholdsConfig = new MonitoringLatencyThresholdsConfig();

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
    
    /** 监控数据TTL配置 - 不同类型监控数据的缓存生存时间（秒） */
    ttl: {
      /** 健康检查数据TTL（秒） - 系统健康状态数据的缓存时间 */
      health: number;
      
      /** 趋势数据TTL（秒） - 性能趋势分析数据的缓存时间 */
      trend: number;
      
      /** 性能指标数据TTL（秒） - 实时性能指标数据的缓存时间 */
      performance: number;
      
      /** 告警数据TTL（秒） - 告警状态和历史数据的缓存时间 */
      alert: number;
      
      /** 缓存统计数据TTL（秒） - 缓存命中率等统计信息的缓存时间 */
      cacheStats: number;
    };
    
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
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  cache: {
    // 监控数据Redis命名空间 - 默认"monitoring"，可通过MONITORING_CACHE_NAMESPACE环境变量覆盖
    namespace: process.env.MONITORING_CACHE_NAMESPACE || "monitoring",
    
    // 监控数据索引键前缀 - 默认"monitoring:index"，可通过MONITORING_KEY_INDEX_PREFIX环境变量覆盖
    keyIndexPrefix:
      process.env.MONITORING_KEY_INDEX_PREFIX || "monitoring:index",
    
    // 数据压缩阈值 - 默认1024字节，超过此大小的数据将被压缩，可通过MONITORING_COMPRESSION_THRESHOLD环境变量覆盖
    compressionThreshold:
      parseInt(process.env.MONITORING_COMPRESSION_THRESHOLD) || 1024,
    
    // 回退告警阈值 - 默认连续10次回退后告警，可通过MONITORING_FALLBACK_THRESHOLD环境变量覆盖
    fallbackThreshold:
      parseInt(process.env.MONITORING_FALLBACK_THRESHOLD) || 10,
    
    ttl: {
      // 健康检查数据TTL - 默认300秒（5分钟），适中的缓存时间平衡实时性和性能
      health: parseInt(process.env.MONITORING_TTL_HEALTH) || 300,
      
      // 趋势分析数据TTL - 默认600秒（10分钟），趋势数据变化较慢可适当延长缓存
      trend: parseInt(process.env.MONITORING_TTL_TREND) || 600,
      
      // 性能指标数据TTL - 默认180秒（3分钟），性能数据需要相对实时的反馈
      performance: parseInt(process.env.MONITORING_TTL_PERFORMANCE) || 180,
      
      // 告警数据TTL - 默认60秒（1分钟），告警数据需要快速更新确保及时响应
      alert: parseInt(process.env.MONITORING_TTL_ALERT) || 60,
      
      // 缓存统计数据TTL - 默认120秒（2分钟），统计数据更新频率适中
      cacheStats: parseInt(process.env.MONITORING_TTL_CACHE_STATS) || 120,
    },
    
    // 监控数据批处理大小 - 默认10个，平衡处理效率和内存占用
    batchSize: parseInt(process.env.MONITORING_BATCH_SIZE) || 10,
  },
  
  events: {
    // 自动分析功能 - 默认启用，设置为"false"时禁用
    enableAutoAnalysis: process.env.MONITORING_AUTO_ANALYSIS !== "false",
    
    // 事件处理重试次数 - 默认3次，平衡可靠性和性能
    retryAttempts: parseInt(process.env.MONITORING_EVENT_RETRY) || 3,
  },
  
  performance: {
    latencyThresholds: {
      // P95延迟警告阈值 - 默认200ms，适合大多数API的性能要求
      p95Warning: parseInt(process.env.MONITORING_P95_WARNING) || 200,
      
      // P99延迟严重阈值 - 默认500ms，超过此值表明存在严重性能问题
      p99Critical: parseInt(process.env.MONITORING_P99_CRITICAL) || 500,
    },
    
    // 缓存命中率阈值 - 默认0.8（80%），低于此值说明缓存效果不佳
    hitRateThreshold:
      parseFloat(process.env.MONITORING_HIT_RATE_THRESHOLD) || 0.8,
    
    // 错误率阈值 - 默认0.1（10%），超过此值说明系统存在稳定性问题
    errorRateThreshold:
      parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD) || 0.1,
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

  // 验证TTL配置 - 确保所有TTL值为正数
  Object.entries(validated.cache.ttl).forEach(([key, value]) => {
    if (value <= 0) {
      throw new Error(`监控缓存TTL配置 ${key} 必须大于0秒`);
    }
  });

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
          ttl: {
            health: 600,      // 10分钟 - 生产环境延长健康检查缓存，减少检查频率
            trend: 1200,      // 20分钟 - 趋势数据在生产环境变化更稳定
            performance: 300, // 5分钟 - 适当延长性能数据缓存
            alert: 120,       // 2分钟 - 告警数据允许稍长的缓存时间
            cacheStats: 240,  // 4分钟 - 统计数据缓存时间延长
          },
          batchSize: 20, // 生产环境增大批处理，提高吞吐量
        },
        performance: {
          ...DEFAULT_MONITORING_CONFIG.performance,
          hitRateThreshold: 0.9,  // 90% - 生产环境要求更高的缓存命中率
          errorRateThreshold: 0.05, // 5% - 生产环境降低错误率容忍度
        },
      });

    case "test":
      // 测试环境配置 - 注重快速反馈和资源节约
      return validateMonitoringConfig({
        ...DEFAULT_MONITORING_CONFIG,
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          ttl: {
            health: 10,      // 10秒 - 测试时需要快速更新状态
            trend: 20,       // 20秒 - 快速验证趋势分析功能
            performance: 10, // 10秒 - 快速反映性能变化
            alert: 5,        // 5秒 - 告警测试需要即时响应
            cacheStats: 10,  // 10秒 - 统计功能快速验证
          },
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
export const monitoringConfigValidated = registerAs('monitoringValidated', (): MonitoringConfigValidated => {
  const rawConfig = {
    cache: {
      namespace: process.env.MONITORING_CACHE_NAMESPACE,
      keyIndexPrefix: process.env.MONITORING_KEY_INDEX_PREFIX,
      compressionThreshold: process.env.MONITORING_COMPRESSION_THRESHOLD,
      fallbackThreshold: process.env.MONITORING_FALLBACK_THRESHOLD,
      ttl: {
        health: process.env.MONITORING_TTL_HEALTH,
        trend: process.env.MONITORING_TTL_TREND,
        performance: process.env.MONITORING_TTL_PERFORMANCE,
        alert: process.env.MONITORING_TTL_ALERT,
        cacheStats: process.env.MONITORING_TTL_CACHE_STATS,
      },
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
    const errorMessages = errors.map(error => 
      Object.values(error.constraints || {}).join(', ')
    ).join('; ');
    
    throw new Error(
      `监控配置验证失败: ${errorMessages}`
    );
  }

  return config;
});

/**
 * 监控配置类型导出
 */
export type MonitoringConfigType = MonitoringConfigValidated;
