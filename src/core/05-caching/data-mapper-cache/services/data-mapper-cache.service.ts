import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createLogger } from '../../../../common/config/logger.config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { FlexibleMappingRuleResponseDto } from '../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { IDataMapperCache } from '../interfaces/data-mapper-cache.interface';
import { 
  DATA_MAPPER_CACHE_CONSTANTS, 
  DataMapperCacheOperation,
  DataMapperCacheMetrics 
} from '../constants/data-mapper-cache.constants';
import { DataMapperCacheStatsDto } from '../dto/data-mapper-cache.dto';

/**
 * DataMapper 专用缓存服务
 * 专注于映射规则的缓存操作，简化业务逻辑
 */
@Injectable()
export class DataMapperCacheService implements IDataMapperCache {
  private readonly logger = createLogger(DataMapperCacheService.name);
  private readonly metrics: DataMapperCacheMetrics = {
    hits: 0,
    misses: 0,
    operations: 0,
    avgResponseTime: 0,
    lastResetTime: new Date(),
  };

  constructor(private readonly redisService: RedisService) {}

  private get redis(): Redis {
    return this.redisService.getOrThrow();
  }

  /**
   * 🎯 缓存最佳匹配规则
   */
  async cacheBestMatchingRule(
    provider: string,
    apiType: 'rest' | 'stream',
    transDataRuleListType: string,
    rule: FlexibleMappingRuleResponseDto
  ): Promise<void> {
    const startTime = Date.now();
    const cacheKey = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
    
    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
        JSON.stringify(rule)
      );
      
      this.logger.debug('最佳匹配规则已缓存', {
        provider,
        apiType,
        transDataRuleListType,
        dataMapperRuleId: rule.id,
        cacheKey
      });

