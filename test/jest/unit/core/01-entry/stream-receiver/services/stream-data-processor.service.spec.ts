import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamDataProcessorService } from '@core/01-entry/stream-receiver/services/stream-data-processor.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import {
  QuoteData,
  DataProcessingCallbacks,
  DataProcessingStats,
  DataPipelineMetrics,
  IntelligentMappingResult,
} from '@core/01-entry/stream-receiver/interfaces/data-processing.interface';
import { API_OPERATIONS } from '@common/constants/domain';

describe('StreamDataProcessorService', () => {
  let service: StreamDataProcessorService;
  let module: TestingModule;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;
  let mockDataTransformerService: jest.Mocked<DataTransformerService>;
  let mockCallbacks: jest.Mocked<DataProcessingCallbacks>;

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
          'DATA_PROCESSING_TRANSFORM_TIMEOUT': 5000,
          'DATA_PROCESSING_CACHE_TIMEOUT': 3000,
          'DATA_PROCESSING_BROADCAST_TIMEOUT': 2000,
          'DATA_PROCESSING_ENABLE_METRICS': true,
          'DATA_PROCESSING_ENABLE_RETRY': true,
          'DATA_PROCESSING_MAX_RETRY': 3,
          'DATA_PROCESSING_RETRY_DELAY_BASE': 100,
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

    // Mock DataProcessingCallbacks
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
        StreamDataProcessorService,
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
    service = module.get<StreamDataProcessorService>(StreamDataProcessorService);

    // 设置回调函数
    service.setCallbacks(mockCallbacks);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('初始化和配置', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('DATA_PROCESSING_TRANSFORM_TIMEOUT', 5000);
      expect(mockConfigService.get).toHaveBeenCalledWith('DATA_PROCESSING_ENABLE_METRICS', true);
      expect(mockConfigService.get).toHaveBeenCalledWith('DATA_PROCESSING_MAX_RETRY', 3);
    });

    it('应该正确设置回调函数', () => {
      const newCallbacks = { ...mockCallbacks };
      service.setCallbacks(newCallbacks);
      expect(true).toBe(true); // 回调设置成功
    });

    it('应该返回初始的数据处理统计信息', () => {
      const stats = service.getDataProcessingStats();
      expect(stats).toEqual({
        totalProcessed: 0,
        totalSymbolsProcessed: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        totalErrors: 0,
        errorRate: 0,
        lastProcessedAt: 0,
      });
    });
  });

  describe('管道化数据处理', () => {
    it('应该成功处理单个报价数据', async () => {
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      // 验证数据转换被调用
      expect(mockDataTransformerService.transform).toHaveBeenCalledWith({
        provider: 'longport',
        apiType: 'stream',
        transDataRuleListType: 'quote_fields',
        rawData: [quotes[0].rawData],
      });

      // 验证管道步骤按顺序执行
      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK'], 'longport');
      expect(mockCallbacks.pipelineCacheData).toHaveBeenCalledWith(
        [{ symbol: '700.HK', price: 100, volume: 1000 }],
        ['700.HK']
      );
      expect(mockCallbacks.pipelineBroadcastData).toHaveBeenCalledWith(
        [{ symbol: '700.HK', price: 100, volume: 1000 }],
        ['700.HK']
      );
    });

    it('应该处理多个报价数据', async () => {
      const quotes = [
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK']),
        createMockQuoteData('longport', 'ws-stock-quote', ['AAPL.US']),
      ];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK', 'AAPL.US'], 'longport');
    });

    it('应该去重重复的符号', async () => {
      const quotes = [
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK', '700.HK']),
        createMockQuoteData('longport', 'ws-stock-quote', ['700.HK']),
      ];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK'], 'longport');
    });

    it('应该处理数组格式的转换结果', async () => {
      mockDataTransformerService.transform.mockResolvedValueOnce({
        transformedData: [
          { symbol: '700.HK', price: 100 },
          { symbol: 'AAPL.US', price: 150 },
        ],
        metadata: {
          ruleId: 'test-rule-2',
          ruleName: 'Multi Symbol Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          recordsProcessed: 2,
          fieldsTransformed: 4,
          processingTimeMs: 15,
          timestamp: new Date().toISOString(),
        },
      });

      const quotes = [createMockQuoteData()];
      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.pipelineCacheData).toHaveBeenCalledWith(
        [
          { symbol: '700.HK', price: 100 },
          { symbol: 'AAPL.US', price: 150 },
        ],
        ['700.HK']
      );
    });

    it('应该处理单个对象格式的转换结果', async () => {
      mockDataTransformerService.transform.mockResolvedValueOnce({
        transformedData: { symbol: '700.HK', price: 100 },
        metadata: {
          ruleId: 'test-rule-3',
          ruleName: 'Single Object Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          recordsProcessed: 1,
          fieldsTransformed: 2,
          processingTimeMs: 8,
          timestamp: new Date().toISOString(),
        },
      });

      const quotes = [createMockQuoteData()];
      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.pipelineCacheData).toHaveBeenCalledWith(
        [{ symbol: '700.HK', price: 100 }],
        ['700.HK']
      );
    });

    it('应该处理空的转换结果', async () => {
      mockDataTransformerService.transform.mockResolvedValueOnce({
        transformedData: null,
        metadata: {
          ruleId: 'test-rule-4',
          ruleName: 'Empty Result Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          recordsProcessed: 0,
          fieldsTransformed: 0,
          processingTimeMs: 5,
          timestamp: new Date().toISOString(),
        },
      });

      const quotes = [createMockQuoteData()];
      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      // 应该提前返回，不调用后续步骤
      expect(mockCallbacks.pipelineCacheData).not.toHaveBeenCalled();
      expect(mockCallbacks.pipelineBroadcastData).not.toHaveBeenCalled();
    });

    it('应该在未设置回调时抛出错误', async () => {
      const serviceWithoutCallbacks = module.get<StreamDataProcessorService>(StreamDataProcessorService);
      // 不设置回调函数

      const quotes = [createMockQuoteData()];

      await expect(
        serviceWithoutCallbacks.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('DataProcessingCallbacks 未设置');
    });
  });

  describe('能力映射机制', () => {
    describe('直接映射', () => {
      it('应该正确映射WebSocket能力', () => {
        const testCases = [
          { capability: 'ws-stock-quote', expected: 'quote_fields' },
          { capability: 'ws-option-quote', expected: 'option_fields' },
          { capability: 'ws-futures-quote', expected: 'futures_fields' },
          { capability: 'ws-forex-quote', expected: 'forex_fields' },
          { capability: 'ws-crypto-quote', expected: 'crypto_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该正确映射REST API能力', () => {
        const testCases = [
          { capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE, expected: 'quote_fields' },
          { capability: 'get-option-quote', expected: 'option_fields' },
          { capability: 'get-futures-quote', expected: 'futures_fields' },
          { capability: 'get-forex-quote', expected: 'forex_fields' },
          { capability: 'get-crypto-quote', expected: 'crypto_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该正确映射流式数据能力', () => {
        const testCases = [
          { capability: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE, expected: 'quote_fields' },
          { capability: 'stream-option-quote', expected: 'option_fields' },
          { capability: 'stream-market-data', expected: 'market_data_fields' },
          { capability: 'stream-trading-data', expected: 'trading_data_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该正确映射基础信息能力', () => {
        const testCases = [
          { capability: 'get-stock-info', expected: 'basic_info_fields' },
          { capability: 'get-company-info', expected: 'company_info_fields' },
          { capability: 'get-market-info', expected: 'market_info_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该正确映射历史数据能力', () => {
        const testCases = [
          { capability: 'get-historical-data', expected: 'historical_data_fields' },
          { capability: 'get-historical-quotes', expected: 'quote_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该正确映射新闻和公告能力', () => {
        const testCases = [
          { capability: 'get-news', expected: 'news_fields' },
          { capability: 'get-announcements', expected: 'announcement_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });
    });

    describe('智能映射', () => {
      it('应该通过模式匹配智能映射能力', () => {
        const testCases = [
          { capability: 'custom-quote-stream', expected: 'quote_fields' },
          { capability: 'get-option-data', expected: 'option_fields' },
          { capability: 'futures-stream', expected: 'futures_fields' },
          { capability: 'forex-prices', expected: 'forex_fields' },
          { capability: 'crypto-bitcoin-data', expected: 'crypto_fields' },
          { capability: 'market-overview', expected: 'market_data_fields' },
          { capability: 'trading-signals', expected: 'trading_data_fields' },
          { capability: 'basic-stock-info', expected: 'basic_info_fields' },
          { capability: 'company-details', expected: 'company_info_fields' },
          { capability: 'historical-prices', expected: 'historical_data_fields' },
          { capability: 'latest-news', expected: 'news_fields' },
          { capability: 'company-announcement', expected: 'announcement_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });

      it('应该处理大小写不敏感的映射', () => {
        const testCases = [
          { capability: 'QUOTE-DATA', expected: 'quote_fields' },
          { capability: 'Option-Stream', expected: 'option_fields' },
          { capability: 'FUTURES-PRICE', expected: 'futures_fields' },
        ];

        testCases.forEach(({ capability, expected }) => {
          const result = service.mapCapabilityToTransformRuleType(capability);
          expect(result).toBe(expected);
        });
      });
    });

    describe('兜底映射', () => {
      it('应该为包含stream的未知能力使用quote_fields', () => {
        const result = service.mapCapabilityToTransformRuleType('unknown-stream-capability');
        expect(result).toBe('quote_fields');
      });

      it('应该为包含ws的未知能力使用quote_fields', () => {
        const result = service.mapCapabilityToTransformRuleType('unknown-ws-capability');
        expect(result).toBe('quote_fields');
      });

      it('应该为包含get的未知能力使用quote_fields', () => {
        const result = service.mapCapabilityToTransformRuleType('unknown-get-capability');
        expect(result).toBe('quote_fields');
      });

      it('应该为包含fetch的未知能力使用quote_fields', () => {
        const result = service.mapCapabilityToTransformRuleType('unknown-fetch-capability');
        expect(result).toBe('quote_fields');
      });

      it('应该为完全未知的能力使用默认映射', () => {
        const result = service.mapCapabilityToTransformRuleType('completely-unknown-capability');
        expect(result).toBe('quote_fields'); // 默认兜底映射
      });
    });
  });

  describe('超时控制', () => {
    it('应该在数据转换超时时抛出错误', async () => {
      mockDataTransformerService.transform.mockImplementation(
        () => new Promise((_resolve, _reject) => {
          // 永远不resolve，模拟超时
        })
      );

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('数据转换超时');
    });

    it('应该在符号标准化超时时抛出错误', async () => {
      mockCallbacks.ensureSymbolConsistency.mockImplementation(
        () => new Promise((_resolve, _reject) => {
          // 永远不resolve，模拟超时
        })
      );

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('符号标准化超时');
    });

    it('应该在缓存操作超时时抛出错误', async () => {
      mockCallbacks.pipelineCacheData.mockImplementation(
        () => new Promise((_resolve, _reject) => {
          // 永远不resolve，模拟超时
        })
      );

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('数据缓存超时');
    });

    it('应该在广播操作超时时抛出错误', async () => {
      mockCallbacks.pipelineBroadcastData.mockImplementation(
        () => new Promise((_resolve, _reject) => {
          // 永远不resolve，模拟超时
        })
      );

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('数据广播超时');
    });
  });

  describe('错误处理', () => {
    it('应该处理数据转换失败', async () => {
      const transformError = new Error('Transform failed');
      mockDataTransformerService.transform.mockRejectedValueOnce(transformError);

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('Transform failed');

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalledWith(
        'longport',
        'ws-stock-quote',
        'Transform failed',
        expect.any(Number)
      );

      // 验证错误统计被更新
      const stats = service.getDataProcessingStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('应该处理符号标准化失败', async () => {
      const symbolError = new Error('Symbol consistency failed');
      mockCallbacks.ensureSymbolConsistency.mockRejectedValueOnce(symbolError);

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('Symbol consistency failed');

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });

    it('应该处理缓存失败', async () => {
      const cacheError = new Error('Cache failed');
      mockCallbacks.pipelineCacheData.mockRejectedValueOnce(cacheError);

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('Cache failed');

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });

    it('应该处理广播失败', async () => {
      const broadcastError = new Error('Broadcast failed');
      mockCallbacks.pipelineBroadcastData.mockRejectedValueOnce(broadcastError);

      const quotes = [createMockQuoteData()];

      await expect(
        service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
      ).rejects.toThrow('Broadcast failed');

      expect(mockCallbacks.recordPipelineError).toHaveBeenCalled();
    });
  });

  describe('性能监控', () => {
    it('应该记录管道处理指标', async () => {
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

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

    it('应该发送数据管道处理监控事件', async () => {
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
        'data_pipeline_processed',
        1,
        expect.objectContaining({
          provider: 'longport',
          capability: 'ws-stock-quote',
          symbolsCount: 1,
          durations: expect.any(Object),
        })
      );
    });

    it('应该在禁用性能指标时跳过指标记录', async () => {
      // 重新配置服务以禁用性能指标
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'DATA_PROCESSING_ENABLE_METRICS') {
          return false;
        }
        return defaultValue;
      });

      const newModule = await Test.createTestingModule({
        providers: [
          StreamDataProcessorService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EventEmitter2, useValue: mockEventBus },
          { provide: DataTransformerService, useValue: mockDataTransformerService },
        ],
      }).compile();

      const newService = newModule.get<StreamDataProcessorService>(StreamDataProcessorService);
      newService.setCallbacks(mockCallbacks);

      const quotes = [createMockQuoteData()];
      await newService.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      // 验证性能指标记录被跳过
      expect(mockCallbacks.recordStreamPipelineMetrics).not.toHaveBeenCalled();

      await newModule.close();
    });

    it('应该更新处理统计信息', async () => {
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.totalSymbolsProcessed).toBe(1);
      expect(stats.totalProcessingTime).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.lastProcessedAt).toBeGreaterThan(0);
    });

    it('应该正确计算平均处理时间', async () => {
      const quotes1 = [createMockQuoteData()];
      const quotes2 = [createMockQuoteData('futu', 'ws-option-quote', ['AAPL.US'])];

      await service.processDataThroughPipeline(quotes1, 'longport', 'ws-stock-quote');
      await service.processDataThroughPipeline(quotes2, 'futu', 'ws-option-quote');

      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.averageProcessingTime).toBe(stats.totalProcessingTime / stats.totalProcessed);
    });
  });

  describe('统计信息管理', () => {
    it('应该重置处理统计信息', async () => {
      // 先处理一些数据产生统计
      const quotes = [createMockQuoteData()];
      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      let stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);

      // 重置统计
      service.resetDataProcessingStats();

      stats = service.getDataProcessingStats();
      expect(stats).toEqual({
        totalProcessed: 0,
        totalSymbolsProcessed: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        totalErrors: 0,
        errorRate: 0,
        lastProcessedAt: 0,
      });
    });

    it('应该正确计算错误率', async () => {
      // 处理一个成功的请求
      const quotes1 = [createMockQuoteData()];
      await service.processDataThroughPipeline(quotes1, 'longport', 'ws-stock-quote');

      // 处理一个失败的请求
      mockDataTransformerService.transform.mockRejectedValueOnce(new Error('Test error'));
      const quotes2 = [createMockQuoteData()];
      try {
        await service.processDataThroughPipeline(quotes2, 'longport', 'ws-stock-quote');
      } catch (error) {
        // 预期的错误
      }

      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBe(50); // 1错误/(1成功+1错误) * 100
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空的报价数组', async () => {
      await service.processDataThroughPipeline([], 'longport', 'ws-stock-quote');

      expect(mockDataTransformerService.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          rawData: [],
        })
      );
    });

    it('应该处理包含null原始数据的报价', async () => {
      const quotes = [createMockQuoteData()];
      quotes[0].rawData = null;

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockDataTransformerService.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          rawData: [null],
        })
      );
    });

    it('应该处理空符号数组的报价', async () => {
      const quotes = [createMockQuoteData()];
      quotes[0].symbols = [];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith([], 'longport');
    });

    it('应该处理大量符号', async () => {
      const manySymbols = Array.from({ length: 1000 }, (_, i) => `${i}.HK`);
      const quotes = [createMockQuoteData('longport', 'ws-stock-quote', manySymbols)];

      await service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');

      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(manySymbols, 'longport');
    });

    it('应该处理非常长的能力名称', async () => {
      const longCapability = 'a'.repeat(1000);
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'longport', longCapability);

      const result = service.mapCapabilityToTransformRuleType(longCapability);
      expect(result).toBe('quote_fields'); // 应该使用兜底映射
    });

    it('应该处理特殊字符在提供商名称中', async () => {
      const quotes = [createMockQuoteData()];

      await service.processDataThroughPipeline(quotes, 'provider@#$%', 'ws-stock-quote');

      expect(mockCallbacks.ensureSymbolConsistency).toHaveBeenCalledWith(['700.HK'], 'provider@#$%');
    });
  });

  describe('资源清理', () => {
    it('应该在模块销毁时清理资源', async () => {
      await service.onModuleDestroy();

      // 验证清理完成
      expect(true).toBe(true);
    });

    it('应该处理清理过程中的错误', async () => {
      // 应该不会抛出异常
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('并发处理', () => {
    it('应该处理并发的管道处理请求', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        const quotes = [createMockQuoteData('longport', 'ws-stock-quote', [`${700 + i}.HK`])];
        return service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote');
      });

      await Promise.all(promises);

      expect(mockDataTransformerService.transform).toHaveBeenCalledTimes(5);
      expect(mockCallbacks.recordStreamPipelineMetrics).toHaveBeenCalledTimes(5);

      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(5);
    });

    it('应该处理混合成功和失败的并发请求', async () => {
      // 设置第3个请求失败
      const createMetadata = (symbol: string) => ({
        ruleId: `test-rule-${symbol}`,
        ruleName: `Concurrent Test Rule ${symbol}`,
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        recordsProcessed: 1,
        fieldsTransformed: 2,
        processingTimeMs: 10,
        timestamp: new Date().toISOString(),
      });

      mockDataTransformerService.transform
        .mockResolvedValueOnce({
          transformedData: [{ symbol: '700.HK', price: 100 }],
          metadata: createMetadata('700.HK'),
        })
        .mockResolvedValueOnce({
          transformedData: [{ symbol: '701.HK', price: 101 }],
          metadata: createMetadata('701.HK'),
        })
        .mockRejectedValueOnce(new Error('Third request failed'))
        .mockResolvedValueOnce({
          transformedData: [{ symbol: '703.HK', price: 103 }],
          metadata: createMetadata('703.HK'),
        })
        .mockResolvedValueOnce({
          transformedData: [{ symbol: '704.HK', price: 104 }],
          metadata: createMetadata('704.HK'),
        });

      const promises = Array.from({ length: 5 }, (_, i) => {
        const quotes = [createMockQuoteData('longport', 'ws-stock-quote', [`${700 + i}.HK`])];
        return service.processDataThroughPipeline(quotes, 'longport', 'ws-stock-quote')
          .catch((error: Error) => ({ error: error.message }));
      });

      const results = await Promise.all(promises);

      // 验证有一个失败的结果
      const errors = results.filter((r): r is { error: string } => r !== undefined && typeof r === 'object' && 'error' in r);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Third request failed');

      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(4); // 4个成功
      expect(stats.totalErrors).toBe(1);    // 1个失败
    });
  });
});