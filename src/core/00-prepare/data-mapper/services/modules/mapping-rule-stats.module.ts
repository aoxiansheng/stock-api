/**
 * 映射规则统计模块
 *
 * 负责处理映射规则的统计、监控和性能数据
 * 作为 FlexibleMappingRuleService 的内部模块化组件
 *
 * Phase 2 模块化重构：解决 FlexibleMappingRuleService 职责过重问题
 */

import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FlexibleMappingRuleDocument } from '@core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';
import { CacheService } from '@cache/services/cache.service';
import { AsyncTaskLimiter } from '@core/00-prepare/data-mapper/utils/async-task-limiter';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

/**
 * 映射规则统计模块
 *
 * 职责范围：
 * - 规则使用统计跟踪
 * - 性能监控指标收集
 * - 批量统计更新处理
 * - 内存使用监控
 * - 监控事件发送
 * - Redis计数器管理
 */
@Injectable()
export class MappingRuleStatsModule {
  private readonly logger = new Logger(MappingRuleStatsModule.name);

  // 📊 批量统计更新相关属性（支持环境变量）
  private readonly statsUpdateQueue = new Map<string, { success: number; failure: number; lastUpdate: number }>();
  private readonly BATCH_UPDATE_INTERVAL = parseInt(process.env.DATA_MAPPER_BATCH_UPDATE_INTERVAL || '30000', 10); // 批量更新间隔 (ms)
  private readonly MAX_BATCH_SIZE = parseInt(process.env.DATA_MAPPER_MAX_BATCH_SIZE || '100', 10); // 最大批量更新条数
  private batchUpdateTimer?: NodeJS.Timeout;

  // 🚨 内存阈值监控配置（支持环境变量）
  private readonly MEMORY_THRESHOLD_MB = parseInt(process.env.DATA_MAPPER_MEMORY_THRESHOLD_MB || '50', 10); // 内存阈值 (MB)
  private readonly MEMORY_CHECK_INTERVAL = parseInt(process.env.DATA_MAPPER_MEMORY_CHECK_INTERVAL || '60000', 10); // 检查间隔 (ms)
  private memoryMonitorTimer?: NodeJS.Timeout;

  private readonly asyncLimiter = new AsyncTaskLimiter(
    parseInt(process.env.DATA_MAPPER_ASYNC_TASK_LIMIT || '30', 10) // 最大并发异步任务数
  );

