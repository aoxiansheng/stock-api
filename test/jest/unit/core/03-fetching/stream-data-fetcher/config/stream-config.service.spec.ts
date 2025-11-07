import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StreamConfigService, StreamDataFetcherConfig } from '@core/03-fetching/stream-data-fetcher/config/stream-config.service';
import { StreamConfigDefaults } from '@core/03-fetching/stream-data-fetcher/config/stream-config-defaults.constants';
import { UniversalExceptionFactory } from '@common/core/exceptions';

describe('StreamConfigService', () => {
  let service: StreamConfigService;
  let configService: ConfigService;

  // 兼容新接口，移除未使用的 createValidConfig

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock StreamConfigDefaults
    jest.spyOn(StreamConfigDefaults, 'getFullConfig').mockReturnValue({
      connections: {
        maxGlobal: 1000,
        maxPerKey: 100,
        maxPerIP: 10,
        maxPerUser: 5,
        timeout: 30000,
        heartbeatInterval: 25000,
      },
      performance: {
        slowResponseMs: 2000,
        maxTimePerSymbolMs: 500,
        maxSymbolsPerBatch: 50,
        logSymbolsLimit: 10,
        batchConcurrency: 10,
        concurrency: {
          initial: 10,
          min: 2,
          max: 50,
          adjustmentFactor: 0.2,
          stabilizationPeriodMs: 30000,
        },
        thresholds: {
          responseTimeMs: { excellent: 100, good: 500, poor: 2000 },
          successRate: { excellent: 0.98, good: 0.9, poor: 0.8 },
        },
        circuitBreaker: {
          recoveryDelayMs: 60000,
          failureThreshold: 0.5,
        },
        concurrencyAdjustmentIntervalMs: 30000,
      },
      fetching: {
        timeout: 5000,
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 50,
      },
      cache: {
        defaultTtl: 300,
        realtimeTtl: 5,
        historicalTtl: 3600,
      },
      rateLimiting: {
        messagesPerMinute: 120,
        burstMessages: 20,
        maxSubscriptionsPerConnection: 50,
      },
      websocket: {
        port: 3001,
        path: '/socket.io',
        cors: {
          origin: true,
          credentials: true,
        },
      },
      monitoring: {
        enabled: true,
        interval: 10000,
        collectMetrics: true,
      },
      security: {
        enableIpWhitelist: false,
        requireApiKey: true,
        requireJwtAuth: false,
      },
    });

    jest.spyOn(StreamConfigDefaults, 'getEnvValue').mockImplementation((key: string, defaultValue: any) => {
      const envValues: Record<string, any> = {
        'HEALTHCHECK_CONCURRENCY': 10,
        'HEALTHCHECK_TIMEOUT_MS': 5000,
        'HEALTHCHECK_RETRIES': 1,
        'HEALTHCHECK_SKIP_UNRESPONSIVE': true,
        'HEALTHCHECK_RATE_THRESHOLD': 50,
        'STREAM_SLOW_RESPONSE_MS': 2000,
        'STREAM_MAX_TIME_PER_SYMBOL_MS': 500,
        'STREAM_LOG_SYMBOLS_LIMIT': 10,
        'STREAM_BATCH_CONCURRENCY': 10,
        'STREAM_POLLING_INTERVAL_MS': 100,
        'STREAM_CONNECTION_POLLING_INTERVAL_MS': 100,
        'STREAM_HTTP_RATE_LIMIT_TTL': 60,
        'STREAM_HTTP_RATE_LIMIT_COUNT': 100,
        'STREAM_HTTP_BURST_LIMIT': 20,
        'STREAM_POOL_STATS_REPORT_INTERVAL': 300000,
      };
      return envValues[key] !== undefined ? envValues[key] : defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<StreamConfigService>(StreamConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamConfigService);
    });

    it('应该在构造函数中加载并验证配置', () => {
      expect(StreamConfigDefaults.getFullConfig).toHaveBeenCalled();
      expect(StreamConfigDefaults.getEnvValue).toHaveBeenCalled();
    });

    it('应该加载所有必需的配置部分', () => {
      const config = service.getConfig();

      expect(config.connections).toBeDefined();
      expect(config.healthCheck).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.polling).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });
  });

  describe('配置获取方法', () => {
    it('应该返回完整配置的副本', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // 应该是不同的对象引用
    });

    it('应该返回连接配置', () => {
      const connectionConfig = service.getConnectionConfig();

      expect(connectionConfig).toBeDefined();
      expect(connectionConfig.maxGlobal).toBeDefined();
      expect(connectionConfig.maxPerKey).toBeDefined();
      expect(connectionConfig.maxPerIP).toBeDefined();
      expect(connectionConfig.timeoutMs).toBeDefined();
    });

    it('应该返回健康检查配置', () => {
      const healthConfig = service.getHealthCheckConfig();

      expect(healthConfig).toBeDefined();
      expect(healthConfig.concurrency).toBeDefined();
      expect(healthConfig.timeoutMs).toBeDefined();
      expect(healthConfig.retries).toBeDefined();
      expect(healthConfig.skipUnresponsive).toBeDefined();
      expect(healthConfig.healthRateThreshold).toBeDefined();
    });

    it('应该返回性能配置', () => {
      const perfConfig = service.getPerformanceConfig();

      expect(perfConfig).toBeDefined();
      expect(perfConfig.slowResponseMs).toBeDefined();
      expect(perfConfig.maxTimePerSymbolMs).toBeDefined();
      expect(perfConfig.maxSymbolsPerBatch).toBeDefined();
      expect(perfConfig.logSymbolsLimit).toBeDefined();
      expect(perfConfig.batchConcurrency).toBeDefined();
    });

    it('应该返回轮询配置', () => {
      const pollingConfig = service.getPollingConfig();

      expect(pollingConfig).toBeDefined();
      expect(pollingConfig.intervalMs).toBeDefined();
      expect(pollingConfig.connectionIntervalMs).toBeDefined();
    });

    it('应该返回安全配置', () => {
      const securityConfig = service.getSecurityConfig();

      expect(securityConfig).toBeDefined();
      expect(securityConfig.http).toBeDefined();
      expect(securityConfig.websocket).toBeDefined();
      expect(securityConfig.http.rateLimitTtl).toBeDefined();
      expect(securityConfig.websocket.maxConnectionsPerIP).toBeDefined();
    });

    it('应该返回监控配置', () => {
      const monitoringConfig = service.getMonitoringConfig();

      expect(monitoringConfig).toBeDefined();
      expect(monitoringConfig.enableVerboseLogging).toBeDefined();
      expect(monitoringConfig.metricsCollectionInterval).toBeDefined();
      expect(monitoringConfig.poolStatsReportInterval).toBeDefined();
    });
  });

  describe('配置验证', () => {
    it('应该验证有效的配置', () => {
      // 构造函数中已经调用了验证，如果没有抛出异常说明验证通过
      expect(() => service.getConfig()).not.toThrow();
    });

    it('应该在maxGlobal <= 0时抛出验证错误', () => {
      // 创建一个新的服务实例来测试验证失败的情况
      const defaultConfig = StreamConfigDefaults.getFullConfig();
      jest.spyOn(StreamConfigDefaults, 'getFullConfig').mockReturnValueOnce({
        ...defaultConfig,
        connections: {
          ...defaultConfig.connections,
          maxGlobal: 0 as any, // 无效值
        },
      });

      expect(() => {
        new StreamConfigService(configService);
      }).toThrow();
    });

    it('应该在maxPerKey > maxGlobal时抛出验证错误', () => {
      const defaultConfig = StreamConfigDefaults.getFullConfig();
      jest.spyOn(StreamConfigDefaults, 'getFullConfig').mockReturnValueOnce({
        ...defaultConfig,
        connections: {
          ...defaultConfig.connections,
          maxGlobal: 100 as any,
          maxPerKey: 200 as any, // 大于maxGlobal
        },
      });

      expect(() => {
        new StreamConfigService(configService);
      }).toThrow();
    });

    it('应该在健康检查并发度 <= 0时抛出验证错误', () => {
      jest.spyOn(StreamConfigDefaults, 'getEnvValue').mockImplementation((key: string, defaultValue: any) => {
        if (key === 'HEALTHCHECK_CONCURRENCY') return 0; // 无效值
        return defaultValue;
      });

      expect(() => {
        new StreamConfigService(configService);
      }).toThrow();
    });

    it('应该在批量并发度 <= 0时抛出验证错误', () => {
      jest.spyOn(StreamConfigDefaults, 'getEnvValue').mockImplementation((key: string, defaultValue: any) => {
        if (key === 'STREAM_BATCH_CONCURRENCY') return 0; // 无效值
        return defaultValue;
      });

      expect(() => {
        new StreamConfigService(configService);
      }).toThrow();
    });

    it('应该在重试次数 < 0时抛出验证错误', () => {
      jest.spyOn(StreamConfigDefaults, 'getEnvValue').mockImplementation((key: string, defaultValue: any) => {
        if (key === 'HEALTHCHECK_RETRIES') return -1; // 无效值
        return defaultValue;
      });

      expect(() => {
        new StreamConfigService(configService);
      }).toThrow();
    });
  });

  describe('配置更新', () => {
    it('应该成功更新部分配置', () => {
      const originalConfig = service.getConfig();
      const updateConfig: Partial<StreamDataFetcherConfig> = {
        connections: {
          ...originalConfig.connections,
          maxGlobal: 2000,
        },
        performance: {
          ...originalConfig.performance,
          batchConcurrency: 20,
        },
      };

      expect(() => service.updateConfig(updateConfig)).not.toThrow();

      const updatedConfig = service.getConfig();
      expect(updatedConfig.connections.maxGlobal).toBe(2000);
      expect(updatedConfig.performance.batchConcurrency).toBe(20);
    });

    it('应该在更新无效配置时抛出验证错误', () => {
      const invalidUpdate: Partial<StreamDataFetcherConfig> = {
        connections: {
          maxGlobal: -1, // 无效值
          maxPerKey: 100,
          maxPerIP: 10,
          timeoutMs: 30000,
        },
      };

      expect(() => service.updateConfig(invalidUpdate)).toThrow();
    });

    it('应该在更新后保持其他配置不变', () => {
      const originalConfig = service.getConfig();
      const updateConfig: Partial<StreamDataFetcherConfig> = {
        polling: {
          intervalMs: 200,
          connectionIntervalMs: 150,
        },
      };

      service.updateConfig(updateConfig);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.polling.intervalMs).toBe(200);
      expect(updatedConfig.polling.connectionIntervalMs).toBe(150);

      // 其他配置应该保持不变
      expect(updatedConfig.connections).toEqual(originalConfig.connections);
      expect(updatedConfig.healthCheck).toEqual(originalConfig.healthCheck);
      expect(updatedConfig.performance).toEqual(originalConfig.performance);
    });

    it('应该深度合并嵌套对象配置', () => {
      const originalConfig = service.getConfig();
      const updateConfig: Partial<StreamDataFetcherConfig> = {
        security: {
          http: {
            rateLimitTtl: 120, // 只更新这一个字段
            rateLimitCount: originalConfig.security.http.rateLimitCount,
            burstLimit: originalConfig.security.http.burstLimit,
          },
          websocket: originalConfig.security.websocket, // 保持不变
        },
      };

      service.updateConfig(updateConfig);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.security.http.rateLimitTtl).toBe(120);
      expect(updatedConfig.security.http.rateLimitCount).toBe(originalConfig.security.http.rateLimitCount);
      expect(updatedConfig.security.websocket).toEqual(originalConfig.security.websocket);
    });
  });

  describe('配置默认值', () => {
    it('应该使用正确的连接配置默认值', () => {
      const connectionConfig = service.getConnectionConfig();

      expect(connectionConfig.maxGlobal).toBe(1000);
      expect(connectionConfig.maxPerKey).toBe(100);
      expect(connectionConfig.maxPerIP).toBe(10);
      expect(connectionConfig.timeoutMs).toBe(30000);
    });

    it('应该使用正确的健康检查配置默认值', () => {
      const healthConfig = service.getHealthCheckConfig();

      expect(healthConfig.concurrency).toBe(10);
      expect(healthConfig.timeoutMs).toBe(5000);
      expect(healthConfig.retries).toBe(1);
      expect(healthConfig.skipUnresponsive).toBe(true);
      expect(healthConfig.healthRateThreshold).toBe(50);
    });

    it('应该使用正确的性能配置默认值', () => {
      const perfConfig = service.getPerformanceConfig();

      expect(perfConfig.slowResponseMs).toBe(2000);
      expect(perfConfig.maxTimePerSymbolMs).toBe(500);
      expect(perfConfig.maxSymbolsPerBatch).toBe(50);
      expect(perfConfig.logSymbolsLimit).toBe(10);
      expect(perfConfig.batchConcurrency).toBe(10);
    });
  });

  describe('配置脱敏和日志', () => {
    it('应该正确脱敏配置信息', () => {
      const config = service.getConfig();
      const sanitized = (service as any).sanitizeConfigForLogging(config);

      expect(sanitized).toBeDefined();
      expect(sanitized._configSummary).toBeDefined();
      expect(sanitized._configSummary.totalConnections).toBe(config.connections.maxGlobal);
      expect(sanitized._configSummary.healthCheckEnabled).toBe(true);
      expect(sanitized._configSummary.securityEnabled).toBe(true);
    });
  });

  describe('深度合并功能', () => {
    it('应该正确深度合并对象', () => {
      const target = {
        a: { x: 1, y: 2 },
        b: { z: 3 },
      };
      const source = {
        a: { y: 20, w: 4 },
        c: { v: 5 },
      };

      const result = (service as any).deepMerge(target, source);

      expect(result).toEqual({
        a: { x: 1, y: 20, w: 4 },
        b: { z: 3 },
        c: { v: 5 },
      });
    });

    it('应该处理null和数组值', () => {
      const target = {
        a: { x: 1 },
        b: [1, 2, 3],
      };
      const source = {
        a: null,
        b: [4, 5, 6],
        c: undefined,
      };

      const result = (service as any).deepMerge(target, source);

      expect(result.a).toBe(null);
      expect(result.b).toEqual([4, 5, 6]);
      expect(result.c).toBe(undefined);
    });
  });

  describe('配置更改检测', () => {
    it('应该正确检测配置字段的更改', () => {
      const oldConfig = {
        a: { x: 1, y: 2 },
        b: 3,
      };
      const newConfig = {
        a: { x: 1, y: 20 },
        b: 3,
        c: 4,
      };

      const updatedFields = (service as any).getUpdatedFields(oldConfig, newConfig);

      expect(updatedFields).toContain('a.y');
      expect(updatedFields).toContain('c');
      expect(updatedFields).not.toContain('a.x');
      expect(updatedFields).not.toContain('b');
    });

    it('应该处理嵌套对象的更改', () => {
      const oldConfig = {
        level1: {
          level2: {
            value: 'old',
          },
        },
      };
      const newConfig = {
        level1: {
          level2: {
            value: 'new',
          },
        },
      };

      const updatedFields = (service as any).getUpdatedFields(oldConfig, newConfig);

      expect(updatedFields).toContain('level1.level2.value');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的部分配置更新', () => {
      expect(() => service.updateConfig({})).not.toThrow();
    });

    it('应该处理只有一个字段的配置更新', () => {
      const singleFieldUpdate: Partial<StreamDataFetcherConfig> = {
        polling: {
          intervalMs: 500,
          connectionIntervalMs: service.getPollingConfig().connectionIntervalMs,
        },
      };

      expect(() => service.updateConfig(singleFieldUpdate)).not.toThrow();
      expect(service.getPollingConfig().intervalMs).toBe(500);
    });
  });
});
