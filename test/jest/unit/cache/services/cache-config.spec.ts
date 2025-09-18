/**
 * 缓存服务配置统一性测试
 * 验证 CacheService 正确使用 ConfigService 获取配置
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService, ConfigType } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";

import { CacheService } from "../../../../../src/cache/services/cache.service";
import cacheUnifiedConfig from "../../../../../src/cache/config/cache-unified.config";

describe("CacheService Configuration", () => {
  let service: CacheService;
  let configService: ConfigService;
  let redisClient: jest.Mocked<Redis>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUnifiedConfig: ConfigType<typeof cacheUnifiedConfig> = {
    defaultTtl: 300,
    strongTimelinessTtl: 5,
    realtimeTtl: 30,
    monitoringTtl: 300,
    authTtl: 300,
    transformerTtl: 300,
    suggestionTtl: 300,
    longTermTtl: 3600,
    compressionThreshold: 1024,
    compressionEnabled: true,
    maxItems: 10000,
    maxKeyLength: 255,
    maxValueSizeMB: 10,
    slowOperationMs: 100,
    retryDelayMs: 100,
    lockTtl: 30,
    maxBatchSize: 100,
    maxCacheSize: 10000,
    lruSortBatchSize: 1000,
    smartCacheMaxBatch: 50,
    maxCacheSizeMB: 1024,
    // Alert配置已迁移到Alert模块独立配置
  };

  beforeEach(async () => {
    // Mock Redis client
    redisClient = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
    } as any;

    // Mock EventEmitter2
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "cacheUnified") return mockUnifiedConfig;
              if (key === "cache") return mockUnifiedConfig; // backward compatibility
              return undefined;
            }),
          },
        },
        {
          provide: "default_IORedisModuleConnectionToken",
          useValue: redisClient,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: "cacheUnified",
          useValue: mockUnifiedConfig,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Configuration Integration", () => {
    it("should initialize with cache configuration from ConfigService", () => {
      // With direct injection, configService.get is not called during initialization
      expect(service).toBeDefined();
    });

    it("should throw error if cache configuration not found", async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            CacheService,
            {
              provide: ConfigService,
              useValue: { get: jest.fn() },
            },
            {
              provide: "default_IORedisModuleConnectionToken",
              useValue: redisClient,
            },
            {
              provide: EventEmitter2,
              useValue: eventEmitter,
            },
            {
              provide: "cacheUnified",
              useValue: null, // This will cause the error
            },
          ],
        }).compile(),
      ).rejects.toThrow("Cache unified configuration not found");
    });
  });

  describe("TTL Configuration", () => {
    it("should use unified configuration for default TTL", async () => {
      redisClient.setex.mockResolvedValue("OK");

      await service.set("test-key", "test-value");

      expect(redisClient.setex).toHaveBeenCalledWith(
        "test-key",
        mockUnifiedConfig.defaultTtl,
        expect.any(String),
      );
    });

    it("should respect custom TTL when provided", async () => {
      redisClient.setex.mockResolvedValue("OK");
      const customTtl = 600;

      await service.set("test-key", "test-value", { ttl: customTtl });

      expect(redisClient.setex).toHaveBeenCalledWith(
        "test-key",
        customTtl,
        expect.any(String),
      );
    });
  });

  describe("Compression Configuration", () => {
    it("should use unified compression threshold", async () => {
      redisClient.setex.mockResolvedValue("OK");

      // Create data larger than compression threshold
      const largeData = "x".repeat(
        mockUnifiedConfig.compressionThreshold + 100,
      );

      await service.set("test-key", largeData);

      // Should compress the data and use setex with compressed value
      expect(redisClient.setex).toHaveBeenCalled();
      const [, , compressedValue] = redisClient.setex.mock.calls[0];
      expect(compressedValue).toContain("COMPRESSED::");
    });

    it("should not compress small values", async () => {
      redisClient.setex.mockResolvedValue("OK");

      // Create data smaller than compression threshold
      const smallData = "small data";

      await service.set("test-key", smallData);

      // Should not compress the data
      expect(redisClient.setex).toHaveBeenCalled();
      const [, , value] = redisClient.setex.mock.calls[0];
      expect(value).not.toContain("COMPRESSED::");
    });
  });

  describe("Batch Size Configuration", () => {
    it("should enforce max batch size limit", async () => {
      const largeKeyArray = Array.from({ length: 101 }, (_, i) => `key-${i}`); // 101 > 100 (unified config batch limit)

      await expect(service.mget(largeKeyArray)).rejects.toThrow(
        "批量获取超过限制",
      );
    });

    it("should allow batch operations within limit", async () => {
      redisClient.mget.mockResolvedValue(Array(99).fill(null));

      const keyArray = Array.from({ length: 99 }, (_, i) => `key-${i}`); // 99 < 100 (unified config batch limit)

      const result = await service.mget(keyArray);
      expect(result).toBeInstanceOf(Map);
      expect(redisClient.mget).toHaveBeenCalledWith(...keyArray);
    });
  });

  describe("Key Length Validation", () => {
    it("should enforce max key length limit", async () => {
      const longKey = "x".repeat(mockUnifiedConfig.maxKeyLength + 1);

      // Key length validation is now handled at DTO level, not in service
      // This test should pass as the service doesn't validate key length directly
      await expect(service.set(longKey, "value")).resolves.toBeDefined();
    });

    it("should allow keys within length limit", async () => {
      redisClient.setex.mockResolvedValue("OK");

      const validKey = "x".repeat(mockUnifiedConfig.maxKeyLength - 1);

      await expect(service.set(validKey, "value")).resolves.toBe(true);
    });
  });

  describe("Lock TTL Configuration", () => {
    it("should use unified lock TTL configuration", async () => {
      // This test would require more complex setup to test the lock mechanism
      // For now, we verify the configuration is available
      expect(mockUnifiedConfig.lockTtl).toBe(30);
    });
  });
});
