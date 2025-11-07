/**
 * StreamReceiver 组件配置接口和默认值
 * 将硬编码常量迁移到配置管理系统
 */

export interface StreamReceiverConfig {
  /** 连接清理间隔 (毫秒) */
  connectionCleanupInterval: number;

  /** 最大连接数 */
  maxConnections: number;

  /** 连接超时时间 (毫秒) */
  connectionStaleTimeout: number;

  /** 最大重试次数 */
  maxRetryAttempts: number;

  /** 重试延迟基数 (毫秒) */
  retryDelayBase: number;

  /** 熔断器阈值 */
  circuitBreakerThreshold: number;

  /** 熔断器重置超时 (毫秒) */
  circuitBreakerResetTimeout: number;

  /** 批处理间隔 (毫秒) */
  batchProcessingInterval: number;

  /** 动态批处理优化配置 */
  dynamicBatching: {
    /** 是否启用动态优化 */
    enabled: boolean;

    /** 最小批处理间隔 (毫秒) */
    minInterval: number;

    /** 最大批处理间隔 (毫秒) */
    maxInterval: number;

    /** 高负载时的目标间隔 (毫秒) */
    highLoadInterval: number;

    /** 低负载时的目标间隔 (毫秒) */
    lowLoadInterval: number;

    /** 负载检测配置 */
    loadDetection: {
      /** 采样窗口大小 (个数) */
      sampleWindow: number;

      /** 高负载阈值 (每秒批次数) */
      highLoadThreshold: number;

      /** 低负载阈值 (每秒批次数) */
      lowLoadThreshold: number;

      /** 间隔调整步长 (毫秒) */
      adjustmentStep: number;

      /** 调整频率 (毫秒) */
      adjustmentFrequency: number;
    };
  };

  /** 内存监控配置 */
  memoryMonitoring: {
    /** 监控间隔 (毫秒) */
    checkInterval: number;

    /** 警告阈值 (字节) */
    warningThreshold: number;

    /** 临界阈值 (字节) */
    criticalThreshold: number;
  };

  /** 连接频率限制配置 */
  rateLimit: {
    /** 每分钟最大连接数 */
    maxConnectionsPerMinute: number;

    /** 限制窗口大小 (毫秒) */
    windowSize: number;
  };
}

/**
 * StreamReceiver 默认配置
 */
export const defaultStreamReceiverConfig: StreamReceiverConfig = {
  connectionCleanupInterval: 5 * 60 * 1000, // 5分钟
  maxConnections: 1000, // 最大1000个连接
  connectionStaleTimeout: 10 * 60 * 1000, // 10分钟超时
  maxRetryAttempts: 3, // 最多重试3次
  retryDelayBase: 1000, // 1秒基础延迟
  circuitBreakerThreshold: 50, // 50%失败率触发熔断
  circuitBreakerResetTimeout: 30000, // 30秒重置熔断器
  batchProcessingInterval: 50, // 50ms批处理间隔

  dynamicBatching: {
    enabled: false, // 默认关闭动态优化（P1软退化）
    minInterval: 10, // 最小10ms
    maxInterval: 200, // 最大200ms
    highLoadInterval: 25, // 高负载时25ms
    lowLoadInterval: 100, // 低负载时100ms

    loadDetection: {
      sampleWindow: 20, // 采样20个批次
      highLoadThreshold: 15, // 每秒15个批次为高负载
      lowLoadThreshold: 5, // 每秒5个批次为低负载
      adjustmentStep: 5, // 每次调整5ms
      adjustmentFrequency: 5000, // 每5秒检查一次
    },
  },

  memoryMonitoring: {
    checkInterval: 30 * 1000, // 30秒检查一次
    warningThreshold: 500 * 1024 * 1024, // 500MB警告
    criticalThreshold: 800 * 1024 * 1024, // 800MB临界
  },

  rateLimit: {
    maxConnectionsPerMinute: 5, // 每分钟最多5次连接
    windowSize: 60 * 1000, // 1分钟窗口
  },
};

/**
 * 配置键名映射 - 用于环境变量
 */
export const StreamReceiverConfigKeys = {
  CONNECTION_CLEANUP_INTERVAL: "STREAM_RECEIVER_CLEANUP_INTERVAL",
  MAX_CONNECTIONS: "STREAM_RECEIVER_MAX_CONNECTIONS",
  CONNECTION_STALE_TIMEOUT: "STREAM_RECEIVER_STALE_TIMEOUT",
  BATCH_PROCESSING_INTERVAL: "STREAM_RECEIVER_BATCH_INTERVAL",
} as const;

/**
 * 配置验证函数
 */
