import { Injectable } from "@nestjs/common";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import { createLogger } from "@common/logging/index";
import { CACHE_CONFIG } from "../constants/cache-config.constants";
import { CacheMetadata } from "../interfaces/cache-metadata.interface";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * 缓存压缩解压缩服务
 */
@Injectable()
export class CacheCompressionService {
  private readonly logger = createLogger(CacheCompressionService.name);

  /**
   * 压缩数据
   * @param data 要压缩的数据
   * @returns 压缩结果
   */
  async compress(data: any): Promise<{
    compressedData: string;
    metadata: CacheMetadata;
    compressionRatio: number;
  }> {
    try {
      const originalString = JSON.stringify(data);
      const originalSize = Buffer.byteLength(originalString, "utf8");

      // 检查是否需要压缩
      if (originalSize < CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES) {
        return {
          compressedData: originalString,
          metadata: {
            storedAt: Date.now(),
            compressed: false,
            originalSize,
          },
          compressionRatio: 1,
        };
      }

      const compressed = await gzipAsync(originalString, {
        level: CACHE_CONFIG.COMPRESSION.LEVEL,
      });

      const compressedSize = compressed.length;
      const compressionRatio = compressedSize / originalSize;

      // 如果压缩效果不好，返回原始数据
      if (compressionRatio > CACHE_CONFIG.COMPRESSION.SAVING_RATIO) {
        this.logger.debug(
          `Compression ratio ${compressionRatio.toFixed(3)} too high, using original data`,
        );

        return {
          compressedData: originalString,
          metadata: {
            storedAt: Date.now(),
            compressed: false,
            originalSize,
          },
          compressionRatio: 1,
        };
      }

      this.logger.debug(
        `Compressed data from ${originalSize} to ${compressedSize} bytes (ratio: ${compressionRatio.toFixed(3)})`,
      );

      return {
        compressedData: compressed.toString("base64"),
        metadata: {
          storedAt: Date.now(),
          compressed: true,
          originalSize,
          compressedSize,
        },
        compressionRatio,
      };
    } catch (error) {
      this.logger.error("Compression failed", error);
      throw new Error(`Data compression failed: ${error.message}`);
    }
  }

  /**
   * 检查数据是否已被压缩
   * @param data 要检查的数据字符串
   * @returns 是否为压缩数据
   */
  isCompressed(data: string): boolean {
    try {
      // 检查是否为Base64格式的压缩数据
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(data)) {
        return false;
      }

      // 尝试解码Base64并检查gzip标头
      const buffer = Buffer.from(data, "base64");
      // gzip文件的魔数字是 0x1f8b
      return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
    } catch (error) {
      return false;
    }
  }

  /**
   * 解压缩数据（简化版本，不需要metadata）
   * @param compressedData 压缩的数据
   * @returns 解压缩后的字符串
   */
  async decompress(compressedData: string): Promise<string>;

  /**
   * 解压缩数据（带metadata版本）
   * @param compressedData 压缩的数据
   * @param metadata 元数据信息
   * @returns 解压缩后的数据
   */
  async decompress(
    compressedData: string,
    metadata: CacheMetadata,
  ): Promise<any>;

  /**
   * 解压缩数据实现
   */
  async decompress(
    compressedData: string,
    metadata?: CacheMetadata,
  ): Promise<any> {
    try {
      // 如果没有metadata，使用简化版本
      if (!metadata) {
        // 如果数据未压缩，直接返回
        if (!this.isCompressed(compressedData)) {
          return compressedData;
        }

        // 解压缩数据
        const compressedBuffer = Buffer.from(compressedData, "base64");
        const decompressed = await gunzipAsync(compressedBuffer);
        const decompressedString = decompressed.toString("utf8");

        this.logger.debug(
          `Decompressed data from ${compressedBuffer.length} to ${decompressed.length} bytes`,
        );

        return decompressedString;
      }

      // 带metadata的版本
      // 如果数据未压缩，直接解析
      if (!metadata.compressed) {
        return JSON.parse(compressedData);
      }

      // 解压缩数据
      const compressedBuffer = Buffer.from(compressedData, "base64");
      const decompressed = await gunzipAsync(compressedBuffer);
      const decompressedString = decompressed.toString("utf8");

      this.logger.debug(
        `Decompressed data from ${compressedBuffer.length} to ${decompressed.length} bytes`,
      );

      return JSON.parse(decompressedString);
    } catch (error) {
      this.logger.error("Decompression failed", error);
      throw new Error(`Data decompression failed: ${error.message}`);
    }
  }

  /**
   * 检查数据是否需要压缩
   * @param data 要检查的数据
   * @returns 是否需要压缩
   */
  shouldCompress(data: any): boolean {
    try {
      const serialized = JSON.stringify(data);
      const size = Buffer.byteLength(serialized, "utf8");
      return size >= CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES;
    } catch (error) {
      this.logger.error("Failed to check compression requirement", error);
      return false;
    }
  }

  /**
   * 获取数据大小（字节）
   * @param data 要计算的数据
   * @returns 数据大小
   */
  getDataSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, "utf8");
    } catch (error) {
      this.logger.error("Failed to calculate data size", error);
      return 0;
    }
  }

  /**
   * 计算压缩比
   * @param originalSize 原始大小
   * @param compressedSize 压缩后大小
   * @returns 压缩比
   */
  calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): number {
    if (originalSize === 0) return 1;
    return compressedSize / originalSize;
  }

  /**
   * 验证压缩数据的完整性
   * @param compressedData 压缩数据
   * @param metadata 元数据
   * @returns 是否有效
   */
  async validateCompressedData(
    compressedData: string,
    metadata: CacheMetadata,
  ): Promise<boolean> {
    try {
      await this.decompress(compressedData, metadata);
      return true;
    } catch (error) {
      this.logger.error("Compressed data validation failed", error);
      return false;
    }
  }

  /**
   * 获取压缩统计信息
   * @param originalData 原始数据
   * @param compressedData 压缩数据
   * @param metadata 元数据
   * @returns 统计信息
   */
  getCompressionStats(
    originalData: any,
    compressedData: string,
    metadata: CacheMetadata,
  ) {
    const originalSize = this.getDataSize(originalData);
    const compressedSize =
      metadata.compressedSize || Buffer.byteLength(compressedData, "utf8");
    const compressionRatio = this.calculateCompressionRatio(
      originalSize,
      compressedSize,
    );
    const spaceSaved = originalSize - compressedSize;
    const spaceSavedPercent = ((spaceSaved / originalSize) * 100).toFixed(2);

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      spaceSaved,
      spaceSavedPercent: `${spaceSavedPercent}%`,
      algorithm: CACHE_CONFIG.COMPRESSION.ALGORITHM,
      level: CACHE_CONFIG.COMPRESSION.LEVEL,
      threshold: CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES,
    };
  }
}
