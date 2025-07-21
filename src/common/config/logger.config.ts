import { LoggerService, LogLevel } from "@nestjs/common";
import pino, { Logger as PinoLogger } from "pino";

/**
 * Pino 日志配置
 * 统一管理日志格式、级别和输出方式，使用 Pino 高性能日志库
 */
export class CustomLogger implements LoggerService {
  private context?: string;
  private pinoLogger: PinoLogger;
  private seen?: Set<any>;

  constructor(context?: string) {
    this.context = context;
    this.pinoLogger = this.createPinoLogger();
  }

  /**
   * 创建 Pino 日志实例
   */
  private createPinoLogger(): PinoLogger {
    const isDevelopment = process.env.NODE_ENV === "development";
    const isProduction = process.env.NODE_ENV === "production";
    
    // 基础配置
    const baseConfig = {
      name: "newstockapi",
      level: this.getLogLevel(),
      formatters: {
        level: (label: string) => {
          return { level: label.toUpperCase() };
        },
        bindings: (bindings: any) => {
          return {
            pid: bindings.pid,
            hostname: bindings.hostname,
          };
        },
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      base: {
        pid: process.pid,
      },
    };

    // 开发环境配置 - 使用 pretty 打印
    if (isDevelopment) {
      return pino({
        ...baseConfig,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
            customColors: "info:green,warn:yellow,error:red,debug:cyan,trace:magenta",
          },
        },
      });
    }

    // 生产环境配置 - 结构化 JSON 输出
    if (isProduction) {
      return pino({
        ...baseConfig,
      });
    }

    // 默认配置
    return pino(baseConfig);
  }

  /**
   * 获取日志级别
   */
  protected getLogLevel(): string {
    const logLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (logLevel) {
      switch (logLevel) {
        case "verbose":
          return "trace";
        case "debug":
          return "debug";
        case "warn":
          return "warn";
        case "error":
          return "error";
        default:
          return "info";
      }
    }

    const env = process.env.NODE_ENV;
    if (env === "production") {
      return "info";
    }
    return "debug";
  }


  /**
   * 记录普通日志
   */
  log(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(message, optionalParams);
    this.pinoLogger.info(
      {
        context: context || this.context || "Application",
        ...data,
      },
      formattedMessage
    );
  }

  /**
   * 记录错误日志
   */
  error(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(message, optionalParams);
    const trace = optionalParams.find(p => typeof p === 'string' && p.includes('Error'));
    
    this.pinoLogger.error(
      {
        context: context || this.context || "Application",
        ...(trace && { trace }),
        ...data,
      },
      formattedMessage
    );
  }

  /**
   * 记录警告日志
   */
  warn(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(message, optionalParams);
    this.pinoLogger.warn(
      {
        context: context || this.context || "Application",
        ...data,
      },
      formattedMessage
    );
  }

  /**
   * 记录调试日志
   */
  debug(message: any, ...optionalParams: any[]): void {
    if (this.isDebugEnabled()) {
      const { formattedMessage, context, data } = this.formatLogMessage(message, optionalParams);
      this.pinoLogger.debug(
        {
          context: context || this.context || "Application",
          ...data,
        },
        formattedMessage
      );
    }
  }

  /**
   * 记录详细日志
   */
  verbose(message: any, ...optionalParams: any[]): void {
    if (this.isVerboseEnabled()) {
      const { formattedMessage, context, data } = this.formatLogMessage(message, optionalParams);
      this.pinoLogger.trace(
        {
          context: context || this.context || "Application",
          ...data,
        },
        formattedMessage
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
   * 格式化日志消息
   */
  private formatLogMessage(message: any, optionalParams: any[]): {
    formattedMessage: string;
    context?: string;
    data?: any;
  } {
    const context = this.getContextFromParams(optionalParams);
    let formattedMessage: string;
    let data: any = {};

    // 初始化循环引用检测
    this.seen = new Set();

    try {
      if (typeof message === "object") {
        // 清理敏感数据
        const sanitizedMessage = sanitizeLogData(message);
        formattedMessage = JSON.stringify(sanitizedMessage, this.circularReplacer(), 2);
        data = sanitizedMessage;
      } else {
        formattedMessage = String(message);
        // 限制消息长度
        if (formattedMessage.length > LoggerConfig.MAX_MESSAGE_LENGTH) {
          formattedMessage = formattedMessage.substring(0, LoggerConfig.MAX_MESSAGE_LENGTH) + "...";
        }
      }

      // 如果上下文是对象，将其添加到数据中
      if (context && typeof context === 'object') {
        const sanitizedContext = sanitizeLogData(context);
        data = { ...data, ...sanitizedContext };
      }

      return {
        formattedMessage,
        context: typeof context === 'string' ? context : undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      };
    } catch (error) {
      return {
        formattedMessage: `[Log Format Error] ${String(message)}`,
        context: typeof context === 'string' ? context : undefined,
        data: { error: "Failed to format log message" },
      };
    } finally {
      // 清理循环引用检测
      this.seen = undefined;
    }
  }

  /**
   * 循环引用替换器
   */
  private circularReplacer() {
    return (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (this.seen?.has(value)) {
          return '[Circular]';
        }
        this.seen?.add(value);
      }
      return value;
    };
  }

  /**
   * 提取上下文信息
   */
  private getContextFromParams(params: any[]): string | object | undefined {
    if (params.length === 0) {
      return undefined;
    }
    // 如果只有一个参数，则假定它是上下文
    if (params.length === 1) {
      return params[0];
    }
    // 如果有多个参数，则返回对象（或最后一个参数，以防万一）
    return params.find(p => typeof p === 'object') || params[params.length - 1];
  }

  /**
   * 检查是否启用调试日志
   */
  protected isDebugEnabled(): boolean {
    const logLevel = process.env.LOG_LEVEL?.toUpperCase();
    const enabledLevels = ["DEBUG", "VERBOSE"];
    return (
      enabledLevels.includes(logLevel || "") ||
      process.env.NODE_ENV === "development"
    );
  }

  /**
   * 检查是否启用详细日志
   */
  protected isVerboseEnabled(): boolean {
    const logLevel = process.env.LOG_LEVEL?.toUpperCase();
    return logLevel === "VERBOSE" || process.env.NODE_ENV === "development";
  }
}

/**
 * 获取日志级别配置
 */
export function getLogLevels(): LogLevel[] {
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
 * 创建带上下文的日志实例
 */
export function createLogger(context: string): CustomLogger {
  return new CustomLogger(context);
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

  // 日志轮转配置（如果使用文件日志）
  ROTATION: {
    maxSize: "20m",
    maxFiles: 10,
    datePattern: "YYYY-MM-DD",
  },
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
 * 测试用日志类（继承自 CustomLogger）
 */
export class TestableLogger extends CustomLogger {
  constructor(context?: string) {
    super(context);
  }

  // 在测试中可以覆盖的方法
  public getLogLevel(): string {
    return super.getLogLevel();
  }

  public isDebugEnabled(): boolean {
    return super.isDebugEnabled();
  }

  public isVerboseEnabled(): boolean {
    return super.isVerboseEnabled();
  }
}