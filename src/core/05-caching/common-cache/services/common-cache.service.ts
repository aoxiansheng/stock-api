import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_CONFIG } from '../constants/cache-config.constants';
import { REDIS_SPECIAL_VALUES } from '../constants/cache.constants';
import { RedisValueUtils } from '../utils/redis-value.utils';
import { CacheCompressionService } from './cache-compression.service';
import { 
  ICacheOperation, 
  ICacheFallback, 
  ICacheMetadata 
} from '../interfaces/cache-operation.interface';

/**
 * 通用缓存服务
 * 提供极简的缓存操作接口，失败返回null不抛异常
 */
@Injectable()
export class CommonCacheService implements ICacheOperation, ICacheFallback, ICacheMetadata {
  private readonly logger = new Logger(CommonCacheService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly compressionService: CacheCompressionService,
    @Inject('METRICS_REGISTRY') private readonly metricsRegistry: any
  ) {}

  /**
   * ✅ TTL处理工具方法（单位一致性修正）
   * @param pttlMs Redis pttl返回的毫秒值
   * @returns TTL秒数
   */
  private mapPttlToSeconds(pttlMs: number): number {
    // Redis pttl特殊值处理：
    // -2: key不存在 -> 0s(秒)  
    // -1: key存在但无过期时间 -> 默认365天
    if (pttlMs === REDIS_SPECIAL_VALUES.PTTL_KEY_NOT_EXISTS) return 0;
    if (pttlMs === REDIS_SPECIAL_VALUES.PTTL_NO_EXPIRE) return CACHE_CONFIG.TTL.NO_EXPIRE_DEFAULT; // 31536000s (365天)
    return Math.max(0, Math.floor(pttlMs / 1000)); // ✅ 强制转换毫秒->秒(s)
  }

  /**
   * 记录操作指标
   * @param operation 操作类型
   * @param status 状态
   * @param duration 耗时（毫秒）
   */
  private recordMetrics(operation: string, status: 'success' | 'error', duration?: number): void {
    try {
      if (this.metricsRegistry && typeof this.metricsRegistry.inc === 'function') {
        this.metricsRegistry.inc('cacheOperationsTotal', { op: operation, status });
        
        if (duration !== undefined && typeof this.metricsRegistry.observe === 'function') {
          this.metricsRegistry.observe('cacheQueryDuration', duration / 1000, { op: operation });
        }
      }
    } catch (error) {
      this.logger.debug('Failed to record metrics', error);
    }
  }

  /**
   * 基础缓存获取 - 返回数据和TTL元数据，失败返回null
   * @param key 缓存键
   * @returns 缓存结果或null
   */
  async get<T>(key: string): Promise<{ data: T; ttlRemaining: number } | null> {
    const startTime = Date.now();
    
    try {
      const [value, pttl] = await Promise.all([
        this.redis.get(key),
        this.redis.pttl(key)
      ]);

      if (value === null) {
        this.recordMetrics('get', 'success', Date.now() - startTime);
        return null;
      }

      const parsed = RedisValueUtils.parse<T>(value);
      const ttlRemaining = this.mapPttlToSeconds(pttl);

      this.recordMetrics('get', 'success', Date.now() - startTime);
      
      return {
        data: parsed.data,
        ttlRemaining
      };
    } catch (error) {
      this.logger.debug(`Cache get failed for ${key}`, error);
      this.recordMetrics('get', 'error', Date.now() - startTime);
      return null;
    }
  }

