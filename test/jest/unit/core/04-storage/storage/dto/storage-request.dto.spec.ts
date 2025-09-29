import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

import { StoreDataDto, RetrieveDataDto, StorageOptionsDto } from '@core/04-storage/storage/dto/storage-request.dto';
import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

describe('Storage Request DTOs', () => {
  describe('StoreDataDto', () => {
    it('should validate successfully with valid data', async () => {
      // Arrange
      const validData = {
        key: 'test-key',
        data: { test: 'data' },
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'test-provider',
        market: 'test-market',
        options: {
          compress: false,
          tags: { tag1: 'value1' },
          persistentTtlSeconds: 3600,
        },
      };

      // Act
      const dto = plainToClass(StoreDataDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.key).toBe(validData.key);
      expect(dto.data).toEqual(validData.data);
      expect(dto.storageType).toBe(validData.storageType);
      expect(dto.storageClassification).toBe(validData.storageClassification);
      expect(dto.provider).toBe(validData.provider);
      expect(dto.market).toBe(validData.market);
      expect(dto.options).toBeDefined();
    });

    it('should validate successfully without optional fields', async () => {
      // Arrange
      const validData = {
        key: 'test-key',
        data: { test: 'data' },
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'test-provider',
        market: 'test-market',
      };

      // Act
      const dto = plainToClass(StoreDataDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.options).toBeUndefined();
    });

    it('should fail validation with missing required fields', async () => {
      // Arrange
      const invalidData = {
        key: 'test-key',
        // Missing other required fields
      };

      // Act
      const dto = plainToClass(StoreDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('data'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('storageType'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('storageClassification'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('provider'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('market'))).toBe(true);
    });

    it('should fail validation with invalid enum values', async () => {
      // Arrange
      const invalidData = {
        key: 'test-key',
        data: { test: 'data' },
        storageType: 'INVALID_TYPE',
        storageClassification: 'INVALID_CLASSIFICATION',
        provider: 'test-provider',
        market: 'test-market',
      };

      // Act
      const dto = plainToClass(StoreDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('storageType'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('storageClassification'))).toBe(true);
    });

    it('should fail validation with non-string key', async () => {
      // Arrange
      const invalidData = {
        key: 12345, // Should be string
        data: { test: 'data' },
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'test-provider',
        market: 'test-market',
      };

      // Act
      const dto = plainToClass(StoreDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const keyError = errors.find(error => error.property === 'key');
      expect(keyError).toBeDefined();
    });

    it('should fail validation with non-object data', async () => {
      // Arrange
      const invalidData = {
        key: 'test-key',
        data: 'not-an-object', // Should be object
        storageType: StorageType.PERSISTENT,
        storageClassification: StorageClassification.STOCK_QUOTE,
        provider: 'test-provider',
        market: 'test-market',
      };

      // Act
      const dto = plainToClass(StoreDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const dataError = errors.find(error => error.property === 'data');
      expect(dataError).toBeDefined();
    });
  });

  describe('RetrieveDataDto', () => {
    it('should validate successfully with valid data', async () => {
      // Arrange
      const validData = {
        key: 'test-key',
        preferredType: StorageType.PERSISTENT,
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.key).toBe(validData.key);
      expect(dto.preferredType).toBe(validData.preferredType);
    });

    it('should fail validation with missing required fields', async () => {
      // Arrange
      const invalidData = {
        // Missing key
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('key'))).toBe(true);
    });

    it('should fail validation with invalid storage type', async () => {
      // Arrange
      const invalidData = {
        key: 'test-key',
        preferredType: 'INVALID_TYPE',
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('preferredType'))).toBe(true);
    });

    it('should fail validation with empty key', async () => {
      // Arrange
      const invalidData = {
        key: '', // Empty string
        preferredType: StorageType.PERSISTENT,
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const keyError = errors.find(error => error.property === 'key');
      expect(keyError).toBeDefined();
    });
  });

  describe('StorageOptionsDto', () => {
    it('should validate successfully with valid options', async () => {
      // Arrange
      const validData = {
        compress: true,
        tags: { tag1: 'value1', tag2: 'value2' },
        persistentTtlSeconds: 3600,
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.compress).toBe(validData.compress);
      expect(dto.tags).toEqual(validData.tags);
      expect(dto.persistentTtlSeconds).toBe(validData.persistentTtlSeconds);
    });

    it('should validate successfully with partial options', async () => {
      // Arrange
      const validData = {
        compress: false,
        // Only compress field provided
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.compress).toBe(false);
      expect(dto.tags).toBeUndefined();
      expect(dto.persistentTtlSeconds).toBeUndefined();
    });

    it('should validate successfully with empty object', async () => {
      // Arrange
      const validData = {};

      // Act
      const dto = plainToClass(StorageOptionsDto, validData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid compress type', async () => {
      // Arrange
      const invalidData = {
        compress: 'invalid', // Should be boolean
        tags: { tag1: 'value1' },
        persistentTtlSeconds: 3600,
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const compressError = errors.find(error => error.property === 'compress');
      expect(compressError).toBeDefined();
    });

    it('should fail validation with invalid tags type', async () => {
      // Arrange
      const invalidData = {
        compress: true,
        tags: 'not-an-object', // Should be object
        persistentTtlSeconds: 3600,
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const tagsError = errors.find(error => error.property === 'tags');
      expect(tagsError).toBeDefined();
    });

    it('should fail validation with negative TTL', async () => {
      // Arrange
      const invalidData = {
        compress: true,
        tags: { tag1: 'value1' },
        persistentTtlSeconds: -100, // Should be positive
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const ttlError = errors.find(error => error.property === 'persistentTtlSeconds');
      expect(ttlError).toBeDefined();
    });

    it('should fail validation with non-string tags', async () => {
      // Arrange
      const invalidData = {
        compress: true,
        tags: 123, // Should be an object
        persistentTtlSeconds: 3600,
      };

      // Act
      const dto = plainToClass(StorageOptionsDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const tagsError = errors.find(error => error.property === 'tags');
      expect(tagsError).toBeDefined();
    });
  });

  // ==================== 构造函数和实例化函数覆盖测试 ====================
  describe('Constructor and Instantiation Function Coverage', () => {
    describe('StoreDataDto constructor coverage', () => {
      it('should create StoreDataDto instance and assign all properties', () => {
        // Arrange
        const dto = new StoreDataDto();

        // Act - 设置所有属性以覆盖属性赋值
        dto.key = 'constructor-test-key';
        dto.data = { constructorTest: true, value: 42 };
        dto.storageType = StorageType.PERSISTENT;
        dto.storageClassification = StorageClassification.STOCK_QUOTE;
        dto.provider = 'constructor-provider';
        dto.market = 'constructor-market';
        dto.options = new StorageOptionsDto();

        // Assert - 验证所有属性赋值
        expect(dto).toBeInstanceOf(StoreDataDto);
        expect(dto.key).toBe('constructor-test-key');
        expect(dto.data.constructorTest).toBe(true);
        expect(dto.storageType).toBe(StorageType.PERSISTENT);
        expect(dto.storageClassification).toBe(StorageClassification.STOCK_QUOTE);
        expect(dto.provider).toBe('constructor-provider');
        expect(dto.market).toBe('constructor-market');
        expect(dto.options).toBeInstanceOf(StorageOptionsDto);
      });

      it('should handle different data types in StoreDataDto', () => {
        // Arrange - 测试不同数据类型的处理
        const testCases = [
          { data: null, description: 'null data' },
          { data: undefined, description: 'undefined data' },
          { data: 'string data', description: 'string data' },
          { data: 12345, description: 'number data' },
          { data: true, description: 'boolean data' },
          { data: [], description: 'array data' },
          { data: { nested: { deep: 'object' } }, description: 'nested object' }
        ];

        for (const testCase of testCases) {
          // Act
          const dto = new StoreDataDto();
          dto.key = `test-${testCase.description}`;
          dto.data = testCase.data;
          dto.storageType = StorageType.PERSISTENT;
          dto.storageClassification = StorageClassification.STOCK_QUOTE;
          dto.provider = 'test-provider';
          dto.market = 'test-market';

          // Assert
          expect(dto.data).toEqual(testCase.data);
          expect(dto.key).toBe(`test-${testCase.description}`);
        }
      });
    });

    describe('RetrieveDataDto constructor coverage', () => {
      it('should create RetrieveDataDto instance and assign properties', () => {
        // Arrange & Act
        const dto = new RetrieveDataDto();
        dto.key = 'retrieve-constructor-key';
        dto.preferredType = StorageType.PERSISTENT;

        // Assert
        expect(dto).toBeInstanceOf(RetrieveDataDto);
        expect(dto.key).toBe('retrieve-constructor-key');
        expect(dto.preferredType).toBe(StorageType.PERSISTENT);
      });

      it('should handle different storage types in RetrieveDataDto', () => {
        // Arrange - 测试不同存储类型
        const storageTypes = [StorageType.PERSISTENT];

        for (const storageType of storageTypes) {
          // Act
          const dto = new RetrieveDataDto();
          dto.key = `test-${storageType}`;
          dto.preferredType = storageType;

          // Assert
          expect(dto.preferredType).toBe(storageType);
          expect(dto.key).toBe(`test-${storageType}`);
        }
      });

      it('should handle special characters in key for RetrieveDataDto', () => {
        // Arrange - 测试特殊字符处理
        const specialKeys = [
          'key-with-dashes',
          'key_with_underscores',
          'key.with.dots',
          'key:with:colons',
          'key/with/slashes',
          'key with spaces',
          'key-with-unicode-字符',
          'key-with-emoji-🚀'
        ];

        for (const specialKey of specialKeys) {
          // Act
          const dto = new RetrieveDataDto();
          dto.key = specialKey;
          dto.preferredType = StorageType.PERSISTENT;

          // Assert
          expect(dto.key).toBe(specialKey);
          expect(dto.preferredType).toBe(StorageType.PERSISTENT);
        }
      });
    });

    describe('StorageOptionsDto constructor coverage', () => {
      it('should create StorageOptionsDto instance and assign all properties', () => {
        // Arrange & Act
        const dto = new StorageOptionsDto();
        dto.compress = true;
        dto.tags = { tag1: 'value1', tag2: 'value2', tag3: 'value3' };
        dto.persistentTtlSeconds = 7200;

        // Assert
        expect(dto).toBeInstanceOf(StorageOptionsDto);
        expect(dto.compress).toBe(true);
        expect(dto.tags).toEqual({ tag1: 'value1', tag2: 'value2', tag3: 'value3' });
        expect(dto.persistentTtlSeconds).toBe(7200);
      });

      it('should handle different boolean values for compress', () => {
        // Arrange - 测试不同布尔值
        const booleanValues = [true, false];

        for (const boolValue of booleanValues) {
          // Act
          const dto = new StorageOptionsDto();
          dto.compress = boolValue;

          // Assert
          expect(dto.compress).toBe(boolValue);
          expect(typeof dto.compress).toBe('boolean');
        }
      });

      it('should handle different tag objects', () => {
        // Arrange - 测试不同标签对象
        const tagObjects = [
          {},
          { singleTag: 'single-value' },
          { tag1: 'value1', tag2: 'value2' },
          { tag1: 'value1', tag2: 'value2', tag3: 'value3', tag4: 'value4', tag5: 'value5' },
          { 'tag-with-dashes': 'dash-value', 'tag_with_underscores': 'underscore-value', 'tagWithCamelCase': 'camel-value' },
          { 'unicode-tag-中文': 'unicode-value', 'emoji-tag-🏷️': 'emoji-value' }
        ];

        for (const tagObj of tagObjects) {
          // Act
          const dto = new StorageOptionsDto();
          dto.tags = tagObj;

          // Assert
          expect(dto.tags).toEqual(tagObj);
          expect(typeof dto.tags).toBe('object');
          expect(Object.keys(dto.tags).length).toBe(Object.keys(tagObj).length);
        }
      });

      it('should handle different TTL values', () => {
        // Arrange - 测试不同TTL值
        const ttlValues = [
          0,
          1,
          60,
          300,
          1800,
          3600,
          7200,
          86400,
          604800,
          2592000
        ];

        for (const ttl of ttlValues) {
          // Act
          const dto = new StorageOptionsDto();
          dto.persistentTtlSeconds = ttl;

          // Assert
          expect(dto.persistentTtlSeconds).toBe(ttl);
          expect(typeof dto.persistentTtlSeconds).toBe('number');
        }
      });

      it('should handle undefined optional properties', () => {
        // Arrange & Act
        const dto = new StorageOptionsDto();

        // 不设置任何属性，测试undefined处理

        // Assert
        expect(dto.compress).toBeUndefined();
        expect(dto.tags).toBeUndefined();
        expect(dto.persistentTtlSeconds).toBeUndefined();
      });

      it('should handle mixed property combinations', () => {
        // Arrange - 测试不同属性组合
        const combinations = [
          { compress: true },
          { tags: { tagA: 'valueA' } },
          { persistentTtlSeconds: 3600 },
          { compress: false, tags: { tagB: 'valueB', tagC: 'valueC' } },
          { compress: true, persistentTtlSeconds: 1800 },
          { tags: { tagD: 'valueD' }, persistentTtlSeconds: 900 },
          { compress: false, tags: { tagE: 'valueE' }, persistentTtlSeconds: 7200 }
        ];

        for (const combination of combinations) {
          // Act
          const dto = new StorageOptionsDto();
          Object.assign(dto, combination);

          // Assert
          Object.keys(combination).forEach(key => {
            expect(dto[key]).toEqual(combination[key]);
          });
        }
      });
    });
  });

  // ==================== 对象属性访问覆盖测试 ====================
  describe('Object Property Access Coverage', () => {
    it('should cover all property getters and setters', () => {
      // Arrange
      const storeDto = new StoreDataDto();
      const retrieveDto = new RetrieveDataDto();
      const optionsDto = new StorageOptionsDto();

      // Act & Assert - StoreDataDto properties
      storeDto.key = 'property-access-test';
      expect(storeDto.key).toBe('property-access-test');

      storeDto.data = { accessTest: true };
      expect(storeDto.data.accessTest).toBe(true);

      storeDto.storageType = StorageType.PERSISTENT;
      expect(storeDto.storageType).toBe(StorageType.PERSISTENT);

      storeDto.storageClassification = StorageClassification.STOCK_QUOTE;
      expect(storeDto.storageClassification).toBe(StorageClassification.STOCK_QUOTE);

      storeDto.provider = 'access-provider';
      expect(storeDto.provider).toBe('access-provider');

      storeDto.market = 'access-market';
      expect(storeDto.market).toBe('access-market');

      storeDto.options = optionsDto;
      expect(storeDto.options).toBe(optionsDto);

      // Act & Assert - RetrieveDataDto properties
      retrieveDto.key = 'retrieve-access-test';
      expect(retrieveDto.key).toBe('retrieve-access-test');

      retrieveDto.preferredType = StorageType.PERSISTENT;
      expect(retrieveDto.preferredType).toBe(StorageType.PERSISTENT);

      // Act & Assert - StorageOptionsDto properties
      optionsDto.compress = true;
      expect(optionsDto.compress).toBe(true);

      optionsDto.tags = { accessTag: 'access-value' };
      expect(optionsDto.tags).toEqual({ accessTag: 'access-value' });

      optionsDto.persistentTtlSeconds = 1200;
      expect(optionsDto.persistentTtlSeconds).toBe(1200);
    });
  });
});