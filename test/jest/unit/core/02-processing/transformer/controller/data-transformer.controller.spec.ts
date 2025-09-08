import { OPERATION_LIMITS } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { DataTransformerController } from "@core/02-processing/transformer/controller/data-transformer.controller";
import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";
import { DataTransformRequestDto } from "@core/02-processing/transformer/dto/data-transform-request.dto";
import { DataTransformResponseDto } from "@core/02-processing/transformer/dto/data-transform-response.dto";
import { UnifiedPermissionsGuard } from "../../../../../../../src/auth/guards/unified-permissions.guard";
import { PermissionService } from "../../../../../../../src/auth/services/permission.service";
import { RateLimitGuard } from "../../../../../../../src/auth/guards/rate-limit.guard";
import { RateLimitService } from "../../../../../../../src/auth/services/rate-limit.service";
import { Reflector } from "@nestjs/core";

describe("DataTransformerController", () => {
  let controller: DataTransformerController;
  let dataTransformerService: jest.Mocked<DataTransformerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataTransformerController],
      providers: [
        {
          provide: DataTransformerService,
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
              limit: OPERATION_LIMITS.BATCH_SIZES.DEFAULT_PAGE_SIZE,
              remaining: 99,
              resetTime: new Date().getTime() + 60000,
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<DataTransformerController>(
      DataTransformerController,
    );
    dataTransformerService = module.get(DataTransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("transform", () => {
    const mockDataTransformRequestDto: DataTransformRequestDto = {
      provider: "test-provider",
      apiType: "rest",
      transDataRuleListType: "test-type",
      mappingOutRuleId: "test-rule-id",
      rawData: { key: "value" },
      options: { validateOutput: true },
    };

    it("should transform data successfully", async () => {
      const mockResponse: DataTransformResponseDto = {
        transformedData: [{ transformedKey: "transformedValue" }],
        metadata: {
          recordsProcessed: 1,
          fieldsTransformed: 1,
          processingTimeMs: 10,
          ruleId: "test-rule-id",
          ruleName: "Test Rule",
          provider: "test-provider",
          transDataRuleListType: "test-type",
          timestamp: new Date().toISOString(),
        },
      };
      dataTransformerService.transform.mockResolvedValue(mockResponse);

      const result = await controller.transform(mockDataTransformRequestDto);
      expect(dataTransformerService.transform).toHaveBeenCalledWith(
        mockDataTransformRequestDto,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw error if dataTransformerService.transform fails", async () => {});
  });

  describe("transformBatch", () => {
    const mockDataTransformRequestDtos: DataTransformRequestDto[] = [
      {
        provider: "test-provider",
        apiType: "rest",
        transDataRuleListType: "test-type",
        mappingOutRuleId: "test-rule-id-1",
        rawData: { key: "value1" },
        options: {},
      },
      {
        provider: "test-provider",
        apiType: "stream",
        transDataRuleListType: "test-type",
        mappingOutRuleId: "test-rule-id-2",
        rawData: { key: "value2" },
        options: {},
      },
    ];

    it("should transform batch data successfully", async () => {
      const mockResponse: DataTransformResponseDto[] = [
        {
          transformedData: [{ transformedKey: "transformedValue1" }],
          metadata: {
            recordsProcessed: 1,
            fieldsTransformed: 1,
            processingTimeMs: 10,
            ruleId: "test-rule-id-1",
            ruleName: "Test Rule 1",
            provider: "test-provider",
            transDataRuleListType: "test-type",
            timestamp: new Date().toISOString(),
          },
        },
        {
          transformedData: [{ transformedKey: "transformedValue2" }],
          metadata: {
            recordsProcessed: 1,
            fieldsTransformed: 1,
            processingTimeMs: 12,
            ruleId: "test-rule-id-2",
            ruleName: "Test Rule 2",
            provider: "test-provider",
            transDataRuleListType: "test-type",
            timestamp: new Date().toISOString(),
          },
        },
      ];
      dataTransformerService.transformBatch.mockResolvedValue(mockResponse);

      const result = await controller.transformBatch(
        mockDataTransformRequestDtos,
      );
      expect(dataTransformerService.transformBatch).toHaveBeenCalledWith({
        requests: mockDataTransformRequestDtos,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw error if dataTransformerService.transformBatch fails", async () => {});
  });

  /* 预览相关的功能已在服务重构中移除，此处测试已删除 */
});
