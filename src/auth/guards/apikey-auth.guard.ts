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
export class ApiKeyAuthGuard extends AuthGuard("apikey") {
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

    const requireApiKey = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireApiKey) {
      return true;
    }

    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(err: any, apiKey: any, _info?: any) {
    if (err || !apiKey) {
      // 确保错误消息包含"API凭证"字样
      throw err || new UnauthorizedException("API凭证验证失败");
    }
    return apiKey;
  }
}
