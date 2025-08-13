/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * LongPort Types Unit Tests
 * 测试LongPort数据源类型定义的正确性和兼容性
 */

import {
  LongportQuoteData,
  LongportExt_endedQuote,
  LongportQuoteResponse,
  LongportBasicInfo,
  LongportConfig,
} from '../../../../../src/providers/longport/types';

describe('LongPort Types', () => {
  describe('LongportQuoteData', () => {
    let quoteData: LongportQuoteData;

    beforeEach(() => {
      quoteData = {
        symbol: '700.HK',
        lastdone: 320.50,
        prevclose: 318.00,
        open: 319.10,
        high: 322.80,
        low: 318.90,
        volume: 15000000,
        turnover: 4825000000,
        timestamp: 1640995200000,
        tradestatus: 1,
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
        quoteData.lastdone = 320.50;
        quoteData.prevclose = 318.00;
        quoteData.open = 319.10;
        quoteData.high = 322.80;
        quoteData.low = 318.90;
        quoteData.turnover = 4825000000;

        expect(typeof quoteData.last_done).toBe('number');
        expect(typeof quoteData.prev_close).toBe('number');
        expect(typeof quoteData.open).toBe('number');
        expect(typeof quoteData.high).toBe('number');
        expect(typeof quoteData.low).toBe('number');
        expect(typeof quoteData.turnover).toBe('number');

        // String values
        quoteData.last_done = '320.50';
        quoteData.prev_close = '318.00';
        quoteData.open = '319.10';
        quoteData.high = '322.80';
        quoteData.low = '318.90';
        quoteData.turnover = '4825000000';

        expect(typeof quoteData.last_done).toBe('string');
        expect(typeof quoteData.prev_close).toBe('string');
        expect(typeof quoteData.open).toBe('string');
        expect(typeof quoteData.high).toBe('string');
        expect(typeof quoteData.low).toBe('string');
        expect(typeof quoteData.turnover).toBe('string');
      });
    });

    describe('Market Support', () => {
      it('should handle Hong Kong stock symbols', () => {
        const hkSymbols = ['700.HK', '941.HK', '9988.HK', '3690.HK'];
        
        hkSymbols.forEach(symbol => {
          quoteData.symbol = symbol;
          expect(quoteData.symbol).toBe(symbol);
          expect(quoteData.symbol).toMatch(/^\d+\.HK$/);
        });
      });

      it('should handle US stock symbols', () => {
        const usSymbols = ['AAPL.US', 'GOOGL.US', 'MSFT.US', 'TSLA.US'];
        
        usSymbols.forEach(symbol => {
          quoteData.symbol = symbol;
          expect(quoteData.symbol).toBe(symbol);
          expect(quoteData.symbol).toMatch(/^[A-Z]+\.US$/);
        });
      });
    });
  });

  describe('LongportExtendedQuote', () => {
    let extendedQuote: LongportExtendedQuote;

    beforeEach(() => {
      extendedQuote = {
        last_done: 320.45,
        timestamp: 1640988000000,
        volume: 500000,
        turnover: 160225000,
        high: 321.50,
        low: 320.40,
        prev_close: 320.50,
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
      extendedQuote.last_done = 320.45;
      extendedQuote.turnover = 160225000;

      expect(typeof extendedQuote.last_done).toBe('number');
      expect(typeof extendedQuote.turnover).toBe('number');

      // Test string values
      extendedQuote.last_done = '320.45';
      extendedQuote.turnover = '160225000';

      expect(typeof extendedQuote.last_done).toBe('string');
      expect(typeof extendedQuote.turnover).toBe('string');
    });
  });

  describe('LongportQuoteResponse', () => {
    let quoteResponse: LongportQuoteResponse;

    beforeEach(() => {
      quoteResponse = {
        secu_quote: [
          {
            symbol: '700.HK',
            last_done: 320.50,
            prev_close: 318.00,
            open: 319.10,
            high: 322.80,
            low: 318.90,
            volume: 15000000,
            turnover: 4825000000,
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
      quoteResponse.secu_quote.push({
        symbol: 'AAPL.US',
        last_done: 150.25,
        prev_close: 149.80,
        open: 150.00,
        high: 151.50,
        low: 149.50,
        volume: 50000000,
        turnover: 7512500000,
        timestamp: 1640995200000,
        trade_status: 1,
      });

      expect(quoteResponse.secu_quote).toHaveLength(2);
      expect(quoteResponse.secu_quote[0].symbol).toBe('700.HK');
      expect(quoteResponse.secu_quote[1].symbol).toBe('AAPL.US');
    });
  });

  describe('LongportBasicInfo', () => {
    it('should have all required basic info properties', () => {
      const basicInfo: LongportBasicInfo = {
        symbol: '700.HK',
        namecn: '腾讯控股',
        name_en: 'Tencent Holdings Ltd',
        name_hk: '騰訊控股',
        listingdate: '2004-06-16',
        sharesoutstanding: 9565000000,
        marketcap: 3065625000000,
        sector: 'Communication Services',
        industry: 'Interactive Media & Services',
      };

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
      const basicInfo: LongportBasicInfo = {
        symbol: '700.HK',
        name_cn: '腾讯控股',
        name_en: 'Tencent Holdings Ltd',
        name_hk: '騰訊控股',
        listing_date: '2004-06-16',
        shares_outstanding: 9565000000,
        market_cap: 3065625000000,
        sector: 'Communication Services',
        industry: 'Interactive Media & Services',
      };

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
  });

  describe('LongportConfig', () => {
    it('should have required configuration properties', () => {
      const config: LongportConfig = {
        app_key: 'longport_app_key_123',
        app_secret: 'longport_app_secret_456',
        access_token: 'longport_access_token_789',
      };

      expect(config).toHaveProperty('app_key');
      expect(config).toHaveProperty('app_secret');
      expect(config).toHaveProperty('access_token');
    });

    it('should support optional endpoint configuration', () => {
      const config: LongportConfig = {
        app_key: 'test_key',
        app_secret: 'test_secret',
        access_token: 'test_token',
        endpoint: 'https://openapi.longportapp.com',
      };

      expect(config.endpoint).toBe('https://openapi.longportapp.com');
    });

    it('should work without optional endpoint', () => {
      const config: LongportConfig = {
        app_key: 'test_key',
        app_secret: 'test_secret',
        access_token: 'test_token',
      };

      expect(config.endpoint).toBeUndefined();
    });
  });

  describe('Type Integration', () => {
    it('should work with JSON serialization', () => {
      const quoteData: LongportQuoteData = {
        symbol: '700.HK',
        last_done: 320.50,
        prev_close: 318.00,
        open: 319.10,
        high: 322.80,
        low: 318.90,
        volume: 15000000,
        turnover: 4825000000,
        timestamp: 1640995200000,
        trade_status: 1,
      };

      const serialized = JSON.stringify(quoteData);
      const deserialized = JSON.parse(serialized) as LongportQuoteData;

      expect(deserialized.symbol).toBe(quoteData.symbol);
      expect(deserialized.last_done).toBe(quoteData.last_done);
      expect(deserialized.volume).toBe(quoteData.volume);
    });

    it('should support extended quotes within quote data', () => {
      const extendedQuote: LongportExtendedQuote = {
        last_done: 319.95,
        timestamp: 1640988000000,
        volume: 500000,
        turnover: 159975000,
        high: 320.00,
        low: 319.90,
        prev_close: 318.00,
      };

      const quoteData: LongportQuoteData = {
        symbol: '700.HK',
        last_done: 320.50,
        prev_close: 318.00,
        open: 319.10,
        high: 322.80,
        low: 318.90,
        volume: 15000000,
        turnover: 4825000000,
        timestamp: 1640995200000,
        trade_status: 1,
        pre_market_quote: extendedQuote,
      };

      expect(quoteData.pre_market_quote).toBe(extendedQuote);
    });
  });
});