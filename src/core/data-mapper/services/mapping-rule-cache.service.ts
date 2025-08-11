import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { CacheService } from '../../../cache/services/cache.service';
import { FlexibleMappingRuleResponseDto } from '../dto/flexible-mapping-rule.dto';

/**
 * 🚀 映射规则缓存服务
 * 专门为映射规则提供高性能的Redis缓存层
 */
@Injectable()
export class MappingRuleCacheService {
  private readonly logger = createLogger(MappingRuleCacheService.name);

  // 缓存键前缀
  private readonly CACHE_KEYS = {
    BEST_RULE: 'mapping_rule:best',           // 最佳匹配规则
    RULE_BY_ID: 'mapping_rule:by_id',         // 根据ID缓存规则
    PROVIDER_RULES: 'mapping_rule:provider',   // 按提供商缓存规则列表
    RULE_STATS: 'mapping_rule:stats',         // 规则统计信息
  };

  // 缓存TTL设置 (秒)
  private readonly CACHE_TTL = {
    BEST_RULE: 1800,      // 30分钟 - 最佳规则相对稳定
    RULE_BY_ID: 3600,     // 1小时 - 规则内容较少变更
    PROVIDER_RULES: 900,  // 15分钟 - 规则列表可能变更
    RULE_STATS: 300,      // 5分钟 - 统计信息更新频繁
  };

