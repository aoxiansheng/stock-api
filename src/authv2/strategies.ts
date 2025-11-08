import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy as JwtStrategyBase } from "passport-jwt";
import { Strategy as CustomStrategy } from "passport-custom";
import type { Request } from "express";
import { HEADER_APP_KEY, HEADER_ACCESS_TOKEN, ADMIN_PROFILE, READ_PROFILE } from "./constants";
import { UserRole } from "./enums";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { ApiKeyDocument } from "./schema";
import type { UserDocument } from "./user.schema";

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, "jwt") {
  constructor(
    @InjectModel("User") private userModel: Model<UserDocument>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "changeme", // 必须与 AuthModule 中的默认值保持一致
    });
  }

  async validate(payload: any) {
    // 从数据库查询用户完整信息
    const user = await this.userModel.findOne({
      _id: payload.sub,
      deletedAt: { $exists: false }
    }).exec();

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被删除');
    }

    const role: UserRole = user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.DEVELOPER;
    const permissions = role === UserRole.ADMIN ? [...ADMIN_PROFILE] : [...READ_PROFILE];

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role,
      permissions
    };
  }
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(CustomStrategy, "apikey") {
  constructor(@InjectModel("ApiKey") private apiKeyModel: Model<ApiKeyDocument>) {
    super();
  }

  async validate(req: Request) {
    const appKey = (req.header(HEADER_APP_KEY) || req.header("X-App-Key") || "").toString();
    const accessToken = (req.header(HEADER_ACCESS_TOKEN) || req.header("X-Access-Token") || "").toString();
    if (!appKey || !accessToken) return false;

    const apiKey = await this.apiKeyModel.findOne({ appKey, accessToken, deletedAt: { $exists: false } }).exec();
    if (!apiKey) return false;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) return false;

    // API Key 根据 profile 设置虚拟角色和权限
    const isAdmin = apiKey.profile === "ADMIN";
    const role = isAdmin ? UserRole.ADMIN : UserRole.DEVELOPER;
    const permissions = (isAdmin ? ADMIN_PROFILE : READ_PROFILE).slice();

    return Object.assign(apiKey.toObject ? apiKey.toObject() : apiKey, {
      role,
      permissions
    });
  }
}
