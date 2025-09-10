import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { User } from "../schemas/user.schema";
import { SessionManagementService } from "../services/domain/session-management.service";
import { JwtPayload } from "../services/infrastructure/token.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly sessionService: SessionManagementService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      const user = await this.sessionService.validateJwtPayload(payload);
      return user;
    } catch {
      throw new UnauthorizedException("JWT令牌无效或用户不存在");
    }
  }
}
