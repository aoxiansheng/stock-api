
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationService } from '@auth/permission/services/permission-validation.service';
import { PermissionDecoratorValidator, ValidationResult, PermissionViolation } from '@auth/permission/validators/permission-decorator.validator';
import { createLogger } from '../../../../../../src/common/modules/logging';

// Mock the logger to avoid actual logging during tests
jest.mock('../../../../../../src/common/modules/logging', () => ({
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock validator
const mockPermissionDecoratorValidator = {
  validateAllControllers: jest.fn(),
  generateReport: jest.fn(),
};

describe('PermissionValidationService', () => {
  let service: PermissionValidationService;
  let validator: typeof mockPermissionDecoratorValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionValidationService,
        {
          provide: PermissionDecoratorValidator,
          useValue: mockPermissionDecoratorValidator,
        },
      ],
    }).compile();

    service = module.get<PermissionValidationService>(PermissionValidationService);
    validator = module.get(PermissionDecoratorValidator);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should call validatePermissions on bootstrap', async () => {
      const validatePermissionsSpy = jest.spyOn(service, 'validatePermissions').mockResolvedValue([]);
      await service.onApplicationBootstrap();
      expect(validatePermissionsSpy).toHaveBeenCalled();
    });

    it('should log an error if validation fails on bootstrap', async () => {
      const error = new Error('Validation failed');
      jest.spyOn(service, 'validatePermissions').mockRejectedValue(error);
      await service.onApplicationBootstrap();
      const logger = createLogger('');
      expect(logger.error).toHaveBeenCalledWith('权限装饰器验证失败', expect.any(Object));
    });
  });

  describe('validatePermissions', () => {
    it('should log success if there are no violations', async () => {
      const validationResults: ValidationResult[] = [
        { controller: 'TestController', totalRoutes: 1, validRoutes: 1, violations: [], isValid: true },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);

      await service.validatePermissions();

      const logger = createLogger('');
      expect(logger.log).toHaveBeenCalledWith('✅ 权限装饰器验证通过', expect.any(Object));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log a warning if there are violations', async () => {
      const violation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test', message: 'Missing permission', severity: 'high' };
      const validationResults: ValidationResult[] = [
        {
          controller: 'TestController',
          totalRoutes: 1,
          validRoutes: 0,
          violations: [violation],
          isValid: false,
        },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      validator.generateReport.mockReturnValue('Generated report');

      await service.validatePermissions();

      const logger = createLogger('');
      expect(logger.warn).toHaveBeenCalledWith('⚠️ 发现权限装饰器问题', expect.any(Object));
      expect(logger.warn).toHaveBeenCalledWith('权限装饰器验证报告:', 'Generated report');
    });
  });

  describe('getLastValidationResult', () => {
    it('should return the last validation result', async () => {
      const validationResults: ValidationResult[] = [
        { controller: 'TestController', totalRoutes: 1, validRoutes: 1, violations: [], isValid: true },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      await service.validatePermissions();
      expect(service.getLastValidationResult()).toEqual(validationResults);
    });
  });

  describe('getValidationStats', () => {
    it('should return correct validation statistics', async () => {
      const violation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test', message: 'Error', severity: 'high' };
      const validationResults: ValidationResult[] = [
        { controller: 'Ctrl1', totalRoutes: 2, validRoutes: 2, violations: [], isValid: true },
        {
          controller: 'Ctrl2',
          totalRoutes: 3,
          validRoutes: 2,
          violations: [violation],
          isValid: false,
        },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      await service.validatePermissions();

      const stats = service.getValidationStats();

      expect(stats.totalControllers).toBe(2);
      expect(stats.totalRoutes).toBe(5);
      expect(stats.totalViolations).toBe(1);
      expect(stats.validControllers).toBe(1);
      expect(stats.violationRate).toBeCloseTo(20);
      expect(stats.complianceRate).toBeCloseTo(50);
    });
  });

  describe('hasHighSeverityViolations', () => {
    it('should return true if there are high severity violations', async () => {
      const violation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test', message: 'Missing permission', severity: 'high' };
      const validationResults: ValidationResult[] = [
        {
          controller: 'TestController',
          totalRoutes: 1,
          validRoutes: 0,
          violations: [violation],
          isValid: false,
        },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      await service.validatePermissions();
      expect(service.hasHighSeverityViolations()).toBe(true);
    });

    it('should return false if there are no high severity violations', async () => {
      const violation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test', message: 'Warning', severity: 'medium' };
      const validationResults: ValidationResult[] = [
        {
          controller: 'TestController',
          totalRoutes: 1,
          validRoutes: 0,
          violations: [violation],
          isValid: false,
        },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      await service.validatePermissions();
      expect(service.hasHighSeverityViolations()).toBe(false);
    });
  });

  describe('getHighSeverityViolations', () => {
    it('should return only high severity violations', async () => {
      const highViolation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test1', message: 'High risk', severity: 'high' };
      const lowViolation: PermissionViolation = { type: 'missing_require_permissions', method: 'GET', route: '/test2', message: 'Low risk', severity: 'low' };
      const validationResults: ValidationResult[] = [
        {
          controller: 'Ctrl1',
          totalRoutes: 1,
          validRoutes: 0,
          violations: [highViolation],
          isValid: false,
        },
        {
          controller: 'Ctrl2',
          totalRoutes: 1,
          validRoutes: 0,
          violations: [lowViolation],
          isValid: false,
        },
      ];
      validator.validateAllControllers.mockResolvedValue(validationResults);
      await service.validatePermissions();

      const highSeverityViolations = service.getHighSeverityViolations();

      expect(highSeverityViolations).toHaveLength(1);
      expect(highSeverityViolations[0].controller).toBe('Ctrl1');
      expect(highSeverityViolations[0].violations[0].severity).toBe('high');
    });
  });

  describe('generateUsageGuide', () => {
    it('should return a non-empty string containing usage guidelines', () => {
      const guide = service.generateUsageGuide();
      expect(typeof guide).toBe('string');
      expect(guide.length).toBeGreaterThan(0);
      expect(guide).toContain('权限装饰器使用指南');
    });
  });
});
