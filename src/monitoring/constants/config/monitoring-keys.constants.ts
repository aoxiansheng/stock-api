/**
 * 监控系统键模板常量
 * 🎯 解决魔法字符串硬编码问题
 * 统一键格式生成逻辑，提高代码可维护性
 */

export const MONITORING_KEY_TEMPLATES = Object.freeze({
  /**
   * 请求键模板 - 解决 analyzer-metrics.service.ts:138 的魔法字符串
   * 用于生成 "方法:端点" 格式的键
   */
  REQUEST_KEY: (method: string, endpoint: string) => `${method}:${endpoint}`,

  /**
   * 缓存键模板 - 解决 monitoring-event-bridge.service.ts:133 的序列化问题
   * 用于生成 "指标名:序列化标签" 格式的缓存键
   */
  CACHE_KEY: (metricName: string, tags: Record<string, string>) =>
    `${metricName}:${JSON.stringify(tags)}`,
} as const);

/**
 * 键模板类型定义
 * 确保类型安全的键模板使用
 */
export type MonitoringKeyTemplate =
  (typeof MONITORING_KEY_TEMPLATES)[keyof typeof MONITORING_KEY_TEMPLATES];

/**
 * 键前缀常量
 * 🎯 统一管理键前缀，避免硬编码
 */
export const MONITORING_KEY_PREFIXES = Object.freeze({
  METRICS: "metrics",
  HEALTH: "health",
  EVENTS: "events",
  CACHE: "cache",
  TEMP: "temp",
} as const);

/**
 * 键分隔符常量
 */
export const MONITORING_KEY_SEPARATORS = Object.freeze({
  NAMESPACE: ":",
  COMPONENT: ".",
  LIST: "|",
} as const);
