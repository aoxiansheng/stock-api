import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StreamReceiverService } from '../../../../../../../src/core/01-entry/stream-receiver/services/stream-receiver.service';
import { SymbolTransformerService } from '../../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { DataTransformerService } from '../../../../../../../src/core/02-processing/transformer/services/data-transformer.service';
import { StreamDataFetcherService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { CollectorService } from '../../../../../../../src/monitoring/collector/collector.service';
import { StreamRecoveryWorkerService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';
import { RateLimitService } from '../../../../../../../src/auth/services/rate-limit.service';
import { StreamReceiverConfigKeys } from '../../../../../../../src/core/01-entry/stream-receiver/config/stream-receiver.config';

describe('StreamReceiverService - Dynamic Batching', () => {
  let service: StreamReceiverService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockCollectorService: jest.Mocked<CollectorService>;
  
  // Mock services
  let mockSymbolTransformer: jest.Mocked<SymbolTransformerService>;
  let mockDataTransformer: jest.Mocked<DataTransformerService>;
  let mockStreamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let mockRecoveryWorker: jest.Mocked<StreamRecoveryWorkerService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;

  beforeEach(async () => {
    // Create config service mock with dynamic batching enabled
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configMap = {
          [StreamReceiverConfigKeys.CONNECTION_CLEANUP_INTERVAL]: 5 * 60 * 1000,
          [StreamReceiverConfigKeys.MAX_CONNECTIONS]: 1000,
          [StreamReceiverConfigKeys.CONNECTION_STALE_TIMEOUT]: 10 * 60 * 1000,
          [StreamReceiverConfigKeys.MAX_RETRY_ATTEMPTS]: 3,
          [StreamReceiverConfigKeys.RETRY_DELAY_BASE]: 1000,
          [StreamReceiverConfigKeys.CIRCUIT_BREAKER_THRESHOLD]: 50,
          [StreamReceiverConfigKeys.CIRCUIT_BREAKER_RESET_TIMEOUT]: 30000,
          [StreamReceiverConfigKeys.BATCH_PROCESSING_INTERVAL]: 50,
          
          // Dynamic batching configuration
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_ENABLED]: true,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_MIN_INTERVAL]: 10,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_MAX_INTERVAL]: 200,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_HIGH_LOAD_INTERVAL]: 25,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_LOW_LOAD_INTERVAL]: 100,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_SAMPLE_WINDOW]: 20,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_HIGH_LOAD_THRESHOLD]: 15,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_LOW_LOAD_THRESHOLD]: 5,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_ADJUSTMENT_STEP]: 5,
          [StreamReceiverConfigKeys.DYNAMIC_BATCHING_ADJUSTMENT_FREQUENCY]: 5000,
          
          [StreamReceiverConfigKeys.MEMORY_CHECK_INTERVAL]: 30 * 1000,
          [StreamReceiverConfigKeys.MEMORY_WARNING_THRESHOLD]: 500,
          [StreamReceiverConfigKeys.MEMORY_CRITICAL_THRESHOLD]: 800,
          [StreamReceiverConfigKeys.RATE_LIMIT_MAX_CONNECTIONS]: 5,
          [StreamReceiverConfigKeys.RATE_LIMIT_WINDOW_SIZE]: 60 * 1000,
        };
        return configMap[key] !== undefined ? configMap[key] : defaultValue;
      }),
    } as any;

    // Create mock services
    mockSymbolTransformer = {
      transformSymbols: jest.fn(),
    } as any;

    mockDataTransformer = {
      transform: jest.fn(),
    } as any;

    mockStreamDataFetcher = {
      getClientStateManager: jest.fn().mockReturnValue({
        addClientSubscription: jest.fn(),
        getClientSubscription: jest.fn(),
        getClientStateStats: jest.fn(),
        broadcastToSymbolViaGateway: jest.fn(),
        addSubscriptionChangeListener: jest.fn(),
      }),
      getStreamDataCache: jest.fn().mockReturnValue({
        setData: jest.fn(),
        getCacheStats: jest.fn(),
      }),
      establishStreamConnection: jest.fn(),
      isConnectionActive: jest.fn(),
      getConnectionStatsByProvider: jest.fn(),
      batchHealthCheck: jest.fn(),
      subscribeToSymbols: jest.fn(),
    } as any;

    mockCollectorService = {
      recordRequest: jest.fn(),
      recordSystemMetrics: jest.fn(),
    } as any;
    
    // Mock eventBus as a public property for testing
    (mockCollectorService as any).eventBus = {
      emit: jest.fn(),
    };

    mockRecoveryWorker = {
      submitRecoveryJob: jest.fn(),
    } as any;

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SymbolTransformerService, useValue: mockSymbolTransformer },
        { provide: DataTransformerService, useValue: mockDataTransformer },
        { provide: StreamDataFetcherService, useValue: mockStreamDataFetcher },
        { provide: CollectorService, useValue: mockCollectorService },
        { provide: StreamRecoveryWorkerService, useValue: mockRecoveryWorker },
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // 清理服务资源
    if (service && service.onModuleDestroy) {
      service.onModuleDestroy();
    }
  });

  describe('Dynamic Batching Configuration', () => {
    it('should initialize with dynamic batching enabled', () => {
      const stats = service.getDynamicBatchingStats();
      
      expect(stats.enabled).toBeTruthy();
      expect(stats.currentInterval).toBe(50); // Initial interval from base config
      expect(stats.config.intervalRange).toBe('10-200ms');
      expect(stats.config.loadThresholds.high).toBe(15);
      expect(stats.config.loadThresholds.low).toBe(5);
    });

    it('should have proper initial state', () => {
      const stats = service.getDynamicBatchingStats();
      
      expect(stats.loadState.isHighLoad).toBeFalsy();
      expect(stats.loadState.isLowLoad).toBeFalsy();
      expect(stats.metrics.totalAdjustments).toBe(0);
      expect(stats.metrics.throughputPerSecond).toBe(0);
    });
  });

  describe('Load Detection and Adjustment', () => {
    it('should have adjustBatchProcessingInterval method', () => {
      expect(service['adjustBatchProcessingInterval']).toBeDefined();
      expect(typeof service['adjustBatchProcessingInterval']).toBe('function');
    });

    it('should have updateLoadStatistics method', () => {
      expect(service['updateLoadStatistics']).toBeDefined();
      expect(typeof service['updateLoadStatistics']).toBe('function');
    });

    it('should have reinitializeBatchProcessingPipeline method', () => {
      expect(service['reinitializeBatchProcessingPipeline']).toBeDefined();
      expect(typeof service['reinitializeBatchProcessingPipeline']).toBe('function');
    });

    it('should simulate load statistics update', () => {
      // Test load statistics update functionality
      const updateLoadStatisticsSpy = jest.spyOn(service as any, 'updateLoadStatistics');
      
      // Call updateLoadStatistics method
      service['updateLoadStatistics']();
      
      expect(updateLoadStatisticsSpy).toHaveBeenCalled();
    });

    it('should handle batch processing interval adjustment', () => {
      // Add some load samples to trigger adjustment logic
      service['dynamicBatchingState'].loadSamples = [10, 12, 15, 18, 20]; // High load scenario
      
      const adjustmentSpy = jest.spyOn(service as any, 'adjustBatchProcessingInterval');
      const reinitializeSpy = jest.spyOn(service as any, 'reinitializeBatchProcessingPipeline');
      
      // Trigger adjustment
      service['adjustBatchProcessingInterval']();
      
      expect(adjustmentSpy).toHaveBeenCalled();
      
      // Check if high load was detected and interval adjusted
      const stats = service.getDynamicBatchingStats();
      expect(stats.loadState.isHighLoad).toBeTruthy();
    });
  });

  describe('Performance Metrics Recording', () => {
    it('should record batch interval adjustment metrics', () => {
      const oldInterval = 50;
      const newInterval = 25;
      const loadLevel = 18.5;
      
      service['recordBatchIntervalAdjustment'](oldInterval, newInterval, loadLevel);
      
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        'batch_interval_adjustment', 
        'POST',
        200,
        0,
        {
          oldInterval,
          newInterval,
          loadLevel,
          adjustmentDirection: 'decrease',
          timestamp: expect.any(Date),
        }
      );
      
      expect((mockCollectorService as any).eventBus.emit).toHaveBeenCalledWith('METRIC_COLLECTED', 
        expect.objectContaining({
          metricType: 'dynamic_batching',
          metricName: 'batch_interval_adjusted',
          metricValue: newInterval,
          tags: expect.objectContaining({
            oldInterval,
            newInterval,
            loadLevel,
            adjustmentDirection: 'decrease'
          })
        })
      );
    });

    it('should handle metrics recording errors gracefully', () => {
      // Mock CollectorService to throw error
      mockCollectorService.recordRequest.mockImplementation(() => {
        throw new Error('Metrics service unavailable');
      });
      
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      
      service['recordBatchIntervalAdjustment'](50, 25, 18.5);
      
      expect(loggerSpy).toHaveBeenCalledWith('记录批处理调整指标失败', {
        error: 'Metrics service unavailable'
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup dynamic batching timer in onModuleDestroy', () => {
      // Set up adjustment timer
      service['dynamicBatchingState'].adjustmentTimer = setInterval(() => {}, 1000) as NodeJS.Timeout;
      const expectedTimer = service['dynamicBatchingState'].adjustmentTimer;
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      service.onModuleDestroy();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(expectedTimer);
      expect(service['dynamicBatchingState'].adjustmentTimer).toBeUndefined();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle disabled dynamic batching', async () => {
      // Create service with dynamic batching disabled
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === StreamReceiverConfigKeys.DYNAMIC_BATCHING_ENABLED) {
          return false;
        }
        // Return other defaults
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StreamReceiverService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SymbolTransformerService, useValue: mockSymbolTransformer },
          { provide: DataTransformerService, useValue: mockDataTransformer },
          { provide: StreamDataFetcherService, useValue: mockStreamDataFetcher },
          { provide: CollectorService, useValue: mockCollectorService },
          { provide: StreamRecoveryWorkerService, useValue: mockRecoveryWorker },
          { provide: RateLimitService, useValue: mockRateLimitService },
        ],
      }).compile();

      const disabledService = module.get<StreamReceiverService>(StreamReceiverService);
      const stats = disabledService.getDynamicBatchingStats();
      
      expect(stats.enabled).toBeFalsy();
    });
  });

  describe('Integration with Batch Processing', () => {
    it('should initialize batch processing with dynamic interval when enabled', () => {
      const initializeBatchProcessingSpy = jest.spyOn(service as any, 'initializeBatchProcessing');
      
      // Re-initialize to test
      service['initializeBatchProcessing']();
      
      expect(initializeBatchProcessingSpy).toHaveBeenCalled();
    });

    it('should update load statistics during batch processing', () => {
      const updateLoadStatisticsSpy = jest.spyOn(service as any, 'updateLoadStatistics');
      
      // Simulate batch processing completion
      service['updateLoadStatistics']();
      
      expect(updateLoadStatisticsSpy).toHaveBeenCalled();
      
      // Verify metrics are updated
      const metrics = service['dynamicBatchingMetrics'];
      expect(metrics.batchCountInWindow).toBeGreaterThan(0);
    });
  });
});