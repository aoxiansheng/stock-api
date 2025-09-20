import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { DataMapperCacheService } from "../../../05-caching/data-mapper-cache/services/data-mapper-cache.service";
import { FlexibleMappingRuleResponseDto } from "../dto/flexible-mapping-rule.dto";

/**
 * 映射规则缓存服务
 *
 * ## 架构设计
 * - **缓存策略**: 基于 DataMapperCacheService 的分层缓存架构
 * - **键模式**:
 *   - 最佳规则: `data-mapper:best-rule:{provider}:{apiType}:{transDataRuleListType}`
 *   - 规则内容: `data-mapper:rule:{ruleId}`
 *   - 提供商规则: `data-mapper:provider-rules:{provider}:{apiType}`
 * - **故障容错**: 缓存失败不影响核心业务流程，返回null并记录日志
 *
 * ## API契约
 * - `cacheBestMatchingRule()`: 缓存最佳匹配规则，支持provider/apiType/transDataRuleListType组合
 * - `getCachedBestMatchingRule()`: 返回缓存的最佳规则或null，Redis故障时返回null
 * - `cacheRuleById()`: 根据规则ID缓存完整规则内容
 * - `getCachedRuleById()`: 根据ID获取规则，未找到或故障时返回null
 * - `invalidateRuleCache()`: 立即清除指定规则的所有缓存条目
 * - `clearAllRuleCache()`: 清除所有映射规则缓存
 *
 * ## 向前兼容性
 * - **V1 API**: 所有公共方法保持稳定的方法签名和返回类型
 * - **缓存键格式**: 使用固定前缀 `data-mapper:` 确保键名一致性
 * - **TTL配置**: 默认30分钟TTL，支持运行时动态配置
 * - **错误处理**: 统一的异常处理策略，缓存失败不抛出异常
 *
 * ## 性能特征
 * - **缓存命中率**: 目标 > 85% (最佳规则缓存)
 * - **平均响应时间**: < 10ms (缓存命中), < 100ms (缓存未命中)
 * - **内存占用**: < 50MB (1万条规则缓存)
 * - **并发支持**: 支持高并发读写，使用Redis分布式锁防止缓存击穿
 *
 * @since 1.0.0
 * @author Data Mapper Team
 */
@Injectable()
export class MappingRuleCacheService {
  private readonly logger = createLogger(MappingRuleCacheService.name);

  constructor(
    private readonly dataMapperCacheService: DataMapperCacheService,
  ) {}

  /**
   * 缓存最佳匹配规则
   *
   * @param provider 数据提供商名称 (如: "longport", "futu")
   * @param apiType API类型 ("rest" | "stream")
   * @param transDataRuleListType 规则类型 ("quote_fields" | "basic_info_fields" | "index_fields")
   * @param rule 要缓存的规则对象
   * @returns Promise<void> 缓存操作完成
   *
   * @example
   * ```typescript
   * await cacheService.cacheBestMatchingRule(
   *   "longport",
   *   "rest",
   *   "quote_fields",
   *   ruleObject
   * );
   * ```
   *
   * @throws 不抛出异常 - 缓存失败时记录日志并继续
   * @since 1.0.0
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
   * 获取缓存的最佳匹配规则
   *
   * @param provider 数据提供商名称
   * @param apiType API类型
   * @param transDataRuleListType 规则类型
   * @returns Promise<FlexibleMappingRuleResponseDto | null> 缓存的规则对象，未找到时返回null
   *
   * @example
   * ```typescript
   * const rule = await cacheService.getCachedBestMatchingRule(
   *   "longport",
   *   "rest",
   *   "quote_fields"
   * );
   * if (rule) {
   *   console.log('缓存命中:', rule.name);
   * }
   * ```
   *
   * @throws 不抛出异常 - Redis故障时返回null并记录警告日志
   * @since 1.0.0
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
   * 缓存规则内容（根据ID）
   *
   * @param rule 要缓存的完整规则对象
   * @returns Promise<void> 缓存操作完成
   *
   * @description 根据规则ID将完整的规则对象存储到缓存中，用于后续的快速检索
   *
   * @example
   * ```typescript
   * await cacheService.cacheRuleById({
   *   id: "rule_123",
   *   name: "LongPort股票行情映射",
   *   // ... 其他规则属性
   * });
   * ```
   *
   * @throws 不抛出异常 - 缓存失败时记录日志并继续
   * @since 1.0.0
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    await this.dataMapperCacheService.cacheRuleById(rule);
  }

  /**
   * 获取缓存的规则内容（根据ID）
   *
   * @param dataMapperRuleId 规则的唯一标识符
   * @returns Promise<FlexibleMappingRuleResponseDto | null> 缓存的规则对象，未找到时返回null
   *
   * @description 根据规则ID从缓存中检索完整的规则对象
   *
   * @example
   * ```typescript
   * const rule = await cacheService.getCachedRuleById("rule_123");
   * if (rule) {
   *   console.log('找到缓存规则:', rule.name);
   * } else {
   *   console.log('规则未在缓存中找到');
   * }
   * ```
   *
   * @throws 不抛出异常 - Redis故障时返回null并记录警告日志
   * @since 1.0.0
   */
  async getCachedRuleById(
    dataMapperRuleId: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    return await this.dataMapperCacheService.getCachedRuleById(
      dataMapperRuleId,
    );
  }

