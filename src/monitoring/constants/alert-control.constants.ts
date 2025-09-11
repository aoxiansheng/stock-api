/**
 * 告警控制监控常量 - 直观优先架构
 * 🎯 告警频率、冷却时间、批量控制相关的所有配置参数
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

// ========================= 告警频率限制 =========================

/**
 * 系统级告警频率限制 (单位: 次数/小时)
 * 🚨 防止告警风暴，保护告警系统和接收者
 */
export const SYSTEM_ALERT_MAX_PER_HOUR = 60;                   // 60次/小时 - 系统总告警频率上限
export const CRITICAL_ALERT_MAX_PER_HOUR = 20;                 // 20次/小时 - 严重告警频率上限
export const WARNING_ALERT_MAX_PER_HOUR = 40;                  // 40次/小时 - 警告告警频率上限
export const INFO_ALERT_MAX_PER_HOUR = 100;                    // 100次/小时 - 信息告警频率上限

/**
 * 服务级告警频率限制 (单位: 次数/小时)
 * 🔧 各个服务组件的告警频率控制
 */
export const SERVICE_ALERT_MAX_PER_HOUR = 12;                  // 12次/小时 - 单个服务告警频率上限
export const API_ALERT_MAX_PER_HOUR = 15;                      // 15次/小时 - API服务告警频率上限
export const DATABASE_ALERT_MAX_PER_HOUR = 10;                 // 10次/小时 - 数据库告警频率上限
export const CACHE_ALERT_MAX_PER_HOUR = 8;                     // 8次/小时 - 缓存服务告警频率上限

/**
 * 模块级告警频率限制 (单位: 次数/小时)
 * 📦 不同功能模块的告警频率控制
 */
export const PERFORMANCE_ALERT_MAX_PER_HOUR = 12;              // 12次/小时 - 性能告警频率上限
export const ERROR_ALERT_MAX_PER_HOUR = 20;                    // 20次/小时 - 错误告警频率上限
export const RESOURCE_ALERT_MAX_PER_HOUR = 6;                  // 6次/小时 - 资源告警频率上限
export const SECURITY_ALERT_MAX_PER_HOUR = 5;                  // 5次/小时 - 安全告警频率上限

// ========================= 告警冷却时间配置 =========================

/**
 * 基础告警冷却时间 (单位: 分钟)
 * ❄️ 同类型告警的最小间隔时间，防止重复告警
 */
export const ALERT_COOLDOWN_CRITICAL_MINUTES = 5;              // 5分钟 - 严重告警冷却时间
export const ALERT_COOLDOWN_WARNING_MINUTES = 10;              // 10分钟 - 警告告警冷却时间
export const ALERT_COOLDOWN_INFO_MINUTES = 30;                 // 30分钟 - 信息告警冷却时间
export const ALERT_COOLDOWN_DEFAULT_MINUTES = 15;              // 15分钟 - 默认告警冷却时间

/**
 * 特定类型告警冷却时间 (单位: 分钟)
 * 🎯 不同告警类型的专门冷却时间配置
 */
export const PERFORMANCE_ALERT_COOLDOWN_MINUTES = 10;          // 10分钟 - 性能告警冷却时间
export const ERROR_RATE_ALERT_COOLDOWN_MINUTES = 5;            // 5分钟 - 错误率告警冷却时间
export const RESOURCE_USAGE_ALERT_COOLDOWN_MINUTES = 15;       // 15分钟 - 资源使用告警冷却时间
export const CONNECTIVITY_ALERT_COOLDOWN_MINUTES = 3;          // 3分钟 - 连接性告警冷却时间
export const SECURITY_ALERT_COOLDOWN_MINUTES = 1;              // 1分钟 - 安全告警冷却时间（安全问题需快速响应）

// ========================= 告警触发条件配置 =========================

/**
 * 连续触发条件 (单位: 次数)
 * 🔄 避免瞬时波动引起的误报，要求连续满足条件才触发告警
 */
