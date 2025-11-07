import { StorageResponseDto, StorageStatsDto, PaginatedStorageItemDto } from '@core/04-storage/storage/dto/storage-response.dto';
import { StorageMetadataDto } from '@core/04-storage/storage/dto/storage-metadata.dto';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

describe('StorageResponseDto', () => {
  describe('Constructor function coverage', () => {
    it('should create StorageResponseDto instance with constructor', () => {
      // Arrange
      const testData = { symbol: 'AAPL', price: 150.25 };
      const metadata = new StorageMetadataDto(
        'test-key',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'test-provider',
        'test-market',
        1024,
        50,
        false
      );
      const cacheInfo = {
        hit: true,
        source: 'cache' as const,
        ttlRemaining: 3600
      };

      // Act - 调用构造函数
      const response = new StorageResponseDto(testData, metadata, cacheInfo);

      // Assert - 验证构造函数执行
      expect(response).toBeInstanceOf(StorageResponseDto);
      expect(response.data).toEqual(testData);
      expect(response.metadata).toEqual(metadata);
      expect(response.cacheInfo).toEqual(cacheInfo);
    });

    it('should create StorageResponseDto instance without optional cacheInfo', () => {
      // Arrange
      const testData = { symbol: 'GOOGL', price: 2800.50 };
      const metadata = new StorageMetadataDto(
        'test-key-2',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'test-provider-2',
        'test-market-2',
        2048,
        75,
        true
      );

      // Act - 调用构造函数（不提供cacheInfo）
      const response = new StorageResponseDto(testData, metadata);

      // Assert - 验证构造函数执行
      expect(response).toBeInstanceOf(StorageResponseDto);
      expect(response.data).toEqual(testData);
      expect(response.metadata).toEqual(metadata);
      expect(response.cacheInfo).toBeUndefined();
    });

    it('should create StorageResponseDto with different data types', () => {
      // Arrange - 测试不同数据类型的构造
      const testCases = [
        { data: 'string data', description: 'string' },
        { data: 12345, description: 'number' },
        { data: true, description: 'boolean' },
        { data: null, description: 'null' },
        { data: [], description: 'array' },
        { data: { complex: { nested: 'object' } }, description: 'complex object' }
      ];

      for (const testCase of testCases) {
        const metadata = new StorageMetadataDto(
          `test-${testCase.description}`,
          StorageType.PERSISTENT,
          StorageClassification.STOCK_QUOTE,
          'test-provider',
          'test-market',
          512,
          25,
          false
        );

        // Act - 调用构造函数
        const response = new StorageResponseDto(testCase.data, metadata);

        // Assert - 验证构造函数处理不同数据类型
        expect(response.data).toEqual(testCase.data);
        expect(response.metadata).toEqual(metadata);
      }
    });

    it('should create StorageResponseDto with different cacheInfo configurations', () => {
      // Arrange - 测试不同cacheInfo配置的构造
      const testData = { test: 'cache-config-test' };
      const metadata = new StorageMetadataDto(
        'cache-test-key',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'cache-provider',
        'cache-market',
        256,
        10,
        false
      );

      const cacheConfigs = [
        { hit: true, source: 'cache', ttlRemaining: 1800, description: 'cache hit with TTL' },
        { hit: true, source: 'cache', description: 'cache hit without TTL' },
        { hit: false, source: 'persistent', description: 'cache miss from persistent' },
        { hit: false, source: 'not_found', description: 'not found' }
      ];

      for (const config of cacheConfigs) {
        // Act - 调用构造函数
        const response = new StorageResponseDto(testData, metadata, config as any);

        // Assert - 验证构造函数处理不同缓存配置
        expect(response.cacheInfo).toEqual(config);
        expect(response.cacheInfo.hit).toBe(config.hit);
        expect(response.cacheInfo.source).toBe(config.source);
      }
    });
  });

  describe('Property assignment coverage', () => {
    it('should properly assign all properties in constructor', () => {
      // Arrange
      const testData = { assignmentTest: true };
      const metadata = new StorageMetadataDto(
        'assignment-key',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'assignment-provider',
        'assignment-market',
        128,
        5,
        true
      );
      const cacheInfo = {
        hit: true,
        source: 'persistent' as const,
        ttlRemaining: 900
      };

      // Act - 验证属性赋值执行
      const response = new StorageResponseDto(testData, metadata, cacheInfo);

      // Assert - 验证每个属性都被正确赋值
      expect(response.data).toBe(testData);
      expect(response.metadata).toBe(metadata);
      expect(response.cacheInfo).toBe(cacheInfo);

      // 验证属性类型
      expect(typeof response.data).toBe('object');
      expect(response.metadata).toBeInstanceOf(StorageMetadataDto);
      expect(typeof response.cacheInfo).toBe('object');
    });
  });
});

