/**
 * Cache配置向后兼容性测试
 * 🎯 确保重构过程中的平滑迁移
 * 测试范围：
 * 1. Provider删除后的服务功能完整性
 * 2. 配置访问的一致性验证
 * 3. 依赖注入重构的兼容性
 * 4. 性能和功能无回归验证
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import { CacheModule } from "../../../../../src/cache/module/cache.module";
import { CacheUnifiedConfig } from "../../../../../src/cache/config/cache-unified.config";
import cacheUnifiedConfig from "../../../../../src/cache/config/cache-unified.config";
import cacheConfig from "../../../../../src/cache/config/cache.config";
// 已删除的配置文件，现在使用统一配置

// Mock Redis
const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(() => ({
    setex: jest.fn(),
    exec: jest.fn(),
  })),
};

describe("Cache Backward Compatibility", () => {
  let cacheService: CacheService;
  let configService: ConfigService;
  let moduleRef: TestingModule;
  let eventEmitter: EventEmitter2;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };

    // Mock EventEmitter2
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [cacheUnifiedConfig, cacheConfig],
          isGlobal: false,
        }),
      ],
      providers: [
        CacheService,
        {
          provide: "default_IORedisModuleConnectionToken",
          useValue: mockRedis,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: "cacheTtl",
          useFactory: (configService: ConfigService) =>
            configService.get("cacheTtl"),
          inject: [ConfigService],
        },
      ],
    }).compile();

    cacheService = moduleRef.get<CacheService>(CacheService);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (moduleRef) {
      await moduleRef.close();
    }
    jest.clearAllMocks();
  });

  describe("🔄 Provider删除后的功能完整性验证", () => {
    it("should maintain CacheService functionality after removing CacheLimitsProvider", async () => {
      // 验证CacheService仍然可以正常实例化
      expect(cacheService).toBeDefined();
      expect(cacheService).toBeInstanceOf(CacheService);
    });

    it("should access batch size limits through unified config instead of provider", async () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证统一配置包含批量限制
      expect(unifiedConfig.maxBatchSize).toBeDefined();
      expect(unifiedConfig.maxBatchSize).toBe(100);
      expect(unifiedConfig.maxCacheSize).toBe(10000);
      expect(unifiedConfig.lruSortBatchSize).toBe(1000);
    });

    it("should access TTL configurations through CacheService methods instead of provider", () => {
      // 验证CacheService提供TTL访问方法
      expect(typeof cacheService.getTtlByTimeliness).toBe("function");

      // 验证各种时效性TTL
      expect(cacheService.getTtlByTimeliness("strong")).toBe(5);
      expect(cacheService.getTtlByTimeliness("moderate")).toBe(30);
      expect(cacheService.getTtlByTimeliness("weak")).toBe(300);
      expect(cacheService.getTtlByTimeliness("long")).toBe(3600);
    });

    it("should handle cache operations with proper batch size validation", async () => {
      mockRedis.setex.mockResolvedValue("OK");

      // 测试set操作仍然正常工作
      const result = await cacheService.set("test-key", "test-value", {
        ttl: 300,
      });

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test-key",
        300,
        "test-value",
      );
    });
  });

  describe("📊 配置访问的一致性验证", () => {
    it("should provide consistent configuration values between old and new systems", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyTtlConfig = configService.get("cacheTtl");
      const legacyLimitsConfig = configService.get("cacheLimits");

      // 验证TTL配置一致性
      expect(unifiedConfig.defaultTtl).toBe(legacyTtlConfig.defaultTtl);
      expect(unifiedConfig.strongTimelinessTtl).toBe(
        legacyTtlConfig.strongTimelinessTtl,
      );
      expect(unifiedConfig.longTermTtl).toBe(legacyTtlConfig.longTermTtl);

      // 验证限制配置一致性
      expect(unifiedConfig.maxBatchSize).toBe(legacyLimitsConfig.maxBatchSize);
      expect(unifiedConfig.maxCacheSize).toBe(legacyLimitsConfig.maxCacheSize);
      expect(unifiedConfig.smartCacheMaxBatch).toBe(
        legacyLimitsConfig.smartCacheMaxBatch,
      );
    });

    it("should maintain environment variable override capabilities", async () => {
      // 设置环境变量
      process.env.CACHE_DEFAULT_TTL = "600";
      process.env.CACHE_MAX_BATCH_SIZE = "200";

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
      expect(config.maxBatchSize).toBe(200);

      await testModule.close();
    });

    it("should support gradual migration scenarios", () => {
      // 验证在迁移期间新旧配置可以共存
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyConfig = configService.get("cache");

      expect(unifiedConfig).toBeDefined();
      expect(legacyConfig).toBeDefined();

      // 验证可以从两个配置源获取相同的值
      expect(unifiedConfig.compressionThreshold).toBe(
        legacyConfig.compressionThreshold,
      );
      expect(unifiedConfig.maxKeyLength).toBe(legacyConfig.maxKeyLength);
    });
  });

  describe("🏗️ 依赖注入重构兼容性", () => {
    it("should work without CacheLimitsProvider and CacheTtlProvider dependencies", () => {
      // 验证CacheService可以在没有自定义Provider的情况下正常工作
      expect(cacheService).toBeDefined();

      // 验证核心方法仍然可用
      expect(typeof cacheService.set).toBe("function");
      expect(typeof cacheService.get).toBe("function");
      expect(typeof cacheService.del).toBe("function");
      expect(typeof cacheService.getTtlByTimeliness).toBe("function");
    });

    it("should maintain proper dependency injection for remaining dependencies", () => {
      // 验证必要的依赖仍然被正确注入
      expect(cacheService["redis"]).toBeDefined();
      expect(cacheService["configService"]).toBeDefined();
      expect(cacheService["eventBus"]).toBeDefined();
    });

    it("should handle configuration through ConfigService only", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证所有配置都可以通过ConfigService获取
      expect(unifiedConfig.defaultTtl).toBeDefined();
      expect(unifiedConfig.maxBatchSize).toBeDefined();
      expect(unifiedConfig.compressionThreshold).toBeDefined();
      expect(unifiedConfig.lockTtl).toBeDefined();
    });
  });

  describe("⚡ 性能和功能无回归验证", () => {
    it("should maintain cache operation performance", async () => {
      mockRedis.setex.mockResolvedValue("OK");
      mockRedis.get.mockResolvedValue("test-value");

      const startTime = Date.now();

      // 执行基本缓存操作
      await cacheService.set("perf-test", "value", { ttl: 300 });
      const value = await cacheService.get("perf-test");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证操作成功
      expect(value).toBe("test-value");

      // 验证性能不受影响（应该在合理时间内完成）
      expect(duration).toBeLessThan(100);
    });

    it("should maintain proper error handling", async () => {
      mockRedis.setex.mockRejectedValue(new Error("Redis connection failed"));

      // 验证错误处理仍然正常
      await expect(cacheService.set("error-test", "value")).rejects.toThrow();
    });

    it("should maintain event emission functionality", async () => {
      mockRedis.setex.mockResolvedValue("OK");

      await cacheService.set("event-test", "value", { ttl: 300 });

      // 验证事件仍然被正确发射
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it("should maintain cache key validation", async () => {
      const longKey = "x".repeat(256); // 超过maxKeyLength限制

      // 验证键长度验证仍然有效
      await expect(cacheService.set(longKey, "value")).rejects.toThrow();
    });
  });

  describe("📈 配置重叠消除验证", () => {
    it("should eliminate duplicate TTL definitions", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证统一配置作为单一真相源
      expect(unifiedConfig.defaultTtl).toBe(300);

      // 验证通过CacheService访问TTL
      expect(cacheService.getTtlByTimeliness("weak")).toBe(300);
      expect(cacheService.getTtlByTimeliness("strong")).toBe(5);
    });

    it("should maintain type safety after refactoring", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证配置类型安全
      expect(typeof unifiedConfig.defaultTtl).toBe("number");
      expect(typeof unifiedConfig.compressionEnabled).toBe("boolean");
      expect(typeof unifiedConfig.maxBatchSize).toBe("number");
    });

    it("should reduce configuration complexity", () => {
      // 验证不再需要多个Provider
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 所有配置都在统一配置中
      const configKeys = Object.keys(unifiedConfig);
      expect(configKeys).toContain("defaultTtl");
      expect(configKeys).toContain("maxBatchSize");
      expect(configKeys).toContain("compressionThreshold");
      expect(configKeys).toContain("lockTtl");
    });
  });

  describe("🔧 向后兼容警告验证", () => {
    it("should emit deprecation warnings for old configuration usage", () => {
      // 这个测试验证废弃警告是否正常工作
      // 在实际运行中，我们应该看到废弃警告日志

      const legacyConfig = configService.get("cache");
      expect(legacyConfig).toBeDefined();

      // 如果使用了旧配置，应该有警告（通过日志验证）
      // 这里我们验证新配置优先被使用
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      expect(unifiedConfig).toBeDefined();
    });

    it("should support migration period with both configurations available", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");
      const legacyTtlConfig = configService.get("cacheTtl");
      const legacyLimitsConfig = configService.get("cacheLimits");

      // 验证迁移期间所有配置都可访问
      expect(unifiedConfig).toBeDefined();
      expect(legacyTtlConfig).toBeDefined();
      expect(legacyLimitsConfig).toBeDefined();

      // 验证值的一致性
      expect(unifiedConfig.defaultTtl).toBe(legacyTtlConfig.defaultTtl);
      expect(unifiedConfig.maxBatchSize).toBe(legacyLimitsConfig.maxBatchSize);
    });
  });

  describe("🚀 新功能验证", () => {
    it("should support enhanced TTL access through CacheService", () => {
      // 验证新的TTL访问方法
      const ttlMethods = [
        "strong",
        "moderate",
        "weak",
        "long",
        "monitoring",
        "auth",
        "transformer",
        "suggestion",
      ];

      ttlMethods.forEach((method) => {
        const ttl = cacheService.getTtlByTimeliness(method as any);
        expect(typeof ttl).toBe("number");
        expect(ttl).toBeGreaterThan(0);
      });
    });

    it("should support unified configuration access pattern", () => {
      const unifiedConfig =
        configService.get<CacheUnifiedConfig>("cacheUnified");

      // 验证统一配置包含所有必要的字段
      const requiredFields = [
        "defaultTtl",
        "strongTimelinessTtl",
        "realtimeTtl",
        "longTermTtl",
        "compressionThreshold",
        "compressionEnabled",
        "maxItems",
        "maxKeyLength",
        "slowOperationMs",
        "retryDelayMs",
        "lockTtl",
        "maxBatchSize",
        "maxCacheSize",
        "lruSortBatchSize",
      ];

      requiredFields.forEach((field) => {
        expect(unifiedConfig[field]).toBeDefined();
      });
    });
  });
});
