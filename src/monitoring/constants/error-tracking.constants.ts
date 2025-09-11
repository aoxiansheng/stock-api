/**
 * 错误跟踪监控常量 - 直观优先架构
 * 🎯 错误率、成功率、失败率相关的所有监控阈值和配置
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

// ========================= HTTP错误率阈值 =========================

/**
 * HTTP API错误率阈值 (单位: 小数格式 0.0-1.0)
 * 🚨 基于行业标准的HTTP错误率容忍度，小数格式便于计算
 */
export const HTTP_ERROR_RATE_EXCELLENT_THRESHOLD = 0.001;      // 0.1% - 优秀错误率，接近完美
export const HTTP_ERROR_RATE_GOOD_THRESHOLD = 0.01;           // 1.0% - 良好错误率，行业标准
export const HTTP_ERROR_RATE_WARNING_THRESHOLD = 0.05;        // 5.0% - 警告错误率，需要关注
export const HTTP_ERROR_RATE_POOR_THRESHOLD = 0.1;            // 10.0% - 较高错误率，需要优化
export const HTTP_ERROR_RATE_CRITICAL_THRESHOLD = 0.2;        // 20.0% - 严重错误率，立即处理

/**
 * HTTP成功率阈值 (单位: 小数格式 0.0-1.0)
 * ✅ 成功率阈值，与错误率互补，用于正面监控
 */
export const HTTP_SUCCESS_RATE_EXCELLENT_THRESHOLD = 0.999;    // 99.9% - 优秀成功率
export const HTTP_SUCCESS_RATE_GOOD_THRESHOLD = 0.99;         // 99.0% - 良好成功率
export const HTTP_SUCCESS_RATE_WARNING_THRESHOLD = 0.95;      // 95.0% - 警告成功率
export const HTTP_SUCCESS_RATE_POOR_THRESHOLD = 0.9;          // 90.0% - 较低成功率
export const HTTP_SUCCESS_RATE_CRITICAL_THRESHOLD = 0.8;      // 80.0% - 严重成功率问题

// ========================= 不同HTTP状态码的错误阈值 =========================

/**
 * 4xx客户端错误率阈值 (单位: 小数格式 0.0-1.0)
 * 👤 客户端错误通常由用户行为引起，容忍度相对较高
 */
export const HTTP_4XX_ERROR_RATE_EXCELLENT_THRESHOLD = 0.02;   // 2.0% - 优秀客户端错误率
export const HTTP_4XX_ERROR_RATE_GOOD_THRESHOLD = 0.05;       // 5.0% - 良好客户端错误率
export const HTTP_4XX_ERROR_RATE_WARNING_THRESHOLD = 0.1;     // 10.0% - 警告客户端错误率
export const HTTP_4XX_ERROR_RATE_POOR_THRESHOLD = 0.2;        // 20.0% - 较高客户端错误率
export const HTTP_4XX_ERROR_RATE_CRITICAL_THRESHOLD = 0.3;    // 30.0% - 严重客户端错误率

/**
 * 5xx服务器错误率阈值 (单位: 小数格式 0.0-1.0)
 * 🖥️ 服务器错误直接反映系统问题，容忍度极低
 */
export const HTTP_5XX_ERROR_RATE_EXCELLENT_THRESHOLD = 0.0001; // 0.01% - 优秀服务器错误率
export const HTTP_5XX_ERROR_RATE_GOOD_THRESHOLD = 0.001;      // 0.1% - 良好服务器错误率
export const HTTP_5XX_ERROR_RATE_WARNING_THRESHOLD = 0.01;    // 1.0% - 警告服务器错误率
export const HTTP_5XX_ERROR_RATE_POOR_THRESHOLD = 0.05;       // 5.0% - 较高服务器错误率
export const HTTP_5XX_ERROR_RATE_CRITICAL_THRESHOLD = 0.1;    // 10.0% - 严重服务器错误率

// ========================= 业务错误率阈值 =========================

/**
 * 业务逻辑错误率阈值 (单位: 小数格式 0.0-1.0)
 * 💼 业务逻辑层面的错误，如验证失败、业务规则违反等
 */
export const BUSINESS_ERROR_RATE_EXCELLENT_THRESHOLD = 0.005;  // 0.5% - 优秀业务错误率
export const BUSINESS_ERROR_RATE_GOOD_THRESHOLD = 0.02;       // 2.0% - 良好业务错误率
export const BUSINESS_ERROR_RATE_WARNING_THRESHOLD = 0.05;    // 5.0% - 警告业务错误率
export const BUSINESS_ERROR_RATE_POOR_THRESHOLD = 0.1;        // 10.0% - 较高业务错误率
export const BUSINESS_ERROR_RATE_CRITICAL_THRESHOLD = 0.2;    // 20.0% - 严重业务错误率

