import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import authUnifiedConfig, {
  type AuthUnifiedConfigInterface,
} from "./auth-unified.config";
import { VALIDATION_LIMITS } from "@common/constants/validation.constants";

/**
 * Auth配置兼容包装器
 * 确保现有代码无缝迁移到新的分层配置系统
 *
 * @description
 * 这个包装器的核心作用是维护向后兼容性，让现有的服务代码
 * 可以继续使用原有的常量接口，而底层数据来源于新的统一配置。
 *
 * 包装的常量接口：
 * - API_KEY_OPERATIONS - API Key操作相关常量
 * - PERMISSION_CHECK - 权限检查相关常量
 * - VALIDATION_LIMITS - 验证限制相关常量
 * - USER_LOGIN - 用户登录相关常量
 * - SESSION_CONFIG - 会话配置相关常量
 */
@Injectable()
export class AuthConfigCompatibilityWrapper {
  private readonly config: AuthUnifiedConfigInterface;

  constructor(
    @Inject("authUnified")
    config: AuthUnifiedConfigInterface,
  ) {
    this.config = config;
  }

  /**
   * API Key操作常量兼容接口
   * 映射到新配置系统的相应值，保持原有API不变
   *
   * 原始位置：src/auth/constants/api-security.constants.ts
   */
  get API_KEY_OPERATIONS() {
    return {
      // 缓存相关 - 来源于 cache 配置层
      CACHE_TTL_SECONDS: this.config.cache.apiKeyCacheTtl,
      STATISTICS_CACHE_TTL: this.config.cache.statisticsCacheTtl,

      // 频率限制 - 来源于 limits 配置层
      VALIDATE_PER_SECOND: this.config.limits.apiKeyValidatePerSecond,
      CREATE_PER_MINUTE: Math.floor(
        this.config.limits.apiKeyCreatePerDay / 24 / 60,
      ), // 转换为每分钟
      CREATE_PER_DAY: this.config.limits.apiKeyCreatePerDay,

      // 数量限制 - 来源于 limits 配置层
      MAX_KEYS_PER_USER: this.config.limits.maxApiKeysPerUser,

      // 其他操作参数 - 保持原有默认值或基于新配置计算
      CLEANUP_BATCH_SIZE: 50, // 固定值，无需配置化
    };
  }

  /**
   * 权限检查常量兼容接口
   * 映射权限相关的配置参数
   *
   * 原始位置：src/auth/constants/permission-control.constants.ts
   */
  get PERMISSION_CHECK() {
    return {
      // 缓存相关 - 来源于 cache 配置层
      CACHE_TTL_SECONDS: this.config.cache.permissionCacheTtl,

      // 超时和限制 - 来源于 limits 配置层
      CHECK_TIMEOUT_MS: this.config.limits.timeoutMs,
      MAX_PERMISSIONS_PER_CHECK: 50, // 固定业务规则，无需配置化
      MAX_ROLES_PER_CHECK: 10, // 固定业务规则，无需配置化
      SLOW_CHECK_THRESHOLD_MS: 100, // 固定性能指标，无需配置化
      MAX_CACHE_KEY_LENGTH: this.config.limits.maxStringLength / 40, // 基于字符串限制计算
    };
  }

  /**
   * 验证限制常量兼容接口
   * 映射各种长度和格式验证限制
   *
   * 原始位置：src/auth/constants/validation-limits.constants.ts
   */
  get VALIDATION_LIMITS() {
    return {
      // 字符串长度限制 - 来源于 limits 配置层
      MAX_STRING_LENGTH: this.config.limits.maxStringLength,
      MAX_PAYLOAD_SIZE_BYTES: this.config.limits.maxPayloadSizeBytes,
      MAX_PAYLOAD_SIZE_STRING: this.config.limits.maxPayloadSizeString,

      // 对象复杂度限制 - 来源于 limits 配置层
      MAX_OBJECT_DEPTH: this.config.limits.maxObjectDepth,
      MAX_OBJECT_FIELDS: this.config.limits.maxObjectFields,
      MAX_QUERY_PARAMS: this.config.limits.maxQueryParams,
      MAX_RECURSION_DEPTH: this.config.limits.maxRecursionDepth,

      // API Key相关长度 - 来源于 limits 配置层
      API_KEY_MIN_LENGTH: 32, // 固定安全标准
      API_KEY_MAX_LENGTH: 64, // 固定安全标准
      API_KEY_DEFAULT_LENGTH: this.config.limits.apiKeyLength,
      API_KEY_NAME_MIN_LENGTH: 1, // 固定业务规则
      API_KEY_NAME_MAX_LENGTH: 100, // 固定业务规则

      // 用户相关长度 - 来源于 limits 配置层
      PASSWORD_MIN_LENGTH: this.config.limits.passwordMinLength,
      PASSWORD_MAX_LENGTH: this.config.limits.passwordMaxLength,
      USERNAME_MIN_LENGTH: 3, // 固定业务规则
      USERNAME_MAX_LENGTH: 20, // 固定业务规则
      EMAIL_MAX_LENGTH: VALIDATION_LIMITS.EMAIL_MAX_LENGTH, // 使用通用常量，保持一致性

      // 其他长度限制
      MIN_NAME_LENGTH: 1, // 固定业务规则
      MAX_NAME_LENGTH: 100, // 固定业务规则
      MAX_DESCRIPTION_LENGTH: 500, // 固定业务规则
    };
  }

