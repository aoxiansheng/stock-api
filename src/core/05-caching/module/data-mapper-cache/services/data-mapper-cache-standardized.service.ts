/**
 * 标准化数据映射缓存服务（聚焦核心能力，移除监控/诊断与事件）
 *
 * 保留：
 * - 基础缓存操作与批处理
 * - 数据映射领域缓存（最佳匹配/按ID/按提供商）
 */

import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createLogger } from '@common/logging/index';
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from '@common/core/exceptions';
import { DATA_MAPPER_ERROR_CODES } from '@core/00-prepare/data-mapper/constants/data-mapper-error-codes.constants';

// Foundation 结果与选项类型（保留最小集）
import {
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  BaseCacheResult,
  CacheOperationOptions,
  CacheBatchResult,
  BatchOperationOptions,
} from '../../../foundation/types/cache-result.types';
import type { CacheUnifiedConfigInterface, CacheConfigValidationResult } from '../../../foundation/types/cache-config.types';
import { ModuleInitOptions } from '../../../foundation/types/cache-module.types';

// Business logic imports
import { IDataMapperCache } from '../interfaces/data-mapper-cache.interface';
import { FlexibleMappingRuleResponseDto } from '../../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import type { RuleLookupOptions } from '@core/00-prepare/data-mapper/types/rule-lookup-options.type';
import type { RuleListType } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';
import { parseRuleListType } from '../../../../00-prepare/data-mapper/utils/rule-list-type.util';
import {
  normalizeLowercaseString,
  normalizeUppercaseString,
} from '../../../../00-prepare/data-mapper/utils/string-normalize.util';
// 聚焦核心：移除未使用的常量导入

/**
 * 标准化数据映射缓存服务 (零历史包袱版本)
 *
 * 特点：
 * - 实现 IDataMapperCache，保持业务逻辑兼容
 * - 支持高级缓存操作和批量处理
 */
