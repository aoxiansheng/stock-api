/**
 * 统一常量模块导出索引
 *
 * 提供项目中所有统一常量的统一导出接口，
 * 便于其他模块导入和使用。
 *
 * 使用示例：
 * ```typescript
 * import { SYSTEM_CONSTANTS, HTTP_CONSTANTS } from '@common/constants/unified';
 *
 * // 使用系统常量
 * const status = SYSTEM_CONSTANTS.OPERATION_STATUS.SUCCESS;
 *
 * // 使用HTTP常量
 * const message = HTTP_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST;
 * ```
 */

// 系统级常量
export {
  SYSTEM_CONSTANTS,
  type OperationStatus,
  type LogLevel,
  type Environment,
  getAllOperationStatuses,
  isValidOperationStatus,
  getAllLogLevels,
  isValidLogLevel,
} from "./system.constants";

// HTTP相关常量
export {
  HTTP_CONSTANTS,
  type HttpStatusCode,
  type ErrorMessage,
  type SuccessMessage,
  isSuccessStatusCode,
  isClientErrorStatusCode,
  isServerErrorStatusCode,
  getErrorTypeByStatusCode,
} from "./http.constants";

// 性能相关常量
export {
  PERFORMANCE_CONSTANTS,
  type ResponseTimeThreshold,
  type TimeoutSetting,
  type BatchLimit,
  getTimeoutFromEnv,
  calculateRetryDelay,
  isSlowResponse,
  getResponseTimeLevel,
} from "./performance.constants";

// 缓存相关常量
export {
  CACHE_CONSTANTS,
  type CacheTTL,
  type CacheKeyPrefix,
  type CacheSizeLimit,
  buildCacheKey,
  parseCacheKey,
  getTTLFromEnv,
  getRecommendedTTL,
  shouldCompress,
} from "./cache.constants";

// 业务操作常量
export {
  OPERATION_CONSTANTS,
  type CrudMessage,
  type OperationType,
  type DataState,
  type PriorityLevel,
  type QualityLevel,
  type ProcessingMode,
  type NotificationType,
  getSuccessMessage,
  getFailureMessage,
  isQueryOperation,
  isMutationOperation,
  isBatchOperation,
  shouldRefreshData,
  getPriorityWeight,
} from "./operations.constants";

// 导入所有常量用于集合对象
import { SYSTEM_CONSTANTS } from "./system.constants";
import { HTTP_CONSTANTS } from "./http.constants";
import { PERFORMANCE_CONSTANTS } from "./performance.constants";
import { CACHE_CONSTANTS } from "./cache.constants";
import { OPERATION_CONSTANTS } from "./operations.constants";

/**
 * 所有统一常量的集合
 * 便于批量导入和使用
 */
export const UNIFIED_CONSTANTS = {
  SYSTEM: SYSTEM_CONSTANTS,
  HTTP: HTTP_CONSTANTS,
  PERFORMANCE: PERFORMANCE_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  OPERATIONS: OPERATION_CONSTANTS,
} as const;

/**
 * 常量版本信息，用于版本控制和兼容性检查
 */
export const CONSTANTS_VERSION = {
  MAJOR: 1,
  MINOR: 0,
  PATCH: 0,
  VERSION_STRING: "1.0.0",
  BUILD_DATE: new Date().toISOString(),
} as const;

/**
 * 常量模块元信息
 */
export const CONSTANTS_META = {
  DESCRIPTION: "项目统一常量定义",
  AUTHOR: "Smart Stock Data System Team",
  LICENSE: "MIT",
  CREATED_DATE: "2024-07-21",
  LAST_UPDATED: new Date().toISOString(),
  TOTAL_CONSTANTS: Object.keys(UNIFIED_CONSTANTS).length,
} as const;
