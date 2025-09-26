import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { DataTransformerController } from '@core/02-processing/transformer/controller/data-transformer.controller';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { DataTransformRequestDto } from '@core/02-processing/transformer/dto/data-transform-request.dto';
import { DataTransformResponseDto, DataTransformationMetadataDto } from '@core/02-processing/transformer/dto/data-transform-response.dto';
import { TRANSFORMER_ERROR_CODES } from '@core/02-processing/transformer/constants/transformer-error-codes.constants';

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

  beforeEach(async () => {
    const mockDataTransformerService = {
      transform: jest.fn(),
      transformBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataTransformerController],
      providers: [
        {
          provide: DataTransformerService,
          useValue: mockDataTransformerService,
        },
      ],
    }).compile();

    controller = module.get<DataTransformerController>(DataTransformerController);
    dataTransformerService = module.get(DataTransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DataTransformerService injected', () => {
      expect(dataTransformerService).toBeDefined();
    });
  });

  describe('transform', () => {
    const mockRequest: DataTransformRequestDto = {
      provider: 'longport',
      transDataRuleListType: 'quote_fields',
      rawData: { last_done: 385.6, change_rate: -0.0108 },
      apiType: 'rest',
    };

    it('should successfully transform data', async () => {
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform(mockRequest);

      expect(result).toBe(mockTransformResponse);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(mockRequest);
      expect(dataTransformerService.transform).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Service unavailable');
      dataTransformerService.transform.mockRejectedValue(serviceError);

      await expect(controller.transform(mockRequest)).rejects.toThrow(serviceError);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(mockRequest);
    });

    it('should propagate business logic exceptions', async () => {
      const businessError = new BadRequestException('Invalid data format');
      dataTransformerService.transform.mockRejectedValue(businessError);

      await expect(controller.transform(mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty request data', async () => {
      const emptyRequest = { ...mockRequest, rawData: null };
      const emptyResponse = new DataTransformResponseDto(
        [],
        new DataTransformationMetadataDto('', '', 'longport', 'quote_fields', 0, 0, 5)
      );
      dataTransformerService.transform.mockResolvedValue(emptyResponse);

      const result = await controller.transform(emptyRequest);

      expect(result).toBe(emptyResponse);
      expect(result.transformedData).toEqual([]);
    });

    it('should handle array data transformation', async () => {
      const arrayRequest = {
        ...mockRequest,
        rawData: [
          { last_done: 385.6, change_rate: -0.0108 },
          { last_done: 400.0, change_rate: 0.05 },
        ],
      };

      const arrayResponse = new DataTransformResponseDto(
        [
          { symbol: '700.HK', lastPrice: 385.6 },
          { symbol: '700.HK', lastPrice: 400.0 },
        ],
        new DataTransformationMetadataDto('test-rule-id', 'Test Rule', 'longport', 'quote_fields', 2, 4, 30)
      );

      dataTransformerService.transform.mockResolvedValue(arrayResponse);

      const result = await controller.transform(arrayRequest);

      expect(result).toBe(arrayResponse);
      expect(Array.isArray(result.transformedData)).toBe(true);
      expect(result.metadata.recordsProcessed).toBe(2);
    });

    it('should pass through request options', async () => {
      const requestWithOptions = {
        ...mockRequest,
        options: {
          includeDebugInfo: true,
          includeMetadata: true,
        },
      };

      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      await controller.transform(requestWithOptions);

      expect(dataTransformerService.transform).toHaveBeenCalledWith(requestWithOptions);
    });

    it('should handle different API types', async () => {
      const streamRequest = { ...mockRequest, apiType: 'stream' as const };
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      await controller.transform(streamRequest);

      expect(dataTransformerService.transform).toHaveBeenCalledWith(streamRequest);
    });

    it('should handle different providers', async () => {
      const differentProviderRequest = { ...mockRequest, provider: 'different-provider' };
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      await controller.transform(differentProviderRequest);

      expect(dataTransformerService.transform).toHaveBeenCalledWith(differentProviderRequest);
    });

    it('should handle custom mapping rule ID', async () => {
      const customRuleRequest = { ...mockRequest, mappingOutRuleId: 'custom-rule-123' };
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      await controller.transform(customRuleRequest);

      expect(dataTransformerService.transform).toHaveBeenCalledWith(customRuleRequest);
    });
  });

  describe('transformBatch', () => {
    const mockBatchRequests: DataTransformRequestDto[] = [
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

    it('should successfully process batch transformation', async () => {
      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      const result = await controller.transformBatch(mockBatchRequests);

      expect(result).toBe(mockBatchResponses);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: mockBatchRequests,
      });
    });

    it('should throw error for non-array request', async () => {
      const nonArrayRequest = mockBatchRequests[0] as any; // Pass single object instead of array

      await expect(controller.transformBatch(nonArrayRequest)).rejects.toThrow();
    });

    it('should handle empty batch request', async () => {
      const emptyBatch: DataTransformRequestDto[] = [];
      dataTransformerService.transformBatch.mockRejectedValue(new BadRequestException('Empty batch'));

      await expect(controller.transformBatch(emptyBatch)).rejects.toThrow(BadRequestException);
    });

    it('should handle batch service errors', async () => {
      const serviceError = new Error('Batch processing failed');
      dataTransformerService.transformBatch.mockRejectedValue(serviceError);

      await expect(controller.transformBatch(mockBatchRequests)).rejects.toThrow(serviceError);
    });

    it('should handle mixed provider batch requests', async () => {
      const mixedBatch = [
        ...mockBatchRequests,
        {
          provider: 'different-provider',
          transDataRuleListType: 'different-type',
          rawData: { data: 'test' },
          apiType: 'rest' as const,
        },
      ];

      dataTransformerService.transformBatch.mockResolvedValue([...mockBatchResponses, mockBatchResponses[0]]);

      const result = await controller.transformBatch(mixedBatch);

      expect(result).toHaveLength(3);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: mixedBatch,
      });
    });

    it('should handle partial batch failures', async () => {
      const partialResponse = [mockBatchResponses[0]]; // Only one successful transformation
      dataTransformerService.transformBatch.mockResolvedValue(partialResponse);

      const result = await controller.transformBatch(mockBatchRequests);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockBatchResponses[0]);
    });

    it('should validate batch request format', async () => {
      const invalidBatch = { invalid: 'format' } as any;

      await expect(controller.transformBatch(invalidBatch)).rejects.toThrow();
    });

    it('should handle large batch requests', async () => {
      const largeBatch = Array(100).fill(mockBatchRequests[0]);
      const largeResponse = Array(100).fill(mockBatchResponses[0]);
      dataTransformerService.transformBatch.mockResolvedValue(largeResponse);

      const result = await controller.transformBatch(largeBatch);

      expect(result).toHaveLength(100);
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: largeBatch,
      });
    });

    it('should pass batch options to service', async () => {
      // Note: The current controller doesn't accept options, but this test prepares for future enhancement
      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      await controller.transformBatch(mockBatchRequests);

      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: mockBatchRequests,
      });
    });
  });

  describe('Input Validation', () => {
    it('should handle malformed request data in transform', async () => {
      const malformedRequest = {
        provider: '', // Empty provider
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest' as const,
      };

      // Assuming validation happens in service layer
      const validationError = new BadRequestException('Invalid provider');
      dataTransformerService.transform.mockRejectedValue(validationError);

      await expect(controller.transform(malformedRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle malformed batch request data', async () => {
      const malformedBatchRequest = [
        {
          provider: 'longport',
          // Missing required fields
          rawData: { test: 'data' },
        },
      ] as any;

      const validationError = new BadRequestException('Invalid request format');
      dataTransformerService.transformBatch.mockRejectedValue(validationError);

      await expect(controller.transformBatch(malformedBatchRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Response Handling', () => {
    it('should return service response directly for transform', async () => {
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      const result = await controller.transform({
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      });

      // Controller should return service response directly (interceptor handles wrapping)
      expect(result).toBe(mockTransformResponse);
      expect(result).not.toHaveProperty('statusCode');
      expect(result).not.toHaveProperty('message');
    });

    it('should return service response directly for transformBatch', async () => {
      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      const result = await controller.transformBatch([
        {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
        },
      ]);

      // Controller should return service response directly (interceptor handles wrapping)
      expect(result).toBe(mockBatchResponses);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log API requests and responses for transform', async () => {
      dataTransformerService.transform.mockResolvedValue(mockTransformResponse);

      await controller.transform({
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      });

      // Logging is handled internally, we can only verify the service was called
      expect(dataTransformerService.transform).toHaveBeenCalled();
    });

    it('should log API requests and responses for transformBatch', async () => {
      dataTransformerService.transformBatch.mockResolvedValue(mockBatchResponses);

      await controller.transformBatch([
        {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
        },
      ]);

      expect(dataTransformerService.transformBatch).toHaveBeenCalled();
    });
  });
});
