/**
 * 性能监控拦截器
 * 基于重构后的三层架构，集成到现有的监控体系中
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

import { createLogger } from '../../../app/config/logger.config';
import { CollectorService } from '../../collector/collector.service';
// MetricsRegistryService已移除，使用CollectorService的事件驱动架构

@Injectable()
export class InfrastructureInterceptor implements NestInterceptor {
  private readonly logger = createLogger(InfrastructureInterceptor.name);

  constructor(
    private readonly collectorService: CollectorService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    
    // 获取路由和方法信息
    const route = request.route?.path || request.url;
    const method = request.method;
    const handler = context.getHandler();
    const controller = context.getClass();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.recordPerformanceMetrics({
            route,
            method,
            duration,
            statusCode: response.statusCode,
            success: true,
            handler: handler.name,
            controller: controller.name,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.recordPerformanceMetrics({
            route,
            method,
            duration,
            statusCode: response.statusCode || 500,
            success: false,
            handler: handler.name,
            controller: controller.name,
            error: error.message,
          });
        },
      })
    );
  }

  private async recordPerformanceMetrics(data: {
    route: string;
    method: string;
    duration: number;
    statusCode: number;
    success: boolean;
    handler: string;
    controller: string;
    error?: string;
  }) {
    try {
      // 通过CollectorService收集性能数据（事件驱动方式）
      await this.collectorService.collectRequestMetrics({
        timestamp: new Date(),
        source: 'infrastructure-interceptor',
        layer: 'collector',
        operation: `${data.method} ${data.route}`,
        duration: data.duration,
        statusCode: data.statusCode,
        success: data.success,
        metadata: {
          method: data.method,
          handler: data.handler,
          controller: data.controller,
          error: data.error,
        },
      });

      // 记录慢请求日志
      if (data.duration > 1000) { // 超过1秒的请求
        this.logger.warn('慢请求检测', {
          route: data.route,
          method: data.method,
          duration: data.duration,
          statusCode: data.statusCode,
          controller: data.controller,
          handler: data.handler,
        });
      }

    } catch (error) {
      this.logger.error('性能指标记录失败', {
        error: error.message,
        route: data.route,
        method: data.method,
      });
    }
  }
}