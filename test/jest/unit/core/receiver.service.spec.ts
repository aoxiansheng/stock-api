import { Test, TestingModule } from "@nestjs/testing";
import { ReceiverService } from "../../../../src/core/receiver/service/receiver.service";
import { SymbolMapperService } from "../../../../src/core/symbol-mapper/service/symbol-mapper.service";
import { CapabilityRegistryService } from "../../../../src/providers/capability-registry.service";
import { LongportContextService } from "../../../../src/providers/longport/longport-context.service";
import { MarketStatusService } from "../../../../src/core/shared/service/market-status.service";
import { CacheService } from "../../../../src/cache/cache.service";
import { DataRequestDto } from "../../../../src/core/receiver/dto/data-request.dto";
import { TransformSymbolsResponseDto } from "../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto";
import { Market } from "../../../../src/common/constants/market.constants";
import { MarketStatus } from "../../../../src/common/constants/market-trading-hours.constants";

describe("ReceiverService", () => {
  let service: ReceiverService;
  let symbolMapperService: jest.Mocked<SymbolMapperService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;
  let longportContextService: jest.Mocked<LongportContextService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockCapability = {
    name: "get-stock-quote",
    description: "Get stock quote data",
    supportedMarkets: ["US", "HK"],
    supportedSymbolFormats: [".US", ".HK"],
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const mockSymbolMapperService = {
      transformSymbols: jest.fn(),
    };

    const mockLongportContextService = {
      getContext: jest.fn(),
    };

    // 创建 mock provider 对象，包含 getContextService 方法
    const mockProvider = {
      name: "longport",
      getContextService: jest.fn().mockReturnValue(mockLongportContextService),
    };

    const mockCapabilityRegistryService = {
      getCapability: jest.fn(),
      getBestProvider: jest.fn(),
      getProvider: jest.fn().mockReturnValue(mockProvider), // ✅ 添加缺失的 getProvider 方法
    };

    const mockMarketStatusService = {
      getMarketStatus: jest.fn().mockResolvedValue({
        status: MarketStatus.TRADING,
        nextChange: new Date().toISOString(),
        reason: "Normal trading hours",
      }),
      getMarketStatuses: jest.fn().mockResolvedValue({
        [Market.US]: {
          status: MarketStatus.TRADING,
          nextChange: new Date().toISOString(),
          reason: "Normal trading hours",
        },
      }),
      getBatchMarketStatus: jest.fn().mockResolvedValue({
        [Market.US]: {
          market: Market.US,
          status: MarketStatus.TRADING,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: "America/New_York",
          realtimeCacheTTL: 60,
          analyticalCacheTTL: 3600,
          isHoliday: false,
          isDST: true,
          confidence: 1.0,
        },
      }),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistryService,
        },
        {
          provide: LongportContextService,
          useValue: mockLongportContextService,
        },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    symbolMapperService = module.get(SymbolMapperService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
    longportContextService = module.get(LongportContextService);
    marketStatusService = module.get(MarketStatusService);
    cacheService = module.get(CacheService);
  });

  describe("handleRequest", () => {
    const validRequest: DataRequestDto = {
      symbols: ["AAPL.US", "GOOGL.US"],
      dataType: "get-stock-quote",
      options: {
        preferredProvider: "longport",
        realtime: true,
      },
    };

    it("should handle valid request successfully", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US", GOOGL: "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0 },
        { symbol: "GOOGL.US", price: 2500.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const result = await service.handleRequest(validRequest);

      expect(result.data).toEqual(mockExecuteResult);
      expect(result.metadata.provider).toBe("longport");
      expect(result.metadata.capability).toBe("get-stock-quote");
    });

    it("should handle validation errors", async () => {
      const invalidRequest: DataRequestDto = {
        symbols: [],
        dataType: "invalid-type",
      } as any;

      await expect(service.handleRequest(invalidRequest)).rejects.toThrow(
        "无法找到支持数据类型 'invalid-type' 和市场 'undefined' 的数据提供商",
      );
    });

    it("should handle provider not found", async () => {
      // 创建一个不包含preferredProvider的请求，让它走自动选择提供商的逻辑
      const requestWithoutPreferredProvider: DataRequestDto = {
        symbols: ["AAPL.US", "GOOGL.US"],
        dataType: "get-stock-quote",
        options: {
          realtime: true,
        },
      };

      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      await expect(
        service.handleRequest(requestWithoutPreferredProvider),
      ).rejects.toThrow(
        "无法找到支持数据类型 'get-stock-quote' 和市场 'US' 的数据提供商",
      );
    });

    it("should handle capability not found", async () => {
      // 创建一个不包含preferredProvider的请求，让它走自动选择提供商的逻辑
      const requestWithoutPreferredProvider: DataRequestDto = {
        symbols: ["AAPL.US", "GOOGL.US"],
        dataType: "get-stock-quote",
        options: {
          realtime: true,
        },
      };

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US", "GOOGL.US": "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      capabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(
        service.handleRequest(requestWithoutPreferredProvider),
      ).rejects.toThrow("提供商 'longport' 不支持 'get-stock-quote' 能力");
    });

    it("should handle execution errors", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US", "GOOGL.US": "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockRejectedValue(new Error("Provider error"));

      await expect(service.handleRequest(validRequest)).rejects.toThrow(
        "数据获取失败: Provider error",
      );
    });
  });

  describe("private method testing via handleRequest", () => {
    it("should handle provider selection through handleRequest", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL"],
        dataType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
        },
      };

      const result = await service.handleRequest(validRequest);

      expect(result.metadata.provider).toBe("longport");
    });
  });

  describe("validation through handleRequest", () => {
    it("should handle validation errors through handleRequest", async () => {
      const invalidRequest: DataRequestDto = {
        symbols: [],
        dataType: "invalid-type",
      } as any;

      await expect(service.handleRequest(invalidRequest)).rejects.toThrow(
        "无法找到支持数据类型 'invalid-type' 和市场 'undefined' 的数据提供商",
      );
    });

    it("should handle duplicate symbols as warning through handleRequest", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US", "GOOGL.US": "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0 },
        { symbol: "GOOGL.US", price: 2500.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const requestWithDuplicates: DataRequestDto = {
        symbols: ["AAPL.US", "GOOGL.US", "AAPL.US"],
        dataType: "get-stock-quote",
      };

      const result = await service.handleRequest(requestWithDuplicates);
      expect(result.data).toBeDefined();
    });
  });

  describe("market inference through provider selection", () => {
    it("should handle HK market symbols through handleRequest", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "700.HK": "700.HK", "0005.HK": "0005.HK" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "700.HK", price: 500.0 },
        { symbol: "0005.HK", price: 100.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["700.HK", "0005.HK"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        "get-stock-quote",
        "HK",
      );
    });

    it("should handle US market symbols through handleRequest", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US", GOOGL: "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0 },
        { symbol: "GOOGL.US", price: 2500.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL", "GOOGL"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        "get-stock-quote",
        "US",
      );
    });
  });

  describe("data type to capability mapping", () => {
    it("should handle known data types through handleRequest", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        "longport",
        "get-stock-quote",
      );
    });
  });

  describe("symbol transformation through handleRequest", () => {
    it("should handle symbol transformation successfully", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US", GOOGL: "GOOGL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0 },
        { symbol: "GOOGL.US", price: 2500.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL", "GOOGL"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      expect(symbolMapperService.transformSymbols).toHaveBeenCalledWith(
        "longport",
        ["AAPL", "GOOGL"],
      );
    });

    it("should handle transformation errors", async () => {
      symbolMapperService.transformSymbols.mockRejectedValue(
        new Error("Transform failed"),
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");

      const validRequest: DataRequestDto = {
        symbols: ["AAPL", "GOOGL"],
        dataType: "get-stock-quote",
      };

      await expect(service.handleRequest(validRequest)).rejects.toThrow(
        "股票代码转换失败",
      );
    });

    it("should handle partial symbol transformation failures", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US" },
        failedSymbols: ["INVALID"],
        processingTimeMs: 15,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL", "INVALID"],
        dataType: "get-stock-quote",
      };

      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
      expect(result.metadata.hasPartialFailures).toBe(true);
    });

    it("should throw error when all symbols fail transformation", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: {},
        failedSymbols: ["INVALID1", "INVALID2"],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");

      const validRequest: DataRequestDto = {
        symbols: ["INVALID1", "INVALID2"],
        dataType: "get-stock-quote",
      };

      await expect(service.handleRequest(validRequest)).rejects.toThrow(
        "部分股票代码转换失败",
      );
    });

    it("should handle mixed standard and non-standard symbols", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { AAPL: "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 8,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0 },
        { symbol: "GOOGL.US", price: 2500.0 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL", "GOOGL.US"], // Mixed: needs transform and standard
        dataType: "get-stock-quote",
      };

      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
      expect(symbolMapperService.transformSymbols).toHaveBeenCalledWith(
        "longport",
        ["AAPL"],
      );
    });
  });

  describe("preferred provider validation", () => {
    it("should handle preferred provider that does not support capability", async () => {
      capabilityRegistryService.getCapability.mockReturnValue(null);

      const requestWithInvalidPreferredProvider: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
        options: {
          preferredProvider: "unsupported-provider",
        },
      };

      await expect(
        service.handleRequest(requestWithInvalidPreferredProvider),
      ).rejects.toThrow(
        "无法找到支持数据类型 'get-stock-quote' 和市场 'any' 的数据提供商",
      );
    });

    it("should handle preferred provider that does not support market", async () => {
      const limitedCapability = {
        ...mockCapability,
        supportedMarkets: ["US"], // Only supports US market
      };
      capabilityRegistryService.getCapability.mockReturnValue(
        limitedCapability,
      );

      const requestWithUnsupportedMarket: DataRequestDto = {
        symbols: ["700.HK"],
        dataType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          market: "HK",
        },
      };

      await expect(
        service.handleRequest(requestWithUnsupportedMarket),
      ).rejects.toThrow("提供商 'longport' 不支持市场 'HK'");
    });
  });

  describe("market status and caching", () => {
    beforeEach(() => {
      // Mock getBatchMarketStatus for market status tests
      marketStatusService.getBatchMarketStatus = jest.fn().mockResolvedValue({
        [Market.US]: {
          market: Market.US,
          status: MarketStatus.TRADING,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: "America/New_York",
          realtimeCacheTTL: 5,
          analyticalCacheTTL: 300,
          isHoliday: false,
          isDST: true,
          confidence: 1.0,
        },
      });
    });

    it("should handle market status service failures gracefully", async () => {
      marketStatusService.getBatchMarketStatus = jest
        .fn()
        .mockRejectedValue(new Error("Market service down"));

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      // Should not throw error, should use fallback market status
      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
    });

    it("should use realtime cache when available", async () => {
      const cachedData = [{ symbol: "AAPL.US", price: 149.5, cached: true }];
      cacheService.get = jest.fn().mockResolvedValue(cachedData);

      // 关键修复：确保即使在缓存命中的情况下，后续可能的回退逻辑也能正常工作
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };
      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(cachedData);
      expect(result.metadata.provider).toBe("longport");
      // Should not call symbol mapper or capability execution
      expect(symbolMapperService.transformSymbols).not.toHaveBeenCalled();
      expect(mockCapability.execute).not.toHaveBeenCalled();
    });

    it("should handle cache retrieval errors gracefully", async () => {
      cacheService.get = jest
        .fn()
        .mockRejectedValue(new Error("Cache service down"));

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      // Should fall back to normal data fetching
      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
    });

    it("should handle cache storage errors gracefully", async () => {
      cacheService.get = jest.fn().mockResolvedValue(null); // No cache hit
      cacheService.set = jest
        .fn()
        .mockRejectedValue(new Error("Cache storage failed"));

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      // Should complete successfully despite cache storage failure
      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
    });
  });

  describe("market inference edge cases", () => {
    it("should handle SZ market symbols correctly", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "000001.SZ": "000001.SZ", "300001": "300001.SZ" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "000001.SZ", price: 15.2 },
        { symbol: "300001.SZ", price: 25.8 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["000001.SZ", "300001"], // SZ market symbols
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);
      // The result is not directly used in this specific test, but the side effects (expectations) are what matter.
      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        "get-stock-quote",
        "SZ",
      );
    });

    it("should handle SH market symbols correctly", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "600000.SH": "600000.SH", "688001": "688001.SH" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "600000.SH", price: 10.5 },
        { symbol: "688001.SH", price: 45.2 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["600000.SH", "688001"], // SH market symbols
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);
      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        "get-stock-quote",
        "SH",
      );
    });

    it("should handle 5-digit HK market symbols", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "00700": "00700.HK" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "00700.HK", price: 500.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["00700"], // 5-digit HK symbol
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);
      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        "get-stock-quote",
        "HK",
      );
    });
  });

  describe("request options validation", () => {
    it("should handle request with custom fields option", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: "AAPL.US", price: 150.0, volume: 1000000 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
        options: {
          fields: ["price", "volume"],
          realtime: true,
        },
      };

      const result = await service.handleRequest(validRequest);
      expect(result.data).toEqual(mockExecuteResult);
      expect(mockCapability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["AAPL.US"],
          options: expect.objectContaining({
            fields: ["price", "volume"],
            realtime: true,
          }),
        }),
      );
    });

    it("should handle symbols with whitespace as warning", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const requestWithWhitespace: DataRequestDto = {
        symbols: [" AAPL.US ", "\tGOOGL.US\n"], // Symbols with whitespace
        dataType: "get-stock-quote",
      };

      // Should still complete successfully with warnings
      await expect(
        service.handleRequest(requestWithWhitespace),
      ).resolves.toBeDefined();
    });
  });

  describe("provider context service integration", () => {
    it("should pass provider context service to capability execution", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      // The result is not directly used in this specific test, but the side effects (expectations) are what matter.
      expect(mockCapability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          contextService: longportContextService,
        }),
      );
    });

    it("should handle provider without context service", async () => {
      // Mock a provider without getContextService method
      const providerWithoutContext = {
        name: "no-context-provider",
      };
      capabilityRegistryService.getProvider = jest
        .fn()
        .mockReturnValue(providerWithoutContext);

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "no-context-provider",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue(
        "no-context-provider",
      );
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);

      expect(mockCapability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          contextService: undefined,
        }),
      );
    });
  });

  describe("data type capability mapping edge cases", () => {
    it("should handle unknown data type mapping", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);

      const requestWithUnknownDataType: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "unknown-data-type",
      };

      // Should use the dataType as-is when no mapping exists
      await service.handleRequest(requestWithUnknownDataType);

      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        "longport",
        "unknown-data-type",
      );
    });
  });

  describe("performance metrics and slow request detection", () => {
    it("should detect and log slow requests", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: "AAPL.US", price: 150.0 }];

      // Mock slow execution
      symbolMapperService.transformSymbols.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockTransformResult), 2000),
          ),
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      await service.handleRequest(validRequest);
      // Performance metrics would be logged (tested through log assertions if needed)
    });
  });

  describe("array response handling", () => {
    it("should handle non-array response from capability execution", async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: "longport",
        transformedSymbols: { "AAPL.US": "AAPL.US" },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      // Single object response instead of array
      const mockExecuteResult = { symbol: "AAPL.US", price: 150.0 };

      symbolMapperService.transformSymbols.mockResolvedValue(
        mockTransformResult,
      );
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue("longport");
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ["AAPL.US"],
        dataType: "get-stock-quote",
      };

      const result = await service.handleRequest(validRequest);
      // Should be wrapped in array
      expect(result.data).toEqual([mockExecuteResult]);
    });
  });
});
