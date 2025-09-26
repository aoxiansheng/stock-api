
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { PermissionDecoratorValidator, PermissionViolation } from '@auth/permission/validators/permission-decorator.validator';
import { AuthPermissionValidationService } from '@auth/permission/adapters/auth-permission.adapter';

// Mock dependencies
jest.mock('@common/logging/index', () => ({ createLogger: () => ({ log: jest.fn(), warn: jest.fn(), error: jest.fn() }) }));
jest.mock('@common/constants/semantic', () => ({ HTTP_METHOD_ARRAYS: { ALL_STANDARD: ['GET', 'POST'] } }));

describe('PermissionDecoratorValidator', () => {
  let validator: PermissionDecoratorValidator;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let metadataScanner: jest.Mocked<MetadataScanner>;
  let reflector: jest.Mocked<Reflector>;
  let permissionValidationService: jest.Mocked<AuthPermissionValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionDecoratorValidator,
        { provide: DiscoveryService, useValue: { getControllers: jest.fn() } },
        { provide: MetadataScanner, useValue: { getAllMethodNames: jest.fn() } },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: AuthPermissionValidationService, useValue: { hasApiKeyAuth: jest.fn(), hasPermissionRequirements: jest.fn(), getRequiredPermissions: jest.fn(), validatePermissionLevel: jest.fn(), validatePermissionCombination: jest.fn() } },
      ],
    }).compile();

    validator = module.get<PermissionDecoratorValidator>(PermissionDecoratorValidator);
    discoveryService = module.get(DiscoveryService);
    metadataScanner = module.get(MetadataScanner);
    reflector = module.get(Reflector);
    permissionValidationService = module.get(AuthPermissionValidationService);
  });

  describe('validateAllControllers', () => {
    it('should validate all controllers and return results', async () => {
      const mockControllers = [{ name: 'TestController', metatype: {} }] as InstanceWrapper[];
      discoveryService.getControllers.mockReturnValue(mockControllers);
      jest.spyOn(validator as any, 'validateController').mockResolvedValue({ isValid: true, violations: [] });

      const results = await validator.validateAllControllers();

      expect(results).toHaveLength(1);
      expect(discoveryService.getControllers).toHaveBeenCalled();
      expect((validator as any).validateController).toHaveBeenCalledWith(mockControllers[0]);
    });

    it('should handle errors during controller validation', async () => {
        const mockControllers = [{ name: 'TestController', metatype: {} }] as InstanceWrapper[];
        discoveryService.getControllers.mockReturnValue(mockControllers);
        jest.spyOn(validator as any, 'validateController').mockRejectedValue(new Error('fail'));
        const results = await validator.validateAllControllers();
        expect(results).toEqual([]);
    });
  });

  describe('validateController (private)', () => {
    const mockController = { name: 'TestController', metatype: {} } as InstanceWrapper;

    it('should identify missing required permissions', async () => {
      jest.spyOn(validator as any, 'getRoutes').mockReturnValue([{ path: '/test', method: 'GET', handler: () => {} }]);
      permissionValidationService.hasApiKeyAuth.mockReturnValue(true);
      permissionValidationService.hasPermissionRequirements.mockReturnValue(false);
      permissionValidationService.getRequiredPermissions.mockReturnValue([]);
      permissionValidationService.validatePermissionLevel.mockReturnValue({ isValid: true, issues: [] });
      permissionValidationService.validatePermissionCombination.mockReturnValue({ isValid: true, issues: [] });

      const result = await (validator as any).validateController(mockController);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('missing_require_permissions');
    });

    it('should identify permission level inconsistencies', async () => {
        jest.spyOn(validator as any, 'getRoutes').mockReturnValue([{ path: '/test', method: 'GET', handler: () => {} }]);
        permissionValidationService.hasApiKeyAuth.mockReturnValue(false);
        permissionValidationService.getRequiredPermissions.mockReturnValue(['perm1']);
        permissionValidationService.validatePermissionLevel.mockReturnValue({ isValid: false, issues: ['issue'] });
        permissionValidationService.validatePermissionCombination.mockReturnValue({ isValid: true, issues: [] });

        const result = await (validator as any).validateController(mockController);
        expect(result.violations[0].type).toBe('permission_level_inconsistency');
    });

    it('should identify invalid permission combinations', async () => {
        jest.spyOn(validator as any, 'getRoutes').mockReturnValue([{ path: '/test', method: 'GET', handler: () => {} }]);
        permissionValidationService.hasApiKeyAuth.mockReturnValue(false);
        permissionValidationService.getRequiredPermissions.mockReturnValue(['perm1']);
        permissionValidationService.validatePermissionLevel.mockReturnValue({ isValid: true, issues: [] });
        permissionValidationService.validatePermissionCombination.mockReturnValue({ isValid: false, issues: ['issue'] });

        const result = await (validator as any).validateController(mockController);
        expect(result.violations[0].type).toBe('invalid_permission_combination');
    });
  });

  describe('getRoutes (private)', () => {
    it('should extract routes from a controller', () => {
      const controller = { prototype: { testMethod: () => {} } };
      metadataScanner.getAllMethodNames.mockReturnValue(['testMethod']);
      reflector.get.mockImplementation((key, target) => key === '__get__' && target === controller.prototype.testMethod ? '/test' : undefined);

      const routes = (validator as any).getRoutes(controller);

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/test');
      expect(routes[0].method).toBe('GET');
    });

    it('should return empty array for controller without prototype', () => {
        const routes = (validator as any).getRoutes({});
        expect(routes).toEqual([]);
    });
  });

  describe('generateReport', () => {
    it('should generate a report with violation details', () => {
        const results = [
            { controller: 'Test', violations: [{ type: 'missing_require_permissions', severity: 'high', method: 'GET', route: '/test', message: 'msg', recommendation: 'rec' }], isValid: false, totalRoutes: 1, validRoutes: 0 }
        ];
        const report = validator.generateReport(results as any);
        expect(report).toContain('违规详情');
        expect(report).toContain('[HIGH] GET /test');
    });

    it('should generate a clean report when no violations are found', () => {
        const results = [
            { controller: 'Test', violations: [], isValid: true, totalRoutes: 1, validRoutes: 1 }
        ];
        const report = validator.generateReport(results as any);
        expect(report).toContain('✅ 所有控制器的权限装饰器都符合规范！');
    });
  });
});
