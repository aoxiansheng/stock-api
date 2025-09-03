import { RATE_LIMIT_CONFIG } from "@common/constants/rate-limit.constants";
import { AUTH_CONFIG } from "../constants/auth.constants";

/**
 * 集中化的安全配置
 *
 * 用于定义和管理整个应用的安全策略和参数，
 * 以便审计和修改。
 */
export const securityConfig = {
  passwordPolicy: {
    minLength: AUTH_CONFIG.MIN_PASSWORD_LENGTH,
    maxLength: AUTH_CONFIG.MAX_PASSWORD_LENGTH,
    requireUppercase: false, // 修正：根据新的密码策略，不强制要求大写
    requireLowercase: false, // 修正：根据新的密码策略，不强制要求小写
    requireNumbers: true,
    requireSpecialChars: false, // 修正：根据新的密码策略，不强制要求特殊字符
    maxAgeDays: 90,
  },
  session: {
    jwtDefaultExpiry: "15m",
    refreshTokenDefaultExpiry: "7d",
    maxConcurrent: 5,
  },
  rateLimit: {
    enabled: true, // 原 api.rateLimit
    redisPrefix: "rate_limit",
    luaExpireBufferSeconds: RATE_LIMIT_CONFIG.REDIS.EXPIRE_BUFFER_SECONDS,
    // 压力测试环境变量支持
    performanceTestMode: RATE_LIMIT_CONFIG.PERFORMANCE.TEST_MODE,
    multiplier: RATE_LIMIT_CONFIG.PERFORMANCE.MULTIPLIER,
  },
  api: {
    ipWhitelist: false,
    cors: true,
  },
  data: {
    bcryptSaltRounds: 12,
    masking: true,
  },
  permission: {
    cachePrefix: "perm",
    cacheTtlSeconds: 5 * 60, // 5 minutes
  },
  audit: {
    eventBufferKey: "security:event_buffer",
    suspiciousIpSetKey: "security:suspicious_ips",
    ipAnalysisHashPrefix: "security:ip_analysis:",
    flushInterval: 30 * 1000, // 30 seconds
    analysisInterval: 60 * 1000, // 1 minute
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    eventBufferMaxSize: 1000,
    ipAnalysisTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    highFailureCountThreshold: 10,
    highFailureRateThreshold: 0.5,
  },
};
