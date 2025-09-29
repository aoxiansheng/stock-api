import { DataTransformResponseDto, DataTransformationMetadataDto } from '@core/02-processing/transformer/dto/data-transform-response.dto';

describe('DataTransformationMetadataDto', () => {
  describe('Constructor and Property Assignment', () => {
    it('should create metadata with all required properties', () => {
      const metadata = new DataTransformationMetadataDto(
        'rule-123',
        'Test Rule',
        'longport',
        'quote_fields',
        5,
        10,
        250
      );

      expect(metadata.ruleId).toBe('rule-123');
      expect(metadata.ruleName).toBe('Test Rule');
      expect(metadata.provider).toBe('longport');
      expect(metadata.transDataRuleListType).toBe('quote_fields');
      expect(metadata.recordsProcessed).toBe(5);
      expect(metadata.fieldsTransformed).toBe(10);
      expect(metadata.processingTimeMs).toBe(250);
      expect(metadata.timestamp).toBeDefined();
      expect(typeof metadata.timestamp).toBe('string');
      expect(metadata.transformationsApplied).toBeUndefined();
    });

    it('should create metadata with transformationsApplied', () => {
      const transformations = [
        {
          sourceField: 'last_done',
          targetField: 'lastPrice',
          transformType: 'direct',
          transformValue: 385.6
        },
        {
          sourceField: 'change_rate',
          targetField: 'changePercent',
          transformType: 'percentage',
          transformValue: -1.08
        }
      ];

      const metadata = new DataTransformationMetadataDto(
        'rule-456',
        'Advanced Rule',
        'yahoo',
        'historical_data',
        3,
        8,
        180,
        transformations
      );

      expect(metadata.ruleId).toBe('rule-456');
      expect(metadata.ruleName).toBe('Advanced Rule');
      expect(metadata.provider).toBe('yahoo');
      expect(metadata.transDataRuleListType).toBe('historical_data');
      expect(metadata.recordsProcessed).toBe(3);
      expect(metadata.fieldsTransformed).toBe(8);
      expect(metadata.processingTimeMs).toBe(180);
      expect(metadata.transformationsApplied).toEqual(transformations);
      expect(metadata.transformationsApplied).toHaveLength(2);
    });

    it('should auto-generate ISO timestamp', () => {
      const beforeTime = new Date().toISOString();

      const metadata = new DataTransformationMetadataDto(
        'rule-789',
        'Timestamp Test',
        'alpha-vantage',
        'fundamental_data',
        1,
        4,
        100
      );

      const afterTime = new Date().toISOString();

      expect(metadata.timestamp).toBeDefined();
      expect(typeof metadata.timestamp).toBe('string');
      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadata.timestamp >= beforeTime).toBe(true);
      expect(metadata.timestamp <= afterTime).toBe(true);
    });
  });

  describe('Property Validation', () => {
    it('should handle zero values correctly', () => {
      const metadata = new DataTransformationMetadataDto(
        'rule-zero',
        'Zero Values Test',
        'test-provider',
        'test-type',
        0,
        0,
        0
      );

      expect(metadata.recordsProcessed).toBe(0);
      expect(metadata.fieldsTransformed).toBe(0);
      expect(metadata.processingTimeMs).toBe(0);
    });

    it('should handle large numeric values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;

      const metadata = new DataTransformationMetadataDto(
        'rule-large',
        'Large Values Test',
        'test-provider',
        'test-type',
        largeValue,
        largeValue,
        largeValue
      );

      expect(metadata.recordsProcessed).toBe(largeValue);
      expect(metadata.fieldsTransformed).toBe(largeValue);
      expect(metadata.processingTimeMs).toBe(largeValue);
    });

    it('should handle special characters in string properties', () => {
      const metadata = new DataTransformationMetadataDto(
        '特殊-规则-🚀',
        'Special Rule: @#$%^&*()',
        'provider-with-special-chars-特殊',
        'type_with_unicode_🔥',
        1,
        2,
        300
      );

      expect(metadata.ruleId).toBe('特殊-规则-🚀');
      expect(metadata.ruleName).toBe('Special Rule: @#$%^&*()');
      expect(metadata.provider).toBe('provider-with-special-chars-特殊');
      expect(metadata.transDataRuleListType).toBe('type_with_unicode_🔥');
    });

    it('should handle empty string properties', () => {
      const metadata = new DataTransformationMetadataDto(
        '',
        '',
        '',
        '',
        1,
        2,
        300
      );

      expect(metadata.ruleId).toBe('');
      expect(metadata.ruleName).toBe('');
      expect(metadata.provider).toBe('');
      expect(metadata.transDataRuleListType).toBe('');
    });

    it('should handle very long string properties', () => {
      const longString = 'a'.repeat(10000);

      const metadata = new DataTransformationMetadataDto(
        longString,
        longString,
        longString,
        longString,
        1,
        2,
        300
      );

      expect(metadata.ruleId).toBe(longString);
      expect(metadata.ruleName).toBe(longString);
      expect(metadata.provider).toBe(longString);
      expect(metadata.transDataRuleListType).toBe(longString);
    });
  });

  describe('Transformations Applied Array', () => {
    it('should handle empty transformations array', () => {
      const metadata = new DataTransformationMetadataDto(
        'rule-empty-array',
        'Empty Array Test',
        'test-provider',
        'test-type',
        1,
        2,
        300,
        []
      );

      expect(metadata.transformationsApplied).toEqual([]);
      expect(metadata.transformationsApplied).toHaveLength(0);
    });

    it('should handle complex transformation objects', () => {
      const complexTransformations = [
        {
          sourceField: 'nested.deep.value',
          targetField: 'flatValue',
          transformType: 'flatten',
          transformValue: { original: { nested: { deep: { value: 123 } } }, flattened: 123 }
        },
        {
          sourceField: 'arrayField[0].price',
          targetField: 'firstPrice',
          transformType: 'array_extract',
          transformValue: [{ price: 100 }, { price: 200 }]
        },
        {
          sourceField: 'timestamp',
          targetField: 'formattedDate',
          transformType: 'date_format',
          transformValue: {
            input: '2024-01-01T12:00:00Z',
            output: '2024-01-01',
            format: 'YYYY-MM-DD'
          }
        }
      ];

      const metadata = new DataTransformationMetadataDto(
        'rule-complex',
        'Complex Transformations',
        'advanced-provider',
        'complex-data',
        3,
        15,
        500,
        complexTransformations
      );

      expect(metadata.transformationsApplied).toEqual(complexTransformations);
      expect(metadata.transformationsApplied).toHaveLength(3);
      expect(metadata.transformationsApplied![0].transformValue.original.nested.deep.value).toBe(123);
      expect(metadata.transformationsApplied![1].transformValue).toHaveLength(2);
      expect(metadata.transformationsApplied![2].transformValue.format).toBe('YYYY-MM-DD');
    });

    it('should handle transformations with undefined transformValue', () => {
      const transformationsWithUndefined = [
        {
          sourceField: 'field1',
          targetField: 'target1',
          transformType: 'simple'
        },
        {
          sourceField: 'field2',
          targetField: 'target2',
          transformValue: 'some value'
        }
      ];

      const metadata = new DataTransformationMetadataDto(
        'rule-undefined',
        'Undefined Values Test',
        'test-provider',
        'test-type',
        2,
        4,
        200,
        transformationsWithUndefined
      );

      expect(metadata.transformationsApplied).toEqual(transformationsWithUndefined);
      expect(metadata.transformationsApplied![0].transformValue).toBeUndefined();
      expect(metadata.transformationsApplied![1].transformValue).toBe('some value');
    });

    it('should handle large transformations array', () => {
      const largeTransformations = Array(1000).fill(null).map((_, i) => ({
        sourceField: `source_${i}`,
        targetField: `target_${i}`,
        transformType: `type_${i % 10}`,
        transformValue: `value_${i}`
      }));

      const metadata = new DataTransformationMetadataDto(
        'rule-large-array',
        'Large Array Test',
        'bulk-provider',
        'bulk-type',
        1000,
        2000,
        5000,
        largeTransformations
      );

      expect(metadata.transformationsApplied).toHaveLength(1000);
      expect(metadata.transformationsApplied![0].sourceField).toBe('source_0');
      expect(metadata.transformationsApplied![999].sourceField).toBe('source_999');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const originalMetadata = new DataTransformationMetadataDto(
        'serialization-test',
        'JSON Test',
        'json-provider',
        'json-type',
        5,
        10,
        250,
        [{
          sourceField: 'test',
          targetField: 'result',
          transformType: 'test',
          transformValue: { complex: 'object' }
        }]
      );

      const json = JSON.stringify(originalMetadata);
      const parsed = JSON.parse(json);

      expect(parsed.ruleId).toBe('serialization-test');
      expect(parsed.ruleName).toBe('JSON Test');
      expect(parsed.provider).toBe('json-provider');
      expect(parsed.transDataRuleListType).toBe('json-type');
      expect(parsed.recordsProcessed).toBe(5);
      expect(parsed.fieldsTransformed).toBe(10);
      expect(parsed.processingTimeMs).toBe(250);
      expect(parsed.timestamp).toBe(originalMetadata.timestamp);
      expect(parsed.transformationsApplied).toHaveLength(1);
      expect(parsed.transformationsApplied[0].transformValue.complex).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative numeric values', () => {
      const metadata = new DataTransformationMetadataDto(
        'negative-test',
        'Negative Values',
        'negative-provider',
        'negative-type',
        -1,
        -5,
        -100
      );

      expect(metadata.recordsProcessed).toBe(-1);
      expect(metadata.fieldsTransformed).toBe(-5);
      expect(metadata.processingTimeMs).toBe(-100);
    });

    it('should handle floating point numbers', () => {
      const metadata = new DataTransformationMetadataDto(
        'float-test',
        'Float Values',
        'float-provider',
        'float-type',
        1.5,
        2.7,
        123.456
      );

      expect(metadata.recordsProcessed).toBe(1.5);
      expect(metadata.fieldsTransformed).toBe(2.7);
      expect(metadata.processingTimeMs).toBe(123.456);
    });
  });
});

