import {
  MAPPING_RULE_CATEGORY,
  MappingRuleCategoryValues,
  isValidMappingRuleCategory,
} from "../../../../../src/common/constants/mapping-rule-category.constants";

describe("MAPPING_RULE_CATEGORY constants", () => {
  it("应该包含所有期望的常量值", () => {
    expect(MAPPING_RULE_CATEGORY.QUOTE_FIELDS).toBe("quote_fields");
    expect(MAPPING_RULE_CATEGORY.BASIC_INFO_FIELDS).toBe("basic_info_fields");
    expect(MAPPING_RULE_CATEGORY.INDEX_FIELDS).toBe("index_fields");
  });

  it("MappingRuleCategoryValues 应该包含所有值", () => {
    expect(MappingRuleCategoryValues).toContain("quote_fields");
    expect(MappingRuleCategoryValues).toContain("basic_info_fields");
    expect(MappingRuleCategoryValues).toContain("index_fields");
    expect(MappingRuleCategoryValues).toHaveLength(3);
  });

  it("isValidMappingRuleCategory 应该正确验证", () => {
    expect(isValidMappingRuleCategory("quote_fields")).toBe(true);
    expect(isValidMappingRuleCategory("basic_info_fields")).toBe(true);
    expect(isValidMappingRuleCategory("index_fields")).toBe(true);
    expect(isValidMappingRuleCategory("invalid_category")).toBe(false);
    expect(isValidMappingRuleCategory(123)).toBe(false);
    expect(isValidMappingRuleCategory(null)).toBe(false);
    expect(isValidMappingRuleCategory(undefined)).toBe(false);
  });
});
