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
 * 时间窗口字段接口
 * 用于需要时间范围的场景
 */
export interface TimeWindowFields {
  /**
   * 时间窗口开始时间
   */
  windowStart: Date;

  /**
   * 时间窗口结束时间
   */
  windowEnd: Date;

  /**
   * 时间窗口持续时间（毫秒）
   */
  windowDurationMs?: number;
}

/**
 * 性能时间字段接口
 * 专门用于性能监控相关的时间字段
 */
export interface PerformanceTimeFields extends ProcessingTimeFields {
  /**
   * 执行开始时间（时间戳）
   */
  executionStartTime?: number;

  /**
   * 执行结束时间（时间戳）
   */
  executionEndTime?: number;

  /**
   * 总执行时间（毫秒）
   * 等同于 processingTimeMs，为了明确语义而提供
   */
  totalExecutionTimeMs: number;
}

/**
 * 缓存时间字段接口
 * 用于缓存相关的时间字段
 */
export interface CacheTimeFields extends TimestampFields {
  /**
   * 缓存TTL（生存时间，秒）
   */
  ttlSeconds: number;

  /**
   * 缓存过期时间戳
   */
  expiresAt?: Date;

  /**
   * 缓存命中时间（毫秒）
   */
  cacheHitTimeMs?: number;
}

/**
 * 统计时间字段接口
 * 用于统计数据相关的时间字段
 */
export interface StatisticsTimeFields
  extends TimeWindowFields,
    TimestampFields {
  /**
   * 统计计算耗时（毫秒）
   */
  calculationTimeMs?: number;

  /**
   * 数据收集开始时间
   */
  collectionStartTime?: Date;

  /**
   * 数据收集结束时间
   */
  collectionEndTime?: Date;
}

/**
 * 时间字段验证工具类
 * 提供时间字段的通用验证和转换方法
 */
export class TimeFieldsUtils {
  /**
   * 验证处理时间是否有效（非负数）
   */
  static isValidProcessingTime(processingTimeMs: number): boolean {
    return typeof processingTimeMs === "number" && processingTimeMs >= 0;
  }

  /**
   * 验证时间戳格式是否为有效的ISO 8601格式
   */
  static isValidTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }

  /**
   * 创建标准的时间戳字符串
   */
  static createTimestamp(date?: Date): string {
    return (date || new Date()).toISOString();
  }

  /**
   * 计算时间窗口持续时间
   */
  static calculateWindowDuration(start: Date, end: Date): number {
    return end.getTime() - start.getTime();
  }

  /**
   * 验证时间窗口是否有效（结束时间应大于开始时间）
   */
  static isValidTimeWindow(windowStart: Date, windowEnd: Date): boolean {
    return windowStart < windowEnd;
  }

  /**
   * 转换毫秒到人类可读格式
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else if (milliseconds < 3600000) {
      return `${(milliseconds / 60000).toFixed(2)}min`;
    } else {
      return `${(milliseconds / 3600000).toFixed(2)}h`;
    }
  }

  /**
   * 从旧的字段名迁移到新的标准字段名
   * 主要解决 processingTime -> processingTimeMs 的迁移
   */
  static migrateProcessingTimeField(data: any): ProcessingTimeFields {
    // 如果已经有 processingTimeMs，直接使用
    if (typeof data.processingTimeMs === "number") {
      return { processingTimeMs: data.processingTimeMs };
    }

    // 如果有旧的 processingTime 字段，进行迁移
    if (typeof data.processingTime === "number") {
      return { processingTimeMs: data.processingTime };
    }

    // 默认值
    return { processingTimeMs: 0 };
  }

  /**
   * 验证完整的时间字段对象
   */
  static validateCompleteTimeFields(
    fields: Partial<CompleteTimeFields>,
  ): string[] {
    const errors: string[] = [];

    if (
      fields.processingTimeMs !== undefined &&
      !this.isValidProcessingTime(fields.processingTimeMs)
    ) {
      errors.push("processingTimeMs must be a non-negative number");
    }

    if (fields.timestamp && !this.isValidTimestamp(fields.timestamp)) {
      errors.push("timestamp must be a valid ISO 8601 string");
    }

    return errors;
  }
}

/**
 * 时间字段迁移辅助类型
 * 用于协助从旧字段名向新标准迁移
 */
export type ProcessingTimeMigration = {
  /**
   * @deprecated 使用 processingTimeMs 替代
   */
  processingTime?: number;

  /**
   * 标准化的处理时间字段（毫秒）
   */
  processingTimeMs: number;
};

/**
 * 组件特定的时间字段映射
 * 定义各组件应该使用的具体时间字段接口
 */
export interface ComponentTimeFieldsMapping {
  /**
   * Transformer组件应使用的时间字段
   */
  transformer: ProcessingTimeFields & TimestampFields;

  /**
   * Cache组件应使用的时间字段
   */
  cache: CacheTimeFields;

  /**
   * Monitoring组件应使用的时间字段
   */
  monitoring: PerformanceTimeFields & StatisticsTimeFields;

  /**
   * Storage组件应使用的时间字段
   */
  storage: TimestampFields & ProcessingTimeFields;
}
