import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { DataSourceTemplateService } from "../../../../../../src/core/data-mapper/services/data-source-template.service";
import { DataSourceAnalyzerService } from "../../../../../../src/core/data-mapper/services/data-source-analyzer.service";
import { PaginationService } from "../../../../../../src/common/modules/pagination/services/pagination.service";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument
} from "../../../../../../src/core/data-mapper/schemas/data-source-template.schema";
import {
  CreateDataSourceTemplateDto,
  DataSourceTemplateResponseDto
} from "../../../../../../src/core/data-mapper/dto/data-source-analysis.dto";

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

describe("DataSourceTemplateService", () => {
  let service: DataSourceTemplateService;
  let templateModel: DeepMocked<Model<DataSourceTemplateDocument>>;
  let analyzerService: DeepMocked<DataSourceAnalyzerService>;
  let paginationService: DeepMocked<PaginationService>;

  const mockTemplate: DataSourceTemplateResponseDto = {
    id: "507f1f77bcf86cd799439011",
    name: "LongPort Quote Template",
    provider: "longport",
    apiType: "rest",
    description: "LongPort stock quote template",
    sampleData: { symbol: "700.HK", last_done: 561 },
    extractedFields: [
      {
        fieldPath: "symbol",
        fieldName: "symbol",
        fieldType: "string",
        sampleValue: "700.HK",
        confidence: 1.0,
        isNested: false,
        nestingLevel: 0
      }
    ],
    dataStructureType: "flat",
    totalFields: 2,
    confidence: 0.95,
    isActive: true,
    isDefault: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTemplateDocument = {
    _id: "507f1f77bcf86cd799439011",
    ...mockTemplate,
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn()
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSourceTemplateService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: createMock<Model<DataSourceTemplateDocument>>(),
        },
        {
          provide: DataSourceAnalyzerService,
          useValue: createMock<DataSourceAnalyzerService>(),
        },
        {
          provide: PaginationService,
          useValue: createMock<PaginationService>(),
        },
      ],
    }).compile();

    service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
    templateModel = module.get(getModelToken(DataSourceTemplate.name));
    analyzerService = module.get<DeepMocked<DataSourceAnalyzerService>>(DataSourceAnalyzerService);
    paginationService = module.get<DeepMocked<PaginationService>>(PaginationService);
  });

  describe("createTemplate", () => {
    const createTemplateDto: CreateDataSourceTemplateDto = {
      name: "Test Template",
      provider: "longport",
      apiType: "rest",
      sampleData: { symbol: "700.HK" },
      dataStructureType: "flat",
      confidence: 0.9,
      extractedFields: [
        {
          fieldName: "symbol",
          fieldPath: "symbol",
          fieldType: "string",
          sampleValue: "700.HK",
          confidence: 1,
          isNested: false,
          nestingLevel: 0
        }
      ]
    };

    it("should create a template successfully", async () => {
      templateModel.findOne.mockResolvedValue(null); // No existing template
      templateModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplate(createTemplateDto);

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        name: createTemplateDto.name,
        provider: createTemplateDto.provider,
        apiType: createTemplateDto.apiType
      });
    });

    it("should throw BadRequestException when template already exists", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplateDocument);

      await expect(service.createTemplate(createTemplateDto)).rejects.toThrow(BadRequestException);
    });

    it("should handle default template creation", async () => {
      const defaultTemplateDto = { ...createTemplateDto, isDefault: true };

      templateModel.findOne.mockResolvedValue(null);
      templateModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      await service.createTemplate(defaultTemplateDto);

      expect(templateModel.updateMany).toHaveBeenCalledWith(
        {
          provider: defaultTemplateDto.provider,
          apiType: defaultTemplateDto.apiType,
          isDefault: true
        },
        { $set: { isDefault: false } }
      );
    });
  });

  describe("findTemplates", () => {
    it("should find templates with pagination", async () => {
      const mockTemplates = [mockTemplateDocument];
      const mockPaginatedResult: any = {
        items: mockTemplates,
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10
      };

      (paginationService.createPaginatedResponse as jest.Mock).mockResolvedValue(mockPaginatedResult as any);

      const result = await service.findTemplates(1,10,"longport");

      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      expect(result).toEqual(mockPaginatedResult);
    });

    it("should apply filters correctly", async () => {
      const filters = {
        provider: "longport",
        apiType: "rest",
        isActive: true,
        page: 1,
        limit: 10
      };

      (paginationService.createPaginatedResponse as jest.Mock).mockResolvedValue({
        items: [],
        pagination: {page:1,limit:10,total:0,totalPages:0,hasNext:false,hasPrev:false}
      } as any);

      await service.findTemplates(1,10,filters.provider,filters.apiType,filters.isActive);

      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
    });
  });

  describe("findTemplateById", () => {
    it("should find template by id", async () => {
      templateModel.findById.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.findTemplateById("507f1f77bcf86cd799439011");

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should throw NotFoundException when template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(service.findTemplateById("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findBestMatchingTemplate", () => {
    it("should find best matching template", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        provider: "longport",
        apiType: "rest",
        isActive: true
      });
    });

    it("should return null when no matching template found", async () => {
      templateModel.findOne.mockResolvedValue(null);

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result).toBeNull();
    });

    it("should prioritize default templates", async () => {
      const defaultTemplate = { ...mockTemplateDocument, isDefault: true };
      templateModel.findOne.mockResolvedValueOnce(defaultTemplate);
      mockTemplateDocument.toJSON.mockReturnValue({ ...mockTemplate, isDefault: true });

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result.isDefault).toBe(true);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        provider: "longport",
        apiType: "rest",
        isActive: true
      });
    });
  });

  describe("updateTemplate", () => {
    const updateData = {
      name: "Updated Template Name",
      description: "Updated description"
    };

    it("should update template successfully", async () => {
      const updatedTemplate = { ...mockTemplateDocument, ...updateData };
      templateModel.findByIdAndUpdate.mockResolvedValue(updatedTemplate);
      updatedTemplate.toJSON = jest.fn().mockReturnValue({ ...mockTemplate, ...updateData });

      const result = await service.updateTemplate("507f1f77bcf86cd799439011", updateData);

      expect(result.name).toBe(updateData.name);
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true, runValidators: true }
      );
    });

    it("should throw NotFoundException when template not found for update", async () => {
      templateModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateTemplate("nonexistent", updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template successfully", async () => {
      templateModel.findByIdAndDelete.mockResolvedValue(mockTemplateDocument);

      await service.deleteTemplate("507f1f77bcf86cd799439011");

      expect(templateModel.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });

    it("should throw NotFoundException when template not found for deletion", async () => {
      templateModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.deleteTemplate("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTemplateStats", () => {
    it("should return template statistics", async () => {
      const mockStats = [
        {
          _id: null,
          totalTemplates: 10,
          activeTemplates: 8,
          avgConfidence: 0.85
        }
      ];

      templateModel.aggregate.mockResolvedValue(mockStats);

      const result = await service.getTemplateStats();

      expect(result).toEqual({
        totalTemplates: 10,
        activeTemplates: 8,
        inactiveTemplates: 2,
        avgConfidence: 0.85
      });
    });

    it("should handle empty stats", async () => {
      templateModel.aggregate.mockResolvedValue([]);

      const result = await service.getTemplateStats();

      expect(result).toEqual({
        totalTemplates: 0,
        activeTemplates: 0,
        inactiveTemplates: 0,
        avgConfidence: 0
      });
    });
  });

  describe("createTemplateFromAnalysis", () => {
    const analysisData = {
      name: "Analysis Template",
      provider: "longport",
      apiType: "rest" as const,
      sampleData: { symbol: "700.HK", price: 561 },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          sampleValue: "700.HK",
          confidence: 1.0,
          isNested: false,
          nestingLevel: 0
        }
      ],
      confidence: 0.95
    };

    it("should create template from analysis data", async () => {
      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplateFromAnalysis(analysisData);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplateDocument.save).toHaveBeenCalled();
    });

    it("should handle analysis data with nested fields", async () => {
      const nestedAnalysisData = {
        ...analysisData,
        extractedFields: [
          {
            fieldPath: "quote.symbol",
            fieldName: "symbol",
            fieldType: "string",
            sampleValue: "700.HK",
            confidence: 0.9,
            isNested: true,
            nestingLevel: 1
          }
        ]
      };

      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplateFromAnalysis(nestedAnalysisData);

      expect(result).toEqual(mockTemplate);
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const error = new Error("Database connection error");
      templateModel.findById.mockRejectedValue(error);

      await expect(service.findTemplateById("507f1f77bcf86cd799439011")).rejects.toThrow(error);
    });

    it("should handle validation errors", async () => {
      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";
      
      templateModel.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(validationError)
      }));

      const createDto: CreateDataSourceTemplateDto = {
        name: "",
        provider: "longport",
        apiType: "rest",
        sampleData: {},
        dataStructureType: "flat",
        confidence: 0.5,
        extractedFields: []
      };

      templateModel.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(createDto)).rejects.toThrow(validationError);
    });
  });

  describe("edge cases", () => {
    it("should handle templates with no fields", async () => {
      const noFieldsDto: CreateDataSourceTemplateDto = {
        name: "Empty Template",
        provider: "test",
        apiType: "rest",
        sampleData: {},
        dataStructureType: "flat",
        confidence: 0.5,
        extractedFields: []
      };

      templateModel.findOne.mockResolvedValue(null);
      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplate(noFieldsDto);

      expect(result).toEqual(mockTemplate);
    });

    it("should handle very large confidence values", async () => {
      const highConfidenceAnalysis = {
        name: "High Confidence Template",
        provider: "test",
        apiType: "rest" as const,
        sampleData: { field: "value" },
        extractedFields: [{
          fieldPath: "field",
          fieldName: "field",
          fieldType: "string",
          sampleValue: "value",
          confidence: 0.999999,
          isNested: false,
          nestingLevel: 0
        }],
        confidence: 0.999999
      };

      templateModel.constructor = jest.fn().mockImplementation(() => mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplateFromAnalysis(highConfidenceAnalysis);

      expect(result).toEqual(mockTemplate);
    });
  });
});