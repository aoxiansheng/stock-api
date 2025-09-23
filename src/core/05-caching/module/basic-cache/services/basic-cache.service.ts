import { Injectable, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import { CACHE_CONFIG } from "../constants/cache-config.constants";
import { REDIS_SPECIAL_VALUES } from "../constants/cache.constants";
import { RedisValueUtils } from "../utils/redis-value.utils";
import { CacheCompressionService } from "./cache-compression.service";
import { createLogger } from "@common/logging/index";
import { CacheMetadata } from "../interfaces/cache-metadata.interface";
import { CACHE_REDIS_CLIENT_TOKEN } from "../../../../../monitoring/contracts";
import { SYSTEM_STATUS_EVENTS } from "../../../../../monitoring/contracts/events/system-status.events";

/**
 * 解压操作并发控制工具
 * 防止高并发下CPU峰值，控制同时进行的解压操作数量
 * ✅ 修复P0问题：添加private修饰符，隐藏内部实现
 */
class DecompressionSemaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number = 10) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

/**
 * 通用缓存服务 - Redis-based distributed cache
 * 提供完整的缓存操作能力，包含压缩、监控和容错机制
 *
 * 核心特性：
 * - 智能压缩和解压缩（基于数据大小阈值）
 * - 并发控制（防止解压缩操作过载）
 * - 监控指标收集
 * - 类型安全的依赖注入
 * - 容错和降级处理
 */
@Injectable()
export class BasicCacheService {
  private readonly logger = createLogger(BasicCacheService.name);

  // ✅ 销毁状态标志，防止模块销毁后执行异步操作
  private isDestroyed = false;

  // ✅ 使用类型安全的并发控制
  private readonly decompressionSemaphore = new DecompressionSemaphore(
    CACHE_CONFIG.DECOMPRESSION.MAX_CONCURRENT,
  );

  constructor(
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    private readonly compressionService: CacheCompressionService,
    private readonly eventBus: EventEmitter2, // ✅ 使用事件驱动方式替代直接依赖
  ) {}

  /**
   * 映射 Redis PTTL 结果到秒数
   * -2: key不存在
   * -1: key存在但无过期时间
   * 正数: TTL毫秒数
   */
  private mapPttlToSeconds(pttl: number): number | null {
    if (pttl === -2) return null; // key不存在
    if (pttl === -1) return -1; // 永不过期
    return Math.ceil(pttl / 1000); // 转换为秒并向上取整
  }