  /**
   * 用户注册常量兼容接口
   * 映射用户注册相关的验证参数
   *
   * 原始位置：src/auth/constants/user-operations.constants.ts
   */
  get USER_REGISTRATION() {
    return {
      // 长度限制 - 来源于 limits 配置层
      USERNAME_MIN_LENGTH: this.VALIDATION_LIMITS.USERNAME_MIN_LENGTH,
      USERNAME_MAX_LENGTH: this.VALIDATION_LIMITS.USERNAME_MAX_LENGTH,
      PASSWORD_MIN_LENGTH: this.VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
      PASSWORD_MAX_LENGTH: this.VALIDATION_LIMITS.PASSWORD_MAX_LENGTH,
      EMAIL_MAX_LENGTH: this.VALIDATION_LIMITS.EMAIL_MAX_LENGTH,

      // 验证正则表达式 - 固定业务规则（直接引用原常量）
      PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
      USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
      EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

      // 保留用户名列表 - 固定业务规则（直接引用原常量）
      RESERVED_USERNAMES: [
        "admin",
        "root",
        "system",
        "api",
        "user",
        "test",
        "null",
        "undefined",
      ],
    };
  }

  /**
   * 用户登录常量兼容接口
   * 映射登录相关的安全参数
   *
   * 原始位置：src/auth/constants/user-operations.constants.ts
   */
  get USER_LOGIN() {
    return {
      // 安全限制 - 来源于 limits 配置层
      MAX_ATTEMPTS: this.config.limits.maxLoginAttempts,
      LOCKOUT_MINUTES: this.config.limits.loginLockoutMinutes,

      // 会话时间 - 基于配置计算
      SESSION_HOURS: Math.floor(this.config.cache.sessionCacheTtl / 3600), // 从秒转换为小时
      TOKEN_REFRESH_HOURS: Math.floor(
        (this.config.cache.sessionCacheTtl / 3600) * 7,
      ), // 7倍会话时间
    };
  }

  /**
   * 会话配置常量兼容接口
   * 映射会话管理相关参数
   *
   * 原始位置：src/auth/constants/user-operations.constants.ts
   */
  get SESSION_CONFIG() {
    return {
      // 会话时间配置 - 来源于配置层
      ACCESS_TOKEN_HOURS: Math.floor(this.config.cache.sessionCacheTtl / 3600), // 从秒转换为小时
      REFRESH_TOKEN_DAYS: Math.floor(
        (this.config.cache.sessionCacheTtl / 86400) * 7,
      ), // 7倍会话时间，转为天
      SESSION_TIMEOUT_MINUTES: this.config.limits.sessionTimeoutMinutes,
      REMEMBER_ME_DAYS: Math.floor(
        (this.config.cache.sessionCacheTtl / 86400) * 30,
      ), // 30倍会话时间

      // 并发限制 - 来源于 limits 配置层
      MAX_CONCURRENT: this.config.limits.maxConcurrentSessions,
    };
  }

  /**
   * 频率限制常量兼容接口
   * 映射频率限制相关参数
   *
   * 原始位置：src/auth/constants/rate-limiting.constants.ts
   */
  get RATE_LIMITS() {
    return {
      // 全局限制 - 来源于 limits 配置层
      TTL_SECONDS: this.config.cache.rateLimitTtl,
      LIMIT_PER_MINUTE: this.config.limits.globalRateLimit,

      // 认证操作限制 - 基于配置计算
      LOGIN_PER_MINUTE: this.config.limits.loginRatePerMinute,
      LOGIN_PER_HOUR: this.config.limits.loginRatePerMinute * 60,
      LOGIN_LOCKOUT_MINUTES: this.config.limits.loginLockoutMinutes,

      // 其他操作限制 - 保持合理默认值
      REGISTER_PER_MINUTE: 2, // 固定安全值
      REGISTER_PER_HOUR: 10, // 固定安全值
      PASSWORD_RESET_PER_MINUTE: 1, // 固定安全值
      PASSWORD_RESET_PER_HOUR: 5, // 固定安全值

      // Redis配置 - 来源于 limits 配置层
      REDIS_TTL_SECONDS: this.config.cache.rateLimitTtl,
      CONNECTION_TIMEOUT_MS: this.config.limits.redisConnectionTimeout,
      COMMAND_TIMEOUT_MS: this.config.limits.redisCommandTimeout,
    };
  }

