import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";

export const SUPPORTED_MARKETS = ["US", "HK", "CN", "SH", "SZ"] as const;

export type SupportedMarket = (typeof SUPPORTED_MARKETS)[number];
export type SupportedMarketOrUnknown = SupportedMarket | "UNKNOWN";

export function isSupportedMarket(market: string): market is SupportedMarket {
  return SUPPORTED_MARKETS.includes(market as SupportedMarket);
}

const tradingDayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTradingDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = tradingDayFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    tradingDayFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function inferMarketFromSymbol(
  symbol: string,
  fallback: SupportedMarketOrUnknown = "UNKNOWN",
): SupportedMarketOrUnknown {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized.endsWith(".CN")) {
    return "CN";
  }

  const inferredMarket = SymbolValidationUtils.getMarketFromSymbol(normalized, {
    fallback: undefined,
  });
  if (inferredMarket && isSupportedMarket(inferredMarket)) {
    return inferredMarket;
  }

  return fallback;
}

export function resolveMarketTimezone(market: string): string {
  switch (market) {
    case "US":
      return "America/New_York";
    case "HK":
      return "Asia/Hong_Kong";
    case "CN":
    case "SH":
    case "SZ":
      return "Asia/Shanghai";
    default:
      return "UTC";
  }
}

export function parseFlexibleTimestampToMs(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      return null;
    }
    const digitCount = Math.trunc(Math.abs(value)).toString().length;
    if (digitCount === 10) {
      return value * 1000;
    }
    if (digitCount === 13) {
      return value;
    }
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (/^[0-9]+$/.test(normalized)) {
      const rawDigitCount = normalized.length;
      if (rawDigitCount !== 10 && rawDigitCount !== 13) {
        return null;
      }
      return parseFlexibleTimestampToMs(Number(normalized));
    }
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function formatTradingDayFromTimestamp(
  timestampMs: number,
  market: string,
): string {
  return getTradingDayFormatter(resolveMarketTimezone(market))
    .format(new Date(timestampMs))
    .replace(/-/g, "");
}

export function isTimestampInTradingDay(
  timestampMs: number,
  tradingDay: string,
  market: string,
): boolean {
  return formatTradingDayFromTimestamp(timestampMs, market) === tradingDay;
}
