import { createLogger } from "@common/modules/logging";

/**
 * 认证模块日志配置和优化工具
 * 根据环境和性能要求优化日志级别
 */
export class AuthLoggingUtil {
  private static readonly isProduction = process.env.NODE_ENV === "production";
  private static readonly isHighTraffic = process.env.AUTH_HIGH_TRAFFIC_MODE === "true";
  private static readonly enablePerformanceOptimization = 
    process.env.AUTH_OPTIMIZE_LOGGING === "true" || 
    AuthLoggingUtil.isProduction;

  /**
   * 创建经过优化的认证模块日志器
   * 在生产环境自动减少详细日志
   */
  static createOptimizedLogger(name: string) {
    const logger = createLogger(name);

    return {
      // 保留必要的日志级别
      error: logger.error.bind(logger),
      warn: logger.warn.bind(logger),
      log: logger.log.bind(logger),

      // 条件化的调试日志
      debug: AuthLoggingUtil.enablePerformanceOptimization
        ? () => {} // 在生产环境禁用 debug 日志
        : logger.debug.bind(logger),

      // 高频操作专用日志 - 仅在非高流量模式下记录
      highFrequency: (message: string, data?: any) => {
        if (!AuthLoggingUtil.isHighTraffic) {
          logger.debug(message, data);
        }
      },

      // 性能敏感操作日志 - 异步记录，不阻塞主流程
      asyncLog: (level: "log" | "warn" | "error", message: string, data?: any) => {
        setImmediate(() => {
          logger[level](message, data);
        });
      },

      // 条件化详细日志 - 仅在开发环境或明确启用时记录
      verbose: (message: string, data?: any) => {
        if (!AuthLoggingUtil.isProduction && process.env.AUTH_VERBOSE_LOGGING === "true") {
          logger.log(message, data);
        }
      },
    };
  }

  /**
   * 检查是否应该记录详细日志
   */
  static shouldLogVerbose(): boolean {
    return !AuthLoggingUtil.isProduction || process.env.AUTH_DEBUG_MODE === "true";
  }

  /**
   * 检查是否应该记录高频操作日志
   */
  static shouldLogHighFrequency(): boolean {
    return !AuthLoggingUtil.isHighTraffic;
  }

  /**
   * 检查是否应该记录性能日志
   */
  static shouldLogPerformance(): boolean {
    return !AuthLoggingUtil.enablePerformanceOptimization || 
           process.env.AUTH_PERFORMANCE_LOGGING === "true";
  }

  /**
   * 安全日志记录 - 避免记录敏感信息
   */
  static sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // 移除敏感字段
    const sensitiveFields = [
      'password', 'accessToken', 'refreshToken', 'secret',
      'accessToken', 'auth', 'authorization', 'credentials'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // 截断长字符串以减少日志大小
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + '...[TRUNCATED]';
      }
    });

    return sanitized;
  }

  /**
   * 智能日志采样 - 在高频场景下降低日志量
   */
  static shouldSampleLog(operation: string, sampleRate: number = 0.1): boolean {
    if (!AuthLoggingUtil.isHighTraffic) {
      return true; // 非高流量模式下记录所有日志
    }

    // 基于操作类型和随机数进行采样
    const hash = AuthLoggingUtil.simpleHash(operation);
    return (hash % 100) < (sampleRate * 100);
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}