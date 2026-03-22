jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { BusinessException, BusinessErrorCode } from "@common/core/exceptions";
import { StreamProviderResolutionService } from "@core/01-entry/stream-receiver/services/stream-provider-resolution.service";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";

function createService() {
  const marketInferenceService = {
    inferDominantMarket: jest.fn().mockReturnValue("US"),
  };

  const providerRegistryService = {
    getProviderSelectionDiagnostics: jest.fn().mockReturnValue({
      selectedProvider: null,
      candidatesBefore: [],
      configuredOrder: [],
      rankedCandidates: [],
      selectionReason: "none",
    }),
    getProvider: jest.fn().mockReturnValue(undefined),
    getCapability: jest.fn().mockReturnValue(null),
  };

  const service = new StreamProviderResolutionService(
    marketInferenceService as unknown as MarketInferenceService,
    providerRegistryService as unknown as ProviderRegistryService,
  );

  return { service, marketInferenceService, providerRegistryService };
}

describe("StreamProviderResolutionService", () => {
  describe("resolveProviderForStreamRequest", () => {
    const baseParams = {
      symbols: ["AAPL.US"],
      capability: "quote",
      operation: "subscribeStream" as const,
      requestId: "req-1",
    };

    it("有 preferredProvider 且 capability 存在且 market 匹配 → 返回 normalized provider name", () => {
      const { service, providerRegistryService } = createService();

      providerRegistryService.getProvider.mockReturnValue({ name: "LongPort" });
      providerRegistryService.getCapability.mockReturnValue({
        supportedMarkets: ["US", "HK"],
      });
      providerRegistryService.getProviderSelectionDiagnostics.mockReturnValue({
        selectedProvider: null,
        candidatesBefore: ["longport"],
        configuredOrder: ["longport"],
        rankedCandidates: [],
        selectionReason: "none",
      });

      const result = service.resolveProviderForStreamRequest({
        ...baseParams,
        preferredProvider: "LongPort",
        marketContext: { primaryMarket: "US" } as any,
      });

      expect(result).toBe("longport");
      expect(providerRegistryService.getCapability).toHaveBeenCalledWith(
        "LongPort",
        "quote",
      );
    });

    it("有 preferredProvider 但 capability 不存在 → 抛 DATA_NOT_FOUND (reason: preferred_provider_capability_missing)", () => {
      const { service, providerRegistryService } = createService();

      providerRegistryService.getProvider.mockReturnValue({ name: "LongPort" });
      providerRegistryService.getCapability.mockReturnValue(null);

      expect(() =>
        service.resolveProviderForStreamRequest({
          ...baseParams,
          preferredProvider: "LongPort",
          marketContext: { primaryMarket: "US" } as any,
        }),
      ).toThrow(BusinessException);

      try {
        service.resolveProviderForStreamRequest({
          ...baseParams,
          preferredProvider: "LongPort",
          marketContext: { primaryMarket: "US" } as any,
        });
      } catch (e: unknown) {
        expect((e as BusinessException).errorCode).toBe(BusinessErrorCode.DATA_NOT_FOUND);
        expect((e as BusinessException).context.reason).toBe("preferred_provider_capability_missing");
      }
    });

    it("有 preferredProvider 但 market 不在 supportedMarkets 中 → 抛 DATA_NOT_FOUND (reason: preferred_provider_market_not_supported)", () => {
      const { service, providerRegistryService } = createService();

      providerRegistryService.getProvider.mockReturnValue({ name: "LongPort" });
      providerRegistryService.getCapability.mockReturnValue({
        supportedMarkets: ["HK", "CN"],
      });

      expect(() =>
        service.resolveProviderForStreamRequest({
          ...baseParams,
          preferredProvider: "LongPort",
          marketContext: { primaryMarket: "US" } as any,
        }),
      ).toThrow(BusinessException);

      try {
        service.resolveProviderForStreamRequest({
          ...baseParams,
          preferredProvider: "LongPort",
          marketContext: { primaryMarket: "US" } as any,
        });
      } catch (e: unknown) {
        expect((e as BusinessException).errorCode).toBe(BusinessErrorCode.DATA_NOT_FOUND);
        expect((e as BusinessException).context.reason).toBe(
          "preferred_provider_market_not_supported",
        );
      }
    });

    it("无 preferredProvider，selectionDiagnostics 返回 selectedProvider → 返回该 provider", () => {
      const { service, providerRegistryService } = createService();

      providerRegistryService.getProviderSelectionDiagnostics.mockReturnValue({
        selectedProvider: "finnhub",
        candidatesBefore: ["finnhub", "polygon"],
        configuredOrder: ["finnhub", "polygon"],
        rankedCandidates: ["finnhub"],
        selectionReason: "priority",
      });

      const result = service.resolveProviderForStreamRequest({
        ...baseParams,
        marketContext: { primaryMarket: "US" } as any,
      });

      expect(result).toBe("finnhub");
    });

    it("无 preferredProvider，selectionDiagnostics 返回 null → 抛 DATA_NOT_FOUND (reason: no_provider_for_capability_market)", () => {
      const { service, providerRegistryService } = createService();

      providerRegistryService.getProviderSelectionDiagnostics.mockReturnValue({
        selectedProvider: null,
        candidatesBefore: [],
        configuredOrder: [],
        rankedCandidates: [],
        selectionReason: "no_candidates",
      });

      expect(() =>
        service.resolveProviderForStreamRequest({
          ...baseParams,
          marketContext: { primaryMarket: "US" } as any,
        }),
      ).toThrow(BusinessException);

      try {
        service.resolveProviderForStreamRequest({
          ...baseParams,
          marketContext: { primaryMarket: "US" } as any,
        });
      } catch (e: unknown) {
        expect((e as BusinessException).errorCode).toBe(BusinessErrorCode.DATA_NOT_FOUND);
        expect((e as BusinessException).context.reason).toBe("no_provider_for_capability_market");
      }
    });
  });
});
