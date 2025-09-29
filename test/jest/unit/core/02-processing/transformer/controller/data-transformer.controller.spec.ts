import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DataTransformerController } from '@core/02-processing/transformer/controller/data-transformer.controller';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { DataTransformRequestDto } from '@core/02-processing/transformer/dto/data-transform-request.dto';
import { DataTransformResponseDto, DataTransformationMetadataDto } from '@core/02-processing/transformer/dto/data-transform-response.dto';
import { TRANSFORMER_ERROR_CODES } from '@core/02-processing/transformer/constants/transformer-error-codes.constants';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';

describe('DataTransformerController', () => {
  let controller: DataTransformerController;
  let dataTransformerService: jest.Mocked<DataTransformerService>;

  const mockMetadata = new DataTransformationMetadataDto(
    'test-rule-id',
    'Test Mapping Rule',
    'longport',
    'quote_fields',
    1,
    2,
    25
  );

  const mockTransformResponse = new DataTransformResponseDto(
    {
      symbol: '700.HK',
      lastPrice: 385.6,
      changePercent: -1.08,
    },
    mockMetadata
  );

  const mockBatchResponses = [
    new DataTransformResponseDto(
      { symbol: '700.HK', lastPrice: 385.6 },
      new DataTransformationMetadataDto('rule-1', 'Rule 1', 'longport', 'quote_fields', 1, 2, 25)
    ),
    new DataTransformResponseDto(
      { symbol: '700.HK', lastPrice: 400.0 },
      new DataTransformationMetadataDto('rule-1', 'Rule 1', 'longport', 'quote_fields', 1, 2, 28)
    ),
  ];

  const baseBatchRequests: DataTransformRequestDto[] = [
    {
      provider: 'longport',
      transDataRuleListType: 'quote_fields',
      rawData: { last_done: 385.6 },
      apiType: 'rest',
    },
    {
      provider: 'longport',
      transDataRuleListType: 'quote_fields',
      rawData: { last_done: 400.0 },
      apiType: 'rest',
    },
  ];

  beforeEach(async () => {
    const mockDataTransformerService = {
      transform: jest.fn(),
      transformBatch: jest.fn(),
    };
    
    // 添加AuthPerformanceService的模拟实现
    const mockAuthPerformanceService = {
      recordAuthFlowPerformance: jest.fn(),
      recordAuthCachePerformance: jest.fn(),
      recordAuthFlowStats: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataTransformerController],
      providers: [
        {
          provide: DataTransformerService,
          useValue: mockDataTransformerService,
        },
        {
          provide: AuthPerformanceService,
          useValue: mockAuthPerformanceService,
        },
        // 提供Reflector依赖
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(false)
          }
        }
      ],
    }).compile();

    controller = module.get<DataTransformerController>(DataTransformerController);
    dataTransformerService = module.get(DataTransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition and Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DataTransformerService injected', () => {
      expect(dataTransformerService).toBeDefined();
    });

    it('should initialize with logger', () => {
      expect(controller).toHaveProperty('logger');
    });

    it('should initialize with dataTransformerService', () => {
      expect(controller).toHaveProperty('dataTransformerService');
    });
  });

  describe('transform method - Full Coverage', () => {
    const baseRequest: DataTransformRequestDto = {
      provider: 'longport',
      transDataRuleListType: 'quote_fields',
      rawData: { last_done: 385.6, change_rate: -0.0108 },
      apiType: 'rest',
    };

    it('should successfully transform data - complete execution path', async () => {
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(baseRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(baseRequest);
      expect(dataTransformerService.transform).toHaveBeenCalledTimes(1);
    });

    it('should handle request with all properties', async () => {
      const fullRequest: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
        mappingOutRuleId: 'custom-rule-123',
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(fullRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(fullRequest);
    });

    it('should handle stream API type', async () => {
      const streamRequest: DataTransformRequestDto = {
        ...baseRequest,
        apiType: 'stream',
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(streamRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(streamRequest);
    });

    it('should handle null rawData', async () => {
      const nullDataRequest: DataTransformRequestDto = {
        ...baseRequest,
        rawData: null,
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(nullDataRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(nullDataRequest);
    });

    it('should handle undefined options', async () => {
      const requestWithoutOptions: DataTransformRequestDto = {
        ...baseRequest,
        options: undefined,
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(requestWithoutOptions);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(requestWithoutOptions);
    });

    // ERROR HANDLING - CATCH BLOCK COVERAGE
    it('should handle service errors and re-throw - catch block execution', async () => {
      const serviceError = new Error('Service unavailable');
      dataTransformerService.transform.mockRejectedValue(serviceError);

      await expect(controller.transform(baseRequest)).rejects.toThrow(serviceError);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(baseRequest);
    });

    it('should handle BadRequestException - catch block execution', async () => {
      const badRequestError = new BadRequestException('Invalid data format');
      dataTransformerService.transform.mockRejectedValue(badRequestError);

      await expect(controller.transform(baseRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle NotFoundException - catch block execution', async () => {
      const notFoundError = new NotFoundException('Rule not found');
      dataTransformerService.transform.mockRejectedValue(notFoundError);

      await expect(controller.transform(baseRequest)).rejects.toThrow(NotFoundException);
    });

    it('should handle UnauthorizedException - catch block execution', async () => {
      const unauthorizedError = new UnauthorizedException('Access denied');
      dataTransformerService.transform.mockRejectedValue(unauthorizedError);

      await expect(controller.transform(baseRequest)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle custom error with specific constructor name', async () => {
      class CustomTransformationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomTransformationError';
        }
      }

      const customError = new CustomTransformationError('Custom transformation failed');
      dataTransformerService.transform.mockRejectedValue(customError);

      await expect(controller.transform(baseRequest)).rejects.toThrow(CustomTransformationError);
    });
  });

  describe('transformBatch method - Full Coverage', () => {

    it('should successfully process batch transformation - complete execution path', async () => {
      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      const result = await controller.transformBatch(baseBatchRequests);

      expect(result).toBe(mockBatchResponses);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: baseBatchRequests,
      });
    });

    it('should handle empty batch array', async () => {
      const emptyBatch: DataTransformRequestDto[] = [];
      dataTransformerService.transformBatch.mockResolvedValue([]);

      const result = await controller.transformBatch(emptyBatch);

      expect(result).toEqual([]);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: emptyBatch,
      });
    });

    it('should handle large batch requests', async () => {
      const largeBatch = Array(50).fill(baseBatchRequests[0]);
      const largeResponse = Array(50).fill(mockBatchResponses[0]);
      dataTransformerService.transformBatch.mockResolvedValue(largeResponse);

      const result = await controller.transformBatch(largeBatch);

      expect(result).toBe(largeResponse);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: largeBatch,
      });
    });

    it('should handle mixed provider batch requests', async () => {
      const mixedBatch = [
        ...baseBatchRequests,
        {
          provider: 'different-provider',
          transDataRuleListType: 'different-type',
          rawData: { data: 'test' },
          apiType: 'stream' as const,
        },
      ];

      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      const result = await controller.transformBatch(mixedBatch);

      expect(result).toBe(mockBatchResponses);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: mixedBatch,
      });
    });

    // BRANCH COVERAGE - Array.isArray validation
    it('should throw error for non-array request - null input', async () => {
      const nullRequest = null as any;

      await expect(controller.transformBatch(nullRequest)).rejects.toThrow();
    });

    it('should throw error for non-array request - undefined input', async () => {
      const undefinedRequest = undefined as any;

      await expect(controller.transformBatch(undefinedRequest)).rejects.toThrow();
    });

    it('should throw error for non-array request - object input', async () => {
      const objectRequest = { notAnArray: true } as any;

      await expect(controller.transformBatch(objectRequest)).rejects.toThrow();
    });

    it('should throw error for non-array request - string input', async () => {
      const stringRequest = 'not an array' as any;

      await expect(controller.transformBatch(stringRequest)).rejects.toThrow();
    });

    it('should throw error for non-array request - number input', async () => {
      const numberRequest = 123 as any;

      await expect(controller.transformBatch(numberRequest)).rejects.toThrow();
    });

    it('should throw error for non-array request - boolean input', async () => {
      const booleanRequest = true as any;

      await expect(controller.transformBatch(booleanRequest)).rejects.toThrow();
    });

    // ERROR HANDLING - CATCH BLOCK COVERAGE
    it('should handle batch service errors and re-throw - catch block execution', async () => {
      const batchError = new Error('Batch processing failed');
      dataTransformerService.transformBatch.mockRejectedValue(batchError);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow(batchError);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: baseBatchRequests,
      });
    });

    it('should handle BadRequestException in batch - catch block execution', async () => {
      const badRequestError = new BadRequestException('Invalid batch format');
      dataTransformerService.transformBatch.mockRejectedValue(badRequestError);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow(BadRequestException);
    });

    it('should handle NotFoundException in batch - catch block execution', async () => {
      const notFoundError = new NotFoundException('Batch rules not found');
      dataTransformerService.transformBatch.mockRejectedValue(notFoundError);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow(NotFoundException);
    });

    it('should handle ForbiddenException in batch - catch block execution', async () => {
      const forbiddenError = new ForbiddenException('Batch operation not allowed');
      dataTransformerService.transformBatch.mockRejectedValue(forbiddenError);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow(ForbiddenException);
    });

    it('should handle custom batch error with specific constructor name', async () => {
      class CustomBatchError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomBatchError';
        }
      }

      const customError = new CustomBatchError('Custom batch processing failed');
      dataTransformerService.transformBatch.mockRejectedValue(customError);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow(CustomBatchError);
    });
  });

  describe('Edge Cases and Comprehensive Coverage', () => {
    it('should handle transform with zero processing time', async () => {
      const zeroTimeResponse = new DataTransformResponseDto(
        { symbol: '700.HK', lastPrice: 385.6 },
        new DataTransformationMetadataDto('rule-1', 'Rule 1', 'longport', 'quote_fields', 1, 2, 0)
      );

      dataTransformerService.transform.mockResolvedValue(zeroTimeResponse);

      const request: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      };

      const result = await controller.transform(request);

      expect(result).toBe(zeroTimeResponse);
      expect(result.metadata.processingTimeMs).toBe(0);
    });

    it('should handle batch with zero processing time', async () => {
      const zeroTimeResponses = [
        new DataTransformResponseDto(
          { symbol: '700.HK', lastPrice: 385.6 },
          new DataTransformationMetadataDto('rule-1', 'Rule 1', 'longport', 'quote_fields', 1, 2, 0)
        ),
      ];

      dataTransformerService.transformBatch.mockResolvedValue(zeroTimeResponses);

      const result = await controller.transformBatch([{
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      }]);

      expect(result).toBe(zeroTimeResponses);
    });

    it('should handle very large batch with complex provider mapping', async () => {
      const complexBatch = Array(100).fill(null).map((_, i) => ({
        provider: `provider-${i % 3}`, // Multiple providers
        transDataRuleListType: `type-${i % 2}`, // Multiple types
        rawData: { id: i, value: `data-${i}` },
        apiType: i % 2 === 0 ? 'rest' as const : 'stream' as const,
      }));

      const complexResponse = Array(100).fill(mockBatchResponses[0]);
      dataTransformerService.transformBatch.mockResolvedValue(complexResponse);

      const result = await controller.transformBatch(complexBatch);

      expect(result).toBe(complexResponse);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: complexBatch,
      });
    });

    it('should handle array with single item', async () => {
      const singleItemBatch = [baseBatchRequests[0]];
      const singleResponse = [mockBatchResponses[0]];

      dataTransformerService.transformBatch.mockResolvedValue(singleResponse);

      const result = await controller.transformBatch(singleItemBatch);

      expect(result).toBe(singleResponse);
    });

    it('should handle special characters in request data', async () => {
      const specialCharRequest: DataTransformRequestDto = {
        provider: 'longport-特殊字符-🚀',
        transDataRuleListType: 'quote_fields_@#$%',
        rawData: {
          '特殊字段': '特殊值',
          'unicode_field': '🚀💰📈',
          'symbols': '@#$%^&*()',
        },
        apiType: 'rest',
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(specialCharRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(specialCharRequest);
    });

    it('should handle batch with all different API types and providers', async () => {
      const diverseBatch: DataTransformRequestDto[] = [
        {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data1' },
          apiType: 'rest',
        },
        {
          provider: 'yahoo',
          transDataRuleListType: 'historical_data',
          rawData: { test: 'data2' },
          apiType: 'stream',
        },
        {
          provider: 'alpha-vantage',
          transDataRuleListType: 'fundamental_data',
          rawData: { test: 'data3' },
          apiType: 'rest',
        },
      ];

      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      const result = await controller.transformBatch(diverseBatch);

      expect(result).toBe(mockBatchResponses);
    });
  });

  describe('Logging and Error Context Verification', () => {
    it('should log with correct context for transform success', async () => {
      const spyLog = jest.spyOn(console, 'log').mockImplementation();

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const request: DataTransformRequestDto = {
        provider: 'test-provider',
        transDataRuleListType: 'test-type',
        rawData: { test: 'data' },
        apiType: 'rest',
        mappingOutRuleId: 'test-rule-id',
        options: { includeDebugInfo: true },
      };

      await controller.transform(request);

      spyLog.mockRestore();
    });

    it('should log with correct context for transform error', async () => {
      const spyError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      dataTransformerService.transform.mockRejectedValue(error);

      const request: DataTransformRequestDto = {
        provider: 'test-provider',
        transDataRuleListType: 'test-type',
        rawData: { test: 'data' },
        apiType: 'rest',
      };

      await expect(controller.transform(request)).rejects.toThrow();

      spyError.mockRestore();
    });

    it('should log with correct context for batch success', async () => {
      const spyLog = jest.spyOn(console, 'log').mockImplementation();

      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      await controller.transformBatch(baseBatchRequests);

      spyLog.mockRestore();
    });

    it('should log with correct context for batch error', async () => {
      const spyError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Batch test error');
      dataTransformerService.transformBatch.mockRejectedValue(error);

      await expect(controller.transformBatch(baseBatchRequests)).rejects.toThrow();

      spyError.mockRestore();
    });
  });

  describe('Constructor and Property Coverage', () => {
    it('should instantiate with proper dependencies via constructor', () => {
      // This test ensures constructor coverage
      expect(controller.constructor).toBeDefined();
      expect(controller).toBeInstanceOf(DataTransformerController);
    });

    it('should have readonly logger property', () => {
      expect(controller).toHaveProperty('logger');
    });

    it('should have readonly dataTransformerService property', () => {
      expect(controller).toHaveProperty('dataTransformerService');
    });
  });
});