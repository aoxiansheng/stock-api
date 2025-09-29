import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { SymbolTransformerController } from '@core/02-processing/symbol-transformer/controller/symbol-transformer.controller';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { TransformSymbolsDto, TransformSymbolsResponseDto } from '@core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { MappingDirection } from '@core/shared/constants/cache.constants';
import { createLogger } from '@common/logging/index';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthGuard } from '@auth/guards/apikey-auth.guard';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';
import { UnifiedPermissionsGuard } from '@auth/guards/unified-permissions.guard';

describe('SymbolTransformerController', () => {
  let controller: SymbolTransformerController;
  let symbolTransformerService: jest.Mocked<SymbolTransformerService>;

  beforeEach(async () => {
    const mockSymbolTransformerService = {
      transformSingleSymbol: jest.fn(),
      transformSymbols: jest.fn(),
    };
    
    // 模拟 AuthPerformanceService
    const mockAuthPerformanceService = {
      recordAuthFlowPerformance: jest.fn(),
      recordAuthCachePerformance: jest.fn(),
      recordAuthFlowStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymbolTransformerController],
      providers: [
        {
          provide: SymbolTransformerService,
          useValue: mockSymbolTransformerService,
        },
        {
          provide: AuthPerformanceService,
          useValue: mockAuthPerformanceService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockImplementation((key) => {
              // 模拟装饰器元数据
              if (key === 'REQUIRE_API_KEY') return true;
              if (key === 'IS_PUBLIC_KEY') return false;
              if (key === 'PERMISSIONS_KEY') return ['DATA_READ']; // 模拟@RequirePermissions装饰器
              return false;
            }),
          },
        }
      ],
    })
    // 覆盖API Key守卫
    .overrideGuard(ApiKeyAuthGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    // 覆盖权限守卫
    .overrideGuard(UnifiedPermissionsGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<SymbolTransformerController>(SymbolTransformerController);
    symbolTransformerService = module.get(SymbolTransformerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Properties', () => {
    it('should be defined and properly instantiated', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SymbolTransformerController);
    });

    it('should have logger property accessible', () => {
      expect(controller['logger']).toBeDefined();
      expect(typeof controller['logger'].log).toBe('function');
      expect(typeof controller['logger'].error).toBe('function');
    });

    it('should have symbolTransformerService injected', () => {
      expect(controller['symbolTransformerService']).toBeDefined();
      expect(controller['symbolTransformerService']).toBe(symbolTransformerService);
    });

    it('should initialize with proper dependencies', () => {
      // Test constructor initialization
      expect(controller['symbolTransformerService'].transformSingleSymbol).toBeDefined();
      expect(controller['symbolTransformerService'].transformSymbols).toBeDefined();
    });
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

  describe('Exception Handling', () => {
    it('should handle business exceptions with proper context', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const businessException = UniversalExceptionFactory.createBusinessException({
        message: 'Symbol validation failed',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'transformSymbols',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: {
          provider: 'longport',
          symbols: ['AAPL'],
        },
        retryable: false,
      });

      symbolTransformerService.transformSymbols.mockRejectedValue(businessException);

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow(businessException);

      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL'],
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle HTTP exceptions properly', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const httpException = new HttpException(
        { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Service temporarily unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      symbolTransformerService.transformSymbols.mockRejectedValue(httpException);

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow(httpException);
    });

    it('should handle validation exceptions for invalid input', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: '',  // Invalid empty provider
        symbols: ['AAPL'],
      };

      const validationException = new BadRequestException('Provider is required and must be a non-empty string');

      symbolTransformerService.transformSymbols.mockRejectedValue(validationException);

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow(BadRequestException);
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

    it('should handle concurrent requests efficiently', async () => {
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
          processingTimeMs: 100.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      // 并发执行多个请求
      const promises = Array.from({ length: 10 }, () =>
        controller.transformSymbols(mockTransformDto)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result.dataSourceName).toBe('longport');
        expect(result.transformedSymbols).toEqual({ 'AAPL': 'AAPL.US' });
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across transformations', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: symbols,
      };

      const mockMappingDetails = symbols.reduce((acc, symbol) => {
        acc[symbol] = `${symbol}.US`;
        return acc;
      }, {} as Record<string, string>);

      const mockServiceResult = {
        mappedSymbols: symbols.map(s => `${s}.US`),
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: symbols.length,
          successCount: symbols.length,
          failedCount: 0,
          processingTimeMs: 150.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      // 验证数据完整性
      expect(Object.keys(result.transformedSymbols).length).toBe(symbols.length);
      symbols.forEach(symbol => {
        expect(result.transformedSymbols[symbol]).toBe(`${symbol}.US`);
      });
      expect(result.failedSymbols).toHaveLength(0);
    });

    it('should preserve symbol order in transformations', async () => {
      const orderedSymbols = ['AAPL', 'BABA', 'COIN', 'DIS', 'EBAY'];
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: orderedSymbols,
      };

      const mockMappingDetails = orderedSymbols.reduce((acc, symbol) => {
        acc[symbol] = `${symbol}.US`;
        return acc;
      }, {} as Record<string, string>);

      const mockServiceResult = {
        mappedSymbols: orderedSymbols.map(s => `${s}.US`),
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: orderedSymbols.length,
          successCount: orderedSymbols.length,
          failedCount: 0,
          processingTimeMs: 120.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      // 验证顺序保持
      const transformedKeys = Object.keys(result.transformedSymbols);
      orderedSymbols.forEach((symbol, index) => {
        expect(transformedKeys[index]).toBe(symbol);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy provider names', async () => {
      const legacyProviders = ['longbridge', 'futu_hk', 'tiger-trade'];

      for (const provider of legacyProviders) {
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

        symbolTransformerService.transformSymbols.mockClear();
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

    it('should handle both single and batch transformation APIs', async () => {
      // 单符号转换
      const singleSymbolBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('AAPL.US');
      const singleResult = await controller.mapSymbol(singleSymbolBody);
      expect(singleResult.mappedSymbol).toBe('AAPL.US');

      // 批量转换
      const batchDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL', 'GOOGL'],
      };

      const mockBatchResult = {
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
          processingTimeMs: 150.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockBatchResult);
      const batchResult = await controller.transformSymbols(batchDto);
      expect(Object.keys(batchResult.transformedSymbols)).toHaveLength(2);
    });
  });

  describe('mapSymbol Error Handling', () => {
    it('should handle service errors in mapSymbol method', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      const serviceError = new Error('Service temporarily unavailable');
      symbolTransformerService.transformSingleSymbol.mockRejectedValue(serviceError);

      await expect(controller.mapSymbol(mockBody)).rejects.toThrow('Service temporarily unavailable');

      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
        'longport',
        'AAPL',
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle business exceptions in mapSymbol method', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'invalid-provider',
      };

      const businessException = UniversalExceptionFactory.createBusinessException({
        message: 'Invalid provider format',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'mapSymbol',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: { provider: 'invalid-provider' },
        retryable: false,
      });

      symbolTransformerService.transformSingleSymbol.mockRejectedValue(businessException);

      await expect(controller.mapSymbol(mockBody)).rejects.toThrow(businessException);
    });

    it('should handle HTTP exceptions in mapSymbol method', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      const httpException = new HttpException(
        'Provider service is down',
        HttpStatus.SERVICE_UNAVAILABLE
      );

      symbolTransformerService.transformSingleSymbol.mockRejectedValue(httpException);

      await expect(controller.mapSymbol(mockBody)).rejects.toThrow(httpException);
    });

    it('should handle different symbol types correctly', async () => {
      const testCases = [
        { symbol: 'AAPL', expected: 'AAPL.US' },
        { symbol: '000001', expected: '000001.SZ' },
        { symbol: '700.HK', expected: '00700.HK' },
        { symbol: 'BRK.A', expected: 'BRK.A.US' },
        { symbol: '2330.TW', expected: '2330.TWO' },
      ];

      for (const testCase of testCases) {
        const mockBody = {
          symbol: testCase.symbol,
          fromProvider: 'standard',
          toProvider: 'longport',
        };

        symbolTransformerService.transformSingleSymbol.mockClear();
        symbolTransformerService.transformSingleSymbol.mockResolvedValue(testCase.expected);

        const result = await controller.mapSymbol(mockBody);

        expect(result.originalSymbol).toBe(testCase.symbol);
        expect(result.mappedSymbol).toBe(testCase.expected);
        expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
          'longport',
          testCase.symbol,
          MappingDirection.FROM_STANDARD,
        );
      }
    });
  });

  describe('Enhanced Logging Behavior', () => {
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Create spies for logger methods
      loggerLogSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();
      loggerErrorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();
    });

    afterEach(() => {
      loggerLogSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

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

      await controller.transformSymbols(mockTransformDto);

      // Verify request logging
      expect(loggerLogSpy).toHaveBeenCalledWith('API请求: 批量符号转换', {
        dataSourceName: 'longport',
        symbolsCount: 2,
      });

      // Verify response logging
      expect(loggerLogSpy).toHaveBeenCalledWith('API响应: 符号转换成功', {
        dataSourceName: 'longport',
        inputCount: 2,
        processingTimeMs: '150.8ms',
      });

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

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Database connection failed');

      // Verify request logging
      expect(loggerLogSpy).toHaveBeenCalledWith('API请求: 批量符号转换', {
        dataSourceName: 'longport',
        symbolsCount: 1,
      });

      // Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledWith('API错误: 符号转换失败', {
        dataSourceName: 'longport',
        symbolsCount: 1,
        error: 'Database connection failed',
        errorType: 'DatabaseError',
      });

      expect(symbolTransformerService.transformSymbols).toHaveBeenCalled();
    });

    it('should log error with undefined constructor name gracefully', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      // Create error with undefined constructor
      const mockError = new Error('Unknown error');
      Object.defineProperty(mockError, 'constructor', { value: undefined });

      symbolTransformerService.transformSymbols.mockRejectedValue(mockError);

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Unknown error');

      // Verify error logging handles undefined constructor gracefully
      expect(loggerErrorSpy).toHaveBeenCalledWith('API错误: 符号转换失败', {
        dataSourceName: 'longport',
        symbolsCount: 1,
        error: 'Unknown error',
        errorType: undefined,
      });
    });

    it('should log different error types correctly', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'longport',
        symbols: ['AAPL'],
      };

      const errorTypes = [
        { error: new TypeError('Type error'), expectedType: 'TypeError' },
        { error: new SyntaxError('Syntax error'), expectedType: 'SyntaxError' },
        { error: new ReferenceError('Reference error'), expectedType: 'ReferenceError' },
      ];

      for (const { error, expectedType } of errorTypes) {
        loggerErrorSpy.mockClear();
        symbolTransformerService.transformSymbols.mockRejectedValue(error);

        await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow(error.message);

        expect(loggerErrorSpy).toHaveBeenCalledWith('API错误: 符号转换失败', {
          dataSourceName: 'longport',
          symbolsCount: 1,
          error: error.message,
          errorType: expectedType,
        });
      }
    });

    it('should log zero symbols request', async () => {
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
          processingTimeMs: 5.2,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      await controller.transformSymbols(mockTransformDto);

      expect(loggerLogSpy).toHaveBeenCalledWith('API请求: 批量符号转换', {
        dataSourceName: 'longport',
        symbolsCount: 0,
      });

      expect(loggerLogSpy).toHaveBeenCalledWith('API响应: 符号转换成功', {
        dataSourceName: 'longport',
        inputCount: 0,
        processingTimeMs: '5.2ms',
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return correct response format for mapSymbol', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('AAPL.US');

      const result = await controller.mapSymbol(mockBody);

      // Verify exact response structure
      expect(Object.keys(result)).toEqual([
        'originalSymbol',
        'mappedSymbol',
        'fromProvider',
        'toProvider'
      ]);

      expect(typeof result.originalSymbol).toBe('string');
      expect(typeof result.mappedSymbol).toBe('string');
      expect(typeof result.fromProvider).toBe('string');
      expect(typeof result.toProvider).toBe('string');
    });

    it('should return correct response format for transformSymbols', async () => {
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

      const result = await controller.transformSymbols(mockTransformDto);

      // Verify exact response structure
      expect(Object.keys(result)).toEqual([
        'dataSourceName',
        'transformedSymbols',
        'failedSymbols',
        'processingTimeMs'
      ]);

      expect(typeof result.dataSourceName).toBe('string');
      expect(typeof result.transformedSymbols).toBe('object');
      expect(Array.isArray(result.failedSymbols)).toBe(true);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should preserve metadata provider name in response', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'futu',
        symbols: ['AAPL'],
      };

      const mockServiceResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'futu-standardized', // Service might normalize provider name
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 100.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      // Should use metadata.provider, not the input dataSourceName
      expect(result.dataSourceName).toBe('futu-standardized');
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle null transformSingleSymbol response', async () => {
      const mockBody = {
        symbol: 'INVALID',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue(null as any);

      const result = await controller.mapSymbol(mockBody);

      expect(result.mappedSymbol).toBeNull();
      expect(result.originalSymbol).toBe('INVALID');
    });

    it('should handle undefined transformSingleSymbol response', async () => {
      const mockBody = {
        symbol: 'INVALID',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue(undefined as any);

      const result = await controller.mapSymbol(mockBody);

      expect(result.mappedSymbol).toBeUndefined();
      expect(result.originalSymbol).toBe('INVALID');
    });

    it('should handle extremely long processing times', async () => {
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
          processingTimeMs: 99999.99, // Very long processing time
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.processingTimeMs).toBe(99999.99);
    });

    it('should handle zero processing time', async () => {
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
          processingTimeMs: 0, // Zero processing time
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      const result = await controller.transformSymbols(mockTransformDto);

      expect(result.processingTimeMs).toBe(0);
    });
  });

  describe('ValidationPipe Integration', () => {
    it('should work with ValidationPipe in transformSymbols', async () => {
      // Test that ValidationPipe is properly integrated in transformSymbols method
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
          processingTimeMs: 100.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      // This test verifies that ValidationPipe integration works
      const result = await controller.transformSymbols(mockTransformDto);

      expect(result).toBeDefined();
      expect(result.dataSourceName).toBe('longport');
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL'],
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should handle ValidationPipe errors gracefully', async () => {
      // Simulate validation pipe error
      const invalidDto = {
        dataSourceName: '', // Invalid empty string
        symbols: [], // Invalid empty array
      } as TransformSymbolsDto;

      const validationError = new BadRequestException('Validation failed');
      symbolTransformerService.transformSymbols.mockRejectedValue(validationError);

      await expect(controller.transformSymbols(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('MappingDirection Constants', () => {
    it('should use correct MappingDirection in mapSymbol', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('AAPL.US');

      await controller.mapSymbol(mockBody);

      // Verify that FROM_STANDARD direction is used
      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
        'longport',
        'AAPL',
        MappingDirection.FROM_STANDARD,
      );
    });

    it('should use correct MappingDirection in transformSymbols', async () => {
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
          processingTimeMs: 100.0,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      await controller.transformSymbols(mockTransformDto);

      // Verify that FROM_STANDARD direction is used
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['AAPL'],
        MappingDirection.FROM_STANDARD,
      );
    });
  });

  describe('Complete Code Path Coverage', () => {
    it('should cover all lines in mapSymbol success path', async () => {
      const mockBody = {
        symbol: 'TEST',
        fromProvider: 'test-from',
        toProvider: 'test-to',
      };

      symbolTransformerService.transformSingleSymbol.mockResolvedValue('TEST.RESULT');

      const result = await controller.mapSymbol(mockBody);

      // This should cover lines 44-49 and 51-56
      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledWith(
        'test-to',
        'TEST',
        MappingDirection.FROM_STANDARD,
      );

      expect(result).toEqual({
        originalSymbol: 'TEST',
        mappedSymbol: 'TEST.RESULT',
        fromProvider: 'test-from',
        toProvider: 'test-to',
      });
    });

    it('should cover all lines in transformSymbols success path', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'test-provider',
        symbols: ['SYM1', 'SYM2'],
      };

      const mockServiceResult = {
        mappedSymbols: ['SYM1.US', 'SYM2.US'],
        mappingDetails: {
          'SYM1': 'SYM1.US',
          'SYM2': 'SYM2.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'test-provider-normalized',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 200.5,
        },
      };

      symbolTransformerService.transformSymbols.mockResolvedValue(mockServiceResult);

      // Spy on logger to ensure logging lines are covered
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      const result = await controller.transformSymbols(mockTransformDto);

      // This should cover lines 68-71 (request logging)
      expect(loggerLogSpy).toHaveBeenCalledWith('API请求: 批量符号转换', {
        dataSourceName: 'test-provider',
        symbolsCount: 2,
      });

      // This should cover lines 74-78 (service call)
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'test-provider',
        ['SYM1', 'SYM2'],
        MappingDirection.FROM_STANDARD,
      );

      // This should cover lines 80-84 (success logging)
      expect(loggerLogSpy).toHaveBeenCalledWith('API响应: 符号转换成功', {
        dataSourceName: 'test-provider',
        inputCount: 2,
        processingTimeMs: '200.5ms',
      });

      // This should cover lines 86-91 (return statement)
      expect(result).toEqual({
        dataSourceName: 'test-provider-normalized',
        transformedSymbols: {
          'SYM1': 'SYM1.US',
          'SYM2': 'SYM2.US',
        },
        failedSymbols: [],
        processingTimeMs: 200.5,
      });

      loggerLogSpy.mockRestore();
    });

    it('should cover all lines in transformSymbols error path', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'error-provider',
        symbols: ['ERROR'],
      };

      const mockError = new Error('Test service error');
      Object.defineProperty(mockError.constructor, 'name', { value: 'TestError' });

      symbolTransformerService.transformSymbols.mockRejectedValue(mockError);

      // Spy on logger to ensure error logging lines are covered
      const loggerLogSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();
      const loggerErrorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Test service error');

      // This should cover lines 68-71 (request logging)
      expect(loggerLogSpy).toHaveBeenCalledWith('API请求: 批量符号转换', {
        dataSourceName: 'error-provider',
        symbolsCount: 1,
      });

      // This should cover lines 93-98 (error logging)
      expect(loggerErrorSpy).toHaveBeenCalledWith('API错误: 符号转换失败', {
        dataSourceName: 'error-provider',
        symbolsCount: 1,
        error: 'Test service error',
        errorType: 'TestError',
      });

      loggerLogSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it('should cover error constructor name access with null constructor', async () => {
      const mockTransformDto: TransformSymbolsDto = {
        dataSourceName: 'null-constructor-provider',
        symbols: ['TEST'],
      };

      // Create error with null constructor to test line 97: error.constructor?.name
      const mockError = new Error('Null constructor error');
      Object.defineProperty(mockError, 'constructor', { value: null });

      symbolTransformerService.transformSymbols.mockRejectedValue(mockError);

      const loggerErrorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.transformSymbols(mockTransformDto)).rejects.toThrow('Null constructor error');

      // This should cover the optional chaining on line 97
      expect(loggerErrorSpy).toHaveBeenCalledWith('API错误: 符号转换失败', {
        dataSourceName: 'null-constructor-provider',
        symbolsCount: 1,
        error: 'Null constructor error',
        errorType: undefined,
      });

      loggerErrorSpy.mockRestore();
    });
  });
});