  constructor(
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 🎯 缓存最佳匹配规则
   */
  async cacheBestMatchingRule(
    provider: string,
    apiType: 'rest' | 'stream',
    transDataRuleListType: string,
    rule: FlexibleMappingRuleResponseDto
  ): Promise<void> {
    const cacheKey = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
    
    try {
      await this.cacheService.set(
        cacheKey,
        rule,
        { ttl: this.CACHE_TTL.BEST_RULE }
      );
      
      this.logger.debug('最佳匹配规则已缓存', {
        provider,
        apiType,
        transDataRuleListType,
        dataMapperRuleId: rule.id,
        cacheKey
      });
    } catch (error) {
      this.logger.warn('缓存最佳匹配规则失败', {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message
      });
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
    const cacheKey = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
    
    try {
      const cachedRule = await this.cacheService.get<FlexibleMappingRuleResponseDto>(cacheKey);
      
      if (cachedRule) {
        this.logger.debug('最佳匹配规则缓存命中', {
          provider,
          apiType,
          transDataRuleListType,
          dataMapperRuleId: cachedRule.id
        });
      }
      
      return cachedRule;
    } catch (error) {
      this.logger.warn('获取最佳匹配规则缓存失败', {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 🎯 缓存规则内容（根据ID）
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    const cacheKey = this.buildRuleByIdKey(rule.id);
    
    try {
      await this.cacheService.set(
        cacheKey,
        rule,
        { ttl: this.CACHE_TTL.RULE_BY_ID }
      );
      
      this.logger.debug('规则内容已缓存', {
        dataMapperRuleId: rule.id,
        ruleName: rule.name,
        provider: rule.provider
      });
    } catch (error) {
      this.logger.warn('缓存规则内容失败', {
        dataMapperRuleId: rule.id,
        error: error.message
      });
    }
  }

  /**
   * 🔍 获取缓存的规则内容
   */
  async getCachedRuleById(dataMapperRuleId: string): Promise<FlexibleMappingRuleResponseDto | null> {
    const cacheKey = this.buildRuleByIdKey(dataMapperRuleId);
    
    try {
      const cachedRule = await this.cacheService.get<FlexibleMappingRuleResponseDto>(cacheKey);
      
      if (cachedRule) {
        this.logger.debug('规则内容缓存命中', { dataMapperRuleId });
      }
      
      return cachedRule;
    } catch (error) {
      this.logger.warn('获取规则内容缓存失败', {
        dataMapperRuleId,
        error: error.message
      });
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
    const cacheKey = this.buildProviderRulesKey(provider, apiType);
    
    try {
      await this.cacheService.set(
        cacheKey,
        rules,
        { ttl: this.CACHE_TTL.PROVIDER_RULES }
      );
      
      this.logger.debug('提供商规则列表已缓存', {
        provider,
        apiType,
        rulesCount: rules.length
      });
    } catch (error) {
      this.logger.warn('缓存提供商规则列表失败', {
        provider,
        apiType,
        error: error.message
      });
    }
  }

  /**
   * 🔍 获取缓存的提供商规则列表
   */
  async getCachedProviderRules(
    provider: string,
    apiType: 'rest' | 'stream'
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    const cacheKey = this.buildProviderRulesKey(provider, apiType);
    
    try {
      const cachedRules = await this.cacheService.get<FlexibleMappingRuleResponseDto[]>(cacheKey);
      
      if (cachedRules) {
        this.logger.debug('提供商规则列表缓存命中', {
          provider,
          apiType,
          rulesCount: cachedRules.length
        });
      }
      
      return cachedRules;
    } catch (error) {
      this.logger.warn('获取提供商规则列表缓存失败', {
        provider,
        apiType,
        error: error.message
      });
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
        await this.cacheService.del(keysToDelete);
        
        this.logger.log('规则相关缓存已失效', {
          dataMapperRuleId,
          invalidatedKeys: keysToDelete.length
        });
      }
    } catch (error) {
      this.logger.error('失效规则缓存失败', {
        dataMapperRuleId,
        error: error.message
      });
    }
  }

  /**
   * 🧹 失效提供商相关缓存
   */
  async invalidateProviderCache(provider: string): Promise<void> {
    try {
      // 构建匹配模式
      const patterns = [
        `${this.CACHE_KEYS.BEST_RULE}:${provider}:*`,
        `${this.CACHE_KEYS.PROVIDER_RULES}:${provider}:*`,
      ];

      for (const pattern of patterns) {
        await this.cacheService.delByPattern(pattern);
      }

      this.logger.log('提供商相关缓存已失效', { provider });
    } catch (error) {
      this.logger.error('失效提供商缓存失败', {
        provider,
        error: error.message
      });
    }
  }

  /**
   * 🧹 清空所有规则缓存
   */
  async clearAllRuleCache(): Promise<void> {
    try {
      const patterns = Object.values(this.CACHE_KEYS).map(prefix => `${prefix}:*`);
      
      for (const pattern of patterns) {
        await this.cacheService.delByPattern(pattern);
      }

      this.logger.log('所有规则缓存已清空');
    } catch (error) {
      this.logger.error('清空规则缓存失败', { error: error.message });
    }
  }

  /**
   * 📊 获取缓存统计
   */
  async getCacheStats(): Promise<{
    bestRuleCacheSize: number;
    ruleByIdCacheSize: number;
    providerRulesCacheSize: number;
    totalCacheSize: number;
  }> {
    try {
      // 注意：这里是一个简化的统计实现
      // 实际生产中可能需要使用Redis的SCAN命令来统计键数量
      return {
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0, 
        providerRulesCacheSize: 0,
        totalCacheSize: 0,
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', { error: error.message });
      return {
        bestRuleCacheSize: 0,
        ruleByIdCacheSize: 0,
        providerRulesCacheSize: 0,
        totalCacheSize: 0,
      };
    }
  }

  /**
   * 🔄 预热缓存 - 缓存常用规则
   */
  async warmupCache(commonRules: FlexibleMappingRuleResponseDto[]): Promise<void> {
    this.logger.log('开始规则缓存预热', { rulesCount: commonRules.length });

    let cached = 0;
    let failed = 0;

    for (const rule of commonRules) {
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

    this.logger.log('规则缓存预热完成', { cached, failed, total: commonRules.length });
  }

  // ===== 私有方法 =====

  /**
   * 构建最佳规则缓存键
   */
  private buildBestRuleKey(provider: string, apiType: string, transDataRuleListType: string): string {
    return `${this.CACHE_KEYS.BEST_RULE}:${provider}:${apiType}:${transDataRuleListType}`;
  }

  /**
   * 构建规则ID缓存键
   */
  private buildRuleByIdKey(dataMapperRuleId: string): string {
    return `${this.CACHE_KEYS.RULE_BY_ID}:${dataMapperRuleId}`;
  }

  /**
   * 构建提供商规则列表缓存键
   */
  private buildProviderRulesKey(provider: string, apiType: string): string {
    return `${this.CACHE_KEYS.PROVIDER_RULES}:${provider}:${apiType}`;
  }

  /**
   * 构建统计信息缓存键
   */
  private buildStatsKey(provider?: string, apiType?: string): string {
    const suffix = provider && apiType ? `${provider}:${apiType}` : 'global';
    return `${this.CACHE_KEYS.RULE_STATS}:${suffix}`;
  }
}