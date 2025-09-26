import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';

import { AlertRuleRepository } from '@alert/repositories/alert-rule.repository';
import { AlertRule } from '@alert/schemas/alert-rule.schema';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '@alert/dto';
import { IAlertRule } from '@alert/interfaces';
import { AlertSeverity } from '@alert/types/alert.types';
import { BusinessException } from '@common/core/exceptions';

describe('AlertRuleRepository', () => {
  let repository: AlertRuleRepository;
  let mockModel: any;

  const mockAlertRule: IAlertRule = {
    id: '507f1f77bcf86cd799439011',
    name: 'Test Alert Rule',
    description: 'Test description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: { environment: 'test' },
    createdBy: 'test-user',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z')
  };

  const mockCreateDto: CreateAlertRuleDto = {
    name: 'Test Alert Rule',
    description: 'Test description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: { environment: 'test' }
  };

  const mockUpdateDto: UpdateAlertRuleDto = {
    name: 'Updated Alert Rule',
    description: 'Updated description',
    threshold: 90,
    enabled: false
  };

  beforeEach(async () => {
    const mockQueryChain = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue(mockAlertRule)
      })
    }));

    mockModel.find = jest.fn(() => mockQueryChain);
    mockModel.findOne = jest.fn(() => mockQueryChain);
    mockModel.findOneAndUpdate = jest.fn(() => mockQueryChain);
    mockModel.updateOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }));
    mockModel.deleteOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }));
    mockModel.countDocuments = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(5) }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleRepository,
        {
          provide: getModelToken(AlertRule.name),
          useValue: mockModel
        }
      ]
    }).compile();

    repository = module.get<AlertRuleRepository>(AlertRuleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new alert rule successfully', async () => {
      const mockInstance = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(mockAlertRule)
        })
      };

      mockModel.mockReturnValueOnce(mockInstance);

      const result = await repository.create({ ...mockCreateDto, id: mockAlertRule.id });

      expect(mockModel).toHaveBeenCalledWith({ ...mockCreateDto, id: mockAlertRule.id });
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockAlertRule);
    });

    it('should handle save errors', async () => {
      const mockError = new Error('Database save error');
      const mockInstance = {
        save: jest.fn().mockRejectedValue(mockError)
      };

      mockModel.mockReturnValueOnce(mockInstance);

      await expect(repository.create({ ...mockCreateDto, id: mockAlertRule.id }))
        .rejects.toThrow(mockError);
    });
  });

  describe('update', () => {
    it('should update an existing alert rule successfully', async () => {
      const updatedRule = { ...mockAlertRule, ...mockUpdateDto };

      mockModel.findOneAndUpdate().exec.mockResolvedValue(updatedRule);

      const result = await repository.update(mockAlertRule.id, mockUpdateDto);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockAlertRule.id },
        { ...mockUpdateDto, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedRule);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidId = 'invalid-id';

      await expect(repository.update(invalidId, mockUpdateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BusinessException when rule not found', async () => {
      mockModel.findOneAndUpdate().exec.mockResolvedValue(null);

      await expect(repository.update(mockAlertRule.id, mockUpdateDto))
        .rejects.toThrow(BusinessException);
    });
  });

  describe('delete', () => {
    it('should delete an alert rule successfully', async () => {
      mockModel.deleteOne = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      }));

      const result = await repository.delete(mockAlertRule.id);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ id: mockAlertRule.id });
      expect(result).toBe(true);
    });

    it('should return false when rule not found', async () => {
      mockModel.deleteOne = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 })
      }));

      const result = await repository.delete(mockAlertRule.id);

      expect(result).toBe(false);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidId = 'invalid-id';

      await expect(repository.delete(invalidId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all alert rules', async () => {
      const mockRules = [mockAlertRule];
      mockModel.find().exec.mockResolvedValue(mockRules);

      const result = await repository.findAll();

      expect(mockModel.find).toHaveBeenCalledWith();
      expect(result).toEqual(mockRules);
    });
  });

  describe('findAllEnabled', () => {
    it('should return all enabled alert rules', async () => {
      const mockRules = [{ ...mockAlertRule, enabled: true }];
      mockModel.find().exec.mockResolvedValue(mockRules);

      const result = await repository.findAllEnabled();

      expect(mockModel.find).toHaveBeenCalledWith({ enabled: true });
      expect(result).toEqual(mockRules);
    });
  });

  describe('findById', () => {
    it('should return alert rule by id', async () => {
      mockModel.findOne().exec.mockResolvedValue(mockAlertRule);

      const result = await repository.findById(mockAlertRule.id);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: mockAlertRule.id });
      expect(result).toEqual(mockAlertRule);
    });

    it('should return null when rule not found', async () => {
      mockModel.findOne().exec.mockResolvedValue(null);

      const result = await repository.findById(mockAlertRule.id);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidId = 'invalid-id';

      await expect(repository.findById(invalidId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('toggle', () => {
    it('should toggle alert rule enabled status successfully', async () => {
      mockModel.updateOne = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 })
      }));

      const result = await repository.toggle(mockAlertRule.id, false);

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { id: mockAlertRule.id },
        { enabled: false, updatedAt: expect.any(Date) }
      );
      expect(result).toBe(true);
    });

    it('should return false when rule not found', async () => {
      mockModel.updateOne = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 })
      }));

      const result = await repository.toggle(mockAlertRule.id, false);

      expect(result).toBe(false);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidId = 'invalid-id';

      await expect(repository.toggle(invalidId, false))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('countAll', () => {
    it('should return total count of alert rules', async () => {
      const mockCount = 5;
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(mockCount)
      }));

      const result = await repository.countAll();

      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result).toBe(mockCount);
    });
  });

  describe('countEnabled', () => {
    it('should return count of enabled alert rules', async () => {
      const mockCount = 3;
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(mockCount)
      }));

      const result = await repository.countEnabled();

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ enabled: true });
      expect(result).toBe(mockCount);
    });
  });
});