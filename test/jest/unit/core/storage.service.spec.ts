import { Test, TestingModule } from "@nestjs/testing";
import { StorageService } from "../../../../src/core/storage/service/storage.service";
import { StorageRepository } from "../../../../src/core/storage/repositories/storage.repository";
import { getModelToken } from "@nestjs/mongoose";
import { StoredData } from "../../../../src/core/storage/schemas/storage.schema";
import {
  StoreDataDto,
  RetrieveDataDto,
} from "../../../../src/core/storage/dto/storage-request.dto";
import {
  StorageType,
  DataClassification,
} from "../../../../src/core/storage/enums/storage-type.enum";
import * as zlib from "zlib";

// Mock createLogger for core modules
const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

// Mock zlib functions using jest.spyOn
const mockZlib = {
  gzip: jest
    .spyOn(zlib, "gzip")
    .mockImplementation((data: any, callback: any) => {
      // Mock successful compression
      const compressed = Buffer.from("compressed-" + data);
      if (callback) callback(null, compressed);
      return compressed;
    }),
  gunzip: jest
    .spyOn(zlib, "gunzip")
    .mockImplementation((data: any, callback: any) => {
      // Mock successful decompression
      const decompressed = data.toString().replace("compressed-", "");
      if (callback) callback(null, Buffer.from(decompressed));
      return Buffer.from(decompressed);
    }),
};

// Redis mock is defined but not directly used in this test file
// We keep it as a reference for future usage

