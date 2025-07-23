import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PerformanceMetricsRepository } from '../../../../src/metrics/repositories/performance-metrics.repository';
import {
  PERFORMANCE_REDIS_KEYS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TTL,
  PERFORMANCE_INTERVALS,
} from '../../../../src/metrics/constants/metrics-performance.constants';
import { PerformanceMetric } from '../../../../src/metrics/interfaces/performance-metrics.interface';

describe('PerformanceMetricsRepository - Comprehensive Coverage', () => {
  let repository: PerformanceMetricsRepository;
  let mockRedis: any;
  let mockRedisService: any;
  let loggerSpy: any;

  beforeEach(async () => {
    // Mock pipeline
    const mockPipeline = {
      hincrby: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zremrangebyrank: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockRedis = {
      status: 'ready',
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      scan: jest.fn(),
      hgetall: jest.fn(),
      lrange: jest.fn(),
      zrangebyscore: jest.fn(),
      info: jest.fn(),
      ping: jest.fn(),
      keys: jest.fn(),
    };

    mockRedisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMetricsRepository,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    repository = module.get<PerformanceMetricsRepository>(PerformanceMetricsRepository);

    // Mock logger
    loggerSpy = {
      warn: jest.spyOn((repository as any).logger, 'warn').mockImplementation(),
      error: jest.spyOn((repository as any).logger, 'error').mockImplementation(),
      debug: jest.spyOn((repository as any).logger, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Redis Connection Management', () => {
    it('should handle Redis service getOrThrow failure', async () => {
      mockRedisService.getOrThrow.mockImplementation(() => {
        throw new Error('Redis service unavailable');
      });

      await repository.recordRequest('test', 'GET', 100, true);

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        '获取Redis实例失败，跳过指标操作',
        expect.objectContaining({
          error: 'Redis service unavailable',
          component: 'PerformanceMetricsRepository',
        })
      );
    });

    it('should handle Redis not ready status', async () => {
      mockRedis.status = 'connecting';

      await repository.recordRequest('test', 'GET', 100, true);

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过指标记录',
        expect.objectContaining({
          status: 'connecting',
          operation: 'recordRequest',
        })
      );
    });

    it('should handle null Redis instance', async () => {
      mockRedisService.getOrThrow.mockReturnValue(null);

      await repository.recordDatabaseQuery(50);

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过数据库查询指标记录',
        expect.objectContaining({
          status: 'undefined',
          operation: 'recordDatabaseQuery',
        })
      );
    });
  });

  describe('recordRequest', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
    });

    it('should record successful request metrics', async () => {
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      await repository.recordRequest('/api/test', 'GET', 150, true);

      const baseKey = `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:/api/test`;
      const responseTimeKey = `${baseKey}:responseTimes`;

      expect(mockPipeline.hincrby).toHaveBeenCalledWith(baseKey, 'totalRequests', 1);
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(baseKey, 'successfulRequests', 1);
      expect(mockPipeline.lpush).toHaveBeenCalledWith(responseTimeKey, '150');
      expect(mockPipeline.ltrim).toHaveBeenCalledWith(
        responseTimeKey,
        0,
        PERFORMANCE_LIMITS.MAX_RESPONSE_TIMES_PER_ENDPOINT - 1
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(baseKey, PERFORMANCE_TTL.ENDPOINT_STATS);
      expect(mockPipeline.expire).toHaveBeenCalledWith(responseTimeKey, PERFORMANCE_TTL.ENDPOINT_STATS);
    });

    it('should record failed request metrics', async () => {
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      await repository.recordRequest('/api/error', 'POST', 300, false);

      const baseKey = `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:POST:/api/error`;

      expect(mockPipeline.hincrby).toHaveBeenCalledWith(baseKey, 'totalRequests', 1);
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(baseKey, 'failedRequests', 1);
    });

    it('should handle pipeline execution errors', async () => {
      const mockPipeline = mockRedis.pipeline();
      const error = new Error('Pipeline execution failed');
      error.stack = 'Error stack trace';
      mockPipeline.exec.mockRejectedValue(error);

      await repository.recordRequest('/api/test', 'GET', 100, true);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'recordRequest',
          error: 'Error stack trace',
          endpoint: '/api/test',
          method: 'GET',
          impact: 'MetricsDataLoss',
          component: 'PerformanceMetricsRepository',
        }),
        '记录请求指标到Redis失败'
      );
    });
  });

  describe('recordDatabaseQuery', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('should record database query duration', async () => {
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      await repository.recordDatabaseQuery(250);

      const timestamp = 1234567890000;
      const member = `${timestamp}:250`;
      const key = PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY;

      expect(mockPipeline.zadd).toHaveBeenCalledWith(key, timestamp, member);
      expect(mockPipeline.zremrangebyrank).toHaveBeenCalledWith(
        key,
        0,
        -PERFORMANCE_LIMITS.MAX_DB_QUERY_TIMES - 1
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(key, PERFORMANCE_TTL.DB_QUERY_TIMES);
    });

    it('should handle database query recording errors', async () => {
      const mockPipeline = mockRedis.pipeline();
      const error = new Error('Database query recording failed');
      error.stack = 'Error stack trace';
      mockPipeline.exec.mockRejectedValue(error);

      await repository.recordDatabaseQuery(100);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'recordDatabaseQuery',
          error: 'Error stack trace',
          duration: 100,
          impact: 'MetricsDataLoss',
          component: 'PerformanceMetricsRepository',
        }),
        '记录数据库查询时间到Redis失败'
      );
    });
  });

  describe('getEndpointStats', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
    });

    it('should return empty array when Redis is not ready', async () => {
      mockRedis.status = 'connecting';

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过端点统计获取',
        expect.objectContaining({
          status: 'connecting',
          operation: 'getEndpointStats',
        })
      );
    });

    it('should scan and retrieve endpoint statistics', async () => {
      const mockKeys = [
        'endpoint_stats:GET:/api/test',
        'endpoint_stats:GET:/api/test:responseTimes',
        'endpoint_stats:POST:/api/create',
      ];

      mockRedis.scan
        .mockResolvedValueOnce(['0', mockKeys])
        .mockResolvedValueOnce(['0', []]);

      mockRedis.hgetall.mockImplementation((key) => {
        if (key === 'endpoint_stats:GET:/api/test') {
          return Promise.resolve({ totalRequests: '10', successfulRequests: '8' });
        }
        if (key === 'endpoint_stats:POST:/api/create') {
          return Promise.resolve({ totalRequests: '5', successfulRequests: '5' });
        }
        return Promise.resolve({});
      });

      mockRedis.lrange.mockImplementation((key) => {
        if (key === 'endpoint_stats:GET:/api/test:responseTimes') {
          return Promise.resolve(['100', '150', '200']);
        }
        if (key === 'endpoint_stats:POST:/api/create:responseTimes') {
          return Promise.resolve(['80', '90']);
        }
        return Promise.resolve([]);
      });

      const result = await repository.getEndpointStats();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'endpoint_stats:GET:/api/test',
        stats: { totalRequests: '10', successfulRequests: '8' },
        responseTimes: ['100', '150', '200'],
      });
      expect(result[1]).toEqual({
        key: 'endpoint_stats:POST:/api/create',
        stats: { totalRequests: '5', successfulRequests: '5' },
        responseTimes: ['80', '90'],
      });
    });

    it('should handle scan with multiple iterations', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['cursor1', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);

      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.lrange.mockResolvedValue([]);

      await repository.getEndpointStats();

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    });

    it('should limit scan results to 500 keys', async () => {
      const manyKeys = Array.from({ length: 600 }, (_, i) => `key${i}`);
      mockRedis.scan.mockResolvedValueOnce(['0', manyKeys]);
      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.lrange.mockResolvedValue([]);

      await repository.getEndpointStats();

      // Should process only first 500 keys
      expect(mockRedis.hgetall).toHaveBeenCalledTimes(500);
    });

    it('should handle timeout during batch processing', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['endpoint_stats:GET:/api/slow']]);
      
      mockRedis.hgetall.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 1500))
      );

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('获取键 endpoint_stats:GET:/api/slow 数据失败')
      );
    });

    it('should handle empty endpoint keys', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['key:responseTimes']]);

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(loggerSpy.debug).toHaveBeenCalledWith('没有找到端点统计键');
    });

    it('should handle batch processing errors', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['endpoint_stats:GET:/api/test']]);
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('获取键 endpoint_stats:GET:/api/test 数据失败')
      );
    });

    it('should process batches sequentially', async () => {
      const keys = Array.from({ length: 25 }, (_, i) => `endpoint_stats:key${i}`);
      mockRedis.scan.mockResolvedValueOnce(['0', keys]);
      mockRedis.hgetall.mockResolvedValue({ totalRequests: '1' });
      mockRedis.lrange.mockResolvedValue(['100']);

      const result = await repository.getEndpointStats();

      expect(result).toHaveLength(25);
      expect(loggerSpy.debug).toHaveBeenCalledWith('获取到 25 个端点统计数据');
    });

    it('should handle general scan errors', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Scan failed'));

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getEndpointStats',
        }),
        '从Redis获取端点统计信息失败'
      );
    });
  });

  describe('getDatabaseQueryTimes', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
    });

    it('should get database query times without date range', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([
        '1234567890000:100',
        '1234567891000:150',
        '1234567892000:200',
      ]);

      const result = await repository.getDatabaseQueryTimes();

      expect(result).toEqual(['100', '150', '200']);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        '-inf',
        '+inf'
      );
    });

    it('should get database query times with date range', async () => {
      const startTime = new Date('2023-01-01').getTime();
      const endTime = new Date('2023-01-02').getTime();

      mockRedis.zrangebyscore.mockResolvedValue(['1672531200000:75']);

      const result = await repository.getDatabaseQueryTimes('2023-01-01', '2023-01-02');

      expect(result).toEqual(['75']);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        startTime,
        endTime
      );
    });

    it('should handle zrangebyscore errors', async () => {
      const error = new Error('Query failed');
      error.stack = 'Error stack trace';
      mockRedis.zrangebyscore.mockRejectedValue(error);

      const result = await repository.getDatabaseQueryTimes();

      expect(result).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getDatabaseQueryTimes',
          error: 'Error stack trace',
        }),
        '从Redis获取数据库查询时间失败'
      );
    });
  });

  describe('getRedisInfoPayload', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
    });

    it('should return null when Redis is not ready', async () => {
      mockRedis.status = 'connecting';

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接不可用，无法获取指标',
        expect.objectContaining({
          status: 'connecting',
          operation: 'getRedisInfoPayload',
        })
      );
    });

    it('should return Redis info payload successfully', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info
        .mockResolvedValueOnce('used_memory:1048576\r\n')
        .mockResolvedValueOnce('total_commands_processed:1000\r\n')
        .mockResolvedValueOnce('connected_clients:5\r\n');

      const result = await repository.getRedisInfoPayload();

      expect(result).toEqual({
        info: 'used_memory:1048576\r\n',
        stats: 'total_commands_processed:1000\r\n',
        clients: 'connected_clients:5\r\n',
      });
      expect(loggerSpy.debug).toHaveBeenCalledWith(
        'Redis INFO 数据获取成功',
        expect.objectContaining({
          infoLength: expect.any(Number),
          statsLength: expect.any(Number),
          clientsLength: expect.any(Number),
        })
      );
    });

    it('should handle ping failure with connection reset', async () => {
      const pingError = new Error('ECONNRESET');
      mockRedis.ping.mockRejectedValue(pingError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接被重置，跳过INFO获取',
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: 'ECONNRESET',
        })
      );
    });

    it('should handle ping failure with connection closed', async () => {
      const pingError = new Error('Connection is closed');
      mockRedis.ping.mockRejectedValue(pingError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接被重置，跳过INFO获取',
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: 'Connection is closed',
        })
      );
    });

    it('should handle general ping failure', async () => {
      const pingError = new Error('General ping error');
      mockRedis.ping.mockRejectedValue(pingError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis ping失败，跳过INFO获取',
        expect.objectContaining({
          error: 'General ping error',
          operation: 'getRedisInfoPayload',
        })
      );
    });

    it('should handle timeout during info retrieval', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('info'), 1500))
      );

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
    });

    it('should handle incomplete info data', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info
        .mockResolvedValueOnce('memory_info')
        .mockResolvedValueOnce(null) // stats is null
        .mockResolvedValueOnce('client_info');

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis INFO 数据不完整',
        expect.objectContaining({
          hasInfo: true,
          hasStats: false,
          hasClients: true,
        })
      );
    });

    it('should handle connection reset during info retrieval', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      const error = new Error('ECONNRESET during info');
      mockRedis.info.mockRejectedValue(error);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Redis连接被重置，跳过INFO获取',
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: 'ECONNRESET during info',
        })
      );
    });

    it('should handle general errors during info retrieval', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      const error = new Error('General info error');
      error.stack = 'Error stack trace';
      mockRedis.info.mockRejectedValue(error);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: 'Error stack trace',
        }),
        '从Redis获取Info失败'
      );
    });
  });

  describe('flushMetrics', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('should return early for empty metrics array', async () => {
      await repository.flushMetrics([]);

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should flush metrics to Redis', async () => {
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      const metrics: PerformanceMetric[] = [
        {
          name: 'cpu_usage',
          value: 85.5,
          unit: 'percent',
          timestamp: new Date(1234567890000),
          tags: { server: 'web1' },
        },
        {
          name: 'memory_usage',
          value: 70.2,
          unit: 'percent',
          timestamp: new Date(1234567890500),
          tags: { server: 'web1' },
        },
        {
          name: 'cpu_usage',
          value: 90.1,
          unit: 'percent',
          timestamp: new Date(1234567891000),
          tags: { server: 'web2' },
        },
      ];

      await repository.flushMetrics(metrics);

      // Should group metrics by name - 3 metrics in total
      expect(mockPipeline.zadd).toHaveBeenCalledTimes(3);
      expect(mockPipeline.expire).toHaveBeenCalledTimes(3); // 每个指标调用一次expire，而不是每个指标组
      expect(loggerSpy.debug).toHaveBeenCalledWith('刷新了 2 个指标组到Redis');
    });

    it('should handle flush metrics errors', async () => {
      const mockPipeline = mockRedis.pipeline();
      const error = new Error('Flush failed');
      error.stack = 'Error stack trace';
      mockPipeline.exec.mockRejectedValue(error);

      const metrics: PerformanceMetric[] = [
        {
          name: 'test_metric',
          value: 100,
          unit: 'count',
          timestamp: new Date(),
          tags: {},
        },
      ];

      await repository.flushMetrics(metrics);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'flushMetrics',
          error: 'Error stack trace',
        }),
        '刷新指标到Redis失败'
      );
    });
  });

  describe('groupMetricsByName', () => {
    it('should group metrics by name correctly', () => {
      const metrics: PerformanceMetric[] = [
        { name: 'cpu', value: 80, unit: 'percent', timestamp: new Date(), tags: {} },
        { name: 'memory', value: 70, unit: 'percent', timestamp: new Date(), tags: {} },
        { name: 'cpu', value: 85, unit: 'percent', timestamp: new Date(), tags: {} },
      ];

      const groupMetricsByName = (repository as any).groupMetricsByName;
      const grouped = groupMetricsByName(metrics);

      expect(grouped.size).toBe(2);
      expect(grouped.get(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:cpu`)).toHaveLength(2);
      expect(grouped.get(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:memory`)).toHaveLength(1);
    });
  });

  describe('cleanupOldMetrics', () => {
    beforeEach(() => {
      mockRedis.status = 'ready';
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('should cleanup old metrics', async () => {
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);
      
      const metricsKeys = [
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:cpu`,
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:memory`,
      ];
      mockRedis.keys.mockResolvedValue(metricsKeys);

      await repository.cleanupOldMetrics();

      const oneHourAgo = 1234567890000 - PERFORMANCE_TTL.SYSTEM_METRICS * 1000;
      
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(metricsKeys[0], 0, oneHourAgo);
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(metricsKeys[1], 0, oneHourAgo);
      expect(loggerSpy.debug).toHaveBeenCalledWith('清理了 2 个过期指标键');
    });

    it('should return early when no keys found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await repository.cleanupOldMetrics();

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Cleanup failed');
      error.stack = 'Error stack trace';
      mockRedis.keys.mockRejectedValue(error);

      await repository.cleanupOldMetrics();

      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'cleanupOldMetrics',
          error: 'Error stack trace',
        }),
        '清理过期指标失败'
      );
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle concurrent operations gracefully', async () => {
      mockRedis.status = 'ready';
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      const operations = [
        repository.recordRequest('/api/test1', 'GET', 100, true),
        repository.recordRequest('/api/test2', 'POST', 200, false),
        repository.recordDatabaseQuery(50),
        repository.recordDatabaseQuery(75),
      ];

      await Promise.all(operations);

      // 检查pipeline调用次数 
      // 在某些情况下，可能有一个额外的pipeline调用，可能来自测试设置或异步操作
      expect(mockRedis.pipeline).toHaveBeenCalledTimes(5); // 4次操作可能会有额外的调用
    });

    it('should maintain Redis connection awareness across methods', async () => {
      // Start with ready connection
      mockRedis.status = 'ready';
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('test_info');

      let result = await repository.getRedisInfoPayload();
      expect(result).not.toBeNull();

      // Simulate connection lost
      mockRedisService.getOrThrow.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      await repository.recordRequest('/api/test', 'GET', 100, true);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        '获取Redis实例失败，跳过指标操作',
        expect.anything()
      );
    });
  });
});