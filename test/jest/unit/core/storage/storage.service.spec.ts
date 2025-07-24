import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../../../../src/core/storage/storage.service';
import { StorageRepository } from '../../../../../src/core/storage/repositories/storage.repository';
import { CacheService } from '../../../../../src/cache/cache.service';
import { StorageType, DataClassification } from '../../../../../src/core/storage/enums/storage-type.enum';
import { ServiceUnavailableException } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { StoreDataDto, RetrieveDataDto } from '../../../../../src/core/storage/dto/storage-request.dto';

describe('StorageService', () => {
  let service: StorageService;
  let mockRepository: Partial<jest.Mocked<StorageRepository>>;
  let mockCacheService: Partial<jest.Mocked<CacheService>>;

  beforeEach(async () => {
    mockRepository = {
      storeInCache: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({ success: true, _id: 'doc-id', key: 'test-key' }),
      retrieveFromCache: jest.fn().mockResolvedValue({ data: '{"test":"data"}', metadata: `{"compressed":false, "storedAt": "${new Date().toISOString()}"}`, ttl: 3600 }),
      findByKey: jest.fn().mockResolvedValue({
        key: 'test-key',
        data: { value: 'test' },
        dataTypeFilter: DataClassification.GENERAL,
        provider: 'test',
        market: 'US',
        dataSize: 100,
        compressed: false,
        tags: [],
        storedAt: new Date(),
        toObject: () => ({ data: { value: 'test' } }),
      }),
      deleteFromCache: jest.fn().mockResolvedValue(true),
      deleteByKey: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      getCacheStats: jest.fn().mockResolvedValue({ info: 'redis_version:6.2.5', dbSize: 100, totalMemoryUsage: 1024 }),
      countAll: jest.fn().mockResolvedValue(500),
      getDataTypeFilterStats: jest.fn().mockResolvedValue([{ _id: 'type1', count: 100 }]),
      getProviderStats: jest.fn().mockResolvedValue([{ _id: 'prov1', count: 200 }]),
      getSizeStats: jest.fn().mockResolvedValue([{ totalSize: 1024 * 1024 }]),
      getAverageTtl: jest.fn().mockResolvedValue(3600),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [BullModule.registerQueue({ name: 'storage-tasks' })],
      providers: [
        StorageService,
        { provide: StorageRepository, useValue: mockRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeData', () => {
    const baseDto: StoreDataDto = { key: 'test-key', data: { value: 'test' }, storageType: StorageType.BOTH, dataClassification: DataClassification.GENERAL, provider: 'test', market: 'US' };

    it('should store data in cache', async () => {
      const dto = { ...baseDto, storageType: StorageType.CACHE };
      await service.storeData(dto);
      expect(mockRepository.storeInCache).toHaveBeenCalled();
      expect(mockRepository.upsert).not.toHaveBeenCalled();
    });

    it('should store data in persistent storage', async () => {
      const dto = { ...baseDto, storageType: StorageType.PERSISTENT };
      await service.storeData(dto);
      expect(mockRepository.upsert).toHaveBeenCalled();
      expect(mockRepository.storeInCache).not.toHaveBeenCalled();
    });

    it('should store data in both cache and persistent storage', async () => {
      const dto = { ...baseDto, storageType: StorageType.BOTH };
      await service.storeData(dto);
      expect(mockRepository.storeInCache).toHaveBeenCalled();
      expect(mockRepository.upsert).toHaveBeenCalled();
    });

    it('should throw an error if storage fails', async () => {
      mockRepository.upsert.mockRejectedValue(new Error('DB connection lost'));
      const dto = { ...baseDto, storageType: StorageType.PERSISTENT };
      await expect(service.storeData(dto)).rejects.toThrow('存储失败: DB connection lost');
    });
  });

  describe('retrieveData', () => {
    const baseDto: RetrieveDataDto = { key: 'test-key' };

    it('should retrieve data from cache', async () => {
      const dto = { ...baseDto, preferredType: StorageType.CACHE };
      const result = await service.retrieveData(dto);
      expect(result.data).toEqual({ test: 'data' });
      expect(mockRepository.retrieveFromCache).toHaveBeenCalledWith('test-key');
    });

    it('should retrieve data from persistent storage', async () => {
      mockRepository.retrieveFromCache.mockResolvedValue({ data: null, metadata: null, ttl: 0 });
      const dto = { ...baseDto, preferredType: StorageType.PERSISTENT };
      const result = await service.retrieveData(dto);
      expect(result.data).toEqual({ value: 'test' });
      expect(mockRepository.findByKey).toHaveBeenCalledWith('test-key');
    });

    it('should handle cache miss and fallback to persistent storage', async () => {
      mockRepository.retrieveFromCache.mockResolvedValue({ data: null, metadata: null, ttl: 0 });
      const dto = { ...baseDto, preferredType: StorageType.BOTH };
      const result = await service.retrieveData(dto);
      expect(result.data).toEqual({ value: 'test' });
      expect(mockRepository.retrieveFromCache).toHaveBeenCalledWith('test-key');
      expect(mockRepository.findByKey).toHaveBeenCalledWith('test-key');
    });

    it('should throw NotFoundException if not found anywhere', async () => {
      mockRepository.retrieveFromCache.mockResolvedValue({ data: null, metadata: null, ttl: 0 });
      mockRepository.findByKey.mockResolvedValue(null);
      const dto = { ...baseDto, key: 'not-found-key' };
      await expect(service.retrieveData(dto)).rejects.toThrow('数据未找到: not-found-key');
    });
  });

  describe('deleteData', () => {
    it('should delete data from cache', async () => {
      const result = await service.deleteData('test-key', StorageType.CACHE);
      expect(result).toBe(true);
      expect(mockRepository.deleteFromCache).toHaveBeenCalledWith('test-key');
    });

    it('should delete data from persistent storage', async () => {
      const result = await service.deleteData('test-key', StorageType.PERSISTENT);
      expect(result).toBe(true);
      expect(mockRepository.deleteByKey).toHaveBeenCalledWith('test-key');
    });

    it('should delete data from both storages', async () => {
      mockRepository.deleteByKey.mockResolvedValue({ deletedCount: 1 });
      const result = await service.deleteData('test-key', StorageType.BOTH);
      expect(result).toBe(true);
      expect(mockRepository.deleteFromCache).toHaveBeenCalledWith('test-key');
      expect(mockRepository.deleteByKey).toHaveBeenCalledWith('test-key');
    });

    it('should return false if deletion fails', async () => {
      mockRepository.deleteFromCache.mockResolvedValue(false);
      mockRepository.deleteByKey.mockResolvedValue({ deletedCount: 0 });
      const result = await service.deleteData('test-key', StorageType.BOTH);
      expect(result).toBe(false);
    });
  });

  describe('getStorageStats', () => {
    it('should get storage statistics', async () => {
      const stats = await service.getStorageStats();
      expect(stats).toBeDefined();
      expect(stats.cache.totalKeys).toBe(100);
      expect(stats.persistent.totalDocuments).toBe(500);
      expect(mockRepository.getCacheStats).toHaveBeenCalled();
      expect(mockRepository.countAll).toHaveBeenCalled();
    });

    it('should handle stats errors gracefully', async () => {
      mockRepository.getCacheStats.mockRejectedValue(new Error('Redis is down'));
      await expect(service.getStorageStats()).rejects.toThrow('生成存储统计信息失败: Redis is down');
    });
  });

  // Health checks are not part of StorageService in the provided code
});