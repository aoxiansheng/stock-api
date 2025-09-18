import { registerAs } from "@nestjs/config";
import { IsNumber, IsString, Min, Max, validateSync } from "class-validator";

/**
 * Auth限制配置验证类
 * 统一管理所有数值限制、阈值、超时等可配置参数，消除配置重叠问题
 *
 * @description
 * 替代原有分散在多个文件中的数值配置：
 * - auth-configuration.ts - 各种限制参数
 * - rate-limiting.constants.ts - 频率限制数值
 * - validation-limits.constants.ts - 验证限制数值
 * - api-security.constants.ts - API相关数值限制
 */
export class AuthLimitsConfigValidation {
  // ==================== 频率限制配置 ====================

  /**
   * 全局频率限制（每分钟请求数）
   * 统一所有频率限制的基础值
   */
  @IsNumber()
  @Min(10, { message: "全局频率限制不能少于10次/分钟" })
  @Max(10000, { message: "全局频率限制不能超过10000次/分钟" })
  globalRateLimit: number = parseInt(process.env.AUTH_RATE_LIMIT || "100");

  /**
   * API Key验证频率限制（每秒）
   * API Key验证操作的频率限制
   */
  @IsNumber()
  @Min(10, { message: "API Key验证频率不能少于10次/秒" })
  @Max(1000, { message: "API Key验证频率不能超过1000次/秒" })
  apiKeyValidatePerSecond: number = parseInt(
    process.env.AUTH_API_KEY_VALIDATE_RATE || "100",
  );

  /**
   * 登录频率限制（每分钟）
   * 用户登录尝试的频率限制
   */
  @IsNumber()
  @Min(1, { message: "登录频率限制不能少于1次/分钟" })
  @Max(20, { message: "登录频率限制不能超过20次/分钟" })
  loginRatePerMinute: number = parseInt(
    process.env.AUTH_LOGIN_RATE_LIMIT || "5",
  );

  // ==================== 字符串和数据长度限制 ====================

  /**
   * 最大字符串长度限制
   * 统一所有字符串长度验证的上限
   */
  @IsNumber()
  @Min(1000, { message: "字符串长度限制不能少于1000" })
  @Max(100000, { message: "字符串长度限制不能超过100000" })
  maxStringLength: number = parseInt(process.env.AUTH_STRING_LIMIT || "10000");

  /**
   * 最大负载大小（字节）
   * HTTP请求负载的最大大小限制
   */
  @IsNumber()
  @Min(1048576, { message: "负载大小不能少于1MB" }) // 1MB
  @Max(52428800, { message: "负载大小不能超过50MB" }) // 50MB
  maxPayloadSizeBytes: number = parseInt(
    process.env.AUTH_MAX_PAYLOAD_BYTES || "10485760",
  ); // 10MB

  /**
   * 最大负载大小（字符串表示）
   * HTTP请求负载的最大大小（字符串格式）
   */
  @IsString()
  maxPayloadSizeString: string = process.env.AUTH_MAX_PAYLOAD_SIZE || "10MB";

  // ==================== 超时配置 ====================

  /**
   * 通用操作超时时间（毫秒）
   * 权限检查、API验证等操作的超时时间
   */
  @IsNumber()
  @Min(1000, { message: "超时时间不能少于1000毫秒" })
  @Max(30000, { message: "超时时间不能超过30000毫秒" })
  timeoutMs: number = parseInt(process.env.AUTH_TIMEOUT || "5000");

  /**
   * Redis连接超时时间（毫秒）
   * Redis连接操作的超时时间
   */
  @IsNumber()
  @Min(1000, { message: "Redis连接超时不能少于1000毫秒" })
  @Max(30000, { message: "Redis连接超时不能超过30000毫秒" })
  redisConnectionTimeout: number = parseInt(
    process.env.AUTH_REDIS_CONNECTION_TIMEOUT || "5000",
  );

  /**
   * Redis命令超时时间（毫秒）
   * Redis命令执行的超时时间
   */
  @IsNumber()
  @Min(1000, { message: "Redis命令超时不能少于1000毫秒" })
  @Max(15000, { message: "Redis命令超时不能超过15000毫秒" })
  redisCommandTimeout: number = parseInt(
    process.env.AUTH_REDIS_COMMAND_TIMEOUT || "5000",
  );

  // ==================== API Key相关限制 ====================

  /**
   * API Key长度
   * 生成的API Key的标准长度
   */
  @IsNumber()
  @Min(32, { message: "API Key长度不能少于32位" })
  @Max(64, { message: "API Key长度不能超过64位" })
  apiKeyLength: number = parseInt(process.env.AUTH_API_KEY_LENGTH || "32");

  /**
   * 每用户最大API Key数量
   * 单个用户可创建的API Key上限
   */
  @IsNumber()
  @Min(1, { message: "每用户API Key数量不能少于1个" })
  @Max(1000, { message: "每用户API Key数量不能超过1000个" })
  maxApiKeysPerUser: number = parseInt(
    process.env.AUTH_MAX_API_KEYS_PER_USER || "50",
  );

  /**
   * API Key创建频率限制（每天）
   * 用户每天可创建的API Key数量限制
   */
  @IsNumber()
  @Min(1, { message: "API Key创建频率不能少于1个/天" })
  @Max(100, { message: "API Key创建频率不能超过100个/天" })
  apiKeyCreatePerDay: number = parseInt(
    process.env.AUTH_API_KEY_CREATE_LIMIT || "10",
  );

