/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { MappingRuleCacheService } from "../../../../../../../src/core/00-prepare/data-mapper/services/mapping-rule-cache.service";
import { CacheService } from "../../../../../../../src/cache/services/cache.service";
import { FlexibleMappingRuleResponseDto } from "../../../../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";

// Mock the logger
jest.mock("../../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("MappingRuleCacheService", () => {
  let service: MappingRuleCacheService;
  let cacheService: DeepMocked<CacheService>;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: "507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: "longport",
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    description: "Test description",
    fieldMappings: [
      {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.95
      }
    ],
    isActive: true,
    isDefault: false,
    version: "1.0.0",
    overallConfidence: 0.95,
    usageCount: 0,
    successfulTransformations: 0,
    failedTransformations: 0,
    sourceTemplateId: undefined as any,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingRuleCacheService,
        {
          provide: CacheService,
          useValue: createMock<CacheService>(),
        },
      ],
    }).compile();

    service = module.get<MappingRuleCacheService>(MappingRuleCacheService);
    cacheService = module.get<DeepMocked<CacheService>>(CacheService);
  });

  describe("cacheBestMatchingRule", () => {
    it("should cache best matching rule successfully", async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.cacheBestMatchingRule("longport", "rest", "quote_fields", mockRule);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining("mapping_rule:best:longport:rest:quote_fields"),
        mockRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it("should handle cache errors gracefully", async () => {
      cacheService.set.mockRejectedValue(new Error("Cache error"));

      // Should not throw error
      await expect(service.cacheBestMatchingRule("longport", "rest", "quote_fields", mockRule))
        .resolves.not.toThrow();
    });
  });

  describe("getCachedBestMatchingRule", () => {
    it("should retrieve cached best matching rule", async () => {
      cacheService.get.mockResolvedValue(mockRule);

      const result = await service.getCachedBestMatchingRule("longport", "rest", "quote_fields");

      expect(result).toEqual(mockRule);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining("mapping_rule:best:longport:rest:quote_fields")
      );
    });

    it("should return null when cache miss", async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getCachedBestMatchingRule("longport", "rest", "quote_fields");

      expect(result).toBeNull();
    });

    it("should return whatever cacheService returns", async () => {
      cacheService.get.mockResolvedValue("any data");

      const result = await service.getCachedBestMatchingRule("longport", "rest", "quote_fields");

      // cacheService已经处理序列化/反序列化，service直接返回结果
      expect(result).toBe("any data");
    });
  });

  describe("cacheRuleById", () => {
    it("should cache rule by id successfully", async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.cacheRuleById(mockRule);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:by_id:${mockRule.id}`),
        mockRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it("should skip caching rule without id", async () => {
      const ruleWithoutId = { ...mockRule, id: undefined as any };
      cacheService.set.mockClear();

      await service.cacheRuleById(ruleWithoutId);

      // 根据后端代码，应该检查rule.id是否存在，不存在则直接返回
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe("getCachedRuleById", () => {
    it("should retrieve cached rule by id", async () => {
      cacheService.get.mockResolvedValue(mockRule);

      const result = await service.getCachedRuleById(mockRule.id);

      expect(result).toEqual(mockRule);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:by_id:${mockRule.id}`)
      );
    });

    it("should return null when cache miss", async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getCachedRuleById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("cacheProviderRules", () => {
    it("should cache provider rules successfully", async () => {
      const rules = [mockRule];
      cacheService.set.mockResolvedValue(undefined);

      await service.cacheProviderRules("longport", "rest", rules);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining("mapping_rule:provider:longport:rest"),
        rules,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it("should handle empty rules array", async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.cacheProviderRules("longport", "rest", []);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining("mapping_rule:provider:longport:rest"),
        [],
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });
  });

  describe("getCachedProviderRules", () => {
    it("should retrieve cached provider rules", async () => {
      const rules = [mockRule];
      cacheService.get.mockResolvedValue(rules);

      const result = await service.getCachedProviderRules("longport", "rest");

      expect(result).toEqual(rules);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining("mapping_rule:provider:longport")
      );
    });

    it("should return null when cache miss", async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getCachedProviderRules("longport", "rest");

      expect(result).toBeNull();
    });
  });

  describe("invalidateRuleCache", () => {
    it("should invalidate all cache entries for a rule", async () => {
      cacheService.del.mockResolvedValue(1);

      await service.invalidateRuleCache(mockRule.id, mockRule);

      expect(cacheService.del).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should handle cache errors during invalidation", async () => {
      cacheService.del.mockRejectedValue(new Error("Cache error"));

      await expect(service.invalidateRuleCache(mockRule.id))
        .resolves.not.toThrow();
    });
  });

  describe("invalidateProviderCache", () => {
    it("should invalidate provider-specific cache entries", async () => {
      cacheService.delByPattern.mockResolvedValue(1);

      await service.invalidateProviderCache("longport");

      expect(cacheService.delByPattern).toHaveBeenCalled();
    });
  });

  describe("clearAllRuleCache", () => {
    it("should clear all rule cache entries", async () => {
      cacheService.delByPattern.mockResolvedValue(3);

      await service.clearAllRuleCache();

      expect(cacheService.delByPattern).toHaveBeenCalled();
    });

    it("should handle no cache entries to clear", async () => {
      await service.clearAllRuleCache();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const result = await service.getCacheStats();

      expect(result).toEqual({
        bestRuleCacheSize: expect.any(Number),
        ruleByIdCacheSize: expect.any(Number),
        providerRulesCacheSize: expect.any(Number),
        totalCacheSize: expect.any(Number)
      });
    });

    it("should handle cache errors in stats", async () => {
      cacheService.delByPattern.mockRejectedValue(new Error("Cache error"));

      const result = await service.getCacheStats();

      expect(result).toEqual({
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0,
        providerRulesCacheSize: 0,
        totalCacheSize: 0
      });
    });
  });

  describe("warmupCache", () => {
    it("should warm up cache with provided rules", async () => {
      const rules = [mockRule];
      cacheService.set.mockResolvedValue(undefined);

      await service.warmupCache(rules);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:by_id:${mockRule.id}`),
        mockRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it("should handle empty rules array in warmup", async () => {
      await service.warmupCache([]);

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it("should skip rules without id during warmup", async () => {
      const ruleWithoutId = { ...mockRule, id: undefined as any };
      const rules = [mockRule, ruleWithoutId];
      cacheService.set.mockResolvedValue(undefined);
      cacheService.set.mockClear();

      await service.warmupCache(rules);

      // 根据后端代码，warmupCache会检查每个rule是否有ID，没有ID的会被跳过
      expect(cacheService.set).toHaveBeenCalledTimes(1); // 只缓存有ID的规则
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:by_id:${mockRule.id}`),
        mockRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it("should cache default rules as best matching during warmup", async () => {
      const defaultRule = { ...mockRule, isDefault: true };
      const rules = [defaultRule];
      cacheService.set.mockResolvedValue(undefined);
      cacheService.set.mockClear();

      await service.warmupCache(rules);

      // 默认规则应该被缓存两次：一次作为ID缓存，一次作为最佳匹配缓存
      expect(cacheService.set).toHaveBeenCalledTimes(2);
      
      // 验证按ID缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:by_id:${defaultRule.id}`),
        defaultRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
      
      // 验证最佳匹配缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`mapping_rule:best:${defaultRule.provider}:${defaultRule.apiType}:${defaultRule.transDataRuleListType}`),
        defaultRule,
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });
  });

  describe("key building methods", () => {
    it("should build correct cache keys", () => {
      const anyService = service as any;
      expect(anyService.buildBestRuleKey("longport", "rest", "quote_fields"))
        .toBe("mapping_rule:best:longport:rest:quote_fields");

      expect(anyService.buildRuleByIdKey("123"))
        .toBe("mapping_rule:by_id:123");

      expect(anyService.buildProviderRulesKey("longport", "rest"))
        .toBe("mapping_rule:provider:longport:rest");

      expect(anyService.buildStatsKey()).toBe("mapping_rule:stats:global");
    });
  });

  describe("cache constants", () => {
    it("should have correct cache key prefixes", () => {
      const keys = (service as any).CACHE_KEYS;
      expect(keys.BESTRULE).toBe("mapping_rule:best");
      expect(keys.RULE_BY_ID).toBe("mapping_rule:by_id");
      expect(keys.PROVIDERRULES).toBe("mapping_rule:provider");
      expect(keys.RULESTATS).toBe("mapping_rule:stats");
    });

    it("should have reasonable TTL values", () => {
      const ttl = (service as any).CACHE_TTL;
      Object.values(ttl).forEach((v:number)=> expect(v).toBeGreaterThan(0));
    });
  });

  describe("error resilience", () => {
    it("should return whatever cacheService provides", async () => {
      cacheService.get.mockResolvedValue(mockRule);

      const result = await service.getCachedBestMatchingRule("longport", "rest", "quote_fields");

      // cacheService已经处理序列化/反序列化，service直接返回结果
      expect(result).toEqual(mockRule);
    });

    it("should handle cache service failures during warmup", async () => {
      cacheService.set.mockRejectedValue(new Error("Redis connection failed"));

      // warmup应该处理失败而不抛出异常
      await expect(service.warmupCache([mockRule])).resolves.not.toThrow();
    });

    it("should handle cache service failures during regular caching", async () => {
      cacheService.set.mockRejectedValue(new Error("Redis connection failed"));

      await expect(service.cacheRuleById(mockRule)).resolves.not.toThrow();
    });

    it("should handle cache deletion failures", async () => {
      cacheService.del.mockRejectedValue(new Error("Delete failed"));

      await expect(service.invalidateRuleCache("test" as any)).resolves.not.toThrow();
    });
  });
});