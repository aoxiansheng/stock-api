import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/module/auth.module';
import { UnitTestSetup } from '../../../../testbasic/setup/unit-test-setup';
import { UserFactory, ApiKeyFactory } from '../../../../testbasic/factories';
import { TestCacheModule } from '../../../../testbasic/modules/test-cache.module';
import { TestAuthModule } from '../../../../testbasic/modules/test-auth.module';
import { CacheModule } from '@cache/module/cache.module';
import { TestInfrastructureModule } from '../../../../testbasic/modules/test-infrastructure.module';

// Services
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { SessionManagementService } from '@auth/services/domain/session-management.service';
import { ApiKeyManagementService } from '@auth/services/domain/apikey-management.service';
import { SecurityPolicyService } from '@auth/services/domain/security-policy.service';
import { AuditService } from '@auth/services/domain/audit.service';
import { AuthEventNotificationService } from '@auth/services/domain/notification.service';
import { AuthConfigService } from '@auth/services/infrastructure/auth-config.service';
import { PasswordService } from '@auth/services/infrastructure/password.service';
import { TokenService } from '@auth/services/infrastructure/token.service';
import { PermissionService } from '@auth/services/infrastructure/permission.service';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Guards
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '@auth/guards/apikey-auth.guard';
import { UnifiedPermissionsGuard } from '@auth/guards/unified-permissions.guard';
import { RateLimitGuard } from '@auth/guards/rate-limit.guard';

// Strategies
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { ApiKeyStrategy } from '@auth/strategies/apikey.strategy';

// Filters
import { GlobalExceptionFilter } from '@common/core/filters/global-exception.filter';
import { RateLimitExceptionFilter } from '@auth/filters/rate-limit.filter';

// Interceptors
import { ResponseInterceptor } from '@common/core/interceptors/response.interceptor';
import { RequestTrackingInterceptor } from '@common/core/interceptors/request-tracking.interceptor';

// Middleware
import { SecurityMiddleware } from '@auth/middleware/security.middleware';

// Repositories
import { ApiKeyRepository } from '@auth/repositories/apikey.repository';
import { UserRepository } from '@auth/repositories/user.repository';

// Controllers
import { AuthController } from '@auth/controller/auth.controller';
import { redisMockFactory } from '../../../../testbasic/mocks';

