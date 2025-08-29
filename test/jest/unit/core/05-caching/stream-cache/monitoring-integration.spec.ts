import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StreamCacheService } from '../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import { 
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
  MONITORING_COLLECTOR_TOKEN
} from '../../../../../../src/monitoring/contracts';

describe('StreamCache Monitoring Integration', () => {
  let service: StreamCacheService;
  let mockRedisClient: Partial<Redis>;
  let mockCollectorService: any;

  const createMockRedisClient = () => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('{"data":"test"}'),
    del: jest.fn().mockResolvedValue(1),
    flushdb: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
  });

  const createMockCollectorService = () => ({
    recordSystemMetrics: jest.fn(),
    recordCacheOperation: jest.fn(),
    recordRequest: jest.fn(),
    recordDatabaseOperation: jest.fn(),
    getRawMetrics: jest.fn().mockResolvedValue({}),
    getSystemMetrics: jest.fn().mockResolvedValue({}),
    cleanup: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    mockRedisClient = createMockRedisClient();
    mockCollectorService = createMockCollectorService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedisClient,
        },
        {
          provide: STREAM_CACHE_CONFIG_TOKEN,
          useValue: {
            hotCacheTTL: 30000,
            warmCacheTTL: 300,
            maxHotCacheSize: 100,
            cleanupInterval: 60000,
            compressionThreshold: 1024,
          },
        },
        {
          provide: MONITORING_COLLECTOR_TOKEN,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<StreamCacheService>(StreamCacheService);
  });

  describe('Health Status Monitoring', () => {
    it('应该生成包含所有必需字段的健康状态', async () => {
      const healthStatus = await service.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        hotCacheSize: expect.any(Number),
        redisConnected: expect.any(Boolean),
        lastError: expect.any(String) || null,
      });
    });

    it('应该在Redis连接正常时报告healthy状态', async () => {
      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.redisConnected).toBe(true);
      expect(healthStatus.lastError).toBeNull();
    });

    it('应该在Redis连接失败时报告unhealthy状态', async () => {
      // Mock Redis ping failure
      mockRedisClient.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.redisConnected).toBe(false);
      expect(healthStatus.lastError).toBe('Connection failed');
    });

    it('应该在缓存操作失败时报告degraded状态', async () => {
      // Mock successful ping but failed cache operations
      mockRedisClient.set = jest.fn().mockRejectedValue(new Error('Set operation failed'));

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.redisConnected).toBe(true);
      expect(healthStatus.lastError).toBe('Set operation failed');
    });
  });

  describe('Monitoring Data Reporting', () => {
    it('应该成功向CollectorService报告系统指标', async () => {
      await service.reportMetricsToCollector();

      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalledWith({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });

    it('应该在CollectorService失败时优雅处理不抛出异常', async () => {
      mockCollectorService.recordSystemMetrics.mockImplementation(() => {
        throw new Error('Collector service unavailable');
      });

      await expect(service.reportMetricsToCollector()).resolves.toBeUndefined();
      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalled();
    });

    it('应该报告准确的系统指标数据', async () => {
      // 执行一些缓存操作来生成指标
      const testData = [{ s: 'TEST', p: 100, v: 1000, t: Date.now() }];
      await service.setData('metrics-test', testData);

      await service.reportMetricsToCollector();

      const callArgs = mockCollectorService.recordSystemMetrics.mock.calls[0][0];
      
      expect(callArgs).toMatchObject({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });

      // 验证内存百分比计算正确
      expect(callArgs.memory.percentage).toBeGreaterThan(0);
      expect(callArgs.memory.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Fault Tolerance', () => {
    it('应该在没有CollectorService时仍正常运行', async () => {
      // 创建一个没有CollectorService的service实例
      const moduleWithoutCollector = await Test.createTestingModule({
        providers: [
          StreamCacheService,
          {
            provide: CACHE_REDIS_CLIENT_TOKEN,
            useValue: mockRedisClient,
          },
          {
            provide: STREAM_CACHE_CONFIG_TOKEN,
            useValue: {
              hotCacheTTL: 30000,
              warmCacheTTL: 300,
              maxHotCacheSize: 100,
              cleanupInterval: 60000,
              compressionThreshold: 1024,
            },
          },
          // 不提供CollectorService
        ],
      }).compile();

      const serviceWithoutCollector = moduleWithoutCollector.get<StreamCacheService>(StreamCacheService);

      // 核心功能应该仍然工作
      const testData = [{ s: 'TEST', p: 100, v: 1000, t: Date.now() }];
      await expect(serviceWithoutCollector.setData('test-key', testData)).resolves.toBeUndefined();
    });

    it('应该处理健康检查期间的各种错误情况', async () => {
      // 测试多种错误情况
      const errorScenarios = [
        { 
          setup: () => { mockRedisClient.ping = jest.fn().mockRejectedValue(new Error('Network error')); },
          expectedStatus: 'unhealthy'
        },
        {
          setup: () => { 
            mockRedisClient.ping = jest.fn().mockResolvedValue('PONG');
            mockRedisClient.set = jest.fn().mockRejectedValue(new Error('Memory full'));
          },
          expectedStatus: 'degraded'
        }
      ];

      for (const scenario of errorScenarios) {
        scenario.setup();
        const healthStatus = await service.getHealthStatus();
        expect(healthStatus.status).toBe(scenario.expectedStatus);
      }
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('应该正确处理监控数据收集的完整生命周期', async () => {
      // 1. 初始健康检查
      const initialHealth = await service.getHealthStatus();
      expect(initialHealth.status).toBe('healthy');

      // 2. 执行一些缓存操作
      const testData = [{ s: 'STOCK1', p: 150.5, v: 2000, t: Date.now() }];
      await service.setData('lifecycle-test', testData);
      
      // 3. 报告监控指标
      await service.reportMetricsToCollector();

      // 4. 验证系统监控数据被正确记录
      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalledWith({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });

      // 5. 验证缓存操作对Redis的调用
      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('应该在监控报告失败时不影响核心缓存功能', async () => {
      // Mock CollectorService failure
      mockCollectorService.recordSystemMetrics.mockImplementation(() => {
        throw new Error('Monitoring system down');
      });

      // 缓存操作应该仍然正常
      const testData = [{ s: 'TEST', p: 100, v: 1000, t: Date.now() }];
      await service.setData('resilience-test', testData);
      const retrievedData = await service.getData('resilience-test');
      
      expect(retrievedData).toEqual(testData);

      // 监控报告失败不应该抛出异常
      await expect(service.reportMetricsToCollector()).resolves.toBeUndefined();
    });
  });
});