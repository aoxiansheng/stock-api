import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/modules/logging";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { User } from "../../schemas/user.schema";
import { ApiKey } from "../../schemas/apikey.schema";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";

/**
 * 认证业务事件通知服务 - 业务事件和监控事件的发送
 * 专注于认证相关的事件发送和通知逻辑
 * 支持多种通知渠道：事件总线、邮件、SMS、推送通知等
 */
@Injectable()
export class AuthEventNotificationService {
  private readonly logger = createLogger(AuthEventNotificationService.name);

  constructor(private readonly eventBus: EventEmitter2) {}

  /**
   * 发送用户注册成功事件
   */
  async sendRegistrationSuccessEvent(user: User): Promise<void> {
    this.logger.debug("发送用户注册成功通知", {
      userId: user.id,
      username: user.username,
    });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric("user_registration", true, {
        operation: "register",
        role: user.role,
        userId: user.id,
      });

      // 2. 发送用户通知事件
      await this.emitUserNotification("USER_REGISTERED", {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      // 3. 发送欢迎邮件（异步）
      setImmediate(() => {
        this.sendWelcomeEmail(user).catch((error) =>
          this.logger.error("发送欢迎邮件失败", {
            userId: user.id,
            error: error.message,
          }),
        );
      });

      this.logger.debug("用户注册成功通知已发送", { userId: user.id });
    } catch (error) {
      this.logger.error("发送用户注册成功通知失败", {
        userId: user.id,
        error: error.message,
      });
    }
  }

  /**
   * 发送用户注册失败事件
   */
  async sendRegistrationFailureEvent(
    createUserDto: CreateUserDto,
    error: any,
  ): Promise<void> {
    this.logger.debug("发送用户注册失败通知", {
      username: createUserDto.username,
    });

    try {
      // 发送业务监控事件
      await this.emitBusinessMetric("user_registration", false, {
        operation: "register",
        reason: this.extractErrorReason(error),
        username: createUserDto.username,
      });

      // 如果是频繁失败，可能需要安全警报
      await this.checkAndSendSecurityAlert("REGISTRATION_FAILURE", {
        username: createUserDto.username,
        email: createUserDto.email,
        error: error.message,
      });

      this.logger.debug("用户注册失败通知已发送");
    } catch (notificationError) {
      this.logger.error("发送用户注册失败通知失败", {
        error: notificationError.message,
      });
    }
  }

  /**
   * 发送用户登录成功事件
   */
  async sendLoginSuccessEvent(user: User): Promise<void> {
    this.logger.debug("发送用户登录成功通知", {
      userId: user.id,
      username: user.username,
    });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric("user_login", true, {
        operation: "login",
        role: user.role,
        userId: user.id,
      });

      // 2. 发送用户行为事件
      await this.emitUserNotification("USER_LOGIN", {
        userId: user.id,
        username: user.username,
        loginTime: new Date(),
        ipAddress: this.getCurrentIpAddress(),
        userAgent: this.getCurrentUserAgent(),
      });

      // 3. 检查是否需要发送登录提醒
      setImmediate(() => {
        this.checkAndSendLoginReminder(user).catch((error) =>
          this.logger.error("检查登录提醒失败", {
            userId: user.id,
            error: error.message,
          }),
        );
      });

      this.logger.debug("用户登录成功通知已发送", { userId: user.id });
    } catch (error) {
      this.logger.error("发送用户登录成功通知失败", {
        userId: user.id,
        error: error.message,
      });
    }
  }

  /**
   * 发送用户登录失败事件
   */
  async sendLoginFailureEvent(loginDto: LoginDto, error: any): Promise<void> {
    this.logger.debug("发送用户登录失败通知", { username: loginDto.username });

    try {
      // 发送业务监控事件
      await this.emitBusinessMetric("user_login", false, {
        operation: "login",
        reason: this.extractErrorReason(error),
        username: loginDto.username,
      });

      // 发送安全警报（如果是可疑活动）
      await this.checkAndSendSecurityAlert("LOGIN_FAILURE", {
        username: loginDto.username,
        error: error.message,
        ipAddress: this.getCurrentIpAddress(),
        timestamp: new Date(),
      });

      this.logger.debug("用户登录失败通知已发送");
    } catch (notificationError) {
      this.logger.error("发送用户登录失败通知失败", {
        error: notificationError.message,
      });
    }
  }

