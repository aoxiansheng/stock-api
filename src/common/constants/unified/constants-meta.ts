/**
 * 常量模块元信息
 * 提供关于常量定义的元数据
 */

import { deepFreeze } from "@common/utils/object-immutability.util";
import { UNIFIED_CONSTANTS } from "./unified-constants-collection";

/**
 * 常量模块元信息
 */
export const CONSTANTS_META = deepFreeze({
  DESCRIPTION: "项目统一常量定义",
  AUTHOR: "Smart Stock Data System Team",
  LICENSE: "MIT",
  CREATED_DATE: "2024-07-21",
  LAST_UPDATED: new Date().toISOString(),
  TOTAL_CONSTANTS: Object.keys(UNIFIED_CONSTANTS).length,
});
