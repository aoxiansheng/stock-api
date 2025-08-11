import { Test, TestingModule } from '@nestjs/testing';
import { createLogger } from '@common/config/logger.config';
import { StreamReceiverService } from '../../../../../src/core/stream-receiver/stream-receiver.service';
import { CapabilityRegistryService } from '../../../../../src/providers/services/capability-registry.service';
import { SymbolMapperService } from '../../../../../src/core/symbol-mapper/services/symbol-mapper.service';
import { TransformerService } from '../../../../../src/core/transformer/services/transformer.service';
import { StreamSubscribeDto, StreamUnsubscribeDto } from '../../../../../src/core/stream-receiver/dto';
import { FlexibleMappingRuleService } from '../../../../../src/core/data-mapper/services/flexible-mapping-rule.service';
import { BatchOptimizationService } from '../../../../../src/core/shared/services/batch-optimization.service';
import { FeatureFlags } from '../../../../../src/common/config/feature-flags.config';
import { StreamPerformanceMetrics } from '../../../../../src/core/shared/services/stream-performance-metrics.service';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock services
const mockCapabilityRegistry = {
  getBestStreamProvider: jest.fn(),
  getStreamCapability: jest.fn(),
  getProvider: jest.fn(),
};

const mockSymbolMapperService = {
  transformSymbols: jest.fn(),
  mapSymbol: jest.fn(), // 添加 mapSymbol Mock
};

const mockTransformerService = {
  transform: jest.fn(),
};

// Mock capability and provider
const mockCapability = {
  isConnected: jest.fn(),
  initialize: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  cleanup: jest.fn(),
};

