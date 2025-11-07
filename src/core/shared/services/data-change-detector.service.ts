/**
 * 高效数据变化检测服务
 * ⚡ 使用关键字段比较 + 智能阈值，避免哈希计算开销
 */

import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger } from "@common/logging/index";
import { UniversalExceptionFactory, ComponentIdentifier } from "@common/core/exceptions";
import { CacheService } from "@cachev2/cache.service";

// Import from the new Market Domain layer
import {
  Market,
  MarketStatus,
  CHANGE_DETECTION_THRESHOLDS,
} from "../constants/market.constants";
import { SHARED_CACHE_CONSTANTS } from "../constants/cache.constants";
import { SHARED_ERROR_CODES } from "../constants/shared-error-codes.constants";

/**
 * 关键字段配置 - 按重要性排序，优先检测高频变化字段
 */
const CRITICAL_FIELDS = {
  // 价格相关字段（最高优先级）
  PRICE_FIELDS: [
    "lastPrice",
    "last_done",
    "price",
    "close",
    "bid",
    "ask",
    "bid_price",
    "ask_price",
  ],

  // 变化相关字段（高优先级）
  CHANGE_FIELDS: [
    "change",
    "changePercent",
    "change_rate",
    "change_val",
    "percent_change",
  ],

  // 成交量字段（中优先级）
  VOLUME_FIELDS: [
    "volume",
    "turnover",
    "vol",
    "amount",
    "trade_volume",
    "total_volume",
  ],

  // 高低价字段（中优先级）
  OHLC_FIELDS: ["high", "low", "open", "day_high", "day_low", "day_open"],

  // 买卖盘字段（低优先级）
  DEPTH_FIELDS: ["bid_size", "ask_size", "bid_vol", "ask_vol"],
} as const;

/**
 * 数据变化检测结果
 */
export interface ChangeDetectionResult {
  hasChanged: boolean;
  changedFields: string[];
  significantChanges: string[];
  changeReason: string;
  confidence: number; // 0-1，变化置信度
}

/**
 * 股票数据快照 - 仅存储关键字段
 */
interface DataSnapshot {
  symbol: string;
  timestamp: number;
  checksum: string; // 关键字段的轻量级校验和
  criticalValues: Record<string, number>; // 数值型关键字段
}

import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';

@Injectable()
export class DataChangeDetectorService {
  private readonly logger = createLogger(DataChangeDetectorService.name);

  constructor(
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
    private readonly cacheService: CacheService, // ✅ 统一缓存服务
    private readonly marketInferenceService: MarketInferenceService,
  ) {}

  // 内存中的数据快照缓存（Redis故障时的降级方案）
  private readonly snapshotCache = new Map<string, DataSnapshot>();

  // 最大缓存大小（防止内存溢出）
  // 现在使用统一的缓存常量定义

