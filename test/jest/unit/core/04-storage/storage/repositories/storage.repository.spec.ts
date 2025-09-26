import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { StorageRepository } from '@core/04-storage/storage/repositories/storage.repository';
import { StoredData, StoredDataDocument } from '@core/04-storage/storage/schemas/storage.schema';
import { StorageQueryDto } from '@core/04-storage/storage/dto/storage-query.dto';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('StorageRepository', () => {
  let repository: StorageRepository;
  let mockModel: jest.Mocked<Model<StoredDataDocument>>;

  const mockStoredDocument = {
    _id: 'test-id',
    key: 'test-key',
    data: { test: 'data' },
    storageClassification: StorageClassification.STOCK_QUOTE,
    provider: 'test-provider',
    market: 'test-market',
    dataSize: 100,
    compressed: false,
    storedAt: new Date('2023-01-01T00:00:00Z'),
    expiresAt: new Date('2023-01-02T00:00:00Z'),
    tags: ['tag1', 'tag2'],
    sensitivityLevel: 'normal',
    encrypted: false,
  };

  beforeEach(async () => {
    const mockMongooseModel = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      lean: jest.fn(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageRepository,
        {
          provide: getModelToken(StoredData.name),
          useValue: mockMongooseModel,
        },
      ],
    }).compile();

    repository = module.get<StorageRepository>(StorageRepository);
    mockModel = module.get(getModelToken(StoredData.name));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findByKey', () => {
    it('should find document by key successfully', async () => {
      // Arrange
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStoredDocument),
      } as any);

      // Act
      const result = await repository.findByKey('test-key');

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result).toEqual(mockStoredDocument);
    });

    it('should return null when document not found', async () => {
      // Arrange
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      // Act
      const result = await repository.findByKey('non-existent-key');

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith({ key: 'non-existent-key' });
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(error),
      } as any);

      // Act & Assert
      await expect(repository.findByKey('test-key')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findPaginated', () => {
    const validQuery: StorageQueryDto = {
      page: 1,
      limit: 10,
      keySearch: 'test',
      provider: 'test-provider',
      market: 'test-market',
      storageClassification: StorageClassification.STOCK_QUOTE,
      tags: ['tag1'],
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-31'),
    };

    it('should return paginated results with all filters', async () => {
      // Arrange
      const mockItems = [mockStoredDocument];
      const mockTotal = 1;

      // Mock the chain methods
      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(mockTotal);

      // Act
      const result = await repository.findPaginated(validQuery);

      // Assert
      expect(mockModel.find).toHaveBeenCalledWith({
        key: { $regex: 'test', $options: 'i' },
        provider: 'test-provider',
        market: 'test-market',
        storageClassification: StorageClassification.STOCK_QUOTE,
        tags: { $in: ['tag1'] },
        storedAt: {
          $gte: validQuery.startDate,
          $lte: validQuery.endDate,
        },
      });
      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(mockTotal);
    });

    it('should return paginated results with minimal filters', async () => {
      // Arrange
      const minimalQuery: StorageQueryDto = {
        page: 2,
        limit: 5,
      };

      const mockItems = [mockStoredDocument];
      const mockTotal = 10;

      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(mockTotal);

      // Act
      const result = await repository.findPaginated(minimalQuery);

      // Assert
      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockChain.skip).toHaveBeenCalledWith(5); // (page - 1) * limit = (2 - 1) * 5
      expect(mockChain.limit).toHaveBeenCalledWith(5);
      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(mockTotal);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.findPaginated({ page: 1, limit: 10 });

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      const queryWithoutPagination: StorageQueryDto = {};

      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(0);

      // Act
      await repository.findPaginated(queryWithoutPagination);

      // Assert
      expect(mockChain.skip).toHaveBeenCalledWith(0); // (1 - 1) * 10
      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it('should handle date range filters correctly', async () => {
      // Arrange
      const queryWithDates: StorageQueryDto = {
        page: 1,
        limit: 10,
        startDate: new Date('2023-01-01'),
        // No endDate provided
      };

      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(0);

      // Act
      await repository.findPaginated(queryWithDates);

      // Assert
      expect(mockModel.find).toHaveBeenCalledWith({
        storedAt: {
          $gte: queryWithDates.startDate,
        },
      });
    });

    it('should handle database errors in pagination', async () => {
      // Arrange
      const error = new Error('Pagination query failed');
      const mockChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(error),
      };

      mockModel.find.mockReturnValue(mockChain as any);
      mockModel.countDocuments.mockResolvedValue(0);

      // Act & Assert
      await expect(repository.findPaginated(validQuery)).rejects.toThrow('Pagination query failed');
    });
  });

  describe('upsert', () => {
    const validDocument = {
      key: 'test-key',
      data: { test: 'data' },
      storageClassification: StorageClassification.STOCK_QUOTE,
      provider: 'test-provider',
      market: 'test-market',
      dataSize: 100,
      compressed: false,
      storedAt: new Date(),
    };

    it('should upsert document successfully', async () => {
      // Arrange
      mockModel.findOneAndUpdate.mockResolvedValue(mockStoredDocument);

      // Act
      const result = await repository.upsert(validDocument);

      // Assert
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: validDocument.key },
        validDocument,
        { upsert: true, new: true }
      );
      expect(result).toEqual(mockStoredDocument);
    });

    it('should handle upsert errors', async () => {
      // Arrange
      const error = new Error('Upsert failed');
      mockModel.findOneAndUpdate.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.upsert(validDocument)).rejects.toThrow('Upsert failed');
    });

    it('should upsert partial document', async () => {
      // Arrange
      const partialDocument = {
        key: 'partial-key',
        data: { partial: 'data' },
      };

      mockModel.findOneAndUpdate.mockResolvedValue({
        ...mockStoredDocument,
        ...partialDocument,
      });

      // Act
      const result = await repository.upsert(partialDocument);

      // Assert
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: partialDocument.key },
        partialDocument,
        { upsert: true, new: true }
      );
      expect(result.key).toBe(partialDocument.key);
    });
  });

  describe('deleteByKey', () => {
    it('should delete document successfully', async () => {
      // Arrange
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      // Act
      const result = await repository.deleteByKey('test-key');

      // Assert
      expect(mockModel.deleteOne).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result.deletedCount).toBe(1);
    });

    it('should return zero deleted count when document not found', async () => {
      // Arrange
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      // Act
      const result = await repository.deleteByKey('non-existent-key');

      // Assert
      expect(result.deletedCount).toBe(0);
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const error = new Error('Delete operation failed');
      mockModel.deleteOne.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.deleteByKey('test-key')).rejects.toThrow('Delete operation failed');
    });
  });

  describe('countAll', () => {
    it('should return total document count', async () => {
      // Arrange
      mockModel.countDocuments.mockResolvedValue(100);

      // Act
      const result = await repository.countAll();

      // Assert
      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(result).toBe(100);
    });

    it('should return zero when no documents exist', async () => {
      // Arrange
      mockModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await repository.countAll();

      // Assert
      expect(result).toBe(0);
    });

    it('should handle count errors', async () => {
      // Arrange
      const error = new Error('Count operation failed');
      mockModel.countDocuments.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.countAll()).rejects.toThrow('Count operation failed');
    });
  });

  describe('getStorageClassificationStats', () => {
    it('should return storage classification statistics', async () => {
      // Arrange
      const mockStats = [
        { _id: 'test-classification-1', count: 10 },
        { _id: 'test-classification-2', count: 5 },
      ];
      mockModel.aggregate.mockResolvedValue(mockStats);

      // Act
      const result = await repository.getStorageClassificationStats();

      // Assert
      expect(mockModel.aggregate).toHaveBeenCalledWith([
        {
          $group: {
            _id: '$storageClassification',
            count: { $sum: 1 },
          },
        },
      ]);
      expect(result).toEqual(mockStats);
    });

    it('should return empty array when no data exists', async () => {
      // Arrange
      mockModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.getStorageClassificationStats();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle aggregation errors', async () => {
      // Arrange
      const error = new Error('Aggregation failed');
      mockModel.aggregate.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getStorageClassificationStats()).rejects.toThrow('Aggregation failed');
    });
  });

  describe('getProviderStats', () => {
    it('should return provider statistics', async () => {
      // Arrange
      const mockStats = [
        { _id: 'provider-1', count: 20 },
        { _id: 'provider-2', count: 15 },
      ];
      mockModel.aggregate.mockResolvedValue(mockStats);

      // Act
      const result = await repository.getProviderStats();

      // Assert
      expect(mockModel.aggregate).toHaveBeenCalledWith([
        { $group: { _id: '$provider', count: { $sum: 1 } } },
      ]);
      expect(result).toEqual(mockStats);
    });

    it('should return empty array when no providers exist', async () => {
      // Arrange
      mockModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.getProviderStats();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle provider stats aggregation errors', async () => {
      // Arrange
      const error = new Error('Provider stats aggregation failed');
      mockModel.aggregate.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getProviderStats()).rejects.toThrow('Provider stats aggregation failed');
    });
  });

  describe('getSizeStats', () => {
    it('should return size statistics', async () => {
      // Arrange
      const mockStats = [{ totalSize: 1000000 }];
      mockModel.aggregate.mockResolvedValue(mockStats);

      // Act
      const result = await repository.getSizeStats();

      // Assert
      expect(mockModel.aggregate).toHaveBeenCalledWith([
        { $group: { _id: null, totalSize: { $sum: '$dataSize' } } },
      ]);
      expect(result).toEqual(mockStats);
    });

    it('should return zero total size when no data exists', async () => {
      // Arrange
      const mockStats = [{ totalSize: 0 }];
      mockModel.aggregate.mockResolvedValue(mockStats);

      // Act
      const result = await repository.getSizeStats();

      // Assert
      expect(result).toEqual([{ totalSize: 0 }]);
    });

    it('should return empty array when aggregation returns nothing', async () => {
      // Arrange
      mockModel.aggregate.mockResolvedValue([]);

      // Act
      const result = await repository.getSizeStats();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle size stats aggregation errors', async () => {
      // Arrange
      const error = new Error('Size stats aggregation failed');
      mockModel.aggregate.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getSizeStats()).rejects.toThrow('Size stats aggregation failed');
    });
  });
});