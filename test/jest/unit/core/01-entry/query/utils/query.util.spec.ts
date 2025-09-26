import { buildStorageKey, validateDataFreshness } from '@core/01-entry/query/utils/query.util';

describe('Query Utilities', () => {
  describe('buildStorageKey', () => {
    describe('Basic Functionality', () => {
      it('should build key with all parameters', () => {
        const key = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        expect(key).toBe('US:longport:get-stock-quote:AAPL');
      });

      it('should use wildcard for missing provider', () => {
        const key = buildStorageKey('AAPL', undefined, 'get-stock-quote', 'US');
        expect(key).toBe('US:*:get-stock-quote:AAPL');
      });

      it('should use wildcard for missing queryTypeFilter', () => {
        const key = buildStorageKey('AAPL', 'longport', undefined, 'US');
        expect(key).toBe('US:longport:*:AAPL');
      });

      it('should use wildcard for missing market', () => {
        const key = buildStorageKey('AAPL', 'longport', 'get-stock-quote', undefined);
        expect(key).toBe('*:longport:get-stock-quote:AAPL');
      });

      it('should use wildcards for all missing optional parameters', () => {
        const key = buildStorageKey('AAPL');
        expect(key).toBe('*:*:*:AAPL');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string symbol', () => {
        const key = buildStorageKey('', 'longport', 'get-stock-quote', 'US');
        expect(key).toBe('US:longport:get-stock-quote:');
      });

      it('should handle empty string provider', () => {
        const key = buildStorageKey('AAPL', '', 'get-stock-quote', 'US');
        expect(key).toBe('US::get-stock-quote:AAPL');
      });

      it('should handle empty string queryTypeFilter', () => {
        const key = buildStorageKey('AAPL', 'longport', '', 'US');
        expect(key).toBe('US:longport::AAPL');
      });

      it('should handle empty string market', () => {
        const key = buildStorageKey('AAPL', 'longport', 'get-stock-quote', '');
        expect(key).toBe(':longport:get-stock-quote:AAPL');
      });

      it('should handle all empty strings', () => {
        const key = buildStorageKey('', '', '', '');
        expect(key).toBe(':::');
      });

      it('should handle special characters in symbol', () => {
        const key = buildStorageKey('700.HK', 'longport', 'get-stock-quote', 'HK');
        expect(key).toBe('HK:longport:get-stock-quote:700.HK');
      });

      it('should handle special characters in provider', () => {
        const key = buildStorageKey('AAPL', 'provider-v2', 'get-stock-quote', 'US');
        expect(key).toBe('US:provider-v2:get-stock-quote:AAPL');
      });

      it('should handle null values (treated as undefined)', () => {
        const key = buildStorageKey('AAPL', null as any, null as any, null as any);
        expect(key).toBe('*:*:*:AAPL');
      });
    });

    describe('Parameter Combinations', () => {
      it('should handle only symbol and provider', () => {
        const key = buildStorageKey('AAPL', 'longport');
        expect(key).toBe('*:longport:*:AAPL');
      });

      it('should handle only symbol and market', () => {
        const key = buildStorageKey('AAPL', undefined, undefined, 'US');
        expect(key).toBe('US:*:*:AAPL');
      });

      it('should handle symbol, provider, and market', () => {
        const key = buildStorageKey('AAPL', 'longport', undefined, 'US');
        expect(key).toBe('US:longport:*:AAPL');
      });

      it('should handle symbol and queryTypeFilter', () => {
        const key = buildStorageKey('AAPL', undefined, 'get-stock-quote');
        expect(key).toBe('*:*:get-stock-quote:AAPL');
      });
    });

    describe('Key Consistency', () => {
      it('should generate consistent keys for same inputs', () => {
        const key1 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        const key2 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        expect(key1).toBe(key2);
      });

      it('should generate different keys for different symbols', () => {
        const key1 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        const key2 = buildStorageKey('GOOGL', 'longport', 'get-stock-quote', 'US');
        expect(key1).not.toBe(key2);
      });

      it('should generate different keys for different providers', () => {
        const key1 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        const key2 = buildStorageKey('AAPL', 'futu', 'get-stock-quote', 'US');
        expect(key1).not.toBe(key2);
      });

      it('should generate different keys for different query types', () => {
        const key1 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        const key2 = buildStorageKey('AAPL', 'longport', 'get-stock-info', 'US');
        expect(key1).not.toBe(key2);
      });

      it('should generate different keys for different markets', () => {
        const key1 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'US');
        const key2 = buildStorageKey('AAPL', 'longport', 'get-stock-quote', 'HK');
        expect(key1).not.toBe(key2);
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle HK market symbols', () => {
        const key = buildStorageKey('00700', 'longport', 'get-stock-quote', 'HK');
        expect(key).toBe('HK:longport:get-stock-quote:00700');
      });

      it('should handle US market symbols with exchange', () => {
        const key = buildStorageKey('AAPL.NASDAQ', 'longport', 'get-stock-quote', 'US');
        expect(key).toBe('US:longport:get-stock-quote:AAPL.NASDAQ');
      });

      it('should handle batch query scenario', () => {
        const symbols = ['AAPL', 'GOOGL', 'MSFT'];
        const keys = symbols.map(symbol =>
          buildStorageKey(symbol, 'longport', 'get-stock-quote', 'US')
        );
        expect(keys).toEqual([
          'US:longport:get-stock-quote:AAPL',
          'US:longport:get-stock-quote:GOOGL',
          'US:longport:get-stock-quote:MSFT'
        ]);
      });

      it('should handle cross-provider scenario', () => {
        const providers = ['longport', 'futu', 'tiger'];
        const keys = providers.map(provider =>
          buildStorageKey('AAPL', provider, 'get-stock-quote', 'US')
        );
        expect(keys).toEqual([
          'US:longport:get-stock-quote:AAPL',
          'US:futu:get-stock-quote:AAPL',
          'US:tiger:get-stock-quote:AAPL'
        ]);
      });

      it('should handle cross-market scenario', () => {
        const markets = ['US', 'HK', 'SG'];
        const keys = markets.map(market =>
          buildStorageKey('AAPL', 'longport', 'get-stock-quote', market)
        );
        expect(keys).toEqual([
          'US:longport:get-stock-quote:AAPL',
          'HK:longport:get-stock-quote:AAPL',
          'SG:longport:get-stock-quote:AAPL'
        ]);
      });
    });
  });

  describe('validateDataFreshness', () => {
    describe('Basic Functionality', () => {
      it('should return true when maxAge is not specified', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data)).toBe(true);
      });

      it('should return true for fresh data with timestamp', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should return true for fresh data with _timestamp', () => {
        const data = { _timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should return false for stale data', () => {
        const oldDate = new Date(Date.now() - 120000); // 2 minutes ago
        const data = { timestamp: oldDate.toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });

      it('should return false for data without timestamp', () => {
        const data = { value: 100 };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });
    });

    describe('Timestamp Handling', () => {
      it('should handle timestamp as Date object', () => {
        const data = { timestamp: new Date() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should handle timestamp as number', () => {
        const data = { timestamp: Date.now() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should handle timestamp as ISO string', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should prefer timestamp over _timestamp', () => {
        const recentDate = new Date();
        const oldDate = new Date(Date.now() - 120000);
        const data = {
          timestamp: recentDate.toISOString(),
          _timestamp: oldDate.toISOString()
        };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should use _timestamp when timestamp is not available', () => {
        const data = { _timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should handle invalid timestamp format', () => {
        const data = { timestamp: 'invalid-date' };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null data', () => {
        expect(validateDataFreshness(null, 60)).toBe(false);
      });

      it('should handle undefined data', () => {
        expect(validateDataFreshness(undefined, 60)).toBe(false);
      });

      it('should handle empty object', () => {
        expect(validateDataFreshness({}, 60)).toBe(false);
      });

      it('should handle maxAge of 0', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, 0)).toBe(false);
      });

      it('should handle negative maxAge', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, -1)).toBe(false);
      });

      it('should handle very large maxAge', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, Number.MAX_SAFE_INTEGER)).toBe(true);
      });

      it('should handle future timestamp', () => {
        const futureDate = new Date(Date.now() + 60000); // 1 minute in future
        const data = { timestamp: futureDate.toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });
    });

    describe('Exact Boundary Testing', () => {
      it('should return true when data age exactly equals maxAge', () => {
        const exactTime = new Date(Date.now() - 60000); // Exactly 60 seconds ago
        const data = { timestamp: exactTime.toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should return false when data age slightly exceeds maxAge', () => {
        const slightlyOld = new Date(Date.now() - 60001); // 60.001 seconds ago
        const data = { timestamp: slightlyOld.toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });

      it('should return true when data age is slightly less than maxAge', () => {
        const slightlyFresh = new Date(Date.now() - 59999); // 59.999 seconds ago
        const data = { timestamp: slightlyFresh.toISOString() };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });
    });

    describe('Real-World Scenarios', () => {
      it('should validate fresh stock quote data', () => {
        const stockQuote = {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: new Date().toISOString(),
          volume: 1000000
        };
        expect(validateDataFreshness(stockQuote, 5)).toBe(true);
      });

      it('should invalidate stale stock quote data', () => {
        const stockQuote = {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: new Date(Date.now() - 10000).toISOString(), // 10 seconds old
          volume: 1000000
        };
        expect(validateDataFreshness(stockQuote, 5)).toBe(false);
      });

      it('should validate batch data with mixed timestamps', () => {
        const now = Date.now();
        const batchData = [
          { symbol: 'AAPL', timestamp: new Date(now).toISOString() },
          { symbol: 'GOOGL', timestamp: new Date(now - 3000).toISOString() },
          { symbol: 'MSFT', timestamp: new Date(now - 6000).toISOString() }
        ];

        const results = batchData.map(data => validateDataFreshness(data, 5));
        expect(results).toEqual([true, true, false]);
      });

      it('should handle cache entry validation', () => {
        const cacheEntry = {
          data: { value: 'cached-value' },
          _timestamp: new Date(Date.now() - 30000).toISOString() // 30 seconds old
        };
        expect(validateDataFreshness(cacheEntry, 60)).toBe(true);
        expect(validateDataFreshness(cacheEntry, 20)).toBe(false);
      });

      it('should handle API response validation', () => {
        const apiResponse = {
          statusCode: 200,
          message: '成功',
          data: { quote: 100 },
          timestamp: new Date().toISOString()
        };
        expect(validateDataFreshness(apiResponse, 300)).toBe(true);
      });
    });

    describe('Performance Considerations', () => {
      it('should handle rapid successive calls efficiently', () => {
        const data = { timestamp: new Date().toISOString() };
        const results: boolean[] = [];

        for (let i = 0; i < 1000; i++) {
          results.push(validateDataFreshness(data, 60));
        }

        expect(results.every(r => r === true)).toBe(true);
      });

      it('should handle various timestamp formats efficiently', () => {
        const formats = [
          { timestamp: new Date().toISOString() },
          { timestamp: Date.now() },
          { timestamp: new Date() },
          { _timestamp: new Date().toISOString() }
        ];

        formats.forEach(data => {
          expect(validateDataFreshness(data, 60)).toBe(true);
        });
      });
    });

    describe('Null Safety', () => {
      it('should handle data with null timestamp', () => {
        const data = { timestamp: null };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });

      it('should handle data with undefined timestamp', () => {
        const data = { timestamp: undefined };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });

      it('should handle data with both timestamps as null', () => {
        const data = { timestamp: null, _timestamp: null };
        expect(validateDataFreshness(data, 60)).toBe(false);
      });

      it('should handle nested data structure', () => {
        const data = {
          result: {
            data: {
              timestamp: new Date().toISOString()
            }
          }
        };
        // Should return false as timestamp is nested, not at root level
        expect(validateDataFreshness(data, 60)).toBe(false);
      });
    });

    describe('Type Coercion', () => {
      it('should handle timestamp as string number', () => {
        const data = { timestamp: String(Date.now()) };
        expect(validateDataFreshness(data, 60)).toBe(true);
      });

      it('should handle maxAge as string', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, '60' as any)).toBe(true);
      });

      it('should handle maxAge as null (treated as undefined)', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, null as any)).toBe(true);
      });

      it('should handle NaN maxAge', () => {
        const data = { timestamp: new Date().toISOString() };
        expect(validateDataFreshness(data, NaN)).toBe(false);
      });
    });

    describe('Integration Scenarios', () => {
      it('should work with query result validation', () => {
        const queryResult = {
          data: [
            { symbol: 'AAPL', price: 150 },
            { symbol: 'GOOGL', price: 2800 }
          ],
          timestamp: new Date().toISOString(),
          queryType: 'BY_SYMBOLS'
        };

        // Validate for different freshness requirements
        expect(validateDataFreshness(queryResult, 5)).toBe(true);    // 5 seconds for real-time
        expect(validateDataFreshness(queryResult, 300)).toBe(true);  // 5 minutes for reports
        expect(validateDataFreshness(queryResult)).toBe(true);       // No limit for historical
      });

      it('should work with cache invalidation logic', () => {
        const cachedData = {
          key: 'query:AAPL',
          value: { price: 150 },
          timestamp: new Date(Date.now() - 250000).toISOString() // ~4 minutes old
        };

        // Different TTL strategies
        const strongTimeliness = 5;    // 5 seconds
        const weakTimeliness = 300;    // 5 minutes

        expect(validateDataFreshness(cachedData, strongTimeliness)).toBe(false);
        expect(validateDataFreshness(cachedData, weakTimeliness)).toBe(true);
      });

      it('should work with streaming data validation', () => {
        const streamData = {
          type: 'quote',
          symbol: 'AAPL',
          bid: 150.10,
          ask: 150.15,
          _timestamp: Date.now() - 1000 // 1 second old
        };

        // Streaming data requires very fresh data
        expect(validateDataFreshness(streamData, 2)).toBe(true);
        expect(validateDataFreshness(streamData, 0.5)).toBe(false);
      });
    });
  });

  describe('Utility Functions Combined Usage', () => {
    it('should work together for cache key generation and validation', () => {
      const symbol = 'AAPL';
      const provider = 'longport';
      const queryType = 'get-stock-quote';
      const market = 'US';

      // Generate cache key
      const cacheKey = buildStorageKey(symbol, provider, queryType, market);
      expect(cacheKey).toBe('US:longport:get-stock-quote:AAPL');

      // Simulate cached data
      const cachedData = {
        key: cacheKey,
        data: { symbol, price: 150 },
        timestamp: new Date().toISOString()
      };

      // Validate freshness
      expect(validateDataFreshness(cachedData, 60)).toBe(true);
    });

    it('should handle batch processing scenario', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const provider = 'longport';
      const queryType = 'get-stock-quote';
      const market = 'US';

      // Generate keys for batch
      const keys = symbols.map(s => buildStorageKey(s, provider, queryType, market));

      // Simulate batch results with varying timestamps
      const now = Date.now();
      const batchResults = keys.map((key, index) => ({
        key,
        data: { symbol: symbols[index], price: 100 + index * 50 },
        timestamp: new Date(now - index * 2000).toISOString() // Stagger by 2 seconds
      }));

      // Validate freshness for each result
      const validationResults = batchResults.map(result =>
        validateDataFreshness(result, 5)
      );

      // First 2 should be fresh (0 and 2 seconds old), last should be stale (4 seconds old for 5 second limit)
      expect(validationResults).toEqual([true, true, true]);
    });

    it('should handle provider fallback scenario', () => {
      const symbol = 'AAPL';
      const providers = ['longport', 'futu', 'tiger'];
      const queryType = 'get-stock-quote';

      // Generate keys for multiple providers (no specific market)
      const keys = providers.map(p => buildStorageKey(symbol, p, queryType));

      // Simulate trying each provider with different data ages
      const providerData = [
        { key: keys[0], timestamp: new Date(Date.now() - 10000).toISOString() }, // 10s old
        { key: keys[1], timestamp: new Date(Date.now() - 5000).toISOString() },  // 5s old
        { key: keys[2], timestamp: new Date().toISOString() }                    // Fresh
      ];

      // Find first provider with fresh data (maxAge = 6 seconds)
      const freshProvider = providerData.find(data => validateDataFreshness(data, 6));
      expect(freshProvider?.key).toBe('*:futu:get-stock-quote:AAPL');
    });
  });
});