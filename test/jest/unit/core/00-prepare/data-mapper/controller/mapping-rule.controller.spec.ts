import { Test, TestingModule } from '@nestjs/testing';
import { MappingRuleController } from '@core/00-prepare/data-mapper/controller/mapping-rule.controller';
import { FlexibleMappingRuleService } from '@core/00-prepare/data-mapper/services/flexible-mapping-rule.service';
import { RuleAlignmentService } from '@core/00-prepare/data-mapper/services/rule-alignment.service';
import { PersistedTemplateService } from '@core/00-prepare/data-mapper/services/persisted-template.service';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  FlexibleMappingTestResultDto,
} from '@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { Types } from 'mongoose';

describe('MappingRuleController', () => {
  let controller: MappingRuleController;
  let mockFlexibleMappingRuleService: any;
  let mockRuleAlignmentService: any;
  let mockPersistedTemplateService: any;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: new Types.ObjectId().toHexString(),
    name: 'Test Mapping Rule',
    provider: 'longport',
    apiType: 'get-stock-quote',
    transDataRuleListType: 'quote_fields',
    fieldMappings: [
      {
        sourceFieldPath: 'symbol',
        targetField: 'stock_symbol'
      }
    ],
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const mockTemplate = {
    _id: new Types.ObjectId().toHexString(),
    name: 'Test Template',
    provider: 'longport',
    apiType: 'get-stock-quote',
    fields: ['symbol', 'price', 'volume'],
    sampleData: { symbol: 'AAPL', price: 150.0, volume: 1000000 },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    mockFlexibleMappingRuleService = {
      createRule: jest.fn(),
      findRules: jest.fn(),
      findRuleById: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      applyFlexibleMappingRule: jest.fn(),
    };

    mockRuleAlignmentService = {
      generateRuleFromTemplate: jest.fn(),
      previewAlignment: jest.fn(),
      realignExistingRule: jest.fn(),
      manualAdjustFieldMapping: jest.fn(),
    };

    mockPersistedTemplateService = {
      getPersistedTemplateById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MappingRuleController],
      providers: [
        {
          provide: FlexibleMappingRuleService,
          useValue: mockFlexibleMappingRuleService
        },
        {
          provide: RuleAlignmentService,
          useValue: mockRuleAlignmentService
        },
        {
          provide: PersistedTemplateService,
          useValue: mockPersistedTemplateService
        }
      ],
    }).compile();

    controller = module.get<MappingRuleController>(MappingRuleController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rule Management', () => {
    describe('createFlexibleRule', () => {
      it('should create a new mapping rule', async () => {
        const createDto: CreateFlexibleMappingRuleDto = {
          name: 'Test Rule',
          provider: 'longport',
          apiType: 'get-stock-quote',
          transDataRuleListType: 'quote_fields',
          fieldMappings: [
            {
              sourceFieldPath: 'symbol',
              targetField: 'stock_symbol'
            }
          ]
        } as any;

        mockFlexibleMappingRuleService.createRule.mockResolvedValue(mockRule);

        const result = await controller.createFlexibleRule(createDto);

        expect(mockFlexibleMappingRuleService.createRule).toHaveBeenCalledWith(createDto);
        expect(result).toEqual(mockRule);
      });

      it('should handle service errors during rule creation', async () => {
        const createDto: CreateFlexibleMappingRuleDto = {
          name: 'Invalid Rule'
        } as any;

        const error = new Error('Invalid rule configuration');
        mockFlexibleMappingRuleService.createRule.mockRejectedValue(error);

        await expect(controller.createFlexibleRule(createDto)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.createRule).toHaveBeenCalledWith(createDto);
      });
    });

    describe('getFlexibleRules', () => {
      it('should return paginated rules without filters', async () => {
        const paginatedRules: PaginatedDataDto<FlexibleMappingRuleResponseDto> = {
          items: [mockRule],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        };

        mockFlexibleMappingRuleService.findRules.mockResolvedValue(paginatedRules);

        const result = await controller.getFlexibleRules(1, 10);

        expect(mockFlexibleMappingRuleService.findRules).toHaveBeenCalledWith(
          1, 10, undefined, undefined, undefined
        );
        expect(result).toEqual(paginatedRules);
      });

      it('should return filtered rules', async () => {
        const paginatedRules: PaginatedDataDto<FlexibleMappingRuleResponseDto> = {
          items: [mockRule],
          pagination: {
            page: 1,
            limit: 5,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        };

        mockFlexibleMappingRuleService.findRules.mockResolvedValue(paginatedRules);

        const result = await controller.getFlexibleRules(
          1, 5, 'longport', 'get-stock-quote', 'quote_fields'
        );

        expect(mockFlexibleMappingRuleService.findRules).toHaveBeenCalledWith(
          1, 5, 'longport', 'get-stock-quote', 'quote_fields'
        );
        expect(result).toEqual(paginatedRules);
      });

      it('should handle empty results', async () => {
        const emptyPaginatedRules: PaginatedDataDto<FlexibleMappingRuleResponseDto> = {
          items: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };

        mockFlexibleMappingRuleService.findRules.mockResolvedValue(emptyPaginatedRules);

        const result = await controller.getFlexibleRules();

        expect(result.items).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
      });
    });

    describe('getRuleById', () => {
      it('should return rule by ID', async () => {
        const ruleId = mockRule.id;
        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);

        const result = await controller.getRuleById(ruleId);

        expect(mockFlexibleMappingRuleService.findRuleById).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual(mockRule);
      });

      it('should handle non-existent rule ID', async () => {
        const nonExistentId = new Types.ObjectId().toHexString();
        const error = new Error('Rule not found');
        mockFlexibleMappingRuleService.findRuleById.mockRejectedValue(error);

        await expect(controller.getRuleById(nonExistentId)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.findRuleById).toHaveBeenCalledWith(nonExistentId);
      });
    });

    describe('updateRule', () => {
      it('should update existing rule', async () => {
        const ruleId = mockRule.id;
        const updateDto: Partial<CreateFlexibleMappingRuleDto> = {
          name: 'Updated Rule Name',
          fieldMappings: [
            {
              sourceFieldPath: 'updated_field',
              targetField: 'new_target'
            }
          ]
        };
        const updatedRule = { ...mockRule, ...updateDto };

        mockFlexibleMappingRuleService.updateRule.mockResolvedValue(updatedRule);

        const result = await controller.updateRule(ruleId, updateDto);

        expect(mockFlexibleMappingRuleService.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
        expect(result).toEqual(updatedRule);
      });

      it('should handle update errors', async () => {
        const ruleId = mockRule.id;
        const updateDto = { name: 'Invalid Update' };
        const error = new Error('Update failed');

        mockFlexibleMappingRuleService.updateRule.mockRejectedValue(error);

        await expect(controller.updateRule(ruleId, updateDto)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
      });
    });

    describe('deleteRule', () => {
      it('should delete rule successfully', async () => {
        const ruleId = mockRule.id;
        mockFlexibleMappingRuleService.deleteRule.mockResolvedValue();

        await controller.deleteRule(ruleId);

        expect(mockFlexibleMappingRuleService.deleteRule).toHaveBeenCalledWith(ruleId);
      });

      it('should handle delete errors', async () => {
        const ruleId = mockRule.id;
        const error = new Error('Delete failed');
        mockFlexibleMappingRuleService.deleteRule.mockRejectedValue(error);

        await expect(controller.deleteRule(ruleId)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.deleteRule).toHaveBeenCalledWith(ruleId);
      });
    });
  });

  describe('Template-Based Rule Generation', () => {
    describe('generateRuleFromTemplate', () => {
      it('should generate rule from template', async () => {
        const templateId = mockTemplate._id;
        const body = {
          transDataRuleListType: 'quote_fields' as const,
          ruleName: 'Generated Rule'
        };
        const generatedRule = { ...mockRule, name: 'Generated Rule' };

        mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue(generatedRule);

        const result = await controller.generateRuleFromTemplate(templateId, body);

        expect(mockRuleAlignmentService.generateRuleFromTemplate).toHaveBeenCalledWith(
          templateId,
          body.transDataRuleListType,
          body.ruleName
        );
        expect(result).toEqual(generatedRule);
      });

      it('should generate rule with default name when not provided', async () => {
        const templateId = mockTemplate._id;
        const body = {
          transDataRuleListType: 'basic_info_fields' as const
        };
        const generatedRule = mockRule;

        mockRuleAlignmentService.generateRuleFromTemplate.mockResolvedValue(generatedRule);

        const result = await controller.generateRuleFromTemplate(templateId, body);

        expect(mockRuleAlignmentService.generateRuleFromTemplate).toHaveBeenCalledWith(
          templateId,
          body.transDataRuleListType,
          undefined
        );
        expect(result).toEqual(generatedRule);
      });

      it('should handle template not found error', async () => {
        const templateId = new Types.ObjectId().toHexString();
        const body = { transDataRuleListType: 'quote_fields' as const };
        const error = new Error('Template not found');

        mockRuleAlignmentService.generateRuleFromTemplate.mockRejectedValue(error);

        await expect(controller.generateRuleFromTemplate(templateId, body)).rejects.toThrow(error);
      });
    });

    describe('previewFieldAlignment', () => {
      it('should preview field alignment', async () => {
        const templateId = mockTemplate._id;
        const transDataRuleListType = 'quote_fields' as const;
        const alignmentResult = {
          alignedFields: [
            {
              sourceFieldPath: 'symbol',
              targetField: 'stock_symbol',
              confidence: 0.95,
              method: 'exact_match'
            }
          ],
          unalignedFields: ['price'],
          confidence: 0.85
        };

        mockPersistedTemplateService.getPersistedTemplateById.mockResolvedValue(mockTemplate);
        mockRuleAlignmentService.previewAlignment.mockResolvedValue(alignmentResult);

        const result = await controller.previewFieldAlignment(templateId, transDataRuleListType);

        expect(mockPersistedTemplateService.getPersistedTemplateById).toHaveBeenCalledWith(templateId);
        expect(mockRuleAlignmentService.previewAlignment).toHaveBeenCalledWith(
          mockTemplate,
          transDataRuleListType
        );
        expect(result).toEqual({
          template: {
            id: mockTemplate._id,
            name: mockTemplate.name,
            provider: mockTemplate.provider,
            apiType: mockTemplate.apiType,
          },
          transDataRuleListType,
          alignmentPreview: alignmentResult,
        });
      });

      it('should handle template not found in preview', async () => {
        const templateId = new Types.ObjectId().toHexString();
        const transDataRuleListType = 'basic_info_fields' as const;
        const error = new Error('Template not found');

        mockPersistedTemplateService.getPersistedTemplateById.mockRejectedValue(error);

        await expect(
          controller.previewFieldAlignment(templateId, transDataRuleListType)
        ).rejects.toThrow(error);
        expect(mockPersistedTemplateService.getPersistedTemplateById).toHaveBeenCalledWith(templateId);
      });
    });
  });

  describe('Rule Alignment and Adjustment', () => {
    describe('realignExistingRule', () => {
      it('should realign existing rule', async () => {
        const ruleId = mockRule.id;
        const realignedRule = { ...mockRule, updatedAt: new Date() };

        mockRuleAlignmentService.realignExistingRule.mockResolvedValue(realignedRule);

        const result = await controller.realignExistingRule(ruleId);

        expect(mockRuleAlignmentService.realignExistingRule).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual(realignedRule);
      });

      it('should handle realignment errors', async () => {
        const ruleId = mockRule.id;
        const error = new Error('Realignment failed');

        mockRuleAlignmentService.realignExistingRule.mockRejectedValue(error);

        await expect(controller.realignExistingRule(ruleId)).rejects.toThrow(error);
        expect(mockRuleAlignmentService.realignExistingRule).toHaveBeenCalledWith(ruleId);
      });
    });

    describe('manualAdjustFieldMapping', () => {
      it('should manually adjust field mapping', async () => {
        const ruleId = mockRule.id;
        const adjustments = [
          {
            action: 'add' as const,
            sourceField: 'new_field',
            targetField: 'new_target',
            confidence: 0.8,
            description: 'Manual addition'
          },
          {
            action: 'remove' as const,
            sourceField: 'old_field'
          },
          {
            action: 'modify' as const,
            sourceField: 'existing_field',
            targetField: 'old_target',
            newTargetField: 'updated_target',
            confidence: 0.9
          }
        ];
        const adjustedRule = { ...mockRule, updatedAt: new Date() };

        mockRuleAlignmentService.manualAdjustFieldMapping.mockResolvedValue(adjustedRule);

        const result = await controller.manualAdjustFieldMapping(ruleId, adjustments);

        expect(mockRuleAlignmentService.manualAdjustFieldMapping).toHaveBeenCalledWith(
          ruleId,
          adjustments
        );
        expect(result).toEqual(adjustedRule);
      });

      it('should handle empty adjustments array', async () => {
        const ruleId = mockRule.id;
        const adjustments = [];

        mockRuleAlignmentService.manualAdjustFieldMapping.mockResolvedValue(mockRule);

        const result = await controller.manualAdjustFieldMapping(ruleId, adjustments);

        expect(mockRuleAlignmentService.manualAdjustFieldMapping).toHaveBeenCalledWith(
          ruleId,
          adjustments
        );
        expect(result).toEqual(mockRule);
      });

      it('should handle adjustment errors', async () => {
        const ruleId = mockRule.id;
        const adjustments = [
          { action: 'add' as const, sourceField: 'invalid' }
        ];
        const error = new Error('Invalid adjustment');

        mockRuleAlignmentService.manualAdjustFieldMapping.mockRejectedValue(error);

        await expect(controller.manualAdjustFieldMapping(ruleId, adjustments)).rejects.toThrow(error);
        expect(mockRuleAlignmentService.manualAdjustFieldMapping).toHaveBeenCalledWith(
          ruleId,
          adjustments
        );
      });
    });
  });

  describe('Rule Testing', () => {
    describe('testMappingRule', () => {
      it('should test mapping rule with debug info', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: mockRule.id,
          testData: {
            symbol: 'AAPL',
            price: 150.0,
            volume: 1000000
          },
          includeDebugInfo: true
        };

        const serviceResult = {
          transformedData: {
            stock_symbol: 'AAPL',
            stock_price: 150.0,
            stock_volume: 1000000
          },
          success: true,
          errorMessage: null,
          mappingStats: {
            totalMappings: 3,
            successfulMappings: 3,
            failedMappings: 0,
            successRate: 100
          },
          debugInfo: [
            {
              sourceFieldPath: 'symbol',
              targetField: 'stock_symbol',
              success: true,
              value: 'AAPL',
              transformedValue: 'AAPL'
            },
            {
              sourceFieldPath: 'price',
              targetField: 'stock_price',
              success: true,
              value: 150.0,
              transformedValue: 150.0
            },
            {
              sourceFieldPath: 'volume',
              targetField: 'stock_volume',
              success: true,
              value: 1000000,
              transformedValue: 1000000
            }
          ]
        };

        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);
        mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(serviceResult);

        const result = await controller.testMappingRule(testDto);

        expect(mockFlexibleMappingRuleService.findRuleById).toHaveBeenCalledWith(testDto.dataMapperRuleId);
        expect(mockFlexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
          mockRule,
          testDto.testData,
          true
        );

        expect(result.dataMapperRuleId).toBe(testDto.dataMapperRuleId);
        expect(result.ruleName).toBe(mockRule.name);
        expect(result.originalData).toEqual(testDto.testData);
        expect(result.transformedData).toEqual(serviceResult.transformedData);
        expect(result.success).toBe(true);
        expect(result.mappingStats.totalMappings).toBe(3);
        expect(result.mappingStats.successfulMappings).toBe(3);
        expect(result.mappingStats.successRate).toBe(100);
        expect(result.debugInfo).toBeDefined();
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });

      it('should test mapping rule without debug info', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: mockRule.id,
          testData: {
            symbol: 'GOOGL'
          },
          includeDebugInfo: false
        };

        const serviceResult = {
          transformedData: {
            stock_symbol: 'GOOGL'
          },
          success: true,
          errorMessage: null,
          mappingStats: {
            totalMappings: 1,
            successfulMappings: 1,
            failedMappings: 0,
            successRate: 100
          },
          debugInfo: null
        };

        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);
        mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(serviceResult);

        const result = await controller.testMappingRule(testDto);

        expect(mockFlexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
          mockRule,
          testDto.testData,
          false
        );
        expect(result.mappingStats).toEqual(serviceResult.mappingStats);
        expect(result.debugInfo).toBeNull();
      });

      it('should handle mapping rule test failures', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: mockRule.id,
          testData: {
            invalid_field: 'test'
          },
          includeDebugInfo: true
        };

        const serviceResult = {
          transformedData: {},
          success: false,
          errorMessage: 'No matching fields found',
          mappingStats: {
            totalMappings: 0,
            successfulMappings: 0,
            failedMappings: 0,
            successRate: 0
          },
          debugInfo: []
        };

        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);
        mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(serviceResult);

        const result = await controller.testMappingRule(testDto);

        expect(result.success).toBe(false);
        expect(result.errorMessage).toBe('No matching fields found');
        expect(result.mappingStats.successRate).toBe(0);
      });

      it('should handle rule not found error in testing', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: new Types.ObjectId().toHexString(),
          testData: { symbol: 'TEST' }
        };

        const error = new Error('Rule not found');
        mockFlexibleMappingRuleService.findRuleById.mockRejectedValue(error);

        await expect(controller.testMappingRule(testDto)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.findRuleById).toHaveBeenCalledWith(testDto.dataMapperRuleId);
        expect(mockFlexibleMappingRuleService.applyFlexibleMappingRule).not.toHaveBeenCalled();
      });

      it('should handle service errors during rule testing', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: mockRule.id,
          testData: { symbol: 'ERROR' }
        };

        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);
        const error = new Error('Mapping service error');
        mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockRejectedValue(error);

        await expect(controller.testMappingRule(testDto)).rejects.toThrow(error);
        expect(mockFlexibleMappingRuleService.applyFlexibleMappingRule).toHaveBeenCalledWith(
          mockRule,
          testDto.testData,
          false
        );
      });

      it('should measure execution time correctly', async () => {
        const testDto: TestFlexibleMappingRuleDto = {
          dataMapperRuleId: mockRule.id,
          testData: { symbol: 'TIME_TEST' }
        };

        const serviceResult = {
          transformedData: { stock_symbol: 'TIME_TEST' },
          success: true,
          errorMessage: null,
          mappingStats: {
            totalMappings: 1,
            successfulMappings: 1,
            failedMappings: 0,
            successRate: 100
          },
          debugInfo: null
        };

        mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(mockRule);
        mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve(serviceResult), 10);
          });
        });

        const result = await controller.testMappingRule(testDto);

        expect(result.executionTime).toBeGreaterThanOrEqual(10);
        expect(result.executionTime).toBeLessThan(1000);
      });
    });
  });

  describe('Integration Testing', () => {
    it('should handle complex workflow: create, update, test, delete', async () => {
      // Create
      const createDto: CreateFlexibleMappingRuleDto = {
        name: 'Integration Test Rule',
        provider: 'longport',
        apiType: 'get-stock-quote',
        transDataRuleListType: 'quote_fields',
        fieldMappings: []
      } as any;

      mockFlexibleMappingRuleService.createRule.mockResolvedValue(mockRule);
      const createResult = await controller.createFlexibleRule(createDto);
      expect(createResult).toEqual(mockRule);

      // Update
      const updateDto = { name: 'Updated Integration Test Rule' };
      const updatedRule = { ...mockRule, ...updateDto };
      mockFlexibleMappingRuleService.updateRule.mockResolvedValue(updatedRule);
      const updateResult = await controller.updateRule(mockRule.id, updateDto);
      expect(updateResult).toEqual(updatedRule);

      // Test
      const testDto: TestFlexibleMappingRuleDto = {
        dataMapperRuleId: mockRule.id,
        testData: { symbol: 'INTEG' }
      };

      const testServiceResult = {
        transformedData: { stock_symbol: 'INTEG' },
        success: true,
        errorMessage: null,
        mappingStats: {
          totalMappings: 1,
          successfulMappings: 1,
          failedMappings: 0,
          successRate: 100
        },
        debugInfo: null
      };

      mockFlexibleMappingRuleService.findRuleById.mockResolvedValue(updatedRule);
      mockFlexibleMappingRuleService.applyFlexibleMappingRule.mockResolvedValue(testServiceResult);
      const testResult = await controller.testMappingRule(testDto);
      expect(testResult.success).toBe(true);

      // Delete
      mockFlexibleMappingRuleService.deleteRule.mockResolvedValue();
      await controller.deleteRule(mockRule.id);
      expect(mockFlexibleMappingRuleService.deleteRule).toHaveBeenCalledWith(mockRule.id);
    });
  });
});