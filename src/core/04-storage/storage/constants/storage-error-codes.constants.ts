/**
 * Storage组件错误码常量定义
 *
 * 错误码格式：STORAGE_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const STORAGE_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 数据验证 (001-099)
  INVALID_DATA_FORMAT: 'STORAGE_VALIDATION_001',
  MISSING_REQUIRED_FIELDS: 'STORAGE_VALIDATION_002',
  DATA_SIZE_EXCEEDED: 'STORAGE_VALIDATION_003',
  INVALID_OBJECT_ID: 'STORAGE_VALIDATION_004',
  INVALID_STORAGE_TYPE: 'STORAGE_VALIDATION_005',
  INVALID_CLASSIFICATION: 'STORAGE_VALIDATION_006',
  EMPTY_DATA_PAYLOAD: 'STORAGE_VALIDATION_007',
  INVALID_METADATA_FORMAT: 'STORAGE_VALIDATION_008',
  UNSUPPORTED_DATA_TYPE: 'STORAGE_VALIDATION_009',
  INVALID_TIMESTAMP: 'STORAGE_VALIDATION_010',

  // 查询验证 (100-199)
  INVALID_QUERY_PARAMS: 'STORAGE_VALIDATION_100',
  INVALID_PAGINATION_PARAMS: 'STORAGE_VALIDATION_101',
  INVALID_SORT_PARAMS: 'STORAGE_VALIDATION_102',
  INVALID_FILTER_CRITERIA: 'STORAGE_VALIDATION_103',
  QUERY_TOO_COMPLEX: 'STORAGE_VALIDATION_104',
  INVALID_DATE_RANGE: 'STORAGE_VALIDATION_105',
  INVALID_LIMIT_VALUE: 'STORAGE_VALIDATION_106',
  INVALID_OFFSET_VALUE: 'STORAGE_VALIDATION_107',

  // 配置验证 (200-299)
  INVALID_STORAGE_CONFIG: 'STORAGE_VALIDATION_200',
  MISSING_CONNECTION_PARAMS: 'STORAGE_VALIDATION_201',
  INVALID_COLLECTION_NAME: 'STORAGE_VALIDATION_202',
  INVALID_INDEX_DEFINITION: 'STORAGE_VALIDATION_203',
  UNSUPPORTED_OPERATION_TYPE: 'STORAGE_VALIDATION_204',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 数据操作错误 (300-399)
  DATA_NOT_FOUND: 'STORAGE_BUSINESS_300',
  DATA_ALREADY_EXISTS: 'STORAGE_BUSINESS_301',
  DATA_CORRUPTION_DETECTED: 'STORAGE_BUSINESS_302',
  DATA_VERSION_CONFLICT: 'STORAGE_BUSINESS_303',
  DATA_INTEGRITY_VIOLATION: 'STORAGE_BUSINESS_304',
  DUPLICATE_KEY_ERROR: 'STORAGE_BUSINESS_305',
  REFERENCE_INTEGRITY_ERROR: 'STORAGE_BUSINESS_306',
  DATA_INCONSISTENCY_ERROR: 'STORAGE_BUSINESS_307',

  // 存储策略错误 (400-499)
  STORAGE_POLICY_VIOLATION: 'STORAGE_BUSINESS_400',
  RETENTION_POLICY_ERROR: 'STORAGE_BUSINESS_401',
  COMPRESSION_STRATEGY_FAILED: 'STORAGE_BUSINESS_402',
  ARCHIVAL_POLICY_ERROR: 'STORAGE_BUSINESS_403',
  BACKUP_STRATEGY_FAILED: 'STORAGE_BUSINESS_404',
  MIGRATION_OPERATION_FAILED: 'STORAGE_BUSINESS_405',

  // 权限和安全错误 (500-599)
  INSUFFICIENT_PERMISSIONS: 'STORAGE_BUSINESS_500',
  ACCESS_DENIED: 'STORAGE_BUSINESS_501',
  SENSITIVE_DATA_PROTECTION_ERROR: 'STORAGE_BUSINESS_502',
  ENCRYPTION_OPERATION_FAILED: 'STORAGE_BUSINESS_503',
  DECRYPTION_OPERATION_FAILED: 'STORAGE_BUSINESS_504',
  AUDIT_LOG_FAILURE: 'STORAGE_BUSINESS_505',

  // ==================== 系统资源错误 (600-899) ====================

  // 内存和性能 (600-699)
  MEMORY_LIMIT_EXCEEDED: 'STORAGE_SYSTEM_600',
  LARGE_OBJECT_PROCESSING_ERROR: 'STORAGE_SYSTEM_601',
  BUFFER_OVERFLOW_ERROR: 'STORAGE_SYSTEM_602',
  MEMORY_PRESSURE_DETECTED: 'STORAGE_SYSTEM_603',
  MEMORY_FRAGMENTATION_HIGH: 'STORAGE_SYSTEM_604',
  COMPRESSION_MEMORY_ERROR: 'STORAGE_SYSTEM_605',
  DECOMPRESSION_MEMORY_ERROR: 'STORAGE_SYSTEM_606',

  // 性能和超时 (700-799)
  OPERATION_TIMEOUT: 'STORAGE_SYSTEM_700',
  SLOW_QUERY_DETECTED: 'STORAGE_SYSTEM_701',
  INDEX_PERFORMANCE_DEGRADED: 'STORAGE_SYSTEM_702',
  BULK_OPERATION_TIMEOUT: 'STORAGE_SYSTEM_703',
  STREAMING_TIMEOUT: 'STORAGE_SYSTEM_704',
  BATCH_PROCESSING_TIMEOUT: 'STORAGE_SYSTEM_705',

  // 存储空间和容量 (800-899)
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_SYSTEM_800',
  DISK_SPACE_INSUFFICIENT: 'STORAGE_SYSTEM_801',
  COLLECTION_SIZE_LIMIT_EXCEEDED: 'STORAGE_SYSTEM_802',
  DOCUMENT_SIZE_LIMIT_EXCEEDED: 'STORAGE_SYSTEM_803',
  INDEX_SIZE_LIMIT_EXCEEDED: 'STORAGE_SYSTEM_804',
  STORAGE_MAINTENANCE_REQUIRED: 'STORAGE_SYSTEM_805',

  // ==================== 外部依赖错误 (900-999) ====================

  // MongoDB连接错误 (900-929)
  DATABASE_CONNECTION_FAILED: 'STORAGE_EXTERNAL_900',
  DATABASE_CONNECTION_LOST: 'STORAGE_EXTERNAL_901',
  DATABASE_AUTHENTICATION_FAILED: 'STORAGE_EXTERNAL_902',
  DATABASE_PERMISSION_DENIED: 'STORAGE_EXTERNAL_903',
  DATABASE_SERVER_UNAVAILABLE: 'STORAGE_EXTERNAL_904',
  DATABASE_MAINTENANCE_MODE: 'STORAGE_EXTERNAL_905',

  // MongoDB操作错误 (930-949)
  DATABASE_OPERATION_FAILED: 'STORAGE_EXTERNAL_930',
  DATABASE_TRANSACTION_FAILED: 'STORAGE_EXTERNAL_931',
  DATABASE_INDEX_ERROR: 'STORAGE_EXTERNAL_932',
  DATABASE_REPLICATION_ERROR: 'STORAGE_EXTERNAL_933',
  DATABASE_SHARDING_ERROR: 'STORAGE_EXTERNAL_934',
  DATABASE_CLUSTER_ERROR: 'STORAGE_EXTERNAL_935',

  // 网络和基础设施 (950-979)
  NETWORK_CONNECTION_ERROR: 'STORAGE_EXTERNAL_950',
  NETWORK_TIMEOUT: 'STORAGE_EXTERNAL_951',
  DNS_RESOLUTION_FAILED: 'STORAGE_EXTERNAL_952',
  SSL_CONNECTION_ERROR: 'STORAGE_EXTERNAL_953',
  FIREWALL_BLOCKED: 'STORAGE_EXTERNAL_954',

  // 外部服务依赖 (980-999)
  COMPRESSION_SERVICE_ERROR: 'STORAGE_EXTERNAL_980',
  ENCRYPTION_SERVICE_ERROR: 'STORAGE_EXTERNAL_981',
  MONITORING_SERVICE_ERROR: 'STORAGE_EXTERNAL_982',
  BACKUP_SERVICE_ERROR: 'STORAGE_EXTERNAL_983',
  MIGRATION_SERVICE_ERROR: 'STORAGE_EXTERNAL_984',
} as const;

// 错误码类型定义
export type StorageErrorCode = typeof STORAGE_ERROR_CODES[keyof typeof STORAGE_ERROR_CODES];

// 错误分类辅助函数
export const StorageErrorCategories = {
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
    // 外部依赖错误大多可重试
    if (errorCode.includes('EXTERNAL')) {
      // 除了认证失败、权限拒绝等
      return !errorCode.includes('AUTHENTICATION_FAILED') &&
             !errorCode.includes('PERMISSION_DENIED') &&
             !errorCode.includes('ACCESS_DENIED');
    }

    // 系统资源错误中的超时和临时性错误可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('MEMORY_PRESSURE') ||
        errorCode.includes('SLOW_QUERY') ||
        errorCode.includes('CONNECTION_LOST') ||
        errorCode.includes('SERVER_UNAVAILABLE') ||
        errorCode.includes('MAINTENANCE_MODE')) {
      return true;
    }

    // 网络相关错误可重试
    if (errorCode.includes('NETWORK_') ||
        errorCode.includes('DNS_RESOLUTION') ||
        errorCode.includes('SSL_CONNECTION_ERROR')) {
      return true;
    }

    // 某些业务错误可重试（如版本冲突）
    if (errorCode.includes('VERSION_CONFLICT') ||
        errorCode.includes('TRANSACTION_FAILED')) {
      return true;
    }

    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (StorageErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    if (StorageErrorCategories.isExternalError(errorCode) ||
        errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
        errorCode.includes('STORAGE_QUOTA_EXCEEDED')) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (StorageErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误根据类型判断
    if (StorageErrorCategories.isBusinessError(errorCode)) {
      // 数据完整性和安全错误较严重
      if (errorCode.includes('DATA_CORRUPTION') ||
          errorCode.includes('DATA_INTEGRITY_VIOLATION') ||
          errorCode.includes('SENSITIVE_DATA_PROTECTION_ERROR') ||
          errorCode.includes('ENCRYPTION_OPERATION_FAILED')) {
        return 'critical';
      }

      if (errorCode.includes('ACCESS_DENIED') ||
          errorCode.includes('INSUFFICIENT_PERMISSIONS')) {
        return 'high';
      }

      return 'medium';
    }

    // 系统资源错误
    if (StorageErrorCategories.isSystemError(errorCode)) {
      // 内存和存储相关是关键级别
      if (errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
          errorCode.includes('STORAGE_QUOTA_EXCEEDED') ||
          errorCode.includes('DISK_SPACE_INSUFFICIENT') ||
          errorCode.includes('BUFFER_OVERFLOW')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误
    if (StorageErrorCategories.isExternalError(errorCode)) {
      // 数据库连接错误是关键级别
      if (errorCode.includes('DATABASE_CONNECTION_FAILED') ||
          errorCode.includes('DATABASE_SERVER_UNAVAILABLE') ||
          errorCode.includes('DATABASE_CLUSTER_ERROR')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  },

  /**
   * 判断是否需要立即清理资源
   */
  requiresResourceCleanup: (errorCode: string): boolean => {
    return errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
           errorCode.includes('BUFFER_OVERFLOW') ||
           errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('LARGE_OBJECT_PROCESSING_ERROR') ||
           errorCode.includes('COMPRESSION_MEMORY_ERROR');
  },

  /**
   * 判断是否需要降级服务
   */
  requiresServiceDegradation: (errorCode: string): boolean => {
    return errorCode.includes('DATABASE_SERVER_UNAVAILABLE') ||
           errorCode.includes('DATABASE_CLUSTER_ERROR') ||
           errorCode.includes('STORAGE_QUOTA_EXCEEDED') ||
           errorCode.includes('MEMORY_LIMIT_EXCEEDED') ||
           errorCode.includes('DISK_SPACE_INSUFFICIENT');
  },

  /**
   * 判断是否需要立即告警
   */
  requiresImmediateAlert: (errorCode: string): boolean => {
    return errorCode.includes('DATA_CORRUPTION') ||
           errorCode.includes('DATA_INTEGRITY_VIOLATION') ||
           errorCode.includes('SENSITIVE_DATA_PROTECTION_ERROR') ||
           errorCode.includes('DATABASE_CONNECTION_FAILED') ||
           errorCode.includes('STORAGE_QUOTA_EXCEEDED') ||
           errorCode.includes('SECURITY') ||
           errorCode.includes('CRITICAL');
  },

  /**
   * 判断是否需要数据恢复
   */
  requiresDataRecovery: (errorCode: string): boolean => {
    return errorCode.includes('DATA_CORRUPTION') ||
           errorCode.includes('DATA_INTEGRITY_VIOLATION') ||
           errorCode.includes('REFERENCE_INTEGRITY_ERROR') ||
           errorCode.includes('DATABASE_TRANSACTION_FAILED');
  }
};

