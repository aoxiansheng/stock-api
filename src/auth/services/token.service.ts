import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { securityConfig } from "@auth/config/security.config";
import { UserRole } from "../enums/user-role.enum";
import { UserRepository } from "../repositories/user.repository";
import { User } from "../schemas/user.schema";
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

/**
 * 封装 JWT 相关操作的服务
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        expiresIn: securityConfig.session.refreshTokenDefaultExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 从 JWT 载荷验证用户
   * @param payload JWT 载荷
   * @returns 有效的用户实体
   */
  async validateUserFromPayload(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("来自令牌的用户无效或已被禁用");
    }
    // 使用 toJSON() 方法过滤敏感字段
    return user.toJSON() as User;
  }

  /**
   * 验证刷新令牌并返回其载荷
   * @param token 刷新令牌
   * @returns JWT 载荷
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      // 在实际生产中，刷新令牌最好使用独立的 secret
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      throw new UnauthorizedException("无效或已过期的刷新令牌");
    }
  }
}
