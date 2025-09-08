import { Test, TestingModule } from "@nestjs/testing";
import { DataFetcherService } from "../../../../../../../src/core/03-fetching/data-fetcher/services/data-fetcher.service";
import { DataFetcherModule } from "../../../../../../../src/core/03-fetching/data-fetcher/module/data-fetcher.module";
import { ProvidersModule } from "../../../../../../../src/providers/module/providers-sg.module";
import { CapabilityRegistryService } from "../../../../../../../src/providers/services/capability-registry.service";
import { OPERATION_LIMITS } from '@common/constants/domain';
import { REFERENCE_DATA } from '@common/constants/domain';
import {
  import { API_OPERATIONS
} from '@common/constants/domain';
  DataFetchParams,
  RawDataResult,
} from "../../../../../../../src/core/03-fetching/data-fetcher/interfaces/data-fetcher.interface";
import {
  DataFetchRequestDto,
  ApiType,
} from "../../../../../../../src/core/03-fetching/data-fetcher/dto/data-fetch-request.dto";
import { ICapability } from "../../../../../../../src/providers/interfaces/capability.interface";
import { Market } from "../../../../../../../src/common/constants/domain/market-domain.constants";

describe("DataFetcherService Integration", () => {
  let service: DataFetcherService;
  let capabilityRegistryService: CapabilityRegistryService;
  let module: TestingModule;

  // Mock capability that simulates a real provider capability
  const mockCapability: ICapability & { execute: jest.Mock } = {
    name: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    description: "Mock stock quote capability for testing",
    supportedMarkets: [Market.HK, Market.US],
    supportedSymbolFormats: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
    execute: jest.fn(),
  };

  // Mock provider with context service
  const mockProvider = {
    getContextService: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DataFetcherModule, ProvidersModule],
    }).compile();

    service = module.get<DataFetcherService>(DataFetcherService);
    capabilityRegistryService = module.get<CapabilityRegistryService>(
      CapabilityRegistryService,
    );

    // Mock the capability registry methods for testing
    jest
      .spyOn(capabilityRegistryService, "getCapability")
      .mockReturnValue(mockCapability);
    jest
      .spyOn(capabilityRegistryService, "getProvider")
      .mockReturnValue(mockProvider);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider.getContextService.mockResolvedValue({ apiKey: "test-key" });
  });

  describe("end-to-end data fetching", () => {
    it("should fetch raw data successfully through the complete pipeline", async () => {
      const mockRawData = {
        secu_quote: [
          {
            symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
            lastdone: 320.5,
            volume: 1500000,
            prev_close: 318.0,
            open: 319.2,
            high: 321.5,
            low: 318.8,
            timestamp: 1704110400000,
            trade_status: 1,
          },
          {
            symbol: "AAPL.US",
            last_done: 175.25,
            volume: 2000000,
            prev_close: 176.75,
            open: 176.0,
            high: 177.5,
            low: 174.8,
            timestamp: 1704110400000,
            trade_status: 1,
          },
        ],
      };

      mockCapability.execute.mockResolvedValue(mockRawData);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
        requestId: "integration-test-001",
        apiType: "rest",
        options: { includeAfterHours: true },
        contextService: { apiKey: "test-key" },
      };

      const result: RawDataResult = await service.fetchRawData(params);

      expect(result.data).toEqual(mockRawData.secu_quote);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe("test-provider");
      expect(result.metadata.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(result.metadata.symbolsProcessed).toBe(2);
      expect(result.metadata.processingTime).toBeGreaterThan(0);

      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        "test-provider",
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      );

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
        contextService: { apiKey: "test-key" },
        requestId: "integration-test-001",
        context: {
          apiType: "rest",
          options: { includeAfterHours: true },
        },
        options: { includeAfterHours: true },
      });
    });

    it("should handle provider connection errors gracefully", async () => {
      mockCapability.execute.mockRejectedValue(new Error("Network timeout"));

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "integration-test-002",
        contextService: { apiKey: "test-key" },
      };

      await expect(service.fetchRawData(params)).rejects.toThrow(
        "数据获取失败: Network timeout",
      );
    });

    it("should handle capability not found errors", async () => {
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockReturnValue(null);

      const params: DataFetchParams = {
        provider: "nonexistent-provider",
        capability: "nonexistent-capability",
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "integration-test-003",
        contextService: null,
      };

      await expect(service.fetchRawData(params)).rejects.toThrow(
        "提供商 nonexistent-provider 不支持能力 nonexistent-capability",
      );
    });

    it("should process different data formats correctly", async () => {
      // Test array format
      const arrayData = [
        { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, price: 320.5 },
        { symbol: "AAPL.US", price: 175.25 },
      ];

      mockCapability.execute.mockResolvedValue(arrayData);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
        requestId: "integration-test-004",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      expect(result.data).toEqual(arrayData);
      expect(result.data).toHaveLength(2);
    });
  });

  describe("capability support checking", () => {
    it("should correctly identify supported capabilities", async () => {
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockReturnValue(mockCapability);

      const isSupported = await service.supportsCapability(
        "test-provider",
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      );

      expect(isSupported).toBe(true);
      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        "test-provider",
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      );
    });

    it("should correctly identify unsupported capabilities", async () => {
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockReturnValue(null);

      const isSupported = await service.supportsCapability(
        "test-provider",
        "unsupported-capability",
      );

      expect(isSupported).toBe(false);
    });

    it("should handle capability registry errors gracefully", async () => {
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockImplementation(() => {
          throw new Error("Registry error");
        });

      const isSupported = await service.supportsCapability(
        "test-provider",
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      );

      expect(isSupported).toBe(false);
    });
  });

  describe("provider context retrieval", () => {
    it("should successfully retrieve provider context service", async () => {
      const mockContextService = {
        apiKey: "test-key",
        endpoint: "https://api.test.com",
        timeout: OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
      };

      mockProvider.getContextService.mockResolvedValue(mockContextService);
      jest
        .spyOn(capabilityRegistryService, "getProvider")
        .mockReturnValue(mockProvider);

      const context = await service.getProviderContext("test-provider");

      expect(context).toBe(mockContextService);
      expect(capabilityRegistryService.getProvider).toHaveBeenCalledWith(
        "test-provider",
      );
      expect(mockProvider.getContextService).toHaveBeenCalled();
    });

    it("should return undefined for providers without context service", async () => {
      const providerWithoutContext = {};
      jest
        .spyOn(capabilityRegistryService, "getProvider")
        .mockReturnValue(providerWithoutContext);

      const context = await service.getProviderContext("limited-provider");

      expect(context).toBeUndefined();
    });

    it("should return undefined for nonexistent providers", async () => {
      jest
        .spyOn(capabilityRegistryService, "getProvider")
        .mockReturnValue(null);

      const context = await service.getProviderContext("nonexistent-provider");

      expect(context).toBeUndefined();
    });

    it("should handle context service errors gracefully", async () => {
      mockProvider.getContextService.mockRejectedValue(
        new Error("Context service error"),
      );
      jest
        .spyOn(capabilityRegistryService, "getProvider")
        .mockReturnValue(mockProvider);

      const context = await service.getProviderContext("test-provider");

      expect(context).toBeUndefined();
    });
  });

  describe("batch processing integration", () => {
    it("should process multiple requests concurrently", async () => {
      const mockQuoteData = {
        secu_quote: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, last_done: 320.5 }],
      };

      const mockInfoData = {
        secu_quote: [{ symbol: "AAPL.US", last_done: 175.25 }],
      };

      // Create separate capability mocks for different calls
      const mockQuoteCapability = { ...mockCapability, execute: jest.fn() };
      const mockInfoCapability = { ...mockCapability, execute: jest.fn() };

      // Mock different capabilities for different requests
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockReturnValueOnce(mockQuoteCapability)
        .mockReturnValueOnce(mockInfoCapability);

      mockQuoteCapability.execute.mockResolvedValue(mockQuoteData);
      mockInfoCapability.execute.mockResolvedValue(mockInfoData);

      const requests: DataFetchRequestDto[] = [
        {
          provider: "test-provider",
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
          requestId: "batch-1",
          apiType: ApiType.REST,
        },
        {
          provider: "test-provider",
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          symbols: ["AAPL.US"],
          requestId: "batch-2",
          apiType: ApiType.REST,
        },
      ];

      const results = await service.fetchBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(mockQuoteData.secu_quote);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].data).toEqual(mockInfoData.secu_quote);
      expect(results[1].hasPartialFailures).toBe(false);
    });

    it("should handle mixed success/failure in batch operations", async () => {
      const mockSuccessData = {
        secu_quote: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, last_done: 320.5 }],
      };

      // First call succeeds
      jest
        .spyOn(capabilityRegistryService, "getCapability")
        .mockReturnValueOnce(mockCapability)
        .mockReturnValueOnce(null); // Second call fails (capability not found)

      mockCapability.execute.mockResolvedValue(mockSuccessData);

      const requests: DataFetchRequestDto[] = [
        {
          provider: "test-provider",
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
          requestId: "batch-success",
          apiType: ApiType.REST,
        },
        {
          provider: "nonexistent-provider",
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          symbols: ["INVALID"],
          requestId: "batch-failure",
          apiType: ApiType.REST,
        },
      ];

      const results = await service.fetchBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(mockSuccessData.secu_quote);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].data).toEqual([]);
      expect(results[1].hasPartialFailures).toBe(true);
      expect(results[1].metadata.errors?.[0]).toContain("未知错误");
    });
  });

  describe("performance and timing", () => {
    it("should complete data fetching within acceptable timeframes", async () => {
      mockCapability.execute.mockImplementation(async () => {
        // Simulate realistic network delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          secu_quote: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, last_done: 320.5 }],
        };
      });

      const startTime = Date.now();

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "perf-test-001",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);
      const totalTime = Date.now() - startTime;

      expect(result.data).toHaveLength(1);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(totalTime);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should track processing time accurately", async () => {
      const simulatedDelay = 200;

      mockCapability.execute.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, simulatedDelay));
        return { secu_quote: [] };
      });

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "timing-test-001",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      // Processing time should be at least the simulated delay
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(
        simulatedDelay - 50,
      );
      expect(result.metadata.processingTime).toBeLessThan(simulatedDelay + 200);
    });

    it("should handle slow responses and log performance warnings", async () => {
      // Simulate a slow response (over 2000ms threshold)
      mockCapability.execute.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2100));
        return { secu_quote: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, last_done: 320.5 }] };
      });

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "slow-response-test",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      expect(result.metadata.processingTime).toBeGreaterThan(2000);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("error propagation and handling", () => {
    it("should properly propagate capability execution errors", async () => {
      const customError = new Error("Custom provider error with details");
      mockCapability.execute.mockRejectedValue(customError);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "error-test-001",
        contextService: { apiKey: "test-key" },
      };

      try {
        await service.fetchRawData(params);
        throw new Error("Expected an error to be thrown");
      } catch (error) {
        expect(error._message).toContain("Custom provider error with details");
      }
    });

    it("should handle various data format edge cases", async () => {
      // Test null data
      mockCapability.execute.mockResolvedValue(null);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: "null-data-test",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      expect(result.data).toEqual([]);
      expect(result.metadata.symbolsProcessed).toBe(1);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle mixed symbol formats from different markets", async () => {
      const mockMixedData = {
        secu_quote: [
          { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, last_done: 320.5, market: "HK" },
          { symbol: "AAPL.US", last_done: 175.25, market: "US" },
          { symbol: "00001.SZ", last_done: 12.5, market: "SZ" },
          { symbol: "600519.SH", last_done: 1890.0, market: "SH" },
        ],
      };

      mockCapability.execute.mockResolvedValue(mockMixedData);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US", "00001.SZ", "600519.SH"],
        requestId: "mixed-markets-test",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      expect(result.data).toHaveLength(4);
      expect(result.metadata.symbolsProcessed).toBe(4);
      expect(result.data.some((d) => d.market === "HK")).toBe(true);
      expect(result.data.some((d) => d.market === "US")).toBe(true);
      expect(result.data.some((d) => d.market === "SZ")).toBe(true);
      expect(result.data.some((d) => d.market === "SH")).toBe(true);
    });

    it("should handle large symbol lists efficiently", async () => {
      const largeSymbolList = Array.from(
        { length: 50 },
        (_, i) => `STOCK${i}.HK`,
      );
      const mockLargeData = {
        secu_quote: largeSymbolList.map((symbol) => ({
          symbol,
          last_done: 100 + Math.random() * 200,
          volume: Math.floor(Math.random() * 1000000),
        })),
      };

      mockCapability.execute.mockResolvedValue(mockLargeData);

      const params: DataFetchParams = {
        provider: "test-provider",
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: largeSymbolList,
        requestId: "large-batch-test",
        contextService: { apiKey: "test-key" },
      };

      const result = await service.fetchRawData(params);

      expect(result.data).toHaveLength(50);
      expect(result.metadata.symbolsProcessed).toBe(50);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });
  });
});
