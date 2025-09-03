import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { DataSourceTemplateService } from "../../../../../../../src/core/00-prepare/data-mapper/services/data-source-template.service";
import { DataSourceAnalyzerService } from "../../../../../../../src/core/00-prepare/data-mapper/services/data-source-analyzer.service";
import { PaginationService } from "../../../../../../../src/common/modules/pagination/services/pagination.service";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema";
import {
  CreateDataSourceTemplateDto,
  DataSourceTemplateResponseDto,
} from "../../../../../../../src/core/00-prepare/data-mapper/dto/data-source-analysis.dto";

// Mock the logger
jest.mock("@app/config/logger.config", () => ({
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
  // 让 templateModel 同时具备构造函数能力与静态方法，因此使用 any 类型简化
  let templateModel: any;
  let analyzerService: DeepMocked<DataSourceAnalyzerService>;
  let paginationService: DeepMocked<PaginationService>;

  // 每个用例创建新的 document，避免状态污染
  const createMockTemplateDocument = () => ({
    id: "507f1f77bcf86cd799439011",
    ...mockTemplate,
    save: jest.fn(),
    toJSON: jest.fn(),
  });

  let mockTemplateDocument: any;

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
        nestingLevel: 0,
      },
    ],

    totalFields: 2,
    confidence: 0.95,
    isActive: true,
    isDefault: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // 为每个测试生成全新的 document，保证隔离
    mockTemplateDocument = createMockTemplateDocument();

    // 构建既可 new 又有静态方法的 Model mock
    const modelStatics = createMock<Model<DataSourceTemplateDocument>>();
    const modelConstructor = jest
      .fn()
      .mockImplementation(() => mockTemplateDocument);
    const mockModel: any = Object.assign(modelConstructor, modelStatics);

    // 明确定义常用的静态方法，避免 undefined
    const staticMethodNames = [
      "findOne",
      "find",
      "_updateMany",
      "countDocuments",
      "aggregate",
      "_findById",
      "_findByIdAndUpdate",
      "_findByIdAndDelete",
    ] as const;
    staticMethodNames.forEach((name) => {
      if (!mockModel[name]) {
        mockModel[name] = jest.fn();
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSourceTemplateService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: mockModel,
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
    analyzerService = module.get<DeepMocked<DataSourceAnalyzerService>>(
      DataSourceAnalyzerService,
    );
    paginationService =
      module.get<DeepMocked<PaginationService>>(PaginationService);

    jest.clearAllMocks();
  });

  describe("createTemplate", () => {
    const createTemplateDto: CreateDataSourceTemplateDto = {
      name: "Test Template",
      provider: "longport",
      apiType: "rest",
      sampleData: { symbol: "700.HK" },

      confidence: 0.9,
      extractedFields: [
        {
          fieldName: "symbol",
          fieldPath: "symbol",
          fieldType: "string",
          sampleValue: "700.HK",
          confidence: 1,
          isNested: false,
          nestingLevel: 0,
        },
      ],
    };

    it("should create a template successfully", async () => {
      templateModel.findOne.mockResolvedValue(null); // No existing template
      templateModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplate(createTemplateDto);

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        name: createTemplateDto.name,
        provider: createTemplateDto.provider,
        apiType: createTemplateDto.apiType,
      });
    });

    it("should throw ConflictException when template already exists", async () => {
      templateModel.findOne.mockResolvedValue(mockTemplateDocument);

      await expect(service.createTemplate(createTemplateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should handle default template creation", async () => {
      const defaultTemplateDto = { ...createTemplateDto, isDefault: true };

      templateModel.findOne.mockResolvedValue(null);
      templateModel.updateMany.mockResolvedValue({ acknowledged: true } as any);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      await service.createTemplate(defaultTemplateDto);

      expect(templateModel.updateMany).toHaveBeenCalledWith(
        {
          provider: defaultTemplateDto.provider,
          apiType: defaultTemplateDto.apiType,
          isDefault: true,
        },
        { $_set: { isDefault: false } },
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
        itemsPerPage: 10,
      };

      // 🎯 修复分页参数Mock
      paginationService.normalizePaginationQuery.mockReturnValue({
        page: 1,
        limit: 10,
      });

      // 🎯 修复方法链调用Mock
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockTemplates),
      };
      templateModel.find.mockReturnValue(mockQuery as any);
      templateModel.countDocuments.mockResolvedValue(1);

      paginationService.createPaginatedResponse.mockReturnValue(
        mockPaginatedResult,
      );

      const result = await service.findTemplates(1, 10, "longport");

      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      expect(result).toEqual(mockPaginatedResult);
    });

    it("should apply filters correctly", async () => {
      const filters = {
        provider: "longport",
        apiType: "rest",
        isActive: true,
        page: 1,
        limit: 10,
      };

      // 🎯 修复分页参数Mock
      paginationService.normalizePaginationQuery.mockReturnValue({
        page: 1,
        limit: 10,
      });

      // 🎯 修复方法链调用Mock
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      templateModel.find.mockReturnValue(mockQuery as any);
      templateModel.countDocuments.mockResolvedValue(0);

      paginationService.createPaginatedResponse.mockReturnValue({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          _hasNext: false,
          _hasPrev: false,
        },
      } as any);

      await service.findTemplates(
        1,
        10,
        filters.provider,
        filters.apiType,
        filters.isActive,
      );

      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
    });
  });

  describe("findTemplateById", () => {
    it("should find template by id", async () => {
      templateModel.findById.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);

      // 🎯 期望的结果应该考虑usageCount和lastUsedAt更新
      const expectedResult = {
        ...mockTemplate,
        usageCount: 1, // 服务会将usageCount+1
        lastUsedAt: expect.any(Date), // 服务会更新lastUsedAt
      };

      mockTemplateDocument.toJSON.mockReturnValue(expectedResult);

      const result = await service.findTemplateById("507f1f77bcf86cd799439011");

      expect(result).toEqual(expectedResult);
      expect(templateModel.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(mockTemplateDocument.save).toHaveBeenCalled(); // 确保保存了更新
    });

    it("should throw BadRequestException for invalid ObjectId format", async () => {
      await expect(service.findTemplateById("nonexistent")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when template not found", async () => {
      templateModel.findById.mockResolvedValue(null);

      await expect(
        service.findTemplateById("507f1f77bcf86cd799439012"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findBestMatchingTemplate", () => {
    it("should find best matching template", async () => {
      // 🎯 修复方法链调用Mock
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockTemplateDocument),
      };
      templateModel.findOne.mockReturnValue(mockQuery as any);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result).toEqual(mockTemplate);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        provider: "longport",
        apiType: "rest",
        isActive: true,
        isDefault: true,
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ usageCount: -1 });
    });

    it("should return null when no matching template found", async () => {
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(null),
      };
      templateModel.findOne.mockReturnValue(mockQuery as any);

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result).toBeNull();
    });

    it("should prioritize default templates", async () => {
      const defaultTemplate = { ...mockTemplateDocument, isDefault: true };
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(defaultTemplate),
      };
      templateModel.findOne.mockReturnValue(mockQuery as any);
      defaultTemplate._toJSON = jest
        .fn()
        .mockReturnValue({ ...mockTemplate, isDefault: true });

      const result = await service.findBestMatchingTemplate("longport", "rest");

      expect(result.isDefault).toBe(true);
      expect(templateModel.findOne).toHaveBeenCalledWith({
        provider: "longport",
        apiType: "rest",
        isActive: true,
        isDefault: true,
      });
    });
  });

  describe("updateTemplate", () => {
    const updateData = {
      name: "Updated Template Name",
      description: "Updated description",
    };

    it("should update template successfully", async () => {
      const updatedTemplate = { ...mockTemplateDocument, ...updateData };
      templateModel.findByIdAndUpdate.mockResolvedValue(updatedTemplate);
      updatedTemplate.toJSON = jest
        .fn()
        .mockReturnValue({ ...mockTemplate, ...updateData });

      const result = await service.updateTemplate(
        "507f1f77bcf86cd799439011",
        updateData,
      );

      expect(result.name).toBe(updateData.name);
      expect(templateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        { ...updateData },
        { new: true },
      );
    });

    it("should throw BadRequestException for invalid ObjectId format in update", async () => {
      await expect(
        service.updateTemplate("nonexistent", updateData),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when template not found for update", async () => {
      templateModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateTemplate("507f1f77bcf86cd799439012", updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template successfully", async () => {
      templateModel.findByIdAndDelete.mockResolvedValue(mockTemplateDocument);

      await service.deleteTemplate("507f1f77bcf86cd799439011");

      expect(templateModel.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw BadRequestException for invalid ObjectId format in delete", async () => {
      await expect(service.deleteTemplate("nonexistent")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when template not found for deletion", async () => {
      templateModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(
        service.deleteTemplate("507f1f77bcf86cd799439012"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTemplateStats", () => {
    it("should return template statistics", async () => {
      // 🎯 修复聚合查询Mock - 分别mock每个查询
      (templateModel.countDocuments as jest.Mock).mockImplementation(
        (filter) => {
          if (!filter) return Promise.resolve(10); // total
          if (filter?.isActive === true) return Promise.resolve(8); // active
          if (filter?.isDefault === true) return Promise.resolve(2); // defaults
          return Promise.resolve(0);
        },
      );

      (templateModel.aggregate as jest.Mock).mockImplementation((pipeline) => {
        const groupStage = pipeline[0] as any;
        if (groupStage?.$group?._id === "$provider") {
          return Promise.resolve([
            { id: "longport", count: 5 },
            { id: "custom", count: 5 },
          ]);
        }
        if (groupStage?.$group?._id === "$apiType") {
          return Promise.resolve([
            { id: "rest", count: 7 },
            { id: "stream", count: 3 },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getTemplateStats();

      expect(result).toEqual({
        totalTemplates: 10,
        byProvider: { longport: 5, custom: 5 },
        byApiType: { rest: 7, stream: 3 },
        activeTemplates: 8,
        defaultTemplates: 2,
      });
    });

    it("should handle empty stats", async () => {
      // 🎯 修复空统计Mock
      templateModel.countDocuments.mockResolvedValue(0);
      templateModel.aggregate.mockResolvedValue([]);

      const result = await service.getTemplateStats();

      expect(result).toEqual({
        totalTemplates: 0,
        byProvider: {},
        byApiType: {},
        activeTemplates: 0,
        defaultTemplates: 0,
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
          nestingLevel: 0,
        },
      ],
      confidence: 0.95,
    };

    it("should create template from analysis data", async () => {
      // 🎯 Mock analyzerService
      analyzerService.analyzeDataSource.mockResolvedValue({
        provider: analysisData.provider,
        apiType: analysisData.apiType,
        sampleData: analysisData.sampleData,
        extractedFields: analysisData.extractedFields,

        totalFields: analysisData.extractedFields.length,
        confidence: analysisData.confidence,
        analysisTimestamp: new Date(),
      } as any);

      // 🎯 Mock template creation
      templateModel.findOne.mockResolvedValue(null);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplateFromAnalysis(analysisData);

      expect(result).toEqual(mockTemplate);
      expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
        analysisData.sampleData,
        analysisData.provider,
        analysisData.apiType,
      );
      expect(mockTemplateDocument.save).toHaveBeenCalled();
    });

    it("should handle analysis data with nested fields", async () => {
      const nestedAnalysisData = {
        ...analysisData,
        name: "Nested Analysis Template", // 使用不同的名称避免冲突
        extractedFields: [
          {
            fieldPath: "quote.symbol",
            fieldName: "symbol",
            fieldType: "string",
            sampleValue: "700.HK",
            confidence: 0.9,
            isNested: true,
            nestingLevel: 1,
          },
        ],
      };

      // 🎯 Mock analyzerService for nested data
      analyzerService.analyzeDataSource.mockResolvedValue({
        provider: nestedAnalysisData.provider,
        apiType: nestedAnalysisData.apiType,
        sampleData: nestedAnalysisData.sampleData,
        extractedFields: nestedAnalysisData.extractedFields,

        totalFields: nestedAnalysisData.extractedFields.length,
        confidence: 0.9,
        analysisTimestamp: new Date(),
      } as any);

      // 🎯 Mock template creation
      templateModel.findOne.mockResolvedValue(null);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result =
        await service.createTemplateFromAnalysis(nestedAnalysisData);

      expect(result).toEqual(mockTemplate);
      expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
        nestedAnalysisData.sampleData,
        nestedAnalysisData.provider,
        nestedAnalysisData.apiType,
      );
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const error = new Error("Database connection error");
      templateModel.findById.mockRejectedValue(error);

      // 🎯 期望服务包装的错误消息
      await expect(
        service.findTemplateById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow(
        new BadRequestException("查找模板失败: Database connection error"),
      );
    });

    it("should handle validation errors", async () => {
      const validationError = new Error("Validation failed");
      validationError.name = "ValidationError";

      const mockFailedDocument = {
        save: jest.fn().mockRejectedValue(validationError),
      };

      (templateModel as any).mockImplementation(() => mockFailedDocument);

      const createDto: CreateDataSourceTemplateDto = {
        name: "",
        provider: "longport",
        apiType: "rest",
        sampleData: {},

        confidence: 0.5,
        extractedFields: [],
      };

      templateModel.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(createDto)).rejects.toThrow(
        validationError,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle templates with no fields", async () => {
      const noFieldsDto: CreateDataSourceTemplateDto = {
        name: "Empty Template",
        provider: "test",
        apiType: "rest",
        sampleData: {},

        confidence: 0.5,
        extractedFields: [],
      };

      templateModel.findOne.mockResolvedValue(null);
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
        extractedFields: [
          {
            fieldPath: "field",
            fieldName: "field",
            fieldType: "string",
            sampleValue: "value",
            confidence: 0.999999,
            isNested: false,
            nestingLevel: 0,
          },
        ],
        confidence: 0.999999,
      };

      // 🎯 Mock analyzerService
      analyzerService.analyzeDataSource.mockResolvedValue({
        provider: highConfidenceAnalysis.provider,
        apiType: highConfidenceAnalysis.apiType,
        sampleData: highConfidenceAnalysis.sampleData,
        extractedFields: highConfidenceAnalysis.extractedFields,

        totalFields: highConfidenceAnalysis.extractedFields.length,
        confidence: highConfidenceAnalysis.confidence,
        analysisTimestamp: new Date(),
      } as any);

      // 🎯 Mock template creation
      templateModel.findOne.mockResolvedValue(null);
      mockTemplateDocument.save.mockResolvedValue(mockTemplateDocument);
      mockTemplateDocument.toJSON.mockReturnValue(mockTemplate);

      const result = await service.createTemplateFromAnalysis(
        highConfidenceAnalysis,
      );

      expect(result).toEqual(mockTemplate);
      expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
        highConfidenceAnalysis.sampleData,
        highConfidenceAnalysis.provider,
        highConfidenceAnalysis.apiType,
      );
    });
  });
});