  /**
   * 基础缓存设置
   * @param key 缓存键
   * @param data 数据
   * @param ttl TTL（秒）
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 验证TTL范围
      const validTtl = Math.max(CACHE_CONFIG.TTL.MIN_SECONDS, Math.min(ttl, CACHE_CONFIG.TTL.MAX_SECONDS));
      
      // 检查是否需要压缩
      const shouldCompress = this.compressionService.shouldCompress(data);
      let serializedValue: string;
      
      if (shouldCompress) {
        const compressionResult = await this.compressionService.compress(data);
        serializedValue = RedisValueUtils.serialize(
          compressionResult.compressedData, 
          compressionResult.metadata.compressed,
          compressionResult.metadata
        );
      } else {
        serializedValue = RedisValueUtils.serialize(data, false);
      }

      await this.redis.setex(key, validTtl, serializedValue);
      
      this.recordMetrics('set', 'success', Date.now() - startTime);
      this.logger.debug(`Cache set successful for ${key}, TTL: ${validTtl}s`);
    } catch (error) {
      this.logger.debug(`Cache set failed for ${key}`, error);
      this.recordMetrics('set', 'error', Date.now() - startTime);
      // 不抛异常，静默失败
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   * @returns 是否删除成功
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = await this.redis.del(key);
      const success = result > 0;
      
      this.recordMetrics('delete', 'success', Date.now() - startTime);
      this.logger.debug(`Cache delete ${success ? 'successful' : 'not found'} for ${key}`);
      
      return success;
    } catch (error) {
      this.logger.debug(`Cache delete failed for ${key}`, error);
      this.recordMetrics('delete', 'error', Date.now() - startTime);
      return false;
    }
  }

  /**
   * ✅ 修正示例：批量获取，保持结果顺序与输入一致
   * @param keys 缓存键数组
   * @returns 缓存结果数组
   */
  async mget<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number } | null>> {
    const startTime = Date.now();
    
    try {
      if (keys.length === 0) {
        return [];
      }

      // 验证批量大小限制
      if (keys.length > CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) {
        throw new Error(`Batch size ${keys.length} exceeds limit ${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}`);
      }

      const [values, ttlResults] = await Promise.all([
        this.redis.mget(keys),
        Promise.all(keys.map(key => this.redis.pttl(key)))
      ]);

      const results = values.map((value, index) => {
        if (value === null) return null;
        
        try {
          const parsed = RedisValueUtils.parse<T>(value);
          return {
            data: parsed.data,
            ttlRemaining: this.mapPttlToSeconds(ttlResults[index])
          };
        } catch (error) {
          this.logger.debug(`Failed to parse cached value for ${keys[index]}`, error);
          return null;
        }
      });

      this.recordMetrics('mget', 'success', Date.now() - startTime);
      
      return results;
    } catch (error) {
      this.logger.debug(`Cache mget failed for ${keys.length} keys`, error);
      this.recordMetrics('mget', 'error', Date.now() - startTime);
      return keys.map(() => null);
    }
  }

  /**
   * 增强版批量获取 - 支持智能缓存批量操作迁移 (Phase 4.1.2)
   * @param requests 批量请求配置数组
   * @returns 批量操作结果
   */
  async mgetEnhanced<T>(
    requests: Array<{
      key: string;
      fetchFn?: () => Promise<T>;
      ttl?: number;
      options?: {
        useCache?: boolean;
        maxAge?: number;
        includeMetadata?: boolean;
      };
    }>
  ): Promise<Array<{
    key: string;
    data: T | null;
    hit: boolean;
    ttlRemaining?: number;
    source: 'cache' | 'fetch' | 'error';
    metadata?: {
      storedAt?: number;
      fetchTime?: number;
      error?: string;
    };
  }>> {
    const startTime = Date.now();
    
    try {
      if (requests.length === 0) {
        return [];
      }

      // 验证批量大小限制
      if (requests.length > CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) {
        throw new Error(`Batch size ${requests.length} exceeds limit ${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}`);
      }

      const keys = requests.map(req => req.key);
      
      // 批量获取缓存数据
      const cacheResults = await this.mget<T>(keys);
      
      // 处理每个请求
      const results = await Promise.allSettled(
        requests.map(async (request, index) => {
          const cacheResult = cacheResults[index];
          const { key, fetchFn, ttl = 300, options = {} } = request;
          
          // 如果缓存命中且满足条件
          if (cacheResult !== null && options.useCache !== false) {
            // 检查maxAge条件
            if (options.maxAge && cacheResult.ttlRemaining < options.maxAge) {
              // TTL不足，需要重新获取
              if (fetchFn) {
                try {
                  const fetchStart = Date.now();
                  const freshData = await fetchFn();
                  const fetchTime = Date.now() - fetchStart;
                  
                  // 异步更新缓存
                  this.set(key, freshData, ttl).catch(err => {
                    this.logger.debug(`Failed to update cache for ${key}`, err);
                  });
                  
                  return {
                    key,
                    data: freshData,
                    hit: false,
                    ttlRemaining: ttl,
                    source: 'fetch' as const,
                    metadata: options.includeMetadata ? {
                      fetchTime,
                      storedAt: Date.now()
                    } : undefined
                  };
                } catch (fetchError) {
                  // 获取失败，返回缓存数据（降级策略）
                  return {
                    key,
                    data: cacheResult.data,
                    hit: true,
                    ttlRemaining: cacheResult.ttlRemaining,
                    source: 'cache' as const,
                    metadata: options.includeMetadata ? {
                      error: `Fetch failed, using stale cache: ${fetchError.message}`
                    } : undefined
                  };
                }
              } else {
                // 没有fetchFn，返回过期的缓存数据
                return {
                  key,
                  data: cacheResult.data,
                  hit: true,
                  ttlRemaining: cacheResult.ttlRemaining,
                  source: 'cache' as const,
                  metadata: options.includeMetadata ? {
                    error: 'Cache data may be stale (no fetch function provided)'
                  } : undefined
                };
              }
            } else {
              // 缓存有效，直接返回
              return {
                key,
                data: cacheResult.data,
                hit: true,
                ttlRemaining: cacheResult.ttlRemaining,
                source: 'cache' as const,
                metadata: options.includeMetadata ? {
                  storedAt: Date.now() - (ttl - cacheResult.ttlRemaining) * 1000
                } : undefined
              };
            }
          } else {
            // 缓存未命中，需要获取数据
            if (fetchFn) {
              try {
                const fetchStart = Date.now();
                const freshData = await fetchFn();
                const fetchTime = Date.now() - fetchStart;
                
                // 异步存储到缓存
                this.set(key, freshData, ttl).catch(err => {
                  this.logger.debug(`Failed to store cache for ${key}`, err);
                });
                
                return {
                  key,
                  data: freshData,
                  hit: false,
                  ttlRemaining: ttl,
                  source: 'fetch' as const,
                  metadata: options.includeMetadata ? {
                    fetchTime,
                    storedAt: Date.now()
                  } : undefined
                };
              } catch (fetchError) {
                return {
                  key,
                  data: null,
                  hit: false,
                  ttlRemaining: 0,
                  source: 'error' as const,
                  metadata: options.includeMetadata ? {
                    error: fetchError.message
                  } : undefined
                };
              }
            } else {
              // 没有fetchFn，返回null
              return {
                key,
                data: null,
                hit: false,
                ttlRemaining: 0,
                source: 'cache' as const,
                metadata: options.includeMetadata ? {
                  error: 'Cache miss and no fetch function provided'
                } : undefined
              };
            }
          }
        })
      );

      // 处理Promise.allSettled结果
      const finalResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          this.logger.error(`Enhanced mget failed for key ${requests[index].key}`, result.reason);
          return {
            key: requests[index].key,
            data: null,
            hit: false,
            ttlRemaining: 0,
            source: 'error' as const,
            metadata: requests[index].options?.includeMetadata ? {
              error: result.reason.message
            } : undefined
          };
        }
      });

      this.recordMetrics('mget_enhanced', 'success', Date.now() - startTime);
      
      return finalResults;
    } catch (error) {
      this.logger.debug(`Enhanced mget failed for ${requests.length} requests`, error);
      this.recordMetrics('mget_enhanced', 'error', Date.now() - startTime);
      
      // 返回错误结果
      return requests.map(req => ({
        key: req.key,
        data: null,
        hit: false,
        ttlRemaining: 0,
        source: 'error' as const,
        metadata: req.options?.includeMetadata ? {
          error: error.message
        } : undefined
      }));
    }
  }

  /**
   * 批量设置缓存，使用pipeline优化
   * @param entries 缓存条目数组
   */
  async mset<T>(entries: Array<{ key: string; data: T; ttl: number }>): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (entries.length === 0) {
        return;
      }

      // 验证批量大小限制
      if (entries.length > CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) {
        throw new Error(`Batch size ${entries.length} exceeds limit ${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}`);
      }

      // 分段处理大批量操作
      const pipelineMaxSize = CACHE_CONFIG.BATCH_LIMITS.PIPELINE_MAX_SIZE;
      
      for (let i = 0; i < entries.length; i += pipelineMaxSize) {
        const chunk = entries.slice(i, i + pipelineMaxSize);
        
        const pipeline = this.redis.pipeline();
        
        for (const { key, data, ttl } of chunk) {
          const validTtl = Math.max(CACHE_CONFIG.TTL.MIN_SECONDS, Math.min(ttl, CACHE_CONFIG.TTL.MAX_SECONDS));
          
          // 简化版本：暂不在批量操作中进行压缩，避免复杂度
          const serialized = RedisValueUtils.serialize(data, false);
          pipeline.setex(key, validTtl, serialized);
        }
        
        const results = await pipeline.exec();
        
        // ✅ 修正：Pipeline结果逐条检查，部分失败是正常情况
        const failures = results?.filter(([err]) => err !== null) || [];
        if (failures.length > 0) {
          this.logger.warn(`Batch set partial failure: ${failures.length}/${chunk.length} failed in chunk ${Math.floor(i/pipelineMaxSize)+1}`);
          
          // 只有全部失败时才抛异常
          if (failures.length === chunk.length) {
            throw new Error(`Batch set complete failure in chunk ${Math.floor(i/pipelineMaxSize)+1}`);
          }
        }
      }

      this.recordMetrics('mset', 'success', Date.now() - startTime);
      this.logger.debug(`Cache mset successful for ${entries.length} entries`);
    } catch (error) {
      this.logger.debug(`Cache mset failed for ${entries.length} entries`, error);
      this.recordMetrics('mset', 'error', Date.now() - startTime);
      // 不抛异常，静默失败
    }
  }

  /**
   * 增强版批量设置 - 支持智能缓存批量操作迁移 (Phase 4.1.2)
   * @param entries 增强批量设置条目数组
   * @returns 批量设置结果统计
   */
  async msetEnhanced<T>(
    entries: Array<{
      key: string;
      data: T;
      ttl?: number;
      options?: {
        compression?: boolean;
        skipIfExists?: boolean;
        onlyIfExists?: boolean;
        includeMetadata?: boolean;
      };
    }>
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    details: Array<{
      key: string;
      status: 'success' | 'failed' | 'skipped';
      reason?: string;
    }>;
  }> {
    const startTime = Date.now();
    
    try {
      if (entries.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          details: []
        };
      }

      // 验证批量大小限制
      if (entries.length > CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) {
        throw new Error(`Batch size ${entries.length} exceeds limit ${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}`);
      }

      let successful = 0;
      let failed = 0;
      let skipped = 0;
      const details: Array<{
        key: string;
        status: 'success' | 'failed' | 'skipped';
        reason?: string;
      }> = [];

      // 处理条件性设置（需要先检查键是否存在）
      const conditionalEntries = entries.filter(entry => 
        entry.options?.skipIfExists || entry.options?.onlyIfExists
      );
      
      let existingKeys: Set<string> = new Set();
      if (conditionalEntries.length > 0) {
        const checkKeys = conditionalEntries.map(e => e.key);
        const existsResults = await Promise.all(
          checkKeys.map(key => this.redis.exists(key))
        );
        existingKeys = new Set(
          checkKeys.filter((key, index) => existsResults[index] === 1)
        );
      }

      // 分段处理大批量操作
      const pipelineMaxSize = CACHE_CONFIG.BATCH_LIMITS.PIPELINE_MAX_SIZE;
      
      for (let i = 0; i < entries.length; i += pipelineMaxSize) {
        const chunk = entries.slice(i, i + pipelineMaxSize);
        
        const pipeline = this.redis.pipeline();
        const chunkOps: Array<{
          index: number;
          entry: typeof entries[0];
          willExecute: boolean;
          skipReason?: string;
        }> = [];

        for (let j = 0; j < chunk.length; j++) {
          const entry = chunk[j];
          const globalIndex = i + j;
          const { key, data, ttl = 300, options = {} } = entry;
          
          // 检查条件性设置
          let willExecute = true;
          let skipReason = '';

          if (options.skipIfExists && existingKeys.has(key)) {
            willExecute = false;
            skipReason = 'Key already exists (skipIfExists=true)';
          } else if (options.onlyIfExists && !existingKeys.has(key)) {
            willExecute = false;
            skipReason = 'Key does not exist (onlyIfExists=true)';
          }

          chunkOps.push({
            index: globalIndex,
            entry,
            willExecute,
            skipReason
          });

          if (willExecute) {
            try {
              const validTtl = Math.max(CACHE_CONFIG.TTL.MIN_SECONDS, Math.min(ttl, CACHE_CONFIG.TTL.MAX_SECONDS));
              
              // 根据options决定是否压缩
              let serializedValue: string;
              if (options.compression && this.compressionService.shouldCompress(data)) {
                const compressionResult = await this.compressionService.compress(data);
                serializedValue = RedisValueUtils.serialize(
                  compressionResult.compressedData,
                  compressionResult.metadata.compressed,
                  compressionResult.metadata
                );
              } else {
                serializedValue = RedisValueUtils.serialize(data, false, options.includeMetadata ? {
                  storedAt: Date.now()
                } : undefined);
              }

              pipeline.setex(key, validTtl, serializedValue);
            } catch (error) {
              // 序列化错误，标记为失败
              chunkOps[j].willExecute = false;
              chunkOps[j].skipReason = `Serialization failed: ${error.message}`;
            }
          }
        }
        
        // 执行pipeline
        const results = await pipeline.exec();
        let resultIndex = 0;

        // 处理结果
        for (const op of chunkOps) {
          if (!op.willExecute) {
            skipped++;
            details.push({
              key: op.entry.key,
              status: 'skipped',
              reason: op.skipReason
            });
          } else {
            const result = results?.[resultIndex];
            resultIndex++;

            if (result && result[0] === null) {
              // 成功
              successful++;
              details.push({
                key: op.entry.key,
                status: 'success'
              });
            } else {
              // 失败
              failed++;
              details.push({
                key: op.entry.key,
                status: 'failed',
                reason: result?.[0]?.message || 'Unknown Redis error'
              });
            }
          }
        }
      }

      this.recordMetrics('mset_enhanced', 'success', Date.now() - startTime);
      this.logger.debug(`Enhanced mset completed`, {
        total: entries.length,
        successful,
        failed,
        skipped,
        processingTime: Date.now() - startTime
      });

      return {
        total: entries.length,
        successful,
        failed,
        skipped,
        details
      };
    } catch (error) {
      this.logger.debug(`Enhanced mset failed for ${entries.length} entries`, error);
      this.recordMetrics('mset_enhanced', 'error', Date.now() - startTime);
      
      // 返回全部失败的结果
      return {
        total: entries.length,
        successful: 0,
        failed: entries.length,
        skipped: 0,
        details: entries.map(entry => ({
          key: entry.key,
          status: 'failed' as const,
          reason: error.message
        }))
      };
    }
  }

  /**
   * 带元数据的批量获取 - 支持Orchestrator批量判断后台更新
   * @param keys 缓存键数组
   * @returns 带元数据的缓存结果数组
   */
  async mgetWithMetadata<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number; storedAt: number } | null>> {
    const startTime = Date.now();
    
    try {
      if (keys.length === 0) {
        return [];
      }

      const [values, ttlResults] = await Promise.all([
        this.redis.mget(keys),
        Promise.all(keys.map(key => this.redis.pttl(key)))
      ]);

      const results = values.map((value, index) => {
        if (value === null) return null;
        
        try {
          const parsed = RedisValueUtils.parse<T>(value);
          return {
            data: parsed.data,
            ttlRemaining: this.mapPttlToSeconds(ttlResults[index]),
            storedAt: parsed.storedAt || Date.now()
          };
        } catch (error) {
          this.logger.debug(`Failed to parse cached value with metadata for ${keys[index]}`, error);
          return null;
        }
      });

      this.recordMetrics('mget_metadata', 'success', Date.now() - startTime);
      
      return results;
    } catch (error) {
      this.logger.debug(`Cache mget with metadata failed for ${keys.length} keys`, error);
      this.recordMetrics('mget_metadata', 'error', Date.now() - startTime);
      return keys.map(() => null);
    }
  }

  /**
   * 带回源的缓存获取 - 返回命中状态和TTL信息
   * @param key 缓存键
   * @param fetchFn 回源函数
   * @param ttl TTL（秒）
   * @returns 缓存结果
   */
  async getWithFallback<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<{ data: T; hit: boolean; ttlRemaining?: number }> {
    const startTime = Date.now();
    
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        this.logger.debug(`Cache hit for ${key}, TTL remaining: ${cached.ttlRemaining}s`);
        return { 
          data: cached.data, 
          hit: true, 
          ttlRemaining: cached.ttlRemaining 
        };
      }
    } catch (error) {
      this.logger.debug(`Cache get failed for ${key}, will fetch fresh data`, error);
      this.recordMetrics('get', 'error');
    }
    
    // 缓存未命中，执行回源
    try {
      const data = await fetchFn();
      
      // 异步写入缓存，不阻塞响应
      this.set(key, data, ttl).catch(err => {
        this.logger.debug(`Cache set failed for ${key}`, err);
      });
      
      this.logger.debug(`Cache miss for ${key}, fetched fresh data`);
      this.recordMetrics('fallback', 'success', Date.now() - startTime);
      
      return { data, hit: false };
    } catch (fetchError) {
      this.recordMetrics('fallback', 'error', Date.now() - startTime);
      throw fetchError;
    }
  }

  /**
   * 静态方法：缓存键生成器（在调用端构建显式cacheKey）
   * @param prefix 前缀
   * @param parts 键组成部分
   * @returns 完整缓存键
   */
  static generateCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.filter(Boolean).join(':')}`;
  }

  /**
   * 静态方法：智能TTL计算器 - 支持智能缓存TTL计算迁移 (Phase 4.1.3)
   * @param context TTL计算上下文
   * @returns 优化的TTL值（秒）
   */
  static calculateOptimalTTL(context: {
    symbol: string;
    dataType: string;
    marketStatus?: {
      isOpen: boolean;
      timezone: string;
      nextStateChange?: Date;
    };
    freshnessRequirement?: 'realtime' | 'analytical' | 'archive';
    customMultipliers?: {
      market?: number;
      dataType?: number;
      freshness?: number;
    };
  }): {
    ttl: number;
    strategy: 'market_aware' | 'data_type_based' | 'freshness_optimized' | 'default_fallback';
    details: {
      baseTTL: number;
      marketMultiplier: number;
      dataTypeMultiplier: number;
      freshnessMultiplier: number;
      finalTTL: number;
      reasoning: string;
    };
  } {
    const { symbol, dataType, marketStatus, freshnessRequirement, customMultipliers } = context;
    
    // 基础TTL映射（基于数据类型）
    let baseTTL: number = CACHE_CONFIG.TTL.DEFAULT_SECONDS; // 默认1小时
    let strategy: 'market_aware' | 'data_type_based' | 'freshness_optimized' | 'default_fallback' = 'default_fallback';
    
    // 1. 数据类型影响因子
    let dataTypeMultiplier = 1.0;
    switch (dataType) {
      case 'stock-quote':
      case 'realtime':
      case 'get-stock-quote':
        baseTTL = CACHE_CONFIG.TTL.MARKET_OPEN_SECONDS; // 300s (5分钟)
        dataTypeMultiplier = 1.0;
        strategy = 'data_type_based';
        break;
      case 'historical':
      case 'analytical':
      case 'get-historical-data':
        baseTTL = CACHE_CONFIG.TTL.MARKET_CLOSED_SECONDS; // 3600s (1小时)
        dataTypeMultiplier = 1.0;
        strategy = 'data_type_based';
        break;
      case 'static':
      case 'company-info':
      case 'get-company-info':
        baseTTL = CACHE_CONFIG.TTL.MAX_SECONDS; // 24小时
        dataTypeMultiplier = 1.0;
        strategy = 'data_type_based';
        break;
      default:
        baseTTL = CACHE_CONFIG.TTL.DEFAULT_SECONDS; // 1小时
        strategy = 'default_fallback';
    }
    
    // 2. 市场状态影响因子
    let marketMultiplier = 1.0;
    if (marketStatus && strategy !== 'default_fallback') {
      if (marketStatus.isOpen) {
        // 开市时：实时数据需要更频繁刷新
        marketMultiplier = 0.5;
        strategy = 'market_aware';
      } else {
        // 闭市时：数据变化少，可以延长TTL
        marketMultiplier = 2.0;
        strategy = 'market_aware';
        
        // 如果知道下次开市时间，可以更智能地设置TTL
        if (marketStatus.nextStateChange) {
          const timeToOpen = marketStatus.nextStateChange.getTime() - Date.now();
          const hoursToOpen = timeToOpen / (1000 * 60 * 60);
          
          // 如果离开市还有很久，进一步延长TTL（但不超过最大值）
          if (hoursToOpen > 8) {
            marketMultiplier = Math.min(4.0, marketMultiplier * 2);
          }
        }
      }
    }
    
    // 3. 新鲜度要求影响因子
    let freshnessMultiplier = 1.0;
    if (freshnessRequirement && strategy !== 'default_fallback') {
      switch (freshnessRequirement) {
        case 'realtime':
          freshnessMultiplier = 0.3; // 极短TTL
          strategy = 'freshness_optimized';
          break;
        case 'analytical':
          freshnessMultiplier = 1.5; // 稍长TTL
          strategy = 'freshness_optimized';
          break;
        case 'archive':
          freshnessMultiplier = 3.0; // 很长TTL
          strategy = 'freshness_optimized';
          break;
      }
    }
    
    // 4. 应用自定义倍数（如果提供）
    if (customMultipliers) {
      if (customMultipliers.market !== undefined) {
        marketMultiplier = customMultipliers.market;
      }
      if (customMultipliers.dataType !== undefined) {
        dataTypeMultiplier = customMultipliers.dataType;
      }
      if (customMultipliers.freshness !== undefined) {
        freshnessMultiplier = customMultipliers.freshness;
      }
    }
    
    // 5. 计算最终TTL
    const calculatedTTL = baseTTL * marketMultiplier * dataTypeMultiplier * freshnessMultiplier;
    
    // 6. 应用边界限制
    const finalTTL = Math.round(
      Math.max(
        CACHE_CONFIG.TTL.MIN_SECONDS,
        Math.min(calculatedTTL, CACHE_CONFIG.TTL.MAX_SECONDS)
      )
    );
    
    // 7. 生成推理说明
    const factors = [];
    if (marketStatus) {
      factors.push(`市场${marketStatus.isOpen ? '开放' : '关闭'}`);
    }
    if (freshnessRequirement) {
      factors.push(`${freshnessRequirement}需求`);
    }
    factors.push(`${dataType}数据类型`);
    
    const reasoning = `基于${factors.join('、')}计算的优化TTL`;
    
    return {
      ttl: finalTTL,
      strategy,
      details: {
        baseTTL,
        marketMultiplier,
        dataTypeMultiplier,
        freshnessMultiplier,
        finalTTL,
        reasoning
      }
    };
  }

  /**
   * 检查Redis连接状态
   * @returns 连接是否正常
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 统计数据
   */
  async getStats(): Promise<{
    connected: boolean;
    usedMemory: string;
    totalKeys: number;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      
      // 简单解析内存使用信息
      const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';
      
      return {
        connected: true,
        usedMemory,
        totalKeys: dbsize,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error);
      return {
        connected: false,
        usedMemory: 'unknown',
        totalKeys: 0,
      };
    }
  }
}