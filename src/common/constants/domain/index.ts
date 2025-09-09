/**
 * Domain层统一导出
 * 🏢 领域层 - 业务领域专用常量
 * 🎯 基于Semantic层构建，专注于具体业务领域逻辑
 */

// 导出市场常量（已迁移到 core/shared/constants）
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
} from '../../../core/shared/constants/market.constants';
export type {
  TradingSession,
  MarketTradingHours
} from '../../../core/shared/constants/market.constants';

export {
  OPERATION_LIMITS,
  OperationLimitsUtil
} from './operation-limits.constants';
export type {
  OperationType,
  DataVolume as OperationDataVolume,
  CacheDataType
} from './operation-limits.constants';

export {
  REFERENCE_DATA,
  ReferenceDataUtil
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
  ApiCacheStrategy
} from './api-operations.constants';

// 导出类型定义
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
} from '../../../core/shared/constants/market.constants';

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
  },

  // 操作限制
  OPERATION: {
    BATCH_SIZES: OPERATION_LIMITS.BATCH_SIZES,
  },

  // 参考数据
  REFERENCE: {
    SAMPLE_SYMBOLS: REFERENCE_DATA.SAMPLE_SYMBOLS,
    PROVIDER_IDS: REFERENCE_DATA.PROVIDER_IDS,
  },

  // API操作
  API: {
    BUSINESS_SCENARIOS: API_OPERATIONS.BUSINESS_SCENARIOS,
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
      totalDomains: 3,
    };
  }

  /**
   * 验证领域配置完整性
   */
  static validateDomainConfig(domain: 'market', config: any): boolean {
    switch (domain) {
      case 'market':
        return this.validateMarketConfig(config);
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
   * 获取跨领域配置建议
   */
  static getCrossDomainRecommendations(context: {
    market?: Market;
  }) {
    const recommendations: any = {};

    // 基于市场的建议
    if (context.market) {
      if (context.market === Market.CRYPTO) {
        recommendations.cache = {
          ttl: MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC / 2, // 加密货币更频繁
        };
      }
    }

    return recommendations;
  }
}