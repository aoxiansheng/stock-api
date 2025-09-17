/**
 * Cache配置兼容性包装器
 * 🎯 为cache.config.ts提供向后兼容性，将原配置接口映射到统一配置
 * ✅ 100%向后兼容，现有代码无需修改
 *
 * 使用方式：
 * ```typescript
 * // 新服务（推荐）
 * constructor(
 *   @Inject('cacheUnified') private readonly cacheConfig: CacheUnifiedConfig,
 * ) {}
 *
 * // 现有服务（继续工作）
 * constructor(
 *   @Inject('cache') private readonly cacheConfig: CacheConfig,
 * ) {}
 * ```
 */

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CacheUnifiedConfig } from "./cache-unified.config";

/**
 * 原CacheConfig接口（保持向后兼容）
 */
export interface LegacyCacheConfig {
  defaultTtl: number; // 从unified config获取
  compressionThreshold: number;
  compressionEnabled: boolean;
  maxItems: number;
  maxKeyLength: number;
  maxValueSizeMB: number;
  slowOperationMs: number;
  retryDelayMs: number;
  lockTtl: number;
}

/**
 * Cache配置兼容性包装器服务
 * 🎯 将统一配置适配为原有的Cache配置接口
 */
@Injectable()
export class CacheConfigCompatibilityWrapper implements LegacyCacheConfig {
  constructor(private readonly configService: ConfigService) {}

  private get unifiedConfig(): CacheUnifiedConfig {
    return this.configService.get<CacheUnifiedConfig>("cacheUnified")!;
  }

  // TTL配置映射（从统一配置获取）
  get defaultTtl(): number {
    return this.unifiedConfig.defaultTtl;
  }

  // 性能配置映射
  get compressionThreshold(): number {
    return this.unifiedConfig.compressionThreshold;
  }

  get compressionEnabled(): boolean {
    return this.unifiedConfig.compressionEnabled;
  }

  get maxItems(): number {
    return this.unifiedConfig.maxItems;
  }

  get maxKeyLength(): number {
    return this.unifiedConfig.maxKeyLength;
  }

  get maxValueSizeMB(): number {
    return this.unifiedConfig.maxValueSizeMB;
  }

  // 操作配置映射
  get slowOperationMs(): number {
    return this.unifiedConfig.slowOperationMs;
  }

  get retryDelayMs(): number {
    return this.unifiedConfig.retryDelayMs;
  }

  get lockTtl(): number {
    return this.unifiedConfig.lockTtl;
  }
}

/**
 * 导出类型别名以保持兼容性
 */
export type CacheConfig = LegacyCacheConfig;