export const ALERT_CONSECUTIVE_THRESHOLD_CRITICAL = 2;         // 2次连续 - 严重告警触发条件
export const ALERT_CONSECUTIVE_THRESHOLD_WARNING = 3;          // 3次连续 - 警告告警触发条件
export const ALERT_CONSECUTIVE_THRESHOLD_INFO = 5;             // 5次连续 - 信息告警触发条件
export const ALERT_CONSECUTIVE_THRESHOLD_DEFAULT = 3;          // 3次连续 - 默认告警触发条件

/**
 * 百分比触发条件 (单位: 小数格式 0.0-1.0)
 * 📊 基于百分比阈值的告警触发条件
 */
export const ALERT_PERCENTAGE_TRIGGER_MINOR = 0.05;            // 5% - 轻微阈值触发百分比
export const ALERT_PERCENTAGE_TRIGGER_MODERATE = 0.1;          // 10% - 中等阈值触发百分比
export const ALERT_PERCENTAGE_TRIGGER_MAJOR = 0.2;             // 20% - 重大阈值触发百分比
export const ALERT_PERCENTAGE_TRIGGER_CRITICAL = 0.5;          // 50% - 严重阈值触发百分比

// ========================= 告警批量处理配置 =========================

/**
 * 告警批量发送配置 (单位: 条数和秒)
 * 📦 批量处理告警以减少网络开销和接收者压力
 */
export const ALERT_BATCH_SIZE_SMALL = 5;                       // 5条 - 小批量告警大小
export const ALERT_BATCH_SIZE_MEDIUM = 10;                     // 10条 - 中批量告警大小
export const ALERT_BATCH_SIZE_LARGE = 20;                      // 20条 - 大批量告警大小
export const ALERT_BATCH_SIZE_MAX = 50;                        // 50条 - 最大批量告警大小

/**
 * 告警批量发送间隔 (单位: 秒)
 * ⏱️ 批量告警的发送时间间隔
 */
export const ALERT_BATCH_INTERVAL_URGENT_SEC = 10;             // 10秒 - 紧急告警批量间隔
export const ALERT_BATCH_INTERVAL_HIGH_SEC = 30;               // 30秒 - 高优先级告警批量间隔
export const ALERT_BATCH_INTERVAL_MEDIUM_SEC = 60;             // 60秒 - 中优先级告警批量间隔
export const ALERT_BATCH_INTERVAL_LOW_SEC = 300;               // 300秒 - 低优先级告警批量间隔

// ========================= 告警升级和降级配置 =========================

/**
 * 告警升级条件 (单位: 次数和分钟)
 * ⬆️ 告警级别自动升级的触发条件
 */
export const ALERT_ESCALATION_COUNT_THRESHOLD = 5;             // 5次 - 告警升级计数阈值
export const ALERT_ESCALATION_TIME_THRESHOLD_MIN = 30;         // 30分钟 - 告警升级时间阈值
export const ALERT_ESCALATION_CRITICAL_TIME_MIN = 15;          // 15分钟 - 严重告警升级时间
export const ALERT_ESCALATION_WARNING_TIME_MIN = 60;           // 60分钟 - 警告告警升级时间

/**
 * 告警恢复和降级条件 (单位: 次数和分钟)
 * ⬇️ 告警自动恢复和降级的条件
 */
export const ALERT_RECOVERY_SUCCESS_COUNT = 5;                 // 5次连续成功 - 告警恢复计数
export const ALERT_RECOVERY_TIME_THRESHOLD_MIN = 10;           // 10分钟 - 告警恢复时间阈值
export const ALERT_DOWNGRADE_TIME_THRESHOLD_MIN = 20;          // 20分钟 - 告警降级时间阈值
export const ALERT_AUTO_CLOSE_TIME_THRESHOLD_MIN = 120;        // 120分钟 - 告警自动关闭时间

// ========================= 告警通道控制配置 =========================

/**
 * 通知通道频率限制 (单位: 次数/小时)
 * 📢 不同通知通道的发送频率控制
 */
