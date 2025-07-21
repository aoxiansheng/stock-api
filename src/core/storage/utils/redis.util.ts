/**
 * Redis 相关通用工具函数
 */
export class RedisUtils {
  /**
   * 从 Redis INFO 命令返回的字符串中安全地提取指定键的值。
   * @param info INFO 命令返回的完整字符串
   * @param key 要提取的键，例如 'used_memory'
   * @returns 提取到的值（字符串格式），如果找不到则返回 null
   */
  public static extractValueFromInfo(info: string, key: string): string | null {
    if (!info || !key) {
      return null;
    }
    const regex = new RegExp(`^${key}:(.*)$`, "m");
    const match = info.match(regex);
    return match ? match[1].trim() : null;
  }
} 