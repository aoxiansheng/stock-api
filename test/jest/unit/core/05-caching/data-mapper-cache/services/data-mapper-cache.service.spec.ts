import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Redis } from 'ioredis';
import { DataMapperCacheService } from '../../../../../../../src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { FlexibleMappingRuleResponseDto } from '../../../../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { DATA_MAPPER_CACHE_CONSTANTS } from '../../../../../../../src/core/05-caching/data-mapper-cache/constants/data-mapper-cache.constants';

// Mock the logger
jest.mock('../../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('DataMapperCacheService', () => {
  let service: DataMapperCacheService;
  let redisService: DeepMocked<RedisService>;
  let mockRedis: DeepMocked<Redis>;

  const mockRule: FlexibleMappingRuleResponseDto = {
    id: '507f1f77bcf86cd799439011',
    name: 'Test Mapping Rule',
    provider: 'longport',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    description: 'Test description',
    isDefault: true,
    isActive: true,
    sourceTemplateId: '507f1f77bcf86cd799439010',
    fieldMappings: [],
    version: '1.0.0',
    overallConfidence: 0.95,
    usageCount: 10,
    lastUsedAt: new Date(),
    lastValidatedAt: new Date(),
    successfulTransformations: 8,
    failedTransformations: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // 创建 Redis mock
    mockRedis = createMock<Redis>();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMapperCacheService,
        {
          provide: RedisService,
          useValue: createMock<RedisService>({
            getOrThrow: jest.fn().mockReturnValue(mockRedis),
          }),
        },
      ],
    }).compile();

    service = module.get<DataMapperCacheService>(DataMapperCacheService);
    redisService = module.get<DeepMocked<RedisService>>(RedisService);
  });

  describe('cacheBestMatchingRule', () => {
    it('should cache best matching rule successfully', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.cacheBestMatchingRule('longport', 'rest', 'quote_fields', mockRule);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dm:best_rule:longport:rest:quote_fields',
        DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
        JSON.stringify(mockRule)
      );
    });

    it('should handle cache errors by throwing', async () => {
      const error = new Error('Redis connection failed');
      mockRedis.setex.mockRejectedValue(error);

      await expect(
        service.cacheBestMatchingRule('longport', 'rest', 'quote_fields', mockRule)
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('getCachedBestMatchingRule', () => {
    it('should retrieve cached best matching rule', async () => {
      const serializedRule = JSON.stringify(mockRule);
      mockRedis.get.mockResolvedValue(serializedRule);

      const result = await service.getCachedBestMatchingRule('longport', 'rest', 'quote_fields');

      expect(result).toEqual(JSON.parse(serializedRule));
      expect(mockRedis.get).toHaveBeenCalledWith('dm:best_rule:longport:rest:quote_fields');
    });

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getCachedBestMatchingRule('longport', 'rest', 'quote_fields');

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      const error = new Error('Redis connection failed');
      mockRedis.get.mockRejectedValue(error);

      const result = await service.getCachedBestMatchingRule('longport', 'rest', 'quote_fields');

      expect(result).toBeNull();
    });
  });

  describe('cacheRuleById', () => {
    it('should cache rule by ID successfully', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.cacheRuleById(mockRule);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `dm:rule_by_id:${mockRule.id}`,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
        JSON.stringify(mockRule)
      );
    });

    it('should skip caching rule without ID', async () => {
      const ruleWithoutId = { ...mockRule, id: undefined as any };

      await service.cacheRuleById(ruleWithoutId);

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('getCachedRuleById', () => {
    it('should retrieve cached rule by ID', async () => {
      const serializedRule = JSON.stringify(mockRule);
      mockRedis.get.mockResolvedValue(serializedRule);

      const result = await service.getCachedRuleById(mockRule.id);

      expect(result).toEqual(JSON.parse(serializedRule));
      expect(mockRedis.get).toHaveBeenCalledWith(`dm:rule_by_id:${mockRule.id}`);
    });

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getCachedRuleById(mockRule.id);

      expect(result).toBeNull();
    });
  });

  describe('cacheProviderRules', () => {
    it('should cache provider rules list successfully', async () => {
      const rules = [mockRule];
      mockRedis.setex.mockResolvedValue('OK');

      await service.cacheProviderRules('longport', 'rest', rules);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dm:provider_rules:longport:rest',
        DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES,
        JSON.stringify(rules)
      );
    });
  });

  describe('getCachedProviderRules', () => {
    it('should retrieve cached provider rules', async () => {
      const rules = [mockRule];
      const serializedRules = JSON.stringify(rules);
      mockRedis.get.mockResolvedValue(serializedRules);

      const result = await service.getCachedProviderRules('longport', 'rest');

      expect(result).toEqual(JSON.parse(serializedRules));
      expect(mockRedis.get).toHaveBeenCalledWith('dm:provider_rules:longport:rest');
    });
  });

  describe('invalidateRuleCache', () => {
    it('should invalidate rule-related caches', async () => {
      mockRedis.del.mockResolvedValue(3);

      await service.invalidateRuleCache(mockRule.id, mockRule);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `dm:rule_by_id:${mockRule.id}`,
        'dm:best_rule:longport:rest:quote_fields',
        'dm:provider_rules:longport:rest'
      );
    });

    it('should invalidate only rule ID cache when rule not provided', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidateRuleCache(mockRule.id);

      expect(mockRedis.del).toHaveBeenCalledWith(`dm:rule_by_id:${mockRule.id}`);
    });
  });

  describe('invalidateProviderCache', () => {
    it('should invalidate provider-related caches', async () => {
      mockRedis.keys.mockResolvedValueOnce(['dm:best_rule:longport:rest:quote_fields']);
      mockRedis.keys.mockResolvedValueOnce(['dm:provider_rules:longport:rest']);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidateProviderCache('longport');

      expect(mockRedis.keys).toHaveBeenCalledWith('dm:best_rule:longport:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('dm:provider_rules:longport:*');
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAllRuleCache', () => {
    it('should clear all rule caches', async () => {
      mockRedis.keys.mockResolvedValue(['dm:best_rule:test', 'dm:rule_by_id:test']);
      mockRedis.del.mockResolvedValue(2);

      await service.clearAllRuleCache();

      expect(mockRedis.keys).toHaveBeenCalledTimes(4); // 4 patterns
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('warmupCache', () => {
    it('should warm up cache with common rules', async () => {
      const rules = [mockRule, { ...mockRule, id: '507f1f77bcf86cd799439012', isDefault: false }];
      mockRedis.setex.mockResolvedValue('OK');

      await service.warmupCache(rules);

      expect(mockRedis.setex).toHaveBeenCalledTimes(3); // 2 rule by ID + 1 best match (for default rule only)
    });

    it('should skip rules without ID during warmup', async () => {
      const rulesWithoutId = [{ ...mockRule, id: undefined as any }];

      await service.warmupCache(rulesWithoutId);

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.keys.mockResolvedValueOnce(['dm:best_rule:1', 'dm:best_rule:2']);
      mockRedis.keys.mockResolvedValueOnce(['dm:rule_by_id:1']);
      mockRedis.keys.mockResolvedValueOnce(['dm:provider_rules:1']);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        bestRuleCacheSize: 2,
        ruleByIdCacheSize: 1,
        providerRulesCacheSize: 1,
        totalCacheSize: 4,
        hitRate: 0, // No hits yet
        avgResponseTime: 0,
      });
    });

    it('should handle errors gracefully in stats', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0,
        providerRulesCacheSize: 0,
        totalCacheSize: 0,
        hitRate: 0,
        avgResponseTime: 0,
      });
    });
  });
});