import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@common/logging/index";
import { CACHE_CONFIG } from "../constants/cache-config.constants";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * 内存使用统计接口
 */
export interface MemoryStats {
  totalAllocated: number;
  currentUsage: number;
  peakUsage: number;
  operationCount: number;
  averageItemSize: number;
  compressionRatio: number;
  lastCleanup: Date | null;
}

/**
 * 批量处理结果接口
 */
export interface BatchProcessResult<T, R = T> {
  successful: R[];
  failed: Array<{ item: T; error: string }>;
  metrics: {
    totalItems: number;
    successCount: number;
    failureCount: number;
    processingTimeMs: number;
    memoryUsed: number;
    avgItemSize: number;
  };
}

/**
 * 批量处理选项接口
 */
export interface BatchProcessOptions {
  maxBatchSize?: number;
  maxMemoryUsage?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
  retryFailedItems?: boolean;
  maxRetries?: number;
  prioritizeMemoryEfficiency?: boolean;
}

/**
 * 内存池项接口
 */
interface MemoryPoolItem {
  id: string;
  size: number;
  data: any;
  timestamp: Date;
  accessCount: number;
  compressed: boolean;
}

/**
 * 批量内存优化器服务
 *
 * 专门用于优化批量缓存操作的内存使用，特性包括：
 * - 智能批量大小调整
 * - 内存使用监控和限制
 * - 数据压缩和优化
 * - 内存池管理
 * - 垃圾回收优化
 * - 自适应批量策略
 */
@Injectable()
export class BatchMemoryOptimizerService {
  private readonly logger = createLogger(BatchMemoryOptimizerService.name);

  // 配置参数
  private readonly defaultMaxBatchSize: number;
  private readonly defaultMaxMemoryUsage: number; // bytes
  private readonly compressionThreshold: number;

  // 内存池管理
  private memoryPool: Map<string, MemoryPoolItem> = new Map();
  private readonly maxPoolSize: number = 1000;
  private poolCleanupInterval: NodeJS.Timeout | null = null;

  // 内存统计
  private stats: MemoryStats;
  private memoryHistory: Array<{ timestamp: Date; usage: number }> = [];
  private readonly historyLimit = 100;

  // 性能优化参数
  private optimalBatchSizeHistory: number[] = [];
  private readonly batchSizeHistoryLimit = 50;
  private currentOptimalBatchSize: number;

  constructor(private readonly configService: ConfigService) {
    // 初始化配置
    this.defaultMaxBatchSize = this.configService.get<number>(
      "cache.batch.maxBatchSize",
      CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE,
    );

    this.defaultMaxMemoryUsage = this.configService.get<number>(
      "cache.batch.maxMemoryUsage",
      50 * 1024 * 1024, // 50MB
    );

    this.compressionThreshold = this.configService.get<number>(
      "cache.compression.thresholdBytes",
      CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES,
    );

    this.currentOptimalBatchSize = this.defaultMaxBatchSize;

    // 初始化统计
    this.stats = {
      totalAllocated: 0,
      currentUsage: 0,
      peakUsage: 0,
      operationCount: 0,
      averageItemSize: 0,
      compressionRatio: 1.0,
      lastCleanup: null,
    };

    // 启动内存池清理
    this.startMemoryPoolCleanup();

    this.logger.log("BatchMemoryOptimizerService initialized", {
      defaultMaxBatchSize: this.defaultMaxBatchSize,
      defaultMaxMemoryUsage: this.defaultMaxMemoryUsage,
      compressionThreshold: this.compressionThreshold,
    });
  }

