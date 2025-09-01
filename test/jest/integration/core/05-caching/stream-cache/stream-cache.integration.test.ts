import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StreamCacheModule } from "../../../../../../src/core/05-caching/stream-cache/module/stream-cache.module";
import { StreamCacheService } from "../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service";
import { StreamDataPoint } from "../../../../../../src/core/05-caching/stream-cache/interfaces/stream-cache.interface";
import Redis from "ioredis";

describe("StreamCache Integration Tests", () => {
  let module: TestingModule;
  let streamCacheService: StreamCacheService;
  let redisClient: Redis;

  // 测试用例配置
  const testConfig = {
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      db: parseInt(process.env.REDIS_TEST_DB || "15"), // 使用测试专用DB
    },
    stream_cache: {
      hot_ttl_ms: 2000, // 2秒，便于测试
      warm_ttl_seconds: 10, // 10秒，便于测试
      max_hot_size: 5, // 小容量，便于测试LRU
      cleanup_interval_ms: 1000, // 1秒清理间隔
    },
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => testConfig],
        }),
        StreamCacheModule,
      ],
    }).compile();

    streamCacheService = module.get<StreamCacheService>(StreamCacheService);
    redisClient = module.get<Redis>("REDIS_CLIENT");

    // 等待Redis连接建立
    await redisClient.ping();

    // 清理测试DB
    await redisClient.flushdb();
  });

  afterAll(async () => {
    // 清理测试数据
    await redisClient.flushdb();
    await redisClient.quit();
    await module.close();
  });

  beforeEach(async () => {
    // 每个测试前清理缓存
    await streamCacheService.clearAll();
  });

  describe("Redis连接集成", () => {
    it("应该成功连接到Redis并使用正确的DB", async () => {
      const pingResult = await redisClient.ping();
      expect(pingResult).toBe("PONG");

      // 验证使用的是测试DB
      const info = await redisClient.info("server");
      expect(info).toContain("redis_version");
    });

    it("应该能够直接操作Redis进行验证", async () => {
      const testKey = "stream:integration:test";
      const testValue = "test-value";

      await redisClient.set(testKey, testValue);
      const result = await redisClient.get(testKey);

      expect(result).toBe(testValue);

      // 清理
      await redisClient.del(testKey);
    });
  });

  describe("双层缓存集成测试", () => {
    const testData = [
      { symbol: "AAPL.US", price: 150.25, volume: 1000, timestamp: Date.now() },
      {
        symbol: "TSLA.US",
        price: 800.75,
        volume: 2000,
        timestamp: Date.now() + 1000,
      },
    ];

    it("完整的缓存流程：设置 → Hot Cache命中 → Warm Cache命中", async () => {
      const key = "integration:full-flow";

      // 1. 设置数据
      await streamCacheService.setData(key, testData, "auto");

      // 2. 立即获取 - 应该命中Hot Cache
      let result = await streamCacheService.getData(key);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].s).toBe("AAPL.US");

      let stats = streamCacheService.getCacheStats();
      expect(stats.hotCacheHits).toBe(1);
      expect(stats.warmCacheHits).toBe(0);

      // 3. 等待Hot Cache过期
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // 4. 再次获取 - 应该命中Warm Cache并提升到Hot Cache
      result = await streamCacheService.getData(key);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);

      stats = streamCacheService.getCacheStats();
      expect(stats.warmCacheHits).toBe(1);

      // 5. 立即再获取 - 应该命中提升后的Hot Cache
      result = await streamCacheService.getData(key);
      expect(result).toBeDefined();

      stats = streamCacheService.getCacheStats();
      expect(stats.hotCacheHits).toBe(2);
    });

    it("Warm Cache数据持久性验证", async () => {
      const key = "integration:warm-persistence";

      // 1. 设置数据
      await streamCacheService.setData(key, testData, "warm");

      // 2. 直接从Redis验证数据存在
      const redisKey = "stream_cache:integration:warm-persistence";
      const redisValue = await redisClient.get(redisKey);
      expect(redisValue).toBeDefined();

      const parsedData = JSON.parse(redisValue!);
      expect(parsedData).toHaveLength(2);
      expect(parsedData[0].s).toBe("AAPL.US");

      // 3. 通过服务获取数据
      const result = await streamCacheService.getData(key);
      expect(result).toEqual(parsedData);
    });

    it("Hot Cache LRU淘汰机制验证", async () => {
      const keys = Array.from({ length: 7 }, (_, i) => `lru:key${i}`);
      const singleData = [testData[0]];

      // 填满Hot Cache (容量为5) + 2个额外条目
      for (const key of keys) {
        await streamCacheService.setData(key, singleData, "hot");
      }

      // 验证Hot Cache容量限制
      const stats = streamCacheService.getCacheStats();
      expect(stats.totalSize).toBeLessThanOrEqual(5);

      // 验证最早的条目可能被淘汰，但Warm Cache中仍然存在
      const firstKeyResult = await streamCacheService.getData(keys[0]);
      expect(firstKeyResult).toBeDefined(); // 应该从Warm Cache恢复
    });
  });

  describe("数据一致性和并发测试", () => {
    it("并发读写操作的数据一致性", async () => {
      const key = "integration:concurrent";
      const baseData = [
        { symbol: "NVDA.US", price: 220.5, volume: 500, timestamp: Date.now() },
      ];

      // 并发写入
      const writePromises = Array.from({ length: 5 }, (_, i) => {
        const data = [
          { ...baseData[0], price: 220.5 + i, timestamp: Date.now() + i },
        ];
        return streamCacheService.setData(`${key}:${i}`, data);
      });

      await Promise.all(writePromises);

      // 并发读取
      const readPromises = Array.from({ length: 5 }, (_, i) =>
        streamCacheService.getData(`${key}:${i}`),
      );

      const results = await Promise.all(readPromises);

      // 验证所有读取都成功
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result![0].s).toBe("NVDA.US");
        expect(result![0].p).toBe(220.5 + i);
      });
    });

    it("大批量数据处理性能", async () => {
      const batchSize = 100;
      const largeBatch = Array.from({ length: batchSize }, (_, i) => ({
        symbol: `BATCH${i}.US`,
        price: 100 + i,
        volume: 1000 + i,
        timestamp: Date.now() + i,
      }));

      const startTime = Date.now();

      // 设置大批量数据
      await streamCacheService.setData("integration:large-batch", largeBatch);

      // 获取数据
      const result = await streamCacheService.getData(
        "integration:large-batch",
      );

      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result).toHaveLength(batchSize);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成

      // 验证数据压缩统计
      const stats = streamCacheService.getCacheStats();
      expect(stats.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe("增量查询集成测试", () => {
    it("时间序列数据的增量查询", async () => {
      const key = "integration:time-series";
      const baseTime = Date.now();

      const timeSeriesData = Array.from({ length: 10 }, (_, i) => ({
        symbol: "TIME.US",
        price: 100 + i,
        volume: 1000,
        timestamp: baseTime + i * 1000, // 每秒一个数据点
      }));

      await streamCacheService.setData(key, timeSeriesData);

      // 获取5秒后的数据
      const incrementalData = await streamCacheService.getDataSince(
        key,
        baseTime + 5000,
      );

      expect(incrementalData).toBeDefined();
      expect(incrementalData).toHaveLength(4); // 索引6-9的数据点
      expect(incrementalData![0].p).toBe(106);
      expect(incrementalData![3].p).toBe(109);
    });

    it("实时数据追加场景模拟", async () => {
      const key = "integration:real-time";
      const symbol = "REAL.US";

      // 初始数据
      const initialData = [
        { symbol, price: 100, volume: 1000, timestamp: Date.now() },
      ];

      await streamCacheService.setData(key, initialData);

      // 模拟实时数据追加（在实际场景中，这通常通过不同的机制处理）
      const updateTime = Date.now() + 1000;
      const updatedData = [
        ...initialData,
        { symbol, price: 101, volume: 1100, timestamp: updateTime },
      ];

      await streamCacheService.setData(key, updatedData);

      // 获取增量数据
      const incrementalData = await streamCacheService.getDataSince(
        key,
        Date.now() + 500,
      );

      expect(incrementalData).toBeDefined();
      expect(incrementalData).toHaveLength(1);
      expect(incrementalData![0].p).toBe(101);
    });
  });

  describe("错误恢复和容错测试", () => {
    it("Redis临时不可用时的优雅降级", async () => {
      const key = "integration:error-recovery";
      const testData = [
        { symbol: "ERROR.US", price: 50, volume: 500, timestamp: Date.now() },
      ];

      // 先设置数据到Hot Cache
      await streamCacheService.setData(key, testData, "hot");

      // 验证Hot Cache工作正常
      let result = await streamCacheService.getData(key);
      expect(result).toBeDefined();

      // 模拟Redis错误（通过直接关闭连接）
      const originalGet = redisClient.get;
      redisClient.get = jest
        .fn()
        .mockRejectedValue(new Error("Redis connection lost"));

      // Hot Cache仍应工作
      result = await streamCacheService.getData(key);
      expect(result).toBeDefined();

      // 恢复Redis连接
      redisClient.get = originalGet;

      // 服务应该恢复正常
      result = await streamCacheService.getData(key);
      expect(result).toBeDefined();
    });

    it("缓存清理操作的原子性", async () => {
      const keys = ["atomic:key1", "atomic:key2", "atomic:key3"];
      const testData = [
        { symbol: "ATOMIC.US", price: 75, volume: 750, timestamp: Date.now() },
      ];

      // 设置多个缓存条目
      for (const key of keys) {
        await streamCacheService.setData(key, testData);
      }

      // 验证所有条目都存在
      for (const key of keys) {
        const result = await streamCacheService.getData(key);
        expect(result).toBeDefined();
      }

      // 清空所有缓存
      await streamCacheService.clearAll();

      // 验证所有条目都被清理
      for (const key of keys) {
        const result = await streamCacheService.getData(key);
        expect(result).toBeNull();
      }

      // 验证Redis中的数据也被清理
      const redisKeys = await redisClient.keys("stream_cache:atomic:*");
      expect(redisKeys).toHaveLength(0);
    });
  });

  describe("性能基准测试", () => {
    it("高频访问性能测试", async () => {
      const key = "performance:high-frequency";
      const testData = [
        { symbol: "PERF.US", price: 200, volume: 2000, timestamp: Date.now() },
      ];

      // 设置数据
      await streamCacheService.setData(key, testData);

      const iterations = 1000;
      const startTime = Date.now();

      // 高频访问测试
      const promises = Array.from({ length: iterations }, () =>
        streamCacheService.getData(key),
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // 验证所有访问都成功
      expect(results.every((result) => result !== null)).toBe(true);

      // 性能要求：1000次访问应在500ms内完成
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500);

      // 验证缓存命中率
      const stats = streamCacheService.getCacheStats();
      expect(stats.hotCacheHits).toBe(iterations);
      expect(stats.hotCacheMisses).toBe(0);

      console.log(
        `高频访问性能: ${iterations}次访问耗时${totalTime}ms, 平均${totalTime / iterations}ms/次`,
      );
    });

    it("内存使用效率测试", async () => {
      const batchCount = 50;
      const itemsPerBatch = 20;

      // 设置多批数据
      for (let i = 0; i < batchCount; i++) {
        const batchData = Array.from({ length: itemsPerBatch }, (_, j) => ({
          symbol: `MEM${i}_${j}.US`,
          price: 100 + i + j,
          volume: 1000,
          timestamp: Date.now() + i * 1000 + j,
        }));

        await streamCacheService.setData(`memory:batch${i}`, batchData);
      }

      const stats = streamCacheService.getCacheStats();

      // 验证压缩效果
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThan(1); // 应该有压缩效果

      console.log(
        `内存效率: 压缩比${stats.compressionRatio.toFixed(3)}, Hot Cache大小${stats.totalSize}`,
      );
    });
  });
});
