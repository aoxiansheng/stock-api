import { LoggerService, LogLevel } from "@nestjs/common";
import pino, { Logger as PinoLogger } from "pino";
import { SafeLogLevelController } from "../../common/logging/safe-log-level-controller";
import { LogLevel as CustomLogLevel } from "../../common/logging/types";

/**
 * 单例 Pino Logger 实例管理器
 * 避免多个 transport worker 线程冲突
 */
class PinoLoggerSingleton {
  private static instance: PinoLogger | null = null;
  private static isCreating = false;

  static getInstance(): PinoLogger {
    if (!PinoLoggerSingleton.instance && !PinoLoggerSingleton.isCreating) {
      PinoLoggerSingleton.isCreating = true;
      try {
        PinoLoggerSingleton.instance = PinoLoggerSingleton.createPinoLogger();
      } finally {
        PinoLoggerSingleton.isCreating = false;
      }
    }

    // 如果实例还在创建中，等待或返回一个基础的 pino logger
    if (!PinoLoggerSingleton.instance) {
      return pino({ name: "fallback-logger" });
    }

    return PinoLoggerSingleton.instance;
  }

  private static createPinoLogger(): PinoLogger {
    const isDevelopment = process.env.NODE_ENV === "development";
    const isProduction = process.env.NODE_ENV === "production";

    // 基础配置
    const baseConfig = {
      name: "newstockapi",
      level: PinoLoggerSingleton.getLogLevel(),
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

    // 开发环境配置 - 使用稳定的 destination 而不是 transport
    if (isDevelopment) {
      // 创建自定义的 pretty print destination
      const prettyStream = pino.destination({ sync: false });
      const logger = pino(
        {
          ...baseConfig,
        },
        prettyStream,
      );

      return logger;
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

  static getLogLevel(): string {
    const level = process.env.LOG_LEVEL;
    if (
      level &&
      ["fatal", "error", "warn", "info", "debug", "trace"].includes(
        level.toLowerCase(),
      )
    ) {
      return level.toLowerCase();
    }

    // 根据环境设置默认级别
    if (process.env.NODE_ENV === "production") {
      return "info";
    } else if (process.env.NODE_ENV === "test") {
      return "warn";
    }
    return "debug";
  }

  // 重置实例（主要用于测试）
  static reset(): void {
    if (PinoLoggerSingleton.instance) {
      PinoLoggerSingleton.instance = null;
    }
  }
}

/**
 * Pino 日志配置
 * 统一管理日志格式、级别和输出方式，使用 Pino 高性能日志库
 */
export class CustomLogger implements LoggerService {
  protected context?: string;
  private pinoLogger: PinoLogger;
  private seen?: Set<any>;

  constructor(context?: string) {
    this.context = context;
    this.pinoLogger = PinoLoggerSingleton.getInstance();
  }

  /**
   * 记录普通日志
   */
  log(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(
      message,
      optionalParams,
    );
    this.pinoLogger.info(
      {
        context: context || this.context || "Application",
        ...data,
      },
      formattedMessage,
    );
  }

  /**
   * 记录错误日志
   */
  error(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(
      message,
      optionalParams,
    );
    const trace = optionalParams.find(
      (p) => typeof p === "string" && p.includes("Error"),
    );

    this.pinoLogger.error(
      {
        context: context || this.context || "Application",
        ...(trace && { trace }),
        ...data,
      },
      formattedMessage,
    );
  }

  /**
   * 记录警告日志
   */
  warn(message: any, ...optionalParams: any[]): void {
    const { formattedMessage, context, data } = this.formatLogMessage(
      message,
      optionalParams,
    );
    this.pinoLogger.warn(
      {
        context: context || this.context || "Application",
        ...data,
      },
      formattedMessage,
    );
  }

  /**
   * 记录调试日志
   */
  debug(message: any, ...optionalParams: any[]): void {
    if (this.isDebugEnabled()) {
      const { formattedMessage, context, data } = this.formatLogMessage(
        message,
        optionalParams,
      );
      this.pinoLogger.debug(
        {
          context: context || this.context || "Application",
          ...data,
        },
        formattedMessage,
      );
    }
  }

  /**
   * 记录详细日志
   */
  verbose(message: any, ...optionalParams: any[]): void {
    if (this.isVerboseEnabled()) {
      const { formattedMessage, context, data } = this.formatLogMessage(
        message,
        optionalParams,
      );
      this.pinoLogger.trace(
        {
          context: context || this.context || "Application",
          ...data,
        },
        formattedMessage,
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
  private formatLogMessage(
    message: any,
    optionalParams: any[],
  ): {
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

        // 安全处理循环引用
        try {
          formattedMessage = JSON.stringify(
            sanitizedMessage,
            this.circularReplacer(),
            2,
          );
        } catch {
          // 如果JSON.stringify失败，使用更安全的字符串表示
          formattedMessage = `[Object with circular references: ${Object.keys(sanitizedMessage).join(", ")}]`;
        }
        data = sanitizedMessage;
      } else {
        formattedMessage = String(message);
        // 限制消息长度
        if (formattedMessage.length > LoggerConfig.MAX_MESSAGE_LENGTH) {
          formattedMessage =
            formattedMessage.substring(0, LoggerConfig.MAX_MESSAGE_LENGTH) +
            "...";
        }
      }

      // 如果上下文是对象，将其添加到数据中
      if (context && typeof context === "object") {
        const sanitizedContext = sanitizeLogData(context);
        data = { ...data, ...sanitizedContext };
      }

      return {
        formattedMessage,
        context: typeof context === "string" ? context : undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      };
    } catch {
      return {
        formattedMessage: `[Log Format Error] ${String(message)}`,
        context: typeof context === "string" ? context : undefined,
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
      if (typeof value === "object" && value !== null) {
        if (this.seen?.has(value)) {
          return "[Circular]";
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
    return (
      params.find((p) => typeof p === "object") || params[params.length - 1]
    );
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
 * 
 * 根据ENHANCED_LOGGING_ENABLED环境变量决定使用增强版还是标准版Logger
 */
export function createLogger(context: string): CustomLogger {
  const enhancedLoggingEnabled = process.env.ENHANCED_LOGGING_ENABLED === 'true';
  
  if (enhancedLoggingEnabled) {
    try {
      return new EnhancedCustomLogger(context);
    } catch (error) {
      // 如果增强版创建失败，降级到标准版
      console.warn('⚠️ Failed to create EnhancedCustomLogger, falling back to CustomLogger:', error);
      return new CustomLogger(context);
    }
  }
  
  return new CustomLogger(context);
}

/**
 * 创建增强版日志实例（强制使用增强功能）
 */
export function createEnhancedLogger(context: string): EnhancedCustomLogger {
  return new EnhancedCustomLogger(context);
}

/**
 * 创建标准版日志实例（强制使用标准功能）
 */
export function createStandardLogger(context: string): CustomLogger {
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
    return PinoLoggerSingleton.getLogLevel();
  }

  public isDebugEnabled(): boolean {
    return super.isDebugEnabled();
  }

  public isVerboseEnabled(): boolean {
    return super.isVerboseEnabled();
  }
}

/**
 * 增强版自定义日志类
 * 
 * 核心功能：
 * 1. 完全继承CustomLogger的所有功能，保持向后兼容
 * 2. 集成LogLevelController进行级别控制
 * 3. 支持功能开关，可以优雅降级到原始行为
 * 4. 通过环境变量ENHANCED_LOGGING_ENABLED控制启用
 */
export class EnhancedCustomLogger extends CustomLogger {
  private safeController: SafeLogLevelController | null = null;
  private enhancedLoggingEnabled: boolean = false;

  constructor(context?: string) {
    super(context);
    
    // 检查增强日志功能是否启用
    this.enhancedLoggingEnabled = process.env.ENHANCED_LOGGING_ENABLED === 'true';
    
    if (this.enhancedLoggingEnabled) {
      try {
        this.safeController = SafeLogLevelController.getInstance();
      } catch (error) {
        // 如果SafeLogLevelController初始化失败，降级到原始行为
        console.warn('⚠️ SafeLogLevelController initialization failed, falling back to standard logging:', error);
        this.enhancedLoggingEnabled = false;
        this.safeController = null;
      }
    }
  }

  /**
   * 检查是否应该记录指定级别的日志
   */
  private shouldLogWithController(level: CustomLogLevel): boolean {
    if (!this.enhancedLoggingEnabled || !this.safeController) {
      return true; // 降级模式：允许所有日志
    }

    const context = this.context || 'Application';
    return this.safeController.shouldLog(context, level);
  }

  /**
   * 记录普通日志（重写以集成级别控制）
   */
  log(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController('info')) {
      super.log(message, ...optionalParams);
    }
  }

  /**
   * 记录错误日志（重写以集成级别控制）
   */
  error(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController('error')) {
      super.error(message, ...optionalParams);
    }
  }

  /**
   * 记录警告日志（重写以集成级别控制）
   */
  warn(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController('warn')) {
      super.warn(message, ...optionalParams);
    }
  }

  /**
   * 记录调试日志（重写以集成级别控制）
   */
  debug(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController('debug')) {
      super.debug(message, ...optionalParams);
    }
  }

  /**
   * 记录详细日志（重写以集成级别控制）
   */
  verbose(message: any, ...optionalParams: any[]): void {
    if (this.shouldLogWithController('trace')) {
      super.verbose(message, ...optionalParams);
    }
  }

  /**
   * 重写isDebugEnabled以集成级别控制
   */
  protected isDebugEnabled(): boolean {
    if (this.enhancedLoggingEnabled && this.safeController) {
      return this.shouldLogWithController('debug');
    }
    return super.isDebugEnabled();
  }

  /**
   * 重写isVerboseEnabled以集成级别控制
   */
  protected isVerboseEnabled(): boolean {
    if (this.enhancedLoggingEnabled && this.safeController) {
      return this.shouldLogWithController('trace');
    }
    return super.isVerboseEnabled();
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
      context: this.context || 'Application',
      safeControllerStatus: this.safeController?.getStatus(),
    };
  }
}
