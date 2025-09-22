import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { createLogger } from "@common/logging/index";

/**
 * 错误信息脱敏拦截器
 *
 * 功能：
 * - 移除敏感的技术细节
 * - 统一错误响应格式
 * - 防止信息泄露攻击
 * - 记录完整错误信息供调试使用
 */
@Injectable()
export class ErrorSanitizerInterceptor implements NestInterceptor {
  private readonly logger = createLogger(ErrorSanitizerInterceptor.name);

  // 核心敏感信息脱敏规则（简化版）
  private readonly sensitivePatterns = [
    // 数据库连接字符串
    /mongodb:\/\/[^\s]+/g,
    /redis:\/\/[^\s]+/g,
    // API密钥和令牌（长字符串）
    /[a-zA-Z0-9]{32,}/g,
    // 内网IP地址
    /192\.168\.\d+\.\d+/g,
    /10\.\d+\.\d+\.\d+/g,
    /172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/g,
    // 文件系统路径
    /\/[^\/\s]+\/[^\/\s]+/g,
    // 错误堆栈信息
    /at\s+[^\s]+\s+\([^)]+:\d+:\d+\)/g,
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();

        // 记录完整错误信息供调试使用（包含敏感信息）
        this.logger.error("StreamDataFetcher错误详情", {
          url: request.url,
          method: request.method,
          userAgent: request.headers["user-agent"],
          clientIP: this.getClientIP(request),
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });

        // 创建脱敏后的用户响应
        const sanitizedError = this.sanitizeError(error);

        return throwError(() => sanitizedError);
      }),
    );
  }

  /**
   * 错误信息脱敏处理
   * 简化后的5种核心错误类型
   */
  private sanitizeError(error: any): HttpException {
    let sanitizedMessage = error.message || "未知错误";

    // 应用脱敏规则
    for (const pattern of this.sensitivePatterns) {
      sanitizedMessage = sanitizedMessage.replace(pattern, "[REDACTED]");
    }

    // 1. 客户端错误 (合并 bad_request + permission_denied)
    if (
      error instanceof BadRequestException ||
      sanitizedMessage.includes("permission") ||
      sanitizedMessage.includes("unauthorized") ||
      sanitizedMessage.includes("权限") ||
      sanitizedMessage.includes("invalid") ||
      sanitizedMessage.includes("参数")
    ) {
      return new BadRequestException(this.getGenericMessage("client_error"));
    }

    // 2. 连接错误 (保留独立分类)
    if (
      sanitizedMessage.includes("connection") ||
      sanitizedMessage.includes("连接") ||
      sanitizedMessage.includes("connect")
    ) {
      return new ServiceUnavailableException(
        this.getGenericMessage("connection_error"),
      );
    }

    // 3. 超时错误 (保留独立分类)
    if (
      sanitizedMessage.includes("timeout") ||
      sanitizedMessage.includes("超时")
    ) {
      return new ServiceUnavailableException(this.getGenericMessage("timeout"));
    }

    // 4. 提供商错误 (保留独立分类)
    if (
      sanitizedMessage.includes("provider") ||
      sanitizedMessage.includes("提供商") ||
      sanitizedMessage.includes("data source") ||
      sanitizedMessage.includes("数据源")
    ) {
      return new ServiceUnavailableException(this.getGenericMessage("provider_error"));
    }

    // 5. 服务器错误 (合并 service_unavailable + internal_error + configuration_error)
    return new ServiceUnavailableException(
      this.getGenericMessage("server_error"),
    );
  }

  /**
   * 获取通用错误消息（简化后的5种核心类型）
   */
  private getGenericMessage(errorType: string): string {
    const messages = {
      client_error: "请求参数有误或权限不足，请检查后重试",
      connection_error: "连接服务失败，请稍后重试",
      timeout: "请求超时，请稍后重试",
      provider_error: "数据提供商服务异常，请稍后重试",
      server_error: "服务暂时不可用，请稍后重试",
    };

    return messages[errorType] || messages.server_error;
  }

  /**
   * 获取客户端IP（用于日志记录）
   */
  private getClientIP(request: any): string {
    const forwarded = request.headers["x-forwarded-for"];
    const realIP = request.headers["x-real-ip"];
    const remoteAddr =
      request.connection?.remoteAddress || request.socket?.remoteAddress;

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    if (realIP) {
      return realIP.trim();
    }

    return remoteAddr || "unknown";
  }

}
