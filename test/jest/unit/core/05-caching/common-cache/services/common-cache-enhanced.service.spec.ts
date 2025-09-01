import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CommonCacheService } from "../../../../../../../src/core/05-caching/common-cache/services/common-cache.service";
import { RedisValueUtils } from "../../../../../../../src/core/05-caching/common-cache/utils/redis-value.utils";
import { ICollector } from "../../../../../../../src/monitoring/contracts/interfaces/collector.interface";

// Mock RedisValueUtils
jest.mock(
  "../../../../../../../src/core/05-caching/common-cache/utils/redis-value.utils",
);

describe("CommonCacheService - Enhanced Operations", () => {
  let service: CommonCacheService;
  let mockRedis: any;
  let mockCollector: jest.Mocked<ICollector>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      lrange: jest.fn(),
      lpush: jest.fn(),
      rpush: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      sismember: jest.fn(),
    };

    mockCollector = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
      getRawMetrics: jest.fn(),
      getSystemMetrics: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCacheService,
        {
          provide: "REDIS_CLIENT",
          useValue: mockRedis,
        },
        {
          provide: "COLLECTOR_SERVICE",
          useValue: mockCollector,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test"),
          },
        },
      ],
    }).compile();

    service = module.get<CommonCacheService>(CommonCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("mgetEnhanced", () => {
    it("应该正确处理缓存命中的批量获取", async () => {
      // Arrange
      const keys = ["key1", "key2", "key3"];
      const options = { includeMetadata: true, includeTTL: true };

      const serializedValue1 = JSON.stringify({
        data: "value1",
        storedAt: Date.now(),
      });
      const serializedValue2 = JSON.stringify({
        data: "value2",
        storedAt: Date.now(),
      });

      mockRedis.mget.mockResolvedValue([
        serializedValue1,
        serializedValue2,
        null,
      ]);
      mockRedis.pttl
        .mockResolvedValueOnce(300000)
        .mockResolvedValueOnce(180000)
        .mockResolvedValueOnce(-2);

      // Configure RedisValueUtils mock to parse the values correctly
      const mockedParse = jest.mocked(RedisValueUtils.parse);
      mockedParse
        .mockReturnValueOnce({
          data: "value1",
          compressed: false,
          metadata: {},
          storedAt: Date.now(),
        })
        .mockReturnValueOnce({
          data: "value2",
          compressed: false,
          metadata: {},
          storedAt: Date.now(),
        });

      // Act
      const results = await service.mgetEnhanced(keys, options);

      // Assert
      expect(results.data).toHaveLength(3);

      expect(results.data[0]).toEqual({
        key: "key1",
        value: "value1",
        ttl: 300,
        metadata: expect.objectContaining({
          storedAt: expect.any(Number),
        }),
      });

      expect(results.data[1]).toEqual({
        key: "key2",
        value: "value2",
        ttl: 180,
        metadata: expect.objectContaining({
          storedAt: expect.any(Number),
        }),
      });

      expect(results.data[2]).toEqual({
        key: "key3",
        value: null,
      });

      expect(results.summary.hits).toBe(2);
      expect(results.summary.misses).toBe(1);
      expect(results.summary.hitRate).toBeCloseTo(0.67);
    });

    it("应该处理Redis错误情况", async () => {
      // Arrange
      const keys = ["error-key"];
      mockRedis.mget.mockRejectedValue(new Error("Redis connection failed"));

      // Act
      const results = await service.mgetEnhanced(keys);

      // Assert
      expect(results.data).toHaveLength(1);
      expect(results.data[0].value).toBeNull();
      expect(results.summary.hits).toBe(0);
      expect(results.summary.misses).toBe(1);
    });
  });

  describe("msetEnhanced", () => {
    it("应该正确处理批量设置操作", async () => {
      // Arrange
      const entries = [
        { key: "key1", value: "value1", ttl: 300 },
        { key: "key2", value: "value2", ttl: 600 },
        { key: "key3", value: "value3" },
      ];

      // Mock RedisValueUtils.serialize
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue("serialized-value");

      mockRedis.multi.mockReturnValue({
        psetex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([["OK"], ["OK"], ["OK"]]),
      });

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.successRate).toBe(1.0);
    });

    it("应该处理压缩选项", async () => {
      // Arrange
      const entries = [
        { key: "key1", value: "value1", enableCompression: true },
      ];

      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue("compressed-value");

      mockRedis.multi.mockReturnValue({
        psetex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([["OK"]]),
      });

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.summary.successful).toBe(1);
      expect(mockedSerialize).toHaveBeenCalledWith(
        "value1",
        true,
        expect.any(Object),
      );
    });

    it("应该处理超过限制的批次大小", async () => {
      // Arrange - Create 101 entries to exceed the default limit of 100
      const entries = Array.from({ length: 101 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`,
      }));

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.summary.total).toBe(101);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(101);
      expect(result.results.every((d) => !d.success)).toBe(true);
      expect(result.results[0].error).toContain(
        "Batch size 101 exceeds limit 100",
      );
    });

    it("应该处理Redis设置失败", async () => {
      // Arrange
      const entries = [{ key: "key1", value: "value1" }];

      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue("serialized-value");

      mockRedis.multi.mockReturnValue({
        psetex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([new Error("Redis error")]),
      });

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("Redis error");
    });
  });
});
