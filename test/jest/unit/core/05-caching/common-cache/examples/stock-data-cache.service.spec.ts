import { Test, TestingModule } from '@nestjs/testing';
// import { StockDataCacheService } from '@core/05-caching/common-cache/examples/stock-data-cache.service';
import { CommonCacheService } from '@core/05-caching/common-cache/services/common-cache.service';

describe.skip('StockDataCacheService', () => {
  let service: any; // StockDataCacheService;
  let mockCommonCache: jest.Mocked<CommonCacheService>;

  beforeEach(async () => {
    // 创建CommonCacheService的mock
    const mockCache = {
      getWithFallback: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      isHealthy: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // StockDataCacheService,
        {
          provide: CommonCacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    // service = module.get<StockDataCacheService>(StockDataCacheService);
    mockCommonCache = module.get<CommonCacheService>(CommonCacheService) as jest.Mocked<CommonCacheService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockQuote', () => {
    it('should get stock quote with fallback', async () => {
      const mockData = { symbol: 'AAPL', provider: 'longport', price: 150, timestamp: Date.now() };
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: mockData,
        hit: true,
        ttlRemaining: 3600,
      });

      const result = await service.getStockQuote('AAPL', 'longport');

      expect(result.data).toEqual(mockData);
      expect(result.hit).toBe(true);
      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        'stock_quote:AAPL:longport',
        expect.any(Function),
        3600,
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Cache error');
      mockCommonCache.getWithFallback.mockRejectedValue(error);

      await expect(service.getStockQuote('AAPL', 'longport')).rejects.toThrow('Cache error');
    });

    it('should generate correct cache key with market', async () => {
      mockCommonCache.getWithFallback.mockResolvedValue({
        data: { symbol: '700.HK' },
        hit: false,
        ttlRemaining: 3600,
      });

      await service.getStockQuote('700.HK', 'longport', 'HK');

      expect(mockCommonCache.getWithFallback).toHaveBeenCalledWith(
        'stock_quote:700.HK:longport:HK',
        expect.any(Function),
        3600,
      );
    });
  });

  describe('getBatchStockQuotes', () => {
    it('should handle batch requests with mixed cache hits/misses', async () => {
      const requests = [
        { symbol: 'AAPL', provider: 'longport' },
        { symbol: 'GOOGL', provider: 'longport' },
        { symbol: 'MSFT', provider: 'longport' },
      ];

      // 模拟部分命中的情况
      mockCommonCache.mget.mockResolvedValue([
        { data: { symbol: 'AAPL', price: 150 }, ttlRemaining: 1800 },
        null, // GOOGL缓存未命中
        { data: { symbol: 'MSFT', price: 300 }, ttlRemaining: 2400 },
      ]);

      // 模拟设置缓存的调用
      mockCommonCache.set.mockResolvedValue(undefined);

      const results = await service.getBatchStockQuotes(requests);

      expect(results).toHaveLength(3);
      expect(results[0].cached).toBe(true);
      expect(results[0].data.symbol).toBe('AAPL');
      expect(results[1].cached).toBe(false); // 从回源获取
      expect(results[2].cached).toBe(true);
      expect(results[2].data.symbol).toBe('MSFT');

      expect(mockCommonCache.mget).toHaveBeenCalledWith([
        'stock_quote:AAPL:longport',
        'stock_quote:GOOGL:longport',
        'stock_quote:MSFT:longport',
      ]);
    });

    it('should handle empty batch requests', async () => {
      const results = await service.getBatchStockQuotes([]);
      expect(results).toEqual([]);
    });
  });

  describe('setMarketStatus', () => {
    it('should set market status successfully', async () => {
      const marketStatus = { open: true, closeTime: '16:00' };
      mockCommonCache.set.mockResolvedValue(undefined);

      const result = await service.setMarketStatus('HK', marketStatus);

      expect(result).toBe(true);
      expect(mockCommonCache.set).toHaveBeenCalledWith(
        'market_status:HK',
        marketStatus,
        3600,
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockCommonCache.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.setMarketStatus('HK', { open: true });

      expect(result).toBe(false);
    });

    it('should use custom TTL when provided', async () => {
      mockCommonCache.set.mockResolvedValue(undefined);

      await service.setMarketStatus('US', { open: false }, 7200);

      expect(mockCommonCache.set).toHaveBeenCalledWith(
        'market_status:US',
        { open: false },
        7200,
      );
    });
  });

  describe('setBatchSymbolMappings', () => {
    it('should set batch symbol mappings', async () => {
      const mappings = [
        { source: 'AAPL', target: 'longport', data: { mapped: 'AAPL.US' } },
        { source: '700', target: 'longport', data: { mapped: '700.HK' } },
      ];
      mockCommonCache.mset.mockResolvedValue(undefined);

      const result = await service.setBatchSymbolMappings(mappings);

      expect(result).toBe(true);
      expect(mockCommonCache.mset).toHaveBeenCalledWith([
        {
          key: 'symbol_mapping:AAPL:longport',
          data: { mapped: 'AAPL.US' },
          ttl: 86400,
        },
        {
          key: 'symbol_mapping:700:longport',
          data: { mapped: '700.HK' },
          ttl: 86400,
        },
      ]);
    });
  });

  describe('clearStockCache', () => {
    it('should clear cache for specific provider', async () => {
      mockCommonCache.delete.mockResolvedValue(true);

      const result = await service.clearStockCache('AAPL', 'longport');

      expect(result).toBe(true);
      expect(mockCommonCache.delete).toHaveBeenCalledWith('stock_quote:AAPL:longport');
    });

    it('should clear cache for all providers when none specified', async () => {
      mockCommonCache.delete.mockResolvedValue(true);

      const result = await service.clearStockCache('AAPL');

      expect(result).toBe(true);
      expect(mockCommonCache.delete).toHaveBeenCalledTimes(2); // longport + itick
    });
  });

  describe('getCacheHealth', () => {
    it('should return health status and stats', async () => {
      const mockStats = {
        connected: true,
        usedMemory: '10MB',
        totalKeys: 1000,
      };

      mockCommonCache.isHealthy.mockResolvedValue(true);
      mockCommonCache.getStats.mockResolvedValue(mockStats);

      const result = await service.getCacheHealth();

      expect(result.healthy).toBe(true);
      expect(result.stats).toEqual(mockStats);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle health check errors', async () => {
      mockCommonCache.isHealthy.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getCacheHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });
});