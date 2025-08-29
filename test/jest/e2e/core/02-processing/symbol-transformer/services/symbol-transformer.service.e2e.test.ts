import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SymbolTransformerModule } from '../../../../../../src/core/02-processing/symbol-transformer/module/symbol-transformer.module';
import { SymbolTransformerService } from '../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { SymbolMapperCacheService } from '../../../../../../src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service';
import { CollectorService } from '../../../../../../src/monitoring/collector/collector.service';
import { TRANSFORM_DIRECTIONS } from '../../../../../../src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants';

describe('SymbolTransformerService E2E Test', () => {
  let app: INestApplication;
  let symbolTransformerService: SymbolTransformerService;
  let symbolMapperCacheService: SymbolMapperCacheService;

  beforeAll(async () => {
    const mockCollectorService = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
    };

    const mockSymbolMapperCacheService = {
      mapSymbols: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SymbolTransformerModule],
    })
    .overrideProvider(CollectorService)
    .useValue(mockCollectorService)
    .overrideProvider(SymbolMapperCacheService)
    .useValue(mockSymbolMapperCacheService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    symbolTransformerService = moduleFixture.get<SymbolTransformerService>(SymbolTransformerService);
    symbolMapperCacheService = moduleFixture.get<SymbolMapperCacheService>(SymbolMapperCacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full Workflow E2E Tests', () => {
    it('should perform complete symbol transformation workflow', async () => {
      // Setup mock response from SymbolMapperCacheService
      const mockCacheResponse = {
        success: true,
        mappingDetails: {
          '700.HK': '00700',
          'AAPL.US': 'AAPL',
          '600000.SS': '600000'
        },
        failedSymbols: ['INVALID'],
        provider: 'longport',
        direction: 'to_standard' as const,
        totalProcessed: 4,
        cacheHits: 2,
        processingTime: 25
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResponse);

      // Execute the full transformation workflow
      const result = await symbolTransformerService.transformSymbols(
        'longport',
        ['700.HK', 'AAPL.US', '600000.SS', 'INVALID'],
        TRANSFORM_DIRECTIONS.TO_STANDARD
      );

      // Verify end-to-end result structure
      expect(result).toEqual({
        mappedSymbols: ['00700', 'AAPL', '600000'],
        mappingDetails: {
          '700.HK': '00700',
          'AAPL.US': 'AAPL',
          '600000.SS': '600000'
        },
        failedSymbols: ['INVALID'],
        metadata: {
          provider: 'longport',
          totalSymbols: 4,
          successCount: 3,
          failedCount: 1,
          processingTimeMs: expect.any(Number)
        }
      });

      // Verify cache service integration
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        ['700.HK', 'AAPL.US', '600000.SS', 'INVALID'],
        'to_standard',
        expect.stringMatching(/^transform_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      );
    });

    it('should handle mixed successful and failed transformations', async () => {
      const mockCacheResponse = {
        success: false,
        mappingDetails: {
          '000001.SZ': '000001'  // Only one successful
        },
        failedSymbols: ['UNKNOWN1', 'UNKNOWN2', 'INVALID@SYMBOL'],
        provider: 'longport',
        direction: 'to_standard' as const,
        totalProcessed: 4,
        cacheHits: 0,
        processingTime: 35
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResponse);

      const result = await symbolTransformerService.transformSymbols(
        'longport',
        ['000001.SZ', 'UNKNOWN1', 'UNKNOWN2', 'INVALID@SYMBOL'],
        TRANSFORM_DIRECTIONS.TO_STANDARD
      );

      expect(result.mappedSymbols).toEqual(['000001']);
      expect(result.failedSymbols).toEqual(['UNKNOWN1', 'UNKNOWN2', 'INVALID@SYMBOL']);
      expect(result.metadata.successCount).toBe(1);
      expect(result.metadata.failedCount).toBe(3);
    });

    it('should handle complete transformation failure gracefully', async () => {
      const cacheError = new Error('Downstream service unavailable');
      (symbolMapperCacheService.mapSymbols as jest.Mock).mockRejectedValue(cacheError);

      const result = await symbolTransformerService.transformSymbols(
        'longport',
        ['700.HK', 'AAPL'],
        TRANSFORM_DIRECTIONS.TO_STANDARD
      );

      // Should return structured failure response
      expect(result).toEqual({
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: ['700.HK', 'AAPL'],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 0,
          failedCount: 2,
          processingTimeMs: expect.any(Number)
        }
      });
    });
  });

  describe('Backward Compatibility E2E', () => {
    it('should maintain backward compatibility through mapSymbols method', async () => {
      const mockCacheResponse = {
        success: true,
        mappingDetails: { '700.HK': '00700' },
        failedSymbols: [],
        provider: 'longport',
        direction: 'to_standard' as const,
        totalProcessed: 1,
        cacheHits: 1,
        processingTime: 8
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResponse);

      // Test backward compatible method
      const result = await symbolTransformerService.mapSymbols('longport', ['700.HK']);

      expect(result.mappedSymbols).toEqual(['00700']);
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        ['700.HK'],
        'to_standard',  // Should default to 'to_standard'
        expect.any(String)
      );
    });

    it('should maintain backward compatibility through mapSymbol method', async () => {
      const mockCacheResponse = {
        success: true,
        mappingDetails: { 'TSLA': 'TSLA' },
        failedSymbols: [],
        provider: 'longport',
        direction: 'to_standard' as const,
        totalProcessed: 1,
        cacheHits: 0,
        processingTime: 12
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResponse);

      const result = await symbolTransformerService.mapSymbol('longport', 'TSLA');

      expect(result).toBe('TSLA');
    });
  });

  describe('Performance and Security E2E', () => {
    it('should enforce security validation in end-to-end flow', async () => {
      // Test batch size limit
      const oversizedBatch = new Array(1001).fill('AAPL');

      await expect(
        symbolTransformerService.transformSymbols('longport', oversizedBatch, TRANSFORM_DIRECTIONS.TO_STANDARD)
      ).rejects.toThrow('Batch size exceeds maximum limit');

      // Verify cache service was not called due to validation failure
      expect(symbolMapperCacheService.mapSymbols).not.toHaveBeenCalled();
    });

    it('should enforce symbol length limits', async () => {
      const oversizedSymbol = 'A'.repeat(51); // Over 50 character limit

      await expect(
        symbolTransformerService.transformSymbols('longport', [oversizedSymbol], TRANSFORM_DIRECTIONS.TO_STANDARD)
      ).rejects.toThrow('Symbol length exceeds maximum limit');

      expect(symbolMapperCacheService.mapSymbols).not.toHaveBeenCalled();
    });

    it('should validate provider and direction inputs', async () => {
      // Test empty provider
      await expect(
        symbolTransformerService.transformSymbols('', ['AAPL'], TRANSFORM_DIRECTIONS.TO_STANDARD)
      ).rejects.toThrow('Provider is required');

      // Test invalid direction
      await expect(
        symbolTransformerService.transformSymbols('longport', ['AAPL'], 'invalid' as any)
      ).rejects.toThrow('Invalid direction');

      expect(symbolMapperCacheService.mapSymbols).not.toHaveBeenCalled();
    });
  });

  describe('Architecture Validation E2E', () => {
    it('should demonstrate proper separation of concerns', async () => {
      const mockCacheResponse = {
        success: true,
        mappingDetails: { '700.HK': '00700' },
        failedSymbols: [],
        provider: 'longport',
        direction: 'to_standard' as const,
        totalProcessed: 1,
        cacheHits: 1,
        processingTime: 15
      };

      (symbolMapperCacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResponse);

      await symbolTransformerService.transformSymbols('longport', ['700.HK'], TRANSFORM_DIRECTIONS.TO_STANDARD);

      // Verify SymbolTransformerService (processing layer) delegates to 
      // SymbolMapperCacheService (caching layer) as per architecture
      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledTimes(1);

      // Verify proper request ID generation
      const [,, , requestId] = (symbolMapperCacheService.mapSymbols as jest.Mock).mock.calls[0];
      expect(requestId).toMatch(/^transform_[0-9a-f-]{36}$/);
    });
  });
});
