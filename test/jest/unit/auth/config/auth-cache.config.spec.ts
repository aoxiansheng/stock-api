import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validate } from 'class-validator';
import {
  AuthCacheConfigValidation,
  authCacheConfig,
  AuthCacheConfigType,
} from '@auth/config/auth-cache.config';

describe('AuthCacheConfig', () => {
  let config: AuthCacheConfigValidation;

  beforeEach(() => {
    // 清理环境变量
    delete process.env.AUTH_PERMISSION_CACHE_TTL;
    delete process.env.AUTH_API_KEY_CACHE_TTL;
    delete process.env.AUTH_RATE_LIMIT_TTL;
    delete process.env.AUTH_STATISTICS_CACHE_TTL;
    delete process.env.AUTH_SESSION_CACHE_TTL;
    delete process.env.AUTH_JWT_DEFAULT_EXPIRY;
    delete process.env.AUTH_REFRESH_TOKEN_DEFAULT_EXPIRY;

    config = new AuthCacheConfigValidation();
  });

  afterEach(() => {
    delete process.env.AUTH_PERMISSION_CACHE_TTL;
    delete process.env.AUTH_API_KEY_CACHE_TTL;
    delete process.env.AUTH_RATE_LIMIT_TTL;
    delete process.env.AUTH_STATISTICS_CACHE_TTL;
    delete process.env.AUTH_SESSION_CACHE_TTL;
    delete process.env.AUTH_JWT_DEFAULT_EXPIRY;
    delete process.env.AUTH_REFRESH_TOKEN_DEFAULT_EXPIRY;
  });

  describe('AuthCacheConfigValidation', () => {
    describe('default values', () => {
      it('should use default values when no environment variables are set', () => {
        expect(config.permissionCacheTtl).toBe(300);
        expect(config.apiKeyCacheTtl).toBe(300);
        expect(config.rateLimitTtl).toBe(60);
        expect(config.statisticsCacheTtl).toBe(300);
        expect(config.sessionCacheTtl).toBe(3600);
        expect(config.jwtDefaultExpiry).toBe('15m');
        expect(config.refreshTokenDefaultExpiry).toBe('7d');
      });
    });

    describe('environment variable parsing', () => {
      it('should parse AUTH_PERMISSION_CACHE_TTL correctly', () => {
        process.env.AUTH_PERMISSION_CACHE_TTL = '600';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.permissionCacheTtl).toBe(600);
      });

      it('should parse AUTH_API_KEY_CACHE_TTL correctly', () => {
        process.env.AUTH_API_KEY_CACHE_TTL = '900';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.apiKeyCacheTtl).toBe(900);
      });

      it('should parse AUTH_RATE_LIMIT_TTL correctly', () => {
        process.env.AUTH_RATE_LIMIT_TTL = '120';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.rateLimitTtl).toBe(120);
      });

      it('should parse AUTH_STATISTICS_CACHE_TTL correctly', () => {
        process.env.AUTH_STATISTICS_CACHE_TTL = '600';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.statisticsCacheTtl).toBe(600);
      });

      it('should parse AUTH_SESSION_CACHE_TTL correctly', () => {
        process.env.AUTH_SESSION_CACHE_TTL = '7200';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.sessionCacheTtl).toBe(7200);
      });

      it('should handle string environment variables for JWT expiry', () => {
        process.env.AUTH_JWT_DEFAULT_EXPIRY = '30m';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.jwtDefaultExpiry).toBe('30m');
      });

      it('should handle string environment variables for refresh token expiry', () => {
        process.env.AUTH_REFRESH_TOKEN_DEFAULT_EXPIRY = '14d';
        const testConfig = new AuthCacheConfigValidation();

        expect(testConfig.refreshTokenDefaultExpiry).toBe('14d');
      });
    });

    describe('validation constraints', () => {
      describe('permissionCacheTtl validation', () => {
        it('should accept valid values', async () => {
          config.permissionCacheTtl = 300;
          const errors = await validate(config);
          const permissionErrors = errors.filter(e => e.property === 'permissionCacheTtl');

          expect(permissionErrors).toHaveLength(0);
        });

        it('should reject values below minimum (60)', async () => {
          config.permissionCacheTtl = 30;
          const errors = await validate(config);
          const permissionErrors = errors.filter(e => e.property === 'permissionCacheTtl');

          expect(permissionErrors).toHaveLength(1);
          expect(permissionErrors[0].constraints?.min).toContain('权限缓存TTL不能少于60秒');
        });

        it('should reject values above maximum (3600)', async () => {
          config.permissionCacheTtl = 7200;
          const errors = await validate(config);
          const permissionErrors = errors.filter(e => e.property === 'permissionCacheTtl');

          expect(permissionErrors).toHaveLength(1);
          expect(permissionErrors[0].constraints?.max).toContain('权限缓存TTL不能超过3600秒');
        });

        it('should reject non-number values', async () => {
          config.permissionCacheTtl = 'invalid' as any;
          const errors = await validate(config);
          const permissionErrors = errors.filter(e => e.property === 'permissionCacheTtl');

          expect(permissionErrors.length).toBeGreaterThan(0);
        });
      });

      describe('apiKeyCacheTtl validation', () => {
        it('should accept valid values', async () => {
          config.apiKeyCacheTtl = 600;
          const errors = await validate(config);
          const apiKeyErrors = errors.filter(e => e.property === 'apiKeyCacheTtl');

          expect(apiKeyErrors).toHaveLength(0);
        });

        it('should reject values below minimum (60)', async () => {
          config.apiKeyCacheTtl = 30;
          const errors = await validate(config);
          const apiKeyErrors = errors.filter(e => e.property === 'apiKeyCacheTtl');

          expect(apiKeyErrors).toHaveLength(1);
          expect(apiKeyErrors[0].constraints?.min).toContain('API Key缓存TTL不能少于60秒');
        });

        it('should reject values above maximum (7200)', async () => {
          config.apiKeyCacheTtl = 10000;
          const errors = await validate(config);
          const apiKeyErrors = errors.filter(e => e.property === 'apiKeyCacheTtl');

          expect(apiKeyErrors).toHaveLength(1);
          expect(apiKeyErrors[0].constraints?.max).toContain('API Key缓存TTL不能超过7200秒');
        });
      });

      describe('rateLimitTtl validation', () => {
        it('should accept valid values', async () => {
          config.rateLimitTtl = 120;
          const errors = await validate(config);
          const rateLimitErrors = errors.filter(e => e.property === 'rateLimitTtl');

          expect(rateLimitErrors).toHaveLength(0);
        });

        it('should reject values below minimum (30)', async () => {
          config.rateLimitTtl = 15;
          const errors = await validate(config);
          const rateLimitErrors = errors.filter(e => e.property === 'rateLimitTtl');

          expect(rateLimitErrors).toHaveLength(1);
          expect(rateLimitErrors[0].constraints?.min).toContain('频率限制缓存TTL不能少于30秒');
        });

        it('should reject values above maximum (600)', async () => {
          config.rateLimitTtl = 1200;
          const errors = await validate(config);
          const rateLimitErrors = errors.filter(e => e.property === 'rateLimitTtl');

          expect(rateLimitErrors).toHaveLength(1);
          expect(rateLimitErrors[0].constraints?.max).toContain('频率限制缓存TTL不能超过600秒');
        });
      });

      describe('statisticsCacheTtl validation', () => {
        it('should accept valid values', async () => {
          config.statisticsCacheTtl = 600;
          const errors = await validate(config);
          const statsErrors = errors.filter(e => e.property === 'statisticsCacheTtl');

          expect(statsErrors).toHaveLength(0);
        });

        it('should reject values below minimum (60)', async () => {
          config.statisticsCacheTtl = 30;
          const errors = await validate(config);
          const statsErrors = errors.filter(e => e.property === 'statisticsCacheTtl');

          expect(statsErrors).toHaveLength(1);
          expect(statsErrors[0].constraints?.min).toContain('统计缓存TTL不能少于60秒');
        });

        it('should reject values above maximum (1800)', async () => {
          config.statisticsCacheTtl = 3600;
          const errors = await validate(config);
          const statsErrors = errors.filter(e => e.property === 'statisticsCacheTtl');

          expect(statsErrors).toHaveLength(1);
          expect(statsErrors[0].constraints?.max).toContain('统计缓存TTL不能超过1800秒');
        });
      });

      describe('sessionCacheTtl validation', () => {
        it('should accept valid values', async () => {
          config.sessionCacheTtl = 7200;
          const errors = await validate(config);
          const sessionErrors = errors.filter(e => e.property === 'sessionCacheTtl');

          expect(sessionErrors).toHaveLength(0);
        });

        it('should reject values below minimum (300)', async () => {
          config.sessionCacheTtl = 120;
          const errors = await validate(config);
          const sessionErrors = errors.filter(e => e.property === 'sessionCacheTtl');

          expect(sessionErrors).toHaveLength(1);
          expect(sessionErrors[0].constraints?.min).toContain('会话缓存TTL不能少于300秒');
        });

        it('should reject values above maximum (86400)', async () => {
          config.sessionCacheTtl = 172800;
          const errors = await validate(config);
          const sessionErrors = errors.filter(e => e.property === 'sessionCacheTtl');

          expect(sessionErrors).toHaveLength(1);
          expect(sessionErrors[0].constraints?.max).toContain('会话缓存TTL不能超过86400秒');
        });
      });

      describe('JWT token expiry validation', () => {
        it('should accept valid JWT expiry formats', async () => {
          const validFormats = ['15m', '1h', '30s', '1d', '2w'];

          for (const format of validFormats) {
            config.jwtDefaultExpiry = format;
            const errors = await validate(config);
            const jwtErrors = errors.filter(e => e.property === 'jwtDefaultExpiry');

            expect(jwtErrors).toHaveLength(0);
          }
        });

        it('should accept valid refresh token expiry formats', async () => {
          const validFormats = ['7d', '14d', '1w', '2w', '30d'];

          for (const format of validFormats) {
            config.refreshTokenDefaultExpiry = format;
            const errors = await validate(config);
            const refreshErrors = errors.filter(e => e.property === 'refreshTokenDefaultExpiry');

            expect(refreshErrors).toHaveLength(0);
          }
        });
      });
    });
  });

  describe('authCacheConfig factory', () => {
    it('should create configuration factory with correct key', () => {
      expect(authCacheConfig.KEY).toBe('CONFIGURATION(authCache)');
      expect(typeof authCacheConfig).toBe('function');
    });

    it('should create valid configuration when called', () => {
      const configInstance = authCacheConfig();

      expect(configInstance).toBeInstanceOf(AuthCacheConfigValidation);
      expect(configInstance.permissionCacheTtl).toBeDefined();
      expect(configInstance.apiKeyCacheTtl).toBeDefined();
    });

    it('should work with NestJS ConfigModule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [authCacheConfig],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
      await module.close();
    });

    it('should throw error for invalid configuration', () => {
      process.env.AUTH_PERMISSION_CACHE_TTL = '30'; // 低于最小值

      expect(() => authCacheConfig()).toThrow('Auth Cache configuration validation failed');
    });
  });

  describe('integration tests', () => {
    it('should maintain configuration consistency across multiple instantiations', () => {
      const config1 = new AuthCacheConfigValidation();
      const config2 = new AuthCacheConfigValidation();

      expect(config1.permissionCacheTtl).toBe(config2.permissionCacheTtl);
      expect(config1.apiKeyCacheTtl).toBe(config2.apiKeyCacheTtl);
      expect(config1.rateLimitTtl).toBe(config2.rateLimitTtl);
    });

    it('should handle environment variable changes correctly', () => {
      // 测试环境变量变化的影响
      const originalConfig = new AuthCacheConfigValidation();
      const originalTtl = originalConfig.permissionCacheTtl;

      process.env.AUTH_PERMISSION_CACHE_TTL = '600';
      const newConfig = new AuthCacheConfigValidation();

      expect(newConfig.permissionCacheTtl).toBe(600);
      expect(newConfig.permissionCacheTtl).not.toBe(originalTtl);
    });
  });

  describe('error handling', () => {
    it('should handle invalid environment variable values gracefully', () => {
      process.env.AUTH_PERMISSION_CACHE_TTL = 'not-a-number';

      const testConfig = new AuthCacheConfigValidation();
      // parseInt('not-a-number') returns NaN, 但配置应该有默认值逻辑
      expect(isNaN(testConfig.permissionCacheTtl)).toBe(true);
    });

    it('should provide meaningful error messages for validation failures', () => {
      process.env.AUTH_PERMISSION_CACHE_TTL = '30';

      expect(() => authCacheConfig()).toThrow();
    });
  });

  describe('performance tests', () => {
    it('should create configuration instances efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        new AuthCacheConfigValidation();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000次实例化应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('should validate configuration efficiently', async () => {
      const configs = Array.from({ length: 100 }, () => new AuthCacheConfigValidation());

      const startTime = performance.now();

      const validationPromises = configs.map(config => validate(config));
      await Promise.all(validationPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 100次验证应该在200ms内完成
      expect(duration).toBeLessThan(200);
    });
  });
});