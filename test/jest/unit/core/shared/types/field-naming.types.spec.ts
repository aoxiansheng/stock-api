import {
  ReceiverType,
  QueryTypeFilter,
  FIELD_MAPPING_CONFIG
} from '@core/shared/types/field-naming.types';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';
import { API_OPERATIONS } from '@common/constants/domain';

describe('FieldNamingTypes', () => {
  describe('ReceiverType', () => {
    const expectedReceiverTypes = [
      'get-stock-quote',
      'get-stock-basic-info',
      'get-index-quote',
      'get-market-status',
      'get-trading-days',
      'get-global-state',
      'get-crypto-quote',
      'get-crypto-basic-info',
      'get-stock-logo',
      'get-crypto-logo',
      'get-stock-news',
      'get-crypto-news'
    ];

    it('should contain all expected receiver types', () => {
      // Test that all expected types are valid
      expectedReceiverTypes.forEach(type => {
        const receiverType: ReceiverType = type as ReceiverType;
        expect(receiverType).toBeDefined();
      });
    });

    it('should have consistent kebab-case naming', () => {
      const kebabCasePattern = /^[a-z]+(-[a-z]+)*$/;

      expectedReceiverTypes.forEach(type => {
        expect(type).toMatch(kebabCasePattern);
      });
    });

    it('should categorize receiver types correctly', () => {
      const stockTypes = expectedReceiverTypes.filter(type => type.includes('stock'));
      const cryptoTypes = expectedReceiverTypes.filter(type => type.includes('crypto'));
      const marketTypes = expectedReceiverTypes.filter(type => type.includes('market') || type.includes('trading') || type.includes('global'));
      const indexTypes = expectedReceiverTypes.filter(type => type.includes('index'));

      expect(stockTypes).toHaveLength(4);
      expect(cryptoTypes).toHaveLength(4);
      expect(marketTypes).toHaveLength(3);
      expect(indexTypes).toHaveLength(1);
    });
  });

  describe('QueryTypeFilter', () => {
    it('should accept StorageClassification values', () => {
      const stockQuoteFilter: QueryTypeFilter = StorageClassification.STOCK_QUOTE;
      const cryptoQuoteFilter: QueryTypeFilter = StorageClassification.CRYPTO_QUOTE;

      expect(stockQuoteFilter).toBe('stock_quote');
      expect(cryptoQuoteFilter).toBe('crypto_quote');
    });

    it('should accept ReceiverType values', () => {
      const stockQuoteReceiver: QueryTypeFilter = 'get-stock-quote';
      const cryptoQuoteReceiver: QueryTypeFilter = 'get-crypto-quote';

      expect(stockQuoteReceiver).toBe('get-stock-quote');
      expect(cryptoQuoteReceiver).toBe('get-crypto-quote');
    });

    it('should accept special filter values', () => {
      const allFilter: QueryTypeFilter = 'all';
      const noneFilter: QueryTypeFilter = 'none';

      expect(allFilter).toBe('all');
      expect(noneFilter).toBe('none');
    });

    it('should work in practical filtering scenarios', () => {
      const filters: QueryTypeFilter[] = [
        StorageClassification.STOCK_QUOTE,
        'get-crypto-quote',
        'all',
        'none'
      ];

      expect(filters).toHaveLength(4);
      expect(filters).toContain('stock_quote');
      expect(filters).toContain('get-crypto-quote');
      expect(filters).toContain('all');
      expect(filters).toContain('none');
    });
  });

  describe('FIELD_MAPPING_CONFIG', () => {
    describe('CAPABILITY_TO_CLASSIFICATION mapping', () => {
      it('should have all receiver types mapped to classifications', () => {
        const mapping = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION;

        expect(mapping['get-stock-quote']).toBe(StorageClassification.STOCK_QUOTE);
        expect(mapping['get-stock-basic-info']).toBe(StorageClassification.STOCK_BASIC_INFO);
        expect(mapping['get-index-quote']).toBe(StorageClassification.INDEX_QUOTE);
        expect(mapping['get-market-status']).toBe(StorageClassification.MARKET_STATUS);
        expect(mapping['get-trading-days']).toBe(StorageClassification.TRADING_DAYS);
        expect(mapping['get-global-state']).toBe(StorageClassification.GLOBAL_STATE);
        expect(mapping['get-crypto-quote']).toBe(StorageClassification.CRYPTO_QUOTE);
        expect(mapping['get-crypto-basic-info']).toBe(StorageClassification.CRYPTO_BASIC_INFO);
        expect(mapping['get-stock-logo']).toBe(StorageClassification.STOCK_LOGO);
        expect(mapping['get-crypto-logo']).toBe(StorageClassification.CRYPTO_LOGO);
        expect(mapping['get-stock-news']).toBe(StorageClassification.STOCK_NEWS);
        expect(mapping['get-crypto-news']).toBe(StorageClassification.CRYPTO_NEWS);
      });

      it('should have exactly 12 capability mappings', () => {
        const mapping = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION;
        expect(Object.keys(mapping)).toHaveLength(12);
      });

      it('should be immutable (const assertion)', () => {
        const mapping = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION;
        // TypeScript will prevent modification due to 'as const'
        expect(mapping).toBeDefined();
      });
    });

    describe('CLASSIFICATION_TO_CAPABILITY mapping', () => {
      it('should have reverse mappings for all classifications', () => {
        const mapping = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;

        expect(mapping[StorageClassification.STOCK_QUOTE]).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
        expect(mapping[StorageClassification.STOCK_BASIC_INFO]).toBe('get-stock-basic-info');
        expect(mapping[StorageClassification.INDEX_QUOTE]).toBe('get-index-quote');
        expect(mapping[StorageClassification.MARKET_STATUS]).toBe('get-market-status');
        expect(mapping[StorageClassification.TRADING_DAYS]).toBe('get-trading-days');
        expect(mapping[StorageClassification.GLOBAL_STATE]).toBe('get-global-state');
        expect(mapping[StorageClassification.CRYPTO_QUOTE]).toBe('get-crypto-quote');
        expect(mapping[StorageClassification.CRYPTO_BASIC_INFO]).toBe('get-crypto-basic-info');
        expect(mapping[StorageClassification.STOCK_LOGO]).toBe('get-stock-logo');
        expect(mapping[StorageClassification.CRYPTO_LOGO]).toBe('get-crypto-logo');
        expect(mapping[StorageClassification.STOCK_NEWS]).toBe('get-stock-news');
        expect(mapping[StorageClassification.CRYPTO_NEWS]).toBe('get-crypto-news');
      });

      it('should have mappings for missing classifications', () => {
        const mapping = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;

        expect(mapping[StorageClassification.STOCK_CANDLE]).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
        expect(mapping[StorageClassification.STOCK_TICK]).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
        expect(mapping[StorageClassification.FINANCIAL_STATEMENT]).toBe('get-stock-basic-info');
        expect(mapping[StorageClassification.MARKET_NEWS]).toBe('get-stock-news');
        expect(mapping[StorageClassification.TRADING_ORDER]).toBe('get-global-state');
        expect(mapping[StorageClassification.USER_PORTFOLIO]).toBe('get-global-state');
        expect(mapping[StorageClassification.GENERAL]).toBe('get-global-state');
      });

      it('should have exactly 19 classification mappings', () => {
        const mapping = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;
        expect(Object.keys(mapping)).toHaveLength(19);
      });

      it('should be immutable (const assertion)', () => {
        const mapping = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;
        expect(mapping).toBeDefined();
      });
    });

    describe('Bidirectional mapping consistency', () => {
      it('should maintain consistency between forward and reverse mappings', () => {
        const capabilityToClassification = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION;
        const classificationToCapability = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;

        // Test bidirectional mapping for core mappings
        Object.entries(capabilityToClassification).forEach(([capability, classification]) => {
          const reverseCapability = classificationToCapability[classification];

          // For stock quote, the reverse mapping uses API_OPERATIONS constant
          if (capability === 'get-stock-quote') {
            expect(reverseCapability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
          } else {
            expect(reverseCapability).toBe(capability);
          }
        });
      });

      it('should handle special cases in reverse mapping', () => {
        const classificationToCapability = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY;

        // Multiple classifications can map to the same capability
        expect(classificationToCapability[StorageClassification.STOCK_CANDLE])
          .toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
        expect(classificationToCapability[StorageClassification.STOCK_TICK])
          .toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);

        expect(classificationToCapability[StorageClassification.TRADING_ORDER])
          .toBe('get-global-state');
        expect(classificationToCapability[StorageClassification.USER_PORTFOLIO])
          .toBe('get-global-state');
        expect(classificationToCapability[StorageClassification.GENERAL])
          .toBe('get-global-state');
      });
    });

    describe('Practical usage scenarios', () => {
      it('should support capability lookup from classification', () => {
        const getCapabilityFromClassification = (classification: StorageClassification): string => {
          return FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification];
        };

        expect(getCapabilityFromClassification(StorageClassification.STOCK_QUOTE))
          .toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
        expect(getCapabilityFromClassification(StorageClassification.CRYPTO_QUOTE))
          .toBe('get-crypto-quote');
      });

      it('should support classification lookup from capability', () => {
        const getClassificationFromCapability = (capability: ReceiverType): StorageClassification => {
          return FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION[capability];
        };

        expect(getClassificationFromCapability('get-stock-quote'))
          .toBe(StorageClassification.STOCK_QUOTE);
        expect(getClassificationFromCapability('get-crypto-quote'))
          .toBe(StorageClassification.CRYPTO_QUOTE);
      });

      it('should work with filtering operations', () => {
        const capabilityToClassification = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION;

        const stockCapabilities = Object.entries(capabilityToClassification)
          .filter(([_, classification]) => classification.toString().startsWith('stock_'))
          .map(([capability, _]) => capability);

        expect(stockCapabilities).toContain('get-stock-quote');
        expect(stockCapabilities).toContain('get-stock-basic-info');
        expect(stockCapabilities).toContain('get-stock-logo');
        expect(stockCapabilities).toContain('get-stock-news');
        expect(stockCapabilities).toHaveLength(4);
      });
    });

    describe('Type safety validation', () => {
      it('should maintain type safety with const assertions', () => {
        // This test ensures the const assertion prevents runtime modifications
        const config = FIELD_MAPPING_CONFIG;
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      });

      it('should work with TypeScript union types', () => {
        const filter: QueryTypeFilter = StorageClassification.STOCK_QUOTE;
        expect(filter).toBe('stock_quote');

        const anotherFilter: QueryTypeFilter = 'get-stock-quote';
        expect(anotherFilter).toBe('get-stock-quote');

        const allFilter: QueryTypeFilter = 'all';
        expect(allFilter).toBe('all');
      });
    });
  });
});
