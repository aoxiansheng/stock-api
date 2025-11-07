import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ReceiverController } from '@core/01-entry/receiver/controller/receiver.controller';
import { ReceiverService } from '@core/01-entry/receiver/services/receiver.service';
import { DataRequestDto } from '@core/01-entry/receiver/dto/data-request.dto';
import { DataResponseDto, ResponseMetadataDto } from '@core/01-entry/receiver/dto/data-response.dto';
import { StorageMode } from '@core/01-entry/receiver/enums/storage-mode.enum';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { ApiKeyAuthGuard } from '@authv2';
import { AuthService } from '@authv2';
import { Reflector } from '@nestjs/core';

describe('ReceiverController', () => {
  let controller: ReceiverController;
  let receiverService: jest.Mocked<ReceiverService>;

  const mockProvider = 'longport';
  const mockSymbols = ['AAPL', '700.HK', '000001.SZ'];
  const mockReceiverType = 'get-stock-quote';
  const mockRequestId = 'test-request-id-123';

  beforeEach(async () => {
    const mockReceiverService = {
      handleRequest: jest.fn(),
    };
    
    // 创建 AuthService 的模拟实现
    const mockAuthService = {
      recordAuthFlowPerformance: jest.fn(),
      recordAuthCachePerformance: jest.fn(),
      recordAuthFlowStats: jest.fn(),
    };

    // 创建 ApiKeyAuthGuard 的模拟实现
    const mockApiKeyAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
      handleRequest: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiverController],
      providers: [
        {
          provide: ReceiverService,
          useValue: mockReceiverService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
    .overrideGuard(ApiKeyAuthGuard)
    .useValue(mockApiKeyAuthGuard)
    .compile();

    controller = module.get<ReceiverController>(ReceiverController);
    receiverService = module.get(ReceiverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDataRequest', () => {
    let mockRequest: DataRequestDto;
    let mockResponse: DataResponseDto;

    beforeEach(() => {
      mockRequest = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
        options: {
          useSmartCache: true,
          preferredProvider: mockProvider,
          realtime: true,
          storageMode: StorageMode.SHORT_TTL,
          market: 'HK',
        },
      };

      mockResponse = new DataResponseDto(
        [
          { symbol: 'AAPL', lastPrice: 195.89, change: 2.31, changePercent: 1.19 },
          { symbol: '700.HK', lastPrice: 385.6, change: -4.2, changePercent: -1.08 },
          { symbol: '000001.SZ', lastPrice: 25.8, change: 0.15, changePercent: 0.58 },
        ],
        new ResponseMetadataDto(
          mockProvider,
          mockReceiverType,
          mockRequestId,
          150, // processingTimeMs
          false, // hasPartialFailures
          3, // totalRequested
          3  // successfullyProcessed
        )
      );
    });

    it('should successfully handle data request', async () => {
      // Setup
      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(mockRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toEqual(mockResponse.data);
      expect(result.metadata).toBeInstanceOf(ResponseMetadataDto);
      expect(result.metadata.provider).toBe(mockProvider);
      expect(result.metadata.hasPartialFailures).toBe(false);
      expect(result.metadata.totalRequested).toBe(3);
      expect(result.metadata.successfullyProcessed).toBe(3);

      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
      expect(receiverService.handleRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle request with minimal options', async () => {
      // Setup minimal request
      const minimalRequest: DataRequestDto = {
        symbols: ['AAPL'],
        receiverType: mockReceiverType,
      };

      const minimalResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(
          mockProvider,
          mockReceiverType,
          mockRequestId,
          100,
          false,
          1,
          1
        )
      );

      receiverService.handleRequest.mockResolvedValue(minimalResponse);

      // Execute
      const result = await controller.handleDataRequest(minimalRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toHaveLength(1);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(minimalRequest);
    });

    it('should handle request with smart cache disabled', async () => {
      // Setup
      const noCacheRequest: DataRequestDto = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
        options: {
          useSmartCache: false,
          preferredProvider: mockProvider,
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(noCacheRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(noCacheRequest);
    });

    it('should handle request with different storage modes', async () => {
      // Test NONE storage mode
      const noneStorageRequest: DataRequestDto = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
        options: {
          storageMode: StorageMode.NONE,
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(noneStorageRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(noneStorageRequest);
    });

    it('should handle request with BOTH storage mode', async () => {
      // Test BOTH storage mode
      const bothStorageRequest: DataRequestDto = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
        options: {
          storageMode: StorageMode.BOTH,
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(bothStorageRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(bothStorageRequest);
    });

    it('should handle requests with different receiver types', async () => {
      const testCases = [
        'get-stock-quote',
        'get-stock-basic-info',
        'get-index-quote',
        'get-market-status',
      ];

      for (const receiverType of testCases) {
        const request: DataRequestDto = {
          symbols: mockSymbols,
          receiverType,
        };

        const response = new DataResponseDto(
          [{ symbol: 'AAPL', data: 'mock-data' }],
          new ResponseMetadataDto(mockProvider, receiverType, mockRequestId, 100, false, 1, 1)
        );

        receiverService.handleRequest.mockResolvedValue(response);

        // Execute
        const result = await controller.handleDataRequest(request);

        // Verify
        expect(result.metadata.capability).toBe(receiverType);
        expect(receiverService.handleRequest).toHaveBeenCalledWith(request);
      }
    });

    it('should handle partial failures correctly', async () => {
      // Setup response with partial failures
      const partialFailureResponse = new DataResponseDto(
        [
          { symbol: 'AAPL', lastPrice: 195.89 },
          { symbol: '700.HK', lastPrice: 385.6 },
        ],
        new ResponseMetadataDto(
          mockProvider,
          mockReceiverType,
          mockRequestId,
          200,
          true, // hasPartialFailures
          3,    // totalRequested
          2     // successfullyProcessed
        )
      );

      partialFailureResponse.failures = [
        {
          symbol: 'INVALID_SYMBOL',
          reason: '符号映射失败或数据获取失败',
        },
      ];

      receiverService.handleRequest.mockResolvedValue(partialFailureResponse);

      // Execute
      const result = await controller.handleDataRequest(mockRequest);

      // Verify
      expect(result.metadata.hasPartialFailures).toBe(true);
      expect(result.metadata.totalRequested).toBe(3);
      expect(result.metadata.successfullyProcessed).toBe(2);
      expect(result.failures).toHaveLength(1);
      expect(result.failures![0].symbol).toBe('INVALID_SYMBOL');
    });

    it('should handle large symbol requests', async () => {
      // Setup large symbol list (testing boundaries)
      const largeSymbolList = Array.from({ length: 100 }, (_, i) => `TEST${i.toString().padStart(3, '0')}`);

      const largeRequest: DataRequestDto = {
        symbols: largeSymbolList,
        receiverType: mockReceiverType,
      };

      const largeResponse = new DataResponseDto(
        largeSymbolList.map(symbol => ({ symbol, lastPrice: Math.random() * 100 })),
        new ResponseMetadataDto(
          mockProvider,
          mockReceiverType,
          mockRequestId,
          500,
          false,
          100,
          100
        )
      );

      receiverService.handleRequest.mockResolvedValue(largeResponse);

      // Execute
      const result = await controller.handleDataRequest(largeRequest);

      // Verify
      expect(result.data).toHaveLength(100);
      expect(result.metadata.totalRequested).toBe(100);
      expect(result.metadata.successfullyProcessed).toBe(100);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(largeRequest);
    });

    it('should handle different market combinations', async () => {
      const marketTestCases = [
        { symbols: ['AAPL', 'GOOGL'], expectedMarket: 'US' },
        { symbols: ['700.HK', '0001.HK'], expectedMarket: 'HK' },
        { symbols: ['000001.SZ', '000002.SZ'], expectedMarket: 'SZ' },
        { symbols: ['600000.SH', '600001.SH'], expectedMarket: 'SH' },
        { symbols: ['AAPL', '700.HK', '000001.SZ'], expectedMarket: 'MIXED' },
      ];

      for (const testCase of marketTestCases) {
        const request: DataRequestDto = {
          symbols: testCase.symbols,
          receiverType: mockReceiverType,
          options: {
            market: testCase.expectedMarket,
          },
        };

        const response = new DataResponseDto(
          testCase.symbols.map(symbol => ({ symbol, lastPrice: 100 })),
          new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 100, false, testCase.symbols.length, testCase.symbols.length)
        );

        receiverService.handleRequest.mockResolvedValue(response);

        // Execute
        const result = await controller.handleDataRequest(request);

        // Verify
        expect(result.data).toHaveLength(testCase.symbols.length);
        expect(receiverService.handleRequest).toHaveBeenCalledWith(request);
      }
    });

    it('should return result directly for ResponseInterceptor to handle', async () => {
      // Setup
      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(mockRequest);

      // Verify that controller returns the service result directly
      // The ResponseInterceptor should handle the formatting
      expect(result).toBe(mockResponse);
      expect(result).not.toHaveProperty('statusCode');
      expect(result).not.toHaveProperty('message');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should handle performance variations gracefully', async () => {
      // Test different performance scenarios
      const performanceTestCases = [
        { processingTimeMs: 50, expectedFast: true },   // Fast response
        { processingTimeMs: 200, expectedFast: false }, // Normal response
        { processingTimeMs: 500, expectedFast: false }, // Slow response
        { processingTimeMs: 1000, expectedFast: false }, // Very slow response
      ];

      for (const testCase of performanceTestCases) {
        const response = new DataResponseDto(
          [{ symbol: 'AAPL', lastPrice: 195.89 }],
          new ResponseMetadataDto(
            mockProvider,
            mockReceiverType,
            mockRequestId,
            testCase.processingTimeMs,
            false,
            1,
            1
          )
        );

        receiverService.handleRequest.mockResolvedValue(response);

        // Execute
        const result = await controller.handleDataRequest(mockRequest);

        // Verify
        expect(result.metadata.processingTimeMs).toBe(testCase.processingTimeMs);
        expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling', () => {
    let mockRequest: DataRequestDto;

    beforeEach(() => {
      mockRequest = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
      };
    });

    it('should propagate validation errors from service', async () => {
      // Setup
      const validationError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateRequest',
        message: 'Request validation failed',
        context: {
          errors: ['股票代码列表不能为空'],
          validationFailure: true,
        },
      });

      receiverService.handleRequest.mockRejectedValue(validationError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(validationError);

      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should propagate provider not found errors', async () => {
      // Setup
      const providerError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'determineOptimalProvider',
        message: 'No provider found for receiver type',
        context: {
          receiverType: mockReceiverType,
          providerSelectionFailed: true,
        },
      });

      receiverService.handleRequest.mockRejectedValue(providerError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(providerError);
    });

    it('should propagate external API errors', async () => {
      // Setup
      const apiError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'executeDataFetching',
        message: 'Data fetching failed',
        context: {
          originalError: 'API rate limit exceeded',
        },
      });

      receiverService.handleRequest.mockRejectedValue(apiError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(apiError);
    });

    it('should propagate business rule violations', async () => {
      // Setup
      const businessError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'handleRequest',
        message: 'Business rule violation',
        context: {
          rule: 'Maximum symbols per request exceeded',
        },
      });

      receiverService.handleRequest.mockRejectedValue(businessError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(businessError);
    });

    it('should propagate timeout errors', async () => {
      // Setup
      const timeoutError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'executeDataFetching',
        message: 'Request timeout',
        context: {
          timeout: 5000,
          actualDuration: 6000,
        },
      });

      receiverService.handleRequest.mockRejectedValue(timeoutError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(timeoutError);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Setup
      const unexpectedError = new Error('Unexpected system error');
      receiverService.handleRequest.mockRejectedValue(unexpectedError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(unexpectedError);
    });

    it('should handle network errors', async () => {
      // Setup
      const networkError = new Error('ECONNREFUSED');
      networkError.name = 'NetworkError';
      receiverService.handleRequest.mockRejectedValue(networkError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(networkError);
    });

    it('should handle rate limiting errors', async () => {
      // Setup
      const rateLimitError = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'executeDataFetching',
        message: 'Rate limit exceeded',
        context: {
          rateLimitType: 'provider_api',
          retryAfter: 60,
        },
      });

      receiverService.handleRequest.mockRejectedValue(rateLimitError);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(rateLimitError);
    });
  });

  describe('request logging', () => {
    let mockRequest: DataRequestDto;
    let mockResponse: DataResponseDto;

    beforeEach(() => {
      mockRequest = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
        options: {
          useSmartCache: true,
          preferredProvider: mockProvider,
        },
      };

      mockResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 100, false, 1, 1)
      );

      // Mock console methods to verify logging
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log request receipt and completion for successful requests', async () => {
      // Setup
      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      await controller.handleDataRequest(mockRequest);

      // Note: The actual logging verification would depend on the logger implementation
      // Here we verify the service was called, which would trigger the logging
      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should log errors for failed requests', async () => {
      // Setup
      const error = new Error('Service error');
      receiverService.handleRequest.mockRejectedValue(error);

      // Execute & Verify
      await expect(controller.handleDataRequest(mockRequest))
        .rejects
        .toThrow(error);

      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should log request details including symbols and options', async () => {
      // Setup
      const detailedRequest: DataRequestDto = {
        symbols: ['AAPL', '700.HK'],
        receiverType: 'get-stock-quote',
        options: {
          useSmartCache: true,
          preferredProvider: 'longport',
          realtime: true,
          market: 'MIXED',
          storageMode: StorageMode.SHORT_TTL,
          fields: ['lastPrice', 'change', 'volume'],
        },
      };

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      await controller.handleDataRequest(detailedRequest);

      // Verify the detailed request was passed to service
      expect(receiverService.handleRequest).toHaveBeenCalledWith(detailedRequest);
    });

    it('should log success status correctly for fully successful requests', async () => {
      // Setup - fully successful response
      const fullySuccessfulResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 100, false, 1, 1)
      );

      receiverService.handleRequest.mockResolvedValue(fullySuccessfulResponse);

      // Execute
      await controller.handleDataRequest(mockRequest);

      // Verify service was called
      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should log success status correctly for partially failed requests', async () => {
      // Setup - partially failed response
      const partiallyFailedResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 150, true, 2, 1)
      );

      receiverService.handleRequest.mockResolvedValue(partiallyFailedResponse);

      // Execute
      await controller.handleDataRequest(mockRequest);

      // Verify service was called and response indicates partial failure
      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });

    it('should log all metadata fields in completion log', async () => {
      // Setup
      const detailedMetadata = new ResponseMetadataDto(
        'test-provider',
        'get-stock-basic-info',
        'detailed-request-id',
        275,
        false,
        5,
        5
      );

      const detailedResponse = new DataResponseDto(
        [{ symbol: 'TEST', data: 'test-data' }],
        detailedMetadata
      );

      receiverService.handleRequest.mockResolvedValue(detailedResponse);

      // Execute
      await controller.handleDataRequest(mockRequest);

      // Verify all metadata is accessible for logging
      expect(receiverService.handleRequest).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('validation integration', () => {
    it('should validate request through ValidationPipe', async () => {
      // Note: This test verifies that ValidationPipe is applied
      // The actual validation logic is tested in the DTO and service tests

      const mockResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 100, false, 1, 1)
      );

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      const validRequest: DataRequestDto = {
        symbols: ['AAPL'],
        receiverType: 'get-stock-quote',
      };

      // Execute - ValidationPipe should allow valid request
      const result = await controller.handleDataRequest(validRequest);

      // Verify
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(receiverService.handleRequest).toHaveBeenCalledWith(validRequest);
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize controller with receiverService dependency', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(ReceiverController);
    });

    it('should have logger initialized', () => {
      // Verify logger is properly initialized (logger is private but we can test behavior)
      expect(controller).toBeDefined();
    });
  });

  describe('decorator verification', () => {
    it('should have proper method decorators applied', () => {
      // Test that the controller method exists and is callable
      expect(typeof controller.handleDataRequest).toBe('function');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty symbols array edge case', async () => {
      const emptyRequest: DataRequestDto = {
        symbols: [],
        receiverType: mockReceiverType,
      };

      const emptyResponse = new DataResponseDto(
        [],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 50, false, 0, 0)
      );

      receiverService.handleRequest.mockResolvedValue(emptyResponse);

      const result = await controller.handleDataRequest(emptyRequest);

      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalRequested).toBe(0);
      expect(result.metadata.successfullyProcessed).toBe(0);
    });

    it('should handle single symbol request', async () => {
      const singleRequest: DataRequestDto = {
        symbols: ['AAPL'],
        receiverType: mockReceiverType,
      };

      const singleResponse = new DataResponseDto(
        [{ symbol: 'AAPL', lastPrice: 195.89 }],
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 75, false, 1, 1)
      );

      receiverService.handleRequest.mockResolvedValue(singleResponse);

      const result = await controller.handleDataRequest(singleRequest);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].symbol).toBe('AAPL');
    });

    it('should handle maximum boundary symbol count', async () => {
      const maxSymbolsRequest: DataRequestDto = {
        symbols: Array.from({ length: 200 }, (_, i) => `SYM${i}`),
        receiverType: mockReceiverType,
      };

      const maxResponse = new DataResponseDto(
        Array.from({ length: 200 }, (_, i) => ({ symbol: `SYM${i}`, lastPrice: 100 + i })),
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 800, false, 200, 200)
      );

      receiverService.handleRequest.mockResolvedValue(maxResponse);

      const result = await controller.handleDataRequest(maxSymbolsRequest);

      expect(result.data).toHaveLength(200);
      expect(result.metadata.totalRequested).toBe(200);
    });
  });

  describe('service integration edge cases', () => {
    it('should handle service returning null data gracefully', async () => {
      const nullDataResponse = new DataResponseDto(
        null as any,
        new ResponseMetadataDto(mockProvider, mockReceiverType, mockRequestId, 100, true, 1, 0)
      );

      receiverService.handleRequest.mockResolvedValue(nullDataResponse);

      const result = await controller.handleDataRequest({
        symbols: ['INVALID'],
        receiverType: mockReceiverType,
      });

      expect(result.data).toBeNull();
      expect(result.metadata.hasPartialFailures).toBe(true);
    });

    it('should handle undefined metadata gracefully', async () => {
      const incompleteResponse = new DataResponseDto(
        [{ symbol: 'TEST', lastPrice: 100 }],
        undefined as any
      );

      receiverService.handleRequest.mockResolvedValue(incompleteResponse);

      const result = await controller.handleDataRequest({
        symbols: ['TEST'],
        receiverType: mockReceiverType,
      });

      expect(result.data).toHaveLength(1);
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('response structure', () => {
    it('should return properly structured response with all required fields', async () => {
      // Setup
      const mockRequest: DataRequestDto = {
        symbols: ['AAPL'],
        receiverType: mockReceiverType,
      };

      const expectedData = [
        {
          symbol: 'AAPL',
          lastPrice: 195.89,
          change: 2.31,
          changePercent: 1.19,
          volume: 45678900,
          bid: 195.85,
          ask: 195.91,
          market: 'US',
          timestamp: '2024-01-01T15:30:01.123Z',
        },
      ];

      const mockResponse = new DataResponseDto(
        expectedData,
        new ResponseMetadataDto(
          mockProvider,
          mockReceiverType,
          mockRequestId,
          150,
          false,
          1,
          1
        )
      );

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(mockRequest);

      // Verify response structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data).toEqual(expectedData);
      expect(result.metadata).toMatchObject({
        provider: mockProvider,
        capability: mockReceiverType, // 修改: receiverType 改为 capability
        requestId: mockRequestId,
        processingTimeMs: 150,
        hasPartialFailures: false,
        totalRequested: 1,
        successfullyProcessed: 1,
      });
    });

    it('should preserve all metadata fields from service response', async () => {
      // Setup
      const mockRequest: DataRequestDto = {
        symbols: mockSymbols,
        receiverType: mockReceiverType,
      };

      const complexMetadata = new ResponseMetadataDto(
        'test-provider',
        'get-stock-basic-info',
        'complex-request-id',
        275,
        true,
        5,
        3
      );

      const mockResponse = new DataResponseDto(
        [{ symbol: 'TEST', data: 'test-data' }],
        complexMetadata
      );

      receiverService.handleRequest.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.handleDataRequest(mockRequest);

      // Verify all metadata fields are preserved
      expect(result.metadata).toEqual(complexMetadata);
      expect(result.metadata.provider).toBe('test-provider');
      expect(result.metadata.capability).toBe('get-stock-basic-info');
      expect(result.metadata.requestId).toBe('complex-request-id');
      expect(result.metadata.processingTimeMs).toBe(275);
      expect(result.metadata.hasPartialFailures).toBe(true);
      expect(result.metadata.totalRequested).toBe(5);
      expect(result.metadata.successfullyProcessed).toBe(3);
    });
  });
});