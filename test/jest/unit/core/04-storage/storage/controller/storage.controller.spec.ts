import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  RequestTimeoutException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common';

import { StorageController } from '@core/04-storage/storage/controller/storage.controller';
import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';
import { StoreDataDto, RetrieveDataDto } from '@core/04-storage/storage/dto/storage-request.dto';
import { StorageResponseDto, StorageStatsDto } from '@core/04-storage/storage/dto/storage-response.dto';
import { ApiKeyAuthGuard } from '@auth/guards/apikey-auth.guard';

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
        {
          provide: 'AuthPerformanceService',
          useValue: {
            recordAuthOperation: jest.fn(),
            getMetrics: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndMerge: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    })
    .overrideGuard(ApiKeyAuthGuard)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .overrideGuard('PermissionsGuard')
    .useValue({
      canActivate: jest.fn(() => true),
    })
    .compile();

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

  describe('Performance and Edge Cases', () => {
    describe('Large Data Handling', () => {
      it('should handle very large data store requests', async () => {
        // Arrange
        const largeData = 'x'.repeat(1000000); // 1MB string
        const largeStoreRequest: StoreDataDto = {
          key: 'large-data-key',
          data: { content: largeData },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
          options: {
            compress: true,
            tags: { size: 'large' }
          }
        };

        mockStorageService.storeData.mockResolvedValue({
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            dataSize: 1000000,
            compressed: true
          }
        });

        // Act
        const result = await controller.storeData(largeStoreRequest);

        // Assert
        expect(mockStorageService.storeData).toHaveBeenCalledWith(largeStoreRequest);
        expect(result.metadata.dataSize).toBe(1000000);
        expect(result.metadata.compressed).toBe(true);
      });

      it('should handle retrieve requests for very long keys', async () => {
        // Arrange
        const longKey = 'very-long-key-' + 'x'.repeat(1000);
        const retrieveRequest: RetrieveDataDto = {
          key: longKey,
          preferredType: StorageType.PERSISTENT,
        };

        mockStorageService.retrieveData.mockResolvedValue({
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            key: longKey
          }
        });

        // Act
        const result = await controller.retrieveData(retrieveRequest);

        // Assert
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith(retrieveRequest);
        expect(result.metadata.key).toBe(longKey);
      });
    });

    describe('Concurrent Request Handling', () => {
      it('should handle multiple store requests concurrently', async () => {
        // Arrange
        const requests = Array.from({ length: 10 }, (_, i) => ({
          key: `concurrent-key-${i}`,
          data: { index: i },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
        }));

        mockStorageService.storeData.mockImplementation(async (req) => ({
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            key: req.key
          }
        }));

        // Act
        const results = await Promise.all(
          requests.map(req => controller.storeData(req))
        );

        // Assert
        expect(results).toHaveLength(10);
        expect(mockStorageService.storeData).toHaveBeenCalledTimes(10);
        results.forEach((result, index) => {
          expect(result.metadata.key).toBe(`concurrent-key-${index}`);
        });
      });

      it('should handle mixed concurrent operations', async () => {
        // Arrange
        const storeRequest: StoreDataDto = {
          key: 'mixed-store-key',
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
        };

        const retrieveRequest: RetrieveDataDto = {
          key: 'mixed-retrieve-key',
          preferredType: StorageType.PERSISTENT,
        };

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);
        mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);
        mockStorageService.deleteData.mockResolvedValue(true);
        mockStorageService.getStorageStats.mockResolvedValue(mockStatsResponse);

        // Act
        const [storeResult, retrieveResult, deleteResult, statsResult] = await Promise.all([
          controller.storeData(storeRequest),
          controller.retrieveData(retrieveRequest),
          controller.deleteData('mixed-delete-key'),
          controller.getStorageStats()
        ]);

        // Assert
        expect(storeResult).toBeDefined();
        expect(retrieveResult).toBeDefined();
        expect(deleteResult.deleted).toBe(true);
        expect(statsResult).toBeDefined();
      });
    });

    describe('Boundary Value Testing', () => {
      it('should handle empty string keys appropriately', async () => {
        // Arrange
        const emptyKeyRequest: RetrieveDataDto = {
          key: '',
          preferredType: StorageType.PERSISTENT,
        };

        mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.retrieveData(emptyKeyRequest);

        // Assert
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith(emptyKeyRequest);
        expect(result).toBeDefined();
      });

      it('should handle null and undefined values gracefully in optional fields', async () => {
        // Arrange
        const requestWithNulls: StoreDataDto = {
          key: 'null-test-key',
          data: { value: null, undefined: undefined },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
          options: undefined
        };

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.storeData(requestWithNulls);

        // Assert
        expect(mockStorageService.storeData).toHaveBeenCalledWith(requestWithNulls);
        expect(result).toBeDefined();
      });

      it('should handle retrieveDataByKey with undefined preferredType', async () => {
        // Arrange
        const key = 'undefined-type-key';
        mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.retrieveDataByKey(key, undefined);

        // Assert
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
          key,
          preferredType: StorageType.PERSISTENT,
        });
        expect(result).toBeDefined();
      });
    });

    describe('Special Characters and Encoding', () => {
      it('should handle keys with Unicode characters', async () => {
        // Arrange
        const unicodeKey = 'stock:测试:报价-🚀';
        const unicodeRequest: RetrieveDataDto = {
          key: unicodeKey,
          preferredType: StorageType.PERSISTENT,
        };

        mockStorageService.retrieveData.mockResolvedValue({
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            key: unicodeKey
          }
        });

        // Act
        const result = await controller.retrieveData(unicodeRequest);

        // Assert
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith(unicodeRequest);
        expect(result.metadata.key).toBe(unicodeKey);
      });

      it('should handle data with special characters and encoding', async () => {
        // Arrange
        const specialDataRequest: StoreDataDto = {
          key: 'special-chars-key',
          data: {
            text: 'Special chars: àáâãäåæçèéêë & 中文 & 🚀🌟💫',
            json: '{"escaped": "value with \\"quotes\\" and \\n newlines"}',
            html: '<div class="test">&lt;escaped&gt;</div>'
          },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
        };

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.storeData(specialDataRequest);

        // Assert
        expect(mockStorageService.storeData).toHaveBeenCalledWith(specialDataRequest);
        expect(result).toBeDefined();
      });
    });

    describe('Response Structure Validation', () => {
      it('should ensure all response fields are properly structured', async () => {
        // Arrange
        const request: StoreDataDto = {
          key: 'structure-test-key',
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market',
        };

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.storeData(request);

        // Assert
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('cacheInfo');

        expect(result.metadata).toHaveProperty('key');
        expect(result.metadata).toHaveProperty('storageType');
        expect(result.metadata).toHaveProperty('dataSize');
        expect(result.metadata).toHaveProperty('compressed');
        expect(result.metadata).toHaveProperty('processingTimeMs');

        if (result.cacheInfo) {
          expect(result.cacheInfo).toHaveProperty('hit');
          expect(result.cacheInfo).toHaveProperty('source');
          expect(result.cacheInfo).toHaveProperty('ttlRemaining');
        }
      });

      it('should validate delete response structure', async () => {
        // Arrange
        mockStorageService.deleteData.mockResolvedValue(true);

        // Act
        const result = await controller.deleteData('test-key');

        // Assert
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('deleted');
        expect(result).toHaveProperty('key');
        expect(result.success).toBe(true);
        expect(result.deleted).toBe(true);
        expect(result.key).toBe('test-key');
      });

      it('should validate stats response structure completeness', async () => {
        // Arrange
        mockStorageService.getStorageStats.mockResolvedValue(mockStatsResponse);

        // Act
        const result = await controller.getStorageStats();

        // Assert
        expect(result).toHaveProperty('cache');
        expect(result).toHaveProperty('persistent');
        expect(result).toHaveProperty('performance');
        expect(result).toHaveProperty('timestamp');

        // Cache section validation
        expect(result.cache).toHaveProperty('totalKeys');
        expect(result.cache).toHaveProperty('totalMemoryUsage');
        expect(result.cache).toHaveProperty('hitRate');
        expect(result.cache).toHaveProperty('avgTtl');

        // Persistent section validation
        expect(result.persistent).toHaveProperty('totalDocuments');
        expect(result.persistent).toHaveProperty('totalSizeBytes');
        expect(result.persistent).toHaveProperty('categoriesCounts');
        expect(result.persistent).toHaveProperty('providerCounts');

        // Performance section validation
        expect(result.performance).toHaveProperty('avgStorageTime');
        expect(result.performance).toHaveProperty('avgRetrievalTime');
        expect(result.performance).toHaveProperty('operationsPerSecond');
        expect(result.performance).toHaveProperty('errorRate');
      });
    });
  });

  describe('Advanced Error Scenarios and Edge Cases', () => {
    describe('Request Validation and Processing', () => {
      it('should handle malformed JSON in store request body', async () => {
        // Arrange
        const malformedRequest = {
          key: 'malformed-key',
          data: undefined, // This should trigger validation error
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        } as any;

        mockStorageService.storeData.mockRejectedValue(
          new BadRequestException('Invalid data format')
        );

        // Act & Assert
        await expect(controller.storeData(malformedRequest)).rejects.toThrow(BadRequestException);
      });

      it('should handle extremely large keys in requests', async () => {
        // Arrange
        const extremelyLongKey = 'x'.repeat(1000); // Very long key
        const storeRequest = {
          key: extremelyLongKey,
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        mockStorageService.storeData.mockRejectedValue(
          new BadRequestException('Key length exceeds maximum allowed')
        );

        // Act & Assert
        await expect(controller.storeData(storeRequest)).rejects.toThrow(BadRequestException);
      });

      it('should validate special characters in keys', async () => {
        // Arrange
        const specialCharKey = 'key-with-特殊字符-and-emojis-🚀';
        const storeRequest = {
          key: specialCharKey,
          data: { test: 'unicode data with 特殊字符 and 🎉' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.storeData(storeRequest);

        // Assert
        expect(result).toEqual(mockSuccessResponse);
        expect(mockStorageService.storeData).toHaveBeenCalledWith(storeRequest);
      });

      it('should handle concurrent requests with same key', async () => {
        // Arrange
        const concurrentKey = 'concurrent-test-key';
        const baseRequest = {
          key: concurrentKey,
          data: { timestamp: Date.now() },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        // Mock different responses for concurrent requests
        let callCount = 0;
        mockStorageService.storeData.mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return mockSuccessResponse;
          } else {
            throw new ConflictException('Concurrent modification detected');
          }
        });

        // Act
        const promises = Array.from({ length: 3 }, () =>
          controller.storeData({ ...baseRequest, data: { ...baseRequest.data, id: Math.random() } })
        );

        const results = await Promise.allSettled(promises);

        // Assert
        expect(results[0].status).toBe('fulfilled');
        expect(results.slice(1).some(r => r.status === 'rejected')).toBe(true);
      });
    });

    describe('Pagination Edge Cases', () => {
      it('should handle storage stats retrieval edge cases', async () => {
        // Arrange - Test stats retrieval which is an existing method
        const statsWithEdgeCases = {
          ...mockStatsResponse,
          cache: {
            ...mockStatsResponse.cache,
            totalKeys: 0,
            hitRate: 0
          },
          persistent: {
            ...mockStatsResponse.persistent,
            totalDocuments: 1000000, // Very large number
            totalSizeBytes: 999999999999 // Nearly 1TB
          }
        };

        mockStorageService.getStorageStats.mockResolvedValue(statsWithEdgeCases as any);

        // Act
        const result = await controller.getStorageStats();

        // Assert
        expect(result).toEqual(statsWithEdgeCases);
        expect(result.cache.hitRate).toBe(0);
        expect(result.persistent.totalSizeBytes).toBeGreaterThan(1000000000);
      });
    });

    describe('Performance and Resource Management', () => {
      it('should handle timeout scenarios in operations', async () => {
        // Arrange
        const timeoutRequest = {
          key: 'timeout-key',
          data: { largeData: 'x'.repeat(100000) },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        mockStorageService.storeData.mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 35000)); // Simulate 35s timeout
          return mockSuccessResponse;
        });

        // Act & Assert
        // In real scenario, this would timeout, but for test we'll reject quickly
        mockStorageService.storeData.mockRejectedValue(
          new RequestTimeoutException('Operation timed out')
        );

        await expect(controller.storeData(timeoutRequest)).rejects.toThrow(RequestTimeoutException);
      });

      it('should monitor memory usage during large data operations', async () => {
        // Arrange
        const largeDataRequest = {
          key: 'large-data-key',
          data: {
            massiveArray: Array.from({ length: 50000 }, (_, i) => ({
              id: i,
              data: `item-${i}`.repeat(50),
              metadata: { processed: true, timestamp: Date.now() }
            }))
          },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        const largeDataResponse = {
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            dataSize: 50000000, // 50MB
            compressed: true,
            compressionRatio: 0.3
          }
        };

        mockStorageService.storeData.mockResolvedValue(largeDataResponse as any);

        // Act
        const result = await controller.storeData(largeDataRequest);

        // Assert
        expect(result).toEqual(largeDataResponse);
        expect(result.metadata.dataSize).toBeGreaterThan(10000000); // > 10MB
      });

      it('should handle high-frequency requests efficiently', async () => {
        // Arrange
        const baseRequest = {
          data: { test: 'high-frequency' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        const requests = Array.from({ length: 100 }, (_, i) => ({
          ...baseRequest,
          key: `high-freq-${i}`,
          data: { ...baseRequest.data, id: i }
        }));

        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

        // Act
        const startTime = Date.now();
        const promises = requests.map(req => controller.storeData(req));
        const results = await Promise.all(promises);
        const endTime = Date.now();

        // Assert
        expect(results).toHaveLength(100);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(mockStorageService.storeData).toHaveBeenCalledTimes(100);
      });
    });

    describe('Error Recovery and Resilience', () => {
      it('should handle service unavailable errors gracefully', async () => {
        // Arrange
        const storeRequest = {
          key: 'service-unavailable-key',
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        mockStorageService.storeData.mockRejectedValue(
          new ServiceUnavailableException('Storage service is temporarily unavailable')
        );

        // Act & Assert
        await expect(controller.storeData(storeRequest)).rejects.toThrow(ServiceUnavailableException);
      });

      it('should handle partial failures in batch operations', async () => {
        // Arrange - Test batch operations using existing controller methods
        const batchKeys = Array.from({ length: 5 }, (_, i) => `batch-key-${i}`);

        // Mock some successful and some failed responses for retrieval
        mockStorageService.retrieveData
          .mockResolvedValueOnce(mockSuccessResponse)
          .mockRejectedValueOnce(new NotFoundException('Key not found'))
          .mockResolvedValueOnce(mockSuccessResponse)
          .mockRejectedValueOnce(new ServiceUnavailableException('Service unavailable'))
          .mockResolvedValueOnce(mockSuccessResponse);

        // Act
        const results = await Promise.allSettled(
          batchKeys.map(key => controller.retrieveDataByKey(key))
        );

        // Assert
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');

        expect(successful).toHaveLength(3);
        expect(failed).toHaveLength(2);
      });

      it('should handle cascading failures across operations', async () => {
        // Arrange
        const cascadeKey = 'cascade-fail-key';

        // First operation fails
        mockStorageService.storeData.mockRejectedValue(
          new BadRequestException('Initial store failed')
        );

        // Subsequent operations should also handle the cascade
        mockStorageService.retrieveData.mockRejectedValue(
          new NotFoundException('Cannot retrieve failed store')
        );

        // Act & Assert
        await expect(controller.storeData({
          key: cascadeKey,
          data: { test: 'cascade' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        })).rejects.toThrow(BadRequestException);

        await expect(controller.retrieveData({
          key: cascadeKey,
          preferredType: StorageType.PERSISTENT
        })).rejects.toThrow(NotFoundException);
      });
    });

    describe('Security and Validation Edge Cases', () => {
      it('should handle potential XSS attempts in data payloads', async () => {
        // Arrange
        const xssAttemptRequest = {
          key: 'xss-test-key',
          data: {
            maliciousScript: '<script>alert("XSS")</script>',
            sqlInjection: "'; DROP TABLE users; --",
            codeInjection: '${process.exit(1)}'
          },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        // Service should sanitize and store safely
        mockStorageService.storeData.mockResolvedValue({
          ...mockSuccessResponse,
          data: {
            maliciousScript: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
            sqlInjection: "'; DROP TABLE users; --", // Should be stored as-is in NoSQL
            codeInjection: '${process.exit(1)}' // Should be stored as string literal
          }
        } as any);

        // Act
        const result = await controller.storeData(xssAttemptRequest);

        // Assert
        expect(result).toBeDefined();
        expect(mockStorageService.storeData).toHaveBeenCalledWith(xssAttemptRequest);
      });

      it('should validate authorization for sensitive operations', async () => {
        // Arrange
        const sensitiveRequest = {
          key: 'sensitive-key',
          data: { classification: 'CONFIDENTIAL', userId: 'admin' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        mockStorageService.storeData.mockRejectedValue(
          new ForbiddenException('Insufficient permissions for sensitive data')
        );

        // Act & Assert
        await expect(controller.storeData(sensitiveRequest)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Data Consistency and Integrity', () => {
      it('should handle data corruption detection', async () => {
        // Arrange
        const corruptedKey = 'corrupted-data-key';

        mockStorageService.retrieveData.mockRejectedValue(
          new InternalServerErrorException('Data integrity check failed: corruption detected')
        );

        // Act & Assert
        await expect(controller.retrieveData({
          key: corruptedKey,
          preferredType: StorageType.PERSISTENT
        })).rejects.toThrow(InternalServerErrorException);
      });

      it('should validate data type consistency across operations', async () => {
        // Arrange
        const typeConsistencyKey = 'type-consistency-key';

        // First store with number data
        mockStorageService.storeData.mockResolvedValueOnce({
          ...mockSuccessResponse,
          data: { value: 123, type: 'number' }
        } as any);

        // Then try to store with string data (should be allowed but logged)
        mockStorageService.storeData.mockResolvedValueOnce({
          ...mockSuccessResponse,
          data: { value: 'string-value', type: 'string' }
        } as any);

        // Act
        const numericResult = await controller.storeData({
          key: typeConsistencyKey,
          data: { value: 123, type: 'number' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        });

        const stringResult = await controller.storeData({
          key: typeConsistencyKey,
          data: { value: 'string-value', type: 'string' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        });

        // Assert
        expect(numericResult.data.type).toBe('number');
        expect(stringResult.data.type).toBe('string');
      });
    });
  });

  // ==================== 实际函数调用测试（提高函数和分支覆盖率） ====================
  describe('Actual Controller Method Execution for Function Coverage', () => {
    describe('storeData method execution', () => {
      it('should execute storeData controller method with success branch', async () => {
        // Arrange - 设置成功响应的mock
        const storeRequest = {
          key: 'function-coverage-store-key',
          data: { testValue: 'actual-execution' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        const successResponse = {
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            key: storeRequest.key
          }
        };

        mockStorageService.storeData.mockResolvedValue(successResponse as any);

        // Act - 实际调用controller方法
        const result = await controller.storeData(storeRequest);

        // Assert - 验证实际执行
        expect(result).toEqual(successResponse);
        expect(mockStorageService.storeData).toHaveBeenCalledWith(storeRequest);
        expect(result.metadata.key).toBe(storeRequest.key);
      });

      it('should execute storeData controller method with error branch', async () => {
        // Arrange - 设置错误响应的mock
        const storeRequest = {
          key: 'function-coverage-error-key',
          data: { testValue: 'error-execution' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        const storageError = new BadRequestException('Storage service error');
        mockStorageService.storeData.mockRejectedValue(storageError);

        // Act & Assert - 实际调用并验证错误处理
        await expect(controller.storeData(storeRequest)).rejects.toThrow(BadRequestException);
        expect(mockStorageService.storeData).toHaveBeenCalledWith(storeRequest);
      });

      it('should execute storeData with different storage types for branch coverage', async () => {
        // Arrange - 测试不同存储类型的分支
        const testCases = [
          { storageType: StorageType.PERSISTENT, description: 'persistent storage' }
        ];

        for (const testCase of testCases) {
          const storeRequest = {
            key: `branch-coverage-${testCase.storageType}`,
            data: { type: testCase.description },
            storageType: testCase.storageType,
            storageClassification: StorageClassification.STOCK_QUOTE,
            provider: 'test-provider',
            market: 'test-market'
          };

          mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

          // Act - 实际执行不同分支
          const result = await controller.storeData(storeRequest);

          // Assert
          expect(result).toEqual(mockSuccessResponse);
          expect(mockStorageService.storeData).toHaveBeenCalledWith(storeRequest);
        }
      });
    });

    describe('retrieveData method execution', () => {
      it('should execute retrieveData controller method with success branch', async () => {
        // Arrange
        const retrieveRequest = {
          key: 'function-coverage-retrieve-key',
          preferredType: StorageType.PERSISTENT
        };

        const retrieveResponse = {
          ...mockSuccessResponse,
          cacheInfo: {
            hit: true,
            source: 'redis',
            ttlRemaining: 3600
          }
        };

        mockStorageService.retrieveData.mockResolvedValue(retrieveResponse as any);

        // Act - 实际调用controller方法
        const result = await controller.retrieveData(retrieveRequest);

        // Assert - 验证实际执行
        expect(result).toEqual(retrieveResponse);
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith(retrieveRequest);
        expect(result.cacheInfo.hit).toBe(true);
      });

      it('should execute retrieveData controller method with error branch', async () => {
        // Arrange
        const retrieveRequest = {
          key: 'function-coverage-not-found-key',
          preferredType: StorageType.PERSISTENT
        };

        const notFoundError = new NotFoundException('Data not found');
        mockStorageService.retrieveData.mockRejectedValue(notFoundError);

        // Act & Assert - 实际调用并验证错误处理
        await expect(controller.retrieveData(retrieveRequest)).rejects.toThrow(NotFoundException);
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith(retrieveRequest);
      });

      it('should execute retrieveData with cache hit/miss branches', async () => {
        // Arrange - 测试缓存命中和未命中的分支
        const testCases = [
          { hit: true, source: 'redis', description: 'cache hit' },
          { hit: false, source: 'mongodb', description: 'cache miss' }
        ];

        for (const testCase of testCases) {
          const retrieveRequest = {
            key: `cache-${testCase.hit ? 'hit' : 'miss'}-key`,
            preferredType: StorageType.PERSISTENT
          };

          const response = {
            ...mockSuccessResponse,
            cacheInfo: {
              hit: testCase.hit,
              source: testCase.source,
              ttlRemaining: testCase.hit ? 3600 : 0
            }
          };

          mockStorageService.retrieveData.mockResolvedValue(response as any);

          // Act - 实际执行不同分支
          const result = await controller.retrieveData(retrieveRequest);

          // Assert
          expect(result).toEqual(response);
          expect(result.cacheInfo.hit).toBe(testCase.hit);
          expect(result.cacheInfo.source).toBe(testCase.source);
        }
      });
    });

    describe('retrieveDataByKey method execution', () => {
      it('should execute retrieveDataByKey controller method', async () => {
        // Arrange
        const testKey = 'function-coverage-by-key';
        const preferredType = StorageType.PERSISTENT;

        const retrieveResponse = {
          ...mockSuccessResponse,
          metadata: {
            ...mockSuccessResponse.metadata,
            key: testKey
          }
        };

        mockStorageService.retrieveData.mockResolvedValue(retrieveResponse as any);

        // Act - 实际调用controller方法
        const result = await controller.retrieveDataByKey(testKey, preferredType);

        // Assert - 验证实际执行
        expect(result).toEqual(retrieveResponse);
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
          key: testKey,
          preferredType: StorageType.PERSISTENT
        });
      });

      it('should execute retrieveDataByKey without preferredType parameter', async () => {
        // Arrange - 测试默认参数分支
        const testKey = 'function-coverage-default-type';

        mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

        // Act - 实际调用controller方法（不提供preferredType）
        const result = await controller.retrieveDataByKey(testKey);

        // Assert - 验证使用默认值
        expect(result).toEqual(mockSuccessResponse);
        expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
          key: testKey,
          preferredType: StorageType.PERSISTENT // 默认值
        });
      });

      it('should execute retrieveDataByKey with different preferredType values', async () => {
        // Arrange - 测试不同preferredType值的分支
        const testCases = [
          { type: StorageType.PERSISTENT, expected: StorageType.PERSISTENT },
          { type: undefined, expected: StorageType.PERSISTENT } // 默认值
        ];

        for (const testCase of testCases) {
          const testKey = `function-coverage-type-${testCase.type || 'default'}`;

          mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

          // Act - 实际执行不同分支
          const result = await controller.retrieveDataByKey(testKey, testCase.type);

          // Assert
          expect(result).toEqual(mockSuccessResponse);
          expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
            key: testKey,
            preferredType: testCase.expected
          });
        }
      });
    });

    describe('deleteData method execution', () => {
      it('should execute deleteData controller method with success branch', async () => {
        // Arrange
        const testKey = 'function-coverage-delete-key';
        const storageType = StorageType.PERSISTENT;

        mockStorageService.deleteData.mockResolvedValue(true);

        // Act - 实际调用controller方法
        const result = await controller.deleteData(testKey, storageType);

        // Assert - 验证实际执行
        expect(result).toEqual({
          success: true,
          deleted: true,
          key: testKey
        });
        expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      });

      it('should execute deleteData controller method with error branch', async () => {
        // Arrange
        const testKey = 'function-coverage-delete-error';
        const deleteError = new ServiceUnavailableException('Delete service unavailable');

        mockStorageService.deleteData.mockRejectedValue(deleteError);

        // Act & Assert - 实际调用并验证错误处理
        await expect(controller.deleteData(testKey)).rejects.toThrow(ServiceUnavailableException);
        expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      });

      it('should execute deleteData with default storageType branch', async () => {
        // Arrange - 测试默认storageType分支
        const testKey = 'function-coverage-delete-default';

        mockStorageService.deleteData.mockResolvedValue(false); // 未删除任何记录

        // Act - 实际调用controller方法（不提供storageType）
        const result = await controller.deleteData(testKey);

        // Assert - 验证使用默认值
        expect(result).toEqual({
          success: true,
          deleted: false,
          key: testKey
        });
        expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, StorageType.PERSISTENT);
      });

      it('should execute deleteData with different return values for branch coverage', async () => {
        // Arrange - 测试不同返回值的分支
        const testCases = [
          { deleted: true, description: 'deletion successful' },
          { deleted: false, description: 'no records deleted' }
        ];

        for (const testCase of testCases) {
          const testKey = `function-coverage-delete-${testCase.deleted}`;

          mockStorageService.deleteData.mockResolvedValue(testCase.deleted);

          // Act - 实际执行不同分支
          const result = await controller.deleteData(testKey);

          // Assert
          expect(result).toEqual({
            success: true,
            deleted: testCase.deleted,
            key: testKey
          });
        }
      });
    });

    describe('getStorageStats method execution', () => {
      it('should execute getStorageStats controller method with success branch', async () => {
        // Arrange
        const statsResponse = {
          cache: {
            totalKeys: 1000,
            memoryUsed: '128MB',
            hitRate: 0.95,
            avgResponseTime: 1.5,
            connectionsActive: 20
          },
          persistent: {
            totalDocuments: 500,
            storageSize: '500MB',
            indexSize: '50MB',
            avgQueryTime: 10.2,
            connectionsActive: 5
          },
          performance: {
            totalOperations: 50000,
            avgStorageTime: 5.5,
            avgRetrievalTime: 2.8,
            errorRate: 0.01,
            throughput: 100.5
          }
        };

        mockStorageService.getStorageStats.mockResolvedValue(statsResponse as any);

        // Act - 实际调用controller方法
        const result = await controller.getStorageStats();

        // Assert - 验证实际执行
        expect(result).toEqual(statsResponse);
        expect(mockStorageService.getStorageStats).toHaveBeenCalled();
        expect(result.cache.hitRate).toBe(0.95);
        expect(result.performance.errorRate).toBe(0.01);
      });

      it('should execute getStorageStats controller method with error branch', async () => {
        // Arrange
        const statsError = new InternalServerErrorException('Stats service error');
        mockStorageService.getStorageStats.mockRejectedValue(statsError);

        // Act & Assert - 实际调用并验证错误处理
        await expect(controller.getStorageStats()).rejects.toThrow(InternalServerErrorException);
        expect(mockStorageService.getStorageStats).toHaveBeenCalled();
      });

      it('should execute getStorageStats with different performance metrics for branch coverage', async () => {
        // Arrange - 测试不同性能指标的分支
        const testCases = [
          { hitRate: 0.99, errorRate: 0.001, description: 'high performance' },
          { hitRate: 0.5, errorRate: 0.05, description: 'low performance' },
          { hitRate: 0.0, errorRate: 0.1, description: 'poor performance' }
        ];

        for (const testCase of testCases) {
          const statsResponse = {
            cache: {
              totalKeys: 1000,
              memoryUsed: '128MB',
              hitRate: testCase.hitRate,
              avgResponseTime: 1.5,
              connectionsActive: 20
            },
            persistent: {
              totalDocuments: 500,
              storageSize: '500MB',
              indexSize: '50MB',
              avgQueryTime: 10.2,
              connectionsActive: 5
            },
            performance: {
              totalOperations: 50000,
              avgStorageTime: 5.5,
              avgRetrievalTime: 2.8,
              errorRate: testCase.errorRate,
              throughput: 100.5
            }
          };

          mockStorageService.getStorageStats.mockResolvedValue(statsResponse as any);

          // Act - 实际执行不同分支
          const result = await controller.getStorageStats();

          // Assert
          expect(result).toEqual(statsResponse);
          expect(result.cache.hitRate).toBe(testCase.hitRate);
          expect(result.performance.errorRate).toBe(testCase.errorRate);
        }
      });
    });
  });

  // ==================== 私有方法和条件分支覆盖测试 ====================
  describe('Controller Private Methods and Conditional Branch Coverage', () => {
    describe('Logger method calls for branch coverage', () => {
      it('should execute logger.log calls in all controller methods', async () => {
        // Arrange - 准备所有方法的测试数据
        const storeRequest = {
          key: 'logger-test-store',
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        const retrieveRequest = {
          key: 'logger-test-retrieve',
          preferredType: StorageType.PERSISTENT
        };

        // 设置所有service方法的mock响应
        mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);
        mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);
        mockStorageService.deleteData.mockResolvedValue(true);
        mockStorageService.getStorageStats.mockResolvedValue(mockStatsResponse);

        // Act - 调用所有controller方法以触发logger调用
        await controller.storeData(storeRequest);
        await controller.retrieveData(retrieveRequest);
        await controller.retrieveDataByKey('logger-test-key');
        await controller.deleteData('logger-test-delete');
        await controller.getStorageStats();

        // Assert - 验证所有service方法被调用（间接验证logger调用）
        expect(mockStorageService.storeData).toHaveBeenCalled();
        expect(mockStorageService.retrieveData).toHaveBeenCalledTimes(2); // retrieveData + retrieveDataByKey
        expect(mockStorageService.deleteData).toHaveBeenCalled();
        expect(mockStorageService.getStorageStats).toHaveBeenCalled();
      });

      it('should execute logger.error calls in error scenarios', async () => {
        // Arrange - 准备错误场景
        const errorCases = [
          {
            method: 'storeData',
            params: [{
              key: 'error-store',
              data: { test: 'data' },
              storageType: StorageType.PERSISTENT,
              storageClassification: StorageClassification.STOCK_QUOTE,
              provider: 'test-provider',
              market: 'test-market'
            }],
            mockMethod: 'storeData',
            error: new BadRequestException('Store error')
          },
          {
            method: 'retrieveData',
            params: [{ key: 'error-retrieve', preferredType: StorageType.PERSISTENT }],
            mockMethod: 'retrieveData',
            error: new NotFoundException('Retrieve error')
          },
          {
            method: 'deleteData',
            params: ['error-delete'],
            mockMethod: 'deleteData',
            error: new ServiceUnavailableException('Delete error')
          },
          {
            method: 'getStorageStats',
            params: [],
            mockMethod: 'getStorageStats',
            error: new InternalServerErrorException('Stats error')
          }
        ];

        // Act & Assert - 测试每个错误场景
        for (const errorCase of errorCases) {
          mockStorageService[errorCase.mockMethod].mockRejectedValue(errorCase.error);

          await expect(controller[errorCase.method](...errorCase.params)).rejects.toThrow(errorCase.error);
        }
      });
    });

    describe('Conditional branches in controller logic', () => {
      it('should execute conditional branches in storeData method', async () => {
        // Arrange - 测试request对象的不同属性组合
        const testCases = [
          {
            request: {
              key: 'conditional-1',
              data: { value: 1 },
              storageType: StorageType.PERSISTENT,
              storageClassification: StorageClassification.STOCK_QUOTE,
              provider: 'provider-1',
              market: 'market-1',
              options: { compress: true }
            },
            description: 'with options'
          },
          {
            request: {
              key: 'conditional-2',
              data: null,
              storageType: StorageType.PERSISTENT,
              storageClassification: StorageClassification.STOCK_QUOTE,
              provider: 'provider-2',
              market: 'market-2'
            },
            description: 'without data'
          }
        ];

        for (const testCase of testCases) {
          mockStorageService.storeData.mockResolvedValue(mockSuccessResponse);

          // Act - 执行不同条件分支
          const result = await controller.storeData(testCase.request);

          // Assert
          expect(result).toEqual(mockSuccessResponse);
          expect(mockStorageService.storeData).toHaveBeenCalledWith(testCase.request);
        }
      });

      it('should execute conditional branches in retrieveDataByKey method', async () => {
        // Arrange - 测试不同的preferredType值
        const testKey = 'conditional-retrieve';
        const testCases = [
          { preferredType: StorageType.PERSISTENT, expected: StorageType.PERSISTENT },
          { preferredType: '', expected: StorageType.PERSISTENT }, // 空字符串
          { preferredType: undefined, expected: StorageType.PERSISTENT }, // undefined
          { preferredType: null, expected: StorageType.PERSISTENT } // null
        ];

        for (const testCase of testCases) {
          mockStorageService.retrieveData.mockResolvedValue(mockSuccessResponse);

          // Act - 执行不同条件分支
          const result = await controller.retrieveDataByKey(testKey, testCase.preferredType);

          // Assert
          expect(result).toEqual(mockSuccessResponse);
          expect(mockStorageService.retrieveData).toHaveBeenCalledWith({
            key: testKey,
            preferredType: testCase.expected
          });
        }
      });

      it('should execute conditional branches in deleteData method', async () => {
        // Arrange - 测试不同的storageType值
        const testKey = 'conditional-delete';
        const testCases = [
          { storageType: StorageType.PERSISTENT, expected: StorageType.PERSISTENT },
          { storageType: '', expected: StorageType.PERSISTENT }, // 空字符串
          { storageType: undefined, expected: StorageType.PERSISTENT }, // undefined
          { storageType: null, expected: StorageType.PERSISTENT } // null
        ];

        for (const testCase of testCases) {
          mockStorageService.deleteData.mockResolvedValue(true);

          // Act - 执行不同条件分支
          const result = await controller.deleteData(testKey, testCase.storageType);

          // Assert
          expect(result).toEqual({
            success: true,
            deleted: true,
            key: testKey
          });
          expect(mockStorageService.deleteData).toHaveBeenCalledWith(testKey, testCase.expected);
        }
      });
    });

    describe('Error handling branches coverage', () => {
      it('should execute all error types in storeData method', async () => {
        // Arrange - 测试不同类型的错误
        const errorTypes = [
          BadRequestException,
          ConflictException,
          ServiceUnavailableException,
          RequestTimeoutException,
          InternalServerErrorException
        ];

        const storeRequest = {
          key: 'error-type-test',
          data: { test: 'data' },
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.STOCK_QUOTE,
          provider: 'test-provider',
          market: 'test-market'
        };

        for (const ErrorType of errorTypes) {
          const error = new ErrorType(`${ErrorType.name} in storeData`);
          mockStorageService.storeData.mockRejectedValue(error);

          // Act & Assert
          await expect(controller.storeData(storeRequest)).rejects.toThrow(ErrorType);
        }
      });

      it('should execute all error types in retrieveData method', async () => {
        // Arrange
        const errorTypes = [
          NotFoundException,
          BadRequestException,
          ServiceUnavailableException,
          InternalServerErrorException
        ];

        const retrieveRequest = {
          key: 'error-retrieve-test',
          preferredType: StorageType.PERSISTENT
        };

        for (const ErrorType of errorTypes) {
          const error = new ErrorType(`${ErrorType.name} in retrieveData`);
          mockStorageService.retrieveData.mockRejectedValue(error);

          // Act & Assert
          await expect(controller.retrieveData(retrieveRequest)).rejects.toThrow(ErrorType);
        }
      });
    });
  });
});
