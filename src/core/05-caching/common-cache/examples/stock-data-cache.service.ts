import { Injectable, Logger } from '@nestjs/common';
import { CommonCacheService } from '../services/common-cache.service';
import { CacheKeyUtils } from '../utils/cache-key.utils';
import { CACHE_CONFIG } from '../constants/cache-config.constants';

/**
 * 股票数据缓存服务示例
 * 展示如何在新功能中使用CommonCacheService的最佳实践
 */
@Injectable()
export class StockDataCacheService {
  private readonly logger = new Logger(StockDataCacheService.name);

  constructor(private readonly commonCache: CommonCacheService) {}

  /**
   * 示例1：获取股票报价数据 - 带回源功能
   * ✅ 推荐：使用getWithFallback进行数据获取
   */
  async getStockQuote(symbol: string, provider: string, market?: string) {
    const key = CacheKeyUtils.generateStockQuoteKey(symbol, provider, market);
    const ttl = CACHE_CONFIG.TTL.DEFAULT_SECONDS; // 1小时

    try {
      // 使用getWithFallback，缓存失效时自动回源
      const result = await this.commonCache.getWithFallback(
        key,
        async () => {
          // 模拟从数据提供商获取数据的回源函数
          this.logger.debug(`Fetching stock quote for ${symbol} from ${provider}`);
          return await this.fetchStockQuoteFromProvider(symbol, provider);
        },
        ttl,
      );

      this.logger.debug(`Stock quote retrieved: symbol=${symbol}, hit=${result.hit}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get stock quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 示例2：批量获取股票数据
   * ✅ 推荐：使用mget进行批量操作
   */
  async getBatchStockQuotes(requests: Array<{ symbol: string; provider: string; market?: string }>) {
    const keys = requests.map(req => 
      CacheKeyUtils.generateStockQuoteKey(req.symbol, req.provider, req.market)
    );

    try {
      // 使用mget批量获取
      const results = await this.commonCache.mget(keys);
      
      // 处理缓存未命中的情况
      const missingData = [];
      const finalResults = new Array(requests.length);

      for (let i = 0; i < requests.length; i++) {
        const result = results[i];
        if (result?.data) {
          finalResults[i] = {
            ...requests[i],
            data: result.data,
            cached: true,
            ttl: result.ttlRemaining,
          };
        } else {
          missingData.push({ index: i, request: requests[i] });
        }
      }

      // 如果有缺失数据，批量获取并设置缓存
      if (missingData.length > 0) {
        await this.fetchAndCacheMissingData(missingData, finalResults);
      }

      this.logger.debug(`Batch stock quotes: total=${requests.length}, cached=${finalResults.length - missingData.length}`);
      return finalResults;
    } catch (error) {
      this.logger.error('Failed to get batch stock quotes:', error);
      throw error;
    }
  }

  /**
   * 示例3：设置市场状态缓存
   * ✅ 推荐：使用set进行数据设置
   */
  async setMarketStatus(market: string, status: any, customTtl?: number) {
    const key = CacheKeyUtils.generateMarketStatusKey(market);
    const ttl = customTtl || CACHE_CONFIG.TTL.DEFAULT_SECONDS;

    try {
      await this.commonCache.set(key, status, ttl);
      this.logger.debug(`Market status cached: market=${market}, ttl=${ttl}s`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cache market status for ${market}:`, error);
      return false;
    }
  }

  /**
   * 示例4：批量设置符号映射缓存
   * ✅ 推荐：使用mset进行批量设置
   */
  async setBatchSymbolMappings(mappings: Array<{ source: string; target: string; data: any }>) {
    const entries = mappings.map(mapping => ({
      key: CacheKeyUtils.generateSymbolMappingKey(mapping.source, mapping.target),
      data: mapping.data,
      ttl: CACHE_CONFIG.TTL.MAX_SECONDS, // 符号映射使用较长的TTL
    }));

    try {
      await this.commonCache.mset(entries);
      this.logger.debug(`Symbol mappings cached: count=${mappings.length}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to cache symbol mappings:', error);
      return false;
    }
  }

  /**
   * 示例5：智能缓存清理
   * ✅ 推荐：使用delete进行精确清理
   */
  async clearStockCache(symbol: string, provider?: string) {
    const keys = [];
    
    if (provider) {
      // 清理特定提供商的缓存
      keys.push(CacheKeyUtils.generateStockQuoteKey(symbol, provider));
    } else {
      // 清理所有提供商的缓存 - 这里简化处理，实际中可能需要模式匹配
      const providers = ['longport', 'itick']; // 实际中从配置获取
      keys.push(...providers.map(p => CacheKeyUtils.generateStockQuoteKey(symbol, p)));
    }

    try {
      const deletePromises = keys.map(key => this.commonCache.delete(key));
      await Promise.all(deletePromises);
      
      this.logger.debug(`Stock cache cleared: symbol=${symbol}, keys=${keys.length}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear stock cache for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * 示例6：健康检查和统计信息
   * ✅ 推荐：使用内置的健康检查和统计功能
   */
  async getCacheHealth() {
    try {
      const [isHealthy, stats] = await Promise.all([
        this.commonCache.isHealthy(),
        this.commonCache.getStats(),
      ]);

      return {
        healthy: isHealthy,
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get cache health:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 私有辅助方法
  private async fetchStockQuoteFromProvider(symbol: string, provider: string) {
    // 模拟数据提供商API调用
    return {
      symbol,
      provider,
      price: Math.random() * 1000,
      timestamp: Date.now(),
      // ... 其他字段
    };
  }

  private async fetchAndCacheMissingData(
    missingData: Array<{ index: number; request: any }>,
    finalResults: any[],
  ) {
    const fetchPromises = missingData.map(async ({ index, request }) => {
      try {
        const data = await this.fetchStockQuoteFromProvider(request.symbol, request.provider);
        const key = CacheKeyUtils.generateStockQuoteKey(request.symbol, request.provider, request.market);
        
        // 异步设置缓存，不等待结果
        this.commonCache.set(key, data, CACHE_CONFIG.TTL.DEFAULT_SECONDS).catch(error => {
          this.logger.warn(`Failed to cache data for ${key}:`, error);
        });

        finalResults[index] = {
          ...request,
          data,
          cached: false,
          ttl: CACHE_CONFIG.TTL.DEFAULT_SECONDS,
        };
      } catch (error) {
        this.logger.error(`Failed to fetch data for ${request.symbol}:`, error);
        finalResults[index] = {
          ...request,
          data: null,
          cached: false,
          error: error.message,
        };
      }
    });

    await Promise.all(fetchPromises);
  }
}