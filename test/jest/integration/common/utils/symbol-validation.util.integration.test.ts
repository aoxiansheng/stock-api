/* eslint-disable @typescript-eslint/no-unused-vars */
import { SymbolValidationUtils } from "../../../../../src/common/utils/symbol-validation.util";
import { Market } from "../../../../../src/common/constants/market.constants";

describe("SymbolValidationUtils Integration", () => {
  describe("Market Recognition Integration", () => {
    it("should correctly identify Hong Kong market symbols", () => {
      const hkSymbols = [
        "700._HK", // 腾讯控股
        "00700.HK", // 带前导零的腾讯控股
        "9988.HK", // 阿里巴巴
        "09988.HK", // 带前导零的阿里巴巴
        "00001.HK", // 长和
        "1.HK", // 长和（带后缀的最短格式）
        "00700", // 纯数字格式（5位）
        "09618", // 纯数字格式（5位，前导零）
        "1234", // 纯数字格式（4位）
      ];

      hkSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidHKSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(
          Market.HK,
        );
      });
    });

    it("should correctly identify US market symbols", () => {
      const usSymbols = [
        "AAPL.US", // 苹果
        "GOOGL.US", // 谷歌
        "MSFT.US", // 微软
        "AAPL", // 纯字母格式
        "GOOGL", // 纯字母格式
        "A", // 单字母
        "ABCD", // 4字母
        "ABCDE", // 5字母
      ];

      usSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidUSSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(
          Market.US,
        );
      });
    });

    it("should correctly identify Shenzhen market symbols", () => {
      const szSymbols = [
        "000001._SZ", // 平安银行
        "000002.SZ", // 万科A
        "300001.SZ", // 特锐德（创业板）
        "000001", // 纯数字格式
        "000002", // 纯数字格式
        "300001", // 创业板纯数字格式
      ];

      szSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSZSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(
          Market.SZ,
        );
      });
    });

    it("should correctly identify Shanghai market symbols", () => {
      const shSymbols = [
        "600000._SH", // 浦发银行
        "600036.SH", // 招商银行
        "688001.SH", // 华兴源创（科创板）
        "600000", // 纯数字格式
        "600036", // 纯数字格式
        "688001", // 科创板纯数字格式
      ];

      shSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSHSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(
          Market.SH,
        );
      });
    });
  });

  describe("Symbol Format Validation Integration", () => {
    it("should validate mixed symbol formats correctly", () => {
      const mixedSymbols = [
        { symbol: "700.HK", expected: true, market: Market.HK },
        { symbol: "AAPL.US", expected: true, market: Market.US },
        { symbol: "000001.SZ", expected: true, market: Market.SZ },
        { symbol: "600000.SH", expected: true, market: Market.SH },
        { symbol: "INVALID.XX", expected: false, market: null },
        { symbol: "12345.UNKNOWN", expected: false, market: null },
        { symbol: "", expected: false, market: null },
        { symbol: "abc123", expected: false, market: null },
      ];

      mixedSymbols.forEach(({ symbol, expected, market }) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(expected);
        if (expected && market) {
          expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(
            market,
          );
        }
      });
    });

    it("should handle bulk symbol validation", () => {
      const symbols = [
        "700.HK", // 有效
        "AAPL.US", // 有效
        "000001.SZ", // 有效
        "600000.SH", // 有效
        "INVALID", // 无效
        "", // 无效
        "123.UNKNOWN", // 无效
      ];

      const result = SymbolValidationUtils.validateSymbols(symbols);

      expect(result.valid).toHaveLength(4);
      expect(result.invalid).toHaveLength(3);
      expect(result.valid).toEqual([
        "700.HK",
        "AAPL.US",
        "000001.SZ",
        "600000.SH",
      ]);
      expect(result.invalid).toEqual(["INVALID", "", "123.UNKNOWN"]);
    });

    it("should validate symbol count limits", () => {
      const symbols = Array.from(
        { length: 10 },
        (_, i) => `${String(i).padStart(5, "0")}.HK`,
      );

      expect(SymbolValidationUtils.isSymbolCountExceeded(symbols, 15)).toBe(
        false,
      );
      expect(SymbolValidationUtils.isSymbolCountExceeded(symbols, 5)).toBe(
        true,
      );
      expect(SymbolValidationUtils.isSymbolCountExceeded([], 1)).toBe(false);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null and undefined symbols", () => {
      expect(SymbolValidationUtils.isValidSymbol(null as any)).toBe(false);
      expect(SymbolValidationUtils.isValidSymbol(undefined as any)).toBe(false);
      expect(
        SymbolValidationUtils.getMarketFromSymbol(null as any),
      ).toBeUndefined(); // 应该返回undefined
      expect(
        SymbolValidationUtils.getMarketFromSymbol(undefined as any),
      ).toBeUndefined(); // 应该返回undefined
    });

    it("should handle empty and whitespace symbols", () => {
      const invalidSymbols = ["", " ", "  ", "\t", "\n"];

      invalidSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(false);
      });
    });

    it("should handle symbols with special characters", () => {
      const specialCharSymbols = [
        "700@HK",
        "AAPL#US",
        "000001$SZ",
        "TEST.Symbol",
        "123-456",
        "ABC_DEF",
      ];

      specialCharSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(false);
      });
    });

    it("should handle very long symbols", () => {
      const longSymbol = "A".repeat(100);
      expect(SymbolValidationUtils.isValidSymbol(longSymbol)).toBe(false);
    });

    it("should handle case sensitivity correctly", () => {
      const caseMixedSymbols = [
        { symbol: "700.hk", expected: true }, // 小写后缀
        { symbol: "700.Hk", expected: true }, // 混合大小写
        { symbol: "aapl.us", expected: true }, // 小写
        { symbol: "AAPL.us", expected: true }, // 混合
        { symbol: "aapl", expected: true }, // 小写字母
        { symbol: "AaPl", expected: true }, // 混合字母
      ];

      caseMixedSymbols.forEach(({ symbol, expected }) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(expected);
      });
    });
  });

  describe("Market-Specific Validation Rules", () => {
    it("should enforce Hong Kong symbol format rules", () => {
      const testCases = [
        { symbol: "1.HK", expected: true }, // 最短格式
        { symbol: "12.HK", expected: true }, // 2位数字
        { symbol: "123.HK", expected: true }, // 3位数字
        { symbol: "1234.HK", expected: true }, // 4位数字
        { symbol: "12345.HK", expected: true }, // 5位数字
        { symbol: "123456.HK", expected: false }, // 6位数字（超限）
        { symbol: "00001.HK", expected: true }, // 前导零
        { symbol: "0.HK", expected: true }, // 单个零
      ];

      testCases.forEach(({ symbol, expected }) => {
        expect(SymbolValidationUtils.isValidHKSymbol(symbol)).toBe(expected);
      });
    });

    it("should enforce US symbol format rules", () => {
      const testCases = [
        { symbol: "A.US", expected: true }, // 单字母
        { symbol: "AB.US", expected: true }, // 双字母
        { symbol: "ABC.US", expected: true }, // 三字母
        { symbol: "ABCD.US", expected: true }, // 四字母
        { symbol: "ABCDE.US", expected: true }, // 五字母
        { symbol: "ABCDEF.US", expected: false }, // 六字母（超限）
        { symbol: "A1.US", expected: false }, // 字母数字混合
        { symbol: "123.US", expected: false }, // 纯数字
      ];

      testCases.forEach(({ symbol, expected }) => {
        expect(SymbolValidationUtils.isValidUSSymbol(symbol)).toBe(expected);
      });
    });

    it("should enforce Chinese market prefix rules", () => {
      // 深圳市场前缀规则
      const szTestCases = [
        { symbol: "000001.SZ", expected: true }, // 主板
        { symbol: "000999.SZ", expected: true }, // 主板
        { symbol: "300001.SZ", expected: true }, // 创业板
        { symbol: "300999.SZ", expected: true }, // 创业板
        { symbol: "100001.SZ", expected: false }, // 无效前缀
        { symbol: "200001.SZ", expected: false }, // 无效前缀
      ];

      szTestCases.forEach(({ symbol, expected }) => {
        expect(SymbolValidationUtils.isValidSZSymbol(symbol)).toBe(expected);
      });

      // 上海市场前缀规则
      const shTestCases = [
        { symbol: "600001.SH", expected: true }, // 主板
        { symbol: "600999.SH", expected: true }, // 主板
        { symbol: "688001.SH", expected: true }, // 科创板
        { symbol: "688999.SH", expected: true }, // 科创板
        { symbol: "_500001.SH", expected: false }, // 无效前缀
        { symbol: "700001.SH", expected: false }, // 无效前缀
      ];

      shTestCases.forEach(({ symbol, expected }) => {
        expect(SymbolValidationUtils.isValidSHSymbol(symbol)).toBe(expected);
      });
    });
  });

  describe("Performance and Scale Testing", () => {
    it("should handle large batches of symbols efficiently", () => {
      // 生成大量测试符号
      const largeSymbolSet = [
        ...Array.from(
          { length: 100 },
          (_, i) => `${String(i).padStart(5, "0")}.HK`,
        ),
        ...Array.from(
          { length: 100 },
          (_, i) => `${String.fromCharCode(65 + (i % 26)).repeat(4)}.US`,
        ),
        ...Array.from(
          { length: 100 },
          (_, i) => `000${String(i).padStart(3, "0")}.SZ`,
        ),
        ...Array.from(
          { length: 100 },
          (_, i) => `600${String(i).padStart(3, "0")}.SH`,
        ),
      ];

      const startTime = Date.now();
      const result = SymbolValidationUtils.validateSymbols(largeSymbolSet);
      const endTime = Date.now();

      expect(result.valid).toHaveLength(400); // 所有符号都应该有效
      expect(result.invalid).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it("should validate individual symbols quickly", () => {
      const symbols = ["700.HK", "AAPL.US", "000001.SZ", "600000.SH"];

      symbols.forEach((symbol) => {
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          SymbolValidationUtils.isValidSymbol(symbol);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(50); // 1000次验证应该在50ms内完成
      });
    });
  });

  describe("Integration with Real Market Data Patterns", () => {
    it("should validate popular real symbols correctly", () => {
      const popularSymbols = [
        // 香港市场热门股票
        "700.HK", // 腾讯控股
        "9988.HK", // 阿里巴巴
        "3690.HK", // 美团
        "1810.HK", // 小米集团
        "9618.HK", // 京东集团

        // 美国市场热门股票
        "AAPL.US", // 苹果
        "GOOGL.US", // 谷歌A
        "MSFT.US", // 微软
        "AMZN.US", // 亚马逊
        "TSLA.US", // 特斯拉

        // 中国A股热门股票
        "000001.SZ", // 平安银行
        "000002.SZ", // 万科A
        "300059.SZ", // 东方财富
        "600519.SH", // 贵州茅台
        "600036.SH", // 招商银行
      ];

      popularSymbols.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBeDefined();
      });
    });

    it("should handle symbols from different trading sessions", () => {
      // 测试不同交易时段的符号格式
      const sessionSymbols = [
        // 香港市场
        { symbol: "700.HK", market: Market.HK },
        { symbol: "00700", market: Market.HK }, // 夜盘格式

        // 美国市场
        { symbol: "AAPL.US", market: Market.US },
        { symbol: "AAPL", market: Market.US }, // 盘前盘后格式

        // A股市场
        { symbol: "000001.SZ", market: Market.SZ },
        { symbol: "000001", market: Market.SZ }, // 简化格式
      ];

      sessionSymbols.forEach(({ symbol, market }) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(true);
        expect(SymbolValidationUtils.getMarketFromSymbol(symbol)).toBe(market);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain compatibility with legacy symbol formats", () => {
      // 测试旧版本可能使用的符号格式
      const legacyFormats = [
        "0700.HK", // 4位香港格式
        "00700.HK", // 5位香港格式
        "AAPL", // 不带后缀的美股
        "000001", // 不带后缀的A股
      ];

      legacyFormats.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(true);
      });
    });

    it("should reject clearly invalid legacy formats", () => {
      const invalidLegacyFormats = [
        "700.HKG", // 错误的香港后缀
        "AAPL.NYSE", // 错误的美股后缀
        "000001.SHA", // 错误的上海后缀
        "000001.SHE", // 错误的深圳后缀
      ];

      invalidLegacyFormats.forEach((symbol) => {
        expect(SymbolValidationUtils.isValidSymbol(symbol)).toBe(false);
      });
    });
  });
});
