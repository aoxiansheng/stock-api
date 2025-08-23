import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReceiverService } from '../../../../../../../src/core/01-entry/receiver/services/receiver.service';
import { SymbolTransformerService } from '../../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { DataFetcherService } from '../../../../../../../src/core/03-fetching/data-fetcher/services/data-fetcher.service';
import { CapabilityRegistryService } from '../../../../../../../src/providers/services/capability-registry.service';
import { MarketStatusService } from '../../../../../../../src/core/shared/services/market-status.service';
import { DataTransformerService } from '../../../../../../../src/core/02-processing/transformer/services/data-transformer.service';
import { StorageService } from '../../../../../../../src/core/04-storage/storage/services/storage.service';
import { MetricsRegistryService } from '../../../../../../../src/common/infrastructure/monitoring/metrics-registry.service';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service';
import { CacheStrategy } from '../../../../../../../src/core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';
import { StorageType, StorageClassification } from '../../../../../../../src/core/04-storage/storage/enums/storage-type.enum';
import { DataRequestDto } from '../../../../../../../src/core/01-entry/receiver/dto/data-request.dto';
import { DataResponseDto, ResponseMetadataDto } from '../../../../../../../src/core/01-entry/receiver/dto/data-response.dto';

// Mock the external utilities
jest.mock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils', () => ({
  buildCacheOrchestratorRequest: jest.fn(),
  inferMarketFromSymbol: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('ReceiverService', () => {
  let service: ReceiverService;
  let symbolTransformerService: jest.Mocked<SymbolTransformerService>;
  let dataFetcherService: jest.Mocked<DataFetcherService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let dataTransformerService: jest.Mocked<DataTransformerService>;
  let storageService: jest.Mocked<StorageService>;
  let smartCacheOrchestrator: jest.Mocked<SmartCacheOrchestrator>;

  // Mock data
  const mockSymbolMappingResult = {
    mappedSymbols: ['700.HK', 'AAPL'],
    originalSymbols: ['700.HK', 'AAPL'],
    mappingErrors: [],
    metadata: {
      provider: 'longport',
      totalSymbols: 2,
      successfulMappings: 2,
      failedMappings: 0,
    },
  };

  const mockRawData = {
    data: [
      {
        symbol: '700.HK',
        lastPrice: 100.5,
        volume: 1000000,
      },
      {
        symbol: 'AAPL',
        lastPrice: 150.25,
        volume: 2000000,
      },
    ],
    metadata: {
      provider: 'longport',
      capability: 'get-stock-quote',
      processingTime: 500,
      symbolsProcessed: 2,
      failedSymbols: [],
      errors: [],
    },
  };

  const mockTransformedData = {
    transformedData: [
      {
        symbol: '700.HK',
        lastPrice: 100.5,
        volume: 1000000,
        market: 'HK',
      },
      {
        symbol: 'AAPL',
        lastPrice: 150.25,
        volume: 2000000,
        market: 'US',
      },
    ],
    metadata: {
      provider: 'longport',
      rulesApplied: ['quote_fields'],
      transformationTime: 50,
    },
  };

  const mockMarketStatus = {
    [Market.HK]: {
      market: Market.HK,
      status: MarketStatus.TRADING,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Hong_Kong',
      realtimeCacheTTL: 5,
      analyticalCacheTTL: 300,
      isHoliday: false,
      isDST: false,
      confidence: 0.9,
    },
    [Market.US]: {
      market: Market.US,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'America/New_York',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 0.9,
    },
  };

  const mockCacheResult = {
    data: mockTransformedData.transformedData,
    hit: true,
    ttlRemaining: 300,
    strategy: CacheStrategy.STRONG_TIMELINESS,
    storageKey: 'test:cache:key',
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Create all mocks

    const mockSymbolTransformerService = {
      transformSymbols: jest.fn().mockResolvedValue(mockSymbolMappingResult),
    };

    const mockDataFetcherService = {
      fetchRawData: jest.fn().mockResolvedValue(mockRawData),
    };

    const mockCapabilityRegistryService = {
      getBestProvider: jest.fn().mockReturnValue('longport'),
    };

    const mockMarketStatusService = {
      getBatchMarketStatus: jest.fn().mockResolvedValue(mockMarketStatus),
    };

    const mockTransformerService = {
      transform: jest.fn().mockResolvedValue(mockTransformedData),
    };

    const mockStorageService = {
      storeData: jest.fn().mockResolvedValue(true),
    };

    const mockMetricsRegistry = {
      getMetricValue: jest.fn(),
    };

    const mockSmartCacheOrchestrator = {
      getDataWithSmartCache: jest.fn().mockResolvedValue(mockCacheResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: SymbolTransformerService,
          useValue: mockSymbolTransformerService,
        },
        {
          provide: DataFetcherService,
          useValue: mockDataFetcherService,
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
          provide: DataTransformerService,
          useValue: mockTransformerService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
        {
          provide: SmartCacheOrchestrator,
          useValue: mockSmartCacheOrchestrator,
        },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    symbolTransformerService = module.get(SymbolTransformerService);
    dataFetcherService = module.get(DataFetcherService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
    marketStatusService = module.get(MarketStatusService);
    dataTransformerService = module.get(DataTransformerService);
    storageService = module.get(StorageService);
    smartCacheOrchestrator = module.get(SmartCacheOrchestrator);

    // Setup cache request utils mock
    const { buildCacheOrchestratorRequest, inferMarketFromSymbol } = jest.requireMock('../../../../../../../src/core/05-caching/smart-cache/utils/smart-cache-request.utils');
    buildCacheOrchestratorRequest.mockReturnValue({
      cacheKey: 'test:cache:key',
      strategy: CacheStrategy.STRONG_TIMELINESS,
      symbols: ['700.HK', 'AAPL'],
      fetchFn: expect.any(Function),
      metadata: {
        marketStatus: mockMarketStatus,
        provider: 'longport',
        requestId: 'test-uuid-123',
      },
    });
    inferMarketFromSymbol.mockImplementation((symbol: string) => {
      if (symbol.includes('.HK')) return Market.HK;
      if (symbol.includes('.SH')) return Market.SH;
      if (symbol.includes('.SZ')) return Market.SZ;
      return Market.US;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRequest', () => {
    const validRequest: DataRequestDto = {
      symbols: ['700.HK', 'AAPL'],
      receiverType: 'get-stock-quote',
      options: {
        timeout: 5000,
        fields: ['lastPrice', 'volume'],
      },
    };

    it('should handle successful request with cache hit', async () => {
      const result = await service.handleRequest(validRequest);

      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toEqual(mockTransformedData.transformedData);
      expect(result.metadata).toBeInstanceOf(ResponseMetadataDto);
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.capability).toBe('get-stock-quote');
      expect(result.metadata.requestId).toBe('test-uuid-123');
      expect(result.metadata.hasPartialFailures).toBe(false);

      // Verify smart cache orchestrator was called
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheKey: 'test:cache:key',
          strategy: CacheStrategy.STRONG_TIMELINESS,
          symbols: ['700.HK', 'AAPL'],
        })
      );

      // Verify market status service was called
      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith([Market.HK, Market.US]);
    });

    it('should handle successful request with cache miss and execute data flow', async () => {
      const cacheMissResult = {
        ...mockCacheResult,
        hit: false,
        ttlRemaining: 0,
      };
      smartCacheOrchestrator.getDataWithSmartCache.mockResolvedValueOnce(cacheMissResult);

      const result = await service.handleRequest(validRequest);

      expect(result).toBeInstanceOf(DataResponseDto);
      expect(result.data).toEqual(mockTransformedData.transformedData);
      expect(result.metadata.hasPartialFailures).toBe(false);

      // The orchestrator would have called executeOriginalDataFlow internally through fetchFn
      expect(smartCacheOrchestrator.getDataWithSmartCache).toHaveBeenCalled();
    });

    it('should handle provider determination errors', async () => {
      capabilityRegistryService.getBestProvider.mockReturnValueOnce(null);

      await expect(service.handleRequest(validRequest)).rejects.toThrow(NotFoundException);
    });

    it('should handle smart cache orchestrator errors', async () => {
      smartCacheOrchestrator.getDataWithSmartCache.mockRejectedValueOnce(
        new Error('Cache orchestrator error')
      );

      await expect(service.handleRequest(validRequest)).rejects.toThrow('Cache orchestrator error');
    });

    it('should handle market status service errors gracefully', async () => {
      marketStatusService.getBatchMarketStatus.mockRejectedValueOnce(
        new Error('Market status error')
      );

      await expect(service.handleRequest(validRequest)).rejects.toThrow('Market status error');
    });

    it('should use preferred provider when specified', async () => {
      const requestWithPreferredProvider: DataRequestDto = {
        ...validRequest,
        options: {
          preferredProvider: 'longport',
        },
      };

      // Mock the validatePreferredProvider path
      const validatePreferredProviderSpy = jest.spyOn(service as any, 'validatePreferredProvider');
      validatePreferredProviderSpy.mockResolvedValue('longport');

      await service.handleRequest(requestWithPreferredProvider);

      expect(validatePreferredProviderSpy).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote',
        undefined,
        'test-uuid-123'
      );
    });
  });

  describe('executeOriginalDataFlow', () => {
    const request: DataRequestDto = {
      symbols: ['700.HK', 'AAPL'],
      receiverType: 'get-stock-quote',
      options: {
        timeout: 5000,
        fields: ['lastPrice', 'volume'],
      },
    };

    it('should execute complete data flow successfully', async () => {
      // Call the private method via reflection for testing
      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);
      const result = await executeOriginalDataFlow(request, 'test-123');

      expect(result).toEqual(mockTransformedData.transformedData);

      // Verify symbol transformation was called
      expect(symbolTransformerService.transformSymbols).toHaveBeenCalledWith(
        'longport',
        ['700.HK', 'AAPL']
      );

      // Verify data fetcher was called
      expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith({
        provider: 'longport',
        capability: 'get-stock-quote',
        symbols: mockSymbolMappingResult.mappedSymbols,
        requestId: 'test-123',
        apiType: 'rest',
        options: {
          timeout: 5000,
          fields: ['lastPrice', 'volume'],
        },
      });

      // Verify transformer was called
      expect(dataTransformerService.transform).toHaveBeenCalledWith({
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: mockRawData,
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      });

      // Verify storage was called
      expect(storageService.storeData).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'receiver:get-stock-quote:longport:700.HK,AAPL',
          market: 'HK', // First symbol's market
          provider: 'longport',
          storageClassification: StorageClassification.STOCK_QUOTE,
          storageType: StorageType.BOTH,
          data: mockTransformedData.transformedData,
          options: expect.objectContaining({
            cacheTtl: expect.any(Number),
            compress: true,
            tags: expect.objectContaining({
              symbols: '700.HK,AAPL',
              requestId: 'test-123',
              transformedAt: expect.any(String),
            }),
            priority: 'normal',
          }),
        })
      );
    });

    it('should handle symbol mapping errors', async () => {
      symbolTransformerService.transformSymbols.mockRejectedValueOnce(new Error('Symbol mapping failed'));

      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);

      await expect(executeOriginalDataFlow(request, 'test-123')).rejects.toThrow(
        'Symbol mapping failed'
      );
    });

    it('should handle data fetcher errors', async () => {
      dataFetcherService.fetchRawData.mockRejectedValueOnce(new Error('Data fetch failed'));

      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);

      await expect(executeOriginalDataFlow(request, 'test-123')).rejects.toThrow(
        'Data fetch failed'
      );
    });

    it('should handle transformer errors', async () => {
      dataTransformerService.transform.mockRejectedValueOnce(new Error('Transform failed'));

      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);

      await expect(executeOriginalDataFlow(request, 'test-123')).rejects.toThrow(
        'Transform failed'
      );
    });

    it('should handle storage errors', async () => {
      storageService.storeData.mockRejectedValueOnce(new Error('Storage failed'));

      const executeOriginalDataFlow = (service as any).executeOriginalDataFlow.bind(service);

      await expect(executeOriginalDataFlow(request, 'test-123')).rejects.toThrow(
        'Storage failed'
      );
    });
  });

  describe('Mapping Functions', () => {
    it('should map receiverType to transDataRuleListType correctly', () => {
      const mapFunction = (service as any).mapReceiverTypeToTransDataRuleListType.bind(service);

      expect(mapFunction('get-stock-quote')).toBe('quote_fields');
      expect(mapFunction('get-stock-basic-info')).toBe('basic_info_fields');
      expect(mapFunction('get-stock-realtime')).toBe('quote_fields');
      expect(mapFunction('get-stock-history')).toBe('quote_fields');
      expect(mapFunction('get-index-quote')).toBe('index_fields');
      expect(mapFunction('get-market-status')).toBe('market_status_fields');
      expect(mapFunction('unknown-type')).toBe('quote_fields'); // Default
    });

    it('should map receiverType to storageClassification correctly', () => {
      const mapFunction = (service as any).mapReceiverTypeToStorageClassification.bind(service);

      expect(mapFunction('get-stock-quote')).toBe(StorageClassification.STOCK_QUOTE);
      expect(mapFunction('get-stock-basic-info')).toBe(StorageClassification.STOCK_BASIC_INFO);
      expect(mapFunction('get-stock-realtime')).toBe(StorageClassification.STOCK_QUOTE);
      expect(mapFunction('get-stock-history')).toBe(StorageClassification.STOCK_CANDLE);
      expect(mapFunction('get-index-quote')).toBe(StorageClassification.INDEX_QUOTE);
      expect(mapFunction('get-market-status')).toBe(StorageClassification.MARKET_STATUS);
      expect(mapFunction('unknown-type')).toBe(StorageClassification.STOCK_QUOTE); // Default
    });

    it('should extract market from symbols correctly', () => {
      const extractFunction = (service as any).extractMarketFromSymbols.bind(service);

      expect(extractFunction(['700.HK', 'AAPL'])).toBe('HK');
      expect(extractFunction(['AAPL', '700.HK'])).toBe('MIXED'); // No .US suffix, mixed
      expect(extractFunction(['600000.SH'])).toBe('SH');
      expect(extractFunction(['000001.SZ'])).toBe('SZ');
      expect(extractFunction(['000001'])).toBe('SZ'); // Starts with 00
      expect(extractFunction(['600000'])).toBe('SH'); // Starts with 60
      expect(extractFunction([])).toBe('UNKNOWN');
    });

    it('should calculate storage cache TTL correctly', () => {
      const calculateFunction = (service as any).calculateStorageCacheTTL.bind(service);

      expect(calculateFunction(['700.HK', 'AAPL'])).toBe(60); // Default TTL
      expect(calculateFunction(new Array(25).fill('AAPL'))).toBe(120); // Large batch gets longer TTL
      expect(calculateFunction([])).toBe(60); // Empty array gets default TTL
    });
  });

  describe('Request Validation', () => {
    it('should validate request successfully with no issues', async () => {
      const validRequest: DataRequestDto = {
        symbols: ['700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
      };

      const validateFunction = (service as any).performRequestValidation.bind(service);
      const result = await validateFunction(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect duplicate symbols', async () => {
      const requestWithDuplicates: DataRequestDto = {
        symbols: ['700.HK', 'AAPL', '700.HK'],
        receiverType: 'get-stock-quote',
      };

      const validateFunction = (service as any).performRequestValidation.bind(service);
      const result = await validateFunction(requestWithDuplicates);

      expect(result.isValid).toBe(true); // Still valid, just warnings
      expect(result.warnings).toContain(expect.stringContaining('重复'));
    });

    it('should detect symbols with whitespace', async () => {
      const requestWithWhitespace: DataRequestDto = {
        symbols: [' 700.HK ', 'AAPL'],
        receiverType: 'get-stock-quote',
      };

      const validateFunction = (service as any).performRequestValidation.bind(service);
      const result = await validateFunction(requestWithWhitespace);

      expect(result.isValid).toBe(true); // Still valid, just warnings
      expect(result.warnings).toContain(expect.stringContaining('空白'));
    });
  });

  describe('Provider Determination', () => {
    it('should determine optimal provider automatically', async () => {
      const determineFunction = (service as any).determineOptimalProvider.bind(service);
      const result = await determineFunction(
        ['700.HK', 'AAPL'],
        'get-stock-quote',
        undefined,
        undefined,
        'test-123'
      );

      expect(result).toBe('longport');
      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(
        'get-stock-quote',
        'MIXED' // Mixed market inferred from symbols
      );
    });

    it('should use preferred provider when available', async () => {
      const validatePreferredProviderSpy = jest.spyOn(service as any, 'validatePreferredProvider');
      validatePreferredProviderSpy.mockResolvedValue('longport');

      const determineFunction = (service as any).determineOptimalProvider.bind(service);
      const result = await determineFunction(
        ['700.HK'],
        'get-stock-quote',
        'longport',
        'HK',
        'test-123'
      );

      expect(result).toBe('longport');
      expect(validatePreferredProviderSpy).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote',
        'HK',
        'test-123'
      );
    });

    it('should throw error when no provider found', async () => {
      capabilityRegistryService.getBestProvider.mockReturnValueOnce(null);

      const determineFunction = (service as any).determineOptimalProvider.bind(service);

      await expect(
        determineFunction(['UNKNOWN'], 'unsupported-type', undefined, undefined, 'test-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Error Handling', () => {
    // TODO: Add test for internal server error handling
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics on successful requests', async () => {
      const recordMetricsSpy = jest.spyOn(service as any, 'recordPerformanceMetrics');

      const validRequest: DataRequestDto = {
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      };

      await service.handleRequest(validRequest);

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.any(Number), // processingTime
        1, // symbolsCount
        'longport', // provider
        true // success
      );
    });

    it('should record performance metrics on failed requests', async () => {
      const recordMetricsSpy = jest.spyOn(service as any, 'recordPerformanceMetrics');
      smartCacheOrchestrator.getDataWithSmartCache.mockRejectedValueOnce(new Error('Test error'));

      const validRequest: DataRequestDto = {
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      };

      try {
        await service.handleRequest(validRequest);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Expected to fail
      }

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.any(Number), // processingTime
        1, // symbolsCount
        undefined, // provider might be undefined on early failure
        false // success
      );
    });
  });
});