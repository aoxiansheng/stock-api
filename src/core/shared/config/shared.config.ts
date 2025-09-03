/**
 * 🔧 Phase 2.2: 统一配置文件
 * 集中管理 shared 组件的所有配置项
 *
 * @description
 * 提供一个集中化的配置管理，避免硬编码的魔法数字分散在各处
 * 使用 TypeScript const 断言确保类型安全
 */

import { createLogger } from "@app/config/logger.config";

const logger = createLogger("SharedConfig");

/**
 * Shared 组件统一配置
 */
export const SHARED_CONFIG = {
  /**
   * 缓存相关配置
   */
  CACHE: {
    /**
     * 市场状态缓存 TTL
     */
    MARKET_STATUS_TTL: {
      TRADING: 60 * 1000, // 交易时间：1分钟
      NON_TRADING: 10 * 60 * 1000, // 非交易时间：10分钟
    },

    /**
     * 最大缓存大小限制
     */
    MAX_CACHE_SIZE: 10000,

    /**
     * 缓存清理间隔
     */
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5分钟清理一次

    /**
     * LRU 缓存配置（可选）
     */
    LRU: {
      MAX_SIZE: 1000,
      TTL: 60 * 60 * 1000, // 1小时
    },
  },

  /**
   * 性能相关配置
   */
  PERFORMANCE: {
    /**
     * 嵌套对象最大深度
     */
    MAX_NESTED_DEPTH: 10,

    /**
     * 慢操作阈值（毫秒）
     */
    SLOW_THRESHOLD_MS: 5000,

    /**
     * 重试配置
     */
    RETRY_CONFIG: {
      MAX_RETRIES: 2,
      INITIAL_DELAY: 1000,
      BACKOFF_MULTIPLIER: 1.5,
      MAX_DELAY: 10000,
    },

    /**
     * 并发限制
     */
    CONCURRENCY: {
      MAX_CONCURRENT_REQUESTS: 100,
      QUEUE_SIZE: 1000,
    },
  },

  /**
   * 日志相关配置
   */
  LOGGING: {
    /**
     * 日志级别
     */
    DEFAULT_LEVEL: "info",

    /**
     * 是否启用性能日志
     */
    ENABLE_PERFORMANCE_LOGS: false,

    /**
     * 指标记录失败是否静默
     */
    SILENT_METRICS_FAILURE: true,
  },

  /**
   * 数据处理配置
   */
  DATA_PROCESSING: {
    /**
     * 批处理大小
     */
    BATCH_SIZE: 100,

    /**
     * 字段映射深度限制
     */
    MAX_FIELD_DEPTH: 5,

    /**
     * 数据变更检测阈值
     */
    CHANGE_DETECTION_THRESHOLD: 0.01, // 1% 变化率
  },

  /**
   * 监控和指标配置
   */
  MONITORING: {
    /**
     * 是否启用指标收集
     */
    METRICS_ENABLED: true,

    /**
     * 指标收集间隔
     */
    METRICS_INTERVAL: 60 * 1000, // 1分钟

    /**
     * 健康检查配置
     */
    HEALTH_CHECK: {
      INTERVAL: 30 * 1000, // 30秒
      TIMEOUT: 5000, // 5秒超时
      MAX_FAILURES: 3, // 最大失败次数
    },
  },

  /**
   * 服务降级配置
   */
  DEGRADATION: {
    /**
     * 是否启用服务降级
     */
    ENABLED: true,

    /**
     * 降级触发条件
     */
    TRIGGERS: {
      ERROR_RATE_THRESHOLD: 0.5, // 50% 错误率
      LATENCY_THRESHOLD: 10000, // 10秒延迟
      MEMORY_THRESHOLD: 0.9, // 90% 内存使用率
    },

    /**
     * 降级恢复时间
     */
    RECOVERY_TIME: 5 * 60 * 1000, // 5分钟
  },
} as const;

/**
 * 导出类型定义，便于类型检查
 */
export type SharedConfig = typeof SHARED_CONFIG;

/**
 * 配置验证函数（可选）
 */
export function validateConfig(config: Partial<SharedConfig>): boolean {
  // 可以添加运行时配置验证逻辑
  if (config.CACHE?.MAX_CACHE_SIZE && config.CACHE.MAX_CACHE_SIZE < 0) {
    throw new Error("缓存大小不能为负数");
  }

  if (
    config.PERFORMANCE?.RETRY_CONFIG?.MAX_RETRIES &&
    config.PERFORMANCE.RETRY_CONFIG.MAX_RETRIES > 10
  ) {
    logger.warn("重试次数过多可能影响性能");
  }

  return true;
}

/**
 * 获取环境相关配置（可选）
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return {
        PERFORMANCE: {
          ...SHARED_CONFIG.PERFORMANCE,
          SLOW_THRESHOLD_MS: 3000 as const, // 生产环境更严格
        },
        LOGGING: {
          ...SHARED_CONFIG.LOGGING,
          DEFAULT_LEVEL: "warn" as const,
        },
      };
    case "test":
      return {
        CACHE: {
          ...SHARED_CONFIG.CACHE,
          CLEANUP_INTERVAL: 1000 as const, // 测试环境快速清理
        },
        MONITORING: {
          ...SHARED_CONFIG.MONITORING,
          METRICS_ENABLED: false as const, // 测试环境禁用指标
        },
      };
    default:
      return {};
  }
}
