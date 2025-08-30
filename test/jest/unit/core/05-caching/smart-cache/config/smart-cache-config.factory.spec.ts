import { SmartCacheConfigFactory } from '../../../../../../../src/core/05-caching/smart-cache/config/smart-cache-config.factory';
import { CacheStrategy } from '../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import  os from 'os';

describe('SmartCacheConfigFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('createConfig', () => {
    it('should create default configuration when no environment variables are set', () => {
      // 清除所有SmartCache相关环境变量
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SMART_CACHE_') || key.startsWith('CACHE_')) {
          delete process.env[key];
        }
      });

      const config = SmartCacheConfigFactory.createConfig();
      const cpuCores = os.cpus().length;
      const expectedConcurrency = Math.min(Math.max(2, cpuCores), 16);

      // 验证基础配置
      expect(config.defaultMinUpdateInterval).toBe(30000);
      expect(config.maxConcurrentUpdates).toBe(expectedConcurrency);
      expect(config.gracefulShutdownTimeout).toBe(30000);
      expect(config.enableBackgroundUpdate).toBe(true);
      expect(config.enableDataChangeDetection).toBe(true);
      expect(config.enableMetrics).toBe(true);

      // 验证策略配置
      expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].ttl).toBe(60);
      expect(config.strategies[CacheStrategy.WEAK_TIMELINESS].ttl).toBe(300);
      expect(config.strategies[CacheStrategy.MARKET_AWARE].openMarketTtl).toBe(30);
      expect(config.strategies[CacheStrategy.ADAPTIVE].baseTtl).toBe(180);
    });

    it('should use environment variables when provided', () => {
      // 设置环境变量
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL = '45000';
      process.env.SMART_CACHE_MAX_CONCURRENT = '12';
      process.env.SMART_CACHE_SHUTDOWN_TIMEOUT = '60000';
      process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = 'false';
      process.env.CACHE_STRONG_TTL = '90';
      process.env.CACHE_WEAK_TTL = '600';

      const config = SmartCacheConfigFactory.createConfig();

      // 验证环境变量生效
      expect(config.defaultMinUpdateInterval).toBe(45000);
      expect(config.maxConcurrentUpdates).toBe(12);
      expect(config.gracefulShutdownTimeout).toBe(60000);
      expect(config.enableBackgroundUpdate).toBe(false);
      expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].ttl).toBe(90);
      expect(config.strategies[CacheStrategy.WEAK_TIMELINESS].ttl).toBe(600);
    });

    it('should handle invalid environment variables gracefully', () => {
      // 设置无效的环境变量
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL = 'invalid-number';
      process.env.SMART_CACHE_MAX_CONCURRENT = 'not-a-number';
      process.env.CACHE_STRONG_TTL = 'invalid';
      process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = 'invalid-boolean';

      const config = SmartCacheConfigFactory.createConfig();
      const cpuCores = os.cpus().length;
      const expectedConcurrency = Math.min(Math.max(2, cpuCores), 16);

      // 应该回退到默认值
      expect(config.defaultMinUpdateInterval).toBe(30000);
      expect(config.maxConcurrentUpdates).toBe(expectedConcurrency);
      expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].ttl).toBe(60);
      // 无效的布尔值应该被解析为false，而不是回退到默认的true
      expect(config.enableBackgroundUpdate).toBe(false);
    });

    it('should parse boolean environment variables correctly', () => {
      // 测试各种布尔值格式
      const testCases = [
        { value: 'true', expected: true },
        { value: 'TRUE', expected: true },
        { value: '1', expected: true },
        { value: 'yes', expected: true },
        { value: 'false', expected: false },
        { value: 'FALSE', expected: false },
        { value: '0', expected: false },
        { value: 'no', expected: false },
        { value: 'invalid', expected: false },
      ];

      testCases.forEach(({ value, expected }) => {
        // 清理环境
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('SMART_CACHE_') || key.startsWith('CACHE_')) {
            delete process.env[key];
          }
        });

        process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = value;
        const config = SmartCacheConfigFactory.createConfig();
        expect(config.enableBackgroundUpdate).toBe(expected);
      });
    });

    it('should validate configuration and throw errors for invalid config', () => {
      // 设置导致验证失败的环境变量
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL = '-1000';
      process.env.CACHE_STRONG_THRESHOLD = '1.5'; // 超出0-1范围

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow();
    });

    it('should apply CPU core-based intelligent defaults', () => {
      // 清除并发相关环境变量
      delete process.env.SMART_CACHE_MAX_CONCURRENT;

      const config = SmartCacheConfigFactory.createConfig();
      const cpuCores = os.cpus().length;
      const expectedConcurrency = Math.min(Math.max(2, cpuCores), 16);

      expect(config.maxConcurrentUpdates).toBe(expectedConcurrency);
      expect(config.maxConcurrentUpdates).toBeGreaterThanOrEqual(2);
      expect(config.maxConcurrentUpdates).toBeLessThanOrEqual(16);
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      expect(systemInfo).toHaveProperty('cpuCores');
      expect(systemInfo).toHaveProperty('totalMemoryMB');
      expect(systemInfo).toHaveProperty('freeMemoryMB');
      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('arch');
      expect(systemInfo).toHaveProperty('nodeVersion');

      expect(typeof systemInfo.cpuCores).toBe('number');
      expect(typeof systemInfo.totalMemoryMB).toBe('number');
      expect(typeof systemInfo.freeMemoryMB).toBe('number');
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.arch).toBe('string');
      expect(typeof systemInfo.nodeVersion).toBe('string');

      expect(systemInfo.cpuCores).toBeGreaterThan(0);
      expect(systemInfo.totalMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('getCurrentEnvVars', () => {
    it('should return current SmartCache environment variables', () => {
      // 设置一些环境变量
      process.env.SMART_CACHE_MAX_CONCURRENT = '8';
      process.env.CACHE_STRONG_TTL = '120';
      process.env.UNRELATED_VAR = 'should-not-appear';

      const envVars = SmartCacheConfigFactory.getCurrentEnvVars();

      // 应该包含SmartCache相关变量
      expect(envVars).toHaveProperty('SMART_CACHE_MAX_CONCURRENT', '8');
      expect(envVars).toHaveProperty('CACHE_STRONG_TTL', '120');
      
      // 不应该包含不相关的变量
      expect(envVars).not.toHaveProperty('UNRELATED_VAR');

      // 验证返回的键名
      Object.keys(envVars).forEach(key => {
        expect(
          key.startsWith('SMART_CACHE_') || key.startsWith('CACHE_')
        ).toBe(true);
      });
    });

    it('should include undefined values for unset variables', () => {
      delete process.env.SMART_CACHE_MIN_UPDATE_INTERVAL;
      
      const envVars = SmartCacheConfigFactory.getCurrentEnvVars();
      
      expect(envVars).toHaveProperty('SMART_CACHE_MIN_UPDATE_INTERVAL');
      expect(envVars.SMART_CACHE_MIN_UPDATE_INTERVAL).toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate strong timeliness strategy config', () => {
      process.env.CACHE_STRONG_TTL = '-10';
      process.env.CACHE_STRONG_THRESHOLD = '2.0';
      process.env.CACHE_STRONG_REFRESH_INTERVAL = '30'; // 小于TTL

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow(/validation failed/);
    });

    it('should validate weak timeliness strategy config', () => {
      process.env.CACHE_WEAK_TTL = '0';
      process.env.CACHE_WEAK_MIN_UPDATE = '-60';

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow(/validation failed/);
    });

    it('should validate market aware strategy config', () => {
      process.env.CACHE_MARKET_OPEN_TTL = '0';
      process.env.CACHE_MARKET_CLOSED_TTL = '-100';
      process.env.CACHE_MARKET_OPEN_THRESHOLD = '1.5';

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow(/validation failed/);
    });

    it('should validate adaptive strategy config', () => {
      process.env.CACHE_ADAPTIVE_MIN_TTL = '3600';
      process.env.CACHE_ADAPTIVE_MAX_TTL = '1800'; // MIN > MAX
      process.env.CACHE_ADAPTIVE_FACTOR = '-1.0';

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow(/validation failed/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme CPU core counts', () => {
      // Mock极端情况
      const originalCpus = os.cpus;
      
      // 测试单核系统
      (os as any).cpus = () => [{}];
      let config = SmartCacheConfigFactory.createConfig();
      expect(config.maxConcurrentUpdates).toBeGreaterThanOrEqual(2);

      // 测试高核心数系统
      (os as any).cpus = () => new Array(64).fill({});
      config = SmartCacheConfigFactory.createConfig();
      expect(config.maxConcurrentUpdates).toBeLessThanOrEqual(16);

      // 恢复原始函数
      (os as any).cpus = originalCpus;
    });

    it('should handle memory information gracefully', () => {
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();
      
      expect(systemInfo.totalMemoryMB).toBeGreaterThan(0);
      expect(systemInfo.freeMemoryMB).toBeGreaterThanOrEqual(0);
      expect(systemInfo.freeMemoryMB).toBeLessThanOrEqual(systemInfo.totalMemoryMB);
    });

    it('should create valid configuration for different deployment scenarios', () => {
      // 开发环境场景
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SMART_CACHE_') || key.startsWith('CACHE_')) {
          delete process.env[key];
        }
      });
      process.env.SMART_CACHE_MAX_CONCURRENT = '4';
      process.env.CACHE_STRONG_TTL = '30';

      const devConfig = SmartCacheConfigFactory.createConfig();
      expect(devConfig.maxConcurrentUpdates).toBe(4);
      expect(devConfig.strategies[CacheStrategy.STRONG_TIMELINESS].ttl).toBe(30);

      // 生产环境场景
      process.env.SMART_CACHE_MAX_CONCURRENT = '16';
      process.env.CACHE_STRONG_TTL = '60';
      process.env.CACHE_MARKET_CLOSED_TTL = '3600';

      const prodConfig = SmartCacheConfigFactory.createConfig();
      expect(prodConfig.maxConcurrentUpdates).toBe(16);
      expect(prodConfig.strategies[CacheStrategy.STRONG_TIMELINESS].ttl).toBe(60);
      expect(prodConfig.strategies[CacheStrategy.MARKET_AWARE].closedMarketTtl).toBe(3600);
    });
  });
});