/**
 * 监控常量统一导出入口 - 零抽象纯粹架构
 * 🎯 提供监控模块所有常量的集中式导出，简化导入路径
 * 
 * ✅ 零抽象纯粹架构：
 * - system-resources.constants.ts: CPU、内存、磁盘监控阈值
 * - response-performance.constants.ts: 响应时间、吞吐量阈值  
 * - error-tracking.constants.ts: 错误率、成功率阈值
 * - database-performance.constants.ts: 数据库查询性能阈值
 * - cache-performance.constants.ts: 缓存性能阈值
 * - alert-control.constants.ts: 告警频率、冷却时间
 * - data-lifecycle.constants.ts: 数据收集、保留时间
 * - business.ts: 业务常量（零抽象架构）
 * - config/: 系统配置
 * - status/: 状态常量
 * - messages/: 消息常量
 * 
 * @version 3.0.0 - 零抽象纯粹架构（移除兼容层）
 * @since 2025-09-10
 * @author Claude Code
 */

// ========================= ✅ 零抽象纯粹架构 - 直观优先常量 =========================
// 推荐使用：数值直观可见，业务语义清晰，就近原则组织

// 系统资源监控常量
export * from './system-resources.constants';

// 响应性能监控常量
export * from './response-performance.constants';

// 错误跟踪监控常量
export * from './error-tracking.constants';

// 数据库性能监控常量
export * from './database-performance.constants';

// 缓存性能监控常量
export * from './cache-performance.constants';

// 告警控制监控常量
export * from './alert-control.constants';

// 数据生命周期监控常量
export * from './data-lifecycle.constants';

// 零抽象架构类型导出
export type {
  SystemResourceThresholds,
  SystemResourceType,
  SystemResourceLevel
} from './system-resources.constants';

export type {
  ResponsePerformanceThresholds,
  PerformanceMetricType as NewPerformanceMetricType,
  PerformanceLevel as NewPerformanceLevel,
  LoadTestStage
} from './response-performance.constants';

export type {
  ErrorTrackingThresholds,
  ErrorType,
  ErrorSeverity,
  ErrorLevel,
  HttpStatusCategory
} from './error-tracking.constants';

export type {
  DatabasePerformanceThresholds,
  DatabaseType,
  QueryType,
  DatabaseOperation,
  DatabaseLevel
} from './database-performance.constants';

export type {
  CachePerformanceThresholds,
  CacheType,
  CacheOperation,
  CacheMetric,
  CacheLevel
} from './cache-performance.constants';

export type {
  AlertSeverity,
  AlertChannel,
  AlertState,
  AlertCategory,
  BatchSize
} from './alert-control.constants';

export type {
  DataCollectionFrequency,
  DataRetentionCategory,
  DataCompressionLevel,
  DataQualityLevel,
  StorageType
} from './data-lifecycle.constants';

// ========================= 零抽象纯粹的业务常量 =========================
// 已重构为零抽象架构，所有数值直观可见
export * from './business';
export { 
  MONITORING_BUSINESS, 
  MonitoringBusinessUtil,
  type ErrorRateLevel,
  type ChangeLevel,
  type PerformanceLevel,
  type HealthLevel,
  type DataVolume,
  type AlertLevel,
  type CollectionPriority,
  type DataType,
  type MonitoringBusinessConstants
} from './business';

// ========================= 配置层常量 =========================
export {
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS
} from './config/monitoring-keys.constants';

export {
  MONITORING_METRICS,
  MONITORING_METRIC_CATEGORIES,
  MONITORING_METRIC_UNITS,
  MONITORING_METRIC_THRESHOLDS,
  MONITORING_AGGREGATION_TYPES,
  MONITORING_METRIC_PRIORITIES,
  getMetricCategory,
  getMetricUnit,
  checkMetricThreshold
} from './config/monitoring-metrics.constants';

// 系统限制常量
export {
  MONITORING_SYSTEM_LIMITS,
  MonitoringSystemLimitUtils
} from './config/monitoring-system.constants';

// 健康状态常量
export {
  MONITORING_HEALTH_STATUS,
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  MONITORING_BASIC_HEALTH_STATUS_VALUES,
  MONITORING_EXTENDED_HEALTH_STATUS_VALUES,
  MonitoringHealthUtils,
  isValidMonitoringStatus,
  getMonitoringStatusSeverity,
  mapInternalToExternalStatus,
  MONITORING_STATUS_DESCRIPTIONS,
  MONITORING_STATUS_COLORS
} from './config/monitoring-health.constants';

// ========================= 状态层常量（向后兼容导出） =========================
export type {
  MonitoringHealthStatus,
  BasicHealthStatus,
  ExtendedHealthStatus
} from './status/monitoring-status.constants';

// ========================= 消息层常量 =========================
export {
  MONITORING_MESSAGE_STATUS_DESCRIPTIONS,
  MONITORING_MESSAGE_TYPES,
  MONITORING_MESSAGE_SEVERITY,
  MonitoringMessageFormatter
} from './messages/monitoring-messages.constants';

// ========================= 工具类导出 =========================
export { MonitoringSerializer, MonitoringDataSerializer } from '../utils/monitoring-serializer';

// ========================= 类型导出 =========================
export type { MonitoringKeyTemplate } from './config/monitoring-keys.constants';
export type { PerformanceMetricType } from './config/monitoring-metrics.constants';
export type {
  MonitoringSystemLimitKeys,
  MonitoringSystemLimits
} from './config/monitoring-system.constants';
export type {
  MonitoringMessageType,
  MonitoringMessageSeverity
} from './messages/monitoring-messages.constants';

// ========================= 零抽象纯粹架构说明 =========================
/**
 * 🎯 零抽象纯粹架构原则：
 * 
 * ✅ 直观性：所有数值直观可见，无需查找抽象层
 *    - 错误: BASE_PERFORMANCE_THRESHOLDS.ERROR_RATE.FAIR
 *    - 正确: 0.05 // 5% 错误率
 * 
 * ✅ 就近性：相关常量组织在一起，减少导入复杂度
 *    - 系统资源监控阈值 → system-resources.constants.ts
 *    - 响应性能阈值 → response-performance.constants.ts
 * 
 * ✅ 纯粹性：彻底移除所有抽象层和兼容层
 *    - 移除：core/base-thresholds.constants.ts
 *    - 移除：core/time-constants.ts
 *    - 移除：core/monitoring-scenarios.constants.ts
 *    - 移除：compatibility-mapping.constants.ts
 *    - 移除：index-new-architecture.ts
 * 
 * ✅ 简洁性：单一真相来源，每个常量只有一个定义位置
 *    - 系统资源 → system-resources.constants.ts
 *    - 响应性能 → response-performance.constants.ts
 *    - 错误跟踪 → error-tracking.constants.ts
 *    - 数据库性能 → database-performance.constants.ts
 *    - 缓存性能 → cache-performance.constants.ts
 *    - 告警控制 → alert-control.constants.ts
 *    - 数据生命周期 → data-lifecycle.constants.ts
 *    - 业务常量 → business.ts
 * 
 * 🚀 使用方式：
 * ```typescript
 * // 直接导入使用
 * import { CPU_USAGE_CRITICAL_THRESHOLD } from '@/monitoring/constants';
 * 
 * // 或按类型导入
 * import { CPU_USAGE_CRITICAL_THRESHOLD } from '@/monitoring/constants/system-resources.constants';
 * ```
 */