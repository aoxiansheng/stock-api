/**
 * 🎯 基础设施指标收集拦截器
 * 
 * 自动收集HTTP请求的性能指标并更新Prometheus指标
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InfrastructureMetricsRegistryService } from '../metrics/infrastructure-metrics-registry.service';
import { createLogger } from '@common/config/logger.config';

@Injectable()
export class InfrastructureMetricsInterceptor implements NestInterceptor {
  private readonly logger = createLogger(InfrastructureMetricsInterceptor.name);

  constructor(
    private readonly metricsRegistry: InfrastructureMetricsRegistryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;
    
    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(method, route, response.statusCode, Date.now() - startTime);
        },
        error: (error) => {
          this.recordMetrics(method, route, 500, Date.now() - startTime, error);
        },
      }),
    );
  }

  private recordMetrics(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    error?: any,
  ): void {
    try {
      // 记录请求总数
      this.metricsRegistry.receiverRequestsTotal.inc({
        method: method.toLowerCase(),
        status: statusCode.toString(),
        operation: 'api_request',
      });

      // 记录请求持续时间
      this.metricsRegistry.receiverProcessingDuration.observe(
        {
          method: method.toLowerCase(),
          operation: 'api_request',
          status: statusCode >= 400 ? 'error' : 'success',
        },
        duration / 1000, // Convert to seconds
      );

      // 如果有错误，记录错误率
      if (error) {
        this.metricsRegistry.receiverErrorRate.set(
          { error_type: error.name || 'UnknownError' },
          1,
        );
      }

      this.logger.debug(`指标记录完成: ${method} ${route} - ${statusCode} (${duration}ms)`);
    } catch (metricsError) {
      // 指标记录失败不应该影响正常的请求处理
      this.logger.warn('指标记录失败', {
        error: metricsError.message,
        method,
        route,
        statusCode,
        duration,
      });
    }
  }
}