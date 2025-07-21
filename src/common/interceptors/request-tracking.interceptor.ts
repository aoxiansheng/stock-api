import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * 请求追踪拦截器
 * 负责为每个请求生成唯一的追踪ID，并设置相关的响应头
 * 
 * 功能：
 * - 生成唯一的请求ID
 * - 处理关联ID (correlation ID)
 * - 设置响应头用于追踪
 * - 轻量级实现，最小化性能开销
 */
@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 生成或获取请求ID
    const requestId = this.generateRequestId();
    const correlationId = this.getCorrelationId(request, requestId);

    // 设置到请求对象，供后续拦截器和处理器使用
    (request as any).requestId = requestId;
    (request as any).correlationId = correlationId;

    // 立即设置响应头，确保错误响应也包含追踪信息
    this.setTrackingHeaders(response, requestId, correlationId);

    // 继续处理请求
    return next.handle();
  }

  /**
   * 生成唯一的请求ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    return `req_${timestamp}_${randomSuffix}`;
  }

  /**
   * 获取或生成关联ID
   */
  private getCorrelationId(request: Request, fallback: string): string {
    // 优先使用请求头中的关联ID
    const headerCorrelationId = request.headers['x-correlation-id'] as string;
    if (headerCorrelationId) {
      return headerCorrelationId;
    }

    // 如果没有，使用请求ID作为关联ID
    return fallback;
  }

  /**
   * 设置追踪相关的响应头
   */
  private setTrackingHeaders(response: Response, requestId: string, correlationId: string): void {
    try {
      // 设置请求追踪头
      response.setHeader('x-request-id', requestId);
      response.setHeader('x-correlation-id', correlationId);
      
      // 设置请求时间戳
      response.setHeader('x-request-timestamp', new Date().toISOString());
    } catch {
      // 忽略设置头部失败的错误，不影响主要功能
    }
  }
}