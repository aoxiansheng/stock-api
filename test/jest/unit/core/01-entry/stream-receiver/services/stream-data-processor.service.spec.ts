import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamDataProcessorService } from '@core/01-entry/stream-receiver/services/stream-data-processor.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { QuoteData, DataProcessingCallbacks } from '@core/01-entry/stream-receiver/interfaces/data-processing.interface';

describe('StreamDataProcessorService', () => {
  let service: StreamDataProcessorService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let dataTransformerService: jest.Mocked<DataTransformerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

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
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'DATA_PROCESSING_TRANSFORM_TIMEOUT':
            return 5000;
          case 'DATA_PROCESSING_CACHE_TIMEOUT':
            return 3000;
          case 'DATA_PROCESSING_BROADCAST_TIMEOUT':
            return 2000;
          case 'DATA_PROCESSING_ENABLE_METRICS':
            return true;
          case 'DATA_PROCESSING_ENABLE_RETRY':
            return true;
          case 'DATA_PROCESSING_MAX_RETRY':
            return 3;
          case 'DATA_PROCESSING_RETRY_DELAY_BASE':
            return 100;
          default:
            return defaultValue;
        }
      }),
    };

    const mockDataTransformerService = {
      transform: jest.fn(),
      transformBatch: jest.fn(),
    };
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamDataProcessorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataTransformerService, useValue: mockDataTransformerService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<StreamDataProcessorService>(StreamDataProcessorService);
    configService = module.get(ConfigService);
    dataTransformerService = module.get(DataTransformerService);
    eventEmitter = module.get(EventEmitter2);
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
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_TRANSFORM_TIMEOUT", 5000);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_CACHE_TIMEOUT", 3000);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_BROADCAST_TIMEOUT", 2000);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_ENABLE_METRICS", true);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_ENABLE_RETRY", true);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_MAX_RETRY", 3);
      expect(configService.get).toHaveBeenCalledWith("DATA_PROCESSING_RETRY_DELAY_BASE", 100);
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

  describe('Private Method Edge Cases', () => {
    it('should handle intelligent mapping with case insensitive patterns', () => {
      // Test case insensitive pattern matching
      expect(service['mapCapabilityToTransformRuleType']('QUOTE-DATA')).toBe('quote_fields');
      expect(service['mapCapabilityToTransformRuleType']('Option-Stream')).toBe('option_fields');
      expect(service['mapCapabilityToTransformRuleType']('FUTURES-PRICE')).toBe('futures_fields');
    });

    it('should handle edge cases in capability mapping patterns', () => {
      // Mock the private method to test its logic directly
      // This is generally not recommended but useful here for focused testing
      expect(service['mapCapabilityToTransformRuleType']('quote')).toBe('quote_fields');
      expect(service['mapCapabilityToTransformRuleType']('future')).toBe('futures_fields'); // Should match 'futures?' pattern
      expect(service['mapCapabilityToTransformRuleType']('eth-price')).toBe('crypto_fields');
      expect(service['mapCapabilityToTransformRuleType']('bitcoin-data')).toBe('crypto_fields');
    });

    it('should prioritize direct mapping over intelligent mapping', () => {
      // Even though 'ws-stock-quote' contains 'quote', it should use direct mapping
      expect(service['mapCapabilityToTransformRuleType']('ws-stock-quote')).toBe('quote_fields');
      // This ensures direct mapping takes precedence
    });

    it('should handle complex capability strings', () => {
      expect(service['mapCapabilityToTransformRuleType']('real-time-forex-currency-exchange')).toBe('forex_fields');
      expect(service['mapCapabilityToTransformRuleType']('historical-stock-price-data')).toBe('historical_data_fields');
      expect(service['mapCapabilityToTransformRuleType']('company-financial-info-basic')).toBe('basic_info_fields');
    });
  });
});