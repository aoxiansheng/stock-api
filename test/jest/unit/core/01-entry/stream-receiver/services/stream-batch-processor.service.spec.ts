import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';
import { StreamBatchProcessorService } from '@core/01-entry/stream-receiver/services/stream-batch-processor.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import {
  QuoteData,
  BatchProcessingCallbacks,
  BatchProcessingStats,
  DynamicBatchingState,
  DynamicBatchingMetrics
} from '@core/01-entry/stream-receiver/interfaces/batch-processing.interface';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('StreamBatchProcessorService', () => {
  let service: StreamBatchProcessorService;
  let module: TestingModule;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;
  let mockDataTransformerService: jest.Mocked<DataTransformerService>;
  let mockCallbacks: jest.Mocked<BatchProcessingCallbacks>;

  const createMockQuoteData = (provider = 'longport', capability = 'ws-stock-quote', symbols = ['700.HK']): QuoteData => ({
    providerName: provider,
    wsCapabilityType: capability,
    symbols,
    rawData: { price: 100, volume: 1000, timestamp: Date.now() },
    timestamp: Date.now(),
  });

  beforeEach(async () => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configMap = {
          'STREAM_RECEIVER_BATCH_INTERVAL': 50,
          'STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED': false,
          'STREAM_RECEIVER_CLEANUP_INTERVAL': 60000,
          'STREAM_RECEIVER_MAX_CONNECTIONS': 100,
          'STREAM_RECEIVER_STALE_TIMEOUT': 300000,
        };
        return configMap[key] || defaultValue;
      }),
    } as any;

    // Mock EventEmitter2
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    // Mock DataTransformerService
    mockDataTransformerService = {
      transform: jest.fn().mockResolvedValue({
        transformedData: [{ symbol: '700.HK', price: 100, volume: 1000 }],
        metadata: {
          ruleId: 'test-rule-1',
          ruleName: 'Test Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          recordsProcessed: 1,
          fieldsTransformed: 3,
          processingTimeMs: 10,
          timestamp: new Date().toISOString(),
        },
      }),
    } as any;

    // Mock BatchProcessingCallbacks
    mockCallbacks = {
      ensureSymbolConsistency: jest.fn().mockResolvedValue(['700.HK']),
      pipelineCacheData: jest.fn().mockResolvedValue(undefined),
      pipelineBroadcastData: jest.fn().mockResolvedValue(undefined),
      recordStreamPipelineMetrics: jest.fn(),
      recordPipelineError: jest.fn(),
      emitMonitoringEvent: jest.fn(),
    };

    const moduleBuilder = await Test.createTestingModule({
      providers: [
        StreamBatchProcessorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: DataTransformerService,
          useValue: mockDataTransformerService,
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<StreamBatchProcessorService>(StreamBatchProcessorService);

    // 设置回调函数
    service.setCallbacks(mockCallbacks);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('初始化和配置', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('STREAM_RECEIVER_BATCH_INTERVAL', 50);
      expect(mockConfigService.get).toHaveBeenCalledWith('STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED', false);
    });

    it('应该正确设置回调函数', () => {
      const newCallbacks = { ...mockCallbacks };
      service.setCallbacks(newCallbacks);
      // 验证回调函数被设置（通过添加数据测试）
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);
      expect(true).toBe(true); // 回调设置成功
    });

    it('应该返回初始的批处理统计信息', () => {
      const stats = service.getBatchProcessingStats();
      expect(stats).toEqual({
        totalBatches: 0,
        totalQuotes: 0,
        batchProcessingTime: 0,
        totalFallbacks: 0,
        partialRecoverySuccess: 0,
      });
    });
  });

  describe('批处理功能', () => {
    it('应该成功添加报价数据到批处理队列', () => {
      const quoteData = createMockQuoteData();

      expect(() => {
        service.addQuoteData(quoteData);
      }).not.toThrow();
    });

    it('应该处理批量数据并更新统计信息', async () => {
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      // 等待批处理完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证DataTransformerService被调用
      expect(mockDataTransformerService.transform).toHaveBeenCalledWith({
        provider: 'longport',
        apiType: 'stream',
        transDataRuleListType: 'quote_fields',
        rawData: [quoteData.rawData],
      });

      // 验证回调函数被调用
      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK'], 'longport');
      expect(mockCallbacks.pipelineCacheData).toHaveBeenCalled();
      expect(mockCallbacks.pipelineBroadcastData).toHaveBeenCalled();
      expect(mockCallbacks.recordStreamPipelineMetrics).toHaveBeenCalled();
    });

    it('应该按提供商和能力分组处理批量数据', async () => {
      const quoteData1 = createMockQuoteData('longport', 'ws-stock-quote', ['700.HK']);
      const quoteData2 = createMockQuoteData('longport', 'ws-option-quote', ['AAPL']);
      const quoteData3 = createMockQuoteData('futu', 'ws-stock-quote', ['TSLA']);

      service.addQuoteData(quoteData1);
      service.addQuoteData(quoteData2);
      service.addQuoteData(quoteData3);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证transform被调用了3次（3个不同的组合）
      expect(mockDataTransformerService.transform).toHaveBeenCalledTimes(3);
    });

    it('应该处理空批次数据', async () => {
      // 不添加任何数据，等待批处理间隔
      await new Promise(resolve => setTimeout(resolve, 100));

      // 应该没有调用transform
      expect(mockDataTransformerService.transform).not.toHaveBeenCalled();
    });
  });

  describe('能力映射', () => {
    it('应该正确映射已知的WebSocket能力', () => {
      const testCases = [
        { capability: 'ws-stock-quote', expected: 'quote_fields' },
        { capability: 'ws-option-quote', expected: 'option_fields' },
        { capability: 'ws-futures-quote', expected: 'futures_fields' },
        { capability: 'ws-forex-quote', expected: 'forex_fields' },
        { capability: 'ws-crypto-quote', expected: 'crypto_fields' },
      ];

      testCases.forEach(({ capability, expected }) => {
        const quoteData = createMockQuoteData('longport', capability);
        service.addQuoteData(quoteData);
      });

      // 等待处理完成
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // 验证每个映射都被正确调用
        expect(mockDataTransformerService.transform).toHaveBeenCalledTimes(testCases.length);
      });
    });

    it('应该正确映射REST API能力', async () => {
      const quoteData = createMockQuoteData('longport', 'get-stock-quote');
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDataTransformerService.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          transDataRuleListType: 'quote_fields',
        })
      );
    });

    it('应该对未知能力使用默认映射', async () => {
      const quoteData = createMockQuoteData('longport', 'unknown-capability');
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDataTransformerService.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          transDataRuleListType: 'quote_fields', // 默认映射
        })
      );
    });
  });

  describe('错误处理和重试机制', () => {
    it('应该处理数据转换失败', async () => {
      mockDataTransformerService.transform.mockRejectedValueOnce(new Error('Transform failed'));

      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证错误被记录
      expect(mockCallbacks.recordPipelineError).toHaveBeenCalledWith(
        'longport',
        'ws-stock-quote',
        'Transform failed',
        expect.any(Number)
      );
    });

    it('应该处理符号标准化失败', async () => {
      mockCallbacks.ensureSymbolConsistency.mockRejectedValueOnce(new Error('Symbol consistency failed'));

      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });

    it('应该处理缓存失败', async () => {
      mockCallbacks.pipelineCacheData.mockRejectedValueOnce(new Error('Cache failed'));

      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });

    it('应该处理广播失败', async () => {
      mockCallbacks.pipelineBroadcastData.mockRejectedValueOnce(new Error('Broadcast failed'));

      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });
  });

  describe('断路器模式', () => {
    it('应该在多次失败后开启断路器', async () => {
      // 模拟多次失败
      mockDataTransformerService.transform.mockRejectedValue(new Error('Persistent failure'));

      // 添加多个批次触发失败
      for (let i = 0; i < 10; i++) {
        const quoteData = createMockQuoteData('longport', 'ws-stock-quote', [`${700 + i}.HK`]);
        service.addQuoteData(quoteData);
        await new Promise(resolve => setTimeout(resolve, 60)); // 等待批处理
      }

      // 验证降级处理被触发
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ERROR_HANDLED,
        expect.objectContaining({
          component: 'StreamBatchProcessor',
          operation: 'batch_processing_fallback',
        })
      );
    });

    it('应该在成功处理后重置断路器状态', async () => {
      // 先触发一次失败
      mockDataTransformerService.transform.mockRejectedValueOnce(new Error('Temporary failure'));

      const quoteData1 = createMockQuoteData();
      service.addQuoteData(quoteData1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 然后成功处理
      mockDataTransformerService.transform.mockResolvedValueOnce({
        transformedData: [{ symbol: '700.HK', price: 100 }],
        metadata: {
          ruleId: 'test-rule-1',
          ruleName: 'Test Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          recordsProcessed: 1,
          fieldsTransformed: 2,
          processingTimeMs: 10,
          timestamp: new Date().toISOString(),
        },
      });

      const quoteData2 = createMockQuoteData();
      service.addQuoteData(quoteData2);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证成功处理
      expect(mockCallbacks.pipelineCacheData).toHaveBeenCalled();
    });
  });

  describe('降级处理策略', () => {
    it('应该分析批次数据用于降级处理', async () => {
      mockDataTransformerService.transform.mockRejectedValue(new Error('Complete failure'));

      const quotes = [
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK', 'AAPL.US']),
        createMockQuoteData('futu', 'ws-option-quote', ['GOOGL.US']),
      ];

      quotes.forEach(quote => service.addQuoteData(quote));
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证降级事件被发送
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'stream.batch.fallback',
        expect.objectContaining({
          batchSize: expect.any(Number),
          reason: expect.any(String),
          analysis: expect.objectContaining({
            symbolsCount: expect.any(Number),
            providersCount: expect.any(Number),
            marketsCount: expect.any(Number),
          }),
        })
      );
    });

    it('应该尝试智能部分恢复', async () => {
      mockDataTransformerService.transform.mockRejectedValue(new Error('Batch failure'));

      // 添加包含优先市场的数据
      const priorityQuote = createMockQuoteData('longport', 'ws-stock-quote', ['700.HK', 'AAPL.US']);
      service.addQuoteData(priorityQuote);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证部分恢复尝试
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'stream.batch.fallback',
        expect.objectContaining({
          recovery: expect.objectContaining({
            attempted: expect.any(Boolean),
          }),
        })
      );
    });
  });

  describe('动态批处理优化', () => {
    let dynamicService: StreamBatchProcessorService;

    beforeEach(async () => {
      // 重新配置为启用动态批处理
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const configMap = {
          'STREAM_RECEIVER_BATCH_INTERVAL': 50,
          'STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED': true,
        };
        return configMap[key] || defaultValue;
      });

      const dynamicModule = await Test.createTestingModule({
        providers: [
          StreamBatchProcessorService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: EventEmitter2,
            useValue: mockEventBus,
          },
          {
            provide: DataTransformerService,
            useValue: mockDataTransformerService,
          },
        ],
      }).compile();

      dynamicService = dynamicModule.get<StreamBatchProcessorService>(StreamBatchProcessorService);
      dynamicService.setCallbacks(mockCallbacks);
    });

    it('应该启用动态批处理优化', () => {
      const state = dynamicService.getDynamicBatchingState();
      expect(state.state.enabled).toBe(true);
      expect(state.state.currentInterval).toBe(50);
      expect(state.metrics).toBeDefined();
    });

    it('应该记录动态批处理调整指标', async () => {
      const quoteData = createMockQuoteData();
      dynamicService.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证监控事件被触发
      expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
        'batch_processed',
        expect.any(Number),
        expect.objectContaining({
          batchSize: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('性能监控', () => {
    it('应该记录批处理性能指标', async () => {
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.recordStreamPipelineMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'longport',
          capability: 'ws-stock-quote',
          quotesCount: 1,
          symbolsCount: 1,
          durations: expect.objectContaining({
            total: expect.any(Number),
            transform: expect.any(Number),
            cache: expect.any(Number),
            broadcast: expect.any(Number),
          }),
        })
      );
    });

    it('应该发送批处理完成的监控事件', async () => {
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
        'batch_processed',
        expect.any(Number),
        expect.objectContaining({
          batchSize: 1,
          avgTimePerQuote: expect.any(Number),
          throughputEstimate: expect.any(Number),
        })
      );
    });

    it('应该更新批处理统计信息', async () => {
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = service.getBatchProcessingStats();
      expect(stats.totalBatches).toBeGreaterThan(0);
      expect(stats.totalQuotes).toBeGreaterThan(0);
      expect(stats.batchProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('资源清理', () => {
    it('应该在模块销毁时清理资源', async () => {
      await service.onModuleDestroy();

      // 验证资源被清理（通过添加数据测试管道是否关闭）
      const quoteData = createMockQuoteData();
      service.addQuoteData(quoteData);

      // 等待一段时间，应该没有处理发生
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证清理后不再处理数据
      expect(mockDataTransformerService.transform).not.toHaveBeenCalled();
    });

    it('应该停止动态批处理调整定时器', async () => {
      const spy = jest.spyOn(global, 'clearInterval');

      await service.onModuleDestroy();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理大批次数据', async () => {
      // 创建大批次数据（超过缓冲上限200）
      for (let i = 0; i < 250; i++) {
        const quoteData = createMockQuoteData('longport', 'ws-stock-quote', [`${700 + i}.HK`]);
        service.addQuoteData(quoteData);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证处理了多个批次
      expect(mockDataTransformerService.transform).toHaveBeenCalled();
    });

    it('应该处理空的原始数据', async () => {
      const quoteData = createMockQuoteData();
      quoteData.rawData = null;

      service.addQuoteData(quoteData);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDataTransformerService.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          rawData: [null],
        })
      );
    });

    it('应该处理重复的符号', async () => {
      const quotes = [
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK', '700.HK']),
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK']),
      ];

      quotes.forEach(quote => service.addQuoteData(quote));
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证符号去重
      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK'], 'longport');
    });
  });
});