import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { createLogger } from "@common/logging/index";
import { validateYmdDateRange } from "@core/shared/utils/ymd-date.util";
import {
  throwInfowayConfigurationError,
  throwInfowayDataValidationError,
} from "../helpers/capability-context.helper";
import {
  formatInfowayYmd,
  formatInfowayYmdByMarket,
  normalizeInfowayDay,
} from "../utils/infoway-datetime.util";
import {
  buildInfowayFixedError,
  sanitizeInfowayUpstreamMessage,
} from "../utils/infoway-error.util";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowayCryptoSymbols,
  inferSingleInfowayMarketFromSymbols,
  normalizeAndValidateInfowaySymbols,
  normalizeInfowayMarketCode,
  toInfowayCryptoUpstreamSymbols,
} from "../utils/infoway-symbols.util";
import {
  normalizeInfowaySupportListSymbols,
  normalizeInfowaySupportListType,
} from "../utils/infoway-support-list.util";

interface InfowayKlineItem {
  t?: string | number;
  h?: string;
  o?: string;
  l?: string;
  c?: string;
  v?: string;
  vw?: string;
  vm?: string;
  pc?: string;
  pca?: string;
}

interface InfowayKlineRespEntry {
  s?: string;
  respList?: InfowayKlineItem[];
}

interface InfowayTradeItem {
  s?: string;
  t?: string | number;
  p?: string;
  v?: string;
  vw?: string;
  td?: string | number;
}

interface InfowayHistoryParams {
  symbols: string[];
  market?: string;
  klineType?: number | string;
  klineNum?: number | string;
  timestamp?: number;
}

interface InfowayCryptoHistoryParams {
  symbols: string[];
  market?: string;
  klineNum?: number | string;
  timestamp?: number;
}

const MAX_TRADING_DAYS_RANGE = 366;
const MAX_INTRADAY_KLINE_NUM = 500;
const MAX_QUOTE_BATCH_TRADE_PATH_LENGTH = 7000;
const STOCK_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX = "/stock/batch_trade/";
const CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX = "/crypto/batch_trade/";
const ALLOWED_HISTORY_KLINE_TYPES = new Set([1, 5, 15, 30, 60]);
const INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE =
  "Infoway 参数错误: timestamp 必须是 10/13 位正整数时间戳";