export const EMAIL_NOTIFICATION_MAX_PER_HOUR = 30;             // 30次/小时 - 邮件通知频率上限
export const SMS_NOTIFICATION_MAX_PER_HOUR = 10;               // 10次/小时 - 短信通知频率上限
export const WEBHOOK_NOTIFICATION_MAX_PER_HOUR = 100;          // 100次/小时 - Webhook通知频率上限
export const SLACK_NOTIFICATION_MAX_PER_HOUR = 50;             // 50次/小时 - Slack通知频率上限
export const DINGTALK_NOTIFICATION_MAX_PER_HOUR = 50;          // 50次/小时 - 钉钉通知频率上限

/**
 * 通知重试配置 (单位: 次数和秒)
 * 🔄 通知发送失败时的重试策略
 */
export const NOTIFICATION_RETRY_MAX_ATTEMPTS = 3;              // 3次 - 通知重试最大次数
export const NOTIFICATION_RETRY_INITIAL_DELAY_SEC = 30;        // 30秒 - 通知重试初始延迟
export const NOTIFICATION_RETRY_BACKOFF_MULTIPLIER = 2;        // 2倍 - 重试延迟递增倍数
export const NOTIFICATION_RETRY_MAX_DELAY_SEC = 600;           // 600秒 - 通知重试最大延迟

// ========================= 告警队列和缓冲区配置 =========================

/**
 * 告警队列大小限制 (单位: 条数)
 * 📤 告警处理队列的容量控制
 */
export const ALERT_QUEUE_MAX_SIZE = 1000;                      // 1000条 - 告警队列最大大小
export const ALERT_QUEUE_HIGH_WATERMARK = 800;                 // 800条 - 告警队列高水位标记
export const ALERT_QUEUE_LOW_WATERMARK = 200;                  // 200条 - 告警队列低水位标记
export const ALERT_QUEUE_EMERGENCY_SIZE = 50;                  // 50条 - 紧急告警队列大小

/**
 * 告警缓冲区配置 (单位: 条数和毫秒)
 * 🗂️ 告警缓冲处理的配置参数
 */
export const ALERT_BUFFER_SIZE = 100;                          // 100条 - 告警缓冲区大小
export const ALERT_BUFFER_FLUSH_INTERVAL_MS = 5000;            // 5000ms - 缓冲区刷新间隔
export const ALERT_BUFFER_FORCE_FLUSH_SIZE = 50;               // 50条 - 强制刷新缓冲区大小
export const ALERT_BUFFER_TIMEOUT_MS = 30000;                  // 30秒 - 缓冲区超时时间

// ========================= 告警性能监控配置 =========================

/**
 * 告警系统性能阈值 (单位: 毫秒和百分比)
 * ⚡ 告警系统自身性能的监控阈值
 */
export const ALERT_PROCESSING_TIME_WARNING_MS = 500;           // 500ms - 告警处理时间警告
export const ALERT_PROCESSING_TIME_CRITICAL_MS = 2000;         // 2000ms - 告警处理时间严重
export const ALERT_QUEUE_USAGE_WARNING_THRESHOLD = 0.8;        // 80% - 告警队列使用率警告
export const ALERT_QUEUE_USAGE_CRITICAL_THRESHOLD = 0.95;      // 95% - 告警队列使用率严重

/**
 * 告警发送成功率阈值 (单位: 小数格式 0.0-1.0)
 * 📊 告警通知发送成功率监控
 */
export const ALERT_DELIVERY_SUCCESS_RATE_WARNING = 0.9;        // 90% - 告警发送成功率警告阈值
export const ALERT_DELIVERY_SUCCESS_RATE_CRITICAL = 0.8;       // 80% - 告警发送成功率严重阈值
export const ALERT_DELIVERY_TIMEOUT_SEC = 30;                  // 30秒 - 告警发送超时时间

// ========================= 告警静默和抑制配置 =========================

/**
 * 告警静默时间配置 (单位: 分钟)
 * 🔇 计划内维护时的告警静默时间
 */
export const ALERT_SILENCE_MAINTENANCE_MIN = 60;               // 60分钟 - 维护期间静默时间
export const ALERT_SILENCE_DEPLOYMENT_MIN = 30;                // 30分钟 - 部署期间静默时间
export const ALERT_SILENCE_EMERGENCY_MIN = 15;                 // 15分钟 - 紧急静默时间
export const ALERT_SILENCE_MAX_DURATION_MIN = 480;             // 480分钟 - 最大静默时间（8小时）

