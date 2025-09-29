import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RuleAlignmentService } from '../../../../../../../src/core/00-prepare/data-mapper/services/rule-alignment.service';
import { DataSourceTemplate } from '../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema';
import { FlexibleMappingRule } from '../../../../../../../src/core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';

// Mock the actual imports used by the service
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../../../../../core/shared/utils/string.util', () => ({
  StringUtils: {
    levenshteinDistance: jest.fn((a: string, b: string) => {
      // Simple mock implementation for Levenshtein distance
      if (a === b) return 0;
      if (a.includes(b) || b.includes(a)) return Math.abs(a.length - b.length);
      return Math.max(a.length, b.length);
    }),
  },
}));

// Mock exception factory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn((config) => {
      const error = new Error(config.message);
      return error;
    }),
  },
  ComponentIdentifier: {
    DATA_MAPPER: 'data_mapper',
  },
  BusinessErrorCode: {
    DATA_NOT_FOUND: 'DATA_NOT_FOUND',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
    DATA_PROCESSING_FAILED: 'DATA_PROCESSING_FAILED',
  },
}));

// Mock constants
jest.mock('../constants/data-mapper-error-codes.constants', () => ({
  DATA_MAPPER_ERROR_CODES: {
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    MAPPING_RULE_ALREADY_EXISTS: 'MAPPING_RULE_ALREADY_EXISTS',
    MAPPING_RULE_NOT_FOUND: 'MAPPING_RULE_NOT_FOUND',
    INVALID_FIELD_MAPPING: 'INVALID_FIELD_MAPPING',
    MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
    INVALID_RULE_NAME: 'INVALID_RULE_NAME',
    RULE_ALIGNMENT_FAILED: 'RULE_ALIGNMENT_FAILED',
  },
}));

// Mock system events
jest.mock('../../../../monitoring/contracts/events/system-status.events', () => ({
  SYSTEM_STATUS_EVENTS: {
    METRIC_COLLECTED: 'metric.collected',
  },
}));

