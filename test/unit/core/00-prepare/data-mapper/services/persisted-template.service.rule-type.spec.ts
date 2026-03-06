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