  /**
   * 高效检测数据是否发生显著变化
   * 🎯 优化策略：
   * 1. 优先检测高频变化字段
   * 2. 基于市场状态动态调整阈值
   * 3. 短路评估，发现变化立即返回
   */
  async detectSignificantChange(
    symbol: string,
    newData: any,
    market: Market,
    marketStatus: MarketStatus,
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();

    try {
      // 1. 获取上次的数据快照
      const lastSnapshot = await this.getLastSnapshot(symbol);

      if (!lastSnapshot) {
        // 首次数据，直接认为有变化
        await this.saveSnapshot(symbol, newData);

        // ✅ 事件化首次检测监控
        this.emitDetectionEvent(
          "detect_significant_change_first_time",
          200,
          Date.now() - startTime,
          {
            symbol,
            market,
            market_status: marketStatus,
            is_first_time: true,
          },
        );

        return this.createResult(true, [], [], "首次数据", 1.0);
      }

      // 2. 快速校验和比较（最快的检测方式）
      const newChecksum = this.calculateQuickChecksum(newData);
      if (newChecksum === lastSnapshot.checksum) {
        // ✅ 事件化无变化监控
        this.emitDetectionEvent(
          "detect_no_change",
          200,
          Date.now() - startTime,
          {
            symbol,
            market,
            market_status: marketStatus,
            has_changed: false,
            detection_method: "checksum_match",
          },
        );

        this.logPerformance("checksum_match", startTime);
        return this.createResult(false, [], [], "数据未变化", 1.0);
      }

      // 3. 精确字段比较检测
      const changeResult = this.detectFieldChanges(
        newData,
        lastSnapshot.criticalValues,
        market,
        marketStatus,
      );

      // 4. 如果有显著变化，更新快照
      if (changeResult.hasChanged) {
        await this.saveSnapshot(symbol, newData);
      }

      // ✅ 事件化检测成功监控
      this.emitDetectionEvent(
        "detect_significant_change",
        200,
        Date.now() - startTime,
        {
          symbol,
          market,
          market_status: marketStatus,
          has_changed: changeResult.hasChanged,
          significant_changes: changeResult.significantChanges.length,
          confidence: changeResult.confidence,
          detection_method: "field_comparison",
        },
      );

      // 保持现有性能日志
      this.logPerformance("full_detection", startTime);

      return changeResult;
    } catch (error) {
      // ✅ 事件化检测失败监控
      this.emitDetectionEvent(
        "detect_significant_change_failed",
        500,
        Date.now() - startTime,
        {
          symbol,
          market,
          error: error.message,
        },
      );

      // 统一错误处理
      throw UniversalExceptionFactory.createFromError(
        error as Error,
        'detectSignificantChange',
        ComponentIdentifier.SHARED,
        { symbol, market, marketStatus }
      );
    }
  }

  /**
   * 快速校验和计算 - 仅基于关键数值字段
   * ⚡ 比MD5哈希快10倍以上
   */
  private calculateQuickChecksum(data: any): string {
    const criticalValues: number[] = [];

    // 按优先级顺序检查字段，构建数值数组
    for (const fieldGroup of Object.values(CRITICAL_FIELDS)) {
      for (const field of fieldGroup) {
        const value = this.extractNumericValue(data, field);
        if (value !== null) {
          // 价格类数据保留4位小数，成交量取整
          const rounded =
            field.includes("price") || field.includes("Price")
              ? Math.round(value * 10000)
              : Math.round(value);
          criticalValues.push(rounded);
        }
      }
    }

    // 简单求和作为校验和（足够快速且有效）
    return criticalValues.reduce((sum, val) => sum + val, 0).toString(36);
  }

