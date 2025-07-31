/**
 * LongPort SG Types Unit Tests
 * KÕLongPort° apn{‹šI„cn'Œ|¹'
 */

import {
  LongportQuoteData,
  LongportExtendedQuote,
  LongportQuoteResponse,
  LongportBasicInfo,
  LongportConfig,
} from '../../../../../src/providers/longport-sg/types';

describe('LongPort SG Types', () => {
  describe('LongportQuoteData', () => {
    let quoteData: LongportQuoteData;

    beforeEach(() => {
      quoteData = {
        symbol: 'D05.SG',
        last_done: 32.50,
        prev_close: 32.00,
        open: 32.10,
        high: 32.80,
        low: 31.90,
        volume: 1000000,
        turnover: 32500000,
        timestamp: 1640995200000,
        trade_status: 1,
      };
    });

    describe('Basic Properties', () => {
      it('should have required quote data properties', () => {
        expect(quoteData).toHaveProperty('symbol');
        expect(quoteData).toHaveProperty('last_done');
        expect(quoteData).toHaveProperty('prev_close');
        expect(quoteData).toHaveProperty('open');
        expect(quoteData).toHaveProperty('high');
        expect(quoteData).toHaveProperty('low');
        expect(quoteData).toHaveProperty('volume');
        expect(quoteData).toHaveProperty('turnover');
        expect(quoteData).toHaveProperty('timestamp');
        expect(quoteData).toHaveProperty('trade_status');
      });

      it('should accept valid data types', () => {
        expect(typeof quoteData.symbol).toBe('string');
        expect(typeof quoteData.volume).toBe('number');
        expect(typeof quoteData.timestamp).toBe('number');
        expect(typeof quoteData.trade_status).toBe('number');
      });

      it('should support both number and string for price fields', () => {
        // Number values
        quoteData.last_done = 32.50;
        quoteData.prev_close = 32.00;
        quoteData.open = 32.10;
        quoteData.high = 32.80;
        quoteData.low = 31.90;
        quoteData.turnover = 32500000;

        expect(typeof quoteData.last_done).toBe('number');
        expect(typeof quoteData.prev_close).toBe('number');
        expect(typeof quoteData.open).toBe('number');
        expect(typeof quoteData.high).toBe('number');
        expect(typeof quoteData.low).toBe('number');
        expect(typeof quoteData.turnover).toBe('number');

        // String values
        quoteData.last_done = '32.50';
        quoteData.prev_close = '32.00';
        quoteData.open = '32.10';
        quoteData.high = '32.80';
        quoteData.low = '31.90';
        quoteData.turnover = '32500000';

        expect(typeof quoteData.last_done).toBe('string');
        expect(typeof quoteData.prev_close).toBe('string');
        expect(typeof quoteData.open).toBe('string');
        expect(typeof quoteData.high).toBe('string');
        expect(typeof quoteData.low).toBe('string');
        expect(typeof quoteData.turnover).toBe('string');
      });
    });

    describe('Optional Extended Quotes', () => {
      it('should support optional pre_market_quote', () => {
        quoteData.pre_market_quote = {
          last_done: 31.95,
          timestamp: 1640988000000,
          volume: 50000,
          turnover: 1597500,
          high: 32.00,
          low: 31.90,
          prev_close: 32.00,
        };

        expect(quoteData.pre_market_quote).toBeDefined();
        expect(quoteData.pre_market_quote.last_done).toBe(31.95);
        expect(quoteData.pre_market_quote.volume).toBe(50000);
      });

      it('should support optional post_market_quote', () => {
        quoteData.post_market_quote = {
          last_done: 32.60,
          timestamp: 1641002400000,
          volume: 25000,
          turnover: 815000,
          high: 32.70,
          low: 32.50,
          prev_close: 32.50,
        };

        expect(quoteData.post_market_quote).toBeDefined();
        expect(quoteData.post_market_quote.last_done).toBe(32.60);
        expect(quoteData.post_market_quote.volume).toBe(25000);
      });

      it('should support optional overnight_quote', () => {
        quoteData.overnight_quote = {
          last_done: 32.45,
          timestamp: 1641020400000,
          volume: 15000,
          turnover: 486750,
          high: 32.50,
          low: 32.40,
          prev_close: 32.50,
        };

        expect(quoteData.overnight_quote).toBeDefined();
        expect(quoteData.overnight_quote.last_done).toBe(32.45);
        expect(quoteData.overnight_quote.volume).toBe(15000);
      });

      it('should work without optional extended quotes', () => {
        expect(quoteData.pre_market_quote).toBeUndefined();
        expect(quoteData.post_market_quote).toBeUndefined();
        expect(quoteData.overnight_quote).toBeUndefined();
      });
    });

    describe('Singapore Market Specifics', () => {
      it('should handle Singapore stock symbols', () => {
        const sgSymbols = ['D05.SG', 'O39.SG', 'C6L.SG', 'U11.SG'];
        
        sgSymbols.forEach(symbol => {
          quoteData.symbol = symbol;
          expect(quoteData.symbol).toBe(symbol);
          expect(quoteData.symbol).toMatch(/^[A-Z0-9]+\.SG$/);
        });
      });

      it('should handle Singapore market trading status', () => {
        const tradingStatuses = [
          { status: 0, description: 'Pre-market' },
          { status: 1, description: 'Trading' },
          { status: 2, description: 'Lunch break' },
          { status: 3, description: 'Closed' },
          { status: 4, description: 'After-hours' },
        ];

        tradingStatuses.forEach(({ status }) => {
          quoteData.trade_status = status;
          expect(quoteData.trade_status).toBe(status);
          expect(typeof quoteData.trade_status).toBe('number');
        });
      });
    });

    describe('Data Validation', () => {
      it('should handle realistic Singapore stock data', () => {
        const realisticData: LongportQuoteData = {
          symbol: 'D05.SG',
          last_done: 32.50,
          prev_close: 32.00,
          open: 32.10,
          high: 32.80,
          low: 31.90,
          volume: 1500000,
          turnover: '48750000',
          timestamp: Date.now(),
          trade_status: 1,
        };

        expect(realisticData.symbol).toMatch(/\.SG$/);
        expect(realisticData.last_done).toBeGreaterThan(0);
        expect(realisticData.volume).toBeGreaterThan(0);
        expect(realisticData.timestamp).toBeGreaterThan(0);
      });

      it('should handle edge cases in price data', () => {
        // Zero values
        quoteData.last_done = 0;
        quoteData.volume = 0;
        expect(quoteData.last_done).toBe(0);
        expect(quoteData.volume).toBe(0);

        // String representations
        quoteData.last_done = '0.001';
        quoteData.turnover = '0';
        expect(quoteData.last_done).toBe('0.001');
        expect(quoteData.turnover).toBe('0');
      });
    });
  });

  describe('LongportExtendedQuote', () => {
    let extendedQuote: LongportExtendedQuote;

    beforeEach(() => {
      extendedQuote = {
        last_done: 32.45,
        timestamp: 1640988000000,
        volume: 50000,
        turnover: 1622500,
        high: 32.50,
        low: 32.40,
        prev_close: 32.50,
      };
    });

    it('should have all required properties', () => {
      expect(extendedQuote).toHaveProperty('last_done');
      expect(extendedQuote).toHaveProperty('timestamp');
      expect(extendedQuote).toHaveProperty('volume');
      expect(extendedQuote).toHaveProperty('turnover');
      expect(extendedQuote).toHaveProperty('high');
      expect(extendedQuote).toHaveProperty('low');
      expect(extendedQuote).toHaveProperty('prev_close');
    });

    it('should support flexible price field types', () => {
      // Test number values
      extendedQuote.last_done = 32.45;
      extendedQuote.turnover = 1622500;
      extendedQuote.high = 32.50;
      extendedQuote.low = 32.40;
      extendedQuote.prev_close = 32.50;

      expect(typeof extendedQuote.last_done).toBe('number');
      expect(typeof extendedQuote.turnover).toBe('number');

      // Test string values
      extendedQuote.last_done = '32.45';
      extendedQuote.turnover = '1622500';
      extendedQuote.high = '32.50';
      extendedQuote.low = '32.40';
      extendedQuote.prev_close = '32.50';

      expect(typeof extendedQuote.last_done).toBe('string');
      expect(typeof extendedQuote.turnover).toBe('string');
    });

    it('should represent extended trading session data correctly', () => {
      // Pre-market data
      const preMarketQuote: LongportExtendedQuote = {
        last_done: '31.95',
        timestamp: 1640988000000, // Earlier timestamp
        volume: 25000,
        turnover: '798750',
        high: '32.00',
        low: '31.90',
        prev_close: '32.00',
      };

      expect(preMarketQuote.volume).toBeLessThan(1000000); // Lower volume in pre-market
      expect(typeof preMarketQuote.last_done).toBe('string');
    });
  });

  describe('LongportQuoteResponse', () => {
    let quoteResponse: LongportQuoteResponse;

    beforeEach(() => {
      quoteResponse = {
        secu_quote: [
          {
            symbol: 'D05.SG',
            last_done: 32.50,
            prev_close: 32.00,
            open: 32.10,
            high: 32.80,
            low: 31.90,
            volume: 1500000,
            turnover: 48750000,
            timestamp: 1640995200000,
            trade_status: 1,
          },
        ],
      };
    });

    it('should contain secu_quote array', () => {
      expect(quoteResponse).toHaveProperty('secu_quote');
      expect(Array.isArray(quoteResponse.secu_quote)).toBe(true);
    });

    it('should support multiple quotes in response', () => {
      quoteResponse.secu_quote = [
        {
          symbol: 'D05.SG',
          last_done: 32.50,
          prev_close: 32.00,
          open: 32.10,
          high: 32.80,
          low: 31.90,
          volume: 1500000,
          turnover: 48750000,
          timestamp: 1640995200000,
          trade_status: 1,
        },
        {
          symbol: 'O39.SG',
          last_done: 15.75,
          prev_close: 15.50,
          open: 15.60,
          high: 15.80,
          low: 15.45,
          volume: 800000,
          turnover: 12600000,
          timestamp: 1640995200000,
          trade_status: 1,
        },
      ];

      expect(quoteResponse.secu_quote).toHaveLength(2);
      expect(quoteResponse.secu_quote[0].symbol).toBe('D05.SG');
      expect(quoteResponse.secu_quote[1].symbol).toBe('O39.SG');
    });

    it('should support empty quote response', () => {
      quoteResponse.secu_quote = [];
      expect(quoteResponse.secu_quote).toHaveLength(0);
    });

    it('should handle batch quote requests', () => {
      const batchResponse: LongportQuoteResponse = {
        secu_quote: Array.from({ length: 10 }, (_, i) => ({
          symbol: `STOCK${i}.SG`,
          last_done: 10 + i,
          prev_close: 9.5 + i,
          open: 9.8 + i,
          high: 10.2 + i,
          low: 9.5 + i,
          volume: 100000 * (i + 1),
          turnover: 1000000 * (i + 1),
          timestamp: Date.now(),
          trade_status: 1,
        })),
      };

      expect(batchResponse.secu_quote).toHaveLength(10);
      expect(batchResponse.secu_quote[9].symbol).toBe('STOCK9.SG');
    });
  });

  describe('LongportBasicInfo', () => {
    let basicInfo: LongportBasicInfo;

    beforeEach(() => {
      basicInfo = {
        symbol: 'D05.SG',
        name_cn: 'UÆâ',
        name_en: 'DBS Group Holdings Ltd',
        name_hk: 'UÆ',
        listing_date: '1999-07-23',
        shares_outstanding: 2650000000,
        market_cap: 86125000000,
        sector: 'Financials',
        industry: 'Banks',
      };
    });

    it('should have all required basic info properties', () => {
      expect(basicInfo).toHaveProperty('symbol');
      expect(basicInfo).toHaveProperty('name_cn');
      expect(basicInfo).toHaveProperty('name_en');
      expect(basicInfo).toHaveProperty('name_hk');
      expect(basicInfo).toHaveProperty('listing_date');
      expect(basicInfo).toHaveProperty('shares_outstanding');
      expect(basicInfo).toHaveProperty('market_cap');
      expect(basicInfo).toHaveProperty('sector');
      expect(basicInfo).toHaveProperty('industry');
    });

    it('should have correct data types', () => {
      expect(typeof basicInfo.symbol).toBe('string');
      expect(typeof basicInfo.name_cn).toBe('string');
      expect(typeof basicInfo.name_en).toBe('string');
      expect(typeof basicInfo.name_hk).toBe('string');
      expect(typeof basicInfo.listing_date).toBe('string');
      expect(typeof basicInfo.shares_outstanding).toBe('number');
      expect(typeof basicInfo.market_cap).toBe('number');
      expect(typeof basicInfo.sector).toBe('string');
      expect(typeof basicInfo.industry).toBe('string');
    });

    it('should handle Singapore company data', () => {
      const sgCompanies = [
        {
          symbol: 'D05.SG',
          name_en: 'DBS Group Holdings Ltd',
          sector: 'Financials',
          industry: 'Banks',
        },
        {
          symbol: 'O39.SG',
          name_en: 'OVERSEA-CHINESE BANKING CORP',
          sector: 'Financials',
          industry: 'Banks',
        },
        {
          symbol: 'C6L.SG',
          name_en: 'Singapore Airlines Limited',
          sector: 'Industrials',
          industry: 'Airlines',
        },
      ];

      sgCompanies.forEach(company => {
        expect(company.symbol).toMatch(/\.SG$/);
        expect(company.name_en.length).toBeGreaterThan(0);
        expect(company.sector.length).toBeGreaterThan(0);
        expect(company.industry.length).toBeGreaterThan(0);
      });
    });

    it('should handle listing date format', () => {
      const validDateFormats = [
        '1999-07-23',
        '2020-01-15',
        '2010-12-31',
      ];

      validDateFormats.forEach(date => {
        basicInfo.listing_date = date;
        expect(basicInfo.listing_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should handle financial metrics correctly', () => {
      expect(basicInfo.shares_outstanding).toBeGreaterThan(0);
      expect(basicInfo.market_cap).toBeGreaterThan(0);
      expect(basicInfo.market_cap).toBeGreaterThan(basicInfo.shares_outstanding);
    });
  });

  describe('LongportConfig', () => {
    let config: LongportConfig;

    beforeEach(() => {
      config = {
        app_key: 'test_app_key_123',
        app_secret: 'test_app_secret_456',
        access_token: 'test_access_token_789',
      };
    });

    it('should have required configuration properties', () => {
      expect(config).toHaveProperty('app_key');
      expect(config).toHaveProperty('app_secret');
      expect(config).toHaveProperty('access_token');
    });

    it('should support optional endpoint configuration', () => {
      config.endpoint = 'https://openapi.longportapp.com';
      expect(config.endpoint).toBe('https://openapi.longportapp.com');
    });

    it('should work without optional endpoint', () => {
      expect(config.endpoint).toBeUndefined();
    });

    it('should validate configuration completeness', () => {
      expect(config.app_key.length).toBeGreaterThan(0);
      expect(config.app_secret.length).toBeGreaterThan(0);
      expect(config.access_token.length).toBeGreaterThan(0);
    });

    it('should handle different endpoint configurations', () => {
      const endpoints = [
        'https://openapi.longportapp.com',
        'https://api-sg.longportapp.com',
        'http://localhost:3000',
      ];

      endpoints.forEach(endpoint => {
        config.endpoint = endpoint;
        expect(config.endpoint).toBe(endpoint);
        expect(config.endpoint).toMatch(/^https?:\/\/.+/);
      });
    });
  });

  describe('Type Compatibility and Integration', () => {
    it('should allow quote data to be used in quote response', () => {
      const quoteData: LongportQuoteData = {
        symbol: 'D05.SG',
        last_done: 32.50,
        prev_close: 32.00,
        open: 32.10,
        high: 32.80,
        low: 31.90,
        volume: 1500000,
        turnover: 48750000,
        timestamp: 1640995200000,
        trade_status: 1,
      };

      const response: LongportQuoteResponse = {
        secu_quote: [quoteData],
      };

      expect(response.secu_quote[0]).toBe(quoteData);
    });

    it('should support extended quotes within quote data', () => {
      const extendedQuote: LongportExtendedQuote = {
        last_done: 31.95,
        timestamp: 1640988000000,
        volume: 50000,
        turnover: 1597500,
        high: 32.00,
        low: 31.90,
        prev_close: 32.00,
      };

      const quoteData: LongportQuoteData = {
        symbol: 'D05.SG',
        last_done: 32.50,
        prev_close: 32.00,
        open: 32.10,
        high: 32.80,
        low: 31.90,
        volume: 1500000,
        turnover: 48750000,
        timestamp: 1640995200000,
        trade_status: 1,
        pre_market_quote: extendedQuote,
      };

      expect(quoteData.pre_market_quote).toBe(extendedQuote);
    });

    it('should work with JSON serialization', () => {
      const quoteData: LongportQuoteData = {
        symbol: 'D05.SG',
        last_done: 32.50,
        prev_close: 32.00,
        open: 32.10,
        high: 32.80,
        low: 31.90,
        volume: 1500000,
        turnover: 48750000,
        timestamp: 1640995200000,
        trade_status: 1,
      };

      const serialized = JSON.stringify(quoteData);
      const deserialized = JSON.parse(serialized) as LongportQuoteData;

      expect(deserialized.symbol).toBe(quoteData.symbol);
      expect(deserialized.last_done).toBe(quoteData.last_done);
      expect(deserialized.volume).toBe(quoteData.volume);
    });
  });

  describe('Real-world Data Scenarios', () => {
    it('should handle typical Singapore bank stock data', () => {
      const dbsData: LongportQuoteData = {
        symbol: 'D05.SG',
        last_done: 32.50,
        prev_close: 32.00,
        open: 32.10,
        high: 32.80,
        low: 31.90,
        volume: 1500000,
        turnover: '48750000',
        timestamp: Date.now(),
        trade_status: 1,
      };

      const dbsBasicInfo: LongportBasicInfo = {
        symbol: 'D05.SG',
        name_cn: 'UÆâ',
        name_en: 'DBS Group Holdings Ltd',
        name_hk: 'UÆ',
        listing_date: '1999-07-23',
        shares_outstanding: 2650000000,
        market_cap: 86125000000,
        sector: 'Financials',
        industry: 'Banks',
      };

      expect(dbsData.symbol).toBe(dbsBasicInfo.symbol);
      expect(dbsData.symbol).toBe('D05.SG');
    });

    it('should handle Singapore REIT data', () => {
      const reitData: LongportQuoteData = {
        symbol: 'J91U.SG',
        last_done: '0.965',
        prev_close: '0.960',
        open: '0.965',
        high: '0.970',
        low: '0.960',
        volume: 2500000,
        turnover: '2412500',
        timestamp: Date.now(),
        trade_status: 1,
      };

      expect(reitData.symbol).toMatch(/\.SG$/);
      expect(typeof reitData.last_done).toBe('string');
      expect(parseFloat(reitData.last_done as string)).toBeLessThan(5); // REIT typically lower price
    });
  });
});