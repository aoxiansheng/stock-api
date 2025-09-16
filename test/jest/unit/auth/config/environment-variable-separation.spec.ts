import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthCacheConfigValidation, authCacheConfig } from '../../../../../src/auth/config/auth-cache.config';
import { AuthLimitsConfigValidation, authLimitsConfig } from '../../../../../src/auth/config/auth-limits.config';
import { AuthConfigCompatibilityWrapper } from '../../../../../src/auth/config/compatibility-wrapper';

/**
 * Environment Variable Separation Tests
 * 测试环境变量分离和验证的完整性
 * 
 * @description
 * 这个测试套件验证：
 * 1. 环境变量正确分离 - 不再使用共享的 AUTH_CACHE_TTL
 * 2. 专用环境变量正常工作
 * 3. 配置验证逻辑正确
 * 4. 默认值处理正确
 * 5. 兼容性包装器正确处理新的环境变量
 */
describe('Environment Variable Separation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('AuthCacheConfig Environment Variable Separation', () => {
    it('should use dedicated AUTH_PERMISSION_CACHE_TTL instead of shared AUTH_CACHE_TTL', () => {
      // 设置专用环境变量
      process.env.AUTH_PERMISSION_CACHE_TTL = '600';
      delete process.env.AUTH_CACHE_TTL; // 确保不使用共享变量

      const config = new AuthCacheConfigValidation();
      
      expect(config.permissionCacheTtl).toBe(600);
    });

    it('should use dedicated AUTH_API_KEY_CACHE_TTL instead of shared AUTH_CACHE_TTL', () => {
      // 设置专用环境变量
      process.env.AUTH_API_KEY_CACHE_TTL = '900';
      delete process.env.AUTH_CACHE_TTL; // 确保不使用共享变量

      const config = new AuthCacheConfigValidation();
      
      expect(config.apiKeyCacheTtl).toBe(900);
    });

    it('should use different values for permission and api key cache TTL when set separately', () => {
      // 设置不同的专用环境变量值
      process.env.AUTH_PERMISSION_CACHE_TTL = '300';
      process.env.AUTH_API_KEY_CACHE_TTL = '600';
      delete process.env.AUTH_CACHE_TTL; // 确保不使用共享变量

      const config = new AuthCacheConfigValidation();
      
      expect(config.permissionCacheTtl).toBe(300);
      expect(config.apiKeyCacheTtl).toBe(600);
      expect(config.permissionCacheTtl).not.toBe(config.apiKeyCacheTtl);
    });

    it('should fall back to default values when environment variables are not set', () => {
      // 清除所有相关环境变量
      delete process.env.AUTH_PERMISSION_CACHE_TTL;
      delete process.env.AUTH_API_KEY_CACHE_TTL;
      delete process.env.AUTH_STATISTICS_CACHE_TTL;
      delete process.env.AUTH_RATE_LIMIT_TTL;
      delete process.env.AUTH_SESSION_CACHE_TTL;
      delete process.env.AUTH_CACHE_TTL;

      const config = new AuthCacheConfigValidation();
      
      // 验证默认值
      expect(config.permissionCacheTtl).toBe(300);
      expect(config.apiKeyCacheTtl).toBe(300);
      expect(config.statisticsCacheTtl).toBe(300);
      expect(config.rateLimitTtl).toBe(60);
      expect(config.sessionCacheTtl).toBe(3600);
    });

    it('should validate TTL values are within acceptable ranges', () => {
      // 测试超出范围的值
      process.env.AUTH_PERMISSION_CACHE_TTL = '30'; // 小于最小值 60
      
      expect(() => {
        const config = new AuthCacheConfigValidation();
        // 需要触发验证
        const configService = authCacheConfig();
      }).toThrow();
    });

    it('should validate all cache TTL environment variables independently', () => {
      // 设置所有专用环境变量
      process.env.AUTH_PERMISSION_CACHE_TTL = '180';
      process.env.AUTH_API_KEY_CACHE_TTL = '240';
      process.env.AUTH_STATISTICS_CACHE_TTL = '120';
      process.env.AUTH_RATE_LIMIT_TTL = '45';
      process.env.AUTH_SESSION_CACHE_TTL = '1800';

      const config = new AuthCacheConfigValidation();
      
      expect(config.permissionCacheTtl).toBe(180);
      expect(config.apiKeyCacheTtl).toBe(240);
      expect(config.statisticsCacheTtl).toBe(120);
      expect(config.rateLimitTtl).toBe(45);
      expect(config.sessionCacheTtl).toBe(1800);
    });
  });

  describe('AuthLimitsConfig Environment Variable Validation', () => {
    it('should correctly read all limits configuration environment variables', () => {
      // 设置所有限制配置环境变量
      process.env.AUTH_RATE_LIMIT = '200';
      process.env.AUTH_API_KEY_VALIDATE_RATE = '150';
      process.env.AUTH_LOGIN_RATE_LIMIT = '10';
      process.env.AUTH_STRING_LIMIT = '20000';
      process.env.AUTH_MAX_PAYLOAD_BYTES = '20971520'; // 20MB
      process.env.AUTH_TIMEOUT = '10000';
      process.env.AUTH_API_KEY_LENGTH = '64';
      process.env.AUTH_MAX_API_KEYS_PER_USER = '100';

      const config = new AuthLimitsConfigValidation();
      
      expect(config.globalRateLimit).toBe(200);
      expect(config.apiKeyValidatePerSecond).toBe(150);
      expect(config.loginRatePerMinute).toBe(10);
      expect(config.maxStringLength).toBe(20000);
      expect(config.maxPayloadSizeBytes).toBe(20971520);
      expect(config.timeoutMs).toBe(10000);
      expect(config.apiKeyLength).toBe(64);
      expect(config.maxApiKeysPerUser).toBe(100);
    });

    it('should use default values when limits environment variables are not set', () => {
      // 清除所有环境变量
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('AUTH_')) {
          delete process.env[key];
        }
      });

      const config = new AuthLimitsConfigValidation();
      
      // 验证默认值
      expect(config.globalRateLimit).toBe(100);
      expect(config.apiKeyValidatePerSecond).toBe(100);
      expect(config.loginRatePerMinute).toBe(5);
      expect(config.maxStringLength).toBe(10000);
      expect(config.maxPayloadSizeBytes).toBe(10485760);
      expect(config.timeoutMs).toBe(5000);
      expect(config.apiKeyLength).toBe(32);
      expect(config.maxApiKeysPerUser).toBe(50);
    });

    it('should validate limits values are within acceptable ranges', () => {
      // 测试超出最大范围的值
      process.env.AUTH_RATE_LIMIT = '20000'; // 超过最大值 10000
      
      expect(() => {
        const config = new AuthLimitsConfigValidation();
        const configService = authLimitsConfig();
      }).toThrow();
    });
  });

  describe('Compatibility Wrapper with New Environment Variables', () => {
    let module: TestingModule;
    let configService: ConfigService;
    let compatibilityWrapper: AuthConfigCompatibilityWrapper;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue({
                cache: {
                  permissionCacheTtl: 300,
                  apiKeyCacheTtl: 300,
                  statisticsCacheTtl: 300,
                  rateLimitTtl: 60,
                  sessionCacheTtl: 3600,
                },
                limits: {
                  globalRateLimit: 100,
                  apiKeyValidatePerSecond: 100,
                  loginRatePerMinute: 5,
                  maxStringLength: 10000,
                  maxPayloadSizeBytes: 10485760,
                  maxPayloadSizeString: '10MB',
                  timeoutMs: 5000,
                  apiKeyLength: 32,
                  maxApiKeysPerUser: 50,
                  maxLoginAttempts: 5,
                  loginLockoutMinutes: 15,
                  passwordMinLength: 8,
                  passwordMaxLength: 128,
                  maxConcurrentSessions: 5,
                  sessionTimeoutMinutes: 60,
                  redisConnectionTimeout: 5000,
                  redisCommandTimeout: 5000,
                  maxObjectDepth: 10,
                  maxObjectFields: 50,
                  maxQueryParams: 100,
                  maxRecursionDepth: 100,
                  apiKeyCreatePerDay: 10,
                }
              })
            }
          },
          AuthConfigCompatibilityWrapper,
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      compatibilityWrapper = module.get<AuthConfigCompatibilityWrapper>(AuthConfigCompatibilityWrapper);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide correct API_KEY_OPERATIONS constants through compatibility wrapper', () => {
      const apiKeyOps = compatibilityWrapper.API_KEY_OPERATIONS;
      
      expect(apiKeyOps.CACHE_TTL_SECONDS).toBe(300);
      expect(apiKeyOps.STATISTICS_CACHE_TTL).toBe(300);
      expect(apiKeyOps.VALIDATE_PER_SECOND).toBe(100);
      expect(apiKeyOps.MAX_KEYS_PER_USER).toBe(50);
    });

    it('should provide correct PERMISSION_CHECK constants through compatibility wrapper', () => {
      const permissionCheck = compatibilityWrapper.PERMISSION_CHECK;
      
      expect(permissionCheck.CACHE_TTL_SECONDS).toBe(300);
      expect(permissionCheck.CHECK_TIMEOUT_MS).toBe(5000);
    });

    it('should provide correct VALIDATION_LIMITS constants through compatibility wrapper', () => {
      const validationLimits = compatibilityWrapper.VALIDATION_LIMITS;
      
      expect(validationLimits.MAX_STRING_LENGTH).toBe(10000);
      expect(validationLimits.MAX_PAYLOAD_SIZE_BYTES).toBe(10485760);
      expect(validationLimits.API_KEY_DEFAULT_LENGTH).toBe(32);
      expect(validationLimits.PASSWORD_MIN_LENGTH).toBe(8);
      expect(validationLimits.PASSWORD_MAX_LENGTH).toBe(128);
    });

    it('should provide correct RATE_LIMITS constants through compatibility wrapper', () => {
      const rateLimits = compatibilityWrapper.RATE_LIMITS;
      
      expect(rateLimits.TTL_SECONDS).toBe(60);
      expect(rateLimits.LIMIT_PER_MINUTE).toBe(100);
      expect(rateLimits.LOGIN_PER_MINUTE).toBe(5);
      expect(rateLimits.CONNECTION_TIMEOUT_MS).toBe(5000);
      expect(rateLimits.COMMAND_TIMEOUT_MS).toBe(5000);
    });

    it('should validate compatibility wrapper successfully', () => {
      const validation = compatibilityWrapper.validateCompatibility();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should provide comprehensive config summary', () => {
      const summary = compatibilityWrapper.getConfigSummary();
      
      expect(summary.cacheConfig).toBeDefined();
      expect(summary.limitsConfig).toBeDefined();
      expect(summary.compatibility.wrappedConstants).toContain('API_KEY_OPERATIONS');
      expect(summary.compatibility.wrappedConstants).toContain('PERMISSION_CHECK');
      expect(summary.compatibility.wrappedConstants).toContain('VALIDATION_LIMITS');
      expect(summary.compatibility.configSource).toBe('unified');
    });
  });

  describe('Configuration Overlap Elimination Verification', () => {
    it('should not have any shared cache TTL environment variable usage', () => {
      // 验证不再有 AUTH_CACHE_TTL 的使用 - 通过检查实际配置值
      process.env.AUTH_PERMISSION_CACHE_TTL = '400';
      process.env.AUTH_API_KEY_CACHE_TTL = '500';
      delete process.env.AUTH_CACHE_TTL;

      const config = new AuthCacheConfigValidation();
      
      // 确保使用了专用环境变量而不是共享变量
      expect(config.permissionCacheTtl).toBe(400);
      expect(config.apiKeyCacheTtl).toBe(500);
      
      // 如果还在使用共享变量，这些值应该是相同的
      expect(config.permissionCacheTtl).not.toBe(config.apiKeyCacheTtl);
    });

    it('should have distinct environment variables for each cache type', () => {
      // 验证每种缓存类型都有专用的环境变量
      const distinctVariables = [
        'AUTH_PERMISSION_CACHE_TTL',
        'AUTH_API_KEY_CACHE_TTL',
        'AUTH_STATISTICS_CACHE_TTL', 
        'AUTH_RATE_LIMIT_TTL',
        'AUTH_SESSION_CACHE_TTL'
      ];

      // 设置不同的值
      distinctVariables.forEach((variable, index) => {
        process.env[variable] = String((index + 1) * 100);
      });

      const config = new AuthCacheConfigValidation();
      
      // 验证每个配置值都不同
      const values = [
        config.permissionCacheTtl,
        config.apiKeyCacheTtl,
        config.statisticsCacheTtl,
        config.rateLimitTtl,
        config.sessionCacheTtl
      ];
      
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length); // 所有值都应该不同
    });
  });

  describe('Environment Variable Type Conversion and Validation', () => {
    it('should handle string to number conversion correctly', () => {
      process.env.AUTH_PERMISSION_CACHE_TTL = '450';
      process.env.AUTH_API_KEY_CACHE_TTL = '750';
      
      const config = new AuthCacheConfigValidation();
      
      expect(typeof config.permissionCacheTtl).toBe('number');
      expect(typeof config.apiKeyCacheTtl).toBe('number');
      expect(config.permissionCacheTtl).toBe(450);
      expect(config.apiKeyCacheTtl).toBe(750);
    });

    it('should handle invalid number strings gracefully', () => {
      process.env.AUTH_PERMISSION_CACHE_TTL = 'invalid_number';
      
      const config = new AuthCacheConfigValidation();
      
      // parseInt('invalid_number') 返回 NaN，应该回退到默认值或失败
      expect(isNaN(config.permissionCacheTtl) || config.permissionCacheTtl === 300).toBe(true);
    });

    it('should enforce minimum and maximum constraints for all TTL values', () => {
      const testCases = [
        { env: 'AUTH_PERMISSION_CACHE_TTL', min: 60, max: 3600 },
        { env: 'AUTH_API_KEY_CACHE_TTL', min: 60, max: 7200 },
        { env: 'AUTH_STATISTICS_CACHE_TTL', min: 60, max: 1800 },
        { env: 'AUTH_RATE_LIMIT_TTL', min: 30, max: 600 },
        { env: 'AUTH_SESSION_CACHE_TTL', min: 300, max: 86400 },
      ];

      testCases.forEach(({ env, min, max }) => {
        // 测试小于最小值
        process.env[env] = String(min - 1);
        expect(() => {
          const config = new AuthCacheConfigValidation();
          authCacheConfig();
        }).toThrow();

        // 测试大于最大值  
        process.env[env] = String(max + 1);
        expect(() => {
          const config = new AuthCacheConfigValidation();
          authCacheConfig();
        }).toThrow();

        // 测试在有效范围内
        process.env[env] = String(Math.floor((min + max) / 2));
        expect(() => {
          const config = new AuthCacheConfigValidation();
          authCacheConfig();
        }).not.toThrow();
      });
    });
  });
});