import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CollectorService } from '../services/collector.service';

/**
 * 收集器拦截器
 * 职责：自动收集HTTP请求指标
 */
@Injectable()
export class CollectorInterceptor implements NestInterceptor {
  private readonly logger = createLogger(CollectorInterceptor.name);

  constructor(private readonly collectorService: CollectorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const endpoint = request.route?.path || request.url;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // 记录成功请求
          this.collectorService.recordRequest(
            endpoint,
            method,
            statusCode,
            duration,
            {
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              userId: request.user?.id,
              authType: request.authType
            }
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          
          // 记录失败请求
          this.collectorService.recordRequest(
            endpoint,
            method,
            statusCode,
            duration,
            {
              error: error.message,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              userId: request.user?.id,
              authType: request.authType
            }
          );
        }
      })
    );
  }
}