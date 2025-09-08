import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { ReceiverController } from "../../../../../../../src/core/01-entry/receiver/controller/receiver.controller";
import { ReceiverService } from "../../../../../../../src/core/01-entry/receiver/services/receiver.service";
import { DataRequestDto } from "../../../../../../../src/core/01-entry/receiver/dto/data-request.dto";
import { DataResponseDto } from "../../../../../../../src/core/01-entry/receiver/dto/data-response.dto";
import { RateLimitService } from "../../../../../../../src/auth/services/rate-limit.service";
import { PermissionService } from "../../../../../../../src/auth/services/permission.service";
import { UnifiedPermissionsGuard } from "../../../../../../../src/auth/guards/unified-permissions.guard";
import { getModelToken } from "@nestjs/mongoose";
import { InjectRedis } from "@nestjs-modules/ioredis";

// Mock createLogger for core modules - use var for hoisting compatibility
let mockLoggerInstance: any;

jest.mock("@app/config/logger.config", () => {
  mockLoggerInstance = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mockLoggerInstance),
    sanitizeLogData: jest.fn((data) => data),
  };
});

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
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
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
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      processingTime: 156,
      timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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
          provide: "default_IORedisModuleConnectionToken",
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
        symbols: ["AAPL", REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          realtime: true,
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockDataResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(mockDataResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["AAPL", REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          realtime: true,
        },
      });
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("数据请求处理完成", {
        requestId: "req_1704110400000_abc123",
        success: true,
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        processingTime: 156,
      });
    });

    it("should handle data request with minimal options", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL"],
        receiverType: "get-stock-basic-info",
      };

      const simpleResponse: DataResponseDto = {
        data: [
          {
            symbol: "AAPL",
            companyName: "Microsoft Corporation",
            market: "US",
          },
        ],
        metadata: {
          requestId: "req_1704110400001_def456",
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability: "get-stock-basic-info",
          processingTime: 89,
          timestamp: "2024-01-01T12:01:00.000Z",
        },
      };

      receiverService.handleRequest.mockResolvedValue(simpleResponse);

      const result = await controller.handleDataRequest(dataRequest);

      expect(result).toBe(simpleResponse);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(dataRequest);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["AAPL"],
        receiverType: "get-stock-basic-info",
        options: undefined,
      });
    });

    it("should handle multiple symbols of different markets", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL", REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "000001.SZ", "600036.SH"],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
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
            symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
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
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        processingTime: 234,
      });
    });

    it("should handle index quote requests", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["HSI.HK", "SPX.US"],
        receiverType: "get-index-quote",
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
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
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
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
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        },
      );
    });

    it("should handle network timeout errors", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL"],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        },
      };

      const timeoutError = new Error("Request timeout");
      (timeoutError as any).name = "TimeoutError";
      receiverService.handleRequest.mockRejectedValue(timeoutError);

      await expect(controller.handleDataRequest(dataRequest)).rejects.toThrow(
        "Request timeout",
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "数据请求处理失败",
        expect.objectContaining({
          error: "Request timeout",
          symbols: ["AAPL"],
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        }),
      );
    });

    it("should handle service unavailable errors", async () => {
      const dataRequest: DataRequestDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        receiverType: "get-stock-basic-info",
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
          symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
          receiverType: "get-stock-basic-info",
        }),
      );
    });

    it("should handle large symbol lists", async () => {
      const manySymbols = Array.from({ length: 50 }, (_, i) => `STOCK${i}`);
      const dataRequest: DataRequestDto = {
        symbols: manySymbols,
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
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
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: {
          preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          fields: ["lastPrice", "market"],
        },
      });
    });

    it("should handle partial success responses", async () => {
      const dataRequest: DataRequestDto = {
        symbols: ["AAPL", "INVALID", "MSFT"],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        processingTime: 298,
        totalRequested: 3,
        successfullyProcessed: 2,
        hasPartialFailures: true,
      });
    });

    it("should handle requests with different data types", async () => {
      const stockQuoteRequest: DataRequestDto = {
        symbols: ["AAPL"],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      };

      const basicInfoRequest: DataRequestDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        receiverType: "get-stock-basic-info",
      };

      const indexQuoteRequest: DataRequestDto = {
        symbols: ["HSI.HK"],
        receiverType: "get-index-quote",
      };

      receiverService.handleRequest.mockImplementation((request) => {
        // 映射 receiverType 到正确的 capability 名称
        const dataTypeToCapabilityMap: Record<string, string> = {
          API_OPERATIONS.STOCK_DATA.GET_QUOTE: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          "get-stock-basic-info": "get-stock-basic-info",
          "get-index-quote": "get-index-quote",
        };

        return Promise.resolve({
          success: true,
          data: [
            { symbol: request.symbols[0], receiverType: request.receiverType },
          ],
          metadata: {
            requestId: `req_${Date.now()}`,
            provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            capability:
              dataTypeToCapabilityMap[request.receiverType] ||
              request.receiverType,
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
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE as const,
          options: { preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
        },
        {
          symbols: ["MSFT"],
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE as const,
          options: { preferredProvider: "futu", realtime: true },
        },
        {
          symbols: ["GOOGL"],
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE as const,
          options: { market: "US", realtime: false },
        },
        {
          symbols: ["TSLA"],
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE as const,
          options: { fields: ["lastPrice", "volume"], realtime: true },
        },
      ];

      receiverService.handleRequest.mockImplementation(() =>
        Promise.resolve({
          success: true,
          data: [],
          metadata: {
            requestId: "test",
            provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: { preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
      };

      receiverService.handleRequest.mockResolvedValue(mockDataResponse);

      await controller.handleDataRequest(dataRequest);

      // Verify request logging
      expect(mockLoggerInstance.log).toHaveBeenCalledWith("接收数据请求", {
        symbols: ["TEST"],
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        options: { preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT },
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
        receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
          receiverType: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        },
      );
    });
  });
});
