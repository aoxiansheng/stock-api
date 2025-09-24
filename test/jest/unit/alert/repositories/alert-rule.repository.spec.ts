import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertRuleRepository } from '../../../../src/alert/repositories/alert-rule.repository';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '../../../../src/alert/dto';
import { IAlertRule } from '../../../../src/alert/interfaces';
import { AlertRule } from '../../../../src/alert/schemas/alert-rule.schema';
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

const mockCreateRuleDto: CreateAlertRuleDto & { id: string } = {
  id: 'rule_1234567890_abcdef',
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
      type: 'email' as any,
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
      type: 'sms' as any,
      config: { phone: '+1234567890' },
      enabled: true,
    }
  ],
  cooldown: 1200,
  tags: { environment: 'prod' },
};

describe('AlertRuleRepository', () => {
  let repository: AlertRuleRepository;
  let alertRuleModel: any;

  const mockAlertRuleModel = {
    new: jest.fn().mockResolvedValue(mockAlertRule),
    constructor: jest.fn().mockResolvedValue(mockAlertRule),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
    exec: jest.fn(),
    lean: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleRepository,
        {
          provide: getModelToken(AlertRule.name),
          useValue: mockAlertRuleModel,
        },
      ],
    }).compile();

    repository = module.get(AlertRuleRepository);
    alertRuleModel = module.get(getModelToken(AlertRule.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new alert rule', async () => {
      // Arrange
      const savedRule = { ...mockAlertRule, toObject: jest.fn().mockReturnValue(mockAlertRule) };
      alertRuleModel.new.mockReturnValue({ save: jest.fn().mockResolvedValue(savedRule) });

      // Act
      const result = await repository.create(mockCreateRuleDto);

      // Assert
      expect(alertRuleModel.new).toHaveBeenCalledWith(mockCreateRuleDto);
      expect(result).toEqual(mockAlertRule);
    });
  });

  describe('update', () => {
    it('should update an existing alert rule', async () => {
      // Arrange
      const updatedRule = { ...mockAlertRule, ...mockUpdateRuleDto, toObject: jest.fn().mockReturnValue({ ...mockAlertRule, ...mockUpdateRuleDto }) };
      alertRuleModel.findOneAndUpdate.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(updatedRule) });

      // Act
      const result = await repository.update('rule_1234567890_abcdef', mockUpdateRuleDto);

      // Assert
      expect(alertRuleModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'rule_1234567890_abcdef' },
        { ...mockUpdateRuleDto, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual({ ...mockAlertRule, ...mockUpdateRuleDto });
    });

    it('should throw an exception when rule is not found for update', async () => {
      // Arrange
      alertRuleModel.findOneAndUpdate.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) });

      // Act & Assert
      await expect(repository.update('nonexistent_rule', mockUpdateRuleDto))
        .rejects
        .toThrow();
    });
  });

  describe('delete', () => {
    it('should delete an alert rule successfully', async () => {
      // Arrange
      alertRuleModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });

      // Act
      const result = await repository.delete('rule_1234567890_abcdef');

      // Assert
      expect(alertRuleModel.deleteOne).toHaveBeenCalledWith({ id: 'rule_1234567890_abcdef' });
      expect(result).toBe(true);
    });

    it('should return false when rule is not found for deletion', async () => {
      // Arrange
      alertRuleModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) });

      // Act
      const result = await repository.delete('nonexistent_rule');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all alert rules', async () => {
      // Arrange
      alertRuleModel.find.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([mockAlertRule]) });

      // Act
      const result = await repository.findAll();

      // Assert
      expect(alertRuleModel.find).toHaveBeenCalled();
      expect(result).toEqual([mockAlertRule]);
    });
  });

  describe('findAllEnabled', () => {
    it('should return all enabled alert rules', async () => {
      // Arrange
      const enabledRule = { ...mockAlertRule, enabled: true };
      alertRuleModel.find.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([enabledRule]) });

      // Act
      const result = await repository.findAllEnabled();

      // Assert
      expect(alertRuleModel.find).toHaveBeenCalledWith({ enabled: true });
      expect(result).toEqual([enabledRule]);
    });
  });

  describe('findById', () => {
    it('should return an alert rule by ID', async () => {
      // Arrange
      alertRuleModel.findOne.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockAlertRule) });

      // Act
      const result = await repository.findById('rule_1234567890_abcdef');

      // Assert
      expect(alertRuleModel.findOne).toHaveBeenCalledWith({ id: 'rule_1234567890_abcdef' });
      expect(result).toEqual(mockAlertRule);
    });

    it('should return null when rule is not found', async () => {
      // Arrange
      alertRuleModel.findOne.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) });

      // Act
      const result = await repository.findById('nonexistent_rule');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('toggle', () => {
    it('should toggle rule enabled status to true', async () => {
      // Arrange
      alertRuleModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });

      // Act
      const result = await repository.toggle('rule_1234567890_abcdef', true);

      // Assert
      expect(alertRuleModel.updateOne).toHaveBeenCalledWith(
        { id: 'rule_1234567890_abcdef' },
        { enabled: true, updatedAt: expect.any(Date) }
      );
      expect(result).toBe(true);
    });

    it('should toggle rule enabled status to false', async () => {
      // Arrange
      alertRuleModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });

      // Act
      const result = await repository.toggle('rule_1234567890_abcdef', false);

      // Assert
      expect(alertRuleModel.updateOne).toHaveBeenCalledWith(
        { id: 'rule_1234567890_abcdef' },
        { enabled: false, updatedAt: expect.any(Date) }
      );
      expect(result).toBe(true);
    });

    it('should return false when no documents are modified', async () => {
      // Arrange
      alertRuleModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }) });

      // Act
      const result = await repository.toggle('nonexistent_rule', true);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('countAll', () => {
    it('should return total count of all alert rules', async () => {
      // Arrange
      alertRuleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(10) });

      // Act
      const result = await repository.countAll();

      // Assert
      expect(alertRuleModel.countDocuments).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });

  describe('countEnabled', () => {
    it('should return count of enabled alert rules', async () => {
      // Arrange
      alertRuleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(7) });

      // Act
      const result = await repository.countEnabled();

      // Assert
      expect(alertRuleModel.countDocuments).toHaveBeenCalledWith({ enabled: true });
      expect(result).toBe(7);
    });
  });
});