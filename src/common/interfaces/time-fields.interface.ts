/**
 * 时间字段标准化接口集合
 *
 * 此文件定义了系统中时间相关字段的标准化接口，解决以下问题：
 * 1. 处理时间字段命名不一致（processingTime vs processingTimeMs）
 * 2. 统一时间戳字段的格式和类型
 * 3. 提供时间字段的通用契约和验证规则
 */

/**
 * 处理时间字段接口
 * 用于标准化各种处理耗时相关的字段
 */
export interface ProcessingTimeFields {
  /**
   * 处理耗时（毫秒）
   * 标准字段名，所有组件应使用此命名
   */
  processingTimeMs: number;
}

/**
 * 时间戳字段接口
 * 用于标准化时间戳相关的字段
 */
export interface TimestampFields {
  /**
   * 创建时间戳（ISO 8601格式字符串）
   * 用于记录数据创建的时间
   */
  timestamp: string;

  /**
   * 创建时间戳（Date对象，可选）
   * 用于需要Date对象的场景
   */
  createdAt?: Date;

  /**
   * 更新时间戳（Date对象，可选）
   * 用于记录数据最后更新的时间
   */
  updatedAt?: Date;
}

/**
 * 完整时间字段接口
 * 组合了处理时间和时间戳字段
 */
export interface CompleteTimeFields
  extends ProcessingTimeFields,
    TimestampFields {}

/**
 * 响应时间字段接口
 * 用于标准化响应时间相关的字段
 */
export interface ResponseTimeFields {
  /**
   * 响应时间（毫秒）
   * 标准字段名，所有组件应使用此命名
   */
  responseTimeMs: number;

  /**
   * 平均响应时间（毫秒，可选）
   * 用于聚合统计场景
   */
  averageResponseTimeMs?: number;

  /**
   * 查询时间（毫秒，可选）
   * 专门用于数据库查询场景
   */
  queryTimeMs?: number;
}

/**
 * 完整响应时间字段接口
 * 组合了处理时间、响应时间和时间戳字段
 */
export interface CompleteResponseTimeFields
  extends ProcessingTimeFields,
    ResponseTimeFields,
    TimestampFields {}

