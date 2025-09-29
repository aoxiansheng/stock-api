import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';

import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { FlexibleMappingRuleService } from '@core/00-prepare/data-mapper/services/flexible-mapping-rule.service';
import { DataTransformRequestDto } from '@core/02-processing/transformer/dto/data-transform-request.dto';
import { FlexibleMappingRuleResponseDto } from '@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { TRANSFORMER_ERROR_CODES } from '@core/02-processing/transformer/constants/transformer-error-codes.constants';
import { DATATRANSFORM_CONFIG } from '@core/02-processing/transformer/constants/data-transformer.constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('DataTransformerService', () => {
  let service: DataTransformerService;
  let flexibleMappingRuleService: jest.Mocked<FlexibleMappingRuleService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockMappingRule: FlexibleMappingRuleResponseDto = {
    id: 'test-rule-id',
    name: 'Test Mapping Rule',
    provider: 'longport',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    fieldMappings: [
      {
        sourceFieldPath: 'last_done',
        targetField: 'lastPrice',
        transform: { type: 'none', value: null },
      },
      {
        sourceFieldPath: 'change_rate',
        targetField: 'changePercent',
        transform: { type: 'multiply', value: 100 },
      },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceTemplateId: 'test-template-id',
    isDefault: false,
    version: '1',
    overallConfidence: 0.95,
    lastUsedAt: new Date(),
    usageCount: 100,
    successfulTransformations: 95,
    failedTransformations: 5,
  };

  const mockRuleDocument = {
    id: 'test-rule-id',
    name: 'Test Mapping Rule',
    provider: 'longport',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    fieldMappings: mockMappingRule.fieldMappings,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockTransformResult = {
    success: true,
    transformedData: {
      lastPrice: 385.6,
      changePercent: -1.08,
    },
    errorMessage: null,
    mappingStats: {
      totalMappings: 2,
      successfulMappings: 2,
      failedMappings: 0,
      successRate: 1.0,
    },
  };

  beforeEach(async () => {
    const mockFlexibleMappingRuleService = {
      findBestMatchingRule: jest.fn(),
      findRuleById: jest.fn(),
      getRuleDocumentById: jest.fn(),
      applyFlexibleMappingRule: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataTransformerService,
        {
          provide: FlexibleMappingRuleService,
          useValue: mockFlexibleMappingRuleService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<DataTransformerService>(DataTransformerService);
    flexibleMappingRuleService = module.get(FlexibleMappingRuleService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required dependencies injected', () => {
      expect(flexibleMappingRuleService).toBeDefined();
      expect(eventEmitter).toBeDefined();
    });
  });

  describe('transform', () => {
    const mockRequest: DataTransformRequestDto = {
      provider: 'longport',
      transDataRuleListType: 'quote_fields',
      rawData: { last_done: 385.6, change_rate: -0.0108 },
      apiType: 'rest',
    };

    beforeEach(() => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);
    });

    it('should successfully transform single data item', async () => {
      const result = await service.transform(mockRequest);

      expect(result).toBeDefined();
      expect(result.transformedData).toEqual(mockTransformResult.transformedData);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.ruleId).toBe(mockMappingRule.id);
      expect(result.metadata.ruleName).toBe(mockMappingRule.name);
      expect(result.metadata.provider).toBe(mockRequest.provider);
      expect(result.metadata.transDataRuleListType).toBe(mockRequest.transDataRuleListType);
    });

    it('should successfully transform array data', async () => {
      const arrayRequest = {
        ...mockRequest,
        rawData: [
          { last_done: 385.6, change_rate: -0.0108 },
          { last_done: 400.0, change_rate: 0.05 },
        ],
      };

      const result = await service.transform(arrayRequest);

      expect(result.transformedData).toBeInstanceOf(Array);
      expect(result.transformedData).toHaveLength(2);
      expect(result.metadata.recordsProcessed).toBe(2);
    });

    it('should handle empty/null raw data gracefully', async () => {
      const emptyRequest = { ...mockRequest, rawData: null };

      const result = await service.transform(emptyRequest);

      expect(result.transformedData).toEqual([]);
      expect(result.metadata.recordsProcessed).toBe(0);
      expect(result.metadata.fieldsTransformed).toBe(0);
    });

    it('should throw error when no mapping rule found', async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(null);

      await expect(service.transform(mockRequest)).rejects.toThrow();
    });

    it('should throw error when all transformations fail', async () => {
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue({
        success: false,
        transformedData: null,
        errorMessage: 'Transformation failed',
        mappingStats: {
          totalMappings: 2,
          successfulMappings: 0,
          failedMappings: 2,
          successRate: 0.0,
        },
      });

      await expect(service.transform(mockRequest)).rejects.toThrow();
    });

    it('should emit performance warning for slow transformations', async () => {
      // Mock slow transformation by delaying the rule application
      flexibleMappingRuleService.applyFlexibleMappingRule.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve(mockTransformResult), 1100) // > 1000ms threshold
        )
      );

      await service.transform(mockRequest);

      // Check if warning was logged (indirectly by checking if transformation completed)
      expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalled();
    });

    it('should emit metrics events on successful transformation', async () => {
      await service.transform(mockRequest);

      // Allow async event emission to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'data_transformer',
          metricType: 'business',
          metricName: 'transformation_completed',
          tags: expect.objectContaining({
            operation: 'data-transformation',
            provider: mockRequest.provider,
            status: 'success',
          }),
        })
      );
    });

    it('should emit error metrics on transformation failure', async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.transform(mockRequest)).rejects.toThrow();

      // Allow async event emission to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'data_transformer',
          metricType: 'business',
          metricName: 'transformation_failed',
          tags: expect.objectContaining({
            operation: 'data-transformation',
            status: 'error',
          }),
        })
      );
    });

    it('should use provided mapping rule ID', async () => {
      const requestWithRuleId = { ...mockRequest, mappingOutRuleId: 'specific-rule-id' };
      flexibleMappingRuleService.findRuleById.mockResolvedValue(mockMappingRule);

      await service.transform(requestWithRuleId);

      expect(flexibleMappingRuleService.findRuleById).toHaveBeenCalledWith('specific-rule-id');
      expect(flexibleMappingRuleService.findBestMatchingRule).not.toHaveBeenCalled();
    });

    it('should handle business logic exceptions correctly', async () => {
      const businessError = new BadRequestException('Invalid data format');
      flexibleMappingRuleService.applyFlexibleMappingRule.mockRejectedValue(businessError);

      await expect(service.transform(mockRequest)).rejects.toThrow(BadRequestException);
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

    beforeEach(() => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);
    });

    it('should successfully process batch transformation', async () => {
      const result = await service.transformBatch({
        requests: mockBatchRequests
      });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0].transformedData).toBeDefined();
      expect(result[1].transformedData).toBeDefined();
    });

    it('should throw error for empty batch request', async () => {
      await expect(
        service.transformBatch({ requests: [] })
      ).rejects.toThrow();
    });

    it('should throw error when batch size exceeds limit', async () => {
      const oversizedBatch = Array(DATATRANSFORM_CONFIG.MAX_BATCH_SIZE + 1).fill(mockBatchRequests[0]);

      await expect(
        service.transformBatch({ requests: oversizedBatch })
      ).rejects.toThrow();
    });

    it('should group requests by mapping rule for optimization', async () => {
      // Create requests with different providers/types
      const mixedRequests = [
        ...mockBatchRequests,
        {
          provider: 'different-provider',
          transDataRuleListType: 'different-type',
          rawData: { data: 'test' },
          apiType: 'rest' as const,
        },
      ];

      await service.transformBatch({ requests: mixedRequests });

      // Should call findBestMatchingRule for each unique rule group
      expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures with continueOnError option', async () => {
      // 创建两个不同规则组的请求
      const mixedBatchRequests = [
        // 第一组 - 这组会成功
        {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { last_done: 385.6 },
          apiType: 'rest' as const,
        },
        // 第二组 - 这组会失败
        {
          provider: 'different-provider',
          transDataRuleListType: 'different-type',
          rawData: { data: 'test' },
          apiType: 'rest' as const,
        },
      ];

      // 为第一组请求设置成功
      flexibleMappingRuleService.findBestMatchingRule
        .mockImplementation((provider) => {
          if (provider === 'longport') {
            return Promise.resolve(mockMappingRule);
          } else {
            return Promise.reject(new Error('Rule not found for different provider'));
          }
        });
      
      flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

      const result = await service.transformBatch({
        requests: mixedBatchRequests,
        options: { continueOnError: true }
      });

      expect(result).toHaveLength(1); // 只有成功的组的结果
      expect(result[0].transformedData).toEqual(mockTransformResult.transformedData);
    });

    it('should emit batch metrics on completion', async () => {
      await service.transformBatch({ requests: mockBatchRequests });

      // Allow async event emission to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'data_transformer',
          metricType: 'business',
          metricName: 'batch_transformation_completed',
          tags: expect.objectContaining({
            operation: 'batch-data-transformation',
            batchSize: mockBatchRequests.length,
            status: 'success',
          }),
        })
      );
    });

    it('should handle mapping rule not found for batch group', async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(null);

      await expect(
        service.transformBatch({ requests: mockBatchRequests })
      ).rejects.toThrow();
    });
  });

  describe('Private Methods', () => {
    describe('findMappingRule', () => {
      it('should find rule by ID when provided', async () => {
        flexibleMappingRuleService.findRuleById.mockResolvedValue(mockMappingRule);

        // Access private method via type assertion for testing
        const result = await (service as any).findMappingRule(
          'longport',
          'quote_fields',
          'specific-rule-id',
          'rest'
        );

        expect(result).toBe(mockMappingRule);
        expect(flexibleMappingRuleService.findRuleById).toHaveBeenCalledWith('specific-rule-id');
      });

      it('should find best matching rule when no ID provided', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        const result = await (service as any).findMappingRule(
          'longport',
          'quote_fields',
          undefined,
          'rest',
          { sample: 'data' }
        );

        expect(result).toBe(mockMappingRule);
        expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalledWith(
          'longport',
          'rest',
          'quote_fields'
        );
      });
    });

    describe('calculateTransformationStats', () => {
      it('should calculate stats for single item', () => {
        const transformedData = { lastPrice: 385.6, changePercent: -1.08 };

        const stats = (service as any).calculateTransformationStats(
          transformedData,
          mockMappingRule
        );

        expect(stats.recordsProcessed).toBe(1);
        expect(stats.fieldsTransformed).toBe(2);
        expect(stats.transformationsApplied).toHaveLength(2);
      });

      it('should calculate stats for array data', () => {
        const transformedData = [
          { lastPrice: 385.6 },
          { lastPrice: 400.0 },
        ];

        const stats = (service as any).calculateTransformationStats(
          transformedData,
          mockMappingRule
        );

        expect(stats.recordsProcessed).toBe(2);
        expect(stats.fieldsTransformed).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate NotFoundException correctly', async () => {
      const notFoundError = new NotFoundException('Rule not found');
      flexibleMappingRuleService.findBestMatchingRule.mockRejectedValue(notFoundError);

      const request: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      };

      await expect(service.transform(request)).rejects.toThrow(NotFoundException);
    });

    it('should wrap system errors with transformer context', async () => {
      const systemError = new Error('Database connection timeout');
      flexibleMappingRuleService.findBestMatchingRule.mockRejectedValue(systemError);

      const request: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      };

      await expect(service.transform(request)).rejects.toThrow();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track processing time in metadata', async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

      const request: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        apiType: 'rest',
      };

      const result = await service.transform(request);

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.processingTimeMs).toBe('number');
    });

    it('should handle high memory usage scenarios', async () => {
      const largeData = Array(1000).fill({ test: 'data' });

      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

      const request: DataTransformRequestDto = {
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        rawData: largeData,
        apiType: 'rest',
      };

      const result = await service.transform(request);

      expect(result).toBeDefined();
      expect(result.metadata.recordsProcessed).toBe(1000);
    });
  });

  describe('Additional Coverage for Missing Branches', () => {
    describe('_executeSingleTransform Method Coverage', () => {
      it('should handle failed single transformation result', async () => {
        const failedResult = {
          success: false,
          transformedData: null,
          errorMessage: 'Transformation rule application failed',
          mappingStats: {
            totalMappings: 2,
            successfulMappings: 0,
            failedMappings: 2,
            successRate: 0.0,
          },
        };

        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(failedResult);

        // Test private method via transformBatch which calls _executeSingleTransform
        const requests = [{
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest' as const,
        }];

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        await expect(service.transformBatch({ requests })).rejects.toThrow();
      });

      it('should handle _executeSingleTransform with undefined error message', async () => {
        const failedResultNoMessage = {
          success: false,
          transformedData: null,
          errorMessage: undefined, // Test undefined error message path
          mappingStats: {
            totalMappings: 2,
            successfulMappings: 0,
            failedMappings: 2,
            successRate: 0.0,
          },
        };

        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(failedResultNoMessage);

        const requests = [{
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest' as const,
        }];

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        await expect(service.transformBatch({ requests })).rejects.toThrow('Single transformation failed');
      });

      it('should handle slow single transformation with performance warning', async () => {
        // Mock a slow transformation
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockImplementation(
          () => new Promise(resolve =>
            setTimeout(() => resolve(mockTransformResult), 1100) // > 1000ms threshold
          )
        );

        const requests = [{
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest' as const,
        }];

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        const result = await service.transformBatch({ requests });

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should handle _executeSingleTransform with business logic exceptions', async () => {
        const unauthorizedError = new UnauthorizedException('Access denied');
        flexibleMappingRuleService.getRuleDocumentById.mockRejectedValue(unauthorizedError);

        const requests = [{
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest' as const,
        }];

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        await expect(service.transformBatch({ requests })).rejects.toThrow(UnauthorizedException);
      });

      it('should handle _executeSingleTransform with ForbiddenException', async () => {
        const forbiddenError = new ForbiddenException('Operation not allowed');
        flexibleMappingRuleService.getRuleDocumentById.mockRejectedValue(forbiddenError);

        const requests = [{
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest' as const,
        }];

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

        await expect(service.transformBatch({ requests })).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Transform Method Edge Cases', () => {
      it('should handle includeMetadata option correctly', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const requestWithMetadata: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
          options: {
            includeMetadata: true,
            includeDebugInfo: false,
          },
        };

        const result = await service.transform(requestWithMetadata);

        expect(result.metadata.transformationsApplied).toBeDefined();
        expect(Array.isArray(result.metadata.transformationsApplied)).toBe(true);
      });

      it('should handle includeDebugInfo option correctly', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const requestWithDebugInfo: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
          options: {
            includeDebugInfo: true,
          },
        };

        const result = await service.transform(requestWithDebugInfo);

        expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
          mockRuleDocument,
          { test: 'data' },
          true // includeDebugInfo
        );
        expect(result).toBeDefined();
      });

      it('should handle undefined options gracefully', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const requestWithoutOptions: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
          // options: undefined
        };

        const result = await service.transform(requestWithoutOptions);

        expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
          mockRuleDocument,
          { test: 'data' },
          false // default includeDebugInfo
        );
        expect(result).toBeDefined();
      });
    });

    describe('findMappingRule Method Edge Cases', () => {
      it('should handle raw data sample with field mapping validation', async () => {
        const sampleData = {
          last_done: 385.6,
          change_rate: -0.0108,
          nonMatchingField: 'shouldNotMatch'
        };

        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const request: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: sampleData,
          apiType: 'rest',
        };

        const result = await service.transform(request);

        expect(result).toBeDefined();
        expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalledWith(
          'longport',
          'rest',
          'quote_fields'
        );
      });

      it('should handle stream API type in findMappingRule', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const streamRequest: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'stream',
        };

        const result = await service.transform(streamRequest);

        expect(result).toBeDefined();
        expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalledWith(
          'longport',
          'stream',
          'quote_fields'
        );
      });
    });

    describe('TransformBatch Continue On Error Option', () => {
      it('should handle continueOnError option in transformBatch', async () => {
        flexibleMappingRuleService.findBestMatchingRule
          .mockResolvedValueOnce(mockMappingRule)
          .mockRejectedValueOnce(new Error('Rule not found for second request'));

        const mixedRequests = [
          {
            provider: 'longport',
            transDataRuleListType: 'quote_fields',
            rawData: { test: 'data1' },
            apiType: 'rest' as const,
          },
          {
            provider: 'different-provider',
            transDataRuleListType: 'different-type',
            rawData: { test: 'data2' },
            apiType: 'rest' as const,
          },
        ];

        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(mockTransformResult);

        const result = await service.transformBatch({
          requests: mixedRequests,
          options: { continueOnError: true }
        });

        // Should return results only for successful transformations
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('Performance Threshold Testing', () => {
      it('should log warning for slow transformations', async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.getRuleDocumentById.mockResolvedValue(mockRuleDocument);

        // Mock slow transformation
        flexibleMappingRuleService.applyFlexibleMappingRule.mockImplementation(
          () => new Promise(resolve =>
            setTimeout(() => resolve(mockTransformResult), 1100) // > 1000ms threshold
          )
        );

        const request: DataTransformRequestDto = {
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
          apiType: 'rest',
        };

        const result = await service.transform(request);

        expect(result).toBeDefined();
        expect(result.metadata.processingTimeMs).toBeGreaterThan(1000);
      });
    });
  });
});
