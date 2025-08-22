import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";

import { createLogger } from "@common/config/logger.config";
import {
  PERFORMANCE_MONITORING_KEY,
  PerformanceMonitoringConfig,
} from "@common/core/decorators/performance-monitoring.decorator";

import { MetricsPerformanceService } from "../services/metrics-performance.service";

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = createLogger(PerformanceInterceptor.name);

  constructor(
    private readonly performanceMonitor: MetricsPerformanceService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 检查是否需要性能监控
    const monitoringConfig = this.getMonitoringConfig(context);
    if (!monitoringConfig.enabled) {
      return next.handle();
    }

    // 检查采样率
    if (Math.random() > monitoringConfig.sampleRate) {
      return next.handle();
    }

    const startTime = Date.now();
    const method = request?.method;

    // 改进端点路径获取逻辑，确保在测试环境中也能正确获取路径
    let endpoint = request?.route?.path || request?.url || "unknown";

    // 如果是测试环境且路径包含查询参数，提取基础路径
    if (endpoint.includes("?")) {
      endpoint = endpoint.split("?")[0];
    }

    endpoint = this.normalizeEndpoint(endpoint);

    // 使用已有的请求ID（由RequestTrackingInterceptor设置）
    const requestId = (request as any).requestId || this.generateRequestId();
    if (!request["requestId"]) {
      request["requestId"] = requestId;
    }

    // 设置性能相关的响应头
    this.setResponseHeader(response, "x-response-time", "0ms");

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.handleRequestComplete(
          endpoint,
          method,
          duration,
          true,
          requestId,
          response,
          monitoringConfig,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.handleRequestComplete(
          endpoint,
          method,
          duration,
          false,
          requestId,
          response,
          monitoringConfig,
        );

        this.logger.error(`请求失败: ${method} ${endpoint} - ${duration}ms`, {
          requestId,
          duration,
          endpoint,
          method,
          error: error?.message,
          stack: error?.stack,
        });

        throw error;
      }),
    );
  }

  private handleRequestComplete(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean,
    requestId: string,
    response: Response,
    monitoringConfig: PerformanceMonitoringConfig,
  ): void {
    // 根据配置决定是否记录指标
    if (monitoringConfig.recordMetrics) {
      // 异步调用性能监控记录，但不阻塞主流程
      this.performanceMonitor
        .recordRequest(endpoint, method, duration, success)
        .catch(() => {
          // 忽略性能监控记录失败的错误
        });
    }

    // 记录慢请求
    if (
      monitoringConfig.trackSlowRequests &&
      duration > monitoringConfig.slowRequestThreshold
    ) {
      this.logger.warn(`慢请求检测: ${method} ${endpoint} - ${duration}ms`, {
        requestId,
        duration,
        endpoint,
        method,
      });
    }

    // 设置性能头信息
    this.setResponseHeader(response, "x-response-time", `${duration}ms`);
    if (success) {
      this.setResponseHeader(response, "server-timing", `app;dur=${duration}`);
    }
  }

  /**
   * 获取性能监控配置
   */
  private getMonitoringConfig(
    context: ExecutionContext,
  ): PerformanceMonitoringConfig {
    const defaultConfig: PerformanceMonitoringConfig = {
      enabled: true,
      trackSlowRequests: true,
      slowRequestThreshold: 1000,
      recordMetrics: true,
      sampleRate: 1.0,
    };

    // 检查方法级别的配置
    const methodConfig = this.reflector.get<PerformanceMonitoringConfig>(
      PERFORMANCE_MONITORING_KEY,
      context.getHandler(),
    );

    // 检查控制器级别的配置
    const controllerConfig = this.reflector.get<PerformanceMonitoringConfig>(
      PERFORMANCE_MONITORING_KEY,
      context.getClass(),
    );

    // 合并配置，优先级：方法 > 控制器 > 默认
    return {
      ...defaultConfig,
      ...controllerConfig,
      ...methodConfig,
    };
  }

  /**
   * 检查是否为健康检查或简单端点
   */
  private isSimpleEndpoint(endpoint: string): boolean {
    const simpleEndpoints = [
      "/api/v1/monitoring/health",
      "/api/v1/monitoring/status",
      "/docs",
      "/favicon.ico",
    ];

    return simpleEndpoints.some((simple) => endpoint.includes(simple));
  }

  private setResponseHeader(
    response: Response,
    name: string,
    value: string,
  ): void {
    try {
      if (response && response.setHeader) {
        response.setHeader(name, value);
      }
    } catch {
      // 忽略设置头部失败的错误
    }
  }

  private normalizeEndpoint(path: string): string {
    if (!path) return "unknown";

    // 规范化路径，移除动态参数
    // 注意：先匹配更具体的模式，避免短模式先匹配导致长模式无法匹配
    return path
      .replace(
        /\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
        "/:uuid",
      ) // UUID (最具体的模式)
      .replace(/\/[a-f0-9]{24}/g, "/:id") // MongoDB ObjectId (24个十六进制字符)
      .replace(/\/\d+/g, "/:id") // 数字ID (最通用的模式)
      .replace(/\?.+$/, ""); // 查询参数
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
