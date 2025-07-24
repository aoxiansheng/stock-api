import { CacheService } from "../../../../src/cache/cache.service";
import { Test, TestingModule } from "@nestjs/testing";
import { RedisService, RedisModule } from "@liaoliaots/nestjs-redis";
import Redis from "ioredis";

describe("CacheService", () => {
  let service: CacheService;
  let redisService: RedisService;
  let redisClient: jest.Mocked<Redis>;

  beforeEach(async () => {
    // 确保每个测试开始前都有干净的环境
    jest.clearAllMocks();
    jest.resetAllMocks();

    const mockRedisClient = {
      // 基础 Redis 操作 - 提供默认的成功响应
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue("OK"),
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(-1),
      ping: jest.fn().mockResolvedValue("PONG"),
      mget: jest.fn().mockResolvedValue([]),
      dbsize: jest.fn().mockResolvedValue(0),

      // info 方法 - 提供智能的默认响应
      info: jest.fn().mockImplementation((section?: string) => {
        if (section === "memory") {
          return Promise.resolve(
            "used_memory:1024000\r\nmaxmemory:2048000\r\n",
          );
        }
        if (section === "keyspace") {
          return Promise.resolve("db0:keys=0,expires=0,avg_ttl=0\r\n");
        }
        // 无参数时返回包含 keyspace_hits 和 keyspace_misses 的信息
        return Promise.resolve(
          "keyspace_hits:0\r\nkeyspace_misses:0\r\nused_memory:1024000\r\n",
        );
      }),

      // pipeline 方法 - 提供默认的成功响应
      pipeline: jest.fn(() => ({
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, "OK"],
          [null, "OK"],
        ]), // 修复：使用正确的 Redis pipeline.exec() 格式
      })),

      // eval 方法 - 用于锁操作
      eval: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<Redis>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
    redisClient = redisService.getOrThrow() as jest.Mocked<Redis>;
  });

  afterEach(() => {
    // 强化 Mock 清理，确保彻底的环境隔离
    jest.clearAllMocks();
    jest.resetAllMocks();

    // 显式重置 Redis Client Mock 的所有方法
    Object.keys(redisClient).forEach((key) => {
      if (typeof redisClient[key].mockReset === "function") {
        redisClient[key].mockReset();
      }
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("should return deserialized value from cache", async () => {
      const key = "test_key";
      const value = { data: "test_data" };
      redisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(redisClient.get).toHaveBeenCalledWith(key);
    });

    it("should return null if key does not exist", async () => {
      const key = "non_existent_key";
      redisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it("should handle compressed values", async () => {
      const key = "compressed_key";
      const value = { data: "test_data" };
      // 修复：使用真正的 gzip 压缩数据
      const zlib = require("zlib");
      const compressedBuffer = zlib.gzipSync(JSON.stringify(value));
      const compressedData = compressedBuffer.toString("base64");
      redisClient.get.mockResolvedValue(`COMPRESSED::${compressedData}`);

      const result = await service.get(key);

      expect(result).toEqual(value);
    });
  });

  describe("set", () => {
    it("should serialize and set value in cache with TTL", async () => {
      const key = "test_key";
      const value = { data: "test_data" };
      const options = { ttl: 3600 };
      redisClient.setex.mockResolvedValue("OK");

      const result = await service.set(key, value, options);

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalledWith(
        key,
        options.ttl,
        JSON.stringify(value),
      );
    });

    it("should handle compression for large values", async () => {
      const key = "large_key";
      const value = { data: "x".repeat(2000) };
      const options = { ttl: 3600, compressionThreshold: 1000 };
      redisClient.setex.mockResolvedValue("OK");

      const result = await service.set(key, value, options);

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalledWith(
        key,
        options.ttl,
        expect.stringContaining("COMPRESSED::"),
      );
    });

    it("should handle Redis errors gracefully", async () => {
      const key = "error_key";
      const value = { data: "test" };
      redisClient.setex.mockRejectedValue(new Error("Redis connection failed"));

      await expect(service.set(key, value)).rejects.toThrow(
        "Redis connection failed",
      );
    });

    it("should validate key length", async () => {
      const longKey = "x".repeat(300); // 超过最大键长度
      const value = { data: "test" };

      await expect(service.set(longKey, value)).rejects.toThrow();
    });

    it("should return false when Redis setex fails", async () => {
      const key = "test_key";
      const value = { data: "test" };
      redisClient.setex.mockResolvedValue(null); // setex 失败

      const result = await service.set(key, value);

      expect(result).toBe(false);
    });
  });

  describe("del", () => {
    it("should delete single key", async () => {
      const key = "test_key";
      redisClient.del.mockResolvedValue(1);

      const result = await service.del(key);

      expect(result).toBe(1);
      expect(redisClient.del).toHaveBeenCalledWith(key);
    });

    it("should delete multiple keys", async () => {
      const keys = ["key1", "key2", "key3"];
      redisClient.del.mockResolvedValue(3);

      const result = await service.del(keys);

      expect(result).toBe(3);
      expect(redisClient.del).toHaveBeenCalledWith(...keys);
    });

    it("should handle Redis errors during deletion", async () => {
      const key = "error_key";
      redisClient.del.mockRejectedValue(new Error("Delete failed"));

      await expect(service.del(key)).rejects.toThrow("Delete failed");
    });
  });

  // exists method removed - doesn't exist in CacheService

  describe("expire", () => {
    it("should set expiration for key", async () => {
      const key = "test_key";
      const ttl = 3600;
      redisClient.expire = jest.fn().mockResolvedValue(1);

      const result = await service.expire(key, ttl);

      expect(result).toBe(true);
      expect(redisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it("should return false if key does not exist", async () => {
      const key = "non_existent_key";
      const ttl = 3600;
      redisClient.expire = jest.fn().mockResolvedValue(0);

      const result = await service.expire(key, ttl);

      expect(result).toBe(false);
    });
  });

  describe("getOrSet", () => {
    it("should return cached value if exists", async () => {
      const key = "cached_key";
      const cachedValue = { data: "cached" };
      redisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const callback = jest.fn().mockResolvedValue({ data: "new" });
      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(cachedValue);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should execute callback and cache result if key does not exist", async () => {
      const key = "new_key";
      const newValue = { data: "new" };
      redisClient.get.mockResolvedValueOnce(null); // 第一次获取返回null
      redisClient.set.mockResolvedValue("OK"); // 获取锁成功
      redisClient.setex.mockResolvedValue("OK"); // 缓存设置成功

      const callback = jest.fn().mockResolvedValue(newValue);
      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(newValue);
      expect(callback).toHaveBeenCalled();
    });

    it("should handle lock acquisition failure", async () => {
      const key = "locked_key";
      const newValue = { data: "new" };
      redisClient.get.mockResolvedValueOnce(null); // 第一次获取返回null
      redisClient.set.mockResolvedValue(null); // 获取锁失败

      // 第二次获取返回缓存的值（模拟其他进程已经缓存了）
      redisClient.get.mockResolvedValueOnce(JSON.stringify(newValue));

      const callback = jest.fn().mockResolvedValue(newValue);
      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(newValue);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("mget", () => {
    it("should get multiple values", async () => {
      const keys = ["key1", "key2", "key3"];
      const values = ['{"data": "value1"}', '{"data": "value2"}', null];
      redisClient.mget.mockResolvedValue(values);

      const result = await service.mget(keys);

      expect(result).toBeInstanceOf(Map);
      expect(result.get("key1")).toEqual({ data: "value1" });
      expect(result.get("key2")).toEqual({ data: "value2" });
      expect(result.has("key3")).toBe(false);
      expect(redisClient.mget).toHaveBeenCalledWith(...keys);
    });

    it("should handle empty keys array", async () => {
      const keys: string[] = [];

      const result = await service.mget(keys);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(redisClient.mget).not.toHaveBeenCalled();
    });
  });

  describe("mset", () => {
    it("should set multiple key-value pairs", async () => {
      const entries = new Map([
        ["key1", { data: "value1" }],
        ["key2", { data: "value2" }],
      ]);
      const ttl = 3600;

      const pipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, "OK"],
          [null, "OK"],
        ]),
      };
      redisClient.pipeline.mockReturnValue(pipeline as any);

      const result = await service.mset(entries, ttl);

      expect(result).toBe(true);
      expect(pipeline.setex).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it("should handle empty entries map", async () => {
      const entries = new Map();

      const result = await service.mset(entries);

      expect(result).toBe(true);
      expect(redisClient.pipeline).not.toHaveBeenCalled();
    });

    it("should handle pipeline execution failure", async () => {
      const entries = new Map([["key1", { data: "value1" }]]);

      const pipeline = {
        setex: jest.fn(),
        exec: jest
          .fn()
          .mockResolvedValue([[new Error("Pipeline failed"), null]]),
      };
      redisClient.pipeline.mockReturnValue(pipeline as any);

      const result = await service.mset(entries);

      expect(result).toBe(false);
    });
  });

  // keys method removed - doesn't exist in CacheService

  // flushAll method removed - doesn't exist in CacheService

  describe("healthCheck", () => {
    it("should return healthy status", async () => {
      redisClient.ping.mockResolvedValue("PONG");
      redisClient.info.mockResolvedValue(
        "keyspace_hits:100\r\nkeyspace_misses:10",
      );

      const result = await service.healthCheck();

      expect(result.status).toBe("healthy");
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.errors).toEqual([]);
    });

    it("should return unhealthy status on Redis error", async () => {
      redisClient.ping.mockRejectedValue(new Error("Connection failed"));

      const result = await service.healthCheck();

      expect(result.status).toBe("unhealthy");
      expect(result.errors).toContain("缓存健康检查失败");
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", async () => {
      redisClient.info.mockImplementation((section?: string) => {
        if (section === "keyspace") {
          return Promise.resolve("db0:keys=100,expires=50,avg_ttl=60000");
        }
        // Default/no-section case for the first info() call in getStats
        return Promise.resolve(
          "used_memory:1024000\r\nmaxmemory:2048000\r\nkeyspace_hits:500\r\nkeyspace_misses:50",
        );
      });
      redisClient.dbsize.mockResolvedValue(100);

      const result = await service.getStats();

      expect(result.memoryUsage).toBe(1024000);
      expect(result.avgTtl).toBeGreaterThanOrEqual(0);
      expect(result.keyCount).toBe(100);
      expect(result.hitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("listPush", () => {
    it("should push single item to list", async () => {
      const key = "test_list";
      const item = "test_item";
      redisClient.lpush = jest.fn().mockResolvedValue(1);

      const result = await service.listPush(key, item);

      expect(result).toBe(1);
      expect(redisClient.lpush).toHaveBeenCalledWith(key, item);
    });

    it("should push multiple items to list", async () => {
      const key = "test_list";
      const items = ["item1", "item2", "item3"];
      redisClient.lpush = jest.fn().mockResolvedValue(3);

      const result = await service.listPush(key, items);

      expect(result).toBe(3);
      expect(redisClient.lpush).toHaveBeenCalledWith(key, ...items);
    });
  });

  describe("listRange", () => {
    it("should return list range with fault tolerance", async () => {
      const key = "test_list";
      const start = 0;
      const stop = -1;
      const items = ["item1", "item2", "item3"];
      redisClient.lrange = jest.fn().mockResolvedValue(items);

      const result = await service.listRange(key, start, stop);

      expect(result).toEqual(items);
      expect(redisClient.lrange).toHaveBeenCalledWith(key, start, stop);
    });

    it("should return empty array on Redis error (fault tolerant)", async () => {
      const key = "test_list";
      redisClient.lrange = jest
        .fn()
        .mockRejectedValue(new Error("Redis error"));

      const result = await service.listRange(key, 0, -1);

      expect(result).toEqual([]);
    });
  });

  describe("listTrim", () => {
    it("should trim list to specified range", async () => {
      const key = "test_list";
      const start = 0;
      const stop = 99;
      redisClient.ltrim = jest.fn().mockResolvedValue("OK");

      const result = await service.listTrim(key, start, stop);

      expect(result).toBe("OK");
      expect(redisClient.ltrim).toHaveBeenCalledWith(key, start, stop);
    });

    it("should handle Redis errors during trim", async () => {
      const key = "test_list";
      redisClient.ltrim = jest.fn().mockRejectedValue(new Error("Trim failed"));

      await expect(service.listTrim(key, 0, 99)).rejects.toThrow("Trim failed");
    });
  });

  describe("hashSet", () => {
    it("should set hash field", async () => {
      const key = "test_hash";
      const field = "field1";
      const value = "value1";
      redisClient.hset = jest.fn().mockResolvedValue(1);

      const result = await service.hashSet(key, field, value);

      expect(result).toBe(1);
      expect(redisClient.hset).toHaveBeenCalledWith(key, field, value);
    });

    it("should handle Redis errors during hash set", async () => {
      const key = "test_hash";
      const field = "field1";
      const value = "value1";
      redisClient.hset = jest
        .fn()
        .mockRejectedValue(new Error("Hash set failed"));

      await expect(service.hashSet(key, field, value)).rejects.toThrow(
        "Hash set failed",
      );
    });
  });

  // hashGet method removed - doesn't exist in CacheService

  describe("hashGetAll", () => {
    it("should get all hash fields with fault tolerance", async () => {
      const key = "test_hash";
      const hashData = {
        field1: "value1",
        field2: "value2",
      };
      redisClient.hgetall = jest.fn().mockResolvedValue(hashData);

      const result = await service.hashGetAll(key);

      expect(result).toEqual(hashData);
    });

    it("should return empty object on Redis error (fault tolerant)", async () => {
      const key = "test_hash";
      redisClient.hgetall = jest
        .fn()
        .mockRejectedValue(new Error("Redis error"));

      const result = await service.hashGetAll(key);

      expect(result).toEqual({});
    });
  });

  describe("setIsMember", () => {
    it("should check if member exists in set with fault tolerance", async () => {
      const key = "test_set";
      const member = "member1";
      redisClient.sismember = jest.fn().mockResolvedValue(1);

      const result = await service.setIsMember(key, member);

      expect(result).toBe(true);
      expect(redisClient.sismember).toHaveBeenCalledWith(key, member);
    });

    it("should return false on Redis error (fault tolerant)", async () => {
      const key = "test_set";
      const member = "member1";
      redisClient.sismember = jest
        .fn()
        .mockRejectedValue(new Error("Redis error"));

      const result = await service.setIsMember(key, member);

      expect(result).toBe(false);
    });
  });

  describe("setMembers", () => {
    it("should get all set members with fault tolerance", async () => {
      const key = "test_set";
      const members = ["member1", "member2", "member3"];
      redisClient.smembers = jest.fn().mockResolvedValue(members);

      const result = await service.setMembers(key);

      expect(result).toEqual(members);
      expect(redisClient.smembers).toHaveBeenCalledWith(key);
    });

    it("should return empty array on Redis error (fault tolerant)", async () => {
      const key = "test_set";
      redisClient.smembers = jest
        .fn()
        .mockRejectedValue(new Error("Redis error"));

      const result = await service.setMembers(key);

      expect(result).toEqual([]);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle malformed JSON during deserialization", async () => {
      const key = "malformed_json_key";
      redisClient.get.mockResolvedValue("invalid json");

      await expect(service.get(key)).rejects.toThrow();
    });

    it("should handle compression/decompression errors", async () => {
      const key = "compression_error_key";
      redisClient.get.mockResolvedValue("COMPRESSED::invalid_compressed_data");

      await expect(service.get(key)).rejects.toThrow();
    });

    it("should validate key length in get operation", async () => {
      const longKey = "x".repeat(300);

      await expect(service.get(longKey)).rejects.toThrow();
    });

    it("should handle undefined values gracefully", async () => {
      const key = "undefined_value_key";
      const options = { ttl: 3600 };
      redisClient.setex.mockResolvedValue("OK");

      const result = await service.set(key, undefined, options);

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalledWith(key, options.ttl, "null");
    });
  });
});
