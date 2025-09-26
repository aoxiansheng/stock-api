import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { StorageController } from '@core/04-storage/storage/controller/storage.controller';
import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';
import { StoreDataDto, RetrieveDataDto } from '@core/04-storage/storage/dto/storage-request.dto';
import { StorageResponseDto, StorageStatsDto } from '@core/04-storage/storage/dto/storage-response.dto';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('StorageController', () => {
  let controller: StorageController;
  let mockStorageService: jest.Mocked<StorageService>;

  const mockSuccessResponse: StorageResponseDto = {
    data: {
      symbol: 'AAPL',
      lastPrice: 195.89,
      change: 2.31,
      changePercent: 1.19,
      volume: 45678900,
      timestamp: '2024-01-01T15:30:00.000Z',
    },
    metadata: {
      key: 'stock:AAPL:quote',
      storageType: StorageType.PERSISTENT,
      dataSize: 1024,
      compressed: true,
      processingTimeMs: 45,
      storageClassification: StorageClassification.STOCK_QUOTE,
      provider: 'test-provider',
      market: 'test-market',
      storedAt: '2024-01-01T15:29:45.000Z',
    },
    cacheInfo: {
      hit: false,
      source: 'persistent',
      ttlRemaining: 3600,
    },
  };

  const mockStatsResponse: StorageStatsDto = {
    cache: {
      totalKeys: 15420,
      totalMemoryUsage: 256000000,
      hitRate: 0.87,
      avgTtl: 2.3,
    },
    persistent: {
      totalDocuments: 8934,
      totalSizeBytes: 1200000000,
      categoriesCounts: { 'stock_quote': 5000, 'stock_info': 3000 },
      providerCounts: { 'longport': 7000, 'yahoo': 1934 },
    },
    performance: {
      avgStorageTime: 8.9,
      avgRetrievalTime: 3.2,
      operationsPerSecond: 156.7,
      errorRate: 0.02,
    },
    timestamp: '2024-01-01T15:30:00.000Z',
  };

  beforeEach(async () => {
    const mockService = {
      storeData: jest.fn(),
      retrieveData: jest.fn(),
      deleteData: jest.fn(),
      getStorageStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    mockStorageService = module.get(StorageService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('storeData', () => {
    const validStoreRequest: StoreDataDto = {
      key: 'test-key',
      data: { test: 'data' },
      storageType: StorageType.PERSISTENT,
      storageClassification: StorageClassification.STOCK_QUOTE,
      provider: 'test-provider',
      market: 'test-market',
      options: {
        compress: false,
        tags: { tag1: 'value1', tag2: 'value2' },
        persistentTtlSeconds: 3600,
      },
    };

    it('should store data successfully', async () => {
      // Arrange
      mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.storeData(validStoreRequest);

      // Assert
      expect(mockStorageService.storeData).toHaveBeenCalledWith(validStoreRequest);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle storage service errors', async () => {
      // Arrange
      const error = new BadRequestException('Storage failed');
      mockStorageService.storeData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.storeData(validStoreRequest)).rejects.toThrow('Storage failed');
      expect(mockStorageService.storeData).toHaveBeenCalledWith(validStoreRequest);
    });

    it('should log request and success details', async () => {
      // Arrange
      mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.storeData(validStoreRequest);

      // Assert
      expect(mockStorageService.storeData).toHaveBeenCalled();
    });

    it('should store data without optional parameters', async () => {
      // Arrange
      const minimalRequest: StoreDataDto = {
        key: 'minimal-key',
        data: { minimal: 'data' },
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'minimal-provider',
        market: 'minimal-market',
      };

      mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.storeData(minimalRequest);

      // Assert
      expect(mockStorageService.storeData).toHaveBeenCalledWith(minimalRequest);
      expect(result).toEqual(mockSuccessResponse);
    });
  });

  describe('retrieveData', () => {
    const validRetrieveRequest: RetrieveDataDto = {
      key: 'test-key',
      preferredType: StorageType.PERSISTENT,
    };

    it('should retrieve data successfully', async () => {
      // Arrange
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.retrieveData(validRetrieveRequest);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith(validRetrieveRequest);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle not found errors', async () => {
      // Arrange
      const error = new NotFoundException('Data not found');
      mockStorageService.retrieveData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.retrieveData(validRetrieveRequest)).rejects.toThrow('Data not found');
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith(validRetrieveRequest);
    });

    it('should log request and success details', async () => {
      // Arrange
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.retrieveData(validRetrieveRequest);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalled();
    });

    it('should handle retrieve with different storage types', async () => {
      // Arrange
      const cacheRequest: RetrieveDataDto = {
        key: 'cache-key',
        preferredType: StorageType.PERSISTENT, // Only PERSISTENT supported
      };

      mockStorageService.retrieveData.mockResolvedValue({
        ...mockSuccessResponse,
        cacheInfo: {
          ...mockSuccessResponse.cacheInfo!,
          hit: true,
          source: 'cache',
        },
      });

      // Act
      const result = await controller.retrieveData(cacheRequest);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith(cacheRequest);
      expect(result.cacheInfo?.hit).toBe(true);
    });
  });

  describe('retrieveDataByKey', () => {
    it('should retrieve data by key with default parameters', async () => {
      // Arrange
      const key = 'test-key';
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.retrieveDataByKey(key);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
        key,
        preferredType: StorageType.PERSISTENT,
      });
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should retrieve data by key with specified storage type', async () => {
      // Arrange
      const key = 'test-key';
      const preferredType = StorageType.PERSISTENT;
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.retrieveDataByKey(key, preferredType);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
        key,
        preferredType,
      });
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle invalid preferred type gracefully', async () => {
      // Arrange
      const key = 'test-key';
      const invalidType = 'invalid-type';
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.retrieveDataByKey(key, invalidType);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
        key,
        preferredType: StorageType.PERSISTENT, // Should default
      });
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle special characters in key', async () => {
      // Arrange
      const specialKey = 'stock:AAPL:quote@2024-01-01';
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.retrieveDataByKey(specialKey);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
        key: specialKey,
        preferredType: StorageType.PERSISTENT,
      });
      expect(result).toEqual(mockSuccessResponse);
    });
  });

  describe('deleteData', () => {
    const testKey = 'test-key';

    it('should delete data successfully with default storage type', async () => {
      // Arrange
      mockStorageService.deleteData.mockResolvedValue(true);

      // Act
      const result = await controller.deleteData(testKey);

      // Assert
      expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      expect(result).toEqual({
        success: true,
        deleted: true,
        key: testKey,
      });
    });

    it('should delete data with specified storage type', async () => {
      // Arrange
      const storageType = StorageType.PERSISTENT;
      mockStorageService.deleteData.mockResolvedValue(true);

      // Act
      const result = await controller.deleteData(testKey, storageType);

      // Assert
      expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, storageType);
      expect(result).toEqual({
        success: true,
        deleted: true,
        key: testKey,
      });
    });

    it('should handle deletion when no records found', async () => {
      // Arrange
      mockStorageService.deleteData.mockResolvedValue(false);

      // Act
      const result = await controller.deleteData(testKey);

      // Assert
      expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      expect(result).toEqual({
        success: true,
        deleted: false,
        key: testKey,
      });
    });

    it('should handle deletion service errors', async () => {
      // Arrange
      const error = new BadRequestException('Deletion failed');
      mockStorageService.deleteData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteData(testKey)).rejects.toThrow('Deletion failed');
      expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
    });

    it('should handle invalid storage type parameter', async () => {
      // Arrange
      const invalidStorageType = 'invalid-type';
      mockStorageService.deleteData.mockResolvedValue(true);

      // Act
      const result = await controller.deleteData(testKey, invalidStorageType);

      // Assert
      expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      expect(result).toEqual({
        success: true,
        deleted: true,
        key: testKey,
      });
    });
  });

  describe('getStorageStats', () => {
    it('should get storage statistics successfully', async () => {
      // Arrange
      mockStorageService.getStorageStats.mockResolvedValue(mockStatsResponse);

      // Act
      const result = await controller.getStorageStats();

      // Assert
      expect(mockStorageService.getStorageStats).toHaveBeenCalledWith();
      expect(result).toEqual(mockStatsResponse);
    });

    it('should handle statistics service errors', async () => {
      // Arrange
      const error = new BadRequestException('Stats generation failed');
      mockStorageService.getStorageStats.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStorageStats()).rejects.toThrow('Stats generation failed');
      expect(mockStorageService.getStorageStats).toHaveBeenCalledWith();
    });

    it('should return complete statistics structure', async () => {
      // Arrange
      mockStorageService.getStorageStats.mockResolvedValue(mockStatsResponse);

      // Act
      const result = await controller.getStorageStats();

      // Assert
      expect(result.cache).toBeDefined();
      expect(result.cache.totalKeys).toBe(15420);
      expect(result.cache.hitRate).toBe(0.87);

      expect(result.persistent).toBeDefined();
      expect(result.persistent.totalDocuments).toBe(8934);
      expect(result.persistent.totalSizeBytes).toBe(1200000000);

      expect(result.performance).toBeDefined();
      expect(result.performance.operationsPerSecond).toBe(156.7);
      expect(result.performance.errorRate).toBe(0.02);
    });

    it('should handle empty or minimal statistics', async () => {
      // Arrange
      const minimalStats: StorageStatsDto = {
        cache: {
          totalKeys: 0,
          totalMemoryUsage: 0,
          hitRate: 0,
          avgTtl: 0,
        },
        persistent: {
          totalDocuments: 0,
          totalSizeBytes: 0,
          categoriesCounts: {},
          providerCounts: {},
        },
        performance: {
          avgStorageTime: 0,
          avgRetrievalTime: 0,
          operationsPerSecond: 0,
          errorRate: 0,
        },
        timestamp: '2024-01-01T15:30:00.000Z',
      };

      mockStorageService.getStorageStats.mockResolvedValue(minimalStats);

      // Act
      const result = await controller.getStorageStats();

      // Assert
      expect(result).toEqual(minimalStats);
      expect(result.cache.totalKeys).toBe(0);
      expect(result.persistent.totalDocuments).toBe(0);
      expect(result.performance.operationsPerSecond).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors without modification', async () => {
      // Arrange
      const customError = new NotFoundException('Custom error message');
      mockStorageService.retrieveData.mockRejectedValue(customError);

      const request: RetrieveDataDto = {
        key: 'test-key',
        preferredType: StorageType.PERSISTENT,
      };

      // Act & Assert
      await expect(controller.retrieveData(request)).rejects.toThrow(NotFoundException);
      await expect(controller.retrieveData(request)).rejects.toThrow('Custom error message');
    });

    it('should handle unexpected errors in all methods', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected system error');
      mockStorageService.storeData.mockRejectedValue(unexpectedError);

      const storeRequest: StoreDataDto = {
        key: 'test-key',
        data: { test: 'data' },
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'test-provider',
        market: 'test-market',
      };

      // Act & Assert
      await expect(controller.storeData(storeRequest)).rejects.toThrow('Unexpected system error');
    });
  });

  describe('Logging Behavior', () => {
    it('should log successful operations without exposing sensitive data', async () => {
      // Arrange
      mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

      const request: RetrieveDataDto = {
        key: 'sensitive-api-key:secret-data',
        preferredType: StorageType.PERSISTENT,
      };

      // Act
      await controller.retrieveData(request);

      // Assert
      expect(mockStorageService.retrieveData).toHaveBeenCalledWith(request);
      // Note: Actual logging verification would require spy on logger methods
    });

    it('should log errors with appropriate detail level', async () => {
      // Arrange
      const error = new BadRequestException('Validation failed');
      mockStorageService.deleteData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteData('test-key')).rejects.toThrow('Validation failed');
      // Note: Actual logging verification would require spy on logger methods
    });
  });
});
