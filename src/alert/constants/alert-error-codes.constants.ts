/**
 * Alert组件错误码常量定义
 *
 * 错误码格式：ALERT_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const ALERT_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 规则验证 (001-099)
  RULE_VALIDATION_FAILED: 'ALERT_VALIDATION_001',
  INVALID_RULE_FORMAT: 'ALERT_VALIDATION_002',
  MISSING_REQUIRED_FIELDS: 'ALERT_VALIDATION_003',
  INVALID_CONDITION_SYNTAX: 'ALERT_VALIDATION_004',
  INVALID_THRESHOLD_VALUE: 'ALERT_VALIDATION_005',
  UNSUPPORTED_METRIC_TYPE: 'ALERT_VALIDATION_006',
  INVALID_TIME_WINDOW: 'ALERT_VALIDATION_007',
  INVALID_NOTIFICATION_CHANNEL: 'ALERT_VALIDATION_008',
  DUPLICATE_RULE_NAME: 'ALERT_VALIDATION_009',
  RULE_NAME_TOO_LONG: 'ALERT_VALIDATION_010',

  // 查询参数验证 (100-199)
  INVALID_DATE_RANGE: 'ALERT_VALIDATION_100',
  START_DATE_AFTER_END_DATE: 'ALERT_VALIDATION_101',
  DATE_RANGE_TOO_LARGE: 'ALERT_VALIDATION_102',
  INVALID_PAGE_PARAMETERS: 'ALERT_VALIDATION_103',
  INVALID_SORT_PARAMETERS: 'ALERT_VALIDATION_104',
  SEARCH_KEYWORD_TOO_LONG: 'ALERT_VALIDATION_105',
  EMPTY_SEARCH_KEYWORD: 'ALERT_VALIDATION_106',
  INVALID_FILTER_CRITERIA: 'ALERT_VALIDATION_107',
  INVALID_AGGREGATION_INTERVAL: 'ALERT_VALIDATION_108',

  // 配置验证 (200-299)
  INVALID_ALERT_CONFIG: 'ALERT_VALIDATION_200',
  MISSING_PERFORMANCE_CONFIG: 'ALERT_VALIDATION_201',
  INVALID_CACHE_CONFIG: 'ALERT_VALIDATION_202',
  CONFIGURATION_VALIDATION_FAILED: 'ALERT_VALIDATION_203',
  INVALID_ENVIRONMENT_SETTINGS: 'ALERT_VALIDATION_204',
  CONSTANTS_VALIDATION_FAILED: 'ALERT_VALIDATION_205',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 规则管理错误 (300-399)
  RULE_NOT_FOUND: 'ALERT_BUSINESS_300',
  RULE_ALREADY_EXISTS: 'ALERT_BUSINESS_301',
  RULE_IN_USE_CANNOT_DELETE: 'ALERT_BUSINESS_302',
  RULE_EXECUTION_FAILED: 'ALERT_BUSINESS_303',
  RULE_STATE_CONFLICT: 'ALERT_BUSINESS_304',
  RULE_DEPENDENCY_MISSING: 'ALERT_BUSINESS_305',
  RULE_CIRCULAR_DEPENDENCY: 'ALERT_BUSINESS_306',
  RULE_VERSION_CONFLICT: 'ALERT_BUSINESS_307',

  // 告警生命周期错误 (400-499)
  ALERT_NOT_FOUND: 'ALERT_BUSINESS_400',
  ALERT_ALREADY_ACKNOWLEDGED: 'ALERT_BUSINESS_401',
  ALERT_ALREADY_RESOLVED: 'ALERT_BUSINESS_402',
  ALERT_STATE_TRANSITION_INVALID: 'ALERT_BUSINESS_403',
  ALERT_LIFECYCLE_ERROR: 'ALERT_BUSINESS_404',
  ALERT_ASSIGNMENT_FAILED: 'ALERT_BUSINESS_405',
  ALERT_ESCALATION_FAILED: 'ALERT_BUSINESS_406',
  ALERT_NOTIFICATION_FAILED: 'ALERT_BUSINESS_407',

  // 查询和统计错误 (500-599)
  QUERY_EXECUTION_FAILED: 'ALERT_BUSINESS_500',
  STATISTICS_GENERATION_FAILED: 'ALERT_BUSINESS_501',
  TREND_ANALYSIS_FAILED: 'ALERT_BUSINESS_502',
  REPORT_GENERATION_FAILED: 'ALERT_BUSINESS_503',
  DATA_AGGREGATION_FAILED: 'ALERT_BUSINESS_504',
  SEARCH_OPERATION_FAILED: 'ALERT_BUSINESS_505',

  // ==================== 系统资源错误 (600-899) ====================

  // 性能和资源 (600-699)
  MEMORY_PRESSURE_DETECTED: 'ALERT_SYSTEM_600',
  CPU_OVERLOAD: 'ALERT_SYSTEM_601',
  ALERT_QUEUE_OVERFLOW: 'ALERT_SYSTEM_602',
  RULE_PROCESSING_OVERLOAD: 'ALERT_SYSTEM_603',
  NOTIFICATION_QUEUE_FULL: 'ALERT_SYSTEM_604',
  THREAD_POOL_EXHAUSTED: 'ALERT_SYSTEM_605',
  RESOURCE_CONTENTION: 'ALERT_SYSTEM_606',

  // 超时错误 (700-799)
  RULE_EXECUTION_TIMEOUT: 'ALERT_SYSTEM_700',
  QUERY_TIMEOUT: 'ALERT_SYSTEM_701',
  NOTIFICATION_TIMEOUT: 'ALERT_SYSTEM_702',
  DATABASE_OPERATION_TIMEOUT: 'ALERT_SYSTEM_703',
  CACHE_OPERATION_TIMEOUT: 'ALERT_SYSTEM_704',
  ALERT_PROCESSING_TIMEOUT: 'ALERT_SYSTEM_705',

  // 配置和环境 (800-899)
  SERVICE_INITIALIZATION_FAILED: 'ALERT_SYSTEM_800',
  CONFIGURATION_RELOAD_FAILED: 'ALERT_SYSTEM_801',
  HEALTH_CHECK_FAILED: 'ALERT_SYSTEM_802',
  MONITORING_UNAVAILABLE: 'ALERT_SYSTEM_803',
  ORCHESTRATOR_SERVICE_ERROR: 'ALERT_SYSTEM_804',

  // ==================== 外部依赖错误 (900-999) ====================

  // 数据库错误 (900-929)
  DATABASE_CONNECTION_FAILED: 'ALERT_EXTERNAL_900',
  DATABASE_OPERATION_FAILED: 'ALERT_EXTERNAL_901',
  DATABASE_TRANSACTION_FAILED: 'ALERT_EXTERNAL_902',
  DATABASE_CONSTRAINT_VIOLATION: 'ALERT_EXTERNAL_903',
  DATABASE_TIMEOUT: 'ALERT_EXTERNAL_904',
  DATABASE_UNAVAILABLE: 'ALERT_EXTERNAL_905',

  // 缓存服务错误 (930-949)
  CACHE_SERVICE_UNAVAILABLE: 'ALERT_EXTERNAL_930',
  CACHE_CONNECTION_FAILED: 'ALERT_EXTERNAL_931',
  CACHE_OPERATION_FAILED: 'ALERT_EXTERNAL_932',
  CACHE_DATA_CORRUPTION: 'ALERT_EXTERNAL_933',

  // 通知服务错误 (950-969)
  NOTIFICATION_SERVICE_UNAVAILABLE: 'ALERT_EXTERNAL_950',
  EMAIL_SERVICE_FAILED: 'ALERT_EXTERNAL_951',
  SMS_SERVICE_FAILED: 'ALERT_EXTERNAL_952',
  WEBHOOK_DELIVERY_FAILED: 'ALERT_EXTERNAL_953',
  SLACK_NOTIFICATION_FAILED: 'ALERT_EXTERNAL_954',

  // 监控和指标错误 (970-999)
  METRICS_SERVICE_UNAVAILABLE: 'ALERT_EXTERNAL_970',
  MONITORING_DATA_UNAVAILABLE: 'ALERT_EXTERNAL_971',
  EXTERNAL_API_ERROR: 'ALERT_EXTERNAL_972',
  NETWORK_CONNECTION_ERROR: 'ALERT_EXTERNAL_973',
  INFRASTRUCTURE_FAILURE: 'ALERT_EXTERNAL_974',
} as const;

// 错误码类型定义
export type AlertErrorCode = typeof ALERT_ERROR_CODES[keyof typeof ALERT_ERROR_CODES];

// 错误分类辅助函数
export const AlertErrorCategories = {
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
    // 外部依赖错误通常可重试
    if (errorCode.includes('EXTERNAL')) {
      // 除了配置错误和约束违反
      return !errorCode.includes('CONSTRAINT_VIOLATION') &&
             !errorCode.includes('DATA_CORRUPTION');
    }

    // 系统资源错误中的超时和负载问题可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('OVERLOAD') ||
        errorCode.includes('PRESSURE') ||
        errorCode.includes('QUEUE_OVERFLOW') ||
        errorCode.includes('THREAD_POOL_EXHAUSTED')) {
      return true;
    }

    // 某些业务错误可重试（如规则执行失败）
    if (errorCode.includes('RULE_EXECUTION_FAILED') ||
        errorCode.includes('QUERY_EXECUTION_FAILED') ||
        errorCode.includes('NOTIFICATION_FAILED')) {
      return true;
    }

    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'fallback' | 'abort' => {
    if (AlertErrorCategories.isRetryable(errorCode)) {
      return 'retry';
    }

    if (AlertErrorCategories.isExternalError(errorCode) ||
        AlertErrorCategories.isSystemError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (AlertErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误根据类型判断
    if (AlertErrorCategories.isBusinessError(errorCode)) {
      // 告警生命周期错误较重要
      if (errorCode.includes('ALERT_LIFECYCLE') ||
          errorCode.includes('RULE_EXECUTION_FAILED') ||
          errorCode.includes('NOTIFICATION_FAILED')) {
        return 'high';
      }
      return 'medium';
    }

    // 系统资源错误
    if (AlertErrorCategories.isSystemError(errorCode)) {
      // 资源耗尽和服务初始化失败是关键级别
      if (errorCode.includes('MEMORY_PRESSURE') ||
          errorCode.includes('CPU_OVERLOAD') ||
          errorCode.includes('QUEUE_OVERFLOW') ||
          errorCode.includes('SERVICE_INITIALIZATION_FAILED')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误
    if (AlertErrorCategories.isExternalError(errorCode)) {
      // 数据库和基础设施失败是关键级别
      if (errorCode.includes('DATABASE_UNAVAILABLE') ||
          errorCode.includes('INFRASTRUCTURE_FAILURE') ||
          errorCode.includes('NOTIFICATION_SERVICE_UNAVAILABLE')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  },

  /**
   * 判断是否需要立即告警
   */
  requiresImmediateAlert: (errorCode: string): boolean => {
    return errorCode.includes('CRITICAL') ||
           errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('CPU_OVERLOAD') ||
           errorCode.includes('SERVICE_INITIALIZATION_FAILED') ||
           errorCode.includes('DATABASE_UNAVAILABLE') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE');
  },

  /**
   * 判断是否需要降级服务
   */
  requiresServiceDegradation: (errorCode: string): boolean => {
    return errorCode.includes('DATABASE_UNAVAILABLE') ||
           errorCode.includes('CACHE_SERVICE_UNAVAILABLE') ||
           errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('CPU_OVERLOAD') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE');
  },

  /**
   * 判断是否需要清理资源
   */
  requiresResourceCleanup: (errorCode: string): boolean => {
    return errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('QUEUE_OVERFLOW') ||
           errorCode.includes('THREAD_POOL_EXHAUSTED') ||
           errorCode.includes('ALERT_QUEUE_OVERFLOW');
  }
};

