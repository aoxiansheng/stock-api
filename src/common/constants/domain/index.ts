/**
 * Domain层统一导出
 * 🏢 领域层 - 业务领域专用常量
 * 🎯 基于Semantic层构建，专注于具体业务领域逻辑
 */

// 导出所有领域常量
export {
  Market,
  MarketStatus,
  MARKET_DOMAIN_CONFIG,
  MARKET_CACHE_CONFIG,
  MARKET_API_TIMEOUTS,
  MARKET_BATCH_CONFIG,
  MARKET_TRADING_HOURS,
  MARKET_DATA_QUALITY,
  CACHE_TTL_BY_MARKET_STATUS,
  CHANGE_DETECTION_THRESHOLDS,
  MarketDomainUtil
} from './market-domain.constants';
export type {
  TradingSession,
  MarketTradingHours
} from './market-domain.constants';

// 导出新增的业务常量
export {
  MONITORING_BUSINESS,
  MonitoringBusinessUtil
} from './monitoring-business.constants';
export type {
  ErrorRateLevel,
  ChangeLevel,
  PerformanceLevel,
  DataVolume as MonitoringDataVolume,
  MonitoringBusinessConstants,
  ErrorThresholds,
  ChangeDetection,
  SamplingConfig,
  PerformanceBenchmarks
} from './monitoring-business.constants';

export {
  OPERATION_LIMITS,
  OperationLimitsUtil
} from './operation-limits.constants';
export type {
  OperationType,
  DataVolume as OperationDataVolume,
  CacheDataType,
  OperationLimitsConstants,
  TimeoutsMS,
  BatchSizes,
  CacheTTL,
  ConcurrencyLimits,
  RetryLimits,
  MemoryLimits
} from './operation-limits.constants';

export {
  REFERENCE_DATA,
  ReferenceDataUtil
} from './reference-data.constants';
export type {
  ReferenceMarket,
  Quarter,
  TestUser,
  ReferenceDataConstants,
  TestTimestamps,
  SampleSymbols,
  TestAccounts,
  ProviderIds,
  TestDatasets,
  ErrorScenarios
} from './reference-data.constants';

export {
  API_OPERATIONS,
  ApiOperationsUtil
} from './api-operations.constants';
export type {
  ApiDataType,
  ApiMarketType,
  ApiFetchMode,
  ApiBusinessScenario,
  ApiPriority,
  ApiCacheStrategy,
  ApiOperationsConstants,
  StockDataOperations,
  IndexDataOperations,
  DataTypes,
  MarketTypes,
  FetchModes,
  BusinessScenarios,
  Priorities,
  CacheStrategies
} from './api-operations.constants';

export {
  AlertType,
  AlertSeverity,
  AlertStatus,
  NotificationChannel,
  ALERT_RATE_LIMIT_CONFIG,
  ALERT_CACHE_CONFIG,
  ALERT_API_TIMEOUTS,
  ALERT_BATCH_CONFIG,
  ALERT_RETRY_CONFIG,
  ALERT_MESSAGES,
  ALERT_VALIDATION_RULES,
  AlertDomainUtil
} from './alert-domain.constants';

export {
  RateLimitStrategy,
  RateLimitTier,
  RateLimitScope,
  RATE_LIMIT_STRATEGY_DESCRIPTIONS,
  RATE_LIMIT_STRATEGY_USE_CASES,
  TIERED_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  RATE_LIMIT_CACHE_CONFIG,
  RATE_LIMIT_TIMEOUTS,
  RATE_LIMIT_RETRY_CONFIG,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_STATISTICS,
  RATE_LIMIT_OPERATIONS,
  RATE_LIMIT_ERROR_TEMPLATES,
  RATE_LIMIT_LUA_SCRIPT_NAMES,
  RATE_LIMIT_TIME_UNITS,
  RATE_LIMIT_TIME_MULTIPLIERS,
  RATE_LIMIT_CONFIG,
  SECURITY_LIMITS,
  RATE_LIMIT_VALIDATION_RULES,
  RateLimitTemplateUtil,
  RateLimitDomainUtil
} from './rate-limit-domain.constants';

// 导出类型定义
export type { 
  MarketDomainConfig, 
  MarketCacheConfig, 
  MarketApiTimeouts 
} from './market-domain.constants';

export type { 
  AlertRateLimitConfig, 
  AlertCacheConfig, 
  AlertApiTimeouts 
} from './alert-domain.constants';

export type { 
  TieredRateLimits, 
  EndpointRateLimits, 
  RateLimitCacheConfig 
} from './rate-limit-domain.constants';

// 导入用于对象定义
import {
  Market,
  MarketStatus,
  MARKET_DOMAIN_CONFIG,
  MARKET_CACHE_CONFIG,
  MARKET_API_TIMEOUTS,
  MARKET_BATCH_CONFIG,
  MARKET_TRADING_HOURS,
  MARKET_DATA_QUALITY,
  MarketDomainUtil
} from './market-domain.constants';

