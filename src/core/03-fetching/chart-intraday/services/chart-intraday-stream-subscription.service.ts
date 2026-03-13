import { Injectable, OnModuleDestroy } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { StreamReceiverService } from "@core/01-entry/stream-receiver/services/stream-receiver.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";

interface EnsureRealtimeSubscriptionParams {
  symbol: string;
  market: string;
  provider: string;
}

interface ReleaseRealtimeSubscriptionParams {
  symbol: string;
  market: string;
  provider: string;
}

interface InternalRealtimeLease {
  leaseKey: string;
  clientId: string;
  symbol: string;
  provider: string;
  wsCapabilityType: string;
  lastTouchedAt: number;
}

export interface ReleaseRealtimeSubscriptionResult {
  released: boolean;
  symbol: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
}

@Injectable()
export class ChartIntradayStreamSubscriptionService implements OnModuleDestroy {
  private readonly logger = createLogger(
    ChartIntradayStreamSubscriptionService.name,
  );

  private readonly leaseTtlMs = this.parseInteger(
    process.env.CHART_INTRADAY_STREAM_LEASE_TTL_MS,
    2 * 60 * 1000,
    15 * 1000,
  );
  private readonly cleanupIntervalMs = this.parseInteger(
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS,
    30 * 1000,
    5 * 1000,
  );
  private readonly leases = new Map<string, InternalRealtimeLease>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly streamReceiverService: StreamReceiverService,
    private readonly streamClientStateManager: StreamClientStateManager,
  ) {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredLeases();
    }, this.cleanupIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupTimer);

    const releaseJobs = Array.from(this.leases.values()).map((lease) =>
      this.releaseLease(lease, "module_destroy"),
    );
    this.leases.clear();

    await Promise.allSettled(releaseJobs);
  }

  async ensureRealtimeSubscription(
    params: EnsureRealtimeSubscriptionParams,
  ): Promise<void> {
    const normalizedSymbol = this.normalizeSymbol(params.symbol);
    const normalizedProvider = this.normalizeProvider(params.provider);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      params.market,
    );
    const leaseKey = this.buildLeaseKey(
      normalizedProvider,
      wsCapabilityType,
      normalizedSymbol,
    );
    const clientId = this.buildInternalClientId(
      normalizedProvider,
      wsCapabilityType,
      normalizedSymbol,
    );
    const now = Date.now();

    const existingLease = this.leases.get(leaseKey);
    if (existingLease) {
      existingLease.lastTouchedAt = now;
    } else {
      this.leases.set(leaseKey, {
        leaseKey,
        clientId,
        symbol: normalizedSymbol,
        provider: normalizedProvider,
        wsCapabilityType,
        lastTouchedAt: now,
      });
    }

    if (
      this.hasActiveSubscription(
        clientId,
        normalizedSymbol,
        normalizedProvider,
        wsCapabilityType,
      )
    ) {
      return;
    }

    await this.streamReceiverService.subscribeStream(
      {
        symbols: [normalizedSymbol],
        wsCapabilityType,
        preferredProvider: normalizedProvider,
      } as any,
      clientId,
      undefined,
      { connectionAuthenticated: true },
    );

    this.logger.log("分时实时订阅已确保", {
      symbol: normalizedSymbol,
      provider: normalizedProvider,
      wsCapabilityType,
      clientId,
    });
  }

  async releaseRealtimeSubscription(
    params: ReleaseRealtimeSubscriptionParams,
  ): Promise<ReleaseRealtimeSubscriptionResult> {
    const normalizedSymbol = this.normalizeSymbol(params.symbol);
    const normalizedProvider = this.normalizeProvider(params.provider);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      params.market,
    );
    const leaseKey = this.buildLeaseKey(
      normalizedProvider,
      wsCapabilityType,
      normalizedSymbol,
    );
    const clientId = this.buildInternalClientId(
      normalizedProvider,
      wsCapabilityType,
      normalizedSymbol,
    );
    const existingLease = this.leases.get(leaseKey);
    const hasActiveSubscription = this.hasActiveSubscription(
      clientId,
      normalizedSymbol,
      normalizedProvider,
      wsCapabilityType,
    );

    if (!existingLease && !hasActiveSubscription) {
      return {
        released: false,
        symbol: normalizedSymbol,
        provider: normalizedProvider,
        wsCapabilityType,
        clientId,
      };
    }

    this.leases.delete(leaseKey);
    await this.releaseLease(
      existingLease || {
        leaseKey,
        clientId,
        symbol: normalizedSymbol,
        provider: normalizedProvider,
        wsCapabilityType,
        lastTouchedAt: Date.now(),
      },
      "explicit_release",
    );

    return {
      released: true,
      symbol: normalizedSymbol,
      provider: normalizedProvider,
      wsCapabilityType,
      clientId,
    };
  }

  private hasActiveSubscription(
    clientId: string,
    symbol: string,
    provider: string,
    wsCapabilityType: string,
  ): boolean {
    const subscription =
      this.streamClientStateManager.getClientSubscription(clientId);
    if (!subscription) {
      return false;
    }

    return (
      subscription.providerName === provider &&
      subscription.wsCapabilityType === wsCapabilityType &&
      subscription.symbols.has(symbol)
    );
  }

  private async cleanupExpiredLeases(): Promise<void> {
    const now = Date.now();
    const expiredLeases = Array.from(this.leases.values()).filter(
      (lease) => now - lease.lastTouchedAt >= this.leaseTtlMs,
    );

    if (expiredLeases.length === 0) {
      return;
    }

    for (const lease of expiredLeases) {
      await this.releaseLease(lease, "lease_expired");
      this.leases.delete(lease.leaseKey);
    }
  }

  private async releaseLease(
    lease: InternalRealtimeLease,
    reason: "lease_expired" | "module_destroy" | "explicit_release",
  ): Promise<void> {
    try {
      await this.streamReceiverService.unsubscribeStream(
        {
          symbols: [lease.symbol],
          wsCapabilityType: lease.wsCapabilityType,
        } as any,
        lease.clientId,
      );
      this.logger.log("分时实时订阅已释放", {
        symbol: lease.symbol,
        provider: lease.provider,
        wsCapabilityType: lease.wsCapabilityType,
        clientId: lease.clientId,
        reason,
      });
    } catch (error: any) {
      this.logger.warn("分时实时订阅释放失败", {
        symbol: lease.symbol,
        provider: lease.provider,
        wsCapabilityType: lease.wsCapabilityType,
        clientId: lease.clientId,
        reason,
        error: error?.message,
      });
      if (reason === "explicit_release") {
        throw error;
      }
    }
  }

  private resolveRealtimeCapabilityByMarket(market: string): string {
    const normalizedMarket = String(market || "")
      .trim()
      .toUpperCase();
    switch (normalizedMarket) {
      case "CRYPTO":
        return CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE;
      case "US":
      case "HK":
      case "CN":
      case "SH":
      case "SZ":
        return CAPABILITY_NAMES.STREAM_STOCK_QUOTE;
      default:
        return CAPABILITY_NAMES.STREAM_STOCK_QUOTE;
    }
  }

  private buildLeaseKey(
    provider: string,
    wsCapabilityType: string,
    symbol: string,
  ): string {
    return `${provider}:${wsCapabilityType}:${symbol}`;
  }

  private buildInternalClientId(
    provider: string,
    wsCapabilityType: string,
    symbol: string,
  ): string {
    return `chart-intraday:auto:${provider}:${wsCapabilityType}:${symbol}`;
  }

  private normalizeSymbol(symbol: string): string {
    return String(symbol || "")
      .trim()
      .toUpperCase();
  }

  private normalizeProvider(provider: string): string {
    return String(provider || "")
      .trim()
      .toLowerCase();
  }

  private parseInteger(
    rawValue: string | undefined,
    fallback: number,
    min: number,
  ): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.floor(parsed));
  }
}
