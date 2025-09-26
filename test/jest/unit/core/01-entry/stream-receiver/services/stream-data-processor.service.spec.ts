import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StreamDataProcessorService } from '@core/01-entry/stream-receiver/services/stream-data-processor.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { QuoteData, DataProcessingCallbacks } from '@core/01-entry/stream-receiver/interfaces/data-processing.interface';

describe('StreamDataProcessorService', () => {
  let service: StreamDataProcessorService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let dataTransformerService: jest.Mocked<DataTransformerService>;

  const mockQuoteData: QuoteData = {
    rawData: { symbol: '700.HK', price: 350.0 },
    providerName: 'longport',
    wsCapabilityType: 'stream-quote',
    timestamp: Date.now(),
    symbols: ['700.HK']
  };

  const mockCallbacks: DataProcessingCallbacks = {
    ensureSymbolConsistency: jest.fn(),
    pipelineCacheData: jest.fn(),
    pipelineBroadcastData: jest.fn(),
    recordStreamPipelineMetrics: jest.fn(),
    recordPipelineError: jest.fn(),
    emitMonitoringEvent: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'streamReceiverConfig':
            return {
              dataProcessing: {
                transformTimeoutMs: 5000,
                cacheTimeoutMs: 3000,
                broadcastTimeoutMs: 2000,
                enablePerformanceMetrics: true,
                enableRetry: true,
                maxRetryAttempts: 3,
                retryDelayBase: 100
              }
            };
          default:
            return {};
        }
      }),
    };

    const mockDataTransformerService = {
      transform: jest.fn(),
      transformBatch: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamDataProcessorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataTransformerService, useValue: mockDataTransformerService },
      ],
    }).compile();

    service = module.get<StreamDataProcessorService>(StreamDataProcessorService);
    configService = module.get(ConfigService);
    dataTransformerService = module.get(DataTransformerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('streamReceiverConfig');
    });
  });

  describe('Callback Management', () => {
    it('should set callbacks successfully', () => {
      service.setCallbacks(mockCallbacks);
      expect(service).toBeDefined();
    });
  });

  describe('Processing Pipeline', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should process data through pipeline', async () => {
      const quotes = [mockQuoteData];
      const provider = 'longport';
      const capability = 'stream-quote';

      await expect(
        service.processDataThroughPipeline(quotes, provider, capability)
      ).resolves.not.toThrow();
    });

    it('should handle processing errors gracefully', async () => {
      const quotes = [mockQuoteData];
      const provider = 'longport';
      const capability = 'stream-quote';

      // Mock a transformation error
      dataTransformerService.transformBatch.mockRejectedValue(new Error('Transform error'));

      await expect(
        service.processDataThroughPipeline(quotes, provider, capability)
      ).resolves.not.toThrow();
    });
  });

  describe('Capability Mapping', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should map capability to transform rule type', () => {
      const ruleType = service.mapCapabilityToTransformRuleType('stream-stock-quote');
      expect(typeof ruleType).toBe('string');
      expect(ruleType.length).toBeGreaterThan(0);
    });

    it('should handle unknown capabilities', () => {
      const ruleType = service.mapCapabilityToTransformRuleType('unknown-capability');
      expect(typeof ruleType).toBe('string');
      // Should return a fallback rule type
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should get data processing stats', () => {
      const stats = service.getDataProcessingStats();
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalSymbolsProcessed');
      expect(stats).toHaveProperty('totalProcessingTimeMs');
      expect(stats).toHaveProperty('averageProcessingTimeMs');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('lastProcessedAt');
      expect(typeof stats.totalProcessed).toBe('number');
    });

    it('should reset data processing stats', () => {
      service.resetDataProcessingStats();
      const stats = service.getDataProcessingStats();
      expect(stats.totalProcessed).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should handle empty quote arrays', async () => {
      await expect(
        service.processDataThroughPipeline([], 'longport', 'stream-quote')
      ).resolves.not.toThrow();
    });

    it('should handle invalid quote data', async () => {
      const invalidQuote = {
        rawData: null,
        providerName: '',
        wsCapabilityType: '',
        timestamp: 0,
        symbols: []
      } as QuoteData;

      await expect(
        service.processDataThroughPipeline([invalidQuote], 'longport', 'stream-quote')
      ).resolves.not.toThrow();
    });
  });
});