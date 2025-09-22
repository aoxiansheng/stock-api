import { randomUUID } from "crypto";

/**
 * RequestId 生成工具类
 * 使用UUID确保全局唯一性，简化实现并提高性能
 */
export class RequestIdUtils {
  /**
   * 生成唯一的RequestId
   * 格式: {prefix}_{uuid}
   * @param prefix 前缀（默认为'transform'）
   * @returns 唯一RequestId
   */
  static generate(prefix = "transform"): string {
    // UUID保证全局唯一，无需复杂逻辑
    return `${prefix}_${randomUUID()}`;
  }


}