describe('StorageStatsDto', () => {
  describe('Class instantiation and property coverage', () => {
    it('should create StorageStatsDto instance with persistent properties', () => {
      // Arrange
      const stats = new StorageStatsDto();

      // Act - 设置持久化属性
      stats.persistent = {
        totalDocuments: 500,
        totalSizeBytes: 1000000000,
        categoriesCounts: { 'STOCK_QUOTE': 400, 'MARKET_DATA': 100 },
        providerCounts: { 'longport': 300, 'yahoo': 200 }
      };

      // Assert - 验证所有属性设置
      expect(stats).toBeInstanceOf(StorageStatsDto);
      expect(stats.persistent.totalDocuments).toBe(500);
    });

    it('should handle edge case values in StorageStatsDto', () => {
      // Arrange & Act
      const stats = new StorageStatsDto();

      // 边界值测试（仅持久化）
      stats.persistent = {
        totalDocuments: 999999,
        totalSizeBytes: 999000000000,
        categoriesCounts: {},
        providerCounts: {}
      };

      // Assert - 验证边界值处理
      expect(stats.persistent.totalDocuments).toBe(999999);
    });
  });
});

describe('PaginatedStorageItemDto', () => {
  describe('Class instantiation and property coverage', () => {
    it('should create PaginatedStorageItemDto instance with all properties', () => {
      // Arrange & Act
      const item = new PaginatedStorageItemDto();

      // 设置所有属性
      item.id = 'item-123';
      item.key = 'storage-key-123';
      item.provider = 'test-provider';
      item.market = 'test-market';
      item.storageClassification = 'STOCK_QUOTE';
      item.compressed = true;
      item.dataSize = 2048;
      item.tags = ['tag1', 'tag2', 'tag3'];
      item.storedAt = '2024-01-01T12:00:00.000Z';
      item.expiresAt = '2024-01-31T23:59:59.999Z';

      // Assert - 验证所有属性设置
      expect(item).toBeInstanceOf(PaginatedStorageItemDto);
      expect(item.id).toBe('item-123');
      expect(item.key).toBe('storage-key-123');
      expect(item.provider).toBe('test-provider');
      expect(item.market).toBe('test-market');
      expect(item.storageClassification).toBe('STOCK_QUOTE');
      expect(item.compressed).toBe(true);
      expect(item.dataSize).toBe(2048);
      expect(item.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(item.storedAt).toBe('2024-01-01T12:00:00.000Z');
      expect(item.expiresAt).toBe('2024-01-31T23:59:59.999Z');
    });

    it('should handle optional properties as undefined', () => {
      // Arrange & Act
      const item = new PaginatedStorageItemDto();

      // 只设置必需属性
      item.id = 'item-456';
      item.key = 'storage-key-456';
      item.provider = 'optional-provider';
      item.market = 'optional-market';
      item.storageClassification = 'MARKET_DATA';
      item.compressed = false;
      item.dataSize = 1024;

      // Assert - 验证可选属性为undefined
      expect(item.tags).toBeUndefined();
      expect(item.storedAt).toBeUndefined();
      expect(item.expiresAt).toBeUndefined();
    });

    it('should handle different data types and edge cases', () => {
      // Arrange - 测试不同数据类型和边界值
      const testCases = [
        {
          id: 'edge-case-1',
          dataSize: 0,
          compressed: false,
          tags: [],
          description: 'minimum values'
        },
        {
          id: 'edge-case-2',
          dataSize: Number.MAX_SAFE_INTEGER,
          compressed: true,
          tags: ['single-tag'],
          description: 'maximum values'
        },
        {
          id: 'edge-case-3',
          dataSize: 512,
          compressed: true,
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
          description: 'many tags'
        }
      ];

      for (const testCase of testCases) {
        // Act
        const item = new PaginatedStorageItemDto();
        item.id = testCase.id;
        item.key = `key-${testCase.description}`;
        item.provider = 'edge-provider';
        item.market = 'edge-market';
        item.storageClassification = 'STOCK_QUOTE';
        item.compressed = testCase.compressed;
        item.dataSize = testCase.dataSize;
        item.tags = testCase.tags;

        // Assert
        expect(item.id).toBe(testCase.id);
        expect(item.dataSize).toBe(testCase.dataSize);
        expect(item.compressed).toBe(testCase.compressed);
        expect(item.tags).toEqual(testCase.tags);
      }
    });

    it('should handle special characters and unicode in string properties', () => {
      // Arrange & Act
      const item = new PaginatedStorageItemDto();

      item.id = 'unicode-测试-🚀';
      item.key = 'key-with-特殊字符-and-emoji-📊';
      item.provider = 'provider_with_underscores-and-数字123';
      item.market = 'market.with.dots:and:colons/and/slashes';
      item.storageClassification = 'STOCK_QUOTE';
      item.compressed = false;
      item.dataSize = 256;
      item.tags = ['unicode-tag-中文', 'emoji-tag-🏷️', 'special-chars-@#$%'];

      // Assert - 验证特殊字符处理
      expect(item.id).toBe('unicode-测试-🚀');
      expect(item.key).toBe('key-with-特殊字符-and-emoji-📊');
      expect(item.provider).toBe('provider_with_underscores-and-数字123');
      expect(item.market).toBe('market.with.dots:and:colons/and/slashes');
      expect(item.tags).toContain('unicode-tag-中文');
      expect(item.tags).toContain('emoji-tag-🏷️');
    });
  });
});
