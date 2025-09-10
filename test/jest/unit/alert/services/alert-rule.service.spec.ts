/**
 * AlertRuleService 单元测试
 * 🎯 测试规则管理服务的核心功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertRuleRepository } from '@alert/repositories/alert-rule.repository';
import { AlertRuleValidator } from '@alert/validators/alert-rule.validator';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '@alert/dto';
import { IAlertRule } from '@alert/interfaces';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let repository: jest.Mocked<AlertRuleRepository>;
  let validator: jest.Mocked<AlertRuleValidator>;

  const mockRule: IAlertRule = {
    id: 'rule_123',
    name: 'Test Rule',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    cooldown: 600,
    severity: 'warning',
    enabled: true,
    channels: [],
    tags: {},
  };

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

    service = module.get<AlertRuleService>(AlertRuleService);
    repository = module.get(AlertRuleRepository);
    validator = module.get(AlertRuleValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    const createDto: CreateAlertRuleDto = {
      name: 'New Rule',
      metric: 'memory_usage',
      operator: '>',
      threshold: 90,
      duration: 300,
      cooldown: 600,
      severity: 'critical',
      enabled: true,
      channels: [],
      tags: {},
    };

    it('应该成功创建规则', async () => {
      validator.validateRule.mockReturnValue({ valid: true, errors: [] });
      repository.create.mockResolvedValue(mockRule);

      const result = await service.createRule(createDto);

      expect(result).toEqual(mockRule);
      expect(validator.validateRule).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('应该在验证失败时抛出异常', async () => {
      validator.validateRule.mockReturnValue({
        valid: false,
        errors: ['Invalid threshold'],
      });

      await expect(service.createRule(createDto)).rejects.toThrow(
        BadRequestException
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    const updateDto: UpdateAlertRuleDto = {
      threshold: 95,
    };

    it('应该成功更新规则', async () => {
      repository.findById.mockResolvedValue(mockRule);
      validator.validateRule.mockReturnValue({ valid: true, errors: [] });
      repository.update.mockResolvedValue({ ...mockRule, threshold: 95 });

      const result = await service.updateRule('rule_123', updateDto);

      expect(result.threshold).toBe(95);
      expect(repository.findById).toHaveBeenCalledWith('rule_123');
      expect(repository.update).toHaveBeenCalledWith('rule_123', updateDto);
    });

    it('应该在规则不存在时抛出异常', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateRule('invalid_id', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('应该成功删除规则', async () => {
      repository.delete.mockResolvedValue(true);

      const result = await service.deleteRule('rule_123');

      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith('rule_123');
    });
  });

  describe('getAllRules', () => {
    it('应该返回所有规则', async () => {
      const rules = [mockRule];
      repository.findAll.mockResolvedValue(rules);

      const result = await service.getAllRules();

      expect(result).toEqual(rules);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('getEnabledRules', () => {
    it('应该返回所有启用的规则', async () => {
      const rules = [mockRule];
      repository.findAllEnabled.mockResolvedValue(rules);

      const result = await service.getEnabledRules();

      expect(result).toEqual(rules);
      expect(repository.findAllEnabled).toHaveBeenCalled();
    });
  });

  describe('getRuleById', () => {
    it('应该返回指定的规则', async () => {
      repository.findById.mockResolvedValue(mockRule);

      const result = await service.getRuleById('rule_123');

      expect(result).toEqual(mockRule);
      expect(repository.findById).toHaveBeenCalledWith('rule_123');
    });

    it('应该在规则不存在时抛出异常', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getRuleById('invalid_id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('toggleRule', () => {
    it('应该成功切换规则状态', async () => {
      repository.toggle.mockResolvedValue(true);

      const result = await service.toggleRule('rule_123', false);

      expect(result).toBe(true);
      expect(repository.toggle).toHaveBeenCalledWith('rule_123', false);
    });
  });

  describe('batchToggleRules', () => {
    it('应该批量切换规则状态', async () => {
      repository.toggle
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await service.batchToggleRules(
        ['rule_1', 'rule_2', 'rule_3'],
        true
      );

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getRuleStats', () => {
    it('应该返回规则统计信息', async () => {
      repository.countAll.mockResolvedValue(10);
      repository.countEnabled.mockResolvedValue(7);

      const result = await service.getRuleStats();

      expect(result).toEqual({
        totalRules: 10,
        enabledRules: 7,
        disabledRules: 3,
      });
    });
  });
});