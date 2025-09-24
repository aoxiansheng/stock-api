import { Test, TestingModule } from '@nestjs/testing';
import { AlertRuleService } from '../../../../src/alert/services/alert-rule.service';
import { AlertRuleRepository } from '../../../../src/alert/repositories/alert-rule.repository';
import { AlertRuleValidator } from '../../../../src/alert/validators/alert-rule.validator';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertNotificationChannelDto, AlertNotificationChannelType } from '../../../../src/alert/dto';
import { IAlertRule } from '../../../../src/alert/interfaces';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { DatabaseValidationUtils } from '@common/utils/database.utils';

// Mock 数据
const mockAlertRule: IAlertRule = {
  id: 'rule_1234567890_abcdef',
  name: 'Test Alert Rule',
  description: 'Test alert rule description',
  metric: 'cpu.usage',
  operator: '>',
  threshold: 80,
  duration: 300,
  severity: 'warning',
  enabled: true,
  channels: [
    {
      id: 'channel_1',
      name: 'Email Channel',
      type: 'email' as any,
      config: { email: 'test@example.com' },
      enabled: true,
    }
  ],
  cooldown: 600,
  tags: { environment: 'test' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateRuleDto: CreateAlertRuleDto = {
  name: 'Test Alert Rule',
  description: 'Test alert rule description',
  metric: 'cpu.usage',
  operator: '>',
  threshold: 80,
  duration: 300,
  severity: 'warning' as any,
  enabled: true,
  channels: [
    {
      name: 'Email Channel',
      type: AlertNotificationChannelType.EMAIL,
      config: { email: 'test@example.com' },
      enabled: true,
    }
  ],
  cooldown: 600,
  tags: { environment: 'test' },
};

const mockUpdateRuleDto: UpdateAlertRuleDto = {
  name: 'Updated Alert Rule',
  description: 'Updated alert rule description',
  metric: 'memory.usage',
  operator: '<',
  threshold: 20,
  duration: 600,
  severity: 'critical' as any,
  enabled: false,
  channels: [
    {
      name: 'SMS Channel',
      type: AlertNotificationChannelType.SMS,
      config: { phone: '+1234567890' },
      enabled: true,
    }
  ],
  cooldown: 1200,
  tags: { environment: 'prod' },
};

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let repository: jest.Mocked<AlertRuleRepository>;
  let validator: jest.Mocked<AlertRuleValidator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleService,
        {
          provide: AlertRuleRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
            findAllEnabled: jest.fn(),
            findById: jest.fn(),
            toggle: jest.fn(),
            countAll: jest.fn(),
            countEnabled: jest.fn(),
          },
        },
        {
          provide: AlertRuleValidator,
          useValue: {
            validateRule: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AlertRuleService);
    repository = module.get(AlertRuleRepository);
    validator = module.get(AlertRuleValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    it('should create a new alert rule successfully', async () => {
      // Arrange
      const ruleWithId = {
        ...mockCreateRuleDto,
        id: 'rule_1234567890_abcdef',
      } as any;
      
      validator.validateRule.mockReturnValue({ valid: true, errors: [] });
      repository.create.mockResolvedValue(mockAlertRule);

      // Act
      const result = await service.createRule(mockCreateRuleDto);

      // Assert
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual(mockAlertRule);
    });

    it('should throw an exception when rule validation fails', async () => {
      // Arrange
      validator.validateRule.mockReturnValue({ 
        valid: false, 
        errors: ['Invalid rule configuration'] 
      });

      // Act & Assert
      await expect(service.createRule(mockCreateRuleDto))
        .rejects
        .toThrow(); // 具体的异常类型可能需要根据实现调整
      
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors during creation', async () => {
      // Arrange
      validator.validateRule.mockReturnValue({ valid: true, errors: [] });
      repository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createRule(mockCreateRuleDto))
        .rejects
        .toThrow('Database error');
      
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('should update an existing alert rule successfully', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockAlertRule);
      validator.validateRule.mockReturnValue({ valid: true, errors: [] });
      repository.update.mockResolvedValue({
        ...mockAlertRule,
        ...mockUpdateRuleDto,
      });

      // Act
      const result = await service.updateRule('rule_1234567890_abcdef', mockUpdateRuleDto);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith('rule_1234567890_abcdef', mockUpdateRuleDto);
      expect(result.name).toBe('Updated Alert Rule');
    });

    it('should throw an exception when rule is not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateRule('nonexistent_rule', mockUpdateRuleDto))
        .rejects
        .toThrow(); // 具体异常类型需要根据实现调整
      
      expect(repository.findById).toHaveBeenCalledWith('nonexistent_rule');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw an exception when rule validation fails', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockAlertRule);
      validator.validateRule.mockReturnValue({ 
        valid: false, 
        errors: ['Invalid rule configuration'] 
      });

      // Act & Assert
      await expect(service.updateRule('rule_1234567890_abcdef', mockUpdateRuleDto))
        .rejects
        .toThrow(); // 具体异常类型需要根据实现调整
      
      expect(repository.findById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('should delete an alert rule successfully', async () => {
      // Arrange
      repository.delete.mockResolvedValue(true);

      // Act
      const result = await service.deleteRule('rule_1234567890_abcdef');

      // Assert
      expect(repository.delete).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(result).toBe(true);
    });

    it('should return false when rule does not exist', async () => {
      // Arrange
      repository.delete.mockResolvedValue(false);

      // Act
      const result = await service.deleteRule('nonexistent_rule');

      // Assert
      expect(repository.delete).toHaveBeenCalledWith('nonexistent_rule');
      expect(result).toBe(false);
    });
  });

  describe('getAllRules', () => {
    it('should return all alert rules', async () => {
      // Arrange
      const rules = [mockAlertRule];
      repository.findAll.mockResolvedValue(rules);

      // Act
      const result = await service.getAllRules();

      // Assert
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual(rules);
    });

    it('should return empty array when no rules exist', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getAllRules();

      // Assert
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getEnabledRules', () => {
    it('should return all enabled alert rules', async () => {
      // Arrange
      const enabledRule = { ...mockAlertRule, enabled: true };
      repository.findAllEnabled.mockResolvedValue([enabledRule]);

      // Act
      const result = await service.getEnabledRules();

      // Assert
      expect(repository.findAllEnabled).toHaveBeenCalled();
      expect(result).toEqual([enabledRule]);
    });
  });

  describe('getRuleById', () => {
    it('should return an alert rule by ID', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockAlertRule);

      // Act
      const result = await service.getRuleById('rule_1234567890_abcdef');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(result).toEqual(mockAlertRule);
    });

    it('should throw an exception when rule is not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getRuleById('nonexistent_rule'))
        .rejects
        .toThrow(); // 具体异常类型需要根据实现调整
      
      expect(repository.findById).toHaveBeenCalledWith('nonexistent_rule');
    });
  });

  describe('toggleRule', () => {
    it('should toggle rule enabled status to false', async () => {
      // Arrange
      repository.toggle.mockResolvedValue(true);

      // Act
      const result = await service.toggleRule('rule_1234567890_abcdef', false);

      // Assert
      expect(repository.toggle).toHaveBeenCalledWith('rule_1234567890_abcdef', false);
      expect(result).toBe(true);
    });

    it('should toggle rule enabled status to true', async () => {
      // Arrange
      repository.toggle.mockResolvedValue(true);

      // Act
      const result = await service.toggleRule('rule_1234567890_abcdef', true);

      // Assert
      expect(repository.toggle).toHaveBeenCalledWith('rule_1234567890_abcdef', true);
      expect(result).toBe(true);
    });
  });

  describe('batchToggleRules', () => {
    it('should batch toggle rules successfully', async () => {
      // Arrange
      const ruleIds = ['rule_1', 'rule_2', 'rule_3'];
      service.toggleRule = jest.fn().mockResolvedValue(true);

      // Act
      const result = await service.batchToggleRules(ruleIds, true);

      // Assert
      expect(service.toggleRule).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle partial failures in batch toggle', async () => {
      // Arrange
      const ruleIds = ['rule_1', 'rule_2', 'rule_3'];
      service.toggleRule = jest.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Toggle failed'))
        .mockResolvedValueOnce(true);

      // Act
      const result = await service.batchToggleRules(ruleIds, false);

      // Assert
      expect(service.toggleRule).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getRuleStats', () => {
    it('should return rule statistics', async () => {
      // Arrange
      repository.countAll.mockResolvedValue(10);
      repository.countEnabled.mockResolvedValue(7);

      // Act
      const result = await service.getRuleStats();

      // Assert
      expect(repository.countAll).toHaveBeenCalled();
      expect(repository.countEnabled).toHaveBeenCalled();
      expect(result).toEqual({
        totalRules: 10,
        enabledRules: 7,
        disabledRules: 3,
      });
    });
  });

  describe('validateRule', () => {
    it('should validate a rule using the validator', () => {
      // Arrange
      const validationResponse = { valid: true, errors: [] };
      validator.validateRule.mockReturnValue(validationResponse);

      // Act
      const result = service.validateRule(mockAlertRule);

      // Assert
      expect(validator.validateRule).toHaveBeenCalledWith(mockAlertRule);
      expect(result).toEqual(validationResponse);
    });
  });
});