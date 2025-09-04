/**
 * Receiver常量模块统一导出索引
 * 
 * 重构后的模块化组织结构，按功能分离不同类型的常量
 * 提供接收器组件所有常量的顶级导出接口，优化重构后的导入体验
 */

// 导出分类常量模块
export * from './messages.constants';
export * from './validation.constants';
export * from './config.constants';
export * from './operations.constants';

// 便利访问别名（向后兼容）
export {
  RECEIVER_ERROR_MESSAGES as ERRORS,
  RECEIVER_WARNING_MESSAGES as WARNINGS,
  RECEIVER_SUCCESS_MESSAGES as SUCCESS,
} from './messages.constants';

export {
  RECEIVER_VALIDATION_RULES as VALIDATION,
  RECEIVER_PERFORMANCE_THRESHOLDS as PERFORMANCE,
  MARKET_RECOGNITION_RULES as MARKETS,
  REQUEST_OPTIONS_PREFERRED_PROVIDER_MAX_LENGTH,
  REQUEST_OPTIONS_FIELDS_MAX_ITEMS,
  REQUEST_OPTIONS_MARKET_MAX_LENGTH,
  REQUEST_OPTIONS_MARKET_PATTERN,
} from './validation.constants';

export {
  RECEIVER_CONFIG as CONFIG,
  RECEIVER_RETRY_CONFIG as RETRY,
  RECEIVER_CACHE_CONFIG as CACHE,
  RECEIVER_DEFAULTS as DEFAULTS,
  RECEIVER_HEALTH_CONFIG as HEALTH,
} from './config.constants';

export {
  SUPPORTED_CAPABILITY_TYPES as CAPABILITIES,
  RECEIVER_OPERATIONS as OPERATIONS,
  RECEIVER_STATUS as STATUS,
  RECEIVER_EVENTS as EVENTS,
  RECEIVER_METRICS as METRICS,
} from './operations.constants';