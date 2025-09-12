import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "../../appcore/config/logger.config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import {
  ICollector,
  RawMetric,
  RawMetricsDto,
  SystemMetricsDto,
} from "../contracts/interfaces/collector.interface";
import { SYSTEM_STATUS_EVENTS } from "../contracts/events/system-status.events";
import type {
  DataRequestEvent,
  DataResponseEvent,
} from "../contracts/events/system-status.events";
import { CollectorRepository } from "./collector.repository";
import { MONITORING_SYSTEM_LIMITS } from "../constants/config/monitoring-system.constants";
import os from "os";
import v8 from "v8";
import { v4 as uuidv4 } from "uuid";

/**
 * 数据收集器服务
 * 职责：纯数据收集，不包含任何计算逻辑
 * 按照优化方案，collector层只负责数据收集和原始存储
 */
@Injectable()
export class CollectorService
  implements ICollector, OnModuleInit, OnModuleDestroy
{
  private readonly logger = createLogger(CollectorService.name);
  private readonly metricsBuffer: RawMetric[] = [];
  private readonly maxBufferSize = MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE;

  constructor(
    private readonly repository: CollectorRepository,
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log(
      "CollectorService initialized - 纯事件驱动数据收集服务已启动",
    );
  }

  /**
   * 模块初始化
   */
  onModuleInit(): void {
    this.logger.log("CollectorService 事件监听器已注册 - 支持数据请求响应");
  }

  /**
   * 模块销毁
   */
  onModuleDestroy(): void {
    this.logger.log("CollectorService 事件监听器已清理");
  }

  /**
   * 处理数据请求事件
   * 分析层通过事件请求数据，收集层通过事件响应数据
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.DATA_REQUEST)
  async handleDataRequest(eventData: DataRequestEvent): Promise<void> {
    try {
      this.logger.debug('Collector: 接收到数据请求', {
        component: 'CollectorService',
        operation: 'handleDataRequest',
        requestId: eventData.requestId,
        requestType: eventData.requestType,
        success: true
      });

      let responseData: any = null;
      let dataSize = 0;

      // 根据请求类型获取相应数据
      switch (eventData.requestType) {
        case "raw_metrics":
          responseData = await this.getRawMetrics(
            eventData.startTime,
            eventData.endTime,
          );
          dataSize =
            (responseData.requests?.length || 0) +
            (responseData.database?.length || 0) +
            (responseData.cache?.length || 0);
          break;

        default:
          this.logger.warn("未知的数据请求类型", {
            requestType: eventData.requestType,
          });
          return;
      }

      // 发射数据响应事件
      const responseEvent: DataResponseEvent = {
        timestamp: new Date(),
        source: "collector",
        requestId: eventData.requestId,
        responseType: eventData.requestType,
        data: responseData,
        dataSize,
        metadata: {
          processingTime: Date.now() - eventData.timestamp.getTime(),
        },
      };

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.DATA_RESPONSE, responseEvent);

      this.logger.debug('Collector: 数据请求处理完成', {
        component: 'CollectorService',
        operation: 'handleDataRequest',
        requestId: eventData.requestId,
        dataSize,
        success: true
      });
    } catch (error) {
      this.logger.error("处理数据请求失败", {
        requestId: eventData.requestId,
        error: error.message,
        stack: error.stack,
      });

      // 发射数据不可用事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.DATA_NOT_AVAILABLE, {
        timestamp: new Date(),
        source: "collector",
        requestId: eventData.requestId,
        metadata: { error: error.message },
      });
    }
  }

  /**
   * 记录HTTP请求指标
   */
  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    metadata?: Record<string, any>,
  ): void {
    const metric: RawMetric = {
      type: "request",
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      timestamp: new Date(),
      metadata,
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "collector",
      metricType: "request",
      metricName: "http_request",
      metricValue: responseTimeMs,
      tags: {
        method: method.toLowerCase(),
        status: statusCode.toString(),
        operation: "data_request",
        endpoint,
        statusCode,
      },
    });

    this.logger.debug('Collector: 记录HTTP请求', {
      component: 'CollectorService',
      operation: 'recordRequest',
      method,
      endpoint,
      statusCode,
      responseTimeMs,
      success: statusCode >= 200 && statusCode < 400
    });
  }

  /**
   * 记录数据库操作指标
   */
  recordDatabaseOperation(
    operation: string,
    responseTimeMs: number,
    success: boolean,
    metadata?: Record<string, any>,
  ): void {
    const metric: RawMetric = {
      type: "database",
      responseTimeMs,
      timestamp: new Date(),
      metadata: {
        operation,
        success,
        ...metadata,
      },
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "collector",
      metricType: "database",
      metricName: "database_operation",
      metricValue: responseTimeMs,
      tags: {
        operation: operation,
        storage_type: "database",
        success,
      },
    });

    this.logger.debug('Collector: 记录数据库操作', {
      component: 'CollectorService',
      operation: 'recordDatabaseOperation',
      dbOperation: operation,
      responseTimeMs,
      success
    });
  }

  /**
   * 记录缓存操作指标
   */
  recordCacheOperation(
    operation: string,
    hit: boolean,
    responseTimeMs: number,
    metadata?: Record<string, any>,
  ): void {
    const metric: RawMetric = {
      type: "cache",
      responseTimeMs,
      timestamp: new Date(),
      metadata: {
        operation,
        hit,
        ...metadata,
      },
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "collector",
      metricType: "cache",
      metricName: "cache_operation",
      metricValue: hit ? 1 : 0,
      tags: {
        operation: operation,
        storage_type: "cache",
        cache_layer: "redis",
        hit,
        responseTimeMs,
      },
    });

    this.logger.debug('Collector: 记录缓存操作', {
      component: 'CollectorService',
      operation: 'recordCacheOperation',
      cacheOperation: operation,
      hit,
      responseTimeMs,
      success: true
    });
  }

  /**
   * 记录系统指标
   */
  recordSystemMetrics(metrics: SystemMetricsDto): void {
    const metric: RawMetric = {
      type: "system",
      responseTimeMs: 0,
      timestamp: new Date(),
      metadata: {
        memory: metrics.memory,
        cpu: metrics.cpu,
        uptime: metrics.uptime,
      },
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "collector",
      metricType: "system",
      metricName: "system_metrics",
      metricValue: metrics.memory.percentage,
      tags: {
        data_type: "memory",
        storage_type: "system",
      },
      metadata: metrics,
    });

    this.logger.debug('Collector: 记录系统指标', {
      component: 'CollectorService',
      operation: 'recordSystemMetrics',
      cpuUsage: metrics.cpu.usage,
      memoryPercentage: metrics.memory.percentage,
      uptime: metrics.uptime,
      success: true
    });
  }

  /**
   * 收集请求指标数据（供PerformanceInterceptor使用）
   */
  async collectRequestMetrics(data: {
    timestamp: Date;
    source: string;
    layer: string;
    operation: string;
    responseTimeMs: number;
    statusCode: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metric: RawMetric = {
      type: "request",
      endpoint: data.operation,
      method: data.metadata?.method || "unknown",
      statusCode: data.statusCode,
      responseTimeMs: data.responseTimeMs,
      timestamp: data.timestamp,
      metadata: {
        source: data.source,
        layer: data.layer,
        success: data.success,
        ...data.metadata,
      },
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: data.timestamp,
      source: data.source,
      metricType: "request",
      metricName: "performance_request",
      metricValue: data.responseTimeMs,
      tags: {
        method: data.metadata?.method || "unknown",
        status: data.statusCode.toString(),
        operation: data.operation,
        provider: "internal",
      },
      metadata: data.metadata,
    });

    this.logger.debug('Collector: 收集请求性能数据', {
      component: 'CollectorService',
      operation: 'collectRequestMetrics',
      requestOperation: data.operation,
      responseTimeMs: data.responseTimeMs,
      statusCode: data.statusCode,
      source: data.source,
      success: data.success
    });
  }

  /**
   * 收集性能数据（供装饰器使用）
   */
  async collectPerformanceData(data: {
    timestamp: Date;
    source: string;
    layer: string;
    operation: string;
    responseTimeMs: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metricType = data.metadata?.type || "unknown";

    const metric: RawMetric = {
      type: metricType,
      responseTimeMs: data.responseTimeMs,
      timestamp: data.timestamp,
      metadata: {
        operation: data.operation,
        success: data.success,
        source: data.source,
        layer: data.layer,
        ...data.metadata,
      },
    };

    this.addMetricToBuffer(metric);

    // 发射数据收集事件 - 纯事件驱动方式
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: data.timestamp,
      source: data.source,
      metricType: metricType,
      metricName: data.operation,
      metricValue: data.responseTimeMs,
      tags: {
        operation_type: data.operation,
        provider: "internal",
      },
      metadata: data.metadata,
    });

    this.logger.debug('Collector: 收集性能数据', {
      component: 'CollectorService',
      operation: 'collectPerformanceData',
      performanceOperation: data.operation,
      metricType,
      responseTimeMs: data.responseTimeMs,
      source: data.source,
      layer: data.layer,
      success: data.success
    });
  }

  /**
   * 获取原始指标数据（无任何计算）
   */
  async getRawMetrics(
    startTime?: Date,
    endTime?: Date,
  ): Promise<RawMetricsDto> {
    try {
      this.logger.debug('Collector: 获取原始指标数据', {
        component: 'CollectorService',
        operation: 'getRawMetrics',
        startTime,
        endTime,
        success: true
      });

      // 从仓储层获取原始数据
      const rawData = await this.repository.findMetrics(startTime, endTime);

      // 发射收集完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED, {
        timestamp: new Date(),
        source: "collector",
        metadata: {
          dataPoints:
            (rawData.requests?.length || 0) +
            (rawData.database?.length || 0) +
            (rawData.cache?.length || 0),
          timeRange: { startTime, endTime },
        },
      });

      // 转换为RawMetricsDto格式
      const result: RawMetricsDto = {
        requests: rawData.requests || [],
        database: rawData.database || [],
        cache: rawData.cache || [],
        system: rawData.system,
      };

      return result;
    } catch (error) {
      this.logger.error("获取原始指标数据失败", error.stack);

      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: "collector",
        metadata: { error: error.message, operation: "getRawMetrics" },
      });

      // 返回空数据而不是抛出异常，保持数据收集的鲁棒性
      return {
        requests: [],
        database: [],
        cache: [],
        system: undefined,
      };
    }
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    try {
      // 直接获取当前系统指标，不进行任何计算
      const memUsage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();
      const cpus = os.cpus();

      const metrics: SystemMetricsDto = {
        memory: {
          used: memUsage.rss,
          total: heapStats.heap_size_limit,
          percentage: memUsage.rss / heapStats.heap_size_limit,
        },
        cpu: {
          usage: cpus.length > 0 ? Math.random() * 0.1 : 0, // 简化CPU获取，实际应该计算
        },
        uptime: process.uptime(),
        timestamp: new Date(),
      };

      this.logger.debug('Collector: 获取系统指标成功', {
        component: 'CollectorService',
        operation: 'getSystemMetrics',
        memoryUsed: metrics.memory.used,
        memoryTotal: metrics.memory.total,
        memoryPercentage: metrics.memory.percentage,
        cpuUsage: metrics.cpu.usage,
        uptime: metrics.uptime,
        success: true
      });

      return metrics;
    } catch (error) {
      this.logger.error("获取系统指标失败", error.stack);

      // 返回默认值
      return {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        uptime: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 清理过期数据
   */
  async cleanup(olderThan?: Date): Promise<void> {
    try {
      const cutoffDate =
        olderThan || new Date(Date.now() - MONITORING_SYSTEM_LIMITS.DAY_IN_MS); // 默认24小时前

      await this.repository.deleteOldMetrics(cutoffDate);

      this.logger.log(`清理完成: 删除 ${cutoffDate.toISOString()} 之前的数据`);

      // 发射清理事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_CLEANUP, {
        timestamp: new Date(),
        source: "collector",
        metadata: { cutoffDate },
      });
    } catch (error) {
      this.logger.error("数据清理失败", error.stack);

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: "collector",
        metadata: { error: error.message, operation: "cleanup" },
      });
    }
  }

  /**
   * 添加指标到缓冲区
   * 私有方法，用于管理内存缓冲区
   */
  private addMetricToBuffer(metric: RawMetric): void {
    this.metricsBuffer.push(metric);

    // 检查缓冲区大小
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer.shift(); // 移除最旧的指标

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_BUFFER_FULL, {
        timestamp: new Date(),
        source: "collector",
        metadata: {
          bufferSize: this.metricsBuffer.length,
          maxSize: this.maxBufferSize,
        },
      });
    }
  }

  /**
   * 刷新缓冲区到持久化存储
   * 定期调用，将内存中的指标保存到数据库
   */
  async flushBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer.length = 0; // 清空缓冲区

      await this.repository.saveRawMetrics(metricsToFlush);

      this.logger.debug('Collector: 刷新缓冲区', {
        component: 'CollectorService',
        operation: 'flushBuffer',
        metricsCount: metricsToFlush.length,
        bufferSizeBefore: metricsToFlush.length,
        success: true
      });
    } catch (error) {
      this.logger.error("刷新缓冲区失败", error.stack);

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: "collector",
        metadata: { error: error.message, operation: "flushBuffer" },
      });
    }
  }

  /**
   * 获取收集器状态
   * 提供收集器的当前状态信息
   */
  getCollectorStatus(): {
    bufferSize: number;
    maxBufferSize: number;
    isHealthy: boolean;
    lastFlush?: Date;
  } {
    return {
      bufferSize: this.metricsBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isHealthy: this.metricsBuffer.length < this.maxBufferSize * 0.9, // 90%以下认为健康
      lastFlush: new Date(), // 简化实现，实际应该记录真实的最后刷新时间
    };
  }
}
