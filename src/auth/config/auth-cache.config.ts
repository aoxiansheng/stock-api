import { registerAs } from "@nestjs/config";
import { IsNumber, IsString, Min, Max, validateSync } from "class-validator";

/**
 * Auth缓存配置验证类
 * 统一管理所有缓存相关的TTL配置，消除配置重叠问题
 *
 * @description
 * 替代原有分散在多个文件中的TTL配置：
 * - security.config.ts:40 - permission.cacheTtlSeconds: 300
 * - permission-control.constants.ts:8 - PERMISSION_CHECK.CACHE_TTL_SECONDS: 300
 * - api-security.constants.ts:26 - API_KEY_OPERATIONS.CACHE_TTL_SECONDS: 300
 */
export class AuthCacheConfigValidation {
  /**
   * 权限检查缓存TTL（秒）
   * 统一所有权限相关的缓存时间
   */
  @IsNumber()
  @Min(60, { message: "权限缓存TTL不能少于60秒" })
  @Max(3600, { message: "权限缓存TTL不能超过3600秒" })
  permissionCacheTtl: number = parseInt(
    process.env.AUTH_PERMISSION_CACHE_TTL || "300",
  );

  /**
   * API Key验证缓存TTL（秒）
   * 统一API Key验证结果的缓存时间
   */
  @IsNumber()
  @Min(60, { message: "API Key缓存TTL不能少于60秒" })
  @Max(7200, { message: "API Key缓存TTL不能超过7200秒" })
  apiKeyCacheTtl: number = parseInt(
    process.env.AUTH_API_KEY_CACHE_TTL || "300",
  );

  /**
   * 频率限制缓存TTL（秒）
   * 用于频率限制记录的缓存时间
   */
  @IsNumber()
  @Min(30, { message: "频率限制缓存TTL不能少于30秒" })
  @Max(600, { message: "频率限制缓存TTL不能超过600秒" })
  rateLimitTtl: number = parseInt(process.env.AUTH_RATE_LIMIT_TTL || "60");

  /**
   * 统计信息缓存TTL（秒）
   * 用于API使用统计的缓存时间
   */
  @IsNumber()
  @Min(60, { message: "统计缓存TTL不能少于60秒" })
  @Max(1800, { message: "统计缓存TTL不能超过1800秒" })
  statisticsCacheTtl: number = parseInt(
    process.env.AUTH_STATISTICS_CACHE_TTL || "300",
  );

  /**
   * 会话缓存TTL（秒）
   * 用于会话信息的缓存时间
   */
  @IsNumber()
  @Min(300, { message: "会话缓存TTL不能少于300秒" })
  @Max(86400, { message: "会话缓存TTL不能超过86400秒" })
  sessionCacheTtl: number = parseInt(
    process.env.AUTH_SESSION_CACHE_TTL || "3600",
  );

  /**
   * JWT访问令牌默认过期时间
   * JWT令牌的默认有效期设置
   */
  @IsString()
  jwtDefaultExpiry: string = process.env.AUTH_JWT_DEFAULT_EXPIRY || "15m";

  /**
   * 刷新令牌默认过期时间
   * 刷新令牌的默认有效期设置
   */
  @IsString()
  refreshTokenDefaultExpiry: string = process.env.AUTH_REFRESH_TOKEN_DEFAULT_EXPIRY || "7d";
}

/**
 * 缓存配置创建函数
 * 创建并验证缓存配置实例
 */
const createAuthCacheConfig = (): AuthCacheConfigValidation => {
  const config = new AuthCacheConfigValidation();
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");

    throw new Error(
      `Auth Cache configuration validation failed: ${errorMessages}`,
    );
  }

  return config;
};

/**
 * Auth缓存配置注册
 * 使用NestJS ConfigService标准模式
 */
const authCacheConfig = registerAs("authCache", createAuthCacheConfig);

/**
 * 配置类型导出
 * 提供类型安全的配置访问
 */
export type AuthCacheConfigType = ReturnType<typeof authCacheConfig>;

// 导出配置注册函数和默认导出
export { authCacheConfig };
export default authCacheConfig;
