import { Test, TestingModule } from "@nestjs/testing";
import { SymbolTransformerService } from "../../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service";
import { SymbolMapperCacheService } from "../../../../../../../src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service";
import { CollectorService } from "../../../../../../../src/monitoring/collector/collector.service";
import { SymbolTransformResult } from "../../../../../../../src/core/02-processing/symbol-transformer/interfaces";
import {
  CONFIG,
  TRANSFORM_DIRECTIONS,
} from "../../../../../../../src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants";
import { DeepMocked, createMock } from "@golevelup/ts-jest";

// Mock the logger
jest.mock("../@app/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe("SymbolTransformerService", () => {
  let service: SymbolTransformerService;
  let symbolMapperCacheService: DeepMocked<SymbolMapperCacheService>;
  let mockCollectorService: jest.Mocked<CollectorService>; // ✅ 新增 CollectorService mock

  const mockMappingResult = {
    success: true,
    mappingDetails: {
      "700.HK": "00700",
      "AAPL.US": "AAPL",
    },
    failedSymbols: [],
    provider: "longport",
    direction: "to_standard" as const,
    totalProcessed: 2,
    cacheHits: 0,
    processingTimeMs: 10,
  };

  beforeEach(async () => {
    const mockCollector = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolTransformerService,
        {
          provide: SymbolMapperCacheService,
          useValue: createMock<SymbolMapperCacheService>(),
        },
        { provide: CollectorService, useValue: mockCollector }, // ✅ Mock CollectorService
      ],
    }).compile();

    service = module.get<SymbolTransformerService>(SymbolTransformerService);
    symbolMapperCacheService = module.get(SymbolMapperCacheService);
    mockCollectorService = module.get(CollectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("transformSymbols", () => {
    it("should transform symbols successfully", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockMappingResult);

      const result = await service.transformSymbols(
        "longport",
        ["700.HK", "AAPL.US"],
        "to_standard",
      );

      expect(result.mappedSymbols).toEqual(["00700", "AAPL"]);
      expect(result.metadata.successCount).toBe(2);
      expect(result.metadata.failedCount).toBe(0);
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        "longport",
        ["700.HK", "AAPL.US"],
        "to_standard",
        expect.any(String),
      );
    });

    // ✅ 验证标准监控调用
    it("should record metrics on successful transformation", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockMappingResult);

      await service.transformSymbols("longport", ["700.HK"], "to_standard");

      // ✅ 验证标准监控调用
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        "/internal/symbol-transformation", // endpoint
        "POST", // method
        200, // statusCode
        expect.any(Number), // duration
        expect.objectContaining({
          // metadata
          operation: "symbol-transformation",
          provider: "longport",
          direction: "to_standard",
          totalSymbols: 1,
          successCount: 2,
          failedCount: 0,
          successRate: 200,
          market: "HK",
        }),
      );
    });

    // ✅ 验证错误监控调用
    it("should record error metrics on transformation failure", async () => {
      const transformError = new Error("Transform failed");
      symbolMapperCacheService.mapSymbols.mockRejectedValue(transformError);

      const result = await service.transformSymbols(
        "longport",
        ["700.HK"],
        "to_standard",
      );

      // Should return failed result structure
      expect(result.failedSymbols).toEqual(["700.HK"]);
      expect(result.metadata.successCount).toBe(0);

      // ✅ 验证错误监控调用
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        "/internal/symbol-transformation", // endpoint
        "POST", // method
        500, // statusCode
        expect.any(Number), // duration
        expect.objectContaining({
          // metadata
          operation: "symbol-transformation",
          provider: "longport",
          direction: "to_standard",
          totalSymbols: 1,
          error: transformError.message,
          errorType: "Error",
        }),
      );
    });

    it("should handle single symbol input", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue({
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 5,
      });

      const result = await service.transformSymbols(
        "longport",
        "700.HK",
        "to_standard",
      );

      expect(result.mappedSymbols).toEqual(["00700"]);
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        "longport",
        ["700.HK"],
        "to_standard",
        expect.any(String),
      );
    });
  });

  describe("transformSingleSymbol", () => {
    it("should transform a single symbol", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue({
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 5,
      });

      const result = await service.transformSingleSymbol(
        "longport",
        "700.HK",
        "to_standard",
      );

      expect(result).toBe("00700");
    });

    it("should return original symbol on transformation failure", async () => {
      symbolMapperCacheService.mapSymbols.mockRejectedValue(
        new Error("Failed"),
      );

      const result = await service.transformSingleSymbol(
        "longport",
        "700.HK",
        "to_standard",
      );

      expect(result).toBe("700.HK"); // Should return original on failure
    });
  });

  describe("backward compatibility methods", () => {
    it("mapSymbols should call transformSymbols with to_standard direction", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockMappingResult);

      await service.mapSymbols("longport", ["700.HK"]);

      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        "longport",
        ["700.HK"],
        "to_standard",
        expect.any(String),
      );
    });

    it("mapSymbol should call transformSingleSymbol with to_standard direction", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue({
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 5,
      });

      const result = await service.mapSymbol("longport", "700.HK");

      expect(result).toBe("00700");
    });
  });

  describe("input validation", () => {
    it("should throw error for empty provider", async () => {
      await expect(
        service.transformSymbols(
          "",
          ["700.HK"],
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow("Provider is required and must be a non-empty string");
    });

    it("should throw error for null symbols array", async () => {
      await expect(
        service.transformSymbols(
          "longport",
          null as any,
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow("Symbols array is required and must not be empty");
    });

    it("should throw error for empty symbols array", async () => {
      await expect(
        service.transformSymbols(
          "longport",
          [],
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow("Symbols array is required and must not be empty");
    });

    it("should throw error for invalid direction", async () => {
      await expect(
        service.transformSymbols(
          "longport",
          ["700.HK"],
          "invalid_direction" as any,
        ),
      ).rejects.toThrow("Invalid direction: invalid_direction");
    });

    it("should throw error for oversized batch", async () => {
      const oversizedArray = new Array(CONFIG.MAX_BATCH_SIZE + 1).fill("AAPL");

      await expect(
        service.transformSymbols(
          "longport",
          oversizedArray,
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow(
        `Batch size exceeds maximum limit of ${CONFIG.MAX_BATCH_SIZE}`,
      );
    });

    it("should throw error for oversized symbol", async () => {
      const oversizedSymbol = "A".repeat(CONFIG.MAX_SYMBOL_LENGTH + 1);

      await expect(
        service.transformSymbols(
          "longport",
          [oversizedSymbol],
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow(
        `Symbol length exceeds maximum limit of ${CONFIG.MAX_SYMBOL_LENGTH}`,
      );
    });

    it("should throw error for empty string in symbols array", async () => {
      await expect(
        service.transformSymbols(
          "longport",
          ["AAPL", "", "700.HK"],
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow("All symbols must be non-empty strings");
    });
  });

  describe("performance improvements", () => {
    it("should use constants endpoint for monitoring", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockMappingResult);

      await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        CONFIG.ENDPOINT, // Using constant instead of hardcoded value
        "POST",
        200,
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("should generate UUID-based request IDs", async () => {
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockMappingResult);

      await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      // Verify that mapSymbols was called with a UUID-like request ID
      const call = symbolMapperCacheService.mapSymbols.mock.calls[0];
      const requestId = call[3]; // 4th parameter is requestId

      expect(requestId).toMatch(
        /^transform_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
