import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataValidator } from '@core/01-entry/stream-receiver/validators/stream-data.validator';
import { StreamSubscribeDto, StreamUnsubscribeDto } from '@core/01-entry/stream-receiver/dto';
import { ValidationResult, SymbolValidationResult } from '@core/01-entry/stream-receiver/validators/stream-data.validator';

describe('StreamDataValidator', () => {
  let validator: StreamDataValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamDataValidator],
    }).compile();

    validator = module.get<StreamDataValidator>(StreamDataValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSubscribeRequest', () => {
    it('should validate valid subscribe request successfully', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US', '0700.HK', '000001.SZ'],
        wsCapabilityType: 'quote',
        preferredProvider: 'longport',
        token: 'valid-jwt-token'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.symbols).toEqual(['AAPL.US', '0700.HK', '000001.SZ']);
    });

    it('should detect invalid symbol formats', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['INVALID', 'AAPL.US', 'BADFORMAT'],
        wsCapabilityType: 'quote',
        token: 'valid-jwt-token'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('无效的符号格式');
      expect(result.errors[0]).toContain('INVALID');
      expect(result.errors[0]).toContain('BADFORMAT');
    });

    it('should detect duplicate symbols', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US', 'aapl.us', 'GOOGL.US'],
        wsCapabilityType: 'quote',
        token: 'valid-jwt-token'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('发现重复符号');
      expect(result.warnings[0]).toContain('aapl.us');
    });

    it('should validate WebSocket capability types', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'invalid-capability',
        token: 'valid-jwt-token'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('不支持的WebSocket能力类型');
      expect(result.errors[0]).toContain('invalid-capability');
    });

    it('should validate preferred provider', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote',
        preferredProvider: 'unknown-provider',
        token: 'valid-jwt-token'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('未知的数据提供商');
      expect(result.warnings[0]).toContain('unknown-provider');
    });

    it('should require authentication information', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('缺少认证信息：需要提供JWT Token或API Key + Access Token');
    });

    it('should validate API key authentication', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote',
        apiKey: 'valid-api-key-123',
        accessToken: 'valid-access-token-456789'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid API key format', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote',
        apiKey: 'short',
        accessToken: 'valid-access-token-456789'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('API Key格式无效');
    });

    it('should detect invalid access token format', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote',
        apiKey: 'valid-api-key-123',
        accessToken: 'short'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Access Token格式无效');
    });

    it('should warn when both JWT and API key provided', () => {
      const dto: StreamSubscribeDto = {
        symbols: ['AAPL.US'],
        wsCapabilityType: 'quote',
        token: 'jwt-token',
        apiKey: 'valid-api-key-123',
        accessToken: 'valid-access-token-456789'
      };

      const result = validator.validateSubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('同时提供了JWT Token和API Key，将优先使用JWT Token');
    });
  });

  describe('validateUnsubscribeRequest', () => {
    it('should validate valid unsubscribe request successfully', () => {
      const dto: StreamUnsubscribeDto = {
        symbols: ['AAPL.US', '0700.HK'],
        wsCapabilityType: 'stream-stock-quote'
      };

      const result = validator.validateUnsubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.symbols).toEqual(['AAPL.US', '0700.HK']);
    });

    it('should detect invalid symbols in unsubscribe request', () => {
      const dto: StreamUnsubscribeDto = {
        symbols: ['INVALID', 'AAPL.US'],
        wsCapabilityType: 'stream-stock-quote'
      };

      const result = validator.validateUnsubscribeRequest(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('无效的符号格式');
      expect(result.errors[0]).toContain('INVALID');
    });

    it('should handle duplicate symbols in unsubscribe request', () => {
      const dto: StreamUnsubscribeDto = {
        symbols: ['AAPL.US', 'aapl.us'],
        wsCapabilityType: 'stream-stock-quote'
      };

      const result = validator.validateUnsubscribeRequest(dto);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('发现重复符号');
    });
  });

  describe('validateSymbols', () => {
    it('should validate and sanitize symbol list', () => {
      const symbols = ['aapl.us', 'GOOGL.US', '  0700.hk  ', 'INVALID'];

      const result = validator.validateSymbols(symbols);

      expect(result.validSymbols).toEqual(['aapl.us', 'GOOGL.US', '  0700.hk  ']);
      expect(result.invalidSymbols).toEqual(['INVALID']);
      expect(result.sanitizedSymbols).toEqual(['AAPL.US', 'GOOGL.US', '0700.HK']);
      expect(result.duplicateSymbols).toHaveLength(0);
    });

    it('should detect duplicate symbols', () => {
      const symbols = ['AAPL.US', 'aapl.us', 'GOOGL.US'];

      const result = validator.validateSymbols(symbols);

      expect(result.validSymbols).toEqual(['AAPL.US', 'GOOGL.US']);
      expect(result.duplicateSymbols).toEqual(['aapl.us']);
      expect(result.sanitizedSymbols).toEqual(['AAPL.US', 'GOOGL.US']);
    });

    it('should handle empty symbol list', () => {
      const result = validator.validateSymbols([]);

      expect(result.validSymbols).toHaveLength(0);
      expect(result.invalidSymbols).toHaveLength(0);
      expect(result.duplicateSymbols).toHaveLength(0);
      expect(result.sanitizedSymbols).toHaveLength(0);
    });
  });

  describe('isValidSymbolFormat', () => {
    it('should validate Hong Kong stock symbols', () => {
      expect(validator.isValidSymbolFormat('0700.HK')).toBe(true);
      expect(validator.isValidSymbolFormat('00700.HK')).toBe(true);
      expect(validator.isValidSymbolFormat('9988.HK')).toBe(true);
      expect(validator.isValidSymbolFormat('0700.hk')).toBe(true); // case insensitive
    });

    it('should validate US stock symbols', () => {
      expect(validator.isValidSymbolFormat('AAPL.US')).toBe(true);
      expect(validator.isValidSymbolFormat('GOOGL.US')).toBe(true);
      expect(validator.isValidSymbolFormat('TSLA.US')).toBe(true);
      expect(validator.isValidSymbolFormat('aapl.us')).toBe(true); // case insensitive
    });

    it('should validate Chinese stock symbols', () => {
      expect(validator.isValidSymbolFormat('000001.SZ')).toBe(true);
      expect(validator.isValidSymbolFormat('600036.SH')).toBe(true);
      expect(validator.isValidSymbolFormat('300059.SZ')).toBe(true);
      expect(validator.isValidSymbolFormat('000001.sz')).toBe(true); // case insensitive
    });

    it('should validate Singapore stock symbols', () => {
      expect(validator.isValidSymbolFormat('DBS.SG')).toBe(true);
      expect(validator.isValidSymbolFormat('OCBC.SG')).toBe(true);
      expect(validator.isValidSymbolFormat('UOB.SG')).toBe(true);
    });

    it('should reject invalid symbol formats', () => {
      expect(validator.isValidSymbolFormat('INVALID')).toBe(false);
      expect(validator.isValidSymbolFormat('123')).toBe(false);
      expect(validator.isValidSymbolFormat('AAPL')).toBe(false);
      expect(validator.isValidSymbolFormat('0700')).toBe(false);
      expect(validator.isValidSymbolFormat('')).toBe(false);
    });
  });

  describe('sanitizeSymbol', () => {
    it('should trim and uppercase symbols', () => {
      expect(validator.sanitizeSymbol('  aapl.us  ')).toBe('AAPL.US');
      expect(validator.sanitizeSymbol('0700.hk')).toBe('0700.HK');
      expect(validator.sanitizeSymbol('GOOGL.US')).toBe('GOOGL.US');
    });
  });

  describe('extractMarket', () => {
    it('should extract market identifier from symbols', () => {
      expect(validator.extractMarket('AAPL.US')).toBe('US');
      expect(validator.extractMarket('0700.HK')).toBe('HK');
      expect(validator.extractMarket('000001.SZ')).toBe('CN');
      expect(validator.extractMarket('DBS.SG')).toBe('SG');
    });

    it('should return null for invalid symbols', () => {
      expect(validator.extractMarket('INVALID')).toBeNull();
      expect(validator.extractMarket('123')).toBeNull();
      expect(validator.extractMarket('')).toBeNull();
    });

    it('should handle case insensitive extraction', () => {
      expect(validator.extractMarket('aapl.us')).toBe('US');
      expect(validator.extractMarket('0700.hk')).toBe('HK');
    });
  });

  describe('isValidWSCapability', () => {
    it('should validate supported WebSocket capabilities', () => {
      expect(validator.isValidWSCapability('quote')).toBe(true);
      expect(validator.isValidWSCapability('depth')).toBe(true);
      expect(validator.isValidWSCapability('trade')).toBe(true);
      expect(validator.isValidWSCapability('broker')).toBe(true);
      expect(validator.isValidWSCapability('kline')).toBe(true);
    });

    it('should handle case insensitive capability validation', () => {
      expect(validator.isValidWSCapability('QUOTE')).toBe(true);
      expect(validator.isValidWSCapability('Quote')).toBe(true);
    });

    it('should reject unsupported capabilities', () => {
      expect(validator.isValidWSCapability('invalid')).toBe(false);
      expect(validator.isValidWSCapability('unknown')).toBe(false);
      expect(validator.isValidWSCapability('')).toBe(false);
    });
  });

  describe('isValidProvider', () => {
    it('should validate supported providers', () => {
      expect(validator.isValidProvider('longport')).toBe(true);
      expect(validator.isValidProvider('twelvedata')).toBe(true);
      expect(validator.isValidProvider('itick')).toBe(true);
      expect(validator.isValidProvider('yahoo')).toBe(true);
    });

    it('should handle case insensitive provider validation', () => {
      expect(validator.isValidProvider('LONGPORT')).toBe(true);
      expect(validator.isValidProvider('LongPort')).toBe(true);
    });

    it('should reject unsupported providers', () => {
      expect(validator.isValidProvider('unknown')).toBe(false);
      expect(validator.isValidProvider('invalid')).toBe(false);
      expect(validator.isValidProvider('')).toBe(false);
    });
  });

  describe('validateStreamData', () => {
    it('should validate valid stream data', () => {
      const data = {
        symbol: 'AAPL.US',
        timestamp: 1640995200000,
        price: 150.5,
        volume: 1000
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData.symbol).toBe('AAPL.US');
    });

    it('should reject null or undefined data', () => {
      const result = validator.validateStreamData(null);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('流数据不能为空');
    });

    it('should require symbol field', () => {
      const data = {
        timestamp: 1640995200000,
        price: 150.5
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('流数据缺少symbol字段');
    });

    it('should require timestamp field', () => {
      const data = {
        symbol: 'AAPL.US',
        price: 150.5
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('流数据缺少时间戳字段');
    });

    it('should accept time field as alternative to timestamp', () => {
      const data = {
        symbol: 'AAPL.US',
        time: '2022-01-01T10:00:00Z',
        price: 150.5
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate price field type and value', () => {
      const invalidPriceData = {
        symbol: 'AAPL.US',
        timestamp: 1640995200000,
        price: -10
      };

      const result = validator.validateStreamData(invalidPriceData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('价格字段必须是正数');
    });

    it('should validate volume field type and value', () => {
      const invalidVolumeData = {
        symbol: 'AAPL.US',
        timestamp: 1640995200000,
        volume: -100
      };

      const result = validator.validateStreamData(invalidVolumeData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('成交量字段必须是非负数');
    });

    it('should warn about non-standard symbol formats', () => {
      const data = {
        symbol: 'NONSTANDARD',
        timestamp: 1640995200000
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('符号格式可能不标准');
      expect(result.warnings[0]).toContain('NONSTANDARD');
    });

    it('should sanitize symbol in stream data', () => {
      const data = {
        symbol: '  aapl.us  ',
        timestamp: 1640995200000
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.symbol).toBe('AAPL.US');
    });
  });

  describe('validateBatchStreamData', () => {
    it('should validate batch stream data successfully', () => {
      const dataArray = [
        { symbol: 'AAPL.US', timestamp: 1640995200000, price: 150.5 },
        { symbol: '0700.HK', timestamp: 1640995201000, price: 500.0 },
        { symbol: '000001.SZ', timestamp: 1640995202000, price: 15.8 }
      ];

      const result = validator.validateBatchStreamData(dataArray);

      expect(result.validData).toHaveLength(3);
      expect(result.invalidData).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should separate valid and invalid data', () => {
      const dataArray = [
        { symbol: 'AAPL.US', timestamp: 1640995200000, price: 150.5 },
        { symbol: 'INVALID' }, // Missing timestamp
        { symbol: '0700.HK', timestamp: 1640995202000, price: -10 } // Invalid price
      ];

      const result = validator.validateBatchStreamData(dataArray);

      expect(result.validData).toHaveLength(1);
      expect(result.invalidData).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatch(/^\[1\]/);
      expect(result.errors[1]).toMatch(/^\[2\]/);
    });

    it('should include index information in error messages', () => {
      const dataArray = [
        null,
        { symbol: 'AAPL.US' }, // Missing timestamp
        { symbol: 'INVALID', timestamp: 1640995200000 }
      ];

      const result = validator.validateBatchStreamData(dataArray);

      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0]).toMatch(/^\[0\]/);
      expect(result.errors[1]).toMatch(/^\[1\]/);
      expect(result.warnings[0]).toMatch(/^\[2\]/);
      expect(result.warnings[0]).toContain('符号格式可能不标准');
    });

    it('should handle empty batch', () => {
      const result = validator.validateBatchStreamData([]);

      expect(result.validData).toHaveLength(0);
      expect(result.invalidData).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    describe('getSupportedMarkets', () => {
      it('should return supported markets list', () => {
        const markets = validator.getSupportedMarkets();

        expect(markets).toEqual(['HK', 'US', 'CN', 'SG']);
        expect(markets).toBeInstanceOf(Array);
      });

      it('should return a copy of the array', () => {
        const markets1 = validator.getSupportedMarkets();
        const markets2 = validator.getSupportedMarkets();

        expect(markets1).toEqual(markets2);
        expect(markets1).not.toBe(markets2); // Different references
      });
    });

    describe('getSupportedWSCapabilities', () => {
      it('should return supported WebSocket capabilities', () => {
        const capabilities = validator.getSupportedWSCapabilities();

        expect(capabilities).toEqual(['quote', 'depth', 'trade', 'broker', 'kline']);
        expect(capabilities).toBeInstanceOf(Array);
      });
    });

    describe('getSymbolFormatExamples', () => {
      it('should return symbol format examples for all markets', () => {
        const examples = validator.getSymbolFormatExamples();

        expect(examples).toHaveProperty('HK');
        expect(examples).toHaveProperty('US');
        expect(examples).toHaveProperty('CN');
        expect(examples).toHaveProperty('SG');

        expect(examples.HK).toContain('0700.HK');
        expect(examples.US).toContain('AAPL.US');
        expect(examples.CN).toContain('000001.SZ');
        expect(examples.SG).toContain('DBS.SG');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with special characters in validation', () => {
      const symbols = ['AAPL.US', '0700.HK', 'INVALID@SYMBOL', ''];

      const result = validator.validateSymbols(symbols);

      expect(result.validSymbols).toEqual(['AAPL.US', '0700.HK']);
      expect(result.invalidSymbols).toEqual(['INVALID@SYMBOL', '']);
    });

    it('should handle very long symbol lists', () => {
      const longSymbolList = Array(1000).fill('AAPL.US');

      const result = validator.validateSymbols(longSymbolList);

      expect(result.validSymbols).toHaveLength(1);
      expect(result.duplicateSymbols).toHaveLength(999);
      expect(result.sanitizedSymbols).toEqual(['AAPL.US']);
    });

    it('should handle undefined fields in stream data gracefully', () => {
      const data = {
        symbol: 'AAPL.US',
        timestamp: 1640995200000,
        price: undefined,
        volume: undefined
      };

      const result = validator.validateStreamData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('performance tests', () => {
    it('should handle large batch validation efficiently', () => {
      const largeDataArray = Array(10000).fill(null).map((_, i) => ({
        symbol: 'AAPL.US',
        timestamp: 1640995200000 + i,
        price: 150 + (i % 10)
      }));

      const startTime = Date.now();
      const result = validator.validateBatchStreamData(largeDataArray);
      const endTime = Date.now();

      expect(result.validData).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should validate symbols efficiently', () => {
      const toBase26 = (n: number): string => {
        let s = '';
        if (n < 0) return '';
        do {
          s = String.fromCharCode(65 + (n % 26)) + s;
          n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return s;
      };
      const manySymbols = Array(1000).fill(null).map((_, i) => toBase26(i) + '.US');

      const startTime = Date.now();
      const result = validator.validateSymbols(manySymbols);
      const endTime = Date.now();

      expect(result.validSymbols).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});