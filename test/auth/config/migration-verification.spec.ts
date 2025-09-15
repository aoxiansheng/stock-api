/**
 * Auth配置迁移验证测试
 * 确保新的分层配置系统与现有常量兼容，验证迁移的正确性
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

import { 
  AuthCacheConfigValidation, 
  authCacheConfig 
} from '../../../src/auth/config/auth-cache.config';
import { 
  AuthLimitsConfigValidation, 
  authLimitsConfig 
} from '../../../src/auth/config/auth-limits.config';
import { 
  authUnifiedConfig, 
  AuthUnifiedConfigInterface,
  validateAuthUnifiedConfig,
  getAuthConfigSummary
} from '../../../src/auth/config/auth-unified.config';
import { AuthConfigCompatibilityWrapper } from '../../../src/auth/config/compatibility-wrapper';

// 导入原有常量进行对比验证
import { PERMISSION_CHECK } from '../../../src/auth/constants/permission-control.constants';
import { API_KEY_OPERATIONS } from '../../../src/auth/constants/api-security.constants';

describe('Auth Configuration Migration Verification', () => {
  let wrapper: AuthConfigCompatibilityWrapper;
  let module: TestingModule;
  let mockUnifiedConfig: AuthUnifiedConfigInterface;

  beforeAll(async () => {
    // 创建测试用的统一配置
    mockUnifiedConfig = {
      cache: {
        permissionCacheTtl: 300,
        apiKeyCacheTtl: 300,
        rateLimitTtl: 60,
        statisticsCacheTtl: 300,
        sessionCacheTtl: 3600,
      } as AuthCacheConfigValidation,
      limits: {
        globalRateLimit: 100,
        apiKeyValidatePerSecond: 100,
        loginRatePerMinute: 5,
        maxStringLength: 10000,
        maxPayloadSizeBytes: 10485760,
        maxPayloadSizeString: '10MB',
        timeoutMs: 5000,
        redisConnectionTimeout: 5000,
        redisCommandTimeout: 5000,
        apiKeyLength: 32,
        maxApiKeysPerUser: 50,
        apiKeyCreatePerDay: 10,
        maxObjectDepth: 10,
        maxObjectFields: 50,
        maxQueryParams: 100,
        maxRecursionDepth: 100,
        maxLoginAttempts: 5,
        loginLockoutMinutes: 15,
        passwordMinLength: 8,
        passwordMaxLength: 128,
        maxConcurrentSessions: 5,
        sessionTimeoutMinutes: 60,
      } as AuthLimitsConfigValidation,
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forFeature(authUnifiedConfig),
      ],
      providers: [
        {
          provide: 'authUnified',
          useValue: mockUnifiedConfig,
        },
        AuthConfigCompatibilityWrapper,
      ],
    }).compile();

    wrapper = module.get<AuthConfigCompatibilityWrapper>(AuthConfigCompatibilityWrapper);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Configuration Layer Creation', () => {
    it('应该成功创建缓存配置层', () => {
      const cacheConfig = new AuthCacheConfigValidation();
      
      expect(cacheConfig).toBeDefined();
      expect(typeof cacheConfig.permissionCacheTtl).toBe('number');
      expect(typeof cacheConfig.apiKeyCacheTtl).toBe('number');
      expect(typeof cacheConfig.rateLimitTtl).toBe('number');
      expect(typeof cacheConfig.statisticsCacheTtl).toBe('number');
      expect(typeof cacheConfig.sessionCacheTtl).toBe('number');
      
      // 验证默认值合理性
      expect(cacheConfig.permissionCacheTtl).toBeGreaterThan(0);
      expect(cacheConfig.apiKeyCacheTtl).toBeGreaterThan(0);
      expect(cacheConfig.rateLimitTtl).toBeGreaterThan(0);
    });

    it('应该成功创建限制配置层', () => {
      const limitsConfig = new AuthLimitsConfigValidation();
      
      expect(limitsConfig).toBeDefined();
      expect(typeof limitsConfig.globalRateLimit).toBe('number');
      expect(typeof limitsConfig.maxStringLength).toBe('number');
      expect(typeof limitsConfig.timeoutMs).toBe('number');
      expect(typeof limitsConfig.apiKeyLength).toBe('number');
      expect(typeof limitsConfig.maxApiKeysPerUser).toBe('number');
      
      // 验证默认值合理性
      expect(limitsConfig.globalRateLimit).toBeGreaterThan(0);
      expect(limitsConfig.maxStringLength).toBeGreaterThan(1000);
      expect(limitsConfig.timeoutMs).toBeGreaterThan(1000);
      expect(limitsConfig.apiKeyLength).toBeGreaterThanOrEqual(32);
    });

    it('应该成功创建统一配置', () => {
      const config = authUnifiedConfig();
      
      expect(config).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.limits).toBeDefined();
      
      expect(typeof config.cache.permissionCacheTtl).toBe('number');
      expect(typeof config.limits.globalRateLimit).toBe('number');
    });
  });

  describe('Backward Compatibility API', () => {
    it('应该维持API_KEY_OPERATIONS接口兼容性', () => {
      const operations = wrapper.API_KEY_OPERATIONS;
      
      expect(operations).toBeDefined();
      
      // 验证关键属性存在且类型正确
      expect(typeof operations.CACHE_TTL_SECONDS).toBe('number');
      expect(typeof operations.VALIDATE_PER_SECOND).toBe('number');
      expect(typeof operations.CREATE_PER_DAY).toBe('number');
      expect(typeof operations.MAX_KEYS_PER_USER).toBe('number');
      expect(typeof operations.STATISTICS_CACHE_TTL).toBe('number');
      expect(typeof operations.CLEANUP_BATCH_SIZE).toBe('number');
      
      // 验证数值合理性
      expect(operations.CACHE_TTL_SECONDS).toBeGreaterThan(0);
      expect(operations.VALIDATE_PER_SECOND).toBeGreaterThan(0);
      expect(operations.MAX_KEYS_PER_USER).toBeGreaterThan(0);
    });

    it('应该维持PERMISSION_CHECK接口兼容性', () => {
      const permissionCheck = wrapper.PERMISSION_CHECK;
      
      expect(permissionCheck).toBeDefined();
      
      // 验证关键属性存在且类型正确
      expect(typeof permissionCheck.CACHE_TTL_SECONDS).toBe('number');
      expect(typeof permissionCheck.CHECK_TIMEOUT_MS).toBe('number');
      expect(typeof permissionCheck.MAX_PERMISSIONS_PER_CHECK).toBe('number');
      expect(typeof permissionCheck.MAX_ROLES_PER_CHECK).toBe('number');
      expect(typeof permissionCheck.SLOW_CHECK_THRESHOLD_MS).toBe('number');
      expect(typeof permissionCheck.MAX_CACHE_KEY_LENGTH).toBe('number');
      
      // 验证数值合理性
      expect(permissionCheck.CACHE_TTL_SECONDS).toBeGreaterThan(0);
      expect(permissionCheck.CHECK_TIMEOUT_MS).toBeGreaterThan(1000);
    });

    it('应该维持VALIDATION_LIMITS接口兼容性', () => {
      const validationLimits = wrapper.VALIDATION_LIMITS;
      
      expect(validationLimits).toBeDefined();
      
      // 验证字符串长度限制
      expect(typeof validationLimits.MAX_STRING_LENGTH).toBe('number');
      expect(typeof validationLimits.MAX_PAYLOAD_SIZE_BYTES).toBe('number');
      expect(typeof validationLimits.MAX_PAYLOAD_SIZE_STRING).toBe('string');
      
      // 验证API Key长度限制
      expect(typeof validationLimits.API_KEY_DEFAULT_LENGTH).toBe('number');
      expect(validationLimits.API_KEY_MIN_LENGTH).toBe(32);
      expect(validationLimits.API_KEY_MAX_LENGTH).toBe(64);
      
      // 验证密码长度限制
      expect(typeof validationLimits.PASSWORD_MIN_LENGTH).toBe('number');
      expect(typeof validationLimits.PASSWORD_MAX_LENGTH).toBe('number');
      expect(validationLimits.PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(6);
      expect(validationLimits.PASSWORD_MAX_LENGTH).toBeGreaterThan(validationLimits.PASSWORD_MIN_LENGTH);
    });

    it('应该维持USER_LOGIN接口兼容性', () => {
      const userLogin = wrapper.USER_LOGIN;
      
      expect(userLogin).toBeDefined();
      expect(typeof userLogin.MAX_ATTEMPTS).toBe('number');
      expect(typeof userLogin.LOCKOUT_MINUTES).toBe('number');
      expect(typeof userLogin.SESSION_HOURS).toBe('number');
      expect(typeof userLogin.TOKEN_REFRESH_HOURS).toBe('number');
      
      expect(userLogin.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(userLogin.LOCKOUT_MINUTES).toBeGreaterThan(0);
    });

    it('应该维持SESSION_CONFIG接口兼容性', () => {
      const sessionConfig = wrapper.SESSION_CONFIG;
      
      expect(sessionConfig).toBeDefined();
      expect(typeof sessionConfig.ACCESS_TOKEN_HOURS).toBe('number');
      expect(typeof sessionConfig.REFRESH_TOKEN_DAYS).toBe('number');
      expect(typeof sessionConfig.SESSION_TIMEOUT_MINUTES).toBe('number');
      expect(typeof sessionConfig.MAX_CONCURRENT).toBe('number');
      
      expect(sessionConfig.MAX_CONCURRENT).toBeGreaterThan(0);
      expect(sessionConfig.SESSION_TIMEOUT_MINUTES).toBeGreaterThan(0);
    });
  });

  describe('Configuration Overlap Elimination', () => {
    it('应该消除TTL配置重叠', () => {
      // 验证所有TTL配置来源统一
      const permissionTtl = wrapper.PERMISSION_CHECK.CACHE_TTL_SECONDS;
      const apiKeyTtl = wrapper.API_KEY_OPERATIONS.CACHE_TTL_SECONDS;
      
      // 这些值应该都来自统一配置
      expect(permissionTtl).toBe(mockUnifiedConfig.cache.permissionCacheTtl);
      expect(apiKeyTtl).toBe(mockUnifiedConfig.cache.apiKeyCacheTtl);
      
      // 在这个测试中，我们设置了相同的值，验证统一性
      expect(permissionTtl).toBe(300);
      expect(apiKeyTtl).toBe(300);
    });

    it('应该消除频率限制配置重叠', () => {
      const rateLimits = wrapper.RATE_LIMITS;
      const apiKeyOps = wrapper.API_KEY_OPERATIONS;
      
      // 验证频率限制配置来源统一
      expect(rateLimits.LIMIT_PER_MINUTE).toBe(mockUnifiedConfig.limits.globalRateLimit);
      expect(apiKeyOps.VALIDATE_PER_SECOND).toBe(mockUnifiedConfig.limits.apiKeyValidatePerSecond);
      
      // 验证统一性
      expect(rateLimits.LIMIT_PER_MINUTE).toBe(100);
      expect(apiKeyOps.VALIDATE_PER_SECOND).toBe(100);
    });

    it('应该消除字符串长度限制重叠', () => {
      const validationLimits = wrapper.VALIDATION_LIMITS;
      
      // 验证字符串长度限制来源统一
      expect(validationLimits.MAX_STRING_LENGTH).toBe(mockUnifiedConfig.limits.maxStringLength);
      expect(validationLimits.MAX_PAYLOAD_SIZE_BYTES).toBe(mockUnifiedConfig.limits.maxPayloadSizeBytes);
      
      // 验证统一性
      expect(validationLimits.MAX_STRING_LENGTH).toBe(10000);
      expect(validationLimits.MAX_PAYLOAD_SIZE_BYTES).toBe(10485760);
    });

    it('应该消除超时配置重叠', () => {
      const permissionCheck = wrapper.PERMISSION_CHECK;
      const rateLimits = wrapper.RATE_LIMITS;
      
      // 验证超时配置来源统一
      expect(permissionCheck.CHECK_TIMEOUT_MS).toBe(mockUnifiedConfig.limits.timeoutMs);
      expect(rateLimits.CONNECTION_TIMEOUT_MS).toBe(mockUnifiedConfig.limits.redisConnectionTimeout);
      expect(rateLimits.COMMAND_TIMEOUT_MS).toBe(mockUnifiedConfig.limits.redisCommandTimeout);
      
      // 验证统一性
      expect(permissionCheck.CHECK_TIMEOUT_MS).toBe(5000);
      expect(rateLimits.CONNECTION_TIMEOUT_MS).toBe(5000);
      expect(rateLimits.COMMAND_TIMEOUT_MS).toBe(5000);
    });
  });

  describe('Configuration Validation', () => {
    it('应该验证统一配置的完整性', () => {
      const errors = validateAuthUnifiedConfig(mockUnifiedConfig);
      
      expect(Array.isArray(errors)).toBe(true);
      // 在正确配置下应该没有错误
      expect(errors.length).toBe(0);
    });

    it('应该检测缺失的配置层', () => {
      const incompleteConfig = {
        cache: mockUnifiedConfig.cache,
        // 缺少 limits 层
      } as any;
      
      const errors = validateAuthUnifiedConfig(incompleteConfig);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('缺少限制配置层'))).toBe(true);
    });

    it('应该检测配置不一致性', () => {
      const inconsistentConfig = {
        cache: {
          ...mockUnifiedConfig.cache,
          permissionCacheTtl: 10000, // 过大的值
        },
        limits: {
          ...mockUnifiedConfig.limits,
          sessionTimeoutMinutes: 1, // 过小的值
        }
      };
      
      const errors = validateAuthUnifiedConfig(inconsistentConfig);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('权限缓存TTL不应超过会话超时时间'))).toBe(true);
    });

    it('应该验证兼容性包装器完整性', () => {
      const validation = wrapper.validateCompatibility();
      
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      
      // 在正确配置下应该是有效的
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Configuration Summary and Monitoring', () => {
    it('应该提供配置摘要信息', () => {
      const summary = getAuthConfigSummary(mockUnifiedConfig);
      
      expect(summary).toBeDefined();
      expect(summary.cache).toBeDefined();
      expect(summary.limits).toBeDefined();
      expect(summary.validation).toBeDefined();
      
      expect(summary.cache.permissionTtl).toBe(300);
      expect(summary.limits.globalRateLimit).toBe(100);
      expect(summary.validation.configLayersCount).toBe(2);
      expect(summary.validation.hasCache).toBe(true);
      expect(summary.validation.hasLimits).toBe(true);
    });

    it('应该提供兼容性包装器摘要', () => {
      const summary = wrapper.getConfigSummary();
      
      expect(summary).toBeDefined();
      expect(summary.cacheConfig).toBeDefined();
      expect(summary.limitsConfig).toBeDefined();
      expect(summary.compatibility).toBeDefined();
      
      expect(Array.isArray(summary.compatibility.wrappedConstants)).toBe(true);
      expect(summary.compatibility.wrappedConstants.length).toBeGreaterThan(0);
      expect(summary.compatibility.configSource).toBe('unified');
      expect(summary.compatibility.wrapperVersion).toBeDefined();
    });
  });

  describe('Environment Variable Override', () => {
    it('应该支持环境变量覆盖', () => {
      // 这个测试验证环境变量能够正确覆盖默认值
      const originalValue = process.env.AUTH_CACHE_TTL;
      
      // 设置测试环境变量
      process.env.AUTH_CACHE_TTL = '600';
      
      try {
        const config = new AuthCacheConfigValidation();
        expect(config.permissionCacheTtl).toBe(600);
        expect(config.apiKeyCacheTtl).toBe(600);
      } finally {
        // 恢复原始值
        if (originalValue !== undefined) {
          process.env.AUTH_CACHE_TTL = originalValue;
        } else {
          delete process.env.AUTH_CACHE_TTL;
        }
      }
    });

    it('应该在无效环境变量时使用默认值', () => {
      const originalValue = process.env.AUTH_RATE_LIMIT;
      
      // 设置无效的环境变量
      process.env.AUTH_RATE_LIMIT = 'invalid_number';
      
      try {
        const config = new AuthLimitsConfigValidation();
        // 应该使用默认值而不是无效的环境变量
        expect(config.globalRateLimit).toBe(100); // 默认值
      } finally {
        // 恢复原始值
        if (originalValue !== undefined) {
          process.env.AUTH_RATE_LIMIT = originalValue;
        } else {
          delete process.env.AUTH_RATE_LIMIT;
        }
      }
    });
  });

  describe('Performance and Resource Usage', () => {
    it('配置加载性能应该满足要求', () => {
      const startTime = process.hrtime.bigint();
      
      // 多次创建配置实例
      for (let i = 0; i < 100; i++) {
        const config = authUnifiedConfig();
        expect(config).toBeDefined();
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000; // 转换为毫秒
      
      // 配置加载时间应该小于50ms (对于100次调用)
      expect(durationMs).toBeLessThan(50);
    });

    it('兼容性包装器访问性能应该满足要求', () => {
      const startTime = process.hrtime.bigint();
      
      // 多次访问包装器接口
      for (let i = 0; i < 1000; i++) {
        const apiKeyOps = wrapper.API_KEY_OPERATIONS;
        const permissionCheck = wrapper.PERMISSION_CHECK;
        expect(apiKeyOps).toBeDefined();
        expect(permissionCheck).toBeDefined();
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      // 访问性能应该很快 (1000次访问小于10ms)
      expect(durationMs).toBeLessThan(10);
    });
  });
});