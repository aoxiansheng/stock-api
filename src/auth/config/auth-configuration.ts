import { registerAs } from "@nestjs/config";

/**
 * Auth模块统一配置
 * 遵循NestJS ConfigService最佳实践
 *
 * @description
 * 统一管理认证和安全相关的配置项，支持环境变量覆盖
 * 替代原有的SECURITY_LIMITS和RATE_LIMIT_CONFIG常量
 */
const authConfig = registerAs("auth", () => ({
  /**
   * 安全限制配置
   * 原SECURITY_LIMITS的替代
   */
  security: {
    // 负载大小限制
    maxPayloadSizeString: process.env.AUTH_MAX_PAYLOAD_SIZE || "10MB",
    maxPayloadSizeBytes: parseInt(
      process.env.AUTH_MAX_PAYLOAD_BYTES || "10485760",
    ),

    // 字符串长度限制
    maxStringLengthSanitize: parseInt(
      process.env.AUTH_MAX_STRING_LENGTH_SANITIZE || "10000",
    ),
    maxStringLengthComplexity: parseInt(
      process.env.AUTH_MAX_STRING_LENGTH_COMPLEXITY || "1000",
    ),
    findLongStringThreshold: parseInt(
      process.env.AUTH_FIND_LONG_STRING_THRESHOLD || "1000",
    ),

    // 对象复杂度限制
    maxObjectDepthComplexity: parseInt(
      process.env.AUTH_MAX_OBJECT_DEPTH || "10",
    ),
    maxObjectFieldsComplexity: parseInt(
      process.env.AUTH_MAX_OBJECT_FIELDS || "50",
    ),

    // 查询参数限制
    maxQueryParams: parseInt(process.env.AUTH_MAX_QUERY_PARAMS || "100"),
    maxRecursionDepth: parseInt(process.env.AUTH_MAX_RECURSION_DEPTH || "100"),
  },

  /**
   * 频率限制配置
   * 原RATE_LIMIT_CONFIG的替代
   */
  rateLimit: {
    // 全局限制
    globalThrottle: {
      ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || "60000"), // 60秒
      limit: parseInt(process.env.AUTH_RATE_LIMIT_LIMIT || "100"), // 100次
    },

    // Redis配置
    redis: {
      maxRetries: parseInt(process.env.AUTH_REDIS_MAX_RETRIES || "3"),
      connectionTimeout: parseInt(
        process.env.AUTH_REDIS_CONNECTION_TIMEOUT || "5000",
      ),
      commandTimeout: parseInt(
        process.env.AUTH_REDIS_COMMAND_TIMEOUT || "5000",
      ),
    },

    // IP限制（内部配置）
    ipRateLimit: {
      enabled: process.env.AUTH_IP_RATE_LIMIT_ENABLED === "true" || true,
      maxRequests: parseInt(
        process.env.AUTH_IP_RATE_LIMIT_MAX_REQUESTS || "100",
      ),
      windowMs: parseInt(process.env.AUTH_IP_RATE_LIMIT_WINDOW_MS || "60000"),
    },
  },

  /**
   * 频率限制策略枚举
   */
  strategies: {
    fixedWindow: "fixed_window" as const,
    slidingWindow: "sliding_window" as const,
    tokenBucket: "token_bucket" as const,
    leakyBucket: "leaky_bucket" as const,
  },
}));

export default authConfig;

/**
 * 配置类型定义
 * 提供类型安全的配置访问
 */
export type AuthConfigType = ReturnType<typeof authConfig>;

/**
 * 安全配置类型
 */
export type SecurityConfigType = AuthConfigType["security"];

/**
 * 频率限制配置类型
 */
export type RateLimitConfigType = AuthConfigType["rateLimit"];