@Injectable()
export class InfowayContextService {
  private readonly logger = createLogger(InfowayContextService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly intradayKlineType: number;
  private readonly intradayKlineNum: number;
  private readonly intradayLookbackDays: number;

  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>("INFOWAY_BASE_URL") ||
      "https://data.infoway.io"
    ).replace(/\/$/, "");
    this.apiKey =
      this.configService.get<string>("INFOWAY_API_KEY") ||
      process.env.INFOWAY_API_KEY ||
      "";
    this.timeoutMs = this.readNumericConfig("INFOWAY_HTTP_TIMEOUT_MS", 10000, {
      min: 1,
      integer: true,
    });
    const configuredIntradayKlineType = this.readNumericConfig(
      "INFOWAY_INTRADAY_KLINE_TYPE",
      1,
      {
        min: 1,
        integer: true,
      },
    );
    this.intradayKlineType = this.normalizeConfiguredHistoryKlineType(
      configuredIntradayKlineType,
    );
    this.intradayKlineNum = this.readNumericConfig(
      "INFOWAY_INTRADAY_KLINE_NUM",
      240,
      {
        min: 1,
        integer: true,
      },
    );
    this.intradayLookbackDays = this.readNumericConfig(
      "INFOWAY_INTRADAY_LOOKBACK_DAYS",
      1,
      {
        min: 1,
        integer: true,
      },
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureConfigured();
      const response = await this.client.get("/common/basic/markets", {
        headers: { apiKey: this.apiKey },
      });
      const body = response?.data || {};
      this.assertInfowayResponse(
        body,
        "test-connection",
        (data) => Array.isArray(data),
      );
      return true;
    } catch (error: any) {
      const upstreamRet =
        error?.context?.upstream?.ret ??
        error?.response?.data?.ret ??
        error?.response?.status ??
        null;
      const upstreamMsg = sanitizeInfowayUpstreamMessage(
        error?.context?.upstream?.msg ??
          error?.response?.data?.msg ??
          error?.message,
      );
      this.logger.warn("Infoway 连接测试失败", {
        operation: "test-connection",
        errorCode: error?.errorCode ?? null,
        reason: error?.message ?? "unknown",
        upstreamRet,
        upstreamMsg,
      });
      return false;
    }
  }

  async getStockQuote(symbols: string[]): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowaySymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });

    if (normalizedSymbols.length === 0) {
      return [];
    }

    const quoteBatches = this.buildQuoteSymbolBatches(
      normalizedSymbols,
      STOCK_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
    );
    const tradeItems: InfowayTradeItem[] = [];

    for (const batchSymbols of quoteBatches) {
      const batchTradeItems = await this.fetchQuoteBatchTradeItemsWithRetry(
        batchSymbols,
        STOCK_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
        "quote",
      );
      tradeItems.push(...batchTradeItems);
    }

    this.logger.debug("Infoway REST 报价获取成功", {
      requested: normalizedSymbols.length,
      received: tradeItems.length,
      endpoint: STOCK_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
      batchCount: quoteBatches.length,
    });

    return tradeItems;
  }

  async getCryptoQuote(symbols: string[]): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowayCryptoSymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const upstreamSymbols = toInfowayCryptoUpstreamSymbols(normalizedSymbols);

    if (upstreamSymbols.length === 0) {
      return [];
    }

    const quoteBatches = this.buildQuoteSymbolBatches(
      upstreamSymbols,
      CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
    );
    const tradeItems: InfowayTradeItem[] = [];

    for (const batchSymbols of quoteBatches) {
      const batchTradeItems = await this.fetchQuoteBatchTradeItemsWithRetry(
        batchSymbols,
        CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
        "crypto-quote",
      );
      tradeItems.push(...batchTradeItems);
    }

    this.logger.debug("Infoway REST 加密货币报价获取成功", {
      requested: upstreamSymbols.length,
      received: tradeItems.length,
      endpoint: CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
      batchCount: quoteBatches.length,
    });

    return tradeItems;
  }

  async getCryptoHistory(params: InfowayCryptoHistoryParams): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowayCryptoSymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE,
      },
    );
    const upstreamSymbols = toInfowayCryptoUpstreamSymbols(normalizedSymbols);
    if (upstreamSymbols.length === 0) {
      return [];
    }

    const effectiveKlineNum = this.resolveHistoryKlineNum(params.klineNum);
    const historyTimestamp = this.resolveHistoryTimestamp(params.timestamp);
    const quoteItems = await this.fetchCryptoQuoteByUpstreamSymbols(upstreamSymbols);
    const historyData = this.buildCryptoHistoryFromTrades(
      quoteItems,
      historyTimestamp,
      effectiveKlineNum,
    );

    this.logger.debug("Infoway REST 加密货币历史获取成功(基于trade聚合)", {
      requested: upstreamSymbols.length,
      receivedEntries: historyData.length,
      endpoint: CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
      hasTimestamp: Boolean(historyTimestamp),
      klineNum: effectiveKlineNum,
    });

    return historyData;
  }

  private buildQuoteSymbolBatches(
    symbols: string[],
    endpointPrefix: string,
  ): string[][] {
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentSymbolsLength = 0;

    for (const symbol of symbols) {
      const additionalLength = (currentBatch.length > 0 ? 1 : 0) + symbol.length;
      const projectedPathLength =
        endpointPrefix.length + currentSymbolsLength + additionalLength;

      if (
        currentBatch.length > 0 &&
        projectedPathLength > MAX_QUOTE_BATCH_TRADE_PATH_LENGTH
      ) {
        batches.push(currentBatch);
        currentBatch = [symbol];
        currentSymbolsLength = symbol.length;
        continue;
      }

      currentBatch.push(symbol);
      currentSymbolsLength += additionalLength;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async fetchQuoteBatchTradeItemsWithRetry(
    batchSymbols: string[],
    endpointPrefix: string,
    operation: string,
  ): Promise<InfowayTradeItem[]> {
    try {
      return await this.fetchQuoteBatchTradeItems(
        batchSymbols,
        endpointPrefix,
        operation,
      );
    } catch (error: any) {
      if (!this.isUriTooLongError(error) || batchSymbols.length <= 1) {
        throw error;
      }

      const splitIndex = Math.ceil(batchSymbols.length / 2);
      const left = await this.fetchQuoteBatchTradeItemsWithRetry(
        batchSymbols.slice(0, splitIndex),
        endpointPrefix,
        operation,
      );
      const right = await this.fetchQuoteBatchTradeItemsWithRetry(
        batchSymbols.slice(splitIndex),
        endpointPrefix,
        operation,
      );
      return [...left, ...right];
    }
  }

  private async fetchQuoteBatchTradeItems(
    batchSymbols: string[],
    endpointPrefix: string,
    operation: string,
  ): Promise<InfowayTradeItem[]> {
    const response = await this.client.get(`${endpointPrefix}${batchSymbols.join(",")}`, {
      headers: { apiKey: this.apiKey },
    });

    const body = response.data || {};
    this.assertInfowayResponse(body, operation, (data) => Array.isArray(data));

    return body.data as InfowayTradeItem[];
  }

  private async fetchCryptoQuoteByUpstreamSymbols(
    upstreamSymbols: string[],
  ): Promise<InfowayTradeItem[]> {
    const quoteBatches = this.buildQuoteSymbolBatches(
      upstreamSymbols,
      CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
    );
    const tradeItems: InfowayTradeItem[] = [];

    for (const batchSymbols of quoteBatches) {
      const batchTradeItems = await this.fetchQuoteBatchTradeItemsWithRetry(
        batchSymbols,
        CRYPTO_QUOTE_BATCH_TRADE_ENDPOINT_PREFIX,
        "crypto-quote",
      );
      tradeItems.push(...batchTradeItems);
    }

    return tradeItems;
  }

  private buildCryptoHistoryFromTrades(
    tradeItems: InfowayTradeItem[],
    historyTimestampSeconds?: number,
    klineNum = 1,
  ): InfowayKlineRespEntry[] {
    const historyTimestampMs =
      typeof historyTimestampSeconds === "number"
        ? historyTimestampSeconds * 1000
        : undefined;

    const grouped = new Map<string, InfowayKlineItem[]>();

    for (const trade of tradeItems) {
      const symbol = String(trade?.s || "").trim().toUpperCase();
      if (!symbol) {
        continue;
      }

      const timestampMs = this.normalizeTradeTimestampToMillis(trade?.t);
      if (
        typeof historyTimestampMs === "number" &&
        Number.isFinite(timestampMs) &&
        timestampMs < historyTimestampMs
      ) {
        continue;
      }

      const price = String(trade?.p ?? "").trim();
      if (!price) {
        continue;
      }

      const point: InfowayKlineItem = {
        t: Number.isFinite(timestampMs)
          ? Math.trunc(timestampMs / 1000)
          : trade?.t,
        o: price,
        h: price,
        l: price,
        c: price,
        v: String(trade?.v ?? "0"),
        vw: String(trade?.vw ?? "0"),
        vm: String(trade?.vw ?? "0"),
        pc: "0",
        pca: "0",
      };

      if (!grouped.has(symbol)) {
        grouped.set(symbol, []);
      }
      grouped.get(symbol)!.push(point);
    }

    const results: InfowayKlineRespEntry[] = [];
    for (const [symbol, points] of grouped.entries()) {
      const sortedPoints = points
        .slice()
        .sort((left, right) => Number(left.t || 0) - Number(right.t || 0));
      const truncatedPoints =
        sortedPoints.length > klineNum
          ? sortedPoints.slice(sortedPoints.length - klineNum)
          : sortedPoints;
      results.push({
        s: symbol,
        respList: truncatedPoints,
      });
    }

    return results;
  }

  private normalizeTradeTimestampToMillis(
    timestamp: string | number | undefined,
  ): number {
    const numericTimestamp = Number(timestamp);
    if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
      return Number.NaN;
    }

    const digitCount = Math.abs(Math.trunc(numericTimestamp))
      .toString()
      .length;
    if (digitCount === 10) {
      return Math.trunc(numericTimestamp * 1000);
    }
    return Math.trunc(numericTimestamp);
  }

  private isUriTooLongError(error: unknown): boolean {
    const status = (error as any)?.response?.status;
    if (status === 414) {
      return true;
    }
    const message = String((error as any)?.message || "").toLowerCase();
    return message.includes("uri too long");
  }

  async getStockHistory(params: InfowayHistoryParams): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowaySymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE, // MVP: 单标的优先，避免多标的根数受限
      },
    );
    if (normalizedSymbols.length === 0) {
      return [];
    }

    const normalizedMarketHint = this.normalizeStockInfoMarketHint(
      params.market,
      "getStockHistory",
    );
    const inferredMarket = inferSingleInfowayMarketFromSymbols(normalizedSymbols);
    if (
      normalizedMarketHint &&
      inferredMarket &&
      normalizedMarketHint !== inferredMarket
    ) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 与 symbol 推断市场冲突，请显式修正参数",
        {
          market: normalizedMarketHint,
          symbols: normalizedSymbols,
          inferredMarket,
        },
        "getStockHistory",
      );
    }

    const effectiveKlineNum = this.resolveHistoryKlineNum(params.klineNum);
    const effectiveKlineType = this.resolveHistoryKlineType(params.klineType);
    const historyTimestamp = this.resolveHistoryTimestamp(params.timestamp);
    const payload: Record<string, any> = {
      klineType: effectiveKlineType,
      klineNum: effectiveKlineNum,
      codes: normalizedSymbols.join(","),
    };
    if (historyTimestamp) {
      payload.timestamp = historyTimestamp;
    }

    const response = await this.client.post("/stock/v2/batch_kline", payload, {
      headers: { apiKey: this.apiKey },
    });

    const body = response.data || {};
    this.assertInfowayResponse(
      body,
      "stock-history",
      (data) => Array.isArray(data),
    );

    const historyData = body.data as InfowayKlineRespEntry[];
    const pointCount = historyData.reduce((count, entry) => {
      if (!Array.isArray(entry?.respList)) {
        return count;
      }
      return count + entry.respList.length;
    }, 0);

    this.logger.debug("Infoway 分时历史获取成功", {
      requested: normalizedSymbols.length,
      receivedEntries: historyData.length,
      receivedPoints: pointCount,
      klineType: effectiveKlineType,
      klineNum: effectiveKlineNum,
      hasTimestamp: Boolean(historyTimestamp),
    });

    return historyData;
  }

  async getMarketStatus(markets?: string[]): Promise<any[]> {
    await this.ensureConfigured();

    const response = await this.client.get("/common/basic/markets", {
      headers: { apiKey: this.apiKey },
    });

    const body = response.data || {};
    this.assertInfowayResponse(
      body,
      "market-status",
      (data) => Array.isArray(data),
    );

    const expectedMarkets = new Set(
      (markets || []).map((value) => normalizeInfowayMarketCode(value)).filter(Boolean),
    );
    const rawItems = body.data as Array<Record<string, any>>;

    if (expectedMarkets.size === 0) {
      return rawItems;
    }

    return rawItems.filter((item) =>
      expectedMarkets.has(normalizeInfowayMarketCode(item?.market)),
    );
  }

  async getTradingDays(params: {
    market?: string;
    symbols?: string[];
    beginDay?: string;
    endDay?: string;
  }): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowaySymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: INFOWAY_SYMBOL_LIMIT.REST,
      },
    );
    const hasExplicitMarket = params.market !== undefined && params.market !== null;
    let market = "";

    if (hasExplicitMarket) {
      market = normalizeInfowayMarketCode(params.market);
      if (!market) {
        throwInfowayDataValidationError(
          "Infoway 参数错误: market 必须是合法市场代码（US/HK/CN/SH/SZ）",
          {
            market: params.market,
          },
          "getTradingDays",
        );
      }
    } else {
      market = inferSingleInfowayMarketFromSymbols(normalizedSymbols);
      if (!market) {
        throwInfowayDataValidationError(
          "Infoway 参数错误: 请显式传入 market 或提供可推断市场的 symbols",
          {
            symbols: normalizedSymbols,
          },
          "getTradingDays",
        );
      }
    }

    const { beginDay, endDay } = this.resolveDayRange(
      params.beginDay,
      params.endDay,
      market,
    );

    const response = await this.client.get("/common/basic/markets/trading_days", {
      headers: { apiKey: this.apiKey },
      params: {
        market,
        beginDay,
        endDay,
      },
    });

    const body = response.data || {};
    this.assertInfowayResponse(
      body,
      "trading-days",
      (data) => !!data && typeof data === "object",
    );

    return [body.data];
  }

  async getSupportList(params: {
    type: string;
    symbols?: unknown;
  }): Promise<any[]> {
    await this.ensureConfigured();

    const type = normalizeInfowaySupportListType(params.type, {
      operation: "getSupportList",
    });
    const symbols = normalizeInfowaySupportListSymbols(params.symbols, {
      allowEmpty: true,
      operation: "getSupportList",
    });

    const response = await this.client.get("/common/basic/symbols", {
      headers: { apiKey: this.apiKey },
      params: {
        type,
        ...(symbols.length > 0 ? { symbols: symbols.join(",") } : {}),
      },
    });

    const body = response.data || {};
    this.assertInfowayResponse(
      body,
      "support-list",
      (data) => Array.isArray(data),
    );

    return body.data as Array<Record<string, any>>;
  }

  async getStockBasicInfo(symbols: string[], marketHint?: string): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowaySymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const normalizedMarketHint = this.normalizeStockInfoMarketHint(
      marketHint,
      "getStockBasicInfo",
    );

    if (normalizedSymbols.length === 0) {
      return [];
    }

    const grouped = new Map<string, string[]>();
    for (const symbol of normalizedSymbols) {
      const type = this.resolveStockInfoType(symbol, normalizedMarketHint);
      if (!type) {
        this.logger.warn("Infoway 无法根据符号推断基础信息 type，已跳过", {
          symbol,
          marketHint: normalizedMarketHint,
        });
        continue;
      }
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(symbol);
    }

    const results: any[] = [];
    for (const [type, typeSymbols] of grouped.entries()) {
      const chunks = this.chunkArray(typeSymbols, 500);
      for (const chunk of chunks) {
        const response = await this.client.get("/common/basic/symbols/info", {
          headers: { apiKey: this.apiKey },
          params: {
            type,
            symbols: chunk.join(","),
          },
        });

        const body = response.data || {};
        this.assertInfowayResponse(
          body,
          "basic-info",
          (data) => Array.isArray(data),
        );

        results.push(...(body.data as Array<Record<string, any>>));
      }
    }

    return results;
  }

  async getCryptoBasicInfo(symbols: string[]): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowayCryptoSymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const upstreamSymbols = toInfowayCryptoUpstreamSymbols(normalizedSymbols);
    if (upstreamSymbols.length === 0) {
      return [];
    }

    const results: any[] = [];
    const chunks = this.chunkArray(upstreamSymbols, 500);
    for (const chunk of chunks) {
      const response = await this.client.get("/common/basic/symbols/info", {
        headers: { apiKey: this.apiKey },
        params: {
          type: "CRYPTO",
          symbols: chunk.join(","),
        },
      });

      const body = response.data || {};
      this.assertInfowayResponse(
        body,
        "crypto-basic-info",
        (data) => Array.isArray(data),
      );

      results.push(...(body.data as Array<Record<string, any>>));
    }

    return results;
  }

  private resolveHistoryKlineNum(klineNumInput?: number | string): number {
    const defaultKlineNum = Math.max(
      1,
      Math.min(
        this.intradayKlineNum,
        this.intradayLookbackDays * 24 * 60,
        MAX_INTRADAY_KLINE_NUM,
      ),
    );
    if (klineNumInput === undefined || klineNumInput === null || klineNumInput === "") {
      return defaultKlineNum;
    }

    const parsed = Number(klineNumInput);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: klineNum 必须是正整数",
        {
          klineNum: klineNumInput,
        },
        "getStockHistory",
      );
    }

    if (parsed > MAX_INTRADAY_KLINE_NUM) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: klineNum 不能超过 ${MAX_INTRADAY_KLINE_NUM}`,
        {
          klineNum: parsed,
          maxKlineNum: MAX_INTRADAY_KLINE_NUM,
        },
        "getStockHistory",
      );
    }

    return parsed;
  }

  private resolveHistoryKlineType(klineTypeInput?: number | string): number {
    if (klineTypeInput === undefined || klineTypeInput === null) {
      return this.intradayKlineType;
    }
    if (
      typeof klineTypeInput === "string" &&
      klineTypeInput.trim() === ""
    ) {
      return this.intradayKlineType;
    }

    const parsed = Number(klineTypeInput);
    const isValid =
      Number.isFinite(parsed) &&
      Number.isInteger(parsed) &&
      ALLOWED_HISTORY_KLINE_TYPES.has(parsed);
    if (isValid) {
      return parsed;
    }

    this.logger.warn("Infoway 历史请求 klineType 非法，已回退默认值", {
      klineType: String(klineTypeInput),
      defaultKlineType: this.intradayKlineType,
    });
    return this.intradayKlineType;
  }

  private normalizeConfiguredHistoryKlineType(klineType: number): number {
    if (ALLOWED_HISTORY_KLINE_TYPES.has(klineType)) {
      return klineType;
    }

    this.logger.warn("Infoway 默认历史 klineType 不受支持，已回退到 1 分钟", {
      klineType,
      fallbackKlineType: 1,
    });
    return 1;
  }

  private resolveHistoryTimestamp(timestampInput?: number): number | undefined {
    if (timestampInput === undefined || timestampInput === null) {
      return undefined;
    }

    if (
      typeof timestampInput !== "number" ||
      !Number.isSafeInteger(timestampInput) ||
      timestampInput <= 0
    ) {
      throwInfowayDataValidationError(
        INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE,
        {
          timestamp: timestampInput,
        },
        "getStockHistory",
      );
    }

    const digitCount = Math.abs(timestampInput).toString().length;
    if (digitCount === 10) {
      return timestampInput;
    }
    if (digitCount === 13) {
      return Math.trunc(timestampInput / 1000);
    }

    throwInfowayDataValidationError(
      INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE,
      {
        timestamp: timestampInput,
      },
      "getStockHistory",
    );
  }

  private async ensureConfigured(): Promise<void> {
    if (!this.apiKey) {
      throwInfowayConfigurationError(
        "INFOWAY_API_KEY 未配置",
        {
          configKey: "INFOWAY_API_KEY",
        },
        "ensureConfigured",
      );
    }
  }

  private readNumericConfig(
    key: string,
    defaultValue: number,
    options?: {
      min?: number;
      integer?: boolean;
    },
  ): number {
    const rawValue = this.configService.get<unknown>(key);
    if (rawValue === undefined || rawValue === null) {
      return defaultValue;
    }
    if (typeof rawValue === "string" && rawValue.trim() === "") {
      return defaultValue;
    }

    const parsed = Number(rawValue);
    const min = options?.min ?? Number.NEGATIVE_INFINITY;
    const requireInteger = options?.integer ?? false;
    const isValid =
      Number.isFinite(parsed) &&
      parsed >= min &&
      (!requireInteger || Number.isInteger(parsed));

    if (isValid) {
      return parsed;
    }

    this.logger.warn("Infoway 配置值非法，已回退默认值", {
      key,
      value: String(rawValue),
      defaultValue,
      min,
      requireInteger,
    });
    return defaultValue;
  }


  private normalizeStockInfoMarketHint(
    marketHint?: string,
    operation = "getStockBasicInfo",
  ): string {
    const hasMarketHint =
      marketHint !== undefined &&
      marketHint !== null &&
      String(marketHint).trim() !== "";
    if (!hasMarketHint) {
      return "";
    }

    const normalizedMarketHint = normalizeInfowayMarketCode(marketHint);
    if (!normalizedMarketHint) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 仅支持 HK/US/CN/SH/SZ",
        {
          market: marketHint,
        },
        operation,
      );
    }
    return normalizedMarketHint;
  }

  private resolveStockInfoType(symbol: string, marketHint: string): string {
    const inferredMarket = inferSingleInfowayMarketFromSymbols([symbol]);

    if (inferredMarket && marketHint && inferredMarket !== marketHint) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 与 symbol 推断市场冲突，请显式修正参数",
        {
          market: marketHint,
          symbol,
          inferredMarket,
        },
        "resolveStockInfoType",
      );
    }

    const market = inferredMarket || marketHint;

    if (market === "US") return "STOCK_US";
    if (market === "HK") return "STOCK_HK";
    if (market === "CN") return "STOCK_CN";
    return "";
  }

  private resolveDayRange(
    beginDayInput?: string,
    endDayInput?: string,
    market?: string,
  ): { beginDay: string; endDay: string } {
    let beginDay = normalizeInfowayDay(beginDayInput);
    let endDay = normalizeInfowayDay(endDayInput);

    if (beginDayInput && !beginDay) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: beginDay 必须是合法日期（YYYYMMDD 或 YYYY-MM-DD）",
        {
          beginDayInput,
        },
        "resolveDayRange",
      );
    }
    if (endDayInput && !endDay) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: endDay 必须是合法日期（YYYYMMDD 或 YYYY-MM-DD）",
        {
          endDayInput,
        },
        "resolveDayRange",
      );
    }

    const today = new Date();
    if (!beginDay && !endDay) {
      const normalizedMarket = normalizeInfowayMarketCode(market);
      endDay = normalizedMarket
        ? formatInfowayYmdByMarket(today, normalizedMarket)
        : formatInfowayYmd(today);
      const begin = new Date(Date.UTC(
        Number(endDay.slice(0, 4)),
        Number(endDay.slice(4, 6)) - 1,
        Number(endDay.slice(6, 8)),
      ));
      begin.setUTCDate(begin.getUTCDate() - 30);
      beginDay = formatInfowayYmd(begin);
    } else if (!beginDay && endDay) {
      beginDay = endDay;
    } else if (beginDay && !endDay) {
      endDay = beginDay;
    }

    if (beginDay! > endDay!) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: beginDay 不能晚于 endDay",
        {
          beginDay,
          endDay,
        },
        "resolveDayRange",
      );
    }

    const dateRangeValidation = validateYmdDateRange(beginDay!, endDay!, {
      strict: true,
      maxSpanDays: MAX_TRADING_DAYS_RANGE,
    });
    if (!dateRangeValidation.isValid) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: ${
          dateRangeValidation.message ||
          `日期跨度不能超过 ${MAX_TRADING_DAYS_RANGE} 天`
        }`,
        {
          beginDay,
          endDay,
          maxRangeDays: MAX_TRADING_DAYS_RANGE,
        },
        "resolveDayRange",
      );
    }

    return { beginDay: beginDay!, endDay: endDay! };
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }


  private assertInfowayResponse(
    body: any,
    operation: string,
    validateData: (data: unknown) => boolean,
  ): void {
    const ret = Number(body?.ret);
    if (ret === 200 && validateData(body?.data)) {
      return;
    }

    const upstreamRet = Number.isFinite(ret) ? ret : body?.ret;
    const upstreamMsg = sanitizeInfowayUpstreamMessage(body?.msg);
    this.logger.warn("Infoway 上游返回异常", {
      operation,
      ret: upstreamRet,
      msg: upstreamMsg,
    });
    throw buildInfowayFixedError(operation, {
      ret: upstreamRet,
      msg: body?.msg,
    });
  }

}
