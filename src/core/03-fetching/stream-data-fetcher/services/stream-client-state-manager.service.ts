import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "../../../../app/config/logger.config";
import { GatewayBroadcastError } from "../exceptions/gateway-broadcast.exception";

/**
 * 客户端订阅信息
 */
export interface ClientSubscriptionInfo {
  clientId: string;
  symbols: Set<string>;
  wsCapabilityType: string;
  providerName: string;
  subscriptionTime: number;
  lastActiveTime: number;
}

/**
 * 客户端状态统计
 */
export interface ClientStateStats {
  totalClients: number;
  totalSubscriptions: number;
  activeClients: number;
  providerBreakdown: Record<string, number>;
  capabilityBreakdown: Record<string, number>;
}

/**
 * 订阅变更事件
 */
export interface SubscriptionChangeEvent {
  clientId: string;
  symbols: string[];
  action: "subscribe" | "unsubscribe";
  provider: string;
  capability: string;
  timestamp: number;
}

/**
 * StreamClientStateManager - 客户端状态管理器
 *
 * 🎯 核心功能：
 * - 客户端订阅状态跟踪
 * - 符号订阅聚合和去重
 * - 客户端活跃状态监控
 * - 订阅变更事件通知
 * - 批量状态查询和统计
 *
 * 📊 管理数据：
 * - 客户端 → 订阅符号映射
 * - 符号 → 订阅客户端映射
 * - 提供商 → 客户端分布
 * - 活跃状态监控
 */
@Injectable()
export class StreamClientStateManager implements OnModuleDestroy {
  private readonly logger = createLogger("StreamClientStateManager");

  // 客户端订阅信息
  private readonly clientSubscriptions = new Map<
    string,
    ClientSubscriptionInfo
  >();

  // 符号到客户端的反向映射 - 用于快速查找哪些客户端订阅了某个符号
  private readonly symbolToClients = new Map<string, Set<string>>();

  // 提供商到客户端的映射
  private readonly providerToClients = new Map<string, Set<string>>();

  // 订阅变更事件监听器
  private readonly changeListeners: ((
    event: SubscriptionChangeEvent,
  ) => void)[] = [];

  // 客户端活跃性检查间隔 (5分钟)
  private readonly clientTimeoutMs = 5 * 60 * 1000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理间隔

  // 定时器管理
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Gateway广播统计 - 用于监控Legacy移除进度
  private readonly broadcastStats = {
    gateway: {
      success: 0,
      failure: 0,
      lastSuccess: null as Date | null,
      lastFailure: null as Date | null,
    },
    legacy: {
      calls: 0,
      lastCall: null as Date | null,
    },
    total: {
      attempts: 0,
      startTime: new Date(),
    },
    errors: {
      gatewayBroadcastErrors: 0,
      lastGatewayError: null as Date | null,
      lastErrorReason: null as string | null,
    },
  };

