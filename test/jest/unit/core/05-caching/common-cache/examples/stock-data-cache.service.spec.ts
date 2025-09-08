import { Test, TestingModule } from "@nestjs/testing";
// import { StockDataCacheService } from '@core/05-caching/common-cache/examples/stock-data-cache.service';
import { CommonCacheService } from "@core/05-caching/common-cache/services/common-cache.service";
import { REFERENCE_DATA } from '@common/constants/domain';

describe.skip("StockDataCacheService", () => {
  let service: any; // StockDataCacheService;
  let mockCommonCache: jest.Mocked<CommonCacheService>;

  beforeEach(async () => {
    // 创建CommonCacheService的mock
    const mockCache = {
      getWithFallback: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      isHealthy: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // StockDataCacheService,
        {
          provide: CommonCacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    // service = module.get<StockDataCacheService>(StockDataCacheService);
    mockCommonCache = module.get<CommonCacheService>(
      CommonCacheService,
    ) as jest.Mocked<CommonCacheService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStockQuote", () => {
    it("should get stock quote with fallback", async () => {
      const mockData = {
        symbol: "AAPL",
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        price: 150,
        timestamp: Date.now(),
      };
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: mockData,
        fromCache: true,
        fromFallback: false,
        metadata: {},
      });

      const result = await service.getStockQuote("AAPL", REFERENCE_DATA.PROVIDER_IDS.LONGPORT);

      expect(result.data).toEqual(mockData);
      expect(result.fromCache).toBe(true);
      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        "stock_quote:AAPL:longport",
        expect.any(Function),
        3600,
      );
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Cache error");
      mockCommonCache.getWithFallback.mockRejectedValue(error);

      await expect(service.getStockQuote("AAPL", REFERENCE_DATA.PROVIDER_IDS.LONGPORT)).rejects.toThrow(
        "Cache error",
      );
    });

    it("should generate correct cache key with market", async () => {
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT },
        fromCache: false,
        fromFallback: true,
        metadata: {},
      });

      await service.getStockQuote(REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "HK");

      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        "stock_quote:700.HK:longport:HK",
        expect.any(Function),
        3600,
      );
    });
  });

  describe("getBatchStockQuotes", () => {
    it("should handle batch requests with mixed cache hits/misses", async () => {
      const requests = [
        { symbol: "AAPL", provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
        { symbol: "GOOGL", provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
        { symbol: "MSFT", provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
      ];

      // 模拟部分命中的情况
      mockCommonCache.mget.mockResolvedValue({
        data: [
          {
            key: "stock_quote:AAPL:longport",
            value: { symbol: "AAPL", price: 150 },
          },
          {
            key: "stock_quote:MSFT:longport",
            value: { symbol: "MSFT", price: 300 },
          },
        ],
        metadata: {},
      });

      // 模拟设置缓存的调用
      mockCommonCache.set.mockResolvedValue(undefined);

      const results = await service.getBatchStockQuotes(requests);

      expect(results).toHaveLength(3);
      expect(results[0].cached).toBe(true);
      expect(results[0].data.symbol).toBe("AAPL");
      expect(results[1].cached).toBe(false); // 从回源获取
      expect(results[2].cached).toBe(true);
      expect(results[2].data.symbol).toBe("MSFT");

      expect(mockCommonCache.mget).toHaveBeenCalledWith([
        "stock_quote:AAPL:longport",
        "stock_quote:GOOGL:longport",
        "stock_quote:MSFT:longport",
      ]);
    });

    it("should handle empty batch requests", async () => {
      const results = await service.getBatchStockQuotes([]);
      expect(results).toEqual([]);
    });
  });

  describe("setMarketStatus", () => {
    it("should set market status successfully", async () => {
      const marketStatus = { open: true, closeTime: "16:00" };
      mockCommonCache.set.mockResolvedValue(undefined);

      const result = await service.setMarketStatus("HK", marketStatus);

      expect(result).toBe(true);
      expect(mockCommonCache.set).toHaveBeenCalledWith(
        "market_status:HK",
        marketStatus,
        3600,
      );
    });

    it("should handle cache errors gracefully", async () => {
      mockCommonCache.set.mockRejectedValue(new Error("Redis error"));

      const result = await service.setMarketStatus("HK", { open: true });

      expect(result).toBe(false);
    });

    it("should use custom TTL when provided", async () => {
      mockCommonCache.set.mockResolvedValue(undefined);

      await service.setMarketStatus("US", { open: false }, 7200);

      expect(mockCommonCache.set).toHaveBeenCalledWith(
        "market_status:US",
        { open: false },
        7200,
      );
    });
  });

  describe("setBatchSymbolMappings", () => {
    it("should set batch symbol mappings", async () => {
      const mappings = [
        { source: "AAPL", target: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, data: { mapped: "AAPL.US" } },
        { source: "700", target: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, data: { mapped: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT } },
      ];
      mockCommonCache.mset.mockResolvedValue(undefined);

      const result = await service.setBatchSymbolMappings(mappings);

      expect(result).toBe(true);
      expect(mockCommonCache.mset).toHaveBeenCalledWith([
        {
          key: "symbol_mapping:AAPL:longport",
          value: { mapped: "AAPL.US" },
        },
        {
          key: "symbol_mapping:700:longport",
          value: { mapped: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT },
        },
      ]);
    });
  });

  describe("clearStockCache", () => {
    it("should clear cache for specific provider", async () => {
      mockCommonCache.delete.mockResolvedValue({
        deletedCount: 1,
        metadata: {},
      });

      const result = await service.clearStockCache("AAPL", REFERENCE_DATA.PROVIDER_IDS.LONGPORT);

      expect(result).toBe(true);
      expect(mockCommonCache.delete).toHaveBeenCalledWith(
        "stock_quote:AAPL:longport",
      );
    });

    it("should clear cache for all providers when none specified", async () => {
      mockCommonCache.delete.mockResolvedValue({
        deletedCount: 1,
        metadata: {},
      });

      const result = await service.clearStockCache("AAPL");

      expect(result).toBe(true);
      expect(mockCommonCache.delete).toHaveBeenCalledTimes(2); // longport + itick
    });
  });

  describe("getCacheHealth", () => {
    it("should return health status and stats", async () => {
      const mockStats = {
        connected: true,
        usedMemory: "10MB",
        totalKeys: 1000,
      };

      mockCommonCache.isHealthy.mockResolvedValue(true);
      mockCommonCache.getStats.mockResolvedValue({
        redis: mockStats,
        memory: mockStats,
        performance: mockStats,
      });

      const result = await service.getCacheHealth();

      expect(result.healthy).toBe(true);
      expect(result.stats).toEqual(mockStats);
      expect(result.timestamp).toBeDefined();
    });

    it("should handle health check errors", async () => {
      mockCommonCache.isHealthy.mockRejectedValue(
        new Error("Connection failed"),
      );

      const result = await service.getCacheHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe("Connection failed");
    });
  });
});
