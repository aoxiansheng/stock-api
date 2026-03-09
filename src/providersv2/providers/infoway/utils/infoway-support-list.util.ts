import { throwInfowayDataValidationError } from "../helpers/capability-context.helper";

export const INFOWAY_SUPPORT_LIST_TYPES = [
  "STOCK_US",
  "STOCK_CN",
  "STOCK_HK",
  "FUTURES",
  "FOREX",
  "ENERGY",
  "METAL",
  "CRYPTO",
] as const;

export type InfowaySupportListType = (typeof INFOWAY_SUPPORT_LIST_TYPES)[number];

const INFOWAY_SUPPORT_LIST_TYPE_SET = new Set<string>(INFOWAY_SUPPORT_LIST_TYPES);
const INFOWAY_SUPPORT_SYMBOL_PATTERN = /^[A-Z0-9._:-]+$/;
export const INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH = 64;
const INFOWAY_SUPPORT_SYMBOL_MAX_COUNT = 1000;

interface NormalizeSupportListTypeOptions {
  allowEmpty?: boolean;
  operation?: string;
}

interface NormalizeSupportListSymbolsOptions {
  allowEmpty?: boolean;
  maxCount?: number;
  operation?: string;
  paramName?: string;
}

export function normalizeInfowaySupportListType(
  typeInput: unknown,
  options: NormalizeSupportListTypeOptions = {},
): InfowaySupportListType | "" {
  const normalized = String(typeInput || "").trim().toUpperCase();
  if (!normalized) {
    if (options.allowEmpty) {
      return "";
    }
    throwInfowayDataValidationError(
      "Infoway 参数错误: type 不能为空",
      {
        type: typeInput,
        supportedTypes: INFOWAY_SUPPORT_LIST_TYPES,
      },
      options.operation || "normalizeInfowaySupportListType",
    );
  }

  if (!INFOWAY_SUPPORT_LIST_TYPE_SET.has(normalized)) {
    throwInfowayDataValidationError(
      `Infoway 参数错误: type 不受支持（${INFOWAY_SUPPORT_LIST_TYPES.join("/")})`,
      {
        type: typeInput,
        normalizedType: normalized,
        supportedTypes: INFOWAY_SUPPORT_LIST_TYPES,
      },
      options.operation || "normalizeInfowaySupportListType",
    );
  }

  return normalized as InfowaySupportListType;
}

export function normalizeInfowaySupportListSymbols(
  symbolsInput: unknown,
  options: NormalizeSupportListSymbolsOptions = {},
): string[] {
  const operation = options.operation || "normalizeInfowaySupportListSymbols";
  const paramName = options.paramName || "symbols";
  const maxCount = options.maxCount ?? INFOWAY_SUPPORT_SYMBOL_MAX_COUNT;
  const allowEmpty = options.allowEmpty ?? true;

  if (symbolsInput === undefined || symbolsInput === null || symbolsInput === "") {
    if (allowEmpty) {
      return [];
    }
    throwInfowayDataValidationError(
      `Infoway 参数错误: ${paramName} 不能为空`,
      {
        paramName,
      },
      operation,
    );
  }

  const rawList = Array.isArray(symbolsInput)
    ? symbolsInput
    : String(symbolsInput).split(",");

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawItem of rawList) {
    const symbol = String(rawItem || "").trim().toUpperCase();
    if (!symbol) {
      continue;
    }

    if (symbol.length > INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: ${paramName} 单项长度不能超过 ${INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH}`,
        {
          paramName,
          symbol,
          maxLength: INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH,
        },
        operation,
      );
    }

    if (!INFOWAY_SUPPORT_SYMBOL_PATTERN.test(symbol)) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: ${paramName} 包含非法字符`,
        {
          paramName,
          symbol,
          allowedPattern: INFOWAY_SUPPORT_SYMBOL_PATTERN.source,
        },
        operation,
      );
    }

    if (!seen.has(symbol)) {
      seen.add(symbol);
      normalized.push(symbol);
    }
  }

  if (normalized.length > maxCount) {
    throwInfowayDataValidationError(
      `Infoway 参数错误: ${paramName} 数量超过上限（最多 ${maxCount} 个）`,
      {
        paramName,
        maxCount,
        currentCount: normalized.length,
      },
      operation,
    );
  }

  if (!allowEmpty && normalized.length === 0) {
    throwInfowayDataValidationError(
      `Infoway 参数错误: ${paramName} 不能为空`,
      {
        paramName,
      },
      operation,
    );
  }

  return normalized;
}
