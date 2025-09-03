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
   * 指标键模板 - 带时间戳的指标标识
   * 用于生成 "指标名_时间戳" 格式的键
   */
  METRIC_KEY: (name: string, timestamp: number) => `${name}_${timestamp}`,
  
  /**
   * 事件键模板 - 事件类型和ID组合
   * 用于生成 "事件类型:事件ID" 格式的键
   */  
  EVENT_KEY: (type: string, id: string) => `${type}:${id}`,
  
  /**
   * 缓存键模板 - 解决 monitoring-event-bridge.service.ts:133 的序列化问题
   * 用于生成 "指标名:序列化标签" 格式的缓存键
   */
  CACHE_KEY: (metricName: string, tags: Record<string, string>) => 
    `${metricName}:${JSON.stringify(tags)}`,
    
  /**
   * 组件键模板 - 监控组件标识键
   * 用于生成 "组件类型:组件名:实例ID" 格式的键
   */
  COMPONENT_KEY: (componentType: string, componentName: string, instanceId?: string) =>
    instanceId ? `${componentType}:${componentName}:${instanceId}` : `${componentType}:${componentName}`,
    
  /**
   * 健康检查键模板 - 健康检查结果键
   * 用于生成 "health:组件名:检查类型" 格式的键
   */
  HEALTH_CHECK_KEY: (componentName: string, checkType: string) => 
    `health:${componentName}:${checkType}`,
    
  /**
   * 告警键模板 - 告警事件键
   * 用于生成 "alert:等级:组件:规则" 格式的键
   */
  ALERT_KEY: (level: string, component: string, rule: string) =>
    `alert:${level}:${component}:${rule}`,
    
  /**
   * 会话键模板 - 监控会话标识键
   * 用于生成 "session:类型:会话ID" 格式的键
   */
  SESSION_KEY: (sessionType: string, sessionId: string) =>
    `session:${sessionType}:${sessionId}`
} as const);

/**
 * 键模板类型定义
 * 确保类型安全的键模板使用
 */
export type MonitoringKeyTemplate = typeof MONITORING_KEY_TEMPLATES[keyof typeof MONITORING_KEY_TEMPLATES];

/**
 * 键生成器辅助函数
 * 🎯 提供更高级的键生成功能
 */
export class MonitoringKeyGenerator {
  /**
   * 生成带命名空间的键
   */
  static namespaced(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
  
  /**
   * 生成时间窗口键
   * 用于时间窗口相关的指标存储
   */
  static timeWindowKey(metricName: string, windowSize: number, timestamp: number): string {
    const windowStart = Math.floor(timestamp / windowSize) * windowSize;
    return `${metricName}:window:${windowSize}:${windowStart}`;
  }
  
  /**
   * 生成聚合键
   * 用于聚合指标的存储
   */
  static aggregateKey(metricName: string, aggregationType: string, period: string): string {
    return `${metricName}:agg:${aggregationType}:${period}`;
  }
  
  /**
   * 验证键格式
   * 检查生成的键是否符合规范
   */
  static isValidKey(key: string): boolean {
    // 键不能为空，不能包含特殊字符，长度限制
    return key.length > 0 && key.length <= 250 && !/[\s\n\r\t]/.test(key);
  }
}

/**
 * 键前缀常量
 * 🎯 统一管理键前缀，避免硬编码
 */
export const MONITORING_KEY_PREFIXES = Object.freeze({
  METRICS: 'metrics',
  HEALTH: 'health',
  ALERTS: 'alerts',
  EVENTS: 'events',
  SESSIONS: 'sessions',
  CACHE: 'cache',
  TEMP: 'temp'
} as const);

/**
 * 键分隔符常量
 */
export const MONITORING_KEY_SEPARATORS = Object.freeze({
  NAMESPACE: ':',
  COMPONENT: '.',
  PARAMETER: '_',
  LIST: '|'
} as const);