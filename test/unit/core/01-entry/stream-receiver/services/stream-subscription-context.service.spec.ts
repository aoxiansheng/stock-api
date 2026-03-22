jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { BusinessException, BusinessErrorCode } from "@common/core/exceptions";
import { StreamSubscriptionContextService } from "@core/01-entry/stream-receiver/services/stream-subscription-context.service";
import { STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY } from "@core/shared/utils/provider-symbol-identity.util";
import { MappingDirection } from "@core/shared/constants";
import { ConfigService } from "@nestjs/config";
import { SymbolTransformerService } from "@core/02-processing/symbol-transformer/services/symbol-transformer.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";

function createService(options?: {
  standardSymbolIdentityProviders?: string;
}) {
  const mocks = {
    configService: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY) {
          return options?.standardSymbolIdentityProviders ?? "";
        }
        return defaultValue;
      }),
    },
    symbolTransformerService: {
      transformSymbols: jest.fn(),
      transformSymbolsForProvider: jest.fn(),
    },
    clientStateManager: {
      getClientSubscription: jest.fn(),
    },
    dataValidator: {
      isValidSymbolFormat: jest.fn((symbol: string) => {
        return (
          /^[0-9]{4,5}\.HK$/i.test(symbol) ||
          /^[A-Z0-9]+(?:[.\-][A-Z0-9]+){0,2}\.US$/i.test(symbol) ||
          /^[0-9]{6}\.(SH|SZ)$/i.test(symbol) ||
          /^[A-Z0-9]{3,5}\.SG$/i.test(symbol)
        );
      }),
    },
  };

  const service = new StreamSubscriptionContextService(
    mocks.configService as unknown as ConfigService,
    mocks.symbolTransformerService as unknown as SymbolTransformerService,
    mocks.clientStateManager as unknown as StreamClientStateManager,
    mocks.dataValidator as unknown as StreamDataValidator,
  );

  return { service, mocks };
}

// =============== 符号规范化 ===============

describe("StreamSubscriptionContextService 符号规范化", () => {
  // 1. toCanonicalSymbol
  describe("toCanonicalSymbol", () => {
    it("正常字符串应返回大写", () => {
      const { service } = createService();
      expect(service.toCanonicalSymbol("aapl.us")).toBe("AAPL.US");
    });

    it("带前后空白的字符串应 trim 后大写", () => {
      const { service } = createService();
      expect(service.toCanonicalSymbol("  aapl.us  ")).toBe("AAPL.US");
    });

    it("空字符串应返回空", () => {
      const { service } = createService();
      expect(service.toCanonicalSymbol("")).toBe("");
    });

    it("纯空白字符串应返回空", () => {
      const { service } = createService();
      expect(service.toCanonicalSymbol("   ")).toBe("");
    });

    it("非字符串输入应返回空", () => {
      const { service } = createService();
      expect(service.toCanonicalSymbol(123 as unknown as string)).toBe("");
      expect(service.toCanonicalSymbol(null as unknown as string)).toBe("");
      expect(service.toCanonicalSymbol(undefined as unknown as string)).toBe("");
    });
  });

  // 2. buildCanonicalSymbolKey
  describe("buildCanonicalSymbolKey", () => {
    it("带 prefix 应返回 prefix + canonical symbol", () => {
      const { service } = createService();
      expect(service.buildCanonicalSymbolKey("aapl.us", "quote:")).toBe(
        "quote:AAPL.US",
      );
    });

    it("不带 prefix 应返回 canonical symbol", () => {
      const { service } = createService();
      expect(service.buildCanonicalSymbolKey("aapl.us")).toBe("AAPL.US");
    });

    it("空符号应返回空字符串", () => {
      const { service } = createService();
      expect(service.buildCanonicalSymbolKey("", "prefix:")).toBe("");
    });
  });

  // 3. buildSymbolBroadcastKey
  describe("buildSymbolBroadcastKey", () => {
    it("合法格式应返回 canonical symbol", () => {
      const { service } = createService();
      expect(service.buildSymbolBroadcastKey("aapl.us")).toBe("AAPL.US");
    });

    it("非法格式应返回空字符串", () => {
      const { service, mocks } = createService();
      mocks.dataValidator.isValidSymbolFormat.mockReturnValue(false);
      expect(service.buildSymbolBroadcastKey("INVALID")).toBe("");
    });

    it("空字符串应返回空", () => {
      const { service } = createService();
      expect(service.buildSymbolBroadcastKey("")).toBe("");
    });
  });

  // 4. buildSymbolRoomKey
  describe("buildSymbolRoomKey", () => {
    it("应返回 symbol: 前缀的 key", () => {
      const { service } = createService();
      expect(service.buildSymbolRoomKey("aapl.us")).toBe("symbol:AAPL.US");
    });

    it("空字符串应返回空", () => {
      const { service } = createService();
      expect(service.buildSymbolRoomKey("")).toBe("");
    });
  });

  // 5. buildSymbolRooms
  describe("buildSymbolRooms", () => {
    it("多个 symbol 应生成对应房间列表", () => {
      const { service } = createService();
      const rooms = service.buildSymbolRooms(["aapl.us", "00700.hk"]);
      expect(rooms).toEqual(["symbol:AAPL.US", "symbol:00700.HK"]);
    });

    it("含空值时应自动过滤并去重", () => {
      const { service } = createService();
      const rooms = service.buildSymbolRooms([
        "aapl.us",
        "",
        "AAPL.US",
        "  ",
      ]);
      expect(rooms).toEqual(["symbol:AAPL.US"]);
    });

    it("空数组应返回空数组", () => {
      const { service } = createService();
      expect(service.buildSymbolRooms([])).toEqual([]);
    });
  });
});