  /**
   * 优化批量处理
   * @param items 要处理的项目数组
   * @param processor 处理函数
   * @param options 处理选项
   * @returns 批量处理结果
   */
  async optimizeBatch<T, R>(
    items: T[],
    processor: (items: T[]) => Promise<R[]>,
    options: BatchProcessOptions = {},
  ): Promise<BatchProcessResult<T, R>> {
    const startTime = Date.now();
    const startMemory = this.getCurrentMemoryUsage();

    // 合并选项
    const opts = {
      maxBatchSize: options.maxBatchSize || this.getOptimalBatchSize(),
      maxMemoryUsage: options.maxMemoryUsage || this.defaultMaxMemoryUsage,
      enableCompression: options.enableCompression !== false,
      compressionThreshold:
        options.compressionThreshold || this.compressionThreshold,
      retryFailedItems: options.retryFailedItems !== false,
      maxRetries: options.maxRetries || 2,
      prioritizeMemoryEfficiency: options.prioritizeMemoryEfficiency || false,
      ...options,
    };

    this.logger.debug("Starting batch optimization", {
      itemCount: items.length,
      optimalBatchSize: opts.maxBatchSize,
      maxMemoryUsage: opts.maxMemoryUsage,
    });

    const successful: R[] = [];
    const failed: Array<{ item: T; error: string }> = [];
    let totalMemoryUsed = 0;

    try {
      // 智能分批处理
      const batches = await this.createOptimalBatches(items, opts);

      for (const batch of batches) {
        const batchStartMemory = this.getCurrentMemoryUsage();

        try {
          // 检查内存限制
          if (batchStartMemory > opts.maxMemoryUsage) {
            await this.performMemoryCleanup();

            // 如果清理后仍然超限，减小批量大小
            if (this.getCurrentMemoryUsage() > opts.maxMemoryUsage) {
              throw UniversalExceptionFactory.createBusinessException({
                component: ComponentIdentifier.COMMON_CACHE,
                errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED,
                operation: 'optimizeBatch',
                message: 'Memory usage exceeds limit even after cleanup',
                context: {
                  currentMemoryUsage: this.getCurrentMemoryUsage(),
                  maxMemoryUsage: opts.maxMemoryUsage,
                  batchSize: batch.items.length,
                  itemCount: items.length,
                  operation: 'batch_memory_optimization'
                }
              });
            }
          }

          // 处理批次
          const batchResults = await processor(batch.items);
          successful.push(...batchResults);

          // 更新内存使用统计
          const batchEndMemory = this.getCurrentMemoryUsage();
          const batchMemoryUsed = Math.max(
            0,
            batchEndMemory - batchStartMemory,
          );
          totalMemoryUsed += batchMemoryUsed;

          // 记录成功处理的批次大小用于优化
          this.recordBatchSize(batch.items.length, true);
        } catch (error) {
          this.logger.warn("Batch processing failed", {
            batchSize: batch.items.length,
            error: error.message,
          });

          // 记录失败的批次大小
          this.recordBatchSize(batch.items.length, false);

          // 如果启用重试，尝试单独处理失败的项目
          if (opts.retryFailedItems) {
            await this.retryFailedItems(
              batch.items,
              processor,
              failed,
              successful,
              opts.maxRetries,
            );
          } else {
            batch.items.forEach((item) => {
              failed.push({ item, error: error.message });
            });
          }
        }

        // 批次间的内存优化
        if (opts.prioritizeMemoryEfficiency) {
          await this.performIntermediateCleanup();
        }
      }
    } catch (error) {
      this.logger.error("Batch optimization failed", error);

      // 将所有未处理的项目标记为失败
      items.forEach((item) => {
        if (
          !successful.includes(item as any) &&
          !failed.some((f) => f.item === item)
        ) {
          failed.push({ item, error: error.message });
        }
      });
    }

    const processingTimeMs = Date.now() - startTime;
    const avgItemSize = totalMemoryUsed / Math.max(1, successful.length);

    // 更新统计
    this.updateStats(
      totalMemoryUsed,
      successful.length + failed.length,
      avgItemSize,
    );

    const result: BatchProcessResult<T, R> = {
      successful,
      failed,
      metrics: {
        totalItems: items.length,
        successCount: successful.length,
        failureCount: failed.length,
        processingTimeMs,
        memoryUsed: totalMemoryUsed,
        avgItemSize,
      },
    };

    this.logger.debug("Batch optimization completed", result.metrics);

    return result;
  }

