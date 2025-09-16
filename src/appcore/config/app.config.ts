/**
 * 应用统一配置管理
 * 整合各模块配置，提供类型安全的配置访问
 */

import { ConfigService } from "@nestjs/config";

export interface AppConfig {
  // 应用基础配置
  app: {
    name: string;
    version: string;
    environment: "development" | "production" | "test";
    port: number;
    globalPrefix: string;
  };

  // 数据库配置
  database: {
    mongodb: {
      uri: string;
      options?: Record<string, any>;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
    };
  };

  // 安全配置
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    apiKey: {
      headerName: string;
      accessTokenHeaderName: string;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    // 新增：从Alert模块迁移的认证超时配置
    session: {
      lifetime: number;
      idleTimeout: number;
      lockoutDuration: number;
    };
    rateLimit: {
      window: number;
    };
  };

  // 缓存配置
  cache: {
    defaultTtl: number;
    maxItems: number;
    compressionThreshold: number;
  };

  // 告警配置
  alert: {
    enabled: boolean;
    notificationChannels: string[];
    rateLimits: {
      triggerEvaluation: number;
      notification: number;
    };
  };

  // 通知配置
  notification: {
    enabled: boolean;
    batchProcessing: boolean;
    retryMechanism: boolean;
    priorityQueue: boolean;
    metricsCollection: boolean;
    defaultChannels: string[];
    timeouts: {
      email: number;
      sms: number;
      webhook: number;
      slack: number;
      dingtalk: number;
      default: number;
    };
    retry: {
      maxAttempts: number;
      initialDelay: number;
      backoffMultiplier: number;
      maxDelay: number;
    };
    batch: {
      defaultSize: number;
      maxSize: number;
      maxConcurrency: number;
      timeout: number;
    };
  };

  // 监控配置
  monitoring: {
    enabled: boolean;
    performanceMonitoring: boolean;
    metricsEndpoint: string;
  };
}

/**
 * 配置工厂函数
 * 基于环境变量和默认值创建配置对象
 */
export const createAppConfig = (): Partial<AppConfig> => ({
  app: {
    name: process.env.APP_NAME || "Smart Stock Data API",
    version: process.env.APP_VERSION || "1.0.0",
    environment: (process.env.NODE_ENV as any) || "development",
    port: parseInt(process.env.PORT || "3000", 10),
    globalPrefix: process.env.API_PREFIX || "api/v1",
  },

  database: {
    mongodb: {
      uri:
        process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data",
    },
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD,
    },
  },

  security: {
    jwt: {
      secret: process.env.JWT_SECRET || "dev-secret-key",
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    apiKey: {
      headerName: "X-App-Key",
      accessTokenHeaderName: "X-Access-Token",
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
    },
    // 新增：从Alert模块迁移的认证超时配置
    session: {
      lifetime: parseInt(process.env.SESSION_LIFETIME, 10) || 86400,
      idleTimeout: parseInt(process.env.IDLE_SESSION_TIMEOUT, 10) || 1800,
      lockoutDuration: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION, 10) || 1800,
    },
    rateLimit: {
      window: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60,
    },
  },


  alert: {
    enabled: process.env.ALERT_ENABLED !== "false",
    notificationChannels: process.env.ALERT_CHANNELS?.split(",") || ["email"],
    rateLimits: {
      triggerEvaluation: parseInt(
        process.env.ALERT_TRIGGER_RATE_LIMIT || "5",
        10,
      ),
      notification: parseInt(
        process.env.ALERT_NOTIFICATION_RATE_LIMIT || "10",
        10,
      ),
    },
  },

  // 通知系统全局配置
  notification: {
    enabled: process.env.NOTIFICATION_ENABLED !== "false",
    batchProcessing: process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING !== "false",
    retryMechanism: process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM !== "false",
    priorityQueue: process.env.NOTIFICATION_ENABLE_PRIORITY_QUEUE !== "false",
    metricsCollection: process.env.NOTIFICATION_ENABLE_METRICS_COLLECTION !== "false",
    defaultChannels: process.env.NOTIFICATION_DEFAULT_CHANNELS?.split(",") || ["email", "log"],
    timeouts: {
      email: parseInt(process.env.NOTIFICATION_EMAIL_TIMEOUT || "30000", 10),
      sms: parseInt(process.env.NOTIFICATION_SMS_TIMEOUT || "5000", 10),
      webhook: parseInt(process.env.NOTIFICATION_WEBHOOK_TIMEOUT || "10000", 10),
      slack: parseInt(process.env.NOTIFICATION_SLACK_TIMEOUT || "15000", 10),
      dingtalk: parseInt(process.env.NOTIFICATION_DINGTALK_TIMEOUT || "10000", 10),
      default: parseInt(process.env.NOTIFICATION_DEFAULT_TIMEOUT || "15000", 10),
    },
    retry: {
      maxAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS || "3", 10),
      initialDelay: parseInt(process.env.NOTIFICATION_INITIAL_RETRY_DELAY || "1000", 10),
      backoffMultiplier: parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER || "2"),
      maxDelay: parseInt(process.env.NOTIFICATION_MAX_RETRY_DELAY || "30000", 10),
    },
    batch: {
      defaultSize: parseInt(process.env.NOTIFICATION_DEFAULT_BATCH_SIZE || "10", 10),
      maxSize: parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE || "100", 10),
      maxConcurrency: parseInt(process.env.NOTIFICATION_MAX_CONCURRENCY || "5", 10),
      timeout: parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT || "60000", 10),
    },
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== "false",
    performanceMonitoring: process.env.PERFORMANCE_MONITORING !== "false",
    metricsEndpoint: process.env.METRICS_ENDPOINT || "/metrics",
  },
});

/**
 * NestJS Config 工厂函数
 */
export const appConfig = () => createAppConfig();

