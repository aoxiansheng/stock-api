import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  ChartIntradayCursorService,
  type IntradayCursorPayload,
} from "@core/03-fetching/chart-intraday/services/chart-intraday-cursor.service";
import { createLogger } from "@common/logging/index";
import { GatewayBroadcastError } from "../exceptions/gateway-broadcast.exception";
import {
  formatTradingDayFromTimestamp,
  inferMarketFromSymbol,
  isSupportedMarket,
  parseFlexibleTimestampToMs,
} from "@core/shared/utils/market-time.util";

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

interface IntradayEmittedBucketState {
  emittedAtMs: number;
  price: number;
}

interface IntradayDomainEventCandidate {
  bucketMs: number;
  timestampMs: number;
  signature: string;
  payload: {
    symbol: string;
    market: string;
    tradingDay: string;
    granularity: "1s";
    point: {
      timestamp: string;
      price: number;
      volume: number;
    };
    cursor: string;
  };
}

interface PendingIntradayBucketEmission {
  candidate: IntradayDomainEventCandidate;
  webSocketProvider: any;
  timer: NodeJS.Timeout | null;
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
  private readonly intradayBucketStateTtlMs = 5 * 60 * 1000;
  private readonly intradayMaxBucketStatesPerSymbol = 512;
  private readonly intradayBucketFlushGraceMs = this.readIntegerEnv(
    "CHART_INTRADAY_BUCKET_FLUSH_GRACE_MS",
    50,
    0,
  );

  private intradayCursorService: ChartIntradayCursorService | null = null;
  private intradayCursorServiceUnavailable = false;
  private readonly intradayBucketStates = new Map<
    string,
    Map<number, IntradayEmittedBucketState>
  >();
  private readonly intradayLatestEmittedState = new Map<
    string,
    { bucketMs: number; price: number }
  >();
  private readonly pendingIntradayBucketEmissions = new Map<
    string,
    Map<number, PendingIntradayBucketEmission>
  >();

  // 客户端订阅信息
  private readonly clientSubscriptions = new Map<
    string,
    ClientSubscriptionInfo
  >();

  // 符号到客户端的反向映射 - 用于快速查找哪些客户端订阅了某个符号
  private readonly symbolToClients = new Map<string, Set<string>>();

