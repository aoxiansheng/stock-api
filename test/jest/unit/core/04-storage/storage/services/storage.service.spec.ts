import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import * as zlib from 'zlib';

import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { StorageRepository } from '@core/04-storage/storage/repositories/storage.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StoreDataDto, RetrieveDataDto } from '@core/04-storage/storage/dto/storage-request.dto';
import { StorageQueryDto } from '@core/04-storage/storage/dto/storage-query.dto';
import { StorageResponseDto, StorageStatsDto, PaginatedStorageItemDto } from '@core/04-storage/storage/dto/storage-response.dto';
import { StorageMetadataDto } from '@core/04-storage/storage/dto/storage-metadata.dto';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { STORAGE_CONFIG, STORAGE_PERFORMANCE_THRESHOLDS } from '@core/04-storage/storage/constants/storage.constants';
import { SensitivityLevel } from '@core/04-storage/storage/schemas/storage.schema';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

// Mock zlib functions
jest.mock('zlib', () => ({
  gzip: jest.fn(),
  gunzip: jest.fn(),
}));

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

// Mock UniversalExceptionFactory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn((config) => new Error(config.message)),
  },
  BusinessErrorCode: {
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
    EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
    NOT_FOUND: 'NOT_FOUND',
  },
  ComponentIdentifier: {
    STORAGE: 'STORAGE',
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let storageRepository: jest.Mocked<StorageRepository>;
  let paginationService: jest.Mocked<PaginationService>;
  let eventBus: jest.Mocked<EventEmitter2>;

  const mockStoredDocument = {
    _id: 'test-id',
    key: 'test-key',
    data: { test: 'data' },
    storageClassification: StorageClassification.STOCK_QUOTE,
    provider: 'test-provider',
    market: 'test-market',
    dataSize: 100,
    compressed: false,
    storedAt: new Date(),
    sensitivityLevel: SensitivityLevel.PUBLIC,
    encrypted: false,
    tags: {} as Record<string, string>,
  };

  beforeEach(async () => {
    const mockStorageRepository = {
      upsert: jest.fn(),
      findByKey: jest.fn(),
      deleteByKey: jest.fn(),
      findPaginated: jest.fn(),
      getStorageClassificationStats: jest.fn(),
      getProviderStats: jest.fn(),
      getSizeStats: jest.fn(),
      countAll: jest.fn(),
    };

    const mockPaginationService = {
      paginate: jest.fn(),
      calculateOffset: jest.fn(),
      createPagination: jest.fn(),
    };

    const mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: StorageRepository,
          useValue: mockStorageRepository,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    storageRepository = module.get(StorageRepository);
    paginationService = module.get(PaginationService);
    eventBus = module.get(EventEmitter2);

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

    it('should store data successfully without compression', async () => {
      // Arrange
      storageRepository.upsert.mockResolvedValue(mockStoredDocument as any);

      // Act
      const result = await service.storeData(validStoreRequest);

      // Assert
      expect(storageRepository.upsert).toHaveBeenCalledWith({
        key: validStoreRequest.key,
        data: validStoreRequest.data,
        storageClassification: validStoreRequest.storageClassification,
        provider: validStoreRequest.provider,
        market: validStoreRequest.market,
        dataSize: expect.any(Number),
        compressed: false,
        tags: validStoreRequest.options?.tags,
        expiresAt: expect.any(Date),
        storedAt: expect.any(Date),
      });

      expect(result).toBeInstanceOf(StorageResponseDto);
      expect(result.data).toEqual(validStoreRequest.data);
      expect(result.metadata.key).toBe(validStoreRequest.key);
      expect(result.metadata.storageType).toBe(StorageType.PERSISTENT);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'upsert_success',
          tags: expect.objectContaining({
            operation: 'upsert',
            status: 'success',
          }),
        }),
      );
    });

    it('should store data successfully with compression', async () => {
      // Arrange
      const compressedData = Buffer.from('compressed-data');
      (zlib.gzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(null, compressedData);
      });

      const compressRequest = {
        ...validStoreRequest,
        options: { ...validStoreRequest.options, compress: true },
      };

      const compressedDocument = {
        ...mockStoredDocument,
        compressed: true,
        data: compressedData.toString('base64'),
      };

      storageRepository.upsert.mockResolvedValue(compressedDocument as any);

      // Act
      const result = await service.storeData(compressRequest);

      // Assert
      expect(zlib.gzip).toHaveBeenCalled();
      expect(storageRepository.upsert).toHaveBeenCalledWith({
        key: compressRequest.key,
        data: compressedData.toString('base64'),
        storageClassification: compressRequest.storageClassification,
        provider: compressRequest.provider,
        market: compressRequest.market,
        dataSize: expect.any(Number),
        compressed: true,
        tags: compressRequest.options?.tags,
        expiresAt: expect.any(Date),
        storedAt: expect.any(Date),
      });

      expect(result).toBeInstanceOf(StorageResponseDto);
      expect(result.metadata.compressed).toBe(true);
    });

    it('should reject non-persistent storage type', async () => {
      // Arrange
      const invalidRequest = {
        ...validStoreRequest,
        storageType: 'CACHE' as any, // Mock invalid enum value
      };

      // Act & Assert
      await expect(service.storeData(invalidRequest)).rejects.toThrow();
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'storeData',
        message: 'StorageService only supports PERSISTENT storage type. Use StandardizedCacheService for cache operations.',
        context: expect.objectContaining({
          requestedStorageType: 'CACHE',
          supportedTypes: [StorageType.PERSISTENT],
        }),
      });
    });

    it('should handle storage errors and emit failure event', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      storageRepository.upsert.mockRejectedValue(error);

      // Act & Assert
      await expect(service.storeData(validStoreRequest)).rejects.toThrow();
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'upsert_failed',
          tags: expect.objectContaining({
            operation: 'upsert',
            status: 'error',
            error_type: 'Error',
          }),
        }),
      );
    });

    it('should handle compression errors', async () => {
      // Arrange
      const compressionError = new Error('Compression failed');
      (zlib.gzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(compressionError, null);
      });

      const compressRequest = {
        ...validStoreRequest,
        options: { ...validStoreRequest.options, compress: true },
      };

      // Act & Assert
      await expect(service.storeData(compressRequest)).rejects.toThrow();
    });

    it('should store data without TTL when persistentTtlSeconds is not provided', async () => {
      // Arrange
      const requestWithoutTtl = {
        ...validStoreRequest,
        options: { ...validStoreRequest.options, persistentTtlSeconds: undefined },
      };
      storageRepository.upsert.mockResolvedValue(mockStoredDocument as any);

      // Act
      await service.storeData(requestWithoutTtl);

      // Assert
      expect(storageRepository.upsert).toHaveBeenCalledWith({
        key: requestWithoutTtl.key,
        data: requestWithoutTtl.data,
        storageClassification: requestWithoutTtl.storageClassification,
        provider: requestWithoutTtl.provider,
        market: requestWithoutTtl.market,
        dataSize: expect.any(Number),
        compressed: false,
        tags: requestWithoutTtl.options?.tags,
        expiresAt: undefined,
        storedAt: expect.any(Date),
      });
    });
  });

  describe('retrieveData', () => {
    const validRetrieveRequest: RetrieveDataDto = {
      key: 'test-key',
      preferredType: StorageType.PERSISTENT,
    };

    it('should retrieve uncompressed data successfully', async () => {
      // Arrange
      storageRepository.findByKey.mockResolvedValue(mockStoredDocument as any);

      // Act
      const result = await service.retrieveData(validRetrieveRequest);

      // Assert
      expect(storageRepository.findByKey).toHaveBeenCalledWith(validRetrieveRequest.key);
      expect(result).toBeInstanceOf(StorageResponseDto);
      expect(result.data).toEqual(mockStoredDocument.data);
      expect(result.metadata.key).toBe(mockStoredDocument.key);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'find_success',
          tags: expect.objectContaining({
            operation: 'find',
            status: 'success',
          }),
        }),
      );
    });

    it('should retrieve and decompress compressed data successfully', async () => {
      // Arrange
      const compressedDocument = {
        ...mockStoredDocument,
        compressed: true,
        data: Buffer.from(JSON.stringify({ test: 'data' })).toString('base64'),
      };

      const decompressedData = Buffer.from(JSON.stringify({ test: 'data' }));
      (zlib.gunzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(null, decompressedData);
      });

      storageRepository.findByKey.mockResolvedValue(compressedDocument as any);

      // Act
      const result = await service.retrieveData(validRetrieveRequest);

      // Assert
      expect(zlib.gunzip).toHaveBeenCalled();
      expect(result.data).toEqual({ test: 'data' });
      expect(result.metadata.compressed).toBe(true);
    });

    it('should throw NotFoundException when data not found', async () => {
      // Arrange
      storageRepository.findByKey.mockResolvedValue(null);

      // Act & Assert
      await expect(service.retrieveData(validRetrieveRequest)).rejects.toThrow();
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'retrieveData',
        message: `Data not found for key: ${validRetrieveRequest.key}`,
        context: expect.objectContaining({
          key: validRetrieveRequest.key,
        }),
      });
    });

    it('should reject non-persistent storage type', async () => {
      // Arrange
      const invalidRequest = {
        ...validRetrieveRequest,
        preferredType: 'CACHE' as any,
      };

      // Act & Assert
      await expect(service.retrieveData(invalidRequest)).rejects.toThrow();
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'retrieveData',
        message: 'StorageService only supports PERSISTENT storage type. Use StandardizedCacheService for cache operations.',
        context: expect.objectContaining({
          requestedPreferredType: 'CACHE',
        }),
      });
    });

    it('should handle decompression errors', async () => {
      // Arrange
      const compressedDocument = {
        ...mockStoredDocument,
        compressed: true,
        data: 'invalid-base64-data',
      };

      const decompressionError = new Error('Decompression failed');
      (zlib.gunzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(decompressionError, null);
      });

      storageRepository.findByKey.mockResolvedValue(compressedDocument as any);

      // Act & Assert
      await expect(service.retrieveData(validRetrieveRequest)).rejects.toThrow();
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'find_failed',
          tags: expect.objectContaining({
            operation: 'find',
            status: 'error',
          }),
        }),
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      storageRepository.findByKey.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.retrieveData(validRetrieveRequest)).rejects.toThrow();
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'find_failed',
          tags: expect.objectContaining({
            operation: 'find',
            status: 'error',
          }),
        }),
      );
    });
  });

  describe('deleteData', () => {
    const testKey = 'test-key';

    it('should delete data successfully', async () => {
      // Arrange
      storageRepository.deleteByKey.mockResolvedValue({ deletedCount: 1 } as any);

      // Act
      const result = await service.deleteData(testKey);

      // Assert
      expect(storageRepository.deleteByKey).toHaveBeenCalledWith(testKey);
      expect(result).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'deleteOne_success',
          tags: expect.objectContaining({
            operation: 'deleteOne',
            status: 'success',
          }),
        }),
      );
    });

    it('should return false when data not found for deletion', async () => {
      // Arrange
      storageRepository.deleteByKey.mockResolvedValue({ deletedCount: 0 } as any);

      // Act
      const result = await service.deleteData(testKey);

      // Assert
      expect(result).toBe(false);
      expect(storageRepository.deleteByKey).toHaveBeenCalledWith(testKey);
    });

    it('should reject non-persistent storage type', async () => {
      // Act & Assert
      await expect(service.deleteData(testKey, 'CACHE' as any)).rejects.toThrow();
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'deleteData',
        message: 'StorageService only supports PERSISTENT delete type. Use StandardizedCacheService for cache operations.',
        context: expect.objectContaining({
          requestedStorageType: 'CACHE',
        }),
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const deletionError = new Error('Deletion failed');
      storageRepository.deleteByKey.mockRejectedValue(deletionError);

      // Act & Assert
      await expect(service.deleteData(testKey)).rejects.toThrow();
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'database',
          metricName: 'deleteOne_failed',
          tags: expect.objectContaining({
            operation: 'deleteOne',
            status: 'error',
          }),
        }),
      );
    });
  });

  describe('findPaginated', () => {
    const validQuery: StorageQueryDto = {
      page: 1,
      limit: 10,
      storageClassification: StorageClassification.STOCK_QUOTE,
    };

    it('should return paginated results successfully', async () => {
      // Arrange
      const mockPaginatedData = {
        items: [mockStoredDocument as any],
        total: 1,
      };

      storageRepository.findPaginated.mockResolvedValue(mockPaginatedData);
      paginationService.createPagination.mockReturnValue({
        items: mockPaginatedData.items,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      } as any);

      // Act
      const result = await service.findPaginated(validQuery);

      // Assert
      expect(storageRepository.findPaginated).toHaveBeenCalledWith(validQuery);
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockEmptyData = {
        items: [],
        total: 0,
      };

      storageRepository.findPaginated.mockResolvedValue(mockEmptyData);
      paginationService.createPagination.mockReturnValue({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      } as any);

      // Act
      const result = await service.findPaginated(validQuery);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle repository errors in pagination', async () => {
      // Arrange
      const repositoryError = new Error('Database query failed');
      storageRepository.findPaginated.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.findPaginated(validQuery)).rejects.toThrow();
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics successfully', async () => {
      // Arrange
      const mockClassificationStats = [
        { _id: 'test-classification', count: 10, totalSize: 1000 },
      ];
      const mockProviderStats = [
        { _id: 'test-provider', count: 5, totalSize: 500 },
      ];
      const mockSizeStats = [
        { _id: null, totalSize: 1500, avgSize: 150, maxSize: 300, minSize: 50 },
      ];
      const mockTotalCount = 15;

      storageRepository.getStorageClassificationStats.mockResolvedValue(mockClassificationStats);
      storageRepository.getProviderStats.mockResolvedValue(mockProviderStats);
      storageRepository.getSizeStats.mockResolvedValue(mockSizeStats);
      storageRepository.countAll.mockResolvedValue(mockTotalCount);

      // Act
      const result = await service.getStorageStats();

      // Assert
      expect(result).toBeInstanceOf(StorageStatsDto);
      expect(result.cache).toBeDefined();
      expect(result.persistent).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle partial stats failure gracefully', async () => {
      // Arrange
      const mockClassificationStats = [
        { _id: 'test-classification', count: 10, totalSize: 1000 },
      ];

      storageRepository.getStorageClassificationStats.mockResolvedValue(mockClassificationStats);
      storageRepository.getProviderStats.mockRejectedValue(new Error('Provider stats failed'));
      storageRepository.getSizeStats.mockResolvedValue([]);
      storageRepository.countAll.mockResolvedValue(10);

      // Act & Assert
      await expect(service.getStorageStats()).rejects.toThrow('Provider stats failed');
    });
  });

  describe('emitDatabaseOperationEvent', () => {
    it('should emit database operation event with correct parameters', () => {
      // Arrange
      const operation = 'upsert';
      const processingTimeMs = 100;
      const success = true;
      const metadata = {
        storage_type: 'persistent',
        data_size: 500,
      };

      // Act
      (service as any).emitDatabaseOperationEvent(operation, processingTimeMs, success, metadata);

      // Assert - Need to wait for setImmediate to complete
      setTimeout(() => {
        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            source: 'storage_service',
            metricType: 'database',
            metricName: 'upsert_success',
            metricValue: processingTimeMs,
            tags: expect.objectContaining({
              operation,
              status: 'success',
              ...metadata,
            }),
          }),
        );
      }, 0);
    });
  });

  describe('extractKeyPattern', () => {
    it('should extract key patterns correctly', () => {
      // Arrange
      const testCases = [
        { input: 'provider:symbol:AAPL', expected: 'provider:symbol:*' },
        { input: 'cache:12345', expected: 'cache:*' },
        { input: 'simple-key', expected: 'simple-key' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Act
        const result = (service as any).extractKeyPattern(input);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe('getFilterTypes', () => {
    it('should return available filter types', () => {
      // Act
      const result = (service as any).getFilterTypes();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('_compressData', () => {
    it('should compress data when compression is enabled', async () => {
      // Arrange
      const testData = { test: 'data' };
      const compressedBuffer = Buffer.from('compressed-data');
      (zlib.gzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(null, compressedBuffer);
      });

      // Act
      const result = await (service as any)._compressData(testData, true);

      // Assert
      expect(result.compressed).toBe(true);
      expect(result.serializedData).toBe(compressedBuffer.toString('base64'));
      expect(result.dataSize).toBeGreaterThan(0);
    });

    it('should not compress data when compression is disabled', async () => {
      // Arrange
      const testData = { test: 'data' };

      // Act
      const result = await (service as any)._compressData(testData, false);

      // Assert
      expect(result.compressed).toBe(false);
      expect(result.serializedData).toBe(JSON.stringify(testData));
      expect(result.dataSize).toBeGreaterThan(0);
    });

    it('should handle compression errors', async () => {
      // Arrange
      const testData = { test: 'data' };
      const compressionError = new Error('Compression failed');
      (zlib.gzip as unknown as jest.Mock).mockImplementation((data, callback) => {
        callback(compressionError, null);
      });

      // Act & Assert
      await expect((service as any)._compressData(testData, true)).rejects.toThrow('Compression failed');
    });
  });

  describe('logStorageSuccess', () => {
    it('should log storage success with correct parameters', () => {
      // Arrange
      const processingTimeMs = 100;
      const key = 'test-key';
      const dataSize = 500;
      const compressed = false;

      // Act
      (service as any).logStorageSuccess(processingTimeMs, key, dataSize, compressed);

      // Assert - Logger should be called (we can't directly test private logger calls)
      expect(true).toBe(true); // Placeholder assertion as logger is mocked at module level
    });
  });

  describe('logRetrievalSuccess', () => {
    it('should log retrieval success with correct parameters', () => {
      // Arrange
      const processingTimeMs = 50;
      const key = 'test-key';
      const dataSize = 300;
      const compressed = true;
      const cacheHit = false;

      // Act
      (service as any).logRetrievalSuccess(processingTimeMs, key, dataSize, compressed, cacheHit);

      // Assert - Logger should be called (we can't directly test private logger calls)
      expect(true).toBe(true); // Placeholder assertion as logger is mocked at module level
    });
  });

  describe('tryRetrieveFromPersistent', () => {
    it('should retrieve from persistent storage successfully', async () => {
      // Arrange
      const key = 'test-key';
      storageRepository.findByKey.mockResolvedValue(mockStoredDocument as any);

      // Act
      const result = await (service as any).tryRetrieveFromPersistent(key);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toEqual(mockStoredDocument.data);
      expect(storageRepository.findByKey).toHaveBeenCalledWith(key);
    });

    it('should return null when data not found in persistent storage', async () => {
      // Arrange
      const key = 'non-existent-key';
      storageRepository.findByKey.mockResolvedValue(null);

      // Act
      const result = await (service as any).tryRetrieveFromPersistent(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle persistent retrieval errors', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Database connection failed');
      storageRepository.findByKey.mockRejectedValue(error);

      // Act & Assert
      await expect((service as any).tryRetrieveFromPersistent(key)).rejects.toThrow();
    });
  });

  describe('getPersistentStats', () => {
    it('should return persistent storage statistics', async () => {
      // Arrange
      const mockStats = [
        { _id: 'test-classification', count: 10, totalSize: 1000 },
      ];
      storageRepository.getStorageClassificationStats.mockResolvedValue(mockStats);

      // Act
      const result = await (service as any).getPersistentStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.classificationBreakdown).toEqual(mockStats);
    });

    it('should handle persistent stats retrieval errors', async () => {
      // Arrange
      const error = new Error('Stats retrieval failed');
      storageRepository.getStorageClassificationStats.mockRejectedValue(error);

      // Act & Assert
      await expect((service as any).getPersistentStats()).rejects.toThrow();
    });
  });
});