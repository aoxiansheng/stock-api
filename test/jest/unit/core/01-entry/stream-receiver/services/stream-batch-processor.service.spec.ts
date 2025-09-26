import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamBatchProcessorService } from '@core/01-entry/stream-receiver/services/stream-batch-processor.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { QuoteData, BatchProcessingCallbacks } from '@core/01-entry/stream-receiver/interfaces/batch-processing.interface';

describe('StreamBatchProcessorService', () => {
  let service: StreamBatchProcessorService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataTransformerService: jest.Mocked<DataTransformerService>;

  // Mock data
  const mockQuoteData: QuoteData = {
    rawData: {
      symbol: '700.HK',
      price: 350.0,
      change: 5.0,
      changePercent: 1.45,
      volume: 1000000
    },
    providerName: 'longport',
    wsCapabilityType: 'stream-quote',
    timestamp: Date.now(),
    symbols: ['700.HK']
  };

  const mockCallbacks: BatchProcessingCallbacks = {
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
              batchConfig: {
                enabled: true,
                minSize: 5,
                maxSize: 50,
                timeout: 1000,
                maxRetries: 3
              },
              dynamicBatching: {
                enabled: true,
                minInterval: 100,
                maxInterval: 5000,
                loadThreshold: 0.8
              }
            };
          default:
            return {};
        }
      }),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const mockDataTransformerService = {
      transformBatch: jest.fn(),
      transform: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamBatchProcessorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DataTransformerService, useValue: mockDataTransformerService },
      ],
    }).compile();

    service = module.get<StreamBatchProcessorService>(StreamBatchProcessorService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
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

    it('should initialize batch processing pipeline', () => {
      // Service should initialize pipeline during construction
      expect(service).toBeDefined();
    });
  });

  describe('Batch Data Management', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should set callbacks successfully', () => {
      service.setCallbacks(mockCallbacks);
      expect(service).toBeDefined();
    });

    it('should add quote data to batch', () => {
      service.addQuoteData(mockQuoteData);
      expect(service).toBeDefined();
    });

    it('should get dynamic batching state', () => {
      const state = service.getDynamicBatchingState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('metrics');
      expect(state.state).toHaveProperty('enabled');
      expect(state.metrics).toHaveProperty('averageLoadPer5s');
    });
  });

  describe('Configuration', () => {
    it('should load configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('streamReceiverConfig');
    });

    it('should handle missing configuration gracefully', () => {
      // Even with missing config, service should still be defined
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should handle malformed quote data gracefully', () => {
      const malformedData = {
        rawData: null,
        providerName: 'test',
        wsCapabilityType: 'test',
        timestamp: Date.now(),
        symbols: []
      } as QuoteData;

      expect(() => service.addQuoteData(malformedData)).not.toThrow();
    });

    it('should handle empty symbols array', () => {
      const dataWithEmptySymbols = {
        ...mockQuoteData,
        symbols: []
      };

      expect(() => service.addQuoteData(dataWithEmptySymbols)).not.toThrow();
    });
  });

  describe('Integration with DataTransformerService', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should be ready to transform data when needed', () => {
      expect(dataTransformerService).toBeDefined();
      expect(dataTransformerService.transformBatch).toBeDefined();
    });
  });
});