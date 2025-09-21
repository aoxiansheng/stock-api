import { Market } from '@core/shared/constants/market.constants';
import { MarketDetectOptions } from '@common/utils/symbol-validation.util';

export interface MarketInferenceCacheOptions {
  /** LRU 缓存最大条目数 */
  max?: number;
  /** 条目 TTL (毫秒) */
  ttl?: number;
}

export interface MarketInferenceMetricsAdapter {
  recordCacheHit(symbol: string, options?: MarketDetectOptions): void;
  recordCacheMiss(symbol: string, inferredMarket: Market, options?: MarketDetectOptions): void;
}
