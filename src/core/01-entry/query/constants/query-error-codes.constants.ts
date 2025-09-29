/**
 * Query组件错误码常量定义
 *
 * 错误码格式：QUERY_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const QUERY_ERROR_CODES = Object.freeze({
  // ==================== 验证类错误 (001-299) ====================

  // 参数验证 (001-099)
  MISSING_REQUIRED_PARAMS: 'QUERY_VALIDATION_001',
  MISSING_SYMBOLS_PARAM: 'QUERY_VALIDATION_002',
  MISSING_MARKET_PARAM: 'QUERY_VALIDATION_003',
  MISSING_PROVIDER_PARAM: 'QUERY_VALIDATION_004',
  INVALID_SYMBOLS_FORMAT: 'QUERY_VALIDATION_005',
  SYMBOLS_LIMIT_EXCEEDED: 'QUERY_VALIDATION_006',
  INVALID_SHARD_SIZE: 'QUERY_VALIDATION_007',

  // 数据格式验证 (100-199)
  INVALID_DATE_RANGE: 'QUERY_VALIDATION_100',
  INVALID_QUERY_PARAMETERS: 'QUERY_VALIDATION_101',
  INVALID_BULK_REQUEST_FORMAT: 'QUERY_VALIDATION_102',

  // 业务规则验证 (200-299)
  QUERY_TOO_COMPLEX: 'QUERY_VALIDATION_200',
  CONCURRENT_QUERIES_LIMIT_EXCEEDED: 'QUERY_VALIDATION_201',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 业务流程错误 (300-399)
  UNSUPPORTED_QUERY_TYPE: 'QUERY_BUSINESS_300',
  QUERY_TYPE_NOT_IMPLEMENTED: 'QUERY_BUSINESS_301',
  QUERY_EXECUTION_FAILED: 'QUERY_BUSINESS_302',
  BULK_QUERY_PARTIAL_FAILURE: 'QUERY_BUSINESS_303',

  // 状态冲突错误 (400-499)
  QUERY_ALREADY_EXECUTING: 'QUERY_BUSINESS_400',
  QUERY_CANCELLED: 'QUERY_BUSINESS_401',
  INVALID_QUERY_STATE: 'QUERY_BUSINESS_402',

  // 资源不存在错误 (500-599)
  QUERY_RESULT_EMPTY: 'QUERY_BUSINESS_500',
  QUERY_NOT_FOUND: 'QUERY_BUSINESS_501',
  EXECUTION_ENGINE_NOT_AVAILABLE: 'QUERY_BUSINESS_502',

  // ==================== 系统资源错误 (600-899) ====================

  // 内存/CPU资源 (600-699)
  MEMORY_PRESSURE: 'QUERY_SYSTEM_600',
  CPU_OVERLOAD: 'QUERY_SYSTEM_601',
  RESOURCE_EXHAUSTED: 'QUERY_SYSTEM_602',
  EXECUTION_QUEUE_FULL: 'QUERY_SYSTEM_603',

  // 超时错误 (700-799)
  QUERY_TIMEOUT: 'QUERY_SYSTEM_700',
  EXECUTION_TIMEOUT: 'QUERY_SYSTEM_701',
  RESULT_PROCESSING_TIMEOUT: 'QUERY_SYSTEM_702',
  BULK_QUERY_TIMEOUT: 'QUERY_SYSTEM_703',

  // 配置错误 (800-899)
  CONFIG_VALIDATION_FAILED: 'QUERY_SYSTEM_800',
  INVALID_CONFIG_PARAMETER: 'QUERY_SYSTEM_801',
  CONFIG_LOAD_FAILED: 'QUERY_SYSTEM_802',
  ENGINE_INITIALIZATION_FAILED: 'QUERY_SYSTEM_803',

  // ==================== 外部依赖错误 (900-999) ====================

  // 数据库错误 (900-949)
  DATABASE_CONNECTION_FAILED: 'QUERY_EXTERNAL_900',
  DATABASE_QUERY_FAILED: 'QUERY_EXTERNAL_901',
  DATABASE_TIMEOUT: 'QUERY_EXTERNAL_902',

  // 第三方API错误 (950-979)
  PROVIDER_UNAVAILABLE: 'QUERY_EXTERNAL_950',
  PROVIDER_API_ERROR: 'QUERY_EXTERNAL_951',
  PROVIDER_RATE_LIMITED: 'QUERY_EXTERNAL_952',
  PROVIDER_AUTHENTICATION_FAILED: 'QUERY_EXTERNAL_953',

  // 网络错误 (980-999)
  NETWORK_ERROR: 'QUERY_EXTERNAL_980',
  CONNECTION_TIMEOUT: 'QUERY_EXTERNAL_981',
  CACHE_SERVICE_ERROR: 'QUERY_EXTERNAL_982',
  MONITORING_SERVICE_ERROR: 'QUERY_EXTERNAL_983',
} as const);


// 错误分类辅助函数
export const QueryErrorCategories = {
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
    if (errorCode.includes('SYSTEM_60') || // 资源耗尽错误 600-699
        errorCode.includes('SYSTEM_70')) { // 超时错误 700-799
      return true;
    }
    
    // 检查特定的错误模式
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('RESOURCE_EXHAUSTED') ||
        errorCode.includes('CPU_OVERLOAD') ||
        errorCode.includes('MEMORY_PRESSURE')) {
      return true;
    }

    // 外部依赖错误通常可重试，除了认证失败
    if (errorCode.includes('EXTERNAL')) {
      if (errorCode.includes('AUTHENTICATION_FAILED') || errorCode === 'QUERY_EXTERNAL_953') {
        return false;
      }
      return true;
    }

    // 验证错误和业务逻辑错误通常不可重试
    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (QueryErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    // 特别处理认证失败错误
    if (errorCode === 'QUERY_EXTERNAL_953' || 
        (errorCode.includes('EXTERNAL') && errorCode.includes('AUTHENTICATION_FAILED'))) {
      return 'fallback';
    }
    
    if (QueryErrorCategories.isExternalError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  }
};

// 错误码说明映射（用于开发和调试）
export const QUERY_ERROR_DESCRIPTIONS = Object.freeze({
  [QUERY_ERROR_CODES.MISSING_SYMBOLS_PARAM]: 'Required symbols parameter is missing',
  [QUERY_ERROR_CODES.MISSING_MARKET_PARAM]: 'Required market parameter is missing',
  [QUERY_ERROR_CODES.MISSING_PROVIDER_PARAM]: 'Required provider parameter is missing',
  [QUERY_ERROR_CODES.INVALID_SHARD_SIZE]: 'Shard size must be greater than 0',
  [QUERY_ERROR_CODES.UNSUPPORTED_QUERY_TYPE]: 'Unsupported query type',
  [QUERY_ERROR_CODES.CONFIG_VALIDATION_FAILED]: 'Query configuration validation failed',
  [QUERY_ERROR_CODES.PROVIDER_UNAVAILABLE]: 'External data provider is unavailable',
  [QUERY_ERROR_CODES.CACHE_SERVICE_ERROR]: 'Cache service error occurred',
  // 可根据需要添加更多描述
} as const);