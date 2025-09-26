import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  AuthPermissionConstants,
  AuthPermissionMetadataExtractor,
  AuthPermissionValidationService,
} from '@auth/permission/adapters/auth-permission.adapter';
import { PermissionDecoratorValidator } from '@auth/permission/validators/permission-decorator.validator';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { createLogger } from '@common/logging/index';
import { HTTP_METHOD_ARRAYS } from '@common/constants/semantic';

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
  let reflector: Reflector;
  let discoveryService: DiscoveryService;
  let metadataScanner: MetadataScanner;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPermissionConstants,
        AuthPermissionMetadataExtractor,
        AuthPermissionValidationService,
        PermissionDecoratorValidator,
        Reflector,
        {
          provide: DiscoveryService,
          useValue: {
            getControllers: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            getAllMethodNames: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    authPermissionConstants = module.get(AuthPermissionConstants);
    authPermissionMetadataExtractor = module.get(AuthPermissionMetadataExtractor);
    authPermissionValidationService = module.get(AuthPermissionValidationService);
    permissionDecoratorValidator = module.get(PermissionDecoratorValidator);
    reflector = module.get(Reflector);
    discoveryService = module.get(DiscoveryService);
    metadataScanner = module.get(MetadataScanner);
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
      expect(constants.REQUIRE_API_KEY_METADATA_KEY).toBe('require_api_key');
      expect(constants.PERMISSIONS_METADATA_KEY).toBe('permissions');
      expect(constants.AVAILABLE_PERMISSIONS).toEqual([]);
      expect(constants.PERMISSION_LEVELS).toEqual({
        HIGH: [],
        MEDIUM: [],
        LOW: [],
      });
    });
  });

  describe('AuthPermissionMetadataExtractor', () => {
    it('应该正确提取API Key认证标记', async () => {
      const mockHandler = jest.fn();
      const mockReflector = reflector as jest.Mocked<Reflector>;
      
      // Mock reflector.get to return true for API key auth
      mockReflector.get = jest.fn().mockImplementation((key) => {
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
      const mockReflector = reflector as jest.Mocked<Reflector>;
      
      // Mock reflector.get to return permissions
      mockReflector.get = jest.fn().mockImplementation((key) => {
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
      const mockReflector = reflector as jest.Mocked<Reflector>;
      
      // Mock reflector.get to return undefined
      mockReflector.get = jest.fn().mockReturnValue(undefined);
      
      const result = authPermissionMetadataExtractor.extractRequiredPermissions(mockHandler);
      expect(result).toEqual([]);
    });
  });

  describe('AuthPermissionValidationService', () => {
    it('应该检查API Key认证装饰器', async () => {
      const mockHandler = jest.fn();
      const mockExtractor = authPermissionMetadataExtractor as jest.Mocked<AuthPermissionMetadataExtractor>;
      
      // Mock extractor method
      mockExtractor.extractApiKeyAuthFlag = jest.fn().mockReturnValue(true);
      
      const result = authPermissionValidationService.hasApiKeyAuth(mockHandler);
      expect(result).toBe(true);
      expect(mockExtractor.extractApiKeyAuthFlag).toHaveBeenCalledWith(mockHandler);
    });

    it('应该检查权限要求装饰器', async () => {
      const mockHandler = jest.fn();
      const mockExtractor = authPermissionMetadataExtractor as jest.Mocked<AuthPermissionMetadataExtractor>;
      
      // Mock extractor method
      mockExtractor.extractRequiredPermissions = jest.fn().mockReturnValue(['DATA_READ']);
      
      const result = authPermissionValidationService.hasPermissionRequirements(mockHandler);
      expect(result).toBe(true);
      expect(mockExtractor.extractRequiredPermissions).toHaveBeenCalledWith(mockHandler);
    });

    it('应该获取所需权限', async () => {
      const mockHandler = jest.fn();
      const mockPermissions = ['DATA_READ', 'API_KEY_READ'];
      const mockExtractor = authPermissionMetadataExtractor as jest.Mocked<AuthPermissionMetadataExtractor>;
      
      // Mock extractor method
      mockExtractor.extractRequiredPermissions = jest.fn().mockReturnValue(mockPermissions);
      
      const result = authPermissionValidationService.getRequiredPermissions(mockHandler);
      expect(result).toEqual(mockPermissions);
      expect(mockExtractor.extractRequiredPermissions).toHaveBeenCalledWith(mockHandler);
    });

    describe('validatePermissionLevel', () => {
      it('应该验证权限级别一致性', async () => {
        // 测试高级和低级权限混合的情况
        const permissions = ['DATA_READ', 'SYSTEM_ADMIN'];
        const result = authPermissionValidationService.validatePermissionLevel(permissions);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('权限级别不一致：同时包含高级和低级权限');
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
      ];
      
      (discoveryService.getControllers as jest.Mock).mockReturnValue(mockControllers);
      
      const results = await permissionDecoratorValidator.validateAllControllers();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(discoveryService.getControllers).toHaveBeenCalled();
    });

    it('应该处理控制器验证错误', async () => {
      const mockControllers = [
        {
          name: 'TestController',
          metatype: jest.fn(),
        },
      ];
      
      (discoveryService.getControllers as jest.Mock).mockReturnValue(mockControllers);
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
        
        (metadataScanner.getAllMethodNames as jest.Mock).mockReturnValue(['testMethod']);
        
        // Mock reflector.get to return HTTP method metadata
        (reflector.get as jest.Mock).mockImplementation((key) => {
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
      it('应该检查API Key认证', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.hasApiKeyAuth = jest.fn().mockReturnValue(true);
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.hasApiKeyAuth(mockRoute);
        
        expect(result).toBe(true);
        expect(mockValidationService.hasApiKeyAuth).toHaveBeenCalledWith(mockRoute.handler);
      });

      it('应该检查权限要求', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.hasPermissionRequirements = jest.fn().mockReturnValue(true);
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.hasRequirePermissions(mockRoute);
        
        expect(result).toBe(true);
        expect(mockValidationService.hasPermissionRequirements).toHaveBeenCalledWith(mockRoute.handler);
      });

      it('应该获取所需权限', async () => {
        const mockRoute = {
          handler: jest.fn(),
        };
        const mockPermissions = ['DATA_READ'];
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.getRequiredPermissions = jest.fn().mockReturnValue(mockPermissions);
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.getRequiredPermissions(mockRoute);
        
        expect(result).toEqual(mockPermissions);
        expect(mockValidationService.getRequiredPermissions).toHaveBeenCalledWith(mockRoute.handler);
      });
    });

    describe('validatePermissionLevel', () => {
      it('应该验证权限级别', async () => {
        const mockPermissions = ['DATA_READ', 'SYSTEM_ADMIN'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.validatePermissionLevel = jest.fn().mockReturnValue({
          isValid: false,
          issues: ['权限级别不一致：同时包含高级和低级权限'],
        });
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionLevel(mockPermissions, mockRoute);
        
        expect(result).toBeDefined();
        expect(result?.type).toBe('permission_level_inconsistency');
        expect(result?.severity).toBe('medium');
      });

      it('应该在权限级别有效时返回null', async () => {
        const mockPermissions = ['DATA_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.validatePermissionLevel = jest.fn().mockReturnValue({
          isValid: true,
          issues: [],
        });
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionLevel(mockPermissions, mockRoute);
        
        expect(result).toBeNull();
      });
    });

    describe('validatePermissionCombination', () => {
      it('应该验证权限组合', async () => {
        const mockPermissions = ['DATA_READ', 'API_KEY_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.validatePermissionCombination = jest.fn().mockReturnValue({
          isValid: false,
          issues: ['存在多个读取权限，可能造成权限冗余'],
        });
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionCombination(mockPermissions, mockRoute);
        
        expect(result).toBeDefined();
        expect(result?.type).toBe('invalid_permission_combination');
        expect(result?.severity).toBe('low');
      });

      it('应该在权限组合有效时返回null', async () => {
        const mockPermissions = ['DATA_READ'];
        const mockRoute = {
          path: '/test',
          method: 'GET',
        };
        
        const mockValidationService = authPermissionValidationService as jest.Mocked<AuthPermissionValidationService>;
        mockValidationService.validatePermissionCombination = jest.fn().mockReturnValue({
          isValid: true,
          issues: [],
        });
        
        const mockValidator = permissionDecoratorValidator as any;
        const result = mockValidator.validatePermissionCombination(mockPermissions, mockRoute);
        
        expect(result).toBeNull();
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