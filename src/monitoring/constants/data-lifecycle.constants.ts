/**
 * 数据生命周期监控常量 - 直观优先架构
 * 🎯 数据收集、保留、清理相关的所有时间配置和策略参数
 * 
 * ⭐ 架构原则：
 * - 直观优先：数值直接可见，一目了然
 * - 业务语义：常量名直接表达业务含义
 * - 就近原则：相关数值放在一起便于对比修改
 * - 零抽象：文件内部不做抽象层，所有值直接导出
 * 
 * @version 1.0.0
 * @since 2025-09-10
 * @author Claude Code
 */

// ========================= 数据采集时间间隔配置 =========================

/**
 * 系统指标数据采集间隔 (单位: 秒)
 * 📊 各类系统指标的数据采集频率
 */
export const SYSTEM_METRICS_COLLECTION_INTERVAL_SEC = 30;      // 30秒 - 系统指标标准采集间隔
export const SYSTEM_METRICS_HIGH_FREQUENCY_INTERVAL_SEC = 5;   // 5秒 - 高频采集间隔（告警时）
export const SYSTEM_METRICS_LOW_FREQUENCY_INTERVAL_SEC = 300;  // 300秒 - 低频采集间隔（正常时）

/**
 * 性能指标数据采集间隔 (单位: 秒)
 * ⚡ 应用性能指标的采集频率
 */
export const PERFORMANCE_METRICS_COLLECTION_INTERVAL_SEC = 15;    // 15秒 - 性能指标标准采集间隔
export const PERFORMANCE_METRICS_FAST_INTERVAL_SEC = 3;           // 3秒 - 快速性能采集间隔
export const PERFORMANCE_METRICS_SLOW_INTERVAL_SEC = 120;         // 120秒 - 慢速性能采集间隔

/**
 * 业务指标数据采集间隔 (单位: 秒)
 * 💼 业务相关指标的采集频率
 */
export const BUSINESS_METRICS_COLLECTION_INTERVAL_SEC = 60;       // 60秒 - 业务指标标准采集间隔
export const BUSINESS_METRICS_CRITICAL_INTERVAL_SEC = 15;         // 15秒 - 关键业务指标采集间隔
export const BUSINESS_METRICS_REGULAR_INTERVAL_SEC = 300;         // 300秒 - 常规业务指标采集间隔

/**
 * 日志数据采集间隔 (单位: 秒)
 * 📝 日志数据的采集和处理频率
 */
export const LOG_COLLECTION_INTERVAL_SEC = 10;                   // 10秒 - 日志采集标准间隔
export const ERROR_LOG_COLLECTION_INTERVAL_SEC = 5;              // 5秒 - 错误日志快速采集间隔
export const ACCESS_LOG_COLLECTION_INTERVAL_SEC = 30;            // 30秒 - 访问日志采集间隔

// ========================= 数据聚合时间窗口配置 =========================

/**
 * 实时数据聚合窗口 (单位: 秒)
 * 🔄 实时数据聚合的时间窗口大小
 */
export const REALTIME_AGGREGATION_WINDOW_SEC = 60;               // 60秒 - 实时聚合1分钟窗口
export const REALTIME_AGGREGATION_SHORT_WINDOW_SEC = 15;         // 15秒 - 实时聚合短窗口
export const REALTIME_AGGREGATION_MICRO_WINDOW_SEC = 5;          // 5秒 - 实时聚合微窗口

/**
 * 历史数据聚合窗口 (单位: 分钟)
 * 📈 历史数据聚合的时间窗口配置
 */
export const HISTORICAL_AGGREGATION_5MIN_WINDOW = 5;             // 5分钟 - 历史数据5分钟聚合窗口
export const HISTORICAL_AGGREGATION_15MIN_WINDOW = 15;           // 15分钟 - 历史数据15分钟聚合窗口
export const HISTORICAL_AGGREGATION_1HOUR_WINDOW = 60;           // 60分钟 - 历史数据1小时聚合窗口
export const HISTORICAL_AGGREGATION_1DAY_WINDOW = 1440;          // 1440分钟 - 历史数据1天聚合窗口

/**
 * 趋势分析窗口 (单位: 小时)
 * 📊 数据趋势分析的时间窗口
 */
export const TREND_ANALYSIS_SHORT_WINDOW_HOURS = 1;              // 1小时 - 短期趋势分析窗口
export const TREND_ANALYSIS_MEDIUM_WINDOW_HOURS = 24;            // 24小时 - 中期趋势分析窗口
export const TREND_ANALYSIS_LONG_WINDOW_HOURS = 168;             // 168小时 - 长期趋势分析窗口（7天）