  /**
   * 精确字段变化检测
   * 🎯 使用短路评估，发现显著变化立即返回
   */
  private detectFieldChanges(
    newData: any,
    lastValues: Record<string, number>,
    _market: Market,
    marketStatus: MarketStatus,
  ): ChangeDetectionResult {
    const changedFields: string[] = [];
    const significantChanges: string[] = [];

    // 获取阈值配置
    const priceThreshold =
      CHANGE_DETECTION_THRESHOLDS.PRICE_CHANGE[marketStatus];
    const volumeThreshold =
      CHANGE_DETECTION_THRESHOLDS.VOLUME_CHANGE[marketStatus];

    // 1. 优先检测价格字段（最重要）
    for (const field of CRITICAL_FIELDS.PRICE_FIELDS) {
      const change = this.checkFieldChange(
        newData,
        lastValues,
        field,
        priceThreshold,
      );
      if (change.hasChanged) {
        changedFields.push(field);
        if (change.isSignificant) {
          significantChanges.push(field);
        }
      }
    }

    // 2. 检测变化幅度字段
    for (const field of CRITICAL_FIELDS.CHANGE_FIELDS) {
      const change = this.checkFieldChange(
        newData,
        lastValues,
        field,
        priceThreshold,
      );
      if (change.hasChanged) {
        changedFields.push(field);
        if (change.isSignificant) {
          significantChanges.push(field);
        }
      }
    }

    // 3. 检测成交量字段
    for (const field of CRITICAL_FIELDS.VOLUME_FIELDS) {
      const change = this.checkFieldChange(
        newData,
        lastValues,
        field,
        volumeThreshold,
      );
      if (change.hasChanged) {
        changedFields.push(field);
        if (change.isSignificant) {
          significantChanges.push(field);
        }
      }
    }

    // 检查是否有价格相关的显著变化
    const hasSignificantPriceChange = significantChanges.some((field) =>
      CRITICAL_FIELDS.PRICE_FIELDS.includes(field as any),
    );

    if (hasSignificantPriceChange) {
      return this.createResult(
        true,
        changedFields,
        significantChanges,
        "价格显著变化",
        0.95,
      );
    }

    // 如果有任何显著变化，则报告 (非价格)
    if (significantChanges.length > 0) {
      return this.createResult(
        true,
        changedFields,
        significantChanges,
        "非交易时间-显著变化",
        0.9, // 置信度略低于价格直接变化
      );
    }

    // 4. 如果交易时间且有任何字段变化，认为需要更新
    if (marketStatus === MarketStatus.TRADING && changedFields.length > 0) {
      return this.createResult(
        true,
        changedFields,
        significantChanges,
        "交易时间-有变化",
        0.8,
      );
    }

    // 5. 非交易时间仅在显著变化时更新
    return this.createResult(
      false,
      changedFields,
      significantChanges,
      "变化不显著",
      0.7,
    );
  }

  /**
   * 检查单个字段的变化
   */
  private checkFieldChange(
    newData: any,
    lastValues: Record<string, number>,
    field: string,
    threshold: number,
  ): { hasChanged: boolean; isSignificant: boolean } {
    const newValue = this.extractNumericValue(newData, field);
    const lastValue = lastValues[field];

    if (newValue === null || lastValue === undefined) {
      return { hasChanged: false, isSignificant: false };
    }

    // 避免除零错误
    if (lastValue === 0) {
      const hasChanged = newValue !== 0;
      return { hasChanged, isSignificant: hasChanged };
    }

    const changeRate = Math.abs((newValue - lastValue) / lastValue);
    const hasChanged = changeRate > 1e-7; // 平衡精度和变化检测的阈值
    const isSignificant = changeRate > threshold;

    return { hasChanged, isSignificant };
  }

  /**
   * 从数据中提取数值型字段值
   * 支持嵌套路径，如 'secu_quote[0].last_done'
   */
  private extractNumericValue(data: any, fieldPath: string): number | null {
    try {
      // 支持简单字段和嵌套字段
      const paths = fieldPath.split(".");
      let value = data;

      for (const path of paths) {
        if (path.includes("[") && path.includes("]")) {
          // 处理数组索引，如 'secu_quote[0]'
          const [prop, indexStr] = path.split("[");
          const index = parseInt(indexStr.replace("]", ""));
          value = value?.[prop]?.[index];
        } else {
          value = value?.[path];
        }

        if (value === undefined || value === null) {
          return null;
        }
      }

      const numValue = typeof value === "number" ? value : parseFloat(value);
      return isNaN(numValue) ? null : numValue;
    } catch {
      return null;
    }
  }

