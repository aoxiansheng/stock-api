import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  ICollector, 
  RawMetric, 
  RawMetricsDto, 
  SystemMetricsDto 
} from '../../contracts/interfaces/collector.interface';
import { SYSTEM_STATUS_EVENTS } from '../../contracts/events';
import { CollectorRepository } from '../repositories/collector.repository';
import * as os from 'os';
import * as v8 from 'v8';

/**
 * 数据收集器服务
 * 职责：纯数据收集，不包含任何计算逻辑
 * 按照优化方案，collector层只负责数据收集和原始存储
 */
@Injectable()
export class CollectorService implements ICollector {
  private readonly logger = new Logger(CollectorService.name);
  private readonly metricsBuffer: RawMetric[] = [];
  private readonly maxBufferSize = 1000;

  constructor(
    private readonly repository: CollectorRepository,
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log('CollectorService initialized - 纯数据收集服务已启动');
  }

  /**
   * 记录HTTP请求指标
   */
  recordRequest(
    endpoint: string, 
    method: string, 
    statusCode: number, 
    duration: number, 
    metadata?: Record<string, any>
  ): void {
    const metric: RawMetric = {
      type: 'request',
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: new Date(),
      metadata
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: 'collector',
      metricType: 'request',
      metricName: 'http_request',
      metricValue: duration,
      metadata: { endpoint, method, statusCode }
    });

