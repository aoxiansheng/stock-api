/**
 * CommonCacheService增强版批量操作单元测试 (简化版)
 * 测试Phase 4.1.2的mgetEnhanced和msetEnhanced功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommonCacheService } from '../../../../../../../src/core/05-caching/common-cache/services/common-cache.service';
import { RedisValueUtils } from '../../../../../../../src/core/05-caching/common-cache/utils/redis-value.utils';
import { ICollector } from '../../../../../../../src/monitoring/contracts/interfaces/collector.interface';

// Mock RedisValueUtils
jest.mock('../../../../../../../src/core/05-caching/common-cache/utils/redis-value.utils');

describe('CommonCacheService - Enhanced Operations (Simplified)', () => {
  let service: CommonCacheService;
  let mockRedis: any;
  let mockCollector: jest.Mocked<ICollector>;
  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      lrange: jest.fn(),
      lpush: jest.fn(),
      rpush: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      sismember: jest.fn(),
    };
    
    mockCollector = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
      getRawMetrics: jest.fn(),
      getSystemMetrics: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: 'COLLECTOR_SERVICE', 
          useValue: mockCollector,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    service = module.get<CommonCacheService>(CommonCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('简化的mgetEnhanced测试', () => {
    it('应该处理基本的批量获取', async () => {
      // Arrange
      const keys = ['key1', 'key2'];

      mockRedis.mget.mockResolvedValue(['value1', 'value2']);
      mockRedis.pttl.mockResolvedValue(300000);

      const mockedParse = jest.mocked(RedisValueUtils.parse);
      mockedParse
        .mockReturnValueOnce({ data: 'value1', compressed: false })
        .mockReturnValueOnce({ data: 'value2', compressed: false });

      // Act
      const results = await service.mgetEnhanced(keys);

      // Assert
      expect(results.data).toHaveLength(2);
      expect(results.summary.hits).toBe(2);
    });

    it('应该处理缓存未命中', async () => {
      // Arrange
      const keys = ['missing-key'];
      
      mockRedis.mget.mockResolvedValue([null]);
      mockRedis.pttl.mockResolvedValue(-2);

      // Act
      const results = await service.mgetEnhanced(keys);

      // Assert
      expect(results.data).toHaveLength(1);
      expect(results.data[0].value).toBeNull();
      expect(results.summary.misses).toBe(1);
    });
  });

  describe('简化的msetEnhanced测试', () => {
    it('应该处理基本的批量设置', async () => {
      // Arrange
      const entries = [
        { key: 'key1', value: 'value1', ttl: 300 },
        { key: 'key2', value: 'value2', ttl: 600 }
      ];

      const mockedSerialize = jest.mocked(RedisValueUtils.serialize);
      mockedSerialize.mockReturnValue('serialized-value');

      mockRedis.multi.mockReturnValue({
        psetex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([['OK'], ['OK']])
      });

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
    });

    it('应该处理超过限制的批次大小', async () => {
      // Arrange - Create 101 entries to exceed limit
      const entries = Array.from({ length: 101 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`
      }));

      // Act
      const result = await service.msetEnhanced(entries);

      // Assert
      expect(result.summary.total).toBe(101);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(101);
      expect(result.results.every(d => !d.success)).toBe(true);
      expect(result.results[0].error).toContain('Batch size 101 exceeds limit 100');
    });
  });

  describe('mget简单测试', () => {
    it('应该处理mget方法调用', async () => {
      // Arrange
      const keys = ['key1'];
      
      // Act - This should pass string array directly to mgetEnhanced
      const results = await service.mgetEnhanced(keys);

      // Assert - Should not throw error
      expect(results.data).toHaveLength(1);
    });
  });
});