/**
 * Common-cache组件错误码常量定义
 *
 * 错误码格式：COMMON_CACHE_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const COMMON_CACHE_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 缓存键验证 (001-099)
  INVALID_CACHE_KEY_FORMAT: 'COMMON_CACHE_VALIDATION_001',
  CACHE_KEY_TOO_LONG: 'COMMON_CACHE_VALIDATION_002',
  CACHE_KEY_EMPTY: 'COMMON_CACHE_VALIDATION_003',
  CACHE_KEY_INVALID_CHARACTERS: 'COMMON_CACHE_VALIDATION_004',
  CACHE_NAMESPACE_INVALID: 'COMMON_CACHE_VALIDATION_005',
  CACHE_PREFIX_INVALID: 'COMMON_CACHE_VALIDATION_006',

  // TTL验证 (100-149)
  INVALID_TTL_VALUE: 'COMMON_CACHE_VALIDATION_100',
  TTL_OUT_OF_RANGE: 'COMMON_CACHE_VALIDATION_101',
  TTL_COMPUTATION_FAILED: 'COMMON_CACHE_VALIDATION_102',
  TTL_STRATEGY_INVALID: 'COMMON_CACHE_VALIDATION_103',

  // 数据格式验证 (150-199)
  INVALID_DATA_FORMAT: 'COMMON_CACHE_VALIDATION_150',
  DATA_SIZE_EXCEEDED: 'COMMON_CACHE_VALIDATION_151',
  COMPRESSION_THRESHOLD_INVALID: 'COMMON_CACHE_VALIDATION_152',
  SERIALIZATION_FORMAT_INVALID: 'COMMON_CACHE_VALIDATION_153',

  // 批量操作验证 (200-249)
  BATCH_SIZE_LIMIT_EXCEEDED: 'COMMON_CACHE_VALIDATION_200',
  BATCH_EMPTY_OPERATIONS: 'COMMON_CACHE_VALIDATION_201',
  BATCH_DUPLICATE_KEYS: 'COMMON_CACHE_VALIDATION_202',
  BATCH_MIXED_OPERATIONS: 'COMMON_CACHE_VALIDATION_203',

  // 配置验证 (250-299)
  CACHE_CONFIG_INVALID: 'COMMON_CACHE_VALIDATION_250',
  CACHE_STRATEGY_UNSUPPORTED: 'COMMON_CACHE_VALIDATION_251',
  CACHE_OPTIONS_INVALID: 'COMMON_CACHE_VALIDATION_252',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 缓存操作错误 (300-399)
  CACHE_KEY_NOT_FOUND: 'COMMON_CACHE_BUSINESS_300',
  CACHE_KEY_EXPIRED: 'COMMON_CACHE_BUSINESS_301',
  CACHE_HIT_FAILED: 'COMMON_CACHE_BUSINESS_302',
  CACHE_SET_FAILED: 'COMMON_CACHE_BUSINESS_303',
  CACHE_DELETE_FAILED: 'COMMON_CACHE_BUSINESS_304',
  CACHE_UPDATE_FAILED: 'COMMON_CACHE_BUSINESS_305',
  CACHE_INVALIDATION_FAILED: 'COMMON_CACHE_BUSINESS_306',

  // 压缩/解压缩错误 (400-449)
  COMPRESSION_FAILED: 'COMMON_CACHE_BUSINESS_400',
  DECOMPRESSION_FAILED: 'COMMON_CACHE_BUSINESS_401',
  COMPRESSION_RATIO_POOR: 'COMMON_CACHE_BUSINESS_402',
  COMPRESSION_DATA_CORRUPTED: 'COMMON_CACHE_BUSINESS_403',
  DECOMPRESSION_FORMAT_UNSUPPORTED: 'COMMON_CACHE_BUSINESS_404',

  // 序列化错误 (450-499)
  SERIALIZATION_FAILED: 'COMMON_CACHE_BUSINESS_450',
  DESERIALIZATION_FAILED: 'COMMON_CACHE_BUSINESS_451',
  SERIALIZATION_TYPE_UNSUPPORTED: 'COMMON_CACHE_BUSINESS_452',
  DATA_ENVELOPE_MALFORMED: 'COMMON_CACHE_BUSINESS_453',
  REDIS_VALUE_FORMAT_INVALID: 'COMMON_CACHE_BUSINESS_454',

  // 智能缓存策略错误 (500-549)
  SMART_CACHE_STRATEGY_FAILED: 'COMMON_CACHE_BUSINESS_500',
  ADAPTIVE_TTL_COMPUTATION_FAILED: 'COMMON_CACHE_BUSINESS_501',
  CACHE_WARMUP_FAILED: 'COMMON_CACHE_BUSINESS_502',
  CACHE_PRELOAD_FAILED: 'COMMON_CACHE_BUSINESS_503',
  CACHE_EVICTION_POLICY_FAILED: 'COMMON_CACHE_BUSINESS_504',

  // 批量操作错误 (550-599)
  BATCH_OPERATION_FAILED: 'COMMON_CACHE_BUSINESS_550',
  BATCH_PARTIAL_FAILURE: 'COMMON_CACHE_BUSINESS_551',
  BATCH_ROLLBACK_FAILED: 'COMMON_CACHE_BUSINESS_552',
  BATCH_ATOMIC_OPERATION_FAILED: 'COMMON_CACHE_BUSINESS_553',

  // ==================== 系统资源错误 (600-899) ====================

  // 内存资源错误 (600-649)
  MEMORY_LIMIT_EXCEEDED: 'COMMON_CACHE_SYSTEM_600',
  MEMORY_PRESSURE_DETECTED: 'COMMON_CACHE_SYSTEM_601',
  MEMORY_OPTIMIZATION_FAILED: 'COMMON_CACHE_SYSTEM_602',
  MEMORY_CLEANUP_FAILED: 'COMMON_CACHE_SYSTEM_603',
  MEMORY_FRAGMENTATION_HIGH: 'COMMON_CACHE_SYSTEM_604',

  // 性能资源错误 (650-699)
  OPERATION_TIMEOUT: 'COMMON_CACHE_SYSTEM_650',
  SLOW_OPERATION_DETECTED: 'COMMON_CACHE_SYSTEM_651',
  THROUGHPUT_LIMIT_EXCEEDED: 'COMMON_CACHE_SYSTEM_652',
  LATENCY_THRESHOLD_EXCEEDED: 'COMMON_CACHE_SYSTEM_653',

  // 缓存空间错误 (700-749)
  CACHE_STORAGE_FULL: 'COMMON_CACHE_SYSTEM_700',
  CACHE_QUOTA_EXCEEDED: 'COMMON_CACHE_SYSTEM_701',
  CACHE_EVICTION_FORCED: 'COMMON_CACHE_SYSTEM_702',
  CACHE_COMPACTION_NEEDED: 'COMMON_CACHE_SYSTEM_703',

  // 并发控制错误 (750-799)
  CONCURRENT_ACCESS_CONFLICT: 'COMMON_CACHE_SYSTEM_750',
  LOCK_ACQUISITION_TIMEOUT: 'COMMON_CACHE_SYSTEM_751',
  DEADLOCK_DETECTED: 'COMMON_CACHE_SYSTEM_752',
  RACE_CONDITION_DETECTED: 'COMMON_CACHE_SYSTEM_753',

  // 配置系统错误 (800-849)
  CONFIG_INITIALIZATION_FAILED: 'COMMON_CACHE_SYSTEM_800',
  CONFIG_VALIDATION_FAILED: 'COMMON_CACHE_SYSTEM_801',
  CONFIG_RELOAD_FAILED: 'COMMON_CACHE_SYSTEM_802',
  CONFIG_COMPATIBILITY_ERROR: 'COMMON_CACHE_SYSTEM_803',

  // 监控系统错误 (850-899)
  METRICS_COLLECTION_FAILED: 'COMMON_CACHE_SYSTEM_850',
  HEALTH_CHECK_FAILED: 'COMMON_CACHE_SYSTEM_851',
  MONITORING_DISABLED: 'COMMON_CACHE_SYSTEM_852',
  ALERT_THRESHOLD_EXCEEDED: 'COMMON_CACHE_SYSTEM_853',

  // ==================== 外部依赖错误 (900-999) ====================

  // Redis连接错误 (900-929)
  REDIS_CONNECTION_FAILED: 'COMMON_CACHE_EXTERNAL_900',
  REDIS_CONNECTION_LOST: 'COMMON_CACHE_EXTERNAL_901',
  REDIS_AUTHENTICATION_FAILED: 'COMMON_CACHE_EXTERNAL_902',
  REDIS_PERMISSION_DENIED: 'COMMON_CACHE_EXTERNAL_903',
  REDIS_COMMAND_FAILED: 'COMMON_CACHE_EXTERNAL_904',

  // Redis集群错误 (930-949)
  REDIS_CLUSTER_NODE_DOWN: 'COMMON_CACHE_EXTERNAL_930',
  REDIS_CLUSTER_FAILOVER: 'COMMON_CACHE_EXTERNAL_931',
  REDIS_SLOT_MIGRATION_ERROR: 'COMMON_CACHE_EXTERNAL_932',
  REDIS_CLUSTER_STATE_ERROR: 'COMMON_CACHE_EXTERNAL_933',

  // 网络错误 (950-979)
  NETWORK_CONNECTION_ERROR: 'COMMON_CACHE_EXTERNAL_950',
  NETWORK_TIMEOUT: 'COMMON_CACHE_EXTERNAL_951',
  DNS_RESOLUTION_FAILED: 'COMMON_CACHE_EXTERNAL_952',
  FIREWALL_BLOCKED: 'COMMON_CACHE_EXTERNAL_953',

  // 依赖服务错误 (980-999)
  MONITORING_SERVICE_UNAVAILABLE: 'COMMON_CACHE_EXTERNAL_980',
  CONFIG_SERVICE_UNAVAILABLE: 'COMMON_CACHE_EXTERNAL_981',
  METRICS_SERVICE_UNAVAILABLE: 'COMMON_CACHE_EXTERNAL_982',
  LOGGING_SERVICE_UNAVAILABLE: 'COMMON_CACHE_EXTERNAL_983',
} as const;

// 错误码类型定义
export type CommonCacheErrorCode = typeof COMMON_CACHE_ERROR_CODES[keyof typeof COMMON_CACHE_ERROR_CODES];

// 错误分类辅助函数
export const CommonCacheErrorCategories = {
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
   */
  isRetryable: (errorCode: string): boolean => {
    // 系统资源错误中的超时和内存压力可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('MEMORY_PRESSURE') ||
        errorCode.includes('SLOW_OPERATION') ||
        errorCode.includes('THROUGHPUT_LIMIT')) {
      return true;
    }

    // 外部依赖错误通常可重试
    if (errorCode.includes('EXTERNAL')) {
      // 除了认证失败和权限错误
      return !errorCode.includes('AUTHENTICATION_FAILED') &&
             !errorCode.includes('PERMISSION_DENIED');
    }

    // 某些业务错误可重试
    if (errorCode.includes('CACHE_HIT_FAILED') ||
        errorCode.includes('CACHE_SET_FAILED') ||
        errorCode.includes('COMPRESSION_FAILED') ||
        errorCode.includes('BATCH_PARTIAL_FAILURE')) {
      return true;
    }

    // 并发控制错误可重试
    if (errorCode.includes('CONCURRENT_ACCESS_CONFLICT') ||
        errorCode.includes('LOCK_ACQUISITION_TIMEOUT') ||
        errorCode.includes('RACE_CONDITION_DETECTED')) {
      return true;
    }

    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (CommonCacheErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    if (CommonCacheErrorCategories.isExternalError(errorCode) ||
        CommonCacheErrorCategories.isSystemError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (CommonCacheErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误根据类型判断
    if (CommonCacheErrorCategories.isBusinessError(errorCode)) {
      // 数据完整性和批量操作错误较严重
      if (errorCode.includes('DATA_CORRUPTED') ||
          errorCode.includes('BATCH_ROLLBACK_FAILED') ||
          errorCode.includes('ATOMIC_OPERATION_FAILED')) {
        return 'high';
      }
      return 'medium';
    }

    // 系统资源错误
    if (CommonCacheErrorCategories.isSystemError(errorCode)) {
      // 内存和存储相关是关键级别
      if (errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
          errorCode.includes('CACHE_STORAGE_FULL') ||
          errorCode.includes('DEADLOCK_DETECTED')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误
    if (CommonCacheErrorCategories.isExternalError(errorCode)) {
      // Redis连接错误是关键级别
      if (errorCode.includes('REDIS_CONNECTION_') ||
          errorCode.includes('REDIS_CLUSTER_')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  },

  /**
   * 判断是否需要立即清理缓存
   */
  requiresCacheCleanup: (errorCode: string): boolean => {
    return errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
           errorCode.includes('CACHE_STORAGE_FULL') ||
           errorCode.includes('DATA_CORRUPTED') ||
           errorCode.includes('MEMORY_FRAGMENTATION_HIGH');
  },

  /**
   * 判断是否需要降级服务
   */
  requiresServiceDegradation: (errorCode: string): boolean => {
    return errorCode.includes('REDIS_CONNECTION_FAILED') ||
           errorCode.includes('REDIS_CLUSTER_NODE_DOWN') ||
           errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
           errorCode.includes('CACHE_STORAGE_FULL');
  }
};

// 错误码说明映射（用于开发和调试）
export const COMMON_CACHE_ERROR_DESCRIPTIONS = {
  [COMMON_CACHE_ERROR_CODES.INVALID_CACHE_KEY_FORMAT]: 'Cache key format is invalid or contains illegal characters',
  [COMMON_CACHE_ERROR_CODES.TTL_OUT_OF_RANGE]: 'TTL value is outside the acceptable range',
  [COMMON_CACHE_ERROR_CODES.DATA_SIZE_EXCEEDED]: 'Data size exceeds maximum allowed limit',
  [COMMON_CACHE_ERROR_CODES.BATCH_SIZE_LIMIT_EXCEEDED]: 'Batch operation size exceeds limit',
  [COMMON_CACHE_ERROR_CODES.COMPRESSION_FAILED]: 'Data compression operation failed',
  [COMMON_CACHE_ERROR_CODES.DECOMPRESSION_FAILED]: 'Data decompression operation failed',
  [COMMON_CACHE_ERROR_CODES.SERIALIZATION_FAILED]: 'Data serialization failed',
  [COMMON_CACHE_ERROR_CODES.CACHE_KEY_NOT_FOUND]: 'Requested cache key does not exist',
  [COMMON_CACHE_ERROR_CODES.MEMORY_LIMIT_EXCEEDED]: 'Cache memory usage exceeds limit',
  [COMMON_CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED]: 'Failed to connect to Redis server',
  [COMMON_CACHE_ERROR_CODES.CONCURRENT_ACCESS_CONFLICT]: 'Concurrent access conflict detected',
  [COMMON_CACHE_ERROR_CODES.CONFIG_VALIDATION_FAILED]: 'Cache configuration validation failed',
  // 可根据需要添加更多描述
} as const;