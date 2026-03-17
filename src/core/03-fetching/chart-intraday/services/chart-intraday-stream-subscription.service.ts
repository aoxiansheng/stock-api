import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";

import { createLogger } from "@common/logging/index";
import { StreamReceiverService } from "@core/01-entry/stream-receiver/services/stream-receiver.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

import {
  ChartIntradaySessionService,
  type ChartIntradayOwnerContext,
  type ReleasedChartIntradaySessionRecord,
  type ChartIntradaySessionRecord,
  type ChartIntradayWsSessionContext,
} from "./chart-intraday-session.service";

interface UpstreamRealtimeParams {
  symbol: string;
  market: string;
  provider: string;
}

interface LocalRealtimeUpstreamState {
  upstreamKey: string;
  symbol: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
}

interface PendingLocalReleaseState {
  timer: NodeJS.Timeout;
  expiresAtMs: number;
}

export interface OpenRealtimeSessionParams
  extends UpstreamRealtimeParams,
    ChartIntradayOwnerContext {}

export interface OpenPassiveSessionParams
  extends UpstreamRealtimeParams,
    ChartIntradayOwnerContext {}

export interface TouchRealtimeOwnerLeaseParams
  extends UpstreamRealtimeParams,
    ChartIntradayOwnerContext {}

export interface ReleaseRealtimeOwnerLeaseParams
  extends ChartIntradayOwnerContext {
  symbol: string;
  market: string;
  provider?: string;
}

export interface TouchRealtimeSessionParams
  extends UpstreamRealtimeParams,
    ChartIntradayOwnerContext {
  sessionId: string;
}

export interface TouchPassiveSessionParams
  extends UpstreamRealtimeParams,
    ChartIntradayOwnerContext {
  sessionId: string;
}

export interface FindRealtimeOwnerLeaseParams extends ChartIntradayOwnerContext {
  symbol: string;
  market?: string;
  provider?: string;
}

export interface BindRealtimeSessionClientParams
  extends TouchRealtimeSessionParams {
  clientId: string;
}

export interface UnbindRealtimeClientSessionsParams {
  clientId: string;
  symbols: string[];
}

export interface RuntimeUpstreamParams extends UpstreamRealtimeParams {}

export interface OpenRealtimeSessionResult {
  sessionId: string;
  symbol: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
}

export interface TouchRealtimeSessionResult {
  sessionId: string;
  symbol: string;
  market: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
}

export interface ReleaseRealtimeSubscriptionResult {
  sessionReleased: boolean;
  upstreamReleased: boolean;
  reason: "RELEASED" | "ALREADY_RELEASED";
  symbol: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
  activeSessionCount: number;
  graceExpiresAt: string | null;
}

@Injectable()
export class ChartIntradayStreamSubscriptionService implements OnModuleDestroy {
  private readonly logger = createLogger(
    ChartIntradayStreamSubscriptionService.name,
  );
  private readonly instanceId = `chart-intraday-instance-${randomUUID()}`;

  private readonly sessionTtlMs = this.parseInteger(
    process.env.CHART_INTRADAY_SESSION_TTL_MS,
    2 * 60 * 1000,
    15 * 1000,
  );
  private readonly releaseGraceMs = this.parseInteger(
    process.env.CHART_INTRADAY_RELEASE_GRACE_MS,
    60 * 1000,
    0,
  );
  private readonly cleanupIntervalMs = this.parseInteger(
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS,
    30 * 1000,
    5 * 1000,
  );
  private readonly cleanupTimer: NodeJS.Timeout;
  private readonly localUpstreamSessionIds = new Map<string, Set<string>>();
  private readonly localUpstreamStates = new Map<
    string,
    LocalRealtimeUpstreamState
  >();
  private readonly localPendingReleases = new Map<
    string,
    PendingLocalReleaseState
  >();

  constructor(
    private readonly streamReceiverService: StreamReceiverService,
    private readonly streamClientStateManager: StreamClientStateManager,
    private readonly chartIntradaySessionService: ChartIntradaySessionService,
  ) {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, this.cleanupIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupTimer);
    this.clearAllLocalPendingReleases();

    const upstreams = Array.from(this.localUpstreamStates.values());
    this.localUpstreamSessionIds.clear();
    this.localUpstreamStates.clear();

