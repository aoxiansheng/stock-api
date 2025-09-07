/**
 * 系统级统一常量配置
 * 包含所有模块共用的基础配置项
 *
 * 设计原则：
 * - 不可变性：使用d eepFreeze 确保常量不被修改
 * - 类型安全：提供完整的 TypeScript 类型定义
 * - 语义分组：按功能分组组织常量
 * - 标准化命名：使用 UPPER_SNAKE_CASE 命名规范
 */

import type { DataState } from "./operations.constants";
import { OperationStatus } from "../../../monitoring/contracts/enums/operation-status.enum";
import { deepFreeze } from "../../utils/object-immutability.util";
import { LogLevel, Environment } from "../../types/enums/shared-base.enum";

export const SYSTEM_CONSTANTS = deepFreeze({
  // 通用操作状态
  OPERATION_STATUS: {
    SUCCESS: "success",
    FAILED: "failed",
    PENDING: OperationStatus.PENDING,
    PROCESSING: "processing",
    CANCELLED: "cancelled",
    TIMEOUT: "timeout",
    COMPLETED: "completed",
    ACTIVE: "active",
    INACTIVE: "inactive",
  } as const,

  // 通用日志级别 - 使用共享枚举消除重复
  LOG_LEVELS: {
    TRACE: LogLevel.TRACE,
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
    FATAL: LogLevel.FATAL,
  } as const,

  // 环境相关 - 使用共享枚举消除重复
  ENVIRONMENTS: {
    DEVELOPMENT: Environment.DEVELOPMENT,
    STAGING: Environment.STAGING,
    PRODUCTION: Environment.PRODUCTION,
    TEST: Environment.TEST,
  } as const,
});

// 导出类型定义 - 使用共享枚举类型
export type { LogLevel, Environment } from "../../types/enums/shared-base.enum";
// DataState 类型从 operations.constants.ts 导入，不再重复定义
export type { DataState };
// OperationStatus 现在从 metrics enum 导入
export { OperationStatus };

/**
 * 获取所有可用的操作状态
 */
export function getAllOperationStatuses(): OperationStatus[] {
  return Object.values(OperationStatus);
}

/**
 * 检查是否为有效的操作状态
 */
export function isValidOperationStatus(
  status: string,
): status is OperationStatus {
  return Object.values(OperationStatus).includes(status as OperationStatus);
}

/**
 * 获取所有可用的日志级别 - 使用共享枚举函数
 */
export { getAllLogLevels, isValidLogLevel } from "../../types/enums/shared-base.enum";
