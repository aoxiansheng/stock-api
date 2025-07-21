/**
 * 安全审计服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

// 🔧 审计配置常量
export const SECURITY_AUDIT_CONFIG = Object.freeze({
  DEFAULT_QUERY_LIMIT: 100, // 默认查询限制
  DEFAULT_QUERY_OFFSET: 0, // 默认查询偏移
  REPORT_MAX_EVENTS: 10000, // 报告最大事件数
  TOP_RISKS_LIMIT: 10, // 顶级风险数量限制
  HIGH_FAILURE_THRESHOLD: 5, // 高失败次数阈值
  EVENT_ID_PREFIX: "evt_", // 事件ID前缀
  EVENT_ID_UUID_LENGTH: 8, // 事件ID UUID长度
  SEVERITY_ORDER_MULTIPLIER: 1, // 严重程度排序乘数
});

// 📝 操作名称常量
export const SECURITY_AUDIT_OPERATIONS = Object.freeze({
  LOG_SECURITY_EVENT: "logSecurityEvent",
  LOG_AUTHENTICATION_EVENT: "logAuthenticationEvent",
  LOG_AUTHORIZATION_EVENT: "logAuthorizationEvent",
  LOG_DATA_ACCESS_EVENT: "logDataAccessEvent",
  LOG_SUSPICIOUS_ACTIVITY: "logSuspiciousActivity",
  LOG_SYSTEM_EVENT: "logSystemEvent",
  GET_AUDIT_LOGS: "getAuditLogs",
  GENERATE_AUDIT_REPORT: "generateAuditReport",
  FLUSH_AUDIT_LOGS: "flushAuditLogs",
  ANALYZE_SUSPICIOUS_ACTIVITY: "analyzeSuspiciousActivity",
  CLEANUP_OLD_DATA: "cleanupOldData",
  PROCESS_HIGH_SEVERITY_EVENT: "processHighSeverityEvent",
  UPDATE_IP_ANALYSIS: "updateIPAnalysis",
  CALCULATE_RISK_SCORE: "calculateRiskScore",
  GENERATE_TAGS: "generateTags",
  GENERATE_SECURITY_RECOMMENDATIONS: "generateSecurityRecommendations",
  MAP_LOG_TO_EVENT: "mapLogToEvent",
});

// 📢 消息常量
export const SECURITY_AUDIT_MESSAGES = Object.freeze({
  // 成功消息
  EVENT_LOGGED: "安全事件已记录到缓冲区",
  SUSPICIOUS_IP_CLEARED: "清除可疑IP标记",
  AUDIT_LOGS_FLUSHED: "审计日志已刷新到数据库",
  AUDIT_REPORT_GENERATED: "审计报告生成成功",
  IP_ANALYSIS_UPDATED: "IP分析数据已更新",
  RISK_SCORE_CALCULATED: "风险评分计算完成",
  TAGS_GENERATED: "事件标签生成完成",

  // 错误消息
  MODULE_DESTROY_FLUSH_FAILED: "模块销毁时刷新审计日志失败",
  LOG_EVENT_FAILED: "记录安全事件失败",
  GENERATE_REPORT_FAILED: "生成审计报告失败",
  FLUSH_LOGS_FAILED: "保存审计日志失败",
  GET_AUDIT_LOGS_FAILED: "获取审计日志失败",
  IP_ANALYSIS_UPDATE_FAILED: "IP分析更新失败",
  RISK_SCORE_CALCULATION_FAILED: "风险评分计算失败",
  TAGS_GENERATION_FAILED: "事件标签生成失败",
  SUSPICIOUS_ACTIVITY_ANALYSIS_FAILED: "可疑活动分析失败",

  // 警告消息
  HIGH_SEVERITY_EVENT_AUTO_BLOCK: "严重安全事件 - 自动阻止IP",
  HIGH_FAILURE_RATE_DETECTED: "检测到高失败率",
  SUSPICIOUS_IP_DETECTED: "检测到可疑IP",
  CRITICAL_EVENT_DETECTED: "检测到严重安全事件",

  // 信息消息
  CLEANUP_AUTO_HANDLED: "旧数据清理任务通过Redis TTL自动处理，无需手动执行",
  EVENT_BUFFER_EMPTY: "事件缓冲区为空，跳过刷新",
  NO_EVENTS_IN_PERIOD: "指定时间段内无事件",
});

// 💡 推荐消息常量
export const SECURITY_AUDIT_RECOMMENDATIONS = Object.freeze({
  // 认证相关推荐
  STRICT_ACCOUNT_LOCKOUT: "考虑实施更严格的账户锁定策略",
  ENABLE_MFA: "启用多因素认证以增强安全性",
  STRENGTHEN_PASSWORD_POLICY: "加强密码策略要求",
  IMPLEMENT_CAPTCHA: "在登录页面实施验证码机制",

  // 网络安全推荐
  STRENGTHEN_IP_BLACKLIST: "加强IP黑名单管理",
  USE_WAF_DDOS_PROTECTION: "考虑使用WAF或DDoS防护服务",
  IMPLEMENT_RATE_LIMITING: "实施API速率限制",
  ENHANCE_NETWORK_MONITORING: "增强网络流量监控",

  // 事件响应推荐
  INVESTIGATE_CRITICAL_EVENTS: "立即调查所有严重安全事件",
  REVIEW_SECURITY_POLICIES: "审查和更新安全策略",
  ENHANCE_INCIDENT_RESPONSE: "完善事件响应流程",
  CONDUCT_SECURITY_TRAINING: "进行安全意识培训",

  // 系统安全推荐
  UPDATE_SECURITY_PATCHES: "及时更新安全补丁",
  REVIEW_ACCESS_PERMISSIONS: "定期审查访问权限",
  IMPLEMENT_SECURITY_MONITORING: "实施实时安全监控",
  BACKUP_SECURITY_LOGS: "建立安全日志备份机制",

  // 合规性推荐
  CONDUCT_SECURITY_AUDIT: "进行定期安全审计",
  DOCUMENT_SECURITY_PROCEDURES: "完善安全操作文档",
  IMPLEMENT_COMPLIANCE_CHECKS: "实施合规性检查",
  ESTABLISH_SECURITY_METRICS: "建立安全指标体系",
});

// 📊 严重程度映射常量
export const SECURITY_SEVERITY_ORDER = Object.freeze({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
});

// 🎯 事件类型常量
export const SECURITY_AUDIT_EVENT_TYPES = Object.freeze({
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  DATA_ACCESS: "data_access",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  SYSTEM: "system",
});

// 📈 事件结果常量
export const SECURITY_AUDIT_EVENT_OUTCOMES = Object.freeze({
  SUCCESS: "success",
  FAILURE: "failure",
  BLOCKED: "blocked",
});

// 🔒 事件严重程度常量
export const SECURITY_AUDIT_EVENT_SEVERITIES = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
});

// 📋 事件源常量
export const SECURITY_AUDIT_EVENT_SOURCES = Object.freeze({
  AUTH_SERVICE: "AuthService",
  AUTHORIZATION_SERVICE: "AuthorizationService",
  DATA_ACCESS_SERVICE: "DataAccessService",
  SECURITY_MIDDLEWARE: "SecurityMiddleware",
  SYSTEM_SERVICE: "SystemService",
});

// 🏷️ 事件标签常量
export const SECURITY_AUDIT_EVENT_TAGS = Object.freeze({
  SUSPICIOUS_IP: "suspicious_ip",
  INCIDENT: "incident",
  AUTH_FAILURE: "auth_failure",
  HIGH_RISK: "high_risk",
  AUTOMATED_BLOCK: "automated_block",
  MANUAL_REVIEW: "manual_review",
});

// ⚙️ 审计报告配置常量
export const SECURITY_AUDIT_REPORT_CONFIG = Object.freeze({
  DEFAULT_TREND_PERIODS: 7, // 默认趋势分析周期（天）
  MAX_RECOMMENDATION_COUNT: 20, // 最大推荐数量
  SUMMARY_CACHE_TTL: 3600, // 摘要缓存TTL（秒）
  REPORT_CACHE_TTL: 1800, // 报告缓存TTL（秒）
});

// 🔍 IP分析配置常量
export const SECURITY_AUDIT_IP_ANALYSIS_CONFIG = Object.freeze({
  ANALYSIS_WINDOW_HOURS: 24, // 分析窗口（小时）
  SUSPICIOUS_THRESHOLD_REQUESTS: 1000, // 可疑请求数阈值
  SUSPICIOUS_THRESHOLD_FAILURE_RATE: 0.3, // 可疑失败率阈值
  AUTO_BLOCK_THRESHOLD_FAILURES: 50, // 自动阻止失败次数阈值
  WHITELIST_CHECK_ENABLED: true, // 是否启用白名单检查
});

// 📊 统计指标常量
export const SECURITY_AUDIT_METRICS = Object.freeze({
  TOTAL_EVENTS: "total_events",
  CRITICAL_EVENTS: "critical_events",
  FAILED_AUTHENTICATIONS: "failed_authentications",
  SUSPICIOUS_ACTIVITIES: "suspicious_activities",
  DATA_ACCESS_EVENTS: "data_access_events",
  UNIQUE_IPS: "unique_ips",
  UNIQUE_USERS: "unique_users",
  BLOCKED_ATTEMPTS: "blocked_attempts",
  HIGH_RISK_EVENTS: "high_risk_events",
  SYSTEM_EVENTS: "system_events",
});

// 🎛️ 缓存键前缀常量
export const SECURITY_AUDIT_CACHE_KEYS = Object.freeze({
  EVENT_BUFFER: "security:audit:events",
  IP_ANALYSIS: "security:audit:ip_analysis:",
  SUSPICIOUS_IPS: "security:audit:suspicious_ips",
  REPORT_CACHE: "security:audit:report:",
  SUMMARY_CACHE: "security:audit:summary:",
  METRICS_CACHE: "security:audit:metrics:",
});

// ⏱️ 时间间隔常量
export const SECURITY_AUDIT_INTERVALS = Object.freeze({
  FLUSH_INTERVAL_MS: 30000, // 刷新间隔（毫秒）
  ANALYSIS_INTERVAL_MS: 300000, // 分析间隔（毫秒）
  CLEANUP_INTERVAL_MS: 3600000, // 清理间隔（毫秒）
  REPORT_GENERATION_TIMEOUT_MS: 60000, // 报告生成超时（毫秒）
});

// 🎯 推荐阈值常量
export const SECURITY_AUDIT_RECOMMENDATION_THRESHOLDS = Object.freeze({
  FAILED_AUTHENTICATIONS: 10, // 失败认证推荐阈值
  SUSPICIOUS_ACTIVITIES: 5, // 可疑活动推荐阈值
  CRITICAL_EVENTS: 1, // 严重事件推荐阈值
  HIGH_FAILURE_RATE: 0.2, // 高失败率推荐阈值
  UNIQUE_IP_THRESHOLD: 100, // 唯一IP推荐阈值
  DATA_ACCESS_THRESHOLD: 1000, // 数据访问推荐阈值
});

// 🔄 事件处理配置常量
export const SECURITY_AUDIT_EVENT_PROCESSING = Object.freeze({
  BATCH_SIZE: 100, // 批处理大小
  MAX_RETRY_ATTEMPTS: 3, // 最大重试次数
  RETRY_DELAY_MS: 1000, // 重试延迟（毫秒）
  PARALLEL_PROCESSING_LIMIT: 10, // 并行处理限制
  EVENT_VALIDATION_ENABLED: true, // 是否启用事件验证
});
