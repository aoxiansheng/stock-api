import { validate } from 'class-validator';
import { StreamSubscribeDto } from '@core/01-entry/stream-receiver/dto/stream-subscribe.dto';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe('StreamSubscribeDto', () => {
  describe('Valid DTO instances', () => {
    it('should validate successfully with required fields only', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE); // Default value
    });

    it('should validate successfully with all fields provided', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US', 'MSFT.US', REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT];
      dto.wsCapabilityType = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;
      dto.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      dto.apiKey = 'test_api_key';
      dto.accessToken = 'test_access_token';
      dto.preferredProvider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(['AAPL.US', 'MSFT.US', REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT]);
      expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE);
      expect(dto.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
      expect(dto.apiKey).toBe('test_api_key');
      expect(dto.accessToken).toBe('test_access_token');
      expect(dto.preferredProvider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
    });

    it('should validate successfully with maximum allowed symbols', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = Array.from({ length: 50 }, (_, i) => `SYMBOL${i.toString().padStart(2, '0')}.US`);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toHaveLength(50);
    });

    it('should validate successfully with different capability types', async () => {
      // Arrange
      const validCapabilityTypes = [
        API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
        'stream-stock-info',
        'stream-market-status',
        'stream-orderbook'
      ];

      for (const capabilityType of validCapabilityTypes) {
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        dto.wsCapabilityType = capabilityType;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.wsCapabilityType).toBe(capabilityType);
      }
    });

    it('should validate successfully with different market symbols', async () => {
      // Arrange
      const marketSymbols = [
        'AAPL.US',           // US stock
        '700.HK',            // HK stock
        '000001.SZ',         // Shenzhen stock
        '600000.SH',         // Shanghai stock
        'BTC-USD',           // Cryptocurrency
        '^HSI',              // Index
      ];

      const dto = new StreamSubscribeDto();
      dto.symbols = marketSymbols;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(marketSymbols);
    });
  });

  describe('symbols validation', () => {
    it('should fail validation when symbols array is empty', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = [];

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints?.arrayMinSize).toBe('至少需要订阅一个符号');
    });

    it('should fail validation when symbols array has more than 50 items', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = Array.from({ length: 51 }, (_, i) => `SYMBOL${i}`);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints?.arrayMaxSize).toBe('单次最多订阅50个符号');
    });

    it('should fail validation when symbols is not an array', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      (dto as any).symbols = 'AAPL.US'; // Invalid: should be array

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints?.isArray).toBeDefined();
    });

    it('should fail validation when symbols array contains non-string values', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      (dto as any).symbols = ['AAPL.US', 123, null, undefined]; // Invalid: non-string values

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when symbols is undefined', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      // symbols is undefined by default

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const symbolsError = errors.find(error => error.property === 'symbols');
      expect(symbolsError).toBeDefined();
    });

    it('should validate successfully with single symbol', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(['AAPL.US']);
    });

    it('should validate successfully with empty strings in symbols (if allowed by business logic)', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US', '', 'MSFT.US']; // Contains empty string

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0); // Empty strings are technically valid strings
      expect(dto.symbols).toContain('');
    });
  });

  describe('wsCapabilityType validation', () => {
    it('should use default value when wsCapabilityType is not provided', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE);
    });

    it('should validate successfully when wsCapabilityType is a valid string', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];
      dto.wsCapabilityType = 'custom-stream-type';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.wsCapabilityType).toBe('custom-stream-type');
    });

    it('should fail validation when wsCapabilityType is not a string', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];
      (dto as any).wsCapabilityType = 123; // Invalid: not a string

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('wsCapabilityType');
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Authentication fields validation', () => {
    describe('token field', () => {
      it('should validate successfully when token is a valid string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        dto.token = 'valid.jwt.token';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.token).toBe('valid.jwt.token');
      });

      it('should validate successfully when token is undefined', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        // token is undefined

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.token).toBeUndefined();
      });

      it('should fail validation when token is not a string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        (dto as any).token = 123; // Invalid: not a string

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('token');
        expect(errors[0].constraints?.isString).toBeDefined();
      });
    });

    describe('apiKey field', () => {
      it('should validate successfully when apiKey is a valid string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        dto.apiKey = 'valid_api_key';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.apiKey).toBe('valid_api_key');
      });

      it('should validate successfully when apiKey is undefined', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        // apiKey is undefined

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.apiKey).toBeUndefined();
      });

      it('should fail validation when apiKey is not a string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        (dto as any).apiKey = {}; // Invalid: not a string

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('apiKey');
        expect(errors[0].constraints?.isString).toBeDefined();
      });
    });

    describe('accessToken field', () => {
      it('should validate successfully when accessToken is a valid string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        dto.accessToken = 'valid_access_token';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.accessToken).toBe('valid_access_token');
      });

      it('should validate successfully when accessToken is undefined', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        // accessToken is undefined

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.accessToken).toBeUndefined();
      });

      it('should fail validation when accessToken is not a string', async () => {
        // Arrange
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        (dto as any).accessToken = []; // Invalid: not a string

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('accessToken');
        expect(errors[0].constraints?.isString).toBeDefined();
      });
    });
  });

  describe('preferredProvider validation', () => {
    it('should validate successfully when preferredProvider is a valid string', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];
      dto.preferredProvider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.preferredProvider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
    });

    it('should validate successfully when preferredProvider is undefined', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];
      // preferredProvider is undefined

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.preferredProvider).toBeUndefined();
    });

    it('should validate successfully with different provider values', async () => {
      // Arrange
      const validProviders = [
        'longport',
        'yahoo',
        'alpha-vantage',
        'custom-provider'
      ];

      for (const provider of validProviders) {
        const dto = new StreamSubscribeDto();
        dto.symbols = ['AAPL.US'];
        dto.preferredProvider = provider;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.preferredProvider).toBe(provider);
      }
    });

    it('should fail validation when preferredProvider is not a string', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US'];
      (dto as any).preferredProvider = 123; // Invalid: not a string

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('preferredProvider');
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Complex validation scenarios', () => {
    it('should handle multiple validation errors', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = []; // Invalid: empty array
      (dto as any).wsCapabilityType = 123; // Invalid: not a string
      (dto as any).token = {}; // Invalid: not a string

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);

      const symbolsError = errors.find(e => e.property === 'symbols');
      const capabilityError = errors.find(e => e.property === 'wsCapabilityType');
      const tokenError = errors.find(e => e.property === 'token');

      expect(symbolsError).toBeDefined();
      expect(capabilityError).toBeDefined();
      expect(tokenError).toBeDefined();
    });

    it('should validate successfully with all authentication methods provided', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['AAPL.US', '700.HK'];
      dto.token = 'jwt.token';
      dto.apiKey = 'api_key';
      dto.accessToken = 'access_token';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.token).toBe('jwt.token');
      expect(dto.apiKey).toBe('api_key');
      expect(dto.accessToken).toBe('access_token');
    });

    it('should validate successfully with realistic WebSocket subscription payload', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = [
        'AAPL.US',
        'MSFT.US',
        'GOOGL.US',
        REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        '000001.SZ'
      ];
      dto.wsCapabilityType = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;
      dto.apiKey = 'sk_live_12345abcdef67890';
      dto.preferredProvider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toHaveLength(5);
      expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE);
      expect(dto.apiKey).toBe('sk_live_12345abcdef67890');
      expect(dto.preferredProvider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
    });

    it('should preserve original object properties after validation', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['TEST.US'];
      dto.wsCapabilityType = 'custom-type';
      dto.token = 'test-token';

      const originalSymbols = [...dto.symbols];
      const originalCapability = dto.wsCapabilityType;
      const originalToken = dto.token;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(originalSymbols);
      expect(dto.wsCapabilityType).toBe(originalCapability);
      expect(dto.token).toBe(originalToken);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle very long symbol names', async () => {
      // Arrange
      const longSymbol = 'A'.repeat(100) + '.US'; // Very long symbol
      const dto = new StreamSubscribeDto();
      dto.symbols = [longSymbol];

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols[0]).toBe(longSymbol);
      expect(dto.symbols[0].length).toBe(103);
    });

    it('should handle special characters in symbols', async () => {
      // Arrange
      const specialSymbols = [
        'BRK.A',
        'BRK-A',
        'TEST@USD',
        'SYMBOL_WITH_UNDERSCORE',
        '000001.SZ'
      ];
      const dto = new StreamSubscribeDto();
      dto.symbols = specialSymbols;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(specialSymbols);
    });

    it('should handle exactly 50 symbols (boundary case)', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = Array.from({ length: 50 }, (_, i) => `SYM${i.toString().padStart(3, '0')}.US`);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toHaveLength(50);
      expect(dto.symbols[0]).toBe('SYM000.US');
      expect(dto.symbols[49]).toBe('SYM049.US');
    });

    it('should handle minimal valid DTO', async () => {
      // Arrange
      const dto = new StreamSubscribeDto();
      dto.symbols = ['A']; // Minimal symbol

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.symbols).toEqual(['A']);
      expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE);
    });
  });
});
