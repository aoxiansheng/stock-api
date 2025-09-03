import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { REQUIRE_API_KEY } from "../decorators/require-apikey.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 检查是否需要API Key认证
    const requireApiKey = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 检查请求中是否包含API Key头部
    const request = context.switchToHttp().getRequest();
    const hasApiKeyHeaders =
      request.headers["x-app-key"] && request.headers["x-access-token"];

    // 如果需要API Key或请求中已包含API Key头部，跳过JWT认证
    if (requireApiKey || hasApiKeyHeaders) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException("JWT认证失败");
    }
    return user;
  }
}