  /**
   * 创建优化的批次
   */
  private async createOptimalBatches<T>(
    items: T[],
    options: BatchProcessOptions,
  ): Promise<Array<{ items: T[]; estimatedMemory: number }>> {
    const batches: Array<{ items: T[]; estimatedMemory: number }> = [];
    const itemSize = this.estimateItemSize(items[0]);

    let currentBatch: T[] = [];
    let currentBatchMemory = 0;

    for (const item of items) {
      const estimatedItemMemory = this.estimateItemSize(item);

      // 检查是否需要开始新批次
      const wouldExceedBatchSize = currentBatch.length >= options.maxBatchSize!;
      const wouldExceedMemory =
        currentBatchMemory + estimatedItemMemory >
        options.maxMemoryUsage! * 0.8;

      if (
        currentBatch.length > 0 &&
        (wouldExceedBatchSize || wouldExceedMemory)
      ) {
        batches.push({
          items: [...currentBatch],
          estimatedMemory: currentBatchMemory,
        });

        currentBatch = [];
        currentBatchMemory = 0;
      }

      currentBatch.push(item);
      currentBatchMemory += estimatedItemMemory;
    }

    // 添加最后一个批次
    if (currentBatch.length > 0) {
      batches.push({
        items: currentBatch,
        estimatedMemory: currentBatchMemory,
      });
    }

    return batches;
  }

  /**
   * 重试失败的项目
   */
  private async retryFailedItems<T, R>(
    items: T[],
    processor: (items: T[]) => Promise<R[]>,
    failed: Array<{ item: T; error: string }>,
    successful: R[],
    maxRetries: number,
  ): Promise<void> {
    let retryCount = 0;
    let itemsToRetry = [...items];

    while (retryCount < maxRetries && itemsToRetry.length > 0) {
      const retryResults: T[] = [];

      // 单独处理每个项目以隔离错误
      for (const item of itemsToRetry) {
        try {
          const result = await processor([item]);
          successful.push(...result);
        } catch (error) {
          retryResults.push(item);
        }
      }

      itemsToRetry = retryResults;
      retryCount++;
    }

    // 将仍然失败的项目添加到失败列表
    itemsToRetry.forEach((item) => {
      failed.push({ item, error: `Failed after ${maxRetries} retries` });
    });
  }

  /**
   * 估算项目内存大小
   */
  private estimateItemSize(item: any): number {
    if (!item) return 0;

    try {
      const jsonStr = JSON.stringify(item);
      return jsonStr.length * 2; // 假设UTF-16编码
    } catch {
      return 1024; // 默认估算值
    }
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed;
  }

  /**
   * 获取最优批次大小
   */
  private getOptimalBatchSize(): number {
    // 基于历史性能数据调整批次大小
    if (this.optimalBatchSizeHistory.length < 5) {
      return this.currentOptimalBatchSize;
    }

    const recentSizes = this.optimalBatchSizeHistory.slice(-10);
    const avgSize =
      recentSizes.reduce((sum, size) => sum + size, 0) / recentSizes.length;

    // 渐进式调整
    this.currentOptimalBatchSize = Math.floor(
      this.currentOptimalBatchSize * 0.8 + avgSize * 0.2,
    );

    // 确保在合理范围内
    return Math.max(
      10,
      Math.min(this.currentOptimalBatchSize, this.defaultMaxBatchSize),
    );
  }

  /**
   * 记录批次大小性能
   */
  private recordBatchSize(batchSize: number, successful: boolean): void {
    if (successful) {
      this.optimalBatchSizeHistory.push(batchSize);

      if (this.optimalBatchSizeHistory.length > this.batchSizeHistoryLimit) {
        this.optimalBatchSizeHistory.shift();
      }
    } else {
      // 失败的批次建议减小大小
      const reducedSize = Math.max(1, Math.floor(batchSize * 0.7));
      this.optimalBatchSizeHistory.push(reducedSize);
    }
  }

  /**
   * 执行内存清理
   */
  private async performMemoryCleanup(): Promise<void> {
    const beforeCleanup = this.getCurrentMemoryUsage();

    // 清理内存池
    await this.cleanupMemoryPool(true);

    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }

    const afterCleanup = this.getCurrentMemoryUsage();
    const memoryFreed = beforeCleanup - afterCleanup;

    this.stats.lastCleanup = new Date();

