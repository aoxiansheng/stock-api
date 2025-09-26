import { StorageMode, StorageModeUtils } from '@core/01-entry/receiver/enums/storage-mode.enum';

describe('StorageMode', () => {
  describe('StorageMode enum', () => {
    it('should have correct enum values', () => {
      expect(StorageMode.NONE).toBe('none');
      expect(StorageMode.SHORT_TTL).toBe('short_ttl');
      expect(StorageMode.BOTH).toBe('both');
    });

    it('should have all expected enum keys', () => {
      const keys = Object.keys(StorageMode);
      expect(keys).toContain('NONE');
      expect(keys).toContain('SHORT_TTL');
      expect(keys).toContain('BOTH');
      expect(keys).toHaveLength(3);
    });

    it('should have all expected enum values', () => {
      const values = Object.values(StorageMode);
      expect(values).toContain('none');
      expect(values).toContain('short_ttl');
      expect(values).toContain('both');
      expect(values).toHaveLength(3);
    });
  });

  describe('StorageModeUtils', () => {
    describe('getAllModes', () => {
      it('should return all storage mode values', () => {
        const modes = StorageModeUtils.getAllModes();
        expect(modes).toEqual(['none', 'short_ttl', 'both']);
        expect(modes).toHaveLength(3);
      });

      it('should return array of strings', () => {
        const modes = StorageModeUtils.getAllModes();
        expect(Array.isArray(modes)).toBe(true);
        modes.forEach(mode => {
          expect(typeof mode).toBe('string');
        });
      });

      it('should return consistent results on multiple calls', () => {
        const modes1 = StorageModeUtils.getAllModes();
        const modes2 = StorageModeUtils.getAllModes();
        expect(modes1).toEqual(modes2);
      });
    });

    describe('getDefault', () => {
      it('should return default storage mode', () => {
        const defaultMode = StorageModeUtils.getDefault();
        expect(defaultMode).toBeDefined();
        expect(typeof defaultMode).toBe('string');
      });

      it('should return a valid storage mode', () => {
        const defaultMode = StorageModeUtils.getDefault();
        const allModes = StorageModeUtils.getAllModes();
        expect(allModes).toContain(defaultMode);
      });

      it('should return BOTH as default', () => {
        const defaultMode = StorageModeUtils.getDefault();
        expect(defaultMode).toBe(StorageMode.BOTH);
      });

      it('should return consistent results on multiple calls', () => {
        const default1 = StorageModeUtils.getDefault();
        const default2 = StorageModeUtils.getDefault();
        expect(default1).toBe(default2);
      });
    });

    describe('isValid', () => {
      it('should validate correct storage modes', () => {
        expect(StorageModeUtils.isValid(StorageMode.NONE)).toBe(true);
        expect(StorageModeUtils.isValid(StorageMode.SHORT_TTL)).toBe(true);
        expect(StorageModeUtils.isValid(StorageMode.BOTH)).toBe(true);
      });

      it('should validate string values', () => {
        expect(StorageModeUtils.isValid('none')).toBe(true);
        expect(StorageModeUtils.isValid('short_ttl')).toBe(true);
        expect(StorageModeUtils.isValid('both')).toBe(true);
      });

      it('should reject invalid storage modes', () => {
        expect(StorageModeUtils.isValid('invalid')).toBe(false);
        expect(StorageModeUtils.isValid('long_ttl')).toBe(false);
        expect(StorageModeUtils.isValid('cache')).toBe(false);
        expect(StorageModeUtils.isValid('')).toBe(false);
      });

      it('should handle null and undefined', () => {
        expect(StorageModeUtils.isValid(null as any)).toBe(false);
        expect(StorageModeUtils.isValid(undefined as any)).toBe(false);
      });

      it('should handle non-string types', () => {
        expect(StorageModeUtils.isValid(123 as any)).toBe(false);
        expect(StorageModeUtils.isValid({} as any)).toBe(false);
        expect(StorageModeUtils.isValid([] as any)).toBe(false);
        expect(StorageModeUtils.isValid(true as any)).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(StorageModeUtils.isValid('NONE')).toBe(false);
        expect(StorageModeUtils.isValid('SHORT_TTL')).toBe(false);
        expect(StorageModeUtils.isValid('BOTH')).toBe(false);
        expect(StorageModeUtils.isValid('None')).toBe(false);
      });
    });

    describe('getDescription', () => {
      it('should return descriptions for all storage modes', () => {
        const noneDesc = StorageModeUtils.getDescription(StorageMode.NONE);
        const shortTtlDesc = StorageModeUtils.getDescription(StorageMode.SHORT_TTL);
        const bothDesc = StorageModeUtils.getDescription(StorageMode.BOTH);

        expect(typeof noneDesc).toBe('string');
        expect(typeof shortTtlDesc).toBe('string');
        expect(typeof bothDesc).toBe('string');

        expect(noneDesc.length).toBeGreaterThan(0);
        expect(shortTtlDesc.length).toBeGreaterThan(0);
        expect(bothDesc.length).toBeGreaterThan(0);
      });

      it('should return different descriptions for different modes', () => {
        const noneDesc = StorageModeUtils.getDescription(StorageMode.NONE);
        const shortTtlDesc = StorageModeUtils.getDescription(StorageMode.SHORT_TTL);
        const bothDesc = StorageModeUtils.getDescription(StorageMode.BOTH);

        expect(noneDesc).not.toBe(shortTtlDesc);
        expect(noneDesc).not.toBe(bothDesc);
        expect(shortTtlDesc).not.toBe(bothDesc);
      });

      it('should return appropriate description for NONE mode', () => {
        const desc = StorageModeUtils.getDescription(StorageMode.NONE);
        expect(desc).toBe('不进行数据存储');
      });

      it('should return appropriate description for SHORT_TTL mode', () => {
        const desc = StorageModeUtils.getDescription(StorageMode.SHORT_TTL);
        expect(desc).toBe('仅短期缓存存储');
      });

      it('should return appropriate description for BOTH mode', () => {
        const desc = StorageModeUtils.getDescription(StorageMode.BOTH);
        expect(desc).toBe('缓存和持久化存储');
      });
    });

    describe('getDefaultTTL', () => {
      it('should return correct TTL for each mode', () => {
        expect(StorageModeUtils.getDefaultTTL(StorageMode.NONE)).toBe(0);
        expect(StorageModeUtils.getDefaultTTL(StorageMode.SHORT_TTL)).toBe(5);
        expect(StorageModeUtils.getDefaultTTL(StorageMode.BOTH)).toBe(300);
      });

      it('should return numeric values', () => {
        expect(typeof StorageModeUtils.getDefaultTTL(StorageMode.NONE)).toBe('number');
        expect(typeof StorageModeUtils.getDefaultTTL(StorageMode.SHORT_TTL)).toBe('number');
        expect(typeof StorageModeUtils.getDefaultTTL(StorageMode.BOTH)).toBe('number');
      });

      it('should return non-negative TTL values', () => {
        expect(StorageModeUtils.getDefaultTTL(StorageMode.NONE)).toBeGreaterThanOrEqual(0);
        expect(StorageModeUtils.getDefaultTTL(StorageMode.SHORT_TTL)).toBeGreaterThanOrEqual(0);
        expect(StorageModeUtils.getDefaultTTL(StorageMode.BOTH)).toBeGreaterThanOrEqual(0);
      });

      it('should have SHORT_TTL < BOTH in terms of TTL duration', () => {
        const shortTtl = StorageModeUtils.getDefaultTTL(StorageMode.SHORT_TTL);
        const bothTtl = StorageModeUtils.getDefaultTTL(StorageMode.BOTH);
        expect(shortTtl).toBeLessThan(bothTtl);
      });
    });

    describe('edge cases and error handling', () => {
      it('should handle empty string', () => {
        expect(StorageModeUtils.isValid('')).toBe(false);
      });

      it('should handle whitespace strings', () => {
        expect(StorageModeUtils.isValid('   ')).toBe(false);
        expect(StorageModeUtils.isValid('\t')).toBe(false);
        expect(StorageModeUtils.isValid('\n')).toBe(false);
      });

      it('should handle case variations', () => {
        expect(StorageModeUtils.isValid('NONE')).toBe(false);
        expect(StorageModeUtils.isValid('None')).toBe(false);
        expect(StorageModeUtils.isValid('SHORT_ttl')).toBe(false);
        expect(StorageModeUtils.isValid('BOTH')).toBe(false);
      });

      it('should handle mixed case storage modes', () => {
        expect(StorageModeUtils.isValid('None')).toBe(false);
        expect(StorageModeUtils.isValid('Short_TTL')).toBe(false);
        expect(StorageModeUtils.isValid('Both')).toBe(false);
      });

      it('should handle partial matches', () => {
        expect(StorageModeUtils.isValid('non')).toBe(false);
        expect(StorageModeUtils.isValid('short')).toBe(false);
        expect(StorageModeUtils.isValid('bot')).toBe(false);
      });
    });

    describe('performance and consistency', () => {
      it('should be performant for multiple calls', () => {
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
          StorageModeUtils.getAllModes();
          StorageModeUtils.getDefault();
          StorageModeUtils.isValid(StorageMode.NONE);
        }
        const end = Date.now();
        expect(end - start).toBeLessThan(100); // Should complete in under 100ms
      });

      it('should return same array content for getAllModes', () => {
        const modes1 = StorageModeUtils.getAllModes();
        const modes2 = StorageModeUtils.getAllModes();
        expect(modes1).toEqual(modes2);
      });

      it('should maintain constant enum values', () => {
        // Test that enum values don't change during runtime
        const initialNone = StorageMode.NONE;
        const initialShortTtl = StorageMode.SHORT_TTL;
        const initialBoth = StorageMode.BOTH;

        // Perform some operations
        StorageModeUtils.getAllModes();
        StorageModeUtils.getDefault();
        StorageModeUtils.isValid(StorageMode.NONE);

        // Values should remain the same
        expect(StorageMode.NONE).toBe(initialNone);
        expect(StorageMode.SHORT_TTL).toBe(initialShortTtl);
        expect(StorageMode.BOTH).toBe(initialBoth);
      });
    });

    describe('type safety', () => {
      it('should work with TypeScript type guards', () => {
        const testValue: string = 'none';

        if (StorageModeUtils.isValid(testValue)) {
          // TypeScript should recognize testValue as StorageMode here
          expect(testValue).toBe(StorageMode.NONE);
        }
      });

      it('should correctly identify valid enum values', () => {
        const validValues = Object.values(StorageMode);

        validValues.forEach(value => {
          expect(StorageModeUtils.isValid(value)).toBe(true);
        });
      });

      it('should reject invalid values consistently', () => {
        const invalidValues = ['invalid', 'test', '123', 'NONE_INVALID', 'short_ttl_extra'];

        invalidValues.forEach(value => {
          expect(StorageModeUtils.isValid(value)).toBe(false);
        });
      });
    });
  });
});