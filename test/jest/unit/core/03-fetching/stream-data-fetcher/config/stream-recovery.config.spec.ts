import { Test, TestingModule } from '@nestjs/testing';
import {
  StreamRecoveryConfigService,
  StreamRecoveryConfig,
  StreamRecoveryRateLimitConfig,
  DelayStrategyConfig,
} from '@core/03-fetching/stream-data-fetcher/config/stream-recovery.config';

describe('StreamRecoveryConfigService', () => {
  let service: StreamRecoveryConfigService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamRecoveryConfigService],
    }).compile();

    service = module.get<StreamRecoveryConfigService>(StreamRecoveryConfigService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamRecoveryConfigService);
    });

    it('应该加载默认配置', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.queue).toBeDefined();
      expect(config.worker).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.priorityWeights).toBeDefined();
      expect(config.recovery).toBeDefined();
      expect(config.reconnect).toBeDefined();
      expect(config.cleanup).toBeDefined();
    });
  });

  describe('默认配置值', () => {
    beforeEach(() => {
      // 确保没有环境变量干扰
      Object.keys(process.env)
        .filter(key => key.startsWith('RECOVERY_') || key.startsWith('RECONNECT_') || key.includes('REDIS'))
        .forEach(key => delete process.env[key]);
    });

    it('应该使用正确的队列默认配置', () => {
      const config = service.getConfig();

      expect(config.queue.name).toBe('stream-recovery');
      expect(config.queue.redis.host).toBe('localhost');
      expect(config.queue.redis.port).toBe(6379);
    });

    it('应该使用正确的worker默认配置', () => {
      const config = service.getConfig();

      expect(config.worker.concurrency).toBe(4);
      expect(config.worker.maxRetries).toBe(3);
      expect(config.worker.retryDelay).toBe(5000);
    });

    it('应该使用正确的默认限流配置', () => {
      const config = service.getConfig();

      expect(config.rateLimit.default.maxQPS).toBe(100);
      expect(config.rateLimit.default.burstSize).toBe(150);
      expect(config.rateLimit.default.window).toBe(1000);
    });

    it('应该使用正确的提供商限流配置', () => {
      const config = service.getConfig();

      expect(config.rateLimit.providers.longport.maxQPS).toBe(200);
      expect(config.rateLimit.providers.longport.burstSize).toBe(250);
      expect(config.rateLimit.providers.itick.maxQPS).toBe(50);
      expect(config.rateLimit.providers.itick.burstSize).toBe(75);
    });

    it('应该使用正确的优先级权重', () => {
      const config = service.getConfig();

      expect(config.priorityWeights.high).toBe(100);
      expect(config.priorityWeights.normal).toBe(50);
      expect(config.priorityWeights.low).toBe(10);
    });

    it('应该使用正确的恢复配置', () => {
      const config = service.getConfig();

      expect(config.recovery.maxRecoveryWindow).toBe(300000); // 5分钟
      expect(config.recovery.batchSize).toBe(100);
      expect(config.recovery.maxDataPoints).toBe(10000);
    });

    it('应该使用正确的重连配置', () => {
      const config = service.getConfig();

      expect(config.reconnect.maxAttempts).toBe(5);
      expect(config.reconnect.delayStrategy.type).toBe('exponential');
      expect(config.reconnect.delayStrategy.initialDelay).toBe(1000);
      expect(config.reconnect.delayStrategy.maxDelay).toBe(30000);
      expect(config.reconnect.delayStrategy.factor).toBe(2);
      expect(config.reconnect.autoRestoreSubscriptions).toBe(true);
      expect(config.reconnect.autoRecoverData).toBe(true);
      expect(config.reconnect.recoveryPriority).toBe('normal');
      expect(config.reconnect.heartbeatTimeout).toBe(60000);
    });

    it('应该使用正确的清理配置', () => {
      const config = service.getConfig();

      expect(config.cleanup.removeOnComplete).toBe(1000);
      expect(config.cleanup.removeOnFail).toBe(5000);
    });
  });

  describe('环境变量配置', () => {
    it('应该使用环境变量覆盖队列配置', () => {
      process.env.RECOVERY_QUEUE_NAME = 'custom-queue';
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';

      const newService = new StreamRecoveryConfigService();
      const config = newService.getConfig();

      expect(config.queue.name).toBe('custom-queue');
      expect(config.queue.redis.host).toBe('redis.example.com');
      expect(config.queue.redis.port).toBe(6380);
    });

    it('应该使用环境变量覆盖worker配置', () => {
      process.env.RECOVERY_WORKER_CONCURRENCY = '8';
      process.env.RECOVERY_MAX_RETRIES = '5';
      process.env.RECOVERY_RETRY_DELAY = '10000';

      const newService = new StreamRecoveryConfigService();
      const config = newService.getConfig();

      expect(config.worker.concurrency).toBe(8);
      expect(config.worker.maxRetries).toBe(5);
      expect(config.worker.retryDelay).toBe(10000);
    });

    it('应该使用环境变量覆盖限流配置', () => {
      process.env.RECOVERY_DEFAULT_QPS = '200';
      process.env.RECOVERY_DEFAULT_BURST = '300';
      process.env.RECOVERY_RATE_WINDOW = '2000';

      const newService = new StreamRecoveryConfigService();
      const config = newService.getConfig();

      expect(config.rateLimit.default.maxQPS).toBe(200);
      expect(config.rateLimit.default.burstSize).toBe(300);
      expect(config.rateLimit.default.window).toBe(2000);
    });

    it('应该使用环境变量覆盖重连配置', () => {
      process.env.RECONNECT_MAX_ATTEMPTS = '10';
      process.env.RECONNECT_DELAY_TYPE = 'linear';
      process.env.RECONNECT_INITIAL_DELAY = '2000';
      process.env.RECONNECT_MAX_DELAY = '60000';
      process.env.RECONNECT_AUTO_RESTORE = 'false';
      process.env.RECONNECT_AUTO_RECOVER = 'false';

      const newService = new StreamRecoveryConfigService();
      const config = newService.getConfig();

      expect(config.reconnect.maxAttempts).toBe(10);
      expect(config.reconnect.delayStrategy.type).toBe('linear');
      expect(config.reconnect.delayStrategy.initialDelay).toBe(2000);
      expect(config.reconnect.delayStrategy.maxDelay).toBe(60000);
      expect(config.reconnect.autoRestoreSubscriptions).toBe(false);
      expect(config.reconnect.autoRecoverData).toBe(false);
    });

    it('应该处理无效的环境变量值', () => {
      process.env.RECOVERY_WORKER_CONCURRENCY = 'invalid-number';
      process.env.REDIS_PORT = 'not-a-port';

      const newService = new StreamRecoveryConfigService();
      const config = newService.getConfig();

      // 应该回退到默认值
      expect(config.worker.concurrency).toBe(4);
      expect(config.queue.redis.port).toBe(6379);
    });
  });

  describe('限流配置方法', () => {
    it('应该返回指定提供商的限流配置', () => {
      const longportConfig = service.getRateLimitConfig('longport');

      expect(longportConfig.maxQPS).toBe(200);
      expect(longportConfig.burstSize).toBe(250);
      expect(longportConfig.window).toBe(60000);
    });

    it('应该返回itick提供商的限流配置', () => {
      const itickConfig = service.getRateLimitConfig('itick');

      expect(itickConfig.maxQPS).toBe(50);
      expect(itickConfig.burstSize).toBe(75);
      expect(itickConfig.window).toBe(60000);
    });

    it('应该为未知提供商返回默认限流配置', () => {
      const unknownConfig = service.getRateLimitConfig('unknown-provider');

      expect(unknownConfig.maxQPS).toBe(100);
      expect(unknownConfig.burstSize).toBe(150);
      expect(unknownConfig.window).toBe(1000);
    });

    it('应该处理空字符串提供商名称', () => {
      const emptyConfig = service.getRateLimitConfig('');

      expect(emptyConfig).toEqual(service.getConfig().rateLimit.default);
    });
  });

  describe('优先级权重方法', () => {
    it('应该返回高优先级权重', () => {
      expect(service.getPriorityWeight('high')).toBe(100);
    });

    it('应该返回普通优先级权重', () => {
      expect(service.getPriorityWeight('normal')).toBe(50);
    });

    it('应该返回低优先级权重', () => {
      expect(service.getPriorityWeight('low')).toBe(10);
    });
  });

  describe('恢复时间窗口验证', () => {
    it('应该识别在恢复窗口内的时间差', () => {
      const config = service.getConfig();
      const timeDiff = config.recovery.maxRecoveryWindow - 1000; // 比最大窗口小1秒

      expect(service.isWithinRecoveryWindow(timeDiff)).toBe(true);
    });

    it('应该识别超出恢复窗口的时间差', () => {
      const config = service.getConfig();
      const timeDiff = config.recovery.maxRecoveryWindow + 1000; // 比最大窗口大1秒

      expect(service.isWithinRecoveryWindow(timeDiff)).toBe(false);
    });

    it('应该处理边界值', () => {
      const config = service.getConfig();

      expect(service.isWithinRecoveryWindow(config.recovery.maxRecoveryWindow)).toBe(true);
      expect(service.isWithinRecoveryWindow(0)).toBe(true);
    });

    it('应该处理负数时间差', () => {
      expect(service.isWithinRecoveryWindow(-1000)).toBe(true);
    });
  });

  describe('重连延迟计算', () => {
    beforeEach(() => {
      // 重置为默认的exponential策略
      process.env = { ...originalEnv };
    });

    it('应该计算指数延迟策略', () => {
      const delay1 = service.getReconnectDelay(1);
      const delay2 = service.getReconnectDelay(2);
      const delay3 = service.getReconnectDelay(3);

      expect(delay1).toBe(1000); // initialDelay * 2^(1-1) = 1000 * 1
      expect(delay2).toBe(2000); // initialDelay * 2^(2-1) = 1000 * 2
      expect(delay3).toBe(4000); // initialDelay * 2^(3-1) = 1000 * 4
    });

    it('应该限制指数延迟的最大值', () => {
      const delay10 = service.getReconnectDelay(10);

      expect(delay10).toBe(30000); // 应该被限制在maxDelay
    });

    it('应该计算固定延迟策略', () => {
      process.env.RECONNECT_DELAY_TYPE = 'fixed';

      const newService = new StreamRecoveryConfigService();

      const delay1 = newService.getReconnectDelay(1);
      const delay5 = newService.getReconnectDelay(5);

      expect(delay1).toBe(1000);
      expect(delay5).toBe(1000);
    });

    it('应该计算线性延迟策略', () => {
      process.env.RECONNECT_DELAY_TYPE = 'linear';

      const newService = new StreamRecoveryConfigService();

      const delay1 = newService.getReconnectDelay(1);
      const delay3 = newService.getReconnectDelay(3);
      const delay5 = newService.getReconnectDelay(5);

      expect(delay1).toBe(1000); // initialDelay * 1
      expect(delay3).toBe(3000); // initialDelay * 3
      expect(delay5).toBe(5000); // initialDelay * 5
    });

    it('应该限制线性延迟的最大值', () => {
      process.env.RECONNECT_DELAY_TYPE = 'linear';
      process.env.RECONNECT_MAX_DELAY = '10000';

      const newService = new StreamRecoveryConfigService();

      const delay20 = newService.getReconnectDelay(20);

      expect(delay20).toBe(10000); // 应该被限制在maxDelay
    });

    it('应该处理自定义指数因子', () => {
      process.env.RECONNECT_DELAY_FACTOR = '3';

      const newService = new StreamRecoveryConfigService();

      const delay1 = newService.getReconnectDelay(1);
      const delay2 = newService.getReconnectDelay(2);

      expect(delay1).toBe(1000); // initialDelay * 3^(1-1) = 1000 * 1
      expect(delay2).toBe(3000); // initialDelay * 3^(2-1) = 1000 * 3
    });
  });

  describe('动态配置更新', () => {
    it('应该成功更新提供商限流配置', () => {
      const newConfig: StreamRecoveryRateLimitConfig = {
        maxQPS: 500,
        burstSize: 600,
        window: 2000,
      };

      service.updateRateLimit('custom-provider', newConfig);

      const updatedConfig = service.getRateLimitConfig('custom-provider');
      expect(updatedConfig).toEqual(newConfig);
    });

    it('应该覆盖现有提供商的限流配置', () => {
      const newLongportConfig: StreamRecoveryRateLimitConfig = {
        maxQPS: 1000,
        burstSize: 1200,
        window: 30000,
      };

      service.updateRateLimit('longport', newLongportConfig);

      const updatedConfig = service.getRateLimitConfig('longport');
      expect(updatedConfig).toEqual(newLongportConfig);

      // 其他提供商不应受影响
      const itickConfig = service.getRateLimitConfig('itick');
      expect(itickConfig.maxQPS).toBe(50);
    });
  });

  describe('配置摘要', () => {
    it('应该返回正确的配置摘要', () => {
      const summary = service.getConfigSummary();

      expect(summary).toBeDefined();
      expect(summary.queue).toBe('stream-recovery');
      expect(summary.workerConcurrency).toBe(4);
      expect(summary.maxRecoveryWindow).toBe(300000);
      expect(summary.providers).toEqual(['longport', 'itick']);
      expect(summary.rateLimits).toBeDefined();
      expect(summary.rateLimits.longport).toEqual({ maxQPS: 200, burstSize: 250 });
      expect(summary.rateLimits.itick).toEqual({ maxQPS: 50, burstSize: 75 });
    });

    it('应该在添加新提供商后更新摘要', () => {
      const newConfig: StreamRecoveryRateLimitConfig = {
        maxQPS: 300,
        burstSize: 400,
        window: 1500,
      };

      service.updateRateLimit('new-provider', newConfig);

      const summary = service.getConfigSummary();
      expect(summary.providers).toContain('new-provider');
      expect(summary.rateLimits['new-provider']).toEqual({ maxQPS: 300, burstSize: 400 });
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理尝试次数为0或负数的重连延迟', () => {
      expect(service.getReconnectDelay(0)).toBe(500); // 0的情况，2^(0-1) = 0.5
      expect(service.getReconnectDelay(-1)).toBe(250); // -1的情况，2^(-1-1) = 0.25
    });

    it('应该处理极大的尝试次数', () => {
      const largeAttempt = service.getReconnectDelay(1000);
      expect(largeAttempt).toBe(30000); // 应该被限制在maxDelay
    });

    it('应该处理无效的延迟策略类型', () => {
      process.env.RECONNECT_DELAY_TYPE = 'invalid-type';

      const newService = new StreamRecoveryConfigService();

      // 应该回退到exponential策略
      const delay1 = newService.getReconnectDelay(1);
      const delay2 = newService.getReconnectDelay(2);

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
    });
  });

  describe('配置类型安全', () => {
    it('应该维护正确的类型定义', () => {
      const config = service.getConfig();

      expect(typeof config.queue.name).toBe('string');
      expect(typeof config.queue.redis.port).toBe('number');
      expect(typeof config.worker.concurrency).toBe('number');
      expect(typeof config.reconnect.autoRestoreSubscriptions).toBe('boolean');
      expect(typeof config.reconnect.delayStrategy.type).toBe('string');
      expect(['fixed', 'exponential', 'linear']).toContain(config.reconnect.delayStrategy.type);
    });

    it('应该有正确的优先级枚举值', () => {
      const config = service.getConfig();

      expect(['high', 'normal', 'low']).toContain(config.reconnect.recoveryPriority);
    });
  });
});
