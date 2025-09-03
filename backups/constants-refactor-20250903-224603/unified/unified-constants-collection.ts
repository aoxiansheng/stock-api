/**
 * 统一常量集合
 * 提供对所有常量模块的集中访问
 */

import { deepFreeze } from "@common/utils/object-immutability.util";
import { SYSTEM_CONSTANTS } from "./system.constants";
import { HTTP_CONSTANTS } from "./http.constants";
import { PERFORMANCE_CONSTANTS } from "./performance.constants";
import { CACHE_CONSTANTS } from "./unified-cache-config.constants";
import { OPERATION_CONSTANTS } from "./operations.constants";

/**
 * 所有统一常量的集合
 * 便于批量导入和使用
 */
export const UNIFIED_CONSTANTS = deepFreeze({
  SYSTEM: SYSTEM_CONSTANTS,
  HTTP: HTTP_CONSTANTS,
  PERFORMANCE: PERFORMANCE_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  OPERATIONS: OPERATION_CONSTANTS,
});
