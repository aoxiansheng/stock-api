/**
 * Smart Cache 组件相关常量
 * 使用联合类型和类型推导提供编译时类型检查
 */
export const SMART_CACHE_COMPONENT = Object.freeze({
  // 组件标识信息（最小集合）
  IDENTIFIERS: {
    NAME: "smart_cache_orchestrator",
    DISPLAY_NAME: "Smart Cache Orchestrator",
    VERSION: "2.0.0",
    NAMESPACE: "smart-cache",
  },

  // 日志上下文（保留用于创建 logger）
  LOG_CONTEXTS: {
    STANDARDIZED_SERVICE: "SmartCacheStandardizedService",
    CONFIG_FACTORY: "SmartCacheConfigFactory",
  },
} as const);

export type SmartCacheComponentType = typeof SMART_CACHE_COMPONENT;
export type LogContext =
  (typeof SMART_CACHE_COMPONENT.LOG_CONTEXTS)[keyof typeof SMART_CACHE_COMPONENT.LOG_CONTEXTS];
