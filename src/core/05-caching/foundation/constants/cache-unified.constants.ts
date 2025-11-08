/**
 * 统一缓存常量定义 - Caching 模块唯一真实来源 (Single Source of Truth)
 *
 * 🎯 设计原则：
 * - 所有 05-caching 子模块必须从此文件导入缓存常量
 * - 禁止在其他文件重复定义相同语义的常量
 * - 使用 Object.freeze() 和 as const 确保不可变性
 */

// 统一缓存键前缀常量
export const CACHE_KEY_PREFIXES = Object.freeze({
  // 模块前缀
  SMART_CACHE: 'smart-cache',
  SYMBOL_MAPPER: 'symbol-mapper',
  DATA_MAPPER: 'data-mapper',
  STREAM_CACHE: 'stream-cache',
  BASIC_CACHE: 'basic-cache',

  // 数据类型前缀
  STOCK_QUOTE: 'stock_quote',
  STOCK_CANDLE: 'stock_candle',
  STOCK_TICK: 'stock_tick',
  STOCK_INFO: 'stock_info',
  MARKET_STATUS: 'market_status',
  SYMBOL_MAPPING: 'symbol_mapping',
  PROVIDER_DATA: 'provider_data',

  // 元数据前缀
  METADATA: 'metadata',
  STATS: 'stats',
  CONFIG: 'config',
  HEALTH: 'health',

  // 分隔符
  SEPARATOR: ':',
  BATCH_SEPARATOR: ',',
  WILDCARD: '*',
} as const);

// 缓存操作类型
export const CACHE_OPERATIONS = Object.freeze({
  // 基础操作
  GET: 'get',
  SET: 'set',
  DELETE: 'delete',
  EXISTS: 'exists',
  CLEAR: 'clear',

  // 批量操作
  BATCH_GET: 'batchGet',
  BATCH_SET: 'batchSet',
  BATCH_DELETE: 'batchDelete',

  // 高级操作
  INCREMENT: 'increment',
  DECREMENT: 'decrement',
  EXPIRE: 'expire',
  TTL: 'ttl',

  // 哈希操作
  HASH_GET: 'hashGet',
  HASH_SET: 'hashSet',
  HASH_DELETE: 'hashDelete',
  HASH_GET_ALL: 'hashGetAll',

  // 列表操作
  LIST_PUSH: 'listPush',
  LIST_POP: 'listPop',
  LIST_LENGTH: 'listLength',
  LIST_RANGE: 'listRange',

  // 集合操作
  SET_ADD: 'setAdd',
  SET_REMOVE: 'setRemove',
  SET_MEMBERS: 'setMembers',
  SET_IS_MEMBER: 'setIsMember',
} as const);

// 缓存策略常量（TTL、淘汰、写入）
export const CACHE_STRATEGIES = Object.freeze({
  // TTL 策略
  STRONG_TIMELINESS: 'STRONG_TIMELINESS',
  WEAK_TIMELINESS: 'WEAK_TIMELINESS',
  MARKET_AWARE: 'MARKET_AWARE',
  ADAPTIVE: 'ADAPTIVE',

  // 淘汰策略
  LRU: 'LRU',
  LFU: 'LFU',
  FIFO: 'FIFO',
  RANDOM: 'RANDOM',

  // 写入策略
  WRITE_THROUGH: 'WRITE_THROUGH',
  WRITE_BACK: 'WRITE_BACK',
  WRITE_AROUND: 'WRITE_AROUND',
} as const);

// 缓存状态常量（操作/命中/服务/连接）
export const CACHE_STATUS = Object.freeze({
  // 操作状态
  SUCCESS: 'success',
  ERROR: 'error',
  TIMEOUT: 'timeout',

  // 命中状态
  HIT: 'hit',
  MISS: 'miss',
  PARTIAL_HIT: 'partial_hit',

  // 服务状态
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNAVAILABLE: 'unavailable',

  // 连接状态
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
} as const);

// 缓存错误代码常量
export const CACHE_ERROR_CODES = Object.freeze({
  // 通用错误
  UNKNOWN_ERROR: 'CACHE_UNKNOWN_ERROR',
  OPERATION_FAILED: 'CACHE_OPERATION_FAILED',
  INVALID_PARAMETER: 'CACHE_INVALID_PARAMETER',

  // 连接错误
  CONNECTION_ERROR: 'CACHE_CONNECTION_ERROR',
  CONNECTION_TIMEOUT: 'CACHE_CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CACHE_CONNECTION_REFUSED',

  // 数据错误
  KEY_NOT_FOUND: 'CACHE_KEY_NOT_FOUND',
  INVALID_KEY_FORMAT: 'CACHE_INVALID_KEY_FORMAT',
  VALUE_TOO_LARGE: 'CACHE_VALUE_TOO_LARGE',
  SERIALIZATION_ERROR: 'CACHE_SERIALIZATION_ERROR',

  // 配置错误
  INVALID_CONFIG: 'CACHE_INVALID_CONFIG',
  MISSING_CONFIG: 'CACHE_MISSING_CONFIG',
  CONFIG_VALIDATION_ERROR: 'CACHE_CONFIG_VALIDATION_ERROR',

  // 资源错误
  MEMORY_EXCEEDED: 'CACHE_MEMORY_EXCEEDED',
  QUOTA_EXCEEDED: 'CACHE_QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE: 'CACHE_SERVICE_UNAVAILABLE',

  // 操作错误
  OPERATION_NOT_SUPPORTED: 'CACHE_OPERATION_NOT_SUPPORTED',
} as const);

// 监控指标常量
export const CACHE_METRICS = Object.freeze({
  // 性能指标
  HIT_RATE: 'hit_rate',
  MISS_RATE: 'miss_rate',
  RESPONSE_TIME: 'response_time',
  THROUGHPUT: 'throughput',

  // 资源指标
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage',
  CONNECTION_COUNT: 'connection_count',
  KEY_COUNT: 'key_count',

  // 错误指标
  ERROR_RATE: 'error_rate',
  TIMEOUT_RATE: 'timeout_rate',
  RETRY_COUNT: 'retry_count',
  FAILURE_COUNT: 'failure_count',
} as const);

// 结果状态与优先级
export const CACHE_RESULT_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL_SUCCESS: 'partial_success',
} as const);

export const CACHE_PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const);

// 类型别名
export type CacheKeyPrefix = typeof CACHE_KEY_PREFIXES[keyof typeof CACHE_KEY_PREFIXES];
export type CacheOperationType = typeof CACHE_OPERATIONS[keyof typeof CACHE_OPERATIONS];
export type CacheStrategyType = typeof CACHE_STRATEGIES[keyof typeof CACHE_STRATEGIES];
export type CacheStatusType = typeof CACHE_STATUS[keyof typeof CACHE_STATUS];
export type CacheErrorCode = typeof CACHE_ERROR_CODES[keyof typeof CACHE_ERROR_CODES];
export type CacheMetricType = typeof CACHE_METRICS[keyof typeof CACHE_METRICS];
export type CacheResultStatusType = typeof CACHE_RESULT_STATUS[keyof typeof CACHE_RESULT_STATUS];
export type CachePriorityType = typeof CACHE_PRIORITY[keyof typeof CACHE_PRIORITY];