    await Promise.allSettled(
      upstreams.map((upstream) =>
        this.unsubscribeUpstream(upstream, "module_destroy", false),
      ),
    );
  }

  async openRealtimeSession(
    params: OpenRealtimeSessionParams,
  ): Promise<OpenRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const clientId = this.buildInternalClientId(
      normalized.provider,
      wsCapabilityType,
      normalized.symbol,
    );

    const result = await this.chartIntradaySessionService.createSession({
      ...normalized,
      wsCapabilityType,
      clientId,
    });

    try {
      await this.retainLocalUpstreamSession(result.session, "snapshot");
      await this.claimRuntimeOwner(result.session);
    } catch (error) {
      const rollback = await this.chartIntradaySessionService.releaseSession({
        sessionId: result.session.sessionId,
        symbol: result.session.symbol,
        market: result.session.market,
        provider: result.session.provider,
        ownerIdentity: result.session.ownerIdentity,
      });
      if (rollback.activeSessionCount === 0) {
        await this.chartIntradaySessionService.deleteUpstream(
          rollback.upstream.upstreamKey,
        );
      }
      throw error;
    }

    return {
      sessionId: result.session.sessionId,
      symbol: result.session.symbol,
      provider: result.session.provider,
      wsCapabilityType,
      clientId,
    };
  }

  async openPassiveSession(
    params: OpenPassiveSessionParams,
  ): Promise<OpenRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const clientId = this.buildInternalClientId(
      normalized.provider,
      wsCapabilityType,
      normalized.symbol,
    );

    const result = await this.chartIntradaySessionService.createSession({
      ...normalized,
      wsCapabilityType,
      clientId,
    });
    this.addLocalUpstreamReference(result.session);
    await this.claimRuntimeOwner(result.session);

    return {
      sessionId: result.session.sessionId,
      symbol: result.session.symbol,
      provider: result.session.provider,
      wsCapabilityType,
      clientId,
    };
  }

  async openRealtimeOwnerLease(
    params: OpenRealtimeSessionParams,
  ): Promise<OpenRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const clientId = this.buildInternalClientId(
      normalized.provider,
      wsCapabilityType,
      normalized.symbol,
    );
    const result =
      await this.chartIntradaySessionService.getOrCreateSessionByOwnerLease({
        ...normalized,
        wsCapabilityType,
        clientId,
      });

    try {
      await this.retainLocalUpstreamSession(result.session, "snapshot");
      await this.claimRuntimeOwner(result.session);
    } catch (error) {
      if (result.leaseCreated) {
        const rollback = await this.chartIntradaySessionService.releaseSession({
          sessionId: result.session.sessionId,
          symbol: result.session.symbol,
          market: result.session.market,
          provider: result.session.provider,
          ownerIdentity: result.session.ownerIdentity,
        });
        if (rollback.activeSessionCount === 0) {
          await this.chartIntradaySessionService.deleteUpstream(
            rollback.upstream.upstreamKey,
          );
        }
      }
      throw error;
    }

    return {
      sessionId: result.session.sessionId,
      symbol: result.session.symbol,
      provider: result.session.provider,
      wsCapabilityType,
      clientId,
    };
  }

  async openPassiveOwnerLease(
    params: OpenPassiveSessionParams,
  ): Promise<OpenRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const clientId = this.buildInternalClientId(
      normalized.provider,
      wsCapabilityType,
      normalized.symbol,
    );
    const result =
      await this.chartIntradaySessionService.getOrCreateSessionByOwnerLease({
        ...normalized,
        wsCapabilityType,
        clientId,
      });
    this.addLocalUpstreamReference(result.session);
    await this.claimRuntimeOwner(result.session);

    return {
      sessionId: result.session.sessionId,
      symbol: result.session.symbol,
      provider: result.session.provider,
      wsCapabilityType,
      clientId,
    };
  }

  async touchRealtimeSession(
    params: TouchRealtimeSessionParams,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeTouchParams(params);
    const result = await this.chartIntradaySessionService.touchSession(normalized);
    await this.retainLocalUpstreamSession(result.session, "delta");
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  async touchPassiveSession(
    params: TouchPassiveSessionParams,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeTouchParams(params);
    const result = await this.chartIntradaySessionService.touchSession(normalized);
    this.addLocalUpstreamReference(result.session);
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  async touchRealtimeOwnerLease(
    params: TouchRealtimeOwnerLeaseParams,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const result =
      await this.chartIntradaySessionService.touchSessionByOwnerLease({
        ...normalized,
        wsCapabilityType: this.resolveRealtimeCapabilityByMarket(
          normalized.market,
        ),
        clientId: this.buildInternalClientId(
          normalized.provider,
          this.resolveRealtimeCapabilityByMarket(normalized.market),
          normalized.symbol,
        ),
        ownerIdentity: normalized.ownerIdentity,
      });
    await this.retainLocalUpstreamSession(result.session, "delta");
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  async touchPassiveOwnerLease(
    params: TouchRealtimeOwnerLeaseParams,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const result =
      await this.chartIntradaySessionService.touchSessionByOwnerLease({
        ...normalized,
        wsCapabilityType,
        clientId: this.buildInternalClientId(
          normalized.provider,
          wsCapabilityType,
          normalized.symbol,
        ),
        ownerIdentity: normalized.ownerIdentity,
      });
    this.addLocalUpstreamReference(result.session);
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  async bindRealtimeClientToSession(
    params: BindRealtimeSessionClientParams,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeTouchParams(params);
    const result = await this.chartIntradaySessionService.bindClientToSession({
      ...normalized,
      clientId: params.clientId,
    });
    await this.retainLocalUpstreamSession(result.session, "delta");
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  async pauseRealtimeUpstream(params: RuntimeUpstreamParams): Promise<boolean> {
    const normalized = this.normalizeRealtimeParams(params);
    const upstreamKey = this.buildUpstreamKey({
      provider: normalized.provider,
      wsCapabilityType: this.resolveRealtimeCapabilityByMarket(
        normalized.market,
      ),
      symbol: normalized.symbol,
    });
    const upstream = this.localUpstreamStates.get(upstreamKey);
    if (!upstream) {
      return false;
    }

    this.clearLocalPendingRelease(upstreamKey);
    const released = await this.pauseLocalUpstream(upstream);
    if (released) {
      await this.chartIntradaySessionService.markUpstreamReleased(upstreamKey);
    }
    return released;
  }

  async resumeRealtimeUpstream(params: RuntimeUpstreamParams): Promise<boolean> {
    const normalized = this.normalizeRealtimeParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const upstreamKey = this.buildUpstreamKey({
      provider: normalized.provider,
      wsCapabilityType,
      symbol: normalized.symbol,
    });
    const activeSessionCount =
      await this.chartIntradaySessionService.getUpstreamActiveSessionCount(
        upstreamKey,
      );
    if (activeSessionCount <= 0) {
      return false;
    }

    const upstream =
      this.localUpstreamStates.get(upstreamKey) || {
        upstreamKey,
        symbol: normalized.symbol,
        provider: normalized.provider,
        wsCapabilityType,
        clientId: this.buildInternalClientId(
          normalized.provider,
          wsCapabilityType,
          normalized.symbol,
        ),
      };
    this.localUpstreamStates.set(upstreamKey, upstream);
    this.clearLocalPendingRelease(upstreamKey);

    if (
      this.hasActiveSubscription(
        upstream.clientId,
        upstream.symbol,
        upstream.provider,
        upstream.wsCapabilityType,
      )
    ) {
      await this.chartIntradaySessionService.clearUpstreamReleaseState(
        upstreamKey,
      );
      return true;
    }

    await this.streamReceiverService.subscribeStream(
      {
        symbols: [upstream.symbol],
        wsCapabilityType: upstream.wsCapabilityType,
        preferredProvider: upstream.provider,
      } as any,
      upstream.clientId,
      undefined,
      { connectionAuthenticated: true },
    );
    await this.chartIntradaySessionService.clearUpstreamReleaseState(
      upstreamKey,
    );
    this.logger.log("分时实时订阅已恢复", {
      symbol: upstream.symbol,
      provider: upstream.provider,
      wsCapabilityType: upstream.wsCapabilityType,
      clientId: upstream.clientId,
      instanceId: this.instanceId,
    });
    return true;
  }

  touchRealtimeSessionsForClient(clientId: string): number {
    return this.chartIntradaySessionService.touchBoundSessions(clientId);
  }

  unbindRealtimeClient(clientId: string): void {
    this.chartIntradaySessionService.unbindClient(clientId);
  }

  async unbindRealtimeClientSessions(
    params: UnbindRealtimeClientSessionsParams,
  ): Promise<number> {
    const normalizedSymbols = params.symbols
      .map((symbol) => String(symbol || "").trim().toUpperCase())
      .filter(Boolean);

    return this.chartIntradaySessionService.unbindClientSessions({
      clientId: params.clientId,
      symbols: normalizedSymbols,
    });
  }

  async releaseRealtimeSubscription(
    params: TouchRealtimeSessionParams,
  ): Promise<ReleaseRealtimeSubscriptionResult> {
    const normalized = this.normalizeTouchParams(params);
    const result = await this.chartIntradaySessionService.releaseSession(
      normalized,
    );
    if (result.releaseState === "already_released") {
      return this.buildAlreadyReleasedResult(
        result.releasedSession,
        result.activeSessionCount,
      );
    }

    const localRelease = await this.releaseLocalUpstreamReference(
      result.releasedSession,
      "explicit_release",
    );
    await this.syncSharedUpstreamReleaseState(
      result.releasedSession.upstreamKey,
      result.activeSessionCount,
      localRelease,
    );
    if (result.activeSessionCount === 0) {
      await this.chartIntradaySessionService.deleteUpstream(
        result.releasedSession.upstreamKey,
      );
    }

    return {
      sessionReleased: true,
      upstreamReleased: localRelease.upstreamReleased,
      reason: "RELEASED",
      symbol: result.releasedSession.symbol,
      provider: result.releasedSession.provider,
      wsCapabilityType: result.releasedSession.wsCapabilityType,
      clientId: result.releasedSession.clientId,
      activeSessionCount: result.activeSessionCount,
      graceExpiresAt: localRelease.graceExpiresAt,
    };
  }

  async releaseRealtimeOwnerLease(
    params: ReleaseRealtimeOwnerLeaseParams,
  ): Promise<ReleaseRealtimeSubscriptionResult> {
    const normalized = this.normalizeReleaseOwnerLeaseParams(params);
    const wsCapabilityType = this.resolveRealtimeCapabilityByMarket(
      normalized.market,
    );
    const releaseProvider = normalized.provider
      ? normalized.provider
      : await this.resolveUniqueOwnerLeaseProvider({
          ownerIdentity: normalized.ownerIdentity,
          symbol: normalized.symbol,
          market: normalized.market,
        });
    if (!releaseProvider) {
      return this.buildAlreadyReleasedOwnerLeaseResult({
        symbol: normalized.symbol,
        provider: "",
        wsCapabilityType,
        clientId: "",
      });
    }

    const upstreamKey = this.buildUpstreamKey({
      provider: releaseProvider,
      wsCapabilityType,
      symbol: normalized.symbol,
    });
    const matchedSessions =
      await this.chartIntradaySessionService.listOwnerSymbolSessions({
        ownerIdentity: normalized.ownerIdentity,
        symbol: normalized.symbol,
        market: normalized.market,
        provider: releaseProvider,
      });
    const leaseSession =
      await this.chartIntradaySessionService.getSessionByOwnerLease({
        ownerIdentity: normalized.ownerIdentity,
        upstreamKey,
      });
    if (!leaseSession && matchedSessions.length > 1) {
      throw new Error("OWNER_LEASE_AMBIGUOUS");
    }

    const releasableSession = leaseSession || matchedSessions[0] || null;
    if (!releasableSession) {
      return this.buildAlreadyReleasedOwnerLeaseResult({
        symbol: normalized.symbol,
        provider: releaseProvider,
        wsCapabilityType,
        clientId: this.buildInternalClientId(
          releaseProvider,
          wsCapabilityType,
          normalized.symbol,
        ),
        upstreamKey,
      });
    }

    return this.releaseRealtimeSubscription({
      sessionId: releasableSession.sessionId,
      symbol: releasableSession.symbol,
      market: releasableSession.market,
      provider: releasableSession.provider,
      ownerIdentity: normalized.ownerIdentity,
    });
  }

  async findRealtimeOwnerLease(
    params: FindRealtimeOwnerLeaseParams,
  ): Promise<TouchRealtimeSessionResult | null> {
    const normalized = this.normalizeLookupRealtimeParams({
      ...params,
      market: params.market || "",
      provider: params.provider || "",
    });
    const session = await this.chartIntradaySessionService.findOwnerSymbolSession({
      ownerIdentity: normalized.ownerIdentity,
      symbol: normalized.symbol,
      market: normalized.market,
      provider: normalized.provider,
    });
    if (!session) {
      return null;
    }

    return this.buildTouchResult(session);
  }

  async validateWsSessionBinding(
    params: ChartIntradayWsSessionContext,
  ): Promise<TouchRealtimeSessionResult> {
    const normalized = this.normalizeTouchParams({
      ...params,
      market: params.market,
      provider: params.provider,
    });
    const result = await this.chartIntradaySessionService.touchSession({
      ...normalized,
    });
    await this.retainLocalUpstreamSession(result.session, "delta");
    await this.claimRuntimeOwner(result.session);

    return this.buildTouchResult(result.session);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const expiredResult = await this.chartIntradaySessionService.expireSessions(
      this.sessionTtlMs,
    );
    const expiredUpstreamKeys = new Set<string>();
    let directReleasedUpstreamCount = 0;
    let directScheduledReleaseCount = 0;

    for (const session of expiredResult.expiredSessions) {
      this.localUpstreamStates.set(session.upstreamKey, {
        upstreamKey: session.upstreamKey,
        symbol: session.symbol,
        provider: session.provider,
        wsCapabilityType: session.wsCapabilityType,
        clientId: session.clientId,
      });
      this.dropLocalUpstreamReference(session.upstreamKey, session.sessionId);
      expiredUpstreamKeys.add(session.upstreamKey);
    }
    await Promise.allSettled(
      expiredResult.idleUpstreamKeys.map((upstreamKey) =>
        this.chartIntradaySessionService.deleteUpstream(upstreamKey),
      ),
    );
    for (const upstreamKey of expiredUpstreamKeys) {
      const result = await this.scheduleOrReleaseLocalUpstream(
        upstreamKey,
        "session_expired",
      );
      if (result.upstreamReleased) {
        directReleasedUpstreamCount += 1;
      } else if (result.graceExpiresAt) {
        directScheduledReleaseCount += 1;
      }
    }

    const reconciled = await this.reconcileLocalUpstreams(
      "session_expired",
      expiredUpstreamKeys,
    );
    if (
      expiredResult.expiredSessions.length === 0 &&
      reconciled.prunedSessionCount === 0 &&
      reconciled.releasedUpstreamCount + directReleasedUpstreamCount === 0 &&
      reconciled.scheduledReleaseCount + directScheduledReleaseCount === 0
    ) {
      return;
    }

    this.logger.log("分时会话清理完成", {
      expiredSessionCount: expiredResult.expiredSessions.length,
      prunedSessionCount: reconciled.prunedSessionCount,
      releasedUpstreamCount:
        reconciled.releasedUpstreamCount + directReleasedUpstreamCount,
      scheduledReleaseCount:
        reconciled.scheduledReleaseCount + directScheduledReleaseCount,
    });
  }

  private async retainLocalUpstreamSession(
    session: ChartIntradaySessionRecord,
    operation: "snapshot" | "delta",
  ): Promise<void> {
    this.addLocalUpstreamReference(session);
    if (
      this.hasActiveSubscription(
        session.clientId,
        session.symbol,
        session.provider,
        session.wsCapabilityType,
      )
    ) {
      return;
    }

    try {
      await this.streamReceiverService.subscribeStream(
        {
          symbols: [session.symbol],
          wsCapabilityType: session.wsCapabilityType,
          preferredProvider: session.provider,
        } as any,
        session.clientId,
        undefined,
        { connectionAuthenticated: true },
      );
      this.logger.log("分时实时订阅已确保", {
        symbol: session.symbol,
        provider: session.provider,
        wsCapabilityType: session.wsCapabilityType,
        clientId: session.clientId,
        operation,
        instanceId: this.instanceId,
      });
    } catch (error: any) {
      this.dropLocalUpstreamReference(session.upstreamKey, session.sessionId);
      this.cleanupLocalUpstreamStateIfUnused(session.upstreamKey);
      this.logger.warn("分时实时订阅确保失败", {
        symbol: session.symbol,
        provider: session.provider,
        wsCapabilityType: session.wsCapabilityType,
        clientId: session.clientId,
        operation,
        instanceId: this.instanceId,
        error: error?.message,
      });
      throw error;
    }
  }

  private async claimRuntimeOwner(
    session: ChartIntradaySessionRecord,
  ): Promise<void> {
    try {
      const claimed = await this.chartIntradaySessionService.claimRuntimeOwner({
        sessionId: session.sessionId,
        runtimeOwnerId: this.instanceId,
      });
      if (!claimed) {
        throw new Error("SESSION_NOT_FOUND");
      }
    } catch (error) {
      await this.releaseLocalUpstreamReference(session, "explicit_release");
      throw error;
    }
  }

  private async releaseLocalUpstreamReference(
    session: ChartIntradaySessionRecord,
    reason: "explicit_release" | "session_expired",
  ): Promise<{ upstreamReleased: boolean; graceExpiresAt: string | null }> {
    this.dropLocalUpstreamReference(session.upstreamKey, session.sessionId);

    if (this.hasLocalSessionReferences(session.upstreamKey)) {
      return {
        upstreamReleased: false,
        graceExpiresAt: null,
      };
    }

    return this.scheduleOrReleaseLocalUpstream(session.upstreamKey, reason);
  }

  private async scheduleOrReleaseLocalUpstream(
    upstreamKey: string,
    reason: "explicit_release" | "session_expired",
  ): Promise<{ upstreamReleased: boolean; graceExpiresAt: string | null }> {
    const upstream = this.localUpstreamStates.get(upstreamKey);
    if (!upstream) {
      return {
        upstreamReleased: false,
        graceExpiresAt: null,
      };
    }

    if (
      !this.hasActiveSubscription(
        upstream.clientId,
        upstream.symbol,
        upstream.provider,
        upstream.wsCapabilityType,
      )
    ) {
      this.cleanupLocalUpstreamState(upstreamKey);
      return {
        upstreamReleased: false,
        graceExpiresAt: null,
      };
    }

    if (this.releaseGraceMs <= 0) {
      return {
        upstreamReleased: await this.unsubscribeLocalUpstreamIfIdle(
          upstreamKey,
          reason,
          false,
        ),
        graceExpiresAt: null,
      };
    }

    const scheduled = this.scheduleLocalPendingRelease(
      upstreamKey,
      reason === "explicit_release" ? "grace_expired" : "session_expired",
    );
    return {
      upstreamReleased: false,
      graceExpiresAt: scheduled,
    };
  }

  private async reconcileLocalUpstreams(
    reason: "session_expired",
    skipUpstreamKeys: Set<string> = new Set<string>(),
  ): Promise<{
    prunedSessionCount: number;
    releasedUpstreamCount: number;
    scheduledReleaseCount: number;
  }> {
    let prunedSessionCount = 0;
    let releasedUpstreamCount = 0;
    let scheduledReleaseCount = 0;

    for (const upstreamKey of this.localUpstreamStates.keys()) {
      if (skipUpstreamKeys.has(upstreamKey)) {
        continue;
      }
      const sessionIds =
        this.localUpstreamSessionIds.get(upstreamKey) || new Set<string>();
      for (const sessionId of Array.from(sessionIds)) {
        const session = await this.chartIntradaySessionService.getSession(sessionId);
        if (!session || this.isSessionOwnedByAnotherInstance(session)) {
          sessionIds.delete(sessionId);
          prunedSessionCount += 1;
        }
      }

      if (sessionIds.size > 0) {
        continue;
      }

      const result = await this.scheduleOrReleaseLocalUpstream(upstreamKey, reason);
      if (result.upstreamReleased) {
        releasedUpstreamCount += 1;
        continue;
      }
      if (result.graceExpiresAt) {
        scheduledReleaseCount += 1;
      }
    }

    return {
      prunedSessionCount,
      releasedUpstreamCount,
      scheduledReleaseCount,
    };
  }

  private scheduleLocalPendingRelease(
    upstreamKey: string,
    reason: "grace_expired" | "session_expired",
  ): string | null {
    const existing = this.localPendingReleases.get(upstreamKey);
    if (existing) {
      return new Date(existing.expiresAtMs).toISOString();
    }

    const upstream = this.localUpstreamStates.get(upstreamKey);
    if (!upstream) {
      return null;
    }

    const expiresAtMs = Date.now() + this.releaseGraceMs;
    const timer = setTimeout(() => {
      void this.handleLocalPendingRelease(upstreamKey, expiresAtMs, reason);
    }, this.releaseGraceMs);
    this.localPendingReleases.set(upstreamKey, {
      timer,
      expiresAtMs,
    });
    const graceExpiresAt = new Date(expiresAtMs).toISOString();
    void this.chartIntradaySessionService.markUpstreamReleaseScheduled(
      upstreamKey,
      graceExpiresAt,
    );
    return graceExpiresAt;
  }

  private async handleLocalPendingRelease(
    upstreamKey: string,
    expectedExpiresAtMs: number,
    reason: "grace_expired" | "session_expired",
  ): Promise<void> {
    const pending = this.localPendingReleases.get(upstreamKey);
    if (!pending || pending.expiresAtMs !== expectedExpiresAtMs) {
      return;
    }

    try {
      await this.unsubscribeLocalUpstreamIfIdle(upstreamKey, reason, false);
    } finally {
      const latest = this.localPendingReleases.get(upstreamKey);
      if (latest?.expiresAtMs === expectedExpiresAtMs) {
        clearTimeout(latest.timer);
        this.localPendingReleases.delete(upstreamKey);
      }
    }
  }

  private clearLocalPendingRelease(upstreamKey: string): void {
    const pending = this.localPendingReleases.get(upstreamKey);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    this.localPendingReleases.delete(upstreamKey);
  }

  private clearAllLocalPendingReleases(): void {
    for (const pending of this.localPendingReleases.values()) {
      clearTimeout(pending.timer);
    }
    this.localPendingReleases.clear();
  }

  private async unsubscribeLocalUpstreamIfIdle(
    upstreamKey: string,
    reason:
      | "explicit_release"
      | "grace_expired"
      | "session_expired"
      | "module_destroy",
    throwOnError: boolean,
  ): Promise<boolean> {
    if (this.hasLocalSessionReferences(upstreamKey)) {
      return false;
    }

    const upstream = this.localUpstreamStates.get(upstreamKey);
    if (!upstream) {
      return false;
    }

    this.clearLocalPendingRelease(upstreamKey);

    if (
      !this.hasActiveSubscription(
        upstream.clientId,
        upstream.symbol,
        upstream.provider,
        upstream.wsCapabilityType,
      )
    ) {
      this.cleanupLocalUpstreamState(upstreamKey);
      return false;
    }

    const unsubscribed = await this.unsubscribeUpstream(
      upstream,
      reason,
      throwOnError,
    );
    if (unsubscribed) {
      this.cleanupLocalUpstreamState(upstreamKey);
      await this.chartIntradaySessionService.markUpstreamReleased(upstreamKey);
    }
    return unsubscribed;
  }

  private async unsubscribeUpstream(
    upstream: {
      symbol: string;
      provider: string;
      wsCapabilityType: string;
      clientId: string;
    },
    reason:
      | "explicit_release"
      | "grace_expired"
      | "session_expired"
      | "module_destroy"
      | "runtime_pause",
    throwOnError: boolean,
  ): Promise<boolean> {
    try {
      await this.streamReceiverService.unsubscribeStream(
        {
          symbols: [upstream.symbol],
          wsCapabilityType: upstream.wsCapabilityType,
        } as any,
        upstream.clientId,
      );
      this.logger.log("分时实时订阅已释放", {
        symbol: upstream.symbol,
        provider: upstream.provider,
        wsCapabilityType: upstream.wsCapabilityType,
        clientId: upstream.clientId,
        reason,
        instanceId: this.instanceId,
      });
      return true;
    } catch (error: any) {
      this.logger.warn("分时实时订阅释放失败", {
        symbol: upstream.symbol,
        provider: upstream.provider,
        wsCapabilityType: upstream.wsCapabilityType,
        clientId: upstream.clientId,
        reason,
        instanceId: this.instanceId,
        error: error?.message,
      });
      if (throwOnError) {
        throw error;
      }
      return false;
    }
  }

  private async pauseLocalUpstream(upstream: {
    symbol: string;
    provider: string;
    wsCapabilityType: string;
    clientId: string;
  }): Promise<boolean> {
    if (
      !this.hasActiveSubscription(
        upstream.clientId,
        upstream.symbol,
        upstream.provider,
        upstream.wsCapabilityType,
      )
    ) {
      return false;
    }

    return this.unsubscribeUpstream(upstream, "runtime_pause", true);
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

  private addLocalUpstreamReference(session: ChartIntradaySessionRecord): void {
    let sessionIds = this.localUpstreamSessionIds.get(session.upstreamKey);
    if (!sessionIds) {
      sessionIds = new Set<string>();
      this.localUpstreamSessionIds.set(session.upstreamKey, sessionIds);
    }
    sessionIds.add(session.sessionId);
    this.localUpstreamStates.set(session.upstreamKey, {
      upstreamKey: session.upstreamKey,
      symbol: session.symbol,
      provider: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      clientId: session.clientId,
    });
    this.clearLocalPendingRelease(session.upstreamKey);
  }

  private dropLocalUpstreamReference(
    upstreamKey: string,
    sessionId: string,
  ): void {
    const sessionIds = this.localUpstreamSessionIds.get(upstreamKey);
    if (!sessionIds) {
      return;
    }

    sessionIds.delete(sessionId);
    if (sessionIds.size === 0) {
      this.localUpstreamSessionIds.delete(upstreamKey);
    }
  }

  private cleanupLocalUpstreamStateIfUnused(upstreamKey: string): void {
    if (this.hasLocalSessionReferences(upstreamKey)) {
      return;
    }
    const upstream = this.localUpstreamStates.get(upstreamKey);
    if (!upstream) {
      return;
    }
    if (
      this.hasActiveSubscription(
        upstream.clientId,
        upstream.symbol,
        upstream.provider,
        upstream.wsCapabilityType,
      )
    ) {
      return;
    }
    this.cleanupLocalUpstreamState(upstreamKey);
  }

  private cleanupLocalUpstreamState(upstreamKey: string): void {
    this.clearLocalPendingRelease(upstreamKey);
    this.localUpstreamSessionIds.delete(upstreamKey);
    this.localUpstreamStates.delete(upstreamKey);
  }

  private hasLocalSessionReferences(upstreamKey: string): boolean {
    return (this.localUpstreamSessionIds.get(upstreamKey)?.size || 0) > 0;
  }

  private isSessionOwnedByAnotherInstance(
    session: ChartIntradaySessionRecord,
  ): boolean {
    return !!session.runtimeOwnerId && session.runtimeOwnerId !== this.instanceId;
  }

  private buildTouchResult(
    session: ChartIntradaySessionRecord,
  ): TouchRealtimeSessionResult {
    return {
      sessionId: session.sessionId,
      symbol: session.symbol,
      market: session.market,
      provider: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      clientId: session.clientId,
    };
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

  private buildInternalClientId(
    provider: string,
    wsCapabilityType: string,
    symbol: string,
  ): string {
    return `chart-intraday:auto:${provider}:${wsCapabilityType}:${symbol}`;
  }

  private buildUpstreamKey(params: {
    provider: string;
    wsCapabilityType: string;
    symbol: string;
  }): string {
    return `${params.provider}:${params.wsCapabilityType}:${params.symbol}`;
  }

  private async buildAlreadyReleasedResult(
    session: ReleasedChartIntradaySessionRecord,
    activeSessionCount: number,
  ): Promise<ReleaseRealtimeSubscriptionResult> {
    let upstreamReleased = false;
    let graceExpiresAt: string | null = null;

    if (activeSessionCount === 0) {
      const sharedState =
        await this.chartIntradaySessionService.getUpstreamReleaseState(
          session.upstreamKey,
        );
      if (sharedState?.state === "released") {
        upstreamReleased = true;
      } else if (sharedState?.state === "scheduled") {
        graceExpiresAt = sharedState.graceExpiresAt;
      }
    }

    return {
      sessionReleased: false,
      upstreamReleased,
      reason: "ALREADY_RELEASED",
      symbol: session.symbol,
      provider: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      clientId: session.clientId,
      activeSessionCount,
      graceExpiresAt,
    };
  }

  private async buildAlreadyReleasedOwnerLeaseResult(params: {
    symbol: string;
    provider: string;
    wsCapabilityType: string;
    clientId: string;
    upstreamKey?: string;
  }): Promise<ReleaseRealtimeSubscriptionResult> {
    const normalizedUpstreamKey = String(params.upstreamKey || "").trim();
    const activeSessionCount = normalizedUpstreamKey
      ? await this.chartIntradaySessionService.getUpstreamActiveSessionCount(
          normalizedUpstreamKey,
        )
      : 0;
    let upstreamReleased = false;
    let graceExpiresAt: string | null = null;

    if (activeSessionCount === 0 && normalizedUpstreamKey) {
      const sharedState =
        await this.chartIntradaySessionService.getUpstreamReleaseState(
          normalizedUpstreamKey,
        );
      if (sharedState?.state === "released") {
        upstreamReleased = true;
      } else if (sharedState?.state === "scheduled") {
        graceExpiresAt = sharedState.graceExpiresAt;
      }
    }

    return {
      sessionReleased: false,
      upstreamReleased,
      reason: "ALREADY_RELEASED",
      symbol: params.symbol,
      provider: params.provider,
      wsCapabilityType: params.wsCapabilityType,
      clientId: params.clientId,
      activeSessionCount,
      graceExpiresAt,
    };
  }

  private async syncSharedUpstreamReleaseState(
    upstreamKey: string,
    activeSessionCount: number,
    localRelease: { upstreamReleased: boolean; graceExpiresAt: string | null },
  ): Promise<void> {
    if (activeSessionCount > 0) {
      await this.chartIntradaySessionService.clearUpstreamReleaseState(
        upstreamKey,
      );
      return;
    }

    if (localRelease.upstreamReleased) {
      await this.chartIntradaySessionService.markUpstreamReleased(upstreamKey);
      return;
    }

    if (localRelease.graceExpiresAt) {
      await this.chartIntradaySessionService.markUpstreamReleaseScheduled(
        upstreamKey,
        localRelease.graceExpiresAt,
      );
      return;
    }

    const sharedState =
      await this.chartIntradaySessionService.getUpstreamReleaseState(upstreamKey);
    if (sharedState?.state === "released") {
      return;
    }

    await this.chartIntradaySessionService.clearUpstreamReleaseState(
      upstreamKey,
    );
  }

  private async resolveUniqueOwnerLeaseProvider(params: {
    ownerIdentity: string;
    symbol: string;
    market: string;
  }): Promise<string | null> {
    const sessions = await this.chartIntradaySessionService.listOwnerSymbolSessions({
      ownerIdentity: params.ownerIdentity,
      symbol: params.symbol,
      market: params.market,
    });
    if (sessions.length === 0) {
      return null;
    }

    const matchedProviders = Array.from(
      new Set(
        sessions.map((session) =>
          String(session.provider || "")
            .trim()
            .toLowerCase(),
        ),
      ),
    ).filter((provider) => !!provider);

    if (matchedProviders.length !== 1) {
      throw new Error("OWNER_LEASE_AMBIGUOUS");
    }

    return matchedProviders[0] || null;
  }

  private normalizeRealtimeParams<T extends UpstreamRealtimeParams>(
    params: T,
  ): T {
    return {
      ...params,
      symbol: String(params.symbol || "")
        .trim()
        .toUpperCase(),
      market: String(params.market || "")
        .trim()
        .toUpperCase(),
      provider: String(params.provider || "")
        .trim()
        .toLowerCase(),
    };
  }

  private normalizeLookupRealtimeParams(
    params: FindRealtimeOwnerLeaseParams,
  ): FindRealtimeOwnerLeaseParams {
    return {
      ownerIdentity: String(params.ownerIdentity || "").trim(),
      symbol: String(params.symbol || "")
        .trim()
        .toUpperCase(),
      market: String(params.market || "")
        .trim()
        .toUpperCase(),
      provider: String(params.provider || "")
        .trim()
        .toLowerCase(),
    };
  }

  private normalizeReleaseOwnerLeaseParams(
    params: ReleaseRealtimeOwnerLeaseParams,
  ): ReleaseRealtimeOwnerLeaseParams {
    return {
      ownerIdentity: String(params.ownerIdentity || "").trim(),
      symbol: String(params.symbol || "")
        .trim()
        .toUpperCase(),
      market: String(params.market || "")
        .trim()
        .toUpperCase(),
      provider: String(params.provider || "")
        .trim()
        .toLowerCase(),
    };
  }

  private normalizeTouchParams(
    params: TouchRealtimeSessionParams | ChartIntradayWsSessionContext,
  ): TouchRealtimeSessionParams {
    const normalizedBase = this.normalizeRealtimeParams({
      symbol: params.symbol,
      market: params.market || "",
      provider: params.provider || "",
    });

    return {
      sessionId: String(params.sessionId || "").trim(),
      symbol: normalizedBase.symbol,
      market: normalizedBase.market,
      provider: normalizedBase.provider,
      ownerIdentity: String(params.ownerIdentity || "").trim(),
    };
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
