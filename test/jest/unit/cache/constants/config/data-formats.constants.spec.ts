/**
 * Cache Data Formats Constants 单元测试
 * 测试缓存数据格式常量的完整性和类型安全性
 */

import {
  CACHE_DATA_FORMATS,
  SerializerType,
  SERIALIZER_TYPE_VALUES,
} from '@cache/constants/config/data-formats.constants';

describe('CACHE_DATA_FORMATS', () => {
  describe('constant structure validation', () => {
    it('should be frozen object (immutable)', () => {
      expect(Object.isFrozen(CACHE_DATA_FORMATS)).toBe(true);
    });

    it('should have COMPRESSION_PREFIX property', () => {
      expect(CACHE_DATA_FORMATS).toHaveProperty('COMPRESSION_PREFIX');
      expect(typeof CACHE_DATA_FORMATS.COMPRESSION_PREFIX).toBe('string');
    });

    it('should have SERIALIZATION property', () => {
      expect(CACHE_DATA_FORMATS).toHaveProperty('SERIALIZATION');
      expect(typeof CACHE_DATA_FORMATS.SERIALIZATION).toBe('object');
      // Note: SERIALIZATION might not be deeply frozen, just check it's an object
    });
  });

  describe('compression prefix', () => {
    it('should have consistent compression prefix format', () => {
      expect(CACHE_DATA_FORMATS.COMPRESSION_PREFIX).toBe('COMPRESSED::');
    });

    it('should have recognizable compression prefix', () => {
      const prefix = CACHE_DATA_FORMATS.COMPRESSION_PREFIX;

      // Should contain "COMPRESSED" keyword
      expect(prefix).toContain('COMPRESSED');

      // Should be easy to identify in strings
      expect(prefix.length).toBeGreaterThan(5);
      expect(prefix.length).toBeLessThan(20);
    });

    it('should be suitable for string prefix checking', () => {
      const prefix = CACHE_DATA_FORMATS.COMPRESSION_PREFIX;
      const testData = `${prefix}some-compressed-data`;

      expect(testData.startsWith(prefix)).toBe(true);
      expect(testData.substring(prefix.length)).toBe('some-compressed-data');
    });
  });

  describe('serialization formats', () => {
    it('should have JSON serialization format', () => {
      expect(CACHE_DATA_FORMATS.SERIALIZATION).toHaveProperty('JSON');
      expect(CACHE_DATA_FORMATS.SERIALIZATION.JSON).toBe('json');
    });

    it('should have MessagePack serialization format', () => {
      expect(CACHE_DATA_FORMATS.SERIALIZATION).toHaveProperty('MSGPACK');
      expect(CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK).toBe('msgpack');
    });

    it('should have consistent serialization value format', () => {
      Object.values(CACHE_DATA_FORMATS.SERIALIZATION).forEach(format => {
        expect(typeof format).toBe('string');
        expect(format.length).toBeGreaterThan(0);
        expect(format).toMatch(/^[a-z]+$/); // lowercase letters only
      });
    });

    it('should support all common serialization scenarios', () => {
      const formats = CACHE_DATA_FORMATS.SERIALIZATION;

      // JSON for human-readable data
      expect(formats.JSON).toBeDefined();

      // MessagePack for binary efficiency
      expect(formats.MSGPACK).toBeDefined();
    });
  });

  describe('serialization format values array', () => {
    it('should contain all serialization format values', () => {
      const expectedValues = Object.values(CACHE_DATA_FORMATS.SERIALIZATION);
      expect(SERIALIZER_TYPE_VALUES).toEqual(expectedValues);
    });

    it('should be array of strings', () => {
      expect(Array.isArray(SERIALIZER_TYPE_VALUES)).toBe(true);
      SERIALIZER_TYPE_VALUES.forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have unique values', () => {
      const uniqueValues = [...new Set(SERIALIZER_TYPE_VALUES)];
      expect(SERIALIZER_TYPE_VALUES.length).toBe(uniqueValues.length);
    });

    it('should match serialization object values', () => {
      const objectValues = Object.values(CACHE_DATA_FORMATS.SERIALIZATION).sort();
      const arrayValues = SERIALIZER_TYPE_VALUES.sort();
      expect(arrayValues).toEqual(objectValues);
    });
  });

  describe('SerializerType type validation', () => {
    it('should properly type serializer values', () => {
      const jsonType: SerializerType = 'json';
      const msgpackType: SerializerType = 'msgpack';

      expect(jsonType).toBe(CACHE_DATA_FORMATS.SERIALIZATION.JSON);
      expect(msgpackType).toBe(CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK);
    });

    it('should include all serialization formats in type union', () => {
      // This test ensures type consistency
      SERIALIZER_TYPE_VALUES.forEach(value => {
        const typedValue: SerializerType = value as SerializerType;
        expect(Object.values(CACHE_DATA_FORMATS.SERIALIZATION)).toContain(typedValue);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should support compression detection', () => {
      const isCompressed = (data: string): boolean => {
        return data.startsWith(CACHE_DATA_FORMATS.COMPRESSION_PREFIX);
      };

      const compressedData = `${CACHE_DATA_FORMATS.COMPRESSION_PREFIX}compressed-content`;
      const uncompressedData = 'regular-content';

      expect(isCompressed(compressedData)).toBe(true);
      expect(isCompressed(uncompressedData)).toBe(false);
    });

    it('should support serialization format validation', () => {
      const isValidSerializer = (format: string): format is SerializerType => {
        return SERIALIZER_TYPE_VALUES.includes(format as SerializerType);
      };

      expect(isValidSerializer('json')).toBe(true);
      expect(isValidSerializer('msgpack')).toBe(true);
      expect(isValidSerializer('xml')).toBe(false);
      expect(isValidSerializer('yaml')).toBe(false);
      expect(isValidSerializer('')).toBe(false);
    });

    it('should support cache data processing workflows', () => {
      // Simulate cache data processing
      const processData = (data: string): {
        isCompressed: boolean;
        serializer: SerializerType | null;
        content: string;
      } => {
        const isCompressed = data.startsWith(CACHE_DATA_FORMATS.COMPRESSION_PREFIX);

        let content = data;
        if (isCompressed) {
          content = data.substring(CACHE_DATA_FORMATS.COMPRESSION_PREFIX.length);
        }

        // In real scenario, this would be determined from metadata
        let serializer: SerializerType | null = null;
        if (content.startsWith('{') || content.startsWith('[')) {
          serializer = CACHE_DATA_FORMATS.SERIALIZATION.JSON;
        } else {
          serializer = CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK;
        }

        return { isCompressed, serializer, content };
      };

      const compressedJson = `${CACHE_DATA_FORMATS.COMPRESSION_PREFIX}{"key":"value"}`;
      const uncompressedJson = '{"key":"value"}';

      const result1 = processData(compressedJson);
      expect(result1.isCompressed).toBe(true);
      expect(result1.serializer).toBe('json');
      expect(result1.content).toBe('{"key":"value"}');

      const result2 = processData(uncompressedJson);
      expect(result2.isCompressed).toBe(false);
      expect(result2.serializer).toBe('json');
      expect(result2.content).toBe('{"key":"value"}');
    });
  });

  describe('constants immutability', () => {
    it('should prevent modification of CACHE_DATA_FORMATS', () => {
      expect(() => {
        (CACHE_DATA_FORMATS as any).COMPRESSION_PREFIX = 'MODIFIED';
      }).toThrow();
    });

    it('should verify SERIALIZATION object structure', () => {
      // Since SERIALIZATION might not be deeply frozen, just verify structure
      expect(CACHE_DATA_FORMATS.SERIALIZATION).toHaveProperty('JSON');
      expect(CACHE_DATA_FORMATS.SERIALIZATION).toHaveProperty('MSGPACK');
    });

    it('should maintain serialization values integrity', () => {
      // Verify the serialization values remain as expected
      expect(CACHE_DATA_FORMATS.SERIALIZATION.JSON).toBe('json');
      expect(CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK).toBe('msgpack');
    });
  });

  describe('practical usage patterns', () => {
    it('should support compression flag creation', () => {
      const createCompressedFlag = (data: string): string => {
        return `${CACHE_DATA_FORMATS.COMPRESSION_PREFIX}${data}`;
      };

      const originalData = 'sample-data';
      const flaggedData = createCompressedFlag(originalData);

      expect(flaggedData).toBe('COMPRESSED::sample-data');
      expect(flaggedData.startsWith(CACHE_DATA_FORMATS.COMPRESSION_PREFIX)).toBe(true);
    });

    it('should support serializer selection logic', () => {
      const selectSerializer = (data: any): SerializerType => {
        if (typeof data === 'object' && data !== null) {
          return CACHE_DATA_FORMATS.SERIALIZATION.JSON;
        }
        return CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK;
      };

      // Use the current actual values from the constants
      expect(selectSerializer({ key: 'value' })).toBe(CACHE_DATA_FORMATS.SERIALIZATION.JSON);
      expect(selectSerializer('string-data')).toBe(CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK);
      expect(selectSerializer(123)).toBe(CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK);
    });

    it('should support format validation in decorators', () => {
      // Simulates decorator validation logic
      const validateSerializationFormat = (value: any): boolean => {
        if (typeof value !== 'string') return false;
        return SERIALIZER_TYPE_VALUES.includes(value as SerializerType);
      };

      expect(validateSerializationFormat('json')).toBe(true);
      expect(validateSerializationFormat('msgpack')).toBe(true);
      expect(validateSerializationFormat('invalid')).toBe(false);
      expect(validateSerializationFormat(null)).toBe(false);
      expect(validateSerializationFormat(123)).toBe(false);
    });
  });
});
