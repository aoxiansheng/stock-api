import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/module/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@cache/module/cache.module';
import { DatabaseModule } from '../../../../../src/database/database.module';
import { PermissionModule } from '@auth/permission/permission.module';

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

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
  });

  it('should compile the module', async () => {
    expect(module).toBeDefined();
  });

  describe('imports', () => {
    it('should import required modules', () => {
      const configModule = module.get(ConfigModule);
      const passportModule = module.get(PassportModule);
      const eventEmitterModule = module.get(EventEmitterModule);
      const cacheModule = module.get(CacheModule);
      const databaseModule = module.get(DatabaseModule);
      const permissionModule = module.get(PermissionModule);
      
      expect(configModule).toBeDefined();
      expect(passportModule).toBeDefined();
      expect(eventEmitterModule).toBeDefined();
      expect(cacheModule).toBeDefined();
      expect(databaseModule).toBeDefined();
      expect(permissionModule).toBeDefined();
    });

    it('should configure JwtModule with async factory', async () => {
      // This test ensures JwtModule is properly configured
      // We can't easily test the async configuration without a full NestJS setup
      // but we can check that the module is defined
      const jwtModule = module.get(JwtModule);
      expect(jwtModule).toBeDefined();
    });
  });

  describe('providers', () => {
    // Facade layer
    it('should provide AuthFacadeService', () => {
      const service = module.get(AuthFacadeService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuthFacadeService);
    });

    // Domain layer
    it('should provide domain services', () => {
      const userAuthService = module.get(UserAuthenticationService);
      const sessionService = module.get(SessionManagementService);
      const apiKeyService = module.get(ApiKeyManagementService);
      const securityService = module.get(SecurityPolicyService);
      const auditService = module.get(AuditService);
      const notificationService = module.get(AuthEventNotificationService);

      expect(userAuthService).toBeDefined();
      expect(sessionService).toBeDefined();
      expect(apiKeyService).toBeDefined();
      expect(securityService).toBeDefined();
      expect(auditService).toBeDefined();
      expect(notificationService).toBeDefined();
    });

    // Infrastructure layer
    it('should provide infrastructure services', () => {
      const configService = module.get(AuthConfigService);
      const passwordService = module.get(PasswordService);
      const tokenService = module.get(TokenService);
      const permissionService = module.get(PermissionService);
      const rateLimitService = module.get(RateLimitService);
      const performanceService = module.get(AuthPerformanceService);

      expect(configService).toBeDefined();
      expect(passwordService).toBeDefined();
      expect(tokenService).toBeDefined();
      expect(permissionService).toBeDefined();
      expect(rateLimitService).toBeDefined();
      expect(performanceService).toBeDefined();
    });

    // Strategies
    it('should provide authentication strategies', () => {
      const jwtStrategy = module.get(JwtStrategy);
      const apiKeyStrategy = module.get(ApiKeyStrategy);

      expect(jwtStrategy).toBeDefined();
      expect(apiKeyStrategy).toBeDefined();
    });

    // Guards
    it('should provide authentication guards', () => {
      const jwtGuard = module.get(JwtAuthGuard);
      const apiKeyGuard = module.get(ApiKeyAuthGuard);
      const permissionsGuard = module.get(UnifiedPermissionsGuard);
      const rateLimitGuard = module.get(RateLimitGuard);

      expect(jwtGuard).toBeDefined();
      expect(apiKeyGuard).toBeDefined();
      expect(permissionsGuard).toBeDefined();
      expect(rateLimitGuard).toBeDefined();
    });

    // Filters
    it('should provide exception filters', () => {
      const globalExceptionFilter = module.get(GlobalExceptionFilter);
      const rateLimitFilter = module.get(RateLimitExceptionFilter);

      expect(globalExceptionFilter).toBeDefined();
      expect(rateLimitFilter).toBeDefined();
    });

    // Interceptors
    it('should provide interceptors', () => {
      const responseInterceptor = module.get(ResponseInterceptor);
      const requestTrackingInterceptor = module.get(RequestTrackingInterceptor);

      expect(responseInterceptor).toBeDefined();
      expect(requestTrackingInterceptor).toBeDefined();
    });

    // Middleware
    it('should provide middleware', () => {
      const securityMiddleware = module.get(SecurityMiddleware);

      expect(securityMiddleware).toBeDefined();
    });

    // Repositories
    it('should provide repositories', () => {
      const apiKeyRepository = module.get(ApiKeyRepository);
      const userRepository = module.get(UserRepository);

      expect(apiKeyRepository).toBeDefined();
      expect(userRepository).toBeDefined();
    });
  });

  describe('controllers', () => {
    it('should provide AuthController', () => {
      const controller = module.get(AuthController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AuthController);
    });
  });

  describe('exports', () => {
    it('should export facade service', () => {
      // This is a bit tricky to test directly since exports are not accessible via get()
      // but we can verify the module compiles with the exports
      expect(module.get(AuthFacadeService)).toBeDefined();
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

  describe('module compilation', () => {
    it('should compile without circular dependencies', async () => {
      // This test ensures the module can be compiled without circular dependencies
      // If there were circular dependencies, the module creation would fail
      const newModule = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();
      
      expect(newModule).toBeDefined();
    });

    it('should resolve all dependencies', async () => {
      // This test ensures all providers can be resolved without missing dependencies
      const providers = [
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

      for (const provider of providers) {
        expect(() => module.get(provider)).not.toThrow();
      }
    });
  });
});