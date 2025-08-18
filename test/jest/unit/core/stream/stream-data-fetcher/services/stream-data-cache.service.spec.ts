/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataCacheService, CompressedDataPoint, CacheStats } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-cache.service';
import { CacheService } from '../../../../../../../src/cache/services/cache.service';
import { createLogger } from '../../../../../../../src/common/config/logger.config';

// Mock logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock CacheService
const mockCacheService = {
  get: jest.fn(),
  _set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
};

describe('StreamDataCacheService', () => {
  let service: StreamDataCacheService;
  let cacheService: jest.Mocked<CacheService>;

  const mockCompressedData: CompressedDataPoint[] = [
    {
      s: 'AAPL.US',
      p: 150.25,
      v: 1000,
      t: Date.now(),
      c: 2.5,
      cp: 1.69,
    },
    {
      s: '700.HK',
      p: 320.80,
      v: 2000,
      t: Date.now(),
      c: -5.2,
      cp: -1.59,
    },
  ];

  const mockRawData = [
    {
      symbol: 'AAPL.US',
      price: 150.25,
      volume: 1000,
      timestamp: Date.now(),
      change: 2.5,
      changePercent: 1.69,
    },
    {
      symbol: '700.HK',
      lastPrice: 320.80,
      volume: 2000,
      timestamp: Date.now(),
      change: -5.2,
      changePercent: -1.59,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamDataCacheService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<StreamDataCacheService>(StreamDataCacheService);
    cacheService = module.get(CacheService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该正确实例化服务', () => {
      expect(service).toBeDefined();
    });

    it('应该返回初始缓存统计信息', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toEqual({
        _hotCacheHits: 0,
        hotCacheMisses: 0,
        warmCacheHits: 0,
        _warmCacheMisses: 0,
        _totalSize: 0,
        compressionRatio: 0,
      });
    });
  });

  describe('数据设置和获取', () => {
    it('应该成功设置数据到缓存', async () => {
      mockCacheService._set.mockResolvedValue(true);

      await service.setData('quote:AAPL.US', mockRawData, 'hot');

      expect(mockCacheService._set).toHaveBeenCalledWith(
        'streamcache:quote:AAPL.US',
        expect.any(String),
        { ttl: 300 }
      );
    });

    it('应该成功从热缓存获取数据', async () => {
      // 先设置数据到热缓存
      await service.setData('quote:AAPL.US', mockRawData, 'hot');
      
      // 获取数据
      const result = await service.getData('quote:AAPL.US');
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].s).toBe('AAPL.US');
      expect(result![1].s).toBe('700.HK');
    });

    it('应该从温缓存获取数据并提升到热缓存', async () => {
      const serializedData = JSON.stringify(mockCompressedData);
      mockCacheService.get.mockResolvedValue(serializedData);

      const result = await service.getData('quote:TESLA.US');

      expect(result).toEqual(mockCompressedData);
      expect(mockCacheService.get).toHaveBeenCalledWith('stream_cache:quote:TESLA.US');
    });

    it('应该在缓存未命中时返回 null', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getData('quote:NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('智能缓存策略', () => {
    it('应该根据数据大小自动选择缓存策略', async () => {
      const smallData = [{ symbol: 'AAPL.US', price: 150 }];
      const largeData = Array(200).fill({
        symbol: 'AAPL.US',
        price: 150,
        volume: 1000,
        timestamp: Date.now(),
      });

      mockCacheService._set.mockResolvedValue(true);

      // 小数据应该使用热缓存
      await service.setData('quote:small', smallData, 'auto');
      
      // 大数据应该只使用温缓存
      await service.setData('quote:large', largeData, 'auto');

      expect(mockCacheService._set).toHaveBeenCalledTimes(2);
    });

    it('应该正确压缩原始数据', async () => {
      mockCacheService._set.mockResolvedValue(true);

      await service.setData('quote:test', mockRawData);

      const result = await service.getData('quote:test');
      expect(result).toBeDefined();
      expect(result![0]).toMatchObject({
        s: 'AAPL.US',
        p: 150.25,
        v: 1000,
        t: expect.any(Number),
      });
    });
  });

  describe('增量查询', () => {
    it('应该返回指定时间戳之后的数据', async () => {
      const baseTime = Date.now();
      const testData = [
        { s: 'AAPL.US', p: 150, v: 1000, t: baseTime - 1000 },
        { s: 'AAPL.US', p: 151, v: 1100, t: baseTime + 1000 },
        { s: 'AAPL.US', p: 152, v: 1200, t: baseTime + 2000 },
      ];

      // 先设置数据到热缓存
      await service.setData('quote:AAPL.US', testData);

      const result = await service.getDataSince('quote:AAPL.US', baseTime);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].t).toBeGreaterThan(baseTime);
      expect(result![1].t).toBeGreaterThan(baseTime);
    });

    it('应该在没有增量数据时返回 null', async () => {
      const baseTime = Date.now();
      const testData = [
        { s: 'AAPL.US', p: 150, v: 1000, t: baseTime - 2000 },
        { s: 'AAPL.US', p: 151, v: 1100, t: baseTime - 1000 },
      ];

      await service.setData('quote:test', testData);

      const result = await service.getDataSince('quote:test', baseTime);

      expect(result).toBeNull();
    });
  });

  describe('批量操作', () => {
    it('应该批量获取多个键的数据', async () => {
      const keys = ['quote:AAPL.US', 'quote:700.HK', 'quote:NOTFOUND'];
      
      // 设置一些测试数据
      await service.setData('quote:AAPL.US', [mockRawData[0]]);
      await service.setData('quote:700.HK', [mockRawData[1]]);

      const results = await service.getBatchData(keys);

      expect(results).toHaveProperty('quote:AAPL.US');
      expect(results).toHaveProperty('quote:700.HK');
      expect(results).toHaveProperty('quote:NOTFOUND');
      expect(results['quote:NOTFOUND']).toBeNull();
    });
  });

  describe('缓存管理', () => {
    it('应该正确删除缓存数据', async () => {
      mockCacheService.del.mockResolvedValue(1);

      await service.deleteData('quote:test');

      expect(mockCacheService.del).toHaveBeenCalledWith('stream_cache:quote:test');
    });

    it('应该清空所有缓存', async () => {
      mockCacheService.delByPattern.mockResolvedValue(5);

      await service.clearAll();

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('stream_cache:*');
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理 Redis 连接失败', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getData('quote:test');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '缓存查询失败',
        expect.objectContaining({
          key: 'quote:test',
          error: 'Redis connection failed',
        })
      );
    });

    it('应该优雅处理缓存设置失败', async () => {
      mockCacheService._set.mockRejectedValue(new Error('Redis write failed'));

      await expect(service.setData('quote:test', mockRawData)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '缓存设置失败',
        expect.objectContaining({
          key: 'quote:test',
          error: 'Redis write failed',
        })
      );
    });
  });

  describe('性能统计', () => {
    it('应该正确更新缓存命中统计', async () => {
      // 设置数据
      await service.setData('quote:test', mockRawData);
      
      // 命中热缓存
      await service.getData('quote:test');
      await service.getData('quote:test');

      const stats = service.getCacheStats();
      expect(stats.hotCacheHits).toBe(2);
      expect(stats.hotCacheMisses).toBe(0);
    });

    it('应该正确统计缓存未命中', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await service.getData('quote:notfound1');
      await service.getData('quote:notfound2');

      const stats = service.getCacheStats();
      expect(stats.hotCacheMisses).toBe(2);
      expect(stats.warmCacheMisses).toBe(2);
    });
  });

  describe('LRU 清理机制', () => {
    it('应该在达到最大缓存大小时清理最少使用的条目', async () => {
      // 这个测试需要访问私有方法，所以我们测试行为而不是实现
      const testData = { symbol: 'TEST', price: 100 };
      
      // 创建超过最大缓存大小的条目
      const promises = [];
      for (let i = 0; i < 1005; i++) {
        promises.push(service.setData(`quote:test${i}`, [testData], 'hot'));
      }
      
      await Promise.all(promises);

      // 验证统计信息显示缓存大小被控制
      const stats = service.getCacheStats();
      expect(stats.totalSize).toBeLessThanOrEqual(1000);
    });
  });
});