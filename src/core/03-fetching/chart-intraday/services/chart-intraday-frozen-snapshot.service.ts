import { Inject, Injectable, Optional } from "@nestjs/common";
import Redis from "ioredis";

import {
  BasicCacheService,
  CACHE_REDIS_CLIENT_TOKEN,
} from "@core/05-caching/module/basic-cache";

import type {
  IntradayLineDto,
  IntradaySnapshotCapabilityDto,
  IntradaySnapshotMetadataDto,
  IntradaySnapshotReferenceDto,
  IntradaySnapshotResponseDto,
} from "./chart-intraday-read.service";

export interface ChartIntradayFrozenSnapshotPayload {
  line: IntradayLineDto;
  capability: IntradaySnapshotCapabilityDto;
  reference: IntradaySnapshotReferenceDto;
  metadata: IntradaySnapshotMetadataDto;
  storedAt: string;
}

export interface ChartIntradayFrozenSnapshotLookupResult {
  payload: ChartIntradayFrozenSnapshotPayload;
  effectiveTradingDay: string;
  fallback: boolean;
}

@Injectable()
export class ChartIntradayFrozenSnapshotService {
  private static readonly KEY_PREFIX = "chart-intraday:frozen-snapshot:v1:";

  private readonly ttlSeconds = this.parseInteger(
    process.env.CHART_INTRADAY_FROZEN_SNAPSHOT_TTL_SECONDS,
    72 * 60 * 60,
    60,
  );

  constructor(
    private readonly basicCacheService: BasicCacheService,
    @Optional()
    @Inject(CACHE_REDIS_CLIENT_TOKEN)
    private readonly redis?: Redis,
  ) {}

  async writeSnapshot(
    response: IntradaySnapshotResponseDto,
  ): Promise<void> {
    const payload: ChartIntradayFrozenSnapshotPayload = {
      line: response.line,
      capability: response.capability,
      reference: response.reference,
      metadata: response.metadata,
      storedAt: new Date().toISOString(),
    };

    await this.basicCacheService.set(
      this.buildKey({
        provider: response.metadata.provider,
        market: response.line.market,
        symbol: response.line.symbol,
        tradingDay: response.line.tradingDay,
      }),
      payload,
      { ttlSeconds: this.ttlSeconds },
    );
  }

  async findSnapshot(params: {
    provider: string;
    market: string;
    symbol: string;
    tradingDay: string;
    allowPreviousTradingDayFallback?: boolean;
  }): Promise<ChartIntradayFrozenSnapshotLookupResult | null> {
    const normalized = this.normalizeLookupParams(params);
    const exactKey = this.buildKey(normalized);
    const exact = await this.basicCacheService.get<ChartIntradayFrozenSnapshotPayload>(
      exactKey,
    );
    if (exact) {
      return {
        payload: exact,
        effectiveTradingDay: normalized.tradingDay,
        fallback: false,
      };
    }

    if (!params.allowPreviousTradingDayFallback) {
      return null;
    }

    const previousTradingDay = await this.findLatestPreviousTradingDay(normalized);
    if (!previousTradingDay) {
      return null;
    }

    const previous = await this.basicCacheService.get<ChartIntradayFrozenSnapshotPayload>(
      this.buildKey({
        ...normalized,
        tradingDay: previousTradingDay,
      }),
    );
    if (!previous) {
      return null;
    }

    return {
      payload: previous,
      effectiveTradingDay: previousTradingDay,
      fallback: true,
    };
  }

  private async findLatestPreviousTradingDay(params: {
    provider: string;
    market: string;
    symbol: string;
    tradingDay: string;
  }): Promise<string | null> {
    if (!this.redis) {
      return null;
    }

    const prefix = this.buildPrefix(params);
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");

    const previousTradingDays = keys
      .map((key) => key.slice(prefix.length))
      .filter((tradingDay) => /^\d{8}$/.test(tradingDay))
      .filter((tradingDay) => tradingDay < params.tradingDay)
      .sort((left, right) => right.localeCompare(left));

    return previousTradingDays[0] || null;
  }

  private buildKey(params: {
    provider: string;
    market: string;
    symbol: string;
    tradingDay: string;
  }): string {
    return `${this.buildPrefix(params)}${params.tradingDay}`;
  }

  private buildPrefix(params: {
    provider: string;
    market: string;
    symbol: string;
  }): string {
    return [
      ChartIntradayFrozenSnapshotService.KEY_PREFIX,
      String(params.provider || "").trim().toLowerCase(),
      ":",
      String(params.market || "").trim().toUpperCase(),
      ":",
      String(params.symbol || "").trim().toUpperCase(),
      ":",
    ].join("");
  }

  private normalizeLookupParams(params: {
    provider: string;
    market: string;
    symbol: string;
    tradingDay: string;
  }) {
    return {
      provider: String(params.provider || "").trim().toLowerCase(),
      market: String(params.market || "").trim().toUpperCase(),
      symbol: String(params.symbol || "").trim().toUpperCase(),
      tradingDay: String(params.tradingDay || "").trim(),
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
