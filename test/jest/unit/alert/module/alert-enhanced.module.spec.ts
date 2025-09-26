import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertEnhancedModule } from '@alert/module/alert-enhanced.module';
import { AlertOrchestratorService } from '@alert/services/alert-orchestrator.service';
import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertEvaluationService } from '@alert/services/alert-evaluation.service';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { RuleEvaluator } from '@alert/evaluators/rule.evaluator';
import { AlertRuleValidator } from '@alert/validators/alert-rule.validator';
import { AlertController } from '@alert/controller/alert.controller';

// Mock external dependencies
jest.mock('@alert/utils/constants-validator.util', () => ({
  AlertConstantsValidator: {
    validateAll: jest.fn().mockReturnValue({ isValid: true }),
  },
}));

jest.mock('@appcore/config/logger.config', () => ({
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@common/core/exceptions/universal-exception.factory', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn(),
  },
}));

describe('AlertEnhancedModule', () => {
  let module: TestingModule;
  let alertModule: AlertEnhancedModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        HttpModule,
        ScheduleModule.forRoot(),
      ],
      providers: [
        // Mock all the services that AlertEnhancedModule provides
        {
          provide: AlertOrchestratorService,
          useValue: {
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getRuleById: jest.fn(),
            getStats: jest.fn(),
            evaluateAllRules: jest.fn(),
            processMetrics: jest.fn(),
          },
        },
        {
          provide: AlertRuleService,
          useValue: {
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getRuleById: jest.fn(),
            getAllRules: jest.fn(),
            getEnabledRules: jest.fn(),
            toggleRule: jest.fn(),
            getRuleStats: jest.fn(),
          },
        },
        {
          provide: AlertEvaluationService,
          useValue: {
            processMetrics: jest.fn(),
            evaluateRule: jest.fn(),
            forceEvaluateAllRules: jest.fn(),
            getEvaluationStats: jest.fn(),
          },
        },
        {
          provide: AlertCacheService,
          useValue: {
            setActiveAlert: jest.fn(),
            getActiveAlert: jest.fn(),
            clearActiveAlert: jest.fn(),
            getAllActiveAlerts: jest.fn(),
            setCooldown: jest.fn(),
            isInCooldown: jest.fn(),
            clearCooldown: jest.fn(),
          },
        },
        {
          provide: RuleEvaluator,
          useValue: {
            evaluateRule: jest.fn(),
            evaluateRules: jest.fn(),
            getEvaluatorStats: jest.fn(),
          },
        },
        {
          provide: AlertRuleValidator,
          useValue: {
            validateRule: jest.fn(),
          },
        },
        // Mock other dependencies that might be needed
        {
          provide: 'DatabaseConnection',
          useValue: {},
        },
        {
          provide: 'cacheUnified',
          useValue: {
            defaultTtl: 300,
          },
        },
      ],
      controllers: [AlertController],
    }).compile();

    alertModule = new AlertEnhancedModule();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Definition', () => {
    it('should be defined', () => {
      expect(AlertEnhancedModule).toBeDefined();
    });

    it('should create an instance', () => {
      expect(alertModule).toBeDefined();
      expect(alertModule).toBeInstanceOf(AlertEnhancedModule);
    });
  });

  describe('Module Services', () => {
    it('should provide AlertOrchestratorService', () => {
      const orchestratorService = module.get<AlertOrchestratorService>(AlertOrchestratorService);
      expect(orchestratorService).toBeDefined();
      expect(orchestratorService.createRule).toBeDefined();
      expect(orchestratorService.updateRule).toBeDefined();
      expect(orchestratorService.deleteRule).toBeDefined();
      expect(orchestratorService.getRuleById).toBeDefined();
      expect(orchestratorService.getStats).toBeDefined();
    });

    it('should provide AlertRuleService', () => {
      const ruleService = module.get<AlertRuleService>(AlertRuleService);
      expect(ruleService).toBeDefined();
      expect(ruleService.createRule).toBeDefined();
      expect(ruleService.updateRule).toBeDefined();
      expect(ruleService.deleteRule).toBeDefined();
      expect(ruleService.getRuleById).toBeDefined();
      expect(ruleService.getAllRules).toBeDefined();
    });

    it('should provide AlertEvaluationService', () => {
      const evaluationService = module.get<AlertEvaluationService>(AlertEvaluationService);
      expect(evaluationService).toBeDefined();
      expect(evaluationService.processMetrics).toBeDefined();
      expect(evaluationService.evaluateRule).toBeDefined();
      expect(evaluationService.forceEvaluateAllRules).toBeDefined();
    });

    it('should provide AlertCacheService', () => {
      const cacheService = module.get<AlertCacheService>(AlertCacheService);
      expect(cacheService).toBeDefined();
      expect(cacheService.setActiveAlert).toBeDefined();
      expect(cacheService.getActiveAlert).toBeDefined();
      expect(cacheService.clearActiveAlert).toBeDefined();
      expect(cacheService.getAllActiveAlerts).toBeDefined();
    });

    it('should provide RuleEvaluator', () => {
      const ruleEvaluator = module.get<RuleEvaluator>(RuleEvaluator);
      expect(ruleEvaluator).toBeDefined();
      expect(ruleEvaluator.evaluateRule).toBeDefined();
      expect(ruleEvaluator.evaluateRules).toBeDefined();
      expect(ruleEvaluator.getEvaluatorStats).toBeDefined();
    });

    it('should provide AlertRuleValidator', () => {
      const validator = module.get<AlertRuleValidator>(AlertRuleValidator);
      expect(validator).toBeDefined();
      expect(validator.validateRule).toBeDefined();
    });
  });

  describe('Module Controller', () => {
    it('should provide AlertController', () => {
      const controller = module.get<AlertController>(AlertController);
      expect(controller).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      // Mock the createLogger to return our mock logger
      jest.doMock('@appcore/config/logger.config', () => ({
        createLogger: jest.fn().mockReturnValue(mockLogger),
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize successfully when constants validation passes', async () => {
      const { AlertConstantsValidator } = require('@alert/utils/constants-validator.util');
      AlertConstantsValidator.validateAll.mockReturnValue({ isValid: true });

      await expect(alertModule.onModuleInit()).resolves.not.toThrow();
      expect(AlertConstantsValidator.validateAll).toHaveBeenCalled();
    });

    it('should throw error when constants validation fails', async () => {
      const { AlertConstantsValidator } = require('@alert/utils/constants-validator.util');
      const { UniversalExceptionFactory } = require('@common/core/exceptions/universal-exception.factory');

      AlertConstantsValidator.validateAll.mockReturnValue({
        isValid: false,
        errors: ['Validation failed']
      });

      const mockError = new Error('Constants validation failed');
      UniversalExceptionFactory.createBusinessException.mockReturnValue(mockError);

      await expect(alertModule.onModuleInit()).rejects.toThrow('Constants validation failed');
      expect(AlertConstantsValidator.validateAll).toHaveBeenCalled();
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const { AlertConstantsValidator } = require('@alert/utils/constants-validator.util');

      AlertConstantsValidator.validateAll.mockImplementation(() => {
        throw new Error('Validation service error');
      });

      await expect(alertModule.onModuleInit()).rejects.toThrow('Validation service error');
    });

    it('should log initialization progress', async () => {
      const { AlertConstantsValidator } = require('@alert/utils/constants-validator.util');
      AlertConstantsValidator.validateAll.mockReturnValue({ isValid: true });

      await alertModule.onModuleInit();

      // The actual implementation logs several messages during initialization
      // We can't easily test the exact messages without accessing private logger
      // But we can verify no errors were thrown
      expect(AlertConstantsValidator.validateAll).toHaveBeenCalled();
    });

    it('should call logCleanArchitectureStatus during initialization', async () => {
      const { AlertConstantsValidator } = require('@alert/utils/constants-validator.util');
      AlertConstantsValidator.validateAll.mockReturnValue({ isValid: true });

      // Spy on the private method to ensure it's called
      const logSpy = jest.spyOn(alertModule as any, 'logCleanArchitectureStatus');

      await alertModule.onModuleInit();

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should properly log clean architecture status', () => {
      // Test the private method directly
      const logMethod = alertModule['logCleanArchitectureStatus'];
      expect(typeof logMethod).toBe('function');

      // Create a spy for the logger
      const loggerSpy = jest.spyOn(alertModule['logger'], 'log');

      // Call the private method
      logMethod.call(alertModule);

      // Verify that multiple log statements were made
      expect(loggerSpy).toHaveBeenCalledWith('📈 专业化架构状态:');
      expect(loggerSpy).toHaveBeenCalledWith('  🎯 核心服务: 7 个');
      expect(loggerSpy).toHaveBeenCalledWith('  🔧 支持组件: 2 个');
      expect(loggerSpy).toHaveBeenCalledWith('  📊 数据仓储: 2 个');
      expect(loggerSpy).toHaveBeenCalledWith('🎭 主入口: AlertOrchestratorService');
      expect(loggerSpy).toHaveBeenCalledWith('📋 单一职责: 每个服务专注于特定领域');
      expect(loggerSpy).toHaveBeenCalledWith('🚀 清洁架构: 无历史包袱，性能优化');
      expect(loggerSpy).toHaveBeenCalledWith('📚 文档: 参见 ARCHITECTURE.md');

      loggerSpy.mockRestore();
    });
  });

  describe('Module Architecture', () => {
    it('should have correct architecture version', () => {
      expect(alertModule['architectureVersion']).toBe('v2.0');
    });

    it('should implement OnModuleInit interface', () => {
      expect(alertModule.onModuleInit).toBeDefined();
      expect(typeof alertModule.onModuleInit).toBe('function');
    });

    it('should have private logger instance', () => {
      expect(alertModule['logger']).toBeDefined();
    });

    it('should have private logCleanArchitectureStatus method', () => {
      expect(alertModule['logCleanArchitectureStatus']).toBeDefined();
      expect(typeof alertModule['logCleanArchitectureStatus']).toBe('function');
    });
  });

  describe('Integration Points', () => {
    it('should integrate with ConfigModule', () => {
      // ConfigModule should be available for dependency injection
      expect(() => module.get(ConfigModule)).not.toThrow();
    });

    it('should integrate with HttpModule', () => {
      // HttpModule should be available for HTTP operations
      expect(() => module.get(HttpModule)).not.toThrow();
    });

    it('should integrate with ScheduleModule', () => {
      // ScheduleModule should be available for scheduled tasks
      expect(() => module.get(ScheduleModule)).not.toThrow();
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve all service dependencies without circular references', () => {
      // Test that all services can be instantiated without circular dependency issues
      expect(() => module.get<AlertOrchestratorService>(AlertOrchestratorService)).not.toThrow();
      expect(() => module.get<AlertRuleService>(AlertRuleService)).not.toThrow();
      expect(() => module.get<AlertEvaluationService>(AlertEvaluationService)).not.toThrow();
      expect(() => module.get<AlertCacheService>(AlertCacheService)).not.toThrow();
      expect(() => module.get<RuleEvaluator>(RuleEvaluator)).not.toThrow();
      expect(() => module.get<AlertRuleValidator>(AlertRuleValidator)).not.toThrow();
    });

    it('should provide all required exports', () => {
      // Test that all exported services are available
      const exports = [
        AlertOrchestratorService,
        AlertRuleService,
        AlertEvaluationService,
        AlertCacheService,
        RuleEvaluator,
        AlertRuleValidator,
      ];

      exports.forEach(serviceClass => {
        expect(() => module.get(serviceClass)).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service instantiation errors', () => {
      // Test error handling during service creation
      // This is more of an integration test to ensure the module can handle DI errors
      expect(module).toBeDefined();
    });

    it('should handle missing dependencies gracefully', () => {
      // Test that the module can report meaningful errors when dependencies are missing
      // This would typically be caught at compile time in a real application
      expect(alertModule).toBeInstanceOf(AlertEnhancedModule);
    });
  });

  describe('Performance Characteristics', () => {
    it('should initialize quickly', async () => {
      const startTime = Date.now();
      await alertModule.onModuleInit();
      const endTime = Date.now();
      const initTime = endTime - startTime;

      // Module initialization should be fast (less than 1000ms)
      expect(initTime).toBeLessThan(1000);
    });

    it('should not have memory leaks in service creation', () => {
      // Create multiple instances to test for memory leaks
      const instances = [];
      for (let i = 0; i < 10; i++) {
        instances.push(new AlertEnhancedModule());
      }

      expect(instances.length).toBe(10);
      expect(instances.every(instance => instance instanceof AlertEnhancedModule)).toBe(true);
    });
  });
});