/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import  request from 'supertest';
import { AppModule } from '../../../../../../src/app.module';
import { DataFetcherService } from '../../../../../../src/core/03-fetching/data-fetcher/services/data-fetcher.service';
import { SymbolTransformerService } from '../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { ReceiverService } from '../../../../../../src/core/01-entry/receiver/services/receiver.service';
import { CapabilityRegistryService } from '../../../../../../src/providers/services/capability-registry.service';
import { ICapability } from '../../../../../../src/providers/interfaces/capability.interface';
import { Market } from '../../../../../../src/common/constants/market.constants';

describe('DataFetcher Pipeline E2E', () => {
  let app: INestApplication;
  let dataFetcherService: DataFetcherService;
  let symbolTransformerService: SymbolTransformerService;
  let receiverService: ReceiverService;
  let capabilityRegistryService: CapabilityRegistryService;

  // Mock capability for testing
  const mockCapability: ICapability & { execute: jest.Mock } = {
    name: 'get-stock-quote',
    description: 'E2E Test Stock Quote Capability',
    supportedMarkets: [Market.HK, Market.US],
    supportedSymbolFormats: ['700.HK', 'AAPL.US'],
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    dataFetcherService = moduleFixture.get<DataFetcherService>(DataFetcherService);
    symbolTransformerService = moduleFixture.get<SymbolTransformerService>(SymbolTransformerService);
    receiverService = moduleFixture.get<ReceiverService>(ReceiverService);
    capabilityRegistryService = moduleFixture.get<CapabilityRegistryService>(CapabilityRegistryService);

    await app.init();

    // Register test capability
    capabilityRegistryService.registerCapability('test-provider', mockCapability, 1, true);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Data Pipeline Integration', () => {
    it('should process data request through complete refactored pipeline', async () => {
      // Setup mock data
      const mockQuoteData = {
        success: true,
        data: [
          {
            symbol: '700.HK',
            price: 320.5,
            volume: 1500000,
            change: 2.5,
            changePercent: 0.78,
            timestamp: new Date().toISOString(),
          },
          {
            symbol: '700.HK', // Mapped from 00700
            price: 320.5,
            volume: 1500000,
            change: 2.5,
            changePercent: 0.78,
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          provider: 'test-provider',
          timestamp: new Date().toISOString(),
          latency: 120,
        },
      };

      mockCapability.execute.mockResolvedValue(mockQuoteData);

      // Mock symbol mapper to transform 00700 -> 700.HK
      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '700.HK': '700.HK', '00700': '700.HK' },
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 2,
            successfulTransformations: 2,
            failedTransformations: 0,
            processingTime: 50,
          },
        },
      });

      // Mock provider selection
      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      // Test the complete pipeline through receiver endpoint
      const response = await request(app.getHttpServer())
        .post('/api/v1/receiver/data')
        .send({
          symbols: ['700.HK', '00700'],
          receiverType: 'get-stock-quote',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify the pipeline was executed correctly
      expect(symbolTransformerService.transformSymbolsForProvider).toHaveBeenCalledWith(
        'test-provider',
        ['700.HK', '00700'],
        expect.any(String)
      );
      expect(mockCapability.execute).toHaveBeenCalled();
    }, 10000);

    it('should handle symbol transformation failures in pipeline', async () => {
      // Mock partial failure in symbol transformation
      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '700.HK': '700.HK' },
          failedSymbols: ['INVALID_SYMBOL'],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 2,
            successfulTransformations: 1,
            failedTransformations: 1,
            processingTime: 50,
          },
        },
      });

      mockCapability.execute.mockResolvedValue({
        success: true,
        data: [{ symbol: '700.HK', price: 320.5 }],
      });

      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      const response = await request(app.getHttpServer())
        .post('/api/v1/receiver/data')
        .send({
          symbols: ['700.HK', 'INVALID_SYMBOL'],
          receiverType: 'get-stock-quote',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.warnings).toBeDefined();
      expect(response.body.warnings.some((warning: string) => 
        warning.includes('部分股票代码处理失败')
      )).toBe(true);
    }, 10000);

    it('should handle data fetching errors properly', async () => {
      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '700.HK': '700.HK' },
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 1,
            successfulTransformations: 1,
            failedTransformations: 0,
            processingTime: 50,
          },
        },
      });

      mockCapability.execute.mockRejectedValue(new Error('Provider connection failed'));
      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      const response = await request(app.getHttpServer())
        .post('/api/v1/receiver/data')
        .send({
          symbols: ['700.HK'],
          receiverType: 'get-stock-quote',
        })
        .expect(500);

      expect(response.body.statusCode).toBe(500);
      expect(response.body.message).toContain('数据获取失败');
    }, 10000);
  });

  describe('DataFetcher Service Integration', () => {
    it('should fetch data directly through DataFetcher service', async () => {
      const mockData = {
        success: true,
        data: [{ symbol: '700.HK', price: 320.5 }],
        metadata: { provider: 'test-provider' },
      };

      mockCapability.execute.mockResolvedValue(mockData);

      const result = await dataFetcherService.fetchRawData({
        provider: 'test-provider',
        capability: 'get-stock-quote',
        symbols: ['700.HK'],
        requestId: 'e2e-test-001',
      });

      expect(result.data).toEqual(mockData);
      expect(result.metadata.provider).toBe('test-provider');
      expect(result.metadata.capability).toBe('get-stock-quote');
      expect(result.metadata.symbolsProcessed).toBe(1);
    });

    it('should handle batch data fetching', async () => {
      const mockQuoteData = {
        success: true,
        data: [{ symbol: '700.HK', price: 320.5 }],
      };

      const mockInfoCapability: ICapability & { execute: jest.Mock } = {
        name: 'get-stock-basic-info',
        description: 'Basic info capability',
        supportedMarkets: [Market.US],
        supportedSymbolFormats: ['AAPL.US'],
        execute: jest.fn(),
      };

      const mockInfoData = {
        success: true,
        data: [{ symbol: 'AAPL.US', name: 'Apple Inc.' }],
      };

      capabilityRegistryService.registerCapability('test-provider', mockInfoCapability, 1, true);
      
      mockCapability.execute.mockResolvedValue(mockQuoteData);
      mockInfoCapability.execute.mockResolvedValue(mockInfoData);

      const requests = [
        {
          provider: 'test-provider',
          capability: 'get-stock-quote',
          symbols: ['700.HK'],
          params: {},
          requestId: 'batch-1',
        },
        {
          provider: 'test-provider',
          capability: 'get-stock-basic-info',
          symbols: ['AAPL.US'],
          params: {},
          requestId: 'batch-2',
        },
      ];

      const results = await dataFetcherService.fetchBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].hasPartialFailures).toBe(false);
      expect(results[0].data).toEqual(mockQuoteData);
      expect(results[1].data).toEqual(mockInfoData);
    });
  });

  describe('SymbolMapper Enhanced Integration', () => {
    it('should transform symbols using enhanced transformSymbolsForProvider method', async () => {
      // Setup mock symbol mapping data
      const mockMappingResult = {
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '00700': '700.HK' },
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 2,
            successfulTransformations: 2,
            failedTransformations: 0,
            processingTime: 50,
          },
        },
      };

      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue(mockMappingResult);

      const result = await symbolTransformerService.transformSymbolsForProvider(
        'test-provider',
        ['700.HK', '00700'],
        'test-request-id'
      );

      expect(result.mappingResults.transformedSymbols['00700']).toBe('700.HK');
      expect(result.mappingResults.metadata.provider).toBe('test-provider');
      expect(result.mappingResults.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle mixed symbol formats correctly', async () => {
      const mixedSymbols = ['700.HK', '00700', 'AAPL.US', '600000'];

      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK', '600000.SH', 'AAPL.US'],
        mappingResults: {
          transformedSymbols: {
            '00700': '700.HK',
            '600000': '600000.SH',
          },
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 4,
            successfulTransformations: 4,
            failedTransformations: 0,
            processingTime: 100,
          },
        },
      });

      const result = await symbolTransformerService.transformSymbolsForProvider(
        'test-provider',
        mixedSymbols,
        'test-request-id'
      );

      expect(Object.keys(result.mappingResults.transformedSymbols)).toEqual(['00700', '600000']);
      expect(result.mappingResults.transformedSymbols['00700']).toBe('700.HK');
      expect(result.mappingResults.transformedSymbols['600000']).toBe('600000.SH');
      expect(result.mappingResults.failedSymbols).toEqual([]);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover gracefully from capability registration failures', async () => {
      // Try to use a non-existent capability
      await expect(
        dataFetcherService.fetchRawData({
          provider: 'nonexistent-provider',
          capability: 'nonexistent-capability',
          symbols: ['700.HK'],
          requestId: 'error-test-001',
        })
      ).rejects.toThrow('Capability not found');
    });

    it('should handle network timeout scenarios', async () => {
      mockCapability.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { success: true, data: [] };
      });

      const startTime = Date.now();
      
      try {
        await dataFetcherService.fetchRawData({
          provider: 'test-provider',
          capability: 'get-stock-quote',
          symbols: ['700.HK'],
          options: { timeout: 1000 },
          requestId: 'timeout-test-001',
        });
      } catch {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThan(900); // Should timeout after ~1 second
      }
    });

    it('should maintain data integrity during partial failures', async () => {
      // Mock partial success scenario
      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '700.HK': '700.HK' },
          failedSymbols: ['INVALID'],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 2,
            successfulTransformations: 1,
            failedTransformations: 1,
            processingTime: 50,
          },
        },
      });

      mockCapability.execute.mockResolvedValue({
        success: true,
        data: [{ symbol: '700.HK', price: 320.5 }],
      });

      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      const response = await request(app.getHttpServer())
        .post('/api/v1/receiver/data')
        .send({
          symbols: ['700.HK', 'INVALID'],
          receiverType: 'get-stock-quote',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].symbol).toBe('700.HK');
      expect(response.body.warnings).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume symbol requests efficiently', async () => {
      const largeSymbolSet = Array.from({ length: 50 }, (_, i) => `${700 + i}.HK`);

      mockCapability.execute.mockResolvedValue({
        success: true,
        data: largeSymbolSet.map(symbol => ({ symbol, price: 320.5 })),
      });

      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: largeSymbolSet,
        mappingResults: {
          transformedSymbols: largeSymbolSet.reduce((acc, symbol) => {
            acc[symbol] = symbol;
            return acc;
          }, {} as Record<string, string>),
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 50,
            successfulTransformations: 50,
            failedTransformations: 0,
            processingTime: 200,
          },
        },
      });

      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/receiver/data')
        .send({
          symbols: largeSymbolSet,
          receiverType: 'get-stock-quote',
        })
        .expect(200);

      const processingTime = Date.now() - startTime;

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(50);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);

    it('should maintain consistent performance under concurrent requests', async () => {
      mockCapability.execute.mockResolvedValue({
        success: true,
        data: [{ symbol: '700.HK', price: 320.5 }],
      });

      jest.spyOn(symbolTransformerService, 'transformSymbolsForProvider').mockResolvedValue({
        transformedSymbols: ['700.HK'],
        mappingResults: {
          transformedSymbols: { '700.HK': '700.HK' },
          failedSymbols: [],
          metadata: {
            provider: 'test-provider',
            totalSymbols: 1,
            successfulTransformations: 1,
            failedTransformations: 0,
            processingTime: 50,
          },
        },
      });

      jest.spyOn(receiverService, 'determineOptimalProvider' as any).mockReturnValue('test-provider');

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/receiver/data')
          .send({
            symbols: ['700.HK'],
            receiverType: 'get-stock-quote',
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.statusCode).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    }, 15000);
  });
});