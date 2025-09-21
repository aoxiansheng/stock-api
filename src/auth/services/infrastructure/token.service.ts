import { Injectable, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createLogger } from "@common/modules/logging";
// 使用统一配置系统
import type { AuthUnifiedConfigInterface } from "../../config/auth-unified.config";
import { UserRole } from "../../enums/user-role.enum";
import { User } from "../../schemas/user.schema";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * 令牌服务 - JWT令牌的创建和验证
 * 基础设施层服务，专注于令牌技术实现
 * 不包含业务逻辑，纯粹的技术服务
 */
@Injectable()
export class TokenService {
  private readonly logger = createLogger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject("authUnified")
    private readonly authConfig: AuthUnifiedConfigInterface,
  ) {}

  // 统一配置访问方法
  private get sessionConfig() {
    return {
      jwtDefaultExpiry: this.authConfig.cache.jwtDefaultExpiry,
      refreshTokenDefaultExpiry:
        this.authConfig.cache.refreshTokenDefaultExpiry,
    };
  }

  /**
   * 为用户生成访问令牌和刷新令牌
   */
  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    this.logger.debug("生成用户令牌", {
      userId: user.id,
      username: user.username,
    });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    try {
      const [accessToken, refreshToken] = await Promise.all([
        // 生成访问令牌（较短的过期时间）
        this.jwtService.signAsync(payload),

        // 生成刷新令牌（较长的过期时间）
        this.jwtService.signAsync(payload, {
          expiresIn: this.sessionConfig.refreshTokenDefaultExpiry,
        }),
      ]);

      this.logger.debug("用户令牌生成成功", {
        userId: user.id,
        username: user.username,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error("生成用户令牌失败", {
        userId: user.id,
        username: user.username,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 验证访问令牌
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    this.logger.debug("验证访问令牌");

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      this.logger.debug("访问令牌验证成功", {
        userId: payload.sub,
        username: payload.username,
      });

      return payload;
    } catch (error) {
      this.logger.debug("访问令牌验证失败", { error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        message: "访问令牌无效或已过期",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'verifyAccessToken',
        component: ComponentIdentifier.AUTH,
        context: { reason: 'invalid_access_token' }
      });
    }
  }

  /**
   * 验证刷新令牌
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    this.logger.debug("验证刷新令牌");

    try {
      // 在生产环境中，刷新令牌最好使用独立的密钥
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      this.logger.debug("刷新令牌验证成功", {
        userId: payload.sub,
        username: payload.username,
      });

      return payload;
    } catch (error) {
      this.logger.debug("刷新令牌验证失败", { error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        message: "刷新令牌无效或已过期",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'verifyRefreshToken',
        component: ComponentIdentifier.AUTH,
        context: { reason: 'invalid_refresh_token' }
      });
    }
  }

  /**
   * 解析令牌而不验证其有效性
   * 用于调试和日志记录场景
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.decode(token) as JwtPayload;
      return payload;
    } catch (error) {
      this.logger.error("令牌解析失败", { error: error.message });
      return null;
    }
  }

  /**
   * 检查令牌是否即将过期
   */
  isTokenNearExpiry(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      const threshold = thresholdMinutes * 60;

      return payload.exp - now <= threshold;
    } catch (error) {
      this.logger.error("检查令牌过期时间失败", { error: error.message });
      return true;
    }
  }

  /**
   * 获取令牌剩余有效时间（秒）
   */
  getTokenRemainingTime(token: string): number {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return 0;
      }

      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, payload.exp - now);
    } catch (error) {
      this.logger.error("获取令牌剩余时间失败", { error: error.message });
      return 0;
    }
  }

  /**
   * 创建自定义载荷的令牌
   * 用于特殊场景，如API密钥验证、临时访问等
   */
  async signCustomPayload(
    payload: Record<string, any>,
    options?: { expiresIn?: string },
  ): Promise<string> {
    this.logger.debug("生成自定义载荷令牌", { payload: Object.keys(payload) });

    try {
      const token = await this.jwtService.signAsync(payload, options);

      this.logger.debug("自定义载荷令牌生成成功");
      return token;
    } catch (error) {
      this.logger.error("生成自定义载荷令牌失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 验证自定义载荷的令牌
   */
  async verifyCustomPayload<T extends object = Record<string, any>>(
    token: string,
  ): Promise<T> {
    this.logger.debug("验证自定义载荷令牌");

    try {
      const payload = await this.jwtService.verifyAsync<T>(token);

      this.logger.debug("自定义载荷令牌验证成功");
      return payload;
    } catch (error) {
      this.logger.debug("自定义载荷令牌验证失败", { error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        message: "自定义令牌无效或已过期",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'verifyCustomPayload',
        component: ComponentIdentifier.AUTH,
        context: { reason: 'invalid_custom_token' }
      });
    }
  }

  /**
   * 获取令牌配置信息
   * 用于调试和监控
   */
  getTokenConfig(): {
    algorithm: string;
    defaultExpiresIn: string;
    refreshTokenExpiresIn: string;
  } {
    return {
      algorithm: "HS256", // JWT默认算法
      defaultExpiresIn: this.sessionConfig.jwtDefaultExpiry || "15m",
      refreshTokenExpiresIn:
        this.sessionConfig.refreshTokenDefaultExpiry || "7d",
    };
  }
}
