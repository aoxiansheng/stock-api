import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { TransformerService } from "../../../../../../src/core/transformer/services/transformer.service";
import { FlexibleMappingRuleService } from "../../../../../../src/core/data-mapper/services/flexible-mapping-rule.service";
import { TransformRequestDto } from "../../../../../../src/core/transformer/dto/transform-request.dto";
import { FlexibleMappingRuleResponseDto } from "../../../../../../src/core/data-mapper/dto/flexible-mapping-rule.dto";
import { TransformResponseDto } from "../../../../../../src/core/transformer/dto/transform-response.dto";
import { DeepMocked, createMock } from "@golevelup/ts-jest";
import { MetricsRegistryService } from "../../../../../../src/monitoring/metrics/services/metrics-registry.service";

// Mock the logger
jest.mock("../../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("TransformerService", () => {
  let service: TransformerService;
  let flexibleMappingRuleService: DeepMocked<FlexibleMappingRuleService>;

  const mockMappingRule: FlexibleMappingRuleResponseDto = {
    id: "507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: "longport",
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    fieldMappings: [
      { sourceFieldPath: "last_done", targetField: "lastPrice", confidence: 0.9 },
      { sourceFieldPath: "volume", targetField: "volume", confidence: 0.9 },
    ],
    isActive: true,
    isDefault: false,
    sourceTemplateId: "template1",
    description: "",
    version: "1.0",
    overallConfidence: 0.9,
    usageCount: 0,
    successfulTransformations: 0,
    failedTransformations: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockRuleDocument = {
      _id: "507f1f77bcf86cd799439011",
      ...mockMappingRule,
      toObject: () => mockMappingRule,
  } as any;

  const validRequest: TransformRequestDto = {
    provider: "longport",
    apiType: "rest",
    transDataRuleListType: "get-stock-quote",
    rawData: { last_done: 150.5, volume: 100000 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformerService,
        {
          provide: FlexibleMappingRuleService,
          useValue: createMock<FlexibleMappingRuleService>(),
        },
        {
          provide: MetricsRegistryService,
          useValue: createMock<MetricsRegistryService>(),
        },
      ],
    }).compile();

    service = module.get<TransformerService>(TransformerService);
    flexibleMappingRuleService = module.get(FlexibleMappingRuleService);
    
    // Setup the mock for the ruleModel property on the service
    (flexibleMappingRuleService as any).ruleModel = {
        findById: jest.fn().mockResolvedValue(mockRuleDocument),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("transform", () => {
    it("should transform data successfully", async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue({
        success: true,
        transformedData: { lastPrice: 150.5, volume: 100000 },
        mappingStats: { successfulMappings: 2, failedMappings: 0, totalMappings: 2, successRate: 1 },
      });

      const result = await service.transform(validRequest);

      expect(result.transformedData).toEqual({ lastPrice: 150.5, volume: 100000 });
      expect(result.metadata.ruleId).toBe(mockMappingRule.id);
      expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalled();
      expect((flexibleMappingRuleService as any).ruleModel.findById).toHaveBeenCalledWith(mockMappingRule.id);
      expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalled();
    });

    it("should handle array data by iterating and transforming each item", async () => {
        const arrayRequest = { ...validRequest, rawData: [{ last_done: 150 }, { last_done: 151 }] };
        flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
        flexibleMappingRuleService.applyFlexibleMappingRule
            .mockResolvedValueOnce({
                success: true,
                transformedData: { lastPrice: 150 },
                mappingStats: { successfulMappings: 1, failedMappings: 0, totalMappings: 1, successRate: 1 },
            })
            .mockResolvedValueOnce({
                success: true,
                transformedData: { lastPrice: 151 },
                mappingStats: { successfulMappings: 1, failedMappings: 0, totalMappings: 1, successRate: 1 },
            });

        const result = await service.transform(arrayRequest);

        expect(result.transformedData).toEqual([{ lastPrice: 150 }, { lastPrice: 151 }]);
        expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledTimes(2);
    });

    it("should throw NotFoundException when no mapping rule is found", async () => {
      flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(null);
      await expect(service.transform(validRequest)).rejects.toThrow(NotFoundException);
    });
    
    it("should throw InternalServerErrorException on database error", async () => {
        flexibleMappingRuleService.findBestMatchingRule.mockRejectedValue(new Error("DB Error"));
        await expect(service.transform(validRequest)).rejects.toThrow(InternalServerErrorException);
    });
  });
  
  describe("transformBatch", () => {
      it("should transform a batch successfully", async () => {
          const batchRequest = [{...validRequest}, {...validRequest, rawData: {last_done: 200}}];
          flexibleMappingRuleService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
          flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue({
            success: true,
            transformedData: { lastPrice: 150.5 },
            mappingStats: { successfulMappings: 1, failedMappings: 0, totalMappings: 1, successRate: 1 },
          });

          const results = await service.transformBatch({ requests: batchRequest });

          expect(results).toHaveLength(2);
          expect(flexibleMappingRuleService.findBestMatchingRule).toHaveBeenCalledTimes(1);
          expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledTimes(2);
      });
  });

  describe("_executeSingleTransform", () => {
      it("should execute a single transform correctly", async () => {
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue({
            success: true,
            transformedData: { lastPrice: 150.5 },
            mappingStats: { successfulMappings: 1, failedMappings: 0, totalMappings: 1, successRate: 1 },
        });

        const result = await (service as any)._executeSingleTransform(validRequest, mockMappingRule);

        expect(result).toBeInstanceOf(TransformResponseDto);
        expect(result.transformedData).toEqual({ lastPrice: 150.5 });
        expect((flexibleMappingRuleService as any).ruleModel.findById).toHaveBeenCalledWith(mockMappingRule.id);
        expect(flexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalled();
      });

      it("should throw BadRequestException on transformation failure", async () => {
        flexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue({
            success: false,
            errorMessage: "Transformation failed",
            transformedData: {},
            mappingStats: { successfulMappings: 0, failedMappings: 1, totalMappings: 1, successRate: 0 },
        });

        await expect((service as any)._executeSingleTransform(validRequest, mockMappingRule)).rejects.toThrow(BadRequestException);
      });
  });
});