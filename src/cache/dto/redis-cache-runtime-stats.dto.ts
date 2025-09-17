import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import { CacheStatistics } from "./shared/cache-shared.interfaces";

/**
 * Redis缓存运行时统计信息DTO
 *
 * 此DTO专门用于Redis缓存服务的实时统计数据
 * 与StorageRedisCacheRuntimeStatsDto区分：
 * - RedisCacheRuntimeStatsDto: Redis内存缓存的运行时统计
 * - StorageRedisCacheRuntimeStatsDto: 存储层整体缓存统计（包括持久化缓存）
 */
export class RedisCacheRuntimeStatsDto implements CacheStatistics {
  @ApiProperty({ description: "缓存命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "缓存未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "缓存命中率（0-1之间的小数）" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "Redis内存使用量（字节）" })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: "Redis键总数" })
  @IsNumber()
  keyCount: number;

  /**
   * 总请求数 (计算属性，满足CacheStatistics接口)
   */
  get totalRequests(): number {
    return this.hits + this.misses;
  }

  /**
   * 构造函数
   */
  constructor(
    hits: number = 0,
    misses: number = 0,
    hitRate: number = 0,
    memoryUsage: number = 0,
    keyCount: number = 0,
  ) {
    this.hits = hits;
    this.misses = misses;
    this.hitRate = hitRate;
    this.memoryUsage = memoryUsage;
    this.keyCount = keyCount;
  }

  /**
   * 计算总请求数
   */
  getTotalRequests(): number {
    return this.hits + this.misses;
  }

  /**
   * 计算内存使用率（需要最大内存值）
   */
  getMemoryUsageRatio(maxMemory: number): number {
    return maxMemory > 0 ? this.memoryUsage / maxMemory : 0;
  }

  /**
   * 获取格式化的统计摘要
   */
  getSummary(): string {
    const totalRequests = this.getTotalRequests();
    return `Redis Cache Stats - Hits: ${this.hits}, Misses: ${this.misses}, Hit Rate: ${(this.hitRate * 100).toFixed(2)}%, Keys: ${this.keyCount}, Memory: ${this.formatBytes(this.memoryUsage)}`;
  }

  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