// 错误码说明映射（用于开发和调试）
export const ALERT_ERROR_DESCRIPTIONS = {
  [ALERT_ERROR_CODES.RULE_VALIDATION_FAILED]: 'Alert rule validation failed due to invalid configuration',
  [ALERT_ERROR_CODES.INVALID_RULE_FORMAT]: 'Alert rule format is invalid or malformed',
  [ALERT_ERROR_CODES.START_DATE_AFTER_END_DATE]: 'Start date must be earlier than end date',
  [ALERT_ERROR_CODES.DATE_RANGE_TOO_LARGE]: 'Query date range exceeds maximum allowed limit',
  [ALERT_ERROR_CODES.RULE_NOT_FOUND]: 'Alert rule not found in the system',
  [ALERT_ERROR_CODES.ALERT_NOT_FOUND]: 'Alert instance not found',
  [ALERT_ERROR_CODES.RULE_EXECUTION_FAILED]: 'Alert rule execution failed during processing',
  [ALERT_ERROR_CODES.MEMORY_PRESSURE_DETECTED]: 'System memory usage is critically high',
  [ALERT_ERROR_CODES.DATABASE_CONNECTION_FAILED]: 'Failed to connect to alert database',
  [ALERT_ERROR_CODES.NOTIFICATION_SERVICE_UNAVAILABLE]: 'Notification service is currently unavailable',
  [ALERT_ERROR_CODES.SEARCH_KEYWORD_TOO_LONG]: 'Search keyword length exceeds maximum allowed limit',
  [ALERT_ERROR_CODES.EMPTY_SEARCH_KEYWORD]: 'Search keyword cannot be empty',
  // 可根据需要添加更多描述
} as const;