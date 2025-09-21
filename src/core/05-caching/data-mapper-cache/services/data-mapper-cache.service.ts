import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { FlexibleMappingRuleResponseDto } from "../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import { IDataMapperCache } from "../interfaces/data-mapper-cache.interface";
import {
  DATA_MAPPER_CACHE_CONSTANTS,
  DataMapperCacheOperation,
  DataMapperCacheMetrics,
} from "../constants/data-mapper-cache.constants";
import { DATA_MAPPER_CACHE_ERROR_CODES } from "../constants/data-mapper-cache-error-codes.constants";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode, BusinessException, UniversalRetryHandler } from "@common/core/exceptions";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";

/**
 * DataMapper 专用缓存服务
 * 专注于映射规则的缓存操作，简化业务逻辑
 */
@Injectable()
export class DataMapperCacheService implements IDataMapperCache {
  private readonly logger = createLogger(DataMapperCacheService.name);
  // ✅ 使用事件驱动监控，完全解耦业务逻辑

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventBus: EventEmitter2, // 事件驱动监控
  ) {}

  // 添加空值保护，处理可选注入场景
  /**
   * 事件化监控发送 - 异步、解耦、高性能
   * @param metricName 指标名称
   * @param metricValue 指标值（响应时间、数量等）
   * @param tags 标签数据
   */
  private emitMonitoringEvent(
    metricName: string,
    metricValue: number,
    tags: any,
  ): void {
    try {
      // 使用 setImmediate 实现真正的异步发送，不阻塞业务逻辑
      setImmediate(() => {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "data_mapper_cache",
          metricType: "cache",
          metricName,
          metricValue,
          tags: {
            service: "DataMapperCacheService",
            ...tags,
          },
        });
      });
    } catch (error) {
      // 事件发送失败不应影响业务逻辑，仅记录调试日志
      this.logger.debug("监控事件发送失败", {
        metricName,
        error: error.message,
      });
    }
  }

  /**
   * 优化的SCAN实现，支持超时和错误处理
   */
  private async scanKeysWithTimeout(
    pattern: string,
    timeoutMs: number = DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS
      .DEFAULT_SCAN_MS,
  ): Promise<string[]> {
    // 验证输入参数
    if (!pattern) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'scanKeysWithTimeout',
        message: 'Pattern is required',
        context: { pattern },
        retryable: false
      });
    }

    const keys: string[] = [];
    let cursor = "0";
    const startTime = Date.now();

    try {
      do {
        // 检查超时
        if (Date.now() - startTime > timeoutMs) {
          this.logger.warn("SCAN operation timed out", {
            pattern,
            scannedKeys: keys.length,
            timeoutMs,
          });
          
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.DATA_MAPPER_CACHE,
            errorCode: BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT,
            operation: 'scanKeysWithTimeout',
            message: 'SCAN operation timed out',
            context: { 
              pattern,
              scannedKeys: keys.length,
              timeoutMs
            },
            retryable: true
          });
        }

        const result = await this.redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.REDIS_SCAN_COUNT,
        );
        cursor = result[0];
        keys.push(...result[1]);
      } while (
        cursor !== "0" &&
        keys.length <
          DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.MAX_KEYS_PREVENTION
      ); // 防止内存过度使用

      return keys;
    } catch (error) {
      // 如果已经是BusinessException，则直接重新抛出
      if (BusinessException.isBusinessException(error)) {
        throw error;
      }
      
      this.logger.error("SCAN operation failed", { pattern, error: error.message });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'scanKeysWithTimeout',
        message: 'SCAN operation failed',
        context: { 
          pattern,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 分批安全删除
   */
  private async batchDelete(keys: string[]): Promise<void> {
    // 验证输入参数
    if (!keys || !Array.isArray(keys)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'batchDelete',
        message: 'Keys must be an array',
        context: { keys },
        retryable: false
      });
    }

    if (keys.length === 0) return;

    const BATCH_SIZE =
      DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.DELETE_BATCH_SIZE;
    const batches = [];

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      batches.push(keys.slice(i, i + BATCH_SIZE));
    }

    // 串行删除批次，避免Redis压力过大
    for (const batch of batches) {
      try {
        await this.redis.del(...batch);
        // 批次间短暂延迟，降低Redis负载
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.INTER_BATCH_DELAY_MS,
          ),
        );
      } catch (error) {
        this.logger.warn("Batch deletion failed", {
          batchSize: batch.length,
          error: error.message,
        });
        
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.DATA_MAPPER_CACHE,
          errorCode: BusinessErrorCode.CACHE_ERROR,
          operation: 'batchDelete',
          message: 'Batch deletion failed',
          context: { 
            batchSize: batch.length,
            error: error.message
          },
          retryable: true,
          originalError: error
        });
      }
    }
  }

  /**
   * 🎯 缓存最佳匹配规则
   */
  async cacheBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
    rule: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
    const startTime = Date.now();
    const cacheKey = this.buildBestRuleKey(
      provider,
      apiType,
      transDataRuleListType,
    );

    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
        JSON.stringify(rule),
      );

      this.logger.debug("Cached best matching rule", {
        provider,
        apiType,
        transDataRuleListType,
        dataMapperRuleId: rule.id,
        cacheKey,
      });

      // ✅ 事件化监控：缓存设置成功
      this.emitMonitoringEvent("cache_set_success", Date.now() - startTime, {
        cacheType: "redis",
        operation: "set",
        layer: "L2_best_matching_rule",
        key: cacheKey,
        ttl: DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
        status: "success",
      });
    } catch (error) {
      this.logger.warn("Failed to cache best matching rule", {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message,
      });

      // ✅ 事件化监控：缓存设置失败
      this.emitMonitoringEvent("cache_set_failed", Date.now() - startTime, {
        cacheType: "redis",
        operation: "set",
        layer: "L2_best_matching_rule",
        key: cacheKey,
        status: "error",
        error: error.message,
      });

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'cacheBestMatchingRule',
        message: 'Failed to cache best matching rule',
        context: { 
          provider,
          apiType,
          transDataRuleListType,
          cacheKey,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🔍 获取缓存的最佳匹配规则
   */
  async getCachedBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const startTime = Date.now();
    const cacheKey = this.buildBestRuleKey(
      provider,
      apiType,
      transDataRuleListType,
    );

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        // ✅ 缓存命中已通过事件驱动记录
        this.logger.debug("Best matching rule cache hit", {
          provider,
          apiType,
          transDataRuleListType,
        });

        // ✅ 事件化监控：缓存命中
        this.emitMonitoringEvent("cache_get_hit", Date.now() - startTime, {
          cacheType: "redis",
          operation: "get",
          layer: "L2_best_matching_rule",
          key: cacheKey,
          status: "success",
        });

        const rule = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto;
        return rule;
      }

      // ✅ 事件化监控：缓存未命中
      this.emitMonitoringEvent("cache_get_miss", Date.now() - startTime, {
        cacheType: "redis",
        operation: "get",
        layer: "L2_best_matching_rule",
        key: cacheKey,
        status: "miss",
      });

      return null;
    } catch (error) {
      this.logger.warn("Failed to get cached best matching rule", {
        provider,
        apiType,
        transDataRuleListType,
        error: error.message,
      });

      // ✅ 事件化监控：缓存获取错误
      this.emitMonitoringEvent("cache_get_error", Date.now() - startTime, {
        cacheType: "redis",
        operation: "get",
        layer: "L2_best_matching_rule",
        key: cacheKey,
        status: "error",
        error: error.message,
      });

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'getCachedBestMatchingRule',
        message: 'Failed to get cached best matching rule',
        context: { 
          provider,
          apiType,
          transDataRuleListType,
          cacheKey,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🎯 缓存规则内容（根据ID）
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    if (!rule.id) {
      this.logger.warn("Attempting to cache rule without ID, skipped", {
        ruleName: rule.name,
        provider: rule.provider,
      });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'cacheRuleById',
        message: 'Cannot cache rule without ID',
        context: { 
          ruleName: rule.name,
          provider: rule.provider
        },
        retryable: false
      });
    }

    const cacheKey = this.buildRuleByIdKey(rule.id);
    const serializedRule = JSON.stringify(rule);

    try {
      // 使用重试机制设置缓存
      await UniversalRetryHandler.networkRetry(
        async () => {
          const startTime = Date.now();
          
          await this.redis.setex(
            cacheKey,
            DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
            serializedRule,
          );
          
          return true;
        },
        'cacheRuleById',
        ComponentIdentifier.DATA_MAPPER_CACHE
      );

      this.logger.debug("Rule content cached", {
        dataMapperRuleId: rule.id,
        ruleName: rule.name,
        provider: rule.provider,
      });

      // ✅ 监控已通过CollectorService记录
    } catch (error) {
      this.logger.warn("Failed to cache rule content", {
        dataMapperRuleId: rule.id,
        error: error.message,
      });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'cacheRuleById',
        message: 'Failed to cache rule content',
        context: { 
          ruleId: rule.id, 
          provider: rule.provider,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🔍 获取缓存的规则内容
   */
  async getCachedRuleById(
    dataMapperRuleId: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    // 验证输入参数
    if (!dataMapperRuleId) {
      this.logger.warn("Rule ID is required for caching");
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getCachedRuleById',
        message: 'Rule ID is required',
        context: { dataMapperRuleId },
        retryable: false
      });
    }

    const cacheKey = this.buildRuleByIdKey(dataMapperRuleId);

    try {
      // 使用重试机制获取缓存
      const cachedValue = await UniversalRetryHandler.quickRetry(
        async () => {
          return await this.redis.get(cacheKey);
        },
        'getCachedRuleById',
        ComponentIdentifier.DATA_MAPPER_CACHE
      );

      if (cachedValue) {
        // ✅ 缓存命中已通过事件驱动记录
        this.logger.debug("Cache hit for rule content", { dataMapperRuleId });

        const rule = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto;
        // ✅ 监控已通过事件驱动记录
        return rule;
      }

      // ✅ 缓存未命中已通过事件驱动记录
      // ✅ 监控已通过CollectorService记录
      return null;
    } catch (error) {
      this.logger.warn("Failed to get cached rule content", {
        dataMapperRuleId,
        error: error.message,
      });
      
      // ✅ 缓存未命中已通过事件驱动记录
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'getCachedRuleById',
        message: 'Failed to get cached rule content',
        context: { 
          dataMapperRuleId,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🎯 缓存提供商规则列表
   */
  async cacheProviderRules(
    provider: string,
    apiType: "rest" | "stream",
    rules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    // 验证输入参数
    if (!provider) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'cacheProviderRules',
        message: 'Provider is required',
        context: { provider },
        retryable: false
      });
    }

    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);

    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES,
        JSON.stringify(rules),
      );

      this.logger.debug("Provider rules list cached", {
        provider,
        apiType,
        rulesCount: rules.length,
      });

      // ✅ 监控已通过CollectorService记录
    } catch (error) {
      this.logger.warn("Failed to cache provider rules list", {
        provider,
        apiType,
        error: error.message,
      });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'cacheProviderRules',
        message: 'Failed to cache provider rules list',
        context: { 
          provider,
          apiType,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🔍 获取缓存的提供商规则列表
   */
  async getCachedProviderRules(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    // 验证输入参数
    if (!provider) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getCachedProviderRules',
        message: 'Provider is required',
        context: { provider },
        retryable: false
      });
    }

    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        // ✅ 缓存命中已通过事件驱动记录
        const rules = JSON.parse(
          cachedValue,
        ) as FlexibleMappingRuleResponseDto[];
        this.logger.debug("Provider rules list cache hit", {
          provider,
          apiType,
          rulesCount: rules.length,
        });

        // ✅ 监控已通过事件驱动记录
        return rules;
      }

      // ✅ 缓存未命中已通过事件驱动记录
      // ✅ 监控已通过CollectorService记录
      return null;
    } catch (error) {
      this.logger.warn("Failed to get cached provider rules list", {
        provider,
        apiType,
        error: error.message,
      });
      
      // ✅ 缓存未命中已通过事件驱动记录
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'getCachedProviderRules',
        message: 'Failed to get cached provider rules list',
        context: { 
          provider,
          apiType,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🧹 失效规则相关缓存
   */
  async invalidateRuleCache(
    dataMapperRuleId: string,
    rule?: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
    // 验证输入参数
    if (!dataMapperRuleId) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'invalidateRuleCache',
        message: 'Rule ID is required',
        context: { dataMapperRuleId },
        retryable: false
      });
    }

    try {
      const keysToDelete: string[] = [];

      // 失效规则ID缓存
      keysToDelete.push(this.buildRuleByIdKey(dataMapperRuleId));

      if (rule) {
        // 失效最佳匹配缓存
        keysToDelete.push(
          this.buildBestRuleKey(
            rule.provider,
            rule.apiType as "rest" | "stream",
            rule.transDataRuleListType,
          ),
        );

        // 失效提供商规则列表缓存
        keysToDelete.push(
          this.buildProviderRulesKey(
            rule.provider,
            rule.apiType as "rest" | "stream",
          ),
        );
      }

      // 批量删除
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);

        this.logger.log("Rule related cache invalidated", {
          dataMapperRuleId,
          invalidatedKeys: keysToDelete.length,
        });

        // ✅ 删除操作监控已通过事件驱动记录
      }
    } catch (error) {
      this.logger.warn("Failed to invalidate rule cache", {
        dataMapperRuleId,
        error: error.message,
      });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'invalidateRuleCache',
        message: 'Failed to invalidate rule cache',
        context: { 
          dataMapperRuleId,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🧹 失效提供商相关缓存 (优化版 - 使用SCAN替代KEYS)
   */
  async invalidateProviderCache(provider: string): Promise<void> {
    // 验证输入参数
    if (!provider) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'invalidateProviderCache',
        message: 'Provider is required',
        context: { provider },
        retryable: false
      });
    }

    const startTime = Date.now();

    try {
      const patterns = [
        `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:*`,
        `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:${provider}:*`,
      ];

      let totalDeleted = 0;

      for (const pattern of patterns) {
        const keys = await this.scanKeysWithTimeout(
          pattern,
          DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.PROVIDER_INVALIDATE_MS,
        );
        await this.batchDelete(keys);
        totalDeleted += keys.length;
      }

      // 事件化监控：提供商缓存失效成功
      this.emitMonitoringEvent(
        "cache_invalidate_provider_success",
        Date.now() - startTime,
        {
          cacheType: "redis",
          operation: "delete",
          provider,
          deletedKeys: totalDeleted,
          status: "success",
        },
      );

      this.logger.log("Provider cache invalidation completed", {
        provider,
        deletedKeys: totalDeleted,
      });
    } catch (error) {
      // 事件化监控：提供商缓存失效失败
      this.emitMonitoringEvent(
        "cache_invalidate_provider_error",
        Date.now() - startTime,
        {
          cacheType: "redis",
          operation: "delete",
          provider,
          status: "error",
          error: error.message,
        },
      );

      this.logger.warn("Failed to invalidate provider cache", {
        provider,
        error: error.message,
      });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'invalidateProviderCache',
        message: 'Failed to invalidate provider cache',
        context: { 
          provider,
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🧹 清空所有规则缓存 (优化版 - 使用SCAN替代KEYS)
   */
  async clearAllRuleCache(): Promise<void> {
    const startTime = Date.now();

    try {
      const patterns = Object.values(
        DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS,
      ).map((prefix) => `${prefix}:*`);
      let totalDeleted = 0;

      for (const pattern of patterns) {
        const keys = await this.scanKeysWithTimeout(pattern, 5000);
        await this.batchDelete(keys);
        totalDeleted += keys.length;
      }

      // 事件化监控：清空所有缓存成功
      this.emitMonitoringEvent(
        "cache_clear_all_success",
        Date.now() - startTime,
        {
          cacheType: "redis",
          operation: "delete",
          deletedKeys: totalDeleted,
          status: "success",
        },
      );

      this.logger.log("All rule caches cleared", { deletedKeys: totalDeleted });
    } catch (error) {
      // 事件化监控：清空所有缓存失败
      this.emitMonitoringEvent(
        "cache_clear_all_error",
        Date.now() - startTime,
        {
          cacheType: "redis",
          operation: "delete",
          status: "error",
          error: error.message,
        },
      );

      this.logger.warn("Failed to clear rule caches", { error: error.message });
      
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.CACHE_ERROR,
        operation: 'clearAllRuleCache',
        message: 'Failed to clear rule caches',
        context: { 
          error: error.message
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🔥 缓存预热
   */
  async warmupCache(
    commonRules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    // 验证输入参数
    if (!commonRules || !Array.isArray(commonRules)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'warmupCache',
        message: 'Common rules must be an array',
        context: { commonRules },
        retryable: false
      });
    }

    this.logger.log("Starting rule cache warmup", { rulesCount: commonRules.length });

    const startTime = Date.now();
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    for (const rule of commonRules) {
      if (!rule.id) {
        skipped++;
        this.logger.warn("Skipping rule without ID during cache warmup", {
          ruleName: rule.name,
          provider: rule.provider,
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
            rule.apiType as "rest" | "stream",
            rule.transDataRuleListType,
            rule,
          );
        }

        cached++;
      } catch (error) {
        failed++;
        this.logger.warn("Failed to warmup rule cache", {
          dataMapperRuleId: rule.id,
          error: error.message,
        });
        
        // 不抛出异常，继续处理其他规则
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log("Rule cache warmup completed", {
      cached,
      failed,
      skipped,
      total: commonRules.length,
      duration: `${duration}ms`,
    });

    // ✅ 预热操作监控已通过事件驱动记录
  }


  // ===== 私有方法 =====

  /**
   * 验证缓存键的有效性
   * @private
   */
  private validateCacheKey(key: string): void {
    if (!key || typeof key !== "string") {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateCacheKey',
        message: 'Invalid rule ID or key',
        context: { key, errorType: DATA_MAPPER_CACHE_ERROR_CODES.INVALID_RULE_ID },
        retryable: false
      });
    }

    if (key.length > DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateCacheKey',
        message: `Cache key length exceeds limit: ${key.length}/${DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH}`,
        context: { 
          key, 
          length: key.length, 
          maxLength: DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH,
          errorType: DATA_MAPPER_CACHE_ERROR_CODES.KEY_LENGTH_EXCEEDED 
        },
        retryable: false
      });
    }

    // 检查键格式（不应包含空格或特殊字符）
    if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateCacheKey',
        message: `Cache key contains invalid characters: ${key}`,
        context: { 
          key, 
          pattern: '^[a-zA-Z0-9:_-]+$',
          errorType: DATA_MAPPER_CACHE_ERROR_CODES.INVALID_KEY_FORMAT 
        },
        retryable: false
      });
    }
  }

  /**
   * 构建最佳规则缓存键
   */
  private buildBestRuleKey(
    provider: string,
    apiType: string,
    transDataRuleListType: string,
  ): string {
    const cacheKey = `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:${apiType}:${transDataRuleListType}`;
    this.validateCacheKey(cacheKey);
    return cacheKey;
  }

  /**
   * 构建规则ID缓存键
   */
  private buildRuleByIdKey(dataMapperRuleId: string): string {
    const cacheKey = `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.RULE_BY_ID}:${dataMapperRuleId}`;
    this.validateCacheKey(cacheKey);
    return cacheKey;
  }

  /**
   * 构建提供商规则列表缓存键
   */
  private buildProviderRulesKey(provider: string, apiType: string): string {
    const cacheKey = `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:${provider}:${apiType}`;
    this.validateCacheKey(cacheKey);
    return cacheKey;
  }

  // ✅ 已迁移到事件驱动监控，实现完全解耦的监控架构
}