describe('DataTransformResponseDto', () => {
  let mockMetadata: DataTransformationMetadataDto;

  beforeEach(() => {
    mockMetadata = new DataTransformationMetadataDto(
      'test-rule-id',
      'Test Rule',
      'test-provider',
      'test-type',
      1,
      5,
      100
    );
  });

  describe('Constructor and Property Assignment', () => {
    it('should create response with simple transformed data', () => {
      const transformedData = {
        symbol: '700.HK',
        lastPrice: 385.6,
        changePercent: -1.08
      };

      const response = new DataTransformResponseDto(transformedData, mockMetadata);

      expect(response.transformedData).toEqual(transformedData);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should create response with array transformed data', () => {
      const transformedData = [
        { symbol: '700.HK', price: 385.6 },
        { symbol: 'AAPL', price: 195.89 },
        { symbol: 'GOOGL', price: 2800.50 }
      ];

      const response = new DataTransformResponseDto(transformedData, mockMetadata);

      expect(response.transformedData).toEqual(transformedData);
      expect(response.transformedData).toHaveLength(3);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should create response with primitive transformed data', () => {
      const stringData = 'simple string result';
      const numberData = 42;
      const booleanData = true;

      const stringResponse = new DataTransformResponseDto(stringData, mockMetadata);
      const numberResponse = new DataTransformResponseDto(numberData, mockMetadata);
      const booleanResponse = new DataTransformResponseDto(booleanData, mockMetadata);

      expect(stringResponse.transformedData).toBe('simple string result');
      expect(numberResponse.transformedData).toBe(42);
      expect(booleanResponse.transformedData).toBe(true);
      expect(stringResponse.metadata).toBe(mockMetadata);
      expect(numberResponse.metadata).toBe(mockMetadata);
      expect(booleanResponse.metadata).toBe(mockMetadata);
    });

    it('should create response with null transformed data', () => {
      const response = new DataTransformResponseDto(null, mockMetadata);

      expect(response.transformedData).toBeNull();
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should create response with undefined transformed data', () => {
      const response = new DataTransformResponseDto(undefined, mockMetadata);

      expect(response.transformedData).toBeUndefined();
      expect(response.metadata).toBe(mockMetadata);
    });
  });

  describe('Generic Type Support', () => {
    interface StockQuote {
      symbol: string;
      lastPrice: number;
      changePercent: number;
      volume?: number;
    }

    it('should support typed responses with interface', () => {
      const stockData: StockQuote = {
        symbol: '700.HK',
        lastPrice: 385.6,
        changePercent: -1.08,
        volume: 1000000
      };

      const response = new DataTransformResponseDto<StockQuote>(stockData, mockMetadata);

      expect(response.transformedData.symbol).toBe('700.HK');
      expect(response.transformedData.lastPrice).toBe(385.6);
      expect(response.transformedData.changePercent).toBe(-1.08);
      expect(response.transformedData.volume).toBe(1000000);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should support typed array responses', () => {
      const stocksData: StockQuote[] = [
        { symbol: '700.HK', lastPrice: 385.6, changePercent: -1.08 },
        { symbol: 'AAPL', lastPrice: 195.89, changePercent: 2.5 }
      ];

      const response = new DataTransformResponseDto<StockQuote[]>(stocksData, mockMetadata);

      expect(response.transformedData).toHaveLength(2);
      expect(response.transformedData[0].symbol).toBe('700.HK');
      expect(response.transformedData[1].symbol).toBe('AAPL');
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should support complex nested type responses', () => {
      interface ComplexData {
        quotes: StockQuote[];
        metadata: {
          totalCount: number;
          source: string;
        };
        timestamp: string;
      }

      const complexData: ComplexData = {
        quotes: [
          { symbol: '700.HK', lastPrice: 385.6, changePercent: -1.08 },
          { symbol: 'AAPL', lastPrice: 195.89, changePercent: 2.5 }
        ],
        metadata: {
          totalCount: 2,
          source: 'live'
        },
        timestamp: '2024-01-01T12:00:00Z'
      };

      const response = new DataTransformResponseDto<ComplexData>(complexData, mockMetadata);

      expect(response.transformedData.quotes).toHaveLength(2);
      expect(response.transformedData.metadata.totalCount).toBe(2);
      expect(response.transformedData.metadata.source).toBe('live');
      expect(response.transformedData.timestamp).toBe('2024-01-01T12:00:00Z');
      expect(response.metadata).toBe(mockMetadata);
    });
  });

  describe('Complex Data Scenarios', () => {
    it('should handle large dataset transformed data', () => {
      const largeDataset = Array(10000).fill(null).map((_, i) => ({
        id: i,
        symbol: `SYM${i}`,
        price: Math.random() * 1000,
        timestamp: new Date().toISOString()
      }));

      const response = new DataTransformResponseDto(largeDataset, mockMetadata);

      expect(response.transformedData).toHaveLength(10000);
      expect(response.transformedData[0].id).toBe(0);
      expect(response.transformedData[9999].id).toBe(9999);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should handle deeply nested object data', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep value',
                  array: [1, 2, 3, { nested: 'in array' }]
                }
              }
            }
          }
        },
        parallel: {
          data: 'parallel structure'
        }
      };

      const response = new DataTransformResponseDto(deeplyNested, mockMetadata);

      expect(response.transformedData.level1.level2.level3.level4.level5.value).toBe('deep value');
      expect(response.transformedData.level1.level2.level3.level4.level5.array).toHaveLength(4);
      expect((response.transformedData.level1.level2.level3.level4.level5.array[3] as any).nested).toBe('in array');
      expect(response.transformedData.parallel.data).toBe('parallel structure');
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should handle data with special characters and unicode', () => {
      const unicodeData = {
        chinese: '腾讯控股',
        emoji: '🚀📈💰',
        special: '@#$%^&*()[]{}|\\:;"<>,.?/',
        unicode: 'ñáéíóú',
        mixed: '股票-STOCK-🔥-@123'
      };

      const response = new DataTransformResponseDto(unicodeData, mockMetadata);

      expect(response.transformedData.chinese).toBe('腾讯控股');
      expect(response.transformedData.emoji).toBe('🚀📈💰');
      expect(response.transformedData.special).toBe('@#$%^&*()[]{}|\\:;"<>,.?/');
      expect(response.transformedData.unicode).toBe('ñáéíóú');
      expect(response.transformedData.mixed).toBe('股票-STOCK-🔥-@123');
      expect(response.metadata).toBe(mockMetadata);
    });
  });

  describe('JSON Serialization and API Compatibility', () => {
    it('should serialize correctly for API responses', () => {
      const transformedData = {
        symbol: '700.HK',
        lastPrice: 385.6,
        changePercent: -1.08,
        volume: 1000000
      };

      const response = new DataTransformResponseDto(transformedData, mockMetadata);
      const json = JSON.stringify(response);
      const parsed = JSON.parse(json);

      expect(parsed.transformedData).toEqual(transformedData);
      expect(parsed.metadata.ruleId).toBe('test-rule-id');
      expect(parsed.metadata.ruleName).toBe('Test Rule');
      expect(parsed.metadata.provider).toBe('test-provider');
      expect(parsed.metadata.transDataRuleListType).toBe('test-type');
      expect(parsed.metadata.recordsProcessed).toBe(1);
      expect(parsed.metadata.fieldsTransformed).toBe(5);
      expect(parsed.metadata.processingTimeMs).toBe(100);
    });

    it('should handle circular references in transformed data gracefully', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData; // Create circular reference

      const response = new DataTransformResponseDto(circularData, mockMetadata);

      expect(response.transformedData.name).toBe('test');
      expect(response.transformedData.self).toBe(response.transformedData);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should maintain type information across serialization boundaries', () => {
      const transformedData = {
        stringField: 'test string',
        numberField: 123.456,
        booleanField: true,
        nullField: null,
        arrayField: [1, 'two', { three: 3 }],
        objectField: { nested: { value: 'deep' } }
      };

      const response = new DataTransformResponseDto(transformedData, mockMetadata);
      const json = JSON.stringify(response);
      const parsed = JSON.parse(json);

      expect(typeof parsed.transformedData.stringField).toBe('string');
      expect(typeof parsed.transformedData.numberField).toBe('number');
      expect(typeof parsed.transformedData.booleanField).toBe('boolean');
      expect(parsed.transformedData.nullField).toBeNull();
      expect(Array.isArray(parsed.transformedData.arrayField)).toBe(true);
      expect(typeof parsed.transformedData.objectField).toBe('object');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty object transformed data', () => {
      const emptyObject = {};
      const response = new DataTransformResponseDto(emptyObject, mockMetadata);

      expect(response.transformedData).toEqual({});
      expect(Object.keys(response.transformedData)).toHaveLength(0);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should handle empty array transformed data', () => {
      const emptyArray: any[] = [];
      const response = new DataTransformResponseDto(emptyArray, mockMetadata);

      expect(response.transformedData).toEqual([]);
      expect(response.transformedData).toHaveLength(0);
      expect(response.metadata).toBe(mockMetadata);
    });

    it('should handle function properties in transformed data', () => {
      const dataWithFunction = {
        value: 123,
        method: function() { return 'test'; },
        arrow: () => 'arrow function'
      };

      const response = new DataTransformResponseDto(dataWithFunction, mockMetadata);

      expect(response.transformedData.value).toBe(123);
      expect(typeof response.transformedData.method).toBe('function');
      expect(typeof response.transformedData.arrow).toBe('function');
      expect(response.transformedData.method()).toBe('test');
      expect(response.transformedData.arrow()).toBe('arrow function');
    });

    it('should handle Symbol properties in transformed data', () => {
      const symbolKey = Symbol('test');
      const dataWithSymbol: any = {
        normalProp: 'normal',
        [symbolKey]: 'symbol value'
      };

      const response = new DataTransformResponseDto(dataWithSymbol, mockMetadata);

      expect(response.transformedData.normalProp).toBe('normal');
      expect(response.transformedData[symbolKey]).toBe('symbol value');
    });

    it('should handle Date objects in transformed data', () => {
      const dateObject = new Date('2024-01-01T12:00:00Z');
      const dataWithDate = {
        timestamp: dateObject,
        string: 'normal string'
      };

      const response = new DataTransformResponseDto(dataWithDate, mockMetadata);

      expect(response.transformedData.timestamp).toBe(dateObject);
      expect(response.transformedData.timestamp instanceof Date).toBe(true);
      expect(response.transformedData.string).toBe('normal string');
    });

    it('should handle BigInt values in transformed data', () => {
      const bigIntValue = BigInt('9007199254740991');
      const dataWithBigInt = {
        normalNumber: 123,
        bigNumber: bigIntValue
      };

      const response = new DataTransformResponseDto(dataWithBigInt, mockMetadata);

      expect(response.transformedData.normalNumber).toBe(123);
      expect(response.transformedData.bigNumber).toBe(bigIntValue);
      expect(typeof response.transformedData.bigNumber).toBe('bigint');
    });
  });

  describe('Property Immutability and Reference Handling', () => {
    it('should maintain reference to original metadata object', () => {
      const originalMetadata = new DataTransformationMetadataDto(
        'immutable-test',
        'Immutable Test',
        'test-provider',
        'test-type',
        1,
        2,
        300
      );

      const response = new DataTransformResponseDto({ test: 'data' }, originalMetadata);

      expect(response.metadata).toBe(originalMetadata);
      expect(response.metadata === originalMetadata).toBe(true);
    });

    it('should maintain reference to original transformed data object', () => {
      const originalData = { symbol: '700.HK', price: 385.6 };
      const response = new DataTransformResponseDto(originalData, mockMetadata);

      expect(response.transformedData).toBe(originalData);
      expect(response.transformedData === originalData).toBe(true);

      // Modifying original should affect response
      originalData.price = 400.0;
      expect(response.transformedData.price).toBe(400.0);
    });

    it('should handle array reference correctly', () => {
      const originalArray = [{ id: 1 }, { id: 2 }];
      const response = new DataTransformResponseDto(originalArray, mockMetadata);

      expect(response.transformedData).toBe(originalArray);
      expect(response.transformedData === originalArray).toBe(true);

      // Modifying original array should affect response
      originalArray.push({ id: 3 });
      expect(response.transformedData).toHaveLength(3);
      expect(response.transformedData[2].id).toBe(3);
    });
  });
});