      this.updateMetrics(DataMapperCacheOperation.SET, Date.now() - startTime);
    } catch (error) {
      this.logger.warn('缓存最佳匹配规则失败', {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔍 获取缓存的最佳匹配规则
   */
  async getCachedBestMatchingRule(
    provider: string,
    apiType: 'rest' | 'stream',
    transDataRuleListType: string
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const startTime = Date.now();
    const cacheKey = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
    
    try {
      const cachedValue = await this.redis.get(cacheKey);
      
      if (cachedValue) {
        this.metrics.hits++;
        this.logger.debug('最佳匹配规则缓存命中', {
          provider,
          apiType,
          transDataRuleListType
        });
        
        const rule = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto;
        this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, true);
        return rule;
      }
      
      this.metrics.misses++;
      this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, false);
      return null;
    } catch (error) {
      this.logger.warn('获取最佳匹配规则缓存失败', {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message
      });
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * 🎯 缓存规则内容（根据ID）
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    if (!rule.id) {
      this.logger.warn('尝试缓存没有ID的规则，已跳过', {
        ruleName: rule.name,
        provider: rule.provider
      });
      return;
    }

    const startTime = Date.now();
    const cacheKey = this.buildRuleByIdKey(rule.id);
    
    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
        JSON.stringify(rule)
      );
      
      this.logger.debug('规则内容已缓存', {
        dataMapperRuleId: rule.id,
        ruleName: rule.name,
        provider: rule.provider
      });

      this.updateMetrics(DataMapperCacheOperation.SET, Date.now() - startTime);
    } catch (error) {
      this.logger.warn('缓存规则内容失败', {
        dataMapperRuleId: rule.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔍 获取缓存的规则内容
   */
  async getCachedRuleById(dataMapperRuleId: string): Promise<FlexibleMappingRuleResponseDto | null> {
    const startTime = Date.now();
    const cacheKey = this.buildRuleByIdKey(dataMapperRuleId);
    
    try {
      const cachedValue = await this.redis.get(cacheKey);
      
      if (cachedValue) {
        this.metrics.hits++;
        this.logger.debug('规则内容缓存命中', { dataMapperRuleId });
        
        const rule = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto;
        this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, true);
        return rule;
      }
      
      this.metrics.misses++;
      this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, false);
      return null;
    } catch (error) {
      this.logger.warn('获取规则内容缓存失败', {
        dataMapperRuleId,
        error: error.message
      });
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * 🎯 缓存提供商规则列表
   */
  async cacheProviderRules(
    provider: string,
    apiType: 'rest' | 'stream',
    rules: FlexibleMappingRuleResponseDto[]
  ): Promise<void> {
    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);
    
    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES,
        JSON.stringify(rules)
      );
      
      this.logger.debug('提供商规则列表已缓存', {
        provider,
        apiType,
        rulesCount: rules.length
      });

      this.updateMetrics(DataMapperCacheOperation.SET, Date.now() - startTime);
    } catch (error) {
      this.logger.warn('缓存提供商规则列表失败', {
        provider,
        apiType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔍 获取缓存的提供商规则列表
   */
  async getCachedProviderRules(
    provider: string,
    apiType: 'rest' | 'stream'
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);
    
    try {
      const cachedValue = await this.redis.get(cacheKey);
      
      if (cachedValue) {
        this.metrics.hits++;
        const rules = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto[];
        this.logger.debug('提供商规则列表缓存命中', {
          provider,
          apiType,
          rulesCount: rules.length
        });
        
        this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, true);
        return rules;
      }
      
      this.metrics.misses++;
      this.updateMetrics(DataMapperCacheOperation.GET, Date.now() - startTime, false);
      return null;
    } catch (error) {
      this.logger.warn('获取提供商规则列表缓存失败', {
        provider,
        apiType,
        error: error.message
      });
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * 🧹 失效规则相关缓存
   */
  async invalidateRuleCache(dataMapperRuleId: string, rule?: FlexibleMappingRuleResponseDto): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // 失效规则ID缓存
      keysToDelete.push(this.buildRuleByIdKey(dataMapperRuleId));

      if (rule) {
        // 失效最佳匹配缓存
        keysToDelete.push(this.buildBestRuleKey(
          rule.provider,
          rule.apiType as 'rest' | 'stream',
          rule.transDataRuleListType
        ));

        // 失效提供商规则列表缓存
        keysToDelete.push(this.buildProviderRulesKey(
          rule.provider,
          rule.apiType as 'rest' | 'stream'
        ));
      }

      // 批量删除
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        
        this.logger.log('规则相关缓存已失效', {
          dataMapperRuleId,
          invalidatedKeys: keysToDelete.length
        });

        this.updateMetrics(DataMapperCacheOperation.DELETE, 0);
      }
    } catch (error) {
      this.logger.error('失效规则缓存失败', {
        dataMapperRuleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🧹 失效提供商相关缓存
   */
  async invalidateProviderCache(provider: string): Promise<void> {
    try {
      // 构建匹配模式
      const patterns = [
        `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:*`,
        `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:${provider}:*`,
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      this.logger.log('提供商相关缓存已失效', { provider });
      this.updateMetrics(DataMapperCacheOperation.PATTERN_DELETE, 0);
    } catch (error) {
      this.logger.error('失效提供商缓存失败', {
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🧹 清空所有规则缓存
   */
  async clearAllRuleCache(): Promise<void> {
    try {
      const patterns = Object.values(DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS).map(prefix => `${prefix}:*`);
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      this.logger.log('所有规则缓存已清空');
      this.updateMetrics(DataMapperCacheOperation.CLEAR, 0);
    } catch (error) {
      this.logger.error('清空规则缓存失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 🔥 缓存预热
   */
  async warmupCache(commonRules: FlexibleMappingRuleResponseDto[]): Promise<void> {
    this.logger.log('开始规则缓存预热', { rulesCount: commonRules.length });

    const startTime = Date.now();
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    for (const rule of commonRules) {
      if (!rule.id) {
        skipped++;
        this.logger.warn('预热缓存时跳过没有ID的规则', {
          ruleName: rule.name,
          provider: rule.provider
        });
        continue;
      }

      try {
        // 缓存规则内容
        await this.cacheRuleById(rule);

        // 如果是默认规则，也缓存为最佳匹配
        if (rule.isDefault) {
          await this.cacheBestMatchingRule(
            rule.provider,
            rule.apiType as 'rest' | 'stream',
            rule.transDataRuleListType,
            rule
          );
        }

        cached++;
      } catch (error) {
        failed++;
        this.logger.warn('预热规则缓存失败', {
          dataMapperRuleId: rule.id,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log('规则缓存预热完成', { 
      cached, 
      failed, 
      skipped, 
      total: commonRules.length,
      duration: `${duration}ms`
    });

    this.updateMetrics(DataMapperCacheOperation.WARMUP, duration);
  }

  /**
   * 📊 获取缓存统计
   */
  async getCacheStats(): Promise<DataMapperCacheStatsDto> {
    try {
      // 获取各类型缓存的数量
      const [bestRuleKeys, ruleByIdKeys, providerRulesKeys] = await Promise.all([
        this.redis.keys(`${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:*`),
        this.redis.keys(`${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.RULE_BY_ID}:*`),
        this.redis.keys(`${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:*`),
      ]);

      const totalRequests = this.metrics.hits + this.metrics.misses;
      const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

      return {
        bestRuleCacheSize: bestRuleKeys.length,
        ruleByIdCacheSize: ruleByIdKeys.length,
        providerRulesCacheSize: providerRulesKeys.length,
        totalCacheSize: bestRuleKeys.length + ruleByIdKeys.length + providerRulesKeys.length,
        hitRate,
        avgResponseTime: this.metrics.avgResponseTime,
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', { error: error.message });
      return {
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0,
        providerRulesCacheSize: 0,
        totalCacheSize: 0,
        hitRate: 0,
        avgResponseTime: 0,
      };
    }
  }

  // ===== 私有方法 =====

  /**
   * 构建最佳规则缓存键
   */
  private buildBestRuleKey(provider: string, apiType: string, transDataRuleListType: string): string {
    return `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:${apiType}:${transDataRuleListType}`;
  }

  /**
   * 构建规则ID缓存键
   */
  private buildRuleByIdKey(dataMapperRuleId: string): string {
    return `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.RULE_BY_ID}:${dataMapperRuleId}`;
  }

  /**
   * 构建提供商规则列表缓存键
   */
  private buildProviderRulesKey(provider: string, apiType: string): string {
    return `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:${provider}:${apiType}`;
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(operation: DataMapperCacheOperation, responseTime: number, isHit?: boolean): void {
    this.metrics.operations++;
    
    if (isHit !== undefined) {
      if (isHit) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
    }

    // 更新平均响应时间
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.operations - 1) + responseTime) / this.metrics.operations;
  }
}