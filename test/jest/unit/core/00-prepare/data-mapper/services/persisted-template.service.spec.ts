import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';

import { PersistedTemplateService } from '@core/00-prepare/data-mapper/services/persisted-template.service';
import { RuleAlignmentService } from '@core/00-prepare/data-mapper/services/rule-alignment.service';
import { DataSourceTemplate } from '@core/00-prepare/data-mapper/schemas/data-source-template.schema';
import { FlexibleMappingRule } from '@core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { DATA_MAPPER_ERROR_CODES } from '@core/00-prepare/data-mapper/constants/data-mapper-error-codes.constants';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('PersistedTemplateService', () => {
  let service: PersistedTemplateService;
  let mockTemplateModel: any;
  let mockRuleModel: any;
  let mockRuleAlignmentService: jest.Mocked<RuleAlignmentService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  const mockTemplate = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'LongPort REST 股票报价通用模板',
    provider: 'longport',
    apiType: 'rest',
    isPreset: true,
    isDefault: true,
    description: 'Test template',
    extractedFields: [
      {
        fieldPath: 'symbol',
        fieldName: 'symbol',
        fieldType: 'string',
        confidence: 0.95,
      },
      {
        fieldPath: 'lastDone',
        fieldName: 'lastDone',
        fieldType: 'string',
        confidence: 0.95,
      },
    ],
    totalFields: 2,
    confidence: 0.95,
    isActive: true,
    usageCount: 0,
    lastUsedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockRule = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    name: 'Test Rule',
    provider: 'longport',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    description: 'Test rule description',
    sourceTemplateId: '507f1f77bcf86cd799439011',
    fieldMappings: [],
    isActive: true,
    isDefault: false,
    version: '1.0.0',
    overallConfidence: 0.95,
    usageCount: 0,
    lastUsedAt: new Date(),
    lastValidatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    successfulTransformations: 0,
    failedTransformations: 0,
    successRate: 0,
  } as any;

  beforeEach(async () => {
    // Mock template model
    const mockSave = jest.fn().mockResolvedValue(mockTemplate);
    mockTemplateModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: mockSave,
    }));
    mockTemplateModel.find = jest.fn().mockReturnThis();
    mockTemplateModel.findOne = jest.fn().mockReturnThis();
    mockTemplateModel.findById = jest.fn().mockReturnThis();
    mockTemplateModel.findByIdAndUpdate = jest.fn().mockReturnThis();
    mockTemplateModel.findByIdAndDelete = jest.fn().mockReturnThis();
    mockTemplateModel.deleteMany = jest.fn().mockReturnThis();
    mockTemplateModel.sort = jest.fn().mockReturnThis();
    mockTemplateModel.exec = jest.fn().mockResolvedValue([mockTemplate]);

    // Mock rule model
    mockRuleModel = {
      findOne: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };

    // Mock rule alignment service
    mockRuleAlignmentService = {
      generateRuleFromTemplate: jest.fn().mockResolvedValue({
        rule: mockRule,
        alignmentResult: {
          totalFields: 5,
          alignedFields: 4,
          unalignedFields: ['field1'],
          suggestions: [
            {
              sourceField: 'field1',
              suggestedTarget: 'targetField1',
              confidence: 0.8,
              reasoning: 'Field name similarity',
            },
          ],
        },
      }),
    } as any;

    // Mock event bus
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistedTemplateService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: mockTemplateModel,
        },
        {
          provide: getModelToken(FlexibleMappingRule.name),
          useValue: mockRuleModel,
        },
        {
          provide: RuleAlignmentService,
          useValue: mockRuleAlignmentService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<PersistedTemplateService>(PersistedTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of PersistedTemplateService', () => {
      expect(service).toBeInstanceOf(PersistedTemplateService);
    });
  });

  describe('persistPresetTemplates', () => {
    describe('successful scenarios', () => {
      it('should create new preset templates when none exist', async () => {
        mockTemplateModel.findOne.mockResolvedValue(null);

        const result = await service.persistPresetTemplates();

        expect(result).toBeDefined();
        expect(result.created).toBeGreaterThan(0);
        expect(result.updated).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.details).toBeInstanceOf(Array);
        expect(result.details.length).toBeGreaterThan(0);
      });

      it('should update existing preset templates', async () => {
        mockTemplateModel.findOne.mockResolvedValue(mockTemplate);
        mockTemplateModel.findByIdAndUpdate.mockResolvedValue(mockTemplate);

        const result = await service.persistPresetTemplates();

        expect(result).toBeDefined();
        expect(result.created).toBe(0);
        expect(result.updated).toBeGreaterThan(0);
        expect(result.skipped).toBe(0);
        expect(result.details).toBeInstanceOf(Array);
      });

      it('should handle mixed scenarios (create and update)', async () => {
        let callCount = 0;
        mockTemplateModel.findOne.mockImplementation(() => {
          callCount++;
          return callCount === 1 ? null : mockTemplate; // First call returns null, others return existing template
        });

        const result = await service.persistPresetTemplates();

        expect(result).toBeDefined();
        expect(result.created).toBeGreaterThan(0);
        expect(result.updated).toBeGreaterThan(0);
        expect(result.details).toBeInstanceOf(Array);
      });

      it('should include preset template properties in created templates', async () => {
        mockTemplateModel.findOne.mockResolvedValue(null);

        await service.persistPresetTemplates();

        expect(mockTemplateModel).toHaveBeenCalledWith(
          expect.objectContaining({
            isPreset: true,
            usageCount: 0,
          })
        );
      });
    });

    describe('error handling', () => {
      it('should handle template creation errors gracefully', async () => {
        mockTemplateModel.findOne.mockResolvedValue(null);
        // Mock the constructor to return an object with a save method that rejects
        mockTemplateModel.mockImplementation(() => ({
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        const result = await service.persistPresetTemplates();

        expect(result).toBeDefined();
        expect(result.skipped).toBeGreaterThan(0);
        expect(result.details.some(detail => detail.includes('Database error'))).toBe(true);
      });

      it('should handle template update errors gracefully', async () => {
        mockTemplateModel.findOne.mockResolvedValue(mockTemplate);
        mockTemplateModel.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));

        const result = await service.persistPresetTemplates();

        expect(result).toBeDefined();
        expect(result.skipped).toBeGreaterThan(0);
        expect(result.details.some(detail => detail.includes('Update failed'))).toBe(true);
      });
    });
  });

  describe('getAllPersistedTemplates', () => {
    it('should retrieve all persisted templates with correct sorting', async () => {
      const result = await service.getAllPersistedTemplates();

      expect(mockTemplateModel.find).toHaveBeenCalled();
      expect(mockTemplateModel.sort).toHaveBeenCalledWith({
        isPreset: -1,
        isDefault: -1,
        usageCount: -1,
      });
      expect(result).toEqual([mockTemplate]);
    });

    it('should return empty array when no templates exist', async () => {
      mockTemplateModel.exec.mockResolvedValue([]);

      const result = await service.getAllPersistedTemplates();

      expect(result).toEqual([]);
    });
  });

  describe('getPersistedTemplateById', () => {
    describe('successful scenarios', () => {
      it('should retrieve template by valid ID', async () => {
        const validId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockResolvedValue(mockTemplate);

        const result = await service.getPersistedTemplateById(validId);

        expect(mockTemplateModel.findById).toHaveBeenCalledWith(validId);
        expect(result).toEqual(mockTemplate);
      });
    });

    describe('error handling', () => {
      it('should throw BusinessException for invalid ObjectId format', async () => {
        const invalidId = 'invalid-id';

        await expect(service.getPersistedTemplateById(invalidId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException for database query errors', async () => {
        const validId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockRejectedValue(new Error('Database error'));

        await expect(service.getPersistedTemplateById(validId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException when template not found', async () => {
        const validId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockResolvedValue(null);

        await expect(service.getPersistedTemplateById(validId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });
    });
  });

  describe('updatePersistedTemplate', () => {
    describe('successful scenarios', () => {
      it('should update template successfully', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const updateData = { name: 'Updated Template' };
        mockTemplateModel.findByIdAndUpdate.mockResolvedValue({
          ...mockTemplate,
          ...updateData,
        });

        const result = await service.updatePersistedTemplate(templateId, updateData);

        expect(mockTemplateModel.findByIdAndUpdate).toHaveBeenCalledWith(
          templateId,
          updateData,
          { new: true }
        );
        expect(result.name).toBe(updateData.name);
      });
    });

    describe('error handling', () => {
      it('should throw BusinessException when template not found', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const updateData = { name: 'Updated Template' };
        mockTemplateModel.findByIdAndUpdate.mockResolvedValue(null);

        await expect(service.updatePersistedTemplate(templateId, updateData))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });
    });
  });

  describe('deletePersistedTemplate', () => {
    describe('successful scenarios', () => {
      it('should delete non-preset template successfully', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const nonPresetTemplate = { ...mockTemplate, isPreset: false };
        mockTemplateModel.findById.mockResolvedValue(nonPresetTemplate);
        mockTemplateModel.findByIdAndDelete.mockResolvedValue(nonPresetTemplate);

        await service.deletePersistedTemplate(templateId);

        expect(mockTemplateModel.findById).toHaveBeenCalledWith(templateId);
        expect(mockTemplateModel.findByIdAndDelete).toHaveBeenCalledWith(templateId);
      });
    });

    describe('error handling', () => {
      it('should throw BusinessException when template not found', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockResolvedValue(null);

        await expect(service.deletePersistedTemplate(templateId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException when trying to delete preset template', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockResolvedValue(mockTemplate);

        await expect(service.deletePersistedTemplate(templateId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });
    });
  });

  describe('resetPresetTemplateById', () => {
    describe('successful scenarios', () => {
      it('should reset preset template to original configuration', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const presetTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）',
          provider: 'longport',
          apiType: 'rest',
        };

        mockTemplateModel.findById
          .mockResolvedValueOnce(presetTemplate)
          .mockResolvedValueOnce(presetTemplate);
        mockTemplateModel.findByIdAndUpdate.mockResolvedValue(presetTemplate);

        const result = await service.resetPresetTemplateById(templateId);

        expect(mockTemplateModel.findByIdAndUpdate).toHaveBeenCalledWith(
          templateId,
          expect.objectContaining({
            name: expect.stringContaining('LongPort REST'),
            provider: 'longport',
            apiType: 'rest',
            isPreset: true,
          })
        );
        expect(result).toEqual(presetTemplate);
      });
    });

    describe('error handling', () => {
      it('should throw BusinessException for invalid ObjectId format', async () => {
        const invalidId = 'invalid-id';

        await expect(service.resetPresetTemplateById(invalidId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException for database query errors', async () => {
        const validId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockRejectedValue(new Error('Database error'));

        await expect(service.resetPresetTemplateById(validId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException when template not found', async () => {
        const validId = '507f1f77bcf86cd799439011';
        mockTemplateModel.findById.mockResolvedValue(null);

        await expect(service.resetPresetTemplateById(validId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException when template is not preset', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const nonPresetTemplate = { ...mockTemplate, isPreset: false };
        mockTemplateModel.findById.mockResolvedValue(nonPresetTemplate);

        await expect(service.resetPresetTemplateById(templateId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });

      it('should throw BusinessException when original configuration not found', async () => {
        const templateId = '507f1f77bcf86cd799439011';
        const unknownTemplate = {
          ...mockTemplate,
          name: 'Unknown Template',
          provider: 'unknown',
          apiType: 'unknown',
        };
        mockTemplateModel.findById.mockResolvedValue(unknownTemplate);

        await expect(service.resetPresetTemplateById(templateId))
          .rejects.toMatchObject({
            name: expect.stringContaining('BusinessException'),
          });
      });
    });
  });

  describe('resetPresetTemplatesBulk', () => {
    it('should reset multiple templates successfully', async () => {
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const presetTemplate = {
        ...mockTemplate,
        name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）',
        provider: 'longport',
        apiType: 'rest',
      };

      mockTemplateModel.findById.mockResolvedValue(presetTemplate);
      mockTemplateModel.findByIdAndUpdate.mockResolvedValue(presetTemplate);

      const result = await service.resetPresetTemplatesBulk(ids);

      expect(result.reset).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(result.details.every(detail => detail.includes('已重置'))).toBe(true);
    });

    it('should handle partial failures in bulk reset', async () => {
      const ids = ['507f1f77bcf86cd799439011', 'invalid-id', '507f1f77bcf86cd799439012'];
      const presetTemplate = {
        ...mockTemplate,
        name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）',
        provider: 'longport',
        apiType: 'rest',
      };

      // Mock resetPresetTemplateById method to fail on the second call
      const resetSpy = jest.spyOn(service, 'resetPresetTemplateById');

      let callCount = 0;
      resetSpy.mockImplementation(async (id: string) => {
        callCount++;
        if (callCount === 2) { // Second ID (invalid-id) will fail
          throw new Error('Invalid ID format');
        }
        return presetTemplate as any;
      });

      const result = await service.resetPresetTemplatesBulk(ids);

      expect(result.reset).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.details).toHaveLength(3);
      expect(result.details.some(detail => detail.includes('失败'))).toBe(true);

      resetSpy.mockRestore();
    });

    it('should handle empty ID array', async () => {
      const result = await service.resetPresetTemplatesBulk([]);

      expect(result.reset).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe('resetPresetTemplates', () => {
    it('should delete and recreate all preset templates successfully', async () => {
      mockTemplateModel.deleteMany.mockResolvedValue({ deletedCount: 4 });
      mockTemplateModel.findOne.mockResolvedValue(null); // For persistPresetTemplates

      const result = await service.resetPresetTemplates();

      expect(mockTemplateModel.deleteMany).toHaveBeenCalledWith({ isPreset: true });
      expect(result.deleted).toBe(4);
      expect(result.recreated).toBeGreaterThan(0);
      expect(result.message).toContain('删除了 4 个旧预设模板');
    });

    it('should handle case with no existing templates', async () => {
      mockTemplateModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
      mockTemplateModel.findOne.mockResolvedValue(null);

      const result = await service.resetPresetTemplates();

      expect(result.deleted).toBe(0);
      expect(result.recreated).toBeGreaterThan(0);
    });
  });

  describe('initializePresetMappingRules', () => {
    describe('successful scenarios', () => {
      it('should create mapping rules for all preset templates', async () => {
        const presetTemplates = [
          { ...mockTemplate, name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）' },
          { ...mockTemplate, name: 'LongPort REST 美股专用报价模板(含盘前盘后)' },
        ];

        mockTemplateModel.find.mockReturnValue({
          exec: jest.fn().mockResolvedValue(presetTemplates),
        });
        mockRuleModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(null), // No existing rules
        });

        const result = await service.initializePresetMappingRules();

        // Wait for setImmediate events to be processed
        await new Promise(resolve => setImmediate(resolve));

        expect(result.created).toBe(2);
        expect(result.skipped).toBe(0);
        expect(result.failed).toBe(0);
        expect(mockRuleAlignmentService.generateRuleFromTemplate).toHaveBeenCalledTimes(2);
        expect(mockEventBus.emit).toHaveBeenCalled();
      });

      it('should skip existing rules and create new ones', async () => {
        const presetTemplates = [
          { ...mockTemplate, name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）' },
          { ...mockTemplate, name: 'LongPort REST 美股专用报价模板(含盘前盘后)' },
        ];

        mockTemplateModel.find.mockReturnValue({
          exec: jest.fn().mockResolvedValue(presetTemplates),
        });

        let callCount = 0;
        mockRuleModel.findOne.mockReturnValue({
          exec: jest.fn().mockImplementation(() => {
            callCount++;
            return callCount === 1 ? Promise.resolve(mockRule) : Promise.resolve(null);
          }),
        });

        const result = await service.initializePresetMappingRules();

        expect(result.created).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.failed).toBe(0);
        expect(mockRuleAlignmentService.generateRuleFromTemplate).toHaveBeenCalledTimes(1);
      });

      it('should handle no preset templates gracefully', async () => {
        mockTemplateModel.find.mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        });

        const result = await service.initializePresetMappingRules();

        expect(result.created).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.details).toContain('未找到预设模板，建议先执行预设模板持久化');
      });
    });

    describe('error handling', () => {
      it('should handle rule generation failures', async () => {
        const presetTemplates = [
          { ...mockTemplate, name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）' },
          { ...mockTemplate, name: 'LongPort REST 美股专用报价模板(含盘前盘后)' },
        ];

        mockTemplateModel.find.mockReturnValue({
          exec: jest.fn().mockResolvedValue(presetTemplates),
        });
        mockRuleModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        let callCount = 0;
        mockRuleAlignmentService.generateRuleFromTemplate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Rule generation failed'));
          }
          return Promise.resolve({
            rule: mockRule,
            alignmentResult: {
              totalFields: 5,
              alignedFields: 4,
              unalignedFields: ['field1'],
              suggestions: [
                {
                  sourceField: 'field1',
                  suggestedTarget: 'targetField1',
                  confidence: 0.8,
                  reasoning: 'Field name similarity',
                },
              ],
            },
          });
        });

        const result = await service.initializePresetMappingRules();

        expect(result.created).toBe(1);
        expect(result.skipped).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.details.some(detail => detail.includes('失败'))).toBe(true);
      });

      it('should handle database query errors during initialization', async () => {
        mockTemplateModel.find.mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        });

        await expect(service.initializePresetMappingRules())
          .rejects.toThrow('Database error');

        // Wait for setImmediate events to be processed
        await new Promise(resolve => setImmediate(resolve));

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            tags: expect.objectContaining({
              status: 'error',
            })
          })
        );
      });
    });
  });

  describe('private helper methods', () => {
    describe('determineRuleType', () => {
      it('should determine quote_fields type based on template name', () => {
        const quoteTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 股票报价通用模板',
          extractedFields: [
            { fieldName: 'lastDone', fieldType: 'string' },
            { fieldName: 'high', fieldType: 'string' },
          ],
        };

        const ruleType = (service as any).determineRuleType(quoteTemplate);
        expect(ruleType).toBe('quote_fields');
      });

      it('should determine basic_info_fields type based on template name', () => {
        const basicInfoTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 股票基础信息通用模板',
          extractedFields: [
            { fieldName: 'nameCn', fieldType: 'string' },
            { fieldName: 'exchange', fieldType: 'string' },
          ],
        };

        const ruleType = (service as any).determineRuleType(basicInfoTemplate);
        expect(ruleType).toBe('basic_info_fields');
      });

      it('should determine rule type based on field content', () => {
        const templateWithBasicFields = {
          ...mockTemplate,
          name: 'Generic Template',
          extractedFields: [
            { fieldName: 'nameCn', fieldType: 'string' },
            { fieldName: 'nameEn', fieldType: 'string' },
            { fieldName: 'exchange', fieldType: 'string' },
            { fieldName: 'currency', fieldType: 'string' },
            { fieldName: 'eps', fieldType: 'string' },
          ],
        };

        const ruleType = (service as any).determineRuleType(templateWithBasicFields);
        expect(ruleType).toBe('basic_info_fields');
      });

      it('should default to quote_fields when uncertain', () => {
        const ambiguousTemplate = {
          ...mockTemplate,
          name: 'Generic Template',
          extractedFields: [
            { fieldName: 'field1', fieldType: 'string' },
            { fieldName: 'field2', fieldType: 'string' },
          ],
        };

        const ruleType = (service as any).determineRuleType(ambiguousTemplate);
        expect(ruleType).toBe('quote_fields');
      });
    });

    describe('generateRuleName', () => {
      it('should generate descriptive rule name for quote template', () => {
        const quoteTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）',
          provider: 'longport',
          apiType: 'rest',
        };

        const ruleName = (service as any).generateRuleName(quoteTemplate, 'quote_fields');

        expect(ruleName).toContain('longport');
        expect(ruleName).toContain('REST');
        expect(ruleName).toContain('报价数据');
        expect(ruleName).toContain('规则');
      });

      it('should generate descriptive rule name for basic info template', () => {
        const basicInfoTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 股票基础信息通用模板',
          provider: 'longport',
          apiType: 'rest',
        };

        const ruleName = (service as any).generateRuleName(basicInfoTemplate, 'basic_info_fields');

        expect(ruleName).toContain('longport');
        expect(ruleName).toContain('REST');
        expect(ruleName).toContain('基础信息');
        expect(ruleName).toContain('规则');
      });

      it('should handle US stock specific templates', () => {
        const usTemplate = {
          ...mockTemplate,
          name: 'LongPort REST 美股专用报价模板(含盘前盘后)',
          provider: 'longport',
          apiType: 'rest',
        };

        const ruleName = (service as any).generateRuleName(usTemplate, 'quote_fields');

        expect(ruleName).toContain('美股专用');
      });

      it('should handle WebSocket templates', () => {
        const wsTemplate = {
          ...mockTemplate,
          name: 'LongPort WebSocket 报价流通用模板',
          provider: 'longport',
          apiType: 'stream',
        };

        const ruleName = (service as any).generateRuleName(wsTemplate, 'quote_fields');

        expect(ruleName).toContain('STREAM');
      });

      it('should use fallback names for very short simplified names', () => {
        const shortNameTemplate = {
          ...mockTemplate,
          name: 'LongPort REST A',
          provider: 'longport',
          apiType: 'rest',
        };

        const ruleName = (service as any).generateRuleName(shortNameTemplate, 'quote_fields');

        expect(ruleName).toContain('通用');
      });
    });
  });

  describe('monitoring event emission', () => {
    it('should emit monitoring events for successful operations', async () => {
      const presetTemplates = [mockTemplate];
      mockTemplateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(presetTemplates),
      });
      mockRuleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.initializePresetMappingRules();

      // Wait for setImmediate events to be processed
      await new Promise(resolve => setImmediate(resolve));

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.objectContaining({
            status: 'success',
          })
        })
      );
    });

    it('should emit monitoring events for failed operations', async () => {
      const presetTemplates = [mockTemplate];
      mockTemplateModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(presetTemplates),
      });
      mockRuleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockRuleAlignmentService.generateRuleFromTemplate.mockRejectedValue(
        new Error('Generation failed')
      );

      await service.initializePresetMappingRules();

      // Wait for setImmediate events to be processed
      await new Promise(resolve => setImmediate(resolve));

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.objectContaining({
            status: 'error',
          })
        })
      );
    });
  });

  describe('preset template constants', () => {
    it('should have valid preset template configurations', () => {
      const basicPresetTemplates = (service as any).BASIC_PRESET_TEMPLATES;

      expect(basicPresetTemplates).toBeInstanceOf(Array);
      expect(basicPresetTemplates.length).toBeGreaterThan(0);

      basicPresetTemplates.forEach((template: any) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('provider');
        expect(template).toHaveProperty('apiType');
        expect(template).toHaveProperty('isPreset', true);
        expect(template).toHaveProperty('extractedFields');
        expect(template).toHaveProperty('totalFields');
        expect(template).toHaveProperty('confidence');
        expect(template.extractedFields).toBeInstanceOf(Array);
        expect(template.extractedFields.length).toBeGreaterThan(0);
        expect(template.confidence).toBeGreaterThan(0);
        expect(template.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should have preset templates for different scenarios', () => {
      const basicPresetTemplates = (service as any).BASIC_PRESET_TEMPLATES;

      const hasRestTemplate = basicPresetTemplates.some((t: any) => t.apiType === 'rest');
      const hasStreamTemplate = basicPresetTemplates.some((t: any) => t.apiType === 'stream');
      const hasQuoteTemplate = basicPresetTemplates.some((t: any) =>
        t.name.includes('报价') || t.extractedFields.some((f: any) => f.fieldName === 'lastDone')
      );
      const hasBasicInfoTemplate = basicPresetTemplates.some((t: any) =>
        t.name.includes('基础信息') || t.extractedFields.some((f: any) => f.fieldName === 'nameCn')
      );

      expect(hasRestTemplate).toBe(true);
      expect(hasStreamTemplate).toBe(true);
      expect(hasQuoteTemplate).toBe(true);
      expect(hasBasicInfoTemplate).toBe(true);
    });
  });
});