/**
 * 数据验证错误率阈值 (单位: 小数格式 0.0-1.0)
 * ✅ 数据验证失败的错误率，通常由客户端数据质量引起
 */
export const VALIDATION_ERROR_RATE_EXCELLENT_THRESHOLD = 0.01; // 1.0% - 优秀验证错误率
export const VALIDATION_ERROR_RATE_GOOD_THRESHOLD = 0.03;     // 3.0% - 良好验证错误率
export const VALIDATION_ERROR_RATE_WARNING_THRESHOLD = 0.1;   // 10.0% - 警告验证错误率
export const VALIDATION_ERROR_RATE_POOR_THRESHOLD = 0.2;      // 20.0% - 较高验证错误率
export const VALIDATION_ERROR_RATE_CRITICAL_THRESHOLD = 0.4;  // 40.0% - 严重验证错误率

// ========================= 系统可用性阈值 =========================

/**
 * 系统可用性阈值 (单位: 小数格式 0.0-1.0)
 * 🔧 系统整体可用性，基于SLA标准
 */
export const SYSTEM_AVAILABILITY_EXCELLENT_THRESHOLD = 0.9999;  // 99.99% - 优秀可用性（4个9）
export const SYSTEM_AVAILABILITY_GOOD_THRESHOLD = 0.999;       // 99.9% - 良好可用性（3个9）
export const SYSTEM_AVAILABILITY_WARNING_THRESHOLD = 0.995;    // 99.5% - 警告可用性
export const SYSTEM_AVAILABILITY_POOR_THRESHOLD = 0.99;        // 99.0% - 较低可用性
export const SYSTEM_AVAILABILITY_CRITICAL_THRESHOLD = 0.95;    // 95.0% - 严重可用性问题

/**
 * 服务健康度阈值 (单位: 小数格式 0.0-1.0)
 * 💗 服务健康状态的综合评估
 */
export const SERVICE_HEALTH_EXCELLENT_THRESHOLD = 0.95;        // 95% - 优秀服务健康度
export const SERVICE_HEALTH_GOOD_THRESHOLD = 0.85;            // 85% - 良好服务健康度
export const SERVICE_HEALTH_WARNING_THRESHOLD = 0.75;         // 75% - 警告服务健康度
export const SERVICE_HEALTH_POOR_THRESHOLD = 0.6;             // 60% - 较低服务健康度
export const SERVICE_HEALTH_CRITICAL_THRESHOLD = 0.4;         // 40% - 严重服务健康问题

// ========================= 错误统计和计数阈值 =========================

/**
 * 错误计数阈值 (单位: 次数/分钟)
 * 🔢 基于绝对错误数量的监控，用于检测突发错误
 */
export const ERROR_COUNT_PER_MINUTE_EXCELLENT = 1;             // 1次/分钟 - 优秀错误频率
export const ERROR_COUNT_PER_MINUTE_GOOD = 5;                 // 5次/分钟 - 良好错误频率
export const ERROR_COUNT_PER_MINUTE_WARNING = 20;             // 20次/分钟 - 警告错误频率
export const ERROR_COUNT_PER_MINUTE_POOR = 50;                // 50次/分钟 - 较高错误频率
export const ERROR_COUNT_PER_MINUTE_CRITICAL = 100;           // 100次/分钟 - 严重错误频率

/**
 * 连续错误阈值 (单位: 次数)
 * 🔄 连续错误次数，用于检测系统持续性故障
 */
export const CONSECUTIVE_ERRORS_WARNING_COUNT = 3;             // 3次连续错误 - 警告
export const CONSECUTIVE_ERRORS_POOR_COUNT = 5;               // 5次连续错误 - 较严重
export const CONSECUTIVE_ERRORS_CRITICAL_COUNT = 10;          // 10次连续错误 - 严重故障

/**
 * 错误激增检测阈值 (单位: 倍数)
 * 📈 错误率相对于基线的增长倍数
 */
export const ERROR_SPIKE_WARNING_MULTIPLIER = 2.0;            // 2倍 - 错误激增警告
export const ERROR_SPIKE_POOR_MULTIPLIER = 5.0;               // 5倍 - 错误激增较严重
export const ERROR_SPIKE_CRITICAL_MULTIPLIER = 10.0;          // 10倍 - 错误激增严重

// ========================= 错误监控时间窗口配置 =========================

/**
 * 错误率计算时间窗口 (单位: 秒)
 * ⏱️ 错误率统计的时间窗口设置
 */
