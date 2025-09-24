/**
 * Stream Cache组件错误码常量定义
 *
 * 错误码格式：STREAM_CACHE_{CATEGORY}_{SEQUENCE}
 * - VALIDATION: 验证类错误 (001-299)
 * - BUSINESS: 业务逻辑错误 (300-599)
 * - SYSTEM: 系统资源错误 (600-899)
 * - EXTERNAL: 外部依赖错误 (900-999)
 */

export const STREAM_CACHE_ERROR_CODES = {
  // ==================== 验证类错误 (001-299) ====================
  
  // 参数验证 (001-099)
  INVALID_CACHE_KEY: 'STREAM_CACHE_VALIDATION_001',
  MISSING_REQUIRED_PARAMS: 'STREAM_CACHE_VALIDATION_002',
  INVALID_DATA_FORMAT: 'STREAM_CACHE_VALIDATION_003',
  INVALID_TIMESTAMP: 'STREAM_CACHE_VALIDATION_004',
  INVALID_PRIORITY_TYPE: 'STREAM_CACHE_VALIDATION_005',
  
  // 配置验证 (100-199)
  INVALID_CACHE_CONFIG: 'STREAM_CACHE_VALIDATION_100',
  INVALID_TTL_VALUE: 'STREAM_CACHE_VALIDATION_101',
  INVALID_CAPACITY_CONFIG: 'STREAM_CACHE_VALIDATION_102',
  
  // ==================== 业务逻辑错误 (300-599) ====================
  
  // 缓存操作 (300-399)
  CACHE_ENTRY_NOT_FOUND: 'STREAM_CACHE_BUSINESS_300',
  CACHE_ENTRY_EXPIRED: 'STREAM_CACHE_BUSINESS_301',
  CACHE_DATA_CORRUPTED: 'STREAM_CACHE_BUSINESS_302',
  CACHE_OPERATION_FAILED: 'STREAM_CACHE_BUSINESS_303',
  
  // 数据处理 (400-499)
  DATA_SERIALIZATION_FAILED: 'STREAM_CACHE_BUSINESS_400',
  DATA_DESERIALIZATION_FAILED: 'STREAM_CACHE_BUSINESS_401',
  DATA_COMPRESSION_FAILED: 'STREAM_CACHE_BUSINESS_402',
  DATA_DECOMPRESSION_FAILED: 'STREAM_CACHE_BUSINESS_403',
  
  // ==================== 系统资源错误 (600-899) ====================
  
  // 内存和性能 (600-699)
  MEMORY_LIMIT_EXCEEDED: 'STREAM_CACHE_SYSTEM_600',
  HOT_CACHE_FULL: 'STREAM_CACHE_SYSTEM_601',
  CACHE_CLEANUP_FAILED: 'STREAM_CACHE_SYSTEM_602',
  
  // 超时和限制 (700-799)
  OPERATION_TIMEOUT: 'STREAM_CACHE_SYSTEM_700',
  RATE_LIMIT_EXCEEDED: 'STREAM_CACHE_SYSTEM_701',
  BATCH_SIZE_EXCEEDED: 'STREAM_CACHE_SYSTEM_702',
  
  // ==================== 外部依赖错误 (900-999) ====================
  
  // Redis错误 (900-949)
  REDIS_CONNECTION_FAILED: 'STREAM_CACHE_EXTERNAL_900',
  REDIS_OPERATION_FAILED: 'STREAM_CACHE_EXTERNAL_901',
  REDIS_TIMEOUT: 'STREAM_CACHE_EXTERNAL_902',
  
  // 其他外部依赖 (950-999)
  EXTERNAL_SERVICE_UNAVAILABLE: 'STREAM_CACHE_EXTERNAL_950',
  EXTERNAL_DEPENDENCY_ERROR: 'STREAM_CACHE_EXTERNAL_951',
} as const;

// 错误码类型定义
export type StreamCacheErrorCode = typeof STREAM_CACHE_ERROR_CODES[keyof typeof STREAM_CACHE_ERROR_CODES];

/**
 * Stream Cache 错误分类工具类
 *
 * 📋 架构用途：
 * - 提供统一的错误分类接口，与项目中其他 12 个模块保持一致
 * - 支持错误重试决策逻辑（根据错误类型判断是否可重试）
 * - 为监控系统和告警规则提供错误分类基础
 * - 支持错误统计和分析（按类型聚合错误数据）
 *
 * 🔧 预期集成场景：
 * - 全局异常处理器根据错误类型选择处理策略
 * - 监控系统按错误严重程度分类告警
 * - 重试机制根据 isRetryable() 决定是否重试
 * - 错误日志系统按类型进行结构化记录
 *
 * 💡 使用示例：
 * ```typescript
 * if (StreamCacheErrorCategories.isRetryable(errorCode)) {
 *   await retryOperation();
 * }
 * if (StreamCacheErrorCategories.isExternalError(errorCode)) {
 *   await notifyExternalServiceTeam();
 * }
 * ```
 */
export const StreamCacheErrorCategories = {
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
      return true;
    }

    // 系统资源错误中的超时可重试
    if (errorCode.includes('TIMEOUT') || 
        errorCode.includes('RATE_LIMIT_EXCEEDED')) {
      return true;
    }

    // 其他错误不可重试
    return false;
  }
};

/**
 * Stream Cache 错误码描述映射表
 *
 * 📋 架构用途：
 * - 为每个错误码提供人类可读的描述信息
 * - 保持与项目中其他模块的统一错误描述模式
 * - 支持国际化和本地化的错误消息显示
 * - 为开发工具、调试器、监控面板提供友好的错误说明
 *
 * 🔧 预期集成场景：
 * - API 响应中的错误描述字段自动填充
 * - 开发者工具和调试面板显示详细错误信息
 * - 错误日志系统生成结构化的错误报告
 * - 监控告警消息中包含可读的错误描述
 * - 客户端错误处理展示用户友好的提示信息
 *
 * 💡 使用示例：
 * ```typescript
 * const errorMessage = STREAM_CACHE_ERROR_DESCRIPTIONS[errorCode] || 'Unknown error';
 * logger.error(`Stream cache operation failed: ${errorMessage}`, { errorCode });
 *
 * // API 响应
 * return {
 *   success: false,
 *   errorCode,
 *   message: STREAM_CACHE_ERROR_DESCRIPTIONS[errorCode]
 * };
 * ```
 *
 * 🌐 扩展说明：
 * - 当前为英文描述，未来可扩展为多语言支持
 * - 描述信息应简洁明了，便于开发者快速定位问题
 * - 可根据业务需求添加更多错误码的描述映射
 */
export const STREAM_CACHE_ERROR_DESCRIPTIONS = {
  [STREAM_CACHE_ERROR_CODES.INVALID_CACHE_KEY]: 'Cache key format is invalid',
  [STREAM_CACHE_ERROR_CODES.MISSING_REQUIRED_PARAMS]: 'Required parameters are missing',
  [STREAM_CACHE_ERROR_CODES.CACHE_ENTRY_NOT_FOUND]: 'Cache entry was not found',
  [STREAM_CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED]: 'Failed to connect to Redis server',
  [STREAM_CACHE_ERROR_CODES.OPERATION_TIMEOUT]: 'Cache operation timed out',
  // 可根据需要添加更多描述
} as const; 