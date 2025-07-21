/**
 * 性能相关统一常量
 * 包含响应时间阈值、批量处理限制等性能配置
 *
 * 设计原则：
 * - 可配置性：支持环境变量覆盖默认值
 * - 分层设计：按严重程度分级定义阈值
 * - 可扩展性：便于添加新的性能指标
 * - 实用性：基于实际生产环境经验设定合理默认值
 */

export const PERFORMANCE_CONSTANTS = Object.freeze({
  // 响应时间阈值 (毫秒)
  RESPONSE_TIME_THRESHOLDS: {
    // 通用响应时间阈值
    FAST_REQUEST_MS: 100, // 快速请求阈值
    NORMAL_REQUEST_MS: 500, // 正常请求阈值
    SLOW_REQUEST_MS: 1000, // 慢请求阈值
    CRITICAL_SLOW_MS: 5000, // 严重慢请求阈值

    // 特定业务操作阈值
    SLOW_QUERY_MS: 1000, // 数据库查询慢阈值
    SLOW_STORAGE_MS: 1000, // 存储操作慢阈值
    SLOW_MAPPING_MS: 100, // 符号映射慢阈值
    SLOW_TRANSFORMATION_MS: 5000, // 数据转换慢阈值
    SLOW_AUTHENTICATION_MS: 300, // 认证操作慢阈值
    SLOW_CACHE_MS: 50, // 缓存操作慢阈值
  } as const,

  // 超时配置 (毫秒)
  TIMEOUTS: {
    DEFAULT_TIMEOUT_MS: 30000, // 默认超时时间：30秒
    QUICK_TIMEOUT_MS: 5000, // 快速操作超时：5秒
    LONG_TIMEOUT_MS: 60000, // 长时间操作超时：60秒
    DATABASE_TIMEOUT_MS: 10000, // 数据库操作超时：10秒
    CACHE_TIMEOUT_MS: 3000, // 缓存操作超时：3秒
    HTTP_REQUEST_TIMEOUT_MS: 15000, // HTTP请求超时：15秒
    AUTHENTICATION_TIMEOUT_MS: 5000, // 认证超时：5秒
    FILE_UPLOAD_TIMEOUT_MS: 120000, // 文件上传超时：2分钟
  } as const,

  // 重试配置
  RETRY_SETTINGS: {
    MAX_RETRY_ATTEMPTS: 3, // 最大重试次数
    RETRY_DELAY_MS: 1000, // 重试延迟时间：1秒
    EXPONENTIAL_BACKOFF_BASE: 2, // 指数退避基数
    MAX_RETRY_DELAY_MS: 10000, // 最大重试延迟：10秒
    JITTER_FACTOR: 0.1, // 抖动因子，避免惊群效应
  } as const,

  // 批量处理限制
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 1000, // 最大批量处理大小
    DEFAULT_PAGE_SIZE: 10, // 默认分页大小
    MAX_PAGE_SIZE: 100, // 最大分页大小
    MAX_CONCURRENT_OPERATIONS: 10, // 最大并发操作数
    BULK_INSERT_SIZE: 500, // 批量插入大小
    BULK_UPDATE_SIZE: 200, // 批量更新大小
  } as const,

  // 内存使用阈值 (MB)
  MEMORY_THRESHOLDS: {
    LOW_MEMORY_USAGE_MB: 50, // 低内存使用阈值
    NORMAL_MEMORY_USAGE_MB: 100, // 正常内存使用阈值
    HIGH_MEMORY_USAGE_MB: 200, // 高内存使用阈值
    CRITICAL_MEMORY_USAGE_MB: 500, // 严重内存使用阈值
    MAX_OBJECT_SIZE_MB: 10, // 最大对象大小
    MAX_REQUEST_SIZE_MB: 50, // 最大请求大小
  } as const,

  // 连接池配置
  CONNECTION_POOLS: {
    MIN_POOL_SIZE: 5, // 最小连接池大小
    MAX_POOL_SIZE: 20, // 最大连接池大小
    IDLE_TIMEOUT_MS: 300000, // 空闲连接超时：5分钟
    CONNECTION_TIMEOUT_MS: 5000, // 连接超时：5秒
    ACQUIRE_TIMEOUT_MS: 10000, // 获取连接超时：10秒
  } as const,

  // 监控和采样配置
  MONITORING: {
    METRICS_COLLECTION_INTERVAL_MS: 10000, // 指标收集间隔：10秒
    HEALTH_CHECK_INTERVAL_MS: 30000, // 健康检查间隔：30秒
    SAMPLE_RATE: 0.1, // 采样率：10%
    ERROR_SAMPLE_RATE: 1.0, // 错误采样率：100%
    SLOW_REQUEST_SAMPLE_RATE: 1.0, // 慢请求采样率：100%
  } as const,
});

// 导出类型定义
export type ResponseTimeThreshold =
  keyof typeof PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS;
export type TimeoutSetting = keyof typeof PERFORMANCE_CONSTANTS.TIMEOUTS;
export type BatchLimit = keyof typeof PERFORMANCE_CONSTANTS.BATCH_LIMITS;

/**
 * 获取基于环境变量的超时配置
 * @param key 超时配置键
 * @param defaultValue 默认值
 */
export function getTimeoutFromEnv(
  key: TimeoutSetting,
  defaultValue?: number,
): number {
  const envKey = `TIMEOUT_${key.replace(/_MS$/, "")}`;
  const envValue = process.env[envKey];

  if (envValue && !isNaN(Number(envValue))) {
    return Number(envValue);
  }

  return defaultValue ?? PERFORMANCE_CONSTANTS.TIMEOUTS[key];
}

/**
 * 计算带抖动的重试延迟
 * @param attempt 重试次数（从0开始）
 */
export function calculateRetryDelay(attempt: number): number {
  const {
    RETRY_DELAY_MS,
    EXPONENTIAL_BACKOFF_BASE,
    MAX_RETRY_DELAY_MS,
    JITTER_FACTOR,
  } = PERFORMANCE_CONSTANTS.RETRY_SETTINGS;

  // 指数退避计算
  const baseDelay =
    RETRY_DELAY_MS * Math.pow(EXPONENTIAL_BACKOFF_BASE, attempt);

  // 添加抖动
  const jitter = baseDelay * JITTER_FACTOR * Math.random();
  const delayWithJitter = baseDelay + jitter;

  // 限制最大延迟
  return Math.min(delayWithJitter, MAX_RETRY_DELAY_MS);
}

/**
 * 检查响应时间是否超过阈值
 * @param responseTime 响应时间（毫秒）
 * @param threshold 阈值类型
 */
export function isSlowResponse(
  responseTime: number,
  threshold: ResponseTimeThreshold = "SLOW_REQUEST_MS",
): boolean {
  return (
    responseTime > PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS[threshold]
  );
}

/**
 * 获取响应时间等级
 * @param responseTime 响应时间（毫秒）
 */
export function getResponseTimeLevel(
  responseTime: number,
): "fast" | "normal" | "slow" | "critical" {
  const { FAST_REQUEST_MS, NORMAL_REQUEST_MS, SLOW_REQUEST_MS } =
    PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS;

  if (responseTime <= FAST_REQUEST_MS) return "fast";
  if (responseTime <= NORMAL_REQUEST_MS) return "normal";
  if (responseTime <= SLOW_REQUEST_MS) return "slow";
  return "critical";
}