// =============== Identity Provider 校验 ===============

describe("StreamSubscriptionContextService Identity Provider 校验", () => {
  // 6. isProviderUsingStandardSymbolIdentity
  describe("isProviderUsingStandardSymbolIdentity", () => {
    it("命中时返回 true", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });
      expect(service.isProviderUsingStandardSymbolIdentity("longport")).toBe(
        true,
      );
    });

    it("未命中时返回 false", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });
      expect(service.isProviderUsingStandardSymbolIdentity("infoway")).toBe(
        false,
      );
    });

    it("配置为空时返回 false", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "",
      });
      expect(service.isProviderUsingStandardSymbolIdentity("longport")).toBe(
        false,
      );
    });
  });

  // 7. validateIdentityProviderRawSymbolsNoBoundaryWhitespace
  describe("validateIdentityProviderRawSymbolsNoBoundaryWhitespace", () => {
    it("identity provider 下含首尾空白的 symbols 应抛异常", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });
      expect(() =>
        service.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
          ["  AAPL.US  "],
          "longport",
          "req-1",
          "subscribeStream",
        ),
      ).toThrow();
    });

    it("identity provider 下正常输入不抛异常", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });
      expect(() =>
        service.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
          ["AAPL.US"],
          "longport",
          "req-1",
          "subscribeStream",
        ),
      ).not.toThrow();
    });

    it("非 identity provider 应跳过校验", () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });
      expect(() =>
        service.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
          ["  AAPL.US  "],
          "infoway",
          "req-1",
          "subscribeStream",
        ),
      ).not.toThrow();
    });
  });

  // 8. validateIdentityProviderStandardSymbols
  describe("validateIdentityProviderStandardSymbols", () => {
    it("非标准符号应抛异常", () => {
      const { service } = createService();
      // "AAPL" 没有市场后缀，不是标准符号
      expect(() =>
        service.validateIdentityProviderStandardSymbols(
          ["AAPL"],
          "longport",
          "req-1",
        ),
      ).toThrow();
    });

    it("标准符号不应抛异常", () => {
      const { service } = createService();
      expect(() =>
        service.validateIdentityProviderStandardSymbols(
          ["AAPL.US", "00700.HK"],
          "longport",
          "req-1",
        ),
      ).not.toThrow();
    });
  });
});

// =============== 符号映射 ===============

