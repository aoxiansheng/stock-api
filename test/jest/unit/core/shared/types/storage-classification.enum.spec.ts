import { StorageClassification } from '@core/shared/types/storage-classification.enum';

describe('StorageClassification', () => {
  describe('Enum Structure', () => {
    it('should have all required stock data classifications', () => {
      expect(StorageClassification.STOCK_QUOTE).toBe('stock_quote');
      expect(StorageClassification.STOCK_CANDLE).toBe('stock_candle');
      expect(StorageClassification.STOCK_TICK).toBe('stock_tick');
      expect(StorageClassification.STOCK_BASIC_INFO).toBe('stock_basic_info');
      expect(StorageClassification.STOCK_LOGO).toBe('stock_logo');
      expect(StorageClassification.STOCK_NEWS).toBe('stock_news');
    });

    it('should have financial data classifications', () => {
      expect(StorageClassification.FINANCIAL_STATEMENT).toBe('financial_statement');
    });

    it('should have index data classifications', () => {
      expect(StorageClassification.INDEX_QUOTE).toBe('index_quote');
    });

    it('should have market data classifications', () => {
      expect(StorageClassification.MARKET_NEWS).toBe('market_news');
      expect(StorageClassification.MARKET_STATUS).toBe('market_status');
      expect(StorageClassification.TRADING_DAYS).toBe('trading_days');
    });

    it('should have trading related classifications', () => {
      expect(StorageClassification.TRADING_ORDER).toBe('trading_order');
      expect(StorageClassification.USER_PORTFOLIO).toBe('user_portfolio');
    });

    it('should have crypto data classifications', () => {
      expect(StorageClassification.CRYPTO_QUOTE).toBe('crypto_quote');
      expect(StorageClassification.CRYPTO_BASIC_INFO).toBe('crypto_basic_info');
      expect(StorageClassification.CRYPTO_LOGO).toBe('crypto_logo');
      expect(StorageClassification.CRYPTO_NEWS).toBe('crypto_news');
    });

    it('should have system general classifications', () => {
      expect(StorageClassification.GENERAL).toBe('general');
      expect(StorageClassification.GLOBAL_STATE).toBe('global_state');
    });
  });

  describe('Enum Completeness', () => {
    it('should have exactly 21 classification values', () => {
      const allValues = Object.values(StorageClassification);
      expect(allValues).toHaveLength(21);
    });

    it('should have unique values for all classifications', () => {
      const allValues = Object.values(StorageClassification);
      const uniqueValues = new Set(allValues);
      expect(uniqueValues.size).toBe(allValues.length);
    });

    it('should have consistent snake_case naming', () => {
      const allValues = Object.values(StorageClassification);
      const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;

      allValues.forEach(value => {
        expect(value).toMatch(snakeCasePattern);
      });
    });
  });

  describe('Classification Categories', () => {
    it('should correctly categorize stock-related classifications', () => {
      const stockClassifications = [
        StorageClassification.STOCK_QUOTE,
        StorageClassification.STOCK_CANDLE,
        StorageClassification.STOCK_TICK,
        StorageClassification.STOCK_BASIC_INFO,
        StorageClassification.STOCK_LOGO,
        StorageClassification.STOCK_NEWS,
      ];

      stockClassifications.forEach(classification => {
        expect(classification).toContain('stock_');
      });
    });

    it('should correctly categorize crypto-related classifications', () => {
      const cryptoClassifications = [
        StorageClassification.CRYPTO_QUOTE,
        StorageClassification.CRYPTO_BASIC_INFO,
        StorageClassification.CRYPTO_LOGO,
        StorageClassification.CRYPTO_NEWS,
      ];

      cryptoClassifications.forEach(classification => {
        expect(classification).toContain('crypto_');
      });
    });

    it('should correctly categorize market-related classifications', () => {
      const marketClassifications = [
        StorageClassification.MARKET_NEWS,
        StorageClassification.MARKET_STATUS,
      ];

      marketClassifications.forEach(classification => {
        expect(classification).toContain('market_');
      });
    });
  });

  describe('Enum Usage Scenarios', () => {
    it('should work with switch statements', () => {
      const getCategory = (classification: StorageClassification): string => {
        switch (classification) {
          case StorageClassification.STOCK_QUOTE:
          case StorageClassification.STOCK_BASIC_INFO:
            return 'stock';
          case StorageClassification.CRYPTO_QUOTE:
          case StorageClassification.CRYPTO_BASIC_INFO:
            return 'crypto';
          default:
            return 'other';
        }
      };

      expect(getCategory(StorageClassification.STOCK_QUOTE)).toBe('stock');
      expect(getCategory(StorageClassification.CRYPTO_QUOTE)).toBe('crypto');
      expect(getCategory(StorageClassification.MARKET_STATUS)).toBe('other');
    });

    it('should work with Object.keys for iteration', () => {
      const enumKeys = Object.keys(StorageClassification);
      expect(enumKeys).toContain('STOCK_QUOTE');
      expect(enumKeys).toContain('CRYPTO_QUOTE');
      expect(enumKeys).toContain('GENERAL');
    });

    it('should work with Object.values for filtering', () => {
      const enumValues = Object.values(StorageClassification);
      const stockValues = enumValues.filter(value => value.startsWith('stock_'));
      expect(stockValues).toHaveLength(6);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety at compile time', () => {
      const validClassification: StorageClassification = StorageClassification.STOCK_QUOTE;
      expect(validClassification).toBeDefined();
    });

    it('should work as object keys', () => {
      const classificationMap: Record<StorageClassification, string> = {
        [StorageClassification.STOCK_QUOTE]: 'Stock Quote Data',
        [StorageClassification.STOCK_CANDLE]: 'Stock Candle Data',
        [StorageClassification.STOCK_TICK]: 'Stock Tick Data',
        [StorageClassification.STOCK_BASIC_INFO]: 'Stock Basic Info',
        [StorageClassification.STOCK_LOGO]: 'Stock Logo',
        [StorageClassification.STOCK_NEWS]: 'Stock News',
        [StorageClassification.FINANCIAL_STATEMENT]: 'Financial Statement',
        [StorageClassification.INDEX_QUOTE]: 'Index Quote',
        [StorageClassification.MARKET_NEWS]: 'Market News',
        [StorageClassification.MARKET_STATUS]: 'Market Status',
        [StorageClassification.TRADING_DAYS]: 'Trading Days',
        [StorageClassification.TRADING_ORDER]: 'Trading Order',
        [StorageClassification.USER_PORTFOLIO]: 'User Portfolio',
        [StorageClassification.CRYPTO_QUOTE]: 'Crypto Quote',
        [StorageClassification.CRYPTO_BASIC_INFO]: 'Crypto Basic Info',
        [StorageClassification.CRYPTO_LOGO]: 'Crypto Logo',
        [StorageClassification.CRYPTO_NEWS]: 'Crypto News',
        [StorageClassification.GENERAL]: 'General Data',
        [StorageClassification.GLOBAL_STATE]: 'Global State',
      };

      expect(classificationMap[StorageClassification.STOCK_QUOTE]).toBe('Stock Quote Data');
      expect(classificationMap[StorageClassification.CRYPTO_QUOTE]).toBe('Crypto Quote');
      expect(Object.keys(classificationMap)).toHaveLength(19);
    });
  });
});
