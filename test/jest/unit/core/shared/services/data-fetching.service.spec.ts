import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataFetchingService, DataFetchRequest, DataFetchResponse } from '../../../../../../src/core/shared/services/data-fetching.service';
import { CapabilityRegistryService } from '../../../../../../src/providers/capability-registry.service';
import { MarketStatusService } from '../../../../../../src/core/shared/services/market-status.service';
import { DataChangeDetectorService } from '../../../../../../src/core/shared/services/data-change-detector.service';
import { Market } from '../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../src/common/constants/market-trading-hours.constants';
import { createLogger } from '../../../../../../src/common/config/logger.config';

// Mock the logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('DataFetchingService', () => {
  let service: DataFetchingService;
  let mockCapabilityRegistry: jest.Mocked<CapabilityRegistryService>;
  let mockMarketStatusService: jest.Mocked<MarketStatusService>;
  let mockDataChangeDetector: jest.Mocked<DataChangeDetectorService>;

  const mockCapability = {
    name: 'get-stock-quote',
    description: 'Get stock quote',
    supportedMarkets: ['US'],
    supportedSymbolFormats: ['ticker'],
    execute: jest.fn(),
    providerName: 'longport',
  };

  const mockProvider = {
    name: 'longport',
    getContextService: jest.fn(() => ({ key: 'context-service' })),
  };

  const mockMarketStatusResponse = {
    market: Market.US,
    status: MarketStatus.TRADING,
    currentTime: new Date(),
    marketTime: new Date(),
    timezone: 'America/New_York',
    realtimeCacheTTL: 1,
    analyticalCacheTTL: 60,
    currentSession: { start: '09:30', end: '16:00', name: 'Normal Trading' },
    nextSession: undefined,
    nextSessionStart: undefined,
    isHoliday: false,
    isDST: false,
    confidence: 1,
    nextChange: new Date(),
    lastUpdate: new Date(),
  };

  beforeEach(async () => {
    (createLogger as jest.Mock).mockReturnValue(mockLogger);
    mockMarketStatusService = {
      getMarketStatus: jest.fn(),
      getBatchMarketStatus: jest.fn(),
      getRecommendedCacheTTL: jest.fn(),
    } as unknown as jest.Mocked<MarketStatusService>;

    mockCapabilityRegistry = {
      discoverCapabilities: jest.fn(),
      registerCapability: jest.fn(),
      getCapability: jest.fn(),
      getCapabilitiesByType: jest.fn(),
      getBestProvider: jest.fn(),
      getAllCapabilities: jest.fn(),
      getProvider: jest.fn(),
      isProviderRegistered: jest.fn(),
      onModuleInit: jest.fn(),
      registerProvider: jest.fn(),
      getAllProviders: jest.fn(),
    } as unknown as jest.Mocked<CapabilityRegistryService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFetchingService,
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: CapabilityRegistryService, useValue: mockCapabilityRegistry },
        {
          provide: DataChangeDetectorService,
          useValue: {
            detectChanges: jest.fn(),
            getChangeScore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataFetchingService>(DataFetchingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSingleData', () => {
    const basicRequest: DataFetchRequest = {
      symbol: 'AAPL.US',
      dataType: 'stock-quote',
      market: Market.US,
      mode: 'REALTIME',
    };

    it('should fetch single stock data successfully', async () => {
      const mockData = { symbol: 'AAPL.US', price: 150.75, volume: 1000000 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([mockData]);

      const result = await service.fetchSingleData(basicRequest);

      expect(result).toEqual({
        data: mockData,
        metadata: {
          source: 'PROVIDER',
          timestamp: expect.any(Date),
          market: Market.US,
          marketStatus: MarketStatus.TRADING,
          cacheTTL: 60,
          provider: 'longport',
        },
      });

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: ['AAPL.US'],
        market: Market.US,
        contextService: { key: 'context-service' },
      });
    });

    it('should infer market from symbol when market is not provided', async () => {
      const requestWithoutMarket: DataFetchRequest = {
        symbol: 'AAPL.US',
        dataType: 'stock-quote',
        mode: 'REALTIME',
      };

      const mockData = { symbol: 'AAPL.US', price: 150.75 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([mockData]);

      const result = await service.fetchSingleData(requestWithoutMarket);

      expect(result.metadata.market).toBe(Market.US); // Inferred from 'AAPL.US'
      expect(mockMarketStatusService.getMarketStatus).toHaveBeenCalledWith(Market.US);
    });

    it('should handle provider with preferred provider specified', async () => {
      const requestWithProvider: DataFetchRequest = {
        ...basicRequest,
        provider: 'longport',
      };

      const mockData = { symbol: 'AAPL.US', price: 150.75 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([mockData]);

      await service.fetchSingleData(requestWithProvider);

      expect(mockCapabilityRegistry.getCapability).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote'
      );
    });

    it('should fallback to best provider when preferred provider is not available', async () => {
      const requestWithUnavailableProvider: DataFetchRequest = {
        ...basicRequest,
        provider: 'unavailable-provider',
      };

      const mockData = { symbol: 'AAPL.US', price: 150.75 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getCapability
        .mockReturnValueOnce(null) // Preferred provider unavailable
        .mockReturnValueOnce(mockCapability); // Best provider available
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([mockData]);

      await service.fetchSingleData(requestWithUnavailableProvider);

      expect(mockCapabilityRegistry.getCapability).toHaveBeenCalledWith(
        'unavailable-provider',
        'get-stock-quote'
      );
      expect(mockCapabilityRegistry.getBestProvider).toHaveBeenCalledWith('get-stock-quote');
      expect(mockCapabilityRegistry.getCapability).toHaveBeenCalledWith(
        'longport',
        'get-stock-quote'
      );
    });

    it('should handle provider without context service', async () => {
      const mockProviderWithoutContext = {
        name: 'simple-provider',
      };

      const mockData = { symbol: 'AAPL.US', price: 150.75 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProviderWithoutContext);
      mockCapability.execute.mockResolvedValue([mockData]);

      await service.fetchSingleData(basicRequest);

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: ['AAPL.US'],
        market: Market.US,
        contextService: null,
      });
    });

    it('should handle non-array response from capability', async () => {
      const mockData = { symbol: 'AAPL.US', price: 150.75 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue(mockData); // Non-array response

      const result = await service.fetchSingleData(basicRequest);

      expect(result.data).toEqual(mockData);
    });

    it('should handle additional options in request', async () => {
      const requestWithOptions: DataFetchRequest = {
        ...basicRequest,
        options: {
          includeVolume: true,
          precision: 2,
        },
      };

      const mockData = { symbol: 'AAPL.US', price: 150.75, volume: 1000000 };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([mockData]);

      await service.fetchSingleData(requestWithOptions);

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: ['AAPL.US'],
        market: Market.US,
        contextService: { key: 'context-service' },
        includeVolume: true,
        precision: 2,
      });
    });

    it('should throw NotFoundException for unsupported data type', async () => {
      const requestWithInvalidDataType: DataFetchRequest = {
        ...basicRequest,
        dataType: 'unsupported-data-type',
      };

      await expect(service.fetchSingleData(requestWithInvalidDataType)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.fetchSingleData(requestWithInvalidDataType)).rejects.toThrow(
        '不支持的数据类型: unsupported-data-type'
      );
    });

    it('should throw NotFoundException when no capability found', async () => {
      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue(null);

      await expect(service.fetchSingleData(basicRequest)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.fetchSingleData(basicRequest)).rejects.toThrow(
        '未找到可用的 get-stock-quote 能力'
      );
    });

    it('should throw NotFoundException when capability execution fails', async () => {
      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockRejectedValue(new Error('API call failed'));

      await expect(service.fetchSingleData(basicRequest)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.fetchSingleData(basicRequest)).rejects.toThrow(
        '获取 AAPL.US 数据失败: API call failed'
      );
    });
  });

  describe('fetchBatchData', () => {
    const batchRequests: DataFetchRequest[] = [
      {
        symbol: 'AAPL.US',
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'REALTIME',
      },
      {
        symbol: 'GOOGL.US',
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'REALTIME',
      },
      {
        symbol: 'TSLA.US',
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'REALTIME',
      },
    ];

    it('should fetch batch data successfully', async () => {
      const mockDataResponses = [
        { symbol: 'AAPL.US', price: 150.75 },
        { symbol: 'GOOGL.US', price: 2800.50 },
        { symbol: 'TSLA.US', price: 250.25 },
      ];

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockCapability.execute.mockImplementation(async ({ symbols }) => {
        const symbol = symbols[0];
        const data = mockDataResponses.find(d => d.symbol === symbol);
        return [data];
      });

      const results = await service.fetchBatchData(batchRequests);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.data).toEqual(mockDataResponses[index]);
        expect(result.metadata.source).toBe('PROVIDER');
        expect(result.metadata.market).toBe(Market.US);
        expect(result.metadata.marketStatus).toBe(MarketStatus.TRADING);
      });
    });

    it('should handle partial failures in batch data fetching', async () => {
      const mockDataResponses = [
        { symbol: 'AAPL.US', price: 150.75 },
        null, // GOOGL fails
        { symbol: 'TSLA.US', price: 250.25 },
      ];

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockCapability.execute.mockImplementation(async ({ symbols }) => {
        const symbol = symbols[0];
        if (symbol === 'GOOGL.US') {
          throw new Error('GOOGL.US data not available');
        }
        const data = mockDataResponses.find((d) => d && d.symbol === symbol);
        return [data];
      });

      const results = await service.fetchBatchData(batchRequests);

      expect(results).toHaveLength(3);
      expect(results[0].data).toEqual(mockDataResponses[0]);
      expect(results[1].data).toBeNull();
      expect(results[1].metadata).toEqual({
        source: 'PROVIDER',
        timestamp: expect.any(Date),
        market: Market.US,
        marketStatus: MarketStatus.CLOSED,
        cacheTTL: 60,
        error: '获取 GOOGL.US 数据失败: GOOGL.US data not available',
      });
      expect(results[2].data).toEqual(mockDataResponses[2]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '批量数据获取部分失败',
        expect.objectContaining({
          symbol: 'GOOGL.US',
          error: '获取 GOOGL.US 数据失败: GOOGL.US data not available',
        })
      );
    });

    it('should handle all failures in batch data fetching', async () => {
      mockMarketStatusService.getMarketStatus.mockResolvedValue({
        ...mockMarketStatusResponse,
        status: MarketStatus.CLOSED,
      });
      mockCapabilityRegistry.getBestProvider.mockReturnValue(null);

      const results = await service.fetchBatchData(batchRequests);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.data).toBeNull();
        expect(result.metadata.source).toBe('PROVIDER');
        expect(result.metadata.market).toBe(Market.US);
        expect(result.metadata.marketStatus).toBe(MarketStatus.CLOSED);
        expect(result.metadata).toEqual({
          source: 'PROVIDER',
          timestamp: expect.any(Date),
          market: Market.US,
          marketStatus: MarketStatus.CLOSED,
          cacheTTL: 60,
          error: `获取 ${batchRequests[index].symbol} 数据失败: 未找到可用的 get-stock-quote 能力`,
        });
      });
    });

    it('should handle empty batch requests', async () => {
      const results = await service.fetchBatchData([]);

      expect(results).toEqual([]);
    });

    it('should propagate errors from service level', async () => {
      // Mock a service-level error (not from individual requests)
      const originalFetchSingleData = service.fetchSingleData;
      service.fetchSingleData = jest.fn().mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await expect(service.fetchBatchData(batchRequests)).rejects.toThrow(
        'Service unavailable'
      );

      // Restore original method
      service.fetchSingleData = originalFetchSingleData;
    });
  });

  describe('inferMarketFromSymbol', () => {
    it('should infer Hong Kong market from .HK suffix', () => {
      const result = (service as any).inferMarketFromSymbol('0700.HK');
      expect(result).toBe(Market.HK);
    });

    it('should infer Hong Kong market from 5-digit symbol', () => {
      const result = (service as any).inferMarketFromSymbol('00700');
      expect(result).toBe(Market.HK);
    });

    it('should infer US market from alphabet symbol', () => {
      const result = (service as any).inferMarketFromSymbol('AAPL.US');
      expect(result).toBe(Market.US);
    });

    it('should infer Shenzhen market from .SZ suffix', () => {
      const result = (service as any).inferMarketFromSymbol('000001.SZ');
      expect(result).toBe(Market.SZ);
    });

    it('should infer Shenzhen market from 00 prefix', () => {
      const result = (service as any).inferMarketFromSymbol('000001');
      expect(result).toBe(Market.SZ);
    });

    it('should infer Shenzhen market from 30 prefix', () => {
      const result = (service as any).inferMarketFromSymbol('300001');
      expect(result).toBe(Market.SZ);
    });

    it('should infer Shanghai market from .SH suffix', () => {
      const result = (service as any).inferMarketFromSymbol('600000.SH');
      expect(result).toBe(Market.SH);
    });

    it('should infer Shanghai market from 60 prefix', () => {
      const result = (service as any).inferMarketFromSymbol('600000');
      expect(result).toBe(Market.SH);
    });

    it('should infer Shanghai market from 68 prefix', () => {
      const result = (service as any).inferMarketFromSymbol('688000');
      expect(result).toBe(Market.SH);
    });

    it('should default to US market for unknown patterns', () => {
      const result = (service as any).inferMarketFromSymbol('UNKNOWN');
      expect(result).toBe(Market.US);
    });

    it('should handle case insensitive symbols', () => {
      const result1 = (service as any).inferMarketFromSymbol('AAPL.US');
      const result2 = (service as any).inferMarketFromSymbol('0700.hk');
      
      expect(result1).toBe(Market.US);
      expect(result2).toBe(Market.HK);
    });

    it('should handle symbols with whitespace', () => {
      const result = (service as any).inferMarketFromSymbol('  AAPL  ');
      expect(result).toBe(Market.US);
    });
  });

  describe('calculateCacheTTL', () => {
    it('should calculate cache TTL for REALTIME mode', async () => {
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);

      const result = await (service as any).calculateCacheTTL('REALTIME', Market.US);

      expect(result).toBe(60);
      expect(mockMarketStatusService.getRecommendedCacheTTL).toHaveBeenCalledWith(
        Market.US,
        'REALTIME'
      );
    });

    it('should calculate cache TTL for ANALYTICAL mode', async () => {
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(1800);

      const result = await (service as any).calculateCacheTTL('ANALYTICAL', Market.US);

      expect(result).toBe(1800);
      expect(mockMarketStatusService.getRecommendedCacheTTL).toHaveBeenCalledWith(
        Market.US,
        'ANALYTICAL'
      );
    });
  });

  describe('getProviderCapability', () => {
    it('should map data types to capabilities correctly', async () => {
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);

      const testCases = [
        { dataType: 'stock-quote', expectedCapability: 'get-stock-quote' },
        { dataType: 'stock-basic-info', expectedCapability: 'get-stock-basic-info' },
        { dataType: 'index-quote', expectedCapability: 'get-index-quote' },
        { dataType: 'market-status', expectedCapability: 'get-market-status' },
      ];

      for (const { dataType, expectedCapability } of testCases) {
        await (service as any).getProviderCapability(dataType, 'longport');
        expect(mockCapabilityRegistry.getCapability).toHaveBeenCalledWith(
          'longport',
          expectedCapability
        );
      }
    });

    it('should use preferred provider when available', async () => {
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);

      const result = await (service as any).getProviderCapability(
        'stock-quote',
        'preferred-provider'
      );

      expect(result.providerName).toBe('preferred-provider');
      expect(mockCapabilityRegistry.getCapability).toHaveBeenCalledWith(
        'preferred-provider',
        'get-stock-quote'
      );
    });

    it('should fallback to best provider when preferred is unavailable', async () => {
      mockCapabilityRegistry.getCapability
        .mockReturnValueOnce(null) // Preferred provider unavailable
        .mockReturnValueOnce(mockCapability); // Best provider available
      mockCapabilityRegistry.getBestProvider.mockReturnValue('best-provider');

      const result = await (service as any).getProviderCapability(
        'stock-quote',
        'unavailable-provider'
      );

      expect(result.providerName).toBe('best-provider');
      expect(mockCapabilityRegistry.getBestProvider).toHaveBeenCalledWith('get-stock-quote');
    });

    it('should throw error when no provider found', async () => {
      mockCapabilityRegistry.getBestProvider.mockReturnValue(null);

      await expect(
        (service as any).getProviderCapability('stock-quote')
      ).rejects.toThrow(NotFoundException);
      await expect(
        (service as any).getProviderCapability('stock-quote')
      ).rejects.toThrow('未找到可用的 get-stock-quote 能力');
    });

    it('should throw error when capability not found for best provider', async () => {
      mockCapabilityRegistry.getBestProvider.mockReturnValue('best-provider');
      mockCapabilityRegistry.getCapability.mockReturnValue(null);

      await expect(
        (service as any).getProviderCapability('stock-quote')
      ).rejects.toThrow(NotFoundException);
      await expect(
        (service as any).getProviderCapability('stock-quote')
      ).rejects.toThrow('未找到可用的 get-stock-quote 能力');
    });

    it('should throw error for unsupported data type', async () => {
      await expect(
        (service as any).getProviderCapability('unsupported-type')
      ).rejects.toThrow(NotFoundException);
      await expect(
        (service as any).getProviderCapability('unsupported-type')
      ).rejects.toThrow('不支持的数据类型: unsupported-type');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        symbol: `STOCK${i}`,
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'REALTIME' as const,
      }));

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockCapability.execute.mockImplementation(async ({ symbols }) => {
        const symbol = symbols[0];
        return [{ symbol: symbol, price: Math.random() * 100 }];
      });

      const results = await service.fetchBatchData(concurrentRequests);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.data.symbol).toBe(`STOCK${index}`);
        expect(result.metadata.source).toBe('PROVIDER');
      });
    });

    it('should handle market status service failures gracefully', async () => {
      const request: DataFetchRequest = {
        symbol: 'AAPL.US',
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'REALTIME',
      };

      mockMarketStatusService.getMarketStatus.mockRejectedValue(
        new Error('Market status service unavailable')
      );

      await expect(service.fetchSingleData(request)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.fetchSingleData(request)).rejects.toThrow(
        '获取 AAPL.US 数据失败'
      );
    });

    it('should preserve request options and pass them through', async () => {
      const requestWithComplexOptions: DataFetchRequest = {
        symbol: 'AAPL.US',
        dataType: 'stock-quote',
        market: Market.US,
        mode: 'ANALYTICAL',
        options: {
          includeExtendedHours: true,
          precision: 4,
          currency: 'USD',
          adjustments: ['splits', 'dividends'],
        },
      };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(1800);
      mockCapabilityRegistry.getBestProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockCapability.execute.mockResolvedValue([{ symbol: 'AAPL.US', price: 150.75 }]);

      await service.fetchSingleData(requestWithComplexOptions);

      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: ['AAPL.US'],
        market: Market.US,
        contextService: { key: 'context-service' },
        includeExtendedHours: true,
        precision: 4,
        currency: 'USD',
        adjustments: ['splits', 'dividends'],
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle different market combinations', async () => {
      const mixedMarketRequests: DataFetchRequest[] = [
        { symbol: 'AAPL.US', dataType: 'stock-quote', market: Market.US, mode: 'REALTIME' },
        { symbol: '0700.HK', dataType: 'stock-quote', market: Market.HK, mode: 'REALTIME' },
        { symbol: '600000.SH', dataType: 'stock-quote', market: Market.SH, mode: 'REALTIME' },
      ];

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockCapability.execute
        .mockResolvedValueOnce([{ symbol: 'AAPL.US', price: 150.75 }])
        .mockResolvedValueOnce([{ symbol: '0700.HK', price: 400.0 }])
        .mockResolvedValueOnce([{ symbol: '600000.SH', price: 15.5 }]);

      const results = await service.fetchBatchData(mixedMarketRequests);

      expect(results).toHaveLength(3);
      expect(results[0].metadata.market).toBe(Market.US);
      expect(results[1].metadata.market).toBe(Market.HK);
      expect(results[2].metadata.market).toBe(Market.SH);
    });

    it('should handle different data types in batch', async () => {
      const mixedDataTypeRequests: DataFetchRequest[] = [
        { symbol: 'AAPL.US', dataType: 'stock-quote', market: Market.US, mode: 'REALTIME' },
        { symbol: 'GOOGL.US', dataType: 'stock-basic-info', market: Market.US, mode: 'ANALYTICAL' },
      ];

      const mockQuoteCapability = {
        ...mockCapability,
        name: 'get-stock-quote',
        execute: jest.fn(),
      };
      const mockInfoCapability = {
        ...mockCapability,
        name: 'get-stock-basic-info',
        execute: jest.fn(),
      };

      mockMarketStatusService.getMarketStatus.mockResolvedValue(mockMarketStatusResponse);
      mockMarketStatusService.getRecommendedCacheTTL
        .mockResolvedValueOnce(60)   // REALTIME
        .mockResolvedValueOnce(1800); // ANALYTICAL
      
      mockCapabilityRegistry.getBestProvider.mockImplementation((capabilityName) => {
        if (capabilityName === 'get-stock-quote' || capabilityName === 'get-stock-basic-info') {
          return 'longport';
        }
        return null;
      });
      
      mockCapabilityRegistry.getCapability
        .mockImplementation((provider, capabilityName) => {
          if (capabilityName === 'get-stock-quote') {
            return mockQuoteCapability;
          }
          if (capabilityName === 'get-stock-basic-info') {
            return mockInfoCapability;
          }
          return null;
        });
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockQuoteCapability.execute.mockResolvedValue([{ symbol: 'AAPL.US', price: 150.75 }]);
      mockInfoCapability.execute.mockResolvedValue([{ symbol: 'GOOGL.US', name: 'Alphabet Inc' }]);

      const results = await service.fetchBatchData(mixedDataTypeRequests);

      expect(results).toHaveLength(2);
      expect(results[0].data.price).toBeDefined();
      expect(results[1].data.name).toBeDefined();
    });
  });
});