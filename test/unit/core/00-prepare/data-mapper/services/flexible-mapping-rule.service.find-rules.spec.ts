jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { RULE_LIST_TYPE_VALUES } from "@core/00-prepare/data-mapper/constants/data-mapper.constants";

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

describe("FlexibleMappingRuleService 脏数据容错", () => {
  function createService(ruleDocs: any[]) {
    const queryMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(ruleDocs),
    };

    const ruleModelMock = {
      find: jest.fn().mockReturnValue(queryMock),
      countDocuments: jest.fn().mockResolvedValue(ruleDocs.length),
    };

    const paginationServiceMock = {
      normalizePaginationQuery: jest.fn().mockReturnValue({ page: 1, limit: 50 }),
      createPaginatedResponse: jest.fn(
        (
          data: unknown[],
          page: number,
          limit: number,
          total: number,
        ) => ({
          items: data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        }),
      ),
    };

    const cacheServiceMock = {
      getCachedRuleById: jest.fn().mockResolvedValue(null),
      cacheRuleById: jest.fn().mockResolvedValue(undefined),
      cacheBestMatchingRule: jest.fn().mockResolvedValue(undefined),
      invalidateRuleCache: jest.fn().mockResolvedValue(undefined),
      warmupCache: jest.fn().mockResolvedValue(undefined),
    };

    const service = new FlexibleMappingRuleService(
      ruleModelMock as any,
      {} as any,
      paginationServiceMock as any,
      {} as any,
      cacheServiceMock as any,
    );

    return {
      service,
      ruleModelMock,
      queryMock,
      paginationServiceMock,
      cacheServiceMock,
    };
  }

  it("findRules 遇到脏文档会 warn 并跳过，不影响其他结果", async () => {
    const validDoc = createRuleDoc({ _id: "rule-valid" });
    const dirtyDoc = createRuleDoc({
      _id: "rule-dirty",
      transDataRuleListType: "invalid_type",
    });

    const { service, ruleModelMock } = createService([validDoc, dirtyDoc]);
    const warnMock = (service as any).logger.warn as jest.Mock;

    const result = await service.findRules(1, 50);
    const findFilter = ruleModelMock.find.mock.calls[0][0];
    const countFilter = ruleModelMock.countDocuments.mock.calls[0][0];

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("rule-valid");
    expect(findFilter).toEqual(countFilter);
    expect(findFilter.transDataRuleListType).toEqual({
      $in: RULE_LIST_TYPE_VALUES,
    });
    expect(warnMock).toHaveBeenCalledWith(
      "findRules 跳过脏数据映射规则",
      expect.objectContaining({
        ruleId: "rule-dirty",
        transDataRuleListType: "invalid_type",
        page: 1,
        limit: 50,
      }),
    );
  });

  it.each([
    ["空白", "   ", undefined],
    ["具体值", "  InFoWay  ", "infoway"],
    ["未传", undefined, undefined],
  ] as const)(
    "findRules provider %s 时按兼容语义构造过滤条件",
    async (_caseName, providerInput, expectedProvider) => {
      const { service, ruleModelMock } = createService([]);

      await service.findRules(1, 50, providerInput as any);

      const findFilter = ruleModelMock.find.mock.calls[0][0];
      if (expectedProvider === undefined) {
        expect(findFilter).not.toHaveProperty("provider");
        return;
      }
      expect(findFilter.provider).toBe(expectedProvider);
    },
  );

  it("findRuleById 遇到脏文档时保持结构化失败", async () => {
    const dirtyDoc = createRuleDoc({
      _id: "rule-dirty",
      transDataRuleListType: "invalid_type",
    });
    const { service, cacheServiceMock } = createService([]);
    const crudModule = (service as any).crudModule;

    jest.spyOn(crudModule, "getRuleDocumentById").mockResolvedValue(dirtyDoc);

    await expect(service.findRuleById("rule-dirty")).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      component: ComponentIdentifier.DATA_MAPPER,
      context: expect.objectContaining({
        documentId: "rule-dirty",
        transDataRuleListType: "invalid_type",
      }),
    });
    expect(cacheServiceMock.cacheRuleById).not.toHaveBeenCalled();
  });
});
