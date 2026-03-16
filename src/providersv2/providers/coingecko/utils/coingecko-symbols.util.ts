import { throwCoinGeckoDataValidationError } from "../helpers/capability-context.helper";

const COINGECKO_CRYPTO_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}$/;
const COINGECKO_CRYPTO_SYMBOL_MAX_LENGTH = 20;
const COINGECKO_CRYPTO_QUOTE_SUFFIXES = [
  "USDT",
  "USDC",
  "BUSD",
  "FDUSD",
  "USD",
  "BTC",
  "ETH",
] as const;

export const COINGECKO_SYMBOL_LIMIT = {
  REST: 50,
} as const;

export interface NormalizeSymbolsOptions {
  maxCount: number;
  allowEmpty?: boolean;
  paramName?: string;
}

export interface ParsedCoinGeckoCryptoSymbol {
  standardSymbol: string;
  baseSymbol: string;
  quoteSymbol: string | null;
}

function normalizeSingleCoinGeckoCryptoSymbol(raw: unknown): string {
  return String(raw || "").trim().toUpperCase();
}

function findCoinGeckoQuoteSuffix(
  symbol: string,
): (typeof COINGECKO_CRYPTO_QUOTE_SUFFIXES)[number] | null {
  for (const suffix of COINGECKO_CRYPTO_QUOTE_SUFFIXES) {
    if (symbol.endsWith(suffix) && symbol.length > suffix.length) {
      return suffix;
    }
  }

  return null;
}

export function parseCoinGeckoCryptoSymbol(
  raw: unknown,
): ParsedCoinGeckoCryptoSymbol {
  const symbol = normalizeSingleCoinGeckoCryptoSymbol(raw);

  if (!symbol) {
    throwCoinGeckoDataValidationError(
      "CoinGecko 参数错误: crypto symbol 不能为空",
      {
        symbol,
      },
      "parseCoinGeckoCryptoSymbol",
    );
  }

  if (symbol.length > COINGECKO_CRYPTO_SYMBOL_MAX_LENGTH) {
    throwCoinGeckoDataValidationError(
      `CoinGecko 参数错误: crypto symbol 长度超过限制（${COINGECKO_CRYPTO_SYMBOL_MAX_LENGTH}）`,
      {
        symbol,
        maxLength: COINGECKO_CRYPTO_SYMBOL_MAX_LENGTH,
      },
      "parseCoinGeckoCryptoSymbol",
    );
  }

  if (!COINGECKO_CRYPTO_SYMBOL_PATTERN.test(symbol)) {
    throwCoinGeckoDataValidationError(
      "CoinGecko 参数错误: crypto symbol 格式无效（示例：BTCUSDT 或 BTC）",
      {
        symbol,
      },
      "parseCoinGeckoCryptoSymbol",
    );
  }

  const quoteSuffix = findCoinGeckoQuoteSuffix(symbol);
  if (!quoteSuffix) {
    return {
      standardSymbol: symbol,
      baseSymbol: symbol,
      quoteSymbol: null,
    };
  }

  const baseSymbol = symbol.slice(0, -quoteSuffix.length);
  if (!baseSymbol) {
    throwCoinGeckoDataValidationError(
      "CoinGecko 参数错误: crypto symbol 基础币种为空",
      {
        symbol,
        quoteSuffix,
      },
      "parseCoinGeckoCryptoSymbol",
    );
  }

  return {
    standardSymbol: symbol,
    baseSymbol,
    quoteSymbol: quoteSuffix,
  };
}

export function normalizeAndValidateCoinGeckoCryptoSymbols(
  symbolsInput: unknown,
  options: NormalizeSymbolsOptions,
): string[] {
  const paramName = options.paramName || "symbols";

  if (!Array.isArray(symbolsInput)) {
    throwCoinGeckoDataValidationError(
      `CoinGecko 参数错误: ${paramName} 必须是数组`,
      {
        paramName,
        receivedType: typeof symbolsInput,
      },
      "normalizeAndValidateCoinGeckoCryptoSymbols",
    );
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of symbolsInput) {
    const parsed = parseCoinGeckoCryptoSymbol(raw);
    if (seen.has(parsed.standardSymbol)) {
      continue;
    }

    seen.add(parsed.standardSymbol);
    normalized.push(parsed.standardSymbol);
  }

  if (normalized.length > options.maxCount) {
    throwCoinGeckoDataValidationError(
      `CoinGecko 参数错误: ${paramName} 数量超过上限（最多 ${options.maxCount} 个）`,
      {
        currentCount: normalized.length,
        maxCount: options.maxCount,
      },
      "normalizeAndValidateCoinGeckoCryptoSymbols",
    );
  }

  if (!options.allowEmpty && normalized.length === 0) {
    throwCoinGeckoDataValidationError(
      `CoinGecko 参数错误: ${paramName} 不能为空`,
      {
        paramName,
      },
      "normalizeAndValidateCoinGeckoCryptoSymbols",
    );
  }

  return normalized;
}
