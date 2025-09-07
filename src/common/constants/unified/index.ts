/**
 * 统一常量模块导出索引
 *
 * 提供项目中所有统一常量的顶级导出接口。
 * 具体的函数和类型应该直接从相应的子模块导入。
 *
 * 基本用法：
 * ```typescript
 * // 导入顶级常量
 * import { SYSTEM_CONSTANTS, HTTP_CONSTANTS, MESSAGE_TEMPLATES } from '@common/constants/unified';
 *
 * // 导入具体函数或类型（直接从子模块导入）
 * import { isValidLogLevel } from '@common/constants/unified/system.constants';
 * import { isSuccessStatusCode } from '@common/constants/unified/http.constants';
 *
 * // 使用消息模板
 * import { QUICK_MESSAGES, MessageTemplateUtil } from '@common/constants/unified';
 * const userNotFound = QUICK_MESSAGES.USER_NOT_FOUND;
 * const customMessage = MESSAGE_TEMPLATES.NOT_FOUND("自定义资源");
 * ```
 */

// 只导出顶层常量对象
export { 
  BASE_MESSAGES, 
  BASE_STATUS_CODES, 
  BASE_TIMEOUTS, 
  BASE_LIMITS,
  StatusCodeUtils,
  ValidationUtils,
  ConstantInheritanceUtils
} from "./base.constants";
export { SYSTEM_CONSTANTS } from "./system.constants";
export { HTTP_CONSTANTS } from "./http.constants";
export { PERFORMANCE_CONSTANTS } from "./performance.constants";
export { CACHE_CONSTANTS } from "./unified-cache-config.constants";
export { OPERATION_CONSTANTS } from "./operations.constants";
export { RETRY_CONSTANTS } from "./retry.constants";
export { BATCH_CONSTANTS } from "./batch.constants";

// 消息模板系统 - 新增
export { 
  MESSAGE_TEMPLATES, 
  RESOURCE_TYPES, 
  OPERATION_TYPES,
  QUICK_MESSAGES,
  MessageTemplateUtil 
} from "./message-templates.constants";

// 统一常量集合
export { UNIFIED_CONSTANTS } from "./unified-constants-collection";

// 常量版本信息
export { CONSTANTS_VERSION } from "./constants-version";

// 常量元信息
export { CONSTANTS_META } from "./constants-meta";

// 导入用于创建便利别名
import { PERFORMANCE_CONSTANTS } from "./performance.constants";
import { RETRY_CONSTANTS } from "./retry.constants";
import { BATCH_CONSTANTS } from "./batch.constants";

// 便利导入别名
export const TIMEOUTS = PERFORMANCE_CONSTANTS.TIMEOUTS;
export const THRESHOLDS = PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS;
export const RETRY_SETTINGS = RETRY_CONSTANTS.DEFAULT_SETTINGS;
export const BATCH_SETTINGS = BATCH_CONSTANTS.DEFAULT_SETTINGS;
