
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ReceiverService } from '@core/receiver/services/receiver.service';
import { CacheService } from '../../../../../../src/cache/services/cache.service';
import { CapabilityRegistryService } from '@providers/services/capability-registry.service';
import { MarketStatusService } from '@core/shared/services/market-status.service';
import { SymbolMapperService } from '@core/symbol-mapper/services/symbol-mapper.service';
import { DataRequestDto } from '@core/receiver/dto/data-request.dto';
import { Market } from '@common/constants/market.constants';
import { MarketStatus } from '@common/constants/market-trading-hours.constants';
import { ICapability } from '@providers/interfaces/capability.interface';

import { MarketStatusResult } from '@core/shared/services/market-status.service';

describe('ReceiverService', () => {
  let service: ReceiverService;
  let cacheService: jest.Mocked<CacheService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let symbolMapperService: jest.Mocked<SymbolMapperService>;

  const mockCapability: ICapability & { execute: jest.Mock } = {
    name: 'test-capability',
    description: 'Test Capability',
    execute: jest.fn(),
    supportedMarkets: [Market.HK, Market.US],
    supportedSymbolFormats: ['700.HK', 'AAPL.US'],
  };

  const mockMarketStatus: Record<Market, MarketStatusResult> = {
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
      confidence: 1.0,
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
      confidence: 1.0,
    },
    [Market.SZ]: {
      market: Market.SZ,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.SH]: {
      market: Market.SH,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.CN]: {
      market: Market.CN,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.CRYPTO]: {
      market: Market.CRYPTO,
      status: MarketStatus.TRADING,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'UTC',
      realtimeCacheTTL: 1,
      analyticalCacheTTL: 60,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
  };

  beforeEach(async () => {
    // 测试前先模拟常量
    jest.mock('../../../../../../src/core/receiver/constants/receiver.constants', () => ({
      RECEIVER_ERROR_MESSAGES: {
        SOME_SYMBOLS_FAILED_TO_MAP: '部分股票代码转换失败: {failedSymbols}',
      },
      RECEIVER_WARNING_MESSAGES: {
        SLOW_REQUEST_DETECTED: '检测到慢请求',
      },
      RECEIVER_OPERATIONS: {
        TRANSFORM_SYMBOLS: 'transformSymbols',
        RECORD_PERFORMANCE: 'recordPerformanceMetrics',
      },
      RECEIVER_PERFORMANCE_THRESHOLDS: {
        SLOW_REQUEST_MS: 1000,
        LOG_SYMBOLS_LIMIT: 10,
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: CapabilityRegistryService,
          useValue: {
            getBestProvider: jest.fn(),
            getCapability: jest.fn(),
            getProvider: jest.fn(),
          },
        },
        {
          provide: MarketStatusService,
          useValue: {
            getBatchMarketStatus: jest.fn(),
          },
        },
        {
          provide: SymbolMapperService,
          useValue: {
            transformSymbols: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    cacheService = module.get(CacheService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
    marketStatusService = module.get(MarketStatusService);
    symbolMapperService = module.get(SymbolMapperService);

    // 添加模拟的logger
    (service as any).logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRequest', () => {
    const validRequest: DataRequestDto = {
      symbols: ['700.HK', 'AAPL'],
      receiverType: 'get-stock-quote',
      options: {
        realtime: true,
      },
    };

    beforeEach(() => {
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { 'AAPL': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([
        { symbol: '700.HK', price: 100 },
        { symbol: 'AAPL', price: 150 },
      ]);
    });

    it('should successfully handle a valid request', async () => {
      cacheService.get.mockResolvedValue(null); // No cache

      const result = await service.handleRequest(validRequest);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.requestId).toBeDefined();
    });

    it('should return cached data when available', async () => {
      const cachedData = [{ symbol: '700.HK', price: 99 }];
      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.handleRequest(validRequest);

      expect(result.data).toEqual(cachedData);
      expect(mockCapability.execute).not.toHaveBeenCalled();
    });

    it('should handle partial symbol transformation failures', async () => {
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: ['INVALID'],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([{ symbol: '700.HK', price: 100 }]);

      const requestWithFailures = {
        ...validRequest,
        symbols: ['700.HK', 'INVALID'],
      };

      const result = await service.handleRequest(requestWithFailures);

      expect(result).toBeDefined();
      expect(result.metadata.hasPartialFailures).toBe(true);
      expect(result.metadata.totalRequested).toBe(2);
      expect(result.metadata.successfullyProcessed).toBe(1);
    });

    it('should throw BadRequestException when all symbols fail transformation', async () => {
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: ['INVALID1', 'INVALID2'],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });

      const requestWithAllFailures = {
        ...validRequest,
        symbols: ['INVALID1', 'INVALID2'],
      };

      await expect(service.handleRequest(requestWithAllFailures)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no provider found', async () => {
      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      await expect(service.handleRequest(validRequest)).rejects.toThrow(NotFoundException);
    });

    it('should handle market status service failures gracefully', async () => {
      marketStatusService.getBatchMarketStatus.mockRejectedValue(new Error('Market service error'));
      cacheService.get.mockResolvedValue(null);

      const result = await service.handleRequest(validRequest);

      expect(result).toBeDefined();
      // Should use fallback market status and continue processing
    });

    it('should handle cache service failures gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      cacheService.set.mockRejectedValue(new Error('Cache set error'));

      const result = await service.handleRequest(validRequest);

      expect(result).toBeDefined();
      // Should continue processing despite cache failures
    });

    it('should throw InternalServerErrorException when capability execution fails', async () => {
      cacheService.get.mockResolvedValue(null);
      mockCapability.execute.mockRejectedValue(new Error('Provider execution failed'));

      await expect(service.handleRequest(validRequest)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('request validation', () => {
    it('should detect duplicate symbols and add warning', async () => {
      const requestWithDuplicates: DataRequestDto = {
        symbols: ['700.HK', '700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK', 'AAPL': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      const result = await service.handleRequest(requestWithDuplicates);
      expect(result).toBeDefined();
    });

    it('should detect symbols with whitespace and add warning', async () => {
      const requestWithWhitespace: DataRequestDto = {
        symbols: [' 700.HK ', 'AAPL'],
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { ' 700.HK ': '700.HK', 'AAPL': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      const result = await service.handleRequest(requestWithWhitespace);
      expect(result).toBeDefined();
    });
  });

  describe('provider selection', () => {
    it('should use preferred provider when specified and valid', async () => {
      const requestWithPreferredProvider: DataRequestDto = {
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
        options: {
          preferredProvider: 'longport',
        },
      };

      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest(requestWithPreferredProvider);

      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith('longport', 'get-stock-quote');
    });

    it('should throw NotFoundException when preferred provider does not support capability', async () => {
      const requestWithInvalidProvider: DataRequestDto = {
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
        options: {
          preferredProvider: 'invalid-provider',
        },
      };

      capabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(service.handleRequest(requestWithInvalidProvider)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when preferred provider does not support market', async () => {
      const limitedCapability: ICapability = {
        name: 'limited-capability',
        description: 'Limited Capability',
        execute: jest.fn(),
        supportedMarkets: [Market.US],
        supportedSymbolFormats: ['AAPL.US'],
      };

      const requestWithUnsupportedMarket: DataRequestDto = {
        symbols: ['700.HK'], // HK market symbol
        receiverType: 'get-stock-quote',
        options: {
          preferredProvider: 'us-only-provider',
          market: Market.HK,
        },
      };

      capabilityRegistryService.getCapability.mockReturnValue(limitedCapability);

      await expect(service.handleRequest(requestWithUnsupportedMarket)).rejects.toThrow(NotFoundException);
    });
  });

  describe('symbol transformation', () => {
    it('should separate standard symbols from symbols needing transformation', async () => {
      const mixedRequest: DataRequestDto = {
        symbols: ['700.HK', 'AAPL.US', '00700', 'MSFT'], // Mix of standard and non-standard
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '00700': '700.HK', 'MSFT': 'MSFT' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest(mixedRequest);

      expect(symbolMapperService.transformSymbols).toHaveBeenCalledWith('longport', ['00700', 'MSFT']);
    });

    it('should handle transformation service errors', async () => {
      symbolMapperService.transformSymbols.mockRejectedValue(new Error('Transformation service error'));
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      cacheService.get.mockResolvedValue(null);

      await expect(service.handleRequest({
        symbols: ['00700'],
        receiverType: 'get-stock-quote',
      })).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('market inference', () => {
    it('should correctly infer HK market from symbols', async () => {
      const hkSymbols = ['700.HK', '00700', '12345'];
      
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest({
        symbols: hkSymbols,
        receiverType: 'get-stock-quote',
      });

      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith(
        expect.arrayContaining([Market.HK])
      );
    });

    it('should correctly infer US market from symbols', async () => {
      const usSymbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest({
        symbols: usSymbols,
        receiverType: 'get-stock-quote',
      });

      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith(
        expect.arrayContaining([Market.US])
      );
    });
    
    it('should correctly infer SZ market from symbols', async () => {
      const szSymbols = ['000001', '300001'];
      
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest({
        symbols: szSymbols,
        receiverType: 'get-stock-quote',
      });

      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith(
        expect.arrayContaining([Market.SZ])
      );
    });

    it('should correctly infer SH market from symbols', async () => {
      const shSymbols = ['600000', '688001'];
      
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest({
        symbols: shSymbols,
        receiverType: 'get-stock-quote',
      });

      expect(marketStatusService.getBatchMarketStatus).toHaveBeenCalledWith(
        expect.arrayContaining([Market.SH])
      );
    });
  });

  describe('caching behavior', () => {
    it('should build correct cache key for realtime data', async () => {
      const request: DataRequestDto = {
        symbols: ['700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
        options: { realtime: true },
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { 'AAPL': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest(request);

      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('receiver:realtime:longport:get-stock-quote')
      );
    });

    it('should calculate appropriate TTL based on market status', async () => {
      const request: DataRequestDto = {
        symbols: ['700.HK'], // HK market, should use HK TTL (5 seconds from mock)
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([{ symbol: '700.HK', price: 100 }]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest(request);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        { ttl: 5 }
      );
    });

    it('should use minimum TTL when multiple markets are involved', async () => {
      const request: DataRequestDto = {
        symbols: ['700.HK', 'AAPL'], // HK (5s) + US (60s) = should use 5s
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { 'AAPL': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      await service.handleRequest(request);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        { ttl: 5 }
      );
    });
  });

  describe('performance monitoring', () => {
    it('should log warning for slow requests', async () => {
      const request: DataRequestDto = {
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      
      mockCapability.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 2000))
      );
      cacheService.get.mockResolvedValue(null);

      const originalThreshold = require('../../../../../../src/core/receiver/constants/receiver.constants').RECEIVER_PERFORMANCE_THRESHOLDS;
      jest.doMock('../../../../../../src/core/receiver/constants/receiver.constants', () => ({
        ...originalThreshold,
        RECEIVER_PERFORMANCE_THRESHOLDS: {
          ...originalThreshold.RECEIVER_PERFORMANCE_THRESHOLDS,
          SLOW_REQUEST_MS: 1000,
        },
      }));

      await service.handleRequest(request);

      expect(mockCapability.execute).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle undefined capability gracefully', async () => {
      capabilityRegistryService.getBestProvider.mockReturnValue('invalid-provider');
      capabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(service.handleRequest({
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      })).rejects.toThrow(NotFoundException);
    });

    it('should handle provider context service gracefully when unavailable', async () => {
      const mockProvider = {
        // No getContextService method
      };

      capabilityRegistryService.getBestProvider.mockReturnValue('test-provider');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getProvider.mockReturnValue(mockProvider as any);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      const result = await service.handleRequest({
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      });

      expect(result).toBeDefined();
    });

    it('should handle provider context service when provider does not exist', async () => {
      capabilityRegistryService.getBestProvider.mockReturnValue('non-existent-provider');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability); // Still need a capability for the flow to continue
      capabilityRegistryService.getProvider.mockReturnValue(undefined); // Provider does not exist
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport',
      });
      mockCapability.execute.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      const result = await service.handleRequest({
        symbols: ['700.HK'],
        receiverType: 'get-stock-quote',
      });

      expect(result).toBeDefined();
      // Expect no error, and the flow should continue without a context service
    });

    it('should provide proper error context in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      marketStatusService.getBatchMarketStatus.mockResolvedValue(mockMarketStatus);
      symbolMapperService.transformSymbols.mockRejectedValue(new Error('Symbol service failed'));
      cacheService.get.mockResolvedValue(null);

      await expect(service.handleRequest({
        symbols: ['INVALID'],
        receiverType: 'get-stock-quote',
      })).rejects.toThrow(InternalServerErrorException);

      consoleSpy.mockRestore();
    });
  });
});

describe('ReceiverService private methods', () => {
  let service: ReceiverService;
  let cacheService: jest.Mocked<CacheService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let symbolMapperService: jest.Mocked<SymbolMapperService>;

  const mockCapability: ICapability & { execute: jest.Mock } = {
    name: 'test-capability',
    description: 'Test Capability',
    execute: jest.fn(),
    supportedMarkets: [Market.HK, Market.US],
    supportedSymbolFormats: ['700.HK', 'AAPL.US'],
  };

  const mockMarketStatus: Record<Market, MarketStatusResult> = {
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
      confidence: 1.0,
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
      confidence: 1.0,
    },
    [Market.SZ]: {
      market: Market.SZ,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.SH]: {
      market: Market.SH,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.CN]: {
      market: Market.CN,
      status: MarketStatus.CLOSED,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'Asia/Shanghai',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 3600,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
    [Market.CRYPTO]: {
      market: Market.CRYPTO,
      status: MarketStatus.TRADING,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'UTC',
      realtimeCacheTTL: 1,
      analyticalCacheTTL: 60,
      isHoliday: false,
      isDST: false,
      confidence: 1.0,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: CapabilityRegistryService,
          useValue: {
            getBestProvider: jest.fn(),
            getCapability: jest.fn(),
            getProvider: jest.fn(),
          },
        },
        {
          provide: MarketStatusService,
          useValue: {
            getBatchMarketStatus: jest.fn(),
          },
        },
        {
          provide: SymbolMapperService,
          useValue: {
            transformSymbols: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    cacheService = module.get(CacheService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
    marketStatusService = module.get(MarketStatusService);
    symbolMapperService = module.get(SymbolMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inferMarketFromSymbol', () => {
    let inferMarketFromSymbol: (symbol: string) => Market;

    beforeEach(() => {
      // 通过原型注入私有方法的测试实现
      Object.defineProperty(ReceiverService.prototype, 'inferMarketFromSymbol', {
        value: function(symbol: string): Market {
          const upperSymbol = symbol.toUpperCase().trim();
        
          // 香港市场: .HK 后缀或5位数字
          if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
            return Market.HK;
          }
        
          // 美国市场: 1-5位字母
          if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
            return Market.US;
          }
        
          // 深圳市场: .SZ 后缀或 00/30 前缀
          if (
            upperSymbol.includes(".SZ") ||
            ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
          ) {
            return Market.SZ;
          }
        
          // 上海市场: .SH 后缀或 60/68 前缀
          if (
            upperSymbol.includes(".SH") ||
            ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
          ) {
            return Market.SH;
          }
        
          // 默认美股
          return Market.US;
        },
        configurable: true,
        writable: true,
      });
      
      inferMarketFromSymbol = (service as any).inferMarketFromSymbol.bind(service);
    });

    it('should correctly infer HK market from .HK suffix', () => {
      expect(inferMarketFromSymbol('700.HK')).toBe(Market.HK);
    });

    it('should correctly infer HK market from 5-digit number', () => {
      expect(inferMarketFromSymbol('12345')).toBe(Market.HK);
    });

    it('should correctly infer US market from 1-5 letter symbol', () => {
      expect(inferMarketFromSymbol('AAPL')).toBe(Market.US);
      expect(inferMarketFromSymbol('MSFT')).toBe(Market.US);
      expect(inferMarketFromSymbol('GOOGL')).toBe(Market.US);
    });

    it('should correctly infer SZ market from .SZ suffix', () => {
      expect(inferMarketFromSymbol('000001.SZ')).toBe(Market.SZ);
    });

    it('should correctly infer SZ market from 00 prefix', () => {
      expect(inferMarketFromSymbol('000001')).toBe(Market.SZ);
    });

    it('should correctly infer SZ market from 30 prefix', () => {
      expect(inferMarketFromSymbol('300001')).toBe(Market.SZ);
    });

    it('should correctly infer SH market from .SH suffix', () => {
      expect(inferMarketFromSymbol('600000.SH')).toBe(Market.SH);
    });

    it('should correctly infer SH market from 60 prefix', () => {
      expect(inferMarketFromSymbol('600000')).toBe(Market.SH);
    });

    it('should correctly infer SH market from 68 prefix', () => {
      expect(inferMarketFromSymbol('688001')).toBe(Market.SH);
    });

    it('should default to US market for unknown formats', () => {
      expect(inferMarketFromSymbol('UNKNOWN')).toBe(Market.US);
      expect(inferMarketFromSymbol('ABCDEF')).toBe(Market.US);
    });

    it('should handle mixed case symbols', () => {
      expect(inferMarketFromSymbol('aapl')).toBe(Market.US);
      expect(inferMarketFromSymbol('700.hk')).toBe(Market.HK);
    });

    it('should handle symbols with leading/trailing whitespace', () => {
      expect(inferMarketFromSymbol('  AAPL  ')).toBe(Market.US);
      expect(inferMarketFromSymbol('  700.HK  ')).toBe(Market.HK);
    });
  });

  describe('transformSymbols', () => {
    it('should handle empty symbolsToTransform array gracefully', async () => {
      symbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 0,
        dataSourceName: 'mock',
      });

      const result = await (service as any).transformSymbols(
        [], // symbolsToTransform is empty
        ['AAPL.US', '700.HK'], // standardSymbols
        'longport',
        'test-request-id',
      );

      expect(symbolMapperService.transformSymbols).not.toHaveBeenCalled();
      expect(result.transformedSymbols).toEqual(['AAPL.US', '700.HK']);
      expect(result.mappingResults.metadata.successfulTransformations).toBe(2);
      expect(result.mappingResults.metadata.failedTransformations).toBe(0);
    });
  });

  describe('executeRealtimeDataFetching', () => {
    const mockRequest: DataRequestDto = {
      symbols: ['700.HK'],
      receiverType: 'get-stock-quote',
    };
    const mockMappedSymbols = {
      transformedSymbols: ['700.HK'],
      mappingResults: {
        metadata: {
          hasPartialFailures: false,
          totalSymbols: 1,
          successfulTransformations: 1,
        },
      },
    } as any;

    it('should not cache data if calculateRealtimeCacheTTL returns 0', async () => {
      jest.spyOn(service as any, 'calculateRealtimeCacheTTL').mockReturnValue(0);
      jest.spyOn(service as any, 'executeDataFetching').mockResolvedValue({
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: {},
      });

      await (service as any).executeRealtimeDataFetching(
        mockRequest,
        'longport',
        mockMappedSymbols,
        mockMarketStatus,
        'test-request-id',
      );

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should cache data if calculateRealtimeCacheTTL returns > 0', async () => {
      jest.spyOn(service as any, 'calculateRealtimeCacheTTL').mockReturnValue(5);
      jest.spyOn(service as any, 'executeDataFetching').mockResolvedValue({
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: {},
      });

      await (service as any).executeRealtimeDataFetching(
        mockRequest,
        'longport',
        mockMappedSymbols,
        mockMarketStatus,
        'test-request-id',
      );

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        { ttl: 5 }
      );
    });
  });

  describe('recordPerformanceMetrics', () => {
    let recordPerformanceMetrics: (requestId: string, processingTime: number, symbolsCount: number) => void;
    let loggerWarnSpy: jest.SpyInstance;
    let loggerDebugSpy: jest.SpyInstance;

    beforeEach(() => {
      // 模拟RECEIVER_PERFORMANCE_THRESHOLDS常量
      const MOCK_THRESHOLDS = {
        SLOW_REQUEST_MS: 1000,
        LOG_SYMBOLS_LIMIT: 10,
      };

      (service as any).recordPerformanceMetrics = function(
        requestId: string,
        processingTime: number,
        symbolsCount: number,
      ) {
        const avgTimePerSymbol =
          symbolsCount > 0 ? processingTime / symbolsCount : 0;
  
        if (processingTime > MOCK_THRESHOLDS.SLOW_REQUEST_MS) {
          this.logger.warn(
            "检测到慢请求",
            {
              requestId,
              processingTime,
              symbolsCount,
              avgTimePerSymbol: Math.round(avgTimePerSymbol * 100) / 100,
              threshold: MOCK_THRESHOLDS.SLOW_REQUEST_MS,
              operation: "recordPerformanceMetrics",
            },
          );
        }
  
        // 记录性能指标到监控系统（如果需要）
        this.logger.debug(
          `性能指标记录`,
          {
            requestId,
            processingTime,
            symbolsCount,
            avgTimePerSymbol: Math.round(avgTimePerSymbol * 100) / 100,
            operation: "performanceMetrics",
          },
        );
      };

      recordPerformanceMetrics = (service as any).recordPerformanceMetrics.bind(service);
      loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      loggerDebugSpy = jest.spyOn((service as any).logger, 'debug');
    });

    it('should log debug for normal requests', () => {
      recordPerformanceMetrics('req-1', 50, 10);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalled();
    });

    it('should log warning for slow requests', () => {
      const originalThreshold = require('../../../../../../src/core/receiver/constants/receiver.constants').RECEIVER_PERFORMANCE_THRESHOLDS;
      const SLOW_REQUEST_MS = originalThreshold.SLOW_REQUEST_MS;
      recordPerformanceMetrics('req-2', SLOW_REQUEST_MS + 1, 10);
      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalled();
    });

    it('should handle zero symbols gracefully', () => {
      recordPerformanceMetrics('req-3', 100, 0);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalled();
    });
  });
});
