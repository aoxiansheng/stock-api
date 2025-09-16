/**
 * 告警系统超时和时间常量
 * 🎯 直观的时间配置，无需抽象层查找
 * 📊 基于业务场景的时间设计
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @refactored 2025-01-10
 * 
 * ⚠️ 重要迁移说明：
 * TTL配置已迁移至统一TTL配置管理：
 * - 冷却期TTL → unified-ttl.config.ts (alertCooldownTtl)
 * - 活跃数据TTL → unified-ttl.config.ts (alertActiveDataTtl)
 * - 配置缓存TTL → unified-ttl.config.ts (alertConfigCacheTtl)
 * - 统计缓存TTL → unified-ttl.config.ts (alertStatsCacheTtl)
 * - 历史数据TTL → unified-ttl.config.ts (alertHistoricalDataTtl)
 * - 归档数据TTL → unified-ttl.config.ts (alertArchivedDataTtl)
 * 
 * 本文件仅保留固定业务时间常量（不可配置的业务规则）
 */

/**
 * 告警响应超时配置
 * 固定业务时间常量（不可配置的业务规则）
 * 业务场景的直接时间定义，单位：秒
 */
export const ALERT_TIMEOUTS = {
  // 告警响应时间
  CRITICAL_RESPONSE: 5,         // 5秒 - 严重告警响应时间
  NORMAL_RESPONSE: 30,          // 30秒 - 普通告警响应时间
  EVALUATION_CYCLE: 60,         // 60秒 - 规则评估周期
  
  // ❌ 删除以下（应在系统配置层）：
  // JWT_LIFETIME: 3600,           → 移动到 appcore/config/app.config.ts
  // SESSION_LIFETIME: 86400,      → 移动到 appcore/config/app.config.ts  
  // IDLE_SESSION_TIMEOUT: 1800,   → 移动到 appcore/config/app.config.ts
  // RATE_LIMIT_WINDOW: 60,        → 移动到 appcore/config/app.config.ts
  // ACCOUNT_LOCKOUT: 1800,        → 移动到 appcore/config/app.config.ts
} as const;

/**
 * 操作超时配置
 * 固定业务操作时间常量（不可配置的业务规则）
 * 各类操作的超时时间，单位：毫秒
 */
export const OPERATION_TIMEOUTS = {
  // 快速操作
  VALIDATION_TIMEOUT: 1000,     // 1秒 - 验证超时
  CACHE_OPERATION: 5000,        // 5秒 - 缓存操作超时
  
  // 数据库操作
  DATABASE_QUERY: 5000,         // 5秒 - 数据库查询超时
  DATABASE_WRITE: 10000,        // 10秒 - 数据库写入超时
  
  // 网络操作
  API_REQUEST: 30000,           // 30秒 - API请求超时
  EMAIL_SEND: 30000,            // 30秒 - 邮件发送超时
  SMS_SEND: 5000,               // 5秒 - 短信发送超时
  WEBHOOK_CALL: 5000,           // 5秒 - Webhook调用超时
  
  // 批量操作
  BATCH_OPERATION: 60000,       // 60秒 - 批量操作超时
  REPORT_GENERATION: 300000,    // 5分钟 - 报表生成超时
  DATA_EXPORT: 600000,          // 10分钟 - 数据导出超时
} as const;

/**
 * 数据保留配置
 * 固定业务数据保留规则（不可配置的业务规则）
 * 各类数据的保留时间，单位：天数
 */
export const DATA_RETENTION = {
  // 告警数据
  ALERT_HISTORY: 90,            // 90天 - 告警历史保留期
  ALERT_METRICS: 30,            // 30天 - 告警指标保留期
  
  // 系统日志
  SYSTEM_LOGS: 30,              // 30天 - 系统日志保留期
  ERROR_LOGS: 90,               // 90天 - 错误日志保留期
  AUDIT_LOGS: 365,              // 365天 - 审计日志保留期
  
  // 用户数据
  USER_ACTIVITY: 90,            // 90天 - 用户活动保留期
  SESSION_LOGS: 30,             // 30天 - 会话日志保留期
  
  // 通知数据
  NOTIFICATION_LOGS: 30,        // 30天 - 通知日志保留期
  DELIVERY_STATUS: 30,          // 30天 - 投递状态保留期
  
  // 备份数据
  ARCHIVED_DATA: 365,           // 365天 - 归档数据保留期
  BACKUP_DATA: 365,             // 365天 - 备份数据保留期
} as const;

// 类型定义
export type AlertTimeouts = typeof ALERT_TIMEOUTS;
export type OperationTimeouts = typeof OPERATION_TIMEOUTS;
export type DataRetention = typeof DATA_RETENTION;