  /**
   * 发送令牌刷新事件
   */
  async sendTokenRefreshEvent(token: string): Promise<void> {
    this.logger.debug("发送令牌刷新通知");

    try {
      // 发送技术监控事件
      await this.emitTechnicalMetric("token_refresh", true, {
        operation: "refresh_token",
      });

      this.logger.debug("令牌刷新通知已发送");
    } catch (error) {
      this.logger.error("发送令牌刷新通知失败", { error: error.message });
    }
  }

  /**
   * 发送API密钥创建事件
   */
  async sendApiKeyCreationEvent(userId: string, apiKey: ApiKey): Promise<void> {
    this.logger.debug("发送API密钥创建通知", {
      userId,
      apiKeyId: (apiKey as any)._id,
    });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric("api_key_creation", true, {
        operation: "create_api_key",
        userId,
        permissions: apiKey.permissions,
      });

      // 2. 发送用户通知事件
      await this.emitUserNotification("API_KEY_CREATED", {
        userId,
        apiKeyId: (apiKey as any)._id?.toString(),
        apiKeyName: apiKey.name,
        appKey: apiKey.appKey,
        permissions: apiKey.permissions,
        createdAt: new Date(),
      });

      // 3. 发送邮件通知（异步）
      setImmediate(() => {
        this.sendApiKeyCreatedEmail(userId, apiKey).catch((error) =>
          this.logger.error("发送API密钥创建邮件失败", {
            userId,
            apiKeyId: (apiKey as any)._id,
            error: error.message,
          }),
        );
      });

      this.logger.debug("API密钥创建通知已发送", { userId });
    } catch (error) {
      this.logger.error("发送API密钥创建通知失败", {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * 发送API密钥撤销事件
   */
  async sendApiKeyRevocationEvent(
    appKey: string,
    userId: string,
  ): Promise<void> {
    this.logger.debug("发送API密钥撤销通知", { appKey, userId });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric("api_key_revocation", true, {
        operation: "revoke_api_key",
        userId,
      });

      // 2. 发送用户通知事件
      await this.emitUserNotification("API_KEY_REVOKED", {
        userId,
        appKey,
        revokedAt: new Date(),
      });

      // 3. 发送安全通知（API密钥撤销是重要的安全事件）
      await this.sendSecurityNotification("API_KEY_REVOKED", {
        userId,
        appKey,
        timestamp: new Date(),
        ipAddress: this.getCurrentIpAddress(),
      });

      this.logger.debug("API密钥撤销通知已发送", { appKey, userId });
    } catch (error) {
      this.logger.error("发送API密钥撤销通知失败", {
        appKey,
        userId,
        error: error.message,
      });
    }
  }

  /**
   * 发送频率限制重置事件
   */
  async sendRateLimitResetEvent(appKey: string, userId: string): Promise<void> {
    this.logger.debug("发送频率限制重置通知", { appKey, userId });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric("api_key_rate_limit_reset", true, {
        operation: "reset_rate_limit",
        userId,
        resetType: "manual",
      });

      // 2. 发送管理事件
      await this.emitUserNotification("RATE_LIMIT_RESET", {
        userId,
        appKey,
        resetAt: new Date(),
        resetType: "manual",
      });

      this.logger.debug("频率限制重置通知已发送", { appKey, userId });
    } catch (error) {
      this.logger.error("发送频率限制重置通知失败", {
        appKey,
        userId,
        error: error.message,
      });
    }
  }

  /**
   * 发送管理员操作事件
   */
  async sendAdminOperationEvent(
    operation: string,
    details: any,
  ): Promise<void> {
    this.logger.debug("发送管理员操作通知", { operation, details });

    try {
      // 1. 发送业务监控事件
      await this.emitBusinessMetric(`admin_${operation}`, true, {
        operation,
        ...details,
      });

      // 2. 发送管理员审计事件
      await this.emitAdminNotification("ADMIN_OPERATION", {
        operation,
        details,
        timestamp: new Date(),
        ipAddress: this.getCurrentIpAddress(),
      });

      this.logger.debug("管理员操作通知已发送", { operation });
    } catch (error) {
      this.logger.error("发送管理员操作通知失败", {
        operation,
        error: error.message,
      });
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 发送业务监控指标事件
   */
  private async emitBusinessMetric(
    metricName: string,
    success: boolean,
    metadata?: any,
  ): Promise<void> {
    try {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "auth",
        metricType: "business",
        metricName,
        metricValue: success ? 1 : 0,
        tags: {
          status: success ? "success" : "error",
          ...metadata,
        },
      });
    } catch (error) {
      this.logger.error("发送业务监控指标失败", {
        metricName,
        error: error.message,
      });
    }
  }

  /**
   * 发送技术监控指标事件
   */
  private async emitTechnicalMetric(
    metricName: string,
    success: boolean,
    metadata?: any,
  ): Promise<void> {
    try {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "auth",
        metricType: "technical",
        metricName,
        metricValue: success ? 1 : 0,
        tags: {
          status: success ? "success" : "error",
          ...metadata,
        },
      });
    } catch (error) {
      this.logger.error("发送技术监控指标失败", {
        metricName,
        error: error.message,
      });
    }
  }

  /**
   * 发送用户通知事件
   */
  private async emitUserNotification(
    eventType: string,
    data: any,
  ): Promise<void> {
    try {
      this.eventBus.emit("USER_NOTIFICATION", {
        eventType,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("发送用户通知事件失败", {
        eventType,
        error: error.message,
      });
    }
  }

  /**
   * 发送管理员通知事件
   */
  private async emitAdminNotification(
    eventType: string,
    data: any,
  ): Promise<void> {
    try {
      this.eventBus.emit("ADMIN_NOTIFICATION", {
        eventType,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("发送管理员通知事件失败", {
        eventType,
        error: error.message,
      });
    }
  }

  /**
   * 发送安全通知
   */
  private async sendSecurityNotification(
    eventType: string,
    data: any,
  ): Promise<void> {
    try {
      this.eventBus.emit("SECURITY_NOTIFICATION", {
        eventType,
        data,
        timestamp: new Date(),
        priority: "HIGH",
      });
    } catch (error) {
      this.logger.error("发送安全通知失败", {
        eventType,
        error: error.message,
      });
    }
  }

  /**
   * 检查并发送安全警报
   */
  private async checkAndSendSecurityAlert(
    alertType: string,
    data: any,
  ): Promise<void> {
    try {
      // 实际实现中应该包含安全规则引擎
      // 例如：检查IP是否可疑、失败次数是否过多等

      this.eventBus.emit("SECURITY_ALERT", {
        alertType,
        data,
        timestamp: new Date(),
        priority: "MEDIUM",
      });
    } catch (error) {
      this.logger.error("发送安全警报失败", {
        alertType,
        error: error.message,
      });
    }
  }

  /**
   * 发送欢迎邮件
   */
  private async sendWelcomeEmail(user: User): Promise<void> {
    // 实际实现中应该集成邮件服务
    this.logger.debug("发送欢迎邮件", { userId: user.id, email: user.email });
  }

  /**
   * 发送API密钥创建邮件
   */
  private async sendApiKeyCreatedEmail(
    userId: string,
    apiKey: ApiKey,
  ): Promise<void> {
    // 实际实现中应该发送包含API密钥信息的邮件
    this.logger.debug("发送API密钥创建邮件", {
      userId,
      apiKeyId: (apiKey as any)._id,
    });
  }

  /**
   * 检查并发送登录提醒
   */
  private async checkAndSendLoginReminder(user: User): Promise<void> {
    // 实际实现中可以检查：
    // 1. 是否来自新设备/新IP
    // 2. 是否在异常时间登录
    // 3. 是否需要发送登录提醒邮件

    this.logger.debug("检查登录提醒", { userId: user.id });
  }

  /**
   * 提取错误原因
   */
  private extractErrorReason(error: any): string {
    if (
      error.message.includes("用户已存在") ||
      error.message.includes("USER_EXISTS")
    ) {
      return "user_exists";
    }
    if (
      error.message.includes("无效凭据") ||
      error.message.includes("INVALID_CREDENTIALS")
    ) {
      return "invalid_credentials";
    }
    if (
      error.message.includes("用户不活跃") ||
      error.message.includes("user_inactive")
    ) {
      return "user_inactive";
    }
    return "unknown_error";
  }

  /**
   * 获取当前IP地址
   */
  private getCurrentIpAddress(): string {
    // 在实际实现中，应该从请求上下文中获取
    return "Unknown";
  }

  /**
   * 获取当前用户代理
   */
  private getCurrentUserAgent(): string {
    // 在实际实现中，应该从请求上下文中获取
    return "Unknown";
  }
}
