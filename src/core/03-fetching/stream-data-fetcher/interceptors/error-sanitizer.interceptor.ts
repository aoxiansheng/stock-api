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
import { createLogger } from "@common/logging";

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

  // 需要脱敏的敏感信息正则表达式
  private readonly sensitivePatterns = [
    // 文件路径
    /\/[^\/\s]+\/[^\/\s]+/g,
    // 数据库连接信息
    /mongodb:\/\/[^\s]+/g,
    /redis:\/\/[^\s]+/g,
    // API密钥片段
    /[a-zA-Z0-9]{32,}/g,
    // IP地址（内网）
    /192\.168\.\d+\.\d+/g,
    /10\.\d+\.\d+\.\d+/g,
    /172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/g,
    // 端口号
    /:\d{4,5}/g,
    // 错误堆栈中的具体行号和文件信息
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
   */
  private sanitizeError(error: any): HttpException {
    let sanitizedMessage = error.message || "未知错误";

    // 应用脱敏规则
    for (const pattern of this.sensitivePatterns) {
      sanitizedMessage = sanitizedMessage.replace(pattern, "[REDACTED]");
    }

    // 根据错误类型返回适当的HTTP状态和消息
    if (error instanceof ServiceUnavailableException) {
      return new ServiceUnavailableException(
        this.getGenericMessage("service_unavailable"),
      );
    }

    if (error instanceof BadRequestException) {
      return new BadRequestException(this.getGenericMessage("bad_request"));
    }

    // 连接相关错误
    if (
      sanitizedMessage.includes("connection") ||
      sanitizedMessage.includes("连接")
    ) {
      return new ServiceUnavailableException(
        this.getGenericMessage("connection_error"),
      );
    }

    // 超时错误
    if (
      sanitizedMessage.includes("timeout") ||
      sanitizedMessage.includes("超时")
    ) {
      return new ServiceUnavailableException(this.getGenericMessage("timeout"));
    }

    // 权限相关错误
    if (
      sanitizedMessage.includes("permission") ||
      sanitizedMessage.includes("unauthorized") ||
      sanitizedMessage.includes("权限")
    ) {
      return new BadRequestException(
        this.getGenericMessage("permission_denied"),
      );
    }

    // 配置错误
    if (
      sanitizedMessage.includes("config") ||
      sanitizedMessage.includes("配置")
    ) {
      return new ServiceUnavailableException(
        this.getGenericMessage("configuration_error"),
      );
    }

    // Provider相关错误
    if (
      sanitizedMessage.includes("provider") ||
      sanitizedMessage.includes("提供商")
    ) {
      return new BadRequestException(this.getGenericMessage("provider_error"));
    }

    // 默认处理：返回通用错误信息
    return new ServiceUnavailableException(
      this.getGenericMessage("internal_error"),
    );
  }

  /**
   * 获取通用错误消息（中文）
   */
  private getGenericMessage(errorType: string): string {
    const messages = {
      service_unavailable: "服务暂时不可用，请稍后重试",
      bad_request: "请求参数有误，请检查后重试",
      connection_error: "连接服务失败，请稍后重试",
      timeout: "请求超时，请稍后重试",
      permission_denied: "权限不足，请检查认证信息",
      configuration_error: "服务配置异常，请联系管理员",
      provider_error: "数据提供商服务异常，请稍后重试",
      internal_error: "系统内部错误，请稍后重试",
    };

    return messages[errorType] || messages.internal_error;
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

  /**
   * 检查是否为敏感错误（用于额外告警）
   */
  private isSensitiveError(error: any): boolean {
    const sensitiveKeywords = [
      "password",
      "secret",
      "token",
      "key",
      "密码",
      "密钥",
      "令牌",
      "database",
      "connection string",
      "数据库",
      "连接字符串",
    ];

    const message = (error.message || "").toLowerCase();
    return sensitiveKeywords.some((keyword) => message.includes(keyword));
  }
}