  /**
   * 获取上次数据快照
   * 🎯 双层缓存策略：Redis (L1) + Memory (L2)
   */
  private async getLastSnapshot(symbol: string): Promise<DataSnapshot | null> {
    const startTime = Date.now();

    try {
      // Phase 2.7: Redis缓存逻辑 with unified cache key patterns
      const redisSnapshot = await this.getRedisSnapshot(symbol);
      if (redisSnapshot) {
        // Redis缓存命中，同步到内存缓存
        this.snapshotCache.set(symbol, redisSnapshot);

        this.emitCacheEvent("get", true, Date.now() - startTime, {
          cache_type: "redis",
          operation: "get_snapshot",
          symbol,
          cache_level: "L1",
        });

        return redisSnapshot;
      }

      // Redis未命中，尝试内存缓存
      const memorySnapshot = this.snapshotCache.get(symbol) || null;
      const hit = memorySnapshot !== null;

      if (memorySnapshot) {
        // 内存缓存命中，异步同步到Redis
        this.syncSnapshotToRedis(symbol, memorySnapshot).catch((error) => {
          this.logger.debug("异步同步快照到Redis失败", {
            symbol,
            error: error.message,
          });
        });
      }

      this.emitCacheEvent("get", hit, Date.now() - startTime, {
        cache_type: hit ? "memory" : "miss",
        operation: "get_snapshot",
        symbol,
        cache_level: hit ? "L2" : "miss",
      });

      return memorySnapshot;
    } catch (error) {
      // 故障容错：缓存获取失败，降级到内存缓存
      const fallbackSnapshot = this.snapshotCache.get(symbol) || null;

      this.emitCacheEvent(
        "get",
        fallbackSnapshot !== null,
        Date.now() - startTime,
        {
          cache_type: "fallback",
          operation: "get_snapshot",
          symbol,
          error: error.message,
          fallback_used: true,
        },
      );

      this.logger.warn("快照缓存获取失败，降级到内存缓存", {
        symbol,
        error: error.message,
        hasFallback: fallbackSnapshot !== null,
      });

      return fallbackSnapshot;
    }
  }

  /**
   * 从Redis获取数据快照
   * 🎯 统一缓存键模式: data_change_detector:snapshot:{symbol}
   */
  private async getRedisSnapshot(symbol: string): Promise<DataSnapshot | null> {
    try {
      const cacheKey = this.buildSnapshotCacheKey(symbol);
      return await this.cacheService.get<DataSnapshot>(cacheKey);
    } catch (error) {
      // 使用统一错误处理，但不抛出异常，降级到内存缓存
      this.logger.debug("Redis快照获取失败", {
        symbol,
        error: error.message,
        cacheKey: this.buildSnapshotCacheKey(symbol)
      });
      return null;
    }
  }

  /**
   * 异步同步快照到Redis
   * 🎯 内存到Redis的单向同步，避免阻塞主流程
   */
  private async syncSnapshotToRedis(
    symbol: string,
    snapshot: DataSnapshot,
  ): Promise<void> {
    try {
      const cacheKey = this.buildSnapshotCacheKey(symbol);
      const ttl = this.getSnapshotCacheTTL(symbol);

      await this.cacheService.set(cacheKey, snapshot, { ttl });
      this.logger.debug("Redis快照同步成功", { symbol, cacheKey, ttl });
    } catch (error) {
      // Silent failure for async sync - don't impact main flow
      this.logger.debug("Redis快照同步失败", {
        symbol,
        error: error.message,
        cacheKey: this.buildSnapshotCacheKey(symbol)
      });
    }
  }

  /**
   * 构建统一的快照缓存键
   * 🎯 统一缓存键模式，便于监控和管理
   */
  private buildSnapshotCacheKey(symbol: string): string {
    return `data_change_detector:snapshot:${symbol}`;
  }

  /**
   * 获取快照缓存TTL配置
   * 🎯 基于符号类型和市场状态的动态TTL
   */
  private getSnapshotCacheTTL(symbol: string): number {
    const baseTTL = {
      crypto: 30,
      us_stock: 60,
      hk_stock: 60,
      cn_stock: 60,
      default: 60,
    };

    const label = this.marketInferenceService.inferMarketLabel(symbol, {
      collapseChina: true,
      fallback: Market.US,
    });

    if (label === Market.CRYPTO) {
      return baseTTL.crypto;
    }
    if (label === Market.US) {
      return baseTTL.us_stock;
    }
    if (label === Market.HK) {
      return baseTTL.hk_stock;
    }
    if (label === Market.SZ || label === Market.SH || label === Market.CN || label === 'CN') {
      return baseTTL.cn_stock;
    }

    return baseTTL.default;
  }

