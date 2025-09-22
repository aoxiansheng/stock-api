import { SmartCacheConfigFactory } from '@core/05-caching/smart-cache/config/smart-cache-config.factory';
import { CacheStrategy } from '@core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from '@common/core/exceptions';
import { SMART_CACHE_ERROR_CODES } from '@core/05-caching/smart-cache/constants/smart-cache-error-codes.constants';

describe('SmartCacheConfigFactory', () => {
  // 保存原始环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    // 清理环境变量
    jest.resetModules();
    process.env = { ...originalEnv };

    // 删除所有Smart Cache相关的环境变量
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('SMART_CACHE_') || key.startsWith('CACHE_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('默认配置创建', () => {
    it('应该创建有效的默认配置', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config).toBeDefined();
      expect(config.defaultMinUpdateInterval).toBeGreaterThan(0);
      expect(config.maxConcurrentUpdates).toBeGreaterThan(0);
      expect(config.maxConcurrentUpdates).toBeLessThanOrEqual(32);
      expect(config.gracefulShutdownTimeout).toBeGreaterThan(0);
      expect(typeof config.enableBackgroundUpdate).toBe('boolean');
      expect(typeof config.enableDataChangeDetection).toBe('boolean');
      expect(typeof config.enableMetrics).toBe('boolean');
    });

    it('应该包含所有必需的策略配置', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.strategies).toBeDefined();
      expect(config.strategies[CacheStrategy.STRONG_TIMELINESS]).toBeDefined();
      expect(config.strategies[CacheStrategy.WEAK_TIMELINESS]).toBeDefined();
      expect(config.strategies[CacheStrategy.MARKET_AWARE]).toBeDefined();
      expect(config.strategies[CacheStrategy.ADAPTIVE]).toBeDefined();
      expect(config.strategies[CacheStrategy.NO_CACHE]).toBeDefined();
    });

    it('应该基于CPU核心数设置合理的并发数', () => {
      const config = SmartCacheConfigFactory.createConfig();
      const cpuCores = require('os').cpus().length;

      expect(config.maxConcurrentUpdates).toBeGreaterThanOrEqual(2);
      expect(config.maxConcurrentUpdates).toBeLessThanOrEqual(32);

      // 验证基于CPU核心数的智能默认值
      if (cpuCores >= 2 && cpuCores <= 32) {
        expect(config.maxConcurrentUpdates).toBe(cpuCores);
      }
    });
  });

  describe('环境变量解析', () => {
    describe('整数型环境变量', () => {
      it('应该解析有效的整数环境变量', () => {
        process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '45000';
        process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '8';

        const config = SmartCacheConfigFactory.createConfig();

        expect(config.defaultMinUpdateInterval).toBe(45000);
        expect(config.maxConcurrentUpdates).toBe(8);
      });

      it('应该处理无效的整数环境变量', () => {
        process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = 'invalid';
        process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = 'not-a-number';

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = SmartCacheConfigFactory.createConfig();

        // 应该使用默认值
        expect(config.defaultMinUpdateInterval).toBeGreaterThan(0);
        expect(config.maxConcurrentUpdates).toBeGreaterThan(0);

        // 应该记录警告
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid integer value')
        );

        consoleSpy.mockRestore();
      });

      it('应该应用边界限制', () => {
        process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '100'; // 超过最大值

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = SmartCacheConfigFactory.createConfig();

        // 应该被限制到最大值32
        expect(config.maxConcurrentUpdates).toBeLessThanOrEqual(32);

        consoleSpy.mockRestore();
      });
    });

    describe('浮点数型环境变量', () => {
      it('应该解析有效的浮点数环境变量', () => {
        process.env.SMART_CACHE_STRONG_UPDATE_RATIO = '0.8';

        const config = SmartCacheConfigFactory.createConfig();

        expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].updateThresholdRatio).toBe(0.8);
      });

      it('应该处理无效的浮点数环境变量', () => {
        process.env.SMART_CACHE_STRONG_UPDATE_RATIO = 'invalid-float';

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = SmartCacheConfigFactory.createConfig();

        // 应该使用默认值
        expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].updateThresholdRatio).toBeGreaterThan(0);
        expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].updateThresholdRatio).toBeLessThanOrEqual(1);

        // 应该记录警告
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid float value')
        );

        consoleSpy.mockRestore();
      });

      it('应该应用浮点数边界限制', () => {
        process.env.SMART_CACHE_STRONG_UPDATE_RATIO = '1.5'; // 超过最大值1.0

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = SmartCacheConfigFactory.createConfig();

        // 应该被限制到最大值1.0
        expect(config.strategies[CacheStrategy.STRONG_TIMELINESS].updateThresholdRatio).toBeLessThanOrEqual(1.0);

        consoleSpy.mockRestore();
      });
    });

    describe('布尔型环境变量', () => {
      it('应该解析true值', () => {
        process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = 'true';
        process.env.SMART_CACHE_ENABLE_METRICS = '1';
        process.env.SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION = 'yes';

        const config = SmartCacheConfigFactory.createConfig();

        expect(config.enableBackgroundUpdate).toBe(true);
        expect(config.enableMetrics).toBe(true);
        expect(config.enableDataChangeDetection).toBe(true);
      });

      it('应该解析false值', () => {
        process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = 'false';
        process.env.SMART_CACHE_ENABLE_METRICS = '0';
        process.env.SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION = 'no';

        const config = SmartCacheConfigFactory.createConfig();

        expect(config.enableBackgroundUpdate).toBe(false);
        expect(config.enableMetrics).toBe(false);
        expect(config.enableDataChangeDetection).toBe(false);
      });

      it('应该处理无效的布尔值', () => {
        process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = 'maybe';

        const config = SmartCacheConfigFactory.createConfig();

        // 无效值应该被解析为false
        expect(config.enableBackgroundUpdate).toBe(false);
      });
    });
  });

  describe('配置验证', () => {
    describe('基础配置验证', () => {
      it('应该拒绝负的默认最小更新间隔', () => {
        process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '-1000';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝零或负的最大并发数', () => {
        process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '0';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝过大的并发数', () => {
        process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '100';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝负的优雅关闭超时', () => {
        process.env.SMART_CACHE_SHUTDOWN_TIMEOUT_MS = '-5000';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });
    });

    describe('强时效性策略验证', () => {
      it('应该拒绝负的TTL', () => {
        process.env.SMART_CACHE_STRONG_TTL_SECONDS = '-1';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝无效的更新阈值比率', () => {
        process.env.SMART_CACHE_STRONG_UPDATE_RATIO = '1.5';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝强制刷新间隔小于TTL的配置', () => {
        process.env.SMART_CACHE_STRONG_TTL_SECONDS = '10';
        process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '5000'; // 5秒，小于TTL

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });
    });

    describe('弱时效性策略验证', () => {
      it('应该拒绝负的TTL和最小更新间隔', () => {
        process.env.SMART_CACHE_WEAK_TTL_SECONDS = '-300';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝无效的更新阈值比率', () => {
        process.env.SMART_CACHE_WEAK_UPDATE_RATIO = '-0.1';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });
    });

    describe('市场感知策略验证', () => {
      it('应该拒绝负的TTL值', () => {
        process.env.SMART_CACHE_MARKET_AWARE_TTL_SECONDS = '-30';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝负的市场状态检查间隔', () => {
        process.env.SMART_CACHE_HEALTH_CHECK_INTERVAL_MS = '-300000';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝无效的市场更新阈值比率', () => {
        process.env.SMART_CACHE_MARKET_OPEN_UPDATE_RATIO = '2.0';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });
    });

    describe('自适应策略验证', () => {
      it('应该拒绝minTtl大于等于maxTtl的配置', () => {
        process.env.SMART_CACHE_ADAPTIVE_TTL_MIN_SECONDS = '1800';
        process.env.SMART_CACHE_ADAPTIVE_TTL_MAX_SECONDS = '1800';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝负的适应因子', () => {
        process.env.SMART_CACHE_ENABLE_ADAPTIVE_STRATEGY = '-1.0';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝baseTtl超出minTtl和maxTtl范围的配置', () => {
        process.env.SMART_CACHE_ADAPTIVE_TTL_BASE_SECONDS = '100';
        process.env.SMART_CACHE_ADAPTIVE_TTL_MIN_SECONDS = '200';
        process.env.SMART_CACHE_ADAPTIVE_TTL_MAX_SECONDS = '1800';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });

      it('应该拒绝负的变化检测窗口', () => {
        process.env.SMART_CACHE_HEALTH_CHECK_INTERVAL_MS = '-3600000';

        expect(() => {
          SmartCacheConfigFactory.createConfig();
        }).toThrow();
      });
    });

    it('应该抛出包含详细错误信息的异常', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '-1000';
      process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '0';

      try {
        SmartCacheConfigFactory.createConfig();
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error.message).toContain('configuration validation failed');
        expect(error.message).toContain('defaultMinUpdateInterval must be positive');
        expect(error.message).toContain('maxConcurrentUpdates must be positive');
      }
    });
  });

  describe('系统信息获取', () => {
    it('应该返回有效的系统信息', () => {
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      expect(systemInfo).toBeDefined();
      expect(systemInfo.cpuCores).toBeGreaterThan(0);
      expect(systemInfo.totalMemoryMB).toBeGreaterThan(0);
      expect(systemInfo.freeMemoryMB).toBeGreaterThan(0);
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.arch).toBe('string');
      expect(typeof systemInfo.nodeVersion).toBe('string');
    });

    it('系统信息应该包含所有必需字段', () => {
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      expect(systemInfo).toHaveProperty('cpuCores');
      expect(systemInfo).toHaveProperty('totalMemoryMB');
      expect(systemInfo).toHaveProperty('freeMemoryMB');
      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('arch');
      expect(systemInfo).toHaveProperty('nodeVersion');
    });
  });

  describe('环境变量获取', () => {
    it('应该返回当前环境变量状态', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL = '45000';
      process.env.CACHE_STRONG_TTL = '10';

      const envVars = SmartCacheConfigFactory.getCurrentEnvVars();

      expect(envVars).toBeDefined();
      expect(typeof envVars).toBe('object');
      expect(envVars.SMART_CACHE_MIN_UPDATE_INTERVAL).toBe('45000');
      expect(envVars.CACHE_STRONG_TTL).toBe('10');
    });

    it('应该包含所有预定义的环境变量键', () => {
      const envVars = SmartCacheConfigFactory.getCurrentEnvVars();

      const expectedKeys = [
        'SMART_CACHE_MIN_UPDATE_INTERVAL',
        'SMART_CACHE_MAX_CONCURRENT',
        'SMART_CACHE_SHUTDOWN_TIMEOUT',
        'SMART_CACHE_ENABLE_BACKGROUND_UPDATE',
        'SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION',
        'SMART_CACHE_ENABLE_METRICS',
        'CACHE_STRONG_TTL',
        'CACHE_WEAK_TTL',
        'CACHE_MARKET_OPEN_TTL',
        'CACHE_ADAPTIVE_BASE_TTL',
      ];

      expectedKeys.forEach(key => {
        expect(envVars).toHaveProperty(key);
      });
    });

    it('未设置的环境变量应该为undefined', () => {
      const envVars = SmartCacheConfigFactory.getCurrentEnvVars();

      // 大部分环境变量在测试中应该是undefined
      expect(envVars.SMART_CACHE_MIN_UPDATE_INTERVAL).toBeUndefined();
      expect(envVars.CACHE_STRONG_TTL).toBeUndefined();
    });
  });

  describe('详细模式配置', () => {
    it('应该在详细模式下输出更多日志', () => {
      process.env.SMART_CACHE_VERBOSE_CONFIG = 'true';

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      SmartCacheConfigFactory.createConfig();

      // 在详细模式下应该有更多的debug日志
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该在非详细模式下减少日志输出', () => {
      process.env.SMART_CACHE_VERBOSE_CONFIG = 'false';

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      SmartCacheConfigFactory.createConfig();

      // 在非详细模式下debug日志应该较少
      const debugCallCount = consoleSpy.mock.calls.length;
      expect(debugCallCount).toBeLessThan(10); // 假设在详细模式下会有更多

      consoleSpy.mockRestore();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空字符串环境变量', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '';
      process.env.SMART_CACHE_ENABLE_BACKGROUND_UPDATE = '';

      const config = SmartCacheConfigFactory.createConfig();

      // 空字符串应该被视为未设置，使用默认值
      expect(config.defaultMinUpdateInterval).toBeGreaterThan(0);
      expect(typeof config.enableBackgroundUpdate).toBe('boolean');
    });

    it('应该处理只包含空格的环境变量', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '   ';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = SmartCacheConfigFactory.createConfig();

      // 只包含空格的字符串应该被视为无效，使用默认值
      expect(config.defaultMinUpdateInterval).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('应该处理极大数值', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '999999999999';

      const config = SmartCacheConfigFactory.createConfig();

      // 极大数值应该被接受（如果在合理范围内）
      expect(config.defaultMinUpdateInterval).toBe(999999999999);
    });

    it('应该处理极小正数', () => {
      process.env.SMART_CACHE_MIN_UPDATE_INTERVAL_MS = '1';

      const config = SmartCacheConfigFactory.createConfig();

      expect(config.defaultMinUpdateInterval).toBe(1);
    });
  });

  describe('策略配置完整性', () => {
    it('所有策略都应该有完整的配置', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // 强时效性策略
      const strongConfig = config.strategies[CacheStrategy.STRONG_TIMELINESS];
      expect(strongConfig.ttl).toBeDefined();
      expect(strongConfig.enableBackgroundUpdate).toBeDefined();
      expect(strongConfig.updateThresholdRatio).toBeDefined();
      expect(strongConfig.forceRefreshInterval).toBeDefined();
      expect(strongConfig.enableDataChangeDetection).toBeDefined();

      // 弱时效性策略
      const weakConfig = config.strategies[CacheStrategy.WEAK_TIMELINESS];
      expect(weakConfig.ttl).toBeDefined();
      expect(weakConfig.enableBackgroundUpdate).toBeDefined();
      expect(weakConfig.updateThresholdRatio).toBeDefined();
      expect(weakConfig.minUpdateInterval).toBeDefined();
      expect(weakConfig.enableDataChangeDetection).toBeDefined();

      // 市场感知策略
      const marketConfig = config.strategies[CacheStrategy.MARKET_AWARE];
      expect(marketConfig.openMarketTtl).toBeDefined();
      expect(marketConfig.closedMarketTtl).toBeDefined();
      expect(marketConfig.enableBackgroundUpdate).toBeDefined();
      expect(marketConfig.marketStatusCheckInterval).toBeDefined();
      expect(marketConfig.openMarketUpdateThresholdRatio).toBeDefined();
      expect(marketConfig.closedMarketUpdateThresholdRatio).toBeDefined();
      expect(marketConfig.enableDataChangeDetection).toBeDefined();

      // 自适应策略
      const adaptiveConfig = config.strategies[CacheStrategy.ADAPTIVE];
      expect(adaptiveConfig.baseTtl).toBeDefined();
      expect(adaptiveConfig.minTtl).toBeDefined();
      expect(adaptiveConfig.maxTtl).toBeDefined();
      expect(adaptiveConfig.adaptationFactor).toBeDefined();
      expect(adaptiveConfig.enableBackgroundUpdate).toBeDefined();
      expect(adaptiveConfig.changeDetectionWindow).toBeDefined();
      expect(adaptiveConfig.enableDataChangeDetection).toBeDefined();

      // 无缓存策略
      const noCacheConfig = config.strategies[CacheStrategy.NO_CACHE];
      expect(noCacheConfig.bypassCache).toBeDefined();
      expect(noCacheConfig.enableMetrics).toBeDefined();
    });
  });
});