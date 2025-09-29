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
    // 增加对null值的处理，确保健壮性
    const safePrefix = prefix === null ? "transform" : prefix;
    
    // UUID保证全局唯一，无需复杂逻辑
    return `${safePrefix}_${randomUUID()}`;
  }


}