describe('DataTransformResponseDto Integration', () => {
  describe('Real-world Usage Scenarios', () => {
    it('should handle stock quote transformation response', () => {
      const stockQuoteData = {
        symbol: '700.HK',
        lastPrice: 385.6,
        change: -4.2,
        changePercent: -1.08,
        volume: 15420000,
        marketCap: 3654000000,
        high: 390.0,
        low: 384.5,
        open: 389.8,
        previousClose: 389.8
      };

      const metadata = new DataTransformationMetadataDto(
        'longport-quote-rule-v2',
        'LongPort Stock Quote Mapping',
        'longport',
        'quote_fields',
        1,
        10,
        85,
        [
          { sourceField: 'last_done', targetField: 'lastPrice', transformType: 'direct' },
          { sourceField: 'change_val', targetField: 'change', transformType: 'direct' },
          { sourceField: 'change_rate', targetField: 'changePercent', transformType: 'percentage' }
        ]
      );

      const response = new DataTransformResponseDto(stockQuoteData, metadata);

      expect(response.transformedData.symbol).toBe('700.HK');
      expect(response.transformedData.lastPrice).toBe(385.6);
      expect(response.metadata.provider).toBe('longport');
      expect(response.metadata.transformationsApplied).toHaveLength(3);
    });

    it('should handle batch processing response', () => {
      const batchData = [
        { symbol: '700.HK', lastPrice: 385.6, status: 'success' },
        { symbol: 'AAPL', lastPrice: 195.89, status: 'success' },
        { symbol: 'INVALID', error: 'Symbol not found', status: 'error' }
      ];

      const batchMetadata = new DataTransformationMetadataDto(
        'batch-processing-rule',
        'Batch Stock Data Processing',
        'multi-provider',
        'batch_quote_fields',
        3,
        20,
        450,
        [
          { sourceField: 'batch_input', targetField: 'processed_results', transformType: 'batch_process' }
        ]
      );

      const response = new DataTransformResponseDto(batchData, batchMetadata);

      expect(response.transformedData).toHaveLength(3);
      expect(response.transformedData[0].status).toBe('success');
      expect(response.transformedData[2].status).toBe('error');
      expect(response.metadata.recordsProcessed).toBe(3);
    });

    it('should handle historical data transformation response', () => {
      const historicalData = {
        symbol: 'AAPL',
        period: '1Y',
        data: Array(252).fill(null).map((_, i) => ({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          open: 190 + Math.random() * 20,
          high: 195 + Math.random() * 25,
          low: 185 + Math.random() * 15,
          close: 192 + Math.random() * 18,
          volume: Math.floor(Math.random() * 100000000)
        })),
        statistics: {
          averageVolume: 85000000,
          highestPrice: 220.5,
          lowestPrice: 165.2,
          volatility: 0.25
        }
      };

      const historicalMetadata = new DataTransformationMetadataDto(
        'historical-data-rule',
        'Historical Stock Data Transformation',
        'yahoo-finance',
        'historical_ohlcv',
        252,
        1260,
        2500,
        [
          { sourceField: 'historical_prices', targetField: 'ohlcv_data', transformType: 'historical_normalize' },
          { sourceField: 'volume_data', targetField: 'volume_normalized', transformType: 'volume_scale' }
        ]
      );

      const response = new DataTransformResponseDto(historicalData, historicalMetadata);

      expect(response.transformedData.symbol).toBe('AAPL');
      expect(response.transformedData.data).toHaveLength(252);
      expect(response.transformedData.statistics.averageVolume).toBe(85000000);
      expect(response.metadata.recordsProcessed).toBe(252);
      expect(response.metadata.fieldsTransformed).toBe(1260);
    });
  });

  describe('Performance and Memory Scenarios', () => {
    it('should handle large response data efficiently', () => {
      const startTime = Date.now();

      const largeDataset = Array(50000).fill(null).map((_, i) => ({
        id: i,
        timestamp: Date.now(),
        value: Math.random(),
        category: `category_${i % 100}`
      }));

      const largeMetadata = new DataTransformationMetadataDto(
        'performance-test-rule',
        'Large Dataset Performance Test',
        'performance-provider',
        'large_dataset',
        50000,
        200000,
        15000
      );

      const response = new DataTransformResponseDto(largeDataset, largeMetadata);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.transformedData).toHaveLength(50000);
      expect(response.metadata.recordsProcessed).toBe(50000);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle memory-intensive nested structures', () => {
      const createNestedStructure = (depth: number): any => {
        if (depth === 0) return { value: Math.random() };
        return {
          level: depth,
          nested: createNestedStructure(depth - 1),
          siblings: Array(10).fill(null).map(() => ({ data: `level_${depth}_data` }))
        };
      };

      const deepData = createNestedStructure(10);
      const mockMetadata = new DataTransformationMetadataDto(
        'test-rule-id',
        'Test Rule',
        'test-provider',
        'test-type',
        1,
        5,
        100
      );
      const response = new DataTransformResponseDto(deepData, mockMetadata);

      expect(response.transformedData.level).toBe(10);
      expect(response.transformedData.nested.level).toBe(9);
      expect(response.transformedData.siblings).toHaveLength(10);
    });
  });
});