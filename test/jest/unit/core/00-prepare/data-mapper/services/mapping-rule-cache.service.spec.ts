import { REFERENCE_DATA } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { MappingRuleCacheService } from "../../../../../../../src/core/00-prepare/data-mapper/services/mapping-rule-cache.service";
import { DataMapperCacheService } from "../../../../../../../src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service";
import { FlexibleMappingRuleResponseDto } from "../../../../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";

// Mock the logger
jest.mock("../@app/config/logger.config", () => ({
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
  let dataMapperCacheService: DeepMocked<DataMapperCacheService>;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: "507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    apiType: "rest",
    transDataRuleListType: "quote_fields",
    description: "Test description",
    fieldMappings: [
      {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.95,
      },
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
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingRuleCacheService,
        {
          provide: DataMapperCacheService,
          useValue: {
            cacheBestMatchingRule: jest.fn(),
            getCachedBestMatchingRule: jest.fn(),
            cacheRuleById: jest.fn(),
            getCachedRuleById: jest.fn(),
            cacheProviderRules: jest.fn(),
            getCachedProviderRules: jest.fn(),
            invalidateRuleCache: jest.fn(),
            invalidateProviderCache: jest.fn(),
            clearAllRuleCache: jest.fn(),
            getCacheStats: jest.fn(),
            warmupCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MappingRuleCacheService>(MappingRuleCacheService);
    dataMapperCacheService = module.get<DeepMocked<DataMapperCacheService>>(
      DataMapperCacheService,
    );
  });

  describe("cacheBestMatchingRule", () => {
    it("should cache best matching rule successfully", async () => {
      dataMapperCacheService.cacheBestMatchingRule.mockResolvedValue(undefined);

      await service.cacheBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
        mockRule,
      );

      expect(dataMapperCacheService.cacheBestMatchingRule).toHaveBeenCalledWith(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
        mockRule,
      );
    });

    it("should handle cache errors gracefully", async () => {
      dataMapperCacheService.cacheBestMatchingRule.mockRejectedValue(
        new Error("Cache error"),
      );

      // Should throw error (delegate behavior)
      await expect(
        service.cacheBestMatchingRule(
          REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          "rest",
          "quote_fields",
          mockRule,
        ),
      ).rejects.toThrow("Cache error");
    });
  });

  describe("getCachedBestMatchingRule", () => {
    it("should retrieve cached best matching rule", async () => {
      dataMapperCacheService.getCachedBestMatchingRule.mockResolvedValue(
        mockRule,
      );

      const result = await service.getCachedBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      expect(result).toEqual(mockRule);
      expect(
        dataMapperCacheService.getCachedBestMatchingRule,
      ).toHaveBeenCalledWith(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest", "quote_fields");
    });

    it("should return null when cache miss", async () => {
      dataMapperCacheService.getCachedBestMatchingRule.mockResolvedValue(null);

      const result = await service.getCachedBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      expect(result).toBeNull();
    });

    it("should return whatever dataMapperCacheService returns", async () => {
      dataMapperCacheService.getCachedBestMatchingRule.mockResolvedValue(
        mockRule,
      );

      const result = await service.getCachedBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      // dataMapperCacheService已经处理序列化/反序列化，service直接返回结果
      expect(result).toEqual(mockRule);
    });
  });

  describe("cacheRuleById", () => {
    it("should cache rule by id successfully", async () => {
      dataMapperCacheService.cacheRuleById.mockResolvedValue(undefined);

      await service.cacheRuleById(mockRule);

      expect(dataMapperCacheService.cacheRuleById).toHaveBeenCalledWith(
        mockRule,
      );
    });

    it("should handle rules without id via dataMapperCacheService", async () => {
      const ruleWithoutId = { ...mockRule, id: undefined as any };
      dataMapperCacheService.cacheRuleById.mockResolvedValue(undefined);

      await service.cacheRuleById(ruleWithoutId);

      // DataMapperCacheService handles validation
      expect(dataMapperCacheService.cacheRuleById).toHaveBeenCalledWith(
        ruleWithoutId,
      );
    });
  });

  describe("getCachedRuleById", () => {
    it("should retrieve cached rule by id", async () => {
      dataMapperCacheService.getCachedRuleById.mockResolvedValue(mockRule);

      const result = await service.getCachedRuleById(mockRule.id);

      expect(result).toEqual(mockRule);
      expect(dataMapperCacheService.getCachedRuleById).toHaveBeenCalledWith(
        mockRule.id,
      );
    });

    it("should return null when cache miss", async () => {
      dataMapperCacheService.getCachedRuleById.mockResolvedValue(null);

      const result = await service.getCachedRuleById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("cacheProviderRules", () => {
    it("should cache provider rules successfully", async () => {
      const rules = [mockRule];
      dataMapperCacheService.cacheProviderRules.mockResolvedValue(undefined);

      await service.cacheProviderRules(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest", rules);

      expect(dataMapperCacheService.cacheProviderRules).toHaveBeenCalledWith(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        rules,
      );
    });

    it("should handle empty rules array", async () => {
      dataMapperCacheService.cacheProviderRules.mockResolvedValue(undefined);

      await service.cacheProviderRules(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest", []);

      expect(dataMapperCacheService.cacheProviderRules).toHaveBeenCalledWith(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        [],
      );
    });
  });

  describe("getCachedProviderRules", () => {
    it("should retrieve cached provider rules", async () => {
      const rules = [mockRule];
      dataMapperCacheService.getCachedProviderRules.mockResolvedValue(rules);

      const result = await service.getCachedProviderRules(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest");

      expect(result).toEqual(rules);
      expect(
        dataMapperCacheService.getCachedProviderRules,
      ).toHaveBeenCalledWith(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest");
    });

    it("should return null when cache miss", async () => {
      dataMapperCacheService.getCachedProviderRules.mockResolvedValue(null);

      const result = await service.getCachedProviderRules(REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "rest");

      expect(result).toBeNull();
    });
  });

  describe("invalidateRuleCache", () => {
    it("should invalidate all cache entries for a rule", async () => {
      dataMapperCacheService.invalidateRuleCache.mockResolvedValue(undefined);

      await service.invalidateRuleCache(mockRule.id, mockRule);

      expect(dataMapperCacheService.invalidateRuleCache).toHaveBeenCalledWith(
        mockRule.id,
        mockRule,
      );
    });

    it("should handle cache errors during invalidation", async () => {
      dataMapperCacheService.invalidateRuleCache.mockRejectedValue(
        new Error("Cache error"),
      );

      await expect(service.invalidateRuleCache(mockRule.id)).rejects.toThrow(
        "Cache error",
      );
    });
  });

  describe("invalidateProviderCache", () => {
    it("should invalidate provider-specific cache entries", async () => {
      dataMapperCacheService.invalidateProviderCache.mockResolvedValue(
        undefined,
      );

      await service.invalidateProviderCache(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);

      expect(
        dataMapperCacheService.invalidateProviderCache,
      ).toHaveBeenCalledWith(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
    });
  });

  describe("clearAllRuleCache", () => {
    it("should clear all rule cache entries", async () => {
      dataMapperCacheService.clearAllRuleCache.mockResolvedValue(undefined);

      await service.clearAllRuleCache();

      expect(dataMapperCacheService.clearAllRuleCache).toHaveBeenCalled();
    });

    it("should handle no cache entries to clear", async () => {
      dataMapperCacheService.clearAllRuleCache.mockResolvedValue(undefined);

      await service.clearAllRuleCache();

      expect(dataMapperCacheService.clearAllRuleCache).toHaveBeenCalled();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const mockStats = {
        bestRuleCacheSize: 5,
        ruleByIdCacheSize: 10,
        providerRulesCacheSize: 3,
        totalCacheSize: 18,
      };

      dataMapperCacheService.getCacheStats.mockResolvedValue(mockStats);

      const result = await service.getCacheStats();

      expect(result).toEqual(mockStats);
      expect(dataMapperCacheService.getCacheStats).toHaveBeenCalled();
    });

    it("should handle cache errors in stats", async () => {
      const errorStats = {
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0,
        providerRulesCacheSize: 0,
        totalCacheSize: 0,
      };

      dataMapperCacheService.getCacheStats.mockResolvedValue(errorStats);

      const result = await service.getCacheStats();

      expect(result).toEqual(errorStats);
    });
  });

  describe("warmupCache", () => {
    it("should warm up cache with provided rules", async () => {
      const rules = [mockRule];
      dataMapperCacheService.warmupCache.mockResolvedValue(undefined);

      await service.warmupCache(rules);

      expect(dataMapperCacheService.warmupCache).toHaveBeenCalledWith(rules);
    });

    it("should handle empty rules array in warmup", async () => {
      dataMapperCacheService.warmupCache.mockResolvedValue(undefined);

      await service.warmupCache([]);

      expect(dataMapperCacheService.warmupCache).toHaveBeenCalledWith([]);
    });

    it("should delegate rule processing to dataMapperCacheService", async () => {
      const ruleWithoutId = { ...mockRule, id: undefined as any };
      const rules = [mockRule, ruleWithoutId];
      dataMapperCacheService.warmupCache.mockResolvedValue(undefined);

      await service.warmupCache(rules);

      // DataMapperCacheService handles ID validation and default rule logic
      expect(dataMapperCacheService.warmupCache).toHaveBeenCalledWith(rules);
    });

    it("should delegate default rule handling to dataMapperCacheService", async () => {
      const defaultRule = { ...mockRule, isDefault: true };
      const rules = [defaultRule];
      dataMapperCacheService.warmupCache.mockResolvedValue(undefined);

      await service.warmupCache(rules);

      // DataMapperCacheService handles default rule caching as best matching
      expect(dataMapperCacheService.warmupCache).toHaveBeenCalledWith(rules);
    });
  });

  describe("delegation pattern", () => {
    it("should delegate all operations to dataMapperCacheService", () => {
      // This service is a simple wrapper/facade over DataMapperCacheService
      // All key building and cache logic is handled by the underlying service
      expect(service).toBeDefined();
      expect(dataMapperCacheService).toBeDefined();
    });
  });

  // Cache constants are handled by DataMapperCacheService

  describe("error resilience", () => {
    it("should return whatever dataMapperCacheService provides", async () => {
      dataMapperCacheService.getCachedBestMatchingRule.mockResolvedValue(
        mockRule,
      );

      const result = await service.getCachedBestMatchingRule(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "rest",
        "quote_fields",
      );

      // dataMapperCacheService已经处理序列化/反序列化，service直接返回结果
      expect(result).toEqual(mockRule);
    });

    it("should propagate cache service failures during warmup", async () => {
      dataMapperCacheService.warmupCache.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      // Service delegates error handling to DataMapperCacheService
      await expect(service.warmupCache([mockRule])).rejects.toThrow(
        "Redis connection failed",
      );
    });

    it("should propagate cache service failures during regular caching", async () => {
      dataMapperCacheService.cacheRuleById.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      await expect(service.cacheRuleById(mockRule)).rejects.toThrow(
        "Redis connection failed",
      );
    });

    it("should propagate cache deletion failures", async () => {
      dataMapperCacheService.invalidateRuleCache.mockRejectedValue(
        new Error("Delete failed"),
      );

      await expect(service.invalidateRuleCache("test" as any)).rejects.toThrow(
        "Delete failed",
      );
    });
  });
});
