import { throwInfowayDataValidationError } from "../helpers/capability-context.helper";

export type InfowayMarketCode = "HK" | "US" | "CN";

const INFOWAY_SYMBOL_PATTERN = /^(?:[A-Z0-9]+(?:[._-][A-Z0-9]+)*)\.(HK|US|SH|SZ)$/;
const INFOWAY_SYMBOL_MAX_LENGTH = 32;
const INFOWAY_MARKET_STABLE_ORDER: InfowayMarketCode[] = ["HK", "US", "CN"];

export const INFOWAY_SYMBOL_LIMIT = {
  REST: 600,
  WS: 600,
  HISTORY_SINGLE: 1,
} as const;

export interface NormalizeSymbolsOptions {
  maxCount: number;
  allowEmpty?: boolean;
  paramName?: string;
}

export function normalizeAndValidateInfowaySymbols(
  symbolsInput: unknown,
  options: NormalizeSymbolsOptions,
): string[] {
  const paramName = options.paramName || "symbols";

  if (!Array.isArray(symbolsInput)) {
    throwInfowayDataValidationError(`Infoway 参数错误: ${paramName} 必须是数组`, {
      paramName,
      receivedType: typeof symbolsInput,
    }, "normalizeAndValidateInfowaySymbols");
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of symbolsInput) {
    const symbol = String(raw || "").trim().toUpperCase();
    if (!symbol) {
      continue;
    }

    if (symbol.length > INFOWAY_SYMBOL_MAX_LENGTH) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: symbol 长度超过限制（${INFOWAY_SYMBOL_MAX_LENGTH}）`,
        {
          symbol,
          maxLength: INFOWAY_SYMBOL_MAX_LENGTH,
        },
        "normalizeAndValidateInfowaySymbols",
      );
    }

    if (!INFOWAY_SYMBOL_PATTERN.test(symbol)) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: symbol 格式无效（仅支持 *.HK/*.US/*.SH/*.SZ）",
        {
          symbol,
        },
        "normalizeAndValidateInfowaySymbols",
      );
    }

    if (!seen.has(symbol)) {
      seen.add(symbol);
      normalized.push(symbol);
    }
  }

  if (normalized.length > options.maxCount) {
    throwInfowayDataValidationError(
      `Infoway 参数错误: symbols 数量超过上限（最多 ${options.maxCount} 个）`,
      {
        currentCount: normalized.length,
        maxCount: options.maxCount,
      },
      "normalizeAndValidateInfowaySymbols",
    );
  }

  if (!options.allowEmpty && normalized.length === 0) {
    throwInfowayDataValidationError(`Infoway 参数错误: ${paramName} 不能为空`, {
      paramName,
    }, "normalizeAndValidateInfowaySymbols");
  }

  return normalized;
}

export function normalizeInfowayMarketCode(value: unknown): InfowayMarketCode | "" {
  const market = String(value || "").trim().toUpperCase();
  if (market === "HK") return "HK";
  if (market === "US") return "US";
  if (market === "CN" || market === "SH" || market === "SZ") return "CN";
  return "";
}

export function inferInfowayMarketsFromSymbols(
  symbols: string[],
): Set<InfowayMarketCode> {
  const markets = new Set<InfowayMarketCode>();

  for (const symbol of symbols) {
    const market = resolveInfowayMarketFromSymbol(symbol);
    if (market) {
      markets.add(market);
    }
  }

  return markets;
}

export function inferSingleInfowayMarketFromSymbols(
  symbols: string[],
): InfowayMarketCode | "" {
  const markets = inferInfowayMarketsFromSymbols(symbols);
  if (markets.size === 0) {
    return "";
  }
  if (markets.size > 1) {
    const conflictSamples = buildInfowayMarketConflictSamples(symbols, markets);
    throwInfowayDataValidationError(
      `Infoway 参数错误: symbols 包含多个市场，冲突样本=${conflictSamples}，请显式传入 market`,
      {
        symbols,
        conflictSamples,
      },
      "inferSingleInfowayMarketFromSymbols",
    );
  }
  return markets.values().next().value || "";
}

function resolveInfowayMarketFromSymbol(symbol: unknown): InfowayMarketCode | "" {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (normalized.endsWith(".US")) return "US";
  if (normalized.endsWith(".HK")) return "HK";
  if (normalized.endsWith(".SH") || normalized.endsWith(".SZ")) return "CN";
  return "";
}

function buildInfowayMarketConflictSamples(
  symbols: string[],
  markets: Set<InfowayMarketCode>,
): string {
  const sampleByMarket = new Map<InfowayMarketCode, string>();

  for (const symbol of symbols) {
    const market = resolveInfowayMarketFromSymbol(symbol);
    if (!market || sampleByMarket.has(market)) {
      continue;
    }
    const normalizedSymbol = String(symbol || "").trim().toUpperCase();
    if (normalizedSymbol) {
      sampleByMarket.set(market, normalizedSymbol);
    }
  }

  return INFOWAY_MARKET_STABLE_ORDER
    .filter((market) => markets.has(market))
    .map((market) => `${market}:${sampleByMarket.get(market) || "-"}`)
    .join(", ");
}
