import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createLogger } from '@common/logging/index';
import { SYSTEM_STATUS_EVENTS } from '../../../../../monitoring/contracts/events/system-status.events';
import { SymbolMapperCacheService } from './symbol-mapper-cache.service';
import {
  CACHE_EVENTS,
  CacheHitEvent,
  CacheMissEvent,
  CacheOperationStartEvent,
  CacheOperationCompleteEvent,
  CacheOperationErrorEvent,
  CacheDisabledEvent
} from '../interfaces/cache-events.interface';

@Injectable()
export class SymbolMapperCacheMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(SymbolMapperCacheMonitoringService.name);

  // 📊 缓存统计数据
  private cacheStats = {
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    l3: { hits: 0, misses: 0 },
    totalQueries: 0,
  };

  // 🔗 事件监听器引用 (用于清理)
  private eventListeners = new Map<string, (...args: any[]) => void>();

  constructor(
    private readonly eventBus: EventEmitter2,
    private readonly cacheService: SymbolMapperCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.setupEventListeners();
    this.logger.log('Symbol mapper cache monitoring service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.cleanupEventListeners();
    this.logger.log('Symbol mapper cache monitoring service destroyed');
  }

  /**
   * 🔗 设置事件监听器
   */
  private setupEventListeners(): void {
    // 缓存命中事件监听
    const hitListener = this.handleCacheHit.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.HIT, hitListener);
    this.eventListeners.set(CACHE_EVENTS.HIT, hitListener);

    // 缓存未命中事件监听
    const missListener = this.handleCacheMiss.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.MISS, missListener);
    this.eventListeners.set(CACHE_EVENTS.MISS, missListener);

    // 操作开始事件监听
    const startListener = this.handleOperationStart.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_START, startListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_START, startListener);

    // 操作完成事件监听
    const completeListener = this.handleOperationComplete.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_COMPLETE, completeListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_COMPLETE, completeListener);

    // 操作错误事件监听
    const errorListener = this.handleOperationError.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_ERROR, errorListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_ERROR, errorListener);

    // 缓存禁用事件监听
    const disabledListener = this.handleCacheDisabled.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.DISABLED, disabledListener);
    this.eventListeners.set(CACHE_EVENTS.DISABLED, disabledListener);
  }

  /**
   * 🧹 清理事件监听器
   */
  private cleanupEventListeners(): void {
    this.eventListeners.forEach((listener, event) => {
      this.cacheService.offCacheEvent(event as any, listener);
    });
    this.eventListeners.clear();
  }

  /**
   * 📊 处理缓存命中事件
   */
  private handleCacheHit(event: CacheHitEvent): void {
    // 更新统计数据
    this.cacheStats[event.layer].hits++;

    // 发送监控事件到全局事件总线
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_hit",
        metricValue: 1,
        tags: {
          layer: event.layer,
          provider: event.provider,
          cacheType: "symbol-mapper",
          operation: "hit",
          ...(event.symbol && { symbol: event.symbol }),
        },
      });
    });
  }

  /**
   * 📊 处理缓存未命中事件
   */
  private handleCacheMiss(event: CacheMissEvent): void {
    // 更新统计数据
    this.cacheStats[event.layer].misses++;

    // 发送监控事件到全局事件总线
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_miss",
        metricValue: 1,
        tags: {
          layer: event.layer,
          provider: event.provider,
          cacheType: "symbol-mapper",
          operation: "miss",
          ...(event.symbol && { symbol: event.symbol }),
        },
      });
    });
  }

  /**
   * 📊 处理操作开始事件
   */
  private handleOperationStart(event: CacheOperationStartEvent): void {
    this.cacheStats.totalQueries++;

    // 记录操作开始的调试日志
    this.logger.debug('Cache operation started', {
      provider: event.provider,
      symbolCount: event.symbolCount,
      direction: event.direction,
      isBatch: event.isBatch,
    });
  }

  /**
   * 📊 处理操作完成事件
   */
  private handleOperationComplete(event: CacheOperationCompleteEvent): void {
    const hitRatio = (event.cacheHits / event.symbolCount) * 100;
    const cacheEfficiency = hitRatio > 80 ? "high" : hitRatio > 50 ? "medium" : "low";

    // 记录性能日志
    this.logger.log('Cache operation completed', {
      provider: event.provider,
      symbolCount: event.symbolCount,
      cacheHits: event.cacheHits,
      hitRatio: Math.round(hitRatio),
      processingTime: event.processingTime,
      cacheEfficiency,
    });

    // 发送性能监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_mapper_cache",
        metricType: "performance",
        metricName: "mapping_performance",
        metricValue: event.processingTime,
        tags: {
          provider: event.provider,
          symbolsCount: event.symbolCount.toString(),
          hitRatio: Math.round(hitRatio).toString(),
          cacheEfficiency,
          cacheType: "symbol-mapper",
          direction: event.direction,
        },
      });
    });
  }

  /**
   * 📊 处理操作错误事件
   */
  private handleOperationError(event: CacheOperationErrorEvent): void {
    this.logger.error('Cache operation failed', {
      provider: event.provider,
      operation: event.operation,
      error: event.error,
      processingTime: event.processingTime,
      symbolCount: event.symbolCount,
    });

    // 发送错误监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_mapper_cache",
        metricType: "error",
        metricName: "cache_operation_error",
        metricValue: 1,
        tags: {
          provider: event.provider,
          operation: event.operation,
          error_type: "cache_operation",
          cacheType: "symbol-mapper",
        },
      });
    });
  }

  /**
   * 📊 处理缓存禁用事件
   */
  private handleCacheDisabled(event: CacheDisabledEvent): void {
    this.logger.warn('Symbol mapping cache disabled', {
      reason: event.reason,
      provider: event.provider,
      timestamp: new Date(event.timestamp).toISOString(),
    });

    // 发送缓存禁用监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_disabled",
        metricValue: 1,
        tags: {
          reason: event.reason,
          provider: event.provider,
          cacheType: "symbol-mapper",
        },
      });
    });
  }

  /**
   * 📊 获取缓存统计信息 (用于调试和监控)
   */
  getCacheStats() {
    return { ...this.cacheStats };
  }

  /**
   * 📊 重置缓存统计信息
   */
  resetCacheStats(): void {
    this.cacheStats = {
      l1: { hits: 0, misses: 0 },
      l2: { hits: 0, misses: 0 },
      l3: { hits: 0, misses: 0 },
      totalQueries: 0,
    };
    this.logger.log('Cache statistics reset');
  }
}