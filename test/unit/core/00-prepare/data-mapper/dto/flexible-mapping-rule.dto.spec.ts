import { FlexibleMappingRuleResponseDto } from "@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import { BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

describe("FlexibleMappingRuleResponseDto.fromDocument", () => {
  it("transDataRuleListType 非法时抛出结构化 BusinessException", () => {
    expect.assertions(6);

    try {
      FlexibleMappingRuleResponseDto.fromDocument({
        _id: "rule-invalid",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "invalid_rule_list_type",
      });
    } catch (error: any) {
      expect(error?.name).toBe("BusinessException");
      expect(error?.errorCode).toBe(BusinessErrorCode.DATA_VALIDATION_FAILED);
      expect(error?.component).toBe(ComponentIdentifier.DATA_MAPPER);
      expect(error?.operation).toBe(
        "FlexibleMappingRuleResponseDto.fromDocument",
      );
      expect(error?.context).toMatchObject({
        documentId: "rule-invalid",
        transDataRuleListType: "invalid_rule_list_type",
      });
      expect(error?.message).toContain(
        "Invalid transDataRuleListType in mapping rule document",
      );
    }
  });

  it("合法文档保持原有解析行为", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = FlexibleMappingRuleResponseDto.fromDocument({
      _id: "rule-1",
      name: "rule-name",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "  QUOTE_FIELDS  ",
      marketType: "US",
      fieldMappings: [],
      successfulTransformations: 1,
      failedTransformations: 0,
      createdAt: now,
      updatedAt: now,
    });

    expect(result.id).toBe("rule-1");
    expect(result.transDataRuleListType).toBe("quote_fields");
    expect(result.provider).toBe("longport");
    expect(result.marketType).toBe("US");
  });
});
