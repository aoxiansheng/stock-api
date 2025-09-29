import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DataSourceTemplateService } from '../../../../../../../src/core/00-prepare/data-mapper/services/data-source-template.service';
import { DataSourceAnalyzerService } from '../../../../../../../src/core/00-prepare/data-mapper/services/data-source-analyzer.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import {
  CreateDataSourceTemplateDto,
  DataSourceTemplateResponseDto,
  ExtractedFieldDto,
  DataSourceAnalysisResponseDto
} from '../../../../../../../src/core/00-prepare/data-mapper/dto/data-source-analysis.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('DataSourceTemplateService', () => {
  let service: DataSourceTemplateService;
  let mockTemplateModel: jest.Mocked<any>;
  let mockPaginationService: jest.Mocked<PaginationService>;
  let mockAnalyzerService: jest.Mocked<DataSourceAnalyzerService>;

  const mockTemplateId = '507f1f77bcf86cd799439011';

  const mockExtractedField: ExtractedFieldDto = {
    fieldName: 'symbol',
    fieldType: 'string',
    fieldPath: 'symbol',
    sampleValue: 'AAPL',
    confidence: 0.95,
    isNested: false,
    nestingLevel: 0,
  };

  const mockTemplate = {
    _id: mockTemplateId,
    name: 'test_template',
    provider: 'test_provider',
    apiType: 'rest',
    description: 'Test template description',
    sampleData: { symbol: 'AAPL', price: 150.25 },
    extractedFields: [mockExtractedField],
    confidence: 0.95,
    isDefault: false,
    isActive: true,
    usageCount: 5,
    lastUsedAt: new Date('2023-12-01T10:00:00Z'),
    createdAt: new Date('2023-11-01T10:00:00Z'),
    save: jest.fn().mockReturnThis(),
  };

  const mockCreateDto: CreateDataSourceTemplateDto = {
    name: 'new_template',
    provider: 'new_provider',
    apiType: 'stream',
    description: 'New template description',
    sampleData: { symbol: 'GOOGL', price: 2800.50 },
    extractedFields: [mockExtractedField],
    confidence: 0.88,
    isDefault: true,
  };

  beforeEach(async () => {
    const mockModelMethods = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      updateMany: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockTemplateModel = {
      ...mockModelMethods,
      // Constructor mock for new this.templateModel()
      prototype: {
        save: jest.fn(),
      },
    };

    // Mock the constructor behavior
    mockTemplateModel.mockImplementation((data) => ({
      ...data,
      _id: mockTemplateId,
      save: jest.fn().mockResolvedValue({ ...data, _id: mockTemplateId }),
    }));

    mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockReturnValue({ page: 1, limit: 10 }),
      createPaginatedResponse: jest.fn().mockReturnValue({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }),
    } as any;

    mockAnalyzerService = {
      analyzeDataSource: jest.fn().mockResolvedValue({
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: { symbol: 'AAPL', price: 150.25 },
        totalFields: 2,
        extractedFields: [mockExtractedField],
        confidence: 0.95,
        analysisTimestamp: new Date(),
      } as DataSourceAnalysisResponseDto),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSourceTemplateService,
        {
          provide: getModelToken('DataSourceTemplate'),
          useValue: mockTemplateModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: DataSourceAnalyzerService,
          useValue: mockAnalyzerService,
        },
      ],
    }).compile();

    service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of DataSourceTemplateService', () => {
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      mockTemplateModel.findOne.mockResolvedValue(null);
      mockTemplateModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const mockSavedTemplate = {
        ...mockCreateDto,
        _id: mockTemplateId,
        isActive: true,
        usageCount: 0,
        lastUsedAt: expect.any(Date),
        createdAt: expect.any(Date),
      };

      const mockCreatedTemplate = {
        ...mockSavedTemplate,
        save: jest.fn().mockResolvedValue(mockSavedTemplate),
      };

      mockTemplateModel.mockReturnValue(mockCreatedTemplate);

      // Mock the static method
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockSavedTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.createTemplate(mockCreateDto);

      expect(result).toBeDefined();
      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({
        name: mockCreateDto.name,
        provider: mockCreateDto.provider,
        apiType: mockCreateDto.apiType,
      });
      expect(mockTemplateModel.updateMany).toHaveBeenCalledWith(
        { provider: mockCreateDto.provider, apiType: mockCreateDto.apiType, isDefault: true },
        { $set: { isDefault: false } },
      );
    });

    it('should throw error if template already exists', async () => {
      mockTemplateModel.findOne.mockResolvedValue(mockTemplate);

      await expect(service.createTemplate(mockCreateDto)).rejects.toThrow();
      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({
        name: mockCreateDto.name,
        provider: mockCreateDto.provider,
        apiType: mockCreateDto.apiType,
      });
    });

    it('should not update other templates if isDefault is false', async () => {
      const nonDefaultDto = { ...mockCreateDto, isDefault: false };
      mockTemplateModel.findOne.mockResolvedValue(null);

      const mockSavedTemplate = {
        ...nonDefaultDto,
        _id: mockTemplateId,
        isActive: true,
        usageCount: 0,
      };

      const mockCreatedTemplate = {
        ...mockSavedTemplate,
        save: jest.fn().mockResolvedValue(mockSavedTemplate),
      };

      mockTemplateModel.mockReturnValue(mockCreatedTemplate);
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockSavedTemplate,
        id: mockTemplateId,
      } as any);

      await service.createTemplate(nonDefaultDto);

      expect(mockTemplateModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findTemplates', () => {
    it('should return paginated templates with default parameters', async () => {
      const mockTemplates = [mockTemplate];
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue(mockTemplates),
        sort: jest.fn().mockReturnThis(),
      };

      mockTemplateModel.find.mockReturnValue(mockQuery);
      mockTemplateModel.countDocuments.mockResolvedValue(1);

      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockTemplate,
        id: mockTemplateId,
      } as any);

      const mockPaginatedResponse = {
        items: [{ ...mockTemplate, id: mockTemplateId }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockPaginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResponse);

      const result = await service.findTemplates();

      expect(result).toEqual(mockPaginatedResponse);
      expect(mockPaginationService.normalizePaginationQuery).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
      });
      expect(mockTemplateModel.find).toHaveBeenCalledWith({});
    });

    it('should filter templates by provider and apiType', async () => {
      const mockTemplates = [mockTemplate];
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue(mockTemplates),
        sort: jest.fn().mockReturnThis(),
      };

      mockTemplateModel.find.mockReturnValue(mockQuery);
      mockTemplateModel.countDocuments.mockResolvedValue(1);

      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockTemplate,
        id: mockTemplateId,
      } as any);

      await service.findTemplates(1, 10, 'test_provider', 'rest', true);

      expect(mockTemplateModel.find).toHaveBeenCalledWith({
        provider: 'test_provider',
        apiType: 'rest',
        isActive: true,
      });
    });

    it('should handle empty results', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue([]),
        sort: jest.fn().mockReturnThis(),
      };

      mockTemplateModel.find.mockReturnValue(mockQuery);
      mockTemplateModel.countDocuments.mockResolvedValue(0);

      const mockEmptyResponse = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockPaginationService.createPaginatedResponse.mockReturnValue(mockEmptyResponse);

      const result = await service.findTemplates();

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findTemplateById', () => {
    it('should return template and update usage statistics', async () => {
      const mockFoundTemplate = {
        ...mockTemplate,
        save: jest.fn().mockResolvedValue(mockTemplate),
      };

      mockTemplateModel.findById.mockResolvedValue(mockFoundTemplate);
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.findTemplateById(mockTemplateId);

      expect(result).toBeDefined();
      expect(mockTemplateModel.findById).toHaveBeenCalledWith(mockTemplateId);
      expect(mockFoundTemplate.usageCount).toBe(6); // Original 5 + 1
      expect(mockFoundTemplate.save).toHaveBeenCalled();
    });

    it('should throw error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id';

      await expect(service.findTemplateById(invalidId)).rejects.toThrow();
    });

    it('should throw NotFoundException if template not found', async () => {
      mockTemplateModel.findById.mockResolvedValue(null);

      await expect(service.findTemplateById(mockTemplateId)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const databaseError = new Error('Database connection failed');
      mockTemplateModel.findById.mockRejectedValue(databaseError);

      await expect(service.findTemplateById(mockTemplateId)).rejects.toThrow();
    });
  });

  describe('findBestMatchingTemplate', () => {
    it('should return default template if available', async () => {
      const defaultTemplate = { ...mockTemplate, isDefault: true };
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(defaultTemplate),
      };

      mockTemplateModel.findOne.mockReturnValue(mockQuery);
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...defaultTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.findBestMatchingTemplate('test_provider', 'rest');

      expect(result).toBeDefined();
      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({
        provider: 'test_provider',
        apiType: 'rest',
        isActive: true,
        isDefault: true,
      });
    });

    it('should return most used template if no default available', async () => {
      const mockQuery1 = {
        sort: jest.fn().mockResolvedValue(null),
      };
      const mockQuery2 = {
        sort: jest.fn().mockResolvedValue(mockTemplate),
      };

      mockTemplateModel.findOne
        .mockReturnValueOnce(mockQuery1)
        .mockReturnValueOnce(mockQuery2);

      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.findBestMatchingTemplate('test_provider', 'rest');

      expect(result).toBeDefined();
      expect(mockTemplateModel.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null if no matching template found', async () => {
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(null),
      };

      mockTemplateModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findBestMatchingTemplate('nonexistent_provider', 'rest');

      expect(result).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const updateData = { description: 'Updated description' };
      const updatedTemplate = { ...mockTemplate, ...updateData };

      mockTemplateModel.findByIdAndUpdate.mockResolvedValue(updatedTemplate);
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...updatedTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.updateTemplate(mockTemplateId, updateData);

      expect(result).toBeDefined();
      expect(mockTemplateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTemplateId,
        updateData,
        { new: true },
      );
    });

    it('should throw error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id';
      const updateData = { description: 'Updated description' };

      await expect(service.updateTemplate(invalidId, updateData)).rejects.toThrow();
    });

    it('should throw NotFoundException if template not found', async () => {
      const updateData = { description: 'Updated description' };
      mockTemplateModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateTemplate(mockTemplateId, updateData)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const updateData = { description: 'Updated description' };
      const databaseError = new Error('Database update failed');
      mockTemplateModel.findByIdAndUpdate.mockRejectedValue(databaseError);

      await expect(service.updateTemplate(mockTemplateId, updateData)).rejects.toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockTemplateModel.findByIdAndDelete.mockResolvedValue(mockTemplate);

      await service.deleteTemplate(mockTemplateId);

      expect(mockTemplateModel.findByIdAndDelete).toHaveBeenCalledWith(mockTemplateId);
    });

    it('should throw error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id';

      await expect(service.deleteTemplate(invalidId)).rejects.toThrow();
    });

    it('should throw NotFoundException if template not found', async () => {
      mockTemplateModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.deleteTemplate(mockTemplateId)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const databaseError = new Error('Database deletion failed');
      mockTemplateModel.findByIdAndDelete.mockRejectedValue(databaseError);

      await expect(service.deleteTemplate(mockTemplateId)).rejects.toThrow();
    });
  });

  describe('getTemplateStats', () => {
    it('should return comprehensive template statistics', async () => {
      const mockStats = {
        total: 10,
        byProvider: [
          { _id: 'provider1', count: 5 },
          { _id: 'provider2', count: 3 },
          { _id: 'provider3', count: 2 },
        ],
        byApiType: [
          { _id: 'rest', count: 7 },
          { _id: 'stream', count: 3 },
        ],
        active: 8,
        defaults: 3,
      };

      mockTemplateModel.countDocuments
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.active)
        .mockResolvedValueOnce(mockStats.defaults);

      mockTemplateModel.aggregate
        .mockResolvedValueOnce(mockStats.byProvider)
        .mockResolvedValueOnce(mockStats.byApiType);

      const result = await service.getTemplateStats();

      expect(result).toEqual({
        totalTemplates: 10,
        byProvider: {
          provider1: 5,
          provider2: 3,
          provider3: 2,
        },
        byApiType: {
          rest: 7,
          stream: 3,
        },
        activeTemplates: 8,
        defaultTemplates: 3,
      });
    });

    it('should handle empty statistics', async () => {
      mockTemplateModel.countDocuments.mockResolvedValue(0);
      mockTemplateModel.aggregate.mockResolvedValue([]);

      const result = await service.getTemplateStats();

      expect(result.totalTemplates).toBe(0);
      expect(result.byProvider).toEqual({});
      expect(result.byApiType).toEqual({});
    });
  });

  describe('createTemplateFromAnalysis', () => {
    it('should create template from analysis successfully', async () => {
      const analysisDto = {
        name: 'analyzed_template',
        provider: 'analysis_provider',
        apiType: 'rest' as const,
        sampleData: { symbol: 'MSFT', price: 300.75 },
        description: 'Template from analysis',
      };

      const mockAnalysisResult: DataSourceAnalysisResponseDto = {
        provider: analysisDto.provider,
        apiType: analysisDto.apiType,
        sampleData: analysisDto.sampleData,
        totalFields: 2,
        extractedFields: [mockExtractedField],
        confidence: 0.92,
        analysisTimestamp: new Date(),
      };

      mockAnalyzerService.analyzeDataSource.mockResolvedValue(mockAnalysisResult);
      mockTemplateModel.findOne.mockResolvedValue(null);

      const mockSavedTemplate = {
        ...analysisDto,
        extractedFields: mockAnalysisResult.extractedFields,
        confidence: mockAnalysisResult.confidence,
        _id: mockTemplateId,
        isActive: true,
        usageCount: 0,
      };

      const mockCreatedTemplate = {
        ...mockSavedTemplate,
        save: jest.fn().mockResolvedValue(mockSavedTemplate),
      };

      mockTemplateModel.mockReturnValue(mockCreatedTemplate);
      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        ...mockSavedTemplate,
        id: mockTemplateId,
      } as any);

      const result = await service.createTemplateFromAnalysis(analysisDto);

      expect(result).toBeDefined();
      expect(mockAnalyzerService.analyzeDataSource).toHaveBeenCalledWith(
        analysisDto.sampleData,
        analysisDto.provider,
        analysisDto.apiType,
      );
    });

    it('should use default description if not provided', async () => {
      const analysisDto = {
        name: 'analyzed_template',
        provider: 'analysis_provider',
        apiType: 'stream' as const,
        sampleData: { symbol: 'TSLA', price: 800.25 },
      };

      mockAnalyzerService.analyzeDataSource.mockResolvedValue({
        extractedFields: [mockExtractedField],
        confidence: 0.8,
      } as any);

      mockTemplateModel.findOne.mockResolvedValue(null);
      const mockCreatedTemplate = {
        save: jest.fn().mockResolvedValue({
          ...analysisDto,
          _id: mockTemplateId,
        }),
      };
      mockTemplateModel.mockReturnValue(mockCreatedTemplate);

      jest.spyOn(DataSourceTemplateResponseDto, 'fromDocument').mockReturnValue({
        id: mockTemplateId,
      } as any);

      await service.createTemplateFromAnalysis(analysisDto);

      expect(mockAnalyzerService.analyzeDataSource).toHaveBeenCalled();
    });

    it('should handle analysis errors', async () => {
      const analysisDto = {
        name: 'failing_template',
        provider: 'error_provider',
        apiType: 'rest' as const,
        sampleData: { invalid: 'data' },
      };

      const analysisError = new Error('Analysis failed');
      mockAnalyzerService.analyzeDataSource.mockRejectedValue(analysisError);

      await expect(service.createTemplateFromAnalysis(analysisDto)).rejects.toThrow('Analysis failed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle MongoDB connection issues', async () => {
      const connectionError = new Error('MongoDB connection timeout');
      mockTemplateModel.findOne.mockRejectedValue(connectionError);

      await expect(service.createTemplate(mockCreateDto)).rejects.toThrow();
    });

    it('should handle invalid data formats gracefully', async () => {
      const invalidDto = {
        ...mockCreateDto,
        sampleData: null,
      };

      mockTemplateModel.findOne.mockResolvedValue(null);
      const saveError = new Error('Validation failed');
      const mockCreatedTemplate = {
        save: jest.fn().mockRejectedValue(saveError),
      };
      mockTemplateModel.mockReturnValue(mockCreatedTemplate);

      await expect(service.createTemplate(invalidDto)).rejects.toThrow();
    });

    it('should handle concurrent access scenarios', async () => {
      // Simulate race condition where template is created between check and save
      mockTemplateModel.findOne.mockResolvedValue(null);
      const duplicateError = new Error('E11000 duplicate key error');
      const mockCreatedTemplate = {
        save: jest.fn().mockRejectedValue(duplicateError),
      };
      mockTemplateModel.mockReturnValue(mockCreatedTemplate);

      await expect(service.createTemplate(mockCreateDto)).rejects.toThrow();
    });
  });
});