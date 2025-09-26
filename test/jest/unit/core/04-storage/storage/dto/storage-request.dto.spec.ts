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
          tags: ['tag1', 'tag2'],
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
        key: 'test-key',
        // Missing storageType
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('storageType'))).toBe(true);
    });

    it('should fail validation with invalid storage type', async () => {
      // Arrange
      const invalidData = {
        key: 'test-key',
        storageType: 'INVALID_TYPE',
      };

      // Act
      const dto = plainToClass(RetrieveDataDto, invalidData);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const errorMessages = errors.flatMap(error => Object.values(error.constraints || {}));
      expect(errorMessages.some(msg => msg.includes('storageType'))).toBe(true);
    });

    it('should fail validation with empty key', async () => {
      // Arrange
      const invalidData = {
        key: '', // Empty string
        storageType: StorageType.PERSISTENT,
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
        tags: ['tag1', 'tag2'],
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
        tags: ['tag1'],
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
        tags: 'not-an-array', // Should be array
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
        tags: ['tag1'],
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
        tags: [123, 'valid-tag'], // Should all be strings
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

    it('should fail validation with empty tag strings', async () => {
      // Arrange
      const invalidData = {
        compress: true,
        tags: ['', 'valid-tag'], // Empty strings not allowed
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
});