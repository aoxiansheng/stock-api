import { MappingRuleCrudModule } from "@core/00-prepare/data-mapper/services/modules/mapping-rule-crud.module";
import { RULE_LIST_TYPES } from "@core/00-prepare/data-mapper/constants/data-mapper.constants";

describe("MappingRuleCrudModule best rule lookup", () => {
  it("strictWildcardOnly=true 且请求 market=* 时，不匹配非通配规则", async () => {
    const nonWildcardRule = {
      marketType: "US",
      isDefault: false,
      overallConfidence: 100,
      successRate: 1,
      usageCount: 20,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as any;

    const sort = jest.fn().mockResolvedValue([nonWildcardRule]);
    const find = jest.fn().mockReturnValue({ sort });
    const ruleModel = { find } as any;
    const module = new MappingRuleCrudModule(ruleModel, {} as any, {} as any);

    const strictResult = await module.findBestMatchingRuleDocument(
      "longport",
      "rest",
      RULE_LIST_TYPES.QUOTE_FIELDS,
      "*",
      { strictWildcardOnly: true },
    );
    const defaultResult = await module.findBestMatchingRuleDocument(
      "longport",
      "rest",
      RULE_LIST_TYPES.QUOTE_FIELDS,
      "*",
    );

    expect(strictResult).toBeNull();
    expect(defaultResult).toBe(nonWildcardRule);
  });

  it("冷路径会兼容 legacy provider/apiType 的大小写与空格脏数据", async () => {
    const legacyRule = {
      marketType: "US",
      isDefault: true,
      overallConfidence: 100,
      successRate: 1,
      usageCount: 50,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as any;

    const find = jest
      .fn()
      .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([legacyRule]) });
    const ruleModel = { find } as any;
    const module = new MappingRuleCrudModule(ruleModel, {} as any, {} as any);
    const warnSpy = jest.spyOn((module as any).logger, "warn");

    const result = await module.findBestMatchingRuleDocument(
      "  LongPort  ",
      "REST" as any,
      RULE_LIST_TYPES.QUOTE_FIELDS,
      "US",
    );

    expect(result).toBe(legacyRule);
    expect(find).toHaveBeenCalledTimes(2);
    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS,
        isActive: true,
      }),
    );

    const legacyFilter = find.mock.calls[1][0];
    expect(legacyFilter.provider).toBeInstanceOf(RegExp);
    expect(legacyFilter.apiType).toBeInstanceOf(RegExp);
    expect(legacyFilter.provider.test(" LONGPORT ")).toBe(true);
    expect(legacyFilter.apiType.test(" rest ")).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "查找最匹配映射规则命中 legacy provider/apiType 脏数据兼容路径",
      expect.objectContaining({
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS,
        matchedRules: 1,
      }),
    );
  });
});