  /**
   * 安全配置常量兼容接口
   * 映射security.config.ts中的配置
   *
   * 原始位置：src/auth/config/security.config.ts
   */
  get SECURITY_CONFIG() {
    return {
      // 密码策略 - 来源于 limits 配置层
      passwordPolicy: {
        minLength: this.config.limits.passwordMinLength,
        maxLength: this.config.limits.passwordMaxLength,
        requireUppercase: false, // 固定策略
        requireLowercase: false, // 固定策略
        requireNumbers: true, // 固定策略
        requireSpecialChars: false, // 固定策略
        maxAgeDays: 90, // 固定策略
      },

      // 会话配置 - 来源于配置层
      session: {
        jwtDefaultExpiry: `${Math.floor(this.config.cache.sessionCacheTtl / 60)}m`, // 转换为分钟格式
        refreshTokenDefaultExpiry: `${Math.floor((this.config.cache.sessionCacheTtl / 86400) * 7)}d`, // 转换为天格式
        maxConcurrent: this.config.limits.maxConcurrentSessions,
        sessionTimeout: this.config.limits.sessionTimeoutMinutes,
      },

      // 权限配置 - 来源于 cache 配置层
      permission: {
        cachePrefix: "perm", // 固定前缀
        cacheTtlSeconds: this.config.cache.permissionCacheTtl,
      },

      // 安全限制 - 来源于 limits 配置层
      security: {
        maxLoginAttempts: this.config.limits.maxLoginAttempts,
        loginLockoutDuration: this.config.limits.loginLockoutMinutes * 60, // 转换为秒
        passwordMinLength: this.config.limits.passwordMinLength,
        requirePasswordComplexity: false, // 固定策略
        maxApiKeysPerUser: this.config.limits.maxApiKeysPerUser,
      },
    };
  }

  /**
   * 获取配置摘要信息
   * 用于调试和监控，不包含敏感信息
   */
  getConfigSummary() {
    return {
      cacheConfig: {
        permissionTtl: this.config.cache.permissionCacheTtl,
        apiKeyTtl: this.config.cache.apiKeyCacheTtl,
        rateLimitTtl: this.config.cache.rateLimitTtl,
      },
      limitsConfig: {
        globalRateLimit: this.config.limits.globalRateLimit,
        maxStringLength: this.config.limits.maxStringLength,
        timeoutMs: this.config.limits.timeoutMs,
        maxApiKeysPerUser: this.config.limits.maxApiKeysPerUser,
      },
      compatibility: {
        wrappedConstants: [
          "API_KEY_OPERATIONS",
          "PERMISSION_CHECK",
          "VALIDATION_LIMITS",
          "USER_REGISTRATION",
          "USER_LOGIN",
          "SESSION_CONFIG",
          "RATE_LIMITS",
          "SECURITY_CONFIG",
        ],
        wrapperVersion: "1.0.0",
        configSource: "unified",
      },
    };
  }

  /**
   * 验证兼容性包装器的完整性
   * 确保所有必要的常量都已正确映射
   */
  validateCompatibility(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // 验证关键常量可访问性
      const apiKeyOps = this.API_KEY_OPERATIONS;
      if (!apiKeyOps.CACHE_TTL_SECONDS || apiKeyOps.CACHE_TTL_SECONDS <= 0) {
        errors.push("API_KEY_OPERATIONS.CACHE_TTL_SECONDS 无效");
      }

      const permissionCheck = this.PERMISSION_CHECK;
      if (
        !permissionCheck.CHECK_TIMEOUT_MS ||
        permissionCheck.CHECK_TIMEOUT_MS <= 0
      ) {
        errors.push("PERMISSION_CHECK.CHECK_TIMEOUT_MS 无效");
      }

      const validationLimits = this.VALIDATION_LIMITS;
      if (
        !validationLimits.MAX_STRING_LENGTH ||
        validationLimits.MAX_STRING_LENGTH <= 0
      ) {
        errors.push("VALIDATION_LIMITS.MAX_STRING_LENGTH 无效");
      }

      const userLogin = this.USER_LOGIN;
      if (!userLogin.MAX_ATTEMPTS || userLogin.MAX_ATTEMPTS <= 0) {
        errors.push("USER_LOGIN.MAX_ATTEMPTS 无效");
      }

      const userRegistration = this.USER_REGISTRATION;
      if (
        !userRegistration.PASSWORD_MIN_LENGTH ||
        userRegistration.PASSWORD_MIN_LENGTH <= 0
      ) {
        errors.push("USER_REGISTRATION.PASSWORD_MIN_LENGTH 无效");
      }
    } catch (error) {
      errors.push(`兼容性验证异常: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
