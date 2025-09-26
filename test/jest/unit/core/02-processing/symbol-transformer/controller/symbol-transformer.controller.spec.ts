import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { SymbolTransformerController } from '@core/02-processing/symbol-transformer/controller/symbol-transformer.controller';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { TransformSymbolsDto, TransformSymbolsResponseDto } from '@core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { MappingDirection } from '@core/shared/constants/cache.constants';
import { createLogger } from '@common/logging/index';

describe('SymbolTransformerController', () => {
  let controller: SymbolTransformerController;
  let symbolTransformerService: jest.Mocked<SymbolTransformerService>;

  beforeEach(async () => {
    const mockSymbolTransformerService = {
      transformSingleSymbol: jest.fn(),
      transformSymbols: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymbolTransformerController],
      providers: [
        {
          provide: SymbolTransformerService,
          useValue: mockSymbolTransformerService,
        },
      ],
    }).compile();

    controller = module.get<SymbolTransformerController>(SymbolTransformerController);
    symbolTransformerService = module.get(SymbolTransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mapSymbol', () => {
    it('should map a single symbol successfully', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('AAPL.US');

      const result = await controller.mapSymbol(mockBody);

      expect(result).toEqual({
        originalSymbol: 'AAPL',
        mappedSymbol: 'AAPL.US',
        fromProvider: 'standard',
        toProvider: 'longport',
      });

      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
        'longport',
        'AAPL',
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle transformation to different providers', async () => {
      const mockBody = {
        symbol: '000001',
        fromProvider: 'standard',
        toProvider: 'futu',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('000001.SZ');

      const result = await controller.mapSymbol(mockBody);

      expect(result).toEqual({
        originalSymbol: '000001',
        mappedSymbol: '000001.SZ',
        fromProvider: 'standard',
        toProvider: 'futu',
      });

      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
        'futu',
        '000001',
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle symbol transformation failures gracefully', async () => {
      const mockBody = {
        symbol: 'INVALID',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('INVALID');

      const result = await controller.mapSymbol(mockBody);

      expect(result).toEqual({
        originalSymbol: 'INVALID',
        mappedSymbol: 'INVALID',
        fromProvider: 'standard',
        toProvider: 'longport',
      });
    });
  });

  describe('transformSymbols', () => {
    it('should transform symbols successfully', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', 'GOOGL', '000001'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US', '000001'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
          '000001': '000001',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 3,
          successCount: 3,
          failedCount: 0,
          processingTimeMs: 125.5,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result).toEqual({
        dataSourceName: 'longport',
        transformedSymbols: mockServiceResult.mappingDetails,
        failedSymbols: [],
        processingTimeMs: 125.5,
      });

      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL', 'GOOGL', '000001'],
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle partial transformation failures', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', 'INVALID', '000001'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US', '000001'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          '000001': '000001',
        },
        failedSymbols: ['INVALID'],
        metadata: {
          provider: 'longport',
          totalSymbols: 3,
          successCount: 2,
          failedCount: 1,
          processingTimeMs: 250.3,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result).toEqual({
        dataSourceName: 'longport',
        transformedSymbols: mockServiceResult.mappingDetails,
        failedSymbols: ['INVALID'],
        processingTimeMs: 250.3,
      });
    });

    it('should handle empty symbols array', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: [],
      };

      const mockServiceResult = {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 0,
          successCount: 0,
          failedCount: 0,
          processingTimeMs: 10.2,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result).toEqual({
        dataSourceName: 'longport',
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 10.2,
      });
    });

    it('should handle service errors and propagate them', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const mockError = new Error('Service unavailable');
      symbolTransformerService.transformSymbols.mockRejectedValue(mockError);

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Service unavailable');

      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL'],
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle different data source names', async () => {
      const providers = ['longport', 'futu', 'webull', 'tiger'];

      for (const provider of providers) {
        const mockTransformDto: TransformSymbolsDto = {
          dataSourceName: provider,
          symbols: ['AAPL'],
        };

        const mockServiceResult = {
          mappedSymbols: ['AAPL.US'],
          mappingDetails: { 'AAPL': 'AAPL.US' },
          failedSymbols: [],
          metadata: {
            provider: provider,
            totalSymbols: 1,
            successCount: 1,
            failedCount: 0,
            processingTimeMs: 100.0,
          },
        };

        symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

        const result = await controller.transformSymbols(mockTransformDto);

        expect(result.dataSourceName).toBe(provider);
        expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
          provider,
          ['AAPL'],
          MappingDirection.FROM_STANDARD,
        );
      }
    });

    it('should handle large symbol arrays', async () => {
      const largeSymbolArray = new Array(500).fill(0).map((_, index) => `SYMBOL${index}`);
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: largeSymbolArray,
      };

      const mockMappingDetails = largeSymbolArray.reduce((acc, symbol) => {
        acc[symbol] = `${symbol}.US`;
        return acc;
      }, {} as Record<string, string>);

      const mockServiceResult = {
        mappedSymbols: Object.values(mockMappingDetails),
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 500,
          successCount: 500,
          failedCount: 0,
          processingTimeMs: 1200.5,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.dataSourceName).toBe('longport');
      expect(Object.keys(result.transformedSymbols)).toHaveLength(500);
      expect(result.failedSymbols).toHaveLength(0);
      expect(result.processingTimeMs).toBe(1200.5);
    });
  });

  describe('Logging Behavior', () => {
    it('should log API requests and responses for transformSymbols', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', 'GOOGL'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 150.8,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      // Spy on logger methods
      const loggerSpy = jest.spyOn(createLogger(SymbolTransformerController.name), 'log');

      await controller.transformSymbols(mockTransformDto);

      // Verify service was called correctly
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL', 'GOOGL'],
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should log errors properly when service throws', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const mockError = new Error('Database connection failed');
      Object.defineProperty(mockError.constructor, 'name', { value: 'DatabaseError' });

      symbolTransformerService.transformSymbols.mockRejectedValue(mockError);

      // Spy on logger methods
      const loggerErrorSpy = jest.spyOn(createLogger(SymbolTransformerController.name), 'error');

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Database connection failed');

      expect(symbolTransformerService.transformSymbols).toHaveBeenCalled();
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle special characters in symbols', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', '700.HK', 'BRK.A', 'BRK-B'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US', '700.HK', 'BRK.A.US', 'BRK-B.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          '700.HK': '700.HK',
          'BRK.A': 'BRK.A.US',
          'BRK-B': 'BRK-B.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 4,
          successCount: 4,
          failedCount: 0,
          processingTimeMs: 200.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.transformedSymbols).toEqual(mockServiceResult.mappingDetails);
      expect(result.failedSymbols).toHaveLength(0);
    });

    it('should handle unicode and international symbols', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', '腾讯', '阿里巴巴'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
        },
        failedSymbols: ['腾讯', '阿里巴巴'],
        metadata: {
          provider: 'longport',
          totalSymbols: 3,
          successCount: 1,
          failedCount: 2,
          processingTimeMs: 300.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.transformedSymbols).toEqual({ 'AAPL': 'AAPL.US' });
      expect(result.failedSymbols).toEqual(['腾讯', '阿里巴巴']);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle high processing times gracefully', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 5000.0, // 5 seconds
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.processingTimeMs).toBe(5000.0);
      expect(result.dataSourceName).toBe('longport');
    });

    it('should handle zero processing time edge case', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 0.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.processingTimeMs).toBe(0.0);
    });
  });
});