import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataChangeDetectorService, ChangeDetectionResult } from '@core/shared/services/data-change-detector.service';
import { CacheService } from '@cache/services/cache.service';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { UnitTestSetup } from '../../../../../testbasic/setup/unit-test-setup';
import { Market, MarketStatus, CHANGE_DETECTION_THRESHOLDS } from '@core/shared/constants/market.constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('DataChangeDetectorService', () => {
  let service: DataChangeDetectorService;
  let eventBus: any; 
  let cacheService: jest.Mocked<CacheService>;
  let marketInferenceService: jest.Mocked<MarketInferenceService>;
  let module: TestingModule;
  
  // 创建mock对象
  const mockEventBus = {
    emit: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  const mockStockData = {
    lastPrice: 152.5,
    volume: 1100000,
    change: 5.0,
    bid: 152.0,
    ask: 153.0,
    high: 155.0,
    low: 149.0,
  };

  const mockSnapshot = {
    symbol: 'AAPL',
    timestamp: Date.now(),
    checksum: '12345',
    criticalValues: {
      lastPrice: 150.0,
      volume: 1000000,
      change: 2.5,
    },
  };

  beforeEach(async () => {
    // 重置所有mock函数
    jest.clearAllMocks();
    
    const mockCacheService = {
      safeGet: jest.fn(),
      safeSet: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockMarketInferenceService = {
      inferMarketLabel: jest.fn(),
      inferMarket: jest.fn(),
      inferMarketStatus: jest.fn(),
    };

    // 使用Test.createTestingModule而不是UnitTestSetup
    module = await Test.createTestingModule({
      providers: [
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MarketInferenceService,
          useValue: mockMarketInferenceService,
        },
        DataChangeDetectorService,
      ],
    }).compile();

    service = module.get<DataChangeDetectorService>(DataChangeDetectorService);
    eventBus = module.get(EventEmitter2);
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
    marketInferenceService = module.get(MarketInferenceService) as jest.Mocked<MarketInferenceService>;

    // Default setup
    marketInferenceService.inferMarketLabel.mockReturnValue(Market.US);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of DataChangeDetectorService', () => {
      expect(service).toBeInstanceOf(DataChangeDetectorService);
    });

    it('should have injected dependencies', () => {
      expect(eventBus).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(marketInferenceService).toBeDefined();
      // 验证eventBus是否为mock对象
      expect(jest.isMockFunction(eventBus.emit)).toBe(true);
    });
  });

  describe('detectSignificantChange', () => {
    describe('First time detection', () => {
      beforeEach(() => {
        cacheService.safeGet.mockResolvedValue(null);
        cacheService.safeSet.mockResolvedValue(undefined);
      });

      it('should detect change for first time data', async () => {
        const result = await service.detectSignificantChange(
          'AAPL',
          mockStockData,
          Market.US,
          MarketStatus.TRADING
        );

        expect(result.hasChanged).toBe(true);
        expect(result.changeReason).toBe('首次数据');
        expect(result.confidence).toBe(1.0);
        expect(result.changedFields).toEqual([]);
        expect(result.significantChanges).toEqual([]);
      });

      it('should emit first time detection event', async () => {
        // 确保mock被清除
        mockEventBus.emit.mockClear();
        
        await service.detectSignificantChange(
          'AAPL',
          mockStockData,
          Market.US,
          MarketStatus.TRADING
        );

        // 由于事件是通过setImmediate异步发送的，我们需要等待事件循环
        await new Promise(resolve => setImmediate(resolve));

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            metricName: 'detect_significant_change_first_time',
            tags: expect.objectContaining({
              symbol: 'AAPL',
              market: Market.US,
              market_status: MarketStatus.TRADING,
              is_first_time: true,
            }),
          })
        );
      });

      it('should save snapshot for first time', async () => {
        await service.detectSignificantChange(
          'AAPL',
          mockStockData,
          Market.US,
          MarketStatus.TRADING
        );

        expect(cacheService.safeSet).toHaveBeenCalled();
      });
    });

    describe('Checksum matching', () => {
      beforeEach(() => {
        // Mock same checksum for no change scenario
        const sameChecksumSnapshot = {
          ...mockSnapshot,
          checksum: service['calculateQuickChecksum'](mockStockData),
        };
        cacheService.safeGet.mockResolvedValue(sameChecksumSnapshot);
      });

      it('should detect no change when checksum matches', async () => {
        const sameData = { ...mockStockData };

        const result = await service.detectSignificantChange(
          'AAPL',
          sameData,
          Market.US,
          MarketStatus.TRADING
        );

        expect(result.hasChanged).toBe(false);
        expect(result.changeReason).toBe('数据未变化');
        expect(result.confidence).toBe(1.0);
      });

      it('should emit no change event when checksum matches', async () => {
        // 确保mock被清除
        mockEventBus.emit.mockClear();
        
        const sameData = { ...mockStockData };

        await service.detectSignificantChange(
          'AAPL',
          sameData,
          Market.US,
          MarketStatus.TRADING
        );

        // 由于事件是通过setImmediate异步发送的，我们需要等待事件循环
        await new Promise(resolve => setImmediate(resolve));

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            metricName: 'detect_no_change',
            tags: expect.objectContaining({
              has_changed: false,
              detection_method: 'checksum_match',
            }),
          })
        );
      });
    });

    describe('Field change detection', () => {
      beforeEach(() => {
        cacheService.safeGet.mockResolvedValue(mockSnapshot);
        cacheService.safeSet.mockResolvedValue(undefined);
      });

      it('should detect significant price change', async () => {
        const significantPriceChange = {
          ...mockStockData,
          lastPrice: 200.0, // Significant change from 150.0
        };

        const result = await service.detectSignificantChange(
          'AAPL',
          significantPriceChange,
          Market.US,
          MarketStatus.TRADING
        );

        expect(result.hasChanged).toBe(true);
        expect(result.changeReason).toBe('价格显著变化');
        expect(result.confidence).toBe(0.95);
        expect(result.significantChanges).toContain('lastPrice');
      });

      it('should detect volume change during trading hours', async () => {
        const volumeChange = {
          ...mockStockData,
          volume: 2000000, // Double the volume
        };

        const result = await service.detectSignificantChange(
          'AAPL',
          volumeChange,
          Market.US,
          MarketStatus.TRADING
        );

        expect(result.hasChanged).toBe(true);
        expect(result.changedFields).toContain('volume');
      });

      it('should handle trading hours with minor changes', async () => {
        const minorChange = {
          ...mockStockData,
          lastPrice: 150.1, // Minor change from 150.0
        };

        const result = await service.detectSignificantChange(
          'AAPL',
          minorChange,
          Market.US,
          MarketStatus.TRADING
        );

        expect(result.hasChanged).toBe(true);
        expect(result.changeReason).toBe('价格显著变化');
        expect(result.confidence).toBe(0.95);
      });

      it('should be conservative during non-trading hours', async () => {
        const minorChange = {
          ...mockStockData,
          lastPrice: 150.1, // Minor change
        };

        const result = await service.detectSignificantChange(
          'AAPL',
          minorChange,
          Market.US,
          MarketStatus.MARKET_CLOSED
        );

        expect(result.hasChanged).toBe(true);
        expect(result.changeReason).toBe('非交易时间-显著变化');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Error handling', () => {
      it('should handle cache service errors gracefully', async () => {
        cacheService.safeGet.mockRejectedValue(new Error('Cache service error'));

        const result = await service.detectSignificantChange(
          'AAPL',
          mockStockData,
          Market.US,
          MarketStatus.TRADING
        );

        // Should fallback and still provide a result
        expect(result).toBeDefined();
        expect(result.hasChanged).toBe(true); // First time detection
      });

      it('should emit error event on failure', async () => {
        // 确保mock被清除
        mockEventBus.emit.mockClear();
        
        const error = new Error('Service error');
        cacheService.safeGet.mockRejectedValue(error);

        // Mock the private method to throw error
        jest.spyOn(service as any, 'getLastSnapshot').mockRejectedValue(error);

        await expect(
          service.detectSignificantChange(
            'AAPL',
            mockStockData,
            Market.US,
            MarketStatus.TRADING
          )
        ).rejects.toThrow();

        // 由于事件是通过setImmediate异步发送的，我们需要等待事件循环
        await new Promise(resolve => setImmediate(resolve));

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            metricName: 'detect_significant_change_failed',
            tags: expect.objectContaining({
              symbol: 'AAPL',
              market: Market.US,
              error: error.message,
            }),
          })
        );
      });
    });
  });

  describe('Private methods', () => {
    describe('calculateQuickChecksum', () => {
      it('should generate consistent checksums for same data', () => {
        const data1 = { lastPrice: 100, volume: 1000 };
        const data2 = { lastPrice: 100, volume: 1000 };

        const checksum1 = service['calculateQuickChecksum'](data1);
        const checksum2 = service['calculateQuickChecksum'](data2);

        expect(checksum1).toBe(checksum2);
      });

      it('should generate different checksums for different data', () => {
        const data1 = { lastPrice: 100, volume: 1000 };
        const data2 = { lastPrice: 101, volume: 1000 };

        const checksum1 = service['calculateQuickChecksum'](data1);
        const checksum2 = service['calculateQuickChecksum'](data2);

        expect(checksum1).not.toBe(checksum2);
      });

      it('should handle missing fields gracefully', () => {
        const data = { someOtherField: 'value' };

        const checksum = service['calculateQuickChecksum'](data);

        expect(checksum).toBeDefined();
        expect(typeof checksum).toBe('string');
      });
    });

    describe('extractNumericValue', () => {
      it('should extract simple numeric fields', () => {
        const data = { price: 100.5 };
        const value = service['extractNumericValue'](data, 'price');

        expect(value).toBe(100.5);
      });

      it('should extract nested fields', () => {
        const data = { quote: { lastPrice: 150.25 } };
        const value = service['extractNumericValue'](data, 'quote.lastPrice');

        expect(value).toBe(150.25);
      });

      it('should handle array indices', () => {
        const data = { quotes: [{ price: 200 }] };
        const value = service['extractNumericValue'](data, 'quotes[0].price');

        expect(value).toBe(200);
      });

      it('should return null for missing fields', () => {
        const data = { otherField: 'value' };
        const value = service['extractNumericValue'](data, 'missingField');

        expect(value).toBeNull();
      });

      it('should parse string numbers', () => {
        const data = { price: '123.45' };
        const value = service['extractNumericValue'](data, 'price');

        expect(value).toBe(123.45);
      });

      it('should return null for non-numeric strings', () => {
        const data = { price: 'not-a-number' };
        const value = service['extractNumericValue'](data, 'price');

        expect(value).toBeNull();
      });
    });

    describe('checkFieldChange', () => {
      it('should detect field changes', () => {
        const newData = { price: 100 };
        const lastValues = { price: 90 };

        const result = service['checkFieldChange'](newData, lastValues, 'price', 0.05);

        expect(result.hasChanged).toBe(true);
        expect(result.isSignificant).toBe(true); // 10/90 = 11% > 5%
      });

      it('should handle zero last value', () => {
        const newData = { price: 100 };
        const lastValues = { price: 0 };

        const result = service['checkFieldChange'](newData, lastValues, 'price', 0.05);

        expect(result.hasChanged).toBe(true);
        expect(result.isSignificant).toBe(true);
      });

      it('should detect no change for same values', () => {
        const newData = { price: 100 };
        const lastValues = { price: 100 };

        const result = service['checkFieldChange'](newData, lastValues, 'price', 0.05);

        expect(result.hasChanged).toBe(false);
        expect(result.isSignificant).toBe(false);
      });

      it('should handle missing fields', () => {
        const newData = {};
        const lastValues = { price: 100 };

        const result = service['checkFieldChange'](newData, lastValues, 'price', 0.05);

        expect(result.hasChanged).toBe(false);
        expect(result.isSignificant).toBe(false);
      });
    });

    describe('buildSnapshotCacheKey', () => {
      it('should build consistent cache keys', () => {
        const key1 = service['buildSnapshotCacheKey']('AAPL');
        const key2 = service['buildSnapshotCacheKey']('AAPL');

        expect(key1).toBe(key2);
        expect(key1).toBe('data_change_detector:snapshot:AAPL');
      });

      it('should build different keys for different symbols', () => {
        const key1 = service['buildSnapshotCacheKey']('AAPL');
        const key2 = service['buildSnapshotCacheKey']('GOOGL');

        expect(key1).not.toBe(key2);
      });
    });

    describe('getSnapshotCacheTTL', () => {
      it('should return crypto TTL for crypto symbols', () => {
        marketInferenceService.inferMarketLabel.mockReturnValue(Market.CRYPTO);

        const ttl = service['getSnapshotCacheTTL']('BTC-USD');

        expect(ttl).toBe(30);
      });

      it('should return US stock TTL for US symbols', () => {
        marketInferenceService.inferMarketLabel.mockReturnValue(Market.US);

        const ttl = service['getSnapshotCacheTTL']('AAPL');

        expect(ttl).toBe(60);
      });

      it('should return HK stock TTL for HK symbols', () => {
        marketInferenceService.inferMarketLabel.mockReturnValue(Market.HK);

        const ttl = service['getSnapshotCacheTTL']('0700.HK');

        expect(ttl).toBe(60);
      });

      it('should return default TTL for unknown markets', () => {
        marketInferenceService.inferMarketLabel.mockReturnValue('UNKNOWN' as any);

        const ttl = service['getSnapshotCacheTTL']('UNKNOWN');

        expect(ttl).toBe(60);
      });
    });

    describe('extractCriticalValues', () => {
      it('should extract all available critical values', () => {
        const data = {
          lastPrice: 100,
          volume: 1000,
          change: 2.5,
          high: 105,
          low: 95,
          bid: 99.5,
          ask: 100.5,
        };

        const values = service['extractCriticalValues'](data);

        expect(values).toEqual({
          lastPrice: 100,
          volume: 1000,
          change: 2.5,
          high: 105,
          low: 95,
          bid: 99.5,
          ask: 100.5,
        });
      });

      it('should skip missing values', () => {
        const data = {
          lastPrice: 100,
          someOtherField: 'ignored',
        };

        const values = service['extractCriticalValues'](data);

        expect(values).toEqual({
          lastPrice: 100,
        });
      });

      it('should handle empty data', () => {
        const data = {};

        const values = service['extractCriticalValues'](data);

        expect(values).toEqual({});
      });
    });
  });

  describe('Cache management', () => {
    describe('Memory cache cleanup', () => {
      it('should cleanup old snapshots when cache is full', async () => {
        // Fill cache beyond max size
        const maxSize = 10000; // SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE
        const cache = service['snapshotCache'];

        // Add more than max items
        for (let i = 0; i < maxSize + 100; i++) {
          cache.set(`symbol${i}`, {
            symbol: `symbol${i}`,
            timestamp: Date.now() - i * 1000, // Older timestamps
            checksum: `checksum${i}`,
            criticalValues: {},
          });
        }

        // Trigger cleanup by calling saveSnapshot
        cacheService.safeSet.mockResolvedValue(undefined);
        await service['saveSnapshot']('newSymbol', mockStockData);

        // Cache should be cleaned up
        expect(cache.size).toBeLessThanOrEqual(maxSize);
      });
    });

    describe('Redis cache integration', () => {
      it('should handle Redis cache hits', async () => {
        cacheService.safeGet.mockResolvedValue(mockSnapshot);

        const snapshot = await service['getLastSnapshot']('AAPL');

        expect(snapshot).toEqual(mockSnapshot);
        expect(cacheService.safeGet).toHaveBeenCalledWith('data_change_detector:snapshot:AAPL');
      });

      it('should fallback to memory cache when Redis fails', async () => {
        cacheService.safeGet.mockResolvedValue(null);
        service['snapshotCache'].set('AAPL', mockSnapshot);

        const snapshot = await service['getLastSnapshot']('AAPL');

        expect(snapshot).toEqual(mockSnapshot);
      });

      it('should handle Redis errors gracefully', async () => {
        cacheService.safeGet.mockRejectedValue(new Error('Redis error'));
        service['snapshotCache'].set('AAPL', mockSnapshot);

        const snapshot = await service['getLastSnapshot']('AAPL');

        expect(snapshot).toEqual(mockSnapshot);
      });
    });
  });

  describe('Event emission', () => {
    it('should handle event emission failures gracefully', async () => {
      // 确保mock被清除
      mockEventBus.emit.mockClear();
      
      // 设置mock实现，模拟抛出错误
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      cacheService.safeGet.mockResolvedValue(mockSnapshot);

      // 直接调用emitCacheEvent方法，而不是通过detectSignificantChange
      service['emitCacheEvent']('get', true, 10, { symbol: 'AAPL' });

      // 由于事件是通过setImmediate异步发送的，我们需要等待事件循环
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw, but log warning
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '缓存事件发送失败',
        expect.objectContaining({
          error: 'Event emission failed',
          operation: 'get',
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('should emit cache events', async () => {
      // 确保mock被清除
      mockEventBus.emit.mockClear();
      
      cacheService.safeGet.mockResolvedValue(mockSnapshot);

      await service['getLastSnapshot']('AAPL');

      // 由于事件是通过setImmediate异步发送的，我们需要等待事件循环
      await new Promise(resolve => setImmediate(resolve));

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'cache',
          metricName: 'cache_get',
          tags: expect.objectContaining({
            cache_type: 'redis',
            operation: 'get_snapshot',
            symbol: 'AAPL',
          }),
        })
      );
    });
  });

  describe('Performance monitoring', () => {
    it('should log performance warnings for slow operations', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service['logPerformance']('slow_operation', Date.now() - 15); // 15ms ago

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '数据变化检测性能异常',
        expect.objectContaining({
          operation: 'slow_operation',
          duration: expect.any(Number),
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('should not log performance warnings for fast operations', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service['logPerformance']('fast_operation', Date.now() - 5); // 5ms ago

      expect(loggerWarnSpy).not.toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });
  });
});
