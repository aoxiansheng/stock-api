import { BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { RULE_LIST_TYPE_VALUES } from "@core/00-prepare/data-mapper/constants/data-mapper.constants";
import { DATA_MAPPER_ERROR_CODES } from "@core/00-prepare/data-mapper/constants/data-mapper-error-codes.constants";
import { RuleAlignmentService } from "@core/00-prepare/data-mapper/services/rule-alignment.service";
import { MarketTypeResolverService } from "@core/00-prepare/data-mapper/services/market-type-resolver.service";

describe("RuleAlignmentService invalid rule type exception", () => {
  function expectInvalidRuleTypeBusinessError(
    error: any,
    operation: string,
    providedType: unknown,
  ) {
    expect(error).toMatchObject({
      name: "BusinessException",
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      component: ComponentIdentifier.DATA_MAPPER,
      operation,
      context: expect.objectContaining({
        providedType,
        allowedTypes: expect.arrayContaining(RULE_LIST_TYPE_VALUES),
        errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_NAME,
      }),
      retryable: false,
    });
    expect(error.getStatus()).toBe(400);
  }

  it("realignExistingRule 遇到非法 transDataRuleListType 时抛出统一结构异常", async () => {
    const invalidRuleType = "unsupported_rule_type";
    const templateModelMock = {
      findById: jest.fn().mockResolvedValue({
        _id: "tpl-1",
        extractedFields: [],
      }),
    };
    const ruleModelMock = {
      findById: jest.fn().mockResolvedValue({
        _id: "rule-1",
        sourceTemplateId: "tpl-1",
        transDataRuleListType: invalidRuleType,
        fieldMappings: [],
      }),
      findByIdAndUpdate: jest.fn(),
    };
    const service = new RuleAlignmentService(
      templateModelMock as any,
      ruleModelMock as any,
      new MarketTypeResolverService(),
    );

    let capturedError: any;
    try {
      await service.realignExistingRule("rule-1");
    } catch (error) {
      capturedError = error;
    }
    expect(capturedError).toBeDefined();
    expectInvalidRuleTypeBusinessError(
      capturedError,
      "realignExistingRule",
      invalidRuleType,
    );

    expect(ruleModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("autoAlignFields 遇到非法 transDataRuleListType 时抛出统一结构异常", () => {
    const invalidRuleType = "invalid_private_rule_type";
    const service = new RuleAlignmentService(
      {} as any,
      {} as any,
      new MarketTypeResolverService(),
    );

    let capturedError: any;
    try {
      (service as any).autoAlignFields(
        {
          extractedFields: [],
        },
        invalidRuleType,
      );
    } catch (error) {
      capturedError = error;
    }
    expect(capturedError).toBeDefined();
    expectInvalidRuleTypeBusinessError(
      capturedError,
      "autoAlignFields",
      invalidRuleType,
    );
  });
});
