/**
 * Receiver组件错误码常量定义
 *
 * 错误码格式：RECEIVER_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const RECEIVER_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 参数验证 (001-099)
  MISSING_SYMBOLS_PARAM: 'RECEIVER_VALIDATION_001',
  INVALID_SYMBOLS_FORMAT: 'RECEIVER_VALIDATION_002',
  SYMBOLS_LIMIT_EXCEEDED: 'RECEIVER_VALIDATION_003',
  INVALID_PROVIDER_PARAM: 'RECEIVER_VALIDATION_004',
  INVALID_MARKET_PARAM: 'RECEIVER_VALIDATION_005',
  EMPTY_SYMBOLS_ARRAY: 'RECEIVER_VALIDATION_006',
  INVALID_SYMBOL_LENGTH: 'RECEIVER_VALIDATION_007',
  UNSUPPORTED_SYMBOL_FORMAT: 'RECEIVER_VALIDATION_008',
  INVALID_REQUEST_TYPE: 'RECEIVER_VALIDATION_009',
  MISSING_REQUIRED_HEADERS: 'RECEIVER_VALIDATION_010',

  // 请求格式验证 (100-199)
  MALFORMED_REQUEST_BODY: 'RECEIVER_VALIDATION_100',
  INVALID_JSON_FORMAT: 'RECEIVER_VALIDATION_101',
  UNSUPPORTED_CONTENT_TYPE: 'RECEIVER_VALIDATION_102',
  REQUEST_TOO_LARGE: 'RECEIVER_VALIDATION_103',
  INVALID_ENCODING: 'RECEIVER_VALIDATION_104',

  // 业务规则验证 (200-299)
  UNSUPPORTED_MARKET: 'RECEIVER_VALIDATION_200',
  MARKET_CLOSED_VALIDATION: 'RECEIVER_VALIDATION_201',
  RATE_LIMIT_VALIDATION: 'RECEIVER_VALIDATION_202',
  DUPLICATE_SYMBOLS: 'RECEIVER_VALIDATION_203',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 数据处理错误 (300-399)
  NO_DATA_AVAILABLE: 'RECEIVER_BUSINESS_300',
  DATA_NOT_FOUND: 'RECEIVER_BUSINESS_301',
  STALE_DATA_DETECTED: 'RECEIVER_BUSINESS_302',
  DATA_QUALITY_INSUFFICIENT: 'RECEIVER_BUSINESS_303',
  DATA_TRANSFORMATION_FAILED: 'RECEIVER_BUSINESS_304',
  SYMBOL_MAPPING_FAILED: 'RECEIVER_BUSINESS_305',
  DATA_AGGREGATION_FAILED: 'RECEIVER_BUSINESS_306',

  // 提供商相关错误 (400-499)
  PROVIDER_NOT_CONFIGURED: 'RECEIVER_BUSINESS_400',
  PROVIDER_MISMATCH: 'RECEIVER_BUSINESS_401',
  PROVIDER_DATA_INCONSISTENT: 'RECEIVER_BUSINESS_402',
  PROVIDER_QUOTA_EXCEEDED: 'RECEIVER_BUSINESS_403',
  PROVIDER_AUTHENTICATION_FAILED: 'RECEIVER_BUSINESS_404',
  MULTIPLE_PROVIDER_CONFLICT: 'RECEIVER_BUSINESS_405',

  // 缓存相关错误 (500-599)
  CACHE_MISS_CRITICAL: 'RECEIVER_BUSINESS_500',
  CACHE_DATA_CORRUPTED: 'RECEIVER_BUSINESS_501',
  CACHE_INVALIDATION_FAILED: 'RECEIVER_BUSINESS_502',
  CACHE_WARMING_FAILED: 'RECEIVER_BUSINESS_503',
  CACHE_STRATEGY_MISMATCH: 'RECEIVER_BUSINESS_504',

  // ==================== 系统资源错误 (600-899) ====================

  // 性能和资源 (600-699)
  MEMORY_PRESSURE_DETECTED: 'RECEIVER_SYSTEM_600',
  CPU_OVERLOAD: 'RECEIVER_SYSTEM_601',
  CONCURRENT_REQUEST_LIMIT: 'RECEIVER_SYSTEM_602',
  THREAD_POOL_EXHAUSTED: 'RECEIVER_SYSTEM_603',
  RESOURCE_CONTENTION: 'RECEIVER_SYSTEM_604',

  // 超时错误 (700-799)
  REQUEST_TIMEOUT: 'RECEIVER_SYSTEM_700',
  PROCESSING_TIMEOUT: 'RECEIVER_SYSTEM_701',
  CACHE_OPERATION_TIMEOUT: 'RECEIVER_SYSTEM_702',
  DATA_FETCH_TIMEOUT: 'RECEIVER_SYSTEM_703',
  DOWNSTREAM_TIMEOUT: 'RECEIVER_SYSTEM_704',

  // 配置和环境 (800-899)
  CONFIGURATION_ERROR: 'RECEIVER_SYSTEM_800',
  ENVIRONMENT_SETUP_ERROR: 'RECEIVER_SYSTEM_801',
  SERVICE_INITIALIZATION_FAILED: 'RECEIVER_SYSTEM_802',
  HEALTH_CHECK_FAILED: 'RECEIVER_SYSTEM_803',
  MONITORING_UNAVAILABLE: 'RECEIVER_SYSTEM_804',

  // ==================== 外部依赖错误 (900-999) ====================

  // 提供商服务错误 (900-929)
  PROVIDER_SERVICE_UNAVAILABLE: 'RECEIVER_EXTERNAL_900',
  PROVIDER_CONNECTION_FAILED: 'RECEIVER_EXTERNAL_901',
  PROVIDER_API_ERROR: 'RECEIVER_EXTERNAL_902',
  PROVIDER_RATE_LIMITED: 'RECEIVER_EXTERNAL_903',
  PROVIDER_MAINTENANCE: 'RECEIVER_EXTERNAL_904',
  PROVIDER_DEGRADED_PERFORMANCE: 'RECEIVER_EXTERNAL_905',

  // 缓存服务错误 (930-949)
  CACHE_SERVICE_UNAVAILABLE: 'RECEIVER_EXTERNAL_930',
  CACHE_CONNECTION_FAILED: 'RECEIVER_EXTERNAL_931',
  CACHE_CLUSTER_ERROR: 'RECEIVER_EXTERNAL_932',
  CACHE_REPLICATION_ERROR: 'RECEIVER_EXTERNAL_933',

  // 数据库服务错误 (950-969)
  DATABASE_UNAVAILABLE: 'RECEIVER_EXTERNAL_950',
  DATABASE_CONNECTION_FAILED: 'RECEIVER_EXTERNAL_951',
  DATABASE_QUERY_FAILED: 'RECEIVER_EXTERNAL_952',
  DATABASE_TRANSACTION_FAILED: 'RECEIVER_EXTERNAL_953',

  // 网络和基础设施 (970-999)
  NETWORK_ERROR: 'RECEIVER_EXTERNAL_970',
  DNS_RESOLUTION_FAILED: 'RECEIVER_EXTERNAL_971',
  SSL_CERTIFICATE_ERROR: 'RECEIVER_EXTERNAL_972',
  LOAD_BALANCER_ERROR: 'RECEIVER_EXTERNAL_973',
  INFRASTRUCTURE_FAILURE: 'RECEIVER_EXTERNAL_974',
} as const;

// 错误码类型定义
export type ReceiverErrorCode = typeof RECEIVER_ERROR_CODES[keyof typeof RECEIVER_ERROR_CODES];

// 错误分类辅助函数
export const ReceiverErrorCategories = {
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
    // 外部服务错误通常可重试
    if (errorCode.includes('EXTERNAL')) {
      // 除了认证失败和配置错误
      return !errorCode.includes('AUTHENTICATION_FAILED') &&
             !errorCode.includes('CONFIGURATION_ERROR');
    }

    // 系统资源错误中的超时和负载问题可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('OVERLOAD') ||
        errorCode.includes('PRESSURE') ||
        errorCode.includes('LIMIT')) {
      return true;
    }

    // 缓存相关错误可重试
    if (errorCode.includes('CACHE_SERVICE_UNAVAILABLE') ||
        errorCode.includes('CACHE_CONNECTION_FAILED') ||
        errorCode.includes('CACHE_MISS_CRITICAL')) {
      return true;
    }

    // 提供商相关的临时错误可重试
    if (errorCode.includes('PROVIDER_SERVICE_UNAVAILABLE') ||
        errorCode.includes('PROVIDER_CONNECTION_FAILED') ||
        errorCode.includes('PROVIDER_MAINTENANCE') ||
        errorCode.includes('PROVIDER_DEGRADED_PERFORMANCE')) {
      return true;
    }

    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (ReceiverErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    if (ReceiverErrorCategories.isExternalError(errorCode) ||
        ReceiverErrorCategories.isSystemError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (ReceiverErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误根据类型判断
    if (ReceiverErrorCategories.isBusinessError(errorCode)) {
      // 数据质量和关键业务错误较严重
      if (errorCode.includes('DATA_QUALITY_INSUFFICIENT') ||
          errorCode.includes('PROVIDER_AUTHENTICATION_FAILED') ||
          errorCode.includes('CACHE_DATA_CORRUPTED')) {
        return 'high';
      }
      return 'medium';
    }

    // 系统资源错误
    if (ReceiverErrorCategories.isSystemError(errorCode)) {
      // 资源耗尽和配置错误是关键级别
      if (errorCode.includes('MEMORY_PRESSURE') ||
          errorCode.includes('CPU_OVERLOAD') ||
          errorCode.includes('THREAD_POOL_EXHAUSTED') ||
          errorCode.includes('CONFIGURATION_ERROR')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误
    if (ReceiverErrorCategories.isExternalError(errorCode)) {
      // 提供商服务不可用是关键级别
      if (errorCode.includes('PROVIDER_SERVICE_UNAVAILABLE') ||
          errorCode.includes('DATABASE_UNAVAILABLE') ||
          errorCode.includes('INFRASTRUCTURE_FAILURE')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  },

  /**
   * 判断是否需要降级服务
   */
  requiresServiceDegradation: (errorCode: string): boolean => {
    return errorCode.includes('PROVIDER_SERVICE_UNAVAILABLE') ||
           errorCode.includes('DATABASE_UNAVAILABLE') ||
           errorCode.includes('CACHE_SERVICE_UNAVAILABLE') ||
           errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('CPU_OVERLOAD') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE');
  },

  /**
   * 判断是否需要立即告警
   */
  requiresImmediateAlert: (errorCode: string): boolean => {
    return errorCode.includes('CRITICAL') ||
           errorCode.includes('CONFIGURATION_ERROR') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE') ||
           errorCode.includes('AUTHENTICATION_FAILED') ||
           errorCode.includes('DATA_CORRUPTED');
  }
};

