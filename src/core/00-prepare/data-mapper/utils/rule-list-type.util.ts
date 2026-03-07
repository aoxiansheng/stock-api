import {
  RULE_LIST_TYPES,
  type RuleListType,
} from "../constants/data-mapper.constants";
import { normalizeLowercaseString } from "./string-normalize.util";

export function normalizeRuleListTypeInput(value: unknown): string {
  return normalizeLowercaseString(value);
}

export function parseRuleListType(value: unknown): RuleListType | null {
  const normalizedValue = normalizeRuleListTypeInput(value);

  switch (normalizedValue) {
    case RULE_LIST_TYPES.QUOTE_FIELDS:
    case RULE_LIST_TYPES.CANDLE_FIELDS:
    case RULE_LIST_TYPES.BASIC_INFO_FIELDS:
    case RULE_LIST_TYPES.MARKET_STATUS_FIELDS:
    case RULE_LIST_TYPES.TRADING_DAYS_FIELDS:
    case RULE_LIST_TYPES.INDEX_FIELDS:
      return normalizedValue;
    default:
      return null;
  }
}

export function isRuleListType(value: unknown): value is RuleListType {
  if (typeof value !== "string") {
    return false;
  }
  return parseRuleListType(value) === value;
}
