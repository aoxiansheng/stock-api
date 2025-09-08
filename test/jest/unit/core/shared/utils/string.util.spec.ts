import { REFERENCE_DATA } from '@common/constants/domain';
/**
 * StringUtils 测试套件
 * 测试字符串工具类的所有功能：相似度计算、Levenshtein距离、哈希生成
 */

import { StringUtils } from "../../../../../../src/core/shared/utils/string.util";
import { TestUtils } from "../../../../shared/test-utils";

describe("StringUtils", () => {
  describe("calculateSimilarity", () => {
    describe("基础功能测试", () => {
      it("should return 1 for identical strings", () => {
        expect(StringUtils.calculateSimilarity("test", "test")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("", "")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("HELLO", "hello")).toBe(1.0); // 大小写不敏感
      });

      it("should return 0 for null or undefined inputs", () => {
        expect(StringUtils.calculateSimilarity("", null as any)).toBe(0);
        expect(StringUtils.calculateSimilarity(null as any, "test")).toBe(0);
        expect(StringUtils.calculateSimilarity(undefined as any, "test")).toBe(
          0,
        );
        expect(StringUtils.calculateSimilarity("test", undefined as any)).toBe(
          0,
        );
      });

      it("should return 0.8 for substring matches", () => {
        expect(StringUtils.calculateSimilarity("hello", "hell")).toBe(0.8);
        expect(StringUtils.calculateSimilarity("test", "testing")).toBe(0.8);
        expect(StringUtils.calculateSimilarity("abc", "abcdef")).toBe(0.8);
      });

      it("should be case-insensitive by default", () => {
        expect(StringUtils.calculateSimilarity("Hello", "HELLO")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("Test", "test")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("ABC", "abc")).toBe(1.0);
      });
    });

    describe("Levenshtein距离测试", () => {
      it("should calculate similarity based on edit distance for non-substring matches", () => {
        // 单个字符差异
        const similarity1 = StringUtils.calculateSimilarity("cat", "bat");
        expect(similarity1).toBeCloseTo(0.667, 3); // 1 - (1/3)

        // 多个字符差异
        const similarity2 = StringUtils.calculateSimilarity("hello", "world");
        expect(similarity2).toBeGreaterThan(0);
        expect(similarity2).toBeLessThan(0.8); // 不是子串匹配
      });

      it("should handle completely different strings", () => {
        const similarity = StringUtils.calculateSimilarity("abc", "xyz");
        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThan(0.5);
      });
    });

    describe("边界条件测试", () => {
      it("should handle empty strings correctly", () => {
        expect(StringUtils.calculateSimilarity("", "")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("test", "")).toBe(0);
        expect(StringUtils.calculateSimilarity("", "test")).toBe(0);
      });

      it("should handle single character strings", () => {
        expect(StringUtils.calculateSimilarity("a", "a")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("a", "b")).toBe(0);
      });

      it("should handle unicode characters", () => {
        expect(StringUtils.calculateSimilarity("测试", "测试")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("测试", "测")).toBe(0.8);
        expect(StringUtils.calculateSimilarity("🚀", "🚀")).toBe(1.0);
      });

      it("should handle very long strings", () => {
        const longStr1 = "a".repeat(1000);
        const longStr2 = "a".repeat(999) + "b";

        const similarity = StringUtils.calculateSimilarity(longStr1, longStr2);
        expect(similarity).toBeCloseTo(0.999, 3);
      });
    });

    describe("性能测试", () => {
      it("should process moderate length strings within acceptable time", async () => {
        const str1 = TestUtils.generateRandomString(100);
        const str2 = TestUtils.generateRandomString(100);

        const benchmark = TestUtils.createPerformanceBenchmark(
          "calculateSimilarity-100chars",
          (global as any).testConfig.PERFORMANCE_THRESHOLDS.STRING_SIMILARITY,
        );

        const result = await benchmark.run(async () => {
          return StringUtils.calculateSimilarity(str1, str2);
        });

        expect(result.passed).toBe(true);
        expect(result.result).toBeGreaterThanOrEqual(0);
        expect(result.result).toBeLessThanOrEqual(1);
      });

      it("should handle large strings efficiently", async () => {
        const str1 = TestUtils.generateRandomString(1000);
        const str2 = TestUtils.generateRandomString(1000);

        const { result, duration } = await TestUtils.measureExecutionTime(
          async () => {
            return StringUtils.calculateSimilarity(str1, str2);
          },
        );

        // 对于1000字符的字符串，应该在合理时间内完成
        expect(duration).toBeLessThan(150); // 150ms - more realistic for complex algorithm
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      });
    });

    describe("实际使用场景测试", () => {
      it("should work correctly for stock symbols", () => {
        expect(StringUtils.calculateSimilarity(REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "700.hk")).toBe(1.0);
        expect(StringUtils.calculateSimilarity("AAPL.US", "AAPL")).toBe(0.8);
        expect(StringUtils.calculateSimilarity("000001.SZ", "000001")).toBe(
          0.8,
        );
      });

      it("should work correctly for company names", () => {
        expect(
          StringUtils.calculateSimilarity("Apple Inc", "Apple Inc."),
        ).toBeGreaterThan(0.8);
        expect(
          StringUtils.calculateSimilarity(
            "Microsoft Corp",
            "Microsoft Corporation",
          ),
        ).toBeGreaterThan(0.5);
      });
    });
  });

  describe("levenshteinDistance", () => {
    describe("基础功能测试", () => {
      it("should return 0 for identical strings", () => {
        expect(StringUtils.levenshteinDistance("test", "test")).toBe(0);
        expect(StringUtils.levenshteinDistance("", "")).toBe(0);
      });

      it("should calculate correct distance for simple cases", () => {
        expect(StringUtils.levenshteinDistance("cat", "bat")).toBe(1); // 替换
        expect(StringUtils.levenshteinDistance("cat", "cats")).toBe(1); // 插入
        expect(StringUtils.levenshteinDistance("cats", "cat")).toBe(1); // 删除
      });

      it("should handle empty strings", () => {
        expect(StringUtils.levenshteinDistance("", "abc")).toBe(3);
        expect(StringUtils.levenshteinDistance("abc", "")).toBe(3);
      });
    });

    describe("复杂场景测试", () => {
      it("should calculate distance for completely different strings", () => {
        const distance = StringUtils.levenshteinDistance("hello", "world");
        expect(distance).toBe(4); // h->w, e->o, l->r, l->l, o->d 需要4次操作
      });

      it("should handle multiple operations", () => {
        const distance = StringUtils.levenshteinDistance("kitten", "sitting");
        expect(distance).toBe(3); // k->s, e->i, 插入g
      });
    });

    describe("边界条件测试", () => {
      it("should handle single character strings", () => {
        expect(StringUtils.levenshteinDistance("a", "b")).toBe(1);
        expect(StringUtils.levenshteinDistance("a", "a")).toBe(0);
      });

      it("should handle unicode characters", () => {
        expect(StringUtils.levenshteinDistance("测试", "测验")).toBe(1);
        expect(StringUtils.levenshteinDistance("🚀", "🛸")).toBe(1);
      });
    });

    describe("性能测试", () => {
      it("should process strings efficiently", async () => {
        const str1 = TestUtils.generateRandomString(50);
        const str2 = TestUtils.generateRandomString(50);

        const { result, duration } = await TestUtils.measureExecutionTime(
          async () => {
            return StringUtils.levenshteinDistance(str1, str2);
          },
        );

        expect(duration).toBeLessThan(20); // 20ms for 50-char strings
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(Math.max(str1.length, str2.length));
      });
    });
  });

  describe("generateSimpleHash", () => {
    describe("基础功能测试", () => {
      it("should generate consistent hash for same input", () => {
        const input = "test string";
        const hash1 = StringUtils.generateSimpleHash(input);
        const hash2 = StringUtils.generateSimpleHash(input);

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(8); // 8个字符的哈希
      });

      it("should generate different hash for different input", () => {
        const hash1 = StringUtils.generateSimpleHash("test1");
        const hash2 = StringUtils.generateSimpleHash("test2");

        expect(hash1).not.toBe(hash2);
        expect(hash1).toHaveLength(8);
        expect(hash2).toHaveLength(8);
      });

      it("should generate valid hexadecimal hash", () => {
        const hash = StringUtils.generateSimpleHash("test");

        expect(hash).toMatch(/^[0-9a-f]{8}$/); // 8位16进制
        expect(hash).toHaveLength(8);
      });
    });

    describe("边界条件测试", () => {
      it("should handle empty string", () => {
        const hash = StringUtils.generateSimpleHash("");

        expect(hash).toHaveLength(8);
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });

      it("should handle unicode characters", () => {
        const hash1 = StringUtils.generateSimpleHash("测试中文");
        const hash2 = StringUtils.generateSimpleHash("🚀🛸🌟");

        expect(hash1).toHaveLength(8);
        expect(hash2).toHaveLength(8);
        expect(hash1).not.toBe(hash2);
      });

      it("should handle very long strings", () => {
        const longString = "a".repeat(10000);
        const hash = StringUtils.generateSimpleHash(longString);

        expect(hash).toHaveLength(8);
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });
    });

    describe("哈希分布测试", () => {
      it("should generate well-distributed hashes", () => {
        const hashes = new Set<string>();
        const testCases = 1000;

        // 生成1000个不同输入的哈希
        for (let i = 0; i < testCases; i++) {
          const input = `test_${i}_${TestUtils.generateRandomString(10)}`;
          const hash = StringUtils.generateSimpleHash(input);
          hashes.add(hash);
        }

        // 检查哈希冲突率（应该很低）
        const uniqueHashes = hashes.size;
        const collisionRate = 1 - uniqueHashes / testCases;

        expect(collisionRate).toBeLessThan(0.01); // 冲突率小于1%
        expect(uniqueHashes).toBeGreaterThan(testCases * 0.99); // 至少99%唯一
      });
    });

    describe("性能测试", () => {
      it("should generate hash within acceptable time", async () => {
        const input = TestUtils.generateRandomString(100);

        const benchmark = TestUtils.createPerformanceBenchmark(
          "generateSimpleHash",
          (global as any).testConfig.PERFORMANCE_THRESHOLDS.STRING_HASH,
        );

        const result = await benchmark.run(async () => {
          return StringUtils.generateSimpleHash(input);
        });

        expect(result.passed).toBe(true);
        expect(result.result).toHaveLength(8);
      });

      it("should handle batch hash generation efficiently", async () => {
        const inputs = Array.from({ length: 100 }, (_, i) => `test_${i}`);

        const { result, duration } = await TestUtils.measureExecutionTime(
          async () => {
            return inputs.map((input) => StringUtils.generateSimpleHash(input));
          },
        );

        expect(duration).toBeLessThan(50); // 100个哈希在50ms内
        expect(result).toHaveLength(100);
        expect(new Set(result).size).toBe(100); // 全部唯一
      });
    });

    describe("实际使用场景测试", () => {
      it("should work for caching keys", () => {
        const data1 = { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, price: 350.5 };
        const data2 = { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, price: 351.0 };

        const key1 = StringUtils.generateSimpleHash(JSON.stringify(data1));
        const key2 = StringUtils.generateSimpleHash(JSON.stringify(data2));

        expect(key1).not.toBe(key2);
        expect(key1).toHaveLength(8);
        expect(key2).toHaveLength(8);
      });

      it("should work for data fingerprinting", () => {
        const largeData = TestUtils.generateLargeObject(3, 10);
        const fingerprint = StringUtils.generateSimpleHash(
          JSON.stringify(largeData),
        );

        expect(fingerprint).toHaveLength(8);
        expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);

        // 相同数据应该生成相同指纹
        const fingerprint2 = StringUtils.generateSimpleHash(
          JSON.stringify(largeData),
        );
        expect(fingerprint).toBe(fingerprint2);
      });
    });
  });

  describe("综合集成测试", () => {
    it("should work together for fuzzy matching with hashing", () => {
      const targets = ["Apple Inc", "Microsoft Corp", "Google LLC"];
      const query = "apple";

      // 使用相似度找到最匹配的目标
      const matches = targets.map((target) => ({
        target,
        similarity: StringUtils.calculateSimilarity(query, target),
        hash: StringUtils.generateSimpleHash(target),
      }));

      const bestMatch = matches.reduce((best, current) =>
        current.similarity > best.similarity ? current : best,
      );

      expect(bestMatch.target).toBe("Apple Inc");
      expect(bestMatch.similarity).toBeGreaterThan(0.3);
      expect(bestMatch.hash).toHaveLength(8);
    });

    it("should handle stress test with various string operations", async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        str1: TestUtils.generateRandomString(20),
        str2: TestUtils.generateRandomString(20),
      }));

      const { result, duration } = await TestUtils.measureExecutionTime(
        async () => {
          return testData.map(({ str1, str2 }) => ({
            similarity: StringUtils.calculateSimilarity(str1, str2),
            distance: StringUtils.levenshteinDistance(str1, str2),
            hash1: StringUtils.generateSimpleHash(str1),
            hash2: StringUtils.generateSimpleHash(str2),
          }));
        },
      );

      expect(duration).toBeLessThan(100); // 100个操作在100ms内
      expect(result).toHaveLength(100);

      // 验证结果正确性
      result.forEach((item) => {
        expect(item.similarity).toBeGreaterThanOrEqual(0);
        expect(item.similarity).toBeLessThanOrEqual(1);
        expect(item.distance).toBeGreaterThanOrEqual(0);
        expect(item.hash1).toHaveLength(8);
        expect(item.hash2).toHaveLength(8);
      });
    });
  });
});
