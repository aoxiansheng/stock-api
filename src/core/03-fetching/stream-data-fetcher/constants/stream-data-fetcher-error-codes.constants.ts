/**
 * Stream Data Fetcher组件错误码常量定义
 *
 * 错误码格式：STREAM_DATA_FETCHER_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const STREAM_DATA_FETCHER_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================

  // 连接参数验证 (001-099)
  INVALID_WEBSOCKET_URL: 'STREAM_DATA_FETCHER_VALIDATION_001',
  MISSING_SYMBOLS_PARAM: 'STREAM_DATA_FETCHER_VALIDATION_002',
  INVALID_SYMBOLS_FORMAT: 'STREAM_DATA_FETCHER_VALIDATION_003',
  SYMBOLS_LIMIT_EXCEEDED: 'STREAM_DATA_FETCHER_VALIDATION_004',
  INVALID_PROVIDER_PARAM: 'STREAM_DATA_FETCHER_VALIDATION_005',
  INVALID_MARKET_PARAM: 'STREAM_DATA_FETCHER_VALIDATION_006',
  INVALID_SUBSCRIPTION_TYPE: 'STREAM_DATA_FETCHER_VALIDATION_007',
  INVALID_CONNECTION_ID: 'STREAM_DATA_FETCHER_VALIDATION_008',
  INVALID_CLIENT_ID: 'STREAM_DATA_FETCHER_VALIDATION_009',
  MISSING_AUTHENTICATION_TOKEN: 'STREAM_DATA_FETCHER_VALIDATION_010',

  // 消息格式验证 (100-199)
  INVALID_MESSAGE_FORMAT: 'STREAM_DATA_FETCHER_VALIDATION_100',
  MALFORMED_STREAM_DATA: 'STREAM_DATA_FETCHER_VALIDATION_101',
  UNSUPPORTED_MESSAGE_TYPE: 'STREAM_DATA_FETCHER_VALIDATION_102',
  INVALID_COMMAND_STRUCTURE: 'STREAM_DATA_FETCHER_VALIDATION_103',
  MESSAGE_SIZE_EXCEEDED: 'STREAM_DATA_FETCHER_VALIDATION_104',
  INVALID_ENCODING_FORMAT: 'STREAM_DATA_FETCHER_VALIDATION_105',
  MISSING_MESSAGE_HEADERS: 'STREAM_DATA_FETCHER_VALIDATION_106',
  INVALID_TIMESTAMP_FORMAT: 'STREAM_DATA_FETCHER_VALIDATION_107',

  // 配置验证 (200-299)
  INVALID_STREAM_CONFIG: 'STREAM_DATA_FETCHER_VALIDATION_200',
  MISSING_WEBSOCKET_CONFIG: 'STREAM_DATA_FETCHER_VALIDATION_201',
  INVALID_RECONNECT_STRATEGY: 'STREAM_DATA_FETCHER_VALIDATION_202',
  INVALID_HEARTBEAT_INTERVAL: 'STREAM_DATA_FETCHER_VALIDATION_203',
  INVALID_BUFFER_SIZE: 'STREAM_DATA_FETCHER_VALIDATION_204',
  UNSUPPORTED_PROTOCOL_VERSION: 'STREAM_DATA_FETCHER_VALIDATION_205',

  // ==================== 业务逻辑错误 (300-599) ====================

  // 连接管理错误 (300-399)
  CONNECTION_ALREADY_EXISTS: 'STREAM_DATA_FETCHER_BUSINESS_300',
  CONNECTION_NOT_FOUND: 'STREAM_DATA_FETCHER_BUSINESS_301',
  CONNECTION_STATE_MISMATCH: 'STREAM_DATA_FETCHER_BUSINESS_302',
  DUPLICATE_SUBSCRIPTION: 'STREAM_DATA_FETCHER_BUSINESS_303',
  SUBSCRIPTION_NOT_FOUND: 'STREAM_DATA_FETCHER_BUSINESS_304',
  MAX_CONNECTIONS_EXCEEDED: 'STREAM_DATA_FETCHER_BUSINESS_305',
  CONNECTION_AUTHENTICATION_FAILED: 'STREAM_DATA_FETCHER_BUSINESS_306',
  SESSION_EXPIRED: 'STREAM_DATA_FETCHER_BUSINESS_307',
  UNAUTHORIZED_SUBSCRIPTION: 'STREAM_DATA_FETCHER_BUSINESS_308',

  // 数据流处理错误 (400-499)
  STREAM_DATA_CORRUPTION: 'STREAM_DATA_FETCHER_BUSINESS_400',
  DATA_SEQUENCE_ERROR: 'STREAM_DATA_FETCHER_BUSINESS_401',
  STREAM_BUFFER_OVERFLOW: 'STREAM_DATA_FETCHER_BUSINESS_402',
  DATA_TRANSFORMATION_FAILED: 'STREAM_DATA_FETCHER_BUSINESS_403',
  STREAM_PROCESSING_BACKLOG: 'STREAM_DATA_FETCHER_BUSINESS_404',
  DUPLICATE_DATA_DETECTED: 'STREAM_DATA_FETCHER_BUSINESS_405',
  DATA_QUALITY_INSUFFICIENT: 'STREAM_DATA_FETCHER_BUSINESS_406',
  STREAM_SYNCHRONIZATION_ERROR: 'STREAM_DATA_FETCHER_BUSINESS_407',

  // 状态管理错误 (500-599)
  INVALID_CLIENT_STATE: 'STREAM_DATA_FETCHER_BUSINESS_500',
  STATE_TRANSITION_FAILED: 'STREAM_DATA_FETCHER_BUSINESS_501',
  CLIENT_STATE_CORRUPTION: 'STREAM_DATA_FETCHER_BUSINESS_502',
  RECOVERY_STATE_MISMATCH: 'STREAM_DATA_FETCHER_BUSINESS_503',
  CHECKPOINT_VALIDATION_FAILED: 'STREAM_DATA_FETCHER_BUSINESS_504',
  STATE_PERSISTENCE_FAILED: 'STREAM_DATA_FETCHER_BUSINESS_505',

  // ==================== 系统资源错误 (600-899) ====================

  // 内存和性能 (600-699)
  MEMORY_PRESSURE_DETECTED: 'STREAM_DATA_FETCHER_SYSTEM_600',
  CONNECTION_POOL_EXHAUSTED: 'STREAM_DATA_FETCHER_SYSTEM_601',
  THREAD_POOL_SATURATED: 'STREAM_DATA_FETCHER_SYSTEM_602',
  BUFFER_ALLOCATION_FAILED: 'STREAM_DATA_FETCHER_SYSTEM_603',
  MEMORY_LEAK_DETECTED: 'STREAM_DATA_FETCHER_SYSTEM_604',
  CPU_OVERLOAD: 'STREAM_DATA_FETCHER_SYSTEM_605',
  RESOURCE_CONTENTION: 'STREAM_DATA_FETCHER_SYSTEM_606',

  // 超时和限制 (700-799)
  CONNECTION_TIMEOUT: 'STREAM_DATA_FETCHER_SYSTEM_700',
  SUBSCRIPTION_TIMEOUT: 'STREAM_DATA_FETCHER_SYSTEM_701',
  DATA_PROCESSING_TIMEOUT: 'STREAM_DATA_FETCHER_SYSTEM_702',
  HEARTBEAT_TIMEOUT: 'STREAM_DATA_FETCHER_SYSTEM_703',
  RECONNECTION_TIMEOUT: 'STREAM_DATA_FETCHER_SYSTEM_704',
  RATE_LIMIT_EXCEEDED: 'STREAM_DATA_FETCHER_SYSTEM_705',
  CONCURRENT_CONNECTIONS_LIMIT: 'STREAM_DATA_FETCHER_SYSTEM_706',
  MESSAGE_THROUGHPUT_LIMIT: 'STREAM_DATA_FETCHER_SYSTEM_707',

  // 配置和环境 (800-899)
  CONFIGURATION_RELOAD_FAILED: 'STREAM_DATA_FETCHER_SYSTEM_800',
  SERVICE_INITIALIZATION_FAILED: 'STREAM_DATA_FETCHER_SYSTEM_801',
  HEALTH_CHECK_FAILED: 'STREAM_DATA_FETCHER_SYSTEM_802',
  MONITORING_UNAVAILABLE: 'STREAM_DATA_FETCHER_SYSTEM_803',
  FEATURE_FLAG_ERROR: 'STREAM_DATA_FETCHER_SYSTEM_804',

  // ==================== 外部依赖错误 (900-999) ====================

  // 数据提供商错误 (900-929)
  PROVIDER_WEBSOCKET_UNAVAILABLE: 'STREAM_DATA_FETCHER_EXTERNAL_900',
  PROVIDER_CONNECTION_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_901',
  PROVIDER_AUTHENTICATION_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_902',
  PROVIDER_RATE_LIMITED: 'STREAM_DATA_FETCHER_EXTERNAL_903',
  PROVIDER_MAINTENANCE_MODE: 'STREAM_DATA_FETCHER_EXTERNAL_904',
  PROVIDER_DATA_FORMAT_CHANGED: 'STREAM_DATA_FETCHER_EXTERNAL_905',
  PROVIDER_SUBSCRIPTION_ERROR: 'STREAM_DATA_FETCHER_EXTERNAL_906',

  // 缓存和存储错误 (930-949)
  CACHE_SERVICE_UNAVAILABLE: 'STREAM_DATA_FETCHER_EXTERNAL_930',
  CACHE_CONNECTION_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_931',
  STATE_STORAGE_UNAVAILABLE: 'STREAM_DATA_FETCHER_EXTERNAL_932',
  CHECKPOINT_STORAGE_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_933',

  // 网络和基础设施 (950-999)
  NETWORK_CONNECTION_ERROR: 'STREAM_DATA_FETCHER_EXTERNAL_950',
  NETWORK_TIMEOUT: 'STREAM_DATA_FETCHER_EXTERNAL_951',
  DNS_RESOLUTION_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_952',
  SSL_HANDSHAKE_FAILED: 'STREAM_DATA_FETCHER_EXTERNAL_953',
  WEBSOCKET_PROTOCOL_ERROR: 'STREAM_DATA_FETCHER_EXTERNAL_954',
  LOAD_BALANCER_ERROR: 'STREAM_DATA_FETCHER_EXTERNAL_955',
  INFRASTRUCTURE_FAILURE: 'STREAM_DATA_FETCHER_EXTERNAL_956',
  FIREWALL_BLOCKED: 'STREAM_DATA_FETCHER_EXTERNAL_957',
} as const;

// 错误码类型定义
export type StreamDataFetcherErrorCode = typeof STREAM_DATA_FETCHER_ERROR_CODES[keyof typeof STREAM_DATA_FETCHER_ERROR_CODES];

// 错误分类辅助函数
export const StreamDataFetcherErrorCategories = {
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
      // 除了认证失败和协议错误
      return !errorCode.includes('AUTHENTICATION_FAILED') &&
             !errorCode.includes('PROTOCOL_ERROR') &&
             !errorCode.includes('SSL_HANDSHAKE_FAILED');
    }

    // 系统资源错误中的超时和负载问题可重试
    if (errorCode.includes('TIMEOUT') ||
        errorCode.includes('OVERLOAD') ||
        errorCode.includes('PRESSURE') ||
        errorCode.includes('EXHAUSTED') ||
        errorCode.includes('SATURATED')) {
      return true;
    }

    // 连接相关错误可重试
    if (errorCode.includes('CONNECTION_FAILED') ||
        errorCode.includes('WEBSOCKET_UNAVAILABLE') ||
        errorCode.includes('NETWORK_CONNECTION_ERROR') ||
        errorCode.includes('NETWORK_TIMEOUT')) {
      return true;
    }

    // 临时状态错误可重试
    if (errorCode.includes('STATE_TRANSITION_FAILED') ||
        errorCode.includes('STREAM_PROCESSING_BACKLOG') ||
        errorCode.includes('BUFFER_OVERFLOW')) {
      return true;
    }

    return false;
  },

  /**
   * 获取错误的恢复建议
   */
  getRecoveryAction: (errorCode: string): 'retry' | 'reconnect' | 'fallback' | 'abort' => {
    if (StreamDataFetcherErrorCategories.isRetryable(errorCode)) {
      // 连接相关错误建议重连
      if (errorCode.includes('CONNECTION') ||
          errorCode.includes('WEBSOCKET') ||
          errorCode.includes('NETWORK')) {
        return 'reconnect';
      }
      return 'retry';
    }

    if (StreamDataFetcherErrorCategories.isExternalError(errorCode) ||
        StreamDataFetcherErrorCategories.isSystemError(errorCode)) {
      return 'fallback';
    }

    return 'abort';
  },

  /**
   * 获取错误严重级别
   */
  getSeverityLevel: (errorCode: string): 'low' | 'medium' | 'high' | 'critical' => {
    // 验证错误通常是低级别
    if (StreamDataFetcherErrorCategories.isValidationError(errorCode)) {
      return 'low';
    }

    // 业务逻辑错误根据类型判断
    if (StreamDataFetcherErrorCategories.isBusinessError(errorCode)) {
      // 数据完整性和安全错误较严重
      if (errorCode.includes('DATA_CORRUPTION') ||
          errorCode.includes('STATE_CORRUPTION') ||
          errorCode.includes('AUTHENTICATION_FAILED') ||
          errorCode.includes('UNAUTHORIZED')) {
        return 'critical';
      }

      if (errorCode.includes('CONNECTION_AUTHENTICATION_FAILED') ||
          errorCode.includes('SESSION_EXPIRED') ||
          errorCode.includes('DATA_SEQUENCE_ERROR')) {
        return 'high';
      }

      return 'medium';
    }

    // 系统资源错误
    if (StreamDataFetcherErrorCategories.isSystemError(errorCode)) {
      // 内存和连接池问题是关键级别
      if (errorCode.includes('MEMORY_LEAK') ||
          errorCode.includes('CONNECTION_POOL_EXHAUSTED') ||
          errorCode.includes('THREAD_POOL_SATURATED') ||
          errorCode.includes('CPU_OVERLOAD')) {
        return 'critical';
      }
      return 'high';
    }

    // 外部依赖错误
    if (StreamDataFetcherErrorCategories.isExternalError(errorCode)) {
      // 基础设施失败是关键级别
      if (errorCode.includes('INFRASTRUCTURE_FAILURE') ||
          errorCode.includes('PROVIDER_WEBSOCKET_UNAVAILABLE') ||
          errorCode.includes('SSL_HANDSHAKE_FAILED')) {
        return 'critical';
      }
      return 'high';
    }

    return 'medium';
  },

  /**
   * 判断是否需要立即重连
   */
  requiresImmediateReconnection: (errorCode: string): boolean => {
    return errorCode.includes('CONNECTION_FAILED') ||
           errorCode.includes('WEBSOCKET_UNAVAILABLE') ||
           errorCode.includes('NETWORK_CONNECTION_ERROR') ||
           errorCode.includes('HEARTBEAT_TIMEOUT') ||
           errorCode.includes('SESSION_EXPIRED');
  },

  /**
   * 判断是否需要降级服务
   */
  requiresServiceDegradation: (errorCode: string): boolean => {
    return errorCode.includes('PROVIDER_WEBSOCKET_UNAVAILABLE') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE') ||
           errorCode.includes('CONNECTION_POOL_EXHAUSTED') ||
           errorCode.includes('MEMORY_PRESSURE_DETECTED') ||
           errorCode.includes('CPU_OVERLOAD');
  },

  /**
   * 判断是否需要立即告警
   */
  requiresImmediateAlert: (errorCode: string): boolean => {
    return errorCode.includes('CRITICAL') ||
           errorCode.includes('DATA_CORRUPTION') ||
           errorCode.includes('STATE_CORRUPTION') ||
           errorCode.includes('MEMORY_LEAK') ||
           errorCode.includes('INFRASTRUCTURE_FAILURE') ||
           errorCode.includes('AUTHENTICATION_FAILED');
  },

  /**
   * 判断是否需要清理资源
   */
  requiresResourceCleanup: (errorCode: string): boolean => {
    return errorCode.includes('MEMORY_PRESSURE') ||
           errorCode.includes('MEMORY_LEAK') ||
           errorCode.includes('BUFFER_OVERFLOW') ||
           errorCode.includes('CONNECTION_POOL_EXHAUSTED') ||
           errorCode.includes('THREAD_POOL_SATURATED');
  },

  /**
   * 判断是否需要状态恢复
   */
  requiresStateRecovery: (errorCode: string): boolean => {
    return errorCode.includes('STATE_CORRUPTION') ||
           errorCode.includes('CLIENT_STATE_CORRUPTION') ||
           errorCode.includes('RECOVERY_STATE_MISMATCH') ||
           errorCode.includes('CHECKPOINT_VALIDATION_FAILED');
  }
};

// 错误码说明映射（用于开发和调试）
export const STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS = {
  [STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL]: 'WebSocket URL format is invalid or malformed',
  [STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM]: 'Required symbols parameter is missing from stream request',
  [STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS]: 'WebSocket connection already exists for this client',
  [STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_NOT_FOUND]: 'WebSocket connection not found for the specified client',
  [STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION]: 'Stream data corruption detected during processing',
  [STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED]: 'System memory usage is critically high',
  [STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_TIMEOUT]: 'WebSocket connection attempt timed out',
  [STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_WEBSOCKET_UNAVAILABLE]: 'Data provider WebSocket service is unavailable',
  [STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR]: 'Network connection error during WebSocket communication',
  [STREAM_DATA_FETCHER_ERROR_CODES.SSL_HANDSHAKE_FAILED]: 'SSL handshake failed during secure WebSocket connection',
  // 可根据需要添加更多描述
} as const;