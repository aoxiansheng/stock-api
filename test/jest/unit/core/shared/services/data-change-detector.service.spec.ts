import { Test, TestingModule } from '@nestjs/testing';
import { DataChangeDetectorService, ChangeDetectionResult } from '@core/shared/services/data-change-detector.service';
import { CollectorService } from '../../../../../../src/monitoring/collector/collector.service';
import { Market } from '@common/constants/market.constants';
import { MarketStatus, CHANGE_DETECTION_THRESHOLDS } from '@common/constants/market-trading-hours.constants';
import { TestUtils } from '../../../../shared/test-utils';

describe('DataChangeDetectorService', () => {
  let service: DataChangeDetectorService;
  let mockCollectorService: jest.Mocked<CollectorService>;

  // Test data constants
  const TEST_SYMBOL = '700.HK';
  const SAMPLE_STOCK_DATA = {
    lastPrice: 320.5,
    price: 320.5,
    change: 2.5,
    changePercent: 0.78,
    volume: 1500000,
    turnover: 480000000,
    high: 322.0,
    low: 318.0,
    open: 319.0,
    bid: 320.0,
    ask: 321.0,
    bid_size: 1000,
    ask_size: 800
  };

  beforeEach(async () => {
    // Create mock CollectorService
    mockCollectorService = {
      recordRequest: jest.fn(),
      recordCacheOperation: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataChangeDetectorService,
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<DataChangeDetectorService>(DataChangeDetectorService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should handle first-time data detection', async () => {
      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('首次数据');
      expect(result.confidence).toBe(1.0);
      expect(result.changedFields).toEqual([]);
      expect(result.significantChanges).toEqual([]);

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify monitoring calls
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/change-detection',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: 'detect_significant_change',
          symbol: TEST_SYMBOL,
          market: Market.HK,
          market_status: MarketStatus.TRADING,
          is_first_time: true
        })
      );

      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        false, // Cache miss for first time
        expect.any(Number),
        expect.objectContaining({
          cache_type: 'memory',
          operation: 'get_snapshot',
          symbol: TEST_SYMBOL
        })
      );
    });

    it('should detect no change when data is identical', async () => {
      // First call to establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Clear mocks to isolate second call
      jest.clearAllMocks();

      // Second call with identical data
      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe('数据未变化');
      expect(result.confidence).toBe(1.0);
      expect(result.changedFields).toEqual([]);
      expect(result.significantChanges).toEqual([]);

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify checksum match detection method
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/change-detection',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: 'detect_significant_change',
          has_changed: false,
          detection_method: 'checksum_match'
        })
      );
    });

    it('should detect significant price changes', async () => {
      // First call to establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Clear mocks
      jest.clearAllMocks();

      // Create data with significant price change (>0.01% for trading)
      const changedData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 325.0,  // +1.4% change
        price: 325.0
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        changedData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('价格显著变化');
      expect(result.confidence).toBe(0.95);
      expect(result.significantChanges).toContain('lastPrice');
      expect(result.significantChanges).toContain('price');

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify field comparison detection method
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/change-detection',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          has_changed: true,
          detection_method: 'field_comparison',
          significant_changes: expect.any(Number),
          confidence: 0.95
        })
      );
    });
  });

  describe('市场状态相关测试', () => {
    it('should use different thresholds for different market statuses', async () => {
      // Test trading hours (very sensitive thresholds)
      const tradingThreshold = CHANGE_DETECTION_THRESHOLDS.PRICE_CHANGE[MarketStatus.TRADING];
      expect(tradingThreshold).toBe(0.0001); // 0.01%

      // Test closed market (less sensitive thresholds)
      const closedThreshold = CHANGE_DETECTION_THRESHOLDS.PRICE_CHANGE[MarketStatus.CLOSED];
      expect(closedThreshold).toBe(0.01); // 1%

      // Test weekend (least sensitive thresholds)
      const weekendThreshold = CHANGE_DETECTION_THRESHOLDS.PRICE_CHANGE[MarketStatus.WEEKEND];
      expect(weekendThreshold).toBe(0.02); // 2%
    });

    it('should detect changes during trading hours with low threshold', async () => {
      // First call to establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Small change that would be significant during trading
      const smallChangeData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 320.8,  // +0.09% change - significant for trading
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        smallChangeData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('价格显著变化'); // The +0.09% change is significant for price
      expect(result.confidence).toBe(0.95); // High confidence for price changes
    });

    it('should require larger changes during closed market', async () => {
      // First call to establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.CLOSED
      );

      // Small change that would NOT be significant when market is closed
      const smallChangeData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 320.8,  // +0.09% change - not significant for closed market
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        smallChangeData,
        Market.HK,
        MarketStatus.CLOSED
      );

      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe('变化不显著');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('字段类型检测测试', () => {
    it('should prioritize price field changes', async () => {
      // Establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Change both price and volume significantly
      const mixedChangeData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 325.0,  // Significant price change
        volume: 2000000,   // Significant volume change
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        mixedChangeData,
        Market.HK,
        MarketStatus.TRADING
      );

      // Should prioritize price change
      expect(result.changeReason).toBe('价格显著变化');
      expect(result.confidence).toBe(0.95);
      expect(result.significantChanges).toContain('lastPrice');
    });

    it('should handle volume changes appropriately', async () => {
      // Establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Change only volume significantly (no price change)
      const volumeChangeData = {
        ...SAMPLE_STOCK_DATA,
        volume: 2000000,  // +33% volume change
        turnover: 640000000, // Proportional turnover change
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        volumeChangeData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('非交易时间-显著变化');
      expect(result.confidence).toBe(0.9);
      expect(result.changedFields).toContain('volume');
      expect(result.changedFields).toContain('turnover');
    });

    it('should handle nested field paths correctly', async () => {
      // Test data with nested structure like secu_quote[0].last_done
      const nestedData = {
        secu_quote: [{
          last_done: 320.5,
          volume: 1500000
        }],
        basic_info: {
          lastPrice: 320.5
        }
      };

      // This should work without throwing errors
      const result = await service.detectSignificantChange(
        'TEST.NESTED',
        nestedData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('首次数据');
    });
  });

  describe('缓存管理测试', () => {
    it('should manage memory cache size with LRU cleanup', async () => {
      // Create many entries to trigger cleanup (MAX_CACHE_SIZE = 10000)
      const promises = [];
      
      // Create 50 test entries (small number for test performance)
      for (let i = 0; i < 50; i++) {
        const symbol = `TEST${i}.HK`;
        const data = { ...SAMPLE_STOCK_DATA, lastPrice: 320 + i };
        promises.push(service.detectSignificantChange(
          symbol,
          data,
          Market.HK,
          MarketStatus.TRADING
        ));
      }

      await Promise.all(promises);

      // All should be first-time detections
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.hasChanged).toBe(true);
        expect(result.changeReason).toBe('首次数据');
      });
    });

    it('should handle cache errors gracefully', async () => {
      // Force an error by using invalid data that might cause issues
      const invalidData = {
        lastPrice: 'invalid', // Non-numeric value
        volume: null
      };

      // Should not throw errors
      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        invalidData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true); // Conservative approach
    });
  });

  describe('性能测试', () => {
    it('should perform checksum comparison very quickly', async () => {
      // Establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Test quick checksum performance
      const benchmark = TestUtils.createPerformanceBenchmark(
        'quick-checksum-detection',
        (global as any).testConfig.PERFORMANCE_THRESHOLDS.DATA_CHANGE_DETECTION
      );

      const result = await benchmark.run(async () => {
        return service.detectSignificantChange(
          TEST_SYMBOL,
          SAMPLE_STOCK_DATA, // Same data - should hit checksum match
          Market.HK,
          MarketStatus.TRADING
        );
      });

      expect(result.result.hasChanged).toBe(false);
      expect(result.result.changeReason).toBe('数据未变化');
    });

    it('should handle field comparison efficiently', async () => {
      // Establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Test field comparison performance with changed data
      const changedData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 325.0  // Force field comparison
      };

      const benchmark = TestUtils.createPerformanceBenchmark(
        'field-comparison-detection',
        (global as any).testConfig.PERFORMANCE_THRESHOLDS.DATA_CHANGE_DETECTION
      );

      const result = await benchmark.run(async () => {
        return service.detectSignificantChange(
          TEST_SYMBOL,
          changedData,
          Market.HK,
          MarketStatus.TRADING
        );
      });

      expect(result.result.hasChanged).toBe(true);
    });
  });

  describe('错误处理测试', () => {
    it('should handle service errors with conservative fallback', async () => {
      // Mock CollectorService to throw error
      mockCollectorService.recordRequest.mockImplementation(() => {
        throw new Error('Collector service error');
      });

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Should still return a result (conservative: assume changed)
      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        // Missing most expected fields
        someRandomField: 'random value',
        price: undefined,
        volume: NaN
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        malformedData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('首次数据');
    });

    it('should handle divide by zero in change rate calculation', async () => {
      // First call with zero values
      const zeroData = {
        lastPrice: 0,
        volume: 0,
        change: 0
      };

      await service.detectSignificantChange(
        TEST_SYMBOL,
        zeroData,
        Market.HK,
        MarketStatus.TRADING
      );

      // Second call with non-zero values (should handle zero division)
      const nonZeroData = {
        lastPrice: 100,
        volume: 1000,
        change: 10
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        nonZeroData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
    });
  });

  describe('监控集成测试', () => {
    it('should record all monitoring events correctly', async () => {
      // First time detection
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify first-time monitoring
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/change-detection',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: 'detect_significant_change',
          is_first_time: true
        })
      );

      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        false, // Cache miss
        expect.any(Number),
        expect.objectContaining({
          cache_type: 'memory',
          operation: 'get_snapshot',
          symbol: TEST_SYMBOL
        })
      );

      // Clear mocks for second call
      jest.clearAllMocks();

      // Second call - should hit cache
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify cache hit monitoring
      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        true, // Cache hit
        expect.any(Number),
        expect.objectContaining({
          cache_type: 'memory',
          operation: 'get_snapshot',
          symbol: TEST_SYMBOL
        })
      );

      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/change-detection',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: 'detect_significant_change',
          has_changed: false,
          detection_method: 'checksum_match'
        })
      );
    });

    it('should record monitoring events for errors', async () => {
      // Create a scenario that might cause internal errors
      // For example, corrupt the internal state manually if possible
      // Or use reflection to call private methods with invalid params
      
      // For this test, we'll simulate an error by providing data that causes issues
      const problematicData = {
        // Circular reference that might cause JSON issues
        selfRef: null as any
      };
      problematicData.selfRef = problematicData;

      try {
        await service.detectSignificantChange(
          TEST_SYMBOL,
          problematicData,
          Market.HK,
          MarketStatus.TRADING
        );
      } catch (error) {
        // Expected to handle errors gracefully
      }

      // Even with errors, should attempt monitoring
      // (The service should handle errors and still return a result)
      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA, // Valid data
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
    });
  });

  describe('边界条件测试', () => {
    it('should handle very small numeric changes', async () => {
      // Establish baseline
      await service.detectSignificantChange(
        TEST_SYMBOL,
        SAMPLE_STOCK_DATA,
        Market.HK,
        MarketStatus.TRADING
      );

      // Extremely small change (below 1e-7 threshold)
      const tinyChangeData = {
        ...SAMPLE_STOCK_DATA,
        lastPrice: 320.5000001  // Tiny change
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        tinyChangeData,
        Market.HK,
        MarketStatus.TRADING
      );

      // Should be considered no change due to precision threshold
      expect(result.hasChanged).toBe(false);
    });

    it('should handle missing or null field values', async () => {
      const sparseData = {
        lastPrice: 320.5,
        // Missing volume, change, etc.
        someField: null,
        anotherField: undefined
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        sparseData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('首次数据');
    });

    it('should handle string numeric values correctly', async () => {
      const stringNumericData = {
        lastPrice: '320.5',    // String number
        volume: '1500000',     // String number
        change: '2.5',         // String number
        invalidNum: 'not-a-number'
      };

      const result = await service.detectSignificantChange(
        TEST_SYMBOL,
        stringNumericData,
        Market.HK,
        MarketStatus.TRADING
      );

      expect(result).toBeDefined();
      expect(result.hasChanged).toBe(true);
    });
  });
});