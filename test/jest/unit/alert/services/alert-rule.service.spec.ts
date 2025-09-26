import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertRuleRepository } from '@alert/repositories/alert-rule.repository';
import { AlertRuleValidator } from '@alert/validators/alert-rule.validator';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '@alert/dto';
import { IAlertRule } from '@alert/interfaces';
import { AlertSeverity } from '@alert/types/alert.types';
import { AlertNotificationChannelType } from '@alert/dto/alert-rule.dto';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let mockAlertRuleRepository: any;
  let mockRuleValidator: any;

  const mockCreateRuleDto: CreateAlertRuleDto = {
    name: 'Test Rule',
    description: 'Test rule description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldown: 300,
    duration: 60,
    tags: { team: 'infrastructure' },
    channels: [
      {
        id: 'channel_1',
        type: AlertNotificationChannelType.EMAIL,
        name: 'Email Channel',
        enabled: true,
        config: { recipients: ['admin@example.com'] },
        retryCount: 3,
        timeout: 5000
      }
    ]
  };

  const mockAlertRule: IAlertRule = {
    id: '507f1f77bcf86cd799439011',
    name: 'Test Rule',
    description: 'Test rule description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldown: 300,
    duration: 60,
    tags: { team: 'infrastructure' },
    channels: [
      {
        id: 'channel_1',
        type: AlertNotificationChannelType.EMAIL,
        name: 'Email Channel',
        enabled: true,
        config: { recipients: ['admin@example.com'] },
        retryCount: 3,
        timeout: 5000
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUpdateRuleDto: UpdateAlertRuleDto = {
    name: 'Updated Test Rule',
    threshold: 85,
    enabled: false
  };

  beforeEach(async () => {
    mockAlertRuleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllEnabled: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      toggle: jest.fn(),
      countAll: jest.fn(),
      countEnabled: jest.fn()
    };

    mockRuleValidator = {
      validateRule: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleService,
        { provide: AlertRuleRepository, useValue: mockAlertRuleRepository },
        { provide: AlertRuleValidator, useValue: mockRuleValidator }
      ],
    }).compile();

    service = module.get<AlertRuleService>(AlertRuleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create Rule', () => {
    it('should create rule successfully', async () => {
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.create.mockResolvedValue(mockAlertRule);

      const result = await service.createRule(mockCreateRuleDto);

      expect(mockRuleValidator.validateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCreateRuleDto,
          id: 'temp'
        })
      );

      expect(mockAlertRuleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCreateRuleDto,
          id: expect.stringMatching(/^rule_\d+_\w+$/),
          channels: expect.arrayContaining([
            expect.objectContaining({
              id: 'channel_1',
              type: AlertNotificationChannelType.EMAIL
            })
          ])
        })
      );

      expect(result).toEqual(mockAlertRule);
    });

    it('should create rule without channels', async () => {
      const createDto = { ...mockCreateRuleDto, channels: undefined };
      const expectedRule = { ...mockAlertRule, channels: [] };

      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.create.mockResolvedValue(expectedRule);

      const result = await service.createRule(createDto);

      expect(mockAlertRuleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: []
        })
      );

      expect(result).toEqual(expectedRule);
    });

    it('should handle validation failure', async () => {
      const validationErrors = ['Invalid threshold value', 'Missing required field'];
      mockRuleValidator.validateRule.mockReturnValue({
        valid: false,
        errors: validationErrors
      });

      await expect(service.createRule(mockCreateRuleDto)).rejects.toThrow();

      expect(mockAlertRuleRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository create errors', async () => {
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createRule(mockCreateRuleDto)).rejects.toThrow('Database error');
    });
  });

  describe('Update Rule', () => {
    it('should update rule successfully', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const updatedRule = { ...mockAlertRule, ...mockUpdateRuleDto };

      mockAlertRuleRepository.findById.mockResolvedValue(mockAlertRule);
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.update.mockResolvedValue(updatedRule);

      const result = await service.updateRule(ruleId, mockUpdateRuleDto);

      expect(mockAlertRuleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(mockRuleValidator.validateRule).toHaveBeenCalled();
      expect(mockAlertRuleRepository.update).toHaveBeenCalledWith(ruleId, mockUpdateRuleDto);
      expect(result).toEqual(updatedRule);
    });

    it('should handle invalid rule ID format', async () => {
      await expect(service.updateRule('invalid-id', mockUpdateRuleDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle rule not found', async () => {
      mockAlertRuleRepository.findById.mockResolvedValue(null);

      await expect(service.updateRule('507f1f77bcf86cd799439011', mockUpdateRuleDto)).rejects.toThrow();
    });

    it('should handle validation failure during update', async () => {
      mockAlertRuleRepository.findById.mockResolvedValue(mockAlertRule);
      mockRuleValidator.validateRule.mockReturnValue({
        valid: false,
        errors: ['Invalid configuration']
      });

      await expect(service.updateRule('507f1f77bcf86cd799439011', mockUpdateRuleDto)).rejects.toThrow();
    });

    it('should handle repository update errors', async () => {
      mockAlertRuleRepository.findById.mockResolvedValue(mockAlertRule);
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateRule('507f1f77bcf86cd799439011', mockUpdateRuleDto)).rejects.toThrow('Update failed');
    });
  });

  describe('Delete Rule', () => {
    it('should delete rule successfully', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockAlertRuleRepository.delete.mockResolvedValue(true);

      const result = await service.deleteRule(ruleId);

      expect(mockAlertRuleRepository.delete).toHaveBeenCalledWith(ruleId);
      expect(result).toBe(true);
    });

    it('should handle invalid rule ID format', async () => {
      await expect(service.deleteRule('invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should handle rule not found during deletion', async () => {
      mockAlertRuleRepository.delete.mockResolvedValue(false);

      const result = await service.deleteRule('507f1f77bcf86cd799439011');

      expect(result).toBe(false);
    });

    it('should handle repository delete errors', async () => {
      mockAlertRuleRepository.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteRule('507f1f77bcf86cd799439011')).rejects.toThrow('Delete failed');
    });
  });

  describe('Get Rule By ID', () => {
    it('should get rule by ID successfully', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockAlertRuleRepository.findById.mockResolvedValue(mockAlertRule);

      const result = await service.getRuleById(ruleId);

      expect(mockAlertRuleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(result).toEqual(mockAlertRule);
    });

    it('should handle invalid rule ID format', async () => {
      await expect(service.getRuleById('invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should handle rule not found', async () => {
      mockAlertRuleRepository.findById.mockResolvedValue(null);

      await expect(service.getRuleById('507f1f77bcf86cd799439011')).rejects.toThrow();
    });

    it('should handle repository findById errors', async () => {
      mockAlertRuleRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.getRuleById('507f1f77bcf86cd799439011')).rejects.toThrow('Database error');
    });
  });

  describe('Get All Rules', () => {
    it('should get all rules successfully', async () => {
      const mockRules = [
        mockAlertRule,
        { ...mockAlertRule, id: '507f1f77bcf86cd799439012', name: 'Another Rule' }
      ];

      mockAlertRuleRepository.findAll.mockResolvedValue(mockRules);

      const result = await service.getAllRules();

      expect(mockAlertRuleRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockRules);
    });

    it('should return empty array when no rules found', async () => {
      mockAlertRuleRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllRules();

      expect(result).toEqual([]);
    });

    it('should handle repository findAll errors', async () => {
      mockAlertRuleRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllRules()).rejects.toThrow('Database error');
    });
  });

  describe('Get Enabled Rules', () => {
    it('should get enabled rules successfully', async () => {
      const enabledRules = [mockAlertRule];
      mockAlertRuleRepository.findAllEnabled.mockResolvedValue(enabledRules);

      const result = await service.getEnabledRules();

      expect(mockAlertRuleRepository.findAllEnabled).toHaveBeenCalled();
      expect(result).toEqual(enabledRules);
    });

    it('should return empty array when no enabled rules', async () => {
      mockAlertRuleRepository.findAllEnabled.mockResolvedValue([]);

      const result = await service.getEnabledRules();

      expect(result).toEqual([]);
    });

    it('should handle repository findAllEnabled errors', async () => {
      mockAlertRuleRepository.findAllEnabled.mockRejectedValue(new Error('Database error'));

      await expect(service.getEnabledRules()).rejects.toThrow('Database error');
    });
  });

  describe('Toggle Rule', () => {
    it('should toggle rule to enabled', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockAlertRuleRepository.toggle.mockResolvedValue(true);

      const result = await service.toggleRule(ruleId, true);

      expect(mockAlertRuleRepository.toggle).toHaveBeenCalledWith(ruleId, true);
      expect(result).toBe(true);
    });

    it('should toggle rule to disabled', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockAlertRuleRepository.toggle.mockResolvedValue(true);

      const result = await service.toggleRule(ruleId, false);

      expect(mockAlertRuleRepository.toggle).toHaveBeenCalledWith(ruleId, false);
      expect(result).toBe(true);
    });

    it('should handle invalid rule ID format', async () => {
      await expect(service.toggleRule('invalid-id', true)).rejects.toThrow(BadRequestException);
    });

    it('should handle toggle errors', async () => {
      mockAlertRuleRepository.toggle.mockRejectedValue(new Error('Toggle failed'));

      await expect(service.toggleRule('507f1f77bcf86cd799439011', true)).rejects.toThrow('Toggle failed');
    });
  });

  describe('Batch Toggle Rules', () => {
    it('should batch toggle rules successfully', async () => {
      const ruleIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      mockAlertRuleRepository.toggle.mockResolvedValue(true);

      const result = await service.batchToggleRules(ruleIds, true);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle partial failures in batch toggle', async () => {
      const ruleIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      mockAlertRuleRepository.toggle
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Toggle failed'));

      const result = await service.batchToggleRules(ruleIds, true);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('507f1f77bcf86cd799439012');
    });
  });

  describe('Get Rule Statistics', () => {
    it('should get rule statistics successfully', async () => {
      mockAlertRuleRepository.countAll.mockResolvedValue(10);
      mockAlertRuleRepository.countEnabled.mockResolvedValue(7);

      const result = await service.getRuleStats();

      expect(mockAlertRuleRepository.countAll).toHaveBeenCalled();
      expect(mockAlertRuleRepository.countEnabled).toHaveBeenCalled();
      expect(result).toEqual({
        totalRules: 10,
        enabledRules: 7,
        disabledRules: 3
      });
    });

    it('should handle repository count errors', async () => {
      mockAlertRuleRepository.countAll.mockRejectedValue(new Error('Count error'));

      await expect(service.getRuleStats()).rejects.toThrow('Count error');
    });
  });

  describe('Validate Rule', () => {
    it('should validate rule successfully', () => {
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });

      const result = service.validateRule(mockAlertRule);

      expect(mockRuleValidator.validateRule).toHaveBeenCalledWith(mockAlertRule);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should return validation errors', () => {
      const validationErrors = ['Invalid threshold', 'Missing metric'];
      mockRuleValidator.validateRule.mockReturnValue({
        valid: false,
        errors: validationErrors
      });

      const result = service.validateRule(mockAlertRule);

      expect(result).toEqual({
        valid: false,
        errors: validationErrors
      });
    });

    it('should handle validator errors', () => {
      mockRuleValidator.validateRule.mockImplementation(() => {
        throw new Error('Validator error');
      });

      expect(() => service.validateRule(mockAlertRule)).toThrow('Validator error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent rule operations', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockAlertRuleRepository.findById.mockResolvedValue(mockAlertRule);

      const promises = [
        service.getRuleById(ruleId),
        service.getRuleById(ruleId),
        service.getRuleById(ruleId)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockAlertRule);
      });
    });

    it('should handle large batch operations', async () => {
      const manyRules = new Array(100).fill(mockAlertRule).map((rule, index) => ({
        ...rule,
        id: `rule_${index}`,
        name: `Rule ${index}`
      }));

      mockAlertRuleRepository.findAll.mockResolvedValue(manyRules);

      const result = await service.getAllRules();

      expect(result).toHaveLength(100);
      expect(result[0].name).toBe('Rule 0');
      expect(result[99].name).toBe('Rule 99');
    });

    it('should handle empty rule validation', () => {
      const emptyRule = {} as IAlertRule;
      mockRuleValidator.validateRule.mockReturnValue({
        valid: false,
        errors: ['Rule is empty']
      });

      const result = service.validateRule(emptyRule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rule is empty');
    });

    it('should handle network timeout during creation', async () => {
      mockRuleValidator.validateRule.mockReturnValue({ valid: true, errors: [] });
      mockAlertRuleRepository.create.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      await expect(service.createRule(mockCreateRuleDto)).rejects.toThrow('Network timeout');
    });
  });
});