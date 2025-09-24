import { Test, TestingModule } from '@nestjs/testing';
import { AlertEnhancedModule } from '../../../../src/alert/module/alert-enhanced.module';
import { AlertController } from '../../../../src/alert/controller/alert.controller';
import { AlertOrchestratorService } from '../../../../src/alert/services/alert-orchestrator.service';
import { AlertRuleService } from '../../../../src/alert/services/alert-rule.service';
import { AlertEvaluationService } from '../../../../src/alert/services/alert-evaluation.service';
import { AlertLifecycleService } from '../../../../src/alert/services/alert-lifecycle.service';
import { AlertQueryService } from '../../../../src/alert/services/alert-query.service';
import { AlertCacheService } from '../../../../src/alert/services/alert-cache.service';
import { AlertEventPublisher } from '../../../../src/alert/services/alert-event-publisher.service';
import { AlertRuleRepository } from '../../../../src/alert/repositories/alert-rule.repository';
import { AlertHistoryRepository } from '../../../../src/alert/repositories/alert-history.repository';
import { AlertRuleValidator } from '../../../../src/alert/validators/alert-rule.validator';
import { RuleEvaluator } from '../../../../src/alert/evaluators/rule.evaluator';
import { ConfigService } from '@nestjs/config';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { AlertConstantsValidator } from '../../../../src/alert/utils/constants-validator.util';

describe('AlertEnhancedModule', () => {
  let module: TestingModule;
  let alertEnhancedModule: AlertEnhancedModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AlertEnhancedModule],
    }).compile();

    alertEnhancedModule = module.get(AlertEnhancedModule);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(alertEnhancedModule).toBeDefined();
  });

  describe('module structure', () => {
    it('should provide AlertController', () => {
      const controller = module.get(AlertController);
      expect(controller).toBeDefined();
    });

    it('should provide core services', () => {
      expect(module.get(AlertOrchestratorService)).toBeDefined();
      expect(module.get(AlertRuleService)).toBeDefined();
      expect(module.get(AlertEvaluationService)).toBeDefined();
      expect(module.get(AlertLifecycleService)).toBeDefined();
      expect(module.get(AlertQueryService)).toBeDefined();
      expect(module.get(AlertCacheService)).toBeDefined();
      expect(module.get(AlertEventPublisher)).toBeDefined();
    });

    it('should provide support components', () => {
      expect(module.get(AlertRuleValidator)).toBeDefined();
      expect(module.get(RuleEvaluator)).toBeDefined();
    });

    it('should provide repositories', () => {
      expect(module.get(AlertRuleRepository)).toBeDefined();
      expect(module.get(AlertHistoryRepository)).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerSpy = jest.spyOn((alertEnhancedModule as any).logger, 'log');
      jest.spyOn((alertEnhancedModule as any).logger, 'error').mockImplementation();
    });

    afterEach(() => {
      loggerSpy.mockRestore();
    });

    it('should initialize module successfully with valid constants', async () => {
      // Arrange
      const validateAllSpy = jest.spyOn(AlertConstantsValidator, 'validateAll').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Act
      await alertEnhancedModule.onModuleInit();

      // Assert
      expect(validateAllSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('🚀 Alert模块（增强版）初始化中...');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Alert模块（增强版）初始化完成');
    });

    it('should throw error when constants validation fails', async () => {
      // Arrange
      const validateAllSpy = jest.spyOn(AlertConstantsValidator, 'validateAll').mockReturnValue({
        isValid: false,
        errors: ['Invalid constant value'],
        warnings: []
      });

      // Act & Assert
      await expect(alertEnhancedModule.onModuleInit())
        .rejects
        .toThrow();

      expect(validateAllSpy).toHaveBeenCalled();
    });

    it('should log clean architecture status', async () => {
      // Arrange
      jest.spyOn(AlertConstantsValidator, 'validateAll').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Act
      await alertEnhancedModule.onModuleInit();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('📈 专业化架构状态:');
      expect(loggerSpy).toHaveBeenCalledWith('  🎯 核心服务: 7 个');
      expect(loggerSpy).toHaveBeenCalledWith('  🔧 支持组件: 2 个');
      expect(loggerSpy).toHaveBeenCalledWith('  📊 数据仓储: 2 个');
    });
  });

  describe('module exports', () => {
    it('should export main orchestrator service', () => {
      expect(() => module.get(AlertOrchestratorService)).not.toThrow();
    });

    it('should export specialized services', () => {
      expect(() => module.get(AlertRuleService)).not.toThrow();
      expect(() => module.get(AlertEvaluationService)).not.toThrow();
      expect(() => module.get(AlertLifecycleService)).not.toThrow();
      expect(() => module.get(AlertQueryService)).not.toThrow();
      expect(() => module.get(AlertCacheService)).not.toThrow();
      expect(() => module.get(AlertEventPublisher)).not.toThrow();
    });

    it('should export repositories', () => {
      expect(() => module.get(AlertRuleRepository)).not.toThrow();
      expect(() => module.get(AlertHistoryRepository)).not.toThrow();
    });
  });
});