import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { createLogger } from "@common/logging/index";
import {
  buildCoinGeckoExternalApiError,
  throwCoinGeckoConfigurationError,
} from "../helpers/capability-context.helper";
import {
  COINGECKO_SYMBOL_LIMIT,
  normalizeAndValidateCoinGeckoCryptoSymbols,
  parseCoinGeckoCryptoSymbol,
  type ParsedCoinGeckoCryptoSymbol,
} from "../utils/coingecko-symbols.util";

interface CoinGeckoMarketItem {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number | null;
  market_cap?: number | null;
  market_cap_rank?: number | null;
  fully_diluted_valuation?: number | null;
  circulating_supply?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
}

@Injectable()
export class CoinGeckoContextService {
  private readonly logger = createLogger(CoinGeckoContextService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly vsCurrency: string;
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>("COINGECKO_BASE_URL") ||
      process.env.COINGECKO_BASE_URL ||
      "https://api.coingecko.com/api/v3"
    ).replace(/\/$/, "");
    this.apiKey =
      this.configService.get<string>("COINGECKO_API_KEY") ||
      process.env.COINGECKO_API_KEY ||
      "";
    this.timeoutMs = this.readNumericConfig("COINGECKO_HTTP_TIMEOUT_MS", 10000);
    this.vsCurrency = this.readVsCurrency();
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/ping", {
        headers: this.buildHeaders(),
      });
      return response?.data != null;
    } catch (error: any) {
      this.logger.warn("CoinGecko 连接测试失败", {
        operation: "test-connection",
        statusCode: error?.response?.status ?? null,
        errorMessage: this.sanitizeUpstreamMessage(
          error?.response?.data?.error ?? error?.message,
        ),
      });
      return false;
    }
  }

  async getCryptoBasicInfo(symbols: string[]): Promise<any[]> {
    const normalizedSymbols = normalizeAndValidateCoinGeckoCryptoSymbols(
      symbols,
      {
        allowEmpty: true,
        maxCount: COINGECKO_SYMBOL_LIMIT.REST,
      },
    );
    if (normalizedSymbols.length === 0) {
      return [];
    }

    const requests = normalizedSymbols.map((symbol) =>
      parseCoinGeckoCryptoSymbol(symbol),
    );
    const requestBaseSymbols = [...new Set(
      requests.map((request) => request.baseSymbol.toLowerCase()),
    )];

    try {
      const response = await this.client.get("/coins/markets", {
        headers: this.buildHeaders(),
        params: {
          vs_currency: this.vsCurrency,
          symbols: requestBaseSymbols.join(","),
          include_tokens: "top",
          order: "market_cap_desc",
          sparkline: false,
          locale: "en",
          per_page: Math.max(requestBaseSymbols.length, 1),
          page: 1,
        },
      });

      const items = response?.data;
      if (!Array.isArray(items)) {
        throw buildCoinGeckoExternalApiError(
          "CoinGecko crypto-basic-info 响应异常",
          {
            operation: "crypto-basic-info",
            upstream: {
              status: response?.status ?? null,
              bodyType: typeof items,
            },
          },
          "crypto-basic-info",
        );
      }

      const itemMap = this.groupMarketItemsBySymbol(items);
      const results: any[] = [];

      for (const request of requests) {
        const matchedItem = itemMap.get(request.baseSymbol.toLowerCase())?.[0];
        if (!matchedItem) {
          continue;
        }

        results.push(this.buildCryptoBasicInfoRecord(request, matchedItem));
      }

      return results;
    } catch (error: any) {
      if (error?.errorCode) {
        throw error;
      }

      throw buildCoinGeckoExternalApiError(
        "CoinGecko crypto-basic-info 请求失败",
        {
          operation: "crypto-basic-info",
          symbols: normalizedSymbols,
          requestBaseSymbols,
          upstream: {
            status: error?.response?.status ?? null,
            message: this.sanitizeUpstreamMessage(
              error?.response?.data?.error ??
                error?.response?.data?.message ??
                error?.message,
            ),
          },
        },
        "crypto-basic-info",
      );
    }
  }

  private buildHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {};
    }

    return {
      "x-cg-demo-api-key": this.apiKey,
    };
  }

  private groupMarketItemsBySymbol(
    items: CoinGeckoMarketItem[],
  ): Map<string, CoinGeckoMarketItem[]> {
    const grouped = new Map<string, CoinGeckoMarketItem[]>();

    for (const item of items) {
      const normalizedSymbol = String(item?.symbol || "")
        .trim()
        .toLowerCase();
      if (!normalizedSymbol) {
        continue;
      }

      const bucket = grouped.get(normalizedSymbol) || [];
      bucket.push(item);
      bucket.sort((left, right) => {
        const leftRank = Number.isFinite(left.market_cap_rank)
          ? Number(left.market_cap_rank)
          : Number.MAX_SAFE_INTEGER;
        const rightRank = Number.isFinite(right.market_cap_rank)
          ? Number(right.market_cap_rank)
          : Number.MAX_SAFE_INTEGER;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        const leftCap = Number(left.market_cap ?? 0);
        const rightCap = Number(right.market_cap ?? 0);
        return rightCap - leftCap;
      });
      grouped.set(normalizedSymbol, bucket);
    }

    return grouped;
  }

  private buildCryptoBasicInfoRecord(
    request: ParsedCoinGeckoCryptoSymbol,
    item: CoinGeckoMarketItem,
  ) {
    return {
      symbol: request.standardSymbol,
      market: "CRYPTO",
      name_en: item.name || request.baseSymbol,
      exchange: "COINGECKO",
      currency: this.vsCurrency.toUpperCase(),
      board: "CRYPTO",
      current_price: item.current_price ?? null,
      market_cap: item.market_cap ?? null,
      market_cap_rank: item.market_cap_rank ?? null,
      circulating_supply: item.circulating_supply ?? null,
      total_supply: item.total_supply ?? null,
      max_supply: item.max_supply ?? null,
      fully_diluted_valuation: item.fully_diluted_valuation ?? null,
      coingecko_id: item.id || null,
      coingecko_symbol: item.symbol
        ? String(item.symbol).trim().toUpperCase()
        : request.baseSymbol,
      quote_symbol: request.quoteSymbol,
    };
  }

  private readNumericConfig(key: string, fallback: number): number {
    const rawValue = this.configService.get<string | number>(key);
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      throwCoinGeckoConfigurationError(
        `${key} 配置无效，必须是正整数`,
        {
          key,
          value: rawValue,
        },
        "readNumericConfig",
      );
    }

    return parsed;
  }

  private readVsCurrency(): string {
    const rawValue =
      this.configService.get<string>("COINGECKO_VS_CURRENCY") ||
      process.env.COINGECKO_VS_CURRENCY ||
      "usd";
    const normalized = String(rawValue || "").trim().toLowerCase();

    if (!normalized) {
      throwCoinGeckoConfigurationError(
        "COINGECKO_VS_CURRENCY 配置无效",
        {
          value: rawValue,
        },
        "readVsCurrency",
      );
    }

    return normalized;
  }

  private sanitizeUpstreamMessage(message: unknown): string {
    if (message == null) {
      return "";
    }

    if (typeof message === "string") {
      return message.slice(0, 500);
    }

    return String(message).slice(0, 500);
  }
}
