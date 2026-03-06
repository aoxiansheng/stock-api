jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";

describe("StreamDataValidator provider matrix", () => {
  const baseDto = {
    symbols: ["AAPL.US"],
    wsCapabilityType: "quote",
    token: "jwt-token",
  };

  let providerRegistryService: { getProvider: jest.Mock };
  let validator: StreamDataValidator;

  beforeEach(() => {
    providerRegistryService = {
      getProvider: jest.fn((provider: string) => {
        if (provider === "longport") {
          return { id: "longport" };
        }
        return undefined;
      }),
    };
    validator = new StreamDataValidator(providerRegistryService as any);
  });

  describe("isValidProvider", () => {
    it("合法 provider 会进行 trim + lowercase 后匹配", () => {
      expect(validator.isValidProvider("  LongPort  ")).toBe(true);
      expect(providerRegistryService.getProvider).toHaveBeenCalledWith("longport");
    });

    it("空值 provider 返回 false", () => {
      expect(validator.isValidProvider("   ")).toBe(false);
      expect(providerRegistryService.getProvider).not.toHaveBeenCalled();
    });

    it("未知 provider 返回 false", () => {
      expect(validator.isValidProvider("unknown-provider")).toBe(false);
      expect(providerRegistryService.getProvider).toHaveBeenCalledWith("unknown-provider");
    });
  });

  describe("validateSubscribeRequest provider 矩阵", () => {
    it("合法 provider：请求通过且不产生 provider warning", () => {
      const result = validator.validateSubscribeRequest({
        ...baseDto,
        preferredProvider: " LongPort ",
      } as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("空值 provider：请求通过且不触发 provider 校验", () => {
      const result = validator.validateSubscribeRequest({
        ...baseDto,
        preferredProvider: "",
      } as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("未知 provider：请求通过但产生 provider warning", () => {
      const result = validator.validateSubscribeRequest({
        ...baseDto,
        preferredProvider: "unknown-provider",
      } as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual(["未知的数据提供商: unknown-provider"]);
    });

    it("连接已认证时：跳过消息级认证字段校验", () => {
      const result = validator.validateSubscribeRequest(
        {
          symbols: ["AAPL.US"],
          wsCapabilityType: "quote",
        } as any,
        { skipAuthValidation: true },
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("连接未认证时：仍严格校验消息级认证字段", () => {
      const result = validator.validateSubscribeRequest({
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "缺少认证信息：需要提供JWT Token或API Key + Access Token",
        ]),
      );
    });
  });
});
