/**
 * CommonCacheService增强版批量操作单元测试
 * 测试Phase 4.1.2的mgetEnhanced和msetEnhanced功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommonCacheService } from '../../../../../../../src/core/05-caching/common-cache/services/common-cache.service';
import { CacheCompressionService } from '../../../../../../../src/core/05-caching/common-cache/services/cache-compression.service';
import Redis from 'ioredis';

// Import RedisValueUtils to get access to the mocked module
import { RedisValueUtils } from '../../../../../../../src/core/05-caching/common-cache/utils/redis-value.utils';

// Mock createLogger
jest.mock('../@app/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

// Mock RedisValueUtils
jest.mock('../../../../../../../src/core/public/common-cache/utils/redis-value.utils', () => ({
  serialize: jest.fn((data, compressed, metadata) => {
    return JSON.stringify({
      data,
      compressed: compressed || false,
      metadata: metadata || {},
      storedAt: Date.now()
    });
  }),
  parse: jest.fn((serialized) => {
    const parsed = JSON.parse(serialized);
    return {
      data: parsed.data,
      compressed: parsed.compressed,
      metadata: parsed.metadata,
      storedAt: parsed.storedAt
    };
  })
}));

describe('CommonCacheService Enhanced Batch Operations', () => {
  let service: CommonCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let mockCompressionService: jest.Mocked<CacheCompressionService>;
  let mockMetricsRegistry: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.resetAllMocks();
    
    mockRedis = {
      mget: jest.fn(),
      pttl: jest.fn(),
      exists: jest.fn(),
      pipeline: jest.fn(),
      setex: jest.fn(),
    } as any;

    mockCompressionService = {
      shouldCompress: jest.fn(),
      compress: jest.fn(),
      decompress: jest.fn(),
    } as any;

    mockMetricsRegistry = {
      inc: jest.fn(),
      observe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: CacheCompressionService,
          useValue: mockCompressionService,
        },
        {
          provide: 'METRICS_REGISTRY',
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<CommonCacheService>(CommonCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mgetEnhanced', () => {
    it('应该正确处理缓存命中的批量获取', async () => {
      // Arrange
      const requests = [
        { key: 'key1', options: { includeMetadata: true } },
        { key: 'key2', options: { includeMetadata: false } },
        { key: 'key3' }
      ];

      const serializedValue1 = JSON.stringify({ data: 'value1', storedAt: Date.now() });
      const serializedValue2 = JSON.stringify({ data: 'value2', storedAt: Date.now() });

      mockRedis.mget.mockResolvedValue([
        serializedValue1,
        serializedValue2,
        null
      ]);
      mockRedis.pttl.mockResolvedValueOnce(300000).mockResolvedValueOnce(180000).mockResolvedValueOnce(-2);
      
      // Configure RedisValueUtils mock to parse the values correctly
      const mockedParse = jest.mocked(RedisValueUtils.parse);
      mockedParse
        .mockReturnValueOnce({ data: 'value1', compressed: false, metadata: {}, storedAt: Date.now() })
        .mockReturnValueOnce({ data: 'value2', compressed: false, metadata: {}, storedAt: Date.now() });

      // Act
      const results = await service.mgetEnhanced(requests);

      // Assert
      expect(results).toHaveLength(3);
      
      expect(results[0]).toEqual({
        key: 'key1',
        data: 'value1',
        hit: true,
        ttlRemaining: 300,
        source: 'cache',
        metadata: expect.objectContaining({
          storedAt: expect.any(Number)
        })
      });

      expect(results[1]).toEqual({
        key: 'key2',
        data: 'value2',
        hit: true,
        ttlRemaining: 180,
        source: 'cache',
        metadata: undefined // includeMetadata: false
      });

      expect(results[2]).toEqual({
        key: 'key3',
        data: null,
        hit: false,
        ttlRemaining: 0,
        source: 'cache',
        metadata: undefined
      });

      expect(mockRedis.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('应该在缓存未命中时调用fetchFn获取数据', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue('fetched-data');
      const requests = [
        { 
          key: 'miss-key',
          fetchFn: mockFetchFn,
          ttl: 600,
          options: { includeMetadata: true }
        }
      ];

      mockRedis.mget.mockResolvedValue([null]);
      mockRedis.pttl.mockResolvedValue(-2);

      // Mock set method call
      jest.spyOn(service, 'set').mockResolvedValue();

      // Act
      const results = await service.mgetEnhanced(requests);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        key: 'miss-key',
        data: 'fetched-data',
        hit: false,
        ttlRemaining: 600,
        source: 'fetch',
        metadata: expect.objectContaining({
          fetchTime: expect.any(Number),
          storedAt: expect.any(Number)
        })
      });

      expect(mockFetchFn).toHaveBeenCalled();
      expect(service.set).toHaveBeenCalledWith('miss-key', 'fetched-data', 600);
    });

    it('应该在fetchFn失败时返回错误结果', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      const requests = [
        { 
          key: 'error-key',
          fetchFn: mockFetchFn,
          options: { includeMetadata: true }
        }
      ];

      mockRedis.mget.mockResolvedValue([null]);
      mockRedis.pttl.mockResolvedValue(-2);

      // Act
      const results = await service.mgetEnhanced(requests);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        key: 'error-key',
        data: null,
        hit: false,
        ttlRemaining: 0,
        source: 'error',
        metadata: expect.objectContaining({
          error: 'Fetch failed'
        })
      });

      expect(mockFetchFn).toHaveBeenCalled();
    });

    it('应该在maxAge不满足时重新获取数据', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue('fresh-data');
      const requests = [
        { 
          key: 'stale-key',
          fetchFn: mockFetchFn,
          ttl: 300,
          options: { 
            maxAge: 100, // 要求TTL至少100秒
            includeMetadata: true 
          }
        }
      ];

      // Mock 缓存存在但TTL只有50秒（不满足maxAge=100的要求）
      mockRedis.mget.mockResolvedValue([
        JSON.stringify({ data: 'stale-data', storedAt: Date.now() - 250000 })
      ]);
      mockRedis.pttl.mockResolvedValue(50000); // 只剩50秒

      jest.spyOn(service, 'set').mockResolvedValue();

      // Act
      const results = await service.mgetEnhanced(requests);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        key: 'stale-key',
        data: 'fresh-data',
        hit: false,
        ttlRemaining: 300,
        source: 'fetch',
        metadata: expect.objectContaining({
          fetchTime: expect.any(Number),
          storedAt: expect.any(Number)
        })
      });

      expect(mockFetchFn).toHaveBeenCalled();
      expect(service.set).toHaveBeenCalledWith('stale-key', 'fresh-data', 300);
    });

    it('应该处理空请求数组', async () => {
      // Act
      const results = await service.mgetEnhanced([]);

      // Assert
      expect(results).toEqual([]);
      expect(mockRedis.mget).not.toHaveBeenCalled();
    });

    it('应该在超过批量限制时返回错误结果', async () => {
      // Arrange
      const requests = Array.from({ length: 101 }, (_, i) => ({ key: `key${i}` }));

      // Act
      const results = await service.mgetEnhanced(requests);

      // Assert
      expect(results).toHaveLength(101);
      expect(results.every(r => r.source === 'error')).toBe(true);
      expect(results.every(r => r.data === null)).toBe(true);
      expect(results[0].metadata?.error).toContain('Batch size 101 exceeds limit 100');
    });
  });

  describe('msetEnhanced', () => {
    it('应该正确执行批量设置操作', async () => {
      // Arrange
      const entries = [
        { key: 'key1', data: 'value1', ttl: 300 },
        { key: 'key2', data: 'value2', ttl: 600, options: { includeMetadata: true } },
        { key: 'key3', data: 'value3' } // 使用默认TTL
      ];

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'], // key1 成功
          [null, 'OK'], // key2 成功
          [null, 'OK']  // key3 成功
        ])
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockCompressionService.shouldCompress.mockReturnValue(false);
      
      // Setup RedisValueUtils.serialize mock
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('serialized-value');

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
        skipped: 0,
        details: [
          { key: 'key1', status: 'success' },
          { key: 'key2', status: 'success' },
          { key: 'key3', status: 'success' }
        ]
      });

      expect(mockPipeline.setex).toHaveBeenCalledTimes(3);
      expect(mockPipeline.setex).toHaveBeenCalledWith('key1', 300, expect.any(String));
      expect(mockPipeline.setex).toHaveBeenCalledWith('key2', 600, expect.any(String));
      expect(mockPipeline.setex).toHaveBeenCalledWith('key3', 300, expect.any(String)); // 默认TTL
    });

    it('应该支持skipIfExists选项', async () => {
      // Arrange
      const entries = [
        { key: 'existing-key', data: 'value1', options: { skipIfExists: true } },
        { key: 'new-key', data: 'value2', options: { skipIfExists: true } }
      ];

      // Mock existing-key存在，new-key不存在
      mockRedis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'] // 只有new-key被设置
        ])
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockCompressionService.shouldCompress.mockReturnValue(false);
      
      // Setup RedisValueUtils.serialize mock
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('serialized-value');

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result).toEqual({
        total: 2,
        successful: 1,
        failed: 0,
        skipped: 1,
        details: [
          { key: 'existing-key', status: 'skipped', reason: 'Key already exists (skipIfExists=true)' },
          { key: 'new-key', status: 'success' }
        ]
      });

      expect(mockRedis.exists).toHaveBeenCalledTimes(2);
      expect(mockPipeline.setex).toHaveBeenCalledTimes(1);
      expect(mockPipeline.setex).toHaveBeenCalledWith('new-key', 300, expect.any(String));
    });

    it('应该支持onlyIfExists选项', async () => {
      // Arrange
      const entries = [
        { key: 'existing-key', data: 'value1', options: { onlyIfExists: true } },
        { key: 'missing-key', data: 'value2', options: { onlyIfExists: true } }
      ];

      // Mock existing-key存在，missing-key不存在
      mockRedis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'] // 只有existing-key被设置
        ])
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockCompressionService.shouldCompress.mockReturnValue(false);
      
      // Setup RedisValueUtils.serialize mock
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('serialized-value');

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result).toEqual({
        total: 2,
        successful: 1,
        failed: 0,
        skipped: 1,
        details: [
          { key: 'existing-key', status: 'success' },
          { key: 'missing-key', status: 'skipped', reason: 'Key does not exist (onlyIfExists=true)' }
        ]
      });

      expect(mockPipeline.setex).toHaveBeenCalledTimes(1);
      expect(mockPipeline.setex).toHaveBeenCalledWith('existing-key', 300, expect.any(String));
    });

    it('应该支持压缩选项', async () => {
      // Arrange
      const entries = [
        { 
          key: 'large-data',
          data: 'very large data that should be compressed',
          options: { compression: true }
        }
      ];

      mockCompressionService.shouldCompress.mockReturnValue(true);
      mockCompressionService.compress.mockResolvedValue({
        compressedData: 'compressed-data',
        metadata: { 
          compressed: true, 
          originalSize: 100, 
          compressedSize: 50,
          storedAt: Date.now()
        },
        compressionRatio: 0.5
      });

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 'OK']])
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      
      // Setup RedisValueUtils.serialize mock
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('compressed-serialized-value');

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.successful).toBe(1);
      expect(mockCompressionService.shouldCompress).toHaveBeenCalled();
      expect(mockCompressionService.compress).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledWith('large-data', 300, expect.any(String));
    });

    it('应该处理部分失败的情况', async () => {
      // Arrange
      const entries = [
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: 'value2' },
        { key: 'key3', data: 'value3' }
      ];

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'], // key1 成功
          [new Error('Redis error'), null], // key2 失败
          [null, 'OK']  // key3 成功
        ])
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockCompressionService.shouldCompress.mockReturnValue(false);
      
      // Setup RedisValueUtils.serialize mock
      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('serialized-value');

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
        skipped: 0,
        details: [
          { key: 'key1', status: 'success' },
          { key: 'key2', status: 'failed', reason: 'Redis error' },
          { key: 'key3', status: 'success' }
        ]
      });
    });

    it('应该处理空条目数组', async () => {
      // Act
      const result = await service.msetEnhanced([]);

      // Assert
      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        details: []
      });

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('应该在超过批量限制时返回全部失败结果', async () => {
      // Arrange
      const entries = Array.from({ length: 101 }, (_, i) => ({ 
        key: `key${i}`,
        data: `value${i}`
      }));

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert - 应该返回全部失败的结果
      expect(result.total).toBe(101);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(101);
      expect(result.skipped).toBe(0);
      expect(result.details.every(d => d.status === 'failed')).toBe(true);
      expect(result.details[0].reason).toContain('Batch size 101 exceeds limit 100');
    });
  });

  describe('指标记录', () => {
    it('应该为增强版操作记录正确的指标', async () => {
      // Arrange
      mockRedis.mget.mockResolvedValue([]);
      mockRedis.pttl.mockResolvedValue(-2);

      // Act - mgetEnhanced
      await service.mgetEnhanced([]);

      // Assert
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith('cacheOperationsTotal', { op: 'mget_enhanced', status: 'success' });
      expect(mockMetricsRegistry.observe).toHaveBeenCalledWith('cacheQueryDuration', expect.any(Number), { op: 'mget_enhanced' });

      jest.clearAllMocks();

      // Act - msetEnhanced
      await service.msetEnhanced([]);

      // Assert
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith('cacheOperationsTotal', { op: 'mset_enhanced', status: 'success' });
      expect(mockMetricsRegistry.observe).toHaveBeenCalledWith('cacheQueryDuration', expect.any(Number), { op: 'mset_enhanced' });
    });
  });
});