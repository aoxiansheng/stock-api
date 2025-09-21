import { Injectable, Logger, Optional } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import { Market } from '@core/shared/constants/market.constants';
import {
  MarketDetectOptions,
  SymbolValidationUtils,
} from '@common/utils/symbol-validation.util';

import {
  MarketInferenceCacheOptions,
} from '../interfaces/market-inference.interfaces';

import type {
  MarketInferenceMetricsAdapter,
} from '../interfaces/market-inference.interfaces';


@Injectable()
export class MarketInferenceService {
  private readonly logger = new Logger(MarketInferenceService.name);
  private cache?: LRUCache<string, Market>;
  private cacheOptions?: Required<MarketInferenceCacheOptions>;

  constructor(
    @Optional() private readonly metricsAdapter?: MarketInferenceMetricsAdapter,
  ) {}

  configureCache(options?: MarketInferenceCacheOptions): void {
    if (!options) {
      if (this.cache) {
        this.logger.debug('Disabling market inference cache');
        this.cache.clear();
      }
      this.cache = undefined;
      this.cacheOptions = undefined;
      return;
    }

    const normalized: Required<MarketInferenceCacheOptions> = {
      max: options.max ?? 5000,
      ttl: options.ttl ?? 30 * 60 * 1000,
    };

    this.logger.debug('Configuring market inference cache', normalized);
    this.cacheOptions = normalized;
    this.cache = new LRUCache<string, Market>({
      max: normalized.max,
      ttl: normalized.ttl,
      updateAgeOnGet: false,
    });
  }

  inferMarket(symbol: string, options?: MarketDetectOptions): Market {
    const key = this.buildCacheKey(symbol, options);
    const fallback = options?.fallback ?? Market.US;

    if (!symbol) {
      return fallback;
    }

    const cached = this.cache?.get(key);
    if (cached) {
      this.metricsAdapter?.recordCacheHit(symbol, options);
      return cached;
    }

    const inferred =
      SymbolValidationUtils.getMarketFromSymbol(symbol, options) ?? fallback;

    if (this.cache) {
      this.cache.set(key, inferred);
      this.metricsAdapter?.recordCacheMiss(symbol, inferred, options);
    }

    return inferred;
  }

  inferMarkets(symbols: string[], options?: MarketDetectOptions): Market[] {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return [];
    }

    return symbols.map((symbol) => this.inferMarket(symbol, options));
  }

  inferMarketLabel(symbol: string, options?: MarketDetectOptions): string {
    return SymbolValidationUtils.inferMarketLabel(symbol, options);
  }

  inferMarketLabels(symbols: string[], options?: MarketDetectOptions): string[] {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return [];
    }

    return symbols.map((symbol) =>
      SymbolValidationUtils.inferMarketLabel(symbol, options),
    );
  }

  inferDominantMarket(
    symbols: string[],
    options?: MarketDetectOptions,
  ): Market {
    const fallback = options?.fallback ?? Market.US;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return fallback;
    }

    const counts = new Map<Market, number>();

    symbols.forEach((symbol) => {
      const market = this.inferMarket(symbol, options);
      counts.set(market, (counts.get(market) || 0) + 1);
    });

    let dominant = fallback;
    let maxCount = 0;

    counts.forEach((count, market) => {
      if (count > maxCount) {
        maxCount = count;
        dominant = market;
      }
    });

    return dominant;
  }

  clearCache(): void {
    this.cache?.clear();
  }

  getCacheStats(): { enabled: boolean; size: number; options?: typeof this.cacheOptions } {
    return {
      enabled: !!this.cache,
      size: this.cache?.size ?? 0,
      options: this.cacheOptions,
    };
  }

  private buildCacheKey(
    symbol: string,
    options?: MarketDetectOptions,
  ): string {
    const collapseFlag = options?.collapseChina ? '1' : '0';
    const fallback = options?.fallback ?? '';
    return `${symbol.toUpperCase()}|${collapseFlag}|${fallback}`;
  }
}
