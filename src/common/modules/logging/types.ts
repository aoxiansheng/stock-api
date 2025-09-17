/**
 * 日志级别枚举
 */
export type LogLevel =
  | "silent"
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace";

/**
 * 日志级别数值映射
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  silent: 0,
  fatal: 1,
  error: 2,
  warn: 3,
  info: 4,
  debug: 5,
  trace: 6,
};

/**
 * 功能特性配置接口
 */
export interface LoggingFeatures {
  /** 是否启用增强日志功能 */
  enhancedLoggingEnabled: boolean;
  /** 是否启用级别检查缓存 */
  levelCacheEnabled: boolean;
  /** 是否启用结构化日志 */
  structuredLogging: boolean;
  /** 是否启用性能模式 */
  performanceMode: boolean;
  /** 是否允许动态更新配置 */
  dynamicUpdateEnabled: boolean;
}

/**
 * 性能配置接口
 */
export interface LoggingPerformance {
  /** 是否启用缓存 */
  cacheEnabled: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry: number;
  /** 最大缓存条目数 */
  maxCacheSize: number;
  /** 性能警告阈值（毫秒） */
  performanceThreshold: number;
}

/**
 * 输出配置接口
 */
export interface LoggingOutput {
  /** 是否启用彩色输出 */
  colorEnabled: boolean;
  /** 是否包含时间戳 */
  timestampEnabled: boolean;
  /** 是否包含上下文信息 */
  contextEnabled: boolean;
  /** 是否包含堆栈追踪 */
  stackTraceEnabled: boolean;
}

/**
 * 主配置接口
 */
export interface LogLevelConfig {
  /** 配置文件版本 */
  version: string;
  /** 配置描述 */
  description?: string;
  /** 全局日志级别 */
  global: LogLevel;
  /** 模块级别配置 */
  modules: Record<string, LogLevel | string>;
  /** 功能特性配置 */
  features: LoggingFeatures;
  /** 性能配置 */
  performance: LoggingPerformance;
  /** 输出配置 */
  output: LoggingOutput;
  /** 命名空间配置（第二阶段实现） */
  namespaces?: Record<string, LogLevel>;
}

/**
 * 更新配置项接口
 */
export interface UpdateConfig {
  /** 目标（模块名、命名空间或空字符串表示全局） */
  target: string;
  /** 新的日志级别 */
  level: LogLevel;
  /** 更新类型 */
  type: "module" | "namespace" | "global";
}

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  /** 缓存的结果 */
  result: boolean;
  /** 创建时间戳 */
  timestamp: number;
}

/**
 * 统计信息接口
 */
export interface LoggingStats {
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存未命中次数 */
  cacheMisses: number;
  /** 总查询次数 */
  totalQueries: number;
  /** 缓存命中率 */
  hitRate: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 统计重置时间 */
  lastResetTime: number;
  /** 缓存淘汰次数 */
  cacheEvictions: number;
  /** 配置重载次数 */
  configurationReloads: number;
}
