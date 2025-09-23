import { createHash } from "crypto";

/**
 * 通用字符串处理工具函数
 */
export class StringUtils {
  /**
   * 计算两个字符串之间的编辑距离（Levenshtein Distance）
   * @param a 第一个字符串
   * @param b 第二个字符串
   * @returns 两个字符串之间的编辑距离
   */
  public static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    // 初始化第一列
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }

    // 初始化第一行
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }

    // 填充矩阵
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // 插入
          matrix[j - 1][i] + 1, // 删除
          matrix[j - 1][i - 1] + cost // 替换
        );
      }
    }

    return matrix[b.length][a.length];
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