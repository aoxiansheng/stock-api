/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import {
  CACHE_CONSTANTS,
  CACHE_WARNING_MESSAGES,
  CACHE_OPERATIONS,
} from "../../../../../src/cache/constants/cache.constants";
import { BadRequestException } from "@nestjs/common";

describe("CacheService Optimization Features", () => {
  let service: CacheService;
  let mockRedis: any;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();

    mockRedis = {
      setex: jest.fn().mockResolvedValue("OK"),
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockResolvedValue([null, null, null]),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      dbsize: jest.fn().mockResolvedValue(0),
      pipeline: jest.fn().mockReturnValue({
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([["OK"]]),
      }),
      ping: jest.fn().mockResolvedValue("PONG"),
      info: jest.fn().mockImplementation((section?: string) => {
        if (section === "memory") {
          return Promise.resolve("usedmemory:1000\r\_nmaxmemory:10000\r\n");
        }
        if (section === "keyspace") {
          return Promise.resolve("_db0:keys=0,_expires=0,avgttl=0\r\n");
        }
        return Promise.resolve(
          "keyspacehits:0\r\nkeyspacemisses:0\r\nused_memory:1000\r\n",
        );
      }),
      eval: jest.fn().mockResolvedValue(1),
    };

    const mockRedisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Spy on logger
    loggerSpy = jest
      .spyOn((service as any).logger, "warn")
      .mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("Key Length Validation", () => {
    it("should throw an exception when key length exceeds maximum", async () => {
      const longKey = "x".repeat(
        CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH + 1,
      );

      await expect(service.set(longKey, "test value")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should not warn when key length is within limits", async () => {
      const normalKey = "normal:key";

      await service.set(normalKey, "test value");

      expect(loggerSpy).not.toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.LARGE_VALUEWARNING,
        expect.objectContaining({
          operation: "validateKeyLength",
        }),
      );
    });
  });

  describe("Value Size Validation", () => {
    it("should warn when value size exceeds maximum", async () => {
      const largeValue = "x".repeat(
        CACHE_CONSTANTS.SIZE_LIMITS.MAX_VALUE_SIZE_MB * 1024 * 1024 + 1,
      );

      await service.set("test:key", largeValue);

      expect(loggerSpy).toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING,
        expect.objectContaining({
          operation: CACHE_OPERATIONS.SERIALIZE,
        }),
      );
    });

    it("should not warn when value size is within limits", async () => {
      const normalValue = { data: "test" };

      await service.set("test:key", normalValue);

      expect(loggerSpy).not.toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING,
        expect.objectContaining({
          operation: CACHE_OPERATIONS.SERIALIZE,
        }),
      );
    });
  });

  describe("Batch Size Validation", () => {
    it("should warn when batch size exceeds limit for mset", async () => {
      const largeEntries = new Map();
      for (let i = 0; i < CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE + 1; i++) {
        largeEntries.set(`key:${i}`, `value:${i}`);
      }

      await service.mset(largeEntries);

      expect(loggerSpy).toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING,
        expect.objectContaining({
          operation: CACHE_OPERATIONS._M_SET,
          batchSize: largeEntries.size,
          limit: CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCHSIZE,
        }),
      );
    });

    it("should warn when batch size exceeds limit for mget", async () => {
      const largeKeys = Array.from(
        { length: CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE + 1 },
        (_, i) => `key:${i}`,
      );

      // 修复：确保 mock 返回的数组长度与请求的 keys 数量匹配
      mockRedis.mget.mockResolvedValue(
        Array.from({ length: largeKeys.length }, () => null),
      );

      await service.mget(largeKeys);

      expect(loggerSpy).toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING,
        expect.objectContaining({
          operation: CACHE_OPERATIONS._MGET,
          batchSize: largeKeys.length,
          limit: CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE,
        }),
      );
    });
  });

  describe("Performance Monitoring", () => {
    it("should warn about slow operations", async () => {
      // Mock a slow Redis operation
      mockRedis.setex.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve("OK"),
              CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS + 10,
            ),
          ),
      );

      const setPromise = service.set("test:key", "test value");

      // Manually advance timers to trigger the setTimeout in the mock
      jest.advanceTimersByTime(
        CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS + 10,
      );

      await setPromise;

      expect(loggerSpy).toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.SLOWOPERATION,
        expect.objectContaining({
          operation: CACHE_OPERATIONS.SET,
          key: "test:key",
          threshold: CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATIONMS,
        }),
      );
    });
  });

  describe("Cache Hit Rate Monitoring", () => {
    it("should warn about high miss rate", async () => {
      // Simulate many cache misses
      for (let i = 0; i < 150; i++) {
        await service.get(`miss:key:${i}`);
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        CACHE_WARNING_MESSAGES.HIGH_MISSRATE,
        expect.objectContaining({
          operation: CACHE_OPERATIONS.UPDATEMETRICS,
          pattern: "miss:*",
          threshold:
            CACHE_CONSTANTS.MONITORING_CONFIG.ALERT_THRESHOLD_PERCENT / 100,
        }),
      );
    });
  });

  describe("Health Check Optimization", () => {
    it("should log health check failures with proper error messages", async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation();
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));

      await service.healthCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("缓存健康检查失败"),
        expect.objectContaining({
          operation: CACHE_OPERATIONS.HEALTHCHECK,
        }),
      );
    });
  });

  describe("Optimization Tasks", () => {
    it("should log optimization tasks startup", () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();

      (service as any).startOptimizationTasks();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("缓存优化任务启动"),
        expect.objectContaining({
          operation: CACHE_OPERATIONS.UPDATE_METRICS,
        }),
      );
    });
  });
});
