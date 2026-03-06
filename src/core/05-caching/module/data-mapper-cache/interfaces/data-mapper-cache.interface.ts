import { FlexibleMappingRuleResponseDto } from "../../../../../core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import type { RuleLookupOptions } from "@core/00-prepare/data-mapper/types/rule-lookup-options.type";
import type { RuleListType } from "@core/00-prepare/data-mapper/constants/data-mapper.constants";

/**
 * DataMapper 专用缓存接口
 * 专注于映射规则缓存的核心业务逻辑
 */
export interface IDataMapperCache {
  /**
   * 🎯 最佳匹配规则缓存
   */
  cacheBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType: string | undefined,
    rule: FlexibleMappingRuleResponseDto,
    options?: RuleLookupOptions,
  ): Promise<void>;

  getCachedBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType: string | undefined,
    options?: RuleLookupOptions,
  ): Promise<FlexibleMappingRuleResponseDto | null>;

  /**
   * 🆔 规则ID缓存
   */
  cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void>;
  getCachedRuleById(
    dataMapperRuleId: string,
  ): Promise<FlexibleMappingRuleResponseDto | null>;

  /**
   * 📋 提供商规则列表缓存
   */
  cacheProviderRules(
    provider: string,
    apiType: "rest" | "stream",
    rules: FlexibleMappingRuleResponseDto[],
  ): Promise<void>;

  getCachedProviderRules(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<FlexibleMappingRuleResponseDto[] | null>;

  /**
   * 🧹 缓存失效管理
   */
  invalidateRuleCache(
    dataMapperRuleId: string,
    rule?: FlexibleMappingRuleResponseDto,
  ): Promise<void>;
  invalidateProviderCache(provider: string): Promise<void>;
  clearAllRuleCache(): Promise<void>;

  /**
   * 🔥 缓存预热
   */
  warmupCache(commonRules: FlexibleMappingRuleResponseDto[]): Promise<void>;
}