  /**
   * 记录缓存操作指标
   * 使用事件驱动方式收集缓存性能数据
   */
  private recordMetrics(
    operation: string,
    hit: boolean,
    duration: number,
    metadata?: any,
  ): void {
    setImmediate(() => {
      // ✅ 修复P0问题：检查销毁状态，防止模块销毁后执行
      if (this.isDestroyed) {
        return;
      }

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "common_cache",
        metricType: "cache",
        metricName: `cache_${operation}`,
        metricValue: duration,
        tags: {
          operation,
          hit: hit.toString(),
          cacheType: "common",
          ...metadata,
        },
      });
    });
  }

  /**
   * 记录解压缩操作指标
   * 使用事件驱动方式监控解压缩性能和资源消耗
   */
  private recordDecompressionMetrics(
    success: boolean,
    duration: number,
    originalSize?: number,
    decompressedSize?: number,
  ): void {
    setImmediate(() => {
      // ✅ 修复P0问题：检查销毁状态，防止模块销毁后执行
      if (this.isDestroyed) {
        return;
      }

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "common_cache",
        metricType: "cache",
        metricName: "cache_decompress",
        metricValue: duration,
        tags: {
          operation: "decompress",
          success: success.toString(),
          cacheType: "common",
          originalSize,
          decompressedSize,
          compressionRatio:
            originalSize && decompressedSize
              ? originalSize / decompressedSize
              : null,
        },
      });
    });
  }

  /**
   * 分类解压缩错误类型
   * 用于更好的错误处理和监控
   */
  private classifyDecompressionError(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes("invalid")) return "invalid_data";
    if (message.includes("corrupt")) return "corrupted_data";
    if (message.includes("memory")) return "memory_limit";
    if (message.includes("timeout")) return "timeout";
    return "unknown_error";
  }

  /**
   * 获取数据预览 - 用于调试和监控
   * 安全地截取数据的前几个字符用于日志记录
   */
  private getDataPreview(data: any, maxLength: number = 100): string {
    try {
      const str = typeof data === "string" ? data : JSON.stringify(data);
      return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
    } catch {
      return "[不可序列化的数据]";
    }
  }

  /**
   * 标准化元数据格式
   * 确保元数据符合监控系统的要求
   */
  private normalizeMetadata(metadata: any): Record<string, any> {
    if (!metadata) return {};

    return {
      timestamp: new Date().toISOString(),
      ...metadata,
    };
  }

  /**
   * 转换为业务数据格式
   * 标准化缓存数据的返回格式
   */
  private async toBusinessData<T>(
    rawData: string | null,
    key: string,
    options: {
      enableDecompression?: boolean;
      metadata?: any;
    } = {},
  ): Promise<{ data: T | null; metadata: any }> {
    const startTime = Date.now();

    if (rawData === null) {
      return {
        data: null,
        metadata: this.normalizeMetadata({
          ...options.metadata,
          cached: false,
          duration: Date.now() - startTime,
        }),
      };
    }

    try {
      let processedData = rawData;
      let isDecompressed = false;

      // 检测和处理压缩数据
      if (
        options.enableDecompression &&
        this.compressionService.isCompressed(rawData)
      ) {
        // 并发控制 - 获取解压缩许可
        await this.decompressionSemaphore.acquire();

        try {
          const decompressionStart = Date.now();
          processedData = await this.compressionService.decompress(rawData);
          const decompressionDuration = Date.now() - decompressionStart;

          isDecompressed = true;

          // 记录解压缩指标
          this.recordDecompressionMetrics(
            true,
            decompressionDuration,
            rawData.length,
            processedData.length,
          );

          this.logger.debug(`解压缩完成: ${key}`, {
            originalSize: rawData.length,
            decompressedSize: processedData.length,
            duration: decompressionDuration,
          });
        } catch (decompressError) {
          const decompressionDuration = Date.now() - Date.now();
          const errorType = this.classifyDecompressionError(decompressError);

          // 记录解压缩失败指标
          this.recordDecompressionMetrics(false, decompressionDuration);

          this.logger.error(`解压缩失败: ${key}`, {
            error: decompressError.message,
            errorType,
            dataPreview: this.getDataPreview(rawData),
          });

          // 解压缩失败时返回null而不是抛出异常
          return {
            data: null,
            metadata: this.normalizeMetadata({
              ...options.metadata,
              cached: true,
              decompression_failed: true,
              error_type: errorType,
              duration: Date.now() - startTime,
            }),
          };
        } finally {
          // 释放解压缩许可
          this.decompressionSemaphore.release();
        }
      }

      // 解析JSON数据
      const parsedData: T = JSON.parse(processedData);

      return {
        data: parsedData,
        metadata: this.normalizeMetadata({
          ...options.metadata,
          cached: true,
          compressed: isDecompressed,
          duration: Date.now() - startTime,
        }),
      };
    } catch (parseError) {
      this.logger.error(`数据解析失败: ${key}`, {
        error: parseError.message,
        dataPreview: this.getDataPreview(rawData),
      });

      return {
        data: null,
        metadata: this.normalizeMetadata({
          ...options.metadata,
          cached: true,
          parse_failed: true,
          duration: Date.now() - startTime,
        }),
      };
    }
  }

  /**
   * 获取单个缓存数据
   * @param key 缓存键
   * @param enableDecompression 是否启用解压缩
   * @returns 缓存数据和元数据
   */
  async get<T>(
    key: string,
    enableDecompression: boolean = true,
  ): Promise<{ data: T | null; metadata: any }> {
    const startTime = Date.now();

    try {
      const rawData = await this.redis.get(key);
      const duration = Date.now() - startTime;

      // 记录缓存操作指标
      this.recordMetrics("get", rawData !== null, duration, { key });

      return await this.toBusinessData<T>(rawData, key, {
        enableDecompression,
        metadata: { operation: "get", key },
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("get", false, duration, {
        key,
        error: error.message,
      });

      this.logger.error(`缓存获取失败: ${key}`, error);

      return {
        data: null,
        metadata: this.normalizeMetadata({
          operation: "get",
          key,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 设置单个缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param ttlSeconds TTL秒数
   * @param enableCompression 是否启用压缩
   * @returns 操作结果和元数据
   */
  async set<T>(
    key: string,
    data: T,
    ttlSeconds?: number,
    enableCompression: boolean = true,
  ): Promise<{ success: boolean; metadata: any }> {
    const startTime = Date.now();

    try {
      let processedData = JSON.stringify(data);
      let isCompressed = false;

      // 智能压缩
      if (
        enableCompression &&
        processedData.length > CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES
      ) {
        const compressedResult =
          await this.compressionService.compress(processedData);
        processedData = compressedResult.compressedData;
        isCompressed = true;
      }

      // 设置缓存
      const result = ttlSeconds
        ? await this.redis.setex(key, ttlSeconds, processedData)
        : await this.redis.set(key, processedData);

      const duration = Date.now() - startTime;
      const success = result === "OK";

      // 记录缓存操作指标
      this.recordMetrics("set", success, duration, {
        key,
        compressed: isCompressed,
        dataSize: processedData.length,
        ttl: ttlSeconds,
      });

      return {
        success,
        metadata: this.normalizeMetadata({
          operation: "set",
          key,
          compressed: isCompressed,
          dataSize: processedData.length,
          ttl: ttlSeconds,
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("set", false, duration, {
        key,
        error: error.message,
      });

      this.logger.error(`缓存设置失败: ${key}`, error);

      return {
        success: false,
        metadata: this.normalizeMetadata({
          operation: "set",
          key,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 删除缓存数据
   * @param keys 要删除的缓存键（支持单个或多个）
   * @returns 删除结果和元数据
   */
  async delete(
    keys: string | string[],
  ): Promise<{ deletedCount: number; metadata: any }> {
    const startTime = Date.now();
    const keyArray = Array.isArray(keys) ? keys : [keys];

    try {
      const deletedCount = await this.redis.del(...keyArray);
      const duration = Date.now() - startTime;

      // 记录缓存操作指标
      this.recordMetrics("delete", deletedCount > 0, duration, {
        keys: keyArray,
        deletedCount,
      });

      return {
        deletedCount,
        metadata: this.normalizeMetadata({
          operation: "delete",
          keys: keyArray,
          deletedCount,
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("delete", false, duration, {
        keys: keyArray,
        error: error.message,
      });

      this.logger.error(`缓存删除失败`, error);

      return {
        deletedCount: 0,
        metadata: this.normalizeMetadata({
          operation: "delete",
          keys: keyArray,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 批量获取缓存数据
   * @param keys 缓存键数组
   * @param enableDecompression 是否启用解压缩
   * @returns 批量缓存数据和元数据
   */
  async mget<T>(
    keys: string[],
    enableDecompression: boolean = true,
  ): Promise<{
    data: Array<{ key: string; value: T | null }>;
    metadata: any;
  }> {
    const startTime = Date.now();

    if (keys.length === 0) {
      return {
        data: [],
        metadata: this.normalizeMetadata({
          operation: "mget",
          keys: [],
          duration: 0,
        }),
      };
    }

    try {
      const rawResults = await this.redis.mget(...keys);
      const duration = Date.now() - startTime;

      // 处理结果
      const results = await Promise.all(
        keys.map(async (key, index) => {
          const rawValue = rawResults[index];
          const { data } = await this.toBusinessData<T>(rawValue, key, {
            enableDecompression,
          });
          return { key, value: data };
        }),
      );

      const hitCount = results.filter((r) => r.value !== null).length;

      // 记录批量操作指标
      this.recordMetrics("mget", hitCount > 0, duration, {
        keys,
        hitCount,
        totalCount: keys.length,
        hitRate: hitCount / keys.length,
      });

      return {
        data: results,
        metadata: this.normalizeMetadata({
          operation: "mget",
          keys,
          hitCount,
          totalCount: keys.length,
          hitRate: hitCount / keys.length,
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("mget", false, duration, {
        keys,
        error: error.message,
      });

      this.logger.error(`批量获取缓存失败`, error);

      // 返回所有null值而不是抛出异常
      return {
        data: keys.map((key) => ({ key, value: null })),
        metadata: this.normalizeMetadata({
          operation: "mget",
          keys,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 增强批量获取 - 包含TTL信息
   * @param keys 缓存键数组
   * @param options 选项配置
   * @returns 增强的批量缓存数据
   */
  async mgetEnhanced<T>(
    keys: string[],
    options: {
      enableDecompression?: boolean;
      includeTTL?: boolean;
      includeMetadata?: boolean;
    } = {},
  ): Promise<{
    data: Array<{
      key: string;
      value: T | null;
      ttl?: number | null;
      metadata?: any;
    }>;
    summary: {
      total: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    metadata: any;
  }> {
    const startTime = Date.now();
    const {
      enableDecompression = true,
      includeTTL = false,
      includeMetadata = false,
    } = options;

    if (keys.length === 0) {
      return {
        data: [],
        summary: { total: 0, hits: 0, misses: 0, hitRate: 0 },
        metadata: this.normalizeMetadata({
          operation: "mgetEnhanced",
          keys: [],
          duration: 0,
        }),
      };
    }

    try {
      // 并行执行 mget 和 pttl (如果需要)
      const promises: Promise<any>[] = [this.redis.mget(...keys)];
      if (includeTTL) {
        promises.push(Promise.all(keys.map((key) => this.redis.pttl(key))));
      }

      const results = await Promise.all(promises);
      const rawValues = results[0];
      const ttlValues = includeTTL ? results[1] : null;

      // 处理数据
      const processedData = await Promise.all(
        keys.map(async (key, index) => {
          const rawValue = rawValues[index];
          const { data, metadata } = await this.toBusinessData<T>(
            rawValue,
            key,
            {
              enableDecompression,
              metadata: { index },
            },
          );

          const result: any = { key, value: data };

          if (includeTTL && ttlValues) {
            result.ttl = this.mapPttlToSeconds(ttlValues[index]);
          }

          if (includeMetadata) {
            result.metadata = metadata;
          }

          return result;
        }),
      );

      const duration = Date.now() - startTime;
      const hits = processedData.filter((item) => item.value !== null).length;
      const misses = keys.length - hits;
      const hitRate = hits / keys.length;

      // 记录增强批量操作指标
      this.recordMetrics("mgetEnhanced", hits > 0, duration, {
        keys,
        hits,
        misses,
        hitRate,
        includeTTL,
        includeMetadata,
      });

      return {
        data: processedData,
        summary: {
          total: keys.length,
          hits,
          misses,
          hitRate,
        },
        metadata: this.normalizeMetadata({
          operation: "mgetEnhanced",
          keys,
          includeTTL,
          includeMetadata,
          summary: { hits, misses, hitRate },
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("mgetEnhanced", false, duration, {
        keys,
        error: error.message,
      });

      this.logger.error(`增强批量获取失败`, error);

      // 容错处理：返回所有null值
      return {
        data: keys.map((key) => ({ key, value: null })),
        summary: {
          total: keys.length,
          hits: 0,
          misses: keys.length,
          hitRate: 0,
        },
        metadata: this.normalizeMetadata({
          operation: "mgetEnhanced",
          keys,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 批量设置缓存数据
   * @param entries 键值对数组
   * @param ttlSeconds TTL秒数
   * @param enableCompression 是否启用压缩
   * @returns 批量设置结果
   */
  async mset<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
    enableCompression: boolean = true,
  ): Promise<{
    success: boolean;
    results: Array<{ key: string; success: boolean }>;
    metadata: any;
  }> {
    const startTime = Date.now();

    if (entries.length === 0) {
      return {
        success: true,
        results: [],
        metadata: this.normalizeMetadata({
          operation: "mset",
          entries: [],
          duration: 0,
        }),
      };
    }

    try {
      // 预处理数据（压缩等）
      const processedEntries = await Promise.all(
        entries.map(async ({ key, value }) => {
          let processedData = JSON.stringify(value);
          let isCompressed = false;

          if (
            enableCompression &&
            processedData.length > CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES
          ) {
            const compressedResult =
              await this.compressionService.compress(processedData);
            processedData = compressedResult.compressedData;
            isCompressed = true;
          }

          return { key, data: processedData, compressed: isCompressed };
        }),
      );

      // 执行批量设置
      const pipeline = this.redis.pipeline();

      for (const { key, data } of processedEntries) {
        if (ttlSeconds) {
          pipeline.setex(key, ttlSeconds, data);
        } else {
          pipeline.set(key, data);
        }
      }

      const results = await pipeline.exec();
      const duration = Date.now() - startTime;

      // 处理结果
      const operationResults = entries.map((entry, index) => ({
        key: entry.key,
        success: results?.[index]?.[1] === "OK",
      }));

      const successCount = operationResults.filter((r) => r.success).length;
      const overallSuccess = successCount === entries.length;

      // 记录批量设置指标
      this.recordMetrics("mset", overallSuccess, duration, {
        keys: entries.map((e) => e.key),
        successCount,
        totalCount: entries.length,
        successRate: successCount / entries.length,
        ttl: ttlSeconds,
        enableCompression,
      });

      return {
        success: overallSuccess,
        results: operationResults,
        metadata: this.normalizeMetadata({
          operation: "mset",
          entries: entries.map((e) => e.key),
          successCount,
          totalCount: entries.length,
          successRate: successCount / entries.length,
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("mset", false, duration, {
        keys: entries.map((e) => e.key),
        error: error.message,
      });

      this.logger.error(`批量设置缓存失败`, error);

      return {
        success: false,
        results: entries.map((entry) => ({ key: entry.key, success: false })),
        metadata: this.normalizeMetadata({
          operation: "mset",
          entries: entries.map((e) => e.key),
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 增强批量设置 - 支持独立TTL和更多选项
   * @param entries 增强的键值对数组
   * @param options 全局选项
   * @returns 增强的批量设置结果
   */
  async msetEnhanced<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
      enableCompression?: boolean;
    }>,
    options: {
      defaultTTL?: number;
      defaultCompression?: boolean;
      continueOnError?: boolean;
      batchSize?: number;
    } = {},
  ): Promise<{
    success: boolean;
    results: Array<{
      key: string;
      success: boolean;
      error?: string;
      metadata?: any;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    metadata: any;
  }> {
    const startTime = Date.now();
    const {
      defaultTTL,
      defaultCompression = true,
      continueOnError = true,
      batchSize = CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE,
    } = options;

    if (entries.length === 0) {
      return {
        success: true,
        results: [],
        summary: { total: 0, successful: 0, failed: 0, successRate: 1 },
        metadata: this.normalizeMetadata({
          operation: "msetEnhanced",
          entries: [],
          duration: 0,
        }),
      };
    }

    // 分批处理大量数据
    const batches: (typeof entries)[] = [];
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize));
    }

    const allResults: Array<{
      key: string;
      success: boolean;
      error?: string;
      metadata?: any;
    }> = [];

    try {
      // 处理每个批次
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        try {
          // 预处理批次数据
          const processedBatch = await Promise.all(
            batch.map(async ({ key, value, ttl, enableCompression }) => {
              const entryStartTime = Date.now();

              try {
                let processedData = JSON.stringify(value);
                let isCompressed = false;
                const shouldCompress = enableCompression ?? defaultCompression;

                if (
                  shouldCompress &&
                  processedData.length >
                    CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES
                ) {
                  const compressedResult =
                    await this.compressionService.compress(processedData);
                  processedData = compressedResult.compressedData;
                  isCompressed = true;
                }

                const finalTTL = ttl ?? defaultTTL;

                return {
                  key,
                  data: processedData,
                  ttl: finalTTL,
                  compressed: isCompressed,
                  processingTimeMs: Date.now() - entryStartTime,
                };
              } catch (processingError) {
                return {
                  key,
                  error: processingError.message,
                  processingTimeMs: Date.now() - entryStartTime,
                };
              }
            }),
          );

          // 执行批次操作
          const pipeline = this.redis.pipeline();

          for (const processed of processedBatch) {
            if ("error" in processed) continue;

            if (processed.ttl) {
              pipeline.setex(processed.key, processed.ttl, processed.data);
            } else {
              pipeline.set(processed.key, processed.data);
            }
          }

          const pipelineResults = await pipeline.exec();
          let pipelineIndex = 0;

          // 处理批次结果
          for (let i = 0; i < processedBatch.length; i++) {
            const processed = processedBatch[i];

            if ("error" in processed) {
              allResults.push({
                key: processed.key,
                success: false,
                error: processed.error,
                metadata: this.normalizeMetadata({
                  batchIndex,
                  entryIndex: i,
                  processingTimeMs: processed.processingTimeMs || 0,
                }),
              });
            } else {
              const pipelineResult = pipelineResults?.[pipelineIndex];
              const success = pipelineResult?.[1] === "OK";

              allResults.push({
                key: processed.key,
                success,
                error: success
                  ? undefined
                  : pipelineResult?.[0]?.message || "设置失败",
                metadata: this.normalizeMetadata({
                  batchIndex,
                  entryIndex: i,
                  compressed: processed.compressed,
                  ttl: processed.ttl,
                  processingTimeMs: processed.processingTimeMs || 0,
                }),
              });

              pipelineIndex++;
            }
          }
        } catch (batchError) {
          // 批次级错误处理
          if (continueOnError) {
            // 将该批次的所有条目标记为失败
            for (const entry of batch) {
              allResults.push({
                key: entry.key,
                success: false,
                error: batchError.message,
                metadata: this.normalizeMetadata({
                  batchIndex,
                  batchError: true,
                }),
              });
            }
          } else {
            // 不继续处理，抛出错误
            throw batchError;
          }
        }
      }

      const duration = Date.now() - startTime;
      const successful = allResults.filter((r) => r.success).length;
      const failed = allResults.length - successful;
      const successRate = successful / allResults.length;
      const overallSuccess = failed === 0;

      // 记录增强批量设置指标
      this.recordMetrics("msetEnhanced", overallSuccess, duration, {
        keys: entries.map((e) => e.key),
        successful,
        failed,
        successRate,
        batchCount: batches.length,
        batchSize,
      });

      return {
        success: overallSuccess,
        results: allResults,
        summary: {
          total: entries.length,
          successful,
          failed,
          successRate,
        },
        metadata: this.normalizeMetadata({
          operation: "msetEnhanced",
          entries: entries.map((e) => e.key),
          batchCount: batches.length,
          batchSize,
          summary: { successful, failed, successRate },
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("msetEnhanced", false, duration, {
        keys: entries.map((e) => e.key),
        error: error.message,
      });

      this.logger.error(`增强批量设置失败`, error);

      // 如果还没有处理任何结果，创建所有失败的结果
      if (allResults.length === 0) {
        entries.forEach((entry) => {
          allResults.push({
            key: entry.key,
            success: false,
            error: error.message,
          });
        });
      }

      return {
        success: false,
        results: allResults,
        summary: {
          total: entries.length,
          successful: 0,
          failed: entries.length,
          successRate: 0,
        },
        metadata: this.normalizeMetadata({
          operation: "msetEnhanced",
          entries: entries.map((e) => e.key),
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 带元数据的批量获取
   * @param keys 缓存键数组
   * @param options 选项配置
   * @returns 包含完整元数据的批量结果
   */
  async mgetWithMetadata<T>(
    keys: string[],
    options: {
      enableDecompression?: boolean;
      includeTTL?: boolean;
      includeSize?: boolean;
    } = {},
  ): Promise<{
    results: Array<{
      key: string;
      data: T | null;
      cached: boolean;
      ttl?: number | null;
      size?: number;
      metadata: any;
    }>;
    summary: {
      total: number;
      hits: number;
      misses: number;
      hitRate: number;
      totalSize?: number;
    };
    metadata: any;
  }> {
    const startTime = Date.now();
    const {
      enableDecompression = true,
      includeTTL = false,
      includeSize = false,
    } = options;

    if (keys.length === 0) {
      return {
        results: [],
        summary: { total: 0, hits: 0, misses: 0, hitRate: 0 },
        metadata: this.normalizeMetadata({
          operation: "mgetWithMetadata",
          keys: [],
          duration: 0,
        }),
      };
    }

    try {
      // 构建并行查询
      const queries: Promise<any>[] = [this.redis.mget(...keys)];

      if (includeTTL) {
        queries.push(Promise.all(keys.map((key) => this.redis.pttl(key))));
      }

      if (includeSize) {
        queries.push(Promise.all(keys.map((key) => this.redis.strlen(key))));
      }

      const [rawValues, ttlValues, sizeValues] = await Promise.all(queries);

      // 处理每个结果
      const results = await Promise.all(
        keys.map(async (key, index) => {
          const rawValue = rawValues[index];
          const { data, metadata: itemMetadata } = await this.toBusinessData<T>(
            rawValue,
            key,
            {
              enableDecompression,
              metadata: { index },
            },
          );

          const result: any = {
            key,
            data,
            cached: rawValue !== null,
            metadata: itemMetadata,
          };

          if (includeTTL && ttlValues) {
            result.ttl = this.mapPttlToSeconds(ttlValues[index]);
          }

          if (includeSize && sizeValues) {
            result.size = sizeValues[index];
          }

          return result;
        }),
      );

      const duration = Date.now() - startTime;
      const hits = results.filter((r) => r.cached).length;
      const misses = keys.length - hits;
      const hitRate = hits / keys.length;
      const totalSize = includeSize
        ? results.reduce((sum, r) => sum + (r.size || 0), 0)
        : undefined;

      // 记录带元数据的批量获取指标
      this.recordMetrics("mgetWithMetadata", hits > 0, duration, {
        keys,
        hits,
        misses,
        hitRate,
        includeTTL,
        includeSize,
        totalSize,
      });

      return {
        results,
        summary: {
          total: keys.length,
          hits,
          misses,
          hitRate,
          totalSize,
        },
        metadata: this.normalizeMetadata({
          operation: "mgetWithMetadata",
          keys,
          options,
          summary: { hits, misses, hitRate, totalSize },
          duration,
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetrics("mgetWithMetadata", false, duration, {
        keys,
        error: error.message,
      });

      this.logger.error(`带元数据的批量获取失败`, error);

      return {
        results: keys.map((key) => ({
          key,
          data: null,
          cached: false,
          metadata: this.normalizeMetadata({ error: error.message }),
        })),
        summary: {
          total: keys.length,
          hits: 0,
          misses: keys.length,
          hitRate: 0,
        },
        metadata: this.normalizeMetadata({
          operation: "mgetWithMetadata",
          keys,
          error: error.message,
          duration,
        }),
      };
    }
  }

  /**
   * 容错获取 - 提供降级策略
   * @param key 缓存键
   * @param fallbackFn 降级函数
   * @param options 选项配置
   * @returns 缓存数据或降级数据
   */
  async getWithFallback<T>(
    key: string,
    fallbackFn?: () => Promise<T>,
    options: {
      enableDecompression?: boolean;
      cacheFallbackResult?: boolean;
      fallbackTTL?: number;
    } = {},
  ): Promise<{
    data: T | null;
    fromCache: boolean;
    fromFallback: boolean;
    metadata: any;
  }> {
    const startTime = Date.now();
    const {
      enableDecompression = true,
      cacheFallbackResult = true,
      fallbackTTL = 3600,
    } = options;

    // 尝试从缓存获取
    const cacheResult = await this.get<T>(key, enableDecompression);

    if (cacheResult.data !== null) {
      return {
        data: cacheResult.data,
        fromCache: true,
        fromFallback: false,
        metadata: {
          ...cacheResult.metadata,
          operation: "getWithFallback",
          source: "cache",
          duration: Date.now() - startTime,
        },
      };
    }

    // 缓存未命中，尝试降级策略
    if (!fallbackFn) {
      return {
        data: null,
        fromCache: false,
        fromFallback: false,
        metadata: this.normalizeMetadata({
          operation: "getWithFallback",
          source: "none",
          cache_miss: true,
          no_fallback: true,
          duration: Date.now() - startTime,
        }),
      };
    }

    try {
      const fallbackData = await fallbackFn();

      // 缓存降级结果
      if (cacheFallbackResult && fallbackData !== null) {
        await this.set(key, fallbackData, fallbackTTL);
      }

      return {
        data: fallbackData,
        fromCache: false,
        fromFallback: true,
        metadata: this.normalizeMetadata({
          operation: "getWithFallback",
          source: "fallback",
          cache_miss: true,
          fallback_cached: cacheFallbackResult,
          duration: Date.now() - startTime,
        }),
      };
    } catch (fallbackError) {
      this.logger.error(`降级策略执行失败: ${key}`, fallbackError);

      return {
        data: null,
        fromCache: false,
        fromFallback: false,
        metadata: this.normalizeMetadata({
          operation: "getWithFallback",
          source: "none",
          cache_miss: true,
          fallback_error: fallbackError.message,
          duration: Date.now() - startTime,
        }),
      };
    }
  }

  /**
   * 生成缓存键
   * 提供标准化的缓存键生成逻辑
   */
  private generateCacheKey(
    prefix: string,
    ...parts: (string | number)[]
  ): string {
    return [prefix, ...parts].join(":");
  }

  /**
   * 计算最优TTL
   * 基于数据特征和业务场景计算最适合的TTL
   */
  static calculateOptimalTTL(
    dataSize: number,
    accessPattern: "hot" | "warm" | "cold" = "warm",
    customTTL?: number,
  ): number {
    // 如果提供了自定义TTL，直接使用
    if (customTTL !== undefined && customTTL > 0) {
      return customTTL;
    }

    // 基于访问模式的基础TTL
    const baseTTL = {
      hot: 300, // 5分钟
      warm: 1800, // 30分钟
      cold: 3600, // 1小时
    }[accessPattern];

    // 基于数据大小的调整因子
    let sizeFactor = 1.0;

    if (dataSize > 1024 * 1024) {
      // > 1MB
      sizeFactor = 0.5; // 大数据缩短TTL
    } else if (dataSize > 100 * 1024) {
      // > 100KB
      sizeFactor = 0.8; // 中等数据稍微缩短TTL
    } else if (dataSize < 1024) {
      // < 1KB
      sizeFactor = 1.5; // 小数据延长TTL
    }

    // 时间因子：非工作时间可以延长TTL
    const now = new Date();
    const hour = now.getHours();
    const isWorkingHours = hour >= 9 && hour <= 18;
    const timeFactor = isWorkingHours ? 1.0 : 1.5;

    // 计算最终TTL
    const finalTTL = Math.floor(baseTTL * sizeFactor * timeFactor);

    // 确保TTL在合理范围内
    return Math.max(60, Math.min(finalTTL, 86400)); // 1分钟到24小时
  }

  /**
   * 检查缓存服务健康状态
   * @returns 健康检查结果
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存服务统计数据
   */
  async getStats(): Promise<{
    redis: any;
    memory: any;
    performance: any;
  }> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info("memory");

      return {
        redis: {
          connected: true,
          info: this.parseRedisInfo(info),
        },
        memory: {
          info: this.parseRedisInfo(memory),
        },
        performance: {
          decompressionSemaphore: {
            available: this.decompressionSemaphore["permits"],
            max: this.decompressionSemaphore["maxPermits"],
          },
        },
      };
    } catch (error) {
      return {
        redis: { connected: false, error: error.message },
        memory: { error: error.message },
        performance: { error: error.message },
      };
    }
  }

  /**
   * 解析Redis INFO命令返回的文本
   */
  private parseRedisInfo(infoText: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = infoText.split("\r\n");

    for (const line of lines) {
      if (line.includes(":")) {
        const [key, value] = line.split(":");
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 清理资源（用于模块销毁时调用）
   */
  cleanup(): void {
    this.isDestroyed = true;
    this.logger.log("BasicCacheService cleaned up - async operations disabled");
  }
}
