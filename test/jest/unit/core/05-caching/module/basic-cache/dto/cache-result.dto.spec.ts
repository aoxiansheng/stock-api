import { validate } from 'class-validator';
import {
  CacheResultDto,
  BatchCacheResultDto,
  RedisCacheRuntimeStatsDto
} from '@core/05-caching/module/basic-cache/dto/cache-result.dto';

describe('CacheResultDto', () => {
  describe('CacheResultDto', () => {
    it('should create instance with required properties', () => {
      const dto = new CacheResultDto();
      dto.data = { test: 'data' };
      dto.ttlRemaining = 300;

      expect(dto).toBeInstanceOf(CacheResultDto);
      expect(dto.data).toEqual({ test: 'data' });
      expect(dto.ttlRemaining).toBe(300);
    });

    it('should allow optional properties', () => {
      const dto = new CacheResultDto();
      dto.data = 'test';
      dto.ttlRemaining = 300;
      dto.hit = true;
      dto.storedAt = Date.now();

      expect(dto.hit).toBe(true);
      expect(dto.storedAt).toBeGreaterThan(0);
    });

    it('should work with generic types', () => {
      const dto = new CacheResultDto<string>();
      dto.data = 'string data';
      dto.ttlRemaining = 300;

      expect(typeof dto.data).toBe('string');
      expect(dto.data).toBe('string data');
    });

    it('should work with complex object types', () => {
      interface TestData {
        id: number;
        name: string;
        items: string[];
      }

      const dto = new CacheResultDto<TestData>();
      dto.data = {
        id: 1,
        name: 'Test',
        items: ['item1', 'item2']
      };
      dto.ttlRemaining = 600;
      dto.hit = true;

      expect(dto.data.id).toBe(1);
      expect(dto.data.name).toBe('Test');
      expect(dto.data.items).toHaveLength(2);
    });

    it('should handle null/undefined data', () => {
      const dto = new CacheResultDto();
      dto.data = null;
      dto.ttlRemaining = 0;

      expect(dto.data).toBeNull();
      expect(dto.ttlRemaining).toBe(0);
    });

    it('should handle negative TTL values', () => {
      const dto = new CacheResultDto();
      dto.data = 'test';
      dto.ttlRemaining = -1; // Key expired or doesn't exist

      expect(dto.ttlRemaining).toBe(-1);
    });

    it('should preserve all properties when serialized', () => {
      const dto = new CacheResultDto();
      dto.data = { complex: { nested: 'object' } };
      dto.ttlRemaining = 300;
      dto.hit = false;
      dto.storedAt = 1234567890;

      const serialized = JSON.stringify(dto);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.complex.nested).toBe('object');
      expect(parsed.ttlRemaining).toBe(300);
      expect(parsed.hit).toBe(false);
      expect(parsed.storedAt).toBe(1234567890);
    });
  });

  describe('BatchCacheResultDto', () => {
    it('should create instance with required properties', () => {
      const dto = new BatchCacheResultDto();
      dto.results = [];
      dto.hitCount = 0;
      dto.totalCount = 0;
      dto.hitRate = 0;

      expect(dto).toBeInstanceOf(BatchCacheResultDto);
      expect(dto.results).toEqual([]);
      expect(dto.hitCount).toBe(0);
      expect(dto.totalCount).toBe(0);
      expect(dto.hitRate).toBe(0);
    });

    it('should handle array of CacheResultDto', () => {
      const result1 = new CacheResultDto();
      result1.data = 'data1';
      result1.ttlRemaining = 300;
      result1.hit = true;

      const result2 = new CacheResultDto();
      result2.data = 'data2';
      result2.ttlRemaining = 250;
      result2.hit = true;

      const dto = new BatchCacheResultDto();
      dto.results = [result1, result2, null]; // null indicates cache miss
      dto.hitCount = 2;
      dto.totalCount = 3;
      dto.hitRate = 66.67;

      expect(dto.results).toHaveLength(3);
      expect(dto.results[0]?.data).toBe('data1');
      expect(dto.results[1]?.data).toBe('data2');
      expect(dto.results[2]).toBeNull();
      expect(dto.hitCount).toBe(2);
      expect(dto.totalCount).toBe(3);
      expect(dto.hitRate).toBeCloseTo(66.67);
    });

    it('should calculate correct hit rate', () => {
      const dto = new BatchCacheResultDto();
      dto.results = [new CacheResultDto(), null, new CacheResultDto()];
      dto.hitCount = 2;
      dto.totalCount = 3;
      dto.hitRate = (dto.hitCount / dto.totalCount) * 100;

      expect(dto.hitRate).toBeCloseTo(66.67, 2);
    });

    it('should handle empty results', () => {
      const dto = new BatchCacheResultDto();
      dto.results = [];
      dto.hitCount = 0;
      dto.totalCount = 0;
      dto.hitRate = 0;

      expect(dto.results).toHaveLength(0);
      expect(dto.hitRate).toBe(0);
    });

    it('should handle all misses', () => {
      const dto = new BatchCacheResultDto();
      dto.results = [null, null, null];
      dto.hitCount = 0;
      dto.totalCount = 3;
      dto.hitRate = 0;

      expect(dto.results.every(r => r === null)).toBe(true);
      expect(dto.hitCount).toBe(0);
      expect(dto.hitRate).toBe(0);
    });

    it('should handle all hits', () => {
      const results = Array.from({ length: 5 }, (_, i) => {
        const result = new CacheResultDto();
        result.data = `data${i}`;
        result.ttlRemaining = 300;
        result.hit = true;
        return result;
      });

      const dto = new BatchCacheResultDto();
      dto.results = results;
      dto.hitCount = 5;
      dto.totalCount = 5;
      dto.hitRate = 100;

      expect(dto.results).toHaveLength(5);
      expect(dto.hitCount).toBe(5);
      expect(dto.hitRate).toBe(100);
    });

    it('should work with generic types', () => {
      const dto = new BatchCacheResultDto<number>();
      const result1 = new CacheResultDto<number>();
      result1.data = 123;
      result1.ttlRemaining = 300;

      dto.results = [result1];
      dto.hitCount = 1;
      dto.totalCount = 1;
      dto.hitRate = 100;

      expect(typeof dto.results[0]?.data).toBe('number');
      expect(dto.results[0]?.data).toBe(123);
    });
  });

  describe('RedisCacheRuntimeStatsDto', () => {
    it('should create instance with required properties', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 100;
      dto.successCount = 95;
      dto.errorCount = 5;
      dto.successRate = 95;
      dto.averageResponseTimeMs = 50;

      expect(dto).toBeInstanceOf(RedisCacheRuntimeStatsDto);
      expect(dto.totalOperations).toBe(100);
      expect(dto.successCount).toBe(95);
      expect(dto.errorCount).toBe(5);
      expect(dto.successRate).toBe(95);
      expect(dto.averageResponseTimeMs).toBe(50);
    });

    it('should calculate correct success rate', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 1000;
      dto.successCount = 975;
      dto.errorCount = 25;
      dto.successRate = (dto.successCount / dto.totalOperations) * 100;
      dto.averageResponseTimeMs = 25.5;

      expect(dto.successRate).toBe(97.5);
      expect(dto.successCount + dto.errorCount).toBe(dto.totalOperations);
    });

    it('should handle zero operations', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 0;
      dto.successCount = 0;
      dto.errorCount = 0;
      dto.successRate = 0;
      dto.averageResponseTimeMs = 0;

      expect(dto.totalOperations).toBe(0);
      expect(dto.successRate).toBe(0);
      expect(dto.averageResponseTimeMs).toBe(0);
    });

    it('should handle all errors scenario', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 10;
      dto.successCount = 0;
      dto.errorCount = 10;
      dto.successRate = 0;
      dto.averageResponseTimeMs = 1000; // High response time due to errors

      expect(dto.successRate).toBe(0);
      expect(dto.errorCount).toBe(dto.totalOperations);
      expect(dto.averageResponseTimeMs).toBe(1000);
    });

    it('should handle perfect performance scenario', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 1000;
      dto.successCount = 1000;
      dto.errorCount = 0;
      dto.successRate = 100;
      dto.averageResponseTimeMs = 5; // Very fast response time

      expect(dto.successRate).toBe(100);
      expect(dto.errorCount).toBe(0);
      expect(dto.averageResponseTimeMs).toBe(5);
    });

    it('should handle floating point response times', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 100;
      dto.successCount = 100;
      dto.errorCount = 0;
      dto.successRate = 100;
      dto.averageResponseTimeMs = 12.345;

      expect(dto.averageResponseTimeMs).toBeCloseTo(12.345, 3);
    });

    it('should preserve precision in calculations', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 777;
      dto.successCount = 750;
      dto.errorCount = 27;
      dto.successRate = (750 / 777) * 100;
      dto.averageResponseTimeMs = 33.333;

      expect(dto.successRate).toBeCloseTo(96.525, 3);
      expect(dto.successCount + dto.errorCount).toBe(dto.totalOperations);
    });

    it('should handle large numbers', () => {
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 1000000;
      dto.successCount = 999950;
      dto.errorCount = 50;
      dto.successRate = 99.995;
      dto.averageResponseTimeMs = 1.5;

      expect(dto.totalOperations).toBe(1000000);
      expect(dto.successRate).toBe(99.995);
      expect(dto.averageResponseTimeMs).toBe(1.5);
    });
  });

  describe('DTO Validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CacheResultDto();
      dto.data = 'test';
      dto.ttlRemaining = 300;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should work without explicit validation decorators', async () => {
      // These DTOs don't have validation decorators, they're primarily for API documentation
      const dto = new RedisCacheRuntimeStatsDto();
      dto.totalOperations = 100;
      dto.successCount = 95;
      dto.errorCount = 5;
      dto.successRate = 95;
      dto.averageResponseTimeMs = 50;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('DTO Serialization', () => {
    it('should serialize and deserialize CacheResultDto correctly', () => {
      const original = new CacheResultDto();
      original.data = { complex: { nested: 'value' } };
      original.ttlRemaining = 300;
      original.hit = true;
      original.storedAt = Date.now();

      const json = JSON.stringify(original);
      const deserialized = JSON.parse(json);

      expect(deserialized.data.complex.nested).toBe('value');
      expect(deserialized.ttlRemaining).toBe(300);
      expect(deserialized.hit).toBe(true);
      expect(typeof deserialized.storedAt).toBe('number');
    });

    it('should serialize and deserialize BatchCacheResultDto correctly', () => {
      const result1 = new CacheResultDto();
      result1.data = 'test1';
      result1.ttlRemaining = 300;

      const batch = new BatchCacheResultDto();
      batch.results = [result1, null];
      batch.hitCount = 1;
      batch.totalCount = 2;
      batch.hitRate = 50;

      const json = JSON.stringify(batch);
      const deserialized = JSON.parse(json);

      expect(deserialized.results).toHaveLength(2);
      expect(deserialized.results[0].data).toBe('test1');
      expect(deserialized.results[1]).toBeNull();
      expect(deserialized.hitRate).toBe(50);
    });

    it('should serialize and deserialize RedisCacheRuntimeStatsDto correctly', () => {
      const stats = new RedisCacheRuntimeStatsDto();
      stats.totalOperations = 1000;
      stats.successCount = 950;
      stats.errorCount = 50;
      stats.successRate = 95;
      stats.averageResponseTimeMs = 25.5;

      const json = JSON.stringify(stats);
      const deserialized = JSON.parse(json);

      expect(deserialized.totalOperations).toBe(1000);
      expect(deserialized.successCount).toBe(950);
      expect(deserialized.errorCount).toBe(50);
      expect(deserialized.successRate).toBe(95);
      expect(deserialized.averageResponseTimeMs).toBe(25.5);
    });
  });
});
