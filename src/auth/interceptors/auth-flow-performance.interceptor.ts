import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import type { Request } from "express";

import { createLogger } from "@common/modules/logging";
import { AuthPerformanceService } from "../services/infrastructure/auth-performance.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { REQUIRE_API_KEY } from "../decorators/require-apikey.decorator";

/**
 * 认证流程性能监控拦截器
 * 记录整个请求的认证流程性能指标
 */
@Injectable()
export class AuthFlowPerformanceInterceptor implements NestInterceptor {
  private readonly logger = createLogger(AuthFlowPerformanceInterceptor.name);

  constructor(
    private readonly authPerformanceService: AuthPerformanceService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // 获取端点元数据
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requireApiKey = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 分析认证需求
    const authAnalysis = this.analyzeAuthRequirements(isPublic, requireApiKey, request);

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordAuthFlowSuccess(startTime, request, authAnalysis);
        },
        error: (error) => {
          this.recordAuthFlowError(startTime, request, authAnalysis, error);
        },
      }),
    );
  }

  private analyzeAuthRequirements(
    isPublic: boolean,
    requireApiKey: boolean,
    request: Request,
  ) {
    const hasApiKeyHeaders = 
      request.headers["x-app-key"] && request.headers["x-access-token"];
    const hasJwtHeader = request.headers.authorization?.startsWith("Bearer ");

    let authType = "none";
    let expectedGuards = 5; // 总共5个全局守卫
    let expectedSkips = 0;

    if (isPublic) {
      authType = "public";
      expectedSkips = 4; // 除了ThrottlerGuard，其他都会跳过
    } else if (requireApiKey || hasApiKeyHeaders) {
      authType = "api_key";
      expectedSkips = 1; // JWT守卫会跳过
    } else if (hasJwtHeader) {
      authType = "jwt";
      expectedSkips = 2; // API Key相关守卫会跳过
    }

    return {
      authType,
      isPublic,
      requireApiKey,
      hasApiKeyHeaders,
      hasJwtHeader,
      expectedGuards,
      expectedSkips,
    };
  }

  private recordAuthFlowSuccess(
    startTime: number,
    request: Request,
    authAnalysis: any,
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    this.authPerformanceService.recordAuthFlowStats({
      totalGuards: authAnalysis.expectedGuards,
      executedGuards: authAnalysis.expectedGuards - authAnalysis.expectedSkips,
      skippedGuards: authAnalysis.expectedSkips,
      totalDuration: duration,
      endpoint: request.url,
      method: request.method,
      authenticated: !authAnalysis.isPublic,
      authType: authAnalysis.authType,
    });

    // 记录详细的流程日志
    this.logger.debug("认证流程完成", {
      endpoint: request.url,
      method: request.method,
      duration,
      authType: authAnalysis.authType,
      isPublic: authAnalysis.isPublic,
      efficiency: Math.round((authAnalysis.expectedSkips / authAnalysis.expectedGuards) * 100),
    });
  }

  private recordAuthFlowError(
    startTime: number,
    request: Request,
    authAnalysis: any,
    error: any,
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    this.logger.warn("认证流程失败", {
      endpoint: request.url,
      method: request.method,
      duration,
      authType: authAnalysis.authType,
      error: error.message,
      statusCode: error.status,
    });

    // 发送错误指标
    this.authPerformanceService.recordAuthFlowStats({
      totalGuards: authAnalysis.expectedGuards,
      executedGuards: authAnalysis.expectedGuards - authAnalysis.expectedSkips,
      skippedGuards: authAnalysis.expectedSkips,
      totalDuration: duration,
      endpoint: request.url,
      method: request.method,
      authenticated: false,
      authType: authAnalysis.authType,
    });
  }
}