@Injectable()
export class DataMapperCacheStandardizedService
  implements IDataMapperCache, OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(DataMapperCacheStandardizedService.name);
  private readonly businessLogger = createLogger('DataMapperCacheStandardized');

  // Module state management
  private _isInitialized = false;
  private _isHealthy = false;
  private _config: CacheUnifiedConfigInterface;

  // Performance metrics tracking
  private readonly stats = {
    operations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    lastResetTime: new Date(),
  };

  constructor(
    @Inject('DATA_MAPPER_REDIS_CLIENT') private readonly redis: Redis,
    @Inject('dataMapperCacheConfig') private readonly initialConfig: CacheUnifiedConfigInterface,
  ) {
    this._config = initialConfig;
    this.businessLogger.log('DataMapperCacheStandardizedService (Clean Version) initialized');
  }

  // 元信息（非强依赖，仅内部说明）
  readonly moduleType = 'data-mapper-cache';
  readonly moduleCategory = 'specialized' as const;
  readonly supportedFeatures = ['data-mapping-cache', 'flexible-rules', 'batch-operations'] as const;
  readonly dependencies = ['redis'];
  readonly priority = 3;
  get name(): string { return 'DataMapperCacheStandardized'; }
  get version(): string { return '3.0.0'; }
  get description(): string { return 'Clean standardized data mapper cache with flexible rule support'; }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  get config(): CacheUnifiedConfigInterface {
    return this._config;
  }

  set config(newConfig: CacheUnifiedConfigInterface) {
    this._config = newConfig;
  }

  // ========================================
  // Lifecycle Management Methods
  // ========================================

  async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {
    try {
      this.businessLogger.log('Initializing DataMapperCacheStandardizedService...');

      this.config = config;
      this._isInitialized = true;
      this._isHealthy = true;

      // 事件发射移除：聚焦核心缓存功能

      this.businessLogger.log('DataMapperCacheStandardizedService initialized successfully');
    } catch (error) {
      this._isHealthy = false;
      this.businessLogger.error('Failed to initialize DataMapperCacheStandardizedService', error);
      throw error;
    }
  }

  async onModuleInit(): Promise<void> {
    // Initialize with default config if not already initialized
    if (!this._isInitialized) {
      await this.initialize(this._config);
    }
  }

  async destroy(): Promise<void> {
    await this.onModuleDestroy();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.businessLogger.log('Destroying DataMapperCacheStandardizedService...');

      this._isHealthy = false;
      this._isInitialized = false;

      // 事件发射移除：聚焦核心缓存功能

      this.businessLogger.log('DataMapperCacheStandardizedService destroyed successfully');
    } catch (error) {
      this.businessLogger.error('Error during DataMapperCacheStandardizedService destruction', error);
    }
  }

  // 监控状态接口已移除（统一由系统监控层处理）

  validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Configuration is required for data mapper cache');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================
  // Configuration Management
  // ========================================

  getModuleSpecificConfig<T = any>(): T {
    return {
      ruleMapping: true,
      providerSpecific: true,
      bestMatching: true,
      ruleValidation: true,
      circuitBreaker: true,
    } as T;
  }

  validateModuleSpecificConfig<T = any>(config: T): CacheConfigValidationResult {
    return { isValid: true, errors: [], warnings: [] };
  }

  async applyConfigUpdate(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.businessLogger.log('Data mapper cache configuration updated');
  }

  async refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    await this.applyConfigUpdate(newConfig);
  }

  // ========================================
  // Basic Cache Operations
  // ========================================

  async get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.get(key);
      if (result !== null) {
        this.stats.cacheHits++;
        const data = JSON.parse(result);
        return this.createGetResult<T>(key, data, true, startTime);
      } else {
        this.stats.cacheMisses++;
        return this.createGetResult<T>(key, null, false, startTime);
      }
    } catch (error) {
      this.stats.errors++;
      return this.createGetResult<T>(key, null, false, startTime, undefined, error);
    }
  }

  async set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const ttl = options?.ttl || this.config.defaultTtlSeconds;
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return this.createSetResult(key, startTime, ttl);
    } catch (error) {
      this.stats.errors++;
      return this.createSetResult(key, startTime, 0, error);
    }
  }

  async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.del(key);
      return this.createDeleteResult(key, startTime, result);
    } catch (error) {
      this.stats.errors++;
      return this.createDeleteResult(key, startTime, 0, error);
    }
  }

  async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.exists(key);
      return this.createBasicResult<boolean>(result === 1, 'get', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBasicResult<boolean>(false, 'get', startTime, error);
    }
  }

  async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.ttl(key);
      return this.createBasicResult<number>(result, 'get', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBasicResult<number>(-1, 'get', startTime, error);
    }
  }

  async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.expire(key, ttl);
      return this.createBasicResult<boolean>(result === 1, 'set', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBasicResult<boolean>(false, 'set', startTime, error);
    }
  }

  async increment(key: string, increment?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.incrby(key, increment || 1);
      return this.createBasicResult<number>(result, 'set', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBasicResult<number>(0, 'set', startTime, error);
    }
  }

  async decrement(key: string, decrement?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.decrby(key, decrement || 1);
      return this.createBasicResult<number>(result, 'set', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBasicResult<number>(0, 'set', startTime, error);
    }
  }

  async setIfNotExists<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const ttl = options?.ttl || this.config.defaultTtlSeconds;
      const result = await this.redis.set(key, JSON.stringify(value), 'EX', ttl, 'NX');
      return this.createSetResult(key, startTime, ttl, result === null ? new Error('Key already exists') : undefined);
    } catch (error) {
      this.stats.errors++;
      return this.createSetResult(key, startTime, 0, error);
    }
  }

  // ========================================
  // Advanced Operations
  // ========================================

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options?: CacheOperationOptions
  ): Promise<CacheGetResult<T>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const cached = await this.get<T>(key, options);
      if (cached.hit && cached.data !== null) {
        return cached;
      }

      const value = await Promise.resolve(factory());
      await this.set(key, value, options);
      return this.createGetResult<T>(key, value, false, startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createGetResult<T>(key, null, false, startTime, undefined, error);
    }
  }

  async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      const batchResults = keys.map((key, index) => {
        const [err, result] = results![index];
        if (err) {
          return { key, success: false, error: err.message };
        }
        return { key, success: true, data: result ? JSON.parse(result as string) : null };
      });

      return this.createBatchResult<T>(keys, 'get', startTime, batchResults);
    } catch (error) {
      this.stats.errors++;
      return this.createBatchResult<T>(keys, 'get', startTime, [], error);
    }
  }

  async batchSet<T = any>(items: Array<{key: string, value: T, ttl?: number}>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const pipeline = this.redis.pipeline();
      items.forEach(item => {
        const ttl = item.ttl || this.config.defaultTtlSeconds;
        pipeline.setex(item.key, ttl, JSON.stringify(item.value));
      });
      await pipeline.exec();

      return this.createBatchResult<boolean>(items.map(i => i.key), 'set', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBatchResult<boolean>(items.map(i => i.key), 'set', startTime, [], error);
    }
  }

  async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const result = await this.redis.del(...keys);
      return this.createBatchResult<boolean>(keys, 'delete', startTime);
    } catch (error) {
      this.stats.errors++;
      return this.createBatchResult<boolean>(keys, 'delete', startTime, [], error);
    }
  }

  async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    this.stats.operations++;
    const startTime = Date.now();

    try {
      const scanPattern = pattern || '*';
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', scanPattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      return this.createDeleteResult(pattern || '*', startTime, deletedCount);
    } catch (error) {
      this.stats.errors++;
      return this.createDeleteResult(pattern || '*', startTime, 0, error);
    }
  }

  // ========================================
  // Business Logic Methods (IDataMapperCache)
  // ========================================

  // 移除旧式/非接口化的领域方法（避免重复 API）

  // Additional IDataMapperCache methods (with correct signatures)
  async cacheBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType: string | undefined,
    rule: FlexibleMappingRuleResponseDto,
    options: RuleLookupOptions = {},
  ): Promise<void> {
    const cacheKey = this.buildBestRuleCacheKey(
      provider,
      apiType,
      transDataRuleListType,
      marketType,
      options,
    );
    await this.set(cacheKey, rule, { ttl: 1800 });
  }

  async getCachedBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType: string | undefined,
    options: RuleLookupOptions = {},
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const cacheKey = this.buildBestRuleCacheKey(
      provider,
      apiType,
      transDataRuleListType,
      marketType,
      options,
    );
    const result = await this.get<FlexibleMappingRuleResponseDto>(cacheKey);
    return result.data || null;
  }

  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    const cacheKey = `rule:id:${rule.id}`;
    await this.set(cacheKey, rule, { ttl: 3600 });
  }

  async getCachedRuleById(dataMapperRuleId: string): Promise<FlexibleMappingRuleResponseDto | null> {
    const cacheKey = `rule:id:${dataMapperRuleId}`;
    const result = await this.get<FlexibleMappingRuleResponseDto>(cacheKey);
    return result.data || null;
  }

  async cacheProviderRules(
    provider: string,
    apiType: "rest" | "stream",
    rules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    const normalizedProvider = this.normalizeRequiredProviderForCacheKey(
      provider,
      "cacheProviderRules",
    );
    const normalizedApiType = this.normalizeRequiredApiTypeForCacheKey(
      apiType,
      "cacheProviderRules",
    );
    const cacheKey = `rules:provider:${normalizedProvider}:${normalizedApiType}`;
    await this.set(cacheKey, rules, { ttl: 3600 });
  }

  async getCachedProviderRules(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    const normalizedProvider = this.normalizeRequiredProviderForCacheKey(
      provider,
      "getCachedProviderRules",
    );
    const normalizedApiType = this.normalizeRequiredApiTypeForCacheKey(
      apiType,
      "getCachedProviderRules",
    );
    const cacheKey = `rules:provider:${normalizedProvider}:${normalizedApiType}`;
    const result = await this.get<FlexibleMappingRuleResponseDto[]>(cacheKey);
    return result.data || null;
  }

  async invalidateRuleCache(
    dataMapperRuleId: string,
    rule?: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
    const cacheKey = `rule:id:${dataMapperRuleId}`;
    const deleteResult = await this.delete(cacheKey);
    this.ensureCacheDeleteSuccess(
      deleteResult,
      "invalidateRuleCache:rule:id",
      dataMapperRuleId,
    );

    const provider = this.normalizeKeyPart(rule?.provider);
    const apiType = this.parseApiType(rule?.apiType);
    const transDataRuleListType = parseRuleListType(rule?.transDataRuleListType);

    if (
      !provider ||
      !apiType ||
      !transDataRuleListType
    ) {
      return;
    }

    const escapedProvider = this.escapeRedisGlobLiteral(provider);
    const escapedApiType = this.escapeRedisGlobLiteral(apiType);
    const escapedRuleListType =
      this.escapeRedisGlobLiteral(transDataRuleListType);
    const bestRulePattern =
      `best_rule:${escapedProvider}:${escapedApiType}:${escapedRuleListType}:*`;
    const clearResult = await this.clear(bestRulePattern);
    this.ensureCacheDeleteSuccess(
      clearResult,
      "invalidateRuleCache:best_rule",
      dataMapperRuleId,
    );
  }

  async invalidateProviderCache(provider: string): Promise<void> {
    const normalizedProvider = this.normalizeRequiredProviderForCacheKey(
      provider,
      "invalidateProviderCache",
    );
    const escapedProvider = this.escapeRedisGlobLiteral(normalizedProvider);
    const bestRulePattern = `best_rule:${escapedProvider}:*`;
    await this.clear(bestRulePattern);
    const providerRulesPattern = `rules:provider:${escapedProvider}:*`;
    await this.clear(providerRulesPattern);
  }

  async clearAllRuleCache(): Promise<void> {
    const pattern = 'rule:*';
    await this.clear(pattern);
  }

  async warmupCache(commonRules: FlexibleMappingRuleResponseDto[]): Promise<void> {
    const batchItems = commonRules.map(rule => ({
      key: `rule:id:${rule.id}`,
      value: rule,
      ttl: 3600,
    }));
    await this.batchSet(batchItems);
  }

  // 监控/诊断/导入导出等非核心方法已移除

  // ========================================
  // Helper Methods
  // ========================================

  // 统计辅助方法裁剪

  private createGetResult<T>(
    key: string,
    data: T | null,
    hit: boolean,
    startTime: number,
    ttl?: number,
    error?: any
  ): CacheGetResult<T> {
    return {
      success: !error,
      status: error ? 'error' : 'success',
      operation: 'get',
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      key,
      data: data || undefined,
      hit,
      remainingTtl: ttl || 0,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    };
  }

  private createSetResult(key: string, startTime: number, ttl?: number, error?: any): CacheSetResult {
    return {
      success: !error,
      status: error ? 'error' : 'success',
      operation: 'set',
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      key,
      ttl: ttl || 0,
      replaced: false,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    };
  }

  private createDeleteResult(key: string, startTime: number, deletedCount?: number, error?: any): CacheDeleteResult {
    return {
      success: !error,
      status: error ? 'error' : 'success',
      operation: 'delete',
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      key,
      deletedCount: deletedCount || 0,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    };
  }

  private createBasicResult<T>(
    data: T,
    operation: string,
    startTime: number,
    error?: any
  ): BaseCacheResult<T> {
    return {
      success: !error,
      status: error ? 'error' : 'success',
      operation: operation as any,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      data,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    };
  }

  private createBatchResult<T>(
    keys: string[],
    operation: string,
    startTime: number,
    results?: any[],
    error?: any
  ): CacheBatchResult<T> {
    const successCount = results ? results.filter(r => r.success).length : (error ? 0 : keys.length);

    return {
      success: !error,
      status: error ? 'error' : 'success',
      operation: operation as any,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      results: results || keys.map(key => ({
        success: !error,
        status: error ? 'error' : 'success' as const,
        operation: operation as any,
        timestamp: Date.now(),
        key,
      })),
      successCount,
      failureCount: keys.length - successCount,
      totalCount: keys.length,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    };
  }

  private normalizeKeyPart(value: unknown): string {
    return normalizeLowercaseString(value);
  }

  private normalizeRequiredProviderForCacheKey(
    provider: unknown,
    operation: string,
  ): string {
    const normalizedProvider = this.normalizeKeyPart(provider);
    if (normalizedProvider) {
      return normalizedProvider;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: "Provider is required for data mapper cache key",
      context: {
        provider,
        dataMapperErrorCode: DATA_MAPPER_ERROR_CODES.INVALID_MAPPING_RULE_DATA,
      },
      retryable: false,
    });
  }

  private escapeRedisGlobLiteral(value: string): string {
    return value.replace(/([*?\[\]\\])/g, '\\$1');
  }

  private parseApiType(apiType: unknown): "rest" | "stream" | null {
    const normalizedApiType = this.normalizeKeyPart(apiType);
    if (normalizedApiType === 'rest' || normalizedApiType === 'stream') {
      return normalizedApiType;
    }
    return null;
  }

  private normalizeRequiredApiTypeForCacheKey(
    apiType: unknown,
    operation: string,
  ): "rest" | "stream" {
    const parsedApiType = this.parseApiType(apiType);
    if (parsedApiType) {
      return parsedApiType;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: "Invalid apiType for data mapper cache key",
      context: {
        apiType,
        dataMapperErrorCode: DATA_MAPPER_ERROR_CODES.INVALID_MAPPING_RULE_DATA,
      },
      retryable: false,
    });
  }

  private normalizeRequiredRuleListTypeForCacheKey(
    ruleListType: unknown,
    operation: string,
  ): RuleListType {
    const parsedRuleListType = parseRuleListType(ruleListType);
    if (parsedRuleListType) {
      return parsedRuleListType;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: "Invalid transDataRuleListType for data mapper cache key",
      context: {
        transDataRuleListType: ruleListType,
        dataMapperErrorCode: DATA_MAPPER_ERROR_CODES.INVALID_MAPPING_RULE_DATA,
      },
      retryable: false,
    });
  }

  private normalizeMarketType(marketType?: string): string {
    const normalizedMarketType = normalizeUppercaseString(marketType);
    if (!normalizedMarketType) {
      return "*";
    }
    return normalizedMarketType;
  }

  private ensureCacheDeleteSuccess(
    result: CacheDeleteResult,
    operation: string,
    dataMapperRuleId: string,
  ): void {
    if (result.success) {
      return;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER_CACHE,
      errorCode: BusinessErrorCode.CACHE_ERROR,
      operation,
      message: "Failed to invalidate data mapper cache",
      context: {
        dataMapperRuleId,
        key: result.key,
        cacheError: result.error,
      },
      retryable: true,
    });
  }

  private normalizeRuleLookupMode(options?: RuleLookupOptions): string {
    return options?.strictWildcardOnly ? 'strict_wildcard_only' : 'default';
  }

  private buildBestRuleCacheKey(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType: string | undefined,
    options: RuleLookupOptions = {},
  ): string {
    const normalizedProvider = this.normalizeRequiredProviderForCacheKey(
      provider,
      "buildBestRuleCacheKey",
    );
    const normalizedApiType = this.normalizeRequiredApiTypeForCacheKey(
      apiType,
      "buildBestRuleCacheKey",
    );
    const normalizedRuleListType = this.normalizeRequiredRuleListTypeForCacheKey(
      transDataRuleListType,
      "buildBestRuleCacheKey",
    );
    const keyMarketType = this.normalizeMarketType(marketType);
    const lookupMode = this.normalizeRuleLookupMode(options);
    return `best_rule:${normalizedProvider}:${normalizedApiType}:${normalizedRuleListType}:${keyMarketType}:${lookupMode}`;
  }
}
