import { Test, TestingModule } from "@nestjs/testing";
import { DataChangeDetectorService } from "../../../../../../src/core/shared/service/data-change-detector.service";
import { Market } from "../../../../../../src/common/constants/market.constants";
import { MarketStatus } from "../../../../../../src/common/constants/market-trading-hours.constants";

// Create a single, reusable mock logger instance
const mockLoggerInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the logger to always return the same instance
jest.mock("../../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("DataChangeDetectorService", () => {
  let service: DataChangeDetectorService;

  const mockStockData = {
    symbol: "AAPL",
    lastPrice: 150.75,
    change: 2.5,
    changePercent: 1.68,
    volume: 1000000,
    high: 152.0,
    low: 149.5,
    open: 150.0,
    bid: 150.7,
    ask: 150.8,
    bid_size: 100,
    ask_size: 200,
  };

  const modifiedStockData = {
    ...mockStockData,
    lastPrice: 155.5, // Price changed significantly (>0.5%)
    change: 3.0,
    changePercent: 2.01,
    volume: 1050000,
  };

  const minimalChangeData = {
    ...mockStockData,
    lastPrice: 150.76, // Minimal price change
    volume: 1000100, // Minimal volume change
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataChangeDetectorService],
    }).compile();

    service = module.get<DataChangeDetectorService>(DataChangeDetectorService);

    // Clear cache before each test
    (service as any).snapshotCache.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("detectSignificantChange", () => {
    it("should detect first-time data as changed", async () => {
      const result = await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("首次数据");
      expect(result.confidence).toBe(1.0);
      expect(result.changedFields).toEqual([]);
      expect(result.significantChanges).toEqual([]);
    });

    it("should detect no change when data is identical", async () => {
      // First call to establish baseline
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Second call with identical data
      const result = await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe("数据未变化");
      expect(result.confidence).toBe(1.0);
      expect(result.changedFields).toEqual([]);
      expect(result.significantChanges).toEqual([]);
    });

    it("should detect significant price change and return immediately", async () => {
      // Establish baseline
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Test with significant price change
      const result = await service.detectSignificantChange(
        "AAPL",
        modifiedStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("价格显著变化");
      expect(result.confidence).toBe(0.95);
      expect(result.changedFields).toContain("lastPrice");
      expect(result.significantChanges).toContain("lastPrice");
    });

    it("should detect changes during trading hours", async () => {
      // Establish baseline
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Test with minimal changes during trading
      const result = await service.detectSignificantChange(
        "AAPL",
        minimalChangeData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("交易时间-有变化");
      expect(result.confidence).toBe(0.8);
      expect(result.changedFields.length).toBeGreaterThan(0);
    });

    it("should only detect significant changes during non-trading hours", async () => {
      // Establish baseline
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.CLOSED,
      );

      // Test with minimal changes during closed hours
      const result = await service.detectSignificantChange(
        "AAPL",
        minimalChangeData,
        Market.US,
        MarketStatus.CLOSED,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe("变化不显著");
      expect(result.confidence).toBe(0.7);
    });

    it("should detect significant changes during non-trading hours", async () => {
      // Establish baseline
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.CLOSED,
      );

      // Test with significant changes during closed hours
      const result = await service.detectSignificantChange(
        "AAPL",
        modifiedStockData,
        Market.US,
        MarketStatus.CLOSED,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("价格显著变化");
      expect(result.confidence).toBe(0.95);
    });

    it("should handle detection errors gracefully", async () => {
      // First call to establish baseline snapshot
      await service.detectSignificantChange(
        "AAPL",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Mock calculateQuickChecksum to throw an error
      jest
        .spyOn(service as any, "calculateQuickChecksum")
        .mockImplementation(() => {
          throw new Error("Checksum calculation failed");
        });

      const result = await service.detectSignificantChange(
        "AAPL",
        modifiedStockData, // Use different data to ensure checksum is re-calculated
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("检测失败-保守处理");
      expect(result.confidence).toBe(0.5);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据变化检测失败",
        expect.objectContaining({
          symbol: "AAPL",
          error: "Checksum calculation failed",
        }),
      );
    });

    it("should handle different market statuses", async () => {
      const marketStatuses = [
        MarketStatus.TRADING,
        MarketStatus.CLOSED,
        MarketStatus.PRE_MARKET,
        MarketStatus.AFTER_HOURS,
        MarketStatus.WEEKEND,
        MarketStatus.HOLIDAY,
      ];

      for (const status of marketStatuses) {
        const result = await service.detectSignificantChange(
          `TEST_${status}`,
          mockStockData,
          Market.US,
          status,
        );

        expect(result).toBeDefined();
        expect(result.hasChanged).toBe(true); // First time data
        expect(result.changeReason).toBe("首次数据");
      }
    });
  });

  describe("calculateQuickChecksum", () => {
    it("should generate consistent checksum for identical data", () => {
      const checksum1 = (service as any).calculateQuickChecksum(mockStockData);
      const checksum2 = (service as any).calculateQuickChecksum(mockStockData);

      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe("string");
    });

    it("should generate different checksum for different data", () => {
      const checksum1 = (service as any).calculateQuickChecksum(mockStockData);
      const checksum2 = (service as any).calculateQuickChecksum(
        modifiedStockData,
      );

      expect(checksum1).not.toBe(checksum2);
    });

    it("should handle data with missing fields", () => {
      const incompleteData = {
        symbol: "TEST",
        lastPrice: 100.0,
      };

      const checksum = (service as any).calculateQuickChecksum(incompleteData);

      expect(typeof checksum).toBe("string");
      expect(checksum).toBeTruthy();
    });

    it("should handle data with null/undefined values", () => {
      const dataWithNulls = {
        ...mockStockData,
        lastPrice: null,
        volume: undefined,
      };

      const checksum = (service as any).calculateQuickChecksum(dataWithNulls);

      expect(typeof checksum).toBe("string");
    });

    it("should handle empty data object", () => {
      const checksum = (service as any).calculateQuickChecksum({});

      expect(typeof checksum).toBe("string");
      expect(checksum).toBe("0"); // Empty sum
    });

    it("should round price values correctly", () => {
      const priceData = {
        lastPrice: 150.123456,
        bid_price: 150.111111,
      };

      const checksum = (service as any).calculateQuickChecksum(priceData);

      expect(typeof checksum).toBe("string");
    });

    it("should round volume values correctly", () => {
      const volumeData = {
        volume: 1000000.789,
        turnover: 500000.123,
      };

      const checksum = (service as any).calculateQuickChecksum(volumeData);

      expect(typeof checksum).toBe("string");
    });
  });

  describe("detectFieldChanges", () => {
    const lastValues = {
      lastPrice: 150.0,
      change: 2.0,
      volume: 1000000,
      high: 151.0,
    };

    it("should detect price field changes", () => {
      const newData = {
        lastPrice: 155.0, // Significant change
        change: 2.0,
        volume: 1000000,
      };

      const result = (service as any).detectFieldChanges(
        newData,
        lastValues,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain("lastPrice");
      expect(result.significantChanges).toContain("lastPrice");
      expect(result.changeReason).toBe("价格显著变化");
    });

    it("should detect volume changes", () => {
      const newData = {
        lastPrice: 150.0, // No price change
        volume: 2000000, // Significant volume change
      };

      const result = (service as any).detectFieldChanges(
        newData,
        lastValues,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain("volume");
    });

    it("should handle trading hours with any changes", () => {
      const newData = {
        lastPrice: 150.001, // Minimal change
      };

      const result = (service as any).detectFieldChanges(
        newData,
        lastValues,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe("交易时间-有变化");
    });

    it("should handle non-trading hours with significant changes only", () => {
      const newData = {
        lastPrice: 150.001, // Minimal change
      };

      const result = (service as any).detectFieldChanges(
        newData,
        lastValues,
        Market.US,
        MarketStatus.CLOSED,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe("变化不显著");
    });

    it("should detect multiple field changes", () => {
      const newData = {
        lastPrice: 152.0,
        change: 4.0,
        volume: 1500000,
      };

      const result = (service as any).detectFieldChanges(
        newData,
        lastValues,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changedFields.length).toBeGreaterThan(1);
    });
  });

  describe("checkFieldChange", () => {
    const lastValues = {
      lastPrice: 150.0,
      volume: 1000000,
      zero_field: 0,
    };

    it("should detect significant field change", () => {
      const newData = { lastPrice: 157.5 }; // 5% change

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "lastPrice",
        0.01, // 1% threshold
      );

      expect(result.hasChanged).toBe(true);
      expect(result.isSignificant).toBe(true);
    });

    it("should detect minor field change", () => {
      const newData = { lastPrice: 150.1 }; // 0.067% change

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "lastPrice",
        0.01, // 1% threshold
      );

      expect(result.hasChanged).toBe(true);
      expect(result.isSignificant).toBe(false);
    });

    it("should handle zero baseline values", () => {
      const newData = { zero_field: 10 };

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "zero_field",
        0.01,
      );

      expect(result.hasChanged).toBe(true);
      expect(result.isSignificant).toBe(true);
    });

    it("should handle zero to zero change", () => {
      const newData = { zero_field: 0 };

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "zero_field",
        0.01,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.isSignificant).toBe(false);
    });

    it("should handle missing new value", () => {
      const newData = {}; // Missing field

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "lastPrice",
        0.01,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.isSignificant).toBe(false);
    });

    it("should handle missing last value", () => {
      const newData = { newField: 100 };

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "newField",
        0.01,
      );

      expect(result.hasChanged).toBe(false);
      expect(result.isSignificant).toBe(false);
    });

    it("should handle floating point precision issues", () => {
      const newData = { lastPrice: 150.00001 }; // Very small change

      const result = (service as any).checkFieldChange(
        newData,
        lastValues,
        "lastPrice",
        0.01,
      );

      expect(result.hasChanged).toBe(false); // Should be below precision threshold
      expect(result.isSignificant).toBe(false);
    });
  });

  describe("extractNumericValue", () => {
    it("should extract simple numeric fields", () => {
      const data = { price: 150.75 };
      const result = (service as any).extractNumericValue(data, "price");

      expect(result).toBe(150.75);
    });

    it("should extract nested numeric fields", () => {
      const data = {
        quote: {
          price: 150.75,
        },
      };
      const result = (service as any).extractNumericValue(data, "quote.price");

      expect(result).toBe(150.75);
    });

    it("should extract array indexed fields", () => {
      const data = {
        secu_quote: [{ last_done: 150.75 }],
      };
      const result = (service as any).extractNumericValue(
        data,
        "secu_quote[0].last_done",
      );

      expect(result).toBe(150.75);
    });

    it("should handle complex nested paths", () => {
      const data = {
        market_data: {
          quotes: [{ bid: { price: 150.7 } }],
        },
      };
      const result = (service as any).extractNumericValue(
        data,
        "market_data.quotes[0].bid.price",
      );

      expect(result).toBe(150.7);
    });

    it("should handle string numeric values", () => {
      const data = { price: "150.75" };
      const result = (service as any).extractNumericValue(data, "price");

      expect(result).toBe(150.75);
    });

    it("should return null for non-existent fields", () => {
      const data = { other_field: 100 };
      const result = (service as any).extractNumericValue(data, "price");

      expect(result).toBeNull();
    });

    it("should return null for non-numeric values", () => {
      const data = { price: "not_a_number" };
      const result = (service as any).extractNumericValue(data, "price");

      expect(result).toBeNull();
    });

    it("should return null for null/undefined values", () => {
      const data = { price: null, volume: undefined };

      expect((service as any).extractNumericValue(data, "price")).toBeNull();
      expect((service as any).extractNumericValue(data, "volume")).toBeNull();
    });

    it("should handle invalid array indices", () => {
      const data = {
        quotes: [{ price: 150.75 }],
      };
      const result = (service as any).extractNumericValue(
        data,
        "quotes[5].price",
      );

      expect(result).toBeNull();
    });

    it("should handle malformed paths gracefully", () => {
      const data = { price: 150.75 };

      expect(() => {
        (service as any).extractNumericValue(data, "price[invalid].test");
      }).not.toThrow();

      const result = (service as any).extractNumericValue(
        data,
        "price[invalid].test",
      );
      expect(result).toBeNull();
    });
  });

  describe("getLastSnapshot and saveSnapshot", () => {
    it("should return null when no snapshot exists", async () => {
      const snapshot = await (service as any).getLastSnapshot("NEW_SYMBOL");

      expect(snapshot).toBeNull();
    });

    it("should save and retrieve snapshot correctly", async () => {
      await (service as any).saveSnapshot("TEST_SYMBOL", mockStockData);

      const snapshot = await (service as any).getLastSnapshot("TEST_SYMBOL");

      expect(snapshot).toBeDefined();
      expect(snapshot.symbol).toBe("TEST_SYMBOL");
      expect(snapshot.checksum).toBeTruthy();
      expect(snapshot.criticalValues).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });

    it("should handle save snapshot errors gracefully", async () => {
      // Mock extractCriticalValues to throw error
      jest
        .spyOn(service as any, "extractCriticalValues")
        .mockImplementation(() => {
          throw new Error("Critical values extraction failed");
        });

      await (service as any).saveSnapshot("ERROR_SYMBOL", mockStockData);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "保存数据快照失败",
        expect.objectContaining({
          symbol: "ERROR_SYMBOL",
          error: "Critical values extraction failed",
        }),
      );
    });

    it("should handle get snapshot errors gracefully", async () => {
      // Mock snapshotCache.get to throw error
      const originalGet = (service as any).snapshotCache.get;
      jest
        .spyOn((service as any).snapshotCache, "get")
        .mockImplementation(() => {
          throw new Error("Cache access failed");
        });

      const snapshot = await (service as any).getLastSnapshot("ERROR_SYMBOL");

      expect(snapshot).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "获取数据快照失败",
        expect.objectContaining({
          symbol: "ERROR_SYMBOL",
          error: "Cache access failed",
        }),
      );

      // Restore original method
      (service as any).snapshotCache.get = originalGet;
    });
  });

  describe("extractCriticalValues", () => {
    it("should extract all available critical values", () => {
      const values = (service as any).extractCriticalValues(mockStockData);

      expect(values.lastPrice).toBe(150.75);
      expect(values.change).toBe(2.5);
      expect(values.volume).toBe(1000000);
      expect(values.high).toBe(152.0);
      expect(values.bid).toBe(150.7);
    });

    it("should handle data with missing fields", () => {
      const incompleteData = {
        lastPrice: 150.0,
        volume: 1000000,
      };

      const values = (service as any).extractCriticalValues(incompleteData);

      expect(values.lastPrice).toBe(150.0);
      expect(values.volume).toBe(1000000);
      expect(values.change).toBeUndefined();
      expect(values.high).toBeUndefined();
    });

    it("should handle complex nested data", () => {
      const nestedData = {
        secu_quote: [
          {
            last_done: 150.75,
            volume: 1000000,
          },
        ],
      };

      const values = (service as any).extractCriticalValues(nestedData);

      expect(Object.keys(values).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("cleanupOldSnapshots", () => {
    it("should clean up oldest snapshots when cache is full", async () => {
      // Fill cache beyond MAX_CACHE_SIZE
      const maxSize = (service as any).MAX_CACHE_SIZE;

      // Mock small cache size for testing
      (service as any).MAX_CACHE_SIZE = 4;

      // Add snapshots with different timestamps
      const timestamps = [1000, 2000, 3000, 4000, 5000];
      timestamps.forEach((timestamp, i) => {
        (service as any).snapshotCache.set(`SYMBOL_${i}`, {
          symbol: `SYMBOL_${i}`,
          timestamp,
          checksum: "test",
          criticalValues: {},
        });
      });

      // Trigger cleanup by adding one more
      await (service as any).saveSnapshot("NEW_SYMBOL", mockStockData);

      // Should have cleaned up oldest entries and added one more, resulting in 4 entries
      expect((service as any).snapshotCache.size).toBe(4);

      // Restore original max size
      (service as any).MAX_CACHE_SIZE = maxSize;
    });
  });

  describe("logPerformance", () => {
    it("should log warning for slow operations", () => {
      const slowStartTime = Date.now() - 50; // 50ms ago

      (service as any).logPerformance("test_operation", slowStartTime);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "数据变化检测性能异常",
        expect.objectContaining({
          operation: "test_operation",
          duration: expect.any(Number),
        }),
      );
    });

    it("should not log for fast operations", () => {
      const fastStartTime = Date.now() - 5; // 5ms ago

      (service as any).logPerformance("test_operation", fastStartTime);

      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });
  });

  describe("createResult", () => {
    it("should create result with all specified fields", () => {
      const result = (service as any).createResult(
        true,
        ["field1", "field2"],
        ["field1"],
        "test reason",
        0.85,
      );

      expect(result).toEqual({
        hasChanged: true,
        changedFields: ["field1", "field2"],
        significantChanges: ["field1"],
        changeReason: "test reason",
        confidence: 0.85,
      });
    });
  });

  describe("Edge Cases and Performance", () => {
    it("should handle extremely large data objects", async () => {
      const largeData = {
        ...mockStockData,
        metadata: Array.from({ length: 1000 }, (_, i) => ({
          key: `value_${i}`,
        })),
      };

      const result = await service.detectSignificantChange(
        "LARGE_SYMBOL",
        largeData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
    });

    it("should handle concurrent detection calls efficiently", async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        service.detectSignificantChange(
          `CONCURRENT_${i}`,
          { ...mockStockData, lastPrice: 150 + i },
          Market.US,
          MarketStatus.TRADING,
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.hasChanged).toBe(true); // All first-time data
      });
    });

    it("should handle rapid successive calls for same symbol", async () => {
      // First call
      const result1 = await service.detectSignificantChange(
        "RAPID_TEST",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Immediate second call with same data
      const result2 = await service.detectSignificantChange(
        "RAPID_TEST",
        mockStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      // Third call with different data
      const result3 = await service.detectSignificantChange(
        "RAPID_TEST",
        modifiedStockData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result1.hasChanged).toBe(true); // First time
      expect(result2.hasChanged).toBe(false); // No change
      expect(result3.hasChanged).toBe(true); // Changed
    });

    it("should handle memory pressure gracefully", async () => {
      // Force cache cleanup by filling beyond capacity
      const originalMaxSize = (service as any).MAX_CACHE_SIZE;
      (service as any).MAX_CACHE_SIZE = 10;

      // Add more than max size
      for (let i = 0; i < 15; i++) {
        await service.detectSignificantChange(
          `MEMORY_TEST_${i}`,
          { ...mockStockData, lastPrice: 150 + i },
          Market.US,
          MarketStatus.TRADING,
        );
      }

      expect((service as any).snapshotCache.size).toBeLessThanOrEqual(10);

      // Restore original size
      (service as any).MAX_CACHE_SIZE = originalMaxSize;
    });

    it("should handle different data types in numeric fields", async () => {
      const mixedTypeData = {
        lastPrice: "150.75", // String number
        volume: 1000000, // Regular number
        change: null, // Null value
        bid: undefined, // Undefined value
        ask: NaN, // NaN value
        high: Infinity, // Infinity value
      };

      const result = await service.detectSignificantChange(
        "MIXED_TYPES",
        mixedTypeData,
        Market.US,
        MarketStatus.TRADING,
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
    });
  });
});
