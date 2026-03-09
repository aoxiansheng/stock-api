import { HttpStatus, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

import { createLogger } from "@common/logging/index";
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { isValidYmdDate } from "@core/shared/utils/ymd-date.util";
import {
  isTimestampInTradingDay,
  parseFlexibleTimestampToMs,
  resolveMarketTimezone,
} from "@core/shared/utils/market-time.util";
import { ReceiverService } from "../../receiver/services/receiver.service";
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";

import { IntradaySnapshotRequestDto } from "../dto/intraday-snapshot-request.dto";
import { IntradayDeltaRequestDto } from "../dto/intraday-delta-request.dto";
import {
  IntradayDeltaResponseDto,
  IntradayPointDto,
  IntradaySnapshotResponseDto,
} from "../dto/intraday-line-response.dto";

interface IntradayCursorPayload {
  v: number;
  symbol: string;
  market: string;
  tradingDay: string;
  provider?: string;
  lastPointTimestamp: string;
  issuedAt: string;
}

interface SignedIntradayCursorPayload extends IntradayCursorPayload {
  sig: string;
}

interface ResolvedIntradayContext {
  symbol: string;
  market: string;
  tradingDay: string;
  provider: string;
}

interface MergeResult {
  points: IntradayPointDto[];
  deduplicatedPoints: number;
}

@Injectable()
export class ChartIntradayService {
  private readonly logger = createLogger(ChartIntradayService.name);

  private readonly cursorSigningSecret = this.resolveCursorSigningSecret();

  private static readonly DEFAULT_PROVIDER = "infoway";
  private static readonly DEFAULT_POINT_LIMIT = 30000;
  private static readonly DEFAULT_DELTA_LIMIT = 2000;
  private static readonly MAX_HISTORY_KLINE_NUM = 500;
  private static readonly MAX_CURSOR_AGE_MS = 2 * 60 * 60 * 1000;
  private static readonly MAX_CURSOR_FUTURE_SKEW_MS = 5 * 60 * 1000;
  private static readonly SUPPORTED_MARKETS = new Set([
    "US",
    "HK",
    "CN",
    "SH",
    "SZ",
  ]);

  constructor(
    private readonly receiverService: ReceiverService,
    private readonly streamDataFetcherService: StreamDataFetcherService,
  ) {}

  async getSnapshot(
    request: IntradaySnapshotRequestDto,
  ): Promise<IntradaySnapshotResponseDto> {
    const resolved = this.resolveContext(request);
    const pointLimit =
      request.pointLimit ?? ChartIntradayService.DEFAULT_POINT_LIMIT;
    const now = new Date();

    this.logger.log("开始生成分时快照", {
      symbol: resolved.symbol,
      market: resolved.market,
      tradingDay: resolved.tradingDay,
      provider: resolved.provider,
      pointLimit,
    });

    const historyPoints = await this.fetchHistoryBaseline(
      resolved,
      pointLimit,
    );
    const realtimePoints = await this.fetchRealtimePoints(
      resolved.symbol,
      resolved.market,
      resolved.tradingDay,
    );

    const merged = this.mergeAndNormalizePoints(
      historyPoints,
      realtimePoints,
      pointLimit,
    );

    if (merged.points.length === 0) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: "snapshot",
        message: "NO_DATA: 当前无可用分时点位",
        statusCode: HttpStatus.NOT_FOUND,
        context: {
          symbol: resolved.symbol,
          market: resolved.market,
          tradingDay: resolved.tradingDay,
        },
      });
    }

    const lastPointTimestamp = merged.points[merged.points.length - 1].timestamp;
    const cursor = this.encodeCursor({
      v: 1,
      symbol: resolved.symbol,
      market: resolved.market,
      tradingDay: resolved.tradingDay,
      provider: resolved.provider,
      lastPointTimestamp,
      issuedAt: now.toISOString(),
    });

    return {
      line: {
        symbol: resolved.symbol,
        market: resolved.market,
        tradingDay: resolved.tradingDay,
        granularity: "1s",
        points: merged.points,
      },
      capability: {
        snapshotBaseGranularity: "1m",
        supportsFullDay1sHistory: false,
      },
      sync: {
        cursor,
        lastPointTimestamp,
        serverTime: now.toISOString(),
      },
      metadata: {
        provider: resolved.provider,
        historyPoints: historyPoints.length,
        realtimeMergedPoints: realtimePoints.length,
        deduplicatedPoints: merged.deduplicatedPoints,
      },
    };
  }

  async getDelta(request: IntradayDeltaRequestDto): Promise<IntradayDeltaResponseDto> {
    if (
      Object.prototype.hasOwnProperty.call(
        request as object,
        "since",
      )
    ) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "delta",
        message: "INVALID_ARGUMENT: since 参数已废弃，请使用 cursor",
        statusCode: HttpStatus.BAD_REQUEST,
        context: {
          symbol: request.symbol,
          market: request.market,
          tradingDay: request.tradingDay,
        },
      });
    }

    if (!request.cursor?.trim()) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "delta",
        message: "INVALID_ARGUMENT: delta 请求必须提供带 sig 的 cursor",
        statusCode: HttpStatus.BAD_REQUEST,
        context: {
          symbol: request.symbol,
          market: request.market,
          tradingDay: request.tradingDay,
        },
      });
    }

    const cursorPayload = this.decodeCursor(request.cursor);
    const resolved = this.resolveContext({
      ...request,
      market: request.market ?? cursorPayload.market,
      tradingDay: request.tradingDay ?? cursorPayload.tradingDay,
      provider: request.provider ?? cursorPayload.provider,
    });
    const limit = request.limit ?? ChartIntradayService.DEFAULT_DELTA_LIMIT;
    const now = new Date();
    this.assertCursorValid(
      cursorPayload,
      resolved,
      now,
      request.strictProviderConsistency === true,
    );
    const sinceMs = this.parseTimestampToMs(cursorPayload.lastPointTimestamp);
    if (!sinceMs || Number.isNaN(sinceMs)) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "delta",
        message: "INVALID_ARGUMENT: cursor.lastPointTimestamp 非法",
        statusCode: HttpStatus.BAD_REQUEST,
        context: {
          symbol: resolved.symbol,
          market: resolved.market,
          tradingDay: resolved.tradingDay,
        },
      });
    }

    const realtimePoints = await this.fetchRealtimePoints(
      resolved.symbol,
      resolved.market,
      resolved.tradingDay,
    );

    const incrementalPoints = realtimePoints
      .filter((point) => this.parseTimestampToMs(point.timestamp)! > sinceMs)
      .sort(
        (a, b) =>
          this.parseTimestampToMs(a.timestamp)! -
          this.parseTimestampToMs(b.timestamp)!,
      );

    const hasMore = incrementalPoints.length > limit;
    const points = hasMore ? incrementalPoints.slice(0, limit) : incrementalPoints;
    const lastPointTimestamp =
      points.length > 0
        ? points[points.length - 1].timestamp
        : new Date(sinceMs).toISOString();

    const nextCursor = this.encodeCursor({
      v: 1,
      symbol: resolved.symbol,
      market: resolved.market,
      tradingDay: resolved.tradingDay,
      provider: resolved.provider,
      lastPointTimestamp,
      issuedAt: now.toISOString(),
    });

    return {
      delta: {
        points,
        hasMore,
        nextCursor,
        lastPointTimestamp,
        serverTime: now.toISOString(),
      },
    };
  }

  private async fetchHistoryBaseline(
    resolved: ResolvedIntradayContext,
    pointLimit: number,
  ): Promise<IntradayPointDto[]> {
    const historyKlineNum = Math.max(
      1,
      Math.min(
        ChartIntradayService.MAX_HISTORY_KLINE_NUM,
        Math.ceil(pointLimit / 60),
      ),
    );

    const historyEndTimestamp = this.resolveTradingDayEndTimestampSeconds(
      resolved.tradingDay,
      resolved.market,
    );

    try {
      const receiverResponse = await this.receiverService.handleRequest({
        symbols: [resolved.symbol],
        receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        options: {
          preferredProvider: resolved.provider,
          market: resolved.market,
          klineNum: historyKlineNum,
          timestamp: historyEndTimestamp,
        },
      } as any);

      const rows = this.extractRows(receiverResponse?.data);
      const normalized = rows
        .map((row) => {
          const timestampMs = this.parseTimestampToMs(row?.timestamp ?? row?.t);
          const price = this.parseNumber(
            row?.lastPrice ?? row?.closePrice ?? row?.close ?? row?.c,
          );
          const volume = this.parseNumber(row?.volume ?? row?.v ?? 0);
          if (!timestampMs || !Number.isFinite(price)) {
            return null;
          }
          if (
            !this.isPointInTradingDay(
              timestampMs,
              resolved.tradingDay,
              resolved.market,
            )
          ) {
            return null;
          }
          return {
            timestamp: new Date(timestampMs).toISOString(),
            price,
            volume: Number.isFinite(volume) ? volume : 0,
          } as IntradayPointDto;
        })
        .filter((item): item is IntradayPointDto => !!item)
        .sort(
          (a, b) =>
            this.parseTimestampToMs(a.timestamp)! -
            this.parseTimestampToMs(b.timestamp)!,
        );

      return normalized;
    } catch (error: any) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw this.createBusinessException({
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: "snapshot_history_fetch",
        message: "PROVIDER_UNAVAILABLE: 历史基线获取失败",
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        context: {
          symbol: resolved.symbol,
          market: resolved.market,
          provider: resolved.provider,
          error: error?.message,
        },
      });
    }
  }

  private async fetchRealtimePoints(
    symbol: string,
    market: string,
    tradingDay: string,
  ): Promise<IntradayPointDto[]> {
    const streamCache = this.streamDataFetcherService.getStreamDataCache?.();
    if (!streamCache || typeof streamCache.getData !== "function") {
      return [];
    }

    const key = `quote:${symbol}`;
    const rawPoints = await streamCache.getData(key);
    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      return [];
    }

    const points = rawPoints
      .map((point) => {
        const timestampMs = this.parseTimestampToMs(point?.t);
        const price = this.parseNumber(point?.p);
        const volume = this.parseNumber(point?.v ?? 0);
        if (!timestampMs || !Number.isFinite(price)) {
          return null;
        }
        if (!this.isPointInTradingDay(timestampMs, tradingDay, market)) {
          return null;
        }
        return {
          timestamp: new Date(timestampMs).toISOString(),
          price,
          volume: Number.isFinite(volume) ? volume : 0,
        } as IntradayPointDto;
      })
      .filter((item): item is IntradayPointDto => !!item)
      .sort(
        (a, b) =>
          this.parseTimestampToMs(a.timestamp)! -
          this.parseTimestampToMs(b.timestamp)!,
      );

    return points;
  }

  private mergeAndNormalizePoints(
    historyPoints: IntradayPointDto[],
    realtimePoints: IntradayPointDto[],
    pointLimit: number,
  ): MergeResult {
    const bucketMap = new Map<number, IntradayPointDto>();
    let inputCount = 0;

    for (const point of historyPoints) {
      const bucket = this.toSecondBucket(point.timestamp);
      if (!bucket) {
        continue;
      }
      inputCount += 1;
      bucketMap.set(bucket, point);
    }

    for (const point of realtimePoints) {
      const bucket = this.toSecondBucket(point.timestamp);
      if (!bucket) {
        continue;
      }
      inputCount += 1;
      bucketMap.set(bucket, point);
    }

    const deduplicatedPoints = Math.max(0, inputCount - bucketMap.size);
    const merged = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, point]) => point);

    if (merged.length > pointLimit) {
      return {
        points: merged.slice(merged.length - pointLimit),
        deduplicatedPoints,
      };
    }

    return {
      points: merged,
      deduplicatedPoints,
    };
  }

  private extractRows(rawData: unknown): Record<string, unknown>[] {
    if (Array.isArray(rawData)) {
      return rawData as Record<string, unknown>[];
    }

    if (rawData && typeof rawData === "object") {
      const nestedData = (rawData as any).data;
      if (Array.isArray(nestedData)) {
        return nestedData;
      }
    }

    return [];
  }

  private resolveContext(
    request: {
      symbol: string;
      market?: string;
      tradingDay?: string;
      provider?: string;
    },
  ): ResolvedIntradayContext {
    const symbol = String(request.symbol || "").trim().toUpperCase();
    if (!symbol) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "resolve_context",
        message: "INVALID_ARGUMENT: symbol 不能为空",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const explicitMarket = String(request.market || "")
      .trim()
      .toUpperCase();
    const symbolSuffix = String(symbol.split(".").pop() || "")
      .trim()
      .toUpperCase();
    const inferredMarket = ChartIntradayService.SUPPORTED_MARKETS.has(symbolSuffix)
      ? symbolSuffix
      : "";
    let market = explicitMarket;
    if (!market) {
      if (inferredMarket) {
        market = inferredMarket;
      } else {
        throw this.createBusinessException({
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "resolve_context",
          message: "INVALID_ARGUMENT: 未传 market 且无法从 symbol 推断 market",
          statusCode: HttpStatus.BAD_REQUEST,
          context: { symbol },
        });
      }
    }

    if (explicitMarket && inferredMarket && explicitMarket !== inferredMarket) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "resolve_context",
        message:
          "INVALID_ARGUMENT: market 与 symbol 推断市场不一致，请修正请求参数",
        statusCode: HttpStatus.BAD_REQUEST,
        context: {
          symbol,
          explicitMarket,
          inferredMarket,
        },
      });
    }

    if (!ChartIntradayService.SUPPORTED_MARKETS.has(market)) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "resolve_context",
        message: "INVALID_ARGUMENT: market 不合法",
        statusCode: HttpStatus.BAD_REQUEST,
        context: { market },
      });
    }

    const tradingDay =
      request.tradingDay?.trim() || this.resolveCurrentTradingDay(market);
    if (!isValidYmdDate(tradingDay)) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "resolve_context",
        message: "INVALID_ARGUMENT: tradingDay 必须是 YYYYMMDD 且为合法日期",
        statusCode: HttpStatus.BAD_REQUEST,
        context: { tradingDay },
      });
    }

    return {
      symbol,
      market,
      tradingDay,
      provider: String(request.provider || ChartIntradayService.DEFAULT_PROVIDER)
        .trim()
        .toLowerCase(),
    };
  }

  private resolveCurrentTradingDay(market: string): string {
    const timezone = resolveMarketTimezone(market);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()).replace(/-/g, "");
  }

  private resolveTradingDayEndTimestampSeconds(
    tradingDay: string,
    market: string,
  ): number {
    const timezone = resolveMarketTimezone(market);
    const utcMs = this.zonedDateTimeToUtcMs(
      tradingDay,
      23,
      59,
      59,
      timezone,
    );
    return Math.floor(utcMs / 1000);
  }

  private zonedDateTimeToUtcMs(
    ymd: string,
    hour: number,
    minute: number,
    second: number,
    timezone: string,
  ): number {
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(4, 6));
    const day = Number(ymd.slice(6, 8));
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const offsetMs = this.getTimezoneOffsetMs(timezone, new Date(targetAsUtc));
    return targetAsUtc - offsetMs;
  }

  private getTimezoneOffsetMs(timezone: string, date: Date): number {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const values: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    }
    const timezoneAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    return timezoneAsUtc - date.getTime();
  }

  private isPointInTradingDay(
    timestampMs: number,
    tradingDay: string,
    market: string,
  ): boolean {
    return isTimestampInTradingDay(timestampMs, tradingDay, market);
  }

  private parseNumber(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) {
        return Number.NaN;
      }
      return Number(normalized.replace(/,/g, ""));
    }
    return Number.NaN;
  }

  private toSecondBucket(timestamp: string): number | null {
    const ms = this.parseTimestampToMs(timestamp);
    if (!ms) {
      return null;
    }
    return Math.floor(ms / 1000) * 1000;
  }

  private parseTimestampToMs(value: unknown): number | null {
    return parseFlexibleTimestampToMs(value);
  }

  private encodeCursor(payload: IntradayCursorPayload): string {
    const signedPayload: SignedIntradayCursorPayload = {
      ...payload,
      sig: this.signCursorPayload(payload),
    };
    return Buffer.from(JSON.stringify(signedPayload), "utf-8").toString(
      "base64",
    );
  }

  private decodeCursor(cursor: string): IntradayCursorPayload {
    try {
      const raw = Buffer.from(cursor, "base64").toString("utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("invalid cursor payload");
      }

      if (
        typeof parsed.v !== "number" ||
        typeof parsed.symbol !== "string" ||
        typeof parsed.market !== "string" ||
        typeof parsed.tradingDay !== "string" ||
        typeof parsed.lastPointTimestamp !== "string" ||
        typeof parsed.issuedAt !== "string" ||
        typeof parsed.sig !== "string"
      ) {
        throw new Error("invalid cursor payload");
      }

      const providerValue = parsed.provider;
      if (providerValue !== undefined && typeof providerValue !== "string") {
        throw new Error("invalid cursor payload");
      }
      const normalizedProvider =
        typeof providerValue === "string"
          ? providerValue.trim().toLowerCase()
          : undefined;
      const payload: IntradayCursorPayload = {
        v: parsed.v,
        symbol: parsed.symbol.trim().toUpperCase(),
        market: parsed.market.trim().toUpperCase(),
        tradingDay: parsed.tradingDay.trim(),
        provider: normalizedProvider || undefined,
        lastPointTimestamp: parsed.lastPointTimestamp.trim(),
        issuedAt: parsed.issuedAt.trim(),
      };
      const signature = parsed.sig.trim();

      if (!this.isValidCursorPayload(payload) || !signature) {
        throw new Error("invalid cursor payload");
      }

      const expectedSignature = this.signCursorPayload(payload);
      if (!this.isSignatureMatch(signature, expectedSignature)) {
        throw new Error("cursor tampered");
      }

      return payload;
    } catch {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "decode_cursor",
        message: "INVALID_ARGUMENT: cursor 格式无效",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private assertCursorValid(
    payload: IntradayCursorPayload,
    resolved: ResolvedIntradayContext,
    now: Date,
    strictProviderConsistency: boolean,
  ): void {
    if (
      payload.symbol !== resolved.symbol ||
      payload.market !== resolved.market ||
      payload.tradingDay !== resolved.tradingDay
    ) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标与当前请求上下文不匹配",
        statusCode: HttpStatus.CONFLICT,
        context: {
          cursorSymbol: payload.symbol,
          cursorMarket: payload.market,
          cursorTradingDay: payload.tradingDay,
          requestSymbol: resolved.symbol,
          requestMarket: resolved.market,
          requestTradingDay: resolved.tradingDay,
        },
      });
    }

    const issuedAtMs = this.parseTimestampToMs(payload.issuedAt);
    const nowMs = now.getTime();
    if (!issuedAtMs) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标时间戳非法，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (issuedAtMs - nowMs > ChartIntradayService.MAX_CURSOR_FUTURE_SKEW_MS) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标签发时间异常，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (nowMs - issuedAtMs > ChartIntradayService.MAX_CURSOR_AGE_MS) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标已过期，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (
      strictProviderConsistency &&
      String(payload.provider || "").trim().toLowerCase() !== resolved.provider
    ) {
      throw this.createBusinessException({
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message:
          "CURSOR_EXPIRED: provider 不一致，请重新拉取 snapshot 或关闭 strictProviderConsistency",
        statusCode: HttpStatus.CONFLICT,
        context: {
          cursorProvider: payload.provider || null,
          requestProvider: resolved.provider,
        },
      });
    }
  }

  private isValidCursorPayload(payload: IntradayCursorPayload): boolean {
    if (
      payload.v !== 1 ||
      !payload.symbol ||
      !payload.market ||
      !payload.tradingDay ||
      !payload.lastPointTimestamp ||
      !payload.issuedAt
    ) {
      return false;
    }

    if (!ChartIntradayService.SUPPORTED_MARKETS.has(payload.market)) {
      return false;
    }
    if (!isValidYmdDate(payload.tradingDay)) {
      return false;
    }
    if (
      !this.parseTimestampToMs(payload.lastPointTimestamp) ||
      !this.parseTimestampToMs(payload.issuedAt)
    ) {
      return false;
    }
    if (payload.provider !== undefined && !payload.provider.trim()) {
      return false;
    }

    return true;
  }

  private resolveCursorSigningSecret(): string {
    const secret = String(process.env.CHART_INTRADAY_CURSOR_SECRET || "").trim();
    if (secret) {
      return secret;
    }
    throw new Error(
      "CHART_INTRADAY_CURSOR_SECRET 未配置，服务启动失败",
    );
  }

  private signCursorPayload(payload: IntradayCursorPayload): string {
    const signingRaw = [
      payload.v,
      payload.symbol,
      payload.market,
      payload.tradingDay,
      payload.provider || "",
      payload.lastPointTimestamp,
      payload.issuedAt,
    ].join("|");
    return createHmac("sha256", this.cursorSigningSecret)
      .update(signingRaw, "utf-8")
      .digest("hex");
  }

  private isSignatureMatch(signature: string, expected: string): boolean {
    const actualBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private createBusinessException(options: {
    errorCode: BusinessErrorCode;
    operation: string;
    message: string;
    statusCode?: HttpStatus;
    context?: Record<string, unknown>;
  }): BusinessException {
    return UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.RECEIVER,
      errorCode: options.errorCode,
      operation: options.operation,
      message: options.message,
      statusCode: options.statusCode,
      context: options.context || {},
    });
  }
}
