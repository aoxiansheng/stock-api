/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from '../../../../../../../src/core/public/storage/controller/storage.controller';
import { StorageService } from '../../../../../../../src/core/public/storage/services/storage.service';
import { StoreDataDto, RetrieveDataDto } from '../../../../../../../src/core/public/storage/dto/storage-request.dto';
import { StorageType } from '../../../../../../../src/core/public/storage/enums/storage-type.enum';
import { StorageClassification } from '../../../../../../../src/core/public/storage/enums/storage-type.enum';
import { StorageResponseDto, StorageStatsDto } from '../../../../../../../src/core/public/storage/dto/storage-response.dto';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionsGuard } from '../../../../../../../src/auth/guards/unified-permissions.guard';
import { PermissionService } from '../../../../../../../src/auth/services/permission.service';
import { CacheService } from '../../../../../../../src/cache/services/cache.service';
import { RateLimitGuard } from '../../../../../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../../../../../src/auth/services/rate-limit.service';

// Mock the logger
jest.mock('../../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('StorageController', () => {
  let controller: StorageController;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    // Create mock for CacheService
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            storeData: jest.fn(),
            retrieveData: jest.fn(),
            delet_eData: jest.fn(),
            getStorageStats: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
          }
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue([]),
          }
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({
              allowed: true,
              limit: 100,
              remaining: 99,
              resetTime: new Date().getTime() + 60000,
            }),
          }
        }
      ],
    })
    .overrideGuard(UnifiedPermissionsGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .overrideGuard(RateLimitGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<StorageController>(StorageController);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeData', () => {
    const mockStoreDataDto: StoreDataDto = {
      key: 'test-key',
      data: { value: 'test-data' },
      storageType: StorageType.BOTH,
      storageClassification: StorageClassification.GENERAL, // 使用有效的枚举值
      provider: 'test-provider',
      market: 'test-market',
      options: {},
    };

    it('should store data successfully', async () => {
      const mockResponse: StorageResponseDto = {
        data: null,
        metadata: {
          key: 'test-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTime: 10,
          compressed: false
        },
        cacheInfo: {
          hit: false,
          source: "persistent", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3600
        }
      };
      storageService.storeData.mockResolvedValue(mockResponse);

      const result = await controller.storeData(mockStoreDataDto);
      expect(storageService.storeData).toHaveBeenCalledWith(mockStoreDataDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if storageService.storeData fails', async () => {
      storageService.storeData.mockRejectedValue(new InternalServerErrorException('Storage failed'));
      await expect(controller.storeData(mockStoreDataDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('retrieveData', () => {
    const mockRetrieveDataDto: RetrieveDataDto = {
      key: 'test-key',
      preferredType: StorageType.BOTH,
      updateCache: false,
    };

    it('should retrieve data successfully', async () => {
      const mockResponse: StorageResponseDto = {
        data: { value: 'retrieved-data' },
        metadata: {
          key: 'test-key',
          storageType: StorageType.CACHE,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 50,
          storedAt: new Date().toISOString(),
          processingTime: 5,
          compressed: false
        },
        cacheInfo: {
          hit: true,
          source: "cache", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3000
        }
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveData(mockRetrieveDataDto);
      expect(storageService.retrieveData).toHaveBeenCalledWith(mockRetrieveDataDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if storageService.retrieveData fails', async () => {
      storageService.retrieveData.mockRejectedValue(new NotFoundException('Data not found'));
      await expect(controller.retrieveData(mockRetrieveDataDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('retrieveDataByKey', () => {
    it('should retrieve data by key with default options', async () => {
      const mockResponse: StorageResponseDto = {
        data: { value: 'retrieved-data-by-key' },
        metadata: {
          key: 'test-key',
          storageType: StorageType.CACHE,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 50,
          storedAt: new Date().toISOString(),
          processingTime: 5,
          compressed: false
        },
        cacheInfo: {
          hit: true,
          source: "cache", // "cache" | "persistent" | "not_found"
          ttlRemaining: 3000
        }
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveDataByKey('test-key');
      expect(storageService.retrieveData).toHaveBeenCalledWith({
        key: 'test-key',
        preferredType: StorageType.BOTH,
        updateCache: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should retrieve data by key with specified preferredType and updateCache', async () => {
      const mockResponse: StorageResponseDto = {
        data: { value: 'retrieved-data-by-key-custom' },
        metadata: {
          key: 'test-key',
          storageType: StorageType.PERSISTENT,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 50,
          processingTime: 5,
          storedAt: new Date().toISOString(),
          compressed: false
        },
        cacheInfo: {
          hit: false,
          source: 'persistent',
          ttlRemaining: null
        }
      };
      storageService.retrieveData.mockResolvedValue(mockResponse);

      const result = await controller.retrieveDataByKey('test-key', StorageType.PERSISTENT, true);
      expect(storageService.retrieveData).toHaveBeenCalledWith({
        key: 'test-key',
        preferredType: StorageType.PERSISTENT,
        updateCache: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteData', () => {
    it('should delete data successfully with default storageType', async () => {
      storageService.deleteData.mockResolvedValue(true); // 返回布尔值而非数字
      const result = await controller.deleteData('test-key');
      expect(storageService.deleteData).toHaveBeenCalledWith('test-key', StorageType.BOTH);
      expect(result).toEqual({ success: true, delet_ed: true, key: 'test-key' });
    });

    it('should delete data successfully with specified storageType', async () => {
      storageService.deleteData.mockResolvedValue(true); // 返回布尔值而非数字
      const result = await controller.deleteData('test-key', StorageType.CACHE);
      expect(storageService.deleteData).toHaveBeenCalledWith('test-key', StorageType.CACHE);
      expect(result).toEqual({ success: true, delet_ed: true, key: 'test-key' });
    });

    it('should throw error if storageService.deleteData fails', async () => {
      storageService.deleteData.mockRejectedValue(new InternalServerErrorException('Deletion failed'));
      await expect(controller.deleteData('test-key')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getStorageStats', () => {
    it('should get storage stats successfully', async () => {
      const mockStatsResponse: StorageStatsDto = {
        cache: {
          totalKeys: 100,
          totalMemoryUsage: 1024 * 1024, // 以字节为单位
          hitRate: 0.85,
          avgTtl: 3600
        },
        persistent: {
          totalDocuments: 500,
          totalSizeBytes: 5 * 1024 * 1024,
          categoriesCounts: { 'general': 300, 'stock_quote': 200 },
          providerCounts: { 'test-provider': 500 }
        },
        performance: {
          avgStorageTime: 15,
          avgRetrievalTime: 5,
          operationsPerSecond: 100,
          errorRate: 0.01
        },
        timestamp: new Date().toISOString()
      };
      storageService.getStorageStats.mockResolvedValue(mockStatsResponse);

      const result = await controller.getStorageStats();
      expect(storageService.getStorageStats).toHaveBeenCalled();
      expect(result).toEqual(mockStatsResponse);
    });

    it('should throw error if storageService.getStorageStats fails', async () => {
      storageService.getStorageStats.mockRejectedValue(new InternalServerErrorException('Failed to get stats'));
      await expect(controller.getStorageStats()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      const mockStoreResponse: StorageResponseDto = {
        data: { status: "stored" },
        metadata: {
          key: 'health-check-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTime: 10,
          compressed: false
        }
      };

      const mockRetrieveResponse: StorageResponseDto = {
        data: { test: true },
        metadata: {
          key: 'health-check-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTime: 10,
          compressed: false
        }
      };

      storageService.storeData.mockResolvedValue(mockStoreResponse);
      storageService.retrieveData.mockResolvedValue(mockRetrieveResponse);
      storageService.deleteData.mockResolvedValue(true);

      const result = await controller.healthCheck();
      expect(result).toEqual({
        cache: {
          available: true,
          latency: expect.any(Number),
        },
        persistent: {
          available: true,
          latency: expect.any(Number),
        },
        overall: {
          healthy: true,
        },
      });
    });

    it('should handle cache health check failure', async () => {
      const mockStoreError = new Error('Cache error');
      
      // 使用正确返回类型的mockImplementation
      storageService.storeData.mockImplementation((req) => {
        if (req.storageType === StorageType.CACHE) {
          return Promise.reject(mockStoreError);
        }
        return Promise.resolve({
          data: { test: true },
          metadata: {
            key: 'health-check-key',
            storageType: StorageType.PERSISTENT,
            storageClassification: StorageClassification.GENERAL,
            provider: 'test-provider',
            market: 'test-market',
            dataSize: 100,
            storedAt: new Date().toISOString(),
            processingTime: 10,
            compressed: false
          }
        });
      });
      
      // 使用正确的mock返回值
      storageService.retrieveData.mockResolvedValue({
        data: { test: true },
        metadata: {
          key: 'health-check-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTime: 10,
          compressed: false
        }
      });
      
      // 返回布尔值
      storageService.deleteData.mockResolvedValue(true);

      const result = await controller.healthCheck();
      expect(result).toEqual({
        cache: {
          available: false,
          latency: expect.any(Number),
        },
        persistent: {
          available: true,
          latency: expect.any(Number),
        },
        overall: {
          healthy: false,
        },
      });
    });

    it('should handle persistent health check failure', async () => {
      const mockStoreError = new Error('Persistent error');
      
      // 使用正确返回类型的mockImplementation
      storageService.storeData.mockImplementation((req) => {
        if (req.storageType === StorageType.PERSISTENT) {
          return Promise.reject(mockStoreError);
        }
        return Promise.resolve({
          data: { test: true },
          metadata: {
            key: 'health-check-key',
            storageType: StorageType.CACHE,
            storageClassification: StorageClassification.GENERAL,
            provider: 'test-provider',
            market: 'test-market',
            dataSize: 100,
            storedAt: new Date().toISOString(),
            processingTime: 10,
            compressed: false
          }
        });
      });
      
      // 使用正确的mock返回值
      storageService.retrieveData.mockResolvedValue({
        data: { test: true },
        metadata: {
          key: 'health-check-key',
          storageType: StorageType.BOTH,
          storageClassification: StorageClassification.GENERAL,
          provider: 'test-provider',
          market: 'test-market',
          dataSize: 100,
          storedAt: new Date().toISOString(),
          processingTime: 10,
          compressed: false
        }
      });
      
      // 返回布尔值
      storageService.deleteData.mockResolvedValue(true);

      const result = await controller.healthCheck();
      expect(result).toEqual({
        cache: {
          available: true,
          latency: expect.any(Number),
        },
        persistent: {
          available: false,
          latency: expect.any(Number),
        },
        overall: {
          healthy: false,
        },
      });
    });

    it('should return error status if both health checks fail', async () => {
      // 内部错误会被捕获，不会抛出异常，而是返回不健康的状态
      storageService.storeData.mockRejectedValue(new Error('Store error'));
      storageService.retrieveData.mockRejectedValue(new Error('Retrieve error'));
      storageService.deleteData.mockRejectedValue(new Error('Delete error'));

      const result = await controller.healthCheck();
      expect(result).toEqual({
        cache: {
          available: false,
          latency: expect.any(Number),
        },
        persistent: {
          available: false,
          latency: expect.any(Number),
        },
        overall: {
          healthy: false,
        },
      });
    });
  });
});