jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { API_OPERATIONS } from "@common/constants/domain";
import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";

function createCapabilityMeta(capability: Record<string, unknown>) {
  return {
    capability,
    priority: 1,
    isEnabled: true,
  };
}

describe("StreamDataValidator ws capability validation", () => {
  const baseCapability = {
    description: "test capability",
    supportedMarkets: ["US"],
    supportedSymbolFormats: ["symbol.market"],
    execute: jest.fn(),
  };

  const baseSubscribeDto = {
    symbols: ["AAPL.US"],
    token: "jwt-token",
  };

  let providerRegistryService: {
    getProvider: jest.Mock;
    getAllCapabilities: jest.Mock;
  };
  let validator: StreamDataValidator;

  beforeEach(() => {
    providerRegistryService = {
      getProvider: jest.fn(),
      getAllCapabilities: jest.fn(() => new Map()),
    };
    validator = new StreamDataValidator(providerRegistryService as any);
  });

  it("动态能力优先：transport=stream 时能力校验通过", () => {
    providerRegistryService.getAllCapabilities.mockReturnValue(
      new Map([
        [
          "infoway",
          new Map([
            [
              API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
              createCapabilityMeta({
                ...baseCapability,
                name: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
                transport: "stream",
              }),
            ],
          ]),
        ],
      ]),
    );

    expect(
      validator.isValidWSCapability(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE),
    ).toBe(true);
  });

  it("动态能力优先：apiType=stream 时支持自定义流能力名", () => {
    providerRegistryService.getAllCapabilities.mockReturnValue(
      new Map([
        [
          "custom",
          new Map([
            [
              "custom-stream-quote",
              createCapabilityMeta({
                ...baseCapability,
                name: "custom-stream-quote",
                apiType: "stream",
              }),
            ],
          ]),
        ],
      ]),
    );

    expect(validator.isValidWSCapability("custom-stream-quote")).toBe(true);
  });

  it("动态未命中时返回 false", () => {
    providerRegistryService.getAllCapabilities.mockReturnValue(
      new Map([
        [
          "rest-provider",
          new Map([
            [
              "get-stock-quote",
              createCapabilityMeta({
                ...baseCapability,
                name: "get-stock-quote",
                transport: "rest",
              }),
            ],
          ]),
        ],
      ]),
    );

    expect(validator.isValidWSCapability("quote")).toBe(false);
  });

  it("降级场景：无 getAllCapabilities 接口时返回 false", () => {
    const fallbackValidator = new StreamDataValidator({
      getProvider: jest.fn(),
    } as any);

    expect(fallbackValidator.isValidWSCapability("quote")).toBe(false);
    expect(fallbackValidator.isValidWSCapability("unknown-capability")).toBe(
      false,
    );
  });

  it("动态与静态均不命中时返回 false", () => {
    providerRegistryService.getAllCapabilities.mockReturnValue(new Map());

    expect(validator.isValidWSCapability("unknown-capability")).toBe(false);
  });

  it("缓存命中：多次校验只触发一次动态能力扫描", () => {
    providerRegistryService.getAllCapabilities.mockReturnValue(
      new Map([
        [
          "custom",
          new Map([
            [
              "custom-stream-quote",
              createCapabilityMeta({
                ...baseCapability,
                name: "custom-stream-quote",
                apiType: "stream",
              }),
            ],
          ]),
        ],
      ]),
    );

    expect(validator.isValidWSCapability("custom-stream-quote")).toBe(true);
    expect(validator.isValidWSCapability("unknown-capability")).toBe(false);
    expect(validator.isValidWSCapability("quote")).toBe(false);
    expect(providerRegistryService.getAllCapabilities).toHaveBeenCalledTimes(1);
  });

  it("缓存刷新：refreshWSCapabilityCache 后重新读取 provider 能力", () => {
    providerRegistryService.getAllCapabilities
      .mockReturnValueOnce(
        new Map([
          [
            "custom",
            new Map([
              [
                "custom-stream-v1",
                createCapabilityMeta({
                  ...baseCapability,
                  name: "custom-stream-v1",
                  apiType: "stream",
                }),
              ],
            ]),
          ],
        ]),
      )
      .mockReturnValueOnce(
        new Map([
          [
            "custom",
            new Map([
              [
                "custom-stream-v2",
                createCapabilityMeta({
                  ...baseCapability,
                  name: "custom-stream-v2",
                  apiType: "stream",
                }),
              ],
            ]),
          ],
        ]),
      );

    expect(validator.isValidWSCapability("custom-stream-v1")).toBe(true);
    expect(validator.isValidWSCapability("custom-stream-v2")).toBe(false);

    validator.refreshWSCapabilityCache();

    expect(validator.isValidWSCapability("custom-stream-v2")).toBe(true);
    expect(providerRegistryService.getAllCapabilities).toHaveBeenCalledTimes(2);
  });

  it("validateSubscribeRequest: 不支持能力类型返回错误", () => {
    const result = validator.validateSubscribeRequest({
      ...baseSubscribeDto,
      wsCapabilityType: "unsupported-capability",
    } as any);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "不支持的WebSocket能力类型: unsupported-capability",
      ]),
    );
  });
});
