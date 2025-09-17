/**
 * msgpack 序列化功能测试
 * 验证 CacheService 中的 msgpack 序列化和反序列化功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import * as msgpack from "msgpack-lite";

import { CacheService } from "../../../../../src/cache/services/cache.service";
import { CacheUnifiedConfig } from "../../../../../src/cache/config/cache-unified.config";
import cacheUnifiedConfig from "../../../../../src/cache/config/cache-unified.config";
import { CACHE_DATA_FORMATS } from "../../../../../src/cache/constants/config/data-formats.constants";

describe("CacheService msgpack Serialization", () => {
  let service: CacheService;
  let redisClient: jest.Mocked<Redis>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUnifiedConfig: CacheUnifiedConfig = {
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
          provide: "cacheTtl",
          useValue: mockUnifiedConfig,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("msgpack Serialization", () => {
    it("should serialize and store data using msgpack format", async () => {
      redisClient.setex.mockResolvedValue("OK");

      const testData = {
        id: 123,
        name: "test",
        nested: { value: [1, 2, 3] },
        timestamp: new Date("2023-01-01T00:00:00Z"),
      };

      await service.set("test-key", testData, {
        ttl: 300,
        serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      });

      expect(redisClient.setex).toHaveBeenCalled();
      const [key, ttl, serializedValue] = redisClient.setex.mock.calls[0];

      expect(key).toBe("test-key");
      expect(ttl).toBe(300);

      // Verify the value was msgpack-serialized (should be base64-encoded msgpack data)
      expect(typeof serializedValue).toBe("string");
      expect(serializedValue).not.toBe(JSON.stringify(testData)); // Should not be JSON

      // Verify we can decode it back using msgpack
      const decodedBuffer = Buffer.from(serializedValue, "base64");
      const decodedData = msgpack.decode(decodedBuffer);
      expect(decodedData).toEqual(testData);
    });

    it("should deserialize msgpack data correctly", async () => {
      const testData = {
        id: 456,
        name: "msgpack-test",
        array: [1, 2, 3, 4, 5],
        boolean: true,
      };

      // Serialize using msgpack and encode as base64
      const msgpackData = msgpack.encode(testData);
      const base64Data = msgpackData.toString("base64");

      redisClient.get.mockResolvedValue(base64Data);

      const result = await service.get(
        "test-key",
        CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      );

      expect(result).toEqual(testData);
      expect(redisClient.get).toHaveBeenCalledWith("test-key");
    });

    it("should handle undefined values in msgpack serialization", async () => {
      redisClient.setex.mockResolvedValue("OK");

      await service.set("test-key", undefined, {
        serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      });

      expect(redisClient.setex).toHaveBeenCalled();
      const [, , serializedValue] = redisClient.setex.mock.calls[0];
      expect(serializedValue).toBe("null"); // undefined becomes 'null'
    });

    it("should handle null values in msgpack deserialization", async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await service.get(
        "test-key",
        CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      );

      expect(result).toBeNull();
    });

    it("should handle complex nested objects with msgpack", async () => {
      redisClient.setex.mockResolvedValue("OK");
      redisClient.get.mockImplementation(async (key) => {
        // Return the value that was set
        const [, , value] = redisClient.setex.mock.calls[0];
        return value;
      });

      const complexData = {
        level1: {
          level2: {
            level3: {
              numbers: [1, 2, 3.14, -42],
              strings: ["hello", "world", "中文"],
              booleans: [true, false],
              null: null,
              date: new Date("2023-01-01T00:00:00Z"),
            },
          },
        },
        flatArray: ["a", "b", "c"],
        mixedArray: [1, "string", true, { nested: "object" }],
      };

      // Set with msgpack
      await service.set("complex-key", complexData, {
        serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      });

      // Get with msgpack
      const result = await service.get(
        "complex-key",
        CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      );

      expect(result).toEqual(complexData);
    });

    it("should throw error for unsupported serializer type", async () => {
      await expect(
        service.set("test-key", "data", { serializer: "unsupported" as any }),
      ).rejects.toThrow("不支持的序列化类型: unsupported");
    });

    it("should throw error for unsupported deserializer type", async () => {
      redisClient.get.mockResolvedValue("some-data");

      await expect(
        service.get("test-key", "unsupported" as any),
      ).rejects.toThrow("不支持的反序列化类型: unsupported");
    });
  });

  describe("Performance Comparison", () => {
    it("should demonstrate msgpack vs JSON size difference", async () => {
      redisClient.setex.mockResolvedValue("OK");

      // Create test data that benefits from msgpack's efficiency
      const testData = {
        numbers: Array.from({ length: 100 }, (_, i) => i),
        repeatedStrings: Array.from({ length: 50 }, () => "repeated-string"),
        booleans: Array.from({ length: 50 }, (_, i) => i % 2 === 0),
      };

      // Set with JSON
      await service.set("json-key", testData, {
        serializer: CACHE_DATA_FORMATS.SERIALIZATION.JSON,
      });

      // Set with msgpack
      await service.set("msgpack-key", testData, {
        serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
      });

      expect(redisClient.setex).toHaveBeenCalledTimes(2);

      const jsonCall = redisClient.setex.mock.calls.find(
        (call) => call[0] === "json-key",
      );
      const msgpackCall = redisClient.setex.mock.calls.find(
        (call) => call[0] === "msgpack-key",
      );

      const jsonSize = Buffer.byteLength(jsonCall[2], "utf8");
      const msgpackSize = Buffer.byteLength(msgpackCall[2], "utf8");

      // msgpack should generally be more compact for structured data
      // Note: Due to base64 encoding, the size comparison might vary
      console.log(
        `JSON size: ${jsonSize} bytes, msgpack size: ${msgpackSize} bytes`,
      );

      expect(jsonSize).toBeGreaterThan(0);
      expect(msgpackSize).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle msgpack serialization errors gracefully", async () => {
      // Create an object that might cause serialization issues
      const circularObj: any = { name: "test" };
      circularObj.self = circularObj; // Circular reference

      await expect(
        service.set("circular-key", circularObj, {
          serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
        }),
      ).rejects.toThrow(); // Should throw serialization error
    });

    it("should handle msgpack deserialization errors gracefully", async () => {
      // Mock Redis to return invalid base64 data
      redisClient.get.mockResolvedValue("invalid-base64-data!!!");

      await expect(
        service.get("invalid-key", CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK),
      ).rejects.toThrow(); // Should throw deserialization error
    });
  });
});
