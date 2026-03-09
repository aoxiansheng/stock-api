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

});