const mockContextService = {
  onQuoteUpdate: jest.fn(),
  initializeWebSocket: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

const mockProvider = {
  getStreamContextService: jest.fn().mockReturnValue(mockContextService),
};

describe('StreamReceiverService', () => {
  let service: StreamReceiverService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistry,
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
          provide: FlexibleMappingRuleService,
          useValue: {
            findBestMatchingRule: jest.fn().mockResolvedValue({
              name: 'test-rule',
              fieldMappings: [
                { sourceFieldPath: 'symbol', targetField: 'symbol' },
                { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
                { sourceFieldPath: 'volume', targetField: 'volume' },
              ],
            }),
          },
        },
        {
          provide: BatchOptimizationService,
          useValue: {
            getBatchSize: jest.fn().mockReturnValue(100),
            getBatchInterval: jest.fn().mockReturnValue(50),
          },
        },
        {
          provide: FeatureFlags,
          useValue: {
            symbolMappingCacheEnabled: true,
            dataTransformCacheEnabled: true,
            batchProcessingEnabled: true,
            objectPoolEnabled: true,
            ruleCompilationEnabled: true,
            dynamicLogLevelEnabled: true,
            metricsLegacyModeEnabled: true,
            symbolCacheMaxSize: 2000,
            symbolCacheTtl: 5 * 60 * 1000,
            ruleCacheMaxSize: 100,
            ruleCacheTtl: 10 * 60 * 1000,
            objectPoolSize: 100,
            batchSizeThreshold: 10,
            batchTimeWindowMs: 1,
            getAllFlags: jest.fn().mockReturnValue({
              symbolMappingCacheEnabled: true,
              dataTransformCacheEnabled: true,
              batchProcessingEnabled: true,
            }),
            isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
            isPerformanceOptimizationEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: StreamPerformanceMetrics,
          useValue: {
            recordBatchProcessing: jest.fn(),
            recordQuoteProcessing: jest.fn(),
            recordRuleCompilation: jest.fn(),
            recordError: jest.fn(), // 记录错误
            recordSymbolProcessed: jest.fn(), // 记录符号处理
            recordCacheAccess: jest.fn(), // 记录缓存访问
            recordRuleCompiled: jest.fn(), // 记录规则编译
            recordBatchProcessed: jest.fn(), // 记录批量处理
            recordBatchPreloadCacheHit: jest.fn(), // 记录批量预加载缓存命中
            getDetailedPerformanceReport: jest.fn().mockResolvedValue({
              stats: {},
              percentiles: {},
              prometheusMetrics: '',
              timestamp: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
  });

  describe('subscribeSymbols()', () => {
    const clientId = 'test-client-123';
    const subscribeDto: StreamSubscribeDto = {
      symbols: ['700.HK', 'AAPL.US'],
      wsCapabilityType: 'stream-stock-quote',
    };
    const messageCallback = jest.fn();

    beforeEach(() => {
      // Default mocks setup
      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 默认设置：大部分测试需要成功的初始化
      // 第一次检查未连接，初始化后连接成功
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);
      mockCapability.unsubscribe.mockResolvedValue(undefined);
      mockCapability.cleanup.mockResolvedValue(undefined);
    });

    it('should subscribe to symbols successfully', async () => {
      // Execute - 使用默认的Mock设置
      // 临时禁用批量处理以测试传统消息处理模式
      (service as any).featureFlags.batchProcessingEnabled = false;
      
      await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

      // Verify
      expect(mockCapabilityRegistry.getBestStreamProvider).toHaveBeenCalledWith('stream-stock-quote', 'HK');
      expect(mockCapabilityRegistry.getStreamCapability).toHaveBeenCalledWith('longport', 'stream-stock-quote');
      expect(mockCapabilityRegistry.getProvider).toHaveBeenCalledWith('longport');
      expect(mockSymbolMapperService.transformSymbols).toHaveBeenCalledWith('longport', ['700.HK', 'AAPL.US']);
      expect(mockCapability.initialize).toHaveBeenCalledWith(mockContextService);
      expect(mockContextService.onQuoteUpdate).toHaveBeenCalledWith(expect.any(Function));
      expect(mockCapability.subscribe).toHaveBeenCalledWith(['00700', 'AAPL'], mockContextService);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket 订阅成功',
        clientId,
        symbols: subscribeDto.symbols,
        provider: 'longport',
        capability: 'stream-stock-quote',
      });
    });

    it('should use preferred provider when specified', async () => {
      // Setup
      const subscribeWithProvider: StreamSubscribeDto = {
        ...subscribeDto,
        preferredProvider: 'longport-sg',
      };
      
      // 重置Mock以确保初始化成功
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);

      // Execute
      await service.subscribeSymbols(clientId, subscribeWithProvider, messageCallback);

      // Verify
      expect(mockCapabilityRegistry.getBestStreamProvider).not.toHaveBeenCalled();
      expect(mockCapabilityRegistry.getStreamCapability).toHaveBeenCalledWith('longport-sg', 'stream-stock-quote');
    });

    it('should skip initialization if already connected', async () => {
      // Setup - 重置Mock配置：已连接状态，跳过初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected.mockReturnValue(true); // 始终返回已连接状态
      mockCapability.initialize.mockReset();
      mockCapability.subscribe.mockResolvedValue(undefined);

      // Execute
      // 临时禁用批量处理以测试传统消息处理模式
      (service as any).featureFlags.batchProcessingEnabled = false;
      
      await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

      // Verify
      expect(mockCapability.initialize).not.toHaveBeenCalled();
      expect(mockCapability.subscribe).toHaveBeenCalled();
    });

    it('should throw error when no provider found', async () => {
      // Setup
      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue(null);

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('未找到支持 stream-stock-quote 能力的数据提供商');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 订阅失败',
        clientId,
        symbols: subscribeDto.symbols,
        error: '未找到支持 stream-stock-quote 能力的数据提供商',
      });
    });

    it('should throw error when capability not found', async () => {
      // Setup
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(null);

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('提供商 longport 不支持 stream-stock-quote 流能力');
    });

    it('should throw error when context service not available', async () => {
      // Setup
      mockProvider.getStreamContextService.mockReturnValue(null);

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('提供商 longport 未提供流上下文服务');
    });

    it('should handle symbol mapping failure', async () => {
      // Setup - 确保能到达符号映射步骤
      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockRejectedValue(new Error('Symbol mapping failed'));

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('Symbol mapping failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 订阅失败',
        clientId,
        symbols: subscribeDto.symbols,
        error: 'Symbol mapping failed',
      });
    });

    it('should handle capability initialization failure', async () => {
      // Setup - 确保能到达初始化步骤
      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      }); // 确保符号映射成功
      mockCapability.isConnected.mockReturnValue(false); // 确保需要初始化
      mockCapability.initialize.mockRejectedValue(new Error('Initialization failed'));

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('Initialization failed');
    });

    it('should handle subscription failure', async () => {
      // Setup - 确保能到达订阅步骤
      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      }); // 确保符号映射成功
      // 重置并设置正确的Mock：初始化成功，但订阅失败
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined); // 确保初始化成功
      mockCapability.subscribe.mockRejectedValue(new Error('Subscription failed'));

      // Execute & Verify
      await expect(service.subscribeSymbols(clientId, subscribeDto, messageCallback))
        .rejects.toThrow('Subscription failed');
    });

    it('should infer markets correctly for different symbol formats', async () => {
      // Test cases for different markets
      const testCases = [
        { symbols: ['700.HK'], expectedMarket: 'HK' },
        { symbols: ['00700'], expectedMarket: 'HK' },
        { symbols: ['AAPL.US'], expectedMarket: 'US' },
        { symbols: ['AAPL'], expectedMarket: 'US' },
        { symbols: ['000001.SZ'], expectedMarket: 'SZ' },
        { symbols: ['000001'], expectedMarket: 'SZ' },
        { symbols: ['600000.SH'], expectedMarket: 'SH' },
        { symbols: ['600000'], expectedMarket: 'SH' },
        { symbols: ['TEST.SG'], expectedMarket: 'SG' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
        mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
        mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
        mockSymbolMapperService.transformSymbols.mockResolvedValue({
          transformedSymbols: { [testCase.symbols[0]]: testCase.symbols[0].replace('.HK', '').replace('.US', '').replace('.SZ', '').replace('.SH', '').replace('.SG', '') },
          failedSymbols: [],
          processingTimeMs: 10,
          dataSourceName: 'longport'
        });
        // 重置并设置正确的Mock：需要初始化
        mockCapability.isConnected.mockReset();
        mockCapability.isConnected
          .mockReturnValueOnce(false)  // 第一次检查：未连接
          .mockReturnValue(true);      // 初始化后检查：已连接
        mockCapability.initialize.mockResolvedValue(undefined);
        mockCapability.subscribe.mockResolvedValue(undefined);

        const dto: StreamSubscribeDto = {
          symbols: testCase.symbols,
          wsCapabilityType: 'stream-stock-quote',
        };

        await service.subscribeSymbols(clientId + testCase.expectedMarket, dto, messageCallback);

        expect(mockCapabilityRegistry.getBestStreamProvider).toHaveBeenCalledWith(
          'stream-stock-quote',
          testCase.expectedMarket
        );
      }
    });
  });

  describe('unsubscribeSymbols()', () => {
    const clientId = 'test-client-123';
    const unsubscribeDto: StreamUnsubscribeDto = {
      symbols: ['700.HK', 'AAPL.US'],
      wsCapabilityType: 'stream-stock-quote',
    };

    beforeEach(async () => {
      // Setup initial subscription
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK', 'AAPL.US', 'TSLA.US'],
        wsCapabilityType: 'stream-stock-quote',
      };

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL', 'TSLA.US': 'TSLA' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      await service.subscribeSymbols(clientId, subscribeDto, jest.fn());
      jest.clearAllMocks();
    });

    it('should unsubscribe from symbols successfully', async () => {
      // Setup
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      mockCapability.unsubscribe.mockResolvedValue(undefined);

      // Execute
      await service.unsubscribeSymbols(clientId, unsubscribeDto);

      // Verify
      expect(mockSymbolMapperService.transformSymbols).toHaveBeenCalledWith('longport', ['700.HK', 'AAPL.US']);
      expect(mockCapability.unsubscribe).toHaveBeenCalledWith(['00700', 'AAPL'], mockContextService);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket 取消订阅成功',
        clientId,
        symbols: unsubscribeDto.symbols,
        provider: 'longport',
      });
    });

    it('should cleanup client subscription when no symbols remain', async () => {
      // Setup - unsubscribe all symbols
      const unsubscribeAllDto: StreamUnsubscribeDto = {
        symbols: ['700.HK', 'AAPL.US', 'TSLA.US'],
        wsCapabilityType: 'stream-stock-quote',
      };
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL', 'TSLA.US': 'TSLA' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      mockCapability.unsubscribe.mockResolvedValue(undefined);
      mockCapability.cleanup.mockResolvedValue(undefined);

      // Execute
      await service.unsubscribeSymbols(clientId, unsubscribeAllDto);

      // Verify
      expect(mockCapability.cleanup).toHaveBeenCalledTimes(1);
      expect(service.getClientSubscription(clientId)).toBeUndefined();
    });

    it('should warn when client has no active subscription', async () => {
      // Setup - unknown client
      const unknownClientId = 'unknown-client';

      // Execute
      await service.unsubscribeSymbols(unknownClientId, unsubscribeDto);

      // Verify
      expect(mockLogger.warn).toHaveBeenCalledWith(`客户端 ${unknownClientId} 没有活跃的订阅`);
      expect(mockCapability.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle symbol mapping failure during unsubscription', async () => {
      // Setup
      mockSymbolMapperService.transformSymbols.mockRejectedValue(new Error('Mapping failed'));

      // Execute & Verify
      await expect(service.unsubscribeSymbols(clientId, unsubscribeDto))
        .rejects.toThrow('Mapping failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 取消订阅失败',
        clientId,
        error: 'Mapping failed',
      });
    });

    it('should handle unsubscription failure', async () => {
      // Setup
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      mockCapability.unsubscribe.mockRejectedValue(new Error('Unsubscription failed'));

      // Execute & Verify
      await expect(service.unsubscribeSymbols(clientId, unsubscribeDto))
        .rejects.toThrow('Unsubscription failed');
    });
  });

  describe('cleanupClientSubscription()', () => {
    const clientId = 'test-client-123';

    beforeEach(async () => {
      // Setup initial subscription
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      await service.subscribeSymbols(clientId, subscribeDto, jest.fn());
      jest.clearAllMocks();
    });

    it('should cleanup client subscription successfully', async () => {
      // Setup
      mockCapability.cleanup.mockResolvedValue(undefined);

      // Execute
      await service.cleanupClientSubscription(clientId);

      // Verify
      expect(mockCapability.cleanup).toHaveBeenCalledTimes(1);
      expect(service.getClientSubscription(clientId)).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(`已清理客户端 ${clientId} 的订阅`);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Setup
      mockCapability.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      // Execute
      await service.cleanupClientSubscription(clientId);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: '清理客户端订阅失败',
        clientId,
        error: 'Cleanup failed',
      });
    });

    it('should handle cleanup for non-existent client gracefully', async () => {
      // Execute
      await service.cleanupClientSubscription('non-existent-client');

      // Verify - should not throw error
      expect(mockCapability.cleanup).not.toHaveBeenCalled();
    });
  });

  describe('getClientSubscription()', () => {
    it('should return undefined for non-existent client', () => {
      // Execute & Verify
      expect(service.getClientSubscription('non-existent')).toBeUndefined();
    });

    it('should return subscription for existing client', async () => {
      // Setup
      const clientId = 'test-client-123';
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockProvider.getStreamContextService.mockReturnValue(mockContextService); // 确保contextService可用
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      await service.subscribeSymbols(clientId, subscribeDto, jest.fn());

      // Execute
      const subscription = service.getClientSubscription(clientId);

      // Verify
      expect(subscription).toBeDefined();
      expect(subscription?.clientId).toBe(clientId);
      expect(subscription?.wsCapabilityType).toBe('stream-stock-quote');
      expect(subscription?.providerName).toBe('longport');
    });
  });

  describe('Message Handling', () => {
    const clientId = 'test-client-123';

    // 在消息处理测试中临时禁用批量处理，以测试直接的消息处理逻辑
    // 注意：每个测试需要个别设置 featureFlags

    it('should handle provider messages and transform data', async () => {
      // Setup
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };
      const messageCallback = jest.fn();

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      // 临时禁用批量处理以测试传统消息处理模式
      (service as any).featureFlags.batchProcessingEnabled = false;
      
      await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

      // Get the callback that was set on the context service
      const onQuoteUpdateCall = mockContextService.onQuoteUpdate.mock.calls[0];
      const providerMessageHandler = onQuoteUpdateCall[0];

      // Setup additional mocks needed for message processing
      mockSymbolMapperService.mapSymbol.mockResolvedValue('700.HK'); // 符号映射返回标准格式
      
      // Setup transformer
      const rawData = {
        symbol: '00700',
        last_done: 350.5,
        volume: 1000,
      };
      const transformedData = {
        symbol: '700.HK',
        lastPrice: 350.5,
        volume: 1000,
      };
      mockTransformerService.transform.mockResolvedValue({ transformedData });

      // Execute
      await providerMessageHandler(rawData);

      // Verify
      expect(mockTransformerService.transform).toHaveBeenCalledWith({
        rawData,
        provider: 'longport',
        apiType: 'stream',
        transDataRuleListType: 'quote_fields',
      });
      expect(messageCallback).toHaveBeenCalledWith({
        symbols: ['700.HK'], // 使用标准化后的符号
        data: transformedData,
        timestamp: expect.any(Number),
        provider: 'longport',
        capability: 'stream-stock-quote',
        processingChain: {
          symbolMapped: true,
          mappingRulesUsed: true,
          dataTransformed: true,
        },
      });
    });

    it('should handle transformer errors gracefully', async () => {
      // Setup
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };
      const messageCallback = jest.fn();

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      // 临时禁用批量处理以测试传统消息处理模式
      (service as any).featureFlags.batchProcessingEnabled = false;
      
      await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

      // Get the callback
      const providerMessageHandler = mockContextService.onQuoteUpdate.mock.calls[0][0];

      // Setup additional mocks needed for message processing
      mockSymbolMapperService.mapSymbol.mockResolvedValue('700.HK'); // 符号映射返回标准格式
      
      // Setup transformer to fail
      mockTransformerService.transform.mockRejectedValue(new Error('Transform failed'));

      // Execute
      await providerMessageHandler({ symbol: '00700' });

      // Verify - Service 会使用基础数据标准化作为后备，所以仍然会调用回调
      expect(messageCallback).toHaveBeenCalledWith({
        symbols: ['700.HK'],
        data: expect.objectContaining({
          symbol: '700.HK',
          _provider: 'unknown', // 基础数据标准化的特征
          _raw: { symbol: '00700' },
        }),
        timestamp: expect.any(Number),
        provider: 'longport',
        capability: 'stream-stock-quote',
        processingChain: expect.objectContaining({
          symbolMapped: true,
          mappingRulesUsed: true,
          dataTransformed: true,
        }),
      });
      // 应该记录转换失败的错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('转换失败'),
        provider: 'longport',
        error: 'Transform failed',
      }));
    });

    it('should handle array data from transformer', async () => {
      // Setup
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK', 'AAPL.US'],
        wsCapabilityType: 'stream-stock-quote',
      };
      const messageCallback = jest.fn();

      mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
      mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
      mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
      mockSymbolMapperService.transformSymbols.mockResolvedValue({
        transformedSymbols: { '700.HK': '00700', 'AAPL.US': 'AAPL' },
        failedSymbols: [],
        processingTimeMs: 10,
        dataSourceName: 'longport'
      });
      // 重置并设置正确的Mock：需要初始化
      mockCapability.isConnected.mockReset();
      mockCapability.isConnected
        .mockReturnValueOnce(false)  // 第一次检查：未连接
        .mockReturnValue(true);      // 初始化后检查：已连接
      mockCapability.initialize.mockResolvedValue(undefined);
      mockCapability.subscribe.mockResolvedValue(undefined);

      // 临时禁用批量处理以测试传统消息处理模式
      (service as any).featureFlags.batchProcessingEnabled = false;
      
      await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

      // Get the callback
      const providerMessageHandler = mockContextService.onQuoteUpdate.mock.calls[0][0];

      // Setup additional mocks needed for message processing
      mockSymbolMapperService.mapSymbol.mockResolvedValue('700.HK'); // 符号映射返回标准格式
      
      // Setup transformer to return array
      const transformedData = [
        { symbol: '700.HK', lastPrice: 350.5 },
        { symbol: '700.HK', lastPrice: 150.0 }, // 所有数组元素都会被设置为相同的标准化符号
      ];
      mockTransformerService.transform.mockResolvedValue({ transformedData });

      // Execute
      await providerMessageHandler({ symbol: '00700', data: 'batch' });

      // Verify
      expect(messageCallback).toHaveBeenCalledWith({
        symbols: ['700.HK', '700.HK'], // 所有数组元素都使用相同的标准化符号
        data: transformedData,
        timestamp: expect.any(Number),
        provider: 'longport',
        capability: 'stream-stock-quote',
        processingChain: {
          symbolMapped: true,
          mappingRulesUsed: true,
          dataTransformed: true,
        },
      });
    });
  });

  describe('Data Rule Type Mapping', () => {
    // 在数据规则类型映射测试中临时禁用批量处理
    // 注意：每个测试需要个别设置 featureFlags

    it('should map capability types to data rule list types correctly', async () => {
      const testCases = [
        { wsCapabilityType: 'stream-stock-quote', expectedRuleType: 'quote_fields' },
        { wsCapabilityType: 'stream-stock-basic-info', expectedRuleType: 'basic_info_fields' },
        { wsCapabilityType: 'stream-index-quote', expectedRuleType: 'index_fields' },
        { wsCapabilityType: 'unknown-capability', expectedRuleType: 'quote_fields' }, // default
      ];

      for (const testCase of testCases) {
        // Setup
        const clientId = `test-client-${testCase.wsCapabilityType}`;
        const subscribeDto: StreamSubscribeDto = {
          symbols: ['700.HK'],
          wsCapabilityType: testCase.wsCapabilityType,
        };
        const messageCallback = jest.fn();

        mockCapabilityRegistry.getBestStreamProvider.mockReturnValue('longport');
        mockCapabilityRegistry.getStreamCapability.mockReturnValue(mockCapability);
        mockCapabilityRegistry.getProvider.mockReturnValue(mockProvider);
        mockSymbolMapperService.transformSymbols.mockResolvedValue({
          transformedSymbols: { '700.HK': '00700' },
          failedSymbols: [],
          processingTimeMs: 10,
          dataSourceName: 'longport'
        });
        // 重置并设置正确的Mock：需要初始化
        mockCapability.isConnected.mockReset();
        mockCapability.isConnected
          .mockReturnValueOnce(false)  // 第一次检查：未连接
          .mockReturnValue(true);      // 初始化后检查：已连接
        mockCapability.initialize.mockResolvedValue(undefined);
        mockCapability.subscribe.mockResolvedValue(undefined);

        // 临时禁用批量处理以测试传统消息处理模式
        (service as any).featureFlags.batchProcessingEnabled = false;
        
        await service.subscribeSymbols(clientId, subscribeDto, messageCallback);

        // Get the callback and execute it
        const providerMessageHandler = mockContextService.onQuoteUpdate.mock.calls[0][0];
        
        // Setup additional mocks needed for message processing
        mockSymbolMapperService.mapSymbol.mockResolvedValue('700.HK');
        mockTransformerService.transform.mockResolvedValue({ transformedData: { symbol: '700.HK' } });

        await providerMessageHandler({ symbol: '00700' });

        // Verify
        expect(mockTransformerService.transform).toHaveBeenCalledWith({
          rawData: { symbol: '00700' },
          provider: 'longport',
          apiType: 'stream',
          transDataRuleListType: testCase.expectedRuleType,
        });

        jest.clearAllMocks();
      }
    });
  });
});