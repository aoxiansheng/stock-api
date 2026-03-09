import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import type { ApiKeyDocument } from "./schema";
import type { UserDocument } from "./user.schema";
import { UserRole, Permission } from "./enums";
import { ADMIN_PROFILE, READ_PROFILE } from "./constants";
import type { RegisterDto, LoginDto, CreateApiKeyDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel("ApiKey") private readonly apiKeyModel: Model<ApiKeyDocument>,
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto) {
    const { username, password, email } = registerDto;

    // 检查用户名或邮箱是否已存在
    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }]
    }).exec();

    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await this.userModel.create({
      username,
      password: hashedPassword,
      email,
      role: UserRole.DEVELOPER,
    });

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 查找用户
    const user = await this.userModel.findOne({
      username,
      deletedAt: { $exists: false }
    }).exec();

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 tokens
    const accessToken = this.signJwt({ sub: user._id, role: user.role }, '1h');
    const refreshToken = this.signJwt({ sub: user._id }, '7d');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // 存储 refresh token
    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: refreshTokenHash }
    ).exec();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    try {
      // 验证 refresh token
      const payload = this.jwtService.verify(refreshToken);

      // 查找用户并验证 refresh token
      const user = await this.userModel.findOne({
        _id: payload.sub,
        deletedAt: { $exists: false }
      }).exec();

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      let refreshTokenMatches = false;
      try {
        refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      } catch {
        refreshTokenMatches = false;
      }

      if (!refreshTokenMatches) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 生成新的 access token
      const newAccessToken = this.signJwt({ sub: user._id, role: user.role }, '1h');
      const newRefreshToken = this.signJwt({ sub: user._id }, '7d');
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

      // 更新存储的 refresh token
      await this.userModel.updateOne(
        { _id: user._id },
        { refreshToken: newRefreshTokenHash }
      ).exec();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 创建 API Key
   */
  async createApiKey(userId: string, userRole: UserRole, createApiKeyDto: CreateApiKeyDto) {
    const { name, permissions, expiresIn, profile } = createApiKeyDto;

    if (Array.isArray(permissions) && permissions.length === 0) {
      throw new BadRequestException("permissions 不能为空");
    }

    // 生成唯一的 appKey 和 accessToken
    const appKey = uuidv4().replace(/-/g, '');
    const accessToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const hashedAccessToken = await bcrypt.hash(accessToken, 10);

    // 计算过期时间
    let expiresAt: Date | undefined;
    if (expiresIn) {
      const ms = this.parseTimeString(expiresIn);
      expiresAt = new Date(Date.now() + ms);
    }

    const isAdmin = userRole === UserRole.ADMIN;
    let resolvedProfile: 'READ' | 'ADMIN' = 'READ';
    let resolvedPermissions: Permission[] = READ_PROFILE.slice();

    if (isAdmin) {
      resolvedProfile = profile ?? 'READ';
      const requestedPermissions = permissions ?? (
        resolvedProfile === 'ADMIN' ? ADMIN_PROFILE.slice() : READ_PROFILE.slice()
      );
      if (!this.isPermissionsSubset(requestedPermissions, ADMIN_PROFILE)) {
        throw new BadRequestException('权限配置超出允许范围');
      }
      if (resolvedProfile === 'READ' && !this.isPermissionsSubset(requestedPermissions, READ_PROFILE)) {
        throw new BadRequestException('READ档位仅允许只读权限');
      }
      resolvedPermissions = requestedPermissions;
    }

    // 创建 API Key
    const apiKey = await this.apiKeyModel.create({
      userId,
      appKey,
      accessToken: hashedAccessToken,
      name: name || `API Key ${new Date().toISOString()}`,
      permissions: resolvedPermissions,
      profile: resolvedProfile,
      expiresAt,
    });

    return {
      appKey: apiKey.appKey,
      accessToken,
      profile: apiKey.profile,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * 列出用户的所有 API Keys
   */
  async listApiKeys(userId: string) {
    const apiKeys = await this.apiKeyModel.find({
      userId,
      deletedAt: { $exists: false }
    }).select('-accessToken').exec(); // 不返回 accessToken

    return apiKeys.map(key => ({
      appKey: key.appKey,
      name: key.name,
      profile: key.profile,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  /**
   * 撤销 API Key
   */
  async revokeApiKey(userId: string, appKey: string) {
    const result = await this.apiKeyModel.updateOne(
      { userId, appKey, deletedAt: { $exists: false } },
      { deletedAt: new Date() }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new UnauthorizedException('API Key not found');
    }

    return { message: 'API Key revoked successfully' };
  }

  /**
   * 签发 JWT Token
   */
  signJwt(payload: Record<string, any>, expiresIn: string | number = (process.env.JWT_EXPIRES_IN as any) || "24h") {
    return this.jwtService.sign(payload, { expiresIn: expiresIn as any });
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(appKey: string, accessToken: string) {
    const apiKey = await this.apiKeyModel.findOne({
      appKey,
      deletedAt: { $exists: false }
    }).exec();

    if (!apiKey) {
      return null;
    }

    if (apiKey.status !== "active") {
      return null;
    }

    const accessTokenMatches = await bcrypt.compare(accessToken, apiKey.accessToken);
    if (!accessTokenMatches) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return apiKey;
  }

  private isPermissionsSubset(
    requested: Permission[],
    allowed: readonly Permission[],
  ): boolean {
    return requested.every(permission => allowed.includes(permission));
  }

  /**
   * 解析时间字符串（如 "30d", "1y"）为毫秒
   */
  private parseTimeString(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhdy])$/);
    if (!match) {
      throw new BadRequestException('expiresIn 格式必须为数字加单位（s/m/h/d/y）');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };

    const multiplier = multipliers[unit];
    if (!multiplier) {
      throw new BadRequestException('expiresIn 格式必须为数字加单位（s/m/h/d/y）');
    }

    return value * multiplier;
  }
}
