/**
 * 监控序列化工具
 * 🎯 解决 monitoring-event-bridge.service.ts:133 和 analyzer-trend.service.ts:601 的序列化问题
 * 提供统一的、类型安全的序列化和反序列化功能
 */

import { MONITORING_KEY_TEMPLATES } from "../constants";

/**
 * 标签序列化配置
 * 用于控制序列化行为
 */
export interface SerializationOptions {
  /**
   * 键排序 - 确保序列化结果一致性
   */
  sortKeys?: boolean;

  /**
   * 压缩输出 - 移除不必要的空格
   */
  compact?: boolean;

  /**
   * 处理特殊值 - null, undefined, function等
   */
  handleSpecialValues?: boolean;

  /**
   * 最大深度 - 防止循环引用
   */
  maxDepth?: number;
}

/**
 * 序列化结果接口
 */
export interface SerializationResult {
  /**
   * 序列化后的字符串
   */
  serialized: string;

  /**
   * 原始对象的键数量
   */
  keyCount: number;

  /**
   * 序列化是否成功
   */
  success: boolean;

  /**
   * 错误信息（如果失败）
   */
  error?: string;
}

/**
 * 监控序列化工具类
 * 🎯 提供监控系统专用的序列化功能
 */
export class MonitoringSerializer {
  /**
   * 默认序列化选项
   */
  private static readonly DEFAULT_OPTIONS: Required<SerializationOptions> = {
    sortKeys: true,
    compact: true,
    handleSpecialValues: true,
    maxDepth: 10,
  };

  /**
   * 序列化标签对象为字符串
   * 解决 monitoring-event-bridge.service.ts:133 的问题
   *
   * @param tags 要序列化的标签对象
   * @param options 序列化选项
   * @returns 序列化结果
   */
  static serializeTags(
    tags: Record<string, any>,
    options: SerializationOptions = {},
  ): SerializationResult {
    try {
      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      if (!tags || typeof tags !== "object") {
        return {
          serialized: "{}",
          keyCount: 0,
          success: true,
        };
      }

      // 处理特殊值
      const sanitizedTags = mergedOptions.handleSpecialValues
        ? this.sanitizeObject(tags, mergedOptions.maxDepth)
        : tags;

      // 键排序
      const processedTags = mergedOptions.sortKeys
        ? this.sortObjectKeys(sanitizedTags)
        : sanitizedTags;

      // 序列化
      const serialized = mergedOptions.compact
        ? JSON.stringify(processedTags)
        : JSON.stringify(processedTags, null, 2);

      return {
        serialized,
        keyCount: Object.keys(processedTags).length,
        success: true,
      };
    } catch (error) {
      return {
        serialized: "{}",
        keyCount: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 反序列化字符串为标签对象
   *
   * @param serialized 序列化的字符串
   * @returns 反序列化的对象
   */
  static deserializeTags(serialized: string): Record<string, any> {
    try {
      if (!serialized || serialized.trim() === "") {
        return {};
      }

      const parsed = JSON.parse(serialized);

      if (typeof parsed !== "object" || parsed === null) {
        return {};
      }

      return parsed;
    } catch (error) {
      // 序列化失败时返回空对象，保证系统稳定性
      return {};
    }
  }

  /**
   * 生成带序列化标签的缓存键
   * 使用键模板和序列化标签生成一致的缓存键
   *
   * @param metricName 指标名称
   * @param tags 标签对象
   * @param options 序列化选项
   * @returns 缓存键
   */
  static generateCacheKey(
    metricName: string,
    tags: Record<string, any>,
    options: SerializationOptions = {},
  ): string {
    const serializationResult = this.serializeTags(tags, options);
    return MONITORING_KEY_TEMPLATES.CACHE_KEY(metricName, tags);
  }

  /**
   * 批量序列化多个标签对象
   * 用于批处理场景，提高性能
   *
   * @param tagsList 标签对象数组
   * @param options 序列化选项
   * @returns 序列化结果数组
   */
  static serializeTagsBatch(
    tagsList: Record<string, any>[],
    options: SerializationOptions = {},
  ): SerializationResult[] {
    return tagsList.map((tags) => this.serializeTags(tags, options));
  }

  /**
   * 验证序列化结果的一致性
   * 确保相同的对象总是产生相同的序列化结果
   *
   * @param obj1 第一个对象
   * @param obj2 第二个对象
   * @param options 序列化选项
   * @returns 是否一致
   */
  static areSerializationConsistent(
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    options: SerializationOptions = {},
  ): boolean {
    const result1 = this.serializeTags(obj1, options);
    const result2 = this.serializeTags(obj2, options);

    return (
      result1.success &&
      result2.success &&
      result1.serialized === result2.serialized
    );
  }

  /**
   * 清理对象中的特殊值
   * 处理 null, undefined, function, symbol 等特殊值
   *
   * @private
   * @param obj 要清理的对象
   * @param maxDepth 最大深度
   * @param currentDepth 当前深度
   * @returns 清理后的对象
   */
  private static sanitizeObject(
    obj: any,
    maxDepth: number,
    currentDepth: number = 0,
  ): any {
    if (currentDepth >= maxDepth) {
      return "[Max Depth Exceeded]";
    }

    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj === "function") {
      return "[Function]";
    }

    if (typeof obj === "symbol") {
      return obj.toString();
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
      };
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.sanitizeObject(item, maxDepth, currentDepth + 1),
      );
    }

    if (typeof obj === "object") {
      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value, maxDepth, currentDepth + 1);
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * 对对象的键进行排序
   * 确保序列化结果的一致性
   *
   * @private
   * @param obj 要排序的对象
   * @returns 键已排序的新对象
   */
  private static sortObjectKeys(obj: Record<string, any>): Record<string, any> {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, any> = {};

    for (const key of sortedKeys) {
      const value = obj[key];

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sortedObj[key] = this.sortObjectKeys(value);
      } else {
        sortedObj[key] = value;
      }
    }

    return sortedObj;
  }
}

