/**
 * Analytics组件常量定义
 * 
 * ⚠️ 重要：所有常量必须优先引用或对齐 @common/constants/unified
 * 避免创建常量孤岛，确保全系统度量衡一致性
 * 
 * 如需新增常量，请先检查 @common/constants/unified 是否已有定义
 * 若确需新增，请在此处显式注释其与统一常量的关系
 */

import { 
  PERFORMANCE_CONSTANTS,
  CACHE_CONSTANTS 
} from '../../../common/constants/unified';
import { deepFreeze } from '../../../common/utils/object-immutability.util';
import type { HealthStatus, HealthPriority } from '../interfaces';

/**
 * 健康状态阈值定义
 * 与 metrics/constants/metrics-performance.constants.ts 中的 COLLECT_METRIC_HEALTH_SCORE_CONFIG 对齐
 */
export const HEALTH_THRESHOLDS = deepFreeze({
  HEALTHY: { 
    score: 90, 
    label: 'healthy' as HealthStatus, 
    description: '系统运行健康',
    color: '#10B981', // 绿色
    priority: 'low' as HealthPriority
  },
  WARNING: { 
    score: 70, 
    label: 'warning' as HealthStatus, 
    description: '系统出现警告',
    color: '#F59E0B', // 黄色
    priority: 'medium' as HealthPriority
  },
  DEGRADED: { 
    score: 50, 
    label: 'degraded' as HealthStatus, 
    description: '系统性能下降',
    color: '#EF4444', // 橙色
    priority: 'high' as HealthPriority
  },
  UNHEALTHY: { 
    score: 0, 
    label: 'unhealthy' as HealthStatus, 
    description: '系统状态异常',
    color: '#DC2626', // 红色
    priority: 'critical' as HealthPriority
  },

  /**
   * 根据健康评分获取状态
   */
  getStatus(score: number): HealthStatus {
    if (score >= this.HEALTHY.score) return this.HEALTHY.label;
    if (score >= this.WARNING.score) return this.WARNING.label;
    if (score >= this.DEGRADED.score) return this.DEGRADED.label;
    return this.UNHEALTHY.label;
  },

  /**
   * 根据健康评分获取描述
   */
  getDescription(score: number): string {
    if (score >= this.HEALTHY.score) return this.HEALTHY.description;
    if (score >= this.WARNING.score) return this.WARNING.description;
    if (score >= this.DEGRADED.score) return this.DEGRADED.description;
    return this.UNHEALTHY.description;
  },

  /**
   * 根据健康评分获取优先级
   */
  getPriority(score: number): HealthPriority {
    if (score >= this.HEALTHY.score) return this.HEALTHY.priority;
    if (score >= this.WARNING.score) return this.WARNING.priority;
    if (score >= this.DEGRADED.score) return this.DEGRADED.priority;
    return this.UNHEALTHY.priority;
  },

  /**
   * 根据健康评分获取颜色
   */
  getColor(score: number): string {
    if (score >= this.HEALTHY.score) return this.HEALTHY.color;
    if (score >= this.WARNING.score) return this.WARNING.color;
    if (score >= this.DEGRADED.score) return this.DEGRADED.color;
    return this.UNHEALTHY.color;
  }
} as const);

/**
 * 健康评分权重配置
 * 复用 metrics 模块的配置，确保评分逻辑一致
 */
export const HEALTH_SCORE_WEIGHTS = deepFreeze({
  ERROR_RATE: 30,        // 错误率权重
  RESPONSE_TIME: 25,     // 响应时间权重
  CPU_USAGE: 20,         // CPU使用率权重
  MEMORY_USAGE: 15,      // 内存使用率权重
  DB_PERFORMANCE: 10,    // 数据库性能权重
} as const);


/**
 * Analytics缓存配置
 * 基于统一缓存常量，针对Analytics场景定制TTL
 */
export const ANALYTICS_CACHE_CONFIG = deepFreeze({
  // 缓存TTL（秒）- 基于统一常量定制
  TTL: {
    PERFORMANCE_SUMMARY: 30,                           // 性能摘要：30秒
    HEALTH_SCORE: 15,                                 // 健康评分：15秒
    HEALTH_REPORT: CACHE_CONSTANTS.TTL_SETTINGS.SHORT_TTL,  // 健康报告：5分钟
    ENDPOINT_METRICS: 10,                             // 端点指标：10秒
    OPTIMIZATION_ADVICE: CACHE_CONSTANTS.TTL_SETTINGS.MEDIUM_TTL, // 优化建议：30分钟
    TREND_ANALYSIS: CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL,     // 趋势分析：1小时
  },
  
  // 缓存键前缀
  KEY_PREFIX: {
    ANALYTICS: 'analytics',
    PERFORMANCE: 'analytics:performance',
    HEALTH: 'analytics:health',
    TRENDS: 'analytics:trends',
    OPTIMIZATION: 'analytics:optimization',
  },
  
  // 内存缓存配置
  MEMORY_CACHE: {
    MAX_SIZE: 100,           // 最大缓存项数
    TTL: 30 * 1000,         // 默认TTL：30秒（毫秒）
  },

  // 自动失效配置
  AUTO_INVALIDATION_INTERVAL: 5 * 60 * 1000,  // 5分钟自动失效（毫秒）
} as const);