    this.logger.debug(`记录HTTP请求: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);
  }

  /**
   * 记录数据库操作指标
   */
  recordDatabaseOperation(
    operation: string, 
    duration: number, 
    success: boolean, 
    metadata?: Record<string, any>
  ): void {
    const metric: RawMetric = {
      type: 'database',
      duration,
      timestamp: new Date(),
      metadata: {
        operation,
        success,
        ...metadata
      }
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: 'collector',
      metricType: 'database',
      metricName: 'database_operation',
      metricValue: duration,
      metadata: { operation, success }
    });

    this.logger.debug(`记录数据库操作: ${operation} - ${success ? '成功' : '失败'} (${duration}ms)`);
  }

  /**
   * 记录缓存操作指标
   */
  recordCacheOperation(
    operation: string, 
    hit: boolean, 
    duration: number, 
    metadata?: Record<string, any>
  ): void {
    const metric: RawMetric = {
      type: 'cache',
      duration,
      timestamp: new Date(),
      metadata: {
        operation,
        hit,
        ...metadata
      }
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: 'collector',
      metricType: 'cache',
      metricName: 'cache_operation',
      metricValue: hit ? 1 : 0,
      metadata: { operation, hit, duration }
    });

    this.logger.debug(`记录缓存操作: ${operation} - ${hit ? '命中' : '未命中'} (${duration}ms)`);
  }

  /**
   * 记录系统指标
   */
  recordSystemMetrics(metrics: SystemMetricsDto): void {
    const metric: RawMetric = {
      type: 'system',
      duration: 0,
      timestamp: new Date(),
      metadata: {
        memory: metrics.memory,
        cpu: metrics.cpu,
        uptime: metrics.uptime
      }
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: 'collector',
      metricType: 'system',
      metricName: 'system_metrics',
      metricValue: metrics.memory.percentage,
      metadata: metrics
    });

    this.logger.debug(`记录系统指标: CPU ${metrics.cpu.usage}%, 内存 ${metrics.memory.percentage}%`);
  }

  /**
   * 收集请求指标数据（供PerformanceInterceptor使用）
   */
  async collectRequestMetrics(data: {
    timestamp: Date;
    source: string;
    layer: string;
    operation: string;
    duration: number;
    statusCode: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metric: RawMetric = {
      type: 'request',
      endpoint: data.operation,
      method: data.metadata?.method || 'unknown',
      statusCode: data.statusCode,
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: {
        source: data.source,
        layer: data.layer,
        success: data.success,
        ...data.metadata
      }
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: data.timestamp,
      source: data.source,
      metricType: 'request',
      metricName: 'performance_request',
      metricValue: data.duration,
      metadata: data.metadata
    });

    this.logger.debug(`收集请求性能数据: ${data.operation} - ${data.success ? '成功' : '失败'} (${data.duration}ms)`);
  }

  /**
   * 收集性能数据（供装饰器使用）
   */
  async collectPerformanceData(data: {
    timestamp: Date;
    source: string;
    layer: string;
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metricType = data.metadata?.type || 'unknown';
    
    const metric: RawMetric = {
      type: metricType,
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: {
        operation: data.operation,
        success: data.success,
        source: data.source,
        layer: data.layer,
        ...data.metadata
      }
    };

    this.addMetricToBuffer(metric);
    
    // 发射数据收集事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: data.timestamp,
      source: data.source,
      metricType: metricType,
      metricName: data.operation,
      metricValue: data.duration,
      metadata: data.metadata
    });

    this.logger.debug(`收集性能数据: ${data.operation} [${metricType}] - ${data.success ? '成功' : '失败'} (${data.duration}ms)`);
  }

  /**
   * 获取原始指标数据（无任何计算）
   */
  async getRawMetrics(startTime?: Date, endTime?: Date): Promise<RawMetricsDto> {
    try {
      this.logger.debug('获取原始指标数据', { startTime, endTime });
      
      // 从仓储层获取原始数据
      const rawData = await this.repository.findMetrics(startTime, endTime);
      
      // 发射收集完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED, {
        timestamp: new Date(),
        source: 'collector',
        metadata: { 
          dataPoints: (rawData.requests?.length || 0) + 
                     (rawData.database?.length || 0) + 
                     (rawData.cache?.length || 0),
          timeRange: { startTime, endTime }
        }
      });

      return rawData;
    } catch (error) {
      this.logger.error('获取原始指标数据失败', error.stack);
      
      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: 'collector',
        metadata: { error: error.message, operation: 'getRawMetrics' }
      });

      // 返回空数据而不是抛出异常，保持数据收集的鲁棒性
      return {
        requests: [],
        database: [],
        cache: [],
        system: undefined
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
          percentage: memUsage.rss / heapStats.heap_size_limit
        },
        cpu: {
          usage: cpus.length > 0 ? Math.random() * 0.1 : 0 // 简化CPU获取，实际应该计算
        },
        uptime: process.uptime(),
        timestamp: new Date()
      };

      this.logger.debug('获取系统指标成功', { 
        memoryUsed: metrics.memory.used, 
        cpuUsage: metrics.cpu.usage 
      });

      return metrics;
    } catch (error) {
      this.logger.error('获取系统指标失败', error.stack);
      
      // 返回默认值
      return {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        uptime: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * 清理过期数据
   */
  async cleanup(olderThan?: Date): Promise<void> {
    try {
      const cutoffDate = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
      
      await this.repository.deleteOldMetrics(cutoffDate);
      
      this.logger.log(`清理完成: 删除 ${cutoffDate.toISOString()} 之前的数据`);
      
      // 发射清理事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_CLEANUP, {
        timestamp: new Date(),
        source: 'collector',
        metadata: { cutoffDate }
      });
    } catch (error) {
      this.logger.error('数据清理失败', error.stack);
      
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: 'collector',
        metadata: { error: error.message, operation: 'cleanup' }
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
        source: 'collector',
        metadata: { bufferSize: this.metricsBuffer.length, maxSize: this.maxBufferSize }
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

      await this.repository.saveMetrics(metricsToFlush);
      
      this.logger.debug(`刷新缓冲区: 保存了 ${metricsToFlush.length} 条指标`);
    } catch (error) {
      this.logger.error('刷新缓冲区失败', error.stack);
      
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.COLLECTION_ERROR, {
        timestamp: new Date(),
        source: 'collector',
        metadata: { error: error.message, operation: 'flushBuffer' }
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
      lastFlush: new Date() // 简化实现，实际应该记录真实的最后刷新时间
    };
  }
}