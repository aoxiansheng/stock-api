import {
  isRuleListType,
  normalizeRuleListTypeInput,
  parseRuleListType,
} from "@core/00-prepare/data-mapper/utils/rule-list-type.util";

describe("rule-list-type util", () => {
  it("normalizeRuleListTypeInput 应统一 trim + lower", () => {
    expect(normalizeRuleListTypeInput("  QUOTE_FIELDS  ")).toBe("quote_fields");
    expect(normalizeRuleListTypeInput(undefined)).toBe("");
  });

  it("parseRuleListType 应返回规范化后的 RuleListType", () => {
    expect(parseRuleListType("  QUOTE_FIELDS  ")).toBe("quote_fields");
    expect(parseRuleListType("CANDLE_FIELDS")).toBe("candle_fields");
    expect(parseRuleListType("basic_info_fields")).toBe("basic_info_fields");
  });

  it("parseRuleListType 非法值返回 null", () => {
    expect(parseRuleListType("invalid_type")).toBeNull();
    expect(parseRuleListType(123)).toBeNull();
  });

  it("isRuleListType 仅接受已规范化的字面量", () => {
    expect(isRuleListType("quote_fields")).toBe(true);
    expect(isRuleListType("candle_fields")).toBe(true);
    expect(isRuleListType(" QUOTE_FIELDS ")).toBe(false);
  });
});
