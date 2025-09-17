import { AuthCacheConfigValidation } from "../../../../../src/auth/config/auth-cache.config";
import { AuthLimitsConfigValidation } from "../../../../../src/auth/config/auth-limits.config";
import { AuthConfigCompatibilityWrapper } from "../../../../../src/auth/config/compatibility-wrapper";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

/**
 * Configuration Overlap Elimination Tests
 * 测试配置重叠消除的完整性和正确性
 *
 * @description
 * 这个测试套件验证：
 * 1. 不再有配置重叠问题
 * 2. 每个配置项只在一个地方定义
 * 3. 配置层级分离正确
 * 4. 向后兼容性完整
 * 5. 四层配置系统标准合规
 */
describe("Configuration Overlap Elimination", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Cache Layer Configuration Isolation", () => {
    it("should have no TTL configuration overlaps between cache and limits layers", () => {
      // 缓存层应该只包含TTL相关配置
      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 验证缓存层只有TTL配置
      const cacheProperties = Object.keys(cacheConfig);
      const ttlProperties = cacheProperties.filter(
        (prop) => prop.includes("Ttl") || prop.includes("TTL"),
      );

      expect(cacheProperties.length).toBe(ttlProperties.length);

      // 验证限制层不包含TTL配置
      const limitsProperties = Object.keys(limitsConfig);
      const limitsTtlProperties = limitsProperties.filter(
        (prop) => prop.includes("Ttl") || prop.includes("TTL"),
      );

      expect(limitsTtlProperties.length).toBe(0);
    });

    it("should have dedicated environment variable for each cache type", () => {
      // 每种缓存都应该有专用的环境变量
      const cacheEnvironmentVariables = {
        permissionCacheTtl: "AUTH_PERMISSION_CACHE_TTL",
        apiKeyCacheTtl: "AUTH_API_KEY_CACHE_TTL",
        statisticsCacheTtl: "AUTH_STATISTICS_CACHE_TTL",
        rateLimitTtl: "AUTH_RATE_LIMIT_TTL",
        sessionCacheTtl: "AUTH_SESSION_CACHE_TTL",
      };

      // 为每个环境变量设置不同的值
      Object.values(cacheEnvironmentVariables).forEach((envVar, index) => {
        process.env[envVar] = String((index + 1) * 100 + 100); // 200, 300, 400, 500, 600
      });

      const config = new AuthCacheConfigValidation();

      // 验证每个配置项都有不同的值，证明使用了专用环境变量
      expect(config.permissionCacheTtl).toBe(200);
      expect(config.apiKeyCacheTtl).toBe(300);
      expect(config.statisticsCacheTtl).toBe(400);
      expect(config.rateLimitTtl).toBe(500);
      expect(config.sessionCacheTtl).toBe(600);
    });

    it("should not use shared AUTH_CACHE_TTL environment variable anymore", () => {
      // 确保不再使用共享的 AUTH_CACHE_TTL
      process.env.AUTH_CACHE_TTL = "999"; // 设置一个特殊值

      // 删除专用环境变量，确保使用默认值而不是共享变量
      delete process.env.AUTH_PERMISSION_CACHE_TTL;
      delete process.env.AUTH_API_KEY_CACHE_TTL;

      const config = new AuthCacheConfigValidation();

      // 应该使用默认值(300)，而不是共享变量的值(999)
      expect(config.permissionCacheTtl).toBe(300);
      expect(config.apiKeyCacheTtl).toBe(300);
      expect(config.permissionCacheTtl).not.toBe(999);
      expect(config.apiKeyCacheTtl).not.toBe(999);
    });
  });

  describe("Limits Layer Configuration Isolation", () => {
    it("should contain only non-TTL configuration parameters", () => {
      const config = new AuthLimitsConfigValidation();
      const properties = Object.keys(config);

      // 限制层不应该包含TTL配置
      const ttlProperties = properties.filter(
        (prop) =>
          prop.toLowerCase().includes("ttl") ||
          prop.toLowerCase().includes("cachettl"),
      );

      expect(ttlProperties.length).toBe(0);
    });

    it("should group related limits logically", () => {
      const config = new AuthLimitsConfigValidation();

      // 频率限制组
      expect(config.globalRateLimit).toBeDefined();
      expect(config.apiKeyValidatePerSecond).toBeDefined();
      expect(config.loginRatePerMinute).toBeDefined();

      // 字符串长度限制组
      expect(config.maxStringLength).toBeDefined();
      expect(config.maxPayloadSizeBytes).toBeDefined();
      expect(config.maxPayloadSizeString).toBeDefined();

      // 超时配置组
      expect(config.timeoutMs).toBeDefined();
      expect(config.redisConnectionTimeout).toBeDefined();
      expect(config.redisCommandTimeout).toBeDefined();

      // API Key限制组
      expect(config.apiKeyLength).toBeDefined();
      expect(config.maxApiKeysPerUser).toBeDefined();
      expect(config.apiKeyCreatePerDay).toBeDefined();

      // 安全限制组
      expect(config.maxLoginAttempts).toBeDefined();
      expect(config.loginLockoutMinutes).toBeDefined();
      expect(config.passwordMinLength).toBeDefined();
      expect(config.passwordMaxLength).toBeDefined();
    });

    it("should have no configuration value overlaps with cache layer", () => {
      // 设置所有环境变量为特定值
      process.env.AUTH_PERMISSION_CACHE_TTL = "300";
      process.env.AUTH_TIMEOUT = "5000";
      process.env.AUTH_RATE_LIMIT = "100";

      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 验证缓存配置和限制配置没有重叠的值
      expect(cacheConfig.permissionCacheTtl).toBe(300);
      expect(limitsConfig.timeoutMs).toBe(5000);
      expect(limitsConfig.globalRateLimit).toBe(100);

      // 这些值应该在不同的配置层中，不应该相等
      expect(cacheConfig.permissionCacheTtl).not.toBe(limitsConfig.timeoutMs);
      expect(cacheConfig.permissionCacheTtl).not.toBe(
        limitsConfig.globalRateLimit,
      );
    });
  });

  describe("Cross-Layer Configuration Dependencies", () => {
    it("should maintain logical relationships between cache and limits configurations", () => {
      // 设置相关的配置值
      process.env.AUTH_PERMISSION_CACHE_TTL = "300"; // 5分钟
      process.env.AUTH_SESSION_TIMEOUT_MINUTES = "60"; // 60分钟

      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 权限缓存TTL应该小于会话超时时间
      expect(cacheConfig.permissionCacheTtl).toBeLessThan(
        limitsConfig.sessionTimeoutMinutes * 60,
      );
    });

    it("should validate consistency between related configurations", () => {
      // 设置逻辑上一致的配置
      process.env.AUTH_API_KEY_CACHE_TTL = "600"; // 10分钟
      process.env.AUTH_API_KEY_VALIDATE_RATE = "100"; // 每秒100次
      process.env.AUTH_RATE_LIMIT = "6000"; // 每分钟6000次 (100 * 60)

      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 验证API Key验证频率和全局频率限制的一致性
      const expectedGlobalLimit = limitsConfig.apiKeyValidatePerSecond * 60;
      expect(limitsConfig.globalRateLimit).toBeGreaterThanOrEqual(
        expectedGlobalLimit,
      );
    });
  });

  describe("Backward Compatibility Layer Verification", () => {
    let module: TestingModule;
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
                  apiKeyCacheTtl: 350,
                  statisticsCacheTtl: 280,
                  rateLimitTtl: 60,
                  sessionCacheTtl: 3600,
                },
                limits: {
                  globalRateLimit: 100,
                  apiKeyValidatePerSecond: 120,
                  loginRatePerMinute: 5,
                  maxStringLength: 15000,
                  maxPayloadSizeBytes: 15728640,
                  maxPayloadSizeString: "15MB",
                  timeoutMs: 6000,
                  apiKeyLength: 48,
                  maxApiKeysPerUser: 75,
                  maxLoginAttempts: 7,
                  loginLockoutMinutes: 20,
                  passwordMinLength: 10,
                  passwordMaxLength: 256,
                  maxConcurrentSessions: 8,
                  sessionTimeoutMinutes: 90,
                  redisConnectionTimeout: 6000,
                  redisCommandTimeout: 4000,
                  maxObjectDepth: 15,
                  maxObjectFields: 100,
                  maxQueryParams: 200,
                  maxRecursionDepth: 150,
                  apiKeyCreatePerDay: 15,
                },
              }),
            },
          },
          AuthConfigCompatibilityWrapper,
        ],
      }).compile();

      compatibilityWrapper = module.get<AuthConfigCompatibilityWrapper>(
        AuthConfigCompatibilityWrapper,
      );
    });

    afterEach(async () => {
      await module.close();
    });

    it("should provide different TTL values for different cache types through compatibility wrapper", () => {
      const apiKeyOps = compatibilityWrapper.API_KEY_OPERATIONS;
      const permissionCheck = compatibilityWrapper.PERMISSION_CHECK;
      const rateLimits = compatibilityWrapper.RATE_LIMITS;

      // 验证不同缓存类型有不同的TTL值
      expect(apiKeyOps.CACHE_TTL_SECONDS).toBe(350); // API Key cache TTL
      expect(permissionCheck.CACHE_TTL_SECONDS).toBe(300); // Permission cache TTL
      expect(rateLimits.TTL_SECONDS).toBe(60); // Rate limit TTL

      // 确保这些值都不相同（证明使用了专用环境变量）
      expect(apiKeyOps.CACHE_TTL_SECONDS).not.toBe(
        permissionCheck.CACHE_TTL_SECONDS,
      );
      expect(permissionCheck.CACHE_TTL_SECONDS).not.toBe(
        rateLimits.TTL_SECONDS,
      );
      expect(apiKeyOps.CACHE_TTL_SECONDS).not.toBe(rateLimits.TTL_SECONDS);
    });

    it("should correctly map unified config values to legacy constant interfaces", () => {
      const apiKeyOps = compatibilityWrapper.API_KEY_OPERATIONS;
      const validationLimits = compatibilityWrapper.VALIDATION_LIMITS;
      const rateLimits = compatibilityWrapper.RATE_LIMITS;

      // 验证统一配置正确映射到遗留接口
      expect(apiKeyOps.VALIDATE_PER_SECOND).toBe(120);
      expect(apiKeyOps.MAX_KEYS_PER_USER).toBe(75);
      expect(validationLimits.MAX_STRING_LENGTH).toBe(15000);
      expect(validationLimits.API_KEY_DEFAULT_LENGTH).toBe(48);
      expect(rateLimits.LIMIT_PER_MINUTE).toBe(100);
      expect(rateLimits.LOGIN_PER_MINUTE).toBe(5);
    });

    it("should maintain complete API compatibility for all legacy constants", () => {
      // 验证所有遗留常量接口都可用
      expect(compatibilityWrapper.API_KEY_OPERATIONS).toBeDefined();
      expect(compatibilityWrapper.PERMISSION_CHECK).toBeDefined();
      expect(compatibilityWrapper.VALIDATION_LIMITS).toBeDefined();
      expect(compatibilityWrapper.USER_LOGIN).toBeDefined();
      expect(compatibilityWrapper.SESSION_CONFIG).toBeDefined();
      expect(compatibilityWrapper.RATE_LIMITS).toBeDefined();
      expect(compatibilityWrapper.SECURITY_CONFIG).toBeDefined();

      // 验证配置摘要功能
      const summary = compatibilityWrapper.getConfigSummary();
      expect(summary.compatibility.wrappedConstants).toHaveLength(8); // Updated to include USER_REGISTRATION
      expect(summary.compatibility.configSource).toBe("unified");

      // 验证兼容性验证功能
      const validation = compatibilityWrapper.validateCompatibility();
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Four-Layer Configuration System Compliance", () => {
    it("should separate semantic constants from configurable parameters", () => {
      // 语义常量应该在constants文件中，配置参数应该在config文件中
      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 这些都应该是可配置的参数
      expect(typeof cacheConfig.permissionCacheTtl).toBe("number");
      expect(typeof limitsConfig.globalRateLimit).toBe("number");
      expect(typeof limitsConfig.maxStringLength).toBe("number");

      // 语义常量应该从constants文件导入，而不是从config文件
      const {
        PERMISSION_LEVELS,
      } = require("../../../../../src/auth/constants/permission-control.constants");
      expect(PERMISSION_LEVELS.READ).toBe(1);
      expect(PERMISSION_LEVELS.ADMIN).toBe(4);
    });

    it("should have clear layer separation with no cross-layer contamination", () => {
      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 缓存层：只包含TTL相关配置
      const cacheKeys = Object.keys(cacheConfig);
      expect(cacheKeys.every((key) => key.toLowerCase().includes("ttl"))).toBe(
        true,
      );

      // 限制层：不包含TTL配置，只包含数值限制和超时
      const limitsKeys = Object.keys(limitsConfig);
      expect(
        limitsKeys.some((key) => key.toLowerCase().includes("limit")),
      ).toBe(true);
      expect(limitsKeys.some((key) => key.toLowerCase().includes("max"))).toBe(
        true,
      );
      expect(
        limitsKeys.some((key) => key.toLowerCase().includes("timeout")),
      ).toBe(true);
      expect(
        limitsKeys.every((key) => !key.toLowerCase().includes("cachettl")),
      ).toBe(true);
    });

    it("should eliminate all configuration overlaps from legacy system", () => {
      // 验证不再有重复的配置定义
      const environmentVariables = [
        "AUTH_PERMISSION_CACHE_TTL",
        "AUTH_API_KEY_CACHE_TTL",
        "AUTH_STATISTICS_CACHE_TTL",
        "AUTH_RATE_LIMIT_TTL",
        "AUTH_SESSION_CACHE_TTL",
        "AUTH_RATE_LIMIT",
        "AUTH_STRING_LIMIT",
        "AUTH_TIMEOUT",
      ];

      // 为每个变量设置唯一值
      environmentVariables.forEach((envVar, index) => {
        process.env[envVar] = String((index + 1) * 100);
      });

      const cacheConfig = new AuthCacheConfigValidation();
      const limitsConfig = new AuthLimitsConfigValidation();

      // 验证每个配置都有唯一值，没有重叠
      const allValues = [
        cacheConfig.permissionCacheTtl,
        cacheConfig.apiKeyCacheTtl,
        cacheConfig.statisticsCacheTtl,
        cacheConfig.rateLimitTtl,
        cacheConfig.sessionCacheTtl,
        limitsConfig.globalRateLimit,
        limitsConfig.maxStringLength,
        limitsConfig.timeoutMs,
      ];

      const uniqueValues = new Set(allValues);
      expect(uniqueValues.size).toBe(allValues.length);
    });
  });
});
