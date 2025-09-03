/**
 * 常量版本信息
 * 用于版本控制和兼容性检查
 */

import { deepFreeze } from "@common/utils/object-immutability.util";

/**
 * 常量版本信息，用于版本控制和兼容性检查
 */
export const CONSTANTS_VERSION = deepFreeze({
  MAJOR: 1,
  MINOR: 0,
  PATCH: 0,
  VERSION_STRING: "1.0.0",
  BUILD_DATE: new Date().toISOString(),
});
