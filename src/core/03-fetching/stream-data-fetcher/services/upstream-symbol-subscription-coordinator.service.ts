import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { StreamClientStateManager } from "./stream-client-state-manager.service";
import { UPSTREAM_SUBSCRIPTION_DEFAULTS } from "../constants/upstream-subscription.constants";
import type {
  PendingUnsubscribeEntry,
  UpstreamAcquireParams,
  UpstreamReleaseParams,
} from "../interfaces/upstream-symbol-ref.interface";

@Injectable()
export class UpstreamSymbolSubscriptionCoordinatorService implements OnModuleDestroy {
  private readonly logger = createLogger(
    UpstreamSymbolSubscriptionCoordinatorService.name,
  );
  private readonly pendingUnsubscribes = new Map<string, PendingUnsubscribeEntry>();
  private readonly enabled = this.parseBoolean(
    process.env.UPSTREAM_SUBSCRIPTION_COORDINATOR_ENABLED,
    UPSTREAM_SUBSCRIPTION_DEFAULTS.ENABLED,
  );
  private readonly unsubscribeGraceMs = this.parseInteger(
    process.env.UPSTREAM_SUBSCRIPTION_UNSUBSCRIBE_GRACE_MS,
    UPSTREAM_SUBSCRIPTION_DEFAULTS.UNSUBSCRIBE_GRACE_MS,
    0,
  );

  constructor(
    private readonly clientStateManager: StreamClientStateManager,
  ) {}

  onModuleDestroy(): void {
    for (const entry of this.pendingUnsubscribes.values()) {
      clearTimeout(entry.timer);
    }
    this.pendingUnsubscribes.clear();
  }

  acquire(params: UpstreamAcquireParams): string[] {
    const normalizedSymbols = this.normalizeSymbols(params.symbols);
    if (!this.enabled || normalizedSymbols.length === 0) {
      return normalizedSymbols;
    }

    const upstreamSymbolsToSubscribe: string[] = [];
    for (const symbol of normalizedSymbols) {
      const symbolKey = this.buildSymbolKey(params.provider, params.capability, symbol);
      const currentRefCount = this.clientStateManager.getClientCountForSymbol(symbol);
      if (currentRefCount === 0) {
        upstreamSymbolsToSubscribe.push(symbol);
      }

      this.cancelPendingUnsubscribeByKey(symbolKey);
    }

    return upstreamSymbolsToSubscribe;
  }

  scheduleRelease(
    params: UpstreamReleaseParams,
    onReadyToUnsubscribe: (symbols: string[]) => Promise<void> | void,
  ): string[] {
    const normalizedSymbols = this.normalizeSymbols(params.symbols);
    if (!this.enabled || normalizedSymbols.length === 0) {
      return normalizedSymbols;
    }

    const immediateSymbols: string[] = [];
    for (const symbol of normalizedSymbols) {
      const currentRefCount = this.clientStateManager.getClientCountForSymbol(symbol);
      if (currentRefCount > 0) {
        continue;
      }

      if (this.unsubscribeGraceMs <= 0) {
        immediateSymbols.push(symbol);
        continue;
      }

      const symbolKey = this.buildSymbolKey(params.provider, params.capability, symbol);
      this.cancelPendingUnsubscribeByKey(symbolKey);
      const timer = setTimeout(async () => {
        try {
          if (this.clientStateManager.getClientCountForSymbol(symbol) > 0) {
            return;
          }
          await onReadyToUnsubscribe([symbol]);
        } finally {
          this.pendingUnsubscribes.delete(symbolKey);
        }
      }, this.unsubscribeGraceMs);

      this.pendingUnsubscribes.set(symbolKey, {
        symbolKey,
        provider: params.provider,
        capability: params.capability,
        symbol,
        timer,
        scheduledAt: Date.now(),
      });
    }

    return immediateSymbols;
  }

  cancelPendingUnsubscribe(
    provider: string,
    capability: string,
    symbols: string[],
  ): void {
    for (const symbol of this.normalizeSymbols(symbols)) {
      this.cancelPendingUnsubscribeByKey(
        this.buildSymbolKey(provider, capability, symbol),
      );
    }
  }

  private cancelPendingUnsubscribeByKey(symbolKey: string): void {
    const existing = this.pendingUnsubscribes.get(symbolKey);
    if (!existing) {
      return;
    }

    clearTimeout(existing.timer);
    this.pendingUnsubscribes.delete(symbolKey);
    this.logger.debug("取消待退订 symbol", { symbolKey });
  }

  private buildSymbolKey(provider: string, capability: string, symbol: string): string {
    return `${String(provider || "").trim().toLowerCase()}:${String(capability || "").trim().toLowerCase()}:${String(symbol || "").trim().toUpperCase()}`;
  }

  private normalizeSymbols(symbols: string[]): string[] {
    return Array.from(
      new Set(
        (symbols || [])
          .map((symbol) => String(symbol || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  private parseBoolean(rawValue: string | undefined, fallback: boolean): boolean {
    if (rawValue == null || rawValue.trim() === "") {
      return fallback;
    }
    return rawValue.trim().toLowerCase() !== "false";
  }

  private parseInteger(rawValue: string | undefined, fallback: number, min: number): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.floor(parsed));
  }
}
