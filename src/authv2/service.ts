import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { ApiKeyDocument } from "./schema";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel("ApiKey") private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  signJwt(payload: Record<string, any>, expiresIn: string | number = (process.env.JWT_EXPIRES_IN as any) || "24h") {
    return this.jwtService.sign(payload, { expiresIn: expiresIn as any });
  }

  async validateApiKey(appKey: string, accessToken: string) {
    return this.apiKeyModel.findOne({ appKey, accessToken, deletedAt: { $exists: false } }).exec();
  }
}
