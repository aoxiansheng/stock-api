import { Injectable, OnModuleDestroy } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { BasicCacheService } from "@core/05-caching/module/basic-cache";
import { MarketStatus } from "@core/shared/constants/market.constants";

import {
  ChartIntradaySessionPolicyService,
  type ChartIntradayRuntimeDecision,
} from "./chart-intraday-session-policy.service";
import { ChartIntradaySessionService } from "./chart-intraday-session.service";
import {
  ChartIntradayStreamSubscriptionService,
  type OpenRealtimeSessionResult,
  type TouchRealtimeSessionResult,
} from "./chart-intraday-stream-subscription.service";

type ChartIntradaySessionEnvelope =
  | OpenRealtimeSessionResult
  | TouchRealtimeSessionResult;

interface ResumeTicketRecord {
  upstreamKey: string;
  symbol: string;
  market: string;
  provider: string;
  tradingDay: string;
  nextSessionStart: string;
  createdAt: string;
}

@Injectable()
export class ChartIntradayRuntimeOrchestratorService implements OnModuleDestroy {
  private static readonly RESUME_TICKET_KEY_PREFIX =
    "chart-intraday:resume-ticket:v1:";

  private readonly logger = createLogger(
    ChartIntradayRuntimeOrchestratorService.name,
  );
  private readonly resumeBufferSeconds = this.parseInteger(
    process.env.CHART_INTRADAY_RESUME_BUFFER_SECONDS,
    30 * 60,
    60,
  );
  private readonly localResumeTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly chartIntradaySessionPolicyService: ChartIntradaySessionPolicyService,
    private readonly chartIntradayStreamSubscriptionService: ChartIntradayStreamSubscriptionService,
    private readonly chartIntradaySessionService: ChartIntradaySessionService,
    private readonly basicCacheService: BasicCacheService,
  ) {}

  onModuleDestroy(): void {
    for (const timer of this.localResumeTimers.values()) {
      clearTimeout(timer);
    }
    this.localResumeTimers.clear();
  }

  async decideRuntime(params: {
    market: string;
    tradingDay: string;
  }): Promise<ChartIntradayRuntimeDecision> {
    return this.chartIntradaySessionPolicyService.decide(params);
  }

  async openSnapshotSession(params: {
    symbol: string;
    market: string;
    provider: string;
    ownerIdentity: string;
    tradingDay: string;
    decision: ChartIntradayRuntimeDecision;
  }): Promise<OpenRealtimeSessionResult> {
    if (params.decision.mode === "live") {
      const session =
        await this.chartIntradayStreamSubscriptionService.openRealtimeOwnerLease(
          {
          symbol: params.symbol,
          market: params.market,
          provider: params.provider,
          ownerIdentity: params.ownerIdentity,
          },
        );
      await this.clearResumeTicketByContext(params);
      return session;
    }

    const session =
      await this.chartIntradayStreamSubscriptionService.openPassiveOwnerLease({
        symbol: params.symbol,
        market: params.market,
        provider: params.provider,
        ownerIdentity: params.ownerIdentity,
      });
    await this.applyNonLiveRuntime(params, session);
    return session;
  }

  async touchDeltaSession(params: {
    symbol: string;
    market: string;
    provider: string;
    ownerIdentity: string;
    tradingDay: string;
    decision: ChartIntradayRuntimeDecision;
  }): Promise<TouchRealtimeSessionResult> {
    if (params.decision.mode === "live") {
      const session =
        await this.chartIntradayStreamSubscriptionService.touchRealtimeOwnerLease(
          {
            symbol: params.symbol,
            market: params.market,
            provider: params.provider,
            ownerIdentity: params.ownerIdentity,
          },
        );
      await this.clearResumeTicketByContext(params);
      return session;
    }

    const session =
      await this.chartIntradayStreamSubscriptionService.touchPassiveOwnerLease({
        symbol: params.symbol,
        market: params.market,
        provider: params.provider,
        ownerIdentity: params.ownerIdentity,
      });
    await this.applyNonLiveRuntime(params, session);
    return session;
  }

  async handleRelease(params: {
    symbol: string;
    market: string;
    provider: string;
    activeSessionCount: number;
  }): Promise<void> {
    if (params.activeSessionCount > 0) {
      return;
    }

    await this.clearResumeTicketByContext(params);
  }

  private async applyNonLiveRuntime(
    params: {
      symbol: string;
      market: string;
      provider: string;
      tradingDay: string;
      decision: ChartIntradayRuntimeDecision;
    },
    session: ChartIntradaySessionEnvelope,
  ): Promise<void> {
    await this.chartIntradayStreamSubscriptionService.pauseRealtimeUpstream({
      symbol: session.symbol,
      market: params.market,
      provider: params.provider,
    });

    if (params.decision.mode === "paused" && params.decision.nextSessionStart) {
      await this.scheduleResumeTicket({
        symbol: session.symbol,
        market: params.market,
        provider: params.provider,
        tradingDay: params.tradingDay,
        nextSessionStart: params.decision.nextSessionStart,
      });
      return;
    }

    await this.clearResumeTicketByContext(params);
  }

  private async scheduleResumeTicket(params: {
    symbol: string;
    market: string;
    provider: string;
    tradingDay: string;
    nextSessionStart: string;
  }): Promise<void> {
    const upstreamKey = this.buildUpstreamKey(params);
    const ticketKey = this.buildResumeTicketKey(upstreamKey);
    const ticket: ResumeTicketRecord = {
      upstreamKey,
      symbol: params.symbol,
      market: params.market,
      provider: params.provider,
      tradingDay: params.tradingDay,
      nextSessionStart: params.nextSessionStart,
      createdAt: new Date().toISOString(),
    };
    const ttlSeconds = Math.max(
      60,
      Math.ceil(
        (Date.parse(params.nextSessionStart) - Date.now()) / 1000 +
          this.resumeBufferSeconds,
      ),
    );

    await this.basicCacheService.set(ticketKey, ticket, { ttlSeconds });
    this.scheduleLocalResumeTimer(ticket);
  }

  private scheduleLocalResumeTimer(ticket: ResumeTicketRecord): void {
    const ticketKey = this.buildResumeTicketKey(ticket.upstreamKey);
    const existing = this.localResumeTimers.get(ticketKey);
    if (existing) {
      clearTimeout(existing);
      this.localResumeTimers.delete(ticketKey);
    }

    const delayMs = Math.max(0, Date.parse(ticket.nextSessionStart) - Date.now());
    const timer = setTimeout(() => {
      void this.handleResumeTicket(ticketKey);
    }, delayMs);
    this.localResumeTimers.set(ticketKey, timer);
  }

  private async handleResumeTicket(ticketKey: string): Promise<void> {
    this.clearLocalResumeTimer(ticketKey);

    const ticket = await this.basicCacheService.get<ResumeTicketRecord>(ticketKey);
    if (!ticket) {
      return;
    }

    const decision = await this.chartIntradaySessionPolicyService.decide({
      market: ticket.market,
      tradingDay: ticket.tradingDay,
    });
    const activeSessionCount =
      await this.chartIntradaySessionService.getUpstreamActiveSessionCount(
        ticket.upstreamKey,
      );

    if (
      activeSessionCount <= 0
    ) {
      await this.clearResumeTicketByUpstreamKey(ticket.upstreamKey);
      return;
    }

    if (
      decision.mode === "paused" &&
      decision.nextSessionStart &&
      Date.parse(decision.nextSessionStart) > Date.now()
    ) {
      await this.scheduleResumeTicket({
        symbol: ticket.symbol,
        market: ticket.market,
        provider: ticket.provider,
        tradingDay: ticket.tradingDay,
        nextSessionStart: decision.nextSessionStart,
      });
      return;
    }

    if (decision.mode !== "live" || decision.marketStatus !== MarketStatus.TRADING) {
      await this.clearResumeTicketByUpstreamKey(ticket.upstreamKey);
      return;
    }

    await this.chartIntradayStreamSubscriptionService.resumeRealtimeUpstream({
      symbol: ticket.symbol,
      market: ticket.market,
      provider: ticket.provider,
    });
    await this.clearResumeTicketByUpstreamKey(ticket.upstreamKey);

    this.logger.log("分时午休后上游订阅已恢复", {
      symbol: ticket.symbol,
      market: ticket.market,
      provider: ticket.provider,
      tradingDay: ticket.tradingDay,
      activeSessionCount,
    });
  }

  private async clearResumeTicketByContext(params: {
    symbol: string;
    market: string;
    provider: string;
  }): Promise<void> {
    await this.clearResumeTicketByUpstreamKey(this.buildUpstreamKey(params));
  }

  private async clearResumeTicketByUpstreamKey(upstreamKey: string): Promise<void> {
    this.clearLocalResumeTimer(this.buildResumeTicketKey(upstreamKey));
    await this.basicCacheService.del(this.buildResumeTicketKey(upstreamKey));
  }

  private clearLocalResumeTimer(ticketKey: string): void {
    const timer = this.localResumeTimers.get(ticketKey);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.localResumeTimers.delete(ticketKey);
  }

  private buildResumeTicketKey(upstreamKey: string): string {
    return `${ChartIntradayRuntimeOrchestratorService.RESUME_TICKET_KEY_PREFIX}${upstreamKey}`;
  }

  private buildUpstreamKey(params: {
    symbol: string;
    market: string;
    provider: string;
  }): string {
    return [
      String(params.provider || "").trim().toLowerCase(),
      this.resolveRealtimeCapabilityByMarket(params.market),
      String(params.symbol || "").trim().toUpperCase(),
    ].join(":");
  }

  private resolveRealtimeCapabilityByMarket(market: string): string {
    switch (
      String(market || "")
        .trim()
        .toUpperCase()
    ) {
      case "CRYPTO":
        return CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE;
      default:
        return CAPABILITY_NAMES.STREAM_STOCK_QUOTE;
    }
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
