import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validate } from 'class-validator';
import {
  AuthLimitsConfigValidation,
  authLimitsConfig,
  AuthLimitsConfigType,
} from '@auth/config/auth-limits.config';
import { getConfigToken } from '@nestjs/config/dist/utils/get-config-token.util';

describe('AuthLimitsConfig', () => {
  let config: AuthLimitsConfigValidation;

  beforeEach(() => {
    // 清理环境变量
    const envVarsToDelete = [
      'AUTH_RATE_LIMIT', 'AUTH_API_KEY_VALIDATE_RATE', 'AUTH_LOGIN_RATE_LIMIT',
      'AUTH_STRING_LIMIT', 'AUTH_MAX_PAYLOAD_BYTES', 'AUTH_MAX_PAYLOAD_SIZE',
      'AUTH_TIMEOUT', 'AUTH_REDIS_CONNECTION_TIMEOUT', 'AUTH_REDIS_COMMAND_TIMEOUT',
      'AUTH_API_KEY_LENGTH', 'AUTH_MAX_API_KEYS_PER_USER', 'AUTH_API_KEY_CREATE_LIMIT',
      'AUTH_MAX_OBJECT_DEPTH', 'AUTH_MAX_OBJECT_FIELDS', 'AUTH_MAX_QUERY_PARAMS',
      'AUTH_MAX_RECURSION_DEPTH', 'AUTH_MAX_LOGIN_ATTEMPTS', 'AUTH_LOGIN_LOCKOUT_MINUTES',
      'AUTH_PASSWORD_MIN_LENGTH', 'AUTH_PASSWORD_MAX_LENGTH', 'AUTH_BCRYPT_SALT_ROUNDS',
      'AUTH_MAX_CONCURRENT_SESSIONS', 'AUTH_SESSION_TIMEOUT_MINUTES',
    ];

    envVarsToDelete.forEach(envVar => delete process.env[envVar]);
    config = new AuthLimitsConfigValidation();
  });

  afterEach(() => {
    // 清理环境变量
    const envVarsToDelete = [
      'AUTH_RATE_LIMIT', 'AUTH_API_KEY_VALIDATE_RATE', 'AUTH_LOGIN_RATE_LIMIT',
      'AUTH_STRING_LIMIT', 'AUTH_MAX_PAYLOAD_BYTES', 'AUTH_MAX_PAYLOAD_SIZE',
      'AUTH_TIMEOUT', 'AUTH_REDIS_CONNECTION_TIMEOUT', 'AUTH_REDIS_COMMAND_TIMEOUT',
      'AUTH_API_KEY_LENGTH', 'AUTH_MAX_API_KEYS_PER_USER', 'AUTH_API_KEY_CREATE_LIMIT',
      'AUTH_MAX_OBJECT_DEPTH', 'AUTH_MAX_OBJECT_FIELDS', 'AUTH_MAX_QUERY_PARAMS',
      'AUTH_MAX_RECURSION_DEPTH', 'AUTH_MAX_LOGIN_ATTEMPTS', 'AUTH_LOGIN_LOCKOUT_MINUTES',
      'AUTH_PASSWORD_MIN_LENGTH', 'AUTH_PASSWORD_MAX_LENGTH', 'AUTH_BCRYPT_SALT_ROUNDS',
      'AUTH_MAX_CONCURRENT_SESSIONS', 'AUTH_SESSION_TIMEOUT_MINUTES',
    ];

    envVarsToDelete.forEach(envVar => delete process.env[envVar]);
  });

  describe('AuthLimitsConfigValidation', () => {
    describe('default values', () => {
      it('should use correct default values for rate limits', () => {
        expect(config.globalRateLimit).toBe(100);
        expect(config.apiKeyValidatePerSecond).toBe(100);
        expect(config.loginRatePerMinute).toBe(5);
      });

      it('should use correct default values for string and data limits', () => {
        expect(config.maxStringLength).toBe(10000);
        expect(config.maxPayloadSizeBytes).toBe(10485760); // 10MB
        expect(config.maxPayloadSizeString).toBe('10MB');
      });

      it('should use correct default values for timeouts', () => {
        expect(config.timeoutMs).toBe(5000);
        expect(config.redisConnectionTimeout).toBe(5000);
        expect(config.redisCommandTimeout).toBe(5000);
      });

      it('should use correct default values for API Key limits', () => {
        expect(config.apiKeyLength).toBe(32);
        expect(config.maxApiKeysPerUser).toBe(50);
        expect(config.apiKeyCreatePerDay).toBe(10);
      });

      it('should use correct default values for object complexity limits', () => {
        expect(config.maxObjectDepth).toBe(10);
        expect(config.maxObjectFields).toBe(50);
        expect(config.maxQueryParams).toBe(100);
        expect(config.maxRecursionDepth).toBe(100);
      });

      it('should use correct default values for security limits', () => {
        expect(config.maxLoginAttempts).toBe(5);
        expect(config.loginLockoutMinutes).toBe(15);
        expect(config.passwordMinLength).toBe(8);
        expect(config.passwordMaxLength).toBe(128);
        expect(config.bcryptSaltRounds).toBe(12);
      });

      it('should use correct default values for session limits', () => {
        expect(config.maxConcurrentSessions).toBe(5);
        expect(config.sessionTimeoutMinutes).toBe(60);
      });
    });

    describe('environment variable parsing', () => {
      it('should parse rate limit environment variables correctly', () => {
        process.env.AUTH_RATE_LIMIT = '200';
        process.env.AUTH_API_KEY_VALIDATE_RATE = '150';
        process.env.AUTH_LOGIN_RATE_LIMIT = '10';

        const testConfig = new AuthLimitsConfigValidation();

        expect(testConfig.globalRateLimit).toBe(200);
        expect(testConfig.apiKeyValidatePerSecond).toBe(150);
        expect(testConfig.loginRatePerMinute).toBe(10);
      });

      it('should parse string and data limit environment variables correctly', () => {
        process.env.AUTH_STRING_LIMIT = '20000';
        process.env.AUTH_MAX_PAYLOAD_BYTES = '20971520'; // 20MB
        process.env.AUTH_MAX_PAYLOAD_SIZE = '20MB';

        const testConfig = new AuthLimitsConfigValidation();

        expect(testConfig.maxStringLength).toBe(20000);
        expect(testConfig.maxPayloadSizeBytes).toBe(20971520);
        expect(testConfig.maxPayloadSizeString).toBe('20MB');
      });

      it('should parse timeout environment variables correctly', () => {
        process.env.AUTH_TIMEOUT = '10000';
        process.env.AUTH_REDIS_CONNECTION_TIMEOUT = '8000';
        process.env.AUTH_REDIS_COMMAND_TIMEOUT = '6000';

        const testConfig = new AuthLimitsConfigValidation();

        expect(testConfig.timeoutMs).toBe(10000);
        expect(testConfig.redisConnectionTimeout).toBe(8000);
        expect(testConfig.redisCommandTimeout).toBe(6000);
      });
    });

    describe('validation constraints', () => {
      describe('globalRateLimit validation', () => {
        it('should accept valid values', async () => {
          config.globalRateLimit = 500;
          const errors = await validate(config);
          const rateErrors = errors.filter(e => e.property === 'globalRateLimit');

          expect(rateErrors).toHaveLength(0);
        });

        it('should reject values below minimum (10)', async () => {
          config.globalRateLimit = 5;
          const errors = await validate(config);
          const rateErrors = errors.filter(e => e.property === 'globalRateLimit');

          expect(rateErrors).toHaveLength(1);
          expect(rateErrors[0].constraints?.min).toContain('全局频率限制不能少于10次/分钟');
        });

        it('should reject values above maximum (10000)', async () => {
          config.globalRateLimit = 15000;
          const errors = await validate(config);
          const rateErrors = errors.filter(e => e.property === 'globalRateLimit');

          expect(rateErrors).toHaveLength(1);
          expect(rateErrors[0].constraints?.max).toContain('全局频率限制不能超过10000次/分钟');
        });
      });

      describe('apiKeyValidatePerSecond validation', () => {
        it('should accept valid values', async () => {
          config.apiKeyValidatePerSecond = 200;
          const errors = await validate(config);
          const apiErrors = errors.filter(e => e.property === 'apiKeyValidatePerSecond');

          expect(apiErrors).toHaveLength(0);
        });

        it('should reject values below minimum (10)', async () => {
          config.apiKeyValidatePerSecond = 5;
          const errors = await validate(config);
          const apiErrors = errors.filter(e => e.property === 'apiKeyValidatePerSecond');

          expect(apiErrors).toHaveLength(1);
          expect(apiErrors[0].constraints?.min).toContain('API Key验证频率不能少于10次/秒');
        });

        it('should reject values above maximum (1000)', async () => {
          config.apiKeyValidatePerSecond = 1500;
          const errors = await validate(config);
          const apiErrors = errors.filter(e => e.property === 'apiKeyValidatePerSecond');

          expect(apiErrors).toHaveLength(1);
          expect(apiErrors[0].constraints?.max).toContain('API Key验证频率不能超过1000次/秒');
        });
      });

      describe('maxStringLength validation', () => {
        it('should accept valid values', async () => {
          config.maxStringLength = 20000;
          const errors = await validate(config);
          const stringErrors = errors.filter(e => e.property === 'maxStringLength');

          expect(stringErrors).toHaveLength(0);
        });

        it('should reject values below minimum (1000)', async () => {
          config.maxStringLength = 500;
          const errors = await validate(config);
          const stringErrors = errors.filter(e => e.property === 'maxStringLength');

          expect(stringErrors).toHaveLength(1);
          expect(stringErrors[0].constraints?.min).toContain('字符串长度限制不能少于1000');
        });

        it('should reject values above maximum (100000)', async () => {
          config.maxStringLength = 150000;
          const errors = await validate(config);
          const stringErrors = errors.filter(e => e.property === 'maxStringLength');

          expect(stringErrors).toHaveLength(1);
          expect(stringErrors[0].constraints?.max).toContain('字符串长度限制不能超过100000');
        });
      });

      describe('timeoutMs validation', () => {
        it('should accept valid values', async () => {
          config.timeoutMs = 10000;
          const errors = await validate(config);
          const timeoutErrors = errors.filter(e => e.property === 'timeoutMs');

          expect(timeoutErrors).toHaveLength(0);
        });

        it('should reject values below minimum (1000)', async () => {
          config.timeoutMs = 500;
          const errors = await validate(config);
          const timeoutErrors = errors.filter(e => e.property === 'timeoutMs');

          expect(timeoutErrors).toHaveLength(1);
          expect(timeoutErrors[0].constraints?.min).toContain('超时时间不能少于1000毫秒');
        });

        it('should reject values above maximum (30000)', async () => {
          config.timeoutMs = 35000;
          const errors = await validate(config);
          const timeoutErrors = errors.filter(e => e.property === 'timeoutMs');

          expect(timeoutErrors).toHaveLength(1);
          expect(timeoutErrors[0].constraints?.max).toContain('超时时间不能超过30000毫秒');
        });
      });

      describe('apiKeyLength validation', () => {
        it('should accept valid values', async () => {
          config.apiKeyLength = 64;
          const errors = await validate(config);
          const keyErrors = errors.filter(e => e.property === 'apiKeyLength');

          expect(keyErrors).toHaveLength(0);
        });

        it('should reject values below minimum (32)', async () => {
          config.apiKeyLength = 16;
          const errors = await validate(config);
          const keyErrors = errors.filter(e => e.property === 'apiKeyLength');

          expect(keyErrors).toHaveLength(1);
          expect(keyErrors[0].constraints?.min).toContain('API Key长度不能少于32位');
        });

        it('should reject values above maximum (64)', async () => {
          config.apiKeyLength = 128;
          const errors = await validate(config);
          const keyErrors = errors.filter(e => e.property === 'apiKeyLength');

          expect(keyErrors).toHaveLength(1);
          expect(keyErrors[0].constraints?.max).toContain('API Key长度不能超过64位');
        });
      });

      describe('maxLoginAttempts validation', () => {
        it('should accept valid values', async () => {
          config.maxLoginAttempts = 10;
          const errors = await validate(config);
          const loginErrors = errors.filter(e => e.property === 'maxLoginAttempts');

          expect(loginErrors).toHaveLength(0);
        });

        it('should reject values below minimum (3)', async () => {
          config.maxLoginAttempts = 2;
          const errors = await validate(config);
          const loginErrors = errors.filter(e => e.property === 'maxLoginAttempts');

          expect(loginErrors).toHaveLength(1);
          expect(loginErrors[0].constraints?.min).toContain('最大登录尝试次数不能少于3次');
        });

        it('should reject values above maximum (20)', async () => {
          config.maxLoginAttempts = 25;
          const errors = await validate(config);
          const loginErrors = errors.filter(e => e.property === 'maxLoginAttempts');

          expect(loginErrors).toHaveLength(1);
          expect(loginErrors[0].constraints?.max).toContain('最大登录尝试次数不能超过20次');
        });
      });

      describe('passwordMinLength validation', () => {
        it('should accept valid values', async () => {
          config.passwordMinLength = 12;
          const errors = await validate(config);
          const pwdErrors = errors.filter(e => e.property === 'passwordMinLength');

          expect(pwdErrors).toHaveLength(0);
        });

        it('should reject values below minimum (6)', async () => {
          config.passwordMinLength = 4;
          const errors = await validate(config);
          const pwdErrors = errors.filter(e => e.property === 'passwordMinLength');

          expect(pwdErrors).toHaveLength(1);
          expect(pwdErrors[0].constraints?.min).toContain('密码最小长度不能少于6位');
        });
      });

      describe('bcryptSaltRounds validation', () => {
        it('should accept valid values', async () => {
          config.bcryptSaltRounds = 12;
          const errors = await validate(config);
          const saltErrors = errors.filter(e => e.property === 'bcryptSaltRounds');

          expect(saltErrors).toHaveLength(0);
        });

        it('should reject values below minimum (10)', async () => {
          config.bcryptSaltRounds = 8;
          const errors = await validate(config);
          const saltErrors = errors.filter(e => e.property === 'bcryptSaltRounds');

          expect(saltErrors).toHaveLength(1);
          expect(saltErrors[0].constraints?.min).toContain('Bcrypt盐值轮数不能少于10轮');
        });

        it('should reject values above maximum (15)', async () => {
          config.bcryptSaltRounds = 18;
          const errors = await validate(config);
          const saltErrors = errors.filter(e => e.property === 'bcryptSaltRounds');

          expect(saltErrors).toHaveLength(1);
          expect(saltErrors[0].constraints?.max).toContain('Bcrypt盐值轮数不能超过15轮');
        });
      });
    });
  });

  describe('authLimitsConfig factory', () => {
    it('should create configuration factory with correct key', () => {
      expect(authLimitsConfig.KEY).toBe('CONFIGURATION(authLimits)');
      expect(typeof authLimitsConfig).toBe('function');
    });

    it('should create valid configuration when called', () => {
      const configInstance = authLimitsConfig();

      expect(configInstance).toBeInstanceOf(AuthLimitsConfigValidation);
      expect(configInstance.globalRateLimit).toBeDefined();
      expect(configInstance.timeoutMs).toBeDefined();
    });

    it('should work with NestJS ConfigModule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [authLimitsConfig],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
      await module.close();
    });

    it('should throw error for invalid configuration', () => {
      process.env.AUTH_RATE_LIMIT = '5'; // 低于最小值10

      expect(() => authLimitsConfig()).toThrow('Auth Limits configuration validation failed');
    });
  });

  describe('comprehensive validation tests', () => {
    it('should validate all rate limit configurations together', async () => {
      config.globalRateLimit = 1000;
      config.apiKeyValidatePerSecond = 500;
      config.loginRatePerMinute = 10;

      const errors = await validate(config);
      const rateLimitErrors = errors.filter(e =>
        ['globalRateLimit', 'apiKeyValidatePerSecond', 'loginRatePerMinute'].includes(e.property)
      );

      expect(rateLimitErrors).toHaveLength(0);
    });

    it('should validate all security configurations together', async () => {
      config.maxLoginAttempts = 10;
      config.loginLockoutMinutes = 30;
      config.passwordMinLength = 12;
      config.passwordMaxLength = 256;
      config.bcryptSaltRounds = 12;

      const errors = await validate(config);
      const securityErrors = errors.filter(e =>
        ['maxLoginAttempts', 'loginLockoutMinutes', 'passwordMinLength', 'passwordMaxLength', 'bcryptSaltRounds'].includes(e.property)
      );

      expect(securityErrors).toHaveLength(0);
    });

    it('should validate all object complexity limits together', async () => {
      config.maxObjectDepth = 20;
      config.maxObjectFields = 1000;
      config.maxQueryParams = 500;
      config.maxRecursionDepth = 200;

      const errors = await validate(config);
      const complexityErrors = errors.filter(e =>
        ['maxObjectDepth', 'maxObjectFields', 'maxQueryParams', 'maxRecursionDepth'].includes(e.property)
      );

      expect(complexityErrors).toHaveLength(0);
    });
  });

  describe('integration tests', () => {
    it('should maintain configuration consistency across multiple instantiations', () => {
      const config1 = new AuthLimitsConfigValidation();
      const config2 = new AuthLimitsConfigValidation();

      expect(config1.globalRateLimit).toBe(config2.globalRateLimit);
      expect(config1.timeoutMs).toBe(config2.timeoutMs);
      expect(config1.apiKeyLength).toBe(config2.apiKeyLength);
    });

    it('should handle environment variable changes correctly', () => {
      const originalConfig = new AuthLimitsConfigValidation();
      const originalLimit = originalConfig.globalRateLimit;

      process.env.AUTH_RATE_LIMIT = '500';
      const newConfig = new AuthLimitsConfigValidation();

      expect(newConfig.globalRateLimit).toBe(500);
      expect(newConfig.globalRateLimit).not.toBe(originalLimit);
    });

    it('should validate complete configuration with custom environment variables', () => {
      // 设置所有环境变量为有效值
      process.env.AUTH_RATE_LIMIT = '200';
      process.env.AUTH_API_KEY_VALIDATE_RATE = '150';
      process.env.AUTH_STRING_LIMIT = '20000';
      process.env.AUTH_TIMEOUT = '8000';
      process.env.AUTH_API_KEY_LENGTH = '64';
      process.env.AUTH_MAX_LOGIN_ATTEMPTS = '10';
      process.env.AUTH_BCRYPT_SALT_ROUNDS = '12';

      expect(() => authLimitsConfig()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid environment variable values gracefully', () => {
      process.env.AUTH_RATE_LIMIT = 'not-a-number';

      const testConfig = new AuthLimitsConfigValidation();
      expect(isNaN(testConfig.globalRateLimit)).toBe(true);
    });

    it('should provide meaningful error messages for multiple validation failures', () => {
      process.env.AUTH_RATE_LIMIT = '5'; // 太小
      process.env.AUTH_API_KEY_LENGTH = '16'; // 太小
      process.env.AUTH_MAX_LOGIN_ATTEMPTS = '25'; // 太大

      expect(() => authLimitsConfig()).toThrow();
    });
  });

  describe('performance tests', () => {
    it('should create configuration instances efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        new AuthLimitsConfigValidation();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should validate configuration efficiently', async () => {
      const configs = Array.from({ length: 50 }, () => new AuthLimitsConfigValidation());

      const startTime = performance.now();

      const validationPromises = configs.map(config => validate(config));
      await Promise.all(validationPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('boundary value tests', () => {
    const boundaries = [
      { prop: 'globalRateLimit', min: 10, max: 10000 },
      { prop: 'apiKeyValidatePerSecond', min: 10, max: 1000 },
      { prop: 'maxStringLength', min: 1000, max: 100000 },
      { prop: 'timeoutMs', min: 1000, max: 30000 },
      { prop: 'apiKeyLength', min: 32, max: 64 },
      { prop: 'maxLoginAttempts', min: 3, max: 20 },
      { prop: 'bcryptSaltRounds', min: 10, max: 15 },
    ];

    boundaries.forEach(({ prop, min, max }) => {
      it(`should accept boundary values for ${prop}`, async () => {
        // 测试最小值
        (config as any)[prop] = min;
        let errors = await validate(config);
        let propErrors = errors.filter(e => e.property === prop);
        expect(propErrors).toHaveLength(0);

        // 测试最大值
        (config as any)[prop] = max;
        errors = await validate(config);
        propErrors = errors.filter(e => e.property === prop);
        expect(propErrors).toHaveLength(0);
      });

      it(`should reject values just outside boundaries for ${prop}`, async () => {
        // 测试小于最小值
        (config as any)[prop] = min - 1;
        let errors = await validate(config);
        let propErrors = errors.filter(e => e.property === prop);
        expect(propErrors.length).toBeGreaterThan(0);

        // 测试大于最大值
        (config as any)[prop] = max + 1;
        errors = await validate(config);
        propErrors = errors.filter(e => e.property === prop);
        expect(propErrors.length).toBeGreaterThan(0);
      });
    });
  });
});