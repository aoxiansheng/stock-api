import { createLogger } from "@common/logging/index";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";

import { DATATRANSFORM_CONFIG } from "../../02-processing/transformer/constants/data-transformer.constants";

const logger = createLogger("ObjectUtils");

/**
 * 通用对象处理工具函数
 */
export class ObjectUtils {
  /**
   * Dangerous property names that should be blocked for security
   * Prevents prototype pollution and access to dangerous object properties
   */
  private static readonly DANGEROUS_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'valueOf'
  ]);
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
          logger.debug('ObjectUtils path traversal aborted', { path, key, reason: 'null_result' });
          return undefined;
        }

        // Security check: Block dangerous property access
        if (ObjectUtils.DANGEROUS_KEYS.has(key)) {
          throw UniversalExceptionFactory.createBusinessException({
            message: `Access to dangerous property '${key}' is blocked for security`,
            errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
            operation: 'getValueFromPath',
            component: ComponentIdentifier.SHARED,
            context: { path, dangerousKey: key, reason: 'dangerous_property_access' }
          });
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
            } else {
              const toSnakeCase = (s: string) =>
                s
                  .replace(/([A-Z])/g, "_$1")
                  .replace(/[-\s]/g, "_")
                  .toLowerCase();
              const snakeCaseKey = toSnakeCase(key);
              if (
                typeof result === "object" &&
                result !== null &&
                Object.prototype.hasOwnProperty.call(result, snakeCaseKey)
              ) {
                result = result[snakeCaseKey];
                found = true;
              }
            }
          }
        }

        if (!found) {
          if (result && typeof result === "object") {
            const keys = Object.keys(result);
            const insensitive = keys.find(
              (existing) => existing.toLowerCase() === key.toLowerCase(),
            );
            if (insensitive) {
              result = result[insensitive];
              found = true;
            }
          }
        }

        if (!found) {
          logger.debug('ObjectUtils key not found', {
            path,
            key,
            availableKeys:
              result && typeof result === 'object'
                ? Object.keys(result)
                : undefined,
          });
          return undefined; // Key not found in current level
        }
      }

      return result;
    } catch (error) {
      // Re-throw BusinessException to preserve error handling structure
      if (error.constructor.name === 'BusinessException') {
        throw error;
      }

      // Convert other errors to BusinessException
      throw UniversalExceptionFactory.createFromError(
        error as Error,
        'getValueFromPath',
        ComponentIdentifier.SHARED,
        { path, objectType: typeof obj }
      );
    }
  }
}
