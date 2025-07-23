import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PerformanceMetricsRepository } from '../../../../../src/metrics/repositories/performance-metrics.repository';
import { PerformanceMetric } from '../../../../../src/metrics/interfaces/performance-metrics.interface';
import {
  PERFORMANCE_REDIS_KEYS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TTL,
  PERFORMANCE_INTERVALS,
} from '../../../../../src/metrics/constants/metrics-performance.constants';
import { createLogger } from '../../../../../src/common/config/logger.config';

// Create a single, reusable mock logger instance
const mockLoggerInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the logger to always return the same instance
jest.mock('../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('PerformanceMetricsRepository', () => {
  let repository: PerformanceMetricsRepository;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockRedis: any;
  let mockPipeline: any;

  const createMockRedis = (status = 'ready') => ({
    status,
    pipeline: jest.fn(), // This will be configured in beforeEach
    scan: jest.fn(),
    hgetall: jest.fn(),
    lrange: jest.fn(),
    zrangebyscore: jest.fn(),
    info: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    keys: jest.fn(),
  });

  beforeEach(async () => {
    mockRedis = createMockRedis();
    mockPipeline = {
      hincrby: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zremrangebyrank: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    mockRedisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    } as any;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordRequest', () => {
    it('should record request metrics successfully', async () => {
      await repository.recordRequest('api/users', 'GET', 150, true);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users`,
        'totalRequests',
        1
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users`,
        'successfulRequests',
        1
      );
      expect(mockPipeline.lpush).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users:responseTimes`,
        '150'
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should record failed request metrics', async () => {
      await repository.recordRequest('api/users', 'POST', 500, false);

      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:POST:api/users`,
        'failedRequests',
        1
      );
    });

    it('should handle Redis connection not ready', async () => {
      mockRedis.status = 'connecting';

      await repository.recordRequest('api/users', 'GET', 150, true);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过指标记录',
        expect.objectContaining({
          status: 'connecting',
          operation: 'recordRequest',
          endpoint: 'api/users',
          method: 'GET',
        })
      );
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should handle undefined Redis status', async () => {
      mockRedisService.getOrThrow.mockReturnValue(null);

      await repository.recordRequest('api/users', 'GET', 150, true);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过指标记录',
        expect.objectContaining({
          status: 'undefined',
        })
      );
    });

    it('should handle Redis pipeline execution errors', async () => {
      const pipelineError = new Error('Pipeline execution failed');
      mockPipeline.exec.mockRejectedValue(pipelineError);

      await repository.recordRequest('api/users', 'GET', 150, true);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'recordRequest',
          error: pipelineError.stack,
          endpoint: 'api/users',
          method: 'GET',
          impact: 'MetricsDataLoss',
        }),
        '记录请求指标到Redis失败'
      );
    });

    it('should apply TTL and trimming correctly', async () => {
      await repository.recordRequest('api/test', 'PUT', 200, true);

      expect(mockPipeline.ltrim).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:PUT:api/test:responseTimes`,
        0,
        PERFORMANCE_LIMITS.MAX_RESPONSE_TIMES_PER_ENDPOINT - 1
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:PUT:api/test`,
        PERFORMANCE_TTL.ENDPOINT_STATS
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:PUT:api/test:responseTimes`,
        PERFORMANCE_TTL.ENDPOINT_STATS
      );
    });
  });

  describe('recordDatabaseQuery', () => {
    it('should record database query duration successfully', async () => {
      const mockTimestamp = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await repository.recordDatabaseQuery(250);

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        mockTimestamp,
        `${mockTimestamp}:250`
      );
      expect(mockPipeline.zremrangebyrank).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        0,
        -PERFORMANCE_LIMITS.MAX_DB_QUERY_TIMES - 1
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        PERFORMANCE_TTL.DB_QUERY_TIMES
      );
    });

    it('should handle Redis connection not ready for database queries', async () => {
      mockRedis.status = 'disconnected';

      await repository.recordDatabaseQuery(300);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过数据库查询指标记录',
        expect.objectContaining({
          status: 'disconnected',
          operation: 'recordDatabaseQuery',
          duration: 300,
        })
      );
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should handle database query recording errors', async () => {
      const queryError = new Error('Database query recording failed');
      mockPipeline.exec.mockRejectedValue(queryError);

      await repository.recordDatabaseQuery(400);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'recordDatabaseQuery',
          error: queryError.stack,
          duration: 400,
          impact: 'MetricsDataLoss',
        }),
        '记录数据库查询时间到Redis失败'
      );
    });

    it('should create unique member strings with timestamp', async () => {
      const baseTimestamp = 1640995200000;
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(baseTimestamp)
        .mockReturnValueOnce(baseTimestamp + 1);

      await repository.recordDatabaseQuery(100);
      await repository.recordDatabaseQuery(100);

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        baseTimestamp,
        `${baseTimestamp}:100`
      );
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        baseTimestamp + 1,
        `${baseTimestamp + 1}:100`
      );
    });
  });

  describe('getEndpointStats', () => {
    it('should return endpoint statistics successfully', async () => {
      const mockKeys = [
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users`,
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:POST:api/users`,
      ];
      
      mockRedis.scan.mockResolvedValueOnce(['0', mockKeys]);
      mockRedis.hgetall.mockImplementation((key) => {
        if (key.includes('GET')) {
          return Promise.resolve({
            totalRequests: '100',
            successfulRequests: '95',
            failedRequests: '5',
          });
        }
        return Promise.resolve({
          totalRequests: '50',
          successfulRequests: '45',
          failedRequests: '5',
        });
      });
      mockRedis.lrange.mockResolvedValue(['150', '200', '180']);

      const result = await repository.getEndpointStats();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: expect.stringContaining('GET'),
        stats: expect.objectContaining({
          totalRequests: '100',
          successfulRequests: '95',
        }),
        responseTimes: ['150', '200', '180'],
      });
    });

    it('should handle Redis connection not ready for endpoint stats', async () => {
      mockRedis.status = 'end';

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接不可用，跳过端点统计获取',
        expect.objectContaining({
          status: 'end',
          operation: 'getEndpointStats',
        })
      );
    });

    it('should filter out response time keys from scan results', async () => {
      const mockKeys = [
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users`,
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/users:responseTimes`,
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:POST:api/posts`,
      ];
      
      mockRedis.scan.mockResolvedValueOnce(['0', mockKeys]);
      mockRedis.hgetall.mockResolvedValue({
        totalRequests: '10',
        successfulRequests: '8',
      });
      mockRedis.lrange.mockResolvedValue(['100', '120']);

      const result = await repository.getEndpointStats();

      // Should only process 2 endpoint keys, excluding the responseTimes key
      expect(result).toHaveLength(2);
      expect(result.every(r => !r.key.endsWith(':responseTimes'))).toBe(true);
    });

    it('should handle pagination with SCAN cursor', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['5', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);
      mockRedis.hgetall.mockResolvedValue({ totalRequests: '1' });
      mockRedis.lrange.mockResolvedValue(['100']);

      const result = await repository.getEndpointStats();

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3);
    });

    it('should limit maximum scan count to prevent infinite loops', async () => {
      // Create a long list of keys to trigger the limit
      const manyKeys = Array.from({ length: 600 }, (_, i) => `key${i}`);
      mockRedis.scan.mockResolvedValue(['0', manyKeys]);
      mockRedis.hgetall.mockResolvedValue({ totalRequests: '1' });
      mockRedis.lrange.mockResolvedValue(['100']);

      const result = await repository.getEndpointStats();

      // Should stop at 500 keys limit
      expect(result).toHaveLength(500);
    });

    it('should process results in batches', async () => {
      const mockKeys = Array.from({ length: 25 }, (_, i) => 
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/endpoint${i}`
      );
      
      mockRedis.scan.mockResolvedValueOnce(['0', mockKeys]);
      mockRedis.hgetall.mockResolvedValue({ totalRequests: '1' });
      mockRedis.lrange.mockResolvedValue(['100']);

      const result = await repository.getEndpointStats();

      // Should process in batches of 10 (as defined in the service)
      expect(result).toHaveLength(25);
    });

    it('should handle timeout for individual Redis operations', async () => {
      const mockKeys = [`${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/slow`];
      mockRedis.scan.mockResolvedValueOnce(['0', mockKeys]);
      
      // Mock a slow Redis operation that times out
      mockRedis.hgetall.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ totalRequests: '1' }), 2000))
      );

      const result = await repository.getEndpointStats();

      expect(result).toHaveLength(0);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining('获取键')
      );
    });

    it('should skip empty stats and handle partial failures', async () => {
      const mockKeys = [
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/empty`,
        `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:GET:api/valid`,
      ];
      
      mockRedis.scan.mockResolvedValueOnce(['0', mockKeys]);
      mockRedis.hgetall.mockImplementation((key) => {
        if (key.includes('empty')) {
          return Promise.resolve({}); // Empty stats
        }
        return Promise.resolve({ totalRequests: '10' });
      });
      mockRedis.lrange.mockResolvedValue(['150']);

      const result = await repository.getEndpointStats();

      expect(result).toHaveLength(1);
      expect(result[0].key).toContain('valid');
    });

    it('should return empty array when no keys found', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('没有找到端点统计键');
    });

    it('should handle general errors gracefully', async () => {
      const scanError = new Error('Redis scan failed');
      mockRedis.scan.mockRejectedValue(scanError);

      const result = await repository.getEndpointStats();

      expect(result).toEqual([]);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getEndpointStats',
          error: scanError.stack,
        }),
        '从Redis获取端点统计信息失败'
      );
    });
  });

  describe('getDatabaseQueryTimes', () => {
    it('should get database query times without date filter', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([
        '1640995200000:250',
        '1640995201000:300',
        '1640995202000:150',
      ]);

      const result = await repository.getDatabaseQueryTimes();

      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        '-inf',
        '+inf'
      );
      expect(result).toEqual(['250', '300', '150']);
    });

    it('should get database query times with date range', async () => {
      const startDate = '2022-01-01T00:00:00.000Z';
      const endDate = '2022-01-02T00:00:00.000Z';
      
      mockRedis.zrangebyscore.mockResolvedValue([
        '1640995200000:200',
        '1641081600000:350',
      ]);

      const result = await repository.getDatabaseQueryTimes(startDate, endDate);

      const expectedStartTimestamp = new Date(startDate).getTime();
      const expectedEndTimestamp = new Date(endDate).getTime();
      
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        expectedStartTimestamp,
        expectedEndTimestamp
      );
      expect(result).toEqual(['200', '350']);
    });

    it('should handle Redis errors when getting query times', async () => {
      const redisError = new Error('Redis zrangebyscore failed');
      mockRedis.zrangebyscore.mockRejectedValue(redisError);

      const result = await repository.getDatabaseQueryTimes();

      expect(result).toEqual([]);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getDatabaseQueryTimes',
          error: redisError.stack,
        }),
        '从Redis获取数据库查询时间失败'
      );
    });

    it('should parse duration from member strings correctly', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([
        '1640995200000:100.5',
        '1640995201000:200',
        '1640995202000:300.75',
      ]);

      const result = await repository.getDatabaseQueryTimes();

      expect(result).toEqual(['100.5', '200', '300.75']);
    });

    it('should handle malformed member strings', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([
        '1640995200000:250',
        'malformed_member',
        '1640995202000:150',
      ]);

      const result = await repository.getDatabaseQueryTimes();

      expect(result).toEqual(['250', undefined, '150']);
    });
  });

  describe('getRedisInfoPayload', () => {
    it('should get Redis info payload successfully', async () => {
      const mockInfo = 'used_memory:1024\nused_memory_human:1KB';
      const mockStats = 'total_commands_processed:1000\nkeyspace_hits:900';
      const mockClients = 'connected_clients:5\nblocked_clients:0';

      mockRedis.info
        .mockResolvedValueOnce(mockInfo)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockClients);

      const result = await repository.getRedisInfoPayload();

      expect(result).toEqual({
        info: mockInfo,
        stats: mockStats,
        clients: mockClients,
      });
      expect(mockRedis.ping).toHaveBeenCalled();
      expect(mockRedis.info).toHaveBeenCalledWith('memory');
      expect(mockRedis.info).toHaveBeenCalledWith('stats');
      expect(mockRedis.info).toHaveBeenCalledWith('clients');
    });

    it('should handle Redis connection not ready', async () => {
      mockRedis.status = 'connecting';

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接不可用，无法获取指标',
        expect.objectContaining({
          status: 'connecting',
          operation: 'getRedisInfoPayload',
        })
      );
    });

    it('should handle ping failure', async () => {
      const pingError = new Error('Redis ping failed');
      mockRedis.ping.mockRejectedValue(pingError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis ping失败，跳过INFO获取',
        expect.objectContaining({
          error: pingError.message,
          operation: 'getRedisInfoPayload',
        })
      );
    });

    it('should handle timeout for Redis info operations', async () => {
      // Mock slow info operations
      mockRedis.info.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow_data'), 2000))
      );

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
    });

    it('should handle incomplete info data', async () => {
      mockRedis.info
        .mockResolvedValueOnce('memory_info') // Valid info
        .mockResolvedValueOnce(null) // Invalid stats
        .mockResolvedValueOnce('client_info'); // Valid clients

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis INFO 数据不完整',
        expect.objectContaining({
          hasInfo: true,
          hasStats: false,
          hasClients: true,
        })
      );
    });

    it('should handle connection reset errors specifically', async () => {
      const connectionError = new Error('Connection is closed');
      mockRedis.info.mockRejectedValue(connectionError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接被重置，跳过INFO获取',
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: connectionError.message,
        })
      );
    });

    it('should handle ECONNRESET errors specifically', async () => {
      const econnresetError = new Error('ECONNRESET - connection reset by peer');
      mockRedis.ping.mockRejectedValue(econnresetError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Redis连接被重置，跳过INFO获取',
        expect.objectContaining({
          error: econnresetError.message,
        })
      );
    });

    it('should handle general errors', async () => {
      const generalError = new Error('General Redis error');
      mockRedis.info.mockRejectedValue(generalError);

      const result = await repository.getRedisInfoPayload();

      expect(result).toBeNull();
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getRedisInfoPayload',
          error: generalError.stack,
        }),
        '从Redis获取Info失败'
      );
    });

    it('should log success with data lengths', async () => {
      const mockInfo = 'memory_data';
      const mockStats = 'stats_data';
      const mockClients = 'clients_data';

      mockRedis.info
        .mockResolvedValueOnce(mockInfo)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockClients);

      await repository.getRedisInfoPayload();

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        'Redis INFO 数据获取成功',
        {
          infoLength: mockInfo.length,
          statsLength: mockStats.length,
          clientsLength: mockClients.length,
        }
      );
    });
  });

  describe('flushMetrics', () => {
    const mockMetrics: PerformanceMetric[] = [
      {
        name: 'cpu_usage',
        value: 75.5,
        unit: 'percent',
        timestamp: new Date('2022-01-01T12:00:00Z'),
        tags: { host: 'server1' },
      },
      {
        name: 'memory_usage',
        value: 60.2,
        unit: 'percent',
        timestamp: new Date('2022-01-01T12:00:00Z'),
        tags: { host: 'server1' },
      },
      {
        name: 'cpu_usage',
        value: 80.1,
        unit: 'percent',
        timestamp: new Date('2022-01-01T12:01:00Z'),
        tags: { host: 'server2' },
      },
    ];

    it('should flush metrics successfully', async () => {
      await repository.flushMetrics(mockMetrics);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalledTimes(3);
      expect(mockPipeline.expire).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('刷新了 2 个指标组到Redis');
    });

    it('should handle empty metrics array', async () => {
      await repository.flushMetrics([]);

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should group metrics by name correctly', async () => {
      await repository.flushMetrics(mockMetrics);

      // Should have calls for both cpu_usage (2 metrics) and memory_usage (1 metric)
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expect.stringContaining('cpu_usage'),
        expect.any(Number),
        expect.stringContaining('75.5')
      );
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expect.stringContaining('memory_usage'),
        expect.any(Number),
        expect.stringContaining('60.2')
      );
    });

    it('should create time-based keys for metrics', async () => {
      const fixedTimestamp = new Date('2022-01-01T12:00:30Z');
      const metricsWithSameTime: PerformanceMetric[] = [{
        name: 'test_metric',
        value: 100,
        unit: 'count',
        timestamp: fixedTimestamp,
        tags: { test: 'value' },
      }];

      await repository.flushMetrics(metricsWithSameTime);

      const expectedTimeKey = `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:test_metric:${Math.floor(fixedTimestamp.getTime() / 60000) * 60000}`;
      
      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expectedTimeKey,
        fixedTimestamp.getTime(),
        JSON.stringify({
          value: 100,
          tags: { test: 'value' },
        })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        expectedTimeKey,
        PERFORMANCE_TTL.SYSTEM_METRICS
      );
    });

    it('should handle flush errors gracefully', async () => {
      const flushError = new Error('Pipeline flush failed');
      mockPipeline.exec.mockRejectedValue(flushError);

      await repository.flushMetrics(mockMetrics);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'flushMetrics',
          error: flushError.stack,
        }),
        '刷新指标到Redis失败'
      );
    });

    it('should serialize metric data correctly', async () => {
      const metricWithComplexTags: PerformanceMetric[] = [{
        name: 'complex_metric',
        value: 42.5,
        unit: 'ms',
        timestamp: new Date(),
        tags: {
          endpoint: '/api/users',
          method: 'GET',
          status: '200',
          region: 'us-east-1',
        },
      }];

      await repository.flushMetrics(metricWithComplexTags);

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        JSON.stringify({
          value: 42.5,
          tags: {
            endpoint: '/api/users',
            method: 'GET',
            status: '200',
            region: 'us-east-1',
          },
        })
      );
    });
  });

  describe('groupMetricsByName', () => {
    it('should group metrics by name correctly', () => {
      const metrics: PerformanceMetric[] = [
        {
          name: 'cpu_usage',
          value: 70,
          unit: 'percent',
          timestamp: new Date(),
          tags: { host: 'server1' },
        },
        {
          name: 'memory_usage',
          value: 80,
          unit: 'percent',
          timestamp: new Date(),
          tags: { host: 'server1' },
        },
        {
          name: 'cpu_usage',
          value: 75,
          unit: 'percent',
          timestamp: new Date(),
          tags: { host: 'server2' },
        },
      ];

      const grouped = (repository as any).groupMetricsByName(metrics);

      expect(grouped.size).toBe(2);
      expect(grouped.has(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:cpu_usage`)).toBe(true);
      expect(grouped.has(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:memory_usage`)).toBe(true);
      expect(grouped.get(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:cpu_usage`)).toHaveLength(2);
      expect(grouped.get(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:memory_usage`)).toHaveLength(1);
    });

    it('should handle empty metrics array', () => {
      const grouped = (repository as any).groupMetricsByName([]);

      expect(grouped.size).toBe(0);
    });

    it('should create correct Redis keys', () => {
      const metrics: PerformanceMetric[] = [{
        name: 'test_metric',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        tags: {},
      }];

      const grouped = (repository as any).groupMetricsByName(metrics);

      expect(grouped.has(`${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:test_metric`)).toBe(true);
    });
  });

  describe('cleanupOldMetrics', () => {
    it('should cleanup old metrics successfully', async () => {
      const mockKeys = [
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:cpu_usage:1640995200000`,
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:memory_usage:1640995260000`,
      ];
      mockRedis.keys.mockResolvedValue(mockKeys);

      await repository.cleanupOldMetrics();

      expect(mockRedis.keys).toHaveBeenCalledWith(
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:*`
      );
      
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
      
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('清理了 2 个过期指标键');
    });

    it('should handle no keys to cleanup', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await repository.cleanupOldMetrics();

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
      expect(mockLoggerInstance.debug).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const cleanupError = new Error('Cleanup failed');
      mockRedis.keys.mockRejectedValue(cleanupError);

      await repository.cleanupOldMetrics();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'cleanupOldMetrics',
          error: cleanupError.stack,
        }),
        '清理过期指标失败'
      );
    });

    it('should calculate correct cutoff timestamp', async () => {
      const currentTime = 1640995200000; // Fixed timestamp
      const expectedCutoff = currentTime - PERFORMANCE_TTL.SYSTEM_METRICS * 1000;
      
      jest.spyOn(Date, 'now').mockReturnValue(currentTime);
      mockRedis.keys.mockResolvedValue(['test_key']);

      await repository.cleanupOldMetrics();

      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'test_key',
        0,
        expectedCutoff
      );
    });

    it('should handle pipeline execution errors during cleanup', async () => {
      const pipelineError = new Error('Pipeline execution failed during cleanup');
      mockRedis.keys.mockResolvedValue(['key1', 'key2']);
      mockPipeline.exec.mockRejectedValue(pipelineError);

      await repository.cleanupOldMetrics();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'cleanupOldMetrics',
          error: pipelineError.stack,
        }),
        '清理过期指标失败'
      );
    });
  });

  describe('Redis Connection Handling', () => {
    it('should handle various Redis connection states', async () => {
      const states = ['ready', 'connecting', 'reconnecting', 'disconnected', 'end'];

      for (const state of states) {
        mockRedis.status = state;
        
        await repository.recordRequest('test', 'GET', 100, true);
        
        if (state === 'ready') {
          expect(mockRedis.pipeline).toHaveBeenCalled();
        } else {
          expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
            expect.stringContaining('Redis连接不可用'),
            expect.objectContaining({ status: state })
          );
        }
        
        jest.clearAllMocks();
      }
    });

    it('should handle null Redis instance', async () => {
      mockRedisService.getOrThrow.mockReturnValue(null);

      await repository.recordDatabaseQuery(200);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis连接不可用'),
        expect.objectContaining({ status: 'undefined' })
      );
    });

    it('should handle Redis service throwing error', async () => {
      mockRedisService.getOrThrow.mockImplementation(() => {
        throw new Error('Redis service unavailable');
      });

      await repository.recordRequest('test', 'POST', 300, false);

      // Should handle the error gracefully without throwing
      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle large numbers of metrics efficiently', async () => {
      const largeMetricsArray: PerformanceMetric[] = Array.from({ length: 1000 }, (_, i) => ({
        name: `metric_${i % 10}`,
        value: Math.random() * 100,
        unit: 'percent',
        timestamp: new Date(),
        tags: { instance: `instance_${i}` },
      }));

      await repository.flushMetrics(largeMetricsArray);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('刷新了 10 个指标组到Redis');
    });

    it('should handle concurrent operations safely', async () => {
      const promises = [
        repository.recordRequest('api1', 'GET', 100, true),
        repository.recordRequest('api2', 'POST', 200, false),
        repository.recordDatabaseQuery(50),
        repository.getEndpointStats(),
      ];

      await Promise.all(promises);

      // Should not throw any errors or cause conflicts
      expect(mockRedis.pipeline).toHaveBeenCalledTimes(3);
      expect(mockRedis.scan).toHaveBeenCalled();
    });

    it('should handle malformed or extreme timestamps', async () => {
      const extremeDate = new Date('2050-12-31T23:59:59.999Z');
      const extremeMetric: PerformanceMetric = {
        name: 'extreme_metric',
        value: Number.MAX_SAFE_INTEGER,
        unit: 'count',
        timestamp: extremeDate,
        tags: { test: 'extreme' },
      };

      await repository.flushMetrics([extremeMetric]);

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expect.any(String),
        extremeDate.getTime(),
        expect.any(String)
      );
    });

    it('should handle special characters in metric names and tags', async () => {
      const specialMetric: PerformanceMetric = {
        name: 'api:/users/{id}/posts',
        value: 150,
        unit: 'ms',
        timestamp: new Date(),
        tags: {
          'user-agent': 'Mozilla/5.0',
          'content-type': 'application/json',
          'x-custom-header': 'value with spaces & symbols!',
        },
      };

      await repository.flushMetrics([specialMetric]);

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        expect.stringContaining('api:/users/{id}/posts'),
        expect.any(Number),
        expect.stringContaining('Mozilla/5.0')
      );
    });
  });
});