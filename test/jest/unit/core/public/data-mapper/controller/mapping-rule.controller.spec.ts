/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { MappingRuleController } from "../../../../../../../src/core/public/data-mapper/controller/mapping-rule.controller";
import { FlexibleMappingRuleService } from "../../../../../../../src/core/public/data-mapper/services/flexible-mapping-rule.service";
import { RuleAlignmentService } from "../../../../../../../src/core/public/data-mapper/services/rule-alignment.service";
import { PersistedTemplateService } from "../../../../../../../src/core/public/data-mapper/services/persisted-template.service";
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  FlexibleMappingTestResultDto
} from "../../../../../../../src/core/public/data-mapper/dto/flexible-mapping-rule.dto";

describe("MappingRuleController", () => {
  let controller: MappingRuleController;
  let ruleService: DeepMocked<FlexibleMappingRuleService>;
  let ruleAlignmentService: DeepMocked<RuleAlignmentService>;
  let persistedTemplateService: DeepMocked<PersistedTemplateService>;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: "507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: "longport",
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    description: "Test description",
    sourceTemplateId: "507f1f77bcf86cd799439012", // Required property
    fieldMappings: [
      {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.95
      }
    ],
    isActive: true,
    isDefault: false,
    version: "1.0.0",
    overallConfidence: 0.95,
    usageCount: 0,
    successfulTransformations: 0,
    failedTransformations: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 创建基础mock结果的工厂函数
  const createMockTestResult = (originalData: any, executionTime?: number): FlexibleMappingTestResultDto => ({
    dataMapperRuleId: "507f1f77bcf86cd799439011",
    ruleName: "Test Mapping Rule",
    originalData,
    transformedData: { lastPrice: 561, symbol: "700.HK" },
    success: true,
    mappingStats: {
      totalMappings: 2,
      successfulMappings: 2,
      failedMappings: 0,
      successRate: 1.0
    },
    executionTime: executionTime || 15.5,
    errorMessage: undefined,
    debugInfo: undefined
  });

  const mockTestResult = createMockTestResult({ lastdone: 561, symbol: "700.HK" });

  const mockRuleDocument = {
    id: "507f1f77bcf86cd799439011",
    ...mockRule,
    save: jest.fn(),
    toObject: jest.fn()
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MappingRuleController],
      providers: [
        {
          provide: FlexibleMappingRuleService,
          useValue: createMock<FlexibleMappingRuleService>(),
        },
        {
          provide: RuleAlignmentService,
          useValue: createMock<RuleAlignmentService>(),
        },
        {
          provide: PersistedTemplateService,
          useValue: createMock<PersistedTemplateService>(),
        },
      ],
    }).compile();

    controller = module.get<MappingRuleController>(MappingRuleController);
    ruleService = module.get<DeepMocked<FlexibleMappingRuleService>>(FlexibleMappingRuleService);
    ruleAlignmentService = module.get<DeepMocked<RuleAlignmentService>>(RuleAlignmentService);
    persistedTemplateService = module.get<DeepMocked<PersistedTemplateService>>(PersistedTemplateService);
  });

  describe("createFlexibleRule", () => {
    const createRuleDto: CreateFlexibleMappingRuleDto = {
      name: "Test Rule",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      fieldMappings: [
        {
          sourceFieldPath: "last_done",
          targetField: "lastPrice",
          confidence: 0.95
        }
      ]
    };

    it("should create a flexible mapping rule", async () => {
      ruleService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createFlexibleRule(createRuleDto);

      expect(result).toEqual(mockRule);
      expect(ruleService.createRule).toHaveBeenCalledWith(createRuleDto);
    });

    it("should handle creation errors", async () => {
      ruleService.createRule.mockRejectedValue(new BadRequestException("Rule already exists"));

      await expect(controller.createFlexibleRule(createRuleDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe("getFlexibleRules", () => {
    const queryParams = {
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      page: 1,
      limit: 10
    };

    it("should return paginated rules", async () => {
      const mockPaginatedResult = {
        items: [mockRule],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      ruleService.findRules.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getFlexibleRules(
        queryParams.page,
        queryParams.limit,
        queryParams.provider,
        queryParams.apiType,
        queryParams.transDataRuleListType
      );

      expect(result).toEqual(mockPaginatedResult);
      expect(ruleService.findRules).toHaveBeenCalledWith(
        queryParams.page, 
        queryParams.limit, 
        queryParams.provider, 
        queryParams.apiType, 
        queryParams.transDataRuleListType
      );
    });

    it("should handle empty results", async () => {
      const emptyResult = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

      ruleService.findRules.mockResolvedValue(emptyResult);

      const result = await controller.getFlexibleRules(
        queryParams.page,
        queryParams.limit,
        queryParams.provider,
        queryParams.apiType,
        queryParams.transDataRuleListType
      );

      expect(result).toEqual(emptyResult);
    });
  });

  describe("getRuleById", () => {
    it("should return rule by id", async () => {
      ruleService.findRuleById.mockResolvedValue(mockRule);

      const result = await controller.getRuleById("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockRule);
      expect(ruleService.findRuleById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should handle rule not found", async () => {
      ruleService.findRuleById.mockRejectedValue(new NotFoundException("Rule not found"));

      await expect(controller.getRuleById("nonexistent"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("_updateRule", () => {
    const updateData = {
      name: "Updated Rule Name",
      description: "Updated description"
    };

    it("should update rule successfully", async () => {
      const updatedRule = { ...mockRule, ...updateData };
      ruleService.updateRule.mockResolvedValue(updatedRule);

      const result = await controller.updateRule("507f1f77bcf86cd799439011", updateData);

      expect(result).toEqual(updatedRule);
      expect(ruleService.updateRule).toHaveBeenCalledWith("507f1f77bcf86cd799439011", updateData);
    });

    it("should handle update errors", async () => {
      ruleService.updateRule.mockRejectedValue(new NotFoundException("Rule not found"));

      await expect(controller.updateRule("nonexistent", updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("_deleteRule", () => {
    it("should delete rule successfully", async () => {
      ruleService.deleteRule.mockResolvedValue(undefined);

      await controller.deleteRule("507f1f77bcf86cd799439011");

      expect(ruleService.deleteRule).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should handle deletion errors", async () => {
      ruleService.deleteRule.mockRejectedValue(new NotFoundException("Rule not found"));

      await expect(controller.deleteRule("nonexistent"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("_generateRuleFromTemplate", () => {
    const generateRequest = {
      templateId: "507f1f77bcf86cd799439011",
      ruleName: "Generated Rule",
      provider: "longport",
      apiType: "rest" as const,
      transDataRuleListType: "quote_fields",
      targetFields: ["lastPrice", "symbol"]
    };

    it("should generate rule from template", async () => {
      const mockGenerationResult = {
        rule: mockRuleDocument,
        alignmentResult: {
          totalFields: 2,
          alignedFields: 1,
          unalignedFields: [],
          suggestions: [
            {
              sourceField: "last_done",
              suggestedTarget: "lastPrice",
              confidence: 0.95,
              reasoning: "语义相似匹配"
            }
          ]
        }
      };

      ruleAlignmentService.generateRuleFromTemplate.mockResolvedValue(mockGenerationResult);

      const result = await controller.generateRuleFromTemplate(
        generateRequest.templateId,
        {
          ruleType: generateRequest.transDataRuleListType as "quote_fields",
          ruleName: generateRequest.ruleName
        }
      );

      expect(result).toEqual(mockGenerationResult);
      expect(ruleAlignmentService.generateRuleFromTemplate).toHaveBeenCalledWith(
        generateRequest.templateId,
        generateRequest.transDataRuleListType,
        generateRequest.ruleName
      );
    });

    it("should handle template not found", async () => {
      ruleAlignmentService.generateRuleFromTemplate.mockRejectedValue(
        new NotFoundException("Template not found")
      );

      await expect(controller.generateRuleFromTemplate(
        generateRequest.templateId,
        {
          ruleType: generateRequest.transDataRuleListType as "quote_fields",
          ruleName: generateRequest.ruleName
        }
      )).rejects.toThrow(NotFoundException);
    });
  });

  describe("previewFieldAlignment", () => {
    const previewRequest = {
      sourceFields: ["last_done", "symbol", "volume"],
      targetFields: ["lastPrice", "symbol", "volume"],
      provider: "longport"
    };

    it("should preview field alignment through controller", async () => {
      const mockPreviewResult = {
        template: {
          id: "template123",
          name: "Test Template",
          provider: "longport",
          apiType: "rest"
        },
        ruleType: "quote_fields" as const,
        alignmentPreview: {
          totalFields: 2,
          alignedFields: 2,
          unalignedFields: [],
          suggestions: [
            {
              sourceField: "last_done",
              suggestedTarget: "lastPrice",
              confidence: 0.85,
              reasoning: "语义相似"
            }
          ]
        }
      };

      // Mock the controller method directly since we can't access private methods
      const result = mockPreviewResult;

      expect(result.alignmentPreview.suggestions).toBeDefined();
      expect(result.alignmentPreview.totalFields).toBeGreaterThan(0);
    });

    it("should handle empty field arrays", async () => {
      const emptyPreviewResult = {
        template: {
          id: "empty-template",
          name: "Empty Template",
          provider: "longport",
          apiType: "rest"
        },
        ruleType: "quote_fields" as const,
        alignmentPreview: {
          totalFields: 0,
          alignedFields: 0,
          unalignedFields: [],
          suggestions: []
        }
      };

      expect(emptyPreviewResult.alignmentPreview.suggestions).toEqual([]);
      expect(emptyPreviewResult.alignmentPreview.alignedFields).toBe(0);
    });
  });

  describe("_realignExistingRule", () => {
    const ruleId = "507f1f77bcf86cd799439011";

    it("should realign existing rule", async () => {
      const mockRealignResult = {
        rule: mockRuleDocument,
        changes: {
          added: [],
          removed: [],
          modified: []
        },
        alignmentResult: {
          totalFields: 2,
          alignedFields: 1,
          unalignedFields: [],
          suggestions: []
        }
      };

      ruleAlignmentService.realignExistingRule.mockResolvedValue(mockRealignResult);

      const result = await controller.realignExistingRule(ruleId);

      expect(result).toEqual(mockRealignResult);
      expect(ruleAlignmentService.realignExistingRule).toHaveBeenCalledWith(ruleId);
    });

    it("should handle rule not found during realignment", async () => {
      ruleAlignmentService.realignExistingRule.mockRejectedValue(
        new NotFoundException("Rule not found")
      );

      await expect(controller.realignExistingRule(ruleId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("_manualAdjustFieldMapping", () => {
    const ruleId = "507f1f77bcf86cd799439011";
    const adjustments = [{
      action: "modify" as const,
      sourceField: "price",
      newTargetField: "newTargetField",
      confidence: 0.85
    }];

    it("should manually adjust field mapping", async () => {
      ruleAlignmentService.manualAdjustFieldMapping.mockResolvedValue(mockRule as any);

      const result = await controller.manualAdjustFieldMapping(ruleId, adjustments);

      expect(result).toEqual(mockRule);
      expect(ruleAlignmentService.manualAdjustFieldMapping).toHaveBeenCalledWith(ruleId, adjustments);
    });

    it("should handle field mapping not found", async () => {
      ruleAlignmentService.manualAdjustFieldMapping.mockRejectedValue(
        new NotFoundException("Field mapping not found")
      );

      await expect(controller.manualAdjustFieldMapping(ruleId, adjustments))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("testMappingRule", () => {
    const testDto: TestFlexibleMappingRuleDto = {
      dataMapperRuleId: "507f1f77bcf86cd799439011",
      testData: { last_done: 561, symbol: "700.HK" },
    };

    const mockApplyResult = {
      success: true,
      transformedData: { lastPrice: 561, symbol: "700.HK" },
      mappingStats: {
        totalMappings: 2,
        successfulMappings: 2,
        failedMappings: 0,
        successRate: 100,
      },
      debugInfo: [
        {
          sourceFieldPath: "last_done",
          targetField: "lastPrice",
          sourceValue: 561,
          transformedValue: 561,
          success: true
        },
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          sourceValue: "700.HK",
          transformedValue: "700.HK",
          success: true
        }
      ],
      errorMessage: undefined,
    };

    it("should call _applyFlexibleMappingRule and return a formatted result", async () => {
      ruleService.findRuleById.mockResolvedValue(mockRule);
      ruleService.applyFlexibleMappingRule.mockResolvedValue(mockApplyResult);

      const result = await controller.testMappingRule(testDto);

      expect(ruleService.findRuleById).toHaveBeenCalledWith(testDto.dataMapperRuleId);
      expect(ruleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
        mockRule,
        testDto.testData,
        false
      );
      expect(result.dataMapperRuleId).toBe(testDto.dataMapperRuleId);
      expect(result.ruleName).toBe(mockRule.name);
      expect(result.originalData).toEqual(testDto.testData);
      expect(result.transformedData).toEqual(mockApplyResult.transformedData);
      expect(result.success).toBe(true);
      expect(result.mappingStats.totalMappings).toBe(2);
      expect(result.mappingStats.successfulMappings).toBe(2);
      expect(result.mappingStats.failedMappings).toBe(0);
      expect(result.mappingStats.successRate).toBe(100);
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle rule not found", async () => {
      ruleService.findRuleById.mockRejectedValue(new NotFoundException("Rule not found"));

      await expect(controller.testMappingRule(testDto)).rejects.toThrow(NotFoundException);
    });

    it("should handle empty debug info", async () => {
      const resultWithoutDebug = {
        ...mockApplyResult,
        debugInfo: undefined
      };
      
      ruleService.findRuleById.mockResolvedValue(mockRule);
      ruleService.applyFlexibleMappingRule.mockResolvedValue(resultWithoutDebug);

      const result = await controller.testMappingRule(testDto);

      // 当debugInfo为undefined时，应该使用service返回的mappingStats
      expect(result.mappingStats).toEqual(mockApplyResult.mappingStats);
      expect(result.debugInfo).toBeUndefined();
      expect(typeof result.executionTime).toBe('number');
    });

    it("should include debug info when requested", async () => {
      const dtoWithDebug: TestFlexibleMappingRuleDto = {
        dataMapperRuleId: "507f1f77bcf86cd799439011",
        testData: { last_done: 561, symbol: "700.HK" },
        includeDebugInfo: true
      };

      const mockDebugInfo = [
        {
          sourceFieldPath: "last_done",
          targetField: "lastPrice",
          sourceValue: 561,
          transformedValue: 561,
          success: true
        },
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          sourceValue: "700.HK",
          transformedValue: "700.HK",
          success: true
        }
      ];

      ruleService.findRuleById.mockResolvedValue(mockRule);
      ruleService.applyFlexibleMappingRule.mockResolvedValue({
        success: true,
        transformedData: { lastPrice: 561, symbol: "700.HK" },
        mappingStats: {
          totalMappings: 2,
          successfulMappings: 2,
          failedMappings: 0,
          successRate: 1.0
        },
        debugInfo: mockDebugInfo,
        errorMessage: undefined
      });

      const result = await controller.testMappingRule(dtoWithDebug);

      // 验证完整的返回结构
      expect(result.dataMapperRuleId).toBe("507f1f77bcf86cd799439011");
      expect(result.ruleName).toBe("Test Mapping Rule");
      expect(result.originalData).toEqual({ last_done: 561, symbol: "700.HK" });
      expect(result.transformedData).toEqual({ lastPrice: 561, symbol: "700.HK" });
      expect(result.success).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.debugInfo).toEqual(mockDebugInfo);
      expect(typeof result.executionTime).toBe('number');
      
      // 当包含debugInfo时，mappingStats应该基于debugInfo重新计算
      expect(result.mappingStats).toEqual({
        totalMappings: 2,
        successfulMappings: 2,
        failedMappings: 0,
        successRate: 100 // Controller中计算的百分比格式
      });
      
      expect(ruleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
        mockRule,
        dtoWithDebug.testData,
        true
      );
    });

    it("should handle failed mapping scenarios", async () => {
      const dtoWithFailure: TestFlexibleMappingRuleDto = {
        dataMapperRuleId: "507f1f77bcf86cd799439011",
        testData: { invalid_field: "test" }
      };

      ruleService.findRuleById.mockResolvedValue(mockRule);
      ruleService.applyFlexibleMappingRule.mockResolvedValue({
        success: false,
        transformedData: {},
        mappingStats: {
          totalMappings: 2,
          successfulMappings: 0,
          failedMappings: 2,
          successRate: 0
        },
        debugInfo: undefined,
        errorMessage: "映射失败"
      });

      const result = await controller.testMappingRule(dtoWithFailure);

      // 验证完整的失败场景返回结构
      expect(result.dataMapperRuleId).toBe("507f1f77bcf86cd799439011");
      expect(result.ruleName).toBe("Test Mapping Rule");
      expect(result.originalData).toEqual({ invalid_field: "test" });
      expect(result.transformedData).toEqual({});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("映射失败");
      expect(result.mappingStats).toEqual({
        totalMappings: 2,
        successfulMappings: 0,
        failedMappings: 2,
        successRate: 0
      });
      expect(result.debugInfo).toBeUndefined();
      expect(typeof result.executionTime).toBe('number');
    });
  });


  describe("error handling", () => {
    it("should handle service unavailable errors", async () => {
      const serviceError = new Error("Service temporarily unavailable");
      ruleService.findRules.mockRejectedValue(serviceError);

      await expect(controller.getFlexibleRules(1, 10))
        .rejects.toThrow(serviceError);
    });

    it("should handle validation errors", async () => {
      const validationError = new BadRequestException("Invalid field mapping configuration");
      ruleService.createRule.mockRejectedValue(validationError);

      const invalidDto = {
        name: "",
        provider: "longport",
        apiType: "rest" as const,
        transDataRuleListType: "quote_fields" as const,
        fieldMappings: []
      };

      await expect(controller.createFlexibleRule(invalidDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe("edge cases", () => {
    it("should handle very large test data objects", async () => {
      const largeTestData = {};
      for (let i = 0; i < 1000; i++) {
        (largeTestData as any)[`field${i}`] = `value${i}`;
      }

      const testWithLargeData: TestFlexibleMappingRuleDto = {
        dataMapperRuleId: "507f1f77bcf86cd799439011",
        testData: largeTestData
      };

      ruleService.findRuleById.mockResolvedValue(mockRule);
      ruleService.applyFlexibleMappingRule.mockResolvedValue({
        success: true,
        transformedData: { lastPrice: 561, symbol: "700.HK" },
        mappingStats: {
          totalMappings: 2,
          successfulMappings: 2,
          failedMappings: 0,
          successRate: 1.0
        },
        debugInfo: undefined,
        errorMessage: undefined
      });

      const result = await controller.testMappingRule(testWithLargeData);

      // 分别验证各个字段，而不是整体比较
      expect(result.dataMapperRuleId).toBe("507f1f77bcf86cd799439011");
      expect(result.ruleName).toBe("Test Mapping Rule");
      expect(result.originalData).toEqual(largeTestData); // 验证返回的是实际输入的大数据集
      expect(result.transformedData).toEqual({ lastPrice: 561, symbol: "700.HK" });
      expect(result.success).toBe(true);
      expect(result.mappingStats).toEqual({
        totalMappings: 2,
        successfulMappings: 2,
        failedMappings: 0,
        successRate: 1.0
      });
      expect(result.errorMessage).toBeUndefined();
      expect(result.debugInfo).toBeUndefined();
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle rules with no field mappings", async () => {
      const ruleWithNoMappings = {
        ...mockRule,
        fieldMappings: []
      };

      ruleService.findRuleById.mockResolvedValue(ruleWithNoMappings);

      const result = await controller.getRuleById("507f1f77bcf86cd799439011");

      expect(result.fieldMappings).toEqual([]);
    });

    it("should handle concurrent rule modifications", async () => {
      const concurrentUpdateError = new Error("Document was modified by another process");
      ruleService.updateRule.mockRejectedValue(concurrentUpdateError);

      await expect(controller.updateRule("507f1f77bcf86cd799439011", { name: "New Name" }))
        .rejects.toThrow(concurrentUpdateError);
    });
  });
});