export const YMD_DATE_PATTERN = /^\d{8}$/;
export const YMD_DATE_DASH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface YmdDateRangeValidationOptions {
  beginLabel?: string;
  endLabel?: string;
  strict?: boolean;
  minYmd?: string;
  maxYmd?: string;
  maxSpanDays?: number;
}

export interface YmdDateRangeValidationResult {
  isValid: boolean;
  message?: string;
}

function toUtcDateFromYmd(value: string): Date {
  return new Date(
    Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8)),
    ),
  );
}

function isComparableYmd(value: string): boolean {
  return YMD_DATE_PATTERN.test(value) && isValidYmdDate(value);
}

function calculateInclusiveDayRange(beginYmd: string, endYmd: string): number {
  const beginDate = toUtcDateFromYmd(beginYmd);
  const endDate = toUtcDateFromYmd(endYmd);
  const diffDays = Math.floor(
    (endDate.getTime() - beginDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays + 1;
}

export function isValidYmdDate(value: string): boolean {
  if (!YMD_DATE_PATTERN.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function normalizeYmdDateInput(value: string): string | null {
  const text = value.trim();
  if (!text) {
    return null;
  }

  if (YMD_DATE_PATTERN.test(text)) {
    return text;
  }

  if (YMD_DATE_DASH_PATTERN.test(text)) {
    return text.replace(/-/g, "");
  }

  return null;
}

export function validateYmdDateRange(
  beginDay?: string | null,
  endDay?: string | null,
  options: YmdDateRangeValidationOptions = {},
): YmdDateRangeValidationResult {
  const beginLabel = options.beginLabel ?? "beginDay";
  const endLabel = options.endLabel ?? "endDay";
  const normalizedBegin = typeof beginDay === "string" ? beginDay.trim() : "";
  const normalizedEnd = typeof endDay === "string" ? endDay.trim() : "";
  const hasBegin = !!normalizedBegin;
  const hasEnd = !!normalizedEnd;
  const hasMinYmd = !!options.minYmd && isComparableYmd(options.minYmd);
  const hasMaxYmd = !!options.maxYmd && isComparableYmd(options.maxYmd);
  const hasMaxSpan =
    Number.isInteger(options.maxSpanDays) && (options.maxSpanDays as number) > 0;
  const beginComparable = hasBegin && isComparableYmd(normalizedBegin);
  const endComparable = hasEnd && isComparableYmd(normalizedEnd);

  if (options.strict) {
    if (hasBegin && !isValidYmdDate(normalizedBegin)) {
      return {
        isValid: false,
        message: `${beginLabel} 必须是合法 YYYYMMDD 日期`,
      };
    }
    if (hasEnd && !isValidYmdDate(normalizedEnd)) {
      return {
        isValid: false,
        message: `${endLabel} 必须是合法 YYYYMMDD 日期`,
      };
    }
  }

  if (hasMinYmd && beginComparable && normalizedBegin < (options.minYmd as string)) {
    return {
      isValid: false,
      message: `${beginLabel} 不能早于 ${options.minYmd}`,
    };
  }
  if (hasMinYmd && endComparable && normalizedEnd < (options.minYmd as string)) {
    return {
      isValid: false,
      message: `${endLabel} 不能早于 ${options.minYmd}`,
    };
  }

  if (hasMaxYmd && beginComparable && normalizedBegin > (options.maxYmd as string)) {
    return {
      isValid: false,
      message: `${beginLabel} 不能晚于 ${options.maxYmd}`,
    };
  }
  if (hasMaxYmd && endComparable && normalizedEnd > (options.maxYmd as string)) {
    return {
      isValid: false,
      message: `${endLabel} 不能晚于 ${options.maxYmd}`,
    };
  }

  if (!hasBegin || !hasEnd) {
    return { isValid: true };
  }

  if (normalizedBegin > normalizedEnd) {
    return {
      isValid: false,
      message: `${beginLabel} 不能晚于 ${endLabel}`,
    };
  }

  if (hasMaxSpan && beginComparable && endComparable) {
    const rangeDays = calculateInclusiveDayRange(normalizedBegin, normalizedEnd);
    if (rangeDays > (options.maxSpanDays as number)) {
      return {
        isValid: false,
        message: `日期跨度不能超过 ${options.maxSpanDays} 天`,
      };
    }
  }

  return { isValid: true };
}
