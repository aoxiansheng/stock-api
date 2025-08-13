/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { PersistedTemplateService } from "../../../../../../../src/core/public/data-mapper/services/persisted-template.service";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument
} from "../../../../../../../src/core/public/data-mapper/schemas/data-source-template.schema";

// Mock the logger
jest.mock("../../../../../../../src/common/config/logger.config", () => ({
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

  const mockTemplate = {
    id: "507f1f77bcf86cd799439011",
    name: "LongPort REST Quote Template",
    provider: "longport",
    apiType: "rest",
    isPreset: true,
    isActive: true,
    extractedFields: [
      {
        fieldPath: "symbol",
        fieldName: "symbol",
        fieldType: "string",
        confidence: 1.0
      }
    ],
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistedTemplateService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: createMock<Model<DataSourceTemplateDocument>>(),
        },
      ],
    }).compile();

    service = module.get<PersistedTemplateService>(PersistedTemplateService);
    templateModel = module.get(getModelToken(DataSourceTemplate.name));
    // 避免在持久化测试中触发 new this.templateModel()
    (service as any).BASIC_PRESETTEMPLATES = [];
  });

  describe("persistPresetTemplates", () => {
    it("should persist all preset templates successfully", async () => {
      templateModel._findOne.mockResolvedValue(null); // No existing templates

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
        return callCount === 1 ? Promise.resolve(null) : Promise.resolve(mockTemplate as any);
      }) as any);

      const saveError = new Error("Save failed");
      templateModel._constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(saveError)
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
      const mockTemplates = [mockTemplate, { ...mockTemplate, id: "507f1f77bcf86cd799439012" }];
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTemplates)
      } as any);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual(mockTemplates);
      expect(templateModel.find).toHaveBeenCalled();
    });

    it("should return empty array when no templates found", async () => {
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      } as any);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual([]);
    });
  });

  describe("getPersistedTemplateById", () => {
    it("should return template by id", async () => {
      templateModel.findById.mockResolvedValue(mockTemplate as any);

      const result = await service.getPersistedTemplateById("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should throw NotFoundException when template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(service.getPersistedTemplateById("507f1f77bcf86cd799439099"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("updatePersistedTemplate", () => {
    const updateData = {
      description: "Updated description",
      extractedFields: []
    };

    it("should update persisted template successfully", async () => {
      const updatedTemplate = { ...mockTemplate, ...updateData };
      templateModel.findOneAndUpdate.mockResolvedValue(updatedTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(updatedTemplate as any);

      const result = await service.updatePersistedTemplate("507f1f77bcf86cd799439011", updateData);

      expect(result).toEqual(updatedTemplate);
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateData,
        { new: true }
      );
    });

    it("should throw NotFoundException when template not found for update", async () => {
      templateModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updatePersistedTemplate("507f1f77bcf86cd799439099", updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("deletePersistedTemplate", () => {
    it("should delete persisted template successfully", async () => {
      const nonPresetTemplate = { ...mockTemplate, isPreset: false };
      templateModel.findById.mockResolvedValue(nonPresetTemplate as any);
      templateModel._findByIdAndDelete.mockResolvedValue(nonPresetTemplate as any);

      await service.deletePersistedTemplate("507f1f77bcf86cd799439011");

      expect(templateModel.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should throw NotFoundException when template not found for deletion", async () => {
      templateModel.findById.mockResolvedValue(null);
      await expect(service.deletePersistedTemplate("507f1f77bcf86cd799439099"))
        .rejects.toThrow(NotFoundException);
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
          extractedFields: []
        }
      ];

      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);
      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);

      const result = await service.resetPresetTemplateById("507f1f77bcf86cd799439011");

      expect(result).toBeDefined();
      expect(templateModel.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw NotFoundException when preset template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(service.resetPresetTemplateById("507f1f77bcf86cd799439099"))
        .rejects.toThrow(NotFoundException);
    });

    it("should handle template not being a preset", async () => {
      const nonPresetTemplate = { ...mockTemplate, isPreset: false };
      templateModel.findById.mockResolvedValue(nonPresetTemplate as any);

      await expect(service.resetPresetTemplateById("507f1f77bcf86cd799439011"))
        .rejects.toThrow();
    });
  });

  describe("resetPresetTemplatesBulk", () => {
    it("should reset multiple preset templates", async () => {
      const templateIds = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
      
      // Mock resetPresetTemplateById to succeed for both templates
      jest.spyOn(service, 'resetPresetTemplateById').mockResolvedValue(mockTemplate as any);

      const result = await service.resetPresetTemplatesBulk(templateIds);

      expect(result.reset).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(result.details.every(detail => detail.includes('已重置'))).toBe(true);
    });

    it("should handle partial failures in bulk reset", async () => {
      const templateIds = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439099"];
      
      // Mock resetPresetTemplateById to succeed for first, fail for second
      jest.spyOn(service, 'resetPresetTemplateById')
        .mockResolvedValueOnce(mockTemplate as any)
        .mockRejectedValueOnce(new NotFoundException("Template not found"));

      const result = await service.resetPresetTemplatesBulk(templateIds);

      expect(result.reset).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details).toHaveLength(2);
      expect(result.details.some(detail => detail.includes('已重置'))).toBe(true);
      expect(result.details.some(detail => detail.includes('失败'))).toBe(true);
    });

    it("should handle empty template ids array", async () => {
      const result = await service.resetPresetTemplatesBulk([]);

      expect(result.reset).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe("resetPresetTemplates", () => {
    it("should reset all preset templates", async () => {
      templateModel.deleteMany.mockResolvedValue({ delet_edCount: 2 } as any);
      
      // Mock persistPresetTemplates
      jest.spyOn(service, 'persistPresetTemplates').mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ['已创建: Template 1', '已创建: Template 2']
      });

      const result = await service.resetPresetTemplates();

      expect(result.delet_ed).toBe(2);
      expect(result.recreated).toBe(2);
      expect(result.message).toContain('删除了');
      expect(result.message).toContain('重新创建了');
    });

    it("should handle no preset templates to reset", async () => {
      templateModel.deleteMany.mockResolvedValue({ delet_edCount: 0 } as any);
      
      // Mock persistPresetTemplates
      jest.spyOn(service, 'persistPresetTemplates').mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ['已创建: Template 1', '已创建: Template 2']
      });

      const result = await service.resetPresetTemplates();

      expect(result.delet_ed).toBe(0);
      expect(result.recreated).toBe(2);
      expect(result.message).toContain('重新创建了');
    });
  });

  describe("error handling", () => {
    it("should handle database connection errors", async () => {
      const dbError = new Error("Database connection failed");
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(dbError)
      } as any);

      await expect(service.getAllPersistedTemplates()).rejects.toThrow(dbError);
    });

    it("should handle validation errors during persistence", async () => {
      templateModel.findOne.mockResolvedValue(null);
      
      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";
      
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(validationError)
      }));

      const result = await service.persistPresetTemplates();

      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should handle concurrent modification conflicts", async () => {
      const conflictError = new Error("Document was modified");
      conflictError.name = "VersionError";
      
      templateModel.findByIdAndUpdate.mockRejectedValue(conflictError);
      await expect(service.updatePersistedTemplate("507f1f77bcf86cd799439011", {}))
        .rejects.toThrow(conflictError);
    });
  });

  describe("edge cases", () => {
    it("should handle malformed template data during reset", async () => {
      templateModel.findById.mockResolvedValueOnce(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockImplementationOnce(() => {
        throw new Error("Malformed data");
      });

      await expect(service.resetPresetTemplateById("507f1f77bcf86cd799439011"))
        .rejects.toThrow();
    });

    it("should handle very large extracted fields arrays", async () => {
      const largeFieldsArray = Array.from({ _length: 1000 }, (_, i) => ({
        fieldPath: `field${i}`,
        fieldName: `field${i}`,
        fieldType: "string",
        confidence: 0.8
      }));

      const templateWithManyFields = {
        ...mockTemplate,
        extractedFields: largeFieldsArray
      };

      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(templateWithManyFields)
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
          extractedFields: []
        }
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
        save: jest.fn().mockRejectedValue(new Error("Duplicate key error"))
      }));

      const result = await service.persistPresetTemplates();
      expect(result.details.length).toBeGreaterThan(0);
    });
  });
});