import { PersistedTemplateService } from "@core/00-prepare/data-mapper/services/persisted-template.service";

function createService(): PersistedTemplateService {
  return new PersistedTemplateService({} as any, {} as any, {} as any);
}

function createTemplate(name: string, fieldNames: string[]): any {
  return {
    name,
    extractedFields: fieldNames.map((fieldName) => ({ fieldName })),
  };
}

describe("PersistedTemplateService determineRuleType", () => {
  it.each([
    {
      name: "模板名优先：交易日关键词覆盖报价字段",
      templateName: "自定义交易日模板",
      fieldNames: ["lastDone", "high", "low", "volume"],
      expected: "trading_days_fields",
    },
    {
      name: "模板名优先：基础信息关键词覆盖报价字段",
      templateName: "股票基础信息模板",
      fieldNames: ["lastDone", "high", "low", "volume"],
      expected: "basic_info_fields",
    },
    {
      name: "模板名优先：市场状态关键词覆盖基础字段",
      templateName: "市场状态模板",
      fieldNames: ["nameCn", "nameEn", "exchange", "currency"],
      expected: "market_status_fields",
    },
    {
      name: "模板名优先：分时关键词命中 candle",
      templateName: "Infoway 分时K线模板",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice"],
      expected: "candle_fields",
    },
    {
      name: "模板名优先：报价关键词命中 quote",
      templateName: "Infoway 报价模板",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice"],
      expected: "quote_fields",
    },
  ])("$name", ({ templateName, fieldNames, expected }) => {
    const service = createService();

    const actual = (service as any).determineRuleType(
      createTemplate(templateName, fieldNames),
    );

    expect(actual).toBe(expected);
  });

  it.each([
    {
      name: "字段命中：基础信息字段",
      fieldNames: ["nameCn", "nameEn", "exchange", "currency", "eps"],
      expected: "basic_info_fields",
    },
    {
      name: "字段命中：市场状态字段",
      fieldNames: ["tradeSchedules", "market", "remark"],
      expected: "market_status_fields",
    },
    {
      name: "字段命中：交易日字段",
      fieldNames: ["tradeDays", "halfTradeDays", "beginDay", "endDay"],
      expected: "trading_days_fields",
    },
    {
      name: "字段命中：报价字段默认归类",
      fieldNames: ["lastDone", "high", "low", "open", "volume"],
      expected: "quote_fields",
    },
    {
      name: "字段命中：无关键词且仅价格四元组归类 quote",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice"],
      expected: "quote_fields",
    },
    {
      name: "字段命中：价格四元组加时间戳归类 quote",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice", "timestamp"],
      expected: "quote_fields",
    },
    {
      name: "字段命中：分时字段归类 candle",
      fieldNames: [
        "lastPrice",
        "previousClose",
        "openPrice",
        "highPrice",
        "lowPrice",
        "changePercent",
      ],
      expected: "candle_fields",
    },
    {
      name: "字段命中：分时特征加上下文字段仍归类 candle",
      fieldNames: [
        "symbol",
        "market",
        "lastPrice",
        "previousClose",
        "openPrice",
        "highPrice",
        "lowPrice",
        "volume",
        "turnover",
        "changePercent",
        "timestamp",
        "tradeStatus",
      ],
      expected: "candle_fields",
    },
  ])("$name", ({ fieldNames, expected }) => {
    const service = createService();

    const actual = (service as any).determineRuleType(
      createTemplate("无关键词模板", fieldNames),
    );

    expect(actual).toBe(expected);
  });

  it.each([
    {
      name: "冲突优先级：模板名冲突时按名称规则顺序优先基础信息",
      templateName: "基础信息报价模板",
      fieldNames: ["lastDone", "high", "low", "volume"],
      expected: "basic_info_fields",
    },
    {
      name: "冲突优先级：模板名同时包含报价与分时K线时优先报价",
      templateName: "Infoway 报价分时K线模板",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice"],
      expected: "quote_fields",
    },
    {
      name: "冲突优先级：模板名同时包含 quote 与 candle 时优先报价",
      templateName: "Infoway Quote Candle Template",
      fieldNames: ["lastPrice", "openPrice", "highPrice", "lowPrice"],
      expected: "quote_fields",
    },
    {
      name: "冲突优先级：字段同时命中交易日与市场状态时优先交易日",
      templateName: "无关键词模板",
      fieldNames: ["tradeDays", "beginDay", "market", "remark", "tradeSchedules"],
      expected: "trading_days_fields",
    },
  ])("$name", ({ templateName, fieldNames, expected }) => {
    const service = createService();

    const actual = (service as any).determineRuleType(
      createTemplate(templateName, fieldNames),
    );

    expect(actual).toBe(expected);
  });
});