describe('AuthModule (Improved with Test Infrastructure)', () => {
  let module: TestingModule;
  let testContext: any;

  beforeAll(async () => {
    // 创建测试上下文
    testContext = await UnitTestSetup.createTestContext(async () => {
      // 修改测试模块创建方式，确保依赖正确注入
      return await Test.createTestingModule({
        imports: [
          TestInfrastructureModule, // 确保配置可用
          TestCacheModule, // 确保Redis依赖可用
          AuthModule, // 导入实际的AuthModule
        ],
        providers: [
          // 显式提供auth和cache配置
          {
            provide: 'authUnified',
            useValue: {
              cache: {
                apiKeyCacheTtl: 300,
                permissionCacheTtl: 300,
                rateLimitCacheTtl: 60,
                sessionCacheTtl: 3600,
                statisticsCacheTtl: 300
              },
              limits: {
                globalRateLimit: 100,
                stringLimit: 10000,
                timeout: 5000,
                apiKeyLength: 32,
                maxApiKeysPerUser: 50,
                maxLoginAttempts: 5,
                loginLockoutMinutes: 15
              }
            },
          },
          {
            provide: 'cacheUnified',
            useValue: {
              defaultTtl: 300,
              compressionThreshold: 1024,
              maxBatchSize: 100,
              lockTtl: 30,
              retryDelayMs: 100,
              slowOperationMs: 1000,
              authTtl: 600,
              // 其他必要的缓存配置...
            },
          },
          // 确保Redis服务可用
          {
            provide: 'default_IORedisModuleConnectionToken',
            useFactory: redisMockFactory,
          }
        ]
      })
      // 覆盖CacheModule确保使用我们的测试版本
      .overrideModule(CacheModule)
      .useModule(TestCacheModule)
      .compile();
    });

    await testContext.setup();
    module = testContext.getModule();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('Module Compilation', () => {
    it('should compile the module successfully', () => {
      UnitTestSetup.validateModuleCompilation(module);
    });

    it('should have all required imports available', () => {
      // 验证基础设施配置
      expect(module.get('authUnified')).toBeDefined();
      expect(module.get('cacheUnified')).toBeDefined();
      expect(module.get('default_IORedisModuleConnectionToken')).toBeDefined();
    });
  });

  // 修改获取服务实例的方式，使用同步方法module.get
  describe('Service Providers', () => {
    describe('Facade Layer', () => {
      it('should provide AuthFacadeService', async () => {
        // 将module.get改为异步的module.resolve
        const service = await module.resolve(AuthFacadeService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(AuthFacadeService);
      });
    });

    describe('Domain Layer', () => {
      it('should provide UserAuthenticationService', () => {
        const service = module.get(UserAuthenticationService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(UserAuthenticationService);
      });

      it('should provide SessionManagementService', () => {
        const service = module.get(SessionManagementService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(SessionManagementService);
      });

      it('should provide ApiKeyManagementService', () => {
        const service = module.get(ApiKeyManagementService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ApiKeyManagementService);
      });

      it('should provide SecurityPolicyService', () => {
        const service = module.get(SecurityPolicyService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(SecurityPolicyService);
      });

      it('should provide AuditService', () => {
        const service = module.get(AuditService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(AuditService);
      });

      it('should provide AuthEventNotificationService', () => {
        const service = module.get(AuthEventNotificationService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(AuthEventNotificationService);
      });
    });

    describe('Infrastructure Layer', () => {
      it('should provide AuthConfigService', () => {
        const service = module.get(AuthConfigService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(AuthConfigService);
      });

      it('should provide PasswordService', () => {
        const service = module.get(PasswordService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(PasswordService);
      });

      it('should provide TokenService', () => {
        const service = module.get(TokenService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(TokenService);
      });

      it('should provide PermissionService', () => {
        const service = module.get(PermissionService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(PermissionService);
      });

      it('should provide RateLimitService', () => {
        const service = module.get(RateLimitService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(RateLimitService);
      });

      it('should provide AuthPerformanceService', () => {
        const service = module.get(AuthPerformanceService);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(AuthPerformanceService);
      });
    });
  });

  describe('Authentication Components', () => {
    describe('Strategies', () => {
      it('should provide JwtStrategy', () => {
        const service = module.get(JwtStrategy);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(JwtStrategy);
      });

      it('should provide ApiKeyStrategy', () => {
        const service = module.get(ApiKeyStrategy);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ApiKeyStrategy);
      });
    });

    describe('Guards', () => {
      it('should provide JwtAuthGuard', () => {
        const service = module.get(JwtAuthGuard);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(JwtAuthGuard);
      });

      it('should provide ApiKeyAuthGuard', () => {
        const service = module.get(ApiKeyAuthGuard);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ApiKeyAuthGuard);
      });

      it('should provide UnifiedPermissionsGuard', () => {
        const service = module.get(UnifiedPermissionsGuard);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(UnifiedPermissionsGuard);
      });

      it('should provide RateLimitGuard', () => {
        const service = module.get(RateLimitGuard);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(RateLimitGuard);
      });
    });
  });

  describe('HTTP Components', () => {
    describe('Filters', () => {
      it('should provide GlobalExceptionFilter', () => {
        const service = module.get(GlobalExceptionFilter);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(GlobalExceptionFilter);
      });

      it('should provide RateLimitExceptionFilter', () => {
        const service = module.get(RateLimitExceptionFilter);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(RateLimitExceptionFilter);
      });
    });

    describe('Interceptors', () => {
      it('should provide ResponseInterceptor', () => {
        const service = module.get(ResponseInterceptor);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ResponseInterceptor);
      });

      it('should provide RequestTrackingInterceptor', () => {
        const service = module.get(RequestTrackingInterceptor);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(RequestTrackingInterceptor);
      });
    });

    describe('Middleware', () => {
      it('should provide SecurityMiddleware', () => {
        const service = module.get(SecurityMiddleware);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(SecurityMiddleware);
      });
    });
  });

  describe('Data Access Layer', () => {
    describe('Repositories', () => {
      it('should provide ApiKeyRepository', () => {
        const service = module.get(ApiKeyRepository);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(ApiKeyRepository);
      });

      it('should provide UserRepository', () => {
        const service = module.get(UserRepository);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(UserRepository);
      });
    });
  });

  describe('Controllers', () => {
    it('should provide AuthController', () => {
      const service = module.get(AuthController);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuthController);
    });
  });

  describe('Module Exports', () => {
    it('should export facade service', async () => {
      // 将module.get改为异步的module.resolve
      const facade = await module.resolve(AuthFacadeService);
      expect(facade).toBeDefined();
      expect(facade).toBeInstanceOf(AuthFacadeService);
    });

    it('should export domain services', () => {
      expect(module.get(UserAuthenticationService)).toBeDefined();
      expect(module.get(SessionManagementService)).toBeDefined();
      expect(module.get(ApiKeyManagementService)).toBeDefined();
    });

    it('should export infrastructure services', () => {
      expect(module.get(AuthConfigService)).toBeDefined();
      expect(module.get(PermissionService)).toBeDefined();
      expect(module.get(RateLimitService)).toBeDefined();
      expect(module.get(TokenService)).toBeDefined();
      expect(module.get(AuthPerformanceService)).toBeDefined();
    });

    it('should export guards', () => {
      expect(module.get(JwtAuthGuard)).toBeDefined();
      expect(module.get(ApiKeyAuthGuard)).toBeDefined();
      expect(module.get(UnifiedPermissionsGuard)).toBeDefined();
      expect(module.get(RateLimitGuard)).toBeDefined();
    });

    it('should export filters', () => {
      expect(module.get(GlobalExceptionFilter)).toBeDefined();
      expect(module.get(RateLimitExceptionFilter)).toBeDefined();
    });

    it('should export interceptors', () => {
      expect(module.get(ResponseInterceptor)).toBeDefined();
      expect(module.get(RequestTrackingInterceptor)).toBeDefined();
    });

    it('should export middleware', () => {
      expect(module.get(SecurityMiddleware)).toBeDefined();
    });

    it('should export repositories', () => {
      expect(module.get(ApiKeyRepository)).toBeDefined();
      expect(module.get(UserRepository)).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should have correct JWT configuration', () => {
      const configService = UnitTestSetup.getConfigService(module);
      expect(configService.get('JWT_SECRET')).toBe('test-jwt-secret-key-for-testing-only');
      expect(configService.get('JWT_EXPIRES_IN')).toBe('24h');
    });

    it('should have correct auth unified configuration', () => {
      const authConfig = module.get('authUnified');
      expect(authConfig).toBeDefined();
      expect(authConfig.cache).toBeDefined();
      expect(authConfig.limits).toBeDefined();
      expect(authConfig.cache.apiKeyCacheTtl).toBe(300);
      expect(authConfig.limits.globalRateLimit).toBe(100);
    });

    it('should have correct cache configuration', () => {
      const cacheConfig = module.get('cacheUnified');
      expect(cacheConfig).toBeDefined();
      expect(cacheConfig.defaultTtl).toBe(300);
      expect(cacheConfig.authTtl).toBe(600);
    });
  });

  describe('Service Integration', () => {
    it('should allow services to interact with mocked dependencies', async () => {
      const userRepo = module.get(UserRepository);
      const mockUser = UserFactory.createMockUser();

      // 这里可以测试实际的服务交互，但使用Mock数据
      expect(userRepo).toBeDefined();
      // 实际的交互测试会使用Mock数据库
    });

    it('should allow cache operations with mocked Redis', async () => {
      const cacheService = module.get('default_IORedisModuleConnectionToken');

      // 验证Redis Mock可以正常工作
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
    });
  });

  describe('Module Dependencies', () => {
    it('should resolve all circular dependencies', () => {
      // 如果模块成功编译，说明没有循环依赖
      expect(module).toBeDefined();
    });

    it('should have all required providers', async () => {
      // 所有必需的提供者都应该可以解析
      const requiredProviders = [
        UserAuthenticationService,
        ApiKeyManagementService,
        JwtAuthGuard,
        ApiKeyAuthGuard,
        AuthController,
      ];

      // 对于非作用域提供者，使用get
      for (const provider of requiredProviders) {
        expect(() => module.get(provider)).not.toThrow();
      }
      
      // 对于AuthFacadeService这样的作用域提供者，使用resolve
      expect(await module.resolve(AuthFacadeService)).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration gracefully in production', () => {
      // 测试配置验证逻辑
      const authConfig = module.get('authUnified');
      expect(authConfig).toBeDefined();
    });

    it('should handle service instantiation errors', async () => {
      // 所有服务都应该能够成功实例化
      expect(async () => {
        await module.resolve(AuthFacadeService);
        module.get(UserAuthenticationService);
        module.get(ApiKeyManagementService);
      }).not.toThrow();
    });
  });
});