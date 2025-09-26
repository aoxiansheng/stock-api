import { StorageType } from '@core/04-storage/storage/enums/storage-type.enum';

describe('StorageType Enum', () => {
  describe('Enum Values', () => {
    it('should have PERSISTENT value', () => {
      expect(StorageType.PERSISTENT).toBeDefined();
      expect(StorageType.PERSISTENT).toBe('persistent');
    });

    it('should be a string enum with correct values', () => {
      expect(typeof StorageType.PERSISTENT).toBe('string');
      expect(StorageType.PERSISTENT).toBe('persistent');
    });
  });

  describe('Enum Keys', () => {
    it('should have correct enum keys', () => {
      const keys = Object.keys(StorageType);
      expect(keys).toContain('PERSISTENT');
      expect(keys).toHaveLength(1);
    });

    it('should have consistent key-value mapping', () => {
      expect(StorageType['PERSISTENT']).toBe('persistent');
    });
  });

  describe('Type Safety', () => {
    it('should allow valid enum values in type checking', () => {
      const validType: StorageType = StorageType.PERSISTENT;
      expect(validType).toBe('persistent');
    });

    it('should work with switch statements', () => {
      const testValue = StorageType.PERSISTENT;
      let result: string;

      switch (testValue) {
        case StorageType.PERSISTENT:
          result = 'persistent storage';
          break;
        default:
          result = 'unknown';
      }

      expect(result).toBe('persistent storage');
    });

    it('should work in function parameters', () => {
      function processStorageType(type: StorageType): string {
        return `Processing ${type} storage`;
      }

      const result = processStorageType(StorageType.PERSISTENT);
      expect(result).toBe('Processing persistent storage');
    });
  });

  describe('Enum Consistency', () => {
    it('should have consistent enum structure', () => {
      expect(StorageType).toBeDefined();
      expect(typeof StorageType).toBe('object');
    });

    it('should not have additional unexpected properties', () => {
      const expectedKeys = ['PERSISTENT'];
      const actualKeys = Object.keys(StorageType);

      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });

    it('should maintain immutability', () => {
      const originalValue = StorageType.PERSISTENT;

      expect(() => {
        (StorageType as any).PERSISTENT = 'modified';
      }).not.toThrow();

      // Even if assignment doesn't throw, value should remain the same in strict mode
      expect(StorageType.PERSISTENT).toBe(originalValue);
    });
  });

  describe('Runtime Behavior', () => {
    it('should work with Object.values()', () => {
      const values = Object.values(StorageType);
      expect(values).toContain('persistent');
      expect(values).toHaveLength(1);
    });

    it('should work with Object.entries()', () => {
      const entries = Object.entries(StorageType);
      expect(entries).toContainEqual(['PERSISTENT', 'persistent']);
      expect(entries).toHaveLength(1);
    });

    it('should work with includes check', () => {
      const validTypes = Object.values(StorageType);
      expect(validTypes.includes(StorageType.PERSISTENT)).toBe(true);
      expect(validTypes.includes('cache' as any)).toBe(false);
    });

    it('should work in array filtering', () => {
      const testArray = ['persistent', 'cache', 'temporary'];
      const validStorageTypes = testArray.filter(type =>
        Object.values(StorageType).includes(type as StorageType)
      );

      expect(validStorageTypes).toEqual(['persistent']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle comparison with string literals', () => {
      expect(StorageType.PERSISTENT === 'persistent').toBe(true);
      expect(StorageType.PERSISTENT !== ('cache' as any)).toBe(true);
    });

    it('should work with JSON serialization', () => {
      const data = { storageType: StorageType.PERSISTENT };
      const jsonString = JSON.stringify(data);
      const parsed = JSON.parse(jsonString);

      expect(parsed.storageType).toBe('persistent');
    });

    it('should work with template literals', () => {
      const message = `Storage type: ${StorageType.PERSISTENT}`;
      expect(message).toBe('Storage type: persistent');
    });

    it('should handle reverse lookup', () => {
      // Since it's a string enum, reverse lookup should not work
      expect((StorageType as any)['persistent']).toBeUndefined();
    });
  });

  describe('Validation Helpers', () => {
    it('should validate enum membership', () => {
      function isValidStorageType(value: any): value is StorageType {
        return Object.values(StorageType).includes(value);
      }

      expect(isValidStorageType('persistent')).toBe(true);
      expect(isValidStorageType('cache')).toBe(false);
      expect(isValidStorageType(null)).toBe(false);
      expect(isValidStorageType(undefined)).toBe(false);
      expect(isValidStorageType('')).toBe(false);
    });

    it('should work with validation functions', () => {
      function getStorageTypeLabel(type: StorageType): string {
        switch (type) {
          case StorageType.PERSISTENT:
            return 'Persistent Storage';
          default:
            return 'Unknown Storage Type';
        }
      }

      expect(getStorageTypeLabel(StorageType.PERSISTENT)).toBe('Persistent Storage');
    });

    it('should work in configuration objects', () => {
      const config = {
        defaultStorageType: StorageType.PERSISTENT,
        supportedTypes: [StorageType.PERSISTENT],
      };

      expect(config.defaultStorageType).toBe('persistent');
      expect(config.supportedTypes).toContain('persistent');
    });
  });
});
