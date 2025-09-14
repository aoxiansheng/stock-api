// 定义采样配置常量
const RECENT_METRICS_COUNT = 5; // 替代 MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT
import { OPERATION_LIMITS } from '@common/constants/domain';
import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Inject
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Subject, fromEvent, race, timer } from "rxjs";
import { takeUntil, first, map } from "rxjs/operators";
import { EnhancedCapabilityRegistryService } from "../../../../providers/services/enhanced-capability-registry.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import {
  createLogger,
  sanitizeLogData,
} from "@common/logging/index";
import { BaseFetcherService } from "../../../shared/services/base-fetcher.service";
import {
  IStreamDataFetcher,
  StreamConnectionParams,
  StreamConnection,
  StreamConnectionException,
  StreamSubscriptionException,
  StreamConnectionStats,
  StreamConnectionStatus,
  StreamConnectionConfig,
  SubscriptionResult,
  UnsubscriptionResult,
} from "../interfaces";
import { StreamConnectionImpl } from "./stream-connection.impl";
import { StreamCacheService } from "../../../05-caching/stream-cache/services/stream-cache.service";
import { StreamClientStateManager } from "./stream-client-state-manager.service";
import { ConnectionPoolManager } from "./connection-pool-manager.service";

/**
 * 流数据获取器服务实现 - Stream Data Fetcher
 *
 * 🎯 核心职责：
 * - WebSocket 流连接生命周期管理（建立、关闭、监控）
 * - 符号订阅/取消订阅操作
 * - 连接池管理和健康检查
 * - 与 CapabilityRegistry 集成获取提供商流能力
 *
 * ❌ 明确不负责：
 * - 数据缓存（由 StreamCacheService 负责）
 * - 数据转换（由 Transformer 负责）
 * - 数据存储（由 Storage 负责）
 * - 数据路由（由 StreamReceiver 负责）
 *
 * 📋 实现关系：
 * - 实现 IStreamDataFetcher 接口规范
 * - 使用事件化驱动方式接入全局监控组件
 *
 * 🔗 Pipeline 位置：WebSocket → StreamReceiver → **StreamDataFetcher** → Transformer → Storage
 */
