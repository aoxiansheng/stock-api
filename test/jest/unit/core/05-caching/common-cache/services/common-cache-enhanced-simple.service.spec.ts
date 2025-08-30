/**
 * CommonCacheService增强版批量操作单元测试 (简化版)
 * 测试Phase 4.1.2的mgetEnhanced和msetEnhanced功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommonCacheService } from '../../../../../../../src/core/05-caching/common-cache/services/common-cache.service';
import { CacheCompressionService } from '../../../../../../../src/core/05-caching/common-cache/services/cache-compression.service';
import Redis from 'ioredis';

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

// Mock RedisValueUtils with simple implementation
jest.mock('../../../../../../../src/core/public/common-cache/utils/redis-value.utils', () => ({
  RedisValueUtils: {
    serialize: jest.fn((data: any) => JSON.stringify({ data, storedAt: Date.now() })),
    parse: jest.fn((value: string) => {
      const parsed = JSON.parse(value);
      return { data: parsed.data, storedAt: parsed.storedAt };
    })
  }
}));

describe('CommonCacheService Enhanced Batch Operations (Simple)', () => {
  let service: CommonCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let mockCompressionService: jest.Mocked<CacheCompressionService>;
  let mockMetricsRegistry: any;

  beforeEach(async () => {
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

  describe('mgetEnhanced基本功能', () => {
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
    });
  });

  describe('msetEnhanced基本功能', () => {
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

      // Assert
      expect(result.total).toBe(101);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(101);
      expect(result.skipped).toBe(0);
      expect(result.details.every(d => d.status === 'failed')).toBe(true);
      expect(result.details[0].reason).toContain('Batch size 101 exceeds limit 100');
    });
  });

  describe('指标记录验证', () => {
    it('应该为增强版操作记录正确的指标', async () => {
      // Arrange - 使用非空数组来触发指标记录
      const requests = [{ key: 'test-key' }];
      const entries = [{ key: 'test-key', data: 'test-value' }];
      
      mockRedis.mget.mockResolvedValue([null]);
      mockRedis.pttl.mockResolvedValue(-2);
      
      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 'OK']])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockCompressionService.shouldCompress.mockReturnValue(false);

      // Act - mgetEnhanced
      await service.mgetEnhanced(requests);

      // Assert
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith('cacheOperationsTotal', { op: 'mget_enhanced', status: 'success' });
      expect(mockMetricsRegistry.observe).toHaveBeenCalledWith('cacheQueryDuration', expect.any(Number), { op: 'mget_enhanced' });

      jest.clearAllMocks();

      // Act - msetEnhanced
      await service.msetEnhanced(entries);

      // Assert
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith('cacheOperationsTotal', { op: 'mset_enhanced', status: 'success' });
      expect(mockMetricsRegistry.observe).toHaveBeenCalledWith('cacheQueryDuration', expect.any(Number), { op: 'mset_enhanced' });
    });
  });
});