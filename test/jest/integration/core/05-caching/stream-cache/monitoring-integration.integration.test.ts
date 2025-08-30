import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StreamCacheService } from '../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import { StreamCacheModule } from '../../../../../../src/core/05-caching/stream-cache/module/stream-cache.module';
import { 
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
  MONITORING_COLLECTOR_TOKEN
} from '../../../../../../src/monitoring/contracts';

describe('StreamCache Monitoring Integration', () => {
  let service: StreamCacheService;
  let module: TestingModule;
  let redisClient: Redis;
  let mockCollectorService: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Mock CollectorService to verify monitoring data reporting
  const createMockCollectorService = () => ({
    recordSystemHealth: jest.fn().mockResolvedValue(undefined),
    recordCacheOperation: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockCollectorService = createMockCollectorService();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        // Import StreamCacheModule but override CollectorService for testing
      ],
      providers: [
        // Redis client provider
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useFactory: (configService: ConfigService) => {
            const redis = new Redis({
              host: configService.get<string>('redis.host', 'localhost'),
              port: configService.get<number>('redis.port', 6379),
              db: configService.get<number>('redis.stream_cache_db', 1),
              lazyConnect: true,
            });
            return redis;
          },
          inject: [ConfigService],
        },
        
        // Stream cache config provider
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

        // Mock CollectorService for testing
        {
          provide: MONITORING_COLLECTOR_TOKEN,
          useValue: mockCollectorService,
        },

        StreamCacheService,
      ],
    }).compile();

    service = module.get<StreamCacheService>(StreamCacheService);
    redisClient = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);

    // Connect to Redis for testing
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis connection failed, tests will check error handling');
    }
  });

  afterEach(async () => {
    // Cleanup
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.flushdb();
      await redisClient.quit();
    }
    
    await module.close();
    
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Health Status Reporting', () => {
    it('应该成功获取健康状态并包含所需指标', async () => {
      const healthStatus = await service.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        hotCacheSize: expect.any(Number),
        redisConnected: expect.any(Boolean),
        lastError: expect.any(String) || null,
      });

      // 如果有性能数据，验证其结构
      if (healthStatus.performance) {
        expect(healthStatus.performance).toMatchObject({
          avgHotCacheHitTime: expect.any(Number),
          avgWarmCacheHitTime: expect.any(Number),
          compressionRatio: expect.any(Number),
        });
      }
    });

    it('应该在Redis可用时报告健康状态', async () => {
      if (redisClient.status !== 'ready') {
        pending('Redis not available for this test');
        return;
      }

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.redisConnected).toBe(true);
      expect(healthStatus.lastError).toBeNull();
    });

    it('应该在Redis不可用时报告不健康状态', async () => {
      // 断开Redis连接来模拟故障
      if (redisClient.status === 'ready') {
        await redisClient.disconnect();
      }

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.redisConnected).toBe(false);
      expect(healthStatus.lastError).not.toBeNull();
    });
  });

  describe('Monitoring Data Reporting', () => {
    it('应该成功向CollectorService报告监控指标', async () => {
      await service.reportMetricsToCollector();

      // 验证CollectorService.recordSystemHealth被调用
      expect(mockCollectorService.recordSystemHealth).toHaveBeenCalledWith({
        component: 'StreamCache',
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        metrics: expect.objectContaining({
          hotCacheSize: expect.any(Number),
          redisConnected: expect.any(Boolean),
        }),
      });
    });

    it('应该在CollectorService失败时优雅处理', async () => {
      // 模拟CollectorService失败
      mockCollectorService.recordSystemHealth.mockRejectedValue(
        new Error('Collector service unavailable')
      );

      // 不应该抛出异常
      await expect(service.reportMetricsToCollector()).resolves.toBeUndefined();

      // 应该记录debug日志
      // Note: 由于我们mock了console，可以检查是否有相应的日志调用
      expect(mockCollectorService.recordSystemHealth).toHaveBeenCalled();
    });

    it('应该包含完整的性能指标数据', async () => {
      if (redisClient.status !== 'ready') {
        pending('Redis not available for this test');
        return;
      }

      await service.reportMetricsToCollector();

      // 获取调用参数
      const callArgs = mockCollectorService.recordSystemHealth.mock.calls[0][0];
      
      expect(callArgs.component).toBe('StreamCache');
      expect(callArgs.metrics).toMatchObject({
        hotCacheSize: expect.any(Number),
        redisConnected: expect.any(Boolean),
      });

      // 如果有性能数据，应该包含详细指标
      if (callArgs.metrics.avgHotCacheHitTime !== undefined) {
        expect(callArgs.metrics).toMatchObject({
          avgHotCacheHitTime: expect.any(Number),
          avgWarmCacheHitTime: expect.any(Number),
          compressionRatio: expect.any(Number),
        });
      }
    });
  });

  describe('Monitoring Integration Error Handling', () => {
    it('应该在监控系统不可用时仍然正常工作', async () => {
      // 创建新的service实例，但没有CollectorService
      const moduleWithoutCollector = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true })],
        providers: [
          {
            provide: CACHE_REDIS_CLIENT_TOKEN,
            useValue: redisClient,
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
          // 不提供CollectorService，模拟监控系统不可用
          StreamCacheService,
        ],
      }).compile();

      const serviceWithoutCollector = moduleWithoutCollector.get<StreamCacheService>(StreamCacheService);

      // 核心缓存功能应该仍然正常工作
      const testData = [{ s: 'TEST', p: 100, v: 1000, t: Date.now() }];
      await expect(serviceWithoutCollector.setData('test-key', testData)).resolves.toBeUndefined();
      
      const retrievedData = await serviceWithoutCollector.getData('test-key');
      expect(retrievedData).toEqual(testData);

      await moduleWithoutCollector.close();
    });
  });

  describe('Real-time Monitoring Integration', () => {
    it('应该在缓存操作时触发监控记录', async () => {
      if (redisClient.status !== 'ready') {
        pending('Redis not available for this test');
        return;
      }

      const testData = [{ s: 'TEST', p: 100, v: 1000, t: Date.now() }];
      
      // 执行缓存操作
      await service.setData('monitoring-test-key', testData);
      const retrievedData = await service.getData('monitoring-test-key');
      
      expect(retrievedData).toEqual(testData);

      // 手动触发监控报告
      await service.reportMetricsToCollector();

      // 验证监控数据被正确报告
      expect(mockCollectorService.recordSystemHealth).toHaveBeenCalled();
      
      const reportedMetrics = mockCollectorService.recordSystemHealth.mock.calls[0][0];
      expect(reportedMetrics.component).toBe('StreamCache');
      expect(reportedMetrics.metrics.hotCacheSize).toBeGreaterThan(0); // 应该包含刚添加的数据
    });
  });
});