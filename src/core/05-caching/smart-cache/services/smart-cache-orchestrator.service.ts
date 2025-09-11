import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@app/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { CommonCacheService } from "../../common-cache/services/common-cache.service"; // Phase 5.2 重构：直接使用CommonCacheService
import { DataChangeDetectorService } from "../../../shared/services/data-change-detector.service";
import {
  MarketStatusService,
  MarketStatusResult,
} from "../../../shared/services/market-status.service";
import { BackgroundTaskService } from "@app/infrastructure/services/background-task.service";
import { Market, MarketStatus } from "../../../shared/constants/market.constants";
import {
  CacheStrategy,
  CacheOrchestratorRequest,
  CacheOrchestratorResult,
  BackgroundUpdateTask,
  MarketStatusQueryResult,
} from "../interfaces/smart-cache-orchestrator.interface";
import {
  type SmartCacheOrchestratorConfig,
  SMART_CACHE_ORCHESTRATOR_CONFIG,
  StrongTimelinessConfig,
  WeakTimelinessConfig,
  AdaptiveConfig,
  MarketAwareConfig,
  NoCacheConfig,
  DEFAULT_SMART_CACHE_CONFIG,
} from "../interfaces/smart-cache-config.interface";
import { 
  SMART_CACHE_CONSTANTS,
  SmartCacheConstantsType 
} from '../constants/smart-cache.constants';
import { 
  SMART_CACHE_COMPONENT,
  LogContext,
  OperationType,
  MetricType 
} from '../constants/smart-cache.component.constants';

/**
 * 智能缓存编排器服务 - Phase 5.2 重构版
 *
 * 核心功能：
 * - 统一Receiver与Query的缓存调用骨架
 * - 策略映射：将CacheStrategy转换为CommonCacheService可识别的参数
 * - 后台更新调度：TTL节流、去重、优先级计算
 * - 生命周期管理：初始化和优雅关闭
 *
 * Phase 5.2重构改进：
 * - 直接使用CommonCacheService进行缓存操作
 * - 简化策略映射逻辑，使用CommonCacheService.calculateOptimalTTL
 * - 优化后台任务处理性能
 * - 保持API兼容性，内部实现完全重构
 *
 * 设计原则：
 * - 保持现有API接口不变
 * - 内部实现完全基于CommonCacheService
 * - 提高缓存操作性能
 * - 简化依赖关系
 */