// 错误码说明映射（用于开发和调试）
export const STORAGE_ERROR_DESCRIPTIONS = {
  [STORAGE_ERROR_CODES.INVALID_DATA_FORMAT]: 'Data format is invalid or malformed',
  [STORAGE_ERROR_CODES.DATA_SIZE_EXCEEDED]: 'Data size exceeds maximum allowed limit',
  [STORAGE_ERROR_CODES.DATA_NOT_FOUND]: 'Requested data not found in storage',
  [STORAGE_ERROR_CODES.DATA_ALREADY_EXISTS]: 'Data already exists, cannot create duplicate',
  [STORAGE_ERROR_CODES.DATA_CORRUPTION_DETECTED]: 'Data corruption detected during operation',
  [STORAGE_ERROR_CODES.MEMORY_LIMIT_EXCEEDED]: 'Memory usage exceeds system limits',
  [STORAGE_ERROR_CODES.DATABASE_CONNECTION_FAILED]: 'Failed to connect to MongoDB database',
  [STORAGE_ERROR_CODES.OPERATION_TIMEOUT]: 'Storage operation timed out',
  [STORAGE_ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded',
  [STORAGE_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for storage operation',
  [STORAGE_ERROR_CODES.INVALID_OBJECT_ID]: 'Invalid MongoDB ObjectId format',
  [STORAGE_ERROR_CODES.DUPLICATE_KEY_ERROR]: 'Duplicate key violation in database',
  // 可根据需要添加更多描述
} as const;

/**
 * 统一的错误消息常量 (中文消息)
 * 🎯 合并原有的 STORAGE_ERROR_MESSAGES，提供统一的错误消息系统
 */
export const STORAGE_ERROR_MESSAGES = Object.freeze({
  STORAGE_FAILED: "存储失败",
  RETRIEVAL_FAILED: "数据检索失败",
  DATA_NOT_FOUND: "数据未找到",
  REDIS_NOT_AVAILABLE: "Redis连接不可用",
  COMPRESSION_FAILED: "数据压缩失败",
  DECOMPRESSION_FAILED: "数据解压失败",
  SERIALIZATION_FAILED: "数据序列化失败",
  DESERIALIZATION_FAILED: "数据反序列化失败",
  CACHE_UPDATE_FAILED: "缓存更新失败",
  PERSISTENT_STORAGE_FAILED: "持久化存储失败",
  DELETE_FAILED: "删除失败",
  STATS_GENERATION_FAILED: "统计信息生成失败",
  INVALID_STORAGE_TYPE: "无效的存储类型",
  INVALID_DATA_TYPE_FILTER: "无效的数据类型过滤器",
  KEY_GENERATION_FAILED: "键生成失败",
} as const);

/**
 * 存储警告消息常量
 */
export const STORAGE_WARNING_MESSAGES = Object.freeze({
  REDIS_CONNECTION_UNAVAILABLE: "Redis连接不可用",
  COMPRESSION_SKIPPED: "跳过数据压缩",
  CACHE_MISS: "缓存未命中",
  PERSISTENT_FALLBACK: "回退到持久化存储",
  LARGE_DATA_SIZE: "数据大小较大",
  HIGH_MEMORY_USAGE: "内存使用率较高",
  SLOW_OPERATION: "操作响应较慢",
  TTL_CALCULATION_FAILED: "TTL计算失败",
  METADATA_PARSING_FAILED: "元数据解析失败",
  CACHE_UPDATE_FAILED: "缓存更新失败",
} as const);