import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CollectorService } from './collector.service';

/**
 * 收集器拦截器
 * 职责：自动收集HTTP请求指标
 */
@Injectable()
export class CollectorInterceptor implements NestInterceptor {
  private readonly logger = createLogger(CollectorInterceptor.name);

  constructor(private readonly collectorService: CollectorService) {
    this.logger.log('CollectorInterceptor initialized - 收集器拦截器已启动');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next
      .handle()
      .pipe(
        tap(() => {
          try {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // 收集请求指标
            const metrics = {
              timestamp: new Date(),
              source: 'http-interceptor',
              layer: 'controller',
              operation: request.route?.path || request.url,
              duration: responseTime,
              statusCode: response.statusCode,
              success: response.statusCode < 400,
              metadata: {
                method: request.method,
                endpoint: request.route?.path || request.url,
                userId: request.user?.id,
                authType: request.authType
              }
            };

            this.collectorService.collectRequestMetrics(metrics);
          } catch (error) {
            // 不要让监控数据收集失败影响正常请求处理
            this.logger.warn('监控数据收集失败', error.message);
          }
        })
      );
  }
}