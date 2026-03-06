jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";

describe("FlexibleMappingRuleService toggleRuleStatus 缓存失效策略", () => {
  const cacheServiceMock = {
    invalidateRuleCache: jest.fn(),
    cacheRuleById: jest.fn(),
  };

  function createService(): FlexibleMappingRuleService {
    const paginationServiceMock = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
    };

    return new FlexibleMappingRuleService(
      {} as any,
      {} as any,
      paginationServiceMock as any,
      {} as any,
      cacheServiceMock as any,
    );
  }

  function createRuleDoc(overrides: Partial<Record<string, any>> = {}): any {
    return {
      _id: "rule-1",
      name: "rule-name",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      marketType: "*",
      sourceTemplateId: "",
      fieldMappings: [],
      isActive: true,
      isDefault: false,
      version: "1.0.0",
      overallConfidence: 100,
      usageCount: 0,
      successfulTransformations: 0,
      failedTransformations: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("缓存失效失败时仍返回状态切换成功，并记录标准告警字段", async () => {
    const service = createService();
    const crudModule = (service as any).crudModule;
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
    const loggerLogSpy = jest.spyOn((service as any).logger, "log");

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(
      createRuleDoc({
        _id: "rule-toggle-fail",
        provider: "  LongPort  ",
        apiType: "REST",
      }),
    );
    jest.spyOn(crudModule, "toggleRuleStatus").mockResolvedValue(
      createRuleDoc({
        _id: "rule-toggle-fail",
        provider: "longport",
        apiType: "rest",
        isActive: false,
      }),
    );
    cacheServiceMock.invalidateRuleCache.mockRejectedValueOnce(
      new Error("redis unavailable"),
    );

    const result = await service.toggleRuleStatus("rule-toggle-fail", false);

    expect(result.id).toBe("rule-toggle-fail");
    expect(result.isActive).toBe(false);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.cacheRuleById).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "toggleRuleStatus 缓存失效失败（已忽略，不影响DB写入）",
      expect.objectContaining({
        ruleId: "rule-toggle-fail",
        provider: "longport",
        apiType: "rest",
        error: "redis unavailable",
      }),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      "toggleRuleStatus 缓存失效完成",
      expect.objectContaining({
        id: "rule-toggle-fail",
        isActive: false,
        invalidationSucceeded: false,
      }),
    );
  });
});
