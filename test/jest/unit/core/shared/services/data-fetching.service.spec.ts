import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataFetchingService, DataFetchResponse } from '@core/shared/services/data-fetching.service';
import { CapabilityRegistryService } from '@providers/services/capability-registry.service';
import { MarketStatusService, MarketStatusResult } from '@core/shared/services/market-status.service';
import { DataChangeDetectorService } from '@core/shared/services/data-change-detector.service';
import { Market } from '@common/constants/market.constants';
import { MarketStatus } from '@common/constants/market-trading-hours.constants';

import { ICapability } from '@providers/interfaces/capability.interface';

// Mock dependencies
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
  sanitizeLogData: jest.fn(data => data),
}));

const mockCapabilityRegistryService = {
  getCapability: jest.fn(),
  getBestProvider: jest.fn(),
  getProvider: jest.fn(),
};

const mockMarketStatusService = {
  getMarketStatus: jest.fn(),
  getRecommendedCacheTTL: jest.fn(),
};

const mockDataChangeDetectorService = {
  // Mock methods if they are used in the future
};

const mockProvider = {
  getContextService: jest.fn(() => null), // 默认返回 null
};

describe('DataFetchingService', () => {
  let service: DataFetchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFetchingService,
        { provide: CapabilityRegistryService, useValue: mockCapabilityRegistryService },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: DataChangeDetectorService, useValue: mockDataChangeDetectorService },
      ],
    }).compile();

    service = module.get<DataFetchingService>(DataFetchingService);
    jest.clearAllMocks();
  });

  it('服务应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('fetchSingleData', () => {
    const mockRequest = {
      symbol: 'AAPL',
      queryTypeFilter: 'get-quote',
      mode: 'REALTIME' as const,
    };

    const mockCapability: ICapability & { providerName: string; execute: jest.Mock } = {
      name: 'get-quote',
      description: 'Get stock quote',
      supportedMarkets: [Market.US],
      supportedSymbolFormats: ['AAPL.US'],
      providerName: 'TestProvider',
      execute: jest.fn(),
    };

    beforeEach(() => {
      mockMarketStatusService.getMarketStatus.mockResolvedValue({
        market: Market.US,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'America/New_York',
        realtimeCacheTTL: 5,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 1.0,
      } as MarketStatusResult);
      mockMarketStatusService.getRecommendedCacheTTL.mockResolvedValue(60);
      mockCapabilityRegistryService.getBestProvider.mockReturnValue('TestProvider');
      mockCapabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistryService.getProvider.mockReturnValue(mockProvider);
    });

    it('应成功获取数据', async () => {
      const mockData = { price: 150 };
      mockCapability.execute.mockResolvedValue(mockData);

      const response = await service.fetchSingleData(mockRequest);

      expect(response.data).toEqual(mockData);
      expect(response.metadata.source).toBe('PROVIDER');
      expect(response.metadata.market).toBe(Market.US); // 从 'AAPL' 推断
      expect(response.metadata.provider).toBe('TestProvider');
      expect(mockCapability.execute).toHaveBeenCalledWith({
        symbols: [mockRequest.symbol],
        market: Market.US,
        contextService: null,
      });
    });

    it('当找不到能力时应抛出 NotFoundException', async () => {
      mockCapabilityRegistryService.getBestProvider.mockReturnValue(null);
      mockCapabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(service.fetchSingleData(mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('当能力执行失败时应抛出 NotFoundException', async () => {
      const error = new Error('Provider error');
      mockCapability.execute.mockRejectedValue(error);

      await expect(service.fetchSingleData(mockRequest)).rejects.toThrow(NotFoundException);
      await expect(service.fetchSingleData(mockRequest)).rejects.toThrow(`获取 ${mockRequest.symbol} 数据失败: ${error.message}`);
    });
  });

  describe('fetchBatchData', () => {
    it('应能处理部分成功和部分失败的请求', async () => {
      const requests = [
        { symbol: 'AAPL', queryTypeFilter: 'get-quote', mode: 'REALTIME' as const },
        { symbol: 'GOOG', queryTypeFilter: 'get-quote', mode: 'REALTIME' as const },
      ];

      const successResponse: DataFetchResponse = {
        data: { price: 150 },
        metadata: {
          source: 'PROVIDER',
          timestamp: new Date(),
          market: Market.US,
          marketStatus: MarketStatus.TRADING,
          cacheTTL: 60,
          provider: 'TestProvider',
        },
      };
      const failureReason = new Error('Failed to fetch');

      const fetchSingleDataSpy = jest.spyOn(service, 'fetchSingleData')
        .mockResolvedValueOnce(successResponse)
        .mockRejectedValueOnce(failureReason);

      const results = await service.fetchBatchData(requests);

      expect(results.length).toBe(2);
      expect(results[0]).toEqual(successResponse);
      expect(results[1].data).toBeNull();
      expect(results[1].metadata.market).toBe(Market.US); // 使用默认市场
      expect(results[1].metadata.marketStatus).toBe(MarketStatus.CLOSED);
      expect(results[1].metadata.cacheTTL).toBe(60);
      expect(results[1].metadata.provider).toBeUndefined(); // Provider might not be determined on failure

      fetchSingleDataSpy.mockRestore();
    });
  });

  describe('inferMarketFromSymbol', () => {
    const inferMarket = (symbol: string) => (service as any).inferMarketFromSymbol(symbol);

    it('应能正确识别香港市场股票', () => {
      expect(inferMarket('700.HK')).toBe(Market.HK);
      expect(inferMarket('00700')).toBe(Market.HK);
    });

    it('应能正确识别美国市场股票', () => {
      expect(inferMarket('AAPL')).toBe(Market.US);
      expect(inferMarket('GOOGL')).toBe(Market.US);
    });

    it('应能正确识别深圳市场股票', () => {
      expect(inferMarket('000001.SZ')).toBe(Market.SZ);
      expect(inferMarket('300750')).toBe(Market.SZ);
    });

    it('应能正确识别上海市场股票', () => {
      expect(inferMarket('600519.SH')).toBe(Market.SH);
      expect(inferMarket('688981')).toBe(Market.SH);
    });

    it('对于无法识别的格式，应默认返回美国市场', () => {
      expect(inferMarket('UNKNOWN')).toBe(Market.US);
    });
  });
});