import { LoggerService } from "@nestjs/common";
import pino, { Logger as PinoLogger } from "pino";
import { SafeLogLevelController } from "./safe-log-level-controller";
import { LogLevel } from "./types";

/**
 * 全局级别检查函数
 *
 * 用途：快速检查特定服务的特定级别是否应该记录日志
 * 性能：利用SafeLogLevelController的缓存机制，响应时间<1ms
 */
export function shouldLog(context: string, level: LogLevel): boolean {
  // 检查增强日志功能是否启用
  if (process.env.ENHANCED_LOGGING_ENABLED !== "true") {
    return true; // 未启用时，允许所有日志
  }

  try {
    const controller = SafeLogLevelController.getInstance();
    return controller.shouldLog(context, level);
  } catch (error) {
    // 如果出错，允许所有日志（容错设计）
    return true;
  }
}

/**
 * 增强版自定义日志类
 *
 * 特性：
 * 1. 完全实现LoggerService接口
 * 2. 集成SafeLogLevelController进行级别控制
 * 3. 支持降级模式，确保系统稳定性
 * 4. 简化的Pino配置，专注性能
 */
export class EnhancedCustomLogger implements LoggerService {
  protected context?: string;
  private pinoLogger: PinoLogger;
  private safeController: SafeLogLevelController | null = null;
  private enhancedLoggingEnabled: boolean = false;

  constructor(context?: string) {
    this.context = context;

    // 使用简化的pino配置
    this.pinoLogger = pino({
      name: "newstockapi-enhanced",
      level: this.getLogLevel(),
    });

    // 检查增强日志功能是否启用
    this.enhancedLoggingEnabled =
      process.env.ENHANCED_LOGGING_ENABLED === "true";

    if (this.enhancedLoggingEnabled) {
      try {
        this.safeController = SafeLogLevelController.getInstance();
      } catch (error) {
        // 如果SafeLogLevelController初始化失败，降级到原始行为
        console.warn(
          "⚠️ SafeLogLevelController initialization failed, falling back to standard logging:",
          error,
        );
        this.enhancedLoggingEnabled = false;
        this.safeController = null;
      }
    }
  }

  /**
   * 检查是否应该记录指定级别的日志
   */
  private shouldLogWithController(level: LogLevel): boolean {
    if (!this.enhancedLoggingEnabled || !this.safeController) {
      return true; // 降级模式：允许所有日志
    }

    const context = this.context || "Application";
    return this.safeController.shouldLog(context, level);
  }

  /**
   * 记录普通日志
   */
  log(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController("info")) {
      this.pinoLogger.info(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message),
      );
    }
  }

  /**
   * 记录错误日志
   */
  error(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController("error")) {
      this.pinoLogger.error(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message),
      );
    }
  }

  /**
   * 记录警告日志
   */
  warn(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController("warn")) {
      this.pinoLogger.warn(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message),
      );
    }
  }

  /**
   * 记录调试日志
   */
  debug(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController("debug")) {
      this.pinoLogger.debug(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message),
      );
    }
  }

  /**
   * 记录详细日志
   */
  verbose(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController("trace")) {
      this.pinoLogger.trace(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message),
      );
    }
  }

  /**
   * 设置日志上下文
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 简化的日志级别获取
   */
  private getLogLevel(): string {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    if (
      level &&
      ["fatal", "error", "warn", "info", "debug", "trace"].includes(level)
    ) {
      return level;
    }

    // 根据环境设置默认级别
    if (process.env.NODE_ENV === "production") {
      return "info";
    } else if (process.env.NODE_ENV === "test") {
      return "warn";
    }
    return "debug";
  }

  /**
   * 获取增强日志状态（用于诊断）
   */
  public getEnhancedLoggingStatus(): {
    enabled: boolean;
    controllerReady: boolean;
    context: string;
    safeControllerStatus?: any;
  } {
    return {
      enabled: this.enhancedLoggingEnabled,
      controllerReady: this.safeController !== null,
      context: this.context || "Application",
      safeControllerStatus: this.safeController?.getStatus(),
    };
  }
}

/**
 * 日志配置常量
 */
export const LoggerConfig = {
  // 最大日志消息长度（防止日志过大）
  MAX_MESSAGE_LENGTH: 10000,

  // 敏感字段列表（需要脱敏）
  SENSITIVE_FIELDS: [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "appKey",
    "accessKey",
    "secretKey",
    "apiKey",
    "secret",
    "authorization",
  ],
};

/**
 * 脱敏处理工具函数
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  function maskValue(value: string): string {
    if (value.length <= 4) {
      return "****";
    }
    return value.substring(0, 2) + "****" + value.substring(value.length - 2);
  }

  function processObject(obj: any): any {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();

        // 检查是否为敏感字段
        if (
          LoggerConfig.SENSITIVE_FIELDS.some((field) =>
            lowerKey.includes(field.toLowerCase()),
          )
        ) {
          if (typeof obj[key] === "string") {
            obj[key] = maskValue(obj[key]);
          } else {
            obj[key] = "[MASKED]";
          }
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          obj[key] = processObject(obj[key]);
        }
      }
    }
    return obj;
  }

  return processObject(sanitized);
}

/**
 * 获取日志级别配置（兼容函数）
 */
export function getLogLevels(): (
  | "error"
  | "warn"
  | "log"
  | "debug"
  | "verbose"
)[] {
  const env = process.env.NODE_ENV;
  const logLevel = process.env.LOG_LEVEL?.toUpperCase();

  if (env === "production") {
    return ["error", "warn", "log"];
  }

  // 如果设置了 LOG_LEVEL，优先使用它（包括测试环境）
  if (logLevel) {
    switch (logLevel) {
      case "VERBOSE":
        return ["error", "warn", "log", "debug", "verbose"];
      case "DEBUG":
        return ["error", "warn", "log", "debug"];
      case "WARN":
        return ["error", "warn"];
      case "ERROR":
        return ["error"];
      default:
        return ["error", "warn", "log", "debug"];
    }
  }

  // 默认情况下，测试和开发环境包含所有级别
  if (env === "test" || env === "development") {
    return ["error", "warn", "log", "debug", "verbose"];
  }

  // 其他环境默认配置
  return ["error", "warn", "log", "debug"];
}

/**
 * 创建带上下文的日志实例 - 核心函数
 *
 * 这是替换原 createLogger 函数的核心入口点
 *
 * @param context - 日志上下文（通常是服务名）
 * @returns EnhancedCustomLogger 实例，完全兼容 LoggerService 接口
 */
export function createLogger(context: string): EnhancedCustomLogger {
  return new EnhancedCustomLogger(context);
}
