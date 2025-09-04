/**
 * 常量引用一致性自动化测试
 * 验证超时配置和查询限制常量的正确引用和使用
 */

import { QUERY_TIMEOUT_CONFIG, QUERY_LIMITS } from "../../../../../../src/core/01-entry/query/constants/query.constants";
import { QueryConfigService } from "../../../../../../src/core/01-entry/query/config/query.config";
import { ConfigService } from "@nestjs/config";

describe("Constant Reference Consistency", () => {
  describe("QUERY_TIMEOUT_CONFIG Values", () => {
    it("should have expected timeout values", () => {
      // 验证超时配置常量的基本值
      expect(QUERY_TIMEOUT_CONFIG.QUERY_MS).toBe(30000);
      expect(QUERY_TIMEOUT_CONFIG.CACHE_MS).toBe(5000);
      expect(QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS).toBe(15000);
      expect(QUERY_TIMEOUT_CONFIG.HEALTH_CHECK_MS).toBe(5000);
    });

    it("should be frozen objects", () => {
      // 验证常量对象是不可变的
      expect(Object.isFrozen(QUERY_TIMEOUT_CONFIG)).toBe(true);
      
      // 尝试修改应该失败（在严格模式下会抛出错误，非严格模式下静默失败）
      expect(() => {
        (QUERY_TIMEOUT_CONFIG as any).QUERY_MS = 60000;
      }).not.toThrow(); // 非严格模式下不会抛出错误
      
      // 但值应该保持不变
      expect(QUERY_TIMEOUT_CONFIG.QUERY_MS).toBe(30000);
    });

    it("should have reasonable timeout values", () => {
      // 验证超时值在合理范围内
      expect(QUERY_TIMEOUT_CONFIG.QUERY_MS).toBeGreaterThan(0);
      expect(QUERY_TIMEOUT_CONFIG.QUERY_MS).toBeLessThanOrEqual(300000); // 5分钟
      
      expect(QUERY_TIMEOUT_CONFIG.CACHE_MS).toBeGreaterThan(0);
      expect(QUERY_TIMEOUT_CONFIG.CACHE_MS).toBeLessThanOrEqual(60000); // 1分钟
      
      expect(QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS).toBeGreaterThan(0);
      expect(QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS).toBeLessThanOrEqual(120000); // 2分钟
    });
  });

  describe("QueryConfigService Timeout Integration", () => {
    let configService: ConfigService;
    let queryConfigService: QueryConfigService;

    beforeEach(() => {
      // 创建模拟的ConfigService
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          // 返回默认值以测试常量集成
          return defaultValue;
        })
      } as any;

      queryConfigService = new QueryConfigService(configService);
    });

    it("should use QUERY_TIMEOUT_CONFIG constants as defaults", () => {
      // 验证QueryConfigService使用常量作为默认值
      expect(queryConfigService.marketParallelTimeout).toBe(QUERY_TIMEOUT_CONFIG.QUERY_MS);
      expect(queryConfigService.receiverBatchTimeout).toBe(QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS);
    });

    it("should respect environment variable override", () => {
      // 创建返回环境变量值的ConfigService
      const configWithEnvVars = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === "QUERY_MARKET_TIMEOUT") return "45000";
          if (key === "QUERY_RECEIVER_TIMEOUT") return "20000";
          return defaultValue;
        })
      } as any;

      const queryConfigWithEnv = new QueryConfigService(configWithEnvVars);
      
      // 验证环境变量覆盖默认常量值
      expect(queryConfigWithEnv.marketParallelTimeout).toBe(45000);
      expect(queryConfigWithEnv.receiverBatchTimeout).toBe(20000);
    });

    it("should maintain type consistency", () => {
      // 验证返回值的类型一致性
      expect(typeof queryConfigService.marketParallelTimeout).toBe("number");
      expect(typeof queryConfigService.receiverBatchTimeout).toBe("number");
      
      expect(Number.isInteger(queryConfigService.marketParallelTimeout)).toBe(true);
      expect(Number.isInteger(queryConfigService.receiverBatchTimeout)).toBe(true);
    });
  });

  describe("QUERY_LIMITS Values", () => {
    it("should have expected limit values", () => {
      // 验证查询限制常量的值
      expect(QUERY_LIMITS.SYMBOLS_PER_QUERY).toBe(100);
      expect(QUERY_LIMITS.BULK_QUERIES).toBe(100);
    });

    it("should provide aggregated limits", () => {
      // 验证聚合限制访问器
      const allLimits = QUERY_LIMITS.ALL_LIMITS;
      
      expect(allLimits).toHaveProperty("SYMBOLS_PER_QUERY");
      expect(allLimits).toHaveProperty("BULK_QUERIES");
      expect(allLimits).toHaveProperty("QUERY_LIMIT_MAX");
      expect(allLimits).toHaveProperty("QUERY_LIMIT_MIN");
      
      expect(allLimits.SYMBOLS_PER_QUERY).toBe(100);
      expect(allLimits.BULK_QUERIES).toBe(100);
      expect(allLimits.QUERY_LIMIT_MAX).toBe(1000);
      expect(allLimits.QUERY_LIMIT_MIN).toBe(1);
    });

    it("should be frozen objects", () => {
      // 验证QUERY_LIMITS对象是不可变的
      expect(Object.isFrozen(QUERY_LIMITS)).toBe(true);
    });

    it("should have consistent business logic values", () => {
      // 验证业务逻辑一致性
      expect(QUERY_LIMITS.SYMBOLS_PER_QUERY).toBeGreaterThan(0);
      expect(QUERY_LIMITS.BULK_QUERIES).toBeGreaterThan(0);
      
      // 单次查询符号数量应该合理（不超过1000）
      expect(QUERY_LIMITS.SYMBOLS_PER_QUERY).toBeLessThanOrEqual(1000);
      
      // 批量查询数量应该合理
      expect(QUERY_LIMITS.BULK_QUERIES).toBeLessThanOrEqual(1000);
    });
  });

  describe("Cross-Module Consistency", () => {
    it("should maintain consistency across different constant groups", () => {
      // 验证不同常量组之间的一致性
      const timeoutKeys = Object.keys(QUERY_TIMEOUT_CONFIG);
      const limitKeys = Object.keys(QUERY_LIMITS);
      
      // 验证键命名约定
      timeoutKeys.forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/); // 大写字母和下划线
        expect(key.endsWith("_MS")).toBe(true); // 超时常量应以_MS结尾
      });
      
      // 验证限制键命名约定
      expect(limitKeys).toContain("SYMBOLS_PER_QUERY");
      expect(limitKeys).toContain("BULK_QUERIES");
    });

    it("should provide consistent JSDoc documentation access", () => {
      // 验证常量的文档和元数据可访问性
      expect(typeof QUERY_LIMITS.SYMBOLS_PER_QUERY).toBe("number");
      expect(typeof QUERY_LIMITS.BULK_QUERIES).toBe("number");
      
      // 验证聚合访问器工作正常
      expect(typeof QUERY_LIMITS.ALL_LIMITS).toBe("object");
      expect(QUERY_LIMITS.ALL_LIMITS).not.toBeNull();
    });
  });

  describe("Runtime Validation", () => {
    it("should prevent accidental constant modification", () => {
      // 尝试修改常量值
      const originalQueryMs = QUERY_TIMEOUT_CONFIG.QUERY_MS;
      const originalSymbolsLimit = QUERY_LIMITS.SYMBOLS_PER_QUERY;
      
      try {
        (QUERY_TIMEOUT_CONFIG as any).QUERY_MS = 99999;
        (QUERY_LIMITS as any).SYMBOLS_PER_QUERY = 99999;
      } catch (error) {
        // 在严格模式下可能抛出错误
      }
      
      // 值应该保持不变
      expect(QUERY_TIMEOUT_CONFIG.QUERY_MS).toBe(originalQueryMs);
      expect(QUERY_LIMITS.SYMBOLS_PER_QUERY).toBe(originalSymbolsLimit);
    });

    it("should provide stable references across imports", () => {
      // 验证导入的常量引用稳定性
      const timeout1 = QUERY_TIMEOUT_CONFIG;
      const limits1 = QUERY_LIMITS;
      
      // 重新导入
      const { QUERY_TIMEOUT_CONFIG: timeout2, QUERY_LIMITS: limits2 } = 
        require("../../../../../../src/core/01-entry/query/constants/query.constants");
      
      expect(timeout1).toBe(timeout2);
      expect(limits1).toBe(limits2);
      
      expect(timeout1.QUERY_MS).toBe(timeout2.QUERY_MS);
      expect(limits1.SYMBOLS_PER_QUERY).toBe(limits2.SYMBOLS_PER_QUERY);
    });
  });
});