import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { User } from "../schemas/user.schema";
import { TokenService, JwtPayload } from '../services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ||
        "smart-stock-data-jwt-secret",
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      const user = await this.tokenService.validateUserFromPayload(payload);
      return user;
    } catch {
      throw new UnauthorizedException("JWT令牌无效或用户不存在");
    }
  }
}
