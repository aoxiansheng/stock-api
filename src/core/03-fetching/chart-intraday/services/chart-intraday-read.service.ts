import { HttpStatus, Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { createLogger, shouldLog } from "@common/logging/index";
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { SymbolTransformerService } from "@core/02-processing/symbol-transformer/services/symbol-transformer.service";
import {
  ChartIntradayCursorService,
  type IntradayCursorPayload,
  type ResolvedIntradayCursorContext,
} from "@core/03-fetching/chart-intraday/services/chart-intraday-cursor.service";
import {
  ChartIntradayStreamSubscriptionService,
  type ReleaseRealtimeSubscriptionResult,
} from "@core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service";
import { DataFetcherService } from "@core/03-fetching/data-fetcher/services/data-fetcher.service";
import { isValidYmdDate } from "@core/shared/utils/ymd-date.util";
import {
  isSupportedMarket,
  isTimestampInTradingDay,
  parseFlexibleTimestampToMs,
  resolveMarketTimezone,
  SUPPORTED_MARKETS,
} from "@core/shared/utils/market-time.util";
import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";

type ResolvedIntradayContext = ResolvedIntradayCursorContext;

export interface IntradaySnapshotRequestDto {
  symbol: string;
  market?: string;
  tradingDay?: string;
  provider?: string;
  pointLimit?: number;
}

export interface IntradayDeltaRequestDto {
  symbol: string;
  market?: string;
  tradingDay?: string;
  provider?: string;
  cursor: string;
  limit?: number;
  strictProviderConsistency?: boolean;
}

export interface IntradayReleaseRequestDto {
  symbol: string;
  market?: string;
  provider?: string;
}

export interface IntradayPointDto {
  timestamp: string;
  price: number;
  volume: number;
}

export interface IntradayLineDto {
  symbol: string;
  market: string;
  tradingDay: string;
  granularity: "1s";
  points: IntradayPointDto[];
}

export interface IntradaySnapshotCapabilityDto {
  snapshotBaseGranularity: "1m";
  supportsFullDay1sHistory: boolean;
}

export interface IntradaySyncDto {
  cursor: string;
  lastPointTimestamp: string;
  serverTime: string;
}

export interface IntradaySnapshotMetadataDto {
  provider: string;
  historyPoints: number;
  realtimeMergedPoints: number;
  deduplicatedPoints: number;
}

export interface IntradaySnapshotResponseDto {
  line: IntradayLineDto;
  capability: IntradaySnapshotCapabilityDto;
  sync: IntradaySyncDto;
  metadata: IntradaySnapshotMetadataDto;
}

export interface IntradayDeltaPayloadDto {
  points: IntradayPointDto[];
  hasMore: boolean;
  nextCursor: string;
  lastPointTimestamp: string;
  serverTime: string;
}

export interface IntradayDeltaResponseDto {
  delta: IntradayDeltaPayloadDto;
}

export interface IntradayReleasePayloadDto {
  released: boolean;
  symbol: string;
  market: string;
  provider: string;
  wsCapabilityType: string;
}

export interface IntradayReleaseResponseDto {
  release: IntradayReleasePayloadDto;
}

interface MergeResult {
  points: IntradayPointDto[];
  deduplicatedPoints: number;
}

@Injectable()
export class ChartIntradayReadService {
  private readonly logger = createLogger(ChartIntradayReadService.name);

  private static readonly DEFAULT_PROVIDER = "infoway";
  private static readonly DEFAULT_POINT_LIMIT = 30000;
  private static readonly DEFAULT_DELTA_LIMIT = 2000;
  private static readonly MAX_HISTORY_KLINE_NUM = 500;
  private static readonly SNAPSHOT_HISTORY_MAX_ATTEMPTS = 2;
  private static readonly SNAPSHOT_HISTORY_RETRY_DELAY_MS = 1000;
  private static readonly SUPPORTED_MARKET_SET = new Set(SUPPORTED_MARKETS);

  constructor(
    private readonly dataFetcherService: DataFetcherService,
    private readonly symbolTransformerService: SymbolTransformerService,
    private readonly providerRegistryService: ProviderRegistryService,
    private readonly streamDataFetcherService: StreamDataFetcherService,
    private readonly chartIntradayCursorService: ChartIntradayCursorService,
    private readonly chartIntradayStreamSubscriptionService: ChartIntradayStreamSubscriptionService,
  ) {}

  async getSnapshot(
    request: IntradaySnapshotRequestDto,
  ): Promise<IntradaySnapshotResponseDto> {
    const resolved = this.resolveContext(request);
    const pointLimit =
      request.pointLimit ?? ChartIntradayReadService.DEFAULT_POINT_LIMIT;
    const now = new Date();

    this.logger.log("开始生成分时快照", {
      symbol: resolved.symbol,
      market: resolved.market,
      tradingDay: resolved.tradingDay,
      provider: resolved.provider,
      pointLimit,
    });

    await this.ensureRealtimeSubscription(resolved, "snapshot");

    const historyPoints = await this.fetchHistoryBaseline(resolved, pointLimit);
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

    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: snapshot 点位合并结果", {
        symbol: resolved.symbol,
        market: resolved.market,
        tradingDay: resolved.tradingDay,
        historyPointsCount: historyPoints.length,
        realtimePointsCount: realtimePoints.length,
        mergedPointsCount: merged.points.length,
        historyLastTimestamp:
          historyPoints[historyPoints.length - 1]?.timestamp || null,
        realtimeLastTimestamp:
          realtimePoints[realtimePoints.length - 1]?.timestamp || null,
        mergedLastTimestamp:
          merged.points[merged.points.length - 1]?.timestamp || null,
        historyLastPoint: this.buildPointPreview(
          historyPoints[historyPoints.length - 1],
        ),
        realtimeLastPoint: this.buildPointPreview(
          realtimePoints[realtimePoints.length - 1],
        ),
        mergedLastPoint: this.buildPointPreview(
          merged.points[merged.points.length - 1],
        ),
      });
    }

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

    const lastPointTimestamp =
      merged.points[merged.points.length - 1].timestamp;
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

  async getDelta(
    request: IntradayDeltaRequestDto,
  ): Promise<IntradayDeltaResponseDto> {
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
    const limit = request.limit ?? ChartIntradayReadService.DEFAULT_DELTA_LIMIT;
    const now = new Date();
    this.assertCursorValid(
      cursorPayload,
      resolved,
      now,
      request.strictProviderConsistency === true,
    );

    await this.ensureRealtimeSubscription(resolved, "delta");

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

    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: delta 游标与实时点边界", {
        symbol: resolved.symbol,
        market: resolved.market,
        tradingDay: resolved.tradingDay,
        cursorLastPointTimestamp: cursorPayload.lastPointTimestamp,
        sinceMs,
        realtimeFirstTimestamp: realtimePoints[0]?.timestamp || null,
        realtimeLastTimestamp:
          realtimePoints[realtimePoints.length - 1]?.timestamp || null,
        realtimeFirstPoint: this.buildPointPreview(realtimePoints[0]),
        realtimeLastPoint: this.buildPointPreview(
          realtimePoints[realtimePoints.length - 1],
        ),
      });
    }

    const incrementalPoints = realtimePoints
      .filter((point) => this.parseTimestampToMs(point.timestamp)! > sinceMs)
      .sort(
        (a, b) =>
          this.parseTimestampToMs(a.timestamp)! -
          this.parseTimestampToMs(b.timestamp)!,
      );

    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: delta 增量过滤结果", {
        symbol: resolved.symbol,
        market: resolved.market,
        tradingDay: resolved.tradingDay,
        sinceMs,
        realtimePointsCount: realtimePoints.length,
        incrementalPointsCount: incrementalPoints.length,
        incrementalFirstTimestamp: incrementalPoints[0]?.timestamp || null,
        incrementalLastTimestamp:
          incrementalPoints[incrementalPoints.length - 1]?.timestamp || null,
        incrementalFirstPoint: this.buildPointPreview(incrementalPoints[0]),
        incrementalLastPoint: this.buildPointPreview(
          incrementalPoints[incrementalPoints.length - 1],
        ),
      });
    }

    const hasMore = incrementalPoints.length > limit;
    const points = hasMore
      ? incrementalPoints.slice(0, limit)
      : incrementalPoints;
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

  async releaseRealtimeSubscription(
    request: IntradayReleaseRequestDto,
  ): Promise<IntradayReleaseResponseDto> {
    const resolved = this.resolveContext({
      symbol: request.symbol,
      market: request.market,
      provider: request.provider,
    });
    const released =
      await this.chartIntradayStreamSubscriptionService.releaseRealtimeSubscription(
        {
          symbol: resolved.symbol,
          market: resolved.market,
          provider: resolved.provider,
        },
      );

    return {
      release: this.buildReleasePayload(resolved.market, released),
    };
  }

  private async fetchHistoryBaseline(
    resolved: ResolvedIntradayContext,
    pointLimit: number,
  ): Promise<IntradayPointDto[]> {
    const historyKlineNum = Math.max(
      1,
      Math.min(
        ChartIntradayReadService.MAX_HISTORY_KLINE_NUM,
        Math.ceil(pointLimit / 60),
      ),
    );

    const historyAnchorTimestamp = this.resolveHistoryAnchorTimestampSeconds(
      resolved.tradingDay,
      resolved.market,
    );

    try {
      const requestId = uuidv4();
      const symbolMapping =
        await this.symbolTransformerService.transformSymbolsForProvider(
          resolved.provider,
          [resolved.symbol],
          requestId,
        );
      const transformedSymbol = String(
        symbolMapping.transformedSymbols?.[0] || "",
      ).trim();
      if (!transformedSymbol) {
        throw this.createBusinessException({
          errorCode: BusinessErrorCode.DATA_NOT_FOUND,
          operation: "snapshot_history_fetch",
          message: "SYMBOL_TRANSFORM_FAILED: 无法转换标的",
          statusCode: HttpStatus.NOT_FOUND,
          context: {
            symbol: resolved.symbol,
            market: resolved.market,
            provider: resolved.provider,
          },
        });
      }

      const fetchResult = await this.fetchHistoryBaselineWithRetry({
        resolved,
        transformedSymbol,
        historyKlineNum,
        historyAnchorTimestamp,
        requestId,
      });

      const rows = this.flattenHistoryRows(this.extractRows(fetchResult?.data));
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

  private async fetchHistoryBaselineWithRetry(params: {
    resolved: ResolvedIntradayContext;
    transformedSymbol: string;
    historyKlineNum: number;
    historyAnchorTimestamp: number;
    requestId: string;
  }): Promise<any> {
    const {
      resolved,
      transformedSymbol,
      historyKlineNum,
      historyAnchorTimestamp,
      requestId,
    } = params;
    const historyCapability = this.resolveHistoryCapabilityByMarket(
      resolved.market,
    );

    for (
      let attempt = 1;
      attempt <= ChartIntradayReadService.SNAPSHOT_HISTORY_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.dataFetcherService.fetchRawData({
          provider: resolved.provider,
          capability: historyCapability,
          symbols: [transformedSymbol],
          requestId,
          apiType: "rest",
          options: {
            preferredProvider: resolved.provider,
            market: resolved.market,
            klineNum: historyKlineNum,
            timestamp: historyAnchorTimestamp,
          },
        });
      } catch (error) {
        const classifiedError = this.classifySnapshotHistoryFetchError(error);
        if (!this.shouldRetrySnapshotHistoryFetch(classifiedError, attempt)) {
          throw error;
        }

        this.logger.warn("分时诊断: snapshot 历史基线拉取失败，准备重试", {
          symbol: resolved.symbol,
          market: resolved.market,
          tradingDay: resolved.tradingDay,
          provider: resolved.provider,
          requestId,
          attempt,
          maxAttempts: ChartIntradayReadService.SNAPSHOT_HISTORY_MAX_ATTEMPTS,
          nextDelayMs: ChartIntradayReadService.SNAPSHOT_HISTORY_RETRY_DELAY_MS,
          errorCode: classifiedError.errorCode,
          statusCode: classifiedError.getStatus(),
          retryable: classifiedError.retryable,
          message: classifiedError.message,
        });

        await this.sleep(
          ChartIntradayReadService.SNAPSHOT_HISTORY_RETRY_DELAY_MS,
        );
      }
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
      },
    });
  }

  private classifySnapshotHistoryFetchError(error: unknown): BusinessException {
    if (error instanceof BusinessException) {
      return error;
    }

    return UniversalExceptionFactory.createFromError(
      error,
      "snapshot_history_fetch",
      ComponentIdentifier.DATA_FETCHER,
    );
  }

  private shouldRetrySnapshotHistoryFetch(
    error: BusinessException,
    attempt: number,
  ): boolean {
    if (attempt >= ChartIntradayReadService.SNAPSHOT_HISTORY_MAX_ATTEMPTS) {
      return false;
    }

    return (
      error.retryable &&
      ![
        BusinessErrorCode.DATA_VALIDATION_FAILED,
        BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        BusinessErrorCode.INVALID_OPERATION,
        BusinessErrorCode.OPERATION_NOT_ALLOWED,
        BusinessErrorCode.CONFIGURATION_ERROR,
        BusinessErrorCode.ENVIRONMENT_ERROR,
      ].includes(error.errorCode as BusinessErrorCode)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: 尝试读取流缓存", {
        key,
        symbol,
        market,
        tradingDay,
      });
    }

    const rawPoints = await streamCache.getData(key);
    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: 流缓存读取结果", {
        key,
        symbol,
        rawPointsCount: Array.isArray(rawPoints) ? rawPoints.length : 0,
        hasRawPoints: Array.isArray(rawPoints) && rawPoints.length > 0,
        rawFirstPoint: Array.isArray(rawPoints)
          ? this.buildRawPointPreview(rawPoints[0])
          : null,
        rawLastPoint: Array.isArray(rawPoints)
          ? this.buildRawPointPreview(rawPoints[rawPoints.length - 1])
          : null,
      });
    }
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

    if (this.shouldTraceDebug()) {
      this.logger.debug("分时诊断: 流缓存过滤后点位", {
        key,
        symbol,
        market,
        tradingDay,
        filteredPointsCount: points.length,
        firstTimestamp: points[0]?.timestamp || null,
        lastTimestamp: points[points.length - 1]?.timestamp || null,
        firstPoint: this.buildPointPreview(points[0]),
        lastPoint: this.buildPointPreview(points[points.length - 1]),
      });
    }

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

  private flattenHistoryRows(
    rows: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const flattened: Record<string, unknown>[] = [];
    let hasNested = false;

    for (const row of rows) {
      const respList = (row as { respList?: unknown })?.respList;
      if (Array.isArray(respList)) {
        hasNested = true;
        for (const item of respList) {
          if (item && typeof item === "object") {
            flattened.push(item as Record<string, unknown>);
          }
        }
      } else {
        flattened.push(row);
      }
    }

    return hasNested ? flattened : rows;
  }

  private resolveContext(request: {
    symbol: string;
    market?: string;
    tradingDay?: string;
    provider?: string;
  }): ResolvedIntradayContext {
    const symbol = String(request.symbol || "")
      .trim()
      .toUpperCase();
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
    const inferredMarket = isSupportedMarket(symbolSuffix) ? symbolSuffix : "";
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

    if (!isSupportedMarket(market)) {
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
      provider: this.resolveProvider(request.provider, market),
    };
  }

  private resolveProvider(
    provider: string | undefined,
    market: string,
  ): string {
    const normalized = String(provider || "")
      .trim()
      .toLowerCase();
    if (normalized) {
      return normalized;
    }

    const historyCapability = this.resolveHistoryCapabilityByMarket(market);

    try {
      const preferred =
        this.providerRegistryService.getBestProvider(
          historyCapability,
          market,
        ) || this.providerRegistryService.getBestProvider(historyCapability);
      if (preferred) {
        return String(preferred).trim().toLowerCase();
      }
    } catch {
      return ChartIntradayReadService.DEFAULT_PROVIDER;
    }

    return ChartIntradayReadService.DEFAULT_PROVIDER;
  }

  private resolveHistoryCapabilityByMarket(market: string): string {
    const normalizedMarket = String(market || "")
      .trim()
      .toUpperCase();
    switch (normalizedMarket) {
      case "CRYPTO":
        return CAPABILITY_NAMES.GET_CRYPTO_HISTORY;
      case "US":
      case "HK":
      case "CN":
      case "SH":
      case "SZ":
        return CAPABILITY_NAMES.GET_STOCK_HISTORY;
      case "INDEX":
      case "FOREX":
        throw this.createBusinessException({
          errorCode: BusinessErrorCode.INVALID_OPERATION,
          operation: "resolve_history_capability",
          message: `NOT_IMPLEMENTED: 分时历史暂不支持 ${normalizedMarket} 市场`,
          statusCode: HttpStatus.NOT_IMPLEMENTED,
          context: { market: normalizedMarket },
        });
      default:
        throw this.createBusinessException({
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "resolve_history_capability",
          message: "INVALID_ARGUMENT: market 暂未配置分时历史能力",
          statusCode: HttpStatus.BAD_REQUEST,
          context: { market: normalizedMarket || market },
        });
    }
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

  private resolveHistoryAnchorTimestampSeconds(
    tradingDay: string,
    market: string,
  ): number {
    const normalizedMarket = String(market || "")
      .trim()
      .toUpperCase();
    const timezone = resolveMarketTimezone(market);
    const [hour, minute, second] =
      normalizedMarket === "CRYPTO" ? [0, 0, 1] : [23, 59, 59];
    const utcMs = this.zonedDateTimeToUtcMs(
      tradingDay,
      hour,
      minute,
      second,
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

    // 某些运行时会把午夜格式化为 24:00:00，若直接传入 Date.UTC 会进位到次日，导致偏移误差一天。
    if (values.hour === 24) {
      values.hour = 0;
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

  private buildPointPreview(point?: IntradayPointDto | null): {
    timestamp: string | null;
    price: number | null;
    volume: number | null;
  } | null {
    if (!point) {
      return null;
    }

    return {
      timestamp: point.timestamp || null,
      price: Number.isFinite(point.price) ? point.price : null,
      volume: Number.isFinite(point.volume) ? point.volume : null,
    };
  }

  private buildRawPointPreview(point: unknown): {
    timestamp: string | null;
    price: number | null;
    volume: number | null;
  } | null {
    if (!point || typeof point !== "object") {
      return null;
    }

    const rawPoint = point as Record<string, unknown>;
    const timestampMs = this.parseTimestampToMs(rawPoint.t);
    const price = this.parseNumber(rawPoint.p);
    const volume = this.parseNumber(rawPoint.v ?? 0);

    return {
      timestamp: timestampMs ? new Date(timestampMs).toISOString() : null,
      price: Number.isFinite(price) ? price : null,
      volume: Number.isFinite(volume) ? volume : null,
    };
  }

  private shouldTraceDebug(): boolean {
    return shouldLog(ChartIntradayReadService.name, "debug");
  }

  private buildReleasePayload(
    market: string,
    released: ReleaseRealtimeSubscriptionResult,
  ): IntradayReleasePayloadDto {
    return {
      released: released.released,
      symbol: released.symbol,
      market,
      provider: released.provider,
      wsCapabilityType: released.wsCapabilityType,
    };
  }

  private async ensureRealtimeSubscription(
    resolved: ResolvedIntradayContext,
    operation: "snapshot" | "delta",
  ): Promise<void> {
    try {
      await this.chartIntradayStreamSubscriptionService.ensureRealtimeSubscription(
        {
          symbol: resolved.symbol,
          market: resolved.market,
          provider: resolved.provider,
        },
      );
    } catch (error: any) {
      this.logger.warn("分时实时订阅确保失败，降级为历史+缓存读取", {
        symbol: resolved.symbol,
        market: resolved.market,
        tradingDay: resolved.tradingDay,
        provider: resolved.provider,
        operation,
        error: error?.message,
      });
    }
  }

  private encodeCursor(payload: IntradayCursorPayload): string {
    return this.chartIntradayCursorService.encodeCursor(payload);
  }

  private decodeCursor(cursor: string): IntradayCursorPayload {
    return this.chartIntradayCursorService.decodeCursor(cursor);
  }

  private assertCursorValid(
    payload: IntradayCursorPayload,
    resolved: ResolvedIntradayContext,
    now: Date,
    strictProviderConsistency: boolean,
  ): void {
    this.chartIntradayCursorService.assertCursorValid(
      payload,
      resolved,
      now,
      strictProviderConsistency,
    );
  }

  private createBusinessException(options: {
    errorCode: BusinessErrorCode;
    operation: string;
    message: string;
    statusCode?: HttpStatus;
    context?: Record<string, unknown>;
  }): BusinessException {
    return UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_FETCHER,
      errorCode: options.errorCode,
      operation: options.operation,
      message: options.message,
      statusCode: options.statusCode,
      context: options.context || {},
    });
  }
}
