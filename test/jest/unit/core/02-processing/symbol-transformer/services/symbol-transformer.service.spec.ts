import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { SymbolMapperCacheStandardizedService } from '@core/05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { MappingDirection } from '@core/shared/constants/cache.constants';
import { BatchMappingResult } from '@core/05-caching/module/symbol-mapper-cache/interfaces/cache-stats.interface';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { SymbolTransformResult, SymbolTransformForProviderResult } from '@core/02-processing/symbol-transformer/interfaces';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { SYMBOL_TRANSFORMER_ERROR_CODES } from '@core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants';
import { CONFIG } from '@core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants';

describe('SymbolTransformerService', () => {
  let service: SymbolTransformerService;
  let symbolMapperCacheService: jest.Mocked<SymbolMapperCacheStandardizedService>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let marketInferenceService: jest.Mocked<MarketInferenceService>;

  beforeEach(async () => {
    const mockSymbolMapperCacheService = {
      mapSymbols: jest.fn(),
    };

    const mockEventBus = {
      emit: jest.fn(),
    };

    const mockMarketInferenceService = {
      inferMarketLabels: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolTransformerService,
        {
          provide: SymbolMapperCacheStandardizedService,
          useValue: mockSymbolMapperCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: MarketInferenceService,
          useValue: mockMarketInferenceService,
        },
      ],
    }).compile();

    service = module.get<SymbolTransformerService>(SymbolTransformerService);
    symbolMapperCacheService = module.get(SymbolMapperCacheStandardizedService);
    eventBus = module.get(EventEmitter2);
    marketInferenceService = module.get(MarketInferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformSymbols', () => {
    it('should successfully transform symbols array', async () => {
      const mockMappingDetails = {
        'AAPL': 'AAPL.US',
        'GOOGL': 'GOOGL.US',
      };

      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 125.5,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      const result = await service.transformSymbols('longport', ['AAPL', 'GOOGL'], MappingDirection.TO_STANDARD);

      expect(result).toEqual({
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: expect.any(Number),
        },
      });

      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL', 'GOOGL'],
        MappingDirection.TO_STANDARD,
        expect.any(String), // requestId
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'symbol_transformer',
          metricName: 'symbol_transformation_completed',
          tags: expect.objectContaining({
            operation: 'symbol-transformation',
            provider: 'longport',
            totalSymbols: 2,
            successCount: 2,
            failedCount: 0,
          }),
        }),
      );
    });

    it('should handle single symbol string input', async () => {
      const mockMappingDetails = { 'AAPL': 'AAPL.US' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 45.3,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      const result = await service.transformSymbols('longport', 'AAPL', MappingDirection.TO_STANDARD);

      expect(result.mappedSymbols).toEqual(['AAPL.US']);
      expect(result.metadata.totalSymbols).toBe(1);
    });

    it('should handle null/undefined symbols input', async () => {
      await expect(service.transformSymbols('longport', null as any)).rejects.toThrow();
      await expect(service.transformSymbols('longport', undefined as any)).rejects.toThrow();
    });

    it('should handle empty symbols array', async () => {
      await expect(service.transformSymbols('longport', [])).rejects.toThrow();
    });

    it('should handle transformation failures gracefully', async () => {
      const error = new Error('Cache service error');
      symbolMapperCacheService.mapSymbols.mockRejectedValue(error);

      const result = await service.transformSymbols('longport', ['AAPL']);

      expect(result).toEqual({
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: ['AAPL'],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 0,
          failedCount: 1,
          processingTimeMs: expect.any(Number),
        },
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'symbol_transformation_failed',
          tags: expect.objectContaining({
            error_message: 'Cache service error',
          }),
        }),
      );
    });

    it('should handle partial transformation failures', async () => {
      const mockMappingDetails = { 'AAPL': 'AAPL.US' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: ['INVALID'],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 98.7,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      const result = await service.transformSymbols('longport', ['AAPL', 'INVALID']);

      expect(result.mappedSymbols).toEqual(['AAPL.US']);
      expect(result.failedSymbols).toEqual(['INVALID']);
      expect(result.metadata.successCount).toBe(1);
      expect(result.metadata.failedCount).toBe(1);
    });
  });

  describe('transformSingleSymbol', () => {
    it('should transform single symbol successfully', async () => {
      const mockMappingDetails = { 'AAPL': 'AAPL.US' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 67.4,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      const result = await service.transformSingleSymbol('longport', 'AAPL', MappingDirection.TO_STANDARD);

      expect(result).toBe('AAPL.US');
    });

    it('should return original symbol if transformation fails', async () => {
      const mockCacheResult: BatchMappingResult = {
        success: false,
        mappingDetails: {},
        failedSymbols: ['INVALID'],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 89.2,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue([]);

      const result = await service.transformSingleSymbol('longport', 'INVALID');

      expect(result).toBe('INVALID');
    });
  });

  describe('transformSymbolsForProvider', () => {
    it('should transform symbols for provider successfully', async () => {
      const mockMappingDetails = { 'AAPL': 'AAPL.US' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.FROM_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 124.6,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      const result = await service.transformSymbolsForProvider('longport', ['AAPL', '000001'], 'test-request-id');

      expect(result).toEqual({
        transformedSymbols: expect.arrayContaining(['AAPL.US', '000001']),
        mappingResults: {
          transformedSymbols: expect.objectContaining({
            'AAPL': 'AAPL.US',
            '000001': '000001',
          }),
          failedSymbols: [],
          metadata: {
            provider: 'longport',
            totalSymbols: 2,
            successfulTransformations: 2,
            failedTransformations: 0,
            processingTimeMs: expect.any(Number),
          },
        },
      });
    });

    it('should handle mixed format symbols', async () => {
      const mockMappingDetails = { '700.HK': '00700' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.FROM_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 156.3,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      const result = await service.transformSymbolsForProvider('longport', ['700.HK', '000001'], 'test-request-id');

      expect(result.transformedSymbols).toEqual(expect.arrayContaining(['00700', '000001']));
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid provider', async () => {
      await expect(service.transformSymbols('', ['AAPL'])).rejects.toThrow();
      await expect(service.transformSymbols(null as any, ['AAPL'])).rejects.toThrow();
      await expect(service.transformSymbols('   ', ['AAPL'])).rejects.toThrow();
    });

    it('should throw error for invalid direction', async () => {
      await expect(service.transformSymbols('longport', ['AAPL'], 'INVALID' as any)).rejects.toThrow();
    });

    it('should throw error for symbols exceeding batch size limit', async () => {
      const largeSymbolArray = new Array(CONFIG.MAX_BATCH_SIZE + 1).fill('AAPL');

      await expect(service.transformSymbols('longport', largeSymbolArray)).rejects.toThrow();
    });

    it('should throw error for symbols exceeding length limit', async () => {
      const longSymbol = 'A'.repeat(CONFIG.MAX_SYMBOL_LENGTH + 1);

      await expect(service.transformSymbols('longport', [longSymbol])).rejects.toThrow();
    });

    it('should throw error for invalid symbol types', async () => {
      await expect(service.transformSymbols('longport', [null as any])).rejects.toThrow();
      await expect(service.transformSymbols('longport', [123 as any])).rejects.toThrow();
      await expect(service.transformSymbols('longport', [''])).rejects.toThrow();
    });

    it('should validate business exception properties', async () => {
      try {
        await service.transformSymbols('', ['AAPL']);
      } catch (error: any) {
        expect(error.context?.customErrorCode).toBe(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT);
        expect(error.component).toBe(ComponentIdentifier.SYMBOL_TRANSFORMER);
        expect(error.errorCode).toBe(BusinessErrorCode.DATA_VALIDATION_FAILED);
      }
    });
  });

  describe('Market Inference', () => {
    it('should infer CN market correctly', async () => {
      marketInferenceService.inferMarketLabels.mockReturnValue(['CN']);

      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { '000001': '000001' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 43.8,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      await service.transformSymbols('longport', ['000001']);

      expect(marketInferenceService.inferMarketLabels).toHaveBeenCalledWith(['000001'], {
        collapseChina: true,
      });
    });

    it('should handle mixed market types', async () => {
      marketInferenceService.inferMarketLabels.mockReturnValue(['US', 'CN']);

      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'AAPL': 'AAPL.US', '000001': '000001' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 187.5,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      await service.transformSymbols('longport', ['AAPL', '000001']);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            market: 'mixed',
          }),
        }),
      );
    });

    it('should handle unknown market types', async () => {
      marketInferenceService.inferMarketLabels.mockReturnValue([]);

      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'UNKNOWN': 'UNKNOWN' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 234.7,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      await service.transformSymbols('longport', ['UNKNOWN']);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            market: 'unknown',
          }),
        }),
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit monitoring events asynchronously', async () => {
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 78.9,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      await service.transformSymbols('longport', ['AAPL']);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'symbol_transformer',
          metricType: 'business',
          metricName: 'symbol_transformation_completed',
          metricValue: expect.any(Number),
          tags: expect.objectContaining({
            operation: 'symbol-transformation',
            provider: 'longport',
            direction: MappingDirection.TO_STANDARD,
            totalSymbols: 1,
            successCount: 1,
            failedCount: 0,
            successRate: 100,
            market: 'US',
            status: 'success',
          }),
        }),
      );
    });

    it('should emit error events with proper context', async () => {
      const error = new Error('Test error');
      Object.defineProperty(error.constructor, 'name', { value: 'TestError' });

      symbolMapperCacheService.mapSymbols.mockRejectedValue(error);

      await service.transformSymbols('longport', ['AAPL']);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'symbol_transformation_failed',
          tags: expect.objectContaining({
            status: 'error',
            error_message: 'Test error',
            error_type: 'TestError',
          }),
        }),
      );
    });
  });

  describe('Symbol Format Detection', () => {
    beforeEach(() => {
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: {},
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 0,
        cacheHits: 0,
        processingTimeMs: 12.3,
      };
      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue([]);
    });

    it('should identify standard format symbols correctly', async () => {
      const standardSymbols = ['000001', 'AAPL', '700.HK'];

      const result = await service.transformSymbolsForProvider('longport', standardSymbols, 'test-id');

      expect(symbolMapperCacheService.mapSymbols).not.toHaveBeenCalled();
      expect(result.transformedSymbols).toEqual(standardSymbols);
    });

    it('should process non-standard symbols through transformation', async () => {
      const mixedSymbols = ['0700', '700.HK'];

      const result = await service.transformSymbolsForProvider('longport', mixedSymbols, 'test-id');

      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        ['0700'],
        MappingDirection.TO_STANDARD,
        expect.any(String),
      );
      expect(result.transformedSymbols).toContain('700.HK');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty market inference results', async () => {
      marketInferenceService.inferMarketLabels.mockReturnValue([]);

      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 65.4,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);

      await service.transformSymbols('longport', ['AAPL']);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            market: 'unknown',
          }),
        }),
      );
    });

    it('should handle very long processing times', async () => {
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 145.8,
      };

      symbolMapperCacheService.mapSymbols.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockCacheResult), 100))
      );
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      const result = await service.transformSymbols('longport', ['AAPL']);

      expect(result.metadata.processingTimeMs).toBeGreaterThan(90);
    });

    it('should handle default direction parameter', async () => {
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 92.1,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['US']);

      await service.transformSymbols('longport', ['AAPL']);

      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL'],
        MappingDirection.TO_STANDARD,
        expect.any(String),
      );
    });
  });
});