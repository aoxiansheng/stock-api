import { RedisValueUtils } from '@core/05-caching/module/basic-cache/utils/redis-value.utils';
import { CacheMetadata, RedisEnvelope } from '@core/05-caching/module/basic-cache/interfaces/cache-metadata.interface';
import { CACHE_CONFIG } from '@core/05-caching/module/basic-cache/constants/cache-config.constants';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('RedisValueUtils', () => {
  describe('serialize', () => {
    it('should serialize data with default parameters', () => {
      const data = { test: 'value' };
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toEqual(data);
      expect(parsed.compressed).toBe(false);
      expect(parsed.storedAt).toBeGreaterThan(0);
      expect(parsed.metadata).toBeUndefined();
    });

    it('should serialize data with compression flag', () => {
      const data = { test: 'value' };
      const result = RedisValueUtils.serialize(data, true);

      const parsed = JSON.parse(result);
      expect(parsed.data).toEqual(data);
      expect(parsed.compressed).toBe(true);
      expect(parsed.storedAt).toBeGreaterThan(0);
    });

    it('should serialize data with metadata', () => {
      const data = { test: 'value' };
      const metadata: Partial<CacheMetadata> = {
        originalSize: 1024,
        compressedSize: 512
      };
      const result = RedisValueUtils.serialize(data, true, metadata);

      const parsed = JSON.parse(result);
      expect(parsed.data).toEqual(data);
      expect(parsed.compressed).toBe(true);
      expect(parsed.metadata).toEqual(metadata);
    });

    it('should serialize string data', () => {
      const data = 'simple string';
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toBe(data);
      expect(parsed.compressed).toBe(false);
    });

    it('should serialize number data', () => {
      const data = 12345;
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toBe(data);
      expect(parsed.compressed).toBe(false);
    });

    it('should serialize array data', () => {
      const data = [1, 2, 3, 'test'];
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toEqual(data);
      expect(parsed.compressed).toBe(false);
    });

    it('should serialize null data', () => {
      const data = null;
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toBeNull();
      expect(parsed.compressed).toBe(false);
    });

    it('should serialize complex nested object', () => {
      const data = {
        user: {
          id: 123,
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        preferences: ['pref1', 'pref2']
      };
      const result = RedisValueUtils.serialize(data);

      const parsed = JSON.parse(result);
      expect(parsed.data).toEqual(data);
    });

    it('should throw exception for circular reference', () => {
      const data: any = { name: 'test' };
      data.self = data; // Create circular reference

      expect(() => {
        RedisValueUtils.serialize(data);
      }).toThrow();
    });

    it('should preserve timestamp consistency', () => {
      const data = { test: 'value' };
      const before = Date.now();
      const result = RedisValueUtils.serialize(data);
      const after = Date.now();

      const parsed = JSON.parse(result);
      expect(parsed.storedAt).toBeGreaterThanOrEqual(before);
      expect(parsed.storedAt).toBeLessThanOrEqual(after);
    });

    it('should handle metadata with all properties', () => {
      const data = { test: 'value' };
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 2048,
        compressedSize: 1024
      };
      const result = RedisValueUtils.serialize(data, true, metadata);

      const parsed = JSON.parse(result);
      expect(parsed.metadata).toEqual(metadata);
    });
  });

  describe('parse', () => {
    it('should parse valid envelope format', () => {
      const originalData = { test: 'value' };
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toEqual(originalData);
      expect(result.compressed).toBe(false);
      expect(result.storedAt).toBeDefined();
    });

    it('should parse envelope with metadata', () => {
      const originalData = { test: 'value' };
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 1024,
        compressedSize: 512
      };
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: true,
        metadata
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toEqual(originalData);
      expect(result.compressed).toBe(true);
      expect(result.metadata).toEqual(metadata);
    });

    it('should provide default values for missing envelope properties', () => {
      const originalData = { test: 'value' };
      const minimalEnvelope = {
        data: originalData
      };
      const serialized = JSON.stringify(minimalEnvelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toEqual(originalData);
      expect(result.compressed).toBe(false);
      expect(result.storedAt).toBeGreaterThan(0);
    });

    it('should throw exception for empty value', () => {
      expect(() => {
        RedisValueUtils.parse('');
      }).toThrow();
    });

    it('should throw exception for null value', () => {
      expect(() => {
        RedisValueUtils.parse(null as any);
      }).toThrow();
    });

    it('should throw exception for undefined value', () => {
      expect(() => {
        RedisValueUtils.parse(undefined as any);
      }).toThrow();
    });

    it('should throw exception for invalid JSON', () => {
      expect(() => {
        RedisValueUtils.parse('invalid json {');
      }).toThrow();
    });

    it('should throw exception for non-envelope format', () => {
      const nonEnvelopeData = { name: 'test', value: 123 };
      const serialized = JSON.stringify(nonEnvelopeData);

      expect(() => {
        RedisValueUtils.parse(serialized);
      }).toThrow();
    });

    it('should throw exception for envelope without data field', () => {
      const invalidEnvelope = {
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(invalidEnvelope);

      expect(() => {
        RedisValueUtils.parse(serialized);
      }).toThrow();
    });

    it('should parse string data correctly', () => {
      const originalData = 'simple string';
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toBe(originalData);
    });

    it('should parse array data correctly', () => {
      const originalData = [1, 2, 3, 'test'];
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toEqual(originalData);
    });

    it('should parse null data correctly', () => {
      const originalData = null;
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.parse(serialized);
      expect(result.data).toBeNull();
    });
  });

  describe('validateDataSize', () => {
    it('should return true for small data', () => {
      const data = { test: 'small value' };
      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(true);
    });

    it('should return true for empty object', () => {
      const data = {};
      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(true);
    });

    it('should return true for null data', () => {
      const data = null;
      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(true);
    });

    it('should return false for data exceeding size limit', () => {
      // Create large data that exceeds the limit
      const largeString = 'x'.repeat((CACHE_CONFIG.MEMORY.MAX_VALUE_SIZE_MB * 1024 * 1024) + 1);
      const data = { largeField: largeString };

      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(false);
    });

    it('should return false for circular reference data', () => {
      const data: any = { name: 'test' };
      data.self = data; // Create circular reference

      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(false);
    });

    it('should handle complex nested objects', () => {
      const data = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          profile: {
            email: `user${i}@example.com`,
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        }))
      };

      const result = RedisValueUtils.validateDataSize(data);
      expect(result).toBe(true);
    });
  });

  describe('getDataSize', () => {
    it('should return correct size for simple object', () => {
      const data = { test: 'value' };
      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(Buffer.byteLength(JSON.stringify(data), 'utf8'));
    });

    it('should return 0 for circular reference data', () => {
      const data: any = { name: 'test' };
      data.self = data; // Create circular reference

      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBe(0);
    });

    it('should handle null data', () => {
      const data = null;
      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBe(Buffer.byteLength('null', 'utf8'));
    });

    it('should handle string data', () => {
      const data = 'test string';
      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBe(Buffer.byteLength('"test string"', 'utf8'));
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];
      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBe(Buffer.byteLength('[1,2,3]', 'utf8'));
    });

    it('should handle Unicode characters', () => {
      const data = { message: '测试中文字符' };
      const size = RedisValueUtils.getDataSize(data);
      const expectedSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
      expect(size).toBe(expectedSize);
    });
  });

  describe('createCompressionMetadata', () => {
    it('should create metadata without compression', () => {
      const originalSize = 1024;
      const metadata = RedisValueUtils.createCompressionMetadata(originalSize);

      expect(metadata.originalSize).toBe(originalSize);
      expect(metadata.compressed).toBe(false);
      expect(metadata.compressedSize).toBeUndefined();
      expect(metadata.storedAt).toBeGreaterThan(0);
    });

    it('should create metadata with compression', () => {
      const originalSize = 1024;
      const compressedSize = 512;
      const metadata = RedisValueUtils.createCompressionMetadata(originalSize, compressedSize);

      expect(metadata.originalSize).toBe(originalSize);
      expect(metadata.compressed).toBe(true);
      expect(metadata.compressedSize).toBe(compressedSize);
      expect(metadata.storedAt).toBeGreaterThan(0);
    });

    it('should handle zero sizes', () => {
      const metadata = RedisValueUtils.createCompressionMetadata(0, 0);

      expect(metadata.originalSize).toBe(0);
      expect(metadata.compressed).toBe(true);
      expect(metadata.compressedSize).toBe(0);
    });

    it('should handle compression size of 0', () => {
      const metadata = RedisValueUtils.createCompressionMetadata(1024, 0);

      expect(metadata.originalSize).toBe(1024);
      expect(metadata.compressed).toBe(true);
      expect(metadata.compressedSize).toBe(0);
    });
  });

  describe('safeParseJSON', () => {
    it('should parse valid JSON', () => {
      const data = { test: 'value' };
      const json = JSON.stringify(data);
      const defaultValue = { default: true };

      const result = RedisValueUtils.safeParseJSON(json, defaultValue);
      expect(result).toEqual(data);
    });

    it('should return default value for invalid JSON', () => {
      const invalidJson = 'invalid json {';
      const defaultValue = { default: true };

      const result = RedisValueUtils.safeParseJSON(invalidJson, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should return default value for empty string', () => {
      const defaultValue = { default: true };

      const result = RedisValueUtils.safeParseJSON('', defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should parse primitive values', () => {
      expect(RedisValueUtils.safeParseJSON('123', 0)).toBe(123);
      expect(RedisValueUtils.safeParseJSON('"test"', '')).toBe('test');
      expect(RedisValueUtils.safeParseJSON('true', false)).toBe(true);
      expect(RedisValueUtils.safeParseJSON('null', {})).toBeNull();
    });

    it('should handle different default value types', () => {
      expect(RedisValueUtils.safeParseJSON('invalid', 'default')).toBe('default');
      expect(RedisValueUtils.safeParseJSON('invalid', 42)).toBe(42);
      expect(RedisValueUtils.safeParseJSON('invalid', [])).toEqual([]);
      expect(RedisValueUtils.safeParseJSON('invalid', null)).toBeNull();
    });
  });

  describe('isValidEnvelope', () => {
    it('should return true for valid envelope', () => {
      const envelope: RedisEnvelope = {
        data: { test: 'value' },
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.isValidEnvelope(serialized);
      expect(result).toBe(true);
    });

    it('should return true for minimal valid envelope', () => {
      const envelope = {
        data: 'test',
        storedAt: Date.now()
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.isValidEnvelope(serialized);
      expect(result).toBe(true);
    });

    it('should return false for envelope without data field', () => {
      const invalidEnvelope = {
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(invalidEnvelope);

      const result = RedisValueUtils.isValidEnvelope(serialized);
      expect(result).toBe(false);
    });

    it('should return false for envelope without storedAt field', () => {
      const invalidEnvelope = {
        data: 'test',
        compressed: false
      };
      const serialized = JSON.stringify(invalidEnvelope);

      const result = RedisValueUtils.isValidEnvelope(serialized);
      expect(result).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(RedisValueUtils.isValidEnvelope('"string"')).toBe(false);
      expect(RedisValueUtils.isValidEnvelope('123')).toBe(false);
      expect(RedisValueUtils.isValidEnvelope('true')).toBe(false);
      expect(RedisValueUtils.isValidEnvelope('null')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      const result = RedisValueUtils.isValidEnvelope('invalid json {');
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = RedisValueUtils.isValidEnvelope('');
      expect(result).toBe(false);
    });
  });

  describe('extractData', () => {
    it('should extract data from valid envelope', () => {
      const originalData = { test: 'value' };
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.extractData(serialized);
      expect(result).toEqual(originalData);
    });

    it('should extract string data', () => {
      const originalData = 'test string';
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.extractData(serialized);
      expect(result).toBe(originalData);
    });

    it('should extract null data', () => {
      const originalData = null;
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt: Date.now(),
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.extractData(serialized);
      expect(result).toBeNull();
    });

    it('should throw for invalid envelope', () => {
      const invalidData = { name: 'test' };
      const serialized = JSON.stringify(invalidData);

      expect(() => {
        RedisValueUtils.extractData(serialized);
      }).toThrow();
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from valid envelope', () => {
      const originalData = { test: 'value' };
      const storedAt = Date.now();
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 1024,
        compressedSize: 512
      };
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt,
        compressed: true,
        metadata
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.extractMetadata(serialized);
      expect(result.storedAt).toBe(storedAt);
      expect(result.compressed).toBe(true);
      expect(result.metadata).toEqual(metadata);
    });

    it('should return empty object for invalid envelope', () => {
      const invalidData = { name: 'test' };
      const serialized = JSON.stringify(invalidData);

      const result = RedisValueUtils.extractMetadata(serialized);
      expect(result).toEqual({});
    });

    it('should handle envelope without metadata', () => {
      const originalData = { test: 'value' };
      const storedAt = Date.now();
      const envelope: RedisEnvelope = {
        data: originalData,
        storedAt,
        compressed: false
      };
      const serialized = JSON.stringify(envelope);

      const result = RedisValueUtils.extractMetadata(serialized);
      expect(result.storedAt).toBe(storedAt);
      expect(result.compressed).toBe(false);
      expect(result.metadata).toBeUndefined();
    });

    it('should return empty object for invalid JSON', () => {
      const result = RedisValueUtils.extractMetadata('invalid json');
      expect(result).toEqual({});
    });
  });

  describe('formatStoredTime', () => {
    it('should format timestamp to ISO string', () => {
      const timestamp = 1609459200000; // 2021-01-01T00:00:00.000Z
      const result = RedisValueUtils.formatStoredTime(timestamp);
      expect(result).toBe('2021-01-01T00:00:00.000Z');
    });

    it('should handle current timestamp', () => {
      const timestamp = Date.now();
      const result = RedisValueUtils.formatStoredTime(timestamp);
      const parsed = new Date(result);
      expect(parsed.getTime()).toBe(timestamp);
    });

    it('should handle zero timestamp', () => {
      const timestamp = 0;
      const result = RedisValueUtils.formatStoredTime(timestamp);
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle future timestamp', () => {
      const timestamp = Date.now() + 86400000; // +1 day
      const result = RedisValueUtils.formatStoredTime(timestamp);
      const parsed = new Date(result);
      expect(parsed.getTime()).toBe(timestamp);
    });
  });

  describe('Integration Scenarios', () => {
    it('should serialize and parse complex data correctly', () => {
      const originalData = {
        stockQuote: {
          symbol: 'AAPL',
          price: 150.25,
          volume: 1000000,
          timestamp: Date.now(),
          metadata: {
            provider: 'longport',
            market: 'US'
          }
        }
      };

      const serialized = RedisValueUtils.serialize(originalData, true);
      const parsed = RedisValueUtils.parse(serialized);

      expect(parsed.data).toEqual(originalData);
      expect(parsed.compressed).toBe(true);
    });

    it('should handle real-world cache scenarios', () => {
      const cacheData = {
        userSession: {
          userId: 12345,
          permissions: ['read', 'write'],
          lastActivity: Date.now(),
          preferences: {
            theme: 'dark',
            language: 'en'
          }
        }
      };

      const metadata = RedisValueUtils.createCompressionMetadata(
        RedisValueUtils.getDataSize(cacheData),
        RedisValueUtils.getDataSize(cacheData) * 0.7
      );

      const serialized = RedisValueUtils.serialize(cacheData, true, metadata);
      expect(RedisValueUtils.isValidEnvelope(serialized)).toBe(true);

      const extracted = RedisValueUtils.extractData(serialized);
      expect(extracted).toEqual(cacheData);

      const extractedMetadata = RedisValueUtils.extractMetadata(serialized);
      expect(extractedMetadata.compressed).toBe(true);
      expect(extractedMetadata.metadata).toEqual(metadata);
    });

    it('should validate data size correctly', () => {
      const data = { test: 'value' };
      expect(RedisValueUtils.validateDataSize(data)).toBe(true);

      const size = RedisValueUtils.getDataSize(data);
      expect(size).toBeGreaterThan(0);

      const serialized = RedisValueUtils.serialize(data);
      const envelope = JSON.parse(serialized);
      expect(envelope.data).toEqual(data);
    });

    it('should handle empty and null values consistently', () => {
      const testCases = [null, '', 0, [], {}];

      testCases.forEach(testCase => {
        const serialized = RedisValueUtils.serialize(testCase);
        const parsed = RedisValueUtils.parse(serialized);
        expect(parsed.data).toEqual(testCase);
      });
    });
  });
});
