import { Injectable, Logger } from '@nestjs/common';
import { RawMetric, RawMetricsDto } from '../../contracts/interfaces/collector.interface';

/**
 * 收集器数据仓储
 * 职责：纯数据持久化，不包含业务逻辑
 */
@Injectable()
export class CollectorRepository {
  private readonly logger = new Logger(CollectorRepository.name);
  
  // 内存存储（简化实现，实际项目中应该使用数据库）
  private readonly metricsStore: RawMetric[] = [];
  
  constructor() {
    this.logger.log('CollectorRepository initialized - 收集器数据仓储已初始化');
  }

  /**
   * 保存指标数据
   */
  async saveMetrics(metrics: RawMetric[]): Promise<void> {
    try {
      // 简化实现：保存到内存
      this.metricsStore.push(...metrics);
      
      // 保持最近的10000条记录
      if (this.metricsStore.length > 10000) {
        this.metricsStore.splice(0, this.metricsStore.length - 10000);
      }
      
      this.logger.debug(`保存 ${metrics.length} 条指标数据`);
    } catch (error) {
      this.logger.error('保存指标数据失败', error.stack);
      throw error;
    }
  }

  /**
   * 保存单个指标
   */
  async saveMetric(metric: RawMetric): Promise<void> {
    await this.saveMetrics([metric]);
  }

  /**
   * 查找指标数据
   */
  async findMetrics(startTime?: Date, endTime?: Date): Promise<RawMetricsDto> {
    try {
      let filteredMetrics = [...this.metricsStore];
      
      // 时间过滤
      if (startTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
      }
      if (endTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
      }

      // 按类型分组
      const requests = filteredMetrics
        .filter(m => m.type === 'request')
        .map(m => ({
          endpoint: m.endpoint || '',
          method: m.method || '',
          statusCode: m.statusCode || 0,
          responseTime: m.duration,
          timestamp: m.timestamp,
          authType: m.metadata?.authType,
          userId: m.metadata?.userId
        }));

      const database = filteredMetrics
        .filter(m => m.type === 'database')
        .map(m => ({
          operation: m.metadata?.operation || '',
          duration: m.duration,
          success: m.metadata?.success || false,
          timestamp: m.timestamp,
          collection: m.metadata?.collection
        }));

      const cache = filteredMetrics
        .filter(m => m.type === 'cache')
        .map(m => ({
          operation: m.metadata?.operation || '',
          hit: m.metadata?.hit || false,
          duration: m.duration,
          timestamp: m.timestamp,
          key: m.metadata?.key
        }));

      // 获取最新的系统指标
      const systemMetrics = filteredMetrics
        .filter(m => m.type === 'system')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 1)
        .map(m => ({
          memory: m.metadata?.memory || { used: 0, total: 0, percentage: 0 },
          cpu: m.metadata?.cpu || { usage: 0 },
          uptime: m.metadata?.uptime || 0,
          timestamp: m.timestamp
        }))[0];

      const result: RawMetricsDto = {
        requests,
        database,
        cache,
        system: systemMetrics
      };

      this.logger.debug(`查找指标数据: 请求${requests.length}条, 数据库${database.length}条, 缓存${cache.length}条`);
      
      return result;
    } catch (error) {
      this.logger.error('查找指标数据失败', error.stack);
      throw error;
    }
  }

  /**
   * 删除旧数据
   */
  async deleteOldMetrics(olderThan: Date): Promise<number> {
    try {
      const initialCount = this.metricsStore.length;
      
      // 删除指定日期之前的数据
      for (let i = this.metricsStore.length - 1; i >= 0; i--) {
        if (this.metricsStore[i].timestamp < olderThan) {
          this.metricsStore.splice(i, 1);
        }
      }
      
      const deletedCount = initialCount - this.metricsStore.length;
      
      this.logger.debug(`清理旧数据: 删除了 ${deletedCount} 条记录`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('删除旧数据失败', error.stack);
      throw error;
    }
  }

  /**
   * 获取指标统计
   */
  async getMetricsStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
  }> {
    try {
      const stats = {
        total: this.metricsStore.length,
        byType: {} as Record<string, number>,
        oldestTimestamp: undefined as Date | undefined,
        newestTimestamp: undefined as Date | undefined
      };

      // 按类型统计
      for (const metric of this.metricsStore) {
        stats.byType[metric.type] = (stats.byType[metric.type] || 0) + 1;
      }

      // 时间范围
      if (this.metricsStore.length > 0) {
        const sortedByTime = [...this.metricsStore].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        stats.oldestTimestamp = sortedByTime[0].timestamp;
        stats.newestTimestamp = sortedByTime[sortedByTime.length - 1].timestamp;
      }

      return stats;
    } catch (error) {
      this.logger.error('获取指标统计失败', error.stack);
      throw error;
    }
  }

  /**
   * 清空所有数据（谨慎使用）
   */
  async clearAllMetrics(): Promise<void> {
    try {
      const count = this.metricsStore.length;
      this.metricsStore.length = 0;
      
      this.logger.warn(`清空所有指标数据: 删除了 ${count} 条记录`);
    } catch (error) {
      this.logger.error('清空数据失败', error.stack);
      throw error;
    }
  }

  /**
   * 检查仓储健康状态
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    metrics: {
      totalCount: number;
      memoryUsage: number;
      lastActivity?: Date;
    };
  }> {
    try {
      const stats = await this.getMetricsStats();
      
      // 简化的健康检查
      const isHealthy = stats.total < 50000; // 超过5万条记录认为不健康
      
      return {
        isHealthy,
        metrics: {
          totalCount: stats.total,
          memoryUsage: this.metricsStore.length * 100, // 简化的内存使用计算
          lastActivity: stats.newestTimestamp
        }
      };
    } catch (error) {
      this.logger.error('健康检查失败', error.stack);
      return {
        isHealthy: false,
        metrics: {
          totalCount: 0,
          memoryUsage: 0
        }
      };
    }
  }
}