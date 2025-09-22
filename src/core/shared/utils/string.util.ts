import { createHash } from "crypto";

/**
 * 通用字符串处理工具函数
 */
export class StringUtils {
  // Removed unused methods: calculateSimilarity, levenshteinDistance (duplicate implementation exists in rule-alignment.service.ts)

  /**
   * 为给定的字符串生成一个简短的 SHA-256 哈希值。
   *
   * @param str 需要哈希的字符串
   * @returns 8个字符的十六进制哈希字符串
   */
  public static generateSimpleHash(str: string): string {
    return createHash("sha256").update(str).digest("hex").substring(0, 8);
  }
}
