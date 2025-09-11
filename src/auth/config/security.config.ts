/**
 * 集中化的安全配置
 *
 * 用于定义和管理整个应用的安全策略和参数，
 * 以便审计和修改。
 */
export const securityConfig = {
  passwordPolicy: {
    minLength: 8,                   // 8位 - 密码最小长度
    maxLength: 128,                 // 128位 - 密码最大长度
    requireUppercase: false,        // false - 不强制要求大写
    requireLowercase: false,        // false - 不强制要求小写
    requireNumbers: true,           // true - 强制要求数字
    requireSpecialChars: false,     // false - 不强制要求特殊字符
    maxAgeDays: 90,                 // 90天 - 密码最大有效期
  },
  session: {
    jwtDefaultExpiry: "15m",            // 15分钟 - JWT默认过期时间
    refreshTokenDefaultExpiry: "7d",    // 7天 - 刷新令牌默认过期时间
    maxConcurrent: 5,                   // 5个 - 最大并发会话数
  },
  rateLimit: {
    enabled: true,                      // true - 启用限流
    redisPrefix: "rate_limit",          // Redis键前缀
    luaExpireBufferSeconds: 10,         // 10秒 - Lua脚本过期缓冲时间
    // 压力测试环境变量支持
    performanceTestMode: false,         // false - 性能测试模式
    multiplier: 1,                      // 1倍 - 性能倍数
  },
  api: {
    ipWhitelist: false,                 // false - IP白名单功能
    cors: true,                         // true - 跨域资源共享
  },
  data: {
    bcryptSaltRounds: 12,               // 12轮 - bcrypt加密轮数
    masking: true,                      // true - 数据脱敏
  },
  permission: {
    cachePrefix: "perm",                // 权限缓存前缀
    cacheTtlSeconds: 300,               // 300秒 - 权限缓存TTL (5分钟)
  },
  security: {
    maxLoginAttempts: 5,                // 5次 - 最大登录尝试次数
    loginLockoutDuration: 300,          // 300秒 - 登录锁定时长 (5分钟)
    passwordMinLength: 8,               // 8位 - 密码最小长度
    requirePasswordComplexity: false,   // false - 密码复杂性要求
    maxApiKeysPerUser: 10,              // 10个 - 用户最大API密钥数
  },
  audit: {
    eventBufferKey: "security:event_buffer",       // 安全事件缓冲键
    suspiciousIpSetKey: "security:suspicious_ips", // 可疑IP集合键
    ipAnalysisHashPrefix: "security:ip_analysis:", // IP分析哈希前缀
    flushInterval: 30000,                          // 30000ms - 刷新间隔 (30秒)
    analysisInterval: 60000,                       // 60000ms - 分析间隔 (1分钟)
    cleanupInterval: 3600000,                      // 3600000ms - 清理间隔 (1小时)
    eventBufferMaxSize: 1000,                      // 1000个 - 事件缓冲最大大小
    ipAnalysisTtlSeconds: 604800,                  // 604800秒 - IP分析TTL (7天)
    highFailureCountThreshold: 10,                 // 10次 - 高失败次数阈值
    highFailureRateThreshold: 0.5,                 // 0.5 - 高失败率阈值 (50%)
  },
};
