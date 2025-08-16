import { DataSourceType } from '../../../../../../../src/core/restapi/query/enums/data-source-type.enum';

describe('DataSourceType Enum', () => {
  describe('Enum values', () => {
    it('should have CACHE value', () => {
      expect(DataSourceType.CACHE).toBe('cache');
    });

    it('should have PERSISTENT value', () => {
      expect(DataSourceType.PERSISTENT).toBe('persistent');
    });

    it('should have REALTIME value', () => {
      expect(DataSourceType.REALTIME).toBe('realtime');
    });

    it('should have all expected enum values', () => {
      const expectedValues = ['cache', 'persistent', 'realtime'];
      const actualValues = Object.values(DataSourceType);

      expect(actualValues).toEqual(expect.arrayContaining(expectedValues));
      expect(actualValues).toHaveLength(expectedValues.length);
    });
  });

  describe('Enum keys', () => {
    it('should have correct enum keys', () => {
      const expectedKeys = ['CACHE', 'PERSISTENT', 'REALTIME'];
      const actualKeys = Object.keys(DataSourceType);

      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys).toHaveLength(expectedKeys.length);
    });

    it('should map keys to correct values', () => {
      expect(DataSourceType.CACHE).toBe('cache');
      expect(DataSourceType.PERSISTENT).toBe('persistent');
      expect(DataSourceType.REALTIME).toBe('realtime');
    });
  });

  describe('Enum properties', () => {
    it('should be a valid TypeScript enum', () => {
      expect(typeof DataSourceType).toBe('object');
      expect(DataSourceType).not.toBeNull();
    });

    it('should have string values', () => {
      Object.values(DataSourceType).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have uppercase keys', () => {
      Object.keys(DataSourceType).forEach(key => {
        expect(key).toBe(key.toUpperCase());
      });
    });

    it('should have lowercase values', () => {
      Object.values(DataSourceType).forEach(value => {
        expect(value).toBe(value.toLowerCase());
      });
    });
  });

  describe('Enum validation', () => {
    it('should validate against enum values', () => {
      const validValues = ['cache', 'persistent', 'realtime'];
      
      validValues.forEach(value => {
        const isValid = Object.values(DataSourceType).includes(value as DataSourceType);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid values', () => {
      const invalidValues = ['invalid', 'database', 'api', '', null, undefined];
      
      invalidValues.forEach(value => {
        const isValid = Object.values(DataSourceType).includes(value as any);
        expect(isValid).toBe(false);
      });
    });

    it('should support type checking', () => {
      const testValue: DataSourceType = DataSourceType.CACHE;
      expect(testValue).toBe('cache');

      const isValidType = (value: string): value is DataSourceType => {
        return Object.values(DataSourceType).includes(value as DataSourceType);
      };

      expect(isValidType('cache')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
    });
  });

  describe('Enum usage patterns', () => {
    it('should support switch statement usage', () => {
      const getDescription = (type: DataSourceType): string => {
        switch (type) {
          case DataSourceType.CACHE:
            return 'Data from cache (memory or Redis)';
          case DataSourceType.PERSISTENT:
            return 'Data from persistent storage (database)';
          case DataSourceType.REALTIME:
            return 'Data from real-time external API calls';
          default:
            return 'Unknown data source type';
        }
      };

      expect(getDescription(DataSourceType.CACHE)).toBe('Data from cache (memory or Redis)');
      expect(getDescription(DataSourceType.PERSISTENT)).toBe('Data from persistent storage (database)');
      expect(getDescription(DataSourceType.REALTIME)).toBe('Data from real-time external API calls');
    });

    it('should support array operations', () => {
      const allTypes = Object.values(DataSourceType);
      
      expect(allTypes.includes(DataSourceType.CACHE)).toBe(true);
      expect(allTypes.includes(DataSourceType.PERSISTENT)).toBe(true);
      expect(allTypes.includes(DataSourceType.REALTIME)).toBe(true);

      const filteredTypes = allTypes.filter(type => type.includes('e'));
      expect(filteredTypes).toContain('cache');
      expect(filteredTypes).toContain('persistent');
      expect(filteredTypes).toContain('realtime');
    });

    it('should support iteration', () => {
      const typeCount = Object.keys(DataSourceType).length;
      expect(typeCount).toBe(3);

      const processedTypes: string[] = [];
      for (const key in DataSourceType) {
        if (DataSourceType.hasOwnProperty(key)) {
          processedTypes.push(DataSourceType[key as keyof typeof DataSourceType]);
        }
      }

      expect(processedTypes).toHaveLength(3);
      expect(processedTypes).toContain('cache');
      expect(processedTypes).toContain('persistent');
      expect(processedTypes).toContain('realtime');
    });
  });

  describe('Enum immutability', () => {
    it('should maintain enum values after assignment attempts', () => {
      const originalCacheValue = DataSourceType.CACHE;
      
      // Attempt to modify enum (should not succeed in strict mode)
      try {
        (DataSourceType as any).CACHE = 'modified';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Expected in strict mode
      }

      expect(DataSourceType.CACHE).toBe(originalCacheValue);
    });

    it('should maintain enum structure', () => {
      const keys = Object.keys(DataSourceType);
      const values = Object.values(DataSourceType);

      expect(keys).toHaveLength(3);
      expect(values).toHaveLength(3);

      // Verify the mapping is consistent
      expect(DataSourceType[keys[0] as keyof typeof DataSourceType]).toBe(values[0]);
      expect(DataSourceType[keys[1] as keyof typeof DataSourceType]).toBe(values[1]);
      expect(DataSourceType[keys[2] as keyof typeof DataSourceType]).toBe(values[2]);
    });
  });

  describe('Business logic validation', () => {
    it('should represent different data source priorities', () => {
      // Cache should be fastest
      expect(DataSourceType.CACHE).toBe('cache');
      
      // Persistent should be for long-term storage
      expect(DataSourceType.PERSISTENT).toBe('persistent');
      
      // Realtime should be for fresh data
      expect(DataSourceType.REALTIME).toBe('realtime');
    });

    it('should support data source selection logic', () => {
      const selectDataSource = (preferCache: boolean, needRealtime: boolean): DataSourceType => {
        if (needRealtime) return DataSourceType.REALTIME;
        if (preferCache) return DataSourceType.CACHE;
        return DataSourceType.PERSISTENT;
      };

      expect(selectDataSource(true, false)).toBe(DataSourceType.CACHE);
      expect(selectDataSource(false, true)).toBe(DataSourceType.REALTIME);
      expect(selectDataSource(false, false)).toBe(DataSourceType.PERSISTENT);
    });
  });
});
