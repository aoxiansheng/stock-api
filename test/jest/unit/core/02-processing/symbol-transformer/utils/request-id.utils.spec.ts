import { RequestIdUtils } from '@core/02-processing/symbol-transformer/utils/request-id.utils';

describe('RequestIdUtils', () => {
  describe('generate', () => {
    it('should generate a unique request ID with default prefix', () => {
      const requestId = RequestIdUtils.generate();

      expect(requestId).toMatch(/^transform_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      expect(requestId.startsWith('transform_')).toBe(true);
    });

    it('should generate a unique request ID with custom prefix', () => {
      const customPrefix = 'custom-prefix';
      const requestId = RequestIdUtils.generate(customPrefix);

      expect(requestId).toMatch(/^custom-prefix_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      expect(requestId.startsWith(`${customPrefix}_`)).toBe(true);
    });

    it('should generate different IDs on subsequent calls', () => {
      const requestId1 = RequestIdUtils.generate();
      const requestId2 = RequestIdUtils.generate();
      const requestId3 = RequestIdUtils.generate();

      expect(requestId1).not.toBe(requestId2);
      expect(requestId2).not.toBe(requestId3);
      expect(requestId1).not.toBe(requestId3);

      // All should have the same prefix but different UUIDs
      expect(requestId1.split('_')[0]).toBe('transform');
      expect(requestId2.split('_')[0]).toBe('transform');
      expect(requestId3.split('_')[0]).toBe('transform');

      expect(requestId1.split('_')[1]).not.toBe(requestId2.split('_')[1]);
      expect(requestId2.split('_')[1]).not.toBe(requestId3.split('_')[1]);
    });

    it('should handle empty string prefix', () => {
      const requestId = RequestIdUtils.generate('');

      expect(requestId).toMatch(/^_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      expect(requestId.startsWith('_')).toBe(true);
    });

    it('should handle special characters in prefix', () => {
      const specialPrefix = 'test-prefix_123';
      const requestId = RequestIdUtils.generate(specialPrefix);

      expect(requestId.startsWith(`${specialPrefix}_`)).toBe(true);
      expect(requestId).toMatch(/^test-prefix_123_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should handle numeric prefix', () => {
      const numericPrefix = '12345';
      const requestId = RequestIdUtils.generate(numericPrefix);

      expect(requestId.startsWith(`${numericPrefix}_`)).toBe(true);
      expect(requestId).toMatch(/^12345_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate consistent format across multiple calls with same prefix', () => {
      const prefix = 'test-prefix';
      const requestIds = [];

      for (let i = 0; i < 10; i++) {
        requestIds.push(RequestIdUtils.generate(prefix));
      }

      requestIds.forEach((id, index) => {
        expect(id.startsWith(`${prefix}_`)).toBe(true);
        expect(id).toMatch(/^test-prefix_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);

        // Ensure uniqueness
        for (let j = index + 1; j < requestIds.length; j++) {
          expect(id).not.toBe(requestIds[j]);
        }
      });
    });

    it('should generate proper UUID v4 format', () => {
      const requestId = RequestIdUtils.generate();
      const uuidPart = requestId.split('_')[1];

      // UUID v4 format validation
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
      expect(uuidPart).toMatch(uuidRegex);

      // Check version bit (should be 4)
      expect(uuidPart.charAt(14)).toBe('4');

      // Check variant bits (should be 8, 9, a, or b)
      const variantChar = uuidPart.charAt(19);
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should handle very long prefix', () => {
      const longPrefix = 'a'.repeat(100);
      const requestId = RequestIdUtils.generate(longPrefix);

      expect(requestId.startsWith(`${longPrefix}_`)).toBe(true);
      expect(requestId.length).toBe(longPrefix.length + 1 + 36); // prefix + underscore + UUID length
    });

    it('should handle unicode characters in prefix', () => {
      const unicodePrefix = 'test-前缀-🚀';
      const requestId = RequestIdUtils.generate(unicodePrefix);

      expect(requestId.startsWith(`${unicodePrefix}_`)).toBe(true);
      expect(requestId.includes('前缀')).toBe(true);
      expect(requestId.includes('🚀')).toBe(true);
    });

    it('should handle whitespace in prefix', () => {
      const whitespacePrefix = 'test prefix with spaces';
      const requestId = RequestIdUtils.generate(whitespacePrefix);

      expect(requestId.startsWith(`${whitespacePrefix}_`)).toBe(true);
      expect(requestId.includes(' ')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should generate IDs quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        RequestIdUtils.generate();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should generate 1000 IDs in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should maintain uniqueness in high-volume generation', () => {
      const generatedIds = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        const id = RequestIdUtils.generate();
        expect(generatedIds.has(id)).toBe(false); // Should not have duplicates
        generatedIds.add(id);
      }

      expect(generatedIds.size).toBe(count);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined prefix gracefully', () => {
      const requestId = RequestIdUtils.generate(undefined as any);

      // Should default to "transform" when undefined is passed
      expect(requestId.startsWith('transform_')).toBe(true);
    });

    it('should handle null prefix gracefully', () => {
      const requestId = RequestIdUtils.generate(null as any);

      // Should default to "transform" when null is passed
      expect(requestId.startsWith('transform_')).toBe(true);
    });

    it('should be thread-safe equivalent (concurrent generation)', async () => {
      const promises = [];
      const results = [];

      // Simulate concurrent ID generation
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<string>((resolve) => {
            setImmediate(() => {
              resolve(RequestIdUtils.generate('concurrent'));
            });
          })
        );
      }

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      expect(uniqueIds.size).toBe(100);

      // All should have correct format
      ids.forEach(id => {
        expect(id).toMatch(/^concurrent_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      });
    });
  });
});