  /**
   * 保存数据快照
   * 🎯 双写策略：Memory (立即) + Redis (异步)
   */
  private async saveSnapshot(symbol: string, data: any): Promise<void> {
    try {
      const snapshot: DataSnapshot = {
        symbol,
        timestamp: Date.now(),
        checksum: this.calculateQuickChecksum(data),
        criticalValues: this.extractCriticalValues(data),
      };

      // 立即写入内存缓存（同步操作）
      this.snapshotCache.set(symbol, snapshot);

      // 内存缓存大小控制
      if (this.snapshotCache.size > SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE) {
        this.cleanupOldSnapshots();
      }

      // Phase 2.7: 异步保存到Redis（不阻塞主流程）
      this.saveSnapshotToRedis(symbol, snapshot).catch((error) => {
        this.logger.debug("异步保存快照到Redis失败", {
          symbol,
          error: error.message,
        });
      });
    } catch (error) {
      this.logger.warn("保存数据快照失败", { symbol, error: error.message });
    }
  }

  /**
   * 异步保存快照到Redis
   * 🎯 后台异步持久化，提供跨实例数据共享
   */
  private async saveSnapshotToRedis(
    symbol: string,
    snapshot: DataSnapshot,
  ): Promise<void> {
    try {
      const cacheKey = this.buildSnapshotCacheKey(symbol);
      const ttl = this.getSnapshotCacheTTL(symbol);

      await this.cacheService.set(cacheKey, snapshot, { ttl });
      this.logger.debug("Redis快照保存成功", { symbol, cacheKey, ttl });
    } catch (error) {
      // Silent failure for async save - don't impact main flow
      this.logger.debug("Redis快照保存失败", {
        symbol,
        error: error.message,
        cacheKey: this.buildSnapshotCacheKey(symbol)
      });
    }
  }

  /**
   * 提取关键数值字段
   */
  private extractCriticalValues(data: any): Record<string, number> {
    const values: Record<string, number> = {};

    for (const fieldGroup of Object.values(CRITICAL_FIELDS)) {
      for (const field of fieldGroup) {
        const value = this.extractNumericValue(data, field);
        if (value !== null) {
          values[field] = value;
        }
      }
    }

    return values;
  }

  /**
   * 清理旧快照（LRU策略）
   */
  private cleanupOldSnapshots(): void {
    if (this.snapshotCache.size <= SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE) {
      return;
    }

    const entries = Array.from(this.snapshotCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // 精确删除超出限制数量的条目
    const deleteCount = entries.length - SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE;
    for (let i = 0; i < deleteCount; i++) {
      this.snapshotCache.delete(entries[i][0]);
    }
  }

  /**
   * 创建检测结果
   */
  private createResult(
    hasChanged: boolean,
    changedFields: string[],
    significantChanges: string[],
    reason: string,
    confidence: number,
  ): ChangeDetectionResult {
    return {
      hasChanged,
      changedFields,
      significantChanges,
      changeReason: reason,
      confidence,
    };
  }

  /**
   * 性能日志记录
   */
  private logPerformance(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    if (duration > 10) {
      // 超过10ms记录警告
      this.logger.warn("数据变化检测性能异常", { operation, duration });
    }
  }

  // ✅ 事件驱动监控方法
  private emitDetectionEvent(
    operation: string,
    statusCode: number,
    duration: number,
    metadata: any,
  ) {
    setImmediate(() => {
      try {
        // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
      } catch (error) {
        this.logger.warn("检测事件发送失败", {
          error: error.message,
          operation,
        });
      }
    });
  }

  private emitCacheEvent(
    operation: string,
    hit: boolean,
    duration: number,
    metadata: any,
  ) {
    setImmediate(() => {
      try {
        // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
      } catch (error) {
        this.logger.warn("缓存事件发送失败", {
          error: error.message,
          operation,
        });
      }
    });
  }
}
