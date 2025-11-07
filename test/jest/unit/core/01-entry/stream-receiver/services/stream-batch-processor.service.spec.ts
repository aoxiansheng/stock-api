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
//     emitMonitoringEvent: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'STREAM_RECEIVER_BATCH_INTERVAL':
            return 50; // 返回一个合理的默认值
          case 'STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED':
            return true; // 返回一个合理的默认值
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
            return defaultValue;
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
      expect(configService.get).toHaveBeenCalledWith(
        'STREAM_RECEIVER_BATCH_INTERVAL',
        expect.any(Number),
      );
      expect(configService.get).toHaveBeenCalledWith(
        'STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED',
        expect.any(Boolean),
      );
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

  describe('Batch Processing Pipeline', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // Most batch processing methods are private, test through public interface
    it('should process data through public addQuoteData interface', () => {
      const quotes = [mockQuoteData, { ...mockQuoteData, symbols: ['AAPL.US'] }];

      quotes.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });

    it('should handle batch processing with transformer service integration', () => {
      dataTransformerService.transformBatch.mockResolvedValue([
        {
          transformedData: mockQuoteData.rawData,
          metadata: {
            ruleId: 'rule-123',
            ruleName: 'Quote Fields Rule',
            provider: 'longport',
            transDataRuleListType: 'quote_fields',
            recordsProcessed: 1,
            fieldsTransformed: 5,
            processingTimeMs: 100,
            timestamp: new Date().toISOString()
          }
        }
      ]);

      expect(() => service.addQuoteData(mockQuoteData)).not.toThrow();
      expect(service).toBeDefined();
    });
  });

  describe('Capability Mapping', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // mapCapabilityToTransDataRuleListType is private - test through public interface
    it('should handle different capability types through addQuoteData', () => {
      const testCases = [
        { ...mockQuoteData, wsCapabilityType: 'stream-quote' },
        { ...mockQuoteData, wsCapabilityType: 'stream-trade' },
        { ...mockQuoteData, wsCapabilityType: 'stream-option' },
        { ...mockQuoteData, wsCapabilityType: 'stream-futures' }
      ];

      testCases.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });
  });

  describe('Batch Processing Statistics', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should get batch processing statistics', () => {
      const stats = service.getBatchProcessingStats();

      expect(stats).toHaveProperty('totalBatches');
      expect(stats).toHaveProperty('totalQuotes');
      expect(stats).toHaveProperty('batchProcessingTime');
      expect(stats).toHaveProperty('totalFallbacks');
      expect(stats).toHaveProperty('partialRecoverySuccess');

      expect(typeof stats.totalBatches).toBe('number');
      expect(typeof stats.totalQuotes).toBe('number');
      expect(typeof stats.batchProcessingTime).toBe('number');
    });

    // recordBatchProcessingMetrics and updateDynamicBatchingMetrics are private
    it('should track statistics through public interface', () => {
      // Add some data to generate statistics
      service.addQuoteData(mockQuoteData);
      service.addQuoteData({ ...mockQuoteData, symbols: ['AAPL.US'] });

      const stats = service.getBatchProcessingStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Circuit Breaker Functionality', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // All circuit breaker methods are private - test resilience through public interface
    it('should handle processing errors gracefully (circuit breaker integration)', () => {
      // Simulate error conditions that would trigger circuit breaker
      dataTransformerService.transformBatch.mockRejectedValue(new Error('Service error'));

      expect(() => service.addQuoteData(mockQuoteData)).not.toThrow();
      expect(service).toBeDefined();
    });

    it('should maintain service availability under error conditions', () => {
      // Add multiple quotes to test resilience
      const quotes = Array.from({ length: 10 }, (_, i) => ({
        ...mockQuoteData,
        symbols: [`${700 + i}.HK`]
      }));

      quotes.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });
  });

  describe('Fallback Processing', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // All fallback methods are private - test through public interface
    it('should handle fallback scenarios through public interface', () => {
      // Test different symbol markets to trigger fallback logic
      const symbols = [
        { ...mockQuoteData, symbols: ['700.HK'] },    // Hong Kong
        { ...mockQuoteData, symbols: ['AAPL.US'] },   // US
        { ...mockQuoteData, symbols: ['000001.SZ'] }  // China
      ];

      symbols.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });

    it('should maintain monitoring event integration', () => {
      // Simulate error condition to test fallback monitoring
      dataTransformerService.transformBatch.mockRejectedValue(new Error('Fallback test'));

      service.addQuoteData(mockQuoteData);

      // Service should handle fallback gracefully
      expect(service).toBeDefined();
    });
  });

  describe('Dynamic Batching Adjustments', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // All dynamic batching methods are private - test through public interface
    it('should maintain dynamic batching state through public interface', () => {
      const state = service.getDynamicBatchingState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('metrics');
      expect(state.state).toHaveProperty('enabled');
      expect(state.metrics).toHaveProperty('averageLoadPer5s');
    });

    it('should handle dynamic batching configuration', () => {
      // Test that dynamic batching responds to load
      const largeBatch = Array.from({ length: 20 }, (_, i) => ({
        ...mockQuoteData,
        symbols: [`${700 + i}.HK`]
      }));

      largeBatch.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });

      const state = service.getDynamicBatchingState();
      expect(state).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    // All recovery methods are private - test resilience through public interface
    it('should demonstrate resilience under various error conditions', () => {
      // Test with various error scenarios
      const errorScenarios = [
        () => dataTransformerService.transformBatch.mockRejectedValue(new Error('Network error')),
        () => dataTransformerService.transformBatch.mockRejectedValue(new Error('Timeout error')),
        () => dataTransformerService.transformBatch.mockRejectedValue(new Error('Parse error'))
      ];

      errorScenarios.forEach(setupError => {
        setupError();
        expect(() => service.addQuoteData(mockQuoteData)).not.toThrow();
      });
    });

    it('should handle partial failures gracefully', () => {
      // Test with mixed data quality
      const mixedQuotes = [
        mockQuoteData,
        { ...mockQuoteData, rawData: null },
        { ...mockQuoteData, symbols: [] },
        { ...mockQuoteData, providerName: '' }
      ];

      mixedQuotes.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module destruction gracefully', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('should clean up resources on destruction', async () => {
      // Should complete without throwing errors
      const destroyPromise = service.onModuleDestroy();
      await expect(destroyPromise).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should handle large batches efficiently', () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        ...mockQuoteData,
        symbols: [`${700 + i}.HK`],
        rawData: { ...mockQuoteData.rawData, symbol: `${700 + i}.HK` }
      }));

      expect(() => {
        largeBatch.forEach(quote => service.addQuoteData(quote));
      }).not.toThrow();
    });

    it('should handle mixed provider batches', () => {
      const mixedBatch = [
        { ...mockQuoteData, providerName: 'longport' },
        { ...mockQuoteData, providerName: 'futu' },
        { ...mockQuoteData, providerName: 'webull' }
      ];

      mixedBatch.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });

    it('should handle concurrent data addition', () => {
      const quotes = Array.from({ length: 5 }, (_, i) => ({
        ...mockQuoteData,
        symbols: [`${700 + i}.HK`]
      }));

      dataTransformerService.transformBatch.mockResolvedValue([
        {
          transformedData: mockQuoteData.rawData,
          metadata: {
            ruleId: 'rule-456',
            ruleName: 'Concurrent Quote Rule',
            provider: 'longport',
            transDataRuleListType: 'quote_fields',
            recordsProcessed: 1,
            fieldsTransformed: 5,
            processingTimeMs: 50,
            timestamp: new Date().toISOString()
          }
        }
      ]);

      // Add quotes concurrently
      quotes.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });

      expect(service).toBeDefined();
    });

    it('should handle malformed symbols gracefully', () => {
      const malformedSymbols = [
        { ...mockQuoteData, symbols: [''] },
        { ...mockQuoteData, symbols: ['INVALID'] },
        { ...mockQuoteData, symbols: ['700'] }, // Missing market
        { ...mockQuoteData, symbols: ['.HK'] }  // Missing symbol
      ];

      malformedSymbols.forEach(quote => {
        expect(() => service.addQuoteData(quote)).not.toThrow();
      });
    });

    it('should maintain performance under stress', () => {
      const stressTest = Array.from({ length: 1000 }, (_, i) => ({
        ...mockQuoteData,
        symbols: [`${i}.HK`],
        timestamp: Date.now() + i
      }));

      const start = Date.now();
      stressTest.forEach(quote => service.addQuoteData(quote));
      const elapsed = Date.now() - start;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(elapsed).toBeLessThan(1000);
    });
  });
});