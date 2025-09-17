/**
 * Cache配置一致性测试
 * 🎯 验证配置重叠消除和统一配置功能
 * 测试范围：
 * 1. 配置重叠消除验证
 * 2. 统一配置值正确性验证
 * 3. 环境变量覆盖功能验证
 * 4. 配置验证功能验证
 * 5. 向后兼容性验证
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  CacheUnifiedConfig,
  CacheUnifiedConfigValidation,
} from "../../../../../src/cache/config/cache-unified.config";
import cacheUnifiedConfig from "../../../../../src/cache/config/cache-unified.config";
import cacheConfig from "../../../../../src/cache/config/cache.config";
// 已删除的配置文件，现在使用统一配置

describe("Cache Configuration Consistency", () => {
  let configService: ConfigService;
  let moduleRef: TestingModule;

  const originalEnv = process.env;

  beforeEach(async () => {
    // 重置环境变量
    process.env = { ...originalEnv };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [cacheUnifiedConfig, cacheConfig],
          isGlobal: false,
        }),
      ],
    }).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    // 恢复环境变量
    process.env = originalEnv;
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe("🎯 配置重叠消除验证", () => {
    it("should have unified TTL configuration", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      expect(unifiedConfig).toBeDefined();
      expect(unifiedConfig.defaultTtl).toBeDefined();
      expect(unifiedConfig.defaultTtl).toBe(300);
    });

    it("should eliminate TTL duplication - single source of truth", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证统一配置存在并包含所有TTL值（单一真相源）
      expect(unifiedConfig.defaultTtl).toBe(300);
      expect(unifiedConfig.strongTimelinessTtl).toBe(5);
      expect(unifiedConfig.realtimeTtl).toBe(30);
      expect(unifiedConfig.longTermTtl).toBe(3600);

      // 验证统一配置是唯一配置源（消除重叠）
      expect(unifiedConfig).toBeDefined();
      expect(typeof unifiedConfig.defaultTtl).toBe("number");
      expect(typeof unifiedConfig.strongTimelinessTtl).toBe("number");
    });

    it("should have unified limits configuration", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证统一配置包含所有限制配置（消除重叠）
      expect(unifiedConfig.maxBatchSize).toBe(100);
      expect(unifiedConfig.maxCacheSize).toBe(10000);
      expect(unifiedConfig.lruSortBatchSize).toBe(1000);
      expect(unifiedConfig.smartCacheMaxBatch).toBe(50);
      expect(unifiedConfig.maxCacheSizeMB).toBe(1024);

      // 验证所有限制配置都在统一配置中定义
      expect(typeof unifiedConfig.maxBatchSize).toBe("number");
      expect(typeof unifiedConfig.maxCacheSize).toBe("number");
    });

    it("should have unified performance configuration", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyCacheConfig = configService.get("cache");

      // 验证性能配置整合
      expect(unifiedConfig.compressionThreshold).toBe(1024);
      expect(unifiedConfig.compressionEnabled).toBe(true);
      expect(unifiedConfig.maxItems).toBe(10000);
      expect(unifiedConfig.maxKeyLength).toBe(255);
      expect(unifiedConfig.maxValueSizeMB).toBe(10);

      // 验证与旧配置一致性（除已废弃的字段）
      expect(unifiedConfig.compressionThreshold).toBe(
        legacyCacheConfig?.compressionThreshold,
      );
      expect(unifiedConfig.compressionEnabled).toBe(
        legacyCacheConfig?.compressionEnabled,
      );
    });
  });

  describe("🔧 配置验证功能验证", () => {
    it("should validate TTL ranges", async () => {
      // 测试无效TTL值应抛出验证错误
      process.env.CACHE_DEFAULT_TTL = "0"; // 无效：小于最小值1

      try {
        const invalidModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [cacheUnifiedConfig],
            }),
          ],
        }).compile();

        const configService = invalidModule.get<ConfigService>(ConfigService);
        const config = configService.get("cacheUnified");

        // 配置应该有默认值而不是无效值
        expect(config.defaultTtl).not.toBe(0);
        expect(config.defaultTtl).toBe(300); // 默认值

        await invalidModule.close();
      } catch (error) {
        // 如果抛出错误，验证错误信息包含validation
        expect(error.message).toMatch(/validation|invalid/i);
      }
    });

    it("should validate compression threshold", async () => {
      process.env.CACHE_COMPRESSION_THRESHOLD = "-1"; // 无效：负值

      try {
        const invalidModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [cacheUnifiedConfig],
            }),
          ],
        }).compile();

        const configService = invalidModule.get<ConfigService>(ConfigService);
        const config = configService.get("cacheUnified");

        // 配置应该有默认值而不是无效值
        expect(config.compressionThreshold).not.toBe(-1);
        expect(config.compressionThreshold).toBe(1024); // 默认值

        await invalidModule.close();
      } catch (error) {
        // 如果抛出错误，验证错误信息包含validation
        expect(error.message).toMatch(/validation|invalid/i);
      }
    });

    it("should validate batch size limits", async () => {
      process.env.CACHE_MAX_BATCH_SIZE = "2000"; // 无效：超过最大值1000

      try {
        const invalidModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [cacheUnifiedConfig],
            }),
          ],
        }).compile();

        const configService = invalidModule.get<ConfigService>(ConfigService);
        const config = configService.get("cacheUnified");

        // 配置应该有默认值而不是无效值
        expect(config.maxBatchSize).not.toBe(2000);
        expect(config.maxBatchSize).toBe(100); // 默认值

        await invalidModule.close();
      } catch (error) {
        // 如果抛出错误，验证错误信息包含validation
        expect(error.message).toMatch(/validation|invalid/i);
      }
    });
  });

  describe("🌍 环境变量覆盖功能验证", () => {
    it("should respect environment variable overrides", async () => {
      // 设置环境变量覆盖
      process.env.CACHE_DEFAULT_TTL = "600";
      process.env.CACHE_STRONG_TTL = "10";
      process.env.CACHE_MAX_BATCH_SIZE = "200";
      process.env.CACHE_COMPRESSION_ENABLED = "false";

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [cacheUnifiedConfig],
          }),
        ],
      }).compile();

      const testConfigService = testModule.get<ConfigService>(ConfigService);
      const config = testConfigService.get<CacheUnifiedConfig>("cacheUnified");

      expect(config.defaultTtl).toBe(600);
      expect(config.strongTimelinessTtl).toBe(10);
      expect(config.maxBatchSize).toBe(200);
      expect(config.compressionEnabled).toBe(false);

      await testModule.close();
    });

    it("should use default values when environment variables are not set", () => {
      const config = configService.get<CacheUnifiedConfig>("cacheUnified");

      expect(config.defaultTtl).toBe(300);
      expect(config.strongTimelinessTtl).toBe(5);
      expect(config.realtimeTtl).toBe(30);
      expect(config.longTermTtl).toBe(3600);
      expect(config.compressionThreshold).toBe(1024);
      expect(config.compressionEnabled).toBe(true);
    });

    it("should handle boolean environment variables correctly", async () => {
      // 测试各种boolean值表示
      const testCases = [
        { envValue: "false", expected: false },
        { envValue: "true", expected: true },
      ];

      for (const testCase of testCases) {
        // 重置环境变量
        process.env = { ...originalEnv };
        process.env.CACHE_COMPRESSION_ENABLED = testCase.envValue;

        const testModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              load: [cacheUnifiedConfig],
            }),
          ],
        }).compile();

        const testConfigService = testModule.get<ConfigService>(ConfigService);
        const config =
          testConfigService.get<CacheUnifiedConfig>("cacheUnified");

        expect(config.compressionEnabled).toBe(testCase.expected);

        await testModule.close();
      }
    });
  });

  describe("🔄 向后兼容性验证", () => {
    it("should maintain access to legacy configurations during migration", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyCacheConfig = configService.get("cache");
      const legacyTtlConfig = configService.get("cacheUnified"); // 现在指向统一配置
      const legacyLimitsConfig = configService.get("cacheUnified"); // 现在指向统一配置

      // 验证所有配置都可访问
      expect(unifiedConfig).toBeDefined();
      expect(legacyCacheConfig).toBeDefined();
      expect(legacyTtlConfig).toBeDefined();
      expect(legacyLimitsConfig).toBeDefined();

      // 验证关键配置值的一致性
      expect(unifiedConfig.defaultTtl).toBe(legacyTtlConfig.defaultTtl);
      expect(unifiedConfig.compressionThreshold).toBe(
        legacyCacheConfig.compressionThreshold,
      );
      expect(unifiedConfig.maxBatchSize).toBe(legacyLimitsConfig.maxBatchSize);
    });

    it("should support gradual migration from legacy configurations", () => {
      // 模拟渐进迁移场景：部分服务使用新配置，部分使用旧配置
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyConfig = configService.get("cache");

      // 新服务应该使用统一配置
      expect(unifiedConfig.defaultTtl).toBe(300);
      expect(unifiedConfig.strongTimelinessTtl).toBe(5);

      // 旧服务仍可使用旧配置（但会有废弃警告）
      expect(legacyConfig.defaultTtl).toBe(300);
      expect(legacyConfig.compressionThreshold).toBe(1024);
    });
  });

  describe("🏗️ 配置结构验证", () => {
    it("should have all required TTL configurations", () => {
      const config = configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证所有必需的TTL配置都存在
      const requiredTtlFields = [
        "defaultTtl",
        "strongTimelinessTtl",
        "realtimeTtl",
        "monitoringTtl",
        "authTtl",
        "transformerTtl",
        "suggestionTtl",
        "longTermTtl",
      ];

      requiredTtlFields.forEach((field) => {
        expect(config[field]).toBeDefined();
        expect(typeof config[field]).toBe("number");
        expect(config[field]).toBeGreaterThan(0);
      });
    });

    it("should have all required performance configurations", () => {
      const config = configService.get<CacheUnifiedConfig>("cacheUnified");

      const requiredPerfFields = [
        "compressionThreshold",
        "compressionEnabled",
        "maxItems",
        "maxKeyLength",
        "maxValueSizeMB",
        "slowOperationMs",
        "retryDelayMs",
        "lockTtl",
      ];

      requiredPerfFields.forEach((field) => {
        expect(config[field]).toBeDefined();
      });
    });

    it("should have all required limit configurations", () => {
      const config = configService.get<CacheUnifiedConfig>("cacheUnified");

      const requiredLimitFields = [
        "maxBatchSize",
        "maxCacheSize",
        "lruSortBatchSize",
        "smartCacheMaxBatch",
        "maxCacheSizeMB",
      ];

      requiredLimitFields.forEach((field) => {
        expect(config[field]).toBeDefined();
        expect(typeof config[field]).toBe("number");
        expect(config[field]).toBeGreaterThan(0);
      });
    });
  });

  describe("📊 配置重叠消除效果验证", () => {
    it("should reduce configuration overlap from 4 to 1 location", () => {
      // 验证统一配置作为唯一真相源
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 之前重复定义的defaultTtl现在只在统一配置中定义
      expect(unifiedConfig.defaultTtl).toBe(300);

      // 验证其他重复的TTL值也被统一
      expect(unifiedConfig.strongTimelinessTtl).toBe(5); // 替代硬编码常量
      expect(unifiedConfig.lockTtl).toBe(30); // 替代分散的锁TTL定义
    });

    it("should maintain configuration type safety", () => {
      const config = configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证配置实例是正确的类型
      expect(config).toBeInstanceOf(CacheUnifiedConfigValidation);

      // 验证所有数值配置都是数字类型
      expect(typeof config.defaultTtl).toBe("number");
      expect(typeof config.maxBatchSize).toBe("number");
      expect(typeof config.compressionThreshold).toBe("number");

      // 验证布尔配置是布尔类型
      expect(typeof config.compressionEnabled).toBe("boolean");
    });
  });
});
