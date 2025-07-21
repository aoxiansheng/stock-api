import { createHash } from "crypto";

/**
 * 通用字符串处理工具函数
 */
export class StringUtils {
  /**
   * 计算两个字符串之间的相似度分数（0到1之间）。
   * 综合了精确匹配、子串匹配和 Levenshtein 距离。
   * @param str1 第一个字符串
   * @param str2 第二个字符串
   * @returns 相似度分数
   */
  public static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1.0;

    // Substring match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0; // Both are empty strings

    return 1 - distance / maxLength;
  }

  /**
   * 计算两个字符串之间的 Levenshtein 距离（编辑距离）。
   * @param str1 第一个字符串
   * @param str2 第二个字符串
   * @returns 编辑距离
   */
  public static levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    return track[str2.length][str1.length];
  }

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
