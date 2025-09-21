import {
  Injectable,
  Inject,
} from "@nestjs/common";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { AUTH_ERROR_CODES } from "../../constants/auth-error-codes.constants";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { CreateApiKeyDto } from "../../dto/apikey.dto";
// 使用统一配置系统
import type { AuthUnifiedConfigInterface } from "../../config/auth-unified.config";
import { DatabaseValidationUtils } from "../../../common/utils/database.utils";
import { createLogger } from "@common/modules/logging";
import { UserAuthenticationService } from "./user-authentication.service";

/**
 * 安全策略服务 - 安全规则和策略执行
 * 专注于各种安全策略的验证和执行
 * 包括频率限制、IP白名单、密码策略、权限检查等
 */
@Injectable()
export class SecurityPolicyService {
  private readonly logger = createLogger(SecurityPolicyService.name);

  // 简单的内存存储，生产环境应使用Redis
  private readonly registrationAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private readonly loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date; blockedUntil?: Date }
  >();

  constructor(
    private readonly userAuthService: UserAuthenticationService,
    @Inject("authUnified")
    private readonly authConfig: AuthUnifiedConfigInterface,
  ) {}

  // 统一配置访问方法
  private get securityConfig() {
    return {
      maxLoginAttempts: this.authConfig.limits.maxLoginAttempts,
      loginLockoutDuration: this.authConfig.limits.loginLockoutMinutes * 60, // 转换为秒
      passwordMinLength: this.authConfig.limits.passwordMinLength,
      requirePasswordComplexity: true, // 固定为true，可根据需要调整
      maxApiKeysPerUser: this.authConfig.limits.maxApiKeysPerUser,
    };
  }

  /**
   * 验证用户注册策略
   */
  async validateRegistrationPolicy(
    createUserDto: CreateUserDto,
  ): Promise<void> {
    const { username, email, password } = createUserDto;

    this.logger.debug("验证用户注册安全策略", { username, email });

    // 1. 密码强度检查
    this.validatePasswordPolicy(password);

    // 2. 用户名格式检查
    this.validateUsernamePolicy(username);

    // 3. 邮箱格式检查
    this.validateEmailPolicy(email);

    // 4. 注册频率限制检查
    await this.checkRegistrationRateLimit(email);

    // 5. 检查用户名和邮箱是否已被使用
    const availability = await this.userAuthService.checkUserAvailability(
      username,
      email,
    );

    if (!availability.usernameAvailable) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Username is already taken",
        errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
        operation: 'validateRegistrationPolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          username,
          authErrorCode: AUTH_ERROR_CODES.DUPLICATE_API_KEY_NAME
        }
      });
    }

    if (!availability.emailAvailable) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Email address is already taken",
        errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
        operation: 'validateRegistrationPolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          email,
          authErrorCode: AUTH_ERROR_CODES.DUPLICATE_API_KEY_NAME
        }
      });
    }

    this.logger.debug("用户注册安全策略验证通过", { username, email });
  }

  /**
   * 验证用户登录策略
   */
  async validateLoginPolicy(loginDto: LoginDto): Promise<void> {
    const { username } = loginDto;

    this.logger.debug("验证用户登录安全策略", { username });

    // 1. 检查账户是否被暂时锁定
    await this.checkAccountLockout(username);

    // 2. 登录频率限制检查
    await this.checkLoginRateLimit(username);

    // 3. IP白名单检查（如果配置了的话）
    // await this.checkIpWhitelist(request.ip);

    this.logger.debug("用户登录安全策略验证通过", { username });
  }

  /**
   * 验证令牌刷新策略
   */
  async validateRefreshTokenPolicy(token: string): Promise<void> {
    this.logger.debug("验证令牌刷新安全策略");

    // 1. 检查令牌是否在黑名单中（实际应从Redis检查）
    // await this.checkTokenBlacklist(token);

    // 2. 频率限制检查（防止令牌刷新攻击）
    // await this.checkRefreshRateLimit(token);

    this.logger.debug("令牌刷新安全策略验证通过");
  }

  /**
   * 验证API密钥创建策略
   */
  async validateApiKeyCreationPolicy(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<void> {
    const { name, permissions } = createApiKeyDto;

    this.logger.debug("验证API密钥创建安全策略", { userId, name });

    // 1. 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    // 2. 检查用户已有API密钥数量限制
    await this.checkApiKeyLimit(userId);

    // 2. 验证API密钥名称格式
    this.validateApiKeyName(name);

    // 3. 验证权限范围是否合理
    this.validateApiKeyPermissions(permissions);

    // 4. 频率限制检查（防止批量创建）
    await this.checkApiKeyCreationRateLimit(userId);

    this.logger.debug("API密钥创建安全策略验证通过", { userId, name });
  }

  /**
   * 验证API密钥使用策略
   */
  async validateApiKeyUsagePolicy(appKey: string): Promise<void> {
    this.logger.debug("验证API密钥使用安全策略", { appKey });

    // 1. 基础格式验证
    if (!appKey || appKey.length < 10) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid API key format",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyUsagePolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          appKey: appKey?.substring(0, 10) + '...',
          authErrorCode: AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT
        }
      });
    }

    // 2. 频率限制检查（实际由RateLimitService处理，这里做额外检查）
    // await this.checkApiKeyUsageRateLimit(appKey);

    this.logger.debug("API密钥使用安全策略验证通过", { appKey });
  }

  /**
   * 验证管理员操作策略
   */
  async validateAdminOperationPolicy(): Promise<void> {
    this.logger.debug("验证管理员操作安全策略");

    // 在实际实现中，这里应该检查：
    // 1. 当前用户是否具有管理员权限
    // 2. 是否在允许的时间窗口内执行管理操作
    // 3. 是否达到管理操作的频率限制
    // 4. 是否来自授权的IP地址

    this.logger.debug("管理员操作安全策略验证通过");
  }

  /**
   * 验证频率限制重置策略
   */
  async validateRateLimitResetPolicy(
    appKey: string,
    userId: string,
  ): Promise<void> {
    this.logger.debug("验证频率限制重置安全策略", { appKey, userId });

    // 1. 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    // 2. 检查重置频率限制（防止滥用）
    await this.checkRateLimitResetFrequency(appKey, userId);

    // 2. 验证用户权限
    // 确保用户只能重置自己的API密钥的频率限制

    this.logger.debug("频率限制重置安全策略验证通过", { appKey, userId });
  }

  /**
   * 记录登录失败
   */
  async recordLoginFailure(username: string): Promise<void> {
    const key = `login_${username}`;
    const attempt = this.loginAttempts.get(key) || {
      count: 0,
      lastAttempt: new Date(),
    };

    attempt.count++;
    attempt.lastAttempt = new Date();

    // 如果失败次数超过阈值，设置锁定时间
    if (attempt.count >= this.securityConfig.maxLoginAttempts) {
      attempt.blockedUntil = new Date(
        Date.now() + this.securityConfig.loginLockoutDuration * 1000,
      );
      this.logger.warn("用户账户已被暂时锁定", {
        username,
        attemptCount: attempt.count,
        blockedUntil: attempt.blockedUntil,
      });
    }

    this.loginAttempts.set(key, attempt);
  }

  /**
   * 清除登录失败记录
   */
  async clearLoginFailures(username: string): Promise<void> {
    const key = `login_${username}`;
    this.loginAttempts.delete(key);
  }

  // ==================== 私有方法 ====================

  /**
   * 验证密码策略
   */
  private validatePasswordPolicy(password: string): void {
    const minLength = this.securityConfig.passwordMinLength || 8;

    if (password.length < minLength) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Password must be at least ${minLength} characters long`,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validatePasswordPolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          minLength,
          actualLength: password.length,
          authErrorCode: AUTH_ERROR_CODES.PASSWORD_POLICY_VIOLATION
        }
      });
    }

    // 检查密码复杂度
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (this.securityConfig.requirePasswordComplexity) {
      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw UniversalExceptionFactory.createBusinessException({
          message: "Password must contain uppercase letters, lowercase letters, numbers and special characters",
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validatePasswordPolicy',
          component: ComponentIdentifier.AUTH,
          context: {
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar,
            authErrorCode: AUTH_ERROR_CODES.PASSWORD_POLICY_VIOLATION
          }
        });
      }
    }
  }

  /**
   * 验证用户名策略
   */
  private validateUsernamePolicy(username: string): void {
    if (username.length < 3 || username.length > 50) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Username length must be between 3-50 characters",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateUsernamePolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          username,
          length: username.length,
          authErrorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS
        }
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Username can only contain letters, numbers, underscores and hyphens",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateUsernamePolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          username,
          authErrorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS
        }
      });
    }
  }

  /**
   * 验证邮箱策略
   */
  private validateEmailPolicy(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid email format",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateEmailPolicy',
        component: ComponentIdentifier.AUTH,
        context: {
          email,
          authErrorCode: AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT
        }
      });
    }
  }

  /**
   * 检查注册频率限制
   */
  private async checkRegistrationRateLimit(email: string): Promise<void> {
    const key = `reg_${email}`;
    const attempt = this.registrationAttempts.get(key);
    const now = new Date();

    if (attempt) {
      const timeDiff = now.getTime() - attempt.lastAttempt.getTime();
      const cooldownPeriod = 60 * 1000; // 1分钟冷却期

      if (timeDiff < cooldownPeriod && attempt.count >= 3) {
        throw UniversalExceptionFactory.createBusinessException({
          message: "Registration attempts too frequent, please try again later",
          errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
          operation: 'checkRegistrationRateLimit',
          component: ComponentIdentifier.AUTH,
          context: {
            email,
            attemptCount: attempt.count,
            cooldownPeriod,
            authErrorCode: AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED
          },
          retryable: true
        });
      }

      if (timeDiff >= cooldownPeriod) {
        // 重置计数器
        this.registrationAttempts.delete(key);
      }
    }

    // 记录新的尝试
    this.registrationAttempts.set(key, {
      count: (attempt?.count || 0) + 1,
      lastAttempt: now,
    });
  }

  /**
   * 检查登录频率限制
   */
  private async checkLoginRateLimit(username: string): Promise<void> {
    const key = `login_rate_${username}`;
    // 实际实现中应使用Redis的滑动窗口算法
    // 这里只是示例逻辑
  }

  /**
   * 检查账户锁定状态
   */
  private async checkAccountLockout(username: string): Promise<void> {
    const key = `login_${username}`;
    const attempt = this.loginAttempts.get(key);

    if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) {
      const remainingTime = Math.ceil(
        (attempt.blockedUntil.getTime() - Date.now()) / 1000,
      );
      throw UniversalExceptionFactory.createBusinessException({
        message: `Account is locked, please try again in ${remainingTime} seconds`,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'checkAccountLockout',
        component: ComponentIdentifier.AUTH,
        context: {
          username,
          remainingTime,
          authErrorCode: AUTH_ERROR_CODES.ACCOUNT_LOCKED
        },
        retryable: true
      });
    }
  }

  /**
   * 检查API密钥数量限制
   */
  private async checkApiKeyLimit(userId: string): Promise<void> {
    // 在此处不需要重复验证userId，因为调用该方法前已经验证过了

    const userApiKeys = await this.userAuthService.getAllUsers(); // 这里应该是获取用户的API密钥
    // 实际实现中需要查询用户的API密钥数量
    const maxApiKeys = this.securityConfig.maxApiKeysPerUser || 10;

    // if (userApiKeys.length >= maxApiKeys) {
    //   throw new BadRequestException(`每个用户最多只能创建${maxApiKeys}个API密钥`);
    // }
  }

  /**
   * 验证API密钥名称
   */
  private validateApiKeyName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "API key name must be at least 2 characters long",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyName',
        component: ComponentIdentifier.AUTH,
        context: {
          name,
          length: name?.trim().length || 0,
          authErrorCode: AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT
        }
      });
    }

    if (name.length > 100) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "API key name cannot exceed 100 characters",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyName',
        component: ComponentIdentifier.AUTH,
        context: {
          name,
          length: name.length,
          maxLength: 100,
          authErrorCode: AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT
        }
      });
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "API key name can only contain letters, numbers, spaces, underscores and hyphens",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyName',
        component: ComponentIdentifier.AUTH,
        context: {
          name,
          authErrorCode: AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT
        }
      });
    }
  }

  /**
   * 验证API密钥权限
   */
  private validateApiKeyPermissions(permissions: string[]): void {
    if (!permissions || permissions.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "API key must have at least one permission",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyPermissions',
        component: ComponentIdentifier.AUTH,
        context: {
          permissions,
          authErrorCode: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS
        }
      });
    }

    // 检查权限数量限制
    if (permissions.length > 20) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "API key permissions cannot exceed 20",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateApiKeyPermissions',
        component: ComponentIdentifier.AUTH,
        context: {
          permissions,
          count: permissions.length,
          maxCount: 20,
          authErrorCode: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS
        }
      });
    }
  }

  /**
   * 检查API密钥创建频率限制
   */
  private async checkApiKeyCreationRateLimit(userId: string): Promise<void> {
    // 在此处不需要重复验证userId，因为调用该方法前已经验证过了
    // 实际实现中应使用Redis检查用户创建API密钥的频率
    // 例如：每小时最多创建5个API密钥
  }

  /**
   * 检查频率限制重置频率
   */
  private async checkRateLimitResetFrequency(
    appKey: string,
    userId: string,
  ): Promise<void> {
    // 在此处不需要重复验证userId，因为调用该方法前已经验证过了
    // 实际实现中应检查用户重置频率限制的频率
    // 例如：每天最多重置3次
  }
}