export const ERROR_RATE_CALCULATION_WINDOW_SEC = 300;          // 300秒 - 5分钟窗口（标准）
export const ERROR_RATE_SHORT_WINDOW_SEC = 60;                // 60秒 - 1分钟窗口（快速响应）
export const ERROR_RATE_LONG_WINDOW_SEC = 1800;               // 1800秒 - 30分钟窗口（长期趋势）

/**
 * 错误监控采集间隔 (单位: 毫秒)
 * 📊 错误指标采集的时间间隔
 */
export const ERROR_METRICS_COLLECTION_INTERVAL_MS = 30000;     // 30秒 - 标准采集间隔
export const ERROR_METRICS_FAST_COLLECTION_INTERVAL_MS = 5000; // 5秒 - 高频采集（告警时）
export const ERROR_METRICS_SLOW_COLLECTION_INTERVAL_MS = 120000; // 2分钟 - 低频采集（正常时）

// ========================= 错误告警配置 =========================

/**
 * 错误率告警配置
 * 🚨 错误率异常的告警参数
 */
export const ERROR_TRACKING_ALERT_COOLDOWN_MINUTES = 5;       // 5分钟 - 错误跟踪告警冷却时间
export const ERROR_RATE_ALERT_MAX_PER_HOUR = 12;              // 12次/小时 - 错误率告警频率限制
export const ERROR_RATE_CONSECUTIVE_THRESHOLD_COUNT = 3;       // 3次连续 - 连续超阈值才告警

/**
 * 错误计数告警配置  
 * 📈 错误计数异常的告警参数
 */
export const ERROR_COUNT_TRACKING_ALERT_COOLDOWN_MINUTES = 2; // 2分钟 - 错误计数告警冷却时间
export const ERROR_COUNT_ALERT_MAX_PER_HOUR = 30;             // 30次/小时 - 错误计数告警频率限制
export const ERROR_COUNT_CONSECUTIVE_THRESHOLD_COUNT = 2;      // 2次连续 - 连续超阈值才告警

/**
 * 可用性告警配置
 * 🔧 系统可用性异常的告警参数
 */
export const AVAILABILITY_TRACKING_ALERT_COOLDOWN_MINUTES = 10; // 10分钟 - 可用性告警冷却时间
export const AVAILABILITY_ALERT_MAX_PER_HOUR = 6;             // 6次/小时 - 可用性告警频率限制
export const AVAILABILITY_CONSECUTIVE_THRESHOLD_COUNT = 2;     // 2次连续 - 连续超阈值才告警

// ========================= 错误分类和优先级 =========================

/**
 * 关键错误类型优先级 (单位: 权重分数 1-10)
 * ⭐ 不同类型错误的优先级权重，用于告警排序
 */
export const CRITICAL_ERROR_TYPE_WEIGHT = 10;                 // 10分 - 关键错误（系统崩溃）
export const SECURITY_ERROR_TYPE_WEIGHT = 9;                  // 9分 - 安全错误（安全漏洞）
export const DATA_ERROR_TYPE_WEIGHT = 8;                      // 8分 - 数据错误（数据丢失）
export const PERFORMANCE_ERROR_TYPE_WEIGHT = 7;               // 7分 - 性能错误（超时）
export const BUSINESS_ERROR_TYPE_WEIGHT = 6;                  // 6分 - 业务错误（逻辑错误）
export const VALIDATION_ERROR_TYPE_WEIGHT = 3;                // 3分 - 验证错误（输入验证）
export const CLIENT_ERROR_TYPE_WEIGHT = 2;                    // 2分 - 客户端错误（用户输入）

/**
 * 错误严重程度分级 (单位: 数值等级 1-5)
 * 📊 错误严重程度的数值化分级
 */
export const ERROR_SEVERITY_LEVEL_CRITICAL = 5;               // 5级 - 严重错误（系统不可用）
export const ERROR_SEVERITY_LEVEL_HIGH = 4;                   // 4级 - 高严重度（功能严重受损）
export const ERROR_SEVERITY_LEVEL_MEDIUM = 3;                 // 3级 - 中等严重度（功能部分受损）
export const ERROR_SEVERITY_LEVEL_LOW = 2;                    // 2级 - 低严重度（功能轻微影响）
export const ERROR_SEVERITY_LEVEL_INFO = 1;                   // 1级 - 信息级别（记录信息）

// ========================= 错误恢复和重试配置 =========================

/**
 * 错误重试配置 (单位: 次数和毫秒)
 * 🔄 错误发生时的自动重试策略
 */
