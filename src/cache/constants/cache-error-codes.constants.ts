/**
 * Cache组件错误码常量定义
 *
 * 错误码格式：CACHE_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const CACHE_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 参数验证 (001-099)
  INVALID_KEY_FORMAT: 'CACHE_VALIDATION_001',
  INVALID_TTL_VALUE: 'CACHE_VALIDATION_002',
  INVALID_BATCH_SIZE: 'CACHE_VALIDATION_003',
  INVALID_OPERATION_TYPE: 'CACHE_VALIDATION_004',
  MISSING_REQUIRED_PARAM: 'CACHE_VALIDATION_005',
  KEY_TOO_LONG: 'CACHE_VALIDATION_006',
  VALUE_TOO_LARGE: 'CACHE_VALIDATION_007',
  INVALID_EXPIRY_TIME: 'CACHE_VALIDATION_008',
  INVALID_FIELD_NAME: 'CACHE_VALIDATION_009',
  INVALID_SET_MEMBER: 'CACHE_VALIDATION_010',

  // 数据格式验证 (100-199)
  SERIALIZATION_FORMAT_ERROR: 'CACHE_VALIDATION_100',
  DESERIALIZATION_FORMAT_ERROR: 'CACHE_VALIDATION_101',
  COMPRESSION_FORMAT_ERROR: 'CACHE_VALIDATION_102',
  JSON_PARSE_ERROR: 'CACHE_VALIDATION_103',
  ENCODING_ERROR: 'CACHE_VALIDATION_104',
  DATA_TYPE_MISMATCH: 'CACHE_VALIDATION_105',
  SCHEMA_VALIDATION_FAILED: 'CACHE_VALIDATION_106',

  // 批量操作验证 (200-299)
  BATCH_SIZE_EXCEEDED: 'CACHE_VALIDATION_200',
  BATCH_EMPTY_OPERATIONS: 'CACHE_VALIDATION_201',
  BATCH_DUPLICATE_KEYS: 'CACHE_VALIDATION_202',
  BATCH_MIXED_OPERATIONS: 'CACHE_VALIDATION_203',
  BATCH_PAYLOAD_TOO_LARGE: 'CACHE_VALIDATION_204',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 缓存操作错误 (300-399)
  KEY_NOT_FOUND: 'CACHE_BUSINESS_300',
  KEY_ALREADY_EXISTS: 'CACHE_BUSINESS_301',
  OPERATION_NOT_SUPPORTED: 'CACHE_BUSINESS_302',
  CONDITIONAL_OPERATION_FAILED: 'CACHE_BUSINESS_303',
  ATOMIC_OPERATION_FAILED: 'CACHE_BUSINESS_304',
  TYPE_MISMATCH_ERROR: 'CACHE_BUSINESS_305',
  INDEX_OUT_OF_BOUNDS: 'CACHE_BUSINESS_306',
  MEMBER_NOT_IN_SET: 'CACHE_BUSINESS_307',
  FIELD_NOT_IN_HASH: 'CACHE_BUSINESS_308',

  // 分布式锁错误 (400-499)
  LOCK_ACQUISITION_FAILED: 'CACHE_BUSINESS_400',
  LOCK_ALREADY_HELD: 'CACHE_BUSINESS_401',
  LOCK_EXPIRED: 'CACHE_BUSINESS_402',
  LOCK_NOT_OWNED: 'CACHE_BUSINESS_403',
  LOCK_RELEASE_FAILED: 'CACHE_BUSINESS_404',
  DEADLOCK_DETECTED: 'CACHE_BUSINESS_405',

  // 事务操作错误 (500-599)
  TRANSACTION_FAILED: 'CACHE_BUSINESS_500',
  TRANSACTION_ABORTED: 'CACHE_BUSINESS_501',
  WATCH_KEY_MODIFIED: 'CACHE_BUSINESS_502',
  MULTI_EXEC_ERROR: 'CACHE_BUSINESS_503',
  PIPELINE_EXECUTION_FAILED: 'CACHE_BUSINESS_504',

  // ==================== 系统资源错误 (600-899) ====================

  // 内存/存储资源 (600-699)
  MEMORY_LIMIT_EXCEEDED: 'CACHE_SYSTEM_600',
  STORAGE_FULL: 'CACHE_SYSTEM_601',
  KEY_SPACE_EXHAUSTED: 'CACHE_SYSTEM_602',
  CONNECTION_POOL_EXHAUSTED: 'CACHE_SYSTEM_603',
  MEMORY_FRAGMENTATION_HIGH: 'CACHE_SYSTEM_604',

  // 超时错误 (700-799)
  OPERATION_TIMEOUT: 'CACHE_SYSTEM_700',
  CONNECTION_TIMEOUT: 'CACHE_SYSTEM_701',
  READ_TIMEOUT: 'CACHE_SYSTEM_702',
  WRITE_TIMEOUT: 'CACHE_SYSTEM_703',
  COMMAND_TIMEOUT: 'CACHE_SYSTEM_704',
  LOCK_TIMEOUT: 'CACHE_SYSTEM_705',
  FLUSH_TIMEOUT: 'CACHE_SYSTEM_706',

  // 配置错误 (800-899)
  CONFIG_VALIDATION_FAILED: 'CACHE_SYSTEM_800',
  INVALID_CONFIG_PARAMETER: 'CACHE_SYSTEM_801',
  CONFIG_LOAD_FAILED: 'CACHE_SYSTEM_802',
  CLUSTER_CONFIG_ERROR: 'CACHE_SYSTEM_803',
  SENTINEL_CONFIG_ERROR: 'CACHE_SYSTEM_804',
  TLS_CONFIG_ERROR: 'CACHE_SYSTEM_805',
  AUTH_CONFIG_ERROR: 'CACHE_SYSTEM_806',

  // ==================== 外部依赖错误 (900-999) ====================

  // Redis连接错误 (900-949)
  REDIS_CONNECTION_FAILED: 'CACHE_EXTERNAL_900',
  REDIS_CONNECTION_LOST: 'CACHE_EXTERNAL_901',
  REDIS_AUTHENTICATION_FAILED: 'CACHE_EXTERNAL_902',
  REDIS_PERMISSION_DENIED: 'CACHE_EXTERNAL_903',
  REDIS_SERVER_ERROR: 'CACHE_EXTERNAL_904',
  REDIS_PROTOCOL_ERROR: 'CACHE_EXTERNAL_905',
  REDIS_VERSION_INCOMPATIBLE: 'CACHE_EXTERNAL_906',

  // 集群/哨兵错误 (950-979)
  CLUSTER_NODE_UNAVAILABLE: 'CACHE_EXTERNAL_950',
  CLUSTER_FAILOVER_FAILED: 'CACHE_EXTERNAL_951',
  SENTINEL_UNAVAILABLE: 'CACHE_EXTERNAL_952',
  MASTER_DOWN: 'CACHE_EXTERNAL_953',
  SLOT_MIGRATION_ERROR: 'CACHE_EXTERNAL_954',
  CLUSTER_STATE_ERROR: 'CACHE_EXTERNAL_955',

  // 网络错误 (980-999)
  NETWORK_ERROR: 'CACHE_EXTERNAL_980',
  DNS_RESOLUTION_FAILED: 'CACHE_EXTERNAL_981',
  TLS_HANDSHAKE_FAILED: 'CACHE_EXTERNAL_982',
  FIREWALL_BLOCKED: 'CACHE_EXTERNAL_983',
  PROXY_ERROR: 'CACHE_EXTERNAL_984',
} as const;

// 错误码类型定义
export type CacheErrorCode = typeof CACHE_ERROR_CODES[keyof typeof CACHE_ERROR_CODES];

// 错误分类辅助函数
export const CacheErrorCategories = {
  /**
   * 判断是否为验证类错误
   */
  isValidationError: (errorCode: string): boolean => {
    return errorCode.includes('VALIDATION');
  },

  /**
   * 判断是否为业务逻辑错误
   */
  isBusinessError: (errorCode: string): boolean => {
    return errorCode.includes('BUSINESS');
  },

  /**
   * 判断是否为系统资源错误
   */
  isSystemError: (errorCode: string): boolean => {
    return errorCode.includes('SYSTEM');
  },

  /**
   * 判断是否为外部依赖错误
   */
  isExternalError: (errorCode: string): boolean => {
    return errorCode.includes('EXTERNAL');
  },

  /**
   * 判断错误是否可重试
   * 通常网络错误、超时错误、系统资源错误可重试
   * 验证错误、业务逻辑错误不可重试
   */
  isRetryable: (errorCode: string): boolean => {
    // 系统资源错误中的超时和资源问题通常可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('CONNECTION_POOL_EXHAUSTED') ||
        errorCode.includes('MEMORY_LIMIT_EXCEEDED')) {
      return true;
    }

    // 外部依赖错误通常可重试
    if (errorCode.includes('EXTERNAL')) {
      // 除了认证失败和权限错误，其他外部错误都可重试
      return !errorCode.includes('AUTHENTICATION_FAILED') &&
             !errorCode.includes('PERMISSION_DENIED');
    }

    // 某些业务错误可重试
    if (errorCode.includes('LOCK_ACQUISITION_FAILED') ||
        errorCode.includes('WATCH_KEY_MODIFIED') ||
        errorCode.includes('CONDITIONAL_OPERATION_FAILED')) {
      return true;
    }

    // 验证错误通常不可重试
    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (CacheErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    if (CacheErrorCategories.isExternalError(errorCode) ||
        CacheErrorCategories.isSystemError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (CacheErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误通常是中级别
    if (CacheErrorCategories.isBusinessError(errorCode)) {
      // 分布式锁和事务错误较严重
      if (errorCode.includes('LOCK_') || errorCode.includes('TRANSACTION_')) {
        return 'high';
      }
      return 'medium';
    }

    // 系统资源错误通常是高级别
    if (CacheErrorCategories.isSystemError(errorCode)) {
      // 内存和配置错误是关键级别
      if (errorCode.includes('MEMORY_') || errorCode.includes('CONFIG_')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误通常是高级别
    if (CacheErrorCategories.isExternalError(errorCode)) {
      // Redis连接错误是关键级别
      if (errorCode.includes('REDIS_CONNECTION_') || errorCode.includes('MASTER_DOWN')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  }
};

// 错误码说明映射（用于开发和调试）
export const CACHE_ERROR_DESCRIPTIONS = {
  [CACHE_ERROR_CODES.INVALID_KEY_FORMAT]: 'Cache key format is invalid or contains illegal characters',
  [CACHE_ERROR_CODES.INVALID_TTL_VALUE]: 'TTL value must be a positive integer',
  [CACHE_ERROR_CODES.INVALID_BATCH_SIZE]: 'Batch size exceeds maximum allowed limit',
  [CACHE_ERROR_CODES.SERIALIZATION_FORMAT_ERROR]: 'Data serialization failed due to format issues',
  [CACHE_ERROR_CODES.KEY_NOT_FOUND]: 'Requested cache key does not exist',
  [CACHE_ERROR_CODES.LOCK_ACQUISITION_FAILED]: 'Failed to acquire distributed lock',
  [CACHE_ERROR_CODES.OPERATION_TIMEOUT]: 'Cache operation exceeded timeout limit',
  [CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED]: 'Failed to establish connection to Redis server',
  [CACHE_ERROR_CODES.CLUSTER_NODE_UNAVAILABLE]: 'Redis cluster node is unavailable',
  [CACHE_ERROR_CODES.CONFIG_VALIDATION_FAILED]: 'Cache configuration validation failed',
  // 可根据需要添加更多描述
} as const;