// 错误码说明映射（用于开发和调试）
export const RECEIVER_ERROR_DESCRIPTIONS = {
  [RECEIVER_ERROR_CODES.MISSING_SYMBOLS_PARAM]: 'Required symbols parameter is missing from request',
  [RECEIVER_ERROR_CODES.INVALID_SYMBOLS_FORMAT]: 'Symbols parameter format is invalid or malformed',
  [RECEIVER_ERROR_CODES.SYMBOLS_LIMIT_EXCEEDED]: 'Number of symbols exceeds maximum allowed limit',
  [RECEIVER_ERROR_CODES.NO_DATA_AVAILABLE]: 'No data available for the requested symbols',
  [RECEIVER_ERROR_CODES.PROVIDER_SERVICE_UNAVAILABLE]: 'External data provider service is currently unavailable',
  [RECEIVER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE]: 'Cache service is unavailable',
  [RECEIVER_ERROR_CODES.REQUEST_TIMEOUT]: 'Request processing timeout exceeded',
  [RECEIVER_ERROR_CODES.MEMORY_PRESSURE_DETECTED]: 'System memory usage is critically high',
  [RECEIVER_ERROR_CODES.CONFIGURATION_ERROR]: 'Service configuration error detected',
  [RECEIVER_ERROR_CODES.DATA_TRANSFORMATION_FAILED]: 'Failed to transform data to required format',
  // 可根据需要添加更多描述
} as const;