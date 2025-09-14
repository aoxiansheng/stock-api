import { createLogger } from "@common/logging";

import { DATATRANSFORM_CONFIG } from "../../02-processing/transformer/constants/data-transformer.constants";

const logger = createLogger("ObjectUtils");

/**
 * 通用对象处理工具函数
 */
export class ObjectUtils {
  /**
   * 根据字符串路径从嵌套对象中安全地获取值。
   * 支持点（.）和方括号（[]）表示法。
   * @param obj 要从中取值的对象
   * @param path 字符串路径，例如 'a.b[0].c'
   * @returns 路径对应的值，如果找不到则返回 undefined
   */
  public static getValueFromPath(obj: any, path: string): any {
    if (obj === null || obj === undefined || !path) return undefined;

    // Type check for path
    if (typeof path !== "string") return undefined;

    try {
      const keys = path.split(/[.\[\]]/).filter((key) => key !== "");

      if (keys.length > DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH) {
        logger.warn(
          `路径深度 ${keys.length} 超过最大限制 ${DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH}: ${path}`,
        );
        return undefined;
      }

      let result: any = obj;

      for (const key of keys) {
        if (result === null || result === undefined) {
          return undefined;
        }

        let found = false;
        // Case 1: Current result is an array and key is a numeric index
        if (Array.isArray(result) && /^\d+$/.test(key)) {
          const index = parseInt(key, 10);
          if (index >= 0 && index < result.length) {
            result = result[index];
            found = true;
          } else {
            result = undefined; // Index out of bounds
            found = true; // Mark as found to prevent further checks for this key
          }
        }

        // Case 2: Current result is an object (or not an array) and key is a property name
        if (!found) {
          // Try exact match
          if (
            typeof result === "object" &&
            result !== null &&
            Object.prototype.hasOwnProperty.call(result, key)
          ) {
            result = result[key];
            found = true;
          } else {
            // Try camelCase match
            const toCamelCase = (s: string) =>
              s.replace(/([-_][a-z])/gi, ($1) =>
                $1.toUpperCase().replace("-", "").replace("_", ""),
              );
            const camelCaseKey = toCamelCase(key);
            if (
              typeof result === "object" &&
              result !== null &&
              Object.prototype.hasOwnProperty.call(result, camelCaseKey)
            ) {
              result = result[camelCaseKey];
              found = true;
            }
          }
        }

        if (!found) {
          return undefined; // Key not found in current level
        }
      }

      return result;
    } catch (error) {
      logger.error(`从路径解析值时出错: ${path}`, {
        error: error.message,
        stack: error.stack,
      });
      return undefined; // 在解析失败时静默返回 undefined
    }
  }
}
