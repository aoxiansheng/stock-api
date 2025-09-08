/**
 * 系统应用层配置常量
 * 🎯 Application层 - 系统级应用配置的统一管理
 * 📋 整合各层的系统配置，提供应用级的系统常量
 * 🆕 从unified/system.constants.ts迁移
 */

import { CORE_VALUES } from '../foundation';
import { OperationStatus } from '../../../monitoring/contracts/enums/operation-status.enum';
import { LogLevel, Environment, DataState } from '../../types/enums/shared-base.enum';

/**
 * 系统级操作状态配置
 * 🎯 统一管理所有操作状态常量
 */
export const SYSTEM_OPERATION_STATUS = Object.freeze({
  // 基础操作状态
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: OperationStatus.PENDING,
  PROCESSING: 'processing',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  COMPLETED: 'completed',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  
  // 扩展状态
  INITIALIZING: 'initializing',
  TERMINATING: 'terminating',
  SUSPENDED: 'suspended',
  RESUMED: 'resumed',
  RETRYING: 'retrying',
  QUEUED: 'queued',
  SCHEDULED: 'scheduled',
  EXECUTING: 'executing',
  ABORTED: 'aborted',
  PARTIAL: 'partial',
});

/**
 * 系统级日志级别配置
 * 🎯 使用共享枚举消除重复
 */
export const SYSTEM_LOG_LEVELS = Object.freeze({
  TRACE: LogLevel.TRACE,
  DEBUG: LogLevel.DEBUG,
  INFO: LogLevel.INFO,
  WARN: LogLevel.WARN,
  ERROR: LogLevel.ERROR,
  FATAL: LogLevel.FATAL,
  
  // 日志级别优先级映射
  PRIORITY: {
    [LogLevel.TRACE]: 0,
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
    [LogLevel.FATAL]: 5,
  },
  
  // 默认日志级别
  DEFAULT: LogLevel.INFO,
  
  // 环境相关的日志级别
  BY_ENVIRONMENT: {
    [Environment.DEVELOPMENT]: LogLevel.DEBUG,
    [Environment.TEST]: LogLevel.DEBUG,
    [Environment.STAGING]: LogLevel.INFO,
    [Environment.PRODUCTION]: LogLevel.WARN,
  },
});

/**
 * 系统环境配置
 * 🎯 使用共享枚举消除重复
 */
export const SYSTEM_ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: Environment.DEVELOPMENT,
  STAGING: Environment.STAGING,
  PRODUCTION: Environment.PRODUCTION,
  TEST: Environment.TEST,
  
  // 环境特性配置
  FEATURES: {
    [Environment.DEVELOPMENT]: {
      debug: true,
      verbose: true,
      mockData: true,
      hotReload: true,
      sourceMaps: true,
    },
    [Environment.TEST]: {
      debug: true,
      verbose: true,
      mockData: true,
      hotReload: false,
      sourceMaps: true,
    },
    [Environment.STAGING]: {
      debug: false,
      verbose: false,
      mockData: false,
      hotReload: false,
      sourceMaps: false,
    },
    [Environment.PRODUCTION]: {
      debug: false,
      verbose: false,
      mockData: false,
      hotReload: false,
      sourceMaps: false,
    },
  },
  
  // 当前环境
  CURRENT: (process.env.NODE_ENV || Environment.DEVELOPMENT) as Environment,
});

/**
 * 系统配置聚合
 * 🎯 提供统一的系统配置访问接口
 */
export const SYSTEM_APPLICATION_CONFIG = Object.freeze({
  // 系统标识
  SYSTEM_ID: 'newstockapi',
  VERSION: process.env.npm_package_version || '1.0.0',
  
  // 操作状态
  OPERATION_STATUS: SYSTEM_OPERATION_STATUS,
  
  // 日志配置
  LOG_LEVELS: SYSTEM_LOG_LEVELS,
  
  // 环境配置
  ENVIRONMENTS: SYSTEM_ENVIRONMENTS,
  
  // 系统限制
  LIMITS: {
    MAX_REQUEST_SIZE: CORE_VALUES.MEMORY_MB.MAX_REQUEST_SIZE * 1024 * 1024, // 转换为字节
    MAX_RESPONSE_SIZE: CORE_VALUES.MEMORY_MB.HIGH_USAGE * 1024 * 1024, // 200MB 转换为字节
    MAX_CONCURRENT_REQUESTS: 1000,
    MAX_QUEUE_SIZE: 10000,
    MAX_RETRY_ATTEMPTS: CORE_VALUES.RETRY.MAX_ATTEMPTS,
  },
  
  // 系统超时配置
  TIMEOUTS: {
    DEFAULT: CORE_VALUES.TIMEOUT_MS.DEFAULT,
    QUICK: CORE_VALUES.TIMEOUT_MS.QUICK,
    LONG: CORE_VALUES.TIMEOUT_MS.LONG,
    SHUTDOWN_GRACE_PERIOD: CORE_VALUES.TIME_MS.THIRTY_SECONDS,
  },
  
  // 系统路径
  PATHS: {
    LOGS: process.env.LOG_PATH || './logs',
    TEMP: process.env.TEMP_PATH || './temp',
    CACHE: process.env.CACHE_PATH || './cache',
    DATA: process.env.DATA_PATH || './data',
  },
});

