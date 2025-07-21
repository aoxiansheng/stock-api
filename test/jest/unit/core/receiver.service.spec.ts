import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverService } from '../../../../src/core/receiver/receiver.service';
import { SymbolMapperService } from '../../../../src/core/symbol-mapper/symbol-mapper.service';
import { CapabilityRegistryService } from '../../../../src/providers/capability-registry.service';
import { LongportContextService } from '../../../../src/providers/longport/longport-context.service';
import { MarketStatusService } from '../../../../src/core/shared/services/market-status.service';
import { CacheService } from '../../../../src/cache/cache.service';
import { DataRequestDto } from '../../../../src/core/receiver/dto/data-request.dto';
import { TransformSymbolsResponseDto } from '../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto';
import { Market } from '../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../src/common/constants/market-trading-hours.constants';


describe('ReceiverService', () => {
  let service: ReceiverService;
  let symbolMapperService: jest.Mocked<SymbolMapperService>;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;
  let longportContextService: jest.Mocked<LongportContextService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockCapability = {
    name: 'get-stock-quote',
    description: 'Get stock quote data',
    supportedMarkets: ['US', 'HK'],
    supportedSymbolFormats: ['.US', '.HK'],
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const mockSymbolMapperService = {
      transformSymbols: jest.fn(),
    };

    const mockLongportContextService = {
      getContext: jest.fn(),
    };

    // 创建 mock provider 对象，包含 getContextService 方法
    const mockProvider = {
      name: 'longport',
      getContextService: jest.fn().mockReturnValue(mockLongportContextService),
    };

    const mockCapabilityRegistryService = {
      getCapability: jest.fn(),
      getBestProvider: jest.fn(),
      getProvider: jest.fn().mockReturnValue(mockProvider), // ✅ 添加缺失的 getProvider 方法
    };

    const mockMarketStatusService = {
      getMarketStatus: jest.fn().mockResolvedValue({
        status: MarketStatus.TRADING,
        nextChange: new Date().toISOString(),
        reason: 'Normal trading hours',
      }),
      getMarketStatuses: jest.fn().mockResolvedValue({
        [Market.US]: {
          status: MarketStatus.TRADING,
          nextChange: new Date().toISOString(),
          reason: 'Normal trading hours',
        }
      }),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiverService,
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistryService,
        },
        {
          provide: LongportContextService,
          useValue: mockLongportContextService,
        },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ReceiverService>(ReceiverService);
    symbolMapperService = module.get(SymbolMapperService);
    capabilityRegistryService = module.get(CapabilityRegistryService);
    longportContextService = module.get(LongportContextService);
    marketStatusService = module.get(MarketStatusService);
    cacheService = module.get(CacheService);
  });

  describe('handleRequest', () => {
    const validRequest: DataRequestDto = {
      symbols: ['AAPL.US', 'GOOGL.US'],
      dataType: 'stock-quote',
      options: {
        preferredProvider: 'longport',
        realtime: true,
      },
    };

    it('should handle valid request successfully', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL': 'AAPL.US', 'GOOGL': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: 'AAPL.US', price: 150.00 },
        { symbol: 'GOOGL.US', price: 2500.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const result = await service.handleRequest(validRequest);

      expect(result.data).toEqual(mockExecuteResult);
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.capability).toBe('get-stock-quote');
    });

    it('should handle validation errors', async () => {
      const invalidRequest: DataRequestDto = {
        symbols: [],
        dataType: 'invalid-type',
      } as any;

      await expect(service.handleRequest(invalidRequest)).rejects.toThrow('无法找到支持数据类型 \'invalid-type\' 和市场 \'undefined\' 的数据提供商');
    });

    it('should handle provider not found', async () => {
      // 创建一个不包含preferredProvider的请求，让它走自动选择提供商的逻辑
      const requestWithoutPreferredProvider: DataRequestDto = {
        symbols: ['AAPL.US', 'GOOGL.US'],
        dataType: 'stock-quote',
        options: {
          realtime: true,
        },
      };

      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      await expect(service.handleRequest(requestWithoutPreferredProvider)).rejects.toThrow('无法找到支持数据类型 \'stock-quote\' 和市场 \'US\' 的数据提供商');
    });

    it('should handle capability not found', async () => {
      // 创建一个不包含preferredProvider的请求，让它走自动选择提供商的逻辑
      const requestWithoutPreferredProvider: DataRequestDto = {
        symbols: ['AAPL.US', 'GOOGL.US'],
        dataType: 'stock-quote',
        options: {
          realtime: true,
        },
      };

      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL.US': 'AAPL.US', 'GOOGL.US': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(null);

      await expect(service.handleRequest(requestWithoutPreferredProvider)).rejects.toThrow('提供商 \'longport\' 不支持 \'get-stock-quote\' 能力');
    });

    it('should handle execution errors', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL.US': 'AAPL.US', 'GOOGL.US': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      mockCapability.execute.mockRejectedValue(new Error('Provider error'));

      await expect(service.handleRequest(validRequest)).rejects.toThrow('数据获取失败: Provider error');
    });
  });

  describe('private method testing via handleRequest', () => {
    it('should handle provider selection through handleRequest', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: 'AAPL.US', price: 150.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ['AAPL'],
        dataType: 'stock-quote',
        options: {
          preferredProvider: 'longport',
        },
      };

      const result = await service.handleRequest(validRequest);

      expect(result.metadata.provider).toBe('longport');
    });
  });

  describe('validation through handleRequest', () => {
    it('should handle validation errors through handleRequest', async () => {
      const invalidRequest: DataRequestDto = {
        symbols: [],
        dataType: 'invalid-type',
      } as any;

      await expect(service.handleRequest(invalidRequest)).rejects.toThrow('无法找到支持数据类型 \'invalid-type\' 和市场 \'undefined\' 的数据提供商');
    });

    it('should handle duplicate symbols as warning through handleRequest', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL.US': 'AAPL.US', 'GOOGL.US': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: 'AAPL.US', price: 150.00 },
        { symbol: 'GOOGL.US', price: 2500.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const requestWithDuplicates: DataRequestDto = {
        symbols: ['AAPL.US', 'GOOGL.US', 'AAPL.US'],
        dataType: 'stock-quote',
      };

      const result = await service.handleRequest(requestWithDuplicates);
      expect(result.data).toBeDefined();
    });
  });

  describe('market inference through provider selection', () => {
    it('should handle HK market symbols through handleRequest', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { '700.HK': '700.HK', '0005.HK': '0005.HK' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: '700.HK', price: 500.00 },
        { symbol: '0005.HK', price: 100.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ['700.HK', '0005.HK'],
        dataType: 'stock-quote',
      };

      const result = await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith('get-stock-quote', 'HK');
    });

    it('should handle US market symbols through handleRequest', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL': 'AAPL.US', 'GOOGL': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: 'AAPL.US', price: 150.00 },
        { symbol: 'GOOGL.US', price: 2500.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ['AAPL', 'GOOGL'],
        dataType: 'stock-quote',
      };

      const result = await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith('get-stock-quote', 'US');
    });
  });


  describe('data type to capability mapping', () => {
    it('should handle known data types through handleRequest', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [{ symbol: 'AAPL.US', price: 150.00 }];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ['AAPL'],
        dataType: 'stock-quote',
      };

      const result = await service.handleRequest(validRequest);

      expect(capabilityRegistryService.getCapability).toHaveBeenCalledWith('longport', 'get-stock-quote');
    });
  });

  describe('symbol transformation through handleRequest', () => {
    it('should handle symbol transformation successfully', async () => {
      const mockTransformResult: TransformSymbolsResponseDto = {
        dataSourceName: 'longport',
        transformedSymbols: { 'AAPL': 'AAPL.US', 'GOOGL': 'GOOGL.US' },
        failedSymbols: [],
        processingTimeMs: 10,
      };

      const mockExecuteResult = [
        { symbol: 'AAPL.US', price: 150.00 },
        { symbol: 'GOOGL.US', price: 2500.00 },
      ];

      symbolMapperService.transformSymbols.mockResolvedValue(mockTransformResult);
      capabilityRegistryService.getCapability.mockReturnValue(mockCapability);
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');
      mockCapability.execute.mockResolvedValue(mockExecuteResult);

      const validRequest: DataRequestDto = {
        symbols: ['AAPL', 'GOOGL'],
        dataType: 'stock-quote',
      };

      const result = await service.handleRequest(validRequest);

      expect(symbolMapperService.transformSymbols).toHaveBeenCalledWith('longport', ['AAPL', 'GOOGL']);
    });

    it('should handle transformation errors', async () => {
      symbolMapperService.transformSymbols.mockRejectedValue(new Error('Transform failed'));
      capabilityRegistryService.getBestProvider.mockReturnValue('longport');

      const validRequest: DataRequestDto = {
        symbols: ['AAPL', 'GOOGL'],
        dataType: 'stock-quote',
      };

      await expect(service.handleRequest(validRequest)).rejects.toThrow('股票代码转换失败');
    });
  });
});