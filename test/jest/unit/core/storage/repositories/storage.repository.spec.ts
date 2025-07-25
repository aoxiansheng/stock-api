import { RedisService } from "@liaoliaots/nestjs-redis";
import { ServiceUnavailableException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";

import { CACHE_CONSTANTS } from "../../../../../../src/cache/constants/cache.constants";
import { createLogger } from "../../../../../../src/common/config/logger.config";
import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_KEY_PATTERNS,
} from "../../../../../../src/core/storage/constants/storage.constants";
import { StorageRepository } from "../../../../../../src/core/storage/repositories/storage.repository";
import {
  StoredData,
  StoredDataDocument,
} from "../../../../../../src/core/storage/schemas/storage.schema";

// Mock the logger
jest.mock("../../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe("StorageRepository", () => {
  let repository: StorageRepository;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockRedis: any;
  let mockStoredDataModel: jest.Mocked<Model<StoredDataDocument>>;

  const mockStoredData = {
    key: "test-key",
    data: { symbol: "AAPL", price: 150.25 },
    dataTypeFilter: "stock-quote",
    provider: "test-provider",
    market: "US",
    dataSize: 1024,
    compressed: false,
    storedAt: new Date(),
    _id: "mock-object-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create Redis mock
    mockRedis = {
      pipeline: jest.fn().mockReturnValue({
        setex: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      }),
      del: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      randomkey: jest.fn(),
    };

    // Create RedisService mock
    mockRedisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    } as any;

    // Create Mongoose Model mock
    mockStoredDataModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageRepository,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: getModelToken(StoredData.name),
          useValue: mockStoredDataModel,
        },
      ],
    }).compile();

    repository = module.get<StorageRepository>(StorageRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with Redis connection successfully", () => {
      expect(mockRedisService.getOrThrow).toHaveBeenCalled();
      expect(repository).toBeDefined();
    });

    it("should handle Redis connection failure gracefully", async () => {
      const errorMessage = "Redis connection failed";
      mockRedisService.getOrThrow.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageRepository,
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: getModelToken(StoredData.name),
            useValue: mockStoredDataModel,
          },
        ],
      }).compile();

      const repositoryWithFailedRedis =
        module.get<StorageRepository>(StorageRepository);
      expect(repositoryWithFailedRedis).toBeDefined();
      expect(createLogger).toHaveBeenCalledWith("StorageRepository");
    });
  });

  describe("Cache Methods", () => {
    describe("getCacheKey()", () => {
      it("should generate correct cache key with prefix and separator", () => {
        const key = "test-key";
        const result = (repository as any).getCacheKey(key);
        const expected = `${CACHE_CONSTANTS.KEY_PREFIXES.STORAGE}${STORAGE_KEY_PATTERNS.CACHE_KEY_SEPARATOR}${key}`;
        expect(result).toBe(expected);
      });

      it("should handle empty key", () => {
        const key = "";
        const result = (repository as any).getCacheKey(key);
        const expected = `${CACHE_CONSTANTS.KEY_PREFIXES.STORAGE}${STORAGE_KEY_PATTERNS.CACHE_KEY_SEPARATOR}`;
        expect(result).toBe(expected);
      });

      it("should handle special characters in key", () => {
        const key = "test:key@with-special_chars";
        const result = (repository as any).getCacheKey(key);
        const expected = `${CACHE_CONSTANTS.KEY_PREFIXES.STORAGE}${STORAGE_KEY_PATTERNS.CACHE_KEY_SEPARATOR}${key}`;
        expect(result).toBe(expected);
      });
    });

    describe("storeInCache()", () => {
      it("should store data in cache with metadata successfully", async () => {
        const key = "test-key";
        const data = JSON.stringify({ test: "data" });
        const ttl = 3600;
        const compressed = false;

        mockRedis.pipeline().exec.mockResolvedValue([]);

        await repository.storeInCache(key, data, ttl, compressed);

        expect(mockRedis.pipeline).toHaveBeenCalled();
        expect(mockRedis.pipeline().setex).toHaveBeenCalledTimes(2);
        expect(mockRedis.pipeline().exec).toHaveBeenCalled();
      });

      it("should throw ServiceUnavailableException when Redis is not available", async () => {
        // Create repository with null Redis
        mockRedisService.getOrThrow.mockImplementationOnce(() => {
          throw new Error("Redis not available");
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            StorageRepository,
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
            {
              provide: getModelToken(StoredData.name),
              useValue: mockStoredDataModel,
            },
          ],
        }).compile();

        const repositoryWithoutRedis =
          module.get<StorageRepository>(StorageRepository);

        await expect(
          repositoryWithoutRedis.storeInCache("key", "data", 3600, false),
        ).rejects.toThrow(
          new ServiceUnavailableException(
            STORAGE_ERROR_MESSAGES.REDIS_NOT_AVAILABLE,
          ),
        );
      });

      it("should handle compressed data storage", async () => {
        const key = "compressed-key";
        const data = "compressed-data";
        const ttl = 1800;
        const compressed = true;

        mockRedis.pipeline().exec.mockResolvedValue([]);

        await repository.storeInCache(key, data, ttl, compressed);

        expect(mockRedis.pipeline).toHaveBeenCalled();
        const pipeline = mockRedis.pipeline();
        expect(pipeline.setex).toHaveBeenCalledWith(
          expect.stringContaining(key),
          ttl,
          data,
        );
      });

      it("should handle pipeline execution errors", async () => {
        const key = "error-key";
        const data = "test-data";
        const ttl = 3600;
        const compressed = false;

        mockRedis
          .pipeline()
          .exec.mockRejectedValue(new Error("Pipeline failed"));

        await expect(
          repository.storeInCache(key, data, ttl, compressed),
        ).rejects.toThrow("Pipeline failed");
      });
    });

    describe("retrieveFromCache()", () => {
      it("should retrieve data with metadata and TTL successfully", async () => {
        const key = "test-key";
        const mockData = JSON.stringify({ test: "data" });
        const mockMetadata = JSON.stringify({
          compressed: false,
          storedAt: new Date().toISOString(),
        });
        const mockTtl = 3600;

        mockRedis.pipeline().exec.mockResolvedValue([
          [null, mockData],
          [null, mockMetadata],
          [null, mockTtl],
        ]);

        const result = await repository.retrieveFromCache(key);

        expect(result).toEqual({
          data: mockData,
          metadata: mockMetadata,
          ttl: mockTtl,
        });
        expect(mockRedis.pipeline).toHaveBeenCalled();
      });

      it("should return null values when Redis is not available", async () => {
        // Create repository with null Redis
        mockRedisService.getOrThrow.mockImplementationOnce(() => {
          throw new Error("Redis not available");
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            StorageRepository,
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
            {
              provide: getModelToken(StoredData.name),
              useValue: mockStoredDataModel,
            },
          ],
        }).compile();

        const repositoryWithoutRedis =
          module.get<StorageRepository>(StorageRepository);

        const result =
          await repositoryWithoutRedis.retrieveFromCache("test-key");

        expect(result).toEqual({
          data: null,
          metadata: null,
          ttl: 0,
        });
      });

      it("should handle cache miss (null data)", async () => {
        const key = "missing-key";

        mockRedis.pipeline().exec.mockResolvedValue([
          [null, null],
          [null, null],
          [null, -1],
        ]);

        const result = await repository.retrieveFromCache(key);

        expect(result).toEqual({
          data: null,
          metadata: null,
          ttl: 0,
        });
      });

      it("should handle TTL value of 0 correctly", async () => {
        const key = "zero-ttl-key";
        const mockData = "test-data";

        mockRedis.pipeline().exec.mockResolvedValue([
          [null, mockData],
          [null, null],
          [null, 0],
        ]);

        const result = await repository.retrieveFromCache(key);

        expect(result.ttl).toBe(0);
      });

      it("should handle negative TTL values", async () => {
        const key = "expired-key";
        const mockData = "test-data";

        mockRedis.pipeline().exec.mockResolvedValue([
          [null, mockData],
          [null, null],
          [null, -2],
        ]);

        const result = await repository.retrieveFromCache(key);

        expect(result.ttl).toBe(0);
      });
    });

    describe("deleteFromCache()", () => {
      it("should delete data and metadata from cache successfully", async () => {
        const key = "test-key";
        mockRedis.del.mockResolvedValue(2); // Deleted 2 keys (data + metadata)

        const result = await repository.deleteFromCache(key);

        expect(result).toBe(true);
        expect(mockRedis.del).toHaveBeenCalledWith(
          expect.stringContaining(key),
          expect.stringContaining(key + STORAGE_KEY_PATTERNS.METADATA_SUFFIX),
        );
      });

      it("should return false when Redis is not available", async () => {
        // Create repository with null Redis
        mockRedisService.getOrThrow.mockImplementationOnce(() => {
          throw new Error("Redis not available");
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            StorageRepository,
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
            {
              provide: getModelToken(StoredData.name),
              useValue: mockStoredDataModel,
            },
          ],
        }).compile();

        const repositoryWithoutRedis =
          module.get<StorageRepository>(StorageRepository);

        const result = await repositoryWithoutRedis.deleteFromCache("test-key");

        expect(result).toBe(false);
      });

      it("should return false when no keys were deleted", async () => {
        const key = "non-existent-key";
        mockRedis.del.mockResolvedValue(0);

        const result = await repository.deleteFromCache(key);

        expect(result).toBe(false);
      });

      it("should return true when only one key was deleted", async () => {
        const key = "partial-key";
        mockRedis.del.mockResolvedValue(1);

        const result = await repository.deleteFromCache(key);

        expect(result).toBe(true);
      });
    });

    describe("getCacheStats()", () => {
      it("should return cache stats successfully", async () => {
        const mockInfo = "used_memory:1048576\nmaxmemory:2097152\n";
        const mockDbSize = 1500;

        mockRedis.info.mockResolvedValue(mockInfo);
        mockRedis.dbsize.mockResolvedValue(mockDbSize);

        const result = await repository.getCacheStats();

        expect(result).toEqual({
          info: mockInfo,
          dbSize: mockDbSize,
        });
        expect(mockRedis.info).toHaveBeenCalledWith("memory");
        expect(mockRedis.dbsize).toHaveBeenCalled();
      });

      it("should return null values when Redis is not available", async () => {
        // Create repository with null Redis
        mockRedisService.getOrThrow.mockImplementationOnce(() => {
          throw new Error("Redis not available");
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            StorageRepository,
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
            {
              provide: getModelToken(StoredData.name),
              useValue: mockStoredDataModel,
            },
          ],
        }).compile();

        const repositoryWithoutRedis =
          module.get<StorageRepository>(StorageRepository);

        const result = await repositoryWithoutRedis.getCacheStats();

        expect(result).toEqual({
          info: null,
          dbSize: 0,
        });
      });

      it("should handle Redis errors gracefully", async () => {
        mockRedis.info.mockRejectedValue(new Error("Redis error"));
        mockRedis.dbsize.mockRejectedValue(new Error("Redis error"));

        const result = await repository.getCacheStats();

        expect(result).toEqual({
          info: null,
          dbSize: 0,
        });
      });

      it("should handle partial Redis errors", async () => {
        const mockInfo = "memory_info";
        mockRedis.info.mockResolvedValue(mockInfo);
        mockRedis.dbsize.mockRejectedValue(new Error("DbSize error"));

        const result = await repository.getCacheStats();

        expect(result).toEqual({
          info: null,
          dbSize: 0,
        });
      });
    });

    describe("getAverageTtl()", () => {
      it("should calculate average TTL successfully", async () => {
        const mockTtls = [3600, 1800, 7200, 600, 900]; // Average: 2820

        mockRedis.randomkey
          .mockResolvedValueOnce("key1")
          .mockResolvedValueOnce("key2")
          .mockResolvedValueOnce("key3")
          .mockResolvedValueOnce("key4")
          .mockResolvedValueOnce("key5")
          .mockResolvedValue(null); // Fill remaining calls with null

        const mockPipeline = {
          ttl: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockTtls.map((ttl) => [null, ttl])),
        };
        mockRedis.pipeline.mockReturnValue(mockPipeline);

        const result = await repository.getAverageTtl();

        expect(result).toBe(
          Math.round(mockTtls.reduce((a, b) => a + b) / mockTtls.length),
        );
        expect(mockRedis.randomkey).toHaveBeenCalledTimes(20);
      });

      it("should return 0 when Redis is not available", async () => {
        // Create repository with null Redis
        mockRedisService.getOrThrow.mockImplementationOnce(() => {
          throw new Error("Redis not available");
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            StorageRepository,
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
            {
              provide: getModelToken(StoredData.name),
              useValue: mockStoredDataModel,
            },
          ],
        }).compile();

        const repositoryWithoutRedis =
          module.get<StorageRepository>(StorageRepository);

        const result = await repositoryWithoutRedis.getAverageTtl();

        expect(result).toBe(0);
      });

      it("should return 0 when no keys found", async () => {
        mockRedis.randomkey.mockResolvedValue(null);

        const result = await repository.getAverageTtl();

        expect(result).toBe(0);
      });

      it("should handle keys with no TTL (-1)", async () => {
        mockRedis.randomkey
          .mockResolvedValueOnce("key1")
          .mockResolvedValueOnce("key2")
          .mockResolvedValue(null);

        const mockPipeline = {
          ttl: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([
            [null, -1], // No TTL
            [null, 3600],
          ]),
        };
        mockRedis.pipeline.mockReturnValue(mockPipeline);

        const result = await repository.getAverageTtl();

        expect(result).toBe(3600); // Only count positive TTLs
      });

      it("should return default TTL when error occurs", async () => {
        mockRedis.randomkey.mockRejectedValue(new Error("Redis error"));

        const result = await repository.getAverageTtl();

        expect(result).toBe(3600); // Default 1 hour
      });

      it("should handle pipeline execution errors", async () => {
        mockRedis.randomkey.mockResolvedValue("key1");

        const mockPipeline = {
          ttl: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(new Error("Pipeline error")),
        };
        mockRedis.pipeline.mockReturnValue(mockPipeline);

        const result = await repository.getAverageTtl();

        expect(result).toBe(3600); // Default 1 hour
      });
    });
  });

  describe("Persistent Storage Methods", () => {
    describe("findByKey()", () => {
      it("should find document by key successfully", async () => {
        const key = "test-key";
        mockStoredDataModel.findOne.mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockStoredData),
        } as any);

        const result = await repository.findByKey(key);

        expect(result).toEqual(mockStoredData);
        expect(mockStoredDataModel.findOne).toHaveBeenCalledWith({ key });
      });

      it("should return null when document not found", async () => {
        const key = "non-existent-key";
        mockStoredDataModel.findOne.mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        } as any);

        const result = await repository.findByKey(key);

        expect(result).toBeNull();
        expect(mockStoredDataModel.findOne).toHaveBeenCalledWith({ key });
      });

      it("should handle database errors gracefully", async () => {
        const key = "error-key";
        mockStoredDataModel.findOne.mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error("Database error")),
        } as any);

        await expect(repository.findByKey(key)).rejects.toThrow(
          "Database error",
        );
      });

      it("should handle empty key", async () => {
        const key = "";
        mockStoredDataModel.findOne.mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        } as any);

        const result = await repository.findByKey(key);

        expect(result).toBeNull();
        expect(mockStoredDataModel.findOne).toHaveBeenCalledWith({ key: "" });
      });
    });

    describe("upsert()", () => {
      it("should upsert document successfully", async () => {
        const document = {
          key: "test-key",
          data: { test: "data" },
          dataTypeFilter: "test-type",
          provider: "test-provider",
          market: "US",
        };

        const mockResult = { ...mockStoredData, ...document };
        mockStoredDataModel.findOneAndUpdate.mockResolvedValue(mockResult);

        const result = await repository.upsert(document);

        expect(result).toEqual(mockResult);
        expect(mockStoredDataModel.findOneAndUpdate).toHaveBeenCalledWith(
          { key: document.key },
          document,
          { upsert: true, new: true },
        );
      });

      it("should handle upsert with minimal document", async () => {
        const document = {
          key: "minimal-key",
        };

        const mockResult = { ...mockStoredData, ...document };
        mockStoredDataModel.findOneAndUpdate.mockResolvedValue(mockResult);

        const result = await repository.upsert(document);

        expect(result).toEqual(mockResult);
        expect(mockStoredDataModel.findOneAndUpdate).toHaveBeenCalledWith(
          { key: document.key },
          document,
          { upsert: true, new: true },
        );
      });

      it("should handle database upsert errors", async () => {
        const document = { key: "error-key" };
        mockStoredDataModel.findOneAndUpdate.mockRejectedValue(
          new Error("Upsert failed"),
        );

        await expect(repository.upsert(document)).rejects.toThrow(
          "Upsert failed",
        );
      });

      it("should handle documents with complex data structures", async () => {
        const document = {
          key: "complex-key",
          data: {
            nested: {
              array: [1, 2, 3],
              object: { prop: "value" },
            },
            timestamp: new Date(),
          },
          dataTypeFilter: "complex-type",
        };

        const mockResult = { ...mockStoredData, ...document };
        mockStoredDataModel.findOneAndUpdate.mockResolvedValue(mockResult);

        const result = await repository.upsert(document);

        expect(result).toEqual(mockResult);
      });
    });

    describe("deleteByKey()", () => {
      it("should delete document by key successfully", async () => {
        const key = "test-key";
        const mockDeleteResult = { deletedCount: 1, acknowledged: true };
        mockStoredDataModel.deleteOne.mockResolvedValue(
          mockDeleteResult as any,
        );

        const result = await repository.deleteByKey(key);

        expect(result).toEqual({ deletedCount: 1 });
        expect(mockStoredDataModel.deleteOne).toHaveBeenCalledWith({ key });
      });

      it("should return zero deleted count when document not found", async () => {
        const key = "non-existent-key";
        const mockDeleteResult = { deletedCount: 0, acknowledged: true };
        mockStoredDataModel.deleteOne.mockResolvedValue(
          mockDeleteResult as any,
        );

        const result = await repository.deleteByKey(key);

        expect(result).toEqual({ deletedCount: 0 });
      });

      it("should handle database delete errors", async () => {
        const key = "error-key";
        mockStoredDataModel.deleteOne.mockRejectedValue(
          new Error("Delete failed"),
        );

        await expect(repository.deleteByKey(key)).rejects.toThrow(
          "Delete failed",
        );
      });
    });

    describe("countAll()", () => {
      it("should return total document count", async () => {
        const mockCount = 1500;
        mockStoredDataModel.countDocuments.mockResolvedValue(mockCount);

        const result = await repository.countAll();

        expect(result).toBe(mockCount);
        expect(mockStoredDataModel.countDocuments).toHaveBeenCalledWith();
      });

      it("should return 0 when collection is empty", async () => {
        mockStoredDataModel.countDocuments.mockResolvedValue(0);

        const result = await repository.countAll();

        expect(result).toBe(0);
      });

      it("should handle database count errors", async () => {
        mockStoredDataModel.countDocuments.mockRejectedValue(
          new Error("Count failed"),
        );

        await expect(repository.countAll()).rejects.toThrow("Count failed");
      });
    });

    describe("getDataTypeFilterStats()", () => {
      it("should return data type filter statistics", async () => {
        const mockStats = [
          { _id: "stock-quote", count: 500 },
          { _id: "stock-info", count: 300 },
          { _id: "market-data", count: 200 },
        ];
        mockStoredDataModel.aggregate.mockResolvedValue(mockStats);

        const result = await repository.getDataTypeFilterStats();

        expect(result).toEqual(mockStats);
        expect(mockStoredDataModel.aggregate).toHaveBeenCalledWith([
          { $group: { _id: "$dataTypeFilter", count: { $sum: 1 } } },
        ]);
      });

      it("should return empty array when no data exists", async () => {
        mockStoredDataModel.aggregate.mockResolvedValue([]);

        const result = await repository.getDataTypeFilterStats();

        expect(result).toEqual([]);
      });

      it("should handle aggregation errors", async () => {
        mockStoredDataModel.aggregate.mockRejectedValue(
          new Error("Aggregation failed"),
        );

        await expect(repository.getDataTypeFilterStats()).rejects.toThrow(
          "Aggregation failed",
        );
      });
    });

    describe("getProviderStats()", () => {
      it("should return provider statistics", async () => {
        const mockStats = [
          { _id: "longport", count: 600 },
          { _id: "itick", count: 400 },
        ];
        mockStoredDataModel.aggregate.mockResolvedValue(mockStats);

        const result = await repository.getProviderStats();

        expect(result).toEqual(mockStats);
        expect(mockStoredDataModel.aggregate).toHaveBeenCalledWith([
          { $group: { _id: "$provider", count: { $sum: 1 } } },
        ]);
      });

      it("should return empty array when no providers exist", async () => {
        mockStoredDataModel.aggregate.mockResolvedValue([]);

        const result = await repository.getProviderStats();

        expect(result).toEqual([]);
      });

      it("should handle provider aggregation errors", async () => {
        mockStoredDataModel.aggregate.mockRejectedValue(
          new Error("Provider aggregation failed"),
        );

        await expect(repository.getProviderStats()).rejects.toThrow(
          "Provider aggregation failed",
        );
      });
    });

    describe("getSizeStats()", () => {
      it("should return size statistics", async () => {
        const mockStats = [{ totalSize: 1048576 }]; // 1MB
        mockStoredDataModel.aggregate.mockResolvedValue(mockStats);

        const result = await repository.getSizeStats();

        expect(result).toEqual(mockStats);
        expect(mockStoredDataModel.aggregate).toHaveBeenCalledWith([
          { $group: { _id: null, totalSize: { $sum: "$dataSize" } } },
        ]);
      });

      it("should return zero total size when no data exists", async () => {
        mockStoredDataModel.aggregate.mockResolvedValue([]);

        const result = await repository.getSizeStats();

        expect(result).toEqual([]);
      });

      it("should handle size aggregation errors", async () => {
        mockStoredDataModel.aggregate.mockRejectedValue(
          new Error("Size aggregation failed"),
        );

        await expect(repository.getSizeStats()).rejects.toThrow(
          "Size aggregation failed",
        );
      });

      it("should handle null data sizes in aggregation", async () => {
        const mockStats = [{ totalSize: null }];
        mockStoredDataModel.aggregate.mockResolvedValue(mockStats);

        const result = await repository.getSizeStats();

        expect(result).toEqual(mockStats);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle concurrent cache operations", async () => {
      mockRedis.pipeline().exec.mockResolvedValue([]);
      // 在此重置，以避免计算在模拟设置期间的调用
      mockRedis.pipeline.mockClear();

      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.storeInCache(`key-${i}`, `data-${i}`, 3600, false),
      );

      await Promise.all(promises);

      expect(mockRedis.pipeline).toHaveBeenCalledTimes(10);
    });

    it("should handle concurrent database operations", async () => {
      const documents = Array.from({ length: 5 }, (_, i) => ({
        key: `key-${i}`,
        data: { index: i },
        dataTypeFilter: "test",
        provider: "test",
        market: "US",
      }));

      mockStoredDataModel.findOneAndUpdate.mockImplementation(
        (query, doc) => ({ ...mockStoredData, ...doc }) as any,
      );

      const promises = documents.map((doc) => repository.upsert(doc));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockStoredDataModel.findOneAndUpdate).toHaveBeenCalledTimes(5);
    });

    it("should handle malformed cache data gracefully", async () => {
      const key = "malformed-key";

      mockRedis.pipeline().exec.mockResolvedValue([
        [new Error("Malformed data"), null],
        [null, "valid-metadata"],
        [null, 3600],
      ]);

      const result = await repository.retrieveFromCache(key);

      expect(result.data).toBeNull(); // Error should result in null data
      expect(result.metadata).toBe("valid-metadata");
      expect(result.ttl).toBe(3600);
    });

    it("should handle extremely large datasets in aggregation", async () => {
      const largeStats = Array.from({ length: 1000 }, (_, i) => ({
        _id: `provider-${i}`,
        count: Math.floor(Math.random() * 1000),
      }));

      mockStoredDataModel.aggregate.mockResolvedValue(largeStats);

      const result = await repository.getProviderStats();

      expect(result).toHaveLength(1000);
      expect(result).toEqual(largeStats);
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Network timeout");
      timeoutError.name = "TimeoutError";

      mockRedis.pipeline().exec.mockRejectedValue(timeoutError);

      await expect(
        repository.storeInCache("timeout-key", "data", 3600, false),
      ).rejects.toThrow("Network timeout");
    });
  });

  describe("Performance Considerations", () => {
    it("should efficiently handle bulk cache operations", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 100 }, (_, i) =>
        repository.storeInCache(`bulk-key-${i}`, `data-${i}`, 3600, false),
      );

      mockRedis.pipeline().exec.mockResolvedValue([]);

      await Promise.all(promises);

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 operations
    });

    it("should maintain memory efficiency with large data objects", async () => {
      const largeData = {
        key: "large-data-key",
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `large-data-value-${i}`,
          timestamp: new Date(),
        })),
        dataTypeFilter: "large-dataset",
        provider: "test-provider",
        market: "US",
      };

      mockStoredDataModel.findOneAndUpdate.mockResolvedValue({
        ...mockStoredData,
        ...largeData,
      });

      const result = await repository.upsert(largeData);

      expect(result).toBeDefined();
      expect(result.data).toEqual(largeData.data);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle cache-database consistency scenarios", async () => {
      const key = "consistency-key";
      const data = { test: "data" };

      // Store in cache
      mockRedis.pipeline().exec.mockResolvedValue([]);
      await repository.storeInCache(key, JSON.stringify(data), 3600, false);

      // Store in database
      const document = {
        key,
        data,
        dataTypeFilter: "test",
        provider: "test",
        market: "US",
      };
      mockStoredDataModel.findOneAndUpdate.mockResolvedValue({
        ...mockStoredData,
        ...document,
      });
      const dbResult = await repository.upsert(document);

      expect(dbResult.key).toBe(key);
      expect(dbResult.data).toEqual(data);
    });

    it("should handle Redis failover scenarios", async () => {
      // Initial operation with Redis available
      mockRedis.pipeline().exec.mockResolvedValue([]);
      await repository.storeInCache("test-key", "data", 3600, false);

      // Simulate Redis failure by setting redis to null
      (repository as any).redis = null;

      // Operations should handle Redis unavailability gracefully
      const result = await repository.retrieveFromCache("test-key");
      expect(result).toEqual({ data: null, metadata: null, ttl: 0 });

      const deleteResult = await repository.deleteFromCache("test-key");
      expect(deleteResult).toBe(false);

      const statsResult = await repository.getCacheStats();
      expect(statsResult).toEqual({ info: null, dbSize: 0 });

      const ttlResult = await repository.getAverageTtl();
      expect(ttlResult).toBe(0);
    });
  });
});
