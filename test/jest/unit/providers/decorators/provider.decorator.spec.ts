import {
  Provider,
  ProviderConfig,
  getProviderMetadata,
  isProviderRegistered,
  getProviderConfig,
} from "../../../../../src/providers/decorators/provider.decorator";

describe("Provider Decorators", () => {
  it("Provider decorator should be defined", () => {
    expect(Provider).toBeDefined();
    expect(typeof Provider).toBe("function");
  });

  it("ProviderConfig decorator should be defined", () => {
    expect(ProviderConfig).toBeDefined();
    expect(typeof ProviderConfig).toBe("function");
  });

  it("should register provider metadata", () => {
    // 创建测试类
    @Provider({
      name: "test-provider",
      description: "测试提供商",
    })
    class TestProvider {}

    // 验证元数据
    const metadata = getProviderMetadata(TestProvider);
    expect(metadata).toBeDefined();
    expect(metadata.name).toBe("test-provider");
    expect(metadata.description).toBe("测试提供商");
    expect(isProviderRegistered(TestProvider)).toBe(true);
  });

  it("should register provider config", () => {
    // 创建测试类
    @ProviderConfig({
      _apiUrl: "https://test.api",
      _timeout: 5000,
    })
    class TestProviderWithConfig {}

    // 验证配置
    const config = getProviderConfig(TestProviderWithConfig);
    expect(config).toBeDefined();
    expect(config.apiUrl).toBe("https://test.api");
    expect(config.timeout).toBe(5000);
  });
});