  // ==================== 对象复杂度限制 ====================

  /**
   * 最大对象深度
   * JSON对象嵌套的最大深度限制
   */
  @IsNumber()
  @Min(5, { message: "对象深度不能少于5层" })
  @Max(100, { message: "对象深度不能超过100层" })
  maxObjectDepth: number = parseInt(process.env.AUTH_MAX_OBJECT_DEPTH || "10");

  /**
   * 最大对象字段数
   * JSON对象包含的最大字段数量
   */
  @IsNumber()
  @Min(10, { message: "对象字段数不能少于10个" })
  @Max(100000, { message: "对象字段数不能超过100000个" })
  maxObjectFields: number = parseInt(
    process.env.AUTH_MAX_OBJECT_FIELDS || "50",
  );

  /**
   * 最大查询参数数量
   * HTTP请求查询参数的数量限制
   */
  @IsNumber()
  @Min(10, { message: "查询参数数量不能少于10个" })
  @Max(1000, { message: "查询参数数量不能超过1000个" })
  maxQueryParams: number = parseInt(process.env.AUTH_MAX_QUERY_PARAMS || "100");

  /**
   * 最大递归深度
   * 函数调用或数据处理的递归深度限制
   */
  @IsNumber()
  @Min(10, { message: "递归深度不能少于10层" })
  @Max(1000, { message: "递归深度不能超过1000层" })
  maxRecursionDepth: number = parseInt(
    process.env.AUTH_MAX_RECURSION_DEPTH || "100",
  );

  // ==================== 安全相关限制 ====================

  /**
   * 最大登录尝试次数
   * 用户连续登录失败的最大次数
   */
  @IsNumber()
  @Min(3, { message: "最大登录尝试次数不能少于3次" })
  @Max(20, { message: "最大登录尝试次数不能超过20次" })
  maxLoginAttempts: number = parseInt(
    process.env.AUTH_MAX_LOGIN_ATTEMPTS || "5",
  );

  /**
   * 登录锁定时长（分钟）
   * 登录失败后的锁定时间
   */
  @IsNumber()
  @Min(5, { message: "登录锁定时长不能少于5分钟" })
  @Max(1440, { message: "登录锁定时长不能超过1440分钟（24小时）" })
  loginLockoutMinutes: number = parseInt(
    process.env.AUTH_LOGIN_LOCKOUT_MINUTES || "15",
  );

  /**
   * 密码最小长度
   * 用户密码的最小长度要求
   */
  @IsNumber()
  @Min(6, { message: "密码最小长度不能少于6位" })
  @Max(32, { message: "密码最小长度不能超过32位" })
  passwordMinLength: number = parseInt(
    process.env.AUTH_PASSWORD_MIN_LENGTH || "8",
  );

  /**
   * 密码最大长度
   * 用户密码的最大长度限制
   */
  @IsNumber()
  @Min(64, { message: "密码最大长度不能少于64位" })
  @Max(512, { message: "密码最大长度不能超过512位" })
  passwordMaxLength: number = parseInt(
    process.env.AUTH_PASSWORD_MAX_LENGTH || "128",
  );

  /**
   * Bcrypt加密盐值轮数
   * 密码哈希加密的安全强度配置
   */
  @IsNumber()
  @Min(10, { message: "Bcrypt盐值轮数不能少于10轮" })
  @Max(15, { message: "Bcrypt盐值轮数不能超过15轮" })
  bcryptSaltRounds: number = parseInt(
    process.env.AUTH_BCRYPT_SALT_ROUNDS || "12",
  );

  // ==================== 会话管理限制 ====================

  /**
   * 最大并发会话数
   * 单用户同时活跃的最大会话数量
   */
  @IsNumber()
  @Min(1, { message: "最大并发会话数不能少于1个" })
  @Max(50, { message: "最大并发会话数不能超过50个" })
  maxConcurrentSessions: number = parseInt(
    process.env.AUTH_MAX_CONCURRENT_SESSIONS || "5",
  );

  /**
   * 会话超时时间（分钟）
   * 会话非活跃状态的超时时间
   */
  @IsNumber()
  @Min(5, { message: "会话超时时间不能少于5分钟" })
  @Max(1440, { message: "会话超时时间不能超过1440分钟（24小时）" })
  sessionTimeoutMinutes: number = parseInt(
    process.env.AUTH_SESSION_TIMEOUT_MINUTES || "60",
  );
}

/**
 * 限制配置创建函数
 * 创建并验证限制配置实例
 */
const createAuthLimitsConfig = (): AuthLimitsConfigValidation => {
  const config = new AuthLimitsConfigValidation();
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");

    throw new Error(
      `Auth Limits configuration validation failed: ${errorMessages}`,
    );
  }

  return config;
};

/**
 * Auth限制配置注册
 * 使用NestJS ConfigService标准模式
 */
const authLimitsConfig = registerAs("authLimits", createAuthLimitsConfig);

/**
 * 配置类型导出
 * 提供类型安全的配置访问
 */
export type AuthLimitsConfigType = ReturnType<typeof authLimitsConfig>;

// 导出配置注册函数和默认导出
export { authLimitsConfig };
export default authLimitsConfig;
