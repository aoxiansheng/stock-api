/* eslint-disable @typescript-eslint/no-unused-vars */

import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationService } from '../../../../../../../src/common/modules/permission/services/permission-validation.service';
import { PermissionDecoratorValidator, ValidationResult, PermissionViolation } from '../../../../../../../src/common/modules/permission/validators/permission-decorator.validator';

describe('PermissionValidationService', () => {
  let service: PermissionValidationService;
  let mockPermissionValidator: Partial<PermissionDecoratorValidator>;

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    // 模拟 PermissionDecoratorValidator
    mockPermissionValidator = {
      validateAllControllers: jest.fn(),
      generateReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionValidationService,
        {
          provide: PermissionDecoratorValidator,
          useValue: mockPermissionValidator,
        },
      ],
    }).compile();

    service = module.get<PermissionValidationService>(PermissionValidationService);
  });

  // 测试 onModuleInit 方法
  it('should call validatePermissions on module init', async () => {
    // 模拟 validatePermissions 方法
    const validatePermissionsSpy = jest.spyOn(service, 'validatePermissions');
    // 模拟 validateAllControllers 返回空数组
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue([]);

    await service.onApplicationBootstrap();

    // 断言 validatePermissions 方法被调用
    expect(validatePermissionsSpy).toHaveBeenCalled();
  });

  // 测试 validatePermissions 方法
  it('should log success if no violations are found', async () => {
    // 模拟 validateAllControllers 返回没有违规的结果
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController',
        violations: [],
        isValid: true,
        totalRoutes: 5,
        validRoutes: 5,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);

    // 模拟 logger.log 方法
    const loggerSpy = jest.spyOn((service as any).logger, 'log');

    await service.validatePermissions();

    // 断言日志中包含成功信息
    expect(loggerSpy).toHaveBeenCalledWith('✅ 权限装饰器验证通过', expect.any(Object));
  });

  it('should log warnings and report if violations are found', async () => {
    // 模拟 validateAllControllers 返回有违规的结果
    const mockViolations: PermissionViolation[] = [
      {
        type: 'missing_require_permissions',
        route: '/test',
        method: 'GET',
        message: 'test violation',
        severity: 'high',
      },
    ];
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController',
        violations: mockViolations,
        isValid: false,
        totalRoutes: 1,
        validRoutes: 0,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    (mockPermissionValidator.generateReport as jest.Mock).mockReturnValue('Test Report');

    // 模拟 logger.warn 方法
    const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

    await service.validatePermissions();

    // 断言日志中包含警告信息和报告
    expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️ 发现权限装饰器问题', expect.any(Object));
    expect(loggerWarnSpy).toHaveBeenCalledWith('权限装饰器验证报告:', 'Test Report');
  });

  // 测试 getLastValidationResult 方法
  it('should return the last validation result', async () => {
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController',
        violations: [],
        isValid: true,
        totalRoutes: 5,
        validRoutes: 5,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    await service.validatePermissions();

    const result = service.getLastValidationResult();
    expect(result).toEqual(mockResults);
  });

  // 测试 getValidationStats 方法
  it('should return correct validation statistics', async () => {
    const mockViolations: PermissionViolation[] = [
      {
        type: 'missing_require_permissions',
        route: '/test',
        method: 'GET',
        message: 'test violation',
        severity: 'high',
      },
    ];
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController1',
        violations: [],
        isValid: true,
        totalRoutes: 5,
        validRoutes: 5,
      },
      {
        controller: 'TestController2',
        violations: mockViolations,
        isValid: false,
        totalRoutes: 1,
        validRoutes: 0,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    await service.validatePermissions();

    const stats = service.getValidationStats();
    expect(stats.totalControllers).toBe(2);
    expect(stats.totalRoutes).toBe(6);
    expect(stats.totalViolations).toBe(1);
    expect(stats.validControllers).toBe(1);
    expect(stats.violationRate).toBeCloseTo(1 / 6 * 100);
    expect(stats.complianceRate).toBeCloseTo(1 / 2 * 100);
    expect(stats.lastValidation).toBeDefined();
  });

  // 测试 hasHighSeverityViolations 方法
  it('should return true if high severity violations exist', async () => {
    const mockViolations: PermissionViolation[] = [
      {
        type: 'missing_require_permissions',
        route: '/test',
        method: 'GET',
        message: 'test violation',
        severity: 'high',
      },
    ];
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController',
        violations: mockViolations,
        isValid: false,
        totalRoutes: 1,
        validRoutes: 0,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    await service.validatePermissions();

    expect(service.hasHighSeverityViolations()).toBe(true);
  });

  it('should return false if no high severity violations exist', async () => {
    const mockViolations: PermissionViolation[] = [
      {
        type: 'missing_require_permissions',
        route: '/test',
        method: 'GET',
        message: 'test violation',
        severity: 'low',
      },
    ];
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController',
        violations: mockViolations,
        isValid: false,
        totalRoutes: 1,
        validRoutes: 0,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    await service.validatePermissions();

    expect(service.hasHighSeverityViolations()).toBe(false);
  });

  // 测试 getHighSeverityViolations 方法
  it('should return a list of high severity violations', async () => {
    const highViolation: PermissionViolation = {
      type: 'missing_require_permissions',
      route: '/test-high',
      method: 'GET',
      message: 'high severity',
      severity: 'high',
    };
    const lowViolation: PermissionViolation = {
      type: 'invalid_permission_combination',
      route: '/test-low',
      method: 'POST',
      message: 'low severity',
      severity: 'low',
    };
    const mockResults: ValidationResult[] = [
      {
        controller: 'TestController1',
        violations: [highViolation, lowViolation],
        isValid: false,
        totalRoutes: 2,
        validRoutes: 0,
      },
      {
        controller: 'TestController2',
        violations: [lowViolation],
        isValid: true,
        totalRoutes: 1,
        validRoutes: 1,
      },
    ];
    (mockPermissionValidator.validateAllControllers as jest.Mock).mockResolvedValue(mockResults);
    await service.validatePermissions();

    const highSeverity = service.getHighSeverityViolations();
    expect(highSeverity).toHaveLength(1);
    expect(highSeverity[0].controller).toBe('TestController1');
    expect(highSeverity[0].violations).toHaveLength(1);
    expect(highSeverity[0].violations[0]).toEqual(highViolation);
  });

  // 测试 generateUsageGuide 方法
  it('should return the permission usage guide', () => {
    const guide = service.generateUsageGuide();
    expect(guide).toContain('权限装饰器使用指南');
    expect(guide).toContain('基本规则');
    expect(guide).toContain('最佳实践');
  });
});
