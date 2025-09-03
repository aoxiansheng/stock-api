import { Test, TestingModule } from "@nestjs/testing";
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { StorageController } from "../../../../../../../src/core/04-storage/storage/controller/storage.controller";
import { StorageService } from "../../../../../../../src/core/04-storage/storage/services/storage.service";
import { StoreDataDto } from "../../../../../../../src/core/04-storage/storage/dto/storage-request.dto";
import { RetrieveDataDto } from "../../../../../../../src/core/04-storage/storage/dto/storage-request.dto";
import {
  StorageStatsDto,
  StorageResponseDto,
} from "../../../../../../../src/core/04-storage/storage/dto/storage-response.dto";
import { StorageType } from "../../../../../../../src/core/04-storage/storage/enums/storage-type.enum";
import { StorageClassification } from "../../../../../../../src/core/shared/types/storage-classification.enum";

describe("StorageController", () => {
  let controller: StorageController;
  let storageService: jest.Mocked<StorageService>;

  const mockStoreDataDto: StoreDataDto = {
    key: "test-key",
    data: null,
    storageType: StorageType.BOTH,
    storageClassification: StorageClassification.GENERAL,
    provider: "test-provider",
    market: "test-market",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            storeData: jest.fn(),
            retrieveData: jest.fn(),
            deleteData: jest.fn(),
            getStorageStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StorageController);
    storageService = module.get(StorageService);
  });

  describe("storeData", () => {
    it("should store data successfully", async () => {
      const mockResponse: StorageResponseDto<any> = {
        data: null,
        metadata: {
          key: "test-key",
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: "test-provider",
          market: "test-market",
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTimeMs: 10,
          compressed: false,
        },
        cacheInfo: {
          hit: false,
          source: "persistent", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3600,
        },
      };
      storageService.storeData.mockResolvedValue(mockResponse);

      const result = await controller.storeData(mockStoreDataDto);
      expect(storageService.storeData).toHaveBeenCalledWith(mockStoreDataDto);
      expect(result).toEqual(mockResponse);
    });

    it("should throw error if storageService.storeData fails", async () => {
      storageService.storeData.mockRejectedValue(
        new InternalServerErrorException("Storage failed"),
      );
      await expect(controller.storeData(mockStoreDataDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("retrieveData", () => {
    const mockRetrieveDataDto: RetrieveDataDto = {
      key: "test-key",
      preferredType: StorageType.BOTH,
    };

    it("should retrieve data successfully", async () => {
      const mockResponse: StorageResponseDto<any> = {
        data: { value: "retrieved-data" },
        metadata: {
          key: "test-key",
          storageType: StorageType.STORAGETYPECACHE,
          storageClassification: StorageClassification.GENERAL,
          provider: "test-provider",
          market: "test-market",
          dataSize: 50,
          storedAt: new Date().toISOString(),
          processingTimeMs: 5,
          compressed: false,
        },
        cacheInfo: {
          hit: true,
          source: "cache", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3000,
        },
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveData(mockRetrieveDataDto);
      expect(storageService.retrieveData).toHaveBeenCalledWith(
        mockRetrieveDataDto,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw error if storageService.retrieveData fails", async () => {
      storageService.retrieveData.mockRejectedValue(
        new NotFoundException("Data not found"),
      );
      await expect(
        controller.retrieveData(mockRetrieveDataDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("retrieveDataByKey", () => {
    it("should retrieve data by key with default options", async () => {
      const mockResponse: StorageResponseDto<any> = {
        data: { value: "retrieved-data-by-key" },
        metadata: {
          key: "test-key",
          storageType: StorageType.STORAGETYPECACHE,
          storageClassification: StorageClassification.GENERAL,
          provider: "test-provider",
          market: "test-market",
          dataSize: 50,
          storedAt: new Date().toISOString(),
          processingTimeMs: 5,
          compressed: false,
        },
        cacheInfo: {
          hit: true,
          source: "cache", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3000,
        },
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveDataByKey("test-key");
      expect(storageService.retrieveData).toHaveBeenCalledWith({
        key: "test-key",
        preferredType: StorageType.BOTH,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should retrieve data by key with specified preferredType and updateCache", async () => {
      const mockResponse: StorageResponseDto<any> = {
        data: { value: "retrieved-data-by-key-custom" },
        metadata: {
          key: "test-key",
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.GENERAL,
          provider: "test-provider",
          market: "test-market",
          dataSize: 50,
          storedAt: new Date().toISOString(),
          processingTimeMs: 5,
          compressed: false,
        },
        cacheInfo: {
          hit: false,
          source: "persistent",
          ttlRemaining: null,
        },
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveDataByKey(
        "test-key",
        StorageType.PERSISTENT,
      );
      expect(storageService.retrieveData).toHaveBeenCalledWith({
        key: "test-key",
        preferredType: StorageType.PERSISTENT,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteData", () => {
    it("should delete data successfully with default storageType", async () => {
      storageService.deleteData.mockResolvedValue(true); // 返回布尔值而非数字
      const result = await controller.deleteData("test-key");
      expect(storageService.deleteData).toHaveBeenCalledWith(
        "test-key",
        StorageType.BOTH,
      );
      expect(result).toEqual({ success: true, deleted: true, key: "test-key" });
    });

    it("should delete data successfully with specified storageType", async () => {
      storageService.deleteData.mockResolvedValue(true); // 返回布尔值而非数字
      const result = await controller.deleteData(
        "test-key",
        StorageType.STORAGETYPECACHE,
      );
      expect(storageService.deleteData).toHaveBeenCalledWith(
        "test-key",
        StorageType.STORAGETYPECACHE,
      );
      expect(result).toEqual({ success: true, deleted: true, key: "test-key" });
    });

    it("should throw error if storageService.deleteData fails", async () => {
      storageService.deleteData.mockRejectedValue(
        new InternalServerErrorException("Delete failed"),
      );
      await expect(controller.deleteData("test-key")).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("getStorageStats", () => {
    it("should get storage stats successfully", async () => {
      const mockStatsResponse: StorageStatsDto = {
        cache: {
          totalKeys: 100,
          totalMemoryUsage: 1024 * 1024, // 以字节为单位
          hitRate: 0.85,
          avgTtl: 3600,
        },
        persistent: {
          totalDocuments: 500,
          totalSizeBytes: 5 * 1024 * 1024,
          categoriesCounts: { general: 300, stock_quote: 200 },
          providerCounts: { "test-provider": 500 },
        },
        performance: {
          avgStorageTime: 15,
          avgRetrievalTime: 5,
          operationsPerSecond: 100,
          errorRate: 0.01,
        },
        timestamp: new Date().toISOString(),
      };
      storageService.getStorageStats.mockResolvedValue(mockStatsResponse);

      const result = await controller.getStorageStats();
      expect(storageService.getStorageStats).toHaveBeenCalled();
      expect(result).toEqual(mockStatsResponse);
    });

    it("should throw error if storageService.getStorageStats fails", async () => {
      storageService.getStorageStats.mockRejectedValue(
        new InternalServerErrorException("Stats retrieval failed"),
      );
      await expect(controller.getStorageStats()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
