import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy as JwtStrategyBase } from "passport-jwt";
import { Strategy as CustomStrategy } from "passport-custom";
import type { Request } from "express";
import { HEADER_APP_KEY, HEADER_ACCESS_TOKEN, ADMIN_PROFILE, READ_PROFILE } from "./constants";
import { UserRole } from "./enums";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { ApiKeyDocument } from "./schema";

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const role: UserRole = payload.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.DEVELOPER;
    const permissions = role === UserRole.ADMIN ? [...ADMIN_PROFILE] : [...READ_PROFILE];
    return { id: payload.sub, role, permissions };
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
    const permissions = (apiKey.profile === "ADMIN" ? ADMIN_PROFILE : READ_PROFILE).slice();
    return Object.assign(apiKey.toObject ? apiKey.toObject() : apiKey, { permissions });
  }
}
