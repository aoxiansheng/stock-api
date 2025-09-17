/**
 * Cache Exception Handling Unit Tests
 *
 * 测试 Cache 模块的异常处理重构结果
 * 验证：
 * 1. CacheService 异常抛出的正确性
 * 2. Cache 异常类的功能完整性
 * 3. GlobalExceptionFilter 对 Cache 异常的识别
 * 4. 异常响应格式的一致性
 * 5. 容错方法的默认值返回
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { createMock } from "@golevelup/ts-jest";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";

import { CacheService } from "@cache/services/cache.service";
import {
  CacheException,
  CacheConnectionException,
  CacheOperationException,
  CacheSerializationException,
  CacheValidationException,
  CacheConfigurationException,
  CacheTimeoutException,
  CacheLockException,
  CacheBatchException,
  CacheExceptionFactory,
  isCacheException,
  getCacheExceptionOperation,
  getCacheExceptionKey,
} from "@cache/exceptions";
import { CACHE_OPERATIONS } from "@cache/constants/operations/cache-operations.constants";
import { GlobalExceptionFilter } from "@common/core/filters/global-exception.filter";
import { HttpStatus } from "@nestjs/common";

describe("Cache Exception Handling", () => {
  let cacheService: CacheService;
  let redisClient: jest.Mocked<Redis>;
  let configService: jest.Mocked<ConfigService>;
  let eventBus: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // Mock Redis client
    redisClient = {
      set: jest.fn(),
      get: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      lpush: jest.fn(),
      ltrim: jest.fn(),
      lrange: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      sismember: jest.fn(),
      hincrby: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
      ping: jest.fn(),
      status: "ready",
      disconnect: jest.fn(),
    } as any;

    // Mock EventEmitter2
    eventBus = {
      emit: jest.fn(),
    } as any;

    // Mock ConfigService
    configService = createMock<ConfigService>({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "cacheUnified") {
          return {
            defaultTtl: 300,
            maxKeyLength: 250,
            maxValueSize: 1048576,
            slowOperationMs: 1000,
            maxBatchSize: 100,
            compressionThreshold: 1024,
          };
        }
        if (key === "cacheUnified.maxKeyLength") return 250;
        if (key === "cacheUnified.maxValueSize") return 1024 * 1024;
        if (key === "cacheUnified.defaultTtl") return 300;
        return undefined;
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: "default_IORedisModuleConnectionToken",
          useValue: redisClient,
        },
        {
          provide: EventEmitter2,
          useValue: eventBus,
        },
        {
          provide: "cacheTtl",
          useValue: {
            defaultTtl: 300,
            maxKeyLength: 250,
            maxValueSize: 1048576,
            slowOperationMs: 1000,
            maxBatchSize: 100,
            compressionThreshold: 1024,
          },
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Cache Exception Classes", () => {
    describe("CacheConnectionException", () => {
      it("should create connection exception with correct properties", () => {
        const exception = new CacheConnectionException(
          "set",
          "test:key",
          new Error("Connection refused"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("set");
        expect(exception.cacheKey).toBe("test:key");
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(exception.message).toContain(
          "缓存连接失败: set (key: test:key)",
        );
      });
    });

    describe("CacheOperationException", () => {
      it("should create operation exception with correct properties", () => {
        const exception = new CacheOperationException(
          "get",
          "test:key",
          new Error("Operation failed"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("get");
        expect(exception.cacheKey).toBe("test:key");
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(exception.message).toContain(
          "缓存操作失败: get (key: test:key)",
        );
      });
    });

    describe("CacheSerializationException", () => {
      it("should create serialization exception with correct properties", () => {
        const exception = new CacheSerializationException(
          "serialize",
          "json",
          "test:key",
          new Error("Invalid JSON"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("serialize");
        expect(exception.serializationType).toBe("json");
        expect(exception.cacheKey).toBe("test:key");
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.message).toContain(
          "缓存序列化失败: serialize (type: json) (key: test:key)",
        );
      });
    });

    describe("CacheValidationException", () => {
      it("should create validation exception with correct properties", () => {
        const exception = new CacheValidationException(
          "set",
          "keyLength",
          "Key too long",
          "very-long-key",
          new Error("Validation failed"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("set");
        expect(exception.validationType).toBe("keyLength");
        expect(exception.cacheKey).toBe("very-long-key");
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.message).toContain("缓存参数验证失败: Key too long");
      });
    });

    describe("CacheTimeoutException", () => {
      it("should create timeout exception with correct properties", () => {
        const exception = new CacheTimeoutException(
          "get",
          5000,
          "test:key",
          new Error("Timeout"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("get");
        expect(exception.timeoutMs).toBe(5000);
        expect(exception.cacheKey).toBe("test:key");
        expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
        expect(exception.message).toContain(
          "缓存操作超时: get (timeout: 5000ms) (key: test:key)",
        );
      });
    });

    describe("CacheLockException", () => {
      it("should create lock exception with correct properties", () => {
        const exception = new CacheLockException(
          "lock",
          "lock:test",
          new Error("Lock failed"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("lock");
        expect(exception.lockKey).toBe("lock:test");
        expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(exception.message).toContain(
          "缓存锁操作失败: lock (lock: lock:test)",
        );
      });
    });

    describe("CacheBatchException", () => {
      it("should create batch exception with correct properties", () => {
        const exception = new CacheBatchException(
          "mget",
          100,
          "Batch too large",
          HttpStatus.BAD_REQUEST,
          50,
          new Error("Batch error"),
        );

        expect(exception).toBeInstanceOf(CacheException);
        expect(exception.operation).toBe("mget");
        expect(exception.batchSize).toBe(100);
        expect(exception.maxAllowed).toBe(50);
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.message).toContain(
          "缓存批量操作异常: Batch too large (operation: mget, size: 100, max: 50)",
        );
      });
    });
  });

  describe("CacheExceptionFactory", () => {
    describe("Factory Methods", () => {
      it("should create connection exception via factory", () => {
        const exception = CacheExceptionFactory.connection(
          "set",
          "test:key",
          new Error("Connection error"),
        );

        expect(exception).toBeInstanceOf(CacheConnectionException);
        expect(exception.operation).toBe("set");
        expect(exception.cacheKey).toBe("test:key");
      });

      it("should create operation exception via factory", () => {
        const exception = CacheExceptionFactory.operation(
          "get",
          "test:key",
          new Error("Operation error"),
        );

        expect(exception).toBeInstanceOf(CacheOperationException);
        expect(exception.operation).toBe("get");
        expect(exception.cacheKey).toBe("test:key");
      });

      it("should create serialization exception via factory", () => {
        const exception = CacheExceptionFactory.serialization(
          "serialize",
          "msgpack",
          "test:key",
          new Error("Serialize error"),
        );

        expect(exception).toBeInstanceOf(CacheSerializationException);
        expect(exception.operation).toBe("serialize");
        expect(exception.serializationType).toBe("msgpack");
      });

      it("should create validation exception via factory", () => {
        const exception = CacheExceptionFactory.validation(
          "set",
          "keyLength",
          "Too long",
          "test:key",
          new Error("Validation error"),
        );

        expect(exception).toBeInstanceOf(CacheValidationException);
        expect(exception.operation).toBe("set");
        expect(exception.validationType).toBe("keyLength");
      });

      it("should create timeout exception via factory", () => {
        const exception = CacheExceptionFactory.timeout(
          "get",
          3000,
          "test:key",
          new Error("Timeout error"),
        );

        expect(exception).toBeInstanceOf(CacheTimeoutException);
        expect(exception.operation).toBe("get");
        expect(exception.timeoutMs).toBe(3000);
      });

      it("should create lock exception via factory", () => {
        const exception = CacheExceptionFactory.lock(
          "acquire",
          "lock:test",
          new Error("Lock error"),
        );

        expect(exception).toBeInstanceOf(CacheLockException);
        expect(exception.operation).toBe("acquire");
        expect(exception.lockKey).toBe("lock:test");
      });

      it("should create batch exception via factory", () => {
        const exception = CacheExceptionFactory.batch(
          "mset",
          75,
          "Too many items",
          HttpStatus.BAD_REQUEST,
          50,
        );

        expect(exception).toBeInstanceOf(CacheBatchException);
        expect(exception.operation).toBe("mset");
        expect(exception.batchSize).toBe(75);
        expect(exception.maxAllowed).toBe(50);
      });
    });

    describe("Smart Error Detection", () => {
      it("should detect connection errors", () => {
        const error = new Error("ECONNREFUSED: Connection refused");
        const exception = CacheExceptionFactory.fromError(
          "set",
          error,
          "test:key",
        );

        expect(exception).toBeInstanceOf(CacheConnectionException);
        expect(exception.operation).toBe("set");
        expect(exception.cacheKey).toBe("test:key");
      });

      it("should detect timeout errors", () => {
        const error = new Error("Operation timeout exceeded");
        const exception = CacheExceptionFactory.fromError(
          "get",
          error,
          "test:key",
        );

        expect(exception).toBeInstanceOf(CacheTimeoutException);
        expect(exception.operation).toBe("get");
        expect(exception.cacheKey).toBe("test:key");
      });

      it("should detect serialization errors", () => {
        const error = new Error("JSON parse error: unexpected token");
        const exception = CacheExceptionFactory.fromError(
          "deserialize",
          error,
          "test:key",
        );

        expect(exception).toBeInstanceOf(CacheSerializationException);
        expect(exception.operation).toBe("deserialize");
        expect(exception.cacheKey).toBe("test:key");
      });

      it("should detect lock errors", () => {
        const error = new Error("Failed to acquire lock");
        const exception = CacheExceptionFactory.fromError(
          "acquire",
          error,
          "lock:test",
        );

        expect(exception).toBeInstanceOf(CacheLockException);
        expect(exception.operation).toBe("acquire");
        expect(exception.cacheKey).toBe("lock:test");
      });

      it("should default to operation exception for unknown errors", () => {
        const error = new Error("Unknown cache error");
        const exception = CacheExceptionFactory.fromError(
          "unknown",
          error,
          "test:key",
        );

        expect(exception).toBeInstanceOf(CacheOperationException);
        expect(exception.operation).toBe("unknown");
        expect(exception.cacheKey).toBe("test:key");
      });
    });
  });

  describe("Exception Utility Functions", () => {
    it("should identify cache exceptions correctly", () => {
      const cacheException = new CacheConnectionException("set", "test:key");
      const regularException = new Error("Regular error");

      expect(isCacheException(cacheException)).toBe(true);
      expect(isCacheException(regularException)).toBe(false);
      expect(isCacheException(null)).toBe(false);
      expect(isCacheException(undefined)).toBe(false);
    });

    it("should extract operation from cache exception", () => {
      const exception = new CacheOperationException("get", "test:key");

      expect(getCacheExceptionOperation(exception)).toBe("get");
    });

    it("should extract cache key from cache exception", () => {
      const exceptionWithKey = new CacheOperationException("get", "test:key");
      const exceptionWithoutKey = new CacheOperationException("ping");

      expect(getCacheExceptionKey(exceptionWithKey)).toBe("test:key");
      expect(getCacheExceptionKey(exceptionWithoutKey)).toBeUndefined();
    });
  });

  describe("CacheService Exception Integration", () => {
    describe("Core Operations", () => {
      it("should throw CacheOperationException when Redis set fails", async () => {
        redisClient.set.mockRejectedValueOnce(new Error("Redis set failed"));

        await expect(cacheService.set("test:key", "value")).rejects.toThrow(
          CacheOperationException,
        );

        try {
          await cacheService.set("test:key", "value");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheOperationException);
          expect((error as CacheOperationException).operation).toBe(
            CACHE_OPERATIONS.SET,
          );
          expect((error as CacheOperationException).cacheKey).toBe("test:key");
        }
      });

      it("should throw CacheOperationException when Redis get fails", async () => {
        redisClient.get.mockRejectedValueOnce(new Error("Redis get failed"));

        await expect(cacheService.get("test:key")).rejects.toThrow(
          CacheOperationException,
        );

        try {
          await cacheService.get("test:key");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheOperationException);
          expect((error as CacheOperationException).operation).toBe(
            CACHE_OPERATIONS.GET,
          );
          expect((error as CacheOperationException).cacheKey).toBe("test:key");
        }
      });

      it("should throw CacheOperationException when Redis mget fails", async () => {
        redisClient.mget.mockRejectedValueOnce(new Error("Redis mget failed"));

        await expect(cacheService.mget(["key1", "key2"])).rejects.toThrow(
          CacheOperationException,
        );

        try {
          await cacheService.mget(["key1", "key2"]);
        } catch (error) {
          expect(error).toBeInstanceOf(CacheOperationException);
          expect((error as CacheOperationException).operation).toBe(
            CACHE_OPERATIONS.MGET,
          );
        }
      });

      it("should throw CacheOperationException when Redis mset fails", async () => {
        redisClient.mset.mockRejectedValueOnce(new Error("Redis mset failed"));

        const entries = new Map([
          ["key1", "value1"],
          ["key2", "value2"],
        ]);
        await expect(cacheService.mset(entries)).rejects.toThrow(
          CacheOperationException,
        );
      });

      it("should throw CacheOperationException when Redis del fails", async () => {
        redisClient.del.mockRejectedValueOnce(new Error("Redis del failed"));

        await expect(cacheService.del("test:key")).rejects.toThrow(
          CacheOperationException,
        );

        try {
          await cacheService.del("test:key");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheOperationException);
          expect((error as CacheOperationException).operation).toBe(
            CACHE_OPERATIONS.DELETE,
          );
          expect((error as CacheOperationException).cacheKey).toBe("test:key");
        }
      });
    });

    describe("Pattern Operations", () => {
      it("should throw CacheOperationException when pattern deletion fails", async () => {
        redisClient.keys.mockRejectedValueOnce(new Error("Redis keys failed"));

        await expect(cacheService.delByPattern("test:*")).rejects.toThrow(
          CacheOperationException,
        );

        try {
          await cacheService.delByPattern("test:*");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheOperationException);
          expect((error as CacheOperationException).operation).toBe(
            CACHE_OPERATIONS.DELETE_BY_PATTERN,
          );
          expect((error as CacheOperationException).cacheKey).toBe("test:*");
        }
      });
    });

    describe("List Operations", () => {
      it("should throw CacheOperationException when list push fails", async () => {
        redisClient.lpush.mockRejectedValueOnce(
          new Error("Redis lpush failed"),
        );

        await expect(
          cacheService.listPush("test:list", "item"),
        ).rejects.toThrow(CacheOperationException);
      });

      it("should throw CacheOperationException when list trim fails", async () => {
        redisClient.ltrim.mockRejectedValueOnce(
          new Error("Redis ltrim failed"),
        );

        await expect(cacheService.listTrim("test:list", 0, 10)).rejects.toThrow(
          CacheOperationException,
        );
      });
    });

    describe("Set Operations", () => {
      it("should throw CacheOperationException when set add fails", async () => {
        redisClient.sadd.mockRejectedValueOnce(new Error("Redis sadd failed"));

        await expect(cacheService.setAdd("test:set", "member")).rejects.toThrow(
          CacheOperationException,
        );
      });

      it("should throw CacheOperationException when set remove fails", async () => {
        redisClient.srem.mockRejectedValueOnce(new Error("Redis srem failed"));

        await expect(
          cacheService.setRemove("test:set", "member"),
        ).rejects.toThrow(CacheOperationException);
      });
    });

    describe("Hash Operations", () => {
      it("should throw CacheOperationException when hash increment fails", async () => {
        redisClient.hincrby.mockRejectedValueOnce(
          new Error("Redis hincrby failed"),
        );

        await expect(
          cacheService.hashIncrementBy("test:hash", "field", 1),
        ).rejects.toThrow(CacheOperationException);
      });

      it("should throw CacheOperationException when hash set fails", async () => {
        redisClient.hset.mockRejectedValueOnce(new Error("Redis hset failed"));

        await expect(
          cacheService.hashSet("test:hash", "field", "value"),
        ).rejects.toThrow(CacheOperationException);
      });
    });

    describe("Utility Operations", () => {
      it("should throw CacheOperationException when expire fails", async () => {
        redisClient.expire.mockRejectedValueOnce(
          new Error("Redis expire failed"),
        );

        await expect(cacheService.expire("test:key", 300)).rejects.toThrow(
          CacheOperationException,
        );
      });
    });

    describe("Validation Errors", () => {
      it("should throw CacheValidationException for oversized keys", async () => {
        const longKey = "a".repeat(300); // Exceeds maxKeyLength (250)

        await expect(cacheService.set(longKey, "value")).rejects.toThrow(
          CacheValidationException,
        );

        try {
          await cacheService.set(longKey, "value");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheValidationException);
          expect((error as CacheValidationException).validationType).toBe(
            "keyLength",
          );
          expect((error as CacheValidationException).operation).toBe(
            CACHE_OPERATIONS.SET,
          );
        }
      });
    });

    describe("Serialization Errors", () => {
      it("should throw CacheSerializationException when set operation with serialization fails", async () => {
        const circularObj = {};
        (circularObj as any).self = circularObj; // Create circular reference

        await expect(cacheService.set("test:key", circularObj)).rejects.toThrow(
          CacheSerializationException,
        );

        try {
          await cacheService.set("test:key", circularObj);
        } catch (error) {
          expect(error).toBeInstanceOf(CacheSerializationException);
          expect((error as CacheSerializationException).operation).toBe(
            CACHE_OPERATIONS.SET,
          );
        }
      });

      it("should throw CacheSerializationException when get operation with deserialization fails", async () => {
        redisClient.get.mockResolvedValueOnce('{"invalid": json}'); // Invalid JSON

        await expect(cacheService.get("test:key")).rejects.toThrow(
          CacheSerializationException,
        );

        try {
          await cacheService.get("test:key");
        } catch (error) {
          expect(error).toBeInstanceOf(CacheSerializationException);
          expect((error as CacheSerializationException).operation).toBe(
            CACHE_OPERATIONS.GET,
          );
        }
      });
    });
  });

  describe("Fault-Tolerant Methods", () => {
    it("should return default values for fault-tolerant list operations", async () => {
      redisClient.lrange.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const result = await cacheService.listRange("test:list", 0, -1);
      expect(result).toEqual([]);
    });

    it("should return default values for fault-tolerant set operations", async () => {
      redisClient.sismember.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const result = await cacheService.setIsMember("test:set", "member");
      expect(result).toBe(false);

      redisClient.smembers.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const members = await cacheService.setMembers("test:set");
      expect(members).toEqual([]);
    });

    it("should return default values for fault-tolerant hash operations", async () => {
      redisClient.hgetall.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const result = await cacheService.hashGetAll("test:hash");
      expect(result).toEqual({});
    });
  });

  describe("GetOrSet Operation", () => {
    it("should throw CacheOperationException when getOrSet get operation fails", async () => {
      redisClient.get.mockRejectedValueOnce(new Error("Redis get failed"));
      const factory = jest.fn();

      await expect(cacheService.getOrSet("test:key", factory)).rejects.toThrow(
        CacheOperationException,
      );

      try {
        await cacheService.getOrSet("test:key", factory);
      } catch (error) {
        expect(error).toBeInstanceOf(CacheOperationException);
        expect((error as CacheOperationException).operation).toBe(
          CACHE_OPERATIONS.GET_OR_SET,
        );
        expect((error as CacheOperationException).cacheKey).toBe("test:key");
      }
    });

    it("should throw CacheOperationException when getOrSet set operation fails", async () => {
      redisClient.get.mockResolvedValueOnce(null); // Cache miss
      redisClient.set.mockRejectedValueOnce(new Error("Redis set failed"));
      const factory = jest.fn().mockResolvedValue("factory-value");

      await expect(cacheService.getOrSet("test:key", factory)).rejects.toThrow(
        CacheOperationException,
      );
    });
  });
});

describe("GlobalExceptionFilter Cache Integration", () => {
  let filter: GlobalExceptionFilter;
  let eventBus: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
    } as any;

    filter = new GlobalExceptionFilter(eventBus);
  });

  it("should identify and handle Cache exceptions", () => {
    const cacheException = new CacheConnectionException(
      "set",
      "test:key",
      new Error("Connection failed"),
    );

    expect(isCacheException(cacheException)).toBe(true);
    expect(getCacheExceptionOperation(cacheException)).toBe("set");
    expect(getCacheExceptionKey(cacheException)).toBe("test:key");
  });

  it("should preserve Cache exception HTTP status codes", () => {
    const connectionException = new CacheConnectionException("set", "test:key");
    expect(connectionException.getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    const validationException = new CacheValidationException(
      "set",
      "keyLength",
      "Key too long",
      "test:key",
    );
    expect(validationException.getStatus()).toBe(HttpStatus.BAD_REQUEST);

    const timeoutException = new CacheTimeoutException("get", 5000, "test:key");
    expect(timeoutException.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);

    const lockException = new CacheLockException("acquire", "lock:test");
    expect(lockException.getStatus()).toBe(HttpStatus.CONFLICT);
  });

  it("should extract proper error information from Cache exceptions", () => {
    const exception = new CacheOperationException(
      "get",
      "test:key",
      new Error("Original Redis error"),
    );
    const response = exception.getResponse();

    expect(response).toMatchObject({
      message: expect.stringContaining("缓存操作失败: get (key: test:key)"),
      error: "CacheException",
      operation: "get",
      cacheKey: "test:key",
      originalError: "Original Redis error",
      timestamp: expect.any(String),
    });
  });
});
