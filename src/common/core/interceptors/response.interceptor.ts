import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger } from "@appcore/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = createLogger(ResponseInterceptor.name);

  // 敏感参数列表，用于URL清理
  private readonly sensitiveParams = [
    'password', 'token', 'key', 'secret', 'auth', 'apikey', 
    'api_key', 'access_token', 'refresh_token', 'jwt', 
    'authorization', 'credentials', 'passwd', 'pwd'
  ];

  constructor(private readonly eventBus: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse<Response>();
        const request = context.switchToHttp().getRequest();
        const statusCode = response.statusCode;

        // ✅ 事件驱动性能监控 - 使用安全清理的URL
        setImmediate(() => {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "response_interceptor",
            metricType: "performance",
            metricName: "http_request_duration",
            metricValue: duration,
            tags: {
              method: req.method,
              url: this.sanitizeUrl(req.url), // 使用安全清理后的URL
              status_code: statusCode,
              status: statusCode < 400 ? "success" : "error",
            },
          });
        });

        // 如果数据已经是标准格式，直接返回
        if (
          data &&
          typeof data === "object" &&
          "statusCode" in data &&
          typeof data.statusCode === "number"
        ) {
          return data;
        }

        // 包装为标准格式 - 统一处理所有端点，包括健康检查和指标端点
        const standardResponse = {
          statusCode,
          message: this.getDefaultMessage(statusCode),
          data: data === undefined ? null : data,
          timestamp: new Date().toISOString(),
        };

        this.logger.debug(
          `Response intercepted for ${request.method} ${request.url}`,
          {
            statusCode,
            hasData: !!data,
            requestId: request["requestId"] || "unknown",
          },
        );

        return standardResponse;
      }),
    );
  }

  /**
   * 清理URL中的敏感参数
   * @param url 原始URL
   * @returns 清理后的安全URL
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      
      // 检查并替换敏感参数
      for (const param of this.sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }
      
      return urlObj.pathname + urlObj.search;
    } catch {
      // 如果URL解析失败，简单处理：保留路径，隐藏查询参数
      const pathOnly = url.split('?')[0];
      return url.includes('?') ? pathOnly + '?[REDACTED]' : pathOnly;
    }
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return "操作成功";
      case 201:
        return "创建成功";
      case 202:
        return "请求已接受";
      case 204:
        return "操作成功";
      default:
        return "请求完成";
    }
  }
}
