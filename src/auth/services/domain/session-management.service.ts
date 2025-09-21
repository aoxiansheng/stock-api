import { Injectable } from "@nestjs/common";
import { TokenService, JwtPayload } from "../infrastructure/token.service";
import { User } from "../../schemas/user.schema";
import { UserAuthenticationService } from "./user-authentication.service";
import { CacheService } from "../../../cache/services/cache.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DatabaseValidationUtils } from "../../../common/utils/database.utils";
import { createLogger } from "@common/modules/logging";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";

/**
 * 会话管理服务 - 用户会话和令牌生命周期管理
 * 专注于会话创建、验证、刷新、销毁等逻辑
 * 不包含用户认证逻辑，通过依赖注入获取用户信息
 */
@Injectable()
export class SessionManagementService {
  private readonly logger = createLogger(SessionManagementService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly userAuthService: UserAuthenticationService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 为已认证用户创建新会话
   * 生成访问令牌和刷新令牌对
   */
  async createUserSession(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(user.id, "用户ID");

    this.logger.log("创建用户会话", {
      userId: user.id,
      username: user.username,
    });

    try {
      // 生成令牌对
      const tokens = await this.tokenService.generateTokens(user);

      // 更新用户最后登录时间（异步执行，不影响响应时间）
      setImmediate(() => {
        this.userAuthService.updateLastLoginTime(user.id).catch((error) =>
          this.logger.error("更新最后登录时间失败", {
            userId: user.id,
            error: error.message,
          }),
        );
      });

      this.logger.log("用户会话创建成功", {
        userId: user.id,
        username: user.username,
      });

      return tokens;
    } catch (error) {
      this.logger.error("创建用户会话失败", {
        userId: user.id,
        username: user.username,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 刷新用户会话
   * 使用刷新令牌生成新的令牌对
   */
  async refreshUserSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    this.logger.log("开始刷新用户会话");

    try {
      // 1. 验证刷新令牌并获取载荷
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      // 验证载荷中的用户ID格式
      DatabaseValidationUtils.validateObjectId(payload.sub, "用户ID");

      this.logger.debug("刷新令牌验证成功", {
        userId: payload.sub,
        username: payload.username,
      });

      // 2. 验证用户状态是否仍然有效
      const user = await this.userAuthService.getUserById(payload.sub);

      // 3. 生成新的令牌对
      const newTokens = await this.tokenService.generateTokens(user);

      this.logger.log("用户会话刷新成功", {
        userId: user.id,
        username: user.username,
      });

      return newTokens;
    } catch (error) {
      this.logger.warn("刷新用户会话失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 验证访问令牌并返回用户信息
   * 用于请求拦截器中的用户身份验证
   */
  async validateAccessToken(accessToken: string): Promise<User> {
    this.logger.debug("验证访问令牌");

    try {
      // 1. 验证并解析令牌载荷
      const payload = await this.tokenService.verifyAccessToken(accessToken);

      // 验证载荷中的用户ID格式
      DatabaseValidationUtils.validateObjectId(payload.sub, "用户ID");

      this.logger.debug("访问令牌验证成功", {
        userId: payload.sub,
        username: payload.username,
      });

      // 2. 获取最新的用户信息并验证用户状态
      const user = await this.userAuthService.getUserById(payload.sub);

      return user;
    } catch (error) {
      this.logger.debug("访问令牌验证失败", { error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        message: "访问令牌无效或已过期",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateAccessToken',
        component: ComponentIdentifier.AUTH,
        context: { reason: 'invalid_access_token' }
      });
    }
  }

  /**
   * 验证JWT载荷中的用户信息
   * 用于Passport JWT策略
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    // 验证载荷中的用户ID格式
    DatabaseValidationUtils.validateObjectId(payload.sub, "用户ID");

    this.logger.debug("验证JWT载荷", {
      userId: payload.sub,
      username: payload.username,
    });

    try {
      // 获取用户信息并验证状态
      const user = await this.userAuthService.getUserById(payload.sub);

      this.logger.debug("JWT载荷验证成功", {
        userId: user.id,
        username: user.username,
      });

      return user;
    } catch (error) {
      this.logger.warn("JWT载荷验证失败", {
        userId: payload.sub,
        username: payload.username,
        error: error.message,
      });
      throw UniversalExceptionFactory.createBusinessException({
        message: "用户身份无效或已被禁用",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateJwtPayload',
        component: ComponentIdentifier.AUTH,
        context: { userId: payload.sub, username: payload.username, reason: 'invalid_jwt_payload' }
      });
    }
  }

  /**
   * 销毁用户会话
   * 在实际实现中可以将令牌加入黑名单或从Redis中移除
   */
  async destroyUserSession(accessToken: string): Promise<void> {
    this.logger.log("销毁用户会话");

    try {
      // 解析令牌获取用户信息
      const payload = await this.tokenService.verifyAccessToken(accessToken);

      // 1. 将令牌加入Redis黑名单
      const tokenId = payload.sub; // 使用用户ID作为唯一标识
      const blacklistKey = `auth:blacklist:${tokenId}`;
      const tokenExpiry = payload.exp
        ? payload.exp - Math.floor(Date.now() / 1000)
        : 3600; // 剩余过期时间或默认1小时
      await this.cacheService.set(blacklistKey, "revoked", {
        ttl: tokenExpiry,
      });

      // 2. 记录会话销毁事件
      this.eventEmitter.emit("auth.session.destroyed", {
        userId: payload.sub,
        username: payload.username,
        tokenId,
        timestamp: new Date(),
        reason: "user_logout",
      });

      // 3. 清理相关的缓存数据
      const userCacheKeys = [
        `auth:session:${payload.sub}`,
        `auth:user:${payload.sub}`,
        `auth:permissions:${payload.sub}`,
      ];

      for (const key of userCacheKeys) {
        try {
          await this.cacheService.del(key);
        } catch (error) {
          this.logger.warn(`清理缓存失败: ${key}`, error);
        }
      }

      this.logger.log("用户会话销毁成功", {
        userId: payload.sub,
        username: payload.username,
      });
    } catch (error) {
      this.logger.error("销毁用户会话失败", { error: error.message });
      // 会话销毁失败不应阻止用户操作，只记录错误
    }
  }

  /**
   * 批量销毁用户的所有会话
   * 用于安全操作，如密码重置、账户禁用等场景
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    this.logger.log("销毁用户所有会话", { userId });

    try {
      // 1. 将该用户的所有令牌加入黑名单（通过用户ID模式匹配）
      const userBlacklistKey = `auth:blacklist:user:${userId}`;
      await this.cacheService.set(userBlacklistKey, "all_sessions_revoked", {
        ttl: 24 * 3600,
      }); // 24小时过期

      // 2. 清理Redis中该用户的所有会话相关数据
      const userDataPatterns = [
        `auth:session:${userId}*`,
        `auth:user:${userId}*`,
        `auth:permissions:${userId}*`,
        `auth:refresh:${userId}*`,
      ];

      const deletedKeys: string[] = [];
      for (const pattern of userDataPatterns) {
        try {
          // 直接通过Redis实例使用通配符删除匹配的键
          const keys = await this.cacheService["redis"].keys(pattern);
          if (keys.length > 0) {
            await this.cacheService["redis"].del(...keys);
            deletedKeys.push(...keys);
          }
        } catch (error) {
          this.logger.warn(`批量清理用户缓存失败: ${pattern}`, error);
        }
      }

      // 3. 记录安全事件
      this.eventEmitter.emit("auth.security.all_sessions_destroyed", {
        userId,
        timestamp: new Date(),
        reason: "security_operation",
        deletedCacheKeys: deletedKeys,
        totalDeletedKeys: deletedKeys.length,
        initiatedBy: "system", // 可以根据实际情况传入操作者信息
      });

      this.logger.log("用户所有会话销毁成功", { userId });
    } catch (error) {
      this.logger.error("销毁用户所有会话失败", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取会话信息
   * 从令牌中提取会话相关信息
   */
  async getSessionInfo(accessToken: string): Promise<{
    userId: string;
    username: string;
    role: string;
    issuedAt: Date;
    expiresAt: Date;
  }> {
    this.logger.debug("获取会话信息");

    try {
      const payload = await this.tokenService.verifyAccessToken(accessToken);

      return {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        issuedAt: new Date(payload.iat * 1000), // JWT时间戳是秒，需要转换为毫秒
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch (error) {
      this.logger.error("获取会话信息失败", { error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        message: "无法获取会话信息",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getSessionInfo',
        component: ComponentIdentifier.AUTH,
        context: { reason: 'session_info_unavailable' }
      });
    }
  }

  /**
   * 检查会话是否即将过期
   * 用于提前刷新令牌的场景
   */
  async isSessionNearExpiry(
    accessToken: string,
    thresholdMinutes: number = 5,
  ): Promise<boolean> {
    try {
      const sessionInfo = await this.getSessionInfo(accessToken);
      const now = new Date();
      const thresholdMs = thresholdMinutes * 60 * 1000;

      return sessionInfo.expiresAt.getTime() - now.getTime() <= thresholdMs;
    } catch (error) {
      // 如果无法获取会话信息，认为会话已过期
      return true;
    }
  }
}
