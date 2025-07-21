import { createLogger } from "@common/config/logger.config";

import { TRANSFORM_CONFIG } from "../../transformer/constants/transformer.constants";

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
    if (!obj || !path) return undefined;

    try {
      const keys = path.split(/[.\\[\\]]/).filter((key) => key !== "");

      if (keys.length > TRANSFORM_CONFIG.MAX_NESTED_DEPTH) {
        logger.warn(
          `路径深度 ${keys.length} 超过最大限制 ${TRANSFORM_CONFIG.MAX_NESTED_DEPTH}: ${path}`,
        );
        return undefined;
      }

      let result = obj;

      for (const key of keys) {
        if (result === null || result === undefined) {
          return undefined;
        }

        if (/^\\d+$/.test(key)) {
          const index = parseInt(key, 10);
          result = Array.isArray(result) ? result[index] : undefined;
        } else {
          // 尝试精确匹配
          if (result[key] !== undefined) {
            result = result[key];
          } else {
            // 尝试驼峰式匹配以兼容不同数据源
            const toCamelCase = (s: string) =>
              s.replace(/([-_][a-z])/gi, ($1) =>
                $1.toUpperCase().replace("-", "").replace("_", ""),
              );
            const camelCaseKey = toCamelCase(key);
            result =
              result[camelCaseKey] !== undefined
                ? result[camelCaseKey]
                : result[key]; // 如果驼峰式也找不到，则返回原始键的undefined值
          }
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
