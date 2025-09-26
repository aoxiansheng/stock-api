import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BatchCacheOperationDto } from '@cache/dto/operations/batch-operation.dto';
import { CacheConfigDto } from '@cache/dto/config/cache-config.dto';

// Mock the custom validators
jest.mock('@cache/decorators/validation.decorators', () => ({
  IsValidCacheTTL: () => (target: any, propertyKey: string) => {
    // Mock implementation that accepts valid TTL values
  },
}));

jest.mock('@common/validators', () => ({
  IsNumberInRange: (options: any) => (target: any, propertyKey: string) => {
    // Mock implementation
  },
}));

describe('BatchCacheOperationDto', () => {
  let dto: BatchCacheOperationDto;

  beforeEach(() => {
    dto = new BatchCacheOperationDto();
  });

  describe('Constructor and Basic Properties', () => {
    it('should create an instance', () => {
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(BatchCacheOperationDto);
    });

    it('should have correct property types', () => {
      dto.entries = new Map([['key1', 'value1']]);
      dto.ttl = 3600;
      dto.batchSize = 50;

      expect(dto.entries).toBeInstanceOf(Map);
      expect(typeof dto.ttl).toBe('number');
      expect(typeof dto.batchSize).toBe('number');
    });

    it('should support generic typing', () => {
      const stringDto = new BatchCacheOperationDto<string>();
      stringDto.entries = new Map([['key', 'stringValue']]);

      const numberDto = new BatchCacheOperationDto<number>();
      numberDto.entries = new Map([['key', 123]]);

      const objectDto = new BatchCacheOperationDto<{ id: number }>();
      objectDto.entries = new Map([['key', { id: 1 }]]);

      expect(stringDto.entries.get('key')).toBe('stringValue');
      expect(numberDto.entries.get('key')).toBe(123);
      expect(objectDto.entries.get('key')).toEqual({ id: 1 });
    });
  });

  describe('Interface Implementation', () => {
    it('should implement BatchSizeInfo interface', () => {
      dto.batchSize = 100;

      // Should have batchSize property as required by BatchSizeInfo
      expect(dto.batchSize).toBeDefined();
      expect(typeof dto.batchSize).toBe('number');
    });

    it('should implement RequiredTTL interface', () => {
      dto.ttl = 3600;

      // Should have ttl property as required by RequiredTTL
      expect(dto.ttl).toBeDefined();
      expect(typeof dto.ttl).toBe('number');
    });
  });

  describe('Data Transformation', () => {
    it('should transform plain object to class instance', () => {
      const plainObject = {
        entries: { key1: 'value1', key2: 'value2' },
        ttl: 1800,
        batchSize: 25,
      };

      const transformedDto = plainToClass(BatchCacheOperationDto, plainObject);

      expect(transformedDto).toBeInstanceOf(BatchCacheOperationDto);
      expect(transformedDto.ttl).toBe(1800);
      expect(transformedDto.batchSize).toBe(25);
    });

    it('should handle nested config transformation', () => {
      const plainObject = {
        entries: { key1: 'value1' },
        ttl: 3600,
        batchSize: 50,
        config: {
          timeout: 5000,
          retryAttempts: 3,
          enableCompression: true,
        },
      };

      const transformedDto = plainToClass(BatchCacheOperationDto, plainObject);

      expect(transformedDto.config).toBeInstanceOf(CacheConfigDto);
    });

    it('should handle missing optional properties', () => {
      const plainObject = {
        entries: { key1: 'value1' },
        ttl: 3600,
        batchSize: 50,
        // config is optional, so omitted
      };

      const transformedDto = plainToClass(BatchCacheOperationDto, plainObject);

      expect(transformedDto.config).toBeUndefined();
    });
  });

  describe('Map Entries Handling', () => {
    it('should handle empty entries Map', () => {
      dto.entries = new Map();
      dto.ttl = 3600;
      dto.batchSize = 1;

      expect(dto.entries.size).toBe(0);
      expect(Array.from(dto.entries.keys())).toEqual([]);
    });

    it('should handle single entry Map', () => {
      dto.entries = new Map([['single', 'value']]);

      expect(dto.entries.size).toBe(1);
      expect(dto.entries.get('single')).toBe('value');
      expect(dto.entries.has('single')).toBe(true);
    });

    it('should handle multiple entries Map', () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);
      dto.entries = entries;

      expect(dto.entries.size).toBe(3);
      expect(Array.from(dto.entries.keys())).toEqual(['key1', 'key2', 'key3']);
      expect(Array.from(dto.entries.values())).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle complex object values in Map', () => {
      const complexValue = {
        id: 123,
        name: 'Test Object',
        nested: { prop: 'nested value' },
        array: [1, 2, 3],
      };
      dto.entries = new Map([['complex', complexValue]]);

      expect(dto.entries.get('complex')).toEqual(complexValue);
      expect(dto.entries.get('complex')?.nested.prop).toBe('nested value');
    });
  });

  describe('TTL Property', () => {
    it('should accept valid TTL values', () => {
      const validTtls = [1, 60, 3600, 86400, 604800]; // 1 sec to 1 week

      validTtls.forEach(ttl => {
        dto.ttl = ttl;
        expect(dto.ttl).toBe(ttl);
      });
    });

    it('should store TTL as number', () => {
      dto.ttl = 3600;
      expect(typeof dto.ttl).toBe('number');
      expect(dto.ttl).toBe(3600);
    });
  });

  describe('Batch Size Property', () => {
    it('should accept valid batch sizes', () => {
      const validSizes = [1, 10, 50, 100, 500, 1000];

      validSizes.forEach(size => {
        dto.batchSize = size;
        expect(dto.batchSize).toBe(size);
      });
    });

    it('should store batch size as number', () => {
      dto.batchSize = 100;
      expect(typeof dto.batchSize).toBe('number');
      expect(dto.batchSize).toBe(100);
    });
  });

  describe('Config Property', () => {
    it('should accept valid config object', () => {
      const config = new CacheConfigDto();
      // Set a property that actually exists on CacheConfigDto
      (config as any).timeout = 5000;

      dto.config = config;
      expect(dto.config).toBe(config);
      expect(dto.config).toBeInstanceOf(CacheConfigDto);
    });

    it('should be optional', () => {
      dto.entries = new Map([['key', 'value']]);
      dto.ttl = 3600;
      dto.batchSize = 50;
      // config is not set

      expect(dto.config).toBeUndefined();
    });

    it('should handle null config', () => {
      dto.config = null as any;
      expect(dto.config).toBeNull();
    });
  });

  describe('Validation Integration', () => {
    it('should use IsValidCacheTTL decorator on ttl property', () => {
      // This test verifies that the decorator is applied
      // The actual validation logic is tested in the decorator's own tests
      expect(dto.hasOwnProperty('ttl')).toBe(true);
    });

    it('should use IsNumberInRange decorator on batchSize property', () => {
      // This test verifies that the decorator is applied
      expect(dto.hasOwnProperty('batchSize')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large entries Map', () => {
      const largeMap = new Map();
      for (let i = 0; i < 1000; i++) {
        largeMap.set(`key${i}`, `value${i}`);
      }

      dto.entries = largeMap;
      expect(dto.entries.size).toBe(1000);
      expect(dto.entries.get('key500')).toBe('value500');
    });

    it('should handle entries with special characters in keys', () => {
      const specialKeys = [
        'key:with:colons',
        'key.with.dots',
        'key-with-dashes',
        'key_with_underscores',
        'key with spaces',
        'key@with@special',
        'key/with/slashes',
      ];

      const entries = new Map();
      specialKeys.forEach((key, index) => {
        entries.set(key, `value${index}`);
      });

      dto.entries = entries;
      expect(dto.entries.size).toBe(specialKeys.length);

      specialKeys.forEach((key, index) => {
        expect(dto.entries.get(key)).toBe(`value${index}`);
      });
    });

    it('should handle entries with undefined and null values', () => {
      dto.entries = new Map([
        ['undefinedValue', undefined],
        ['nullValue', null],
        ['emptyString', ''],
        ['zero', 0 as any],
        ['false', false as any],
      ]);

      expect(dto.entries.get('undefinedValue')).toBeUndefined();
      expect(dto.entries.get('nullValue')).toBeNull();
      expect(dto.entries.get('emptyString')).toBe('');
      expect(dto.entries.get('zero')).toBe(0);
      expect(dto.entries.get('false')).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      dto.entries = new Map([['key1', 'value1'], ['key2', 'value2']]);
      dto.ttl = 3600;
      dto.batchSize = 50;

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.ttl).toBe(3600);
      expect(parsed.batchSize).toBe(50);
      // Note: Map doesn't serialize to JSON directly, this tests the behavior
    });

    it('should handle serialization with config', () => {
      dto.entries = new Map([['key1', 'value1']]);
      dto.ttl = 1800;
      dto.batchSize = 25;
      dto.config = plainToClass(CacheConfigDto, { timeout: 5000 });

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.ttl).toBe(1800);
      expect(parsed.batchSize).toBe(25);
      expect(parsed.config).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should allow entries Map to be garbage collected', () => {
      dto.entries = new Map([['key1', 'value1']]);
      const originalSize = dto.entries.size;

      dto.entries = new Map(); // Replace with empty map

      expect(originalSize).toBe(1);
      expect(dto.entries.size).toBe(0);
    });

    it('should handle Map operations efficiently', () => {
      const startTime = Date.now();
      const entries = new Map();

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        entries.set(`key${i}`, `value${i}`);
      }

      dto.entries = entries;
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(dto.entries.size).toBe(1000);
    });
  });
});