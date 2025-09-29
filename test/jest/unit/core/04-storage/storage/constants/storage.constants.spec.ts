import {
  STORAGE_CONFIG,
  STORAGE_DEFAULTS,
  STORAGE_OPERATIONS,
  STORAGE_STATUS,
  STORAGE_EVENTS,
  STORAGE_METRICS,
  STORAGE_COMPRESSION,
  STORAGE_KEY_PATTERNS,
  STORAGE_PERFORMANCE_THRESHOLDS,
  STORAGE_BATCH_CONFIG,
  STORAGE_CLEANUP_CONFIG,
  STORAGE_HEALTH_CONFIG,
} from '@core/04-storage/storage/constants/storage.constants';

describe('Storage Constants', () => {
  describe('STORAGE_CONFIG', () => {
    it('should have correct default configuration values', () => {
      expect(STORAGE_CONFIG).toBeDefined();
      expect(typeof STORAGE_CONFIG.DEFAULT_CACHE_TTL).toBe('number');
      expect(STORAGE_CONFIG.DEFAULT_CACHE_TTL).toBeGreaterThan(0);

      expect(typeof STORAGE_CONFIG.MAX_KEY_LENGTH).toBe('number');
      expect(STORAGE_CONFIG.MAX_KEY_LENGTH).toBeGreaterThan(0);

      expect(typeof STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBe('number');
      expect(STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBeGreaterThan(0);

      expect(typeof STORAGE_CONFIG.MAX_BATCH_SIZE).toBe('number');
      expect(STORAGE_CONFIG.MAX_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_CONFIG)).toBe(true);

      // Verify object descriptor shows properties are not writable
      const descriptor = Object.getOwnPropertyDescriptor(STORAGE_CONFIG, 'DEFAULT_CACHE_TTL');
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    });

    it('should have reasonable default values', () => {
      expect(STORAGE_CONFIG.DEFAULT_CACHE_TTL).toBe(3600); // 1 hour
      expect(STORAGE_CONFIG.MAX_KEY_LENGTH).toBe(250);
      expect(STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBe(16);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_THRESHOLD).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO).toBeLessThanOrEqual(1);
    });
  });

  // Environment Variable Branch Coverage Tests
  describe('Environment Variable Branch Coverage', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules(); // 重置模块缓存，以便重新加载常量
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv; // 恢复原始环境变量
    });

    it('should correctly parse STORAGE_COMPRESS_THRESHOLD from environment variables', () => {
      // Test case 1: Valid number string
      process.env.STORAGE_COMPRESS_THRESHOLD = '8192';
      const { STORAGE_CONFIG: config1 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config1.DEFAULT_COMPRESSION_THRESHOLD).toBe(8192);

      // Test case 2: Invalid string, should use default
      process.env.STORAGE_COMPRESS_THRESHOLD = 'invalid';
      jest.resetModules();
      const { STORAGE_CONFIG: config2 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config2.DEFAULT_COMPRESSION_THRESHOLD).toBe(5 * 1024);

      // Test case 3: Empty string, should use default
      process.env.STORAGE_COMPRESS_THRESHOLD = '';
      jest.resetModules();
      const { STORAGE_CONFIG: config3 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config3.DEFAULT_COMPRESSION_THRESHOLD).toBe(5 * 1024);

      // Test case 4: '0' string, should correctly parse to 0
      process.env.STORAGE_COMPRESS_THRESHOLD = '0';
      jest.resetModules();
      const { STORAGE_CONFIG: config4 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config4.DEFAULT_COMPRESSION_THRESHOLD).toBe(0);

      // Test case 5: Undefined, should use default
      delete process.env.STORAGE_COMPRESS_THRESHOLD;
      jest.resetModules();
      const { STORAGE_CONFIG: config5 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config5.DEFAULT_COMPRESSION_THRESHOLD).toBe(5 * 1024);
    });

    it('should correctly parse STORAGE_COMPRESS_RATIO from environment variables', () => {
      // Test case 1: Valid float string
      process.env.STORAGE_COMPRESS_RATIO = '0.85';
      const { STORAGE_CONFIG: config1 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config1.DEFAULT_COMPRESSION_RATIO).toBe(0.85);

      // Test case 2: Invalid string, should use default
      process.env.STORAGE_COMPRESS_RATIO = 'invalid';
      jest.resetModules();
      const { STORAGE_CONFIG: config2 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config2.DEFAULT_COMPRESSION_RATIO).toBe(0.8);

      // Test case 3: '0' string, should correctly parse to 0
      process.env.STORAGE_COMPRESS_RATIO = '0';
      jest.resetModules();
      const { STORAGE_CONFIG: config4 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config4.DEFAULT_COMPRESSION_RATIO).toBe(0);

      // Test case 4: Negative value string
      process.env.STORAGE_COMPRESS_RATIO = '-0.5';
      jest.resetModules();
      const { STORAGE_CONFIG: config5 } = require('@core/04-storage/storage/constants/storage.constants');
      expect(config5.DEFAULT_COMPRESSION_RATIO).toBe(-0.5);
    });
  });

  describe('STORAGE_DEFAULTS', () => {
    it('should have required default properties', () => {
      expect(STORAGE_DEFAULTS).toBeDefined();
      expect(typeof STORAGE_DEFAULTS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_DEFAULTS)).toBe(true);
    });
  });

  describe('STORAGE_OPERATIONS', () => {
    it('should define operation constants', () => {
      expect(STORAGE_OPERATIONS).toBeDefined();
      expect(typeof STORAGE_OPERATIONS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_OPERATIONS)).toBe(true);
    });
  });

  describe('STORAGE_STATUS', () => {
    it('should define status constants', () => {
      expect(STORAGE_STATUS).toBeDefined();
      expect(typeof STORAGE_STATUS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_STATUS)).toBe(true);
    });
  });

  describe('STORAGE_EVENTS', () => {
    it('should define event constants', () => {
      expect(STORAGE_EVENTS).toBeDefined();
      expect(typeof STORAGE_EVENTS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_EVENTS)).toBe(true);
    });
  });

  describe('STORAGE_METRICS', () => {
    it('should define metrics constants', () => {
      expect(STORAGE_METRICS).toBeDefined();
      expect(typeof STORAGE_METRICS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_METRICS)).toBe(true);
    });
  });

  describe('STORAGE_COMPRESSION', () => {
    it('should define compression constants', () => {
      expect(STORAGE_COMPRESSION).toBeDefined();
      expect(typeof STORAGE_COMPRESSION).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_COMPRESSION)).toBe(true);
    });
  });

  describe('STORAGE_KEY_PATTERNS', () => {
    it('should define key pattern constants', () => {
      expect(STORAGE_KEY_PATTERNS).toBeDefined();
      expect(typeof STORAGE_KEY_PATTERNS).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_KEY_PATTERNS)).toBe(true);
    });
  });

  describe('STORAGE_PERFORMANCE_THRESHOLDS', () => {
    it('should define performance threshold constants', () => {
      expect(STORAGE_PERFORMANCE_THRESHOLDS).toBeDefined();
      expect(typeof STORAGE_PERFORMANCE_THRESHOLDS).toBe('object');
      expect(typeof STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS).toBe('number');
      expect(typeof STORAGE_PERFORMANCE_THRESHOLDS.SLOW_RETRIEVAL_MS).toBe('number');
      expect(typeof STORAGE_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE).toBe('number');
      expect(typeof STORAGE_PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE).toBe('number');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_PERFORMANCE_THRESHOLDS)).toBe(true);
    });
  });

  describe('STORAGE_BATCH_CONFIG', () => {
    it('should define batch configuration constants', () => {
      expect(STORAGE_BATCH_CONFIG).toBeDefined();
      expect(typeof STORAGE_BATCH_CONFIG).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_BATCH_CONFIG)).toBe(true);
    });
  });

  describe('STORAGE_CLEANUP_CONFIG', () => {
    it('should define cleanup configuration constants', () => {
      expect(STORAGE_CLEANUP_CONFIG).toBeDefined();
      expect(typeof STORAGE_CLEANUP_CONFIG).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_CLEANUP_CONFIG)).toBe(true);
    });
  });

  describe('STORAGE_HEALTH_CONFIG', () => {
    it('should define health configuration constants', () => {
      expect(STORAGE_HEALTH_CONFIG).toBeDefined();
      expect(typeof STORAGE_HEALTH_CONFIG).toBe('object');
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_HEALTH_CONFIG)).toBe(true);
    });
  });
});