import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  AuthUnifiedConfigInterface,
  authUnifiedConfig,
} from '@auth/config/auth-unified.config';
import { AuthCacheConfigValidation } from '@auth/config/auth-cache.config';
import { AuthLimitsConfigValidation } from '@auth/config/auth-limits.config';

describe('AuthUnifiedConfig', () => {
  let configFactory: () => AuthUnifiedConfigInterface;

  beforeEach(async () => {
    // 清理环境变量
    delete process.env.AUTH_PERMISSION_CACHE_TTL;
    delete process.env.AUTH_API_KEY_CACHE_TTL;
    delete process.env.AUTH_RATE_LIMIT_TTL;
    delete process.env.AUTH_STATISTICS_CACHE_TTL;
    delete process.env.AUTH_SESSION_CACHE_TTL;
    delete process.env.AUTH_GLOBAL_RATE_LIMIT;
    delete process.env.AUTH_STRING_LIMIT;
    delete process.env.AUTH_TIMEOUT;

    configFactory = authUnifiedConfig;
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.AUTH_PERMISSION_CACHE_TTL;
    delete process.env.AUTH_API_KEY_CACHE_TTL;
    delete process.env.AUTH_RATE_LIMIT_TTL;
    delete process.env.AUTH_STATISTICS_CACHE_TTL;
    delete process.env.AUTH_SESSION_CACHE_TTL;
    delete process.env.AUTH_GLOBAL_RATE_LIMIT;
    delete process.env.AUTH_STRING_LIMIT;
    delete process.env.AUTH_TIMEOUT;
  });

  describe('authUnifiedConfig factory', () => {
    it('should create valid configuration factory', () => {
      const factory = authUnifiedConfig;
      expect(typeof factory).toBe('function');
      expect(factory.KEY).toBe('CONFIGURATION(authUnified)');
    });

    it('should work with NestJS ConfigModule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [authUnifiedConfig],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      // 测试配置模块能正常加载
      expect(module).toBeDefined();
      module.close();
    });

    it('should create configuration with cache and limits', () => {
      const config = authUnifiedConfig();

      expect(config).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.limits).toBeDefined();
      expect(config.cache).toBeInstanceOf(AuthCacheConfigValidation);
      expect(config.limits).toBeInstanceOf(AuthLimitsConfigValidation);
    });
  });
});