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
  normalizeInfowayTimestampToIso,
} from "../utils/infoway-datetime.util";
import {
  buildInfowayFixedError,
  sanitizeInfowayUpstreamMessage,
} from "../utils/infoway-error.util";
import {
  INFOWAY_SYMBOL_LIMIT,
  inferSingleInfowayMarketFromSymbols,
  normalizeAndValidateInfowaySymbols,
  normalizeInfowayMarketCode,
} from "../utils/infoway-symbols.util";

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

interface InfowayMarketItem {
  market?: string;
  remark?: string;
  trade_schedules?: Array<{
    begin_time?: string;
    end_time?: string;
    type?: string;
  }>;
}

interface InfowayTradingDaysResp {
  trade_days?: string[];
  half_trade_days?: string[];
}

interface InfowayBasicInfoItem {
  symbol?: string;
  market?: string;
  name_cn?: string;
  name_en?: string;
  name_hk?: string;
  exchange?: string;
  currency?: string;
  lot_size?: number;
  total_shares?: number;
  circulating_shares?: number;
  hk_shares?: number;
  eps?: string;
  eps_ttm?: string;
  bps?: string;
  dividend_yield?: string;
  stock_derivatives?: string | number[] | string[];
  board?: string;
}

const MAX_TRADING_DAYS_RANGE = 366;

@Injectable()
export class InfowayContextService {
  private readonly logger = createLogger(InfowayContextService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly klineType: number;
  private readonly klineNum: number;

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
    this.klineType = this.readNumericConfig("INFOWAY_QUOTE_KLINE_TYPE", 1, {
      min: 1,
      integer: true,
    });
    this.klineNum = this.readNumericConfig("INFOWAY_QUOTE_KLINE_NUM", 1, {
      min: 1,
      integer: true,
    });

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

    const payload = {
      klineType: this.klineType,
      klineNum: this.klineNum,
      codes: normalizedSymbols.join(","),
    };

    const response = await this.client.post("/stock/v2/batch_kline", payload, {
      headers: { apiKey: this.apiKey },
    });

    const body = response.data || {};
    this.assertInfowayResponse(
      body,
      "quote",
      (data) => Array.isArray(data),
    );

    const quoteData = (body.data as InfowayKlineRespEntry[])
      .map((entry) => this.mapKlineEntryToQuote(entry))
      .filter(Boolean);

    this.logger.debug("Infoway REST 报价获取成功", {
      requested: normalizedSymbols.length,
      received: quoteData.length,
      klineType: this.klineType,
      klineNum: this.klineNum,
    });

    return quoteData;
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
    const mapped = (body.data as InfowayMarketItem[])
      .map((item) => this.mapMarketItemToStatus(item))
      .filter(Boolean)
      .filter((item) =>
        expectedMarkets.size === 0
          ? true
          : expectedMarkets.has(normalizeInfowayMarketCode(item.market)),
      );

    return mapped;
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

    const payload = body.data as InfowayTradingDaysResp;
    return [
      {
        market,
        beginDay,
        endDay,
        tradeDays: Array.isArray(payload.trade_days) ? payload.trade_days : [],
        halfTradeDays: Array.isArray(payload.half_trade_days)
          ? payload.half_trade_days
          : [],
        sourceProvider: "infoway",
      },
    ];
  }

  async getStockBasicInfo(symbols: string[], marketHint?: string): Promise<any[]> {
    await this.ensureConfigured();

    const normalizedSymbols = normalizeAndValidateInfowaySymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const normalizedMarketHint = this.normalizeStockInfoMarketHint(marketHint);

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

        const mapped = (body.data as InfowayBasicInfoItem[])
          .map((item) => this.mapBasicInfoItem(item))
          .filter(Boolean);
        results.push(...mapped);
      }
    }

    return results;
  }

  private mapKlineEntryToQuote(entry: InfowayKlineRespEntry): any | null {
    const symbol = String(entry?.s || "").trim().toUpperCase();
    const first = Array.isArray(entry?.respList) ? entry.respList[0] : null;
    if (!symbol || !first) {
      return null;
    }

    const lastPrice = this.toNumber(first.c);
    if (lastPrice == null) {
      return null;
    }

    const changeAmount = this.toNumber(first.pca);
    const previousClose =
      changeAmount == null ? null : this.normalizeNumber(lastPrice - changeAmount);
    const timestamp = normalizeInfowayTimestampToIso(first.t);
    if (!timestamp) {
      this.logger.warn("Infoway 行情时间戳解析失败，已丢弃脏数据", {
        symbol,
        rawTimestamp: first.t,
      });
      return null;
    }

    return {
      symbol,
      lastPrice,
      previousClose,
      openPrice: this.toNumber(first.o),
      highPrice: this.toNumber(first.h),
      lowPrice: this.toNumber(first.l),
      volume: this.toNumber(first.v),
      turnover: this.toNumber(first.vw ?? first.vm),
      change: changeAmount,
      changePercent: this.toPercentNumber(first.pc),
      timestamp,
      tradeStatus: "Normal",
      sourceProvider: "infoway",
      sourceSymbol: symbol,
    };
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

  private mapMarketItemToStatus(item: InfowayMarketItem): any | null {
    const market = normalizeInfowayMarketCode(item?.market);
    if (!market) {
      return null;
    }

    const schedules = Array.isArray(item.trade_schedules)
      ? item.trade_schedules
          .map((slot) => ({
            beginTime: String(slot?.begin_time || ""),
            endTime: String(slot?.end_time || ""),
            type: String(slot?.type || "Unknown"),
          }))
          .filter((slot) => slot.beginTime && slot.endTime)
      : [];

    return {
      market,
      remark: String(item?.remark || ""),
      tradeSchedules: schedules,
      sourceProvider: "infoway",
    };
  }

  private mapBasicInfoItem(item: InfowayBasicInfoItem): any | null {
    const symbol = String(item?.symbol || "").trim().toUpperCase();
    if (!symbol) {
      return null;
    }

    return {
      symbol,
      market: normalizeInfowayMarketCode(item.market),
      nameCn: item.name_cn || "",
      nameEn: item.name_en || "",
      nameHk: item.name_hk || "",
      exchange: item.exchange || "",
      currency: item.currency || "",
      lotSize: this.toNumber(item.lot_size),
      totalShares: this.toNumber(item.total_shares),
      circulatingShares: this.toNumber(item.circulating_shares),
      hkShares: this.toNumber(item.hk_shares),
      eps: item.eps ?? null,
      epsTtm: item.eps_ttm ?? null,
      bps: item.bps ?? null,
      dividendYield: item.dividend_yield ?? null,
      stockDerivatives: this.normalizeStockDerivatives(item.stock_derivatives),
      board: item.board || "",
      sourceProvider: "infoway",
      sourceSymbol: symbol,
    };
  }

  private normalizeStockDerivatives(value: unknown): Array<string | number> {
    if (Array.isArray(value)) {
      return value.filter((item) => item !== null && item !== undefined);
    }
    if (value === null || value === undefined) {
      return [];
    }
    const text = String(value).trim();
    if (!text) {
      return [];
    }
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeStockInfoMarketHint(marketHint?: string): string {
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
        "getStockBasicInfo",
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

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim().replace(/,/g, "");
    if (!text) {
      return null;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toPercentNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim().replace(/%/g, "");
    if (!text) {
      return null;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
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

  private normalizeNumber(value: number): number {
    return Number(value.toFixed(6));
  }
}