describe("StreamSubscriptionContextService 符号映射", () => {
  // 9. resolveSymbolMappings - identity provider 直通
  describe("resolveSymbolMappings - identity provider", () => {
    it("identity provider 应返回 canonical 且跳过 transformSymbolsForProvider", async () => {
      const { service, mocks } = createService({
        standardSymbolIdentityProviders: "longport",
      });

      const result = await service.resolveSymbolMappings(
        ["AAPL.US", "00700.HK"],
        "longport",
        "req-1",
      );

      // 应返回 canonical symbols（standardSymbols === providerSymbols）
      expect(result.standardSymbols).toEqual(result.providerSymbols);
      expect(result.standardSymbols).toEqual(["AAPL.US", "00700.HK"]);
      // 不应调用 transformSymbols 或 transformSymbolsForProvider
      expect(mocks.symbolTransformerService.transformSymbols).not.toHaveBeenCalled();
      expect(
        mocks.symbolTransformerService.transformSymbolsForProvider,
      ).not.toHaveBeenCalled();
    });

    it("identity provider 输入包含空白符号时应抛异常，避免漏出空 canonical symbol", async () => {
      const { service } = createService({
        standardSymbolIdentityProviders: "longport",
      });

      await expect(
        service.resolveSymbolMappings(["AAPL.US", "   "], "longport", "req-1"),
      ).rejects.toBeInstanceOf(BusinessException);
    });
  });

  // 10. resolveSymbolMappings - 非 identity provider
  describe("resolveSymbolMappings - 非 identity provider", () => {
    it("非 identity provider 应调用 mapSymbols + mapSymbolsForProvider", async () => {
      const { service, mocks } = createService({
        standardSymbolIdentityProviders: "",
      });

      mocks.symbolTransformerService.transformSymbols.mockResolvedValue({
        mappingDetails: { AAPL: "AAPL.US" },
      });
      mocks.symbolTransformerService.transformSymbolsForProvider.mockResolvedValue(
        {
          transformedSymbols: ["AAPL"],
          mappingResults: { transformedSymbols: { "AAPL.US": "AAPL" } },
        },
      );

      const result = await service.resolveSymbolMappings(
        ["AAPL"],
        "longport",
        "req-1",
      );

      expect(mocks.symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        "longport",
        ["AAPL"],
        MappingDirection.TO_STANDARD,
      );
      expect(
        mocks.symbolTransformerService.transformSymbolsForProvider,
      ).toHaveBeenCalled();
      expect(result.standardSymbols).toEqual(["AAPL.US"]);
      expect(result.providerSymbols).toEqual(["AAPL"]);
    });
  });

  // 11. mapSymbols - 映射失败时抛异常
  describe("mapSymbols", () => {
    it("映射失败时应抛业务异常而不是返回原始 symbols", async () => {
      const { service, mocks } = createService();
      mocks.symbolTransformerService.transformSymbols.mockRejectedValue(
        new Error("mapping failed"),
      );

      await expect(service.mapSymbols(["AAPL"], "longport", "req-1")).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "mapSymbols",
        context: expect.objectContaining({
          provider: "longport",
          requestId: "req-1",
          reason: "symbol_mapping_failed",
        }),
      });
    });

    it("映射成功时返回映射后的 symbols", async () => {
      const { service, mocks } = createService();
      mocks.symbolTransformerService.transformSymbols.mockResolvedValue({
        mappingDetails: { AAPL: "AAPL.US", "00700": "00700.HK" },
      });

      const result = await service.mapSymbols(
        ["AAPL", "00700"],
        "longport",
      );
      expect(result).toEqual(["AAPL.US", "00700.HK"]);
    });

    it("部分映射缺失且原始 symbol 不是标准格式时应抛业务异常", async () => {
      const { service, mocks } = createService();
      mocks.symbolTransformerService.transformSymbols.mockResolvedValue({
        mappingDetails: { AAPL: "AAPL.US" },
      });

      await expect(
        service.mapSymbols(["AAPL", "UNKNOWN"], "longport", "req-partial"),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "mapSymbols",
        context: expect.objectContaining({
          provider: "longport",
          requestId: "req-partial",
          reason: "symbol_mapping_failed",
        }),
      });
    });
  });

  describe("mapSymbolsForProvider", () => {
    it("provider 符号映射失败时应抛业务异常", async () => {
      const { service, mocks } = createService();
      mocks.symbolTransformerService.transformSymbolsForProvider.mockRejectedValue(
        new Error("provider mapping failed"),
      );

      await expect(
        service.mapSymbolsForProvider(
          "longport",
          ["AAPL.US"],
          ["AAPL"],
          "req-provider",
        ),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "mapSymbolsForProvider",
        context: expect.objectContaining({
          provider: "longport",
          requestId: "req-provider",
          reason: "symbol_mapping_failed",
        }),
      });
    });

    it("provider 映射结果缺失时应抛业务异常", async () => {
      const { service, mocks } = createService();
      mocks.symbolTransformerService.transformSymbolsForProvider.mockResolvedValue(
        {
          transformedSymbols: [],
          mappingResults: { transformedSymbols: {} },
        },
      );

      await expect(
        service.mapSymbolsForProvider(
          "longport",
          ["AAPL.US"],
          ["AAPL"],
          "req-provider-missing",
        ),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "mapSymbolsForProvider",
        context: expect.objectContaining({
          provider: "longport",
          requestId: "req-provider-missing",
          reason: "symbol_mapping_failed",
        }),
      });
    });
  });
});

