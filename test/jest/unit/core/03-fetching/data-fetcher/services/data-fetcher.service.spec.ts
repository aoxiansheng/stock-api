/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataFetcherService } from '../../../../../../../src/core/03-fetching/data-fetcher/services/data-fetcher.service';
import { CapabilityRegistryService } from '../../../../../../../src/providers/services/capability-registry.service';
import {
  DataFetchParams,
  RawDataResult,
} from '../../../../../../../src/core/03-fetching/data-fetcher/interfaces/data-fetcher.interface';
import {
  DataFetchRequestDto,
  ApiType,
} from '../../../../../../../src/core/03-fetching/data-fetcher/dto/data-fetch-request.dto';

describe('DataFetcherService', () => {
  let service: DataFetcherService;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;

  const mockCapability = {
    name: 'get-stock-quote',
    description: 'Mock capability for testing',
    supportedMarkets: ['US', 'HK'],
    supportedSymbolFormats: ['SYMBOL.MARKET', 'SYMBOL'],
    execute: jest.fn(),
  };

  const mockProvider = {
    getContextService: jest.fn(),
  };

  const mockParams: DataFetchParams = {
    provider: 'longport',
    capability: 'get-stock-quote',
    symbols: ['700.HK', 'AAPL.US'],
    requestId: 'req_123456789',
    apiType: 'rest',
    options: { timeout: 5000 },
    contextService: mockProvider,
  };

  beforeEach(async () => {
    const mockCapabilityRegistryService = {
      getCapability: jest.fn(),
      _getProvider: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFetcherService,
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistryService,
        },
      ],
    }).compile();

    service = module.get<DataFetcherService>(DataFetcherService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRawData', () => {

    const mockRawData = {
      secu_quote: [
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
    };

    it('should successfully fetch raw data', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockRawData);

      // Act
      const result = await service.fetchRawData(mockParams);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(mockRawData.secu_quote);
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.capability).toBe('get-stock-quote');
      expect(result.metadata.symbolsProcessed).toBe(2);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      
      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote'
      );
      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: mockParams.symbols,
        contextService: mockParams.contextService,
        requestId: mockParams.requestId,
        context: {
          apiType: 'rest',
          options: mockParams.options,
        },
        options: mockParams.options,
      });
    });

    it('should handle array format raw data', async () => {
      // Arrange
      const arrayRawData = [
        { symbol: '700.HK', price: 385.6 },
        { symbol: 'AAPL.US', price: 195.18 },
      ];
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(arrayRawData);

      // Act
      const result = await service.fetchRawData(mockParams);

      // Assert
      expect(result.data).toEqual(arrayRawData);
      expect(result.data).toHaveLength(2);
    });

    it('should handle single object raw data', async () => {
      // Arrange
      const singleRawData = { symbol: '700.HK', price: 385.6 };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(singleRawData);

      // Act
      const result = await service.fetchRawData(mockParams);

      // Assert
      expect(result.data).toEqual([singleRawData]);
      expect(result.data).toHaveLength(1);
    });

    it('should handle empty raw data', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(null);

      // Act
      const result = await service.fetchRawData(mockParams);

      // Assert
      expect(result.data).toEqual([]);
    });

    it('should throw NotFoundException when capability not found', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(null);

      // Act & Assert
      await expect(service.fetchRawData(mockParams)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.fetchRawData(mockParams)).rejects.toThrow(
        '提供商 longport 不支持能力 get-stock-quote'
      );
    });

    it('should throw BadRequestException when capability execution fails', async () => {
      // Arrange
      const sdkError = new Error('SDK连接失败');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockRejectedValue(sdkError);

      // Act & Assert
      await expect(service.fetchRawData(mockParams)).rejects.toThrow(
        '数据获取失败: SDK连接失败'
      );
      await expect(service.fetchRawData(mockParams)).rejects.toThrow(
        '数据获取失败: SDK连接失败'
      );
    });

    it('should use default apiType when not provided', async () => {
      // Arrange
      const paramsWithoutApiType = { ...mockParams };
      delete paramsWithoutApiType.apiType;
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockRawData);

      // Act
      await service.fetchRawData(paramsWithoutApiType);

      // Assert
      expect(mockCapability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            apiType: 'rest',
          }),
        })
      );
    });

    it('should log performance warning for slow responses', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockRawData), 2100); // Slower than 2000ms threshold
        });
      });

      // Act
      const result = await service.fetchRawData(mockParams);

      // Assert
      expect(result.metadata.processingTime).toBeGreaterThan(2000);
    });
  });

  describe('supportsCapability', () => {
    it('should return true when capability exists', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);

      // Act
      const result = await service.supportsCapability('longport', 'get-stock-quote');

      // Assert
      expect(result).toBe(true);
      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote'
      );
    });

    it('should return false when capability does not exist', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockReturnValue(null);

      // Act
      const result = await service.supportsCapability('longport', 'invalid-capability');

      // Assert
      expect(result).toBe(false);
      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith(
        'longport',
        'invalid-capability'
      );
    });

    it('should return false when getCapability throws error', async () => {
      // Arrange
      capabilityRegistryService.getCapability.mockImplementation(() => {
        throw new Error('Registry error');
      });

      // Act
      const result = await service.supportsCapability('longport', 'get-stock-quote');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getProviderContext', () => {
    it('should return context service when provider supports it', async () => {
      // Arrange
      const mockContextService = { apiKey: 'test-key' };
      mockProvider.getContextService.mockResolvedValue(mockContextService);
      capabilityRegistryService.getProvider.mockReturnValue(mockProvider);

      // Act
      const result = await service.getProviderContext('longport');

      // Assert
      expect(result).toBe(mockContextService);
      expect(capabilityRegistryService.getProvider).toHaveBeenCalledWith('longport');
      expect(mockProvider.getContextService).toHaveBeenCalled();
    });

    it('should return undefined when provider does not exist', async () => {
      // Arrange
      capabilityRegistryService.getProvider.mockReturnValue(null);

      // Act
      const result = await service.getProviderContext('nonexistent');

      // Assert
      expect(result).toBeUndefined();
      expect(capabilityRegistryService.getProvider).toHaveBeenCalledWith('nonexistent');
    });

    it('should return undefined when provider does not support getContextService', async () => {
      // Arrange
      const providerWithoutContext = {};
      capabilityRegistryService.getProvider.mockReturnValue(providerWithoutContext);

      // Act
      const result = await service.getProviderContext('longport');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when getContextService throws error', async () => {
      // Arrange
      mockProvider.getContextService.mockRejectedValue(new Error('Context service error'));
      capabilityRegistryService.getProvider.mockReturnValue(mockProvider);

      // Act
      const result = await service.getProviderContext('longport');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('fetchBatch', () => {
    const mockRequests: DataFetchRequestDto[] = [
      {
        provider: 'longport',
        capability: 'get-stock-quote',
        symbols: ['700.HK'],
        requestId: 'req_1',
        apiType: ApiType.REST,
        options: {},
      },
      {
        provider: 'longport',
        capability: 'get-stock-quote',
        symbols: ['AAPL.US'],
        requestId: 'req_2',
        apiType: ApiType.REST,
        options: {},
      },
    ];

    it('should successfully process batch requests', async () => {
      // Arrange
      const mockRawData1 = { secu_quote: [{ symbol: '700.HK', price: 385.6 }] };
      const mockRawData2 = { secu_quote: [{ symbol: 'AAPL.US', price: 195.18 }] };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getProvider.mockReturnValue(mockProvider);
      mockProvider.getContextService.mockResolvedValue({ apiKey: 'test' });
      
      mockCapability.execute
        .mockResolvedValueOnce(mockRawData1)
        .mockResolvedValueOnce(mockRawData2);

      // Act
      const results = await service.fetchBatch(mockRequests);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(mockRawData1.secu_quote);
      expect(results[1].data).toEqual(mockRawData2.secu_quote);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].hasPartialFailures).toBe(false);
    });

    it('should handle partial failures in batch requests', async () => {
      // Arrange
      const mockRawData = { secu_quote: [{ symbol: '700.HK', price: 385.6 }] };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getProvider.mockReturnValue(mockProvider);
      mockProvider.getContextService.mockResolvedValue({ apiKey: 'test' });
      
      mockCapability.execute
        .mockResolvedValueOnce(mockRawData)
        .mockRejectedValueOnce(new Error('SDK error for second request'));

      // Act
      const results = await service.fetchBatch(mockRequests);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(mockRawData.secu_quote);
      expect(results[0].hasPartialFailures).toBe(false);
      expect(results[1].data).toEqual([]);
      expect(results[1].hasPartialFailures).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with various formats', async () => {
      // Arrange
      const params = {
        ...mockParams,
        symbols: ['700.HK', 'AAPL', '00001.SZ', '600519.SH'],
      };
      const mockData = { secu_quote: Array(4).fill({ symbol: 'test', price: 100 }) };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockData);

      // Act
      const result = await service.fetchRawData(params);

      // Assert
      expect(result.metadata.symbolsProcessed).toBe(4);
      expect(mockCapability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['700.HK', 'AAPL', '00001.SZ', '600519.SH'],
        })
      );
    });

    it('should handle large symbol lists', async () => {
      // Arrange
      const largeSymbolList = Array.from({ length: 100 }, (_, i) => `STOCK${i}.HK`);
      const params = { ...mockParams, symbols: largeSymbolList };
      const mockData = { secu_quote: Array(100).fill({ symbol: 'test', price: 100 }) };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockData);

      // Act
      const result = await service.fetchRawData(params);

      // Assert
      expect(result.metadata.symbolsProcessed).toBe(100);
      expect(result.data).toHaveLength(100);
    });

    it('should handle empty symbol list', async () => {
      // Arrange
      const params = { ...mockParams, symbols: [] };
      const mockData = { secu_quote: [] };
      
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockData);

      // Act
      const result = await service.fetchRawData(params);

      // Assert
      expect(result.metadata.symbolsProcessed).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