/**
 * 告警抑制规则配置 (单位: 分钟和次数)
 * 🚫 相关告警的抑制策略
 */
export const ALERT_SUPPRESSION_CHILD_DELAY_MIN = 5;            // 5分钟 - 子告警抑制延迟
export const ALERT_SUPPRESSION_RELATED_COUNT = 3;              // 3个 - 相关告警抑制数量阈值
export const ALERT_SUPPRESSION_CASCADE_TIME_MIN = 10;          // 10分钟 - 级联告警抑制时间
export const ALERT_SUPPRESSION_DUPLICATE_TIME_MIN = 60;        // 60分钟 - 重复告警抑制时间

// ========================= 告警统计和报告配置 =========================

/**
 * 告警统计时间窗口 (单位: 小时)
 * 📈 告警数据统计的时间窗口配置
 */
export const ALERT_STATS_HOURLY_WINDOW = 1;                    // 1小时 - 小时级告警统计窗口
export const ALERT_STATS_DAILY_WINDOW = 24;                    // 24小时 - 日级告警统计窗口
export const ALERT_STATS_WEEKLY_WINDOW = 168;                  // 168小时 - 周级告警统计窗口
export const ALERT_STATS_MONTHLY_WINDOW = 720;                 // 720小时 - 月级告警统计窗口

/**
 * 告警数据保留配置 (单位: 天数)
 * 💾 不同类型告警数据的保留时间
 */
export const ALERT_DATA_RETENTION_CRITICAL_DAYS = 90;          // 90天 - 严重告警数据保留
export const ALERT_DATA_RETENTION_WARNING_DAYS = 60;           // 60天 - 警告告警数据保留
export const ALERT_DATA_RETENTION_INFO_DAYS = 30;              // 30天 - 信息告警数据保留
export const ALERT_STATS_RETENTION_DAYS = 365;                 // 365天 - 告警统计数据保留

// ========================= 常量组合和类型定义 =========================

/**
 * 告警频率限制组合对象
 * 📦 方便批量使用的告警频率限制集合
 */
export const ALERT_FREQUENCY_LIMITS = {
  system: SYSTEM_ALERT_MAX_PER_HOUR,
  critical: CRITICAL_ALERT_MAX_PER_HOUR,
  warning: WARNING_ALERT_MAX_PER_HOUR,
  info: INFO_ALERT_MAX_PER_HOUR,
  service: SERVICE_ALERT_MAX_PER_HOUR
} as const;

/**
 * 告警冷却时间组合对象
 * 📦 方便批量使用的告警冷却时间集合
 */
export const ALERT_COOLDOWN_TIMES = {
  critical: ALERT_COOLDOWN_CRITICAL_MINUTES,
  warning: ALERT_COOLDOWN_WARNING_MINUTES,
  info: ALERT_COOLDOWN_INFO_MINUTES,
  default: ALERT_COOLDOWN_DEFAULT_MINUTES
} as const;

/**
 * 告警批量处理配置组合对象
 * 📦 方便批量使用的批量处理配置集合
 */
export const ALERT_BATCH_CONFIGS = {
  sizes: {
    small: ALERT_BATCH_SIZE_SMALL,
    medium: ALERT_BATCH_SIZE_MEDIUM,
    large: ALERT_BATCH_SIZE_LARGE,
    max: ALERT_BATCH_SIZE_MAX
  },
  intervals: {
    urgent: ALERT_BATCH_INTERVAL_URGENT_SEC,
    high: ALERT_BATCH_INTERVAL_HIGH_SEC,
    medium: ALERT_BATCH_INTERVAL_MEDIUM_SEC,
    low: ALERT_BATCH_INTERVAL_LOW_SEC
  }
} as const;

/**
 * 告警控制相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'email' | 'sms' | 'webhook' | 'slack' | 'dingtalk' | 'log';
export type AlertState = 'open' | 'acknowledged' | 'resolved' | 'silenced' | 'suppressed';
export type AlertCategory = 'performance' | 'error' | 'resource' | 'security' | 'system';
export type BatchSize = 'small' | 'medium' | 'large' | 'max';