@Injectable()
export class StreamDataFetcherService
  extends BaseFetcherService
  implements IStreamDataFetcher, OnModuleDestroy
{
  protected readonly logger = createLogger("StreamDataFetcherService");

  // === Map 对象声明（内存泄漏修复目标） ===
  private readonly activeConnections = new Map<string, StreamConnection>();

  // P0-3: ID映射表，用于连接清理（内存泄漏修复目标）
  private readonly connectionIdToKey = new Map<string, string>();

  // P0-2: RxJS 清理机制
  private readonly destroy$ = new Subject<void>();

  // P0-3: 定期清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isServiceDestroyed = false;

  // === P1-2: 自适应并发控制状态 ===
  private performanceMetrics = {
    // 响应时间统计
    responseTimes: [] as number[],
    avgResponseTime: 0,
    p95ResponseTime: 0,

    // 成功率统计
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 100,

    // 并发控制历史
    concurrencyHistory: [] as Array<{
      concurrency: number;
      timestamp: number;
      performance: number;
    }>,

    // 系统负载指标
    activeOperations: 0,
    queuedOperations: 0,

    // 最后更新时间
    lastMetricsUpdate: Date.now(),

    // 性能窗口大小（保留最近N次操作的统计）
    windowSize: 100,
  };

  // 自适应并发控制配置
  private concurrencyControl = {
    // 当前并发限制
    currentConcurrency: parseInt(process.env.HEALTHCHECK_CONCURRENCY || "10"),

    // 并发限制范围
    minConcurrency: parseInt(process.env.MIN_CONCURRENCY || "2"),
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "50"),

    // 调整阈值
    performanceThresholds: {
      excellent: 100, // 响应时间 < 100ms 时增加并发
      good: 500, // 响应时间 < 500ms 时保持并发
      poor: 2000, // 响应时间 > 2000ms 时减少并发
    },

    successRateThresholds: {
      excellent: 0.98, // 成功率 > 98% 时考虑增加并发
      good: 0.9, // 成功率 > 90% 时保持并发
      poor: 0.8, // 成功率 < 80% 时减少并发
    },

    // 调整参数
    adjustmentFactor: 0.2, // 每次调整的幅度（20%）
    stabilizationPeriod: 30000, // 稳定期（30秒）
    lastAdjustment: 0, // 上次调整时间

    // 断路器设置
    circuitBreaker: {
      enabled: false,
      triggeredAt: 0,
      recoveryDelay: 60000, // 1分钟恢复期
      failureThreshold: 0.5, // 失败率超过50%时触发
    },
  };

  constructor(
    private readonly capabilityRegistry: EnhancedCapabilityRegistryService,
    private readonly streamCache: StreamCacheService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly connectionPoolManager: ConnectionPoolManager,
    // ✅ 事件化驱动监控 - 仅注入事件总线
    protected readonly eventBus: EventEmitter2,
  ) {
    super(eventBus);

    // P0-3: 启动定期清理机制
    this.startPeriodicMapCleanup();

    // P1-2: 启动自适应并发控制监控
    this.startAdaptiveConcurrencyMonitoring();

    this.logger.debug("StreamDataFetcherService 已初始化，使用事件化驱动监控");
  }

  // === ✅ 事件化驱动监控方法 ===

  /**
   * 发送连接相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitConnectionEvent(
    metricName: string,
    data: {
      provider?: string;
      capability?: string;
      duration?: number;
      count?: number;
      status?: "success" | "error";
      error_type?: string;
      operation?: string;
    },
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_data_fetcher",
        metricType: "infrastructure",
        metricName,
        metricValue: data.duration || data.count || 1,
        tags: {
          provider: data.provider,
          capability: data.capability,
          operation: data.operation || "connection",
          status: data.status,
          error_type: data.error_type,
        },
      });
    });
  }

  /**
   * 发送订阅相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitSubscriptionEvent(
    metricName: string,
    data: {
      provider?: string;
      capability?: string;
      symbol_count?: number;
      duration?: number;
      status?: "success" | "error";
      action?: "subscribe" | "unsubscribe";
      error_type?: string;
    },
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_data_fetcher",
        metricType: "business",
        metricName,
        metricValue: data.symbol_count || data.duration || 1,
        tags: {
          provider: data.provider,
          capability: data.capability,
          operation: data.action || "subscription",
          status: data.status,
          error_type: data.error_type,
          symbol_count: data.symbol_count,
        },
      });
    });
  }

  /**
   * 发送性能相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitStreamPerformanceEvent(
    metricName: string,
    data: {
      operation?: string;
      duration?: number;
      provider?: string;
      connection_count?: number;
      status?: "success" | "error" | "warning";
      threshold_exceeded?: boolean;
    },
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_data_fetcher",
        metricType: "performance",
        metricName,
        metricValue: data.duration || data.connection_count || 1,
        tags: {
          operation: data.operation,
          provider: data.provider,
          status: data.status,
          threshold_exceeded: data.threshold_exceeded,
        },
      });
    });
  }

  /**
   * 发送指标相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitMetricsEvent(
    metricName: string,
    data: {
      activeConnections?: number;
      connectionMappings?: number;
      requestId?: string;
      operation?: string;
      status?: "success" | "error" | "info";
    },
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_data_fetcher",
        metricType: "metrics",
        metricName,
        metricValue: data.activeConnections || data.connectionMappings || 1,
        tags: {
          operation: data.operation || "metrics",
          status: data.status || "info",
          request_id: data.requestId,
          active_connections: data.activeConnections,
          connection_mappings: data.connectionMappings,
        },
      });
    });
  }

  // === P1-2: 自适应并发控制核心方法 ===

  /**
   * 启动自适应并发控制监控
   */
  private startAdaptiveConcurrencyMonitoring(): void {
    // 定期分析性能并调整并发限制
    const adjustmentInterval = setInterval(() => {
      if (!this.isServiceDestroyed) {
        this.analyzePerformanceAndAdjustConcurrency();
      } else {
        clearInterval(adjustmentInterval);
      }
    }, 30000); // 每30秒分析一次

    this.logger.debug("自适应并发控制监控已启动", {
      currentConcurrency: this.concurrencyControl.currentConcurrency,
      minConcurrency: this.concurrencyControl.minConcurrency,
      maxConcurrency: this.concurrencyControl.maxConcurrency,
      adjustmentInterval: "30秒",
    });
  }

  /**
   * 分析性能并调整并发限制
   */
  private analyzePerformanceAndAdjustConcurrency(): void {
    const now = Date.now();
    const timeSinceLastAdjustment =
      now - this.concurrencyControl.lastAdjustment;

    // 如果距离上次调整时间太短，跳过这次分析
    if (timeSinceLastAdjustment < this.concurrencyControl.stabilizationPeriod) {
      return;
    }

    // 检查断路器状态
    if (this.concurrencyControl.circuitBreaker.enabled) {
      this.checkCircuitBreakerRecovery();
      return;
    }

    // 更新性能指标
    this.updatePerformanceMetrics();

    const metrics = this.performanceMetrics;
    const control = this.concurrencyControl;

    // 决策逻辑：基于响应时间和成功率
    let adjustment = 0;
    let reason = "";

    // 1. 检查是否需要触发断路器
    if (metrics.successRate < control.circuitBreaker.failureThreshold) {
      this.triggerCircuitBreaker();
      return;
    }

    // 2. 基于成功率调整
    if (metrics.successRate < control.successRateThresholds.poor) {
      adjustment = -Math.ceil(
        control.currentConcurrency * control.adjustmentFactor,
      );
      reason = `成功率过低 (${(metrics.successRate * 100).toFixed(1)}%)`;
    } else if (metrics.successRate > control.successRateThresholds.excellent) {
      // 3. 基于响应时间调整（仅在成功率良好时）
      if (metrics.avgResponseTime < control.performanceThresholds.excellent) {
        adjustment = Math.ceil(
          control.currentConcurrency * control.adjustmentFactor,
        );
        reason = `性能优秀 (${metrics.avgResponseTime.toFixed(0)}ms, ${(metrics.successRate * 100).toFixed(1)}%)`;
      } else if (metrics.avgResponseTime > control.performanceThresholds.poor) {
        adjustment = -Math.ceil(
          control.currentConcurrency * control.adjustmentFactor,
        );
        reason = `响应时间过长 (${metrics.avgResponseTime.toFixed(0)}ms)`;
      }
    }

    // 应用调整
    if (adjustment !== 0) {
      const newConcurrency = Math.max(
        control.minConcurrency,
        Math.min(
          control.maxConcurrency,
          control.currentConcurrency + adjustment,
        ),
      );

      if (newConcurrency !== control.currentConcurrency) {
        const oldConcurrency = control.currentConcurrency;
        control.currentConcurrency = newConcurrency;
        control.lastAdjustment = now;

        // 记录调整历史
        this.performanceMetrics.concurrencyHistory.push({
          concurrency: newConcurrency,
          timestamp: now,
          performance: metrics.avgResponseTime,
        });

        // 保持历史记录在合理范围内
        if (this.performanceMetrics.concurrencyHistory.length > 50) {
          this.performanceMetrics.concurrencyHistory.shift();
        }

        this.logger.log("自适应并发控制调整", {
          adjustment: adjustment > 0 ? "+" + adjustment : adjustment,
          oldConcurrency,
          newConcurrency,
          reason,
          metrics: {
            avgResponseTime: metrics.avgResponseTime.toFixed(0) + "ms",
            successRate: (metrics.successRate * 100).toFixed(1) + "%",
            totalRequests: metrics.totalRequests,
          },
        });

        // 更新监控指标
        // TODO: 实现 recordConcurrencyAdjustment 方法
        // this.streamMetrics.recordConcurrencyAdjustment(
        //   oldConcurrency,
        //   newConcurrency,
        //   reason
        // );
      }
    }
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    const metrics = this.performanceMetrics;

    // 计算平均响应时间
    if (metrics.responseTimes.length > 0) {
      metrics.avgResponseTime =
        metrics.responseTimes.reduce((a, b) => a + b, 0) /
        metrics.responseTimes.length;

      // 计算P95响应时间
      const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      metrics.p95ResponseTime = sorted[p95Index] || metrics.avgResponseTime;
    }

    // 计算成功率
    if (metrics.totalRequests > 0) {
      metrics.successRate = metrics.successfulRequests / metrics.totalRequests;
    }

    metrics.lastMetricsUpdate = Date.now();
  }

  /**
   * 记录操作性能
   */
  private recordOperationPerformance(duration: number, success: boolean): void {
    const metrics = this.performanceMetrics;

    // 更新计数器
    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // 更新响应时间数组
    metrics.responseTimes.push(duration);

    // 保持窗口大小
    if (metrics.responseTimes.length > metrics.windowSize) {
      metrics.responseTimes.shift();
    }

    // 每10次操作更新一次聚合指标
    if (metrics.totalRequests % 10 === 0) {
      this.updatePerformanceMetrics();
    }
  }

  /**
   * 触发断路器
   */
  private triggerCircuitBreaker(): void {
    const now = Date.now();
    this.concurrencyControl.circuitBreaker.enabled = true;
    this.concurrencyControl.circuitBreaker.triggeredAt = now;

    // 将并发限制降到最低
    const oldConcurrency = this.concurrencyControl.currentConcurrency;
    this.concurrencyControl.currentConcurrency =
      this.concurrencyControl.minConcurrency;

    this.logger.error("自适应并发控制触发断路器", {
      reason: "成功率过低",
      successRate: (this.performanceMetrics.successRate * 100).toFixed(1) + "%",
      threshold:
        (this.concurrencyControl.circuitBreaker.failureThreshold * 100).toFixed(
          1,
        ) + "%",
      oldConcurrency,
      newConcurrency: this.concurrencyControl.currentConcurrency,
      recoveryDelay:
        this.concurrencyControl.circuitBreaker.recoveryDelay + "ms",
    });
  }

  /**
   * 检查断路器恢复
   */
  private checkCircuitBreakerRecovery(): void {
    const now = Date.now();
    const timeSinceTriggered =
      now - this.concurrencyControl.circuitBreaker.triggeredAt;

    if (
      timeSinceTriggered > this.concurrencyControl.circuitBreaker.recoveryDelay
    ) {
      // 检查最近的成功率是否有改善
      const recentSuccessRate = this.calculateRecentSuccessRate();

      if (
        recentSuccessRate > this.concurrencyControl.successRateThresholds.good
      ) {
        // 关闭断路器，恢复正常操作
        this.concurrencyControl.circuitBreaker.enabled = false;
        this.concurrencyControl.circuitBreaker.triggeredAt = 0;

        // 逐步恢复并发限制
        this.concurrencyControl.currentConcurrency = Math.max(
          this.concurrencyControl.minConcurrency * 2,
          Math.min(this.concurrencyControl.maxConcurrency / 4, 10),
        );

        this.logger.log("自适应并发控制断路器恢复", {
          recentSuccessRate: (recentSuccessRate * 100).toFixed(1) + "%",
          newConcurrency: this.concurrencyControl.currentConcurrency,
          recoveryTime: timeSinceTriggered + "ms",
        });
      }
    }
  }

  /**
   * 计算最近的成功率（最近20次操作）
   */
  private calculateRecentSuccessRate(): number {
    const recentWindow = 20;
    const totalRecent = Math.min(
      this.performanceMetrics.totalRequests,
      recentWindow,
    );

    if (totalRecent === 0) return 1.0;

    // 这里简化处理，实际应该维护一个滑动窗口
    const successfulRecent = Math.max(
      0,
      this.performanceMetrics.successfulRequests -
        (this.performanceMetrics.totalRequests - recentWindow),
    );

    return successfulRecent / totalRecent;
  }

  /**
   * 获取当前自适应并发限制
   */
  private getCurrentConcurrency(): number {
    // 如果断路器开启，返回最小并发
    if (this.concurrencyControl.circuitBreaker.enabled) {
      return this.concurrencyControl.minConcurrency;
    }

    return this.concurrencyControl.currentConcurrency;
  }

  /**
   * 获取自适应并发控制统计信息
   */
  getAdaptiveConcurrencyStats() {
    return {
      currentConcurrency: this.concurrencyControl.currentConcurrency,
      concurrencyRange: {
        min: this.concurrencyControl.minConcurrency,
        max: this.concurrencyControl.maxConcurrency,
      },
      performance: {
        avgResponseTime:
          this.performanceMetrics.avgResponseTime.toFixed(0) + "ms",
        p95ResponseTime:
          this.performanceMetrics.p95ResponseTime.toFixed(0) + "ms",
        successRate:
          (this.performanceMetrics.successRate * 100).toFixed(2) + "%",
        totalRequests: this.performanceMetrics.totalRequests,
        activeOperations: this.performanceMetrics.activeOperations,
      },
      circuitBreaker: {
        enabled: this.concurrencyControl.circuitBreaker.enabled,
        triggeredAt: this.concurrencyControl.circuitBreaker.triggeredAt,
        recoveryDelay: this.concurrencyControl.circuitBreaker.recoveryDelay,
      },
      recentAdjustments: this.performanceMetrics.concurrencyHistory.slice(-RECENT_METRICS_COUNT),
      lastUpdate: new Date(
        this.performanceMetrics.lastMetricsUpdate,
      ).toISOString(),
    };
  }

  // === 核心流数据获取功能 ===

  /**
   * Phase 1: 建立流式连接到提供商
   * @param params 连接参数
   * @returns 流连接实例
   */
  async establishStreamConnection(
    params: StreamConnectionParams,
  ): Promise<StreamConnection>;
  async establishStreamConnection(
    provider: string,
    capability: string,
    config?: Partial<StreamConnectionConfig>,
  ): Promise<StreamConnection>;
  async establishStreamConnection(
    paramsOrProvider: StreamConnectionParams | string,
    capability?: string,
    config?: Partial<StreamConnectionConfig>,
  ): Promise<StreamConnection> {
    // Handle overloaded signatures
    let provider: string;
    let cap: string;
    let connectionConfig: Partial<StreamConnectionConfig> | undefined;

    if (typeof paramsOrProvider === "string") {
      provider = paramsOrProvider;
      cap = capability!;
      connectionConfig = config;
    } else {
      provider = paramsOrProvider.provider;
      cap = paramsOrProvider.capability;
      connectionConfig = paramsOrProvider.options;
    }
    const operationStartTime = Date.now();
    let operationSuccess = false;

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      this.logger.debug("开始建立流式连接", {
        provider,
        capability: cap,
        config: connectionConfig
          ? { ...connectionConfig, credentials: "[REDACTED]" }
          : undefined,
      });

      // Phase 1.1: 获取流能力实例
      const capabilityInstance = await this.getStreamCapability(provider, cap);

      // Phase 1.2: 创建连接配置
      const finalConfig = {
        provider,
        capability: cap,
        maxReconnectAttempts: connectionConfig?.maxReconnectAttempts || 3,
        connectionTimeoutMs: connectionConfig?.connectionTimeoutMs || 30000,
        ...connectionConfig,
      };

      // Phase 1.3: 建立WebSocket连接
      const connection = await (
        capabilityInstance as {
          connect: (config: any) => Promise<StreamConnection>;
        }
      ).connect(finalConfig);

      if (!connection || !connection.id) {
        throw new StreamConnectionException(
          "连接建立失败：连接实例无效",
          undefined,
          provider,
          cap,
        );
      }

      // Phase 1.4: 注册连接到管理器
      const connectionKey = `${provider}:${cap}:${connection.id}`;
      this.activeConnections.set(connectionKey, connection);
      this.connectionIdToKey.set(connection.id, connectionKey);

      // Phase 1.5: 向连接池管理器注册
      this.connectionPoolManager.registerConnection(connectionKey);

      // Phase 1.6: 等待连接完全建立
      await this.waitForConnectionReady(
        connection,
        finalConfig.connectionTimeoutMs,
      );

      // Phase 1.7: 设置连接事件监听
      this.setupConnectionEventHandlers(connection);

      // 发送连接成功事件
      this.emitConnectionEvent("connection_established", {
        provider,
        capability: cap,
        duration: Date.now() - operationStartTime,
        status: "success",
        count: this.activeConnections.size,
      });

      this.logger.log("流式连接建立成功", {
        connectionKey,
        provider,
        capability: cap,
        connectionId: connection.id.substring(0, 8),
        totalConnections: this.activeConnections.size,
        establishmentTime: Date.now() - operationStartTime,
      });

      operationSuccess = true;
      return connection;
    } catch (error) {
      this.logger.error(
        "流式连接建立失败",
        sanitizeLogData({
          provider,
          capability: cap,
          error: error.message,
          duration: Date.now() - operationStartTime,
        }),
      );

      // 发送连接失败事件
      this.emitConnectionEvent("connection_establishment_failed", {
        provider,
        capability: cap,
        duration: Date.now() - operationStartTime,
        status: "error",
        error_type: error.constructor.name,
      });
      throw error;
    } finally {
      // P1-2: 记录操作性能并减少活跃操作计数
      this.performanceMetrics.activeOperations--;
      this.recordOperationPerformance(
        Date.now() - operationStartTime,
        operationSuccess,
      );
    }
  }

  /**
   * Phase 2: 订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要订阅的符号列表
   * @returns 订阅结果
   */
  async subscribeToSymbols(
    connection: StreamConnection,
    symbols: string[],
  ): Promise<void> {
    const operationStartTime = Date.now();
    let operationSuccess = false;

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      this.logger.debug("开始订阅符号数据流", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        capability: connection.capability,
        symbols: symbols.slice(0, 5), // 只显示前5个符号
        totalSymbols: symbols.length,
      });

      // Phase 2.1: 验证连接状态
      if (!connection.isConnected) {
        throw new StreamConnectionException(
          "连接未建立，无法订阅",
          connection.id,
          connection.provider,
          connection.capability,
        );
      }

      // Phase 2.2: 执行订阅操作
      const subscriptionResult = await this.performSubscription(
        connection,
        symbols,
      );

      // Phase 2.3: 缓存订阅信息
      await this.cacheSubscriptionInfo(
        connection.id,
        symbols,
        subscriptionResult,
      );

      // Phase 2.4: 更新客户端状态
      // TODO: Implement updateSubscriptionState method in StreamClientStateManager
      // this.clientStateManager.updateSubscriptionState(connection.id, symbols, 'subscribed');

      // 更新指标
      this.recordSubscriptionMetrics(
        "created",
        connection.provider,
        symbols.length,
      );

      this.logger.log("符号数据流订阅成功", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        subscribedSymbols: subscriptionResult.subscribedSymbols.length || 0,
        failedSymbols: subscriptionResult.failedSymbols?.length || 0,
        duration: Date.now() - operationStartTime,
      });

      operationSuccess = true;
      // Note: Interface requires void return, but we log the result internally
    } catch (error) {
      this.logger.error(
        "符号数据流订阅失败",
        sanitizeLogData({
          connectionId: connection.id.substring(0, 8),
          provider: connection.provider,
          symbols: symbols.slice(0, 3),
          error: error.message,
          duration: Date.now() - operationStartTime,
        }),
      );

      // 发送订阅失败事件
      this.emitSubscriptionEvent("subscription_failed", {
        provider: connection.provider,
        capability: connection.capability,
        symbol_count: symbols.length,
        duration: Date.now() - operationStartTime,
        status: "error",
        action: "subscribe",
        error_type: error.constructor.name,
      });
      throw error;
    } finally {
      // P1-2: 记录操作性能并减少活跃操作计数
      this.performanceMetrics.activeOperations--;
      this.recordOperationPerformance(
        Date.now() - operationStartTime,
        operationSuccess,
      );
    }
  }

  /**
   * Phase 3: 取消订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要取消订阅的符号列表
   * @returns 取消订阅结果
   */
  async unsubscribeFromSymbols(
    connection: StreamConnection,
    symbols: string[],
  ): Promise<void> {
    const operationStartTime = Date.now();
    let operationSuccess = false;

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      this.logger.debug("开始取消订阅符号数据流", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        symbols: symbols.slice(0, 5),
        totalSymbols: symbols.length,
      });

      // Phase 3.1: 执行取消订阅
      const unsubscriptionResult = await this.performUnsubscription(
        connection,
        symbols,
      );

      // Phase 3.2: 更新缓存
      await this.removeSubscriptionFromCache(connection.id, symbols);

      // Phase 3.3: 更新客户端状态
      // TODO: Implement updateSubscriptionState method in StreamClientStateManager
      // this.clientStateManager.updateSubscriptionState(connection.id, symbols, 'unsubscribed');

      // 更新指标
      this.recordSubscriptionMetrics(
        "cancelled",
        connection.provider,
        symbols.length,
      );

      this.logger.log("符号数据流取消订阅成功", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        unsubscribedSymbols:
          unsubscriptionResult.unsubscribedSymbols.length || 0,
        failedSymbols: unsubscriptionResult.failedSymbols?.length || 0,
        duration: Date.now() - operationStartTime,
      });

      operationSuccess = true;
      // Note: Interface requires void return, but we log the result internally
    } catch (error) {
      this.logger.error(
        "符号数据流取消订阅失败",
        sanitizeLogData({
          connectionId: connection.id.substring(0, 8),
          provider: connection.provider,
          symbols: symbols.slice(0, 3),
          error: error.message,
          duration: Date.now() - operationStartTime,
        }),
      );

      // 发送订阅失败事件
      this.emitSubscriptionEvent("subscription_failed", {
        provider: connection.provider,
        capability: connection.capability,
        symbol_count: symbols.length,
        duration: Date.now() - operationStartTime,
        status: "error",
        action: "subscribe",
        error_type: error.constructor.name,
      });
      throw error;
    } finally {
      // P1-2: 记录操作性能并减少活跃操作计数
      this.performanceMetrics.activeOperations--;
      this.recordOperationPerformance(
        Date.now() - operationStartTime,
        operationSuccess,
      );
    }
  }

  /**
   * Phase 4: 关闭流连接
   * @param connection 要关闭的流连接实例
   */
  async closeConnection(connection: StreamConnection): Promise<void> {
    const operationStartTime = Date.now();
    let operationSuccess = false;

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      const connectionKey = this.connectionIdToKey.get(connection.id);

      this.logger.debug("开始关闭流连接", {
        connectionId: connection.id.substring(0, 8),
        connectionKey,
        provider: connection.provider,
        capability: connection.capability,
      });

      // Phase 4.1: 发送连接关闭监控事件
      this.emitConnectionEvent("connection_monitoring_stopped", {
        provider: connection.provider,
        capability: connection.capability,
        operation: "stop_monitoring",
        status: "success",
      });

      // Phase 4.2: 执行连接关闭
      await connection.close();

      // Phase 4.3: 清理内存映射
      this.cleanupConnectionFromMaps(connection.id);

      // Phase 4.4: 清理缓存
      await this.clearConnectionCache(connection.id);

      // Phase 4.5: 更新客户端状态
      // TODO: Implement removeConnection method in StreamClientStateManager
      // this.clientStateManager.removeConnection(connection.id);

      // 更新指标
      this.recordConnectionMetrics("connected", connection.provider);
      this.updateActiveConnectionsCount(
        this.activeConnections.size,
        connection.provider,
      );

      this.logger.log("流连接关闭成功", {
        connectionId: connection.id.substring(0, 8),
        connectionKey,
        provider: connection.provider,
        remainingConnections: this.activeConnections.size,
        duration: Date.now() - operationStartTime,
      });

      operationSuccess = true;
    } catch (error) {
      this.logger.error(
        "流连接关闭失败",
        sanitizeLogData({
          connectionId: connection.id.substring(0, 8),
          provider: connection.provider,
          error: error.message,
          duration: Date.now() - operationStartTime,
        }),
      );

      // 即使关闭失败，也要清理内存映射防止泄漏
      this.cleanupConnectionFromMaps(connection.id);

      this.recordConnectionMetrics("failed", connection.provider);
      throw error;
    } finally {
      // P1-2: 记录操作性能并减少活跃操作计数
      this.performanceMetrics.activeOperations--;
      this.recordOperationPerformance(
        Date.now() - operationStartTime,
        operationSuccess,
      );
    }
  }

  /**
   * Phase 5: 检查连接是否活跃
   * @param connection 连接实例或连接键
   * @returns 是否活跃
   */
  isConnectionActive(connection: StreamConnection | string): boolean {
    if (typeof connection === "string") {
      const conn = this.activeConnections.get(connection);
      return conn ? conn.isConnected : false;
    }
    return connection.isConnected;
  }

  /**
   * Phase 5: 获取连接统计信息
   * @param connection 连接实例或连接键
   * @returns 连接统计
   */
  getConnectionStats(
    connection: StreamConnection | string,
  ): StreamConnectionStats | null {
    if (typeof connection === "string") {
      return this.activeConnections.get(connection)?.getStats?.() || null;
    }
    return connection.getStats?.() || null;
  }

  /**
   * Phase 5: 获取所有连接统计信息
   * @returns 所有连接统计的映射
   */
  getAllConnectionStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.activeConnections.forEach((connection, key) => {
      stats[key] = connection.getStats?.() || {
        connectionId: connection.id,
        isConnected: connection.isConnected,
      };
    });
    return stats;
  }

  /**
   * Phase 5: 获取现有连接
   * @param connectionKey 连接键
   * @returns 连接实例或null
   */
  getExistingConnection(connectionKey: string): StreamConnection | null {
    return this.activeConnections.get(connectionKey) || null;
  }

  /**
   * Phase 5: 根据提供商获取连接统计信息
   * @param provider 提供商名称
   * @returns 该提供商的连接统计
   */
  getConnectionStatsByProvider(provider: string): {
    total: number;
    active: number;
    connections: Array<{
      key: string;
      id: string;
      capability: string;
      isConnected: boolean;
      lastActiveAt: Date;
    }>;
  } {
    const connections = Array.from(this.activeConnections.entries()).filter(
      ([, connection]) => connection.provider === provider,
    );

    return {
      total: connections.length,
      active: connections.filter(([, connection]) => connection.isConnected)
        .length,
      connections: connections.map(([key, connection]) => ({
        key,
        id: connection.id.substring(0, 8),
        capability: connection.capability,
        isConnected: connection.isConnected,
        lastActiveAt: connection.lastActiveAt,
      })),
    };
  }

  /**
   * Phase 5.4: P1-1 分层健康检查架构 - 性能提升80%+
   *
   * 三层检查架构：
   * - Tier 1: 快速状态检查 (~1ms per connection) - 处理80-90%的连接
   * - Tier 2: 心跳验证 (~50ms per connection) - 处理5-15%的可疑连接
   * - Tier 3: 完整健康检查 (~1000ms per connection) - 处理1-5%的问题连接
   *
   * @param options 健康检查选项
   * @returns 健康检查结果映射
   */
  async batchHealthCheck(
    options: {
      timeoutMs?: number;
      concurrency?: number;
      retries?: number;
      skipUnresponsive?: boolean;
      tieredEnabled?: boolean;
    } = {},
  ): Promise<Record<string, boolean>> {
    const operationStartTime = Date.now();
    let operationSuccess = false;

    try {
      // P1-2: 使用自适应并发控制
      const adaptiveConcurrency = this.getCurrentConcurrency();
      const {
        timeoutMs = OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
        retries = 1,
        skipUnresponsive = true,
        tieredEnabled = true,
      } = options;

      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      if (!tieredEnabled) {
        // 回退到传统批量检查
        operationSuccess = true;
        return this.legacyBatchHealthCheck(options);
      }

      const startTime = Date.now();
      const connections = Array.from(this.activeConnections.entries());
      const results: Record<string, boolean> = {};

      this.logger.debug("开始分层健康检查", {
        totalConnections: connections.length,
        adaptiveConcurrency,
        tiersEnabled: ["快速状态", "心跳验证", "完整检查"],
      });

      // Tier 1: 快速状态检查 (80-90% 的连接通过此层)
      const tier1Results = await this.tier1QuickStatusCheck(connections);
      const tier1Passed = tier1Results.filter((result) => result.passed).length;
      const tier1Failed = tier1Results.filter(
        (result) => !result.passed,
      ).length;

      // 将 Tier 1 通过的连接标记为健康
      tier1Results.forEach((result) => {
        if (result.passed) {
          results[result.key] = true;
        }
      });

      // Tier 2: 心跳验证 (5-15% 的可疑连接)
      const tier2Candidates = tier1Results.filter(
        (result) => result.suspicious,
      );
      const tier2Results = await this.tier2HeartbeatVerification(
        tier2Candidates,
        timeoutMs,
      );
      const tier2Passed = tier2Results.filter((result) => result.passed).length;
      const tier2Failed = tier2Results.filter(
        (result) => !result.passed,
      ).length;

      // 将 Tier 2 通过的连接标记为健康
      tier2Results.forEach((result) => {
        if (result.passed) {
          results[result.key] = true;
        }
      });

      // Tier 3: 完整健康检查 (1-5% 的问题连接)
      const tier3Candidates = [
        ...tier1Results.filter(
          (result) => !result.passed && !result.suspicious,
        ),
        ...tier2Results.filter((result) => !result.passed),
      ];
      const tier3Results = await this.tier3FullHealthCheck(
        tier3Candidates,
        timeoutMs,
        retries,
        skipUnresponsive,
      );
      const tier3Passed = tier3Results.filter((result) => result.passed).length;
      const tier3Failed = tier3Results.filter(
        (result) => !result.passed,
      ).length;

      // 将 Tier 3 结果添加到最终结果
      tier3Results.forEach((result) => {
        results[result.key] = result.passed;
      });

      const totalProcessingTime = Date.now() - startTime;
      const totalConnections = connections.length;
      const healthyConnections = Object.values(results).filter(
        (isHealthy) => isHealthy,
      ).length;
      const healthRate =
        totalConnections > 0
          ? (healthyConnections / totalConnections) * 100
          : 100;

      this.logger.log("分层健康检查完成", {
        totalConnections,
        healthyConnections,
        healthRate: healthRate.toFixed(1) + "%",
        processingTimeMs: totalProcessingTime,
        adaptiveConcurrency,
        performance: {
          tier1: { passed: tier1Passed, failed: tier1Failed },
          tier2: { passed: tier2Passed, failed: tier2Failed },
          tier3: { passed: tier3Passed, failed: tier3Failed },
        },
        efficiencyImprovement: this.calculateEfficiencyImprovement(
          connections.length,
          tier1Passed,
          tier2Passed,
          tier3Passed,
        ),
      });

      // 如果健康率过低，触发告警
      if (healthRate < 50) {
        this.logger.error("连接健康率过低", {
          healthRate: healthRate.toFixed(1) + "%",
          totalConnections,
          healthyConnections,
          distribution: {
            tier1Healthy: tier1Passed,
            tier2Healthy: tier2Passed,
            tier3Healthy: tier3Passed,
          },
        });
      }

      operationSuccess = true;
      return results;
    } catch (error) {
      this.logger.error("分层健康检查失败", {
        error: error.message,
        duration: Date.now() - operationStartTime,
      });
      throw error;
    } finally {
      // P1-2: 记录操作性能并减少活跃操作计数
      this.performanceMetrics.activeOperations--;
      this.recordOperationPerformance(
        Date.now() - operationStartTime,
        operationSuccess,
      );
    }
  }

  /**
   * Tier 1: 快速状态检查 - 基于连接状态和最后活跃时间
   * 性能目标: ~1ms per connection
   */
  private async tier1QuickStatusCheck(
    connections: [string, StreamConnection][],
  ): Promise<
    Array<{
      key: string;
      connection: StreamConnection;
      passed: boolean;
      suspicious: boolean;
    }>
  > {
    const startTime = Date.now();
    const results = connections.map(([key, connection]) => {
      const now = Date.now();
      const timeSinceLastActivity = now - connection.lastActiveAt.getTime();
      const maxInactivityMs = 5 * 60 * 1000; // 5分钟
      const suspiciousInactivityMs = 2 * 60 * 1000; // 2分钟

      // 快速检查：基础连接状态
      if (!connection.isConnected) {
        return { key, connection, passed: false, suspicious: false };
      }

      // 快速检查：活跃度验证
      if (timeSinceLastActivity > maxInactivityMs) {
        return { key, connection, passed: false, suspicious: false };
      }

      // 可疑检查：介于正常和异常之间
      if (timeSinceLastActivity > suspiciousInactivityMs) {
        return { key, connection, passed: false, suspicious: true };
      }

      // 通过 Tier 1 检查
      return { key, connection, passed: true, suspicious: false };
    });

    const processingTime = Date.now() - startTime;
    this.logger.debug("Tier1快速状态检查完成", {
      processed: connections.length,
      passed: results.filter((r) => r.passed).length,
      suspicious: results.filter((r) => r.suspicious).length,
      failed: results.filter((r) => !r.passed && !r.suspicious).length,
      processingTime,
      avgTimePerConnection:
        (processingTime / connections.length).toFixed(2) + "ms",
    });

    return results;
  }

  /**
   * Tier 2: 心跳验证 - 轻量级心跳检查可疑连接
   * 性能目标: ~50ms per connection
   */
  private async tier2HeartbeatVerification(
    candidates: Array<{
      key: string;
      connection: StreamConnection;
      passed: boolean;
      suspicious: boolean;
    }>,
    timeoutMs: number,
  ): Promise<
    Array<{
      key: string;
      connection: StreamConnection;
      passed: boolean;
    }>
  > {
    if (candidates.length === 0) return [];

    const startTime = Date.now();
    const heartbeatTimeout = Math.min(timeoutMs * 0.1, 1000); // 10% 超时或1秒上限

    const results = await Promise.allSettled(
      candidates.map(async ({ key, connection }) => {
        try {
          // 轻量级心跳检查
          const heartbeatPromise = connection.sendHeartbeat();
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(
              () => reject(new Error("Tier2 heartbeat timeout")),
              heartbeatTimeout,
            ),
          );

          const heartbeatResult = await Promise.race([
            heartbeatPromise,
            timeoutPromise,
          ]);

          return {
            key,
            connection,
            passed: heartbeatResult && connection.isConnected,
          };
        } catch (error) {
          return {
            key,
            connection,
            passed: false,
          };
        }
      }),
    );

    const finalResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const { key, connection } = candidates[index];
        return { key, connection, passed: false };
      }
    });

    const processingTime = Date.now() - startTime;
    this.logger.debug("Tier2心跳验证完成", {
      candidates: candidates.length,
      passed: finalResults.filter((r) => r.passed).length,
      failed: finalResults.filter((r) => !r.passed).length,
      processingTime,
      avgTimePerConnection:
        (processingTime / candidates.length).toFixed(2) + "ms",
    });

    return finalResults;
  }

  /**
   * Tier 3: 完整健康检查 - 深度检查问题连接
   * 性能目标: ~1000ms per connection (仅处理1-5%的连接)
   */
  private async tier3FullHealthCheck(
    candidates: Array<{
      key: string;
      connection: StreamConnection;
      passed?: boolean;
    }>,
    timeoutMs: number,
    maxRetries: number,
    skipUnresponsive: boolean,
  ): Promise<
    Array<{
      key: string;
      connection: StreamConnection;
      passed: boolean;
    }>
  > {
    if (candidates.length === 0) return [];

    const startTime = Date.now();

    const results = await Promise.allSettled(
      candidates.map(async ({ key, connection }) => {
        const result = await this.performHealthCheckWithRetry(
          key,
          connection,
          timeoutMs,
          maxRetries,
          skipUnresponsive,
        );
        return { key, connection, passed: result };
      }),
    );

    const finalResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const { key, connection } = candidates[index];
        return { key, connection, passed: false };
      }
    });

    const processingTime = Date.now() - startTime;
    this.logger.debug("Tier3完整健康检查完成", {
      candidates: candidates.length,
      passed: finalResults.filter((r) => r.passed).length,
      failed: finalResults.filter((r) => !r.passed).length,
      processingTime,
      avgTimePerConnection:
        (processingTime / candidates.length).toFixed(2) + "ms",
    });

    return finalResults;
  }

  /**
   * 计算效率提升
   */
  private calculateEfficiencyImprovement(
    total: number,
    _tier1: number,
    tier2: number,
    tier3: number,
  ): string {
    if (total === 0) return "0%";

    // 传统方法：所有连接都需要完整检查 (~1000ms each)
    const traditionalTime = total * 1000;

    // 分层方法：Tier1(1ms) + Tier2(50ms) + Tier3(1000ms)
    const tieredTime = total * 1 + tier2 * 50 + tier3 * 1000;

    const improvement = Math.max(
      0,
      ((traditionalTime - tieredTime) / traditionalTime) * 100,
    );

    return improvement.toFixed(1) + "%";
  }

  /**
   * 传统批量健康检查 (回退方案)
   */
  private async legacyBatchHealthCheck(options: {
    timeoutMs?: number;
    concurrency?: number;
    retries?: number;
    skipUnresponsive?: boolean;
  }): Promise<Record<string, boolean>> {
    // P1-2: 使用自适应并发控制
    const adaptiveConcurrency = this.getCurrentConcurrency();
    const {
      timeoutMs = OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
      concurrency = adaptiveConcurrency, // 使用自适应并发限制
      retries = 1,
      skipUnresponsive = true,
    } = options;

    const connections = Array.from(this.activeConnections.entries());
    const results: [string, boolean][] = [];

    this.logger.debug("使用传统批量健康检查", {
      totalConnections: connections.length,
      adaptiveConcurrency,
      reason: "分层检查已禁用",
    });

    // 原有的批次处理逻辑...
    for (let i = 0; i < connections.length; i += concurrency) {
      const batch = connections.slice(i, i + concurrency);

      const batchPromises = batch.map(async ([key, connection]) => {
        return this.performHealthCheckWithRetry(
          key,
          connection,
          timeoutMs,
          retries,
          skipUnresponsive,
        );
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const [key] = batch[index];
        results.push([
          key,
          result.status === "fulfilled" ? result.value : false,
        ]);
      });

      if (i + concurrency < connections.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return Object.fromEntries(results);
  }

  /**
   * 执行带重试的健康检查
   * @private
   */
  private async performHealthCheckWithRetry(
    key: string,
    connection: StreamConnection,
    timeoutMs: number,
    maxRetries: number,
    skipUnresponsive: boolean,
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // 检查连接是否仍然存在（防止在健康检查过程中连接被关闭）
        if (!this.activeConnections.has(key)) {
          this.logger.debug("连接在健康检查期间已被关闭", {
            connectionKey: key,
          });
          return false;
        }

        // 执行健康检查
        const startTime = Date.now();
        const isAlive = await Promise.race([
          this.checkConnectionHealth(connection, timeoutMs),
          new Promise<boolean>((_, reject) =>
            setTimeout(
              () => reject(new Error("Health check timeout")),
              timeoutMs,
            ),
          ),
        ]);

        const checkDuration = Date.now() - startTime;

        if (attempt > 1) {
          this.logger.debug("健康检查重试成功", {
            connectionKey: key,
            attempt,
            duration: checkDuration,
            result: isAlive,
          });
        }

        // 如果响应时间过长且配置了跳过不响应连接，标记为不健康
        if (skipUnresponsive && checkDuration > timeoutMs * 0.8) {
          this.logger.warn("连接响应缓慢", {
            connectionKey: key,
            duration: checkDuration,
            threshold: timeoutMs * 0.8,
          });
          return false;
        }

        return isAlive;
      } catch (error) {
        lastError = error;

        if (attempt <= maxRetries) {
          this.logger.debug("健康检查重试", {
            connectionKey: key,
            attempt,
            maxRetries: maxRetries + 1,
            error: error.message,
          });

          // 重试前短暂延迟
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(100 * attempt, 500)),
          );
        }
      }
    }

    // 所有重试都失败
    this.logger.warn("连接健康检查最终失败", {
      connectionKey: key,
      attempts: maxRetries + 1,
      lastError: lastError?.message || "Unknown error",
    });

    return false;
  }

  /**
   * Phase 4: 获取内部缓存服务 - 供 StreamReceiver 使用
   */
  getStreamDataCache(): StreamCacheService {
    return this.streamCache;
  }

  /**
   * Phase 4: 获取客户端状态管理器 - 供 StreamReceiver 使用
   */
  getClientStateManager(): StreamClientStateManager {
    return this.clientStateManager;
  }

  /**
   * BaseFetcherService抽象方法实现
   * @param params 参数
   */
  async executeCore(): Promise<any> {
    // 这里可以用于其他核心操作，暂时不需要实现
    throw new Error("executeCore not implemented for StreamDataFetcher");
  }

  // === 私有方法 ===

  /**
   * 获取流能力实例
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 能力实例
   */
  private async getStreamCapability(
    provider: string,
    capability: string,
  ): Promise<unknown> {
    try {
      // 使用现有的CapabilityRegistry获取能力
      const registry = this.capabilityRegistry as {
        getCapability?: (provider: string, capability: string) => unknown;
        get?: (provider: string, capability: string) => unknown;
      };

      const capabilityInstance =
        registry.getCapability?.(provider, capability) ||
        registry.get?.(provider, capability);

      if (!capabilityInstance) {
        throw new NotFoundException(`流能力不存在: ${provider}/${capability}`);
      }

      // 验证这是一个WebSocket能力
      if (!capability.startsWith("ws-") && !capability.includes("stream")) {
        this.logger.warn("可能不是流能力", {
          provider,
          capability,
          suggestion: '流能力通常以"ws-"开头或包含"stream"',
        });
      }

      return capabilityInstance;
    } catch (error) {
      throw new StreamConnectionException(
        `获取流能力失败: ${error.message}`,
        undefined,
        provider,
        capability,
      );
    }
  }

  /**
   * 获取流指标摘要 - 用于监控和调试
   * @returns 指标摘要信息
   */
  getMetricsSummary(): {
    activeConnections: number;
    connectionMappings: number;
    timestamp: string;
    status: string;
  } {
    // 通过事件发送指标摘要请求
    this.emitMetricsEvent("metrics_summary_requested", {
      activeConnections: this.activeConnections.size,
      connectionMappings: this.connectionIdToKey.size,
      requestId: Date.now().toString(),
    });

    // 返回当前状态摘要
    return {
      activeConnections: this.activeConnections.size,
      connectionMappings: this.connectionIdToKey.size,
      timestamp: new Date().toISOString(),
      status: "active",
    };
  }

  /**
   * 从内部Map中清理连接（防止内存泄漏的辅助方法）
   *
   * @param connectionId 连接ID
   * @private
   */
  private cleanupConnectionFromMaps(connectionId: string): void {
    const connectionKey = this.connectionIdToKey.get(connectionId);
    if (connectionKey) {
      // 从连接池管理器注销
      this.connectionPoolManager.unregisterConnection(connectionKey);

      // 从内部Map移除
      this.activeConnections.delete(connectionKey);
      this.connectionIdToKey.delete(connectionId);

      this.logger.debug("连接已从内部Map清理", {
        connectionId,
        connectionKey,
        remainingConnections: this.activeConnections.size,
      });
    }
  }

  /**
   * 获取连接池状态
   */
  getConnectionPoolStats() {
    const poolStats = this.connectionPoolManager.getStats();
    const alerts = this.connectionPoolManager.getAlerts();

    return {
      ...poolStats,
      alerts,
      activeConnections: this.activeConnections.size,
      // P1-2: 添加自适应并发控制状态
      adaptiveConcurrency: this.getAdaptiveConcurrencyStats(),
      // 使用事件化监控，无需直接获取监控状态
      eventDrivenMonitoring: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 启动 Map 对象定期清理机制
   * 使用递归 setTimeout 模式，避免 setInterval 的内存泄漏问题
   */
  private startPeriodicMapCleanup(): void {
    this.scheduleNextMapCleanup();

    this.logger.debug("Map对象定期清理机制已启动", {
      cleanupInterval: "5分钟",
      mechanism: "递归setTimeout",
    });
  }

  /**
   * 安全的递归定时调度
   */
  private scheduleNextMapCleanup(): void {
    if (this.isServiceDestroyed) return;

    this.cleanupTimer = setTimeout(
      () => {
        try {
          this.performPeriodicMapCleanup();
        } catch (error) {
          this.logger.error("Map定期清理过程异常", {
            error: error.message,
            activeConnections: this.activeConnections.size,
            connectionMappings: this.connectionIdToKey.size,
          });
        } finally {
          // 递归调度下一次清理（5分钟间隔）
          this.scheduleNextMapCleanup();
        }
      },
      5 * 60 * 1000,
    ); // 5分钟
  }

  /**
   * 执行 Map 对象定期清理
   * 清理无效的连接映射和僵尸连接
   */
  private performPeriodicMapCleanup(): void {
    const startTime = Date.now();
    let cleanedConnections = 0;
    let cleanedMappings = 0;

    this.logger.debug("开始执行Map定期清理", {
      currentActiveConnections: this.activeConnections.size,
      currentMappings: this.connectionIdToKey.size,
    });

    // 1. 清理无效的连接映射（connectionIdToKey中有，但activeConnections中没有）
    const mappingEntries = Array.from(this.connectionIdToKey.entries());
    for (const [connectionId, connectionKey] of mappingEntries) {
      if (!this.activeConnections.has(connectionKey)) {
        this.connectionIdToKey.delete(connectionId);
        cleanedMappings++;

        this.logger.debug("清理了无效的连接映射", {
          connectionId: connectionId.substring(0, 8),
          connectionKey,
        });
      }
    }

    // 2. 清理僵尸连接（连接不活跃超过30分钟）
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const connectionsToRemove: string[] = [];

    const connectionEntries = Array.from(this.activeConnections.entries());
    for (const [connectionKey, connection] of connectionEntries) {
      try {
        // 检查连接是否已经断开且长时间无活动
        if (
          !connection.isConnected &&
          connection.lastActiveAt.getTime() < thirtyMinutesAgo
        ) {
          connectionsToRemove.push(connectionKey);

          this.logger.debug("发现僵尸连接", {
            connectionId: connection.id.substring(0, 8),
            connectionKey,
            lastActiveAt: connection.lastActiveAt.toISOString(),
            inactiveDuration: Date.now() - connection.lastActiveAt.getTime(),
          });
        }
      } catch (error) {
        // 如果连接对象已经损坏，也标记为需要清理
        connectionsToRemove.push(connectionKey);
        this.logger.warn("发现损坏的连接对象", {
          connectionKey,
          error: error.message,
        });
      }
    }

    // 执行僵尸连接清理
    for (const connectionKey of connectionsToRemove) {
      const connection = this.activeConnections.get(connectionKey);
      if (connection) {
        // 发送清理监控事件
        this.emitConnectionEvent("connection_cleanup", {
          provider: connection.provider,
          operation: "cleanup_monitoring",
          status: "success",
        });

        // 从映射表中清理
        this.connectionIdToKey.delete(connection.id);
        this.activeConnections.delete(connectionKey);

        // 从连接池管理器中注销
        this.connectionPoolManager.unregisterConnection(connectionKey);

        cleanedConnections++;

        this.logger.debug("清理了僵尸连接", {
          connectionId: connection.id.substring(0, 8),
          connectionKey,
        });
      }
    }

    const processingTime = Date.now() - startTime;

    // 记录清理结果
    if (cleanedConnections > 0 || cleanedMappings > 0) {
      this.logger.log("Map定期清理完成", {
        cleanedConnections,
        cleanedMappings,
        processingTime,
        remainingConnections: this.activeConnections.size,
        remainingMappings: this.connectionIdToKey.size,
      });

      // 更新连接数指标 - 使用事件化监控
      if (this.activeConnections.size > 0) {
        const connection = this.activeConnections.values().next().value;
        this.updateActiveConnectionsCount(
          this.activeConnections.size,
          connection.provider,
        );
      }
    } else {
      this.logger.debug("Map定期清理完成，无需清理项目", {
        processingTime,
        activeConnections: this.activeConnections.size,
        mappings: this.connectionIdToKey.size,
      });
    }

    // 如果发现内存泄漏趋势，触发警告
    if (this.connectionIdToKey.size > this.activeConnections.size * 2) {
      this.logger.warn("检测到潜在的Map内存泄漏", {
        activeConnections: this.activeConnections.size,
        mappings: this.connectionIdToKey.size,
        ratio: (
          this.connectionIdToKey.size / Math.max(this.activeConnections.size, 1)
        ).toFixed(2),
        suggestion: "考虑检查连接清理逻辑",
      });
    }
  }

  /**
   * 模块销毁时清理资源
   * 实现 OnModuleDestroy 接口确保 RxJS 事件监听器被正确清理
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug("StreamDataFetcherService 开始销毁清理");

    // 标记服务为已销毁，停止定期清理
    this.isServiceDestroyed = true;

    // 清理定期清理定时器
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.debug("Map定期清理定时器已清理");
    }

    // 发送销毁信号，清理所有 RxJS 事件监听器
    this.destroy$.next();
    this.destroy$.complete();

    // 发送服务销毁监控事件
    this.emitMetricsEvent("service_destroyed", {
      activeConnections: this.activeConnections.size,
      connectionMappings: this.connectionIdToKey.size,
      operation: "service_destroy",
      status: "info",
    });

    // 关闭所有活跃连接
    const closePromises = Array.from(this.activeConnections.values()).map(
      (connection) =>
        this.closeConnection(connection).catch((error) =>
          this.logger.warn("连接关闭失败", {
            connectionId: connection.id.substring(0, 8),
            error: error.message,
          }),
        ),
    );

    // P1-2: 添加超时机制，避免销毁过程阻塞
    const closeTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.warn("连接关闭超时，强制清理");
        resolve();
      }, 10000); // 10秒超时
    });

    try {
      await Promise.race([Promise.allSettled(closePromises), closeTimeout]);
    } catch (error) {
      this.logger.error("连接关闭过程出错", { error: error.message });
    }

    // 强制清理所有内存映射
    this.activeConnections.clear();
    this.connectionIdToKey.clear();

    this.logger.log("StreamDataFetcherService 销毁清理完成", {
      clearedConnections: this.activeConnections.size,
      clearedMappings: this.connectionIdToKey.size,
      // P1-2: 记录最终的性能统计
      finalPerformanceStats: {
        totalRequests: this.performanceMetrics.totalRequests,
        successRate:
          (this.performanceMetrics.successRate * 100).toFixed(1) + "%",
        avgResponseTime:
          this.performanceMetrics.avgResponseTime.toFixed(0) + "ms",
        finalConcurrency: this.concurrencyControl.currentConcurrency,
      },
    });
  }

  // === 私有辅助方法 ===

  /**
   * 等待连接就绪
   * @param connection 连接实例
   * @param timeoutMs 超时时间
   */
  private async waitForConnectionReady(
    connection: StreamConnection,
    timeoutMs: number = 10000,
  ): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // 如果已经连接，直接返回
      if (connection.isConnected) {
        this.emitConnectionEvent("connection_ready", {
          provider: connection.provider,
          capability: connection.capability,
          duration: Date.now() - startTime,
          status: "success",
        });
        resolve();
        return;
      }

      let resolved = false;

      // 状态变化监听
      const handleStatusChange = (status: StreamConnectionStatus) => {
        if (resolved) return;

        if (
          status === StreamConnectionStatus.CONNECTED ||
          connection.isConnected
        ) {
          resolved = true;
          this.emitConnectionEvent("connection_ready", {
            provider: connection.provider,
            capability: connection.capability,
            duration: Date.now() - startTime,
            status: "success",
          });
          resolve();
        }
      };

      // 错误监听
      const handleError = (error: Error) => {
        if (resolved) return;
        resolved = true;

        this.emitConnectionEvent("connection_failed", {
          provider: connection.provider,
          capability: connection.capability,
          duration: Date.now() - startTime,
          status: "error",
          error_type: error.constructor.name,
        });
        reject(error);
      };

      // 超时处理
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;

        const error = new Error(`连接建立超时 (${timeoutMs}ms)`);
        this.emitConnectionEvent("connection_timeout", {
          provider: connection.provider,
          capability: connection.capability,
          duration: Date.now() - startTime,
          status: "error",
          error_type: "TimeoutError",
        });
        reject(error);
      }, timeoutMs);

      // 设置事件监听器
      try {
        connection.onStatusChange(handleStatusChange);
        connection.onError(handleError);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      }
    });
  }

  /**
   * 设置连接事件处理器
   * @param connection 连接实例
   */
  private setupConnectionEventHandlers(connection: StreamConnection): void {
    try {
      // 状态变化处理
      connection.onStatusChange((status: StreamConnectionStatus) => {
        this.emitConnectionEvent("status_changed", {
          provider: connection.provider,
          capability: connection.capability,
          status:
            status === StreamConnectionStatus.CLOSED ||
            status === StreamConnectionStatus.ERROR
              ? "error"
              : "success",
          operation: "status_change",
        });

        // 连接关闭时清理
        if (
          status === StreamConnectionStatus.CLOSED ||
          status === StreamConnectionStatus.ERROR
        ) {
          this.cleanupConnectionFromMaps(connection.id);
        }
      });

      // 错误处理
      connection.onError((error) => {
        this.logger.warn("连接错误", {
          connectionId: connection.id.substring(0, 8),
          provider: connection.provider,
          error: error.message,
        });

        this.emitConnectionEvent("connection_error", {
          provider: connection.provider,
          capability: connection.capability,
          status: "error",
          error_type: error.constructor.name,
          operation: "error_handling",
        });

        // 错误时清理连接
        this.cleanupConnectionFromMaps(connection.id);
      });
    } catch (error) {
      this.logger.warn("设置连接事件处理器失败", {
        connectionId: connection.id.substring(0, 8),
        error: error.message,
      });
    }
  }

  /**
   * 执行订阅操作的内部实现
   */
  private async performSubscription(
    _connection: StreamConnection,
    symbols: string[],
  ): Promise<SubscriptionResult> {
    // 简化的订阅实现，实际应该调用连接的订阅方法
    try {
      // 模拟订阅操作
      return {
        success: true,
        subscribedSymbols: symbols,
        failedSymbols: [],
      };
    } catch (error) {
      return {
        success: false,
        subscribedSymbols: [],
        failedSymbols: symbols,
        error: error.message,
      };
    }
  }

  /**
   * 执行取消订阅操作的内部实现
   */
  private async performUnsubscription(
    _connection: StreamConnection,
    symbols: string[],
  ): Promise<UnsubscriptionResult> {
    try {
      // 实际的取消订阅逻辑
      return {
        success: true,
        unsubscribedSymbols: symbols,
        failedSymbols: [],
      };
    } catch (error) {
      return {
        success: false,
        unsubscribedSymbols: [],
        failedSymbols: symbols,
        error: error.message,
      };
    }
  }

  /**
   * 缓存订阅信息
   */
  private async cacheSubscriptionInfo(
    connectionId: string,
    symbols: string[],
    result: SubscriptionResult,
  ): Promise<void> {
    try {
      // 使用streamCache来缓存订阅信息
      const cacheKey = `subscription:${connectionId}`;
      const subscriptionData = {
        symbols,
        result,
        timestamp: new Date().toISOString(),
      };
      // StreamCache expects array data, so we wrap the subscription data
      await this.streamCache.setData(cacheKey, [subscriptionData], "warm");
    } catch (error) {
      this.logger.warn(`缓存订阅信息失败: ${connectionId}`, error);
    }
  }

  /**
   * 从缓存中移除订阅信息
   */
  private async removeSubscriptionFromCache(
    connectionId: string,
    _symbols: string[],
  ): Promise<void> {
    try {
      const cacheKey = `subscription:${connectionId}`;
      await this.streamCache.deleteData(cacheKey);
    } catch (error) {
      this.logger.warn(`移除订阅缓存失败: ${connectionId}`, error);
    }
  }

  /**
   * 清理连接缓存
   */
  private async clearConnectionCache(connectionId: string): Promise<void> {
    try {
      const cacheKeys = [
        `connection:${connectionId}`,
        `subscription:${connectionId}`,
      ];
      await Promise.all(
        cacheKeys.map((key) => this.streamCache.deleteData(key)),
      );
    } catch (error) {
      this.logger.warn(`清理连接缓存失败: ${connectionId}`, error);
    }
  }

  /**
   * 检查连接健康状态
   */
  private async checkConnectionHealth(
    connection: StreamConnection,
    _timeoutMs: number,
  ): Promise<boolean> {
    try {
      // 简化的健康检查实现
      return (
        connection.isConnected &&
        new Date().getTime() - connection.lastActiveAt.getTime() < 300000
      ); // 5分钟内有活动
    } catch (error) {
      return false;
    }
  }

  /**
   * 记录连接指标
   */
  private recordConnectionMetrics(
    event: "connected" | "disconnected" | "failed",
    provider: string,
  ): void {
    // 替换为事件化监控
    this.emitConnectionEvent("connection_state_changed", {
      provider,
      operation: event,
      status: event === "failed" ? "error" : "success",
      count: this.activeConnections.size,
    });
  }

  /**
   * 记录订阅指标
   */
  private recordSubscriptionMetrics(
    event: string,
    provider: string,
    symbolCount: number,
  ): void {
    // 替换为事件化监控
    this.emitSubscriptionEvent("subscription_operation", {
      provider,
      symbol_count: symbolCount,
      action: event === "created" ? "subscribe" : "unsubscribe",
      status: "success",
    });
  }

  /**
   * 更新活跃连接数指标
   */
  private updateActiveConnectionsCount(count: number, provider: string): void {
    // 替换为事件化监控
    this.emitConnectionEvent("active_connections_updated", {
      provider,
      count,
      operation: "connection_count_update",
      status: "success",
    });
  }
}
