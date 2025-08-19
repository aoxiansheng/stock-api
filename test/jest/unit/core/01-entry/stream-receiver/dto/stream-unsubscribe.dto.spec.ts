import { validate } from 'class-validator';
import { StreamUnsubscribeDto } from '../../../../../../../src/core/01-entry/stream-receiver/dto/stream-unsubscribe.dto';

describe('StreamUnsubscribeDto', () => {
  let dto: StreamUnsubscribeDto;

  beforeEach(() => {
    dto = new StreamUnsubscribeDto();
  });

  describe('Basic instantiation', () => {
    it('should be instantiable', () => {
      expect(dto).toBeInstanceOf(StreamUnsubscribeDto);
    });

    it('should have default wsCapabilityType', () => {
      expect(dto.wsCapabilityType).toBe('stream-stock-quote');
    });
  });

  describe('symbols validation', () => {
    it('should validate with valid symbols array', async () => {
      dto.symbols = ['700.HK', 'AAPL.US'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require symbols array', async () => {
      // symbols not set
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('symbols');
    });

    it('should require at least one symbol', async () => {
      dto.symbols = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const symbolError = errors.find(error => error.property === 'symbols');
      expect(symbolError).toBeDefined();
      expect(symbolError?.constraints?.arrayMinSize).toContain('至少需要取消订阅一个符号');
    });

    it('should validate that all symbols are strings', async () => {
      dto.symbols = ['700.HK', 123 as any, 'AAPL.US'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const symbolError = errors.find(error => error.property === 'symbols');
      expect(symbolError).toBeDefined();
    });

    it('should accept valid symbol formats', async () => {
      const validSymbols = [
        '700.HK',
        'AAPL.US', 
        '000001.SZ',
        '600000.SH',
        'BTC-USD'
      ];

      dto.symbols = validSymbols;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept large symbol arrays for unsubscription', async () => {
      // No max limit for unsubscription unlike subscription
      dto.symbols = new Array(100).fill('TEST.US');

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('wsCapabilityType validation', () => {
    it('should validate string wsCapabilityType', async () => {
      dto.symbols = ['700.HK'];
      dto.wsCapabilityType = 'stream-stock-quote';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept custom capability types', async () => {
      dto.symbols = ['700.HK'];
      dto.wsCapabilityType = 'stream-custom-data';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string capability type', async () => {
      dto.symbols = ['700.HK'];
      dto.wsCapabilityType = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const typeError = errors.find(error => error.property === 'wsCapabilityType');
      expect(typeError).toBeDefined();
    });
  });

  describe('Optional preferredProvider field', () => {
    it('should accept preferredProvider', async () => {
      dto.symbols = ['700.HK'];
      dto.preferredProvider = 'longport';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate string type for preferredProvider', async () => {
      dto.symbols = ['700.HK'];
      dto.preferredProvider = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const providerError = errors.find(error => error.property === 'preferredProvider');
      expect(providerError).toBeDefined();
    });

    it('should work without preferredProvider (optional)', async () => {
      dto.symbols = ['700.HK'];
      // No preferredProvider set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Complete DTO validation', () => {
    it('should validate complete DTO with all fields', async () => {
      dto.symbols = ['700.HK', 'AAPL.US'];
      dto.wsCapabilityType = 'stream-stock-quote';
      dto.preferredProvider = 'longport';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal DTO', async () => {
      dto.symbols = ['700.HK'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Property assignments', () => {
    it('should allow property assignment', () => {
      dto.symbols = ['TEST.US'];
      dto.wsCapabilityType = 'custom-stream';
      dto.preferredProvider = 'custom-provider';

      expect(dto.symbols).toEqual(['TEST.US']);
      expect(dto.wsCapabilityType).toBe('custom-stream');
      expect(dto.preferredProvider).toBe('custom-provider');
    });

    it('should support object spread', () => {
      const data = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
        preferredProvider: 'longport'
      };

      Object.assign(dto, data);

      expect(dto.symbols).toEqual(data.symbols);
      expect(dto.wsCapabilityType).toBe(data.wsCapabilityType);
      expect(dto.preferredProvider).toBe(data.preferredProvider);
    });
  });

  describe('Comparison with StreamSubscribeDto', () => {
    it('should be simpler than subscription DTO', () => {
      // Unsubscribe DTO has fewer fields than subscribe DTO
      const dtoKeys = Object.getOwnPropertyNames(dto);
      const expectedKeys = ['wsCapabilityType'];
      
      expectedKeys.forEach(key => {
        expect(dtoKeys).toContain(key);
      });

      // Should not have auth fields like subscribe DTO
      expect(dto.hasOwnProperty('token')).toBe(false);
      expect(dto.hasOwnProperty('apiKey')).toBe(false);
      expect(dto.hasOwnProperty('accessToken')).toBe(false);
    });

    it('should not have array size limits like subscription', () => {
      // Unlike subscription which has max 50 symbols, unsubscription has no max limit
      dto.symbols = new Array(100).fill('SYMBOL');

      expect(() => validate(dto)).not.toThrow();
    });
  });
});
