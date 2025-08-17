import { CacheStrategy } from './symbol-smart-cache-orchestrator.interface';

/**
 * 智能缓存编排器配置令牌
 * 用于依赖注入系统中的配置提供
 */
export const SMART_CACHE_ORCHESTRATOR_CONFIG = 'SMART_CACHE_ORCHESTRATOR_CONFIG';

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
  /** 缓存TTL（秒），建议30-60秒 */
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
 * 默认配置常量
 * 提供各策略的默认配置值
 */
export const DEFAULT_SMART_CACHE_CONFIG: SmartCacheOrchestratorConfig = {
  defaultMinUpdateInterval: 30000, // 30秒，沿用Query现网值
  maxConcurrentUpdates: 10,
  gracefulShutdownTimeout: 30000, // 30秒，与QueryService保持一致
  enableBackgroundUpdate: true,
  enableDataChangeDetection: true,
  enableMetrics: true,
  
  strategies: {
    [CacheStrategy.STRONG_TIMELINESS]: {
      ttl: 60, // 1分钟
      enableBackgroundUpdate: true,
      updateThresholdRatio: 0.3, // TTL剩余30%时更新
      forceRefreshInterval: 300, // 5分钟强制刷新
      enableDataChangeDetection: true,
    },
    
    [CacheStrategy.WEAK_TIMELINESS]: {
      ttl: 300, // 5分钟
      enableBackgroundUpdate: true,
      updateThresholdRatio: 0.2, // TTL剩余20%时更新
      minUpdateInterval: 60, // 最小1分钟更新间隔
      enableDataChangeDetection: true,
    },
    
    [CacheStrategy.MARKET_AWARE]: {
      openMarketTtl: 30, // 开市时30秒
      closedMarketTtl: 1800, // 闭市时30分钟
      enableBackgroundUpdate: true,
      marketStatusCheckInterval: 300, // 5分钟检查市场状态
      openMarketUpdateThresholdRatio: 0.3,
      closedMarketUpdateThresholdRatio: 0.1,
      enableDataChangeDetection: true,
    },
    
    [CacheStrategy.NO_CACHE]: {
      bypassCache: true,
      enableMetrics: true,
    },
    
    [CacheStrategy.ADAPTIVE]: {
      baseTtl: 180, // 3分钟基础TTL
      minTtl: 30, // 最小30秒
      maxTtl: 3600, // 最大1小时
      adaptationFactor: 1.5,
      enableBackgroundUpdate: true,
      changeDetectionWindow: 3600, // 1小时检测窗口
      enableDataChangeDetection: true,
    },
  },
};

/**
 * 配置验证函数
 * 验证配置参数的有效性
 */
export function validateSmartCacheConfig(config: SmartCacheOrchestratorConfig): string[] {
  const errors: string[] = [];
  
  // 验证基础配置
  if (config.defaultMinUpdateInterval <= 0) {
    errors.push('defaultMinUpdateInterval must be positive');
  }
  
  if (config.maxConcurrentUpdates <= 0) {
    errors.push('maxConcurrentUpdates must be positive');
  }
  
  if (config.gracefulShutdownTimeout <= 0) {
    errors.push('gracefulShutdownTimeout must be positive');
  }
  
  // 验证策略配置
  Object.entries(config.strategies).forEach(([strategy, strategyConfig]) => {
    switch (strategy as CacheStrategy) {
      case CacheStrategy.STRONG_TIMELINESS:
        const strongConfig = strategyConfig as StrongTimelinessConfig;
        if (strongConfig.ttl <= 0) {
          errors.push(`${strategy}: ttl must be positive`);
        }
        if (strongConfig.updateThresholdRatio < 0 || strongConfig.updateThresholdRatio > 1) {
          errors.push(`${strategy}: updateThresholdRatio must be between 0 and 1`);
        }
        break;
        
      case CacheStrategy.WEAK_TIMELINESS:
        const weakConfig = strategyConfig as WeakTimelinessConfig;
        if (weakConfig.ttl <= 0) {
          errors.push(`${strategy}: ttl must be positive`);
        }
        if (weakConfig.minUpdateInterval <= 0) {
          errors.push(`${strategy}: minUpdateInterval must be positive`);
        }
        break;
        
      case CacheStrategy.MARKET_AWARE:
        const marketConfig = strategyConfig as MarketAwareConfig;
        if (marketConfig.openMarketTtl <= 0 || marketConfig.closedMarketTtl <= 0) {
          errors.push(`${strategy}: TTL values must be positive`);
        }
        if (marketConfig.marketStatusCheckInterval <= 0) {
          errors.push(`${strategy}: marketStatusCheckInterval must be positive`);
        }
        break;
        
      case CacheStrategy.ADAPTIVE:
        const adaptiveConfig = strategyConfig as AdaptiveConfig;
        if (adaptiveConfig.minTtl >= adaptiveConfig.maxTtl) {
          errors.push(`${strategy}: minTtl must be less than maxTtl`);
        }
        if (adaptiveConfig.adaptationFactor <= 0) {
          errors.push(`${strategy}: adaptationFactor must be positive`);
        }
        break;
    }
  });
  
  return errors;
}