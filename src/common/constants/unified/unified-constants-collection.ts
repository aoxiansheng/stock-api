/**
 * 统一常量集合
 * 提供对所有常量模块的集中访问
 */

import { deepFreeze } from "../../utils/object-immutability.util";
import { SYSTEM_CONSTANTS } from "./system.constants";
import { HTTP_CONSTANTS } from "./http.constants";
import { PERFORMANCE_CONSTANTS } from "./performance.constants";
import { CACHE_CONSTANTS } from "./unified-cache-config.constants";
import { OPERATION_CONSTANTS } from "./operations.constants";
import { 
  MESSAGE_TEMPLATES, 
  RESOURCE_TYPES, 
  OPERATION_TYPES as MSG_OPERATION_TYPES,
  QUICK_MESSAGES,
  MessageTemplateUtil 
} from "./message-templates.constants";

/**
 * 所有统一常量的集合
 * 便于批量导入和使用
 * 
 * 使用示例:
 * ```typescript
 * import { UNIFIED_CONSTANTS } from '@common/constants/unified';
 * 
 * // 使用HTTP常量
 * const statusCode = UNIFIED_CONSTANTS.HTTP.STATUS_CODES.OK;
 * 
 * // 使用消息模板
 * const notFoundMsg = UNIFIED_CONSTANTS.MESSAGES.TEMPLATES.NOT_FOUND("用户");
 * const quickMsg = UNIFIED_CONSTANTS.MESSAGES.QUICK.USER_NOT_FOUND;
 * ```
 */
export const UNIFIED_CONSTANTS = deepFreeze({
  SYSTEM: SYSTEM_CONSTANTS,
  HTTP: HTTP_CONSTANTS,
  PERFORMANCE: PERFORMANCE_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  OPERATIONS: OPERATION_CONSTANTS,
  
  // 消息模板系统
  MESSAGES: {
    TEMPLATES: MESSAGE_TEMPLATES,
    RESOURCE_TYPES: RESOURCE_TYPES,
    OPERATION_TYPES: MSG_OPERATION_TYPES,
    QUICK: QUICK_MESSAGES,
    UTIL: MessageTemplateUtil,
  },
});

/**
 * 统一常量类型定义
 */
export type UnifiedConstants = typeof UNIFIED_CONSTANTS;
