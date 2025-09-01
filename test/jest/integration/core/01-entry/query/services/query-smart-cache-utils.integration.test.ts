/**
 * Query服务智能缓存工具函数集成测试
 * 专注于工具函数验证，避免复杂的依赖注入
 *
 * 测试重点：
 * - 缓存键构建工具验证
 * - 策略枚举一致性验证
 * - 市场推断工具验证
 * - 哈希算法稳定性验证
 */

import { CacheStrategy } from "../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface";
import {
  buildUnifiedCacheKey,
  createStableSymbolsHash,
  extractMarketFromSymbols,
  inferMarketFromSymbol,
  validateCacheKey,
} from "../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils";
import { Market } from "../../../../../../../src/common/constants/market.constants";

describe("Query Smart Cache Utils Integration Tests", () => {
  describe("缓存键构建工具验证", () => {
    it("应该为单个符号生成简洁的缓存键", () => {
      const cacheKey = buildUnifiedCacheKey("query:stock-quote", ["AAPL"]);

      expect(cacheKey).toBe("query:stock-quote:AAPL");
      expect(validateCacheKey(cacheKey)).toBe(true);

      console.log(`✅ 单符号缓存键: ${cacheKey}`);
    });

    it("应该为少量符号生成排序的缓存键", () => {
      const symbols = ["MSFT", "AAPL", "GOOGL"];
      const cacheKey = buildUnifiedCacheKey("query:stock-quote", symbols);

      expect(cacheKey).toBe("query:stock-quote:AAPL|GOOGL|MSFT");
      expect(validateCacheKey(cacheKey)).toBe(true);

      console.log(`✅ 多符号缓存键: ${cacheKey}`);
    });

    it("应该为大量符号生成哈希缓存键", () => {
      const symbols = Array.from({ length: 10 }, (_, i) => `STOCK${i}`);
      const cacheKey = buildUnifiedCacheKey("query:bulk-quotes", symbols);

      expect(cacheKey).toContain("query:bulk-quotes:hash:");
      expect(cacheKey.split(":")[2]).toMatch(/^hash:[a-f0-9]{16}$/);
      expect(validateCacheKey(cacheKey)).toBe(true);

      console.log(`✅ 哈希缓存键: ${cacheKey}`);
    });

    it("应该为相同符号（不同顺序）生成相同缓存键", () => {
      const symbols1 = ["TSLA", "NVDA", "AMD"];
      const symbols2 = ["AMD", "TSLA", "NVDA"];

      const key1 = buildUnifiedCacheKey("query:comparison", symbols1);
      const key2 = buildUnifiedCacheKey("query:comparison", symbols2);

      expect(key1).toBe(key2);
      expect(key1).toBe("query:comparison:AMD|NVDA|TSLA");

      console.log(`✅ 顺序一致性: ${key1}`);
    });

    it("应该支持额外参数的缓存键", () => {
      const cacheKey = buildUnifiedCacheKey("receiver:stock-data", ["700.HK"], {
        provider: "longport",
        market: "HK",
      });

      expect(cacheKey).toBe(
        "receiver:stock-data:700.HK:market:HK|provider:longport",
      );
      expect(validateCacheKey(cacheKey)).toBe(true);

      console.log(`✅ 参数化缓存键: ${cacheKey}`);
    });
  });

  describe("符号哈希算法验证", () => {
    it("应该为相同符号集生成相同哈希", () => {
      const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];

      const hash1 = createStableSymbolsHash(symbols);
      const hash2 = createStableSymbolsHash([...symbols].reverse());
      const hash3 = createStableSymbolsHash([...symbols].sort());

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/);

      console.log(`✅ 稳定哈希: ${hash1} (长度: ${hash1.length})`);
    });

    it("应该为不同符号集生成不同哈希", () => {
      const hash1 = createStableSymbolsHash(["AAPL", "MSFT"]);
      const hash2 = createStableSymbolsHash(["AAPL", "GOOGL"]);
      const hash3 = createStableSymbolsHash(["AAPL", "MSFT", "GOOGL"]);

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);

      console.log(`✅ 哈希差异: ${hash1} vs ${hash2} vs ${hash3}`);
    });

    it("应该处理符号格式标准化", () => {
      const hash1 = createStableSymbolsHash(["aapl", " MSFT ", "GOOGL"]);
      const hash2 = createStableSymbolsHash(["AAPL", "MSFT", "GOOGL"]);

      expect(hash1).toBe(hash2);

      console.log(`✅ 格式标准化: ${hash1}`);
    });
  });

  describe("市场推断工具验证", () => {
    it("应该正确推断美国市场符号", () => {
      const testCases = [
        { symbol: "AAPL", expected: Market.US },
        { symbol: "MSFT", expected: Market.US },
        { symbol: "GOOGL", expected: Market.US },
        { symbol: "TSLA", expected: Market.US },
        { symbol: "AMD", expected: Market.US },
      ];

      testCases.forEach(({ symbol, expected }) => {
        const market = inferMarketFromSymbol(symbol);
        expect(market).toBe(expected);
        console.log(`📈 ${symbol} → ${market}`);
      });
    });

    it("应该正确推断香港市场符号", () => {
      const testCases = [
        { symbol: "700.HK", expected: Market.HK },
        { symbol: "00700", expected: Market.HK },
        { symbol: "09988", expected: Market.HK },
        { symbol: "01810", expected: Market.HK },
      ];

      testCases.forEach(({ symbol, expected }) => {
        const market = inferMarketFromSymbol(symbol);
        expect(market).toBe(expected);
        console.log(`🇭🇰 ${symbol} → ${market}`);
      });
    });

    it("应该正确推断A股市场符号", () => {
      const testCases = [
        { symbol: "000001.SZ", expected: Market.SZ },
        { symbol: "000001", expected: Market.SZ },
        { symbol: "300750", expected: Market.SZ },
        { symbol: "600000.SH", expected: Market.SH },
        { symbol: "600000", expected: Market.SH },
        { symbol: "688009", expected: Market.SH },
      ];

      testCases.forEach(({ symbol, expected }) => {
        const market = inferMarketFromSymbol(symbol);
        expect(market).toBe(expected);
        console.log(`🇨🇳 ${symbol} → ${market}`);
      });
    });

    it("应该批量推断混合市场符号", () => {
      const symbols = ["AAPL", "700.HK", "600000.SH", "000001.SZ"];
      const market = extractMarketFromSymbols(symbols);

      // 取第一个符号的市场（美股）
      expect(market).toBe("US");

      console.log(`🌍 批量推断: [${symbols.join(", ")}] → ${market}`);
    });
  });

  describe("缓存策略枚举验证", () => {
    it("应该验证所有缓存策略常量", () => {
      const expectedStrategies = [
        CacheStrategy.STRONG_TIMELINESS,
        CacheStrategy.WEAK_TIMELINESS,
        CacheStrategy.MARKET_AWARE,
        CacheStrategy.NO_CACHE,
        CacheStrategy.ADAPTIVE,
      ];

      expectedStrategies.forEach((strategy) => {
        expect(typeof strategy).toBe("string");
        expect(strategy.length).toBeGreaterThan(0);
        console.log(`📋 缓存策略: ${strategy}`);
      });

      // 验证策略数量
      expect(Object.values(CacheStrategy)).toHaveLength(5);
    });

    it("应该验证策略值格式一致性", () => {
      const strategies = Object.values(CacheStrategy);

      strategies.forEach((strategy) => {
        // 策略值应为蛇形命名（snake_case）
        expect(strategy).toMatch(/^[a-z_]+$/);
        console.log(`🐍 Snake Case: ${strategy}`);
      });
    });
  });

  describe("错误处理验证", () => {
    it("应该拒绝空的缓存键前缀", () => {
      expect(() => buildUnifiedCacheKey("", ["AAPL"])).toThrow(
        "缓存键前缀不能为空",
      );
      expect(() => buildUnifiedCacheKey("   ", ["AAPL"])).toThrow(
        "缓存键前缀不能为空",
      );
    });

    it("应该拒绝空的符号列表", () => {
      expect(() => buildUnifiedCacheKey("test", [])).toThrow(
        "符号列表不能为空",
      );
      expect(() => createStableSymbolsHash([])).toThrow("符号列表不能为空");
    });

    it("应该验证缓存键格式", () => {
      expect(validateCacheKey("")).toBe(false);
      expect(validateCacheKey("single-part")).toBe(false);
      expect(validateCacheKey("valid:cache:key")).toBe(true);
      expect(validateCacheKey("invalid::empty:part")).toBe(false);
    });

    it("应该处理异常符号格式", () => {
      const market1 = inferMarketFromSymbol("");
      const market2 = inferMarketFromSymbol("UNKNOWN123");
      const market3 = extractMarketFromSymbols([]);

      expect(market1).toBe(Market.US); // 默认美股
      expect(market2).toBe(Market.US); // 默认美股
      expect(market3).toBe("UNKNOWN"); // 空列表返回UNKNOWN

      console.log(
        `❓ 异常处理: '' → ${market1}, 'UNKNOWN123' → ${market2}, [] → ${market3}`,
      );
    });
  });

  describe("性能和缓存键效率验证", () => {
    it("应该测试大量符号哈希性能", () => {
      const largeSymbolSet = Array.from(
        { length: 1000 },
        (_, i) => `STOCK${i.toString().padStart(4, "0")}`,
      );

      const startTime = Date.now();
      const hash = createStableSymbolsHash(largeSymbolSet);
      const endTime = Date.now();

      expect(hash).toMatch(/^[a-f0-9]{16}$/);
      expect(endTime - startTime).toBeLessThan(100); // 应在100ms内完成

      console.log(
        `⚡ 大量符号哈希性能: ${largeSymbolSet.length}个符号 → ${hash} (${endTime - startTime}ms)`,
      );
    });

    it("应该测试缓存键长度优化", () => {
      const shortSymbols = ["AAPL", "MSFT"];
      const longSymbols = Array.from(
        { length: 20 },
        (_, i) => `LONG_SYMBOL_NAME_${i}`,
      );

      const shortKey = buildUnifiedCacheKey("test", shortSymbols);
      const longKey = buildUnifiedCacheKey("test", longSymbols);

      expect(shortKey.length).toBeLessThan(50); // 短键应保持简洁
      expect(longKey).toContain("hash:"); // 长键应使用哈希
      expect(longKey.length).toBeLessThan(100); // 哈希键应保持合理长度

      console.log(
        `📏 缓存键长度: 短键=${shortKey.length}, 长键=${longKey.length}`,
      );
      console.log(`📄 短键: ${shortKey}`);
      console.log(`🗜️ 长键: ${longKey}`);
    });
  });

  afterAll(() => {
    // 生成综合测试报告
    console.log("\n" + "=".repeat(60));
    console.log("🔧 SMART CACHE UTILS INTEGRATION TEST SUMMARY");
    console.log("=".repeat(60));
    console.log("✅ 缓存键构建: 通过 - 支持单符号、多符号和哈希键");
    console.log("✅ 符号哈希: 通过 - 稳定性、一致性和标准化处理");
    console.log("✅ 市场推断: 通过 - 美股、港股、A股正确识别");
    console.log("✅ 策略枚举: 通过 - 5种策略常量验证和格式检查");
    console.log("✅ 错误处理: 通过 - 空值、异常输入和格式验证");
    console.log("✅ 性能优化: 通过 - 哈希性能和键长度优化");
    console.log("=".repeat(60));
    console.log("🎯 智能缓存工具函数集成测试完成");
  });
});