@Injectable()
export class SmartCacheOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(SMART_CACHE_COMPONENT.LOG_CONTEXTS.ORCHESTRATOR_SERVICE);

  /** 后台更新任务管理Map：cacheKey -> BackgroundUpdateTask */
  private readonly backgroundUpdateTasks = new Map<
    string,
    BackgroundUpdateTask
  >();

  /** 更新任务队列：按优先级排序的待执行任务 */
  private readonly updateQueue: BackgroundUpdateTask[] = [];

  /** 正在处理的任务数量 */
  private activeTaskCount = 0;

  /** 服务状态：是否正在关闭 */
  private isShuttingDown = false;

  /** 上次市场状态查询结果缓存 */
  private lastMarketStatusQuery: MarketStatusQueryResult | null = null;

  /** 定时器资源管理 - 防止内存泄漏 */
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(
    @Inject(SMART_CACHE_ORCHESTRATOR_CONFIG)
    private readonly rawConfig: SmartCacheOrchestratorConfig,

    private readonly commonCacheService: CommonCacheService, // Phase 5.2 重构：直接使用CommonCacheService
    private readonly dataChangeDetectorService: DataChangeDetectorService,
    private readonly marketStatusService: MarketStatusService,
    private readonly backgroundTaskService: BackgroundTaskService,
    private readonly eventBus: EventEmitter2, // 事件化监控：只注入事件总线
  ) {
    this.logger.log("SmartCacheOrchestrator service initializing...");

    // 验证并合并配置，提供默认值保护
    this.validateAndInitializeConfig();
  }

  /** 验证和初始化配置的安全配置 */
  private config: SmartCacheOrchestratorConfig;

  /**
   * 验证并初始化配置，提供默认值回退保护
   */
  private validateAndInitializeConfig(): void {
    try {
      // 提供默认配置保护 - 使用统一常量定义的默认配置
      const defaultConfig: SmartCacheOrchestratorConfig = DEFAULT_SMART_CACHE_CONFIG;

      // 合并配置，使用默认值作为回退
      this.config = {
        defaultMinUpdateInterval: this.validateNumber(
          this.rawConfig?.defaultMinUpdateInterval,
          defaultConfig.defaultMinUpdateInterval,
          5000,
          SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS * 10, // 300000ms
        ),
        maxConcurrentUpdates: this.validateNumber(
          this.rawConfig?.maxConcurrentUpdates,
          defaultConfig.maxConcurrentUpdates,
          SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT,
          SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_CONCURRENT_UPDATES_COUNT,
        ),
        enableBackgroundUpdate:
          this.rawConfig?.enableBackgroundUpdate ??
          defaultConfig.enableBackgroundUpdate,
        enableDataChangeDetection:
          this.rawConfig?.enableDataChangeDetection ??
          defaultConfig.enableDataChangeDetection,
        enableMetrics:
          this.rawConfig?.enableMetrics ?? defaultConfig.enableMetrics,
        gracefulShutdownTimeout: this.validateNumber(
          this.rawConfig?.gracefulShutdownTimeout,
          defaultConfig.gracefulShutdownTimeout,
          10000,
          SMART_CACHE_CONSTANTS.INTERVALS_MS.GRACEFUL_SHUTDOWN_TIMEOUT_MS * 4, // 120000ms
        ),
        strategies: {
          ...defaultConfig.strategies,
          ...this.rawConfig?.strategies,
        },
      };

      this.logger.log("Configuration validated and initialized successfully", {
        defaultMinUpdateInterval: this.config.defaultMinUpdateInterval,
        maxConcurrentUpdates: this.config.maxConcurrentUpdates,
        enableBackgroundUpdate: this.config.enableBackgroundUpdate,
        strategiesCount: Object.keys(this.config.strategies).length,
      });
    } catch (error) {
      this.logger.error(
        "Configuration validation failed, using emergency defaults",
        error,
      );

      // 紧急默认配置 - 使用常量定义的保守配置
      this.config = {
        defaultMinUpdateInterval: SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS * 2, // 60000ms
        maxConcurrentUpdates: SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT,
        enableBackgroundUpdate: false, // 保守地禁用后台更新
        enableDataChangeDetection: false,
        enableMetrics: false,
        gracefulShutdownTimeout: SMART_CACHE_CONSTANTS.INTERVALS_MS.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
        strategies: {
          [CacheStrategy.STRONG_TIMELINESS]: {
            ttl: SMART_CACHE_CONSTANTS.TTL_SECONDS.STRONG_TIMELINESS_DEFAULT_S,
            enableBackgroundUpdate: false,
            updateThresholdRatio: 0.5,
            forceRefreshInterval: 600,
            enableDataChangeDetection: false,
          },
          [CacheStrategy.WEAK_TIMELINESS]: {
            ttl: SMART_CACHE_CONSTANTS.TTL_SECONDS.WEAK_TIMELINESS_DEFAULT_S,
            enableBackgroundUpdate: false,
            updateThresholdRatio: 0.5,
            minUpdateInterval: 120,
            enableDataChangeDetection: false,
          },
          [CacheStrategy.ADAPTIVE]: {
            baseTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.WEAK_TIMELINESS_DEFAULT_S,
            minTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MIN_S * 2, // 60s
            maxTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.MARKET_CLOSED_DEFAULT_S,
            adaptationFactor: 1.0,
            enableBackgroundUpdate: false,
            changeDetectionWindow: SMART_CACHE_CONSTANTS.TTL_SECONDS.MARKET_CLOSED_DEFAULT_S,
            enableDataChangeDetection: false,
          },
          [CacheStrategy.MARKET_AWARE]: {
            openMarketTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MIN_S * 2, // 60s
            closedMarketTtl: SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MAX_S,
            enableBackgroundUpdate: false,
            marketStatusCheckInterval: SMART_CACHE_CONSTANTS.TTL_SECONDS.WEAK_TIMELINESS_DEFAULT_S,
            openMarketUpdateThresholdRatio: 0.5,
            closedMarketUpdateThresholdRatio: 0.2,
            enableDataChangeDetection: false,
          },
          [CacheStrategy.NO_CACHE]: {
            bypassCache: true,
            enableMetrics: false,
          },
        },
      };
    }
  }

  /**
   * 验证数值配置的有效性
   */
  private validateNumber(
    value: number | undefined,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    if (
      typeof value !== "number" ||
      isNaN(value) ||
      value < min ||
      value > max
    ) {
      this.logger.warn(
        `Invalid number configuration: ${value}, using default: ${defaultValue}`,
      );
      return defaultValue;
    }
    return value;
  }

  /**
   * 模块初始化
   * 设置后台任务处理和监控指标
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("SmartCacheOrchestrator service started");

    // 初始化监控指标（复用Query现有指标名称）
    if (this.config.enableMetrics) {
      this.initializeMetrics();
    }

    // 启动后台任务处理队列
    if (this.config.enableBackgroundUpdate) {
      this.startBackgroundTaskProcessor();
    }

    this.logger.log(
      `SmartCacheOrchestrator initialized with config: ${JSON.stringify({
        defaultMinUpdateInterval: this.config.defaultMinUpdateInterval,
        maxConcurrentUpdates: this.config.maxConcurrentUpdates,
        enableBackgroundUpdate: this.config.enableBackgroundUpdate,
        enableDataChangeDetection: this.config.enableDataChangeDetection,
      })}`,
    );
  }

  /**
   * 模块销毁 - 优雅关闭
   * 等待所有backgroundUpdateTasks至超时，超时后停止新任务、清空待执行队列并记录告警
   * 不强制取消进行中任务
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("SmartCacheOrchestrator shutting down...");
    this.isShuttingDown = true;

    // 清理所有定时器资源
    this.clearAllTimers();

    // 停止接受新的后台更新任务
    this.backgroundUpdateTasks.clear();

    // 等待所有进行中的任务完成或超时
    const shutdownTimeout = this.config.gracefulShutdownTimeout;
    const startTime = Date.now();

    while (
      this.activeTaskCount > 0 &&
      Date.now() - startTime < shutdownTimeout
    ) {
      this.logger.log(
        `Waiting for ${this.activeTaskCount} active tasks to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 每秒检查一次
    }

    // 超时处理
    if (this.activeTaskCount > 0) {
      this.logger.warn(
        `Graceful shutdown timeout reached. ${this.activeTaskCount} tasks still active.`,
      );

      // 记录告警指标 - 事件化监控
      if (this.config.enableMetrics) {
        setImmediate(() => {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            metricType: "cache",
            metricName: "background_task_failed",
            metricValue: this.activeTaskCount,
            tags: {
              operation: "background_task_failed",
              componentType: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
              activeTaskCount: this.activeTaskCount,
              reason: "shutdown_timeout",
            },
          });
        });
      }
    }

    // 清空待执行队列
    const pendingTaskCount = this.updateQueue.length;
    this.updateQueue.length = 0;

    if (pendingTaskCount > 0) {
      this.logger.warn(
        `Cleared ${pendingTaskCount} pending background update tasks during shutdown`,
      );
    }

    this.logger.log("SmartCacheOrchestrator shutdown completed");
  }

  /**
   * 初始化监控指标
   * 复用Query现有指标名称：queryBackgroundTasksActive/Completed/Failed
   */
  private initializeMetrics(): void {
    try {
      // 指标通过CollectorService事件驱动方式记录：
      // - queryBackgroundTasksActive (Gauge)
      // - queryBackgroundTasksCompleted (Counter)
      // - queryBackgroundTasksFailed (Counter)

      this.logger.log("Metrics initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize metrics", error);
    }
  }

  /**
   * 启动后台任务处理器
   * 定期检查队列并执行任务
   */
  private startBackgroundTaskProcessor(): void {
    const processingInterval = Math.min(
      this.config.defaultMinUpdateInterval / 2,
      5000,
    ); // 最多5秒检查一次

    const timer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.processUpdateQueue();
      }
    }, processingInterval);

    // 添加到定时器管理集合
    this.timers.add(timer);

    this.logger.log(
      `Background task processor started with ${processingInterval}ms interval`,
    );
  }

  /**
   * 处理更新任务队列
   * 按优先级执行等待中的后台更新任务
   */
  private async processUpdateQueue(): Promise<void> {
    // 检查并发限制
    if (this.activeTaskCount >= this.config.maxConcurrentUpdates) {
      return;
    }

    // 按优先级排序（高优先级在前）
    this.updateQueue.sort((a, b) => b.priority - a.priority);

    // 执行可用的任务
    while (
      this.updateQueue.length > 0 &&
      this.activeTaskCount < this.config.maxConcurrentUpdates
    ) {
      const task = this.updateQueue.shift()!;

      if (Date.now() >= task.scheduledAt) {
        this.executeBackgroundUpdate(task);
      } else {
        // 任务未到执行时间，放回队列
        this.updateQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * 执行后台更新任务
   * Phase 5.2重构：直接使用CommonCacheService，提高性能
   */
  private async executeBackgroundUpdate(
    task: BackgroundUpdateTask,
  ): Promise<void> {
    this.activeTaskCount++;
    task.status = "running";

    // 更新活跃任务指标 - 事件化监控
    if (this.config.enableMetrics) {
      setImmediate(() => {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "smart_cache_orchestrator",
          metricType: "cache",
          metricName: "active_tasks_count",
          metricValue: this.activeTaskCount,
          tags: {
            operation: "active_tasks_count",
            activeTaskCount: this.activeTaskCount,
            componentType: "smart_cache_orchestrator",
          },
        });
      });
    }

    try {
      this.logger.debug(
        `Executing background update for cache key: ${task.cacheKey}`,
      );

      // 执行数据获取
      const freshData = await task.fetchFn();

      // Phase 5.2 重构：直接使用CommonCacheService计算TTL
      const symbol = task.symbols?.[0] || "unknown";
      const dataType = this.inferDataTypeFromKey(task.cacheKey);

      // 动态获取市场状态
      let marketStatus = undefined;
      if (task.market && task.symbols && task.symbols.length > 0) {
        try {
          const marketStatusResult = await this.getMarketStatusForSymbols(
            task.symbols,
          );
          if (
            marketStatusResult.success &&
            marketStatusResult.marketStatus[task.market]
          ) {
            const status = marketStatusResult.marketStatus[task.market];
            marketStatus = {
              isOpen: status.status === "TRADING",
              timezone: status.timezone,
              nextStateChange: undefined,
            };
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get market status for background update: ${task.cacheKey}`,
            error,
          );
          // 使用默认状态
          marketStatus = {
            isOpen: false, // 保守默认为闭市
            timezone: "UTC",
          };
        }
      }

      const dataSize = JSON.stringify(freshData).length;
      const accessPattern = marketStatus?.isOpen ? "hot" : "warm";
      const ttlResult = CommonCacheService.calculateOptimalTTL(
        dataSize,
        accessPattern,
      );

      // 直接写入缓存
      await this.commonCacheService.set(task.cacheKey, freshData, ttlResult);

      // 数据变化检测（如果启用）
      if (this.config.enableDataChangeDetection) {
        try {
          // 从缓存键中提取符号（假设格式为 provider:type:symbol）
          const symbol = this.extractSymbolFromKey(task.cacheKey);
          const market = task.market || this.inferMarketFromSymbol(symbol);

          // 获取市场状态（getMarketStatusForSymbol返回字符串状态）
          const marketStatusString =
            await this.getMarketStatusForSymbol(symbol);
          const marketStatus =
            marketStatusString === "TRADING" ? "TRADING" : "CLOSED";

          const changeResult =
            await this.dataChangeDetectorService.detectSignificantChange(
              symbol,
              freshData,
              market,
              marketStatus as any, // MarketStatus enum
            );

          if (changeResult.hasChanged) {
            this.logger.log(
              `Significant data change detected for ${task.cacheKey}`,
              {
                cacheKey: task.cacheKey,
                symbol,
                changedFields: changeResult.changedFields,
                significantChanges: changeResult.significantChanges,
                confidence: changeResult.confidence,
                reason: changeResult.changeReason,
              },
            );

            // 如果有显著变化且置信度高，可能需要更激进的缓存更新策略
            if (
              changeResult.significantChanges.length > 0 &&
              changeResult.confidence > 0.8
            ) {
              // 记录重要变化事件，可用于触发下游更新
              this.logger.warn(
                `Critical data change detected for ${task.cacheKey}`,
                {
                  symbol,
                  significantChanges: changeResult.significantChanges,
                  confidence: changeResult.confidence,
                },
              );

              // 可以在这里触发其他相关缓存的更新
              // 例如：清除相关的聚合数据缓存等
            }
          }
        } catch (error) {
          // 数据变化检测失败不应影响主流程
          this.logger.warn(
            `Data change detection failed for ${task.cacheKey}`,
            {
              error: error.message,
            },
          );
        }
      }

      task.status = "completed";
      this.logger.debug(
        `Background update completed for cache key: ${task.cacheKey}`,
      );

      // 更新完成指标 - 事件化监控
      if (this.config.enableMetrics) {
        setImmediate(() => {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            metricType: "cache",
            metricName: "background_task_completed",
            metricValue: Date.now() - task.scheduledAt,
            tags: {
              operation: "background_task_completed",
              cacheKey: task.cacheKey,
              componentType: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            },
          });
        });
      }
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      task.retryCount++;

      this.logger.error(
        `Background update failed for cache key: ${task.cacheKey}`,
        error,
      );

      // 重试逻辑
      if (task.retryCount < task.maxRetries) {
        task.status = "pending";
        task.scheduledAt = Date.now() + task.retryCount * SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS; // 递增延迟重试
        this.updateQueue.push(task);
        this.logger.log(
          `Scheduled retry ${task.retryCount}/${task.maxRetries} for cache key: ${task.cacheKey}`,
        );
      } else {
        this.logger.error(
          `Background update failed permanently for cache key: ${task.cacheKey} after ${task.maxRetries} retries`,
        );
      }

      // 更新失败指标 - 事件化监控
      if (this.config.enableMetrics) {
        setImmediate(() => {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            metricType: "cache",
            metricName: "background_task_failed",
            metricValue: 1,
            tags: {
              operation: "background_task_failed",
              cacheKey: task.cacheKey,
              error: error.message,
              componentType: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            },
          });
        });
      }
    } finally {
      this.activeTaskCount--;

      // 从任务管理Map中移除已完成/失败的任务
      if (task.status !== "pending") {
        this.backgroundUpdateTasks.delete(task.cacheKey);
      }

      // 更新活跃任务指标 - 事件化监控
      if (this.config.enableMetrics) {
        setImmediate(() => {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            metricType: "cache",
            metricName: "active_tasks_count_updated",
            metricValue: this.activeTaskCount,
            tags: {
              operation: "active_tasks_count_updated",
              activeTaskCount: this.activeTaskCount,
              componentType: SMART_CACHE_COMPONENT.IDENTIFIERS.NAME,
            },
          });
        });
      }
    } // finally 块结束
  }

  // ===================
  // 公共接口方法
  // Phase 5.2重构：直接使用CommonCacheService实现
  // ===================

  /**
   * 获取单个数据的智能缓存
   * Phase 5.2重构：基于CommonCacheService实现，简化策略映射
   */
  async getDataWithSmartCache<T>(
    request: CacheOrchestratorRequest<T>,
  ): Promise<CacheOrchestratorResult<T>> {
    try {
      // 处理NO_CACHE策略的直取直返
      if (request.strategy === CacheStrategy.NO_CACHE) {
        this.logger.debug(
          `NO_CACHE strategy for key: ${request.cacheKey}, fetching fresh data`,
        );

        const freshData = await request.fetchFn();

        return {
          data: freshData,
          hit: false,
          strategy: request.strategy,
          storageKey: request.cacheKey,
          timestamp: new Date().toISOString(),
        };
      }

      // Phase 5.2重构：直接使用CommonCacheService计算TTL
      const symbol = request.symbols?.[0] || "unknown";
      const dataType = this.inferDataTypeFromKey(request.cacheKey);

      // 获取市场状态（如果是市场感知策略）
      let marketStatus = undefined;
      if (request.strategy === CacheStrategy.MARKET_AWARE) {
        const marketStatusResult = await this.getMarketStatusForSymbols(
          request.symbols,
        );
        marketStatus = {
          isOpen: Object.values(marketStatusResult.marketStatus).some(
            (status) => status.status === "TRADING",
          ),
          timezone:
            Object.values(marketStatusResult.marketStatus)[0]?.timezone ||
            "UTC",
        };
      }

      // 计算优化TTL
      // 计算数据大小和访问模式
      const dataSize = 1024; // 估计数据大小，可以根据实际情况调整
      const freshnessRequirement = this.mapStrategyToFreshnessRequirement(
        request.strategy,
      );
      const accessPattern =
        freshnessRequirement === "realtime"
          ? "hot"
          : freshnessRequirement === "analytical"
            ? "warm"
            : "cold";
      const ttlResult = CommonCacheService.calculateOptimalTTL(
        dataSize,
        accessPattern,
      );

      // 直接使用CommonCacheService获取数据
      const cacheResult = await this.commonCacheService.getWithFallback(
        request.cacheKey,
        request.fetchFn,
        {
          enableDecompression: true,
          cacheFallbackResult: true,
          fallbackTTL: ttlResult,
        },
      );

      // 转换为标准化结果格式
      const result: CacheOrchestratorResult<T> = {
        data: cacheResult.data as T,
        hit: cacheResult.data !== null,
        ttlRemaining: cacheResult.metadata?.ttlRemaining || 0,
        dynamicTtl: ttlResult,
        strategy: request.strategy,
        storageKey: request.cacheKey,
        timestamp: new Date().toISOString(),
      };

      // 触发后台更新任务（如果策略支持且缓存命中）
      if (
        result.hit &&
        this.shouldScheduleBackgroundUpdate(request.strategy, {
          metadata: cacheResult,
        })
      ) {
        const priority = this.calculateUpdatePriority(
          request.symbols,
          request.metadata?.market,
        );

        this.scheduleBackgroundUpdate(
          request.cacheKey,
          request.symbols,
          request.fetchFn,
          priority,
        );
      }

      this.logger.debug(
        `Cache operation completed for key: ${request.cacheKey}`,
        {
          hit: result.hit,
          strategy: result.strategy,
          ttlRemaining: result.ttlRemaining,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Cache operation failed for key: ${request.cacheKey}`,
        error,
      );

      // 发生错误时，尝试直接获取数据
      try {
        const fallbackData = await request.fetchFn();

        return {
          data: fallbackData,
          hit: false,
          strategy: request.strategy,
          storageKey: request.cacheKey,
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      } catch (fetchError) {
        this.logger.error(
          `Fallback fetch also failed for key: ${request.cacheKey}`,
          fetchError,
        );
        throw fetchError;
      }
    }
  }

  /**
   * 批量获取数据的智能缓存
   * Phase 5.2重构：直接使用CommonCacheService的mget功能
   */
  async batchGetDataWithSmartCache<T>(
    requests: CacheOrchestratorRequest<T>[],
  ): Promise<CacheOrchestratorResult<T>[]> {
    if (!requests || requests.length === 0) {
      return [];
    }

    try {
      // 分组处理：按策略分组以便批量优化
      const strategyGroups = new Map<
        CacheStrategy,
        CacheOrchestratorRequest<T>[]
      >();

      requests.forEach((request, index) => {
        if (!strategyGroups.has(request.strategy)) {
          strategyGroups.set(request.strategy, []);
        }
        strategyGroups
          .get(request.strategy)!
          .push({ ...request, originalIndex: index } as any);
      });

      // 处理每个策略组
      const allGroupResults: Array<{
        result: CacheOrchestratorResult<T>;
        originalIndex: number;
      }> = [];

      for (const [strategy, groupRequests] of strategyGroups) {
        try {
          const groupResults = await this.processBatchGroup(
            strategy,
            groupRequests,
          );
          allGroupResults.push(...groupResults);
        } catch (error) {
          this.logger.error(
            `Batch group processing failed for strategy ${strategy}:`,
            error,
          );

          // 为失败的组创建fallback结果
          for (const request of groupRequests) {
            const originalIndex = (request as any).originalIndex;
            allGroupResults.push({
              result: {
                data: null as any,
                hit: false,
                strategy: request.strategy,
                storageKey: request.cacheKey,
                timestamp: new Date().toISOString(),
                error: error.message,
              },
              originalIndex,
            });
          }
        }
      }

      // 按原始顺序重新排列结果
      const sortedResults = new Array(requests.length);
      allGroupResults.forEach(({ result, originalIndex }) => {
        sortedResults[originalIndex] = result;
      });

      // 批量处理后台更新触发
      await this.batchScheduleBackgroundUpdates(sortedResults, requests);

      this.logger.debug(`Batch cache operation completed`, {
        totalRequests: requests.length,
        successCount: sortedResults.filter((r) => !r.error).length,
        errorCount: sortedResults.filter((r) => r.error).length,
      });

      return sortedResults;
    } catch (error) {
      this.logger.error("Batch cache operation failed:", error);

      // 全局失败时，为每个请求创建fallback结果
      return requests.map((request) => ({
        data: null as any,
        hit: false,
        strategy: request.strategy,
        storageKey: request.cacheKey,
        timestamp: new Date().toISOString(),
        error: error.message,
      }));
    }
  }

  /**
   * 处理批量缓存组（按策略分组）
   * Phase 5.2重构：使用CommonCacheService的mget进行批量优化
   */
  private async processBatchGroup<T>(
    strategy: CacheStrategy,
    requests: CacheOrchestratorRequest<T>[],
  ): Promise<
    Array<{ result: CacheOrchestratorResult<T>; originalIndex: number }>
  > {
    const results: Array<{
      result: CacheOrchestratorResult<T>;
      originalIndex: number;
    }> = [];

    // 处理NO_CACHE策略：并行执行所有fetchFn
    if (strategy === CacheStrategy.NO_CACHE) {
      const promises = requests.map(async (request) => {
        try {
          const data = await request.fetchFn();
          return {
            result: {
              data,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
            },
            originalIndex: (request as any).originalIndex,
          };
        } catch (error) {
          this.logger.error(
            `NO_CACHE fetch failed for key: ${request.cacheKey}`,
            error,
          );
          return {
            result: {
              data: null as any,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
              error: error.message,
            },
            originalIndex: (request as any).originalIndex,
          };
        }
      });

      return await Promise.all(promises);
    }

    // 对于其他策略，使用CommonCacheService的批量API
    try {
      // Phase 5.2重构：直接使用CommonCacheService.mget
      const keys = requests.map((req) => req.cacheKey);
      const cacheResults = await this.commonCacheService.mget<T>(keys);

      // 识别缓存未命中的查询
      const missedQueries = [];
      const finalResults = new Array(requests.length);

      for (let i = 0; i < requests.length; i++) {
        const cacheResult = cacheResults[i];
        if (cacheResult?.data) {
          finalResults[i] = {
            result: {
              data: cacheResult.data,
              hit: true,
              ttlRemaining: cacheResult.ttlRemaining,
              strategy: requests[i].strategy,
              storageKey: requests[i].cacheKey,
              timestamp: new Date().toISOString(),
            },
            originalIndex: (requests[i] as any).originalIndex,
          };
        } else {
          missedQueries.push({ index: i, request: requests[i] });
        }
      }

      this.logger.debug(
        `Batch query cache stats: total=${requests.length}, hit=${requests.length - missedQueries.length}, miss=${missedQueries.length}`,
      );

      // 并发执行缓存未命中的查询
      if (missedQueries.length > 0) {
        await this.handleMissedQueries(missedQueries, finalResults);
      }

      return finalResults;
    } catch (error) {
      this.logger.warn(
        `Batch cache API failed for strategy ${strategy}, falling back to individual requests:`,
        error,
      );

      // Fallback：逐个处理请求
      for (const request of requests) {
        try {
          const individualResult = await this.getDataWithSmartCache(request);
          results.push({
            result: individualResult,
            originalIndex: (request as any).originalIndex,
          });
        } catch (individualError) {
          this.logger.error(
            `Individual cache request failed for key: ${request.cacheKey}`,
            individualError,
          );
          results.push({
            result: {
              data: null as any,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
              error: individualError.message,
            },
            originalIndex: (request as any).originalIndex,
          });
        }
      }
    }

    return results;
  }

  /**
   * 处理缓存未命中的查询
   * Phase 5.2重构：优化并发处理，直接写入CommonCacheService
   */
  private async handleMissedQueries<T>(
    missedQueries: Array<{
      index: number;
      request: CacheOrchestratorRequest<T>;
    }>,
    finalResults: any[],
  ): Promise<void> {
    const concurrency = 5; // 控制并发数量避免过载

    for (let i = 0; i < missedQueries.length; i += concurrency) {
      const batch = missedQueries.slice(i, i + concurrency);

      const batchPromises = batch.map(async ({ index, request }) => {
        try {
          const data = await request.fetchFn();

          // Phase 5.2重构：计算智能TTL并直接写入CommonCacheService
          const symbol = request.symbols?.[0] || "unknown";
          const dataType = this.inferDataTypeFromKey(request.cacheKey);

          // 计算最优TTL
          const dataSize = JSON.stringify(data).length;
          const freshnessRequirement = this.mapStrategyToFreshnessRequirement(
            request.strategy,
          );
          const accessPattern =
            freshnessRequirement === "realtime"
              ? "hot"
              : freshnessRequirement === "analytical"
                ? "warm"
                : "cold";
          const ttlResult = CommonCacheService.calculateOptimalTTL(
            dataSize,
            accessPattern,
          );

          // 异步设置缓存
          this.commonCacheService
            .set(request.cacheKey, data, ttlResult)
            .catch((error) => {
              this.logger.warn(
                `Failed to cache query result for ${request.cacheKey}:`,
                error,
              );
            });

          finalResults[index] = {
            result: {
              data,
              hit: false,
              ttlRemaining: ttlResult,
              dynamicTtl: ttlResult,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
            },
            originalIndex: (request as any).originalIndex,
          };
        } catch (error) {
          this.logger.error(
            `Failed to fetch data for query ${request.cacheKey}:`,
            error,
          );
          finalResults[index] = {
            result: {
              data: null,
              hit: false,
              ttlRemaining: 0,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
              error: error.message,
            },
            originalIndex: (request as any).originalIndex,
          };
        }
      });

      await Promise.all(batchPromises);
    }
  }

  /**
   * 批量处理后台更新触发
   * 对需要后台更新的请求进行批量调度
   */
  private async batchScheduleBackgroundUpdates<T>(
    results: CacheOrchestratorResult<T>[],
    originalRequests: CacheOrchestratorRequest<T>[],
  ): Promise<void> {
    if (!this.config.enableBackgroundUpdate) {
      return;
    }

    const updateTasks: Array<{
      cacheKey: string;
      symbols: string[];
      fetchFn: () => Promise<T>;
      priority: number;
    }> = [];

    results.forEach((result, index) => {
      const originalRequest = originalRequests[index];

      if (
        result.hit &&
        this.shouldScheduleBackgroundUpdate(result.strategy, {
          metadata: result,
        })
      ) {
        const priority = this.calculateUpdatePriority(
          originalRequest.symbols,
          originalRequest.metadata?.market,
        );

        updateTasks.push({
          cacheKey: originalRequest.cacheKey,
          symbols: originalRequest.symbols,
          fetchFn: originalRequest.fetchFn,
          priority,
        });
      }
    });

    // 批量调度后台更新任务
    updateTasks.forEach((task) => {
      this.scheduleBackgroundUpdate(
        task.cacheKey,
        task.symbols,
        task.fetchFn,
        task.priority,
      );
    });

    if (updateTasks.length > 0) {
      this.logger.debug(
        `Scheduled ${updateTasks.length} background update tasks from batch operation`,
      );
    }
  }

  /**
   * Phase 5.4: 高性能缓存预热
   * 主动预热热点查询数据，提升系统响应速度
   */
  async warmupHotQueries(
    hotQueries: Array<{
      key: string;
      request: CacheOrchestratorRequest<any>;
      priority?: number;
    }>,
  ): Promise<
    Array<{
      key: string;
      success: boolean;
      duration?: number;
      ttl?: number;
      error?: string;
    }>
  > {
    // 按优先级排序预热任务
    const sortedQueries = hotQueries.sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    const warmupResults = [];
    const concurrencyLimit = 3; // 控制并发数避免系统过载

    this.logger.log(`开始缓存预热: ${hotQueries.length} 个查询`);

    // 分批并发执行预热任务
    for (let i = 0; i < sortedQueries.length; i += concurrencyLimit) {
      const batch = sortedQueries.slice(i, i + concurrencyLimit);

      const batchPromises = batch.map(async (query) => {
        const startTime = Date.now();

        try {
          // 检查是否已存在有效缓存
          const existingResult = await this.commonCacheService.get(query.key);
          const ttlRemaining = existingResult.metadata?.ttlRemaining || 0;
          if (existingResult?.data && ttlRemaining > 60) {
            this.logger.debug(`跳过预热已缓存的key: ${query.key}`);
            return {
              key: query.key,
              success: true,
              duration: Date.now() - startTime,
              ttl: ttlRemaining,
              skipped: true,
            };
          }

          // 执行缓存预热
          const result = await this.getDataWithSmartCache(query.request);

          const duration = Date.now() - startTime;
          this.logger.debug(`缓存预热完成: ${query.key} (${duration}ms)`);

          return {
            key: query.key,
            success: true,
            duration,
            ttl: result.ttlRemaining || 0,
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.warn(`缓存预热失败: ${query.key}`, error);

          return {
            key: query.key,
            success: false,
            duration,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          warmupResults.push(result.value);
        } else {
          warmupResults.push({
            key: "unknown",
            success: false,
            error: result.reason?.message || "未知错误",
          });
        }
      });
    }

    const successCount = warmupResults.filter((r) => r.success).length;
    this.logger.log(`缓存预热完成: ${successCount}/${hotQueries.length} 成功`);

    return warmupResults;
  }

  /**
   * Phase 5.4: 智能并发控制的批量获取
   * 优化的批量获取方法，支持智能并发控制和错误隔离
   */
  async getBatchDataWithOptimizedConcurrency<T>(
    requests: Array<CacheOrchestratorRequest<T>>,
    options: {
      concurrency?: number;
      enableCache?: boolean;
      errorIsolation?: boolean;
      retryFailures?: boolean;
    } = {},
  ): Promise<Array<CacheOrchestratorResult<T>>> {
    const {
      concurrency = 5,
      enableCache = true,
      errorIsolation = true,
      retryFailures = true,
    } = options;

    if (!enableCache) {
      return this.executeConcurrentRequests(requests, concurrency);
    }

    try {
      // 1. 批量缓存检查
      const keys = requests.map((req) => req.cacheKey);
      const cacheResults = await this.commonCacheService.mget<T>(keys);

      // 2. 识别缓存未命中的请求
      const missedRequests = [];
      const finalResults = new Array(requests.length);

      for (let i = 0; i < requests.length; i++) {
        const cacheResult = cacheResults[i];
        if (cacheResult?.data) {
          finalResults[i] = {
            data: cacheResult.data,
            hit: true,
            ttlRemaining: cacheResult.ttlRemaining,
            strategy: requests[i].strategy,
            storageKey: requests[i].cacheKey,
          };
        } else {
          missedRequests.push({ index: i, request: requests[i] });
        }
      }

      this.logger.debug(
        `批量查询缓存统计: total=${requests.length}, hit=${requests.length - missedRequests.length}, miss=${missedRequests.length}`,
      );

      // 3. 处理缓存未命中的请求
      if (missedRequests.length > 0) {
        await this.handleMissedRequestsOptimized(
          missedRequests,
          finalResults,
          concurrency,
          errorIsolation,
          retryFailures,
        );
      }

      return finalResults;
    } catch (error) {
      this.logger.error("优化批量获取失败:", error);

      if (errorIsolation) {
        // 降级到单个请求处理
        return this.executeConcurrentRequests(requests, concurrency);
      }

      throw error;
    }
  }

  /**
   * Phase 5.4: 缓存使用分析和优化建议
   * 提供详细的缓存性能分析和优化建议
   */
  async analyzeCachePerformance(cacheKeys: string[]): Promise<{
    summary: {
      totalKeys: number;
      cached: number;
      expired: number;
      avgTtl: number;
      hitRate: number;
    };
    recommendations: string[];
    hotspots: Array<{
      key: string;
      ttlRemaining: number;
      dataSize?: number;
      recommendation: string;
    }>;
  }> {
    try {
      const analysis = {
        summary: {
          totalKeys: cacheKeys.length,
          cached: 0,
          expired: 0,
          avgTtl: 0,
          hitRate: 0,
        },
        recommendations: [],
        hotspots: [],
      };

      if (cacheKeys.length === 0) {
        return analysis;
      }

      // 批量获取缓存状态
      const cacheResults = await this.commonCacheService.mget(cacheKeys);
      let totalTtl = 0;

      for (let i = 0; i < cacheKeys.length; i++) {
        const key = cacheKeys[i];
        const result = cacheResults[i];

        if (result?.data) {
          analysis.summary.cached++;
          totalTtl += result.ttlRemaining;

          // 识别热点数据
          if (result.ttlRemaining < 300) {
            // 5分钟内过期
            analysis.hotspots.push({
              key,
              ttlRemaining: result.ttlRemaining,
              recommendation: "TTL即将过期，建议主动刷新",
            });
          }
        } else {
          analysis.summary.expired++;

          // 已过期的热点数据
          if (this.isHotKey(key)) {
            analysis.hotspots.push({
              key,
              ttlRemaining: 0,
              recommendation: "热点数据已过期，建议立即预热",
            });
          }
        }
      }

      // 计算统计指标
      analysis.summary.hitRate =
        analysis.summary.cached / analysis.summary.totalKeys;
      if (analysis.summary.cached > 0) {
        analysis.summary.avgTtl = Math.round(
          totalTtl / analysis.summary.cached,
        );
      }

      // 生成优化建议
      if (analysis.summary.hitRate < 0.7) {
        analysis.recommendations.push(
          "缓存命中率较低，建议增加TTL或实施缓存预热策略",
        );
      }

      if (analysis.summary.avgTtl < 60) {
        analysis.recommendations.push(
          "平均TTL过短，可能导致频繁回源，建议优化TTL计算策略",
        );
      }

      if (analysis.summary.avgTtl > 3600) {
        analysis.recommendations.push("平均TTL较长，注意监控数据新鲜度");
      }

      if (analysis.hotspots.length > analysis.summary.totalKeys * 0.1) {
        analysis.recommendations.push(
          `发现${analysis.hotspots.length}个热点数据问题，建议实施主动刷新策略`,
        );
      }

      this.logger.debug(
        `缓存性能分析: 命中率=${analysis.summary.hitRate.toFixed(2)}, 平均TTL=${analysis.summary.avgTtl}s, 热点=${analysis.hotspots.length}`,
      );

      return analysis;
    } catch (error) {
      this.logger.error("缓存性能分析失败:", error);
      throw error;
    }
  }

  /**
   * Phase 5.4: 自适应TTL优化
   * 基于访问模式和数据特征的智能TTL计算
   */
  async setDataWithAdaptiveTTL<T>(
    key: string,
    data: T,
    options: {
      dataType?: string;
      symbol?: string;
      accessFrequency?: "high" | "medium" | "low";
      dataSize?: number;
      lastUpdated?: Date;
      marketStatus?: "open" | "closed" | "pre_market" | "after_hours";
    } = {},
  ): Promise<{
    success: boolean;
    ttl: number;
    strategy: string;
    error?: string;
  }> {
    try {
      const {
        dataType = "unknown",
        symbol = "",
        accessFrequency = "medium",
        dataSize = 0,
        lastUpdated,
        marketStatus = "unknown",
      } = options;

      // 使用CommonCacheService的智能TTL计算
      const freshnessRequirement =
        this.mapAccessFrequencyToFreshnessRequirement(accessFrequency);
      const accessPattern =
        freshnessRequirement === "realtime"
          ? "hot"
          : freshnessRequirement === "analytical"
            ? "warm"
            : "cold";
      const ttlResult = CommonCacheService.calculateOptimalTTL(
        dataSize || 1024,
        accessPattern,
      );

      let finalTtl = ttlResult;
      let strategy = accessPattern;

      // 基于数据大小的额外优化
      if (dataSize > 10240) {
        // 10KB以上的大数据
        finalTtl = Math.max(finalTtl * 0.8, 300); // 减少20%但不低于5分钟
        strategy += "+大数据优化";
      }

      // 基于数据新鲜度的调整
      if (lastUpdated) {
        const ageMinutes = (Date.now() - lastUpdated.getTime()) / (1000 * 60);
        if (ageMinutes > 30) {
          // 数据超过30分钟
          finalTtl = Math.max(finalTtl * 0.7, 180); // 缩短30%但不低于3分钟
          strategy += "+陈旧数据惩罚";
        }
      }

      // 设置缓存
      await this.commonCacheService.set(key, data, finalTtl);

      this.logger.debug(
        `自适应TTL设置: key=${key}, ttl=${finalTtl}s, strategy=${strategy}, type=${dataType}, freq=${accessFrequency}`,
      );

      return { success: true, ttl: finalTtl, strategy };
    } catch (error) {
      this.logger.error(`自适应TTL设置失败: ${key}`, error);
      return {
        success: false,
        ttl: 0,
        strategy: "error",
        error: error.message,
      };
    }
  }

  // ===================
  // 定时器资源管理方法
  // ===================

  /**
   * 清理所有定时器资源
   * 在模块销毁时调用，防止内存泄漏
   */
  private clearAllTimers(): void {
    this.logger.log(`Clearing ${this.timers.size} active timers...`);

    this.timers.forEach((timer) => {
      try {
        clearInterval(timer);
      } catch (error) {
        this.logger.warn("Failed to clear timer:", error);
      }
    });

    this.timers.clear();
    this.logger.log("All timers cleared successfully");
  }

  /**
   * 创建托管定时器
   * 自动添加到定时器管理集合
   */
  private createManagedTimer(
    callback: () => void,
    interval: number,
  ): NodeJS.Timeout {
    const timer = setInterval(callback, interval);
    this.timers.add(timer);
    return timer;
  }

  /**
   * 清理单个定时器
   */
  private clearManagedTimer(timer: NodeJS.Timeout): void {
    if (this.timers.has(timer)) {
      clearInterval(timer);
      this.timers.delete(timer);
    }
  }

  // ===================
  // 辅助方法和策略映射
  // Phase 5.2重构：简化逻辑，直接使用CommonCacheService功能
  // ===================

  /**
   * 将缓存策略映射到新鲜度要求
   * Phase 5.2重构：简化策略映射，移除复杂的SmartCacheOptionsDto转换
   */
  private mapStrategyToFreshnessRequirement(
    strategy: CacheStrategy,
  ): "realtime" | "analytical" | "archive" {
    switch (strategy) {
      case CacheStrategy.STRONG_TIMELINESS:
        return "realtime";
      case CacheStrategy.WEAK_TIMELINESS:
        return "analytical";
      case CacheStrategy.ADAPTIVE:
      case CacheStrategy.MARKET_AWARE:
        return "analytical";
      default:
        return "analytical";
    }
  }

  /**
   * 判断是否应该调度后台更新
   * 基于策略配置和缓存状态决定
   */
  private shouldScheduleBackgroundUpdate(
    strategy: CacheStrategy,
    cacheResult: any,
  ): boolean {
    const strategyConfig = this.config.strategies[strategy];

    if (!strategyConfig || !this.config.enableBackgroundUpdate) {
      return false;
    }

    // NO_CACHE策略不需要后台更新
    if (strategy === CacheStrategy.NO_CACHE) {
      return false;
    }

    // 检查策略是否启用后台更新
    const enableBackgroundUpdate = (strategyConfig as any)
      .enableBackgroundUpdate;
    if (!enableBackgroundUpdate) {
      return false;
    }

    // 检查TTL阈值
    if (
      cacheResult.metadata?.ttlRemaining &&
      cacheResult.metadata?.dynamicTtl
    ) {
      const thresholdRatio =
        (strategyConfig as any).updateThresholdRatio || SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.STRONG_UPDATE_RATIO;
      const remainingRatio =
        cacheResult.metadata.ttlRemaining / cacheResult.metadata.dynamicTtl;

      return remainingRatio <= thresholdRatio;
    }

    // 默认不触发更新
    return false;
  }

  /**
   * 获取符号列表对应的市场状态
   * 返回Record<Market, MarketStatusResult>格式（Market为强类型枚举）
   */
  async getMarketStatusForSymbols(
    symbols: string[],
  ): Promise<MarketStatusQueryResult> {
    try {
      // 检查缓存的市场状态（避免频繁查询）
      const cacheValidDuration =
        this.config.strategies[CacheStrategy.MARKET_AWARE]
          .marketStatusCheckInterval * 1000;

      if (
        this.lastMarketStatusQuery &&
        Date.now() - new Date(this.lastMarketStatusQuery.timestamp).getTime() <
          cacheValidDuration
      ) {
        return this.lastMarketStatusQuery;
      }

      // 从符号推断涉及的市场
      const markets = new Set<Market>();
      symbols.forEach((symbol) => {
        const market = this.inferMarketFromSymbol(symbol);
        markets.add(market);
      });

      // 查询各市场状态
      const marketStatus: Record<Market, MarketStatusResult> = {} as any;

      for (const market of markets) {
        try {
          const status = await this.marketStatusService.getMarketStatus(market);
          marketStatus[market] = status;
        } catch (error) {
          this.logger.warn(`Failed to get market status for ${market}:`, error);
          // 默认为闭市状态
          marketStatus[market] = {
            market: market as Market,
            status: MarketStatus.MARKET_CLOSED,
            currentTime: new Date(),
            marketTime: new Date(),
            timezone: "UTC",
            realtimeCacheTTL: 300, // 默认5分钟缓存
            analyticalCacheTTL: 1800, // 默认30分钟缓存
            isHoliday: false,
            isDST: false,
            confidence: 0.5, // 低置信度
          };
        }
      }

      const result: MarketStatusQueryResult = {
        marketStatus,
        timestamp: new Date().toISOString(),
        success: true,
      };

      // 缓存结果
      this.lastMarketStatusQuery = result;

      return result;
    } catch (error) {
      this.logger.error("Failed to get market status for symbols:", error);

      // 返回失败结果，默认所有市场闭市
      return {
        marketStatus: {} as Record<Market, MarketStatusResult>,
        timestamp: new Date().toISOString(),
        success: false,
      };
    }
  }

  /**
   * 从单个符号推断市场
   * 复用cache-request.utils.ts中的实现逻辑
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场: .HK 后缀或5位数字
    if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }

    // 美国市场: 1-5位字母
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }

    // 深圳市场: .SZ 后缀或 00/30 前缀
    if (
      upperSymbol.includes(".SZ") ||
      ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }

    // 上海市场: .SH 后缀或 60/68 前缀
    if (
      upperSymbol.includes(".SH") ||
      ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }

    // 默认美股
    return Market.US;
  }

  /**
   * 从缓存键推断数据类型
   * Phase 5.2重构：简化数据类型推断
   */
  private inferDataTypeFromKey(key: string): string {
    const keyLower = key.toLowerCase();

    if (keyLower.includes("quote") || keyLower.includes("realtime")) {
      return "stock-quote";
    } else if (
      keyLower.includes("historical") ||
      keyLower.includes("history")
    ) {
      return "historical";
    } else if (keyLower.includes("company") || keyLower.includes("info")) {
      return "company-info";
    } else {
      return "unknown-type";
    }
  }

  /**
   * 调度后台更新任务
   * TTL节流、去重检查、并发限制
   */
  scheduleBackgroundUpdate<T>(
    cacheKey: string,
    symbols: string[],
    fetchFn: () => Promise<T>,
    priority?: number,
  ): void {
    // 检查是否正在关闭
    if (this.isShuttingDown) {
      this.logger.debug(
        `Skipping background update for ${cacheKey} - service is shutting down`,
      );
      return;
    }

    // 检查是否启用后台更新
    if (!this.config.enableBackgroundUpdate) {
      this.logger.debug(`Background updates disabled, skipping ${cacheKey}`);
      return;
    }

    // 去重检查：如果已有相同cacheKey的任务在队列中，跳过
    if (this.backgroundUpdateTasks.has(cacheKey)) {
      this.logger.debug(
        `Background update already scheduled for ${cacheKey}, skipping duplicate`,
      );
      return;
    }

    // 计算最小更新间隔进行TTL节流
    const minInterval = this.getMinUpdateInterval(symbols);
    const now = Date.now();

    // 检查该cacheKey的上次更新时间（防止频繁更新）
    const lastUpdateKey = `last_update_${cacheKey}`;
    const lastUpdateTime = this.getLastUpdateTime(lastUpdateKey);

    if (lastUpdateTime && now - lastUpdateTime < minInterval) {
      this.logger.debug(
        `TTL throttling: skipping ${cacheKey}, last update too recent`,
      );
      return;
    }

    // 并发限制检查
    if (this.activeTaskCount >= this.config.maxConcurrentUpdates) {
      this.logger.debug(
        `Max concurrent updates reached (${this.config.maxConcurrentUpdates}), queuing ${cacheKey}`,
      );
    }

    // 计算优先级
    const taskPriority =
      priority !== undefined ? priority : this.calculateUpdatePriority(symbols);

    // 创建后台更新任务
    const task: BackgroundUpdateTask = {
      taskId: `${cacheKey}_${Date.now()}`,
      cacheKey,
      symbols,
      fetchFn,
      priority: taskPriority,
      createdAt: now,
      scheduledAt: now, // 立即调度
      retryCount: 0,
      maxRetries: 3, // 最大重试3次
      status: "pending",
      market:
        symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : undefined,
    };

    // 添加到任务管理Map和队列
    this.backgroundUpdateTasks.set(cacheKey, task);
    this.updateQueue.push(task);

    // 记录当前调度时间
    this.setLastUpdateTime(lastUpdateKey, now);

    this.logger.debug(`Scheduled background update for ${cacheKey}`, {
      priority: taskPriority,
      queueLength: this.updateQueue.length,
      activeTaskCount: this.activeTaskCount,
    });
  }

  /**
   * 获取策略对应的最小更新间隔
   * 基于策略配置和全局配置计算
   */
  getMinUpdateInterval(symbols: string[]): number {
    // 从符号推断主要市场
    const primaryMarket =
      symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : Market.US;

    // 基础间隔使用全局配置
    let baseInterval = this.config.defaultMinUpdateInterval;

    // 根据市场类型调整间隔（优化：不同市场可能有不同的更新频率需求）
    switch (primaryMarket) {
      case Market.US:
        // 美股市场，保持基础间隔
        break;
      case Market.HK:
        // 港股市场，略微降低频率
        baseInterval = Math.max(baseInterval, 45000); // 最少45秒
        break;
      case Market.SZ:
      case Market.SH:
        // A股市场，降低频率
        baseInterval = Math.max(baseInterval, 60000); // 最少60秒
        break;
      default:
        break;
    }

    return baseInterval;
  }

  /**
   * 获取上次更新时间
   * 使用简单的内存存储，实际生产中可以考虑持久化
   */
  private lastUpdateTimes = new Map<string, number>();

  private getLastUpdateTime(key: string): number | undefined {
    return this.lastUpdateTimes.get(key);
  }

  private setLastUpdateTime(key: string, time: number): void {
    this.lastUpdateTimes.set(key, time);

    // 清理过期的记录（保留最近1小时的记录）
    const oneHourAgo = time - 3600000;
    for (const [k, t] of this.lastUpdateTimes.entries()) {
      if (t < oneHourAgo) {
        this.lastUpdateTimes.delete(k);
      }
    }
  }

  /**
   * 计算更新任务优先级
   * 迁移Query现有"基础分值+市场权重+随机微扰"逻辑
   * 确保指标口径不变（queryBackgroundTasksActive/Completed/Failed）
   */
  calculateUpdatePriority(symbols: string[], market?: Market): number {
    // 基础优先级分值
    let priority = 1;

    // 推断主要市场（如果未提供）
    const primaryMarket =
      market ||
      (symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : Market.US);

    // 市场权重：美股 > 港股 > A股（保持与Query现有逻辑一致）
    switch (primaryMarket) {
      case Market.US:
        priority += 3; // 美股优先级最高
        break;
      case Market.HK:
        priority += 2; // 港股优先级中等
        break;
      case Market.SZ:
      case Market.SH:
        priority += 1; // A股优先级较低
        break;
      default:
        priority += 1; // 其他市场默认较低优先级
        break;
    }

    // 符号数量影响：更多符号的批量请求优先级略高
    if (symbols.length > 1) {
      priority += Math.min(symbols.length * 0.1, 1); // 最多增加1分
    }

    // 随机微扰避免饥饿（保持与Query现有逻辑一致）
    priority += Math.random() * 0.1;

    this.logger.debug(`Calculated priority for symbols ${symbols.join(",")}:`, {
      symbols: symbols.length,
      market: primaryMarket,
      finalPriority: priority,
    });

    return priority;
  }

  // Phase 5.4: 性能优化辅助方法

  /**
   * 执行并发请求（降级方案）
   */
  private async executeConcurrentRequests<T>(
    requests: Array<CacheOrchestratorRequest<T>>,
    concurrency: number,
  ): Promise<Array<CacheOrchestratorResult<T>>> {
    const results = new Array(requests.length);

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(async (request, batchIndex) => {
        try {
          const data = await request.fetchFn();

          return {
            data,
            hit: false,
            ttlRemaining: 0,
            strategy: CacheStrategy.NO_CACHE,
            storageKey: "",
          };
        } catch (error) {
          this.logger.error(`并发请求失败: batch ${i + batchIndex}`, error);
          return {
            data: null,
            hit: false,
            ttlRemaining: 0,
            strategy: CacheStrategy.NO_CACHE,
            storageKey: "",
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, batchIndex) => {
        if (result.status === "fulfilled") {
          results[i + batchIndex] = result.value;
        } else {
          results[i + batchIndex] = {
            data: null,
            hit: false,
            ttlRemaining: 0,
            strategy: CacheStrategy.NO_CACHE,
            storageKey: "",
            error: result.reason?.message || "未知错误",
          };
        }
      });
    }

    return results;
  }

  /**
   * 优化的缓存未命中处理
   */
  private async handleMissedRequestsOptimized<T>(
    missedRequests: Array<{
      index: number;
      request: CacheOrchestratorRequest<T>;
    }>,
    finalResults: Array<CacheOrchestratorResult<T>>,
    concurrency: number,
    errorIsolation: boolean,
    retryFailures: boolean,
  ) {
    const failedRequests = [];

    // 第一轮：正常处理
    for (let i = 0; i < missedRequests.length; i += concurrency) {
      const batch = missedRequests.slice(i, i + concurrency);

      const batchPromises = batch.map(async ({ index, request }) => {
        try {
          // 计算最优TTL
          const dataSize = 1024; // 估计数据大小
          const freshnessRequirement = this.mapStrategyToFreshnessRequirement(
            request.strategy,
          );
          const accessPattern =
            freshnessRequirement === "realtime"
              ? "hot"
              : freshnessRequirement === "analytical"
                ? "warm"
                : "cold";
          const ttlResult = CommonCacheService.calculateOptimalTTL(
            dataSize,
            accessPattern,
          );

          // 获取数据
          const data = await request.fetchFn();

          // 异步设置缓存
          this.commonCacheService
            .set(request.cacheKey, data, ttlResult)
            .catch((error) => {
              this.logger.warn(`缓存设置失败: ${request.cacheKey}`, error);
            });

          finalResults[index] = {
            data,
            hit: false,
            ttlRemaining: ttlResult,
            strategy: request.strategy,
            storageKey: request.cacheKey,
          };
        } catch (error) {
          this.logger.warn(`请求失败: ${request.cacheKey}`, error);

          if (errorIsolation && retryFailures) {
            failedRequests.push({ index, request });
          }

          finalResults[index] = {
            data: null,
            hit: false,
            ttlRemaining: 0,
            strategy: request.strategy,
            storageKey: request.cacheKey,
            error: error.message,
          };
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // 第二轮：重试失败的请求（降低并发度）
    if (retryFailures && failedRequests.length > 0) {
      this.logger.log(`重试失败的请求: ${failedRequests.length} 个`);

      for (const { index, request } of failedRequests) {
        try {
          const data = await request.fetchFn();

          finalResults[index] = {
            data,
            hit: false,
            ttlRemaining: 300, // 重试成功的数据使用较短TTL
            strategy: request.strategy,
            storageKey: request.cacheKey,
          };

          // 异步设置缓存
          this.commonCacheService
            .set(request.cacheKey, data, 300)
            .catch((error) => {
              this.logger.warn(`重试缓存设置失败: ${request.cacheKey}`, error);
            });
        } catch (retryError) {
          this.logger.error(`重试仍失败: ${request.cacheKey}`, retryError);
          // 保持原有的错误结果
        }
      }
    }
  }

  /**
   * 判断是否为热点键
   */
  private isHotKey(key: string): boolean {
    // 简单的热点判断逻辑，可以根据实际情况扩展
    const hotPatterns = [
      /stock:.*:quote/, // 股票报价
      /market:.*:status/, // 市场状态
      /symbol:.*:mapping/, // 符号映射
    ];

    return hotPatterns.some((pattern) => pattern.test(key));
  }

  /**
   * 从缓存键提取符号
   */
  private extractSymbolFromKey(key: string): string {
    const matches = key.match(/(?:stock|symbol):([^:]+)/);
    return matches ? matches[1] : "";
  }

  /**
   * 获取单个符号的市场状态
   */
  private async getMarketStatusForSymbol(symbol: string): Promise<string> {
    if (!symbol) return "unknown";

    try {
      const market = this.inferMarketFromSymbol(symbol);
      const marketStatusResult = await this.getMarketStatusForSymbols([symbol]);

      if (
        marketStatusResult.success &&
        marketStatusResult.marketStatus[market]
      ) {
        const status = marketStatusResult.marketStatus[market];
        return status.status === "TRADING" ? "open" : "closed";
      }

      return "closed"; // 默认闭市
    } catch (error) {
      this.logger.warn(`获取市场状态失败: ${symbol}`, error);
      return "unknown";
    }
  }

  /**
   * 将访问频率映射到新鲜度要求
   */
  private mapAccessFrequencyToFreshnessRequirement(
    frequency: "high" | "medium" | "low",
  ): "realtime" | "analytical" | "archive" {
    switch (frequency) {
      case "high":
        return "realtime";
      case "medium":
        return "analytical";
      case "low":
      default:
        return "archive";
    }
  }

  /**
   * 将字符串市场状态转换为CommonCacheService需要的对象格式
   */
  private convertMarketStatusToObject(
    status: string,
  ): { isOpen: boolean; timezone: string; nextStateChange?: Date } | undefined {
    if (!status || status === "unknown") {
      return undefined;
    }

    return {
      isOpen: status === "open",
      timezone: "UTC",
      nextStateChange: undefined,
    };
  }
}
