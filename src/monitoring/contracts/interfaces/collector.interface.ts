/**
 * 数据收集层接口定义
 * 职责：纯数据收集，不包含任何计算逻辑
 */

export interface RawMetric {
  type: "request" | "database" | "cache" | "system";
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SystemMetricsDto {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  timestamp: Date;
}

export interface RawMetricsDto {
  requests?: Array<{
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    timestamp: Date;
    authType?: string;
    userId?: string;
  }>;
  database?: Array<{
    operation: string;
    responseTimeMs: number;
    success: boolean;
    timestamp: Date;
    collection?: string;
  }>;
  cache?: Array<{
    operation: string;
    hit: boolean;
    responseTimeMs: number;
    timestamp: Date;
    key?: string;
  }>;
  system?: SystemMetricsDto;
}

/**
 * 数据收集器接口
 * 纯数据收集，不进行任何计算或分析
 */
export interface ICollector {
  /**
   * 记录HTTP请求指标
   */
  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    metadata?: Record<string, any>,
  ): void;

  /**
   * 记录数据库操作指标
   */
  recordDatabaseOperation(
    operation: string,
    responseTimeMs: number,
    success: boolean,
    metadata?: Record<string, any>,
  ): void;

  /**
   * 记录缓存操作指标
   */
  recordCacheOperation(
    operation: string,
    hit: boolean,
    responseTimeMs: number,
    metadata?: Record<string, any>,
  ): void;

  /**
   * 记录系统指标
   */
  recordSystemMetrics(metrics: SystemMetricsDto): void;

  /**
   * 获取原始指标数据（无任何计算）
   */
  getRawMetrics(startTime?: Date, endTime?: Date): Promise<RawMetricsDto>;

  /**
   * 获取系统指标
   */
  getSystemMetrics(): Promise<SystemMetricsDto>;

  /**
   * 清理过期数据
   */
  cleanup(olderThan?: Date): Promise<void>;
}
