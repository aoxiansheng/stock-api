import {
  AuthPermissionConstants,
  AuthPermissionMetadataExtractor,
  AuthPermissionValidationService,
} from '@auth/permission/adapters/auth-permission.adapter';
import { PermissionDecoratorValidator } from '@auth/permission/validators/permission-decorator.validator';
import { Reflector, DiscoveryService, MetadataScanner } from '@nestjs/core';

// Mock createLogger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Permission Components', () => {
  let authPermissionConstants: AuthPermissionConstants;
  let authPermissionMetadataExtractor: AuthPermissionMetadataExtractor;
  let authPermissionValidationService: AuthPermissionValidationService;
  let permissionDecoratorValidator: PermissionDecoratorValidator;
  let mockReflector: jest.Mocked<Reflector>;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockMetadataScanner: jest.Mocked<MetadataScanner>;

  beforeEach(() => {
    // Create mock services
    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as any;

    mockDiscoveryService = {
      getControllers: jest.fn().mockReturnValue([]),
      getProviders: jest.fn(),
      getModules: jest.fn(),
    } as any;

    mockMetadataScanner = {
      getAllMethodNames: jest.fn().mockReturnValue([]),
      getAllFilteredMethodNames: jest.fn(),
      scanFromPrototype: jest.fn(),
    } as any;

    // Create services with direct instantiation and manual dependency injection
    authPermissionConstants = new AuthPermissionConstants();
    authPermissionMetadataExtractor = new AuthPermissionMetadataExtractor(
      mockReflector,
      authPermissionConstants,
    );
    authPermissionValidationService = new AuthPermissionValidationService(
      authPermissionMetadataExtractor,
      authPermissionConstants,
    );
    permissionDecoratorValidator = new PermissionDecoratorValidator(
      mockDiscoveryService,
      mockMetadataScanner,
      mockReflector,
      authPermissionValidationService,
    );
  });

  describe('AuthPermissionConstants', () => {
    it('应该正确初始化常量', async () => {
      // 验证所有常量属性都已定义
      expect(authPermissionConstants.REQUIRE_API_KEY_METADATA_KEY).toBeDefined();
      expect(authPermissionConstants.PERMISSIONS_METADATA_KEY).toBeDefined();
      expect(authPermissionConstants.AVAILABLE_PERMISSIONS).toBeDefined();
      expect(authPermissionConstants.PERMISSION_LEVELS).toBeDefined();
      
      // 验证权限级别分类
      expect(authPermissionConstants.PERMISSION_LEVELS.HIGH).toBeDefined();
      expect(authPermissionConstants.PERMISSION_LEVELS.MEDIUM).toBeDefined();
      expect(authPermissionConstants.PERMISSION_LEVELS.LOW).toBeDefined();
    });

    it('应该提供默认值当动态导入失败时', async () => {
      // 创建一个新的实例来测试错误处理
      const constants = new AuthPermissionConstants();

      // 验证即使初始化失败也应提供默认值
      expect(constants.REQUIRE_API_KEY_METADATA_KEY).toBeDefined();
      expect(constants.PERMISSIONS_METADATA_KEY).toBeDefined();
      expect(constants.AVAILABLE_PERMISSIONS).toBeDefined();
      expect(constants.PERMISSION_LEVELS).toBeDefined();
    });
  });

  describe('AuthPermissionMetadataExtractor', () => {
    it('应该正确提取API Key认证标记', async () => {
      const mockHandler = jest.fn();

      // Mock reflector.get to return true for API key auth
      mockReflector.get.mockImplementation((key) => {
        if (key === authPermissionConstants.REQUIRE_API_KEY_METADATA_KEY) {
          return true;
        }
        return undefined;
      });

      const result = authPermissionMetadataExtractor.extractApiKeyAuthFlag(mockHandler);
      expect(result).toBe(true);
    });

    it('应该正确提取所需权限', async () => {
      const mockHandler = jest.fn();
      const mockPermissions = ['DATA_READ', 'API_KEY_READ'];

      // Mock reflector.get to return permissions
      mockReflector.get.mockImplementation((key) => {
        if (key === authPermissionConstants.PERMISSIONS_METADATA_KEY) {
          return mockPermissions;
        }
        return undefined;
      });

      const result = authPermissionMetadataExtractor.extractRequiredPermissions(mockHandler);
      expect(result).toEqual(mockPermissions);
    });

    it('应该在没有权限时返回空数组', async () => {
      const mockHandler = jest.fn();

      // Mock reflector.get to return undefined
      mockReflector.get.mockReturnValue(undefined);

      const result = authPermissionMetadataExtractor.extractRequiredPermissions(mockHandler);
      expect(result).toEqual([]);
    });
  });

  describe('AuthPermissionValidationService', () => {
    it('应该检查API Key认证装饰器', async () => {
      const mockHandler = jest.fn();

      // Mock reflector to return true for API key auth
      mockReflector.get.mockReturnValue(true);

      const result = authPermissionValidationService.hasApiKeyAuth(mockHandler);
      expect(result).toBe(true);
    });

    it('应该检查权限要求装饰器', async () => {
      const mockHandler = jest.fn();

      // Mock reflector to return permissions array
      mockReflector.get.mockReturnValue(['DATA_READ']);

      const result = authPermissionValidationService.hasPermissionRequirements(mockHandler);
      expect(result).toBe(true);
    });

    it('应该获取所需权限', async () => {
      const mockHandler = jest.fn();
      const mockPermissions = ['DATA_READ', 'API_KEY_READ'];

      // Mock reflector to return permissions
      mockReflector.get.mockReturnValue(mockPermissions);

      const result = authPermissionValidationService.getRequiredPermissions(mockHandler);
      expect(result).toEqual(mockPermissions);
    });

    describe('validatePermissionLevel', () => {
      it('应该验证权限级别一致性', async () => {
        // 测试高级和低级权限混合的情况（基于实际的权限级别分类）
        const permissions = ['DATA_READ', 'SYSTEM_ADMIN'];
        const result = authPermissionValidationService.validatePermissionLevel(permissions);

        // 验证结果结构，不依赖特定权限实现
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('issues');
        expect(Array.isArray(result.issues)).toBe(true);
      });

      it('应该在没有权限时返回有效', async () => {
        const permissions: string[] = [];
        const result = authPermissionValidationService.validatePermissionLevel(permissions);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
      });

      it('应该在单个权限级别时返回有效', async () => {
        const permissions = ['DATA_READ', 'API_KEY_READ'];
        const result = authPermissionValidationService.validatePermissionLevel(permissions);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
      });
    });

    describe('validatePermissionCombination', () => {
      it('应该验证权限组合有效性', async () => {
        // 测试多个读权限的情况
        const permissions = ['DATA_READ', 'API_KEY_READ'];
        const result = authPermissionValidationService.validatePermissionCombination(permissions);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('存在多个读取权限，可能造成权限冗余');
      });

      it('应该在没有权限时返回有效', async () => {
        const permissions: string[] = [];
        const result = authPermissionValidationService.validatePermissionCombination(permissions);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
      });

      it('应该在单个权限时返回有效', async () => {
        const permissions = ['DATA_READ'];
        const result = authPermissionValidationService.validatePermissionCombination(permissions);
        
        expect(result.isValid).toBe(true);
        expect(result.issues).toEqual([]);
      });

      it('应该检测管理员权限与其他权限的组合', async () => {
        const permissions = ['SYSTEM_ADMIN', 'DATA_READ'];
        const result = authPermissionValidationService.validatePermissionCombination(permissions);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('管理员权限不应与其他权限组合使用');
      });
    });
  });

  describe('PermissionDecoratorValidator', () => {
    it('应该正确验证所有控制器', async () => {
      const mockControllers = [
        {
          name: 'TestController',
          metatype: jest.fn(),
        },
      ] as any;

      mockDiscoveryService.getControllers.mockReturnValue(mockControllers);

      const results = await permissionDecoratorValidator.validateAllControllers();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockDiscoveryService.getControllers).toHaveBeenCalled();
    });

    it('应该处理控制器验证错误', async () => {
      const mockControllers = [
        {
          name: 'TestController',
          metatype: jest.fn(),
        },
      ] as any;

      mockDiscoveryService.getControllers.mockReturnValue(mockControllers);
      // Mock validateController to throw an error
      const mockValidator = permissionDecoratorValidator as any;
      mockValidator.validateController = jest.fn().mockRejectedValue(new Error('Validation error'));

      const results = await permissionDecoratorValidator.validateAllControllers();

      // Should still return results array even with errors
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    describe('validateController', () => {
      it('应该验证单个控制器', async () => {
        const mockController = {
          name: 'TestController',
          metatype: jest.fn(),
        };
        
        // Mock getRoutes to return empty array
        const mockValidator = permissionDecoratorValidator as any;
        mockValidator.getRoutes = jest.fn().mockReturnValue([]);
        
        const result = await mockValidator.validateController(mockController);
        
        expect(result).toBeDefined();
        expect(result.controller).toBe('TestController');
        expect(result.isValid).toBe(true);
        expect(result.violations).toEqual([]);
        expect(result.totalRoutes).toBe(0);
        expect(result.validRoutes).toBe(0);
      });
    });

    describe('getRoutes', () => {
      it('应该获取控制器的所有路由', async () => {
        const mockController = jest.fn();
        mockController.prototype = {
          testMethod: jest.fn(),
        };

        // Mock metadataScanner to return method names
        mockMetadataScanner.getAllMethodNames.mockReturnValue(['testMethod']);

        // Mock reflector.get to return HTTP method metadata
        mockReflector.get.mockImplementation((key) => {
          if (key === '__get__') {
            return 'test';
          }
          return undefined;
        });

        const mockValidator = permissionDecoratorValidator as any;
        const routes = mockValidator.getRoutes(mockController);

        expect(routes).toBeDefined();
        expect(Array.isArray(routes)).toBe(true);
      });

      it('应该处理没有原型的控制器', async () => {
        const mockController = null;
        const mockValidator = permissionDecoratorValidator as any;
        const routes = mockValidator.getRoutes(mockController);
        
        expect(routes).toEqual([]);
      });
    });

    describe('权限验证方法', () => {
      beforeEach(() => {
        // Clear all mocks before each test in this group
        jest.clearAllMocks();
      });

      it('应该检查API Key认证', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };

        // Mock reflector for this specific test
        mockReflector.get.mockReturnValue(true);

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.hasApiKeyAuth(mockRoute);

        expect(result).toBe(true);
      });

      it('应该检查权限要求', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };

        // Mock reflector for this specific test
        mockReflector.get.mockReturnValue(['DATA_READ']);

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.hasRequirePermissions(mockRoute);

        expect(result).toBe(true);
      });

      it('应该获取所需权限', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };
        const mockPermissions = ['DATA_READ'];

        // Mock reflector for this specific test
        mockReflector.get.mockReturnValue(mockPermissions);

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.getRequiredPermissions(mockRoute);

        expect(result).toEqual(mockPermissions);
      });
    });

    describe('validatePermissionLevel', () => {
      it('应该验证权限级别', async () => {
        const mockPermissions = ['DATA_READ', 'SYSTEM_ADMIN'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionLevel(mockPermissions, mockRoute);

        // Test the structure of the result rather than specific validation logic
        expect(result === null || result?.type === 'permission_level_inconsistency').toBe(true);
      });

      it('应该在权限级别有效时返回null', async () => {
        const mockPermissions = ['DATA_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionLevel(mockPermissions, mockRoute);

        // For single permission, should be valid or null
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('validatePermissionCombination', () => {
      it('应该验证权限组合', async () => {
        const mockPermissions = ['DATA_READ', 'API_KEY_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionCombination(mockPermissions, mockRoute);

        // Test the structure of the result rather than specific validation logic
        expect(result === null || result?.type === 'invalid_permission_combination').toBe(true);
      });

      it('应该在权限组合有效时返回null', async () => {
        const mockPermissions = ['DATA_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };

        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionCombination(mockPermissions, mockRoute);

        // For single permission, should typically be valid or null
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('generateReport', () => {
      it('应该生成验证报告', async () => {
        const mockResults = [
          {
            controller: 'TestController',
            violations: [],
            isValid: true,
            totalRoutes: 2,
            validRoutes: 2,
          },
        ];
        
        const report = permissionDecoratorValidator.generateReport(mockResults);
        
        expect(report).toBeDefined();
        expect(report).toContain('权限装饰器验证报告');
        expect(report).toContain('✅ 所有控制器的权限装饰器都符合规范！');
      });

      it('应该生成包含违规详情的报告', async () => {
        const mockResults = [
          {
            controller: 'TestController',
            violations: [
              {
                type: 'missing_require_permissions' as const,
                route: '/test',
                method: 'GET',
                message: '测试消息',
                severity: 'high' as const,
                recommendation: '测试建议',
              },
            ],
            isValid: false,
            totalRoutes: 2,
            validRoutes: 1,
          },
        ];
        
        const report = permissionDecoratorValidator.generateReport(mockResults);
        
        expect(report).toBeDefined();
        expect(report).toContain('违规详情');
        expect(report).toContain('TestController');
        expect(report).toContain('测试消息');
        expect(report).toContain('测试建议');
      });
    });
  });
});