import { ProviderPriorityPolicyService } from "@providersv2/provider-priority-policy.service";
import { PROVIDER_IDS } from "@providersv2/provider-id.constants";

const ENV_KEYS = [
  "PROVIDER_PRIORITY_DEFAULT",
  "PROVIDER_PRIORITY_GET_STOCK_QUOTE",
  "PROVIDER_PRIORITY_STREAM_STOCK_QUOTE",
  "PROVIDER_PRIORITY_GET_MARKET_STATUS",
];

function clearPriorityEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("ProviderPriorityPolicyService", () => {
  beforeEach(() => {
    clearPriorityEnv();
  });

  afterAll(() => {
    clearPriorityEnv();
  });

  it("能力级配置应覆盖默认配置", () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "longport,jvquant,infoway";
    process.env.PROVIDER_PRIORITY_GET_STOCK_QUOTE = "infoway,jvquant,longport";

    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("get-stock-quote")).toEqual([
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.COINGECKO,
    ]);
  });

  it("能力级配置缺失时应回退默认配置", () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "jvquant,longport,infoway";

    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("stream-stock-quote")).toEqual([
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.COINGECKO,
    ]);
  });

  it("默认配置缺失时应回退注册顺序", () => {
    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("get-stock-quote")).toEqual([
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.COINGECKO,
    ]);
  });

  it("配置包含未知 provider 时应忽略并追加缺失 provider", () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "unknown,infoway";

    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("get-market-status")).toEqual([
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.COINGECKO,
    ]);
  });

  it("rankCandidates 应按配置排序，未配置候选按注册顺序后置", () => {
    process.env.PROVIDER_PRIORITY_GET_STOCK_QUOTE = "jvquant,longport";

    const service = new ProviderPriorityPolicyService();

    expect(
      service.rankCandidates("get-stock-quote", [
        "custom-provider",
        PROVIDER_IDS.LONGPORT,
        PROVIDER_IDS.INFOWAY,
        PROVIDER_IDS.JVQUANT,
      ]),
    ).toEqual([
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.INFOWAY,
      "custom-provider",
    ]);
  });

  it("能力名应自动映射为环境变量键（短横线转下划线）", () => {
    process.env.PROVIDER_PRIORITY_STREAM_STOCK_QUOTE = "jvquant,longport";

    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("stream-stock-quote")).toEqual([
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.COINGECKO,
    ]);
  });

  it("相同配置重复读取应命中缓存并避免重复告警", () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "unknown,unknown2";
    const service = new ProviderPriorityPolicyService();
    const warnSpy = jest
      .spyOn((service as any).logger, "warn")
      .mockImplementation(() => undefined);

    service.getOrderForCapability("get-stock-quote");
    service.getOrderForCapability("get-stock-quote");

    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it("环境变量变更后应触发缓存失效并重算顺序", () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "longport,jvquant,infoway";
    const service = new ProviderPriorityPolicyService();

    expect(service.getOrderForCapability("get-market-status")).toEqual([
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.COINGECKO,
    ]);

    process.env.PROVIDER_PRIORITY_DEFAULT = "jvquant,infoway,longport";

    expect(service.getOrderForCapability("get-market-status")).toEqual([
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.COINGECKO,
    ]);
  });
});
