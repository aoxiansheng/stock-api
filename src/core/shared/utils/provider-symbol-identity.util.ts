import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";

export const STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY =
  "STANDARD_SYMBOL_IDENTITY_PROVIDERS";

const CHINA_AGGREGATE_MARKET = "CN";
const CHINA_EXCHANGE_MARKETS = new Set(["SH", "SZ"]);

type ParsedIdentityProviderCache = {
  rawValue: string | undefined;
  providers: string[];
  providerSet: Set<string>;
};

let parsedIdentityProviderCache: ParsedIdentityProviderCache | null = null;

function normalizeProviderName(providerName: string): string {
  return String(providerName || "").trim().toLowerCase();
}

function resolveProviderRawValue(rawValue?: unknown): string | undefined {
  return typeof rawValue === "string" ? rawValue : undefined;
}

function normalizeMarketLike(market?: unknown): string {
  return typeof market === "string" ? market.trim().toUpperCase() : "";
}

function canonicalizeIdentitySymbol(symbol: string): string {
  return SymbolValidationUtils.normalizeSymbol(symbol);
}

export function parseStandardSymbolIdentityProviders(
  rawValue?: unknown,
): string[] {
  const cache = getParsedIdentityProviderCache(rawValue);
  return [...cache.providers];
}

function getParsedIdentityProviderCache(
  rawValue?: unknown,
): ParsedIdentityProviderCache {
  const resolvedRawValue = resolveProviderRawValue(rawValue);

  if (
    parsedIdentityProviderCache &&
    parsedIdentityProviderCache.rawValue === resolvedRawValue
  ) {
    return parsedIdentityProviderCache;
  }

  const providers: string[] = [];
  const seen = new Set<string>();

  if (resolvedRawValue) {
    for (const item of resolvedRawValue.split(",")) {
      const normalized = normalizeProviderName(item);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      providers.push(normalized);
    }
  }

  parsedIdentityProviderCache = {
    rawValue: resolvedRawValue,
    providers,
    providerSet: new Set(providers),
  };

  return parsedIdentityProviderCache;
}

export function isStandardSymbolIdentityProvider(
  providerName: string,
  rawValue: unknown,
): boolean {
  const normalizedProvider = normalizeProviderName(providerName);
  if (!normalizedProvider) {
    return false;
  }

  return getParsedIdentityProviderCache(rawValue).providerSet.has(
    normalizedProvider,
  );
}

export function areStandardIdentityMarketsCompatible(
  explicitMarket?: string,
  inferredMarket?: string,
): boolean {
  const normalizedExplicit = normalizeMarketLike(explicitMarket);
  const normalizedInferred = normalizeMarketLike(inferredMarket);

  if (!normalizedExplicit || !normalizedInferred) {
    return true;
  }

  if (normalizedExplicit === normalizedInferred) {
    return true;
  }

  if (
    normalizedExplicit === CHINA_AGGREGATE_MARKET &&
    CHINA_EXCHANGE_MARKETS.has(normalizedInferred)
  ) {
    return true;
  }

  if (
    normalizedInferred === CHINA_AGGREGATE_MARKET &&
    CHINA_EXCHANGE_MARKETS.has(normalizedExplicit)
  ) {
    return true;
  }

  return false;
}

export function canonicalizeStandardIdentityMarket(
  explicitMarket?: string,
  inferredMarket?: string,
): string | undefined {
  const normalizedExplicit = normalizeMarketLike(explicitMarket);
  const normalizedInferred = normalizeMarketLike(inferredMarket);

  if (
    normalizedInferred &&
    CHINA_EXCHANGE_MARKETS.has(normalizedInferred) &&
    areStandardIdentityMarketsCompatible(
      normalizedExplicit,
      normalizedInferred,
    )
  ) {
    return normalizedInferred;
  }

  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  if (normalizedInferred) {
    return normalizedInferred;
  }

  return undefined;
}

export function findNonStandardSymbolsForIdentityProvider(
  symbols: string[],
): string[] {
  return symbols.filter(
    (symbol) => !isStandardIdentitySymbol(symbol),
  );
}

export function isStandardIdentitySymbol(symbol: string): boolean {
  if (typeof symbol !== "string" || symbol.length === 0) {
    return false;
  }

  if (symbol !== symbol.trim()) {
    return false;
  }

  return SymbolValidationUtils.isStrictStandardSymbol(symbol);
}

export function buildIdentitySymbolTransformResult(
  provider: string,
  symbols: string[],
): {
  transformedSymbols: string[];
  mappingResults: {
    transformedSymbols: Record<string, string>;
    failedSymbols: string[];
    metadata: {
      provider: string;
      totalSymbols: number;
      successfulTransformations: number;
      failedTransformations: number;
      processingTimeMs: number;
    };
  };
} {
  const transformedSymbols = symbols.map((symbol) =>
    canonicalizeIdentitySymbol(symbol),
  );
  const transformedSymbolMap = Object.fromEntries(
    symbols.map((symbol, index) => [symbol, transformedSymbols[index]]),
  );

  return {
    transformedSymbols,
    mappingResults: {
      transformedSymbols: transformedSymbolMap,
      failedSymbols: [],
      metadata: {
        provider,
        totalSymbols: transformedSymbols.length,
        successfulTransformations: transformedSymbols.length,
        failedTransformations: 0,
        processingTimeMs: 0,
      },
    },
  };
}

export function buildIdentitySymbolMappingPair(
  symbols: string[],
): { standardSymbols: string[]; providerSymbols: string[] } {
  const identitySymbols = symbols.map((symbol) =>
    canonicalizeIdentitySymbol(symbol),
  );
  return {
    standardSymbols: identitySymbols,
    providerSymbols: identitySymbols,
  };
}
