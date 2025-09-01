import { Test, TestingModule } from "@nestjs/testing";
import { SymbolTransformerService } from "../../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service";
import { SymbolMapperCacheService } from "../../../../../../../src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service";
import { CollectorService } from "../../../../../../../src/monitoring/collector/collector.service";
import {
  TRANSFORM_DIRECTIONS,
  CONFIG,
} from "../../../../../../../src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants";

describe("SymbolTransformerService Integration Test", () => {
  let service: SymbolTransformerService;
  let symbolMapperCacheService: SymbolMapperCacheService;
  let collectorService: CollectorService;

  beforeEach(async () => {
    const mockCollector = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
    };

    const mockSymbolMapperCache = {
      mapSymbols: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolTransformerService,
        { provide: SymbolMapperCacheService, useValue: mockSymbolMapperCache },
        { provide: CollectorService, useValue: mockCollector },
      ],
    }).compile();

    service = module.get<SymbolTransformerService>(SymbolTransformerService);
    symbolMapperCacheService = module.get<SymbolMapperCacheService>(
      SymbolMapperCacheService,
    );
    collectorService = module.get<CollectorService>(CollectorService);
  });

  describe("Architecture Integration", () => {
    it("should properly depend on SymbolMapperCacheService for actual transformations", async () => {
      // Mock response from SymbolMapperCacheService
      const mockResponse = {
        success: true,
        mappingDetails: {
          "700.HK": "00700",
          "AAPL.US": "AAPL",
        },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 2,
        cacheHits: 1,
        processingTime: 15,
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      const result = await service.transformSymbols(
        "longport",
        ["700.HK", "AAPL.US"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      // Verify service depends on SymbolMapperCacheService
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        "longport",
        ["700.HK", "AAPL.US"],
        "to_standard",
        expect.any(String), // UUID request ID
      );

      // Verify result structure is properly transformed
      expect(result).toEqual({
        mappedSymbols: ["00700", "AAPL"],
        mappingDetails: {
          "700.HK": "00700",
          "AAPL.US": "AAPL",
        },
        failedSymbols: [],
        metadata: {
          provider: "longport",
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: expect.any(Number),
        },
      });
    });

    it("should integrate with CollectorService for monitoring", async () => {
      const mockResponse = {
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTime: 10,
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      // Verify monitoring integration
      expect(collectorService.recordRequest).toHaveBeenCalledWith(
        CONFIG.ENDPOINT,
        "POST",
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: "symbol-transformation",
          provider: "longport",
          direction: "to_standard",
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
        }),
      );
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle SymbolMapperCacheService errors gracefully", async () => {
      const cacheError = new Error("Cache service error");
      (symbolMapperCacheService.mapSymbols as jest.Mock).mockRejectedValue(
        cacheError,
      );

      const result = await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      // Should return failure structure instead of throwing
      expect(result).toEqual({
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: ["700.HK"],
        metadata: {
          provider: "longport",
          totalSymbols: 1,
          successCount: 0,
          failedCount: 1,
          processingTimeMs: expect.any(Number),
        },
      });

      // Should record error metrics
      expect(collectorService.recordRequest).toHaveBeenCalledWith(
        CONFIG.ENDPOINT,
        "POST",
        500,
        expect.any(Number),
        expect.objectContaining({
          error: cacheError.message,
          errorType: "Error",
        }),
      );
    });

    it("should handle CollectorService failures gracefully", async () => {
      const mockResponse = {
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTime: 10,
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(
        mockResponse,
      );
      (collectorService.recordRequest as jest.Mock).mockImplementation(() => {
        throw new Error("Monitoring service unavailable");
      });

      // Should not throw when monitoring fails
      const result = await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      expect(result.mappedSymbols).toEqual(["00700"]);
    });
  });

  describe("Performance and Validation Integration", () => {
    it("should enforce batch size limits", async () => {
      const oversizedBatch = new Array(CONFIG.MAX_BATCH_SIZE + 1).fill("AAPL");

      await expect(
        service.transformSymbols(
          "longport",
          oversizedBatch,
          TRANSFORM_DIRECTIONS.TO_STANDARD,
        ),
      ).rejects.toThrow(
        `Batch size exceeds maximum limit of ${CONFIG.MAX_BATCH_SIZE}`,
      );

      // Should not call SymbolMapperCacheService when validation fails
      expect(symbolMapperCacheService.mapSymbols).not.toHaveBeenCalled();
    });

    it("should use UUID-based request IDs in cache service calls", async () => {
      const mockResponse = {
        success: true,
        mappingDetails: { "700.HK": "00700" },
        failedSymbols: [],
        provider: "longport",
        direction: "to_standard" as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTime: 10,
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      await service.transformSymbols(
        "longport",
        ["700.HK"],
        TRANSFORM_DIRECTIONS.TO_STANDARD,
      );

      const [, , , requestId] = (
        symbolMapperCacheService.mapSymbols as jest.Mock
      ).mock.calls[0];

      // Should be UUID format: transform_{uuid}
      expect(requestId).toMatch(
        /^transform_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
