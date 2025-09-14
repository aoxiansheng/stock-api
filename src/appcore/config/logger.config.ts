import { LoggerService } from "@nestjs/common";
import pino, { Logger as PinoLogger } from "pino";
import { SafeLogLevelController } from "../../common/logging/safe-log-level-controller";
import { LogLevel as CustomLogLevel } from "../../common/logging/types";

// 临时导出兼容函数（用于过渡期间）
export { sanitizeLogData, LoggerConfig, getLogLevels } from "../../common/logging/utils";

/**
 * 简化版CustomLogger基础类 - 兼容层
 * 
 * 职责：
 * 1. 提供LoggerService接口的最小实现
 * 2. 保持与现有代码的API兼容性
 * 3. 作为EnhancedCustomLogger的基础类
 */
export class CustomLogger implements LoggerService {
  protected context?: string;
  private pinoLogger: PinoLogger;

  constructor(context?: string) {
    this.context = context;
    // 使用简化的pino配置
    this.pinoLogger = pino({
      name: "newstockapi-compat",
      level: this.getLogLevel(),
    });
  }

  /**
   * 记录普通日志
   */
  log(message: any, ...optionalParams: any[]): void {
    this.pinoLogger.info(
      {
        context: this.context || "Application",
        ...(optionalParams.length && { params: optionalParams }),
      },
      String(message)
    );
  }

  /**
   * 记录错误日志
   */
  error(message: any, ...optionalParams: any[]): void {
    this.pinoLogger.error(
      {
        context: this.context || "Application",
        ...(optionalParams.length && { params: optionalParams }),
      },
      String(message)
    );
  }

  /**
   * 记录警告日志
   */
  warn(message: any, ...optionalParams: any[]): void {
    this.pinoLogger.warn(
      {
        context: this.context || "Application",
        ...(optionalParams.length && { params: optionalParams }),
      },
      String(message)
    );
  }

  /**
   * 记录调试日志
   */
  debug(message: any, ...optionalParams: any[]): void {
    if (this.isDebugEnabled()) {
      this.pinoLogger.debug(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message)
      );
    }
  }

  /**
   * 记录详细日志
   */
  verbose(message: any, ...optionalParams: any[]): void {
    if (this.isVerboseEnabled()) {
      this.pinoLogger.trace(
        {
          context: this.context || "Application",
          ...(optionalParams.length && { params: optionalParams }),
        },
        String(message)
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
    if (level && ["fatal", "error", "warn", "info", "debug", "trace"].includes(level)) {
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
 * 创建带上下文的日志实例 - 主要兼容函数
 * 
 * 根据ENHANCED_LOGGING_ENABLED环境变量决定使用增强版还是标准版Logger
 * 这是整个兼容层的核心入口点，保持API完全兼容
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