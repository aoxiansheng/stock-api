import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SYSTEM_STATUS_EVENTS } from '../../contracts/events/system-status.events';
import { createLogger } from '../../../app/config/logger.config';

/**
 * 🎯 API监控拦截器
 * 
 * 职责：捕获API请求生命周期并发送事件
 * 设计理念：非阻塞、异步事件发送、错误隔离
 */
@Injectable()
export class ApiMonitoringInterceptor implements NestInterceptor {
  private readonly logger = createLogger(ApiMonitoringInterceptor.name);

  constructor(private readonly eventBus: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // 发送请求开始事件（异步，不阻塞）
    setImmediate(() => {
      this.emitEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_STARTED, {
        timestamp: new Date(),
        source: 'api',
        endpoint: request.path,
        method: request.method,
        requestId,
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          contentLength: request.headers['content-length'],
          referer: request.headers['referer']
        }
      });
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        
        // 发送请求完成事件
        setImmediate(() => {
          this.emitEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_COMPLETED, {
            timestamp: new Date(),
            source: 'api',
            endpoint: request.path,
            method: request.method,
            statusCode: response.statusCode,
            duration,
            requestId,
            metadata: {
              responseSize: response.get('content-length') || this.estimateResponseSize(data),
              cacheHit: response.get('x-cache-hit') === 'true',
              processingTime: duration
            }
          });
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // 发送请求错误事件
        setImmediate(() => {
          this.emitEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_ERROR, {
            timestamp: new Date(),
            source: 'api',
            endpoint: request.path,
            method: request.method,
            statusCode: error.status || 500,
            duration,
            requestId,
            metadata: {
              errorType: error.constructor.name,
              errorMessage: error.message,
              stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              processingTime: duration
            }
          });
        });
        
        throw error;
      })
    );
  }

  /**
   * 安全的事件发送，确保不影响主请求流程
   */
  private emitEvent(eventType: string, eventData: any) {
    try {
      this.eventBus.emit(eventType, eventData);
    } catch (error) {
      // 静默处理事件发送错误，记录调试信息但不影响请求
      this.logger.debug('API监控事件发送失败', {
        eventType,
        error: error.message,
        endpoint: eventData.endpoint,
        method: eventData.method
      });
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 估算响应大小
   */
  private estimateResponseSize(data: any): number {
    try {
      if (data === null || data === undefined) {
        return 0;
      }
      
      if (typeof data === 'string') {
        return Buffer.byteLength(data, 'utf8');
      }
      
      if (typeof data === 'object') {
        return Buffer.byteLength(JSON.stringify(data), 'utf8');
      }
      
      return Buffer.byteLength(String(data), 'utf8');
    } catch (error) {
      // 如果估算失败，返回0
      return 0;
    }
  }

  /**
   * 检查是否应该监控此请求
   */
  private shouldMonitorRequest(request: any): boolean {
    const path = request.path;
    
    // 跳过健康检查和内部端点
    if (path.includes('/health') || 
        path.includes('/metrics') || 
        path.includes('/_internal') ||
        path.includes('/swagger') ||
        path.includes('/favicon.ico')) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取拦截器统计信息
   */
  getInterceptorMetrics() {
    return {
      name: 'ApiMonitoringInterceptor',
      status: 'active',
      description: 'API请求生命周期监控拦截器',
      eventsSupported: [
        'API_REQUEST_STARTED',
        'API_REQUEST_COMPLETED', 
        'API_REQUEST_ERROR'
      ]
    };
  }
}