export function validateStreamReceiverConfig(
  config: Partial<StreamReceiverConfig>,
): string[] {
  const errors: string[] = [];

  if (
    config.connectionCleanupInterval !== undefined &&
    config.connectionCleanupInterval < 10000
  ) {
    errors.push("连接清理间隔不能少于10秒");
  }

  if (config.maxConnections !== undefined && config.maxConnections < 1) {
    errors.push("最大连接数必须大于0");
  }

  if (
    config.connectionStaleTimeout !== undefined &&
    config.connectionStaleTimeout < 30000
  ) {
    errors.push("连接超时时间不能少于30秒");
  }

  if (config.maxRetryAttempts !== undefined && config.maxRetryAttempts < 0) {
    errors.push("重试次数不能为负数");
  }

  if (config.retryDelayBase !== undefined && config.retryDelayBase < 100) {
    errors.push("重试延迟基数不能少于100ms");
  }

  if (
    config.circuitBreakerThreshold !== undefined &&
    (config.circuitBreakerThreshold < 0 || config.circuitBreakerThreshold > 100)
  ) {
    errors.push("熔断器阈值必须在0-100之间");
  }

  if (
    config.batchProcessingInterval !== undefined &&
    config.batchProcessingInterval < 10
  ) {
    errors.push("批处理间隔不能少于10ms");
  }

  // 动态批处理配置验证
  if (
    config.dynamicBatching?.minInterval !== undefined &&
    config.dynamicBatching.minInterval < 5
  ) {
    errors.push("动态批处理最小间隔不能少于5ms");
  }

  if (
    config.dynamicBatching?.maxInterval !== undefined &&
    config.dynamicBatching.maxInterval > 1000
  ) {
    errors.push("动态批处理最大间隔不能超过1000ms");
  }

  if (
    config.dynamicBatching?.minInterval !== undefined &&
    config.dynamicBatching?.maxInterval !== undefined &&
    config.dynamicBatching.minInterval >= config.dynamicBatching.maxInterval
  ) {
    errors.push("动态批处理最小间隔必须小于最大间隔");
  }

  if (
    config.dynamicBatching?.highLoadInterval !== undefined &&
    config.dynamicBatching?.minInterval !== undefined &&
    config.dynamicBatching.highLoadInterval < config.dynamicBatching.minInterval
  ) {
    errors.push("高负载间隔不能小于最小间隔");
  }

  if (
    config.dynamicBatching?.lowLoadInterval !== undefined &&
    config.dynamicBatching?.maxInterval !== undefined &&
    config.dynamicBatching.lowLoadInterval > config.dynamicBatching.maxInterval
  ) {
    errors.push("低负载间隔不能大于最大间隔");
  }

  if (
    config.dynamicBatching?.loadDetection?.sampleWindow !== undefined &&
    config.dynamicBatching.loadDetection.sampleWindow < 5
  ) {
    errors.push("负载检测采样窗口不能少于5个批次");
  }

  if (
    config.dynamicBatching?.loadDetection?.highLoadThreshold !== undefined &&
    config.dynamicBatching?.loadDetection?.lowLoadThreshold !== undefined &&
    config.dynamicBatching.loadDetection.highLoadThreshold <=
      config.dynamicBatching.loadDetection.lowLoadThreshold
  ) {
    errors.push("高负载阈值必须大于低负载阈值");
  }

  if (
    config.dynamicBatching?.loadDetection?.adjustmentStep !== undefined &&
    config.dynamicBatching.loadDetection.adjustmentStep < 1
  ) {
    errors.push("间隔调整步长不能少于1ms");
  }

  if (
    config.dynamicBatching?.loadDetection?.adjustmentFrequency !== undefined &&
    config.dynamicBatching.loadDetection.adjustmentFrequency < 1000
  ) {
    errors.push("调整频率不能少于1秒");
  }

  // 内存监控配置验证
  if (
    config.memoryMonitoring?.checkInterval !== undefined &&
    config.memoryMonitoring.checkInterval < 5000
  ) {
    errors.push("内存检查间隔不能少于5秒");
  }

  if (
    config.memoryMonitoring?.warningThreshold !== undefined &&
    config.memoryMonitoring.warningThreshold < 100 * 1024 * 1024
  ) {
    errors.push("内存警告阈值不能少于100MB");
  }

  if (
    config.memoryMonitoring?.criticalThreshold !== undefined &&
    config.memoryMonitoring?.warningThreshold !== undefined &&
    config.memoryMonitoring.criticalThreshold <=
      config.memoryMonitoring.warningThreshold
  ) {
    errors.push("内存临界阈值必须大于警告阈值");
  }

  // 频率限制配置验证
  if (
    config.rateLimit?.maxConnectionsPerMinute !== undefined &&
    config.rateLimit.maxConnectionsPerMinute < 1
  ) {
    errors.push("频率限制不能少于每分钟1次连接");
  }

  if (
    config.rateLimit?.windowSize !== undefined &&
    config.rateLimit.windowSize < 1000
  ) {
    errors.push("频率限制窗口大小不能少于1秒");
  }

  return errors;
}

/**
 * 合并配置 - 将用户配置与默认配置合并
 */
export function mergeStreamReceiverConfig(
  userConfig: Partial<StreamReceiverConfig> = {},
): StreamReceiverConfig {
  return {
    ...defaultStreamReceiverConfig,
    ...userConfig,
    dynamicBatching: {
      ...defaultStreamReceiverConfig.dynamicBatching,
      ...userConfig.dynamicBatching,
      loadDetection: {
        ...defaultStreamReceiverConfig.dynamicBatching.loadDetection,
        ...userConfig.dynamicBatching?.loadDetection,
      },
    },
    memoryMonitoring: {
      ...defaultStreamReceiverConfig.memoryMonitoring,
      ...userConfig.memoryMonitoring,
    },
    rateLimit: {
      ...defaultStreamReceiverConfig.rateLimit,
      ...userConfig.rateLimit,
    },
  };
}