/**
 * 监控数据序列化工具类
 * 🎯 专门用于监控数据的序列化，支持更复杂的数据结构
 */
export class MonitoringDataSerializer {
  /**
   * 序列化时间序列数据
   * 解决 analyzer-trend.service.ts:601 的序列化问题
   *
   * @param timeSeriesData 时间序列数据
   * @param options 序列化选项
   * @returns 序列化结果
   */
  static serializeTimeSeriesData(
    timeSeriesData: Array<{
      timestamp: number;
      value: number;
      tags?: Record<string, any>;
    }>,
    options: SerializationOptions = {},
  ): SerializationResult {
    try {
      if (!Array.isArray(timeSeriesData)) {
        return {
          serialized: "[]",
          keyCount: 0,
          success: true,
        };
      }

      // 标准化时间序列数据格式
      const standardizedData = timeSeriesData.map((point) => ({
        timestamp: point.timestamp,
        value: point.value,
        tags: point.tags
          ? MonitoringSerializer.serializeTags(point.tags, options).serialized
          : undefined,
      }));

      const serialized = JSON.stringify(standardizedData);

      return {
        serialized,
        keyCount: timeSeriesData.length,
        success: true,
      };
    } catch (error) {
      return {
        serialized: "[]",
        keyCount: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 序列化指标聚合数据
   * 用于指标聚合结果的序列化
   *
   * @param aggregateData 聚合数据
   * @param options 序列化选项
   * @returns 序列化结果
   */
  static serializeAggregateData(
    aggregateData: {
      metric: string;
      aggregationType: string;
      value: number;
      period: string;
      tags?: Record<string, any>;
    },
    options: SerializationOptions = {},
  ): SerializationResult {
    try {
      const standardizedData = {
        metric: aggregateData.metric,
        aggregationType: aggregateData.aggregationType,
        value: aggregateData.value,
        period: aggregateData.period,
        tags: aggregateData.tags
          ? MonitoringSerializer.serializeTags(aggregateData.tags, options)
              .serialized
          : undefined,
      };

      const serialized = JSON.stringify(standardizedData);

      return {
        serialized,
        keyCount: 1,
        success: true,
      };
    } catch (error) {
      return {
        serialized: "{}",
        keyCount: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * 监控序列化工具的便利导出
 * 提供常用的序列化函数，简化使用
 */
export const monitoringSerializationUtils = Object.freeze({
  /**
   * 快速序列化标签
   */
  serializeTags: (tags: Record<string, any>) =>
    MonitoringSerializer.serializeTags(tags).serialized,

  /**
   * 快速反序列化标签
   */
  deserializeTags: (serialized: string) =>
    MonitoringSerializer.deserializeTags(serialized),

  /**
   * 生成缓存键
   */
  generateCacheKey: (metricName: string, tags: Record<string, any>) =>
    MonitoringSerializer.generateCacheKey(metricName, tags),

  /**
   * 序列化时间序列数据
   */
  serializeTimeSeries: (
    data: Array<{
      timestamp: number;
      value: number;
      tags?: Record<string, any>;
    }>,
  ) => MonitoringDataSerializer.serializeTimeSeriesData(data).serialized,
});
