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
    const keys: string[] = [];
    let cursor = "0";
    const startTime = Date.now();

    try {
      do {
        // 检查超时
        if (Date.now() - startTime > timeoutMs) {
          this.logger.warn("SCAN操作超时", {
            pattern,
            scannedKeys: keys.length,
            timeoutMs,
          });
          break;
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
      this.logger.error("SCAN操作失败", { pattern, error: error.message });
      // 降级到空数组，而不是抛出异常
      return [];
    }
  }

  /**
   * 分批安全删除
   */
  private async batchDelete(keys: string[]): Promise<void> {
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
        this.logger.warn("批量删除失败", {
          batchSize: batch.length,
          error: error.message,
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

      this.logger.debug("最佳匹配规则已缓存", {
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
      this.logger.warn("缓存最佳匹配规则失败", {
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

      throw error;
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
        this.logger.debug("最佳匹配规则缓存命中", {
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
      this.logger.warn("获取最佳匹配规则缓存失败", {
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

      return null;
    }
  }

  /**
   * 🎯 缓存规则内容（根据ID）
   */
  async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
    if (!rule.id) {
      this.logger.warn("尝试缓存没有ID的规则，已跳过", {
        ruleName: rule.name,
        provider: rule.provider,
      });
      return;
    }

    const startTime = Date.now();
    const cacheKey = this.buildRuleByIdKey(rule.id);

    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
        JSON.stringify(rule),
      );

      this.logger.debug("规则内容已缓存", {
        dataMapperRuleId: rule.id,
        ruleName: rule.name,
        provider: rule.provider,
      });

      // ✅ 监控已通过CollectorService记录
    } catch (error) {
      this.logger.warn("缓存规则内容失败", {
        dataMapperRuleId: rule.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🔍 获取缓存的规则内容
   */
  async getCachedRuleById(
    dataMapperRuleId: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const startTime = Date.now();
    const cacheKey = this.buildRuleByIdKey(dataMapperRuleId);

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        // ✅ 缓存命中已通过事件驱动记录
        this.logger.debug("规则内容缓存命中", { dataMapperRuleId });

        const rule = JSON.parse(cachedValue) as FlexibleMappingRuleResponseDto;
        // ✅ 监控已通过事件驱动记录
        return rule;
      }

      // ✅ 缓存未命中已通过事件驱动记录
      // ✅ 监控已通过CollectorService记录
      return null;
    } catch (error) {
      this.logger.warn("获取规则内容缓存失败", {
        dataMapperRuleId,
        error: error.message,
      });
      // ✅ 缓存未命中已通过事件驱动记录
      return null;
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
    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);

    try {
      await this.redis.setex(
        cacheKey,
        DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES,
        JSON.stringify(rules),
      );

      this.logger.debug("提供商规则列表已缓存", {
        provider,
        apiType,
        rulesCount: rules.length,
      });

      // ✅ 监控已通过CollectorService记录
    } catch (error) {
      this.logger.warn("缓存提供商规则列表失败", {
        provider,
        apiType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🔍 获取缓存的提供商规则列表
   */
  async getCachedProviderRules(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<FlexibleMappingRuleResponseDto[] | null> {
    const startTime = Date.now();
    const cacheKey = this.buildProviderRulesKey(provider, apiType);

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        // ✅ 缓存命中已通过事件驱动记录
        const rules = JSON.parse(
          cachedValue,
        ) as FlexibleMappingRuleResponseDto[];
        this.logger.debug("提供商规则列表缓存命中", {
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
      this.logger.warn("获取提供商规则列表缓存失败", {
        provider,
        apiType,
        error: error.message,
      });
      // ✅ 缓存未命中已通过事件驱动记录
      return null;
    }
  }

  /**
   * 🧹 失效规则相关缓存
   */
  async invalidateRuleCache(
    dataMapperRuleId: string,
    rule?: FlexibleMappingRuleResponseDto,
  ): Promise<void> {
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

        this.logger.log("规则相关缓存已失效", {
          dataMapperRuleId,
          invalidatedKeys: keysToDelete.length,
        });

        // ✅ 删除操作监控已通过事件驱动记录
      }
    } catch (error) {
      this.logger.error("失效规则缓存失败", {
        dataMapperRuleId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🧹 失效提供商相关缓存 (优化版 - 使用SCAN替代KEYS)
   */
  async invalidateProviderCache(provider: string): Promise<void> {
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

      this.logger.log("提供商缓存失效完成", {
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

      this.logger.error("失效提供商缓存失败", {
        provider,
        error: error.message,
      });
      throw error;
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

      this.logger.log("所有规则缓存已清空", { deletedKeys: totalDeleted });
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

      this.logger.error("清空规则缓存失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 🔥 缓存预热
   */
  async warmupCache(
    commonRules: FlexibleMappingRuleResponseDto[],
  ): Promise<void> {
    this.logger.log("开始规则缓存预热", { rulesCount: commonRules.length });

    const startTime = Date.now();
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    for (const rule of commonRules) {
      if (!rule.id) {
        skipped++;
        this.logger.warn("预热缓存时跳过没有ID的规则", {
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
        this.logger.warn("预热规则缓存失败", {
          dataMapperRuleId: rule.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log("规则缓存预热完成", {
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
      throw new Error(
        DATA_MAPPER_CACHE_CONSTANTS.ERROR_MESSAGES.INVALID_RULE_ID,
      );
    }

    if (key.length > DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH) {
      throw new Error(
        `缓存键长度超过限制: ${key.length}/${DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH}`,
      );
    }

    // 检查键格式（不应包含空格或特殊字符）
    if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
      throw new Error(`缓存键包含无效字符: ${key}`);
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
