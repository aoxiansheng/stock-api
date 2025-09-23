import { CacheStrategy } from "./smart-cache-orchestrator.interface";
import {
  SMART_CACHE_CONSTANTS,
  SmartCacheConstantsType,
} from "../constants/smart-cache.constants";
import { SMART_CACHE_COMPONENT } from "../constants/smart-cache.component.constants";
import { SmartCacheConfigValidator } from "../validators/smart-cache-config.validator";

/**
 * 智能缓存编排器配置令牌
 * 用于依赖注入系统中的配置提供
 */
export const SMART_CACHE_ORCHESTRATOR_CONFIG =
  "SMART_CACHE_ORCHESTRATOR_CONFIG";

/**
 * 智能缓存编排器主配置接口
 * 定义编排器的全局配置参数
 */
export interface SmartCacheOrchestratorConfig {
  /**
   * 默认最小更新间隔（毫秒）
   * 沿用Query现网值：30秒
   */
  defaultMinUpdateInterval: number;

  /**
   * 最大并发后台更新任务数
   * 控制后台更新的并发量，避免系统过载
   */
  maxConcurrentUpdates: number;

  /**
   * 优雅关闭超时时间（毫秒）
   * OnModuleDestroy等待所有后台任务完成的最长时间
   */
  gracefulShutdownTimeout: number;

  /**
   * 是否启用后台更新
   * 全局开关，控制是否执行后台数据更新
   */
  enableBackgroundUpdate: boolean;

  /**
   * 是否启用数据变化检测
   * 控制是否在后台更新时检测数据变化
   */
  enableDataChangeDetection: boolean;

  /**
   * 是否启用监控指标
   * 控制是否采集Prometheus指标
   */
  enableMetrics: boolean;

  /**
   * 策略配置映射
   * 每种缓存策略的具体配置参数
   */
  strategies: {
    /** 强时效性策略配置 */
    [CacheStrategy.STRONG_TIMELINESS]: StrongTimelinessConfig;

    /** 弱时效性策略配置 */
    [CacheStrategy.WEAK_TIMELINESS]: WeakTimelinessConfig;

    /** 市场感知策略配置 */
    [CacheStrategy.MARKET_AWARE]: MarketAwareConfig;

    /** 无缓存策略配置 */
    [CacheStrategy.NO_CACHE]: NoCacheConfig;

    /** 自适应策略配置 */
    [CacheStrategy.ADAPTIVE]: AdaptiveConfig;
  };
}

/**
 * 强时效性策略配置
 * 适用于Receiver，要求数据新鲜度
 */
export interface StrongTimelinessConfig {
  /** 缓存TTL（秒），建议5-10秒以符合强时效性要求 */
  ttl: number;

  /** 是否启用后台更新 */
  enableBackgroundUpdate: boolean;

  /** 更新阈值比例（0-1），TTL剩余比例低于此值时触发更新 */
  updateThresholdRatio: number;

  /** 强制刷新间隔（秒），超过此时间强制刷新 */
  forceRefreshInterval: number;

  /** 是否启用数据变化检测 */
  enableDataChangeDetection: boolean;
}

/**
 * 弱时效性策略配置
 * 适用于Query，允许较长的缓存时间
 */
export interface WeakTimelinessConfig {
  /** 缓存TTL（秒），建议300-600秒 */
  ttl: number;

  /** 是否启用后台更新 */
  enableBackgroundUpdate: boolean;

  /** 更新阈值比例（0-1），TTL剩余比例低于此值时触发更新 */
  updateThresholdRatio: number;

  /** 最小更新间隔（秒），避免频繁更新 */
  minUpdateInterval: number;

  /** 是否启用数据变化检测 */
  enableDataChangeDetection: boolean;
}

/**
 * 市场感知策略配置
 * 根据市场开闭状态动态调整缓存时间
 */
export interface MarketAwareConfig {
  /** 开市时缓存TTL（秒） */
  openMarketTtl: number;

  /** 闭市时缓存TTL（秒） */
  closedMarketTtl: number;

  /** 是否启用后台更新 */
  enableBackgroundUpdate: boolean;

  /** 市场状态检查间隔（秒） */
  marketStatusCheckInterval: number;

  /** 开市时更新阈值比例 */
  openMarketUpdateThresholdRatio: number;

  /** 闭市时更新阈值比例 */
  closedMarketUpdateThresholdRatio: number;

  /** 是否启用数据变化检测 */
  enableDataChangeDetection: boolean;
}

/**
 * 无缓存策略配置
 * 直接获取数据，不使用缓存
 */
export interface NoCacheConfig {
  /** 是否完全绕过缓存 */
  bypassCache: boolean;

  /** 是否记录监控指标 */
  enableMetrics: boolean;
}

/**
 * 自适应策略配置
 * 基于数据变化频率动态调整缓存参数
 */
export interface AdaptiveConfig {
  /** 基础TTL（秒） */
  baseTtl: number;

  /** 最小TTL（秒） */
  minTtl: number;

  /** 最大TTL（秒） */
  maxTtl: number;

  /** 自适应调整因子（0-2），控制TTL调整幅度 */
  adaptationFactor: number;

  /** 是否启用后台更新 */
  enableBackgroundUpdate: boolean;

  /** 数据变化检测窗口时间（秒） */
  changeDetectionWindow: number;

  /** 是否启用数据变化检测 */
  enableDataChangeDetection: boolean;
}

/**
 * 使用常量定义默认配置，提供类型安全和单一数据源
 * 替换原有的硬编码默认配置（第184-234行）
 */