describe("StorageService", () => {
  let service: StorageService;
  let storageRepository: any;

  const mockStoredData = {
    _id: "507f1f77bcf86cd799439011",
    key: "test-key",
    data: { symbol: "AAPL", price: 150.75 },
    dataClassification: DataClassification.STOCK_QUOTE,
    provider: "test-provider",
    market: "US",
    dataSize: 100,
    compressed: false,
    tags: { category: "test", environment: "unit-test" },
    expiresAt: new Date(Date.now() + 3600000),
    storedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockStoredDataModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      lean: jest.fn(),
    };

    // Mock StorageRepository
    storageRepository = {
      storeInCache: jest.fn().mockResolvedValue(true),
      retrieveFromCache: jest
        .fn()
        .mockResolvedValue({ data: null, metadata: null, ttl: -2 }),
      deleteFromCache: jest.fn().mockResolvedValue(1),
      upsert: jest.fn().mockResolvedValue(mockStoredData),
      findByKey: jest.fn().mockResolvedValue(null),
      deleteByKey: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countAll: jest.fn().mockResolvedValue(0),
      getCacheStats: jest.fn().mockResolvedValue({ info: null, dbSize: 0 }),
      getAverageTtl: jest.fn().mockResolvedValue(0),
      getDataTypeFilterStats: jest.fn().mockResolvedValue([]),
      getProviderStats: jest.fn().mockResolvedValue([]),
      getSizeStats: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: getModelToken(StoredData.name),
          useValue: mockStoredDataModel,
        },
        {
          provide: StorageRepository,
          useValue: storageRepository,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    storageRepository = module.get(StorageRepository);

    // Clear all previous calls
    jest.clearAllMocks();

    // Clear all mocks
    jest.clearAllMocks();

    // Reset zlib mocks
    mockZlib.gzip.mockClear();
    mockZlib.gunzip.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("service initialization", () => {
    it("should be properly initialized", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StorageService);
    });
  });

  describe("storeData", () => {
    const storeRequest: StoreDataDto = {
      key: "test-key",
      data: { symbol: "AAPL", price: 150.75 },
      dataClassification: DataClassification.STOCK_QUOTE,
      provider: "test-provider",
      market: "US",
      storageType: StorageType.CACHE,
      options: {
        tags: { category: "test", environment: "unit-test" },
        cacheTtl: 3600,
        compress: false,
      },
    };

    it("should store data in cache successfully", async () => {
      const result = await service.storeData(storeRequest);

      expect(result.data).toEqual(storeRequest.data);
      expect(result.metadata).toBeDefined();
      expect(storageRepository.storeInCache).toHaveBeenCalled();
    });

    it("should store data in persistent storage successfully", async () => {
      const persistentRequest = {
        ...storeRequest,
        storageType: StorageType.PERSISTENT,
      };
      storageRepository.upsert.mockResolvedValue(mockStoredData as any);

      const result = await service.storeData(persistentRequest);

      expect(result.data).toEqual(storeRequest.data);
      expect(result.metadata).toBeDefined();
      expect(storageRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "test-key",
          queryDataTypeFilter: DataClassification.STOCK_QUOTE,
          provider: "test-provider",
          market: "US",
        }),
      );
    });

    it("should handle compression option without error", async () => {
      const compressRequest = {
        ...storeRequest,
        options: { ...storeRequest.options, compress: true },
      };

      const result = await service.storeData(compressRequest);

      expect(result.data).toEqual(storeRequest.data);
      expect(result.metadata).toBeDefined();
      // Note: Compression won't trigger for small data
    });

    it("should handle storage errors gracefully", async () => {
      storageRepository.storeInCache.mockRejectedValue(
        new Error("Storage failed"),
      );

      await expect(service.storeData(storeRequest)).rejects.toThrow(
        "Storage failed",
      );
    });
  });

  describe("retrieveData", () => {
    it("should retrieve data from cache successfully", async () => {
      const retrieveDto: RetrieveDataDto = { key: "test-key" };
      const cachedData = JSON.stringify({ symbol: "AAPL", price: 150.75 });
      const metadata = JSON.stringify({
        compressed: false,
        storedAt: new Date().toISOString(),
      });

      // Mock StorageRepository methods
      storageRepository.retrieveFromCache.mockResolvedValue({
        data: cachedData,
        metadata: metadata,
        ttl: 300,
      });

      const result = await service.retrieveData(retrieveDto);

      expect(result.data).toEqual({ symbol: "AAPL", price: 150.75 });
      expect(result.cacheInfo.hit).toBe(true);
      expect(result.cacheInfo.source).toBe("cache");
    });

    it("should retrieve data from persistent storage when not in cache", async () => {
      const retrieveDto: RetrieveDataDto = { key: "test-key" };

      // Mock cache miss
      storageRepository.retrieveFromCache.mockResolvedValue({
        data: null,
        metadata: null,
        ttl: -2,
      });

      // Mock persistent storage hit
      storageRepository.findByKey.mockResolvedValue(mockStoredData);

      const result = await service.retrieveData(retrieveDto);

      expect(result.data).toEqual(mockStoredData.data);
      expect(result.cacheInfo.source).toBe("persistent");
    });

    it("should handle data not found", async () => {
      const retrieveDto: RetrieveDataDto = { key: "non-existent-key" };

      // Mock cache miss
      storageRepository.retrieveFromCache.mockResolvedValue({
        data: null,
        metadata: null,
        ttl: -2,
      });

      // Mock persistent storage miss
      storageRepository.findByKey.mockResolvedValue(null);

      // Should throw NotFoundException
      await expect(service.retrieveData(retrieveDto)).rejects.toThrow(
        "数据未找到: non-existent-key",
      );
    });

    it("should handle retrieval errors gracefully", async () => {
      const retrieveDto: RetrieveDataDto = { key: "test-key" };

      // Mock cache error
      storageRepository.retrieveFromCache.mockRejectedValue(
        new Error("Cache error"),
      );

      // Mock persistent storage miss
      storageRepository.findByKey.mockResolvedValue(null);

      // Should throw InternalServerErrorException
      await expect(service.retrieveData(retrieveDto)).rejects.toThrow(
        "数据检索失败: Cache error",
      );
    });
  });

  describe("deleteData", () => {
    it("should delete data from both cache and persistent storage", async () => {
      const key = "test-key";

      storageRepository.deleteFromCache.mockResolvedValue(true);
      storageRepository.deleteByKey.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteData(key);

      expect(result).toBe(true);
      expect(storageRepository.deleteFromCache).toHaveBeenCalledWith(key);
      expect(storageRepository.deleteByKey).toHaveBeenCalledWith(key);
    });

    it("should handle cache-only deletion", async () => {
      const key = "test-key";

      storageRepository.deleteFromCache.mockResolvedValue(true);

      const result = await service.deleteData(key, StorageType.CACHE);

      expect(result).toBe(true);
      expect(storageRepository.deleteFromCache).toHaveBeenCalledWith(key);
      expect(storageRepository.deleteByKey).not.toHaveBeenCalled();
    });

    it("should handle deletion errors gracefully", async () => {
      const key = "test-key";

      storageRepository.deleteFromCache.mockRejectedValue(
        new Error("Redis deletion failed"),
      );

      const result = await service.deleteData(key);

      expect(result).toBe(true); // Service doesn't throw, just logs error
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe("getStorageStats", () => {
    it("should return comprehensive storage statistics", async () => {
      // Mock cache stats
      storageRepository.getCacheStats.mockResolvedValue({
        info: "used_memory:2048000\\nother_info:value",
        dbSize: 25,
      });
      storageRepository.getAverageTtl.mockResolvedValue(1800);

      // Mock persistent stats
      storageRepository.countAll.mockResolvedValue(15);
      storageRepository.getDataTypeFilterStats.mockResolvedValue([
        { _id: "STOCK_QUOTE", count: 10 },
        { _id: "INDEX_QUOTE", count: 5 },
      ]);
      storageRepository.getProviderStats.mockResolvedValue([
        { _id: "longport", count: 12 },
        { _id: "futu", count: 3 },
      ]);
      storageRepository.getSizeStats.mockResolvedValue([
        { totalSize: 1024000 },
      ]);

      const stats = await service.getStorageStats();

      expect(stats.cache.totalKeys).toBe(25);
      expect(stats.cache.totalMemoryUsage).toBe(2048000);
      expect(stats.cache.avgTtl).toBe(1800);
      expect(stats.persistent.totalDocuments).toBe(15);
      expect(stats.persistent.totalSizeBytes).toBe(1024000);
      expect(stats.persistent.categoriesCounts).toEqual({
        STOCK_QUOTE: 10,
        INDEX_QUOTE: 5,
      });
      expect(stats.persistent.providerCounts).toEqual({
        longport: 12,
        futu: 3,
      });
    });

    it("should handle Redis unavailable", async () => {
      // Mock Redis unavailable
      storageRepository.getCacheStats.mockResolvedValue({
        info: null,
        dbSize: 0,
      });
      storageRepository.getAverageTtl.mockResolvedValue(0);

      // Mock persistent stats
      storageRepository.countAll.mockResolvedValue(5);
      storageRepository.getDataTypeFilterStats.mockResolvedValue([]);
      storageRepository.getProviderStats.mockResolvedValue([]);
      storageRepository.getSizeStats.mockResolvedValue([]);

      const stats = await service.getStorageStats();

      expect(stats.cache.totalKeys).toBe(0);
      expect(stats.cache.totalMemoryUsage).toBe(0);
      expect(stats.cache.hitRate).toBe(0);
      expect(stats.persistent.totalDocuments).toBe(5);
    });

    it("should handle database errors", async () => {
      // Mock cache stats success
      storageRepository.getCacheStats.mockResolvedValue({
        info: "used_memory:1024000",
        dbSize: 10,
      });
      storageRepository.getAverageTtl.mockResolvedValue(0);

      // Mock database error
      storageRepository.countAll.mockRejectedValue(new Error("Database error"));

      await expect(service.getStorageStats()).rejects.toThrow(
        "生成存储统计信息失败: Database error",
      );
    });
  });

  // Note: Private helper methods are tested indirectly through public methods
});