// ========================= 数据保留时间配置 =========================

/**
 * 原始数据保留时间 (单位: 小时)
 * 🗄️ 未聚合的原始数据保留时间
 */
export const RAW_METRICS_RETENTION_HOURS = 24;                   // 24小时 - 原始指标数据保留（1天）
export const RAW_LOG_RETENTION_HOURS = 72;                       // 72小时 - 原始日志数据保留（3天）
export const RAW_ERROR_RETENTION_HOURS = 168;                    // 168小时 - 原始错误数据保留（7天）
export const RAW_PERFORMANCE_RETENTION_HOURS = 48;               // 48小时 - 原始性能数据保留（2天）

/**
 * 聚合数据保留时间 (单位: 天数)
 * 📦 已聚合数据的保留时间
 */
export const AGGREGATED_5MIN_RETENTION_DAYS = 7;                 // 7天 - 5分钟聚合数据保留
export const AGGREGATED_15MIN_RETENTION_DAYS = 30;               // 30天 - 15分钟聚合数据保留
export const AGGREGATED_1HOUR_RETENTION_DAYS = 90;               // 90天 - 1小时聚合数据保留
export const AGGREGATED_1DAY_RETENTION_DAYS = 365;               // 365天 - 1天聚合数据保留（1年）

/**
 * 特殊数据保留时间 (单位: 天数)
 * 🎯 重要数据的长期保留配置
 */
export const CRITICAL_ERROR_RETENTION_DAYS = 90;                 // 90天 - 严重错误数据保留（3个月）
export const SECURITY_EVENT_RETENTION_DAYS = 180;                // 180天 - 安全事件数据保留（6个月）
export const AUDIT_LOG_RETENTION_DAYS = 365;                     // 365天 - 审计日志保留（1年）
export const ALERT_HISTORY_RETENTION_DAYS = 90;                  // 90天 - 告警历史保留（3个月）

// ========================= 数据清理策略配置 =========================

/**
 * 自动清理执行时间 (单位: 小时，24小时制)
 * 🗑️ 数据清理任务的执行时间安排
 */
export const DATA_CLEANUP_EXECUTION_HOUR = 2;                    // 2点 - 数据清理执行时间（凌晨2点）
export const DATA_CLEANUP_EXECUTION_MINUTE = 0;                  // 0分 - 数据清理执行分钟
export const DATA_CLEANUP_WEEKEND_HOUR = 1;                      // 1点 - 周末深度清理时间（凌晨1点）

/**
 * 清理批量大小配置 (单位: 条数)
 * 📦 数据清理的批量处理大小
 */
export const DATA_CLEANUP_BATCH_SIZE = 1000;                     // 1000条 - 数据清理批量大小
export const DATA_CLEANUP_LARGE_BATCH_SIZE = 10000;              // 10000条 - 大批量数据清理大小
export const DATA_CLEANUP_SMALL_BATCH_SIZE = 100;                // 100条 - 小批量数据清理大小

/**
 * 清理操作间隔 (单位: 毫秒)
 * ⏱️ 批量清理操作之间的间隔时间
 */
export const DATA_CLEANUP_BATCH_INTERVAL_MS = 100;               // 100ms - 批量清理间隔
export const DATA_CLEANUP_LARGE_INTERVAL_MS = 500;               // 500ms - 大批量清理间隔
export const DATA_CLEANUP_SAFE_INTERVAL_MS = 1000;               // 1000ms - 安全清理间隔

// ========================= 数据备份策略配置 =========================

/**
 * 备份执行时间配置 (单位: 小时)
 * 💾 数据备份任务的执行时间安排
 */
export const DATA_BACKUP_DAILY_HOUR = 3;                         // 3点 - 每日备份时间（凌晨3点）
export const DATA_BACKUP_WEEKLY_DAY = 0;                         // 0 (周日) - 每周备份日
export const DATA_BACKUP_WEEKLY_HOUR = 1;                        // 1点 - 每周备份时间（凌晨1点）
export const DATA_BACKUP_MONTHLY_DATE = 1;                       // 1日 - 每月备份日期

/**
 * 备份数据保留时间 (单位: 天数)
 * 🗂️ 不同类型备份的保留时间
 */
export const BACKUP_DAILY_RETENTION_DAYS = 7;                    // 7天 - 每日备份保留时间
export const BACKUP_WEEKLY_RETENTION_DAYS = 30;                  // 30天 - 每周备份保留时间
export const BACKUP_MONTHLY_RETENTION_DAYS = 365;                // 365天 - 每月备份保留时间（1年）
export const BACKUP_CRITICAL_RETENTION_DAYS = 1095;              // 1095天 - 关键备份保留时间（3年）

