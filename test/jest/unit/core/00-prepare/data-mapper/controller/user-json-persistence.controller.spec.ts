import { Test, TestingModule } from '@nestjs/testing';
import { UserJsonPersistenceController } from '../../../../../../../src/core/00-prepare/data-mapper/controller/user-json-persistence.controller';
import { DataSourceAnalyzerService } from '../../../../../../../src/core/00-prepare/data-mapper/services/data-source-analyzer.service';
import { DataSourceTemplateService } from '../../../../../../../src/core/00-prepare/data-mapper/services/data-source-template.service';
import {
  AnalyzeDataSourceDto,
  CreateDataSourceTemplateDto,
  DataSourceAnalysisResponseDto,
} from '../../../../../../../src/core/00-prepare/data-mapper/dto/data-source-analysis.dto';
import { ApiType, RuleListType } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';
import { REFERENCE_DATA } from '@common/constants/domain';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthGuard, PermissionsGuard, AuthService as AuthService } from '@authv2';

// 模拟 authv2 guards
jest.mock('@authv2', () => ({
  ...jest.requireActual('@authv2'),
  ApiKeyAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
  PermissionsGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('UserJsonPersistenceController', () => {
  let controller: UserJsonPersistenceController;
  let analyzerService: jest.Mocked<DataSourceAnalyzerService>;
  let templateService: jest.Mocked<DataSourceTemplateService>;

  const mockAnalyzerService = {
    analyzeDataSource: jest.fn(),
  };

  const mockTemplateService = {
    createTemplate: jest.fn(),
  };

  // 添加 Reflector 和 AuthService 的模拟实现
  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };

  const mockAuthService = {
    recordAuthFlowPerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserJsonPersistenceController],
      providers: [
        {
          provide: DataSourceAnalyzerService,
          useValue: mockAnalyzerService,
        },
        {
          provide: DataSourceTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ApiKeyAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<UserJsonPersistenceController>(UserJsonPersistenceController);
    analyzerService = module.get(DataSourceAnalyzerService);
    templateService = module.get(DataSourceTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(analyzerService).toBeDefined();
      expect(templateService).toBeDefined();
    });
  });

  describe('analyzeDataSource', () => {
    const mockSampleData = {
      symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
      last_done: 561,
      volume: 11292534,
      turnover: 6341234567,
      timestamp: 1672531200,
    };

    const mockAnalysisResult = {
      provider: 'longport',
      apiType: 'rest' as const,
      sampleData: mockSampleData,
      extractedFields: [
        {
          fieldPath: 'symbol',
          fieldName: 'symbol',
          fieldType: 'string',
          sampleValue: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
          confidence: 1.0,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'last_done',
          fieldName: 'last_done',
          fieldType: 'number',
          sampleValue: 561,
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'volume',
          fieldName: 'volume',
          fieldType: 'number',
          sampleValue: 11292534,
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'turnover',
          fieldName: 'turnover',
          fieldType: 'number',
          sampleValue: 6341234567,
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'timestamp',
          fieldName: 'timestamp',
          fieldType: 'number',
          sampleValue: 1672531200,
          confidence: 0.9,
          isNested: false,
          nestingLevel: 0,
        },
      ],
      totalFields: 5,
      analysisTimestamp: new Date('2023-01-01T00:00:00Z'),
      confidence: 0.92,
    };

    const mockSavedTemplate = {
      id: '507f1f77bcf86cd799439011',
      name: 'longport_stock_quote_1672531200',
      description: 'longport stock_quote 数据模板',
      provider: 'longport',
      apiType: 'rest' as const,
      sampleData: mockSampleData,
      extractedFields: mockAnalysisResult.extractedFields,
      totalFields: 5,
      confidence: 0.92,
      analysisTimestamp: new Date('2023-01-01T00:00:00Z'),
      isActive: true,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    };

    describe('successful analysis without template saving', () => {
      it('should analyze data source successfully without saving template', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: false,
        };

        analyzerService.analyzeDataSource.mockResolvedValue(mockAnalysisResult);

        const result = await controller.analyzeDataSource(dto);

        expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
          dto.sampleData,
          dto.provider,
          dto.apiType
        );
        expect(templateService.createTemplate).not.toHaveBeenCalled();

        expect(result).toEqual({
          provider: mockAnalysisResult.provider,
          apiType: mockAnalysisResult.apiType,
          sampleData: mockAnalysisResult.sampleData,
          extractedFields: mockAnalysisResult.extractedFields,
          totalFields: mockAnalysisResult.totalFields,
          analysisTimestamp: mockAnalysisResult.analysisTimestamp,
          confidence: mockAnalysisResult.confidence,
        });

        expect(result.savedTemplate).toBeUndefined();
      });
    });

    describe('successful analysis with template saving', () => {
      it('should analyze data source and save template with provided name', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
          name: 'custom_template_name',
          description: 'Custom template description',
        };

        analyzerService.analyzeDataSource.mockResolvedValue(mockAnalysisResult);
        templateService.createTemplate.mockResolvedValue(mockSavedTemplate);

        const result = await controller.analyzeDataSource(dto);

        expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
          dto.sampleData,
          dto.provider,
          dto.apiType
        );

        const expectedTemplateData: CreateDataSourceTemplateDto = {
          name: 'custom_template_name',
          description: 'Custom template description',
          provider: dto.provider,
          apiType: dto.apiType,
          sampleData: dto.sampleData,
          extractedFields: mockAnalysisResult.extractedFields,
          confidence: mockAnalysisResult.confidence,
        };

        expect(templateService.createTemplate).toHaveBeenCalledWith(expectedTemplateData);

        expect(result).toEqual({
          provider: mockAnalysisResult.provider,
          apiType: mockAnalysisResult.apiType,
          sampleData: mockAnalysisResult.sampleData,
          extractedFields: mockAnalysisResult.extractedFields,
          totalFields: mockAnalysisResult.totalFields,
          analysisTimestamp: mockAnalysisResult.analysisTimestamp,
          confidence: mockAnalysisResult.confidence,
          savedTemplate: {
            id: mockSavedTemplate.id,
            name: mockSavedTemplate.name,
            message: '模板已成功保存到数据库',
          },
        });
      });

      it('should analyze data source and save template with auto-generated name', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
          // No name and description provided
        };

        analyzerService.analyzeDataSource.mockResolvedValue(mockAnalysisResult);
        templateService.createTemplate.mockResolvedValue(mockSavedTemplate);

        // Mock Date.now() for consistent auto-generated name
        const mockTimestamp = 1672531200000;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        const result = await controller.analyzeDataSource(dto);

        const expectedTemplateData: CreateDataSourceTemplateDto = {
          name: `longport_quote_fields_${mockTimestamp}`,
          description: 'longport quote_fields 数据模板',
          provider: dto.provider,
          apiType: dto.apiType,
          sampleData: dto.sampleData,
          extractedFields: mockAnalysisResult.extractedFields,
          confidence: mockAnalysisResult.confidence,
        };

        expect(templateService.createTemplate).toHaveBeenCalledWith(expectedTemplateData);

        expect(result.savedTemplate).toEqual({
          id: mockSavedTemplate.id,
          name: mockSavedTemplate.name,
          message: '模板已成功保存到数据库',
        });

        jest.restoreAllMocks();
      });
    });

    describe('error handling', () => {
      it('should handle analyzer service error', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: false,
        };

        const errorMessage = 'Failed to analyze data source';
        analyzerService.analyzeDataSource.mockRejectedValue(new Error(errorMessage));

        await expect(controller.analyzeDataSource(dto)).rejects.toThrow(errorMessage);

        expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
          dto.sampleData,
          dto.provider,
          dto.apiType
        );
        expect(templateService.createTemplate).not.toHaveBeenCalled();
      });

      it('should handle template service error when saving template', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
          name: 'test_template',
        };

        analyzerService.analyzeDataSource.mockResolvedValue(mockAnalysisResult);

        const templateError = 'Failed to save template';
        templateService.createTemplate.mockRejectedValue(new Error(templateError));

        await expect(controller.analyzeDataSource(dto)).rejects.toThrow(templateError);

        expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
          dto.sampleData,
          dto.provider,
          dto.apiType
        );
        expect(templateService.createTemplate).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty sample data', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: {},
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: false,
        };

        const emptyAnalysisResult = {
          ...mockAnalysisResult,
          sampleData: {},
          extractedFields: [],
          totalFields: 0,
          confidence: 0,
        };

        analyzerService.analyzeDataSource.mockResolvedValue(emptyAnalysisResult);

        const result = await controller.analyzeDataSource(dto);

        expect(result.totalFields).toBe(0);
        expect(result.extractedFields).toEqual([]);
        expect(result.confidence).toBe(0);
      });

      it('should handle complex nested sample data', async () => {
        const complexSampleData = {
          basic: {
            symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
            name: 'Tencent Holdings Ltd',
          },
          quote: {
            price: {
              last: 561,
              change: 5.5,
              changePercent: 0.98,
            },
            volume: 11292534,
          },
          metadata: {
            timestamp: 1672531200,
            source: 'realtime',
          },
        };

        const dto: AnalyzeDataSourceDto = {
          sampleData: complexSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
          name: 'complex_template',
        };

        const complexAnalysisResult = {
          ...mockAnalysisResult,
          sampleData: complexSampleData,
          extractedFields: [
            {
              fieldPath: 'basic.symbol',
              fieldName: 'symbol',
              fieldType: 'string',
              sampleValue: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
              confidence: 1.0,
              isNested: true,
              nestingLevel: 1,
            },
            {
              fieldPath: 'basic.name',
              fieldName: 'name',
              fieldType: 'string',
              sampleValue: 'Tencent Holdings Ltd',
              confidence: 0.95,
              isNested: true,
              nestingLevel: 1,
            },
            {
              fieldPath: 'quote.price.last',
              fieldName: 'last',
              fieldType: 'number',
              sampleValue: 561,
              confidence: 0.95,
              isNested: true,
              nestingLevel: 2,
            },
            {
              fieldPath: 'quote.volume',
              fieldName: 'volume',
              fieldType: 'number',
              sampleValue: 11292534,
              confidence: 0.95,
              isNested: true,
              nestingLevel: 1,
            },
          ],
          totalFields: 4,
        };

        analyzerService.analyzeDataSource.mockResolvedValue(complexAnalysisResult);
        templateService.createTemplate.mockResolvedValue(mockSavedTemplate);

        const result = await controller.analyzeDataSource(dto);

        expect(result.sampleData).toEqual(complexSampleData);
        expect(result.extractedFields).toHaveLength(4);
        expect(result.savedTemplate).toBeDefined();
      });

      it('should handle stream API type', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'stream' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
        };

        const streamAnalysisResult = {
          ...mockAnalysisResult,
          apiType: 'stream' as const,
        };

        analyzerService.analyzeDataSource.mockResolvedValue(streamAnalysisResult);
        templateService.createTemplate.mockResolvedValue(mockSavedTemplate);

        const result = await controller.analyzeDataSource(dto);

        expect(result.apiType).toBe('stream');
        expect(templateService.createTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            apiType: 'stream' as const,
          })
        );
      });
    });

    describe('validation scenarios', () => {
      it('should handle low confidence analysis results', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'longport',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: true,
        };

        const lowConfidenceResult = {
          ...mockAnalysisResult,
          confidence: 0.3, // Low confidence
          extractedFields: mockAnalysisResult.extractedFields.map(field => ({
            ...field,
            confidence: 0.3,
          })),
        };

        analyzerService.analyzeDataSource.mockResolvedValue(lowConfidenceResult);
        templateService.createTemplate.mockResolvedValue(mockSavedTemplate);

        const result = await controller.analyzeDataSource(dto);

        expect(result.confidence).toBe(0.3);
        expect(templateService.createTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            confidence: 0.3,
          })
        );
      });

      it('should handle different provider types', async () => {
        const dto: AnalyzeDataSourceDto = {
          sampleData: mockSampleData,
          provider: 'custom_provider',
          apiType: 'rest' as const,
          dataType: 'quote_fields' as RuleListType,
          saveAsTemplate: false,
        };

        const customProviderResult = {
          ...mockAnalysisResult,
          provider: 'custom_provider',
        };

        analyzerService.analyzeDataSource.mockResolvedValue(customProviderResult);

        const result = await controller.analyzeDataSource(dto);

        expect(result.provider).toBe('custom_provider');
        expect(analyzerService.analyzeDataSource).toHaveBeenCalledWith(
          dto.sampleData,
          'custom_provider',
          dto.apiType
        );
      });
    });
  });
});