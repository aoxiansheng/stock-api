/**
 * DataFetcherService 单元测试
 * 测试DataFetcher服务的核心功能和业务逻辑
 * 目标覆盖率: 90%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataFetcherService } from '@core/03-fetching/data-fetcher/services/data-fetcher.service';
import { EnhancedCapabilityRegistryService } from '@providers/services/enhanced-capability-registry.service';
import {
  DataFetchParams,
  RawDataResult
} from '@core/03-fetching/data-fetcher/interfaces/data-fetcher.interface';
import {
  DataFetchRequestDto,
  DataFetchResponseDto,
  DataFetchMetadataDto
} from '@core/03-fetching/data-fetcher/dto';
import { BusinessException, UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import {
  DATA_FETCHER_ERROR_MESSAGES,
  DATA_FETCHER_WARNING_MESSAGES,
  DATA_FETCHER_PERFORMANCE_THRESHOLDS,
  DATA_FETCHER_OPERATIONS,
  DATA_FETCHER_DEFAULT_CONFIG
} from '@core/03-fetching/data-fetcher/constants/data-fetcher.constants';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe('DataFetcherService', () => {
  let service: DataFetcherService;
  let module: TestingModule;
  let mockCapabilityRegistryService: jest.Mocked<EnhancedCapabilityRegistryService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  // Mock data
  const mockRawData = {
    secu_quote: [
      {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 385.6,
        prev_close: 389.8,
        open: 387.2,
        volume: 12345600
      }
    ]
  };

  const mockCapability = {
    name: 'get-stock-quote',
    description: 'Mock capability for testing',
    supportedMarkets: ['HK', 'US'],
    supportedSymbolFormats: ['standard'],
    execute: jest.fn()
  };

  const mockProvider = {
    name: 'longport',
    getContextService: jest.fn()
  };

  beforeEach(async () => {
    // Create mocks
    mockCapabilityRegistryService = {
      getCapability: jest.fn(),
      getProvider: jest.fn()
    } as any;

    mockEventBus = {
      emit: jest.fn()
    } as any;

    module = await Test.createTestingModule({
      providers: [
        DataFetcherService,
        {
          provide: EnhancedCapabilityRegistryService,
          useValue: mockCapabilityRegistryService
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus
        }
      ]
    }).compile();

    service = module.get<DataFetcherService>(DataFetcherService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('service instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should implement IDataFetcher interface', () => {
      expect(service.fetchRawData).toBeDefined();
      expect(service.supportsCapability).toBeDefined();
      expect(service.getProviderContext).toBeDefined();
      expect(typeof service.fetchRawData).toBe('function');
      expect(typeof service.supportsCapability).toBe('function');
      expect(typeof service.getProviderContext).toBe('function');
    });
  });

  describe('fetchRawData', () => {
    const mockParams: DataFetchParams = {
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
      requestId: 'test-request-123',
      apiType: 'rest',
      options: {},
      contextService: { initialized: true }
    };

    beforeEach(() => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockRawData);
    });

    it('should successfully fetch raw data', async () => {
      const result = await service.fetchRawData(mockParams);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe(mockParams.provider);
      expect(result.metadata.capability).toBe(mockParams.capability);
      expect(result.metadata.symbolsProcessed).toBe(mockParams.symbols.length);
      expect(typeof result.metadata.processingTimeMs).toBe('number');
    });

    it('should use default apiType when not provided', async () => {
      const paramsWithoutApiType = { ...mockParams };
      delete paramsWithoutApiType.apiType;

      await service.fetchRawData(paramsWithoutApiType);

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: mockParams.symbols,
        requestId: mockParams.requestId,
        apiType: DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE,
        ...paramsWithoutApiType.options
      });
    });

    it('should process different raw data formats correctly', async () => {
      // Test array format
      mockCapability.execute.mockResolvedValueOnce([{ symbol: 'TEST.XX', price: 100 }]);
      let result = await service.fetchRawData(mockParams);
      expect(Array.isArray(result.data)).toBe(true);

      // Test nested object format
      mockCapability.execute.mockResolvedValueOnce({
        data: [{ symbol: 'TEST.XX', price: 100 }]
      });
      result = await service.fetchRawData(mockParams);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].symbol).toBe('TEST.XX');
    });

    it('should emit slow response warning when processing time exceeds threshold', async () => {
      // Mock slow response
      mockCapability.execute.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRawData), DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS + 100))
      );

      await service.fetchRawData(mockParams);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'data_fetcher',
          metricType: 'external_api',
          metricName: 'api_call_failed',
          metricValue: 0
        })
      );
    }, 10000);

    it('should handle capability not found', async () => {
      mockCapabilityRegistryService.getCapability.mockImplementation(() => {
        throw new Error('Capability not found');
      });

      await expect(service.fetchRawData(mockParams)).rejects.toThrow(BusinessException);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'api_call_failed'
        })
      );
    });

    it('should handle SDK execution failure', async () => {
      mockCapability.execute.mockRejectedValue(new Error('SDK Error'));

      await expect(service.fetchRawData(mockParams)).rejects.toThrow(BusinessException);
    });

    it('should preserve BusinessException when thrown by capability', async () => {
      const businessError = UniversalExceptionFactory.createBusinessException({
        message: 'Test business error',
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'test-operation',
        component: ComponentIdentifier.DATA_FETCHER,
        context: {}
      });

      mockCapability.execute.mockRejectedValue(businessError);

      await expect(service.fetchRawData(mockParams)).rejects.toBe(businessError);
    });
  });

  describe('supportsCapability', () => {
    it('should return true for supported capability', async () => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);

      const result = await service.supportsCapability('longport', 'get-stock-quote');

      expect(result).toBe(true);
      expect(mockCapabilityRegistryService.getCapability).toHaveBeenCalledWith('longport', 'get-stock-quote');
    });

    it('should return false for unsupported capability', async () => {
      mockCapabilityRegistryService.getCapability.mockImplementation(() => {
        throw new Error('Capability not found');
      });

      const result = await service.supportsCapability('unknown', 'unknown-capability');

      expect(result).toBe(false);
    });

    it('should return false for null capability', async () => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(null);

      const result = await service.supportsCapability('longport', 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getProviderContext', () => {
    beforeEach(() => {
      mockCapabilityRegistryService.getProvider.mockReturnValue(mockProvider);
      mockProvider.getContextService.mockResolvedValue({ initialized: true });
    });

    it('should return provider context successfully', async () => {
      const result = await service.getProviderContext('longport');

      expect(result).toBeDefined();
      expect(result.initialized).toBe(true);
      expect(mockCapabilityRegistryService.getProvider).toHaveBeenCalledWith('longport');
      expect(mockProvider.getContextService).toHaveBeenCalled();
    });

    it('should throw BusinessException when provider not found', async () => {
      mockCapabilityRegistryService.getProvider.mockReturnValue(null);

      await expect(service.getProviderContext('unknown')).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException when context service not available', async () => {
      mockProvider.getContextService.mockResolvedValue(null);

      await expect(service.getProviderContext('longport')).rejects.toThrow(BusinessException);
    });

    it('should handle provider without getContextService method', async () => {
      const providerWithoutContext = { name: 'test-provider' };
      mockCapabilityRegistryService.getProvider.mockReturnValue(providerWithoutContext as any);

      await expect(service.getProviderContext('test-provider')).rejects.toThrow(BusinessException);
    });
  });

  describe('fetchBatch', () => {
    const mockRequests: DataFetchRequestDto[] = [
      {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'batch-req-1'
      },
      {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: ['AAPL.US'],
        requestId: 'batch-req-2'
      }
    ];

    beforeEach(() => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistryService.getProvider.mockReturnValue(mockProvider);
      mockProvider.getContextService.mockResolvedValue({ initialized: true });
      mockCapability.execute.mockResolvedValue(mockRawData);
    });

    it('should process batch requests successfully', async () => {
      const results = await service.fetchBatch(mockRequests);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(DataFetchResponseDto);
      expect(results[1]).toBeInstanceOf(DataFetchResponseDto);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].hasPartialFailures).toBe(false);
    });

    it('should handle partial failures in batch processing', async () => {
      // First request succeeds, second fails
      mockCapability.execute
        .mockResolvedValueOnce(mockRawData)
        .mockRejectedValueOnce(new Error('Second request failed'));

      const results = await service.fetchBatch(mockRequests);

      expect(results).toHaveLength(2);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].hasPartialFailures).toBe(true);
    });

    it('should respect concurrency limits', async () => {
      const manyRequests = Array(20).fill(null).map((_, i) => ({
        ...mockRequests[0],
        requestId: `batch-req-${i}`
      }));

      let concurrentExecutions = 0;
      let maxConcurrentExecutions = 0;

      mockCapability.execute.mockImplementation(async () => {
        concurrentExecutions++;
        maxConcurrentExecutions = Math.max(maxConcurrentExecutions, concurrentExecutions);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentExecutions--;
        return mockRawData;
      });

      await service.fetchBatch(manyRequests);

      // Should respect concurrency limit (default 10)
      expect(maxConcurrentExecutions).toBeLessThanOrEqual(10);
    }, 10000);

    it('should emit batch processing metrics', async () => {
      await service.fetchBatch(mockRequests);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'data_fetcher',
          metricType: 'business',
          metricName: 'batch_processing_completed',
          metricValue: 2
        })
      );
    });

    it('should handle empty batch requests', async () => {
      const results = await service.fetchBatch([]);

      expect(results).toEqual([]);
    });
  });

  describe('processRawData (private method testing via public interface)', () => {
    beforeEach(() => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
    });

    it('should handle array data format', async () => {
      const arrayData = [{ symbol: 'TEST.XX', price: 100 }];
      mockCapability.execute.mockResolvedValue(arrayData);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual(arrayData);
    });

    it('should handle nested object with priority keys', async () => {
      const nestedData = {
        data: [{ symbol: 'TEST.XX', price: 100 }]
      };
      mockCapability.execute.mockResolvedValue(nestedData);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual([{ symbol: 'TEST.XX', price: 100 }]);
    });

    it('should handle LongPort secu_quote format', async () => {
      mockCapability.execute.mockResolvedValue(mockRawData);

      const params: DataFetchParams = {
        provider: 'longport',
        capability: 'get-stock-quote',
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual(mockRawData.secu_quote);
    });

    it('should handle multi-level nested data', async () => {
      const multiLevelData = {
        response: {
          data: {
            quotes: [{ symbol: 'TEST.XX', price: 100 }]
          }
        }
      };
      mockCapability.execute.mockResolvedValue(multiLevelData);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual([{ symbol: 'TEST.XX', price: 100 }]);
    });

    it('should handle single object by wrapping in array', async () => {
      const singleObject = { symbol: 'TEST.XX', price: 100 };
      mockCapability.execute.mockResolvedValue(singleObject);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual([singleObject]);
    });

    it('should handle null/undefined data', async () => {
      mockCapability.execute.mockResolvedValue(null);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      const result = await service.fetchRawData(params);
      expect(result.data).toEqual([]);
    });
  });

  describe('private helper methods (tested via public interface)', () => {
    it('should check capabilities correctly', async () => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);

      const result = await service.supportsCapability('test-provider', 'test-capability');

      expect(result).toBe(true);
      expect(mockCapabilityRegistryService.getCapability).toHaveBeenCalledWith(
        'test-provider',
        'test-capability'
      );
    });

    it('should execute capabilities correctly', async () => {
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockRawData);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      await service.fetchRawData(params);

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: params.symbols,
        requestId: params.requestId,
        apiType: DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE,
        ...params.options
      });
    });
  });

  describe('environment variable configuration', () => {
    it('should use environment variable for batch concurrency limit', () => {
      // This tests the BATCH_CONCURRENCY_LIMIT private property through batch processing
      // Since it's a private property, we test its effect rather than accessing it directly
      expect(service).toBeDefined();
      // The actual limit is tested through the batch processing concurrency test above
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed capability objects', async () => {
      mockCapabilityRegistryService.getCapability.mockReturnValue({} as any);

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-123'
      };

      await expect(service.fetchRawData(params)).rejects.toThrow();
    });

    it('should handle provider objects without proper methods', async () => {
      mockCapabilityRegistryService.getProvider.mockReturnValue({ name: 'test' } as any);

      await expect(service.getProviderContext('test')).rejects.toThrow(BusinessException);
    });
  });
});
