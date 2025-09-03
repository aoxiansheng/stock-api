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

  /**
   * 生成带时间戳的RequestId（如需要可读性）
   * 格式: {prefix}_{timestamp}_{uuid_short}
   * @param prefix 前缀（默认为'transform'）
   * @returns 带时间戳的RequestId
   */
  static generateWithTimestamp(prefix = "transform"): string {
    const timestamp = Date.now();
    const uuid = randomUUID().split("-")[0]; // 取UUID前8位
    return `${prefix}_${timestamp}_${uuid}`;
  }

  /**
   * 验证RequestId格式
   * @param requestId RequestId
   * @returns 是否有效
   */
  static isValid(requestId: string): boolean {
    if (!requestId || typeof requestId !== "string") {
      return false;
    }

    // 支持两种格式：prefix_uuid 或 prefix_timestamp_uuid_short
    return /^\w+_[\w-]+$/.test(requestId);
  }
}
