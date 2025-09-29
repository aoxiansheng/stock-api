import { StorageMetadataDto } from '@core/04-storage/storage/dto/storage-metadata.dto';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

describe('StorageMetadataDto', () => {
  describe('Constructor function coverage', () => {
    it('should create StorageMetadataDto instance with all required parameters', () => {
      // Arrange
      const key = 'constructor-test-key';
      const storageType = StorageType.PERSISTENT;
      const storageClassification = StorageClassification.STOCK_QUOTE;
      const provider = 'test-provider';
      const market = 'test-market';
      const dataSize = 1024;
      const processingTimeMs = 50;

      // Act - 调用构造函数
      const metadata = new StorageMetadataDto(
        key,
        storageType,
        storageClassification,
        provider,
        market,
        dataSize,
        processingTimeMs
      );

      // Assert - 验证构造函数执行
      expect(metadata).toBeInstanceOf(StorageMetadataDto);
      expect(metadata.key).toBe(key);
      expect(metadata.storageType).toBe(storageType);
      expect(metadata.storageClassification).toBe(storageClassification);
      expect(metadata.provider).toBe(provider);
      expect(metadata.market).toBe(market);
      expect(metadata.dataSize).toBe(dataSize);
      expect(metadata.processingTimeMs).toBe(processingTimeMs);
      expect(metadata.storedAt).toBeDefined();
      expect(typeof metadata.storedAt).toBe('string');
    });

    it('should create StorageMetadataDto instance with all optional parameters', () => {
      // Arrange
      const key = 'constructor-optional-test';
      const storageType = StorageType.PERSISTENT;
      const storageClassification = StorageClassification.STOCK_QUOTE;
      const provider = 'optional-provider';
      const market = 'optional-market';
      const dataSize = 2048;
      const processingTimeMs = 75;
      const compressed = true;
      const tags = { tag1: 'value1', tag2: 'value2' };
      const expiresAt = '2024-12-31T23:59:59.999Z';

      // Act - 调用构造函数（包含所有可选参数）
      const metadata = new StorageMetadataDto(
        key,
        storageType,
        storageClassification,
        provider,
        market,
        dataSize,
        processingTimeMs,
        compressed,
        tags,
        expiresAt
      );

      // Assert - 验证构造函数处理可选参数
      expect(metadata.key).toBe(key);
      expect(metadata.compressed).toBe(compressed);
      expect(metadata.tags).toEqual(tags);
      expect(metadata.expiresAt).toBe(expiresAt);
      expect(metadata.storedAt).toBeDefined();
    });

    it('should create StorageMetadataDto instance with undefined optional parameters', () => {
      // Arrange
      const key = 'constructor-undefined-test';
      const storageType = StorageType.PERSISTENT;
      const storageClassification = StorageClassification.STOCK_QUOTE;
      const provider = 'undefined-provider';
      const market = 'undefined-market';
      const dataSize = 512;
      const processingTimeMs = 25;

      // Act - 调用构造函数（不提供可选参数）
      const metadata = new StorageMetadataDto(
        key,
        storageType,
        storageClassification,
        provider,
        market,
        dataSize,
        processingTimeMs,
        undefined, // compressed
        undefined, // tags
        undefined  // expiresAt
      );

      // Assert - 验证构造函数处理undefined可选参数
      expect(metadata.compressed).toBeUndefined();
      expect(metadata.tags).toBeUndefined();
      expect(metadata.expiresAt).toBeUndefined();
    });

    it('should automatically set storedAt timestamp in constructor', () => {
      // Arrange
      const beforeTime = new Date();

      // Act - 调用构造函数
      const metadata = new StorageMetadataDto(
        'timestamp-test',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'timestamp-provider',
        'timestamp-market',
        256,
        10
      );

      // Assert - 验证storedAt自动设置
      const afterTime = new Date();
      const storedAtTime = new Date(metadata.storedAt);

      expect(storedAtTime).toBeInstanceOf(Date);
      expect(storedAtTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(storedAtTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(metadata.storedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle different data types in constructor parameters', () => {
      // Arrange - 测试不同数据类型组合
      const testCases = [
        {
          dataSize: 0,
          processingTimeMs: 0,
          compressed: false,
          description: 'zero values'
        },
        {
          dataSize: 1024,
          processingTimeMs: 100,
          compressed: true,
          description: 'positive values with compression'
        },
        {
          dataSize: 1048576,
          processingTimeMs: 1000,
          compressed: false,
          description: 'large values without compression'
        }
      ];

      for (const testCase of testCases) {
        // Act
        const metadata = new StorageMetadataDto(
          `test-${testCase.description}`,
          StorageType.PERSISTENT,
          StorageClassification.STOCK_QUOTE,
          'test-provider',
          'test-market',
          testCase.dataSize,
          testCase.processingTimeMs,
          testCase.compressed
        );

        // Assert
        expect(metadata.dataSize).toBe(testCase.dataSize);
        expect(metadata.processingTimeMs).toBe(testCase.processingTimeMs);
        expect(metadata.compressed).toBe(testCase.compressed);
      }
    });

    it('should handle different storage types and classifications', () => {
      // Arrange - 测试不同存储类型和分类组合
      const combinations = [
        {
          storageType: StorageType.PERSISTENT,
          classification: StorageClassification.STOCK_QUOTE,
          description: 'persistent stock quote'
        }
      ];

      for (const combo of combinations) {
        // Act
        const metadata = new StorageMetadataDto(
          `test-${combo.description}`,
          combo.storageType,
          combo.classification,
          'combo-provider',
          'combo-market',
          512,
          30
        );

        // Assert
        expect(metadata.storageType).toBe(combo.storageType);
        expect(metadata.storageClassification).toBe(combo.classification);
      }
    });
  });

  describe('Property assignment coverage', () => {
    it('should properly assign all properties in constructor', () => {
      // Arrange
      const testParams = {
        key: 'assignment-test',
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'assignment-provider',
        market: 'assignment-market',
        dataSize: 2048,
        processingTimeMs: 150,
        compressed: true,
        tags: { env: 'test', version: '1.0' },
        expiresAt: '2024-06-30T12:00:00.000Z'
      };

      // Act - 验证每个属性的赋值执行
      const metadata = new StorageMetadataDto(
        testParams.key,
        testParams.storageType,
        testParams.storageClassification,
        testParams.provider,
        testParams.market,
        testParams.dataSize,
        testParams.processingTimeMs,
        testParams.compressed,
        testParams.tags,
        testParams.expiresAt
      );

      // Assert - 验证每个属性都被正确赋值
      expect(metadata.key).toBe(testParams.key);
      expect(metadata.storageType).toBe(testParams.storageType);
      expect(metadata.storageClassification).toBe(testParams.storageClassification);
      expect(metadata.provider).toBe(testParams.provider);
      expect(metadata.market).toBe(testParams.market);
      expect(metadata.dataSize).toBe(testParams.dataSize);
      expect(metadata.processingTimeMs).toBe(testParams.processingTimeMs);
      expect(metadata.compressed).toBe(testParams.compressed);
      expect(metadata.tags).toBe(testParams.tags);
      expect(metadata.expiresAt).toBe(testParams.expiresAt);
      expect(metadata.storedAt).toBeDefined();
    });

    it('should handle special characters and unicode in string properties', () => {
      // Arrange - 测试特殊字符和Unicode处理
      const specialChars = {
        key: 'key-with-特殊字符-and-emojis-🚀',
        provider: 'provider_with_underscores-and-数字123',
        market: 'market.with.dots:and:colons/and/slashes'
      };

      // Act
      const metadata = new StorageMetadataDto(
        specialChars.key,
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        specialChars.provider,
        specialChars.market,
        1024,
        50
      );

      // Assert - 验证特殊字符处理
      expect(metadata.key).toBe(specialChars.key);
      expect(metadata.provider).toBe(specialChars.provider);
      expect(metadata.market).toBe(specialChars.market);
    });

    it('should handle different tag object structures', () => {
      // Arrange - 测试不同标签对象结构
      const tagObjects = [
        {},
        { single: 'tag' },
        { tag1: 'value1', tag2: 'value2' },
        { 'tag-with-dashes': 'value', 'tag_with_underscores': 'value' },
        { 'unicode-tag': '中文值', 'emoji-tag': '🏷️' },
        { nested: 'not-supported-but-accepted', complex: 'object-as-string' }
      ];

      for (const tags of tagObjects) {
        // Act
        const metadata = new StorageMetadataDto(
          `tags-test-${Object.keys(tags).length}`,
          StorageType.PERSISTENT,
          StorageClassification.STOCK_QUOTE,
          'tags-provider',
          'tags-market',
          256,
          20,
          false,
          tags
        );

        // Assert
        expect(metadata.tags).toEqual(tags);
        expect(typeof metadata.tags).toBe('object');
      }
    });

    it('should handle edge case values for numeric properties', () => {
      // Arrange - 测试数值属性的边界值
      const edgeCases = [
        { dataSize: 0, processingTimeMs: 0, description: 'zero values' },
        { dataSize: 1, processingTimeMs: 1, description: 'minimum positive values' },
        { dataSize: Number.MAX_SAFE_INTEGER, processingTimeMs: Number.MAX_SAFE_INTEGER, description: 'maximum safe integer' }
      ];

      for (const edgeCase of edgeCases) {
        // Act
        const metadata = new StorageMetadataDto(
          `edge-case-${edgeCase.description}`,
          StorageType.PERSISTENT,
          StorageClassification.STOCK_QUOTE,
          'edge-provider',
          'edge-market',
          edgeCase.dataSize,
          edgeCase.processingTimeMs
        );

        // Assert
        expect(metadata.dataSize).toBe(edgeCase.dataSize);
        expect(metadata.processingTimeMs).toBe(edgeCase.processingTimeMs);
        expect(typeof metadata.dataSize).toBe('number');
        expect(typeof metadata.processingTimeMs).toBe('number');
      }
    });
  });

  describe('Object instance coverage', () => {
    it('should create multiple instances with independent properties', () => {
      // Arrange & Act - 创建多个实例
      const metadata1 = new StorageMetadataDto(
        'instance-1',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'provider-1',
        'market-1',
        512,
        25
      );

      const metadata2 = new StorageMetadataDto(
        'instance-2',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'provider-2',
        'market-2',
        1024,
        50
      );

      // Assert - 验证实例独立性
      expect(metadata1.key).not.toBe(metadata2.key);
      expect(metadata1.provider).not.toBe(metadata2.provider);
      expect(metadata1.market).not.toBe(metadata2.market);
      expect(metadata1.dataSize).not.toBe(metadata2.dataSize);
      expect(metadata1.processingTimeMs).not.toBe(metadata2.processingTimeMs);

      // 验证两个实例都有自己的storedAt时间戳
      expect(metadata1.storedAt).toBeDefined();
      expect(metadata2.storedAt).toBeDefined();
    });

    it('should verify prototype and instanceof relationships', () => {
      // Arrange & Act
      const metadata = new StorageMetadataDto(
        'prototype-test',
        StorageType.PERSISTENT,
        StorageClassification.STOCK_QUOTE,
        'prototype-provider',
        'prototype-market',
        128,
        15
      );

      // Assert - 验证原型链和实例关系
      expect(metadata).toBeInstanceOf(StorageMetadataDto);
      expect(metadata.constructor).toBe(StorageMetadataDto);
      expect(metadata.constructor.name).toBe('StorageMetadataDto');
    });
  });
});