// ========================= 数据压缩策略配置 =========================

/**
 * 数据压缩时间阈值 (单位: 天数)
 * 🗜️ 数据达到多长时间后进行压缩
 */
export const DATA_COMPRESSION_THRESHOLD_DAYS = 3;                // 3天 - 数据压缩阈值
export const DATA_COMPRESSION_LARGE_THRESHOLD_DAYS = 1;          // 1天 - 大数据压缩阈值
export const DATA_COMPRESSION_LOG_THRESHOLD_DAYS = 7;            // 7天 - 日志数据压缩阈值

/**
 * 压缩级别配置 (单位: 数值等级 1-9)
 * 🎚️ 不同数据类型的压缩级别
 */
export const DATA_COMPRESSION_LEVEL_METRICS = 6;                 // 6级 - 指标数据压缩级别（平衡压缩比和速度）
export const DATA_COMPRESSION_LEVEL_LOGS = 9;                    // 9级 - 日志数据压缩级别（最高压缩）
export const DATA_COMPRESSION_LEVEL_FAST = 3;                    // 3级 - 快速压缩级别
export const DATA_COMPRESSION_LEVEL_BALANCED = 6;                // 6级 - 平衡压缩级别

// ========================= 数据迁移和归档配置 =========================

/**
 * 数据迁移时间阈值 (单位: 天数)
 * 📦 数据迁移到归档存储的时间阈值
 */
export const DATA_MIGRATION_COLD_THRESHOLD_DAYS = 30;            // 30天 - 冷数据迁移阈值
export const DATA_MIGRATION_ARCHIVE_THRESHOLD_DAYS = 90;         // 90天 - 归档数据迁移阈值
export const DATA_MIGRATION_DEEP_ARCHIVE_THRESHOLD_DAYS = 365;   // 365天 - 深度归档迁移阈值

/**
 * 归档数据访问配置 (单位: 小时)
 * 🔍 归档数据的访问时间限制
 */
export const ARCHIVE_DATA_RESTORE_TIME_HOURS = 12;               // 12小时 - 归档数据恢复时间
export const ARCHIVE_DATA_ACCESS_TIMEOUT_HOURS = 48;             // 48小时 - 归档数据访问超时
export const DEEP_ARCHIVE_RESTORE_TIME_HOURS = 72;               // 72小时 - 深度归档恢复时间

// ========================= 数据质量监控配置 =========================

/**
 * 数据质量检查间隔 (单位: 小时)
 * ✅ 数据质量检查的执行频率
 */
export const DATA_QUALITY_CHECK_INTERVAL_HOURS = 6;              // 6小时 - 数据质量检查间隔
export const DATA_QUALITY_FULL_CHECK_INTERVAL_HOURS = 24;        // 24小时 - 全面数据质量检查间隔
export const DATA_QUALITY_QUICK_CHECK_INTERVAL_HOURS = 1;        // 1小时 - 快速数据质量检查间隔

/**
 * 数据完整性阈值 (单位: 百分比 0-100)
 * 🎯 数据完整性的质量标准
 */
export const DATA_COMPLETENESS_EXCELLENT_THRESHOLD = 99;         // 99% - 优秀数据完整性阈值
export const DATA_COMPLETENESS_GOOD_THRESHOLD = 95;              // 95% - 良好数据完整性阈值
export const DATA_COMPLETENESS_WARNING_THRESHOLD = 90;           // 90% - 警告数据完整性阈值
export const DATA_COMPLETENESS_CRITICAL_THRESHOLD = 80;          // 80% - 严重数据完整性阈值

// ========================= 存储优化配置 =========================

/**
 * 存储空间监控阈值 (单位: 百分比 0-100)
 * 💾 存储空间使用情况监控
 */
export const STORAGE_USAGE_WARNING_THRESHOLD = 80;               // 80% - 存储使用率警告阈值
export const STORAGE_USAGE_CRITICAL_THRESHOLD = 90;              // 90% - 存储使用率严重阈值
export const STORAGE_USAGE_EMERGENCY_THRESHOLD = 95;             // 95% - 存储使用率紧急阈值

/**
 * 存储清理触发条件 (单位: GB和百分比)
 * 🧹 自动存储清理的触发条件
 */
export const STORAGE_CLEANUP_SIZE_TRIGGER_GB = 10;               // 10GB - 存储清理大小触发条件
export const STORAGE_CLEANUP_PERCENTAGE_TRIGGER = 85;            // 85% - 存储清理百分比触发条件
export const STORAGE_EMERGENCY_CLEANUP_PERCENTAGE = 95;          // 95% - 紧急存储清理触发条件

