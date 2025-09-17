/**
 * Auth配置重叠消除验证测试
 * 专门验证配置重叠问题已被彻底解决
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

import { AuthConfigCompatibilityWrapper } from "../../../src/auth/config/compatibility-wrapper";
import { AuthUnifiedConfigInterface } from "../../../src/auth/config/auth-unified.config";
import { AuthCacheConfigValidation } from "../../../src/auth/config/auth-cache.config";
import { AuthLimitsConfigValidation } from "../../../src/auth/config/auth-limits.config";

// 导入配置文件用于测试
import { securityConfig } from "../../../src/auth/config/security.config";

describe("Auth Configuration Deduplication Verification", () => {
  let wrapper: AuthConfigCompatibilityWrapper;
  let module: TestingModule;
  let unifiedConfig: AuthUnifiedConfigInterface;

  beforeAll(async () => {
    // 创建真实的统一配置实例用于测试
    unifiedConfig = {
      cache: new AuthCacheConfigValidation(),
      limits: new AuthLimitsConfigValidation(),
    };

    module = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        {
          provide: "authUnified",
          useValue: unifiedConfig,
        },
        AuthConfigCompatibilityWrapper,
      ],
    }).compile();

    wrapper = module.get<AuthConfigCompatibilityWrapper>(
      AuthConfigCompatibilityWrapper,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  describe("TTL Configuration Deduplication", () => {
    it("应该消除TTL配置的重叠定义", () => {
      // 获取新配置系统中的TTL值
      const permissionTtlFromWrapper =
        wrapper.PERMISSION_CHECK.CACHE_TTL_SECONDS;
      const apiKeyTtlFromWrapper = wrapper.API_KEY_OPERATIONS.CACHE_TTL_SECONDS;
      const statisticsTtlFromWrapper =
        wrapper.API_KEY_OPERATIONS.STATISTICS_CACHE_TTL;

      // 获取原始安全配置中的TTL值用于对比
      const originalSecurityPermissionTtl =
        securityConfig.permission.cacheTtlSeconds;

      // 验证新配置系统中的值来源于统一配置
      expect(permissionTtlFromWrapper).toBe(
        unifiedConfig.cache.permissionCacheTtl,
      );
      expect(apiKeyTtlFromWrapper).toBe(unifiedConfig.cache.apiKeyCacheTtl);
      expect(statisticsTtlFromWrapper).toBe(
        unifiedConfig.cache.statisticsCacheTtl,
      );

      // 验证消除重叠：原来分散的TTL配置现在都有统一来源
      console.log("TTL配置对比：");
      console.log(`  新系统权限TTL: ${permissionTtlFromWrapper}`);
      console.log(`  新系统API Key TTL: ${apiKeyTtlFromWrapper}`);
      console.log(`  新系统统计TTL: ${statisticsTtlFromWrapper}`);
      console.log(`  原安全配置TTL: ${originalSecurityPermissionTtl}`);

      // 验证配置值的合理性
      expect(permissionTtlFromWrapper).toBeGreaterThan(0);
      expect(apiKeyTtlFromWrapper).toBeGreaterThan(0);
      expect(statisticsTtlFromWrapper).toBeGreaterThan(0);
    });

    it("应该确保缓存TTL配置的一致性策略", () => {
      const cacheConfig = unifiedConfig.cache;

      // 验证缓存配置层的统一管理
      expect(cacheConfig.permissionCacheTtl).toBeDefined();
      expect(cacheConfig.apiKeyCacheTtl).toBeDefined();
      expect(cacheConfig.rateLimitTtl).toBeDefined();
      expect(cacheConfig.statisticsCacheTtl).toBeDefined();
      expect(cacheConfig.sessionCacheTtl).toBeDefined();

      // 验证TTL值的合理关系
      // 会话缓存TTL应该最长
      expect(cacheConfig.sessionCacheTtl).toBeGreaterThanOrEqual(
        cacheConfig.permissionCacheTtl,
      );
      expect(cacheConfig.sessionCacheTtl).toBeGreaterThanOrEqual(
        cacheConfig.apiKeyCacheTtl,
      );

      // 统计缓存TTL应该与权限缓存TTL相近或相同
      expect(
        Math.abs(
          cacheConfig.statisticsCacheTtl - cacheConfig.permissionCacheTtl,
        ),
      ).toBeLessThanOrEqual(60);
    });
  });

  describe("Rate Limit Configuration Deduplication", () => {
    it("应该消除频率限制配置的重叠定义", () => {
      // 获取新配置系统中的频率限制值
      const globalRateLimit = wrapper.RATE_LIMITS.LIMIT_PER_MINUTE;
      const apiKeyValidateRate = wrapper.API_KEY_OPERATIONS.VALIDATE_PER_SECOND;
      const loginRateLimit = wrapper.RATE_LIMITS.LOGIN_PER_MINUTE;

      // 验证这些值来源于统一配置
      expect(globalRateLimit).toBe(unifiedConfig.limits.globalRateLimit);
      expect(apiKeyValidateRate).toBe(
        unifiedConfig.limits.apiKeyValidatePerSecond,
      );
      expect(loginRateLimit).toBe(unifiedConfig.limits.loginRatePerMinute);

      console.log("频率限制配置对比：");
      console.log(`  全局频率限制: ${globalRateLimit}/分钟`);
      console.log(`  API Key验证: ${apiKeyValidateRate}/秒`);
      console.log(`  登录限制: ${loginRateLimit}/分钟`);

      // 验证频率限制配置的合理性
      expect(globalRateLimit).toBeGreaterThan(0);
      expect(apiKeyValidateRate).toBeGreaterThan(0);
      expect(loginRateLimit).toBeGreaterThan(0);
      expect(loginRateLimit).toBeLessThan(globalRateLimit); // 登录限制应该比全局限制更严格
    });

    it("应该确保频率限制的层级一致性", () => {
      const limitsConfig = unifiedConfig.limits;
      const rateLimits = wrapper.RATE_LIMITS;

      // 验证不同操作的频率限制层级合理
      expect(limitsConfig.loginRatePerMinute).toBeLessThan(
        limitsConfig.globalRateLimit,
      );
      expect(rateLimits.REGISTER_PER_MINUTE).toBeLessThan(
        rateLimits.LOGIN_PER_MINUTE,
      );
      expect(rateLimits.PASSWORD_RESET_PER_MINUTE).toBeLessThan(
        rateLimits.LOGIN_PER_MINUTE,
      );

      // 验证时间窗口配置
      expect(rateLimits.TTL_SECONDS).toBe(unifiedConfig.cache.rateLimitTtl);
    });
  });

  describe("String Length Limit Deduplication", () => {
    it("应该消除字符串长度限制的重叠定义", () => {
      // 获取新配置系统中的字符串限制
      const maxStringLength = wrapper.VALIDATION_LIMITS.MAX_STRING_LENGTH;
      const maxPayloadBytes = wrapper.VALIDATION_LIMITS.MAX_PAYLOAD_SIZE_BYTES;
      const maxPayloadString =
        wrapper.VALIDATION_LIMITS.MAX_PAYLOAD_SIZE_STRING;

      // 对比原始常量
      const originalMaxStringLength = VALIDATION_LIMITS.MAX_STRING_LENGTH;
      const originalMaxPayloadBytes = VALIDATION_LIMITS.MAX_PAYLOAD_SIZE_BYTES;

      // 验证这些值来源于统一配置
      expect(maxStringLength).toBe(unifiedConfig.limits.maxStringLength);
      expect(maxPayloadBytes).toBe(unifiedConfig.limits.maxPayloadSizeBytes);
      expect(maxPayloadString).toBe(unifiedConfig.limits.maxPayloadSizeString);

      console.log("字符串长度限制对比：");
      console.log(`  新系统最大字符串长度: ${maxStringLength}`);
      console.log(`  原常量最大字符串长度: ${originalMaxStringLength}`);
      console.log(`  新系统最大负载大小: ${maxPayloadBytes} bytes`);
      console.log(`  原常量最大负载大小: ${originalMaxPayloadBytes} bytes`);

      // 验证配置值合理性
      expect(maxStringLength).toBeGreaterThan(1000);
      expect(maxPayloadBytes).toBeGreaterThan(1048576); // 至少1MB
    });

    it("应该确保对象复杂度限制的统一性", () => {
      const validationLimits = wrapper.VALIDATION_LIMITS;
      const limitsConfig = unifiedConfig.limits;

      // 验证对象复杂度配置来源统一
      expect(validationLimits.MAX_OBJECT_DEPTH).toBe(
        limitsConfig.maxObjectDepth,
      );
      expect(validationLimits.MAX_OBJECT_FIELDS).toBe(
        limitsConfig.maxObjectFields,
      );
      expect(validationLimits.MAX_QUERY_PARAMS).toBe(
        limitsConfig.maxQueryParams,
      );
      expect(validationLimits.MAX_RECURSION_DEPTH).toBe(
        limitsConfig.maxRecursionDepth,
      );

      // 验证复杂度限制的合理关系
      expect(limitsConfig.maxObjectFields).toBeGreaterThan(
        limitsConfig.maxObjectDepth,
      );
      expect(limitsConfig.maxRecursionDepth).toBeGreaterThanOrEqual(
        limitsConfig.maxObjectDepth,
      );
    });
  });

  describe("Timeout Configuration Deduplication", () => {
    it("应该消除超时配置的重叠定义", () => {
      // 获取新配置系统中的超时值
      const permissionTimeout = wrapper.PERMISSION_CHECK.CHECK_TIMEOUT_MS;
      const redisConnectionTimeout = wrapper.RATE_LIMITS.CONNECTION_TIMEOUT_MS;
      const redisCommandTimeout = wrapper.RATE_LIMITS.COMMAND_TIMEOUT_MS;

      // 验证这些值来源于统一配置
      expect(permissionTimeout).toBe(unifiedConfig.limits.timeoutMs);
      expect(redisConnectionTimeout).toBe(
        unifiedConfig.limits.redisConnectionTimeout,
      );
      expect(redisCommandTimeout).toBe(
        unifiedConfig.limits.redisCommandTimeout,
      );

      console.log("超时配置对比：");
      console.log(`  权限检查超时: ${permissionTimeout}ms`);
      console.log(`  Redis连接超时: ${redisConnectionTimeout}ms`);
      console.log(`  Redis命令超时: ${redisCommandTimeout}ms`);

      // 验证超时配置的合理性
      expect(permissionTimeout).toBeGreaterThan(1000); // 至少1秒
      expect(redisConnectionTimeout).toBeGreaterThan(1000);
      expect(redisCommandTimeout).toBeGreaterThan(1000);
      expect(redisCommandTimeout).toBeLessThanOrEqual(redisConnectionTimeout); // 命令超时不应超过连接超时
    });
  });

  describe("Security Configuration Deduplication", () => {
    it("应该消除安全配置的重叠定义", () => {
      const userLogin = wrapper.USER_LOGIN;
      const securityConfigFromWrapper = wrapper.SECURITY_CONFIG;

      // 验证安全配置来源统一
      expect(userLogin.MAX_ATTEMPTS).toBe(
        unifiedConfig.limits.maxLoginAttempts,
      );
      expect(userLogin.LOCKOUT_MINUTES).toBe(
        unifiedConfig.limits.loginLockoutMinutes,
      );
      expect(securityConfigFromWrapper.security.maxLoginAttempts).toBe(
        unifiedConfig.limits.maxLoginAttempts,
      );
      expect(securityConfigFromWrapper.security.maxApiKeysPerUser).toBe(
        unifiedConfig.limits.maxApiKeysPerUser,
      );

      // 对比原始配置
      const originalMaxLoginAttempts = securityConfig.security.maxLoginAttempts;
      const originalMaxApiKeys = securityConfig.security.maxApiKeysPerUser;

      console.log("安全配置对比：");
      console.log(`  新系统最大登录尝试: ${userLogin.MAX_ATTEMPTS}`);
      console.log(`  原配置最大登录尝试: ${originalMaxLoginAttempts}`);
      console.log(
        `  新系统最大API Key数: ${securityConfigFromWrapper.security.maxApiKeysPerUser}`,
      );
      console.log(`  原配置最大API Key数: ${originalMaxApiKeys}`);
    });

    it("应该确保密码策略配置的统一性", () => {
      const securityConfigFromWrapper = wrapper.SECURITY_CONFIG;
      const validationLimits = wrapper.VALIDATION_LIMITS;

      // 验证密码配置来源统一
      expect(securityConfigFromWrapper.passwordPolicy.minLength).toBe(
        unifiedConfig.limits.passwordMinLength,
      );
      expect(securityConfigFromWrapper.passwordPolicy.maxLength).toBe(
        unifiedConfig.limits.passwordMaxLength,
      );
      expect(validationLimits.PASSWORD_MIN_LENGTH).toBe(
        unifiedConfig.limits.passwordMinLength,
      );
      expect(validationLimits.PASSWORD_MAX_LENGTH).toBe(
        unifiedConfig.limits.passwordMaxLength,
      );

      // 验证密码策略的合理性
      expect(unifiedConfig.limits.passwordMinLength).toBeGreaterThanOrEqual(6);
      expect(unifiedConfig.limits.passwordMaxLength).toBeGreaterThan(
        unifiedConfig.limits.passwordMinLength,
      );
    });
  });

  describe("Cross-Configuration Consistency", () => {
    it("应该确保配置间的逻辑一致性", () => {
      const cacheConfig = unifiedConfig.cache;
      const limitsConfig = unifiedConfig.limits;

      // 缓存TTL不应超过会话超时
      expect(cacheConfig.permissionCacheTtl).toBeLessThanOrEqual(
        limitsConfig.sessionTimeoutMinutes * 60,
      );
      expect(cacheConfig.apiKeyCacheTtl).toBeLessThanOrEqual(
        limitsConfig.sessionTimeoutMinutes * 60,
      );

      // API Key验证频率与全局频率限制应该匹配
      const apiKeyRatePerMinute = limitsConfig.apiKeyValidatePerSecond * 60;
      expect(apiKeyRatePerMinute).toBeLessThanOrEqual(
        limitsConfig.globalRateLimit * 2,
      );

      // 登录相关配置的一致性
      expect(
        limitsConfig.loginRatePerMinute * limitsConfig.loginLockoutMinutes,
      ).toBeLessThan(limitsConfig.globalRateLimit);
    });

    it("应该确保配置值的数学关系正确", () => {
      const validationLimits = wrapper.VALIDATION_LIMITS;

      // API Key长度关系
      expect(validationLimits.API_KEY_DEFAULT_LENGTH).toBeGreaterThanOrEqual(
        validationLimits.API_KEY_MIN_LENGTH,
      );
      expect(validationLimits.API_KEY_DEFAULT_LENGTH).toBeLessThanOrEqual(
        validationLimits.API_KEY_MAX_LENGTH,
      );

      // 字符串长度层次关系
      expect(validationLimits.MAX_DESCRIPTION_LENGTH).toBeLessThan(
        validationLimits.MAX_STRING_LENGTH,
      );
      expect(validationLimits.MAX_NAME_LENGTH).toBeLessThan(
        validationLimits.MAX_DESCRIPTION_LENGTH,
      );

      // 对象复杂度关系
      expect(validationLimits.MAX_OBJECT_DEPTH).toBeLessThan(
        validationLimits.MAX_OBJECT_FIELDS,
      );
    });
  });

  describe("Configuration Impact Analysis", () => {
    it("应该评估配置重叠消除的影响", () => {
      const summary = wrapper.getConfigSummary();

      // 验证配置摘要反映了重叠消除的结果
      expect(summary.compatibility.configSource).toBe("unified");
      expect(
        summary.compatibility.wrappedConstants.length,
      ).toBeGreaterThanOrEqual(7);

      // 验证主要配置分类都有覆盖
      const wrappedConstants = summary.compatibility.wrappedConstants;
      expect(wrappedConstants).toContain("API_KEY_OPERATIONS");
      expect(wrappedConstants).toContain("PERMISSION_CHECK");
      expect(wrappedConstants).toContain("VALIDATION_LIMITS");
      expect(wrappedConstants).toContain("USER_LOGIN");
      expect(wrappedConstants).toContain("SESSION_CONFIG");
      expect(wrappedConstants).toContain("RATE_LIMITS");
      expect(wrappedConstants).toContain("SECURITY_CONFIG");

      console.log("配置重叠消除影响分析：");
      console.log(`  统一配置源: ${summary.compatibility.configSource}`);
      console.log(`  包装的常量接口数: ${wrappedConstants.length}`);
      console.log(`  缓存配置层: ${JSON.stringify(summary.cacheConfig)}`);
      console.log(`  限制配置层: ${JSON.stringify(summary.limitsConfig)}`);
    });

    it("应该确认配置访问性能未受影响", () => {
      const iterations = 10000;
      const startTime = process.hrtime.bigint();

      // 高频访问配置以测试性能
      for (let i = 0; i < iterations; i++) {
        const apiKeyOps = wrapper.API_KEY_OPERATIONS;
        const permCheck = wrapper.PERMISSION_CHECK;
        const validLimits = wrapper.VALIDATION_LIMITS;

        // 验证访问正常
        expect(apiKeyOps.CACHE_TTL_SECONDS).toBeDefined();
        expect(permCheck.CHECK_TIMEOUT_MS).toBeDefined();
        expect(validLimits.MAX_STRING_LENGTH).toBeDefined();
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(
        `配置访问性能测试: ${iterations}次访问耗时 ${durationMs.toFixed(2)}ms`,
      );

      // 性能应该满足要求 (10000次访问应该在100ms以内)
      expect(durationMs).toBeLessThan(100);

      // 平均每次访问应该很快
      const avgAccessTimeMs = durationMs / iterations;
      expect(avgAccessTimeMs).toBeLessThan(0.01); // 平均每次访问少于0.01ms
    });
  });
});
