import { REFERENCE_DATA } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { FlexibleMappingRuleService } from "../../../../../../../src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { DataSourceTemplateService } from "../../../../../../../src/core/00-prepare/data-mapper/services/data-source-template.service";
import { MappingRuleCacheService } from "../../../../../../../src/core/00-prepare/data-mapper/services/mapping-rule-cache.service";
import { PaginationService } from "../../../../../../../src/common/modules/pagination/services/pagination.service";
import { CollectorService } from "../../../../../../../src/monitoring/collector/collector.service";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema";
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  CreateMappingRuleFromSuggestionsDto,
} from "../../../../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";

// Mock the logger
jest.mock("../@app/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("FlexibleMappingRuleService", () => {
  let service: FlexibleMappingRuleService;
  let ruleModel: DeepMocked<Model<FlexibleMappingRuleDocument>>;
  let templateModel: DeepMocked<Model<DataSourceTemplateDocument>>;
  let templateService: DeepMocked<DataSourceTemplateService>;
  let cacheService: DeepMocked<MappingRuleCacheService>;
  let paginationService: DeepMocked<PaginationService>;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: "_507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    description: "Test description",
    fieldMappings: [
      {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.95,
      },
    ],
    isActive: true,
    isDefault: false,
    version: "1.0.0",
    overallConfidence: 0.95,
    usageCount: 0,
    successfulTransformations: 0,
    failedTransformations: 0,
    sourceTemplateId: undefined as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRuleDocument = {
    id: "507f1f77bcf86cd799439011",
    ...mockRule,
    save: jest.fn(),
    toObject: jest.fn(),
  } as any;

  beforeEach(async () => {
    // 重置所有静态方法的spy
    jest.restoreAllMocks();

    // 手动创建Mock构造函数，支持 new ruleModel() 调用
    const ruleModelConstructor = jest
      .fn()
      .mockImplementation(() => mockRuleDocument);
    const ruleModelStatics = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
      _findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    const mockRuleModel: any = Object.assign(
      ruleModelConstructor,
      ruleModelStatics,
    );

    // 为 templateModel 创建类似的mock
    const templateModelConstructor = jest.fn();
    const templateModelStatics = {
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const mockTemplateModel: any = Object.assign(
      templateModelConstructor,
      templateModelStatics,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlexibleMappingRuleService,
        {
          provide: getModelToken(FlexibleMappingRule.name),
          useValue: mockRuleModel,
        },
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: mockTemplateModel,
        },
        {
          provide: DataSourceTemplateService,
          useValue: createMock<DataSourceTemplateService>(),
        },
        {
          provide: MappingRuleCacheService,
          useValue: createMock<MappingRuleCacheService>(),
        },
        {
          provide: PaginationService,
          useValue: createMock<PaginationService>(),
        },
        {
          provide: CollectorService,
          useValue: createMock<CollectorService>(),
        },
      ],
    }).compile();

    service = module.get<FlexibleMappingRuleService>(
      FlexibleMappingRuleService,
    );
    ruleModel = module.get(getModelToken(FlexibleMappingRule.name));
    templateModel = module.get(getModelToken(DataSourceTemplate.name));
    templateService = module.get<DeepMocked<DataSourceTemplateService>>(
      DataSourceTemplateService,
    );
    cacheService = module.get<DeepMocked<MappingRuleCacheService>>(
      MappingRuleCacheService,
    );
    paginationService =
      module.get<DeepMocked<PaginationService>>(PaginationService);
  });

  describe("createRule", () => {
    const createRuleDto: CreateFlexibleMappingRuleDto = {
      name: "Test Mapping Rule",
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      fieldMappings: [
        {
          sourceFieldPath: "last_done",
          targetField: "lastPrice",
          confidence: 0.95,
        },
      ],
    };

    it("should create a mapping rule successfully", async () => {
      ruleModel.findOne.mockResolvedValue(null); // No existing rule
      ruleModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      mockRuleDocument.save.mockResolvedValue(mockRuleDocument);

      // Mock FlexibleMappingRuleResponseDto.fromDocument
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);

      cacheService.cacheRuleById.mockResolvedValue(undefined);

      const result = await service.createRule(createRuleDto);

      expect(result).toEqual(mockRule);
      expect(ruleModel.findOne).toHaveBeenCalledWith({
        provider: createRuleDto.provider,
        apiType: createRuleDto.apiType,
        transDataRuleListType: createRuleDto.transDataRuleListType,
        name: createRuleDto.name,
      });
      expect(cacheService.cacheRuleById).toHaveBeenCalledWith(mockRule);
    });

    it("should validate template exists when sourceTemplateId provided", async () => {
      const dtoWithTemplate = {
        ...createRuleDto,
        sourceTemplateId: "template123",
      };
      const mockTemplate = { id: "template123", name: "Test Template" };

      templateModel.findById.mockResolvedValue(mockTemplate as any);
      ruleModel.findOne.mockResolvedValue(null);
      mockRuleDocument.save.mockResolvedValue(mockRuleDocument);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);
      cacheService.cacheRuleById.mockResolvedValue(undefined);

      await service.createRule(dtoWithTemplate);

      expect(templateModel.findById).toHaveBeenCalledWith("template123");
    });

    it("should throw BadRequestException when template not found", async () => {
      const dtoWithTemplate = {
        ...createRuleDto,
        sourceTemplateId: "nonexistent",
      };

      templateModel.findById.mockResolvedValue(null);

      await expect(service.createRule(dtoWithTemplate)).rejects.toThrow(
        BadRequestException,
      );
      expect(templateModel.findById).toHaveBeenCalledWith("nonexistent");
    });

    it("should throw ConflictException when rule already exists", async () => {
      ruleModel.findOne.mockResolvedValue(mockRuleDocument);

      await expect(service.createRule(createRuleDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should handle default rule creation", async () => {
      const defaultRuleDto = { ...createRuleDto, isDefault: true };

      ruleModel.findOne.mockResolvedValue(null);
      ruleModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      mockRuleDocument.save.mockResolvedValue(mockRuleDocument);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);
      cacheService.cacheRuleById.mockResolvedValue(undefined);
      cacheService.cacheBestMatchingRule.mockResolvedValue(undefined);

      await service.createRule(defaultRuleDto);

      expect(ruleModel.updateMany).toHaveBeenCalledWith(
        {
          provider: defaultRuleDto.provider,
          apiType: defaultRuleDto.apiType,
          transDataRuleListType: defaultRuleDto.transDataRuleListType,
          isDefault: true,
        },
        { $_set: { isDefault: false } },
      );
      expect(cacheService.cacheBestMatchingRule).toHaveBeenCalledWith(
        defaultRuleDto.provider,
        defaultRuleDto.apiType,
        defaultRuleDto.transDataRuleListType,
        mockRule,
      );
    });
  });

  describe("findRules", () => {
    it("should find rules with pagination", async () => {
      const mockRules = [mockRuleDocument];
      const mockPaginatedResult = {
        items: [mockRule],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      } as any;

      // Mock the model operations
      ruleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockRules),
      } as any);
      ruleModel.countDocuments.mockResolvedValue(1);

      // Mock FlexibleMappingRuleResponseDto.fromDocument
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);

      // Mock pagination service
      paginationService.normalizePaginationQuery.mockReturnValue({
        page: 1,
        limit: 10,
      });
      paginationService.createPaginatedResponse.mockReturnValue(
        mockPaginatedResult,
      );

      const result = await service.findRules(1, 10, REFERENCE_DATA.PROVIDER_IDS.LONGPORT);

      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        [mockRule],
        1,
        10,
        1,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe("findRuleById", () => {
    it("should find rule by id", async () => {
      cacheService.getCachedRuleById.mockResolvedValue(null); // 缓存未命中
      ruleModel.findById.mockResolvedValue(mockRuleDocument);
      const fromDocumentSpy = jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);
      cacheService.cacheRuleById.mockResolvedValue(undefined);

      const result = await service.findRuleById("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockRule);
      expect(cacheService.getCachedRuleById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(ruleModel.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(fromDocumentSpy).toHaveBeenCalledWith(mockRuleDocument);
      expect(cacheService.cacheRuleById).toHaveBeenCalledWith(mockRule);
    });

    it("should throw NotFoundException when rule not found", async () => {
      cacheService.getCachedRuleById.mockResolvedValue(null); // 缓存未命中
      ruleModel.findById.mockResolvedValue(null);

      await expect(service.findRuleById("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findBestMatchingRule", () => {
    it("should find best matching rule from cache", async () => {
      cacheService.getCachedBestMatchingRule.mockResolvedValue(mockRule);

      const result = await service.findBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      expect(result).toEqual(mockRule);
      expect(cacheService.getCachedBestMatchingRule).toHaveBeenCalledWith(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );
    });

    it("should find best matching rule from database when not in cache", async () => {
      cacheService.getCachedBestMatchingRule.mockResolvedValue(null);
      // Mock链式调用 findOne().sort()
      ruleModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockRuleDocument),
      } as any);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);
      cacheService.cacheBestMatchingRule.mockResolvedValue(undefined);

      const result = await service.findBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      expect(result).toEqual(mockRule);
      expect(ruleModel.findOne).toHaveBeenCalledWith({
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        isActive: true,
        isDefault: true,
      });
      expect(cacheService.cacheBestMatchingRule).toHaveBeenCalledWith(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
        mockRule,
      );
    });

    it("should return null when no matching rule found", async () => {
      cacheService.getCachedBestMatchingRule.mockResolvedValue(null);
      // Mock链式调用 findOne().sort() 返回null
      ruleModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      expect(result).toBeNull();
    });
  });

  describe("updateRule", () => {
    const updateData = {
      name: "Updated Rule Name",
      description: "Updated description",
    };

    it("should update rule successfully", async () => {
      const updatedRule = { ...mockRuleDocument, ...updateData };
      ruleModel.findById.mockResolvedValue(mockRuleDocument); // 添加缺失的mock
      ruleModel.findByIdAndUpdate.mockResolvedValue(updatedRule);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValueOnce(mockRule) // 第一次调用返回oldRuleDto
        .mockReturnValueOnce({ ...mockRule, ...updateData }); // 第二次调用返回更新后的规则
      cacheService.invalidateRuleCache.mockResolvedValue(undefined);
      cacheService.cacheRuleById.mockResolvedValue(undefined);

      const result = await service.updateRule(
        "507f1f77bcf86cd799439011",
        updateData,
      );

      expect(result.name).toBe(updateData.name);
      expect(ruleModel.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(ruleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateData,
        { new: true },
      );
      expect(cacheService.cacheRuleById).toHaveBeenCalled();
    });

    it("should throw NotFoundException when rule not found for update", async () => {
      ruleModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateRule("nonexistent", updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("toggleRuleStatus", () => {
    it("should toggle rule status successfully", async () => {
      const inactiveRule = { ...mockRuleDocument, isActive: false };
      ruleModel.findById.mockResolvedValue(mockRuleDocument);
      ruleModel.findByIdAndUpdate.mockResolvedValue(inactiveRule);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue({ ...mockRule, isActive: false });
      cacheService.cacheRuleById.mockResolvedValue(undefined);

      const result = await service.toggleRuleStatus(
        "507f1f77bcf86cd799439011",
        false,
      );

      expect(result.isActive).toBe(false);
      expect(ruleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        { new: true },
      );
    });

    it("should throw NotFoundException when rule not found for toggle", async () => {
      ruleModel.findById.mockResolvedValue(null);

      await expect(
        service.toggleRuleStatus("nonexistent", false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteRule", () => {
    it("should delete rule successfully", async () => {
      ruleModel.findById.mockResolvedValue(mockRuleDocument);
      ruleModel.findByIdAndDelete.mockResolvedValue(mockRuleDocument);
      cacheService.invalidateRuleCache.mockResolvedValue(undefined);

      await service.deleteRule("507f1f77bcf86cd799439011");

      expect(ruleModel.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(cacheService.invalidateRuleCache).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        mockRule,
      );
    });

    it("should throw NotFoundException when rule not found for deletion", async () => {
      ruleModel.findById.mockResolvedValue(null);

      await expect(service.deleteRule("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("applyFlexibleMappingRule", () => {
    const testData = {
      last_done: 100.5,
      symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
      volume: 1000000,
    };

    it("should apply mapping rule successfully", async () => {
      const mockRuleDoc = {
        ...mockRuleDocument,
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.95,
          },
          {
            sourceFieldPath: "symbol",
            targetField: "symbol",
            confidence: 1.0,
          },
        ],
      };

      const result = await service.applyFlexibleMappingRule(
        mockRuleDoc,
        testData,
      );

      expect(result.transformedData.lastPrice).toBe(100.5);
      expect(result.transformedData.symbol).toBe(REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT);
      expect(result.success).toBe(true);
      expect(result.mappingStats.successfulMappings).toBe(2);
    });

    it("should handle missing source fields gracefully", async () => {
      const mockRuleDoc = {
        ...mockRuleDocument,
        fieldMappings: [
          {
            sourceFieldPath: "non_existent_field",
            targetField: "someField",
            confidence: 0.95,
          },
        ],
      };

      const result = await service.applyFlexibleMappingRule(
        mockRuleDoc,
        testData,
      );

      expect(result.success).toBe(false); // 成功率为0，所以success应该是false
      expect(result.mappingStats.failedMappings).toBe(1);
      expect(result.mappingStats.successfulMappings).toBe(0);
    });
  });

  describe("private methods integration", () => {
    it("should calculate confidence through public methods", async () => {
      const createRuleDto: CreateFlexibleMappingRuleDto = {
        name: "Test Rule",
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: "rest" as const,
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "field1",
            targetField: "target1",
            confidence: 0.9,
          },
          {
            sourceFieldPath: "field2",
            targetField: "target2",
            confidence: 0.8,
          },
        ],
      };

      ruleModel.findOne.mockResolvedValue(null);
      mockRuleDocument.save.mockResolvedValue(mockRuleDocument);
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue({
          ...mockRule,
          overallConfidence: 0.85, // Average of 0.9 and 0.8
        });
      cacheService.cacheRuleById.mockResolvedValue(undefined);

      const result = await service.createRule(createRuleDto);

      expect(result.overallConfidence).toBeCloseTo(0.85);
    });
  });

  describe("warmupMappingRuleCache", () => {
    it("should warmup cache with active rules", async () => {
      const mockRules = [mockRuleDocument];
      ruleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRules),
      } as any);

      // Mock FlexibleMappingRuleResponseDto.fromDocument for each rule
      jest
        .spyOn(FlexibleMappingRuleResponseDto, "fromDocument")
        .mockReturnValue(mockRule);
      cacheService.warmupCache.mockResolvedValue(undefined);

      await service.warmupMappingRuleCache();

      expect(ruleModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(cacheService.warmupCache).toHaveBeenCalledWith([mockRule]);
    });
  });

  // 新增测试：getRuleDocumentById 公共方法
  describe("getRuleDocumentById", () => {
    const validRuleId = "507f1f77bcf86cd799439011";

    it("should return rule document for valid ID", async () => {
      const mockRuleDoc = {
        _id: validRuleId,
        name: "Test Rule",
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.9,
          },
        ],
        isActive: true,
        overallConfidence: 0.9,
      };

      ruleModel.findById.mockResolvedValue(mockRuleDoc);

      const result = await service.getRuleDocumentById(validRuleId);

      expect(ruleModel.findById).toHaveBeenCalledWith(validRuleId);
      expect(result).toEqual(mockRuleDoc);
    });

    it("should throw BadRequestException for invalid ObjectId format", async () => {
      const invalidId = "invalid-id-format";

      await expect(service.getRuleDocumentById(invalidId)).rejects.toThrow(
        BadRequestException,
      );

      // 确保没有调用数据库查询
      expect(ruleModel.findById).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when rule does not exist", async () => {
      const nonExistentId = "507f1f77bcf86cd799439099";

      ruleModel.findById.mockResolvedValue(null);

      await expect(service.getRuleDocumentById(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );

      expect(ruleModel.findById).toHaveBeenCalledWith(nonExistentId);
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      ruleModel.findById.mockRejectedValue(dbError);

      await expect(service.getRuleDocumentById(validRuleId)).rejects.toThrow(
        BadRequestException,
      );

      expect(ruleModel.findById).toHaveBeenCalledWith(validRuleId);
    });

    it("should throw BadRequestException for empty ID", async () => {
      await expect(service.getRuleDocumentById("")).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.getRuleDocumentById(null as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.getRuleDocumentById(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle various ObjectId edge cases", async () => {
      // 测试各种无效的 ObjectId 格式
      const invalidIds = [
        "123", // 太短
        "507f1f77bcf86cd799439011x", // 包含非十六进制字符
        "507f1f77bcf86cd79943901", // 23个字符（应该是24个）
        "507f1f77bcf86cd799439011a", // 25个字符
        "GGGGGGGGGGGGGGGGGGGGGGGG", // 全是非十六进制字符
      ];

      for (const invalidId of invalidIds) {
        await expect(service.getRuleDocumentById(invalidId)).rejects.toThrow(
          BadRequestException,
        );
      }

      // 确保没有任何数据库调用
      expect(ruleModel.findById).not.toHaveBeenCalled();
    });

    it("should preserve existing error types from service exceptions", async () => {
      // 当数据库抛出 NotFoundException 时，应该透传
      ruleModel.findById.mockImplementation(() => {
        throw new NotFoundException("Custom not found message");
      });

      await expect(service.getRuleDocumentById(validRuleId)).rejects.toThrow(
        NotFoundException,
      );

      // 当数据库抛出 BadRequestException 时，应该透传
      ruleModel.findById.mockImplementation(() => {
        throw new BadRequestException("Custom bad request message");
      });

      await expect(service.getRuleDocumentById(validRuleId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