describe('RuleAlignmentService', () => {
  let service: RuleAlignmentService;
  let mockTemplateModel: any;
  let mockRuleModel: any;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  const mockTemplate = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Template',
    provider: 'test-provider',
    apiType: 'rest',
    extractedFields: [
      {
        fieldName: 'symbol',
        fieldPath: 'symbol',
        fieldType: 'string',
        isNested: false,
        sampleValue: 'AAPL',
      },
      {
        fieldName: 'current',
        fieldPath: 'price.current',
        fieldType: 'number',
        isNested: true,
        sampleValue: 150.25,
      },
      {
        fieldName: 'vol',
        fieldPath: 'volume.total',
        fieldType: 'number',
        isNested: true,
        sampleValue: 1000000,
      },
      {
        fieldName: 'open_price',
        fieldPath: 'open_price',
        fieldType: 'number',
        isNested: false,
        sampleValue: 149.50,
      },
    ],
  };

  const mockRule = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Rule',
    provider: 'test-provider',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    sourceTemplateId: '507f1f77bcf86cd799439011',
    fieldMappings: [
      {
        sourceFieldPath: 'symbol',
        targetField: 'symbol',
        confidence: 1.0,
        description: 'Exact match',
        isActive: true,
      },
      {
        sourceFieldPath: 'price.current',
        targetField: 'lastPrice',
        confidence: 0.9,
        description: 'High confidence match',
        isActive: true,
      },
    ],
    overallConfidence: 0.95,
    isActive: true,
  };

  beforeEach(async () => {
    // Mock template model
    mockTemplateModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // Mock rule model
    mockRuleModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // Mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      addListener: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleAlignmentService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: mockTemplateModel,
        },
        {
          provide: getModelToken(FlexibleMappingRule.name),
          useValue: mockRuleModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<RuleAlignmentService>(RuleAlignmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of RuleAlignmentService', () => {
      expect(service).toBeInstanceOf(RuleAlignmentService);
    });
  });

  describe('generateRuleFromTemplate', () => {
    it('should generate rule from template successfully', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const transDataRuleListType = 'quote_fields';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(null); // No existing rule
      mockRuleModel.create.mockResolvedValue({
        ...mockRule,
        name: 'Test Template - quote_fields 自动对齐规则',
      });

      const result = await service.generateRuleFromTemplate(
        templateId,
        transDataRuleListType,
      );

      expect(result).toBeDefined();
      expect(result.rule).toBeDefined();
      expect(result.alignmentResult).toBeDefined();
      expect(result.alignmentResult.totalFields).toBeGreaterThan(0);
      expect(result.alignmentResult.alignedFields).toBeGreaterThanOrEqual(0);
      expect(mockTemplateModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockRuleModel.create).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      const templateId = 'nonexistent';
      const transDataRuleListType = 'quote_fields';

      mockTemplateModel.findById.mockResolvedValue(null);

      await expect(
        service.generateRuleFromTemplate(templateId, transDataRuleListType),
      ).rejects.toThrow();

      expect(mockTemplateModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          success: false,
          operation: 'generate-rule',
        }),
      );
    });

    it('should throw error when rule already exists', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const transDataRuleListType = 'quote_fields';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(mockRule); // Existing rule found

      await expect(
        service.generateRuleFromTemplate(templateId, transDataRuleListType),
      ).rejects.toThrow();

      expect(mockTemplateModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockRuleModel.findOne).toHaveBeenCalled();
    });

    it('should generate rule with custom name', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const transDataRuleListType = 'quote_fields';
      const customName = 'Custom Rule Name';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(null);
      mockRuleModel.create.mockResolvedValue({
        ...mockRule,
        name: customName,
      });

      const result = await service.generateRuleFromTemplate(
        templateId,
        transDataRuleListType,
        customName,
      );

      expect(result.rule.name).toBe(customName);
      expect(mockRuleModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: customName,
        }),
      );
    });

    it('should handle basic_info_fields type', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const transDataRuleListType = 'basic_info_fields';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(null);
      mockRuleModel.create.mockResolvedValue(mockRule);

      const result = await service.generateRuleFromTemplate(
        templateId,
        transDataRuleListType,
      );

      expect(result).toBeDefined();
      expect(mockRuleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transDataRuleListType: 'basic_info_fields',
        }),
      );
    });
  });

  describe('realignExistingRule', () => {
    it('should realign existing rule successfully', async () => {
      const ruleId = '507f1f77bcf86cd799439012';

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue({
        ...mockRule,
        lastAlignedAt: new Date(),
      });

      const result = await service.realignExistingRule(ruleId);

      expect(result).toBeDefined();
      expect(result.rule).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(result.alignmentResult).toBeDefined();
      expect(result.changes).toHaveProperty('added');
      expect(result.changes).toHaveProperty('removed');
      expect(result.changes).toHaveProperty('modified');
      expect(mockRuleModel.findById).toHaveBeenCalledWith(ruleId);
      expect(mockTemplateModel.findById).toHaveBeenCalledWith(mockRule.sourceTemplateId);
      expect(mockRuleModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalled();
    });

    it('should throw error when rule not found', async () => {
      const ruleId = 'nonexistent';

      mockRuleModel.findById.mockResolvedValue(null);

      await expect(service.realignExistingRule(ruleId)).rejects.toThrow();

      expect(mockRuleModel.findById).toHaveBeenCalledWith(ruleId);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          success: false,
          operation: 'realign-rule',
        }),
      );
    });

    it('should throw error when associated template not found', async () => {
      const ruleId = '507f1f77bcf86cd799439012';

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockTemplateModel.findById.mockResolvedValue(null);

      await expect(service.realignExistingRule(ruleId)).rejects.toThrow();

      expect(mockRuleModel.findById).toHaveBeenCalledWith(ruleId);
      expect(mockTemplateModel.findById).toHaveBeenCalledWith(mockRule.sourceTemplateId);
    });
  });

  describe('manualAdjustFieldMapping', () => {
    it('should add new field mapping', async () => {
      const ruleId = '507f1f77bcf86cd799439012';
      const adjustments = [
        {
          action: 'add' as const,
          sourceField: 'new_field',
          targetField: 'newTarget',
          confidence: 0.8,
          description: 'Manual addition',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue({
        ...mockRule,
        fieldMappings: [...mockRule.fieldMappings, adjustments[0]],
      });

      const result = await service.manualAdjustFieldMapping(ruleId, adjustments);

      expect(result).toBeDefined();
      expect(mockRuleModel.findById).toHaveBeenCalledWith(ruleId);
      expect(mockRuleModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should remove field mapping', async () => {
      const ruleId = '507f1f77bcf86cd799439012';
      const adjustments = [
        {
          action: 'remove' as const,
          sourceField: 'symbol',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue({
        ...mockRule,
        fieldMappings: mockRule.fieldMappings.filter(
          (m) => m.sourceFieldPath !== 'symbol',
        ),
      });

      const result = await service.manualAdjustFieldMapping(ruleId, adjustments);

      expect(result).toBeDefined();
      expect(mockRuleModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should modify existing field mapping', async () => {
      const ruleId = '507f1f77bcf86cd799439012';
      const adjustments = [
        {
          action: 'modify' as const,
          sourceField: 'symbol',
          newTargetField: 'ticker',
          confidence: 0.95,
          description: 'Updated mapping',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue(mockRule);

      const result = await service.manualAdjustFieldMapping(ruleId, adjustments);

      expect(result).toBeDefined();
      expect(mockRuleModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when rule not found', async () => {
      const ruleId = 'nonexistent';
      const adjustments = [
        {
          action: 'add' as const,
          sourceField: 'test',
          targetField: 'test',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(null);

      await expect(
        service.manualAdjustFieldMapping(ruleId, adjustments),
      ).rejects.toThrow();

      expect(mockRuleModel.findById).toHaveBeenCalledWith(ruleId);
    });

    it('should throw error when modifying non-existent field mapping', async () => {
      const ruleId = '507f1f77bcf86cd799439012';
      const adjustments = [
        {
          action: 'modify' as const,
          sourceField: 'nonexistent_field',
          newTargetField: 'test',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(mockRule);

      await expect(
        service.manualAdjustFieldMapping(ruleId, adjustments),
      ).rejects.toThrow();
    });
  });

  describe('previewAlignment', () => {
    it('should preview alignment successfully', async () => {
      const result = await service.previewAlignment(
        mockTemplate as any,
        'quote_fields',
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalFields');
      expect(result).toHaveProperty('alignedFields');
      expect(result).toHaveProperty('unalignedFields');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.unalignedFields)).toBe(true);
    });

    it('should throw error when template is null', async () => {
      await expect(
        service.previewAlignment(null as any, 'quote_fields'),
      ).rejects.toThrow();
    });

    it('should throw error when transDataRuleListType is null', async () => {
      await expect(
        service.previewAlignment(mockTemplate as any, null as any),
      ).rejects.toThrow();
    });

    it('should throw error for invalid transDataRuleListType', async () => {
      await expect(
        service.previewAlignment(mockTemplate as any, 'invalid_type' as any),
      ).rejects.toThrow();
    });

    it('should handle basic_info_fields preview', async () => {
      const result = await service.previewAlignment(
        mockTemplate as any,
        'basic_info_fields',
      );

      expect(result).toBeDefined();
      expect(result.totalFields).toBeGreaterThan(0);
    });
  });

  describe('Field Matching Logic', () => {
    it('should find exact matches with highest confidence', async () => {
      const templateWithExactMatch = {
        ...mockTemplate,
        extractedFields: [
          {
            fieldName: 'symbol',
            fieldPath: 'symbol',
            fieldType: 'string',
            isNested: false,
            sampleValue: 'AAPL',
          },
        ],
      };

      const result = await service.previewAlignment(
        templateWithExactMatch as any,
        'quote_fields',
      );

      const symbolMatch = result.suggestions.find(
        (s) => s.suggestedTarget === 'symbol',
      );
      expect(symbolMatch).toBeDefined();
      expect(symbolMatch.confidence).toBe(1.0);
    });

    it('should handle nested field matching', async () => {
      const result = await service.previewAlignment(
        mockTemplate as any,
        'quote_fields',
      );

      const priceMatch = result.suggestions.find(
        (s) => s.sourceField === 'price.current',
      );
      expect(priceMatch).toBeDefined();
      expect(priceMatch.confidence).toBeGreaterThan(0.5);
    });

    it('should prefer non-nested fields when confidence is equal', async () => {
      const templateWithDuplicates = {
        ...mockTemplate,
        extractedFields: [
          {
            fieldName: 'price',
            fieldPath: 'price',
            fieldType: 'number',
            isNested: false,
            sampleValue: 150.25,
          },
          {
            fieldName: 'current',
            fieldPath: 'quote.price.current',
            fieldType: 'number',
            isNested: true,
            sampleValue: 150.25,
          },
        ],
      };

      const result = await service.previewAlignment(
        templateWithDuplicates as any,
        'quote_fields',
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty extracted fields', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        extractedFields: [],
      };

      const result = await service.previewAlignment(
        emptyTemplate as any,
        'quote_fields',
      );

      expect(result.alignedFields).toBe(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.unalignedFields.length).toBeGreaterThan(0);
    });

    it('should handle malformed field data', async () => {
      const malformedTemplate = {
        ...mockTemplate,
        extractedFields: [
          {
            fieldName: null,
            fieldPath: undefined,
            fieldType: 'string',
          },
          {
            fieldName: 'valid_field',
            fieldPath: 'valid.path',
            fieldType: 'number',
            isNested: true,
          },
        ],
      };

      const result = await service.previewAlignment(
        malformedTemplate as any,
        'quote_fields',
      );

      expect(result).toBeDefined();
      // Should handle malformed data gracefully
    });

    it('should handle very long field names', async () => {
      const longNameTemplate = {
        ...mockTemplate,
        extractedFields: [
          {
            fieldName: 'a'.repeat(1000),
            fieldPath: 'very.long.nested.field.path.that.goes.on.forever',
            fieldType: 'string',
            isNested: true,
          },
        ],
      };

      const result = await service.previewAlignment(
        longNameTemplate as any,
        'quote_fields',
      );

      expect(result).toBeDefined();
      expect(typeof result.alignedFields).toBe('number');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should emit monitoring events for successful operations', async () => {
      const templateId = '507f1f77bcf86cd799439011';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(null);
      mockRuleModel.create.mockResolvedValue(mockRule);

      await service.generateRuleFromTemplate(templateId, 'quote_fields');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          success: true,
          operation: 'generate-rule',
          duration: expect.any(Number),
        }),
      );
    });

    it('should emit monitoring events for failed operations', async () => {
      const templateId = 'nonexistent';

      mockTemplateModel.findById.mockResolvedValue(null);

      try {
        await service.generateRuleFromTemplate(templateId, 'quote_fields');
      } catch (error) {
        // Expected to throw
      }

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          success: false,
          operation: 'generate-rule',
          error: expect.any(String),
        }),
      );
    });

    it('should handle asynchronous monitoring events', (done) => {
      const templateId = '507f1f77bcf86cd799439011';

      mockTemplateModel.findById.mockResolvedValue(mockTemplate);
      mockRuleModel.findOne.mockResolvedValue(null);
      mockRuleModel.create.mockResolvedValue(mockRule);

      service.generateRuleFromTemplate(templateId, 'quote_fields').then(() => {
        // Wait for setImmediate to execute
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate overall confidence correctly', async () => {
      const adjustments = [
        {
          action: 'add' as const,
          sourceField: 'high_confidence_field',
          targetField: 'highTarget',
          confidence: 0.9,
        },
        {
          action: 'add' as const,
          sourceField: 'low_confidence_field',
          targetField: 'lowTarget',
          confidence: 0.6,
        },
      ];

      mockRuleModel.findById.mockResolvedValue(mockRule);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue(mockRule);

      const result = await service.manualAdjustFieldMapping(
        '507f1f77bcf86cd799439012',
        adjustments,
      );

      expect(result).toBeDefined();
      // The overall confidence should be calculated based on all field mappings
    });

    it('should handle zero field mappings for confidence calculation', async () => {
      const ruleWithNoMappings = {
        ...mockRule,
        fieldMappings: [],
      };

      const adjustments = [
        {
          action: 'remove' as const,
          targetField: 'symbol',
        },
        {
          action: 'remove' as const,
          targetField: 'lastPrice',
        },
      ];

      mockRuleModel.findById.mockResolvedValue(ruleWithNoMappings);
      mockRuleModel.findByIdAndUpdate.mockResolvedValue(ruleWithNoMappings);

      const result = await service.manualAdjustFieldMapping(
        '507f1f77bcf86cd799439012',
        adjustments,
      );

      expect(result).toBeDefined();
    });
  });
});