/**
 * 系统工具函数类
 * 🎯 提供系统配置相关的工具方法
 */
export class SystemApplicationUtil {
  /**
   * 获取所有可用的操作状态
   */
  static getAllOperationStatuses(): string[] {
    return Object.values(SYSTEM_OPERATION_STATUS);
  }
  
  /**
   * 检查是否为有效的操作状态
   */
  static isValidOperationStatus(status: string): boolean {
    return Object.values(SYSTEM_OPERATION_STATUS).includes(status as any);
  }
  
  /**
   * 获取当前环境的日志级别
   */
  static getCurrentLogLevel(): LogLevel {
    const env = SYSTEM_ENVIRONMENTS.CURRENT;
    return SYSTEM_LOG_LEVELS.BY_ENVIRONMENT[env] || SYSTEM_LOG_LEVELS.DEFAULT;
  }
  
  /**
   * 比较日志级别优先级
   */
  static compareLogLevels(level1: LogLevel, level2: LogLevel): number {
    const priority1 = SYSTEM_LOG_LEVELS.PRIORITY[level1];
    const priority2 = SYSTEM_LOG_LEVELS.PRIORITY[level2];
    return priority1 - priority2;
  }
  
  /**
   * 检查日志级别是否应该被记录
   */
  static shouldLog(level: LogLevel, threshold: LogLevel = getCurrentLogLevel()): boolean {
    return SystemApplicationUtil.compareLogLevels(level, threshold) >= 0;
  }
  
  /**
   * 获取当前环境的特性配置
   */
  static getCurrentEnvironmentFeatures() {
    return SYSTEM_ENVIRONMENTS.FEATURES[SYSTEM_ENVIRONMENTS.CURRENT];
  }
  
  /**
   * 检查是否为生产环境
   */
  static isProduction(): boolean {
    return SYSTEM_ENVIRONMENTS.CURRENT === Environment.PRODUCTION;
  }
  
  /**
   * 检查是否为开发环境
   */
  static isDevelopment(): boolean {
    return SYSTEM_ENVIRONMENTS.CURRENT === Environment.DEVELOPMENT;
  }
  
  /**
   * 检查是否为测试环境
   */
  static isTest(): boolean {
    return SYSTEM_ENVIRONMENTS.CURRENT === Environment.TEST;
  }
}

/**
 * 向后兼容导出 - 支持原有的SYSTEM_CONSTANTS访问方式
 * @deprecated 使用新的结构化导出
 */
export const SYSTEM_CONSTANTS = Object.freeze({
  OPERATION_STATUS: SYSTEM_OPERATION_STATUS,
  LOG_LEVELS: SYSTEM_LOG_LEVELS,
  ENVIRONMENTS: SYSTEM_ENVIRONMENTS,
});

/**
 * 类型定义导出
 */
export { LogLevel, Environment } from '../../types/enums/shared-base.enum';
export type { DataState };
export { OperationStatus };

export type SystemOperationStatus = keyof typeof SYSTEM_OPERATION_STATUS;
export type SystemConfig = typeof SYSTEM_APPLICATION_CONFIG;

/**
 * 工具函数的向后兼容导出
 */
export const getAllOperationStatuses = SystemApplicationUtil.getAllOperationStatuses;
export const isValidOperationStatus = SystemApplicationUtil.isValidOperationStatus;
export { getAllLogLevels, isValidLogLevel } from '../../types/enums/shared-base.enum';

// 辅助函数 - 内部使用
function getCurrentLogLevel(): LogLevel {
  return SystemApplicationUtil.getCurrentLogLevel();
}