/**
 * 统一缓存键管理
 * 集中管理所有缓存键，确保一致性
 */
export const ANALYTICS_CACHE_KEYS = deepFreeze({
  // 健康分析相关缓存键
  HEALTH_SCORE: 'analytics:health:score:latest',
  HEALTH_REPORT: 'analytics:health:report:detailed',
  HEALTH_ISSUES: 'analytics:health:issues',
  HEALTH_RECOMMENDATIONS: 'analytics:health:recommendations',
  
  // 性能分析相关缓存键
  PERFORMANCE_SUMMARY: (startDate?: string, endDate?: string) => 
    `analytics:performance:summary:${startDate || 'latest'}:${endDate || 'latest'}`,
  ENDPOINT_METRICS: 'analytics:performance:endpoint_metrics',
  DATABASE_METRICS: (startDate?: string, endDate?: string) => 
    `analytics:performance:database:${startDate || 'latest'}:${endDate || 'latest'}`,
  REDIS_METRICS: 'analytics:performance:redis',
  SYSTEM_METRICS: 'analytics:performance:system',
  
  // 趋势分析相关缓存键
  TRENDS: 'analytics:trends:latest',
  TRENDS_HISTORY: 'analytics:trends:history',
} as const);

/**
 * Analytics事件名称
 * 用于事件发射和监听
 */
export const ANALYTICS_EVENTS = deepFreeze({
  HEALTH_SCORE_CALCULATED: 'analytics.health_score.calculated',
  HEALTH_SCORE_FAILED: 'analytics.health_score.failed',
  PERFORMANCE_SUMMARY_GENERATED: 'analytics.performance_summary.generated',
  CACHE_INVALIDATED: 'analytics.cache.invalidated',
  THRESHOLD_EXCEEDED: 'analytics.threshold.exceeded',
  OPTIMIZATION_SUGGESTED: 'analytics.optimization.suggested',
  
  // 新增事件驱动架构所需事件
  HEALTH_SCORE_REQUESTED: 'analytics.health_score.requested',
  HEALTH_SCORE_UPDATED: 'analytics.health_score.updated',
  
  // 新增系统级缓存失效事件
  SYSTEM_RESTART_DETECTED: 'analytics.system.restart_detected',
  DATA_SOURCE_CHANGED: 'analytics.data_source.changed',
  CONFIGURATION_UPDATED: 'analytics.configuration.updated',
  CRITICAL_ERROR_DETECTED: 'analytics.critical_error.detected',
  
  // 监控相关事件
  MONITORING_DATA_STALE: 'analytics.monitoring.data_stale',
  REDIS_CONNECTION_LOST: 'analytics.redis.connection_lost',
  DATABASE_CONNECTION_LOST: 'analytics.database.connection_lost',
} as const);;

/**
 * 计算配置
 */
export const ANALYTICS_CALCULATION_CONFIG = deepFreeze({
  // 批量处理配置 - 复用统一常量
  BATCH_SIZE: PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_BATCH_SIZE,
  
  // 百分位数配置
  PERCENTILES: {
    P50: 0.50,
    P75: 0.75,
    P90: 0.90,
    P95: 0.95,
    P99: 0.99,
  },
  
  // 计算超时配置
  CALCULATION_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.QUICK_TIMEOUT_MS,
  
  // 历史记录限制
  MAX_CALCULATION_HISTORY: 100,
} as const);

/**
 * 默认值配置
 * 当无法获取实际数据时使用的默认值
 */
export const ANALYTICS_DEFAULTS = deepFreeze({
  HEALTH_SCORE: 100,      // 默认健康评分
  ERROR_RATE: 0,          // 默认错误率
  RESPONSE_TIME: 0,       // 默认响应时间
  CPU_USAGE: 0,           // 默认CPU使用率
  MEMORY_USAGE: 0,        // 默认内存使用率
  CACHE_HIT_RATE: 0,      // 默认缓存命中率
} as const);
/**
 * 性能阈值常量
 * 根据开发文档要求定义的性能评估阈值
 * 
 * 注意：这些阈值应与@common/constants/unified保持对齐
 * 避免创建常量孤岛，确保全系统度量衡一致性
 */
export const ANALYTICS_PERFORMANCE_THRESHOLDS = deepFreeze({
  // 响应时间阈值
  SLOW_REQUEST_MS: 1000,        // 慢请求阈值：1秒
  NORMAL_REQUEST_MS: 200,       // 正常请求阈值：200ms  
  SLOW_QUERY_MS: 500,           // 慢查询阈值：500ms
  
  // 错误率阈值
  HIGH_ERROR_RATE: 0.05,        // 高错误率：5%
  WARNING_ERROR_RATE: 0.02,     // 警告错误率：2%
  
  // 系统资源阈值
  HIGH_CPU_USAGE: 0.8,          // 高CPU使用率：80%
  HIGH_MEMORY_USAGE: 0.9,       // 高内存使用率：90%
  
  // 缓存性能阈值
  LOW_CACHE_HIT_RATE: 0.7,      // 低缓存命中率：70%
  GOOD_CACHE_HIT_RATE: 0.85,    // 良好缓存命中率：85%
} as const);

// 导出类型定义
export type AnalyticsCacheKey = keyof typeof ANALYTICS_CACHE_CONFIG.TTL;
export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;