/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SymbolMapperService } from '../../../../../../../src/core/public/symbol-mapper/services/symbol-mapper.service';
import { SymbolMappingRepository } from '../../../../../../../src/core/public/symbol-mapper/repositories/symbol-mapping.repository';
import { PaginationService } from '../../../../../../../src/common/modules/pagination/services/pagination.service';
import { FeatureFlags } from '../../../../../../../src/common/config/feature-flags.config';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';

// Create a proper mock class for FeatureFlags
class MockFeatureFlags {
  symbolMappingCacheEnabled = true;
  dataTransformCacheEnabled = true;
  batchProcessingEnabled = true;
  objectPoolEnabled = true;
  ruleCompilationEnabled = true;
  dynamicLogLevelEnabled = true;
  metricsLegacyModeEnabled = true;
  symbolCacheMaxSize = 2000;
  symbolCacheTtl = 5 * 60 * 1000;
  ruleCacheMaxSize = 100;
  ruleCacheTtl = 10 * 60 * 1000;
  objectPoolSize = 100;
  batchSizeThreshold = 10;
  batchTimeWindowMs = 1;
}

describe('SymbolMapperService Enhanced Methods', () => {
  let service: SymbolMapperService;
  let repository: jest.Mocked<SymbolMappingRepository>;

  const mockRepository = {
    findByDataSource: jest.fn(),
    findAllMappingsForSymbols: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    delet_eById: jest.fn(),
    exists: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    addSymbolMappingRule: jest.fn(),
    updateSymbolMappingRule: jest.fn(),
    removeSymbolMappingRule: jest.fn(),
    replaceSymbolMappingRule: jest.fn(),
    delet_eByDataSource: jest.fn(),
    getDataSources: jest.fn(),
    getMarkets: jest.fn(),
    getSymbolTypes: jest.fn(),
    watchChanges: jest.fn(),
    getDataSourceVersions: jest.fn(),
  };

  const mockPaginationService = {
    createPaginatedResponseFromQuery: jest.fn(),
    createPaginatedResponse: jest.fn(),
  };

const mockMetricsRegistry = {
    incrementCounter: jest.fn(),
    recordHistogram: jest.fn(),
    setGauge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMapperService,
        {
          provide: SymbolMappingRepository,
          useValue: mockRepository,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: FeatureFlags,
          useValue: new MockFeatureFlags(),
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<SymbolMapperService>(SymbolMapperService);
    repository = module.get(SymbolMappingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformSymbolsForProvider', () => {
    const mockProvider = 'longport';
    const mockRequestId = 'test-request-123';

    it('should transform mixed symbol formats successfully', async () => {
      const inputSymbols = ['700.HK', '00700', 'AAPL.US'];
      const mockTransformResult = {
        dataSourceName: mockProvider,
        transformedSymbols: {
          '00700': '700.HK',
        },
        failedSymbols: [],
      };

      repository.findAllMappingsForSymbols.mockResolvedValue([
        {
          standardSymbol: '00700',
          sdkSymbol: '700.HK',
          isActive: true,
        },
      ]);

      jest.spyOn(service, 'transformSymbols').mockResolvedValue({
        ...mockTransformResult,
        processingTimeMs: 50,
      });

      const result = await service.transformSymbolsForProvider(
        mockProvider,
        inputSymbols,
        mockRequestId
      );

      expect(result.transformedSymbols).toEqual(['700.HK', '700.HK', 'AAPL.US']);
      expect(result.mappingResults.transformedSymbols).toEqual({
        '700.HK': '700.HK', // Already standard
        '00700': '700.HK',  // Transformed
        'AAPL.US': 'AAPL.US', // Already standard
      });
      expect(result.mappingResults.failedSymbols).toEqual([]);
      expect(result.mappingResults.metadata.provider).toBe(mockProvider);
      expect(result.mappingResults.metadata._totalSymbols).toBe(3);
      expect(result.mappingResults.metadata._successfulTransformations).toBe(3);
      expect(result.mappingResults.metadata.hasPartialFailures).toBe(false);
    });

    it('should handle partial transformation failures', async () => {
      const inputSymbols = ['700.HK', 'INVALID_SYMBOL', 'AAPL.US'];
      const mockTransformResult = {
        dataSourceName: mockProvider,
        transformedSymbols: {
          'INVALID_SYMBOL': 'INVALID_SYMBOL',
        },
        failedSymbols: ['INVALID_SYMBOL'],
      };

      repository.findAllMappingsForSymbols.mockResolvedValue([]);
      jest.spyOn(service, 'transformSymbols').mockResolvedValue({
        ...mockTransformResult,
        processingTimeMs: 50,
      });

      const result = await service.transformSymbolsForProvider(
        mockProvider,
        inputSymbols,
        mockRequestId
      );

      expect(result.transformedSymbols).toEqual(['700.HK', 'AAPL.US']);
      expect(result.mappingResults.failedSymbols).toContain('INVALID_SYMBOL');
      expect(result.mappingResults.metadata.hasPartialFailures).toBe(true);
      expect(result.mappingResults.metadata._failedTransformations).toBe(1);
    });

    it('should throw error when all symbols fail transformation', async () => {
      const inputSymbols = ['INVALID1', 'INVALID2'];
      const mockTransformResult = {
        dataSourceName: mockProvider,
        transformedSymbols: {
          'INVALID1': 'INVALID1',
          'INVALID2': 'INVALID2',
        },
        failedSymbols: ['INVALID1', 'INVALID2'],
      };

      repository.findAllMappingsForSymbols.mockResolvedValue([]);
      jest.spyOn(service, 'transformSymbols').mockResolvedValue({
        ...mockTransformResult,
        processingTimeMs: 50,
      });

      await expect(
        service.transformSymbolsForProvider(mockProvider, inputSymbols, mockRequestId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle transformation service errors', async () => {
      const inputSymbols = ['700.HK', '00700'];
      
      jest.spyOn(service, 'transformSymbols').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.transformSymbolsForProvider(mockProvider, inputSymbols, mockRequestId)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should track processing time accurately', async () => {
      const inputSymbols = ['700.HK'];
      const mockTransformResult = {
        dataSourceName: mockProvider,
        transformedSymbols: {},
        failedSymbols: [],
      };

      repository.findAllMappingsForSymbols.mockResolvedValue([]);
      jest.spyOn(service, 'transformSymbols').mockImplementation(async () => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { ...mockTransformResult, processingTimeMs: 50 };
      });

      const result = await service.transformSymbolsForProvider(
        mockProvider,
        inputSymbols,
        mockRequestId
      );

      expect(result.mappingResults.metadata.processingTime).toBeGreaterThan(0);
      expect(typeof result.mappingResults.metadata.processingTime).toBe('number');
    });
  });

  describe('separateSymbolsByFormat', () => {
    it('should separate standard and non-standard symbols correctly', () => {
      const inputSymbols = ['700.HK', '00700', 'AAPL.US', '600000', 'TSLA'];
      
      // Using reflection to access private method for testing
      const result = (service as any).separateSymbolsByFormat(inputSymbols);

      expect(result.standardSymbols).toEqual(['700.HK', 'AAPL.US']);
      expect(result.symbolsToTransform).toEqual(['00700', '600000', 'TSLA']);
    });

    it('should handle all standard symbols', () => {
      const inputSymbols = ['700.HK', 'AAPL.US', '0005.HK'];
      
      const result = (service as any).separateSymbolsByFormat(inputSymbols);

      expect(result.standardSymbols).toEqual(['700.HK', 'AAPL.US', '0005.HK']);
      expect(result.symbolsToTransform).toEqual([]);
    });

    it('should handle all non-standard symbols', () => {
      const inputSymbols = ['00700', '600000', 'AAPL'];
      
      const result = (service as any).separateSymbolsByFormat(inputSymbols);

      expect(result.standardSymbols).toEqual([]);
      expect(result.symbolsToTransform).toEqual(['00700', '600000', 'AAPL']);
    });

    it('should handle empty input', () => {
      const inputSymbols: string[] = [];
      
      const result = (service as any).separateSymbolsByFormat(inputSymbols);

      expect(result.standardSymbols).toEqual([]);
      expect(result.symbolsToTransform).toEqual([]);
    });

    it('should handle edge cases in symbol formats', () => {
      const inputSymbols = ['700.HK.TEST', '00700.', '.AAPL', 'A.B.C'];
      
      const result = (service as any).separateSymbolsByFormat(inputSymbols);

      // All should be considered standard since they contain '.'
      expect(result.standardSymbols).toEqual(['700.HK.TEST', '00700.', '.AAPL', 'A.B.C']);
      expect(result.symbolsToTransform).toEqual([]);
    });
  });

  describe('integration with existing methods', () => {
    it('should work correctly with existing transformSymbols method', async () => {
      const dataSourceName = 'longport';
      const standardSymbols = ['00700', '600000'];

      const mockMapping = [
        { standardSymbol: '00700', sdkSymbol: '700.HK', isActive: true },
        { standardSymbol: '600000', sdkSymbol: '600000.SH', isActive: true },
      ];

      repository.findAllMappingsForSymbols.mockResolvedValue(mockMapping);

      const result = await service.transformSymbols(dataSourceName, standardSymbols);

      expect(result.dataSourceName).toBe(dataSourceName);
      expect(result.transformedSymbols['00700']).toBe('700.HK');
      expect(result.transformedSymbols['600000']).toBe('600000.SH');
      expect(result.failedSymbols).toEqual([]);
    });

    it('should maintain compatibility with existing cache behavior', async () => {
      const provider = 'longport';
      const symbols = ['700.HK', '00700'];
      const requestId = 'cache-test-123';

      // Mock transformSymbols to return expected result
      jest.spyOn(service, 'transformSymbols').mockResolvedValue({
        dataSourceName: provider,
        transformedSymbols: { '00700': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 50,
      });

      // Call the method multiple times to test caching behavior
      const result1 = await service.transformSymbolsForProvider(provider, symbols, requestId);
      const result2 = await service.transformSymbolsForProvider(provider, symbols, requestId);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.transformedSymbols).toEqual(result2.transformedSymbols);
    });

    it('should handle errors from repository operations', async () => {
      const provider = 'longport';
      const symbols = ['00700'];
      const requestId = 'error-test-123';

      jest.spyOn(service, 'transformSymbols').mockRejectedValue(
        new Error('Repository error')
      );

      await expect(
        service.transformSymbolsForProvider(provider, symbols, requestId)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('performance considerations', () => {
    it('should complete processing within reasonable time limits', async () => {
      const provider = 'longport';
      const largeSymbolSet = Array.from({ length: 100 }, (_, i) => `SYM${i}.HK`);
      const requestId = 'perf-test-123';

      jest.spyOn(service, 'transformSymbols').mockResolvedValue({
        dataSourceName: provider,
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 200,
      });

      const startTime = Date.now();
      const result = await service.transformSymbolsForProvider(provider, largeSymbolSet, requestId);
      const totalTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.mappingResults.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle concurrent requests efficiently', async () => {
      const provider = 'longport';
      const symbols = ['700.HK', '00700'];

      jest.spyOn(service, 'transformSymbols').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          dataSourceName: provider,
          transformedSymbols: { '00700': '700.HK' },
          failedSymbols: [],
          processingTimeMs: 50,
        };
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.transformSymbolsForProvider(provider, symbols, `concurrent-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.transformedSymbols).toContain('700.HK');
        expect(result.mappingResults.metadata.provider).toBe(provider);
      });
    });
  });
});