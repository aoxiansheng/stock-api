/**
 * StreamConnectionManager - 专职连接管理服务
 *
 * 从 StreamReceiverService 中分离出来的连接管理逻辑，负责：
 * 1. WebSocket 连接的建立、维护和清理
 * 2. 连接健康状态监控和管理
 * 3. 连接频率限制检查
 * 4. 内存压力下的连接清理
 * 5. 连接统计和监控指标收集
 */

import { Injectable, OnModuleDestroy, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { STREAM_RECEIVER_TIMEOUTS } from "../constants/stream-receiver-timeouts.constants";
import { RateLimitService } from "../../../../auth/services/infrastructure/rate-limit.service";
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import {
  StreamConnection,
  StreamConnectionParams
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
} from "../config/stream-receiver.config";
import {
  StreamConnectionContext,
  ConnectionCleanupResult,
  ConnectionManagementCallbacks,
  IConnectionManager,
  ConnectionLimitCheckResult,
  MarketDistributionAnalysis,
  ConnectionHealthStats,
} from "../interfaces/connection-management.interface";
import {
  ConnectionHealthInfo,
  ConnectionHealthUtils,
  ConnectionStatsUtils,
  CollectionUtils
} from "../utils/stream-receiver.utils";

@Injectable()
export class StreamConnectionManagerService implements OnModuleDestroy, IConnectionManager {
  private readonly logger = createLogger("StreamConnectionManager");
  private readonly config: StreamReceiverConfig;

  // 活跃的流连接管理
  private readonly activeConnections = new Map<string, StreamConnection>();

  // 连接健康状态跟踪
  private readonly connectionHealth = new Map<string, ConnectionHealthInfo>();

  // 定时器管理
  private cleanupTimer?: NodeJS.Timeout;
  private memoryCheckTimer?: NodeJS.Timeout;

  // 回调函数存储
  private callbacks?: ConnectionManagementCallbacks;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventEmitter2,
    @Inject(forwardRef(() => StreamDataFetcherService))
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly rateLimitService?: RateLimitService,
  ) {
    // 初始化配置
    this.config = this.initializeConfig();

    this.logger.log("StreamConnectionManager 初始化完成", {
      config: {
        maxConnections: this.config.maxConnections,
        connectionCleanupInterval: this.config.connectionCleanupInterval,
        connectionStaleTimeout: this.config.connectionStaleTimeout,
        rateLimit: this.config.rateLimit,
      }
    });

    // 初始化连接清理和监控
    this.initializeConnectionCleanup();
    this.initializeMemoryMonitoring();
  }

  /**
   * 初始化配置
   */
  private initializeConfig(): StreamReceiverConfig {
    const connectionCleanupInterval = this.configService.get<number>(
      "STREAM_RECEIVER_CLEANUP_INTERVAL",
      defaultStreamReceiverConfig.connectionCleanupInterval,
    );

    const maxConnections = this.configService.get<number>(
      "STREAM_RECEIVER_MAX_CONNECTIONS",
      defaultStreamReceiverConfig.maxConnections,
    );

    const connectionStaleTimeout = this.configService.get<number>(
      "STREAM_RECEIVER_STALE_TIMEOUT",
      defaultStreamReceiverConfig.connectionStaleTimeout,
    );

    return {
      ...defaultStreamReceiverConfig,
      connectionCleanupInterval,
      maxConnections,
      connectionStaleTimeout,
    };
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: ConnectionManagementCallbacks): void {
    this.callbacks = callbacks;
    this.logger.debug("连接管理回调函数已设置");
  }

  /**
   * 检查连接频率限制
   */
  async checkConnectionRateLimit(clientId: string): Promise<boolean> {
    if (!this.rateLimitService) {
      return true; // 服务不可用时允许连接
    }

    try {
      const rateKey = `stream_connection:${clientId}`;
      const { maxConnectionsPerMinute, windowSize } = this.config.rateLimit;

      // 简化速率限制检查 - 总是允许，在生产环境中实现
      const isAllowed = true; // TODO: 实现具体的速率限制逻辑

      if (!isAllowed) {
        this.logger.warn("连接频率超限", {
          clientId,
          limit: maxConnectionsPerMinute,
          windowSize,
        });
        return false;
      }

      this.logger.debug("连接频率检查通过", {
        clientId,
        limit: maxConnectionsPerMinute,
      });

      return true;
    } catch (error) {
      this.logger.warn("连接频率检查失败，允许连接 (故障时开放)", {
        clientId,
        error: error.message,
      });
      return true; // 故障时允许连接，确保服务可用性
    }
  }

  /**
   * 获取或创建流连接
   */
  async getOrCreateConnection(
    provider: string,
    capability: string,
    requestId: string,
    symbols: string[],
    clientId: string,
  ): Promise<StreamConnection> {
    const connectionKey = `${provider}:${capability}`;

    // 检查现有连接
    let connection = this.activeConnections.get(connectionKey);
    if (
      connection &&
      this.streamDataFetcher.isConnectionActive(connectionKey)
    ) {
      // 更新连接活动时间
      this.updateConnectionHealth(connection.id, {
        lastActivity: Date.now(),
      });
      return connection;
    }

    // 检查连接数量限制
    await this.checkConnectionLimit(clientId);

    // 创建连接上下文
    const context = this.buildEnhancedContextService(
      requestId,
      provider,
      symbols,
      capability,
      clientId,
    );

    connection = await this.streamDataFetcher.establishStreamConnection(
      provider,
      capability,
      {
        maxReconnectAttempts: 3,
        connectionTimeoutMs: STREAM_RECEIVER_TIMEOUTS.CONNECTION_TIMEOUT_MS,
        autoReconnect: true,
        heartbeatIntervalMs: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
      },
    );

    this.activeConnections.set(connectionKey, connection);

    // 初始化连接健康状态
    this.initializeConnectionHealth(connection);

    // 记录连接创建监控
    this.callbacks?.recordConnectionMetrics(connection.id, provider, capability, true);

    this.logger.log("新流连接已创建", {
      connectionId: connection.id,
      provider,
      capability,
      totalConnections: this.activeConnections.size,
    });

    return connection;
  }

  /**
   * 检查连接数量限制
   */
  private async checkConnectionLimit(clientId: string): Promise<void> {
    if (this.activeConnections.size >= this.config.maxConnections) {
      const error = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED,
        operation: 'checkConnectionLimit',
        message: 'Server connection limit reached',
        context: {
          clientId,
          currentConnections: this.activeConnections.size,
          maxConnections: this.config.maxConnections,
          errorType: STREAM_RECEIVER_ERROR_CODES.CONNECTION_LIMIT_REACHED
        }
      });

      this.logger.warn("连接被数量上限拒绝", {
        clientId,
        currentConnections: this.activeConnections.size,
        maxConnections: this.config.maxConnections,
      });

      throw error;
    }
  }

  /**
   * 初始化连接健康状态
   */
  private initializeConnectionHealth(connection: StreamConnection): void {
    const now = Date.now();
    const healthInfo = ConnectionHealthUtils.createInitialHealthInfo(now);
    this.connectionHealth.set(connection.id, healthInfo);
  }

  /**
   * 构建增强的上下文服务
   */
  private buildEnhancedContextService(
    requestId: string,
    provider: string,
    symbols: string[],
    capability: string,
    clientId: string,
  ): StreamConnectionContext {
    const marketDistribution = this.analyzeMarketDistribution(symbols);
    const primaryMarket = marketDistribution.primary;

    return {
      // 基础信息
      requestId,
      provider,
      capability,
      clientId,

      // 市场和符号信息
      market: primaryMarket,
      symbolsCount: symbols.length,
      marketDistribution: marketDistribution.distribution,

      // 配置信息
      connectionConfig: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        connectionTimeoutMs: STREAM_RECEIVER_TIMEOUTS.CONNECTION_TIMEOUT_MS,
      },

      metricsConfig: {
        enableLatencyTracking: true,
        enableThroughputTracking: true,
        metricsPrefix: `stream_${provider}_${capability}`,
      },

      errorHandling: {
        retryPolicy: "exponential",
        maxRetries: 3,
        circuitBreakerEnabled: true,
      },

      // 会话信息
      session: {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        subscriptionCount: symbols.length,
      },
    };
  }

  /**
   * 分析市场分布
   */
  private analyzeMarketDistribution(symbols: string[]): MarketDistributionAnalysis {
    const distribution: Record<string, number> = {};
    const markets: Set<string> = new Set();

    symbols.forEach(symbol => {
      let market = 'UNKNOWN';
      if (symbol.includes('.HK')) {
        market = 'HK';
      } else if (symbol.includes('.US')) {
        market = 'US';
      } else if (symbol.includes('.SH')) {
        market = 'SH';
      } else if (symbol.includes('.SZ')) {
        market = 'SZ';
      }

      markets.add(market);
      distribution[market] = (distribution[market] || 0) + 1;
    });

    // 找到主要市场
    const primary = Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

    return {
      primary,
      distribution,
      totalSymbols: symbols.length,
      marketCoverage: Array.from(markets),
    };
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * 检查连接是否活跃
   */
  isConnectionActive(connectionKey: string): boolean {
    const connection = this.activeConnections.get(connectionKey);
    return connection ? this.streamDataFetcher.isConnectionActive(connectionKey) : false;
  }

  /**
   * 移除连接
   */
  removeConnection(connectionKey: string): void {
    const connection = this.activeConnections.get(connectionKey);
    if (connection) {
      this.activeConnections.delete(connectionKey);
      this.connectionHealth.delete(connection.id);

      this.logger.debug("连接已移除", {
        connectionKey,
        connectionId: connection.id,
        remainingConnections: this.activeConnections.size,
      });

      // 记录连接断开监控
      this.callbacks?.recordConnectionMetrics(
        connection.id,
        connectionKey.split(':')[0],
        connectionKey.split(':')[1],
        false
      );
    }
  }

  /**
   * 更新连接健康状态
   */
  updateConnectionHealth(connectionId: string, health: Partial<ConnectionHealthInfo>): void {
    const existingHealth = this.connectionHealth.get(connectionId);
    if (existingHealth) {
      this.connectionHealth.set(connectionId, {
        ...existingHealth,
        ...health,
      });
    }
  }

  /**
   * 获取连接健康统计
   */
  getConnectionHealthStats(): ConnectionHealthStats {
    return ConnectionStatsUtils.calculateHealthStats(this.connectionHealth);
  }

  /**
   * 初始化连接清理机制
   */
  private initializeConnectionCleanup(): void {
    // 定期清理断开的连接
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.config.connectionCleanupInterval);

    this.logger.log("连接清理机制已初始化", {
      cleanupInterval: this.config.connectionCleanupInterval,
      maxConnections: this.config.maxConnections,
      staleTimeout: this.config.connectionStaleTimeout,
    });
  }

  /**
   * 初始化内存监控
   */
  private initializeMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryMonitoring.checkInterval);

    this.logger.log("内存监控已初始化", {
      checkInterval: this.config.memoryMonitoring.checkInterval,
      warningThreshold: `${Math.round(this.config.memoryMonitoring.warningThreshold / (1024 * 1024))}MB`,
      criticalThreshold: `${Math.round(this.config.memoryMonitoring.criticalThreshold / (1024 * 1024))}MB`,
    });
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    try {
      const usage = process.memoryUsage();
      const heapUsed = usage.heapUsed;

      if (heapUsed > this.config.memoryMonitoring.criticalThreshold) {
        this.logger.error("内存使用超过临界阈值，启动强制清理", {
          heapUsed: `${Math.round(heapUsed / (1024 * 1024))}MB`,
          connections: this.activeConnections.size,
          threshold: `${Math.round(this.config.memoryMonitoring.criticalThreshold / (1024 * 1024))}MB`,
        });

        this.forceConnectionCleanup().catch((error) => {
          this.logger.error("强制连接清理失败", { error: error.message });
        });

        // 记录监控指标
        this.recordMemoryAlert("critical", heapUsed, this.activeConnections.size);
      } else if (heapUsed > this.config.memoryMonitoring.warningThreshold) {
        this.logger.warn("内存使用接近阈值", {
          heapUsed: `${Math.round(heapUsed / (1024 * 1024))}MB`,
          connections: this.activeConnections.size,
          threshold: `${Math.round(this.config.memoryMonitoring.warningThreshold / (1024 * 1024))}MB`,
        });

        // 记录监控指标
        this.recordMemoryAlert("warning", heapUsed, this.activeConnections.size);
      }
    } catch (error) {
      this.logger.warn("内存检查失败", { error: error.message });
    }
  }

  /**
   * 记录内存告警指标
   */
  private recordMemoryAlert(
    level: "warning" | "critical",
    heapUsed: number,
    connectionCount: number,
  ): void {
    try {
      this.callbacks?.emitMonitoringEvent(
        "memory_usage_alert",
        heapUsed,
        {
          level,
          heapUsedMB: Math.round(heapUsed / (1024 * 1024)),
          connectionCount,
          timestamp: Date.now(),
        }
      );
    } catch (error) {
      this.logger.warn("记录内存告警失败", { error: error.message });
    }
  }

  /**
   * 强制连接清理
   */
  async forceConnectionCleanup(): Promise<ConnectionCleanupResult> {
    const connectionCount = this.activeConnections.size;
    if (connectionCount === 0) {
      this.logger.debug("无连接需要清理");
      return {
        staleConnectionsCleaned: 0,
        unhealthyConnectionsCleaned: 0,
        totalCleaned: 0,
        remainingConnections: 0,
        cleanupType: 'forced',
      };
    }

    // 清理10%最久未活跃的连接
    const cleanupTarget = Math.max(1, Math.floor(connectionCount * 0.1));

    const sortedConnections = Array.from(this.activeConnections.entries())
      .sort(([, a], [, b]) => {
        const aTime = a.lastActiveAt?.getTime() || a.createdAt?.getTime() || 0;
        const bTime = b.lastActiveAt?.getTime() || b.createdAt?.getTime() || 0;
        return aTime - bTime; // 最久未活跃的排在前面
      })
      .slice(0, cleanupTarget);

    let cleanedCount = 0;
    for (const [connectionId, connection] of sortedConnections) {
      try {
        // 尝试优雅关闭连接
        if (typeof connection.close === "function") {
          await connection.close();
        }
        this.activeConnections.delete(connectionId);
        this.connectionHealth.delete(connection.id);
        cleanedCount++;

        this.logger.debug("强制清理非活跃连接", {
          connectionId,
          lastActivity: connection.lastActiveAt?.toISOString() || "unknown",
        });
      } catch (error) {
        this.logger.warn("连接清理失败", {
          connectionId,
          error: error.message,
        });
      }
    }

    // 触发垃圾回收
    if (global.gc) {
      global.gc();
      this.logger.debug("已触发垃圾回收");
    }

    const result: ConnectionCleanupResult = {
      staleConnectionsCleaned: 0,
      unhealthyConnectionsCleaned: cleanedCount,
      totalCleaned: cleanedCount,
      remainingConnections: this.activeConnections.size,
      cleanupType: 'forced',
    };

    this.logger.log("强制连接清理完成", {
      cleaned: cleanedCount,
      remaining: this.activeConnections.size,
      originalCount: connectionCount,
      cleanupRatio: `${Math.round((cleanedCount / connectionCount) * 100)}%`,
    });

    // 发送清理监控事件
    this.callbacks?.emitMonitoringEvent(
      "forced_connection_cleanup_completed",
      cleanedCount,
      {
        ...result,
        reason: "memory_pressure",
      }
    );

    return result;
  }

  /**
   * 智能连接清理
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    let staleCount = 0;
    let unhealthyCount = 0;
    let totalCleaned = 0;

    // 第一步：清理传统意义上的过期连接
    for (const [connectionId, connection] of this.activeConnections) {
      if (this.isConnectionStale(connection, now)) {
        this.activeConnections.delete(connectionId);
        this.connectionHealth.delete(connection.id);
        staleCount++;
        totalCleaned++;
        this.logger.debug("清理过期连接", { connectionId });
      }
    }

    // 第二步：更新并清理不健康的连接
    this.updateConnectionHealthForAll();
    const unhealthyConnections = this.findUnhealthyConnections();
    this.cleanupUnhealthyConnections(unhealthyConnections);
    unhealthyCount = unhealthyConnections.length;
    totalCleaned += unhealthyCount;

    // 第三步：连接数上限保护
    if (this.activeConnections.size > this.config.maxConnections) {
      this.enforceConnectionLimit();
    }

    // 记录清理统计
    if (totalCleaned > 0) {
      this.logger.log("智能连接清理完成", {
        staleConnectionsCleaned: staleCount,
        unhealthyConnectionsCleaned: unhealthyCount,
        totalCleaned,
        remainingConnections: this.activeConnections.size,
        healthyConnections: this.connectionHealth.size
      });

      // 发送清理监控事件
      this.callbacks?.emitMonitoringEvent(
        "smart_connection_cleanup_completed",
        totalCleaned,
        {
          staleConnections: staleCount,
          unhealthyConnections: unhealthyCount,
          remainingConnections: this.activeConnections.size,
          cleanupType: "scheduled_cleanup"
        }
      );
    }

    // 第四步：健康状态统计和监控
    this.reportConnectionHealthStats();
  }

  /**
   * 检查连接是否过期
   */
  private isConnectionStale(
    connection: StreamConnection,
    now: number = Date.now(),
  ): boolean {
    // 检查连接状态
    if (!connection.isConnected) {
      return true;
    }

    // 检查连接是否超时
    const lastActivity = connection.lastActiveAt || connection.createdAt;
    if (lastActivity && (now - lastActivity.getTime() > this.config.connectionStaleTimeout)) {
      return true;
    }

    return false;
  }

  /**
   * 批量更新所有连接的健康状态
   */
  private updateConnectionHealthForAll(): void {
    const now = Date.now();

    for (const [connectionId, connection] of this.activeConnections) {
      let health = this.connectionHealth.get(connection.id);

      if (!health) {
        // 为没有健康记录的连接创建初始记录
        health = ConnectionHealthUtils.createInitialHealthInfo(now);
        health.lastActivity = connection.lastActiveAt?.getTime() || connection.createdAt?.getTime() || now;
        this.connectionHealth.set(connection.id, health);
      } else {
        // 更新现有连接的活动时间
        health.lastActivity = connection.lastActiveAt?.getTime() || health.lastActivity;

        // 重新计算健康状态和连接质量
        health.isHealthy = ConnectionHealthUtils.calculateConnectionHealthStatus(health);
        health.connectionQuality = ConnectionHealthUtils.calculateConnectionQuality(health);
      }
    }

    // 清理孤立的健康记录
    for (const [connectionId] of this.connectionHealth) {
      if (!Array.from(this.activeConnections.values()).some(conn => conn.id === connectionId)) {
        this.connectionHealth.delete(connectionId);
      }
    }
  }

  /**
   * 找到不健康的连接
   */
  private findUnhealthyConnections(): string[] {
    const unhealthyConnections: string[] = [];

    for (const [connectionId, health] of this.connectionHealth) {
      if (!health.isHealthy) {
        unhealthyConnections.push(connectionId);
      }
    }

    return unhealthyConnections;
  }

  /**
   * 清理不健康的连接
   */
  private cleanupUnhealthyConnections(unhealthyConnectionIds: string[]): void {
    let cleanedFromConnections = 0;

    // 清理活跃连接中的不健康连接
    for (const [connectionKey, connection] of this.activeConnections) {
      if (unhealthyConnectionIds.includes(connection.id)) {
        this.activeConnections.delete(connectionKey);
        cleanedFromConnections++;
      }
    }

    const cleanedFromHealth = CollectionUtils.deleteBatch(
      this.connectionHealth,
      unhealthyConnectionIds
    );

    if (cleanedFromConnections > 0) {
      this.logger.log("清理不健康连接完成", {
        cleanedCount: cleanedFromConnections,
        unhealthyConnections: unhealthyConnectionIds.length,
        remainingConnections: this.activeConnections.size
      });

      // 发送监控事件
      this.callbacks?.emitMonitoringEvent(
        "unhealthy_connections_cleaned",
        cleanedFromConnections,
        {
          unhealthyConnectionsFound: unhealthyConnectionIds.length,
          remainingConnections: this.activeConnections.size
        }
      );
    }
  }

  /**
   * 强制执行连接数上限
   */
  private enforceConnectionLimit(): void {
    // 第一步：优先清理不健康连接
    const unhealthyConnections = this.findUnhealthyConnections();
    this.cleanupUnhealthyConnections(unhealthyConnections);

    // 检查清理不健康连接后是否还需要进一步清理
    if (this.activeConnections.size <= this.config.maxConnections) {
      this.logger.debug("清理不健康连接后已达到连接数限制", {
        currentConnections: this.activeConnections.size,
        maxConnections: this.config.maxConnections,
        unhealthyConnectionsCleaned: unhealthyConnections.length
      });
      return;
    }

    // 第二步：如果仍然超限，清理最不活跃的连接
    this.cleanupInactiveConnections();
  }

  /**
   * 清理最不活跃的连接
   */
  private cleanupInactiveConnections(): void {
    const connectionsArray = Array.from(this.activeConnections.entries());

    // 按连接质量和活动时间排序，优先清理质量差且不活跃的连接
    connectionsArray.sort(([idA, connectionA], [idB, connectionB]) => {
      const healthA = this.connectionHealth.get(connectionA.id);
      const healthB = this.connectionHealth.get(connectionB.id);

      // 首先按连接质量排序
      const qualityPriorityA = ConnectionHealthUtils.getQualityPriority(healthA?.connectionQuality || 'poor');
      const qualityPriorityB = ConnectionHealthUtils.getQualityPriority(healthB?.connectionQuality || 'poor');

      if (qualityPriorityA !== qualityPriorityB) {
        return qualityPriorityA - qualityPriorityB; // 质量差的排在前面
      }

      // 质量相同时按活动时间排序
      const lastActivityA = healthA?.lastActivity || 0;
      const lastActivityB = healthB?.lastActivity || 0;
      return lastActivityA - lastActivityB; // 活动时间早的排在前面
    });

    // 计算需要移除的连接数
    const toRemove = connectionsArray.slice(
      0,
      connectionsArray.length - this.config.maxConnections,
    );

    let removedCount = 0;
    for (const [connectionId, connection] of toRemove) {
      this.activeConnections.delete(connectionId);
      this.connectionHealth.delete(connection.id);
      removedCount++;
    }

    this.logger.warn("强制执行连接数上限 - 清理不活跃连接", {
      removedConnections: removedCount,
      currentConnections: this.activeConnections.size,
      maxConnections: this.config.maxConnections,
    });

    // 发送监控事件
    this.callbacks?.emitMonitoringEvent(
      "inactive_connections_cleaned",
      removedCount,
      {
        currentConnections: this.activeConnections.size,
        maxConnections: this.config.maxConnections,
        reason: "connection_limit_exceeded"
      }
    );
  }

  /**
   * 报告连接健康状态统计
   */
  private reportConnectionHealthStats(): void {
    const healthStats = ConnectionStatsUtils.calculateHealthStats(this.connectionHealth);

    this.callbacks?.emitMonitoringEvent(
      "connection_health_stats",
      healthStats.total,
      {
        stats: healthStats,
        timestamp: Date.now(),
      }
    );

    this.logger.debug("连接健康统计", healthStats);
  }

  /**
   * 模块销毁时的清理
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // 停止定时器
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      if (this.memoryCheckTimer) {
        clearInterval(this.memoryCheckTimer);
        this.memoryCheckTimer = undefined;
      }

      // 清理连接
      this.activeConnections.clear();
      this.connectionHealth.clear();

      this.logger.log("StreamConnectionManager 资源已清理");
    } catch (error) {
      this.logger.error("StreamConnectionManager 清理失败", {
        error: error.message,
      });
    }
  }
}