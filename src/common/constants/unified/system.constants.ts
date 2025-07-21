/**
 * 系统级统一常量配置
 * 包含所有模块共用的基础配置项
 *
 * 设计原则：
 * - 不可变性：使用 Object.freeze() 确保常量不被修改
 * - 类型安全：提供完整的 TypeScript 类型定义
 * - 语义分组：按功能分组组织常量
 * - 标准化命名：使用 UPPER_SNAKE_CASE 命名规范
 */

export const SYSTEM_CONSTANTS = Object.freeze({
  // 通用操作状态
  OPERATION_STATUS: {
    SUCCESS: "success",
    FAILED: "failed",
    PENDING: "pending",
    PROCESSING: "processing",
    CANCELLED: "cancelled",
    TIMEOUT: "timeout",
    COMPLETED: "completed",
    ACTIVE: "active",
    INACTIVE: "inactive",
  } as const,

  // 通用日志级别
  LOG_LEVELS: {
    TRACE: "trace",
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    FATAL: "fatal",
  } as const,

  // 环境相关
  ENVIRONMENTS: {
    DEVELOPMENT: "development",
    STAGING: "staging",
    PRODUCTION: "production",
    TEST: "test",
  } as const,

  // 数据状态定义
  DATA_STATES: {
    FRESH: "fresh", // 新鲜数据
    STALE: "stale", // 过期数据
    DIRTY: "dirty", // 脏数据
    CACHED: "cached", // 缓存数据
    PERSISTED: "persisted", // 持久化数据
  } as const,
});

// 导出类型定义
export type OperationStatus =
  (typeof SYSTEM_CONSTANTS.OPERATION_STATUS)[keyof typeof SYSTEM_CONSTANTS.OPERATION_STATUS];
export type LogLevel =
  (typeof SYSTEM_CONSTANTS.LOG_LEVELS)[keyof typeof SYSTEM_CONSTANTS.LOG_LEVELS];
export type Environment =
  (typeof SYSTEM_CONSTANTS.ENVIRONMENTS)[keyof typeof SYSTEM_CONSTANTS.ENVIRONMENTS];
export type DataState =
  (typeof SYSTEM_CONSTANTS.DATA_STATES)[keyof typeof SYSTEM_CONSTANTS.DATA_STATES];

/**
 * 获取所有可用的操作状态
 */
export function getAllOperationStatuses(): OperationStatus[] {
  return Object.values(SYSTEM_CONSTANTS.OPERATION_STATUS);
}

/**
 * 检查是否为有效的操作状态
 */
export function isValidOperationStatus(
  status: string,
): status is OperationStatus {
  return Object.values(SYSTEM_CONSTANTS.OPERATION_STATUS).includes(
    status as OperationStatus,
  );
}

/**
 * 获取所有可用的日志级别
 */
export function getAllLogLevels(): LogLevel[] {
  return Object.values(SYSTEM_CONSTANTS.LOG_LEVELS);
}

/**
 * 检查是否为有效的日志级别
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return Object.values(SYSTEM_CONSTANTS.LOG_LEVELS).includes(level as LogLevel);
}