import {
  AlertType,
  AlertSeverity,
  AlertStatus,
  NotificationChannel,
  ALERT_RATE_LIMIT_CONFIG,
  ALERT_CACHE_CONFIG,
  ALERT_API_TIMEOUTS,
  ALERT_BATCH_CONFIG,
  ALERT_RETRY_CONFIG,
  ALERT_MESSAGES,
  ALERT_VALIDATION_RULES,
  AlertDomainUtil
} from './alert-domain.constants';

import {
  RateLimitStrategy,
  RateLimitTier,
  RateLimitScope,
  RATE_LIMIT_STRATEGY_DESCRIPTIONS,
  RATE_LIMIT_STRATEGY_USE_CASES,
  TIERED_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  RATE_LIMIT_CACHE_CONFIG,
  RATE_LIMIT_TIMEOUTS,
  RATE_LIMIT_RETRY_CONFIG,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_STATISTICS,
  RATE_LIMIT_CONFIG,
  SECURITY_LIMITS,
  RateLimitDomainUtil
} from './rate-limit-domain.constants';

import {
  MONITORING_BUSINESS,
  MonitoringBusinessUtil
} from './monitoring-business.constants';

import {
  OPERATION_LIMITS,
  OperationLimitsUtil
} from './operation-limits.constants';

import {
  REFERENCE_DATA,
  ReferenceDataUtil
} from './reference-data.constants';

import {
  API_OPERATIONS,
  ApiOperationsUtil
} from './api-operations.constants';

// Domain层统一常量对象
export const DOMAIN_CONSTANTS = Object.freeze({
  // 市场领域
  MARKET: {
    ENUMS: { Market, MarketStatus },
    CONFIG: MARKET_DOMAIN_CONFIG,
    CACHE: MARKET_CACHE_CONFIG,
    TIMEOUTS: MARKET_API_TIMEOUTS,
    BATCH: MARKET_BATCH_CONFIG,
    TRADING_HOURS: MARKET_TRADING_HOURS,
    DATA_QUALITY: MARKET_DATA_QUALITY,
  },

  // 告警领域
  ALERT: {
    ENUMS: { AlertType, AlertSeverity, AlertStatus, NotificationChannel },
    RATE_LIMIT: ALERT_RATE_LIMIT_CONFIG,
    CACHE: ALERT_CACHE_CONFIG,
    TIMEOUTS: ALERT_API_TIMEOUTS,
    BATCH: ALERT_BATCH_CONFIG,
    RETRY: ALERT_RETRY_CONFIG,
    MESSAGES: ALERT_MESSAGES,
    VALIDATION: ALERT_VALIDATION_RULES,
  },

  // 频率限制领域
  RATE_LIMIT: {
    ENUMS: { RateLimitStrategy, RateLimitTier, RateLimitScope },
    DESCRIPTIONS: RATE_LIMIT_STRATEGY_DESCRIPTIONS,
    USE_CASES: RATE_LIMIT_STRATEGY_USE_CASES,
    TIERED_LIMITS: TIERED_RATE_LIMITS,
    ENDPOINT_LIMITS: ENDPOINT_RATE_LIMITS,
    CACHE: RATE_LIMIT_CACHE_CONFIG,
    TIMEOUTS: RATE_LIMIT_TIMEOUTS,
    RETRY: RATE_LIMIT_RETRY_CONFIG,
    MESSAGES: RATE_LIMIT_MESSAGES,
    STATISTICS: RATE_LIMIT_STATISTICS,
  },

  // 频率限制配置（单独导出以便直接访问）
  RATE_LIMIT_CONFIG: RATE_LIMIT_CONFIG,

  // 安全限制配置（单独导出以便直接访问）
  SECURITY_LIMITS: SECURITY_LIMITS,

  // 新增的业务常量
  // 监控业务
  MONITORING: {
    ERROR_THRESHOLDS: MONITORING_BUSINESS.ERROR_THRESHOLDS,
    CHANGE_DETECTION: MONITORING_BUSINESS.CHANGE_DETECTION,
    SAMPLING_CONFIG: MONITORING_BUSINESS.SAMPLING_CONFIG,
    PERFORMANCE_BENCHMARKS: MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS,
    HEALTH_THRESHOLDS: MONITORING_BUSINESS.HEALTH_THRESHOLDS,
    ALERT_FREQUENCY: MONITORING_BUSINESS.ALERT_FREQUENCY,
    TREND_ANALYSIS: MONITORING_BUSINESS.TREND_ANALYSIS,
  },

  // 操作限制
  OPERATION: {
    TIMEOUTS_MS: OPERATION_LIMITS.TIMEOUTS_MS,
    BATCH_SIZES: OPERATION_LIMITS.BATCH_SIZES,
    CACHE_TTL_SECONDS: OPERATION_LIMITS.CACHE_TTL_SECONDS,
    CONCURRENCY_LIMITS: OPERATION_LIMITS.CONCURRENCY_LIMITS,
    RETRY_LIMITS: OPERATION_LIMITS.RETRY_LIMITS,
    MEMORY_LIMITS: OPERATION_LIMITS.MEMORY_LIMITS,
  },

  // 参考数据
  REFERENCE: {
    TEST_TIMESTAMPS: REFERENCE_DATA.TEST_TIMESTAMPS,
    SAMPLE_SYMBOLS: REFERENCE_DATA.SAMPLE_SYMBOLS,
    TEST_ACCOUNTS: REFERENCE_DATA.TEST_ACCOUNTS,
    PROVIDER_IDS: REFERENCE_DATA.PROVIDER_IDS,
    TEST_DATASETS: REFERENCE_DATA.TEST_DATASETS,
    ERROR_SCENARIOS: REFERENCE_DATA.ERROR_SCENARIOS,
  },

  // API操作
  API: {
    STOCK_DATA: API_OPERATIONS.STOCK_DATA,
    INDEX_DATA: API_OPERATIONS.INDEX_DATA,
    DATA_TYPES: API_OPERATIONS.DATA_TYPES,
    MARKET_TYPES: API_OPERATIONS.MARKET_TYPES,
    FETCH_MODES: API_OPERATIONS.FETCH_MODES,
    BUSINESS_SCENARIOS: API_OPERATIONS.BUSINESS_SCENARIOS,
    PRIORITIES: API_OPERATIONS.PRIORITIES,
    CACHE_STRATEGIES: API_OPERATIONS.CACHE_STRATEGIES,
  },
} as const);

