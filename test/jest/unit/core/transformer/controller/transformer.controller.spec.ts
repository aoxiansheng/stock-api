import { Test, TestingModule } from '@nestjs/testing';
import { TransformerController } from '@core/transformer/controller/transformer.controller';
import { TransformerService } from '@core/transformer/services/transformer.service';
import { TransformRequestDto } from '@core/transformer/dto/transform-request.dto';
import { TransformResponseDto } from '@core/transformer/dto/transform-response.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { UnifiedPermissionsGuard } from '../../../../../../src/auth/guards/unified-permissions.guard';
import { PermissionService } from '../../../../../../src/auth/services/permission.service';
import { RateLimitGuard } from '../../../../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../../../../src/auth/services/rate-limit.service';
import { Reflector } from '@nestjs/core';

describe('TransformerController', () => {
  let controller: TransformerController;
  let transformerService: jest.Mocked<TransformerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransformerController],
      providers: [
        {
          provide: TransformerService,
          useValue: {
            transform: jest.fn(),
            transformBatch: jest.fn(),
          },
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            validatePermissions: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({
              allowed: true,
              limit: 100,
              remaining: 99,
              resetTime: new Date().getTime() + 60000,
            }),
          }
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue([]),
          }
        }
      ],
    }).compile();

    controller = module.get<TransformerController>(TransformerController);
    transformerService = module.get(TransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transform', () => {
    const mockTransformRequestDto: TransformRequestDto = {
      provider: 'test-provider',
      apiType: 'rest',
      transDataRuleListType: 'test-type',
      mappingOutRuleId: 'test-rule-id',
      rawData: { key: 'value' },
      options: { validateOutput: true },
    };

    it('should transform data successfully', async () => {
      const mockResponse: TransformResponseDto = {
        transformedData: [{ transformedKey: 'transformedValue' }],
        metadata: {
          recordsProcessed: 1,
          fieldsTransformed: 1,
          processingTime: 10,
          ruleId: 'test-rule-id',
          ruleName: 'Test Rule',
          provider: 'test-provider',
          transDataRuleListType: 'test-type',
          timestamp: new Date().toISOString(),
        },
      };
      transformerService.transform.mockResolvedValue(mockResponse);

      const result = await controller.transform(mockTransformRequestDto);
      expect(transformerService.transform).toHaveBeenCalledWith(mockTransformRequestDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if transformerService.transform fails', async () => {
      transformerService.transform.mockRejectedValue(new InternalServerErrorException('Transformation failed'));
      await expect(controller.transform(mockTransformRequestDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('transformBatch', () => {
    const mockTransformRequestDtos: TransformRequestDto[] = [
      {
        provider: 'test-provider',
        apiType: 'rest',
        transDataRuleListType: 'test-type',
        mappingOutRuleId: 'test-rule-id-1',
        rawData: { key: 'value1' },
        options: {},
      },
      {
        provider: 'test-provider',
        apiType: 'stream',
        transDataRuleListType: 'test-type',
        mappingOutRuleId: 'test-rule-id-2',
        rawData: { key: 'value2' },
        options: {},
      },
    ];

    it('should transform batch data successfully', async () => {
      const mockResponse: TransformResponseDto[] = [
        {
          transformedData: [{ transformedKey: 'transformedValue1' }],
          metadata: {
            recordsProcessed: 1,
            fieldsTransformed: 1,
            processingTime: 10,
            ruleId: 'test-rule-id-1',
            ruleName: 'Test Rule 1',
            provider: 'test-provider',
            transDataRuleListType: 'test-type',
            timestamp: new Date().toISOString(),
          },
        },
        {
          transformedData: [{ transformedKey: 'transformedValue2' }],
          metadata: {
            recordsProcessed: 1,
            fieldsTransformed: 1,
            processingTime: 12,
            ruleId: 'test-rule-id-2',
            ruleName: 'Test Rule 2',
            provider: 'test-provider',
            transDataRuleListType: 'test-type',
            timestamp: new Date().toISOString(),
          },
        },
      ];
      transformerService.transformBatch.mockResolvedValue(mockResponse);

      const result = await controller.transformBatch(mockTransformRequestDtos);
      expect(transformerService.transformBatch).toHaveBeenCalledWith({ requests: mockTransformRequestDtos });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if transformerService.transformBatch fails', async () => {
      transformerService.transformBatch.mockRejectedValue(new InternalServerErrorException('Batch transformation failed'));
      await expect(controller.transformBatch(mockTransformRequestDtos)).rejects.toThrow(InternalServerErrorException);
    });
  });

  /* 预览相关的功能已在服务重构中移除，此处测试已删除 */
});