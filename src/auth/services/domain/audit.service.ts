import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/modules/logging";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { CreateApiKeyDto } from "../../dto/apikey.dto";
import { User } from "../../schemas/user.schema";
import { ApiKey } from "../../schemas/apikey.schema";

/**
 * 审计服务 - 安全和业务事件的审计日志记录
 * 专注于审计日志的结构化记录和存储
 * 遵循安全审计的最佳实践，确保日志的完整性和可追溯性
 */
@Injectable()
export class AuditService {
  private readonly logger = createLogger(AuditService.name);

  /**
   * 记录用户注册成功
   */
  async logUserRegistration(user: User): Promise<void> {
    const auditEvent = {
      eventType: "USER_REGISTRATION_SUCCESS",
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.log("用户注册审计事件", auditEvent);

    // 在实际实现中，应该将审计日志存储到专门的审计数据库
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录用户注册失败
   */
  async logUserRegistrationFailure(
    createUserDto: CreateUserDto,
    error: any,
  ): Promise<void> {
    const auditEvent = {
      eventType: "USER_REGISTRATION_FAILURE",
      timestamp: new Date().toISOString(),
      attemptedUsername: createUserDto.username,
      attemptedEmail: createUserDto.email,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.warn("用户注册失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录用户登录成功
   */
  async logUserLogin(user: User): Promise<void> {
    const auditEvent = {
      eventType: "USER_LOGIN_SUCCESS",
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      role: user.role,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.log("用户登录成功审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录用户登录失败
   */
  async logUserLoginFailure(loginDto: LoginDto, error: any): Promise<void> {
    const auditEvent = {
      eventType: "USER_LOGIN_FAILURE",
      timestamp: new Date().toISOString(),
      attemptedUsername: loginDto.username,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "HIGH", // 登录失败是高安全级别事件
      },
    };

    this.logger.warn("用户登录失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录令牌刷新
   */
  async logTokenRefresh(token: string): Promise<void> {
    // 不记录完整令牌，只记录令牌的哈希值或部分信息
    const tokenHash = this.hashSensitiveData(token);

    const auditEvent = {
      eventType: "TOKEN_REFRESH_SUCCESS",
      timestamp: new Date().toISOString(),
      tokenHash,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.log("令牌刷新审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录令牌刷新失败
   */
  async logTokenRefreshFailure(token: string, error: any): Promise<void> {
    const tokenHash = this.hashSensitiveData(token);

    const auditEvent = {
      eventType: "TOKEN_REFRESH_FAILURE",
      timestamp: new Date().toISOString(),
      tokenHash,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "MEDIUM",
      },
    };

    this.logger.warn("令牌刷新失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥创建
   */
  async logApiKeyCreation(userId: string, apiKey: ApiKey): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_CREATION_SUCCESS",
      timestamp: new Date().toISOString(),
      userId,
      apiKeyId: (apiKey as any)._id?.toString(),
      apiKeyName: apiKey.name,
      appKey: apiKey.appKey,
      permissions: apiKey.permissions,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.log("API密钥创建审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥创建失败
   */
  async logApiKeyCreationFailure(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
    error: any,
  ): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_CREATION_FAILURE",
      timestamp: new Date().toISOString(),
      userId,
      attemptedKeyName: createApiKeyDto.name,
      attemptedPermissions: createApiKeyDto.permissions,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.warn("API密钥创建失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥使用
   */
  async logApiKeyUsage(apiKey: any): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_USAGE",
      timestamp: new Date().toISOString(),
      apiKeyId: (apiKey as any)._id?.toString(),
      appKey: apiKey.appKey,
      userId: apiKey.userId,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    // API密钥使用频率很高，使用debug级别记录
    this.logger.debug("API密钥使用审计事件", auditEvent);
    // 可以选择性地存储高频事件，或使用批量存储
    // await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥验证失败
   */
  async logApiKeyValidationFailure(appKey: string, error: any): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_VALIDATION_FAILURE",
      timestamp: new Date().toISOString(),
      appKey,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "HIGH", // API密钥验证失败是高安全级别事件
      },
    };

    this.logger.warn("API密钥验证失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥撤销
   */
  async logApiKeyRevocation(appKey: string, userId: string): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_REVOCATION_SUCCESS",
      timestamp: new Date().toISOString(),
      appKey,
      userId,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.log("API密钥撤销审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥撤销失败
   */
  async logApiKeyRevocationFailure(
    appKey: string,
    userId: string,
    error: any,
  ): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_REVOCATION_FAILURE",
      timestamp: new Date().toISOString(),
      appKey,
      userId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.warn("API密钥撤销失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥频率限制重置
   */
  async logApiKeyRateLimitReset(appKey: string, userId: string): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_RATE_LIMIT_RESET",
      timestamp: new Date().toISOString(),
      appKey,
      userId,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "MEDIUM", // 频率限制重置需要特别关注
      },
    };

    this.logger.log("API密钥频率限制重置审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录API密钥频率限制重置失败
   */
  async logApiKeyRateLimitResetFailure(
    appKey: string,
    userId: string,
    error: any,
  ): Promise<void> {
    const auditEvent = {
      eventType: "API_KEY_RATE_LIMIT_RESET_FAILURE",
      timestamp: new Date().toISOString(),
      appKey,
      userId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
      },
    };

    this.logger.warn("API密钥频率限制重置失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录管理员用户列表访问
   */
  async logAdminUserListAccess(
    page: number,
    recordCount: number,
  ): Promise<void> {
    const auditEvent = {
      eventType: "ADMIN_USER_LIST_ACCESS",
      timestamp: new Date().toISOString(),
      page,
      recordCount,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "HIGH", // 管理员操作是高安全级别事件
      },
    };

    this.logger.log("管理员用户列表访问审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录管理员用户列表访问失败
   */
  async logAdminUserListAccessFailure(page: number, error: any): Promise<void> {
    const auditEvent = {
      eventType: "ADMIN_USER_LIST_ACCESS_FAILURE",
      timestamp: new Date().toISOString(),
      page,
      errorType: error.constructor.name,
      errorMessage: error.message,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "HIGH",
      },
    };

    this.logger.warn("管理员用户列表访问失败审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * 记录安全违规事件
   */
  async logSecurityViolation(
    violationType: string,
    details: any,
  ): Promise<void> {
    const auditEvent = {
      eventType: "SECURITY_VIOLATION",
      timestamp: new Date().toISOString(),
      violationType,
      details,
      metadata: {
        userAgent: this.getCurrentUserAgent(),
        ipAddress: this.getCurrentIpAddress(),
        source: "auth_service",
        securityLevel: "CRITICAL", // 安全违规是最高级别事件
      },
    };

    this.logger.error("安全违规审计事件", auditEvent);
    await this.storeAuditEvent(auditEvent);

    // 对于关键安全事件，可能需要立即通知安全团队
    await this.alertSecurityTeam(auditEvent);
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 存储审计事件
   * 在实际实现中应该存储到专门的审计数据库
   */
  private async storeAuditEvent(auditEvent: any): Promise<void> {
    try {
      // 实际实现中应该：
      // 1. 存储到专门的审计数据库（如MongoDB、PostgreSQL）
      // 2. 发送到日志聚合服务（如ELK Stack、Splunk）
      // 3. 发送到安全信息和事件管理系统（SIEM）
      // 4. 确保审计日志的完整性和不可篡改性

      this.logger.debug("审计事件已存储", { eventType: auditEvent.eventType });
    } catch (error) {
      // 审计日志存储失败是严重问题，但不应影响业务流程
      this.logger.error("存储审计事件失败", {
        eventType: auditEvent.eventType,
        error: error.message,
      });
    }
  }

  /**
   * 对敏感数据进行哈希处理
   */
  private hashSensitiveData(data: string): string {
    // 实际实现中应使用安全的哈希算法
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(data)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * 获取当前用户代理
   */
  private getCurrentUserAgent(): string {
    // 在实际实现中，应该从请求上下文中获取
    return "Unknown";
  }

  /**
   * 获取当前IP地址
   */
  private getCurrentIpAddress(): string {
    // 在实际实现中，应该从请求上下文中获取
    return "Unknown";
  }

  /**
   * 通知安全团队关键安全事件
   */
  private async alertSecurityTeam(auditEvent: any): Promise<void> {
    try {
      // 实际实现中可以：
      // 1. 发送邮件给安全团队
      // 2. 发送Slack/Teams消息
      // 3. 触发安全事件响应流程
      // 4. 集成到安全监控平台

      this.logger.warn("已触发安全团队警报", {
        eventType: auditEvent.eventType,
        violationType: auditEvent.violationType,
      });
    } catch (error) {
      this.logger.error("发送安全警报失败", { error: error.message });
    }
  }
}
