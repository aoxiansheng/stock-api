import { TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/module/auth.module';
import { CacheModule } from '@cache/module/cache.module';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';

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

describe('AuthModule (Using Test Infrastructure)', () => {
  let module: TestingModule;
  let testContext: any;

  beforeAll(async () => {
    // 使用测试基础设施创建测试上下文，模块覆盖方式避免依赖冲突
    testContext = await UnitTestSetup.createTestContext(async () => {
      return await UnitTestSetup.createBasicTestModuleWithOverrides({
        imports: [AuthModule],
        overrides: [
          {
            module: CacheModule,
            override: TestCacheModule,
          },
        ],
      });
    });

    await testContext.setup();
    module = testContext.getModule();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
    UnitTestSetup.validateModuleCompilation(module);
  });

  describe('基础设施验证', () => {
    it('应该有正确的配置', () => {
      // 验证JWT配置
      const configService = UnitTestSetup.getConfigService(module);
      expect(configService.get('JWT_SECRET')).toBe('test-jwt-secret-key-for-testing-only');
      expect(configService.get('JWT_EXPIRES_IN')).toBe('24h');
    });

    it('应该提供模拟的外部依赖', async () => {
      // 验证Redis Mock
      const redisMock = await testContext.getService('default_IORedisModuleConnectionToken');
      expect(redisMock).toBeDefined();
      expect(typeof redisMock.get).toBe('function');
      expect(typeof redisMock.set).toBe('function');

      // 验证统一配置
      const authConfig = await testContext.getService('authUnified');
      expect(authConfig).toBeDefined();
      expect(authConfig.cache).toBeDefined();
      expect(authConfig.limits).toBeDefined();
    });
  });

  describe('providers', () => {
    // Facade layer - 使用测试上下文验证
    it('should provide AuthFacadeService', async () => {
      await testContext.validateService(AuthFacadeService, AuthFacadeService);
    });

    // Domain layer - 使用测试上下文批量验证
    it('should provide domain services', async () => {
      const domainServices = [
        UserAuthenticationService,
        SessionManagementService,
        ApiKeyManagementService,
        SecurityPolicyService,
        AuditService,
        AuthEventNotificationService,
      ];

      for (const serviceClass of domainServices) {
        await testContext.validateService(serviceClass, serviceClass);
      }
    });

    // Infrastructure layer - 使用测试上下文批量验证
    it('should provide infrastructure services', async () => {
      const infrastructureServices = [
        AuthConfigService,
        PasswordService,
        TokenService,
        PermissionService,
        RateLimitService,
        AuthPerformanceService,
      ];

      for (const serviceClass of infrastructureServices) {
        await testContext.validateService(serviceClass, serviceClass);
      }
    });

    // Strategies - 使用测试上下文验证
    it('should provide authentication strategies', async () => {
      await testContext.validateService(JwtStrategy, JwtStrategy);
      await testContext.validateService(ApiKeyStrategy, ApiKeyStrategy);
    });

    // Guards - 使用测试上下文批量验证
    it('should provide authentication guards', async () => {
      const guards = [
        JwtAuthGuard,
        ApiKeyAuthGuard,
        UnifiedPermissionsGuard,
        RateLimitGuard,
      ];

      for (const guardClass of guards) {
        await testContext.validateService(guardClass, guardClass);
      }
    });

    // Filters - 使用测试上下文验证
    it('should provide exception filters', async () => {
      await testContext.validateService(GlobalExceptionFilter, GlobalExceptionFilter);
      await testContext.validateService(RateLimitExceptionFilter, RateLimitExceptionFilter);
    });

    // Interceptors - 使用测试上下文验证
    it('should provide interceptors', async () => {
      await testContext.validateService(ResponseInterceptor, ResponseInterceptor);
      await testContext.validateService(RequestTrackingInterceptor, RequestTrackingInterceptor);
    });

    // Middleware - 使用测试上下文验证
    it('should provide middleware', async () => {
      await testContext.validateService(SecurityMiddleware, SecurityMiddleware);
    });

    // Repositories - 使用测试上下文验证
    it('should provide repositories', async () => {
      await testContext.validateService(ApiKeyRepository, ApiKeyRepository);
      await testContext.validateService(UserRepository, UserRepository);
    });
  });

  describe('controllers', () => {
    it('should provide AuthController', async () => {
      await testContext.validateService(AuthController, AuthController);
    });
  });

  describe('模块导出验证', () => {
    it('should export facade service', async () => {
      const facade = await testContext.getService(AuthFacadeService);
      expect(facade).toBeDefined();
      expect(facade).toBeInstanceOf(AuthFacadeService);
    });

    it('should export domain services', async () => {
      const domainServices = [
        UserAuthenticationService,
        SessionManagementService,
        ApiKeyManagementService,
      ];

      for (const serviceClass of domainServices) {
        const service = await testContext.getService(serviceClass);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(serviceClass);
      }
    });

    it('should export infrastructure services', async () => {
      const infrastructureServices = [
        AuthConfigService,
        PermissionService,
        RateLimitService,
        TokenService,
        AuthPerformanceService,
      ];

      for (const serviceClass of infrastructureServices) {
        const service = await testContext.getService(serviceClass);
        expect(service).toBeDefined();
      }
    });

    it('should export all auth components', async () => {
      // 使用批量验证所有重要组件
      const allComponents = [
        // Guards
        JwtAuthGuard,
        ApiKeyAuthGuard,
        UnifiedPermissionsGuard,
        RateLimitGuard,
        // Filters
        GlobalExceptionFilter,
        RateLimitExceptionFilter,
        // Interceptors
        ResponseInterceptor,
        RequestTrackingInterceptor,
        // Middleware
        SecurityMiddleware,
        // Repositories
        ApiKeyRepository,
        UserRepository,
      ];

      for (const componentClass of allComponents) {
        expect(await testContext.getService(componentClass)).toBeDefined();
      }
    });
  });

  describe('模块完整性验证', () => {
    it('should compile without circular dependencies', () => {
      // 测试基础设施已经验证了模块编译
      expect(module).toBeDefined();
      UnitTestSetup.validateModuleCompilation(module);
    });

    it('should resolve all dependencies using test infrastructure', async () => {
      // 使用测试基础设施批量验证所有提供者
      const allProviders = [
        AuthFacadeService,
        UserAuthenticationService,
        SessionManagementService,
        ApiKeyManagementService,
        SecurityPolicyService,
        AuditService,
        AuthEventNotificationService,
        AuthConfigService,
        PasswordService,
        TokenService,
        PermissionService,
        RateLimitService,
        AuthPerformanceService,
        JwtStrategy,
        ApiKeyStrategy,
        JwtAuthGuard,
        ApiKeyAuthGuard,
        UnifiedPermissionsGuard,
        RateLimitGuard,
        GlobalExceptionFilter,
        RateLimitExceptionFilter,
        ResponseInterceptor,
        RequestTrackingInterceptor,
        SecurityMiddleware,
        ApiKeyRepository,
        UserRepository,
        AuthController,
      ];

      // 使用测试上下文的批量验证方法
      for (const providerClass of allProviders) {
        expect(await testContext.getService(providerClass)).toBeDefined();
      }
    });

    it('should provide proper mock dependencies', async () => {
      // 验证Mock依赖是否正确提供
      const redisMock = await testContext.getService('default_IORedisModuleConnectionToken');
      const authConfig = await testContext.getService('authUnified');
      const cacheConfig = await testContext.getService('cacheUnified');

      expect(redisMock).toBeDefined();
      expect(authConfig).toBeDefined();
      expect(cacheConfig).toBeDefined();

      // 验证Mock方法是否可用
      expect(typeof redisMock.get).toBe('function');
      expect(typeof redisMock.set).toBe('function');
      expect(typeof redisMock.del).toBe('function');
    });
  });
});