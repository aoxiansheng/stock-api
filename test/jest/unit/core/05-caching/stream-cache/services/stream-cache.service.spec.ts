import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StreamCacheService } from "../../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service";
import {
  StreamDataPoint,
  StreamCacheStats,
} from "../../../../../../../src/core/05-caching/stream-cache/interfaces/stream-cache.interface";
import { DEFAULT_STREAM_CACHE_CONFIG } from "../../../../../../../src/core/05-caching/stream-cache/constants/stream-cache.constants";
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
} from "../../../../../../../src/monitoring/contracts";
import Redis from "ioredis";

// Mock EventEmitter2 class
class MockEventEmitter2 {
  emit = jest.fn();
  on = jest.fn();
  off = jest.fn();
  removeAllListeners = jest.fn();
}

describe("StreamCacheService", () => {
  let service: StreamCacheService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockEventBus: MockEventEmitter2;
  let module: TestingModule;

  // 测试数据
  const mockStreamData: StreamDataPoint[] = [
    { s: "AAPL.US", p: 150.25, v: 1000, t: Date.now(), c: 2.5, cp: 1.69 },
    {
      s: "TSLA.US",
      p: 800.75,
      v: 2000,
      t: Date.now() + 1000,
      c: -5.25,
      cp: -0.65,
    },
  ];

  const mockRawData = [
    { symbol: "AAPL.US", price: 150.25, volume: 1000, timestamp: Date.now() },
    {
      symbol: "TSLA.US",
      lastPrice: 800.75,
      volume: 2000,
      timestamp: Date.now() + 1000,
    },
  ];

  beforeEach(async () => {
    // 创建Redis客户端Mock
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn().mockResolvedValue("PONG"),
      quit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        StreamCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedisClient,
        },
        {
          provide: STREAM_CACHE_CONFIG_TOKEN,
          useValue: DEFAULT_STREAM_CACHE_CONFIG,
        },
        {
          provide: EventEmitter2,
          useClass: MockEventEmitter2,
        },
      ],
    }).compile();

    service = module.get<StreamCacheService>(StreamCacheService);
    mockEventBus = module.get<MockEventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe("构造函数和初始化", () => {
    it("应该正确初始化服务", () => {
      expect(service).toBeDefined();
      expect(service.getCacheStats()).toEqual({
        hotCacheHits: 0,
        hotCacheMisses: 0,
        warmCacheHits: 0,
        warmCacheMisses: 0,
        totalSize: 0,
        compressionRatio: 0,
      });
    });

    it("应该正确注入EventEmitter2", () => {
      expect(mockEventBus).toBeDefined();
      expect(mockEventBus.emit).toBeDefined();
      expect(typeof mockEventBus.emit).toBe("function");
    });
  });

  describe("getData - 缓存查找", () => {
    it("Hot Cache命中 - 应该直接返回内存中的数据", async () => {
      const key = "test:symbol";

      // 先设置数据到缓存
      await service.setData(key, mockRawData);

      // 获取数据应该命中Hot Cache
      const result = await service.getData(key);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].s).toBe("AAPL.US");
      expect(result![1].s).toBe("TSLA.US");

      // 验证统计信息（已迁移到事件驱动监控）
      const stats = service.getCacheStats();
      expect(stats.hotCacheHits).toBe(0); // 已迁移到事件监控
      expect(stats.hotCacheMisses).toBe(0); // 已迁移到事件监控

      // 等待事件发送（由于setImmediate是异步的）
      await new Promise((resolve) => setImmediate(resolve));

      // 验证事件被发送 (setData + getData = 2次调用)
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

      // 验证最后一次调用是getData的成功事件
      const lastCall =
        mockEventBus.emit.mock.calls[mockEventBus.emit.mock.calls.length - 1];
      expect(lastCall[0]).toBe("system-status.metric.collected");
      expect(lastCall[1]).toMatchObject({
        source: "stream-cache",
        metricType: "cache",
        metricName: "cache_get_success",
        tags: expect.objectContaining({
          cacheType: "stream-cache",
          layer: "hot",
          success: "true",
        }),
      });
    });

    it("Warm Cache命中 - 应该从Redis获取并提升到Hot Cache", async () => {
      const key = "test:warm-symbol";
      const serializedData = JSON.stringify(mockStreamData);

      // Mock Redis返回数据
      mockRedisClient.get.mockResolvedValueOnce(serializedData);

      const result = await service.getData(key);

      expect(result).toEqual(mockStreamData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "stream_cache:test:warm-symbol",
      );

      // 验证统计信息（已迁移到监控系统）
      const stats = service.getCacheStats();
      expect(stats.hotCacheMisses).toBe(0); // 已迁移到CollectorService
      expect(stats.warmCacheHits).toBe(0); // 已迁移到CollectorService

      // 再次获取应该命中Hot Cache
      const secondResult = await service.getData(key);
      expect(secondResult).toEqual(mockStreamData);

      const finalStats = service.getCacheStats();
      expect(finalStats.hotCacheHits).toBe(0); // 已迁移到CollectorService
    });

    it("缓存未命中 - 应该返回null", async () => {
      const key = "test:missing-key";

      // Mock Redis返回null
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.getData(key);

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "stream_cache:test:missing-key",
      );

      // 验证统计信息（已迁移到监控系统）
      const stats = service.getCacheStats();
      expect(stats.hotCacheMisses).toBe(0); // 已迁移到CollectorService
      expect(stats.warmCacheMisses).toBe(0); // 已迁移到CollectorService
    });

    it("Redis错误时应该优雅降级", async () => {
      const key = "test:error-key";

      // Mock Redis抛出错误
      mockRedisClient.get.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const result = await service.getData(key);

      expect(result).toBeNull();
    });
  });

  describe("setData - 缓存设置", () => {
    it("auto优先级 - 小数据应该设置到Hot Cache和Warm Cache", async () => {
      const key = "test:auto-small";
      const smallData = [mockRawData[0]]; // 单条数据

      mockRedisClient.setex.mockResolvedValueOnce("OK");

      await service.setData(key, smallData, "auto");

      // 验证Redis调用
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        "stream_cache:test:auto-small",
        300, // warmCacheTTL
        expect.any(String),
      );

      // 验证Hot Cache中有数据
      const result = await service.getData(key);
      expect(result).toBeDefined();
      expect(result![0].s).toBe("AAPL.US");
    });

    it("hot优先级 - 应该强制设置到Hot Cache", async () => {
      const key = "test:hot-priority";

      mockRedisClient.setex.mockResolvedValueOnce("OK");

      await service.setData(key, mockRawData, "hot");

      // 验证数据被设置到Hot Cache
      const result = await service.getData(key);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);

      // 验证Redis也被调用（总是作为备份）
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it("warm优先级 - 应该只设置到Warm Cache", async () => {
      const key = "test:warm-priority";

      mockRedisClient.setex.mockResolvedValueOnce("OK");

      await service.setData(key, mockRawData, "warm");

      // 验证Redis被调用
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        "stream_cache:test:warm-priority",
        300,
        expect.any(String),
      );
    });

    it("空数据应该被忽略", async () => {
      await service.setData("test:empty", []);
      await service.setData("test:null", null as any);

      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it("数据压缩应该正确处理时间戳", async () => {
      const dataWithoutTimestamp = [
        { symbol: "NVDA.US", price: 220.5, volume: 500 }, // 缺少timestamp
      ];

      mockRedisClient.setex.mockResolvedValueOnce("OK");

      await service.setData("test:no-timestamp", dataWithoutTimestamp);

      const result = await service.getData("test:no-timestamp");
      expect(result).toBeDefined();
      expect(result![0].t).toBeGreaterThan(0); // 应该有兜底时间戳
      expect(result![0].s).toBe("NVDA.US");
    });
  });

  describe("getDataSince - 增量查询", () => {
    beforeEach(async () => {
      // 设置测试数据
      const testData = [
        { symbol: "AAPL.US", price: 150, timestamp: 1000 },
        { symbol: "AAPL.US", price: 151, timestamp: 2000 },
        { symbol: "AAPL.US", price: 152, timestamp: 3000 },
      ];

      await service.setData("test:incremental", testData);
    });

    it("应该返回指定时间戳之后的数据", async () => {
      const result = await service.getDataSince("test:incremental", 1500);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].t).toBe(2000);
      expect(result![1].t).toBe(3000);
    });

    it("时间戳太新应该返回null", async () => {
      const result = await service.getDataSince("test:incremental", 5000);

      expect(result).toBeNull();
    });

    it("不存在的键应该返回null", async () => {
      const result = await service.getDataSince("test:missing", 1000);

      expect(result).toBeNull();
    });
  });

  describe("getBatchData - 批量获取", () => {
    beforeEach(async () => {
      await service.setData("batch:key1", [mockRawData[0]]);
      await service.setData("batch:key2", [mockRawData[1]]);
    });

    it("应该批量获取多个键的数据", async () => {
      const keys = ["batch:key1", "batch:key2", "batch:missing"];
      const result = await service.getBatchData(keys);

      expect(result).toHaveProperty("batch:key1");
      expect(result).toHaveProperty("batch:key2");
      expect(result).toHaveProperty("batch:missing");

      expect(result["batch:key1"]).toBeDefined();
      expect(result["batch:key2"]).toBeDefined();
      expect(result["batch:missing"]).toBeNull();

      expect(result["batch:key1"]![0].s).toBe("AAPL.US");
      expect(result["batch:key2"]![0].s).toBe("TSLA.US");
    });

    it("空键数组应该返回空对象", async () => {
      const result = await service.getBatchData([]);

      expect(result).toEqual({});
    });
  });

  describe("deleteData - 删除缓存", () => {
    beforeEach(async () => {
      await service.setData("test:delete", mockRawData);
    });

    it("应该删除Hot Cache和Warm Cache中的数据", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);

      await service.deleteData("test:delete");

      // 验证Redis删除调用
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        "stream_cache:test:delete",
      );

      // 验证Hot Cache中的数据被删除
      const result = await service.getData("test:delete");
      expect(result).toBeNull();
    });

    it("Redis删除失败不应该影响Hot Cache删除", async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error("Redis error"));

      // 不应该抛出异常
      await expect(service.deleteData("test:delete")).resolves.toBeUndefined();
    });
  });

  describe("clearAll - 清空缓存", () => {
    beforeEach(async () => {
      await service.setData("clear:key1", mockRawData);
      await service.setData("clear:key2", mockRawData);
    });

    it("应该清空所有Hot Cache和Warm Cache", async () => {
      const keys = ["stream_cache:clear:key1", "stream_cache:clear:key2"];
      mockRedisClient.keys.mockResolvedValueOnce(keys);
      mockRedisClient.del.mockResolvedValueOnce(2);

      await service.clearAll();

      // 验证Redis操作
      expect(mockRedisClient.keys).toHaveBeenCalledWith("stream_cache:*");
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);

      // 验证Hot Cache被清空
      const result1 = await service.getData("clear:key1");
      const result2 = await service.getData("clear:key2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();

      // 验证统计信息被重置（已迁移到监控系统）
      const stats = service.getCacheStats();
      expect(stats.hotCacheHits).toBe(0);
      expect(stats.hotCacheMisses).toBe(0); // 已迁移到CollectorService
    });

    it("没有键时应该正常处理", async () => {
      mockRedisClient.keys.mockResolvedValueOnce([]);

      await expect(service.clearAll()).resolves.toBeUndefined();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe("getCacheStats - 统计信息", () => {
    it("应该返回正确的统计信息", async () => {
      // 设置一些测试数据来产生统计
      await service.setData("stats:key1", mockRawData);
      await service.getData("stats:key1"); // Hot Cache命中
      await service.getData("stats:missing"); // Hot Cache未命中，Warm Cache也未命中

      const stats = service.getCacheStats();

      expect(stats).toHaveProperty("hotCacheHits");
      expect(stats).toHaveProperty("hotCacheMisses");
      expect(stats).toHaveProperty("warmCacheHits");
      expect(stats).toHaveProperty("warmCacheMisses");
      expect(stats).toHaveProperty("totalSize");
      expect(stats).toHaveProperty("compressionRatio");

      // 注意：统计已迁移到CollectorService，getCacheStats只返回基础信息
      expect(stats.hotCacheHits).toBe(0); // 已迁移到CollectorService
      expect(stats.totalSize).toBeGreaterThanOrEqual(1); // totalSize仍然可用
    });
  });

  describe("Hot Cache LRU机制", () => {
    it("应该在超过最大容量时清理最少使用的条目", async () => {
      // 设置较小的容量进行测试
      const smallConfigService = new StreamCacheService(
        mockRedisClient,
        mockEventBus,
        { ...DEFAULT_STREAM_CACHE_CONFIG, maxHotCacheSize: 2 },
      );

      mockRedisClient.setex.mockResolvedValue("OK");

      // 添加3个条目，应该触发LRU清理
      await smallConfigService.setData("lru:key1", [mockRawData[0]], "hot");
      await smallConfigService.setData("lru:key2", [mockRawData[1]], "hot");
      await smallConfigService.setData("lru:key3", [mockRawData[0]], "hot");

      // 验证最老的条目被清理
      const stats = smallConfigService.getCacheStats();
      expect(stats.totalSize).toBeLessThanOrEqual(2);
    });
  });

  describe("TTL过期处理", () => {
    it("Hot Cache条目应该在TTL过期后被删除", async () => {
      // 使用短TTL进行测试
      const shortTtlService = new StreamCacheService(
        mockRedisClient,
        mockEventBus,
        { ...DEFAULT_STREAM_CACHE_CONFIG, hotCacheTTL: 50 },
      );

      await shortTtlService.setData("ttl:key", mockRawData, "hot");

      // 立即获取应该成功
      let result = await shortTtlService.getData("ttl:key");
      expect(result).toBeDefined();

      // 等待TTL过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Mock Redis返回null（Warm Cache也过期）
      mockRedisClient.get.mockResolvedValueOnce(null);

      // 过期后获取应该失败
      result = await shortTtlService.getData("ttl:key");
      expect(result).toBeNull();
    });
  });
});
