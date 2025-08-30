/**
 * 应用启动配置
 * 定义启动阶段的配置参数
 */

export interface StartupConfig {
  // 启动超时配置
  timeout: {
    database: number;      // 数据库连接超时（毫秒）
    cache: number;         // 缓存连接超时（毫秒）
    services: number;      // 服务初始化超时（毫秒）
    total: number;         // 总启动超时（毫秒）
  };

  // 重试配置
  retry: {
    maxAttempts: number;   // 最大重试次数
    delay: number;         // 重试延迟（毫秒）
    backoff: number;       // 退避倍数
  };

  // 健康检查配置
  healthCheck: {
    enabled: boolean;
    interval: number;      // 检查间隔（毫秒）
    timeout: number;       // 检查超时（毫秒）
    retries: number;       // 失败重试次数
  };

  // 优雅关闭配置
  shutdown: {
    timeout: number;       // 关闭超时（毫秒）
    signals: string[];     // 监听的关闭信号
  };
}

/**
 * 创建启动配置
 */
export const createStartupConfig = (): StartupConfig => ({
  timeout: {
    database: parseInt(process.env.STARTUP_DB_TIMEOUT || '10000', 10),
    cache: parseInt(process.env.STARTUP_CACHE_TIMEOUT || '5000', 10),
    services: parseInt(process.env.STARTUP_SERVICES_TIMEOUT || '30000', 10),
    total: parseInt(process.env.STARTUP_TOTAL_TIMEOUT || '60000', 10),
  },

  retry: {
    maxAttempts: parseInt(process.env.STARTUP_MAX_RETRIES || '3', 10),
    delay: parseInt(process.env.STARTUP_RETRY_DELAY || '2000', 10),
    backoff: parseFloat(process.env.STARTUP_RETRY_BACKOFF || '2.0'),
  },

  healthCheck: {
    enabled: process.env.STARTUP_HEALTH_CHECK !== 'false',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10),
  },

  shutdown: {
    timeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10),
    signals: (process.env.SHUTDOWN_SIGNALS || 'SIGTERM,SIGINT').split(','),
  },
});

/**
 * NestJS Config 工厂函数
 */
export const startupConfig = () => createStartupConfig();