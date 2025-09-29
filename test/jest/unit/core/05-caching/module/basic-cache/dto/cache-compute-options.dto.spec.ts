import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CacheComputeOptionsDto } from '@core/05-caching/module/basic-cache/dto/cache-compute-options.dto';

describe('CacheComputeOptionsDto', () => {
  describe('Basic Properties', () => {
    it('should create instance with all optional properties', () => {
      const dto = new CacheComputeOptionsDto();

      expect(dto).toBeInstanceOf(CacheComputeOptionsDto);
      expect(dto.customTtl).toBeUndefined();
      expect(dto.enableCompression).toBeUndefined();
      expect(dto.compressionThreshold).toBeUndefined();
      expect(dto.priority).toBeUndefined();
      expect(dto.tags).toBeUndefined();
    });

    it('should accept all properties when provided', () => {
      const dto = new CacheComputeOptionsDto();
      dto.customTtl = 600;
      dto.enableCompression = true;
      dto.compressionThreshold = 2048;
      dto.priority = 'high';
      dto.tags = { environment: 'production', module: 'cache' };

      expect(dto.customTtl).toBe(600);
      expect(dto.enableCompression).toBe(true);
      expect(dto.compressionThreshold).toBe(2048);
      expect(dto.priority).toBe('high');
      expect(dto.tags).toEqual({ environment: 'production', module: 'cache' });
    });
  });

  describe('Validation Tests', () => {
    describe('customTtl validation', () => {
      it('should validate with valid TTL values', async () => {
        const validTtls = [30, 300, 3600, 86400];

        for (const ttl of validTtls) {
          const dto = plainToClass(CacheComputeOptionsDto, { customTtl: ttl });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should fail validation with TTL below minimum (30)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 29 });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'customTtl')).toBe(true);
      });

      it('should fail validation with TTL above maximum (86400)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 86401 });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'customTtl')).toBe(true);
      });

      it('should validate with minimum allowed TTL (30)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 30 });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with maximum allowed TTL (86400)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 86400 });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation with non-number TTL', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 'invalid' });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'customTtl')).toBe(true);
      });

      it('should validate when customTtl is undefined', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('enableCompression validation', () => {
      it('should validate with boolean true', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { enableCompression: true });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with boolean false', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { enableCompression: false });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation with non-boolean value', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { enableCompression: 'yes' });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'enableCompression')).toBe(true);
      });

      it('should validate when enableCompression is undefined', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('compressionThreshold validation', () => {
      it('should validate with valid threshold values', async () => {
        const validThresholds = [1024, 2048, 10240, 102400];

        for (const threshold of validThresholds) {
          const dto = plainToClass(CacheComputeOptionsDto, { compressionThreshold: threshold });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should validate with minimum threshold (1024)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { compressionThreshold: 1024 });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation with threshold below minimum (1024)', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { compressionThreshold: 1023 });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'compressionThreshold')).toBe(true);
      });

      it('should fail validation with non-number threshold', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { compressionThreshold: 'large' });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'compressionThreshold')).toBe(true);
      });

      it('should validate when compressionThreshold is undefined', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('priority validation', () => {
      it('should validate with valid priority values', async () => {
        const validPriorities = ['high', 'normal', 'low'];

        for (const priority of validPriorities) {
          const dto = plainToClass(CacheComputeOptionsDto, { priority });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should fail validation with invalid priority', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { priority: 'urgent' });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'priority')).toBe(true);
      });

      it('should fail validation with numeric priority', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, { priority: 1 });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'priority')).toBe(true);
      });

      it('should validate when priority is undefined', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('tags validation', () => {
      it('should validate with valid tags object', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {
          tags: { environment: 'test', version: '1.0.0' }
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with empty tags object', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {
          tags: {}
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate when tags is undefined', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle complex tags structure', async () => {
        const dto = plainToClass(CacheComputeOptionsDto, {
          tags: {
            module: 'cache',
            component: 'basic-cache',
            version: '2.1.0',
            environment: 'production',
            region: 'us-east-1'
          }
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Combined Validation', () => {
    it('should validate with all valid properties', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 1800,
        enableCompression: true,
        compressionThreshold: 5120,
        priority: 'high',
        tags: { module: 'test', env: 'dev' }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with partial properties', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 600,
        priority: 'normal'
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with empty object', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid properties', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 10, // Below minimum
        enableCompression: 'maybe', // Non-boolean
        priority: 'critical', // Invalid enum
        compressionThreshold: 500 // Below minimum
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map(error => error.property);
      expect(errorProperties).toContain('customTtl');
      expect(errorProperties).toContain('enableCompression');
      expect(errorProperties).toContain('priority');
      expect(errorProperties).toContain('compressionThreshold');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle high-performance caching scenario', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 60, // Short TTL for real-time data
        enableCompression: false, // Disable compression for speed
        priority: 'high',
        tags: { use_case: 'real_time_trading', latency: 'critical' }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle high-compression scenario', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 86400, // Long TTL for historical data
        enableCompression: true,
        compressionThreshold: 1024, // Compress everything above 1KB
        priority: 'low',
        tags: { use_case: 'historical_data', storage: 'optimized' }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle balanced performance scenario', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 1800, // 30 minutes
        enableCompression: true,
        compressionThreshold: 10240, // 10KB threshold
        priority: 'normal',
        tags: { use_case: 'api_responses', balance: 'speed_storage' }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle minimal configuration', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        priority: 'low'
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle edge case configurations', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 30, // Minimum allowed
        compressionThreshold: 1024, // Minimum allowed
        enableCompression: false,
        priority: 'high'
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const dto = new CacheComputeOptionsDto();
      dto.customTtl = 1800;
      dto.enableCompression = true;
      dto.compressionThreshold = 5120;
      dto.priority = 'high';
      dto.tags = { module: 'test', version: '1.0' };

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.customTtl).toBe(1800);
      expect(parsed.enableCompression).toBe(true);
      expect(parsed.compressionThreshold).toBe(5120);
      expect(parsed.priority).toBe('high');
      expect(parsed.tags).toEqual({ module: 'test', version: '1.0' });
    });

    it('should serialize undefined properties correctly', () => {
      const dto = new CacheComputeOptionsDto();
      dto.priority = 'normal';

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.priority).toBe('normal');
      expect('customTtl' in parsed).toBe(false);
      expect('enableCompression' in parsed).toBe(false);
    });

    it('should handle complex tags serialization', () => {
      const dto = new CacheComputeOptionsDto();
      dto.tags = {
        complex: JSON.stringify({ nested: 'value' }),
        array: JSON.stringify([1, 2, 3]),
        boolean: 'true',
        number: '42'
      };

      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.tags.complex).toBe('{"nested":"value"}');
      expect(parsed.tags.array).toBe('[1,2,3]');
      expect(parsed.tags.boolean).toBe('true');
      expect(parsed.tags.number).toBe('42');
    });
  });

  describe('Edge Cases', () => {
    it('should handle floating point TTL values', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, { customTtl: 300.5 });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle floating point compression threshold', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        compressionThreshold: 1024.5
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle null values for optional properties', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: null,
        enableCompression: null,
        priority: null
      });

      const errors = await validate(dto);
      // null values should fail type validation
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty tags object', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        tags: {}
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle large tags object', async () => {
      const largeTags: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        largeTags[`tag${i}`] = `value${i}`;
      }

      const dto = plainToClass(CacheComputeOptionsDto, {
        tags: largeTags
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should preserve tag value types as strings', () => {
      const dto = new CacheComputeOptionsDto();
      dto.tags = {
        numericValue: '123',
        booleanValue: 'true',
        stringValue: 'test'
      };

      expect(typeof dto.tags.numericValue).toBe('string');
      expect(typeof dto.tags.booleanValue).toBe('string');
      expect(typeof dto.tags.stringValue).toBe('string');
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should support real-time trading configuration', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 30, // Very short for real-time
        enableCompression: false, // Speed over storage
        priority: 'high',
        tags: {
          use_case: 'real_time_trading',
          market: 'NYSE',
          data_type: 'live_quotes'
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should support historical data configuration', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 86400, // 24 hours for historical data
        enableCompression: true, // Storage optimization
        compressionThreshold: 1024, // Aggressive compression
        priority: 'low',
        tags: {
          use_case: 'historical_analysis',
          data_year: '2023',
          compression: 'enabled'
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should support API response caching configuration', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 300, // 5 minutes for API responses
        enableCompression: true,
        compressionThreshold: 5120, // 5KB threshold
        priority: 'normal',
        tags: {
          endpoint: '/api/v1/stocks/quote',
          method: 'GET',
          api_version: 'v1'
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should support development/testing configuration', async () => {
      const dto = plainToClass(CacheComputeOptionsDto, {
        customTtl: 60, // Short TTL for testing
        enableCompression: false, // Easier debugging
        priority: 'low',
        tags: {
          environment: 'development',
          test_run: 'unit_tests',
          debug: 'enabled'
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce priority type safety', () => {
      const dto = new CacheComputeOptionsDto();

      // TypeScript should prevent invalid assignments
      dto.priority = 'high'; // Valid
      dto.priority = 'normal'; // Valid
      dto.priority = 'low'; // Valid

      expect(['high', 'normal', 'low']).toContain(dto.priority);
    });

    it('should handle tags type safety', () => {
      const dto = new CacheComputeOptionsDto();
      dto.tags = {
        stringKey: 'stringValue',
        anotherKey: 'anotherValue'
      };

      // Should be Record<string, string>
      Object.values(dto.tags!).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
});
