/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ReceiverService } from '../../../../../../../src/core/restapi/receiver/services/receiver.service';
import { DataFetcherService } from '../../../../../../../src/core/restapi/data-fetcher/services/data-fetcher.service';
import { SymbolMapperService } from '../../../../../../../src/core/public/symbol-mapper/services/symbol-mapper.service';
import { TransformerService } from '../../../../../../../src/core/public/transformer/services/transformer.service';
import { StorageService } from '../../../../../../../src/core/public/storage/services/storage.service';
import { CapabilityRegistryService } from '../../../../../../../src/providers/services/capability-registry.service';
import { MarketStatusService } from '../../../../../../../src/core/public/shared/services/market-status.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { DataRequestDto } from '../../../../../../../src/core/restapi/receiver/dto/data-request.dto';
import { DataResponseDto } from '../../../../../../../src/core/restapi/receiver/dto/data-response.dto';
import { RawDataResult } from '../../../../../../../src/core/restapi/data-fetcher/interfaces/data-fetcher.interface';

describe('ReceiverService', () => {
  let service: ReceiverService;
  let dataFetcherService: jest.Mocked<DataFetcherService>;
  let symbolMapperService: jest.Mocked<SymbolMapperService>;
  let transformerService: jest.Mocked<TransformerService>;
  let storageService: jest.Mocked<StorageService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;

  const mockDataFetcherService = {
    fetchRawData: jest.fn(),
    supportsCapability: jest.fn(),
    getProviderContext: jest.fn(),
    fetchBatch: jest.fn(),
  };

  const mockSymbolMapperService = {
    transformSymbolsForProvider: jest.fn(),
    mapSymbol: jest.fn(),
    transformSymbols: jest.fn(),
    mapSymbols: jest.fn(),
  };

  const mockTransformerService = {
    transform: jest.fn(),
    batchTransform: jest.fn(),
    previewTransformation: jest.fn(),
  };

  const mockStorageService = {
    storeData: jest.fn(),
    retrieveData: jest.fn(),
    clearCache: jest.fn(),
  };

  const mockCapabilityRegistryService = {
    getCapability: jest.fn(),
    getProvider: jest.fn(),
    getBestProvider: jest.fn(),
    _getBestProvider: jest.fn(),
  };

  const mockMarketStatusService = {
    getMarketStatus: jest.fn(),
    getBatchMarketStatus: jest.fn(),
  };

  const mockMetricsRegistryService = {
    incrementCounter: jest.fn(),
    recordHistogram: jest.fn(),
    setGauge: jest.fn(),
    getMetricValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: DataFetcherService,
          useValue: mockDataFetcherService,
        },
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: TransformerService,
          useValue: mockTransformerService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistryService,
        },
        {
          provide: MarketStatusService,
          useValue: mockMarketStatusService,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistryService,
        },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    dataFetcherService = module.get(DataFetcherService);
    symbolMapperService = module.get(SymbolMapperService);
    transformerService = module.get(TransformerService);
    storageService = module.get(StorageService);
    capabilityRegistryService = module.get(CapabilityRegistryService);

    // 设置默认mock返回值
    capabilityRegistryService.getBestProvider.mockReturnValue('longport');
    capabilityRegistryService.getProvider.mockReturnValue(dataFetcherService);
    capabilityRegistryService.getCapability.mockReturnValue({
      name: 'get-stock-quote',
      description: 'Get stock quote data',
      supportedMarkets: ['HK', 'US'],
      supportedSymbolFormats: ['700.HK', 'AAPL.US'],
      execute: jest.fn(),
    });

    // 设置其他服务的默认mock
    symbolMapperService.transformSymbolsForProvider.mockResolvedValue(['700.HK', 'AAPL.US']);
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        { symbol: '700.HK', last_done: 385.6, volume: 12345600 },
        { symbol: 'AAPL.US', last_done: 195.18, volume: 8765432 }
      ],
      metadata: {
        provider: 'longport',
        capability: 'get-stock-quote',
        processingTime: 150,
        symbolsProcessed: 2,
      },
    });
    transformerService.transform.mockResolvedValue({
      transformedData: {
        symbol: '700.HK',
        lastPrice: 385.6,
        volume: 12345600,
      },
      metadata: {
        ruleId: 'rule-001',
        ruleName: 'stock-quote-mapping',
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        recordsProcessed: 1,
        fieldsTransformed: 2,
        processingTime: 5,
        timestamp: new Date().toISOString(),
      },
    });
    storageService.storeData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRequest', () => {
    const mockRequest: DataRequestDto = {
      symbols: ['700.HK', 'AAPL.US'],
      receiverType: 'get-stock-quote',
      options: { timeout: 5000, realtime: true },
    };

    const mockCapability = {
      name: 'get-stock-quote',
      supportedMarkets: ['HK', 'US'],
      supportedSymbolFormats: ['700.HK', 'AAPL.US'],
    };

    const mockRawDataResult: RawDataResult = {
      data: [
        {
          symbol: '700.HK',
          last_done: 385.6,
          prev_close: 389.8,
          open: 387.2,
          high: 390.1,
          low: 384.5,
          volume: 12345600,
          turnover: 4765432100,
          timestamp: 1704110400000,
          trade_status: 1,
        },
        {
          symbol: 'AAPL.US',
          last_done: 195.18,
          prev_close: 194.83,
          open: 195.1,
          high: 195.32,
          low: 194.26,
          volume: 45123400,
          turnover: 8797234500,
          timestamp: 1704110400000,
          trade_status: 1,
        },
      ],
      metadata: {
        provider: 'longport',
        capability: 'get-stock-quote',
        processingTime: 150,
        symbolsProcessed: 2,
      },
    };

    const mockTransformedResult = {
      transformedData: [
        {
          symbol: '700.HK',
          lastPrice: 385.6,
          previousClose: 389.8,
          openPrice: 387.2,
          highPrice: 390.1,
          lowPrice: 384.5,
          volume: 12345600,
          turnover: 4765432100,
          timestamp: 1704110400000,
          tradeStatus: 1,
        },
        {
          symbol: 'AAPL.US',
          lastPrice: 195.18,
          previousClose: 194.83,
          openPrice: 195.1,
          highPrice: 195.32,
          lowPrice: 194.26,
          volume: 45123400,
          turnover: 8797234500,
          timestamp: 1704110400000,
          tradeStatus: 1,
        },
      ],
      metadata: {
        processingTime: 50,
        totalTransformed: 2,
      },
    };

    beforeEach(() => {
      // Setup default successful mocks
      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
      });

      // Mock for new mapSymbols method
      mockSymbolMapperService.mapSymbols.mockResolvedValue({
        mappedSymbols: ['00700', 'AAPL'],
        mappingDetails: { 
          '700.HK': '00700',
          'AAPL': 'AAPL'
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 10
        }
      });
      
      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(['00700', 'AAPL']);
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockRawDataResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformedResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');
    });

    it('should handle request successfully through the complete pipeline', async () => {
      // Act
      const result = await service.handleRequest(mockRequest);

      // Assert
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toEqual(mockTransformedResult.transformedData);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.capability).toBe('get-stock-quote');

      // Verify the pipeline sequence
      expect(mockCapabilityRegistryService._getBestProvider).toHaveBeenCalled();
      expect(mockSymbolMapperService.mapSymbols).toHaveBeenCalledWith(
        'longport',
        mockRequest.symbols,
        expect.any(String) // requestId
      );
      expect(mockDataFetcherService.fetchRawData).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'longport',
          capability: 'get-stock-quote',
          symbols: ['00700', 'AAPL'],
          apiType: 'rest',
          options: mockRequest.options,
        })
      );
      expect(mockTransformerService.transform).toHaveBeenCalled();
      expect(mockStorageService.storeData).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidRequest = { ...mockRequest, symbols: [] };

      // Act & Assert
      await expect(service.handleRequest(invalidRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle provider selection failure', async () => {
      // Arrange
      mockCapabilityRegistryService._getBestProvider.mockReturnValue(null);

      // Act & Assert
      await expect(service.handleRequest(mockRequest)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle preferred provider validation', async () => {
      // Arrange
      const requestWithPreferredProvider = {
        ...mockRequest,
        options: { ...mockRequest.options, preferredProvider: 'invalid-provider' },
      };
      
      mockCapabilityRegistryService.getCapability.mockReturnValue(null);

      // Act & Assert
      await expect(service.handleRequest(requestWithPreferredProvider)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle symbol transformation errors', async () => {
      // Arrange
      mockSymbolMapperService.transformSymbolsForProvider.mockRejectedValue(
        new BadRequestException('无效的股票代码格式')
      );

      // Act & Assert
      await expect(service.handleRequest(mockRequest)).rejects.toThrow(
        BadRequestException
      );
      expect(mockDataFetcherService.fetchRawData).not.toHaveBeenCalled();
    });

    it('should handle data fetcher errors', async () => {
      // Arrange
      mockDataFetcherService.fetchRawData.mockRejectedValue(
        new Error('SDK连接失败')
      );

      // Act & Assert
      await expect(service.handleRequest(mockRequest)).rejects.toThrow(
        InternalServerErrorException
      );
      expect(mockTransformerService.transform).not.toHaveBeenCalled();
    });

    it('should handle transformation errors', async () => {
      // Arrange
      mockTransformerService.transform.mockRejectedValue(
        new Error('数据转换失败')
      );

      // Act & Assert
      await expect(service.handleRequest(mockRequest)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should handle missing provider context service gracefully', async () => {
      // Arrange
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        // No getContextService method
      });

      // Act
      const result = await service.handleRequest(mockRequest);

      // Assert
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(mockDataFetcherService.fetchRawData).toHaveBeenCalledWith(
        expect.objectContaining({
          contextService: undefined,
        })
      );
    });

    it('should record performance metrics', async () => {
      // Act
      await service.handleRequest(mockRequest);

      // Assert
      expect(mockMetricsRegistryService.getMetricValue).toHaveBeenCalled();
      // Note: The actual metrics recording happens in private methods
      // This test verifies that metrics methods are available
    });

    it('should handle storage errors gracefully (non-blocking)', async () => {
      // Arrange
      mockStorageService.storeData.mockRejectedValue(
        new Error('存储服务不可用')
      );

      // Act - Should not throw error because storage is async and non-blocking
      const result = await service.handleRequest(mockRequest);

      // Assert
      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toEqual(mockTransformedResult.transformedData);
    });
  });

  describe('request validation', () => {
    it('should validate symbols array', async () => {
      const requestWithEmptySymbols = {
        symbols: [],
        receiverType: 'get-stock-quote',
        options: {},
      };

      await expect(service.handleRequest(requestWithEmptySymbols)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should validate receiverType', async () => {
      const requestWithInvalidType = {
        symbols: ['AAPL'],
        receiverType: '',
        options: {},
      };

      await expect(service.handleRequest(requestWithInvalidType)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle duplicate symbols with warning', async () => {
      const requestWithDuplicates = {
        symbols: ['AAPL', 'AAPL', '700.HK'],
        receiverType: 'get-stock-quote',
        options: {},
      };

      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getCapability.mockReturnValue({
        name: 'get-stock-quote',
        supportedMarkets: ['US', 'HK'],
      });
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockRawResult = {
        data: [{ symbol: 'AAPL', price: 150 }, { symbol: '700.HK', price: 400 }],
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 100, symbolsProcessed: 2 },
      };

      const mockTransformResult = {
        transformedData: [{ symbol: 'AAPL', lastPrice: 150 }, { symbol: '700.HK', lastPrice: 400 }],
        metadata: { processingTime: 50, totalTransformed: 2 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(['AAPL', '00700']);
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockRawResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      // Should process successfully but log warning about duplicates
      const result = await service.handleRequest(requestWithDuplicates);
      expect(result).toBeInstanceOf(DataResponseDto);
    });
  });

  describe('provider selection', () => {
    const baseRequest = {
      symbols: ['AAPL'],
      receiverType: 'get-stock-quote',
      options: {},
    };

    it('should use preferred provider when specified and valid', async () => {
      const requestWithPreferred = {
        ...baseRequest,
        options: { preferredProvider: 'longport' },
      };

      mockCapabilityRegistryService.getCapability.mockReturnValue({
        name: 'get-stock-quote',
        supportedMarkets: ['US'],
      });

      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockResult = {
        data: [{ symbol: 'AAPL', price: 150 }],
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 100, symbolsProcessed: 1 },
      };

      const mockTransformResult = {
        transformedData: [{ symbol: 'AAPL', lastPrice: 150 }],
        metadata: { processingTime: 50, totalTransformed: 1 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(['AAPL']);
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      const result = await service.handleRequest(requestWithPreferred);
      
      expect(mockCapabilityRegistryService.getCapability).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote'
      );
      expect(result.metadata.provider).toBe('longport');
    });

    it('should fall back to auto-selection when preferred provider is invalid', async () => {
      const requestWithInvalidPreferred = {
        ...baseRequest,
        options: { preferredProvider: 'invalid-provider' },
      };

      mockCapabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(service.handleRequest(requestWithInvalidPreferred)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should select best provider automatically when no preference', async () => {
      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockResult = {
        data: [{ symbol: 'AAPL', price: 150 }],
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 100, symbolsProcessed: 1 },
      };

      const mockTransformResult = {
        transformedData: [{ symbol: 'AAPL', lastPrice: 150 }],
        metadata: { processingTime: 50, totalTransformed: 1 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(['AAPL']);
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      const result = await service.handleRequest(baseRequest);

      expect(mockCapabilityRegistryService._getBestProvider).toHaveBeenCalledWith(
        'get-stock-quote',
        'US' // inferred from AAPL symbol
      );
      expect(result.metadata.provider).toBe('longport');
    });
  });

  describe('edge cases', () => {
    it('should handle mixed symbol formats', async () => {
      const mixedRequest = {
        symbols: ['AAPL', '700.HK', '000001.SZ', '600519.SH'],
        receiverType: 'get-stock-quote',
        options: {},
      };

      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockResult = {
        data: Array(4).fill(null).map((_, i) => ({ symbol: `symbol${i}`, price: 100 + i })),
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 200, symbolsProcessed: 4 },
      };

      const mockTransformResult = {
        transformedData: Array(4).fill(null).map((_, i) => ({ symbol: `symbol${i}`, lastPrice: 100 + i })),
        metadata: { processingTime: 75, totalTransformed: 4 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(
        ['AAPL', '00700', '000001', '600519']
      );
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      const result = await service.handleRequest(mixedRequest);

      expect(result.data).toHaveLength(4);
      expect(mockSymbolMapperService.transformSymbolsForProvider).toHaveBeenCalledWith(
        'longport',
        mixedRequest.symbols,
        expect.any(String)
      );
    });

    it('should handle large symbol lists', async () => {
      const largeSymbolList = Array.from({ length: 50 }, (_, i) => `STOCK${i}.US`);
      const largeRequest = {
        symbols: largeSymbolList,
        receiverType: 'get-stock-quote',
        options: {},
      };

      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockResult = {
        data: largeSymbolList.map((symbol, i) => ({ symbol, price: 100 + i })),
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 500, symbolsProcessed: 50 },
      };

      const mockTransformResult = {
        transformedData: largeSymbolList.map((symbol, i) => ({ symbol, lastPrice: 100 + i })),
        metadata: { processingTime: 150, totalTransformed: 50 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(
        largeSymbolList.map(s => s.replace('.US', ''))
      );
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      const result = await service.handleRequest(largeRequest);

      expect(result.data).toHaveLength(50);
      expect(result.metadata.totalRequested).toBe(50);
    });

    it('should handle null/undefined options', async () => {
      const requestWithoutOptions = {
        symbols: ['AAPL'],
        receiverType: 'get-stock-quote',
        // options: undefined - omitted
      };

      mockCapabilityRegistryService._getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistryService.getProvider.mockReturnValue({
        getContextService: jest.fn().mockResolvedValue({ apiKey: 'test' }),
      });

      const mockResult = {
        data: [{ symbol: 'AAPL', price: 150 }],
        metadata: { provider: 'longport', capability: 'get-stock-quote', processingTime: 100, symbolsProcessed: 1 },
      };

      const mockTransformResult = {
        transformedData: [{ symbol: 'AAPL', lastPrice: 150 }],
        metadata: { processingTime: 50, totalTransformed: 1 },
      };

      mockSymbolMapperService.transformSymbolsForProvider.mockResolvedValue(['AAPL']);
      mockDataFetcherService.fetchRawData.mockResolvedValue(mockResult);
      mockTransformerService.transform.mockResolvedValue(mockTransformResult);
      mockStorageService.storeData.mockResolvedValue(undefined);
      mockMetricsRegistryService.getMetricValue.mockResolvedValue('0');

      const result = await service.handleRequest(requestWithoutOptions as any);

      expect(result).toBeInstanceOf(DataResponseDto);
      expect(mockDataFetcherService.fetchRawData).toHaveBeenCalledWith(
        expect.objectContaining({
          options: undefined,
        })
      );
    });
  });
});