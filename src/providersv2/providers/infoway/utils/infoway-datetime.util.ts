import type { InfowayMarketCode } from "./infoway-symbols.util";

const MIN_TIMESTAMP_MS = Date.UTC(1990, 0, 1, 0, 0, 0, 0);
const MAX_FUTURE_SKEW_MS = 7 * 24 * 60 * 60 * 1000;
const INFOWAY_MARKET_TIMEZONE: Record<InfowayMarketCode, string> = {
  US: "America/New_York",
  HK: "Asia/Hong_Kong",
  CN: "Asia/Shanghai",
};
const INFOWAY_DAY_FORMATTER_BY_TZ = new Map<string, Intl.DateTimeFormat>();

export function normalizeInfowayTimestampToIso(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }

  let ms: number;
  if (/^\d{10}$/.test(text)) {
    ms = Number(text) * 1000;
  } else if (/^\d{13}$/.test(text)) {
    ms = Number(text);
  } else {
    return null;
  }

  if (!Number.isFinite(ms) || !Number.isSafeInteger(ms)) {
    return null;
  }

  const now = Date.now();
  if (ms < MIN_TIMESTAMP_MS || ms > now + MAX_FUTURE_SKEW_MS) {
    return null;
  }

  return new Date(ms).toISOString();
}

export function normalizeInfowayDay(value?: string): string {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  let ymd = "";
  if (/^\d{8}$/.test(text)) {
    ymd = text;
  } else {
    const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) {
      return "";
    }
    ymd = `${matched[1]}${matched[2]}${matched[3]}`;
  }

  return isValidInfowayYmd(ymd) ? ymd : "";
}

export function formatInfowayYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function formatInfowayYmdByMarket(
  date: Date,
  market: InfowayMarketCode,
): string {
  const timeZone = INFOWAY_MARKET_TIMEZONE[market];
  if (!timeZone) {
    return formatInfowayYmd(date);
  }

  const formatter = getInfowayDayFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    return formatInfowayYmd(date);
  }

  return `${year}${month}${day}`;
}

function getInfowayDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = INFOWAY_DAY_FORMATTER_BY_TZ.get(timeZone);
  if (formatter) {
    return formatter;
  }

  formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  INFOWAY_DAY_FORMATTER_BY_TZ.set(timeZone, formatter);
  return formatter;
}

function isValidInfowayYmd(ymd: string): boolean {
  if (!/^\d{8}$/.test(ymd)) {
    return false;
  }

  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));

  if (year < 1990 || year > 2100) {
    return false;
  }
  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  return true;
}
