import { PerformanceSummaryDto } from '../../collect-metrics/dto';

/**
 * 性能分析服务接口
 * 负责性能数据的汇总、分析和缓存管理
 */
export interface IPerformanceAnalytics {
  /**
   * 获取性能摘要数据
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 性能摘要DTO
   */
  getPerformanceSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceSummaryDto>;

  /**
   * 获取端点性能指标
   * @returns 端点指标数组
   */
  getEndpointMetrics(): Promise<any[]>;

  /**
   * 获取数据库性能指标
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 数据库指标
   */
  getDatabaseMetrics(startDate?: string, endDate?: string): Promise<any>;

  /**
   * 获取Redis性能指标
   * @returns Redis指标
   */
  getRedisMetrics(): Promise<any>;

  /**
   * 获取系统性能指标
   * @returns 系统指标
   */
  getSystemMetrics(): any;

  /**
   * 使缓存失效
   * @param pattern 缓存键模式（可选），如果不提供则清除所有性能相关缓存
   */
  invalidateCache(pattern?: string): Promise<void>;

  /**
   * 计算性能趋势
   * @param metrics 性能指标数据
   * @returns 趋势分析结果
   */
  calculateTrends?(metrics: PerformanceSummaryDto): {
    cpuTrend: 'up' | 'down' | 'stable';
    memoryTrend: 'up' | 'down' | 'stable';
    responseTrend: 'up' | 'down' | 'stable';
    errorTrend: 'up' | 'down' | 'stable';
  };
}