// ========================= 监控数据生命周期配置 =========================

/**
 * 监控系统自身数据生命周期 (单位: 小时)
 * 📊 监控系统产生的数据管理
 */
export const MONITORING_METRICS_RETENTION_HOURS = 168;           // 168小时 - 监控指标保留时间（7天）
export const MONITORING_ALERTS_RETENTION_HOURS = 720;            // 720小时 - 监控告警保留时间（30天）
export const MONITORING_LOGS_RETENTION_HOURS = 72;               // 72小时 - 监控日志保留时间（3天）

/**
 * 性能基准数据保留 (单位: 天数)
 * 📈 性能基准和趋势数据的长期保留
 */
export const PERFORMANCE_BASELINE_RETENTION_DAYS = 90;           // 90天 - 性能基准数据保留
export const PERFORMANCE_TREND_RETENTION_DAYS = 180;             // 180天 - 性能趋势数据保留
export const PERFORMANCE_REPORT_RETENTION_DAYS = 365;            // 365天 - 性能报告保留

// ========================= 常量组合和类型定义 =========================

/**
 * 数据采集间隔组合对象
 * 📦 方便批量使用的数据采集间隔集合
 */
export const DATA_COLLECTION_INTERVALS = {
  system: {
    standard: SYSTEM_METRICS_COLLECTION_INTERVAL_SEC,
    high: SYSTEM_METRICS_HIGH_FREQUENCY_INTERVAL_SEC,
    low: SYSTEM_METRICS_LOW_FREQUENCY_INTERVAL_SEC
  },
  performance: {
    standard: PERFORMANCE_METRICS_COLLECTION_INTERVAL_SEC,
    fast: PERFORMANCE_METRICS_FAST_INTERVAL_SEC,
    slow: PERFORMANCE_METRICS_SLOW_INTERVAL_SEC
  },
  business: {
    standard: BUSINESS_METRICS_COLLECTION_INTERVAL_SEC,
    critical: BUSINESS_METRICS_CRITICAL_INTERVAL_SEC,
    regular: BUSINESS_METRICS_REGULAR_INTERVAL_SEC
  }
} as const;

/**
 * 数据保留时间组合对象
 * 📦 方便批量使用的数据保留时间集合
 */
export const DATA_RETENTION_PERIODS = {
  raw: {
    metrics: RAW_METRICS_RETENTION_HOURS,
    logs: RAW_LOG_RETENTION_HOURS,
    errors: RAW_ERROR_RETENTION_HOURS,
    performance: RAW_PERFORMANCE_RETENTION_HOURS
  },
  aggregated: {
    fiveMin: AGGREGATED_5MIN_RETENTION_DAYS,
    fifteenMin: AGGREGATED_15MIN_RETENTION_DAYS,
    oneHour: AGGREGATED_1HOUR_RETENTION_DAYS,
    oneDay: AGGREGATED_1DAY_RETENTION_DAYS
  },
  special: {
    criticalError: CRITICAL_ERROR_RETENTION_DAYS,
    securityEvent: SECURITY_EVENT_RETENTION_DAYS,
    auditLog: AUDIT_LOG_RETENTION_DAYS,
    alertHistory: ALERT_HISTORY_RETENTION_DAYS
  }
} as const;

/**
 * 数据清理配置组合对象
 * 📦 方便批量使用的数据清理配置集合
 */
export const DATA_CLEANUP_CONFIGS = {
  timing: {
    executionHour: DATA_CLEANUP_EXECUTION_HOUR,
    executionMinute: DATA_CLEANUP_EXECUTION_MINUTE,
    weekendHour: DATA_CLEANUP_WEEKEND_HOUR
  },
  batching: {
    standard: DATA_CLEANUP_BATCH_SIZE,
    large: DATA_CLEANUP_LARGE_BATCH_SIZE,
    small: DATA_CLEANUP_SMALL_BATCH_SIZE
  },
  intervals: {
    standard: DATA_CLEANUP_BATCH_INTERVAL_MS,
    large: DATA_CLEANUP_LARGE_INTERVAL_MS,
    safe: DATA_CLEANUP_SAFE_INTERVAL_MS
  }
} as const;

/**
 * 数据生命周期相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type DataCollectionFrequency = 'high' | 'standard' | 'low';
export type DataRetentionCategory = 'raw' | 'aggregated' | 'archived' | 'compressed';
export type DataCompressionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type DataQualityLevel = 'excellent' | 'good' | 'warning' | 'critical';
export type StorageType = 'hot' | 'warm' | 'cold' | 'archive' | 'deep_archive';