  /**
   * 缓存提供商规则列表
   *
   * @param provider 数据提供商名称 (如: "longport", "futu")
   * @param apiType API类型 ("rest" | "stream")
   * @param rules 要缓存的规则列表
   * @returns Promise<void> 缓存操作完成
   *
   * @description 将指定提供商的所有规则列表存储到缓存中，用于批量检索和管理
   *
   * @example
   * ```typescript
   * await cacheService.cacheProviderRules(
   *   "longport",
   *   "rest",
   *   [rule1, rule2, rule3]
   * );
   * ```
   *
   * @throws 不抛出异常 - 缓存失败时记录日志并继续
   * @since 1.0.0
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
   * 获取缓存的提供商规则列表
   *
   * @param provider 数据提供商名称
   * @param apiType API类型
   * @returns Promise<FlexibleMappingRuleResponseDto[] | null> 缓存的规则列表，未找到时返回null
   *
   * @description 根据提供商和API类型从缓存中获取相关的所有规则列表
   *
   * @example
   * ```typescript
   * const rules = await cacheService.getCachedProviderRules("longport", "rest");
   * if (rules && rules.length > 0) {
   *   console.log(`找到 ${rules.length} 条规则`);
   * }
   * ```
   *
   * @throws 不抛出异常 - Redis故障时返回null并记录警告日志
   * @since 1.0.0
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
   * 失效规则相关缓存
   *
   * @param dataMapperRuleId 规则ID
   * @param rule 可选的规则对象，用于确定需要清除的缓存键
   * @returns Promise<void> 清除操作完成
   *
   * @description 清除与指定规则相关的所有缓存条目，包括：
   * - 根据ID的规则缓存
   * - 最佳匹配规则缓存 (如果提供了rule参数)
   * - 相关的提供商规则列表缓存
   *
   * @example
   * ```typescript
   * // 仅清除规则ID缓存
   * await cacheService.invalidateRuleCache("rule_123");
   *
   * // 清除所有相关缓存
   * await cacheService.invalidateRuleCache("rule_123", ruleObject);
   * ```
   *
   * @throws 不抛出异常 - 失效操作失败时记录错误日志并继续
   * @since 1.0.0
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
   * 失效提供商相关缓存
   *
   * @param provider 数据提供商名称
   * @returns Promise<void> 清除操作完成
   *
   * @description 清除指定提供商相关的所有缓存条目，包括：
   * - 提供商规则列表缓存
   * - 最佳匹配规则缓存
   * - 相关的统计缓存
   *
   * @example
   * ```typescript
   * await cacheService.invalidateProviderCache("longport");
   * ```
   *
   * @throws 不抛出异常 - 失效操作失败时记录错误日志并继续
   * @since 1.0.0
   */
  async invalidateProviderCache(provider: string): Promise<void> {
    await this.dataMapperCacheService.invalidateProviderCache(provider);
  }

  /**
   * 清空所有规则缓存
   *
   * @returns Promise<void> 清除操作完成
   *
   * @description 清除映射规则相关的所有缓存条目，包括：
   * - 所有最佳匹配规则缓存
   * - 所有规则ID缓存
   * - 所有提供商规则列表缓存
   * - 相关的统计和元数据缓存
   *
   * @warning 此操作不可逆，会显著影响性能直到缓存重新建立
   *
   * @example
   * ```typescript
   * // 系统维护时清空所有缓存
   * await cacheService.clearAllRuleCache();
   * console.log('所有规则缓存已清空');
   * ```
   *
   * @throws 不抛出异常 - 清除操作失败时记录错误日志并继续
   * @since 1.0.0
   */
  async clearAllRuleCache(): Promise<void> {
    await this.dataMapperCacheService.clearAllRuleCache();
  }

  /**
   * 预热缓存 - 缓存常用规则
   *
   * @param commonRules 常用规则列表
   * @returns Promise<void> 预热操作完成
   *
   * @description 在系统启动或低峰期预先加载常用规则到缓存中，
   * 减少首次访问的延迟并提高整体性能
   *
   * @example
   * ```typescript
   * // 系统启动时预热缓存
   * const commonRules = await ruleService.getCommonlyUsedRules();
   * await cacheService.warmupCache(commonRules);
   * console.log(`已预热 ${commonRules.length} 条常用规则`);
   * ```
   *
   * @throws 不抛出异常 - 预热失败时记录错误日志并继续
   * @since 1.0.0
   */
  async warmupCache(
    commonRules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    await this.dataMapperCacheService.warmupCache(commonRules);
  }
}
