import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  TtlComputeParamsDto,
  TtlComputeResultDto
} from '@core/05-caching/module/basic-cache/dto/ttl-compute-params.dto';

describe('TtlComputeParamsDto', () => {
  describe('TtlComputeParamsDto', () => {
    describe('Basic Properties', () => {
      it('should create instance with required properties', () => {
        const dto = new TtlComputeParamsDto();
        dto.baseTtl = 300;
        dto.marketStatus = 'market';
        dto.freshness = 'real_time';

        expect(dto).toBeInstanceOf(TtlComputeParamsDto);
        expect(dto.baseTtl).toBe(300);
        expect(dto.marketStatus).toBe('market');
        expect(dto.freshness).toBe('real_time');
      });

      it('should accept all optional properties', () => {
        const dto = new TtlComputeParamsDto();
        dto.baseTtl = 600;
        dto.marketStatus = 'pre_market';
        dto.freshness = 'delayed';
        dto.market = 'NYSE';
        dto.symbols = ['AAPL', 'GOOGL', 'MSFT'];
        dto.provider = 'longport';

        expect(dto.market).toBe('NYSE');
        expect(dto.symbols).toEqual(['AAPL', 'GOOGL', 'MSFT']);
        expect(dto.provider).toBe('longport');
      });
    });

    describe('baseTtl Validation', () => {
      it('should validate with valid TTL values', async () => {
        const validTtls = [30, 300, 3600, 86400];

        for (const ttl of validTtls) {
          const dto = plainToClass(TtlComputeParamsDto, {
            baseTtl: ttl,
            marketStatus: 'market',
            freshness: 'real_time'
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should validate with minimum TTL (30)', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 30,
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with maximum TTL (86400)', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 86400,
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation with TTL below minimum (30)', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 29,
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'baseTtl')).toBe(true);
      });

      it('should fail validation with TTL above maximum (86400)', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 86401,
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'baseTtl')).toBe(true);
      });

      it('should fail validation with missing baseTtl', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'baseTtl')).toBe(true);
      });

      it('should fail validation with non-number baseTtl', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 'invalid',
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'baseTtl')).toBe(true);
      });
    });

    describe('marketStatus Validation', () => {
      it('should validate with all valid market statuses', async () => {
        const validStatuses = ['pre_market', 'market', 'after_market', 'closed'];

        for (const status of validStatuses) {
          const dto = plainToClass(TtlComputeParamsDto, {
            baseTtl: 300,
            marketStatus: status,
            freshness: 'real_time'
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should fail validation with invalid market status', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'invalid_status',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'marketStatus')).toBe(true);
      });

      it('should fail validation with missing marketStatus', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'marketStatus')).toBe(true);
      });

      it('should fail validation with numeric market status', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 1,
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'marketStatus')).toBe(true);
      });
    });

    describe('freshness Validation', () => {
      it('should validate with all valid freshness levels', async () => {
        const validFreshness = ['real_time', 'near_real_time', 'delayed'];

        for (const freshness of validFreshness) {
          const dto = plainToClass(TtlComputeParamsDto, {
            baseTtl: 300,
            marketStatus: 'market',
            freshness
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should fail validation with invalid freshness', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'instant'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'freshness')).toBe(true);
      });

      it('should fail validation with missing freshness', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'freshness')).toBe(true);
      });
    });

    describe('Optional Properties Validation', () => {
      it('should validate with valid market string', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          market: 'NYSE'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with valid symbols array', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA']
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with empty symbols array', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: []
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate with valid provider', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          provider: 'longport'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation with non-string market', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          market: 123
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'market')).toBe(true);
      });

      it('should fail validation with non-array symbols', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: 'AAPL,GOOGL'
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'symbols')).toBe(true);
      });

      it('should fail validation with non-string symbols elements', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: ['AAPL', 123, 'GOOGL']
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'symbols')).toBe(true);
      });

      it('should fail validation with non-string provider', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          provider: 456
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'provider')).toBe(true);
      });
    });

    describe('Real-world Scenarios', () => {
      it('should handle real-time trading scenario', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 30,
          marketStatus: 'market',
          freshness: 'real_time',
          market: 'NYSE',
          symbols: ['AAPL', 'GOOGL', 'MSFT'],
          provider: 'longport'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle pre-market scenario', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'pre_market',
          freshness: 'near_real_time',
          market: 'NASDAQ',
          symbols: ['TSLA', 'NVDA'],
          provider: 'alpha_vantage'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle after-market scenario', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 600,
          marketStatus: 'after_market',
          freshness: 'delayed',
          market: 'NYSE',
          symbols: ['IBM', 'KO']
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle market closed scenario', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 86400,
          marketStatus: 'closed',
          freshness: 'delayed',
          market: 'HKEX',
          symbols: ['700.HK', '941.HK'],
          provider: 'longport'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle minimal required data', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle international markets', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 1800,
          marketStatus: 'market',
          freshness: 'near_real_time',
          market: 'LSE',
          symbols: ['BARC.L', 'LLOY.L', 'VOD.L'],
          provider: 'yahoo_finance'
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty symbols array', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: []
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle large symbols array', async () => {
        const symbols = Array.from({ length: 100 }, (_, i) => `STOCK${i}`);
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle special characters in symbols', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          symbols: ['BRK.A', 'BRK.B', '700.HK', '3690.HK']
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle empty market string', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          market: ''
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Empty string is valid
      });

      it('should handle empty provider string', async () => {
        const dto = plainToClass(TtlComputeParamsDto, {
          baseTtl: 300,
          marketStatus: 'market',
          freshness: 'real_time',
          provider: ''
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Empty string is valid
      });
    });

    describe('Serialization', () => {
      it('should serialize and deserialize correctly', () => {
        const dto = new TtlComputeParamsDto();
        dto.baseTtl = 1800;
        dto.marketStatus = 'pre_market';
        dto.freshness = 'near_real_time';
        dto.market = 'NYSE';
        dto.symbols = ['AAPL', 'GOOGL'];
        dto.provider = 'longport';

        const json = JSON.stringify(dto);
        const parsed = JSON.parse(json);

        expect(parsed.baseTtl).toBe(1800);
        expect(parsed.marketStatus).toBe('pre_market');
        expect(parsed.freshness).toBe('near_real_time');
        expect(parsed.market).toBe('NYSE');
        expect(parsed.symbols).toEqual(['AAPL', 'GOOGL']);
        expect(parsed.provider).toBe('longport');
      });

      it('should serialize undefined optional properties correctly', () => {
        const dto = new TtlComputeParamsDto();
        dto.baseTtl = 300;
        dto.marketStatus = 'market';
        dto.freshness = 'real_time';

        const json = JSON.stringify(dto);
        const parsed = JSON.parse(json);

        expect(parsed.baseTtl).toBe(300);
        expect(parsed.marketStatus).toBe('market');
        expect(parsed.freshness).toBe('real_time');
        expect('market' in parsed).toBe(false);
        expect('symbols' in parsed).toBe(false);
        expect('provider' in parsed).toBe(false);
      });
    });

    describe('Business Logic Integration', () => {
      it('should support different TTL strategies based on market status', async () => {
        const scenarios = [
          { marketStatus: 'pre_market', baseTtl: 600, freshness: 'near_real_time' },
          { marketStatus: 'market', baseTtl: 30, freshness: 'real_time' },
          { marketStatus: 'after_market', baseTtl: 300, freshness: 'delayed' },
          { marketStatus: 'closed', baseTtl: 86400, freshness: 'delayed' }
        ];

        for (const scenario of scenarios) {
          const dto = plainToClass(TtlComputeParamsDto, scenario);
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should support provider-specific configurations', async () => {
        const providers = ['longport', 'alpha_vantage', 'yahoo_finance', 'iex_cloud'];

        for (const provider of providers) {
          const dto = plainToClass(TtlComputeParamsDto, {
            baseTtl: 300,
            marketStatus: 'market',
            freshness: 'real_time',
            provider
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });
    });
  });

  describe('TtlComputeResultDto', () => {
    describe('Basic Properties', () => {
      it('should create instance with required properties', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 300;
        dto.reason = 'Market is open, using real-time TTL';
        dto.isDynamic = true;

        expect(dto).toBeInstanceOf(TtlComputeResultDto);
        expect(dto.ttl).toBe(300);
        expect(dto.reason).toBe('Market is open, using real-time TTL');
        expect(dto.isDynamic).toBe(true);
      });

      it('should accept all optional properties', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 600;
        dto.reason = 'Market closed, using extended TTL';
        dto.isDynamic = false;
        dto.marketFactor = 1.5;
        dto.freshnessFactor = 0.8;
        dto.computedAt = Date.now();

        expect(dto.marketFactor).toBe(1.5);
        expect(dto.freshnessFactor).toBe(0.8);
        expect(dto.computedAt).toBeGreaterThan(0);
      });
    });

    describe('Real-world Results', () => {
      it('should represent real-time market computation', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 30;
        dto.reason = 'Market open, real-time freshness required';
        dto.isDynamic = true;
        dto.marketFactor = 0.5; // Reduce TTL during market hours
        dto.freshnessFactor = 0.3; // Further reduce for real-time
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(30);
        expect(dto.isDynamic).toBe(true);
        expect(dto.marketFactor).toBeLessThan(1);
        expect(dto.freshnessFactor).toBeLessThan(1);
      });

      it('should represent market closed computation', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 86400;
        dto.reason = 'Market closed, extended caching allowed';
        dto.isDynamic = true;
        dto.marketFactor = 3.0; // Increase TTL when market closed
        dto.freshnessFactor = 1.0; // No freshness penalty
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(86400);
        expect(dto.marketFactor).toBeGreaterThan(1);
        expect(dto.freshnessFactor).toBe(1.0);
      });

      it('should represent static computation', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 300;
        dto.reason = 'Using default static TTL configuration';
        dto.isDynamic = false;

        expect(dto.isDynamic).toBe(false);
        expect(dto.marketFactor).toBeUndefined();
        expect(dto.freshnessFactor).toBeUndefined();
      });

      it('should represent pre-market computation', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 180;
        dto.reason = 'Pre-market hours, moderate caching';
        dto.isDynamic = true;
        dto.marketFactor = 0.8; // Slightly reduced TTL
        dto.freshnessFactor = 0.6; // Near real-time requirement
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(180);
        expect(dto.marketFactor).toBe(0.8);
        expect(dto.freshnessFactor).toBe(0.6);
      });

      it('should represent delayed data computation', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 1800;
        dto.reason = 'Delayed data, extended caching allowed';
        dto.isDynamic = true;
        dto.marketFactor = 1.0; // No market impact
        dto.freshnessFactor = 2.0; // Increase TTL for delayed data
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(1800);
        expect(dto.marketFactor).toBe(1.0);
        expect(dto.freshnessFactor).toBeGreaterThan(1);
      });
    });

    describe('Computation Scenarios', () => {
      it('should handle high-frequency trading scenario', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 5;
        dto.reason = 'High-frequency trading requires minimal caching';
        dto.isDynamic = true;
        dto.marketFactor = 0.1;
        dto.freshnessFactor = 0.1;
        dto.computedAt = Date.now();

        expect(dto.ttl).toBeLessThan(30);
        expect(dto.marketFactor).toBeLessThan(0.5);
        expect(dto.freshnessFactor).toBeLessThan(0.5);
      });

      it('should handle historical data scenario', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 86400;
        dto.reason = 'Historical data, maximum caching appropriate';
        dto.isDynamic = false;
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(86400);
        expect(dto.isDynamic).toBe(false);
      });

      it('should handle provider-specific adjustments', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 150;
        dto.reason = 'Provider rate limits require increased TTL';
        dto.isDynamic = true;
        dto.marketFactor = 1.0;
        dto.freshnessFactor = 0.5;
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(150);
        expect(dto.reason).toContain('rate limits');
      });
    });

    describe('Serialization', () => {
      it('should serialize and deserialize correctly', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 600;
        dto.reason = 'Dynamic computation based on market status';
        dto.isDynamic = true;
        dto.marketFactor = 1.2;
        dto.freshnessFactor = 0.8;
        dto.computedAt = 1640995200000;

        const json = JSON.stringify(dto);
        const parsed = JSON.parse(json);

        expect(parsed.ttl).toBe(600);
        expect(parsed.reason).toBe('Dynamic computation based on market status');
        expect(parsed.isDynamic).toBe(true);
        expect(parsed.marketFactor).toBe(1.2);
        expect(parsed.freshnessFactor).toBe(0.8);
        expect(parsed.computedAt).toBe(1640995200000);
      });

      it('should serialize undefined optional properties correctly', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 300;
        dto.reason = 'Static TTL configuration';
        dto.isDynamic = false;

        const json = JSON.stringify(dto);
        const parsed = JSON.parse(json);

        expect(parsed.ttl).toBe(300);
        expect(parsed.reason).toBe('Static TTL configuration');
        expect(parsed.isDynamic).toBe(false);
        expect('marketFactor' in parsed).toBe(false);
        expect('freshnessFactor' in parsed).toBe(false);
        expect('computedAt' in parsed).toBe(false);
      });
    });

    describe('Validation Tests', () => {
      it('should pass validation without explicit validators', async () => {
        // TtlComputeResultDto doesn't have validation decorators
        const dto = new TtlComputeResultDto();
        dto.ttl = 300;
        dto.reason = 'Test reason';
        dto.isDynamic = true;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle all data types correctly', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 300;
        dto.reason = 'String reason';
        dto.isDynamic = true;
        dto.marketFactor = 1.5;
        dto.freshnessFactor = 0.8;
        dto.computedAt = Date.now();

        expect(typeof dto.ttl).toBe('number');
        expect(typeof dto.reason).toBe('string');
        expect(typeof dto.isDynamic).toBe('boolean');
        expect(typeof dto.marketFactor).toBe('number');
        expect(typeof dto.freshnessFactor).toBe('number');
        expect(typeof dto.computedAt).toBe('number');
      });
    });

    describe('Business Logic Examples', () => {
      it('should demonstrate factor calculations', () => {
        const baseTtl = 300;
        const marketFactor = 0.5; // Market open reduces TTL
        const freshnessFactor = 0.3; // Real-time further reduces TTL

        const dto = new TtlComputeResultDto();
        dto.ttl = Math.round(baseTtl * marketFactor * freshnessFactor);
        dto.reason = `Computed: ${baseTtl} * ${marketFactor} * ${freshnessFactor}`;
        dto.isDynamic = true;
        dto.marketFactor = marketFactor;
        dto.freshnessFactor = freshnessFactor;
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(45); // 300 * 0.5 * 0.3 = 45
        expect(dto.reason).toContain('Computed:');
      });

      it('should demonstrate weekend/holiday adjustment', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 172800; // 48 hours for weekend
        dto.reason = 'Weekend detected, using extended TTL';
        dto.isDynamic = true;
        dto.marketFactor = 4.0; // Significant increase for weekend
        dto.freshnessFactor = 1.0; // No freshness requirement
        dto.computedAt = Date.now();

        expect(dto.ttl).toBe(172800);
        expect(dto.marketFactor).toBe(4.0);
        expect(dto.reason).toContain('Weekend');
      });

      it('should demonstrate volatile stock adjustment', () => {
        const dto = new TtlComputeResultDto();
        dto.ttl = 15;
        dto.reason = 'High volatility stock, minimal caching';
        dto.isDynamic = true;
        dto.marketFactor = 0.5; // Market open
        dto.freshnessFactor = 0.1; // Extremely fresh data needed
        dto.computedAt = Date.now();

        expect(dto.ttl).toBeLessThan(30);
        expect(dto.freshnessFactor).toBeLessThan(0.2);
        expect(dto.reason).toContain('volatility');
      });
    });
  });

  describe('DTO Integration', () => {
    it('should work together in TTL computation workflow', () => {
      // Input parameters
      const params = new TtlComputeParamsDto();
      params.baseTtl = 300;
      params.marketStatus = 'market';
      params.freshness = 'real_time';
      params.market = 'NYSE';
      params.symbols = ['AAPL'];
      params.provider = 'longport';

      // Computation result
      const result = new TtlComputeResultDto();
      result.ttl = 45; // Computed from params
      result.reason = `Market ${params.marketStatus}, freshness ${params.freshness}`;
      result.isDynamic = true;
      result.marketFactor = 0.5;
      result.freshnessFactor = 0.3;
      result.computedAt = Date.now();

      expect(result.ttl).toBeLessThan(params.baseTtl);
      expect(result.reason).toContain(params.marketStatus);
      expect(result.reason).toContain(params.freshness);
    });

    it('should handle complex multi-symbol computation', () => {
      const params = new TtlComputeParamsDto();
      params.baseTtl = 600;
      params.marketStatus = 'after_market';
      params.freshness = 'delayed';
      params.symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

      const result = new TtlComputeResultDto();
      result.ttl = 1800; // Increased for after-market delayed data
      result.reason = `After-market hours with ${params.symbols.length} symbols, delayed freshness`;
      result.isDynamic = true;
      result.marketFactor = 1.5; // Increase for after-market
      result.freshnessFactor = 2.0; // Increase for delayed
      result.computedAt = Date.now();

      expect(result.ttl).toBeGreaterThan(params.baseTtl);
      expect(result.reason).toContain('4 symbols');
      expect(result.marketFactor).toBeGreaterThan(1);
      expect(result.freshnessFactor).toBeGreaterThan(1);
    });
  });
});
