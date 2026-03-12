// RECENT_METRICS_COUNT 已移动到监控配置中，通过 configService 动态获取
import { OPERATION_LIMITS } from "@common/constants/domain";
import {
  Injectable,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StreamConfigService } from "../config/stream-config.service";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { v4 as uuidv4 } from "uuid";
import { Subject, fromEvent, race, timer } from "rxjs";
import { takeUntil, first, map } from "rxjs/operators";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { BaseFetcherService } from "../../../shared/services/base-fetcher.service";
import {
  IStreamDataFetcher,
  StreamConnectionParams,
  StreamConnection,
  StreamConnectionException,
  StreamSubscriptionException,
  StreamConnectionStats,
  StreamConnectionStatus,
  StreamConnectionOptions,
  SubscriptionResult,
  UnsubscriptionResult,
} from "../interfaces";
import { StreamCacheStandardizedService } from "../../../05-caching/module/stream-cache/services/stream-cache-standardized.service";
import { StreamClientStateManager } from "./stream-client-state-manager.service";
import { ConnectionPoolManager } from "./connection-pool-manager.service";

type ProviderCleanupStatus =
  | "cleaned"
  | "no_method"
  | "failed"
  | "already_cleaned"
  | "in_progress"
  | "not_idle";

interface ProviderCleanupResult {
  status: ProviderCleanupStatus;
  error?: string;
}

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
 * - 数据缓存（由 StreamCacheStandardizedService 负责）
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
  private readonly connectionIdToPoolKey = new Map<string, string>();
  private readonly connectionIdToClientIP = new Map<string, string>();
  private readonly closeConnectionInFlight = new Map<string, Promise<void>>();
  private readonly closedConnectionIds = new Map<string, number>();
  private readonly closedConnectionErrors = new Map<string, string>();
  private readonly closedConnectionRetryCooldownUntil = new Map<string, number>();
  private readonly closedConnectionRetryCooldownMs = 30 * 1000;
  private readonly closedConnectionTtlMs = 30 * 60 * 1000;
  private readonly maxClosedConnectionRecords = 5000;
  private readonly connectionLevelCloseHandlers = new WeakMap<
    StreamConnection,
    () => Promise<void>
  >();
  private readonly providerCleanupInProgress = new Set<string>();
  private readonly providersCleanedAtIdle = new Set<string>();
  private readonly providerEstablishingConnections = new Map<string, number>();

  // P0-2: RxJS 清理机制
  private readonly destroy$ = new Subject<void>();

  // P0-3: 定期清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null;
  private concurrencyAdjustmentTimer: NodeJS.Timeout | null = null;
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
    currentConcurrency: 10,

    // 并发限制范围
    minConcurrency: 2,
    maxConcurrency: 50,

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
    private readonly capabilityRegistry: ProviderRegistryService,
    private readonly streamCache: StreamCacheStandardizedService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly connectionPoolManager: ConnectionPoolManager,
    // ✅ 事件化驱动监控 - 仅注入事件总线
    protected readonly eventBus: EventEmitter2,
    // 添加配置服务以支持动态配置获取
    private readonly configService: ConfigService,
    private readonly streamConfigService: StreamConfigService,
  ) {
    super(eventBus);

    // 统一从配置服务加载并发控制默认值与阈值
    this.loadConcurrencyConfigFromService();

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
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
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
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
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
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
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
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });
  }

  private generateConnectionId(
    provider: string,
    capability: string,
    timestampMs: number,
  ): string {
    return `${provider}_${capability}_${timestampMs}_${uuidv4()}`;
  }

  private buildPoolKey(provider: string, capability: string): string {
    return `${provider}:${capability}`;
  }

  private buildConnectionMapKey(poolKey: string, connectionId: string): string {
    return `${poolKey}:${connectionId}`;
  }

  // === P1-2: 自适应并发控制核心方法 ===

  /**
   * 启动自适应并发控制监控
   */
  private startAdaptiveConcurrencyMonitoring(): void {
    // 定期分析性能并调整并发限制
    const intervalMs = (this.streamConfigService.getPerformanceConfig() as any)?.concurrencyAdjustmentIntervalMs ?? 30000;
    this.concurrencyAdjustmentTimer = setInterval(() => {
      if (!this.isServiceDestroyed) {
        this.analyzePerformanceAndAdjustConcurrency();
      } else {
        if (this.concurrencyAdjustmentTimer) {
          clearInterval(this.concurrencyAdjustmentTimer);
          this.concurrencyAdjustmentTimer = null;
        }
      }
    }, intervalMs);
    this.concurrencyAdjustmentTimer.unref?.();

    this.logger.debug("自适应并发控制监控已启动", {
      currentConcurrency: this.concurrencyControl.currentConcurrency,
      minConcurrency: this.concurrencyControl.minConcurrency,
      maxConcurrency: this.concurrencyControl.maxConcurrency,
      adjustmentInterval: `${intervalMs / 1000}秒`,
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

        // 更新监控指标 - 使用事件驱动方式
        this.recordConcurrencyAdjustment(oldConcurrency, newConcurrency, reason);
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
    // 通过配置服务获取最近指标采样数量
    const monitoringLimits = this.configService.get('monitoringUnifiedLimits');
    const recentMetricsCount = monitoringLimits?.dataProcessingBatch?.recentMetrics || 5;

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
      recentAdjustments:
        this.performanceMetrics.concurrencyHistory.slice(-recentMetricsCount),
      lastUpdate: new Date(
        this.performanceMetrics.lastMetricsUpdate,
      ).toISOString(),
    };
  }

  // === 核心流数据获取功能 ===

  /**
   * 建立流式连接到提供商
   *
   * 📋 重载说明：提供两种调用方式，满足不同使用场景
   *
   * @overload - 对象参数形式（推荐）
   * 适用于：复杂配置、参数校验、可维护性要求高的场景
   * @param params 完整的连接参数对象，包含所有必需和可选配置
   * @returns Promise<StreamConnection> 流连接实例
   *
   * @example
   * // 推荐：结构化参数传递
   * const connection = await establishStreamConnection({
   *   provider: 'longport',
   *   capability: 'stream-stock-quote',
   *   requestId: 'req_123',
   *   options: { autoReconnect: true }
   * });
   *
   * @overload - 分散参数形式（向后兼容）
   * 适用于：简单调用、快速集成、保持向后兼容的场景
   * @param provider 提供商名称
   * @param capability 能力标识
   * @param config 可选配置参数
   * @returns Promise<StreamConnection> 流连接实例
   *
   * @example
   * // 兼容：分散参数传递
   * const connection = await establishStreamConnection(
   *   'longport',
   *   'stream-stock-quote',
   *   { autoReconnect: true }
   * );
   */
  async establishStreamConnection(
    params: StreamConnectionParams,
  ): Promise<StreamConnection>;
  async establishStreamConnection(
    provider: string,
    capability: string,
    config?: Partial<StreamConnectionOptions>,
  ): Promise<StreamConnection>;
  async establishStreamConnection(
    paramsOrProvider: StreamConnectionParams | string,
    capability?: string,
    config?: Partial<StreamConnectionOptions>,
  ): Promise<StreamConnection> {
    // Handle overloaded signatures
    let provider: string;
    let cap: string;
    let clientIP: string | undefined;
    let connectionConfig: Partial<StreamConnectionOptions> | undefined;

    if (typeof paramsOrProvider === "string") {
      provider = paramsOrProvider;
      cap = capability!;
      clientIP = undefined;
      connectionConfig = config;
    } else {
      provider = paramsOrProvider.provider;
      cap = paramsOrProvider.capability;
      clientIP = paramsOrProvider.clientIP;
      connectionConfig = paramsOrProvider.options;
    }
    const poolKey = this.buildPoolKey(provider, cap);
    const operationStartTime = Date.now();
    let operationSuccess = false;
    this.incrementProviderEstablishingConnection(provider);

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      this.logger.debug("开始建立流式连接", {
        provider,
        capability: cap,
        poolKey,
        clientIP,
        config: connectionConfig
          ? { ...connectionConfig, credentials: "[REDACTED]" }
          : undefined,
      });

      // 优先使用 Provider 的 StreamContextService 建立真实连接（上下文感知）
      const providerInstance = this.capabilityRegistry.getProvider?.(provider);
      if (providerInstance && typeof (providerInstance as any).getStreamContextService === 'function') {
        const ctxService = (providerInstance as any).getStreamContextService();

        // P0-2: 建连前先执行容量校验，超限直接拒绝且不触发 initialize/register/activeMap 写入
        this.connectionPoolManager.canCreateConnection(poolKey, clientIP);

        // 初始化底层SDK连接
        if (typeof ctxService.initializeWebSocket === 'function') {
          await ctxService.initializeWebSocket();
        }

        // 构造连接包装器，桥接回调（仅注册一次底层回调，防止重复）
        const startedAt = Date.now();
        let dataProxyRegistered = false;
        let onDataTarget: ((data: any) => void) | null = null;
        let unregisterDataProxy: (() => void) | null = null;
        const dataProxy = (data: any) => {
          conn.lastActiveAt = new Date();
          try { onDataTarget && onDataTarget(data); } catch { /* 忽略上层处理错误 */ }
        };
        const performConnectionLevelClose = async () => {
          if (!conn.isConnected) {
            return;
          }

          conn.isConnected = false;
          onDataTarget = null;

          try {
            if (typeof unregisterDataProxy === "function") {
              unregisterDataProxy();
            } else if (dataProxyRegistered) {
              this.logger.warn("连接关闭时无可用反注册函数，已通过置空 onDataTarget 兜底清理", {
                provider,
                capability: cap,
                connectionId: conn.id.substring(0, 8),
              });
            }
          } catch {}

          unregisterDataProxy = null;
          dataProxyRegistered = false;
        };

        const conn: StreamConnection = {
          id: this.generateConnectionId(provider, cap, startedAt),
          provider,
          capability: cap,
          isConnected: true,
          createdAt: new Date(startedAt),
          lastActiveAt: new Date(startedAt),
          subscribedSymbols: new Set<string>(),
          options: connectionConfig || {},
          onData: (cb) => {
            onDataTarget = cb;
            if (!dataProxyRegistered) {
              try {
                if (typeof ctxService.onQuoteUpdate === 'function') {
                  const unsubscribe = ctxService.onQuoteUpdate(dataProxy);
                  if (typeof unsubscribe === "function") {
                    unregisterDataProxy = unsubscribe;
                  } else {
                    unregisterDataProxy = null;
                    this.logger.warn("Provider onQuoteUpdate 未返回反注册函数，将使用兜底清理路径", {
                      provider,
                      capability: cap,
                      connectionId: conn.id.substring(0, 8),
                    });
                  }
                  dataProxyRegistered = true;
                } else {
                  this.logger.warn("Provider 缺少 onQuoteUpdate 方法，流式回调无法注册", {
                    provider,
                    capability: cap,
                    connectionId: conn.id.substring(0, 8),
                  });
                }
              } catch {/* 忽略注册异常 */}
            }
          },
          onStatusChange: (_cb) => { /* 可选：由底层事件触发 */ },
          onError: (_cb) => { /* 可选：由底层事件触发 */ },
          async sendHeartbeat() {
            try {
              const ok = typeof ctxService.isWebSocketConnected === 'function'
                ? !!ctxService.isWebSocketConnected()
                : false;
              if (!ok) throw new Error('underlying SDK connection not healthy');
              conn.lastActiveAt = new Date();
              return true;
            } catch (e) {
              // 让Tier2检测到失败，触发回收/重连逻辑
              throw e instanceof Error ? e : new Error('heartbeat failed');
            }
          },
          getStats() {
            const now = Date.now();
            return {
              connectionId: conn.id,
              status: conn.isConnected ? ("connected" as any) : ("closed" as any),
              connectionDurationMs: now - startedAt,
              messagesReceived: 0,
              messagesSent: 0,
              errorCount: 0,
              reconnectCount: 0,
              lastHeartbeat: new Date(),
              avgProcessingLatencyMs: 0,
              subscribedSymbolsCount: conn.subscribedSymbols.size,
            };
          },
          async isAlive() { return conn.isConnected; },
          close: async () => {
            await this.closeConnection(conn);
          },
        } as any;
        this.connectionLevelCloseHandlers.set(conn, performConnectionLevelClose);

        // 事件：连接建立成功
        this.emitConnectionEvent("connection_established", {
          provider,
          capability: cap,
          duration: Date.now() - operationStartTime,
          status: "success",
          count: this.activeConnections.size,
        });

        operationSuccess = true;
        // P0-1: active map 使用唯一 connectionMapKey，pool manager 使用聚合 poolKey
        const connectionMapKey = this.buildConnectionMapKey(poolKey, conn.id);
        this.activeConnections.set(connectionMapKey, conn);
        this.connectionIdToKey.set(conn.id, connectionMapKey);
        this.connectionIdToPoolKey.set(conn.id, poolKey);
        if (clientIP) {
          this.connectionIdToClientIP.set(conn.id, clientIP);
        }
        this.providersCleanedAtIdle.delete(provider);
        this.connectionPoolManager.registerConnection(poolKey, clientIP);
        this.logger.debug("流连接已注册到连接池与active map", {
          connectionId: conn.id.substring(0, 8),
          poolKey,
          connectionMapKey,
          clientIP,
        });
        this.setupConnectionEventHandlers(conn);
        return conn;
      }

      // 若未提供上下文服务则拒绝：需要真实SDK上下文
      throw new StreamConnectionException(
        "Provider 未提供流上下文服务，无法建立真实连接",
        undefined,
        provider,
        cap,
      );
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
      this.decrementProviderEstablishingConnection(provider);
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

      // 防御式校验：显式检查提供者返回状态，若存在失败立即中止并抛错
      if (
        !subscriptionResult?.success ||
        (subscriptionResult.failedSymbols &&
          subscriptionResult.failedSymbols.length > 0)
      ) {
        throw new StreamSubscriptionException(
          "部分或全部符号订阅失败",
          subscriptionResult.failedSymbols?.length
            ? subscriptionResult.failedSymbols
            : symbols,
          connection.provider,
          connection.capability,
        );
      }

      // Phase 2.3: 缓存订阅信息
      await this.cacheSubscriptionInfo(
        connection.id,
        symbols,
        subscriptionResult,
      );

      // Phase 2.4: 更新客户端状态（仅在 connection.id 可映射为 clientId 时执行）
      if (this.clientStateManager.getClientSubscription(connection.id)) {
        this.clientStateManager.updateSubscriptionState(
          connection.id,
          symbols,
          "subscribed",
        );
      } else {
        this.logger.debug("跳过连接级客户端状态更新（订阅）", {
          connectionId: connection.id.substring(0, 8),
          reason: "connection_id_is_not_client_id",
          symbolsCount: symbols.length,
        });
      }

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

      // 防御式校验：显式检查提供者返回状态
      if (
        !unsubscriptionResult?.success ||
        (unsubscriptionResult.failedSymbols &&
          unsubscriptionResult.failedSymbols.length > 0)
      ) {
        throw new StreamSubscriptionException(
          "部分或全部符号取消订阅失败",
          unsubscriptionResult.failedSymbols?.length
            ? unsubscriptionResult.failedSymbols
            : symbols,
          connection.provider,
          connection.capability,
        );
      }

      // Phase 3.2: 更新缓存
      await this.removeSubscriptionFromCache(connection.id, symbols);

      // Phase 3.3: 更新客户端状态（仅在 connection.id 可映射为 clientId 时执行）
      if (this.clientStateManager.getClientSubscription(connection.id)) {
        this.clientStateManager.updateSubscriptionState(
          connection.id,
          symbols,
          "unsubscribed",
        );
      } else {
        this.logger.debug("跳过连接级客户端状态更新（取消订阅）", {
          connectionId: connection.id.substring(0, 8),
          reason: "connection_id_is_not_client_id",
          symbolsCount: symbols.length,
        });
      }

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
        action: "unsubscribe",
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
   * 连接关闭前 best-effort 取消订阅（失败不阻断关闭流程）
   */
  private async bestEffortUnsubscribeOnClose(
    connection: StreamConnection,
  ): Promise<void> {
    const subscribedSymbolsSnapshot = Array.from(connection.subscribedSymbols);
    if (subscribedSymbolsSnapshot.length === 0) {
      return;
    }

    try {
      await this.performUnsubscription(connection, subscribedSymbolsSnapshot);
      this.logger.debug("连接关闭前取消订阅完成", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        capability: connection.capability,
        unsubscribedSymbols: subscribedSymbolsSnapshot.length,
      });
    } catch (error) {
      this.logger.warn("连接关闭前取消订阅失败，继续执行关闭流程", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        capability: connection.capability,
        subscribedSymbols: subscribedSymbolsSnapshot.slice(0, 5),
        totalSymbols: subscribedSymbolsSnapshot.length,
        error: error?.message || String(error),
      });
    }
  }

  /**
   * Phase 4: 关闭流连接
   * @param connection 要关闭的流连接实例
   */
  async closeConnection(connection: StreamConnection): Promise<void> {
    const inFlightClosePromise = this.closeConnectionInFlight.get(connection.id);
    if (inFlightClosePromise) {
      this.logger.debug("连接正在关闭中，等待同一 in-flight close 完成", {
        connectionId: connection.id.substring(0, 8),
        provider: connection.provider,
        capability: connection.capability,
      });
      await inFlightClosePromise;
      return;
    }

    const closePromise = this.closeConnectionInternal(connection);
    this.closeConnectionInFlight.set(connection.id, closePromise);

    try {
      await closePromise;
    } finally {
      if (this.closeConnectionInFlight.get(connection.id) === closePromise) {
        this.closeConnectionInFlight.delete(connection.id);
      }
    }
  }

  private async closeConnectionInternal(
    connection: StreamConnection,
  ): Promise<void> {
    const operationStartTime = Date.now();
    let operationSuccess = false;
    let isRetryForHistoricalCloseError = false;

    try {
      // P1-2: 增加活跃操作计数
      this.performanceMetrics.activeOperations++;

      const now = Date.now();
      const closedAt = this.closedConnectionIds.get(connection.id);
      if (closedAt !== undefined) {
        const elapsedSinceClosed = now - closedAt;
        if (elapsedSinceClosed <= this.closedConnectionTtlMs) {
          const previousCloseError = this.closedConnectionErrors.get(connection.id);
          if (previousCloseError) {
            const retryCooldownUntil =
              this.closedConnectionRetryCooldownUntil.get(connection.id) ?? 0;
            if (retryCooldownUntil > now) {
              throw new StreamConnectionException(
                `连接已关闭，但 provider cleanup 失败: ${previousCloseError}`,
                connection.id,
                connection.provider,
                connection.capability,
              );
            }

            isRetryForHistoricalCloseError = true;
            this.closedConnectionIds.delete(connection.id);
            this.closedConnectionErrors.delete(connection.id);
            this.closedConnectionRetryCooldownUntil.delete(connection.id);
            this.logger.warn("连接命中 TTL 内历史 close 错误，触发受限重试", {
              connectionId: connection.id.substring(0, 8),
              provider: connection.provider,
              capability: connection.capability,
              elapsedSinceClosedMs: elapsedSinceClosed,
              closedConnectionTtlMs: this.closedConnectionTtlMs,
              retryCooldownMs: this.closedConnectionRetryCooldownMs,
            });
          } else {
            this.logger.debug("连接已关闭，跳过重复 close", {
              connectionId: connection.id.substring(0, 8),
              provider: connection.provider,
              capability: connection.capability,
              elapsedSinceClosedMs: elapsedSinceClosed,
              closedConnectionTtlMs: this.closedConnectionTtlMs,
            });
            operationSuccess = true;
            return;
          }
        } else {
          this.closedConnectionIds.delete(connection.id);
          this.closedConnectionErrors.delete(connection.id);
          this.closedConnectionRetryCooldownUntil.delete(connection.id);
        }
      }

      const connectionMapKey = this.connectionIdToKey.get(connection.id);
      const poolKey =
        this.connectionIdToPoolKey.get(connection.id) ||
        this.buildPoolKey(connection.provider, connection.capability);
      this.logger.debug("开始关闭流连接", {
        connectionId: connection.id.substring(0, 8),
        poolKey,
        connectionMapKey,
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

      // Phase 4.2: 连接关闭前 best-effort 取消订阅（失败不阻断关闭流程）
      await this.bestEffortUnsubscribeOnClose(connection);

      // Phase 4.3: 执行连接关闭
      await this.executeConnectionLevelClose(connection);

      // Phase 4.4: 清理内存映射
      this.cleanupConnectionFromMaps(connection.id);

      const providerActiveConnections = this.getProviderActiveConnectionCount(
        connection.provider,
      );
      const providerEstablishingConnections =
        this.getProviderEstablishingConnectionCount(connection.provider);
      let providerCleanupResult: ProviderCleanupResult | null = null;

      if (
        providerActiveConnections === 0 &&
        providerEstablishingConnections === 0
      ) {
        providerCleanupResult = await this.cleanupProviderContextIfIdle(
          connection.provider,
        );
      } else {
        this.logger.debug("仅关闭连接，provider 非空闲，不触发 cleanup", {
          connectionId: connection.id.substring(0, 8),
          provider: connection.provider,
          activeConnectionsByProvider: providerActiveConnections,
          establishingConnectionsByProvider: providerEstablishingConnections,
        });
      }

      // Phase 4.5: 清理缓存
      await this.clearConnectionCache(connection.id);

      // Phase 4.6: 更新客户端状态（仅在 connection.id 可映射为 clientId 时执行）
      if (this.clientStateManager.getClientSubscription(connection.id)) {
        this.clientStateManager.removeConnection(connection.id);
      }

      // 更新指标
      this.recordConnectionMetrics("disconnected", connection.provider);
      this.updateActiveConnectionsCount(
        this.activeConnections.size,
        connection.provider,
      );
      this.markConnectionAsClosed(connection.id);

      const providerCleanupError =
        providerCleanupResult?.status === "failed"
          ? providerCleanupResult.error || "unknown"
          : null;

      if (providerCleanupError) {
        this.closedConnectionErrors.set(connection.id, providerCleanupError);
        if (isRetryForHistoricalCloseError) {
          this.closedConnectionRetryCooldownUntil.set(
            connection.id,
            Date.now() + this.closedConnectionRetryCooldownMs,
          );
        } else {
          this.closedConnectionRetryCooldownUntil.delete(connection.id);
        }
        this.logger.warn("流连接已关闭，但 provider cleanup 失败", {
          connectionId: connection.id.substring(0, 8),
          poolKey,
          connectionMapKey,
          provider: connection.provider,
          remainingConnections: this.activeConnections.size,
          remainingProviderConnections: providerActiveConnections,
          remainingProviderEstablishingConnections: providerEstablishingConnections,
          providerCleanupStatus: providerCleanupResult?.status || "not_required",
          providerCleanupTriggered: false,
          providerCleanupError,
          historicalRetryAttempted: isRetryForHistoricalCloseError,
          retryCooldownMs: this.closedConnectionRetryCooldownMs,
          duration: Date.now() - operationStartTime,
        });

        throw new StreamConnectionException(
          `连接已关闭，但 provider cleanup 失败: ${providerCleanupError}`,
          connection.id,
          connection.provider,
          connection.capability,
        );
      }

      this.closedConnectionErrors.delete(connection.id);
      this.closedConnectionRetryCooldownUntil.delete(connection.id);
      this.logger.log("流连接关闭成功", {
        connectionId: connection.id.substring(0, 8),
        poolKey,
        connectionMapKey,
        provider: connection.provider,
        remainingConnections: this.activeConnections.size,
        remainingProviderConnections: providerActiveConnections,
        remainingProviderEstablishingConnections: providerEstablishingConnections,
        providerCleanupStatus: providerCleanupResult?.status || "not_required",
        providerCleanupTriggered: providerCleanupResult?.status === "cleaned",
        providerCleanupError: providerCleanupResult?.error,
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

  private async executeConnectionLevelClose(
    connection: StreamConnection,
  ): Promise<void> {
    const closeHandler = this.connectionLevelCloseHandlers.get(connection);
    if (closeHandler) {
      await closeHandler();
      return;
    }

    await connection.close();
  }

  private getProviderActiveConnectionCount(provider: string): number {
    let count = 0;

    for (const connection of this.activeConnections.values()) {
      if (connection.provider === provider && connection.isConnected) {
        count++;
      }
    }

    return count;
  }

  private incrementProviderEstablishingConnection(provider: string): void {
    const current = this.providerEstablishingConnections.get(provider) ?? 0;
    this.providerEstablishingConnections.set(provider, current + 1);
  }

  private decrementProviderEstablishingConnection(provider: string): void {
    const current = this.providerEstablishingConnections.get(provider) ?? 0;
    if (current <= 1) {
      this.providerEstablishingConnections.delete(provider);
      return;
    }
    this.providerEstablishingConnections.set(provider, current - 1);
  }

  private getProviderEstablishingConnectionCount(provider: string): number {
    return this.providerEstablishingConnections.get(provider) ?? 0;
  }

  private async cleanupProviderContextIfIdle(
    provider: string,
  ): Promise<ProviderCleanupResult> {
    if (this.providersCleanedAtIdle.has(provider)) {
      this.logger.debug("仅关闭连接，provider cleanup 已执行过，跳过", {
        provider,
      });
      return { status: "already_cleaned" };
    }

    if (this.providerCleanupInProgress.has(provider)) {
      this.logger.debug("仅关闭连接，provider cleanup 执行中，跳过重复触发", {
        provider,
      });
      return { status: "in_progress" };
    }

    this.providerCleanupInProgress.add(provider);

    try {
      const activeConnections = this.getProviderActiveConnectionCount(provider);
      const establishingConnections =
        this.getProviderEstablishingConnectionCount(provider);
      if (activeConnections > 0 || establishingConnections > 0) {
        this.logger.debug("仅关闭连接，provider 非空闲，跳过 cleanup", {
          provider,
          activeConnections,
          establishingConnections,
        });
        return { status: "not_idle" };
      }

      const providerInstance = this.capabilityRegistry.getProvider?.(provider);
      const ctxService = providerInstance?.getStreamContextService?.();

      if (!ctxService || typeof ctxService.cleanup !== "function") {
        this.logger.debug("仅关闭连接，provider 无 cleanup 方法", {
          provider,
        });
        this.providersCleanedAtIdle.add(provider);
        return { status: "no_method" };
      }

      this.logger.log("触发 provider 级 cleanup", {
        provider,
        reason: "provider 已无活跃连接",
      });

      await ctxService.cleanup();
      this.providersCleanedAtIdle.add(provider);

      this.logger.log("provider 级 cleanup 完成", {
        provider,
      });
      return { status: "cleaned" };
    } catch (error) {
      this.logger.warn("provider 级 cleanup 首次执行失败，准备重试一次", {
        provider,
        error: error?.message,
      });

      try {
        const providerInstance = this.capabilityRegistry.getProvider?.(provider);
        const ctxService = providerInstance?.getStreamContextService?.();
        if (!ctxService || typeof ctxService.cleanup !== "function") {
          this.providersCleanedAtIdle.add(provider);
          return { status: "no_method" };
        }
        await ctxService.cleanup();
        this.providersCleanedAtIdle.add(provider);
        this.logger.log("provider 级 cleanup 重试成功", { provider });
        return { status: "cleaned" };
      } catch (retryError) {
        const errorMessage = retryError?.message || error?.message || "unknown";
        this.logger.error("provider 级 cleanup 重试后仍失败", {
          provider,
          error: errorMessage,
        });
        return { status: "failed", error: errorMessage };
      }
    } finally {
      this.providerCleanupInProgress.delete(provider);
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
        return this.fallbackBatchHealthCheck(options);
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

    const processingTimeMs = Date.now() - startTime;
    this.logger.debug("Tier1快速状态检查完成", {
      processed: connections.length,
      passed: results.filter((r) => r.passed).length,
      suspicious: results.filter((r) => r.suspicious).length,
      failed: results.filter((r) => !r.passed && !r.suspicious).length,
      processingTimeMs,
      avgTimePerConnection:
        (processingTimeMs / connections.length).toFixed(2) + "ms",
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

    const processingTimeMs = Date.now() - startTime;
    this.logger.debug("Tier2心跳验证完成", {
      candidates: candidates.length,
      passed: finalResults.filter((r) => r.passed).length,
      failed: finalResults.filter((r) => !r.passed).length,
      processingTimeMs,
      avgTimePerConnection:
        (processingTimeMs / candidates.length).toFixed(2) + "ms",
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

    const processingTimeMs = Date.now() - startTime;
    this.logger.debug("Tier3完整健康检查完成", {
      candidates: candidates.length,
      passed: finalResults.filter((r) => r.passed).length,
      failed: finalResults.filter((r) => !r.passed).length,
      processingTimeMs,
      avgTimePerConnection:
        (processingTimeMs / candidates.length).toFixed(2) + "ms",
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
  private async fallbackBatchHealthCheck(options: {
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
  getStreamDataCache(): StreamCacheStandardizedService {
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
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_DATA_FETCHER,
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: 'executeCore',
      message: 'executeCore not implemented for StreamDataFetcher',
      context: {
        service: 'StreamDataFetcher'
      }
    });
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
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_DATA_FETCHER,
          errorCode: BusinessErrorCode.DATA_NOT_FOUND,
          operation: 'getStreamCapability',
          message: `Stream capability not found: ${provider}/${capability}`,
          context: {
            provider: provider,
            capability: capability,
            operation: 'capability_lookup'
          }
        });
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
    const connectionMapKey = this.connectionIdToKey.get(connectionId);
    const clientIP = this.connectionIdToClientIP.get(connectionId);

    let poolKey = this.connectionIdToPoolKey.get(connectionId);
    if (!poolKey && connectionMapKey) {
      const connection = this.activeConnections.get(connectionMapKey);
      if (connection) {
        poolKey = this.buildPoolKey(connection.provider, connection.capability);
      }
    }

    if (poolKey) {
      this.connectionPoolManager.unregisterConnection(poolKey, clientIP);
    }

    if (connectionMapKey) {
      this.activeConnections.delete(connectionMapKey);
    }

    this.connectionIdToKey.delete(connectionId);
    this.connectionIdToPoolKey.delete(connectionId);
    this.connectionIdToClientIP.delete(connectionId);

    if (connectionMapKey || poolKey) {
      this.logger.debug("连接已从内部Map清理", {
        connectionId,
        poolKey,
        connectionMapKey,
        clientIP,
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
    let cleanedClosedRecords = 0;

    this.logger.debug("开始执行Map定期清理", {
      currentActiveConnections: this.activeConnections.size,
      currentMappings: this.connectionIdToKey.size,
      currentClosedRecords: this.closedConnectionIds.size,
    });

    // 1. 清理无效的连接映射（connectionIdToKey中有，但activeConnections中没有）
    const mappingEntries = Array.from(this.connectionIdToKey.entries());
    for (const [connectionId, connectionMapKey] of mappingEntries) {
      if (!this.activeConnections.has(connectionMapKey)) {
        const poolKey = this.connectionIdToPoolKey.get(connectionId);
        this.connectionIdToKey.delete(connectionId);
        this.connectionIdToPoolKey.delete(connectionId);
        this.connectionIdToClientIP.delete(connectionId);
        cleanedMappings++;

        this.logger.debug("清理了无效的连接映射", {
          connectionId: connectionId.substring(0, 8),
          poolKey,
          connectionMapKey,
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
    for (const connectionMapKey of connectionsToRemove) {
      const connection = this.activeConnections.get(connectionMapKey);
      if (connection) {
        const poolKey =
          this.connectionIdToPoolKey.get(connection.id) ||
          this.buildPoolKey(connection.provider, connection.capability);
        const clientIP = this.connectionIdToClientIP.get(connection.id);

        // 发送清理监控事件
        this.emitConnectionEvent("connection_cleanup", {
          provider: connection.provider,
          operation: "cleanup_monitoring",
          status: "success",
        });

        // 从映射表中清理
        this.connectionIdToKey.delete(connection.id);
        this.connectionIdToPoolKey.delete(connection.id);
        this.connectionIdToClientIP.delete(connection.id);
        this.activeConnections.delete(connectionMapKey);

        // 从连接池管理器中注销（P0-1：使用 poolKey 维度）
        this.connectionPoolManager.unregisterConnection(poolKey, clientIP);

        cleanedConnections++;

        this.logger.debug("清理了僵尸连接", {
          connectionId: connection.id ? connection.id.substring(0, 8) : 'unknown',
          poolKey,
          connectionMapKey,
          clientIP,
        });
      }
    }

    const closedCleanupResult = this.pruneClosedConnectionIds();
    cleanedClosedRecords =
      closedCleanupResult.expired + closedCleanupResult.overflow;

    const processingTimeMs = Date.now() - startTime;

    // 记录清理结果
    if (
      cleanedConnections > 0 ||
      cleanedMappings > 0 ||
      cleanedClosedRecords > 0
    ) {
      this.logger.log("Map定期清理完成", {
        cleanedConnections,
        cleanedMappings,
        cleanedClosedRecords,
        processingTimeMs,
        remainingConnections: this.activeConnections.size,
        remainingMappings: this.connectionIdToKey.size,
        remainingClosedRecords: this.closedConnectionIds.size,
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
        processingTimeMs,
        activeConnections: this.activeConnections.size,
        mappings: this.connectionIdToKey.size,
        closedRecords: this.closedConnectionIds.size,
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

    if (this.concurrencyAdjustmentTimer) {
      clearInterval(this.concurrencyAdjustmentTimer);
      this.concurrencyAdjustmentTimer = null;
      this.logger.debug("并发控制监控定时器已清理");
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
    let closeTimeoutTimer: NodeJS.Timeout | null = null;
    const closeTimeout = new Promise<void>((resolve) => {
      closeTimeoutTimer = setTimeout(() => {
        this.logger.warn("连接关闭超时，强制清理");
        resolve();
      }, 10000); // 10秒超时
      closeTimeoutTimer.unref?.();
    });

    try {
      await Promise.race([Promise.allSettled(closePromises), closeTimeout]);
    } catch (error) {
      this.logger.error("连接关闭过程出错", { error: error.message });
    } finally {
      if (closeTimeoutTimer) {
        clearTimeout(closeTimeoutTimer);
      }
    }

    // 强制清理所有内存映射
    const closedRecordsBeforeClear = this.closedConnectionIds.size;
    this.activeConnections.clear();
    this.connectionIdToKey.clear();
    this.connectionIdToPoolKey.clear();
    this.connectionIdToClientIP.clear();
    this.closeConnectionInFlight.clear();
    this.closedConnectionIds.clear();
    this.closedConnectionErrors.clear();
    this.closedConnectionRetryCooldownUntil.clear();
    this.providerEstablishingConnections.clear();

    this.logger.log("StreamDataFetcherService 销毁清理完成", {
      clearedConnections: this.activeConnections.size,
      clearedMappings: this.connectionIdToKey.size,
      clearedClosedRecords: closedRecordsBeforeClear,
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

  private markConnectionAsClosed(
    connectionId: string,
    closedAt: number = Date.now(),
  ): void {
    this.closedConnectionIds.set(connectionId, closedAt);
    this.pruneClosedConnectionIds(closedAt);
  }

  private pruneClosedConnectionIds(
    referenceTime: number = Date.now(),
  ): {
    expired: number;
    overflow: number;
  } {
    let expired = 0;
    let overflow = 0;

    for (const [connectionId, closedAt] of this.closedConnectionIds.entries()) {
      if (referenceTime - closedAt > this.closedConnectionTtlMs) {
        this.closedConnectionIds.delete(connectionId);
        this.closedConnectionErrors.delete(connectionId);
        this.closedConnectionRetryCooldownUntil.delete(connectionId);
        expired++;
      }
    }

    while (this.closedConnectionIds.size > this.maxClosedConnectionRecords) {
      const oldestKey = this.closedConnectionIds.keys().next().value as
        | string
        | undefined;
      if (!oldestKey) {
        break;
      }
      this.closedConnectionIds.delete(oldestKey);
      this.closedConnectionErrors.delete(oldestKey);
      this.closedConnectionRetryCooldownUntil.delete(oldestKey);
      overflow++;
    }

    return { expired, overflow };
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
    connection: StreamConnection,
    symbols: string[],
  ): Promise<SubscriptionResult> {
    const providerInstance =
      this.capabilityRegistry.getProvider?.(connection.provider);
    const ctxService = providerInstance?.getStreamContextService?.();

    if (!ctxService || typeof ctxService.subscribe !== "function") {
      throw new StreamSubscriptionException(
        "Provider stream context service not available for subscribe",
        symbols,
        connection.provider,
        connection.capability,
      );
    }

    // 将错误交由上层捕获：任何SDK抛错都直接冒泡
    await ctxService.subscribe(symbols);
    symbols.forEach((s) => connection.subscribedSymbols.add(s));

    return { success: true, subscribedSymbols: symbols, failedSymbols: [] };
  }

  /**
   * 执行取消订阅操作的内部实现
   */
  private async performUnsubscription(
    connection: StreamConnection,
    symbols: string[],
  ): Promise<UnsubscriptionResult> {
    const providerInstance =
      this.capabilityRegistry.getProvider?.(connection.provider);
    const ctxService = providerInstance?.getStreamContextService?.();

    if (!ctxService || typeof ctxService.unsubscribe !== "function") {
      throw new StreamSubscriptionException(
        "Provider stream context service not available for unsubscribe",
        symbols,
        connection.provider,
        connection.capability,
      );
    }

    // 将错误交由上层捕获：任何SDK抛错都直接冒泡
    await ctxService.unsubscribe(symbols);
    symbols.forEach((s) => connection.subscribedSymbols.delete(s));

    return { success: true, unsubscribedSymbols: symbols, failedSymbols: [] };
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
   * 记录并发调整指标
   */
  private recordConcurrencyAdjustment(
    oldConcurrency: number,
    newConcurrency: number,
    reason: string,
  ): void {
    // 使用事件驱动方式记录并发调整指标
    // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
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

  /**
   * 从 StreamConfigService 统一加载并发控制配置
   */
  private loadConcurrencyConfigFromService(): void {
    try {
      const perf = this.streamConfigService.getPerformanceConfig() as any;
      if (perf?.concurrency) {
        this.concurrencyControl.currentConcurrency = perf.concurrency.initial ?? this.concurrencyControl.currentConcurrency;
        this.concurrencyControl.minConcurrency = perf.concurrency.min ?? this.concurrencyControl.minConcurrency;
        this.concurrencyControl.maxConcurrency = perf.concurrency.max ?? this.concurrencyControl.maxConcurrency;
        this.concurrencyControl.adjustmentFactor = perf.concurrency.adjustmentFactor ?? this.concurrencyControl.adjustmentFactor;
        this.concurrencyControl.stabilizationPeriod = perf.concurrency.stabilizationPeriodMs ?? this.concurrencyControl.stabilizationPeriod;
      }
      if (perf?.thresholds?.responseTimeMs) {
        this.concurrencyControl.performanceThresholds = perf.thresholds.responseTimeMs;
      }
      if (perf?.thresholds?.successRate) {
        this.concurrencyControl.successRateThresholds = perf.thresholds.successRate;
      }
      if (perf?.circuitBreaker) {
        this.concurrencyControl.circuitBreaker.recoveryDelay = perf.circuitBreaker.recoveryDelayMs ?? this.concurrencyControl.circuitBreaker.recoveryDelay;
        this.concurrencyControl.circuitBreaker.failureThreshold = perf.circuitBreaker.failureThreshold ?? this.concurrencyControl.circuitBreaker.failureThreshold;
      }
    } catch (e) {
      this.logger.warn("加载并发控制配置失败，使用默认值", { error: e?.message });
    }
  }
}