  // provider+capability+symbol 到客户端的反向映射 - 用于精确控制上游订阅引用计数
  private readonly upstreamToClients = new Map<string, Set<string>>();

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
    direct: {
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

    for (const symbolEntries of this.pendingIntradayBucketEmissions.values()) {
      for (const entry of symbolEntries.values()) {
        if (entry.timer) {
          clearTimeout(entry.timer);
        }
      }
    }

    this.pendingIntradayBucketEmissions.clear();
    this.intradayBucketStates.clear();
    this.intradayLatestEmittedState.clear();
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
        this.addClientToSubscriptionIndexes(
          clientId,
          symbol,
          providerName,
          wsCapabilityType,
        );
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
          this.removeClientFromSubscriptionIndexes(
            clientId,
            symbol,
            clientSub.providerName,
            clientSub.wsCapabilityType,
          );
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

  getClientCountForSymbol(symbol: string): number {
    const clients = this.symbolToClients.get(symbol);
    return clients ? clients.size : 0;
  }

  getClientCountForUpstream(
    provider: string,
    capability: string,
    symbol: string,
  ): number {
    const clients = this.upstreamToClients.get(
      this.buildUpstreamSubscriptionKey(provider, capability, symbol),
    );
    return clients ? clients.size : 0;
  }

  hasSubscribersForSymbol(symbol: string): boolean {
    return this.getClientCountForSymbol(symbol) > 0;
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
   * 更新客户端订阅状态
   * @param connectionId 连接ID
   * @param symbols 符号列表
   * @param action 订阅动作
   */
  updateSubscriptionState(
    connectionId: string,
    symbols: string[],
    action: "subscribed" | "unsubscribed",
  ): void {
    const clientSub = this.clientSubscriptions.get(connectionId);

    if (!clientSub) {
      this.logger.warn("尝试更新不存在的客户端订阅状态", {
        connectionId,
        action,
        symbols: symbols.length,
      });
      return;
    }

    // 更新符号集合
    if (action === "subscribed") {
      symbols.forEach((symbol) => {
        if (clientSub.symbols.has(symbol)) {
          return;
        }
        clientSub.symbols.add(symbol);
        this.addClientToSubscriptionIndexes(
          connectionId,
          symbol,
          clientSub.providerName,
          clientSub.wsCapabilityType,
        );
      });
      this.logger.debug("客户端订阅状态已更新（添加）", {
        connectionId,
        addedSymbols: symbols,
        totalSymbols: clientSub.symbols.size,
      });
    } else {
      symbols.forEach((symbol) => {
        if (!clientSub.symbols.has(symbol)) {
          return;
        }
        clientSub.symbols.delete(symbol);
        this.removeClientFromSubscriptionIndexes(
          connectionId,
          symbol,
          clientSub.providerName,
          clientSub.wsCapabilityType,
        );
      });
      this.logger.debug("客户端订阅状态已更新（移除）", {
        connectionId,
        removedSymbols: symbols,
        totalSymbols: clientSub.symbols.size,
      });
    }

    // 更新活跃时间
    clientSub.lastActiveTime = Date.now();

    // 触发订阅变更事件
    this.emitSubscriptionChange({
      clientId: connectionId,
      symbols,
      action: action === "subscribed" ? "subscribe" : "unsubscribe",
      provider: clientSub.providerName,
      capability: clientSub.wsCapabilityType,
      timestamp: Date.now(),
    });
  }

  /**
   * 移除连接（完全清理客户端状态）
   * @param connectionId 连接ID
   */
  removeConnection(connectionId: string): void {
    this.logger.debug("移除连接及其所有订阅", { connectionId });
    this.removeClientSubscription(connectionId);
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
   * 按提供商获取客户端列表
   * @param providerName 提供商名称
   * @returns 客户端ID列表
   */
  getClientsByProvider(providerName: string): string[] {
    const clients = this.providerToClients.get(providerName);
    return clients ? Array.from(clients) : [];
  }

  /**
   * 获取心跳超时的客户端列表
   * @param timeoutMs 超时时间阈值
   * @returns 客户端ID列表
   */
  getClientsWithHeartbeatTimeout(timeoutMs: number): string[] {
    const now = Date.now();
    const timeoutClients: string[] = [];

    for (const [clientId, clientSub] of this.clientSubscriptions.entries()) {
      if (now - clientSub.lastActiveTime > timeoutMs) {
        timeoutClients.push(clientId);
      }
    }

    return timeoutClients;
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

      throw GatewayBroadcastError.create(
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
        this.scheduleIntradayDomainEvents(symbol, data, webSocketProvider);

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
          intradayEventScheduled: true,
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

        throw GatewayBroadcastError.create(
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

      throw GatewayBroadcastError.create(
        symbol,
        healthStatus,
        `Gateway广播异常: ${error.message}`,
      );
    }
  }

  private scheduleIntradayDomainEvents(
    symbol: string,
    data: any,
    webSocketProvider: any,
  ): void {
    void Promise.resolve()
      .then(() =>
        this.emitIntradayDomainEvents(symbol, data, webSocketProvider),
      )
      .catch((error) => {
        this.logger.warn("分时领域事件异步广播异常（已忽略）", {
          symbol,
          error: error?.message || String(error || ""),
        });
      });
  }

  private async emitIntradayDomainEvents(
    symbol: string,
    data: any,
    webSocketProvider: any,
  ): Promise<number> {
    const candidates = this.buildIntradayDomainEventCandidates(symbol, data);
    if (candidates.length === 0) {
      return 0;
    }

    for (const candidate of candidates) {
      this.scheduleIntradayBucketEmission(
        candidate.payload.symbol,
        candidate,
        webSocketProvider,
      );
    }

    return candidates.length;
  }

  private buildIntradayDomainEventCandidates(
    symbol: string,
    data: any,
  ): IntradayDomainEventCandidate[] {
    const items = Array.isArray(data) ? data : [data];
    const candidatesByBucket = new Map<number, IntradayDomainEventCandidate>();
    const normalizedSymbol = String(symbol || "")
      .trim()
      .toUpperCase();
    const cursorService = this.getIntradayCursorService();
    if (!cursorService) {
      return [];
    }

    for (const item of items) {
      const price = Number(item?.lastPrice ?? item?.price);
      const timestampMs = parseFlexibleTimestampToMs(item?.timestamp);
      const volume = Number(item?.volume ?? 0);
      if (!Number.isFinite(price) || !timestampMs) {
        continue;
      }

      const market = this.resolveIntradayMarket(normalizedSymbol, item);
      if (!market) {
        continue;
      }

      const tradingDay = formatTradingDayFromTimestamp(timestampMs, market);
      const bucketMs = Math.floor(timestampMs / 1000) * 1000;
      const bucketTimestampIso = new Date(bucketMs).toISOString();
      const normalizedVolume = Number.isFinite(volume) ? volume : 0;
      const cursorPayload: IntradayCursorPayload = {
        v: 1,
        symbol: normalizedSymbol,
        market,
        tradingDay,
        lastPointTimestamp: bucketTimestampIso,
        issuedAt: new Date().toISOString(),
      };
      const cursor = cursorService.encodeCursor(cursorPayload);
      const signature = `${bucketTimestampIso}|${price}|${normalizedVolume}`;
      const existingCandidate = candidatesByBucket.get(bucketMs);
      if (existingCandidate && existingCandidate.timestampMs > timestampMs) {
        continue;
      }

      candidatesByBucket.set(bucketMs, {
        bucketMs,
        timestampMs,
        signature,
        payload: {
          symbol: normalizedSymbol,
          market,
          tradingDay,
          granularity: "1s",
          point: {
            timestamp: bucketTimestampIso,
            price,
            volume: normalizedVolume,
          },
          cursor,
        },
      });
    }

    return Array.from(candidatesByBucket.values()).sort(
      (left, right) => left.bucketMs - right.bucketMs,
    );
  }

  private scheduleIntradayBucketEmission(
    symbol: string,
    candidate: IntradayDomainEventCandidate,
    webSocketProvider: any,
  ): void {
    const symbolEntries = this.getPendingIntradayBucketEmissions(symbol);
    const existingEntry = symbolEntries.get(candidate.bucketMs);

    if (existingEntry) {
      if (candidate.timestampMs >= existingEntry.candidate.timestampMs) {
        existingEntry.candidate = candidate;
        existingEntry.webSocketProvider = webSocketProvider;
      }
      return;
    }

    const pendingEntry: PendingIntradayBucketEmission = {
      candidate,
      webSocketProvider,
      timer: null,
    };
    symbolEntries.set(candidate.bucketMs, pendingEntry);

    const emitAtMs =
      candidate.bucketMs + 1000 + this.intradayBucketFlushGraceMs;
    const delayMs = emitAtMs - Date.now();
    if (delayMs <= 0) {
      void Promise.resolve().then(() =>
        this.flushIntradayBucketEmission(symbol, candidate.bucketMs),
      );
      return;
    }

    pendingEntry.timer = setTimeout(() => {
      void this.flushIntradayBucketEmission(symbol, candidate.bucketMs);
    }, delayMs);
    pendingEntry.timer.unref?.();
  }

  private getPendingIntradayBucketEmissions(
    symbol: string,
  ): Map<number, PendingIntradayBucketEmission> {
    let symbolEntries = this.pendingIntradayBucketEmissions.get(symbol);
    if (!symbolEntries) {
      symbolEntries = new Map<number, PendingIntradayBucketEmission>();
      this.pendingIntradayBucketEmissions.set(symbol, symbolEntries);
    }
    return symbolEntries;
  }

  private async flushIntradayBucketEmission(
    symbol: string,
    bucketMs: number,
  ): Promise<void> {
    const symbolEntries = this.pendingIntradayBucketEmissions.get(symbol);
    const pendingEntry = symbolEntries?.get(bucketMs);
    if (!pendingEntry) {
      return;
    }

    if (pendingEntry.timer) {
      clearTimeout(pendingEntry.timer);
      pendingEntry.timer = null;
    }

    symbolEntries?.delete(bucketMs);
    if (symbolEntries && symbolEntries.size === 0) {
      this.pendingIntradayBucketEmissions.delete(symbol);
    }

    if (!this.shouldEmitIntradayEvent(symbol, pendingEntry.candidate)) {
      return;
    }

    try {
      const success = await pendingEntry.webSocketProvider.broadcastToRoom(
        `symbol:${symbol}`,
        "chart.intraday.point",
        pendingEntry.candidate.payload,
      );
      if (!success) {
        this.logger.warn("分时领域事件广播失败（已忽略）", {
          symbol,
          bucketMs,
          reason: "Gateway广播返回失败状态",
        });
      }
    } catch (error: any) {
      this.logger.warn("分时领域事件广播失败（已忽略）", {
        symbol,
        bucketMs,
        error: error?.message || String(error || ""),
      });
    }
  }

  private shouldEmitIntradayEvent(
    symbol: string,
    candidate: IntradayDomainEventCandidate,
  ): boolean {
    const symbolBucketStates = this.getIntradayBucketStates(symbol);
    this.pruneIntradayBucketStates(symbolBucketStates, candidate.bucketMs);

    const existingState = symbolBucketStates.get(candidate.bucketMs);
    if (existingState) {
      return false;
    }

    const latestEmittedState = this.intradayLatestEmittedState.get(symbol);
    if (
      latestEmittedState &&
      candidate.bucketMs < latestEmittedState.bucketMs
    ) {
      return false;
    }

    if (
      latestEmittedState &&
      candidate.bucketMs > latestEmittedState.bucketMs &&
      latestEmittedState.price === candidate.payload.point.price
    ) {
      return false;
    }

    symbolBucketStates.set(candidate.bucketMs, {
      emittedAtMs: Date.now(),
      price: candidate.payload.point.price,
    });
    this.intradayLatestEmittedState.set(symbol, {
      bucketMs: candidate.bucketMs,
      price: candidate.payload.point.price,
    });
    this.trimIntradayBucketStates(symbolBucketStates);
    return true;
  }

  private getIntradayBucketStates(
    symbol: string,
  ): Map<number, IntradayEmittedBucketState> {
    let symbolBucketStates = this.intradayBucketStates.get(symbol);
    if (!symbolBucketStates) {
      symbolBucketStates = new Map<number, IntradayEmittedBucketState>();
      this.intradayBucketStates.set(symbol, symbolBucketStates);
    }
    return symbolBucketStates;
  }

  private pruneIntradayBucketStates(
    symbolBucketStates: Map<number, IntradayEmittedBucketState>,
    currentBucketMs: number,
  ): void {
    const thresholdBucketMs = currentBucketMs - this.intradayBucketStateTtlMs;
    for (const bucketMs of symbolBucketStates.keys()) {
      if (bucketMs < thresholdBucketMs) {
        symbolBucketStates.delete(bucketMs);
      }
    }
  }

  private trimIntradayBucketStates(
    symbolBucketStates: Map<number, IntradayEmittedBucketState>,
  ): void {
    while (symbolBucketStates.size > this.intradayMaxBucketStatesPerSymbol) {
      const oldestBucket = symbolBucketStates.keys().next().value;
      if (typeof oldestBucket !== "number") {
        return;
      }
      symbolBucketStates.delete(oldestBucket);
    }
  }

  private resolveIntradayMarket(
    normalizedSymbol: string,
    item: any,
  ): string | null {
    const inferredMarket = inferMarketFromSymbol(normalizedSymbol);
    if (inferredMarket !== "UNKNOWN") {
      return inferredMarket;
    }

    const itemSymbol = typeof item?.symbol === "string" ? item.symbol : null;
    if (itemSymbol) {
      const inferredFromItem = inferMarketFromSymbol(itemSymbol);
      if (inferredFromItem !== "UNKNOWN") {
        return inferredFromItem;
      }
    }

    const marketValue = this.normalizeMarketValue(
      item?.market ??
        item?.marketType ??
        item?.marketCode ??
        item?.mkt ??
        item?.exchange,
    );
    if (marketValue && isSupportedMarket(marketValue)) {
      return marketValue;
    }

    return null;
  }

  private normalizeMarketValue(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    return normalized ? normalized : null;
  }

  private readIntegerEnv(key: string, fallback: number, min: number): number {
    const rawValue = process.env[key];
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }
    return Math.max(min, Math.floor(parsedValue));
  }

  private getIntradayCursorService(): ChartIntradayCursorService | null {
    if (this.intradayCursorService) {
      return this.intradayCursorService;
    }
    if (this.intradayCursorServiceUnavailable) {
      return null;
    }

    const secret = String(
      process.env.CHART_INTRADAY_CURSOR_SECRET || "",
    ).trim();
    if (!secret) {
      this.intradayCursorServiceUnavailable = true;
      this.logger.warn("分时游标密钥未配置，已跳过分时领域事件广播");
      return null;
    }

    try {
      this.intradayCursorService = new ChartIntradayCursorService();
      return this.intradayCursorService;
    } catch (error) {
      this.intradayCursorServiceUnavailable = true;
      this.logger.warn("分时游标服务初始化失败，已跳过分时领域事件广播", {
        error: error?.message || String(error || ""),
      });
      return null;
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
    const totalDirect = this.broadcastStats.direct.calls;
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
        direct: { ...this.broadcastStats.direct },
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
    this.broadcastStats.direct.calls = 0;
    this.broadcastStats.direct.lastCall = null;
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
    this.upstreamToClients.clear();
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
      this.removeClientFromSubscriptionIndexes(
        clientId,
        symbol,
        clientSub.providerName,
        clientSub.wsCapabilityType,
      );
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

  private addClientToSubscriptionIndexes(
    clientId: string,
    symbol: string,
    providerName: string,
    wsCapabilityType: string,
  ): void {
    if (!this.symbolToClients.has(symbol)) {
      this.symbolToClients.set(symbol, new Set());
    }
    this.symbolToClients.get(symbol)!.add(clientId);

    const upstreamKey = this.buildUpstreamSubscriptionKey(
      providerName,
      wsCapabilityType,
      symbol,
    );
    if (!this.upstreamToClients.has(upstreamKey)) {
      this.upstreamToClients.set(upstreamKey, new Set());
    }
    this.upstreamToClients.get(upstreamKey)!.add(clientId);
  }

  private removeClientFromSubscriptionIndexes(
    clientId: string,
    symbol: string,
    providerName: string,
    wsCapabilityType: string,
  ): void {
    const symbolClients = this.symbolToClients.get(symbol);
    if (symbolClients) {
      symbolClients.delete(clientId);
      if (symbolClients.size === 0) {
        this.symbolToClients.delete(symbol);
      }
    }

    const upstreamKey = this.buildUpstreamSubscriptionKey(
      providerName,
      wsCapabilityType,
      symbol,
    );
    const upstreamClients = this.upstreamToClients.get(upstreamKey);
    if (upstreamClients) {
      upstreamClients.delete(clientId);
      if (upstreamClients.size === 0) {
        this.upstreamToClients.delete(upstreamKey);
      }
    }
  }

  private buildUpstreamSubscriptionKey(
    provider: string,
    capability: string,
    symbol: string,
  ): string {
    return `${String(provider || "").trim().toLowerCase()}:${String(capability || "").trim().toLowerCase()}:${String(symbol || "").trim().toUpperCase()}`;
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