  constructor() {
    this.setupPeriodicCleanup();
  }

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.debug("客户端清理调度器已停止");
    }
  }

  /**
   * 添加客户端订阅
   * @param clientId 客户端ID
   * @param symbols 订阅符号列表
   * @param wsCapabilityType WebSocket能力类型
   * @param providerName 提供商名称
   */
  addClientSubscription(
    clientId: string,
    symbols: string[],
    wsCapabilityType: string,
    providerName: string,
  ): void {
    const now = Date.now();

    // 更新或创建客户端订阅信息
    let clientSub = this.clientSubscriptions.get(clientId);
    if (!clientSub) {
      clientSub = {
        clientId,
        symbols: new Set(),
        wsCapabilityType,
        providerName,
        subscriptionTime: now,
        lastActiveTime: now,
      };
      this.clientSubscriptions.set(clientId, clientSub);
    }

    // 添加新的订阅符号
    const newSymbols: string[] = [];
    symbols.forEach((symbol) => {
      if (!clientSub!.symbols.has(symbol)) {
        clientSub!.symbols.add(symbol);
        newSymbols.push(symbol);

        // 更新符号到客户端的映射
        if (!this.symbolToClients.has(symbol)) {
          this.symbolToClients.set(symbol, new Set());
        }
        this.symbolToClients.get(symbol)!.add(clientId);
      }
    });

    // 更新提供商到客户端的映射
    if (!this.providerToClients.has(providerName)) {
      this.providerToClients.set(providerName, new Set());
    }
    this.providerToClients.get(providerName)!.add(clientId);

    // 更新活跃时间
    clientSub.lastActiveTime = now;

    // 发送订阅变更事件
    if (newSymbols.length > 0) {
      this.emitSubscriptionChange({
        clientId,
        symbols: newSymbols,
        action: "subscribe",
        provider: providerName,
        capability: wsCapabilityType,
        timestamp: now,
      });
    }

    this.logger.debug("客户端订阅已添加", {
      clientId,
      newSymbolsCount: newSymbols.length,
      totalSymbols: clientSub.symbols.size,
      provider: providerName,
      capability: wsCapabilityType,
    });
  }

  /**
   * 移除客户端订阅
   * @param clientId 客户端ID
   * @param symbols 要取消的符号列表，如果为空则取消所有
   */
  removeClientSubscription(clientId: string, symbols?: string[]): void {
    const clientSub = this.clientSubscriptions.get(clientId);
    if (!clientSub) {
      this.logger.warn("尝试移除不存在的客户端订阅", { clientId });
      return;
    }

    const now = Date.now();
    let removedSymbols: string[] = [];

    if (!symbols || symbols.length === 0) {
      // 移除所有订阅
      removedSymbols = Array.from(clientSub.symbols);
      this.cleanupClientSubscription(clientId);
    } else {
      // 移除指定符号
      symbols.forEach((symbol) => {
        if (clientSub.symbols.has(symbol)) {
          clientSub.symbols.delete(symbol);
          removedSymbols.push(symbol);

          // 更新符号到客户端的映射
          const symbolClients = this.symbolToClients.get(symbol);
          if (symbolClients) {
            symbolClients.delete(clientId);
            if (symbolClients.size === 0) {
              this.symbolToClients.delete(symbol);
            }
          }
        }
      });

      // 如果客户端没有剩余订阅，清理客户端信息
      if (clientSub.symbols.size === 0) {
        this.cleanupClientSubscription(clientId);
      }
    }

    // 发送取消订阅变更事件
    if (removedSymbols.length > 0) {
      this.emitSubscriptionChange({
        clientId,
        symbols: removedSymbols,
        action: "unsubscribe",
        provider: clientSub.providerName,
        capability: clientSub.wsCapabilityType,
        timestamp: now,
      });
    }

    this.logger.debug("客户端订阅已移除", {
      clientId,
      removedSymbolsCount: removedSymbols.length,
      remainingSymbols: clientSub?.symbols?.size || 0,
    });
  }

  /**
   * 获取指定符号的所有订阅客户端
   * @param symbol 符号
   * @returns 订阅该符号的客户端ID列表
   */
  getClientsForSymbol(symbol: string): string[] {
    const clients = this.symbolToClients.get(symbol);
    return clients ? Array.from(clients) : [];
  }

  /**
   * 获取客户端订阅的所有符号
   * @param clientId 客户端ID
   * @returns 客户端订阅的符号列表
   */
  getClientSymbols(clientId: string): string[] {
    const clientSub = this.clientSubscriptions.get(clientId);
    return clientSub ? Array.from(clientSub.symbols) : [];
  }

  /**
   * 获取客户端订阅信息
   * @param clientId 客户端ID
   * @returns 客户端订阅信息
   */
  getClientSubscription(clientId: string): ClientSubscriptionInfo | null {
    return this.clientSubscriptions.get(clientId) || null;
  }

  /**
   * 获取所有需要订阅的符号（去重后）
   * @param provider 可选的提供商过滤
   * @param capability 可选的能力过滤
   * @returns 需要订阅的符号列表
   */
  getAllRequiredSymbols(provider?: string, capability?: string): string[] {
    const symbols = new Set<string>();

    for (const [, clientSub] of this.clientSubscriptions.entries()) {
      // 提供商过滤
      if (provider && clientSub.providerName !== provider) continue;

      // 能力过滤
      if (capability && clientSub.wsCapabilityType !== capability) continue;

      // 添加符号
      clientSub.symbols.forEach((symbol) => symbols.add(symbol));
    }

    return Array.from(symbols);
  }

  /**
   * 更新客户端活跃状态
   * @param clientId 客户端ID
   */
  updateClientActivity(clientId: string): void {
    const clientSub = this.clientSubscriptions.get(clientId);
    if (clientSub) {
      clientSub.lastActiveTime = Date.now();
    }
  }

  /**
   * 获取客户端状态统计
   * @returns 客户端状态统计信息
   */
  getClientStateStats(): ClientStateStats {
    const now = Date.now();
    const stats: ClientStateStats = {
      totalClients: this.clientSubscriptions.size,
      totalSubscriptions: 0,
      activeClients: 0,
      providerBreakdown: {},
      capabilityBreakdown: {},
    };

    for (const [, clientSub] of this.clientSubscriptions.entries()) {
      stats.totalSubscriptions += clientSub.symbols.size;

      // 活跃客户端检查
      if (now - clientSub.lastActiveTime < this.clientTimeoutMs) {
        stats.activeClients++;
      }

      // 提供商分布统计
      stats.providerBreakdown[clientSub.providerName] =
        (stats.providerBreakdown[clientSub.providerName] || 0) + 1;

      // 能力分布统计
      stats.capabilityBreakdown[clientSub.wsCapabilityType] =
        (stats.capabilityBreakdown[clientSub.wsCapabilityType] || 0) + 1;
    }

    return stats;
  }

  /**
   * 新的统一广播方法 - 通过WebSocket Gateway
   * @param symbol 符号
   * @param data 消息数据
   * @param webSocketProvider WebSocket服务器提供者
   */
  async broadcastToSymbolViaGateway(
    symbol: string,
    data: any,
    webSocketProvider?: any,
  ): Promise<void> {
    // 更新统计：总尝试次数
    this.broadcastStats.total.attempts++;
    const attemptTime = new Date();

    if (!webSocketProvider || !webSocketProvider.isServerAvailable()) {
      const healthStatus = webSocketProvider?.healthCheck() || {
        status: "unavailable",
        details: { reason: "Provider not injected" },
      };

      // 更新错误统计
      this.broadcastStats.gateway.failure++;
      this.broadcastStats.gateway.lastFailure = attemptTime;
      this.broadcastStats.errors.gatewayBroadcastErrors++;
      this.broadcastStats.errors.lastGatewayError = attemptTime;
      this.broadcastStats.errors.lastErrorReason =
        healthStatus.details?.reason || "未知原因";

      this.logger.error("Gateway不可用，广播失败", {
        symbol,
        healthStatus,
        migrationComplete: true,
        broadcastStats: this.getBroadcastStats(),
      });

      throw new GatewayBroadcastError(
        symbol,
        healthStatus,
        healthStatus.details?.reason || "未知原因",
      );
    }

    try {
      // 统一通过Gateway广播
      const success = await webSocketProvider.broadcastToRoom(
        `symbol:${symbol}`,
        "data",
        {
          symbol,
          timestamp: new Date().toISOString(),
          data,
        },
      );

      if (success) {
        // 更新成功统计
        this.broadcastStats.gateway.success++;
        this.broadcastStats.gateway.lastSuccess = attemptTime;

        // 更新客户端活动状态
        const clientIds = this.getClientsForSymbol(symbol);
        clientIds.forEach((clientId) => this.updateClientActivity(clientId));

        this.logger.debug("Gateway广播成功", {
          symbol,
          clientCount: clientIds.length,
          dataSize: JSON.stringify(data).length,
          method: "gateway",
          broadcastStats: this.getBroadcastStats(),
        });
      } else {
        // 更新失败统计
        this.broadcastStats.gateway.failure++;
        this.broadcastStats.gateway.lastFailure = attemptTime;
        this.broadcastStats.errors.gatewayBroadcastErrors++;
        this.broadcastStats.errors.lastGatewayError = attemptTime;
        this.broadcastStats.errors.lastErrorReason = "Gateway广播返回失败状态";

        const healthStatus = webSocketProvider.healthCheck();
        this.logger.error("Gateway广播失败", {
          symbol,
          healthStatus,
          migrationComplete: true,
          broadcastStats: this.getBroadcastStats(),
        });

        throw new GatewayBroadcastError(
          symbol,
          healthStatus,
          "Gateway广播返回失败状态",
        );
      }
    } catch (error) {
      // 如果是我们自己抛出的GatewayBroadcastError，直接重新抛出
      if (error instanceof GatewayBroadcastError) {
        throw error;
      }

      // 更新异常统计
      this.broadcastStats.gateway.failure++;
      this.broadcastStats.gateway.lastFailure = attemptTime;
      this.broadcastStats.errors.gatewayBroadcastErrors++;
      this.broadcastStats.errors.lastGatewayError = attemptTime;
      this.broadcastStats.errors.lastErrorReason = `Gateway广播异常: ${error.message}`;

      // 其他异常转换为GatewayBroadcastError
      const healthStatus = webSocketProvider?.healthCheck() || {
        status: "error",
        details: { reason: "Unknown health status" },
      };
      this.logger.error("Gateway广播异常", {
        symbol,
        error: error.message,
        healthStatus,
        migrationComplete: true,
        broadcastStats: this.getBroadcastStats(),
      });

      throw new GatewayBroadcastError(
        symbol,
        healthStatus,
        `Gateway广播异常: ${error.message}`,
      );
    }
  }

  /**
   * 获取Gateway广播统计信息 - 用于监控Legacy移除进度
   * @returns 广播统计信息和使用率分析
   */
  getBroadcastStats(): {
    gatewayUsageRate: number;
    errorRate: number;
    healthStatus: "excellent" | "good" | "warning" | "critical";
    stats: typeof this.broadcastStats;
    analysis: {
      totalBroadcasts: number;
      successRate: number;
      averageLatency?: number;
      uptime: number;
    };
  } {
    const totalAttempts = this.broadcastStats.total.attempts;
    const totalGateway =
      this.broadcastStats.gateway.success + this.broadcastStats.gateway.failure;
    const totalLegacy = this.broadcastStats.legacy.calls;
    const totalErrors = this.broadcastStats.errors.gatewayBroadcastErrors;

    // 计算Gateway使用率 (Gateway调用 / 总调用)
    const gatewayUsageRate =
      totalAttempts > 0 ? (totalGateway * 100) / totalAttempts : 100; // 没有调用时假设100%

    // 计算错误率 (错误数 / Gateway尝试数)
    const errorRate = totalGateway > 0 ? (totalErrors * 100) / totalGateway : 0;

    // 计算成功率
    const successRate =
      totalGateway > 0
        ? (this.broadcastStats.gateway.success * 100) / totalGateway
        : 100;

    // 计算运行时间
    const uptime =
      (Date.now() - this.broadcastStats.total.startTime.getTime()) / 1000 / 60; // 分钟

    // 健康状态判断
    let healthStatus: "excellent" | "good" | "warning" | "critical";

    if (errorRate > 10 || gatewayUsageRate < 80) {
      healthStatus = "critical";
    } else if (errorRate > 5 || gatewayUsageRate < 90) {
      healthStatus = "warning";
    } else if (errorRate > 1 || gatewayUsageRate < 95) {
      healthStatus = "good";
    } else {
      healthStatus = "excellent";
    }

    return {
      gatewayUsageRate: Math.round(gatewayUsageRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      healthStatus,
      stats: {
        ...this.broadcastStats,
        // 深拷贝避免外部修改
        gateway: { ...this.broadcastStats.gateway },
        legacy: { ...this.broadcastStats.legacy },
        total: { ...this.broadcastStats.total },
        errors: { ...this.broadcastStats.errors },
      },
      analysis: {
        totalBroadcasts: totalAttempts,
        successRate: Math.round(successRate * 100) / 100,
        uptime: Math.round(uptime * 100) / 100,
      },
    };
  }

  /**
   * 重置广播统计信息 (用于测试或手动重置)
   */
  resetBroadcastStats(): void {
    this.broadcastStats.gateway.success = 0;
    this.broadcastStats.gateway.failure = 0;
    this.broadcastStats.gateway.lastSuccess = null;
    this.broadcastStats.gateway.lastFailure = null;
    this.broadcastStats.legacy.calls = 0;
    this.broadcastStats.legacy.lastCall = null;
    this.broadcastStats.total.attempts = 0;
    this.broadcastStats.total.startTime = new Date();
    this.broadcastStats.errors.gatewayBroadcastErrors = 0;
    this.broadcastStats.errors.lastGatewayError = null;
    this.broadcastStats.errors.lastErrorReason = null;

    this.logger.log("Gateway广播统计已重置");
  }

  /**
   * 添加订阅变更监听器
   * @param listener 监听器函数
   */
  addSubscriptionChangeListener(
    listener: (event: SubscriptionChangeEvent) => void,
  ): void {
    this.changeListeners.push(listener);
  }

  /**
   * 移除订阅变更监听器
   * @param listener 监听器函数
   */
  removeSubscriptionChangeListener(
    listener: (event: SubscriptionChangeEvent) => void,
  ): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * 清理所有客户端订阅
   */
  clearAll(): void {
    this.clientSubscriptions.clear();
    this.symbolToClients.clear();
    this.providerToClients.clear();
    this.logger.log("所有客户端订阅已清理");
  }

  // === 私有方法 ===

  /**
   * 清理客户端订阅信息
   */
  private cleanupClientSubscription(clientId: string): void {
    const clientSub = this.clientSubscriptions.get(clientId);
    if (!clientSub) return;

    // 从符号映射中移除客户端
    clientSub.symbols.forEach((symbol) => {
      const symbolClients = this.symbolToClients.get(symbol);
      if (symbolClients) {
        symbolClients.delete(clientId);
        if (symbolClients.size === 0) {
          this.symbolToClients.delete(symbol);
        }
      }
    });

    // 从提供商映射中移除客户端
    const providerClients = this.providerToClients.get(clientSub.providerName);
    if (providerClients) {
      providerClients.delete(clientId);
      if (providerClients.size === 0) {
        this.providerToClients.delete(clientSub.providerName);
      }
    }

    // 移除客户端订阅
    this.clientSubscriptions.delete(clientId);
  }

  /**
   * 发送订阅变更事件
   */
  private emitSubscriptionChange(event: SubscriptionChangeEvent): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error("订阅变更监听器执行失败", {
          error: error.message,
          event,
        });
      }
    });
  }

  /**
   * 设置周期性清理非活跃客户端
   */
  private setupPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveClients();
    }, this.CLEANUP_INTERVAL);

    this.logger.debug("客户端清理调度器已启动", {
      interval: this.CLEANUP_INTERVAL,
    });
  }

  /**
   * 清理非活跃客户端
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const inactiveClients: string[] = [];

    for (const [clientId, clientSub] of this.clientSubscriptions.entries()) {
      if (now - clientSub.lastActiveTime > this.clientTimeoutMs) {
        inactiveClients.push(clientId);
      }
    }

    // 清理非活跃客户端
    inactiveClients.forEach((clientId) => {
      this.logger.debug("清理非活跃客户端", { clientId });
      this.removeClientSubscription(clientId);
    });

    if (inactiveClients.length > 0) {
      this.logger.log(`清理了 ${inactiveClients.length} 个非活跃客户端`);
    }
  }
}
