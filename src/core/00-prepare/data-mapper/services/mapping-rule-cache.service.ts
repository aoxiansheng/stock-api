import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { DataMapperCacheService } from "../../../05-caching/data-mapper-cache/services/data-mapper-cache.service";
import { FlexibleMappingRuleResponseDto } from "../dto/flexible-mapping-rule.dto";

/**
 * 🚀 映射规则缓存服务 (重构版)
 * 使用专用的 DataMapperCacheService，实现职责分离
 *
 * 重构说明：
 * - 使用专用的 DataMapperCacheService
 * - 简化了缓存逻辑，专注于业务场景
 * - 保持了 API 兼容性
 */
@Injectable()
export class MappingRuleCacheService {
  private readonly logger = createLogger(MappingRuleCacheService.name);

  constructor(
    private readonly dataMapperCacheService: DataMapperCacheService,
  ) {}

  /**
   * 🎯 缓存最佳匹配规则
   */
  async cacheBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
    rule: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
    await this.dataMapperCacheService.cacheBestMatchingRule(
      provider,
      apiType,
      transDataRuleListType,
      rule,
    );
  }

  /**
   * 🔍 获取缓存的最佳匹配规则
   */
  async getCachedBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    return await this.dataMapperCacheService.getCachedBestMatchingRule(
      provider,
      apiType,
      transDataRuleListType,
    );
  }

  /**
   * 🎯 缓存规则内容（根据ID）
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    await this.dataMapperCacheService.cacheRuleById(rule);
  }

  /**
   * 🔍 获取缓存的规则内容
   */
  async getCachedRuleById(
    dataMapperRuleId: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    return await this.dataMapperCacheService.getCachedRuleById(
      dataMapperRuleId,
    );
  }

  /**
   * 🎯 缓存提供商规则列表
   */
  async cacheProviderRules(
    provider: string,
    apiType: "rest" | "stream",
    rules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    await this.dataMapperCacheService.cacheProviderRules(
      provider,
      apiType,
      rules,
    );
  }

  /**
   * 🔍 获取缓存的提供商规则列表
   */
  async getCachedProviderRules(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    return await this.dataMapperCacheService.getCachedProviderRules(
      provider,
      apiType,
    );
  }

  /**
   * 🧹 失效规则相关缓存
   */
  async invalidateRuleCache(
    dataMapperRuleId: string,
    rule?: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
    await this.dataMapperCacheService.invalidateRuleCache(
      dataMapperRuleId,
      rule,
    );
  }

  /**
   * 🧹 失效提供商相关缓存
   */
  async invalidateProviderCache(provider: string): Promise<void> {
    await this.dataMapperCacheService.invalidateProviderCache(provider);
  }

  /**
   * 🧹 清空所有规则缓存
   */
  async clearAllRuleCache(): Promise<void> {
    await this.dataMapperCacheService.clearAllRuleCache();
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
    return await this.dataMapperCacheService.getCacheStats();
  }

  /**
   * 🔄 预热缓存 - 缓存常用规则
   */
  async warmupCache(
    commonRules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    await this.dataMapperCacheService.warmupCache(commonRules);
  }
}
