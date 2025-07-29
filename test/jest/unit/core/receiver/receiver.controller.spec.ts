import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { ReceiverController } from "../../../../../src/core/receiver/controller/receiver.controller";
import { ReceiverService } from "../../../../../src/core/receiver/service/receiver.service";
import { DataRequestDto } from "../../../../../src/core/receiver/dto/data-request.dto";
import { DataResponseDto } from "../../../../../src/core/receiver/dto/data-response.dto";
import { RateLimitService } from "../../../../../src/auth/services/rate-limit.service";
import { PermissionService } from "../../../../../src/auth/services/permission.service";
import { UnifiedPermissionsGuard } from "../../../../../src/auth/guards/unified-permissions.guard";
import { getModelToken } from "@nestjs/mongoose";
import { RedisService } from "@liaoliaots/nestjs-redis";

// Mock createLogger for core modules
const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("ReceiverController", () => {
  let controller: ReceiverController;
  let receiverService: jest.Mocked<ReceiverService>;

  const mockDataResponse: DataResponseDto = {
    data: [
      {
        symbol: "AAPL",
        lastPrice: 195.89,
        change: 2.31,
        changePercent: 1.19,
        volume: 45678900,
        market: "US",
        timestamp: "2024-01-01T15:30:00.000Z",
      },
      {
        symbol: "700.HK",
        lastPrice: 385.6,
        change: -4.2,
        changePercent: -1.08,
        volume: 12345600,
        market: "HK",
        timestamp: "2024-01-01T08:00:00.000Z",
      },
    ],
    metadata: {
      requestId: "req_1704110400000_abc123",
      provider: "longport",
      capability: "get-stock-quote",
      processingTime: 156,
      timestamp: "2024-01-01T12:00:00.000Z",
    },
  };

  beforeEach(async () => {
    const mockReceiverService = {
      handleRequest: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiverController],
      providers: [
        {
          provide: ReceiverService,
          useValue: mockReceiverService,
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
    }).compile();

    controller = module.get<ReceiverController>(ReceiverController);
    receiverService = module.get(ReceiverService);

    // Clear all previous calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("handleDataRequest", () => {
    it("should handle data request successfully", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL", "700.HK"],
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          realtime: true,
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockDataResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(mockDataResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["AAPL", "700.HK"],
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          realtime: true,
        },
      });
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("数据请求处理完成", {
        requestId: "req_1704110400000_abc123",
        success: true,
        provider: "longport",
        processingTime: 156,
      });
    });

    it("should handle data request with minimal options", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["MSFT"],
        capabilityType: "stock-basic-info",
      };

      const simpleResponse: DataResponseDto = {
        data: [
          {
            symbol: "MSFT",
            companyName: "Microsoft Corporation",
            market: "US",
          },
        ],
        metadata: {
          requestId: "req_1704110400001_def456",
          provider: "longport",
          capability: "stock-basic-info",
          processingTime: 89,
          timestamp: "2024-01-01T12:01:00.000Z",
        },
      };

      receiverService.handleRequest.mockResolvedValue(simpleResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(simpleResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["MSFT"],
        capabilityType: "stock-basic-info",
        options: undefined,
      });
    });

    it("should handle multiple symbols of different markets", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL", "700.HK", "000001.SZ", "600036.SH"],
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          realtime: false,
          market: "ALL",
        },
      };

      const multiMarketResponse: DataResponseDto = {
        data: [
          {
            symbol: "AAPL",
            lastPrice: 195.89,
            market: "US",
          },
          {
            symbol: "700.HK",
            lastPrice: 385.6,
            market: "HK",
          },
          {
            symbol: "000001.SZ",
            lastPrice: 12.45,
            market: "SZ",
          },
          {
            symbol: "600036.SH",
            lastPrice: 45.67,
            market: "SH",
          },
        ],
        metadata: {
          requestId: "req_1704110400002_ghi789",
          provider: "longport",
          capability: "get-stock-quote",
          processingTime: 234,
          timestamp: "2024-01-01T12:02:00.000Z",
        },
      };

      receiverService.handleRequest.mockResolvedValue(multiMarketResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(multiMarketResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("数据请求处理完成", {
        requestId: "req_1704110400002_ghi789",
        success: true,
        provider: "longport",
        processingTime: 234,
      });
    });

    it("should handle index quote requests", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["HSI.HK", "SPX.US"],
        capabilityType: "index-quote",
        options: {
          preferredProvider: "longport",
          realtime: true,
        },
      };

      const indexResponse: DataResponseDto = {
        data: [
          {
            symbol: "HSI.HK",
            lastPrice: 17456.78,
            change: 123.45,
            changePercent: 0.71,
            market: "HK",
          },
          {
            symbol: "SPX.US",
            lastPrice: 4567.89,
            change: -12.34,
            changePercent: -0.27,
            market: "US",
          },
        ],
        metadata: {
          requestId: "req_1704110400003_jkl012",
          provider: "longport",
          capability: "get-index-quote",
          processingTime: 178,
          timestamp: "2024-01-01T12:03:00.000Z",
        },
      };

      receiverService.handleRequest.mockResolvedValue(indexResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(indexResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
    });

    it("should handle request errors gracefully", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["INVALID_SYMBOL"],
        capabilityType: "get-stock-quote",
      };

      const error = new Error("Failed to fetch data from provider");
      receiverService.handleRequest.mockRejectedValue(error);

      await expect(controller.handleDataRequest(dataRequest)).rejects.toThrow(
        "Failed to fetch data from provider",
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据请求处理失败",
        {
          error: "Failed to fetch data from provider",
          stack: expect.any(String),
          symbols: ["INVALID_SYMBOL"],
          capabilityType: "get-stock-quote",
        },
      );
    });

    it("should handle network timeout errors", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL"],
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
        },
      };

      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      receiverService.handleRequest.mockRejectedValue(timeoutError);

      await expect(controller.handleDataRequest(dataRequest)).rejects.toThrow(
        "Request timeout",
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据请求处理失败",
        expect.objectContaining({
          error: "Request timeout",
          symbols: ["AAPL"],
          capabilityType: "get-stock-quote",
        }),
      );
    });

    it("should handle service unavailable errors", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["700.HK"],
        capabilityType: "stock-basic-info",
      };

      const serviceError = new Error("Provider service unavailable");
      serviceError.name = "ServiceUnavailableError";
      receiverService.handleRequest.mockRejectedValue(serviceError);

      await expect(controller.handleDataRequest(dataRequest)).rejects.toThrow(
        "Provider service unavailable",
      );

      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据请求处理失败",
        expect.objectContaining({
          error: "Provider service unavailable",
          symbols: ["700.HK"],
          capabilityType: "stock-basic-info",
        }),
      );
    });

    it("should handle large symbol lists", async () => {
      const manySymbols = Array.from({ length: 50 }, (_, i) => `STOCK${i}`);
      const dataRequest: DataRequestDto = {
        symbols: manySymbols,
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          fields: ["lastPrice", "market"],
        },
      };

      const batchResponse: DataResponseDto = {
        data: manySymbols.map((symbol, index) => ({
          symbol,
          lastPrice: 100 + index,
          market: "US",
        })),
        metadata: {
          requestId: "req_1704110400004_mno345",
          provider: "longport",
          capability: "get-stock-quote",
          processingTime: 567,
          timestamp: "2024-01-01T12:04:00.000Z",
        },
      };

      receiverService.handleRequest.mockResolvedValue(batchResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(batchResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: manySymbols,
        capabilityType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
          fields: ["lastPrice", "market"],
        },
      });
    });

    it("should handle partial success responses", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL", "INVALID", "MSFT"],
        capabilityType: "get-stock-quote",
      };

      const partialResponse: DataResponseDto = {
        data: [
          {
            symbol: "AAPL",
            lastPrice: 195.89,
            market: "US",
          },
          {
            symbol: "MSFT",
            lastPrice: 378.45,
            market: "US",
          },
        ],
        metadata: {
          requestId: "req_1704110400005_pqr678",
          provider: "longport",
          capability: "get-stock-quote",
          processingTime: 298,
          timestamp: "2024-01-01T12:05:00.000Z",
          hasPartialFailures: true,
          totalRequested: 3,
          successfullyProcessed: 2,
        },
      };

      receiverService.handleRequest.mockResolvedValue(partialResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(partialResponse);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("数据请求处理完成", {
        requestId: "req_1704110400005_pqr678",
        success: false,
        provider: "longport",
        processingTime: 298,
        totalRequested: 3,
        successfullyProcessed: 2,
        hasPartialFailures: true,
      });
    });

    it("should handle requests with different data types", async () => {
      const stockQuoteRequest: DataRequestDto = {
        symbols: ["AAPL"],
        capabilityType: "get-stock-quote",
      };

      const basicInfoRequest: DataRequestDto = {
        symbols: ["700.HK"],
        capabilityType: "stock-basic-info",
      };

      const indexQuoteRequest: DataRequestDto = {
        symbols: ["HSI.HK"],
        capabilityType: "index-quote",
      };

      receiverService.handleRequest.mockImplementation((request) => {
        // 映射 capabilityType 到正确的 capability 名称
        const dataTypeToCapabilityMap: Record<string, string> = {
          "stock-quote": "get-stock-quote",
          "stock-basic-info": "get-stock-basic-info",
          "index-quote": "get-index-quote",
        };

        return Promise.resolve({
          success: true,
          data: [{ symbol: request.symbols[0], capabilityType: request.capabilityType }],
          metadata: {
            requestId: `req_${Date.now()}`,
            provider: "longport",
            capability:
              dataTypeToCapabilityMap[request.capabilityType] || request.capabilityType,
            processingTime: 100,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Test stock quote
      await controller.handleDataRequest(stockQuoteRequest);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        stockQuoteRequest,
      );

      // Test basic info
      await controller.handleDataRequest(basicInfoRequest);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        basicInfoRequest,
      );

      // Test index quote
      await controller.handleDataRequest(indexQuoteRequest);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(
        indexQuoteRequest,
      );

      expect(receiverService.handleRequest).toHaveBeenCalledTimes(3);
    });

    it("should handle requests with various options configurations", async () => {
      const requestConfigs = [
        {
          symbols: ["AAPL"],
          capabilityType: "get-stock-quote" as const,
          options: { preferredProvider: "longport" },
        },
        {
          symbols: ["MSFT"],
          capabilityType: "get-stock-quote" as const,
          options: { preferredProvider: "futu", realtime: true },
        },
        {
          symbols: ["GOOGL"],
          capabilityType: "get-stock-quote" as const,
          options: { market: "US", realtime: false },
        },
        {
          symbols: ["TSLA"],
          capabilityType: "get-stock-quote" as const,
          options: { fields: ["lastPrice", "volume"], realtime: true },
        },
      ];

      receiverService.handleRequest.mockImplementation(() =>
        Promise.resolve({
          success: true,
          data: [],
          metadata: {
            requestId: "test",
            provider: "longport",
            capability: "get-stock-quote",
            processingTime: 100,
            timestamp: new Date().toISOString(),
          },
        }),
      );

      for (const config of requestConfigs) {
        await controller.handleDataRequest(config);
        expect(receiverService.handleRequest).toHaveBeenCalledWith(config);
      }

      expect(receiverService.handleRequest).toHaveBeenCalledTimes(
        requestConfigs.length,
      );
    });
  });

  describe("logging behavior", () => {
    it("should log request and response details correctly", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["TEST"],
        capabilityType: "get-stock-quote",
        options: { preferredProvider: "longport" },
      };

      receiverService.handleRequest.mockResolvedValue(mockDataResponse);

      await controller.handleDataRequest(dataRequest);

      // Verify request logging
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["TEST"],
        capabilityType: "get-stock-quote",
        options: { preferredProvider: "longport" },
      });

      // Verify success logging
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("数据请求处理完成", {
        requestId: mockDataResponse.metadata.requestId,
        success: true,
        provider: mockDataResponse.metadata.provider,
        processingTime: mockDataResponse.metadata.processingTime,
      });
    });

    it("should log error details correctly", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["ERROR_TEST"],
        capabilityType: "get-stock-quote",
      };

      const testError = new Error("Test error message");
      testError.stack = "Error stack trace";
      receiverService.handleRequest.mockRejectedValue(testError);

      await expect(controller.handleDataRequest(dataRequest)).rejects.toThrow(
        "Test error message",
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据请求处理失败",
        {
          error: "Test error message",
          stack: "Error stack trace",
          symbols: ["ERROR_TEST"],
          capabilityType: "get-stock-quote",
        },
      );
    });
  });
});
