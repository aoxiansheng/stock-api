import { Injectable, Logger } from '@nestjs/common';
import { CommonCacheService } from '../services/common-cache.service';
import { CacheKeyUtils } from '../utils/cache-key.utils';
import { CACHE_CONFIG } from '../constants/cache-config.constants';

/**
 * 查询缓存服务示例
 * 展示如何在Query模块中使用CommonCacheService替代原有的智能缓存逻辑
 */
@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);

  constructor(private readonly commonCache: CommonCacheService) {}

  /**
   * 示例1：替代原有的getWithSmartCache方法
   * ✅ 新方法：使用CommonCacheService.getWithFallback
   * ❌ 旧方法：StorageService.getWithSmartCache (已标记@deprecated)
   */
  async getQueryResult<T>(
    queryKey: string,
    dataFetcher: () => Promise<T>,
    options: {
      ttl?: number;
      enableCache?: boolean;
      forceRefresh?: boolean;
    } = {},
  ) {
    const {
      ttl = CACHE_CONFIG.TTL.DEFAULT_SECONDS,
      enableCache = true,
      forceRefresh = false,
    } = options;

    // 如果禁用缓存或强制刷新，直接调用数据获取器
    if (!enableCache || forceRefresh) {
      this.logger.debug(`Cache bypassed for query: ${queryKey}`);
      const data = await dataFetcher();
      
      // 即使跳过缓存读取，也可以异步更新缓存
      if (enableCache) {
        this.commonCache.set(queryKey, data, ttl).catch(error => {
          this.logger.warn(`Failed to update cache for ${queryKey}:`, error);
        });
      }
      
      return { data, hit: false, ttlRemaining: ttl };
    }

    // 使用CommonCacheService的getWithFallback方法
    try {
      const result = await this.commonCache.getWithFallback(queryKey, dataFetcher, ttl);
      
      this.logger.debug(`Query result retrieved: key=${queryKey}, hit=${result.hit}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get query result for ${queryKey}:`, error);
      throw error;
    }
  }

  /**
   * 示例2：替代原有的batchGetWithSmartCache方法
   * ✅ 新方法：使用CommonCacheService.mget + 批量回源
   * ❌ 旧方法：StorageService.batchGetWithSmartCache (已标记@deprecated)
   */
  async getBatchQueryResults<T>(
    queries: Array<{
      key: string;
      fetcher: () => Promise<T>;
      ttl?: number;
    }>,
    options: {
      enableCache?: boolean;
      concurrency?: number;
    } = {},
  ) {
    const { enableCache = true, concurrency = 5 } = options;

    if (!enableCache) {
      // 如果禁用缓存，直接并发执行所有查询
      const results = await this.executeConcurrentQueries(queries, concurrency);
      return results.map(data => ({ data, hit: false, ttlRemaining: 0 }));
    }

    try {
      const keys = queries.map(q => q.key);
      
      // 1. 批量从缓存获取
      const cacheResults = await this.commonCache.mget<T>(keys);
      
      // 2. 识别缓存未命中的查询
      const missedQueries = [];
      const finalResults = new Array(queries.length);

      for (let i = 0; i < queries.length; i++) {
        const cacheResult = cacheResults[i];
        if (cacheResult?.data) {
          finalResults[i] = cacheResult;
        } else {
          missedQueries.push({ index: i, query: queries[i] });
        }
      }

      this.logger.debug(
        `Batch query cache stats: total=${queries.length}, hit=${queries.length - missedQueries.length}, miss=${missedQueries.length}`,
      );

      // 3. 并发执行缓存未命中的查询
      if (missedQueries.length > 0) {
        await this.handleMissedQueries(missedQueries, finalResults, concurrency);
      }

      return finalResults;
    } catch (error) {
      this.logger.error('Failed to get batch query results:', error);
      throw error;
    }
  }

  /**
   * 示例3：智能TTL计算和动态缓存策略
   * ✅ 新方法：基于数据特征和访问模式的智能TTL
   * ❌ 旧方法：StorageService.calculateDynamicTTL (已标记@deprecated)
   */
  async setQueryResultWithSmartTTL<T>(
    queryKey: string,
    data: T,
    options: {
      dataSize?: number;
      accessFrequency?: 'high' | 'medium' | 'low';
      dataType?: 'stock_quote' | 'market_status' | 'symbol_mapping' | 'other';
      lastUpdated?: Date;
    } = {},
  ) {
    const { dataSize = 0, accessFrequency = 'medium', dataType = 'other', lastUpdated } = options;

    // 智能TTL计算逻辑
    let ttl: number = CACHE_CONFIG.TTL.DEFAULT_SECONDS;

    // 根据数据类型调整TTL
    switch (dataType) {
      case 'stock_quote':
        ttl = 300; // 5分钟，股票报价变化频繁
        break;
      case 'market_status':
        ttl = 1800; // 30分钟，市场状态相对稳定
        break;
      case 'symbol_mapping':
        ttl = CACHE_CONFIG.TTL.MAX_SECONDS; // 24小时，符号映射很少变化
        break;
      default:
        ttl = CACHE_CONFIG.TTL.DEFAULT_SECONDS; // 1小时默认
    }

    // 根据访问频率调整TTL
    switch (accessFrequency) {
      case 'high':
        ttl = Math.min(ttl * 1.5, CACHE_CONFIG.TTL.MAX_SECONDS); // 增加50%
        break;
      case 'low':
        ttl = Math.max(ttl * 0.5, CACHE_CONFIG.TTL.MIN_SECONDS); // 减少50%
        break;
      case 'medium':
      default:
        // 保持原值
        break;
    }

    // 根据数据大小调整TTL（大数据较短TTL以减少内存占用）
    if (dataSize > 10240) { // 10KB
      ttl = Math.max(ttl * 0.8, CACHE_CONFIG.TTL.MIN_SECONDS);
    }

    // 根据数据新鲜度调整TTL
    if (lastUpdated) {
      const ageMinutes = (Date.now() - lastUpdated.getTime()) / (1000 * 60);
      if (ageMinutes > 30) { // 数据超过30分钟，缩短TTL
        ttl = Math.max(ttl * 0.7, CACHE_CONFIG.TTL.MIN_SECONDS);
      }
    }

    try {
      await this.commonCache.set(queryKey, data, ttl);
      
      this.logger.debug(
        `Smart cache set: key=${queryKey}, ttl=${ttl}s, type=${dataType}, freq=${accessFrequency}`,
      );
      
      return { success: true, ttl };
    } catch (error) {
      this.logger.error(`Failed to set smart cache for ${queryKey}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 示例4：查询结果预热
   * ✅ 新方法：主动预热热点查询数据
   */
  async warmupQueryCache(
    hotQueries: Array<{
      key: string;
      fetcher: () => Promise<any>;
      ttl?: number;
      priority?: number;
    }>,
  ) {
    // 按优先级排序
    const sortedQueries = hotQueries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    const warmupResults = [];
    
    for (const query of sortedQueries) {
      try {
        const startTime = Date.now();
        const ttl = query.ttl || CACHE_CONFIG.TTL.DEFAULT_SECONDS;
        
        // 检查是否已存在缓存
        const existing = await this.commonCache.get(query.key);
        if (existing?.data) {
          this.logger.debug(`Skipping warmup for cached key: ${query.key}`);
          continue;
        }

        // 获取数据并设置缓存
        const data = await query.fetcher();
        await this.commonCache.set(query.key, data, ttl);
        
        const duration = Date.now() - startTime;
        warmupResults.push({
          key: query.key,
          success: true,
          duration,
          ttl,
        });
        
        this.logger.debug(`Query cache warmed up: ${query.key} (${duration}ms)`);
      } catch (error) {
        warmupResults.push({
          key: query.key,
          success: false,
          error: error.message,
        });
        
        this.logger.warn(`Failed to warmup cache for ${query.key}:`, error);
      }
    }
    
    const successCount = warmupResults.filter(r => r.success).length;
    this.logger.log(`Cache warmup completed: ${successCount}/${hotQueries.length} successful`);
    
    return warmupResults;
  }

  /**
   * 示例5：查询缓存分析和优化建议
   * ✅ 新方法：提供缓存使用分析和优化建议
   */
  async analyzeCacheUsage(queryKeys: string[]) {
    try {
      const analysis = {
        totalKeys: queryKeys.length,
        cached: 0,
        expired: 0,
        avgTtl: 0,
        recommendations: [],
      };

      const cacheResults = await this.commonCache.mget(queryKeys);
      let totalTtl = 0;

      for (let i = 0; i < queryKeys.length; i++) {
        const result = cacheResults[i];
        if (result?.data) {
          analysis.cached++;
          totalTtl += result.ttlRemaining;
        } else {
          analysis.expired++;
        }
      }

      if (analysis.cached > 0) {
        analysis.avgTtl = Math.round(totalTtl / analysis.cached);
      }

      // 生成优化建议
      const hitRate = analysis.cached / analysis.totalKeys;
      if (hitRate < 0.7) {
        analysis.recommendations.push('命中率较低，建议增加TTL或预热热点查询');
      }
      
      if (analysis.avgTtl < 60) {
        analysis.recommendations.push('平均TTL较短，可能导致频繁回源');
      }
      
      if (analysis.avgTtl > 3600) {
        analysis.recommendations.push('平均TTL较长，注意数据新鲜度');
      }

      this.logger.debug(`Cache analysis: hit=${hitRate.toFixed(2)}, avgTtl=${analysis.avgTtl}s`);
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze cache usage:', error);
      throw error;
    }
  }

  // 私有辅助方法
  private async executeConcurrentQueries<T>(
    queries: Array<{ fetcher: () => Promise<T> }>,
    concurrency: number,
  ): Promise<T[]> {
    const results = new Array(queries.length);
    
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      const batchPromises = batch.map(async (query, batchIndex) => {
        try {
          return await query.fetcher();
        } catch (error) {
          this.logger.error(`Query failed in batch ${i + batchIndex}:`, error);
          throw error;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result, batchIndex) => {
        results[i + batchIndex] = result;
      });
    }
    
    return results;
  }

  private async handleMissedQueries<T>(
    missedQueries: Array<{ index: number; query: any }>,
    finalResults: any[],
    concurrency: number,
  ) {
    // 控制并发数量避免过载
    for (let i = 0; i < missedQueries.length; i += concurrency) {
      const batch = missedQueries.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async ({ index, query }) => {
        try {
          const data = await query.fetcher();
          const ttl = query.ttl || CACHE_CONFIG.TTL.DEFAULT_SECONDS;
          
          // 异步设置缓存
          this.commonCache.set(query.key, data, ttl).catch(error => {
            this.logger.warn(`Failed to cache query result for ${query.key}:`, error);
          });
          
          finalResults[index] = { data, hit: false, ttlRemaining: ttl };
        } catch (error) {
          this.logger.error(`Failed to fetch data for query ${query.key}:`, error);
          finalResults[index] = { data: null, hit: false, ttlRemaining: 0, error: error.message };
        }
      });
      
      await Promise.all(batchPromises);
    }
  }
}