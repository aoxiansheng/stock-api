const logger = {
  debug: jest.fn(),
  verbose: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("@common/logging/index", () => ({
  createLogger: () => logger,
}));

import { MappingRuleEngineModule } from "@core/00-prepare/data-mapper/services/modules/mapping-rule-engine.module";

describe("MappingRuleEngineModule logging level", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applyFlexibleMappingRule 的 begin/completed 降级到 verbose", async () => {
    const module = new MappingRuleEngineModule();
    const rule = {
      _id: "rule-1",
      fieldMappings: [
        {
          sourceFieldPath: "price",
          targetField: "lastPrice",
          isRequired: true,
        },
      ],
    } as any;

    await module.applyFlexibleMappingRule(rule, { price: 100 });

    expect(logger.verbose).toHaveBeenCalledWith(
      "applyFlexibleMappingRule: begin",
      expect.objectContaining({ ruleId: "rule-1" }),
    );
    expect(logger.verbose).toHaveBeenCalledWith(
      "applyFlexibleMappingRule: completed",
      expect.objectContaining({ ruleId: "rule-1", success: true }),
    );
    expect(logger.debug).not.toHaveBeenCalledWith(
      "applyFlexibleMappingRule: begin",
      expect.anything(),
    );
    expect(logger.debug).not.toHaveBeenCalledWith(
      "applyFlexibleMappingRule: completed",
      expect.anything(),
    );
  });
});
