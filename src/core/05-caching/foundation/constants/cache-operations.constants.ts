/**
 * 缓存系统操作常量
 * 统一缓存操作类型、错误代码和操作标识符
 */

/**
 * 缓存操作类型枚举
 */
export const CACHE_OPERATIONS = {
  // === 基础操作 ===
  GET: 'get' as const,
  SET: 'set' as const,
  DELETE: 'delete' as const,
  EXISTS: 'exists' as const,
  CLEAR: 'clear' as const,

  // === 批量操作 ===
  BATCH_GET: 'batchGet' as const,
  BATCH_SET: 'batchSet' as const,
  BATCH_DELETE: 'batchDelete' as const,

  // === 高级操作 ===
  INCREMENT: 'increment' as const,
  DECREMENT: 'decrement' as const,
  EXPIRE: 'expire' as const,
  TTL: 'ttl' as const,

  // === 哈希操作 ===
  HASH_GET: 'hashGet' as const,
  HASH_SET: 'hashSet' as const,
  HASH_DELETE: 'hashDelete' as const,
  HASH_GET_ALL: 'hashGetAll' as const,

  // === 列表操作 ===
  LIST_PUSH: 'listPush' as const,
  LIST_POP: 'listPop' as const,
  LIST_LENGTH: 'listLength' as const,
  LIST_RANGE: 'listRange' as const,

  // === 集合操作 ===
  SET_ADD: 'setAdd' as const,
  SET_REMOVE: 'setRemove' as const,
  SET_MEMBERS: 'setMembers' as const,
  SET_IS_MEMBER: 'setIsMember' as const,
} as const;

/**
 * 缓存策略常量
 */
export const CACHE_STRATEGIES = {
  // === TTL策略 ===
  STRONG_TIMELINESS: 'STRONG_TIMELINESS' as const,      // 强实时性
  WEAK_TIMELINESS: 'WEAK_TIMELINESS' as const,          // 弱实时性
  MARKET_AWARE: 'MARKET_AWARE' as const,                // 市场感知
  ADAPTIVE: 'ADAPTIVE' as const,                        // 自适应

  // === 淘汰策略 ===
  LRU: 'LRU' as const,                                  // 最近最少使用
  LFU: 'LFU' as const,                                  // 最少使用频率
  FIFO: 'FIFO' as const,                               // 先进先出
  RANDOM: 'RANDOM' as const,                           // 随机

  // === 写入策略 ===
  WRITE_THROUGH: 'WRITE_THROUGH' as const,             // 写穿透
  WRITE_BACK: 'WRITE_BACK' as const,                   // 写回
  WRITE_AROUND: 'WRITE_AROUND' as const,               // 写绕过
} as const;

/**
 * 缓存状态常量
 */
export const CACHE_STATUS = {
  // === 操作状态 ===
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  TIMEOUT: 'timeout' as const,

  // === 命中状态 ===
  HIT: 'hit' as const,
  MISS: 'miss' as const,
  PARTIAL_HIT: 'partial_hit' as const,

  // === 服务状态 ===
  HEALTHY: 'healthy' as const,
  DEGRADED: 'degraded' as const,
  UNAVAILABLE: 'unavailable' as const,

  // === 连接状态 ===
  CONNECTED: 'connected' as const,
  DISCONNECTED: 'disconnected' as const,
  RECONNECTING: 'reconnecting' as const,
} as const;

/**
 * 缓存错误代码常量
 */
export const CACHE_ERROR_CODES = {
  // === 通用错误 ===
  UNKNOWN_ERROR: 'CACHE_UNKNOWN_ERROR' as const,
  OPERATION_FAILED: 'CACHE_OPERATION_FAILED' as const,
  INVALID_PARAMETER: 'CACHE_INVALID_PARAMETER' as const,

  // === 连接错误 ===
  CONNECTION_ERROR: 'CACHE_CONNECTION_ERROR' as const,
  CONNECTION_TIMEOUT: 'CACHE_CONNECTION_TIMEOUT' as const,
  CONNECTION_REFUSED: 'CACHE_CONNECTION_REFUSED' as const,

  // === 数据错误 ===
  KEY_NOT_FOUND: 'CACHE_KEY_NOT_FOUND' as const,
  INVALID_KEY_FORMAT: 'CACHE_INVALID_KEY_FORMAT' as const,
  VALUE_TOO_LARGE: 'CACHE_VALUE_TOO_LARGE' as const,
  SERIALIZATION_ERROR: 'CACHE_SERIALIZATION_ERROR' as const,

  // === 配置错误 ===
  INVALID_CONFIG: 'CACHE_INVALID_CONFIG' as const,
  MISSING_CONFIG: 'CACHE_MISSING_CONFIG' as const,
  CONFIG_VALIDATION_ERROR: 'CACHE_CONFIG_VALIDATION_ERROR' as const,

  // === 资源错误 ===
  MEMORY_EXCEEDED: 'CACHE_MEMORY_EXCEEDED' as const,
  QUOTA_EXCEEDED: 'CACHE_QUOTA_EXCEEDED' as const,
  SERVICE_UNAVAILABLE: 'CACHE_SERVICE_UNAVAILABLE' as const,

  // === 操作错误 ===
  OPERATION_NOT_SUPPORTED: 'CACHE_OPERATION_NOT_SUPPORTED' as const,
} as const;

/**
 * 缓存键前缀常量
 */
export const CACHE_KEY_PREFIXES = {
  // === 模块前缀 ===
  SMART_CACHE: 'smart-cache' as const,
  SYMBOL_MAPPER: 'symbol-mapper' as const,
  DATA_MAPPER: 'data-mapper' as const,
  STREAM_CACHE: 'stream-cache' as const,

  // === 操作前缀 ===
  METADATA: 'metadata' as const,
  STATS: 'stats' as const,
  CONFIG: 'config' as const,
  HEALTH: 'health' as const,

  // === 分隔符 ===
  SEPARATOR: ':' as const,
  BATCH_SEPARATOR: ',' as const,
  WILDCARD: '*' as const,
} as const;

/**
 * 缓存监控指标常量
 */
export const CACHE_METRICS = {
  // === 性能指标 ===
  HIT_RATE: 'hit_rate' as const,
  MISS_RATE: 'miss_rate' as const,
  RESPONSE_TIME: 'response_time' as const,
  THROUGHPUT: 'throughput' as const,

  // === 资源指标 ===
  MEMORY_USAGE: 'memory_usage' as const,
  CPU_USAGE: 'cpu_usage' as const,
  CONNECTION_COUNT: 'connection_count' as const,
  KEY_COUNT: 'key_count' as const,

  // === 错误指标 ===
  ERROR_RATE: 'error_rate' as const,
  TIMEOUT_RATE: 'timeout_rate' as const,
  RETRY_COUNT: 'retry_count' as const,
  FAILURE_COUNT: 'failure_count' as const,
} as const;

// CACHE_EVENTS removed: was unused and duplicated functionality from module-specific event definitions