// =============== 订阅上下文 ===============

describe("StreamSubscriptionContextService 订阅上下文", () => {
  // 12. assertSubscriptionContextCompatibility
  describe("assertSubscriptionContextCompatibility", () => {
    it("无已有订阅时不抛异常", () => {
      const { service, mocks } = createService();
      mocks.clientStateManager.getClientSubscription.mockReturnValue(null);

      expect(() =>
        service.assertSubscriptionContextCompatibility(
          "client-1",
          "longport",
          "quote",
        ),
      ).not.toThrow();
    });

    it("已有订阅但 symbols 为空时不抛异常", () => {
      const { service, mocks } = createService();
      mocks.clientStateManager.getClientSubscription.mockReturnValue({
        providerName: "longport",
        wsCapabilityType: "quote",
        symbols: new Set(),
      });

      expect(() =>
        service.assertSubscriptionContextCompatibility(
          "client-1",
          "longport",
          "quote",
        ),
      ).not.toThrow();
    });

    it("同 provider + capability 不抛异常", () => {
      const { service, mocks } = createService();
      mocks.clientStateManager.getClientSubscription.mockReturnValue({
        providerName: "longport",
        wsCapabilityType: "quote",
        symbols: new Set(["AAPL.US"]),
      });

      expect(() =>
        service.assertSubscriptionContextCompatibility(
          "client-1",
          "longport",
          "quote",
        ),
      ).not.toThrow();
    });

    it("不同 provider 应抛异常", () => {
      const { service, mocks } = createService();
      mocks.clientStateManager.getClientSubscription.mockReturnValue({
        providerName: "infoway",
        wsCapabilityType: "quote",
        symbols: new Set(["AAPL.US"]),
      });

      expect(() =>
        service.assertSubscriptionContextCompatibility(
          "client-1",
          "longport",
          "quote",
        ),
      ).toThrow();
    });

    it("不同 capability 应抛异常", () => {
      const { service, mocks } = createService();
      mocks.clientStateManager.getClientSubscription.mockReturnValue({
        providerName: "longport",
        wsCapabilityType: "stream-stock-quote",
        symbols: new Set(["AAPL.US"]),
      });

      expect(() =>
        service.assertSubscriptionContextCompatibility(
          "client-1",
          "longport",
          "stream-crypto-quote",
        ),
      ).toThrow();
    });
  });

  // 13. notifyUpstreamReleased
  describe("notifyUpstreamReleased", () => {
    it("回调成功时正常执行", async () => {
      const { service } = createService();
      const callback = jest.fn().mockResolvedValue(undefined);

      await service.notifyUpstreamReleased(
        { onUpstreamReleased: callback },
        ["AAPL.US"],
      );

      expect(callback).toHaveBeenCalledWith(["AAPL.US"]);
    });

    it("回调失败时应被忽略不抛异常", async () => {
      const { service } = createService();
      const callback = jest.fn().mockRejectedValue(new Error("callback error"));

      await expect(
        service.notifyUpstreamReleased(
          { onUpstreamReleased: callback },
          ["AAPL.US"],
        ),
      ).resolves.toBeUndefined();
    });

    it("无回调时应跳过", async () => {
      const { service } = createService();

      await expect(
        service.notifyUpstreamReleased(undefined, ["AAPL.US"]),
      ).resolves.toBeUndefined();
    });

    it("options 存在但无 onUpstreamReleased 时应跳过", async () => {
      const { service } = createService();

      await expect(
        service.notifyUpstreamReleased({}, ["AAPL.US"]),
      ).resolves.toBeUndefined();
    });

    it("releasedSymbols 为空数组时应跳过", async () => {
      const { service } = createService();
      const callback = jest.fn();

      await service.notifyUpstreamReleased(
        { onUpstreamReleased: callback },
        [],
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