export const ERROR_RETRY_MAX_ATTEMPTS = 3;                    // 3次 - 最大重试次数
export const ERROR_RETRY_INITIAL_DELAY_MS = 1000;             // 1秒 - 初始重试延迟
export const ERROR_RETRY_BACKOFF_MULTIPLIER = 2;              // 2倍 - 重试延迟递增倍数
export const ERROR_RETRY_MAX_DELAY_MS = 30000;                // 30秒 - 最大重试延迟

/**
 * 错误恢复时间配置 (单位: 秒)
 * 🩹 系统从错误状态恢复的时间配置
 */
export const ERROR_RECOVERY_TIMEOUT_SEC = 300;                // 300秒 - 错误恢复超时时间（5分钟）
export const ERROR_RECOVERY_CHECK_INTERVAL_SEC = 30;          // 30秒 - 错误恢复状态检查间隔
export const ERROR_RECOVERY_SUCCESS_THRESHOLD_COUNT = 10;     // 10次连续成功 - 认为已恢复

// ========================= 错误数据保留和清理配置 =========================

/**
 * 错误日志保留配置 (单位: 天数)
 * 💾 错误日志和统计数据的保留时间
 */
export const ERROR_LOG_RETENTION_DAYS = 30;                   // 30天 - 详细错误日志保留
export const ERROR_STATS_RETENTION_DAYS = 90;                 // 90天 - 错误统计数据保留
export const ERROR_CRITICAL_LOG_RETENTION_DAYS = 365;         // 365天 - 关键错误日志保留（1年）

/**
 * 错误数据清理配置 (单位: 小时)
 * 🧹 定期清理过期错误数据的配置
 */
export const ERROR_DATA_CLEANUP_INTERVAL_HOURS = 24;          // 24小时 - 错误数据清理间隔
export const ERROR_DATA_CLEANUP_BATCH_SIZE = 1000;            // 1000条 - 每次清理的数据量
export const ERROR_DATA_ARCHIVE_BEFORE_DELETE_DAYS = 7;       // 7天 - 删除前归档时间

// ========================= 常量组合和类型定义 =========================

/**
 * HTTP错误率阈值组合对象
 * 📦 方便批量使用的HTTP错误率阈值集合
 */
export const HTTP_ERROR_RATE_THRESHOLDS = {
  excellent: HTTP_ERROR_RATE_EXCELLENT_THRESHOLD,
  good: HTTP_ERROR_RATE_GOOD_THRESHOLD,
  warning: HTTP_ERROR_RATE_WARNING_THRESHOLD,
  poor: HTTP_ERROR_RATE_POOR_THRESHOLD,
  critical: HTTP_ERROR_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * HTTP成功率阈值组合对象
 * 📦 方便批量使用的HTTP成功率阈值集合
 */
export const HTTP_SUCCESS_RATE_THRESHOLDS = {
  excellent: HTTP_SUCCESS_RATE_EXCELLENT_THRESHOLD,
  good: HTTP_SUCCESS_RATE_GOOD_THRESHOLD,
  warning: HTTP_SUCCESS_RATE_WARNING_THRESHOLD,
  poor: HTTP_SUCCESS_RATE_POOR_THRESHOLD,
  critical: HTTP_SUCCESS_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * 系统可用性阈值组合对象
 * 📦 方便批量使用的系统可用性阈值集合
 */
export const SYSTEM_AVAILABILITY_THRESHOLDS = {
  excellent: SYSTEM_AVAILABILITY_EXCELLENT_THRESHOLD,
  good: SYSTEM_AVAILABILITY_GOOD_THRESHOLD,
  warning: SYSTEM_AVAILABILITY_WARNING_THRESHOLD,
  poor: SYSTEM_AVAILABILITY_POOR_THRESHOLD,
  critical: SYSTEM_AVAILABILITY_CRITICAL_THRESHOLD
} as const;

/**
 * 错误计数阈值组合对象
 * 📦 方便批量使用的错误计数阈值集合
 */
export const ERROR_COUNT_PER_MINUTE_THRESHOLDS = {
  excellent: ERROR_COUNT_PER_MINUTE_EXCELLENT,
  good: ERROR_COUNT_PER_MINUTE_GOOD,
  warning: ERROR_COUNT_PER_MINUTE_WARNING,
  poor: ERROR_COUNT_PER_MINUTE_POOR,
  critical: ERROR_COUNT_PER_MINUTE_CRITICAL
} as const;

/**
 * 错误跟踪相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type ErrorTrackingThresholds = {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
};

export type ErrorType = 'http_error' | 'business_error' | 'validation_error' | 'system_error' | 'security_error';
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ErrorLevel = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';
export type HttpStatusCategory = '2xx' | '3xx' | '4xx' | '5xx';