jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";

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

describe("FlexibleMappingRuleService deleteRule 删除语义", () => {
  function createService() {
    const cacheServiceMock = {
      invalidateRuleCache: jest.fn().mockResolvedValue(undefined),
      cacheRuleById: jest.fn(),
      cacheBestMatchingRule: jest.fn(),
      getCachedRuleById: jest.fn(),
      warmupCache: jest.fn(),
    };

    const paginationServiceMock = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
    };

    const service = new FlexibleMappingRuleService(
      {} as any,
      {} as any,
      paginationServiceMock as any,
      {} as any,
      cacheServiceMock as any,
    );

    return {
      service,
      cacheServiceMock,
      crudModule: (service as any).crudModule,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("脏规则在可序列化转换失败时仍可删除，并降级缓存失效", async () => {
    const { service, crudModule, cacheServiceMock } = createService();
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(
      createRuleDoc({
        _id: "rule-dirty",
        transDataRuleListType: "invalid_type",
      }),
    );
    const deleteSpy = jest
      .spyOn(crudModule, "deleteRule")
      .mockResolvedValue(createRuleDoc());

    await expect(service.deleteRule("rule-dirty")).resolves.toBeUndefined();
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith("rule-dirty");
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledWith(
      "rule-dirty",
      undefined,
    );
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "deleteRule 规则文档转换失败，降级执行删除与缓存清理",
      expect.objectContaining({
        id: "rule-dirty",
        transDataRuleListType: "invalid_type",
      }),
    );
  });

  it("正常删除时执行删库与缓存失效", async () => {
    const { service, crudModule, cacheServiceMock } = createService();
    const loggerLogSpy = jest.spyOn((service as any).logger, "log");

    jest
      .spyOn(crudModule, "getRuleDocumentById")
      .mockResolvedValue(createRuleDoc({ _id: "rule-1" }));
    const deleteSpy = jest
      .spyOn(crudModule, "deleteRule")
      .mockResolvedValue(createRuleDoc({ _id: "rule-1" }));

    await expect(service.deleteRule("rule-1")).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith("rule-1");
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({
        id: "rule-1",
        transDataRuleListType: "quote_fields",
      }),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith("deleteRule 缓存失效完成", {
      id: "rule-1",
      attempt: 1,
      degradedInvalidation: false,
    });
  });

  it("缓存失效首次失败时会重试并在重试成功后结束", async () => {
    const { service, crudModule, cacheServiceMock } = createService();
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
    const loggerLogSpy = jest.spyOn((service as any).logger, "log");

    jest
      .spyOn(crudModule, "getRuleDocumentById")
      .mockResolvedValue(createRuleDoc({ _id: "rule-retry-success" }));
    const deleteSpy = jest
      .spyOn(crudModule, "deleteRule")
      .mockResolvedValue(createRuleDoc({ _id: "rule-retry-success" }));
    cacheServiceMock.invalidateRuleCache
      .mockRejectedValueOnce(new Error("redis timeout"))
      .mockResolvedValueOnce(undefined);

    await expect(service.deleteRule("rule-retry-success")).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(2);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "deleteRule 缓存失效失败，准备重试/补偿",
      expect.objectContaining({
        id: "rule-retry-success",
        attempt: 1,
        maxAttempts: 2,
        error: "redis timeout",
      }),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith("deleteRule 缓存失效完成", {
      id: "rule-retry-success",
      attempt: 2,
      degradedInvalidation: false,
    });
  });

  it("缓存失效重试后仍失败时保持删除成功语义并记录补偿失败", async () => {
    const { service, crudModule, cacheServiceMock } = createService();
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");

    jest
      .spyOn(crudModule, "getRuleDocumentById")
      .mockResolvedValue(createRuleDoc({ _id: "rule-cache-fail" }));
    const deleteSpy = jest
      .spyOn(crudModule, "deleteRule")
      .mockResolvedValue(createRuleDoc({ _id: "rule-cache-fail" }));
    cacheServiceMock.invalidateRuleCache.mockRejectedValue(
      new Error("redis unavailable"),
    );

    await expect(service.deleteRule("rule-cache-fail")).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(cacheServiceMock.invalidateRuleCache).toHaveBeenCalledTimes(2);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "deleteRule 缓存失效失败，准备重试/补偿",
      expect.objectContaining({
        id: "rule-cache-fail",
        attempt: 1,
        maxAttempts: 2,
        error: "redis unavailable",
      }),
    );
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "deleteRule 缓存失效补偿仍失败（已忽略，不影响删除成功）",
      expect.objectContaining({
        id: "rule-cache-fail",
        maxAttempts: 2,
        error: "redis unavailable",
      }),
    );
  });
});
