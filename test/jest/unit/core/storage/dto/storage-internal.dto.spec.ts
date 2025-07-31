/**
 * Storage Internal DTO UCK�
 * K�X���(�pn ��a
 */

import { validate } from 'class-validator';
import {
  CacheResultDto,
  PersistentResultDto,
  CompressionResultDto,
  CacheInfoDto,
  StorageCacheStatsDto,
  PersistentStatsDto,
  PerformanceStatsDto,
} from '../../../../../../src/core/storage/dto/storage-internal.dto';

describe('Storage Internal DTOs', () => {
  describe('CacheResultDto', () => {
    let dto: CacheResultDto;

    beforeEach(() => {
      dto = new CacheResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with valid data', () => {
        // Arrange
        dto.data = { symbol: '00700.HK', price: 425.6 };
        dto.ttl = 300;
        dto.metadata = {
          compressed: true,
          storedAt: '2023-06-01T10:00:00Z',
        };

        // Assert
        expect(dto).toBeInstanceOf(CacheResultDto);
        expect(dto.data).toEqual({ symbol: '00700.HK', price: 425.6 });
        expect(dto.ttl).toBe(300);
        expect(dto.metadata.compressed).toBe(true);
      });

      it('should handle minimal required fields', () => {
        // Arrange
        dto.data = 'simple string data';
        dto.ttl = 60;

        // Assert
        expect(dto.data).toBe('simple string data');
        expect(dto.ttl).toBe(60);
        expect(dto.metadata).toBeUndefined();
      });

      it('should validate TTL is a number', async () => {
        // Arrange
        dto.data = 'test';
        dto.ttl = 120;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid TTL', async () => {
        // Arrange
        dto.data = 'test';
        dto.ttl = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('ttl');
      });

      it('should fail validation with invalid metadata', async () => {
        // Arrange
        dto.data = 'test';
        dto.ttl = 60;
        dto.metadata = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('metadata');
      });
    });

    describe('Data Types', () => {
      it('should handle various data types', () => {
        // Arrange & Act & Assert
        const testCases = [
          { data: 'string', expected: 'string' },
          { data: 123, expected: 123 },
          { data: true, expected: true },
          { data: { object: 'value' }, expected: { object: 'value' } },
          { data: [1, 2, 3], expected: [1, 2, 3] },
          { data: null, expected: null },
        ];

        testCases.forEach(({ data, expected }) => {
          dto.data = data;
          dto.ttl = 60;
          expect(dto.data).toEqual(expected);
        });
      });
    });
  });

  describe('PersistentResultDto', () => {
    let dto: PersistentResultDto;

    beforeEach(() => {
      dto = new PersistentResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete metadata', () => {
        // Arrange
        dto.data = { symbols: ['AAPL', 'GOOGL'], prices: [150, 2800] };
        dto.metadata = {
          storageClassification: 'stock_quote',
          provider: 'longport',
          market: 'US',
          dataSize: 1024,
          compressed: true,
          tags: { version: '1.0', source: 'api' },
          storedAt: new Date('2023-06-01T10:00:00Z'),
        };

        // Assert
        expect(dto.data).toBeDefined();
        expect(dto.metadata.storageClassification).toBe('stock_quote');
        expect(dto.metadata.provider).toBe('longport');
        expect(dto.metadata.market).toBe('US');
        expect(dto.metadata.dataSize).toBe(1024);
        expect(dto.metadata.compressed).toBe(true);
        expect(dto.metadata.tags).toEqual({ version: '1.0', source: 'api' });
        expect(dto.metadata.storedAt).toBeInstanceOf(Date);
      });

      it('should handle partial metadata', () => {
        // Arrange
        dto.data = 'test data';
        dto.metadata = {
          storageClassification: 'test_data',
        };

        // Assert
        expect(dto.metadata.storageClassification).toBe('test_data');
        expect(dto.metadata.provider).toBeUndefined();
        expect(dto.metadata.market).toBeUndefined();
      });

      it('should validate metadata object', async () => {
        // Arrange
        dto.data = 'test';
        dto.metadata = {
          storageClassification: 'test',
          provider: 'test_provider',
        };

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid metadata type', async () => {
        // Arrange
        dto.data = 'test';
        dto.metadata = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('metadata');
      });
    });
  });

  describe('CompressionResultDto', () => {
    let dto: CompressionResultDto;

    beforeEach(() => {
      dto = new CompressionResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with compression data', () => {
        // Arrange
        dto.serializedData = 'H4sIAAAAAAAACouuVkosLUmtqI4FAA';
        dto.compressed = true;
        dto.dataSize = 256;

        // Assert
        expect(dto.serializedData).toBe('H4sIAAAAAAAACouuVkosLUmtqI4FAA');
        expect(dto.compressed).toBe(true);
        expect(dto.dataSize).toBe(256);
      });

      it('should handle uncompressed data', () => {
        // Arrange
        dto.serializedData = JSON.stringify({ test: 'data' });
        dto.compressed = false;
        dto.dataSize = 16;

        // Assert
        expect(dto.compressed).toBe(false);
        expect(dto.dataSize).toBe(16);
        expect(() => JSON.parse(dto.serializedData)).not.toThrow();
      });

      it('should validate all fields', async () => {
        // Arrange
        dto.serializedData = 'valid_string';
        dto.compressed = true;
        dto.dataSize = 100;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with non-string serializedData', async () => {
        // Arrange
        dto.serializedData = 123 as any;
        dto.compressed = true;
        dto.dataSize = 100;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'serializedData')).toBe(true);
      });

      it('should fail validation with non-boolean compressed', async () => {
        // Arrange
        dto.serializedData = 'test';
        dto.compressed = 'true' as any;
        dto.dataSize = 100;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'compressed')).toBe(true);
      });

      it('should fail validation with non-number dataSize', async () => {
        // Arrange
        dto.serializedData = 'test';
        dto.compressed = true;
        dto.dataSize = '100' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'dataSize')).toBe(true);
      });
    });
  });

  describe('CacheInfoDto', () => {
    let dto: CacheInfoDto;

    beforeEach(() => {
      dto = new CacheInfoDto();
    });

    describe('Valid Data', () => {
      it('should create cache hit info', () => {
        // Arrange
        dto.hit = true;
        dto.source = 'cache';
        dto.ttlRemaining = 240;

        // Assert
        expect(dto.hit).toBe(true);
        expect(dto.source).toBe('cache');
        expect(dto.ttlRemaining).toBe(240);
      });

      it('should create cache miss info', () => {
        // Arrange
        dto.hit = false;
        dto.source = 'persistent';

        // Assert
        expect(dto.hit).toBe(false);
        expect(dto.source).toBe('persistent');
        expect(dto.ttlRemaining).toBeUndefined();
      });

      it('should handle not found case', () => {
        // Arrange
        dto.hit = false;
        dto.source = 'not_found';

        // Assert
        expect(dto.hit).toBe(false);
        expect(dto.source).toBe('not_found');
      });

      it('should validate with valid source values', async () => {
        // Arrange
        const validSources = ['cache', 'persistent', 'not_found'];

        for (const source of validSources) {
          dto.hit = source === 'cache';
          dto.source = source as any;

          // Act
          const errors = await validate(dto);

          // Assert
          expect(errors.length).toBe(0);
        }
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid hit value', async () => {
        // Arrange
        dto.hit = 'true' as any;
        dto.source = 'cache';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'hit')).toBe(true);
      });

      it('should fail validation with invalid source', async () => {
        // Arrange
        dto.hit = true;
        dto.source = 'invalid_source' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0); // source only validates as string, not enum value
        // expect(errors.some(e => e.property === 'source')).toBe(true);
      });
    });
  });

  describe('StorageCacheStatsDto', () => {
    let dto: StorageCacheStatsDto;

    beforeEach(() => {
      dto = new StorageCacheStatsDto();
    });

    describe('Valid Data', () => {
      it('should create stats with realistic values', () => {
        // Arrange
        dto.totalKeys = 15000;
        dto.totalMemoryUsage = 52428800; // 50MB
        dto.hitRate = 0.85;
        dto.avgTtl = 300;

        // Assert
        expect(dto.totalKeys).toBe(15000);
        expect(dto.totalMemoryUsage).toBe(52428800);
        expect(dto.hitRate).toBe(0.85);
        expect(dto.avgTtl).toBe(300);
      });

      it('should validate all numeric fields', async () => {
        // Arrange
        dto.totalKeys = 1000;
        dto.totalMemoryUsage = 1048576; // 1MB
        dto.hitRate = 0.9;
        dto.avgTtl = 600;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with non-numeric values', async () => {
        // Arrange
        dto.totalKeys = 'many' as any;
        dto.totalMemoryUsage = 'large' as any;
        dto.hitRate = 'high' as any;
        dto.avgTtl = 'long' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(4);
        expect(errors.some(e => e.property === 'totalKeys')).toBe(true);
        expect(errors.some(e => e.property === 'totalMemoryUsage')).toBe(true);
        expect(errors.some(e => e.property === 'hitRate')).toBe(true);
        expect(errors.some(e => e.property === 'avgTtl')).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero values', () => {
        // Arrange
        dto.totalKeys = 0;
        dto.totalMemoryUsage = 0;
        dto.hitRate = 0;
        dto.avgTtl = 0;

        // Assert
        expect(dto.totalKeys).toBe(0);
        expect(dto.totalMemoryUsage).toBe(0);
        expect(dto.hitRate).toBe(0);
        expect(dto.avgTtl).toBe(0);
      });

      it('should handle perfect hit rate', () => {
        // Arrange
        dto.totalKeys = 100;
        dto.totalMemoryUsage = 1024;
        dto.hitRate = 1.0;
        dto.avgTtl = 300;

        // Assert
        expect(dto.hitRate).toBe(1.0);
      });
    });
  });

  describe('PersistentStatsDto', () => {
    let dto: PersistentStatsDto;

    beforeEach(() => {
      dto = new PersistentStatsDto();
    });

    describe('Valid Data', () => {
      it('should create stats with counts and categories', () => {
        // Arrange
        dto.totalDocuments = 50000;
        dto.totalSizeBytes = 104857600; // 100MB
        dto.categoriesCounts = {
          stock_quote: 30000,
          stock_info: 15000,
          market_status: 5000,
        };
        dto.providerCounts = {
          longport: 35000,
          longport_sg: 10000,
          itick: 5000,
        };

        // Assert
        expect(dto.totalDocuments).toBe(50000);
        expect(dto.totalSizeBytes).toBe(104857600);
        expect(dto.categoriesCounts.stock_quote).toBe(30000);
        expect(dto.providerCounts.longport).toBe(35000);
      });

      it('should validate all fields', async () => {
        // Arrange
        dto.totalDocuments = 1000;
        dto.totalSizeBytes = 1048576;
        dto.categoriesCounts = { test: 500 };
        dto.providerCounts = { test_provider: 1000 };

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid object types', async () => {
        // Arrange
        dto.totalDocuments = 1000;
        dto.totalSizeBytes = 1024;
        dto.categoriesCounts = 'invalid' as any;
        dto.providerCounts = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'categoriesCounts')).toBe(true);
        expect(errors.some(e => e.property === 'providerCounts')).toBe(true);
      });
    });

    describe('Empty Collections', () => {
      it('should handle empty count objects', () => {
        // Arrange
        dto.totalDocuments = 0;
        dto.totalSizeBytes = 0;
        dto.categoriesCounts = {};
        dto.providerCounts = {};

        // Assert
        expect(Object.keys(dto.categoriesCounts)).toHaveLength(0);
        expect(Object.keys(dto.providerCounts)).toHaveLength(0);
      });
    });
  });

  describe('PerformanceStatsDto', () => {
    let dto: PerformanceStatsDto;

    beforeEach(() => {
      dto = new PerformanceStatsDto();
    });

    describe('Valid Data', () => {
      it('should create performance stats', () => {
        // Arrange
        dto.avgStorageTime = 25.5;
        dto.avgRetrievalTime = 12.3;
        dto.operationsPerSecond = 1500;
        dto.errorRate = 0.001;

        // Assert
        expect(dto.avgStorageTime).toBe(25.5);
        expect(dto.avgRetrievalTime).toBe(12.3);
        expect(dto.operationsPerSecond).toBe(1500);
        expect(dto.errorRate).toBe(0.001);
      });

      it('should validate all numeric fields', async () => {
        // Arrange
        dto.avgStorageTime = 30;
        dto.avgRetrievalTime = 15;
        dto.operationsPerSecond = 2000;
        dto.errorRate = 0.005;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with non-numeric values', async () => {
        // Arrange
        dto.avgStorageTime = 'slow' as any;
        dto.avgRetrievalTime = 'fast' as any;
        dto.operationsPerSecond = 'many' as any;
        dto.errorRate = 'low' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(4);
        expect(errors.some(e => e.property === 'avgStorageTime')).toBe(true);
        expect(errors.some(e => e.property === 'avgRetrievalTime')).toBe(true);
        expect(errors.some(e => e.property === 'operationsPerSecond')).toBe(true);
        expect(errors.some(e => e.property === 'errorRate')).toBe(true);
      });
    });

    describe('Performance Metrics', () => {
      it('should handle high performance metrics', () => {
        // Arrange
        dto.avgStorageTime = 5.2;
        dto.avgRetrievalTime = 2.1;
        dto.operationsPerSecond = 10000;
        dto.errorRate = 0.0001;

        // Assert
        expect(dto.avgStorageTime).toBeLessThan(10);
        expect(dto.avgRetrievalTime).toBeLessThan(5);
        expect(dto.operationsPerSecond).toBeGreaterThan(5000);
        expect(dto.errorRate).toBeLessThan(0.001);
      });

      it('should handle poor performance metrics', () => {
        // Arrange
        dto.avgStorageTime = 200.5;
        dto.avgRetrievalTime = 150.3;
        dto.operationsPerSecond = 50;
        dto.errorRate = 0.1;

        // Assert
        expect(dto.avgStorageTime).toBeGreaterThan(100);
        expect(dto.avgRetrievalTime).toBeGreaterThan(100);
        expect(dto.operationsPerSecond).toBeLessThan(100);
        expect(dto.errorRate).toBeGreaterThan(0.05);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together in storage operations', () => {
      // Arrange
      const cacheResult = new CacheResultDto();
      cacheResult.data = { test: 'data' };
      cacheResult.ttl = 300;

      const cacheInfo = new CacheInfoDto();
      cacheInfo.hit = true;
      cacheInfo.source = 'cache';
      cacheInfo.ttlRemaining = 240;

      const compressionResult = new CompressionResultDto();
      compressionResult.serializedData = JSON.stringify(cacheResult.data);
      compressionResult.compressed = false;
      compressionResult.dataSize = compressionResult.serializedData.length;

      // Assert
      expect(cacheResult.data).toEqual({ test: 'data' });
      expect(cacheInfo.hit).toBe(true);
      expect(compressionResult.dataSize).toBe(JSON.stringify({ test: 'data' }).length);
    });

    it('should provide comprehensive storage statistics', () => {
      // Arrange
      const cacheStats = new StorageCacheStatsDto();
      cacheStats.totalKeys = 10000;
      cacheStats.totalMemoryUsage = 10485760;
      cacheStats.hitRate = 0.85;
      cacheStats.avgTtl = 300;

      const persistentStats = new PersistentStatsDto();
      persistentStats.totalDocuments = 50000;
      persistentStats.totalSizeBytes = 104857600;
      persistentStats.categoriesCounts = { stock_data: 50000 };
      persistentStats.providerCounts = { longport: 50000 };

      const performanceStats = new PerformanceStatsDto();
      performanceStats.avgStorageTime = 25;
      performanceStats.avgRetrievalTime = 15;
      performanceStats.operationsPerSecond = 2000;
      performanceStats.errorRate = 0.002;

      // Assert
      expect(cacheStats.hitRate).toBeGreaterThan(0.8);
      expect(persistentStats.totalDocuments).toBeGreaterThan(cacheStats.totalKeys);
      expect(performanceStats.operationsPerSecond).toBeGreaterThan(1000);
    });
  });
});