import { MarketTypeResolverService } from "@core/00-prepare/data-mapper/services/market-type-resolver.service";

describe("MarketTypeResolverService market type resolve", () => {
  function createService(): MarketTypeResolverService {
    return new MarketTypeResolverService();
  }

  it.each([
    ["港股+美股 行情模板", "HK/US"],
    ["A股+美股 行情模板", "SH/SZ/US"],
    ["港股+A股+美股 行情模板", "HK/SH/SZ/US"],
  ])("组合市场模板名应优先命中: %s", (templateName, expected) => {
    const service = createService();

    const actual = service.resolveMarketTypeFromTemplateName(String(templateName));

    expect(actual).toBe(expected);
  });

  it.each([
    ["港股 行情模板", "HK"],
    ["A股 行情模板", "SH/SZ"],
    ["美股 行情模板", "US"],
    ["港股+A股 行情模板", "HK/SH/SZ"],
  ])("单市场与既有双市场规则保持兼容: %s", (templateName, expected) => {
    const service = createService();

    const actual = service.resolveMarketTypeFromTemplateName(String(templateName));

    expect(actual).toBe(expected);
  });

  it("无关键词时保持 null，由上层兜底逻辑处理", () => {
    const service = createService();

    const fromName = service.resolveMarketTypeFromTemplateName("外汇模板");

    expect(fromName).toBeNull();
  });

  it("无关键词时仍可回退到 sampleData 解析", () => {
    const service = createService();
    const template = {
      name: "外汇模板",
      apiType: "rest",
      provider: "custom-provider",
      sampleData: {
        symbol: "AAPL.US",
      },
    } as any;

    const marketType = service.resolveQuoteLikeMarketType(template);

    expect(marketType).toBe("US");
  });

  it.each([
    ["market_status_fields", "港美双市场状态模板", { market: "HK/US" }],
    ["trading_days_fields", "全市场交易日模板", { marketTypes: ["HK", "US"] }],
  ] as const)(
    "%s 默认 marketType 为 *（多市场/未显式单市场）",
    (ruleType, templateName, sampleData) => {
      const service = createService();
      const template = {
        name: templateName,
        apiType: "rest",
        provider: "custom-provider",
        sampleData,
      } as any;

      const marketType = service.resolveMarketType(template, ruleType);

      expect(marketType).toBe("*");
    },
  );

  it("candle_fields 与 quote_fields 一样按行情市场逻辑解析", () => {
    const service = createService();
    const template = {
      name: "美股分时模板",
      apiType: "rest",
      provider: "custom-provider",
      sampleData: { symbol: "AAPL.US" },
    } as any;

    const marketType = service.resolveMarketType(template, "candle_fields");

    expect(marketType).toBe("US");
  });

  it("infoway rest quote_fields 自动包含 CRYPTO 市场", () => {
    const service = createService();
    const template = {
      name: "Infoway REST 报价模板(基于batch_trade原始字段)",
      apiType: "rest",
      provider: "infoway",
      sampleData: { symbol: "AAPL.US" },
    } as any;

    const marketType = service.resolveMarketType(template, "quote_fields");

    expect(marketType).toBe("HK/SH/SZ/US/CRYPTO");
  });

  it("infoway stream quote_fields 自动包含 CRYPTO 市场", () => {
    const service = createService();
    const template = {
      name: "Infoway WebSocket 报价流模板(基于Trade推送原始字段)",
      apiType: "stream",
      provider: "infoway",
      sampleData: { symbol: "AAPL.US" },
    } as any;

    const marketType = service.resolveMarketType(template, "quote_fields");

    expect(marketType).toBe("HK/SH/SZ/US/CRYPTO");
  });

  it("infoway rest candle_fields 自动包含 CRYPTO 市场", () => {
    const service = createService();
    const template = {
      name: "Infoway REST 分时K线模板(基于batch_kline原始字段)",
      apiType: "rest",
      provider: "infoway",
      sampleData: { symbol: "AAPL.US" },
    } as any;

    const marketType = service.resolveMarketType(template, "candle_fields");

    expect(marketType).toBe("HK/SH/SZ/US/CRYPTO");
  });

  it.each([
    ["market_status_fields", "美股市场状态模板", "US"],
    ["trading_days_fields", "港股交易日模板", "HK"],
  ] as const)(
    "%s 模板显式单市场时保留单市场",
    (ruleType, templateName, expected) => {
      const service = createService();
      const template = {
        name: templateName,
        apiType: "rest",
        provider: "custom-provider",
        sampleData: { symbol: "AAPL.US" },
      } as any;

      const marketType = service.resolveMarketType(template, ruleType);

      expect(marketType).toBe(expected);
    },
  );

  it.each([
    ["基础信息模板", { symbol: "AAPL.US" }],
    ["港股+美股基础信息模板", { symbol: "AAPL.US" }],
    ["基础信息模板", { marketTypes: ["HK", "US"] }],
  ] as const)(
    "basic_info_fields 默认 marketType 为 *（非显式单市场）: %s",
    (templateName, sampleData) => {
      const service = createService();
      const template = {
        name: templateName,
        apiType: "rest",
        provider: "custom-provider",
        sampleData,
      } as any;

      const marketType = service.resolveMarketType(template, "basic_info_fields");

      expect(marketType).toBe("*");
    },
  );

  it.each([
    ["美股基础信息模板", "US"],
    ["港股基础信息模板", "HK"],
    ["A股基础信息模板", "SH/SZ"],
  ] as const)(
    "basic_info_fields 模板显式单市场时收窄: %s",
    (templateName, expected) => {
      const service = createService();
      const template = {
        name: templateName,
        apiType: "rest",
        provider: "custom-provider",
        sampleData: { marketTypes: ["HK", "US"] },
      } as any;

      const marketType = service.resolveMarketType(template, "basic_info_fields");

      expect(marketType).toBe(expected);
    },
  );
});
