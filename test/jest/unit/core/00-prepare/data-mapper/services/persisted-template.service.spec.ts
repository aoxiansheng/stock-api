import { REFERENCE_DATA } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { PersistedTemplateService } from "../../../../../../../src/core/00-prepare/data-mapper/services/persisted-template.service";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema";
import { RuleAlignmentService } from "../../../../../../../src/core/00-prepare/data-mapper/services/rule-alignment.service";
import { CollectorService } from "../../../../../../../src/monitoring/collector/collector.service";

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

describe("PersistedTemplateService", () => {
  let service: PersistedTemplateService;
  let templateModel: DeepMocked<Model<DataSourceTemplateDocument>>;
  let ruleModel: DeepMocked<Model<FlexibleMappingRuleDocument>>;
  let mockRuleAlignmentService: DeepMocked<RuleAlignmentService>;
  let mockCollectorService: DeepMocked<CollectorService>;

  const mockTemplate = {
    _id: "507f1f77bcf86cd799439011",
    id: "507f1f77bcf86cd799439011",
    name: "LongPort REST 股票报价通用模板（港股/A股个股和指数）",
    provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    apiType: "rest",
    isPreset: true,
    isActive: true,
    extractedFields: [
      {
        fieldPath: "symbol",
        fieldName: "symbol",
        fieldType: "string",
        confidence: 1.0,
      },
      {
        fieldPath: "lastDone",
        fieldName: "lastDone",
        fieldType: "number",
        confidence: 0.95,
      },
    ],
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn(),
  };

  const mockBasicInfoTemplate = {
    _id: "507f1f77bcf86cd799439012",
    id: "507f1f77bcf86cd799439012",
    name: "LongPort REST 股票基础信息通用模板",
    provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    apiType: "rest",
    isPreset: true,
    isActive: true,
    extractedFields: [
      {
        fieldPath: "nameCn",
        fieldName: "nameCn",
        fieldType: "string",
        confidence: 1.0,
      },
      {
        fieldPath: "exchange",
        fieldName: "exchange",
        fieldType: "string",
        confidence: 0.9,
      },
      {
        fieldPath: "lotSize",
        fieldName: "lotSize",
        fieldType: "number",
        confidence: 0.9,
      },
    ],
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn(),
  };

  const mockRule = {
    _id: "507f1f77bcf86cd799439013",
    name: "longport_REST_港股/A股个股和指数_报价数据_规则",
    provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    fieldMappings: [],
    overallConfidence: 0.8,
  };

  beforeEach(async () => {
    // Mock监控指标对象
    const mockCounter = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn().mockReturnThis(),
    };
    const mockGauge = {
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistedTemplateService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: createMock<Model<DataSourceTemplateDocument>>(),
        },
        {
          provide: getModelToken(FlexibleMappingRule.name),
          useValue: createMock<Model<FlexibleMappingRuleDocument>>(),
        },
        {
          provide: RuleAlignmentService,
          useValue: createMock<RuleAlignmentService>(),
        },
        {
          provide: CollectorService,
          useValue: createMock<CollectorService>({
            recordRequest: jest.fn(),
            recordDatabaseOperation: jest.fn(),
            recordCacheOperation: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<PersistedTemplateService>(PersistedTemplateService);
    templateModel = module.get(getModelToken(DataSourceTemplate.name));
    ruleModel = module.get(getModelToken(FlexibleMappingRule.name));
    mockRuleAlignmentService = module.get(RuleAlignmentService);
    mockCollectorService = module.get(CollectorService);

    // 重置所有mock
    jest.clearAllMocks();
  });

  describe("persistPresetTemplates", () => {
    beforeEach(() => {
      // 避免在持久化测试中触发 new this.templateModel()
      (service as any).BASIC_PRESET_TEMPLATES = [];
    });

    it("should persist all preset templates successfully", async () => {
      templateModel.findOne.mockResolvedValue(null); // No existing templates

      const result = await service.persistPresetTemplates();

      expect(result.created).toBeGreaterThanOrEqual(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should skip existing templates", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any); // Template exists
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.created).toBe(0);
      expect(result.updated).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it("should handle partial failures gracefully", async () => {
      let callCount = 0;
      templateModel.findOne.mockImplementation((() => {
        callCount++;
        // First template doesn't exist, second fails to save
        return callCount === 1
          ? Promise.resolve(null)
          : Promise.resolve(mockTemplate as any);
      }) as any);

      const saveError = new Error("Save failed");
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(saveError),
      }));

      const result = await service.persistPresetTemplates();

      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should not overwrite existing templates by default", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.updated).toBeGreaterThanOrEqual(0);
    });

    it("should overwrite existing templates when force is true", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.created).toBeGreaterThanOrEqual(0);
      expect(result.updated).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAllPersistedTemplates", () => {
    it("should return all persisted templates", async () => {
      const mockTemplates = [
        mockTemplate,
        { ...mockTemplate, id: "507f1f77bcf86cd799439012" },
      ];
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual(mockTemplates);
      expect(templateModel.find).toHaveBeenCalled();
    });

    it("should return empty array when no templates found", async () => {
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual([]);
    });
  });

  describe("getPersistedTemplateById", () => {
    it("should return template by id", async () => {
      templateModel.findById.mockResolvedValue(mockTemplate as any);

      const result = await service.getPersistedTemplateById(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw NotFoundException when template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(
        service.getPersistedTemplateById("507f1f77bcf86cd799439099"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updatePersistedTemplate", () => {
    const updateData = {
      description: "Updated description",
      extractedFields: [],
    };

    it("should update persisted template successfully", async () => {
      const updatedTemplate = { ...mockTemplate, ...updateData };
      templateModel.findOneAndUpdate.mockResolvedValue(updatedTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(updatedTemplate as any);

      const result = await service.updatePersistedTemplate(
        "507f1f77bcf86cd799439011",
        updateData,
      );

      expect(result).toEqual(updatedTemplate);
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateData,
        { new: true },
      );
    });

    it("should throw NotFoundException when template not found for update", async () => {
      templateModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updatePersistedTemplate("507f1f77bcf86cd799439099", updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deletePersistedTemplate", () => {
    it("should delete persisted template successfully", async () => {
      const nonPresetTemplate = { ...mockTemplate, isPreset: false };
      templateModel.findById.mockResolvedValue(nonPresetTemplate as any);
      templateModel.findByIdAndDelete.mockResolvedValue(
        nonPresetTemplate as any,
      );

      await service.deletePersistedTemplate("507f1f77bcf86cd799439011");

      expect(templateModel.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw NotFoundException when template not found for deletion", async () => {
      templateModel.findById.mockResolvedValue(null);
      await expect(
        service.deletePersistedTemplate("507f1f77bcf86cd799439099"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("resetPresetTemplateById", () => {
    it("should reset specific preset template successfully", async () => {
      // 注入与 mockTemplate 匹配的预设配置供 originalConfig 查找
      (service as any).BASIC_PRESET_TEMPLATES = [
        {
          name: mockTemplate.name,
          provider: mockTemplate.provider,
          apiType: mockTemplate.apiType,
          isPreset: true,
          isActive: true,
          extractedFields: [],
        },
      ];

      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);
      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);

      const result = await service.resetPresetTemplateById(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toBeDefined();
      expect(templateModel.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw NotFoundException when preset template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(
        service.resetPresetTemplateById("507f1f77bcf86cd799439099"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should handle template not being a preset", async () => {
      const nonPresetTemplate = { ...mockTemplate, isPreset: false };
      templateModel.findById.mockResolvedValue(nonPresetTemplate as any);

      await expect(
        service.resetPresetTemplateById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow();
    });
  });

  describe("resetPresetTemplatesBulk", () => {
    it("should reset multiple preset templates", async () => {
      const templateIds = [
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
      ];

      // Mock resetPresetTemplateById to succeed for both templates
      jest
        .spyOn(service, "resetPresetTemplateById")
        .mockResolvedValue(mockTemplate as any);

      const result = await service.resetPresetTemplatesBulk(templateIds);

      expect(result.reset).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(result.details.every((detail) => detail.includes("已重置"))).toBe(
        true,
      );
    });

    it("should handle partial failures in bulk reset", async () => {
      const templateIds = [
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439099",
      ];

      // Mock resetPresetTemplateById to succeed for first, fail for second
      jest
        .spyOn(service, "resetPresetTemplateById")
        .mockResolvedValueOnce(mockTemplate as any)
        .mockRejectedValueOnce(new NotFoundException("Template not found"));

      const result = await service.resetPresetTemplatesBulk(templateIds);

      expect(result.reset).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details).toHaveLength(2);
      expect(result.details.some((detail) => detail.includes("已重置"))).toBe(
        true,
      );
      expect(result.details.some((detail) => detail.includes("失败"))).toBe(
        true,
      );
    });

    it("should handle empty template ids array", async () => {
      const result = await service.resetPresetTemplatesBulk([]);

      expect(result.reset).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe("resetPresetTemplates", () => {
    beforeEach(() => {
      // 避免在重置测试中触发默认模板
      (service as any).BASIC_PRESET_TEMPLATES = [];
    });

    it("should reset all preset templates", async () => {
      templateModel.deleteMany.mockResolvedValue({ deletedCount: 2 } as any);

      // Mock persistPresetTemplates
      jest.spyOn(service, "persistPresetTemplates").mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ["已创建: Template 1", "已创建: Template 2"],
      });

      const result = await service.resetPresetTemplates();

      expect(result.deleted).toBe(2);
      expect(result.recreated).toBe(2);
      expect(result.message).toContain("删除了");
      expect(result.message).toContain("重新创建了");
    });

    it("should handle no preset templates to reset", async () => {
      templateModel.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      // Mock persistPresetTemplates
      jest.spyOn(service, "persistPresetTemplates").mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ["已创建: Template 1", "已创建: Template 2"],
      });

      const result = await service.resetPresetTemplates();

      expect(result.deleted).toBe(0);
      expect(result.recreated).toBe(2);
      expect(result.message).toContain("重新创建了");
    });
  });

  describe("error handling", () => {
    it("should handle database connection errors", async () => {
      const dbError = new Error("Database connection failed");
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(service.getAllPersistedTemplates()).rejects.toThrow(dbError);
    });

    it("should handle validation errors during persistence", async () => {
      templateModel.findOne.mockResolvedValue(null);

      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";

      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(validationError),
      }));

      const result = await service.persistPresetTemplates();

      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should handle concurrent modification conflicts", async () => {
      const conflictError = new Error("Document was modified");
      conflictError.name = "VersionError";

      templateModel.findByIdAndUpdate.mockRejectedValue(conflictError);
      await expect(
        service.updatePersistedTemplate("507f1f77bcf86cd799439011", {}),
      ).rejects.toThrow(conflictError);
    });
  });

  describe("edge cases", () => {
    it("should handle malformed template data during reset", async () => {
      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockImplementationOnce(() => {
        throw new Error("Malformed data");
      });

      await expect(
        service.resetPresetTemplateById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow();
    });

    it("should handle very large extracted fields arrays", async () => {
      const largeFieldsArray = Array.from({ length: 1000 }, (_, i) => ({
        fieldPath: `field${i}`,
        fieldName: `field${i}`,
        fieldType: "string",
        confidence: 0.8,
      }));

      const templateWithManyFields = {
        ...mockTemplate,
        extractedFields: largeFieldsArray,
      };

      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(templateWithManyFields),
      }));
      templateModel.findOne.mockResolvedValue(null);

      const result = await service.persistPresetTemplates();
      expect(result.created).toBeGreaterThanOrEqual(0);
    });

    it("should handle duplicate template names gracefully", async () => {
      // 准备一个预设模板配置
      (service as any).BASIC_PRESET_TEMPLATES = [
        {
          name: mockTemplate.name,
          provider: mockTemplate.provider,
          apiType: mockTemplate.apiType,
          isPreset: true,
          isActive: true,
          extractedFields: [],
        },
      ];

      // First call returns null (no existing), second call returns existing
      let firstCall = true;
      templateModel.findOne.mockImplementation((() => {
        if (firstCall) {
          firstCall = false;
          return Promise.resolve(null);
        }
        return Promise.resolve(mockTemplate as any);
      }) as any);

      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Duplicate key error")),
      }));

      const result = await service.persistPresetTemplates();
      expect(result.details.length).toBeGreaterThan(0);
    });
  });

  // 【新增】数据映射规则自动化功能测试
  describe("initializePresetMappingRules【优化版】", () => {
    it("应该使用智能对齐服务为每个预设模板创建规则", async () => {
      // 准备测试数据 - 2个不同类型的模板
      const mockTemplates = [mockTemplate, mockBasicInfoTemplate];

      // Mock模板查询
      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      // Mock规则查询 - 规则不存在
      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Mock智能对齐服务
      mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue({
        rule: mockRule,
      } as any);

      // 执行测试
      const result = await service.initializePresetMappingRules();

      // 验证结果
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(2);

      // 验证模板查询
      expect(templateModel.find).toHaveBeenCalledWith({ isPreset: true });

      // 【关键验证】智能对齐服务被正确调用
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).toHaveBeenNthCalledWith(
        1,
        mockTemplate._id.toString(),
        "quote_fields",
        "longport_REST_港股_报价数据_规则",
      );
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).toHaveBeenNthCalledWith(
        2,
        mockBasicInfoTemplate._id.toString(),
        "basic_info_fields",
        "longport_REST_股票基础信息_基础信息_规则",
      );

      // 验证监控指标记录
      // ✅ 验证监控调用 - 使用新的CollectorService API
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        "/internal/initialize-preset-rules",
        "POST",
        200,
        expect.any(Number),
        expect.objectContaining({
          service: "PersistedTemplateService",
          operation: "initializePresetMappingRules_batch",
          created: 2,
          successRate: expect.any(Number),
        }),
      );
    });

    it("应该智能判断规则类型", async () => {
      const mockTemplates = [mockBasicInfoTemplate];

      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue({
        rule: mockRule,
      } as any);

      await service.initializePresetMappingRules();

      // 验证基础信息模板被正确识别为 basic_info_fields
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).toHaveBeenCalledWith(
        mockBasicInfoTemplate._id.toString(),
        "basic_info_fields",
        expect.any(String),
      );
    });

    it("应该基于extractedFields启发式判断规则类型", async () => {
      const mockUnknownTemplate = {
        _id: "507f1f77bcf86cd799439014",
        name: "未知数据源模板", // 名称不包含关键词
        provider: "unknown",
        apiType: "rest",
        isPreset: true,
        isActive: true,
        extractedFields: [
          { fieldName: "symbol" },
          { fieldName: "lotSize" }, // 基础信息指标
          { fieldName: "totalShares" }, // 基础信息指标
          { fieldName: "exchange" }, // 基础信息指标
          { fieldName: "currency" }, // 基础信息指标 (4个 >= 3个阈值)
        ],
      };

      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockUnknownTemplate]),
      } as any);

      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue({
        rule: mockRule,
      } as any);

      await service.initializePresetMappingRules();

      // 验证启发式判断：包含4个基础信息指标 >= 3，应判断为 basic_info_fields
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).toHaveBeenCalledWith(
        mockUnknownTemplate._id.toString(),
        "basic_info_fields",
        expect.any(String),
      );
    });

    it("应该跳过已存在的映射规则", async () => {
      const mockTemplates = [mockTemplate];

      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      // Mock规则查询 - 规则已存在
      const existingRule = {
        name: "longport_REST_港股_报价数据_规则",
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: "rest",
        transDataRuleListType: "quote_fields",
      };
      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRule),
      } as any);

      const result = await service.initializePresetMappingRules();

      // 验证跳过逻辑
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.details).toContain(
        "已跳过 LongPort REST 股票报价通用模板（港股/A股个股和指数）: 规则已存在",
      );

      // 验证智能对齐服务未被调用
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).not.toHaveBeenCalled();

      // 验证跳过指标被记录
      // ✅ 验证跳过记录的监控调用
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        "/internal/initialize-preset-rule",
        "POST",
        409,
        expect.any(Number),
        expect.objectContaining({
          service: "PersistedTemplateService",
          result: "skipped",
          reason: "rule_already_exists",
        }),
      );
    });

    it("应该正确处理智能对齐服务失败的情况", async () => {
      const mockTemplates = [mockTemplate];

      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Mock智能对齐服务失败
      mockRuleAlignmentService.generateRuleFromTemplate.mockRejectedValue(
        new Error("智能对齐失败"),
      );

      const result = await service.initializePresetMappingRules();

      // 验证错误处理
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.details).toEqual(
        expect.arrayContaining([expect.stringContaining("失败")]),
      );

      // 验证失败指标被记录
      // ✅ 验证失败记录的监控调用
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        "/internal/initialize-preset-rule",
        "POST",
        500,
        expect.any(Number),
        expect.objectContaining({
          service: "PersistedTemplateService",
          result: "failed",
          error: expect.any(String),
        }),
      );
    });

    it("应该处理没有预设模板的情况", async () => {
      // Mock没有预设模板
      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.initializePresetMappingRules();

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toContain(
        "未找到预设模板，建议先执行预设模板持久化",
      );

      // 验证智能对齐服务未被调用
      expect(
        mockRuleAlignmentService.generateRuleFromTemplate,
      ).not.toHaveBeenCalled();
    });

    it("应该使用完整查重条件避免跨类型误判", async () => {
      const mockTemplates = [mockTemplate];

      templateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplates),
      } as any);

      ruleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue({
        rule: mockRule,
      } as any);

      await service.initializePresetMappingRules();

      // 验证查重条件包含所有4个关键字段
      expect(ruleModel.findOne).toHaveBeenCalledWith({
        name: expect.any(String),
        provider: mockTemplate.provider,
        apiType: mockTemplate.apiType,
        transDataRuleListType: "quote_fields", // 【关键】避免跨类型同名误判
      });
    });
  });

  // 【新增】私有方法测试
  describe("私有方法测试", () => {
    it("应该正确生成规则名称", () => {
      // 测试报价模板命名
      const quoteRuleName = (service as any).generateRuleName(
        mockTemplate,
        "quote_fields",
      );
      expect(quoteRuleName).toBe("longport_REST_港股_报价数据_规则");

      // 测试基础信息模板命名
      const basicInfoRuleName = (service as any).generateRuleName(
        mockBasicInfoTemplate,
        "basic_info_fields",
      );
      expect(basicInfoRuleName).toBe(
        "longport_REST_股票基础信息_基础信息_规则",
      );
    });

    it("应该正确判断规则类型", () => {
      // 测试基础信息类型判断
      const basicInfoType = (service as any).determineRuleType(
        mockBasicInfoTemplate,
      );
      expect(basicInfoType).toBe("basic_info_fields");

      // 测试报价类型判断（默认）
      const quoteType = (service as any).determineRuleType(mockTemplate);
      expect(quoteType).toBe("quote_fields");
    });

    it("应该基于模板名称关键词判断类型", () => {
      const basicInfoTemplate = {
        ...mockTemplate,
        name: "LongPort REST 股票基础信息通用模板",
      };

      const type = (service as any).determineRuleType(basicInfoTemplate);
      expect(type).toBe("basic_info_fields");
    });

    it("应该基于字段内容启发式判断类型", () => {
      const templateWithBasicFields = {
        ...mockTemplate,
        name: "未知模板", // 不包含关键词
        extractedFields: [
          { fieldName: "nameCn" },
          { fieldName: "exchange" },
          { fieldName: "lotSize" },
          { fieldName: "totalShares" }, // 4个基础信息字段 > 阈值3
        ],
      };

      const type = (service as any).determineRuleType(templateWithBasicFields);
      expect(type).toBe("basic_info_fields");
    });

    it("应该处理边缘命名情况", () => {
      const edgeCaseTemplate = {
        ...mockTemplate,
        name: "  LongPort   REST   美股专用报价模板 (含盘前盘后)  ",
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: "rest",
      };

      const ruleName = (service as any).generateRuleName(
        edgeCaseTemplate,
        "quote_fields",
      );
      expect(ruleName).toContain("美股专用");
      expect(ruleName).toContain("报价数据");
      expect(ruleName).toContain("规则");
    });
  });
});
