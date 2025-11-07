import { STORAGE_CONFIG } from '@core/04-storage/storage/constants/storage.constants';

describe('Storage Constants (Slimmed)', () => {
  describe('STORAGE_CONFIG', () => {
    it('should have correct default configuration values', () => {
      expect(STORAGE_CONFIG).toBeDefined();
      // DEFAULT_CACHE_TTL 已移除

      expect(typeof STORAGE_CONFIG.MAX_KEY_LENGTH).toBe('number');
      expect(STORAGE_CONFIG.MAX_KEY_LENGTH).toBeGreaterThan(0);

      expect(typeof STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBe('number');
      expect(STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBeGreaterThan(0);

      // MAX_BATCH_SIZE 已移除
    });

    it('should be frozen to prevent mutations', () => {
      expect(Object.isFrozen(STORAGE_CONFIG)).toBe(true);

      // Verify object descriptor shows properties are not writable
      const descriptor = Object.getOwnPropertyDescriptor(STORAGE_CONFIG, 'MAX_DATA_SIZE_MB');
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    });

    it('should have reasonable default values', () => {
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

  // 其余常量已移除，聚焦核心功能
});
