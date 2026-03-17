import { Injectable } from "@nestjs/common";

import {
  Market,
  MarketStatus,
} from "@core/shared/constants/market.constants";
import {
  MarketStatusService,
  type MarketStatusResult,
} from "@core/shared/services/market-status.service";
import { resolveMarketTimezone } from "@core/shared/utils/market-time.util";

export type ChartIntradayRuntimeMode = "live" | "paused" | "frozen";

export type ChartIntradayRuntimeReason =
  | "CRYPTO_ALWAYS_LIVE"
  | "CURRENT_SESSION_TRADING"
  | "LUNCH_BREAK"
  | "REQUESTED_TRADING_DAY_NOT_CURRENT"
  | "PRE_MARKET_BLOCKED"
  | "AFTER_HOURS_BLOCKED"
  | "MARKET_CLOSED"
  | "NON_TRADING_DAY";

export interface ChartIntradayRuntimeDecision {
  mode: ChartIntradayRuntimeMode;
  reason: ChartIntradayRuntimeReason;
  market: string;
  requestedTradingDay: string;
  currentTradingDay: string;
  marketStatus: MarketStatus;
  timezone: string;
  nextSessionStart: string | null;
}

@Injectable()
export class ChartIntradaySessionPolicyService {
  constructor(
    private readonly marketStatusService: MarketStatusService,
  ) {}

  async decide(params: {
    market: string;
    tradingDay: string;
  }): Promise<ChartIntradayRuntimeDecision> {
    const market = String(params.market || "")
      .trim()
      .toUpperCase();
    const requestedTradingDay = String(params.tradingDay || "").trim();
    const timezone = resolveMarketTimezone(market);
    const currentTradingDay = this.resolveCurrentTradingDay(market);

    if (requestedTradingDay !== currentTradingDay) {
      return {
        mode: "frozen",
        reason: "REQUESTED_TRADING_DAY_NOT_CURRENT",
        market,
        requestedTradingDay,
        currentTradingDay,
        marketStatus:
          market === "CRYPTO" ? MarketStatus.TRADING : MarketStatus.MARKET_CLOSED,
        timezone,
        nextSessionStart: null,
      };
    }

    if (market === "CRYPTO") {
      return {
        mode: "live",
        reason: "CRYPTO_ALWAYS_LIVE",
        market,
        requestedTradingDay,
        currentTradingDay,
        marketStatus: MarketStatus.TRADING,
        timezone,
        nextSessionStart: null,
      };
    }

    const marketStatus = await this.marketStatusService.getMarketStatus(
      market as Market,
    );

    return this.resolveDecisionFromMarketStatus({
      market,
      requestedTradingDay,
      currentTradingDay,
      marketStatus,
    });
  }

  private resolveDecisionFromMarketStatus(params: {
    market: string;
    requestedTradingDay: string;
    currentTradingDay: string;
    marketStatus: MarketStatusResult;
  }): ChartIntradayRuntimeDecision {
    const { market, requestedTradingDay, currentTradingDay, marketStatus } =
      params;
    const nextSessionStart = marketStatus.nextSessionStart
      ? marketStatus.nextSessionStart.toISOString()
      : null;

    if (marketStatus.status === MarketStatus.TRADING) {
      return {
        mode: "live",
        reason: "CURRENT_SESSION_TRADING",
        market,
        requestedTradingDay,
        currentTradingDay,
        marketStatus: marketStatus.status,
        timezone: marketStatus.timezone,
        nextSessionStart: null,
      };
    }

    if (
      (market === "CN" || market === "SH" || market === "SZ" || market === "HK") &&
      marketStatus.status === MarketStatus.LUNCH_BREAK
    ) {
      return {
        mode: "paused",
        reason: "LUNCH_BREAK",
        market,
        requestedTradingDay,
        currentTradingDay,
        marketStatus: marketStatus.status,
        timezone: marketStatus.timezone,
        nextSessionStart,
      };
    }

    return {
      mode: "frozen",
      reason: this.resolveFrozenReason(marketStatus.status),
      market,
      requestedTradingDay,
      currentTradingDay,
      marketStatus: marketStatus.status,
      timezone: marketStatus.timezone,
      nextSessionStart: null,
    };
  }

  private resolveCurrentTradingDay(market: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: resolveMarketTimezone(market),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()).replace(/-/g, "");
  }

  private resolveFrozenReason(status: MarketStatus): ChartIntradayRuntimeReason {
    switch (status) {
      case MarketStatus.PRE_MARKET:
        return "PRE_MARKET_BLOCKED";
      case MarketStatus.AFTER_HOURS:
        return "AFTER_HOURS_BLOCKED";
      case MarketStatus.WEEKEND:
      case MarketStatus.HOLIDAY:
        return "NON_TRADING_DAY";
      case MarketStatus.MARKET_CLOSED:
      default:
        return "MARKET_CLOSED";
    }
  }
}