export const DEFAULT_SMART_CACHE_CONFIG = Object.freeze({
  // 基础配置 - 使用明确命名的常量
  defaultMinUpdateInterval:
    SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS,
  maxConcurrentUpdates:
    SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_CONCURRENT_UPDATES_COUNT,
  gracefulShutdownTimeout:
    SMART_CACHE_CONSTANTS.INTERVALS_MS.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  enableBackgroundUpdate: true,
  enableDataChangeDetection: true,
  enableMetrics: true,

  strategies: {
    // 强时效性策略配置
    [CacheStrategy.STRONG_TIMELINESS]: Object.freeze({
      ttl: SMART_CACHE_CONSTANTS.TTL_SECONDS.STRONG_TIMELINESS_DEFAULT_S,
      enableBackgroundUpdate: true,
      updateThresholdRatio:
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.STRONG_UPDATE_RATIO,
      forceRefreshInterval:
        SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS,
      enableDataChangeDetection: true,
    }),

    // 弱时效性策略配置
    [CacheStrategy.WEAK_TIMELINESS]: Object.freeze({
      ttl: SMART_CACHE_CONSTANTS.TTL_SECONDS.WEAK_TIMELINESS_DEFAULT_S,
      enableBackgroundUpdate: true,
      updateThresholdRatio:
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.WEAK_UPDATE_RATIO,
      minUpdateInterval:
        SMART_CACHE_CONSTANTS.TTL_SECONDS.STRONG_TIMELINESS_DEFAULT_S * 12, // 60秒
      enableDataChangeDetection: true,
    }),

    // 市场感知策略配置
    [CacheStrategy.MARKET_AWARE]: Object.freeze({
      openMarketTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.MARKET_OPEN_DEFAULT_S,
      closedMarketTtl:
        SMART_CACHE_CONSTANTS.TTL_SECONDS.MARKET_CLOSED_DEFAULT_S,
      enableBackgroundUpdate: true,
      marketStatusCheckInterval:
        SMART_CACHE_CONSTANTS.TTL_SECONDS.WEAK_TIMELINESS_DEFAULT_S, // 300秒
      openMarketUpdateThresholdRatio:
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.MARKET_OPEN_UPDATE_RATIO,
      closedMarketUpdateThresholdRatio:
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.MARKET_CLOSED_UPDATE_RATIO,
      enableDataChangeDetection: true,
    }),

    [CacheStrategy.NO_CACHE]: Object.freeze({
      bypassCache: true,
      enableMetrics: true,
    }),

    // 自适应策略配置
    [CacheStrategy.ADAPTIVE]: Object.freeze({
      baseTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_BASE_DEFAULT_S,
      minTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MIN_S,
      maxTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MAX_S,
      adaptationFactor: 1.5,
      enableBackgroundUpdate: true,
      changeDetectionWindow: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MAX_S, // 3600秒
      enableDataChangeDetection: true,
    }),
  },
} as const);

// 从默认配置推导接口类型，确保类型一致性
export type SmartCacheOrchestratorConfigType =
  typeof DEFAULT_SMART_CACHE_CONFIG;

/**
 * 配置验证函数
 * 使用统一验证器提供类型安全和常量化的验证
 */
export function validateSmartCacheConfig(
  config: SmartCacheOrchestratorConfigType,
): string[] {
  const errors: string[] = [];

  // 基础配置验证 - 使用统一验证器
  errors.push(
    ...SmartCacheConfigValidator.validateInterval(
      config.defaultMinUpdateInterval,
      "defaultMinUpdateInterval",
    ),
  );

  errors.push(
    ...SmartCacheConfigValidator.validateConcurrency(
      config.maxConcurrentUpdates,
    ),
  );

  errors.push(
    ...SmartCacheConfigValidator.validateInterval(
      config.gracefulShutdownTimeout,
      "gracefulShutdownTimeout",
    ),
  );

  // 策略配置验证 - 使用统一验证器
  Object.entries(config.strategies).forEach(([strategy, strategyConfig]) => {
    switch (strategy as CacheStrategy) {
      case CacheStrategy.STRONG_TIMELINESS:
        const strongConfig = strategyConfig as StrongTimelinessConfig;
        errors.push(
          ...SmartCacheConfigValidator.validateTTL(strongConfig.ttl, strategy),
        );
        errors.push(
          ...SmartCacheConfigValidator.validateThresholdRatio(
            strongConfig.updateThresholdRatio,
            strategy,
          ),
        );
        break;

      case CacheStrategy.WEAK_TIMELINESS:
        const weakConfig = strategyConfig as WeakTimelinessConfig;
        errors.push(
          ...SmartCacheConfigValidator.validateTTL(weakConfig.ttl, strategy),
        );
        errors.push(
          ...SmartCacheConfigValidator.validateInterval(
            weakConfig.minUpdateInterval * 1000, // 转换为毫秒
            `${strategy}.minUpdateInterval`,
          ),
        );
        break;

      case CacheStrategy.MARKET_AWARE:
        const marketConfig = strategyConfig as MarketAwareConfig;
        errors.push(
          ...SmartCacheConfigValidator.validateMarketAwareConfig(
            marketConfig.openMarketTtl,
            marketConfig.closedMarketTtl,
            marketConfig.marketStatusCheckInterval,
          ),
        );
        break;

      case CacheStrategy.ADAPTIVE:
        const adaptiveConfig = strategyConfig as AdaptiveConfig;
        errors.push(
          ...SmartCacheConfigValidator.validateAdaptiveTtlRange(
            adaptiveConfig.minTtl,
            adaptiveConfig.maxTtl,
            adaptiveConfig.baseTtl,
          ),
        );
        if (adaptiveConfig.adaptationFactor <= 0) {
          errors.push(`${strategy}: adaptationFactor must be positive`);
        }
        break;
    }
  });

  return errors;
}
