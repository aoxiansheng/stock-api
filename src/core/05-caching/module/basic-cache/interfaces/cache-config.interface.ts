/**
 * 缓存配置接口定义
 * 为通用缓存服务提供配置格式
 */

export interface CacheConfig {
  /** 默认TTL（秒） */
  defaultTTL: number;
  /** 最大TTL（秒） */
  maxTTL: number;
  /** 最小TTL（秒） */
  minTTL: number;
  /** 是否启用压缩 */
  compressionEnabled: boolean;
  /** 批量操作大小 */
  batchSize: number;
  /** 超时时间（毫秒） */
  timeoutMs: number;
}

export interface CacheMetrics {
  /** 缓存命中次数 */
  hitCount: number;
  /** 缓存未命中次数 */
  missCount: number;
  /** 缓存命中率 */
  hitRate: number;
  /** 总请求数 */
  totalRequests: number;
  /** 平均响应时间（毫秒） */
  averageResponseTimeMs: number;
  /** 错误次数 */
  errorCount: number;
  /** 最后更新时间 */
  lastUpdated: string;
  /** 额外指标 */
  additional?: Record<string, any>;
}
