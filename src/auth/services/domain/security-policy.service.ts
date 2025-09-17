import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { CreateApiKeyDto } from "../../dto/apikey.dto";
import { securityConfig } from "@auth/config/security.config";
// 🆕 引入新的统一配置系统 - 与现有配置并存
import { AuthConfigCompatibilityWrapper } from "../../config/compatibility-wrapper";
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
  // 🎯 使用集中化的配置 - 保留原有配置作为后备
  private readonly legacySecurityConfig = securityConfig.security;

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
    // 🆕 可选注入新配置系统 - 如果可用则使用，否则回退到原配置
    private readonly authConfig?: AuthConfigCompatibilityWrapper,
  ) {}

  // 🆕 统一配置访问方法 - 优先使用新配置，回退到原配置
  private get securityConfig() {
    if (this.authConfig) {
      // 使用新的统一配置系统
      const newConfig = {
        maxLoginAttempts:
          this.authConfig.SECURITY_CONFIG.security.maxLoginAttempts,
        loginLockoutDuration:
          this.authConfig.SECURITY_CONFIG.security.loginLockoutDuration,
        passwordMinLength:
          this.authConfig.SECURITY_CONFIG.security.passwordMinLength,
        requirePasswordComplexity:
          this.authConfig.SECURITY_CONFIG.security.requirePasswordComplexity,
        maxApiKeysPerUser:
          this.authConfig.SECURITY_CONFIG.security.maxApiKeysPerUser,
      };

      // 🔍 调试日志：记录使用新配置系统
      this.logger.debug("SecurityPolicyService: 使用新统一配置系统", {
        configSource: "AuthConfigCompatibilityWrapper",
        maxLoginAttempts: newConfig.maxLoginAttempts,
        passwordMinLength: newConfig.passwordMinLength,
      });

      return newConfig;
    }

    // 回退到原有配置
    this.logger.debug("SecurityPolicyService: 回退到原有配置系统", {
      configSource: "securityConfig.security",
      maxLoginAttempts: this.legacySecurityConfig.maxLoginAttempts,
      passwordMinLength: this.legacySecurityConfig.passwordMinLength,
    });

    return this.legacySecurityConfig;
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
      throw new BadRequestException("用户名已被使用");
    }

    if (!availability.emailAvailable) {
      throw new BadRequestException("邮箱地址已被使用");
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
      throw new BadRequestException("无效的API密钥格式");
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
      throw new BadRequestException(`密码长度至少为${minLength}位`);
    }

    // 检查密码复杂度
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (this.securityConfig.requirePasswordComplexity) {
      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new BadRequestException(
          "密码必须包含大写字母、小写字母、数字和特殊字符",
        );
      }
    }
  }

  /**
   * 验证用户名策略
   */
  private validateUsernamePolicy(username: string): void {
    if (username.length < 3 || username.length > 50) {
      throw new BadRequestException("用户名长度必须在3-50字符之间");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new BadRequestException("用户名只能包含字母、数字、下划线和连字符");
    }
  }

  /**
   * 验证邮箱策略
   */
  private validateEmailPolicy(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("邮箱格式无效");
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
        throw new BadRequestException("注册过于频繁，请稍后再试");
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
      throw new ForbiddenException(
        `账户已被锁定，请在${remainingTime}秒后重试`,
      );
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
      throw new BadRequestException("API密钥名称至少需要2个字符");
    }

    if (name.length > 100) {
      throw new BadRequestException("API密钥名称不能超过100个字符");
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      throw new BadRequestException(
        "API密钥名称只能包含字母、数字、空格、下划线和连字符",
      );
    }
  }

  /**
   * 验证API密钥权限
   */
  private validateApiKeyPermissions(permissions: string[]): void {
    if (!permissions || permissions.length === 0) {
      throw new BadRequestException("API密钥必须至少包含一个权限");
    }

    // 检查权限数量限制
    if (permissions.length > 20) {
      throw new BadRequestException("API密钥权限数量不能超过20个");
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
