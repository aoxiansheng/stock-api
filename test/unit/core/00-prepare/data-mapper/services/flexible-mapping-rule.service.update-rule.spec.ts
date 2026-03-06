jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";

describe("FlexibleMappingRuleService updateRule 缓存失效策略", () => {
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

  it("维度签名不变时仅执行一次失效", async () => {
    const service = createService();
    const crudModule = (service as any).crudModule;
    const loggerLogSpy = jest.spyOn((service as any).logger, "log");

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(
      createRuleDoc({
        _id: "rule-1",
        provider: "  LongPort  ",
        apiType: "REST",
        transDataRuleListType: "  QUOTE_FIELDS  ",
      }),
    );
    jest.spyOn(crudModule, "updateRule").mockResolvedValue(
      createRuleDoc({
        _id: "rule-1",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
      }),
    );

    const result = await service.updateRule("rule-1", {
      description: "updated",
    });

    expect(result.id).toBe("rule-1");
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({
        provider: "  LongPort  ",
        apiType: "REST",
        transDataRuleListType: "quote_fields",
      }),
    );
    expect(cacheServiceMock.cacheRuleById).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      "updateRule 缓存失效完成",
      expect.objectContaining({
        id: "rule-1",
        oldDimensionSignature: "longport|rest|quote_fields",
        newDimensionSignature: "longport|rest|quote_fields",
        secondInvalidationExecuted: false,
      }),
    );
  });

  it("维度签名变化时执行两次失效", async () => {
    const service = createService();
    const crudModule = (service as any).crudModule;
    const loggerLogSpy = jest.spyOn((service as any).logger, "log");

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(
      createRuleDoc({
        _id: "rule-1",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
      }),
    );
    jest.spyOn(crudModule, "updateRule").mockResolvedValue(
      createRuleDoc({
        _id: "rule-1",
        provider: "infoway",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
      }),
    );

    await service.updateRule("rule-1", {
      provider: "infoway",
    });

    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(2);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenNthCalledWith(
      1,
      "rule-1",
      expect.objectContaining({ provider: "longport" }),
    );
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenNthCalledWith(
      2,
      "rule-1",
      expect.objectContaining({ provider: "infoway" }),
    );
    expect(cacheServiceMock.cacheRuleById).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      "updateRule 缓存失效完成",
      expect.objectContaining({
        id: "rule-1",
        oldDimensionSignature: "longport|rest|quote_fields",
        newDimensionSignature: "infoway|rest|quote_fields",
        secondInvalidationExecuted: true,
      }),
    );
  });

  it("缓存失效失败时仍返回更新成功，并记录标准告警字段", async () => {
    const service = createService();
    const crudModule = (service as any).crudModule;
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(
      createRuleDoc({
        _id: "rule-cache-fail",
        provider: "  LongPort  ",
        apiType: "REST",
        transDataRuleListType: "quote_fields",
      }),
    );
    jest.spyOn(crudModule, "updateRule").mockResolvedValue(
      createRuleDoc({
        _id: "rule-cache-fail",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
      }),
    );
    cacheServiceMock.invalidateRuleCache.mockRejectedValueOnce(
      new Error("redis timeout"),
    );

    const result = await service.updateRule("rule-cache-fail", {
      description: "updated",
    });

    expect(result.id).toBe("rule-cache-fail");
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.cacheRuleById).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "updateRule 缓存失效失败（已忽略，不影响DB写入）",
      expect.objectContaining({
        ruleId: "rule-cache-fail",
        provider: "longport",
        apiType: "rest",
        error: "redis timeout",
      }),
    );
  });
});
