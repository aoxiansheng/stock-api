import { Injectable, Inject, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import { createLogger } from "@common/modules/logging";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { CreateApiKeyDto, ApiKeyUsageDto } from "../../dto/apikey.dto";
import { User } from "../../schemas/user.schema";
import { ApiKeyDocument } from "../../schemas/apikey.schema";
import { DatabaseValidationUtils } from "../../../common/utils/database.utils";

import { UserAuthenticationService } from "../domain/user-authentication.service";
import { ApiKeyManagementService } from "../domain/apikey-management.service";
import { SessionManagementService } from "../domain/session-management.service";
import { SecurityPolicyService } from "../domain/security-policy.service";
import { AuditService } from "../domain/audit.service";
import { AuthEventNotificationService } from "../domain/notification.service";

/**
 * 认证服务门面 - 统一入口点
 * 负责编排业务流程，不包含具体业务逻辑
 * 提供清晰的API边界和统一的错误处理
 * 🆕 支持请求追踪和关联ID
 */
@Injectable({ scope: Scope.REQUEST })
export class AuthFacadeService {
  private readonly logger = createLogger(AuthFacadeService.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly userAuthService: UserAuthenticationService,
    private readonly apiKeyService: ApiKeyManagementService,
    private readonly sessionService: SessionManagementService,
    private readonly securityService: SecurityPolicyService,
    private readonly auditService: AuditService,
    private readonly notificationService: AuthEventNotificationService,
  ) {}

  /**
   * 获取当前请求的追踪信息
   */
  private getRequestTrackingInfo() {
    return {
      requestId: (this.request as any).requestId || "unknown",
      correlationId: (this.request as any).correlationId || "unknown",
      userAgent: this.request.headers["user-agent"] || "unknown",
      clientIP:
        this.request.ip || this.request.connection?.remoteAddress || "unknown",
    };
  }

  /**
   * 用户注册流程编排
   */
  async register(createUserDto: CreateUserDto): Promise<User> {
    const trackingInfo = this.getRequestTrackingInfo();

    this.logger.log("开始用户注册流程", {
      username: createUserDto.username,
      ...trackingInfo,
    });

    try {
      // 1. 安全策略检查
      await this.securityService.validateRegistrationPolicy(createUserDto);

      // 2. 执行用户认证服务的注册逻辑
      const user = await this.userAuthService.registerUser(createUserDto);

      // 3. 记录审计日志
      await this.auditService.logUserRegistration(user);

      // 4. 发送通知事件
      await this.notificationService.sendRegistrationSuccessEvent(user);

      this.logger.log("用户注册成功", {
        userId: user.id,
        username: user.username,
        ...trackingInfo,
      });
      return user;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logUserRegistrationFailure(createUserDto, error);

      // 发送失败通知
      await this.notificationService.sendRegistrationFailureEvent(
        createUserDto,
        error,
      );

      throw error;
    }
  }

  /**
   * 用户登录流程编排
   */
  async login(loginDto: LoginDto): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    this.logger.log("开始用户登录流程", { username: loginDto.username });

    try {
      // 1. 安全策略检查（频率限制、IP白名单等）
      await this.securityService.validateLoginPolicy(loginDto);

      // 2. 用户身份验证
      const user = await this.userAuthService.authenticateUser(loginDto);

      // 3. 创建会话和令牌
      const tokens = await this.sessionService.createUserSession(user);

      // 4. 记录审计日志
      await this.auditService.logUserLogin(user);

      // 5. 发送通知事件
      await this.notificationService.sendLoginSuccessEvent(user);

      this.logger.log("用户登录成功", {
        userId: user.id,
        username: user.username,
      });

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logUserLoginFailure(loginDto, error);

      // 发送失败通知
      await this.notificationService.sendLoginFailureEvent(loginDto, error);

      throw error;
    }
  }

  /**
   * 刷新令牌流程编排
   */
  async refreshToken(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    this.logger.log("开始刷新令牌流程");

    try {
      // 1. 安全策略检查
      await this.securityService.validateRefreshTokenPolicy(token);

      // 2. 刷新会话令牌
      const tokens = await this.sessionService.refreshUserSession(token);

      // 3. 记录审计日志
      await this.auditService.logTokenRefresh(token);

      // 4. 发送通知事件
      await this.notificationService.sendTokenRefreshEvent(token);

      this.logger.log("令牌刷新成功");
      return tokens;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logTokenRefreshFailure(token, error);

      throw error;
    }
  }

  /**
   * 创建API密钥流程编排
   */
  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<any> {
    this.logger.log("开始创建API密钥流程", {
      userId,
      name: createApiKeyDto.name,
    });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      // 1. 安全策略检查
      await this.securityService.validateApiKeyCreationPolicy(
        userId,
        createApiKeyDto,
      );

      // 2. 执行API密钥创建
      const apiKey = await this.apiKeyService.createApiKey(
        userId,
        createApiKeyDto,
      );

      // 3. 记录审计日志
      await this.auditService.logApiKeyCreation(userId, apiKey);

      // 4. 发送通知事件
      await this.notificationService.sendApiKeyCreationEvent(userId, apiKey);

      this.logger.log("API密钥创建成功", {
        userId,
        apiKeyId: (apiKey as any)._id,
      });
      return apiKey;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logApiKeyCreationFailure(
        userId,
        createApiKeyDto,
        error,
      );

      throw error;
    }
  }

  /**
   * 验证API密钥流程编排
   */
  async validateApiKey(
    appKey: string,
    accessToken: string,
  ): Promise<ApiKeyDocument> {
    this.logger.debug("开始验证API密钥流程", { appKey });

    try {
      // 1. 安全策略检查（频率限制等）
      await this.securityService.validateApiKeyUsagePolicy(appKey);

      // 2. 执行API密钥验证
      const apiKey = await this.apiKeyService.validateApiKey(
        appKey,
        accessToken,
      );

      // 3. 记录审计日志（异步，不影响性能）
      setImmediate(() => {
        this.auditService
          .logApiKeyUsage(apiKey)
          .catch((err) =>
            this.logger.error("记录API密钥使用审计日志失败", err.stack),
          );
      });

      return apiKey;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logApiKeyValidationFailure(appKey, error);

      throw error;
    }
  }

  /**
   * 获取用户API密钥列表
   */
  async getUserApiKeys(userId: string): Promise<any[]> {
    this.logger.log("获取用户API密钥列表", { userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    return this.apiKeyService.getUserApiKeys(userId);
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(appKey: string, userId: string): Promise<void> {
    this.logger.log("开始撤销API密钥", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      // 1. 执行撤销操作
      await this.apiKeyService.revokeApiKey(appKey, userId);

      // 2. 记录审计日志
      await this.auditService.logApiKeyRevocation(appKey, userId);

      // 3. 发送通知事件
      await this.notificationService.sendApiKeyRevocationEvent(appKey, userId);

      this.logger.log("API密钥撤销成功", { appKey, userId });
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logApiKeyRevocationFailure(appKey, userId, error);

      throw error;
    }
  }

  /**
   * 获取API密钥使用统计
   */
  async getApiKeyUsage(
    appKey: string,
    userId: string,
  ): Promise<ApiKeyUsageDto> {
    this.logger.log("获取API密钥使用统计", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    return this.apiKeyService.getApiKeyUsage(appKey, userId);
  }

  /**
   * 重置API密钥频率限制
   */
  async resetApiKeyRateLimit(
    appKey: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log("开始重置API密钥频率限制", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      // 1. 安全策略检查
      await this.securityService.validateRateLimitResetPolicy(appKey, userId);

      // 2. 执行重置操作
      const result = await this.apiKeyService.resetApiKeyRateLimit(
        appKey,
        userId,
      );

      // 3. 记录审计日志
      await this.auditService.logApiKeyRateLimitReset(appKey, userId);

      // 4. 发送通知事件
      await this.notificationService.sendRateLimitResetEvent(appKey, userId);

      this.logger.log("API密钥频率限制重置成功", { appKey, userId });
      return result;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logApiKeyRateLimitResetFailure(
        appKey,
        userId,
        error,
      );

      throw error;
    }
  }

  /**
   * 管理员功能：获取所有用户
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
    includeStats: boolean = true,
  ) {
    this.logger.log("管理员获取用户列表", { page, limit, includeStats });

    try {
      // 1. 安全策略检查（确保是管理员权限）
      await this.securityService.validateAdminOperationPolicy();

      // 2. 获取用户列表
      const result = await this.userAuthService.getAllUsers(
        page,
        limit,
        includeInactive,
        includeStats,
      );

      // 3. 记录审计日志
      await this.auditService.logAdminUserListAccess(page, result.users.length);

      // 4. 发送通知事件
      await this.notificationService.sendAdminOperationEvent("get_users", {
        page,
        recordCount: result.users.length,
      });

      this.logger.log("管理员用户列表获取成功", {
        page,
        recordCount: result.users.length,
      });
      return result;
    } catch (error) {
      // 记录失败审计日志
      await this.auditService.logAdminUserListAccessFailure(page, error);

      throw error;
    }
  }
}
