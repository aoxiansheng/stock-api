import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { createLogger } from "@common/config/logger.config";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = createLogger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const label = `ResponseInterceptor耗时-${req.method} ${req.url}`;
    console.time(label);
    return next.handle().pipe(
      map((data) => {
        console.timeEnd(label);
        const response = context.switchToHttp().getResponse<Response>();
        const request = context.switchToHttp().getRequest();
        const statusCode = response.statusCode;

        // 如果数据已经是标准格式，直接返回
        if (data && typeof data === "object" && "statusCode" in data) {
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
