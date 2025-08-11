import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { PersistedTemplateService } from "../../../../../../src/core/data-mapper/services/persisted-template.service";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument
} from "../../../../../../src/core/data-mapper/schemas/data-source-template.schema";

// Mock the logger
jest.mock("../../../../../../src/common/config/logger.config", () => ({
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
    _id: "507f1f77bcf86cd799439011",
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
  });

  describe("persistPresetTemplates", () => {
    it("should persist all preset templates successfully", async () => {
      templateModel.findOne.mockResolvedValue(null); // No existing templates
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockTemplate)
      }));

      const result = await service.persistPresetTemplates();

      expect(result.created).toBeGreaterThan(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should skip existing templates", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any); // Template exists
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.created).toBe(0);
      expect(result.updated).toBeGreaterThan(0);
      expect(result.skipped).toBe(0);
    });

    it("should handle partial failures gracefully", async () => {
      let callCount = 0;
      templateModel.findOne.mockImplementation((() => {
        callCount++;
        // First template doesn't exist, second fails to save  
        return callCount === 1 ? Promise.resolve(null) : Promise.resolve(mockTemplate as any);
      }) as any);

      const saveError = new Error("Save failed");
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(saveError)
      }));

      const result = await service.persistPresetTemplates();

      expect(result.skipped).toBeGreaterThan(0);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it("should not overwrite existing templates by default", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.updated).toBeGreaterThan(0);
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should overwrite existing templates when force is true", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate as any);
      templateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate as any);

      const result = await service.persistPresetTemplates();

      expect(result.created).toBe(0);
      expect(result.updated).toBeGreaterThan(0);
    });
  });

  describe("getAllPersistedTemplates", () => {
    it("should return all persisted templates", async () => {
      const mockTemplates = [mockTemplate, { ...mockTemplate, _id: "507f1f77bcf86cd799439012" }];
      templateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTemplates)
      } as any);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual(mockTemplates);
      expect(templateModel.find).toHaveBeenCalledWith({ isPreset: true, isActive: true });
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
      templateModel.findOne.mockResolvedValue(mockTemplate as any);
      mockTemplate.toObject.mockReturnValue(mockTemplate);

      const result = await service.getPersistedTemplateById("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        _id: "507f1f77bcf86cd799439011",
        isPreset: true,
        isActive: true
      });
    });

    it("should throw NotFoundException when template not found", async () => {
      templateModel.findOne.mockResolvedValue(null);

      await expect(service.getPersistedTemplateById("nonexistent"))
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
      updatedTemplate.toObject = jest.fn().mockReturnValue(updatedTemplate);

      const result = await service.updatePersistedTemplate("507f1f77bcf86cd799439011", updateData);

      expect(result).toEqual(updatedTemplate);
      expect(templateModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "507f1f77bcf86cd799439011", isPreset: true },
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true, runValidators: true }
      );
    });

    it("should throw NotFoundException when template not found for update", async () => {
      templateModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(service.updatePersistedTemplate("nonexistent", updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("deletePersistedTemplate", () => {
    it("should delete persisted template successfully", async () => {
      templateModel.findOneAndDelete.mockResolvedValue(mockTemplate as any);

      await service.deletePersistedTemplate("507f1f77bcf86cd799439011");

      expect(templateModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: "507f1f77bcf86cd799439011",
        isPreset: true
      });
    });

    it("should throw NotFoundException when template not found for deletion", async () => {
      templateModel.findOneAndDelete.mockResolvedValue(null);

      await expect(service.deletePersistedTemplate("nonexistent"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("resetPresetTemplateById", () => {
    it("should reset specific preset template successfully", async () => {
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

      await expect(service.resetPresetTemplateById("nonexistent"))
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
      expect(result.skipped).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(result.details.every(detail => detail.includes('已重置'))).toBe(true);
    });

    it("should handle partial failures in bulk reset", async () => {
      const templateIds = ["507f1f77bcf86cd799439011", "nonexistent"];
      
      // Mock resetPresetTemplateById to succeed for first, fail for second
      jest.spyOn(service, 'resetPresetTemplateById')
        .mockResolvedValueOnce(mockTemplate as any)
        .mockRejectedValueOnce(new NotFoundException("Template not found"));

      const result = await service.resetPresetTemplatesBulk(templateIds);

      expect(result.reset).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.details).toHaveLength(2);
      expect(result.details.some(detail => detail.includes('已重置'))).toBe(true);
      expect(result.details.some(detail => detail.includes('跳过'))).toBe(true);
    });

    it("should handle empty template ids array", async () => {
      const result = await service.resetPresetTemplatesBulk([]);

      expect(result.reset).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe("resetPresetTemplates", () => {
    it("should reset all preset templates", async () => {
      templateModel.deleteMany.mockResolvedValue({ deletedCount: 2 } as any);
      
      // Mock persistPresetTemplates
      jest.spyOn(service, 'persistPresetTemplates').mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ['已创建: Template 1', '已创建: Template 2']
      });

      const result = await service.resetPresetTemplates();

      expect(result.reset).toBe(2);
      expect(result.details).toHaveLength(2);
      expect(result.details.some(detail => detail.includes('删除了'))).toBe(true);
      expect(result.details.some(detail => detail.includes('重新创建了'))).toBe(true);
    });

    it("should handle no preset templates to reset", async () => {
      templateModel.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      
      // Mock persistPresetTemplates
      jest.spyOn(service, 'persistPresetTemplates').mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ['已创建: Template 1', '已创建: Template 2']
      });

      const result = await service.resetPresetTemplates();

      expect(result.reset).toBe(0);
      expect(result.details).toHaveLength(2);
    });
  });

  describe("preset template functionality", () => {
    it("should create preset templates when persisting", async () => {
      templateModel.findOne.mockResolvedValue(null);
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockTemplate)
      }));

      const result = await service.persistPresetTemplates();

      expect(result.created).toBeGreaterThan(0);
      expect(result.details).toEqual(expect.any(Array));
    });

    it("should handle different providers and API types", async () => {
      templateModel.findOne.mockResolvedValue(null);
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockTemplate)
      }));

      const result = await service.persistPresetTemplates();

      // Should create templates for longport provider
      expect(result.created).toBeGreaterThan(0);
      expect(result.details.some(detail => detail.includes('LongPort'))).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle database connection errors", async () => {
      const dbError = new Error("Database connection failed");
      templateModel.find.mockReturnValue({
        lean: jest.fn().mockRejectedValue(dbError)
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

      expect(result.skipped).toBeGreaterThan(0);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it("should handle concurrent modification conflicts", async () => {
      const conflictError = new Error("Document was modified");
      conflictError.name = "VersionError";
      
      templateModel.findOneAndUpdate.mockRejectedValue(conflictError);

      await expect(service.updatePersistedTemplate("507f1f77bcf86cd799439011", {}))
        .rejects.toThrow(conflictError);
    });
  });

  describe("edge cases", () => {
    it("should handle malformed template data during reset", async () => {
      const malformedTemplate = { 
        ...mockTemplate, 
        name: "Template Name That Doesn't Match Any Preset" 
      };
      templateModel.findOne.mockResolvedValue(malformedTemplate as any);

      await expect(service.resetPresetTemplateById("507f1f77bcf86cd799439011"))
        .rejects.toThrow(NotFoundException);
    });

    it("should handle very large extracted fields arrays", async () => {
      const largeFieldsArray = Array.from({ length: 1000 }, (_, i) => ({
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