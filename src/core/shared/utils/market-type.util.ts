import { Market } from "@core/shared/constants/market.constants";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";

export interface MarketTypeContext {
  primaryMarket: string;
  marketType: string;
  markets: string[];
  candidates: string[];
}

const MARKET_ALIAS: Record<string, string> = {
  [Market.US]: "US",
  [Market.HK]: "HK",
  [Market.CN]: "CN",
  [Market.SH]: "CN",
  [Market.SZ]: "CN",
  [Market.CRYPTO]: "CRYPTO",
};

const COMPOSITE_GROUPS: Record<string, string[]> = {
  "US/CN": ["US", "CN"],
};

const WILDCARD_MARKET = "*";

export function resolveMarketTypeFromSymbols(
  marketInferenceService: MarketInferenceService,
  symbols: string[],
): MarketTypeContext {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return createUnknownContext();
  }

  const inferredMarkets = marketInferenceService
    .inferMarkets(symbols)
    .map((market) => canonicalizeMarket(market));

  const filteredMarkets = inferredMarkets.filter((market) => market !== "UNKNOWN");
  const uniqueMarkets = Array.from(
    new Set(filteredMarkets.length > 0 ? filteredMarkets : inferredMarkets),
  ).filter(Boolean);

  const dominant = canonicalizeMarket(
    marketInferenceService.inferDominantMarket(symbols),
  );

  const primaryMarket = dominant !== "UNKNOWN"
    ? dominant
    : uniqueMarkets[0] || "UNKNOWN";

  const candidates = buildMarketCandidates(primaryMarket, uniqueMarkets);
  const marketType = candidates[0] ?? "UNKNOWN";

  return {
    primaryMarket,
    marketType,
    markets: uniqueMarkets,
    candidates,
  };
}

function canonicalizeMarket(market?: Market | string | null): string {
  if (!market) {
    return "UNKNOWN";
  }

  const normalized = String(market).toUpperCase();
  return MARKET_ALIAS[normalized] || normalized;
}

function buildMarketCandidates(primary: string, markets: string[]): string[] {
  const candidates: string[] = [];

  if (primary && primary !== "UNKNOWN") {
    candidates.push(primary);
  }

  Object.entries(COMPOSITE_GROUPS).forEach(([composite, members]) => {
    const matchesPrimary = primary !== "UNKNOWN" && members.includes(primary);
    const matchesAllMembers = members.every((member) => markets.includes(member));

    if ((matchesPrimary || matchesAllMembers) && !candidates.includes(composite)) {
      candidates.push(composite);
    }
  });

  if (markets.length > 1) {
    const compositeKey = markets.slice().sort().join("/");
    if (compositeKey && !candidates.includes(compositeKey)) {
      candidates.push(compositeKey);
    }
  }

  if (!candidates.includes(WILDCARD_MARKET)) {
    candidates.push(WILDCARD_MARKET);
  }

  return candidates;
}

function createUnknownContext(): MarketTypeContext {
  return {
    primaryMarket: "UNKNOWN",
    marketType: "UNKNOWN",
    markets: [],
    candidates: ["UNKNOWN", WILDCARD_MARKET],
  };
}
