jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";

describe("DataTransformerService infoway candle expansion", () => {
  const createService = () => {
    const candleMappingRuleMeta = {
      id: "rule-infoway-candle",
      name: "Infoway Candle Rule",
      fieldMappings: [
        {
          sourceFieldPath: "respList.c",
          targetField: "lastPrice",
        },
      ],
    };
    const quoteMappingRuleMeta = {
      id: "rule-infoway-quote",
      name: "Infoway Quote Rule",
      fieldMappings: [
        {
          sourceFieldPath: "p",
          targetField: "lastPrice",
        },
      ],
    };

    const flexibleMappingRuleService = {
      findRuleById: jest.fn(),
      findBestMatchingRule: jest.fn(async (_provider: string, _apiType: string, ruleType: string) =>
        ruleType === "candle_fields" ? candleMappingRuleMeta : quoteMappingRuleMeta,
      ),
      findBestWildcardMarketRule: jest.fn(async () => null),
      getRuleDocumentById: jest.fn(async () => ({
        _id: "rule-infoway-candle",
        fieldMappings: [],
      })),
      applyFlexibleMappingRule: jest.fn(async (_rule: any, source: any) => ({
        success: true,
        transformedData: {
          symbol: source?.s,
          lastPrice: source?.respList?.c,
          timestamp: source?.respList?.t,
        },
      })),
    };

    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async (_provider: string, symbol: string) => symbol),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === "STANDARD_SYMBOL_IDENTITY_PROVIDERS" ? "infoway" : undefined,
      ),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService as any,
      symbolTransformerService as any,
      undefined,
      configService as any,
    );

    return {
      service,
      candleMappingRuleMeta,
      flexibleMappingRuleService,
    };
  };

  it("normalizeSourceRecordsForMapping: infoway candle_fields 展开 respList 点位", () => {
    const { service, candleMappingRuleMeta } = createService();
    const result = (service as any).normalizeSourceRecordsForMapping(
      {
        provider: "infoway",
        transDataRuleListType: "candle_fields",
      },
      [
        {
          s: "AAPL.US",
          respList: [{ c: "183.11", t: 1709251260 }, { c: "182.31", t: 1709251200 }],
        },
        {
          s: "EMPTY.US",
          respList: [],
        },
        {
          s: "MSFT.US",
        },
      ],
      candleMappingRuleMeta,
    );

    expect(result.forceArrayResult).toBe(true);
    expect(result.records).toEqual([
      {
        s: "AAPL.US",
        c: "183.11",
        t: 1709251260,
        respList: { c: "183.11", t: 1709251260 },
      },
      {
        s: "AAPL.US",
        c: "182.31",
        t: 1709251200,
        respList: { c: "182.31", t: 1709251200 },
      },
      {
        s: "MSFT.US",
      },
    ]);
  });

  it("normalizeSourceRecordsForMapping: 混合输入保持既有展开行为", () => {
    const { service, candleMappingRuleMeta } = createService();
    const result = (service as any).normalizeSourceRecordsForMapping(
      {
        provider: "infoway",
        transDataRuleListType: "candle_fields",
      },
      [
        null,
        "raw",
        123,
        {
          s: "AAPL.US",
          respList: [
            { c: "183.11", t: 1709251260 },
            null,
            "bad-point",
            { c: "182.31", t: 1709251200 },
          ],
        },
        {
          s: "EMPTY.US",
          respList: [],
        },
        {
          s: "MSFT.US",
          respList: [1, "x"],
        },
        {
          s: "NOARRAY.US",
        },
      ],
      candleMappingRuleMeta,
    );

    expect(result.forceArrayResult).toBe(true);
    expect(result.records).toEqual([
      null,
      "raw",
      123,
      {
        s: "AAPL.US",
        c: "183.11",
        t: 1709251260,
        respList: { c: "183.11", t: 1709251260 },
      },
      {
        s: "AAPL.US",
        c: "182.31",
        t: 1709251200,
        respList: { c: "182.31", t: 1709251200 },
      },
      {
        s: "NOARRAY.US",
      },
    ]);
  });

  it("transform: infoway candle_fields 将 batch_kline 展开为逐点映射结果", async () => {
    const { service, flexibleMappingRuleService } = createService();

    const response = await service.transform({
      provider: "infoway",
      apiType: "rest",
      transDataRuleListType: "candle_fields",
      rawData: [
        {
          s: "AAPL.US",
          respList: [{ c: "183.11", t: 1709251260 }, { c: "182.31", t: 1709251200 }],
        },
      ],
      options: {},
    } as any);

    expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledTimes(2);
    expect(response.transformedData).toEqual([
      { symbol: "AAPL.US", lastPrice: "183.11", timestamp: 1709251260 },
      { symbol: "AAPL.US", lastPrice: "182.31", timestamp: 1709251200 },
    ]);
    expect(response.metadata.recordsProcessed).toBe(2);
  });

  it("transform: 非 infoway/candle_fields 场景不展开 respList", async () => {
    const { service, flexibleMappingRuleService } = createService();

    await service.transform({
      provider: "infoway",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      rawData: [
        {
          s: "AAPL.US",
          respList: [{ c: "183.11", t: 1709251260 }, { c: "182.31", t: 1709251200 }],
        },
      ],
      options: {},
    } as any);

    expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledTimes(1);
    const firstCallSource = flexibleMappingRuleService.applyFlexibleMappingRule.mock.calls[0][1];
    expect(Array.isArray(firstCallSource.respList)).toBe(true);
  });
});