    this.logger.debug("Memory cleanup completed", {
      memoryFreed,
      beforeCleanup,
      afterCleanup,
    });
  }

  /**
   * 执行批次间的中间清理
   */
  private async performIntermediateCleanup(): Promise<void> {
    // 轻量级清理，不影响性能
    const oldItems = Array.from(this.memoryPool.entries())
      .filter(([_, item]) => {
        const ageMinutes =
          (Date.now() - item.timestamp.getTime()) / (1000 * 60);
        return ageMinutes > 5; // 5分钟以上的项目
      })
      .slice(0, 10); // 每次最多清理10个项目

    oldItems.forEach(([key]) => {
      this.memoryPool.delete(key);
    });
  }

  /**
   * 启动内存池清理定时器
   */
  private startMemoryPoolCleanup(): void {
    this.poolCleanupInterval = setInterval(async () => {
      await this.cleanupMemoryPool(false);
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理内存池
   */
  private async cleanupMemoryPool(aggressive: boolean = false): Promise<void> {
    const now = Date.now();
    const maxAge = aggressive ? 60000 : 300000; // 1分钟 vs 5分钟
    const itemsToRemove: string[] = [];

    for (const [key, item] of this.memoryPool.entries()) {
      const age = now - item.timestamp.getTime();
      if (age > maxAge) {
        itemsToRemove.push(key);
      }
    }

    // 如果内存池过大，清理最少访问的项目
    if (this.memoryPool.size > this.maxPoolSize) {
      const sortedItems = Array.from(this.memoryPool.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, this.memoryPool.size - this.maxPoolSize);

      sortedItems.forEach(([key]) => itemsToRemove.push(key));
    }

    itemsToRemove.forEach((key) => this.memoryPool.delete(key));

    if (itemsToRemove.length > 0) {
      this.logger.debug("Cleaned up memory pool", {
        itemsRemoved: itemsToRemove.length,
        poolSize: this.memoryPool.size,
      });
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(
    memoryUsed: number,
    operationCount: number,
    avgItemSize: number,
  ): void {
    this.stats.totalAllocated += memoryUsed;
    this.stats.currentUsage = this.getCurrentMemoryUsage();
    this.stats.peakUsage = Math.max(
      this.stats.peakUsage,
      this.stats.currentUsage,
    );
    this.stats.operationCount += operationCount;

    // 更新平均项目大小（移动平均）
    this.stats.averageItemSize =
      this.stats.averageItemSize * 0.9 + avgItemSize * 0.1;

    // 记录内存历史
    this.memoryHistory.push({
      timestamp: new Date(),
      usage: this.stats.currentUsage,
    });

    if (this.memoryHistory.length > this.historyLimit) {
      this.memoryHistory.shift();
    }
  }

  /**
   * 获取内存统计
   */
  getMemoryStats(): MemoryStats {
    this.stats.currentUsage = this.getCurrentMemoryUsage();
    return { ...this.stats };
  }

  /**
   * 获取内存使用历史
   */
  getMemoryHistory(): Array<{ timestamp: Date; usage: number }> {
    return [...this.memoryHistory];
  }

  /**
   * 获取优化建议
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getMemoryStats();

    if (stats.averageItemSize > 10240) {
      // 10KB
      recommendations.push("平均项目大小较大，建议启用压缩");
    }

    if (this.currentOptimalBatchSize < this.defaultMaxBatchSize * 0.5) {
      recommendations.push("最优批次大小偏小，可能存在内存碎片问题");
    }

    const recentMemory = this.memoryHistory.slice(-10);
    if (recentMemory.length >= 5) {
      const memoryTrend =
        recentMemory[recentMemory.length - 1].usage / recentMemory[0].usage;
      if (memoryTrend > 1.5) {
        recommendations.push("内存使用呈上升趋势，建议增加清理频率");
      }
    }

    if (this.memoryPool.size > this.maxPoolSize * 0.8) {
      recommendations.push("内存池使用率较高，建议调整清理策略");
    }

    return recommendations;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAllocated: 0,
      currentUsage: this.getCurrentMemoryUsage(),
      peakUsage: 0,
      operationCount: 0,
      averageItemSize: 0,
      compressionRatio: 1.0,
      lastCleanup: null,
    };

    this.memoryHistory = [];
    this.optimalBatchSizeHistory = [];
    this.currentOptimalBatchSize = this.defaultMaxBatchSize;

    this.logger.log("Memory optimizer stats reset");
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.poolCleanupInterval) {
      clearInterval(this.poolCleanupInterval);
      this.poolCleanupInterval = null;
    }

    this.memoryPool.clear();
    this.resetStats();

    this.logger.log("BatchMemoryOptimizerService cleaned up");
  }
}
