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
  },

  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || "300", 10),
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || "10000", 10),
    compressionThreshold: parseInt(
      process.env.CACHE_COMPRESSION_THRESHOLD || "1024",
      10,
    ),
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

