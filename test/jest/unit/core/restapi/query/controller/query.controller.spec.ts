/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { QueryController } from "../../../../../../../src/core/restapi/query/controller/query.controller";
import { QueryService } from "../../../../../../../src/core/restapi/query/services/query.service";
import {
  QueryRequestDto,
  BulkQueryRequestDto,
} from "../../../../../../../src/core/restapi/query/dto/query-request.dto";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
  QueryStatsDto,
} from "../../../../../../../src/core/restapi/query/dto/query-response.dto";
import { PaginatedDataDto } from "../../../../../../../src/common/modules/pagination/dto/paginated-data";
import { QueryType } from "../../../../../../../src/core/restapi/query/dto/query-types.dto";
import { RateLimitService } from "../../../../../../../src/auth/services/rate-limit.service";
import { PermissionService } from "../../../../../../../src/auth/services/permission.service";
import { UnifiedPermissionsGuard } from "../../../../../../../src/auth/guards/unified-permissions.guard";
import { getModelToken } from "@nestjs/mongoose";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { CanActivate } from "@nestjs/common";

// Mock createLogger for core modules
const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("../../../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("QueryController", () => {
  let controller: QueryController;
  let queryService: jest.Mocked<QueryService>;
  let mockLogger: any;

  const mockQueryResponse: QueryResponseDto = {
    data: new PaginatedDataDto([
      {
        symbol: "AAPL",
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        volume: 5234567,
        market: "US",
      },
    ], {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }),
    metadata: {
      queryType: QueryType.BY_SYMBOLS,
      totalResults: 1,
      returnedResults: 1,
      executionTime: 156,
      cacheUsed: true,
      dataSources: {
        cache: { hits: 1, misses: 0 },
        realtime: { hits: 0, misses: 0 },
      },
      timestamp: "2024-01-01T12:00:00.000Z",
    },
  };

  const mockBulkQueryResponse: BulkQueryResponseDto = {
    results: [mockQueryResponse],
    summary: {
      totalQueries: 1,
      totalExecutionTime: 156,
      averageExecutionTime: 156,
    },
    timestamp: "2024-01-01T12:00:00.000Z",
  };

  const mockQueryStats: QueryStatsDto = {
    performance: {
      totalQueries: 15420,
      averageExecutionTime: 127,
      cacheHitRate: 0.82,
      errorRate: 0.03,
      queriesPerSecond: 45.6,
    },
    queryTypes: {
      by_symbols: {
        count: 8540,
        averageTime: 95,
        successRate: 0.98,
      },
      by_market: {
        count: 4120,
        averageTime: 185,
        successRate: 0.95,
      },
    },
    dataSources: {
      cache: { queries: 12644, avgTime: 15, successRate: 0.99 },
      persistent: { queries: 2776, avgTime: 125, successRate: 0.97 },
      realtime: { queries: 324, avgTime: 456, successRate: 0.94 },
    },
    popularQueries: [
      {
        pattern: "AAPL,GOOGL,MSFT",
        count: 156,
        averageTime: 89,
        lastExecuted: "2024-01-01T11:55:00.000Z",
      },
    ],
    timestamp: "2024-01-01T12:00:00.000Z",
  };

  beforeEach(async () => {
    const mockQueryService = {
      executeQuery: jest.fn(),
      executeBulkQuery: jest.fn(),
      getQueryStats: jest.fn(),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn(),
      getCurrentUsage: jest.fn(),
      resetRateLimit: jest.fn(),
      getUsageStatistics: jest.fn(),
    };

    const mockRedisService = {
      getOrThrow: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockGuard: CanActivate = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [
        {
          provide: QueryService,
          useValue: mockQueryService,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: getModelToken("ApiKey"),
          useValue: {},
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
            createPermissionContext: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
      // 添加ThrottlerModule以提供必要的依赖
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{
            ttl: 60,
            limit: 100,
          }],
        }),
      ],
    })
      .overrideGuard(ThrottlerGuard) // 添加对ThrottlerGuard的覆盖
      .useValue(mockGuard)
      .compile();

    controller = module.get<QueryController>(QueryController);
    queryService = module.get(QueryService);
    mockLogger = mockLoggerInstance;

    // Clear all previous calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("executeQuery", () => {
    it("should execute query successfully", async () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US", "MSFT.US"],
        queryTypeFilter: "stock-quote",
        options: {
          useCache: true,
          updateCache: true,
          includeMetadata: true,
        },
      };

      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      const result = await controller.executeQuery(queryRequest);

      expect(result).toBe(mockQueryResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(queryRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Execute query",
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ["AAPL.US", "MSFT.US"],
          queryTypeFilter: "stock-quote",
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Success: Query executed successfully",
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          totalResults: 1,
        }),
      );
    });

    it("should handle query execution errors", async () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["INVALID.US"],
        queryTypeFilter: "stock-quote",
      };

      const error = new Error("Query execution failed");
      queryService.executeQuery.mockRejectedValue(error);

      await expect(controller.executeQuery(queryRequest)).rejects.toThrow(
        "Query execution failed",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "API Error: Query execution failed",
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          error: "Query execution failed",
          errorType: "Error",
        }),
      );
    });

    it("should log properly with limited symbols array", async () => {
      const queryRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US", "MSFT.US", "GOOGL.US", "TSLA.US", "AMZN.US"],
        queryTypeFilter: "stock-quote",
      };

      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.executeQuery(queryRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Execute query",
        expect.objectContaining({
          symbols: ["AAPL.US", "MSFT.US", "GOOGL.US"],
        }),
      );
    });
  });

  describe("executeBulkQuery", () => {
    it("should execute bulk query successfully", async () => {
      const bulkRequest: BulkQueryRequestDto = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["AAPL.US"],
            queryTypeFilter: "stock-quote",
          },
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["MSFT.US"],
            queryTypeFilter: "stock-quote",
          },
        ],
        parallel: true,
        continueOnError: true,
      };

      queryService.executeBulkQuery.mockResolvedValue(mockBulkQueryResponse);

      const result = await controller.executeBulkQuery(bulkRequest);

      expect(result).toBe(mockBulkQueryResponse);
      expect(queryService.executeBulkQuery).toHaveBeenCalledWith(bulkRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Execute bulk query",
        expect.objectContaining({
          queriesCount: 2,
          parallel: true,
          continueOnError: true,
        }),
      );
    });

    it("should handle bulk query execution errors", async () => {
      const bulkRequest: BulkQueryRequestDto = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["INVALID.US"],
            queryTypeFilter: "stock-quote",
          },
        ],
        parallel: false,
        continueOnError: false,
      };

      const error = new Error("Bulk query execution failed");
      queryService.executeBulkQuery.mockRejectedValue(error);

      await expect(controller.executeBulkQuery(bulkRequest)).rejects.toThrow(
        "Bulk query execution failed",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "API Error: Bulk query execution failed",
        expect.objectContaining({
          queriesCount: 1,
          error: "Bulk query execution failed",
          errorType: "Error",
        }),
      );
    });

    it("should log unique query types correctly", async () => {
      const bulkRequest: BulkQueryRequestDto = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["AAPL.US"],
          },
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["MSFT.US"],
          },
          {
            queryType: QueryType.BY_MARKET,
            market: "US",
          },
        ],
        parallel: true,
      };

      queryService.executeBulkQuery.mockResolvedValue(mockBulkQueryResponse);

      await controller.executeBulkQuery(bulkRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Execute bulk query",
        expect.objectContaining({
          queryTypes: [QueryType.BY_SYMBOLS, QueryType.BY_MARKET],
        }),
      );
    });
  });

  describe("queryBySymbols", () => {
    it("should execute symbols query successfully", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      const result = await controller.queryBySymbols(
        "AAPL,MSFT,GOOGL",
        "longport",
        "US",
        "quote",
        10,
        1,
        true,
      );

      expect(result).toBe(mockQueryResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ["AAPL", "MSFT", "GOOGL"],
          provider: "longport",
          market: "US",
          queryTypeFilter: "quote",
          limit: 10,
          page: 1,
          options: {
            useCache: true,
            updateCache: true,
            includeMetadata: false,
          },
        }),
      );
    });

    it("should throw error when symbols parameter is missing", async () => {
      await expect(controller.queryBySymbols("", "longport", "US", "quote", 10, 1, true)).rejects.toThrow(
        "Symbols parameter is required",
      );
    });

    it("should handle symbols with whitespace and empty values", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols(" AAPL , MSFT , , GOOGL ", "longport", "US", "quote", 10, 1, true);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["AAPL", "MSFT", "GOOGL"],
        }),
      );
    });

    it("should use default values for optional parameters", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols("AAPL", "longport", "US", "quote", 100, 1, true);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          page: 1,
          options: {
            useCache: true,
            updateCache: true,
            includeMetadata: false,
          },
        }),
      );
    });

    it("should handle useCache false parameter correctly", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols(
        "AAPL",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
      );

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            useCache: false,
            updateCache: true,
            includeMetadata: false,
          },
        }),
      );
    });

    it("should log limited symbols in request log", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols("AAPL,MSFT,GOOGL,_TSLA,AMZN", "longport", "US", "quote", 10, 1, true);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Quick query by symbols",
        expect.objectContaining({
          symbols: ["AAPL", "MSFT", "GOOGL"],
        }),
      );
    });
  });

  describe("queryByMarket", () => {
    it("should execute market query successfully", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      const result = await controller.queryByMarket(
        "US",
        "longport",
        "quote",
        50,
        10,
      );

      expect(result).toBe(mockQueryResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_MARKET,
          market: "US",
          provider: "longport",
          queryTypeFilter: "quote",
          limit: 50,
          page: 10,
          options: {
            useCache: true,
            updateCache: true,
            includeMetadata: true,
          },
        }),
      );
    });

    it("should throw error when market parameter is missing", async () => {
      await expect(controller.queryByMarket("", "longport", "quote", 100, 0)).rejects.toThrow(
        "Market parameter is required",
      );
    });

    it("should use default values for optional parameters", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryByMarket("HK", "longport", "quote", 100, 0);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          page: 1,
        }),
      );
    });
  });

  describe("queryByProvider", () => {
    it("should execute provider query successfully", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      const result = await controller.queryByProvider(
        "longport",
        "US",
        "quote",
        25,
        5,
      );

      expect(result).toBe(mockQueryResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_PROVIDER,
          provider: "longport",
          market: "US",
          queryTypeFilter: "quote",
          limit: 25,
          page: 5,
          options: {
            useCache: true,
            updateCache: true,
            includeMetadata: true,
          },
        }),
      );
    });

    it("should throw error when provider parameter is missing", async () => {
      await expect(controller.queryByProvider("", "longport", "quote", 100, 0)).rejects.toThrow(
        "Provider parameter is required",
      );
    });

    it("should use default values for optional parameters", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryByProvider("futu", "longport", "quote", 100, 0);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          page: 1,
        }),
      );
    });
  });

  describe("getQueryStats", () => {
    it("should return query statistics successfully", async () => {
      queryService.getQueryStats.mockResolvedValue(mockQueryStats);

      const result = await controller.getQueryStats();

      expect(result).toBe(mockQueryStats);
      expect(queryService.getQueryStats).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Get query statistics",
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Success: Query statistics generated",
        expect.objectContaining({
          totalQueries: 15420,
          averageExecutionTime: 127,
          cacheHitRate: 0.82,
          errorRate: 0.03,
          queryTypesCount: 2,
        }),
      );
    });

    it("should handle query stats errors", async () => {
      const error = new Error("Failed to generate statistics");
      queryService.getQueryStats.mockRejectedValue(error);

      await expect(controller.getQueryStats()).rejects.toThrow(
        "Failed to generate statistics",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "API Error: Failed to get query statistics",
        expect.objectContaining({
          error: "Failed to generate statistics",
          errorType: "Error",
        }),
      );
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when query service works", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        queryService: {
          available: true,
          latency: expect.any(Number),
        },
        overallHealth: {
          healthy: true,
          timestamp: expect.any(String),
        },
      });

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ["TEST"],
          queryTypeFilter: "stock-quote",
          options: {
            useCache: false,
            updateCache: false,
          },
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Request: Query service health check",
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "API Success: Query service health check completed",
        expect.objectContaining({
          queryServiceHealthy: true,
          latency: expect.any(Number),
          overallHealthy: true,
        }),
      );
    });

    it("should return unhealthy status and throw error when query service fails", async () => {
      const error = new Error("Query service unavailable");
      queryService.executeQuery.mockRejectedValue(error);

      try {
        await controller.healthCheck();
        fail("Expected method to throw");
      } catch (thrown) {
        expect(thrown._message).toBe("查询服务健康检查失败");
        expect(thrown._statusCode).toBe(503);
        expect(thrown.data).toEqual({
          queryService: {
            available: false,
            latency: expect.any(Number),
          },
          overallHealth: {
            healthy: false,
            timestamp: expect.any(String),
          },
        });
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        "API Error: Query service health check failed",
        expect.objectContaining({
          error: "Query service unavailable",
          latency: expect.any(Number),
        }),
      );
    });

    it("should handle null response from query service", async () => {
      queryService.executeQuery.mockResolvedValue(null);

      const result = await controller.healthCheck();

      const healthResult = {
        queryService: {
          available: false,
          latency: expect.any(Number),
        },
        overallHealth: {
          healthy: false,
          timestamp: expect.any(String),
        },
      };

      expect(result).toEqual(healthResult);
    });
  });

  describe("controller methods integration", () => {
    it("should call executeQuery internally from queryBySymbols", async () => {
      jest
        .spyOn(controller, "executeQuery")
        .mockResolvedValue(mockQueryResponse);

      const result = await controller.queryBySymbols("AAPL,MSFT", "longport", "US", "quote", 100, 1, true);

      expect(result).toBe(mockQueryResponse);
      expect(controller.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ["AAPL", "MSFT"],
        }),
      );
    });

    it("should call executeQuery internally from queryByMarket", async () => {
      jest
        .spyOn(controller, "executeQuery")
        .mockResolvedValue(mockQueryResponse);

      const result = await controller.queryByMarket("US", "longport", "quote", 100, 1);

      expect(result).toBe(mockQueryResponse);
      expect(controller.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_MARKET,
          market: "US",
        }),
      );
    });

    it("should call executeQuery internally from queryByProvider", async () => {
      jest
        .spyOn(controller, "executeQuery")
        .mockResolvedValue(mockQueryResponse);

      const result = await controller.queryByProvider("longport", "US", "quote", 100, 1);

      expect(result).toBe(mockQueryResponse);
      expect(controller.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_PROVIDER,
          provider: "longport",
        }),
      );
    });
  });

  describe("edge cases and parameter validation", () => {
    it("should handle undefined symbols parameter", async () => {
      await expect(controller.queryBySymbols(undefined as any, "longport", "US", "quote", 100, 1, true)).rejects.toThrow(
        "Symbols parameter is required",
      );
    });

    it("should handle null market parameter", async () => {
      await expect(controller.queryByMarket(null as any, "longport", "quote", 100, 0)).rejects.toThrow(
        "Market parameter is required",
      );
    });

    it("should handle null provider parameter", async () => {
      await expect(controller.queryByProvider(null as any, "longport", "quote", 100, 0)).rejects.toThrow(
        "Provider parameter is required",
      );
    });

    it("should filter out empty symbols after splitting", async () => {
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols("AAPL,,MSFT,,,GOOGL,", "longport", "US", "quote", 100, 1, true);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["AAPL", "MSFT", "GOOGL"],
        }),
      );
    });

    it("should handle symbols with only commas and spaces", async () => {
      // When symbols array becomes empty after filtering, it should be treated as empty symbols
      // The current implementation will call executeQuery with empty array, which may succeed
      // Let's test that it behaves gracefully
      queryService.executeQuery.mockResolvedValue(mockQueryResponse);

      await controller.queryBySymbols(", , ,", "longport", "US", "quote", 100, 1, true);

      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: [],
        }),
      );
    });
  });
});
