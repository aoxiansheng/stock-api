jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";
import type { FlexibleMappingRuleResponseDto } from "@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";

describe("FlexibleMappingRuleService best rule 查询归一化", () => {
  function createRuleDoc(overrides: Partial<Record<string, any>> = {}): any {
    return {
      _id: "rule-1",
      name: "rule-name",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      marketType: "US",
      sourceTemplateId: "",
      fieldMappings: [],
      isActive: true,
      isDefault: true,
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

  function createService(cacheServiceMock: Record<string, any>) {
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
      crudModule: (service as any).crudModule,
    };
  }

  async function flushImmediate(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  it("findBestMatchingRule 链路只向 cache/crud 传递归一化 provider/apiType", async () => {
    const cacheServiceMock = {
      getCachedBestMatchingRule: jest.fn().mockResolvedValue(null),
      cacheBestMatchingRule: jest.fn().mockResolvedValue(undefined),
    };
    const { service, crudModule } = createService(cacheServiceMock);
    jest
      .spyOn(crudModule, "findBestMatchingRuleDocument")
      .mockResolvedValue(createRuleDoc({ _id: "rule-normalized" }));

    const result = await service.findBestMatchingRule(
      "  LongPort  ",
      "REST" as any,
      "  QUOTE_FIELDS  ",
      "us",
    );
    await flushImmediate();

    expect(result?.id).toBe("rule-normalized");
    expect(cacheServiceMock.getCachedBestMatchingRule).toHaveBeenCalledWith(
      "longport",
      "rest",
      "quote_fields",
      "US",
      {},
    );
    expect(crudModule.findBestMatchingRuleDocument).toHaveBeenCalledWith(
      "longport",
      "rest",
      "quote_fields",
      "US",
      {},
    );
    expect(cacheServiceMock.cacheBestMatchingRule).toHaveBeenCalledWith(
      "longport",
      "rest",
      "quote_fields",
      "US",
      expect.objectContaining({ id: "rule-normalized" }),
      {},
    );
  });

  it("大小写与空格输入可稳定命中同一 best rule 缓存键", async () => {
    const store = new Map<string, FlexibleMappingRuleResponseDto>();
    const makeKey = (
      provider: string,
      apiType: string,
      transDataRuleListType: string,
      marketType: string,
      strictWildcardOnly: boolean,
    ): string =>
      [
        provider,
        apiType,
        transDataRuleListType,
        marketType,
        strictWildcardOnly ? "strict" : "default",
      ].join("|");

    const cacheServiceMock = {
      getCachedBestMatchingRule: jest.fn(
        async (
          provider: string,
          apiType: string,
          transDataRuleListType: string,
          marketType: string,
          options: { strictWildcardOnly?: boolean } = {},
        ) =>
          store.get(
            makeKey(
              provider,
              apiType,
              transDataRuleListType,
              marketType,
              Boolean(options.strictWildcardOnly),
            ),
          ) ?? null,
      ),
      cacheBestMatchingRule: jest.fn(
        async (
          provider: string,
          apiType: string,
          transDataRuleListType: string,
          marketType: string,
          rule: FlexibleMappingRuleResponseDto,
          options: { strictWildcardOnly?: boolean } = {},
        ) => {
          store.set(
            makeKey(
              provider,
              apiType,
              transDataRuleListType,
              marketType,
              Boolean(options.strictWildcardOnly),
            ),
            rule,
          );
        },
      ),
    };

    const { service, crudModule } = createService(cacheServiceMock);
    jest
      .spyOn(crudModule, "findBestMatchingRuleDocument")
      .mockResolvedValue(createRuleDoc({ _id: "rule-hit-stable" }));

    const first = await service.findBestMatchingRule(
      "  LONGPORT ",
      " Rest " as any,
      " quote_fields ",
      "us",
    );
    await flushImmediate();

    const second = await service.findBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "US",
    );

    expect(first?.id).toBe("rule-hit-stable");
    expect(second?.id).toBe("rule-hit-stable");
    expect(crudModule.findBestMatchingRuleDocument).toHaveBeenCalledTimes(1);
  });
});
