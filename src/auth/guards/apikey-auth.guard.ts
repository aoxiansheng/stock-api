import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { REQUIRE_API_KEY } from "../decorators/require-apikey.decorator";
import { AuthPerformanceService } from "../services/infrastructure/auth-performance.service";

@Injectable()
export class ApiKeyAuthGuard extends AuthGuard("apikey") {
  constructor(
    private reflector: Reflector,
    private readonly authPerformanceService?: AuthPerformanceService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.recordPerformance(startTime, request, true, "public_endpoint");
      return true;
    }

    const requireApiKey = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireApiKey) {
      this.recordPerformance(startTime, request, true, "no_api_key_required");
      return true;
    }

    try {
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.then(
          (success) => {
            this.recordPerformance(startTime, request, Boolean(success));
            return success;
          },
          (error) => {
            this.recordPerformance(startTime, request, false, undefined, error.message);
            throw error;
          }
        );
      } else {
        this.recordPerformance(startTime, request, Boolean(result));
        return result;
      }
    } catch (error) {
      this.recordPerformance(startTime, request, false, undefined, error.message);
      throw error;
    }
  }

  private recordPerformance(
    startTime: number,
    request: any,
    success: boolean,
    skipReason?: string,
    error?: string,
  ): void {
    if (this.authPerformanceService) {
      this.authPerformanceService.recordAuthFlowPerformance({
        startTime,
        endTime: Date.now(),
        guardName: "ApiKeyAuthGuard",
        endpoint: request.url,
        method: request.method,
        success,
        skipReason,
        error,
      });
    }
  }

  handleRequest(err: any, apiKey: any) {
    if (err || !apiKey) {
      // 确保错误消息包含"API凭证"字样
      throw err || new UnauthorizedException("API凭证验证失败");
    }
    return apiKey;
  }
}