/**
 * Domain层工具函数集合
 */
export class DomainUtils {
  /**
   * 获取所有领域工具类
   */
  static getAllUtils() {
    return {
      Market: MarketDomainUtil,
      Alert: AlertDomainUtil,
      RateLimit: RateLimitDomainUtil,
      Monitoring: MonitoringBusinessUtil,
      Operation: OperationLimitsUtil,
      Reference: ReferenceDataUtil,
      Api: ApiOperationsUtil,
    };
  }

  /**
   * 获取领域层统计信息
   */
  static getDomainStats() {
    return {
      marketEnums: Object.keys(Market).length,
      alertEnums: Object.keys(AlertType).length + Object.keys(AlertSeverity).length + 
                  Object.keys(AlertStatus).length + Object.keys(NotificationChannel).length,
      rateLimitEnums: Object.keys(RateLimitStrategy).length + Object.keys(RateLimitTier).length + 
                      Object.keys(RateLimitScope).length,
      totalDomains: 3,
    };
  }

  /**
   * 验证领域配置完整性
   */
  static validateDomainConfig(domain: 'market' | 'alert' | 'rate_limit', config: any): boolean {
    switch (domain) {
      case 'market':
        return this.validateMarketConfig(config);
      case 'alert':
        return this.validateAlertConfig(config);
      case 'rate_limit':
        return this.validateRateLimitConfig(config);
      default:
        return false;
    }
  }

  /**
   * 验证市场配置
   */
  private static validateMarketConfig(config: any): boolean {
    return !!(config && config.market && Object.values(Market).includes(config.market));
  }

  /**
   * 验证告警配置
   */
  private static validateAlertConfig(config: any): boolean {
    return !!(config && config.type && Object.values(AlertType).includes(config.type) &&
              config.severity && Object.values(AlertSeverity).includes(config.severity));
  }

  /**
   * 验证频率限制配置
   */
  private static validateRateLimitConfig(config: any): boolean {
    return !!(config && config.strategy && Object.values(RateLimitStrategy).includes(config.strategy) &&
              config.tier && Object.values(RateLimitTier).includes(config.tier));
  }

  /**
   * 获取跨领域配置建议
   */
  static getCrossDomainRecommendations(context: {
    market?: Market;
    alertSeverity?: AlertSeverity;
    userTier?: RateLimitTier;
  }) {
    const recommendations: any = {};

    // 基于市场的建议
    if (context.market) {
      if (context.market === Market.CRYPTO) {
        recommendations.cache = {
          ttl: MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC / 2, // 加密货币更频繁
        };
        recommendations.rateLimit = {
          tier: RateLimitTier.PREMIUM, // 加密货币需要更高限制
        };
      }
    }

    // 基于告警严重程度的建议
    if (context.alertSeverity) {
      if (context.alertSeverity === AlertSeverity.EMERGENCY || 
          context.alertSeverity === AlertSeverity.CRITICAL) {
        recommendations.rateLimit = {
          bypass: true, // 紧急告警绕过频率限制
        };
        recommendations.notification = {
          channels: AlertDomainUtil.getRecommendedChannels(context.alertSeverity),
        };
      }
    }

    // 基于用户等级的建议
    if (context.userTier) {
      const tierLimits = RateLimitDomainUtil.getTierLimits(context.userTier);
      recommendations.batch = {
        size: Math.min(
          tierLimits.REQUESTS_PER_MINUTE / 10, // 基于每分钟限制调整批量大小
          MARKET_BATCH_CONFIG.STOCK_DATA.QUOTE_BATCH_SIZE
        ),
      };
    }

    return recommendations;
  }
}