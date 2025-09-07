/**
 * 共享基础枚举定义
 * 用于消除整个系统中的常量重复，确保一致性
 *
 * 设计原则:
 * - 单一数据源：所有相同语义的字符串值统一定义
 * - 类型安全：提供完整的 TypeScript 类型定义
 * - 语义清晰：按功能域分组组织枚举
 * - 向后兼容：保持现有API接口不变
 */

/**
 * 统一认证类型枚举
 * 替代分散在多个文件中的 "api_key", "jwt" 等字符串值
 */
export enum AuthenticationType {
  JWT = "jwt",
  API_KEY = "api_key",
}

/**
 * 统一日志级别枚举
 * 替代 SYSTEM_CONSTANTS.LOG_LEVELS 和 RATE_LIMIT_LOG_LEVELS 中的重复值
 */
export enum LogLevel {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

/**
 * 统一操作状态枚举
 * 替代各个常量文件中的 "success", "error", "processing" 等状态值
 */
export enum OperationStatus {
  SUCCESS = "success",
  FAILED = "failed",
  ERROR = "error",
  PENDING = "pending",
  PROCESSING = "processing",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout",
  COMPLETED = "completed",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

/**
 * 统一通知类型枚举
 * 替代 OPERATION_CONSTANTS.NOTIFICATION_TYPES 中的类型定义
 */
export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * 统一数据状态枚举
 * 用于标识数据的生命周期状态
 */
export enum DataState {
  PENDING = "pending",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
  CACHED = "cached",
  EXPIRED = "expired",
}

/**
 * 统一环境类型枚举
 */
export enum Environment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TEST = "test",
}

// 导出所有枚举的值类型，供类型检查使用
export type AuthenticationTypeValue = `${AuthenticationType}`;
export type LogLevelValue = `${LogLevel}`;
export type OperationStatusValue = `${OperationStatus}`;
export type NotificationTypeValue = `${NotificationType}`;
export type DataStateValue = `${DataState}`;
export type EnvironmentValue = `${Environment}`;

/**
 * 工具函数：检查是否为有效的日志级别
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return Object.values(LogLevel).includes(level as LogLevel);
}

/**
 * 工具函数：检查是否为有效的操作状态
 */
export function isValidOperationStatus(
  status: string,
): status is OperationStatus {
  return Object.values(OperationStatus).includes(status as OperationStatus);
}

/**
 * 工具函数：检查是否为有效的认证类型
 */
export function isValidAuthenticationType(
  type: string,
): type is AuthenticationType {
  return Object.values(AuthenticationType).includes(type as AuthenticationType);
}

/**
 * 工具函数：获取所有可用的日志级别
 */
export function getAllLogLevels(): LogLevel[] {
  return Object.values(LogLevel);
}

/**
 * 工具函数：获取所有可用的操作状态
 */
export function getAllOperationStatuses(): OperationStatus[] {
  return Object.values(OperationStatus);
}

/**
 * 工具函数：获取所有可用的认证类型
 */
export function getAllAuthenticationTypes(): AuthenticationType[] {
  return Object.values(AuthenticationType);
}
