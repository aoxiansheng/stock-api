/**
 * Stream Data Fetcher 限流常量
 * 统一管理限流相关的硬编码值
 */
export const RATE_LIMIT_CONSTANTS = {
  DEFAULT_WINDOW_MS: 1000, // 默认时间窗口: 1秒 (1000毫秒)
  DEFAULT_MAX_QPS: 10, // 默认最大QPS
  DEFAULT_BURST_SIZE: 20, // 默认突发大小
} as const;

export type RateLimitConstants = typeof RATE_LIMIT_CONSTANTS;