  /**
   * 构造函数
   *
   * 支持的环境变量：
   * - DATA_MAPPER_MEMORY_THRESHOLD_MB: 内存阈值 (MB)，默认 50
   * - DATA_MAPPER_MEMORY_CHECK_INTERVAL: 内存检查间隔 (ms)，默认 60000
   * - DATA_MAPPER_BATCH_UPDATE_INTERVAL: 批量更新间隔 (ms)，默认 30000
   * - DATA_MAPPER_MAX_BATCH_SIZE: 最大批量更新条数，默认 100
   * - DATA_MAPPER_ASYNC_TASK_LIMIT: 最大并发异步任务数，默认 30
   */
  constructor(
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    private readonly eventBus: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {
    // 🔄 初始化批量统计更新定时器
    this.initBatchStatsUpdateTimer();
    // 🚨 初始化内存阈值监控
    this.initMemoryMonitoring();
  }

  /**
   * 📊 更新规则使用统计 (优化版 - 批量更新 + Redis计数器)
   */
  public async updateRuleStats(
    dataMapperRuleId: string,
    success: boolean,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 🚀 异步批量操作：添加到批量更新队列而不是立即更新数据库
      this.addStatsToQueue(dataMapperRuleId, success);

      // 🚀 引入Redis计数器缓存减少实时聚合计算
      // 使用Redis计数器来跟踪统计数据，减少数据库聚合计算
      const usageCountKey = `data_mapper:rule_stats:${dataMapperRuleId}:usage_count`;
      const successCountKey = `data_mapper:rule_stats:${dataMapperRuleId}:success_count`;
      const failureCountKey = `data_mapper:rule_stats:${dataMapperRuleId}:failure_count`;

      // 并行更新Redis计数器和获取当前值
      const [usageCount, successCount, failureCount] = await Promise.all([
        this.cacheService.incr(usageCountKey), // 使用计数
        success
          ? this.cacheService.incr(successCountKey)
          : this.cacheService.safeGet<number>(successCountKey) || 0,
        success
          ? this.cacheService.safeGet<number>(failureCountKey) || 0
          : this.cacheService.incr(failureCountKey)
      ]);

      // 设置24小时TTL（仅在第一次创建时）
      if (usageCount === 1) {
        await Promise.all([
          this.cacheService.expire(usageCountKey, 86400),
          this.cacheService.expire(successCountKey, 86400),
          this.cacheService.expire(failureCountKey, 86400)
        ]);
      }

      // 📊 计算成功率（基于Redis计数器）
      const totalTransformations = Number(successCount) + Number(failureCount);
      const successRate = totalTransformations > 0
        ? Number(successCount) / totalTransformations
        : 0;

      // 📈 监控记录 - 事件驱动（增加Redis计数器信息）
      this.emitMonitoringEvent("rule_stats_queued", {
        type: "cache",
        operation: "queueStatsUpdate",
        duration: Date.now() - startTime,
        ruleId: dataMapperRuleId,
        success: true,
        usageCount: Number(usageCount),
        successCount: Number(successCount),
        failureCount: Number(failureCount),
        successRate: Math.round(successRate * 100) / 100,
        redisCountersUsed: true,
        batchOperationUsed: true,
        queueSize: this.statsUpdateQueue.size
      });
    } catch (error) {
      // 监控记录失败情况 - 事件驱动
      this.emitMonitoringEvent("rule_stats_queue_failed", {
        type: "cache",
        operation: "queueStatsUpdate",
        duration: Date.now() - startTime,
        ruleId: dataMapperRuleId,
        success: false,
        error: error.message,
      });

      this.logger.error("统计更新队列操作失败", {
        dataMapperRuleId,
        success,
        error: error.message,
      });
      // 注意：不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 🎯 事件驱动监控事件发送
   * 替代直接调用 CollectorService，使用事件总线异步发送监控事件
   */
  public emitMonitoringEvent(metricName: string, data: any): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "data_mapper_rule",
        metricType: data.type || "business",
        metricName,
        metricValue: data.duration || data.value || 1,
        tags: {
          component: "flexible-mapping-rule",
          operation: data.operation,
          status: data.success ? "success" : "error",
          provider: data.provider,
          apiType: data.apiType,
          collection: data.collection,
          cacheType: data.cacheType,
          ruleId: data.ruleId,
          category: data.category,
          error: data.error,
          resultCount: data.resultCount,
          cacheHit: data.cacheHit,
          ruleFound: data.ruleFound,
          totalMappings: data.totalMappings,
          successfulMappings: data.successfulMappings,
          failedMappings: data.failedMappings,
          successRate: data.successRate,
        },
      });
    });
  }

  /**
   * 📊 初始化批量统计更新定时器
   */
  private initBatchStatsUpdateTimer(): void {
    this.batchUpdateTimer = setInterval(() => {
      this.processBatchStatsUpdate().catch((error) => {
        this.logger.error("批量统计更新失败", { error: error.message });
      });
    }, this.BATCH_UPDATE_INTERVAL);

    this.logger.log("批量统计更新定时器已初始化", {
      interval: this.BATCH_UPDATE_INTERVAL,
      maxBatchSize: this.MAX_BATCH_SIZE
    });
  }

  /**
   * 📊 添加统计更新到队列（异步批量操作）
   * 替代直接的数据库更新，提高性能
   */
  private addStatsToQueue(ruleId: string, success: boolean): void {
    const current = this.statsUpdateQueue.get(ruleId) || {
      success: 0,
      failure: 0,
      lastUpdate: Date.now()
    };

    if (success) {
      current.success += 1;
    } else {
      current.failure += 1;
    }
    current.lastUpdate = Date.now();

    this.statsUpdateQueue.set(ruleId, current);

    // 如果队列过大，立即触发批量更新
    if (this.statsUpdateQueue.size >= this.MAX_BATCH_SIZE) {
      this.asyncLimiter.schedule(() => this.processBatchStatsUpdate());
    }
  }

  /**
   * 📊 处理批量统计更新
   */
  private async processBatchStatsUpdate(): Promise<void> {
    if (this.statsUpdateQueue.size === 0) {
      return;
    }

    const startTime = Date.now();
    const updates = Array.from(this.statsUpdateQueue.entries());
    this.statsUpdateQueue.clear();

    try {
      // 🔧 MongoDB批量更新操作
      const bulkOps = updates.map(([ruleId, stats]) => ({
        updateOne: {
          filter: { _id: ruleId },
          update: {
            $inc: {
              usageCount: stats.success + stats.failure,
              successfulTransformations: stats.success,
              failedTransformations: stats.failure
            },
            $set: {
              lastUsedAt: new Date(stats.lastUpdate)
            }
          }
        }
      }));

      const result = await this.ruleModel.bulkWrite(bulkOps, { ordered: false });

      // 📈 监控记录
      this.emitMonitoringEvent("batch_stats_updated", {
        type: "database",
        operation: "bulkStatsUpdate",
        duration: Date.now() - startTime,
        batchSize: updates.length,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        success: true
      });

      this.logger.debug("批量统计更新完成", {
        batchSize: updates.length,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        duration: Date.now() - startTime
      });

      // 🔄 批量更新成功率（基于Redis计数器）
      await this.updateBatchSuccessRates(updates);

    } catch (error) {
      this.logger.error("批量统计更新失败", {
        batchSize: updates.length,
        error: error.message
      });

      // 📈 错误监控记录
      this.emitMonitoringEvent("batch_stats_update_failed", {
        type: "database",
        operation: "bulkStatsUpdate",
        duration: Date.now() - startTime,
        batchSize: updates.length,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 📊 批量更新成功率（基于Redis计数器）
   */
  private async updateBatchSuccessRates(updates: [string, { success: number; failure: number; lastUpdate: number }][]): Promise<void> {
    try {
      const successRateUpdates = await Promise.all(
        updates.map(async ([ruleId, stats]) => {
          const successCountKey = `data_mapper:rule_stats:${ruleId}:success_count`;
          const failureCountKey = `data_mapper:rule_stats:${ruleId}:failure_count`;

          const [successCount, failureCount] = await Promise.all([
            this.cacheService.safeGet<number>(successCountKey) || 0,
            this.cacheService.safeGet<number>(failureCountKey) || 0
          ]);

          const totalTransformations = Number(successCount) + Number(failureCount);
          const successRate = totalTransformations > 0
            ? Number(successCount) / totalTransformations
            : 0;

          return {
            updateOne: {
              filter: { _id: ruleId },
              update: {
                $set: {
                  successRate: Math.round(successRate * 10000) / 10000
                }
              }
            }
          };
        })
      );

      if (successRateUpdates.length > 0) {
        await this.ruleModel.bulkWrite(successRateUpdates, { ordered: false });
      }
    } catch (error) {
      this.logger.warn("批量更新成功率失败", { error: error.message });
    }
  }

  /**
   * 🚨 初始化内存阈值监控
   */
  private initMemoryMonitoring(): void {
    this.memoryMonitorTimer = setInterval(() => {
      this.checkMemoryUsage().catch((error) => {
        this.logger.error("内存监控检查失败", { error: error.message });
      });
    }, this.MEMORY_CHECK_INTERVAL);

    this.logger.log("内存阈值监控已初始化", {
      thresholdMB: this.MEMORY_THRESHOLD_MB,
      checkInterval: this.MEMORY_CHECK_INTERVAL
    });
  }

  /**
   * 🚨 检查内存使用情况
   */
  private async checkMemoryUsage(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100;
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100;
      const externalMB = Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100;

      // 📈 记录内存使用指标
      this.emitMonitoringEvent("memory_usage_check", {
        type: "system",
        operation: "memoryMonitoring",
        heapUsedMB,
        heapTotalMB,
        rssMB,
        externalMB,
        queueSize: this.statsUpdateQueue.size,
        pendingAsyncTasks: this.asyncLimiter.getPendingCount(),
        success: true
      });

      // 🚨 检查是否超过阈值
      if (heapUsedMB > this.MEMORY_THRESHOLD_MB) {
        this.logger.warn("内存使用超过阈值", {
          heapUsedMB,
          thresholdMB: this.MEMORY_THRESHOLD_MB,
          heapTotalMB,
          rssMB,
          queueSize: this.statsUpdateQueue.size,
          pendingAsyncTasks: this.asyncLimiter.getPendingCount()
        });

        // 🔧 触发内存优化措施
        await this.handleMemoryThresholdExceeded(heapUsedMB);
      }

      // 📊 详细日志（debug级别）
      this.logger.debug("内存使用情况", {
        heapUsedMB,
        heapTotalMB,
        rssMB,
        externalMB,
        thresholdMB: this.MEMORY_THRESHOLD_MB,
        queueSize: this.statsUpdateQueue.size,
        pendingAsyncTasks: this.asyncLimiter.getPendingCount()
      });

    } catch (error) {
      this.logger.error("内存使用检查失败", { error: error.message });
    }
  }

  /**
   * 🔧 处理内存阈值超限
   */
  private async handleMemoryThresholdExceeded(currentMemoryMB: number): Promise<void> {
    this.logger.warn("触发内存优化措施", {
      currentMemoryMB,
      thresholdMB: this.MEMORY_THRESHOLD_MB
    });

    try {
      // 1. 🚀 立即处理批量统计更新队列
      if (this.statsUpdateQueue.size > 0) {
        this.logger.log("内存优化：强制处理批量统计更新队列", {
          queueSize: this.statsUpdateQueue.size
        });
        await this.processBatchStatsUpdate();
      }

      // 2. 📈 触发内存压力监控事件
      this.emitMonitoringEvent("memory_threshold_exceeded", {
        type: "system",
        operation: "memoryOptimization",
        currentMemoryMB,
        thresholdMB: this.MEMORY_THRESHOLD_MB,
        queueSizeBeforeCleanup: this.statsUpdateQueue.size,
        pendingAsyncTasks: this.asyncLimiter.getPendingCount(),
        success: true,
        optimizationTriggered: true
      });

      // 3. 🔄 建议垃圾回收（Node.js会自动决定是否执行）
      if (global.gc) {
        global.gc();
        this.logger.debug("已建议垃圾回收");
      }

    } catch (error) {
      this.logger.error("内存优化措施执行失败", {
        error: error.message,
        currentMemoryMB
      });

      // 📈 错误监控记录
      this.emitMonitoringEvent("memory_optimization_failed", {
        type: "system",
        operation: "memoryOptimization",
        currentMemoryMB,
        thresholdMB: this.MEMORY_THRESHOLD_MB,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 🛡️ 验证缓存层JSON操作安全性
   * 测试JSON炸弹攻击防护和数据完整性
   */
  public async validateCacheJsonSecurity(): Promise<{
    jsonBombProtection: boolean;
    dataIntegrity: boolean;
    performanceWithinLimits: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let jsonBombProtection = false;
    let dataIntegrity = false;
    let performanceWithinLimits = false;

    this.logger.log("开始验证缓存层JSON操作安全性");

    try {
      // 🛡️ 测试1: JSON炸弹攻击防护
      try {
        // 创建一个超过1MB的大型JSON对象
        const largeObject = {
          data: 'a'.repeat(2 * 1024 * 1024), // 2MB字符串
          timestamp: new Date(),
          metadata: {
            source: 'security_test',
            size: '2MB'
          }
        };

        await this.cacheService.set('test:json_bomb', largeObject, { ttl: 60 });
        errors.push("JSON炸弹攻击防护失败：允许了超过1MB的数据");
      } catch (error) {
        if (error.message && error.message.includes('JSON size exceeds security limit')) {
          jsonBombProtection = true;
          this.logger.log("✅ JSON炸弹攻击防护测试通过");
        } else {
          errors.push(`JSON炸弹攻击防护测试异常: ${error.message}`);
        }
      }

      // 🔍 测试2: 正常数据完整性
      try {
        const testData = {
          ruleId: 'test_rule_123',
          mappings: [
            { source: 'field1', target: 'target1', confidence: 0.95 },
            { source: 'field2', target: 'target2', confidence: 0.87 }
          ],
          metadata: {
            createdAt: new Date(),
            version: '1.0.0',
            tags: ['test', 'validation']
          }
        };

        // 存储数据
        await this.cacheService.set('test:data_integrity', testData, { ttl: 60 });

        // 读取数据
        const retrievedData = await this.cacheService.get('test:data_integrity');

        // 验证数据完整性
        if (JSON.stringify(testData) === JSON.stringify(retrievedData)) {
          dataIntegrity = true;
          this.logger.log("✅ 数据完整性测试通过");
        } else {
          errors.push("数据完整性测试失败：存储和读取的数据不一致");
        }

        // 清理测试数据
        await this.cacheService.del('test:data_integrity');
      } catch (error) {
        errors.push(`数据完整性测试异常: ${error.message}`);
      }

      // ⚡ 测试3: 性能边界测试
      try {
        const startTime = Date.now();
        const mediumSizeData = {
          rules: Array.from({ length: 1000 }, (_, i) => ({
            id: `rule_${i}`,
            mappings: Array.from({ length: 10 }, (_, j) => ({
              source: `source_${i}_${j}`,
              target: `target_${i}_${j}`,
              confidence: Math.random()
            }))
          })),
          metadata: {
            totalRules: 1000,
            createdAt: new Date(),
            testType: 'performance_validation'
          }
        };

        await this.cacheService.set('test:performance', mediumSizeData, { ttl: 60 });
        const retrievedData = await this.cacheService.get('test:performance');
        await this.cacheService.del('test:performance');

        const duration = Date.now() - startTime;
        if (duration < 1000 && retrievedData) { // 1秒内完成
          performanceWithinLimits = true;
          this.logger.log(`✅ 性能测试通过，耗时: ${duration}ms`);
        } else {
          errors.push(`性能测试失败：操作耗时 ${duration}ms 超过预期`);
        }
      } catch (error) {
        errors.push(`性能测试异常: ${error.message}`);
      }

      // 📊 记录验证结果
      const result = {
        jsonBombProtection,
        dataIntegrity,
        performanceWithinLimits,
        errors
      };

      this.emitMonitoringEvent("cache_security_validation", {
        type: "security",
        operation: "validateCacheJsonSecurity",
        jsonBombProtection,
        dataIntegrity,
        performanceWithinLimits,
        errorCount: errors.length,
        success: errors.length === 0,
        allTestsPassed: jsonBombProtection && dataIntegrity && performanceWithinLimits
      });

      this.logger.log("缓存层JSON安全性验证完成", result);
      return result;

    } catch (error) {
      const errorMsg = `缓存安全性验证过程出错: ${error.message}`;
      errors.push(errorMsg);
      this.logger.error(errorMsg, { error: error.message });

      return {
        jsonBombProtection: false,
        dataIntegrity: false,
        performanceWithinLimits: false,
        errors
      };
    }
  }

  /**
   * 🔄 清理资源（用于模块销毁时）
   */
  public onDestroy(): void {
    // 清理批量统计更新定时器
    if (this.batchUpdateTimer) {
      clearInterval(this.batchUpdateTimer);
      this.logger.log("批量统计更新定时器已清理");
    }

    // 🚨 清理内存监控定时器
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
      this.logger.log("内存监控定时器已清理");
    }

    // 最后一次批量更新
    if (this.statsUpdateQueue.size > 0) {
      this.processBatchStatsUpdate().catch((error) => {
        this.logger.error("最终批量统计更新失败", { error: error.message });
      });
    }
  }
}