import {
  DATATRANSFORM_CONFIG,
  DATATRANSFORM_PERFORMANCE_THRESHOLDS,
} from '@core/02-processing/transformer/constants/data-transformer.constants';

describe('DataTransformerConstants (slimmed)', () => {
  describe('DATATRANSFORM_CONFIG', () => {
    it('should define configuration values with correct types', () => {
      expect(typeof DATATRANSFORM_CONFIG.MAX_BATCH_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.DEFAULT_TIMEOUT_MS).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_STRING_LENGTH).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH).toBe('number');
    });

    it('should have reasonable configuration limits', () => {
      expect(DATATRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBe(100);
      expect(DATATRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBe(10);
      expect(DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBe(10);
      expect(DATATRANSFORM_CONFIG.MAX_STRING_LENGTH).toBe(10000);
      expect(DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH).toBe(10000);
    });
  });

  describe('DATATRANSFORM_PERFORMANCE_THRESHOLDS', () => {
    it('should define performance threshold values', () => {
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS).toBe('number');
    });
  });
});
