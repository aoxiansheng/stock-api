/**
 * 共享基础枚举定义
 * 用于消除整个系统中的常量重复，确保一致性
 *
 * 设计原则:
 * - 单一数据源：所有相同语义的字符串值统一定义
 * - 类型安全：提供完整的 TypeScript 类型定义
 * - 语义清晰：按功能域分组组织枚举

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
// OperationStatus 枚举请统一从 `@common/enums/operation-status.enum` 引用，
// 以避免在多处重复定义导致的不一致。

/**
 * 统一通知类型枚举
 * 替代 OPERATION_CONSTANTS.NOTIFICATION_TYPES 中的类型定义
 */
// 已移除 NotificationType（仅示例/测试使用，非业务引用）

/**
 * 统一数据状态枚举
 * 用于标识数据的生命周期状态
 */
// 已移除 DataState（仅示例/测试使用，非业务引用）

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
// 注意：OperationStatus 相关类型与工具函数已在
// `@common/enums/operation-status.enum` 实现。
// 已移除 NotificationTypeValue / DataStateValue 类型别名
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
// isValidOperationStatus 请使用 @common/enums/operation-status.enum 中的实现

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
// getAllOperationStatuses 请使用 @common/enums/operation-status.enum 中的实现

/**
 * 工具函数：获取所有可用的认证类型
 */
export function getAllAuthenticationTypes(): AuthenticationType[] {
  return Object.values(AuthenticationType);
}

/**
 * 工具函数：检查状态是否为可用状态
 */
// isActiveOperationStatus 请使用 @common/enums/operation-status.enum 中的实现

/**
 * 工具函数：检查状态是否为不可用状态
 */
// isInactiveOperationStatus 请使用 @common/enums/operation-status.enum 中的实现

/**
 * 工具函数：检查状态是否为临时状态
 */
// isTemporaryOperationStatus 请使用 @common/enums/operation-status.enum 中的实现

/**
 * 工具函数：检查状态是否为终态
 */
// isFinalOperationStatus 请使用 @common/enums/operation-status.enum 中的实现
