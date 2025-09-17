/**
 * 统一缓存键前缀命名规范
 *
 * 命名规则: {module}_{function}_{type}
 * - module: 模块名称 (如 stream, cache, symbol, data)
 * - function: 功能描述 (如 hot, warm, mapping, quote)
 * - type: 数据类型 (如 data, lock, status, rule)
 *
 * 示例:
 * - stream_cache_hot: 流缓存热数据
 * - symbol_mapper_rule: 符号映射规则
 * - data_cache_lock: 数据缓存锁
 */

export const UNIFIED_CACHE_KEY_PREFIXES = {
  // ============================================================================
  // 流缓存相关 (Stream Cache)
  // ============================================================================

  /** 流缓存热数据 - 高频访问的实时数据 */
  STREAM_CACHE_HOT: "stream_cache_hot",

  /** 流缓存温数据 - 中频访问的缓存数据 */
  STREAM_CACHE_WARM: "stream_cache_warm",

  /** 流缓存锁 - 防止并发访问冲突 */
  STREAM_CACHE_LOCK: "stream_cache_lock",

  /** 流缓存统计 - 性能监控数据 */
  STREAM_CACHE_STATS: "stream_cache_stats",

  // ============================================================================
  // 通用缓存相关 (Common Cache)
  // ============================================================================

  /** 股票报价数据 */
  STOCK_QUOTE_DATA: "stock_quote_data",

  /** 市场状态信息 */
  MARKET_STATUS_DATA: "market_status_data",

  /** 符号映射关系 */
  SYMBOL_MAPPING_DATA: "symbol_mapping_data",

  /** 提供商原始数据 */
  PROVIDER_DATA_CACHE: "provider_data_cache",

  /** 用户会话数据 */
  USER_SESSION_DATA: "user_session_data",

  /** API限流数据 */
  API_RATE_LIMIT_DATA: "api_rate_limit_data",

  // ============================================================================
  // 符号映射缓存 (Symbol Mapper Cache)
  // ============================================================================

  /** 符号映射最佳规则 */
  SYMBOL_MAPPER_BEST_RULE: "symbol_mapper_best_rule",

  /** 符号映射规则详情 */
  SYMBOL_MAPPER_RULE_DETAIL: "symbol_mapper_rule_detail",

  /** 符号映射批量结果 */
  SYMBOL_MAPPER_BATCH_RESULT: "symbol_mapper_batch_result",

  // ============================================================================
  // 数据映射缓存 (Data Mapper Cache)
  // ============================================================================

  /** 数据映射最佳规则 */
  DATA_MAPPER_BEST_RULE: "data_mapper_best_rule",

  /** 数据映射规则详情 */
  DATA_MAPPER_RULE_DETAIL: "data_mapper_rule_detail",

  /** 数据映射字段规则 */
  DATA_MAPPER_FIELD_RULE: "data_mapper_field_rule",

  // ============================================================================
  // 智能缓存 (Smart Cache)
  // ============================================================================

  /** 智能缓存响应数据 */
  SMART_CACHE_RESPONSE: "smart_cache_response",

  /** 智能缓存元数据 */
  SMART_CACHE_METADATA: "smart_cache_metadata",

  /** 智能缓存策略 */
  SMART_CACHE_STRATEGY: "smart_cache_strategy",

  // ============================================================================
  // 系统级通用前缀
  // ============================================================================

  /** 健康检查数据 */
  HEALTH_CHECK_DATA: "health_check_data",

  /** 系统配置缓存 */
  SYSTEM_CONFIG_CACHE: "system_config_cache",

  /** 监控指标数据 */
  MONITORING_METRICS: "monitoring_metrics",

  /** 分布式锁前缀 */
  DISTRIBUTED_LOCK: "distributed_lock",
} as const;

/**
 * 缓存键生成器
 * 提供统一的键名生成方法
 */
export const CACHE_KEY_GENERATORS = {
  /**
   * 生成流缓存热数据键
   * @param symbol 符号
   * @param provider 提供商
   * @returns 缓存键
   */
  streamHot: (symbol: string, provider: string): string =>
    `${UNIFIED_CACHE_KEY_PREFIXES.STREAM_CACHE_HOT}:${symbol}:${provider}`,

  /**
   * 生成流缓存温数据键
   * @param symbol 符号
   * @param provider 提供商
   * @returns 缓存键
   */
  streamWarm: (symbol: string, provider: string): string =>
    `${UNIFIED_CACHE_KEY_PREFIXES.STREAM_CACHE_WARM}:${symbol}:${provider}`,

  /**
   * 生成分布式锁键
   * @param resource 资源标识
   * @returns 锁键
   */
  distributedLock: (resource: string): string =>
    `${UNIFIED_CACHE_KEY_PREFIXES.DISTRIBUTED_LOCK}:${resource}`,

  /**
   * 生成符号映射规则键
   * @param provider 提供商
   * @param ruleId 规则ID
   * @returns 规则缓存键
   */
  symbolMappingRule: (provider: string, ruleId: string): string =>
    `${UNIFIED_CACHE_KEY_PREFIXES.SYMBOL_MAPPER_RULE_DETAIL}:${provider}:${ruleId}`,

  /**
   * 生成API限流键
   * @param endpoint 端点
   * @param identifier 标识符 (IP/用户ID等)
   * @returns 限流键
   */
  apiRateLimit: (endpoint: string, identifier: string): string =>
    `${UNIFIED_CACHE_KEY_PREFIXES.API_RATE_LIMIT_DATA}:${endpoint}:${identifier}`,
};

/**
 * 向后兼容性映射
 * 将旧的键前缀映射到新的统一前缀
 */
export const LEGACY_KEY_MAPPING = {
  // 旧的 stream-cache 前缀
  "stream_cache:": UNIFIED_CACHE_KEY_PREFIXES.STREAM_CACHE_WARM,
  "hot:": UNIFIED_CACHE_KEY_PREFIXES.STREAM_CACHE_HOT,
  "stream_lock:": UNIFIED_CACHE_KEY_PREFIXES.STREAM_CACHE_LOCK,

  // 旧的 common-cache 前缀
  stock_quote: UNIFIED_CACHE_KEY_PREFIXES.STOCK_QUOTE_DATA,
  market_status: UNIFIED_CACHE_KEY_PREFIXES.MARKET_STATUS_DATA,
  symbol_mapping: UNIFIED_CACHE_KEY_PREFIXES.SYMBOL_MAPPING_DATA,

  // 旧的 data-mapper 前缀
  "dm:best_rule": UNIFIED_CACHE_KEY_PREFIXES.DATA_MAPPER_BEST_RULE,
  "dm:rule_by_id": UNIFIED_CACHE_KEY_PREFIXES.DATA_MAPPER_RULE_DETAIL,
} as const;

/**
 * 类型定义
 */
export type UnifiedCacheKeyPrefix = keyof typeof UNIFIED_CACHE_KEY_PREFIXES;
export type CacheKeyGenerator = keyof typeof CACHE_KEY_GENERATORS;
