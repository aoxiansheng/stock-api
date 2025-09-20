import {
  RedisEnvelope,
  CacheMetadata,
} from "../interfaces/cache-metadata.interface";
import { CACHE_CONFIG } from "../constants/cache-config.constants";

/**
 * Redis值序列化/反序列化工具类
 * 统一处理Redis存储格式，避免多处重复逻辑
 */
export class RedisValueUtils {
  /**
   * ✅ 统一序列化：避免多处重复拼装
   * @param data 业务数据
   * @param compressed 是否压缩
   * @param metadata 可选元数据
   * @returns 序列化后的字符串
   */
  static serialize<T>(
    data: T,
    compressed: boolean = false,
    metadata?: Partial<CacheMetadata>,
  ): string {
    const envelope: RedisEnvelope<T> = {
      data,
      storedAt: Date.now(),
      compressed,
      metadata,
    };

    try {
      return JSON.stringify(envelope);
    } catch (error) {
      throw new Error(`Failed to serialize data: ${error.message}`);
    }
  }

  /**
   * ✅ 统一解析：现代 envelope 格式解析
   * 仅支持包含 data 字段的 envelope 结构，历史格式已移除
   * @param value Redis中存储的字符串值
   * @returns 解析结果
   */
  static parse<T>(value: string): {
    data: T;
    storedAt?: number;
    compressed?: boolean;
    metadata?: Partial<CacheMetadata>;
  } {
    if (!value) {
      throw new Error("Cannot parse empty or null value");
    }

    try {
      const parsed = JSON.parse(value);

      // 现代统一格式：包含元数据的envelope
      if (parsed.data !== undefined && typeof parsed === "object") {
        return {
          data: parsed.data,
          storedAt: parsed.storedAt || Date.now(),
          compressed: parsed.compressed || false,
          metadata: parsed.metadata,
        };
      }

      // 不支持的数据格式
      throw new Error("Unsupported Redis value format. Expected envelope structure with 'data' field.");
    } catch (error) {
      throw new Error(`Failed to parse Redis value: ${error.message}`);
    }
  }

  /**
   * 验证数据大小是否超出限制
   * @param data 要验证的数据
   * @returns 是否有效
   */
  static validateDataSize(data: any): boolean {
    try {
      const serialized = JSON.stringify(data);
      const sizeInBytes = Buffer.byteLength(serialized, "utf8");
      const maxSizeInBytes =
        CACHE_CONFIG.MEMORY.MAX_VALUE_SIZE_MB * 1024 * 1024;

      return sizeInBytes <= maxSizeInBytes;
    } catch {
      return false;
    }
  }

  /**
   * 计算数据大小（字节）
   * @param data 要计算的数据
   * @returns 数据大小（字节）
   */
  static getDataSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, "utf8");
    } catch {
      return 0;
    }
  }

  /**
   * 创建带压缩标记的元数据
   * @param originalSize 原始大小
   * @param compressedSize 压缩后大小
   * @returns 元数据对象
   */
  static createCompressionMetadata(
    originalSize: number,
    compressedSize?: number,
  ): CacheMetadata {
    return {
      storedAt: Date.now(),
      compressed: compressedSize !== undefined,
      originalSize,
      compressedSize,
    };
  }

  /**
   * 安全解析JSON，处理错误情况
   * @param value 要解析的字符串
   * @param defaultValue 默认值
   * @returns 解析结果或默认值
   */
  static safeParseJSON<T>(value: string, defaultValue: T): T {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 检查Redis值是否为有效的envelope格式
   * @param value Redis值
   * @returns 是否为有效格式
   */
  static isValidEnvelope(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return (
        typeof parsed === "object" &&
        parsed !== null &&
        "data" in parsed &&
        "storedAt" in parsed
      );
    } catch {
      return false;
    }
  }

  /**
   * 从envelope中提取纯业务数据
   * @param value Redis值
   * @returns 纯业务数据
   */
  static extractData<T>(value: string): T {
    const parsed = this.parse<T>(value);
    return parsed.data;
  }

  /**
   * 从envelope中提取元数据
   * @param value Redis值
   * @returns 元数据信息
   */
  static extractMetadata(value: string): {
    storedAt?: number;
    compressed?: boolean;
    metadata?: Partial<CacheMetadata>;
  } {
    try {
      const parsed = this.parse(value);
      return {
        storedAt: parsed.storedAt,
        compressed: parsed.compressed,
        metadata: parsed.metadata,
      };
    } catch {
      return {};
    }
  }

  /**
   * 格式化存储时间
   * @param timestamp 时间戳（毫秒）
   * @returns 格式化的时间字符串
   */
  static formatStoredTime(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }
}
