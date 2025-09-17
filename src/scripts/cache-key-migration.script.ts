/**
 * 缓存键迁移脚本
 * 🎯 协助从旧TTL配置迁移到统一TTL配置
 * 📊 处理既有缓存键的TTL更新和数据保护
 *
 * @description 安全地迁移Alert组件相关的缓存键到新的统一TTL配置
 * @author Alert配置合规优化任务
 * @created 2025-09-15
 * @usage: bun run script:cache-migration
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../cache/services/cache.service";
import { UnifiedTtlConfig } from "../cache/config/unified-ttl.config";

interface CacheKeyMigrationResult {
  totalKeysScanned: number;
  migratedKeys: number;
  skippedKeys: number;
  errors: string[];
  elapsedTime: number;
}

interface CacheKeyPattern {
  pattern: string;
  description: string;
  newTtlProperty: keyof UnifiedTtlConfig;
  legacyTtl?: number;
}

@Injectable()
export class CacheKeyMigrationScript {
  private readonly logger = new Logger("CacheKeyMigrationScript");
  private readonly ttlConfig: UnifiedTtlConfig;

  /**
   * Alert组件缓存键模式映射
   * 定义旧缓存键模式到新TTL配置的映射关系
   */
  private readonly migrationPatterns: CacheKeyPattern[] = [
    {
      pattern: "alert:active:*",
      description: "Alert活跃数据缓存",
      newTtlProperty: "alertActiveDataTtl",
      legacyTtl: 86400, // 旧配置：24小时
    },
    {
      pattern: "alert:cooldown:*",
      description: "Alert冷却期缓存",
      newTtlProperty: "alertCooldownTtl",
      legacyTtl: 300, // 旧配置：5分钟
    },
    {
      pattern: "alert:timeseries:*",
      description: "Alert时序数据缓存",
      newTtlProperty: "alertHistoricalDataTtl",
      legacyTtl: 86400, // 旧配置：24小时
    },
    {
      pattern: "alert:config:*",
      description: "Alert配置缓存",
      newTtlProperty: "alertConfigCacheTtl",
      legacyTtl: 1800, // 旧配置：30分钟
    },
    {
      pattern: "alert:stats:*",
      description: "Alert统计缓存",
      newTtlProperty: "alertStatsCacheTtl",
      legacyTtl: 3600, // 旧配置：1小时
    },
    {
      pattern: "alert:archived:*",
      description: "Alert归档数据缓存",
      newTtlProperty: "alertArchivedDataTtl",
      legacyTtl: 86400, // 旧配置：24小时
    },
  ];

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    // 获取统一TTL配置
    this.ttlConfig = this.configService.get<UnifiedTtlConfig>("unifiedTtl");
    if (!this.ttlConfig) {
      throw new Error(
        "统一TTL配置未找到，请确保unified-ttl.config.ts已正确注册",
      );
    }
  }

  /**
   * 执行缓存键迁移
   * 🎯 主要迁移入口点
   */
  async executeMigration(
    dryRun: boolean = true,
  ): Promise<CacheKeyMigrationResult> {
    const startTime = Date.now();

    this.logger.log(`开始缓存键迁移${dryRun ? " (模拟模式)" : ""}`);
    this.logger.log(
      `统一TTL配置值: ${JSON.stringify(this.ttlConfig, null, 2)}`,
    );

    const result: CacheKeyMigrationResult = {
      totalKeysScanned: 0,
      migratedKeys: 0,
      skippedKeys: 0,
      errors: [],
      elapsedTime: 0,
    };

    try {
      // 遍历每个缓存键模式
      for (const pattern of this.migrationPatterns) {
        this.logger.log(
          `处理模式: ${pattern.pattern} - ${pattern.description}`,
        );

        const patternResult = await this.migratePattern(pattern, dryRun);

        result.totalKeysScanned += patternResult.scannedCount;
        result.migratedKeys += patternResult.migratedCount;
        result.skippedKeys += patternResult.skippedCount;
        result.errors.push(...patternResult.errors);

        this.logger.log(
          `模式 ${pattern.pattern} 处理完成: 扫描=${patternResult.scannedCount}, 迁移=${patternResult.migratedCount}, 跳过=${patternResult.skippedCount}`,
        );
      }

      result.elapsedTime = Date.now() - startTime;

      this.logger.log(`缓存键迁移完成${dryRun ? " (模拟模式)" : ""}`);
      this.logger.log(
        `总结: 扫描=${result.totalKeysScanned}, 迁移=${result.migratedKeys}, 跳过=${result.skippedKeys}, 错误=${result.errors.length}, 耗时=${result.elapsedTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error("缓存键迁移失败", error);
      result.errors.push(`迁移失败: ${error.message}`);
      result.elapsedTime = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * 迁移特定模式的缓存键
   */
  private async migratePattern(
    pattern: CacheKeyPattern,
    dryRun: boolean,
  ): Promise<{
    scannedCount: number;
    migratedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    const result = {
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    try {
      // 扫描匹配的缓存键
      const keys = await this.scanKeys(pattern.pattern);
      result.scannedCount = keys.length;

      if (keys.length === 0) {
        this.logger.debug(`模式 ${pattern.pattern} 未找到匹配的键`);
        return result;
      }

      // 获取新的TTL值
      const newTtl = this.ttlConfig[pattern.newTtlProperty];
      if (typeof newTtl !== "number" || newTtl <= 0) {
        result.errors.push(
          `无效的TTL值: ${pattern.newTtlProperty} = ${newTtl}`,
        );
        return result;
      }

      // 批量处理缓存键
      const batchSize = 100; // 批处理大小
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
          batch.map((key) =>
            this.migrateSingleKey(key, newTtl, pattern, dryRun),
          ),
        );

        // 处理批次结果
        batchResults.forEach((batchResult, index) => {
          if (batchResult.status === "fulfilled") {
            if (batchResult.value.migrated) {
              result.migratedCount++;
            } else {
              result.skippedCount++;
            }
          } else {
            result.errors.push(
              `键 ${batch[index]} 迁移失败: ${batchResult.reason}`,
            );
          }
        });
      }

      return result;
    } catch (error) {
      result.errors.push(`模式 ${pattern.pattern} 处理失败: ${error.message}`);
      return result;
    }
  }

  /**
   * 迁移单个缓存键
   */
  private async migrateSingleKey(
    key: string,
    newTtl: number,
    pattern: CacheKeyPattern,
    dryRun: boolean,
  ): Promise<{ migrated: boolean; reason?: string }> {
    try {
      // 检查键的当前TTL
      const currentTtl = await this.cacheService.getClient().ttl(key);

      // TTL检查逻辑
      if (currentTtl === -1) {
        // 键没有过期时间，需要设置
        if (!dryRun) {
          await this.cacheService.expire(key, newTtl);
        }
        this.logger.debug(
          `${dryRun ? "[模拟] " : ""}键 ${key} TTL设置为 ${newTtl}秒 (之前无TTL)`,
        );
        return { migrated: true };
      } else if (currentTtl === -2) {
        // 键不存在，跳过
        return { migrated: false, reason: "键不存在" };
      } else if (Math.abs(currentTtl - newTtl) > 60) {
        // TTL差异超过60秒，需要更新
        if (!dryRun) {
          await this.cacheService.expire(key, newTtl);
        }
        this.logger.debug(
          `${dryRun ? "[模拟] " : ""}键 ${key} TTL从 ${currentTtl}秒 更新为 ${newTtl}秒`,
        );
        return { migrated: true };
      } else {
        // TTL差异较小，跳过
        return {
          migrated: false,
          reason: `TTL差异较小 (${currentTtl}秒 vs ${newTtl}秒)`,
        };
      }
    } catch (error) {
      throw new Error(`迁移键 ${key} 失败: ${error.message}`);
    }
  }

  /**
   * 扫描匹配模式的缓存键
   * 使用SCAN避免阻塞Redis
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      try {
        const [nextCursor, foundKeys] = await this.cacheService
          .getClient()
          .scan(cursor, "MATCH", pattern, "COUNT", 1000);
        cursor = nextCursor;
        keys.push(...foundKeys);
      } catch (error) {
        this.logger.error(`扫描键模式 ${pattern} 失败`, error);
        break;
      }
    } while (cursor !== "0");

    return keys;
  }

  /**
   * 验证迁移结果
   * 🛡️ 确保迁移后的缓存键使用正确的TTL值
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
    summary: {
      [pattern: string]: {
        total: number;
        correctTtl: number;
        incorrectTtl: number;
      };
    };
  }> {
    this.logger.log("开始验证缓存键迁移结果");

    const result = {
      isValid: true,
      issues: [],
      summary: {} as {
        [pattern: string]: {
          total: number;
          correctTtl: number;
          incorrectTtl: number;
        };
      },
    };

    for (const pattern of this.migrationPatterns) {
      const keys = await this.scanKeys(pattern.pattern);
      const expectedTtl = Number(this.ttlConfig[pattern.newTtlProperty]);

      const summary = {
        total: keys.length,
        correctTtl: 0,
        incorrectTtl: 0,
      };

      for (const key of keys) {
        try {
          const ttl = await this.cacheService.getClient().ttl(key);

          if (ttl === -2) {
            // 键不存在，跳过
            continue;
          }

          if (ttl === -1 || (ttl > 0 && Math.abs(ttl - expectedTtl) > 60)) {
            summary.incorrectTtl++;
            result.issues.push(
              `键 ${key} TTL不正确: 期望=${expectedTtl}秒, 实际=${ttl}秒`,
            );
            result.isValid = false;
          } else {
            summary.correctTtl++;
          }
        } catch (error) {
          result.issues.push(`验证键 ${key} 失败: ${error.message}`);
          result.isValid = false;
        }
      }

      result.summary[pattern.pattern] = summary;

      this.logger.log(
        `模式 ${pattern.pattern} 验证结果: 总计=${summary.total}, 正确=${summary.correctTtl}, 错误=${summary.incorrectTtl}`,
      );
    }

    this.logger.log(
      `迁移验证完成: ${result.isValid ? "✅ 通过" : "❌ 发现问题"}, 问题数=${result.issues.length}`,
    );

    return result;
  }

  /**
   * 创建迁移备份
   * 🔄 在迁移前备份关键缓存数据
   */
  async createMigrationBackup(): Promise<{
    backupId: string;
    keyCount: number;
    backupSize: string;
  }> {
    const backupId = `cache_migration_backup_${Date.now()}`;
    const backupKey = `backup:${backupId}`;
    let keyCount = 0;
    let totalSize = 0;

    this.logger.log(`创建迁移备份: ${backupId}`);

    try {
      const allPatterns = this.migrationPatterns.map((p) => p.pattern);
      const backupData: { [key: string]: { value: any; ttl: number } } = {};

      for (const pattern of allPatterns) {
        const keys = await this.scanKeys(pattern);

        for (const key of keys) {
          try {
            const [value, ttl] = await Promise.all([
              this.cacheService.get(key),
              this.cacheService.getClient().ttl(key),
            ]);

            if (value !== null) {
              backupData[key] = { value, ttl };
              keyCount++;
              totalSize += JSON.stringify(value).length;
            }
          } catch (error) {
            this.logger.warn(`备份键 ${key} 失败: ${error.message}`);
          }
        }
      }

      // 存储备份数据
      await this.cacheService.set(backupKey, backupData, { ttl: 86400 * 7 }); // 保存7天

      const backupSize = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;

      this.logger.log(
        `迁移备份创建完成: ID=${backupId}, 键数=${keyCount}, 大小=${backupSize}`,
      );

      return { backupId, keyCount, backupSize };
    } catch (error) {
      this.logger.error("创建迁移备份失败", error);
      throw error;
    }
  }

  /**
   * 恢复迁移备份
   * 🔄 从备份恢复缓存数据
   */
  async restoreMigrationBackup(
    backupId: string,
  ): Promise<{ restoredKeys: number; errors: string[] }> {
    const backupKey = `backup:${backupId}`;

    this.logger.log(`开始恢复迁移备份: ${backupId}`);

    try {
      const backupData = await this.cacheService.get<{
        [key: string]: { value: any; ttl: number };
      }>(backupKey);

      if (!backupData) {
        throw new Error(`备份数据未找到: ${backupId}`);
      }

      let restoredKeys = 0;
      const errors: string[] = [];

      for (const [key, data] of Object.entries(backupData)) {
        try {
          await this.cacheService.set(key, data.value, {
            ttl: data.ttl > 0 ? data.ttl : undefined,
          });
          restoredKeys++;
        } catch (error) {
          errors.push(`恢复键 ${key} 失败: ${error.message}`);
        }
      }

      this.logger.log(
        `迁移备份恢复完成: 恢复键数=${restoredKeys}, 错误数=${errors.length}`,
      );

      return { restoredKeys, errors };
    } catch (error) {
      this.logger.error("恢复迁移备份失败", error);
      throw error;
    }
  }

  /**
   * 获取迁移统计信息
   */
  async getMigrationStats(): Promise<{
    patterns: {
      pattern: string;
      description: string;
      keyCount: number;
      avgTtl: number;
    }[];
    totalKeys: number;
    totalMemoryUsage: string;
  }> {
    const patterns = [];
    let totalKeys = 0;
    let totalMemoryBytes = 0;

    for (const pattern of this.migrationPatterns) {
      const keys = await this.scanKeys(pattern.pattern);
      let totalTtl = 0;
      let validTtlCount = 0;

      for (const key of keys) {
        try {
          const [ttl, memory] = await Promise.all([
            this.cacheService.getClient().ttl(key),
            this.cacheService
              .getClient()
              .memory("USAGE", key)
              .catch(() => 0),
          ]);

          if (ttl > 0) {
            totalTtl += ttl;
            validTtlCount++;
          }

          totalMemoryBytes += Number(memory) || 0;
        } catch (error) {
          // 忽略单个键的错误
        }
      }

      patterns.push({
        pattern: pattern.pattern,
        description: pattern.description,
        keyCount: keys.length,
        avgTtl: validTtlCount > 0 ? Math.round(totalTtl / validTtlCount) : 0,
      });

      totalKeys += keys.length;
    }

    return {
      patterns,
      totalKeys,
      totalMemoryUsage: `${(totalMemoryBytes / 1024 / 1024).toFixed(2)} MB`,
    };
  }
}
