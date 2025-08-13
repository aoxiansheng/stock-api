import { Test, TestingModule } from '@nestjs/testing';
import { createLogger } from '@common/config/logger.config';
import { StreamReceiverService } from '../../../../../src/core/stream/stream-receiver/stream-receiver.service';
import { SymbolMapperService } from '../../../../../src/core/public/symbol-mapper/services/symbol-mapper.service';
import { TransformerService } from '../../../../../src/core/public/transformer/services/transformer.service';
import { StreamDataFetcherService } from '../../../../../src/core/stream/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamDataCacheService } from '../../../../../src/core/stream/stream-data-fetcher/services/stream-data-cache.service';
import { StreamClientStateManager } from '../../../../../src/core/stream/stream-data-fetcher/services/stream-client-state-manager.service';
import { StreamSubscribeDto, StreamUnsubscribeDto } from '../../../../../src/core/stream/stream-receiver/dto';
import { StreamConnection } from '../../../../../src/core/stream/stream-data-fetcher/interfaces';
import { TransformResponseDto, TransformationMetadataDto } from '../../../../../src/core/public/transformer/dto/transform-response.dto';

// Mock logger
jest.mock('@common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock services
const mockSymbolMapperService = {
  transformSymbolsForProvider: jest.fn(),
};

const mockTransformerService = {
  transform: jest.fn(),
};

const mockStreamDataFetcher = {
  establishStreamConnection: jest.fn(),
  subscribeToSymbols: jest.fn(),
  unsubscribeFromSymbols: jest.fn(),
  isConnectionActive: jest.fn(),
  getConnectionStatsByProvider: jest.fn(),
  batchHealthCheck: jest.fn(),
};

const mockStreamDataCache = {
  setData: jest.fn(),
  getData: jest.fn(),
  getCacheStats: jest.fn(),
};

const mockClientStateManager = {
  addClientSubscription: jest.fn(),
  removeClientSubscription: jest.fn(),
  getClientSubscription: jest.fn(),
  getClientSymbols: jest.fn(),
  getClientStateStats: jest.fn(),
  addSubscriptionChangeListener: jest.fn(),
  broadcastToSymbolSubscribers: jest.fn(),
};

// Mock StreamConnection
const mockStreamConnection: StreamConnection = {
  id: 'test-connection-1',
  provider: 'longport',
  capability: 'stream-stock-quote',
  isActive: true,
  onData: jest.fn(),
  onError: jest.fn(),
  onStatusChange: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  close: jest.fn(),
  getStats: jest.fn(),
};

describe('StreamReceiverService - Phase 2 重构版本', () => {
  let service: StreamReceiverService;
  let symbolMapper: jest.Mocked<SymbolMapperService>;
  let transformer: jest.Mocked<TransformerService>;
  let streamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let streamDataCache: jest.Mocked<StreamDataCacheService>;
  let clientStateManager: jest.Mocked<StreamClientStateManager>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: TransformerService,
          useValue: mockTransformerService,
        },
        {
          provide: StreamDataFetcherService,
          useValue: mockStreamDataFetcher,
        },
        {
          provide: StreamDataCacheService,
          useValue: mockStreamDataCache,
        },
        {
          provide: StreamClientStateManager,
          useValue: mockClientStateManager,
        },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
    symbolMapper = module.get(SymbolMapperService);
    transformer = module.get(TransformerService);
    streamDataFetcher = module.get(StreamDataFetcherService);
    streamDataCache = module.get(StreamDataCacheService);
    clientStateManager = module.get(StreamClientStateManager);
  });

  describe('服务初始化', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
    });

    it('应该设置批量处理管道', () => {
      expect(mockLogger.log).toHaveBeenCalledWith('StreamReceiver 重构完成 - 集成 StreamDataFetcher 架构');
    });

    it('应该设置订阅变更监听器', () => {
      expect(mockClientStateManager.addSubscriptionChangeListener).toHaveBeenCalled();
    });
  });

  describe('流数据订阅', () => {
    const mockSubscribeDto: StreamSubscribeDto = {
      symbols: ['AAPL.US', '700.HK'],
      wsCapabilityType: 'stream-stock-quote',
      preferredProvider: 'longport',
    };

    const mockCallback = jest.fn();

    beforeEach(() => {
      // 设置默认的 mock 返回值
      symbolMapper.transformSymbolsForProvider.mockResolvedValue(['AAPL.US', '700.HK']);
      streamDataFetcher.establishStreamConnection.mockResolvedValue(mockStreamConnection);
      streamDataFetcher.isConnectionActive.mockReturnValue(true);
      streamDataFetcher.subscribeToSymbols.mockResolvedValue();
    });

    it('应该成功订阅流数据', async () => {
      await service.subscribeStream(mockSubscribeDto, mockCallback);

      expect(symbolMapper.transformSymbolsForProvider).toHaveBeenCalledWith(
        'longport',
        ['AAPL.US', '700.HK'],
        expect.any(String)
      );
      expect(clientStateManager.addClientSubscription).toHaveBeenCalled();
      expect(streamDataFetcher.establishStreamConnection).toHaveBeenCalled();
      expect(streamDataFetcher.subscribeToSymbols).toHaveBeenCalledWith(
        mockStreamConnection,
        ['AAPL.US', '700.HK']
      );
    });

    it('应该使用默认提供商当未指定时', async () => {
      const dtoWithoutProvider = { ...mockSubscribeDto };
      delete dtoWithoutProvider.preferredProvider;

      await service.subscribeStream(dtoWithoutProvider, mockCallback);

      expect(symbolMapper.transformSymbolsForProvider).toHaveBeenCalledWith(
        'longport',
        ['AAPL.US', '700.HK'],
        expect.any(String)
      );
    });

    it('应该复用现有的活跃连接', async () => {
      // 第一次订阅
      await service.subscribeStream(mockSubscribeDto, mockCallback);
      
      // 第二次订阅，应该复用连接
      await service.subscribeStream(mockSubscribeDto, jest.fn());

      expect(streamDataFetcher.establishStreamConnection).toHaveBeenCalledTimes(1);
      expect(streamDataFetcher.subscribeToSymbols).toHaveBeenCalledTimes(2);
    });

    it('应该处理符号映射失败', async () => {
      symbolMapper.transformSymbolsForProvider.mockResolvedValue(['AAPL.US', 'FAILED_SYMBOL']);
      
      await service.subscribeStream(mockSubscribeDto, mockCallback);

      expect(mockLogger.warn).not.toHaveBeenCalled(); // 符号映射成功，不应该有警告
    });

    it('应该处理订阅错误', async () => {
      const error = new Error('Subscription failed');
      streamDataFetcher.subscribeToSymbols.mockRejectedValue(error);

      await expect(service.subscribeStream(mockSubscribeDto, mockCallback)).rejects.toThrow('Subscription failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '流数据订阅失败',
        expect.objectContaining({
          error: 'Subscription failed',
        })
      );
    });
  });

  describe('流数据取消订阅', () => {
    const mockUnsubscribeDto: StreamUnsubscribeDto = {
      symbols: ['AAPL.US'],
    };

    beforeEach(() => {
      mockClientStateManager.getClientSubscription.mockReturnValue({
        clientId: 'temp_client_id',
        symbols: new Set(['AAPL.US', '700.HK']),
        wsCapabilityType: 'stream-stock-quote',
        providerName: 'longport',
        subscriptionTime: Date.now(),
        lastActiveTime: Date.now(),
      });
      symbolMapper.transformSymbolsForProvider.mockResolvedValue(['AAPL.US']);
      streamDataFetcher.unsubscribeFromSymbols.mockResolvedValue();
    });

    it('应该成功取消订阅指定符号', async () => {
      await service.unsubscribeStream(mockUnsubscribeDto);

      expect(mockClientStateManager.getClientSubscription).toHaveBeenCalledWith('temp_client_id');
      expect(symbolMapper.transformSymbolsForProvider).toHaveBeenCalledWith(
        'longport',
        ['AAPL.US'],
        expect.any(String)
      );
      expect(streamDataFetcher.unsubscribeFromSymbols).toHaveBeenCalled();
      expect(mockClientStateManager.removeClientSubscription).toHaveBeenCalledWith(
        'temp_client_id',
        ['AAPL.US']
      );
    });

    it('应该取消订阅所有符号当未指定时', async () => {
      mockClientStateManager.getClientSymbols.mockReturnValue(['AAPL.US', '700.HK']);
      
      const dtoWithoutSymbols: StreamUnsubscribeDto = {};
      await service.unsubscribeStream(dtoWithoutSymbols);

      expect(mockClientStateManager.getClientSymbols).toHaveBeenCalledWith('temp_client_id');
      expect(streamDataFetcher.unsubscribeFromSymbols).toHaveBeenCalled();
    });

    it('应该处理客户端订阅不存在的情况', async () => {
      mockClientStateManager.getClientSubscription.mockReturnValue(null);

      await service.unsubscribeStream(mockUnsubscribeDto);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '客户端订阅不存在',
        { clientId: 'temp_client_id' }
      );
      expect(streamDataFetcher.unsubscribeFromSymbols).not.toHaveBeenCalled();
    });
  });

  describe('数据处理管道', () => {
    beforeEach(() => {
      const mockTransformResult = new TransformResponseDto(
        [
          { symbol: 'AAPL.US', price: 150.25, volume: 1000 },
          { symbol: '700.HK', price: 320.80, volume: 2000 },
        ],
        new TransformationMetadataDto('rule-1', 'test-rule', 'longport', 'quote_fields', 2, 3, 50)
      );
      
      transformer.transform.mockResolvedValue(mockTransformResult);
      streamDataCache.setData.mockResolvedValue();
      clientStateManager.broadcastToSymbolSubscribers.mockImplementation(() => {});
    });

    it('应该处理接收到的流数据', (done) => {
      const mockRawData = {
        symbol: 'AAPL.US',
        last_done: 150.25,
        volume: 1000,
      };

      // 模拟数据接收
      const service_: any = service;
      service_.handleIncomingData(mockRawData, 'longport', 'stream-stock-quote');

      // 等待批量处理完成
      setTimeout(() => {
        expect(transformer.transform).toHaveBeenCalled();
        done();
      }, 150); // 等待超过100ms的批量处理窗口
    });

    it('应该正确提取数据中的符号', () => {
      const service_: any = service;
      
      // 测试不同的数据格式
      expect(service_.extractSymbolsFromData({ symbol: 'AAPL.US' })).toEqual(['AAPL.US']);
      expect(service_.extractSymbolsFromData({ symbols: ['AAPL.US', '700.HK'] })).toEqual(['AAPL.US', '700.HK']);
      expect(service_.extractSymbolsFromData({ quote: { symbol: '700.HK' } })).toEqual(['700.HK']);
      expect(service_.extractSymbolsFromData([{ symbol: 'AAPL.US' }, { s: '700.HK' }])).toEqual(['AAPL.US', '700.HK']);
      expect(service_.extractSymbolsFromData(null)).toEqual([]);
    });

    it('应该按提供商和能力分组批量数据', () => {
      const service_: any = service;
      const batch = [
        { providerName: 'longport', wsCapabilityType: 'stream-stock-quote', rawData: {}, timestamp: Date.now(), symbols: [] },
        { providerName: 'longport', wsCapabilityType: 'stream-stock-quote', rawData: {}, timestamp: Date.now(), symbols: [] },
        { providerName: 'itick', wsCapabilityType: 'stream-stock-quote', rawData: {}, timestamp: Date.now(), symbols: [] },
      ];

      const grouped = service_.groupBatchByProviderCapability(batch);

      expect(grouped['longport:stream-stock-quote']).toHaveLength(2);
      expect(grouped['itick:stream-stock-quote']).toHaveLength(1);
    });
  });

  describe('健康检查和统计', () => {
    beforeEach(() => {
      mockClientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 5,
        totalSubscriptions: 5,
        totalSymbols: 10,
        clientsByProvider: { longport: 3, itick: 2 },
        symbolDistribution: { 'AAPL.US': 3, '700.HK': 2 },
      });

      mockStreamDataCache.getCacheStats.mockReturnValue({
        hotCacheHits: 100,
        hotCacheMisses: 20,
        warmCacheHits: 50,
        warmCacheMisses: 10,
        totalSize: 150,
        compressionRatio: 0.7,
      });

      mockStreamDataFetcher.getConnectionStatsByProvider.mockReturnValue({
        longport: { connections: 2, active: 2 },
        itick: { connections: 1, active: 1 },
      });

      mockStreamDataFetcher.batchHealthCheck.mockResolvedValue({
        'longport:stream-stock-quote': true,
        'itick:stream-stock-quote': true,
      });
    });

    it('应该返回客户端统计信息', () => {
      const stats = service.getClientStats();

      expect(stats).toHaveProperty('clients');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('connections');
      expect(stats).toHaveProperty('batchProcessing');
      expect(stats.clients.totalClients).toBe(5);
    });

    it('应该返回健康检查状态', async () => {
      const health = await service.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('connections');
      expect(health).toHaveProperty('clients');
      expect(health).toHaveProperty('cacheHitRate');
      expect(health.status).toBe('healthy');
      expect(health.connections).toBe(2);
      expect(health.clients).toBe(5);
    });

    it('应该在连接不健康时返回降级状态', async () => {
      mockStreamDataFetcher.batchHealthCheck.mockResolvedValue({
        'longport:stream-stock-quote': true,
        'itick:stream-stock-quote': false,
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
    });

    it('应该正确计算缓存命中率', async () => {
      const health = await service.healthCheck();

      // 缓存命中率 = (热缓存命中 + 温缓存命中) / (所有请求)
      // (100 + 50) / (100 + 20 + 50 + 10) = 150/180 = 0.83
      expect(health.cacheHitRate).toBeCloseTo(0.83, 2);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据处理过程中的错误', () => {
      const service_: any = service;
      const invalidData = undefined;

      expect(() => {
        service_.handleIncomingData(invalidData, 'longport', 'stream-stock-quote');
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '数据处理失败',
        expect.objectContaining({
          provider: 'longport',
          capability: 'stream-stock-quote',
        })
      );
    });

    it('应该处理批量处理错误', async () => {
      const error = new Error('Transform failed');
      transformer.transform.mockRejectedValue(error);

      const service_: any = service;
      const mockQuotes = [{
        rawData: { symbol: 'AAPL.US' },
        providerName: 'longport',
        wsCapabilityType: 'stream-stock-quote',
        timestamp: Date.now(),
        symbols: ['AAPL.US'],
      }];

      await service_.processQuoteGroup(mockQuotes, 'longport', 'stream-stock-quote');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '报价组处理失败',
        expect.objectContaining({
          provider: 'longport',
          capability: 'stream-stock-quote',
          error: 'Transform failed',
        })
      );
    });
  });

  describe('连接管理', () => {
    it('应该创建新的流连接', async () => {
      streamDataFetcher.isConnectionActive.mockReturnValue(false);
      
      const service_: any = service;
      const connection = await service_.getOrCreateConnection(
        'longport',
        'stream-stock-quote',
        'test-request-id'
      );

      expect(streamDataFetcher.establishStreamConnection).toHaveBeenCalledWith({
        provider: 'longport',
        capability: 'stream-stock-quote',
        contextService: { requestId: 'test-request-id', provider: 'longport' },
        requestId: 'test-request-id',
        options: {
          autoReconnect: true,
          maxReconnectAttempts: 3,
          heartbeatIntervalMs: 30000,
        },
      });

      expect(connection).toBe(mockStreamConnection);
    });

    it('应该设置数据接收处理器', () => {
      const service_: any = service;
      service_.setupDataReceiving(mockStreamConnection, 'longport', 'stream-stock-quote');

      expect(mockStreamConnection.onData).toHaveBeenCalled();
      expect(mockStreamConnection.onError).toHaveBeenCalled();
      expect(mockStreamConnection.onStatusChange).toHaveBeenCalled();
    });
  });
});