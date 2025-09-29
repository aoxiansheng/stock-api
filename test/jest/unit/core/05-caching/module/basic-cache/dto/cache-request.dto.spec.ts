import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CacheRequestDto,
  BatchCacheRequestDto
} from '@core/05-caching/module/basic-cache/dto/cache-request.dto';

describe('CacheRequestDto', () => {
  describe('CacheRequestDto', () => {
    it('should create instance with required properties', () => {
      const dto = new CacheRequestDto();
      dto.key = 'test-key';
      dto.ttl = 300;

      expect(dto).toBeInstanceOf(CacheRequestDto);
      expect(dto.key).toBe('test-key');
      expect(dto.ttl).toBe(300);
    });

    it('should include optional compress property', () => {
      const dto = new CacheRequestDto();
      dto.key = 'test-key';
      dto.ttl = 300;
      dto.compress = true;

      expect(dto.compress).toBe(true);
    });

    it('should default compress to undefined when not set', () => {
      const dto = new CacheRequestDto();
      dto.key = 'test-key';
      dto.ttl = 300;

      expect(dto.compress).toBeUndefined();
    });

    it('should validate with valid data', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'valid-key',
        ttl: 300
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with optional compress property', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'valid-key',
        ttl: 300,
        compress: true
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing key', async () => {
      const dto = plainToClass(CacheRequestDto, {
        ttl: 300
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'key')).toBe(true);
    });

    it('should fail validation with non-string key', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 123,
        ttl: 300
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'key')).toBe(true);
    });

    it('should fail validation with missing ttl', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key'
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'ttl')).toBe(true);
    });

    it('should fail validation with non-number ttl', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 'invalid'
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'ttl')).toBe(true);
    });

    it('should fail validation with ttl less than 1', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 0
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'ttl')).toBe(true);
    });

    it('should fail validation with negative ttl', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: -10
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'ttl')).toBe(true);
    });

    it('should validate with minimum valid ttl', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 1
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with large ttl values', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 86400 // 24 hours
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with non-boolean compress', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 300,
        compress: 'yes'
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'compress')).toBe(true);
    });

    it('should handle empty string key validation', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: '',
        ttl: 300
      });

      const errors = await validate(dto);
      // Empty string is still a valid string, but might not be practical
      expect(errors.some(error => error.property === 'key')).toBe(false);
    });

    it('should handle special characters in key', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'key:with:special:chars-123_test',
        ttl: 300
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle floating point ttl values', async () => {
      const dto = plainToClass(CacheRequestDto, {
        key: 'test-key',
        ttl: 300.5
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should serialize and deserialize correctly', () => {
      const dto = new CacheRequestDto();
      dto.key = 'test-key';
      dto.ttl = 300;
      dto.compress = true;

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.key).toBe('test-key');
      expect(parsed.ttl).toBe(300);
      expect(parsed.compress).toBe(true);
    });
  });

  describe('BatchCacheRequestDto', () => {
    it('should create instance with required properties', () => {
      const dto = new BatchCacheRequestDto();
      dto.keys = ['key1', 'key2', 'key3'];

      expect(dto).toBeInstanceOf(BatchCacheRequestDto);
      expect(dto.keys).toEqual(['key1', 'key2', 'key3']);
      expect(dto.keys).toHaveLength(3);
    });

    it('should validate with valid keys array', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['key1', 'key2', 'key3']
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with single key', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['single-key']
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with empty array', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: []
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing keys property', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'keys')).toBe(true);
    });

    it('should fail validation with non-array keys', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: 'not-an-array'
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'keys')).toBe(true);
    });

    it('should fail validation with non-string array elements', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['valid-key', 123, 'another-valid-key']
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'keys')).toBe(true);
    });

    it('should handle mixed valid and invalid elements validation', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['valid-key', null, 'another-valid-key']
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'keys')).toBe(true);
    });

    it('should validate with special characters in keys', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: [
          'key:with:colons',
          'key-with-dashes',
          'key_with_underscores',
          'key.with.dots',
          'key123with456numbers'
        ]
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle duplicate keys', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['duplicate-key', 'unique-key', 'duplicate-key']
      });

      const errors = await validate(dto);
      // Validation doesn't check for duplicates, that's business logic
      expect(errors).toHaveLength(0);
    });

    it('should handle empty string keys', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['valid-key', '', 'another-valid-key']
      });

      const errors = await validate(dto);
      // Empty strings are valid strings
      expect(errors).toHaveLength(0);
    });

    it('should validate with maximum practical number of keys', async () => {
      const keys = Array.from({ length: 100 }, (_, i) => `key-${i}`);
      const dto = plainToClass(BatchCacheRequestDto, { keys });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should serialize and deserialize correctly', () => {
      const dto = new BatchCacheRequestDto();
      dto.keys = ['key1', 'key2', 'key3'];

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.keys).toEqual(['key1', 'key2', 'key3']);
      expect(Array.isArray(parsed.keys)).toBe(true);
      expect(parsed.keys).toHaveLength(3);
    });

    it('should preserve key order', () => {
      const dto = new BatchCacheRequestDto();
      dto.keys = ['z-key', 'a-key', 'm-key'];

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.keys).toEqual(['z-key', 'a-key', 'm-key']);
    });

    it('should handle Unicode characters in keys', async () => {
      const dto = plainToClass(BatchCacheRequestDto, {
        keys: ['key-中文', 'key-العربية', 'key-🔑', 'key-русский']
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('DTO Integration', () => {
    it('should work together in typical cache scenarios', async () => {
      // Single cache request
      const singleRequest = plainToClass(CacheRequestDto, {
        key: 'user:123:profile',
        ttl: 3600,
        compress: true
      });

      // Batch cache request for related keys
      const batchRequest = plainToClass(BatchCacheRequestDto, {
        keys: [
          'user:123:profile',
          'user:123:preferences',
          'user:123:settings'
        ]
      });

      const singleErrors = await validate(singleRequest);
      const batchErrors = await validate(batchRequest);

      expect(singleErrors).toHaveLength(0);
      expect(batchErrors).toHaveLength(0);
      expect(batchRequest.keys).toContain(singleRequest.key);
    });

    it('should handle realistic cache key patterns', async () => {
      const patterns = [
        'api:v1:stock:AAPL:quote',
        'session:abc123def456',
        'rate_limit:192.168.1.1:60',
        'cache:transformed:market:NYSE:symbols',
        'provider:longport:health_check'
      ];

      const batchRequest = plainToClass(BatchCacheRequestDto, {
        keys: patterns
      });

      const errors = await validate(batchRequest);
      expect(errors).toHaveLength(0);
    });

    it('should validate TTL ranges for different use cases', async () => {
      const shortTerm = plainToClass(CacheRequestDto, {
        key: 'real_time:price:AAPL',
        ttl: 5 // 5 seconds for real-time data
      });

      const mediumTerm = plainToClass(CacheRequestDto, {
        key: 'daily:summary:NYSE',
        ttl: 3600 // 1 hour for daily summaries
      });

      const longTerm = plainToClass(CacheRequestDto, {
        key: 'historical:data:2023',
        ttl: 86400 // 24 hours for historical data
      });

      const allRequests = [shortTerm, mediumTerm, longTerm];
      const validationResults = await Promise.all(
        allRequests.map(req => validate(req))
      );

      validationResults.forEach(errors => {
        expect(errors).toHaveLength(0);
      });
    });
  });
});
